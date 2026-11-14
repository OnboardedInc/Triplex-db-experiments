# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (52.571 ms, trace `f16c1102c747a745000000000000013c`); `node-14/thread-0/driver.queue.subject` (66.329 ms, trace `f16c1102c747a7450000000000000373`); `tx/thread-84/transactor.triplex-function` (53.432 ms, trace `f16c1102c747a74500000000000001a8`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (52.485 ms, trace `f16c1102c747a745000000000000015b`); `gw-w/thread-46/gateway.admitted-work` (53.340 ms, trace `f16c1102c747a7450000000000000280`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cache0-b-1-baseline`; source `9ac79685c6286ce7a20f3d06be5556d314817f42`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17792660.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 189 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14291.288 | 518.203 | 11.448 | 457 |
| L1 | 0 | 19971.971 | 343.573 | 5.681 | 668 |
| L4 | 0 | 19979.358 | 312.937 | 5.275 | 628 |
| L16 | 0 | 19975.935 | 294.841 | 7.566 | 686 |
| L64 | 0 | 19975.315 | 335.410 | 15.288 | 850 |
| L256 | 0 | 19928.169 | 418.857 | 10.469 | 708 |
| L1024 | 0 | 19973.750 | 3306.850 | 29.307 | 16846 |
| tail | 0 | 64685.655 | 9959.447 | 70.468 | 53113 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f16c1102c747a745000000000000013c | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| f16c1102c747a745000000000000013c | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace f16c1102c747a745000000000000013c waited: []

| f16c1102c747a7450000000000000373 | driver.queue.subject | 66.329 | f16c1102c747a7450000000000000372 | 3 / 32 |
| f16c1102c747a7450000000000000373 | driver.queue.scheduler-late | 0.779 | none | 3 / 32 |
| f16c1102c747a7450000000000000373 | driver.queue.scheduler-dispatch | 0.185 | none | 1 / 32 |

Observed active steps while trace f16c1102c747a7450000000000000373 waited: [{"at":1794662075509.1536,"inFlight":3,"capacity":32,"active":[{"traceId":"f16c1102c747a7450000000000000374","step":"rpc.probe.transact"},{"traceId":"f16c1102c747a7450000000000000375","step":"client.http"},{"traceId":"f16c1102c747a7450000000000000372","step":"client.http"}]},{"at":1794662075528.7446,"inFlight":2,"capacity":32,"active":[{"traceId":"f16c1102c747a7450000000000000374","step":"rpc.probe.transact"},{"traceId":"f16c1102c747a7450000000000000372","step":"client.http"}]}]

| f16c1102c747a74500000000000001a8 | driver.queue.scheduler-late | 0.703 | none | 0 / 32 |
| f16c1102c747a74500000000000001a8 | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |

Observed active steps while trace f16c1102c747a74500000000000001a8 waited: []

| f16c1102c747a745000000000000015b | driver.queue.scheduler-dispatch | 0.032 | none | 1 / 32 |
| f16c1102c747a745000000000000015b | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace f16c1102c747a745000000000000015b waited: []

| f16c1102c747a7450000000000000280 | driver.queue.scheduler-dispatch | 0.038 | none | 0 / 32 |
| f16c1102c747a7450000000000000280 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace f16c1102c747a7450000000000000280 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.476 | 0.274 | 0.000 | 0.526 | 4.267 | 0.407 | 0.000 | 0.264 | 1.580 | 5.916 | 0.029 | n/a | 0.344 | 10.286 | 4.552 | n/a | 0.038 | 5.219 | 0.202 | 0.038 |
| p99 | 66.514 | 5.385 | 0.010 | 4.477 | 13.380 | n/a | 7.979 | 1.294 | 5.131 | 23.128 | 0.134 | n/a | 3.829 | 22.471 | 12.234 | n/a | 0.162 | 17.823 | 0.400 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a74500000000000000f1 | 66.514 | 13.380 | 0.405 | 0.000 | 0.064 | 5.131 | 23.128 | 0.134 | n/a | 0.552 | 15.318 | 8.380 | n/a | 0.023 | 13.849 | 0.208 | 0.023 | gw-w/thread-41/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000000ef | 58.830 | 9.466 | n/a | 7.979 | 0.378 | 3.061 | 4.618 | 0.022 | n/a | 3.829 | 22.471 | 6.844 | n/a | 0.162 | 17.823 | 0.303 | 0.162 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000101 | 47.177 | 5.999 | 0.269 | 1.558 | 0.306 | 2.764 | 14.652 | 0.114 | n/a | 0.184 | 16.852 | 4.389 | n/a | 0.091 | 8.132 | 0.172 | 0.091 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000fb | 44.702 | 6.689 | 0.402 | 0.000 | 0.172 | 3.620 | 16.000 | 0.040 | n/a | 0.142 | 10.531 | 7.049 | n/a | 0.057 | 7.263 | 0.162 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000f7 | 40.813 | 6.538 | n/a | 1.928 | 0.632 | 1.144 | 3.452 | 0.021 | n/a | 2.426 | 12.366 | 12.234 | n/a | 0.074 | 9.097 | 0.223 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000f8 | 36.121 | 4.826 | 0.242 | 0.000 | 0.125 | 2.256 | 14.481 | 0.063 | n/a | 0.942 | 8.386 | 4.751 | n/a | 0.049 | 5.193 | 0.144 | 0.049 | gw-w/thread-48/gateway.admitted-work | driver.publication.persist-deferred 1.277ms |
| f16c1102c747a7450000000000000109 | 35.962 | 5.010 | 0.159 | 0.000 | 0.050 | 1.786 | 9.248 | 0.051 | n/a | 0.149 | 13.244 | 6.239 | n/a | 0.027 | 5.219 | 0.145 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000010d | 35.648 | 5.838 | 0.357 | 0.355 | 0.058 | 1.858 | 11.757 | 0.026 | n/a | 0.384 | 10.438 | 4.552 | n/a | 0.025 | 6.608 | 0.185 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000103 | 35.100 | 8.462 | 0.188 | 0.000 | 0.084 | 1.902 | 12.787 | 0.027 | n/a | 0.113 | 8.009 | 3.488 | n/a | 0.042 | 8.733 | 0.249 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000107 | 34.542 | 3.476 | n/a | 0.000 | 0.690 | 1.183 | 5.404 | 0.029 | n/a | 0.121 | 14.433 | 9.177 | n/a | 0.030 | 4.166 | 0.121 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000124 | 33.845 | 3.421 | 0.201 | 0.322 | 0.143 | 1.302 | 10.550 | 0.048 | n/a | 0.344 | 9.162 | 8.283 | n/a | 0.068 | 4.087 | 0.121 | 0.068 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000ff | 33.400 | 8.421 | n/a | 4.393 | 0.551 | 0.897 | 4.438 | 0.018 | n/a | 0.107 | 8.956 | 5.570 | n/a | 0.049 | 13.365 | 0.400 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000120 | 32.394 | 4.137 | 0.267 | 0.000 | 0.075 | 1.752 | 8.922 | 0.039 | n/a | 0.449 | 10.987 | 5.738 | n/a | 0.028 | 4.480 | 0.138 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000115 | 30.590 | 5.858 | n/a | 3.588 | 0.688 | 1.338 | 2.958 | 0.068 | n/a | 0.921 | 11.113 | 4.021 | n/a | 0.038 | 10.134 | 0.331 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000011c | 30.476 | 3.897 | 0.178 | 0.000 | 0.139 | 2.350 | 7.162 | 0.035 | n/a | 0.391 | 10.286 | 5.977 | n/a | 0.061 | 4.215 | 0.138 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000f5 | 30.417 | 5.489 | 0.358 | 0.000 | 0.086 | 1.690 | 12.154 | 0.029 | n/a | 1.415 | 8.353 | 0.803 | n/a | 0.041 | 5.933 | 0.195 | 0.041 | gw-w/thread-44/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000000f3 | 28.759 | 3.126 | n/a | 2.319 | 0.589 | 0.852 | 1.611 | 0.020 | n/a | 0.407 | 18.040 | 1.755 | n/a | 0.039 | 6.035 | 0.210 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000128 | 28.425 | 3.882 | 0.209 | 0.000 | 0.096 | 1.678 | 10.287 | 0.038 | n/a | 0.114 | 7.409 | 4.665 | n/a | 0.046 | 4.188 | 0.147 | 0.046 | gw-w/thread-48/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000105 | 28.056 | 6.458 | n/a | 1.513 | 1.086 | 1.113 | 5.339 | 0.023 | n/a | 0.107 | 10.903 | 1.482 | n/a | 0.032 | 9.057 | 0.323 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000118 | 27.792 | 5.007 | 0.237 | 0.449 | 0.047 | 1.221 | 7.148 | 0.027 | n/a | 0.079 | 9.946 | 3.611 | n/a | 0.021 | 5.739 | 0.206 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.384 | 1.000 | 0.000 | 0.579 | 3.126 | n/a | 0.000 | 0.632 | 1.079 | 1.611 | 0.021 | n/a | 0.407 | 8.717 | 1.230 | n/a | 0.036 | 4.460 | 0.221 | 0.036 |
| p99 | 40.813 | 2.971 | 0.000 | 3.286 | 6.538 | n/a | 3.075 | 1.294 | 1.778 | 4.206 | 0.094 | n/a | 2.426 | 18.040 | 12.234 | n/a | 0.074 | 9.097 | 0.350 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a74500000000000000f7 | 40.813 | 6.538 | n/a | 1.928 | 0.632 | 1.144 | 3.452 | 0.021 | n/a | 2.426 | 12.366 | 12.234 | n/a | 0.074 | 9.097 | 0.223 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000f3 | 28.759 | 3.126 | n/a | 2.319 | 0.589 | 0.852 | 1.611 | 0.020 | n/a | 0.407 | 18.040 | 1.755 | n/a | 0.039 | 6.035 | 0.210 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000011e | 25.341 | 3.835 | n/a | 0.000 | 1.294 | 1.205 | 1.128 | 0.023 | n/a | 0.102 | 11.505 | 6.200 | n/a | 0.050 | 5.129 | 0.202 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000111 | 24.215 | 3.562 | n/a | 0.000 | 0.264 | 0.961 | 1.612 | 0.020 | n/a | 0.468 | 10.988 | 6.313 | n/a | 0.028 | 3.825 | 0.158 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000011a | 18.384 | 2.165 | n/a | 0.000 | 1.096 | 1.778 | 4.206 | 0.094 | n/a | 0.167 | 8.275 | 0.577 | n/a | 0.026 | 3.261 | 0.177 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000122 | 18.298 | 2.985 | n/a | 3.075 | 0.343 | 1.580 | 1.549 | 0.031 | n/a | 0.716 | 6.749 | 1.230 | n/a | 0.040 | 6.403 | 0.350 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000125 | 16.729 | 3.633 | n/a | 0.000 | 0.827 | 1.079 | 1.744 | 0.045 | n/a | 0.149 | 8.717 | 0.499 | n/a | 0.035 | 4.460 | 0.267 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000000fc | 15.123 | 2.083 | n/a | 1.455 | 0.921 | 0.654 | 1.067 | 0.018 | n/a | 0.097 | 8.289 | 0.503 | n/a | 0.036 | 4.458 | 0.295 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000010e | 12.547 | 2.161 | n/a | 0.000 | 0.615 | 0.616 | 1.376 | 0.019 | n/a | 0.465 | 6.270 | 1.001 | n/a | 0.025 | 2.775 | 0.221 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.915 | 0.449 | 0.000 | 0.664 | 3.640 | n/a | 0.000 | 0.220 | 1.329 | 6.240 | 0.034 | n/a | 0.273 | 9.077 | 4.845 | n/a | 0.033 | 4.425 | 0.179 | 0.033 |
| p99 | 89.466 | 2.657 | 0.000 | 2.833 | 8.339 | n/a | 2.275 | 27.874 | 4.410 | 28.079 | 0.086 | n/a | 4.229 | 52.571 | 43.092 | n/a | 0.091 | 30.767 | 0.748 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a745000000000000013c | 89.466 | 5.183 | 0.160 | 0.669 | 0.065 | 1.604 | 13.753 | 0.036 | n/a | 0.397 | 52.571 | 14.996 | n/a | 0.031 | 6.077 | 0.068 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000015b | 77.945 | 3.006 | 0.521 | 0.313 | 0.033 | 1.367 | 12.361 | 0.052 | n/a | 3.192 | 52.485 | 4.599 | n/a | 0.014 | 3.874 | 0.050 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.872ms; driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.487ms |
| f16c1102c747a745000000000000015c | 61.697 | 2.984 | n/a | 0.000 | 0.501 | 2.921 | 6.240 | 0.017 | n/a | 0.104 | 5.818 | 43.092 | n/a | 0.020 | 3.485 | 0.056 | 0.020 | tx/thread-84/transactor.triplex-function | driver.publication.persist-deferred 2.872ms |
| f16c1102c747a7450000000000000174 | 46.882 | 7.576 | n/a | 2.275 | 0.844 | 1.109 | 28.079 | 0.062 | n/a | 0.108 | 5.628 | 1.162 | n/a | 0.038 | 10.696 | 0.228 | 0.038 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| f16c1102c747a745000000000000016e | 42.912 | 3.805 | 0.212 | 0.000 | 0.052 | 1.235 | 12.037 | 0.062 | n/a | 0.726 | 13.883 | 10.878 | n/a | 0.022 | 4.069 | 0.095 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000136 | 42.660 | 3.016 | 0.178 | 0.000 | 0.059 | 1.380 | 11.549 | 0.049 | n/a | 0.113 | 13.603 | 12.686 | n/a | 0.028 | 3.253 | 0.076 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000012a | 42.396 | 6.842 | 0.250 | 0.333 | 0.153 | 2.452 | 12.165 | 0.050 | n/a | 0.170 | 10.492 | 9.437 | n/a | 0.053 | 7.578 | 0.179 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000175 | 41.136 | 2.894 | n/a | 0.000 | 27.874 | 0.645 | 2.108 | 0.032 | n/a | 0.116 | 6.945 | 0.488 | n/a | 0.035 | 30.767 | 0.748 | 0.035 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.739ms; driver.publication.persist-deferred 1.186ms |
| f16c1102c747a7450000000000000132 | 40.717 | 3.515 | 0.188 | 0.000 | 0.050 | 1.206 | 15.269 | 0.075 | n/a | 0.103 | 12.588 | 7.701 | n/a | 0.022 | 3.752 | 0.092 | 0.022 | gw-w/thread-45/gateway.admitted-work | driver.publication.persist-deferred 0.879ms |
| f16c1102c747a7450000000000000148 | 37.337 | 3.427 | 0.159 | 0.392 | 0.071 | 1.943 | 16.295 | 0.053 | n/a | 0.146 | 8.578 | 6.229 | n/a | 0.043 | 4.049 | 0.108 | 0.043 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a745000000000000013e | 36.666 | 3.289 | 0.247 | 0.000 | 0.220 | 1.362 | 11.833 | 0.033 | n/a | 0.100 | 13.527 | 5.965 | n/a | 0.091 | 3.756 | 0.102 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000014c | 36.458 | 4.825 | 0.279 | 0.000 | 0.063 | 1.792 | 14.932 | 0.030 | n/a | 0.096 | 7.465 | 6.944 | n/a | 0.032 | 5.167 | 0.142 | 0.032 | gw-w/thread-48/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000144 | 35.954 | 3.309 | 0.183 | 0.000 | 0.041 | 1.114 | 9.096 | 0.029 | n/a | 0.797 | 14.086 | 7.280 | n/a | 0.019 | 3.533 | 0.098 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000012c | 35.511 | 3.919 | 0.268 | 0.000 | 0.066 | 1.773 | 10.837 | 0.045 | n/a | 0.499 | 7.080 | 10.992 | n/a | 0.031 | 4.253 | 0.120 | 0.031 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a7450000000000000140 | 33.287 | 5.245 | 0.262 | 0.512 | 0.073 | 1.886 | 8.097 | 0.029 | n/a | 0.089 | 11.912 | 5.126 | n/a | 0.055 | 6.093 | 0.183 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000166 | 31.969 | 4.893 | 0.348 | 0.415 | 0.071 | 2.140 | 9.980 | 0.032 | n/a | 0.110 | 7.463 | 6.483 | n/a | 0.033 | 5.727 | 0.179 | 0.033 | gw-w/thread-48/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000178 | 31.740 | 3.187 | 0.169 | 0.000 | 0.026 | 1.329 | 8.655 | 0.053 | n/a | 0.110 | 8.423 | 9.774 | n/a | 0.014 | 3.383 | 0.107 | 0.014 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a745000000000000015a | 31.368 | 1.900 | n/a | 0.000 | 0.365 | 3.141 | 2.069 | 0.042 | n/a | 1.852 | 16.704 | 5.267 | n/a | 0.028 | 2.265 | 0.072 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000138 | 31.221 | 3.806 | 0.304 | 0.000 | 0.117 | 4.124 | 2.931 | 0.054 | n/a | 0.618 | 18.703 | 0.514 | n/a | 0.051 | 4.227 | 0.135 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000162 | 30.716 | 8.339 | n/a | 0.000 | 0.649 | 1.622 | 2.425 | 0.030 | n/a | 0.202 | 10.802 | 6.559 | n/a | 0.087 | 8.989 | 0.293 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.120 | 0.113 | 0.000 | 0.513 | 2.558 | n/a | 0.000 | 0.473 | 0.867 | 1.738 | 0.023 | n/a | 0.437 | 7.761 | 1.266 | n/a | 0.028 | 3.371 | 0.175 | 0.028 |
| p99 | 41.136 | 1.721 | 0.000 | 0.833 | 7.602 | n/a | 0.000 | 27.874 | 4.410 | 3.922 | 0.075 | n/a | 1.852 | 16.704 | 6.543 | n/a | 0.036 | 30.767 | 0.748 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000175 | 41.136 | 2.894 | n/a | 0.000 | 27.874 | 0.645 | 2.108 | 0.032 | n/a | 0.116 | 6.945 | 0.488 | n/a | 0.035 | 30.767 | 0.748 | 0.035 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.739ms; driver.publication.persist-deferred 1.186ms |
| f16c1102c747a745000000000000015a | 31.368 | 1.900 | n/a | 0.000 | 0.365 | 3.141 | 2.069 | 0.042 | n/a | 1.852 | 16.704 | 5.267 | n/a | 0.028 | 2.265 | 0.072 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000135 | 22.754 | 7.602 | n/a | 0.000 | 0.454 | 4.410 | 3.922 | 0.044 | n/a | 0.607 | 5.226 | 0.453 | n/a | 0.035 | 8.056 | 0.354 | 0.035 | node-14/thread-0/driver.execute | none observed |
| f16c1102c747a7450000000000000131 | 21.811 | 2.413 | n/a | 0.000 | 0.260 | 0.686 | 1.370 | 0.019 | n/a | 0.477 | 10.017 | 6.543 | n/a | 0.026 | 2.674 | 0.123 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000145 | 21.120 | 2.558 | n/a | 0.000 | 1.076 | 0.867 | 1.484 | 0.023 | n/a | 0.437 | 8.760 | 5.885 | n/a | 0.028 | 3.634 | 0.172 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000150 | 17.451 | 2.680 | n/a | 0.000 | 0.691 | 0.992 | 1.738 | 0.022 | n/a | 0.512 | 7.057 | 3.722 | n/a | 0.036 | 3.371 | 0.193 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000015e | 15.458 | 2.699 | n/a | 0.000 | 0.926 | 1.234 | 0.779 | 0.019 | n/a | 0.115 | 9.013 | 0.647 | n/a | 0.027 | 3.625 | 0.234 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.909ms |
| f16c1102c747a745000000000000016c | 15.101 | 2.175 | n/a | 0.000 | 0.473 | 0.793 | 2.113 | 0.075 | n/a | 0.414 | 7.761 | 1.266 | n/a | 0.031 | 2.648 | 0.175 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.904 | 0.416 | 0.000 | 0.613 | 3.894 | 0.424 | 0.000 | 0.117 | 1.381 | 5.176 | 0.032 | n/a | 0.401 | 7.669 | 3.603 | n/a | 0.045 | 4.538 | 0.174 | 0.045 |
| p99 | 78.203 | 2.364 | 0.025 | 1.734 | 9.611 | n/a | 3.984 | 1.182 | 3.104 | 29.829 | 1.702 | n/a | 3.104 | 19.759 | 53.432 | n/a | 0.132 | 14.360 | 0.391 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a74500000000000001a8 | 78.203 | 4.857 | n/a | 0.000 | 0.774 | 1.745 | 1.512 | 0.021 | n/a | 0.529 | 15.302 | 53.432 | n/a | 0.031 | 5.631 | 0.072 | 0.031 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a7450000000000000185 | 65.614 | 4.854 | 0.246 | 0.000 | 0.054 | 1.672 | 29.829 | 0.039 | n/a | 0.335 | 19.759 | 8.797 | n/a | 0.028 | 5.155 | 0.079 | 0.028 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000182 | 43.606 | 3.883 | 0.189 | 0.457 | 0.049 | 1.174 | 19.231 | 0.037 | n/a | 2.872 | 10.139 | 5.556 | n/a | 0.020 | 4.577 | 0.105 | 0.020 | gw-w/thread-47/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000001b7 | 39.986 | 5.473 | 0.357 | 0.000 | 0.090 | 3.104 | 17.587 | 0.111 | n/a | 0.454 | 9.206 | 3.567 | n/a | 0.038 | 5.919 | 0.148 | 0.038 | gw-w/thread-43/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000001a7 | 39.166 | 4.862 | 0.211 | 0.721 | 0.080 | 2.364 | 16.030 | 0.058 | n/a | 0.438 | 7.125 | 7.231 | n/a | 0.047 | 5.874 | 0.150 | 0.047 | gw-w/thread-44/gateway.admitted-work | none observed |
| f16c1102c747a745000000000000018d | 37.242 | 3.111 | 0.234 | 0.413 | 0.062 | 1.681 | 18.726 | 0.070 | n/a | 0.133 | 7.422 | 5.357 | n/a | 0.032 | 3.820 | 0.103 | 0.032 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000001b5 | 36.685 | 9.611 | n/a | 3.984 | 0.765 | 1.019 | 1.876 | 0.026 | n/a | 0.175 | 12.472 | 6.718 | n/a | 0.038 | 14.360 | 0.391 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001a3 | 33.842 | 3.103 | 0.198 | 0.000 | 0.096 | 1.548 | 13.927 | 1.702 | n/a | 0.278 | 9.341 | 3.603 | n/a | 0.046 | 3.396 | 0.100 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001b3 | 30.711 | 4.283 | 0.347 | 0.000 | 0.200 | 1.657 | 8.370 | 0.067 | n/a | 0.211 | 10.339 | 5.148 | n/a | 0.090 | 4.830 | 0.157 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001bf | 30.481 | 4.596 | 0.244 | 0.000 | 0.090 | 1.987 | 9.943 | 0.052 | n/a | 0.593 | 7.638 | 5.291 | n/a | 0.047 | 4.930 | 0.162 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001bb | 28.639 | 4.050 | 0.424 | 0.000 | 0.063 | 1.509 | 9.009 | 0.039 | n/a | 0.103 | 8.070 | 5.327 | n/a | 0.045 | 4.538 | 0.158 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000199 | 28.143 | 3.673 | 0.347 | 0.000 | 0.091 | 1.877 | 9.762 | 0.034 | n/a | 0.139 | 8.480 | 3.692 | n/a | 0.047 | 4.112 | 0.146 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000018f | 27.834 | 3.537 | 0.286 | 0.000 | 0.108 | 1.314 | 10.888 | 0.035 | n/a | 0.401 | 7.895 | 3.316 | n/a | 0.054 | 3.931 | 0.141 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000187 | 27.656 | 2.797 | n/a | 0.000 | 0.840 | 0.438 | 6.091 | 0.032 | n/a | 0.061 | 11.996 | 5.383 | n/a | 0.017 | 3.638 | 0.132 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000197 | 27.548 | 4.170 | n/a | 1.939 | 0.813 | 1.401 | 1.904 | 0.021 | n/a | 0.458 | 12.558 | 4.258 | n/a | 0.027 | 6.922 | 0.251 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001ad | 27.170 | 4.429 | 0.171 | 0.000 | 0.064 | 1.525 | 12.436 | 0.039 | n/a | 0.361 | 5.236 | 2.878 | n/a | 0.031 | 4.664 | 0.172 | 0.031 | gw-w/thread-41/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000195 | 25.793 | 6.428 | 0.176 | 0.354 | 0.089 | 1.289 | 6.417 | 0.026 | n/a | 0.787 | 6.620 | 3.567 | n/a | 0.039 | 7.048 | 0.273 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001c9 | 25.385 | 3.509 | 0.233 | 0.000 | 0.351 | 1.974 | 6.125 | 0.061 | n/a | 1.274 | 8.981 | 2.800 | n/a | 0.078 | 4.093 | 0.161 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000017e | 25.294 | 5.233 | 0.342 | 0.000 | 0.147 | 1.584 | 5.597 | 0.032 | n/a | 0.371 | 4.970 | 6.963 | n/a | 0.053 | 5.723 | 0.226 | 0.053 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000001a1 | 24.904 | 3.679 | 0.186 | 0.376 | 0.084 | 1.776 | 6.334 | 0.036 | n/a | 0.151 | 8.552 | 3.673 | n/a | 0.057 | 4.325 | 0.174 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.182 | 1.001 | 0.000 | 0.692 | 3.249 | n/a | 0.000 | 0.340 | 0.950 | 1.698 | 0.030 | n/a | 0.439 | 5.518 | 0.701 | n/a | 0.052 | 3.476 | 0.257 | 0.052 |
| p99 | 22.269 | 2.364 | 0.000 | 0.873 | 4.526 | n/a | 0.000 | 1.182 | 1.568 | 5.176 | 0.055 | n/a | 3.104 | 9.254 | 4.607 | n/a | 0.132 | 5.376 | 0.340 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a745000000000000018b | 22.269 | 3.210 | n/a | 0.000 | 1.182 | 1.070 | 1.988 | 0.055 | n/a | 0.857 | 9.254 | 4.607 | n/a | 0.046 | 4.392 | 0.197 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000180 | 21.588 | 4.271 | n/a | 0.000 | 0.340 | 1.101 | 5.176 | 0.031 | n/a | 0.141 | 7.669 | 2.771 | n/a | 0.089 | 4.611 | 0.214 | 0.089 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000017c | 20.900 | 4.346 | n/a | 0.000 | 1.030 | 1.381 | 2.131 | 0.054 | n/a | 0.188 | 7.863 | 3.799 | n/a | 0.109 | 5.376 | 0.257 | 0.109 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000193 | 15.277 | 3.894 | n/a | 0.000 | 0.209 | 0.950 | 1.718 | 0.020 | n/a | 0.440 | 4.423 | 3.581 | n/a | 0.043 | 4.103 | 0.269 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000191 | 15.119 | 4.526 | n/a | 0.000 | 0.503 | 1.568 | 1.495 | 0.031 | n/a | 0.625 | 5.537 | 0.701 | n/a | 0.132 | 5.029 | 0.333 | 0.132 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001c6 | 14.182 | 2.432 | n/a | 0.000 | 0.657 | 0.894 | 1.738 | 0.019 | n/a | 0.390 | 7.537 | 0.463 | n/a | 0.052 | 3.089 | 0.218 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001c4 | 13.515 | 2.015 | n/a | 0.000 | 0.065 | 0.779 | 1.698 | 0.040 | n/a | 0.725 | 4.657 | 3.505 | n/a | 0.031 | 2.079 | 0.154 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001af | 12.601 | 3.282 | n/a | 0.000 | 0.115 | 1.221 | 1.557 | 0.030 | n/a | 0.215 | 5.518 | 0.611 | n/a | 0.053 | 3.396 | 0.270 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001a5 | 12.134 | 2.635 | n/a | 0.000 | 0.671 | 0.611 | 0.928 | 0.020 | n/a | 3.104 | 3.625 | 0.517 | n/a | 0.023 | 3.306 | 0.272 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001bc | 10.212 | 3.249 | n/a | 0.000 | 0.227 | 0.889 | 1.285 | 0.019 | n/a | 0.439 | 3.611 | 0.433 | n/a | 0.060 | 3.476 | 0.340 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.090 | 0.000 | 0.000 | 0.442 | 3.220 | n/a | 0.000 | 0.124 | 1.276 | 4.107 | 0.031 | n/a | 0.362 | 6.773 | 3.694 | n/a | 0.029 | 3.802 | 0.173 | 0.029 |
| p99 | 56.645 | 1.002 | 0.000 | 1.605 | 10.335 | n/a | 0.618 | 1.242 | 5.911 | 16.999 | 2.537 | n/a | 4.410 | 20.794 | 31.758 | n/a | 0.090 | 10.921 | 0.273 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a74500000000000001ec | 56.645 | 4.707 | 0.235 | 0.561 | 0.052 | 1.608 | 5.410 | 0.027 | n/a | 0.299 | 11.953 | 31.758 | n/a | 0.034 | 5.555 | 0.098 | 0.034 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000001ee | 56.634 | 10.335 | n/a | 0.000 | 0.586 | 3.138 | 16.999 | 2.537 | n/a | 0.709 | 19.662 | 2.620 | n/a | 0.049 | 10.921 | 0.193 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001d1 | 38.991 | 2.344 | n/a | 0.000 | 1.063 | 4.454 | 1.479 | 0.024 | n/a | 1.888 | 18.844 | 8.855 | n/a | 0.040 | 3.407 | 0.087 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.597ms |
| f16c1102c747a7450000000000000217 | 38.764 | 5.724 | 0.299 | 0.618 | 0.083 | 5.911 | 13.975 | 0.087 | n/a | 0.557 | 6.704 | 4.760 | n/a | 0.046 | 6.724 | 0.173 | 0.046 | gw-w/thread-46/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000215 | 38.307 | 3.769 | 0.182 | 0.279 | 0.062 | 1.641 | 6.540 | 0.044 | n/a | 0.452 | 14.753 | 10.550 | n/a | 0.034 | 4.292 | 0.112 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000209 | 33.319 | 3.383 | 0.222 | 0.297 | 0.047 | 1.294 | 13.589 | 0.060 | n/a | 0.127 | 6.432 | 7.841 | n/a | 0.025 | 3.950 | 0.119 | 0.025 | gw-w/thread-47/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000001d5 | 33.301 | 3.309 | 0.284 | 0.261 | 0.056 | 2.843 | 6.227 | 0.031 | n/a | 4.410 | 10.138 | 5.710 | n/a | 0.031 | 3.910 | 0.117 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001d2 | 31.839 | 3.576 | n/a | 0.000 | 0.261 | 1.681 | 1.424 | 0.010 | n/a | 0.028 | 20.794 | 4.055 | n/a | 0.011 | 3.837 | 0.121 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000205 | 27.665 | 3.503 | 0.285 | 0.469 | 0.077 | 1.675 | 9.231 | 0.046 | n/a | 0.144 | 8.525 | 3.668 | n/a | 0.041 | 4.334 | 0.157 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000021d | 26.998 | 3.260 | 0.252 | 0.324 | 0.219 | 1.564 | 7.995 | 0.031 | n/a | 0.118 | 6.914 | 6.232 | n/a | 0.090 | 4.055 | 0.150 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001dc | 26.414 | 3.171 | 0.179 | 0.242 | 0.048 | 0.912 | 7.020 | 0.030 | n/a | 0.362 | 7.546 | 6.879 | n/a | 0.026 | 3.640 | 0.138 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000203 | 26.090 | 2.006 | n/a | 0.000 | 0.841 | 0.770 | 1.505 | 0.022 | n/a | 0.142 | 9.692 | 11.085 | n/a | 0.028 | 2.847 | 0.109 | 0.028 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000001dd | 25.830 | 5.119 | n/a | 0.000 | 0.550 | 1.131 | 4.107 | 0.023 | n/a | 0.589 | 6.697 | 7.576 | n/a | 0.038 | 5.668 | 0.219 | 0.038 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a7450000000000000219 | 25.755 | 3.120 | 0.176 | 0.430 | 0.054 | 4.877 | 7.912 | 0.024 | n/a | 0.604 | 4.962 | 3.550 | n/a | 0.044 | 3.781 | 0.147 | 0.044 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000001cf | 25.379 | 4.461 | 0.269 | 0.332 | 0.062 | 1.612 | 6.551 | 0.068 | n/a | 0.191 | 6.020 | 5.787 | n/a | 0.028 | 5.123 | 0.202 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000020f | 25.087 | 4.323 | 0.167 | 0.394 | 0.047 | 1.404 | 8.355 | 0.032 | n/a | 0.068 | 6.773 | 3.495 | n/a | 0.029 | 4.930 | 0.197 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001e3 | 24.317 | 3.192 | n/a | 0.000 | 1.242 | 0.913 | 1.373 | 0.020 | n/a | 0.417 | 8.975 | 8.132 | n/a | 0.052 | 4.434 | 0.182 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000201 | 23.832 | 3.865 | 0.325 | 0.223 | 0.058 | 1.795 | 5.955 | 0.046 | n/a | 0.175 | 7.923 | 3.420 | n/a | 0.047 | 4.471 | 0.188 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001e0 | 23.594 | 3.220 | 0.173 | 0.232 | 0.058 | 1.020 | 12.054 | 0.029 | n/a | 0.345 | 5.369 | 1.061 | n/a | 0.033 | 3.683 | 0.156 | 0.033 | gw-w/thread-48/gateway.admitted-work | none observed |
| f16c1102c747a745000000000000020d | 23.504 | 5.038 | 0.426 | 0.371 | 0.079 | 1.872 | 5.322 | 0.034 | n/a | 0.122 | 7.322 | 2.883 | n/a | 0.036 | 5.914 | 0.252 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.134 | 0.000 | 0.000 | 0.454 | 2.095 | n/a | 0.000 | 0.841 | 0.776 | 1.501 | 0.022 | n/a | 0.402 | 6.784 | 3.742 | n/a | 0.027 | 2.936 | 0.163 | 0.027 |
| p99 | 38.991 | 1.002 | 0.000 | 0.728 | 3.192 | n/a | 0.000 | 1.242 | 4.454 | 4.052 | 0.061 | n/a | 1.888 | 18.844 | 11.085 | n/a | 0.052 | 4.434 | 0.273 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a74500000000000001d1 | 38.991 | 2.344 | n/a | 0.000 | 1.063 | 4.454 | 1.479 | 0.024 | n/a | 1.888 | 18.844 | 8.855 | n/a | 0.040 | 3.407 | 0.087 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.597ms |
| f16c1102c747a7450000000000000203 | 26.090 | 2.006 | n/a | 0.000 | 0.841 | 0.770 | 1.505 | 0.022 | n/a | 0.142 | 9.692 | 11.085 | n/a | 0.028 | 2.847 | 0.109 | 0.028 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000001e3 | 24.317 | 3.192 | n/a | 0.000 | 1.242 | 0.913 | 1.373 | 0.020 | n/a | 0.417 | 8.975 | 8.132 | n/a | 0.052 | 4.434 | 0.182 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001e8 | 20.200 | 2.071 | n/a | 0.000 | 0.805 | 0.742 | 1.506 | 0.022 | n/a | 0.424 | 7.748 | 6.852 | n/a | 0.029 | 2.876 | 0.142 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001fe | 20.109 | 2.067 | n/a | 0.000 | 0.881 | 1.061 | 2.455 | 0.054 | n/a | 0.134 | 6.635 | 6.800 | n/a | 0.023 | 2.948 | 0.147 | 0.023 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000001da | 19.726 | 2.095 | n/a | 0.000 | 0.461 | 1.276 | 4.052 | 0.048 | n/a | 1.350 | 7.393 | 3.016 | n/a | 0.035 | 2.556 | 0.130 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001e1 | 19.662 | 2.190 | n/a | 0.000 | 1.008 | 0.628 | 1.501 | 0.022 | n/a | 0.078 | 7.240 | 6.968 | n/a | 0.027 | 3.198 | 0.163 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000021b | 16.134 | 2.153 | n/a | 0.000 | 0.118 | 1.066 | 2.070 | 0.047 | n/a | 0.200 | 6.784 | 3.671 | n/a | 0.024 | 2.271 | 0.141 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001cd | 15.958 | 3.070 | n/a | 0.000 | 0.124 | 0.838 | 3.749 | 0.061 | n/a | 0.165 | 5.529 | 2.375 | n/a | 0.050 | 3.193 | 0.200 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000210 | 15.762 | 2.258 | n/a | 0.000 | 0.805 | 0.776 | 1.002 | 0.020 | n/a | 0.365 | 5.268 | 5.244 | n/a | 0.024 | 3.063 | 0.194 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001cb | 15.423 | 1.755 | n/a | 0.000 | 0.947 | 0.529 | 0.985 | 0.020 | n/a | 0.776 | 6.647 | 3.742 | n/a | 0.023 | 2.702 | 0.175 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000206 | 14.502 | 1.812 | n/a | 0.000 | 0.783 | 0.710 | 0.957 | 0.020 | n/a | 0.604 | 8.837 | 0.753 | n/a | 0.027 | 2.595 | 0.179 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000020b | 12.964 | 1.499 | n/a | 0.000 | 0.455 | 1.436 | 1.657 | 0.044 | n/a | 0.211 | 6.045 | 1.594 | n/a | 0.023 | 1.954 | 0.151 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001f4 | 12.168 | 2.294 | n/a | 0.000 | 0.906 | 0.498 | 0.898 | 0.018 | n/a | 0.402 | 5.027 | 2.109 | n/a | 0.017 | 3.199 | 0.263 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000001e6 | 10.750 | 1.946 | n/a | 0.000 | 0.990 | 0.724 | 1.289 | 0.025 | n/a | 0.546 | 4.677 | 0.525 | n/a | 0.029 | 2.936 | 0.273 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (61 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.764 | n/a | n/a | n/a | 32.797 | 5.193 | 2.809 | 0.000 | 22.102 | 2.069 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.008 | 52.268 | 0.715 | 0.008 |
| p99 | 341.130 | n/a | n/a | n/a | 102.073 | 229.359 | 11.484 | 0.000 | 125.507 | 25.075 | 11.385 | n/a | 0.026 | 0.000 | n/a | n/a | 0.018 | 281.759 | 1.000 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000001d56 | 341.130 | 49.477 | 229.359 | 2.922 | 0.000 | 55.494 | 3.855 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.006 | 281.759 | 0.826 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.617ms; driver.publication.persist-deferred 1.177ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.811ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a7450000000000001d47 | 291.737 | 49.569 | 129.681 | 1.388 | 0.000 | 99.862 | 11.214 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.008 | 180.638 | 0.619 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.811ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a7450000000000001d50 | 278.677 | 21.316 | 178.381 | 0.000 | 0.000 | 77.242 | 1.717 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.008 | 199.697 | 0.717 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 1.177ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.811ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a7450000000000001d65 | 252.950 | 93.426 | 131.660 | 8.029 | 0.000 | 10.374 | 9.435 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.008 | 233.115 | 0.922 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.617ms; driver.publication.persist-deferred 1.177ms; driver.publication.persist-deferred 0.862ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.811ms |
| f16c1102c747a7450000000000001d42 | 227.949 | 31.396 | 85.648 | 1.860 | 0.000 | 101.370 | 1.776 | 5.887 | n/a | 0.005 | 0.000 | n/a | n/a | 0.007 | 118.904 | 0.522 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a7450000000000001d59 | 226.004 | 51.275 | 79.898 | 4.081 | 0.000 | 89.174 | 1.563 | 0.002 | n/a | 0.004 | 0.000 | n/a | n/a | 0.008 | 135.254 | 0.598 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.177ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.811ms; driver.publication.persist-deferred 0.807ms; driver.publication.persist-deferred 0.804ms |
| f16c1102c747a7450000000000001d51 | 220.442 | 42.741 | 159.546 | 3.454 | 0.000 | 11.173 | 3.511 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.007 | 205.741 | 0.933 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.811ms; driver.publication.persist-deferred 0.807ms; driver.publication.persist-deferred 0.806ms; driver.publication.persist-deferred 0.804ms |
| f16c1102c747a7450000000000001d46 | 208.756 | 44.248 | 89.927 | 1.957 | 0.000 | 63.698 | 8.907 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.008 | 136.132 | 0.652 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a7450000000000001d4b | 202.539 | 79.607 | 81.382 | 4.754 | 0.000 | 29.550 | 7.226 | 0.001 | n/a | 0.011 | 0.000 | n/a | n/a | 0.007 | 165.744 | 0.818 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.821ms; driver.publication.persist-deferred 0.807ms; driver.publication.persist-deferred 0.806ms |
| f16c1102c747a7450000000000001d3c | 173.285 | 41.417 | 67.939 | 3.998 | 0.000 | 47.420 | 12.482 | 0.008 | n/a | 0.013 | 0.000 | n/a | n/a | 0.008 | 113.354 | 0.654 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.875ms; driver.publication.persist-deferred 0.806ms |
| f16c1102c747a74500000000000018b7 | 162.333 | 58.228 | 36.857 | 11.484 | 0.000 | 52.508 | 3.242 | 0.001 | n/a | 0.003 | 0.000 | n/a | n/a | 0.008 | 106.570 | 0.656 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.946ms; driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.904ms; driver.publication.persist-deferred 0.879ms |
| f16c1102c747a745000000000000101b | 160.292 | 20.750 | 0.239 | 10.712 | 0.000 | 125.507 | 0.863 | 2.206 | n/a | 0.008 | 0.000 | n/a | n/a | 0.007 | 31.702 | 0.198 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.255ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.835ms; driver.publication.persist-deferred 0.824ms |
| f16c1102c747a7450000000000001a31 | 151.468 | 48.865 | 75.183 | 1.203 | 0.000 | 3.009 | 23.189 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.005 | 125.250 | 0.827 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.083ms; driver.publication.persist-deferred 1.049ms; driver.publication.persist-deferred 1.045ms; driver.publication.persist-deferred 1.010ms; driver.publication.persist-deferred 0.750ms |
| f16c1102c747a7450000000000001016 | 148.341 | 28.751 | 1.877 | 1.591 | 0.000 | 109.112 | 1.106 | 5.892 | n/a | 0.007 | 0.000 | n/a | n/a | 0.006 | 32.219 | 0.217 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.414ms; driver.publication.persist-deferred 1.255ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 0.902ms |
| f16c1102c747a7450000000000001300 | 147.967 | 102.073 | 27.016 | 8.795 | 0.000 | 0.865 | 9.188 | 0.007 | n/a | 0.017 | 0.000 | n/a | n/a | 0.006 | 137.884 | 0.932 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 0.939ms; driver.publication.persist-deferred 0.824ms; driver.publication.persist-deferred 0.822ms; driver.publication.persist-deferred 0.818ms; driver.publication.persist-deferred 0.792ms |
| f16c1102c747a7450000000000001021 | 140.828 | 15.082 | 43.791 | 1.223 | 0.000 | 79.894 | 0.810 | 0.012 | n/a | 0.013 | 0.000 | n/a | n/a | 0.004 | 60.095 | 0.427 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.255ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.859ms; driver.publication.persist-deferred 0.835ms |
| f16c1102c747a7450000000000001d35 | 133.412 | 27.738 | 3.205 | 4.758 | 0.000 | 85.012 | 1.297 | 11.385 | n/a | 0.004 | 0.000 | n/a | n/a | 0.012 | 35.701 | 0.268 | 0.012 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.875ms |
| f16c1102c747a7450000000000001d38 | 132.410 | 14.510 | 2.013 | 0.000 | 0.000 | 102.454 | 2.207 | 11.212 | n/a | 0.004 | 0.000 | n/a | n/a | 0.009 | 16.523 | 0.125 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.875ms |
| f16c1102c747a7450000000000001022 | 131.198 | 23.777 | 83.990 | 0.000 | 0.000 | 22.102 | 1.314 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.004 | 107.767 | 0.821 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.255ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.859ms; driver.publication.persist-deferred 0.835ms |
| f16c1102c747a7450000000000001d40 | 129.343 | 21.726 | 100.952 | 0.000 | 0.000 | 5.611 | 1.031 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.009 | 122.678 | 0.948 | 0.009 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 3.227ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.806ms; driver.publication.persist-deferred 0.792ms |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.465 | 0.283 | 0.000 | 0.589 | 3.363 | n/a | 0.000 | 0.303 | 1.171 | 2.793 | 0.029 | n/a | 0.228 | 6.516 | 3.106 | n/a | 0.033 | 3.834 | 0.190 | 0.033 |
| p99 | 73.797 | 2.001 | 0.000 | 1.693 | 4.988 | n/a | 3.294 | 1.195 | 4.709 | 55.066 | 1.105 | n/a | 3.727 | 39.040 | 9.378 | n/a | 0.064 | 7.696 | 0.393 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000280 | 73.797 | 3.256 | 0.247 | 0.242 | 0.040 | 1.025 | 55.066 | 0.021 | n/a | 0.118 | 7.010 | 6.750 | n/a | 0.023 | 3.785 | 0.051 | 0.023 | gw-w/thread-46/gateway.admitted-work | none observed |
| f16c1102c747a745000000000000022a | 64.510 | 2.949 | 0.263 | 0.242 | 0.034 | 1.204 | 15.010 | 0.034 | n/a | 0.087 | 39.040 | 5.627 | n/a | 0.020 | 3.489 | 0.054 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000262 | 37.501 | 1.664 | n/a | 0.000 | 1.032 | 0.825 | 1.222 | 0.016 | n/a | 0.128 | 28.151 | 4.446 | n/a | 0.017 | 2.696 | 0.072 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000241 | 36.979 | 3.771 | 0.391 | 0.323 | 0.070 | 2.121 | 9.181 | 0.044 | n/a | 0.169 | 13.144 | 7.726 | n/a | 0.039 | 4.555 | 0.123 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000022f | 35.646 | 3.993 | n/a | 0.000 | 0.650 | 0.790 | 14.819 | 0.052 | n/a | 0.094 | 5.846 | 9.378 | n/a | 0.024 | 4.643 | 0.130 | 0.024 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| f16c1102c747a745000000000000025b | 34.748 | 3.514 | 0.266 | 0.479 | 0.078 | 1.664 | 12.633 | 0.038 | n/a | 0.149 | 8.394 | 7.495 | n/a | 0.039 | 4.336 | 0.125 | 0.039 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000248 | 31.926 | 1.467 | n/a | 0.000 | 0.564 | 3.278 | 2.837 | 0.015 | n/a | 3.727 | 12.736 | 7.286 | n/a | 0.016 | 2.031 | 0.064 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.223ms |
| f16c1102c747a745000000000000023d | 29.913 | 4.377 | 0.243 | 0.416 | 0.052 | 1.559 | 9.435 | 0.033 | n/a | 0.414 | 9.426 | 3.929 | n/a | 0.029 | 5.088 | 0.170 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000231 | 29.827 | 3.084 | 0.212 | 0.243 | 0.147 | 4.709 | 9.815 | 0.041 | n/a | 0.124 | 6.516 | 4.880 | n/a | 0.055 | 3.687 | 0.124 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000245 | 29.523 | 4.884 | 0.309 | 0.352 | 0.051 | 2.098 | 8.147 | 0.043 | n/a | 0.220 | 9.633 | 3.756 | n/a | 0.030 | 5.596 | 0.190 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000265 | 29.335 | 3.915 | 0.359 | 3.294 | 0.127 | 1.734 | 6.259 | 0.031 | n/a | 0.148 | 8.630 | 4.780 | n/a | 0.058 | 7.696 | 0.262 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000243 | 29.197 | 2.930 | 0.204 | 0.218 | 0.065 | 1.193 | 6.561 | 0.031 | n/a | 0.311 | 11.867 | 5.784 | n/a | 0.033 | 3.417 | 0.117 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000026e | 25.758 | 4.309 | 0.244 | 0.401 | 0.045 | 1.813 | 5.401 | 0.036 | n/a | 0.276 | 5.549 | 7.663 | n/a | 0.020 | 5.000 | 0.194 | 0.020 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a7450000000000000247 | 25.263 | 2.391 | n/a | 0.000 | 0.321 | 1.077 | 3.048 | 0.055 | n/a | 3.291 | 11.896 | 3.122 | n/a | 0.064 | 2.711 | 0.107 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000022c | 25.072 | 2.562 | n/a | 0.000 | 0.411 | 0.723 | 4.318 | 0.019 | n/a | 0.107 | 13.416 | 3.479 | n/a | 0.037 | 2.973 | 0.119 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000021f | 24.822 | 3.311 | 0.163 | 0.260 | 0.063 | 1.414 | 7.855 | 0.031 | n/a | 0.705 | 5.506 | 5.473 | n/a | 0.040 | 3.797 | 0.153 | 0.040 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a745000000000000024d | 24.316 | 4.915 | 0.250 | 0.474 | 0.049 | 1.565 | 5.744 | 0.022 | n/a | 0.405 | 7.759 | 3.106 | n/a | 0.027 | 5.688 | 0.234 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000260 | 23.894 | 4.242 | n/a | 0.000 | 0.317 | 0.697 | 1.355 | 0.013 | n/a | 0.106 | 9.755 | 7.369 | n/a | 0.041 | 4.559 | 0.191 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000226 | 23.856 | 3.363 | n/a | 0.000 | 0.634 | 2.175 | 2.507 | 0.044 | n/a | 0.264 | 9.208 | 5.627 | n/a | 0.034 | 3.997 | 0.168 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000027c | 23.772 | 4.030 | 0.193 | 0.211 | 0.052 | 0.999 | 12.362 | 0.022 | n/a | 0.119 | 3.624 | 2.136 | n/a | 0.025 | 4.486 | 0.189 | 0.025 | gw-w/thread-47/gateway.admitted-work | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.910 | 0.000 | 0.000 | 0.439 | 2.479 | n/a | 0.000 | 0.564 | 0.822 | 1.455 | 0.017 | n/a | 0.209 | 5.935 | 1.129 | n/a | 0.034 | 2.973 | 0.215 | 0.034 |
| p99 | 37.501 | 1.996 | 0.000 | 0.888 | 4.988 | n/a | 0.000 | 1.195 | 3.278 | 8.197 | 1.105 | n/a | 3.727 | 28.151 | 7.286 | n/a | 0.050 | 6.135 | 0.393 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000262 | 37.501 | 1.664 | n/a | 0.000 | 1.032 | 0.825 | 1.222 | 0.016 | n/a | 0.128 | 28.151 | 4.446 | n/a | 0.017 | 2.696 | 0.072 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000248 | 31.926 | 1.467 | n/a | 0.000 | 0.564 | 3.278 | 2.837 | 0.015 | n/a | 3.727 | 12.736 | 7.286 | n/a | 0.016 | 2.031 | 0.064 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.223ms |
| f16c1102c747a745000000000000022c | 25.072 | 2.562 | n/a | 0.000 | 0.411 | 0.723 | 4.318 | 0.019 | n/a | 0.107 | 13.416 | 3.479 | n/a | 0.037 | 2.973 | 0.119 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000267 | 21.731 | 4.988 | n/a | 0.000 | 1.039 | 1.918 | 8.197 | 0.029 | n/a | 0.209 | 5.115 | 0.216 | n/a | 0.020 | 6.028 | 0.277 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000234 | 18.692 | 1.866 | n/a | 0.000 | 0.875 | 0.701 | 0.994 | 0.018 | n/a | 0.384 | 6.887 | 6.941 | n/a | 0.026 | 2.741 | 0.147 | 0.026 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a745000000000000026c | 17.024 | 2.946 | n/a | 0.000 | 0.256 | 1.345 | 2.232 | 0.081 | n/a | 0.283 | 5.935 | 3.907 | n/a | 0.038 | 3.202 | 0.188 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000220 | 16.385 | 4.939 | n/a | 0.000 | 1.195 | 2.834 | 3.031 | 1.105 | n/a | 1.562 | 1.475 | 0.204 | n/a | 0.039 | 6.135 | 0.374 | 0.039 | node-14/thread-0/driver.execute | none observed |
| f16c1102c747a745000000000000027e | 16.310 | 3.517 | n/a | 0.000 | 0.401 | 1.441 | 2.793 | 0.047 | n/a | 0.511 | 6.759 | 0.792 | n/a | 0.050 | 3.918 | 0.240 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000228 | 15.910 | 2.672 | n/a | 0.000 | 0.098 | 0.654 | 1.219 | 0.015 | n/a | 0.114 | 8.327 | 2.774 | n/a | 0.037 | 2.770 | 0.174 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000027a | 14.517 | 2.201 | n/a | 0.000 | 0.913 | 1.051 | 1.455 | 0.025 | n/a | 0.172 | 7.969 | 0.688 | n/a | 0.043 | 3.114 | 0.215 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000023e | 12.396 | 1.751 | n/a | 0.000 | 0.350 | 0.822 | 2.056 | 0.049 | n/a | 0.168 | 6.454 | 0.716 | n/a | 0.029 | 2.101 | 0.170 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000025e | 11.995 | 1.683 | n/a | 0.000 | 0.953 | 0.427 | 2.381 | 0.015 | n/a | 0.302 | 5.088 | 1.129 | n/a | 0.017 | 2.636 | 0.220 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000224 | 11.802 | 3.253 | n/a | 0.000 | 0.303 | 0.368 | 0.951 | 0.017 | n/a | 0.362 | 4.215 | 2.299 | n/a | 0.034 | 3.556 | 0.301 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000252 | 10.900 | 3.590 | n/a | 0.000 | 0.694 | 0.967 | 1.010 | 0.015 | n/a | 0.403 | 3.649 | 0.524 | n/a | 0.047 | 4.284 | 0.393 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000274 | 10.794 | 2.479 | n/a | 0.000 | 0.206 | 0.494 | 1.126 | 0.015 | n/a | 0.064 | 4.917 | 1.466 | n/a | 0.027 | 2.685 | 0.249 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000025c | 10.766 | 2.473 | n/a | 0.000 | 0.925 | 0.768 | 1.122 | 0.017 | n/a | 0.150 | 4.480 | 0.798 | n/a | 0.034 | 3.397 | 0.316 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.598 | 0.000 | 0.000 | 0.513 | 3.519 | n/a | 0.000 | 0.225 | 1.218 | 2.128 | 0.024 | n/a | 0.163 | 5.860 | 3.326 | n/a | 0.040 | 4.146 | 0.211 | 0.040 |
| p99 | 51.596 | 2.001 | 0.000 | 1.774 | 7.868 | n/a | 3.630 | 1.193 | 9.706 | 17.086 | 0.049 | n/a | 3.121 | 29.370 | n/a | n/a | 0.101 | 8.836 | 0.497 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000297 | 51.596 | 4.517 | 0.177 | 0.384 | 0.045 | 1.393 | 5.602 | 0.020 | n/a | 0.098 | 29.370 | 9.965 | n/a | 0.025 | 5.123 | 0.099 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002a3 | 37.361 | 3.754 | 0.337 | 0.364 | 0.152 | 1.555 | 17.086 | 0.049 | n/a | 0.358 | 6.828 | 6.824 | n/a | 0.052 | 4.607 | 0.123 | 0.052 | gw-w/thread-43/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000291 | 34.860 | 3.260 | 0.237 | 0.241 | 0.056 | 1.345 | 14.033 | 0.037 | n/a | 3.121 | 7.606 | 4.895 | n/a | 0.027 | 3.795 | 0.109 | 0.027 | gw-w/thread-45/gateway.admitted-work | none observed |
| f16c1102c747a7450000000000000288 | 32.758 | 2.453 | n/a | 0.000 | 0.991 | 0.977 | 1.910 | 0.026 | n/a | 0.123 | 22.413 | 3.822 | n/a | 0.043 | 3.444 | 0.105 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002b3 | 31.162 | 4.786 | 0.250 | 3.630 | 0.170 | 3.133 | 6.236 | 0.027 | n/a | 0.119 | 8.917 | 3.800 | n/a | 0.095 | 8.836 | 0.284 | 0.095 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002d6 | 30.767 | 6.195 | 0.251 | 0.524 | 0.225 | 3.107 | 8.797 | 0.049 | n/a | 0.163 | 9.049 | 2.312 | n/a | 0.096 | 7.195 | 0.234 | 0.096 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000028a | 27.050 | 3.038 | 0.169 | 0.376 | 0.034 | 1.361 | 6.703 | 0.031 | n/a | 0.471 | 8.486 | 6.359 | n/a | 0.020 | 3.617 | 0.134 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000028f | 26.664 | 3.293 | n/a | 0.000 | 0.564 | 1.421 | 4.500 | 0.038 | n/a | 0.757 | 5.580 | 10.464 | n/a | 0.047 | 3.858 | 0.145 | 0.047 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a7450000000000000286 | 25.271 | 2.861 | 0.177 | 0.267 | 0.056 | 1.159 | 8.381 | 0.023 | n/a | 0.106 | 6.239 | 5.973 | n/a | 0.029 | 3.361 | 0.133 | 0.029 | gw-w/thread-43/gateway.admitted-work | none observed |
| f16c1102c747a745000000000000028c | 24.227 | 3.061 | n/a | 0.000 | 1.085 | 0.669 | 1.561 | 0.016 | n/a | 0.483 | 10.154 | 7.172 | n/a | 0.025 | 4.146 | 0.171 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002a7 | 24.200 | 4.226 | 0.206 | 0.470 | 0.135 | 3.250 | 5.607 | 0.022 | n/a | 0.303 | 6.131 | 3.771 | n/a | 0.077 | 5.038 | 0.208 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000299 | 23.655 | 4.653 | 0.278 | 0.417 | 0.099 | 1.741 | 5.235 | 0.028 | n/a | 0.100 | 7.543 | 3.490 | n/a | 0.072 | 5.447 | 0.230 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002cb | 23.580 | 3.329 | n/a | 0.000 | 0.690 | 9.706 | 9.648 | 0.041 | n/a | 0.092 | 0.000 | n/a | n/a | 0.073 | 4.020 | 0.170 | 0.073 | node-14/thread-0/socket.wait-first-byte | none observed |
| f16c1102c747a74500000000000002d4 | 23.178 | 3.627 | 0.338 | 0.335 | 0.067 | 1.722 | 6.956 | 0.038 | n/a | 0.126 | 6.426 | 3.500 | n/a | 0.043 | 4.368 | 0.188 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002a8 | 23.171 | 6.323 | n/a | 0.000 | 1.067 | 0.800 | 1.879 | 0.024 | n/a | 0.130 | 8.315 | 4.555 | n/a | 0.079 | 7.390 | 0.319 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002b9 | 22.781 | 4.473 | n/a | 0.000 | 1.109 | 1.064 | 5.041 | 0.025 | n/a | 0.132 | 9.618 | 1.235 | n/a | 0.085 | 5.582 | 0.245 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002bb | 22.031 | 3.480 | 0.326 | 0.254 | 0.088 | 1.218 | 4.520 | 0.021 | n/a | 0.386 | 5.398 | 6.296 | n/a | 0.042 | 4.149 | 0.188 | 0.042 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000002b1 | 21.040 | 3.609 | 0.220 | 0.397 | 0.028 | 1.359 | 5.342 | 0.039 | n/a | 1.523 | 5.248 | 3.255 | n/a | 0.019 | 4.254 | 0.202 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002b7 | 20.906 | 3.231 | 0.227 | 0.309 | 0.098 | 1.435 | 7.929 | 0.034 | n/a | 0.140 | 5.066 | 2.397 | n/a | 0.039 | 3.866 | 0.185 | 0.039 | gw-w/thread-43/gateway.admitted-work | none observed |
| f16c1102c747a74500000000000002ce | 20.867 | 3.387 | 0.289 | 0.480 | 0.052 | 1.557 | 5.967 | 0.025 | n/a | 0.095 | 5.654 | 3.326 | n/a | 0.035 | 4.208 | 0.202 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.786 | 0.000 | 0.000 | 0.513 | 3.262 | n/a | 0.000 | 0.545 | 1.035 | 1.446 | 0.020 | n/a | 0.176 | 5.860 | 1.427 | n/a | 0.053 | 3.908 | 0.234 | 0.053 |
| p99 | 23.580 | 1.009 | 0.000 | 1.774 | 4.515 | n/a | 0.000 | 1.109 | 9.706 | 9.648 | 0.041 | n/a | 0.767 | 9.949 | n/a | n/a | 0.101 | 5.582 | 0.354 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a74500000000000002cb | 23.580 | 3.329 | n/a | 0.000 | 0.690 | 9.706 | 9.648 | 0.041 | n/a | 0.092 | 0.000 | n/a | n/a | 0.073 | 4.020 | 0.170 | 0.073 | node-14/thread-0/socket.wait-first-byte | none observed |
| f16c1102c747a74500000000000002b9 | 22.781 | 4.473 | n/a | 0.000 | 1.109 | 1.064 | 5.041 | 0.025 | n/a | 0.132 | 9.618 | 1.235 | n/a | 0.085 | 5.582 | 0.245 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002a1 | 19.598 | 4.378 | n/a | 0.000 | 0.368 | 1.654 | 1.399 | 0.020 | n/a | 0.169 | 7.874 | 3.642 | n/a | 0.093 | 4.747 | 0.242 | 0.093 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002c0 | 18.681 | 3.851 | n/a | 0.000 | 0.212 | 0.898 | 1.596 | 0.019 | n/a | 0.458 | 8.916 | 2.679 | n/a | 0.053 | 4.063 | 0.217 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002bc | 17.529 | 2.081 | n/a | 0.000 | 0.545 | 0.625 | 1.412 | 0.018 | n/a | 0.469 | 8.533 | 3.822 | n/a | 0.025 | 2.626 | 0.150 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002a4 | 16.791 | 4.515 | n/a | 0.000 | 0.327 | 1.509 | 1.603 | 0.027 | n/a | 0.187 | 5.369 | 3.170 | n/a | 0.084 | 4.843 | 0.288 | 0.084 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002b5 | 16.280 | 2.715 | n/a | 0.000 | 0.713 | 1.254 | 2.128 | 0.026 | n/a | 0.197 | 7.737 | 1.410 | n/a | 0.101 | 3.427 | 0.211 | 0.101 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000281 | 15.786 | 1.885 | n/a | 0.000 | 0.575 | 0.549 | 1.269 | 0.016 | n/a | 0.092 | 9.949 | 1.427 | n/a | 0.023 | 2.460 | 0.156 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000029a | 15.415 | 4.334 | n/a | 0.000 | 1.109 | 1.387 | 1.446 | 0.025 | n/a | 0.357 | 5.860 | 0.817 | n/a | 0.080 | 5.443 | 0.353 | 0.080 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000284 | 13.670 | 3.262 | n/a | 0.000 | 0.947 | 1.035 | 2.125 | 0.031 | n/a | 0.767 | 4.733 | 0.706 | n/a | 0.063 | 4.209 | 0.308 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000292 | 13.273 | 2.106 | n/a | 0.000 | 0.470 | 0.690 | 1.462 | 0.020 | n/a | 0.176 | 7.617 | 0.700 | n/a | 0.032 | 2.576 | 0.194 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002c7 | 11.888 | 2.601 | n/a | 0.000 | 0.136 | 1.230 | 1.038 | 0.016 | n/a | 0.142 | 4.562 | 2.138 | n/a | 0.025 | 2.737 | 0.230 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002ad | 11.483 | 1.787 | n/a | 0.000 | 0.906 | 0.628 | 1.118 | 0.020 | n/a | 0.157 | 4.552 | 2.290 | n/a | 0.024 | 2.692 | 0.234 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000029d | 11.051 | 3.519 | n/a | 0.000 | 0.389 | 0.953 | 1.060 | 0.017 | n/a | 0.153 | 4.291 | 0.638 | n/a | 0.031 | 3.908 | 0.354 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000002c4 | 8.095 | 1.510 | n/a | 0.000 | 0.484 | 0.728 | 1.427 | 0.024 | n/a | 0.180 | 3.294 | 0.431 | n/a | 0.017 | 1.994 | 0.246 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (837 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.656 | 0.327 | 0.000 | 0.533 | 2.310 | n/a | 0.000 | 0.691 | 0.689 | 1.095 | 0.015 | n/a | 0.117 | 5.250 | 0.798 | n/a | 0.018 | 3.219 | 0.247 | 0.018 |
| p99 | 53.085 | 2.098 | 0.048 | 2.032 | 7.160 | n/a | 0.000 | 16.982 | 10.545 | 7.951 | 0.048 | n/a | 3.573 | 32.423 | 21.709 | n/a | 0.064 | 19.005 | 0.653 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000373 | 79.258 | 2.320 | n/a | 0.000 | 67.292 | 1.643 | 1.964 | 0.022 | n/a | 0.273 | 5.138 | 0.574 | n/a | 0.033 | 69.612 | 0.878 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.950ms; driver.publication.persist-deferred 0.836ms; driver.publication.persist-deferred 0.761ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.553ms |
| f16c1102c747a7450000000000000372 | 68.853 | 2.584 | n/a | 0.000 | 24.396 | 0.419 | 1.009 | 0.017 | n/a | 0.057 | 35.022 | 5.329 | n/a | 0.020 | 26.980 | 0.392 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.950ms; driver.publication.persist-deferred 0.836ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.553ms |
| f16c1102c747a74500000000000004a8 | 63.233 | 3.011 | n/a | 0.000 | 0.623 | 1.095 | 1.593 | 0.030 | n/a | 0.698 | 46.163 | 9.993 | n/a | 0.027 | 3.634 | 0.057 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.779ms |
| f16c1102c747a74500000000000004ae | 59.787 | 2.646 | n/a | 0.000 | 41.583 | 0.858 | 1.224 | 0.017 | n/a | 0.084 | 9.209 | 4.153 | n/a | 0.013 | 44.229 | 0.740 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.868ms; driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.807ms; driver.publication.persist-deferred 0.668ms |
| f16c1102c747a745000000000000036b | 58.500 | 1.980 | n/a | 0.000 | 18.419 | 2.177 | 1.704 | 0.042 | n/a | 0.267 | 33.355 | 0.547 | n/a | 0.010 | 20.399 | 0.349 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.883ms; driver.publication.persist-deferred 0.846ms; driver.publication.persist-deferred 0.786ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.557ms |
| f16c1102c747a74500000000000004ab | 57.740 | 2.064 | n/a | 0.000 | 4.041 | 2.145 | 0.659 | 0.007 | n/a | 0.052 | 48.396 | 0.351 | n/a | 0.026 | 6.105 | 0.106 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a74500000000000004aa | 55.468 | 4.969 | n/a | 0.000 | 0.299 | 1.030 | 1.468 | 0.018 | n/a | 0.495 | 39.947 | 7.217 | n/a | 0.026 | 5.268 | 0.095 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a74500000000000004ac | 55.369 | 1.428 | n/a | 0.000 | 0.370 | 0.403 | 0.746 | 0.007 | n/a | 0.463 | 49.052 | 2.879 | n/a | 0.021 | 1.797 | 0.032 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.807ms; driver.publication.persist-deferred 0.668ms |
| f16c1102c747a7450000000000000374 | 53.085 | 2.747 | 0.164 | 0.000 | 0.070 | 1.107 | 10.017 | 0.026 | n/a | 0.070 | 29.574 | 9.282 | n/a | 0.029 | 2.980 | 0.056 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.950ms; driver.publication.persist-deferred 0.836ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.553ms |
| f16c1102c747a74500000000000004a5 | 52.321 | 3.678 | n/a | 0.000 | 0.640 | 0.534 | 2.332 | 0.031 | n/a | 3.226 | 14.153 | 27.717 | n/a | 0.011 | 4.318 | 0.083 | 0.011 | tx/thread-84/transactor.triplex-function | driver.publication.persist-deferred 0.993ms; driver.publication.persist-deferred 0.779ms |
| f16c1102c747a745000000000000036e | 50.115 | 1.626 | n/a | 0.000 | 2.406 | 3.515 | 1.022 | 0.044 | n/a | 0.441 | 40.581 | 0.460 | n/a | 0.019 | 4.033 | 0.080 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.883ms; driver.publication.persist-deferred 0.759ms |
| f16c1102c747a7450000000000000706 | 47.728 | 3.864 | 0.274 | 0.000 | 0.038 | 1.199 | 1.740 | 0.027 | n/a | 0.129 | 12.439 | 27.997 | n/a | 0.021 | 4.176 | 0.087 | 0.021 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a745000000000000036d | 46.536 | 1.942 | n/a | 0.000 | 0.086 | 0.636 | 0.797 | 0.015 | n/a | 0.108 | 19.794 | 23.136 | n/a | 0.021 | 2.028 | 0.044 | 0.021 | tx/thread-84/transactor.triplex-function | driver.publication.persist-deferred 0.883ms |
| f16c1102c747a7450000000000000707 | 46.046 | 1.989 | n/a | 0.000 | 0.865 | 3.384 | 1.750 | 0.011 | n/a | 0.060 | 37.274 | 0.703 | n/a | 0.010 | 2.853 | 0.062 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000470 | 45.650 | 3.513 | n/a | 0.000 | 1.434 | 6.581 | 0.757 | 0.005 | n/a | 0.480 | 28.968 | 3.907 | n/a | 0.005 | 4.947 | 0.108 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.022ms; driver.publication.persist-deferred 0.969ms; driver.publication.persist-deferred 0.749ms; driver.publication.persist-deferred 0.560ms |
| f16c1102c747a7450000000000000518 | 45.493 | 4.850 | n/a | 0.000 | 0.194 | 26.502 | 1.857 | 0.038 | n/a | 0.876 | 7.180 | 3.972 | n/a | 0.024 | 5.044 | 0.111 | 0.024 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.630ms |
| f16c1102c747a7450000000000000825 | 44.027 | 7.358 | n/a | 0.000 | 0.729 | 10.930 | 2.938 | 0.047 | n/a | 0.262 | 16.991 | 4.767 | n/a | 0.005 | 8.087 | 0.184 | 0.005 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.743ms; driver.expected-state.bind-receipt 1.444ms; driver.publication.persist-deferred 1.130ms; driver.expected-state.bind-receipt 1.109ms; driver.publication.persist-deferred 1.100ms |
| f16c1102c747a74500000000000002e0 | 43.865 | 6.999 | n/a | 0.000 | 0.401 | 4.954 | 5.229 | 0.043 | n/a | 0.513 | 24.959 | 0.741 | n/a | 0.027 | 7.399 | 0.169 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000824 | 43.739 | 4.750 | n/a | 0.000 | 24.188 | 1.315 | 3.587 | 0.018 | n/a | 0.868 | 5.966 | 3.033 | n/a | 0.012 | 28.939 | 0.662 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.743ms; driver.publication.persist-deferred 1.131ms; driver.publication.persist-deferred 1.130ms; driver.expected-state.bind-receipt 1.109ms; driver.publication.persist-deferred 1.042ms |
| f16c1102c747a745000000000000046d | 43.577 | 1.646 | n/a | 0.000 | 4.797 | 8.411 | 0.766 | 0.016 | n/a | 0.660 | 26.853 | 0.413 | n/a | 0.015 | 6.443 | 0.148 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.567ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.000 | 0.000 | 0.000 | 0.406 | 1.889 | n/a | 0.000 | 0.722 | 0.675 | 0.937 | 0.014 | n/a | 0.120 | 4.875 | 0.592 | n/a | 0.018 | 2.729 | 0.234 | 0.018 |
| p99 | 46.536 | 2.000 | 0.056 | 1.772 | 5.207 | n/a | 0.000 | 15.477 | 9.966 | 5.229 | 0.047 | n/a | 3.863 | 28.968 | 20.599 | n/a | 0.073 | 18.166 | 0.673 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000373 | 79.258 | 2.320 | n/a | 0.000 | 67.292 | 1.643 | 1.964 | 0.022 | n/a | 0.273 | 5.138 | 0.574 | n/a | 0.033 | 69.612 | 0.878 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.950ms; driver.publication.persist-deferred 0.836ms; driver.publication.persist-deferred 0.761ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.553ms |
| f16c1102c747a74500000000000004ab | 57.740 | 2.064 | n/a | 0.000 | 4.041 | 2.145 | 0.659 | 0.007 | n/a | 0.052 | 48.396 | 0.351 | n/a | 0.026 | 6.105 | 0.106 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.807ms |
| f16c1102c747a74500000000000004ac | 55.369 | 1.428 | n/a | 0.000 | 0.370 | 0.403 | 0.746 | 0.007 | n/a | 0.463 | 49.052 | 2.879 | n/a | 0.021 | 1.797 | 0.032 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.820ms; driver.publication.persist-deferred 0.807ms; driver.publication.persist-deferred 0.668ms |
| f16c1102c747a745000000000000036e | 50.115 | 1.626 | n/a | 0.000 | 2.406 | 3.515 | 1.022 | 0.044 | n/a | 0.441 | 40.581 | 0.460 | n/a | 0.019 | 4.033 | 0.080 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.883ms; driver.publication.persist-deferred 0.759ms |
| f16c1102c747a745000000000000036d | 46.536 | 1.942 | n/a | 0.000 | 0.086 | 0.636 | 0.797 | 0.015 | n/a | 0.108 | 19.794 | 23.136 | n/a | 0.021 | 2.028 | 0.044 | 0.021 | tx/thread-84/transactor.triplex-function | driver.publication.persist-deferred 0.883ms |
| f16c1102c747a7450000000000000707 | 46.046 | 1.989 | n/a | 0.000 | 0.865 | 3.384 | 1.750 | 0.011 | n/a | 0.060 | 37.274 | 0.703 | n/a | 0.010 | 2.853 | 0.062 | 0.010 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000470 | 45.650 | 3.513 | n/a | 0.000 | 1.434 | 6.581 | 0.757 | 0.005 | n/a | 0.480 | 28.968 | 3.907 | n/a | 0.005 | 4.947 | 0.108 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.022ms; driver.publication.persist-deferred 0.969ms; driver.publication.persist-deferred 0.749ms; driver.publication.persist-deferred 0.560ms |
| f16c1102c747a74500000000000002e0 | 43.865 | 6.999 | n/a | 0.000 | 0.401 | 4.954 | 5.229 | 0.043 | n/a | 0.513 | 24.959 | 0.741 | n/a | 0.027 | 7.399 | 0.169 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000046d | 43.577 | 1.646 | n/a | 0.000 | 4.797 | 8.411 | 0.766 | 0.016 | n/a | 0.660 | 26.853 | 0.413 | n/a | 0.015 | 6.443 | 0.148 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.567ms |
| f16c1102c747a745000000000000046e | 43.130 | 1.878 | n/a | 0.000 | 4.155 | 10.006 | 0.312 | 0.006 | n/a | 0.021 | 26.516 | 0.231 | n/a | 0.005 | 6.033 | 0.140 | 0.005 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.567ms |
| f16c1102c747a7450000000000000342 | 40.773 | 2.342 | n/a | 0.000 | 0.329 | 0.747 | 1.529 | 0.025 | n/a | 2.080 | 12.000 | 21.709 | n/a | 0.013 | 2.671 | 0.066 | 0.013 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a7450000000000000345 | 39.506 | 2.772 | n/a | 0.000 | 12.011 | 1.509 | 1.053 | 0.016 | n/a | 0.364 | 18.588 | 3.155 | n/a | 0.039 | 14.782 | 0.374 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.034ms; driver.publication.persist-deferred 0.989ms; driver.publication.persist-deferred 0.833ms |
| f16c1102c747a745000000000000081f | 39.452 | 1.464 | n/a | 0.000 | 17.541 | 2.389 | 0.581 | 0.004 | n/a | 0.026 | 16.541 | 0.894 | n/a | 0.012 | 19.005 | 0.482 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.743ms; driver.publication.persist-deferred 1.131ms; driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 0.995ms; driver.publication.persist-deferred 0.570ms |
| f16c1102c747a7450000000000000375 | 38.854 | 2.113 | n/a | 0.000 | 0.972 | 0.403 | 1.036 | 0.014 | n/a | 0.052 | 15.403 | 18.848 | n/a | 0.012 | 3.085 | 0.079 | 0.012 | tx/thread-84/transactor.triplex-function | driver.publication.persist-deferred 0.950ms; driver.publication.persist-deferred 0.759ms; driver.publication.persist-deferred 0.553ms |
| f16c1102c747a7450000000000000708 | 35.676 | 3.157 | n/a | 0.000 | 1.099 | 7.042 | 1.264 | 0.023 | n/a | 0.100 | 22.626 | 0.323 | n/a | 0.040 | 4.256 | 0.119 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000739 | 35.666 | 1.850 | n/a | 0.000 | 16.316 | 0.628 | 1.146 | 0.013 | n/a | 0.093 | 14.546 | 1.058 | n/a | 0.016 | 18.166 | 0.509 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.522ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.866ms |
| f16c1102c747a74500000000000003a6 | 35.443 | 2.785 | n/a | 0.000 | 7.597 | 2.235 | 1.324 | 0.016 | n/a | 1.290 | 12.996 | 7.172 | n/a | 0.027 | 10.382 | 0.293 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.515ms; driver.publication.persist-deferred 1.885ms |
| f16c1102c747a745000000000000041d | 35.312 | 1.647 | n/a | 0.000 | 3.673 | 0.529 | 1.238 | 0.015 | n/a | 0.635 | 24.127 | 3.435 | n/a | 0.013 | 5.320 | 0.151 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.990ms; driver.publication.persist-deferred 0.883ms; driver.publication.persist-deferred 0.680ms |
| f16c1102c747a74500000000000004c0 | 34.007 | 2.852 | n/a | 0.000 | 1.835 | 0.775 | 0.844 | 0.026 | n/a | 0.341 | 26.666 | 0.638 | n/a | 0.030 | 4.687 | 0.138 | 0.030 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.622ms |
| f16c1102c747a7450000000000000630 | 33.561 | 1.448 | n/a | 0.000 | 0.307 | 2.616 | 0.821 | 0.009 | n/a | 0.289 | 27.564 | 0.492 | n/a | 0.015 | 1.755 | 0.052 | 0.015 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.070ms |

## P2 / tail / commit (2631 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.033 | 0.120 | 0.000 | 0.485 | 2.149 | n/a | 0.000 | 0.678 | 0.570 | 0.933 | 0.012 | n/a | 0.086 | 4.133 | 0.737 | n/a | 0.014 | 2.955 | 0.288 | 0.014 |
| p99 | 38.486 | 2.008 | 0.024 | 2.044 | 6.970 | n/a | 0.000 | 11.690 | 6.599 | 5.879 | 0.045 | n/a | 3.219 | 24.144 | 7.045 | n/a | 0.043 | 14.914 | 0.653 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a745000000000000115b | 66.194 | 9.991 | n/a | 0.000 | 34.418 | 2.718 | 5.033 | 0.086 | n/a | 0.941 | 10.229 | 2.766 | n/a | 0.013 | 44.409 | 0.671 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.365ms; driver.publication.persist-deferred 1.191ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 0.895ms; driver.publication.persist-deferred 0.886ms |
| f16c1102c747a7450000000000000de9 | 62.980 | 5.383 | n/a | 0.000 | 5.138 | 8.967 | 3.625 | 0.054 | n/a | 1.022 | 30.861 | 7.914 | n/a | 0.015 | 10.521 | 0.167 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.886ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.780ms; driver.publication.persist-deferred 0.779ms; driver.publication.persist-deferred 0.665ms |
| f16c1102c747a74500000000000011bd | 52.465 | 1.205 | n/a | 0.000 | 39.562 | 1.052 | 0.730 | 0.011 | n/a | 0.068 | 8.280 | 1.548 | n/a | 0.008 | 40.767 | 0.777 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.066ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.948ms; driver.publication.persist-deferred 0.736ms; driver.publication.persist-deferred 0.734ms |
| f16c1102c747a7450000000000000e7a | 50.443 | 1.491 | n/a | 0.000 | 0.911 | 0.404 | 0.694 | 0.008 | n/a | 0.052 | 36.775 | 10.091 | n/a | 0.017 | 2.402 | 0.048 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.921ms |
| f16c1102c747a7450000000000001589 | 48.530 | 3.811 | n/a | 0.000 | 1.136 | 1.762 | 2.485 | 0.027 | n/a | 4.469 | 30.891 | 3.944 | n/a | 0.005 | 4.947 | 0.102 | 0.005 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.770ms; driver.publication.persist-deferred 0.751ms; driver.publication.persist-deferred 0.594ms |
| f16c1102c747a7450000000000001159 | 48.085 | 3.159 | n/a | 0.000 | 29.102 | 0.823 | 1.764 | 0.030 | n/a | 0.156 | 11.498 | 1.536 | n/a | 0.016 | 32.261 | 0.671 | 0.016 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.365ms; driver.publication.persist-deferred 1.191ms |
| f16c1102c747a7450000000000000dd4 | 46.136 | 2.109 | n/a | 0.000 | 0.547 | 2.842 | 1.061 | 0.012 | n/a | 1.119 | 30.714 | 7.718 | n/a | 0.014 | 2.656 | 0.058 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.866ms; driver.publication.persist-deferred 0.984ms; driver.publication.persist-deferred 0.824ms |
| f16c1102c747a74500000000000009ab | 44.260 | 4.895 | n/a | 0.000 | 0.831 | 16.204 | 2.688 | 0.036 | n/a | 3.366 | 13.802 | 2.418 | n/a | 0.021 | 5.725 | 0.129 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.312ms; driver.publication.persist-deferred 1.309ms; driver.publication.persist-deferred 1.122ms |
| f16c1102c747a7450000000000001275 | 44.179 | 2.274 | n/a | 0.000 | 1.034 | 4.044 | 1.798 | 0.023 | n/a | 0.164 | 34.123 | 0.712 | n/a | 0.006 | 3.308 | 0.075 | 0.006 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.744ms |
| f16c1102c747a7450000000000000c4b | 44.172 | 3.362 | 0.242 | 0.000 | 0.026 | 1.177 | 12.895 | 0.018 | n/a | 0.067 | 24.247 | 2.125 | n/a | 0.013 | 3.630 | 0.082 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000000fe0 | 43.077 | 4.816 | n/a | 0.000 | 0.520 | 0.495 | 2.038 | 0.009 | n/a | 0.056 | 8.198 | 26.924 | n/a | 0.021 | 5.336 | 0.124 | 0.021 | tx/thread-84/transactor.triplex-function | none observed |
| f16c1102c747a74500000000000011bb | 42.832 | 7.742 | n/a | 0.000 | 0.190 | 3.035 | 2.627 | 0.061 | n/a | 1.640 | 26.574 | 0.949 | n/a | 0.014 | 7.932 | 0.185 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.066ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.948ms |
| f16c1102c747a74500000000000011ff | 42.664 | 5.005 | n/a | 0.000 | 1.037 | 7.030 | 3.241 | 0.041 | n/a | 0.296 | 24.492 | 1.514 | n/a | 0.007 | 6.042 | 0.142 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.865ms |
| f16c1102c747a7450000000000000de8 | 40.981 | 12.983 | n/a | 0.000 | 0.115 | 3.211 | 2.234 | 0.027 | n/a | 0.252 | 15.165 | 6.976 | n/a | 0.018 | 13.098 | 0.320 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a74500000000000015d6 | 40.813 | 1.886 | n/a | 0.000 | 31.423 | 0.926 | 1.594 | 0.024 | n/a | 0.069 | 3.412 | 1.466 | n/a | 0.013 | 33.309 | 0.816 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.193ms; driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 0.892ms; driver.publication.persist-deferred 0.803ms |
| f16c1102c747a74500000000000013f7 | 40.604 | 2.685 | n/a | 0.000 | 0.140 | 0.610 | 0.810 | 0.013 | n/a | 0.989 | 34.338 | 0.989 | n/a | 0.031 | 2.825 | 0.070 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000001866 | 40.384 | 1.992 | n/a | 0.000 | 0.885 | 0.374 | 0.651 | 0.008 | n/a | 0.031 | 29.938 | 6.486 | n/a | 0.019 | 2.877 | 0.071 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.002ms |
| f16c1102c747a7450000000000000966 | 39.476 | 3.119 | n/a | 0.000 | 9.035 | 8.096 | 1.724 | 0.030 | n/a | 5.124 | 10.694 | 1.639 | n/a | 0.013 | 12.155 | 0.308 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.202ms; driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 1.029ms; driver.publication.persist-deferred 0.739ms |
| f16c1102c747a74500000000000016e8 | 39.356 | 2.043 | n/a | 0.000 | 2.857 | 3.886 | 0.410 | 0.006 | n/a | 0.033 | 29.698 | 0.408 | n/a | 0.014 | 4.900 | 0.125 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms |
| f16c1102c747a7450000000000000d87 | 39.333 | 3.468 | n/a | 0.000 | 0.818 | 0.728 | 1.922 | 0.019 | n/a | 0.084 | 31.572 | 0.701 | n/a | 0.022 | 4.285 | 0.109 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.086ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.552 | 0.000 | 0.000 | 0.385 | 1.719 | n/a | 0.000 | 0.696 | 0.559 | 0.800 | 0.012 | n/a | 0.086 | 3.843 | 0.554 | n/a | 0.014 | 2.524 | 0.272 | 0.014 |
| p99 | 37.350 | 1.994 | 0.000 | 0.877 | 5.005 | n/a | 0.000 | 13.877 | 7.030 | 4.129 | 0.044 | n/a | 2.679 | 24.492 | 5.909 | n/a | 0.043 | 15.506 | 0.653 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f16c1102c747a7450000000000000de9 | 62.980 | 5.383 | n/a | 0.000 | 5.138 | 8.967 | 3.625 | 0.054 | n/a | 1.022 | 30.861 | 7.914 | n/a | 0.015 | 10.521 | 0.167 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.886ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.780ms; driver.publication.persist-deferred 0.779ms; driver.publication.persist-deferred 0.665ms |
| f16c1102c747a74500000000000011bd | 52.465 | 1.205 | n/a | 0.000 | 39.562 | 1.052 | 0.730 | 0.011 | n/a | 0.068 | 8.280 | 1.548 | n/a | 0.008 | 40.767 | 0.777 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.066ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.948ms; driver.publication.persist-deferred 0.736ms; driver.publication.persist-deferred 0.734ms |
| f16c1102c747a7450000000000000e7a | 50.443 | 1.491 | n/a | 0.000 | 0.911 | 0.404 | 0.694 | 0.008 | n/a | 0.052 | 36.775 | 10.091 | n/a | 0.017 | 2.402 | 0.048 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.921ms |
| f16c1102c747a7450000000000000dd4 | 46.136 | 2.109 | n/a | 0.000 | 0.547 | 2.842 | 1.061 | 0.012 | n/a | 1.119 | 30.714 | 7.718 | n/a | 0.014 | 2.656 | 0.058 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.866ms; driver.publication.persist-deferred 0.984ms; driver.publication.persist-deferred 0.824ms |
| f16c1102c747a74500000000000011bb | 42.832 | 7.742 | n/a | 0.000 | 0.190 | 3.035 | 2.627 | 0.061 | n/a | 1.640 | 26.574 | 0.949 | n/a | 0.014 | 7.932 | 0.185 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.066ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 0.948ms |
| f16c1102c747a74500000000000011ff | 42.664 | 5.005 | n/a | 0.000 | 1.037 | 7.030 | 3.241 | 0.041 | n/a | 0.296 | 24.492 | 1.514 | n/a | 0.007 | 6.042 | 0.142 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.865ms |
| f16c1102c747a74500000000000013f7 | 40.604 | 2.685 | n/a | 0.000 | 0.140 | 0.610 | 0.810 | 0.013 | n/a | 0.989 | 34.338 | 0.989 | n/a | 0.031 | 2.825 | 0.070 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000001866 | 40.384 | 1.992 | n/a | 0.000 | 0.885 | 0.374 | 0.651 | 0.008 | n/a | 0.031 | 29.938 | 6.486 | n/a | 0.019 | 2.877 | 0.071 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.002ms |
| f16c1102c747a74500000000000016e8 | 39.356 | 2.043 | n/a | 0.000 | 2.857 | 3.886 | 0.410 | 0.006 | n/a | 0.033 | 29.698 | 0.408 | n/a | 0.014 | 4.900 | 0.125 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms |
| f16c1102c747a7450000000000000dee | 39.105 | 0.954 | n/a | 0.000 | 31.268 | 0.354 | 0.689 | 0.015 | n/a | 0.230 | 4.628 | 0.956 | n/a | 0.010 | 32.221 | 0.824 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.886ms; driver.publication.persist-deferred 0.882ms; driver.publication.persist-deferred 0.780ms; driver.publication.persist-deferred 0.779ms; driver.publication.persist-deferred 0.670ms |
| f16c1102c747a74500000000000013f8 | 38.725 | 1.670 | n/a | 0.000 | 0.230 | 0.439 | 0.951 | 0.019 | n/a | 0.084 | 34.066 | 1.223 | n/a | 0.043 | 1.901 | 0.049 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.069ms |
| f16c1102c747a745000000000000115a | 38.665 | 1.323 | n/a | 0.000 | 32.154 | 0.399 | 0.807 | 0.012 | n/a | 0.093 | 3.390 | 0.477 | n/a | 0.010 | 33.477 | 0.866 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.365ms; driver.publication.persist-deferred 1.191ms; driver.publication.persist-deferred 0.895ms |
| f16c1102c747a7450000000000000dea | 38.486 | 4.742 | n/a | 0.000 | 3.170 | 2.543 | 1.623 | 0.032 | n/a | 0.207 | 23.124 | 3.035 | n/a | 0.010 | 7.912 | 0.206 | 0.010 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.886ms |
| f16c1102c747a7450000000000000d62 | 37.926 | 5.073 | n/a | 0.000 | 2.319 | 3.749 | 3.849 | 0.032 | n/a | 0.163 | 22.351 | 0.382 | n/a | 0.008 | 7.392 | 0.195 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.679ms; driver.publication.persist-deferred 1.153ms; driver.publication.persist-deferred 1.122ms; driver.publication.persist-deferred 1.040ms; driver.publication.persist-deferred 0.950ms |
| f16c1102c747a7450000000000001865 | 37.374 | 2.950 | n/a | 0.000 | 0.107 | 0.568 | 0.820 | 0.011 | n/a | 0.074 | 32.229 | 0.529 | n/a | 0.086 | 3.057 | 0.082 | 0.086 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a745000000000000158d | 37.350 | 1.951 | n/a | 0.000 | 0.250 | 2.329 | 0.680 | 0.013 | n/a | 0.067 | 31.409 | 0.639 | n/a | 0.013 | 2.201 | 0.059 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.901ms; driver.publication.persist-deferred 0.770ms; driver.publication.persist-deferred 0.223ms |
| f16c1102c747a7450000000000001d2e | 36.512 | 1.716 | n/a | 0.000 | 0.196 | 0.392 | 0.720 | 0.010 | n/a | 0.053 | 32.899 | 0.508 | n/a | 0.019 | 1.912 | 0.052 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f16c1102c747a7450000000000001d2f | 35.807 | 1.169 | n/a | 0.000 | 0.417 | 0.572 | 0.408 | 0.006 | n/a | 0.134 | 32.545 | 0.550 | n/a | 0.005 | 1.587 | 0.044 | 0.005 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.718ms |
| f16c1102c747a74500000000000016e9 | 35.179 | 5.325 | n/a | 0.000 | 2.303 | 3.622 | 0.603 | 0.009 | n/a | 2.870 | 20.120 | 0.309 | n/a | 0.019 | 7.628 | 0.217 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.484ms |
| f16c1102c747a74500000000000009e7 | 34.745 | 2.876 | n/a | 0.000 | 1.174 | 0.729 | 1.543 | 0.018 | n/a | 0.088 | 11.832 | 16.450 | n/a | 0.036 | 4.050 | 0.117 | 0.036 | tx/thread-84/transactor.triplex-function | driver.expected-state.bind-receipt 1.212ms; driver.publication.persist-deferred 1.208ms; driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.858ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.475 | n/a | n/a | n/a | 0.126 | n/a | 0.000 | 0.000 | 1.077 | 200.794 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.137 | 0.126 | 0.001 | 0.137 |
| p99 | 403.357 | n/a | n/a | n/a | 19.016 | n/a | 1.797 | 0.000 | 4.690 | 395.969 | 0.101 | n/a | 0.103 | 0.000 | n/a | n/a | 0.555 | 20.813 | 0.345 | 0.555 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e0000000000000002 | 403.357 | 4.688 | n/a | 0.000 | 0.000 | 1.960 | 395.969 | 0.101 | n/a | 0.083 | 0.000 | n/a | n/a | 0.555 | 4.688 | 0.012 | 0.555 | gw-r/thread-42/gateway.admitted-work | none observed |
| 713914ecef8b86fa0000000000000006 | 202.476 | 0.126 | n/a | 0.000 | 0.000 | 1.077 | 201.062 | 0.008 | n/a | 0.103 | 0.000 | n/a | n/a | 0.101 | 0.126 | 0.001 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa0000000000000005 | 202.300 | 0.072 | n/a | 0.000 | 0.000 | 1.069 | 200.863 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.202 | 0.072 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000f30 | 201.510 | 0.026 | n/a | 0.000 | 0.000 | 0.527 | 200.851 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.043 | 0.026 | 0.000 | 0.043 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000f2e | 201.475 | 0.051 | n/a | 0.000 | 0.000 | 0.520 | 200.794 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.059 | 0.051 | 0.000 | 0.059 | gw-r/thread-65/journal/page | none observed |
| 713914ecef8b86fa0000000000000f2f | 200.757 | 0.024 | n/a | 0.000 | 0.000 | 0.310 | 200.356 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.049 | 0.024 | 0.000 | 0.049 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000f33 | 60.258 | 19.016 | n/a | 1.797 | 0.000 | 4.690 | 34.516 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.233 | 20.813 | 0.345 | 0.233 | gw-r/thread-63/gateway.admitted-work | none observed |
| 713914ecef8b86fa0000000000000f35 | 56.589 | 14.998 | n/a | 0.000 | 0.000 | 3.292 | 38.145 | 0.007 | n/a | 0.010 | 0.000 | n/a | n/a | 0.137 | 14.998 | 0.265 | 0.137 | gw-r/thread-47/gateway.admitted-work | none observed |
| 713914ecef8b86fa0000000000000f34 | 50.871 | 15.241 | n/a | 0.000 | 0.000 | 3.798 | 31.676 | 0.006 | n/a | 0.008 | 0.000 | n/a | n/a | 0.141 | 15.241 | 0.300 | 0.141 | gw-r/thread-44/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 821.798 | n/a | n/a | n/a | 0.297 | n/a | 0.000 | 0.000 | 0.669 | 798.622 | 0.011 | n/a | 0.183 | 0.000 | n/a | n/a | 0.391 | 0.297 | 0.000 | 0.391 |
| p99 | 1008.603 | n/a | n/a | n/a | 17.256 | n/a | 4.666 | 0.000 | 2.247 | 1001.732 | 0.036 | n/a | 0.307 | 0.000 | n/a | n/a | 3.985 | 21.922 | 0.027 | 3.985 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e00000000000000a4 | 1008.603 | 0.297 | n/a | 0.000 | 0.000 | 2.247 | 1001.732 | 0.036 | n/a | 0.307 | 0.000 | n/a | n/a | 3.985 | 0.297 | 0.000 | 3.985 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000000a5 | 821.798 | 17.256 | n/a | 4.666 | 0.000 | 0.669 | 798.622 | 0.011 | n/a | 0.183 | 0.000 | n/a | n/a | 0.391 | 21.922 | 0.027 | 0.391 | gw-r/thread-42/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 451.523 | n/a | n/a | n/a | 2.385 | n/a | 0.000 | 0.000 | 0.882 | 444.201 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.076 | 2.385 | 0.006 | 0.076 |
| p99 | 1008.376 | n/a | n/a | n/a | 9.261 | n/a | 0.000 | 0.000 | 4.440 | 1004.918 | 0.048 | n/a | 0.145 | 0.000 | n/a | n/a | 0.179 | 9.261 | 0.059 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e00000000000000bb | 1008.376 | 2.307 | n/a | 0.000 | 0.000 | 0.944 | 1004.918 | 0.017 | n/a | 0.107 | 0.000 | n/a | n/a | 0.083 | 2.307 | 0.002 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e00000000000000b4 | 987.295 | 2.394 | n/a | 0.000 | 0.000 | 0.559 | 984.090 | 0.021 | n/a | 0.143 | 0.000 | n/a | n/a | 0.088 | 2.394 | 0.002 | 0.088 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000000ba | 985.591 | 2.374 | n/a | 0.000 | 0.000 | 0.668 | 982.384 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.083 | 2.374 | 0.002 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000000ae | 981.329 | 2.546 | n/a | 0.000 | 0.000 | 2.508 | 976.095 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.074 | 2.546 | 0.003 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000000ab | 975.138 | 2.598 | n/a | 0.000 | 0.000 | 0.789 | 971.523 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.115 | 2.598 | 0.003 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000000ce | 952.453 | 2.273 | n/a | 0.000 | 0.000 | 0.538 | 949.499 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.069 | 2.273 | 0.002 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000000c1 | 924.547 | 9.261 | n/a | 0.000 | 0.000 | 4.440 | 910.685 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 9.261 | 0.010 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 542a559c16e7089e00000000000000a8 | 914.333 | 2.201 | n/a | 0.000 | 0.000 | 0.552 | 911.373 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.123 | 2.201 | 0.002 | 0.123 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000ca | 776.198 | 2.308 | n/a | 0.000 | 0.000 | 0.661 | 773.059 | 0.017 | n/a | 0.086 | 0.000 | n/a | n/a | 0.067 | 2.308 | 0.003 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000000b2 | 558.626 | 2.658 | n/a | 0.000 | 0.000 | 2.073 | 553.729 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.076 | 2.658 | 0.005 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000000c4 | 550.251 | 1.784 | n/a | 0.000 | 0.000 | 1.861 | 546.455 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.069 | 1.784 | 0.003 | 0.069 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000000c7 | 507.821 | 2.229 | n/a | 0.000 | 0.000 | 0.489 | 504.952 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.065 | 2.229 | 0.004 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000000c8 | 494.796 | 2.685 | n/a | 0.000 | 0.000 | 0.620 | 491.330 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.075 | 2.685 | 0.005 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 542a559c16e7089e00000000000000bf | 461.432 | 2.279 | n/a | 0.000 | 0.000 | 0.602 | 458.409 | 0.012 | n/a | 0.053 | 0.000 | n/a | n/a | 0.076 | 2.279 | 0.005 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e00000000000000b7 | 451.523 | 6.167 | n/a | 0.000 | 0.000 | 0.882 | 444.201 | 0.016 | n/a | 0.099 | 0.000 | n/a | n/a | 0.158 | 6.167 | 0.014 | 0.158 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000000c6 | 447.142 | 2.604 | n/a | 0.000 | 0.000 | 1.525 | 442.842 | 0.048 | n/a | 0.053 | 0.000 | n/a | n/a | 0.071 | 2.604 | 0.006 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000b5 | 346.412 | 5.019 | n/a | 0.000 | 0.000 | 2.380 | 338.843 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.082 | 5.019 | 0.014 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000000b1 | 313.232 | 7.443 | n/a | 0.000 | 0.000 | 1.035 | 304.549 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.120 | 7.443 | 0.024 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000a7 | 278.996 | 2.810 | n/a | 0.000 | 0.000 | 0.670 | 275.177 | 0.016 | n/a | 0.145 | 0.000 | n/a | n/a | 0.179 | 2.810 | 0.010 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000000bc | 269.821 | 1.953 | n/a | 0.000 | 0.000 | 2.208 | 265.496 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.072 | 1.953 | 0.007 | 0.072 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 482.555 | n/a | n/a | n/a | 3.940 | n/a | 0.548 | 0.000 | 0.692 | 468.526 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.090 | 4.594 | 0.012 | 0.090 |
| p99 | 1006.340 | n/a | n/a | n/a | 14.077 | n/a | 3.476 | 0.000 | 5.977 | 1001.775 | 0.509 | n/a | 0.169 | 0.000 | n/a | n/a | 1.231 | 15.507 | 0.769 | 1.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e00000000000000d0 | 1006.340 | 0.173 | n/a | 0.000 | 0.000 | 3.179 | 1001.724 | 0.020 | n/a | 0.135 | 0.000 | n/a | n/a | 1.108 | 0.173 | 0.000 | 1.108 | gw-r/thread-48/journal/page | none observed |
| 542a559c16e7089e00000000000000d8 | 1004.122 | 4.649 | n/a | 0.608 | 0.000 | 0.366 | 998.291 | 0.020 | n/a | 0.080 | 0.000 | n/a | n/a | 0.108 | 5.257 | 0.005 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000fc | 1003.701 | 0.165 | n/a | 0.000 | 0.000 | 0.398 | 1001.775 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 1.231 | 0.165 | 0.000 | 1.231 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e000000000000010c | 995.445 | 5.438 | n/a | 0.000 | 0.000 | 0.555 | 989.340 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.067 | 5.438 | 0.005 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000000de | 989.602 | 3.390 | n/a | 0.458 | 0.000 | 0.437 | 985.103 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.124 | 3.848 | 0.004 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000000d9 | 987.419 | 3.215 | n/a | 0.509 | 0.000 | 0.388 | 983.162 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.070 | 3.723 | 0.004 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000000d2 | 987.174 | 3.608 | n/a | 0.707 | 0.000 | 0.612 | 982.117 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.085 | 4.314 | 0.004 | 0.085 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000104 | 983.350 | 2.844 | n/a | 0.000 | 0.000 | 0.755 | 979.619 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.060 | 2.844 | 0.003 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000000dd | 947.718 | 3.092 | n/a | 0.446 | 0.000 | 0.557 | 943.421 | 0.018 | n/a | 0.085 | 0.000 | n/a | n/a | 0.099 | 3.538 | 0.004 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000000df | 925.506 | 7.809 | n/a | 0.669 | 0.000 | 0.421 | 916.352 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.201 | 8.478 | 0.009 | 0.201 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000000101 | 912.466 | 2.502 | n/a | 0.000 | 0.000 | 1.782 | 907.969 | 0.018 | n/a | 0.117 | 0.000 | n/a | n/a | 0.079 | 2.502 | 0.003 | 0.079 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000100 | 898.238 | 3.369 | n/a | 0.656 | 0.000 | 0.580 | 893.361 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.165 | 4.026 | 0.004 | 0.165 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000e4 | 688.571 | 4.573 | n/a | 0.841 | 0.000 | 0.900 | 682.140 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.076 | 5.414 | 0.008 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000ea | 668.774 | 5.591 | n/a | 0.000 | 0.000 | 0.595 | 661.881 | 0.509 | n/a | 0.046 | 0.000 | n/a | n/a | 0.152 | 5.591 | 0.008 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000000f9 | 656.793 | 5.287 | n/a | 0.628 | 0.000 | 2.166 | 648.569 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.073 | 5.915 | 0.009 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000000da | 617.196 | 6.891 | n/a | 1.055 | 0.000 | 5.977 | 603.095 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.087 | 7.946 | 0.013 | 0.087 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000000d3 | 529.011 | 3.702 | n/a | 0.488 | 0.000 | 1.349 | 523.293 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.094 | 4.190 | 0.008 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000000e5 | 512.084 | 3.427 | n/a | 0.808 | 0.000 | 0.419 | 507.290 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.070 | 4.234 | 0.008 | 0.070 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000000e7 | 496.792 | 4.652 | n/a | 0.501 | 0.000 | 2.989 | 488.487 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.102 | 5.153 | 0.010 | 0.102 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000106 | 482.868 | 9.944 | n/a | 3.476 | 0.000 | 0.659 | 468.526 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.187 | 13.419 | 0.028 | 0.187 | gw-r/thread-63/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 402.619 | n/a | n/a | n/a | 3.355 | n/a | 0.000 | 0.000 | 0.647 | 389.998 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.075 | 3.355 | 0.010 | 0.075 |
| p99 | 1002.976 | n/a | n/a | n/a | 12.424 | n/a | 2.210 | 0.000 | 5.271 | 1001.033 | 4.881 | n/a | 0.124 | 0.000 | n/a | n/a | 1.162 | 13.283 | 0.731 | 1.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e000000000000012a | 1002.976 | 0.119 | n/a | 0.000 | 0.000 | 0.632 | 1001.033 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 1.104 | 0.119 | 0.000 | 1.104 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000113 | 1002.676 | 0.119 | n/a | 0.000 | 0.000 | 0.663 | 1000.686 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 1.162 | 0.119 | 0.000 | 1.162 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e0000000000000137 | 1002.603 | 0.107 | n/a | 0.000 | 0.000 | 0.406 | 1000.902 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 1.103 | 0.107 | 0.000 | 1.103 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e0000000000000129 | 1000.543 | 2.659 | n/a | 0.000 | 0.000 | 0.705 | 997.064 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.072 | 2.659 | 0.003 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e0000000000000125 | 998.364 | 3.110 | n/a | 0.000 | 0.000 | 0.367 | 994.780 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.064 | 3.110 | 0.003 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e000000000000011c | 994.237 | 5.921 | n/a | 0.000 | 0.000 | 1.389 | 986.699 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.165 | 5.921 | 0.006 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000110 | 950.392 | 2.170 | n/a | 0.000 | 0.000 | 5.271 | 942.839 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.057 | 2.170 | 0.002 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000000126 | 877.247 | 7.238 | n/a | 0.758 | 0.000 | 0.399 | 868.761 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.067 | 7.996 | 0.009 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e000000000000011d | 860.757 | 2.081 | n/a | 0.000 | 0.000 | 0.786 | 857.756 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.075 | 2.081 | 0.002 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 542a559c16e7089e0000000000000141 | 853.007 | 4.397 | n/a | 0.000 | 0.000 | 0.685 | 847.809 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 4.397 | 0.005 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e000000000000010d | 808.616 | 4.764 | n/a | 0.801 | 0.000 | 0.526 | 802.394 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 5.565 | 0.007 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 542a559c16e7089e0000000000000134 | 799.314 | 5.168 | n/a | 0.000 | 0.000 | 3.893 | 790.054 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.146 | 5.168 | 0.006 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000000142 | 737.710 | 4.091 | n/a | 0.000 | 0.000 | 2.096 | 731.384 | 0.013 | n/a | 0.052 | 0.000 | n/a | n/a | 0.073 | 4.091 | 0.006 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000139 | 694.093 | 12.424 | n/a | 0.859 | 0.000 | 1.564 | 679.083 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.104 | 13.283 | 0.019 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000148 | 623.424 | 3.958 | n/a | 0.000 | 0.000 | 0.488 | 618.770 | 0.020 | n/a | 0.115 | 0.000 | n/a | n/a | 0.073 | 3.958 | 0.006 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e000000000000013e | 611.362 | 2.651 | n/a | 0.000 | 0.000 | 0.877 | 607.642 | 0.006 | n/a | 0.120 | 0.000 | n/a | n/a | 0.065 | 2.651 | 0.004 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000133 | 577.107 | 4.224 | n/a | 0.000 | 0.000 | 0.487 | 572.281 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.062 | 4.224 | 0.007 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000123 | 552.110 | 3.021 | n/a | 0.000 | 0.000 | 0.390 | 548.581 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.065 | 3.021 | 0.005 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e000000000000012e | 541.146 | 2.513 | n/a | 0.000 | 0.000 | 2.997 | 535.528 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.059 | 2.513 | 0.005 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 542a559c16e7089e000000000000012c | 468.464 | 2.510 | n/a | 0.000 | 0.000 | 0.502 | 465.312 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.077 | 2.510 | 0.005 | 0.077 | gw-r/thread-42/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 464.816 | n/a | n/a | n/a | 2.656 | n/a | 0.000 | 0.000 | 0.656 | 458.090 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.067 | 2.656 | 0.007 | 0.067 |
| p99 | 1006.557 | n/a | n/a | n/a | 9.372 | n/a | 0.801 | 0.000 | 3.601 | 1001.338 | 0.509 | n/a | 0.082 | 0.000 | n/a | n/a | 1.107 | 10.173 | 0.627 | 1.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e000000000000016e | 1006.557 | 5.262 | n/a | 0.000 | 0.000 | 0.656 | 1000.445 | 0.003 | n/a | 0.061 | 0.000 | n/a | n/a | 0.130 | 5.262 | 0.005 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e000000000000017e | 1004.608 | 2.537 | n/a | 0.000 | 0.000 | 0.641 | 1001.325 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.055 | 2.537 | 0.003 | 0.055 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000164 | 1002.993 | 0.122 | n/a | 0.000 | 0.000 | 0.333 | 1001.338 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 1.107 | 0.122 | 0.000 | 1.107 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000000184 | 999.206 | 2.546 | n/a | 0.000 | 0.000 | 0.517 | 996.026 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.069 | 2.546 | 0.003 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000000185 | 990.833 | 2.323 | n/a | 0.000 | 0.000 | 2.743 | 985.671 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 2.323 | 0.002 | 0.057 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000154 | 988.631 | 4.316 | n/a | 0.000 | 0.000 | 0.758 | 983.436 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.080 | 4.316 | 0.004 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000000155 | 865.444 | 5.020 | n/a | 0.000 | 0.000 | 0.433 | 859.829 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.130 | 5.020 | 0.006 | 0.130 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000000173 | 834.347 | 2.656 | n/a | 0.000 | 0.000 | 0.723 | 830.842 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.082 | 2.656 | 0.003 | 0.082 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e000000000000014f | 726.634 | 7.772 | n/a | 0.000 | 0.000 | 0.757 | 717.932 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.132 | 7.772 | 0.011 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000159 | 715.377 | 2.678 | n/a | 0.000 | 0.000 | 0.938 | 711.655 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 2.678 | 0.004 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e000000000000017a | 679.372 | 4.604 | n/a | 0.000 | 0.000 | 0.601 | 673.989 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.149 | 4.604 | 0.007 | 0.149 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000166 | 634.126 | 9.372 | n/a | 0.801 | 0.000 | 0.569 | 623.220 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.129 | 10.173 | 0.016 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000175 | 539.092 | 2.003 | n/a | 0.000 | 0.000 | 2.529 | 534.479 | 0.002 | n/a | 0.021 | 0.000 | n/a | n/a | 0.057 | 2.003 | 0.004 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000186 | 531.194 | 2.448 | n/a | 0.000 | 0.000 | 0.438 | 528.201 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.448 | 0.005 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e000000000000017b | 525.631 | 2.266 | n/a | 0.000 | 0.000 | 2.333 | 520.862 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.124 | 2.266 | 0.004 | 0.124 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e000000000000016f | 525.301 | 5.781 | n/a | 0.635 | 0.000 | 0.461 | 518.288 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.099 | 6.416 | 0.012 | 0.099 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000183 | 525.038 | 2.624 | n/a | 0.000 | 0.000 | 0.504 | 521.807 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.056 | 2.624 | 0.005 | 0.056 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e000000000000016d | 504.099 | 2.663 | n/a | 0.000 | 0.000 | 1.039 | 500.298 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.061 | 2.663 | 0.005 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e000000000000014a | 485.657 | 2.165 | n/a | 0.000 | 0.000 | 3.601 | 479.772 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 2.165 | 0.004 | 0.070 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000187 | 468.354 | 2.641 | n/a | 0.000 | 0.000 | 0.623 | 464.970 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.059 | 2.641 | 0.006 | 0.059 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 315.973 | n/a | n/a | n/a | 2.845 | n/a | 0.000 | 0.000 | 0.558 | 312.191 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.070 | 2.933 | 0.011 | 0.070 |
| p99 | 1000.974 | n/a | n/a | n/a | 7.667 | n/a | 2.658 | 0.000 | 4.543 | 997.101 | 2.045 | n/a | 0.082 | 0.000 | n/a | n/a | 0.179 | 8.325 | 0.729 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e00000000000001c2 | 1000.974 | 2.447 | n/a | 0.000 | 0.000 | 1.326 | 997.101 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.061 | 2.447 | 0.002 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e0000000000000189 | 999.170 | 2.378 | n/a | 0.746 | 0.000 | 0.687 | 995.223 | 0.003 | n/a | 0.050 | 0.000 | n/a | n/a | 0.083 | 3.124 | 0.003 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e00000000000001a4 | 995.927 | 2.584 | n/a | 0.715 | 0.000 | 0.558 | 991.918 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.088 | 3.299 | 0.003 | 0.088 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000001a5 | 995.596 | 3.574 | n/a | 0.000 | 0.000 | 1.493 | 990.375 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.115 | 3.574 | 0.004 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000001c1 | 990.329 | 3.987 | n/a | 0.000 | 0.000 | 0.784 | 985.405 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.065 | 3.987 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e0000000000000198 | 988.508 | 2.471 | n/a | 0.000 | 0.000 | 0.347 | 985.566 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.058 | 2.471 | 0.002 | 0.058 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000001d2 | 870.994 | 3.121 | n/a | 0.000 | 0.000 | 4.543 | 863.157 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.097 | 3.121 | 0.004 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e000000000000019b | 834.735 | 7.667 | n/a | 0.000 | 0.000 | 0.982 | 825.912 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.126 | 7.667 | 0.009 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000001a3 | 817.724 | 2.582 | n/a | 0.000 | 0.000 | 0.569 | 814.440 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.064 | 2.582 | 0.003 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e000000000000019e | 754.531 | 4.122 | n/a | 0.594 | 0.000 | 0.323 | 749.360 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.100 | 4.716 | 0.006 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000001c3 | 735.725 | 4.476 | n/a | 0.000 | 0.000 | 0.447 | 730.579 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.179 | 4.476 | 0.006 | 0.179 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000001ad | 703.070 | 4.142 | n/a | 0.764 | 0.000 | 0.802 | 697.239 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.090 | 4.906 | 0.007 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000001a6 | 695.476 | 3.395 | n/a | 0.000 | 0.000 | 0.923 | 691.006 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.086 | 3.395 | 0.005 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000001bf | 658.161 | 2.308 | n/a | 0.000 | 0.000 | 0.436 | 655.326 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.059 | 2.308 | 0.004 | 0.059 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000001b4 | 548.971 | 2.891 | n/a | 0.000 | 0.000 | 0.729 | 545.188 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.119 | 2.891 | 0.005 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000001cf | 545.531 | 2.113 | n/a | 0.000 | 0.000 | 0.530 | 542.808 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.058 | 2.113 | 0.004 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000001b5 | 525.815 | 7.432 | n/a | 0.893 | 0.000 | 0.535 | 516.782 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.104 | 8.325 | 0.016 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e00000000000001b7 | 484.588 | 3.293 | n/a | 0.000 | 0.000 | 0.506 | 480.679 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.074 | 3.293 | 0.007 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000001cb | 452.961 | 2.845 | n/a | 0.000 | 0.000 | 1.448 | 448.578 | 0.005 | n/a | 0.012 | 0.000 | n/a | n/a | 0.073 | 2.845 | 0.006 | 0.073 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000193 | 418.643 | 2.235 | n/a | 0.000 | 0.000 | 0.576 | 415.728 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.063 | 2.235 | 0.005 | 0.063 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 309.105 | n/a | n/a | n/a | 2.597 | n/a | 0.000 | 0.000 | 0.625 | 302.345 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.067 | 2.597 | 0.008 | 0.067 |
| p99 | 1007.833 | n/a | n/a | n/a | 7.393 | n/a | 0.000 | 0.000 | 3.206 | 1004.952 | 1.188 | n/a | 0.077 | 0.000 | n/a | n/a | 4.688 | 7.393 | 0.392 | 4.688 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e0000000000000216 | 1007.833 | 2.190 | n/a | 0.000 | 0.000 | 0.572 | 1004.952 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.072 | 2.190 | 0.002 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000215 | 1006.711 | 4.062 | n/a | 0.000 | 0.000 | 0.839 | 1001.666 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.109 | 4.062 | 0.004 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e00000000000001fb | 1005.927 | 0.124 | n/a | 0.000 | 0.000 | 0.345 | 1000.720 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 4.688 | 0.124 | 0.000 | 4.688 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e0000000000000210 | 1002.899 | 0.114 | n/a | 0.000 | 0.000 | 0.500 | 1001.099 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 1.100 | 0.114 | 0.000 | 1.100 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e000000000000020f | 997.200 | 2.157 | n/a | 0.000 | 0.000 | 0.356 | 994.598 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.055 | 2.157 | 0.002 | 0.055 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000001e7 | 974.124 | 3.513 | n/a | 0.000 | 0.000 | 3.206 | 967.287 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.063 | 3.513 | 0.004 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e00000000000001fd | 910.426 | 2.444 | n/a | 0.000 | 0.000 | 3.021 | 904.855 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.068 | 2.444 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000213 | 870.471 | 4.531 | n/a | 0.000 | 0.000 | 0.716 | 865.032 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.152 | 4.531 | 0.005 | 0.152 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000200 | 859.942 | 2.619 | n/a | 0.000 | 0.000 | 0.414 | 856.820 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.619 | 0.003 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e00000000000001da | 839.385 | 3.020 | n/a | 0.000 | 0.000 | 0.669 | 835.560 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.067 | 3.020 | 0.004 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000001ed | 836.657 | 4.251 | n/a | 0.000 | 0.000 | 0.625 | 831.566 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.156 | 4.251 | 0.005 | 0.156 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000204 | 820.277 | 3.250 | n/a | 0.000 | 0.000 | 0.580 | 816.233 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.171 | 3.250 | 0.004 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000001f4 | 709.711 | 4.324 | n/a | 0.000 | 0.000 | 0.359 | 704.813 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 0.153 | 4.324 | 0.006 | 0.153 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000001f6 | 632.600 | 1.861 | n/a | 0.000 | 0.000 | 0.481 | 630.161 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 1.861 | 0.003 | 0.057 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000001d6 | 610.921 | 2.207 | n/a | 0.000 | 0.000 | 0.457 | 608.157 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.058 | 2.207 | 0.004 | 0.058 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000001f2 | 581.433 | 3.173 | n/a | 0.000 | 0.000 | 2.215 | 575.926 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.063 | 3.173 | 0.005 | 0.063 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000001e6 | 576.574 | 2.247 | n/a | 0.000 | 0.000 | 0.515 | 573.707 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 2.247 | 0.004 | 0.069 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000001de | 479.354 | 5.313 | n/a | 0.000 | 0.000 | 2.279 | 470.483 | 1.188 | n/a | 0.032 | 0.000 | n/a | n/a | 0.059 | 5.313 | 0.011 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e00000000000001f0 | 402.946 | 2.015 | n/a | 0.000 | 0.000 | 0.404 | 400.405 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.068 | 2.015 | 0.005 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e000000000000020e | 385.489 | 2.155 | n/a | 0.000 | 0.000 | 0.494 | 382.743 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.053 | 2.155 | 0.006 | 0.053 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (744 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.490 | n/a | n/a | n/a | 3.056 | n/a | 0.000 | 0.000 | 0.518 | 9.216 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.070 | 3.056 | 0.237 | 0.070 |
| p99 | 114.339 | n/a | n/a | n/a | 13.407 | n/a | 1.039 | 0.000 | 4.644 | 107.926 | 0.316 | n/a | 0.071 | 0.000 | n/a | n/a | 0.543 | 13.606 | 0.822 | 0.543 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e0000000000000222 | 991.018 | 3.382 | n/a | 0.000 | 0.000 | 0.332 | 987.187 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.062 | 3.382 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000223 | 970.538 | 4.972 | n/a | 0.000 | 0.000 | 3.047 | 962.387 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.099 | 4.972 | 0.005 | 0.099 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000000217 | 967.768 | 2.190 | n/a | 0.000 | 0.000 | 0.385 | 965.059 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.072 | 2.190 | 0.002 | 0.072 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e000000000000021a | 827.438 | 2.441 | n/a | 0.000 | 0.000 | 0.392 | 824.506 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.060 | 2.441 | 0.003 | 0.060 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e000000000000021e | 775.299 | 4.156 | n/a | 0.000 | 0.000 | 0.661 | 770.282 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.112 | 4.156 | 0.005 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e000000000000021b | 183.635 | 2.713 | n/a | 0.000 | 0.000 | 0.459 | 180.340 | 0.021 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 2.713 | 0.015 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000000221 | 149.368 | 2.223 | n/a | 0.000 | 0.000 | 0.551 | 144.489 | 2.016 | n/a | 0.028 | 0.000 | n/a | n/a | 0.061 | 2.223 | 0.015 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e00000000000004e7 | 114.339 | 5.188 | n/a | 0.721 | 0.000 | 0.349 | 107.926 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.106 | 5.910 | 0.052 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000002ee | 104.301 | 6.316 | n/a | 1.010 | 0.000 | 0.345 | 96.451 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.137 | 7.326 | 0.070 | 0.137 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000751 | 91.664 | 2.857 | n/a | 0.000 | 0.000 | 0.239 | 88.456 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 2.857 | 0.031 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000000794 | 91.549 | 4.236 | n/a | 0.000 | 0.000 | 0.584 | 86.584 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.125 | 4.236 | 0.046 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e00000000000005e8 | 87.730 | 5.785 | n/a | 0.000 | 0.000 | 0.911 | 80.922 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.077 | 5.785 | 0.066 | 0.077 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e000000000000021d | 81.216 | 2.591 | n/a | 0.000 | 0.000 | 0.523 | 77.945 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.095 | 2.591 | 0.032 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e000000000000046b | 80.589 | 2.955 | n/a | 0.000 | 0.000 | 0.473 | 77.086 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.063 | 2.955 | 0.037 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e0000000000000683 | 79.738 | 3.809 | n/a | 0.000 | 0.000 | 0.500 | 75.334 | 0.002 | n/a | 0.020 | 0.000 | n/a | n/a | 0.072 | 3.809 | 0.048 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e000000000000062f | 78.382 | 3.494 | n/a | 0.000 | 0.000 | 0.597 | 74.222 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.059 | 3.494 | 0.045 | 0.059 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e00000000000004ef | 78.025 | 2.228 | n/a | 0.000 | 0.000 | 2.317 | 73.387 | 0.009 | n/a | 0.017 | 0.000 | n/a | n/a | 0.067 | 2.228 | 0.029 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e0000000000000782 | 76.953 | 11.645 | n/a | 0.000 | 0.000 | 1.202 | 63.866 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.200 | 11.645 | 0.151 | 0.200 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e000000000000076e | 73.015 | 6.608 | n/a | 0.000 | 0.000 | 0.502 | 65.761 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.084 | 6.608 | 0.091 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e000000000000075c | 72.820 | 2.823 | n/a | 0.000 | 0.000 | 0.321 | 69.518 | 0.001 | n/a | 0.041 | 0.000 | n/a | n/a | 0.115 | 2.823 | 0.039 | 0.115 | gw-r/thread-63/journal/page | none observed |

## P3 / tail / internal (2322 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.118 | n/a | n/a | n/a | 3.707 | n/a | 0.000 | 0.000 | 0.443 | 7.860 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.088 | 3.729 | 0.322 | 0.088 |
| p99 | 339.152 | n/a | n/a | n/a | 15.058 | n/a | 1.424 | 0.000 | 4.573 | 332.700 | 0.250 | n/a | 0.044 | 0.000 | n/a | n/a | 1.288 | 16.019 | 0.851 | 1.288 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 542a559c16e7089e0000000000001aa3 | 1003.682 | 0.168 | n/a | 0.000 | 0.000 | 0.396 | 1001.956 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 1.122 | 0.168 | 0.000 | 1.122 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000001aef | 1002.032 | 0.109 | n/a | 0.000 | 0.000 | 0.326 | 1000.461 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.093 | 0.109 | 0.000 | 1.093 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000001aeb | 995.588 | 3.450 | n/a | 0.000 | 0.000 | 0.524 | 991.513 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.058 | 3.450 | 0.003 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 542a559c16e7089e0000000000001aa5 | 995.488 | 12.399 | n/a | 1.488 | 0.000 | 0.164 | 980.913 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.465 | 13.886 | 0.014 | 0.465 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000001aa8 | 993.565 | 3.529 | n/a | 0.000 | 0.000 | 0.405 | 989.537 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.051 | 3.529 | 0.004 | 0.051 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000001aac | 909.478 | 2.618 | n/a | 0.000 | 0.000 | 0.268 | 906.493 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.056 | 2.618 | 0.003 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000001ac5 | 886.852 | 3.760 | n/a | 0.000 | 0.000 | 0.448 | 882.562 | 0.005 | n/a | 0.015 | 0.000 | n/a | n/a | 0.061 | 3.760 | 0.004 | 0.061 | gw-r/thread-63/journal/page | none observed |
| 542a559c16e7089e0000000000001ae8 | 883.641 | 2.137 | n/a | 0.000 | 0.000 | 0.346 | 881.052 | 0.019 | n/a | 0.023 | 0.000 | n/a | n/a | 0.064 | 2.137 | 0.002 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000001ab6 | 876.149 | 5.478 | n/a | 0.000 | 0.000 | 1.292 | 869.269 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.095 | 5.478 | 0.006 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000001ae6 | 846.634 | 2.311 | n/a | 0.000 | 0.000 | 2.968 | 841.239 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.061 | 2.311 | 0.003 | 0.061 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000001aa1 | 816.913 | 2.350 | n/a | 0.000 | 0.000 | 0.485 | 813.993 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.054 | 2.350 | 0.003 | 0.054 | gw-r/thread-47/journal/page | none observed |
| 542a559c16e7089e0000000000001aae | 722.755 | 3.274 | n/a | 0.000 | 0.000 | 0.611 | 718.715 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.135 | 3.274 | 0.005 | 0.135 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000001ae2 | 716.838 | 4.401 | n/a | 0.000 | 0.000 | 0.508 | 711.798 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.102 | 4.401 | 0.006 | 0.102 | gw-r/thread-65/journal/page | none observed |
| 542a559c16e7089e0000000000001aca | 695.047 | 9.353 | n/a | 1.549 | 0.000 | 0.397 | 683.445 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.281 | 10.901 | 0.016 | 0.281 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000001ac8 | 659.589 | 2.637 | n/a | 0.000 | 0.000 | 0.340 | 656.510 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.077 | 2.637 | 0.004 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 542a559c16e7089e0000000000001ad8 | 589.887 | 2.492 | n/a | 0.000 | 0.000 | 1.693 | 585.604 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.056 | 2.492 | 0.004 | 0.056 | gw-r/thread-46/journal/page | none observed |
| 542a559c16e7089e0000000000001ac2 | 582.481 | 2.407 | n/a | 0.000 | 0.000 | 0.371 | 579.623 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.056 | 2.407 | 0.004 | 0.056 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000001add | 567.817 | 3.129 | n/a | 0.000 | 0.000 | 0.790 | 563.796 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 3.129 | 0.006 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 542a559c16e7089e0000000000001abd | 491.990 | 2.504 | n/a | 0.000 | 0.000 | 0.321 | 489.059 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.071 | 2.504 | 0.005 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 542a559c16e7089e0000000000001ae0 | 399.391 | 2.677 | n/a | 0.000 | 0.000 | 0.487 | 396.123 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.677 | 0.007 | 0.062 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.066 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.826 | 200.857 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 |
| p99 | 208.638 | n/a | n/a | n/a | 0.167 | n/a | 0.000 | 0.000 | 3.839 | 205.509 | 8.783 | n/a | 3.833 | 0.000 | n/a | n/a | 0.272 | 0.167 | 0.001 | 0.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa000000000000000d | 208.638 | 0.036 | n/a | 0.000 | 0.000 | 3.601 | 204.792 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 0.069 | 0.036 | 0.000 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000016 | 207.273 | 0.063 | n/a | 0.000 | 0.000 | 1.404 | 205.509 | 0.013 | n/a | 0.164 | 0.000 | n/a | n/a | 0.120 | 0.063 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000032 | 207.015 | 0.167 | n/a | 0.000 | 0.000 | 1.825 | 204.750 | 0.013 | n/a | 0.141 | 0.000 | n/a | n/a | 0.120 | 0.167 | 0.001 | 0.120 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000043 | 206.715 | 0.038 | n/a | 0.000 | 0.000 | 0.934 | 205.469 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.102 | 0.038 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa000000000000001c | 206.714 | 0.033 | n/a | 0.000 | 0.000 | 1.466 | 205.002 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.094 | 0.033 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000053 | 205.338 | 0.021 | n/a | 0.000 | 0.000 | 3.839 | 201.272 | 0.014 | n/a | 0.140 | 0.000 | n/a | n/a | 0.053 | 0.021 | 0.000 | 0.053 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa000000000000001b | 204.707 | 0.058 | n/a | 0.000 | 0.000 | 1.907 | 202.379 | 0.012 | n/a | 0.203 | 0.000 | n/a | n/a | 0.148 | 0.058 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000047 | 204.573 | 0.035 | n/a | 0.000 | 0.000 | 1.032 | 203.223 | 0.019 | n/a | 0.185 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000059 | 204.545 | 0.033 | n/a | 0.000 | 0.000 | 3.550 | 200.771 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000046 | 204.256 | 0.029 | n/a | 0.000 | 0.000 | 2.181 | 201.872 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000021 | 203.995 | 0.055 | n/a | 0.000 | 0.000 | 2.117 | 201.413 | 0.034 | n/a | 0.236 | 0.000 | n/a | n/a | 0.141 | 0.055 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000031 | 203.810 | 0.030 | n/a | 0.000 | 0.000 | 2.335 | 201.305 | 0.027 | n/a | 0.047 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000054 | 203.675 | 0.031 | n/a | 0.000 | 0.000 | 0.824 | 202.285 | 0.024 | n/a | 0.240 | 0.000 | n/a | n/a | 0.271 | 0.031 | 0.000 | 0.271 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa000000000000005b | 203.607 | 0.045 | n/a | 0.000 | 0.000 | 1.142 | 201.997 | 0.020 | n/a | 0.273 | 0.000 | n/a | n/a | 0.130 | 0.045 | 0.000 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000014 | 203.451 | 0.037 | n/a | 0.000 | 0.000 | 1.265 | 201.901 | 0.012 | n/a | 0.155 | 0.000 | n/a | n/a | 0.082 | 0.037 | 0.000 | 0.082 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000052 | 203.438 | 0.031 | n/a | 0.000 | 0.000 | 2.692 | 200.594 | 0.013 | n/a | 0.039 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000022 | 203.289 | 0.053 | n/a | 0.000 | 0.000 | 1.985 | 201.041 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.138 | 0.053 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa0000000000000025 | 202.981 | 0.035 | n/a | 0.000 | 0.000 | 1.032 | 201.687 | 0.019 | n/a | 0.128 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa000000000000005a | 202.945 | 0.025 | n/a | 0.000 | 0.000 | 1.565 | 201.155 | 0.014 | n/a | 0.126 | 0.000 | n/a | n/a | 0.061 | 0.025 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000009 | 202.890 | 0.032 | n/a | 0.000 | 0.000 | 1.527 | 200.980 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.262 | 0.032 | 0.000 | 0.262 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.004 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.785 | 200.921 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.077 | 0.038 | 0.000 | 0.077 |
| p99 | 206.951 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 4.394 | 205.834 | 1.996 | n/a | 3.420 | 0.000 | n/a | n/a | 0.195 | 0.088 | 0.001 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa000000000000007c | 206.951 | 0.051 | n/a | 0.000 | 0.000 | 0.829 | 205.834 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.132 | 0.051 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000098 | 206.262 | 0.047 | n/a | 0.000 | 0.000 | 4.067 | 201.932 | 0.021 | n/a | 0.111 | 0.000 | n/a | n/a | 0.084 | 0.047 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa00000000000000be | 205.864 | 0.033 | n/a | 0.000 | 0.000 | 4.394 | 201.206 | 0.010 | n/a | 0.139 | 0.000 | n/a | n/a | 0.082 | 0.033 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa000000000000009c | 205.767 | 0.057 | n/a | 0.000 | 0.000 | 0.833 | 204.642 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.108 | 0.057 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000076 | 205.390 | 0.042 | n/a | 0.000 | 0.000 | 0.786 | 204.329 | 0.012 | n/a | 0.110 | 0.000 | n/a | n/a | 0.110 | 0.042 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa00000000000000bb | 204.198 | 0.042 | n/a | 0.000 | 0.000 | 1.973 | 201.863 | 0.017 | n/a | 0.201 | 0.000 | n/a | n/a | 0.102 | 0.042 | 0.000 | 0.102 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000079 | 203.848 | 0.034 | n/a | 0.000 | 0.000 | 1.862 | 201.699 | 0.023 | n/a | 0.162 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa000000000000008f | 203.511 | 0.034 | n/a | 0.000 | 0.000 | 1.774 | 201.418 | 0.029 | n/a | 0.183 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000071 | 203.506 | 0.030 | n/a | 0.000 | 0.000 | 0.525 | 202.741 | 0.024 | n/a | 0.121 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa0000000000000063 | 203.498 | 0.035 | n/a | 0.000 | 0.000 | 1.688 | 201.559 | 0.014 | n/a | 0.139 | 0.000 | n/a | n/a | 0.062 | 0.035 | 0.000 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000087 | 203.485 | 0.075 | n/a | 0.000 | 0.000 | 1.157 | 201.962 | 0.022 | n/a | 0.137 | 0.000 | n/a | n/a | 0.132 | 0.075 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa00000000000000b2 | 203.470 | 0.032 | n/a | 0.000 | 0.000 | 2.379 | 200.921 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.079 | 0.032 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000085 | 203.390 | 0.039 | n/a | 0.000 | 0.000 | 0.766 | 202.391 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa000000000000007a | 203.371 | 0.024 | n/a | 0.000 | 0.000 | 0.511 | 202.633 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.058 | 0.024 | 0.000 | 0.058 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000091 | 203.323 | 0.056 | n/a | 0.000 | 0.000 | 0.962 | 202.033 | 0.013 | n/a | 0.123 | 0.000 | n/a | n/a | 0.136 | 0.056 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa00000000000000ac | 203.285 | 0.031 | n/a | 0.000 | 0.000 | 0.843 | 202.120 | 0.019 | n/a | 0.195 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa00000000000000a2 | 203.222 | 0.032 | n/a | 0.000 | 0.000 | 0.640 | 202.289 | 0.021 | n/a | 0.164 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa0000000000000093 | 203.219 | 0.027 | n/a | 0.000 | 0.000 | 0.492 | 202.380 | 0.024 | n/a | 0.230 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa00000000000000ad | 202.853 | 0.048 | n/a | 0.000 | 0.000 | 0.992 | 201.688 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.090 | 0.048 | 0.000 | 0.090 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000000bd | 202.779 | 0.030 | n/a | 0.000 | 0.000 | 1.621 | 200.945 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.073 | 0.030 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.590 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.714 | 200.716 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 |
| p99 | 222.383 | n/a | n/a | n/a | 0.112 | n/a | 0.000 | 0.000 | 4.094 | 220.908 | 1.770 | n/a | 0.177 | 0.000 | n/a | n/a | 0.165 | 0.112 | 0.001 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa00000000000000f5 | 222.383 | 0.029 | n/a | 0.000 | 0.000 | 1.240 | 220.908 | 0.048 | n/a | 0.076 | 0.000 | n/a | n/a | 0.081 | 0.029 | 0.000 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa000000000000011b | 205.837 | 0.033 | n/a | 0.000 | 0.000 | 0.524 | 205.109 | 0.014 | n/a | 0.092 | 0.000 | n/a | n/a | 0.064 | 0.033 | 0.000 | 0.064 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000000da | 205.141 | 0.033 | n/a | 0.000 | 0.000 | 1.607 | 203.345 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000122 | 204.910 | 0.051 | n/a | 0.000 | 0.000 | 4.034 | 200.685 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.081 | 0.051 | 0.000 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000000ff | 204.905 | 0.026 | n/a | 0.000 | 0.000 | 0.464 | 204.305 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.051 | 0.026 | 0.000 | 0.051 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa0000000000000115 | 204.798 | 0.030 | n/a | 0.000 | 0.000 | 0.507 | 204.151 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000102 | 204.789 | 0.040 | n/a | 0.000 | 0.000 | 0.398 | 204.246 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.067 | 0.040 | 0.000 | 0.067 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000000e1 | 204.697 | 0.041 | n/a | 0.000 | 0.000 | 3.601 | 200.873 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.105 | 0.041 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000129 | 204.508 | 0.031 | n/a | 0.000 | 0.000 | 0.700 | 203.591 | 0.032 | n/a | 0.090 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa000000000000010a | 204.164 | 0.042 | n/a | 0.000 | 0.000 | 3.610 | 200.388 | 0.019 | n/a | 0.020 | 0.000 | n/a | n/a | 0.084 | 0.042 | 0.000 | 0.084 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa00000000000000d2 | 204.142 | 0.048 | n/a | 0.000 | 0.000 | 1.964 | 201.824 | 0.011 | n/a | 0.177 | 0.000 | n/a | n/a | 0.117 | 0.048 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa000000000000010d | 203.768 | 0.031 | n/a | 0.000 | 0.000 | 2.725 | 200.893 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.059 | 0.031 | 0.000 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa00000000000000d7 | 203.146 | 0.051 | n/a | 0.000 | 0.000 | 1.060 | 201.751 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.136 | 0.051 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa00000000000000d6 | 202.928 | 0.049 | n/a | 0.000 | 0.000 | 0.973 | 201.670 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.141 | 0.049 | 0.000 | 0.141 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000110 | 202.876 | 0.031 | n/a | 0.000 | 0.000 | 1.535 | 201.138 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000107 | 202.633 | 0.067 | n/a | 0.000 | 0.000 | 1.381 | 200.996 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.142 | 0.067 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa00000000000000f0 | 202.629 | 0.042 | n/a | 0.000 | 0.000 | 0.791 | 201.571 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.103 | 0.042 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa00000000000000e8 | 202.615 | 0.051 | n/a | 0.000 | 0.000 | 1.157 | 201.195 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.135 | 0.051 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa00000000000000fa | 202.570 | 0.030 | n/a | 0.000 | 0.000 | 1.563 | 200.821 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 713914ecef8b86fa0000000000000126 | 202.482 | 0.028 | n/a | 0.000 | 0.000 | 0.788 | 201.464 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.077 | 0.028 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.564 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.702 | 200.729 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.069 | 0.041 | 0.000 | 0.069 |
| p99 | 210.257 | n/a | n/a | n/a | 0.103 | n/a | 0.000 | 0.000 | 9.351 | 204.803 | 2.688 | n/a | 0.154 | 0.000 | n/a | n/a | 0.222 | 0.103 | 0.001 | 0.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa0000000000000161 | 210.257 | 0.039 | n/a | 0.000 | 0.000 | 9.351 | 200.735 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.068 | 0.039 | 0.000 | 0.068 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000177 | 209.258 | 0.031 | n/a | 0.000 | 0.000 | 4.257 | 204.803 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000131 | 205.382 | 0.023 | n/a | 0.000 | 0.000 | 3.618 | 201.596 | 0.005 | n/a | 0.083 | 0.000 | n/a | n/a | 0.056 | 0.023 | 0.000 | 0.056 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000175 | 205.002 | 0.028 | n/a | 0.000 | 0.000 | 0.483 | 204.344 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa000000000000015f | 204.873 | 0.028 | n/a | 0.000 | 0.000 | 0.880 | 203.835 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.056 | 0.028 | 0.000 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000162 | 204.565 | 0.028 | n/a | 0.000 | 0.000 | 3.642 | 200.771 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000142 | 204.198 | 0.057 | n/a | 0.000 | 0.000 | 0.719 | 203.200 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.149 | 0.057 | 0.000 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000189 | 203.706 | 0.030 | n/a | 0.000 | 0.000 | 0.912 | 202.591 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.047 | 0.030 | 0.000 | 0.047 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000156 | 203.398 | 0.023 | n/a | 0.000 | 0.000 | 2.101 | 201.149 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.047 | 0.023 | 0.000 | 0.047 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000164 | 203.271 | 0.045 | n/a | 0.000 | 0.000 | 1.316 | 201.744 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.102 | 0.045 | 0.000 | 0.102 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa000000000000015c | 202.893 | 0.036 | n/a | 0.000 | 0.000 | 1.839 | 200.875 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000155 | 202.834 | 0.022 | n/a | 0.000 | 0.000 | 1.115 | 201.495 | 0.039 | n/a | 0.106 | 0.000 | n/a | n/a | 0.058 | 0.022 | 0.000 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000174 | 202.803 | 0.058 | n/a | 0.000 | 0.000 | 0.944 | 201.573 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.132 | 0.058 | 0.000 | 0.132 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa000000000000014b | 202.736 | 0.046 | n/a | 0.000 | 0.000 | 1.131 | 201.332 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.120 | 0.046 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000140 | 202.673 | 0.103 | n/a | 0.000 | 0.000 | 1.426 | 200.833 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.222 | 0.103 | 0.001 | 0.222 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa000000000000014f | 202.597 | 0.042 | n/a | 0.000 | 0.000 | 0.931 | 201.459 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.078 | 0.042 | 0.000 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa000000000000013b | 202.472 | 0.050 | n/a | 0.000 | 0.000 | 0.627 | 201.565 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.127 | 0.050 | 0.000 | 0.127 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000193 | 202.460 | 0.047 | n/a | 0.000 | 0.000 | 0.796 | 201.392 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.087 | 0.047 | 0.000 | 0.087 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa000000000000014a | 202.453 | 0.025 | n/a | 0.000 | 0.000 | 1.185 | 201.158 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.054 | 0.025 | 0.000 | 0.054 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa000000000000013f | 202.302 | 0.073 | n/a | 0.000 | 0.000 | 1.234 | 200.765 | 0.009 | n/a | 0.032 | 0.000 | n/a | n/a | 0.189 | 0.073 | 0.000 | 0.189 | gw-r/thread-42/journal/page | none observed |

## P3 / L64 / read (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.297 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.594 | 200.635 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.065 | 0.039 | 0.000 | 0.065 |
| p99 | 204.347 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 2.712 | 202.413 | 2.585 | n/a | 0.101 | 0.000 | n/a | n/a | 0.177 | 0.081 | 0.001 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa0000000000000208 | 204.549 | 0.043 | n/a | 0.000 | 0.000 | 2.712 | 201.607 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.080 | 0.043 | 0.000 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa00000000000001f0 | 204.347 | 0.035 | n/a | 0.000 | 0.000 | 3.403 | 200.771 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.061 | 0.035 | 0.000 | 0.061 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa00000000000001e0 | 203.848 | 0.032 | n/a | 0.000 | 0.000 | 0.732 | 202.977 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000001da | 203.332 | 0.030 | n/a | 0.000 | 0.000 | 0.711 | 202.413 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa00000000000001b2 | 203.034 | 0.026 | n/a | 0.000 | 0.000 | 0.642 | 202.149 | 0.023 | n/a | 0.144 | 0.000 | n/a | n/a | 0.050 | 0.026 | 0.000 | 0.050 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000001d8 | 202.863 | 0.032 | n/a | 0.000 | 0.000 | 0.431 | 202.289 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000209 | 202.776 | 0.030 | n/a | 0.000 | 0.000 | 0.703 | 201.886 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa00000000000001d5 | 202.765 | 0.035 | n/a | 0.000 | 0.000 | 1.785 | 200.812 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa00000000000001ff | 202.688 | 0.066 | n/a | 0.000 | 0.000 | 0.686 | 201.755 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.121 | 0.066 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa00000000000001db | 202.615 | 0.044 | n/a | 0.000 | 0.000 | 1.142 | 201.240 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.105 | 0.044 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000001d1 | 202.312 | 0.034 | n/a | 0.000 | 0.000 | 0.637 | 201.496 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000199 | 202.311 | 0.048 | n/a | 0.000 | 0.000 | 1.356 | 200.722 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.105 | 0.048 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa00000000000001de | 202.311 | 0.032 | n/a | 0.000 | 0.000 | 0.594 | 201.538 | 0.024 | n/a | 0.060 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa00000000000001fc | 202.226 | 0.046 | n/a | 0.000 | 0.000 | 0.879 | 201.101 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.106 | 0.046 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa000000000000019a | 202.179 | 0.040 | n/a | 0.000 | 0.000 | 0.840 | 201.118 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.103 | 0.040 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa00000000000001c7 | 202.070 | 0.076 | n/a | 0.000 | 0.000 | 0.767 | 201.025 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.127 | 0.076 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa00000000000001be | 202.051 | 0.052 | n/a | 0.000 | 0.000 | 0.769 | 201.002 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.192 | 0.052 | 0.000 | 0.192 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000204 | 201.969 | 0.057 | n/a | 0.000 | 0.000 | 0.670 | 201.032 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.133 | 0.057 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa00000000000001b7 | 201.935 | 0.061 | n/a | 0.000 | 0.000 | 0.902 | 200.730 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.177 | 0.061 | 0.000 | 0.177 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa00000000000001f6 | 201.837 | 0.030 | n/a | 0.000 | 0.000 | 0.676 | 200.966 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.094 | 0.030 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.409 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.617 | 200.682 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.068 | 0.041 | 0.000 | 0.068 |
| p99 | 205.368 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 2.807 | 204.292 | 1.619 | n/a | 0.129 | 0.000 | n/a | n/a | 0.139 | 0.079 | 0.001 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa000000000000021a | 207.897 | 0.047 | n/a | 0.000 | 0.000 | 2.807 | 204.826 | 0.017 | n/a | 0.088 | 0.000 | n/a | n/a | 0.112 | 0.047 | 0.000 | 0.112 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000223 | 205.368 | 0.034 | n/a | 0.000 | 0.000 | 0.803 | 204.292 | 0.019 | n/a | 0.155 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000243 | 205.294 | 0.052 | n/a | 0.000 | 0.000 | 3.818 | 201.191 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.124 | 0.052 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000263 | 204.911 | 0.049 | n/a | 0.000 | 0.000 | 0.698 | 204.008 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.110 | 0.049 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000259 | 203.185 | 0.017 | n/a | 0.000 | 0.000 | 0.681 | 202.305 | 0.015 | n/a | 0.129 | 0.000 | n/a | n/a | 0.038 | 0.017 | 0.000 | 0.038 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000237 | 203.130 | 0.068 | n/a | 0.000 | 0.000 | 2.190 | 200.733 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.067 | 0.068 | 0.000 | 0.067 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000228 | 202.622 | 0.059 | n/a | 0.000 | 0.000 | 1.590 | 200.788 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.129 | 0.059 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa000000000000022e | 202.620 | 0.070 | n/a | 0.000 | 0.000 | 1.766 | 200.640 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.088 | 0.070 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000269 | 202.567 | 0.036 | n/a | 0.000 | 0.000 | 0.764 | 201.585 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.087 | 0.036 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000252 | 202.556 | 0.039 | n/a | 0.000 | 0.000 | 0.644 | 201.719 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.081 | 0.039 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa000000000000023a | 202.534 | 0.032 | n/a | 0.000 | 0.000 | 0.582 | 201.752 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.062 | 0.032 | 0.000 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000225 | 202.433 | 0.054 | n/a | 0.000 | 0.000 | 1.735 | 200.487 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.111 | 0.054 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa000000000000026f | 202.423 | 0.045 | n/a | 0.000 | 0.000 | 1.014 | 201.142 | 0.006 | n/a | 0.097 | 0.000 | n/a | n/a | 0.118 | 0.045 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000271 | 202.236 | 0.023 | n/a | 0.000 | 0.000 | 0.389 | 200.959 | 0.760 | n/a | 0.052 | 0.000 | n/a | n/a | 0.053 | 0.023 | 0.000 | 0.053 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000226 | 202.143 | 0.056 | n/a | 0.000 | 0.000 | 0.714 | 201.186 | 0.007 | n/a | 0.102 | 0.000 | n/a | n/a | 0.079 | 0.056 | 0.000 | 0.079 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000268 | 202.099 | 0.025 | n/a | 0.000 | 0.000 | 0.765 | 201.159 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.046 | 0.025 | 0.000 | 0.046 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa000000000000021b | 202.096 | 0.036 | n/a | 0.000 | 0.000 | 0.583 | 201.323 | 0.020 | n/a | 0.062 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000264 | 202.047 | 0.031 | n/a | 0.000 | 0.000 | 0.624 | 201.183 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.081 | 0.031 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000276 | 202.032 | 0.050 | n/a | 0.000 | 0.000 | 0.973 | 200.838 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.116 | 0.050 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa000000000000023e | 201.966 | 0.057 | n/a | 0.000 | 0.000 | 0.750 | 201.037 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.073 | 0.057 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.682 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.519 | 74.241 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.060 | 0.044 | 0.001 | 0.060 |
| p99 | 203.000 | n/a | n/a | n/a | 0.109 | n/a | 0.000 | 0.000 | 4.875 | 201.207 | 0.571 | n/a | 1.811 | 0.000 | n/a | n/a | 0.144 | 0.109 | 0.002 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa0000000000000289 | 203.000 | 0.053 | n/a | 0.000 | 0.000 | 1.853 | 200.895 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.115 | 0.053 | 0.000 | 0.115 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa000000000000027d | 202.703 | 0.031 | n/a | 0.000 | 0.000 | 1.368 | 201.155 | 0.017 | n/a | 0.065 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000280 | 202.260 | 0.053 | n/a | 0.000 | 0.000 | 1.102 | 200.929 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.113 | 0.053 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa000000000000027f | 202.174 | 0.058 | n/a | 0.000 | 0.000 | 0.978 | 200.913 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.140 | 0.058 | 0.000 | 0.140 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000294 | 202.059 | 0.039 | n/a | 0.000 | 0.000 | 0.713 | 201.131 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000296 | 202.047 | 0.057 | n/a | 0.000 | 0.000 | 1.014 | 200.788 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.144 | 0.057 | 0.000 | 0.144 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa000000000000028f | 201.992 | 0.031 | n/a | 0.000 | 0.000 | 0.665 | 201.127 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa000000000000028b | 201.939 | 0.041 | n/a | 0.000 | 0.000 | 0.802 | 200.925 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.084 | 0.041 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa000000000000028a | 201.918 | 0.030 | n/a | 0.000 | 0.000 | 0.645 | 201.102 | 0.006 | n/a | 0.075 | 0.000 | n/a | n/a | 0.060 | 0.030 | 0.000 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000283 | 201.853 | 0.050 | n/a | 0.000 | 0.000 | 0.750 | 200.863 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.120 | 0.050 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000284 | 201.791 | 0.032 | n/a | 0.000 | 0.000 | 0.391 | 201.207 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.088 | 0.032 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000295 | 201.733 | 0.026 | n/a | 0.000 | 0.000 | 0.519 | 201.060 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.050 | 0.026 | 0.000 | 0.050 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa000000000000027e | 201.593 | 0.043 | n/a | 0.000 | 0.000 | 0.603 | 200.777 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.107 | 0.043 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa000000000000028e | 201.475 | 0.027 | n/a | 0.000 | 0.000 | 0.337 | 200.969 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.049 | 0.027 | 0.000 | 0.049 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000290 | 201.374 | 0.029 | n/a | 0.000 | 0.000 | 0.557 | 200.685 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 0.029 | 0.000 | 0.061 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000291 | 201.302 | 0.028 | n/a | 0.000 | 0.000 | 0.436 | 200.711 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000285 | 201.212 | 0.027 | n/a | 0.000 | 0.000 | 0.468 | 200.620 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.055 | 0.027 | 0.000 | 0.055 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000293 | 201.192 | 0.034 | n/a | 0.000 | 0.000 | 0.385 | 200.652 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.063 | 0.034 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 713914ecef8b86fa0000000000000287 | 179.587 | 0.058 | n/a | 0.000 | 0.000 | 0.545 | 178.901 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.064 | 0.058 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000286 | 160.997 | 0.066 | n/a | 0.000 | 0.000 | 0.716 | 160.087 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.106 | 0.066 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.207 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.452 | 80.402 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.057 | 0.039 | 0.000 | 0.057 |
| p99 | 203.517 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 3.699 | 201.243 | 0.629 | n/a | 0.074 | 0.000 | n/a | n/a | 0.143 | 0.096 | 0.004 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 713914ecef8b86fa0000000000000ecd | 205.240 | 0.038 | n/a | 0.000 | 0.000 | 0.444 | 204.567 | 0.042 | n/a | 0.073 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000eee | 204.214 | 0.030 | n/a | 0.000 | 0.000 | 3.144 | 200.900 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000ee0 | 203.517 | 0.026 | n/a | 0.000 | 0.000 | 2.637 | 200.741 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.054 | 0.026 | 0.000 | 0.054 | gw-r/thread-65/journal/page | none observed |
| 713914ecef8b86fa0000000000000ef1 | 203.203 | 0.019 | n/a | 0.000 | 0.000 | 2.415 | 200.664 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.058 | 0.019 | 0.000 | 0.058 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000ef3 | 203.027 | 0.034 | n/a | 0.000 | 0.000 | 2.094 | 200.762 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.084 | 0.034 | 0.000 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000ed1 | 202.789 | 0.027 | n/a | 0.000 | 0.000 | 1.964 | 200.644 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.087 | 0.027 | 0.000 | 0.087 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000ed9 | 202.378 | 0.032 | n/a | 0.000 | 0.000 | 1.716 | 200.538 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000ef4 | 202.101 | 0.051 | n/a | 0.000 | 0.000 | 0.794 | 201.045 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.115 | 0.051 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| 713914ecef8b86fa0000000000000ecc | 202.017 | 0.048 | n/a | 0.000 | 0.000 | 0.591 | 201.243 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.085 | 0.048 | 0.000 | 0.085 | gw-r/thread-42/journal/page | none observed |
| 713914ecef8b86fa0000000000000ee3 | 201.876 | 0.024 | n/a | 0.000 | 0.000 | 0.447 | 201.250 | 0.009 | n/a | 0.102 | 0.000 | n/a | n/a | 0.045 | 0.024 | 0.000 | 0.045 | gw-r/thread-44/journal/page | none observed |
| 713914ecef8b86fa0000000000000f06 | 201.861 | 0.044 | n/a | 0.000 | 0.000 | 0.910 | 200.758 | 0.027 | n/a | 0.054 | 0.000 | n/a | n/a | 0.067 | 0.044 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000edb | 201.735 | 0.047 | n/a | 0.000 | 0.000 | 0.546 | 200.881 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.179 | 0.047 | 0.000 | 0.179 | gw-r/thread-65/journal/page | none observed |
| 713914ecef8b86fa0000000000000f12 | 201.701 | 0.021 | n/a | 0.000 | 0.000 | 0.763 | 200.798 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.044 | 0.021 | 0.000 | 0.044 | gw-r/thread-63/journal/page | none observed |
| 713914ecef8b86fa0000000000000edc | 201.670 | 0.052 | n/a | 0.000 | 0.000 | 0.778 | 200.698 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.092 | 0.052 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 713914ecef8b86fa0000000000000eef | 201.654 | 0.035 | n/a | 0.000 | 0.000 | 0.540 | 200.924 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-65/journal/page | none observed |
| 713914ecef8b86fa0000000000000f04 | 201.589 | 0.040 | n/a | 0.000 | 0.000 | 0.532 | 200.867 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000f07 | 201.567 | 0.035 | n/a | 0.000 | 0.000 | 0.651 | 200.767 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.054 | 0.035 | 0.000 | 0.054 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000ec7 | 201.564 | 0.062 | n/a | 0.000 | 0.000 | 0.760 | 200.565 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.143 | 0.062 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 713914ecef8b86fa0000000000000ec4 | 201.532 | 0.049 | n/a | 0.000 | 0.000 | 0.638 | 200.654 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.126 | 0.049 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 713914ecef8b86fa0000000000000ed2 | 201.524 | 0.041 | n/a | 0.000 | 0.000 | 0.620 | 200.728 | 0.003 | n/a | 0.042 | 0.000 | n/a | n/a | 0.090 | 0.041 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
