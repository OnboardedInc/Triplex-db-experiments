# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (179.473 ms, trace `c825a9b95709c89c0000000000001084`); `node-14/thread-0/driver.queue.subject` (188.930 ms, trace `c825a9b95709c89c0000000000001c57`); `node-14/thread-0/driver.queue.subject` (178.057 ms, trace `c825a9b95709c89c0000000000001c56`); `node-14/thread-0/driver.queue.subject` (156.571 ms, trace `c825a9b95709c89c0000000000001083`); `node-14/thread-0/driver.queue.subject` (172.356 ms, trace `c825a9b95709c89c0000000000001c55`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-smoke-c`; source `8c61d55a1ef76a8af61f1ece811d8b30c442c23c`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3487/3488 (99.971%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3488/3488. Raw trace bytes: 9703605.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 214 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 6095.339 | 691.570 | 16.587 | 140 |
| baseline | 0 | 4796.906 | 88.768 | 4.644 | 140 |
| L1 | 1 | 6387.402 | 399.739 | 5.764 | 87 |
| L4 | 4 | 7871.621 | 764.302 | 9.446 | 275 |
| L16 | 16 | 5293.820 | 528.890 | 8.355 | 160 |
| L64 | 64 | 6561.246 | 626.750 | 56.387 | 142 |
| L256 | 256 | 7042.250 | 654.477 | 13.898 | 180 |
| L1024 | 256 | 6791.723 | 633.426 | 14.179 | 242 |
| recovery | 256 | 5976.439 | 576.575 | 14.467 | 140 |
| p4mix | 1 | 5459.783 | 103.850 | 2.590 | 187 |
| p4h1 | 1 | 4881.298 | 109.042 | 2.939 | 242 |
| grow3 | 0 | n/a | n/a | n/a | 0 |
| p4h3 | 1 | 6831.188 | 126.343 | 3.473 | 220 |
| grow10 | 0 | 1464.708 | 397.420 | 2.859 | 60 |
| p4h10 | 1 | 5223.462 | 97.246 | 1.669 | 182 |
| presweep | 64 | 5993.821 | 980.509 | 31.797 | 2582 |
| sweep | 64 | 105.438 | 26.234 | 0.884 | 209 |
| tail | 0 | 57856.271 | 15244.600 | 131.485 | 65326 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| c825a9b95709c89c0000000000001084 | driver.queue.subject | 179.473 | c825a9b95709c89c0000000000001083 | 2 / 32 |
| c825a9b95709c89c0000000000001084 | driver.queue.scheduler-late | 0.281 | none | 2 / 32 |
| c825a9b95709c89c0000000000001084 | driver.queue.scheduler-dispatch | 0.074 | none | 4 / 32 |

Observed active steps while trace c825a9b95709c89c0000000000001084 waited: [{"at":1794789880802.288,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000107e","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000107f","step":"client.http"}]},{"at":1794789880821.8916,"inFlight":1,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000107f","step":"client.http"}]},{"at":1794789880842.7842,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001081","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001088","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"}]},{"at":1794789880863.6802,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001081","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001088","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"}]},{"at":1794789880884.7588,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001088","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001082","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108f","step":"client.http"}]},{"at":1794789880905.8882,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001082","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108f","step":"client.http"}]},{"at":1794789880926.336,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001082","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001092","step":"client.http"}]},{"at":1794789880946.5208,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001092","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001083","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001095","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001096","step":"client.http"}]}]

| c825a9b95709c89c0000000000001c57 | driver.queue.subject | 188.930 | c825a9b95709c89c0000000000001c56 | 1 / 32 |
| c825a9b95709c89c0000000000001c57 | driver.queue.scheduler-dispatch | 0.090 | none | 1 / 32 |
| c825a9b95709c89c0000000000001c57 | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace c825a9b95709c89c0000000000001c57 waited: [{"at":1794789906651.2117,"inFlight":1,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4c","step":"client.http"}]},{"at":1794789906671.1616,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4e","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c59","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5a","step":"client.http"}]},{"at":1794789906695.601,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c59","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c4f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5d","step":"client.http"}]},{"at":1794789906714.9746,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5d","step":"client.http"}]},{"at":1794789906743.8225,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c62","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c50","step":"client.http"}]},{"at":1794789906766.0967,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c68","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c51","step":"client.http"}]},{"at":1794789906789.6177,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c6a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c6d","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c6e","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c53","step":"client.http"}]},{"at":1794789906808.7263,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c6d","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c53","step":"client.http"}]},{"at":1794789906829.5208,"inFlight":1,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c56","step":"client.http"}]}]

| c825a9b95709c89c0000000000001c56 | driver.queue.subject | 178.057 | c825a9b95709c89c0000000000001c55 | 1 / 32 |
| c825a9b95709c89c0000000000001c56 | driver.queue.scheduler-dispatch | 0.092 | none | 0 / 32 |
| c825a9b95709c89c0000000000001c56 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace c825a9b95709c89c0000000000001c56 waited: [{"at":1794789906651.2117,"inFlight":1,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4c","step":"client.http"}]},{"at":1794789906671.1616,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4e","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c59","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5a","step":"client.http"}]},{"at":1794789906695.601,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c59","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c4f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5d","step":"client.http"}]},{"at":1794789906714.9746,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5d","step":"client.http"}]},{"at":1794789906743.8225,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c62","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c50","step":"client.http"}]},{"at":1794789906766.0967,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c68","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c51","step":"client.http"}]},{"at":1794789906789.6177,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c6a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c6d","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c6e","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c53","step":"client.http"}]},{"at":1794789906808.7263,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c6d","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c53","step":"client.http"}]}]

| c825a9b95709c89c0000000000001083 | driver.queue.subject | 156.571 | c825a9b95709c89c0000000000001082 | 2 / 32 |
| c825a9b95709c89c0000000000001083 | driver.queue.scheduler-dispatch | 0.071 | none | 2 / 32 |
| c825a9b95709c89c0000000000001083 | driver.queue.scheduler-late | 0.003 | none | 2 / 32 |

Observed active steps while trace c825a9b95709c89c0000000000001083 waited: [{"at":1794789880782.141,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000107d","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000107e","step":"client.http"}]},{"at":1794789880802.288,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000107e","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000107f","step":"client.http"}]},{"at":1794789880821.8916,"inFlight":1,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000107f","step":"client.http"}]},{"at":1794789880842.7842,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001081","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001088","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"}]},{"at":1794789880863.6802,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001081","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001088","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"}]},{"at":1794789880884.7588,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001088","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001082","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108f","step":"client.http"}]},{"at":1794789880905.8882,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c000000000000108a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001082","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108f","step":"client.http"}]},{"at":1794789880926.336,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001082","step":"client.http"},{"traceId":"c825a9b95709c89c000000000000108f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001092","step":"client.http"}]}]

| c825a9b95709c89c0000000000001c55 | driver.queue.subject | 172.356 | c825a9b95709c89c0000000000001c54 | 1 / 32 |
| c825a9b95709c89c0000000000001c55 | driver.queue.scheduler-late | 0.853 | none | 1 / 32 |
| c825a9b95709c89c0000000000001c55 | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |

Observed active steps while trace c825a9b95709c89c0000000000001c55 waited: [{"at":1794789906651.2117,"inFlight":1,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4c","step":"client.http"}]},{"at":1794789906671.1616,"inFlight":3,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4e","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c59","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5a","step":"client.http"}]},{"at":1794789906695.601,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c59","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c4f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5d","step":"client.http"}]},{"at":1794789906714.9746,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c4f","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c5d","step":"client.http"}]},{"at":1794789906743.8225,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c62","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c50","step":"client.http"}]},{"at":1794789906766.0967,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c68","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c51","step":"client.http"}]},{"at":1794789906789.6177,"inFlight":4,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c6a","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c6d","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c6e","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c53","step":"client.http"}]},{"at":1794789906808.7263,"inFlight":2,"capacity":32,"active":[{"traceId":"c825a9b95709c89c0000000000001c6d","step":"client.http"},{"traceId":"c825a9b95709c89c0000000000001c53","step":"client.http"}]}]

## P2 / warmup / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.598 | 0.345 | 0.000 | 0.781 | 3.193 | n/a | 0.000 | 0.093 | 1.190 | 3.113 | 0.026 | n/a | 0.523 | 10.851 | n/a | n/a | 0.038 | 3.309 | 0.184 | 0.038 |
| p99 | 41.328 | 2.365 | 0.000 | 2.327 | 9.736 | n/a | 0.000 | 0.400 | 3.454 | 9.112 | 0.084 | n/a | 1.863 | 20.675 | n/a | n/a | 0.291 | 10.135 | 0.245 | 0.291 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000038 | 41.328 | 9.736 | n/a | 0.000 | 0.400 | 0.962 | 9.112 | 0.026 | n/a | 0.128 | 20.675 | n/a | n/a | 0.291 | 10.135 | 0.245 | 0.291 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000048 | 31.052 | 5.607 | n/a | 0.000 | 0.107 | 0.612 | 5.972 | 0.084 | n/a | 0.272 | 18.360 | n/a | n/a | 0.038 | 5.713 | 0.184 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| c825a9b95709c89c000000000000003b | 20.259 | 2.708 | n/a | 0.000 | 0.064 | 1.018 | 4.962 | 0.022 | n/a | 0.523 | 10.935 | n/a | n/a | 0.027 | 2.771 | 0.137 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| c825a9b95709c89c000000000000003e | 19.598 | 2.117 | n/a | 0.000 | 0.081 | 3.454 | 2.616 | 0.021 | n/a | 0.427 | 10.851 | n/a | n/a | 0.031 | 2.198 | 0.112 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| c825a9b95709c89c0000000000000044 | 18.333 | 3.927 | n/a | 0.000 | 0.073 | 1.190 | 1.572 | 0.022 | n/a | 1.863 | 9.659 | n/a | n/a | 0.028 | 4.000 | 0.218 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000041 | 15.948 | 1.714 | n/a | 0.000 | 0.093 | 1.212 | 2.431 | 0.030 | n/a | 0.858 | 9.573 | n/a | n/a | 0.038 | 1.807 | 0.113 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000004a | 14.921 | 3.193 | n/a | 0.000 | 0.117 | 1.326 | 3.113 | 0.053 | n/a | 1.722 | 5.349 | n/a | n/a | 0.049 | 3.309 | 0.222 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.598 | 0.345 | 0.000 | 0.635 | 2.117 | n/a | 0.000 | 0.081 | 1.212 | 2.616 | 0.022 | n/a | 0.523 | 10.851 | n/a | n/a | 0.031 | 2.198 | 0.113 | 0.031 |
| p99 | 20.259 | 0.868 | 0.000 | 0.781 | 2.708 | n/a | 0.000 | 0.093 | 3.454 | 4.962 | 0.030 | n/a | 0.858 | 10.935 | n/a | n/a | 0.038 | 2.771 | 0.137 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c000000000000003b | 20.259 | 2.708 | n/a | 0.000 | 0.064 | 1.018 | 4.962 | 0.022 | n/a | 0.523 | 10.935 | n/a | n/a | 0.027 | 2.771 | 0.137 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| c825a9b95709c89c000000000000003e | 19.598 | 2.117 | n/a | 0.000 | 0.081 | 3.454 | 2.616 | 0.021 | n/a | 0.427 | 10.851 | n/a | n/a | 0.031 | 2.198 | 0.112 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| c825a9b95709c89c0000000000000041 | 15.948 | 1.714 | n/a | 0.000 | 0.093 | 1.212 | 2.431 | 0.030 | n/a | 0.858 | 9.573 | n/a | n/a | 0.038 | 1.807 | 0.113 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.830 | 0.289 | 0.000 | 0.545 | 2.522 | n/a | 0.000 | 0.084 | 1.193 | 1.793 | 0.027 | n/a | 0.736 | 10.648 | n/a | n/a | 0.036 | 2.589 | 0.134 | 0.036 |
| p99 | 25.752 | 2.518 | 0.000 | 1.930 | 5.079 | n/a | 0.000 | 0.146 | 1.306 | 5.830 | 0.056 | n/a | 3.755 | 19.536 | n/a | n/a | 0.064 | 5.163 | 0.211 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c000000000000005f | 25.752 | 2.408 | n/a | 0.000 | 0.146 | 1.306 | 1.432 | 0.028 | n/a | 0.831 | 19.536 | n/a | n/a | 0.064 | 2.554 | 0.099 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| c825a9b95709c89c0000000000000054 | 24.497 | 5.079 | n/a | 0.000 | 0.084 | 1.203 | 5.830 | 0.027 | n/a | 0.135 | 12.104 | n/a | n/a | 0.035 | 5.163 | 0.211 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000005a | 22.966 | 2.961 | n/a | 0.000 | 0.124 | 1.119 | 2.041 | 0.028 | n/a | 3.579 | 13.071 | n/a | n/a | 0.044 | 3.084 | 0.134 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000005d | 16.830 | 2.738 | n/a | 0.000 | 0.108 | 0.965 | 1.793 | 0.021 | n/a | 0.521 | 10.648 | n/a | n/a | 0.036 | 2.846 | 0.169 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000051 | 16.607 | 2.135 | n/a | 0.000 | 0.069 | 1.303 | 2.893 | 0.056 | n/a | 0.736 | 9.371 | n/a | n/a | 0.042 | 2.204 | 0.133 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000004e | 15.254 | 1.778 | n/a | 0.000 | 0.062 | 0.816 | 1.537 | 0.022 | n/a | 0.410 | 10.594 | n/a | n/a | 0.034 | 1.840 | 0.121 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000057 | 14.257 | 2.522 | n/a | 0.000 | 0.066 | 1.193 | 1.535 | 0.024 | n/a | 3.755 | 5.130 | n/a | n/a | 0.030 | 2.589 | 0.182 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.607 | 0.000 | 0.000 | 0.503 | 2.408 | n/a | 0.000 | 0.069 | 1.119 | 1.537 | 0.024 | n/a | 0.736 | 10.594 | n/a | n/a | 0.036 | 2.554 | 0.133 | 0.036 |
| p99 | 25.752 | 0.999 | 0.000 | 0.756 | 2.961 | n/a | 0.000 | 0.146 | 1.306 | 2.893 | 0.056 | n/a | 3.755 | 19.536 | n/a | n/a | 0.064 | 3.084 | 0.182 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c000000000000005f | 25.752 | 2.408 | n/a | 0.000 | 0.146 | 1.306 | 1.432 | 0.028 | n/a | 0.831 | 19.536 | n/a | n/a | 0.064 | 2.554 | 0.099 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| c825a9b95709c89c000000000000005a | 22.966 | 2.961 | n/a | 0.000 | 0.124 | 1.119 | 2.041 | 0.028 | n/a | 3.579 | 13.071 | n/a | n/a | 0.044 | 3.084 | 0.134 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000005d | 16.830 | 2.738 | n/a | 0.000 | 0.108 | 0.965 | 1.793 | 0.021 | n/a | 0.521 | 10.648 | n/a | n/a | 0.036 | 2.846 | 0.169 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000051 | 16.607 | 2.135 | n/a | 0.000 | 0.069 | 1.303 | 2.893 | 0.056 | n/a | 0.736 | 9.371 | n/a | n/a | 0.042 | 2.204 | 0.133 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000004e | 15.254 | 1.778 | n/a | 0.000 | 0.062 | 0.816 | 1.537 | 0.022 | n/a | 0.410 | 10.594 | n/a | n/a | 0.034 | 1.840 | 0.121 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000057 | 14.257 | 2.522 | n/a | 0.000 | 0.066 | 1.193 | 1.535 | 0.024 | n/a | 3.755 | 5.130 | n/a | n/a | 0.030 | 2.589 | 0.182 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.224 | 0.000 | 0.000 | 0.593 | 2.619 | n/a | 0.000 | 0.052 | 3.064 | 2.753 | 0.026 | n/a | 0.615 | 15.811 | n/a | n/a | 0.024 | 2.670 | 0.125 | 0.024 |
| p99 | 153.430 | 0.999 | 0.000 | 0.882 | 6.896 | n/a | 0.000 | 0.127 | 8.182 | 13.625 | 0.331 | n/a | 0.717 | 135.663 | n/a | n/a | 0.050 | 6.949 | 0.216 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000073 | 153.430 | 2.619 | n/a | 0.000 | 0.051 | 0.903 | 13.625 | 0.030 | n/a | 0.516 | 135.663 | n/a | n/a | 0.024 | 2.670 | 0.017 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| c825a9b95709c89c000000000000006e | 36.162 | 5.936 | n/a | 0.000 | 0.127 | 3.064 | 2.753 | 0.026 | n/a | 0.696 | 23.510 | n/a | n/a | 0.050 | 6.063 | 0.168 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000006b | 32.224 | 6.896 | n/a | 0.000 | 0.052 | 8.182 | 11.750 | 0.331 | n/a | 0.615 | 4.374 | n/a | n/a | 0.023 | 6.949 | 0.216 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| c825a9b95709c89c0000000000000065 | 24.289 | 2.589 | n/a | 0.000 | 0.054 | 3.874 | 1.770 | 0.023 | n/a | 0.145 | 15.811 | n/a | n/a | 0.024 | 2.642 | 0.109 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000068 | 16.458 | 2.009 | n/a | 0.000 | 0.051 | 0.893 | 1.811 | 0.021 | n/a | 0.717 | 10.935 | n/a | n/a | 0.021 | 2.060 | 0.125 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.458 | 0.000 | 0.000 | 0.295 | 2.009 | n/a | 0.000 | 0.051 | 0.893 | 1.811 | 0.021 | n/a | 0.615 | 4.374 | n/a | n/a | 0.021 | 2.060 | 0.125 | 0.021 |
| p99 | 32.224 | 0.000 | 0.000 | 0.552 | 6.896 | n/a | 0.000 | 0.052 | 8.182 | 11.750 | 0.331 | n/a | 0.717 | 10.935 | n/a | n/a | 0.023 | 6.949 | 0.216 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c000000000000006b | 32.224 | 6.896 | n/a | 0.000 | 0.052 | 8.182 | 11.750 | 0.331 | n/a | 0.615 | 4.374 | n/a | n/a | 0.023 | 6.949 | 0.216 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| c825a9b95709c89c0000000000000068 | 16.458 | 2.009 | n/a | 0.000 | 0.051 | 0.893 | 1.811 | 0.021 | n/a | 0.717 | 10.935 | n/a | n/a | 0.021 | 2.060 | 0.125 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.951 | 0.819 | 0.000 | 0.714 | 2.773 | n/a | 0.000 | 0.057 | 1.328 | 3.971 | 0.041 | n/a | 0.592 | 18.872 | n/a | n/a | 0.025 | 2.891 | 0.103 | 0.025 |
| p99 | 117.372 | 1.992 | 0.000 | 1.507 | 5.471 | n/a | 0.000 | 0.124 | 1.808 | 15.809 | 0.077 | n/a | 4.336 | 97.526 | n/a | n/a | 0.049 | 5.595 | 0.244 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000082 | 117.372 | 2.478 | n/a | 0.000 | 0.055 | 1.328 | 15.809 | 0.030 | n/a | 0.120 | 97.526 | n/a | n/a | 0.025 | 2.533 | 0.022 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.222ms |
| c825a9b95709c89c0000000000000091 | 42.028 | 5.471 | n/a | 0.000 | 0.124 | 1.439 | 7.677 | 0.077 | n/a | 0.233 | 26.958 | n/a | n/a | 0.049 | 5.595 | 0.133 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000075 | 41.703 | 1.800 | n/a | 0.000 | 0.052 | 1.630 | 6.299 | 0.051 | n/a | 3.311 | 28.537 | n/a | n/a | 0.024 | 1.852 | 0.044 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000085 | 37.942 | 2.636 | n/a | 0.000 | 0.042 | 0.875 | 6.352 | 0.030 | n/a | 4.336 | 23.655 | n/a | n/a | 0.015 | 2.679 | 0.071 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000079 | 37.827 | 3.085 | n/a | 0.000 | 0.057 | 1.591 | 3.971 | 0.024 | n/a | 0.592 | 28.484 | n/a | n/a | 0.023 | 3.142 | 0.083 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000007d | 37.188 | 4.529 | n/a | 0.000 | 0.052 | 0.864 | 12.949 | 0.041 | n/a | 0.157 | 18.573 | n/a | n/a | 0.022 | 4.581 | 0.123 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000008c | 34.951 | 3.082 | n/a | 0.000 | 0.069 | 1.574 | 3.189 | 0.020 | n/a | 0.471 | 26.517 | n/a | n/a | 0.028 | 3.151 | 0.090 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000098 | 28.883 | 3.660 | n/a | 0.000 | 0.099 | 1.808 | 2.164 | 0.044 | n/a | 2.200 | 18.872 | n/a | n/a | 0.034 | 3.759 | 0.130 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000080 | 23.528 | 2.466 | n/a | 0.000 | 0.051 | 1.546 | 2.863 | 0.045 | n/a | 0.573 | 15.963 | n/a | n/a | 0.022 | 2.516 | 0.107 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000087 | 23.320 | 2.322 | n/a | 0.000 | 0.082 | 0.885 | 2.181 | 0.022 | n/a | 0.554 | 17.245 | n/a | n/a | 0.029 | 2.403 | 0.103 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000094 | 20.460 | 4.885 | n/a | 0.000 | 0.117 | 0.704 | 4.851 | 0.021 | n/a | 0.620 | 9.223 | n/a | n/a | 0.041 | 5.001 | 0.244 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000008e | 16.840 | 1.464 | n/a | 0.000 | 0.040 | 1.148 | 2.595 | 0.044 | n/a | 0.716 | 10.813 | n/a | n/a | 0.019 | 1.504 | 0.089 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000008a | 13.517 | 2.773 | n/a | 0.000 | 0.118 | 1.263 | 2.602 | 0.058 | n/a | 0.997 | 5.667 | n/a | n/a | 0.040 | 2.891 | 0.214 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.528 | 0.000 | 0.000 | 0.442 | 2.466 | n/a | 0.000 | 0.052 | 1.546 | 2.602 | 0.045 | n/a | 0.997 | 15.963 | n/a | n/a | 0.024 | 2.516 | 0.107 | 0.024 |
| p99 | 41.703 | 1.000 | 0.000 | 0.851 | 3.660 | n/a | 0.000 | 0.118 | 1.808 | 6.299 | 0.058 | n/a | 3.311 | 28.537 | n/a | n/a | 0.040 | 3.759 | 0.214 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000075 | 41.703 | 1.800 | n/a | 0.000 | 0.052 | 1.630 | 6.299 | 0.051 | n/a | 3.311 | 28.537 | n/a | n/a | 0.024 | 1.852 | 0.044 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000098 | 28.883 | 3.660 | n/a | 0.000 | 0.099 | 1.808 | 2.164 | 0.044 | n/a | 2.200 | 18.872 | n/a | n/a | 0.034 | 3.759 | 0.130 | 0.034 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000080 | 23.528 | 2.466 | n/a | 0.000 | 0.051 | 1.546 | 2.863 | 0.045 | n/a | 0.573 | 15.963 | n/a | n/a | 0.022 | 2.516 | 0.107 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000008e | 16.840 | 1.464 | n/a | 0.000 | 0.040 | 1.148 | 2.595 | 0.044 | n/a | 0.716 | 10.813 | n/a | n/a | 0.019 | 1.504 | 0.089 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000008a | 13.517 | 2.773 | n/a | 0.000 | 0.118 | 1.263 | 2.602 | 0.058 | n/a | 0.997 | 5.667 | n/a | n/a | 0.040 | 2.891 | 0.214 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.291 | n/a | n/a | n/a | 38.271 | 21.290 | 2.421 | 0.000 | 0.315 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.892 | 65.927 | 0.781 | 21.892 |
| p99 | 598.298 | n/a | n/a | n/a | 134.512 | 517.825 | 18.179 | 0.000 | 80.960 | 1.748 | 108.645 | n/a | 0.016 | 0.000 | n/a | n/a | 175.737 | 573.612 | 1.000 | 175.737 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000001c92 | 652.442 | 68.913 | 529.379 | 8.007 | 0.000 | 0.356 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.786 | 606.300 | 0.929 | 45.786 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.256ms; driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.573ms |
| c825a9b95709c89c0000000000001c7e | 607.335 | 85.519 | 446.105 | 4.968 | 0.000 | 0.495 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.248 | 536.591 | 0.884 | 70.248 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.256ms; driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.573ms |
| c825a9b95709c89c0000000000001c8a | 598.298 | 36.166 | 536.677 | 0.769 | 0.000 | 0.331 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.355 | 573.612 | 0.959 | 24.355 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.256ms; driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.573ms |
| c825a9b95709c89c0000000000001c97 | 596.216 | 58.533 | 517.825 | 9.877 | 0.000 | 0.449 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.533 | 586.234 | 0.983 | 9.533 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.256ms; driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.573ms |
| c825a9b95709c89c0000000000001c8b | 587.540 | 50.418 | 482.121 | 0.769 | 0.000 | 0.297 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 53.934 | 533.308 | 0.908 | 53.934 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.256ms; driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.reader-basis.broadcast 0.573ms |
| c825a9b95709c89c0000000000001c7f | 547.350 | 90.671 | 387.575 | 8.171 | 0.000 | 0.433 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.500 | 486.418 | 0.889 | 60.500 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c0000000000001c78 | 518.960 | 86.599 | 289.399 | 4.680 | 0.000 | 0.299 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 137.983 | 380.678 | 0.734 | 137.983 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.321ms |
| c825a9b95709c89c0000000000001c8f | 492.044 | 34.209 | 399.474 | 0.769 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.357 | 434.453 | 0.883 | 57.357 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c0000000000001c38 | 465.422 | 60.936 | 222.948 | 5.205 | 0.000 | 0.596 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 175.737 | 289.089 | 0.621 | 175.737 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; client.parse 1.290ms; driver.reader-basis.broadcast 0.756ms |
| c825a9b95709c89c0000000000001c84 | 464.867 | 49.364 | 362.487 | 1.040 | 0.000 | 0.213 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.763 | 412.891 | 0.888 | 51.763 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c0000000000001c7c | 448.375 | 136.276 | 261.472 | 7.029 | 0.000 | 0.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.285 | 404.778 | 0.903 | 43.285 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c0000000000001c7a | 437.623 | 89.550 | 250.979 | 3.813 | 0.000 | 0.431 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 92.850 | 344.342 | 0.787 | 92.850 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c0000000000001c67 | 403.942 | 32.915 | 240.629 | 2.255 | 0.000 | 0.229 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 127.913 | 275.799 | 0.683 | 127.913 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001c69 | 368.299 | 69.539 | 165.793 | 6.908 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 125.797 | 242.240 | 0.658 | 125.797 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms; driver.publication.readback 0.351ms |
| c825a9b95709c89c0000000000001c8e | 365.205 | 149.911 | 190.307 | 8.458 | 0.000 | 0.511 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.019 | 348.675 | 0.955 | 16.019 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.664ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c0000000000001c63 | 360.438 | 87.157 | 178.266 | 8.791 | 0.000 | 0.367 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.857 | 274.214 | 0.761 | 85.857 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.529ms |
| c825a9b95709c89c0000000000001c70 | 351.515 | 52.073 | 236.848 | 0.963 | 0.000 | 0.284 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.347 | 289.884 | 0.825 | 61.347 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.738ms; driver.reader-basis.broadcast 0.597ms; driver.publication.readback 0.351ms; driver.reader-basis.broadcast 0.321ms; driver.reader-basis.broadcast 0.311ms |
| c825a9b95709c89c00000000000002f8 | 350.000 | 16.553 | 4.399 | 0.827 | 0.000 | 147.232 | 11.179 | 169.790 | n/a | 0.005 | 0.000 | n/a | n/a | 0.015 | 21.780 | 0.062 | 0.015 | gw-r/thread-115/gateway.admission-wait | driver.expected-state.bind-receipt 4.106ms; driver.reader-basis.broadcast 0.145ms; driver.publication.readback 0.120ms; driver.publication.readback 0.120ms; driver.publication.readback 0.119ms |
| c825a9b95709c89c0000000000001c39 | 346.198 | 66.875 | 239.041 | 4.972 | 0.000 | 0.625 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.685 | 310.888 | 0.898 | 34.685 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.708ms; driver.reader-basis.broadcast 1.350ms; client.parse 1.290ms; driver.reader-basis.broadcast 0.756ms; driver.publication.persist-deferred 0.567ms |
| c825a9b95709c89c000000000000032e | 343.196 | 46.599 | 261.502 | 7.071 | 0.000 | 0.630 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.395 | 315.171 | 0.918 | 27.395 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.100ms; driver.publication.readback 0.079ms; driver.publication.readback 0.075ms |

## P2 / L16 / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.263 | 0.000 | 0.000 | 0.650 | 2.900 | n/a | 0.000 | 0.113 | 0.908 | 2.137 | 0.022 | n/a | 0.605 | 12.358 | n/a | n/a | 0.024 | 3.315 | 0.123 | 0.024 |
| p99 | 106.394 | 1.997 | 0.000 | 1.905 | 5.922 | n/a | 0.000 | 6.208 | 1.494 | 5.792 | 0.029 | n/a | 3.479 | 95.501 | n/a | n/a | 0.044 | 8.502 | 0.468 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000a9 | 106.394 | 3.202 | n/a | 0.000 | 0.113 | 1.109 | 5.792 | 0.029 | n/a | 0.605 | 95.501 | n/a | n/a | 0.042 | 3.315 | 0.031 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c825a9b95709c89c00000000000000ae | 43.285 | 5.252 | n/a | 0.000 | 0.065 | 0.720 | 1.289 | 0.019 | n/a | 0.714 | 35.202 | n/a | n/a | 0.023 | 5.317 | 0.123 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000a6 | 32.326 | 4.667 | n/a | 0.000 | 0.118 | 1.411 | 1.470 | 0.021 | n/a | 0.445 | 24.155 | n/a | n/a | 0.039 | 4.785 | 0.148 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000b0 | 28.984 | 2.214 | n/a | 0.000 | 0.072 | 1.178 | 1.841 | 0.024 | n/a | 0.182 | 23.445 | n/a | n/a | 0.028 | 2.286 | 0.079 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.131ms |
| c825a9b95709c89c000000000000009f | 25.263 | 5.922 | n/a | 0.000 | 0.115 | 1.494 | 2.137 | 0.023 | n/a | 3.479 | 12.048 | n/a | n/a | 0.044 | 6.037 | 0.239 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000b2 | 21.165 | 2.038 | n/a | 0.000 | 0.203 | 0.687 | 5.421 | 0.020 | n/a | 0.419 | 12.358 | n/a | n/a | 0.020 | 2.241 | 0.106 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000009d | 19.343 | 2.900 | n/a | 0.000 | 0.056 | 0.908 | 5.419 | 0.022 | n/a | 0.701 | 9.312 | n/a | n/a | 0.024 | 2.956 | 0.153 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| c825a9b95709c89c00000000000000a0 | 18.182 | 2.294 | n/a | 0.000 | 6.208 | 0.749 | 2.738 | 0.027 | n/a | 0.703 | 5.443 | n/a | n/a | 0.020 | 8.502 | 0.468 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.288ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.020ms |

## P2 / L16 / commit / 5-10 facts (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.165 | 0.000 | 0.000 | 0.497 | 2.294 | n/a | 0.000 | 0.118 | 0.749 | 2.738 | 0.021 | n/a | 0.445 | 12.358 | n/a | n/a | 0.020 | 3.315 | 0.106 | 0.020 |
| p99 | 106.394 | 1.004 | 0.000 | 0.900 | 4.667 | n/a | 0.000 | 6.208 | 1.411 | 5.792 | 0.029 | n/a | 0.703 | 95.501 | n/a | n/a | 0.042 | 8.502 | 0.468 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000a9 | 106.394 | 3.202 | n/a | 0.000 | 0.113 | 1.109 | 5.792 | 0.029 | n/a | 0.605 | 95.501 | n/a | n/a | 0.042 | 3.315 | 0.031 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| c825a9b95709c89c00000000000000a6 | 32.326 | 4.667 | n/a | 0.000 | 0.118 | 1.411 | 1.470 | 0.021 | n/a | 0.445 | 24.155 | n/a | n/a | 0.039 | 4.785 | 0.148 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000b2 | 21.165 | 2.038 | n/a | 0.000 | 0.203 | 0.687 | 5.421 | 0.020 | n/a | 0.419 | 12.358 | n/a | n/a | 0.020 | 2.241 | 0.106 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000a0 | 18.182 | 2.294 | n/a | 0.000 | 6.208 | 0.749 | 2.738 | 0.027 | n/a | 0.703 | 5.443 | n/a | n/a | 0.020 | 8.502 | 0.468 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.288ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.020ms |

## P2 / L64 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.491 | 0.996 | 0.000 | 0.692 | 2.459 | n/a | 0.000 | 0.053 | 0.899 | 5.478 | 0.046 | n/a | 0.274 | 13.187 | n/a | n/a | 0.023 | 2.505 | 0.119 | 0.023 |
| p99 | 114.996 | 1.077 | 0.022 | 1.026 | 6.251 | n/a | 0.000 | 0.102 | 1.242 | 14.600 | 3.251 | n/a | 1.132 | 92.488 | n/a | n/a | 0.042 | 6.353 | 0.183 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000c0 | 114.996 | 3.193 | n/a | 0.000 | 0.061 | 1.242 | 14.600 | 3.251 | n/a | 0.132 | 92.488 | n/a | n/a | 0.028 | 3.254 | 0.028 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.105ms |
| c825a9b95709c89c00000000000000c7 | 34.649 | 6.251 | n/a | 0.000 | 0.102 | 0.811 | 3.975 | 0.063 | n/a | 1.132 | 22.274 | n/a | n/a | 0.042 | 6.353 | 0.183 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| c825a9b95709c89c00000000000000c5 | 32.452 | 2.459 | n/a | 0.000 | 0.046 | 0.826 | 1.579 | 0.025 | n/a | 0.650 | 26.844 | n/a | n/a | 0.022 | 2.505 | 0.077 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000bb | 23.491 | 3.556 | n/a | 0.000 | 0.033 | 0.432 | 6.118 | 0.021 | n/a | 0.129 | 13.187 | n/a | n/a | 0.014 | 3.590 | 0.153 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000b6 | 20.753 | 2.416 | n/a | 0.000 | 0.053 | 1.178 | 5.893 | 0.057 | n/a | 0.274 | 10.856 | n/a | n/a | 0.026 | 2.469 | 0.119 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms |
| c825a9b95709c89c00000000000000b8 | 16.929 | 1.937 | n/a | 0.000 | 0.063 | 0.899 | 2.939 | 0.046 | n/a | 0.411 | 10.612 | n/a | n/a | 0.023 | 2.000 | 0.118 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000c9 | 14.159 | 2.264 | n/a | 0.000 | 0.037 | 1.198 | 5.478 | 0.039 | n/a | 0.141 | 4.984 | n/a | n/a | 0.017 | 2.301 | 0.163 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.753 | 0.999 | 0.000 | 0.674 | 2.416 | n/a | 0.000 | 0.053 | 0.899 | 2.939 | 0.046 | n/a | 0.411 | 10.856 | n/a | n/a | 0.023 | 2.469 | 0.118 | 0.023 |
| p99 | 32.452 | 1.077 | 0.022 | 0.692 | 2.459 | n/a | 0.000 | 0.063 | 1.178 | 5.893 | 0.057 | n/a | 0.650 | 26.844 | n/a | n/a | 0.026 | 2.505 | 0.119 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000c5 | 32.452 | 2.459 | n/a | 0.000 | 0.046 | 0.826 | 1.579 | 0.025 | n/a | 0.650 | 26.844 | n/a | n/a | 0.022 | 2.505 | 0.077 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000b6 | 20.753 | 2.416 | n/a | 0.000 | 0.053 | 1.178 | 5.893 | 0.057 | n/a | 0.274 | 10.856 | n/a | n/a | 0.026 | 2.469 | 0.119 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms |
| c825a9b95709c89c00000000000000b8 | 16.929 | 1.937 | n/a | 0.000 | 0.063 | 0.899 | 2.939 | 0.046 | n/a | 0.411 | 10.612 | n/a | n/a | 0.023 | 2.000 | 0.118 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.269 | 0.000 | 0.000 | 0.458 | 2.070 | n/a | 0.000 | 0.060 | 0.871 | 2.198 | 0.022 | n/a | 0.238 | 14.513 | n/a | n/a | 0.025 | 2.433 | 0.130 | 0.025 |
| p99 | 120.304 | 1.999 | 0.000 | 1.303 | 4.615 | n/a | 0.000 | 0.902 | 6.368 | 7.753 | 0.076 | n/a | 1.099 | 111.633 | n/a | n/a | 0.048 | 4.678 | 0.210 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000d7 | 120.304 | 1.954 | n/a | 0.000 | 0.050 | 0.872 | 5.662 | 0.020 | n/a | 0.088 | 111.633 | n/a | n/a | 0.026 | 2.004 | 0.017 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.130ms |
| c825a9b95709c89c00000000000000d4 | 34.794 | 2.917 | n/a | 0.000 | 0.115 | 1.064 | 7.753 | 0.057 | n/a | 0.800 | 22.041 | n/a | n/a | 0.048 | 3.031 | 0.087 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000db | 28.595 | 3.002 | n/a | 0.000 | 0.902 | 1.541 | 2.736 | 0.054 | n/a | 0.714 | 19.622 | n/a | n/a | 0.025 | 3.904 | 0.137 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000e5 | 27.872 | 2.422 | n/a | 0.000 | 0.050 | 6.368 | 2.878 | 0.076 | n/a | 0.238 | 15.820 | n/a | n/a | 0.021 | 2.472 | 0.089 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000d2 | 22.269 | 4.615 | n/a | 0.000 | 0.063 | 0.707 | 2.198 | 0.021 | n/a | 0.128 | 14.513 | n/a | n/a | 0.025 | 4.678 | 0.210 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.222ms |
| c825a9b95709c89c00000000000000cd | 18.473 | 2.070 | n/a | 0.000 | 0.363 | 0.846 | 2.000 | 0.021 | n/a | 1.099 | 12.056 | n/a | n/a | 0.018 | 2.433 | 0.132 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000dd | 16.280 | 2.056 | n/a | 0.000 | 0.057 | 0.871 | 1.674 | 0.024 | n/a | 0.167 | 11.404 | n/a | n/a | 0.027 | 2.113 | 0.130 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000df | 13.850 | 1.722 | n/a | 0.000 | 0.047 | 0.744 | 1.441 | 0.020 | n/a | 0.874 | 8.979 | n/a | n/a | 0.023 | 1.769 | 0.128 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| c825a9b95709c89c00000000000000e3 | 9.459 | 1.884 | n/a | 0.000 | 0.060 | 0.848 | 1.461 | 0.022 | n/a | 0.126 | 5.037 | n/a | n/a | 0.021 | 1.944 | 0.206 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.280 | 0.000 | 0.000 | 0.393 | 1.954 | n/a | 0.000 | 0.050 | 0.848 | 1.674 | 0.021 | n/a | 0.167 | 11.404 | n/a | n/a | 0.021 | 2.004 | 0.128 | 0.021 |
| p99 | 120.304 | 0.998 | 0.000 | 0.542 | 2.422 | n/a | 0.000 | 0.363 | 6.368 | 5.662 | 0.076 | n/a | 1.099 | 111.633 | n/a | n/a | 0.027 | 2.472 | 0.206 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000d7 | 120.304 | 1.954 | n/a | 0.000 | 0.050 | 0.872 | 5.662 | 0.020 | n/a | 0.088 | 111.633 | n/a | n/a | 0.026 | 2.004 | 0.017 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.130ms |
| c825a9b95709c89c00000000000000e5 | 27.872 | 2.422 | n/a | 0.000 | 0.050 | 6.368 | 2.878 | 0.076 | n/a | 0.238 | 15.820 | n/a | n/a | 0.021 | 2.472 | 0.089 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000cd | 18.473 | 2.070 | n/a | 0.000 | 0.363 | 0.846 | 2.000 | 0.021 | n/a | 1.099 | 12.056 | n/a | n/a | 0.018 | 2.433 | 0.132 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000dd | 16.280 | 2.056 | n/a | 0.000 | 0.057 | 0.871 | 1.674 | 0.024 | n/a | 0.167 | 11.404 | n/a | n/a | 0.027 | 2.113 | 0.130 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000df | 13.850 | 1.722 | n/a | 0.000 | 0.047 | 0.744 | 1.441 | 0.020 | n/a | 0.874 | 8.979 | n/a | n/a | 0.023 | 1.769 | 0.128 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| c825a9b95709c89c00000000000000e3 | 9.459 | 1.884 | n/a | 0.000 | 0.060 | 0.848 | 1.461 | 0.022 | n/a | 0.126 | 5.037 | n/a | n/a | 0.021 | 1.944 | 0.206 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.109 | 0.861 | 0.000 | 0.546 | 2.954 | n/a | 0.000 | 0.085 | 0.925 | 2.138 | 0.021 | n/a | 0.143 | 16.695 | n/a | n/a | 0.035 | 3.027 | 0.150 | 0.035 |
| p99 | 105.211 | 1.994 | 0.000 | 3.332 | 13.590 | n/a | 0.000 | 0.164 | 4.194 | 12.795 | 0.303 | n/a | 0.913 | 86.951 | n/a | n/a | 0.058 | 13.753 | 0.269 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000f4 | 105.211 | 3.994 | n/a | 0.000 | 0.164 | 1.116 | 12.795 | 0.034 | n/a | 0.101 | 86.951 | n/a | n/a | 0.055 | 4.158 | 0.040 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| c825a9b95709c89c00000000000000ff | 51.167 | 13.590 | n/a | 0.000 | 0.163 | 4.185 | 11.515 | 0.075 | n/a | 0.348 | 21.233 | n/a | n/a | 0.058 | 13.753 | 0.269 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.111ms |
| c825a9b95709c89c00000000000000e9 | 42.073 | 7.322 | n/a | 0.000 | 0.083 | 4.194 | 2.138 | 0.021 | n/a | 0.086 | 28.183 | n/a | n/a | 0.045 | 7.405 | 0.176 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.049ms |
| c825a9b95709c89c00000000000000f1 | 37.606 | 8.273 | n/a | 0.000 | 0.119 | 1.094 | 3.666 | 0.159 | n/a | 0.913 | 23.330 | n/a | n/a | 0.052 | 8.392 | 0.223 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms |
| c825a9b95709c89c0000000000000101 | 23.695 | 3.078 | n/a | 0.000 | 0.110 | 0.857 | 1.282 | 0.019 | n/a | 0.125 | 18.182 | n/a | n/a | 0.042 | 3.188 | 0.135 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms |
| c825a9b95709c89c00000000000000f9 | 21.109 | 2.007 | n/a | 0.000 | 0.059 | 0.821 | 1.310 | 0.023 | n/a | 0.168 | 16.695 | n/a | n/a | 0.027 | 2.066 | 0.098 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000e8 | 20.176 | 2.954 | n/a | 0.000 | 0.063 | 0.925 | 1.133 | 0.021 | n/a | 0.186 | 14.865 | n/a | n/a | 0.029 | 3.017 | 0.150 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000f6 | 19.734 | 2.942 | n/a | 0.000 | 0.085 | 0.879 | 5.158 | 0.021 | n/a | 0.143 | 10.470 | n/a | n/a | 0.035 | 3.027 | 0.153 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000104 | 19.557 | 2.086 | n/a | 0.000 | 0.042 | 0.488 | 1.084 | 0.019 | n/a | 0.122 | 15.696 | n/a | n/a | 0.019 | 2.129 | 0.109 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.207ms |
| c825a9b95709c89c00000000000000fb | 16.743 | 2.212 | n/a | 0.000 | 0.117 | 0.780 | 1.160 | 0.020 | n/a | 0.124 | 12.314 | n/a | n/a | 0.016 | 2.329 | 0.139 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000ef | 15.256 | 2.393 | n/a | 0.000 | 0.069 | 1.243 | 4.391 | 0.303 | n/a | 0.790 | 6.039 | n/a | n/a | 0.027 | 2.463 | 0.161 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.734 | 0.518 | 0.000 | 0.490 | 2.393 | n/a | 0.000 | 0.069 | 0.879 | 1.310 | 0.021 | n/a | 0.143 | 14.865 | n/a | n/a | 0.027 | 2.463 | 0.139 | 0.027 |
| p99 | 105.211 | 1.003 | 0.000 | 0.717 | 3.994 | n/a | 0.000 | 0.164 | 1.243 | 12.795 | 0.303 | n/a | 0.790 | 86.951 | n/a | n/a | 0.055 | 4.158 | 0.161 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000000f4 | 105.211 | 3.994 | n/a | 0.000 | 0.164 | 1.116 | 12.795 | 0.034 | n/a | 0.101 | 86.951 | n/a | n/a | 0.055 | 4.158 | 0.040 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| c825a9b95709c89c00000000000000f9 | 21.109 | 2.007 | n/a | 0.000 | 0.059 | 0.821 | 1.310 | 0.023 | n/a | 0.168 | 16.695 | n/a | n/a | 0.027 | 2.066 | 0.098 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000e8 | 20.176 | 2.954 | n/a | 0.000 | 0.063 | 0.925 | 1.133 | 0.021 | n/a | 0.186 | 14.865 | n/a | n/a | 0.029 | 3.017 | 0.150 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000f6 | 19.734 | 2.942 | n/a | 0.000 | 0.085 | 0.879 | 5.158 | 0.021 | n/a | 0.143 | 10.470 | n/a | n/a | 0.035 | 3.027 | 0.153 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000104 | 19.557 | 2.086 | n/a | 0.000 | 0.042 | 0.488 | 1.084 | 0.019 | n/a | 0.122 | 15.696 | n/a | n/a | 0.019 | 2.129 | 0.109 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.207ms |
| c825a9b95709c89c00000000000000fb | 16.743 | 2.212 | n/a | 0.000 | 0.117 | 0.780 | 1.160 | 0.020 | n/a | 0.124 | 12.314 | n/a | n/a | 0.016 | 2.329 | 0.139 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000000ef | 15.256 | 2.393 | n/a | 0.000 | 0.069 | 1.243 | 4.391 | 0.303 | n/a | 0.790 | 6.039 | n/a | n/a | 0.027 | 2.463 | 0.161 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.225 | 0.993 | 0.000 | 0.630 | 2.844 | n/a | 0.000 | 0.062 | 1.108 | 1.550 | 0.023 | n/a | 0.105 | 12.921 | n/a | n/a | 0.030 | 2.955 | 0.155 | 0.030 |
| p99 | 22.990 | 1.990 | 0.000 | 1.159 | 5.056 | n/a | 0.000 | 0.119 | 3.600 | 5.157 | 2.969 | n/a | 0.598 | 18.032 | n/a | n/a | 0.038 | 5.175 | 0.244 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c000000000000010e | 22.990 | 2.844 | n/a | 0.000 | 0.111 | 0.707 | 1.134 | 0.019 | n/a | 0.105 | 18.032 | n/a | n/a | 0.038 | 2.955 | 0.129 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000010a | 22.455 | 2.424 | n/a | 0.000 | 0.062 | 1.512 | 2.178 | 0.078 | n/a | 0.282 | 15.888 | n/a | n/a | 0.030 | 2.486 | 0.111 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000110 | 21.623 | 3.498 | n/a | 0.000 | 0.084 | 1.661 | 5.157 | 0.067 | n/a | 0.598 | 10.520 | n/a | n/a | 0.037 | 3.582 | 0.166 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000108 | 21.225 | 5.056 | n/a | 0.000 | 0.119 | 1.108 | 1.558 | 0.023 | n/a | 0.112 | 13.209 | n/a | n/a | 0.038 | 5.175 | 0.244 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000011a | 18.939 | 3.572 | n/a | 0.000 | 0.035 | 0.484 | 1.550 | 2.969 | n/a | 0.081 | 10.233 | n/a | n/a | 0.015 | 3.607 | 0.190 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| c825a9b95709c89c0000000000000117 | 17.646 | 2.677 | n/a | 0.000 | 0.056 | 3.600 | 1.157 | 0.020 | n/a | 0.093 | 10.016 | n/a | n/a | 0.027 | 2.733 | 0.155 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000114 | 16.375 | 1.773 | n/a | 0.000 | 0.047 | 0.531 | 0.976 | 0.018 | n/a | 0.092 | 12.921 | n/a | n/a | 0.017 | 1.820 | 0.111 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.623 | 0.993 | 0.000 | 0.461 | 2.677 | n/a | 0.000 | 0.062 | 1.512 | 1.157 | 0.020 | n/a | 0.105 | 12.921 | n/a | n/a | 0.030 | 2.733 | 0.129 | 0.030 |
| p99 | 22.990 | 1.990 | 0.000 | 1.020 | 3.498 | n/a | 0.000 | 0.111 | 3.600 | 5.157 | 0.078 | n/a | 0.598 | 18.032 | n/a | n/a | 0.038 | 3.582 | 0.166 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c000000000000010e | 22.990 | 2.844 | n/a | 0.000 | 0.111 | 0.707 | 1.134 | 0.019 | n/a | 0.105 | 18.032 | n/a | n/a | 0.038 | 2.955 | 0.129 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000010a | 22.455 | 2.424 | n/a | 0.000 | 0.062 | 1.512 | 2.178 | 0.078 | n/a | 0.282 | 15.888 | n/a | n/a | 0.030 | 2.486 | 0.111 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000110 | 21.623 | 3.498 | n/a | 0.000 | 0.084 | 1.661 | 5.157 | 0.067 | n/a | 0.598 | 10.520 | n/a | n/a | 0.037 | 3.582 | 0.166 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000117 | 17.646 | 2.677 | n/a | 0.000 | 0.056 | 3.600 | 1.157 | 0.020 | n/a | 0.093 | 10.016 | n/a | n/a | 0.027 | 2.733 | 0.155 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000114 | 16.375 | 1.773 | n/a | 0.000 | 0.047 | 0.531 | 0.976 | 0.018 | n/a | 0.092 | 12.921 | n/a | n/a | 0.017 | 1.820 | 0.111 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.144 | 0.000 | 0.000 | 0.476 | 2.271 | n/a | 0.000 | 0.059 | 0.890 | 2.015 | 0.024 | n/a | 0.483 | 7.117 | n/a | n/a | 0.024 | 2.313 | 0.169 | 0.024 |
| p99 | 16.932 | 1.617 | 0.014 | 1.567 | 4.083 | n/a | 0.000 | 1.219 | 3.140 | 3.729 | 0.064 | n/a | 1.005 | 10.499 | n/a | n/a | 0.037 | 5.302 | 0.313 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000123 | 16.932 | 4.083 | n/a | 0.000 | 1.219 | 0.890 | 1.355 | 0.022 | n/a | 0.590 | 8.747 | n/a | n/a | 0.025 | 5.302 | 0.313 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000128 | 16.930 | 2.725 | n/a | 0.000 | 0.059 | 0.787 | 3.476 | 0.029 | n/a | 0.563 | 9.264 | n/a | n/a | 0.026 | 2.784 | 0.164 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000122 | 16.291 | 3.666 | n/a | 0.000 | 0.063 | 3.140 | 3.729 | 0.041 | n/a | 0.391 | 5.225 | n/a | n/a | 0.037 | 3.729 | 0.229 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000012c | 15.232 | 1.566 | n/a | 0.000 | 0.062 | 0.677 | 1.865 | 0.024 | n/a | 0.512 | 10.499 | n/a | n/a | 0.027 | 1.628 | 0.107 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000136 | 15.181 | 3.691 | n/a | 0.000 | 0.086 | 2.072 | 2.015 | 0.021 | n/a | 0.143 | 7.117 | n/a | n/a | 0.037 | 3.777 | 0.249 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000133 | 14.144 | 1.467 | n/a | 0.000 | 0.047 | 1.028 | 3.126 | 0.048 | n/a | 0.613 | 7.791 | n/a | n/a | 0.024 | 1.514 | 0.107 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000012a | 13.717 | 2.271 | n/a | 0.000 | 0.042 | 1.019 | 1.752 | 0.044 | n/a | 0.150 | 8.416 | n/a | n/a | 0.021 | 2.313 | 0.169 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000130 | 13.303 | 2.718 | n/a | 0.000 | 0.665 | 0.589 | 2.097 | 0.064 | n/a | 1.005 | 6.144 | n/a | n/a | 0.020 | 3.383 | 0.254 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000126 | 11.541 | 1.913 | n/a | 0.000 | 0.043 | 0.990 | 2.156 | 0.022 | n/a | 0.483 | 5.917 | n/a | n/a | 0.017 | 1.956 | 0.169 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000011f | 9.749 | 1.747 | n/a | 0.000 | 0.053 | 0.566 | 1.018 | 0.020 | n/a | 0.477 | 5.845 | n/a | n/a | 0.022 | 1.800 | 0.185 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.717 | 0.000 | 0.000 | 0.379 | 1.747 | n/a | 0.000 | 0.047 | 0.990 | 1.865 | 0.024 | n/a | 0.477 | 5.917 | n/a | n/a | 0.022 | 1.800 | 0.169 | 0.022 |
| p99 | 16.291 | 1.617 | 0.014 | 0.792 | 3.666 | n/a | 0.000 | 0.063 | 3.140 | 3.729 | 0.048 | n/a | 0.613 | 10.499 | n/a | n/a | 0.037 | 3.729 | 0.229 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000122 | 16.291 | 3.666 | n/a | 0.000 | 0.063 | 3.140 | 3.729 | 0.041 | n/a | 0.391 | 5.225 | n/a | n/a | 0.037 | 3.729 | 0.229 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000012c | 15.232 | 1.566 | n/a | 0.000 | 0.062 | 0.677 | 1.865 | 0.024 | n/a | 0.512 | 10.499 | n/a | n/a | 0.027 | 1.628 | 0.107 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000133 | 14.144 | 1.467 | n/a | 0.000 | 0.047 | 1.028 | 3.126 | 0.048 | n/a | 0.613 | 7.791 | n/a | n/a | 0.024 | 1.514 | 0.107 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000012a | 13.717 | 2.271 | n/a | 0.000 | 0.042 | 1.019 | 1.752 | 0.044 | n/a | 0.150 | 8.416 | n/a | n/a | 0.021 | 2.313 | 0.169 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000126 | 11.541 | 1.913 | n/a | 0.000 | 0.043 | 0.990 | 2.156 | 0.022 | n/a | 0.483 | 5.917 | n/a | n/a | 0.017 | 1.956 | 0.169 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000011f | 9.749 | 1.747 | n/a | 0.000 | 0.053 | 0.566 | 1.018 | 0.020 | n/a | 0.477 | 5.845 | n/a | n/a | 0.022 | 1.800 | 0.185 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.993 | 0.386 | 0.000 | 0.588 | 2.320 | n/a | 0.000 | 0.066 | 0.862 | 1.471 | 0.034 | n/a | 0.194 | 12.649 | n/a | n/a | 0.027 | 2.376 | 0.141 | 0.027 |
| p99 | 35.002 | 1.998 | 0.000 | 1.198 | 5.196 | n/a | 0.000 | 0.418 | 1.244 | 3.633 | 0.078 | n/a | 1.308 | 25.113 | n/a | n/a | 0.043 | 5.301 | 0.221 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000001af | 35.002 | 5.196 | n/a | 0.000 | 0.105 | 1.244 | 3.633 | 0.034 | n/a | 1.308 | 23.439 | n/a | n/a | 0.043 | 5.301 | 0.151 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000292 | 31.052 | 3.042 | n/a | 0.000 | 0.078 | 0.755 | 1.471 | 0.078 | n/a | 0.483 | 25.113 | n/a | n/a | 0.033 | 3.120 | 0.100 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001b4 | 20.220 | 2.906 | n/a | 0.000 | 0.089 | 1.010 | 1.057 | 0.019 | n/a | 0.132 | 14.971 | n/a | n/a | 0.035 | 2.995 | 0.148 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001b6 | 18.029 | 2.320 | n/a | 0.000 | 0.054 | 0.990 | 1.790 | 0.053 | n/a | 0.148 | 12.649 | n/a | n/a | 0.025 | 2.374 | 0.132 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000290 | 17.993 | 2.283 | n/a | 0.000 | 0.056 | 0.736 | 1.061 | 0.018 | n/a | 0.119 | 13.694 | n/a | n/a | 0.026 | 2.340 | 0.130 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000013c | 16.703 | 1.635 | n/a | 0.000 | 0.066 | 1.177 | 1.247 | 0.027 | n/a | 0.551 | 11.962 | n/a | n/a | 0.037 | 1.702 | 0.102 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000013a | 15.282 | 3.311 | n/a | 0.000 | 0.065 | 0.862 | 1.451 | 0.019 | n/a | 0.087 | 9.461 | n/a | n/a | 0.027 | 3.376 | 0.221 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001b1 | 15.065 | 2.067 | n/a | 0.000 | 0.053 | 0.655 | 1.773 | 0.060 | n/a | 0.194 | 10.239 | n/a | n/a | 0.024 | 2.120 | 0.141 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001ad | 12.892 | 1.958 | n/a | 0.000 | 0.418 | 0.852 | 1.957 | 0.040 | n/a | 0.791 | 6.856 | n/a | n/a | 0.021 | 2.376 | 0.184 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.703 | 0.335 | 0.000 | 0.437 | 1.958 | n/a | 0.000 | 0.066 | 0.852 | 1.061 | 0.019 | n/a | 0.132 | 11.962 | n/a | n/a | 0.026 | 2.340 | 0.130 | 0.026 |
| p99 | 20.220 | 1.001 | 0.000 | 0.739 | 2.906 | n/a | 0.000 | 0.418 | 1.177 | 1.957 | 0.040 | n/a | 0.791 | 14.971 | n/a | n/a | 0.037 | 2.995 | 0.184 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000001b4 | 20.220 | 2.906 | n/a | 0.000 | 0.089 | 1.010 | 1.057 | 0.019 | n/a | 0.132 | 14.971 | n/a | n/a | 0.035 | 2.995 | 0.148 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000290 | 17.993 | 2.283 | n/a | 0.000 | 0.056 | 0.736 | 1.061 | 0.018 | n/a | 0.119 | 13.694 | n/a | n/a | 0.026 | 2.340 | 0.130 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000013c | 16.703 | 1.635 | n/a | 0.000 | 0.066 | 1.177 | 1.247 | 0.027 | n/a | 0.551 | 11.962 | n/a | n/a | 0.037 | 1.702 | 0.102 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001ad | 12.892 | 1.958 | n/a | 0.000 | 0.418 | 0.852 | 1.957 | 0.040 | n/a | 0.791 | 6.856 | n/a | n/a | 0.021 | 2.376 | 0.184 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.448 | 0.387 | 0.000 | 0.523 | 2.709 | n/a | 0.000 | 0.063 | 0.861 | 2.379 | 0.056 | n/a | 0.496 | 11.691 | n/a | n/a | 0.025 | 2.771 | 0.114 | 0.025 |
| p99 | 107.536 | 1.001 | 0.020 | 1.277 | 4.263 | n/a | 0.000 | 0.734 | 2.227 | 24.967 | 0.103 | n/a | 3.898 | 94.448 | n/a | n/a | 0.040 | 4.303 | 0.241 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000143 | 107.536 | 2.994 | n/a | 0.000 | 0.065 | 2.227 | 7.669 | 0.033 | n/a | 0.074 | 94.448 | n/a | n/a | 0.025 | 3.060 | 0.028 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.016ms |
| c825a9b95709c89c0000000000000142 | 92.811 | 3.604 | n/a | 0.000 | 0.060 | 0.861 | 12.294 | 0.072 | n/a | 0.571 | 75.326 | n/a | n/a | 0.023 | 3.664 | 0.039 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms |
| c825a9b95709c89c000000000000015e | 37.880 | 4.263 | n/a | 0.000 | 0.040 | 2.089 | 24.967 | 0.103 | n/a | 0.120 | 6.280 | n/a | n/a | 0.019 | 4.303 | 0.114 | 0.019 | gw-w/thread-47/storage/begin-command! | none observed |
| c825a9b95709c89c0000000000000147 | 25.084 | 2.023 | n/a | 0.000 | 0.069 | 0.930 | 1.384 | 0.021 | n/a | 3.898 | 16.733 | n/a | n/a | 0.027 | 2.092 | 0.083 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.readback 0.032ms |
| c825a9b95709c89c0000000000000151 | 24.366 | 4.125 | n/a | 0.000 | 0.064 | 0.702 | 2.111 | 0.063 | n/a | 1.767 | 15.508 | n/a | n/a | 0.026 | 4.189 | 0.172 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000014c | 22.528 | 1.787 | n/a | 0.000 | 0.071 | 0.792 | 4.525 | 0.063 | n/a | 0.404 | 14.866 | n/a | n/a | 0.019 | 1.858 | 0.082 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| c825a9b95709c89c0000000000000154 | 21.448 | 1.740 | n/a | 0.000 | 0.063 | 0.903 | 3.350 | 0.062 | n/a | 0.702 | 14.600 | n/a | n/a | 0.027 | 1.803 | 0.084 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000014e | 18.195 | 2.849 | n/a | 0.000 | 0.055 | 1.090 | 2.240 | 0.031 | n/a | 0.627 | 11.275 | n/a | n/a | 0.028 | 2.904 | 0.160 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000158 | 17.111 | 2.709 | n/a | 0.000 | 0.062 | 0.810 | 1.391 | 0.022 | n/a | 0.400 | 11.691 | n/a | n/a | 0.026 | 2.771 | 0.162 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000014a | 17.020 | 2.950 | n/a | 0.000 | 0.058 | 1.082 | 2.609 | 0.060 | n/a | 1.062 | 9.177 | n/a | n/a | 0.022 | 3.007 | 0.177 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000156 | 14.174 | 1.574 | n/a | 0.000 | 0.734 | 0.836 | 2.379 | 0.056 | n/a | 0.496 | 8.090 | n/a | n/a | 0.010 | 2.308 | 0.163 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.018ms |
| c825a9b95709c89c000000000000015a | 10.307 | 2.384 | n/a | 0.000 | 0.104 | 0.839 | 1.362 | 0.021 | n/a | 0.289 | 5.269 | n/a | n/a | 0.040 | 2.488 | 0.241 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.448 | 0.000 | 0.000 | 0.410 | 1.787 | n/a | 0.000 | 0.065 | 0.839 | 3.350 | 0.056 | n/a | 0.289 | 8.090 | n/a | n/a | 0.019 | 2.308 | 0.084 | 0.019 |
| p99 | 107.536 | 0.994 | 0.000 | 0.661 | 4.263 | n/a | 0.000 | 0.734 | 2.227 | 24.967 | 0.103 | n/a | 0.702 | 94.448 | n/a | n/a | 0.040 | 4.303 | 0.241 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000143 | 107.536 | 2.994 | n/a | 0.000 | 0.065 | 2.227 | 7.669 | 0.033 | n/a | 0.074 | 94.448 | n/a | n/a | 0.025 | 3.060 | 0.028 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.016ms |
| c825a9b95709c89c000000000000015e | 37.880 | 4.263 | n/a | 0.000 | 0.040 | 2.089 | 24.967 | 0.103 | n/a | 0.120 | 6.280 | n/a | n/a | 0.019 | 4.303 | 0.114 | 0.019 | gw-w/thread-47/storage/begin-command! | none observed |
| c825a9b95709c89c000000000000014c | 22.528 | 1.787 | n/a | 0.000 | 0.071 | 0.792 | 4.525 | 0.063 | n/a | 0.404 | 14.866 | n/a | n/a | 0.019 | 1.858 | 0.082 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| c825a9b95709c89c0000000000000154 | 21.448 | 1.740 | n/a | 0.000 | 0.063 | 0.903 | 3.350 | 0.062 | n/a | 0.702 | 14.600 | n/a | n/a | 0.027 | 1.803 | 0.084 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000156 | 14.174 | 1.574 | n/a | 0.000 | 0.734 | 0.836 | 2.379 | 0.056 | n/a | 0.496 | 8.090 | n/a | n/a | 0.010 | 2.308 | 0.163 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.018ms |
| c825a9b95709c89c000000000000015a | 10.307 | 2.384 | n/a | 0.000 | 0.104 | 0.839 | 1.362 | 0.021 | n/a | 0.289 | 5.269 | n/a | n/a | 0.040 | 2.488 | 0.241 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.004 | 0.543 | 0.000 | 0.652 | 2.819 | n/a | 0.000 | 0.061 | 0.891 | 1.416 | 0.023 | n/a | 0.148 | 10.905 | n/a | n/a | 0.023 | 2.916 | 0.148 | 0.023 |
| p99 | 76.436 | 1.699 | 0.000 | 1.248 | 3.437 | n/a | 0.000 | 0.097 | 1.705 | 9.914 | 0.066 | n/a | 1.412 | 62.175 | n/a | n/a | 0.048 | 3.494 | 0.196 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000001b9 | 76.436 | 2.849 | n/a | 0.000 | 0.096 | 1.152 | 9.914 | 0.066 | n/a | 0.146 | 62.175 | n/a | n/a | 0.038 | 2.945 | 0.039 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001c9 | 27.518 | 3.437 | n/a | 0.000 | 0.057 | 0.904 | 1.354 | 0.023 | n/a | 1.412 | 20.308 | n/a | n/a | 0.023 | 3.494 | 0.127 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001d4 | 23.131 | 2.183 | n/a | 0.000 | 0.051 | 0.838 | 1.074 | 0.019 | n/a | 0.267 | 18.677 | n/a | n/a | 0.023 | 2.234 | 0.097 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001c6 | 21.602 | 3.122 | n/a | 0.000 | 0.085 | 0.693 | 3.761 | 0.023 | n/a | 0.082 | 13.788 | n/a | n/a | 0.048 | 3.207 | 0.148 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms |
| c825a9b95709c89c00000000000001d1 | 18.461 | 2.819 | n/a | 0.000 | 0.097 | 0.891 | 1.416 | 0.019 | n/a | 0.111 | 13.068 | n/a | n/a | 0.038 | 2.916 | 0.158 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001c4 | 17.004 | 2.865 | n/a | 0.000 | 0.059 | 0.859 | 4.283 | 0.021 | n/a | 0.148 | 8.745 | n/a | n/a | 0.023 | 2.924 | 0.172 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001be | 16.316 | 2.845 | n/a | 0.000 | 0.095 | 1.087 | 1.885 | 0.047 | n/a | 0.675 | 9.644 | n/a | n/a | 0.038 | 2.940 | 0.180 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001bc | 15.159 | 2.077 | n/a | 0.000 | 0.069 | 0.930 | 1.294 | 0.021 | n/a | 0.747 | 9.995 | n/a | n/a | 0.026 | 2.146 | 0.142 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001cb | 15.155 | 2.114 | n/a | 0.000 | 0.055 | 0.658 | 1.285 | 0.023 | n/a | 0.091 | 10.905 | n/a | n/a | 0.022 | 2.169 | 0.143 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001c1 | 13.976 | 2.195 | n/a | 0.000 | 0.059 | 1.705 | 1.744 | 0.061 | n/a | 0.132 | 8.060 | n/a | n/a | 0.021 | 2.254 | 0.161 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001cd | 12.744 | 2.437 | n/a | 0.000 | 0.061 | 0.693 | 1.213 | 0.020 | n/a | 0.705 | 7.592 | n/a | n/a | 0.023 | 2.498 | 0.196 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.316 | 0.000 | 0.000 | 0.648 | 2.195 | n/a | 0.000 | 0.069 | 0.930 | 1.416 | 0.023 | n/a | 0.146 | 10.905 | n/a | n/a | 0.026 | 2.254 | 0.143 | 0.026 |
| p99 | 76.436 | 1.003 | 0.000 | 0.769 | 2.849 | n/a | 0.000 | 0.097 | 1.705 | 9.914 | 0.066 | n/a | 0.747 | 62.175 | n/a | n/a | 0.038 | 2.945 | 0.180 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000001b9 | 76.436 | 2.849 | n/a | 0.000 | 0.096 | 1.152 | 9.914 | 0.066 | n/a | 0.146 | 62.175 | n/a | n/a | 0.038 | 2.945 | 0.039 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001d4 | 23.131 | 2.183 | n/a | 0.000 | 0.051 | 0.838 | 1.074 | 0.019 | n/a | 0.267 | 18.677 | n/a | n/a | 0.023 | 2.234 | 0.097 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001d1 | 18.461 | 2.819 | n/a | 0.000 | 0.097 | 0.891 | 1.416 | 0.019 | n/a | 0.111 | 13.068 | n/a | n/a | 0.038 | 2.916 | 0.158 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001be | 16.316 | 2.845 | n/a | 0.000 | 0.095 | 1.087 | 1.885 | 0.047 | n/a | 0.675 | 9.644 | n/a | n/a | 0.038 | 2.940 | 0.180 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001bc | 15.159 | 2.077 | n/a | 0.000 | 0.069 | 0.930 | 1.294 | 0.021 | n/a | 0.747 | 9.995 | n/a | n/a | 0.026 | 2.146 | 0.142 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001cb | 15.155 | 2.114 | n/a | 0.000 | 0.055 | 0.658 | 1.285 | 0.023 | n/a | 0.091 | 10.905 | n/a | n/a | 0.022 | 2.169 | 0.143 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000001c1 | 13.976 | 2.195 | n/a | 0.000 | 0.059 | 1.705 | 1.744 | 0.061 | n/a | 0.132 | 8.060 | n/a | n/a | 0.021 | 2.254 | 0.161 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.575 | 0.000 | 0.000 | 0.427 | 2.516 | n/a | 0.000 | 0.046 | 0.425 | 2.913 | 0.014 | n/a | 0.472 | 14.275 | n/a | n/a | 0.012 | 2.845 | 0.125 | 0.012 |
| p99 | 27.086 | 0.652 | 0.000 | 0.808 | 2.828 | n/a | 0.000 | 1.935 | 0.475 | 3.138 | 0.031 | n/a | 4.624 | 15.699 | n/a | n/a | 0.029 | 3.229 | 0.210 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000001f2 | 27.086 | 1.294 | n/a | 0.000 | 1.935 | 0.353 | 3.138 | 0.031 | n/a | 4.624 | 15.699 | n/a | n/a | 0.012 | 3.229 | 0.119 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| c825a9b95709c89c0000000000000216 | 20.575 | 2.516 | n/a | 0.000 | 0.046 | 0.475 | 2.913 | 0.014 | n/a | 0.307 | 14.275 | n/a | n/a | 0.029 | 2.562 | 0.125 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.048ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.023ms |
| c825a9b95709c89c000000000000025d | 13.548 | 2.828 | n/a | 0.000 | 0.016 | 0.425 | 1.267 | 0.011 | n/a | 0.472 | 8.516 | n/a | n/a | 0.011 | 2.845 | 0.210 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.044ms |

## P2 / grow10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.575 | 0.000 | 0.000 | 0.371 | 1.294 | n/a | 0.000 | 0.046 | 0.353 | 2.913 | 0.014 | n/a | 0.307 | 14.275 | n/a | n/a | 0.012 | 2.562 | 0.119 | 0.012 |
| p99 | 27.086 | 0.652 | 0.000 | 0.427 | 2.516 | n/a | 0.000 | 1.935 | 0.475 | 3.138 | 0.031 | n/a | 4.624 | 15.699 | n/a | n/a | 0.029 | 3.229 | 0.125 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000001f2 | 27.086 | 1.294 | n/a | 0.000 | 1.935 | 0.353 | 3.138 | 0.031 | n/a | 4.624 | 15.699 | n/a | n/a | 0.012 | 3.229 | 0.119 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| c825a9b95709c89c0000000000000216 | 20.575 | 2.516 | n/a | 0.000 | 0.046 | 0.475 | 2.913 | 0.014 | n/a | 0.307 | 14.275 | n/a | n/a | 0.029 | 2.562 | 0.125 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.123ms; driver.publication.readback 0.048ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.023ms |

## P4 / p4h10 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.961 | 0.000 | 0.000 | 0.472 | 2.618 | n/a | 0.000 | 0.054 | 0.794 | 1.280 | 0.028 | n/a | 0.355 | 10.398 | n/a | n/a | 0.024 | 2.659 | 0.142 | 0.024 |
| p99 | 105.798 | 2.005 | 0.000 | 1.106 | 4.875 | n/a | 0.000 | 0.908 | 2.687 | 12.583 | 0.037 | n/a | 0.992 | 99.358 | n/a | n/a | 0.036 | 4.929 | 0.223 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000296 | 105.798 | 1.892 | n/a | 0.000 | 0.051 | 0.661 | 3.441 | 0.017 | n/a | 0.355 | 99.358 | n/a | n/a | 0.024 | 1.942 | 0.018 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms |
| c825a9b95709c89c00000000000002a8 | 22.529 | 4.875 | n/a | 0.000 | 0.054 | 2.687 | 12.583 | 0.037 | n/a | 0.182 | 2.086 | n/a | n/a | 0.024 | 4.929 | 0.219 | 0.024 | gw-w/thread-43/gateway.route | driver.reader-basis.broadcast 0.096ms |
| c825a9b95709c89c00000000000002a0 | 19.946 | 2.618 | n/a | 0.000 | 0.041 | 0.851 | 2.362 | 0.036 | n/a | 0.992 | 13.027 | n/a | n/a | 0.020 | 2.659 | 0.133 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000299 | 18.176 | 1.810 | n/a | 0.000 | 0.054 | 0.714 | 1.014 | 0.028 | n/a | 0.445 | 14.087 | n/a | n/a | 0.024 | 1.864 | 0.103 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000002aa | 17.961 | 3.660 | n/a | 0.000 | 0.055 | 0.964 | 2.670 | 0.029 | n/a | 0.161 | 10.398 | n/a | n/a | 0.023 | 3.716 | 0.207 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms |
| c825a9b95709c89c00000000000002a2 | 15.136 | 1.243 | n/a | 0.000 | 0.908 | 0.451 | 0.943 | 0.018 | n/a | 0.128 | 11.435 | n/a | n/a | 0.010 | 2.151 | 0.142 | 0.010 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.017ms |
| c825a9b95709c89c000000000000029b | 15.072 | 2.632 | n/a | 0.000 | 0.042 | 0.794 | 1.280 | 0.028 | n/a | 0.423 | 9.847 | n/a | n/a | 0.025 | 2.674 | 0.177 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000029e | 13.770 | 1.694 | n/a | 0.000 | 0.062 | 0.593 | 0.968 | 0.017 | n/a | 0.446 | 9.966 | n/a | n/a | 0.024 | 1.756 | 0.128 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000002a5 | 13.488 | 2.916 | n/a | 0.000 | 0.092 | 0.833 | 1.172 | 0.016 | n/a | 0.338 | 8.084 | n/a | n/a | 0.036 | 3.008 | 0.223 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.136 | 0.000 | 0.000 | 0.442 | 1.892 | n/a | 0.000 | 0.054 | 0.714 | 1.172 | 0.018 | n/a | 0.355 | 9.966 | n/a | n/a | 0.024 | 2.151 | 0.142 | 0.024 |
| p99 | 105.798 | 1.012 | 0.000 | 0.499 | 4.875 | n/a | 0.000 | 0.908 | 2.687 | 12.583 | 0.037 | n/a | 0.446 | 99.358 | n/a | n/a | 0.036 | 4.929 | 0.223 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000296 | 105.798 | 1.892 | n/a | 0.000 | 0.051 | 0.661 | 3.441 | 0.017 | n/a | 0.355 | 99.358 | n/a | n/a | 0.024 | 1.942 | 0.018 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms |
| c825a9b95709c89c00000000000002a8 | 22.529 | 4.875 | n/a | 0.000 | 0.054 | 2.687 | 12.583 | 0.037 | n/a | 0.182 | 2.086 | n/a | n/a | 0.024 | 4.929 | 0.219 | 0.024 | gw-w/thread-43/gateway.route | driver.reader-basis.broadcast 0.096ms |
| c825a9b95709c89c0000000000000299 | 18.176 | 1.810 | n/a | 0.000 | 0.054 | 0.714 | 1.014 | 0.028 | n/a | 0.445 | 14.087 | n/a | n/a | 0.024 | 1.864 | 0.103 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000002a2 | 15.136 | 1.243 | n/a | 0.000 | 0.908 | 0.451 | 0.943 | 0.018 | n/a | 0.128 | 11.435 | n/a | n/a | 0.010 | 2.151 | 0.142 | 0.010 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.017ms |
| c825a9b95709c89c000000000000029b | 15.072 | 2.632 | n/a | 0.000 | 0.042 | 0.794 | 1.280 | 0.028 | n/a | 0.423 | 9.847 | n/a | n/a | 0.025 | 2.674 | 0.177 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000029e | 13.770 | 1.694 | n/a | 0.000 | 0.062 | 0.593 | 0.968 | 0.017 | n/a | 0.446 | 9.966 | n/a | n/a | 0.024 | 1.756 | 0.128 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000002a5 | 13.488 | 2.916 | n/a | 0.000 | 0.092 | 0.833 | 1.172 | 0.016 | n/a | 0.338 | 8.084 | n/a | n/a | 0.036 | 3.008 | 0.223 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (127 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.395 | 0.000 | 0.000 | 0.466 | 2.141 | n/a | 0.000 | 0.050 | 0.735 | 1.299 | 0.018 | n/a | 0.167 | 8.308 | n/a | n/a | 0.020 | 2.404 | 0.182 | 0.020 |
| p99 | 62.921 | 2.005 | 0.112 | 2.356 | 6.993 | n/a | 0.000 | 43.284 | 9.007 | 6.810 | 0.069 | n/a | 3.535 | 46.404 | n/a | n/a | 0.042 | 44.648 | 0.772 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000339 | 64.391 | 6.303 | n/a | 0.000 | 0.943 | 6.328 | 2.864 | 0.049 | n/a | 5.784 | 42.093 | n/a | n/a | 0.026 | 7.247 | 0.113 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.079ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.020ms; driver.publication.readback 0.019ms |
| c825a9b95709c89c000000000000034b | 62.921 | 2.942 | n/a | 0.000 | 45.654 | 0.546 | 2.022 | 0.023 | n/a | 0.089 | 11.624 | n/a | n/a | 0.021 | 48.596 | 0.772 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.075ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms |
| c825a9b95709c89c0000000000000342 | 61.767 | 3.154 | n/a | 0.000 | 0.326 | 14.422 | 5.154 | 0.016 | n/a | 0.287 | 38.402 | n/a | n/a | 0.007 | 3.480 | 0.056 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms |
| c825a9b95709c89c000000000000033d | 60.982 | 3.415 | n/a | 0.000 | 0.036 | 0.691 | 1.193 | 0.018 | n/a | 0.122 | 55.487 | n/a | n/a | 0.021 | 3.451 | 0.057 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.readback 0.079ms; driver.publication.readback 0.032ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| c825a9b95709c89c0000000000000338 | 59.722 | 3.471 | n/a | 0.000 | 1.910 | 7.739 | 1.641 | 0.039 | n/a | 0.825 | 44.066 | n/a | n/a | 0.031 | 5.381 | 0.090 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.021ms; driver.publication.readback 0.019ms; driver.publication.persist-deferred 0.006ms |
| c825a9b95709c89c0000000000000354 | 54.935 | 1.365 | n/a | 0.000 | 43.284 | 0.540 | 0.932 | 0.016 | n/a | 0.210 | 8.575 | n/a | n/a | 0.013 | 44.648 | 0.813 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.075ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms; driver.publication.readback 0.055ms; driver.publication.readback 0.037ms |
| c825a9b95709c89c0000000000000315 | 53.750 | 1.607 | n/a | 0.000 | 0.053 | 1.535 | 4.019 | 0.027 | n/a | 0.088 | 46.402 | n/a | n/a | 0.020 | 1.659 | 0.031 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000033e | 52.705 | 2.010 | n/a | 0.000 | 0.060 | 8.015 | 0.786 | 0.017 | n/a | 0.088 | 41.704 | n/a | n/a | 0.025 | 2.071 | 0.039 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.032ms |
| c825a9b95709c89c0000000000000316 | 51.715 | 1.104 | n/a | 0.000 | 0.018 | 3.585 | 0.549 | 0.013 | n/a | 0.031 | 46.404 | n/a | n/a | 0.011 | 1.123 | 0.022 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000318 | 50.152 | 5.960 | n/a | 0.000 | 0.044 | 2.474 | 0.967 | 0.015 | n/a | 0.450 | 40.222 | n/a | n/a | 0.020 | 6.004 | 0.120 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.013ms; driver.publication.persist-deferred 0.003ms |
| c825a9b95709c89c0000000000000319 | 49.131 | 1.894 | n/a | 0.000 | 30.501 | 0.591 | 0.806 | 0.028 | n/a | 0.182 | 15.116 | n/a | n/a | 0.012 | 32.395 | 0.659 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.106ms; driver.publication.readback 0.060ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms |
| c825a9b95709c89c000000000000033c | 48.527 | 1.597 | n/a | 0.000 | 0.018 | 6.025 | 1.745 | 0.057 | n/a | 0.650 | 38.421 | n/a | n/a | 0.014 | 1.615 | 0.033 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.079ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms; driver.publication.readback 0.019ms |
| c825a9b95709c89c0000000000000349 | 48.171 | 2.540 | n/a | 0.000 | 20.322 | 0.792 | 3.915 | 0.054 | n/a | 0.356 | 20.171 | n/a | n/a | 0.022 | 22.862 | 0.475 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms |
| c825a9b95709c89c0000000000000345 | 45.073 | 3.583 | n/a | 0.000 | 7.617 | 3.542 | 5.113 | 0.023 | n/a | 0.678 | 24.504 | n/a | n/a | 0.012 | 11.201 | 0.249 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms |
| c825a9b95709c89c0000000000000353 | 44.946 | 1.914 | n/a | 0.000 | 28.825 | 0.513 | 1.846 | 0.047 | n/a | 0.120 | 11.669 | n/a | n/a | 0.011 | 30.739 | 0.684 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.075ms; driver.publication.readback 0.070ms; driver.publication.readback 0.056ms; driver.publication.readback 0.055ms; driver.publication.readback 0.037ms |
| c825a9b95709c89c0000000000000346 | 44.574 | 2.258 | n/a | 0.000 | 9.902 | 1.431 | 0.993 | 0.020 | n/a | 0.098 | 29.860 | n/a | n/a | 0.012 | 12.161 | 0.273 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms |
| c825a9b95709c89c0000000000000333 | 38.143 | 2.172 | n/a | 0.000 | 0.062 | 0.903 | 1.449 | 0.034 | n/a | 0.172 | 33.323 | n/a | n/a | 0.028 | 2.234 | 0.059 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000033f | 36.738 | 3.093 | n/a | 0.000 | 0.089 | 9.007 | 1.502 | 0.035 | n/a | 0.615 | 22.358 | n/a | n/a | 0.039 | 3.182 | 0.087 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.032ms |
| c825a9b95709c89c00000000000002e2 | 33.674 | 2.230 | n/a | 0.000 | 17.969 | 3.551 | 0.669 | 0.013 | n/a | 0.079 | 9.148 | n/a | n/a | 0.014 | 20.199 | 0.600 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.074ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.041ms; driver.publication.persist-deferred 0.021ms |
| c825a9b95709c89c0000000000000301 | 32.305 | 2.439 | n/a | 0.000 | 19.283 | 0.918 | 1.576 | 0.035 | n/a | 0.516 | 7.516 | n/a | n/a | 0.022 | 21.722 | 0.672 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.120ms; driver.publication.readback 0.099ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.019ms |

## P5 / presweep / commit / 5-10 facts (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.497 | 0.000 | 0.000 | 0.410 | 1.704 | n/a | 0.000 | 0.049 | 0.738 | 1.190 | 0.019 | n/a | 0.144 | 8.551 | n/a | n/a | 0.020 | 2.078 | 0.166 | 0.020 |
| p99 | 59.722 | 2.005 | 0.112 | 0.781 | 6.693 | n/a | 0.000 | 43.284 | 9.007 | 10.990 | 0.070 | n/a | 3.388 | 46.404 | n/a | n/a | 0.042 | 44.648 | 0.813 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000000338 | 59.722 | 3.471 | n/a | 0.000 | 1.910 | 7.739 | 1.641 | 0.039 | n/a | 0.825 | 44.066 | n/a | n/a | 0.031 | 5.381 | 0.090 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.021ms; driver.publication.readback 0.019ms; driver.publication.persist-deferred 0.006ms |
| c825a9b95709c89c0000000000000354 | 54.935 | 1.365 | n/a | 0.000 | 43.284 | 0.540 | 0.932 | 0.016 | n/a | 0.210 | 8.575 | n/a | n/a | 0.013 | 44.648 | 0.813 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.075ms; driver.publication.readback 0.070ms; driver.publication.readback 0.067ms; driver.publication.readback 0.055ms; driver.publication.readback 0.037ms |
| c825a9b95709c89c0000000000000315 | 53.750 | 1.607 | n/a | 0.000 | 0.053 | 1.535 | 4.019 | 0.027 | n/a | 0.088 | 46.402 | n/a | n/a | 0.020 | 1.659 | 0.031 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000033e | 52.705 | 2.010 | n/a | 0.000 | 0.060 | 8.015 | 0.786 | 0.017 | n/a | 0.088 | 41.704 | n/a | n/a | 0.025 | 2.071 | 0.039 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.032ms |
| c825a9b95709c89c0000000000000316 | 51.715 | 1.104 | n/a | 0.000 | 0.018 | 3.585 | 0.549 | 0.013 | n/a | 0.031 | 46.404 | n/a | n/a | 0.011 | 1.123 | 0.022 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c0000000000000319 | 49.131 | 1.894 | n/a | 0.000 | 30.501 | 0.591 | 0.806 | 0.028 | n/a | 0.182 | 15.116 | n/a | n/a | 0.012 | 32.395 | 0.659 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 4.106ms; driver.publication.readback 0.060ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms |
| c825a9b95709c89c000000000000033c | 48.527 | 1.597 | n/a | 0.000 | 0.018 | 6.025 | 1.745 | 0.057 | n/a | 0.650 | 38.421 | n/a | n/a | 0.014 | 1.615 | 0.033 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.079ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.020ms; driver.publication.readback 0.019ms |
| c825a9b95709c89c0000000000000349 | 48.171 | 2.540 | n/a | 0.000 | 20.322 | 0.792 | 3.915 | 0.054 | n/a | 0.356 | 20.171 | n/a | n/a | 0.022 | 22.862 | 0.475 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms |
| c825a9b95709c89c0000000000000333 | 38.143 | 2.172 | n/a | 0.000 | 0.062 | 0.903 | 1.449 | 0.034 | n/a | 0.172 | 33.323 | n/a | n/a | 0.028 | 2.234 | 0.059 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c000000000000033f | 36.738 | 3.093 | n/a | 0.000 | 0.089 | 9.007 | 1.502 | 0.035 | n/a | 0.615 | 22.358 | n/a | n/a | 0.039 | 3.182 | 0.087 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.032ms |
| c825a9b95709c89c00000000000002e2 | 33.674 | 2.230 | n/a | 0.000 | 17.969 | 3.551 | 0.669 | 0.013 | n/a | 0.079 | 9.148 | n/a | n/a | 0.014 | 20.199 | 0.600 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.074ms; driver.publication.readback 0.073ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.041ms; driver.publication.persist-deferred 0.021ms |
| c825a9b95709c89c0000000000000301 | 32.305 | 2.439 | n/a | 0.000 | 19.283 | 0.918 | 1.576 | 0.035 | n/a | 0.516 | 7.516 | n/a | n/a | 0.022 | 21.722 | 0.672 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.120ms; driver.publication.readback 0.099ms; driver.publication.persist-deferred 0.047ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.019ms |
| c825a9b95709c89c0000000000000341 | 31.658 | 2.021 | n/a | 0.000 | 0.111 | 6.459 | 1.806 | 0.040 | n/a | 0.170 | 21.035 | n/a | n/a | 0.015 | 2.132 | 0.067 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.reader-basis.broadcast 0.122ms; driver.publication.readback 0.079ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.034ms |
| c825a9b95709c89c00000000000003c5 | 31.011 | 6.063 | n/a | 0.000 | 0.037 | 8.040 | 10.990 | 0.070 | n/a | 0.279 | 5.514 | n/a | n/a | 0.019 | 6.100 | 0.197 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.107ms; driver.publication.persist-deferred 0.015ms |
| c825a9b95709c89c000000000000034d | 29.998 | 1.611 | n/a | 0.000 | 0.036 | 0.637 | 1.327 | 0.030 | n/a | 2.626 | 23.714 | n/a | n/a | 0.017 | 1.646 | 0.055 | 0.017 | gw-w/thread-60/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.057ms; driver.publication.readback 0.056ms |
| c825a9b95709c89c00000000000002ff | 28.715 | 1.908 | n/a | 0.000 | 0.161 | 0.688 | 1.532 | 0.031 | n/a | 0.157 | 24.227 | n/a | n/a | 0.011 | 2.068 | 0.072 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| c825a9b95709c89c00000000000003a1 | 28.106 | 1.551 | n/a | 0.000 | 0.041 | 0.501 | 1.299 | 0.026 | n/a | 0.093 | 24.579 | n/a | n/a | 0.017 | 1.592 | 0.057 | 0.017 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.017ms |
| c825a9b95709c89c00000000000002e0 | 26.885 | 2.155 | n/a | 0.000 | 0.496 | 2.190 | 0.930 | 0.017 | n/a | 0.065 | 21.021 | n/a | n/a | 0.010 | 2.651 | 0.099 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.041ms; driver.publication.persist-deferred 0.020ms |
| c825a9b95709c89c000000000000034e | 24.357 | 1.078 | n/a | 0.000 | 1.065 | 1.966 | 1.102 | 0.046 | n/a | 0.061 | 19.030 | n/a | n/a | 0.010 | 2.143 | 0.088 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.057ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.015ms |
| c825a9b95709c89c00000000000002b5 | 23.532 | 6.693 | n/a | 0.000 | 0.049 | 2.630 | 2.823 | 0.041 | n/a | 0.151 | 11.122 | n/a | n/a | 0.023 | 6.742 | 0.287 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.679 | 0.000 | 0.000 | 0.313 | 3.003 | n/a | 0.000 | 0.006 | 6.811 | 0.757 | 0.005 | n/a | 0.021 | 26.566 | n/a | n/a | 0.005 | 3.010 | 0.087 | 0.005 |
| p99 | 62.650 | 0.543 | 0.000 | 0.527 | 5.452 | n/a | 1.046 | 0.052 | 8.468 | 3.701 | 0.017 | n/a | 3.189 | 48.966 | n/a | n/a | 0.047 | 6.504 | 0.250 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000003d6 | 62.650 | 4.093 | n/a | 0.000 | 0.005 | 7.168 | 0.386 | 0.005 | n/a | 1.980 | 48.966 | n/a | n/a | 0.047 | 4.098 | 0.065 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.reader-basis.broadcast 0.082ms; driver.publication.readback 0.062ms; driver.publication.readback 0.058ms |
| c825a9b95709c89c00000000000003d7 | 62.095 | 4.987 | n/a | 1.046 | 0.007 | 7.075 | 0.636 | 0.006 | n/a | 0.250 | 48.083 | n/a | n/a | 0.005 | 6.040 | 0.097 | 0.005 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.reader-basis.broadcast 0.082ms; driver.publication.readback 0.062ms; driver.publication.readback 0.058ms |
| c825a9b95709c89c00000000000003d8 | 55.240 | 5.452 | n/a | 1.046 | 0.006 | 5.761 | 0.779 | 0.006 | n/a | 0.021 | 42.165 | n/a | n/a | 0.004 | 6.504 | 0.118 | 0.004 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.publication.readback 0.062ms; driver.publication.readback 0.050ms; driver.publication.readback 0.048ms |
| c825a9b95709c89c00000000000003d2 | 52.596 | 3.003 | n/a | 0.000 | 0.006 | 5.457 | 1.203 | 0.016 | n/a | 3.189 | 39.716 | n/a | n/a | 0.005 | 3.010 | 0.057 | 0.005 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.publication.readback 0.062ms; driver.publication.readback 0.050ms; driver.publication.readback 0.038ms |
| c825a9b95709c89c00000000000003d5 | 45.545 | 3.962 | n/a | 0.000 | 0.005 | 6.811 | 0.693 | 0.004 | n/a | 0.009 | 34.056 | n/a | n/a | 0.005 | 3.967 | 0.087 | 0.005 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.publication.readback 0.050ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.036ms |
| c825a9b95709c89c00000000000003d3 | 41.770 | 3.398 | n/a | 0.000 | 0.006 | 7.287 | 0.757 | 0.005 | n/a | 0.009 | 30.303 | n/a | n/a | 0.005 | 3.404 | 0.081 | 0.005 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.028ms |
| c825a9b95709c89c00000000000003d1 | 37.679 | 2.769 | n/a | 0.000 | 0.007 | 7.810 | 0.505 | 0.005 | n/a | 0.011 | 26.566 | n/a | n/a | 0.006 | 2.776 | 0.074 | 0.006 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.092ms; driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.015ms |
| c825a9b95709c89c00000000000003cf | 33.634 | 2.181 | n/a | 0.000 | 0.042 | 8.468 | 3.701 | 0.005 | n/a | 0.048 | 19.171 | n/a | n/a | 0.018 | 2.223 | 0.066 | 0.018 | gw-w/thread-60/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.028ms |
| c825a9b95709c89c00000000000003d0 | 30.021 | 2.942 | n/a | 0.000 | 0.010 | 7.641 | 0.686 | 0.005 | n/a | 0.012 | 18.716 | n/a | n/a | 0.008 | 2.953 | 0.098 | 0.008 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.028ms |
| c825a9b95709c89c00000000000003d4 | 24.943 | 3.757 | n/a | 0.000 | 0.005 | 5.499 | 0.925 | 0.006 | n/a | 0.020 | 14.727 | n/a | n/a | 0.005 | 3.762 | 0.151 | 0.005 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000003db | 7.770 | 1.751 | n/a | 0.000 | 0.052 | 0.558 | 1.000 | 0.017 | n/a | 0.375 | 3.995 | n/a | n/a | 0.023 | 1.803 | 0.232 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000003d9 | 7.424 | 1.821 | n/a | 0.000 | 0.035 | 0.532 | 1.123 | 0.016 | n/a | 0.380 | 3.496 | n/a | n/a | 0.021 | 1.856 | 0.250 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.424 | 0.000 | 0.000 | 0.411 | 1.751 | n/a | 0.000 | 0.035 | 0.532 | 1.000 | 0.016 | n/a | 0.375 | 3.496 | n/a | n/a | 0.021 | 1.803 | 0.232 | 0.021 |
| p99 | 7.770 | 0.000 | 0.000 | 0.419 | 1.821 | n/a | 0.000 | 0.052 | 0.558 | 1.123 | 0.017 | n/a | 0.380 | 3.995 | n/a | n/a | 0.023 | 1.856 | 0.250 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c00000000000003db | 7.770 | 1.751 | n/a | 0.000 | 0.052 | 0.558 | 1.000 | 0.017 | n/a | 0.375 | 3.995 | n/a | n/a | 0.023 | 1.803 | 0.232 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c825a9b95709c89c00000000000003d9 | 7.424 | 1.821 | n/a | 0.000 | 0.035 | 0.532 | 1.123 | 0.016 | n/a | 0.380 | 3.496 | n/a | n/a | 0.021 | 1.856 | 0.250 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3221 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.360 | 0.391 | 0.000 | 0.503 | 2.116 | n/a | 0.000 | 0.042 | 0.545 | 0.935 | 0.012 | n/a | 0.095 | 5.092 | n/a | n/a | 0.014 | 2.447 | 0.250 | 0.014 |
| p99 | 97.327 | 2.672 | 0.051 | 2.234 | 6.982 | n/a | 0.000 | 31.706 | 6.545 | 5.039 | 0.043 | n/a | 2.741 | 43.022 | n/a | n/a | 0.043 | 37.935 | 0.755 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000001084 | 198.044 | 1.618 | n/a | 0.000 | 179.828 | 0.302 | 0.655 | 0.008 | n/a | 0.047 | 15.577 | n/a | n/a | 0.009 | 181.446 | 0.916 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms |
| c825a9b95709c89c0000000000001c57 | 196.848 | 1.120 | n/a | 0.000 | 189.021 | 2.211 | 0.713 | 0.011 | n/a | 0.065 | 3.699 | n/a | n/a | 0.009 | 190.140 | 0.966 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001c56 | 189.542 | 2.727 | n/a | 0.000 | 178.151 | 0.656 | 1.997 | 0.028 | n/a | 0.097 | 5.874 | n/a | n/a | 0.012 | 180.878 | 0.954 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001083 | 187.513 | 1.442 | n/a | 0.000 | 156.645 | 0.471 | 0.766 | 0.011 | n/a | 0.067 | 28.102 | n/a | n/a | 0.009 | 158.087 | 0.843 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.168ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.066ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms |
| c825a9b95709c89c0000000000001c55 | 180.202 | 1.639 | n/a | 0.000 | 173.281 | 0.377 | 0.923 | 0.015 | n/a | 0.075 | 3.883 | n/a | n/a | 0.010 | 174.920 | 0.971 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001c54 | 178.108 | 1.356 | n/a | 0.000 | 169.683 | 1.551 | 1.254 | 0.029 | n/a | 0.130 | 4.096 | n/a | n/a | 0.009 | 171.039 | 0.960 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001082 | 176.339 | 1.258 | n/a | 0.000 | 118.705 | 0.373 | 0.965 | 0.013 | n/a | 0.062 | 54.949 | n/a | n/a | 0.013 | 119.964 | 0.680 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.066ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms; driver.publication.readback 0.050ms |
| c825a9b95709c89c0000000000001c51 | 176.254 | 3.087 | n/a | 0.000 | 151.859 | 7.629 | 1.700 | 0.027 | n/a | 0.978 | 10.955 | n/a | n/a | 0.020 | 154.946 | 0.879 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.reader-basis.broadcast 1.350ms; driver.reader-basis.broadcast 0.756ms; driver.publication.persist-deferred 0.567ms; driver.publication.readback 0.529ms |
| c825a9b95709c89c0000000000001c53 | 174.336 | 1.842 | n/a | 0.000 | 150.268 | 0.446 | 1.452 | 0.033 | n/a | 0.188 | 20.095 | n/a | n/a | 0.012 | 152.110 | 0.873 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001c50 | 160.956 | 3.080 | n/a | 0.000 | 118.690 | 12.571 | 3.143 | 0.657 | n/a | 0.930 | 21.871 | n/a | n/a | 0.014 | 121.770 | 0.757 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.reader-basis.broadcast 1.350ms; driver.reader-basis.broadcast 0.756ms; driver.publication.persist-deferred 0.567ms; driver.publication.readback 0.199ms |
| c825a9b95709c89c0000000000001089 | 151.195 | 1.223 | n/a | 0.000 | 144.909 | 0.258 | 0.897 | 0.009 | n/a | 0.051 | 3.839 | n/a | n/a | 0.008 | 146.133 | 0.967 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms |
| c825a9b95709c89c000000000000108d | 150.203 | 2.386 | n/a | 0.000 | 142.349 | 0.371 | 1.037 | 0.012 | n/a | 0.316 | 3.724 | n/a | n/a | 0.010 | 144.735 | 0.964 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.publication.readback 0.110ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms |
| c825a9b95709c89c0000000000001c60 | 147.604 | 3.974 | n/a | 0.000 | 136.285 | 0.568 | 1.360 | 0.016 | n/a | 0.083 | 5.306 | n/a | n/a | 0.011 | 140.260 | 0.950 | 0.011 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c000000000000108b | 144.541 | 2.461 | n/a | 0.000 | 130.570 | 0.540 | 1.026 | 0.011 | n/a | 0.502 | 9.420 | n/a | n/a | 0.010 | 133.031 | 0.920 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms; driver.publication.readback 0.062ms |
| c825a9b95709c89c000000000000108c | 144.506 | 1.382 | n/a | 0.000 | 136.941 | 0.428 | 0.817 | 0.014 | n/a | 0.080 | 4.835 | n/a | n/a | 0.010 | 138.323 | 0.957 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.publication.readback 0.110ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms |
| c825a9b95709c89c00000000000013f3 | 128.275 | 4.677 | n/a | 0.000 | 0.061 | 0.618 | 0.979 | 0.012 | n/a | 0.044 | 121.864 | n/a | n/a | 0.021 | 4.738 | 0.037 | 0.021 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.739ms; driver.reader-basis.broadcast 0.267ms |
| c825a9b95709c89c00000000000013f4 | 127.147 | 3.583 | n/a | 0.000 | 1.549 | 1.640 | 0.731 | 0.006 | n/a | 0.021 | 119.605 | n/a | n/a | 0.011 | 5.131 | 0.040 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.739ms; driver.reader-basis.broadcast 0.267ms; driver.publication.persist-deferred 0.014ms |
| c825a9b95709c89c0000000000001081 | 124.388 | 3.816 | n/a | 0.000 | 74.678 | 0.439 | 1.445 | 0.014 | n/a | 0.069 | 43.918 | n/a | n/a | 0.009 | 78.494 | 0.631 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 0.740ms; driver.reader-basis.broadcast 0.188ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.117ms; driver.publication.readback 0.061ms |
| c825a9b95709c89c0000000000001c4f | 123.583 | 1.300 | n/a | 0.000 | 90.944 | 0.577 | 1.617 | 0.019 | n/a | 0.426 | 28.691 | n/a | n/a | 0.010 | 92.244 | 0.746 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.756ms; driver.publication.persist-deferred 0.567ms; driver.publication.readback 0.169ms; driver.publication.readback 0.149ms; driver.publication.readback 0.111ms |
| c825a9b95709c89c0000000000001426 | 123.268 | 4.090 | n/a | 0.000 | 101.438 | 1.974 | 1.445 | 0.009 | n/a | 0.060 | 14.238 | n/a | n/a | 0.014 | 105.528 | 0.856 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.467ms; driver.publication.readback 0.101ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.047ms; driver.publication.readback 0.046ms |

## P2 / tail / commit / 5-10 facts (1950 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.132 | 0.000 | 0.000 | 0.389 | 1.691 | n/a | 0.000 | 0.042 | 0.535 | 0.808 | 0.012 | n/a | 0.094 | 4.593 | n/a | n/a | 0.014 | 1.990 | 0.229 | 0.014 |
| p99 | 91.079 | 2.002 | 0.037 | 0.930 | 4.728 | n/a | 0.000 | 28.000 | 6.066 | 4.621 | 0.039 | n/a | 2.264 | 38.391 | n/a | n/a | 0.046 | 32.721 | 0.766 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c825a9b95709c89c0000000000001c57 | 196.848 | 1.120 | n/a | 0.000 | 189.021 | 2.211 | 0.713 | 0.011 | n/a | 0.065 | 3.699 | n/a | n/a | 0.009 | 190.140 | 0.966 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001083 | 187.513 | 1.442 | n/a | 0.000 | 156.645 | 0.471 | 0.766 | 0.011 | n/a | 0.067 | 28.102 | n/a | n/a | 0.009 | 158.087 | 0.843 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.168ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.066ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms |
| c825a9b95709c89c0000000000001c55 | 180.202 | 1.639 | n/a | 0.000 | 173.281 | 0.377 | 0.923 | 0.015 | n/a | 0.075 | 3.883 | n/a | n/a | 0.010 | 174.920 | 0.971 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001c54 | 178.108 | 1.356 | n/a | 0.000 | 169.683 | 1.551 | 1.254 | 0.029 | n/a | 0.130 | 4.096 | n/a | n/a | 0.009 | 171.039 | 0.960 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001082 | 176.339 | 1.258 | n/a | 0.000 | 118.705 | 0.373 | 0.965 | 0.013 | n/a | 0.062 | 54.949 | n/a | n/a | 0.013 | 119.964 | 0.680 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.066ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms; driver.publication.readback 0.050ms |
| c825a9b95709c89c0000000000001c51 | 176.254 | 3.087 | n/a | 0.000 | 151.859 | 7.629 | 1.700 | 0.027 | n/a | 0.978 | 10.955 | n/a | n/a | 0.020 | 154.946 | 0.879 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.reader-basis.broadcast 1.350ms; driver.reader-basis.broadcast 0.756ms; driver.publication.persist-deferred 0.567ms; driver.publication.readback 0.529ms |
| c825a9b95709c89c0000000000001c53 | 174.336 | 1.842 | n/a | 0.000 | 150.268 | 0.446 | 1.452 | 0.033 | n/a | 0.188 | 20.095 | n/a | n/a | 0.012 | 152.110 | 0.873 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.708ms; driver.expected-state.bind-receipt 1.359ms; driver.reader-basis.broadcast 1.350ms; driver.publication.readback 0.529ms; driver.publication.readback 0.494ms |
| c825a9b95709c89c0000000000001089 | 151.195 | 1.223 | n/a | 0.000 | 144.909 | 0.258 | 0.897 | 0.009 | n/a | 0.051 | 3.839 | n/a | n/a | 0.008 | 146.133 | 0.967 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms |
| c825a9b95709c89c000000000000108c | 144.506 | 1.382 | n/a | 0.000 | 136.941 | 0.428 | 0.817 | 0.014 | n/a | 0.080 | 4.835 | n/a | n/a | 0.010 | 138.323 | 0.957 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.328ms; driver.reader-basis.broadcast 0.168ms; driver.publication.readback 0.110ms; driver.publication.readback 0.092ms; driver.publication.readback 0.066ms |
| c825a9b95709c89c0000000000001c4f | 123.583 | 1.300 | n/a | 0.000 | 90.944 | 0.577 | 1.617 | 0.019 | n/a | 0.426 | 28.691 | n/a | n/a | 0.010 | 92.244 | 0.746 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.756ms; driver.publication.persist-deferred 0.567ms; driver.publication.readback 0.169ms; driver.publication.readback 0.149ms; driver.publication.readback 0.111ms |
| c825a9b95709c89c00000000000004eb | 120.291 | 1.480 | n/a | 0.000 | 1.208 | 0.481 | 0.991 | 0.016 | n/a | 0.334 | 115.770 | n/a | n/a | 0.012 | 2.688 | 0.022 | 0.012 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.267ms; driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.069ms; driver.publication.readback 0.040ms; driver.publication.readback 0.040ms |
| c825a9b95709c89c0000000000000773 | 118.076 | 1.701 | n/a | 0.000 | 0.035 | 0.753 | 12.564 | 0.006 | n/a | 0.017 | 102.987 | n/a | n/a | 0.013 | 1.736 | 0.015 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.118ms; driver.publication.readback 0.050ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms |
| c825a9b95709c89c00000000000004e8 | 111.887 | 2.376 | n/a | 0.000 | 0.064 | 0.582 | 0.915 | 0.013 | n/a | 0.088 | 107.819 | n/a | n/a | 0.029 | 2.440 | 0.022 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.267ms; driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.014ms |
| c825a9b95709c89c000000000000107f | 105.531 | 1.428 | n/a | 0.000 | 75.606 | 0.640 | 1.044 | 0.017 | n/a | 0.085 | 26.701 | n/a | n/a | 0.010 | 77.034 | 0.730 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.187ms; driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.117ms; driver.publication.readback 0.061ms; driver.publication.readback 0.050ms |
| c825a9b95709c89c000000000000107e | 105.171 | 1.850 | n/a | 0.000 | 1.936 | 1.325 | 3.889 | 0.005 | n/a | 0.144 | 96.015 | n/a | n/a | 0.007 | 3.786 | 0.036 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.187ms; driver.reader-basis.broadcast 0.188ms; driver.publication.readback 0.117ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.019ms |
| c825a9b95709c89c0000000000001424 | 102.022 | 2.838 | n/a | 0.000 | 0.051 | 0.295 | 0.576 | 0.011 | n/a | 0.047 | 98.188 | n/a | n/a | 0.016 | 2.889 | 0.028 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.467ms |
| c825a9b95709c89c0000000000000517 | 97.327 | 2.263 | n/a | 0.000 | 89.325 | 0.573 | 0.858 | 0.012 | n/a | 0.101 | 4.176 | n/a | n/a | 0.018 | 91.588 | 0.941 | 0.018 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.553ms; driver.expected-state.bind-receipt 1.064ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.120ms; driver.publication.readback 0.098ms |
| c825a9b95709c89c0000000000000516 | 95.557 | 2.021 | n/a | 0.000 | 78.584 | 0.802 | 1.423 | 3.547 | n/a | 0.279 | 8.881 | n/a | n/a | 0.020 | 80.604 | 0.844 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.553ms; driver.expected-state.bind-receipt 1.064ms; driver.reader-basis.broadcast 0.167ms; driver.publication.readback 0.120ms; driver.publication.readback 0.062ms |
| c825a9b95709c89c0000000000000774 | 94.947 | 2.066 | n/a | 0.000 | 0.039 | 1.808 | 0.671 | 0.008 | n/a | 2.957 | 87.379 | n/a | n/a | 0.018 | 2.105 | 0.022 | 0.018 | gw-w/thread-60/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.118ms; driver.publication.readback 0.050ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.readback 0.038ms |
| c825a9b95709c89c000000000000122d | 91.079 | 1.883 | n/a | 0.000 | 54.011 | 0.483 | 0.784 | 0.011 | n/a | 0.296 | 33.601 | n/a | n/a | 0.009 | 55.894 | 0.614 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.437ms; driver.publication.readback 0.152ms; driver.publication.persist-deferred 0.100ms; driver.publication.readback 0.093ms; driver.publication.readback 0.068ms |

## P1 / warmup / read (1178 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 287.710 | n/a | n/a | n/a | 20.501 | n/a | 0.000 | 287.507 | 0.877 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.474 | 287.709 | 1.000 | 2.474 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6465552581149cb60000000000000d85 | 289.370 | 0.401 | n/a | 0.000 | 288.966 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.367 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000000d93 | 289.036 | 0.017 | n/a | 0.000 | 289.018 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.035 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000000d92 | 289.029 | 0.017 | n/a | 0.000 | 289.010 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.028 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000000d90 | 289.021 | 0.044 | n/a | 0.000 | 288.976 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.020 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000000d91 | 289.020 | 0.019 | n/a | 0.000 | 289.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.019 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000002a7c | 288.889 | 0.719 | n/a | 0.000 | 288.166 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.886 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000002a7d | 288.311 | 0.061 | n/a | 0.000 | 288.248 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.309 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000002e6b | 287.781 | 0.271 | n/a | 0.000 | 287.507 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.778 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000002e6f | 287.732 | 0.015 | n/a | 0.000 | 287.716 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.731 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000002e6e | 287.724 | 0.016 | n/a | 0.000 | 287.708 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.723 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000002e6d | 287.715 | 0.017 | n/a | 0.000 | 287.697 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.714 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000002e6c | 287.710 | 0.029 | n/a | 0.000 | 287.680 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.709 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000002aa5 | 287.078 | 0.049 | n/a | 0.000 | 287.027 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.076 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000002aa6 | 287.023 | 0.023 | n/a | 0.000 | 286.999 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.021 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000002ab3 | 286.693 | 0.057 | n/a | 0.000 | 286.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.691 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000002ab4 | 286.643 | 0.021 | n/a | 0.000 | 286.621 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.641 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000043650 | 280.038 | 0.032 | n/a | 0.000 | 280.004 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.037 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000004364f | 280.005 | 0.034 | n/a | 0.000 | 279.970 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.004 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000004364e | 279.975 | 0.066 | n/a | 0.000 | 279.907 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.974 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e000000000004510a | 279.940 | 0.013 | n/a | 0.000 | 279.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.939 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (396 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 265.540 | n/a | n/a | n/a | 1.875 | n/a | 0.000 | 265.339 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.488 | 265.537 | 1.000 | 0.488 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf00000000000abad7 | 403.120 | 0.135 | n/a | 0.000 | 402.982 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 403.118 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000008784a | 285.616 | 0.187 | n/a | 0.000 | 285.426 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.613 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000068bcf | 272.138 | 0.211 | n/a | 0.000 | 271.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.135 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000006a876 | 265.540 | 0.197 | n/a | 0.000 | 265.339 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 265.537 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000005790d | 4.526 | 1.933 | n/a | 0.000 | 0.000 | 0.402 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.191 | 1.933 | 0.427 | 2.191 | node-14/thread-4/socket.wait-first-byte | none observed |
| 8b9472fe0b1598cf0000000000069257 | 3.073 | 3.070 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.070 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000000692a9 | 2.116 | 2.115 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.115 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000000a8650 | 1.876 | 1.875 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.875 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000008d0d1 | 0.766 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.766 | 0.000 | 0.000 | 0.766 | uncovered | none observed |
| 8b9472fe0b1598cf0000000000096c7d | 0.687 | 0.685 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.685 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000006ff4e | 0.654 | 0.652 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.652 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000088d85 | 0.558 | 0.557 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.557 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000000625c9 | 0.505 | 0.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.501 | 0.993 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000006924d | 0.499 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.499 | 0.000 | 0.000 | 0.499 | uncovered | none observed |
| 8b9472fe0b1598cf00000000000719b4 | 0.488 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 | uncovered | none observed |
| 8b9472fe0b1598cf000000000009315d | 0.471 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.471 | 0.000 | 0.000 | 0.471 | uncovered | none observed |
| 8b9472fe0b1598cf0000000000088cf7 | 0.447 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.447 | 0.000 | 0.000 | 0.447 | uncovered | none observed |
| 8b9472fe0b1598cf00000000000850f3 | 0.438 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.438 | 0.000 | 0.000 | 0.438 | uncovered | none observed |
| 8b9472fe0b1598cf00000000000625f4 | 0.437 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.437 | 0.000 | 0.000 | 0.437 | uncovered | none observed |
| 8b9472fe0b1598cf000000000009ce90 | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |

## P1 / L4 / read (693 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 287.486 | n/a | n/a | n/a | 7.884 | n/a | 0.000 | 287.383 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.101 | 287.485 | 1.000 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5e5031cdbcdaf7e000000000006c474 | 290.918 | 0.263 | n/a | 0.000 | 290.650 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 290.913 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000068119 | 290.901 | 0.118 | n/a | 0.000 | 290.781 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.899 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000c5dcb | 290.774 | 0.021 | n/a | 0.000 | 290.752 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.773 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000c5dca | 290.749 | 0.112 | n/a | 0.000 | 290.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.746 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000c0b28 | 287.612 | 0.177 | n/a | 0.000 | 287.432 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.610 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000064b82 | 287.527 | 0.142 | n/a | 0.000 | 287.383 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.525 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000c0b34 | 287.486 | 0.035 | n/a | 0.000 | 287.450 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.485 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000068e1a | 287.153 | 0.081 | n/a | 0.000 | 287.070 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.150 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000b7592 | 286.777 | 0.087 | n/a | 0.000 | 286.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.776 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000005fe96 | 286.671 | 0.105 | n/a | 0.000 | 286.564 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.669 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000b7591 | 286.671 | 0.141 | n/a | 0.000 | 286.526 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 286.667 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000ba7bf | 286.412 | 0.032 | n/a | 0.000 | 286.379 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.411 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000ba7be | 286.319 | 0.155 | n/a | 0.000 | 286.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.316 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000005cfce | 286.228 | 0.268 | n/a | 0.000 | 285.956 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 286.224 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000064925 | 286.062 | 0.135 | n/a | 0.000 | 285.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.059 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e000000000006214f | 285.551 | 0.120 | n/a | 0.000 | 285.428 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.548 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf00000000000abafc | 281.542 | 0.050 | n/a | 0.000 | 281.491 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.541 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| e5e5031cdbcdaf7e000000000005a08c | 281.506 | 0.382 | n/a | 0.000 | 281.121 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.503 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 8b9472fe0b1598cf00000000000abafb | 281.477 | 0.109 | n/a | 0.000 | 281.366 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.475 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 8b9472fe0b1598cf00000000000e8694 | 278.863 | 0.018 | n/a | 0.000 | 278.844 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.862 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (1040 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 355.524 | n/a | n/a | n/a | 0.153 | n/a | 0.000 | 355.507 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.134 | 355.523 | 1.000 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6465552581149cb600000000000b50b9 | 357.140 | 0.537 | n/a | 0.000 | 356.601 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.138 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000b50b8 | 357.126 | 0.032 | n/a | 0.000 | 357.092 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.124 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000b50b7 | 357.109 | 0.034 | n/a | 0.000 | 357.073 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.107 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000b50b6 | 357.057 | 0.052 | n/a | 0.000 | 357.003 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.055 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000b50b5 | 356.984 | 0.146 | n/a | 0.000 | 356.834 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 356.980 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000119aba | 356.057 | 0.093 | n/a | 0.000 | 355.961 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 356.054 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000b7770 | 355.986 | 0.020 | n/a | 0.000 | 355.965 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.985 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000b776f | 355.946 | 0.098 | n/a | 0.000 | 355.846 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 355.944 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000b779a | 355.537 | 0.014 | n/a | 0.000 | 355.522 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.536 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000b7799 | 355.530 | 0.015 | n/a | 0.000 | 355.515 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.529 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000b7798 | 355.524 | 0.016 | n/a | 0.000 | 355.507 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.523 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000119b01 | 355.233 | 0.014 | n/a | 0.000 | 355.218 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.232 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000119b00 | 355.226 | 0.033 | n/a | 0.000 | 355.192 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.225 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000119aff | 355.159 | 0.023 | n/a | 0.000 | 355.135 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.158 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000119afe | 355.145 | 0.016 | n/a | 0.000 | 355.129 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.144 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf0000000000119afd | 355.135 | 0.023 | n/a | 0.000 | 355.111 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.135 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000012817e | 292.280 | 0.153 | n/a | 0.000 | 292.125 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.278 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000c3715 | 292.249 | 0.024 | n/a | 0.000 | 292.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.248 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000012817f | 292.226 | 0.030 | n/a | 0.000 | 292.195 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.224 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000c5a2c | 292.222 | 0.055 | n/a | 0.000 | 292.166 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.222 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L64 / read (1341 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.162 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 |
| p99 | 361.237 | n/a | n/a | n/a | 20.824 | n/a | 1.200 | 361.216 | 98.813 | 8.120 | 130.813 | n/a | 0.008 | 0.000 | n/a | n/a | 0.415 | 361.235 | 1.000 | 0.415 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6465552581149cb600000000000f8de3 | 364.528 | 0.378 | n/a | 0.000 | 364.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 364.525 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e07 | 362.860 | 0.193 | n/a | 0.000 | 362.665 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 362.858 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e08 | 362.697 | 0.044 | n/a | 0.000 | 362.652 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 362.695 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e09 | 362.666 | 0.019 | n/a | 0.000 | 362.645 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 362.664 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e0a | 362.656 | 0.017 | n/a | 0.000 | 362.637 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 362.655 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb764 | 361.818 | 0.025 | n/a | 0.000 | 361.792 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.816 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb763 | 361.788 | 0.027 | n/a | 0.000 | 361.760 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.787 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb762 | 361.755 | 0.024 | n/a | 0.000 | 361.729 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.754 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb761 | 361.726 | 0.026 | n/a | 0.000 | 361.699 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.725 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb760 | 361.695 | 0.026 | n/a | 0.000 | 361.668 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.694 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb75f | 361.663 | 0.033 | n/a | 0.000 | 361.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.662 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb75e | 361.593 | 0.201 | n/a | 0.000 | 361.388 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 361.589 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e3d | 361.310 | 0.051 | n/a | 0.000 | 361.257 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.307 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e3e | 361.237 | 0.018 | n/a | 0.000 | 361.216 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.235 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e3f | 361.226 | 0.017 | n/a | 0.000 | 361.208 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.225 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e40 | 361.217 | 0.016 | n/a | 0.000 | 361.199 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.215 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e41 | 361.209 | 0.017 | n/a | 0.000 | 361.190 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.207 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb600000000000f8e42 | 361.197 | 0.017 | n/a | 0.000 | 361.178 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.195 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb7be | 361.056 | 0.023 | n/a | 0.000 | 361.032 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.055 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000000fb7bd | 361.030 | 0.024 | n/a | 0.000 | 361.005 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 361.029 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L256 / read (3114 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 255.991 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 255.959 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 255.990 | 1.000 | 0.001 |
| p99 | 367.729 | n/a | n/a | n/a | 1.700 | n/a | 0.000 | 367.714 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.478 | 367.728 | 1.000 | 0.478 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6465552581149cb60000000000143f77 | 370.896 | 0.015 | n/a | 0.000 | 370.880 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.895 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000143f76 | 370.891 | 0.025 | n/a | 0.000 | 370.865 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.890 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000143f75 | 370.876 | 0.022 | n/a | 0.000 | 370.853 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.875 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000143f74 | 370.827 | 0.108 | n/a | 0.000 | 370.716 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 370.824 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f79 | 369.538 | 0.025 | n/a | 0.000 | 369.513 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.538 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f78 | 369.517 | 0.036 | n/a | 0.000 | 369.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.516 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f77 | 369.483 | 0.024 | n/a | 0.000 | 369.458 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.482 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f76 | 369.457 | 0.033 | n/a | 0.000 | 369.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.456 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f75 | 369.422 | 0.024 | n/a | 0.000 | 369.397 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.421 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f74 | 369.394 | 0.025 | n/a | 0.000 | 369.368 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.393 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f73 | 369.366 | 0.032 | n/a | 0.000 | 369.332 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.364 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f72 | 369.328 | 0.041 | n/a | 0.000 | 369.285 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.326 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000145f71 | 369.239 | 0.135 | n/a | 0.000 | 369.100 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 369.235 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000144012 | 369.189 | 0.028 | n/a | 0.000 | 369.160 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.188 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000144011 | 369.179 | 0.024 | n/a | 0.000 | 369.154 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.178 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000144010 | 369.169 | 0.020 | n/a | 0.000 | 369.149 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.168 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000014400f | 369.160 | 0.022 | n/a | 0.000 | 369.137 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.159 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000014400e | 369.153 | 0.026 | n/a | 0.000 | 369.126 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.152 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000014400d | 369.144 | 0.024 | n/a | 0.000 | 369.119 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.143 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000014400c | 369.137 | 0.026 | n/a | 0.000 | 369.110 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.136 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (3329 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 258.306 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 258.271 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 258.306 | 1.000 | 0.001 |
| p99 | 352.654 | n/a | n/a | n/a | 1.808 | n/a | 0.000 | 352.618 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.466 | 352.653 | 1.000 | 0.466 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5e5031cdbcdaf7e0000000000186c0a | 353.837 | 0.022 | n/a | 0.000 | 353.815 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.836 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c09 | 353.817 | 0.022 | n/a | 0.000 | 353.794 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.816 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c08 | 353.791 | 0.021 | n/a | 0.000 | 353.769 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.791 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c07 | 353.769 | 0.021 | n/a | 0.000 | 353.747 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.768 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c06 | 353.746 | 0.021 | n/a | 0.000 | 353.723 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.744 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c05 | 353.721 | 0.021 | n/a | 0.000 | 353.699 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.720 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c04 | 353.697 | 0.021 | n/a | 0.000 | 353.675 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.697 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c03 | 353.674 | 0.022 | n/a | 0.000 | 353.651 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.673 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c02 | 353.647 | 0.022 | n/a | 0.000 | 353.625 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.646 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c01 | 353.622 | 0.023 | n/a | 0.000 | 353.598 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.621 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186c00 | 353.595 | 0.023 | n/a | 0.000 | 353.571 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.594 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186bff | 353.569 | 0.025 | n/a | 0.000 | 353.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.568 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186bfe | 353.539 | 0.044 | n/a | 0.000 | 353.493 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.537 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186bfd | 353.489 | 0.029 | n/a | 0.000 | 353.459 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 353.488 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e0000000000186bfc | 353.409 | 0.139 | n/a | 0.000 | 353.266 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 353.406 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000188097 | 353.241 | 0.153 | n/a | 0.000 | 353.084 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 353.237 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000188098 | 353.198 | 0.028 | n/a | 0.000 | 353.168 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.197 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000188099 | 353.188 | 0.019 | n/a | 0.000 | 353.167 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.186 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000018809a | 353.184 | 0.037 | n/a | 0.000 | 353.146 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.182 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000018809b | 353.165 | 0.017 | n/a | 0.000 | 353.146 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 353.163 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / recovery / read (2673 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 253.984 | n/a | n/a | n/a | 0.016 | n/a | 0.000 | 253.966 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 253.983 | 1.000 | 0.001 |
| p99 | 271.085 | n/a | n/a | n/a | 2.020 | n/a | 0.000 | 271.041 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.494 | 271.083 | 1.000 | 0.494 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5e5031cdbcdaf7e00000000001c33ae | 272.553 | 0.500 | n/a | 0.000 | 272.051 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.551 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c33ad | 272.056 | 0.022 | n/a | 0.000 | 272.032 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.055 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c33ac | 272.029 | 0.024 | n/a | 0.000 | 272.004 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.028 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c33ab | 272.001 | 0.025 | n/a | 0.000 | 271.976 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.001 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c33aa | 271.974 | 0.028 | n/a | 0.000 | 271.945 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.973 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c33a9 | 271.933 | 0.047 | n/a | 0.000 | 271.885 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.932 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c33a8 | 271.860 | 0.157 | n/a | 0.000 | 271.686 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 271.843 | 1.000 | 0.017 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c3441 | 271.589 | 0.014 | n/a | 0.000 | 271.574 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.588 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c3440 | 271.537 | 0.013 | n/a | 0.000 | 271.524 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.537 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c343f | 271.505 | 0.011 | n/a | 0.000 | 271.493 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.504 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c343e | 271.500 | 0.012 | n/a | 0.000 | 271.486 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.499 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c343d | 271.491 | 0.011 | n/a | 0.000 | 271.479 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.490 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c343c | 271.485 | 0.012 | n/a | 0.000 | 271.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.484 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000022e55b | 271.484 | 0.145 | n/a | 0.000 | 271.337 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.481 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c343b | 271.477 | 0.012 | n/a | 0.000 | 271.464 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.476 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c343a | 271.469 | 0.013 | n/a | 0.000 | 271.456 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.469 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c3439 | 271.460 | 0.023 | n/a | 0.000 | 271.436 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.459 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000022e55c | 271.452 | 0.028 | n/a | 0.000 | 271.422 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.450 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c3438 | 271.427 | 0.105 | n/a | 0.000 | 271.320 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.425 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e00000000001c3437 | 271.327 | 0.023 | n/a | 0.000 | 271.302 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.325 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (530 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 1.825 | n/a | n/a | n/a | 1.824 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.056 | 1.824 | 0.999 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf000000000025a2b9 | 4.888 | 3.196 | n/a | 0.000 | 0.000 | 0.734 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.958 | 3.196 | 0.654 | 0.958 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000026e0e9 | 2.834 | 2.831 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.831 | 0.999 | 0.003 | node-14/thread-4/reader.observe | none observed |
| 8b9472fe0b1598cf000000000025a5de | 2.328 | 2.327 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.327 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000297f70 | 2.022 | 2.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.021 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002c1481 | 1.923 | 1.921 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.921 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000271e74 | 1.825 | 1.824 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.824 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002a9966 | 1.772 | 1.771 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.771 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000002b53a6 | 1.751 | 1.750 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.750 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000029e409 | 1.710 | 1.708 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.708 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002b81a8 | 1.587 | 1.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.586 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002beb18 | 1.552 | 1.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.551 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002b0725 | 1.522 | 1.520 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.520 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf0000000000294641 | 1.495 | 1.495 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 1.495 | 1.000 | 0.000 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000026f0d1 | 1.460 | 1.459 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.459 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002af81e | 1.271 | 1.270 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.270 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002a415e | 1.257 | 1.256 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.256 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000029dd9e | 1.129 | 1.128 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.128 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000002bc6c4 | 1.065 | 1.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.063 | 0.997 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000027e4e5 | 1.057 | 1.055 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.055 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002b0efe | 1.013 | 1.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.012 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P4 / p4h1 / read (534 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.007 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 1.018 | n/a | n/a | n/a | 1.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 1.007 | 0.998 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf00000000002dc52d | 17.150 | 8.409 | n/a | 1.150 | 0.000 | 0.859 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.733 | 9.558 | 0.557 | 6.733 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000030532f | 4.510 | 4.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.508 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.043ms |
| 8b9472fe0b1598cf000000000033c70e | 1.705 | 1.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.704 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000318dbc | 1.282 | 1.281 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.281 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002f31e9 | 1.031 | 1.029 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.029 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000033c72d | 1.018 | 1.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 1.007 | 0.989 | 0.011 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000033c76b | 0.845 | 0.844 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.844 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003192b5 | 0.743 | 0.741 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.741 | 0.998 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000035caf1 | 0.647 | 0.646 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.646 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003390cb | 0.637 | 0.636 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.636 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002f2c69 | 0.620 | 0.619 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.619 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000031df4a | 0.615 | 0.614 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.614 | 0.998 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf0000000000331029 | 0.611 | 0.609 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.609 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000002eee1d | 0.594 | 0.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.593 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002ddd0d | 0.570 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.568 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000339767 | 0.570 | 0.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.569 | 0.998 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf0000000000358536 | 0.542 | 0.541 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.541 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002ef4b8 | 0.534 | 0.533 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.533 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000002ddd0e | 0.524 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.511 | 0.976 | 0.013 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000002ddd0a | 0.521 | 0.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.521 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P4 / p4h3 / read (535 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 2.154 | n/a | n/a | n/a | 2.151 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.060 | 2.151 | 0.999 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf000000000035e1c8 | 14.824 | 3.336 | n/a | 0.000 | 0.000 | 0.868 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.620 | 3.336 | 0.225 | 10.620 | node-14/thread-4/socket.wait-first-byte | none observed |
| 8b9472fe0b1598cf0000000000364993 | 3.408 | 3.407 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.407 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000364af7 | 3.041 | 3.041 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 3.041 | 1.000 | 0.000 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000036451c | 2.618 | 2.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.616 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003db272 | 2.419 | 2.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 2.406 | 0.995 | 0.013 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000366b95 | 2.154 | 2.151 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.151 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.075ms |
| 8b9472fe0b1598cf000000000039b70b | 1.709 | 1.708 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.708 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000391ccf | 1.330 | 1.326 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.326 | 0.997 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000003aa5dc | 1.304 | 1.301 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.301 | 0.997 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf0000000000393f66 | 1.259 | 1.256 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.256 | 0.998 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000003d3d9e | 1.137 | 1.136 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.136 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000379ba3 | 1.090 | 1.089 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.089 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000036109a | 1.074 | 1.072 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.072 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003d0431 | 0.976 | 0.975 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.975 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003b446b | 0.966 | 0.964 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.964 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000036aa21 | 0.945 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.945 | 0.000 | 0.000 | 0.945 | uncovered | none observed |
| 8b9472fe0b1598cf00000000003db2b6 | 0.889 | 0.886 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.886 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003bec6c | 0.854 | 0.852 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.852 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003ae36a | 0.840 | 0.838 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.838 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000375cad | 0.777 | 0.775 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.775 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |

## P4 / p4h10 / read (493 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 2.000 | n/a | n/a | n/a | 1.999 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.075 | 1.999 | 0.999 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf00000000003db41e | 8.157 | 2.262 | n/a | 0.000 | 0.000 | 0.449 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.445 | 2.262 | 0.277 | 5.445 | node-14/thread-4/socket.wait-first-byte | none observed |
| 8b9472fe0b1598cf0000000000401c75 | 3.116 | 3.115 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.115 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000421dba | 2.755 | 2.752 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.752 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000004037ca | 2.064 | 2.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.063 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000041168c | 2.000 | 1.999 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.999 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003fcae9 | 1.857 | 1.856 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.856 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003f5d9d | 1.656 | 1.651 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.651 | 0.997 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000044759d | 1.482 | 1.480 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.480 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003dee98 | 1.406 | 1.404 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.404 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf00000000003fcae0 | 1.340 | 1.339 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.339 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf000000000040d1bd | 1.182 | 1.181 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.181 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000426b14 | 0.917 | 0.914 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.914 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000044aa53 | 0.859 | 0.857 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.857 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000421d97 | 0.735 | 0.732 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.732 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003f6060 | 0.733 | 0.732 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.732 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf0000000000426734 | 0.720 | 0.719 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.719 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000442266 | 0.679 | 0.678 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.678 | 0.998 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 8b9472fe0b1598cf000000000044a4a5 | 0.639 | 0.638 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.638 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf0000000000448b35 | 0.594 | 0.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.593 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8b9472fe0b1598cf00000000003fb54f | 0.552 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.552 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P5 / presweep / read (1354 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 56.936 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 15.354 | 0.160 | 0.015 |
| p99 | 264.981 | n/a | n/a | n/a | 64.712 | n/a | 7.906 | 264.252 | 99.668 | 7.795 | 149.778 | n/a | 0.011 | 0.000 | n/a | n/a | 107.030 | 264.283 | 1.000 | 107.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf000000000048a53d | 458.432 | 23.225 | n/a | 0.000 | 23.759 | 186.478 | 1.233 | 223.717 | n/a | 0.009 | 0.000 | n/a | n/a | 0.010 | 46.984 | 0.102 | 0.010 | node-14/thread-4/socket.wait-first-byte | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 12.118ms; reader.observe 11.735ms |
| 8b9472fe0b1598cf000000000048a53b | 457.829 | 32.215 | n/a | 0.000 | 45.330 | 170.063 | 2.792 | 207.410 | n/a | 0.018 | 0.000 | n/a | n/a | 0.002 | 77.545 | 0.169 | 0.002 | node-14/thread-4/socket.wait-first-byte | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 12.118ms; reader.observe 11.735ms |
| 8b9472fe0b1598cf000000000048a53c | 456.169 | 20.664 | n/a | 0.000 | 54.003 | 162.444 | 2.029 | 217.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.002 | 74.667 | 0.164 | 0.002 | gw-r/thread-64/gateway.admission-wait | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 12.118ms; reader.observe 11.735ms |
| 8b9472fe0b1598cf000000000048a538 | 453.005 | 32.250 | n/a | 0.000 | 0.000 | 203.652 | 7.795 | 209.297 | n/a | 0.009 | 0.000 | n/a | n/a | 0.003 | 32.250 | 0.071 | 0.003 | node-14/thread-4/socket.wait-first-byte | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 12.118ms; reader.observe 11.735ms |
| 8b9472fe0b1598cf000000000048a539 | 408.118 | 31.717 | n/a | 1.832 | 0.000 | 159.212 | 1.492 | 213.845 | n/a | 0.015 | 0.000 | n/a | n/a | 0.004 | 33.549 | 0.082 | 0.004 | gw-r/thread-107/gateway.admission-wait | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 12.118ms; reader.observe 11.735ms |
| 8b9472fe0b1598cf000000000048a535 | 399.451 | 24.460 | n/a | 0.000 | 0.000 | 156.492 | 2.851 | 215.624 | n/a | 0.021 | 0.000 | n/a | n/a | 0.003 | 24.460 | 0.061 | 0.003 | gw-r/thread-93/gateway.admission-wait | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 12.118ms; reader.observe 11.735ms |
| 8b9472fe0b1598cf000000000048a52e | 394.621 | 38.896 | n/a | 3.990 | 0.000 | 132.262 | 2.706 | 216.748 | n/a | 0.016 | 0.000 | n/a | n/a | 0.004 | 42.886 | 0.109 | 0.004 | gw-r/thread-116/gateway.admission-wait | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 11.735ms; client.reach-decode-and-cache 3.731ms |
| 8b9472fe0b1598cf000000000048a532 | 376.207 | 28.600 | n/a | 0.000 | 0.000 | 127.738 | 7.302 | 212.549 | n/a | 0.017 | 0.000 | n/a | n/a | 0.002 | 28.600 | 0.076 | 0.002 | gw-r/thread-100/gateway.admission-wait | reader.observe 22.003ms; client.reach-decode-and-cache 16.820ms; client.reach-decode-and-cache 13.058ms; reader.observe 11.735ms; client.reach-decode-and-cache 6.178ms |
| e5e5031cdbcdaf7e0000000000222453 | 334.368 | 40.451 | n/a | 3.811 | 0.000 | 135.914 | 11.140 | 143.020 | n/a | 0.028 | 0.000 | n/a | n/a | 0.004 | 44.262 | 0.132 | 0.004 | node-14/thread-6/socket.wait-first-byte | reader.observe 30.497ms; client.reach-decode-and-cache 22.924ms; client.reach-decode-and-cache 19.554ms; client.reach-decode-and-cache 12.906ms; reader.observe 7.918ms |
| 6465552581149cb60000000000224d8c | 266.293 | 0.169 | n/a | 0.000 | 266.121 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 266.290 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224d8d | 266.281 | 0.026 | n/a | 0.000 | 266.252 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.279 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224dad | 265.012 | 0.148 | n/a | 0.000 | 264.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.010 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224daa | 264.997 | 0.026 | n/a | 0.000 | 264.969 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.995 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224dab | 264.981 | 0.020 | n/a | 0.000 | 264.959 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.979 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224dac | 264.973 | 0.019 | n/a | 0.000 | 264.953 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.971 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224daf | 264.892 | 0.053 | n/a | 0.000 | 264.837 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.890 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224dae | 264.887 | 0.020 | n/a | 0.000 | 264.865 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.885 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000224db0 | 264.865 | 0.019 | n/a | 0.000 | 264.844 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.863 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e000000000022125c | 264.565 | 0.015 | n/a | 0.000 | 264.549 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.564 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| e5e5031cdbcdaf7e000000000022125b | 264.555 | 0.029 | n/a | 0.000 | 264.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.555 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P5 / sweep / read (81 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.735 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 16.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 16.720 | 1.000 | 0.001 |
| p99 | 26.412 | n/a | n/a | n/a | 17.800 | n/a | 1.584 | 26.188 | 2.279 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.312 | 26.403 | 1.000 | 5.312 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6465552581149cb60000000000228142 | 26.412 | 0.226 | n/a | 0.000 | 26.177 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 26.403 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.017ms |
| 6465552581149cb60000000000228143 | 26.224 | 0.035 | n/a | 0.000 | 26.188 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 26.223 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.017ms |
| 6465552581149cb60000000000228144 | 26.222 | 0.091 | n/a | 0.000 | 26.129 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 26.220 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.017ms |
| 6465552581149cb60000000000228145 | 26.162 | 0.014 | n/a | 0.000 | 26.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 26.161 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.017ms |
| 6465552581149cb60000000000228146 | 26.160 | 0.012 | n/a | 0.000 | 26.147 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 26.159 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.017ms |
| 6465552581149cb60000000000228157 | 24.775 | 17.800 | n/a | 1.000 | 0.000 | 0.663 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.312 | 18.800 | 0.759 | 5.312 | node-14/thread-5/reader.execute | none observed |
| 6465552581149cb6000000000022815f | 24.567 | 0.036 | n/a | 0.000 | 24.529 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 24.565 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228164 | 24.553 | 0.011 | n/a | 0.000 | 24.541 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 24.552 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228163 | 24.551 | 0.011 | n/a | 0.000 | 24.539 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 24.550 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228162 | 24.548 | 0.011 | n/a | 0.000 | 24.536 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 24.547 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228161 | 24.544 | 0.011 | n/a | 0.000 | 24.533 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 24.544 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228160 | 24.542 | 0.012 | n/a | 0.000 | 24.529 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 24.540 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8b9472fe0b1598cf000000000048c6c5 | 23.556 | 0.186 | n/a | 0.000 | 23.368 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 23.554 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.012ms |
| 6465552581149cb60000000000228190 | 23.539 | 0.093 | n/a | 0.000 | 23.445 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 23.538 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000022818f | 23.520 | 0.011 | n/a | 0.000 | 23.508 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 23.519 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000022818e | 23.516 | 0.011 | n/a | 0.000 | 23.505 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 23.516 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000022818c | 23.514 | 0.013 | n/a | 0.000 | 23.499 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 23.513 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb6000000000022818d | 23.513 | 0.011 | n/a | 0.000 | 23.501 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 23.512 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228193 | 23.497 | 0.010 | n/a | 0.000 | 23.485 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 23.496 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6465552581149cb60000000000228192 | 23.494 | 0.011 | n/a | 0.000 | 23.482 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 23.493 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / tail / read (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.444 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 31.306 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 31.441 | 1.000 | 0.002 |
| p99 | 43.518 | n/a | n/a | n/a | 0.135 | n/a | 0.000 | 43.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 43.515 | 1.000 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b9472fe0b1598cf000000000048c77e | 43.518 | 0.088 | n/a | 0.000 | 43.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 43.515 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.023ms; replica.apply-delta 0.013ms |
| 6465552581149cb600000000002281a3 | 31.444 | 0.135 | n/a | 0.000 | 31.306 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 31.441 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.020ms; replica.apply-delta 0.014ms |

## P1 / baseline / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.053 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5e5031cdbcdaf7e000000000005a07f | 0.053 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 | uncovered | none observed |
| e5e5031cdbcdaf7e000000000005a080 | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 | uncovered | none observed |
| e5e5031cdbcdaf7e000000000005a083 | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 | uncovered | none observed |
| e5e5031cdbcdaf7e000000000005a081 | 0.005 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.000 | 0.000 | 0.005 | uncovered | none observed |
| e5e5031cdbcdaf7e000000000005a082 | 0.004 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.000 | 0.000 | 0.004 | uncovered | none observed |

## P3 / outside-phases / read (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.395 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 200.633 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 206.907 | n/a | n/a | n/a | 19.613 | n/a | 1.500 | 0.000 | 6.989 | 201.719 | 0.102 | n/a | 1.109 | 0.000 | n/a | n/a | 43.187 | 21.113 | 0.332 | 43.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000006 | 206.907 | 0.000 | n/a | 0.000 | 0.000 | 1.643 | 201.409 | 0.010 | n/a | 0.434 | 0.000 | n/a | n/a | 3.412 | 0.000 | 0.000 | 3.412 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b3300000000000000005 | 203.715 | 0.000 | n/a | 0.000 | 0.000 | 1.564 | 201.719 | 0.014 | n/a | 0.194 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b3300000000000000183 | 203.009 | 0.000 | n/a | 0.000 | 0.000 | 2.097 | 200.747 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-100/journal/page | none observed |
| 6eead0acc776b33000000000000001f0 | 202.545 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 200.479 | 0.010 | n/a | 1.109 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b33000000000000002cf | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 201.069 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-80/journal/page | none observed |
| 6eead0acc776b330000000000000018d | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 201.448 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-110/journal/page | none observed |
| 6eead0acc776b330000000000000018c | 202.064 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 200.955 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-113/journal/page | none observed |
| 6eead0acc776b33000000000000002d6 | 202.010 | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 201.127 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-101/journal/page | none observed |
| 6eead0acc776b3300000000000000188 | 201.992 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 200.964 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-112/journal/page | none observed |
| 6eead0acc776b3300000000000000185 | 201.888 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 201.178 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-103/journal/page | none observed |
| 6eead0acc776b33000000000000001f2 | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 200.662 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-69/journal/page | none observed |
| 6eead0acc776b330000000000000018b | 201.661 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 200.692 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-107/journal/page | none observed |
| 6eead0acc776b33000000000000002d7 | 201.644 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 200.918 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-99/journal/page | none observed |
| 6eead0acc776b3300000000000000187 | 201.609 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 200.736 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b3300000000000000184 | 201.573 | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 200.903 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b330000000000000018e | 201.568 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 200.741 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b33000000000000001eb | 201.509 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.726 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-108/journal/page | none observed |
| 6eead0acc776b33000000000000002cd | 201.505 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.656 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-68/journal/page | none observed |
| 6eead0acc776b330000000000000018a | 201.483 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.727 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-108/journal/page | none observed |
| 6eead0acc776b3300000000000000edb | 201.468 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 200.838 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-111/journal/page | none observed |

## P3 / outside-phases / internal (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 754.906 | n/a | n/a | n/a | 1.877 | n/a | 0.000 | 0.000 | 0.647 | 749.597 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.164 | 1.877 | 0.003 | 0.164 |
| p99 | 1010.191 | n/a | n/a | n/a | 19.582 | n/a | 0.798 | 0.000 | 7.351 | 1003.315 | 1.193 | n/a | 0.326 | 0.000 | n/a | n/a | 5.984 | 20.380 | 0.759 | 5.984 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000017 | 1010.191 | 0.221 | n/a | 0.000 | 0.000 | 7.351 | 1002.096 | 0.033 | n/a | 0.326 | 0.000 | n/a | n/a | 0.164 | 0.221 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| 0a7169d424da8f7b000000000000006a | 1009.675 | 0.197 | n/a | 0.000 | 0.000 | 7.339 | 1000.805 | 0.046 | n/a | 0.082 | 0.000 | n/a | n/a | 1.207 | 0.197 | 0.000 | 1.207 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b0000000000000018 | 1008.387 | 0.209 | n/a | 0.000 | 0.000 | 4.890 | 1001.925 | 0.017 | n/a | 0.198 | 0.000 | n/a | n/a | 1.148 | 0.209 | 0.000 | 1.148 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ef | 1005.228 | 0.115 | n/a | 0.000 | 0.000 | 0.641 | 1003.315 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.094 | 0.115 | 0.000 | 1.094 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b0000000000000019 | 1003.158 | 0.158 | n/a | 0.000 | 0.000 | 0.828 | 1000.885 | 0.014 | n/a | 0.135 | 0.000 | n/a | n/a | 1.138 | 0.158 | 0.000 | 1.138 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b0000000000000216 | 1003.108 | 0.172 | n/a | 0.000 | 0.000 | 0.715 | 1001.062 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 1.126 | 0.172 | 0.000 | 1.126 | gw-r/thread-90/journal/page | none observed |
| 0a7169d424da8f7b00000000000000f0 | 1002.637 | 0.114 | n/a | 0.000 | 0.000 | 0.525 | 1000.840 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.093 | 0.114 | 0.000 | 1.093 | gw-r/thread-69/journal/page | none observed |
| 0a7169d424da8f7b0000000000000218 | 1002.619 | 0.175 | n/a | 0.000 | 0.000 | 0.681 | 1000.560 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 1.168 | 0.175 | 0.000 | 1.168 | gw-r/thread-97/journal/page | none observed |
| 0a7169d424da8f7b00000000000019e9 | 1002.170 | 0.106 | n/a | 0.000 | 0.000 | 0.417 | 1000.535 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 1.083 | 0.106 | 0.000 | 1.083 | gw-r/thread-98/journal/page | none observed |
| 0a7169d424da8f7b0000000000000213 | 760.606 | 2.968 | n/a | 0.000 | 0.000 | 0.518 | 757.021 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.055 | 2.968 | 0.004 | 0.055 | gw-r/thread-85/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ea | 754.906 | 4.539 | n/a | 0.000 | 0.000 | 0.550 | 749.597 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.167 | 4.539 | 0.006 | 0.167 | gw-r/thread-102/journal/page | none observed |
| 0a7169d424da8f7b0000000000000143 | 724.632 | 3.501 | n/a | 0.000 | 0.000 | 1.500 | 719.524 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.063 | 3.501 | 0.005 | 0.063 | gw-r/thread-82/journal/page | none observed |
| 0a7169d424da8f7b0000000000000145 | 608.355 | 2.070 | n/a | 0.000 | 0.000 | 0.499 | 604.526 | 1.193 | n/a | 0.019 | 0.000 | n/a | n/a | 0.048 | 2.070 | 0.003 | 0.048 | gw-r/thread-79/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ed | 443.300 | 1.877 | n/a | 0.000 | 0.000 | 0.577 | 440.693 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.059 | 1.877 | 0.004 | 0.059 | gw-r/thread-98/journal/page | none observed |
| 0a7169d424da8f7b000000000000013d | 421.089 | 5.783 | n/a | 0.308 | 0.000 | 1.012 | 413.889 | 0.002 | n/a | 0.027 | 0.000 | n/a | n/a | 0.067 | 6.091 | 0.014 | 0.067 | gw-r/thread-98/journal/page | none observed |
| 0a7169d424da8f7b0000000000000214 | 311.067 | 2.621 | n/a | 0.000 | 0.000 | 0.558 | 307.785 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.052 | 2.621 | 0.008 | 0.052 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b000000000000013f | 293.451 | 6.338 | n/a | 0.000 | 0.000 | 0.647 | 286.333 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.099 | 6.338 | 0.022 | 0.099 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b0000000000000141 | 114.751 | 2.129 | n/a | 0.000 | 0.000 | 0.864 | 111.687 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.060 | 2.129 | 0.019 | 0.060 | gw-r/thread-75/journal/page | none observed |
| 0a7169d424da8f7b000000000000013c | 62.765 | 2.114 | n/a | 0.000 | 0.000 | 0.699 | 59.845 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.052 | 2.114 | 0.034 | 0.052 | gw-r/thread-112/journal/page | none observed |
| 0a7169d424da8f7b00000000000019e3 | 26.850 | 19.582 | n/a | 0.798 | 0.000 | 0.486 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.984 | 20.380 | 0.759 | 5.984 | node-14/thread-2/replica.publish | none observed |

## P3 / warmup / internal (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 895.402 | n/a | n/a | n/a | 1.702 | n/a | 0.000 | 0.000 | 1.113 | 881.635 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.382 | 1.702 | 0.005 | 0.382 |
| p99 | 1011.319 | n/a | n/a | n/a | 34.580 | n/a | 4.511 | 0.000 | 5.840 | 1001.679 | 0.060 | n/a | 0.205 | 0.000 | n/a | n/a | 3.738 | 35.206 | 0.071 | 3.738 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000026 | 1011.319 | 0.180 | n/a | 0.000 | 0.000 | 5.840 | 1001.314 | 0.060 | n/a | 0.187 | 0.000 | n/a | n/a | 3.738 | 0.180 | 0.000 | 3.738 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b000000000000001e | 1011.203 | 4.700 | n/a | 0.000 | 0.000 | 4.327 | 1001.679 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.382 | 4.700 | 0.005 | 0.382 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b000000000000001c | 1006.488 | 0.220 | n/a | 0.000 | 0.000 | 4.135 | 1000.840 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 1.157 | 0.220 | 0.000 | 1.157 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b0000000000000020 | 1005.206 | 0.163 | n/a | 0.000 | 0.000 | 2.375 | 1001.336 | 0.020 | n/a | 0.205 | 0.000 | n/a | n/a | 1.107 | 0.163 | 0.000 | 1.107 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b000000000000002a | 1003.973 | 0.122 | n/a | 0.000 | 0.000 | 1.113 | 1001.115 | 0.023 | n/a | 0.166 | 0.000 | n/a | n/a | 1.436 | 0.122 | 0.000 | 1.436 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000002c | 1003.430 | 0.126 | n/a | 0.000 | 0.000 | 0.853 | 1001.188 | 0.031 | n/a | 0.132 | 0.000 | n/a | n/a | 1.101 | 0.126 | 0.000 | 1.101 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b0000000000000027 | 895.402 | 8.090 | n/a | 4.511 | 0.000 | 0.917 | 881.635 | 0.023 | n/a | 0.086 | 0.000 | n/a | n/a | 0.139 | 12.601 | 0.014 | 0.139 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b000000000000001a | 493.733 | 34.580 | n/a | 0.626 | 0.000 | 4.638 | 453.197 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.593 | 35.206 | 0.071 | 0.593 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000028 | 419.294 | 2.849 | n/a | 0.000 | 0.000 | 0.803 | 415.472 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.072 | 2.849 | 0.007 | 0.072 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b0000000000000024 | 301.586 | 3.904 | n/a | 0.000 | 0.000 | 3.708 | 293.626 | 0.011 | n/a | 0.145 | 0.000 | n/a | n/a | 0.192 | 3.904 | 0.013 | 0.192 | gw-r/thread-65/journal/page | none observed |
| 0a7169d424da8f7b000000000000001d | 184.322 | 2.398 | n/a | 0.000 | 0.000 | 0.715 | 181.002 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.112 | 2.398 | 0.013 | 0.112 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b0000000000000022 | 178.664 | 1.702 | n/a | 0.000 | 0.000 | 0.600 | 176.196 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.088 | 1.702 | 0.010 | 0.088 | gw-r/thread-43/journal/page | none observed |

## P3 / baseline / internal (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 656.098 | n/a | n/a | n/a | 1.866 | n/a | 0.000 | 0.000 | 0.856 | 653.515 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.100 | 1.866 | 0.003 | 0.100 |
| p99 | 1004.338 | n/a | n/a | n/a | 5.839 | n/a | 0.000 | 0.000 | 2.202 | 1001.975 | 0.039 | n/a | 3.911 | 0.000 | n/a | n/a | 1.162 | 5.839 | 0.016 | 1.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000038 | 1004.338 | 0.142 | n/a | 0.000 | 0.000 | 0.871 | 1001.975 | 0.039 | n/a | 0.212 | 0.000 | n/a | n/a | 1.100 | 0.142 | 0.000 | 1.100 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b000000000000003d | 1003.844 | 0.121 | n/a | 0.000 | 0.000 | 0.548 | 998.144 | 0.023 | n/a | 3.911 | 0.000 | n/a | n/a | 1.097 | 0.121 | 0.000 | 1.097 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b000000000000003e | 1003.275 | 0.146 | n/a | 0.000 | 0.000 | 0.601 | 1001.256 | 0.014 | n/a | 0.150 | 0.000 | n/a | n/a | 1.108 | 0.146 | 0.000 | 1.108 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b0000000000000030 | 1003.112 | 0.182 | n/a | 0.000 | 0.000 | 0.856 | 1000.776 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 1.162 | 0.182 | 0.000 | 1.162 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b0000000000000036 | 957.900 | 2.282 | n/a | 0.000 | 0.000 | 1.071 | 954.362 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.074 | 2.282 | 0.002 | 0.074 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b0000000000000033 | 656.098 | 1.870 | n/a | 0.000 | 0.000 | 0.480 | 653.515 | 0.020 | n/a | 0.129 | 0.000 | n/a | n/a | 0.084 | 1.870 | 0.003 | 0.084 | gw-r/thread-65/journal/page | none observed |
| 0a7169d424da8f7b000000000000002d | 493.135 | 2.091 | n/a | 0.000 | 0.000 | 0.727 | 490.061 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.147 | 2.091 | 0.004 | 0.147 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000032 | 366.127 | 5.839 | n/a | 0.000 | 0.000 | 1.428 | 358.669 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.100 | 5.839 | 0.016 | 0.100 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b000000000000003b | 283.906 | 1.830 | n/a | 0.000 | 0.000 | 2.202 | 279.692 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.083 | 1.830 | 0.006 | 0.083 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b0000000000000039 | 263.840 | 2.283 | n/a | 0.000 | 0.000 | 0.828 | 260.542 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.073 | 2.283 | 0.009 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b000000000000002e | 248.265 | 1.866 | n/a | 0.000 | 0.000 | 1.793 | 244.453 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.075 | 1.866 | 0.008 | 0.075 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1002.729 | n/a | n/a | n/a | 0.158 | n/a | 0.000 | 0.000 | 0.694 | 1000.706 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 1.095 | 0.158 | 0.000 | 1.095 |
| p99 | 1019.607 | n/a | n/a | n/a | 8.386 | n/a | 1.133 | 0.000 | 1.652 | 1016.740 | 0.230 | n/a | 0.137 | 0.000 | n/a | n/a | 1.165 | 9.520 | 0.020 | 1.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000049 | 1019.607 | 0.158 | n/a | 0.000 | 0.000 | 1.452 | 1016.740 | 0.033 | n/a | 0.102 | 0.000 | n/a | n/a | 1.122 | 0.158 | 0.000 | 1.122 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b000000000000004a | 1008.942 | 0.129 | n/a | 0.000 | 0.000 | 0.500 | 1007.056 | 0.023 | n/a | 0.137 | 0.000 | n/a | n/a | 1.096 | 0.129 | 0.000 | 1.096 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b0000000000000045 | 1004.243 | 0.125 | n/a | 0.000 | 0.000 | 0.534 | 1002.404 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 1.095 | 0.125 | 0.000 | 1.095 | gw-r/thread-65/journal/page | none observed |
| 0a7169d424da8f7b0000000000000048 | 1004.239 | 0.254 | n/a | 0.000 | 0.000 | 1.226 | 1001.424 | 0.078 | n/a | 0.092 | 0.000 | n/a | n/a | 1.165 | 0.254 | 0.000 | 1.165 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000043 | 1003.515 | 0.147 | n/a | 0.000 | 0.000 | 1.031 | 1001.095 | 0.011 | n/a | 0.129 | 0.000 | n/a | n/a | 1.100 | 0.147 | 0.000 | 1.100 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000003f | 1002.729 | 0.116 | n/a | 0.000 | 0.000 | 0.511 | 1000.706 | 0.230 | n/a | 0.065 | 0.000 | n/a | n/a | 1.102 | 0.116 | 0.000 | 1.102 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b0000000000000046 | 654.847 | 8.386 | n/a | 1.133 | 0.000 | 0.579 | 644.529 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.131 | 9.520 | 0.015 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 0a7169d424da8f7b0000000000000040 | 466.602 | 4.777 | n/a | 0.000 | 0.000 | 0.694 | 460.987 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.080 | 4.777 | 0.010 | 0.080 | gw-r/thread-65/journal/page | none observed |
| 0a7169d424da8f7b0000000000000041 | 439.499 | 8.259 | n/a | 0.335 | 0.000 | 0.867 | 429.822 | 0.017 | n/a | 0.072 | 0.000 | n/a | n/a | 0.126 | 8.594 | 0.020 | 0.126 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b000000000000004b | 386.869 | 5.313 | n/a | 0.772 | 0.000 | 1.652 | 378.919 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.100 | 6.085 | 0.016 | 0.100 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 368.226 | n/a | n/a | n/a | 2.948 | n/a | 0.288 | 0.000 | 0.985 | 357.756 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.101 | 3.207 | 0.014 | 0.101 |
| p99 | 1007.741 | n/a | n/a | n/a | 16.712 | n/a | 2.453 | 0.000 | 7.736 | 1004.547 | 0.033 | n/a | 0.133 | 0.000 | n/a | n/a | 36.892 | 19.165 | 0.082 | 36.892 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000064 | 1007.741 | 0.122 | n/a | 0.000 | 0.000 | 1.086 | 1004.547 | 0.025 | n/a | 0.133 | 0.000 | n/a | n/a | 1.828 | 0.122 | 0.000 | 1.828 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b000000000000004f | 1007.552 | 0.184 | n/a | 0.000 | 0.000 | 2.998 | 1003.138 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 1.138 | 0.184 | 0.000 | 1.138 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b0000000000000066 | 1002.777 | 0.117 | n/a | 0.000 | 0.000 | 0.641 | 1000.838 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 1.092 | 0.117 | 0.000 | 1.092 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b0000000000000068 | 835.894 | 2.384 | n/a | 0.225 | 0.000 | 5.149 | 827.976 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.073 | 2.610 | 0.003 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b0000000000000062 | 679.612 | 5.349 | n/a | 0.517 | 0.000 | 0.620 | 672.941 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.101 | 5.867 | 0.009 | 0.101 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b0000000000000054 | 656.859 | 2.155 | n/a | 0.000 | 0.000 | 0.604 | 653.981 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.075 | 2.155 | 0.003 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b0000000000000052 | 575.318 | 16.712 | n/a | 2.453 | 0.000 | 1.036 | 554.905 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.132 | 19.165 | 0.033 | 0.132 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b0000000000000065 | 368.927 | 4.506 | n/a | 1.642 | 0.000 | 1.080 | 361.549 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.084 | 6.148 | 0.017 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b0000000000000058 | 368.226 | 7.906 | n/a | 0.841 | 0.000 | 1.514 | 357.756 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.112 | 8.747 | 0.024 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000005a | 295.187 | 3.777 | n/a | 0.313 | 0.000 | 0.658 | 290.210 | 0.033 | n/a | 0.117 | 0.000 | n/a | n/a | 0.078 | 4.090 | 0.014 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b000000000000004d | 284.354 | 4.795 | n/a | 0.550 | 0.000 | 2.172 | 276.680 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.079 | 5.345 | 0.019 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b0000000000000055 | 274.741 | 4.380 | n/a | 0.312 | 0.000 | 0.985 | 268.903 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.087 | 4.692 | 0.017 | 0.087 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b000000000000005c | 248.687 | 2.948 | n/a | 0.258 | 0.000 | 7.736 | 237.553 | 0.020 | n/a | 0.095 | 0.000 | n/a | n/a | 0.076 | 3.207 | 0.013 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 0a7169d424da8f7b0000000000000050 | 201.697 | 5.598 | n/a | 1.667 | 0.000 | 0.971 | 193.237 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.164 | 7.266 | 0.036 | 0.164 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b0000000000000060 | 39.231 | 1.796 | n/a | 0.260 | 0.000 | 0.283 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.892 | 2.056 | 0.052 | 36.892 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000005e | 37.753 | 2.798 | n/a | 0.288 | 0.000 | 0.266 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.401 | 3.086 | 0.082 | 34.401 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 510.038 | n/a | n/a | n/a | 2.242 | n/a | 0.000 | 0.000 | 1.103 | 505.318 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.136 | 2.242 | 0.008 | 0.136 |
| p99 | 1008.933 | n/a | n/a | n/a | 9.887 | n/a | 2.247 | 0.000 | 5.992 | 1002.268 | 0.026 | n/a | 0.152 | 0.000 | n/a | n/a | 3.920 | 10.679 | 0.345 | 3.920 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b000000000000007d | 1008.933 | 0.114 | n/a | 0.000 | 0.000 | 5.992 | 1001.619 | 0.011 | n/a | 0.100 | 0.000 | n/a | n/a | 1.097 | 0.114 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000007f | 1006.279 | 0.160 | n/a | 0.000 | 0.000 | 0.775 | 1002.268 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 3.035 | 0.160 | 0.000 | 3.035 | gw-r/thread-43/journal/page | none observed |
| 0a7169d424da8f7b0000000000000070 | 1006.169 | 0.187 | n/a | 0.000 | 0.000 | 1.505 | 1001.600 | 0.026 | n/a | 0.152 | 0.000 | n/a | n/a | 2.700 | 0.187 | 0.000 | 2.700 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b0000000000000074 | 1006.080 | 0.129 | n/a | 0.000 | 0.000 | 3.307 | 1001.387 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 1.095 | 0.129 | 0.000 | 1.095 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000077 | 1003.003 | 0.118 | n/a | 0.000 | 0.000 | 0.495 | 1000.776 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 1.500 | 0.118 | 0.000 | 1.500 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b0000000000000072 | 869.813 | 4.290 | n/a | 2.247 | 0.000 | 2.904 | 860.161 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.125 | 6.537 | 0.008 | 0.125 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b000000000000006b | 510.038 | 3.632 | n/a | 0.251 | 0.000 | 0.676 | 505.318 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.090 | 3.883 | 0.008 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b000000000000006c | 468.769 | 9.887 | n/a | 0.792 | 0.000 | 2.811 | 455.102 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.136 | 10.679 | 0.023 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b0000000000000078 | 392.878 | 7.435 | n/a | 0.863 | 0.000 | 0.792 | 383.599 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.111 | 8.298 | 0.021 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000075 | 231.733 | 2.242 | n/a | 0.000 | 0.000 | 1.103 | 228.199 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.066 | 2.242 | 0.010 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 0a7169d424da8f7b000000000000007a | 221.350 | 2.947 | n/a | 0.381 | 0.000 | 0.471 | 217.379 | 0.018 | n/a | 0.092 | 0.000 | n/a | n/a | 0.063 | 3.328 | 0.015 | 0.063 | gw-r/thread-42/journal/page | none observed |
| 0a7169d424da8f7b000000000000007c | 69.136 | 3.054 | n/a | 0.000 | 0.000 | 3.761 | 62.156 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.066 | 3.054 | 0.044 | 0.066 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b000000000000006e | 6.401 | 2.205 | n/a | 0.000 | 0.000 | 0.275 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.920 | 2.205 | 0.345 | 3.920 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 532.313 | n/a | n/a | n/a | 1.910 | n/a | 0.000 | 0.000 | 1.073 | 519.794 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 1.101 | 2.229 | 0.005 | 1.101 |
| p99 | 1026.642 | n/a | n/a | n/a | 11.478 | n/a | 3.444 | 0.000 | 23.690 | 1003.629 | 0.060 | n/a | 0.778 | 0.000 | n/a | n/a | 40.212 | 11.478 | 0.229 | 40.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b000000000000008a | 1026.642 | 0.211 | n/a | 0.000 | 0.000 | 23.690 | 1001.390 | 0.019 | n/a | 0.188 | 0.000 | n/a | n/a | 1.144 | 0.211 | 0.000 | 1.144 | gw-r/thread-69/journal/page | none observed |
| 0a7169d424da8f7b0000000000000087 | 1006.860 | 0.180 | n/a | 0.000 | 0.000 | 0.413 | 1003.629 | 0.060 | n/a | 0.092 | 0.000 | n/a | n/a | 2.486 | 0.180 | 0.000 | 2.486 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b0000000000000092 | 1004.758 | 0.174 | n/a | 0.000 | 0.000 | 1.073 | 1001.489 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 1.940 | 0.174 | 0.000 | 1.940 | gw-r/thread-86/journal/page | none observed |
| 0a7169d424da8f7b000000000000008b | 1004.639 | 0.190 | n/a | 0.000 | 0.000 | 1.353 | 1001.161 | 0.014 | n/a | 0.778 | 0.000 | n/a | n/a | 1.143 | 0.190 | 0.000 | 1.143 | gw-r/thread-70/journal/page | none observed |
| 0a7169d424da8f7b0000000000000086 | 1003.888 | 0.134 | n/a | 0.000 | 0.000 | 1.415 | 1001.119 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 1.101 | 0.134 | 0.000 | 1.101 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000008d | 882.143 | 5.700 | n/a | 2.803 | 0.000 | 9.243 | 864.200 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.077 | 8.503 | 0.010 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b0000000000000084 | 532.313 | 6.163 | n/a | 3.444 | 0.000 | 2.691 | 519.794 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.110 | 9.608 | 0.018 | 0.110 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b0000000000000088 | 511.578 | 4.896 | n/a | 0.000 | 0.000 | 5.718 | 500.805 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.086 | 4.896 | 0.010 | 0.086 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b000000000000008c | 487.046 | 2.343 | n/a | 0.000 | 0.000 | 0.828 | 483.746 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.069 | 2.343 | 0.005 | 0.069 | gw-r/thread-72/journal/page | none observed |
| 0a7169d424da8f7b0000000000000080 | 115.160 | 1.910 | n/a | 0.319 | 0.000 | 0.719 | 112.047 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.083 | 2.229 | 0.019 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000090 | 50.039 | 11.478 | n/a | 0.000 | 0.000 | 0.246 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.315 | 11.478 | 0.229 | 38.315 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000082 | 42.766 | 2.284 | n/a | 0.000 | 0.000 | 0.270 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.212 | 2.284 | 0.053 | 40.212 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L256 / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 693.415 | n/a | n/a | n/a | 2.184 | n/a | 0.000 | 0.000 | 0.970 | 689.622 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.080 | 2.815 | 0.005 | 0.080 |
| p99 | 1008.273 | n/a | n/a | n/a | 11.544 | n/a | 4.382 | 0.000 | 5.575 | 1005.924 | 0.037 | n/a | 0.089 | 0.000 | n/a | n/a | 1.133 | 15.927 | 0.075 | 1.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b00000000000000a3 | 1008.273 | 0.146 | n/a | 0.000 | 0.000 | 0.970 | 1005.924 | 0.037 | n/a | 0.088 | 0.000 | n/a | n/a | 1.109 | 0.146 | 0.000 | 1.109 | gw-r/thread-84/journal/page | none observed |
| 0a7169d424da8f7b000000000000009c | 1006.459 | 0.179 | n/a | 0.000 | 0.000 | 3.842 | 1001.223 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 1.133 | 0.179 | 0.000 | 1.133 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b0000000000000094 | 1006.152 | 0.110 | n/a | 0.000 | 0.000 | 1.568 | 1003.299 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 1.104 | 0.110 | 0.000 | 1.104 | gw-r/thread-100/journal/page | none observed |
| 0a7169d424da8f7b0000000000000096 | 882.088 | 11.544 | n/a | 4.382 | 0.000 | 3.663 | 862.267 | 0.017 | n/a | 0.060 | 0.000 | n/a | n/a | 0.155 | 15.927 | 0.018 | 0.155 | gw-r/thread-104/journal/page | none observed |
| 0a7169d424da8f7b0000000000000099 | 876.731 | 1.583 | n/a | 0.000 | 0.000 | 0.556 | 874.473 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 1.583 | 0.002 | 0.063 | gw-r/thread-109/journal/page | none observed |
| 0a7169d424da8f7b00000000000000a8 | 873.104 | 2.109 | n/a | 0.000 | 0.000 | 0.759 | 870.089 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.096 | 2.109 | 0.002 | 0.096 | gw-r/thread-97/journal/page | none observed |
| 0a7169d424da8f7b0000000000000098 | 693.415 | 2.815 | n/a | 0.000 | 0.000 | 0.858 | 689.622 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.080 | 2.815 | 0.004 | 0.080 | gw-r/thread-107/journal/page | none observed |
| 0a7169d424da8f7b000000000000009d | 481.734 | 4.849 | n/a | 0.000 | 0.000 | 0.732 | 475.999 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.079 | 4.849 | 0.010 | 0.079 | gw-r/thread-82/journal/page | none observed |
| 0a7169d424da8f7b000000000000009f | 442.652 | 2.078 | n/a | 0.000 | 0.000 | 3.079 | 437.388 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.060 | 2.078 | 0.005 | 0.060 | gw-r/thread-70/journal/page | none observed |
| 0a7169d424da8f7b0000000000000093 | 376.130 | 2.184 | n/a | 2.042 | 0.000 | 5.575 | 366.215 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.066 | 4.226 | 0.011 | 0.066 | gw-r/thread-74/journal/page | none observed |
| 0a7169d424da8f7b00000000000000a6 | 346.717 | 4.323 | n/a | 0.000 | 0.000 | 5.513 | 336.720 | 0.006 | n/a | 0.089 | 0.000 | n/a | n/a | 0.066 | 4.323 | 0.012 | 0.066 | gw-r/thread-89/journal/page | none observed |
| 0a7169d424da8f7b00000000000000a1 | 184.598 | 6.097 | n/a | 0.000 | 0.000 | 0.399 | 177.867 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.181 | 6.097 | 0.033 | 0.181 | gw-r/thread-83/journal/page | none observed |
| 0a7169d424da8f7b00000000000000a4 | 97.390 | 6.093 | n/a | 1.185 | 0.000 | 0.781 | 89.223 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.069 | 7.278 | 0.075 | 0.069 | gw-r/thread-63/journal/page | none observed |

## P3 / L1024 / internal (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.324 | n/a | n/a | n/a | 1.975 | n/a | 0.000 | 0.000 | 0.965 | 412.973 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.090 | 1.975 | 0.007 | 0.090 |
| p99 | 1007.922 | n/a | n/a | n/a | 9.478 | n/a | 2.857 | 0.000 | 6.204 | 1004.635 | 0.016 | n/a | 0.072 | 0.000 | n/a | n/a | 16.398 | 12.183 | 0.422 | 16.398 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b00000000000000ab | 1007.922 | 0.230 | n/a | 0.000 | 0.000 | 1.750 | 1004.635 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 1.237 | 0.230 | 0.000 | 1.237 | gw-r/thread-103/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ba | 1004.511 | 0.170 | n/a | 0.000 | 0.000 | 1.255 | 1001.858 | 0.016 | n/a | 0.072 | 0.000 | n/a | n/a | 1.140 | 0.170 | 0.000 | 1.140 | gw-r/thread-68/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ad | 1003.742 | 0.200 | n/a | 0.000 | 0.000 | 1.782 | 1000.597 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 1.138 | 0.200 | 0.000 | 1.138 | gw-r/thread-64/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c1 | 1002.821 | 0.180 | n/a | 0.000 | 0.000 | 0.680 | 1000.780 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 1.121 | 0.180 | 0.000 | 1.121 | gw-r/thread-81/journal/page | none observed |
| 0a7169d424da8f7b00000000000000b1 | 944.450 | 8.457 | n/a | 0.000 | 0.000 | 1.210 | 934.642 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.102 | 8.457 | 0.009 | 0.102 | gw-r/thread-75/journal/page | none observed |
| 0a7169d424da8f7b00000000000000bb | 845.552 | 5.943 | n/a | 0.352 | 0.000 | 0.965 | 838.151 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.085 | 6.295 | 0.007 | 0.085 | gw-r/thread-85/journal/page | none observed |
| 0a7169d424da8f7b00000000000000bc | 521.417 | 2.618 | n/a | 0.000 | 0.000 | 0.664 | 518.025 | 0.002 | n/a | 0.039 | 0.000 | n/a | n/a | 0.068 | 2.618 | 0.005 | 0.068 | gw-r/thread-93/journal/page | none observed |
| 0a7169d424da8f7b00000000000000b0 | 421.324 | 4.640 | n/a | 2.857 | 0.000 | 0.721 | 412.973 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.090 | 7.497 | 0.018 | 0.090 | gw-r/thread-112/journal/page | none observed |
| 0a7169d424da8f7b00000000000000b6 | 306.549 | 1.891 | n/a | 0.000 | 0.000 | 2.432 | 302.114 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.062 | 1.891 | 0.006 | 0.062 | gw-r/thread-91/journal/page | none observed |
| 0a7169d424da8f7b00000000000000be | 295.475 | 1.975 | n/a | 0.000 | 0.000 | 1.698 | 291.691 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.052 | 1.975 | 0.007 | 0.052 | gw-r/thread-76/journal/page | none observed |
| 0a7169d424da8f7b00000000000000b8 | 189.296 | 2.041 | n/a | 0.000 | 0.000 | 0.515 | 186.633 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.056 | 2.041 | 0.011 | 0.056 | gw-r/thread-68/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ae | 117.874 | 8.975 | n/a | 0.000 | 0.000 | 6.204 | 102.513 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.164 | 8.975 | 0.076 | 0.164 | gw-r/thread-65/journal/page | none observed |
| 0a7169d424da8f7b00000000000000b4 | 87.235 | 1.613 | n/a | 0.000 | 0.000 | 0.831 | 84.657 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.060 | 1.613 | 0.018 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b00000000000000a9 | 28.894 | 9.478 | n/a | 2.706 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.398 | 12.183 | 0.422 | 16.398 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / recovery / internal (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 801.915 | n/a | n/a | n/a | 2.157 | n/a | 0.000 | 0.000 | 0.938 | 794.311 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.164 | 2.157 | 0.003 | 0.164 |
| p99 | 1006.629 | n/a | n/a | n/a | 11.674 | n/a | 2.810 | 0.000 | 4.311 | 1003.190 | 0.017 | n/a | 0.066 | 0.000 | n/a | n/a | 34.057 | 14.484 | 0.295 | 34.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b00000000000000cb | 1006.629 | 0.153 | n/a | 0.000 | 0.000 | 4.311 | 1000.997 | 0.017 | n/a | 0.052 | 0.000 | n/a | n/a | 1.100 | 0.153 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ce | 1005.567 | 0.111 | n/a | 0.000 | 0.000 | 1.110 | 1003.190 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 1.096 | 0.111 | 0.000 | 1.096 | gw-r/thread-78/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c7 | 1003.703 | 0.167 | n/a | 0.000 | 0.000 | 1.557 | 1000.760 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.155 | 0.167 | 0.000 | 1.155 | gw-r/thread-110/journal/page | none observed |
| 0a7169d424da8f7b00000000000000d4 | 1003.515 | 0.121 | n/a | 0.000 | 0.000 | 0.831 | 1001.398 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 1.093 | 0.121 | 0.000 | 1.093 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c2 | 1002.482 | 0.189 | n/a | 0.000 | 0.000 | 0.707 | 1000.433 | 0.007 | n/a | 0.018 | 0.000 | n/a | n/a | 1.129 | 0.189 | 0.000 | 1.129 | gw-r/thread-98/journal/page | none observed |
| 0a7169d424da8f7b00000000000000d0 | 856.580 | 3.091 | n/a | 0.000 | 0.000 | 0.664 | 852.718 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.066 | 3.091 | 0.004 | 0.066 | gw-r/thread-89/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c9 | 801.915 | 3.913 | n/a | 0.000 | 0.000 | 3.513 | 794.311 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.133 | 3.913 | 0.005 | 0.133 | gw-r/thread-77/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c4 | 627.089 | 2.181 | n/a | 0.000 | 0.000 | 1.849 | 622.872 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.140 | 2.181 | 0.003 | 0.140 | gw-r/thread-110/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c8 | 358.137 | 4.265 | n/a | 0.000 | 0.000 | 0.938 | 352.788 | 0.013 | n/a | 0.029 | 0.000 | n/a | n/a | 0.103 | 4.265 | 0.012 | 0.103 | gw-r/thread-79/journal/page | none observed |
| 0a7169d424da8f7b00000000000000cd | 199.949 | 2.157 | n/a | 0.000 | 0.000 | 0.593 | 197.083 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.067 | 2.157 | 0.011 | 0.067 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b00000000000000d1 | 97.069 | 10.878 | n/a | 0.000 | 0.000 | 3.985 | 82.025 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.164 | 10.878 | 0.112 | 0.164 | gw-r/thread-97/journal/page | none observed |
| 0a7169d424da8f7b00000000000000c3 | 49.075 | 11.674 | n/a | 2.810 | 0.000 | 0.534 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.057 | 14.484 | 0.295 | 34.057 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 564.977 | n/a | n/a | n/a | 1.976 | n/a | 0.000 | 0.000 | 0.778 | 562.457 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.736 | 1.976 | 0.005 | 0.736 |
| p99 | 1004.992 | n/a | n/a | n/a | 9.977 | n/a | 0.000 | 0.000 | 2.202 | 1002.980 | 0.010 | n/a | 0.611 | 0.000 | n/a | n/a | 17.111 | 9.977 | 0.131 | 17.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b00000000000000d5 | 1004.992 | 0.097 | n/a | 0.000 | 0.000 | 0.778 | 1002.980 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 1.087 | 0.097 | 0.000 | 1.087 | gw-r/thread-106/journal/page | none observed |
| 0a7169d424da8f7b00000000000000e6 | 1003.911 | 0.175 | n/a | 0.000 | 0.000 | 0.866 | 1001.260 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 1.507 | 0.175 | 0.000 | 1.507 | gw-r/thread-78/journal/page | none observed |
| 0a7169d424da8f7b00000000000000d9 | 1003.179 | 0.109 | n/a | 0.000 | 0.000 | 1.182 | 1000.741 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 1.092 | 0.109 | 0.000 | 1.092 | gw-r/thread-109/journal/page | none observed |
| 0a7169d424da8f7b00000000000000d6 | 1002.947 | 0.108 | n/a | 0.000 | 0.000 | 0.606 | 1001.050 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 1.108 | 0.108 | 0.000 | 1.108 | gw-r/thread-108/journal/page | none observed |
| 0a7169d424da8f7b00000000000000e8 | 846.126 | 7.671 | n/a | 0.000 | 0.000 | 0.669 | 837.010 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.736 | 7.671 | 0.009 | 0.736 | gw-r/thread-88/journal/page | none observed |
| 0a7169d424da8f7b00000000000000da | 799.666 | 3.788 | n/a | 0.000 | 0.000 | 2.202 | 790.457 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 3.175 | 3.788 | 0.005 | 3.175 | gw-r/thread-109/journal/page | none observed |
| 0a7169d424da8f7b00000000000000e2 | 564.977 | 1.614 | n/a | 0.000 | 0.000 | 0.777 | 562.457 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.061 | 1.614 | 0.003 | 0.061 | gw-r/thread-68/journal/page | none observed |
| 0a7169d424da8f7b00000000000000e7 | 511.774 | 1.578 | n/a | 0.000 | 0.000 | 0.851 | 509.226 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.066 | 1.578 | 0.003 | 0.066 | gw-r/thread-74/journal/page | none observed |
| 0a7169d424da8f7b00000000000000dd | 330.101 | 9.977 | n/a | 0.000 | 0.000 | 0.909 | 319.107 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.073 | 9.977 | 0.030 | 0.073 | gw-r/thread-70/journal/page | none observed |
| 0a7169d424da8f7b00000000000000e4 | 167.318 | 4.184 | n/a | 0.000 | 0.000 | 0.503 | 162.512 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.061 | 4.184 | 0.025 | 0.061 | gw-r/thread-96/journal/page | none observed |
| 0a7169d424da8f7b00000000000000db | 166.571 | 5.160 | n/a | 0.000 | 0.000 | 0.909 | 159.808 | 0.006 | n/a | 0.611 | 0.000 | n/a | n/a | 0.077 | 5.160 | 0.031 | 0.077 | gw-r/thread-83/journal/page | none observed |
| 0a7169d424da8f7b00000000000000df | 71.145 | 1.976 | n/a | 0.000 | 0.000 | 0.451 | 68.629 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.059 | 1.976 | 0.028 | 0.059 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b00000000000000d7 | 19.969 | 2.610 | n/a | 0.000 | 0.000 | 0.248 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.111 | 2.610 | 0.131 | 17.111 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h1 / internal (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 386.842 | n/a | n/a | n/a | 2.476 | n/a | 0.000 | 0.000 | 0.624 | 383.929 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.099 | 2.781 | 0.009 | 0.099 |
| p99 | 1003.593 | n/a | n/a | n/a | 8.200 | n/a | 0.478 | 0.000 | 3.324 | 1000.851 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 38.712 | 8.678 | 0.377 | 38.712 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b00000000000000fd | 1003.593 | 0.113 | n/a | 0.000 | 0.000 | 1.480 | 1000.851 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 1.091 | 0.113 | 0.000 | 1.091 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000108 | 1002.457 | 0.119 | n/a | 0.000 | 0.000 | 0.446 | 1000.799 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.045 | 0.119 | 0.000 | 1.045 | gw-r/thread-113/journal/page | none observed |
| 0a7169d424da8f7b00000000000000f1 | 1002.249 | 0.115 | n/a | 0.000 | 0.000 | 0.413 | 1000.582 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.090 | 0.115 | 0.000 | 1.090 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000010a | 974.195 | 4.479 | n/a | 0.321 | 0.000 | 0.643 | 968.563 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.148 | 4.800 | 0.005 | 0.148 | gw-r/thread-79/journal/page | none observed |
| 0a7169d424da8f7b00000000000000f8 | 877.294 | 7.265 | n/a | 0.359 | 0.000 | 0.674 | 868.862 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.099 | 7.625 | 0.009 | 0.099 | gw-r/thread-86/journal/page | none observed |
| 0a7169d424da8f7b0000000000000101 | 598.844 | 2.314 | n/a | 0.000 | 0.000 | 0.885 | 595.542 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.057 | 2.314 | 0.004 | 0.057 | gw-r/thread-106/journal/page | none observed |
| 0a7169d424da8f7b00000000000000f2 | 572.952 | 3.597 | n/a | 0.336 | 0.000 | 0.850 | 568.040 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.085 | 3.933 | 0.007 | 0.085 | gw-r/thread-83/journal/page | none observed |
| 0a7169d424da8f7b00000000000000f9 | 386.842 | 1.984 | n/a | 0.000 | 0.000 | 0.804 | 383.929 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.056 | 1.984 | 0.005 | 0.056 | gw-r/thread-93/journal/page | none observed |
| 0a7169d424da8f7b00000000000000fc | 355.056 | 3.344 | n/a | 0.000 | 0.000 | 0.537 | 351.067 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.065 | 3.344 | 0.009 | 0.065 | gw-r/thread-97/journal/page | none observed |
| 0a7169d424da8f7b0000000000000106 | 88.242 | 1.675 | n/a | 0.000 | 0.000 | 0.624 | 85.834 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.057 | 1.675 | 0.019 | 0.057 | gw-r/thread-98/journal/page | none observed |
| 0a7169d424da8f7b00000000000000ff | 82.174 | 8.200 | n/a | 0.478 | 0.000 | 0.508 | 72.865 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.093 | 8.678 | 0.106 | 0.093 | gw-r/thread-103/journal/page | none observed |
| 0a7169d424da8f7b0000000000000105 | 78.037 | 3.172 | n/a | 0.000 | 0.000 | 3.324 | 71.459 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.058 | 3.172 | 0.041 | 0.058 | gw-r/thread-107/journal/page | none observed |
| 0a7169d424da8f7b00000000000000f6 | 41.486 | 2.476 | n/a | 0.000 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.712 | 2.476 | 0.060 | 38.712 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000103 | 17.305 | 2.412 | n/a | 0.369 | 0.000 | 0.385 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.139 | 2.781 | 0.161 | 14.139 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000000f4 | 11.168 | 4.212 | n/a | 0.000 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.652 | 4.212 | 0.377 | 6.652 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.746 | n/a | n/a | n/a | 4.045 | n/a | 0.000 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.533 | 4.045 | 0.222 | 12.533 |
| p99 | 79.515 | n/a | n/a | n/a | 7.803 | n/a | 1.269 | 0.000 | 2.346 | 70.561 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 48.039 | 8.284 | 0.645 | 48.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b000000000000010c | 79.515 | 6.982 | n/a | 0.455 | 0.000 | 1.246 | 70.561 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.241 | 7.438 | 0.094 | 0.241 | gw-r/thread-72/journal/page | none observed |
| 0a7169d424da8f7b000000000000010f | 71.640 | 4.347 | n/a | 0.000 | 0.000 | 1.286 | 65.823 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.139 | 4.347 | 0.061 | 0.139 | gw-r/thread-92/journal/page | none observed |
| 0a7169d424da8f7b000000000000011e | 63.238 | 3.569 | n/a | 0.000 | 0.000 | 0.691 | 58.815 | 0.003 | n/a | 0.045 | 0.000 | n/a | n/a | 0.115 | 3.569 | 0.056 | 0.115 | gw-r/thread-112/journal/page | none observed |
| 0a7169d424da8f7b0000000000000116 | 58.548 | 3.705 | n/a | 0.000 | 0.000 | 1.395 | 53.271 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.157 | 3.705 | 0.063 | 0.157 | gw-r/thread-43/journal/page | none observed |
| 0a7169d424da8f7b0000000000000111 | 52.554 | 4.064 | n/a | 0.000 | 0.000 | 0.451 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.039 | 4.064 | 0.077 | 48.039 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000117 | 50.613 | 6.576 | n/a | 0.000 | 0.000 | 0.299 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.739 | 6.576 | 0.130 | 43.739 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000113 | 49.608 | 5.371 | n/a | 0.000 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.881 | 5.371 | 0.108 | 43.881 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000011a | 48.277 | 3.576 | n/a | 0.000 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.445 | 3.576 | 0.074 | 44.445 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000120 | 47.541 | 3.081 | n/a | 0.000 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.216 | 3.081 | 0.065 | 44.216 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000114 | 45.303 | 6.374 | n/a | 0.000 | 0.000 | 0.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.641 | 6.374 | 0.141 | 38.641 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000010b | 45.141 | 4.345 | n/a | 0.000 | 0.000 | 0.258 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.538 | 4.345 | 0.096 | 40.538 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000110 | 45.099 | 4.820 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.008 | 4.820 | 0.107 | 40.008 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000119 | 39.816 | 3.932 | n/a | 0.000 | 0.000 | 0.406 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.478 | 3.932 | 0.099 | 35.478 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000112 | 38.022 | 3.915 | n/a | 0.000 | 0.000 | 0.399 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.708 | 3.915 | 0.103 | 33.708 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000011d | 37.602 | 4.045 | n/a | 0.000 | 0.000 | 0.253 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.304 | 4.045 | 0.108 | 33.304 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000122 | 34.936 | 5.809 | n/a | 0.000 | 0.000 | 0.418 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.708 | 5.809 | 0.166 | 28.708 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000010e | 33.594 | 3.558 | n/a | 0.000 | 0.000 | 0.227 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.808 | 3.558 | 0.106 | 29.808 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000011b | 31.335 | 4.311 | n/a | 0.000 | 0.000 | 0.222 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.802 | 4.311 | 0.138 | 26.802 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000010d | 27.364 | 3.848 | n/a | 0.000 | 0.000 | 0.266 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.250 | 3.848 | 0.141 | 23.250 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000011f | 26.056 | 3.590 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.227 | 3.590 | 0.138 | 22.227 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 496.746 | n/a | n/a | n/a | 3.132 | n/a | 0.000 | 0.000 | 0.676 | 493.854 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 3.132 | 0.007 | 0.063 |
| p99 | 1012.433 | n/a | n/a | n/a | 7.116 | n/a | 1.661 | 0.000 | 10.348 | 1000.824 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 1.098 | 7.116 | 0.038 | 1.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000158 | 1012.433 | 0.106 | n/a | 0.000 | 0.000 | 10.348 | 1000.824 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 1.098 | 0.106 | 0.000 | 1.098 | gw-r/thread-110/journal/page | none observed |
| 0a7169d424da8f7b000000000000014e | 1002.221 | 0.118 | n/a | 0.000 | 0.000 | 0.400 | 1000.565 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 1.091 | 0.118 | 0.000 | 1.091 | gw-r/thread-86/journal/page | none observed |
| 0a7169d424da8f7b0000000000000148 | 982.886 | 1.591 | n/a | 0.000 | 0.000 | 0.488 | 980.718 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.054 | 1.591 | 0.002 | 0.054 | gw-r/thread-85/journal/page | none observed |
| 0a7169d424da8f7b000000000000015a | 926.938 | 4.727 | n/a | 0.000 | 0.000 | 0.309 | 921.815 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.053 | 4.727 | 0.005 | 0.053 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b000000000000015e | 695.171 | 7.116 | n/a | 0.000 | 0.000 | 1.169 | 686.676 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.178 | 7.116 | 0.010 | 0.178 | gw-r/thread-71/journal/page | none observed |
| 0a7169d424da8f7b000000000000014c | 604.777 | 3.132 | n/a | 0.000 | 0.000 | 0.676 | 600.865 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.069 | 3.132 | 0.005 | 0.069 | gw-r/thread-87/journal/page | none observed |
| 0a7169d424da8f7b0000000000000155 | 496.746 | 2.075 | n/a | 0.000 | 0.000 | 0.691 | 493.854 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.055 | 2.075 | 0.004 | 0.055 | gw-r/thread-103/journal/page | none observed |
| 0a7169d424da8f7b0000000000000153 | 478.792 | 4.264 | n/a | 0.000 | 0.000 | 0.568 | 473.841 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.079 | 4.264 | 0.009 | 0.079 | gw-r/thread-100/journal/page | none observed |
| 0a7169d424da8f7b0000000000000150 | 475.438 | 6.539 | n/a | 0.000 | 0.000 | 0.614 | 468.193 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.054 | 6.539 | 0.014 | 0.054 | gw-r/thread-88/journal/page | none observed |
| 0a7169d424da8f7b000000000000015c | 259.347 | 1.823 | n/a | 0.000 | 0.000 | 1.776 | 255.660 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.051 | 1.823 | 0.007 | 0.051 | gw-r/thread-91/journal/page | none observed |
| 0a7169d424da8f7b000000000000014a | 256.327 | 3.137 | n/a | 1.661 | 0.000 | 1.059 | 250.309 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.111 | 4.798 | 0.019 | 0.111 | gw-r/thread-80/journal/page | none observed |
| 0a7169d424da8f7b0000000000000156 | 162.974 | 5.320 | n/a | 0.800 | 0.000 | 0.834 | 155.910 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 6.120 | 0.038 | 0.063 | gw-r/thread-111/journal/page | none observed |
| 0a7169d424da8f7b000000000000014f | 94.103 | 2.505 | n/a | 0.000 | 0.000 | 0.512 | 91.024 | 0.002 | n/a | 0.013 | 0.000 | n/a | n/a | 0.047 | 2.505 | 0.027 | 0.047 | gw-r/thread-43/journal/page | none observed |

## P3 / grow10 / internal (177 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.029 | n/a | n/a | n/a | 3.295 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.063 | 3.295 | 0.277 | 9.063 |
| p99 | 42.785 | n/a | n/a | n/a | 6.680 | n/a | 0.000 | 0.000 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.641 | 6.680 | 0.735 | 37.641 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b000000000000018b | 53.071 | 3.580 | n/a | 0.000 | 0.000 | 0.247 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.244 | 3.580 | 0.067 | 49.244 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000176 | 42.785 | 4.710 | n/a | 0.000 | 0.000 | 0.434 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.641 | 4.710 | 0.110 | 37.641 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000018f | 35.555 | 3.058 | n/a | 0.000 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.271 | 3.058 | 0.086 | 32.271 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000170 | 34.356 | 6.502 | n/a | 0.000 | 0.000 | 0.302 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.552 | 6.502 | 0.189 | 27.552 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000182 | 29.099 | 3.170 | n/a | 0.000 | 0.000 | 0.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.695 | 3.170 | 0.109 | 25.695 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000172 | 28.436 | 4.682 | n/a | 0.000 | 0.000 | 0.341 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.413 | 4.682 | 0.165 | 23.413 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000173 | 27.476 | 4.987 | n/a | 0.000 | 0.000 | 0.289 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.201 | 4.987 | 0.181 | 22.201 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000001db | 27.058 | 2.889 | n/a | 0.000 | 0.000 | 0.183 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.985 | 2.889 | 0.107 | 23.985 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000196 | 26.715 | 4.788 | n/a | 0.000 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.663 | 4.788 | 0.179 | 21.663 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000160 | 26.285 | 6.322 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.618 | 6.322 | 0.241 | 19.618 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000018d | 25.383 | 6.585 | n/a | 0.000 | 0.000 | 0.302 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.495 | 6.585 | 0.259 | 18.495 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000001fb | 23.285 | 2.984 | n/a | 0.000 | 0.000 | 0.336 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.964 | 2.984 | 0.128 | 19.964 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000161 | 23.013 | 3.686 | n/a | 0.313 | 0.000 | 0.402 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.614 | 3.998 | 0.174 | 18.614 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000209 | 22.273 | 4.900 | n/a | 0.000 | 0.000 | 0.228 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.145 | 4.900 | 0.220 | 17.145 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000193 | 22.041 | 3.645 | n/a | 0.000 | 0.000 | 0.463 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.933 | 3.645 | 0.165 | 17.933 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000001fc | 21.718 | 4.593 | n/a | 0.000 | 0.000 | 0.192 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.933 | 4.593 | 0.211 | 16.933 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000164 | 21.197 | 6.077 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.849 | 6.077 | 0.287 | 14.849 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000001c4 | 21.071 | 6.288 | n/a | 0.000 | 0.000 | 0.302 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.480 | 6.288 | 0.298 | 14.480 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000001a2 | 20.579 | 5.358 | n/a | 0.000 | 0.000 | 0.272 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.949 | 5.358 | 0.260 | 14.949 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000001a3 | 20.109 | 6.383 | n/a | 0.000 | 0.000 | 0.224 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.502 | 6.383 | 0.317 | 13.502 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h10 / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 513.950 | n/a | n/a | n/a | 1.956 | n/a | 0.000 | 0.000 | 0.606 | 505.794 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.101 | 1.956 | 0.007 | 0.101 |
| p99 | 1003.590 | n/a | n/a | n/a | 7.326 | n/a | 0.000 | 0.000 | 1.159 | 1001.660 | 1.679 | n/a | 0.058 | 0.000 | n/a | n/a | 6.199 | 7.326 | 0.211 | 6.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b0000000000000229 | 1003.590 | 0.162 | n/a | 0.000 | 0.000 | 0.606 | 1001.660 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 1.134 | 0.162 | 0.000 | 1.134 | gw-r/thread-71/journal/page | none observed |
| 0a7169d424da8f7b000000000000022d | 1003.143 | 0.112 | n/a | 0.000 | 0.000 | 0.441 | 1000.872 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 1.663 | 0.112 | 0.000 | 1.663 | gw-r/thread-90/journal/page | none observed |
| 0a7169d424da8f7b000000000000022c | 1002.773 | 0.111 | n/a | 0.000 | 0.000 | 0.647 | 1000.855 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 1.097 | 0.111 | 0.000 | 1.097 | gw-r/thread-74/journal/page | none observed |
| 0a7169d424da8f7b0000000000000227 | 1002.615 | 0.193 | n/a | 0.000 | 0.000 | 0.599 | 1000.614 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 1.150 | 0.193 | 0.000 | 1.150 | gw-r/thread-45/journal/page | none observed |
| 0a7169d424da8f7b000000000000021f | 1002.284 | 0.103 | n/a | 0.000 | 0.000 | 0.471 | 1000.570 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 1.090 | 0.103 | 0.000 | 1.090 | gw-r/thread-108/journal/page | none observed |
| 0a7169d424da8f7b000000000000021b | 846.797 | 4.671 | n/a | 0.000 | 0.000 | 0.773 | 841.203 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.092 | 4.671 | 0.006 | 0.092 | gw-r/thread-100/journal/page | none observed |
| 0a7169d424da8f7b000000000000022a | 513.950 | 7.326 | n/a | 0.000 | 0.000 | 0.675 | 505.794 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.101 | 7.326 | 0.014 | 0.101 | gw-r/thread-96/journal/page | none observed |
| 0a7169d424da8f7b000000000000021d | 315.513 | 2.128 | n/a | 0.000 | 0.000 | 0.412 | 312.872 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.054 | 2.128 | 0.007 | 0.054 | gw-r/thread-107/journal/page | none observed |
| 0a7169d424da8f7b0000000000000226 | 240.414 | 2.338 | n/a | 0.000 | 0.000 | 0.538 | 237.452 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.051 | 2.338 | 0.010 | 0.051 | gw-r/thread-91/journal/page | none observed |
| 0a7169d424da8f7b0000000000000222 | 103.777 | 4.183 | n/a | 0.000 | 0.000 | 0.931 | 98.575 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.063 | 4.183 | 0.040 | 0.063 | gw-r/thread-75/journal/page | none observed |
| 0a7169d424da8f7b0000000000000220 | 76.410 | 1.956 | n/a | 0.000 | 0.000 | 1.159 | 73.219 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.047 | 1.956 | 0.026 | 0.047 | gw-r/thread-82/journal/page | none observed |
| 0a7169d424da8f7b0000000000000219 | 57.582 | 3.121 | n/a | 0.000 | 0.000 | 0.725 | 51.983 | 1.679 | n/a | 0.011 | 0.000 | n/a | n/a | 0.063 | 3.121 | 0.054 | 0.063 | gw-r/thread-102/journal/page | none observed |
| 0a7169d424da8f7b0000000000000224 | 8.168 | 1.725 | n/a | 0.000 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.199 | 1.725 | 0.211 | 6.199 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.632 | n/a | n/a | n/a | 3.151 | n/a | 0.000 | 0.000 | 0.278 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.144 | 3.151 | 0.277 | 8.144 |
| p99 | 1002.744 | n/a | n/a | n/a | 20.760 | n/a | 3.772 | 0.000 | 6.414 | 1000.779 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 48.774 | 20.760 | 0.803 | 48.774 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b000000000000022e | 1005.399 | 0.114 | n/a | 0.000 | 0.000 | 3.349 | 1000.779 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 1.103 | 0.114 | 0.000 | 1.103 | gw-r/thread-46/journal/page | none observed |
| 0a7169d424da8f7b0000000000000238 | 1002.744 | 0.112 | n/a | 0.000 | 0.000 | 0.467 | 1000.983 | 0.016 | n/a | 0.072 | 0.000 | n/a | n/a | 1.094 | 0.112 | 0.000 | 1.094 | gw-r/thread-94/journal/page | none observed |
| 0a7169d424da8f7b0000000000000236 | 1002.492 | 0.105 | n/a | 0.000 | 0.000 | 0.564 | 1000.657 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 1.104 | 0.105 | 0.000 | 1.104 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b0000000000000231 | 843.542 | 1.946 | n/a | 0.000 | 0.000 | 0.519 | 840.990 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.047 | 1.946 | 0.002 | 0.047 | gw-r/thread-44/journal/page | none observed |
| 0a7169d424da8f7b000000000000022f | 840.293 | 2.125 | n/a | 0.000 | 0.000 | 2.823 | 835.255 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.052 | 2.125 | 0.003 | 0.052 | gw-r/thread-110/journal/page | none observed |
| 0a7169d424da8f7b0000000000000234 | 784.474 | 2.432 | n/a | 0.000 | 0.000 | 0.522 | 781.417 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.060 | 2.432 | 0.003 | 0.060 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b0000000000000233 | 249.450 | 1.940 | n/a | 0.000 | 0.000 | 3.233 | 244.183 | 0.002 | n/a | 0.037 | 0.000 | n/a | n/a | 0.055 | 1.940 | 0.008 | 0.055 | gw-r/thread-62/journal/page | none observed |
| 0a7169d424da8f7b0000000000000239 | 101.954 | 4.760 | n/a | 0.000 | 0.000 | 0.739 | 96.298 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.096 | 4.760 | 0.047 | 0.096 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b00000000000002f5 | 97.739 | 7.794 | n/a | 0.000 | 0.000 | 0.486 | 89.307 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.103 | 7.794 | 0.080 | 0.103 | gw-r/thread-108/journal/page | none observed |
| 0a7169d424da8f7b000000000000026d | 75.937 | 12.173 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.523 | 12.173 | 0.160 | 63.523 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000272 | 74.601 | 17.418 | n/a | 0.000 | 0.000 | 3.237 | 53.755 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.115 | 17.418 | 0.233 | 0.115 | gw-r/thread-75/gateway.admitted-work | none observed |
| 0a7169d424da8f7b000000000000025b | 58.288 | 9.246 | n/a | 0.000 | 0.000 | 0.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.774 | 9.246 | 0.159 | 48.774 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000002e7 | 55.013 | 2.612 | n/a | 0.000 | 0.000 | 0.588 | 51.698 | 0.011 | n/a | 0.035 | 0.000 | n/a | n/a | 0.070 | 2.612 | 0.047 | 0.070 | gw-r/thread-82/journal/page | none observed |
| 0a7169d424da8f7b00000000000002c8 | 51.103 | 8.225 | n/a | 5.140 | 0.000 | 0.212 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.525 | 13.365 | 0.262 | 37.525 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000027e | 46.509 | 2.283 | n/a | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.805 | 2.283 | 0.049 | 43.805 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000002a0 | 45.114 | 25.629 | n/a | 0.000 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.216 | 25.629 | 0.568 | 19.216 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000289 | 42.980 | 14.873 | n/a | 3.231 | 0.000 | 0.425 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.452 | 18.104 | 0.421 | 24.452 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000251 | 41.388 | 4.045 | n/a | 0.000 | 0.000 | 0.176 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.167 | 4.045 | 0.098 | 37.167 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000002b2 | 41.160 | 4.785 | n/a | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.112 | 4.785 | 0.116 | 36.112 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b00000000000002df | 40.341 | 2.686 | n/a | 0.000 | 0.000 | 0.341 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.313 | 2.686 | 0.067 | 37.313 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / sweep / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.391 | n/a | n/a | n/a | 3.085 | n/a | 0.000 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.814 | 3.085 | 0.449 | 3.814 |
| p99 | 23.023 | n/a | n/a | n/a | 6.203 | n/a | 0.000 | 0.000 | 0.318 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.820 | 6.203 | 0.565 | 18.820 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b000000000000031c | 23.023 | 3.911 | n/a | 0.000 | 0.000 | 0.293 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.820 | 3.911 | 0.170 | 18.820 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b000000000000031a | 19.473 | 3.683 | n/a | 0.000 | 0.000 | 0.156 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.634 | 3.683 | 0.189 | 15.634 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000318 | 10.987 | 6.203 | n/a | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.508 | 6.203 | 0.565 | 4.508 | node-14/thread-2/replica.fetch-feed | none observed |
| 0a7169d424da8f7b0000000000000314 | 9.119 | 5.045 | n/a | 0.000 | 0.000 | 0.259 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.814 | 5.045 | 0.553 | 3.814 | node-14/thread-2/replica.fetch-feed | none observed |
| 0a7169d424da8f7b0000000000000313 | 8.391 | 1.552 | n/a | 0.000 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.581 | 1.552 | 0.185 | 6.581 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000317 | 6.877 | 3.085 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.554 | 3.085 | 0.449 | 3.554 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000315 | 6.372 | 2.920 | n/a | 0.000 | 0.000 | 0.318 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.134 | 2.920 | 0.458 | 3.134 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000316 | 5.079 | 1.546 | n/a | 0.000 | 0.000 | 0.250 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.284 | 1.546 | 0.304 | 3.284 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000319 | 2.710 | 1.453 | n/a | 0.000 | 0.000 | 0.219 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.038 | 1.453 | 0.536 | 1.038 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / tail / internal (2697 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.708 | n/a | n/a | n/a | 4.253 | n/a | 0.000 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.561 | 4.296 | 0.360 | 6.561 |
| p99 | 83.488 | n/a | n/a | n/a | 25.703 | n/a | 1.859 | 0.000 | 1.846 | 79.573 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 47.034 | 26.840 | 0.857 | 47.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0a7169d424da8f7b00000000000003d4 | 182.126 | 4.320 | n/a | 0.000 | 0.000 | 0.760 | 173.819 | 3.061 | n/a | 0.040 | 0.000 | n/a | n/a | 0.127 | 4.320 | 0.024 | 0.127 | gw-r/thread-72/journal/page | none observed |
| 0a7169d424da8f7b0000000000000f2a | 146.219 | 7.295 | n/a | 0.000 | 0.000 | 3.242 | 134.763 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.911 | 7.295 | 0.050 | 0.911 | gw-r/thread-80/journal/page | none observed |
| 0a7169d424da8f7b0000000000001949 | 136.732 | 2.736 | n/a | 0.000 | 0.000 | 0.295 | 133.632 | 0.001 | n/a | 0.008 | 0.000 | n/a | n/a | 0.060 | 2.736 | 0.020 | 0.060 | gw-r/thread-63/journal/page | none observed |
| 0a7169d424da8f7b00000000000014e2 | 125.179 | 2.017 | n/a | 0.000 | 0.000 | 0.851 | 122.230 | 0.002 | n/a | 0.018 | 0.000 | n/a | n/a | 0.061 | 2.017 | 0.016 | 0.061 | gw-r/thread-95/journal/page | none observed |
| 0a7169d424da8f7b0000000000000927 | 114.414 | 3.284 | n/a | 0.000 | 0.000 | 0.306 | 110.690 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.125 | 3.284 | 0.029 | 0.125 | gw-r/thread-75/journal/page | none observed |
| 0a7169d424da8f7b0000000000001600 | 114.401 | 12.602 | n/a | 1.122 | 0.000 | 0.531 | 99.477 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.660 | 13.725 | 0.120 | 0.660 | gw-r/thread-47/journal/page | none observed |
| 0a7169d424da8f7b00000000000003b3 | 112.127 | 2.041 | n/a | 0.000 | 0.000 | 0.695 | 109.306 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.060 | 2.041 | 0.018 | 0.060 | gw-r/thread-87/gateway.admitted-work | none observed |
| 0a7169d424da8f7b00000000000018cc | 111.555 | 15.165 | n/a | 1.432 | 0.000 | 1.102 | 92.777 | 0.098 | n/a | 0.052 | 0.000 | n/a | n/a | 0.930 | 16.596 | 0.149 | 0.930 | gw-r/thread-111/gateway.admitted-work | none observed |
| 0a7169d424da8f7b000000000000087a | 108.703 | 4.071 | n/a | 0.000 | 0.000 | 0.600 | 103.902 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.099 | 4.071 | 0.037 | 0.099 | gw-r/thread-89/journal/page | none observed |
| 0a7169d424da8f7b0000000000000c05 | 108.365 | 1.504 | n/a | 0.000 | 0.000 | 0.381 | 106.399 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.042 | 1.504 | 0.014 | 0.042 | gw-r/thread-88/journal/page | none observed |
| 0a7169d424da8f7b00000000000011df | 107.557 | 10.350 | n/a | 0.000 | 0.000 | 0.560 | 96.400 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.207 | 10.350 | 0.096 | 0.207 | gw-r/thread-106/journal/page | none observed |
| 0a7169d424da8f7b00000000000004e5 | 106.719 | 9.839 | n/a | 0.583 | 0.000 | 1.241 | 94.019 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.001 | 10.421 | 0.098 | 1.001 | gw-r/thread-99/journal/page | none observed |
| 0a7169d424da8f7b0000000000000b35 | 102.094 | 4.003 | n/a | 0.000 | 0.000 | 0.472 | 97.505 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.105 | 4.003 | 0.039 | 0.105 | gw-r/thread-105/journal/page | none observed |
| 0a7169d424da8f7b00000000000011b3 | 101.233 | 2.555 | n/a | 0.000 | 0.000 | 0.631 | 97.938 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.061 | 2.555 | 0.025 | 0.061 | gw-r/thread-81/journal/page | none observed |
| 0a7169d424da8f7b00000000000017df | 100.737 | 7.586 | n/a | 0.000 | 0.000 | 0.426 | 92.517 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.186 | 7.586 | 0.075 | 0.186 | gw-r/thread-40/journal/page | none observed |
| 0a7169d424da8f7b000000000000101e | 99.854 | 4.499 | n/a | 0.000 | 0.000 | 1.580 | 93.519 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 0.239 | 4.499 | 0.045 | 0.239 | gw-r/thread-91/journal/page | none observed |
| 0a7169d424da8f7b0000000000000999 | 94.378 | 3.929 | n/a | 0.000 | 0.000 | 0.706 | 89.531 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.192 | 3.929 | 0.042 | 0.192 | gw-r/thread-79/journal/page | none observed |
| 0a7169d424da8f7b0000000000000469 | 94.264 | 4.696 | n/a | 0.000 | 0.000 | 0.453 | 89.028 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.069 | 4.696 | 0.050 | 0.069 | gw-r/thread-116/journal/page | none observed |
| 0a7169d424da8f7b00000000000018d0 | 92.404 | 40.821 | n/a | 4.097 | 0.000 | 0.452 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.034 | 44.918 | 0.486 | 47.034 | node-14/thread-2/socket.wait-first-byte | none observed |
| 0a7169d424da8f7b0000000000000b7a | 92.149 | 7.300 | n/a | 0.000 | 0.000 | 0.276 | 84.269 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.294 | 7.300 | 0.079 | 0.294 | gw-r/thread-109/journal/page | none observed |

## P3 / warmup / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.913 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.236 | 201.154 | 0.016 | n/a | 0.156 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 214.779 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 11.965 | 205.349 | 0.422 | n/a | 0.730 | 0.000 | n/a | n/a | 0.543 | 0.000 | 0.000 | 0.543 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000022 | 214.779 | 0.000 | n/a | 0.000 | 0.000 | 11.965 | 202.517 | 0.025 | n/a | 0.122 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b330000000000000001f | 211.651 | 0.000 | n/a | 0.000 | 0.000 | 7.068 | 204.253 | 0.016 | n/a | 0.211 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000020 | 207.409 | 0.000 | n/a | 0.000 | 0.000 | 5.393 | 201.432 | 0.036 | n/a | 0.428 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-40/journal/page | none observed |
| 6eead0acc776b3300000000000000009 | 206.989 | 0.000 | n/a | 0.000 | 0.000 | 5.136 | 201.149 | 0.015 | n/a | 0.146 | 0.000 | n/a | n/a | 0.543 | 0.000 | 0.000 | 0.543 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b3300000000000000021 | 206.967 | 0.000 | n/a | 0.000 | 0.000 | 4.390 | 202.285 | 0.021 | n/a | 0.155 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b330000000000000000c | 206.384 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 205.349 | 0.045 | n/a | 0.141 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000023 | 205.629 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 204.218 | 0.422 | n/a | 0.170 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b3300000000000000027 | 205.391 | 0.000 | n/a | 0.000 | 0.000 | 3.482 | 201.061 | 0.016 | n/a | 0.730 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b3300000000000000019 | 205.379 | 0.000 | n/a | 0.000 | 0.000 | 2.233 | 202.773 | 0.021 | n/a | 0.198 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b330000000000000002d | 204.993 | 0.000 | n/a | 0.000 | 0.000 | 3.248 | 201.281 | 0.035 | n/a | 0.272 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b330000000000000000b | 204.763 | 0.000 | n/a | 0.000 | 0.000 | 1.872 | 202.136 | 0.026 | n/a | 0.575 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b3300000000000000029 | 204.043 | 0.000 | n/a | 0.000 | 0.000 | 2.048 | 201.591 | 0.056 | n/a | 0.202 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000014 | 203.890 | 0.000 | n/a | 0.000 | 0.000 | 1.482 | 201.893 | 0.017 | n/a | 0.177 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000017 | 203.821 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 202.738 | 0.020 | n/a | 0.174 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000008 | 203.226 | 0.000 | n/a | 0.000 | 0.000 | 1.769 | 201.121 | 0.012 | n/a | 0.137 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-40/journal/page | none observed |
| 6eead0acc776b330000000000000001c | 203.220 | 0.000 | n/a | 0.000 | 0.000 | 1.760 | 201.188 | 0.016 | n/a | 0.119 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b3300000000000000025 | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 1.542 | 201.359 | 0.016 | n/a | 0.163 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000024 | 202.995 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 201.963 | 0.045 | n/a | 0.189 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000007 | 202.970 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.667 | 0.021 | n/a | 0.178 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b330000000000000001e | 202.913 | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 201.053 | 0.023 | n/a | 0.165 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-42/journal/page | none observed |

## P3 / baseline / read (27 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.497 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.216 | 0.014 | n/a | 0.124 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 206.488 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.615 | 204.643 | 4.192 | n/a | 3.352 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000041 | 206.488 | 0.000 | n/a | 0.000 | 0.000 | 4.615 | 201.483 | 0.017 | n/a | 0.263 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b330000000000000004b | 206.019 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 204.643 | 0.027 | n/a | 0.258 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b330000000000000002f | 205.823 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 203.102 | 0.234 | n/a | 1.607 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b330000000000000004d | 205.085 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 203.996 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b3300000000000000036 | 204.861 | 0.000 | n/a | 0.000 | 0.000 | 2.584 | 201.950 | 0.021 | n/a | 0.168 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b330000000000000003e | 204.086 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 199.706 | 0.046 | n/a | 3.352 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b3300000000000000040 | 203.800 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 202.875 | 0.027 | n/a | 0.182 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000043 | 203.508 | 0.000 | n/a | 0.000 | 0.000 | 1.226 | 201.294 | 0.019 | n/a | 0.806 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b3300000000000000035 | 203.194 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 202.425 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000031 | 203.095 | 0.000 | n/a | 0.000 | 0.000 | 1.489 | 201.361 | 0.014 | n/a | 0.142 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b330000000000000003f | 203.045 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 201.981 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b3300000000000000048 | 202.936 | 0.000 | n/a | 0.000 | 0.000 | 1.206 | 201.382 | 0.014 | n/a | 0.149 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b330000000000000004c | 202.835 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.570 | 0.056 | n/a | 0.178 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000037 | 202.497 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.601 | 0.027 | n/a | 0.091 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-40/journal/page | none observed |
| 6eead0acc776b3300000000000000049 | 202.431 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 201.179 | 0.018 | n/a | 0.141 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b330000000000000003a | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.584 | 201.216 | 0.028 | n/a | 0.122 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000038 | 201.940 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 200.784 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b330000000000000003b | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 200.857 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b330000000000000004e | 201.893 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 201.114 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000039 | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.733 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.494 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.374 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 208.373 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.901 | 205.490 | 9.085 | n/a | 0.209 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000057 | 208.373 | 0.000 | n/a | 0.000 | 0.000 | 2.525 | 205.490 | 0.018 | n/a | 0.144 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000051 | 206.079 | 0.000 | n/a | 0.000 | 0.000 | 1.393 | 204.452 | 0.017 | n/a | 0.119 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b330000000000000006b | 204.495 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 203.312 | 0.024 | n/a | 0.154 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000052 | 204.244 | 0.000 | n/a | 0.000 | 0.000 | 2.901 | 201.025 | 0.015 | n/a | 0.136 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b3300000000000000069 | 204.047 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 202.606 | 0.017 | n/a | 0.186 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000068 | 203.755 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 202.699 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b330000000000000005f | 203.467 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 202.270 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-40/journal/page | none observed |
| 6eead0acc776b330000000000000006a | 203.111 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.848 | 0.026 | n/a | 0.209 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b3300000000000000060 | 203.069 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 202.001 | 0.014 | n/a | 0.121 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b330000000000000005d | 203.002 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.741 | 0.012 | n/a | 0.131 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b330000000000000005e | 202.987 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 201.568 | 0.013 | n/a | 0.135 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000067 | 202.904 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.760 | 0.021 | n/a | 0.097 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000050 | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 201.597 | 0.021 | n/a | 0.177 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b3300000000000000058 | 202.494 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 201.374 | 0.045 | n/a | 0.170 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000062 | 202.453 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.116 | 0.013 | n/a | 0.131 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b3300000000000000061 | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 201.706 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b330000000000000005b | 202.301 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.116 | 0.019 | n/a | 0.150 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b330000000000000005c | 202.229 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 200.834 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b330000000000000004f | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 200.809 | 0.014 | n/a | 0.127 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b330000000000000005a | 202.086 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 201.098 | 0.024 | n/a | 0.156 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-63/journal/page | none observed |

## P3 / L4 / read (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.315 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.004 | 0.015 | n/a | 0.105 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 209.226 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.631 | 204.152 | 7.696 | n/a | 2.706 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000082 | 209.226 | 0.000 | n/a | 0.000 | 0.000 | 7.631 | 201.292 | 0.014 | n/a | 0.146 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000072 | 207.756 | 0.000 | n/a | 0.000 | 0.000 | 6.518 | 201.004 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b330000000000000008a | 207.555 | 0.000 | n/a | 0.000 | 0.000 | 6.119 | 201.174 | 0.019 | n/a | 0.142 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000070 | 206.227 | 0.000 | n/a | 0.000 | 0.000 | 4.367 | 201.507 | 0.019 | n/a | 0.141 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b330000000000000007c | 205.777 | 0.000 | n/a | 0.000 | 0.000 | 2.819 | 202.702 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b330000000000000007a | 205.291 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 204.152 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b330000000000000006f | 204.311 | 0.000 | n/a | 0.000 | 0.000 | 2.899 | 201.202 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000080 | 203.653 | 0.000 | n/a | 0.000 | 0.000 | 1.830 | 201.528 | 0.022 | n/a | 0.171 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b3300000000000000078 | 203.351 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 201.821 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b3300000000000000075 | 203.201 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 202.336 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b330000000000000008f | 203.172 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 202.137 | 0.019 | n/a | 0.143 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000071 | 203.136 | 0.000 | n/a | 0.000 | 0.000 | 1.202 | 201.593 | 0.020 | n/a | 0.139 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000088 | 202.987 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.974 | 0.016 | n/a | 0.100 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000089 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 1.236 | 200.908 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b330000000000000007e | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.137 | 0.019 | n/a | 0.125 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-40/journal/page | none observed |
| 6eead0acc776b330000000000000008e | 202.286 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 198.903 | 0.015 | n/a | 2.706 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b330000000000000008c | 202.088 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 200.905 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b3300000000000000079 | 202.001 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.940 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b330000000000000008d | 201.967 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 200.839 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b3300000000000000076 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 200.838 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.662 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 201.262 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 209.820 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.966 | 204.349 | 17.348 | n/a | 2.524 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b33000000000000000a1 | 209.820 | 0.000 | n/a | 0.000 | 0.000 | 5.966 | 203.550 | 0.030 | n/a | 0.138 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b33000000000000000ac | 206.276 | 0.000 | n/a | 0.000 | 0.000 | 5.154 | 200.894 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b33000000000000000b9 | 205.854 | 0.000 | n/a | 0.000 | 0.000 | 1.299 | 204.349 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b3300000000000000094 | 205.328 | 0.000 | n/a | 0.000 | 0.000 | 1.223 | 201.620 | 2.250 | n/a | 0.108 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b33000000000000000ae | 205.328 | 0.000 | n/a | 0.000 | 0.000 | 1.539 | 203.434 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b33000000000000000b5 | 205.205 | 0.000 | n/a | 0.000 | 0.000 | 4.261 | 200.665 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b33000000000000000b7 | 205.196 | 0.000 | n/a | 0.000 | 0.000 | 1.641 | 203.341 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b33000000000000000a6 | 205.140 | 0.000 | n/a | 0.000 | 0.000 | 3.318 | 201.609 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b33000000000000000a2 | 205.069 | 0.000 | n/a | 0.000 | 0.000 | 1.356 | 203.408 | 0.016 | n/a | 0.177 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b33000000000000000a5 | 204.967 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 203.967 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b33000000000000000b6 | 204.790 | 0.000 | n/a | 0.000 | 0.000 | 3.651 | 200.931 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b33000000000000000ba | 204.618 | 0.000 | n/a | 0.000 | 0.000 | 1.147 | 203.196 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-40/journal/page | none observed |
| 6eead0acc776b33000000000000000a0 | 204.363 | 0.000 | n/a | 0.000 | 0.000 | 2.410 | 201.584 | 0.047 | n/a | 0.166 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b3300000000000000096 | 204.260 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 203.013 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b33000000000000000b8 | 203.830 | 0.000 | n/a | 0.000 | 0.000 | 1.208 | 202.363 | 0.044 | n/a | 0.113 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b3300000000000000095 | 203.808 | 0.000 | n/a | 0.000 | 0.000 | 2.144 | 201.390 | 0.011 | n/a | 0.156 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b33000000000000000ad | 203.578 | 0.000 | n/a | 0.000 | 0.000 | 1.809 | 201.438 | 0.026 | n/a | 0.137 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b330000000000000009f | 203.202 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.929 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b330000000000000009e | 203.049 | 0.000 | n/a | 0.000 | 0.000 | 1.738 | 201.100 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b33000000000000000af | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 199.088 | 0.013 | n/a | 2.524 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-65/journal/page | none observed |

## P3 / L64 / read (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.942 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.049 | 201.112 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 214.670 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 13.665 | 207.261 | 5.002 | n/a | 0.160 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b33000000000000000d0 | 214.670 | 0.000 | n/a | 0.000 | 0.000 | 13.665 | 200.807 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b33000000000000000c3 | 214.237 | 0.000 | n/a | 0.000 | 0.000 | 7.553 | 206.351 | 0.089 | n/a | 0.139 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b33000000000000000cb | 208.132 | 0.000 | n/a | 0.000 | 0.000 | 3.961 | 203.981 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b33000000000000000cf | 207.970 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 207.261 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b33000000000000000e1 | 207.560 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 206.347 | 0.008 | n/a | 0.130 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b33000000000000000d2 | 206.113 | 0.000 | n/a | 0.000 | 0.000 | 1.049 | 204.863 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b33000000000000000dd | 205.495 | 0.000 | n/a | 0.000 | 0.000 | 4.249 | 201.045 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-85/journal/page | none observed |
| 6eead0acc776b33000000000000000c7 | 205.172 | 0.000 | n/a | 0.000 | 0.000 | 3.895 | 201.050 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b33000000000000000d8 | 205.145 | 0.000 | n/a | 0.000 | 0.000 | 3.289 | 201.621 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-68/journal/page | none observed |
| 6eead0acc776b33000000000000000e2 | 204.941 | 0.000 | n/a | 0.000 | 0.000 | 1.546 | 203.191 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-97/journal/page | none observed |
| 6eead0acc776b33000000000000000cc | 204.749 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 203.593 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b33000000000000000e0 | 204.552 | 0.000 | n/a | 0.000 | 0.000 | 3.520 | 200.822 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-96/journal/page | none observed |
| 6eead0acc776b33000000000000000d6 | 204.095 | 0.000 | n/a | 0.000 | 0.000 | 2.646 | 201.129 | 0.009 | n/a | 0.121 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-91/journal/page | none observed |
| 6eead0acc776b33000000000000000c4 | 204.045 | 0.000 | n/a | 0.000 | 0.000 | 1.856 | 201.901 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b33000000000000000db | 203.680 | 0.000 | n/a | 0.000 | 0.000 | 2.409 | 201.060 | 0.009 | n/a | 0.099 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-84/journal/page | none observed |
| 6eead0acc776b33000000000000000c0 | 203.061 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 201.480 | 0.016 | n/a | 0.151 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b33000000000000000d3 | 203.019 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.884 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-79/journal/page | none observed |
| 6eead0acc776b33000000000000000c1 | 202.942 | 0.000 | n/a | 0.000 | 0.000 | 1.134 | 201.573 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b33000000000000000d7 | 202.609 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 201.361 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-71/journal/page | none observed |
| 6eead0acc776b33000000000000000c5 | 202.514 | 0.000 | n/a | 0.000 | 0.000 | 1.205 | 201.096 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.109 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 200.856 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 215.532 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.357 | 211.128 | 9.350 | n/a | 0.104 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b33000000000000000f0 | 215.532 | 0.000 | n/a | 0.000 | 0.000 | 7.357 | 207.948 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-108/journal/page | none observed |
| 6eead0acc776b33000000000000000f4 | 212.704 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 211.128 | 0.006 | n/a | 0.104 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b3300000000000000100 | 210.649 | 0.000 | n/a | 0.000 | 0.000 | 2.270 | 198.818 | 9.350 | n/a | 0.019 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-92/journal/page | none observed |
| 6eead0acc776b3300000000000000105 | 210.121 | 0.000 | n/a | 0.000 | 0.000 | 6.932 | 203.019 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-95/journal/page | none observed |
| 6eead0acc776b33000000000000000fa | 208.642 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 207.553 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b33000000000000000f5 | 206.750 | 0.000 | n/a | 0.000 | 0.000 | 3.511 | 203.021 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-75/journal/page | none observed |
| 6eead0acc776b33000000000000000ed | 205.355 | 0.000 | n/a | 0.000 | 0.000 | 4.327 | 200.856 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b33000000000000000f1 | 205.345 | 0.000 | n/a | 0.000 | 0.000 | 3.965 | 201.106 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-110/journal/page | none observed |
| 6eead0acc776b33000000000000000e8 | 204.815 | 0.000 | n/a | 0.000 | 0.000 | 1.661 | 202.951 | 0.019 | n/a | 0.073 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b33000000000000000e3 | 204.331 | 0.000 | n/a | 0.000 | 0.000 | 3.301 | 200.809 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-93/journal/page | none observed |
| 6eead0acc776b33000000000000000ea | 203.837 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 202.678 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-103/journal/page | none observed |
| 6eead0acc776b33000000000000000e5 | 203.760 | 0.000 | n/a | 0.000 | 0.000 | 2.744 | 200.819 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-81/journal/page | none observed |
| 6eead0acc776b3300000000000000102 | 202.752 | 0.000 | n/a | 0.000 | 0.000 | 1.832 | 200.755 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b33000000000000000ec | 202.547 | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 201.083 | 0.017 | n/a | 0.073 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-106/journal/page | none observed |
| 6eead0acc776b33000000000000000f8 | 202.500 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 201.091 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-69/journal/page | none observed |
| 6eead0acc776b33000000000000000ff | 202.424 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.511 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-68/journal/page | none observed |
| 6eead0acc776b3300000000000000104 | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.233 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-85/journal/page | none observed |
| 6eead0acc776b33000000000000000fd | 202.165 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 201.348 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-91/journal/page | none observed |
| 6eead0acc776b3300000000000000103 | 202.109 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 200.812 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-78/journal/page | none observed |
| 6eead0acc776b33000000000000000f9 | 202.095 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.040 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-79/journal/page | none observed |

## P3 / L1024 / read (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.193 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.883 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 207.123 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.099 | 205.224 | 7.031 | n/a | 3.050 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b330000000000000012c | 207.123 | 0.000 | n/a | 0.000 | 0.000 | 6.099 | 200.824 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-86/journal/page | none observed |
| 6eead0acc776b330000000000000010f | 206.158 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 205.224 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-98/journal/page | none observed |
| 6eead0acc776b330000000000000011a | 204.908 | 0.000 | n/a | 0.000 | 0.000 | 1.677 | 202.993 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b330000000000000012f | 204.843 | 0.000 | n/a | 0.000 | 0.000 | 3.514 | 201.091 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-94/journal/page | none observed |
| 6eead0acc776b3300000000000000133 | 204.610 | 0.000 | n/a | 0.000 | 0.000 | 3.510 | 200.883 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 6eead0acc776b330000000000000010a | 204.425 | 0.000 | n/a | 0.000 | 0.000 | 2.861 | 201.402 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-90/journal/page | none observed |
| 6eead0acc776b3300000000000000132 | 203.333 | 0.000 | n/a | 0.000 | 0.000 | 1.199 | 201.874 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-90/journal/page | none observed |
| 6eead0acc776b330000000000000011c | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 1.919 | 200.753 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-113/journal/page | none observed |
| 6eead0acc776b3300000000000000112 | 202.707 | 0.000 | n/a | 0.000 | 0.000 | 1.747 | 200.787 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-102/journal/page | none observed |
| 6eead0acc776b330000000000000012a | 202.665 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 201.567 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-96/journal/page | none observed |
| 6eead0acc776b3300000000000000116 | 202.627 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 201.376 | 0.023 | n/a | 0.093 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-108/journal/page | none observed |
| 6eead0acc776b3300000000000000110 | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 200.832 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-106/journal/page | none observed |
| 6eead0acc776b3300000000000000131 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.505 | 200.820 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-74/journal/page | none observed |
| 6eead0acc776b3300000000000000129 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 1.185 | 201.025 | 0.005 | n/a | 0.077 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-84/journal/page | none observed |
| 6eead0acc776b3300000000000000125 | 202.406 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.175 | 0.006 | n/a | 0.113 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-73/journal/page | none observed |
| 6eead0acc776b330000000000000012d | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.262 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-87/journal/page | none observed |
| 6eead0acc776b3300000000000000111 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 201.237 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b3300000000000000114 | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 201.402 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000123 | 202.210 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 201.427 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-70/journal/page | none observed |
| 6eead0acc776b330000000000000010c | 202.193 | 0.000 | n/a | 0.000 | 0.000 | 2.094 | 195.059 | 4.898 | n/a | 0.022 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-88/journal/page | none observed |

## P3 / recovery / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.879 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 200.817 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 |
| p99 | 206.578 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.681 | 204.627 | 7.104 | n/a | 0.101 | 0.000 | n/a | n/a | 0.986 | 0.000 | 0.000 | 0.986 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b330000000000000013b | 206.578 | 0.000 | n/a | 0.000 | 0.000 | 1.791 | 204.627 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000143 | 205.502 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 204.610 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-75/journal/page | none observed |
| 6eead0acc776b330000000000000014a | 205.030 | 0.000 | n/a | 0.000 | 0.000 | 1.353 | 203.507 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-72/journal/page | none observed |
| 6eead0acc776b3300000000000000152 | 204.849 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 203.881 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-86/journal/page | none observed |
| 6eead0acc776b330000000000000013f | 203.828 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 202.946 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-69/journal/page | none observed |
| 6eead0acc776b3300000000000000139 | 203.683 | 0.000 | n/a | 0.000 | 0.000 | 2.665 | 200.770 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b3300000000000000155 | 203.055 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 202.196 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-94/journal/page | none observed |
| 6eead0acc776b330000000000000013c | 202.920 | 0.000 | n/a | 0.000 | 0.000 | 1.091 | 201.622 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-107/journal/page | none observed |
| 6eead0acc776b3300000000000000151 | 202.721 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.460 | 0.194 | n/a | 0.083 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b3300000000000000150 | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 201.326 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-96/journal/page | none observed |
| 6eead0acc776b3300000000000000135 | 202.621 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 201.032 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-100/journal/page | none observed |
| 6eead0acc776b3300000000000000153 | 202.403 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 201.399 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-87/journal/page | none observed |
| 6eead0acc776b3300000000000000141 | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.744 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.986 | 0.000 | 0.000 | 0.986 | gw-r/thread-109/journal/page | none observed |
| 6eead0acc776b330000000000000013e | 202.279 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 201.442 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b3300000000000000137 | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 200.949 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b330000000000000014c | 202.039 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 200.992 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-92/journal/page | none observed |
| 6eead0acc776b3300000000000000159 | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 200.808 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-99/journal/page | none observed |
| 6eead0acc776b3300000000000000140 | 201.933 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 200.991 | 0.017 | n/a | 0.069 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b330000000000000014b | 201.893 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 200.811 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-70/journal/page | none observed |
| 6eead0acc776b330000000000000014f | 201.879 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.927 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-95/journal/page | none observed |

## P3 / p4mix / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.640 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.738 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 207.757 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.247 | 204.201 | 10.987 | n/a | 0.184 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b330000000000000015c | 207.757 | 0.000 | n/a | 0.000 | 0.000 | 5.247 | 202.341 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-100/journal/page | none observed |
| 6eead0acc776b3300000000000000175 | 205.082 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 204.201 | 0.065 | n/a | 0.184 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-84/journal/page | none observed |
| 6eead0acc776b330000000000000017a | 204.462 | 0.000 | n/a | 0.000 | 0.000 | 3.552 | 200.738 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-80/journal/page | none observed |
| 6eead0acc776b330000000000000017f | 204.118 | 0.000 | n/a | 0.000 | 0.000 | 0.413 | 203.549 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-97/journal/page | none observed |
| 6eead0acc776b330000000000000015f | 204.069 | 0.000 | n/a | 0.000 | 0.000 | 3.178 | 200.736 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-103/journal/page | none observed |
| 6eead0acc776b3300000000000000161 | 202.117 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.165 | 0.018 | n/a | 0.075 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-98/journal/page | none observed |
| 6eead0acc776b330000000000000015e | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.215 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b3300000000000000164 | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 201.091 | 0.008 | n/a | 0.111 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-112/journal/page | none observed |
| 6eead0acc776b3300000000000000168 | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 201.104 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-69/journal/page | none observed |
| 6eead0acc776b330000000000000017b | 202.017 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 200.823 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-93/journal/page | none observed |
| 6eead0acc776b3300000000000000174 | 201.966 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 200.945 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-85/journal/page | none observed |
| 6eead0acc776b3300000000000000181 | 201.937 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 200.807 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-101/journal/page | none observed |
| 6eead0acc776b3300000000000000163 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.946 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b3300000000000000169 | 201.906 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 200.954 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b330000000000000016c | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 201.031 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b3300000000000000179 | 201.757 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 200.784 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-76/journal/page | none observed |
| 6eead0acc776b330000000000000016a | 201.716 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 200.963 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-75/journal/page | none observed |
| 6eead0acc776b3300000000000000167 | 201.679 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 200.905 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b3300000000000000160 | 201.664 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 200.750 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| 6eead0acc776b330000000000000017d | 201.640 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 200.716 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-89/journal/page | none observed |

## P3 / p4h1 / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.500 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.682 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 204.478 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.872 | 203.543 | 3.065 | n/a | 0.105 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000195 | 204.478 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 203.543 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-109/journal/page | none observed |
| 6eead0acc776b3300000000000000197 | 202.755 | 0.000 | n/a | 0.000 | 0.000 | 1.872 | 200.711 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-72/journal/page | none observed |
| 6eead0acc776b33000000000000001b3 | 202.356 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 201.238 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-62/journal/page | none observed |
| 6eead0acc776b3300000000000000198 | 202.044 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.065 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-73/journal/page | none observed |
| 6eead0acc776b33000000000000001a6 | 201.970 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 200.893 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-101/journal/page | none observed |
| 6eead0acc776b3300000000000000192 | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 201.065 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-77/journal/page | none observed |
| 6eead0acc776b3300000000000000191 | 201.957 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 200.996 | 0.019 | n/a | 0.087 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-82/journal/page | none observed |
| 6eead0acc776b3300000000000000196 | 201.905 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.986 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-91/journal/page | none observed |
| 6eead0acc776b33000000000000001b7 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 200.863 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-77/journal/page | none observed |
| 6eead0acc776b3300000000000000190 | 201.742 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 200.868 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-79/journal/page | none observed |
| 6eead0acc776b33000000000000001b4 | 201.716 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 200.905 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b3300000000000000199 | 201.704 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 200.940 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-70/journal/page | none observed |
| 6eead0acc776b33000000000000001a8 | 201.629 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 200.744 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-81/journal/page | none observed |
| 6eead0acc776b33000000000000001b2 | 201.614 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 200.772 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b330000000000000018f | 201.605 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.739 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-75/journal/page | none observed |
| 6eead0acc776b33000000000000001b8 | 201.557 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.672 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 6eead0acc776b33000000000000001ac | 201.530 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.671 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-103/journal/page | none observed |
| 6eead0acc776b33000000000000001a9 | 201.522 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 200.872 | 0.016 | n/a | 0.062 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-100/journal/page | none observed |
| 6eead0acc776b330000000000000019e | 201.513 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.669 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-87/journal/page | none observed |
| 6eead0acc776b33000000000000001a7 | 201.500 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 200.682 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-88/journal/page | none observed |

## P3 / grow3 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.201 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 50.502 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 66.533 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.016 | 65.204 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b33000000000000001bb | 66.533 | 0.000 | n/a | 0.000 | 0.000 | 1.047 | 65.204 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-45/journal/page | none observed |
| 6eead0acc776b33000000000000001be | 62.727 | 0.000 | n/a | 0.000 | 0.000 | 0.481 | 62.108 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b33000000000000001cd | 52.201 | 0.000 | n/a | 0.000 | 0.000 | 2.016 | 50.035 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b33000000000000001c6 | 51.181 | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 50.502 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-99/journal/page | none observed |

## P3 / p4h3 / read (36 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.663 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.798 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 207.911 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.906 | 205.515 | 5.036 | n/a | 0.103 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b33000000000000001f9 | 207.911 | 0.000 | n/a | 0.000 | 0.000 | 6.823 | 200.898 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-70/journal/page | none observed |
| 6eead0acc776b3300000000000000207 | 206.212 | 0.000 | n/a | 0.000 | 0.000 | 0.557 | 205.515 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-81/journal/page | none observed |
| 6eead0acc776b330000000000000021d | 205.606 | 0.000 | n/a | 0.000 | 0.000 | 2.068 | 203.314 | 0.016 | n/a | 0.070 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b3300000000000000204 | 205.179 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 204.491 | 0.027 | n/a | 0.063 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-101/journal/page | none observed |
| 6eead0acc776b33000000000000001f5 | 203.693 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 202.757 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-73/journal/page | none observed |
| 6eead0acc776b3300000000000000216 | 203.632 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 202.727 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-113/journal/page | none observed |
| 6eead0acc776b3300000000000000203 | 203.206 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 202.393 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-93/journal/page | none observed |
| 6eead0acc776b3300000000000000214 | 203.191 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 201.580 | 0.006 | n/a | 0.103 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b33000000000000001fa | 202.495 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 201.514 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-92/journal/page | none observed |
| 6eead0acc776b330000000000000021c | 202.211 | 0.000 | n/a | 0.000 | 0.000 | 0.972 | 200.906 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-73/journal/page | none observed |
| 6eead0acc776b3300000000000000210 | 202.109 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 201.254 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-107/journal/page | none observed |
| 6eead0acc776b330000000000000020d | 201.991 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 201.113 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-102/journal/page | none observed |
| 6eead0acc776b3300000000000000219 | 201.908 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.952 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-77/journal/page | none observed |
| 6eead0acc776b33000000000000001fc | 201.784 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 200.831 | 0.006 | n/a | 0.089 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-95/journal/page | none observed |
| 6eead0acc776b33000000000000001fe | 201.747 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.794 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-96/journal/page | none observed |
| 6eead0acc776b3300000000000000213 | 201.741 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 200.854 | 0.018 | n/a | 0.050 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b33000000000000001f8 | 201.723 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 200.878 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 6eead0acc776b330000000000000020c | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.697 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000211 | 201.663 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 200.908 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-108/journal/page | none observed |
| 6eead0acc776b3300000000000000206 | 201.641 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.798 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-97/journal/page | none observed |

## P3 / p4h10 / read (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.510 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 200.696 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 206.119 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.093 | 203.921 | 1.947 | n/a | 1.610 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b3300000000000000300 | 206.119 | 0.000 | n/a | 0.000 | 0.000 | 4.093 | 200.308 | 0.011 | n/a | 1.610 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b33000000000000002e1 | 204.611 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 203.921 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b33000000000000002e4 | 202.806 | 0.000 | n/a | 0.000 | 0.000 | 0.525 | 202.121 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-98/journal/page | none observed |
| 6eead0acc776b33000000000000002f4 | 202.005 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 201.000 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-89/journal/page | none observed |
| 6eead0acc776b33000000000000002df | 201.845 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 200.934 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-103/journal/page | none observed |
| 6eead0acc776b33000000000000002ed | 201.782 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.815 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-72/journal/page | none observed |
| 6eead0acc776b33000000000000002fa | 201.772 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.647 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-86/journal/page | none observed |
| 6eead0acc776b33000000000000002f6 | 201.734 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 200.870 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-63/journal/page | none observed |
| 6eead0acc776b33000000000000002f2 | 201.718 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.852 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-85/journal/page | none observed |
| 6eead0acc776b33000000000000002fc | 201.716 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 200.820 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-101/journal/page | none observed |
| 6eead0acc776b33000000000000002ff | 201.712 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 200.665 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-43/journal/page | none observed |
| 6eead0acc776b33000000000000002f8 | 201.686 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 200.923 | 0.006 | n/a | 0.136 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-87/journal/page | none observed |
| 6eead0acc776b33000000000000002fd | 201.677 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 200.729 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-88/journal/page | none observed |
| 6eead0acc776b33000000000000002dd | 201.653 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 200.859 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b33000000000000002f1 | 201.643 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 200.901 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-94/journal/page | none observed |
| 6eead0acc776b33000000000000002e5 | 201.605 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 200.862 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-69/journal/page | none observed |
| 6eead0acc776b33000000000000002d9 | 201.541 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 200.656 | 0.015 | n/a | 0.053 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b33000000000000002fb | 201.525 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.776 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-81/journal/page | none observed |
| 6eead0acc776b33000000000000002f0 | 201.520 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 200.800 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-92/journal/page | none observed |
| 6eead0acc776b33000000000000002d8 | 201.510 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 200.734 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |

## P3 / presweep / read (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.673 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.757 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 207.134 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.781 | 203.728 | 0.670 | n/a | 0.116 | 0.000 | n/a | n/a | 50.773 | 0.000 | 0.000 | 50.773 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b330000000000000030e | 207.134 | 0.000 | n/a | 0.000 | 0.000 | 5.989 | 200.972 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-77/journal/page | none observed |
| 6eead0acc776b3300000000000000316 | 204.616 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 203.728 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-80/journal/page | none observed |
| 6eead0acc776b3300000000000000319 | 203.584 | 0.000 | n/a | 0.000 | 0.000 | 0.510 | 202.880 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-85/journal/page | none observed |
| 6eead0acc776b3300000000000000305 | 203.549 | 0.000 | n/a | 0.000 | 0.000 | 2.588 | 200.792 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-100/journal/page | none observed |
| 6eead0acc776b3300000000000000310 | 203.262 | 0.000 | n/a | 0.000 | 0.000 | 2.341 | 200.703 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-83/journal/page | none observed |
| 6eead0acc776b3300000000000000304 | 203.254 | 0.000 | n/a | 0.000 | 0.000 | 2.360 | 200.731 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-112/journal/page | none observed |
| 6eead0acc776b3300000000000000314 | 203.198 | 0.000 | n/a | 0.000 | 0.000 | 2.099 | 200.856 | 0.005 | n/a | 0.072 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-73/journal/page | none observed |
| 6eead0acc776b3300000000000000302 | 203.187 | 0.000 | n/a | 0.000 | 0.000 | 2.229 | 200.801 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b3300000000000000301 | 202.800 | 0.000 | n/a | 0.000 | 0.000 | 1.759 | 200.828 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-102/journal/page | none observed |
| 6eead0acc776b3300000000000000303 | 202.713 | 0.000 | n/a | 0.000 | 0.000 | 1.682 | 200.858 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-106/journal/page | none observed |
| 6eead0acc776b3300000000000000306 | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 201.212 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.615 | 0.000 | 0.000 | 0.615 | gw-r/thread-107/journal/page | none observed |
| 6eead0acc776b330000000000000031b | 202.024 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 200.903 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-89/journal/page | none observed |
| 6eead0acc776b330000000000000030a | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 200.896 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-82/journal/page | none observed |
| 6eead0acc776b3300000000000000311 | 201.729 | 0.000 | n/a | 0.000 | 0.000 | 0.645 | 200.850 | 0.005 | n/a | 0.116 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-79/journal/page | none observed |
| 6eead0acc776b330000000000000030b | 201.687 | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 200.917 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-109/journal/page | none observed |
| 6eead0acc776b330000000000000031a | 201.673 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.783 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-84/journal/page | none observed |
| 6eead0acc776b3300000000000000307 | 201.667 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.757 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-64/journal/page | none observed |
| 6eead0acc776b3300000000000000317 | 201.614 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.667 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-95/journal/page | none observed |
| 6eead0acc776b330000000000000030c | 201.559 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.625 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-75/journal/page | none observed |
| 6eead0acc776b3300000000000000312 | 201.531 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 200.762 | 0.016 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-70/journal/page | none observed |

## P3 / tail / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.532 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.437 | 63.302 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 143.571 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.690 | 143.133 | 1.165 | n/a | 0.064 | 0.000 | n/a | n/a | 79.434 | 0.000 | 0.000 | 79.434 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6eead0acc776b33000000000000003d7 | 176.754 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 175.985 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/gateway.admitted-work | none observed |
| 6eead0acc776b3300000000000000e88 | 143.571 | 0.000 | n/a | 0.000 | 0.000 | 0.302 | 143.133 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-114/journal/page | none observed |
| 6eead0acc776b3300000000000000962 | 137.577 | 0.000 | n/a | 0.000 | 0.000 | 3.385 | 134.050 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-102/journal/page | none observed |
| 6eead0acc776b3300000000000000c3f | 131.059 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 130.456 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-102/journal/page | none observed |
| 6eead0acc776b3300000000000000e44 | 123.494 | 0.000 | n/a | 0.000 | 0.000 | 48.930 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.564 | 0.000 | 0.000 | 74.564 | node-14/thread-9/socket.wait-first-byte | none observed |
| 6eead0acc776b330000000000000066d | 111.948 | 0.000 | n/a | 0.000 | 0.000 | 0.366 | 111.473 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-101/journal/page | none observed |
| 6eead0acc776b33000000000000007d8 | 106.624 | 0.000 | n/a | 0.000 | 0.000 | 0.270 | 106.229 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-73/journal/page | none observed |
| 6eead0acc776b3300000000000000616 | 104.586 | 0.000 | n/a | 0.000 | 0.000 | 0.541 | 103.944 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-74/journal/page | none observed |
| 6eead0acc776b3300000000000000cd5 | 101.413 | 0.000 | n/a | 0.000 | 0.000 | 0.330 | 100.934 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-93/journal/page | none observed |
| 6eead0acc776b330000000000000076f | 98.612 | 0.000 | n/a | 0.000 | 0.000 | 0.423 | 98.066 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-108/journal/page | none observed |
| 6eead0acc776b33000000000000006a2 | 98.304 | 0.000 | n/a | 0.000 | 0.000 | 0.409 | 97.754 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-105/journal/page | none observed |
| 6eead0acc776b33000000000000009db | 96.525 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 95.857 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-80/journal/page | none observed |
| 6eead0acc776b330000000000000045b | 94.882 | 0.000 | n/a | 0.000 | 0.000 | 3.040 | 91.701 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-111/journal/page | none observed |
| 6eead0acc776b3300000000000000dca | 92.394 | 0.000 | n/a | 0.000 | 0.000 | 0.281 | 91.989 | 0.016 | n/a | 0.010 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-74/journal/page | none observed |
| 6eead0acc776b330000000000000041e | 91.916 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 90.598 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-99/journal/page | none observed |
| 6eead0acc776b33000000000000009b3 | 91.311 | 0.000 | n/a | 0.000 | 0.000 | 0.420 | 90.734 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 6eead0acc776b33000000000000004d6 | 90.169 | 0.000 | n/a | 0.000 | 0.000 | 0.359 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 89.810 | 0.000 | 0.000 | 89.810 | node-14/thread-9/socket.wait-first-byte | none observed |
| 6eead0acc776b3300000000000000b02 | 88.468 | 0.000 | n/a | 0.000 | 0.000 | 0.252 | 88.105 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-87/journal/page | none observed |
| 6eead0acc776b330000000000000076b | 86.818 | 0.000 | n/a | 0.000 | 0.000 | 0.413 | 86.256 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-84/journal/page | none observed |
| 6eead0acc776b3300000000000000584 | 86.288 | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 85.653 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3390 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/4.204 ms; post-ACK p50/p99: 0.372/1.961 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.630 | 10.161 | 9.936 | reported |
| All-primary p99 ms | 105.531 | 105.298 | 104.669 | <=50 |
| L256 5-10 p50Ms | 16.319 | 15.807 | 15.807 | <=10 |
| L256 5-10 p99Ms | 120.304 | 119.810 | 119.808 | <=50 |
| L256 11-25 p50Ms | 28.671 | 28.031 | 27.135 | <=10 |
| L256 11-25 p99Ms | 34.794 | 34.161 | 34.157 | <=50 |
| L256 26-50 p50Ms | 22.269 | 21.050 | 21.048 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 22.269 | 21.050 | 21.048 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.215 | 8.895 | 8.703 | <=10 |
| Burst 11-25 p50 ms | 11.263 | 10.687 | 10.495 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 120.304 | 119.810 | 119.808 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 105.211 | 104.674 | 104.669 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 7 | 24.412/51.004 | 23.307 | 14.642 | 27.612 | 0.099/0.046 |
| 5-10 | >=1000 | 25 | 17.590/106.281 | 16.653 | 11.459 | 28.059 | 0.063/0.021 |
| 5-10 | 250-1000 | 28 | 19.517/120.254 | 19.091 | 14.540 | 32.490 | 0.067/0.020 |
| 11-25 | 250-1000 | 18 | 18.139/41.904 | 17.530 | 11.901 | 28.949 | 0.073/0.021 |
| 5-10 | 100-250 | 14 | 13.803/41.651 | 13.339 | 9.062 | 19.134 | 0.057/0.019 |
| 11-25 | >=1000 | 12 | 27.694/153.380 | 27.025 | 20.349 | 46.944 | 0.075/0.021 |
| 26-50 | 250-1000 | 7 | 34.547/37.487 | 33.733 | 18.730 | 55.408 | 0.129/0.021 |
| 11-25 | 100-250 | 4 | 12.683/117.317 | 12.207 | 8.302 | 19.468 | 0.067/0.020 |
| 11-25 | 0-50 | 542 | 10.207/29.721 | 9.557 | 5.111 | 12.813 | 0.049/0.018 |
| 5-10 | 0-50 | 1142 | 8.082/27.423 | 7.757 | 4.391 | 10.864 | 0.042/0.017 |
| 5-10 | 50-100 | 57 | 7.896/20.962 | 7.667 | 4.475 | 11.349 | 0.052/0.018 |
| 26-50 | overlap | 141 | 16.357/109.478 | 14.972 | 8.793 | 21.161 | 0.056/0.018 |
| 11-25 | 50-100 | 38 | 11.453/27.318 | 10.382 | 6.605 | 16.422 | 0.057/0.017 |
| 5-10 | overlap | 783 | 9.866/73.896 | 9.543 | 6.147 | 13.637 | 0.034/0.016 |
| 11-25 | overlap | 361 | 11.857/69.994 | 11.263 | 6.892 | 16.064 | 0.039/0.017 |
| 26-50 | 0-50 | 197 | 14.093/61.971 | 12.849 | 7.152 | 17.867 | 0.059/0.018 |
| 26-50 | 50-100 | 14 | 14.275/22.444 | 13.243 | 6.887 | 16.966 | 0.071/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 229 | 19 | 1500.730 |
| burst | 3158 | 78 | 7757.560 |
| growth | 3 | 0 | 0.000 |

## Writer heap, GC and scheduler stalls

Source 8c61d55a1ef76a8af61f1ece811d8b30c442c23c; 3390 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 133.485 / 313.584 |
| GC events / total duration / maximum ms | 689 / 1084.255 / 11.457 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":667,"4":11,"8":11} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 105.531 / 97 / 9258.290 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
