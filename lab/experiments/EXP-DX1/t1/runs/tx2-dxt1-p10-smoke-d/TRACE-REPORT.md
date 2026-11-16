# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (155.580 ms, trace `b1ec81021c5b5b680000000000000074`); `node-14/thread-0/driver.queue.subject` (93.387 ms, trace `b1ec81021c5b5b6800000000000002ee`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (108.405 ms, trace `b1ec81021c5b5b6800000000000002e9`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (112.508 ms, trace `b1ec81021c5b5b6800000000000002ef`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (106.139 ms, trace `b1ec81021c5b5b6800000000000002ea`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-smoke-d`; source `baae1e0a4188a0371f72c4167fe7fef47ed6ad1c`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3488/3488 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3488/3488. Raw trace bytes: 9576753.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 214 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 6098.802 | 695.586 | 19.786 | 140 |
| baseline | 0 | 4796.591 | 83.991 | 1.282 | 140 |
| L1 | 1 | 6387.352 | 391.735 | 10.833 | 87 |
| L4 | 4 | 7847.104 | 751.088 | 14.047 | 275 |
| L16 | 16 | 5303.569 | 497.096 | 9.355 | 160 |
| L64 | 64 | 6562.970 | 646.712 | 25.210 | 142 |
| L256 | 256 | 7044.041 | 668.051 | 12.633 | 180 |
| L1024 | 256 | 6791.308 | 612.681 | 15.410 | 242 |
| recovery | 256 | 5975.524 | 559.128 | 10.585 | 140 |
| p4mix | 1 | 4636.296 | 92.797 | 2.005 | 182 |
| p4h1 | 1 | 7145.100 | 166.427 | 3.502 | 240 |
| grow3 | 0 | 36.016 | 10.815 | 0.001 | 22 |
| p4h3 | 1 | 7112.295 | 130.956 | 12.976 | 220 |
| grow10 | 0 | 1793.218 | 441.443 | 5.288 | 60 |
| p4h10 | 1 | 7502.389 | 143.427 | 4.086 | 222 |
| presweep | 64 | 4350.276 | 453.373 | 21.334 | 445 |
| sweep | 64 | 106.233 | 50.705 | 8.079 | 232 |
| tail | 0 | 59486.035 | 15242.401 | 133.517 | 67440 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| b1ec81021c5b5b680000000000000074 | driver.queue.scheduler-dispatch | 0.048 | none | 0 / 32 |
| b1ec81021c5b5b680000000000000074 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace b1ec81021c5b5b680000000000000074 waited: []

| b1ec81021c5b5b6800000000000002ee | driver.queue.subject | 93.387 | b1ec81021c5b5b6800000000000002ed | 12 / 32 |
| b1ec81021c5b5b6800000000000002ee | driver.queue.scheduler-late | 1.303 | none | 12 / 32 |
| b1ec81021c5b5b6800000000000002ee | driver.queue.scheduler-dispatch | 0.087 | none | 9 / 32 |

Observed active steps while trace b1ec81021c5b5b6800000000000002ee waited: [{"at":1794790636341.76,"inFlight":13,"capacity":32,"active":[{"traceId":"b1ec81021c5b5b6800000000000002e3","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e4","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e5","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e6","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e7","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e8","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e9","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ea","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002eb","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ed","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f0","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ec","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ef","step":"client.http"}]},{"at":1794790636360.9622,"inFlight":11,"capacity":32,"active":[{"traceId":"b1ec81021c5b5b6800000000000002e6","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e7","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e8","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e9","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ea","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002eb","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ed","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f0","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ec","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ef","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f2","step":"client.http"}]},{"at":1794790636380.8154,"inFlight":10,"capacity":32,"active":[{"traceId":"b1ec81021c5b5b6800000000000002e8","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e9","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ea","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002eb","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ed","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f0","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ec","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ef","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f2","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f3","step":"client.http"}]},{"at":1794790636401.6123,"inFlight":11,"capacity":32,"active":[{"traceId":"b1ec81021c5b5b6800000000000002e8","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002e9","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ea","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ed","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f0","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ec","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002ef","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f2","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f3","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f5","step":"client.http"},{"traceId":"b1ec81021c5b5b6800000000000002f6","step":"client.http"}]}]

| b1ec81021c5b5b6800000000000002e9 | driver.queue.scheduler-dispatch | 0.006 | none | 8 / 32 |
| b1ec81021c5b5b6800000000000002e9 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace b1ec81021c5b5b6800000000000002e9 waited: []

| b1ec81021c5b5b6800000000000002ef | driver.queue.subject | 15.367 | b1ec81021c5b5b6800000000000002e2 | 12 / 32 |
| b1ec81021c5b5b6800000000000002ef | driver.queue.scheduler-dispatch | 0.095 | none | 12 / 32 |
| b1ec81021c5b5b6800000000000002ef | driver.queue.scheduler-late | 0.006 | none | 12 / 32 |

Observed active steps while trace b1ec81021c5b5b6800000000000002ef waited: []

| b1ec81021c5b5b6800000000000002ea | driver.queue.scheduler-dispatch | 0.005 | none | 9 / 32 |
| b1ec81021c5b5b6800000000000002ea | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace b1ec81021c5b5b6800000000000002ea waited: []

## P2 / warmup / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.670 | 1.000 | 0.000 | 0.765 | 3.634 | n/a | 0.000 | 0.111 | 1.176 | 1.885 | 0.023 | n/a | 0.720 | 14.321 | n/a | n/a | 0.053 | 3.745 | 0.173 | 0.053 |
| p99 | 53.304 | 2.377 | 0.000 | 2.217 | 10.779 | n/a | 0.000 | 0.210 | 4.120 | 13.693 | 0.044 | n/a | 3.900 | 25.450 | n/a | n/a | 0.211 | 10.989 | 0.206 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000038 | 53.304 | 10.779 | n/a | 0.000 | 0.210 | 2.833 | 13.693 | 0.044 | n/a | 0.157 | 25.450 | n/a | n/a | 0.138 | 10.989 | 0.206 | 0.138 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000048 | 27.226 | 4.968 | n/a | 0.000 | 0.070 | 1.176 | 3.561 | 0.038 | n/a | 1.012 | 16.374 | n/a | n/a | 0.026 | 5.039 | 0.185 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| b1ec81021c5b5b68000000000000003f | 24.391 | 3.721 | n/a | 0.000 | 0.173 | 2.373 | 1.885 | 0.022 | n/a | 0.720 | 15.444 | n/a | n/a | 0.053 | 3.894 | 0.160 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000045 | 23.670 | 2.990 | n/a | 0.000 | 0.053 | 0.778 | 1.581 | 0.023 | n/a | 3.900 | 14.321 | n/a | n/a | 0.025 | 3.043 | 0.129 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.387ms |
| b1ec81021c5b5b68000000000000004b | 18.248 | 3.634 | n/a | 0.000 | 0.111 | 0.972 | 2.998 | 0.023 | n/a | 0.242 | 10.058 | n/a | n/a | 0.211 | 3.745 | 0.205 | 0.211 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000003c | 17.823 | 2.945 | n/a | 0.000 | 0.135 | 0.976 | 1.697 | 0.020 | n/a | 3.018 | 8.972 | n/a | n/a | 0.060 | 3.080 | 0.173 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms |
| b1ec81021c5b5b680000000000000042 | 17.236 | 2.421 | n/a | 0.000 | 0.101 | 4.120 | 1.521 | 0.021 | n/a | 0.128 | 8.888 | n/a | n/a | 0.036 | 2.522 | 0.146 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |

## P2/P4 / read-your-own-write / read (133 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.452 | n/a | n/a | n/a | 36.748 | 16.185 | 2.548 | 0.000 | 0.303 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.883 | 63.064 | 0.745 | 22.883 |
| p99 | 293.463 | n/a | n/a | n/a | 133.361 | 184.013 | 23.476 | 0.000 | 61.938 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 165.471 | 229.401 | 1.000 | 165.471 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000001d48 | 316.483 | 96.849 | 30.637 | 10.503 | 0.000 | 0.344 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 178.150 | 137.990 | 0.436 | 178.150 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.312ms; driver.reader-basis.broadcast 0.305ms; driver.publication.readback 0.268ms; driver.publication.readback 0.114ms |
| b1ec81021c5b5b680000000000001a2b | 293.463 | 24.074 | 184.013 | 0.000 | 0.000 | 0.338 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.038 | 208.086 | 0.709 | 85.038 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.301ms; driver.publication.readback 0.120ms; driver.publication.readback 0.115ms; driver.publication.readback 0.074ms |
| b1ec81021c5b5b680000000000001c20 | 282.353 | 54.263 | 159.112 | 4.323 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.405 | 217.698 | 0.771 | 64.405 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.498ms; driver.publication.readback 0.440ms; driver.publication.readback 0.396ms; driver.reader-basis.broadcast 0.319ms; driver.publication.persist-deferred 0.285ms |
| b1ec81021c5b5b68000000000000153a | 273.644 | 48.334 | 150.854 | 1.882 | 0.000 | 0.516 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 72.058 | 201.071 | 0.735 | 72.058 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.939ms; driver.reader-basis.broadcast 0.827ms; driver.reader-basis.broadcast 0.510ms; driver.reader-basis.broadcast 0.449ms; driver.publication.readback 0.221ms |
| b1ec81021c5b5b680000000000001c2d | 273.292 | 68.612 | 85.606 | 5.916 | 0.000 | 0.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 112.938 | 160.133 | 0.586 | 112.938 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.498ms; driver.publication.readback 0.440ms; driver.publication.persist-deferred 0.285ms; driver.reader-basis.broadcast 0.283ms; driver.publication.readback 0.131ms |
| b1ec81021c5b5b680000000000001a29 | 269.938 | 27.047 | 106.645 | 4.736 | 0.000 | 0.275 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 131.236 | 138.427 | 0.513 | 131.236 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.313ms; driver.reader-basis.broadcast 0.301ms; driver.publication.readback 0.120ms; driver.publication.readback 0.116ms |
| b1ec81021c5b5b680000000000001c1b | 261.878 | 73.233 | 161.877 | 9.421 | 0.000 | 0.419 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.929 | 244.531 | 0.934 | 16.929 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.498ms; driver.publication.readback 0.396ms; driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.131ms; driver.publication.readback 0.118ms |
| b1ec81021c5b5b680000000000001d4a | 252.530 | 90.641 | 27.098 | 8.915 | 0.000 | 0.276 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 125.601 | 126.653 | 0.502 | 125.601 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.305ms; driver.publication.readback 0.268ms; driver.publication.readback 0.100ms; driver.publication.readback 0.086ms |
| b1ec81021c5b5b680000000000001c35 | 248.627 | 50.366 | 30.258 | 2.294 | 0.000 | 0.238 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 165.471 | 82.918 | 0.334 | 165.471 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.498ms; driver.publication.readback 0.440ms; driver.reader-basis.broadcast 0.294ms; driver.publication.persist-deferred 0.285ms; driver.reader-basis.broadcast 0.283ms |
| b1ec81021c5b5b68000000000000198e | 247.509 | 41.385 | 186.885 | 1.131 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.851 | 229.401 | 0.927 | 17.851 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.124ms; driver.publication.readback 0.111ms; driver.publication.readback 0.089ms |
| b1ec81021c5b5b680000000000001989 | 244.718 | 159.053 | 14.594 | 31.360 | 0.000 | 0.208 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.504 | 205.006 | 0.838 | 39.504 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.124ms; driver.publication.readback 0.111ms; driver.publication.readback 0.089ms |
| b1ec81021c5b5b68000000000000198d | 243.399 | 52.275 | 42.503 | 5.126 | 0.000 | 0.236 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 143.258 | 99.905 | 0.410 | 143.258 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.124ms; driver.publication.readback 0.111ms; driver.publication.readback 0.089ms |
| b1ec81021c5b5b680000000000001987 | 240.577 | 128.554 | 2.529 | 23.476 | 0.000 | 38.623 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.395 | 154.559 | 0.642 | 47.395 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.280ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.124ms; driver.publication.readback 0.111ms; driver.publication.readback 0.089ms |
| b1ec81021c5b5b680000000000001d3d | 229.123 | 133.361 | 48.291 | 18.125 | 0.000 | 0.376 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.970 | 199.778 | 0.872 | 28.970 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.323ms; driver.reader-basis.broadcast 0.305ms; driver.publication.readback 0.268ms; driver.publication.readback 0.100ms |
| b1ec81021c5b5b68000000000000154c | 228.649 | 51.567 | 57.405 | 6.762 | 0.000 | 0.849 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 112.065 | 115.735 | 0.506 | 112.065 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.939ms; driver.reader-basis.broadcast 0.827ms; driver.reader-basis.broadcast 0.559ms; driver.reader-basis.broadcast 0.510ms; driver.publication.readback 0.221ms |
| b1ec81021c5b5b680000000000001d3c | 219.569 | 68.061 | 33.020 | 15.790 | 0.000 | 2.847 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.850 | 116.871 | 0.532 | 99.850 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.835ms; driver.reader-basis.broadcast 0.323ms; driver.publication.readback 0.268ms; driver.publication.readback 0.100ms; driver.publication.readback 0.088ms |
| b1ec81021c5b5b680000000000001a23 | 213.823 | 52.793 | 56.629 | 10.453 | 0.000 | 0.207 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.741 | 119.875 | 0.561 | 93.741 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.313ms; driver.publication.readback 0.120ms; driver.publication.readback 0.116ms; driver.publication.readback 0.115ms |
| b1ec81021c5b5b68000000000000153e | 212.711 | 58.035 | 48.791 | 1.943 | 0.000 | 0.340 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 103.602 | 108.769 | 0.511 | 103.602 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.939ms; driver.reader-basis.broadcast 0.827ms; driver.reader-basis.broadcast 0.510ms; driver.publication.readback 0.221ms; driver.publication.readback 0.133ms |
| b1ec81021c5b5b680000000000001a39 | 211.077 | 33.468 | 93.924 | 5.767 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.646 | 133.159 | 0.631 | 77.646 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.316ms; driver.reader-basis.broadcast 0.301ms; driver.publication.readback 0.120ms; driver.publication.readback 0.115ms; driver.publication.readback 0.074ms |
| b1ec81021c5b5b680000000000001a47 | 204.890 | 29.431 | 118.490 | 1.827 | 0.000 | 0.306 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.836 | 149.748 | 0.731 | 54.836 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.301ms; driver.reader-basis.broadcast 0.270ms; driver.publication.readback 0.120ms; driver.publication.readback 0.075ms; driver.publication.readback 0.074ms |

## P2 / warmup / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.823 | 0.000 | 0.000 | 0.715 | 2.945 | n/a | 0.000 | 0.135 | 2.373 | 1.697 | 0.021 | n/a | 0.720 | 8.972 | n/a | n/a | 0.053 | 3.080 | 0.160 | 0.053 |
| p99 | 24.391 | 0.997 | 0.000 | 0.765 | 3.721 | n/a | 0.000 | 0.173 | 4.120 | 1.885 | 0.022 | n/a | 3.018 | 15.444 | n/a | n/a | 0.060 | 3.894 | 0.173 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b68000000000000003f | 24.391 | 3.721 | n/a | 0.000 | 0.173 | 2.373 | 1.885 | 0.022 | n/a | 0.720 | 15.444 | n/a | n/a | 0.053 | 3.894 | 0.160 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000003c | 17.823 | 2.945 | n/a | 0.000 | 0.135 | 0.976 | 1.697 | 0.020 | n/a | 3.018 | 8.972 | n/a | n/a | 0.060 | 3.080 | 0.173 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.090ms |
| b1ec81021c5b5b680000000000000042 | 17.236 | 2.421 | n/a | 0.000 | 0.101 | 4.120 | 1.521 | 0.021 | n/a | 0.128 | 8.888 | n/a | n/a | 0.036 | 2.522 | 0.146 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |

## P2 / baseline / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.834 | 0.402 | 0.000 | 0.519 | 2.277 | n/a | 0.000 | 0.063 | 1.122 | 2.522 | 0.031 | n/a | 1.382 | 12.567 | n/a | n/a | 0.025 | 2.355 | 0.142 | 0.025 |
| p99 | 31.649 | 1.998 | 0.000 | 2.041 | 5.460 | n/a | 0.000 | 0.115 | 1.392 | 7.917 | 0.070 | n/a | 3.469 | 17.153 | n/a | n/a | 0.034 | 5.553 | 0.175 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000055 | 31.649 | 5.460 | n/a | 0.000 | 0.094 | 1.362 | 6.505 | 0.041 | n/a | 3.469 | 14.686 | n/a | n/a | 0.032 | 5.553 | 0.175 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000060 | 25.430 | 2.878 | n/a | 0.000 | 0.115 | 1.383 | 1.522 | 0.020 | n/a | 2.326 | 17.153 | n/a | n/a | 0.034 | 2.993 | 0.118 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| b1ec81021c5b5b680000000000000058 | 23.324 | 1.875 | n/a | 0.000 | 0.056 | 0.975 | 7.917 | 0.070 | n/a | 0.470 | 11.941 | n/a | n/a | 0.021 | 1.930 | 0.083 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| b1ec81021c5b5b68000000000000005b | 22.834 | 1.794 | n/a | 0.000 | 0.054 | 1.392 | 5.152 | 0.049 | n/a | 1.382 | 12.986 | n/a | n/a | 0.024 | 1.848 | 0.081 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000004f | 17.977 | 2.604 | n/a | 0.000 | 0.059 | 0.989 | 1.535 | 0.024 | n/a | 0.167 | 12.567 | n/a | n/a | 0.033 | 2.663 | 0.148 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000052 | 16.550 | 2.277 | n/a | 0.000 | 0.078 | 0.688 | 2.463 | 0.024 | n/a | 0.402 | 10.593 | n/a | n/a | 0.025 | 2.355 | 0.142 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000005e | 14.539 | 2.181 | n/a | 0.000 | 0.063 | 1.122 | 2.522 | 0.031 | n/a | 1.628 | 6.967 | n/a | n/a | 0.025 | 2.244 | 0.154 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.977 | 0.000 | 0.000 | 0.457 | 2.181 | n/a | 0.000 | 0.059 | 0.989 | 2.463 | 0.024 | n/a | 0.470 | 11.941 | n/a | n/a | 0.025 | 2.244 | 0.118 | 0.025 |
| p99 | 25.430 | 1.003 | 0.000 | 0.919 | 2.878 | n/a | 0.000 | 0.115 | 1.392 | 7.917 | 0.070 | n/a | 2.326 | 17.153 | n/a | n/a | 0.034 | 2.993 | 0.154 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000060 | 25.430 | 2.878 | n/a | 0.000 | 0.115 | 1.383 | 1.522 | 0.020 | n/a | 2.326 | 17.153 | n/a | n/a | 0.034 | 2.993 | 0.118 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| b1ec81021c5b5b680000000000000058 | 23.324 | 1.875 | n/a | 0.000 | 0.056 | 0.975 | 7.917 | 0.070 | n/a | 0.470 | 11.941 | n/a | n/a | 0.021 | 1.930 | 0.083 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| b1ec81021c5b5b68000000000000005b | 22.834 | 1.794 | n/a | 0.000 | 0.054 | 1.392 | 5.152 | 0.049 | n/a | 1.382 | 12.986 | n/a | n/a | 0.024 | 1.848 | 0.081 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000004f | 17.977 | 2.604 | n/a | 0.000 | 0.059 | 0.989 | 1.535 | 0.024 | n/a | 0.167 | 12.567 | n/a | n/a | 0.033 | 2.663 | 0.148 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000052 | 16.550 | 2.277 | n/a | 0.000 | 0.078 | 0.688 | 2.463 | 0.024 | n/a | 0.402 | 10.593 | n/a | n/a | 0.025 | 2.355 | 0.142 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000005e | 14.539 | 2.181 | n/a | 0.000 | 0.063 | 1.122 | 2.522 | 0.031 | n/a | 1.628 | 6.967 | n/a | n/a | 0.025 | 2.244 | 0.154 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.384 | 0.935 | 0.000 | 0.591 | 3.408 | n/a | 0.000 | 0.058 | 0.937 | 3.486 | 0.051 | n/a | 0.429 | 13.315 | n/a | n/a | 0.025 | 3.458 | 0.105 | 0.025 |
| p99 | 175.523 | 1.322 | 0.000 | 1.022 | 5.508 | n/a | 0.000 | 0.116 | 4.867 | 15.073 | 0.128 | n/a | 5.331 | 155.580 | n/a | n/a | 0.044 | 5.601 | 0.223 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000074 | 175.523 | 3.408 | n/a | 0.000 | 0.050 | 1.201 | 15.073 | 0.062 | n/a | 0.128 | 155.580 | n/a | n/a | 0.021 | 3.458 | 0.020 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms; driver.reader-basis.broadcast 0.036ms |
| b1ec81021c5b5b68000000000000006c | 28.197 | 5.508 | n/a | 0.000 | 0.093 | 4.867 | 8.747 | 0.128 | n/a | 0.429 | 8.389 | n/a | n/a | 0.037 | 5.601 | 0.199 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000069 | 24.384 | 2.296 | n/a | 0.000 | 0.058 | 0.586 | 2.250 | 0.051 | n/a | 5.331 | 13.792 | n/a | n/a | 0.021 | 2.354 | 0.097 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000066 | 23.389 | 2.395 | n/a | 0.000 | 0.057 | 0.937 | 1.564 | 0.027 | n/a | 5.069 | 13.315 | n/a | n/a | 0.025 | 2.452 | 0.105 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000006f | 19.279 | 4.178 | n/a | 0.000 | 0.116 | 0.757 | 3.486 | 0.032 | n/a | 0.175 | 10.491 | n/a | n/a | 0.044 | 4.294 | 0.223 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.384 | 0.000 | 0.000 | 0.222 | 2.296 | n/a | 0.000 | 0.058 | 0.586 | 2.250 | 0.051 | n/a | 0.429 | 8.389 | n/a | n/a | 0.021 | 2.354 | 0.097 | 0.021 |
| p99 | 28.197 | 0.000 | 0.000 | 0.575 | 5.508 | n/a | 0.000 | 0.093 | 4.867 | 8.747 | 0.128 | n/a | 5.331 | 13.792 | n/a | n/a | 0.037 | 5.601 | 0.199 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b68000000000000006c | 28.197 | 5.508 | n/a | 0.000 | 0.093 | 4.867 | 8.747 | 0.128 | n/a | 0.429 | 8.389 | n/a | n/a | 0.037 | 5.601 | 0.199 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000069 | 24.384 | 2.296 | n/a | 0.000 | 0.058 | 0.586 | 2.250 | 0.051 | n/a | 5.331 | 13.792 | n/a | n/a | 0.021 | 2.354 | 0.097 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.745 | 0.558 | 0.000 | 0.651 | 2.600 | n/a | 0.000 | 0.050 | 0.851 | 5.389 | 0.039 | n/a | 0.613 | 17.338 | n/a | n/a | 0.023 | 2.649 | 0.092 | 0.023 |
| p99 | 108.593 | 1.003 | 0.000 | 1.188 | 4.752 | n/a | 0.000 | 0.064 | 2.573 | 9.126 | 0.069 | n/a | 4.419 | 91.476 | n/a | n/a | 0.036 | 4.811 | 0.246 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000083 | 108.593 | 2.636 | n/a | 0.000 | 0.054 | 0.833 | 9.126 | 0.023 | n/a | 4.419 | 91.476 | n/a | n/a | 0.023 | 2.691 | 0.025 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| b1ec81021c5b5b680000000000000092 | 47.505 | 3.139 | n/a | 0.000 | 0.053 | 0.833 | 5.635 | 0.024 | n/a | 0.228 | 37.569 | n/a | n/a | 0.024 | 3.192 | 0.067 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000007d | 43.031 | 4.752 | n/a | 0.000 | 0.060 | 0.789 | 6.394 | 0.028 | n/a | 0.537 | 30.449 | n/a | n/a | 0.024 | 4.811 | 0.112 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000007a | 41.420 | 2.977 | n/a | 0.000 | 0.049 | 0.851 | 2.044 | 0.020 | n/a | 2.576 | 32.884 | n/a | n/a | 0.019 | 3.026 | 0.073 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000076 | 36.312 | 1.867 | n/a | 0.000 | 0.050 | 2.158 | 2.094 | 0.039 | n/a | 0.613 | 29.469 | n/a | n/a | 0.022 | 1.917 | 0.053 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000089 | 27.430 | 2.480 | n/a | 0.000 | 0.050 | 0.951 | 6.268 | 0.069 | n/a | 0.237 | 17.338 | n/a | n/a | 0.036 | 2.530 | 0.092 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000008d | 25.745 | 2.600 | n/a | 0.000 | 0.049 | 2.573 | 2.651 | 0.056 | n/a | 0.687 | 17.111 | n/a | n/a | 0.019 | 2.649 | 0.103 | 0.019 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000099 | 25.671 | 1.956 | n/a | 0.000 | 0.038 | 0.712 | 5.814 | 0.065 | n/a | 0.187 | 16.880 | n/a | n/a | 0.020 | 1.994 | 0.078 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000086 | 25.525 | 3.177 | n/a | 0.000 | 0.051 | 1.857 | 7.079 | 0.069 | n/a | 1.807 | 11.460 | n/a | n/a | 0.024 | 3.229 | 0.126 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000081 | 24.724 | 1.972 | n/a | 0.000 | 0.064 | 0.699 | 1.730 | 0.019 | n/a | 1.368 | 18.848 | n/a | n/a | 0.023 | 2.036 | 0.082 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000095 | 15.913 | 3.869 | n/a | 0.000 | 0.046 | 0.897 | 1.862 | 0.019 | n/a | 0.128 | 9.073 | n/a | n/a | 0.020 | 3.915 | 0.246 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000008f | 15.151 | 1.470 | n/a | 0.000 | 0.055 | 0.731 | 5.389 | 0.047 | n/a | 0.401 | 7.038 | n/a | n/a | 0.020 | 1.526 | 0.101 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.276ms |
| b1ec81021c5b5b68000000000000008b | 13.832 | 2.396 | n/a | 0.000 | 0.043 | 1.090 | 1.957 | 0.041 | n/a | 1.077 | 7.199 | n/a | n/a | 0.029 | 2.439 | 0.176 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.724 | 0.371 | 0.000 | 0.422 | 1.956 | n/a | 0.000 | 0.050 | 0.731 | 2.094 | 0.041 | n/a | 0.613 | 16.880 | n/a | n/a | 0.022 | 1.994 | 0.082 | 0.022 |
| p99 | 36.312 | 0.806 | 0.000 | 0.651 | 2.396 | n/a | 0.000 | 0.064 | 2.158 | 5.814 | 0.065 | n/a | 1.368 | 29.469 | n/a | n/a | 0.029 | 2.439 | 0.176 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000076 | 36.312 | 1.867 | n/a | 0.000 | 0.050 | 2.158 | 2.094 | 0.039 | n/a | 0.613 | 29.469 | n/a | n/a | 0.022 | 1.917 | 0.053 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000099 | 25.671 | 1.956 | n/a | 0.000 | 0.038 | 0.712 | 5.814 | 0.065 | n/a | 0.187 | 16.880 | n/a | n/a | 0.020 | 1.994 | 0.078 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000081 | 24.724 | 1.972 | n/a | 0.000 | 0.064 | 0.699 | 1.730 | 0.019 | n/a | 1.368 | 18.848 | n/a | n/a | 0.023 | 2.036 | 0.082 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000008f | 15.151 | 1.470 | n/a | 0.000 | 0.055 | 0.731 | 5.389 | 0.047 | n/a | 0.401 | 7.038 | n/a | n/a | 0.020 | 1.526 | 0.101 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.276ms |
| b1ec81021c5b5b68000000000000008b | 13.832 | 2.396 | n/a | 0.000 | 0.043 | 1.090 | 1.957 | 0.041 | n/a | 1.077 | 7.199 | n/a | n/a | 0.029 | 2.439 | 0.176 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.979 | 0.000 | 0.000 | 0.706 | 2.875 | n/a | 0.000 | 0.052 | 0.789 | 3.018 | 0.025 | n/a | 0.525 | 14.591 | n/a | n/a | 0.022 | 2.970 | 0.098 | 0.022 |
| p99 | 108.546 | 1.998 | 0.000 | 1.462 | 4.883 | n/a | 0.000 | 2.983 | 1.296 | 7.689 | 0.033 | n/a | 1.673 | 95.497 | n/a | n/a | 0.045 | 4.931 | 0.323 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000aa | 108.546 | 3.830 | n/a | 0.000 | 0.118 | 1.237 | 7.689 | 0.027 | n/a | 0.103 | 95.497 | n/a | n/a | 0.045 | 3.948 | 0.036 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| b1ec81021c5b5b6800000000000000b1 | 44.107 | 2.920 | n/a | 0.000 | 0.050 | 0.709 | 1.704 | 0.025 | n/a | 0.707 | 37.970 | n/a | n/a | 0.022 | 2.970 | 0.067 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.127ms |
| b1ec81021c5b5b6800000000000000b3 | 30.893 | 2.333 | n/a | 0.000 | 0.069 | 1.296 | 3.018 | 0.033 | n/a | 0.525 | 23.594 | n/a | n/a | 0.025 | 2.403 | 0.078 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000a6 | 27.596 | 1.984 | n/a | 0.000 | 0.730 | 0.743 | 1.672 | 0.020 | n/a | 1.673 | 20.754 | n/a | n/a | 0.020 | 2.714 | 0.098 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ae | 23.979 | 2.875 | n/a | 0.000 | 0.052 | 0.933 | 4.817 | 0.030 | n/a | 0.659 | 14.591 | n/a | n/a | 0.022 | 2.927 | 0.122 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000009c | 23.861 | 3.638 | n/a | 0.000 | 0.050 | 0.789 | 5.520 | 0.025 | n/a | 0.273 | 13.543 | n/a | n/a | 0.024 | 3.688 | 0.155 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000009f | 22.055 | 4.883 | n/a | 0.000 | 0.048 | 1.024 | 3.401 | 0.025 | n/a | 1.027 | 11.624 | n/a | n/a | 0.023 | 4.931 | 0.224 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000a0 | 14.061 | 1.563 | n/a | 0.000 | 2.983 | 0.642 | 1.552 | 0.023 | n/a | 0.375 | 6.908 | n/a | n/a | 0.015 | 4.546 | 0.323 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.020ms |

## P2 / L16 / commit / 5-10 facts (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.596 | 0.000 | 0.000 | 0.470 | 1.984 | n/a | 0.000 | 0.118 | 0.743 | 1.672 | 0.023 | n/a | 0.375 | 20.754 | n/a | n/a | 0.020 | 2.714 | 0.078 | 0.020 |
| p99 | 108.546 | 1.998 | 0.000 | 0.846 | 3.830 | n/a | 0.000 | 2.983 | 1.296 | 7.689 | 0.033 | n/a | 1.673 | 95.497 | n/a | n/a | 0.045 | 4.546 | 0.323 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000aa | 108.546 | 3.830 | n/a | 0.000 | 0.118 | 1.237 | 7.689 | 0.027 | n/a | 0.103 | 95.497 | n/a | n/a | 0.045 | 3.948 | 0.036 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.056ms |
| b1ec81021c5b5b6800000000000000b3 | 30.893 | 2.333 | n/a | 0.000 | 0.069 | 1.296 | 3.018 | 0.033 | n/a | 0.525 | 23.594 | n/a | n/a | 0.025 | 2.403 | 0.078 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000a6 | 27.596 | 1.984 | n/a | 0.000 | 0.730 | 0.743 | 1.672 | 0.020 | n/a | 1.673 | 20.754 | n/a | n/a | 0.020 | 2.714 | 0.098 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000a0 | 14.061 | 1.563 | n/a | 0.000 | 2.983 | 0.642 | 1.552 | 0.023 | n/a | 0.375 | 6.908 | n/a | n/a | 0.015 | 4.546 | 0.323 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.020ms |

## P2 / L64 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.186 | 0.998 | 0.000 | 0.763 | 3.266 | n/a | 0.000 | 0.060 | 0.990 | 2.558 | 0.021 | n/a | 0.269 | 13.007 | n/a | n/a | 0.024 | 3.355 | 0.175 | 0.024 |
| p99 | 118.360 | 1.005 | 0.000 | 1.131 | 6.540 | n/a | 0.000 | 0.119 | 3.548 | 12.134 | 0.066 | n/a | 1.146 | 102.346 | n/a | n/a | 0.042 | 6.659 | 0.270 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000c2 | 118.360 | 2.893 | n/a | 0.000 | 0.044 | 0.774 | 12.134 | 0.027 | n/a | 0.119 | 102.346 | n/a | n/a | 0.024 | 2.937 | 0.025 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.123ms; driver.reader-basis.broadcast 0.063ms |
| b1ec81021c5b5b6800000000000000c9 | 32.598 | 6.540 | n/a | 0.000 | 0.119 | 1.033 | 2.101 | 0.021 | n/a | 1.146 | 21.596 | n/a | n/a | 0.042 | 6.659 | 0.204 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.123ms |
| b1ec81021c5b5b6800000000000000bc | 25.133 | 3.814 | n/a | 0.000 | 0.060 | 3.548 | 2.558 | 0.037 | n/a | 0.862 | 14.229 | n/a | n/a | 0.024 | 3.875 | 0.154 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000b8 | 19.186 | 3.266 | n/a | 0.000 | 0.089 | 0.990 | 2.587 | 0.019 | n/a | 0.269 | 11.926 | n/a | n/a | 0.040 | 3.355 | 0.175 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| b1ec81021c5b5b6800000000000000c6 | 18.630 | 2.648 | n/a | 0.000 | 0.052 | 0.875 | 1.492 | 0.020 | n/a | 0.515 | 13.007 | n/a | n/a | 0.021 | 2.700 | 0.145 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000cb | 15.911 | 4.189 | n/a | 0.000 | 0.103 | 1.007 | 2.484 | 0.066 | n/a | 0.183 | 7.841 | n/a | n/a | 0.037 | 4.292 | 0.270 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ba | 14.130 | 2.633 | n/a | 0.000 | 0.050 | 0.856 | 5.120 | 0.021 | n/a | 0.112 | 5.317 | n/a | n/a | 0.022 | 2.682 | 0.190 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.630 | 1.002 | 0.000 | 0.763 | 2.648 | n/a | 0.000 | 0.052 | 0.875 | 2.587 | 0.020 | n/a | 0.269 | 11.926 | n/a | n/a | 0.022 | 2.700 | 0.175 | 0.022 |
| p99 | 19.186 | 1.005 | 0.000 | 0.763 | 3.266 | n/a | 0.000 | 0.089 | 0.990 | 5.120 | 0.021 | n/a | 0.515 | 13.007 | n/a | n/a | 0.040 | 3.355 | 0.190 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000b8 | 19.186 | 3.266 | n/a | 0.000 | 0.089 | 0.990 | 2.587 | 0.019 | n/a | 0.269 | 11.926 | n/a | n/a | 0.040 | 3.355 | 0.175 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| b1ec81021c5b5b6800000000000000c6 | 18.630 | 2.648 | n/a | 0.000 | 0.052 | 0.875 | 1.492 | 0.020 | n/a | 0.515 | 13.007 | n/a | n/a | 0.021 | 2.700 | 0.145 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ba | 14.130 | 2.633 | n/a | 0.000 | 0.050 | 0.856 | 5.120 | 0.021 | n/a | 0.112 | 5.317 | n/a | n/a | 0.022 | 2.682 | 0.190 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.019 | 0.000 | 0.000 | 0.462 | 2.458 | n/a | 0.000 | 0.055 | 1.127 | 1.911 | 0.021 | n/a | 0.550 | 17.353 | n/a | n/a | 0.024 | 2.504 | 0.128 | 0.024 |
| p99 | 122.453 | 2.959 | 0.000 | 1.338 | 5.164 | n/a | 0.000 | 0.117 | 4.427 | 12.557 | 0.063 | n/a | 0.696 | 102.948 | n/a | n/a | 0.060 | 5.230 | 0.199 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000d9 | 122.453 | 2.219 | n/a | 0.000 | 0.055 | 4.427 | 12.557 | 0.063 | n/a | 0.160 | 102.948 | n/a | n/a | 0.024 | 2.274 | 0.019 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms; driver.reader-basis.broadcast 0.049ms |
| b1ec81021c5b5b6800000000000000cf | 36.403 | 3.255 | n/a | 0.000 | 0.045 | 1.368 | 1.283 | 0.021 | n/a | 0.102 | 30.308 | n/a | n/a | 0.020 | 3.300 | 0.091 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000e7 | 29.342 | 2.189 | n/a | 0.000 | 0.053 | 1.127 | 3.827 | 0.047 | n/a | 0.154 | 21.921 | n/a | n/a | 0.024 | 2.242 | 0.076 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000d4 | 26.325 | 5.164 | n/a | 0.000 | 0.066 | 0.701 | 2.334 | 0.021 | n/a | 0.659 | 17.353 | n/a | n/a | 0.028 | 5.230 | 0.199 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| b1ec81021c5b5b6800000000000000dd | 24.019 | 3.005 | n/a | 0.000 | 0.063 | 0.797 | 1.650 | 0.021 | n/a | 0.550 | 17.906 | n/a | n/a | 0.027 | 3.068 | 0.128 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000d6 | 20.435 | 2.458 | n/a | 0.000 | 0.047 | 0.719 | 2.439 | 0.019 | n/a | 0.696 | 14.035 | n/a | n/a | 0.022 | 2.504 | 0.123 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000e4 | 17.834 | 3.030 | n/a | 0.000 | 0.117 | 1.956 | 1.165 | 0.020 | n/a | 0.632 | 10.854 | n/a | n/a | 0.060 | 3.146 | 0.176 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000df | 16.139 | 2.158 | n/a | 0.000 | 0.057 | 0.898 | 1.662 | 0.024 | n/a | 0.634 | 10.679 | n/a | n/a | 0.027 | 2.215 | 0.137 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000e1 | 14.444 | 2.322 | n/a | 0.000 | 0.049 | 1.152 | 1.911 | 0.042 | n/a | 0.529 | 8.418 | n/a | n/a | 0.022 | 2.371 | 0.164 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.834 | 0.000 | 0.000 | 0.428 | 2.219 | n/a | 0.000 | 0.053 | 1.152 | 1.662 | 0.024 | n/a | 0.160 | 10.854 | n/a | n/a | 0.024 | 2.274 | 0.091 | 0.024 |
| p99 | 122.453 | 2.004 | 0.000 | 0.923 | 3.255 | n/a | 0.000 | 0.117 | 4.427 | 12.557 | 0.063 | n/a | 0.634 | 102.948 | n/a | n/a | 0.060 | 3.300 | 0.176 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000d9 | 122.453 | 2.219 | n/a | 0.000 | 0.055 | 4.427 | 12.557 | 0.063 | n/a | 0.160 | 102.948 | n/a | n/a | 0.024 | 2.274 | 0.019 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms; driver.reader-basis.broadcast 0.049ms |
| b1ec81021c5b5b6800000000000000cf | 36.403 | 3.255 | n/a | 0.000 | 0.045 | 1.368 | 1.283 | 0.021 | n/a | 0.102 | 30.308 | n/a | n/a | 0.020 | 3.300 | 0.091 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000e7 | 29.342 | 2.189 | n/a | 0.000 | 0.053 | 1.127 | 3.827 | 0.047 | n/a | 0.154 | 21.921 | n/a | n/a | 0.024 | 2.242 | 0.076 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000e4 | 17.834 | 3.030 | n/a | 0.000 | 0.117 | 1.956 | 1.165 | 0.020 | n/a | 0.632 | 10.854 | n/a | n/a | 0.060 | 3.146 | 0.176 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000df | 16.139 | 2.158 | n/a | 0.000 | 0.057 | 0.898 | 1.662 | 0.024 | n/a | 0.634 | 10.679 | n/a | n/a | 0.027 | 2.215 | 0.137 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000e1 | 14.444 | 2.322 | n/a | 0.000 | 0.049 | 1.152 | 1.911 | 0.042 | n/a | 0.529 | 8.418 | n/a | n/a | 0.022 | 2.371 | 0.164 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.989 | 0.161 | 0.000 | 0.510 | 3.143 | n/a | 0.000 | 0.092 | 1.008 | 2.344 | 0.028 | n/a | 0.359 | 15.691 | n/a | n/a | 0.038 | 3.282 | 0.167 | 0.038 |
| p99 | 94.446 | 1.949 | 0.083 | 1.950 | 11.350 | n/a | 0.000 | 0.400 | 7.342 | 19.010 | 0.092 | n/a | 0.923 | 80.344 | n/a | n/a | 0.051 | 11.399 | 0.229 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000f8 | 94.446 | 4.142 | n/a | 0.000 | 0.145 | 1.047 | 8.593 | 0.028 | n/a | 0.099 | 80.344 | n/a | n/a | 0.048 | 4.287 | 0.045 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.144ms |
| b1ec81021c5b5b680000000000000103 | 61.646 | 11.350 | n/a | 0.000 | 0.049 | 7.342 | 19.010 | 0.092 | n/a | 0.923 | 22.862 | n/a | n/a | 0.020 | 11.399 | 0.185 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| b1ec81021c5b5b6800000000000000eb | 35.287 | 5.410 | n/a | 0.000 | 0.043 | 5.183 | 5.332 | 0.023 | n/a | 0.106 | 19.146 | n/a | n/a | 0.044 | 5.453 | 0.155 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.017ms |
| b1ec81021c5b5b6800000000000000f5 | 30.457 | 5.689 | n/a | 0.000 | 0.092 | 1.008 | 1.513 | 0.020 | n/a | 0.127 | 21.970 | n/a | n/a | 0.038 | 5.781 | 0.190 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| b1ec81021c5b5b6800000000000000fa | 26.361 | 2.965 | n/a | 0.000 | 0.106 | 1.116 | 5.499 | 0.049 | n/a | 0.894 | 15.691 | n/a | n/a | 0.042 | 3.072 | 0.117 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000105 | 25.989 | 2.455 | n/a | 0.000 | 0.057 | 1.243 | 2.344 | 0.058 | n/a | 0.417 | 19.387 | n/a | n/a | 0.028 | 2.512 | 0.097 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ea | 19.640 | 3.143 | n/a | 0.000 | 0.139 | 0.967 | 1.974 | 0.075 | n/a | 0.743 | 12.553 | n/a | n/a | 0.046 | 3.282 | 0.167 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000107 | 19.229 | 3.417 | n/a | 0.000 | 0.142 | 0.936 | 1.866 | 0.023 | n/a | 0.151 | 12.643 | n/a | n/a | 0.051 | 3.559 | 0.185 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| b1ec81021c5b5b6800000000000000fd | 16.732 | 1.882 | n/a | 0.000 | 0.052 | 0.710 | 4.564 | 0.082 | n/a | 0.589 | 8.829 | n/a | n/a | 0.024 | 1.934 | 0.116 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ff | 12.158 | 2.736 | n/a | 0.000 | 0.044 | 0.714 | 1.123 | 0.021 | n/a | 0.359 | 7.137 | n/a | n/a | 0.023 | 2.781 | 0.229 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000f3 | 11.767 | 2.006 | n/a | 0.000 | 0.400 | 0.802 | 1.497 | 0.021 | n/a | 0.124 | 6.896 | n/a | n/a | 0.021 | 2.406 | 0.204 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.229 | 0.000 | 0.000 | 0.424 | 2.965 | n/a | 0.000 | 0.139 | 0.936 | 1.974 | 0.028 | n/a | 0.359 | 12.553 | n/a | n/a | 0.042 | 3.072 | 0.167 | 0.042 |
| p99 | 94.446 | 0.997 | 0.000 | 0.831 | 4.142 | n/a | 0.000 | 0.400 | 1.116 | 8.593 | 0.082 | n/a | 0.894 | 80.344 | n/a | n/a | 0.051 | 4.287 | 0.229 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000000f8 | 94.446 | 4.142 | n/a | 0.000 | 0.145 | 1.047 | 8.593 | 0.028 | n/a | 0.099 | 80.344 | n/a | n/a | 0.048 | 4.287 | 0.045 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.144ms |
| b1ec81021c5b5b6800000000000000fa | 26.361 | 2.965 | n/a | 0.000 | 0.106 | 1.116 | 5.499 | 0.049 | n/a | 0.894 | 15.691 | n/a | n/a | 0.042 | 3.072 | 0.117 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ea | 19.640 | 3.143 | n/a | 0.000 | 0.139 | 0.967 | 1.974 | 0.075 | n/a | 0.743 | 12.553 | n/a | n/a | 0.046 | 3.282 | 0.167 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000107 | 19.229 | 3.417 | n/a | 0.000 | 0.142 | 0.936 | 1.866 | 0.023 | n/a | 0.151 | 12.643 | n/a | n/a | 0.051 | 3.559 | 0.185 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| b1ec81021c5b5b6800000000000000fd | 16.732 | 1.882 | n/a | 0.000 | 0.052 | 0.710 | 4.564 | 0.082 | n/a | 0.589 | 8.829 | n/a | n/a | 0.024 | 1.934 | 0.116 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000ff | 12.158 | 2.736 | n/a | 0.000 | 0.044 | 0.714 | 1.123 | 0.021 | n/a | 0.359 | 7.137 | n/a | n/a | 0.023 | 2.781 | 0.229 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000000f3 | 11.767 | 2.006 | n/a | 0.000 | 0.400 | 0.802 | 1.497 | 0.021 | n/a | 0.124 | 6.896 | n/a | n/a | 0.021 | 2.406 | 0.204 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.653 | 0.000 | 0.000 | 0.412 | 2.062 | n/a | 0.000 | 0.067 | 1.093 | 1.621 | 0.022 | n/a | 0.393 | 13.471 | n/a | n/a | 0.026 | 2.115 | 0.133 | 0.026 |
| p99 | 29.675 | 1.001 | 0.000 | 0.800 | 3.308 | n/a | 0.000 | 0.106 | 3.779 | 2.917 | 0.056 | n/a | 3.492 | 22.405 | n/a | n/a | 0.030 | 3.367 | 0.148 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b68000000000000010b | 29.675 | 3.308 | n/a | 0.000 | 0.059 | 0.787 | 2.917 | 0.025 | n/a | 0.146 | 22.405 | n/a | n/a | 0.028 | 3.367 | 0.113 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000111 | 24.828 | 2.062 | n/a | 0.000 | 0.052 | 3.779 | 1.705 | 0.026 | n/a | 0.135 | 17.042 | n/a | n/a | 0.027 | 2.115 | 0.085 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000010e | 21.744 | 3.139 | n/a | 0.000 | 0.077 | 1.176 | 1.867 | 0.056 | n/a | 0.215 | 15.185 | n/a | n/a | 0.030 | 3.215 | 0.148 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000114 | 18.653 | 2.035 | n/a | 0.000 | 0.072 | 0.824 | 1.232 | 0.022 | n/a | 0.972 | 13.471 | n/a | n/a | 0.026 | 2.107 | 0.113 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000011d | 17.994 | 2.526 | n/a | 0.000 | 0.067 | 1.110 | 1.621 | 0.020 | n/a | 0.393 | 12.231 | n/a | n/a | 0.025 | 2.594 | 0.144 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |
| b1ec81021c5b5b680000000000000117 | 14.028 | 1.755 | n/a | 0.000 | 0.106 | 1.093 | 1.118 | 0.020 | n/a | 0.493 | 9.422 | n/a | n/a | 0.021 | 1.861 | 0.133 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000011b | 13.419 | 1.754 | n/a | 0.000 | 0.053 | 0.656 | 1.430 | 0.018 | n/a | 3.492 | 5.991 | n/a | n/a | 0.026 | 1.807 | 0.135 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.653 | 0.000 | 0.000 | 0.398 | 2.035 | n/a | 0.000 | 0.072 | 1.093 | 1.430 | 0.022 | n/a | 0.493 | 13.471 | n/a | n/a | 0.026 | 2.107 | 0.133 | 0.026 |
| p99 | 24.828 | 1.001 | 0.000 | 0.800 | 3.139 | n/a | 0.000 | 0.106 | 3.779 | 1.867 | 0.056 | n/a | 3.492 | 17.042 | n/a | n/a | 0.030 | 3.215 | 0.148 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000111 | 24.828 | 2.062 | n/a | 0.000 | 0.052 | 3.779 | 1.705 | 0.026 | n/a | 0.135 | 17.042 | n/a | n/a | 0.027 | 2.115 | 0.085 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000010e | 21.744 | 3.139 | n/a | 0.000 | 0.077 | 1.176 | 1.867 | 0.056 | n/a | 0.215 | 15.185 | n/a | n/a | 0.030 | 3.215 | 0.148 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000114 | 18.653 | 2.035 | n/a | 0.000 | 0.072 | 0.824 | 1.232 | 0.022 | n/a | 0.972 | 13.471 | n/a | n/a | 0.026 | 2.107 | 0.113 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000117 | 14.028 | 1.755 | n/a | 0.000 | 0.106 | 1.093 | 1.118 | 0.020 | n/a | 0.493 | 9.422 | n/a | n/a | 0.021 | 1.861 | 0.133 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000011b | 13.419 | 1.754 | n/a | 0.000 | 0.053 | 0.656 | 1.430 | 0.018 | n/a | 3.492 | 5.991 | n/a | n/a | 0.026 | 1.807 | 0.135 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.079 | 0.614 | 0.000 | 0.577 | 2.531 | n/a | 0.000 | 0.065 | 0.964 | 2.288 | 0.034 | n/a | 0.270 | 9.741 | n/a | n/a | 0.025 | 2.574 | 0.195 | 0.025 |
| p99 | 21.006 | 1.010 | 0.000 | 1.116 | 4.523 | n/a | 0.000 | 0.102 | 2.799 | 5.073 | 0.122 | n/a | 1.564 | 11.867 | n/a | n/a | 0.039 | 4.599 | 0.275 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000133 | 21.006 | 4.050 | n/a | 0.000 | 0.065 | 1.104 | 2.288 | 0.042 | n/a | 1.564 | 11.867 | n/a | n/a | 0.025 | 4.115 | 0.196 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000127 | 16.872 | 3.019 | n/a | 0.000 | 0.065 | 0.832 | 4.053 | 0.023 | n/a | 0.140 | 8.712 | n/a | n/a | 0.027 | 3.083 | 0.183 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000126 | 16.729 | 4.523 | n/a | 0.000 | 0.076 | 2.799 | 5.073 | 0.122 | n/a | 1.276 | 2.831 | n/a | n/a | 0.029 | 4.599 | 0.275 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000130 | 16.127 | 1.604 | n/a | 0.000 | 0.063 | 0.771 | 2.702 | 0.023 | n/a | 0.368 | 10.573 | n/a | n/a | 0.023 | 1.667 | 0.103 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000012e | 16.079 | 3.110 | n/a | 0.000 | 0.102 | 0.971 | 1.532 | 0.020 | n/a | 0.270 | 10.035 | n/a | n/a | 0.039 | 3.212 | 0.200 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000122 | 14.752 | 1.823 | n/a | 0.000 | 0.039 | 0.981 | 1.850 | 0.043 | n/a | 0.256 | 9.741 | n/a | n/a | 0.018 | 1.862 | 0.126 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000136 | 14.470 | 1.970 | n/a | 0.000 | 0.066 | 0.964 | 1.162 | 0.019 | n/a | 0.155 | 10.105 | n/a | n/a | 0.028 | 2.037 | 0.141 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000012c | 12.086 | 2.531 | n/a | 0.000 | 0.043 | 0.901 | 2.347 | 0.061 | n/a | 0.308 | 5.874 | n/a | n/a | 0.021 | 2.574 | 0.213 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000129 | 9.680 | 1.821 | n/a | 0.000 | 0.063 | 0.750 | 1.144 | 0.034 | n/a | 0.123 | 5.719 | n/a | n/a | 0.025 | 1.885 | 0.195 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.752 | 0.614 | 0.000 | 0.440 | 1.823 | n/a | 0.000 | 0.063 | 0.964 | 1.532 | 0.023 | n/a | 0.256 | 9.741 | n/a | n/a | 0.025 | 1.885 | 0.141 | 0.025 |
| p99 | 16.729 | 0.999 | 0.000 | 0.719 | 4.523 | n/a | 0.000 | 0.102 | 2.799 | 5.073 | 0.122 | n/a | 1.276 | 10.573 | n/a | n/a | 0.039 | 4.599 | 0.275 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000126 | 16.729 | 4.523 | n/a | 0.000 | 0.076 | 2.799 | 5.073 | 0.122 | n/a | 1.276 | 2.831 | n/a | n/a | 0.029 | 4.599 | 0.275 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000130 | 16.127 | 1.604 | n/a | 0.000 | 0.063 | 0.771 | 2.702 | 0.023 | n/a | 0.368 | 10.573 | n/a | n/a | 0.023 | 1.667 | 0.103 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000012e | 16.079 | 3.110 | n/a | 0.000 | 0.102 | 0.971 | 1.532 | 0.020 | n/a | 0.270 | 10.035 | n/a | n/a | 0.039 | 3.212 | 0.200 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000122 | 14.752 | 1.823 | n/a | 0.000 | 0.039 | 0.981 | 1.850 | 0.043 | n/a | 0.256 | 9.741 | n/a | n/a | 0.018 | 1.862 | 0.126 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000136 | 14.470 | 1.970 | n/a | 0.000 | 0.066 | 0.964 | 1.162 | 0.019 | n/a | 0.155 | 10.105 | n/a | n/a | 0.028 | 2.037 | 0.141 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000129 | 9.680 | 1.821 | n/a | 0.000 | 0.063 | 0.750 | 1.144 | 0.034 | n/a | 0.123 | 5.719 | n/a | n/a | 0.025 | 1.885 | 0.195 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.318 | 0.997 | 0.000 | 0.693 | 2.861 | n/a | 0.000 | 0.062 | 0.830 | 1.914 | 0.024 | n/a | 0.685 | 10.626 | n/a | n/a | 0.025 | 2.943 | 0.144 | 0.025 |
| p99 | 35.159 | 1.998 | 0.000 | 1.137 | 3.330 | n/a | 0.000 | 0.107 | 1.843 | 2.221 | 0.056 | n/a | 3.907 | 28.651 | n/a | n/a | 0.042 | 3.395 | 0.200 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000001b3 | 35.159 | 3.091 | n/a | 0.000 | 0.107 | 0.830 | 1.914 | 0.019 | n/a | 0.505 | 28.651 | n/a | n/a | 0.042 | 3.198 | 0.091 | 0.042 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001b1 | 23.508 | 3.330 | n/a | 0.000 | 0.065 | 0.683 | 1.813 | 0.021 | n/a | 0.663 | 16.908 | n/a | n/a | 0.026 | 3.395 | 0.144 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001af | 20.818 | 1.816 | n/a | 0.000 | 0.059 | 0.945 | 2.221 | 0.056 | n/a | 3.907 | 11.792 | n/a | n/a | 0.022 | 1.875 | 0.090 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000013a | 18.318 | 2.861 | n/a | 0.000 | 0.082 | 1.843 | 2.142 | 0.043 | n/a | 0.685 | 10.626 | n/a | n/a | 0.035 | 2.943 | 0.161 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000013d | 16.098 | 3.154 | n/a | 0.000 | 0.062 | 1.344 | 1.430 | 0.024 | n/a | 0.192 | 9.867 | n/a | n/a | 0.025 | 3.215 | 0.200 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000028f | 15.302 | 2.792 | n/a | 0.000 | 0.040 | 0.763 | 2.068 | 0.028 | n/a | 3.609 | 5.981 | n/a | n/a | 0.021 | 2.832 | 0.185 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001b5 | 14.582 | 1.858 | n/a | 0.000 | 0.050 | 0.604 | 1.710 | 0.018 | n/a | 3.091 | 7.230 | n/a | n/a | 0.021 | 1.907 | 0.131 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.498 | 0.633 | 0.000 | 0.668 | 2.540 | n/a | 0.000 | 0.062 | 0.793 | 1.869 | 0.021 | n/a | 0.262 | 11.198 | n/a | n/a | 0.027 | 2.606 | 0.138 | 0.027 |
| p99 | 90.748 | 1.002 | 0.000 | 1.425 | 6.367 | n/a | 0.000 | 0.113 | 1.613 | 13.091 | 0.086 | n/a | 1.912 | 74.807 | n/a | n/a | 0.049 | 6.424 | 0.268 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b68000000000000013f | 90.748 | 1.654 | n/a | 0.000 | 0.064 | 0.785 | 13.091 | 0.086 | n/a | 0.229 | 74.807 | n/a | n/a | 0.031 | 1.718 | 0.019 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000156 | 28.512 | 2.710 | n/a | 0.000 | 0.062 | 0.793 | 4.416 | 0.022 | n/a | 0.096 | 20.387 | n/a | n/a | 0.027 | 2.772 | 0.097 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000153 | 27.710 | 6.367 | n/a | 0.000 | 0.057 | 1.063 | 2.859 | 0.022 | n/a | 0.524 | 16.794 | n/a | n/a | 0.024 | 6.424 | 0.232 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000157 | 27.693 | 3.578 | n/a | 0.000 | 0.113 | 1.613 | 1.624 | 0.027 | n/a | 1.912 | 18.782 | n/a | n/a | 0.044 | 3.691 | 0.133 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.028ms |
| b1ec81021c5b5b680000000000000149 | 21.008 | 2.824 | n/a | 0.000 | 0.071 | 0.831 | 1.869 | 0.064 | n/a | 1.315 | 14.006 | n/a | n/a | 0.028 | 2.895 | 0.138 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000014c | 19.525 | 5.118 | n/a | 0.000 | 0.110 | 0.913 | 1.943 | 0.021 | n/a | 0.174 | 11.198 | n/a | n/a | 0.049 | 5.228 | 0.268 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000146 | 18.498 | 1.611 | n/a | 0.000 | 0.037 | 0.505 | 1.601 | 0.019 | n/a | 0.389 | 14.319 | n/a | n/a | 0.016 | 1.649 | 0.089 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.036ms |
| b1ec81021c5b5b68000000000000014e | 16.116 | 1.775 | n/a | 0.000 | 0.062 | 0.790 | 2.505 | 0.019 | n/a | 0.262 | 10.679 | n/a | n/a | 0.024 | 1.837 | 0.114 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| b1ec81021c5b5b68000000000000015a | 15.984 | 2.540 | n/a | 0.000 | 0.066 | 0.787 | 1.268 | 0.021 | n/a | 0.545 | 10.729 | n/a | n/a | 0.028 | 2.606 | 0.163 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000145 | 14.442 | 2.653 | n/a | 0.000 | 0.062 | 0.722 | 1.240 | 0.021 | n/a | 0.615 | 9.103 | n/a | n/a | 0.025 | 2.716 | 0.188 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| b1ec81021c5b5b68000000000000015c | 13.063 | 2.476 | n/a | 0.000 | 0.088 | 0.864 | 1.484 | 0.019 | n/a | 0.117 | 7.975 | n/a | n/a | 0.040 | 2.564 | 0.196 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000150 | 12.799 | 2.444 | n/a | 0.000 | 0.053 | 0.979 | 2.662 | 0.053 | n/a | 0.255 | 6.329 | n/a | n/a | 0.023 | 2.497 | 0.195 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.498 | 0.000 | 0.000 | 0.430 | 1.775 | n/a | 0.000 | 0.062 | 0.790 | 1.624 | 0.019 | n/a | 0.229 | 14.319 | n/a | n/a | 0.027 | 1.837 | 0.097 | 0.027 |
| p99 | 90.748 | 0.999 | 0.000 | 0.848 | 3.578 | n/a | 0.000 | 0.113 | 1.613 | 13.091 | 0.086 | n/a | 1.912 | 74.807 | n/a | n/a | 0.044 | 3.691 | 0.196 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b68000000000000013f | 90.748 | 1.654 | n/a | 0.000 | 0.064 | 0.785 | 13.091 | 0.086 | n/a | 0.229 | 74.807 | n/a | n/a | 0.031 | 1.718 | 0.019 | 0.031 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000156 | 28.512 | 2.710 | n/a | 0.000 | 0.062 | 0.793 | 4.416 | 0.022 | n/a | 0.096 | 20.387 | n/a | n/a | 0.027 | 2.772 | 0.097 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000157 | 27.693 | 3.578 | n/a | 0.000 | 0.113 | 1.613 | 1.624 | 0.027 | n/a | 1.912 | 18.782 | n/a | n/a | 0.044 | 3.691 | 0.133 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.028ms |
| b1ec81021c5b5b680000000000000146 | 18.498 | 1.611 | n/a | 0.000 | 0.037 | 0.505 | 1.601 | 0.019 | n/a | 0.389 | 14.319 | n/a | n/a | 0.016 | 1.649 | 0.089 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.036ms |
| b1ec81021c5b5b68000000000000014e | 16.116 | 1.775 | n/a | 0.000 | 0.062 | 0.790 | 2.505 | 0.019 | n/a | 0.262 | 10.679 | n/a | n/a | 0.024 | 1.837 | 0.114 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| b1ec81021c5b5b68000000000000015c | 13.063 | 2.476 | n/a | 0.000 | 0.088 | 0.864 | 1.484 | 0.019 | n/a | 0.117 | 7.975 | n/a | n/a | 0.040 | 2.564 | 0.196 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.035 | 0.477 | 0.000 | 0.239 | 4.411 | n/a | 0.000 | 0.045 | 13.462 | 9.143 | 2.318 | n/a | 0.728 | 5.904 | n/a | n/a | 0.025 | 4.456 | 0.124 | 0.025 |
| p99 | 36.035 | 0.477 | 0.000 | 0.239 | 4.411 | n/a | 0.000 | 0.045 | 13.462 | 9.143 | 2.318 | n/a | 0.728 | 5.904 | n/a | n/a | 0.025 | 4.456 | 0.124 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000180 | 36.035 | 4.411 | n/a | 0.000 | 0.045 | 13.462 | 9.143 | 2.318 | n/a | 0.728 | 5.904 | n/a | n/a | 0.025 | 4.456 | 0.124 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.035 | 0.477 | 0.000 | 0.239 | 4.411 | n/a | 0.000 | 0.045 | 13.462 | 9.143 | 2.318 | n/a | 0.728 | 5.904 | n/a | n/a | 0.025 | 4.456 | 0.124 | 0.025 |
| p99 | 36.035 | 0.477 | 0.000 | 0.239 | 4.411 | n/a | 0.000 | 0.045 | 13.462 | 9.143 | 2.318 | n/a | 0.728 | 5.904 | n/a | n/a | 0.025 | 4.456 | 0.124 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000180 | 36.035 | 4.411 | n/a | 0.000 | 0.045 | 13.462 | 9.143 | 2.318 | n/a | 0.728 | 5.904 | n/a | n/a | 0.025 | 4.456 | 0.124 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.582 | 0.568 | 0.000 | 0.458 | 1.816 | n/a | 0.000 | 0.050 | 0.604 | 1.710 | 0.018 | n/a | 3.091 | 7.230 | n/a | n/a | 0.021 | 1.875 | 0.090 | 0.021 |
| p99 | 20.818 | 0.843 | 0.000 | 0.462 | 1.858 | n/a | 0.000 | 0.059 | 0.945 | 2.221 | 0.056 | n/a | 3.907 | 11.792 | n/a | n/a | 0.022 | 1.907 | 0.131 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000001af | 20.818 | 1.816 | n/a | 0.000 | 0.059 | 0.945 | 2.221 | 0.056 | n/a | 3.907 | 11.792 | n/a | n/a | 0.022 | 1.875 | 0.090 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001b5 | 14.582 | 1.858 | n/a | 0.000 | 0.050 | 0.604 | 1.710 | 0.018 | n/a | 3.091 | 7.230 | n/a | n/a | 0.021 | 1.907 | 0.131 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.211 | 0.000 | 0.000 | 0.675 | 2.450 | n/a | 0.000 | 0.061 | 0.784 | 2.225 | 0.024 | n/a | 0.286 | 14.592 | n/a | n/a | 0.034 | 2.499 | 0.118 | 0.034 |
| p99 | 93.083 | 2.994 | 0.000 | 1.535 | 8.386 | n/a | 0.000 | 0.215 | 1.040 | 4.876 | 0.309 | n/a | 1.195 | 84.999 | n/a | n/a | 0.047 | 8.601 | 0.311 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000001b8 | 93.083 | 2.885 | n/a | 0.000 | 0.097 | 0.789 | 4.129 | 0.048 | n/a | 0.100 | 84.999 | n/a | n/a | 0.037 | 2.982 | 0.032 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| b1ec81021c5b5b6800000000000001cd | 30.267 | 1.935 | n/a | 0.000 | 0.113 | 0.715 | 4.563 | 0.024 | n/a | 0.128 | 22.750 | n/a | n/a | 0.039 | 2.048 | 0.068 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| b1ec81021c5b5b6800000000000001c8 | 29.735 | 3.830 | n/a | 0.000 | 0.053 | 0.969 | 4.876 | 0.023 | n/a | 0.110 | 19.839 | n/a | n/a | 0.034 | 3.883 | 0.131 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| b1ec81021c5b5b6800000000000001c6 | 27.651 | 8.386 | n/a | 0.000 | 0.215 | 0.781 | 1.677 | 0.022 | n/a | 0.424 | 16.103 | n/a | n/a | 0.043 | 8.601 | 0.311 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001c0 | 20.821 | 2.327 | n/a | 0.000 | 0.119 | 1.010 | 2.225 | 0.087 | n/a | 0.286 | 14.720 | n/a | n/a | 0.047 | 2.447 | 0.118 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001cb | 20.211 | 2.456 | n/a | 0.000 | 0.057 | 0.938 | 2.890 | 0.049 | n/a | 1.195 | 12.605 | n/a | n/a | 0.021 | 2.513 | 0.124 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001c3 | 19.398 | 2.009 | n/a | 0.000 | 0.086 | 1.040 | 1.230 | 0.020 | n/a | 0.385 | 14.592 | n/a | n/a | 0.036 | 2.095 | 0.108 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001cf | 18.270 | 2.450 | n/a | 0.000 | 0.049 | 0.758 | 1.546 | 0.025 | n/a | 0.613 | 12.810 | n/a | n/a | 0.020 | 2.499 | 0.137 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001be | 16.449 | 1.567 | n/a | 0.000 | 0.054 | 0.784 | 1.060 | 0.309 | n/a | 0.128 | 12.524 | n/a | n/a | 0.023 | 1.621 | 0.099 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001bb | 15.374 | 1.676 | n/a | 0.000 | 0.052 | 0.592 | 1.547 | 0.023 | n/a | 0.295 | 11.166 | n/a | n/a | 0.023 | 1.728 | 0.112 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001d3 | 14.665 | 2.578 | n/a | 0.000 | 0.061 | 0.776 | 3.268 | 0.022 | n/a | 0.118 | 7.820 | n/a | n/a | 0.021 | 2.640 | 0.180 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.449 | 0.000 | 0.000 | 0.420 | 1.935 | n/a | 0.000 | 0.061 | 0.776 | 1.547 | 0.023 | n/a | 0.128 | 12.524 | n/a | n/a | 0.023 | 2.048 | 0.108 | 0.023 |
| p99 | 30.267 | 1.000 | 0.000 | 0.792 | 2.578 | n/a | 0.000 | 0.119 | 1.040 | 4.563 | 0.309 | n/a | 0.385 | 22.750 | n/a | n/a | 0.047 | 2.640 | 0.180 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000001cd | 30.267 | 1.935 | n/a | 0.000 | 0.113 | 0.715 | 4.563 | 0.024 | n/a | 0.128 | 22.750 | n/a | n/a | 0.039 | 2.048 | 0.068 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| b1ec81021c5b5b6800000000000001c0 | 20.821 | 2.327 | n/a | 0.000 | 0.119 | 1.010 | 2.225 | 0.087 | n/a | 0.286 | 14.720 | n/a | n/a | 0.047 | 2.447 | 0.118 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001c3 | 19.398 | 2.009 | n/a | 0.000 | 0.086 | 1.040 | 1.230 | 0.020 | n/a | 0.385 | 14.592 | n/a | n/a | 0.036 | 2.095 | 0.108 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001be | 16.449 | 1.567 | n/a | 0.000 | 0.054 | 0.784 | 1.060 | 0.309 | n/a | 0.128 | 12.524 | n/a | n/a | 0.023 | 1.621 | 0.099 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001bb | 15.374 | 1.676 | n/a | 0.000 | 0.052 | 0.592 | 1.547 | 0.023 | n/a | 0.295 | 11.166 | n/a | n/a | 0.023 | 1.728 | 0.112 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000001d3 | 14.665 | 2.578 | n/a | 0.000 | 0.061 | 0.776 | 3.268 | 0.022 | n/a | 0.118 | 7.820 | n/a | n/a | 0.021 | 2.640 | 0.180 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.913 | 0.984 | 0.000 | 0.661 | 2.135 | n/a | 0.000 | 0.055 | 0.657 | 1.158 | 0.020 | n/a | 0.316 | 6.537 | n/a | n/a | 0.022 | 2.193 | 0.134 | 0.022 |
| p99 | 19.544 | 1.004 | 0.000 | 1.091 | 2.998 | n/a | 0.000 | 0.058 | 0.733 | 1.243 | 0.038 | n/a | 3.395 | 15.100 | n/a | n/a | 0.070 | 3.053 | 0.272 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000001d7 | 19.544 | 2.135 | n/a | 0.000 | 0.058 | 0.733 | 1.158 | 0.020 | n/a | 0.316 | 15.100 | n/a | n/a | 0.022 | 2.193 | 0.112 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b68000000000000024f | 11.913 | 1.561 | n/a | 0.000 | 0.037 | 0.657 | 1.243 | 0.038 | n/a | 3.395 | 4.961 | n/a | n/a | 0.020 | 1.598 | 0.134 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b680000000000000229 | 11.237 | 2.998 | n/a | 0.000 | 0.055 | 0.492 | 0.945 | 0.018 | n/a | 0.122 | 6.537 | n/a | n/a | 0.070 | 3.053 | 0.272 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.021ms |

## P2 / grow10 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.913 | 0.984 | 0.000 | 0.661 | 2.135 | n/a | 0.000 | 0.055 | 0.657 | 1.158 | 0.020 | n/a | 0.316 | 6.537 | n/a | n/a | 0.022 | 2.193 | 0.134 | 0.022 |
| p99 | 19.544 | 1.004 | 0.000 | 1.091 | 2.998 | n/a | 0.000 | 0.058 | 0.733 | 1.243 | 0.038 | n/a | 3.395 | 15.100 | n/a | n/a | 0.070 | 3.053 | 0.272 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000001d7 | 19.544 | 2.135 | n/a | 0.000 | 0.058 | 0.733 | 1.158 | 0.020 | n/a | 0.316 | 15.100 | n/a | n/a | 0.022 | 2.193 | 0.112 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b68000000000000024f | 11.913 | 1.561 | n/a | 0.000 | 0.037 | 0.657 | 1.243 | 0.038 | n/a | 3.395 | 4.961 | n/a | n/a | 0.020 | 1.598 | 0.134 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b680000000000000229 | 11.237 | 2.998 | n/a | 0.000 | 0.055 | 0.492 | 0.945 | 0.018 | n/a | 0.122 | 6.537 | n/a | n/a | 0.070 | 3.053 | 0.272 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.021ms |

## P4 / p4h10 / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.318 | 0.000 | 0.000 | 0.485 | 2.850 | n/a | 0.000 | 0.055 | 0.939 | 1.541 | 0.030 | n/a | 0.412 | 13.012 | n/a | n/a | 0.022 | 2.934 | 0.170 | 0.022 |
| p99 | 99.707 | 3.004 | 0.025 | 1.139 | 5.076 | n/a | 0.000 | 0.108 | 4.458 | 14.034 | 0.073 | n/a | 0.782 | 78.046 | n/a | n/a | 0.045 | 5.184 | 0.217 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000292 | 99.707 | 2.955 | n/a | 0.000 | 0.094 | 4.458 | 14.034 | 0.019 | n/a | 0.060 | 78.046 | n/a | n/a | 0.043 | 3.049 | 0.031 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.208ms |
| b1ec81021c5b5b680000000000000299 | 27.385 | 1.795 | n/a | 0.000 | 0.055 | 0.712 | 1.220 | 0.029 | n/a | 0.416 | 23.136 | n/a | n/a | 0.022 | 1.849 | 0.068 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.206ms |
| b1ec81021c5b5b6800000000000002ab | 24.998 | 5.076 | n/a | 0.000 | 0.108 | 2.792 | 13.735 | 0.066 | n/a | 0.406 | 2.773 | n/a | n/a | 0.041 | 5.184 | 0.207 | 0.041 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.069ms |
| b1ec81021c5b5b6800000000000002a3 | 21.205 | 4.239 | n/a | 0.000 | 0.104 | 1.150 | 2.440 | 0.036 | n/a | 0.179 | 13.012 | n/a | n/a | 0.045 | 4.343 | 0.205 | 0.045 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002ad | 19.646 | 3.661 | n/a | 0.000 | 0.055 | 0.648 | 1.538 | 0.016 | n/a | 0.155 | 13.551 | n/a | n/a | 0.022 | 3.716 | 0.189 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| b1ec81021c5b5b680000000000000295 | 19.318 | 2.045 | n/a | 0.000 | 0.052 | 0.687 | 1.470 | 0.073 | n/a | 0.468 | 14.503 | n/a | n/a | 0.021 | 2.097 | 0.109 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000029e | 18.680 | 1.748 | n/a | 0.000 | 0.052 | 0.662 | 1.198 | 0.015 | n/a | 0.412 | 14.571 | n/a | n/a | 0.021 | 1.800 | 0.096 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002a7 | 15.509 | 2.850 | n/a | 0.000 | 0.098 | 1.407 | 1.678 | 0.032 | n/a | 0.236 | 9.170 | n/a | n/a | 0.037 | 2.948 | 0.190 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000029c | 13.504 | 2.855 | n/a | 0.000 | 0.078 | 0.939 | 1.546 | 0.026 | n/a | 0.758 | 7.268 | n/a | n/a | 0.033 | 2.934 | 0.217 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002a1 | 13.257 | 2.200 | n/a | 0.000 | 0.054 | 0.945 | 1.541 | 0.030 | n/a | 0.782 | 7.683 | n/a | n/a | 0.022 | 2.254 | 0.170 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002a4 | 11.200 | 1.406 | n/a | 0.000 | 0.045 | 0.563 | 1.391 | 0.034 | n/a | 0.759 | 6.982 | n/a | n/a | 0.022 | 1.450 | 0.129 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.015ms |

## P4 / p4h10 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.509 | 0.000 | 0.000 | 0.471 | 2.200 | n/a | 0.000 | 0.055 | 0.939 | 1.541 | 0.029 | n/a | 0.412 | 7.683 | n/a | n/a | 0.022 | 2.254 | 0.129 | 0.022 |
| p99 | 99.707 | 0.912 | 0.000 | 0.727 | 5.076 | n/a | 0.000 | 0.108 | 4.458 | 14.034 | 0.066 | n/a | 0.782 | 78.046 | n/a | n/a | 0.043 | 5.184 | 0.217 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000000292 | 99.707 | 2.955 | n/a | 0.000 | 0.094 | 4.458 | 14.034 | 0.019 | n/a | 0.060 | 78.046 | n/a | n/a | 0.043 | 3.049 | 0.031 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.208ms |
| b1ec81021c5b5b680000000000000299 | 27.385 | 1.795 | n/a | 0.000 | 0.055 | 0.712 | 1.220 | 0.029 | n/a | 0.416 | 23.136 | n/a | n/a | 0.022 | 1.849 | 0.068 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.206ms |
| b1ec81021c5b5b6800000000000002ab | 24.998 | 5.076 | n/a | 0.000 | 0.108 | 2.792 | 13.735 | 0.066 | n/a | 0.406 | 2.773 | n/a | n/a | 0.041 | 5.184 | 0.207 | 0.041 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.069ms |
| b1ec81021c5b5b68000000000000029e | 18.680 | 1.748 | n/a | 0.000 | 0.052 | 0.662 | 1.198 | 0.015 | n/a | 0.412 | 14.571 | n/a | n/a | 0.021 | 1.800 | 0.096 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002a7 | 15.509 | 2.850 | n/a | 0.000 | 0.098 | 1.407 | 1.678 | 0.032 | n/a | 0.236 | 9.170 | n/a | n/a | 0.037 | 2.948 | 0.190 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b68000000000000029c | 13.504 | 2.855 | n/a | 0.000 | 0.078 | 0.939 | 1.546 | 0.026 | n/a | 0.758 | 7.268 | n/a | n/a | 0.033 | 2.934 | 0.217 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002a1 | 13.257 | 2.200 | n/a | 0.000 | 0.054 | 0.945 | 1.541 | 0.030 | n/a | 0.782 | 7.683 | n/a | n/a | 0.022 | 2.254 | 0.170 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002a4 | 11.200 | 1.406 | n/a | 0.000 | 0.045 | 0.563 | 1.391 | 0.034 | n/a | 0.759 | 6.982 | n/a | n/a | 0.022 | 1.450 | 0.129 | 0.022 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.015ms |

## P5 / presweep / commit (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.717 | 0.564 | 0.000 | 0.461 | 2.524 | n/a | 0.000 | 0.045 | 0.780 | 1.134 | 0.017 | n/a | 0.284 | 5.682 | n/a | n/a | 0.021 | 2.702 | 0.207 | 0.021 |
| p99 | 38.355 | 2.411 | 0.038 | 1.290 | 5.590 | n/a | 0.000 | 9.087 | 3.500 | 4.030 | 0.067 | n/a | 3.675 | 30.481 | n/a | n/a | 0.069 | 10.694 | 0.523 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000002e1 | 38.355 | 2.646 | n/a | 0.000 | 0.042 | 2.846 | 2.158 | 0.037 | n/a | 0.122 | 30.481 | n/a | n/a | 0.023 | 2.688 | 0.070 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| b1ec81021c5b5b6800000000000002d3 | 26.958 | 2.617 | n/a | 0.000 | 0.085 | 1.560 | 1.662 | 0.033 | n/a | 0.103 | 20.830 | n/a | n/a | 0.069 | 2.702 | 0.100 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.015ms |
| b1ec81021c5b5b6800000000000002b8 | 26.078 | 5.590 | n/a | 0.000 | 0.047 | 2.721 | 4.030 | 0.067 | n/a | 0.321 | 13.281 | n/a | n/a | 0.023 | 5.636 | 0.216 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c0 | 20.442 | 1.607 | n/a | 0.000 | 9.087 | 0.540 | 1.134 | 0.015 | n/a | 3.675 | 4.349 | n/a | n/a | 0.035 | 10.694 | 0.523 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| b1ec81021c5b5b6800000000000002d7 | 18.043 | 2.615 | n/a | 0.000 | 0.969 | 0.635 | 1.335 | 0.017 | n/a | 0.600 | 11.858 | n/a | n/a | 0.013 | 3.584 | 0.199 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002cf | 17.658 | 4.125 | n/a | 0.000 | 0.019 | 0.793 | 1.125 | 0.017 | n/a | 0.097 | 11.469 | n/a | n/a | 0.013 | 4.144 | 0.235 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002d0 | 16.724 | 4.295 | n/a | 0.000 | 0.307 | 2.044 | 1.102 | 0.015 | n/a | 0.394 | 8.541 | n/a | n/a | 0.026 | 4.602 | 0.275 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms |
| b1ec81021c5b5b6800000000000002d4 | 15.634 | 1.622 | n/a | 0.000 | 0.039 | 0.698 | 1.459 | 0.052 | n/a | 3.074 | 8.668 | n/a | n/a | 0.021 | 1.661 | 0.106 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002bf | 14.628 | 3.355 | n/a | 0.000 | 0.108 | 3.500 | 1.607 | 0.027 | n/a | 0.159 | 5.829 | n/a | n/a | 0.042 | 3.463 | 0.237 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c1 | 13.289 | 3.800 | n/a | 0.000 | 0.078 | 0.650 | 1.069 | 0.016 | n/a | 0.120 | 7.517 | n/a | n/a | 0.039 | 3.877 | 0.292 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.023ms |
| b1ec81021c5b5b6800000000000002b6 | 12.272 | 4.469 | n/a | 0.000 | 0.048 | 0.952 | 0.948 | 0.017 | n/a | 0.132 | 5.682 | n/a | n/a | 0.025 | 4.516 | 0.368 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.170ms |
| b1ec81021c5b5b6800000000000002cd | 11.717 | 2.768 | n/a | 0.000 | 0.055 | 0.665 | 1.101 | 0.015 | n/a | 0.284 | 6.802 | n/a | n/a | 0.026 | 2.823 | 0.241 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c5 | 11.252 | 3.998 | n/a | 0.000 | 0.069 | 0.745 | 1.120 | 0.016 | n/a | 0.464 | 4.810 | n/a | n/a | 0.031 | 4.067 | 0.361 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c7 | 11.165 | 1.575 | n/a | 0.000 | 0.043 | 0.782 | 2.967 | 0.034 | n/a | 0.707 | 5.039 | n/a | n/a | 0.019 | 1.618 | 0.145 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002da | 10.290 | 2.043 | n/a | 0.000 | 0.036 | 1.159 | 1.470 | 0.020 | n/a | 0.414 | 5.131 | n/a | n/a | 0.018 | 2.079 | 0.202 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.078ms; driver.publication.persist-deferred 0.019ms |
| b1ec81021c5b5b6800000000000002cb | 10.256 | 1.475 | n/a | 0.000 | 0.028 | 0.780 | 1.563 | 0.029 | n/a | 0.156 | 6.208 | n/a | n/a | 0.017 | 1.503 | 0.147 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002d9 | 9.881 | 1.782 | n/a | 0.000 | 0.044 | 1.786 | 1.209 | 0.016 | n/a | 0.453 | 4.569 | n/a | n/a | 0.021 | 1.827 | 0.185 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002dd | 9.714 | 2.524 | n/a | 0.000 | 0.730 | 0.543 | 0.913 | 0.014 | n/a | 0.074 | 4.905 | n/a | n/a | 0.011 | 3.254 | 0.335 | 0.011 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b6800000000000002df | 8.883 | 1.483 | n/a | 0.000 | 0.038 | 0.513 | 0.905 | 0.017 | n/a | 0.266 | 5.643 | n/a | n/a | 0.018 | 1.521 | 0.171 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002b3 | 8.772 | 1.770 | n/a | 0.000 | 0.045 | 0.729 | 0.953 | 0.017 | n/a | 0.133 | 5.105 | n/a | n/a | 0.020 | 1.815 | 0.207 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.256 | 0.074 | 0.000 | 0.389 | 1.760 | n/a | 0.000 | 0.044 | 0.729 | 1.134 | 0.017 | n/a | 0.284 | 5.105 | n/a | n/a | 0.020 | 1.815 | 0.207 | 0.020 |
| p99 | 26.078 | 2.411 | 0.031 | 1.290 | 5.590 | n/a | 0.000 | 9.087 | 3.500 | 4.030 | 0.067 | n/a | 3.675 | 13.281 | n/a | n/a | 0.042 | 10.694 | 0.523 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000002b8 | 26.078 | 5.590 | n/a | 0.000 | 0.047 | 2.721 | 4.030 | 0.067 | n/a | 0.321 | 13.281 | n/a | n/a | 0.023 | 5.636 | 0.216 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c0 | 20.442 | 1.607 | n/a | 0.000 | 9.087 | 0.540 | 1.134 | 0.015 | n/a | 3.675 | 4.349 | n/a | n/a | 0.035 | 10.694 | 0.523 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.015ms |
| b1ec81021c5b5b6800000000000002d4 | 15.634 | 1.622 | n/a | 0.000 | 0.039 | 0.698 | 1.459 | 0.052 | n/a | 3.074 | 8.668 | n/a | n/a | 0.021 | 1.661 | 0.106 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002bf | 14.628 | 3.355 | n/a | 0.000 | 0.108 | 3.500 | 1.607 | 0.027 | n/a | 0.159 | 5.829 | n/a | n/a | 0.042 | 3.463 | 0.237 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002b6 | 12.272 | 4.469 | n/a | 0.000 | 0.048 | 0.952 | 0.948 | 0.017 | n/a | 0.132 | 5.682 | n/a | n/a | 0.025 | 4.516 | 0.368 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.170ms |
| b1ec81021c5b5b6800000000000002cd | 11.717 | 2.768 | n/a | 0.000 | 0.055 | 0.665 | 1.101 | 0.015 | n/a | 0.284 | 6.802 | n/a | n/a | 0.026 | 2.823 | 0.241 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c7 | 11.165 | 1.575 | n/a | 0.000 | 0.043 | 0.782 | 2.967 | 0.034 | n/a | 0.707 | 5.039 | n/a | n/a | 0.019 | 1.618 | 0.145 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002cb | 10.256 | 1.475 | n/a | 0.000 | 0.028 | 0.780 | 1.563 | 0.029 | n/a | 0.156 | 6.208 | n/a | n/a | 0.017 | 1.503 | 0.147 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002d9 | 9.881 | 1.782 | n/a | 0.000 | 0.044 | 1.786 | 1.209 | 0.016 | n/a | 0.453 | 4.569 | n/a | n/a | 0.021 | 1.827 | 0.185 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002dd | 9.714 | 2.524 | n/a | 0.000 | 0.730 | 0.543 | 0.913 | 0.014 | n/a | 0.074 | 4.905 | n/a | n/a | 0.011 | 3.254 | 0.335 | 0.011 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b6800000000000002df | 8.883 | 1.483 | n/a | 0.000 | 0.038 | 0.513 | 0.905 | 0.017 | n/a | 0.266 | 5.643 | n/a | n/a | 0.018 | 1.521 | 0.171 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002b3 | 8.772 | 1.770 | n/a | 0.000 | 0.045 | 0.729 | 0.953 | 0.017 | n/a | 0.133 | 5.105 | n/a | n/a | 0.020 | 1.815 | 0.207 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002bb | 8.615 | 1.760 | n/a | 0.000 | 0.041 | 0.828 | 1.471 | 0.028 | n/a | 0.655 | 3.813 | n/a | n/a | 0.019 | 1.801 | 0.209 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b6800000000000002c9 | 8.083 | 1.522 | n/a | 0.000 | 0.037 | 0.494 | 1.106 | 0.016 | n/a | 0.458 | 4.431 | n/a | n/a | 0.020 | 1.559 | 0.193 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.632 | 0.238 | 0.000 | 0.343 | 3.200 | n/a | 0.000 | 0.030 | 12.878 | 1.068 | 0.017 | n/a | 0.104 | 70.917 | n/a | n/a | 0.011 | 4.731 | 0.063 | 0.011 |
| p99 | 172.583 | 1.543 | 2.643 | 3.119 | 7.437 | n/a | 1.451 | 109.462 | 27.792 | 4.866 | 0.042 | n/a | 9.729 | 115.328 | n/a | n/a | 0.048 | 111.092 | 0.903 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000002ee | 172.583 | 2.086 | n/a | 0.000 | 94.777 | 2.885 | 0.792 | 0.018 | n/a | 0.371 | 71.641 | n/a | n/a | 0.012 | 96.864 | 0.561 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 2.699ms; driver.publication.readback 0.344ms; driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms |
| b1ec81021c5b5b6800000000000002e9 | 151.703 | 5.934 | n/a | 1.451 | 0.006 | 25.824 | 1.542 | 0.038 | n/a | 8.459 | 108.405 | n/a | n/a | 0.043 | 7.391 | 0.049 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms |
| b1ec81021c5b5b6800000000000002ef | 147.646 | 1.685 | n/a | 0.000 | 15.468 | 11.245 | 1.161 | 0.014 | n/a | 5.552 | 112.508 | n/a | n/a | 0.013 | 17.153 | 0.116 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms |
| b1ec81021c5b5b6800000000000002ea | 143.646 | 6.552 | n/a | 1.451 | 0.005 | 27.792 | 1.561 | 0.037 | n/a | 0.104 | 106.139 | n/a | n/a | 0.004 | 8.009 | 0.056 | 0.004 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms |
| b1ec81021c5b5b6800000000000002ec | 141.333 | 1.279 | n/a | 0.000 | 25.662 | 10.369 | 1.614 | 0.035 | n/a | 0.090 | 102.272 | n/a | n/a | 0.011 | 26.942 | 0.191 | 0.011 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms |
| b1ec81021c5b5b6800000000000002f0 | 136.942 | 3.450 | n/a | 0.000 | 0.061 | 22.247 | 1.130 | 0.010 | n/a | 0.025 | 109.995 | n/a | n/a | 0.025 | 3.511 | 0.026 | 0.025 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms |
| b1ec81021c5b5b6800000000000002f4 | 123.012 | 1.629 | n/a | 0.000 | 109.462 | 0.287 | 1.068 | 0.016 | n/a | 0.198 | 10.342 | n/a | n/a | 0.009 | 111.092 | 0.903 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 2.699ms; driver.publication.readback 0.344ms; driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms |
| b1ec81021c5b5b6800000000000002f2 | 122.607 | 1.839 | n/a | 0.000 | 0.043 | 4.439 | 0.887 | 0.007 | n/a | 0.016 | 115.328 | n/a | n/a | 0.048 | 1.882 | 0.015 | 0.048 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms |
| b1ec81021c5b5b6800000000000002f3 | 117.902 | 1.464 | n/a | 0.000 | 0.035 | 0.490 | 4.866 | 0.025 | n/a | 0.102 | 110.880 | n/a | n/a | 0.040 | 1.500 | 0.013 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms |
| b1ec81021c5b5b6800000000000002ed | 100.311 | 1.738 | n/a | 0.000 | 4.974 | 21.103 | 1.390 | 0.042 | n/a | 0.134 | 70.917 | n/a | n/a | 0.013 | 6.712 | 0.067 | 0.013 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| b1ec81021c5b5b6800000000000002f6 | 96.632 | 4.998 | n/a | 0.000 | 0.092 | 2.070 | 0.790 | 0.017 | n/a | 0.131 | 88.502 | n/a | n/a | 0.033 | 5.090 | 0.053 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.077ms |
| b1ec81021c5b5b6800000000000002e8 | 96.452 | 5.203 | n/a | 1.451 | 0.005 | 19.912 | 0.841 | 0.005 | n/a | 0.019 | 69.011 | n/a | n/a | 0.004 | 6.659 | 0.069 | 0.004 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms |
| b1ec81021c5b5b6800000000000002f5 | 96.407 | 4.701 | n/a | 0.000 | 0.030 | 0.699 | 1.573 | 0.019 | n/a | 0.063 | 89.303 | n/a | n/a | 0.020 | 4.731 | 0.049 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms |
| b1ec81021c5b5b6800000000000002eb | 86.317 | 7.437 | n/a | 1.451 | 0.006 | 18.380 | 0.609 | 0.006 | n/a | 0.016 | 58.406 | n/a | n/a | 0.005 | 8.895 | 0.103 | 0.005 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| b1ec81021c5b5b6800000000000002e7 | 70.026 | 4.413 | n/a | 0.000 | 0.005 | 20.868 | 0.676 | 0.016 | n/a | 0.473 | 43.572 | n/a | n/a | 0.004 | 4.418 | 0.063 | 0.004 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.readback 0.069ms; driver.publication.readback 0.064ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| b1ec81021c5b5b6800000000000002e6 | 64.365 | 4.554 | n/a | 0.000 | 0.006 | 21.899 | 0.579 | 0.023 | n/a | 0.031 | 37.267 | n/a | n/a | 0.006 | 4.560 | 0.071 | 0.006 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms; driver.publication.readback 0.038ms |
| b1ec81021c5b5b6800000000000002e4 | 51.553 | 3.200 | n/a | 0.000 | 0.008 | 21.352 | 0.899 | 0.016 | n/a | 0.054 | 26.018 | n/a | n/a | 0.007 | 3.208 | 0.062 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.082ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.023ms |
| b1ec81021c5b5b6800000000000002e3 | 43.760 | 2.526 | n/a | 0.000 | 0.011 | 17.198 | 1.002 | 0.017 | n/a | 3.866 | 19.133 | n/a | n/a | 0.006 | 2.538 | 0.058 | 0.006 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.016ms |
| b1ec81021c5b5b6800000000000002e5 | 39.138 | 3.651 | n/a | 0.000 | 0.007 | 12.878 | 2.524 | 0.042 | n/a | 9.729 | 10.303 | n/a | n/a | 0.005 | 3.658 | 0.093 | 0.005 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.020ms |
| b1ec81021c5b5b6800000000000002e2 | 31.062 | 2.014 | n/a | 0.000 | 0.045 | 9.786 | 1.459 | 0.035 | n/a | 2.486 | 15.223 | n/a | n/a | 0.014 | 2.059 | 0.066 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.023ms |

## P5 / sweep / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 122.607 | 0.000 | 0.000 | 0.331 | 1.839 | n/a | 0.000 | 0.092 | 2.885 | 0.887 | 0.018 | n/a | 0.102 | 102.272 | n/a | n/a | 0.033 | 5.090 | 0.053 | 0.033 |
| p99 | 172.583 | 1.496 | 2.643 | 3.119 | 4.998 | n/a | 0.000 | 94.777 | 10.369 | 4.866 | 0.035 | n/a | 0.371 | 115.328 | n/a | n/a | 0.048 | 96.864 | 0.561 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000002ee | 172.583 | 2.086 | n/a | 0.000 | 94.777 | 2.885 | 0.792 | 0.018 | n/a | 0.371 | 71.641 | n/a | n/a | 0.012 | 96.864 | 0.561 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 2.699ms; driver.publication.readback 0.344ms; driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms |
| b1ec81021c5b5b6800000000000002ec | 141.333 | 1.279 | n/a | 0.000 | 25.662 | 10.369 | 1.614 | 0.035 | n/a | 0.090 | 102.272 | n/a | n/a | 0.011 | 26.942 | 0.191 | 0.011 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms; driver.publication.readback 0.069ms |
| b1ec81021c5b5b6800000000000002f2 | 122.607 | 1.839 | n/a | 0.000 | 0.043 | 4.439 | 0.887 | 0.007 | n/a | 0.016 | 115.328 | n/a | n/a | 0.048 | 1.882 | 0.015 | 0.048 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.082ms; driver.publication.readback 0.077ms |
| b1ec81021c5b5b6800000000000002f3 | 117.902 | 1.464 | n/a | 0.000 | 0.035 | 0.490 | 4.866 | 0.025 | n/a | 0.102 | 110.880 | n/a | n/a | 0.040 | 1.500 | 0.013 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.074ms |
| b1ec81021c5b5b6800000000000002f6 | 96.632 | 4.998 | n/a | 0.000 | 0.092 | 2.070 | 0.790 | 0.017 | n/a | 0.131 | 88.502 | n/a | n/a | 0.033 | 5.090 | 0.053 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.344ms; driver.publication.readback 0.142ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.publication.readback 0.077ms |

## P2 / tail / commit (3318 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.926 | 0.182 | 0.000 | 0.469 | 2.000 | n/a | 0.000 | 0.040 | 0.524 | 0.919 | 0.012 | n/a | 0.100 | 5.018 | n/a | n/a | 0.013 | 2.308 | 0.240 | 0.013 |
| p99 | 37.704 | 2.013 | 0.041 | 2.021 | 6.778 | n/a | 0.000 | 19.582 | 5.121 | 4.852 | 0.045 | n/a | 2.733 | 23.881 | n/a | n/a | 0.044 | 22.388 | 0.731 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b6800000000000002f9 | 82.076 | 1.725 | n/a | 0.000 | 64.903 | 0.925 | 1.755 | 0.033 | n/a | 3.364 | 9.363 | n/a | n/a | 0.010 | 66.627 | 0.812 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 2.699ms; driver.publication.readback 0.344ms; driver.publication.readback 0.127ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.110ms |
| b1ec81021c5b5b680000000000001c22 | 74.300 | 1.191 | n/a | 0.000 | 61.289 | 0.321 | 0.693 | 0.012 | n/a | 0.048 | 10.692 | n/a | n/a | 0.053 | 62.480 | 0.841 | 0.053 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.396ms; driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.050ms |
| b1ec81021c5b5b680000000000000382 | 62.804 | 4.361 | n/a | 0.000 | 0.041 | 0.645 | 1.404 | 0.015 | n/a | 1.106 | 55.211 | n/a | n/a | 0.020 | 4.403 | 0.070 | 0.020 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000000383 | 62.432 | 2.057 | n/a | 0.000 | 0.017 | 3.800 | 0.626 | 0.007 | n/a | 0.145 | 55.766 | n/a | n/a | 0.012 | 2.074 | 0.033 | 0.012 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.023ms |
| b1ec81021c5b5b680000000000001c21 | 61.820 | 2.344 | n/a | 0.000 | 44.620 | 0.306 | 0.891 | 0.010 | n/a | 0.230 | 13.412 | n/a | n/a | 0.008 | 46.963 | 0.760 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.396ms; driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms |
| b1ec81021c5b5b6800000000000002ff | 59.833 | 1.239 | n/a | 0.000 | 47.835 | 1.940 | 0.641 | 0.012 | n/a | 0.065 | 8.088 | n/a | n/a | 0.012 | 49.074 | 0.820 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 2.699ms; driver.publication.readback 0.344ms; driver.reader-basis.broadcast 0.110ms; driver.publication.readback 0.070ms; driver.publication.readback 0.061ms |
| b1ec81021c5b5b68000000000000038c | 59.224 | 2.806 | n/a | 0.000 | 19.632 | 3.531 | 1.219 | 0.015 | n/a | 0.064 | 31.946 | n/a | n/a | 0.010 | 22.438 | 0.379 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.133ms; driver.publication.readback 0.099ms; driver.publication.readback 0.068ms; driver.publication.readback 0.059ms; driver.publication.readback 0.052ms |
| b1ec81021c5b5b68000000000000171d | 56.429 | 2.225 | n/a | 0.000 | 46.198 | 0.374 | 0.842 | 0.010 | n/a | 0.072 | 6.696 | n/a | n/a | 0.013 | 48.423 | 0.858 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.557ms; driver.publication.readback 0.319ms; driver.publication.readback 0.223ms; driver.publication.readback 0.130ms; driver.publication.readback 0.112ms |
| b1ec81021c5b5b680000000000000386 | 55.901 | 3.302 | n/a | 0.000 | 41.947 | 1.005 | 1.487 | 0.015 | n/a | 0.365 | 7.767 | n/a | n/a | 0.012 | 45.249 | 0.809 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.063ms; driver.publication.readback 0.059ms; driver.publication.readback 0.052ms; driver.publication.readback 0.048ms |
| b1ec81021c5b5b680000000000000802 | 53.956 | 6.880 | n/a | 0.000 | 23.374 | 8.942 | 4.692 | 0.041 | n/a | 0.498 | 9.510 | n/a | n/a | 0.019 | 30.254 | 0.561 | 0.019 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.789ms; driver.publication.readback 0.514ms; driver.publication.readback 0.048ms; driver.publication.readback 0.046ms; driver.publication.readback 0.045ms |
| b1ec81021c5b5b680000000000000384 | 53.671 | 2.111 | n/a | 0.000 | 36.641 | 0.418 | 2.430 | 0.041 | n/a | 0.168 | 11.851 | n/a | n/a | 0.011 | 38.751 | 0.722 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.113ms; driver.publication.readback 0.063ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.037ms; driver.publication.readback 0.036ms |
| b1ec81021c5b5b680000000000000800 | 52.942 | 6.095 | n/a | 0.000 | 34.858 | 0.548 | 2.989 | 0.026 | n/a | 0.142 | 8.229 | n/a | n/a | 0.054 | 40.953 | 0.774 | 0.054 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.789ms; driver.publication.readback 0.514ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.048ms; driver.publication.readback 0.045ms |
| b1ec81021c5b5b680000000000000acd | 51.088 | 5.362 | n/a | 0.000 | 24.897 | 0.593 | 4.476 | 0.026 | n/a | 0.846 | 14.849 | n/a | n/a | 0.038 | 30.259 | 0.592 | 0.038 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.333ms; driver.publication.readback 0.141ms; driver.publication.readback 0.061ms; driver.publication.readback 0.047ms; driver.publication.readback 0.046ms |
| b1ec81021c5b5b680000000000000393 | 49.283 | 1.623 | n/a | 0.000 | 0.027 | 0.587 | 1.528 | 0.010 | n/a | 0.035 | 45.460 | n/a | n/a | 0.013 | 1.650 | 0.033 | 0.013 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.099ms; driver.publication.readback 0.060ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.018ms |
| b1ec81021c5b5b68000000000000171c | 49.151 | 4.049 | n/a | 0.000 | 36.212 | 1.709 | 0.902 | 0.023 | n/a | 0.090 | 6.151 | n/a | n/a | 0.015 | 40.260 | 0.819 | 0.015 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.557ms; driver.publication.readback 0.319ms; driver.publication.readback 0.223ms; driver.publication.readback 0.112ms; driver.publication.readback 0.044ms |
| b1ec81021c5b5b680000000000000400 | 48.122 | 1.413 | n/a | 0.000 | 39.062 | 0.447 | 0.777 | 0.014 | n/a | 0.286 | 6.112 | n/a | n/a | 0.011 | 40.475 | 0.841 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.048ms; driver.publication.readback 0.045ms; driver.publication.readback 0.036ms; driver.publication.readback 0.036ms |
| b1ec81021c5b5b680000000000001c1f | 46.698 | 1.228 | n/a | 0.000 | 15.253 | 0.175 | 0.521 | 0.006 | n/a | 0.178 | 29.329 | n/a | n/a | 0.006 | 16.482 | 0.353 | 0.006 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms; driver.publication.readback 0.047ms |
| b1ec81021c5b5b6800000000000011a3 | 44.912 | 0.972 | n/a | 0.000 | 27.836 | 3.238 | 1.020 | 0.021 | n/a | 2.463 | 9.356 | n/a | n/a | 0.006 | 28.809 | 0.641 | 0.006 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.169ms; driver.publication.readback 0.130ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.readback 0.047ms |
| b1ec81021c5b5b680000000000000676 | 41.898 | 3.669 | n/a | 0.000 | 1.210 | 0.532 | 0.615 | 0.006 | n/a | 0.188 | 35.656 | n/a | n/a | 0.021 | 4.879 | 0.116 | 0.021 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.109ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.031ms |
| b1ec81021c5b5b6800000000000011f0 | 41.809 | 1.223 | n/a | 0.000 | 33.241 | 0.471 | 1.344 | 0.027 | n/a | 0.604 | 4.892 | n/a | n/a | 0.007 | 34.464 | 0.824 | 0.007 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.209ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.078ms; driver.publication.readback 0.075ms; driver.publication.readback 0.056ms |

## P2 / tail / commit / 5-10 facts (2010 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.570 | 0.000 | 0.000 | 0.374 | 1.607 | n/a | 0.000 | 0.040 | 0.518 | 0.796 | 0.012 | n/a | 0.099 | 4.497 | n/a | n/a | 0.013 | 1.848 | 0.223 | 0.013 |
| p99 | 36.147 | 1.996 | 0.033 | 0.850 | 4.562 | n/a | 0.000 | 18.447 | 5.068 | 4.588 | 0.041 | n/a | 1.984 | 21.515 | n/a | n/a | 0.045 | 19.930 | 0.736 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b1ec81021c5b5b680000000000001c22 | 74.300 | 1.191 | n/a | 0.000 | 61.289 | 0.321 | 0.693 | 0.012 | n/a | 0.048 | 10.692 | n/a | n/a | 0.053 | 62.480 | 0.841 | 0.053 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.396ms; driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.050ms |
| b1ec81021c5b5b6800000000000002ff | 59.833 | 1.239 | n/a | 0.000 | 47.835 | 1.940 | 0.641 | 0.012 | n/a | 0.065 | 8.088 | n/a | n/a | 0.012 | 49.074 | 0.820 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.add-commit 2.699ms; driver.publication.readback 0.344ms; driver.reader-basis.broadcast 0.110ms; driver.publication.readback 0.070ms; driver.publication.readback 0.061ms |
| b1ec81021c5b5b68000000000000171d | 56.429 | 2.225 | n/a | 0.000 | 46.198 | 0.374 | 0.842 | 0.010 | n/a | 0.072 | 6.696 | n/a | n/a | 0.013 | 48.423 | 0.858 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.557ms; driver.publication.readback 0.319ms; driver.publication.readback 0.223ms; driver.publication.readback 0.130ms; driver.publication.readback 0.112ms |
| b1ec81021c5b5b680000000000000400 | 48.122 | 1.413 | n/a | 0.000 | 39.062 | 0.447 | 0.777 | 0.014 | n/a | 0.286 | 6.112 | n/a | n/a | 0.011 | 40.475 | 0.841 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.048ms; driver.publication.readback 0.045ms; driver.publication.readback 0.036ms; driver.publication.readback 0.036ms |
| b1ec81021c5b5b680000000000001c1f | 46.698 | 1.228 | n/a | 0.000 | 15.253 | 0.175 | 0.521 | 0.006 | n/a | 0.178 | 29.329 | n/a | n/a | 0.006 | 16.482 | 0.353 | 0.006 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.319ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.048ms; driver.publication.readback 0.047ms |
| b1ec81021c5b5b6800000000000011a3 | 44.912 | 0.972 | n/a | 0.000 | 27.836 | 3.238 | 1.020 | 0.021 | n/a | 2.463 | 9.356 | n/a | n/a | 0.006 | 28.809 | 0.641 | 0.006 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.169ms; driver.publication.readback 0.130ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.readback 0.047ms |
| b1ec81021c5b5b680000000000000676 | 41.898 | 3.669 | n/a | 0.000 | 1.210 | 0.532 | 0.615 | 0.006 | n/a | 0.188 | 35.656 | n/a | n/a | 0.021 | 4.879 | 0.116 | 0.021 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.109ms; driver.publication.readback 0.101ms; driver.publication.persist-deferred 0.031ms |
| b1ec81021c5b5b6800000000000011f0 | 41.809 | 1.223 | n/a | 0.000 | 33.241 | 0.471 | 1.344 | 0.027 | n/a | 0.604 | 4.892 | n/a | n/a | 0.007 | 34.464 | 0.824 | 0.007 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.209ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.078ms; driver.publication.readback 0.075ms; driver.publication.readback 0.056ms |
| b1ec81021c5b5b68000000000000185b | 41.678 | 3.390 | n/a | 0.000 | 25.674 | 1.565 | 1.406 | 0.027 | n/a | 0.081 | 9.511 | n/a | n/a | 0.023 | 29.064 | 0.697 | 0.023 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.120ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.060ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.015ms |
| b1ec81021c5b5b680000000000000ac8 | 41.611 | 1.275 | n/a | 0.000 | 17.221 | 0.577 | 6.361 | 0.033 | n/a | 0.071 | 16.062 | n/a | n/a | 0.011 | 18.497 | 0.445 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.333ms; driver.publication.readback 0.141ms; driver.publication.readback 0.102ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.034ms |
| b1ec81021c5b5b680000000000000e5f | 41.043 | 1.633 | n/a | 0.000 | 11.116 | 8.060 | 0.440 | 0.005 | n/a | 1.084 | 18.695 | n/a | n/a | 0.010 | 12.749 | 0.311 | 0.010 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.016ms; driver.publication.readback 0.192ms; driver.publication.readback 0.120ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.023ms |
| b1ec81021c5b5b6800000000000007fe | 40.818 | 2.565 | n/a | 0.000 | 31.206 | 1.409 | 0.790 | 0.012 | n/a | 0.704 | 4.112 | n/a | n/a | 0.020 | 33.771 | 0.827 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.789ms; driver.reader-basis.broadcast 0.097ms; driver.publication.readback 0.048ms; driver.publication.readback 0.043ms; driver.publication.readback 0.041ms |
| b1ec81021c5b5b680000000000001be4 | 40.600 | 1.724 | n/a | 0.000 | 32.261 | 0.378 | 0.792 | 0.013 | n/a | 0.672 | 4.749 | n/a | n/a | 0.010 | 33.985 | 0.837 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.573ms; driver.publication.readback 0.127ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.019ms |
| b1ec81021c5b5b6800000000000003fd | 40.207 | 1.420 | n/a | 0.000 | 24.823 | 0.470 | 1.013 | 0.040 | n/a | 0.167 | 12.263 | n/a | n/a | 0.011 | 26.243 | 0.653 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.052ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.040ms; driver.publication.readback 0.036ms; driver.publication.readback 0.029ms |
| b1ec81021c5b5b68000000000000171a | 40.156 | 2.337 | n/a | 0.000 | 30.759 | 0.378 | 0.841 | 0.011 | n/a | 0.284 | 5.509 | n/a | n/a | 0.037 | 33.096 | 0.824 | 0.037 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.557ms; driver.publication.readback 0.319ms; driver.publication.readback 0.223ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.022ms |
| b1ec81021c5b5b680000000000001be6 | 40.080 | 2.035 | n/a | 0.000 | 27.528 | 0.281 | 0.656 | 0.010 | n/a | 0.220 | 9.340 | n/a | n/a | 0.010 | 29.562 | 0.738 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.573ms; driver.publication.readback 0.127ms; driver.publication.readback 0.060ms; driver.publication.readback 0.059ms; driver.publication.readback 0.037ms |
| b1ec81021c5b5b68000000000000171b | 39.053 | 1.874 | n/a | 0.000 | 30.361 | 0.472 | 1.135 | 0.020 | n/a | 0.060 | 5.121 | n/a | n/a | 0.009 | 32.236 | 0.825 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.557ms; driver.publication.readback 0.319ms; driver.publication.readback 0.223ms; driver.publication.readback 0.044ms; driver.publication.readback 0.042ms |
| b1ec81021c5b5b68000000000000039f | 38.958 | 1.374 | n/a | 0.000 | 0.023 | 0.289 | 0.733 | 0.009 | n/a | 0.033 | 36.484 | n/a | n/a | 0.012 | 1.397 | 0.036 | 0.012 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.016ms |
| b1ec81021c5b5b68000000000000039e | 37.704 | 1.628 | n/a | 0.000 | 0.057 | 0.571 | 0.829 | 0.013 | n/a | 0.072 | 34.510 | n/a | n/a | 0.023 | 1.685 | 0.045 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| b1ec81021c5b5b680000000000001d32 | 37.187 | 2.927 | n/a | 0.000 | 19.101 | 1.329 | 0.604 | 0.012 | n/a | 0.273 | 12.927 | n/a | n/a | 0.015 | 22.028 | 0.592 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.097ms; driver.publication.readback 0.090ms; driver.publication.readback 0.072ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.035ms |

## P1 / warmup / read (1235 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 296.912 | n/a | n/a | n/a | 14.608 | n/a | 0.000 | 296.869 | 0.706 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.693 | 296.909 | 1.000 | 48.693 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98a3d134b84e219e0000000000002cd6 | 297.615 | 0.435 | n/a | 0.000 | 297.163 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 297.599 | 1.000 | 0.016 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000001e06 | 297.417 | 0.401 | n/a | 0.000 | 297.012 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 297.413 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000002cdb | 297.400 | 0.019 | n/a | 0.000 | 297.380 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.399 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000002cda | 297.389 | 0.016 | n/a | 0.000 | 297.372 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.388 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000002cd7 | 297.387 | 0.065 | n/a | 0.000 | 297.320 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.385 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000002cd9 | 297.383 | 0.017 | n/a | 0.000 | 297.365 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.382 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000002cd8 | 297.375 | 0.022 | n/a | 0.000 | 297.351 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.374 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000001e0a | 297.238 | 0.017 | n/a | 0.000 | 297.221 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.238 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000001e07 | 297.237 | 0.050 | n/a | 0.000 | 297.185 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.235 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000001e09 | 297.229 | 0.017 | n/a | 0.000 | 297.211 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.229 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000001e08 | 297.223 | 0.021 | n/a | 0.000 | 297.201 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.222 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000003984 | 297.184 | 0.413 | n/a | 0.000 | 296.758 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 297.171 | 1.000 | 0.013 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000003985 | 296.912 | 0.041 | n/a | 0.000 | 296.869 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.909 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000003986 | 296.894 | 0.023 | n/a | 0.000 | 296.869 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.892 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000003987 | 296.888 | 0.021 | n/a | 0.000 | 296.865 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.886 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000003988 | 296.882 | 0.021 | n/a | 0.000 | 296.859 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.880 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000044d66 | 275.115 | 0.019 | n/a | 0.000 | 275.095 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.114 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000044d65 | 275.108 | 0.018 | n/a | 0.000 | 275.089 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.107 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000044d64 | 275.101 | 0.019 | n/a | 0.000 | 275.081 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.100 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000044d63 | 275.093 | 0.020 | n/a | 0.000 | 275.072 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.092 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (353 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 268.951 | n/a | n/a | n/a | 0.630 | n/a | 0.000 | 268.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.462 | 268.948 | 1.000 | 0.462 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98a3d134b84e219e00000000000aa194 | 424.709 | 0.128 | n/a | 0.000 | 424.580 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 424.707 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000006b256 | 273.919 | 0.147 | n/a | 0.000 | 273.768 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.916 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000006918c | 273.010 | 0.176 | n/a | 0.000 | 272.831 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.007 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000087260 | 268.951 | 0.264 | n/a | 0.000 | 268.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.948 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000005979f | 7.497 | 2.805 | n/a | 0.000 | 0.000 | 0.423 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.269 | 2.805 | 0.374 | 4.269 | node-14/thread-4/socket.wait-first-byte | none observed |
| 98a3d134b84e219e000000000006cd05 | 2.397 | 2.396 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.396 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000008f881 | 2.033 | 2.031 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.031 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000008d3a3 | 0.633 | 0.630 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.630 | 0.996 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000000948f6 | 0.609 | 0.606 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.606 | 0.995 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000009e993 | 0.609 | 0.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.604 | 0.992 | 0.005 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000006c4fe | 0.548 | 0.545 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.545 | 0.995 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000000852c0 | 0.501 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.501 | 0.000 | 0.000 | 0.501 | uncovered | none observed |
| 98a3d134b84e219e00000000000a6f5e | 0.485 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | uncovered | none observed |
| 98a3d134b84e219e0000000000068232 | 0.462 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 | uncovered | none observed |
| 98a3d134b84e219e0000000000066c0b | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| 98a3d134b84e219e0000000000091e8f | 0.453 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.453 | 0.000 | 0.000 | 0.453 | uncovered | none observed |
| 98a3d134b84e219e000000000006c46f | 0.448 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | uncovered | none observed |
| 98a3d134b84e219e000000000005de50 | 0.409 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.409 | 0.000 | 0.000 | 0.409 | uncovered | none observed |
| 98a3d134b84e219e000000000007ce9f | 0.408 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | uncovered | none observed |
| 98a3d134b84e219e00000000000948ef | 0.396 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | uncovered | none observed |

## P1 / L4 / read (671 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 292.245 | n/a | n/a | n/a | 9.120 | n/a | 0.000 | 292.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.453 | 292.242 | 1.000 | 0.453 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ff14d7de5521fcc000000000006a232 | 297.929 | 0.146 | n/a | 0.000 | 297.779 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.925 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000c18d1 | 297.222 | 0.026 | n/a | 0.000 | 297.195 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.221 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000c18d0 | 297.219 | 0.107 | n/a | 0.000 | 297.109 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.216 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000006b4e7 | 296.615 | 0.165 | n/a | 0.000 | 296.447 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 296.611 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000b8090 | 292.530 | 0.016 | n/a | 0.000 | 292.513 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.529 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000b808f | 292.494 | 0.071 | n/a | 0.000 | 292.421 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.492 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc000000000006322a | 292.245 | 0.153 | n/a | 0.000 | 292.090 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.242 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000000643ad | 292.192 | 0.094 | n/a | 0.000 | 292.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.190 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000060191 | 290.925 | 0.135 | n/a | 0.000 | 290.787 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.922 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000b4704 | 290.907 | 0.020 | n/a | 0.000 | 290.886 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.906 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000061990 | 290.870 | 0.125 | n/a | 0.000 | 290.743 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.868 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000b4703 | 290.851 | 0.111 | n/a | 0.000 | 290.737 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.849 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000086152 | 277.691 | 0.245 | n/a | 0.000 | 277.444 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.689 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000067078 | 277.232 | 0.177 | n/a | 0.000 | 277.052 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.229 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000000681d5 | 277.167 | 0.168 | n/a | 0.000 | 276.997 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.164 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000bd323 | 277.125 | 0.107 | n/a | 0.000 | 277.017 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.124 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000bd322 | 276.976 | 0.166 | n/a | 0.000 | 276.806 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.973 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc0000000000085b10 | 275.493 | 0.152 | n/a | 0.000 | 275.339 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.491 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000bcec5 | 274.823 | 0.034 | n/a | 0.000 | 274.788 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.822 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000000bcec4 | 274.762 | 0.184 | n/a | 0.000 | 274.574 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.758 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (981 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 357.419 | n/a | n/a | n/a | 12.977 | n/a | 0.000 | 357.393 | 0.143 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 53.801 | 357.418 | 1.000 | 53.801 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58d43cc0b2d3b62500000000000b58fa | 358.024 | 0.028 | n/a | 0.000 | 357.995 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 358.022 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000000b58f9 | 357.982 | 0.114 | n/a | 0.000 | 357.865 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 357.979 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000011402b | 357.667 | 0.094 | n/a | 0.000 | 357.571 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.665 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000011403c | 357.497 | 0.012 | n/a | 0.000 | 357.484 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.497 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000011403b | 357.489 | 0.014 | n/a | 0.000 | 357.475 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.489 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e000000000011403a | 357.483 | 0.013 | n/a | 0.000 | 357.469 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.482 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000114039 | 357.474 | 0.014 | n/a | 0.000 | 357.459 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.473 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000114038 | 357.467 | 0.021 | n/a | 0.000 | 357.444 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.466 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000000b5907 | 357.448 | 0.044 | n/a | 0.000 | 357.401 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.445 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000000b5908 | 357.419 | 0.025 | n/a | 0.000 | 357.393 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.418 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000000b5909 | 357.411 | 0.021 | n/a | 0.000 | 357.388 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 357.409 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000b6cc8 | 356.697 | 0.013 | n/a | 0.000 | 356.683 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.696 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000b6cc7 | 356.689 | 0.013 | n/a | 0.000 | 356.676 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.689 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000b6cc6 | 356.683 | 0.014 | n/a | 0.000 | 356.668 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.682 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000b6cc5 | 356.675 | 0.017 | n/a | 0.000 | 356.657 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.674 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000b6cc4 | 356.647 | 0.081 | n/a | 0.000 | 356.563 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 356.644 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001094c7 | 277.380 | 0.186 | n/a | 0.000 | 277.191 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.377 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000ab86f | 277.322 | 0.035 | n/a | 0.000 | 277.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.322 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000ab870 | 277.317 | 0.014 | n/a | 0.000 | 277.302 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.316 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000ab86e | 277.306 | 0.014 | n/a | 0.000 | 277.291 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.305 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L64 / read (1233 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.158 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 |
| p99 | 366.000 | n/a | n/a | n/a | 0.679 | n/a | 0.000 | 365.950 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.424 | 365.999 | 1.000 | 0.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ff14d7de5521fcc00000000000f7727 | 367.486 | 0.289 | n/a | 0.000 | 367.195 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 367.484 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a16 | 366.711 | 0.076 | n/a | 0.000 | 366.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.710 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a15 | 366.686 | 0.012 | n/a | 0.000 | 366.673 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.685 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a14 | 366.682 | 0.012 | n/a | 0.000 | 366.669 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.681 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a0e | 366.681 | 0.224 | n/a | 0.000 | 366.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 366.678 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a13 | 366.673 | 0.013 | n/a | 0.000 | 366.659 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.673 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a17 | 366.668 | 0.013 | n/a | 0.000 | 366.654 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.667 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a12 | 366.665 | 0.013 | n/a | 0.000 | 366.651 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.665 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a11 | 366.657 | 0.015 | n/a | 0.000 | 366.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.657 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a10 | 366.647 | 0.023 | n/a | 0.000 | 366.624 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.647 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a0f | 366.642 | 0.038 | n/a | 0.000 | 366.603 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.641 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000f7757 | 366.177 | 0.208 | n/a | 0.000 | 365.967 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.175 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000f7758 | 366.000 | 0.048 | n/a | 0.000 | 365.950 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.999 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000f7759 | 365.971 | 0.042 | n/a | 0.000 | 365.927 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.969 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000f775a | 365.961 | 0.123 | n/a | 0.000 | 365.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.960 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000f775b | 365.864 | 0.018 | n/a | 0.000 | 365.844 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.862 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000000f775c | 365.855 | 0.017 | n/a | 0.000 | 365.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.853 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a6d | 365.666 | 0.087 | n/a | 0.000 | 365.578 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.665 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a6c | 365.663 | 0.028 | n/a | 0.000 | 365.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.662 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e0000000000155a76 | 365.656 | 0.065 | n/a | 0.000 | 365.589 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.655 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (3083 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 262.061 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 262.045 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.060 | 1.000 | 0.001 |
| p99 | 370.351 | n/a | n/a | n/a | 1.758 | n/a | 0.000 | 370.313 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 370.350 | 1.000 | 0.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58d43cc0b2d3b62500000000001412f3 | 371.741 | 0.024 | n/a | 0.000 | 371.716 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.740 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412f2 | 371.716 | 0.023 | n/a | 0.000 | 371.691 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 371.715 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412f1 | 371.691 | 0.024 | n/a | 0.000 | 371.665 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.690 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412f0 | 371.662 | 0.026 | n/a | 0.000 | 371.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.661 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412ef | 371.633 | 0.037 | n/a | 0.000 | 371.595 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.632 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412ee | 371.577 | 0.026 | n/a | 0.000 | 371.550 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.575 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412ed | 371.547 | 0.028 | n/a | 0.000 | 371.518 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.546 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412ec | 371.512 | 0.043 | n/a | 0.000 | 371.468 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 371.510 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001412eb | 371.430 | 0.165 | n/a | 0.000 | 371.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 371.426 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000141380 | 371.241 | 0.031 | n/a | 0.000 | 371.209 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.240 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000014137f | 371.214 | 0.042 | n/a | 0.000 | 371.171 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.213 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000014137e | 371.179 | 0.042 | n/a | 0.000 | 371.136 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.178 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000014137d | 371.140 | 0.023 | n/a | 0.000 | 371.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.138 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000014137c | 371.116 | 0.032 | n/a | 0.000 | 371.083 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.115 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000014137b | 371.088 | 0.043 | n/a | 0.000 | 371.044 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.087 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000014137a | 371.052 | 0.048 | n/a | 0.000 | 371.003 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.051 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000141379 | 371.009 | 0.025 | n/a | 0.000 | 370.983 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 371.008 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000141378 | 370.983 | 0.025 | n/a | 0.000 | 370.957 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.982 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000141377 | 370.954 | 0.063 | n/a | 0.000 | 370.890 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.952 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000141376 | 370.891 | 0.050 | n/a | 0.000 | 370.840 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.890 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (3330 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 254.021 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 253.998 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 254.021 | 1.000 | 0.001 |
| p99 | 342.120 | n/a | n/a | n/a | 1.612 | n/a | 0.000 | 342.079 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.470 | 342.119 | 1.000 | 0.470 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58d43cc0b2d3b62500000000001823d7 | 344.995 | 0.101 | n/a | 0.000 | 344.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 344.990 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823d8 | 344.991 | 0.022 | n/a | 0.000 | 344.967 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.989 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823d9 | 344.978 | 0.019 | n/a | 0.000 | 344.957 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.975 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823da | 344.963 | 0.018 | n/a | 0.000 | 344.943 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.961 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823db | 344.951 | 0.018 | n/a | 0.000 | 344.932 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.949 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823dc | 344.946 | 0.017 | n/a | 0.000 | 344.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.944 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823dd | 344.934 | 0.018 | n/a | 0.000 | 344.915 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.932 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823de | 344.920 | 0.017 | n/a | 0.000 | 344.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.918 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001823df | 344.907 | 0.019 | n/a | 0.000 | 344.887 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.905 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001e4c26 | 343.677 | 0.023 | n/a | 0.000 | 343.652 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.675 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001e4c25 | 343.649 | 0.025 | n/a | 0.000 | 343.623 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.648 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001e4c24 | 343.617 | 0.030 | n/a | 0.000 | 343.586 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.616 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001e4c23 | 343.581 | 0.027 | n/a | 0.000 | 343.553 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.580 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001e4c22 | 343.507 | 0.033 | n/a | 0.000 | 343.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.506 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 98a3d134b84e219e00000000001e4c21 | 343.438 | 0.163 | n/a | 0.000 | 343.271 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 343.434 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000018242a | 342.499 | 0.044 | n/a | 0.000 | 342.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 342.499 | 1.000 | 0.000 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000182429 | 342.481 | 0.012 | n/a | 0.000 | 342.469 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.481 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000182428 | 342.473 | 0.014 | n/a | 0.000 | 342.458 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.472 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b6250000000000182424 | 342.469 | 0.021 | n/a | 0.000 | 342.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.469 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b625000000000018242b | 342.467 | 0.013 | n/a | 0.000 | 342.452 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.466 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P1 / recovery / read (2704 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 251.479 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 251.456 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 251.478 | 1.000 | 0.001 |
| p99 | 274.940 | n/a | n/a | n/a | 1.876 | n/a | 0.000 | 274.923 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.504 | 274.939 | 1.000 | 0.504 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ff14d7de5521fcc00000000001b5be0 | 277.642 | 0.024 | n/a | 0.000 | 277.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.641 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bdf | 277.625 | 0.012 | n/a | 0.000 | 277.613 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.625 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bdd | 277.622 | 0.022 | n/a | 0.000 | 277.599 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.621 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bde | 277.622 | 0.013 | n/a | 0.000 | 277.607 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.620 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bdc | 277.621 | 0.024 | n/a | 0.000 | 277.596 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.620 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bda | 277.620 | 0.044 | n/a | 0.000 | 277.574 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.619 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bdb | 277.616 | 0.024 | n/a | 0.000 | 277.591 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.615 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5bd9 | 277.538 | 0.104 | n/a | 0.000 | 277.431 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.535 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c2d | 276.472 | 0.023 | n/a | 0.000 | 276.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.471 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c2c | 276.465 | 0.012 | n/a | 0.000 | 276.451 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.464 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c2b | 276.459 | 0.012 | n/a | 0.000 | 276.447 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.458 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c28 | 276.458 | 0.028 | n/a | 0.000 | 276.429 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.457 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c2a | 276.455 | 0.012 | n/a | 0.000 | 276.441 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.454 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c27 | 276.454 | 0.017 | n/a | 0.000 | 276.437 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.453 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ff14d7de5521fcc00000000001b5c29 | 276.450 | 0.013 | n/a | 0.000 | 276.437 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.449 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001ad0cb | 276.156 | 0.028 | n/a | 0.000 | 276.127 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.155 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001ad0cc | 276.153 | 0.014 | n/a | 0.000 | 276.137 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.152 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001ad0ca | 276.142 | 0.013 | n/a | 0.000 | 276.128 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.141 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001ad0c9 | 276.136 | 0.015 | n/a | 0.000 | 276.120 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.135 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 58d43cc0b2d3b62500000000001ad0c7 | 276.132 | 0.130 | n/a | 0.000 | 275.997 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 276.127 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (438 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 1.783 | n/a | n/a | n/a | 1.417 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.148 | 1.417 | 0.999 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98a3d134b84e219e000000000024d25f | 9.930 | 7.261 | n/a | 1.107 | 0.000 | 1.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.087 | 8.369 | 0.843 | 0.087 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000027e06b | 3.630 | 3.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.629 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000027df83 | 2.719 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.719 | 0.000 | 0.000 | 2.719 | uncovered | none observed |
| 98a3d134b84e219e00000000002aff15 | 2.122 | 2.120 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.120 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000280591 | 1.783 | 1.781 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.781 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000272656 | 1.419 | 1.417 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.417 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000029fac6 | 1.155 | 1.152 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.152 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000024d488 | 1.095 | 1.094 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.094 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002a5d16 | 1.045 | 1.044 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.044 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002a0c6f | 0.996 | 0.993 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.993 | 0.997 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000027bc4e | 0.891 | 0.889 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.889 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000252bf9 | 0.743 | 0.720 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.720 | 0.969 | 0.023 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000027d0df | 0.733 | 0.731 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.731 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002affdc | 0.720 | 0.718 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.718 | 0.998 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000027d86b | 0.696 | 0.694 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.694 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000002ab3dd | 0.684 | 0.683 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.683 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002579bd | 0.678 | 0.676 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.676 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e0000000000257e11 | 0.667 | 0.666 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.666 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000029f79a | 0.656 | 0.655 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.655 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002695a6 | 0.634 | 0.631 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.631 | 0.995 | 0.003 | node-14/thread-4/reader.execute | none observed |

## P4 / p4h1 / read (546 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 1.167 | n/a | n/a | n/a | 1.167 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.122 | 1.167 | 0.999 | 0.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98a3d134b84e219e00000000002b934a | 12.782 | 1.991 | n/a | 0.000 | 0.000 | 0.581 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.210 | 1.991 | 0.156 | 10.210 | node-14/thread-4/socket.wait-first-byte | none observed |
| 98a3d134b84e219e00000000003083ee | 2.176 | 2.173 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.173 | 0.999 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000032f770 | 1.706 | 1.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.704 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000033625c | 1.263 | 1.261 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.261 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e0000000000308471 | 1.248 | 1.244 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.244 | 0.997 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000002cbb99 | 1.167 | 1.167 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.167 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002cbbd6 | 1.131 | 1.129 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.129 | 0.999 | 0.001 | node-14/thread-4/reader.observe | none observed |
| 98a3d134b84e219e000000000032cdf7 | 1.001 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.001 | 0.000 | 0.000 | 1.001 | uncovered | none observed |
| 98a3d134b84e219e00000000003308db | 1.001 | 0.999 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.999 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000032cee0 | 0.995 | 0.993 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.993 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002bc3e0 | 0.970 | 0.969 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.969 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003082ca | 0.942 | 0.941 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.941 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002be8a7 | 0.897 | 0.895 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.895 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000002d60e4 | 0.826 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.826 | 0.000 | 0.000 | 0.826 | uncovered | none observed |
| 98a3d134b84e219e00000000002d6590 | 0.791 | 0.789 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.789 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000312460 | 0.786 | 0.785 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.785 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000032f690 | 0.761 | 0.760 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.760 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002cbc23 | 0.735 | 0.734 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.734 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000002c207c | 0.697 | 0.696 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.696 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000032c7ff | 0.627 | 0.626 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.626 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P4 / p4h3 / read (528 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.984 | n/a | n/a | n/a | 0.983 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.088 | 0.983 | 0.998 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98a3d134b84e219e00000000003386a3 | 9.006 | 1.523 | n/a | 0.000 | 0.000 | 0.782 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.700 | 1.523 | 0.169 | 6.700 | node-14/thread-4/socket.wait-first-byte | none observed |
| 98a3d134b84e219e0000000000381eaa | 2.610 | 2.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.607 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000392dd8 | 1.240 | 1.238 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.238 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e0000000000396da2 | 1.059 | 1.057 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.057 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000038c641 | 1.014 | 1.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.011 | 0.997 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003988d7 | 0.984 | 0.983 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.983 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000376df3 | 0.851 | 0.847 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.847 | 0.996 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000003ae4e0 | 0.843 | 0.839 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.839 | 0.995 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000003a4502 | 0.783 | 0.781 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.781 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003995cd | 0.737 | 0.735 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.735 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003965f3 | 0.623 | 0.622 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.622 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000038cac3 | 0.616 | 0.615 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.615 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000037cc0a | 0.604 | 0.603 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.603 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003a3e8f | 0.582 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.578 | 0.994 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000036d99e | 0.564 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.563 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000344488 | 0.544 | 0.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.542 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000036d4f1 | 0.540 | 0.539 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.539 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000399d5d | 0.515 | 0.514 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.514 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e000000000036c97a | 0.507 | 0.502 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.502 | 0.991 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000038db1b | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |

## P4 / p4h10 / read (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 1.027 | n/a | n/a | n/a | 1.025 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.141 | 1.025 | 0.998 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98a3d134b84e219e00000000003b487d | 7.780 | 1.578 | n/a | 0.000 | 0.000 | 0.474 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.728 | 1.578 | 0.203 | 5.728 | node-14/thread-4/socket.wait-first-byte | none observed |
| 98a3d134b84e219e00000000004035c8 | 5.059 | 5.055 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.055 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.038ms |
| 98a3d134b84e219e00000000003e91b8 | 1.193 | 1.191 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.191 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000041c489 | 1.166 | 1.164 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.164 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000003e895d | 1.027 | 1.025 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.025 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003bdb1d | 0.843 | 0.841 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.841 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003fb6a2 | 0.815 | 0.813 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.813 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003e132d | 0.734 | 0.730 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.730 | 0.994 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003ba797 | 0.729 | 0.728 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.728 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000423737 | 0.687 | 0.686 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.686 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000402cf6 | 0.659 | 0.658 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.658 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003ff041 | 0.655 | 0.653 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.653 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000003e82e3 | 0.650 | 0.649 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.649 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000417940 | 0.631 | 0.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.629 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e000000000040305c | 0.626 | 0.623 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.623 | 0.996 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000003f8313 | 0.550 | 0.548 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.548 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e0000000000420784 | 0.542 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.542 | 0.000 | 0.000 | 0.542 | uncovered | none observed |
| 98a3d134b84e219e00000000003cb629 | 0.520 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.519 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 98a3d134b84e219e00000000003cefe2 | 0.511 | 0.510 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.510 | 0.997 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 98a3d134b84e219e00000000003e2f1c | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |

## P5 / presweep / read (1268 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.194 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 |
| p99 | 262.389 | n/a | n/a | n/a | 16.777 | n/a | 0.000 | 262.356 | 39.104 | 0.323 | 70.961 | n/a | 0.004 | 0.000 | n/a | n/a | 0.482 | 262.388 | 1.000 | 0.482 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58d43cc0b2d3b625000000000022e4c4 | 263.380 | 0.084 | n/a | 0.000 | 263.294 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.379 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| 58d43cc0b2d3b625000000000022e4c8 | 263.360 | 0.013 | n/a | 0.000 | 263.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.359 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| 58d43cc0b2d3b625000000000022e4c7 | 263.355 | 0.014 | n/a | 0.000 | 263.340 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.354 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| 58d43cc0b2d3b625000000000022e4c6 | 263.345 | 0.014 | n/a | 0.000 | 263.330 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.344 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| 58d43cc0b2d3b625000000000022e4c5 | 263.338 | 0.016 | n/a | 0.000 | 263.320 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.337 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| 58d43cc0b2d3b625000000000022e4c3 | 263.311 | 0.116 | n/a | 0.000 | 263.192 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.308 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| 98a3d134b84e219e00000000004717f8 | 262.979 | 0.147 | n/a | 0.000 | 262.832 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.979 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 98a3d134b84e219e00000000004717f9 | 262.964 | 0.067 | n/a | 0.000 | 262.896 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.963 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 98a3d134b84e219e00000000004717fa | 262.938 | 0.036 | n/a | 0.000 | 262.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.937 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 98a3d134b84e219e00000000004717f7 | 262.906 | 0.262 | n/a | 0.000 | 262.642 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.904 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 2ff14d7de5521fcc0000000000220f06 | 262.413 | 0.055 | n/a | 0.000 | 262.356 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.411 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms; replica.apply-delta 0.015ms |
| 2ff14d7de5521fcc0000000000220f08 | 262.396 | 0.024 | n/a | 0.000 | 262.371 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.395 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms; replica.apply-delta 0.015ms |
| 2ff14d7de5521fcc0000000000220f07 | 262.389 | 0.017 | n/a | 0.000 | 262.372 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.388 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms; replica.apply-delta 0.015ms |
| 2ff14d7de5521fcc0000000000220f05 | 262.387 | 0.102 | n/a | 0.000 | 262.283 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.385 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms; replica.apply-delta 0.015ms |
| 58d43cc0b2d3b6250000000000214151 | 262.367 | 0.071 | n/a | 0.000 | 262.295 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.366 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.021ms; replica.apply-delta 0.014ms |
| 58d43cc0b2d3b6250000000000214154 | 262.348 | 0.014 | n/a | 0.000 | 262.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.347 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.021ms; replica.apply-delta 0.014ms |
| 58d43cc0b2d3b6250000000000214153 | 262.344 | 0.015 | n/a | 0.000 | 262.327 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.343 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.021ms; replica.apply-delta 0.014ms |
| 58d43cc0b2d3b6250000000000214152 | 262.337 | 0.017 | n/a | 0.000 | 262.319 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.336 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.021ms; replica.apply-delta 0.014ms |
| 58d43cc0b2d3b6250000000000214150 | 262.333 | 0.096 | n/a | 0.000 | 262.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.331 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.021ms; replica.apply-delta 0.014ms |
| 98a3d134b84e219e000000000045741b | 262.292 | 0.180 | n/a | 0.000 | 262.107 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 262.287 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms; replica.apply-delta 0.013ms |

## P5 / sweep / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.098 | n/a | n/a | n/a | 0.142 | n/a | 0.000 | 85.974 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 86.097 | 1.000 | 0.003 |
| p99 | 149.601 | n/a | n/a | n/a | 28.967 | n/a | 4.363 | 149.469 | 0.397 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.255 | 149.599 | 1.000 | 17.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58d43cc0b2d3b625000000000022ed81 | 149.601 | 0.130 | n/a | 0.000 | 149.469 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 149.599 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.021ms; replica.apply-delta 0.020ms |
| 2ff14d7de5521fcc000000000023c725 | 141.023 | 0.202 | n/a | 0.000 | 140.816 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 141.018 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.071ms; replica.apply-delta 0.070ms; replica.apply-delta 0.066ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 2ff14d7de5521fcc000000000023c749 | 135.284 | 0.241 | n/a | 0.000 | 135.042 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 135.283 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.071ms; replica.apply-delta 0.070ms; replica.apply-delta 0.066ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 58d43cc0b2d3b625000000000022ed82 | 130.580 | 0.086 | n/a | 0.000 | 130.492 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 130.578 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 58d43cc0b2d3b625000000000022ed80 | 130.570 | 0.213 | n/a | 0.000 | 130.353 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 130.566 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 58d43cc0b2d3b625000000000022ed93 | 125.649 | 0.114 | n/a | 0.000 | 125.530 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 125.644 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 98a3d134b84e219e00000000004723a8 | 125.061 | 0.300 | n/a | 0.000 | 124.758 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 125.057 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms; replica.apply-delta 0.036ms; replica.apply-delta 0.020ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 98a3d134b84e219e000000000047232c | 124.186 | 0.286 | n/a | 0.000 | 123.895 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 124.180 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms; replica.apply-delta 0.036ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms; replica.apply-delta 0.015ms |
| 98a3d134b84e219e000000000047232d | 124.077 | 0.046 | n/a | 0.000 | 124.030 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 124.076 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms; replica.apply-delta 0.036ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms; replica.apply-delta 0.015ms |
| 58d43cc0b2d3b625000000000022edcb | 120.948 | 0.698 | n/a | 0.000 | 120.247 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 120.945 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 58d43cc0b2d3b625000000000022edcc | 120.801 | 0.337 | n/a | 0.000 | 120.459 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 120.796 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 58d43cc0b2d3b625000000000022edc9 | 120.651 | 0.046 | n/a | 0.000 | 120.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 120.646 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 58d43cc0b2d3b625000000000022edcd | 120.643 | 0.105 | n/a | 0.000 | 120.534 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 120.639 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 2ff14d7de5521fcc000000000023c7b6 | 118.655 | 0.105 | n/a | 0.000 | 118.547 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 118.652 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.071ms; replica.apply-delta 0.070ms; replica.apply-delta 0.066ms; replica.apply-delta 0.061ms; replica.apply-delta 0.055ms |
| 2ff14d7de5521fcc000000000023c747 | 117.220 | 0.370 | n/a | 0.000 | 116.845 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 117.216 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.071ms; replica.apply-delta 0.070ms; replica.apply-delta 0.066ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 58d43cc0b2d3b625000000000022edc8 | 114.383 | 0.207 | n/a | 0.000 | 114.153 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 114.360 | 1.000 | 0.023 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 58d43cc0b2d3b625000000000022edca | 114.140 | 0.084 | n/a | 0.000 | 114.054 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 114.138 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.032ms; replica.apply-delta 0.025ms; replica.apply-delta 0.022ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms |
| 2ff14d7de5521fcc000000000023c812 | 113.350 | 0.289 | n/a | 0.000 | 113.060 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 113.349 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.071ms; replica.apply-delta 0.070ms; replica.apply-delta 0.066ms; replica.apply-delta 0.061ms; replica.apply-delta 0.055ms |
| 98a3d134b84e219e0000000000472341 | 112.396 | 0.110 | n/a | 0.000 | 112.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 112.386 | 1.000 | 0.010 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms; replica.apply-delta 0.036ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms; replica.apply-delta 0.015ms |
| 98a3d134b84e219e0000000000472372 | 111.311 | 0.027 | n/a | 0.000 | 111.282 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 111.309 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms; replica.apply-delta 0.036ms; replica.apply-delta 0.020ms; replica.apply-delta 0.019ms; replica.apply-delta 0.015ms |

## P1 / baseline / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.055 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58d43cc0b2d3b6250000000000059cae | 0.055 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | uncovered | none observed |
| 58d43cc0b2d3b6250000000000059caf | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| 58d43cc0b2d3b6250000000000059cb0 | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 | uncovered | none observed |
| 58d43cc0b2d3b6250000000000059cb1 | 0.006 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.000 | 0.000 | 0.006 | uncovered | none observed |
| 58d43cc0b2d3b6250000000000059cb2 | 0.005 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.000 | 0.000 | 0.005 | uncovered | none observed |

## P3 / outside-phases / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.428 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 200.609 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 214.216 | n/a | n/a | n/a | 20.164 | n/a | 0.000 | 0.000 | 9.978 | 203.800 | 1.864 | n/a | 0.799 | 0.000 | n/a | n/a | 36.948 | 20.164 | 0.345 | 36.948 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae90000000000000006 | 214.216 | 0.000 | n/a | 0.000 | 0.000 | 9.978 | 203.800 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.349 | 0.000 | 0.000 | 0.349 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae900000000000001f4 | 206.499 | 0.000 | n/a | 0.000 | 0.000 | 4.738 | 200.853 | 0.007 | n/a | 0.799 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae900000000000001ef | 203.223 | 0.000 | n/a | 0.000 | 0.000 | 0.543 | 202.487 | 0.019 | n/a | 0.075 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000002d5 | 202.961 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 202.216 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae900000000000001f1 | 202.543 | 0.000 | n/a | 0.000 | 0.000 | 1.534 | 200.833 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000005 | 202.323 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 201.026 | 0.013 | n/a | 0.144 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae900000000000001ec | 202.301 | 0.000 | n/a | 0.000 | 0.000 | 1.504 | 200.591 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae9000000000000018b | 202.198 | 0.000 | n/a | 0.000 | 0.000 | 1.425 | 200.609 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae90000000000000189 | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 200.909 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae900000000000001ed | 202.065 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.034 | 0.016 | n/a | 0.077 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae900000000000002d2 | 201.852 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.944 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae900000000000002d4 | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 200.708 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000f17 | 201.626 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 200.736 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-87/journal/page | none observed |
| 58f017b7497f3ae90000000000000187 | 201.573 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 200.622 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae90000000000000f18 | 201.566 | 0.000 | n/a | 0.000 | 0.000 | 0.491 | 200.914 | 0.015 | n/a | 0.063 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000188 | 201.554 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 200.740 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000f1c | 201.521 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.544 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-86/journal/page | none observed |
| 58f017b7497f3ae900000000000002d3 | 201.441 | 0.000 | n/a | 0.000 | 0.000 | 0.562 | 200.700 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae900000000000002d1 | 201.428 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 200.671 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae900000000000001e9 | 201.380 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.571 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |

## P3 / outside-phases / internal (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 527.750 | n/a | n/a | n/a | 2.112 | n/a | 0.000 | 0.000 | 0.822 | 523.998 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.075 | 2.112 | 0.006 | 0.075 |
| p99 | 1007.896 | n/a | n/a | n/a | 7.687 | n/a | 0.330 | 0.000 | 3.049 | 1003.955 | 0.411 | n/a | 4.433 | 0.000 | n/a | n/a | 23.131 | 8.012 | 0.766 | 23.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000017 | 1007.896 | 0.189 | n/a | 0.000 | 0.000 | 3.049 | 1002.621 | 0.411 | n/a | 0.388 | 0.000 | n/a | n/a | 1.238 | 0.189 | 0.000 | 1.238 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000019 | 1005.968 | 0.134 | n/a | 0.000 | 0.000 | 0.654 | 1003.955 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 1.112 | 0.134 | 0.000 | 1.112 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000215 | 1004.726 | 0.109 | n/a | 0.000 | 0.000 | 1.013 | 1002.446 | 0.021 | n/a | 0.038 | 0.000 | n/a | n/a | 1.099 | 0.109 | 0.000 | 1.099 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000018 | 1004.365 | 0.131 | n/a | 0.000 | 0.000 | 1.127 | 997.546 | 0.028 | n/a | 4.433 | 0.000 | n/a | n/a | 1.100 | 0.131 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d000000000000013c | 1002.820 | 0.204 | n/a | 0.000 | 0.000 | 0.828 | 1000.611 | 0.016 | n/a | 0.033 | 0.000 | n/a | n/a | 1.127 | 0.204 | 0.000 | 1.127 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d0000000000001a48 | 1001.988 | 0.106 | n/a | 0.000 | 0.000 | 0.466 | 1000.301 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 1.101 | 0.106 | 0.000 | 1.101 | gw-r/thread-89/journal/page | none observed |
| 76516b15dec0445d0000000000000145 | 807.322 | 3.616 | n/a | 0.000 | 0.000 | 0.475 | 803.140 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.054 | 3.616 | 0.004 | 0.054 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d00000000000000eb | 753.367 | 4.723 | n/a | 0.000 | 0.000 | 0.652 | 747.853 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.069 | 4.723 | 0.006 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d00000000000000ed | 527.750 | 1.949 | n/a | 0.000 | 0.000 | 1.634 | 523.998 | 0.005 | n/a | 0.089 | 0.000 | n/a | n/a | 0.075 | 1.949 | 0.004 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d000000000000013d | 501.279 | 4.069 | n/a | 0.000 | 0.000 | 0.822 | 496.255 | 0.014 | n/a | 0.045 | 0.000 | n/a | n/a | 0.075 | 4.069 | 0.008 | 0.075 | gw-r/thread-73/journal/page | none observed |
| 76516b15dec0445d0000000000000216 | 441.856 | 3.091 | n/a | 0.000 | 0.000 | 0.606 | 438.056 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.056 | 3.091 | 0.007 | 0.056 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d000000000000013f | 400.920 | 7.683 | n/a | 0.330 | 0.000 | 0.951 | 391.846 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.069 | 8.012 | 0.020 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d0000000000000141 | 320.759 | 3.070 | n/a | 0.000 | 0.000 | 1.569 | 316.027 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.059 | 3.070 | 0.010 | 0.059 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d0000000000000213 | 102.937 | 7.687 | n/a | 0.000 | 0.000 | 0.694 | 94.431 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.063 | 7.687 | 0.075 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d0000000000000142 | 93.649 | 2.112 | n/a | 0.000 | 0.000 | 1.023 | 90.406 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.058 | 2.112 | 0.023 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000264 | 24.946 | 1.565 | n/a | 0.000 | 0.000 | 0.250 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.131 | 1.565 | 0.063 | 23.131 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000001a45 | 8.712 | 6.677 | n/a | 0.000 | 0.000 | 0.214 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.821 | 6.677 | 0.766 | 1.821 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 879.566 | n/a | n/a | n/a | 2.590 | n/a | 0.000 | 0.000 | 0.999 | 872.898 | 0.018 | n/a | 0.135 | 0.000 | n/a | n/a | 1.106 | 2.590 | 0.006 | 1.106 |
| p99 | 1027.673 | n/a | n/a | n/a | 20.295 | n/a | 0.000 | 0.000 | 25.297 | 1001.876 | 0.027 | n/a | 0.227 | 0.000 | n/a | n/a | 8.044 | 20.295 | 0.233 | 8.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d000000000000001c | 1027.673 | 0.265 | n/a | 0.000 | 0.000 | 25.297 | 1000.865 | 0.009 | n/a | 0.095 | 0.000 | n/a | n/a | 1.143 | 0.265 | 0.000 | 1.143 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d000000000000001f | 1005.658 | 0.180 | n/a | 0.000 | 0.000 | 2.912 | 1000.940 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 1.451 | 0.180 | 0.000 | 1.451 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d0000000000000022 | 1004.850 | 1.080 | n/a | 0.000 | 0.000 | 1.474 | 1001.047 | 0.011 | n/a | 0.135 | 0.000 | n/a | n/a | 1.103 | 1.080 | 0.001 | 1.103 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d000000000000002c | 1004.205 | 0.123 | n/a | 0.000 | 0.000 | 1.386 | 1001.343 | 0.019 | n/a | 0.227 | 0.000 | n/a | n/a | 1.108 | 0.123 | 0.000 | 1.108 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d0000000000000027 | 1003.868 | 0.127 | n/a | 0.000 | 0.000 | 0.593 | 1001.876 | 0.022 | n/a | 0.144 | 0.000 | n/a | n/a | 1.106 | 0.127 | 0.000 | 1.106 | gw-r/thread-66/journal/page | none observed |
| 76516b15dec0445d000000000000002d | 1003.683 | 0.279 | n/a | 0.000 | 0.000 | 0.928 | 1001.095 | 0.018 | n/a | 0.167 | 0.000 | n/a | n/a | 1.195 | 0.279 | 0.000 | 1.195 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000028 | 879.566 | 5.366 | n/a | 0.000 | 0.000 | 0.979 | 872.898 | 0.019 | n/a | 0.203 | 0.000 | n/a | n/a | 0.101 | 5.366 | 0.006 | 0.101 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d000000000000001a | 571.926 | 20.295 | n/a | 0.000 | 0.000 | 0.639 | 550.328 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.582 | 20.295 | 0.035 | 0.582 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d000000000000002a | 434.427 | 2.624 | n/a | 0.000 | 0.000 | 4.725 | 426.872 | 0.027 | n/a | 0.105 | 0.000 | n/a | n/a | 0.074 | 2.624 | 0.006 | 0.074 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d0000000000000024 | 317.700 | 10.797 | n/a | 0.000 | 0.000 | 1.228 | 305.204 | 0.018 | n/a | 0.167 | 0.000 | n/a | n/a | 0.286 | 10.797 | 0.034 | 0.286 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000023 | 167.641 | 6.023 | n/a | 0.000 | 0.000 | 0.676 | 160.760 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.092 | 6.023 | 0.036 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d000000000000001d | 163.621 | 4.261 | n/a | 0.000 | 0.000 | 0.999 | 154.927 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 3.344 | 4.261 | 0.026 | 3.344 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000020 | 11.096 | 2.590 | n/a | 0.000 | 0.000 | 0.462 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.044 | 2.590 | 0.233 | 8.044 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / baseline / internal (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 659.298 | n/a | n/a | n/a | 2.086 | n/a | 0.000 | 0.000 | 0.788 | 656.170 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.100 | 2.086 | 0.003 | 0.100 |
| p99 | 1005.123 | n/a | n/a | n/a | 5.507 | n/a | 0.000 | 0.000 | 1.758 | 1001.860 | 0.025 | n/a | 0.272 | 0.000 | n/a | n/a | 1.105 | 5.507 | 0.015 | 1.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000038 | 1005.123 | 0.141 | n/a | 0.000 | 0.000 | 1.758 | 1001.860 | 0.025 | n/a | 0.241 | 0.000 | n/a | n/a | 1.098 | 0.141 | 0.000 | 1.098 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d000000000000003f | 1002.949 | 0.130 | n/a | 0.000 | 0.000 | 0.518 | 1001.087 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 1.103 | 0.130 | 0.000 | 1.103 | gw-r/thread-44/journal/page | none observed |
| 76516b15dec0445d0000000000000031 | 1002.857 | 0.152 | n/a | 0.000 | 0.000 | 0.788 | 1000.707 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 1.105 | 0.152 | 0.000 | 1.105 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d000000000000003e | 1002.619 | 0.132 | n/a | 0.000 | 0.000 | 0.662 | 1000.657 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 1.102 | 0.132 | 0.000 | 1.102 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000037 | 945.729 | 2.119 | n/a | 0.000 | 0.000 | 0.622 | 942.805 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.089 | 2.119 | 0.002 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d0000000000000034 | 659.298 | 2.086 | n/a | 0.000 | 0.000 | 0.852 | 656.170 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.083 | 2.086 | 0.003 | 0.083 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d000000000000002e | 485.253 | 3.584 | n/a | 0.000 | 0.000 | 0.833 | 480.378 | 0.011 | n/a | 0.272 | 0.000 | n/a | n/a | 0.175 | 3.584 | 0.007 | 0.175 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d0000000000000033 | 369.871 | 5.507 | n/a | 0.000 | 0.000 | 0.524 | 363.678 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.097 | 5.507 | 0.015 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d000000000000003b | 288.281 | 1.913 | n/a | 0.000 | 0.000 | 0.621 | 285.549 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.100 | 1.913 | 0.007 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d000000000000003a | 262.055 | 2.389 | n/a | 0.000 | 0.000 | 0.896 | 258.584 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.080 | 2.389 | 0.009 | 0.080 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d000000000000002f | 246.372 | 3.412 | n/a | 0.000 | 0.000 | 0.998 | 241.815 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.084 | 3.412 | 0.014 | 0.084 | gw-r/thread-64/journal/page | none observed |

## P3 / L1 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1003.183 | n/a | n/a | n/a | 0.190 | n/a | 0.000 | 0.000 | 0.857 | 1000.658 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 1.092 | 0.190 | 0.000 | 1.092 |
| p99 | 1018.890 | n/a | n/a | n/a | 9.405 | n/a | 0.917 | 0.000 | 2.183 | 1014.454 | 0.042 | n/a | 2.429 | 0.000 | n/a | n/a | 1.152 | 10.322 | 0.017 | 1.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d000000000000004a | 1018.890 | 0.119 | n/a | 0.000 | 0.000 | 0.741 | 1014.454 | 0.042 | n/a | 2.429 | 0.000 | n/a | n/a | 1.104 | 0.119 | 0.000 | 1.104 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d0000000000000046 | 1006.287 | 0.190 | n/a | 0.000 | 0.000 | 0.970 | 1003.917 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 1.133 | 0.190 | 0.000 | 1.133 | gw-r/thread-66/journal/page | none observed |
| 76516b15dec0445d0000000000000040 | 1004.204 | 0.173 | n/a | 0.000 | 0.000 | 2.183 | 1000.658 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 1.126 | 0.173 | 0.000 | 1.126 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d000000000000004b | 1004.181 | 0.110 | n/a | 0.000 | 0.000 | 0.897 | 1001.886 | 0.012 | n/a | 0.184 | 0.000 | n/a | n/a | 1.092 | 0.110 | 0.000 | 1.092 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d0000000000000045 | 1004.065 | 0.217 | n/a | 0.000 | 0.000 | 0.812 | 1001.791 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 1.152 | 0.217 | 0.000 | 1.152 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000049 | 1003.183 | 0.117 | n/a | 0.000 | 0.000 | 0.857 | 1000.996 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 1.100 | 0.117 | 0.000 | 1.100 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d0000000000000047 | 623.331 | 9.405 | n/a | 0.917 | 0.000 | 0.852 | 611.939 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.120 | 10.322 | 0.017 | 0.120 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d0000000000000041 | 471.418 | 3.538 | n/a | 0.000 | 0.000 | 1.358 | 466.301 | 0.017 | n/a | 0.114 | 0.000 | n/a | n/a | 0.089 | 3.538 | 0.008 | 0.089 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d0000000000000043 | 447.518 | 7.036 | n/a | 0.574 | 0.000 | 0.876 | 438.825 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.145 | 7.610 | 0.017 | 0.145 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d000000000000004c | 435.433 | 3.687 | n/a | 0.461 | 0.000 | 0.458 | 430.712 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.083 | 4.148 | 0.010 | 0.083 | gw-r/thread-69/journal/page | none observed |

## P3 / L4 / internal (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 368.697 | n/a | n/a | n/a | 4.115 | n/a | 0.499 | 0.000 | 0.923 | 357.383 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.168 | 5.308 | 0.015 | 0.168 |
| p99 | 1005.721 | n/a | n/a | n/a | 17.989 | n/a | 3.510 | 0.000 | 3.464 | 1001.699 | 0.042 | n/a | 0.165 | 0.000 | n/a | n/a | 47.757 | 21.500 | 0.129 | 47.757 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000065 | 1005.721 | 0.116 | n/a | 0.000 | 0.000 | 3.464 | 1000.906 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 1.106 | 0.116 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d000000000000006b | 1003.961 | 0.257 | n/a | 0.000 | 0.000 | 0.654 | 1001.699 | 0.042 | n/a | 0.139 | 0.000 | n/a | n/a | 1.170 | 0.257 | 0.000 | 1.170 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d0000000000000068 | 1003.615 | 0.121 | n/a | 0.000 | 0.000 | 0.923 | 1001.344 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 1.121 | 0.121 | 0.000 | 1.121 | gw-r/thread-66/journal/page | none observed |
| 76516b15dec0445d0000000000000050 | 1003.212 | 0.115 | n/a | 0.000 | 0.000 | 0.515 | 1001.294 | 0.026 | n/a | 0.165 | 0.000 | n/a | n/a | 1.097 | 0.115 | 0.000 | 1.097 | gw-r/thread-66/journal/page | none observed |
| 76516b15dec0445d0000000000000069 | 810.878 | 6.378 | n/a | 0.827 | 0.000 | 0.936 | 802.527 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.168 | 7.206 | 0.009 | 0.168 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000063 | 687.252 | 5.079 | n/a | 2.016 | 0.000 | 0.759 | 679.111 | 0.035 | n/a | 0.132 | 0.000 | n/a | n/a | 0.119 | 7.095 | 0.010 | 0.119 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d0000000000000055 | 648.386 | 5.654 | n/a | 0.537 | 0.000 | 3.434 | 638.522 | 0.018 | n/a | 0.081 | 0.000 | n/a | n/a | 0.140 | 6.192 | 0.010 | 0.140 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000053 | 594.195 | 17.989 | n/a | 3.510 | 0.000 | 1.522 | 570.984 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.117 | 21.500 | 0.036 | 0.117 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d0000000000000066 | 368.697 | 4.640 | n/a | 2.498 | 0.000 | 0.906 | 357.383 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 3.181 | 7.138 | 0.019 | 3.181 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000059 | 343.647 | 4.129 | n/a | 0.926 | 0.000 | 1.103 | 337.310 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.083 | 5.055 | 0.015 | 0.083 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d000000000000005a | 318.376 | 7.032 | n/a | 0.400 | 0.000 | 2.008 | 308.679 | 0.013 | n/a | 0.059 | 0.000 | n/a | n/a | 0.185 | 7.432 | 0.023 | 0.185 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d0000000000000057 | 269.654 | 3.829 | n/a | 1.693 | 0.000 | 0.640 | 263.321 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.091 | 5.522 | 0.020 | 0.091 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d000000000000004e | 254.943 | 4.115 | n/a | 1.193 | 0.000 | 1.052 | 248.360 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.145 | 5.308 | 0.021 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d000000000000005d | 247.333 | 2.138 | n/a | 0.257 | 0.000 | 1.850 | 242.934 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.080 | 2.394 | 0.010 | 0.080 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d0000000000000051 | 206.292 | 7.045 | n/a | 0.499 | 0.000 | 0.840 | 197.671 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 0.146 | 7.543 | 0.037 | 0.146 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d0000000000000060 | 50.236 | 1.967 | n/a | 0.260 | 0.000 | 0.251 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.757 | 2.227 | 0.044 | 47.757 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000005e | 27.199 | 3.213 | n/a | 0.296 | 0.000 | 0.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.403 | 3.509 | 0.129 | 23.403 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 551.394 | n/a | n/a | n/a | 2.158 | n/a | 0.000 | 0.000 | 1.074 | 535.829 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.131 | 2.459 | 0.012 | 0.131 |
| p99 | 1008.361 | n/a | n/a | n/a | 10.230 | n/a | 2.177 | 0.000 | 6.026 | 1002.333 | 0.030 | n/a | 0.123 | 0.000 | n/a | n/a | 4.169 | 10.527 | 0.410 | 4.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000078 | 1008.361 | 0.141 | n/a | 0.000 | 0.000 | 6.026 | 1000.990 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 1.111 | 0.141 | 0.000 | 1.111 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d0000000000000072 | 1004.550 | 0.127 | n/a | 0.000 | 0.000 | 0.838 | 1002.333 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 1.154 | 0.127 | 0.000 | 1.154 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d0000000000000075 | 1003.236 | 0.120 | n/a | 0.000 | 0.000 | 1.242 | 1000.688 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 1.094 | 0.120 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d000000000000007f | 1003.212 | 0.121 | n/a | 0.000 | 0.000 | 1.305 | 1000.618 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 1.094 | 0.121 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000080 | 1002.725 | 0.110 | n/a | 0.000 | 0.000 | 0.541 | 1000.851 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 1.111 | 0.110 | 0.000 | 1.111 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000073 | 876.380 | 2.087 | n/a | 0.000 | 0.000 | 2.519 | 871.595 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.083 | 2.087 | 0.002 | 0.083 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d000000000000006c | 551.394 | 8.252 | n/a | 2.177 | 0.000 | 4.862 | 535.829 | 0.023 | n/a | 0.123 | 0.000 | n/a | n/a | 0.129 | 10.429 | 0.019 | 0.129 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d000000000000006e | 452.513 | 10.230 | n/a | 0.297 | 0.000 | 0.595 | 441.166 | 0.030 | n/a | 0.069 | 0.000 | n/a | n/a | 0.127 | 10.527 | 0.023 | 0.127 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000079 | 365.072 | 4.087 | n/a | 0.287 | 0.000 | 0.583 | 359.927 | 0.024 | n/a | 0.091 | 0.000 | n/a | n/a | 0.073 | 4.374 | 0.012 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d000000000000007b | 252.508 | 2.967 | n/a | 0.000 | 0.000 | 3.659 | 245.736 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.069 | 2.967 | 0.012 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d0000000000000076 | 227.772 | 5.022 | n/a | 0.000 | 0.000 | 1.074 | 221.449 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.131 | 5.022 | 0.022 | 0.131 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d000000000000007d | 89.459 | 2.158 | n/a | 0.301 | 0.000 | 0.864 | 85.993 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.063 | 2.459 | 0.027 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000070 | 7.569 | 3.104 | n/a | 0.000 | 0.000 | 0.296 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.169 | 3.104 | 0.410 | 4.169 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 534.064 | n/a | n/a | n/a | 1.931 | n/a | 0.000 | 0.000 | 0.886 | 516.299 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 1.101 | 1.931 | 0.008 | 1.101 |
| p99 | 1015.506 | n/a | n/a | n/a | 14.165 | n/a | 4.497 | 0.000 | 12.879 | 1001.761 | 1.023 | n/a | 0.128 | 0.000 | n/a | n/a | 52.449 | 16.747 | 0.079 | 52.449 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000093 | 1015.506 | 0.107 | n/a | 0.000 | 0.000 | 12.879 | 1001.296 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 1.101 | 0.107 | 0.000 | 1.101 | gw-r/thread-73/journal/page | none observed |
| 76516b15dec0445d0000000000000088 | 1007.915 | 0.122 | n/a | 0.000 | 0.000 | 3.578 | 1000.724 | 1.023 | n/a | 0.053 | 0.000 | n/a | n/a | 2.415 | 0.122 | 0.000 | 2.415 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d0000000000000086 | 1003.649 | 0.116 | n/a | 0.000 | 0.000 | 0.541 | 1001.761 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 1.117 | 0.116 | 0.000 | 1.117 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d000000000000008b | 1003.468 | 0.167 | n/a | 0.000 | 0.000 | 0.572 | 1001.448 | 0.015 | n/a | 0.128 | 0.000 | n/a | n/a | 1.138 | 0.167 | 0.000 | 1.138 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d000000000000008c | 1003.361 | 0.159 | n/a | 0.000 | 0.000 | 1.121 | 1000.850 | 0.016 | n/a | 0.108 | 0.000 | n/a | n/a | 1.107 | 0.159 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d000000000000008f | 882.124 | 5.601 | n/a | 4.497 | 0.000 | 1.291 | 870.547 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.099 | 10.098 | 0.011 | 0.099 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d0000000000000085 | 534.064 | 14.165 | n/a | 2.582 | 0.000 | 0.828 | 516.299 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.105 | 16.747 | 0.031 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d0000000000000089 | 510.410 | 4.093 | n/a | 0.000 | 0.000 | 0.886 | 505.251 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.078 | 4.093 | 0.008 | 0.078 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d000000000000008d | 506.355 | 5.413 | n/a | 0.000 | 0.000 | 0.897 | 499.852 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.136 | 5.413 | 0.011 | 0.136 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000081 | 82.461 | 1.931 | n/a | 0.000 | 0.000 | 3.810 | 76.584 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.071 | 1.931 | 0.023 | 0.071 | gw-r/thread-66/journal/page | none observed |
| 76516b15dec0445d0000000000000082 | 55.007 | 2.324 | n/a | 0.000 | 0.000 | 0.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.449 | 2.324 | 0.042 | 52.449 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000090 | 46.769 | 3.703 | n/a | 0.000 | 0.000 | 0.249 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.817 | 3.703 | 0.079 | 42.817 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L256 / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 701.239 | n/a | n/a | n/a | 2.420 | n/a | 0.000 | 0.000 | 0.814 | 690.160 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.110 | 2.420 | 0.007 | 0.110 |
| p99 | 1004.589 | n/a | n/a | n/a | 15.494 | n/a | 7.502 | 0.000 | 5.239 | 1001.330 | 0.034 | n/a | 0.143 | 0.000 | n/a | n/a | 1.113 | 22.996 | 0.068 | 1.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000095 | 1004.589 | 0.131 | n/a | 0.000 | 0.000 | 2.285 | 1000.948 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 1.113 | 0.131 | 0.000 | 1.113 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d000000000000009d | 1003.472 | 0.122 | n/a | 0.000 | 0.000 | 0.814 | 1001.330 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 1.111 | 0.122 | 0.000 | 1.111 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d00000000000000a4 | 1002.564 | 0.115 | n/a | 0.000 | 0.000 | 0.551 | 1000.737 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 1.100 | 0.115 | 0.000 | 1.100 | gw-r/thread-44/journal/page | none observed |
| 76516b15dec0445d00000000000000a8 | 905.043 | 5.797 | n/a | 0.000 | 0.000 | 0.517 | 898.555 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.110 | 5.797 | 0.006 | 0.110 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d0000000000000097 | 866.992 | 15.494 | n/a | 7.502 | 0.000 | 0.722 | 842.982 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.227 | 22.996 | 0.027 | 0.227 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d000000000000009b | 866.480 | 1.611 | n/a | 0.000 | 0.000 | 4.077 | 860.662 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.073 | 1.611 | 0.002 | 0.073 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d0000000000000098 | 701.239 | 7.854 | n/a | 0.000 | 0.000 | 3.060 | 690.160 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.121 | 7.854 | 0.011 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d000000000000009e | 492.781 | 11.957 | n/a | 0.000 | 0.000 | 5.239 | 475.363 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.176 | 11.957 | 0.024 | 0.176 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d00000000000000a0 | 428.869 | 2.155 | n/a | 0.000 | 0.000 | 3.789 | 422.791 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.099 | 2.155 | 0.005 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000094 | 392.705 | 3.675 | n/a | 5.885 | 0.000 | 0.477 | 382.404 | 0.034 | n/a | 0.143 | 0.000 | n/a | n/a | 0.086 | 9.560 | 0.024 | 0.086 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d00000000000000a7 | 333.738 | 2.420 | n/a | 0.000 | 0.000 | 0.641 | 330.562 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.060 | 2.420 | 0.007 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d00000000000000a2 | 189.500 | 1.561 | n/a | 0.000 | 0.000 | 0.843 | 186.982 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.060 | 1.561 | 0.008 | 0.060 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d00000000000000a5 | 109.970 | 3.665 | n/a | 3.830 | 0.000 | 0.583 | 101.763 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.066 | 7.494 | 0.068 | 0.066 | gw-r/thread-63/journal/page | none observed |

## P3 / L1024 / internal (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 442.876 | n/a | n/a | n/a | 2.127 | n/a | 0.000 | 0.000 | 1.146 | 434.419 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.083 | 2.127 | 0.007 | 0.083 |
| p99 | 1009.247 | n/a | n/a | n/a | 12.315 | n/a | 6.513 | 0.000 | 7.070 | 1001.225 | 2.130 | n/a | 0.124 | 0.000 | n/a | n/a | 6.591 | 18.828 | 0.732 | 6.591 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d00000000000000c2 | 1009.247 | 0.128 | n/a | 0.000 | 0.000 | 7.070 | 1000.876 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 1.096 | 0.128 | 0.000 | 1.096 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d00000000000000ae | 1003.243 | 0.165 | n/a | 0.000 | 0.000 | 0.650 | 1001.225 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 1.122 | 0.165 | 0.000 | 1.122 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d00000000000000bb | 1003.159 | 0.110 | n/a | 0.000 | 0.000 | 1.096 | 1000.791 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 1.095 | 0.110 | 0.000 | 1.095 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d00000000000000ad | 1002.440 | 0.118 | n/a | 0.000 | 0.000 | 0.313 | 1000.857 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.104 | 0.118 | 0.000 | 1.104 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d00000000000000b3 | 920.838 | 5.077 | n/a | 0.000 | 0.000 | 0.456 | 912.938 | 2.130 | n/a | 0.037 | 0.000 | n/a | n/a | 0.200 | 5.077 | 0.006 | 0.200 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d00000000000000bc | 851.311 | 9.716 | n/a | 0.414 | 0.000 | 0.575 | 840.392 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.177 | 10.130 | 0.012 | 0.177 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d00000000000000bd | 530.909 | 2.596 | n/a | 0.000 | 0.000 | 2.964 | 525.197 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.083 | 2.596 | 0.005 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d00000000000000b1 | 442.876 | 6.114 | n/a | 0.267 | 0.000 | 1.875 | 434.419 | 0.008 | n/a | 0.124 | 0.000 | n/a | n/a | 0.069 | 6.381 | 0.014 | 0.069 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d00000000000000c0 | 287.403 | 5.413 | n/a | 0.000 | 0.000 | 1.146 | 280.693 | 0.005 | n/a | 0.081 | 0.000 | n/a | n/a | 0.065 | 5.413 | 0.019 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d00000000000000b7 | 272.916 | 2.022 | n/a | 0.000 | 0.000 | 1.189 | 269.605 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.060 | 2.022 | 0.007 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d00000000000000b8 | 200.552 | 2.010 | n/a | 0.000 | 0.000 | 2.524 | 195.878 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.060 | 2.010 | 0.010 | 0.060 | gw-r/thread-72/journal/page | none observed |
| 76516b15dec0445d00000000000000b5 | 119.881 | 5.956 | n/a | 0.000 | 0.000 | 1.239 | 112.498 | 0.034 | n/a | 0.084 | 0.000 | n/a | n/a | 0.070 | 5.956 | 0.050 | 0.070 | gw-r/thread-74/journal/page | none observed |
| 76516b15dec0445d00000000000000af | 91.334 | 2.127 | n/a | 0.000 | 0.000 | 1.929 | 86.486 | 0.704 | n/a | 0.020 | 0.000 | n/a | n/a | 0.069 | 2.127 | 0.023 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d00000000000000ac | 25.732 | 12.315 | n/a | 6.513 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.591 | 18.828 | 0.732 | 6.591 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / recovery / internal (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 797.579 | n/a | n/a | n/a | 1.659 | n/a | 0.000 | 0.000 | 0.984 | 793.488 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.108 | 1.659 | 0.002 | 0.108 |
| p99 | 1005.436 | n/a | n/a | n/a | 4.791 | n/a | 3.606 | 0.000 | 3.844 | 1002.636 | 0.024 | n/a | 0.100 | 0.000 | n/a | n/a | 40.545 | 8.284 | 0.169 | 40.545 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d00000000000000cf | 1005.436 | 0.112 | n/a | 0.000 | 0.000 | 3.424 | 1000.751 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 1.093 | 0.112 | 0.000 | 1.093 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d00000000000000d5 | 1004.934 | 0.130 | n/a | 0.000 | 0.000 | 0.984 | 1002.636 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 1.100 | 0.130 | 0.000 | 1.100 | gw-r/thread-72/journal/page | none observed |
| 76516b15dec0445d00000000000000c7 | 1003.310 | 0.178 | n/a | 0.000 | 0.000 | 1.228 | 1000.738 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 1.118 | 0.178 | 0.000 | 1.118 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d00000000000000cc | 1003.023 | 0.160 | n/a | 0.000 | 0.000 | 0.954 | 1000.703 | 0.024 | n/a | 0.067 | 0.000 | n/a | n/a | 1.116 | 0.160 | 0.000 | 1.116 | gw-r/thread-72/journal/page | none observed |
| 76516b15dec0445d00000000000000c3 | 1002.219 | 0.110 | n/a | 0.000 | 0.000 | 0.559 | 1000.419 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 1.096 | 0.110 | 0.000 | 1.096 | gw-r/thread-44/journal/page | none observed |
| 76516b15dec0445d00000000000000d1 | 849.321 | 1.659 | n/a | 0.000 | 0.000 | 0.506 | 847.056 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.059 | 1.659 | 0.002 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 76516b15dec0445d00000000000000ca | 797.579 | 2.335 | n/a | 0.000 | 0.000 | 1.639 | 793.488 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.069 | 2.335 | 0.003 | 0.069 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d00000000000000c6 | 615.358 | 1.926 | n/a | 0.000 | 0.000 | 2.649 | 610.676 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.064 | 1.926 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d00000000000000c9 | 365.070 | 4.518 | n/a | 0.000 | 0.000 | 0.919 | 359.490 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.107 | 4.518 | 0.012 | 0.107 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d00000000000000ce | 205.508 | 4.791 | n/a | 0.000 | 0.000 | 1.170 | 199.325 | 0.015 | n/a | 0.100 | 0.000 | n/a | n/a | 0.108 | 4.791 | 0.023 | 0.108 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d00000000000000d2 | 99.765 | 4.492 | n/a | 1.781 | 0.000 | 3.844 | 89.514 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.066 | 6.272 | 0.063 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d00000000000000c4 | 49.070 | 4.678 | n/a | 3.606 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.545 | 8.284 | 0.169 | 40.545 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 558.378 | n/a | n/a | n/a | 2.071 | n/a | 0.000 | 0.000 | 0.714 | 554.915 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.073 | 2.071 | 0.004 | 0.073 |
| p99 | 1003.620 | n/a | n/a | n/a | 7.770 | n/a | 0.379 | 0.000 | 4.043 | 1001.070 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 24.787 | 7.770 | 0.178 | 24.787 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d00000000000000d7 | 1003.620 | 0.106 | n/a | 0.000 | 0.000 | 1.238 | 1001.070 | 0.009 | n/a | 0.102 | 0.000 | n/a | n/a | 1.096 | 0.106 | 0.000 | 1.096 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d00000000000000da | 1002.947 | 0.177 | n/a | 0.000 | 0.000 | 0.714 | 1000.857 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 1.121 | 0.177 | 0.000 | 1.121 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d00000000000000d6 | 1002.947 | 0.105 | n/a | 0.000 | 0.000 | 0.657 | 1001.011 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 1.090 | 0.105 | 0.000 | 1.090 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d00000000000000e6 | 1002.722 | 0.102 | n/a | 0.000 | 0.000 | 0.746 | 1000.730 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 1.088 | 0.102 | 0.000 | 1.088 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d00000000000000e9 | 840.102 | 3.819 | n/a | 0.379 | 0.000 | 0.577 | 835.191 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.080 | 4.198 | 0.005 | 0.080 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d00000000000000db | 786.765 | 3.453 | n/a | 0.000 | 0.000 | 2.334 | 780.862 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.071 | 3.453 | 0.004 | 0.071 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d00000000000000e2 | 558.378 | 1.804 | n/a | 0.000 | 0.000 | 1.563 | 554.915 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.059 | 1.804 | 0.003 | 0.059 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d00000000000000e8 | 512.793 | 1.997 | n/a | 0.000 | 0.000 | 0.809 | 509.881 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.073 | 1.997 | 0.004 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d00000000000000df | 323.861 | 7.770 | n/a | 0.000 | 0.000 | 4.043 | 311.921 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.069 | 7.770 | 0.024 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d00000000000000e5 | 179.424 | 6.740 | n/a | 0.000 | 0.000 | 0.692 | 171.882 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.066 | 6.740 | 0.038 | 0.066 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d00000000000000dc | 176.809 | 5.905 | n/a | 0.000 | 0.000 | 0.593 | 170.186 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.069 | 5.905 | 0.033 | 0.069 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d00000000000000e1 | 72.478 | 2.071 | n/a | 0.000 | 0.000 | 0.679 | 69.620 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.071 | 0.029 | 0.063 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d00000000000000d8 | 30.570 | 5.455 | n/a | 0.000 | 0.000 | 0.328 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.787 | 5.455 | 0.178 | 24.787 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h1 / internal (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 377.859 | n/a | n/a | n/a | 2.458 | n/a | 0.000 | 0.000 | 0.575 | 375.397 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.109 | 2.458 | 0.008 | 0.109 |
| p99 | 1004.322 | n/a | n/a | n/a | 8.983 | n/a | 0.490 | 0.000 | 0.893 | 1002.235 | 0.027 | n/a | 0.068 | 0.000 | n/a | n/a | 9.431 | 9.473 | 0.248 | 9.431 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d00000000000000f2 | 1004.322 | 0.179 | n/a | 0.000 | 0.000 | 0.717 | 1002.235 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 1.147 | 0.179 | 0.000 | 1.147 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d00000000000000f0 | 1002.981 | 0.174 | n/a | 0.000 | 0.000 | 0.856 | 1000.751 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 1.152 | 0.174 | 0.000 | 1.152 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d00000000000000f1 | 1002.547 | 0.129 | n/a | 0.000 | 0.000 | 0.575 | 1000.681 | 0.027 | n/a | 0.033 | 0.000 | n/a | n/a | 1.102 | 0.129 | 0.000 | 1.102 | gw-r/thread-72/journal/page | none observed |
| 76516b15dec0445d00000000000000fe | 1002.508 | 0.104 | n/a | 0.000 | 0.000 | 0.554 | 1000.705 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.097 | 0.104 | 0.000 | 1.097 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d00000000000000f9 | 874.082 | 3.833 | n/a | 0.431 | 0.000 | 0.594 | 869.094 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.102 | 4.264 | 0.005 | 0.102 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d0000000000000102 | 611.915 | 4.588 | n/a | 0.000 | 0.000 | 0.893 | 606.273 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.109 | 4.588 | 0.007 | 0.109 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d000000000000010a | 557.323 | 4.104 | n/a | 0.317 | 0.000 | 0.391 | 552.322 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.156 | 4.421 | 0.008 | 0.156 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d00000000000000f3 | 401.147 | 3.546 | n/a | 0.000 | 0.000 | 0.695 | 396.314 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.558 | 3.546 | 0.009 | 0.558 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d00000000000000fa | 377.859 | 1.878 | n/a | 0.000 | 0.000 | 0.470 | 375.397 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.053 | 1.878 | 0.005 | 0.053 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d00000000000000fd | 362.742 | 4.999 | n/a | 0.000 | 0.000 | 0.817 | 356.780 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.069 | 4.999 | 0.014 | 0.069 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d00000000000000f7 | 135.909 | 2.458 | n/a | 0.000 | 0.000 | 0.682 | 132.630 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.069 | 2.458 | 0.018 | 0.069 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d0000000000000108 | 93.756 | 1.583 | n/a | 0.000 | 0.000 | 0.348 | 91.741 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.058 | 1.583 | 0.017 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d0000000000000100 | 88.379 | 8.983 | n/a | 0.490 | 0.000 | 0.794 | 77.986 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.098 | 9.473 | 0.107 | 0.098 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d0000000000000106 | 66.729 | 3.253 | n/a | 0.000 | 0.000 | 0.513 | 62.882 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.062 | 3.253 | 0.049 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000104 | 13.097 | 2.849 | n/a | 0.356 | 0.000 | 0.460 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.431 | 3.205 | 0.245 | 9.431 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d00000000000000f4 | 9.029 | 2.237 | n/a | 0.000 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.495 | 2.237 | 0.248 | 6.495 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.332 | n/a | n/a | n/a | 4.709 | n/a | 0.000 | 0.000 | 0.299 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.380 | 4.709 | 0.237 | 13.380 |
| p99 | 90.112 | n/a | n/a | n/a | 8.761 | n/a | 0.574 | 0.000 | 1.896 | 66.207 | 0.009 | n/a | 19.353 | 0.000 | n/a | n/a | 47.408 | 8.761 | 0.489 | 47.408 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000116 | 90.112 | 8.500 | n/a | 0.000 | 0.000 | 1.896 | 60.062 | 0.009 | n/a | 19.353 | 0.000 | n/a | n/a | 0.293 | 8.500 | 0.094 | 0.293 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d000000000000010b | 71.015 | 4.027 | n/a | 0.000 | 0.000 | 0.593 | 66.207 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.144 | 4.027 | 0.057 | 0.144 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d000000000000011a | 66.629 | 3.802 | n/a | 0.000 | 0.000 | 0.780 | 61.810 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.181 | 3.802 | 0.057 | 0.181 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d000000000000011f | 54.382 | 7.516 | n/a | 0.000 | 0.000 | 0.281 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.585 | 7.516 | 0.138 | 46.585 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000114 | 52.654 | 4.709 | n/a | 0.000 | 0.000 | 0.537 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.408 | 4.709 | 0.089 | 47.408 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000113 | 51.851 | 8.761 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.715 | 8.761 | 0.169 | 42.715 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000121 | 48.211 | 4.898 | n/a | 0.419 | 0.000 | 0.463 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.430 | 5.317 | 0.110 | 42.430 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000122 | 44.419 | 4.155 | n/a | 0.000 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.909 | 4.155 | 0.094 | 39.909 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000010d | 43.278 | 4.163 | n/a | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.838 | 4.163 | 0.096 | 38.838 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000010c | 42.062 | 5.073 | n/a | 0.393 | 0.000 | 0.323 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.273 | 5.466 | 0.130 | 36.273 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000119 | 39.889 | 5.674 | n/a | 0.000 | 0.000 | 0.403 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.813 | 5.674 | 0.142 | 33.813 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000112 | 37.416 | 4.164 | n/a | 0.000 | 0.000 | 0.408 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.844 | 4.164 | 0.111 | 32.844 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000110 | 35.035 | 3.619 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.004 | 3.619 | 0.103 | 31.004 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000011e | 34.387 | 3.735 | n/a | 0.000 | 0.000 | 0.242 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.410 | 3.735 | 0.109 | 30.410 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000010e | 34.268 | 5.018 | n/a | 0.474 | 0.000 | 0.512 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.263 | 5.492 | 0.160 | 28.263 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000010f | 34.072 | 8.073 | n/a | 0.000 | 0.000 | 0.242 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.756 | 8.073 | 0.237 | 25.756 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000011d | 33.477 | 3.880 | n/a | 0.000 | 0.000 | 0.380 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.217 | 3.880 | 0.116 | 29.217 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000120 | 32.413 | 6.209 | n/a | 0.000 | 0.000 | 0.294 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.911 | 6.209 | 0.192 | 25.911 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000111 | 29.901 | 4.048 | n/a | 0.000 | 0.000 | 0.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.633 | 4.048 | 0.135 | 25.633 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000012d | 29.029 | 3.078 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.680 | 3.078 | 0.106 | 25.680 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 464.552 | n/a | n/a | n/a | 2.315 | n/a | 0.000 | 0.000 | 0.586 | 459.691 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.061 | 2.315 | 0.008 | 0.061 |
| p99 | 1002.907 | n/a | n/a | n/a | 5.698 | n/a | 0.314 | 0.000 | 3.701 | 1000.646 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 40.202 | 5.698 | 0.045 | 40.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000148 | 1002.907 | 0.170 | n/a | 0.000 | 0.000 | 0.977 | 1000.596 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 1.114 | 0.170 | 0.000 | 1.114 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d000000000000014f | 1002.477 | 0.102 | n/a | 0.000 | 0.000 | 0.586 | 1000.646 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 1.091 | 0.102 | 0.000 | 1.091 | gw-r/thread-72/journal/page | none observed |
| 76516b15dec0445d000000000000015a | 1002.072 | 0.115 | n/a | 0.000 | 0.000 | 0.367 | 1000.461 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 1.092 | 0.115 | 0.000 | 1.092 | gw-r/thread-73/journal/page | none observed |
| 76516b15dec0445d000000000000015c | 925.941 | 2.315 | n/a | 0.000 | 0.000 | 0.407 | 923.135 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.052 | 2.315 | 0.003 | 0.052 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d000000000000014e | 601.221 | 1.969 | n/a | 0.000 | 0.000 | 0.515 | 598.657 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.050 | 1.969 | 0.003 | 0.050 | gw-r/thread-44/journal/page | none observed |
| 76516b15dec0445d0000000000000157 | 519.495 | 2.241 | n/a | 0.000 | 0.000 | 0.409 | 516.753 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.061 | 2.241 | 0.004 | 0.061 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d0000000000000152 | 472.177 | 5.698 | n/a | 0.000 | 0.000 | 0.760 | 465.587 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.060 | 5.698 | 0.012 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d0000000000000147 | 464.552 | 3.784 | n/a | 0.000 | 0.000 | 0.992 | 459.691 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.053 | 3.784 | 0.008 | 0.053 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d0000000000000155 | 462.035 | 3.744 | n/a | 0.000 | 0.000 | 1.110 | 457.073 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 3.744 | 0.008 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d000000000000014c | 261.383 | 2.476 | n/a | 0.314 | 0.000 | 3.701 | 254.804 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.052 | 2.791 | 0.011 | 0.052 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d000000000000015e | 229.125 | 3.406 | n/a | 0.000 | 0.000 | 0.521 | 225.066 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.095 | 3.406 | 0.015 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000158 | 151.094 | 4.151 | n/a | 0.296 | 0.000 | 0.632 | 145.881 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.071 | 4.447 | 0.029 | 0.071 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d0000000000000151 | 105.500 | 2.449 | n/a | 0.000 | 0.000 | 0.792 | 102.185 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.051 | 2.449 | 0.023 | 0.051 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d000000000000014a | 42.477 | 1.891 | n/a | 0.000 | 0.000 | 0.384 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.202 | 1.891 | 0.045 | 40.202 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (177 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.336 | n/a | n/a | n/a | 3.284 | n/a | 0.000 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.960 | 3.284 | 0.280 | 8.960 |
| p99 | 43.893 | n/a | n/a | n/a | 8.015 | n/a | 0.339 | 0.000 | 0.595 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.610 | 8.015 | 0.718 | 33.610 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d00000000000001b2 | 58.409 | 3.057 | n/a | 0.000 | 0.000 | 0.590 | 54.643 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.086 | 3.057 | 0.052 | 0.086 | gw-r/thread-64/journal/page | none observed |
| 76516b15dec0445d0000000000000177 | 43.893 | 4.230 | n/a | 0.000 | 0.000 | 0.465 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.198 | 4.230 | 0.096 | 39.198 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d00000000000001c2 | 36.759 | 2.971 | n/a | 0.000 | 0.000 | 0.177 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.610 | 2.971 | 0.081 | 33.610 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d00000000000001d0 | 33.642 | 6.198 | n/a | 0.000 | 0.000 | 0.406 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.038 | 6.198 | 0.184 | 27.038 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d00000000000001cd | 29.523 | 2.971 | n/a | 0.000 | 0.000 | 0.218 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.333 | 2.971 | 0.101 | 26.333 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000015f | 28.713 | 3.783 | n/a | 0.342 | 0.000 | 0.282 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.306 | 4.125 | 0.144 | 24.306 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000016f | 27.363 | 2.990 | n/a | 0.000 | 0.000 | 0.233 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.139 | 2.990 | 0.109 | 24.139 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000016c | 27.151 | 5.006 | n/a | 0.000 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.889 | 5.006 | 0.184 | 21.889 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000169 | 26.150 | 6.946 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.966 | 6.946 | 0.266 | 18.966 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000174 | 24.925 | 6.453 | n/a | 0.000 | 0.000 | 0.220 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.252 | 6.453 | 0.259 | 18.252 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d00000000000001c4 | 24.363 | 3.330 | n/a | 0.000 | 0.000 | 0.365 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.668 | 3.330 | 0.137 | 20.668 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000165 | 23.774 | 2.949 | n/a | 0.000 | 0.000 | 0.237 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.589 | 2.949 | 0.124 | 20.589 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000018d | 22.373 | 3.074 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.028 | 3.074 | 0.137 | 19.028 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000172 | 22.329 | 4.187 | n/a | 0.000 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.902 | 4.187 | 0.188 | 17.902 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000176 | 21.965 | 5.433 | n/a | 0.000 | 0.000 | 0.232 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.300 | 5.433 | 0.247 | 16.300 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000175 | 21.735 | 3.068 | n/a | 0.000 | 0.000 | 0.261 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.406 | 3.068 | 0.141 | 18.406 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000017a | 21.161 | 6.516 | n/a | 0.000 | 0.000 | 0.309 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.336 | 6.516 | 0.308 | 14.336 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000189 | 21.030 | 5.275 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.514 | 5.275 | 0.251 | 15.514 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000193 | 20.796 | 5.437 | n/a | 0.000 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.104 | 5.437 | 0.261 | 15.104 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d00000000000001f5 | 20.697 | 6.525 | n/a | 0.000 | 0.000 | 0.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.927 | 6.525 | 0.315 | 13.927 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h10 / internal (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 511.219 | n/a | n/a | n/a | 1.954 | n/a | 0.000 | 0.000 | 0.522 | 504.500 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.092 | 1.954 | 0.003 | 0.092 |
| p99 | 1004.173 | n/a | n/a | n/a | 6.210 | n/a | 0.466 | 0.000 | 1.724 | 1001.662 | 0.044 | n/a | 0.093 | 0.000 | n/a | n/a | 5.790 | 6.210 | 0.234 | 5.790 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000221 | 1004.173 | 0.152 | n/a | 0.000 | 0.000 | 1.724 | 1001.040 | 0.044 | n/a | 0.093 | 0.000 | n/a | n/a | 1.119 | 0.152 | 0.000 | 1.119 | gw-r/thread-73/journal/page | none observed |
| 76516b15dec0445d000000000000022e | 1003.762 | 0.156 | n/a | 0.000 | 0.000 | 0.743 | 1001.662 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 1.136 | 0.156 | 0.000 | 1.136 | gw-r/thread-61/journal/page | none observed |
| 76516b15dec0445d000000000000021a | 1003.015 | 0.122 | n/a | 0.000 | 0.000 | 0.373 | 1001.329 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 1.103 | 0.122 | 0.000 | 1.103 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d000000000000022a | 1002.504 | 0.101 | n/a | 0.000 | 0.000 | 0.522 | 1000.718 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 1.091 | 0.101 | 0.000 | 1.091 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d000000000000022b | 1002.058 | 0.101 | n/a | 0.000 | 0.000 | 0.410 | 1000.427 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 1.097 | 0.101 | 0.000 | 1.097 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d000000000000021b | 985.027 | 2.224 | n/a | 0.000 | 0.000 | 0.571 | 982.130 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.057 | 2.224 | 0.002 | 0.057 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d000000000000021d | 925.508 | 2.804 | n/a | 0.000 | 0.000 | 0.808 | 921.810 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.054 | 2.804 | 0.003 | 0.054 | gw-r/thread-46/journal/page | none observed |
| 76516b15dec0445d000000000000022c | 511.219 | 6.210 | n/a | 0.000 | 0.000 | 0.355 | 504.500 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.096 | 6.210 | 0.012 | 0.096 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d000000000000021f | 326.613 | 1.961 | n/a | 0.000 | 0.000 | 0.411 | 324.143 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.053 | 1.961 | 0.006 | 0.053 | gw-r/thread-73/journal/page | none observed |
| 76516b15dec0445d0000000000000228 | 246.734 | 2.146 | n/a | 0.000 | 0.000 | 1.110 | 243.360 | 0.026 | n/a | 0.041 | 0.000 | n/a | n/a | 0.052 | 2.146 | 0.009 | 0.052 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d0000000000000218 | 213.040 | 2.628 | n/a | 0.000 | 0.000 | 0.504 | 209.802 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.052 | 2.628 | 0.012 | 0.052 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d0000000000000224 | 105.986 | 4.454 | n/a | 0.466 | 0.000 | 0.683 | 100.269 | 0.010 | n/a | 0.012 | 0.000 | n/a | n/a | 0.092 | 4.920 | 0.046 | 0.092 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d0000000000000222 | 67.442 | 1.954 | n/a | 0.000 | 0.000 | 0.574 | 64.810 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.074 | 1.954 | 0.029 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 76516b15dec0445d0000000000000226 | 7.906 | 1.852 | n/a | 0.000 | 0.000 | 0.265 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.790 | 1.852 | 0.234 | 5.790 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (25 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.592 | n/a | n/a | n/a | 3.868 | n/a | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.533 | 3.868 | 0.114 | 4.533 |
| p99 | 1002.793 | n/a | n/a | n/a | 10.992 | n/a | 0.000 | 0.000 | 10.943 | 1000.770 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 43.208 | 10.992 | 0.688 | 43.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000239 | 1002.793 | 0.135 | n/a | 0.000 | 0.000 | 0.728 | 1000.762 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 1.100 | 0.135 | 0.000 | 1.100 | gw-r/thread-62/journal/page | none observed |
| 76516b15dec0445d0000000000000230 | 1002.540 | 0.154 | n/a | 0.000 | 0.000 | 0.586 | 1000.634 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 1.120 | 0.154 | 0.000 | 1.120 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d000000000000023a | 1002.455 | 0.096 | n/a | 0.000 | 0.000 | 0.432 | 1000.770 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 1.090 | 0.096 | 0.000 | 1.090 | gw-r/thread-67/journal/page | none observed |
| 76516b15dec0445d000000000000022f | 1002.253 | 0.109 | n/a | 0.000 | 0.000 | 0.471 | 1000.566 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 1.056 | 0.109 | 0.000 | 1.056 | gw-r/thread-63/journal/page | none observed |
| 76516b15dec0445d0000000000000233 | 845.205 | 5.533 | n/a | 0.000 | 0.000 | 10.943 | 828.552 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.102 | 5.533 | 0.007 | 0.102 | gw-r/thread-73/journal/page | none observed |
| 76516b15dec0445d0000000000000231 | 839.679 | 6.485 | n/a | 0.000 | 0.000 | 0.701 | 832.310 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.140 | 6.485 | 0.008 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000236 | 782.255 | 4.683 | n/a | 0.000 | 0.000 | 0.680 | 776.721 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.110 | 4.683 | 0.006 | 0.110 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000234 | 253.537 | 2.406 | n/a | 0.000 | 0.000 | 0.745 | 250.272 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.065 | 2.406 | 0.009 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 76516b15dec0445d000000000000023b | 92.845 | 2.116 | n/a | 0.000 | 0.000 | 0.554 | 90.067 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.057 | 2.116 | 0.023 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d000000000000025c | 59.756 | 4.034 | n/a | 0.000 | 0.000 | 0.583 | 55.026 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.067 | 4.034 | 0.068 | 0.067 | gw-r/thread-65/journal/page | none observed |
| 76516b15dec0445d000000000000024f | 54.394 | 10.992 | n/a | 0.000 | 0.000 | 0.194 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.208 | 10.992 | 0.202 | 43.208 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000252 | 32.824 | 7.680 | n/a | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.723 | 7.680 | 0.234 | 24.723 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000244 | 31.592 | 4.797 | n/a | 0.000 | 0.000 | 0.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.528 | 4.797 | 0.152 | 26.528 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000243 | 26.677 | 1.972 | n/a | 0.000 | 0.000 | 0.694 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.011 | 1.972 | 0.074 | 24.011 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000254 | 26.292 | 2.123 | n/a | 0.000 | 0.000 | 0.266 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.903 | 2.123 | 0.081 | 23.903 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000024b | 23.407 | 5.744 | n/a | 0.000 | 0.000 | 0.203 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.460 | 5.744 | 0.245 | 17.460 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000241 | 19.793 | 5.478 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.074 | 5.478 | 0.277 | 14.074 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000023c | 18.469 | 7.153 | n/a | 0.000 | 0.000 | 0.243 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.073 | 7.153 | 0.387 | 11.073 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000249 | 16.642 | 1.889 | n/a | 0.000 | 0.000 | 0.225 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.528 | 1.889 | 0.114 | 14.528 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000255 | 15.830 | 9.231 | n/a | 0.000 | 0.000 | 0.200 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.399 | 9.231 | 0.583 | 6.399 | node-14/thread-2/replica.publish | none observed |

## P3 / sweep / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.173 | n/a | n/a | n/a | 7.599 | n/a | 0.000 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.270 | 7.599 | 0.359 | 13.270 |
| p99 | 29.373 | n/a | n/a | n/a | 9.696 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.230 | 9.696 | 0.416 | 27.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d000000000000025e | 29.373 | 1.727 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.230 | 1.727 | 0.059 | 27.230 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000260 | 26.973 | 9.696 | n/a | 0.000 | 0.000 | 0.230 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.047 | 9.696 | 0.359 | 17.047 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000261 | 21.173 | 7.599 | n/a | 0.000 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.270 | 7.599 | 0.359 | 13.270 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d0000000000000262 | 20.195 | 8.398 | n/a | 0.000 | 0.000 | 0.283 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.513 | 8.398 | 0.416 | 11.513 | node-14/thread-2/socket.wait-first-byte | none observed |
| 76516b15dec0445d000000000000025d | 12.689 | 3.821 | n/a | 0.000 | 0.000 | 0.295 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.573 | 3.821 | 0.301 | 8.573 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / tail / internal (2871 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.037 | n/a | n/a | n/a | 4.249 | n/a | 0.000 | 0.000 | 0.230 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.406 | 4.271 | 0.360 | 6.406 |
| p99 | 83.228 | n/a | n/a | n/a | 20.969 | n/a | 1.542 | 0.000 | 1.271 | 78.109 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 47.553 | 22.093 | 0.858 | 47.553 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 76516b15dec0445d0000000000000f37 | 146.443 | 5.639 | n/a | 0.000 | 0.000 | 0.405 | 140.064 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.312 | 5.639 | 0.039 | 0.312 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d00000000000019a6 | 142.551 | 2.647 | n/a | 0.000 | 0.000 | 0.361 | 139.443 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.647 | 0.019 | 0.063 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000001528 | 125.698 | 7.509 | n/a | 0.000 | 0.000 | 0.504 | 117.405 | 0.001 | n/a | 0.007 | 0.000 | n/a | n/a | 0.272 | 7.509 | 0.060 | 0.272 | gw-r/thread-68/journal/page | none observed |
| 76516b15dec0445d000000000000093a | 119.814 | 3.204 | n/a | 0.000 | 0.000 | 0.309 | 116.158 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.126 | 3.204 | 0.027 | 0.126 | gw-r/thread-86/journal/page | none observed |
| 76516b15dec0445d00000000000004f5 | 116.788 | 10.958 | n/a | 0.412 | 0.000 | 0.753 | 104.376 | 0.008 | n/a | 0.142 | 0.000 | n/a | n/a | 0.139 | 11.370 | 0.097 | 0.139 | gw-r/thread-69/journal/page | none observed |
| 76516b15dec0445d0000000000001830 | 112.526 | 6.864 | n/a | 0.000 | 0.000 | 0.421 | 105.025 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.189 | 6.864 | 0.061 | 0.189 | gw-r/thread-91/journal/page | none observed |
| 76516b15dec0445d000000000000031a | 110.601 | 2.678 | n/a | 0.000 | 0.000 | 0.492 | 107.354 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.067 | 2.678 | 0.024 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000c19 | 107.730 | 3.279 | n/a | 0.000 | 0.000 | 0.586 | 103.763 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.092 | 3.279 | 0.030 | 0.092 | gw-r/thread-90/journal/page | none observed |
| 76516b15dec0445d0000000000000b48 | 106.986 | 4.703 | n/a | 0.000 | 0.000 | 0.321 | 101.895 | 0.001 | n/a | 0.007 | 0.000 | n/a | n/a | 0.060 | 4.703 | 0.044 | 0.060 | gw-r/thread-86/journal/page | none observed |
| 76516b15dec0445d00000000000002d4 | 101.724 | 14.049 | n/a | 0.000 | 0.000 | 0.692 | 86.679 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.291 | 14.049 | 0.138 | 0.291 | gw-r/thread-82/journal/page | none observed |
| 76516b15dec0445d0000000000001653 | 96.524 | 9.253 | n/a | 0.000 | 0.000 | 0.417 | 86.674 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.170 | 9.253 | 0.096 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 76516b15dec0445d0000000000000760 | 95.080 | 2.744 | n/a | 0.000 | 0.000 | 0.706 | 91.536 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.067 | 2.744 | 0.029 | 0.067 | gw-r/thread-89/journal/page | none observed |
| 76516b15dec0445d00000000000009ab | 95.023 | 1.807 | n/a | 0.000 | 0.000 | 1.016 | 92.092 | 0.005 | n/a | 0.012 | 0.000 | n/a | n/a | 0.091 | 1.807 | 0.019 | 0.091 | gw-r/thread-92/journal/page | none observed |
| 76516b15dec0445d0000000000000884 | 94.938 | 4.332 | n/a | 0.000 | 0.000 | 0.353 | 90.151 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.078 | 4.332 | 0.046 | 0.078 | gw-r/thread-60/journal/page | none observed |
| 76516b15dec0445d0000000000000671 | 94.586 | 4.240 | n/a | 0.000 | 0.000 | 0.323 | 89.934 | 0.004 | n/a | 0.012 | 0.000 | n/a | n/a | 0.074 | 4.240 | 0.045 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d00000000000011c8 | 91.788 | 3.057 | n/a | 0.000 | 0.000 | 0.404 | 88.179 | 0.001 | n/a | 0.011 | 0.000 | n/a | n/a | 0.135 | 3.057 | 0.033 | 0.135 | gw-r/thread-83/journal/page | none observed |
| 76516b15dec0445d00000000000007a4 | 91.581 | 7.010 | n/a | 0.000 | 0.000 | 0.695 | 83.640 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.228 | 7.010 | 0.077 | 0.228 | gw-r/thread-47/journal/page | none observed |
| 76516b15dec0445d0000000000000b8e | 90.671 | 4.477 | n/a | 0.000 | 0.000 | 0.274 | 85.764 | 0.001 | n/a | 0.005 | 0.000 | n/a | n/a | 0.149 | 4.477 | 0.049 | 0.149 | gw-r/thread-42/journal/page | none observed |
| 76516b15dec0445d000000000000047a | 90.023 | 3.333 | n/a | 0.000 | 0.000 | 0.401 | 86.190 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 3.333 | 0.037 | 0.065 | gw-r/thread-87/journal/page | none observed |
| 76516b15dec0445d0000000000000e48 | 89.388 | 1.793 | n/a | 0.000 | 0.000 | 0.234 | 87.293 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.041 | 1.793 | 0.020 | 0.041 | gw-r/thread-83/journal/page | none observed |

## P3 / warmup / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.870 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.281 | 201.182 | 0.015 | n/a | 0.151 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 219.601 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 15.113 | 207.359 | 10.031 | n/a | 1.397 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae9000000000000000b | 219.601 | 0.000 | n/a | 0.000 | 0.000 | 15.113 | 204.208 | 0.013 | n/a | 0.141 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000007 | 210.937 | 0.000 | n/a | 0.000 | 0.000 | 3.351 | 207.311 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae9000000000000000c | 208.745 | 0.000 | n/a | 0.000 | 0.000 | 2.093 | 206.298 | 0.012 | n/a | 0.250 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae9000000000000001f | 208.699 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 207.359 | 0.011 | n/a | 0.167 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000016 | 206.836 | 0.000 | n/a | 0.000 | 0.000 | 4.726 | 201.834 | 0.017 | n/a | 0.158 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae9000000000000001e | 206.482 | 0.000 | n/a | 0.000 | 0.000 | 4.156 | 202.034 | 0.020 | n/a | 0.174 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000020 | 206.361 | 0.000 | n/a | 0.000 | 0.000 | 4.720 | 201.313 | 0.014 | n/a | 0.167 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000028 | 205.998 | 0.000 | n/a | 0.000 | 0.000 | 1.958 | 203.873 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000019 | 205.004 | 0.000 | n/a | 0.000 | 0.000 | 3.435 | 201.238 | 0.018 | n/a | 0.182 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000022 | 204.915 | 0.000 | n/a | 0.000 | 0.000 | 3.816 | 200.882 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000021 | 204.137 | 0.000 | n/a | 0.000 | 0.000 | 2.469 | 201.340 | 0.012 | n/a | 0.145 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000002b | 204.013 | 0.000 | n/a | 0.000 | 0.000 | 1.614 | 202.157 | 0.011 | n/a | 0.137 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000025 | 203.944 | 0.000 | n/a | 0.000 | 0.000 | 2.196 | 201.407 | 0.017 | n/a | 0.196 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000024 | 203.759 | 0.000 | n/a | 0.000 | 0.000 | 2.630 | 200.866 | 0.014 | n/a | 0.153 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000009 | 203.642 | 0.000 | n/a | 0.000 | 0.000 | 2.074 | 201.059 | 0.017 | n/a | 0.156 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae9000000000000002c | 203.463 | 0.000 | n/a | 0.000 | 0.000 | 1.384 | 201.401 | 0.019 | n/a | 0.539 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000002a | 203.190 | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 200.184 | 0.014 | n/a | 1.397 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae9000000000000002e | 202.908 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.403 | 0.011 | n/a | 0.138 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000014 | 202.897 | 0.000 | n/a | 0.000 | 0.000 | 1.337 | 201.241 | 0.011 | n/a | 0.135 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000011 | 202.870 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 202.009 | 0.044 | n/a | 0.196 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-64/journal/page | none observed |

## P3 / baseline / read (27 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.409 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 201.107 | 0.013 | n/a | 0.132 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 206.292 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.573 | 203.932 | 4.013 | n/a | 1.084 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae9000000000000004d | 206.292 | 0.000 | n/a | 0.000 | 0.000 | 2.573 | 202.875 | 0.031 | n/a | 0.728 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000040 | 206.126 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 201.409 | 4.013 | n/a | 0.028 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae9000000000000004b | 205.245 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 203.932 | 0.021 | n/a | 0.191 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000049 | 204.546 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 203.665 | 0.018 | n/a | 0.162 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae9000000000000004a | 204.427 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 203.304 | 0.375 | n/a | 0.184 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae90000000000000039 | 204.402 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 203.191 | 0.029 | n/a | 0.187 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000004c | 203.768 | 0.000 | n/a | 0.000 | 0.000 | 1.950 | 201.508 | 0.018 | n/a | 0.208 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000031 | 203.206 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 202.139 | 0.012 | n/a | 0.132 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae9000000000000003e | 202.643 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.699 | 0.021 | n/a | 1.084 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae9000000000000004e | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 201.211 | 0.011 | n/a | 0.180 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000033 | 202.595 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 201.093 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae9000000000000003a | 202.554 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.470 | 0.023 | n/a | 0.223 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae9000000000000002f | 202.484 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.107 | 0.013 | n/a | 0.159 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000042 | 202.409 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.254 | 0.013 | n/a | 0.140 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000043 | 202.350 | 0.000 | n/a | 0.000 | 0.000 | 1.186 | 200.908 | 0.009 | n/a | 0.103 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae9000000000000004f | 202.051 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 200.905 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae9000000000000003c | 201.901 | 0.000 | n/a | 0.000 | 0.000 | 0.553 | 201.131 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000038 | 201.890 | 0.000 | n/a | 0.000 | 0.000 | 0.456 | 201.191 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000003f | 201.887 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 200.792 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000035 | 201.825 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 201.014 | 0.015 | n/a | 0.138 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-61/journal/page | none observed |

## P3 / L1 / read (26 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.122 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.000 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 205.066 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.924 | 204.026 | 4.619 | n/a | 0.163 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae9000000000000005d | 205.066 | 0.000 | n/a | 0.000 | 0.000 | 3.924 | 200.855 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000006e | 205.040 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 204.026 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae9000000000000005a | 203.883 | 0.000 | n/a | 0.000 | 0.000 | 0.862 | 202.728 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae9000000000000006b | 203.793 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 202.285 | 0.025 | n/a | 0.138 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae9000000000000006a | 203.572 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 202.332 | 0.021 | n/a | 0.144 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae9000000000000005f | 203.474 | 0.000 | n/a | 0.000 | 0.000 | 2.017 | 201.151 | 0.031 | n/a | 0.163 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae90000000000000052 | 203.319 | 0.000 | n/a | 0.000 | 0.000 | 2.020 | 201.086 | 0.009 | n/a | 0.115 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000053 | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 1.286 | 201.461 | 0.220 | n/a | 0.136 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae90000000000000062 | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 201.319 | 0.010 | n/a | 0.113 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae9000000000000005b | 202.820 | 0.000 | n/a | 0.000 | 0.000 | 1.532 | 201.000 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000051 | 202.352 | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 200.787 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae90000000000000069 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.212 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000064 | 202.139 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 200.954 | 0.011 | n/a | 0.115 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae9000000000000005e | 202.122 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 200.968 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae9000000000000006d | 202.103 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 201.039 | 0.018 | n/a | 0.101 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae90000000000000055 | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 200.841 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae90000000000000054 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.082 | 0.033 | n/a | 0.118 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000050 | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.049 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae90000000000000060 | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.923 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000061 | 201.938 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 200.924 | 0.011 | n/a | 0.115 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.560 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.172 | 201.101 | 0.014 | n/a | 0.116 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 212.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.693 | 207.809 | 12.284 | n/a | 0.257 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae9000000000000008b | 212.009 | 0.000 | n/a | 0.000 | 0.000 | 3.950 | 207.809 | 0.014 | n/a | 0.120 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae90000000000000072 | 206.965 | 0.000 | n/a | 0.000 | 0.000 | 4.617 | 202.010 | 0.021 | n/a | 0.165 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000008e | 206.221 | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 202.098 | 2.325 | n/a | 0.175 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae9000000000000007b | 205.971 | 0.000 | n/a | 0.000 | 0.000 | 4.693 | 201.012 | 0.015 | n/a | 0.119 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae9000000000000008a | 205.628 | 0.000 | n/a | 0.000 | 0.000 | 4.370 | 201.021 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000093 | 205.210 | 0.000 | n/a | 0.000 | 0.000 | 3.396 | 201.554 | 0.011 | n/a | 0.146 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae90000000000000076 | 204.855 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 203.909 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae9000000000000007e | 204.382 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 203.359 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000074 | 203.984 | 0.000 | n/a | 0.000 | 0.000 | 1.753 | 201.813 | 0.047 | n/a | 0.257 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae90000000000000090 | 203.900 | 0.000 | n/a | 0.000 | 0.000 | 2.234 | 201.349 | 0.034 | n/a | 0.139 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000082 | 203.844 | 0.000 | n/a | 0.000 | 0.000 | 2.483 | 201.015 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000008f | 203.768 | 0.000 | n/a | 0.000 | 0.000 | 2.079 | 201.439 | 0.043 | n/a | 0.112 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000073 | 202.895 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.285 | 0.014 | n/a | 0.148 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000080 | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 1.556 | 200.832 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000084 | 202.560 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 201.800 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000070 | 202.558 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 201.069 | 0.013 | n/a | 0.122 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000079 | 202.447 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.192 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae9000000000000008d | 202.280 | 0.000 | n/a | 0.000 | 0.000 | 1.172 | 200.892 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae90000000000000075 | 202.186 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 200.981 | 0.014 | n/a | 0.116 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae90000000000000091 | 202.152 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 200.965 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-62/journal/page | none observed |

## P3 / L16 / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.771 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 201.156 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 |
| p99 | 212.633 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.563 | 206.088 | 27.333 | n/a | 3.748 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000000a7 | 212.633 | 0.000 | n/a | 0.000 | 0.000 | 6.293 | 206.088 | 0.043 | n/a | 0.090 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae90000000000000095 | 208.308 | 0.000 | n/a | 0.000 | 0.000 | 5.509 | 202.513 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae900000000000000b7 | 207.839 | 0.000 | n/a | 0.000 | 0.000 | 6.563 | 201.088 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae900000000000000bb | 206.770 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 205.609 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae900000000000000b4 | 206.555 | 0.000 | n/a | 0.000 | 0.000 | 4.130 | 202.096 | 0.058 | n/a | 0.159 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000000b8 | 204.870 | 0.000 | n/a | 0.000 | 0.000 | 3.732 | 200.932 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae900000000000000a9 | 204.833 | 0.000 | n/a | 0.000 | 0.000 | 2.873 | 199.361 | 0.021 | n/a | 2.401 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae900000000000000b0 | 204.533 | 0.000 | n/a | 0.000 | 0.000 | 3.503 | 200.764 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae900000000000000a3 | 204.366 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 203.338 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000096 | 204.254 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 199.764 | 0.017 | n/a | 3.506 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae900000000000000b2 | 204.170 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 203.181 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000000a0 | 203.931 | 0.000 | n/a | 0.000 | 0.000 | 2.523 | 201.156 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000097 | 203.657 | 0.000 | n/a | 0.000 | 0.000 | 1.445 | 201.980 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae900000000000000af | 203.539 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 202.125 | 0.012 | n/a | 0.134 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae900000000000000ae | 203.288 | 0.000 | n/a | 0.000 | 0.000 | 1.879 | 201.157 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000094 | 203.225 | 0.000 | n/a | 0.000 | 0.000 | 1.138 | 201.869 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000098 | 203.147 | 0.000 | n/a | 0.000 | 0.000 | 1.247 | 201.641 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000000bc | 202.833 | 0.000 | n/a | 0.000 | 0.000 | 1.558 | 201.082 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae900000000000000a5 | 202.771 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.495 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae900000000000000a1 | 202.766 | 0.000 | n/a | 0.000 | 0.000 | 1.326 | 201.202 | 0.014 | n/a | 0.119 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (36 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.583 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 201.130 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 212.146 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.403 | 207.286 | 0.105 | n/a | 1.169 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000000cd | 212.146 | 0.000 | n/a | 0.000 | 0.000 | 3.591 | 207.286 | 0.010 | n/a | 1.169 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000000de | 206.065 | 0.000 | n/a | 0.000 | 0.000 | 4.403 | 201.424 | 0.019 | n/a | 0.090 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae900000000000000bf | 205.956 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 205.115 | 0.011 | n/a | 0.039 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae900000000000000ca | 205.818 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 204.835 | 0.053 | n/a | 0.098 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae900000000000000da | 205.303 | 0.000 | n/a | 0.000 | 0.000 | 2.086 | 202.917 | 0.020 | n/a | 0.175 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae900000000000000c3 | 205.202 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 204.238 | 0.010 | n/a | 0.121 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae900000000000000d7 | 205.077 | 0.000 | n/a | 0.000 | 0.000 | 3.758 | 201.113 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae900000000000000c2 | 204.391 | 0.000 | n/a | 0.000 | 0.000 | 3.422 | 200.707 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae900000000000000be | 203.802 | 0.000 | n/a | 0.000 | 0.000 | 2.745 | 200.841 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae900000000000000d8 | 203.622 | 0.000 | n/a | 0.000 | 0.000 | 1.530 | 201.866 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae900000000000000cb | 203.578 | 0.000 | n/a | 0.000 | 0.000 | 2.221 | 201.130 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae900000000000000ce | 203.499 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 202.023 | 0.013 | n/a | 0.135 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae900000000000000df | 203.180 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 202.265 | 0.020 | n/a | 0.125 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae900000000000000d4 | 203.108 | 0.000 | n/a | 0.000 | 0.000 | 1.740 | 201.108 | 0.014 | n/a | 0.141 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae900000000000000d2 | 202.919 | 0.000 | n/a | 0.000 | 0.000 | 1.552 | 201.079 | 0.009 | n/a | 0.116 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae900000000000000e2 | 202.756 | 0.000 | n/a | 0.000 | 0.000 | 1.329 | 201.188 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae900000000000000d6 | 202.693 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 201.716 | 0.105 | n/a | 0.127 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae900000000000000c5 | 202.678 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 201.490 | 0.014 | n/a | 0.116 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae900000000000000c9 | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.387 | 0.013 | n/a | 0.134 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae900000000000000d5 | 202.551 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 201.366 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-74/journal/page | none observed |

## P3 / L256 / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.157 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 201.008 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 215.343 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.815 | 214.422 | 4.418 | n/a | 0.164 | 0.000 | n/a | n/a | 1.022 | 0.000 | 0.000 | 1.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000000f8 | 215.343 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 214.422 | 0.017 | n/a | 0.073 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000000f6 | 210.947 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 209.963 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae9000000000000010d | 206.934 | 0.000 | n/a | 0.000 | 0.000 | 5.722 | 201.020 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae900000000000000ef | 205.143 | 0.000 | n/a | 0.000 | 0.000 | 3.928 | 201.017 | 0.006 | n/a | 0.085 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000107 | 204.708 | 0.000 | n/a | 0.000 | 0.000 | 3.294 | 201.180 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000000f4 | 204.395 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 203.594 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae900000000000000ee | 204.276 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 203.458 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae90000000000000105 | 204.100 | 0.000 | n/a | 0.000 | 0.000 | 2.882 | 200.970 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae900000000000000fe | 203.571 | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 202.278 | 0.022 | n/a | 0.090 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae900000000000000fa | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.294 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 1.022 | 0.000 | 0.000 | 1.022 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae900000000000000fb | 203.041 | 0.000 | n/a | 0.000 | 0.000 | 1.440 | 201.409 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae900000000000000e7 | 202.843 | 0.000 | n/a | 0.000 | 0.000 | 1.268 | 201.252 | 0.012 | n/a | 0.134 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae900000000000000f7 | 202.437 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 201.088 | 0.006 | n/a | 0.092 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae900000000000000e6 | 202.419 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 201.010 | 0.009 | n/a | 0.099 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae900000000000000eb | 202.413 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 201.530 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae900000000000000fd | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 201.323 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae900000000000000e5 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 201.173 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae900000000000000ec | 202.189 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.145 | 0.021 | n/a | 0.135 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000000ed | 202.174 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 201.087 | 0.014 | n/a | 0.164 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000108 | 202.157 | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 200.802 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-65/journal/page | none observed |

## P3 / L1024 / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.274 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 200.948 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 209.822 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.906 | 206.446 | 11.912 | n/a | 0.487 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae9000000000000011d | 209.822 | 0.000 | n/a | 0.000 | 0.000 | 1.318 | 196.442 | 11.912 | n/a | 0.030 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000012a | 207.244 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 206.446 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae90000000000000135 | 206.619 | 0.000 | n/a | 0.000 | 0.000 | 5.906 | 200.563 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae9000000000000011a | 205.869 | 0.000 | n/a | 0.000 | 0.000 | 4.566 | 201.026 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae90000000000000133 | 205.255 | 0.000 | n/a | 0.000 | 0.000 | 4.121 | 200.866 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae90000000000000130 | 205.019 | 0.000 | n/a | 0.000 | 0.000 | 3.896 | 200.958 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae9000000000000011e | 204.942 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 203.786 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000129 | 204.895 | 0.000 | n/a | 0.000 | 0.000 | 1.235 | 203.429 | 0.024 | n/a | 0.070 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae90000000000000114 | 204.666 | 0.000 | n/a | 0.000 | 0.000 | 1.754 | 202.665 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000124 | 203.681 | 0.000 | n/a | 0.000 | 0.000 | 2.634 | 200.809 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae90000000000000119 | 203.255 | 0.000 | n/a | 0.000 | 0.000 | 2.172 | 200.903 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000110 | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 202.183 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000136 | 202.976 | 0.000 | n/a | 0.000 | 0.000 | 1.759 | 200.974 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000121 | 202.967 | 0.000 | n/a | 0.000 | 0.000 | 1.257 | 201.029 | 0.006 | n/a | 0.487 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae9000000000000012e | 202.564 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.310 | 0.031 | n/a | 0.097 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae9000000000000012b | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 201.064 | 0.006 | n/a | 0.277 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae9000000000000011f | 202.457 | 0.000 | n/a | 0.000 | 0.000 | 1.048 | 201.214 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000137 | 202.287 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.177 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae9000000000000012c | 202.282 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 201.483 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae9000000000000011c | 202.274 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.386 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-62/journal/page | none observed |

## P3 / recovery / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.877 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.806 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 215.128 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.676 | 214.198 | 4.768 | n/a | 3.719 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae90000000000000157 | 215.128 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 214.198 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000153 | 206.637 | 0.000 | n/a | 0.000 | 0.000 | 5.676 | 200.798 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000159 | 206.393 | 0.000 | n/a | 0.000 | 0.000 | 4.528 | 201.698 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae9000000000000015d | 205.184 | 0.000 | n/a | 0.000 | 0.000 | 3.747 | 201.248 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000014f | 205.070 | 0.000 | n/a | 0.000 | 0.000 | 1.346 | 203.554 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000150 | 203.191 | 0.000 | n/a | 0.000 | 0.000 | 1.717 | 201.206 | 0.022 | n/a | 0.122 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae9000000000000013b | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 202.163 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae90000000000000142 | 202.710 | 0.000 | n/a | 0.000 | 0.000 | 1.695 | 200.831 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae9000000000000014b | 202.434 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.201 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae90000000000000158 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 1.549 | 200.706 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae9000000000000013d | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 200.950 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae90000000000000154 | 202.296 | 0.000 | n/a | 0.000 | 0.000 | 1.293 | 200.779 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000014a | 202.252 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 200.928 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae9000000000000014d | 202.021 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 200.783 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae9000000000000015e | 201.993 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 200.966 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae90000000000000139 | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 201.005 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000144 | 201.911 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 200.951 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000151 | 201.906 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 201.019 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae90000000000000146 | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 201.091 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae9000000000000015f | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 201.069 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-66/journal/page | none observed |

## P3 / p4mix / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.655 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 200.744 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 205.180 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.069 | 201.764 | 2.129 | n/a | 0.084 | 0.000 | n/a | n/a | 0.298 | 0.000 | 0.000 | 0.298 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae90000000000000164 | 205.180 | 0.000 | n/a | 0.000 | 0.000 | 4.069 | 200.934 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000179 | 204.471 | 0.000 | n/a | 0.000 | 0.000 | 3.297 | 200.948 | 0.017 | n/a | 0.063 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae90000000000000170 | 204.232 | 0.000 | n/a | 0.000 | 0.000 | 2.969 | 201.109 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000162 | 202.734 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.764 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae9000000000000016c | 202.717 | 0.000 | n/a | 0.000 | 0.000 | 1.559 | 200.996 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae90000000000000167 | 202.405 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 201.437 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae90000000000000166 | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 1.353 | 200.803 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae90000000000000161 | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 201.030 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae9000000000000016d | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 200.939 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae9000000000000017d | 202.070 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.140 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000165 | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 200.816 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae90000000000000168 | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 201.277 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000181 | 201.966 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 200.920 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae90000000000000184 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 200.805 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000180 | 201.913 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.711 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae90000000000000163 | 201.854 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 200.744 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000185 | 201.779 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 201.096 | 0.005 | n/a | 0.071 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae9000000000000016f | 201.746 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 200.875 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-72/journal/page | none observed |
| 58f017b7497f3ae90000000000000178 | 201.697 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.750 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000160 | 201.655 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 200.681 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-68/journal/page | none observed |

## P3 / p4h1 / read (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.638 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 200.703 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 204.353 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.539 | 201.111 | 7.713 | n/a | 0.069 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000001a5 | 204.353 | 0.000 | n/a | 0.000 | 0.000 | 3.539 | 200.631 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae9000000000000019a | 204.186 | 0.000 | n/a | 0.000 | 0.000 | 3.299 | 200.730 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae900000000000001a3 | 203.538 | 0.000 | n/a | 0.000 | 0.000 | 2.687 | 200.696 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000199 | 202.674 | 0.000 | n/a | 0.000 | 0.000 | 1.618 | 200.890 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae90000000000000193 | 202.196 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 200.911 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000019b | 202.138 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.900 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000197 | 202.040 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 201.111 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae900000000000001ac | 202.004 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 200.881 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae90000000000000191 | 201.969 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 200.736 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae900000000000001b5 | 201.912 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 201.016 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000196 | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.960 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae900000000000001a9 | 201.882 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.953 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae900000000000001aa | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 200.939 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000192 | 201.792 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 200.703 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae9000000000000018c | 201.774 | 0.000 | n/a | 0.000 | 0.000 | 0.714 | 200.899 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000001a1 | 201.701 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.782 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae900000000000001a2 | 201.696 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.748 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae900000000000001ab | 201.647 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.721 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae9000000000000019c | 201.644 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 200.784 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae9000000000000018e | 201.638 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 200.521 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-60/journal/page | none observed |

## P3 / grow3 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.915 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.358 | 55.453 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 66.408 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 60.467 | 5.474 | n/a | 0.031 | 0.000 | n/a | n/a | 50.554 | 0.000 | 0.000 | 50.554 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000001b7 | 66.408 | 0.000 | n/a | 0.000 | 0.000 | 0.358 | 60.467 | 5.474 | n/a | 0.011 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae900000000000001c2 | 58.943 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 58.108 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae900000000000001c6 | 57.915 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 55.453 | 1.711 | n/a | 0.016 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae900000000000001cb | 50.756 | 0.000 | n/a | 0.000 | 0.000 | 0.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.554 | 0.000 | 0.000 | 50.554 | node-14/thread-9/socket.wait-first-byte | none observed |

## P3 / p4h3 / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.480 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 200.703 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 204.938 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.146 | 204.222 | 5.518 | n/a | 0.098 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000001f9 | 204.938 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 204.222 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000217 | 204.923 | 0.000 | n/a | 0.000 | 0.000 | 4.146 | 200.567 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae90000000000000219 | 204.224 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 203.594 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae90000000000000212 | 204.123 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 203.069 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000207 | 202.771 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 201.932 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae900000000000001fc | 202.548 | 0.000 | n/a | 0.000 | 0.000 | 1.236 | 201.094 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000020c | 202.248 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 200.988 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000001fd | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 200.875 | 0.005 | n/a | 0.098 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae9000000000000021a | 202.010 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 200.856 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae9000000000000021b | 201.974 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 201.182 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae9000000000000020b | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 201.023 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae900000000000001fb | 201.752 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.877 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae900000000000001f6 | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.708 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae90000000000000209 | 201.677 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.738 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae900000000000001f5 | 201.611 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 200.678 | 0.005 | n/a | 0.076 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae9000000000000020e | 201.595 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 200.917 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000205 | 201.590 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 200.594 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae9000000000000021c | 201.574 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 200.711 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae90000000000000208 | 201.480 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 200.773 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae90000000000000206 | 201.477 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 200.628 | 0.012 | n/a | 0.041 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-42/journal/page | none observed |

## P3 / p4h10 / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.542 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.682 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 203.761 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.861 | 202.148 | 5.677 | n/a | 0.103 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae900000000000002fc | 203.761 | 0.000 | n/a | 0.000 | 0.000 | 2.861 | 200.733 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-74/journal/page | none observed |
| 58f017b7497f3ae900000000000002ff | 202.783 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 202.148 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae900000000000002ea | 202.184 | 0.000 | n/a | 0.000 | 0.000 | 1.369 | 200.591 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000002d8 | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.136 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae900000000000002e6 | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 201.103 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae900000000000002db | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 200.908 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000002f6 | 201.937 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 201.103 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000002eb | 201.932 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 200.871 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae900000000000002f5 | 201.881 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 200.866 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae900000000000002e5 | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 200.849 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae900000000000002fa | 201.837 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 200.936 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae900000000000002e4 | 201.790 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 200.669 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae900000000000002dd | 201.764 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 200.889 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae900000000000002dc | 201.732 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.761 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000002f7 | 201.711 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.812 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae900000000000002e8 | 201.705 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.877 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae900000000000002ed | 201.686 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 200.952 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-60/journal/page | none observed |
| 58f017b7497f3ae900000000000002ec | 201.669 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 200.943 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae900000000000002fd | 201.566 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 200.907 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae900000000000002fb | 201.542 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 200.575 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-68/journal/page | none observed |

## P3 / presweep / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.681 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 200.757 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 |
| p99 | 217.592 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 16.178 | 203.936 | 0.021 | n/a | 0.120 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae90000000000000317 | 217.592 | 0.000 | n/a | 0.000 | 0.000 | 16.178 | 201.176 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000306 | 205.801 | 0.000 | n/a | 0.000 | 0.000 | 1.625 | 203.936 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 58f017b7497f3ae90000000000000300 | 204.615 | 0.000 | n/a | 0.000 | 0.000 | 1.720 | 202.710 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae90000000000000309 | 204.497 | 0.000 | n/a | 0.000 | 0.000 | 2.936 | 201.321 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000311 | 204.198 | 0.000 | n/a | 0.000 | 0.000 | 2.876 | 201.073 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae90000000000000307 | 202.821 | 0.000 | n/a | 0.000 | 0.000 | 1.941 | 200.719 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000031d | 202.694 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 201.543 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae90000000000000322 | 202.280 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.515 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae9000000000000030f | 202.215 | 0.000 | n/a | 0.000 | 0.000 | 1.233 | 200.734 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000302 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.157 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae90000000000000305 | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 200.892 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000303 | 201.987 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 201.190 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-73/journal/page | none observed |
| 58f017b7497f3ae9000000000000031c | 201.974 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.914 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 58f017b7497f3ae9000000000000030a | 201.901 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 200.678 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-42/journal/page | none observed |
| 58f017b7497f3ae9000000000000031e | 201.874 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 200.897 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-68/journal/page | none observed |
| 58f017b7497f3ae9000000000000030b | 201.784 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 200.881 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-64/journal/page | none observed |
| 58f017b7497f3ae9000000000000030e | 201.774 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 200.906 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-62/journal/page | none observed |
| 58f017b7497f3ae9000000000000031b | 201.769 | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 200.777 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-66/journal/page | none observed |
| 58f017b7497f3ae9000000000000030c | 201.751 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.769 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 58f017b7497f3ae90000000000000320 | 201.681 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 200.954 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (168 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.729 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.442 | 61.678 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 140.325 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.364 | 139.255 | 1.884 | n/a | 0.136 | 0.000 | n/a | n/a | 60.246 | 0.000 | 0.000 | 60.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 58f017b7497f3ae90000000000000ec2 | 140.685 | 0.000 | n/a | 0.000 | 0.000 | 1.277 | 139.255 | 0.001 | n/a | 0.010 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-88/journal/page | none observed |
| 58f017b7497f3ae90000000000000979 | 140.325 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 139.532 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-44/journal/page | none observed |
| 58f017b7497f3ae90000000000000c67 | 123.489 | 0.000 | n/a | 0.000 | 0.000 | 0.345 | 123.034 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-83/journal/page | none observed |
| 58f017b7497f3ae90000000000000687 | 117.255 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 116.537 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-84/journal/page | none observed |
| 58f017b7497f3ae90000000000000473 | 107.209 | 0.000 | n/a | 0.000 | 0.000 | 0.380 | 106.647 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-67/journal/page | none observed |
| 58f017b7497f3ae9000000000000038e | 106.453 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 105.369 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-86/journal/page | none observed |
| 58f017b7497f3ae900000000000007f0 | 105.398 | 0.000 | n/a | 0.000 | 0.000 | 0.403 | 104.885 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-91/journal/page | none observed |
| 58f017b7497f3ae90000000000000df2 | 104.312 | 0.000 | n/a | 0.000 | 0.000 | 0.252 | 85.589 | 0.002 | n/a | 18.368 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-82/journal/page | none observed |
| 58f017b7497f3ae90000000000000789 | 103.484 | 0.000 | n/a | 0.000 | 0.000 | 0.394 | 102.956 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-84/journal/page | none observed |
| 58f017b7497f3ae90000000000000d00 | 94.019 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 93.411 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 58f017b7497f3ae90000000000000900 | 92.891 | 0.000 | n/a | 0.000 | 0.000 | 0.247 | 92.540 | 0.009 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 0.000 | 0.000 | 0.063 | gw-r/thread-77/journal/page | none observed |
| 58f017b7497f3ae90000000000000aba | 92.441 | 0.000 | n/a | 0.000 | 0.000 | 0.532 | 91.774 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae9000000000000062d | 92.368 | 0.000 | n/a | 0.000 | 0.000 | 0.427 | 91.754 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-69/journal/page | none observed |
| 58f017b7497f3ae9000000000000059e | 92.289 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 91.563 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-63/journal/page | none observed |
| 58f017b7497f3ae900000000000006bd | 92.251 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 91.473 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-65/journal/page | none observed |
| 58f017b7497f3ae9000000000000036c | 91.715 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 91.123 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-61/journal/page | none observed |
| 58f017b7497f3ae9000000000000052c | 90.146 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 89.410 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-77/journal/page | none observed |
| 58f017b7497f3ae90000000000000785 | 88.907 | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 88.307 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae900000000000009ca | 87.842 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 87.097 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 58f017b7497f3ae90000000000000438 | 86.171 | 0.000 | n/a | 0.000 | 0.000 | 0.284 | 85.791 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3390 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.307 ms; post-ACK p50/p99: 0.352/1.802 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.148 | 9.663 | 9.472 | reported |
| All-primary p99 ms | 51.088 | 50.111 | 48.956 | <=50 |
| L256 5-10 p50Ms | 17.919 | 17.407 | 17.407 | <=10 |
| L256 5-10 p99Ms | 122.453 | 122.009 | 122.008 | <=50 |
| L256 11-25 p50Ms | 20.479 | 19.967 | 19.967 | <=10 |
| L256 11-25 p99Ms | 24.019 | 23.280 | 23.275 | <=50 |
| L256 26-50 p50Ms | 26.325 | 25.079 | 25.077 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 26.325 | 25.079 | 25.077 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.575 | 8.255 | 8.127 | <=10 |
| Burst 11-25 p50 ms | 10.943 | 10.431 | 10.175 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 122.453 | 122.009 | 122.008 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 94.446 | 93.896 | 93.892 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 7 | 27.654/61.597 | 26.633 | 17.326 | 30.901 | 0.087/0.045 |
| 5-10 | >=1000 | 26 | 17.135/108.428 | 16.555 | 11.484 | 25.445 | 0.061/0.026 |
| 5-10 | 250-1000 | 27 | 19.501/122.398 | 19.064 | 14.443 | 32.465 | 0.065/0.020 |
| 11-25 | 250-1000 | 17 | 20.388/92.986 | 19.808 | 13.822 | 34.334 | 0.072/0.022 |
| 5-10 | 100-250 | 14 | 13.789/36.261 | 13.239 | 8.283 | 14.173 | 0.061/0.020 |
| 11-25 | >=1000 | 12 | 23.927/175.473 | 23.216 | 16.533 | 40.072 | 0.072/0.021 |
| 26-50 | 250-1000 | 7 | 25.073/42.972 | 24.229 | 17.576 | 39.381 | 0.086/0.020 |
| 11-25 | 100-250 | 6 | 20.938/108.538 | 20.113 | 14.997 | 33.104 | 0.070/0.020 |
| 11-25 | 0-50 | 557 | 9.875/30.168 | 9.269 | 5.148 | 12.960 | 0.046/0.017 |
| 5-10 | 0-50 | 1188 | 7.866/23.976 | 7.519 | 4.320 | 10.709 | 0.040/0.016 |
| 26-50 | overlap | 127 | 14.334/39.592 | 13.669 | 8.038 | 18.880 | 0.044/0.017 |
| 5-10 | 50-100 | 63 | 7.818/26.255 | 7.548 | 4.391 | 10.605 | 0.046/0.016 |
| 11-25 | 50-100 | 38 | 11.572/36.941 | 11.133 | 6.508 | 15.888 | 0.059/0.017 |
| 5-10 | overlap | 731 | 9.593/34.087 | 9.258 | 5.804 | 12.898 | 0.033/0.015 |
| 11-25 | overlap | 345 | 11.591/62.415 | 11.037 | 6.865 | 16.064 | 0.037/0.015 |
| 26-50 | 0-50 | 210 | 13.523/36.177 | 12.463 | 6.812 | 17.540 | 0.056/0.018 |
| 26-50 | 50-100 | 15 | 13.607/17.136 | 12.497 | 6.970 | 17.342 | 0.085/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 132 | 19 | 2164.646 |
| burst | 3255 | 15 | 1003.615 |
| growth | 3 | 0 | 0.000 |

## Writer heap, GC and scheduler stalls

Source baae1e0a4188a0371f72c4167fe7fef47ed6ad1c; 3390 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 140.217 / 310.638 |
| GC events / total duration / maximum ms | 702 / 987.484 / 15.540 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":680,"4":11,"8":11} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 51.088 / 34 / 3168.261 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
