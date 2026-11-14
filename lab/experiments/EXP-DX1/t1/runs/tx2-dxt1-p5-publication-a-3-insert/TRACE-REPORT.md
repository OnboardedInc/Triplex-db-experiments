# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (82.823 ms, trace `1a33321f4e326b0f0000000000001184`); `node-14/thread-0/driver.queue.subject` (80.240 ms, trace `1a33321f4e326b0f0000000000000382`); `node-14/thread-0/driver.queue.subject` (78.731 ms, trace `1a33321f4e326b0f000000000000118e`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (118.137 ms, trace `1a33321f4e326b0f000000000000013e`); `gw-w/thread-44/gateway.admitted-work` (129.578 ms, trace `1a33321f4e326b0f0000000000000219`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-publication-a-3-insert`; source `f9af2506c70dcb8d0320436b5dee5dadd9f024d9`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6891381.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 211 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13472.670 | 597.123 | 12.068 | 308 |
| L1 | 0 | 19969.708 | 414.980 | 18.445 | 462 |
| L4 | 0 | 19964.630 | 394.123 | 11.565 | 426 |
| L16 | 0 | 19959.123 | 389.548 | 10.290 | 474 |
| L64 | 0 | 19977.421 | 425.286 | 14.253 | 610 |
| L256 | 0 | 19944.291 | 519.859 | 12.896 | 472 |
| L1024 | 0 | 19974.777 | 3900.882 | 45.587 | 12035 |
| tail | 0 | 64542.295 | 11259.690 | 88.900 | 37402 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 1a33321f4e326b0f0000000000001184 | driver.queue.scheduler-late | 6.481 | none | 2 / 32 |
| 1a33321f4e326b0f0000000000001184 | driver.queue.scheduler-dispatch | 0.010 | none | 2 / 32 |

Observed active steps while trace 1a33321f4e326b0f0000000000001184 waited: []

| 1a33321f4e326b0f0000000000000382 | driver.queue.subject | 80.240 | 1a33321f4e326b0f0000000000000381 | 2 / 32 |
| 1a33321f4e326b0f0000000000000382 | driver.queue.scheduler-late | 0.205 | none | 2 / 32 |
| 1a33321f4e326b0f0000000000000382 | driver.queue.scheduler-dispatch | 0.150 | none | 5 / 32 |

Observed active steps while trace 1a33321f4e326b0f0000000000000382 waited: [{"at":1794633278237.852,"inFlight":4,"capacity":32,"active":[{"traceId":"1a33321f4e326b0f0000000000000380","step":"rpc.probe.transact"},{"traceId":"1a33321f4e326b0f0000000000000381","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000000383","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000000384","step":"client.http"}]},{"at":1794633278273.9902,"inFlight":5,"capacity":32,"active":[{"traceId":"1a33321f4e326b0f0000000000000380","step":"rpc.probe.transact"},{"traceId":"1a33321f4e326b0f0000000000000381","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000000383","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000000384","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000000385","step":"client.http"}]}]

| 1a33321f4e326b0f000000000000118e | driver.queue.subject | 78.731 | 1a33321f4e326b0f000000000000118d | 4 / 32 |
| 1a33321f4e326b0f000000000000118e | driver.queue.scheduler-late | 20.305 | none | 4 / 32 |
| 1a33321f4e326b0f000000000000118e | driver.queue.scheduler-dispatch | 0.887 | none | 8 / 32 |

Observed active steps while trace 1a33321f4e326b0f000000000000118e waited: [{"at":1794633310612.646,"inFlight":6,"capacity":32,"active":[{"traceId":"1a33321f4e326b0f0000000000001184","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000001189","step":"client.http"},{"traceId":"1a33321f4e326b0f000000000000118c","step":"client.http"},{"traceId":"1a33321f4e326b0f000000000000118d","step":"client.http"},{"traceId":"1a33321f4e326b0f000000000000118f","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000001190","step":"client.http"}]},{"at":1794633310643.7573,"inFlight":7,"capacity":32,"active":[{"traceId":"1a33321f4e326b0f0000000000001184","step":"client.http"},{"traceId":"1a33321f4e326b0f000000000000118c","step":"client.http"},{"traceId":"1a33321f4e326b0f000000000000118d","step":"client.http"},{"traceId":"1a33321f4e326b0f000000000000118f","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000001190","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000001192","step":"client.http"},{"traceId":"1a33321f4e326b0f0000000000001193","step":"client.http"}]}]

| 1a33321f4e326b0f000000000000013e | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |
| 1a33321f4e326b0f000000000000013e | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 1a33321f4e326b0f000000000000013e waited: []

| 1a33321f4e326b0f0000000000000219 | driver.queue.scheduler-dispatch | 0.105 | none | 0 / 32 |
| 1a33321f4e326b0f0000000000000219 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 1a33321f4e326b0f0000000000000219 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.413 | 0.736 | 0.000 | 1.517 | 6.043 | 0.022 | 0.000 | 0.218 | 1.609 | 8.027 | 0.076 | n/a | 0.524 | 16.826 | n/a | n/a | 0.063 | 7.135 | 0.206 | 0.063 |
| p99 | 127.255 | 4.756 | 0.120 | 5.384 | 23.773 | 5.105 | 3.859 | 1.238 | 4.187 | 61.815 | 2.224 | n/a | 6.958 | 71.376 | n/a | n/a | 0.464 | 24.633 | 0.380 | 0.464 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f00000000000000f4 | 127.255 | 23.773 | 0.692 | 0.000 | 0.168 | 2.708 | 21.297 | 0.204 | n/a | 6.958 | 71.376 | n/a | n/a | 0.080 | 24.633 | 0.194 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000010c | 101.151 | 8.684 | 0.353 | 0.000 | 0.071 | 1.734 | 61.815 | 0.147 | n/a | 3.534 | 24.741 | n/a | n/a | 0.072 | 9.108 | 0.090 | 0.072 | gw-w/thread-48/gateway.admitted-work | none observed |
| 1a33321f4e326b0f00000000000000f8 | 60.510 | 5.990 | 0.554 | 0.000 | 0.106 | 2.451 | 18.425 | 2.224 | n/a | 3.478 | 27.181 | n/a | n/a | 0.100 | 6.651 | 0.110 | 0.100 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000104 | 57.444 | 7.801 | 0.443 | 1.788 | 0.149 | 2.988 | 15.681 | 0.094 | n/a | 0.165 | 28.155 | n/a | n/a | 0.180 | 10.181 | 0.177 | 0.180 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000fe | 54.958 | 6.434 | 5.105 | 0.000 | 0.091 | 2.555 | 13.358 | 0.070 | n/a | 0.163 | 27.095 | n/a | n/a | 0.087 | 11.630 | 0.212 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.445ms |
| 1a33321f4e326b0f0000000000000106 | 48.020 | 7.577 | 0.208 | 0.000 | 0.218 | 2.542 | 12.634 | 0.098 | n/a | 0.530 | 24.170 | n/a | n/a | 0.044 | 8.002 | 0.167 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000011a | 46.290 | 5.489 | 0.323 | 0.348 | 0.178 | 1.766 | 9.153 | 0.218 | n/a | 0.207 | 28.511 | n/a | n/a | 0.097 | 6.339 | 0.137 | 0.097 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000116 | 46.157 | 6.007 | 0.795 | 0.254 | 0.079 | 3.022 | 11.581 | 0.097 | n/a | 1.356 | 22.923 | n/a | n/a | 0.045 | 7.135 | 0.155 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000010e | 43.563 | 5.287 | 0.513 | 0.462 | 0.207 | 1.902 | 22.559 | 0.070 | n/a | 0.861 | 11.623 | n/a | n/a | 0.079 | 6.469 | 0.148 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000f0 | 42.201 | 12.771 | 0.011 | 0.000 | 1.034 | 1.281 | 10.663 | 0.091 | n/a | 0.140 | 15.745 | n/a | n/a | 0.464 | 13.817 | 0.327 | 0.464 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000122 | 41.330 | 6.755 | 0.349 | 0.262 | 0.079 | 1.524 | 9.775 | 0.207 | n/a | 1.071 | 21.254 | n/a | n/a | 0.054 | 7.446 | 0.180 | 0.054 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000011e | 41.139 | 4.579 | 0.248 | 0.285 | 0.134 | 1.257 | 15.656 | 0.138 | n/a | 0.460 | 18.312 | n/a | n/a | 0.071 | 5.245 | 0.128 | 0.071 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000110 | 40.976 | 7.167 | 0.495 | 0.000 | 0.128 | 2.618 | 8.027 | 0.051 | n/a | 0.455 | 21.972 | n/a | n/a | 0.063 | 7.790 | 0.190 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000fc | 39.507 | 6.604 | 0.728 | 0.000 | 0.092 | 2.560 | 12.221 | 0.050 | n/a | 0.493 | 16.709 | n/a | n/a | 0.050 | 7.423 | 0.188 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000128 | 39.413 | 4.512 | 0.387 | 0.248 | 0.176 | 1.392 | 11.553 | 0.109 | n/a | 0.087 | 20.874 | n/a | n/a | 0.075 | 5.323 | 0.135 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000ff | 35.720 | 8.546 | 0.019 | 2.141 | 1.238 | 1.361 | 2.247 | 0.099 | n/a | 0.268 | 19.589 | n/a | n/a | 0.213 | 11.944 | 0.334 | 0.213 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000118 | 32.609 | 7.012 | 0.009 | 3.700 | 1.081 | 0.892 | 2.292 | 0.046 | n/a | 0.527 | 17.004 | n/a | n/a | 0.047 | 11.801 | 0.362 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000101 | 32.470 | 7.749 | 0.011 | 3.859 | 0.725 | 1.154 | 1.938 | 0.044 | n/a | 0.112 | 16.826 | n/a | n/a | 0.053 | 12.344 | 0.380 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000107 | 31.755 | 7.270 | 0.007 | 3.315 | 1.209 | 0.863 | 1.768 | 0.043 | n/a | 3.811 | 13.415 | n/a | n/a | 0.054 | 11.801 | 0.372 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000fa | 29.431 | 5.677 | 0.007 | 0.000 | 1.030 | 1.736 | 6.289 | 0.076 | n/a | 0.561 | 13.955 | n/a | n/a | 0.100 | 6.714 | 0.228 | 0.100 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.556 | 0.841 | 0.000 | 1.939 | 4.571 | 0.007 | 0.000 | 0.593 | 1.394 | 2.325 | 0.062 | n/a | 0.524 | 11.840 | n/a | n/a | 0.062 | 5.368 | 0.248 | 0.062 |
| p99 | 35.720 | 2.674 | 0.120 | 3.478 | 8.546 | 0.022 | 2.141 | 1.238 | 4.187 | 6.289 | 0.099 | n/a | 4.084 | 19.589 | n/a | n/a | 0.213 | 11.944 | 0.334 | 0.213 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f00000000000000ff | 35.720 | 8.546 | 0.019 | 2.141 | 1.238 | 1.361 | 2.247 | 0.099 | n/a | 0.268 | 19.589 | n/a | n/a | 0.213 | 11.944 | 0.334 | 0.213 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000fa | 29.431 | 5.677 | 0.007 | 0.000 | 1.030 | 1.736 | 6.289 | 0.076 | n/a | 0.561 | 13.955 | n/a | n/a | 0.100 | 6.714 | 0.228 | 0.100 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000123 | 29.343 | 6.125 | 0.022 | 0.000 | 1.135 | 1.609 | 2.928 | 0.097 | n/a | 4.084 | 13.260 | n/a | n/a | 0.082 | 7.283 | 0.248 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000113 | 26.083 | 4.335 | 0.006 | 0.000 | 1.027 | 4.187 | 2.019 | 0.062 | n/a | 0.138 | 14.247 | n/a | n/a | 0.062 | 5.368 | 0.206 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000011f | 21.556 | 4.073 | 0.006 | 0.000 | 0.380 | 0.932 | 4.154 | 0.038 | n/a | 0.091 | 11.840 | n/a | n/a | 0.042 | 4.459 | 0.207 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000000f6 | 20.460 | 4.571 | 0.007 | 0.000 | 0.360 | 1.041 | 2.590 | 0.058 | n/a | 0.524 | 11.142 | n/a | n/a | 0.168 | 4.938 | 0.241 | 0.168 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000011b | 18.511 | 4.254 | 0.008 | 0.000 | 0.512 | 1.516 | 1.569 | 0.051 | n/a | 0.106 | 10.455 | n/a | n/a | 0.042 | 4.774 | 0.258 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000111 | 18.454 | 5.237 | 0.007 | 0.000 | 0.593 | 1.394 | 1.884 | 0.062 | n/a | 0.872 | 8.357 | n/a | n/a | 0.049 | 5.837 | 0.316 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000126 | 18.152 | 4.515 | 0.008 | 0.000 | 0.349 | 1.096 | 2.325 | 0.083 | n/a | 0.875 | 8.858 | n/a | n/a | 0.042 | 4.873 | 0.268 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.148 | 0.000 | 0.000 | 0.395 | 4.090 | 0.207 | 0.000 | 0.113 | 1.712 | 12.192 | 0.057 | n/a | 0.154 | 15.566 | n/a | n/a | 0.057 | 4.410 | 0.129 | 0.057 |
| p99 | 34.148 | 0.000 | 0.000 | 0.395 | 4.090 | 0.207 | 0.000 | 0.113 | 1.712 | 12.192 | 0.057 | n/a | 0.154 | 15.566 | n/a | n/a | 0.057 | 4.410 | 0.129 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f000000000000012a | 34.148 | 4.090 | 0.207 | 0.000 | 0.113 | 1.712 | 12.192 | 0.057 | n/a | 0.154 | 15.566 | n/a | n/a | 0.057 | 4.410 | 0.129 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.123 | 0.495 | 0.000 | 1.086 | 4.465 | 0.016 | 0.000 | 0.133 | 1.509 | 5.017 | 0.062 | n/a | 0.427 | 14.920 | n/a | n/a | 0.047 | 5.299 | 0.188 | 0.047 |
| p99 | 150.087 | 5.536 | 0.052 | 9.059 | 15.705 | 0.435 | 3.070 | 5.424 | 11.195 | 22.529 | 0.455 | n/a | 3.960 | 118.137 | n/a | n/a | 0.098 | 18.935 | 0.494 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f000000000000013e | 150.087 | 6.779 | 0.196 | 0.429 | 0.071 | 2.068 | 22.194 | 0.067 | n/a | 0.101 | 118.137 | n/a | n/a | 0.045 | 7.475 | 0.050 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000012c | 51.869 | 6.258 | 0.298 | 0.391 | 0.133 | 2.170 | 22.529 | 0.122 | n/a | 2.860 | 17.040 | n/a | n/a | 0.069 | 7.079 | 0.136 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000138 | 48.706 | 4.232 | 0.344 | 0.491 | 0.079 | 1.628 | 11.469 | 0.161 | n/a | 0.247 | 29.998 | n/a | n/a | 0.058 | 5.146 | 0.106 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000012e | 46.761 | 4.309 | 0.292 | 0.259 | 0.128 | 1.509 | 16.548 | 0.066 | n/a | 0.127 | 23.469 | n/a | n/a | 0.054 | 4.989 | 0.107 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000146 | 46.740 | 6.769 | 0.171 | 0.000 | 0.068 | 1.297 | 9.806 | 0.043 | n/a | 2.206 | 26.342 | n/a | n/a | 0.040 | 7.008 | 0.150 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000171 | 46.163 | 6.207 | 0.381 | 0.000 | 0.061 | 2.092 | 11.134 | 0.162 | n/a | 0.392 | 25.680 | n/a | n/a | 0.054 | 6.649 | 0.144 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000135 | 44.049 | 4.558 | 0.184 | 0.509 | 0.090 | 1.281 | 7.387 | 0.047 | n/a | 3.960 | 25.987 | n/a | n/a | 0.046 | 5.340 | 0.121 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000014e | 43.205 | 15.705 | 0.012 | 2.091 | 1.126 | 1.349 | 1.815 | 0.105 | n/a | 0.129 | 20.807 | n/a | n/a | 0.065 | 18.935 | 0.438 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000016b | 40.256 | 5.428 | 0.246 | 0.000 | 0.048 | 1.335 | 10.422 | 0.048 | n/a | 0.146 | 22.525 | n/a | n/a | 0.058 | 5.722 | 0.142 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000133 | 38.794 | 5.965 | 0.010 | 0.000 | 0.963 | 0.909 | 1.253 | 0.038 | n/a | 0.854 | 28.744 | n/a | n/a | 0.059 | 6.938 | 0.179 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000167 | 38.486 | 3.787 | 0.213 | 0.344 | 0.075 | 1.996 | 20.194 | 0.116 | n/a | 0.427 | 11.292 | n/a | n/a | 0.042 | 4.420 | 0.115 | 0.042 | gw-w/thread-46/gateway.admitted-work | none observed |
| 1a33321f4e326b0f0000000000000173 | 37.990 | 4.409 | 0.253 | 0.453 | 0.068 | 5.958 | 9.476 | 0.088 | n/a | 3.068 | 14.178 | n/a | n/a | 0.039 | 5.184 | 0.136 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000014a | 37.788 | 4.994 | 0.224 | 0.273 | 0.133 | 1.877 | 6.023 | 0.050 | n/a | 3.353 | 20.811 | n/a | n/a | 0.050 | 5.623 | 0.149 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000017d | 37.135 | 6.184 | 0.300 | 0.380 | 0.075 | 2.226 | 16.204 | 0.110 | n/a | 0.916 | 10.680 | n/a | n/a | 0.059 | 6.939 | 0.187 | 0.059 | gw-w/thread-44/gateway.admitted-work | none observed |
| 1a33321f4e326b0f0000000000000140 | 36.017 | 3.943 | 0.319 | 0.000 | 0.110 | 2.458 | 9.535 | 0.094 | n/a | 0.935 | 18.581 | n/a | n/a | 0.043 | 4.371 | 0.121 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000013b | 35.919 | 9.677 | 0.016 | 3.070 | 0.137 | 2.092 | 8.740 | 0.138 | n/a | 1.040 | 10.961 | n/a | n/a | 0.047 | 12.901 | 0.359 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000142 | 34.391 | 4.308 | 0.338 | 0.406 | 0.122 | 4.494 | 7.155 | 0.062 | n/a | 0.427 | 17.023 | n/a | n/a | 0.056 | 5.174 | 0.150 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000013a | 33.948 | 8.023 | 0.435 | 0.517 | 0.112 | 3.355 | 2.814 | 0.078 | n/a | 0.535 | 18.000 | n/a | n/a | 0.080 | 9.087 | 0.268 | 0.080 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000163 | 33.671 | 6.884 | 0.174 | 0.000 | 0.067 | 2.067 | 8.326 | 0.053 | n/a | 0.125 | 15.938 | n/a | n/a | 0.038 | 7.125 | 0.212 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000150 | 32.680 | 6.589 | 0.198 | 0.000 | 0.062 | 1.598 | 7.131 | 0.121 | n/a | 0.169 | 16.775 | n/a | n/a | 0.039 | 6.848 | 0.210 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.614 | 0.495 | 0.000 | 1.635 | 3.696 | 0.006 | 0.000 | 0.855 | 0.957 | 1.301 | 0.048 | n/a | 0.117 | 8.099 | n/a | n/a | 0.042 | 4.427 | 0.263 | 0.042 |
| p99 | 38.794 | 0.840 | 0.000 | 4.244 | 8.238 | 0.010 | 0.000 | 1.153 | 11.195 | 5.017 | 0.455 | n/a | 0.854 | 28.744 | n/a | n/a | 0.098 | 9.329 | 0.334 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000000133 | 38.794 | 5.965 | 0.010 | 0.000 | 0.963 | 0.909 | 1.253 | 0.038 | n/a | 0.854 | 28.744 | n/a | n/a | 0.059 | 6.938 | 0.179 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000136 | 29.964 | 8.238 | 0.006 | 0.000 | 1.085 | 11.195 | 4.783 | 0.062 | n/a | 0.554 | 3.942 | n/a | n/a | 0.098 | 9.329 | 0.311 | 0.098 | node-14/thread-0/socket.wait-first-byte | none observed |
| 1a33321f4e326b0f0000000000000147 | 23.602 | 4.312 | 0.006 | 0.000 | 0.110 | 0.957 | 2.081 | 0.455 | n/a | 0.721 | 14.920 | n/a | n/a | 0.039 | 4.427 | 0.188 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000015c | 22.753 | 5.870 | 0.006 | 0.000 | 0.357 | 1.048 | 1.301 | 0.044 | n/a | 0.100 | 13.983 | n/a | n/a | 0.042 | 6.233 | 0.274 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000179 | 20.614 | 3.049 | 0.005 | 0.000 | 0.993 | 4.347 | 1.096 | 0.048 | n/a | 0.071 | 10.965 | n/a | n/a | 0.039 | 4.047 | 0.196 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000151 | 17.744 | 3.682 | 0.007 | 0.000 | 1.153 | 0.876 | 5.017 | 0.072 | n/a | 0.112 | 6.778 | n/a | n/a | 0.048 | 4.842 | 0.273 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000016f | 15.423 | 3.696 | 0.007 | 0.000 | 0.360 | 1.314 | 1.738 | 0.048 | n/a | 0.117 | 8.099 | n/a | n/a | 0.044 | 4.063 | 0.263 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000161 | 10.406 | 2.615 | 0.005 | 0.000 | 0.855 | 0.686 | 1.295 | 0.036 | n/a | 0.307 | 4.571 | n/a | n/a | 0.035 | 3.476 | 0.334 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.175 | 0.546 | 0.000 | 1.236 | 4.746 | 0.196 | 0.000 | 0.135 | 1.676 | 7.345 | 0.059 | n/a | 0.199 | 12.266 | n/a | n/a | 0.058 | 5.331 | 0.194 | 0.058 |
| p99 | 106.193 | 2.568 | 0.000 | 3.863 | 9.672 | 0.486 | 0.763 | 1.207 | 7.462 | 18.890 | 5.646 | n/a | 3.740 | 87.402 | n/a | n/a | 0.137 | 10.932 | 0.345 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000000188 | 106.193 | 3.808 | 0.213 | 0.000 | 0.093 | 2.078 | 11.913 | 0.118 | n/a | 0.502 | 87.402 | n/a | n/a | 0.067 | 4.113 | 0.039 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000189 | 50.613 | 4.260 | 0.006 | 0.000 | 1.065 | 0.927 | 10.186 | 0.066 | n/a | 0.104 | 33.961 | n/a | n/a | 0.037 | 5.331 | 0.105 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001a6 | 50.608 | 9.606 | 0.448 | 0.758 | 0.120 | 1.780 | 18.128 | 0.077 | n/a | 0.147 | 19.458 | n/a | n/a | 0.086 | 10.932 | 0.216 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001ab | 46.145 | 9.379 | 0.021 | 0.000 | 0.674 | 1.962 | 13.421 | 0.226 | n/a | 1.254 | 19.160 | n/a | n/a | 0.047 | 10.074 | 0.218 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001cc | 42.503 | 5.751 | 0.296 | 0.546 | 0.086 | 3.171 | 13.380 | 0.089 | n/a | 0.233 | 18.907 | n/a | n/a | 0.044 | 6.680 | 0.157 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000019e | 40.152 | 4.641 | 0.294 | 0.273 | 0.076 | 2.560 | 16.540 | 5.646 | n/a | 0.165 | 9.820 | n/a | n/a | 0.137 | 5.284 | 0.132 | 0.137 | gw-w/thread-45/gateway.admitted-work | none observed |
| 1a33321f4e326b0f00000000000001ba | 39.637 | 6.057 | 0.251 | 0.570 | 0.085 | 1.632 | 8.592 | 0.044 | n/a | 0.091 | 22.254 | n/a | n/a | 0.060 | 6.964 | 0.176 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000198 | 36.251 | 4.746 | 0.340 | 0.000 | 0.071 | 2.618 | 9.016 | 0.200 | n/a | 0.845 | 18.361 | n/a | n/a | 0.055 | 5.156 | 0.142 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001b0 | 36.157 | 4.528 | 0.318 | 0.346 | 0.076 | 1.863 | 18.890 | 0.094 | n/a | 0.419 | 9.565 | n/a | n/a | 0.058 | 5.269 | 0.146 | 0.058 | gw-w/thread-44/gateway.admitted-work | none observed |
| 1a33321f4e326b0f0000000000000185 | 35.485 | 3.541 | 0.200 | 0.763 | 0.078 | 1.748 | 7.345 | 0.048 | n/a | 0.583 | 21.131 | n/a | n/a | 0.048 | 4.582 | 0.129 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001c2 | 35.157 | 8.510 | 0.277 | 0.426 | 0.099 | 2.001 | 7.090 | 0.045 | n/a | 2.533 | 14.121 | n/a | n/a | 0.054 | 9.312 | 0.265 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001aa | 35.077 | 3.883 | 0.196 | 0.722 | 0.076 | 1.676 | 16.156 | 0.427 | n/a | 0.184 | 11.717 | n/a | n/a | 0.041 | 4.877 | 0.139 | 0.041 | gw-w/thread-41/gateway.admitted-work | none observed |
| 1a33321f4e326b0f0000000000000181 | 33.966 | 5.447 | 0.204 | 0.000 | 0.081 | 2.393 | 9.165 | 0.129 | n/a | 3.740 | 12.759 | n/a | n/a | 0.049 | 5.732 | 0.169 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000199 | 33.197 | 9.672 | 0.012 | 0.000 | 0.642 | 1.126 | 4.496 | 0.085 | n/a | 0.179 | 16.908 | n/a | n/a | 0.077 | 10.326 | 0.311 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001b1 | 33.035 | 6.792 | 0.018 | 0.000 | 0.812 | 1.778 | 3.366 | 0.153 | n/a | 0.303 | 19.708 | n/a | n/a | 0.105 | 7.622 | 0.231 | 0.105 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001b6 | 32.804 | 4.768 | 0.243 | 0.252 | 0.092 | 7.462 | 7.437 | 0.074 | n/a | 0.152 | 12.266 | n/a | n/a | 0.057 | 5.356 | 0.163 | 0.057 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000192 | 32.725 | 4.090 | 0.255 | 0.000 | 0.063 | 2.958 | 11.787 | 0.056 | n/a | 1.457 | 11.995 | n/a | n/a | 0.064 | 4.408 | 0.135 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001be | 32.295 | 6.415 | 0.248 | 0.406 | 0.081 | 2.184 | 10.418 | 0.058 | n/a | 0.576 | 11.867 | n/a | n/a | 0.042 | 7.150 | 0.221 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000019c | 31.230 | 4.840 | 0.227 | 0.444 | 0.135 | 1.406 | 14.432 | 0.043 | n/a | 0.339 | 9.278 | n/a | n/a | 0.086 | 5.646 | 0.181 | 0.086 | gw-w/thread-48/gateway.admitted-work | none observed |
| 1a33321f4e326b0f00000000000001a4 | 31.175 | 6.798 | 0.486 | 0.689 | 0.074 | 2.391 | 8.597 | 0.052 | n/a | 0.374 | 11.668 | n/a | n/a | 0.045 | 8.048 | 0.258 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.326 | 0.824 | 0.000 | 1.544 | 3.240 | 0.006 | 0.000 | 0.743 | 0.959 | 1.561 | 0.048 | n/a | 0.181 | 10.138 | n/a | n/a | 0.059 | 4.161 | 0.231 | 0.059 |
| p99 | 33.035 | 1.595 | 0.000 | 2.524 | 6.792 | 0.018 | 0.000 | 1.207 | 1.778 | 3.670 | 0.153 | n/a | 0.901 | 19.708 | n/a | n/a | 0.105 | 7.622 | 0.339 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f00000000000001b1 | 33.035 | 6.792 | 0.018 | 0.000 | 0.812 | 1.778 | 3.366 | 0.153 | n/a | 0.303 | 19.708 | n/a | n/a | 0.105 | 7.622 | 0.231 | 0.105 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000017e | 25.998 | 5.029 | 0.012 | 0.000 | 0.416 | 1.288 | 1.385 | 0.042 | n/a | 0.181 | 17.566 | n/a | n/a | 0.077 | 5.458 | 0.210 | 0.077 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001c7 | 24.925 | 3.240 | 0.006 | 0.000 | 0.915 | 0.959 | 2.024 | 0.084 | n/a | 0.642 | 17.014 | n/a | n/a | 0.040 | 4.161 | 0.167 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000183 | 21.031 | 4.756 | 0.010 | 0.000 | 1.207 | 0.824 | 3.670 | 0.036 | n/a | 0.321 | 10.138 | n/a | n/a | 0.069 | 5.973 | 0.284 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001bf | 20.478 | 2.946 | 0.006 | 0.000 | 1.031 | 1.591 | 1.561 | 0.049 | n/a | 0.901 | 12.334 | n/a | n/a | 0.059 | 3.983 | 0.194 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001a7 | 17.326 | 3.661 | 0.005 | 0.000 | 0.743 | 1.089 | 1.961 | 0.062 | n/a | 0.195 | 9.547 | n/a | n/a | 0.063 | 4.409 | 0.254 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000018d | 16.814 | 2.986 | 0.005 | 0.000 | 0.126 | 0.638 | 1.132 | 0.035 | n/a | 0.122 | 11.735 | n/a | n/a | 0.036 | 3.117 | 0.185 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000193 | 14.845 | 4.715 | 0.010 | 0.000 | 0.312 | 1.376 | 0.961 | 0.037 | n/a | 0.124 | 7.231 | n/a | n/a | 0.079 | 5.037 | 0.339 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000196 | 14.261 | 3.127 | 0.005 | 0.000 | 0.815 | 0.702 | 1.771 | 0.059 | n/a | 0.099 | 7.652 | n/a | n/a | 0.030 | 3.948 | 0.277 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001c9 | 12.049 | 2.910 | 0.006 | 0.000 | 0.354 | 0.959 | 1.299 | 0.048 | n/a | 0.144 | 6.277 | n/a | n/a | 0.053 | 3.270 | 0.271 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.036 | 0.450 | 0.000 | 1.270 | 4.365 | 0.017 | 0.000 | 0.160 | 1.356 | 6.347 | 0.061 | n/a | 0.384 | 13.351 | n/a | n/a | 0.056 | 5.078 | 0.181 | 0.056 |
| p99 | 147.942 | 2.782 | 0.000 | 3.919 | 15.881 | 0.688 | 0.675 | 1.589 | 4.673 | 133.503 | 0.221 | n/a | 3.831 | 74.747 | n/a | n/a | 0.139 | 16.893 | 0.319 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000000219 | 147.942 | 3.419 | 0.224 | 0.246 | 0.109 | 1.320 | 133.503 | 0.069 | n/a | 3.651 | 5.328 | n/a | n/a | 0.073 | 3.997 | 0.027 | 0.073 | gw-w/thread-44/gateway.admitted-work | none observed |
| 1a33321f4e326b0f00000000000001cd | 84.114 | 6.069 | 0.008 | 0.000 | 0.216 | 1.085 | 1.716 | 0.055 | n/a | 0.141 | 74.747 | n/a | n/a | 0.078 | 6.292 | 0.075 | 0.078 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000203 | 67.326 | 3.836 | 0.368 | 0.242 | 0.080 | 1.729 | 12.676 | 0.195 | n/a | 0.905 | 47.253 | n/a | n/a | 0.042 | 4.527 | 0.067 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000207 | 58.044 | 8.256 | 0.306 | 0.675 | 0.233 | 2.590 | 10.527 | 0.105 | n/a | 0.158 | 35.056 | n/a | n/a | 0.139 | 9.469 | 0.163 | 0.139 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001df | 57.630 | 7.021 | 0.301 | 0.247 | 0.125 | 1.723 | 24.585 | 0.141 | n/a | 0.139 | 23.250 | n/a | n/a | 0.098 | 7.694 | 0.134 | 0.098 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001f0 | 53.911 | 15.881 | 0.017 | 0.000 | 0.995 | 4.525 | 21.079 | 0.172 | n/a | 0.472 | 10.703 | n/a | n/a | 0.066 | 16.893 | 0.313 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001d8 | 45.366 | 6.187 | 0.289 | 0.485 | 0.083 | 1.967 | 16.908 | 0.057 | n/a | 1.419 | 17.926 | n/a | n/a | 0.045 | 7.044 | 0.155 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000020f | 38.321 | 4.981 | 0.350 | 0.483 | 0.077 | 2.172 | 12.677 | 0.117 | n/a | 3.831 | 13.550 | n/a | n/a | 0.083 | 5.891 | 0.154 | 0.083 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001ef | 37.733 | 7.224 | 0.589 | 0.399 | 0.084 | 2.410 | 9.243 | 0.067 | n/a | 0.153 | 17.509 | n/a | n/a | 0.055 | 8.296 | 0.220 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000020b | 36.314 | 3.606 | 0.195 | 0.433 | 0.076 | 1.273 | 18.614 | 0.050 | n/a | 0.109 | 11.914 | n/a | n/a | 0.044 | 4.310 | 0.119 | 0.044 | gw-w/thread-45/gateway.admitted-work | none observed |
| 1a33321f4e326b0f00000000000001f3 | 35.627 | 5.682 | 0.196 | 0.566 | 0.062 | 2.243 | 17.636 | 0.111 | n/a | 0.137 | 8.952 | n/a | n/a | 0.042 | 6.506 | 0.183 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000211 | 35.315 | 5.347 | 0.688 | 0.368 | 0.069 | 2.380 | 10.809 | 0.070 | n/a | 0.384 | 15.092 | n/a | n/a | 0.108 | 6.472 | 0.183 | 0.108 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000217 | 35.186 | 4.793 | 0.565 | 0.371 | 0.103 | 2.839 | 10.093 | 0.114 | n/a | 1.201 | 15.040 | n/a | n/a | 0.068 | 5.833 | 0.166 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001f9 | 33.844 | 5.045 | 0.198 | 0.263 | 0.082 | 2.814 | 11.834 | 0.080 | n/a | 0.206 | 13.280 | n/a | n/a | 0.043 | 5.588 | 0.165 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001d2 | 33.488 | 3.924 | 0.257 | 0.292 | 0.076 | 4.673 | 7.038 | 0.046 | n/a | 0.098 | 17.027 | n/a | n/a | 0.056 | 4.550 | 0.136 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001fb | 32.880 | 3.832 | 0.179 | 0.234 | 0.068 | 1.233 | 9.381 | 0.061 | n/a | 0.338 | 17.490 | n/a | n/a | 0.064 | 4.313 | 0.131 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001db | 32.539 | 4.950 | 0.243 | 0.413 | 0.135 | 2.105 | 9.645 | 0.135 | n/a | 2.569 | 12.283 | n/a | n/a | 0.062 | 5.740 | 0.176 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000021b | 31.381 | 3.757 | 0.188 | 0.249 | 0.062 | 1.351 | 6.347 | 0.058 | n/a | 0.396 | 18.927 | n/a | n/a | 0.046 | 4.256 | 0.136 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000204 | 29.522 | 4.968 | 0.009 | 0.000 | 0.234 | 1.436 | 2.194 | 0.065 | n/a | 0.653 | 19.880 | n/a | n/a | 0.083 | 5.211 | 0.177 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001e0 | 29.490 | 4.525 | 0.006 | 0.000 | 0.604 | 0.678 | 3.778 | 0.041 | n/a | 0.508 | 19.310 | n/a | n/a | 0.039 | 5.136 | 0.174 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.061 | 0.894 | 0.000 | 1.813 | 3.826 | 0.007 | 0.000 | 0.473 | 0.834 | 1.657 | 0.043 | n/a | 0.363 | 11.810 | n/a | n/a | 0.057 | 4.424 | 0.222 | 0.057 |
| p99 | 84.114 | 2.222 | 0.000 | 3.919 | 6.069 | 0.012 | 0.000 | 1.131 | 1.436 | 12.688 | 0.094 | n/a | 2.230 | 74.747 | n/a | n/a | 0.083 | 6.292 | 0.318 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f00000000000001cd | 84.114 | 6.069 | 0.008 | 0.000 | 0.216 | 1.085 | 1.716 | 0.055 | n/a | 0.141 | 74.747 | n/a | n/a | 0.078 | 6.292 | 0.075 | 0.078 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000204 | 29.522 | 4.968 | 0.009 | 0.000 | 0.234 | 1.436 | 2.194 | 0.065 | n/a | 0.653 | 19.880 | n/a | n/a | 0.083 | 5.211 | 0.177 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001dc | 26.972 | 4.038 | 0.008 | 0.000 | 0.271 | 1.031 | 12.688 | 0.094 | n/a | 0.121 | 8.643 | n/a | n/a | 0.079 | 4.317 | 0.160 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001e3 | 25.202 | 3.830 | 0.007 | 0.000 | 0.606 | 1.193 | 1.657 | 0.041 | n/a | 0.638 | 17.180 | n/a | n/a | 0.049 | 4.443 | 0.176 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000200 | 24.677 | 4.508 | 0.007 | 0.000 | 0.963 | 0.693 | 1.244 | 0.038 | n/a | 2.230 | 14.921 | n/a | n/a | 0.073 | 5.477 | 0.222 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001d3 | 20.652 | 3.826 | 0.007 | 0.000 | 1.131 | 0.834 | 1.564 | 0.054 | n/a | 1.020 | 12.131 | n/a | n/a | 0.083 | 4.964 | 0.240 | 0.083 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001e6 | 19.227 | 2.828 | 0.005 | 0.000 | 0.652 | 0.671 | 1.301 | 0.035 | n/a | 0.116 | 13.577 | n/a | n/a | 0.042 | 3.485 | 0.181 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001ea | 18.061 | 3.333 | 0.007 | 0.000 | 0.215 | 0.670 | 1.754 | 0.050 | n/a | 0.170 | 11.810 | n/a | n/a | 0.051 | 3.555 | 0.197 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001cf | 17.714 | 2.767 | 0.006 | 0.000 | 0.158 | 0.650 | 1.370 | 0.042 | n/a | 0.103 | 12.573 | n/a | n/a | 0.045 | 2.930 | 0.165 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001e8 | 16.975 | 4.658 | 0.012 | 0.000 | 0.418 | 1.356 | 1.681 | 0.043 | n/a | 0.134 | 8.604 | n/a | n/a | 0.070 | 5.088 | 0.300 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000001f6 | 16.924 | 3.521 | 0.006 | 0.000 | 0.473 | 0.697 | 1.231 | 0.036 | n/a | 0.466 | 10.442 | n/a | n/a | 0.052 | 4.000 | 0.236 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000212 | 16.839 | 3.714 | 0.009 | 0.000 | 0.479 | 1.411 | 1.977 | 0.054 | n/a | 0.418 | 8.705 | n/a | n/a | 0.072 | 4.202 | 0.250 | 0.072 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000020c | 16.284 | 4.412 | 0.008 | 0.000 | 0.153 | 0.814 | 1.530 | 0.041 | n/a | 0.107 | 9.177 | n/a | n/a | 0.041 | 4.573 | 0.281 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000208 | 15.877 | 2.839 | 0.006 | 0.000 | 0.901 | 0.620 | 1.365 | 0.035 | n/a | 0.363 | 9.713 | n/a | n/a | 0.036 | 3.746 | 0.236 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000021c | 13.926 | 3.758 | 0.007 | 0.000 | 0.659 | 0.969 | 2.387 | 0.094 | n/a | 1.230 | 4.764 | n/a | n/a | 0.057 | 4.424 | 0.318 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.005 | 0.599 | 0.000 | 1.685 | 4.796 | 0.008 | 0.000 | 0.208 | 1.104 | 4.118 | 0.048 | n/a | 0.340 | 11.264 | n/a | n/a | 0.053 | 5.238 | 0.241 | 0.053 |
| p99 | 81.470 | 2.862 | 0.012 | 7.779 | 10.310 | 0.621 | 0.488 | 1.021 | 5.287 | 49.339 | 0.334 | n/a | 3.751 | 57.506 | n/a | n/a | 0.170 | 10.529 | 0.512 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000000233 | 81.470 | 8.383 | 0.358 | 0.411 | 0.124 | 1.733 | 12.320 | 0.046 | n/a | 0.507 | 57.506 | n/a | n/a | 0.084 | 9.275 | 0.114 | 0.084 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000247 | 80.493 | 4.595 | 0.243 | 0.000 | 0.099 | 1.287 | 49.339 | 0.047 | n/a | 1.446 | 23.379 | n/a | n/a | 0.058 | 4.938 | 0.061 | 0.058 | gw-w/thread-43/gateway.admitted-work | none observed |
| 1a33321f4e326b0f0000000000000284 | 58.083 | 5.128 | 0.388 | 0.000 | 0.022 | 1.800 | 36.545 | 0.126 | n/a | 0.127 | 13.893 | n/a | n/a | 0.054 | 5.538 | 0.095 | 0.054 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 1a33321f4e326b0f0000000000000243 | 51.249 | 5.219 | 0.222 | 0.000 | 0.078 | 1.716 | 18.709 | 0.050 | n/a | 0.490 | 24.719 | n/a | n/a | 0.045 | 5.519 | 0.108 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000272 | 45.175 | 5.728 | 0.263 | 0.000 | 0.018 | 1.323 | 4.451 | 0.041 | n/a | 0.158 | 33.150 | n/a | n/a | 0.043 | 6.010 | 0.133 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000024f | 42.380 | 5.830 | 0.269 | 0.000 | 0.068 | 2.456 | 17.799 | 0.109 | n/a | 2.851 | 12.937 | n/a | n/a | 0.062 | 6.167 | 0.146 | 0.062 | gw-w/thread-45/gateway.admitted-work | none observed |
| 1a33321f4e326b0f000000000000022c | 36.536 | 4.886 | 0.276 | 0.488 | 0.052 | 1.883 | 14.304 | 0.074 | n/a | 0.121 | 14.321 | n/a | n/a | 0.130 | 5.702 | 0.156 | 0.130 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000026a | 36.406 | 4.932 | 0.307 | 0.000 | 0.102 | 2.254 | 14.964 | 0.097 | n/a | 2.695 | 10.991 | n/a | n/a | 0.062 | 5.341 | 0.147 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000278 | 36.347 | 4.552 | 0.196 | 0.000 | 0.078 | 2.532 | 9.285 | 0.047 | n/a | 0.340 | 19.273 | n/a | n/a | 0.044 | 4.827 | 0.133 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000259 | 34.799 | 5.484 | 0.233 | 0.000 | 0.063 | 1.810 | 16.319 | 0.041 | n/a | 0.126 | 10.668 | n/a | n/a | 0.055 | 5.779 | 0.166 | 0.055 | gw-w/thread-47/gateway.admitted-work | none observed |
| 1a33321f4e326b0f0000000000000222 | 34.538 | 3.495 | 0.210 | 0.226 | 0.063 | 1.099 | 11.439 | 0.039 | n/a | 0.619 | 17.301 | n/a | n/a | 0.047 | 3.994 | 0.116 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000235 | 33.591 | 5.221 | 0.621 | 0.000 | 0.324 | 2.708 | 9.577 | 0.061 | n/a | 0.116 | 14.793 | n/a | n/a | 0.170 | 6.166 | 0.184 | 0.170 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000230 | 33.255 | 6.092 | 0.006 | 0.000 | 0.064 | 1.063 | 12.265 | 0.031 | n/a | 0.490 | 13.191 | n/a | n/a | 0.054 | 6.162 | 0.185 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000023f | 33.153 | 4.096 | 0.270 | 0.000 | 0.109 | 2.117 | 10.377 | 0.083 | n/a | 0.699 | 15.340 | n/a | n/a | 0.062 | 4.475 | 0.135 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000025a | 30.752 | 7.060 | 0.005 | 0.000 | 1.021 | 0.760 | 2.872 | 0.064 | n/a | 3.266 | 15.656 | n/a | n/a | 0.048 | 8.086 | 0.263 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000025f | 29.388 | 7.147 | 0.358 | 0.000 | 0.016 | 2.191 | 9.633 | 0.082 | n/a | 0.196 | 9.717 | n/a | n/a | 0.050 | 7.521 | 0.256 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.282ms |
| 1a33321f4e326b0f0000000000000267 | 28.003 | 9.556 | 0.189 | 0.000 | 0.069 | 2.176 | 4.520 | 0.048 | n/a | 0.140 | 11.264 | n/a | n/a | 0.041 | 9.814 | 0.350 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000245 | 27.405 | 3.616 | 0.242 | 0.000 | 0.293 | 1.212 | 6.927 | 0.065 | n/a | 0.888 | 14.096 | n/a | n/a | 0.065 | 4.152 | 0.152 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000023b | 27.405 | 8.137 | 0.255 | 0.000 | 0.069 | 1.651 | 4.627 | 0.070 | n/a | 0.102 | 12.454 | n/a | n/a | 0.039 | 8.462 | 0.309 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000027f | 26.331 | 10.310 | 0.012 | 0.000 | 0.208 | 0.882 | 1.690 | 0.039 | n/a | 0.430 | 12.703 | n/a | n/a | 0.058 | 10.529 | 0.400 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.308 | 0.514 | 0.000 | 1.764 | 4.360 | 0.006 | 0.000 | 0.554 | 0.863 | 1.690 | 0.052 | n/a | 0.280 | 7.922 | n/a | n/a | 0.047 | 4.440 | 0.305 | 0.047 |
| p99 | 26.331 | 1.332 | 0.010 | 7.779 | 10.310 | 0.015 | 0.000 | 0.947 | 3.574 | 8.288 | 0.334 | n/a | 1.771 | 18.053 | n/a | n/a | 0.080 | 10.529 | 0.405 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f000000000000027f | 26.331 | 10.310 | 0.012 | 0.000 | 0.208 | 0.882 | 1.690 | 0.039 | n/a | 0.430 | 12.703 | n/a | n/a | 0.058 | 10.529 | 0.400 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000022e | 24.551 | 2.831 | 0.005 | 0.000 | 0.574 | 0.679 | 4.706 | 0.037 | n/a | 0.113 | 15.568 | n/a | n/a | 0.038 | 3.410 | 0.139 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000236 | 24.191 | 3.870 | 0.007 | 0.000 | 0.206 | 0.809 | 0.862 | 0.024 | n/a | 0.280 | 18.053 | n/a | n/a | 0.080 | 4.083 | 0.169 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.172ms |
| 1a33321f4e326b0f0000000000000282 | 23.910 | 7.987 | 0.006 | 0.000 | 0.722 | 0.965 | 2.233 | 0.088 | n/a | 0.189 | 11.676 | n/a | n/a | 0.043 | 8.715 | 0.365 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000275 | 20.566 | 2.680 | 0.005 | 0.000 | 0.909 | 0.743 | 8.096 | 0.053 | n/a | 0.120 | 7.922 | n/a | n/a | 0.039 | 3.594 | 0.175 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000026d | 20.226 | 3.452 | 0.006 | 0.000 | 0.947 | 0.854 | 1.264 | 0.041 | n/a | 0.521 | 13.095 | n/a | n/a | 0.047 | 4.404 | 0.218 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000249 | 20.182 | 2.985 | 0.004 | 0.000 | 0.243 | 0.825 | 0.993 | 0.026 | n/a | 1.771 | 13.301 | n/a | n/a | 0.034 | 3.231 | 0.160 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.161ms |
| 1a33321f4e326b0f000000000000027b | 19.926 | 4.369 | 0.011 | 0.000 | 0.060 | 1.073 | 1.636 | 0.055 | n/a | 0.542 | 12.139 | n/a | n/a | 0.041 | 4.440 | 0.223 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000268 | 19.308 | 4.797 | 0.005 | 0.000 | 0.435 | 3.574 | 8.288 | 0.083 | n/a | 0.146 | 1.933 | n/a | n/a | 0.045 | 5.238 | 0.271 | 0.045 | node-14/thread-0/driver.execute | none observed |
| 1a33321f4e326b0f0000000000000229 | 18.665 | 4.756 | 0.005 | 0.000 | 0.122 | 0.757 | 2.333 | 0.038 | n/a | 0.371 | 10.245 | n/a | n/a | 0.038 | 4.883 | 0.262 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000260 | 17.023 | 6.027 | 0.007 | 0.000 | 0.859 | 0.762 | 2.116 | 0.181 | n/a | 0.597 | 6.428 | n/a | n/a | 0.046 | 6.893 | 0.405 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000221 | 16.057 | 4.360 | 0.006 | 0.000 | 0.538 | 2.194 | 5.266 | 0.334 | n/a | 0.217 | 3.090 | n/a | n/a | 0.052 | 4.904 | 0.305 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000225 | 15.474 | 4.759 | 0.013 | 0.000 | 0.191 | 0.892 | 1.394 | 0.098 | n/a | 0.186 | 7.866 | n/a | n/a | 0.078 | 4.962 | 0.321 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000025d | 15.450 | 5.254 | 0.015 | 0.000 | 0.766 | 1.104 | 1.209 | 0.040 | n/a | 0.174 | 6.831 | n/a | n/a | 0.058 | 6.035 | 0.391 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000264 | 13.879 | 3.478 | 0.005 | 0.000 | 0.793 | 0.863 | 1.432 | 0.052 | n/a | 0.151 | 7.050 | n/a | n/a | 0.055 | 4.276 | 0.308 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000253 | 13.515 | 3.495 | 0.007 | 0.000 | 0.792 | 1.082 | 2.612 | 0.103 | n/a | 0.822 | 4.548 | n/a | n/a | 0.053 | 4.294 | 0.318 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000240 | 12.423 | 3.858 | 0.007 | 0.000 | 0.554 | 0.646 | 1.221 | 0.033 | n/a | 0.551 | 5.492 | n/a | n/a | 0.061 | 4.419 | 0.356 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.279 | 0.426 | 0.000 | 1.217 | 4.416 | 0.025 | 0.000 | 0.183 | 1.284 | 2.751 | 0.039 | n/a | 0.270 | 10.565 | n/a | n/a | 0.053 | 4.923 | 0.231 | 0.053 |
| p99 | 103.860 | 3.199 | 0.055 | 2.790 | 8.229 | n/a | 0.000 | 1.070 | 5.908 | 73.342 | 0.167 | n/a | 2.068 | 41.509 | n/a | n/a | 0.162 | 9.020 | 0.450 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f00000000000002b9 | 103.860 | 8.229 | 0.695 | 0.000 | 0.096 | 4.073 | 73.342 | 0.167 | n/a | 0.269 | 16.944 | n/a | n/a | 0.047 | 9.020 | 0.087 | 0.047 | gw-w/thread-43/gateway.admitted-work | none observed |
| 1a33321f4e326b0f00000000000002a5 | 53.886 | 4.660 | 0.224 | 0.000 | 0.102 | 1.707 | 5.468 | 0.036 | n/a | 0.126 | 41.509 | n/a | n/a | 0.053 | 4.986 | 0.093 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000293 | 43.752 | 4.050 | 0.455 | 0.000 | 0.321 | 1.486 | 14.401 | 0.035 | n/a | 0.099 | 22.799 | n/a | n/a | 0.105 | 4.827 | 0.110 | 0.105 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002c1 | 39.569 | 5.560 | 0.267 | 0.000 | 0.384 | 2.100 | 9.177 | 0.052 | n/a | 0.440 | 21.427 | n/a | n/a | 0.162 | 6.211 | 0.157 | 0.162 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002b3 | 39.500 | 5.040 | 0.313 | 0.000 | 0.115 | 1.506 | 6.350 | 0.042 | n/a | 0.270 | 25.799 | n/a | n/a | 0.066 | 5.468 | 0.138 | 0.066 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000029b | 36.807 | 4.426 | 0.361 | 0.000 | 0.067 | 5.033 | 12.440 | 0.051 | n/a | 0.092 | 14.296 | n/a | n/a | 0.041 | 4.854 | 0.132 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002b5 | 36.523 | 7.023 | 0.320 | 0.000 | 0.067 | 3.130 | 10.598 | 0.127 | n/a | 0.235 | 14.927 | n/a | n/a | 0.097 | 7.410 | 0.203 | 0.097 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000028e | 36.436 | 6.090 | 0.025 | 0.000 | 0.446 | 0.849 | 1.544 | 0.033 | n/a | 0.107 | 27.287 | n/a | n/a | 0.056 | 6.561 | 0.180 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002ad | 34.842 | 3.687 | 0.181 | 0.000 | 0.058 | 1.438 | 16.291 | 0.050 | n/a | 0.119 | 12.980 | n/a | n/a | 0.037 | 3.927 | 0.113 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002d2 | 34.021 | 6.380 | 0.323 | 0.000 | 0.042 | 2.477 | 7.129 | 0.038 | n/a | 0.304 | 17.278 | n/a | n/a | 0.051 | 6.745 | 0.198 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002ba | 33.935 | 5.065 | 0.007 | 0.000 | 0.183 | 2.103 | 10.463 | 0.110 | n/a | 0.260 | 15.665 | n/a | n/a | 0.080 | 5.255 | 0.155 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000028c | 31.919 | 6.112 | 0.282 | 0.000 | 0.057 | 1.776 | 5.752 | 0.038 | n/a | 0.872 | 16.960 | n/a | n/a | 0.070 | 6.451 | 0.202 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002d6 | 28.021 | 3.983 | 0.207 | 0.000 | 0.076 | 1.728 | 5.812 | 0.080 | n/a | 0.137 | 15.940 | n/a | n/a | 0.057 | 4.266 | 0.152 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002d8 | 27.855 | 4.172 | 0.198 | 0.000 | 0.060 | 1.367 | 5.615 | 0.039 | n/a | 0.322 | 16.035 | n/a | n/a | 0.046 | 4.430 | 0.159 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000289 | 26.701 | 4.802 | 0.010 | 0.000 | 0.849 | 0.886 | 1.685 | 0.056 | n/a | 0.754 | 17.602 | n/a | n/a | 0.057 | 5.661 | 0.212 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000299 | 25.798 | 5.688 | 0.497 | 0.000 | 0.118 | 1.817 | 4.943 | 0.040 | n/a | 0.091 | 12.553 | n/a | n/a | 0.050 | 6.303 | 0.244 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002be | 25.546 | 4.213 | 0.006 | 0.000 | 0.152 | 0.961 | 4.322 | 0.039 | n/a | 0.140 | 15.655 | n/a | n/a | 0.057 | 4.371 | 0.171 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002bd | 24.410 | 4.930 | 0.650 | 0.000 | 0.067 | 1.623 | 7.169 | 0.050 | n/a | 0.396 | 9.465 | n/a | n/a | 0.061 | 5.646 | 0.231 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000288 | 23.098 | 4.589 | 0.282 | 0.000 | 0.063 | 1.735 | 5.683 | 0.080 | n/a | 0.709 | 9.904 | n/a | n/a | 0.053 | 4.934 | 0.214 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002a1 | 22.760 | 4.955 | 0.250 | 0.000 | 0.070 | 1.673 | 5.968 | 0.038 | n/a | 0.113 | 9.652 | n/a | n/a | 0.042 | 5.274 | 0.232 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.791 | 0.776 | 0.000 | 1.664 | 3.547 | 0.006 | 0.000 | 0.531 | 0.889 | 1.678 | 0.039 | n/a | 0.340 | 6.120 | n/a | n/a | 0.052 | 4.083 | 0.295 | 0.052 |
| p99 | 33.935 | 2.937 | 0.055 | 2.208 | 5.686 | n/a | 0.000 | 1.070 | 5.908 | 10.463 | 0.110 | n/a | 2.068 | 15.665 | n/a | n/a | 0.094 | 6.371 | 0.389 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f00000000000002ba | 33.935 | 5.065 | 0.007 | 0.000 | 0.183 | 2.103 | 10.463 | 0.110 | n/a | 0.260 | 15.665 | n/a | n/a | 0.080 | 5.255 | 0.155 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002be | 25.546 | 4.213 | 0.006 | 0.000 | 0.152 | 0.961 | 4.322 | 0.039 | n/a | 0.140 | 15.655 | n/a | n/a | 0.057 | 4.371 | 0.171 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002b6 | 21.588 | 5.686 | 0.011 | 0.000 | 0.674 | 1.278 | 2.188 | 0.056 | n/a | 0.517 | 11.085 | n/a | n/a | 0.094 | 6.371 | 0.295 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000285 | 18.649 | 4.169 | 0.007 | 0.000 | 1.015 | 0.809 | 1.200 | 0.041 | n/a | 0.450 | 10.879 | n/a | n/a | 0.078 | 5.192 | 0.278 | 0.078 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002c8 | 17.379 | 4.690 | 0.013 | 0.000 | 0.616 | 1.000 | 2.020 | 0.063 | n/a | 1.171 | 7.744 | n/a | n/a | 0.062 | 5.319 | 0.306 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000294 | 16.846 | 3.397 | 0.006 | 0.000 | 1.070 | 0.889 | 1.278 | 0.031 | n/a | 0.340 | 9.796 | n/a | n/a | 0.039 | 4.473 | 0.266 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002cc | 12.962 | 1.711 | n/a | 0.000 | 0.311 | 5.908 | 4.923 | 0.015 | n/a | 0.043 | 0.000 | n/a | n/a | 0.051 | 2.022 | 0.156 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| 1a33321f4e326b0f00000000000002c6 | 12.791 | 3.202 | 0.005 | 0.000 | 0.834 | 0.681 | 2.751 | 0.049 | n/a | 0.393 | 4.830 | n/a | n/a | 0.045 | 4.042 | 0.316 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002c2 | 12.771 | 3.501 | 0.005 | 0.000 | 0.346 | 0.667 | 1.003 | 0.031 | n/a | 0.390 | 6.775 | n/a | n/a | 0.053 | 3.851 | 0.302 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002a2 | 12.610 | 2.719 | 0.006 | 0.000 | 0.804 | 0.973 | 1.678 | 0.063 | n/a | 0.204 | 6.120 | n/a | n/a | 0.043 | 3.528 | 0.280 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000029c | 11.995 | 3.851 | 0.009 | 0.000 | 0.499 | 0.941 | 1.754 | 0.054 | n/a | 0.689 | 4.145 | n/a | n/a | 0.053 | 4.359 | 0.363 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002ae | 11.529 | 3.547 | 0.005 | 0.000 | 0.531 | 0.758 | 0.973 | 0.031 | n/a | 0.075 | 5.557 | n/a | n/a | 0.052 | 4.083 | 0.354 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002a6 | 10.268 | 3.818 | 0.005 | 0.000 | 0.111 | 0.674 | 1.260 | 0.029 | n/a | 0.078 | 4.246 | n/a | n/a | 0.047 | 3.934 | 0.383 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f000000000000029e | 10.244 | 3.095 | 0.005 | 0.000 | 0.883 | 0.620 | 0.970 | 0.032 | n/a | 2.068 | 2.520 | n/a | n/a | 0.052 | 3.982 | 0.389 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.423 | 0.809 | 0.000 | 1.651 | 3.815 | 0.005 | 0.000 | 0.757 | 0.847 | 1.252 | 0.038 | n/a | 0.153 | 8.056 | n/a | n/a | 0.040 | 4.837 | 0.301 | 0.040 |
| p99 | 94.204 | 3.161 | 0.082 | 5.220 | 11.278 | 2.113 | 0.000 | 44.379 | 13.485 | 13.424 | 3.390 | n/a | 3.478 | 63.598 | n/a | n/a | 0.124 | 50.726 | 0.742 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000000382 | 168.569 | 6.000 | 4.013 | 0.000 | 80.594 | 6.366 | 2.758 | 0.055 | n/a | 0.101 | 68.616 | n/a | n/a | 0.066 | 90.607 | 0.538 | 0.066 | node-14/thread-0/driver.queue.subject | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 2.278ms; driver.publication 2.044ms; driver.publication 1.548ms |
| 1a33321f4e326b0f000000000000038a | 143.869 | 5.313 | 0.009 | 0.000 | 79.406 | 0.967 | 5.668 | 0.049 | n/a | 0.107 | 52.296 | n/a | n/a | 0.056 | 84.727 | 0.589 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 2.278ms; driver.publication 2.044ms; driver.publication 1.569ms |
| 1a33321f4e326b0f0000000000000735 | 136.031 | 6.713 | 0.010 | 0.000 | 93.363 | 2.051 | 2.597 | 0.048 | n/a | 2.285 | 28.909 | n/a | n/a | 0.055 | 100.085 | 0.736 | 0.055 | node-14/thread-0/driver.queue.subject | driver.publication 16.789ms; driver.publication 6.997ms; driver.publication 3.910ms; driver.publication 1.712ms; driver.publication 1.564ms |
| 1a33321f4e326b0f000000000000038f | 117.264 | 6.794 | 0.016 | 0.000 | 0.564 | 8.582 | 1.484 | 0.058 | n/a | 0.071 | 99.635 | n/a | n/a | 0.060 | 7.374 | 0.063 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 1.569ms; driver.publication 1.263ms; driver.publication 1.247ms |
| 1a33321f4e326b0f0000000000000734 | 114.796 | 7.355 | 0.285 | 0.000 | 27.005 | 14.973 | 5.000 | 0.074 | n/a | 0.345 | 59.692 | n/a | n/a | 0.065 | 34.645 | 0.302 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 20.111ms; driver.publication 6.997ms |
| 1a33321f4e326b0f000000000000038c | 111.357 | 2.914 | 0.006 | 0.000 | 0.923 | 5.891 | 2.153 | 0.107 | n/a | 0.131 | 99.191 | n/a | n/a | 0.040 | 3.843 | 0.035 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 2.278ms; driver.publication 1.569ms; driver.publication 1.247ms |
| 1a33321f4e326b0f000000000000038e | 102.824 | 4.818 | 0.012 | 0.000 | 1.311 | 4.417 | 1.646 | 0.072 | n/a | 0.167 | 90.320 | n/a | n/a | 0.062 | 6.142 | 0.060 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 1.569ms |
| 1a33321f4e326b0f0000000000000733 | 102.377 | 12.365 | 0.010 | 0.000 | 26.686 | 8.997 | 1.917 | 0.072 | n/a | 0.145 | 52.131 | n/a | n/a | 0.054 | 39.060 | 0.382 | 0.054 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 20.111ms |
| 1a33321f4e326b0f0000000000000380 | 94.204 | 4.961 | 4.021 | 0.000 | 0.050 | 2.244 | 7.962 | 0.079 | n/a | 1.438 | 73.401 | n/a | n/a | 0.048 | 9.032 | 0.096 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f00000000000002e2 | 92.427 | 5.669 | 0.291 | 0.000 | 0.120 | 1.571 | 6.811 | 0.035 | n/a | 0.281 | 77.571 | n/a | n/a | 0.079 | 6.080 | 0.066 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000740 | 92.419 | 3.764 | 0.004 | 0.000 | 78.437 | 0.577 | 1.348 | 0.061 | n/a | 0.228 | 7.951 | n/a | n/a | 0.048 | 82.205 | 0.889 | 0.048 | node-14/thread-0/driver.queue.subject | driver.publication 5.876ms; driver.publication 2.308ms; driver.publication 2.147ms; driver.publication 1.993ms; driver.publication 1.882ms |
| 1a33321f4e326b0f0000000000000399 | 91.205 | 6.128 | 0.006 | 0.000 | 63.296 | 0.679 | 2.114 | 0.049 | n/a | 0.092 | 18.810 | n/a | n/a | 0.031 | 69.431 | 0.761 | 0.031 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.684ms; driver.publication 1.345ms; driver.publication 1.263ms; driver.publication 1.247ms; driver.publication 1.197ms |
| 1a33321f4e326b0f0000000000000387 | 89.360 | 9.391 | 0.177 | 0.000 | 1.560 | 12.233 | 2.549 | 0.060 | n/a | 0.095 | 63.230 | n/a | n/a | 0.065 | 11.127 | 0.125 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.747ms; driver.publication 2.278ms; driver.publication 2.044ms; driver.publication 1.548ms; driver.publication 1.447ms |
| 1a33321f4e326b0f0000000000000381 | 88.262 | 7.637 | 0.084 | 0.000 | 1.197 | 5.344 | 2.648 | 0.081 | n/a | 0.184 | 70.994 | n/a | n/a | 0.093 | 8.917 | 0.101 | 0.093 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 1a33321f4e326b0f0000000000000393 | 86.295 | 6.953 | 0.006 | 0.000 | 45.793 | 0.713 | 2.756 | 0.085 | n/a | 0.976 | 28.962 | n/a | n/a | 0.051 | 52.752 | 0.611 | 0.051 | node-14/thread-0/driver.queue.subject | driver.publication 1.263ms; driver.publication 1.247ms; driver.publication 1.168ms; driver.publication 1.003ms |
| 1a33321f4e326b0f000000000000075d | 86.221 | 6.340 | 0.006 | 0.000 | 44.379 | 0.963 | 2.212 | 0.069 | n/a | 0.119 | 32.087 | n/a | n/a | 0.045 | 50.726 | 0.588 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication 2.917ms; driver.publication 2.529ms; driver.publication 1.626ms; driver.publication 1.297ms; driver.publication 1.218ms |
| 1a33321f4e326b0f000000000000073e | 85.950 | 10.603 | 0.011 | 0.000 | 34.641 | 5.002 | 1.893 | 0.047 | n/a | 0.145 | 33.576 | n/a | n/a | 0.032 | 45.255 | 0.527 | 0.032 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.910ms; driver.publication 2.147ms; driver.publication 1.993ms; driver.publication 1.882ms; driver.publication 1.712ms |
| 1a33321f4e326b0f0000000000000383 | 82.151 | 4.277 | 0.007 | 0.000 | 0.355 | 5.922 | 1.535 | 0.037 | n/a | 0.101 | 69.868 | n/a | n/a | 0.048 | 4.639 | 0.056 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.447ms |
| 1a33321f4e326b0f000000000000073b | 81.822 | 7.941 | 0.007 | 0.000 | 17.927 | 21.000 | 2.364 | 0.046 | n/a | 7.366 | 25.114 | n/a | n/a | 0.057 | 25.875 | 0.316 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 6.997ms; driver.publication 3.910ms; driver.publication 2.147ms; driver.publication 1.712ms; driver.publication 1.564ms |
| 1a33321f4e326b0f0000000000000384 | 81.504 | 8.357 | 0.009 | 0.000 | 1.064 | 1.382 | 15.046 | 0.625 | n/a | 0.296 | 54.650 | n/a | n/a | 0.075 | 9.430 | 0.116 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.548ms; driver.publication 1.447ms |

## P2 / L1024 / commit / 5-10 facts (492 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.972 | 0.663 | 0.000 | 1.476 | 3.244 | 0.005 | 0.000 | 0.758 | 0.849 | 1.102 | 0.039 | n/a | 0.170 | 7.446 | n/a | n/a | 0.038 | 4.175 | 0.286 | 0.038 |
| p99 | 102.377 | 2.507 | 0.083 | 5.059 | 11.789 | 0.285 | 0.000 | 32.570 | 13.485 | 9.935 | 2.652 | n/a | 3.385 | 59.692 | n/a | n/a | 0.117 | 39.060 | 0.792 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f000000000000038a | 143.869 | 5.313 | 0.009 | 0.000 | 79.406 | 0.967 | 5.668 | 0.049 | n/a | 0.107 | 52.296 | n/a | n/a | 0.056 | 84.727 | 0.589 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 2.278ms; driver.publication 2.044ms; driver.publication 1.569ms |
| 1a33321f4e326b0f0000000000000734 | 114.796 | 7.355 | 0.285 | 0.000 | 27.005 | 14.973 | 5.000 | 0.074 | n/a | 0.345 | 59.692 | n/a | n/a | 0.065 | 34.645 | 0.302 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 20.111ms; driver.publication 6.997ms |
| 1a33321f4e326b0f000000000000038c | 111.357 | 2.914 | 0.006 | 0.000 | 0.923 | 5.891 | 2.153 | 0.107 | n/a | 0.131 | 99.191 | n/a | n/a | 0.040 | 3.843 | 0.035 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 2.278ms; driver.publication 1.569ms; driver.publication 1.247ms |
| 1a33321f4e326b0f000000000000038e | 102.824 | 4.818 | 0.012 | 0.000 | 1.311 | 4.417 | 1.646 | 0.072 | n/a | 0.167 | 90.320 | n/a | n/a | 0.062 | 6.142 | 0.060 | 0.062 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 2.747ms; driver.publication 2.392ms; driver.publication 1.569ms |
| 1a33321f4e326b0f0000000000000733 | 102.377 | 12.365 | 0.010 | 0.000 | 26.686 | 8.997 | 1.917 | 0.072 | n/a | 0.145 | 52.131 | n/a | n/a | 0.054 | 39.060 | 0.382 | 0.054 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 20.111ms |
| 1a33321f4e326b0f0000000000000740 | 92.419 | 3.764 | 0.004 | 0.000 | 78.437 | 0.577 | 1.348 | 0.061 | n/a | 0.228 | 7.951 | n/a | n/a | 0.048 | 82.205 | 0.889 | 0.048 | node-14/thread-0/driver.queue.subject | driver.publication 5.876ms; driver.publication 2.308ms; driver.publication 2.147ms; driver.publication 1.993ms; driver.publication 1.882ms |
| 1a33321f4e326b0f0000000000000383 | 82.151 | 4.277 | 0.007 | 0.000 | 0.355 | 5.922 | 1.535 | 0.037 | n/a | 0.101 | 69.868 | n/a | n/a | 0.048 | 4.639 | 0.056 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.447ms |
| 1a33321f4e326b0f0000000000000384 | 81.504 | 8.357 | 0.009 | 0.000 | 1.064 | 1.382 | 15.046 | 0.625 | n/a | 0.296 | 54.650 | n/a | n/a | 0.075 | 9.430 | 0.116 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.548ms; driver.publication 1.447ms |
| 1a33321f4e326b0f0000000000000415 | 76.252 | 3.288 | 0.008 | 0.000 | 21.603 | 6.096 | 2.740 | 0.049 | n/a | 0.512 | 41.915 | n/a | n/a | 0.042 | 24.899 | 0.327 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.759ms; driver.publication 1.439ms; driver.publication 1.334ms; driver.publication 1.185ms; driver.publication 1.077ms |
| 1a33321f4e326b0f0000000000000736 | 73.146 | 7.543 | 0.006 | 0.000 | 9.463 | 14.846 | 3.058 | 0.115 | n/a | 0.150 | 37.828 | n/a | n/a | 0.136 | 17.013 | 0.233 | 0.136 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 6.997ms; driver.publication 1.461ms |
| 1a33321f4e326b0f0000000000000386 | 70.792 | 7.450 | 0.011 | 0.000 | 0.711 | 2.691 | 4.754 | 0.112 | n/a | 0.198 | 54.746 | n/a | n/a | 0.117 | 8.173 | 0.115 | 0.117 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.278ms; driver.publication 2.044ms; driver.publication 1.548ms; driver.publication 1.447ms |
| 1a33321f4e326b0f000000000000075f | 70.384 | 3.289 | 0.004 | 0.000 | 0.815 | 0.814 | 1.607 | 0.058 | n/a | 0.150 | 63.598 | n/a | n/a | 0.049 | 4.109 | 0.058 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.917ms; driver.publication 2.529ms; driver.publication 1.626ms; driver.publication 1.297ms; driver.publication 1.205ms |
| 1a33321f4e326b0f0000000000000385 | 68.566 | 14.867 | 0.020 | 0.000 | 7.476 | 3.500 | 11.080 | 2.091 | n/a | 0.335 | 28.766 | n/a | n/a | 0.432 | 22.362 | 0.326 | 0.432 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.044ms; driver.publication 1.548ms; driver.publication 1.447ms |
| 1a33321f4e326b0f0000000000000738 | 65.128 | 7.294 | 0.275 | 0.000 | 5.042 | 9.123 | 5.746 | 0.014 | n/a | 0.191 | 37.404 | n/a | n/a | 0.038 | 12.611 | 0.194 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.997ms; driver.publication 3.910ms; driver.publication 1.712ms; driver.publication 1.461ms |
| 1a33321f4e326b0f00000000000004ae | 64.919 | 5.111 | 0.086 | 0.000 | 0.953 | 5.230 | 0.896 | 0.773 | n/a | 0.403 | 51.400 | n/a | n/a | 0.066 | 6.150 | 0.095 | 0.066 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.296ms; driver.publication 1.097ms; driver.expected-state.bind-receipt 1.040ms; driver.publication 1.011ms |
| 1a33321f4e326b0f0000000000000737 | 64.793 | 5.271 | 0.010 | 0.000 | 5.868 | 15.531 | 10.411 | 0.065 | n/a | 0.194 | 27.378 | n/a | n/a | 0.065 | 11.149 | 0.172 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 6.997ms; driver.publication 3.910ms; driver.publication 1.461ms |
| 1a33321f4e326b0f000000000000036e | 62.009 | 3.079 | 0.033 | 0.000 | 50.240 | 1.443 | 0.979 | 0.038 | n/a | 0.142 | 6.013 | n/a | n/a | 0.042 | 53.352 | 0.860 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 7.314ms; driver.publication 1.393ms; driver.publication 1.071ms; driver.publication 1.049ms |
| 1a33321f4e326b0f0000000000000761 | 61.800 | 4.562 | 0.009 | 0.000 | 9.877 | 2.852 | 1.492 | 0.063 | n/a | 0.255 | 42.629 | n/a | n/a | 0.060 | 14.448 | 0.234 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.917ms; driver.publication 2.529ms; driver.publication 1.626ms; driver.publication 1.297ms; driver.publication 1.034ms |
| 1a33321f4e326b0f000000000000041d | 60.586 | 4.728 | 0.008 | 0.000 | 1.177 | 2.883 | 1.488 | 3.357 | n/a | 0.032 | 46.877 | n/a | n/a | 0.036 | 5.912 | 0.098 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.759ms; driver.publication 1.194ms; driver.publication 1.077ms; driver.publication 1.029ms |
| 1a33321f4e326b0f000000000000073f | 59.608 | 5.516 | 7.962 | 0.000 | 6.369 | 6.558 | 1.092 | 8.882 | n/a | 0.174 | 23.006 | n/a | n/a | 0.048 | 19.848 | 0.333 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.910ms; driver.publication 2.147ms; driver.publication 1.993ms; driver.publication 1.712ms; driver.publication 1.564ms |

## P2/P4 / read-your-own-write / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 97.095 | n/a | n/a | n/a | 36.240 | 8.256 | 2.273 | 0.000 | 0.415 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.027 | 66.208 | 0.641 | 29.027 |
| p99 | 285.749 | n/a | n/a | n/a | 75.767 | 179.847 | 11.506 | 0.000 | 75.945 | 64.069 | 0.002 | n/a | 0.047 | 0.000 | n/a | n/a | 160.353 | 236.259 | 1.000 | 160.353 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000001763 | 285.749 | 36.240 | 179.847 | 0.000 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.396 | 216.088 | 0.756 | 69.396 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.175ms; driver.publication 1.952ms; driver.publication 1.518ms; driver.expected-state.bind-receipt 1.434ms; driver.publication 1.425ms |
| 1a33321f4e326b0f0000000000001754 | 267.429 | 36.148 | 152.989 | 0.741 | 0.000 | 0.297 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.253 | 189.878 | 0.710 | 77.253 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.175ms; driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.274ms; driver.publication 1.236ms |
| 1a33321f4e326b0f0000000000001759 | 255.694 | 71.281 | 153.472 | 11.506 | 0.000 | 0.454 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.981 | 236.259 | 0.924 | 18.981 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.175ms; driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.274ms; driver.publication 1.236ms |
| 1a33321f4e326b0f0000000000001766 | 230.041 | 42.148 | 146.302 | 2.083 | 0.000 | 0.354 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.153 | 190.534 | 0.828 | 39.153 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.175ms; driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.274ms; driver.publication 1.107ms |
| 1a33321f4e326b0f000000000000176b | 227.504 | 49.424 | 57.153 | 3.475 | 0.000 | 0.561 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 116.891 | 110.052 | 0.484 | 116.891 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.175ms; driver.publication 1.952ms; driver.expected-state.bind-receipt 1.434ms; driver.publication 1.319ms; driver.publication 1.274ms |
| 1a33321f4e326b0f00000000000019ce | 218.356 | 67.386 | 56.589 | 9.491 | 0.000 | 0.224 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.666 | 133.466 | 0.611 | 84.666 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.270ms; driver.publication 1.253ms; driver.publication 1.171ms; driver.publication 1.164ms; driver.publication 1.069ms |
| 1a33321f4e326b0f0000000000001750 | 193.816 | 23.176 | 8.176 | 1.671 | 0.000 | 0.441 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 160.353 | 33.022 | 0.170 | 160.353 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.292ms; driver.publication 1.236ms; driver.publication 1.171ms |
| 1a33321f4e326b0f000000000000175b | 190.200 | 57.364 | 128.803 | 1.603 | 0.000 | 0.147 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.283 | 187.770 | 0.987 | 2.283 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.169ms; driver.publication 1.056ms; driver.publication 1.047ms |
| 1a33321f4e326b0f000000000000176c | 186.366 | 60.144 | 58.320 | 3.170 | 0.000 | 0.302 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.429 | 121.635 | 0.653 | 64.429 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.175ms; driver.publication 1.952ms; driver.publication 1.274ms; driver.publication 1.107ms; driver.publication 1.033ms |
| 1a33321f4e326b0f0000000000001081 | 178.331 | 54.366 | 23.912 | 5.535 | 0.000 | 62.994 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.525 | 83.813 | 0.470 | 31.525 | node-14/thread-3/socket.body-read | driver.publication 4.078ms; driver.publication 1.464ms; driver.expected-state.bind-receipt 1.450ms; driver.expected-state.bind-receipt 1.435ms; driver.publication 1.375ms |
| 1a33321f4e326b0f000000000000063b | 176.698 | 30.110 | 53.029 | 0.000 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 93.205 | 83.139 | 0.471 | 93.205 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.461ms; driver.publication 1.670ms; driver.publication 1.533ms; driver.publication 1.278ms; driver.publication 1.232ms |
| 1a33321f4e326b0f0000000000001752 | 174.064 | 39.151 | 3.739 | 1.877 | 0.000 | 0.392 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 128.906 | 44.767 | 0.257 | 128.906 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.236ms; driver.publication 1.171ms; driver.publication 1.169ms |
| 1a33321f4e326b0f00000000000019c6 | 161.517 | 23.851 | 8.256 | 1.632 | 0.000 | 0.177 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 127.602 | 33.738 | 0.209 | 127.602 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.270ms; driver.publication 1.171ms; driver.publication 1.164ms; driver.publication 1.069ms; driver.publication 1.053ms |
| 1a33321f4e326b0f0000000000000638 | 161.258 | 38.362 | 53.355 | 0.000 | 0.000 | 1.091 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.450 | 91.717 | 0.569 | 68.450 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.461ms; driver.publication 1.728ms; driver.publication 1.670ms; driver.publication 1.533ms; driver.publication 1.209ms |
| 1a33321f4e326b0f00000000000019c9 | 159.314 | 26.588 | 56.721 | 4.957 | 0.000 | 0.253 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.794 | 88.267 | 0.554 | 70.794 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.270ms; driver.publication 1.171ms; driver.publication 1.164ms; driver.publication 1.069ms; driver.publication 1.053ms |
| 1a33321f4e326b0f000000000000063e | 158.623 | 25.612 | 55.225 | 0.000 | 0.000 | 0.447 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.341 | 80.836 | 0.510 | 77.341 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.461ms; driver.publication 1.670ms; driver.publication 1.278ms; driver.publication 1.232ms; driver.publication 1.209ms |
| 1a33321f4e326b0f0000000000001761 | 156.593 | 35.754 | 107.702 | 0.000 | 0.000 | 0.163 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.975 | 143.456 | 0.916 | 12.975 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.952ms; driver.publication 1.425ms; driver.publication 1.056ms; driver.publication 1.047ms; driver.publication 1.033ms |
| 1a33321f4e326b0f000000000000174e | 153.133 | 43.260 | 13.552 | 7.410 | 0.000 | 75.945 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.966 | 64.222 | 0.419 | 12.966 | node-14/thread-3/socket.body-read | driver.publication 1.473ms; driver.publication 1.425ms; driver.publication 1.292ms; driver.publication 1.236ms; driver.publication 1.171ms |
| 1a33321f4e326b0f0000000000000637 | 150.702 | 56.412 | 17.178 | 9.931 | 0.000 | 3.045 | 64.069 | 0.002 | n/a | 0.047 | 0.000 | n/a | n/a | 0.017 | 83.522 | 0.554 | 0.017 | gw-r/thread-42/gateway.admitted-work | driver.publication 2.461ms; driver.publication 1.728ms; driver.publication 1.670ms; driver.publication 1.533ms; driver.publication 1.402ms |
| 1a33321f4e326b0f00000000000003ac | 143.973 | 16.198 | 13.707 | 0.000 | 0.000 | 1.032 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 113.035 | 29.906 | 0.208 | 113.035 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.388ms; driver.publication 1.220ms; driver.publication 1.132ms; driver.publication 1.057ms; driver.publication 1.034ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.453 | 0.717 | 0.000 | 1.599 | 3.596 | 0.005 | 0.000 | 0.736 | 0.704 | 1.097 | 0.030 | n/a | 0.099 | 5.370 | n/a | n/a | 0.033 | 4.563 | 0.361 | 0.033 |
| p99 | 61.260 | 3.061 | 0.066 | 5.225 | 11.240 | 0.980 | 0.000 | 19.519 | 12.757 | 9.759 | 2.097 | n/a | 2.861 | 36.619 | n/a | n/a | 0.095 | 26.513 | 0.715 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000001184 | 185.374 | 40.958 | 0.139 | 6.700 | 6.491 | 86.084 | 3.730 | 2.698 | n/a | 0.102 | 38.422 | n/a | n/a | 0.049 | 54.289 | 0.293 | 0.049 | node-14/thread-0/socket.wait-first-byte | driver.publication 26.099ms; driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 3.979ms |
| 1a33321f4e326b0f000000000000118e | 156.056 | 6.195 | 24.323 | 0.000 | 99.923 | 7.522 | 1.406 | 7.094 | n/a | 0.555 | 8.992 | n/a | n/a | 0.045 | 130.441 | 0.836 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 2.829ms; driver.publication 2.311ms |
| 1a33321f4e326b0f0000000000001195 | 110.012 | 6.768 | 0.010 | 0.000 | 88.973 | 0.823 | 2.094 | 0.061 | n/a | 0.096 | 11.151 | n/a | n/a | 0.035 | 95.751 | 0.870 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 5.917ms; driver.publication 2.829ms; driver.publication 2.311ms; driver.publication 2.053ms; driver.publication 2.050ms |
| 1a33321f4e326b0f000000000000118d | 102.399 | 16.238 | 0.860 | 0.000 | 22.128 | 8.146 | 10.609 | 0.055 | n/a | 0.108 | 44.222 | n/a | n/a | 0.032 | 39.227 | 0.383 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 3.979ms; driver.publication 1.596ms |
| 1a33321f4e326b0f0000000000001190 | 96.556 | 16.884 | 2.777 | 0.000 | 9.731 | 17.162 | 15.528 | 0.077 | n/a | 0.168 | 34.202 | n/a | n/a | 0.026 | 29.393 | 0.304 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.917ms; driver.publication 2.030ms; driver.publication 1.596ms; driver.expected-state.bind-receipt 1.449ms |
| 1a33321f4e326b0f000000000000126e | 93.104 | 4.589 | 0.088 | 0.000 | 1.614 | 4.019 | 1.090 | 1.480 | n/a | 0.035 | 80.165 | n/a | n/a | 0.024 | 6.290 | 0.068 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.822ms; driver.expected-state.bind-receipt 1.709ms; driver.publication 1.225ms; driver.publication 1.122ms; driver.publication 1.112ms |
| 1a33321f4e326b0f000000000000118f | 92.952 | 10.843 | 2.526 | 0.000 | 19.633 | 9.364 | 6.203 | 0.700 | n/a | 0.208 | 43.446 | n/a | n/a | 0.029 | 33.002 | 0.355 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 0.896ms |
| 1a33321f4e326b0f000000000000118c | 91.256 | 13.303 | 0.011 | 0.000 | 22.217 | 5.343 | 2.325 | 0.061 | n/a | 3.652 | 44.266 | n/a | n/a | 0.078 | 35.531 | 0.389 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 3.979ms |
| 1a33321f4e326b0f00000000000012c4 | 87.191 | 18.927 | 0.010 | 0.000 | 0.527 | 10.579 | 15.967 | 0.079 | n/a | 2.065 | 38.969 | n/a | n/a | 0.069 | 19.463 | 0.223 | 0.069 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.690ms; driver.publication 1.553ms; driver.publication 1.549ms; driver.publication 1.402ms; driver.publication 1.389ms |
| 1a33321f4e326b0f0000000000001192 | 78.649 | 5.265 | 0.012 | 0.000 | 29.079 | 22.623 | 1.276 | 0.049 | n/a | 0.510 | 19.798 | n/a | n/a | 0.038 | 34.356 | 0.437 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 17.459ms; driver.publication 5.917ms; driver.publication 2.311ms; driver.publication 2.030ms; driver.publication 1.596ms |
| 1a33321f4e326b0f0000000000001183 | 78.539 | 6.798 | 0.007 | 0.000 | 15.282 | 13.144 | 4.027 | 0.061 | n/a | 0.504 | 38.676 | n/a | n/a | 0.040 | 22.088 | 0.281 | 0.040 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 26.099ms; driver.publication 12.795ms; driver.publication 1.536ms; driver.expected-state.bind-receipt 1.065ms; driver.expected-state.bind-receipt 1.036ms |
| 1a33321f4e326b0f000000000000126d | 78.301 | 3.579 | 0.007 | 0.000 | 2.419 | 2.500 | 2.016 | 3.275 | n/a | 0.123 | 64.350 | n/a | n/a | 0.033 | 6.004 | 0.077 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.822ms; driver.expected-state.bind-receipt 1.709ms; driver.publication 1.225ms; driver.publication 1.112ms |
| 1a33321f4e326b0f0000000000001193 | 76.304 | 8.804 | 3.848 | 0.000 | 22.857 | 21.041 | 0.745 | 0.025 | n/a | 0.273 | 18.673 | n/a | n/a | 0.038 | 35.509 | 0.465 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 17.459ms; driver.publication 5.917ms; driver.publication 2.311ms; driver.publication 2.030ms; driver.publication 1.596ms |
| 1a33321f4e326b0f0000000000001487 | 76.289 | 5.602 | 0.007 | 0.000 | 55.129 | 1.830 | 2.516 | 0.093 | n/a | 3.042 | 8.043 | n/a | n/a | 0.026 | 60.739 | 0.796 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 1.275ms; driver.publication 1.233ms; driver.publication 1.115ms; driver.expected-state.bind-receipt 1.006ms |
| 1a33321f4e326b0f0000000000001180 | 73.398 | 29.756 | 0.010 | 0.000 | 0.127 | 3.679 | 1.220 | 0.035 | n/a | 1.748 | 36.766 | n/a | n/a | 0.057 | 29.893 | 0.407 | 0.057 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 15.027ms; driver.publication 4.197ms; driver.expected-state.bind-receipt 1.036ms |
| 1a33321f4e326b0f0000000000001189 | 73.238 | 23.851 | 0.006 | 0.000 | 3.732 | 29.183 | 2.981 | 0.060 | n/a | 0.907 | 12.485 | n/a | n/a | 0.033 | 27.589 | 0.377 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.933ms; driver.publication 3.979ms; driver.publication 1.536ms; driver.expected-state.bind-receipt 1.065ms |
| 1a33321f4e326b0f000000000000126c | 72.134 | 7.526 | 0.005 | 0.000 | 2.319 | 0.696 | 9.030 | 0.069 | n/a | 0.127 | 52.321 | n/a | n/a | 0.040 | 9.850 | 0.137 | 0.040 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.822ms; driver.publication 1.225ms |
| 1a33321f4e326b0f00000000000011d5 | 71.655 | 1.983 | 0.003 | 0.000 | 60.246 | 4.070 | 0.951 | 0.026 | n/a | 0.100 | 4.259 | n/a | n/a | 0.018 | 62.232 | 0.868 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication 3.859ms; driver.publication 2.164ms; driver.publication 1.590ms; driver.publication 1.328ms; driver.publication 1.306ms |
| 1a33321f4e326b0f0000000000001ac1 | 68.142 | 5.878 | 0.006 | 0.000 | 20.629 | 3.477 | 1.347 | 0.047 | n/a | 0.087 | 36.619 | n/a | n/a | 0.053 | 26.513 | 0.389 | 0.053 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.288ms; driver.publication 1.210ms; driver.publication 1.160ms; driver.publication 1.091ms; driver.publication 1.071ms |
| 1a33321f4e326b0f00000000000009f8 | 67.844 | 3.072 | 0.004 | 0.000 | 1.741 | 3.690 | 1.258 | 0.051 | n/a | 0.155 | 57.842 | n/a | n/a | 0.033 | 4.816 | 0.071 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.946ms; driver.publication 1.116ms; driver.publication 1.106ms; driver.publication 1.019ms |

## P2 / tail / commit / 5-10 facts (1556 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.057 | 0.591 | 0.000 | 1.456 | 3.145 | 0.005 | 0.000 | 0.729 | 0.685 | 0.937 | 0.030 | n/a | 0.099 | 4.871 | n/a | n/a | 0.032 | 4.006 | 0.353 | 0.032 |
| p99 | 63.547 | 2.232 | 0.052 | 4.798 | 9.079 | 0.176 | 0.000 | 21.401 | 12.757 | 5.219 | 2.302 | n/a | 2.679 | 36.619 | n/a | n/a | 0.095 | 29.893 | 0.709 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1a33321f4e326b0f0000000000001184 | 185.374 | 40.958 | 0.139 | 6.700 | 6.491 | 86.084 | 3.730 | 2.698 | n/a | 0.102 | 38.422 | n/a | n/a | 0.049 | 54.289 | 0.293 | 0.049 | node-14/thread-0/socket.wait-first-byte | driver.publication 26.099ms; driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 3.979ms |
| 1a33321f4e326b0f000000000000118e | 156.056 | 6.195 | 24.323 | 0.000 | 99.923 | 7.522 | 1.406 | 7.094 | n/a | 0.555 | 8.992 | n/a | n/a | 0.045 | 130.441 | 0.836 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 2.829ms; driver.publication 2.311ms |
| 1a33321f4e326b0f0000000000001190 | 96.556 | 16.884 | 2.777 | 0.000 | 9.731 | 17.162 | 15.528 | 0.077 | n/a | 0.168 | 34.202 | n/a | n/a | 0.026 | 29.393 | 0.304 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.917ms; driver.publication 2.030ms; driver.publication 1.596ms; driver.expected-state.bind-receipt 1.449ms |
| 1a33321f4e326b0f000000000000126e | 93.104 | 4.589 | 0.088 | 0.000 | 1.614 | 4.019 | 1.090 | 1.480 | n/a | 0.035 | 80.165 | n/a | n/a | 0.024 | 6.290 | 0.068 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.822ms; driver.expected-state.bind-receipt 1.709ms; driver.publication 1.225ms; driver.publication 1.122ms; driver.publication 1.112ms |
| 1a33321f4e326b0f000000000000118f | 92.952 | 10.843 | 2.526 | 0.000 | 19.633 | 9.364 | 6.203 | 0.700 | n/a | 0.208 | 43.446 | n/a | n/a | 0.029 | 33.002 | 0.355 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 5.917ms; driver.publication 0.896ms |
| 1a33321f4e326b0f000000000000118c | 91.256 | 13.303 | 0.011 | 0.000 | 22.217 | 5.343 | 2.325 | 0.061 | n/a | 3.652 | 44.266 | n/a | n/a | 0.078 | 35.531 | 0.389 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 17.459ms; driver.publication 5.933ms; driver.publication 3.979ms |
| 1a33321f4e326b0f0000000000001192 | 78.649 | 5.265 | 0.012 | 0.000 | 29.079 | 22.623 | 1.276 | 0.049 | n/a | 0.510 | 19.798 | n/a | n/a | 0.038 | 34.356 | 0.437 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 17.459ms; driver.publication 5.917ms; driver.publication 2.311ms; driver.publication 2.030ms; driver.publication 1.596ms |
| 1a33321f4e326b0f0000000000001183 | 78.539 | 6.798 | 0.007 | 0.000 | 15.282 | 13.144 | 4.027 | 0.061 | n/a | 0.504 | 38.676 | n/a | n/a | 0.040 | 22.088 | 0.281 | 0.040 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 26.099ms; driver.publication 12.795ms; driver.publication 1.536ms; driver.expected-state.bind-receipt 1.065ms; driver.expected-state.bind-receipt 1.036ms |
| 1a33321f4e326b0f000000000000126d | 78.301 | 3.579 | 0.007 | 0.000 | 2.419 | 2.500 | 2.016 | 3.275 | n/a | 0.123 | 64.350 | n/a | n/a | 0.033 | 6.004 | 0.077 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.822ms; driver.expected-state.bind-receipt 1.709ms; driver.publication 1.225ms; driver.publication 1.112ms |
| 1a33321f4e326b0f0000000000001193 | 76.304 | 8.804 | 3.848 | 0.000 | 22.857 | 21.041 | 0.745 | 0.025 | n/a | 0.273 | 18.673 | n/a | n/a | 0.038 | 35.509 | 0.465 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 17.459ms; driver.publication 5.917ms; driver.publication 2.311ms; driver.publication 2.030ms; driver.publication 1.596ms |
| 1a33321f4e326b0f0000000000001487 | 76.289 | 5.602 | 0.007 | 0.000 | 55.129 | 1.830 | 2.516 | 0.093 | n/a | 3.042 | 8.043 | n/a | n/a | 0.026 | 60.739 | 0.796 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 1.275ms; driver.publication 1.233ms; driver.publication 1.115ms; driver.expected-state.bind-receipt 1.006ms |
| 1a33321f4e326b0f0000000000001180 | 73.398 | 29.756 | 0.010 | 0.000 | 0.127 | 3.679 | 1.220 | 0.035 | n/a | 1.748 | 36.766 | n/a | n/a | 0.057 | 29.893 | 0.407 | 0.057 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 15.027ms; driver.publication 4.197ms; driver.expected-state.bind-receipt 1.036ms |
| 1a33321f4e326b0f00000000000011d5 | 71.655 | 1.983 | 0.003 | 0.000 | 60.246 | 4.070 | 0.951 | 0.026 | n/a | 0.100 | 4.259 | n/a | n/a | 0.018 | 62.232 | 0.868 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication 3.859ms; driver.publication 2.164ms; driver.publication 1.590ms; driver.publication 1.328ms; driver.publication 1.306ms |
| 1a33321f4e326b0f0000000000001ac1 | 68.142 | 5.878 | 0.006 | 0.000 | 20.629 | 3.477 | 1.347 | 0.047 | n/a | 0.087 | 36.619 | n/a | n/a | 0.053 | 26.513 | 0.389 | 0.053 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.288ms; driver.publication 1.210ms; driver.publication 1.160ms; driver.publication 1.091ms; driver.publication 1.071ms |
| 1a33321f4e326b0f00000000000009f8 | 67.844 | 3.072 | 0.004 | 0.000 | 1.741 | 3.690 | 1.258 | 0.051 | n/a | 0.155 | 57.842 | n/a | n/a | 0.033 | 4.816 | 0.071 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.946ms; driver.publication 1.116ms; driver.publication 1.106ms; driver.publication 1.019ms |
| 1a33321f4e326b0f00000000000011d2 | 63.547 | 12.382 | 0.013 | 0.000 | 0.396 | 12.613 | 5.090 | 0.109 | n/a | 10.902 | 21.999 | n/a | n/a | 0.043 | 12.792 | 0.201 | 0.043 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 3.859ms; driver.publication 1.590ms; driver.publication 1.306ms; driver.expected-state.bind-receipt 1.206ms; driver.publication 1.036ms |
| 1a33321f4e326b0f0000000000001486 | 63.057 | 3.584 | 0.007 | 0.000 | 27.667 | 1.329 | 25.560 | 0.010 | n/a | 0.055 | 4.811 | n/a | n/a | 0.034 | 31.259 | 0.496 | 0.034 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 1a33321f4e326b0f00000000000011fa | 62.451 | 15.226 | 0.019 | 0.000 | 0.934 | 12.757 | 8.698 | 0.110 | n/a | 4.943 | 19.714 | n/a | n/a | 0.049 | 16.179 | 0.259 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.679ms; driver.publication 1.226ms |
| 1a33321f4e326b0f0000000000001198 | 61.260 | 4.642 | 0.490 | 0.000 | 6.643 | 35.991 | 1.303 | 0.040 | n/a | 0.694 | 11.435 | n/a | n/a | 0.022 | 11.776 | 0.192 | 0.022 | node-14/thread-0/socket.queue-and-write | driver.publication 5.071ms; driver.publication 2.829ms; driver.publication 2.311ms; driver.publication 2.050ms; driver.publication 2.030ms |
| 1a33321f4e326b0f00000000000009f5 | 59.196 | 2.878 | 0.004 | 0.000 | 0.425 | 2.635 | 0.536 | 1.925 | n/a | 0.078 | 50.680 | n/a | n/a | 0.033 | 3.308 | 0.056 | 0.033 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.155ms; driver.publication 1.116ms; driver.publication 1.106ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.544 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 200.623 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 |
| p99 | 391.724 | n/a | n/a | n/a | 23.315 | n/a | 2.583 | 0.000 | 11.540 | 381.858 | 0.101 | n/a | 0.130 | 0.000 | n/a | n/a | 34.101 | 25.898 | 0.276 | 34.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e310000000000000002 | 391.724 | 2.350 | n/a | 0.000 | 0.000 | 6.993 | 381.858 | 0.101 | n/a | 0.103 | 0.000 | n/a | n/a | 0.320 | 2.350 | 0.006 | 0.320 | gw-r/thread-47/gateway.admitted-work | none observed |
| 55bddaef20758d9f0000000000000005 | 205.597 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 203.990 | 0.026 | n/a | 0.114 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000006 | 204.139 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 202.857 | 0.015 | n/a | 0.130 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000f00 | 201.666 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 200.873 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000f01 | 201.544 | 0.000 | n/a | 0.000 | 0.000 | 0.674 | 200.623 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-63/journal/page | none observed |
| 55bddaef20758d9f0000000000000f02 | 201.136 | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 200.500 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-64/journal/page | none observed |
| 55bddaef20758d9f0000000000000f05 | 94.059 | 23.315 | n/a | 2.583 | 0.000 | 2.138 | 65.807 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.208 | 25.898 | 0.275 | 0.208 | gw-r/thread-42/gateway.admitted-work | none observed |
| 55bddaef20758d9f0000000000000f06 | 75.867 | 16.540 | n/a | 0.000 | 0.000 | 2.793 | 56.332 | 0.003 | n/a | 0.005 | 0.000 | n/a | n/a | 0.193 | 16.540 | 0.218 | 0.193 | gw-r/thread-64/gateway.admitted-work | none observed |
| 55bddaef20758d9f0000000000000f07 | 63.046 | 17.405 | n/a | 0.000 | 0.000 | 11.540 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.101 | 17.405 | 0.276 | 34.101 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 818.710 | n/a | n/a | n/a | 0.227 | n/a | 0.000 | 0.000 | 0.727 | 804.857 | 0.009 | n/a | 0.187 | 0.000 | n/a | n/a | 0.219 | 0.227 | 0.000 | 0.219 |
| p99 | 1005.473 | n/a | n/a | n/a | 12.709 | n/a | 0.000 | 0.000 | 1.793 | 1001.893 | 0.011 | n/a | 0.288 | 0.000 | n/a | n/a | 1.264 | 12.709 | 0.016 | 1.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e3100000000000000a4 | 1005.473 | 0.227 | n/a | 0.000 | 0.000 | 1.793 | 1001.893 | 0.009 | n/a | 0.288 | 0.000 | n/a | n/a | 1.264 | 0.227 | 0.000 | 1.264 | gw-r/thread-44/journal/page | none observed |
| a63fdde241090e3100000000000000a5 | 818.710 | 12.709 | n/a | 0.000 | 0.000 | 0.727 | 804.857 | 0.011 | n/a | 0.187 | 0.000 | n/a | n/a | 0.219 | 12.709 | 0.016 | 0.219 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 425.090 | n/a | n/a | n/a | 3.158 | n/a | 0.000 | 0.000 | 0.945 | 421.300 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.108 | 3.158 | 0.007 | 0.108 |
| p99 | 1008.286 | n/a | n/a | n/a | 9.979 | n/a | 0.000 | 0.000 | 5.683 | 1000.487 | 0.525 | n/a | 0.212 | 0.000 | n/a | n/a | 2.343 | 9.979 | 0.572 | 2.343 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e3100000000000000ae | 1008.286 | 5.909 | n/a | 0.000 | 0.000 | 1.606 | 1000.487 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.184 | 5.909 | 0.006 | 0.184 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000000b4 | 997.141 | 2.848 | n/a | 0.000 | 0.000 | 1.947 | 992.095 | 0.022 | n/a | 0.131 | 0.000 | n/a | n/a | 0.099 | 2.848 | 0.003 | 0.099 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000000cf | 995.951 | 3.345 | n/a | 0.000 | 0.000 | 0.864 | 991.543 | 0.022 | n/a | 0.095 | 0.000 | n/a | n/a | 0.081 | 3.345 | 0.003 | 0.081 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000000bb | 994.879 | 6.135 | n/a | 0.000 | 0.000 | 1.973 | 986.348 | 0.039 | n/a | 0.177 | 0.000 | n/a | n/a | 0.207 | 6.135 | 0.006 | 0.207 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000000ba | 949.141 | 2.634 | n/a | 0.000 | 0.000 | 2.385 | 943.865 | 0.026 | n/a | 0.131 | 0.000 | n/a | n/a | 0.101 | 2.634 | 0.003 | 0.101 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e3100000000000000ab | 795.002 | 3.154 | n/a | 0.000 | 0.000 | 0.923 | 790.046 | 0.525 | n/a | 0.149 | 0.000 | n/a | n/a | 0.204 | 3.154 | 0.004 | 0.204 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000c1 | 750.011 | 9.563 | n/a | 0.000 | 0.000 | 0.918 | 739.222 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.211 | 9.563 | 0.013 | 0.211 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000a8 | 704.675 | 2.177 | n/a | 0.000 | 0.000 | 0.655 | 701.567 | 0.013 | n/a | 0.157 | 0.000 | n/a | n/a | 0.105 | 2.177 | 0.003 | 0.105 | gw-r/thread-44/journal/page | none observed |
| a63fdde241090e3100000000000000b2 | 703.516 | 3.595 | n/a | 0.000 | 0.000 | 0.787 | 698.904 | 0.020 | n/a | 0.102 | 0.000 | n/a | n/a | 0.108 | 3.595 | 0.005 | 0.108 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000c8 | 649.235 | 3.222 | n/a | 0.000 | 0.000 | 5.683 | 640.164 | 0.016 | n/a | 0.061 | 0.000 | n/a | n/a | 0.089 | 3.222 | 0.005 | 0.089 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000000ca | 634.300 | 2.752 | n/a | 0.000 | 0.000 | 0.885 | 630.433 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 0.083 | 2.752 | 0.004 | 0.083 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000000bf | 622.355 | 3.024 | n/a | 0.000 | 0.000 | 0.927 | 618.169 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.156 | 3.024 | 0.005 | 0.156 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000000c5 | 606.450 | 3.509 | n/a | 0.000 | 0.000 | 3.504 | 599.239 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.092 | 3.509 | 0.006 | 0.092 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000000a7 | 490.459 | 5.606 | n/a | 0.000 | 0.000 | 0.945 | 483.377 | 0.051 | n/a | 0.198 | 0.000 | n/a | n/a | 0.282 | 5.606 | 0.011 | 0.282 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000b8 | 425.090 | 2.905 | n/a | 0.000 | 0.000 | 0.638 | 421.300 | 0.036 | n/a | 0.115 | 0.000 | n/a | n/a | 0.094 | 2.905 | 0.007 | 0.094 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000000b7 | 423.108 | 2.807 | n/a | 0.000 | 0.000 | 1.152 | 418.955 | 0.023 | n/a | 0.092 | 0.000 | n/a | n/a | 0.079 | 2.807 | 0.007 | 0.079 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000000c4 | 383.127 | 2.310 | n/a | 0.000 | 0.000 | 2.546 | 378.061 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.119 | 2.310 | 0.006 | 0.119 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000000c7 | 349.588 | 2.707 | n/a | 0.000 | 0.000 | 0.783 | 345.917 | 0.025 | n/a | 0.076 | 0.000 | n/a | n/a | 0.080 | 2.707 | 0.008 | 0.080 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e3100000000000000b1 | 294.824 | 9.272 | n/a | 0.000 | 0.000 | 0.879 | 284.377 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.192 | 9.272 | 0.031 | 0.192 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000000cc | 260.197 | 2.092 | n/a | 0.000 | 0.000 | 1.723 | 256.182 | 0.016 | n/a | 0.086 | 0.000 | n/a | n/a | 0.098 | 2.092 | 0.008 | 0.098 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 443.978 | n/a | n/a | n/a | 4.582 | n/a | 0.627 | 0.000 | 0.796 | 437.109 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.146 | 5.172 | 0.013 | 0.146 |
| p99 | 1016.537 | n/a | n/a | n/a | 17.391 | n/a | 2.245 | 0.000 | 7.253 | 1002.180 | 0.062 | n/a | 0.148 | 0.000 | n/a | n/a | 46.773 | 19.636 | 0.806 | 46.773 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e31000000000000010c | 1016.537 | 6.873 | n/a | 0.000 | 0.000 | 7.253 | 1002.180 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.142 | 6.873 | 0.007 | 0.142 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000000d0 | 1004.687 | 0.172 | n/a | 0.000 | 0.000 | 1.645 | 1001.596 | 0.018 | n/a | 0.132 | 0.000 | n/a | n/a | 1.124 | 0.172 | 0.000 | 1.124 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000d8 | 999.796 | 4.044 | n/a | 0.740 | 0.000 | 0.726 | 994.104 | 0.013 | n/a | 0.070 | 0.000 | n/a | n/a | 0.099 | 4.784 | 0.005 | 0.099 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000000d2 | 994.837 | 5.066 | n/a | 0.599 | 0.000 | 0.978 | 987.876 | 0.062 | n/a | 0.148 | 0.000 | n/a | n/a | 0.108 | 5.665 | 0.006 | 0.108 | gw-r/thread-44/journal/page | none observed |
| a63fdde241090e310000000000000100 | 990.664 | 4.422 | n/a | 0.000 | 0.000 | 0.889 | 984.947 | 0.025 | n/a | 0.123 | 0.000 | n/a | n/a | 0.258 | 4.422 | 0.004 | 0.258 | gw-r/thread-44/journal/page | none observed |
| a63fdde241090e310000000000000104 | 989.147 | 2.754 | n/a | 0.628 | 0.000 | 0.737 | 984.837 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.113 | 3.382 | 0.003 | 0.113 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000000de | 988.633 | 6.371 | n/a | 1.071 | 0.000 | 1.099 | 979.907 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 0.093 | 7.441 | 0.008 | 0.093 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000000d9 | 986.234 | 6.404 | n/a | 0.829 | 0.000 | 0.733 | 978.063 | 0.017 | n/a | 0.090 | 0.000 | n/a | n/a | 0.100 | 7.232 | 0.007 | 0.100 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000000fd | 948.766 | 9.803 | n/a | 0.703 | 0.000 | 5.527 | 932.439 | 0.017 | n/a | 0.131 | 0.000 | n/a | n/a | 0.146 | 10.507 | 0.011 | 0.146 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000000dd | 890.281 | 4.795 | n/a | 0.733 | 0.000 | 2.621 | 881.801 | 0.062 | n/a | 0.054 | 0.000 | n/a | n/a | 0.215 | 5.528 | 0.006 | 0.215 | gw-r/thread-44/journal/page | none observed |
| a63fdde241090e3100000000000000e3 | 842.384 | 4.582 | n/a | 0.590 | 0.000 | 0.983 | 836.005 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.126 | 5.172 | 0.006 | 0.126 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000df | 772.062 | 3.888 | n/a | 0.576 | 0.000 | 0.702 | 766.734 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.089 | 4.464 | 0.006 | 0.089 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e310000000000000101 | 758.066 | 4.846 | n/a | 0.672 | 0.000 | 0.917 | 751.400 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.155 | 5.518 | 0.007 | 0.155 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000000db | 644.496 | 4.803 | n/a | 0.000 | 0.000 | 0.751 | 638.150 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.706 | 4.803 | 0.007 | 0.706 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e3100000000000000ea | 629.680 | 2.433 | n/a | 0.000 | 0.000 | 0.473 | 626.564 | 0.023 | n/a | 0.111 | 0.000 | n/a | n/a | 0.075 | 2.433 | 0.004 | 0.075 | gw-r/thread-44/journal/page | none observed |
| a63fdde241090e3100000000000000e6 | 590.942 | 17.391 | n/a | 2.245 | 0.000 | 0.929 | 569.902 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.388 | 19.636 | 0.033 | 0.388 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000000fa | 551.101 | 5.818 | n/a | 0.000 | 0.000 | 2.300 | 542.745 | 0.024 | n/a | 0.056 | 0.000 | n/a | n/a | 0.157 | 5.818 | 0.011 | 0.157 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000da | 477.118 | 8.416 | n/a | 1.532 | 0.000 | 0.595 | 466.316 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.179 | 9.948 | 0.021 | 0.179 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000000fb | 458.656 | 6.590 | n/a | 0.000 | 0.000 | 1.016 | 450.730 | 0.035 | n/a | 0.114 | 0.000 | n/a | n/a | 0.170 | 6.590 | 0.014 | 0.170 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000106 | 458.234 | 12.575 | n/a | 0.670 | 0.000 | 0.796 | 443.832 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.297 | 13.244 | 0.029 | 0.297 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 415.793 | n/a | n/a | n/a | 3.787 | n/a | 0.000 | 0.000 | 0.899 | 411.780 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.109 | 4.078 | 0.011 | 0.109 |
| p99 | 1018.012 | n/a | n/a | n/a | 12.148 | n/a | 2.279 | 0.000 | 12.682 | 1014.411 | 0.298 | n/a | 0.117 | 0.000 | n/a | n/a | 41.758 | 13.672 | 0.554 | 41.758 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e310000000000000125 | 1018.012 | 2.778 | n/a | 0.000 | 0.000 | 0.637 | 1014.411 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.068 | 2.778 | 0.003 | 0.068 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000129 | 1009.758 | 5.000 | n/a | 0.000 | 0.000 | 0.535 | 1004.095 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.079 | 5.000 | 0.005 | 0.079 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e31000000000000012a | 1008.959 | 0.342 | n/a | 0.000 | 0.000 | 1.264 | 1005.720 | 0.059 | n/a | 0.107 | 0.000 | n/a | n/a | 1.467 | 0.342 | 0.000 | 1.467 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e310000000000000113 | 1004.274 | 0.129 | n/a | 0.000 | 0.000 | 1.706 | 1001.242 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 1.104 | 0.129 | 0.000 | 1.104 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e31000000000000011c | 1000.194 | 4.351 | n/a | 0.000 | 0.000 | 4.796 | 990.187 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.800 | 4.351 | 0.004 | 0.800 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000137 | 993.934 | 3.749 | n/a | 0.000 | 0.000 | 1.177 | 988.895 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.072 | 3.749 | 0.004 | 0.072 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000140 | 989.595 | 3.519 | n/a | 0.000 | 0.000 | 0.649 | 985.259 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 3.519 | 0.004 | 0.104 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000110 | 795.790 | 2.343 | n/a | 1.326 | 0.000 | 0.584 | 791.391 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.081 | 3.669 | 0.005 | 0.081 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000148 | 786.769 | 2.749 | n/a | 2.279 | 0.000 | 0.521 | 781.009 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.133 | 5.027 | 0.006 | 0.133 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e31000000000000013c | 767.377 | 3.787 | n/a | 0.000 | 0.000 | 3.056 | 760.339 | 0.021 | n/a | 0.066 | 0.000 | n/a | n/a | 0.108 | 3.787 | 0.005 | 0.108 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000132 | 740.634 | 3.774 | n/a | 0.000 | 0.000 | 0.688 | 736.015 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.083 | 3.774 | 0.005 | 0.083 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e31000000000000011d | 707.536 | 2.709 | n/a | 0.000 | 0.000 | 1.748 | 702.978 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.079 | 2.709 | 0.004 | 0.079 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e310000000000000123 | 702.591 | 5.573 | n/a | 0.000 | 0.000 | 2.093 | 694.733 | 0.012 | n/a | 0.043 | 0.000 | n/a | n/a | 0.136 | 5.573 | 0.008 | 0.136 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000126 | 700.419 | 4.925 | n/a | 0.000 | 0.000 | 0.698 | 694.661 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.069 | 4.925 | 0.007 | 0.069 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e31000000000000012d | 674.348 | 6.110 | n/a | 0.000 | 0.000 | 12.682 | 655.302 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.206 | 6.110 | 0.009 | 0.206 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000000134 | 657.804 | 3.623 | n/a | 0.000 | 0.000 | 0.849 | 653.194 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.090 | 3.623 | 0.006 | 0.090 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e31000000000000010d | 645.396 | 6.889 | n/a | 0.857 | 0.000 | 1.506 | 635.800 | 0.005 | n/a | 0.117 | 0.000 | n/a | n/a | 0.222 | 7.746 | 0.012 | 0.222 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000141 | 596.583 | 5.543 | n/a | 0.748 | 0.000 | 3.652 | 586.445 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.126 | 6.291 | 0.011 | 0.126 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000138 | 543.007 | 11.106 | n/a | 0.624 | 0.000 | 1.393 | 529.709 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.117 | 11.731 | 0.022 | 0.117 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000139 | 472.711 | 4.164 | n/a | 0.000 | 0.000 | 1.039 | 467.366 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.073 | 4.164 | 0.009 | 0.073 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 381.181 | n/a | n/a | n/a | 3.033 | n/a | 0.000 | 0.000 | 0.778 | 372.483 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.102 | 3.103 | 0.008 | 0.102 |
| p99 | 1005.295 | n/a | n/a | n/a | 11.576 | n/a | 0.856 | 0.000 | 5.948 | 1001.519 | 0.033 | n/a | 0.166 | 0.000 | n/a | n/a | 22.579 | 11.576 | 0.659 | 22.579 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e310000000000000163 | 1005.295 | 0.342 | n/a | 0.000 | 0.000 | 2.142 | 1001.519 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 1.214 | 0.342 | 0.000 | 1.214 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000000184 | 1005.242 | 0.151 | n/a | 0.000 | 0.000 | 2.810 | 1001.101 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 1.122 | 0.151 | 0.000 | 1.122 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000172 | 1003.571 | 0.265 | n/a | 0.000 | 0.000 | 0.775 | 1001.270 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 1.166 | 0.265 | 0.000 | 1.166 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e31000000000000016d | 997.533 | 3.033 | n/a | 0.000 | 0.000 | 0.581 | 993.795 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.075 | 3.033 | 0.003 | 0.075 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000000153 | 994.007 | 6.233 | n/a | 0.000 | 0.000 | 5.948 | 981.523 | 0.005 | n/a | 0.083 | 0.000 | n/a | n/a | 0.214 | 6.233 | 0.006 | 0.214 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e31000000000000017e | 993.208 | 2.987 | n/a | 0.000 | 0.000 | 0.624 | 989.474 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.069 | 2.987 | 0.003 | 0.069 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000186 | 881.708 | 3.622 | n/a | 0.000 | 0.000 | 1.979 | 875.999 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.071 | 3.622 | 0.004 | 0.071 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000158 | 851.352 | 4.589 | n/a | 0.000 | 0.000 | 1.988 | 844.408 | 0.018 | n/a | 0.045 | 0.000 | n/a | n/a | 0.303 | 4.589 | 0.005 | 0.303 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000179 | 833.174 | 3.012 | n/a | 0.000 | 0.000 | 1.004 | 828.993 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.082 | 3.012 | 0.004 | 0.082 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000154 | 706.395 | 2.369 | n/a | 0.000 | 0.000 | 0.710 | 703.139 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.111 | 2.369 | 0.003 | 0.111 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e31000000000000016c | 670.004 | 4.943 | n/a | 0.000 | 0.000 | 0.560 | 664.331 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.135 | 4.943 | 0.007 | 0.135 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000182 | 664.447 | 2.947 | n/a | 0.000 | 0.000 | 0.928 | 660.457 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.074 | 2.947 | 0.004 | 0.074 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000176 | 640.178 | 4.131 | n/a | 0.000 | 0.000 | 1.407 | 634.489 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.085 | 4.131 | 0.006 | 0.085 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e31000000000000017c | 624.410 | 3.103 | n/a | 0.000 | 0.000 | 0.890 | 620.189 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.121 | 3.103 | 0.005 | 0.121 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000000189 | 616.535 | 2.973 | n/a | 0.848 | 0.000 | 0.655 | 611.882 | 0.030 | n/a | 0.046 | 0.000 | n/a | n/a | 0.102 | 3.821 | 0.006 | 0.102 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e31000000000000016f | 614.311 | 5.878 | n/a | 0.000 | 0.000 | 0.737 | 607.417 | 0.033 | n/a | 0.094 | 0.000 | n/a | n/a | 0.153 | 5.878 | 0.010 | 0.153 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e31000000000000014e | 555.198 | 2.500 | n/a | 0.000 | 0.000 | 0.816 | 551.712 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.087 | 2.500 | 0.005 | 0.087 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000165 | 507.326 | 11.576 | n/a | 0.000 | 0.000 | 3.586 | 491.922 | 0.021 | n/a | 0.051 | 0.000 | n/a | n/a | 0.170 | 11.576 | 0.023 | 0.170 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000166 | 488.945 | 3.540 | n/a | 0.000 | 0.000 | 0.630 | 484.621 | 0.021 | n/a | 0.049 | 0.000 | n/a | n/a | 0.084 | 3.540 | 0.007 | 0.084 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000151 | 439.379 | 2.640 | n/a | 0.000 | 0.000 | 0.857 | 435.761 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.072 | 2.640 | 0.006 | 0.072 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 322.530 | n/a | n/a | n/a | 3.732 | n/a | 0.000 | 0.000 | 0.646 | 319.148 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.090 | 3.732 | 0.014 | 0.090 |
| p99 | 1003.699 | n/a | n/a | n/a | 12.117 | n/a | 3.812 | 0.000 | 5.023 | 1001.094 | 0.139 | n/a | 0.104 | 0.000 | n/a | n/a | 43.967 | 15.930 | 0.647 | 43.967 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e3100000000000001c3 | 1003.699 | 0.117 | n/a | 0.000 | 0.000 | 1.399 | 1000.929 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 1.156 | 0.117 | 0.000 | 1.156 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e31000000000000018a | 1003.454 | 3.345 | n/a | 0.000 | 0.000 | 4.581 | 995.404 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.068 | 3.345 | 0.003 | 0.068 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000001a6 | 1003.235 | 0.195 | n/a | 0.000 | 0.000 | 0.583 | 1001.094 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 1.258 | 0.195 | 0.000 | 1.258 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000001a3 | 987.334 | 5.393 | n/a | 0.000 | 0.000 | 0.486 | 981.283 | 0.022 | n/a | 0.069 | 0.000 | n/a | n/a | 0.081 | 5.393 | 0.005 | 0.081 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000001c5 | 983.321 | 2.852 | n/a | 0.000 | 0.000 | 0.516 | 979.830 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.074 | 2.852 | 0.003 | 0.074 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000001a5 | 980.081 | 5.313 | n/a | 0.000 | 0.000 | 1.165 | 973.401 | 0.018 | n/a | 0.042 | 0.000 | n/a | n/a | 0.143 | 5.313 | 0.005 | 0.143 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000199 | 956.387 | 4.367 | n/a | 0.000 | 0.000 | 3.636 | 948.191 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.141 | 4.367 | 0.005 | 0.141 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000001c1 | 829.009 | 3.825 | n/a | 0.000 | 0.000 | 0.520 | 824.549 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.079 | 3.825 | 0.005 | 0.079 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e31000000000000019c | 822.956 | 4.650 | n/a | 0.000 | 0.000 | 3.416 | 814.760 | 0.014 | n/a | 0.045 | 0.000 | n/a | n/a | 0.071 | 4.650 | 0.006 | 0.071 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000001d5 | 718.988 | 2.026 | n/a | 0.000 | 0.000 | 0.678 | 716.144 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.074 | 2.026 | 0.003 | 0.074 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e3100000000000001b5 | 715.597 | 2.802 | n/a | 0.000 | 0.000 | 0.529 | 712.164 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.802 | 0.004 | 0.062 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000001ce | 611.641 | 2.672 | n/a | 0.000 | 0.000 | 0.618 | 608.186 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.112 | 2.672 | 0.004 | 0.112 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e31000000000000019f | 602.897 | 4.378 | n/a | 0.000 | 0.000 | 0.703 | 597.660 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.082 | 4.378 | 0.007 | 0.082 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000001b8 | 595.856 | 4.351 | n/a | 0.000 | 0.000 | 0.429 | 590.866 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.098 | 4.351 | 0.007 | 0.098 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000001c6 | 590.686 | 3.663 | n/a | 0.000 | 0.000 | 0.646 | 586.189 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.126 | 3.663 | 0.006 | 0.126 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000001d1 | 552.615 | 3.177 | n/a | 0.000 | 0.000 | 1.359 | 547.969 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.074 | 3.177 | 0.006 | 0.074 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000000198 | 547.966 | 3.393 | n/a | 0.000 | 0.000 | 0.383 | 544.014 | 0.013 | n/a | 0.047 | 0.000 | n/a | n/a | 0.116 | 3.393 | 0.006 | 0.116 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000001af | 515.157 | 9.429 | n/a | 0.000 | 0.000 | 0.589 | 504.932 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.173 | 9.429 | 0.018 | 0.173 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000001a8 | 480.790 | 4.364 | n/a | 0.000 | 0.000 | 3.674 | 472.551 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.111 | 4.364 | 0.009 | 0.111 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000001a0 | 401.982 | 3.436 | n/a | 0.000 | 0.000 | 0.631 | 397.793 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.063 | 3.436 | 0.009 | 0.063 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 407.461 | n/a | n/a | n/a | 4.094 | n/a | 0.000 | 0.000 | 0.747 | 403.520 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.137 | 4.094 | 0.011 | 0.137 |
| p99 | 1009.151 | n/a | n/a | n/a | 13.655 | n/a | 0.000 | 0.000 | 7.242 | 1001.107 | 0.040 | n/a | 0.247 | 0.000 | n/a | n/a | 26.636 | 13.655 | 0.246 | 26.636 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e3100000000000001ff | 1009.151 | 13.655 | n/a | 0.000 | 0.000 | 5.331 | 989.718 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.380 | 13.655 | 0.014 | 0.380 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000217 | 1004.972 | 2.732 | n/a | 0.000 | 0.000 | 1.003 | 1001.056 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.136 | 2.732 | 0.003 | 0.136 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000001ea | 1003.308 | 0.126 | n/a | 0.000 | 0.000 | 0.884 | 1001.107 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 1.128 | 0.126 | 0.000 | 1.128 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e310000000000000218 | 1001.724 | 4.006 | n/a | 0.000 | 0.000 | 0.534 | 996.746 | 0.014 | n/a | 0.070 | 0.000 | n/a | n/a | 0.354 | 4.006 | 0.004 | 0.354 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000207 | 990.649 | 6.418 | n/a | 0.000 | 0.000 | 0.824 | 983.250 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.100 | 6.418 | 0.006 | 0.100 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000000213 | 990.495 | 12.659 | n/a | 0.000 | 0.000 | 0.576 | 976.793 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.421 | 12.659 | 0.013 | 0.421 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e310000000000000212 | 990.292 | 3.340 | n/a | 0.000 | 0.000 | 0.747 | 986.058 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.105 | 3.340 | 0.003 | 0.105 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000216 | 985.938 | 4.117 | n/a | 0.000 | 0.000 | 2.872 | 978.691 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.166 | 4.117 | 0.004 | 0.166 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000001f8 | 884.986 | 3.740 | n/a | 0.000 | 0.000 | 0.503 | 880.627 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.069 | 3.740 | 0.004 | 0.069 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000001f5 | 742.887 | 2.817 | n/a | 0.000 | 0.000 | 2.710 | 737.246 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.071 | 2.817 | 0.004 | 0.071 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000200 | 739.306 | 4.543 | n/a | 0.000 | 0.000 | 1.171 | 733.272 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.195 | 4.543 | 0.006 | 0.195 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e3100000000000001e9 | 710.261 | 5.216 | n/a | 0.000 | 0.000 | 0.662 | 704.143 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.201 | 5.216 | 0.007 | 0.201 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000001dd | 690.198 | 3.004 | n/a | 0.000 | 0.000 | 2.227 | 684.856 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.071 | 3.004 | 0.004 | 0.071 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e3100000000000001f1 | 674.254 | 2.016 | n/a | 0.000 | 0.000 | 3.973 | 668.127 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.066 | 2.016 | 0.003 | 0.066 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000203 | 646.305 | 8.782 | n/a | 0.000 | 0.000 | 1.881 | 635.404 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.176 | 8.782 | 0.014 | 0.176 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e3100000000000001da | 547.157 | 4.097 | n/a | 0.000 | 0.000 | 1.045 | 541.775 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.186 | 4.097 | 0.007 | 0.186 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000210 | 538.584 | 4.943 | n/a | 0.000 | 0.000 | 0.630 | 532.790 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.182 | 4.943 | 0.009 | 0.182 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000001ef | 521.613 | 3.236 | n/a | 0.000 | 0.000 | 0.637 | 517.607 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.070 | 3.236 | 0.006 | 0.070 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000001fa | 468.952 | 2.371 | n/a | 0.000 | 0.000 | 2.388 | 464.063 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.068 | 2.371 | 0.005 | 0.068 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000001e1 | 451.702 | 5.032 | n/a | 0.000 | 0.000 | 0.755 | 445.510 | 0.013 | n/a | 0.247 | 0.000 | n/a | n/a | 0.146 | 5.032 | 0.011 | 0.146 | gw-r/thread-43/journal/page | none observed |

## P3 / L1024 / internal (739 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.506 | n/a | n/a | n/a | 3.660 | n/a | 0.000 | 0.000 | 0.273 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.168 | 3.660 | 0.289 | 8.168 |
| p99 | 174.030 | n/a | n/a | n/a | 18.203 | n/a | 1.256 | 0.000 | 1.141 | 170.543 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 48.497 | 18.462 | 0.820 | 48.497 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e310000000000000224 | 1003.271 | 0.145 | n/a | 0.000 | 0.000 | 0.925 | 1000.994 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 1.124 | 0.145 | 0.000 | 1.124 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000219 | 814.593 | 2.710 | n/a | 0.000 | 0.000 | 0.809 | 810.902 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.113 | 2.710 | 0.003 | 0.113 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e310000000000000226 | 784.887 | 3.747 | n/a | 0.000 | 0.000 | 1.141 | 779.811 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.126 | 3.747 | 0.005 | 0.126 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e31000000000000021c | 672.194 | 3.152 | n/a | 0.000 | 0.000 | 0.370 | 668.537 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.080 | 3.152 | 0.005 | 0.080 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000221 | 633.626 | 2.460 | n/a | 0.000 | 0.000 | 0.579 | 630.456 | 0.008 | n/a | 0.021 | 0.000 | n/a | n/a | 0.103 | 2.460 | 0.004 | 0.103 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000222 | 320.159 | 7.229 | n/a | 0.000 | 0.000 | 0.635 | 312.020 | 0.013 | n/a | 0.052 | 0.000 | n/a | n/a | 0.210 | 7.229 | 0.023 | 0.210 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e31000000000000021d | 255.361 | 4.715 | n/a | 0.000 | 0.000 | 0.632 | 249.852 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.125 | 4.715 | 0.018 | 0.125 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e31000000000000021a | 174.030 | 2.524 | n/a | 0.000 | 0.000 | 0.800 | 170.543 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.109 | 2.524 | 0.015 | 0.109 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e31000000000000021f | 147.133 | 4.559 | n/a | 0.000 | 0.000 | 0.801 | 141.447 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.247 | 4.559 | 0.031 | 0.247 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e3100000000000002b1 | 114.636 | 3.568 | n/a | 0.000 | 0.000 | 0.594 | 110.304 | 0.015 | n/a | 0.044 | 0.000 | n/a | n/a | 0.111 | 3.568 | 0.031 | 0.111 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e3100000000000004e0 | 108.445 | 5.874 | n/a | 1.530 | 0.000 | 0.449 | 100.401 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.156 | 7.403 | 0.068 | 0.156 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e310000000000000621 | 99.065 | 4.765 | n/a | 0.000 | 0.000 | 0.681 | 93.508 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.086 | 4.765 | 0.048 | 0.086 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e31000000000000030a | 98.686 | 2.619 | n/a | 0.000 | 0.000 | 0.423 | 95.567 | 0.002 | n/a | 0.016 | 0.000 | n/a | n/a | 0.060 | 2.619 | 0.027 | 0.060 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e3100000000000005db | 90.690 | 6.477 | n/a | 0.000 | 0.000 | 0.652 | 83.461 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.075 | 6.477 | 0.071 | 0.075 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000000461 | 90.582 | 6.525 | n/a | 0.000 | 0.000 | 0.767 | 83.181 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.065 | 6.525 | 0.072 | 0.065 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e310000000000000788 | 86.441 | 2.463 | n/a | 0.000 | 0.000 | 0.353 | 83.532 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.084 | 2.463 | 0.028 | 0.084 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e3100000000000002ed | 83.387 | 5.874 | n/a | 0.000 | 0.000 | 0.399 | 77.026 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.068 | 5.874 | 0.070 | 0.068 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000000743 | 82.059 | 3.167 | n/a | 0.000 | 0.000 | 0.396 | 78.117 | 0.305 | n/a | 0.006 | 0.000 | n/a | n/a | 0.067 | 3.167 | 0.039 | 0.067 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000000606 | 81.576 | 5.619 | n/a | 0.000 | 0.000 | 1.600 | 74.038 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.271 | 5.619 | 0.069 | 0.271 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e3100000000000005bc | 80.289 | 6.744 | n/a | 0.000 | 0.000 | 1.014 | 72.301 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.162 | 6.744 | 0.084 | 0.162 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / internal (2244 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.086 | n/a | n/a | n/a | 4.382 | n/a | 0.000 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.058 | 4.427 | 0.345 | 6.058 |
| p99 | 342.189 | n/a | n/a | n/a | 19.173 | n/a | 1.787 | 0.000 | 1.620 | 336.724 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 47.358 | 20.470 | 0.850 | 47.358 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a63fdde241090e310000000000001a52 | 1002.457 | 0.195 | n/a | 0.000 | 0.000 | 0.452 | 1000.604 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 1.157 | 0.195 | 0.000 | 1.157 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000001a9e | 1002.173 | 0.104 | n/a | 0.000 | 0.000 | 0.303 | 1000.622 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 1.082 | 0.104 | 0.000 | 1.082 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000001a5c | 1001.336 | 2.117 | n/a | 0.000 | 0.000 | 0.307 | 998.805 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.076 | 2.117 | 0.002 | 0.076 | gw-r/thread-47/journal/page | none observed |
| a63fdde241090e310000000000001a51 | 1001.235 | 4.807 | n/a | 0.000 | 0.000 | 0.419 | 995.831 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.151 | 4.807 | 0.005 | 0.151 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000001a75 | 998.201 | 2.526 | n/a | 0.000 | 0.000 | 0.429 | 995.160 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.066 | 2.526 | 0.003 | 0.066 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000001a9a | 990.223 | 2.844 | n/a | 0.000 | 0.000 | 0.329 | 986.969 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.055 | 2.844 | 0.003 | 0.055 | gw-r/thread-64/journal/page | none observed |
| a63fdde241090e310000000000001a96 | 973.174 | 3.753 | n/a | 0.000 | 0.000 | 0.531 | 968.792 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.071 | 3.753 | 0.004 | 0.071 | gw-r/thread-61/journal/page | none observed |
| a63fdde241090e310000000000001a78 | 877.294 | 3.224 | n/a | 0.000 | 0.000 | 0.462 | 873.469 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.103 | 3.224 | 0.004 | 0.103 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000001a66 | 866.541 | 5.805 | n/a | 0.000 | 0.000 | 0.420 | 860.094 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.199 | 5.805 | 0.007 | 0.199 | gw-r/thread-40/journal/page | none observed |
| a63fdde241090e310000000000001a57 | 851.604 | 4.220 | n/a | 0.000 | 0.000 | 0.700 | 846.412 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.199 | 4.220 | 0.005 | 0.199 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000001a54 | 767.779 | 8.185 | n/a | 1.126 | 0.000 | 0.541 | 757.625 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.265 | 9.312 | 0.012 | 0.265 | gw-r/thread-42/journal/page | none observed |
| a63fdde241090e310000000000001a71 | 711.605 | 1.963 | n/a | 0.000 | 0.000 | 0.363 | 709.134 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.102 | 1.963 | 0.003 | 0.102 | gw-r/thread-64/journal/page | none observed |
| a63fdde241090e310000000000001a6c | 688.246 | 5.720 | n/a | 0.000 | 0.000 | 0.698 | 681.578 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.191 | 5.720 | 0.008 | 0.191 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000001a97 | 667.440 | 3.921 | n/a | 0.000 | 0.000 | 0.512 | 662.853 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.138 | 3.921 | 0.006 | 0.138 | gw-r/thread-63/journal/page | none observed |
| a63fdde241090e310000000000001a8f | 618.160 | 2.625 | n/a | 0.000 | 0.000 | 0.612 | 614.820 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.076 | 2.625 | 0.004 | 0.076 | gw-r/thread-64/journal/page | none observed |
| a63fdde241090e310000000000001a85 | 537.722 | 2.185 | n/a | 0.000 | 0.000 | 0.322 | 535.123 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.065 | 2.185 | 0.004 | 0.065 | gw-r/thread-64/journal/page | none observed |
| a63fdde241090e310000000000001a5d | 503.232 | 1.587 | n/a | 0.000 | 0.000 | 0.340 | 501.193 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.077 | 1.587 | 0.003 | 0.077 | gw-r/thread-45/journal/page | none observed |
| a63fdde241090e310000000000001a91 | 491.510 | 2.550 | n/a | 0.000 | 0.000 | 0.699 | 488.174 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.061 | 2.550 | 0.005 | 0.061 | gw-r/thread-46/journal/page | none observed |
| a63fdde241090e310000000000001a79 | 481.924 | 11.352 | n/a | 0.000 | 0.000 | 1.454 | 468.817 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.272 | 11.352 | 0.024 | 0.272 | gw-r/thread-43/journal/page | none observed |
| a63fdde241090e310000000000001a92 | 459.126 | 3.827 | n/a | 0.000 | 0.000 | 0.452 | 454.678 | 0.021 | n/a | 0.036 | 0.000 | n/a | n/a | 0.112 | 3.827 | 0.008 | 0.112 | gw-r/thread-40/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.450 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 201.196 | 0.017 | n/a | 0.128 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 207.289 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.879 | 204.884 | 8.910 | n/a | 3.495 | 0.000 | n/a | n/a | 1.331 | 0.000 | 0.000 | 1.331 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f0000000000000025 | 207.289 | 0.000 | n/a | 0.000 | 0.000 | 1.619 | 201.622 | 3.573 | n/a | 0.217 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f000000000000000b | 207.081 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 204.112 | 0.234 | n/a | 0.299 | 0.000 | n/a | n/a | 1.331 | 0.000 | 0.000 | 1.331 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000000f | 206.661 | 0.000 | n/a | 0.000 | 0.000 | 1.390 | 204.884 | 0.012 | n/a | 0.140 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000041 | 206.648 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.937 | 0.094 | n/a | 3.495 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000007 | 206.196 | 0.000 | n/a | 0.000 | 0.000 | 4.610 | 201.196 | 0.015 | n/a | 0.159 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000020 | 206.083 | 0.000 | n/a | 0.000 | 0.000 | 4.555 | 201.219 | 0.015 | n/a | 0.156 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000030 | 205.919 | 0.000 | n/a | 0.000 | 0.000 | 4.879 | 200.861 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000050 | 205.904 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 204.833 | 0.015 | n/a | 0.183 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f0000000000000038 | 205.665 | 0.000 | n/a | 0.000 | 0.000 | 2.013 | 202.679 | 0.039 | n/a | 0.442 | 0.000 | n/a | n/a | 0.492 | 0.000 | 0.000 | 0.492 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f000000000000001d | 205.640 | 0.000 | n/a | 0.000 | 0.000 | 2.904 | 202.441 | 0.014 | n/a | 0.137 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000000e | 205.628 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 204.580 | 0.024 | n/a | 0.253 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000013 | 205.406 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 204.114 | 0.017 | n/a | 0.163 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000018 | 205.256 | 0.000 | n/a | 0.000 | 0.000 | 3.328 | 201.562 | 0.018 | n/a | 0.246 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000002f | 205.175 | 0.000 | n/a | 0.000 | 0.000 | 3.793 | 200.875 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.397 | 0.000 | 0.000 | 0.397 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000000a | 205.021 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 203.541 | 0.030 | n/a | 0.193 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000004a | 204.938 | 0.000 | n/a | 0.000 | 0.000 | 3.187 | 201.415 | 0.054 | n/a | 0.128 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f0000000000000015 | 203.979 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 202.729 | 0.019 | n/a | 0.205 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000055 | 203.716 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 202.438 | 0.028 | n/a | 0.106 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f000000000000001f | 203.714 | 0.000 | n/a | 0.000 | 0.000 | 1.278 | 201.897 | 0.014 | n/a | 0.160 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f000000000000001a | 203.485 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 201.707 | 0.022 | n/a | 0.478 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.278 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.000 | 0.015 | n/a | 0.104 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 207.492 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.621 | 206.396 | 17.925 | n/a | 1.852 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f0000000000000075 | 207.492 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 206.396 | 0.033 | n/a | 0.137 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000000be | 207.356 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 205.108 | 1.112 | n/a | 0.187 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000000a2 | 206.658 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 205.539 | 0.034 | n/a | 0.155 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f00000000000000bc | 206.203 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 205.052 | 0.015 | n/a | 0.148 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000062 | 206.179 | 0.000 | n/a | 0.000 | 0.000 | 1.232 | 204.698 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000082 | 205.829 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 204.803 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f0000000000000078 | 205.515 | 0.000 | n/a | 0.000 | 0.000 | 4.621 | 200.660 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f00000000000000a7 | 205.440 | 0.000 | n/a | 0.000 | 0.000 | 3.993 | 201.170 | 0.027 | n/a | 0.132 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000083 | 204.893 | 0.000 | n/a | 0.000 | 0.000 | 3.640 | 200.968 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000006a | 204.889 | 0.000 | n/a | 0.000 | 0.000 | 2.291 | 202.278 | 0.020 | n/a | 0.131 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000000a5 | 204.673 | 0.000 | n/a | 0.000 | 0.000 | 2.913 | 201.479 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000000bb | 204.634 | 0.000 | n/a | 0.000 | 0.000 | 3.779 | 200.633 | 0.032 | n/a | 0.084 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f000000000000005a | 204.630 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 203.177 | 0.024 | n/a | 0.189 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 55bddaef20758d9f0000000000000090 | 204.447 | 0.000 | n/a | 0.000 | 0.000 | 1.418 | 202.780 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f00000000000000b4 | 204.112 | 0.000 | n/a | 0.000 | 0.000 | 2.856 | 201.002 | 0.009 | n/a | 0.105 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000059 | 203.865 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.031 | 0.027 | n/a | 1.852 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f000000000000005d | 203.718 | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 202.138 | 0.017 | n/a | 0.159 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000093 | 203.704 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 202.829 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000079 | 203.688 | 0.000 | n/a | 0.000 | 0.000 | 1.138 | 202.184 | 0.033 | n/a | 0.217 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f000000000000008f | 203.314 | 0.000 | n/a | 0.000 | 0.000 | 1.137 | 201.816 | 0.033 | n/a | 0.214 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-40/journal/page | none observed |

## P3 / L4 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.924 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 200.883 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 212.397 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.599 | 211.027 | 13.048 | n/a | 1.088 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f00000000000000d8 | 212.397 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 211.027 | 0.032 | n/a | 0.102 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f00000000000000fc | 206.510 | 0.000 | n/a | 0.000 | 0.000 | 4.599 | 201.572 | 0.007 | n/a | 0.105 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000000e1 | 205.783 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 204.463 | 0.006 | n/a | 0.092 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f00000000000000cc | 205.703 | 0.000 | n/a | 0.000 | 0.000 | 3.667 | 201.808 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f00000000000000c6 | 205.103 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 204.032 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f00000000000000d7 | 205.067 | 0.000 | n/a | 0.000 | 0.000 | 4.086 | 200.784 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000123 | 204.675 | 0.000 | n/a | 0.000 | 0.000 | 1.207 | 203.140 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000107 | 204.052 | 0.000 | n/a | 0.000 | 0.000 | 2.918 | 200.933 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000118 | 203.854 | 0.000 | n/a | 0.000 | 0.000 | 1.046 | 202.432 | 0.013 | n/a | 0.134 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f00000000000000cf | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 1.697 | 201.545 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f00000000000000d3 | 203.257 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 202.427 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000119 | 203.148 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 201.475 | 0.012 | n/a | 0.131 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000102 | 203.144 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 201.684 | 0.014 | n/a | 0.188 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f00000000000000f8 | 203.142 | 0.000 | n/a | 0.000 | 0.000 | 1.437 | 201.465 | 0.007 | n/a | 0.106 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000000cb | 202.974 | 0.000 | n/a | 0.000 | 0.000 | 1.707 | 201.007 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000111 | 202.965 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 201.566 | 0.008 | n/a | 0.121 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f00000000000000c5 | 202.931 | 0.000 | n/a | 0.000 | 0.000 | 1.147 | 201.482 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000000e4 | 202.927 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 202.225 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000112 | 202.926 | 0.000 | n/a | 0.000 | 0.000 | 1.281 | 201.309 | 0.009 | n/a | 0.113 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f000000000000011d | 202.857 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.658 | 0.019 | n/a | 0.124 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.826 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.800 | 200.863 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 210.402 | n/a | n/a | n/a | 0.029 | n/a | 0.985 | 0.000 | 4.510 | 209.095 | 3.831 | n/a | 2.479 | 0.000 | n/a | n/a | 0.346 | 1.014 | 0.005 | 0.346 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f0000000000000139 | 210.402 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 209.095 | 0.018 | n/a | 0.105 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000153 | 205.750 | 0.000 | n/a | 0.000 | 0.000 | 4.510 | 200.953 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000184 | 205.623 | 0.000 | n/a | 0.000 | 0.000 | 4.273 | 201.142 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f000000000000014c | 205.447 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 204.182 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f000000000000013d | 205.211 | 0.000 | n/a | 0.000 | 0.000 | 0.584 | 204.391 | 0.024 | n/a | 0.104 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000173 | 205.007 | 0.000 | n/a | 0.000 | 0.000 | 4.120 | 200.691 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000177 | 204.529 | 0.000 | n/a | 0.000 | 0.000 | 3.607 | 200.714 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000012d | 203.657 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 202.641 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000154 | 203.648 | 0.000 | n/a | 0.000 | 0.000 | 1.331 | 201.816 | 0.014 | n/a | 0.140 | 0.000 | n/a | n/a | 0.346 | 0.000 | 0.000 | 0.346 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000131 | 203.475 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 202.084 | 0.009 | n/a | 0.122 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000157 | 203.350 | 0.029 | n/a | 0.985 | 0.000 | 0.764 | 201.258 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.224 | 1.014 | 0.005 | 0.224 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000141 | 203.228 | 0.000 | n/a | 0.000 | 0.000 | 1.937 | 200.973 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000182 | 203.172 | 0.000 | n/a | 0.000 | 0.000 | 1.275 | 201.491 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.326 | 0.000 | 0.000 | 0.326 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000149 | 203.168 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 202.280 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000165 | 203.070 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 202.098 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000137 | 202.770 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.448 | 0.007 | n/a | 0.118 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f000000000000018b | 202.711 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 201.091 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.323 | 0.000 | 0.000 | 0.323 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000174 | 202.699 | 0.000 | n/a | 0.000 | 0.000 | 1.255 | 201.150 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000150 | 202.617 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.372 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f000000000000013a | 202.560 | 0.000 | n/a | 0.000 | 0.000 | 1.157 | 201.105 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-61/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.708 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 200.798 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 204.962 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.855 | 203.800 | 8.966 | n/a | 0.197 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f00000000000001c1 | 205.567 | 0.000 | n/a | 0.000 | 0.000 | 1.114 | 204.238 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000001f0 | 204.962 | 0.000 | n/a | 0.000 | 0.000 | 3.855 | 200.836 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f00000000000001a3 | 204.729 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 203.800 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000018e | 204.400 | 0.000 | n/a | 0.000 | 0.000 | 2.961 | 201.253 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f00000000000001b3 | 204.171 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 203.047 | 0.023 | n/a | 0.197 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000001b6 | 203.534 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 202.309 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000001cd | 203.167 | 0.000 | n/a | 0.000 | 0.000 | 1.670 | 201.268 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000001bd | 203.159 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 201.917 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000001d0 | 203.050 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 201.848 | 0.019 | n/a | 0.092 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f00000000000001d1 | 203.049 | 0.000 | n/a | 0.000 | 0.000 | 1.180 | 201.203 | 0.009 | n/a | 0.089 | 0.000 | n/a | n/a | 0.568 | 0.000 | 0.000 | 0.568 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f00000000000001c0 | 202.880 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.495 | 0.010 | n/a | 0.156 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f00000000000001b7 | 202.728 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 201.794 | 0.018 | n/a | 0.088 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f00000000000001de | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.338 | 0.008 | n/a | 0.109 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000191 | 202.418 | 0.000 | n/a | 0.000 | 0.000 | 1.082 | 201.077 | 0.007 | n/a | 0.100 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000001a8 | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 201.327 | 0.008 | n/a | 0.098 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f00000000000001be | 202.279 | 0.000 | n/a | 0.000 | 0.000 | 1.191 | 200.922 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f00000000000001a7 | 202.255 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 201.039 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000001ea | 202.192 | 0.000 | n/a | 0.000 | 0.000 | 1.327 | 200.648 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f00000000000001dd | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 201.449 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f00000000000001ed | 202.137 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 201.467 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.783 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.858 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 204.831 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.717 | 202.763 | 3.111 | n/a | 0.173 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f0000000000000243 | 205.452 | 0.000 | n/a | 0.000 | 0.000 | 2.115 | 201.359 | 0.016 | n/a | 1.571 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f000000000000023c | 204.831 | 0.000 | n/a | 0.000 | 0.000 | 3.533 | 201.073 | 0.021 | n/a | 0.065 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000212 | 204.416 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 203.047 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000222 | 203.810 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 202.763 | 0.012 | n/a | 0.044 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000251 | 203.691 | 0.000 | n/a | 0.000 | 0.000 | 1.749 | 201.548 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f000000000000024a | 203.682 | 0.000 | n/a | 0.000 | 0.000 | 2.136 | 201.222 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000252 | 203.541 | 0.000 | n/a | 0.000 | 0.000 | 1.628 | 201.542 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000257 | 203.397 | 0.000 | n/a | 0.000 | 0.000 | 2.430 | 200.770 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f000000000000026f | 203.315 | 0.000 | n/a | 0.000 | 0.000 | 1.593 | 201.448 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000025c | 203.039 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 201.822 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000274 | 202.793 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.741 | 0.011 | n/a | 0.173 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000025e | 202.716 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.749 | 0.017 | n/a | 0.103 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000206 | 202.663 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 201.777 | 0.030 | n/a | 0.058 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000233 | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 1.443 | 201.004 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000245 | 202.581 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.246 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000244 | 202.573 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.385 | 0.022 | n/a | 0.074 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f000000000000026e | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 201.048 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f000000000000024c | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 201.118 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000208 | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 1.677 | 200.606 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000249 | 202.491 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 201.349 | 0.008 | n/a | 0.135 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / read (63 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 78.143 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 205.588 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.501 | 203.787 | 12.813 | n/a | 0.110 | 0.000 | n/a | n/a | 49.919 | 0.000 | 0.000 | 49.919 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f0000000000000287 | 205.588 | 0.000 | n/a | 0.000 | 0.000 | 2.501 | 202.814 | 0.009 | n/a | 0.107 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000277 | 204.556 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 203.787 | 0.017 | n/a | 0.098 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f000000000000028d | 203.722 | 0.000 | n/a | 0.000 | 0.000 | 2.042 | 201.402 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000283 | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 201.525 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000027f | 202.254 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.087 | 0.017 | n/a | 0.062 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f000000000000028c | 202.205 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 201.329 | 0.018 | n/a | 0.098 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000282 | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.134 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000276 | 202.140 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.130 | 0.005 | n/a | 0.075 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f000000000000027c | 202.129 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.086 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f000000000000027b | 202.066 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 201.316 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000288 | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.226 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000289 | 202.008 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 200.814 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f000000000000027d | 201.809 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 200.759 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000028e | 201.742 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 200.945 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000278 | 201.671 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 200.725 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f000000000000028a | 201.557 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 200.669 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000285 | 201.457 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.805 | 0.004 | n/a | 0.057 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000284 | 186.357 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 185.513 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f000000000000027a | 171.021 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 170.078 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000279 | 142.533 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 141.850 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |

## P3 / tail / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.093 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 83.884 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 202.390 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.426 | 201.414 | 1.426 | n/a | 0.083 | 0.000 | n/a | n/a | 50.192 | 0.000 | 0.000 | 50.192 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 55bddaef20758d9f0000000000000eb1 | 239.756 | 0.000 | n/a | 0.000 | 0.000 | 0.376 | 239.205 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-61/journal/page | none observed |
| 55bddaef20758d9f0000000000000e96 | 204.398 | 0.000 | n/a | 0.000 | 0.000 | 3.426 | 200.776 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000edc | 202.390 | 0.000 | n/a | 0.000 | 0.000 | 0.589 | 201.494 | 0.017 | n/a | 0.095 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-40/journal/page | none observed |
| 55bddaef20758d9f0000000000000ef2 | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 201.344 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000eff | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 201.414 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000eee | 202.002 | 0.000 | n/a | 0.000 | 0.000 | 1.269 | 200.537 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000ec4 | 201.972 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 201.216 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |
| 55bddaef20758d9f0000000000000ee1 | 201.916 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 200.937 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000e8a | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 201.068 | 0.008 | n/a | 0.095 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-64/journal/page | none observed |
| 55bddaef20758d9f0000000000000ee5 | 201.760 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 200.898 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000ec0 | 201.751 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.991 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000e8e | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 200.852 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-63/journal/page | none observed |
| 55bddaef20758d9f0000000000000e92 | 201.703 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 200.637 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| 55bddaef20758d9f0000000000000ea1 | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 200.917 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| 55bddaef20758d9f0000000000000eab | 201.682 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 200.599 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| 55bddaef20758d9f0000000000000e93 | 201.635 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 200.760 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000ed5 | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.912 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-43/journal/page | none observed |
| 55bddaef20758d9f0000000000000eb3 | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 200.979 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-63/journal/page | none observed |
| 55bddaef20758d9f0000000000000e8b | 201.630 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 200.767 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-45/journal/page | none observed |
| 55bddaef20758d9f0000000000000ede | 201.620 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 200.864 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
