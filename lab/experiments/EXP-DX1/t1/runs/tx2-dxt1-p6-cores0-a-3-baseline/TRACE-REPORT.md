# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (50.848 ms, trace `7a22ae566c88fadb000000000000013c`); `gw-w/thread-44/gateway.admitted-work` (64.607 ms, trace `7a22ae566c88fadb00000000000001ae`); `node-14/thread-0/driver.queue.subject` (59.898 ms, trace `7a22ae566c88fadb0000000000000374`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (43.438 ms, trace `7a22ae566c88fadb0000000000000102`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (46.613 ms, trace `7a22ae566c88fadb00000000000002e1`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cores0-a-3-baseline`; source `7629065bb0a0221b3ec27af2f5a6f030bd33487f`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17717231.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 196 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13365.566 | 496.948 | 5.812 | 454 |
| L1 | 0 | 19965.281 | 357.739 | 10.509 | 668 |
| L4 | 0 | 19978.623 | 312.653 | 6.986 | 628 |
| L16 | 0 | 19971.334 | 322.756 | 7.759 | 686 |
| L64 | 0 | 19973.637 | 340.134 | 8.433 | 850 |
| L256 | 0 | 19980.631 | 417.862 | 14.621 | 708 |
| L1024 | 0 | 19983.995 | 3170.076 | 26.448 | 16846 |
| tail | 0 | 64703.672 | 9949.310 | 78.534 | 53113 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 7a22ae566c88fadb000000000000013c | driver.queue.scheduler-dispatch | 0.077 | none | 0 / 32 |
| 7a22ae566c88fadb000000000000013c | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 7a22ae566c88fadb000000000000013c waited: []

| 7a22ae566c88fadb00000000000001ae | driver.queue.scheduler-dispatch | 0.066 | none | 0 / 32 |
| 7a22ae566c88fadb00000000000001ae | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 7a22ae566c88fadb00000000000001ae waited: []

| 7a22ae566c88fadb0000000000000374 | driver.queue.subject | 59.898 | 7a22ae566c88fadb0000000000000373 | 4 / 32 |
| 7a22ae566c88fadb0000000000000374 | driver.queue.scheduler-late | 1.011 | none | 4 / 32 |
| 7a22ae566c88fadb0000000000000374 | driver.queue.scheduler-dispatch | 0.070 | none | 1 / 32 |

Observed active steps while trace 7a22ae566c88fadb0000000000000374 waited: [{"at":1794674840433.9065,"inFlight":3,"capacity":32,"active":[{"traceId":"7a22ae566c88fadb0000000000000372","step":"rpc.probe.transact"},{"traceId":"7a22ae566c88fadb0000000000000375","step":"client.http"},{"traceId":"7a22ae566c88fadb0000000000000373","step":"client.http"}]},{"at":1794674840454.1465,"inFlight":2,"capacity":32,"active":[{"traceId":"7a22ae566c88fadb0000000000000372","step":"rpc.probe.transact"},{"traceId":"7a22ae566c88fadb0000000000000373","step":"client.http"}]}]

| 7a22ae566c88fadb0000000000000102 | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |
| 7a22ae566c88fadb0000000000000102 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 7a22ae566c88fadb0000000000000102 waited: []

| 7a22ae566c88fadb00000000000002e1 | driver.queue.scheduler-late | 0.881 | none | 0 / 32 |
| 7a22ae566c88fadb00000000000002e1 | driver.queue.scheduler-dispatch | 0.046 | none | 0 / 32 |

Observed active steps while trace 7a22ae566c88fadb00000000000002e1 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.671 | 0.439 | 0.000 | 0.685 | 4.232 | 0.433 | 0.000 | 0.218 | 1.752 | 5.689 | 0.028 | n/a | 0.435 | 8.334 | 3.876 | n/a | 0.032 | 4.908 | 0.183 | 0.032 |
| p99 | 75.695 | 4.127 | 0.018 | 4.037 | 15.691 | n/a | 3.728 | 1.250 | 5.702 | 25.301 | 0.128 | n/a | 4.315 | 43.438 | 13.422 | n/a | 0.168 | 16.192 | 0.385 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000102 | 75.695 | 5.969 | 0.229 | 1.507 | 0.073 | 2.391 | 15.910 | 0.086 | n/a | 0.739 | 43.438 | 5.324 | n/a | 0.029 | 7.778 | 0.103 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 7a22ae566c88fadb00000000000000f1 | 70.202 | 15.691 | 0.433 | 0.000 | 0.069 | 2.482 | 25.301 | 0.128 | n/a | 3.937 | 16.503 | 5.633 | n/a | 0.025 | 16.192 | 0.231 | 0.025 | gw-w/thread-44/gateway.admitted-work | none observed |
| 7a22ae566c88fadb00000000000000ef | 46.647 | 10.982 | n/a | 0.000 | 1.101 | 3.195 | 2.714 | 0.023 | n/a | 4.315 | 20.368 | 3.782 | n/a | 0.168 | 12.083 | 0.259 | 0.168 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000100 | 45.436 | 4.787 | n/a | 1.774 | 0.563 | 1.029 | 24.929 | 0.021 | n/a | 0.088 | 8.334 | 3.876 | n/a | 0.034 | 7.124 | 0.157 | 0.034 | gw-w/thread-44/gateway.request-parse | driver.reader-basis.broadcast 0.020ms |
| 7a22ae566c88fadb000000000000010e | 40.077 | 6.818 | 0.271 | 0.377 | 0.066 | 2.259 | 13.187 | 0.057 | n/a | 3.822 | 9.452 | 3.738 | n/a | 0.031 | 7.532 | 0.188 | 0.031 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.026ms |
| 7a22ae566c88fadb000000000000010a | 39.144 | 5.676 | 0.370 | 0.000 | 0.055 | 1.660 | 11.268 | 0.029 | n/a | 3.524 | 12.135 | 4.394 | n/a | 0.032 | 6.101 | 0.156 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 7a22ae566c88fadb0000000000000114 | 37.667 | 5.013 | 0.351 | 0.000 | 0.060 | 1.779 | 10.907 | 0.054 | n/a | 1.632 | 4.421 | 13.422 | n/a | 0.027 | 5.424 | 0.144 | 0.027 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.022ms |
| 7a22ae566c88fadb0000000000000106 | 37.394 | 7.224 | n/a | 3.728 | 0.928 | 0.730 | 5.196 | 0.027 | n/a | 0.087 | 13.812 | 5.644 | n/a | 0.017 | 11.881 | 0.318 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000118 | 36.419 | 3.826 | 0.193 | 0.359 | 0.051 | 2.536 | 6.559 | 0.025 | n/a | 0.379 | 16.172 | 6.297 | n/a | 0.022 | 4.428 | 0.122 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 7a22ae566c88fadb00000000000000f7 | 35.967 | 3.249 | n/a | 0.000 | 0.824 | 1.123 | 4.812 | 0.039 | n/a | 0.112 | 15.614 | 10.170 | n/a | 0.024 | 4.074 | 0.113 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 7a22ae566c88fadb000000000000011c | 35.869 | 4.194 | 0.199 | 0.000 | 0.065 | 2.206 | 12.380 | 0.052 | n/a | 0.152 | 10.379 | 6.206 | n/a | 0.036 | 4.458 | 0.124 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 7a22ae566c88fadb00000000000000fb | 33.567 | 4.932 | 0.282 | 0.000 | 0.075 | 2.108 | 13.032 | 0.035 | n/a | 0.105 | 9.539 | 3.418 | n/a | 0.040 | 5.289 | 0.158 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 7a22ae566c88fadb00000000000000f8 | 31.885 | 4.703 | 0.174 | 0.000 | 0.031 | 1.752 | 12.131 | 0.029 | n/a | 0.085 | 8.301 | 4.667 | n/a | 0.014 | 4.908 | 0.154 | 0.014 | gw-w/thread-45/gateway.admitted-work | driver.publication.persist-deferred 1.400ms; driver.reader-basis.broadcast 0.017ms |
| 7a22ae566c88fadb0000000000000104 | 29.705 | 4.232 | 0.335 | 0.000 | 0.226 | 1.798 | 8.257 | 0.033 | n/a | 0.490 | 9.413 | 4.835 | n/a | 0.085 | 4.794 | 0.161 | 0.085 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 7a22ae566c88fadb0000000000000116 | 29.671 | 7.599 | n/a | 2.764 | 1.053 | 0.769 | 1.712 | 0.021 | n/a | 0.531 | 10.441 | 4.734 | n/a | 0.048 | 11.416 | 0.385 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 7a22ae566c88fadb0000000000000120 | 28.506 | 3.855 | 0.260 | 0.000 | 0.191 | 2.015 | 9.953 | 0.052 | n/a | 0.523 | 7.896 | 3.677 | n/a | 0.083 | 4.306 | 0.151 | 0.083 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 7a22ae566c88fadb000000000000011e | 28.453 | 3.433 | n/a | 0.000 | 0.912 | 2.061 | 5.689 | 0.049 | n/a | 0.151 | 8.752 | 7.371 | n/a | 0.035 | 4.345 | 0.153 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000124 | 28.436 | 4.654 | 0.311 | 0.287 | 0.069 | 1.853 | 7.662 | 0.028 | n/a | 0.278 | 6.788 | 6.475 | n/a | 0.031 | 5.321 | 0.187 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 7a22ae566c88fadb00000000000000f5 | 27.524 | 4.711 | 0.267 | 0.000 | 0.046 | 2.179 | 11.816 | 0.028 | n/a | 0.312 | 6.468 | 1.673 | n/a | 0.025 | 5.024 | 0.183 | 0.025 | gw-w/thread-46/gateway.admitted-work | none observed |
| 7a22ae566c88fadb000000000000010c | 23.611 | 3.858 | 0.267 | 0.000 | 0.060 | 5.702 | 3.486 | 0.034 | n/a | 0.500 | 8.231 | 1.449 | n/a | 0.025 | 4.185 | 0.177 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.115 | 0.243 | 0.000 | 0.685 | 3.249 | n/a | 0.000 | 0.788 | 1.123 | 1.935 | 0.025 | n/a | 0.151 | 7.692 | 0.998 | n/a | 0.035 | 3.885 | 0.241 | 0.035 |
| p99 | 35.967 | 1.975 | 0.000 | 0.984 | 4.326 | n/a | 0.000 | 1.250 | 2.061 | 5.689 | 0.049 | n/a | 0.625 | 15.614 | 10.170 | n/a | 0.056 | 5.179 | 0.297 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000000f7 | 35.967 | 3.249 | n/a | 0.000 | 0.824 | 1.123 | 4.812 | 0.039 | n/a | 0.112 | 15.614 | 10.170 | n/a | 0.024 | 4.074 | 0.113 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 7a22ae566c88fadb000000000000011e | 28.453 | 3.433 | n/a | 0.000 | 0.912 | 2.061 | 5.689 | 0.049 | n/a | 0.151 | 8.752 | 7.371 | n/a | 0.035 | 4.345 | 0.153 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000112 | 22.895 | 4.326 | n/a | 0.000 | 0.853 | 0.783 | 5.088 | 0.025 | n/a | 0.101 | 7.727 | 3.944 | n/a | 0.048 | 5.179 | 0.226 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000000f3 | 19.887 | 3.240 | n/a | 0.000 | 0.618 | 1.615 | 2.877 | 0.027 | n/a | 0.565 | 10.051 | 0.858 | n/a | 0.035 | 3.858 | 0.194 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |
| 7a22ae566c88fadb000000000000011a | 15.115 | 3.097 | n/a | 0.000 | 0.788 | 1.163 | 1.935 | 0.031 | n/a | 0.139 | 7.302 | 0.628 | n/a | 0.032 | 3.885 | 0.257 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000125 | 14.569 | 3.295 | n/a | 0.000 | 0.218 | 0.975 | 1.277 | 0.019 | n/a | 0.077 | 7.692 | 0.982 | n/a | 0.034 | 3.513 | 0.241 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000010f | 14.407 | 3.005 | n/a | 0.000 | 1.250 | 0.657 | 1.017 | 0.022 | n/a | 0.459 | 6.953 | 0.998 | n/a | 0.046 | 4.254 | 0.295 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 7a22ae566c88fadb0000000000000122 | 13.498 | 2.834 | n/a | 0.000 | 0.437 | 1.143 | 1.584 | 0.023 | n/a | 0.625 | 5.919 | 0.894 | n/a | 0.037 | 3.271 | 0.242 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000000fc | 12.227 | 3.327 | n/a | 0.000 | 0.302 | 1.102 | 1.106 | 0.022 | n/a | 0.435 | 3.481 | 2.396 | n/a | 0.056 | 3.629 | 0.297 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.784 | 0.000 | 0.000 | 0.342 | 8.691 | 0.174 | 0.000 | 0.058 | 1.213 | 11.657 | 0.029 | n/a | 0.108 | 8.773 | 7.058 | n/a | 0.024 | 8.923 | 0.236 | 0.024 |
| p99 | 37.784 | 0.000 | 0.000 | 0.342 | 8.691 | 0.174 | 0.000 | 0.058 | 1.213 | 11.657 | 0.029 | n/a | 0.108 | 8.773 | 7.058 | n/a | 0.024 | 8.923 | 0.236 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000128 | 37.784 | 8.691 | 0.174 | 0.000 | 0.058 | 1.213 | 11.657 | 0.029 | n/a | 0.108 | 8.773 | 7.058 | n/a | 0.024 | 8.923 | 0.236 | 0.024 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.053ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.776 | 0.320 | 0.000 | 0.563 | 3.978 | n/a | 0.000 | 0.186 | 1.493 | 5.151 | 0.033 | n/a | 0.394 | 8.624 | 4.336 | n/a | 0.029 | 4.850 | 0.169 | 0.029 |
| p99 | 102.686 | 4.986 | 0.043 | 4.497 | 10.375 | n/a | 3.323 | 2.743 | 5.893 | 25.032 | 0.100 | n/a | 4.041 | 50.848 | 23.855 | n/a | 0.082 | 12.325 | 0.447 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb000000000000013c | 102.686 | 7.454 | 0.201 | 0.000 | 0.079 | 2.494 | 25.032 | 0.070 | n/a | 0.169 | 50.848 | 16.295 | n/a | 0.043 | 7.735 | 0.075 | 0.043 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 7a22ae566c88fadb0000000000000140 | 62.655 | 6.175 | 0.315 | 0.736 | 0.214 | 2.994 | 15.468 | 0.059 | n/a | 0.446 | 12.321 | 23.855 | n/a | 0.072 | 7.440 | 0.119 | 0.072 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.045ms |
| 7a22ae566c88fadb0000000000000132 | 53.930 | 4.735 | 0.381 | 0.000 | 0.055 | 1.090 | 12.398 | 0.065 | n/a | 0.115 | 18.232 | 16.838 | n/a | 0.022 | 5.171 | 0.096 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.247ms; driver.reader-basis.broadcast 0.059ms |
| 7a22ae566c88fadb000000000000012c | 38.136 | 5.636 | 0.651 | 0.000 | 0.171 | 3.285 | 6.035 | 0.035 | n/a | 0.431 | 8.464 | 13.371 | n/a | 0.056 | 6.458 | 0.169 | 0.056 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.039ms |
| 7a22ae566c88fadb0000000000000136 | 37.136 | 4.343 | 0.190 | 0.000 | 0.079 | 1.552 | 12.487 | 0.029 | n/a | 0.746 | 10.182 | 7.497 | n/a | 0.032 | 4.612 | 0.124 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 7a22ae566c88fadb0000000000000144 | 36.212 | 4.633 | 0.167 | 0.000 | 0.052 | 1.903 | 5.151 | 0.026 | n/a | 0.078 | 13.649 | 10.532 | n/a | 0.022 | 4.851 | 0.134 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| 7a22ae566c88fadb0000000000000171 | 35.988 | 4.760 | 0.396 | 0.000 | 0.084 | 1.493 | 8.299 | 0.033 | n/a | 0.393 | 13.224 | 7.271 | n/a | 0.036 | 5.240 | 0.146 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 7a22ae566c88fadb000000000000012f | 35.821 | 2.452 | n/a | 0.000 | 0.522 | 0.716 | 1.350 | 0.019 | n/a | 0.294 | 29.693 | 0.751 | n/a | 0.024 | 2.975 | 0.083 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000014c | 35.597 | 6.281 | 0.271 | 0.000 | 0.073 | 2.156 | 9.868 | 0.040 | n/a | 0.101 | 10.301 | 6.468 | n/a | 0.037 | 6.625 | 0.186 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 7a22ae566c88fadb000000000000015b | 35.580 | 3.655 | 0.220 | 0.000 | 0.069 | 2.262 | 12.240 | 0.029 | n/a | 0.428 | 8.075 | 8.573 | n/a | 0.028 | 3.944 | 0.111 | 0.028 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.049ms |
| 7a22ae566c88fadb0000000000000131 | 33.749 | 2.394 | n/a | 0.000 | 0.395 | 0.752 | 1.966 | 0.061 | n/a | 2.532 | 14.894 | 10.723 | n/a | 0.033 | 2.789 | 0.083 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 7a22ae566c88fadb0000000000000148 | 33.622 | 3.978 | 0.265 | 0.557 | 0.050 | 1.196 | 13.325 | 0.043 | n/a | 0.101 | 7.960 | 6.120 | n/a | 0.028 | 4.850 | 0.144 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 7a22ae566c88fadb000000000000013e | 33.416 | 4.560 | 0.330 | 0.000 | 0.065 | 2.013 | 7.831 | 0.041 | n/a | 0.158 | 7.767 | 10.615 | n/a | 0.038 | 4.954 | 0.148 | 0.038 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.041ms |
| 7a22ae566c88fadb000000000000016f | 32.132 | 5.537 | 0.570 | 0.000 | 0.042 | 0.974 | 5.190 | 0.027 | n/a | 0.086 | 11.884 | 7.805 | n/a | 0.016 | 6.148 | 0.191 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| 7a22ae566c88fadb000000000000016b | 29.684 | 4.104 | 0.151 | 0.000 | 0.073 | 2.544 | 7.955 | 0.058 | n/a | 0.157 | 10.428 | 4.173 | n/a | 0.041 | 4.328 | 0.146 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| 7a22ae566c88fadb000000000000012a | 29.500 | 5.240 | 0.308 | 0.377 | 0.061 | 2.275 | 5.937 | 0.026 | n/a | 0.077 | 8.770 | 6.401 | n/a | 0.027 | 5.986 | 0.203 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 7a22ae566c88fadb0000000000000167 | 28.623 | 4.787 | 0.232 | 0.000 | 0.246 | 1.329 | 5.890 | 0.035 | n/a | 0.139 | 11.516 | 4.367 | n/a | 0.082 | 5.265 | 0.184 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 7a22ae566c88fadb0000000000000142 | 28.054 | 3.808 | n/a | 2.616 | 0.100 | 1.585 | 1.475 | 0.022 | n/a | 0.186 | 12.496 | 5.731 | n/a | 0.035 | 6.525 | 0.233 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000014d | 27.581 | 10.375 | n/a | 1.803 | 0.146 | 0.785 | 1.671 | 0.020 | n/a | 0.630 | 8.444 | 3.660 | n/a | 0.045 | 12.325 | 0.447 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 7a22ae566c88fadb000000000000015c | 27.239 | 2.109 | n/a | 0.000 | 0.675 | 1.371 | 1.198 | 0.011 | n/a | 0.328 | 16.915 | 4.608 | n/a | 0.023 | 2.784 | 0.102 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.049ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.223 | 0.261 | 0.000 | 0.440 | 2.283 | n/a | 0.000 | 0.646 | 0.891 | 1.771 | 0.033 | n/a | 0.808 | 6.665 | 0.894 | n/a | 0.029 | 3.112 | 0.206 | 0.029 |
| p99 | 33.749 | 1.913 | 0.000 | 0.664 | 7.642 | n/a | 0.000 | 2.743 | 5.893 | 6.472 | 0.100 | n/a | 4.041 | 14.894 | 10.723 | n/a | 0.065 | 8.079 | 0.329 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000131 | 33.749 | 2.394 | n/a | 0.000 | 0.395 | 0.752 | 1.966 | 0.061 | n/a | 2.532 | 14.894 | 10.723 | n/a | 0.033 | 2.789 | 0.083 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 7a22ae566c88fadb000000000000015a | 25.357 | 3.293 | n/a | 0.000 | 0.646 | 1.984 | 1.280 | 0.024 | n/a | 4.041 | 11.054 | 2.969 | n/a | 0.065 | 3.940 | 0.155 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000135 | 24.591 | 7.642 | n/a | 0.000 | 0.437 | 5.893 | 6.472 | 0.100 | n/a | 1.119 | 2.372 | 0.524 | n/a | 0.031 | 8.079 | 0.329 | 0.031 | node-14/thread-0/driver.execute | none observed |
| 7a22ae566c88fadb0000000000000145 | 19.728 | 1.962 | n/a | 0.000 | 0.746 | 0.673 | 1.872 | 0.021 | n/a | 0.109 | 10.730 | 3.594 | n/a | 0.021 | 2.708 | 0.137 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000177 | 17.223 | 1.714 | n/a | 0.000 | 2.743 | 0.839 | 1.771 | 0.051 | n/a | 0.573 | 8.624 | 0.894 | n/a | 0.013 | 4.457 | 0.259 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.052ms |
| 7a22ae566c88fadb0000000000000150 | 14.473 | 2.218 | n/a | 0.000 | 0.894 | 1.173 | 2.316 | 0.049 | n/a | 2.070 | 5.063 | 0.663 | n/a | 0.029 | 3.112 | 0.215 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000016d | 14.249 | 2.718 | n/a | 0.000 | 0.212 | 1.021 | 1.599 | 0.033 | n/a | 0.808 | 6.665 | 1.140 | n/a | 0.052 | 2.930 | 0.206 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000160 | 10.470 | 2.283 | n/a | 0.000 | 1.080 | 0.891 | 1.056 | 0.018 | n/a | 0.394 | 3.945 | 0.779 | n/a | 0.024 | 3.363 | 0.321 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.194 | n/a | n/a | n/a | 29.778 | 3.583 | 1.904 | 0.000 | 14.324 | 1.749 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.007 | 52.038 | 0.698 | 0.007 |
| p99 | 169.002 | n/a | n/a | n/a | 101.311 | 115.034 | 15.070 | 0.000 | 121.370 | 32.114 | 42.008 | n/a | 0.024 | 0.000 | n/a | n/a | 0.017 | 132.428 | 1.000 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000826 | 169.002 | 27.640 | 2.621 | 1.500 | 0.000 | 121.370 | 3.826 | 12.034 | n/a | 0.004 | 0.000 | n/a | n/a | 0.007 | 31.761 | 0.188 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.207ms; driver.publication.persist-deferred 1.043ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.959ms |
| 7a22ae566c88fadb00000000000011dd | 164.414 | 101.311 | 0.120 | 13.294 | 0.000 | 29.797 | 19.883 | 0.002 | n/a | 0.003 | 0.000 | n/a | n/a | 0.004 | 114.726 | 0.698 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.509ms; driver.publication.persist-deferred 1.239ms; driver.publication.persist-deferred 1.199ms; driver.publication.persist-deferred 0.955ms; driver.publication.persist-deferred 0.909ms |
| 7a22ae566c88fadb000000000000082a | 159.052 | 29.778 | 1.175 | 1.500 | 0.000 | 111.925 | 1.053 | 13.605 | n/a | 0.003 | 0.000 | n/a | n/a | 0.014 | 32.453 | 0.204 | 0.014 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.207ms; driver.publication.persist-deferred 1.043ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.949ms |
| 7a22ae566c88fadb0000000000000823 | 155.717 | 89.772 | 3.684 | 15.070 | 0.000 | 31.887 | 15.271 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.009 | 108.526 | 0.697 | 0.009 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.207ms; driver.publication.persist-deferred 1.043ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.959ms |
| 7a22ae566c88fadb000000000000082d | 155.527 | 18.305 | 109.881 | 3.792 | 0.000 | 22.161 | 1.361 | 0.005 | n/a | 0.014 | 0.000 | n/a | n/a | 0.008 | 131.978 | 0.849 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.207ms; driver.publication.persist-deferred 1.043ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.949ms |
| 7a22ae566c88fadb0000000000000833 | 149.714 | 24.490 | 95.137 | 0.000 | 0.000 | 24.550 | 5.517 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.009 | 119.627 | 0.799 | 0.009 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.043ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.959ms; driver.publication.persist-deferred 0.949ms; driver.publication.persist-deferred 0.949ms |
| 7a22ae566c88fadb0000000000000836 | 148.285 | 17.394 | 115.034 | 0.000 | 0.000 | 14.985 | 0.855 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.005 | 132.428 | 0.893 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.043ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.949ms; driver.publication.persist-deferred 0.949ms; driver.publication.persist-deferred 0.915ms |
| 7a22ae566c88fadb00000000000015f8 | 135.442 | 65.810 | 1.525 | 4.905 | 0.000 | 54.169 | 9.019 | 0.003 | n/a | 0.006 | 0.000 | n/a | n/a | 0.006 | 72.240 | 0.533 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.045ms; driver.publication.persist-deferred 1.038ms; driver.publication.persist-deferred 0.926ms; driver.publication.persist-deferred 0.905ms; driver.publication.persist-deferred 0.860ms |
| 7a22ae566c88fadb0000000000000366 | 131.554 | 53.135 | 27.731 | 5.870 | 0.000 | 43.765 | 1.033 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.009 | 86.737 | 0.659 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.927ms |
| 7a22ae566c88fadb00000000000010a4 | 123.157 | 30.618 | 57.533 | 0.000 | 0.000 | 32.183 | 2.814 | 0.001 | n/a | 0.004 | 0.000 | n/a | n/a | 0.002 | 88.152 | 0.716 | 0.002 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.170ms; driver.publication.persist-deferred 1.015ms; driver.publication.persist-deferred 1.014ms; driver.publication.persist-deferred 0.992ms |
| 7a22ae566c88fadb00000000000010a2 | 120.507 | 33.621 | 77.958 | 4.997 | 0.000 | 1.859 | 2.054 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.007 | 116.576 | 0.967 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.170ms; driver.publication.persist-deferred 1.015ms; driver.publication.persist-deferred 1.014ms; driver.publication.persist-deferred 1.013ms |
| 7a22ae566c88fadb0000000000001095 | 117.812 | 63.478 | 0.324 | 7.393 | 0.000 | 31.768 | 14.823 | 0.001 | n/a | 0.020 | 0.000 | n/a | n/a | 0.006 | 71.194 | 0.604 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.341ms; driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.170ms; driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 1.015ms |
| 7a22ae566c88fadb000000000000035e | 112.611 | 16.826 | 2.733 | 2.189 | 0.000 | 42.663 | 24.048 | 24.138 | n/a | 0.007 | 0.000 | n/a | n/a | 0.007 | 21.748 | 0.193 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.979ms |
| 7a22ae566c88fadb00000000000010a7 | 112.350 | 26.618 | 57.648 | 0.000 | 0.000 | 27.285 | 0.792 | 0.002 | n/a | 0.002 | 0.000 | n/a | n/a | 0.003 | 84.266 | 0.750 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.170ms; driver.publication.persist-deferred 1.015ms; driver.publication.persist-deferred 1.014ms; driver.publication.persist-deferred 0.853ms |
| 7a22ae566c88fadb000000000000035f | 102.960 | 14.875 | 3.583 | 0.510 | 0.000 | 40.327 | 1.630 | 42.008 | n/a | 0.019 | 0.000 | n/a | n/a | 0.007 | 18.969 | 0.184 | 0.007 | gw-r/thread-62/gateway.admission-wait | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.979ms |
| 7a22ae566c88fadb00000000000010ab | 96.024 | 22.699 | 40.666 | 0.000 | 0.000 | 31.550 | 1.098 | 0.001 | n/a | 0.003 | 0.000 | n/a | n/a | 0.006 | 63.365 | 0.660 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.014ms; driver.publication.persist-deferred 0.853ms; driver.reader-basis.broadcast 0.178ms |
| 7a22ae566c88fadb00000000000010a0 | 95.663 | 12.131 | 21.069 | 1.060 | 0.000 | 60.618 | 0.759 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.014 | 34.259 | 0.358 | 0.014 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.244ms; driver.publication.persist-deferred 1.170ms; driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 1.015ms; driver.publication.persist-deferred 1.013ms |
| 7a22ae566c88fadb00000000000019a9 | 95.088 | 20.997 | 60.824 | 0.000 | 0.000 | 9.813 | 3.438 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.004 | 81.821 | 0.860 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.142ms; driver.publication.persist-deferred 1.062ms; driver.publication.persist-deferred 1.050ms; driver.publication.persist-deferred 0.876ms; driver.publication.persist-deferred 0.860ms |
| 7a22ae566c88fadb00000000000019a4 | 92.960 | 49.512 | 6.691 | 2.668 | 0.000 | 27.365 | 6.714 | 0.003 | n/a | 0.004 | 0.000 | n/a | n/a | 0.003 | 58.871 | 0.633 | 0.003 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 1.142ms; driver.publication.persist-deferred 1.062ms; driver.publication.persist-deferred 1.050ms; driver.publication.persist-deferred 0.876ms |
| 7a22ae566c88fadb000000000000174e | 89.537 | 36.559 | 0.164 | 2.568 | 0.000 | 45.574 | 4.642 | 0.002 | n/a | 0.024 | 0.000 | n/a | n/a | 0.005 | 39.291 | 0.439 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.833ms; driver.publication.persist-deferred 0.815ms; driver.reader-basis.broadcast 0.238ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.391 | 0.341 | 0.000 | 0.585 | 3.750 | 0.557 | 0.000 | 0.167 | 1.457 | 5.329 | 0.032 | n/a | 0.162 | 7.123 | 3.695 | n/a | 0.034 | 4.484 | 0.183 | 0.034 |
| p99 | 84.722 | 1.289 | 0.000 | 2.058 | 8.493 | n/a | 2.773 | 1.186 | 5.789 | 67.659 | 0.300 | n/a | 3.223 | 16.897 | 52.902 | n/a | 0.090 | 12.250 | 0.348 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000001ae | 84.722 | 5.000 | 0.247 | 0.000 | 0.068 | 2.145 | 67.659 | 0.091 | n/a | 0.103 | 5.131 | 4.244 | n/a | 0.034 | 5.315 | 0.063 | 0.034 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.028ms |
| 7a22ae566c88fadb00000000000001a2 | 71.096 | 3.367 | 0.172 | 0.296 | 0.050 | 1.314 | 5.833 | 0.031 | n/a | 0.162 | 6.942 | 52.902 | n/a | 0.028 | 3.884 | 0.055 | 0.028 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.025ms |
| 7a22ae566c88fadb00000000000001a8 | 41.309 | 3.709 | 0.278 | 0.253 | 0.215 | 5.311 | 21.613 | 0.081 | n/a | 0.104 | 6.255 | 3.400 | n/a | 0.090 | 4.456 | 0.108 | 0.090 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.022ms |
| 7a22ae566c88fadb0000000000000186 | 39.201 | 6.213 | 0.315 | 0.585 | 0.072 | 2.569 | 6.848 | 0.047 | n/a | 0.444 | 14.134 | 7.916 | n/a | 0.059 | 7.184 | 0.183 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 7a22ae566c88fadb00000000000001a4 | 35.328 | 3.937 | 0.277 | 0.230 | 0.156 | 1.479 | 13.738 | 0.033 | n/a | 0.130 | 11.613 | 3.680 | n/a | 0.055 | 4.600 | 0.130 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001b6 | 35.185 | 8.493 | n/a | 2.773 | 0.984 | 2.863 | 2.193 | 0.025 | n/a | 0.708 | 9.310 | 7.773 | n/a | 0.064 | 12.250 | 0.348 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000196 | 34.557 | 4.809 | 0.187 | 0.000 | 0.064 | 1.520 | 5.204 | 0.049 | n/a | 3.223 | 12.371 | 7.105 | n/a | 0.024 | 5.060 | 0.146 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000018e | 34.091 | 4.705 | 0.419 | 0.287 | 0.054 | 5.789 | 7.799 | 0.300 | n/a | 0.141 | 7.021 | 7.550 | n/a | 0.026 | 5.465 | 0.160 | 0.026 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.048ms |
| 7a22ae566c88fadb0000000000000183 | 34.075 | 4.791 | 0.170 | 0.370 | 0.055 | 1.457 | 10.110 | 0.036 | n/a | 0.068 | 9.063 | 7.932 | n/a | 0.023 | 5.386 | 0.158 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 7a22ae566c88fadb00000000000001bc | 32.477 | 3.881 | 0.268 | 0.267 | 0.068 | 2.115 | 11.710 | 0.080 | n/a | 0.174 | 9.504 | 4.370 | n/a | 0.039 | 4.484 | 0.138 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000019a | 32.451 | 4.653 | 0.318 | 0.000 | 0.130 | 1.306 | 10.266 | 0.034 | n/a | 0.412 | 6.714 | 8.563 | n/a | 0.055 | 5.102 | 0.157 | 0.055 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000001b8 | 30.374 | 4.714 | 0.378 | 0.277 | 0.068 | 2.396 | 6.328 | 0.036 | n/a | 0.505 | 9.548 | 6.093 | n/a | 0.031 | 5.438 | 0.179 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001ca | 29.279 | 4.577 | 0.231 | 0.442 | 0.119 | 5.027 | 5.639 | 0.028 | n/a | 0.091 | 7.521 | 5.578 | n/a | 0.025 | 5.369 | 0.183 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001c0 | 28.136 | 5.326 | 0.299 | 0.443 | 0.071 | 1.990 | 9.177 | 0.032 | n/a | 0.741 | 6.449 | 3.570 | n/a | 0.040 | 6.138 | 0.218 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001b2 | 27.769 | 3.614 | 0.175 | 0.251 | 0.043 | 1.576 | 9.016 | 0.096 | n/a | 2.757 | 9.672 | 0.551 | n/a | 0.019 | 4.083 | 0.147 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000019c | 27.733 | 4.689 | 0.557 | 0.000 | 0.167 | 1.727 | 10.757 | 0.029 | n/a | 0.131 | 5.791 | 3.807 | n/a | 0.077 | 5.414 | 0.195 | 0.077 | gw-w/thread-40/gateway.admitted-work | none observed |
| 7a22ae566c88fadb0000000000000188 | 27.602 | 2.757 | n/a | 0.000 | 0.929 | 0.651 | 5.930 | 0.020 | n/a | 0.064 | 11.625 | 5.607 | n/a | 0.018 | 3.686 | 0.134 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000190 | 27.523 | 3.799 | 0.312 | 0.343 | 0.068 | 2.121 | 10.425 | 0.050 | n/a | 0.143 | 6.479 | 3.745 | n/a | 0.039 | 4.521 | 0.164 | 0.039 | gw-w/thread-43/gateway.admitted-work | none observed |
| 7a22ae566c88fadb00000000000001b4 | 27.431 | 3.167 | 0.191 | 0.238 | 0.066 | 1.150 | 8.297 | 0.048 | n/a | 0.711 | 7.504 | 6.029 | n/a | 0.031 | 3.662 | 0.133 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001a0 | 25.391 | 4.467 | 0.161 | 0.000 | 0.042 | 1.483 | 9.955 | 0.026 | n/a | 0.114 | 5.910 | 3.211 | n/a | 0.022 | 4.670 | 0.184 | 0.022 | gw-w/thread-42/gateway.admitted-work | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.309 | 0.595 | 0.000 | 0.530 | 2.622 | n/a | 0.000 | 0.711 | 0.943 | 1.948 | 0.031 | n/a | 0.149 | 7.123 | 2.413 | n/a | 0.037 | 3.528 | 0.199 | 0.037 |
| p99 | 23.944 | 1.289 | 0.000 | 0.865 | 3.858 | n/a | 0.000 | 1.186 | 1.687 | 5.329 | 0.074 | n/a | 0.620 | 16.897 | 3.813 | n/a | 0.079 | 4.605 | 0.321 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000001b0 | 23.944 | 3.232 | n/a | 0.000 | 0.121 | 0.915 | 1.976 | 0.033 | n/a | 0.146 | 16.897 | 0.594 | n/a | 0.029 | 3.353 | 0.140 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 7a22ae566c88fadb000000000000018c | 20.981 | 3.000 | n/a | 0.000 | 0.586 | 0.919 | 5.329 | 0.022 | n/a | 0.085 | 7.664 | 3.340 | n/a | 0.037 | 3.586 | 0.171 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000181 | 19.823 | 3.235 | n/a | 0.000 | 0.711 | 1.687 | 3.305 | 0.074 | n/a | 0.341 | 7.846 | 2.584 | n/a | 0.040 | 3.946 | 0.199 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000017d | 17.649 | 2.245 | n/a | 0.000 | 0.794 | 1.142 | 2.156 | 0.046 | n/a | 0.232 | 7.271 | 3.737 | n/a | 0.027 | 3.039 | 0.172 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 7a22ae566c88fadb00000000000001c5 | 16.539 | 2.622 | n/a | 0.000 | 1.186 | 0.786 | 1.084 | 0.019 | n/a | 0.149 | 7.123 | 3.537 | n/a | 0.033 | 3.807 | 0.230 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000192 | 16.309 | 3.858 | n/a | 0.000 | 0.747 | 1.523 | 1.586 | 0.031 | n/a | 0.150 | 7.613 | 0.722 | n/a | 0.079 | 4.605 | 0.282 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001bd | 16.070 | 2.450 | n/a | 0.000 | 1.078 | 1.109 | 1.502 | 0.034 | n/a | 0.458 | 6.987 | 2.413 | n/a | 0.038 | 3.528 | 0.220 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000194 | 15.740 | 2.223 | n/a | 0.000 | 0.132 | 1.162 | 1.948 | 0.062 | n/a | 0.620 | 5.735 | 3.813 | n/a | 0.045 | 2.355 | 0.150 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 7a22ae566c88fadb00000000000001a6 | 13.896 | 2.130 | n/a | 0.000 | 0.634 | 0.802 | 5.029 | 0.023 | n/a | 0.093 | 4.564 | 0.599 | n/a | 0.020 | 2.764 | 0.199 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001c7 | 12.509 | 2.924 | n/a | 0.000 | 1.093 | 0.943 | 1.369 | 0.018 | n/a | 0.108 | 5.549 | 0.456 | n/a | 0.048 | 4.017 | 0.321 | 0.048 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.934 | 0.149 | 0.000 | 0.450 | 3.398 | n/a | 0.000 | 0.156 | 1.172 | 3.605 | 0.029 | n/a | 0.165 | 6.913 | 3.740 | n/a | 0.028 | 3.904 | 0.189 | 0.028 |
| p99 | 61.175 | 1.999 | 0.022 | 1.927 | 15.906 | n/a | 0.538 | 1.130 | 4.415 | 40.287 | 0.075 | n/a | 2.769 | 48.841 | 9.204 | n/a | 0.124 | 16.606 | 0.340 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000001dd | 61.175 | 3.444 | 0.253 | 0.217 | 0.044 | 1.341 | 40.287 | 0.063 | n/a | 1.649 | 8.704 | 5.147 | n/a | 0.025 | 3.958 | 0.065 | 0.025 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.027ms |
| 7a22ae566c88fadb00000000000001f5 | 55.859 | 2.120 | n/a | 0.000 | 0.104 | 0.895 | 1.360 | 0.023 | n/a | 0.188 | 48.841 | 2.300 | n/a | 0.027 | 2.224 | 0.040 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 7a22ae566c88fadb00000000000001ef | 48.858 | 15.906 | n/a | 0.000 | 0.699 | 2.745 | 14.512 | 0.062 | n/a | 0.630 | 12.655 | 1.596 | n/a | 0.052 | 16.606 | 0.340 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000209 | 37.754 | 3.640 | 0.255 | 0.244 | 0.065 | 1.277 | 17.319 | 0.031 | n/a | 0.105 | 9.735 | 5.057 | n/a | 0.026 | 4.204 | 0.111 | 0.026 | gw-w/thread-45/gateway.admitted-work | none observed |
| 7a22ae566c88fadb0000000000000219 | 37.257 | 6.745 | 0.254 | 0.243 | 0.062 | 4.415 | 10.510 | 0.075 | n/a | 0.155 | 10.942 | 3.822 | n/a | 0.033 | 7.304 | 0.196 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001f7 | 34.864 | 3.674 | 0.320 | 0.238 | 0.195 | 1.463 | 13.549 | 0.041 | n/a | 0.365 | 5.691 | 9.204 | n/a | 0.124 | 4.427 | 0.127 | 0.124 | gw-w/thread-42/gateway.admitted-work | none observed |
| 7a22ae566c88fadb0000000000000215 | 33.758 | 4.770 | 0.369 | 0.310 | 0.058 | 2.245 | 6.504 | 0.032 | n/a | 0.353 | 15.034 | 4.056 | n/a | 0.026 | 5.508 | 0.163 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000201 | 32.766 | 5.616 | 0.196 | 0.538 | 0.063 | 2.490 | 9.057 | 0.051 | n/a | 0.190 | 9.813 | 4.720 | n/a | 0.032 | 6.413 | 0.196 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001d9 | 32.564 | 3.850 | 0.211 | 0.333 | 0.064 | 2.110 | 10.579 | 0.065 | n/a | 0.528 | 6.888 | 7.903 | n/a | 0.033 | 4.458 | 0.137 | 0.033 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000001d6 | 32.321 | 3.623 | 0.161 | 0.382 | 0.056 | 1.380 | 6.606 | 0.028 | n/a | 2.769 | 8.662 | 8.626 | n/a | 0.027 | 4.222 | 0.131 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001d3 | 30.704 | 7.794 | n/a | 0.000 | 1.021 | 1.058 | 1.881 | 0.015 | n/a | 0.062 | 11.868 | 6.979 | n/a | 0.025 | 8.815 | 0.287 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.635ms; driver.reader-basis.broadcast 0.024ms |
| 7a22ae566c88fadb00000000000001f9 | 29.304 | 4.352 | 0.205 | 0.261 | 0.060 | 1.519 | 10.910 | 0.048 | n/a | 0.162 | 7.655 | 4.098 | n/a | 0.033 | 4.878 | 0.166 | 0.033 | gw-w/thread-44/gateway.admitted-work | none observed |
| 7a22ae566c88fadb000000000000021d | 27.039 | 3.242 | 0.170 | 0.217 | 0.045 | 1.678 | 9.490 | 0.048 | n/a | 0.329 | 6.780 | 5.015 | n/a | 0.024 | 3.674 | 0.136 | 0.024 | gw-w/thread-45/gateway.admitted-work | none observed |
| 7a22ae566c88fadb00000000000001cc | 26.515 | 1.852 | n/a | 0.000 | 1.001 | 3.902 | 1.197 | 0.019 | n/a | 0.115 | 13.989 | 4.414 | n/a | 0.026 | 2.853 | 0.108 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001ed | 26.433 | 5.122 | 0.285 | 0.416 | 0.070 | 1.618 | 8.827 | 0.033 | n/a | 0.115 | 6.164 | 3.740 | n/a | 0.042 | 5.894 | 0.223 | 0.042 | gw-w/thread-42/gateway.admitted-work | none observed |
| 7a22ae566c88fadb000000000000020f | 26.365 | 4.249 | 0.339 | 0.241 | 0.086 | 1.500 | 4.910 | 0.028 | n/a | 0.086 | 7.897 | 6.977 | n/a | 0.051 | 4.915 | 0.186 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000020d | 25.637 | 3.776 | 0.182 | 0.242 | 0.042 | 1.495 | 7.898 | 0.050 | n/a | 0.585 | 8.818 | 2.530 | n/a | 0.021 | 4.241 | 0.165 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000205 | 25.375 | 3.299 | 0.194 | 0.246 | 0.061 | 1.574 | 11.063 | 0.034 | n/a | 0.160 | 5.458 | 3.254 | n/a | 0.031 | 3.800 | 0.150 | 0.031 | gw-w/thread-43/gateway.admitted-work | none observed |
| 7a22ae566c88fadb00000000000001ce | 25.183 | 2.111 | n/a | 0.000 | 0.838 | 0.872 | 1.219 | 0.023 | n/a | 0.341 | 10.833 | 8.913 | n/a | 0.033 | 2.949 | 0.117 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 7a22ae566c88fadb00000000000001d2 | 23.792 | 3.867 | n/a | 0.000 | 0.808 | 1.259 | 1.411 | 0.029 | n/a | 0.141 | 12.432 | 3.812 | n/a | 0.033 | 4.675 | 0.197 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.080 | 0.000 | 0.000 | 0.454 | 2.120 | n/a | 0.000 | 0.450 | 0.772 | 1.249 | 0.023 | n/a | 0.164 | 7.158 | 3.362 | n/a | 0.028 | 2.516 | 0.192 | 0.028 |
| p99 | 55.859 | 1.005 | 0.000 | 0.716 | 3.867 | n/a | 0.000 | 1.130 | 3.902 | 2.739 | 0.054 | n/a | 0.755 | 48.841 | 8.913 | n/a | 0.063 | 4.675 | 0.294 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000001f5 | 55.859 | 2.120 | n/a | 0.000 | 0.104 | 0.895 | 1.360 | 0.023 | n/a | 0.188 | 48.841 | 2.300 | n/a | 0.027 | 2.224 | 0.040 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 7a22ae566c88fadb00000000000001cc | 26.515 | 1.852 | n/a | 0.000 | 1.001 | 3.902 | 1.197 | 0.019 | n/a | 0.115 | 13.989 | 4.414 | n/a | 0.026 | 2.853 | 0.108 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001ce | 25.183 | 2.111 | n/a | 0.000 | 0.838 | 0.872 | 1.219 | 0.023 | n/a | 0.341 | 10.833 | 8.913 | n/a | 0.033 | 2.949 | 0.117 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 7a22ae566c88fadb00000000000001d2 | 23.792 | 3.867 | n/a | 0.000 | 0.808 | 1.259 | 1.411 | 0.029 | n/a | 0.141 | 12.432 | 3.812 | n/a | 0.033 | 4.675 | 0.197 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 7a22ae566c88fadb0000000000000210 | 18.643 | 3.564 | n/a | 0.000 | 0.944 | 0.772 | 2.739 | 0.023 | n/a | 0.134 | 6.536 | 3.869 | n/a | 0.063 | 4.508 | 0.242 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001db | 18.186 | 2.360 | n/a | 0.000 | 1.130 | 0.958 | 2.690 | 0.022 | n/a | 0.101 | 7.747 | 3.136 | n/a | 0.042 | 3.490 | 0.192 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001e9 | 16.891 | 2.054 | n/a | 0.000 | 0.289 | 0.723 | 1.326 | 0.023 | n/a | 0.164 | 7.158 | 5.126 | n/a | 0.028 | 2.343 | 0.139 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 7a22ae566c88fadb0000000000000203 | 16.080 | 1.903 | n/a | 0.000 | 0.388 | 0.388 | 1.249 | 0.023 | n/a | 0.165 | 8.465 | 3.481 | n/a | 0.018 | 2.291 | 0.142 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 7a22ae566c88fadb00000000000001e2 | 16.073 | 2.261 | n/a | 0.000 | 0.255 | 0.756 | 2.256 | 0.054 | n/a | 0.276 | 6.574 | 3.617 | n/a | 0.024 | 2.516 | 0.157 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001fe | 14.253 | 3.290 | n/a | 0.000 | 0.450 | 0.833 | 1.121 | 0.021 | n/a | 0.161 | 5.108 | 3.226 | n/a | 0.043 | 3.740 | 0.262 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000001e4 | 12.861 | 1.751 | n/a | 0.000 | 0.679 | 0.658 | 1.135 | 0.020 | n/a | 0.131 | 5.097 | 3.362 | n/a | 0.029 | 2.430 | 0.189 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000020b | 12.069 | 1.944 | n/a | 0.000 | 0.432 | 0.632 | 1.109 | 0.023 | n/a | 0.115 | 7.239 | 0.555 | n/a | 0.021 | 2.375 | 0.197 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| 7a22ae566c88fadb00000000000001e7 | 10.604 | 2.479 | n/a | 0.000 | 0.635 | 0.913 | 1.180 | 0.034 | n/a | 0.220 | 4.566 | 0.548 | n/a | 0.028 | 3.114 | 0.294 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000206 | 10.414 | 2.323 | n/a | 0.000 | 0.189 | 0.769 | 1.289 | 0.019 | n/a | 0.755 | 4.555 | 0.491 | n/a | 0.023 | 2.513 | 0.241 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000021b | 8.198 | 1.798 | n/a | 0.000 | 0.322 | 0.520 | 1.005 | 0.020 | n/a | 0.514 | 3.467 | 0.521 | n/a | 0.032 | 2.120 | 0.259 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.098 | 0.283 | 0.000 | 0.482 | 3.316 | n/a | 0.000 | 0.319 | 1.095 | 3.473 | 0.024 | n/a | 0.185 | 6.988 | 2.967 | n/a | 0.024 | 3.779 | 0.182 | 0.024 |
| p99 | 58.737 | 2.851 | 0.000 | 1.670 | 6.461 | n/a | 0.397 | 1.119 | 4.841 | 33.746 | 0.381 | n/a | 4.134 | 48.819 | 11.460 | n/a | 0.059 | 7.229 | 0.346 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000237 | 58.737 | 4.542 | 0.234 | 0.392 | 0.102 | 1.235 | 2.326 | 0.023 | n/a | 0.109 | 48.819 | 0.909 | n/a | 0.045 | 5.271 | 0.090 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000243 | 57.986 | 6.412 | 0.207 | 0.246 | 0.074 | 1.799 | 33.746 | 0.036 | n/a | 0.875 | 11.188 | 3.371 | n/a | 0.031 | 6.940 | 0.120 | 0.031 | gw-w/thread-42/gateway.admitted-work | none observed |
| 7a22ae566c88fadb0000000000000238 | 54.099 | 2.388 | n/a | 0.000 | 0.879 | 0.458 | 4.036 | 0.035 | n/a | 0.520 | 44.163 | 1.601 | n/a | 0.018 | 3.268 | 0.060 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000231 | 45.317 | 4.915 | 0.224 | 0.397 | 0.041 | 1.746 | 26.535 | 0.052 | n/a | 0.099 | 6.810 | 4.476 | n/a | 0.021 | 5.577 | 0.123 | 0.021 | gw-w/thread-44/gateway.admitted-work | none observed |
| 7a22ae566c88fadb0000000000000247 | 40.835 | 4.048 | n/a | 0.000 | 0.539 | 3.525 | 4.550 | 0.020 | n/a | 2.832 | 24.580 | 0.691 | n/a | 0.049 | 4.587 | 0.112 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.217ms |
| 7a22ae566c88fadb000000000000024d | 39.688 | 3.430 | 0.265 | 0.262 | 0.043 | 1.221 | 12.006 | 0.039 | n/a | 0.100 | 12.764 | 9.533 | n/a | 0.024 | 4.001 | 0.101 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000233 | 33.135 | 6.461 | 0.430 | 0.292 | 0.046 | 1.578 | 7.242 | 0.027 | n/a | 0.540 | 7.781 | 8.712 | n/a | 0.026 | 7.229 | 0.218 | 0.026 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb0000000000000248 | 31.988 | 1.842 | n/a | 0.000 | 0.851 | 3.277 | 1.467 | 0.008 | n/a | 0.030 | 17.194 | 7.300 | n/a | 0.018 | 2.693 | 0.084 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000265 | 30.925 | 3.791 | 0.226 | 0.325 | 0.061 | 1.586 | 7.569 | 0.029 | n/a | 0.098 | 9.027 | 8.185 | n/a | 0.030 | 4.402 | 0.142 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000022a | 30.519 | 4.366 | 0.166 | 0.374 | 0.033 | 1.134 | 5.135 | 0.021 | n/a | 0.473 | 7.343 | 11.460 | n/a | 0.015 | 4.938 | 0.162 | 0.015 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb000000000000023d | 30.254 | 3.514 | 0.185 | 0.235 | 0.045 | 1.305 | 12.613 | 0.024 | n/a | 0.417 | 8.607 | 3.286 | n/a | 0.023 | 3.979 | 0.132 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000245 | 28.354 | 3.611 | 0.174 | 0.331 | 0.054 | 2.006 | 7.687 | 0.055 | n/a | 0.965 | 11.207 | 2.231 | n/a | 0.034 | 4.169 | 0.147 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000251 | 27.841 | 3.460 | 0.158 | 0.267 | 0.041 | 1.521 | 8.359 | 0.059 | n/a | 0.185 | 11.478 | 2.293 | n/a | 0.021 | 3.925 | 0.141 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000241 | 27.603 | 4.269 | 0.309 | 0.345 | 0.038 | 1.806 | 9.048 | 0.030 | n/a | 0.141 | 5.678 | 5.915 | n/a | 0.024 | 4.961 | 0.180 | 0.024 | gw-w/thread-40/gateway.admitted-work | none observed |
| 7a22ae566c88fadb000000000000021f | 26.666 | 4.098 | 0.353 | 0.315 | 0.052 | 1.694 | 6.417 | 0.381 | n/a | 0.127 | 6.988 | 6.210 | n/a | 0.030 | 4.818 | 0.181 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000022c | 26.627 | 1.921 | n/a | 0.000 | 0.132 | 0.717 | 1.521 | 0.021 | n/a | 0.977 | 14.014 | 7.306 | n/a | 0.019 | 2.053 | 0.077 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000026c | 26.143 | 2.110 | n/a | 0.000 | 1.119 | 0.746 | 1.582 | 0.023 | n/a | 0.125 | 15.552 | 4.862 | n/a | 0.025 | 3.228 | 0.123 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000259 | 25.607 | 4.502 | n/a | 0.000 | 0.970 | 0.965 | 3.473 | 0.035 | n/a | 4.134 | 7.453 | 4.060 | n/a | 0.017 | 5.472 | 0.214 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000226 | 23.455 | 3.617 | n/a | 0.000 | 0.983 | 0.992 | 5.098 | 0.024 | n/a | 0.108 | 8.206 | 4.394 | n/a | 0.032 | 4.600 | 0.196 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000276 | 23.191 | 3.339 | 0.202 | 0.000 | 0.090 | 1.391 | 7.928 | 0.031 | n/a | 0.102 | 5.874 | 4.195 | n/a | 0.039 | 3.631 | 0.157 | 0.039 | gw-w/thread-43/gateway.admitted-work | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.891 | 0.119 | 0.000 | 0.474 | 2.475 | n/a | 0.000 | 0.554 | 0.764 | 1.400 | 0.021 | n/a | 0.331 | 6.321 | 0.651 | n/a | 0.022 | 3.228 | 0.248 | 0.022 |
| p99 | 31.988 | 1.855 | 0.000 | 1.608 | 4.587 | n/a | 0.000 | 1.119 | 4.841 | 6.931 | 0.064 | n/a | 3.521 | 17.194 | 7.306 | n/a | 0.059 | 5.043 | 0.346 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000248 | 31.988 | 1.842 | n/a | 0.000 | 0.851 | 3.277 | 1.467 | 0.008 | n/a | 0.030 | 17.194 | 7.300 | n/a | 0.018 | 2.693 | 0.084 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000022c | 26.627 | 1.921 | n/a | 0.000 | 0.132 | 0.717 | 1.521 | 0.021 | n/a | 0.977 | 14.014 | 7.306 | n/a | 0.019 | 2.053 | 0.077 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000026c | 26.143 | 2.110 | n/a | 0.000 | 1.119 | 0.746 | 1.582 | 0.023 | n/a | 0.125 | 15.552 | 4.862 | n/a | 0.025 | 3.228 | 0.123 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000234 | 20.951 | 2.047 | n/a | 0.000 | 0.318 | 1.293 | 1.838 | 0.036 | n/a | 0.963 | 8.799 | 5.640 | n/a | 0.018 | 2.364 | 0.113 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000220 | 20.341 | 4.587 | n/a | 0.000 | 0.456 | 4.841 | 4.209 | 0.057 | n/a | 3.521 | 2.440 | 0.209 | n/a | 0.019 | 5.043 | 0.248 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.057ms |
| 7a22ae566c88fadb0000000000000228 | 17.990 | 2.475 | n/a | 0.000 | 0.346 | 1.710 | 1.361 | 0.019 | n/a | 0.405 | 9.357 | 2.279 | n/a | 0.037 | 2.821 | 0.157 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000027e | 17.259 | 1.827 | n/a | 0.000 | 0.522 | 0.558 | 4.287 | 0.025 | n/a | 0.135 | 9.296 | 0.578 | n/a | 0.029 | 2.349 | 0.136 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000025c | 16.730 | 1.822 | n/a | 0.000 | 0.854 | 0.604 | 1.195 | 0.021 | n/a | 0.486 | 11.123 | 0.606 | n/a | 0.020 | 2.676 | 0.160 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000267 | 15.891 | 3.864 | n/a | 0.000 | 0.319 | 1.434 | 6.931 | 0.064 | n/a | 0.181 | 2.780 | 0.298 | n/a | 0.021 | 4.182 | 0.263 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000262 | 14.078 | 3.847 | n/a | 0.000 | 0.834 | 2.324 | 0.999 | 0.018 | n/a | 0.090 | 5.456 | 0.466 | n/a | 0.044 | 4.681 | 0.333 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000027a | 13.878 | 3.087 | n/a | 0.000 | 0.509 | 1.307 | 1.400 | 0.030 | n/a | 0.217 | 6.645 | 0.651 | n/a | 0.032 | 3.595 | 0.259 | 0.032 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000023e | 13.712 | 2.693 | n/a | 0.000 | 0.750 | 1.007 | 2.098 | 0.044 | n/a | 0.773 | 5.309 | 1.016 | n/a | 0.022 | 3.443 | 0.251 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000274 | 12.706 | 2.817 | n/a | 0.000 | 0.632 | 0.571 | 1.091 | 0.018 | n/a | 0.089 | 6.321 | 1.108 | n/a | 0.059 | 3.449 | 0.271 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 7a22ae566c88fadb0000000000000224 | 12.648 | 3.283 | n/a | 0.000 | 0.994 | 0.626 | 1.363 | 0.016 | n/a | 0.331 | 4.067 | 1.934 | n/a | 0.035 | 4.277 | 0.338 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000252 | 10.474 | 2.635 | n/a | 0.000 | 0.554 | 0.764 | 1.312 | 0.019 | n/a | 0.375 | 4.261 | 0.514 | n/a | 0.040 | 3.189 | 0.304 | 0.040 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000025e | 9.370 | 2.279 | n/a | 0.000 | 0.965 | 0.650 | 0.893 | 0.018 | n/a | 0.372 | 3.651 | 0.531 | n/a | 0.012 | 3.243 | 0.346 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.397 | 0.313 | 0.000 | 0.509 | 3.520 | n/a | 0.000 | 0.283 | 1.229 | 2.440 | 0.031 | n/a | 0.196 | 6.408 | 2.728 | n/a | 0.027 | 3.973 | 0.231 | 0.027 |
| p99 | 56.193 | 1.938 | 0.229 | 1.694 | 7.944 | n/a | 0.340 | 1.110 | 8.265 | 23.712 | 0.092 | n/a | 1.563 | 11.019 | n/a | n/a | 0.126 | 27.477 | 0.586 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000292 | 56.193 | 3.957 | 0.236 | 0.340 | 0.045 | 1.687 | 23.712 | 0.092 | n/a | 0.229 | 11.019 | 14.856 | n/a | 0.021 | 4.577 | 0.081 | 0.021 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000002b8 | 46.924 | 4.034 | 23.379 | 0.000 | 0.064 | 2.944 | 6.346 | 0.026 | n/a | 0.104 | 5.341 | 4.664 | n/a | 0.021 | 27.477 | 0.586 | 0.021 | node-14/thread-0/rpc.probe.transact | none observed |
| 7a22ae566c88fadb0000000000000298 | 40.232 | 3.401 | 0.193 | 0.000 | 0.071 | 1.305 | 18.809 | 0.023 | n/a | 0.104 | 8.997 | 7.293 | n/a | 0.035 | 3.665 | 0.091 | 0.035 | gw-w/thread-43/gateway.admitted-work | none observed |
| 7a22ae566c88fadb000000000000029a | 35.433 | 3.672 | 0.223 | 0.000 | 0.053 | 1.559 | 16.070 | 0.051 | n/a | 0.170 | 6.730 | 6.872 | n/a | 0.034 | 3.949 | 0.111 | 0.034 | gw-w/thread-46/gateway.admitted-work | none observed |
| 7a22ae566c88fadb00000000000002a8 | 31.163 | 7.944 | 0.313 | 0.000 | 0.117 | 1.933 | 8.562 | 0.031 | n/a | 0.087 | 8.421 | 3.697 | n/a | 0.056 | 8.375 | 0.269 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002d5 | 28.030 | 4.414 | 0.375 | 0.000 | 0.137 | 1.121 | 5.141 | 0.026 | n/a | 0.101 | 6.322 | 10.343 | n/a | 0.050 | 4.925 | 0.176 | 0.050 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000002c0 | 27.365 | 3.340 | 0.189 | 0.000 | 0.208 | 1.640 | 11.799 | 0.062 | n/a | 0.158 | 6.340 | 3.503 | n/a | 0.126 | 3.736 | 0.137 | 0.126 | gw-w/thread-42/gateway.admitted-work | none observed |
| 7a22ae566c88fadb00000000000002b4 | 27.178 | 4.229 | 0.343 | 0.000 | 0.068 | 2.243 | 8.637 | 0.030 | n/a | 0.124 | 7.978 | 3.492 | n/a | 0.034 | 4.639 | 0.171 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002a4 | 26.081 | 4.013 | 0.370 | 0.000 | 0.061 | 1.767 | 5.722 | 0.059 | n/a | 0.217 | 6.699 | 7.148 | n/a | 0.024 | 4.444 | 0.170 | 0.024 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000002ac | 24.879 | 3.674 | 0.250 | 0.000 | 0.048 | 1.458 | 6.033 | 0.048 | n/a | 0.708 | 5.541 | 7.098 | n/a | 0.021 | 3.973 | 0.160 | 0.021 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000002cf | 24.334 | 3.520 | 0.345 | 0.000 | 0.207 | 1.488 | 5.627 | 0.032 | n/a | 0.125 | 6.822 | 6.095 | n/a | 0.072 | 4.072 | 0.167 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002d7 | 23.049 | 3.891 | 0.311 | 0.000 | 0.049 | 1.636 | 5.710 | 0.028 | n/a | 1.563 | 7.248 | 2.586 | n/a | 0.026 | 4.251 | 0.184 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002bd | 23.013 | 4.009 | n/a | 0.000 | 0.802 | 0.883 | 1.464 | 0.021 | n/a | 0.458 | 7.177 | 8.156 | n/a | 0.045 | 4.810 | 0.209 | 0.045 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb0000000000000290 | 22.417 | 4.015 | n/a | 0.000 | 0.874 | 0.882 | 2.208 | 0.041 | n/a | 0.248 | 9.751 | 4.377 | n/a | 0.021 | 4.888 | 0.218 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002b2 | 21.965 | 3.117 | 0.200 | 0.000 | 0.085 | 1.010 | 5.243 | 0.024 | n/a | 0.108 | 5.711 | 6.436 | n/a | 0.032 | 3.402 | 0.155 | 0.032 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb0000000000000289 | 19.206 | 3.115 | n/a | 0.000 | 0.391 | 0.842 | 1.346 | 0.030 | n/a | 0.204 | 7.707 | 5.539 | n/a | 0.032 | 3.506 | 0.183 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000287 | 18.991 | 3.022 | 0.223 | 0.000 | 0.133 | 1.001 | 5.218 | 0.028 | n/a | 0.095 | 5.192 | 4.027 | n/a | 0.052 | 3.379 | 0.178 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002b6 | 18.641 | 2.205 | n/a | 0.000 | 1.000 | 1.277 | 2.440 | 0.060 | n/a | 1.007 | 9.653 | 0.957 | n/a | 0.043 | 3.205 | 0.172 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000028b | 18.632 | 3.754 | 0.193 | 0.000 | 0.088 | 1.423 | 4.515 | 0.051 | n/a | 0.329 | 7.665 | 0.567 | n/a | 0.046 | 4.035 | 0.217 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002bc | 18.597 | 3.134 | 0.211 | 0.000 | 0.045 | 1.137 | 5.014 | 0.055 | n/a | 0.688 | 4.957 | 3.337 | n/a | 0.020 | 3.389 | 0.182 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.614 | 0.470 | 0.000 | 0.502 | 2.742 | n/a | 0.000 | 0.923 | 0.883 | 1.606 | 0.032 | n/a | 0.196 | 5.911 | 1.217 | n/a | 0.027 | 3.491 | 0.247 | 0.027 |
| p99 | 23.013 | 1.365 | 0.000 | 1.125 | 4.392 | n/a | 0.000 | 1.110 | 8.265 | 4.652 | 0.060 | n/a | 1.007 | 9.653 | n/a | n/a | 0.083 | 5.375 | 0.340 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000002bd | 23.013 | 4.009 | n/a | 0.000 | 0.802 | 0.883 | 1.464 | 0.021 | n/a | 0.458 | 7.177 | 8.156 | n/a | 0.045 | 4.810 | 0.209 | 0.045 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb00000000000002b6 | 18.641 | 2.205 | n/a | 0.000 | 1.000 | 1.277 | 2.440 | 0.060 | n/a | 1.007 | 9.653 | 0.957 | n/a | 0.043 | 3.205 | 0.172 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002ba | 18.454 | 3.683 | n/a | 0.000 | 0.594 | 1.229 | 4.652 | 0.020 | n/a | 0.081 | 7.445 | 0.726 | n/a | 0.024 | 4.277 | 0.232 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms |
| 7a22ae566c88fadb00000000000002a2 | 17.732 | 4.392 | n/a | 0.000 | 0.984 | 1.343 | 1.793 | 0.032 | n/a | 0.479 | 5.911 | 2.723 | n/a | 0.076 | 5.375 | 0.303 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002cc | 15.682 | 2.938 | n/a | 0.000 | 0.923 | 8.265 | 3.473 | 0.014 | n/a | 0.042 | 0.000 | n/a | n/a | 0.027 | 3.861 | 0.246 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| 7a22ae566c88fadb00000000000002a5 | 15.648 | 2.960 | n/a | 0.000 | 1.110 | 1.194 | 2.085 | 0.044 | n/a | 0.142 | 6.433 | 1.655 | n/a | 0.027 | 4.069 | 0.260 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000284 | 14.900 | 3.758 | n/a | 0.000 | 0.283 | 1.238 | 1.417 | 0.032 | n/a | 0.201 | 7.243 | 0.645 | n/a | 0.083 | 4.041 | 0.271 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002c1 | 13.614 | 3.196 | n/a | 0.000 | 0.522 | 0.846 | 1.198 | 0.024 | n/a | 0.096 | 6.408 | 1.295 | n/a | 0.027 | 3.718 | 0.273 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002c8 | 13.475 | 2.012 | n/a | 0.000 | 0.650 | 0.780 | 1.762 | 0.042 | n/a | 0.218 | 5.702 | 2.286 | n/a | 0.023 | 2.662 | 0.198 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000029e | 12.688 | 2.742 | n/a | 0.000 | 0.388 | 0.951 | 1.606 | 0.045 | n/a | 0.537 | 5.149 | 1.217 | n/a | 0.052 | 3.131 | 0.247 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb000000000000029b | 12.641 | 1.919 | n/a | 0.000 | 1.037 | 0.530 | 1.416 | 0.019 | n/a | 0.138 | 6.820 | 0.740 | n/a | 0.022 | 2.956 | 0.234 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000293 | 11.812 | 2.183 | n/a | 0.000 | 0.173 | 0.726 | 2.013 | 0.033 | n/a | 0.133 | 5.518 | 1.008 | n/a | 0.025 | 2.356 | 0.199 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002ae | 11.670 | 2.501 | n/a | 0.000 | 0.990 | 0.600 | 0.893 | 0.023 | n/a | 0.408 | 3.970 | 2.266 | n/a | 0.019 | 3.491 | 0.299 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000281 | 10.442 | 1.886 | n/a | 0.000 | 1.083 | 0.546 | 1.190 | 0.047 | n/a | 0.196 | 4.743 | 0.729 | n/a | 0.021 | 2.969 | 0.284 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000002c5 | 10.239 | 2.523 | n/a | 0.000 | 0.955 | 0.755 | 0.811 | 0.016 | n/a | 0.081 | 4.429 | 0.638 | n/a | 0.031 | 3.478 | 0.340 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.864ms; driver.reader-basis.broadcast 0.077ms |

## P2 / L1024 / commit (837 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.306 | 0.281 | 0.000 | 0.519 | 2.205 | n/a | 0.000 | 0.660 | 0.662 | 1.022 | 0.012 | n/a | 0.112 | 5.018 | 0.846 | n/a | 0.017 | 3.005 | 0.249 | 0.017 |
| p99 | 53.143 | 2.010 | 0.024 | 2.065 | 6.639 | n/a | 0.000 | 12.397 | 8.592 | 10.946 | 0.052 | n/a | 3.601 | 31.833 | 10.991 | n/a | 0.053 | 16.477 | 0.650 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000374 | 79.621 | 1.097 | n/a | 0.000 | 60.980 | 0.759 | 0.689 | 0.067 | n/a | 0.283 | 14.882 | 0.855 | n/a | 0.009 | 62.077 | 0.780 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb00000000000002e1 | 72.813 | 5.578 | n/a | 0.000 | 0.926 | 5.987 | 8.900 | 0.079 | n/a | 0.347 | 48.700 | 2.276 | n/a | 0.019 | 6.505 | 0.089 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000373 | 62.655 | 1.877 | n/a | 0.000 | 26.775 | 1.927 | 1.263 | 0.017 | n/a | 3.456 | 21.327 | 6.001 | n/a | 0.010 | 28.652 | 0.457 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb0000000000000369 | 60.855 | 2.340 | n/a | 0.000 | 27.100 | 2.710 | 1.178 | 0.016 | n/a | 0.370 | 21.005 | 6.121 | n/a | 0.014 | 29.439 | 0.484 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.873ms; driver.publication.persist-deferred 0.801ms |
| 7a22ae566c88fadb0000000000000353 | 60.628 | 4.428 | n/a | 0.000 | 0.320 | 12.288 | 2.428 | 0.038 | n/a | 0.229 | 39.544 | 1.323 | n/a | 0.030 | 4.747 | 0.078 | 0.030 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.468ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.047ms |
| 7a22ae566c88fadb0000000000000352 | 59.268 | 3.345 | n/a | 0.000 | 0.461 | 0.522 | 0.732 | 0.010 | n/a | 2.144 | 15.518 | 36.518 | n/a | 0.017 | 3.806 | 0.064 | 0.017 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 4.468ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.047ms |
| 7a22ae566c88fadb0000000000000372 | 57.102 | 2.975 | 0.136 | 0.000 | 0.038 | 2.387 | 14.479 | 0.045 | n/a | 0.096 | 26.527 | 10.400 | n/a | 0.019 | 3.149 | 0.055 | 0.019 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb0000000000000552 | 56.113 | 15.661 | n/a | 0.000 | 0.816 | 8.013 | 12.590 | 0.052 | n/a | 1.419 | 14.119 | 3.424 | n/a | 0.018 | 16.477 | 0.294 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.172ms; driver.publication.persist-deferred 1.013ms |
| 7a22ae566c88fadb000000000000035c | 53.143 | 3.449 | n/a | 0.000 | 0.323 | 17.228 | 1.146 | 0.419 | n/a | 0.077 | 22.293 | 8.200 | n/a | 0.008 | 3.771 | 0.071 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.927ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb0000000000000818 | 50.073 | 2.424 | n/a | 0.000 | 32.218 | 0.976 | 0.807 | 0.014 | n/a | 0.066 | 12.399 | 1.149 | n/a | 0.019 | 34.642 | 0.692 | 0.019 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.649ms; driver.publication.persist-deferred 1.293ms; driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 0.937ms; driver.publication.persist-deferred 0.853ms |
| 7a22ae566c88fadb000000000000036d | 47.498 | 2.611 | n/a | 0.000 | 0.309 | 0.569 | 1.572 | 0.016 | n/a | 2.520 | 36.886 | 3.009 | n/a | 0.007 | 2.920 | 0.061 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.873ms; driver.publication.persist-deferred 0.737ms; driver.reader-basis.broadcast 0.041ms |
| 7a22ae566c88fadb0000000000000356 | 46.752 | 1.580 | n/a | 0.000 | 0.903 | 6.117 | 0.824 | 0.016 | n/a | 2.307 | 34.669 | 0.315 | n/a | 0.021 | 2.483 | 0.053 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.960ms; driver.reader-basis.broadcast 0.047ms |
| 7a22ae566c88fadb00000000000004eb | 46.631 | 1.914 | n/a | 0.000 | 0.869 | 0.518 | 1.467 | 0.016 | n/a | 0.438 | 32.924 | 8.474 | n/a | 0.012 | 2.783 | 0.060 | 0.012 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.862ms; driver.reader-basis.broadcast 0.142ms |
| 7a22ae566c88fadb0000000000000358 | 46.498 | 3.104 | n/a | 0.000 | 0.312 | 10.826 | 2.897 | 0.019 | n/a | 0.070 | 28.795 | 0.443 | n/a | 0.031 | 3.416 | 0.073 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb000000000000038f | 45.332 | 2.755 | n/a | 0.000 | 0.987 | 2.540 | 4.492 | 0.007 | n/a | 2.928 | 25.275 | 6.342 | n/a | 0.007 | 3.742 | 0.083 | 0.007 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.179ms |
| 7a22ae566c88fadb000000000000077d | 44.522 | 4.241 | n/a | 0.000 | 4.032 | 0.592 | 1.244 | 0.012 | n/a | 0.092 | 33.394 | 0.901 | n/a | 0.015 | 8.273 | 0.186 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.477ms |
| 7a22ae566c88fadb0000000000000357 | 44.441 | 2.010 | n/a | 0.000 | 0.059 | 6.214 | 0.755 | 0.010 | n/a | 0.036 | 34.840 | 0.508 | n/a | 0.009 | 2.069 | 0.047 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.960ms |
| 7a22ae566c88fadb000000000000081e | 43.315 | 8.250 | n/a | 0.000 | 4.328 | 3.503 | 2.842 | 0.048 | n/a | 4.745 | 17.834 | 1.736 | n/a | 0.028 | 12.579 | 0.290 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.649ms; driver.publication.persist-deferred 1.293ms; driver.publication.persist-deferred 0.937ms; driver.publication.persist-deferred 0.853ms; driver.publication.persist-deferred 0.833ms |
| 7a22ae566c88fadb00000000000007c0 | 42.687 | 4.375 | n/a | 0.000 | 1.008 | 0.512 | 1.281 | 0.012 | n/a | 0.115 | 34.108 | 1.256 | n/a | 0.021 | 5.383 | 0.126 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.116ms |
| 7a22ae566c88fadb000000000000077e | 41.206 | 2.404 | n/a | 0.000 | 0.023 | 5.227 | 0.743 | 0.007 | n/a | 0.045 | 31.833 | 0.916 | n/a | 0.010 | 2.427 | 0.059 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.494ms; driver.expected-state.bind-receipt 1.198ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.753 | 0.000 | 0.000 | 0.407 | 1.728 | n/a | 0.000 | 0.688 | 0.645 | 0.887 | 0.012 | n/a | 0.120 | 4.723 | 0.617 | n/a | 0.017 | 2.559 | 0.229 | 0.017 |
| p99 | 47.498 | 1.761 | 0.015 | 0.866 | 4.666 | n/a | 0.000 | 12.280 | 9.056 | 5.616 | 0.067 | n/a | 3.601 | 29.276 | 10.991 | n/a | 0.053 | 13.726 | 0.692 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb0000000000000374 | 79.621 | 1.097 | n/a | 0.000 | 60.980 | 0.759 | 0.689 | 0.067 | n/a | 0.283 | 14.882 | 0.855 | n/a | 0.009 | 62.077 | 0.780 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.992ms; driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb00000000000002e1 | 72.813 | 5.578 | n/a | 0.000 | 0.926 | 5.987 | 8.900 | 0.079 | n/a | 0.347 | 48.700 | 2.276 | n/a | 0.019 | 6.505 | 0.089 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000352 | 59.268 | 3.345 | n/a | 0.000 | 0.461 | 0.522 | 0.732 | 0.010 | n/a | 2.144 | 15.518 | 36.518 | n/a | 0.017 | 3.806 | 0.064 | 0.017 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 4.468ms; driver.publication.persist-deferred 0.917ms; driver.reader-basis.broadcast 0.047ms |
| 7a22ae566c88fadb0000000000000818 | 50.073 | 2.424 | n/a | 0.000 | 32.218 | 0.976 | 0.807 | 0.014 | n/a | 0.066 | 12.399 | 1.149 | n/a | 0.019 | 34.642 | 0.692 | 0.019 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.649ms; driver.publication.persist-deferred 1.293ms; driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 0.937ms; driver.publication.persist-deferred 0.853ms |
| 7a22ae566c88fadb000000000000036d | 47.498 | 2.611 | n/a | 0.000 | 0.309 | 0.569 | 1.572 | 0.016 | n/a | 2.520 | 36.886 | 3.009 | n/a | 0.007 | 2.920 | 0.061 | 0.007 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.936ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.873ms; driver.publication.persist-deferred 0.737ms; driver.reader-basis.broadcast 0.041ms |
| 7a22ae566c88fadb0000000000000356 | 46.752 | 1.580 | n/a | 0.000 | 0.903 | 6.117 | 0.824 | 0.016 | n/a | 2.307 | 34.669 | 0.315 | n/a | 0.021 | 2.483 | 0.053 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.960ms; driver.reader-basis.broadcast 0.047ms |
| 7a22ae566c88fadb0000000000000358 | 46.498 | 3.104 | n/a | 0.000 | 0.312 | 10.826 | 2.897 | 0.019 | n/a | 0.070 | 28.795 | 0.443 | n/a | 0.031 | 3.416 | 0.073 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb00000000000004ea | 38.224 | 1.800 | n/a | 0.000 | 0.726 | 0.573 | 0.906 | 0.012 | n/a | 0.361 | 27.845 | 5.986 | n/a | 0.015 | 2.526 | 0.066 | 0.015 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.142ms |
| 7a22ae566c88fadb000000000000036c | 37.690 | 1.687 | n/a | 0.000 | 0.264 | 2.738 | 2.486 | 0.033 | n/a | 0.074 | 19.406 | 10.991 | n/a | 0.011 | 1.951 | 0.052 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.873ms; driver.publication.persist-deferred 0.737ms; driver.reader-basis.broadcast 0.041ms |
| 7a22ae566c88fadb00000000000004ec | 35.675 | 1.550 | n/a | 0.000 | 1.111 | 2.310 | 0.796 | 0.013 | n/a | 0.143 | 29.276 | 0.454 | n/a | 0.022 | 2.661 | 0.075 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.071ms; driver.publication.persist-deferred 0.862ms; driver.reader-basis.broadcast 0.142ms |
| 7a22ae566c88fadb000000000000059a | 35.096 | 1.078 | n/a | 0.000 | 0.429 | 1.922 | 0.900 | 0.015 | n/a | 0.103 | 30.234 | 0.408 | n/a | 0.007 | 1.507 | 0.043 | 0.007 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.299ms; driver.publication.persist-deferred 0.906ms; driver.reader-basis.broadcast 0.168ms |
| 7a22ae566c88fadb000000000000035b | 33.311 | 1.948 | n/a | 0.000 | 0.132 | 2.093 | 5.180 | 0.038 | n/a | 0.512 | 22.523 | 0.871 | n/a | 0.014 | 2.079 | 0.062 | 0.014 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.927ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb000000000000038e | 33.288 | 1.841 | n/a | 0.000 | 0.051 | 0.641 | 4.434 | 0.014 | n/a | 3.969 | 15.125 | 7.199 | n/a | 0.014 | 1.892 | 0.057 | 0.014 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb0000000000000359 | 32.951 | 1.623 | n/a | 0.000 | 1.078 | 5.296 | 0.918 | 0.014 | n/a | 0.235 | 13.404 | 10.364 | n/a | 0.019 | 2.701 | 0.082 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.740ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.917ms |
| 7a22ae566c88fadb0000000000000599 | 32.884 | 1.675 | n/a | 0.000 | 0.701 | 0.604 | 1.250 | 0.017 | n/a | 0.473 | 23.404 | 4.737 | n/a | 0.022 | 2.376 | 0.072 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.168ms |
| 7a22ae566c88fadb00000000000003d3 | 32.392 | 3.030 | n/a | 0.000 | 1.619 | 7.281 | 1.104 | 0.027 | n/a | 0.053 | 16.729 | 2.529 | n/a | 0.020 | 4.649 | 0.144 | 0.020 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.031ms; driver.publication.persist-deferred 0.951ms |
| 7a22ae566c88fadb0000000000000375 | 32.067 | 1.718 | n/a | 0.000 | 0.870 | 0.395 | 0.903 | 0.027 | n/a | 0.101 | 17.167 | 10.873 | n/a | 0.014 | 2.588 | 0.081 | 0.014 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.367ms; driver.publication.persist-deferred 0.936ms |
| 7a22ae566c88fadb000000000000042e | 30.330 | 3.277 | n/a | 0.000 | 2.341 | 1.222 | 1.073 | 0.014 | n/a | 0.813 | 15.277 | 6.286 | n/a | 0.027 | 5.618 | 0.185 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.225ms; driver.publication.persist-deferred 1.097ms |
| 7a22ae566c88fadb000000000000066e | 30.277 | 1.828 | n/a | 0.000 | 0.608 | 0.382 | 0.737 | 0.010 | n/a | 0.081 | 21.221 | 5.388 | n/a | 0.023 | 2.436 | 0.080 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.058ms |
| 7a22ae566c88fadb0000000000000367 | 29.727 | 1.116 | n/a | 0.000 | 0.625 | 2.343 | 0.552 | 0.008 | n/a | 0.042 | 24.163 | 0.868 | n/a | 0.010 | 1.740 | 0.059 | 0.010 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.873ms; driver.publication.persist-deferred 0.801ms; driver.publication.persist-deferred 0.731ms |

## P2 / tail / commit (2631 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.809 | 0.099 | 0.000 | 0.492 | 2.146 | n/a | 0.000 | 0.694 | 0.560 | 0.919 | 0.012 | n/a | 0.088 | 4.116 | 0.739 | n/a | 0.013 | 2.990 | 0.287 | 0.013 |
| p99 | 41.071 | 2.012 | 0.032 | 2.012 | 6.630 | n/a | 0.000 | 11.932 | 6.677 | 5.514 | 0.044 | n/a | 2.059 | 22.157 | 6.772 | n/a | 0.042 | 14.685 | 0.658 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000018ab | 68.137 | 2.181 | n/a | 0.000 | 0.267 | 0.433 | 1.246 | 0.029 | n/a | 0.151 | 36.284 | 27.534 | n/a | 0.012 | 2.448 | 0.036 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000018af | 62.743 | 4.410 | n/a | 0.000 | 5.606 | 4.196 | 0.574 | 0.004 | n/a | 0.208 | 44.467 | 3.262 | n/a | 0.017 | 10.016 | 0.160 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.302ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 1.027ms; driver.publication.persist-deferred 0.697ms |
| 7a22ae566c88fadb00000000000018ad | 61.549 | 2.935 | n/a | 0.000 | 2.440 | 10.606 | 0.447 | 0.004 | n/a | 0.161 | 44.291 | 0.656 | n/a | 0.010 | 5.375 | 0.087 | 0.010 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 1.027ms; driver.publication.persist-deferred 0.697ms |
| 7a22ae566c88fadb00000000000018ac | 59.733 | 3.640 | n/a | 0.000 | 0.996 | 5.187 | 4.134 | 0.016 | n/a | 0.710 | 44.469 | 0.559 | n/a | 0.022 | 4.635 | 0.078 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.027ms |
| 7a22ae566c88fadb00000000000018ae | 58.055 | 3.673 | n/a | 0.000 | 1.803 | 6.552 | 0.449 | 0.005 | n/a | 0.141 | 45.137 | 0.289 | n/a | 0.004 | 5.477 | 0.094 | 0.004 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.027ms |
| 7a22ae566c88fadb0000000000000ec8 | 54.459 | 4.048 | n/a | 0.000 | 1.450 | 2.480 | 1.363 | 0.013 | n/a | 0.109 | 10.446 | 34.533 | n/a | 0.018 | 5.498 | 0.101 | 0.018 | tx/thread-87/transactor.triplex-function | none observed |
| 7a22ae566c88fadb0000000000000abe | 54.437 | 3.792 | n/a | 0.000 | 0.811 | 0.774 | 0.959 | 0.032 | n/a | 1.647 | 42.284 | 4.101 | n/a | 0.036 | 4.604 | 0.085 | 0.036 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.952ms |
| 7a22ae566c88fadb0000000000000abd | 53.573 | 4.069 | 0.456 | 0.000 | 0.027 | 2.010 | 5.807 | 0.033 | n/a | 0.089 | 32.456 | 8.615 | n/a | 0.013 | 4.551 | 0.085 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.952ms |
| 7a22ae566c88fadb000000000000138b | 48.287 | 5.207 | 5.573 | 0.238 | 0.026 | 3.047 | 8.979 | 0.020 | n/a | 0.088 | 18.273 | 6.825 | n/a | 0.011 | 11.044 | 0.229 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.254ms; driver.publication.persist-deferred 0.989ms; driver.reader-basis.broadcast 0.195ms |
| 7a22ae566c88fadb0000000000000abb | 47.839 | 2.467 | n/a | 0.000 | 2.510 | 0.381 | 1.314 | 0.018 | n/a | 0.367 | 9.842 | 30.929 | n/a | 0.012 | 4.977 | 0.104 | 0.012 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 0.962ms; driver.publication.persist-deferred 0.004ms |
| 7a22ae566c88fadb0000000000000d7c | 47.698 | 2.707 | n/a | 0.000 | 27.199 | 1.538 | 0.930 | 0.014 | n/a | 1.532 | 11.040 | 2.733 | n/a | 0.004 | 29.906 | 0.627 | 0.004 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.581ms; driver.publication.persist-deferred 0.912ms |
| 7a22ae566c88fadb0000000000001bd2 | 47.331 | 2.325 | n/a | 0.000 | 28.834 | 4.578 | 0.687 | 0.013 | n/a | 1.229 | 9.075 | 0.577 | n/a | 0.013 | 31.160 | 0.658 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.988ms; driver.reader-basis.broadcast 0.256ms |
| 7a22ae566c88fadb0000000000001c20 | 45.505 | 3.648 | n/a | 0.000 | 3.778 | 0.374 | 0.962 | 0.011 | n/a | 0.047 | 6.285 | 30.385 | n/a | 0.014 | 7.426 | 0.163 | 0.014 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.003ms |
| 7a22ae566c88fadb0000000000000d1c | 45.088 | 3.065 | 2.603 | 0.000 | 0.034 | 1.307 | 8.850 | 0.021 | n/a | 0.240 | 17.318 | 11.635 | n/a | 0.015 | 5.702 | 0.126 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.192ms; driver.publication.persist-deferred 1.049ms; driver.publication.persist-deferred 0.972ms; driver.publication.persist-deferred 0.788ms |
| 7a22ae566c88fadb00000000000011be | 44.455 | 1.274 | n/a | 0.000 | 31.098 | 0.435 | 0.702 | 0.006 | n/a | 0.056 | 7.917 | 2.955 | n/a | 0.011 | 32.373 | 0.728 | 0.011 | node-14/thread-0/driver.queue.subject | client.encode 1.876ms; driver.publication.persist-deferred 1.649ms; driver.expected-state.bind-receipt 1.395ms; driver.publication.persist-deferred 1.292ms; driver.publication.persist-deferred 1.053ms |
| 7a22ae566c88fadb00000000000016ff | 44.438 | 5.246 | n/a | 0.000 | 1.139 | 1.682 | 0.987 | 0.023 | n/a | 0.026 | 5.770 | 29.551 | n/a | 0.013 | 6.385 | 0.144 | 0.013 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.210ms; driver.publication.persist-deferred 0.752ms; driver.reader-basis.broadcast 0.246ms |
| 7a22ae566c88fadb0000000000001658 | 44.229 | 4.487 | n/a | 0.000 | 0.860 | 14.794 | 2.884 | 0.043 | n/a | 2.449 | 17.917 | 0.784 | n/a | 0.010 | 5.347 | 0.121 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.672ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.060ms; driver.publication.persist-deferred 1.059ms; driver.publication.persist-deferred 0.947ms |
| 7a22ae566c88fadb0000000000000ad8 | 44.202 | 6.038 | n/a | 0.000 | 1.004 | 8.456 | 2.698 | 0.068 | n/a | 0.386 | 24.327 | 1.188 | n/a | 0.037 | 7.042 | 0.159 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.131ms; driver.publication.persist-deferred 1.096ms; driver.reader-basis.broadcast 0.112ms |
| 7a22ae566c88fadb0000000000000d7b | 44.144 | 2.494 | n/a | 0.000 | 27.456 | 2.464 | 1.084 | 0.006 | n/a | 0.024 | 8.979 | 1.625 | n/a | 0.011 | 29.950 | 0.678 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 7a22ae566c88fadb0000000000001033 | 43.159 | 1.911 | n/a | 0.000 | 0.581 | 0.532 | 1.457 | 0.021 | n/a | 0.098 | 37.888 | 0.654 | n/a | 0.018 | 2.491 | 0.058 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.588 | 0.000 | 0.000 | 0.387 | 1.714 | n/a | 0.000 | 0.698 | 0.551 | 0.796 | 0.012 | n/a | 0.089 | 3.838 | 0.556 | n/a | 0.013 | 2.544 | 0.274 | 0.013 |
| p99 | 38.806 | 1.876 | 0.012 | 0.895 | 4.916 | n/a | 0.000 | 13.417 | 6.606 | 3.835 | 0.043 | n/a | 1.982 | 21.565 | 5.058 | n/a | 0.042 | 14.806 | 0.674 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7a22ae566c88fadb00000000000018ab | 68.137 | 2.181 | n/a | 0.000 | 0.267 | 0.433 | 1.246 | 0.029 | n/a | 0.151 | 36.284 | 27.534 | n/a | 0.012 | 2.448 | 0.036 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 7a22ae566c88fadb00000000000018ae | 58.055 | 3.673 | n/a | 0.000 | 1.803 | 6.552 | 0.449 | 0.005 | n/a | 0.141 | 45.137 | 0.289 | n/a | 0.004 | 5.477 | 0.094 | 0.004 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.027ms |
| 7a22ae566c88fadb0000000000000abe | 54.437 | 3.792 | n/a | 0.000 | 0.811 | 0.774 | 0.959 | 0.032 | n/a | 1.647 | 42.284 | 4.101 | n/a | 0.036 | 4.604 | 0.085 | 0.036 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.952ms |
| 7a22ae566c88fadb0000000000000d7c | 47.698 | 2.707 | n/a | 0.000 | 27.199 | 1.538 | 0.930 | 0.014 | n/a | 1.532 | 11.040 | 2.733 | n/a | 0.004 | 29.906 | 0.627 | 0.004 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 1.581ms; driver.publication.persist-deferred 0.912ms |
| 7a22ae566c88fadb0000000000001bd2 | 47.331 | 2.325 | n/a | 0.000 | 28.834 | 4.578 | 0.687 | 0.013 | n/a | 1.229 | 9.075 | 0.577 | n/a | 0.013 | 31.160 | 0.658 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.988ms; driver.reader-basis.broadcast 0.256ms |
| 7a22ae566c88fadb00000000000011be | 44.455 | 1.274 | n/a | 0.000 | 31.098 | 0.435 | 0.702 | 0.006 | n/a | 0.056 | 7.917 | 2.955 | n/a | 0.011 | 32.373 | 0.728 | 0.011 | node-14/thread-0/driver.queue.subject | client.encode 1.876ms; driver.publication.persist-deferred 1.649ms; driver.expected-state.bind-receipt 1.395ms; driver.publication.persist-deferred 1.292ms; driver.publication.persist-deferred 1.053ms |
| 7a22ae566c88fadb0000000000001658 | 44.229 | 4.487 | n/a | 0.000 | 0.860 | 14.794 | 2.884 | 0.043 | n/a | 2.449 | 17.917 | 0.784 | n/a | 0.010 | 5.347 | 0.121 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.672ms; driver.publication.persist-deferred 1.152ms; driver.publication.persist-deferred 1.060ms; driver.publication.persist-deferred 1.059ms; driver.publication.persist-deferred 0.947ms |
| 7a22ae566c88fadb0000000000000ad8 | 44.202 | 6.038 | n/a | 0.000 | 1.004 | 8.456 | 2.698 | 0.068 | n/a | 0.386 | 24.327 | 1.188 | n/a | 0.037 | 7.042 | 0.159 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.131ms; driver.publication.persist-deferred 1.096ms; driver.reader-basis.broadcast 0.112ms |
| 7a22ae566c88fadb0000000000000d7b | 44.144 | 2.494 | n/a | 0.000 | 27.456 | 2.464 | 1.084 | 0.006 | n/a | 0.024 | 8.979 | 1.625 | n/a | 0.011 | 29.950 | 0.678 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 7a22ae566c88fadb0000000000000d61 | 42.870 | 6.308 | n/a | 0.000 | 3.370 | 7.749 | 3.363 | 0.035 | n/a | 0.308 | 20.379 | 1.333 | n/a | 0.026 | 9.678 | 0.226 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.415ms; driver.publication.persist-deferred 1.108ms; driver.expected-state.bind-receipt 1.078ms; driver.publication.persist-deferred 1.048ms; driver.publication.persist-deferred 0.907ms |
| 7a22ae566c88fadb000000000000154b | 42.773 | 1.965 | n/a | 0.000 | 32.852 | 0.508 | 0.701 | 0.012 | n/a | 0.338 | 5.775 | 0.608 | n/a | 0.014 | 34.817 | 0.814 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.316ms; driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 1.007ms; driver.reader-basis.broadcast 0.245ms |
| 7a22ae566c88fadb0000000000001529 | 42.544 | 2.465 | n/a | 0.000 | 0.678 | 3.182 | 1.253 | 0.020 | n/a | 0.141 | 9.406 | 25.383 | n/a | 0.017 | 3.143 | 0.074 | 0.017 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 0.623ms |
| 7a22ae566c88fadb00000000000013e7 | 42.017 | 1.791 | n/a | 0.000 | 24.526 | 0.878 | 0.762 | 0.008 | n/a | 0.591 | 11.703 | 1.749 | n/a | 0.008 | 26.316 | 0.626 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.173ms; driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 1.019ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.744ms |
| 7a22ae566c88fadb00000000000018b0 | 41.071 | 1.465 | n/a | 0.000 | 0.094 | 4.614 | 0.516 | 0.008 | n/a | 0.208 | 31.229 | 2.920 | n/a | 0.015 | 1.560 | 0.038 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.302ms; driver.publication.persist-deferred 1.064ms; driver.publication.persist-deferred 1.027ms; driver.publication.persist-deferred 0.697ms |
| 7a22ae566c88fadb0000000000001c29 | 38.881 | 1.365 | n/a | 0.000 | 32.190 | 0.330 | 0.779 | 0.013 | n/a | 0.053 | 3.631 | 0.505 | n/a | 0.015 | 33.555 | 0.863 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.275ms; driver.publication.persist-deferred 1.107ms; driver.publication.persist-deferred 0.989ms; driver.publication.persist-deferred 0.944ms; driver.publication.persist-deferred 0.942ms |
| 7a22ae566c88fadb0000000000001c22 | 38.806 | 2.370 | n/a | 0.000 | 0.715 | 3.264 | 0.749 | 0.010 | n/a | 0.082 | 29.658 | 1.936 | n/a | 0.022 | 3.085 | 0.080 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.913ms |
| 7a22ae566c88fadb0000000000001178 | 36.805 | 2.271 | n/a | 0.000 | 25.326 | 0.531 | 1.314 | 0.011 | n/a | 0.047 | 6.371 | 0.903 | n/a | 0.031 | 27.596 | 0.750 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.288ms; driver.publication.persist-deferred 1.054ms; driver.publication.persist-deferred 0.848ms; driver.publication.persist-deferred 0.548ms |
| 7a22ae566c88fadb0000000000001034 | 36.610 | 1.600 | n/a | 0.000 | 0.866 | 0.531 | 1.292 | 0.021 | n/a | 0.065 | 31.424 | 0.793 | n/a | 0.020 | 2.465 | 0.067 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.016ms |
| 7a22ae566c88fadb0000000000000bde | 36.324 | 1.406 | n/a | 0.000 | 0.854 | 0.664 | 0.885 | 0.012 | n/a | 0.060 | 30.345 | 2.085 | n/a | 0.013 | 2.260 | 0.062 | 0.013 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.107ms; driver.reader-basis.broadcast 0.159ms |
| 7a22ae566c88fadb0000000000000d53 | 35.814 | 2.821 | n/a | 0.000 | 2.042 | 3.314 | 0.647 | 0.011 | n/a | 0.240 | 26.200 | 0.507 | n/a | 0.032 | 4.863 | 0.136 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.995ms; driver.reader-basis.broadcast 0.169ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.455 | n/a | n/a | n/a | 0.121 | n/a | 0.000 | 0.000 | 1.000 | 200.602 | 0.011 | n/a | 0.028 | 0.000 | n/a | n/a | 0.145 | 0.121 | 0.001 | 0.145 |
| p99 | 375.682 | n/a | n/a | n/a | 17.968 | n/a | 1.596 | 0.000 | 2.672 | 371.458 | 0.100 | n/a | 0.105 | 0.000 | n/a | n/a | 1.134 | 19.563 | 0.335 | 1.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc300000000000000002 | 375.682 | 2.497 | n/a | 0.000 | 0.000 | 1.274 | 371.458 | 0.100 | n/a | 0.078 | 0.000 | n/a | n/a | 0.275 | 2.497 | 0.007 | 0.275 | gw-r/thread-43/gateway.admitted-work | none observed |
| a5a36f951c031c6d0000000000000006 | 203.579 | 0.121 | n/a | 0.000 | 0.000 | 0.957 | 202.279 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.096 | 0.121 | 0.001 | 0.096 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000005 | 203.244 | 0.068 | n/a | 0.000 | 0.000 | 1.000 | 201.878 | 0.024 | n/a | 0.101 | 0.000 | n/a | n/a | 0.174 | 0.068 | 0.000 | 0.174 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000f2f | 201.771 | 0.066 | n/a | 0.000 | 0.000 | 0.915 | 200.602 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 0.130 | 0.066 | 0.000 | 0.130 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000f2e | 201.455 | 0.043 | n/a | 0.000 | 0.000 | 0.642 | 200.688 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.052 | 0.043 | 0.000 | 0.052 | gw-r/thread-66/journal/page | none observed |
| a5a36f951c031c6d0000000000000f30 | 201.046 | 0.032 | n/a | 0.000 | 0.000 | 0.465 | 200.445 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000f34 | 69.319 | 14.804 | n/a | 0.000 | 0.000 | 1.788 | 51.556 | 0.019 | n/a | 0.019 | 0.000 | n/a | n/a | 1.134 | 14.804 | 0.214 | 1.134 | gw-r/thread-41/gateway.admitted-work | none observed |
| a5a36f951c031c6d0000000000000f33 | 64.526 | 15.141 | n/a | 0.000 | 0.000 | 1.973 | 47.208 | 0.011 | n/a | 0.010 | 0.000 | n/a | n/a | 0.182 | 15.141 | 0.235 | 0.182 | gw-r/thread-67/gateway.admitted-work | none observed |
| a5a36f951c031c6d0000000000000f35 | 58.388 | 17.968 | n/a | 1.596 | 0.000 | 2.672 | 35.999 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 0.145 | 19.563 | 0.335 | 0.145 | gw-r/thread-62/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 813.401 | n/a | n/a | n/a | 0.199 | n/a | 0.000 | 0.000 | 1.094 | 786.542 | 0.011 | n/a | 0.376 | 0.000 | n/a | n/a | 0.269 | 0.199 | 0.000 | 0.269 |
| p99 | 1005.486 | n/a | n/a | n/a | 24.676 | n/a | 0.000 | 0.000 | 1.942 | 1001.695 | 0.012 | n/a | 0.807 | 0.000 | n/a | n/a | 1.263 | 24.676 | 0.030 | 1.263 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc3000000000000000a4 | 1005.486 | 0.199 | n/a | 0.000 | 0.000 | 1.942 | 1001.695 | 0.011 | n/a | 0.376 | 0.000 | n/a | n/a | 1.263 | 0.199 | 0.000 | 1.263 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000a5 | 813.401 | 24.676 | n/a | 0.000 | 0.000 | 1.094 | 786.542 | 0.012 | n/a | 0.807 | 0.000 | n/a | n/a | 0.269 | 24.676 | 0.030 | 0.269 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 446.628 | n/a | n/a | n/a | 2.707 | n/a | 0.000 | 0.000 | 0.791 | 443.661 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.094 | 2.707 | 0.007 | 0.094 |
| p99 | 1005.487 | n/a | n/a | n/a | 8.801 | n/a | 0.000 | 0.000 | 4.479 | 1002.237 | 0.468 | n/a | 1.301 | 0.000 | n/a | n/a | 1.099 | 8.801 | 0.192 | 1.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc3000000000000000bb | 1005.487 | 0.118 | n/a | 0.000 | 0.000 | 1.929 | 1002.237 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 1.099 | 0.118 | 0.000 | 1.099 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000ae | 1002.150 | 2.441 | n/a | 0.000 | 0.000 | 0.406 | 999.069 | 0.039 | n/a | 0.123 | 0.000 | n/a | n/a | 0.073 | 2.441 | 0.002 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000ab | 986.529 | 3.208 | n/a | 0.000 | 0.000 | 0.663 | 982.471 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.101 | 3.208 | 0.003 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000ba | 980.815 | 2.355 | n/a | 0.000 | 0.000 | 0.448 | 977.823 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.094 | 2.355 | 0.002 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000b4 | 960.940 | 4.896 | n/a | 0.000 | 0.000 | 0.673 | 954.982 | 0.019 | n/a | 0.109 | 0.000 | n/a | n/a | 0.261 | 4.896 | 0.005 | 0.261 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000cf | 949.617 | 4.509 | n/a | 0.000 | 0.000 | 0.791 | 943.929 | 0.117 | n/a | 0.070 | 0.000 | n/a | n/a | 0.202 | 4.509 | 0.005 | 0.202 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000a8 | 925.804 | 1.996 | n/a | 0.000 | 0.000 | 0.357 | 923.280 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.091 | 1.996 | 0.002 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000c2 | 913.533 | 6.383 | n/a | 0.000 | 0.000 | 1.801 | 905.104 | 0.028 | n/a | 0.103 | 0.000 | n/a | n/a | 0.115 | 6.383 | 0.007 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000cb | 785.218 | 3.974 | n/a | 0.000 | 0.000 | 4.479 | 776.558 | 0.022 | n/a | 0.063 | 0.000 | n/a | n/a | 0.124 | 3.974 | 0.005 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000b2 | 561.910 | 3.460 | n/a | 0.000 | 0.000 | 3.908 | 554.382 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.077 | 3.460 | 0.006 | 0.077 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000c5 | 549.353 | 1.746 | n/a | 0.000 | 0.000 | 1.751 | 545.690 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.065 | 1.746 | 0.003 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000c8 | 518.342 | 2.134 | n/a | 0.000 | 0.000 | 0.671 | 515.345 | 0.009 | n/a | 0.115 | 0.000 | n/a | n/a | 0.067 | 2.134 | 0.004 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000ca | 475.150 | 2.799 | n/a | 0.000 | 0.000 | 0.565 | 471.635 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.076 | 2.799 | 0.006 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000c1 | 456.437 | 2.707 | n/a | 0.000 | 0.000 | 2.257 | 451.292 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.084 | 2.707 | 0.006 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000c6 | 446.628 | 2.283 | n/a | 0.000 | 0.000 | 0.555 | 443.661 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.070 | 2.283 | 0.005 | 0.070 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000b6 | 423.690 | 3.320 | n/a | 0.000 | 0.000 | 3.531 | 416.634 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.102 | 3.320 | 0.008 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000b5 | 365.794 | 8.801 | n/a | 0.000 | 0.000 | 1.336 | 355.147 | 0.008 | n/a | 0.273 | 0.000 | n/a | n/a | 0.229 | 8.801 | 0.024 | 0.229 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000b1 | 320.042 | 4.308 | n/a | 0.000 | 0.000 | 3.258 | 312.258 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.129 | 4.308 | 0.013 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000bd | 278.978 | 2.007 | n/a | 0.000 | 0.000 | 3.333 | 273.409 | 0.026 | n/a | 0.128 | 0.000 | n/a | n/a | 0.074 | 2.007 | 0.007 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000a7 | 274.774 | 3.121 | n/a | 0.000 | 0.000 | 1.218 | 269.716 | 0.468 | n/a | 0.087 | 0.000 | n/a | n/a | 0.164 | 3.121 | 0.011 | 0.164 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 442.864 | n/a | n/a | n/a | 3.821 | n/a | 0.506 | 0.000 | 0.690 | 435.117 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.084 | 4.194 | 0.012 | 0.084 |
| p99 | 1002.979 | n/a | n/a | n/a | 13.469 | n/a | 1.789 | 0.000 | 2.920 | 1000.931 | 4.251 | n/a | 2.128 | 0.000 | n/a | n/a | 1.672 | 14.564 | 0.535 | 1.672 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc3000000000000000d2 | 1002.979 | 0.132 | n/a | 0.000 | 0.000 | 0.690 | 1000.931 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 1.105 | 0.132 | 0.000 | 1.105 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000df | 1002.787 | 0.113 | n/a | 0.000 | 0.000 | 0.385 | 999.052 | 0.011 | n/a | 2.128 | 0.000 | n/a | n/a | 1.097 | 0.113 | 0.000 | 1.097 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000ff | 1000.838 | 2.894 | n/a | 0.000 | 0.000 | 0.495 | 997.301 | 0.022 | n/a | 0.061 | 0.000 | n/a | n/a | 0.065 | 2.894 | 0.003 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000106 | 999.383 | 2.773 | n/a | 0.000 | 0.000 | 0.676 | 995.801 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.061 | 2.773 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000010e | 997.863 | 4.070 | n/a | 0.000 | 0.000 | 0.837 | 992.811 | 0.031 | n/a | 0.044 | 0.000 | n/a | n/a | 0.070 | 4.070 | 0.004 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000d1 | 995.418 | 4.081 | n/a | 0.733 | 0.000 | 0.543 | 989.833 | 0.019 | n/a | 0.116 | 0.000 | n/a | n/a | 0.093 | 4.813 | 0.005 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000da | 986.908 | 3.159 | n/a | 0.476 | 0.000 | 0.551 | 982.569 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.074 | 3.635 | 0.004 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000d9 | 979.592 | 3.629 | n/a | 0.554 | 0.000 | 0.407 | 974.843 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.086 | 4.183 | 0.004 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000de | 933.529 | 4.871 | n/a | 0.782 | 0.000 | 0.855 | 926.834 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.076 | 5.653 | 0.006 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000e1 | 916.148 | 8.366 | n/a | 0.624 | 0.000 | 0.431 | 906.534 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.167 | 8.990 | 0.010 | 0.167 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000103 | 913.449 | 2.713 | n/a | 0.000 | 0.000 | 0.538 | 910.049 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.061 | 2.713 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000102 | 889.531 | 3.978 | n/a | 0.549 | 0.000 | 0.938 | 883.877 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.098 | 4.527 | 0.005 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000e6 | 674.667 | 3.059 | n/a | 0.506 | 0.000 | 1.531 | 669.467 | 0.008 | n/a | 0.020 | 0.000 | n/a | n/a | 0.077 | 3.565 | 0.005 | 0.077 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000eb | 670.595 | 3.706 | n/a | 0.000 | 0.000 | 0.531 | 666.151 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.163 | 3.706 | 0.006 | 0.163 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000fc | 662.258 | 4.804 | n/a | 0.562 | 0.000 | 0.594 | 656.174 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.069 | 5.366 | 0.008 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000db | 639.056 | 5.916 | n/a | 1.789 | 0.000 | 1.356 | 629.806 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.106 | 7.705 | 0.012 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000d4 | 550.274 | 4.638 | n/a | 0.458 | 0.000 | 1.287 | 543.682 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.081 | 5.097 | 0.009 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000e7 | 529.572 | 5.725 | n/a | 0.515 | 0.000 | 0.788 | 522.286 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.180 | 6.240 | 0.012 | 0.180 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000107 | 478.373 | 4.671 | n/a | 0.840 | 0.000 | 1.197 | 471.526 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.072 | 5.511 | 0.012 | 0.072 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000000e8 | 470.984 | 3.001 | n/a | 0.520 | 0.000 | 0.758 | 466.552 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.102 | 3.521 | 0.007 | 0.102 | gw-r/thread-41/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 449.004 | n/a | n/a | n/a | 2.974 | n/a | 0.000 | 0.000 | 0.711 | 436.695 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.075 | 2.974 | 0.010 | 0.075 |
| p99 | 1006.175 | n/a | n/a | n/a | 11.154 | n/a | 1.147 | 0.000 | 3.160 | 1001.736 | 0.019 | n/a | 0.109 | 0.000 | n/a | n/a | 1.108 | 11.767 | 0.078 | 1.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc300000000000000115 | 1006.175 | 3.637 | n/a | 0.000 | 0.000 | 0.661 | 1001.736 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.077 | 3.637 | 0.004 | 0.077 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000012a | 1003.763 | 0.127 | n/a | 0.000 | 0.000 | 0.997 | 1001.456 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 1.108 | 0.127 | 0.000 | 1.108 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000126 | 1000.909 | 5.616 | n/a | 0.000 | 0.000 | 1.965 | 993.099 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.161 | 5.616 | 0.006 | 0.161 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000138 | 1000.685 | 2.286 | n/a | 0.000 | 0.000 | 0.633 | 997.614 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.057 | 2.286 | 0.002 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000011d | 996.491 | 3.400 | n/a | 0.000 | 0.000 | 1.076 | 991.901 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.071 | 3.400 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000112 | 967.390 | 2.520 | n/a | 0.000 | 0.000 | 0.766 | 963.996 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.059 | 2.520 | 0.003 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000012c | 964.933 | 5.289 | n/a | 0.000 | 0.000 | 2.576 | 956.861 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.152 | 5.289 | 0.005 | 0.152 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000127 | 875.850 | 5.621 | n/a | 0.000 | 0.000 | 0.785 | 869.334 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.083 | 5.621 | 0.006 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000011e | 873.635 | 1.943 | n/a | 0.000 | 0.000 | 2.016 | 869.546 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.056 | 1.943 | 0.002 | 0.056 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000141 | 836.204 | 2.601 | n/a | 0.000 | 0.000 | 0.436 | 833.027 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.061 | 2.601 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000010f | 812.990 | 3.468 | n/a | 0.581 | 0.000 | 0.524 | 808.272 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.080 | 4.049 | 0.005 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000135 | 748.965 | 2.716 | n/a | 0.000 | 0.000 | 1.502 | 744.583 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.066 | 2.716 | 0.004 | 0.066 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000142 | 741.445 | 3.632 | n/a | 0.000 | 0.000 | 0.535 | 737.161 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.067 | 3.632 | 0.005 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000139 | 702.521 | 8.451 | n/a | 0.000 | 0.000 | 1.463 | 692.404 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.125 | 8.451 | 0.012 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000133 | 644.198 | 4.412 | n/a | 0.000 | 0.000 | 0.530 | 638.367 | 0.011 | n/a | 0.013 | 0.000 | n/a | n/a | 0.865 | 4.412 | 0.007 | 0.865 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000148 | 622.866 | 3.043 | n/a | 0.000 | 0.000 | 0.643 | 618.993 | 0.016 | n/a | 0.059 | 0.000 | n/a | n/a | 0.112 | 3.043 | 0.005 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000013d | 608.670 | 2.247 | n/a | 0.000 | 0.000 | 0.820 | 605.445 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.065 | 2.247 | 0.004 | 0.065 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000125 | 547.477 | 2.946 | n/a | 0.000 | 0.000 | 0.424 | 543.796 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.231 | 2.946 | 0.005 | 0.231 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000012f | 527.752 | 2.343 | n/a | 0.000 | 0.000 | 0.457 | 524.838 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.057 | 2.343 | 0.004 | 0.057 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000012d | 478.766 | 2.114 | n/a | 0.000 | 0.000 | 0.545 | 475.972 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.067 | 2.114 | 0.004 | 0.067 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 456.319 | n/a | n/a | n/a | 2.522 | n/a | 0.000 | 0.000 | 0.654 | 453.189 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 2.659 | 0.007 | 0.067 |
| p99 | 1003.615 | n/a | n/a | n/a | 5.763 | n/a | 0.725 | 0.000 | 3.829 | 1000.969 | 3.411 | n/a | 0.086 | 0.000 | n/a | n/a | 1.101 | 5.974 | 0.416 | 1.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc300000000000000154 | 1003.615 | 4.142 | n/a | 0.000 | 0.000 | 1.198 | 998.130 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.086 | 4.142 | 0.004 | 0.086 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000184 | 1002.597 | 0.104 | n/a | 0.000 | 0.000 | 0.312 | 1000.969 | 0.031 | n/a | 0.081 | 0.000 | n/a | n/a | 1.101 | 0.104 | 0.000 | 1.101 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000164 | 1001.121 | 2.378 | n/a | 0.000 | 0.000 | 0.484 | 998.162 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.063 | 2.378 | 0.002 | 0.063 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000017d | 1001.061 | 2.317 | n/a | 0.000 | 0.000 | 1.131 | 997.510 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.059 | 2.317 | 0.002 | 0.059 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000016d | 991.984 | 2.232 | n/a | 0.000 | 0.000 | 0.969 | 988.682 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.064 | 2.232 | 0.002 | 0.064 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000183 | 988.180 | 2.914 | n/a | 0.000 | 0.000 | 0.613 | 984.525 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.060 | 2.914 | 0.003 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000155 | 864.463 | 2.248 | n/a | 0.000 | 0.000 | 1.063 | 860.929 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.156 | 2.248 | 0.003 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000172 | 844.534 | 5.659 | n/a | 0.000 | 0.000 | 0.647 | 838.073 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.109 | 5.659 | 0.007 | 0.109 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000014f | 732.630 | 3.242 | n/a | 0.000 | 0.000 | 0.654 | 728.576 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.121 | 3.242 | 0.004 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000015a | 707.041 | 5.594 | n/a | 0.000 | 0.000 | 0.554 | 700.693 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.156 | 5.594 | 0.008 | 0.156 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000178 | 680.808 | 2.897 | n/a | 0.000 | 0.000 | 0.792 | 676.936 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.155 | 2.897 | 0.004 | 0.155 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000165 | 675.541 | 5.763 | n/a | 0.000 | 0.000 | 1.978 | 667.656 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.094 | 5.763 | 0.009 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000016e | 537.782 | 5.032 | n/a | 0.000 | 0.000 | 0.485 | 532.138 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.064 | 5.032 | 0.009 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000017a | 531.091 | 1.768 | n/a | 0.000 | 0.000 | 0.404 | 528.816 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.066 | 1.768 | 0.003 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000186 | 524.914 | 2.457 | n/a | 0.000 | 0.000 | 0.743 | 521.612 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.457 | 0.005 | 0.067 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000174 | 523.787 | 2.344 | n/a | 0.000 | 0.000 | 0.232 | 521.107 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.064 | 2.344 | 0.004 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000181 | 520.508 | 2.659 | n/a | 0.000 | 0.000 | 0.726 | 517.015 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 2.659 | 0.005 | 0.064 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000014a | 501.463 | 2.315 | n/a | 0.000 | 0.000 | 0.706 | 498.308 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.074 | 2.315 | 0.005 | 0.074 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000016c | 478.353 | 2.243 | n/a | 0.000 | 0.000 | 0.399 | 475.586 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.069 | 2.243 | 0.005 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000175 | 465.555 | 2.323 | n/a | 0.000 | 0.000 | 0.463 | 462.651 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.082 | 2.323 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 320.990 | n/a | n/a | n/a | 2.777 | n/a | 0.000 | 0.000 | 0.584 | 312.801 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.805 | 0.011 | 0.065 |
| p99 | 1002.497 | n/a | n/a | n/a | 11.765 | n/a | 2.345 | 0.000 | 2.952 | 1000.844 | 2.331 | n/a | 0.076 | 0.000 | n/a | n/a | 1.107 | 12.843 | 0.558 | 1.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc3000000000000001a4 | 1002.497 | 0.119 | n/a | 0.000 | 0.000 | 0.349 | 1000.844 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 1.107 | 0.119 | 0.000 | 1.107 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000189 | 1000.300 | 3.134 | n/a | 0.000 | 0.000 | 0.749 | 996.300 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.070 | 3.134 | 0.003 | 0.070 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001c3 | 995.482 | 2.366 | n/a | 0.000 | 0.000 | 0.680 | 992.319 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.062 | 2.366 | 0.002 | 0.062 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001c2 | 989.745 | 4.634 | n/a | 0.000 | 0.000 | 0.584 | 984.424 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.068 | 4.634 | 0.005 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000198 | 982.495 | 3.548 | n/a | 0.000 | 0.000 | 0.901 | 977.811 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.205 | 3.548 | 0.004 | 0.205 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001a6 | 964.016 | 2.272 | n/a | 0.000 | 0.000 | 0.336 | 961.296 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.057 | 2.272 | 0.002 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001d3 | 881.633 | 1.702 | n/a | 0.000 | 0.000 | 2.462 | 877.366 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.063 | 1.702 | 0.002 | 0.063 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000019a | 863.763 | 2.350 | n/a | 0.000 | 0.000 | 0.559 | 860.749 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.062 | 2.350 | 0.003 | 0.062 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001a2 | 801.861 | 3.156 | n/a | 0.000 | 0.000 | 0.511 | 798.085 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.067 | 3.156 | 0.004 | 0.067 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001c4 | 758.162 | 2.561 | n/a | 0.000 | 0.000 | 0.796 | 754.669 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.064 | 2.561 | 0.003 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001a7 | 725.031 | 2.070 | n/a | 2.345 | 0.000 | 1.577 | 718.852 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.108 | 4.415 | 0.006 | 0.108 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000019d | 719.645 | 5.866 | n/a | 0.000 | 0.000 | 0.603 | 712.936 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.205 | 5.866 | 0.008 | 0.205 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001ae | 694.608 | 8.783 | n/a | 0.000 | 0.000 | 1.001 | 684.707 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.078 | 8.783 | 0.013 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001c0 | 676.649 | 2.980 | n/a | 0.000 | 0.000 | 0.413 | 673.177 | 0.005 | n/a | 0.016 | 0.000 | n/a | n/a | 0.059 | 2.980 | 0.004 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001cf | 546.248 | 2.148 | n/a | 0.000 | 0.000 | 0.499 | 543.465 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.072 | 2.148 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001b6 | 543.611 | 11.765 | n/a | 1.077 | 0.000 | 0.470 | 530.160 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 12.843 | 0.024 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001b5 | 541.789 | 2.287 | n/a | 0.000 | 0.000 | 0.877 | 538.527 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.052 | 2.287 | 0.004 | 0.052 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000193 | 474.413 | 2.316 | n/a | 0.000 | 0.000 | 0.493 | 471.488 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 2.316 | 0.005 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001b7 | 452.508 | 3.104 | n/a | 0.000 | 0.000 | 0.627 | 448.661 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.064 | 3.104 | 0.007 | 0.064 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001cc | 439.516 | 2.285 | n/a | 0.000 | 0.000 | 2.071 | 435.062 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.057 | 2.285 | 0.005 | 0.057 | gw-r/thread-62/journal/page | none observed |

## P3 / L256 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 317.921 | n/a | n/a | n/a | 2.538 | n/a | 0.000 | 0.000 | 0.645 | 311.857 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.066 | 2.538 | 0.009 | 0.066 |
| p99 | 1003.241 | n/a | n/a | n/a | 6.563 | n/a | 0.000 | 0.000 | 4.213 | 1001.122 | 0.525 | n/a | 0.138 | 0.000 | n/a | n/a | 1.207 | 6.563 | 0.769 | 1.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc300000000000000211 | 1003.241 | 0.171 | n/a | 0.000 | 0.000 | 0.721 | 1001.122 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 1.140 | 0.171 | 0.000 | 1.140 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000216 | 1002.758 | 0.105 | n/a | 0.000 | 0.000 | 0.509 | 1000.968 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 1.100 | 0.105 | 0.000 | 1.100 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001fc | 1002.663 | 0.195 | n/a | 0.000 | 0.000 | 0.549 | 1000.676 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 1.207 | 0.195 | 0.000 | 1.207 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000210 | 1001.705 | 2.779 | n/a | 0.000 | 0.000 | 1.036 | 997.788 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 2.779 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000218 | 997.637 | 4.375 | n/a | 0.000 | 0.000 | 1.581 | 991.430 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.189 | 4.375 | 0.004 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001e8 | 992.035 | 2.538 | n/a | 0.000 | 0.000 | 0.667 | 988.702 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.067 | 2.538 | 0.003 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001fe | 915.693 | 2.374 | n/a | 0.000 | 0.000 | 0.359 | 912.828 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.073 | 2.374 | 0.003 | 0.073 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000201 | 862.201 | 2.163 | n/a | 0.000 | 0.000 | 0.537 | 859.381 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.068 | 2.163 | 0.003 | 0.068 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000215 | 859.512 | 2.194 | n/a | 0.000 | 0.000 | 0.350 | 856.875 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.061 | 2.194 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001db | 849.831 | 5.549 | n/a | 0.000 | 0.000 | 1.592 | 842.502 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.157 | 5.549 | 0.007 | 0.157 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001ee | 845.259 | 1.811 | n/a | 0.000 | 0.000 | 0.806 | 842.512 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.069 | 1.811 | 0.002 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000206 | 815.518 | 4.257 | n/a | 0.000 | 0.000 | 4.213 | 806.925 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.074 | 4.257 | 0.005 | 0.074 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001f5 | 709.366 | 2.202 | n/a | 0.000 | 0.000 | 0.435 | 706.629 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.202 | 0.003 | 0.057 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001f7 | 641.161 | 1.851 | n/a | 0.000 | 0.000 | 0.438 | 638.770 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 1.851 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001d8 | 632.565 | 1.895 | n/a | 0.000 | 0.000 | 0.313 | 630.289 | 0.004 | n/a | 0.009 | 0.000 | n/a | n/a | 0.056 | 1.895 | 0.003 | 0.056 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001f2 | 580.245 | 2.715 | n/a | 0.000 | 0.000 | 0.608 | 576.817 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 2.715 | 0.005 | 0.062 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001e7 | 564.184 | 5.795 | n/a | 0.000 | 0.000 | 0.607 | 557.584 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.153 | 5.795 | 0.010 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001df | 474.572 | 3.789 | n/a | 0.000 | 0.000 | 2.197 | 468.468 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.064 | 3.789 | 0.008 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000001f1 | 417.998 | 3.825 | n/a | 0.000 | 0.000 | 2.027 | 412.022 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.084 | 3.825 | 0.009 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000020f | 373.411 | 3.145 | n/a | 0.000 | 0.000 | 0.397 | 369.672 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.155 | 3.145 | 0.008 | 0.155 | gw-r/thread-62/journal/page | none observed |

## P3 / L1024 / internal (749 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.750 | n/a | n/a | n/a | 2.906 | n/a | 0.000 | 0.000 | 0.509 | 10.047 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.068 | 2.906 | 0.233 | 0.068 |
| p99 | 113.643 | n/a | n/a | n/a | 14.139 | n/a | 0.915 | 0.000 | 4.026 | 106.125 | 0.269 | n/a | 0.071 | 0.000 | n/a | n/a | 0.421 | 15.484 | 0.824 | 0.421 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc300000000000000224 | 985.924 | 3.500 | n/a | 0.000 | 0.000 | 0.492 | 981.823 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.069 | 3.500 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000219 | 985.600 | 1.934 | n/a | 0.000 | 0.000 | 0.592 | 982.965 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.071 | 1.934 | 0.002 | 0.071 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000225 | 969.317 | 2.236 | n/a | 0.000 | 0.000 | 0.499 | 966.470 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.067 | 2.236 | 0.002 | 0.067 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000021c | 836.318 | 4.135 | n/a | 0.000 | 0.000 | 0.833 | 831.151 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.106 | 4.135 | 0.005 | 0.106 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000220 | 749.606 | 1.862 | n/a | 0.000 | 0.000 | 0.491 | 747.135 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.073 | 1.862 | 0.002 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000021e | 178.895 | 2.406 | n/a | 0.000 | 0.000 | 0.541 | 175.865 | 0.005 | n/a | 0.009 | 0.000 | n/a | n/a | 0.070 | 2.406 | 0.013 | 0.070 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000222 | 148.001 | 3.809 | n/a | 0.000 | 0.000 | 0.775 | 142.093 | 1.218 | n/a | 0.042 | 0.000 | n/a | n/a | 0.065 | 3.809 | 0.026 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000002f0 | 113.643 | 15.687 | n/a | 0.000 | 0.000 | 0.634 | 96.970 | 0.166 | n/a | 0.017 | 0.000 | n/a | n/a | 0.169 | 15.687 | 0.138 | 0.169 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000021f | 108.876 | 2.224 | n/a | 0.000 | 0.000 | 0.431 | 106.125 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.054 | 2.224 | 0.020 | 0.054 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000004e5 | 105.399 | 6.980 | n/a | 0.000 | 0.000 | 0.449 | 97.760 | 0.002 | n/a | 0.021 | 0.000 | n/a | n/a | 0.188 | 6.980 | 0.066 | 0.188 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000755 | 95.908 | 3.164 | n/a | 0.000 | 0.000 | 1.244 | 91.375 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.080 | 3.164 | 0.033 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000046a | 88.883 | 4.220 | n/a | 0.000 | 0.000 | 4.062 | 80.516 | 0.002 | n/a | 0.018 | 0.000 | n/a | n/a | 0.065 | 4.220 | 0.047 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000789 | 88.842 | 16.771 | n/a | 0.696 | 0.000 | 0.693 | 70.038 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.628 | 17.466 | 0.197 | 0.628 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc30000000000000079c | 87.052 | 2.829 | n/a | 0.000 | 0.000 | 0.472 | 83.573 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.149 | 2.829 | 0.033 | 0.149 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000005e6 | 86.462 | 4.659 | n/a | 0.000 | 0.000 | 0.681 | 81.031 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.080 | 4.659 | 0.054 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000004ee | 82.571 | 2.208 | n/a | 0.000 | 0.000 | 0.402 | 79.838 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.067 | 2.208 | 0.027 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 0f6fcb7c490bcc3000000000000005c6 | 78.293 | 6.186 | n/a | 0.000 | 0.000 | 0.448 | 71.530 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.098 | 6.186 | 0.079 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000630 | 76.978 | 3.376 | n/a | 0.000 | 0.000 | 0.451 | 72.590 | 0.491 | n/a | 0.008 | 0.000 | n/a | n/a | 0.063 | 3.376 | 0.044 | 0.063 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000774 | 75.302 | 6.838 | n/a | 0.000 | 0.000 | 0.307 | 68.063 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.082 | 6.838 | 0.091 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000000764 | 71.915 | 3.146 | n/a | 0.000 | 0.000 | 0.289 | 68.410 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.061 | 3.146 | 0.044 | 0.061 | gw-r/thread-66/journal/page | none observed |

## P3 / tail / internal (2336 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.081 | n/a | n/a | n/a | 3.678 | n/a | 0.000 | 0.000 | 0.436 | 8.066 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.088 | 3.692 | 0.299 | 0.088 |
| p99 | 347.132 | n/a | n/a | n/a | 13.994 | n/a | 1.307 | 0.000 | 4.184 | 340.682 | 0.260 | n/a | 0.044 | 0.000 | n/a | n/a | 1.080 | 14.582 | 0.848 | 1.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6fcb7c490bcc300000000000001ab8 | 1002.449 | 0.138 | n/a | 0.000 | 0.000 | 0.304 | 1000.823 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 1.113 | 0.138 | 0.000 | 1.113 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001b04 | 1002.302 | 0.115 | n/a | 0.000 | 0.000 | 0.397 | 1000.637 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 1.097 | 0.115 | 0.000 | 1.097 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001b00 | 989.620 | 2.378 | n/a | 0.000 | 0.000 | 0.491 | 986.656 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.063 | 2.378 | 0.002 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001abd | 988.561 | 2.236 | n/a | 0.000 | 0.000 | 0.226 | 985.991 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.060 | 2.236 | 0.002 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001aba | 983.895 | 8.249 | n/a | 1.445 | 0.000 | 0.466 | 973.324 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.352 | 9.694 | 0.010 | 0.352 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001ac2 | 908.215 | 2.403 | n/a | 0.000 | 0.000 | 0.277 | 905.459 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.067 | 2.403 | 0.003 | 0.067 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001afd | 899.947 | 1.853 | n/a | 0.000 | 0.000 | 4.281 | 893.740 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.059 | 1.853 | 0.002 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001acb | 885.540 | 2.102 | n/a | 0.000 | 0.000 | 0.340 | 883.010 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.061 | 2.102 | 0.002 | 0.061 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001ada | 872.256 | 2.354 | n/a | 0.000 | 0.000 | 0.429 | 869.373 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.061 | 2.354 | 0.003 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001afb | 827.573 | 2.263 | n/a | 0.000 | 0.000 | 0.542 | 824.676 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.060 | 2.263 | 0.003 | 0.060 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001ab6 | 813.083 | 2.538 | n/a | 0.000 | 0.000 | 0.941 | 809.518 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.056 | 2.538 | 0.003 | 0.056 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001ac3 | 723.250 | 2.551 | n/a | 0.000 | 0.000 | 0.292 | 720.266 | 0.004 | n/a | 0.010 | 0.000 | n/a | n/a | 0.127 | 2.551 | 0.004 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001af7 | 711.593 | 2.056 | n/a | 0.000 | 0.000 | 0.285 | 709.165 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.058 | 2.056 | 0.003 | 0.058 | gw-r/thread-66/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001adf | 696.598 | 7.572 | n/a | 0.000 | 0.000 | 0.314 | 688.377 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.282 | 7.572 | 0.011 | 0.282 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001add | 658.826 | 2.423 | n/a | 0.000 | 0.000 | 0.397 | 655.916 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.058 | 2.423 | 0.004 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001aed | 601.624 | 2.476 | n/a | 0.000 | 0.000 | 0.427 | 598.629 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.060 | 2.476 | 0.004 | 0.060 | gw-r/thread-62/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001ad7 | 581.666 | 1.982 | n/a | 0.000 | 0.000 | 0.332 | 579.237 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.051 | 1.982 | 0.003 | 0.051 | gw-r/thread-41/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001af2 | 574.788 | 2.533 | n/a | 0.000 | 0.000 | 0.374 | 571.789 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.060 | 2.533 | 0.004 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001ad2 | 491.426 | 2.675 | n/a | 0.000 | 0.000 | 0.440 | 488.159 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.109 | 2.675 | 0.005 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 0f6fcb7c490bcc300000000000001af5 | 394.306 | 2.470 | n/a | 0.000 | 0.000 | 0.633 | 391.095 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.470 | 0.006 | 0.063 | gw-r/thread-41/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.282 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.805 | 201.098 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 |
| p99 | 206.962 | n/a | n/a | n/a | 0.107 | n/a | 0.000 | 0.000 | 4.097 | 205.146 | 5.590 | n/a | 3.838 | 0.000 | n/a | n/a | 0.278 | 0.107 | 0.002 | 0.278 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d000000000000002b | 206.962 | 0.055 | n/a | 0.000 | 0.000 | 1.452 | 205.146 | 0.017 | n/a | 0.167 | 0.000 | n/a | n/a | 0.125 | 0.055 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000030 | 206.358 | 0.034 | n/a | 0.000 | 0.000 | 2.434 | 203.627 | 0.097 | n/a | 0.092 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000042 | 206.311 | 0.032 | n/a | 0.000 | 0.000 | 4.097 | 202.032 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d0000000000000031 | 206.078 | 0.032 | n/a | 0.000 | 0.000 | 1.324 | 204.524 | 0.014 | n/a | 0.107 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d000000000000000e | 205.932 | 0.056 | n/a | 0.000 | 0.000 | 0.893 | 204.738 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.140 | 0.056 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d0000000000000025 | 205.314 | 0.029 | n/a | 0.000 | 0.000 | 0.532 | 204.431 | 0.021 | n/a | 0.236 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000046 | 205.010 | 0.029 | n/a | 0.000 | 0.000 | 3.526 | 201.188 | 0.073 | n/a | 0.135 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000029 | 204.954 | 0.086 | n/a | 0.000 | 0.000 | 0.682 | 203.875 | 0.022 | n/a | 0.165 | 0.000 | n/a | n/a | 0.123 | 0.086 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d000000000000001c | 204.893 | 0.031 | n/a | 0.000 | 0.000 | 0.666 | 203.999 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d000000000000004f | 204.721 | 0.032 | n/a | 0.000 | 0.000 | 2.764 | 201.606 | 0.021 | n/a | 0.233 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000041 | 204.368 | 0.056 | n/a | 0.000 | 0.000 | 0.857 | 203.208 | 0.018 | n/a | 0.080 | 0.000 | n/a | n/a | 0.147 | 0.056 | 0.000 | 0.147 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000039 | 204.299 | 0.042 | n/a | 0.000 | 0.000 | 1.457 | 202.582 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.120 | 0.042 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d0000000000000024 | 204.119 | 0.050 | n/a | 0.000 | 0.000 | 2.503 | 201.224 | 0.025 | n/a | 0.232 | 0.000 | n/a | n/a | 0.084 | 0.050 | 0.000 | 0.084 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d000000000000003d | 204.055 | 0.028 | n/a | 0.000 | 0.000 | 2.800 | 201.106 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 0.062 | 0.028 | 0.000 | 0.062 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000021 | 203.811 | 0.033 | n/a | 0.000 | 0.000 | 2.289 | 201.254 | 0.014 | n/a | 0.157 | 0.000 | n/a | n/a | 0.063 | 0.033 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d000000000000000f | 203.693 | 0.039 | n/a | 0.000 | 0.000 | 1.243 | 202.206 | 0.016 | n/a | 0.103 | 0.000 | n/a | n/a | 0.086 | 0.039 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000010 | 203.365 | 0.039 | n/a | 0.000 | 0.000 | 1.653 | 201.284 | 0.014 | n/a | 0.292 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d000000000000002d | 203.231 | 0.034 | n/a | 0.000 | 0.000 | 1.648 | 201.360 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d0000000000000049 | 203.076 | 0.028 | n/a | 0.000 | 0.000 | 1.145 | 201.627 | 0.129 | n/a | 0.084 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d000000000000001b | 203.033 | 0.058 | n/a | 0.000 | 0.000 | 0.965 | 201.786 | 0.015 | n/a | 0.064 | 0.000 | n/a | n/a | 0.145 | 0.058 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.817 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.713 | 200.907 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 |
| p99 | 205.951 | n/a | n/a | n/a | 0.120 | n/a | 0.000 | 0.000 | 3.844 | 204.994 | 6.006 | n/a | 1.394 | 0.000 | n/a | n/a | 0.182 | 0.120 | 0.001 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d000000000000007c | 205.951 | 0.049 | n/a | 0.000 | 0.000 | 0.621 | 204.994 | 0.021 | n/a | 0.186 | 0.000 | n/a | n/a | 0.080 | 0.049 | 0.000 | 0.080 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000000c8 | 205.693 | 0.060 | n/a | 0.000 | 0.000 | 0.833 | 204.532 | 0.029 | n/a | 0.068 | 0.000 | n/a | n/a | 0.170 | 0.060 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000000c6 | 205.305 | 0.040 | n/a | 0.000 | 0.000 | 0.701 | 204.405 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000092 | 204.985 | 0.028 | n/a | 0.000 | 0.000 | 3.844 | 200.975 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.066 | 0.028 | 0.000 | 0.066 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000000ab | 204.726 | 0.064 | n/a | 0.000 | 0.000 | 3.095 | 201.323 | 0.015 | n/a | 0.113 | 0.000 | n/a | n/a | 0.116 | 0.064 | 0.000 | 0.116 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000061 | 204.585 | 0.035 | n/a | 0.000 | 0.000 | 1.845 | 202.469 | 0.014 | n/a | 0.151 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000068 | 204.252 | 0.036 | n/a | 0.000 | 0.000 | 3.301 | 200.741 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d000000000000009c | 204.159 | 0.040 | n/a | 0.000 | 0.000 | 2.912 | 200.975 | 0.011 | n/a | 0.139 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d0000000000000079 | 204.077 | 0.039 | n/a | 0.000 | 0.000 | 0.637 | 203.228 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.072 | 0.039 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000066 | 204.011 | 0.025 | n/a | 0.000 | 0.000 | 1.496 | 202.151 | 0.052 | n/a | 0.222 | 0.000 | n/a | n/a | 0.065 | 0.025 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d000000000000008f | 203.785 | 0.031 | n/a | 0.000 | 0.000 | 0.688 | 202.898 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d00000000000000c1 | 203.251 | 0.028 | n/a | 0.000 | 0.000 | 0.688 | 202.255 | 0.017 | n/a | 0.212 | 0.000 | n/a | n/a | 0.051 | 0.028 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000000ba | 203.146 | 0.031 | n/a | 0.000 | 0.000 | 0.893 | 201.847 | 0.048 | n/a | 0.253 | 0.000 | n/a | n/a | 0.074 | 0.031 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d00000000000000a2 | 203.093 | 0.029 | n/a | 0.000 | 0.000 | 2.167 | 200.730 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d000000000000005f | 203.068 | 0.025 | n/a | 0.000 | 0.000 | 1.558 | 201.258 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.066 | 0.025 | 0.000 | 0.066 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d000000000000006c | 203.055 | 0.040 | n/a | 0.000 | 0.000 | 0.839 | 201.950 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.106 | 0.040 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d00000000000000b2 | 203.054 | 0.036 | n/a | 0.000 | 0.000 | 0.962 | 201.788 | 0.011 | n/a | 0.151 | 0.000 | n/a | n/a | 0.106 | 0.036 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d00000000000000b4 | 203.019 | 0.065 | n/a | 0.000 | 0.000 | 1.401 | 201.233 | 0.011 | n/a | 0.127 | 0.000 | n/a | n/a | 0.182 | 0.065 | 0.000 | 0.182 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000081 | 202.678 | 0.052 | n/a | 0.000 | 0.000 | 1.047 | 201.309 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.131 | 0.052 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d00000000000000bc | 202.594 | 0.032 | n/a | 0.000 | 0.000 | 0.562 | 201.658 | 0.064 | n/a | 0.205 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.566 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.677 | 200.720 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.072 | 0.039 | 0.000 | 0.072 |
| p99 | 207.447 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 4.196 | 206.013 | 6.534 | n/a | 0.156 | 0.000 | n/a | n/a | 0.252 | 0.096 | 0.001 | 0.252 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d00000000000000db | 207.447 | 0.038 | n/a | 0.000 | 0.000 | 1.233 | 206.013 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d00000000000000d1 | 205.815 | 0.025 | n/a | 0.000 | 0.000 | 4.196 | 201.408 | 0.012 | n/a | 0.114 | 0.000 | n/a | n/a | 0.059 | 0.025 | 0.000 | 0.059 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000000ea | 205.097 | 0.039 | n/a | 0.000 | 0.000 | 0.729 | 204.187 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.051 | 0.039 | 0.000 | 0.051 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000106 | 205.073 | 0.055 | n/a | 0.000 | 0.000 | 0.706 | 204.014 | 0.013 | n/a | 0.153 | 0.000 | n/a | n/a | 0.133 | 0.055 | 0.000 | 0.133 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d000000000000012c | 205.002 | 0.049 | n/a | 0.000 | 0.000 | 0.987 | 203.766 | 0.015 | n/a | 0.073 | 0.000 | n/a | n/a | 0.113 | 0.049 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d00000000000000e8 | 204.972 | 0.024 | n/a | 0.000 | 0.000 | 0.670 | 204.132 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.073 | 0.024 | 0.000 | 0.073 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d00000000000000e9 | 203.965 | 0.026 | n/a | 0.000 | 0.000 | 0.417 | 203.366 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.064 | 0.026 | 0.000 | 0.064 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d00000000000000f4 | 203.647 | 0.030 | n/a | 0.000 | 0.000 | 0.644 | 202.734 | 0.063 | n/a | 0.106 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d00000000000000dc | 203.516 | 0.046 | n/a | 0.000 | 0.000 | 0.467 | 196.345 | 6.534 | n/a | 0.068 | 0.000 | n/a | n/a | 0.056 | 0.046 | 0.000 | 0.056 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d00000000000000fb | 203.411 | 0.026 | n/a | 0.000 | 0.000 | 1.249 | 201.905 | 0.013 | n/a | 0.156 | 0.000 | n/a | n/a | 0.062 | 0.026 | 0.000 | 0.062 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d00000000000000fa | 203.227 | 0.025 | n/a | 0.000 | 0.000 | 2.005 | 201.080 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.050 | 0.025 | 0.000 | 0.050 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000100 | 202.899 | 0.062 | n/a | 0.000 | 0.000 | 1.892 | 200.750 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.143 | 0.062 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d00000000000000e3 | 202.891 | 0.019 | n/a | 0.000 | 0.000 | 0.361 | 202.345 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.052 | 0.019 | 0.000 | 0.052 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d00000000000000f1 | 202.762 | 0.026 | n/a | 0.000 | 0.000 | 0.500 | 202.073 | 0.018 | n/a | 0.085 | 0.000 | n/a | n/a | 0.061 | 0.026 | 0.000 | 0.061 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000000d2 | 202.545 | 0.053 | n/a | 0.000 | 0.000 | 0.874 | 201.440 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.133 | 0.053 | 0.000 | 0.133 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000127 | 202.521 | 0.048 | n/a | 0.000 | 0.000 | 1.086 | 201.182 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.116 | 0.048 | 0.000 | 0.116 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d00000000000000d7 | 202.514 | 0.055 | n/a | 0.000 | 0.000 | 1.268 | 200.949 | 0.019 | n/a | 0.072 | 0.000 | n/a | n/a | 0.151 | 0.055 | 0.000 | 0.151 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000119 | 202.497 | 0.053 | n/a | 0.000 | 0.000 | 0.962 | 201.202 | 0.014 | n/a | 0.147 | 0.000 | n/a | n/a | 0.119 | 0.053 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000000f6 | 202.496 | 0.064 | n/a | 0.000 | 0.000 | 0.865 | 201.323 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.111 | 0.064 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| a5a36f951c031c6d000000000000011a | 202.427 | 0.043 | n/a | 0.000 | 0.000 | 0.943 | 201.238 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.109 | 0.043 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.517 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.689 | 200.733 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.074 | 0.038 | 0.000 | 0.074 |
| p99 | 204.769 | n/a | n/a | n/a | 0.122 | n/a | 0.000 | 0.000 | 2.985 | 202.317 | 2.327 | n/a | 0.172 | 0.000 | n/a | n/a | 0.188 | 0.122 | 0.001 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d000000000000013f | 204.769 | 0.057 | n/a | 0.000 | 0.000 | 2.985 | 201.497 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.125 | 0.057 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d000000000000013d | 203.910 | 0.050 | n/a | 0.000 | 0.000 | 2.188 | 201.439 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.123 | 0.050 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000144 | 203.295 | 0.052 | n/a | 0.000 | 0.000 | 0.749 | 202.317 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000139 | 202.993 | 0.039 | n/a | 0.000 | 0.000 | 1.076 | 201.644 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.102 | 0.039 | 0.000 | 0.102 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000174 | 202.885 | 0.046 | n/a | 0.000 | 0.000 | 0.849 | 201.708 | 0.018 | n/a | 0.172 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d000000000000014c | 202.884 | 0.040 | n/a | 0.000 | 0.000 | 0.782 | 201.890 | 0.025 | n/a | 0.060 | 0.000 | n/a | n/a | 0.087 | 0.040 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000133 | 202.823 | 0.038 | n/a | 0.000 | 0.000 | 0.999 | 201.567 | 0.025 | n/a | 0.107 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d000000000000016d | 202.796 | 0.042 | n/a | 0.000 | 0.000 | 1.061 | 201.469 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000194 | 202.766 | 0.080 | n/a | 0.000 | 0.000 | 0.900 | 201.592 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.103 | 0.080 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000165 | 202.755 | 0.029 | n/a | 0.000 | 0.000 | 0.672 | 201.910 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d0000000000000157 | 202.702 | 0.070 | n/a | 0.000 | 0.000 | 1.093 | 201.281 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.154 | 0.070 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d000000000000015f | 202.411 | 0.067 | n/a | 0.000 | 0.000 | 1.141 | 201.029 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.082 | 0.067 | 0.000 | 0.082 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000168 | 202.381 | 0.025 | n/a | 0.000 | 0.000 | 1.288 | 200.945 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.058 | 0.025 | 0.000 | 0.058 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d000000000000015b | 202.321 | 0.035 | n/a | 0.000 | 0.000 | 0.760 | 201.344 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d0000000000000141 | 202.287 | 0.022 | n/a | 0.000 | 0.000 | 0.538 | 201.523 | 0.013 | n/a | 0.146 | 0.000 | n/a | n/a | 0.046 | 0.022 | 0.000 | 0.046 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d000000000000017d | 202.190 | 0.043 | n/a | 0.000 | 0.000 | 1.224 | 200.737 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.107 | 0.043 | 0.000 | 0.107 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000132 | 202.107 | 0.035 | n/a | 0.000 | 0.000 | 0.981 | 200.956 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d000000000000018c | 202.103 | 0.030 | n/a | 0.000 | 0.000 | 0.539 | 201.404 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000199 | 202.095 | 0.027 | n/a | 0.000 | 0.000 | 0.757 | 201.194 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.052 | 0.027 | 0.000 | 0.052 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000167 | 202.047 | 0.034 | n/a | 0.000 | 0.000 | 0.623 | 201.229 | 0.005 | n/a | 0.092 | 0.000 | n/a | n/a | 0.064 | 0.034 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.393 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.621 | 200.685 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.070 | 0.042 | 0.000 | 0.070 |
| p99 | 204.815 | n/a | n/a | n/a | 0.114 | n/a | 0.000 | 0.000 | 2.264 | 202.307 | 3.361 | n/a | 0.137 | 0.000 | n/a | n/a | 0.187 | 0.114 | 0.001 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d00000000000001de | 205.846 | 0.040 | n/a | 0.000 | 0.000 | 0.943 | 204.653 | 0.007 | n/a | 0.119 | 0.000 | n/a | n/a | 0.084 | 0.040 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000001d8 | 204.815 | 0.034 | n/a | 0.000 | 0.000 | 3.903 | 200.749 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d00000000000001e3 | 202.961 | 0.125 | n/a | 0.000 | 0.000 | 0.991 | 201.476 | 0.012 | n/a | 0.137 | 0.000 | n/a | n/a | 0.219 | 0.125 | 0.001 | 0.219 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000001c6 | 202.932 | 0.054 | n/a | 0.000 | 0.000 | 1.691 | 200.988 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.130 | 0.054 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d00000000000001dd | 202.908 | 0.067 | n/a | 0.000 | 0.000 | 1.156 | 201.417 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.149 | 0.067 | 0.000 | 0.149 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000202 | 202.862 | 0.062 | n/a | 0.000 | 0.000 | 2.147 | 200.470 | 0.012 | n/a | 0.038 | 0.000 | n/a | n/a | 0.133 | 0.062 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d00000000000001e0 | 202.785 | 0.026 | n/a | 0.000 | 0.000 | 0.355 | 202.307 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.060 | 0.026 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000001d4 | 202.477 | 0.076 | n/a | 0.000 | 0.000 | 1.313 | 200.897 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.118 | 0.076 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000001b4 | 202.440 | 0.038 | n/a | 0.000 | 0.000 | 0.525 | 201.738 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000001ec | 202.392 | 0.049 | n/a | 0.000 | 0.000 | 0.742 | 201.374 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.109 | 0.049 | 0.000 | 0.109 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d000000000000019f | 202.292 | 0.045 | n/a | 0.000 | 0.000 | 1.054 | 201.026 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.114 | 0.045 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d00000000000001c4 | 202.238 | 0.059 | n/a | 0.000 | 0.000 | 0.949 | 201.024 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.132 | 0.059 | 0.000 | 0.132 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d00000000000001a8 | 202.170 | 0.048 | n/a | 0.000 | 0.000 | 1.440 | 200.500 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.130 | 0.048 | 0.000 | 0.130 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d00000000000001a1 | 202.160 | 0.028 | n/a | 0.000 | 0.000 | 0.932 | 201.048 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.054 | 0.028 | 0.000 | 0.054 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d00000000000001b5 | 202.078 | 0.054 | n/a | 0.000 | 0.000 | 0.963 | 200.870 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.128 | 0.054 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d000000000000019c | 202.063 | 0.059 | n/a | 0.000 | 0.000 | 0.876 | 200.921 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.131 | 0.059 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000203 | 202.038 | 0.039 | n/a | 0.000 | 0.000 | 0.948 | 200.891 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000001f9 | 202.001 | 0.047 | n/a | 0.000 | 0.000 | 0.872 | 200.892 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.119 | 0.047 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d00000000000001cc | 201.992 | 0.033 | n/a | 0.000 | 0.000 | 0.643 | 201.138 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.094 | 0.033 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d00000000000001a4 | 201.958 | 0.041 | n/a | 0.000 | 0.000 | 0.611 | 201.174 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.405 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.585 | 200.658 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.068 | 0.039 | 0.000 | 0.068 |
| p99 | 204.476 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 3.195 | 203.849 | 1.931 | n/a | 0.104 | 0.000 | n/a | n/a | 0.136 | 0.083 | 0.001 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d000000000000021e | 204.757 | 0.027 | n/a | 0.000 | 0.000 | 0.438 | 204.171 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.047 | 0.027 | 0.000 | 0.047 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000263 | 204.476 | 0.037 | n/a | 0.000 | 0.000 | 0.439 | 203.849 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.061 | 0.037 | 0.000 | 0.061 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d000000000000022e | 204.310 | 0.035 | n/a | 0.000 | 0.000 | 0.506 | 203.653 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.068 | 0.035 | 0.000 | 0.068 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d000000000000025b | 203.800 | 0.031 | n/a | 0.000 | 0.000 | 3.195 | 200.473 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000223 | 203.292 | 0.053 | n/a | 0.000 | 0.000 | 0.652 | 202.400 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.152 | 0.053 | 0.000 | 0.152 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000252 | 202.974 | 0.023 | n/a | 0.000 | 0.000 | 0.841 | 201.895 | 0.013 | n/a | 0.154 | 0.000 | n/a | n/a | 0.046 | 0.023 | 0.000 | 0.046 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000279 | 202.696 | 0.040 | n/a | 0.000 | 0.000 | 1.125 | 201.336 | 0.005 | n/a | 0.088 | 0.000 | n/a | n/a | 0.102 | 0.040 | 0.000 | 0.102 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d000000000000023b | 202.440 | 0.049 | n/a | 0.000 | 0.000 | 1.145 | 201.044 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.098 | 0.049 | 0.000 | 0.098 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000221 | 202.359 | 0.034 | n/a | 0.000 | 0.000 | 0.390 | 201.811 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.063 | 0.034 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000234 | 202.268 | 0.038 | n/a | 0.000 | 0.000 | 0.649 | 201.416 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000257 | 202.251 | 0.045 | n/a | 0.000 | 0.000 | 0.854 | 201.134 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.103 | 0.045 | 0.000 | 0.103 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000244 | 202.164 | 0.041 | n/a | 0.000 | 0.000 | 0.853 | 201.093 | 0.017 | n/a | 0.087 | 0.000 | n/a | n/a | 0.073 | 0.041 | 0.000 | 0.073 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d000000000000022c | 202.156 | 0.037 | n/a | 0.000 | 0.000 | 0.586 | 201.336 | 0.028 | n/a | 0.093 | 0.000 | n/a | n/a | 0.077 | 0.037 | 0.000 | 0.077 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000239 | 202.121 | 0.034 | n/a | 0.000 | 0.000 | 0.462 | 201.490 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d000000000000022a | 202.116 | 0.040 | n/a | 0.000 | 0.000 | 0.913 | 201.006 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d000000000000026a | 202.008 | 0.027 | n/a | 0.000 | 0.000 | 0.586 | 201.227 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d000000000000024c | 201.925 | 0.053 | n/a | 0.000 | 0.000 | 0.910 | 200.799 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.113 | 0.053 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000272 | 201.917 | 0.034 | n/a | 0.000 | 0.000 | 0.476 | 201.213 | 0.016 | n/a | 0.092 | 0.000 | n/a | n/a | 0.086 | 0.034 | 0.000 | 0.086 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000269 | 201.911 | 0.030 | n/a | 0.000 | 0.000 | 0.704 | 201.042 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000235 | 201.905 | 0.035 | n/a | 0.000 | 0.000 | 0.615 | 201.087 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 | gw-r/thread-62/journal/page | none observed |

## P3 / L1024 / read (67 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.612 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.537 | 72.831 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.064 | 0.046 | 0.001 | 0.064 |
| p99 | 202.153 | n/a | n/a | n/a | 0.099 | n/a | 0.000 | 0.000 | 11.139 | 201.266 | 2.333 | n/a | 0.087 | 0.000 | n/a | n/a | 0.152 | 0.099 | 0.001 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d0000000000000299 | 202.153 | 0.031 | n/a | 0.000 | 0.000 | 0.728 | 201.266 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.049 | 0.031 | 0.000 | 0.049 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d000000000000028e | 202.001 | 0.036 | n/a | 0.000 | 0.000 | 0.713 | 201.070 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.084 | 0.036 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000283 | 201.781 | 0.036 | n/a | 0.000 | 0.000 | 0.665 | 200.953 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.066 | 0.036 | 0.000 | 0.066 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000280 | 201.764 | 0.069 | n/a | 0.000 | 0.000 | 0.816 | 200.688 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.137 | 0.069 | 0.000 | 0.137 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000294 | 201.732 | 0.063 | n/a | 0.000 | 0.000 | 0.787 | 200.688 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.152 | 0.063 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d0000000000000291 | 201.691 | 0.061 | n/a | 0.000 | 0.000 | 0.792 | 200.651 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.132 | 0.061 | 0.000 | 0.132 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000282 | 201.626 | 0.043 | n/a | 0.000 | 0.000 | 0.665 | 200.725 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.134 | 0.043 | 0.000 | 0.134 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000297 | 201.500 | 0.037 | n/a | 0.000 | 0.000 | 0.670 | 200.667 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d000000000000028d | 201.356 | 0.022 | n/a | 0.000 | 0.000 | 0.537 | 200.715 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.047 | 0.022 | 0.000 | 0.047 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000288 | 201.355 | 0.030 | n/a | 0.000 | 0.000 | 0.424 | 200.783 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.062 | 0.030 | 0.000 | 0.062 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000287 | 201.353 | 0.039 | n/a | 0.000 | 0.000 | 0.500 | 200.666 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.097 | 0.039 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000292 | 201.352 | 0.028 | n/a | 0.000 | 0.000 | 0.468 | 200.745 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d000000000000028c | 201.300 | 0.031 | n/a | 0.000 | 0.000 | 0.498 | 200.661 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000281 | 201.282 | 0.025 | n/a | 0.000 | 0.000 | 0.470 | 200.666 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.064 | 0.025 | 0.000 | 0.064 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000298 | 201.276 | 0.031 | n/a | 0.000 | 0.000 | 0.425 | 200.706 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.061 | 0.031 | 0.000 | 0.061 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000296 | 201.265 | 0.044 | n/a | 0.000 | 0.000 | 0.594 | 200.507 | 0.014 | n/a | 0.029 | 0.000 | n/a | n/a | 0.076 | 0.044 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000293 | 201.208 | 0.024 | n/a | 0.000 | 0.000 | 0.379 | 200.700 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.051 | 0.024 | 0.000 | 0.051 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000286 | 201.195 | 0.032 | n/a | 0.000 | 0.000 | 0.449 | 200.603 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d000000000000028a | 179.072 | 0.038 | n/a | 0.000 | 0.000 | 0.412 | 178.528 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.051 | 0.038 | 0.000 | 0.051 | gw-r/thread-46/journal/page | none observed |
| a5a36f951c031c6d0000000000000289 | 165.367 | 0.068 | n/a | 0.000 | 0.000 | 0.800 | 164.401 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.077 | 0.068 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / read (222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.541 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.448 | 83.924 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.056 | 0.037 | 0.000 | 0.056 |
| p99 | 204.350 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 3.726 | 201.289 | 1.166 | n/a | 0.088 | 0.000 | n/a | n/a | 0.145 | 0.094 | 0.002 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a5a36f951c031c6d0000000000000eee | 207.106 | 0.027 | n/a | 0.000 | 0.000 | 1.571 | 205.397 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000ee4 | 205.198 | 0.061 | n/a | 0.000 | 0.000 | 3.726 | 201.125 | 0.050 | n/a | 0.096 | 0.000 | n/a | n/a | 0.139 | 0.061 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000f1d | 204.350 | 0.021 | n/a | 0.000 | 0.000 | 3.733 | 200.504 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.054 | 0.021 | 0.000 | 0.054 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000eed | 204.285 | 0.037 | n/a | 0.000 | 0.000 | 0.423 | 203.683 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.093 | 0.037 | 0.000 | 0.093 | gw-r/thread-66/journal/page | none observed |
| a5a36f951c031c6d0000000000000ee1 | 202.219 | 0.025 | n/a | 0.000 | 0.000 | 1.294 | 200.771 | 0.018 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 0.025 | 0.000 | 0.059 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000f23 | 202.209 | 0.023 | n/a | 0.000 | 0.000 | 1.498 | 200.557 | 0.037 | n/a | 0.041 | 0.000 | n/a | n/a | 0.054 | 0.023 | 0.000 | 0.054 | gw-r/thread-47/journal/page | none observed |
| a5a36f951c031c6d0000000000000ef7 | 201.981 | 0.024 | n/a | 0.000 | 0.000 | 1.160 | 200.676 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.054 | 0.024 | 0.000 | 0.054 | gw-r/thread-66/journal/page | none observed |
| a5a36f951c031c6d0000000000000f13 | 201.957 | 0.059 | n/a | 0.000 | 0.000 | 1.025 | 200.688 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.152 | 0.059 | 0.000 | 0.152 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000f25 | 201.947 | 0.041 | n/a | 0.000 | 0.000 | 0.951 | 200.836 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.065 | 0.041 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000edd | 201.909 | 0.037 | n/a | 0.000 | 0.000 | 0.430 | 201.289 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.075 | 0.037 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000f1f | 201.808 | 0.034 | n/a | 0.000 | 0.000 | 0.762 | 200.870 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.088 | 0.034 | 0.000 | 0.088 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000ec0 | 201.803 | 0.043 | n/a | 0.000 | 0.000 | 0.598 | 201.019 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.000 | 0.074 | gw-r/thread-62/journal/page | none observed |
| a5a36f951c031c6d0000000000000eb8 | 201.797 | 0.022 | n/a | 0.000 | 0.000 | 0.510 | 201.116 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.050 | 0.022 | 0.000 | 0.050 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000f28 | 201.796 | 0.022 | n/a | 0.000 | 0.000 | 1.252 | 200.433 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.054 | 0.022 | 0.000 | 0.054 | gw-r/thread-45/journal/page | none observed |
| a5a36f951c031c6d0000000000000edc | 201.684 | 0.055 | n/a | 0.000 | 0.000 | 0.829 | 200.608 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.161 | 0.055 | 0.000 | 0.161 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000edb | 201.680 | 0.026 | n/a | 0.000 | 0.000 | 0.503 | 200.986 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.062 | 0.026 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000ebb | 201.677 | 0.021 | n/a | 0.000 | 0.000 | 0.424 | 201.100 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.053 | 0.021 | 0.000 | 0.053 | gw-r/thread-44/journal/page | none observed |
| a5a36f951c031c6d0000000000000ee9 | 201.667 | 0.049 | n/a | 0.000 | 0.000 | 0.770 | 200.676 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.120 | 0.049 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| a5a36f951c031c6d0000000000000eef | 201.661 | 0.022 | n/a | 0.000 | 0.000 | 0.411 | 201.108 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.047 | 0.022 | 0.000 | 0.047 | gw-r/thread-41/journal/page | none observed |
| a5a36f951c031c6d0000000000000ecf | 201.657 | 0.051 | n/a | 0.000 | 0.000 | 0.532 | 200.873 | 0.015 | n/a | 0.069 | 0.000 | n/a | n/a | 0.118 | 0.051 | 0.000 | 0.118 | gw-r/thread-41/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
