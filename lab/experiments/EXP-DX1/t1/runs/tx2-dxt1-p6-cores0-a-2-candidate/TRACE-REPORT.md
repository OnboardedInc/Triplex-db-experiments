# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (61.154 ms, trace `5a2d7a1cf191fe12000000000000127e`); `tx/thread-87/transactor.triplex-function` (24.605 ms, trace `5a2d7a1cf191fe1200000000000001ee`); `gw-w/thread-46/gateway.admitted-work` (53.053 ms, trace `5a2d7a1cf191fe120000000000000209`); `node-14/thread-0/driver.queue.scheduler-late` (57.241 ms, trace `5a2d7a1cf191fe12000000000000127f`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (66.458 ms, trace `5a2d7a1cf191fe1200000000000016df`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cores0-a-2-candidate`; source `7629065bb0a0221b3ec27af2f5a6f030bd33487f`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17857945.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 205 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13364.618 | 544.618 | 12.023 | 454 |
| L1 | 0 | 19972.747 | 350.084 | 5.963 | 668 |
| L4 | 0 | 19363.220 | 313.540 | 5.580 | 625 |
| L16 | 0 | 19979.890 | 337.735 | 13.071 | 686 |
| L64 | 0 | 19842.438 | 349.862 | 7.446 | 847 |
| L256 | 0 | 19972.131 | 461.365 | 7.090 | 708 |
| L1024 | 0 | 19908.097 | 3199.125 | 23.975 | 16843 |
| tail | 0 | 64689.465 | 10103.555 | 78.234 | 53116 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000127e | driver.queue.scheduler-late | 61.154 | none | 0 / 32 |
| 5a2d7a1cf191fe12000000000000127e | driver.queue.scheduler-dispatch | 0.059 | none | 0 / 32 |

Observed active steps while trace 5a2d7a1cf191fe12000000000000127e waited: []

| 5a2d7a1cf191fe1200000000000001ee | driver.queue.scheduler-late | 0.865 | none | 0 / 32 |
| 5a2d7a1cf191fe1200000000000001ee | driver.queue.scheduler-dispatch | 0.072 | none | 0 / 32 |

Observed active steps while trace 5a2d7a1cf191fe1200000000000001ee waited: []

| 5a2d7a1cf191fe120000000000000209 | driver.queue.scheduler-dispatch | 0.042 | none | 0 / 32 |
| 5a2d7a1cf191fe120000000000000209 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 5a2d7a1cf191fe120000000000000209 waited: []

| 5a2d7a1cf191fe12000000000000127f | driver.queue.scheduler-late | 57.241 | none | 1 / 32 |
| 5a2d7a1cf191fe12000000000000127f | driver.queue.scheduler-dispatch | 0.013 | none | 1 / 32 |

Observed active steps while trace 5a2d7a1cf191fe12000000000000127f waited: []

| 5a2d7a1cf191fe1200000000000016df | driver.queue.scheduler-late | 0.157 | none | 0 / 32 |
| 5a2d7a1cf191fe1200000000000016df | driver.queue.scheduler-dispatch | 0.094 | none | 0 / 32 |

Observed active steps while trace 5a2d7a1cf191fe1200000000000016df waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.171 | 0.360 | 0.000 | 0.508 | 4.496 | 0.674 | 0.000 | 0.169 | 1.585 | 6.931 | 0.032 | n/a | 0.346 | 8.688 | 3.985 | n/a | 0.030 | 5.011 | 0.204 | 0.030 |
| p99 | 58.160 | 3.997 | 0.041 | 6.969 | 13.759 | n/a | 4.295 | 0.971 | 3.993 | 26.248 | 0.160 | n/a | 3.635 | 17.910 | 6.741 | n/a | 0.234 | 16.818 | 0.425 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000000f2 | 58.160 | 13.759 | 0.674 | 0.000 | 0.067 | 2.601 | 17.564 | 0.160 | n/a | 0.255 | 17.910 | 5.145 | n/a | 0.025 | 14.500 | 0.249 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 5a2d7a1cf191fe1200000000000000fc | 48.566 | 6.648 | 0.463 | 2.994 | 0.200 | 3.499 | 12.864 | 0.073 | n/a | 0.103 | 17.385 | 4.279 | n/a | 0.057 | 10.306 | 0.212 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 5a2d7a1cf191fe1200000000000000f6 | 47.658 | 4.652 | 0.241 | 0.000 | 0.118 | 1.598 | 26.248 | 0.038 | n/a | 1.625 | 9.034 | 4.052 | n/a | 0.052 | 5.011 | 0.105 | 0.052 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000000ef | 43.341 | 11.792 | n/a | 4.295 | 0.731 | 0.852 | 5.839 | 0.041 | n/a | 0.116 | 14.982 | 4.460 | n/a | 0.234 | 16.818 | 0.388 | 0.234 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000102 | 42.824 | 6.285 | 0.196 | 0.000 | 0.088 | 1.405 | 17.162 | 0.085 | n/a | 0.377 | 11.042 | 6.150 | n/a | 0.033 | 6.569 | 0.153 | 0.033 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.017ms |
| 5a2d7a1cf191fe12000000000000011c | 37.410 | 4.010 | 0.219 | 0.000 | 0.169 | 1.794 | 17.437 | 0.050 | n/a | 0.175 | 7.414 | 6.091 | n/a | 0.052 | 4.398 | 0.118 | 0.052 | gw-w/thread-40/gateway.admitted-work | driver.reader-basis.broadcast 0.034ms |
| 5a2d7a1cf191fe12000000000000010a | 35.936 | 7.851 | 0.158 | 0.000 | 0.073 | 1.681 | 7.891 | 0.032 | n/a | 3.332 | 9.037 | 5.857 | n/a | 0.024 | 8.082 | 0.225 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 5a2d7a1cf191fe120000000000000120 | 34.978 | 5.641 | 0.171 | 0.000 | 0.070 | 1.499 | 12.277 | 0.029 | n/a | 0.346 | 8.177 | 6.741 | n/a | 0.025 | 5.883 | 0.168 | 0.025 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.028ms |
| 5a2d7a1cf191fe1200000000000000fa | 33.866 | 4.236 | 0.323 | 0.000 | 0.110 | 2.130 | 13.616 | 0.054 | n/a | 0.968 | 8.693 | 3.700 | n/a | 0.035 | 4.669 | 0.138 | 0.035 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.022ms |
| 5a2d7a1cf191fe120000000000000118 | 33.213 | 3.711 | 0.281 | 0.000 | 0.049 | 1.775 | 11.157 | 0.042 | n/a | 2.290 | 8.688 | 5.195 | n/a | 0.024 | 4.041 | 0.122 | 0.024 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe12000000000000010e | 31.919 | 4.496 | 0.234 | 0.000 | 0.066 | 1.749 | 11.367 | 0.044 | n/a | 0.462 | 9.493 | 3.985 | n/a | 0.023 | 4.796 | 0.150 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000114 | 31.347 | 6.119 | 0.225 | 0.000 | 0.062 | 2.029 | 12.782 | 0.070 | n/a | 0.572 | 5.772 | 3.692 | n/a | 0.024 | 6.406 | 0.204 | 0.024 | gw-w/thread-40/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000124 | 30.300 | 5.693 | 0.216 | 0.000 | 0.108 | 1.696 | 9.392 | 0.032 | n/a | 0.304 | 8.864 | 3.960 | n/a | 0.035 | 6.018 | 0.199 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000010c | 29.660 | 5.002 | 0.287 | 0.000 | 0.070 | 1.671 | 16.763 | 0.048 | n/a | 0.106 | 5.069 | 0.622 | n/a | 0.022 | 5.359 | 0.181 | 0.022 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000116 | 29.171 | 8.417 | n/a | 3.290 | 0.676 | 0.862 | 2.497 | 0.070 | n/a | 0.171 | 8.938 | 4.213 | n/a | 0.036 | 12.383 | 0.425 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000104 | 28.842 | 4.476 | 0.303 | 0.000 | 0.065 | 1.585 | 6.931 | 0.029 | n/a | 0.100 | 10.809 | 4.519 | n/a | 0.025 | 4.844 | 0.168 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000011e | 28.597 | 3.174 | n/a | 0.000 | 0.338 | 1.416 | 9.466 | 0.037 | n/a | 0.105 | 7.687 | 6.332 | n/a | 0.042 | 3.512 | 0.123 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000000f8 | 28.069 | 5.812 | n/a | 0.000 | 0.278 | 1.075 | 3.301 | 0.021 | n/a | 3.635 | 9.687 | 4.190 | n/a | 0.070 | 6.090 | 0.217 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000100 | 26.647 | 6.106 | n/a | 3.313 | 0.249 | 1.692 | 2.957 | 0.056 | n/a | 0.927 | 7.537 | 3.781 | n/a | 0.030 | 9.668 | 0.363 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000106 | 26.342 | 5.378 | n/a | 2.656 | 0.413 | 0.756 | 1.934 | 0.022 | n/a | 0.093 | 13.844 | 1.225 | n/a | 0.021 | 8.448 | 0.321 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.136 | 0.873 | 0.000 | 0.591 | 3.114 | n/a | 0.000 | 0.673 | 1.075 | 1.478 | 0.023 | n/a | 0.400 | 6.933 | 1.296 | n/a | 0.032 | 3.512 | 0.247 | 0.032 |
| p99 | 28.597 | 2.126 | 0.000 | 1.874 | 5.812 | n/a | 2.692 | 0.971 | 3.993 | 9.466 | 0.037 | n/a | 3.635 | 9.687 | 6.332 | n/a | 0.070 | 6.718 | 0.342 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000011e | 28.597 | 3.174 | n/a | 0.000 | 0.338 | 1.416 | 9.466 | 0.037 | n/a | 0.105 | 7.687 | 6.332 | n/a | 0.042 | 3.512 | 0.123 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000000f8 | 28.069 | 5.812 | n/a | 0.000 | 0.278 | 1.075 | 3.301 | 0.021 | n/a | 3.635 | 9.687 | 4.190 | n/a | 0.070 | 6.090 | 0.217 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000112 | 19.952 | 2.331 | n/a | 0.000 | 0.785 | 0.653 | 5.460 | 0.024 | n/a | 0.299 | 6.933 | 3.446 | n/a | 0.020 | 3.116 | 0.156 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 5a2d7a1cf191fe120000000000000122 | 19.622 | 3.114 | n/a | 2.692 | 0.912 | 1.175 | 1.478 | 0.029 | n/a | 0.905 | 7.933 | 1.354 | n/a | 0.030 | 6.718 | 0.342 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000000f4 | 16.136 | 3.516 | n/a | 0.000 | 0.472 | 3.993 | 1.485 | 0.023 | n/a | 0.499 | 5.225 | 0.892 | n/a | 0.033 | 3.988 | 0.247 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 5a2d7a1cf191fe12000000000000011a | 16.119 | 3.674 | n/a | 0.000 | 0.673 | 1.570 | 1.430 | 0.024 | n/a | 0.396 | 7.689 | 0.626 | n/a | 0.036 | 4.347 | 0.270 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000110 | 13.406 | 2.305 | n/a | 0.000 | 0.697 | 0.995 | 1.285 | 0.023 | n/a | 0.529 | 6.256 | 1.296 | n/a | 0.019 | 3.002 | 0.224 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000125 | 13.214 | 1.839 | n/a | 1.478 | 0.107 | 0.747 | 1.471 | 0.020 | n/a | 0.076 | 6.377 | 1.073 | n/a | 0.026 | 3.424 | 0.259 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000000fd | 10.658 | 2.154 | n/a | 0.000 | 0.971 | 0.681 | 1.449 | 0.018 | n/a | 0.400 | 4.423 | 0.529 | n/a | 0.032 | 3.125 | 0.293 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.286 | 0.000 | 0.000 | 0.361 | 3.480 | 0.199 | 0.232 | 0.144 | 1.199 | 7.576 | 0.030 | n/a | 0.109 | 6.994 | 3.934 | n/a | 0.044 | 4.098 | 0.198 | 0.044 |
| p99 | 30.079 | 0.363 | 0.000 | 0.376 | 5.441 | 1.173 | 0.340 | 0.187 | 1.409 | 10.791 | 0.042 | n/a | 0.522 | 9.411 | 6.329 | n/a | 0.054 | 6.758 | 0.225 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe120000000000000128 | 30.079 | 5.441 | 1.173 | 0.000 | 0.144 | 1.409 | 10.791 | 0.030 | n/a | 0.109 | 6.994 | 3.934 | n/a | 0.054 | 6.758 | 0.225 | 0.054 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000281 | 28.286 | 3.337 | 0.174 | 0.340 | 0.033 | 0.982 | 7.576 | 0.023 | n/a | 0.061 | 9.411 | 6.329 | n/a | 0.020 | 3.884 | 0.137 | 0.020 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001c9 | 20.714 | 3.480 | 0.199 | 0.232 | 0.187 | 1.199 | 5.712 | 0.042 | n/a | 0.522 | 5.396 | 3.700 | n/a | 0.044 | 4.098 | 0.198 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.775 | 0.000 | 0.000 | 0.577 | 3.851 | n/a | 0.000 | 0.127 | 1.142 | 5.308 | 0.029 | n/a | 0.325 | 7.351 | 3.680 | n/a | 0.026 | 4.553 | 0.199 | 0.026 |
| p99 | 49.305 | 1.394 | 0.000 | 1.713 | 6.539 | n/a | 1.603 | 3.142 | 6.020 | 20.801 | 0.114 | n/a | 3.494 | 31.332 | 26.055 | n/a | 0.069 | 7.612 | 0.355 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000013a | 49.305 | 3.705 | n/a | 0.000 | 0.737 | 0.881 | 5.308 | 0.070 | n/a | 0.145 | 31.332 | 7.099 | n/a | 0.029 | 4.442 | 0.090 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 5a2d7a1cf191fe120000000000000178 | 47.613 | 3.170 | 0.164 | 0.340 | 0.052 | 0.987 | 9.368 | 0.029 | n/a | 0.076 | 7.351 | 26.055 | n/a | 0.020 | 3.726 | 0.078 | 0.020 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.054ms |
| 5a2d7a1cf191fe120000000000000132 | 44.538 | 5.512 | 0.185 | 0.505 | 0.075 | 1.776 | 20.801 | 0.047 | n/a | 0.477 | 7.475 | 7.662 | n/a | 0.023 | 6.277 | 0.141 | 0.023 | gw-w/thread-47/gateway.admitted-work | driver.publication.persist-deferred 1.505ms; driver.reader-basis.broadcast 0.035ms |
| 5a2d7a1cf191fe12000000000000015d | 38.183 | 5.487 | 1.678 | 0.404 | 0.043 | 6.020 | 12.925 | 0.031 | n/a | 0.128 | 5.810 | 5.639 | n/a | 0.018 | 7.612 | 0.199 | 0.018 | gw-w/thread-46/gateway.admitted-work | driver.publication.persist-deferred 0.951ms; driver.reader-basis.broadcast 0.047ms |
| 5a2d7a1cf191fe120000000000000131 | 36.176 | 3.064 | n/a | 0.000 | 0.569 | 0.871 | 3.568 | 0.028 | n/a | 0.496 | 19.600 | 7.944 | n/a | 0.035 | 3.634 | 0.100 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000164 | 33.160 | 4.657 | 0.351 | 0.311 | 0.061 | 1.532 | 16.794 | 0.095 | n/a | 0.325 | 8.440 | 0.568 | n/a | 0.026 | 5.380 | 0.162 | 0.026 | gw-w/thread-46/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe12000000000000016a | 33.117 | 5.118 | 0.324 | 0.362 | 0.073 | 1.394 | 6.968 | 0.029 | n/a | 0.076 | 12.716 | 6.033 | n/a | 0.025 | 5.877 | 0.177 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000012c | 32.914 | 4.900 | 0.406 | 0.538 | 0.064 | 1.975 | 8.850 | 0.031 | n/a | 3.494 | 6.647 | 5.984 | n/a | 0.025 | 5.909 | 0.180 | 0.025 | gw-w/thread-42/gateway.admitted-work | driver.reader-basis.broadcast 0.037ms |
| 5a2d7a1cf191fe120000000000000136 | 31.258 | 3.851 | 0.190 | 0.336 | 0.083 | 5.769 | 7.934 | 0.029 | n/a | 0.368 | 6.505 | 6.168 | n/a | 0.026 | 4.460 | 0.143 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000013e | 30.872 | 4.135 | 0.329 | 0.000 | 0.060 | 2.103 | 10.529 | 0.044 | n/a | 0.122 | 9.018 | 4.508 | n/a | 0.026 | 4.524 | 0.147 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000013c | 30.273 | 5.278 | 0.213 | 0.263 | 0.052 | 1.133 | 6.982 | 0.032 | n/a | 0.096 | 10.275 | 5.920 | n/a | 0.029 | 5.806 | 0.192 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000148 | 29.216 | 3.648 | 0.186 | 0.000 | 0.058 | 1.479 | 9.285 | 0.055 | n/a | 0.107 | 7.988 | 6.388 | n/a | 0.023 | 3.891 | 0.133 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000014a | 28.969 | 5.721 | n/a | 0.000 | 0.680 | 1.778 | 3.326 | 0.093 | n/a | 2.324 | 10.441 | 4.538 | n/a | 0.069 | 6.400 | 0.221 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 5a2d7a1cf191fe120000000000000166 | 28.115 | 3.526 | 0.298 | 0.268 | 0.084 | 1.591 | 10.714 | 0.063 | n/a | 0.149 | 8.099 | 3.296 | n/a | 0.027 | 4.176 | 0.149 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000138 | 27.975 | 5.561 | 0.302 | 0.279 | 0.059 | 3.775 | 4.041 | 0.114 | n/a | 0.724 | 11.572 | 1.512 | n/a | 0.037 | 6.201 | 0.222 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000162 | 27.929 | 6.332 | n/a | 0.000 | 0.820 | 1.053 | 1.854 | 0.032 | n/a | 0.200 | 10.544 | 7.037 | n/a | 0.057 | 7.152 | 0.256 | 0.057 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000016e | 27.421 | 4.648 | 0.271 | 0.254 | 0.047 | 1.368 | 6.344 | 0.029 | n/a | 0.090 | 9.521 | 4.829 | n/a | 0.019 | 5.221 | 0.190 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000017a | 26.863 | 6.539 | 0.276 | 0.256 | 0.053 | 1.375 | 8.726 | 0.055 | n/a | 1.525 | 5.724 | 2.309 | n/a | 0.024 | 7.124 | 0.265 | 0.024 | gw-w/thread-42/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000144 | 26.393 | 3.474 | 0.180 | 0.000 | 0.045 | 1.073 | 6.160 | 0.029 | n/a | 0.377 | 9.678 | 5.357 | n/a | 0.020 | 3.698 | 0.140 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000012a | 25.918 | 4.859 | 0.370 | 0.395 | 0.066 | 3.175 | 5.863 | 0.054 | n/a | 0.145 | 7.011 | 3.953 | n/a | 0.025 | 5.690 | 0.220 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.451 | 0.553 | 0.000 | 0.526 | 2.788 | n/a | 0.000 | 0.563 | 0.870 | 1.592 | 0.023 | n/a | 0.496 | 4.935 | 0.527 | n/a | 0.028 | 3.351 | 0.253 | 0.028 |
| p99 | 36.176 | 1.014 | 0.000 | 0.932 | 5.920 | n/a | 0.000 | 0.941 | 4.638 | 7.465 | 0.076 | n/a | 3.091 | 19.600 | 7.944 | n/a | 0.049 | 6.401 | 0.300 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe120000000000000131 | 36.176 | 3.064 | n/a | 0.000 | 0.569 | 0.871 | 3.568 | 0.028 | n/a | 0.496 | 19.600 | 7.944 | n/a | 0.035 | 3.634 | 0.100 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000135 | 21.915 | 5.920 | n/a | 0.000 | 0.481 | 4.638 | 7.465 | 0.076 | n/a | 0.854 | 1.945 | 0.506 | n/a | 0.030 | 6.401 | 0.292 | 0.030 | node-14/thread-0/driver.execute | none observed |
| 5a2d7a1cf191fe12000000000000015a | 19.053 | 3.900 | n/a | 0.000 | 0.238 | 0.867 | 1.287 | 0.023 | n/a | 3.091 | 7.260 | 2.339 | n/a | 0.049 | 4.138 | 0.217 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000146 | 17.509 | 2.569 | n/a | 0.000 | 0.750 | 1.624 | 1.592 | 0.024 | n/a | 0.597 | 6.668 | 3.657 | n/a | 0.028 | 3.319 | 0.190 | 0.028 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000176 | 11.451 | 2.904 | n/a | 0.000 | 0.503 | 0.839 | 1.649 | 0.021 | n/a | 0.106 | 4.935 | 0.478 | n/a | 0.016 | 3.407 | 0.298 | 0.016 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 5a2d7a1cf191fe12000000000000016c | 11.304 | 2.077 | n/a | 0.000 | 0.781 | 0.615 | 1.720 | 0.022 | n/a | 0.412 | 4.975 | 0.675 | n/a | 0.028 | 2.859 | 0.253 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000015f | 11.157 | 2.788 | n/a | 0.000 | 0.563 | 1.528 | 1.581 | 0.044 | n/a | 0.551 | 3.644 | 0.442 | n/a | 0.016 | 3.351 | 0.300 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000150 | 10.750 | 2.097 | n/a | 0.000 | 0.941 | 0.870 | 1.037 | 0.019 | n/a | 0.407 | 4.827 | 0.527 | n/a | 0.025 | 3.037 | 0.283 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.150 | 0.292 | 0.000 | 0.529 | 3.539 | 0.340 | 0.000 | 0.174 | 1.056 | 4.243 | 0.032 | n/a | 0.220 | 6.962 | 3.691 | n/a | 0.027 | 3.973 | 0.186 | 0.027 |
| p99 | 40.362 | 7.975 | 0.000 | 7.467 | 11.361 | n/a | 4.461 | 1.147 | 3.093 | 18.510 | 0.132 | n/a | 2.641 | 12.200 | 26.956 | n/a | 0.062 | 16.209 | 0.474 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000001b9 | 40.362 | 2.444 | n/a | 0.000 | 1.086 | 0.704 | 1.368 | 0.026 | n/a | 0.179 | 7.571 | 26.956 | n/a | 0.028 | 3.530 | 0.087 | 0.028 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe1200000000000001b7 | 37.392 | 6.954 | 0.145 | 0.269 | 0.062 | 0.992 | 8.415 | 0.031 | n/a | 0.105 | 12.200 | 8.192 | n/a | 0.027 | 7.430 | 0.199 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001a3 | 36.302 | 3.849 | 0.302 | 0.000 | 0.060 | 1.704 | 18.036 | 0.029 | n/a | 0.099 | 5.609 | 6.590 | n/a | 0.026 | 4.210 | 0.116 | 0.026 | gw-w/thread-42/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000001bb | 36.132 | 3.274 | 0.219 | 0.300 | 0.065 | 1.522 | 12.357 | 0.054 | n/a | 1.245 | 10.355 | 6.710 | n/a | 0.028 | 3.859 | 0.107 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000017e | 35.469 | 3.740 | 0.198 | 0.259 | 0.174 | 1.268 | 18.510 | 0.075 | n/a | 0.108 | 6.677 | 4.413 | n/a | 0.047 | 4.371 | 0.123 | 0.047 | gw-w/thread-46/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe12000000000000018d | 34.989 | 4.680 | 0.311 | 0.000 | 0.056 | 1.509 | 14.725 | 0.031 | n/a | 2.641 | 7.357 | 3.654 | n/a | 0.024 | 5.047 | 0.144 | 0.024 | gw-w/thread-43/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000001b5 | 34.196 | 11.361 | n/a | 4.461 | 0.387 | 1.426 | 4.243 | 0.078 | n/a | 0.248 | 7.529 | 4.432 | n/a | 0.031 | 16.209 | 0.474 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000199 | 30.125 | 3.501 | 0.191 | 0.316 | 0.053 | 1.762 | 13.619 | 0.052 | n/a | 0.148 | 6.860 | 3.598 | n/a | 0.024 | 4.062 | 0.135 | 0.024 | gw-w/thread-44/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe12000000000000019f | 29.213 | 4.905 | 0.166 | 0.509 | 0.049 | 1.670 | 10.617 | 0.046 | n/a | 0.130 | 7.175 | 3.920 | n/a | 0.025 | 5.630 | 0.193 | 0.025 | gw-w/thread-46/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000187 | 27.864 | 3.861 | n/a | 0.000 | 0.759 | 0.729 | 5.724 | 0.021 | n/a | 0.076 | 10.913 | 5.760 | n/a | 0.023 | 4.620 | 0.166 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000182 | 26.850 | 3.707 | 0.192 | 0.253 | 0.057 | 1.254 | 10.061 | 0.052 | n/a | 0.776 | 7.026 | 3.434 | n/a | 0.036 | 4.210 | 0.157 | 0.036 | gw-w/thread-44/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe12000000000000018f | 26.518 | 4.876 | 0.340 | 0.586 | 0.077 | 1.611 | 5.484 | 0.028 | n/a | 0.116 | 6.724 | 6.649 | n/a | 0.027 | 5.879 | 0.222 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001c4 | 24.710 | 3.811 | n/a | 0.000 | 0.918 | 1.972 | 2.021 | 0.057 | n/a | 0.302 | 11.958 | 3.609 | n/a | 0.062 | 4.729 | 0.191 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001b3 | 24.562 | 4.071 | 0.267 | 0.237 | 0.049 | 1.568 | 6.553 | 0.052 | n/a | 0.184 | 5.858 | 5.696 | n/a | 0.026 | 4.624 | 0.188 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000185 | 24.252 | 3.181 | 0.166 | 0.000 | 0.059 | 1.056 | 6.036 | 0.031 | n/a | 0.089 | 7.114 | 6.497 | n/a | 0.023 | 3.406 | 0.140 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001ad | 23.903 | 3.393 | 0.191 | 0.255 | 0.135 | 1.510 | 6.561 | 0.057 | n/a | 0.137 | 5.675 | 5.945 | n/a | 0.044 | 3.973 | 0.166 | 0.044 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe1200000000000001a1 | 23.790 | 3.539 | 0.242 | 0.000 | 0.073 | 3.093 | 5.895 | 0.062 | n/a | 0.220 | 6.771 | 3.868 | n/a | 0.027 | 3.854 | 0.162 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000195 | 23.505 | 3.566 | 0.152 | 0.000 | 0.041 | 1.127 | 8.237 | 0.028 | n/a | 0.085 | 6.828 | 3.422 | n/a | 0.019 | 3.759 | 0.160 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000197 | 23.231 | 4.985 | n/a | 0.000 | 0.784 | 2.349 | 3.616 | 0.132 | n/a | 0.267 | 7.421 | 3.644 | n/a | 0.033 | 5.770 | 0.248 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 5a2d7a1cf191fe1200000000000001a7 | 23.150 | 3.360 | 0.186 | 0.271 | 0.049 | 1.070 | 8.303 | 0.028 | n/a | 0.120 | 6.112 | 3.628 | n/a | 0.023 | 3.865 | 0.167 | 0.023 | gw-w/thread-47/gateway.admitted-work | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.073 | 0.000 | 0.000 | 0.541 | 2.597 | n/a | 0.000 | 0.621 | 1.024 | 1.615 | 0.032 | n/a | 0.425 | 6.968 | 2.055 | n/a | 0.032 | 3.431 | 0.191 | 0.032 |
| p99 | 24.710 | 1.322 | 0.000 | 0.970 | 3.811 | n/a | 0.000 | 1.147 | 1.972 | 2.479 | 0.074 | n/a | 1.744 | 11.958 | 6.738 | n/a | 0.062 | 4.729 | 0.311 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000001c4 | 24.710 | 3.811 | n/a | 0.000 | 0.918 | 1.972 | 2.021 | 0.057 | n/a | 0.302 | 11.958 | 3.609 | n/a | 0.062 | 4.729 | 0.191 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000018b | 22.144 | 2.563 | n/a | 0.000 | 0.868 | 1.031 | 1.931 | 0.055 | n/a | 0.860 | 8.074 | 6.738 | n/a | 0.024 | 3.431 | 0.155 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 5a2d7a1cf191fe12000000000000017c | 20.184 | 2.597 | n/a | 0.000 | 0.182 | 1.024 | 1.584 | 0.032 | n/a | 1.744 | 9.293 | 3.691 | n/a | 0.036 | 2.779 | 0.138 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000180 | 16.643 | 2.248 | n/a | 0.000 | 1.147 | 0.672 | 1.101 | 0.021 | n/a | 0.425 | 6.968 | 4.034 | n/a | 0.026 | 3.395 | 0.204 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001a5 | 16.240 | 3.371 | n/a | 0.000 | 0.383 | 1.418 | 2.479 | 0.074 | n/a | 0.435 | 7.404 | 0.640 | n/a | 0.036 | 3.754 | 0.231 | 0.036 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000193 | 14.073 | 3.075 | n/a | 0.000 | 0.621 | 1.018 | 1.889 | 0.041 | n/a | 0.546 | 3.477 | 3.365 | n/a | 0.041 | 3.696 | 0.263 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001c7 | 13.860 | 1.694 | n/a | 0.000 | 0.456 | 0.454 | 0.934 | 0.023 | n/a | 0.140 | 9.618 | 0.520 | n/a | 0.021 | 2.149 | 0.155 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001af | 13.802 | 3.167 | n/a | 0.000 | 0.675 | 1.053 | 1.615 | 0.030 | n/a | 0.620 | 5.800 | 0.810 | n/a | 0.032 | 3.842 | 0.278 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000191 | 13.791 | 3.540 | n/a | 0.000 | 0.754 | 1.366 | 1.790 | 0.044 | n/a | 0.272 | 5.433 | 0.546 | n/a | 0.046 | 4.294 | 0.311 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001bc | 9.436 | 1.535 | n/a | 0.000 | 0.219 | 0.548 | 1.098 | 0.019 | n/a | 0.396 | 3.542 | 2.055 | n/a | 0.024 | 1.754 | 0.186 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.734 | 0.221 | 0.000 | 0.544 | 3.573 | n/a | 0.000 | 0.151 | 1.145 | 2.934 | 0.035 | n/a | 0.297 | 6.469 | 3.589 | n/a | 0.027 | 4.114 | 0.197 | 0.027 |
| p99 | 81.035 | 1.989 | 0.000 | 2.173 | 17.055 | n/a | 0.491 | 1.139 | 4.256 | 58.472 | 1.011 | n/a | 3.768 | 16.174 | 24.605 | n/a | 0.055 | 17.992 | 0.314 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000001ee | 81.035 | 17.055 | n/a | 0.000 | 0.937 | 3.595 | 18.110 | 0.131 | n/a | 0.400 | 16.174 | 24.605 | n/a | 0.029 | 17.992 | 0.222 | 0.029 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.022ms |
| 5a2d7a1cf191fe120000000000000209 | 77.196 | 4.449 | 0.215 | 0.273 | 0.044 | 1.309 | 58.472 | 0.039 | n/a | 0.099 | 5.486 | 6.786 | n/a | 0.023 | 4.982 | 0.065 | 0.023 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.032ms |
| 5a2d7a1cf191fe1200000000000001d8 | 36.975 | 5.143 | 0.275 | 0.420 | 0.055 | 1.811 | 11.671 | 0.063 | n/a | 1.032 | 12.581 | 3.897 | n/a | 0.028 | 5.893 | 0.159 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001f7 | 33.558 | 4.958 | 0.251 | 0.232 | 0.102 | 1.956 | 10.683 | 0.086 | n/a | 0.722 | 8.724 | 5.815 | n/a | 0.029 | 5.543 | 0.165 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001d2 | 33.454 | 7.832 | n/a | 0.000 | 0.232 | 2.834 | 1.349 | 0.016 | n/a | 3.768 | 13.111 | 4.279 | n/a | 0.033 | 8.064 | 0.241 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.953ms |
| 5a2d7a1cf191fe1200000000000001e0 | 31.013 | 8.272 | 0.170 | 0.412 | 0.052 | 1.677 | 11.895 | 0.039 | n/a | 0.112 | 7.785 | 0.571 | n/a | 0.027 | 8.907 | 0.287 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000020f | 30.850 | 4.492 | 0.338 | 0.356 | 0.103 | 1.458 | 14.415 | 0.081 | n/a | 0.432 | 5.608 | 3.519 | n/a | 0.047 | 5.290 | 0.171 | 0.047 | gw-w/thread-46/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000219 | 29.687 | 3.516 | 0.188 | 0.237 | 0.055 | 4.228 | 8.225 | 0.029 | n/a | 0.094 | 6.253 | 6.828 | n/a | 0.035 | 3.996 | 0.135 | 0.035 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe12000000000000021d | 28.907 | 3.509 | 0.278 | 0.234 | 0.094 | 1.054 | 10.693 | 0.029 | n/a | 0.098 | 6.326 | 6.550 | n/a | 0.043 | 4.114 | 0.142 | 0.043 | gw-w/thread-42/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000001d1 | 27.747 | 2.627 | n/a | 0.000 | 0.334 | 4.256 | 1.178 | 0.020 | n/a | 0.087 | 12.576 | 6.641 | n/a | 0.028 | 2.962 | 0.107 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001dc | 26.598 | 3.573 | 0.227 | 0.348 | 0.045 | 1.189 | 9.386 | 0.051 | n/a | 0.119 | 7.048 | 4.588 | n/a | 0.024 | 4.193 | 0.158 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001d5 | 26.510 | 3.614 | 0.231 | 0.231 | 0.059 | 1.147 | 7.196 | 0.028 | n/a | 0.419 | 7.075 | 6.486 | n/a | 0.024 | 4.134 | 0.156 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000020d | 25.701 | 4.035 | 0.190 | 0.227 | 0.055 | 1.431 | 9.144 | 0.074 | n/a | 2.002 | 4.273 | 4.243 | n/a | 0.026 | 4.506 | 0.175 | 0.026 | gw-w/thread-47/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000001f9 | 24.923 | 4.879 | 0.175 | 0.454 | 0.054 | 1.954 | 7.692 | 0.038 | n/a | 0.416 | 5.648 | 3.589 | n/a | 0.025 | 5.562 | 0.223 | 0.025 | gw-w/thread-46/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000201 | 23.627 | 3.948 | 0.308 | 0.240 | 0.053 | 1.166 | 5.569 | 0.030 | n/a | 0.366 | 8.189 | 3.734 | n/a | 0.024 | 4.549 | 0.193 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001f0 | 23.300 | 3.438 | 0.214 | 0.230 | 0.108 | 1.080 | 7.213 | 0.031 | n/a | 0.129 | 8.116 | 2.704 | n/a | 0.038 | 3.989 | 0.171 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001ec | 22.895 | 3.964 | 0.293 | 0.240 | 0.052 | 2.240 | 6.098 | 0.077 | n/a | 0.128 | 6.179 | 3.598 | n/a | 0.025 | 4.549 | 0.199 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000203 | 22.027 | 2.927 | n/a | 0.000 | 0.855 | 1.439 | 2.551 | 0.068 | n/a | 0.753 | 6.469 | 6.934 | n/a | 0.031 | 3.782 | 0.172 | 0.031 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe1200000000000001cf | 21.801 | 4.533 | 0.172 | 0.368 | 0.057 | 1.425 | 6.112 | 0.035 | n/a | 0.096 | 7.033 | 1.942 | n/a | 0.027 | 5.130 | 0.235 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000205 | 20.889 | 4.907 | 0.166 | 0.491 | 0.042 | 1.302 | 5.321 | 0.027 | n/a | 0.102 | 5.175 | 3.335 | n/a | 0.022 | 5.607 | 0.268 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.320 | 0.479 | 0.000 | 0.459 | 2.183 | n/a | 0.000 | 0.508 | 0.824 | 1.859 | 0.038 | n/a | 0.178 | 6.469 | 3.326 | n/a | 0.029 | 2.715 | 0.176 | 0.029 |
| p99 | 27.747 | 1.989 | 0.000 | 0.819 | 3.604 | n/a | 0.000 | 1.139 | 4.256 | 2.934 | 1.011 | n/a | 1.167 | 12.576 | 7.229 | n/a | 0.055 | 4.293 | 0.271 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000001d1 | 27.747 | 2.627 | n/a | 0.000 | 0.334 | 4.256 | 1.178 | 0.020 | n/a | 0.087 | 12.576 | 6.641 | n/a | 0.028 | 2.962 | 0.107 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000203 | 22.027 | 2.927 | n/a | 0.000 | 0.855 | 1.439 | 2.551 | 0.068 | n/a | 0.753 | 6.469 | 6.934 | n/a | 0.031 | 3.782 | 0.172 | 0.031 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe1200000000000001cb | 19.824 | 2.195 | n/a | 0.000 | 1.139 | 0.659 | 1.801 | 0.027 | n/a | 0.142 | 6.600 | 7.229 | n/a | 0.032 | 3.334 | 0.168 | 0.032 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe1200000000000001cd | 19.019 | 3.598 | n/a | 0.000 | 0.151 | 1.133 | 2.283 | 0.058 | n/a | 0.297 | 8.774 | 2.672 | n/a | 0.053 | 3.749 | 0.197 | 0.053 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001da | 18.931 | 1.985 | n/a | 0.000 | 0.257 | 0.907 | 2.934 | 0.038 | n/a | 0.139 | 9.531 | 3.108 | n/a | 0.031 | 2.242 | 0.118 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 5a2d7a1cf191fe120000000000000211 | 18.759 | 2.736 | n/a | 0.000 | 0.557 | 0.675 | 1.859 | 1.011 | n/a | 0.713 | 7.481 | 3.686 | n/a | 0.042 | 3.293 | 0.176 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001f4 | 18.613 | 1.954 | n/a | 0.000 | 0.625 | 0.821 | 1.983 | 0.049 | n/a | 0.304 | 10.590 | 2.242 | n/a | 0.045 | 2.579 | 0.139 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001e1 | 17.320 | 3.604 | n/a | 0.000 | 0.688 | 0.824 | 1.191 | 0.021 | n/a | 0.149 | 5.739 | 5.048 | n/a | 0.055 | 4.293 | 0.248 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001fe | 15.512 | 1.892 | n/a | 0.000 | 0.508 | 0.865 | 2.021 | 0.046 | n/a | 0.545 | 6.081 | 3.527 | n/a | 0.026 | 2.400 | 0.155 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 5a2d7a1cf191fe1200000000000001e8 | 15.468 | 2.002 | n/a | 0.000 | 0.196 | 0.913 | 2.136 | 0.054 | n/a | 0.178 | 6.316 | 3.647 | n/a | 0.025 | 2.198 | 0.142 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000021b | 12.547 | 2.686 | n/a | 0.000 | 0.719 | 1.268 | 1.881 | 0.090 | n/a | 1.167 | 4.144 | 0.565 | n/a | 0.027 | 3.406 | 0.271 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001e6 | 12.534 | 1.967 | n/a | 0.000 | 0.428 | 0.710 | 1.275 | 0.025 | n/a | 0.149 | 6.793 | 1.157 | n/a | 0.029 | 2.396 | 0.191 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000001e4 | 12.260 | 2.111 | n/a | 0.000 | 0.603 | 0.437 | 0.778 | 0.018 | n/a | 0.111 | 4.859 | 3.326 | n/a | 0.016 | 2.715 | 0.221 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000207 | 11.338 | 2.183 | n/a | 0.000 | 0.395 | 0.591 | 1.459 | 0.024 | n/a | 0.100 | 5.966 | 0.601 | n/a | 0.019 | 2.578 | 0.227 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000020b | 7.870 | 1.513 | n/a | 0.000 | 0.310 | 0.508 | 0.916 | 0.020 | n/a | 0.372 | 3.743 | 0.465 | n/a | 0.022 | 1.824 | 0.232 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.133 | n/a | n/a | n/a | 37.516 | 11.822 | 1.573 | 0.000 | 2.852 | 1.499 | 0.002 | n/a | 0.005 | 0.000 | n/a | n/a | 0.006 | 59.064 | 0.896 | 0.006 |
| p99 | 194.597 | n/a | n/a | n/a | 96.142 | 103.240 | 24.184 | 0.000 | 129.971 | 40.331 | 11.645 | n/a | 0.024 | 0.000 | n/a | n/a | 0.018 | 130.120 | 1.000 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000131a | 194.597 | 57.133 | 0.293 | 6.085 | 0.000 | 129.971 | 1.099 | 0.003 | n/a | 0.006 | 0.000 | n/a | n/a | 0.006 | 63.512 | 0.326 | 0.006 | node-14/thread-3/socket.body-read | driver.publication.persist-deferred 2.144ms; driver.publication.persist-deferred 1.375ms; driver.publication.persist-deferred 1.159ms; driver.publication.persist-deferred 1.128ms; driver.publication.persist-deferred 1.119ms |
| 5a2d7a1cf191fe1200000000000015df | 193.396 | 96.142 | 9.793 | 24.184 | 0.000 | 41.696 | 9.924 | 11.645 | n/a | 0.006 | 0.000 | n/a | n/a | 0.006 | 130.120 | 0.673 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 3.171ms; driver.publication.persist-deferred 2.565ms; driver.expected-state.bind-receipt 1.620ms; driver.publication.persist-deferred 1.236ms; driver.publication.persist-deferred 1.147ms |
| 5a2d7a1cf191fe1200000000000015e2 | 177.006 | 15.100 | 51.124 | 0.000 | 0.000 | 109.962 | 0.802 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.006 | 66.224 | 0.374 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.171ms; driver.expected-state.bind-receipt 1.620ms; driver.publication.persist-deferred 1.236ms; driver.publication.persist-deferred 1.147ms; driver.publication.persist-deferred 1.059ms |
| 5a2d7a1cf191fe120000000000001324 | 161.472 | 50.083 | 55.946 | 2.105 | 0.000 | 46.721 | 6.586 | 0.007 | n/a | 0.017 | 0.000 | n/a | n/a | 0.006 | 108.134 | 0.670 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.159ms; driver.publication.persist-deferred 1.128ms; driver.publication.persist-deferred 1.119ms; driver.publication.persist-deferred 1.119ms; driver.publication.persist-deferred 1.015ms |
| 5a2d7a1cf191fe12000000000000167e | 152.033 | 72.448 | 31.524 | 8.283 | 0.000 | 34.528 | 4.547 | 0.698 | n/a | 0.002 | 0.000 | n/a | n/a | 0.003 | 112.254 | 0.738 | 0.003 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.991ms; driver.publication.persist-deferred 1.080ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 1.049ms; driver.publication.persist-deferred 1.001ms |
| 5a2d7a1cf191fe120000000000001314 | 151.058 | 45.283 | 2.564 | 3.298 | 0.000 | 88.094 | 11.791 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.010 | 51.145 | 0.339 | 0.010 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.144ms; driver.publication.persist-deferred 1.375ms; driver.publication.persist-deferred 1.184ms; driver.publication.persist-deferred 1.128ms; driver.publication.persist-deferred 1.119ms |
| 5a2d7a1cf191fe12000000000000168c | 142.632 | 48.867 | 62.086 | 2.011 | 0.000 | 24.850 | 3.150 | 1.656 | n/a | 0.007 | 0.000 | n/a | n/a | 0.004 | 112.965 | 0.792 | 0.004 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.991ms; driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.246ms; driver.publication.persist-deferred 1.098ms; driver.publication.persist-deferred 1.080ms |
| 5a2d7a1cf191fe120000000000001683 | 132.748 | 37.307 | 87.654 | 1.795 | 0.000 | 3.216 | 1.698 | 1.067 | n/a | 0.006 | 0.000 | n/a | n/a | 0.005 | 126.756 | 0.955 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.991ms; driver.publication.persist-deferred 1.246ms; driver.publication.persist-deferred 1.080ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 1.049ms |
| 5a2d7a1cf191fe120000000000001091 | 122.451 | 26.519 | 19.380 | 7.936 | 0.000 | 60.012 | 6.829 | 1.762 | n/a | 0.009 | 0.000 | n/a | n/a | 0.005 | 53.835 | 0.440 | 0.005 | node-14/thread-3/socket.body-read | driver.publication.persist-deferred 6.730ms; driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 1.145ms; driver.publication.persist-deferred 1.135ms; driver.publication.persist-deferred 1.101ms |
| 5a2d7a1cf191fe12000000000000108f | 120.385 | 66.093 | 28.110 | 12.582 | 0.000 | 0.937 | 12.626 | 0.007 | n/a | 0.015 | 0.000 | n/a | n/a | 0.015 | 106.785 | 0.887 | 0.015 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 6.730ms; driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 1.145ms; driver.publication.persist-deferred 1.135ms; driver.publication.persist-deferred 1.101ms |
| 5a2d7a1cf191fe12000000000000109f | 115.954 | 49.358 | 34.812 | 5.907 | 0.000 | 19.941 | 4.762 | 1.162 | n/a | 0.003 | 0.000 | n/a | n/a | 0.011 | 90.076 | 0.777 | 0.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.682ms; driver.publication.persist-deferred 1.135ms; driver.publication.persist-deferred 0.982ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.957ms |
| 5a2d7a1cf191fe120000000000001886 | 115.105 | 47.727 | 0.459 | 8.092 | 0.000 | 45.482 | 13.327 | 0.007 | n/a | 0.006 | 0.000 | n/a | n/a | 0.006 | 56.278 | 0.489 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.497ms; driver.publication.persist-deferred 1.496ms; driver.publication.persist-deferred 1.290ms; driver.publication.persist-deferred 1.154ms; driver.publication.persist-deferred 1.048ms |
| 5a2d7a1cf191fe120000000000001093 | 111.937 | 44.135 | 60.393 | 2.407 | 0.000 | 2.246 | 2.738 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.006 | 106.936 | 0.955 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 1.145ms; driver.publication.persist-deferred 1.135ms; driver.publication.persist-deferred 1.101ms; driver.publication.persist-deferred 0.982ms |
| 5a2d7a1cf191fe120000000000000bab | 111.465 | 33.803 | 57.911 | 2.232 | 0.000 | 11.872 | 5.628 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.006 | 93.947 | 0.843 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.448ms; driver.publication.persist-deferred 1.419ms; driver.publication.persist-deferred 1.125ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.046ms |
| 5a2d7a1cf191fe120000000000000bb2 | 107.976 | 23.477 | 38.318 | 0.000 | 0.000 | 40.224 | 0.577 | 5.364 | n/a | 0.004 | 0.000 | n/a | n/a | 0.011 | 61.795 | 0.572 | 0.011 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.448ms; driver.publication.persist-deferred 1.125ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 0.944ms; driver.reader-basis.broadcast 0.270ms |
| 5a2d7a1cf191fe120000000000001684 | 105.625 | 18.186 | 85.499 | 0.000 | 0.000 | 0.538 | 1.381 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.003 | 103.685 | 0.982 | 0.003 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.991ms; driver.publication.persist-deferred 1.080ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 1.049ms; driver.publication.persist-deferred 0.854ms |
| 5a2d7a1cf191fe120000000000000edb | 105.552 | 52.728 | 0.219 | 5.420 | 0.000 | 43.270 | 3.896 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.005 | 58.366 | 0.553 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.566ms; driver.expected-state.bind-receipt 1.125ms; driver.publication.persist-deferred 1.090ms; driver.publication.persist-deferred 1.069ms; driver.publication.persist-deferred 0.916ms |
| 5a2d7a1cf191fe1200000000000015d9 | 104.610 | 52.091 | 4.984 | 6.649 | 0.000 | 0.543 | 40.331 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.004 | 63.724 | 0.609 | 0.004 | gw-r/thread-47/gateway.admitted-work | driver.publication.persist-deferred 2.565ms; driver.expected-state.bind-receipt 1.620ms; driver.publication.persist-deferred 1.236ms; driver.publication.persist-deferred 1.147ms; driver.publication.persist-deferred 1.125ms |
| 5a2d7a1cf191fe120000000000000baf | 104.309 | 26.564 | 40.464 | 1.269 | 0.000 | 31.173 | 1.670 | 3.153 | n/a | 0.002 | 0.000 | n/a | n/a | 0.015 | 68.296 | 0.655 | 0.015 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.448ms; driver.publication.persist-deferred 1.125ms; driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.046ms; driver.publication.persist-deferred 0.944ms |
| 5a2d7a1cf191fe12000000000000127d | 104.193 | 0.944 | 103.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 104.185 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | driver.publication.persist-deferred 96.629ms; driver.reader-basis.broadcast 0.187ms |

## P2 / L64 / commit (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.326 | 0.241 | 0.000 | 0.528 | 3.481 | n/a | 0.000 | 0.324 | 0.969 | 3.797 | 0.024 | n/a | 0.165 | 5.559 | 2.028 | n/a | 0.026 | 3.975 | 0.216 | 0.026 |
| p99 | 53.084 | 3.324 | 0.000 | 1.648 | 7.054 | n/a | 0.472 | 1.161 | 7.336 | 36.640 | 0.082 | n/a | 9.226 | 22.138 | 19.713 | n/a | 0.080 | 7.690 | 0.413 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000025c | 53.084 | 5.029 | 0.248 | 0.472 | 0.044 | 1.348 | 36.640 | 0.023 | n/a | 0.088 | 5.892 | 3.279 | n/a | 0.021 | 5.793 | 0.109 | 0.021 | gw-w/thread-45/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000248 | 35.667 | 5.738 | n/a | 0.000 | 0.903 | 1.478 | 2.628 | 0.056 | n/a | 9.226 | 14.900 | 0.659 | n/a | 0.080 | 6.640 | 0.186 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000226 | 35.415 | 4.319 | n/a | 0.000 | 0.477 | 0.969 | 2.587 | 0.046 | n/a | 1.035 | 22.138 | 3.817 | n/a | 0.027 | 4.795 | 0.135 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000022a | 34.906 | 3.563 | 0.265 | 0.236 | 0.091 | 1.196 | 14.032 | 0.040 | n/a | 0.104 | 11.355 | 3.988 | n/a | 0.035 | 4.156 | 0.119 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000261 | 33.428 | 2.301 | n/a | 0.000 | 0.598 | 0.522 | 4.427 | 0.018 | n/a | 0.082 | 5.746 | 19.713 | n/a | 0.021 | 2.899 | 0.087 | 0.021 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe120000000000000232 | 32.318 | 4.118 | 0.286 | 0.257 | 0.051 | 1.346 | 10.689 | 0.040 | n/a | 0.655 | 10.464 | 4.386 | n/a | 0.024 | 4.713 | 0.146 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000249 | 32.133 | 2.990 | n/a | 0.000 | 0.942 | 7.336 | 0.904 | 0.017 | n/a | 0.057 | 13.503 | 6.349 | n/a | 0.035 | 3.931 | 0.122 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.284ms |
| 5a2d7a1cf191fe12000000000000024e | 29.697 | 3.578 | 0.206 | 0.225 | 0.094 | 1.080 | 10.971 | 0.035 | n/a | 2.667 | 7.272 | 3.525 | n/a | 0.043 | 4.103 | 0.138 | 0.043 | gw-w/thread-43/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000242 | 26.802 | 3.080 | 0.139 | 0.271 | 0.045 | 3.479 | 6.106 | 0.024 | n/a | 0.364 | 9.236 | 4.029 | n/a | 0.029 | 3.535 | 0.132 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000022d | 26.019 | 1.897 | n/a | 0.000 | 0.838 | 0.903 | 5.790 | 0.051 | n/a | 0.175 | 12.634 | 3.707 | n/a | 0.025 | 2.735 | 0.105 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 5a2d7a1cf191fe12000000000000021f | 25.092 | 5.821 | 0.267 | 0.423 | 0.060 | 1.343 | 6.231 | 0.049 | n/a | 0.095 | 7.083 | 3.677 | n/a | 0.044 | 6.570 | 0.262 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000234 | 24.784 | 4.299 | 0.174 | 0.436 | 0.045 | 1.431 | 6.924 | 0.029 | n/a | 0.087 | 7.792 | 3.544 | n/a | 0.021 | 4.954 | 0.200 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000022f | 24.180 | 2.917 | n/a | 0.000 | 0.324 | 0.574 | 9.841 | 0.016 | n/a | 1.139 | 6.274 | 3.073 | n/a | 0.023 | 3.240 | 0.134 | 0.023 | gw-w/thread-42/commit.prepare-and-validate | none observed |
| 5a2d7a1cf191fe12000000000000023e | 23.856 | 3.679 | 0.225 | 0.253 | 0.039 | 1.150 | 6.542 | 0.025 | n/a | 3.772 | 4.864 | 3.286 | n/a | 0.021 | 4.197 | 0.176 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000266 | 22.968 | 5.470 | 1.104 | 0.294 | 0.045 | 1.301 | 7.212 | 0.042 | n/a | 0.110 | 5.289 | 2.080 | n/a | 0.021 | 6.913 | 0.301 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000277 | 21.972 | 3.058 | 0.173 | 0.378 | 0.041 | 0.848 | 6.321 | 0.023 | n/a | 0.105 | 6.213 | 4.791 | n/a | 0.021 | 3.650 | 0.166 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000273 | 21.740 | 2.416 | n/a | 0.000 | 0.438 | 0.459 | 1.535 | 0.021 | n/a | 0.086 | 10.002 | 6.757 | n/a | 0.026 | 2.855 | 0.131 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000246 | 21.519 | 7.054 | 0.158 | 0.430 | 0.048 | 1.197 | 3.492 | 0.023 | n/a | 0.409 | 4.831 | 3.853 | n/a | 0.025 | 7.690 | 0.357 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000268 | 21.063 | 4.636 | n/a | 0.000 | 0.548 | 2.252 | 9.358 | 0.070 | n/a | 0.165 | 3.611 | 0.393 | n/a | 0.030 | 5.184 | 0.246 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000244 | 20.665 | 3.481 | 0.174 | 0.265 | 0.055 | 1.086 | 7.954 | 0.029 | n/a | 0.323 | 5.290 | 1.983 | n/a | 0.026 | 3.975 | 0.192 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.812 | 0.000 | 0.000 | 0.441 | 2.201 | n/a | 0.000 | 0.434 | 0.770 | 1.457 | 0.022 | n/a | 0.165 | 4.595 | 0.608 | n/a | 0.026 | 2.635 | 0.216 | 0.026 |
| p99 | 32.133 | 0.937 | 0.000 | 1.008 | 4.636 | n/a | 0.000 | 1.161 | 7.336 | 9.358 | 0.082 | n/a | 0.891 | 13.503 | 6.349 | n/a | 0.056 | 5.184 | 0.299 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe120000000000000249 | 32.133 | 2.990 | n/a | 0.000 | 0.942 | 7.336 | 0.904 | 0.017 | n/a | 0.057 | 13.503 | 6.349 | n/a | 0.035 | 3.931 | 0.122 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.284ms |
| 5a2d7a1cf191fe12000000000000022d | 26.019 | 1.897 | n/a | 0.000 | 0.838 | 0.903 | 5.790 | 0.051 | n/a | 0.175 | 12.634 | 3.707 | n/a | 0.025 | 2.735 | 0.105 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 5a2d7a1cf191fe120000000000000268 | 21.063 | 4.636 | n/a | 0.000 | 0.548 | 2.252 | 9.358 | 0.070 | n/a | 0.165 | 3.611 | 0.393 | n/a | 0.030 | 5.184 | 0.246 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000224 | 18.815 | 2.201 | n/a | 0.000 | 0.434 | 0.627 | 5.061 | 0.023 | n/a | 0.108 | 8.307 | 2.028 | n/a | 0.026 | 2.635 | 0.140 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000027b | 17.721 | 3.603 | n/a | 0.000 | 0.494 | 1.241 | 1.942 | 0.028 | n/a | 0.161 | 9.554 | 0.666 | n/a | 0.033 | 4.096 | 0.231 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000220 | 17.095 | 3.815 | n/a | 0.000 | 0.725 | 2.227 | 6.356 | 0.082 | n/a | 0.235 | 3.149 | 0.482 | n/a | 0.024 | 4.540 | 0.266 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000026d | 14.379 | 2.427 | n/a | 0.000 | 1.161 | 0.735 | 1.457 | 0.031 | n/a | 0.121 | 7.755 | 0.659 | n/a | 0.033 | 3.588 | 0.250 | 0.033 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000228 | 13.890 | 2.392 | n/a | 0.000 | 0.079 | 0.912 | 1.400 | 0.017 | n/a | 0.891 | 6.172 | 2.005 | n/a | 0.021 | 2.471 | 0.178 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000025d | 11.812 | 2.403 | n/a | 0.000 | 0.142 | 0.841 | 2.106 | 0.041 | n/a | 0.172 | 5.544 | 0.536 | n/a | 0.025 | 2.546 | 0.216 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000235 | 11.380 | 1.692 | n/a | 0.000 | 0.578 | 0.732 | 1.136 | 0.020 | n/a | 0.093 | 4.595 | 2.511 | n/a | 0.023 | 2.270 | 0.199 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000023f | 10.842 | 2.844 | n/a | 0.000 | 0.399 | 0.981 | 1.332 | 0.020 | n/a | 0.445 | 4.256 | 0.510 | n/a | 0.056 | 3.243 | 0.299 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000263 | 10.472 | 1.951 | n/a | 0.000 | 0.370 | 0.523 | 2.582 | 0.018 | n/a | 0.331 | 4.253 | 0.404 | n/a | 0.042 | 2.321 | 0.222 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000027f | 9.917 | 1.896 | n/a | 0.000 | 0.196 | 0.770 | 1.185 | 0.022 | n/a | 0.375 | 4.830 | 0.618 | n/a | 0.026 | 2.092 | 0.211 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000253 | 9.510 | 1.639 | n/a | 0.000 | 0.274 | 0.653 | 1.670 | 0.046 | n/a | 0.589 | 4.149 | 0.463 | n/a | 0.027 | 1.913 | 0.201 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 5a2d7a1cf191fe120000000000000275 | 9.099 | 1.753 | n/a | 0.000 | 0.907 | 0.541 | 0.943 | 0.016 | n/a | 0.087 | 4.223 | 0.608 | n/a | 0.021 | 2.659 | 0.292 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000025f | 8.014 | 1.645 | n/a | 0.000 | 0.114 | 0.471 | 1.020 | 0.018 | n/a | 0.088 | 4.102 | 0.539 | n/a | 0.019 | 1.759 | 0.219 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.036 | 0.000 | 0.000 | 0.503 | 3.346 | n/a | 0.000 | 0.172 | 1.004 | 2.299 | 0.024 | n/a | 0.274 | 5.697 | 2.798 | n/a | 0.027 | 3.839 | 0.226 | 0.027 |
| p99 | 42.849 | 3.001 | 0.000 | 1.547 | 6.792 | n/a | 0.510 | 1.221 | 4.707 | 12.873 | 0.072 | n/a | 2.005 | 29.347 | n/a | n/a | 0.096 | 7.556 | 0.392 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000002d7 | 42.849 | 3.341 | 0.199 | 0.000 | 0.071 | 1.032 | 4.743 | 0.024 | n/a | 1.447 | 29.347 | 2.617 | n/a | 0.027 | 3.611 | 0.084 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002a4 | 41.945 | 3.319 | 0.192 | 0.260 | 0.051 | 1.004 | 5.703 | 0.035 | n/a | 0.111 | 27.820 | 3.426 | n/a | 0.024 | 3.823 | 0.091 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002a8 | 33.127 | 6.792 | 0.155 | 0.253 | 0.060 | 1.196 | 12.873 | 0.027 | n/a | 0.073 | 7.973 | 3.700 | n/a | 0.024 | 7.260 | 0.219 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000292 | 31.370 | 4.416 | 0.194 | 0.419 | 0.044 | 1.084 | 10.811 | 0.033 | n/a | 0.076 | 6.076 | 8.192 | n/a | 0.023 | 5.074 | 0.162 | 0.023 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe12000000000000029a | 30.091 | 3.328 | 0.249 | 0.233 | 0.054 | 4.707 | 5.045 | 0.023 | n/a | 0.068 | 10.156 | 6.204 | n/a | 0.025 | 3.864 | 0.128 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002bc | 28.017 | 3.441 | 0.240 | 0.278 | 0.063 | 1.464 | 11.162 | 0.041 | n/a | 0.116 | 6.058 | 5.127 | n/a | 0.026 | 4.022 | 0.144 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002b4 | 26.971 | 4.414 | 0.242 | 0.396 | 0.056 | 1.783 | 6.962 | 0.024 | n/a | 0.103 | 9.227 | 3.741 | n/a | 0.023 | 5.108 | 0.189 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000287 | 26.325 | 3.225 | 0.178 | 0.241 | 0.050 | 1.105 | 6.887 | 0.024 | n/a | 0.362 | 8.115 | 6.113 | n/a | 0.024 | 3.693 | 0.140 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002ac | 25.126 | 4.915 | 0.264 | 0.427 | 0.059 | 1.386 | 5.005 | 0.024 | n/a | 0.080 | 9.321 | 3.618 | n/a | 0.027 | 5.665 | 0.225 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000028b | 23.354 | 6.728 | 0.266 | 0.510 | 0.051 | 1.163 | 8.909 | 0.023 | n/a | 0.274 | 4.552 | 0.851 | n/a | 0.026 | 7.556 | 0.324 | 0.026 | gw-w/thread-44/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000002b2 | 23.154 | 4.274 | 0.342 | 0.251 | 0.051 | 1.135 | 4.627 | 0.022 | n/a | 0.270 | 5.693 | 6.464 | n/a | 0.025 | 4.918 | 0.212 | 0.025 | tx/thread-87/transactor.triplex-function | none observed |
| 5a2d7a1cf191fe1200000000000002c0 | 22.871 | 4.296 | 0.270 | 0.233 | 0.055 | 0.978 | 6.284 | 0.024 | n/a | 0.341 | 6.076 | 4.291 | n/a | 0.023 | 4.854 | 0.212 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000298 | 22.832 | 3.346 | 0.178 | 0.233 | 0.054 | 0.893 | 8.471 | 0.024 | n/a | 0.292 | 5.697 | 3.619 | n/a | 0.024 | 3.811 | 0.167 | 0.024 | gw-w/thread-45/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe1200000000000002b8 | 22.209 | 4.076 | 0.213 | 0.419 | 0.097 | 1.448 | 8.152 | 0.029 | n/a | 0.106 | 5.176 | 2.454 | n/a | 0.039 | 4.805 | 0.216 | 0.039 | gw-w/thread-42/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe120000000000000290 | 21.931 | 6.193 | n/a | 0.000 | 0.306 | 1.120 | 3.072 | 0.038 | n/a | 0.106 | 5.757 | 5.245 | n/a | 0.096 | 6.498 | 0.296 | 0.096 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000289 | 21.013 | 4.961 | n/a | 0.000 | 0.647 | 1.314 | 1.882 | 0.072 | n/a | 2.005 | 5.801 | 4.258 | n/a | 0.074 | 5.608 | 0.267 | 0.074 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002cf | 20.709 | 3.482 | 0.250 | 0.000 | 0.063 | 1.746 | 3.475 | 0.024 | n/a | 0.364 | 6.240 | 5.039 | n/a | 0.027 | 3.794 | 0.183 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002d5 | 20.210 | 3.544 | 0.229 | 0.000 | 0.066 | 0.875 | 5.086 | 0.023 | n/a | 0.350 | 5.247 | 4.764 | n/a | 0.026 | 3.839 | 0.190 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002b0 | 19.929 | 2.412 | n/a | 0.000 | 0.954 | 0.768 | 1.304 | 0.021 | n/a | 0.124 | 8.537 | 5.775 | n/a | 0.033 | 3.366 | 0.169 | 0.033 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002d0 | 19.216 | 4.322 | n/a | 0.000 | 0.461 | 0.597 | 1.833 | 0.029 | n/a | 0.068 | 10.353 | 1.531 | n/a | 0.021 | 4.783 | 0.249 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.253 | 0.598 | 0.000 | 0.501 | 2.852 | n/a | 0.000 | 0.786 | 0.769 | 1.340 | 0.023 | n/a | 0.333 | 5.163 | 1.346 | n/a | 0.037 | 3.248 | 0.279 | 0.037 |
| p99 | 16.477 | 2.009 | 0.000 | 1.004 | 4.044 | n/a | 0.000 | 1.221 | 2.389 | 7.012 | 0.044 | n/a | 0.919 | 7.736 | n/a | n/a | 0.073 | 5.006 | 0.372 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000002a2 | 16.477 | 2.575 | n/a | 0.000 | 0.584 | 0.981 | 1.457 | 0.028 | n/a | 0.226 | 7.736 | 2.858 | n/a | 0.031 | 3.160 | 0.192 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000293 | 16.036 | 2.156 | n/a | 0.000 | 1.093 | 0.698 | 4.616 | 0.032 | n/a | 0.542 | 5.510 | 1.353 | n/a | 0.038 | 3.248 | 0.203 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 5a2d7a1cf191fe120000000000000285 | 15.742 | 4.044 | n/a | 0.000 | 0.962 | 1.178 | 1.387 | 0.030 | n/a | 0.664 | 6.094 | 1.346 | n/a | 0.037 | 5.006 | 0.318 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002c1 | 15.611 | 2.981 | n/a | 0.000 | 0.786 | 0.723 | 1.340 | 0.021 | n/a | 0.447 | 5.724 | 3.554 | n/a | 0.035 | 3.767 | 0.241 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002c8 | 15.006 | 2.056 | n/a | 0.000 | 1.081 | 0.540 | 1.306 | 0.023 | n/a | 0.090 | 6.178 | 3.704 | n/a | 0.027 | 3.138 | 0.209 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002bd | 14.964 | 2.104 | n/a | 0.000 | 0.785 | 0.553 | 1.120 | 0.020 | n/a | 0.462 | 5.189 | 4.706 | n/a | 0.024 | 2.890 | 0.193 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002b6 | 14.590 | 3.680 | n/a | 0.000 | 0.916 | 1.097 | 1.833 | 0.028 | n/a | 0.131 | 6.065 | 0.768 | n/a | 0.073 | 4.595 | 0.315 | 0.073 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002cc | 13.253 | 3.248 | n/a | 0.000 | 0.447 | 2.389 | 7.012 | 0.025 | n/a | 0.063 | 0.000 | n/a | n/a | 0.069 | 3.694 | 0.279 | 0.069 | gw-w/thread-43/storage/begin-command! | none observed |
| 5a2d7a1cf191fe12000000000000029e | 11.930 | 1.826 | n/a | 0.000 | 0.172 | 0.845 | 2.299 | 0.044 | n/a | 0.919 | 5.163 | 0.632 | n/a | 0.030 | 1.999 | 0.168 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000029b | 11.882 | 3.196 | n/a | 0.000 | 1.221 | 0.835 | 1.031 | 0.020 | n/a | 0.501 | 4.373 | 0.650 | n/a | 0.055 | 4.417 | 0.372 | 0.055 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000282 | 11.429 | 3.306 | n/a | 0.000 | 0.490 | 0.980 | 1.124 | 0.020 | n/a | 0.415 | 4.425 | 0.614 | n/a | 0.054 | 3.796 | 0.332 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002ba | 11.410 | 2.852 | n/a | 0.000 | 0.365 | 0.769 | 1.583 | 0.030 | n/a | 0.112 | 5.009 | 0.660 | n/a | 0.031 | 3.217 | 0.282 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002a6 | 11.023 | 3.152 | n/a | 0.000 | 0.848 | 0.551 | 0.818 | 0.017 | n/a | 0.333 | 4.590 | 0.675 | n/a | 0.039 | 4.000 | 0.363 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002ae | 10.574 | 2.051 | n/a | 0.000 | 0.392 | 0.484 | 0.891 | 0.018 | n/a | 0.313 | 3.588 | 2.798 | n/a | 0.039 | 2.443 | 0.231 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000002c5 | 8.375 | 1.545 | n/a | 0.000 | 0.900 | 0.546 | 0.998 | 0.019 | n/a | 0.098 | 3.656 | 0.593 | n/a | 0.021 | 2.445 | 0.292 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (836 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.970 | 0.317 | 0.000 | 0.504 | 2.201 | n/a | 0.000 | 0.712 | 0.655 | 1.064 | 0.014 | n/a | 0.117 | 4.478 | 0.652 | n/a | 0.018 | 3.054 | 0.269 | 0.018 |
| p99 | 37.017 | 2.800 | 0.037 | 2.332 | 7.165 | n/a | 0.325 | 9.641 | 8.987 | 8.039 | 0.055 | n/a | 3.065 | 19.870 | 12.355 | n/a | 0.054 | 12.900 | 0.615 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe1200000000000002e6 | 46.017 | 3.148 | 0.329 | 0.313 | 0.066 | 5.027 | 21.662 | 0.033 | n/a | 0.072 | 6.666 | 8.676 | n/a | 0.027 | 3.855 | 0.084 | 0.027 | gw-w/thread-44/gateway.admitted-work | none observed |
| 5a2d7a1cf191fe12000000000000081a | 45.030 | 1.442 | n/a | 0.000 | 26.235 | 8.987 | 0.817 | 0.009 | n/a | 0.177 | 6.929 | 0.422 | n/a | 0.012 | 27.677 | 0.615 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 1.072ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.975ms |
| 5a2d7a1cf191fe120000000000000403 | 44.017 | 6.102 | n/a | 0.000 | 1.298 | 1.504 | 1.490 | 0.018 | n/a | 2.142 | 24.048 | 7.407 | n/a | 0.008 | 7.399 | 0.168 | 0.008 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.039ms; driver.publication.persist-deferred 0.990ms; driver.reader-basis.broadcast 0.051ms |
| 5a2d7a1cf191fe12000000000000081f | 40.178 | 6.117 | n/a | 0.000 | 1.541 | 16.615 | 4.632 | 0.049 | n/a | 1.389 | 9.088 | 0.710 | n/a | 0.036 | 7.659 | 0.191 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.776ms |
| 5a2d7a1cf191fe120000000000000547 | 39.277 | 1.946 | n/a | 0.000 | 4.198 | 0.564 | 4.393 | 0.031 | n/a | 0.067 | 27.108 | 0.958 | n/a | 0.013 | 6.143 | 0.156 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 0.909ms |
| 5a2d7a1cf191fe1200000000000004b7 | 38.368 | 3.717 | n/a | 0.000 | 0.173 | 4.529 | 2.879 | 0.038 | n/a | 4.347 | 15.463 | 7.212 | n/a | 0.010 | 3.890 | 0.101 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.024ms; driver.reader-basis.broadcast 0.122ms |
| 5a2d7a1cf191fe12000000000000054f | 38.079 | 11.525 | n/a | 2.188 | 0.567 | 5.647 | 9.366 | 0.045 | n/a | 1.475 | 5.927 | 1.307 | n/a | 0.032 | 14.280 | 0.375 | 0.032 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.065ms |
| 5a2d7a1cf191fe1200000000000004a5 | 37.622 | 2.929 | n/a | 0.000 | 0.315 | 1.888 | 0.598 | 0.007 | n/a | 0.023 | 15.153 | 16.704 | n/a | 0.005 | 3.244 | 0.086 | 0.005 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.582ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.904ms; driver.publication.persist-deferred 0.049ms |
| 5a2d7a1cf191fe120000000000000405 | 37.017 | 2.386 | n/a | 0.000 | 0.131 | 4.661 | 0.754 | 0.015 | n/a | 0.237 | 28.193 | 0.621 | n/a | 0.021 | 2.516 | 0.068 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.234ms; driver.publication.persist-deferred 1.215ms; driver.publication.persist-deferred 0.990ms |
| 5a2d7a1cf191fe120000000000000533 | 36.843 | 3.427 | 4.101 | 0.303 | 0.098 | 2.579 | 11.463 | 0.046 | n/a | 0.068 | 10.664 | 4.053 | n/a | 0.040 | 7.930 | 0.215 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.109ms; driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 1.190ms; driver.publication.persist-deferred 1.100ms |
| 5a2d7a1cf191fe120000000000000945 | 36.814 | 3.373 | n/a | 0.000 | 0.554 | 26.173 | 2.723 | 0.034 | n/a | 0.240 | 3.446 | 0.257 | n/a | 0.016 | 3.926 | 0.107 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 2.016ms; driver.publication.persist-deferred 0.857ms; driver.reader-basis.broadcast 0.105ms |
| 5a2d7a1cf191fe1200000000000007e7 | 36.118 | 4.072 | n/a | 0.000 | 1.605 | 0.589 | 2.005 | 0.020 | n/a | 0.085 | 7.765 | 19.961 | n/a | 0.017 | 5.677 | 0.157 | 0.017 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.056ms; driver.publication.persist-deferred 0.906ms |
| 5a2d7a1cf191fe12000000000000039d | 35.921 | 4.792 | n/a | 0.000 | 1.174 | 2.492 | 1.280 | 0.015 | n/a | 0.066 | 25.161 | 0.932 | n/a | 0.009 | 5.966 | 0.166 | 0.009 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe12000000000000039c | 34.417 | 2.864 | n/a | 0.000 | 1.128 | 5.117 | 0.700 | 0.009 | n/a | 0.191 | 24.074 | 0.301 | n/a | 0.033 | 3.992 | 0.116 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000553 | 34.279 | 8.929 | n/a | 3.865 | 1.395 | 0.792 | 2.656 | 0.040 | n/a | 2.886 | 9.889 | 3.792 | n/a | 0.035 | 14.188 | 0.414 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.190ms; driver.publication.persist-deferred 1.038ms; driver.publication.persist-deferred 0.724ms |
| 5a2d7a1cf191fe1200000000000004a4 | 33.488 | 3.109 | n/a | 0.000 | 0.802 | 1.068 | 1.301 | 0.017 | n/a | 1.027 | 23.644 | 2.509 | n/a | 0.011 | 3.911 | 0.117 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.582ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.764ms |
| 5a2d7a1cf191fe1200000000000004a9 | 33.419 | 3.251 | n/a | 0.000 | 19.626 | 0.625 | 1.545 | 0.021 | n/a | 0.075 | 7.042 | 1.216 | n/a | 0.016 | 22.878 | 0.685 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.365ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 0.904ms; driver.publication.persist-deferred 0.851ms |
| 5a2d7a1cf191fe12000000000000055a | 33.393 | 2.773 | n/a | 0.000 | 21.851 | 0.503 | 1.050 | 0.014 | n/a | 0.130 | 6.181 | 0.871 | n/a | 0.021 | 24.624 | 0.737 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 5a2d7a1cf191fe120000000000000794 | 32.823 | 2.527 | n/a | 0.000 | 21.639 | 1.036 | 1.189 | 0.013 | n/a | 0.506 | 5.618 | 0.258 | n/a | 0.037 | 24.166 | 0.736 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 21.437ms |
| 5a2d7a1cf191fe1200000000000006eb | 31.886 | 2.668 | n/a | 0.000 | 0.843 | 1.516 | 0.717 | 0.005 | n/a | 0.223 | 25.433 | 0.476 | n/a | 0.005 | 3.511 | 0.110 | 0.005 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.042ms; driver.reader-basis.broadcast 0.089ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.657 | 0.000 | 0.000 | 0.406 | 1.755 | n/a | 0.000 | 0.716 | 0.644 | 0.917 | 0.013 | n/a | 0.121 | 4.144 | 0.497 | n/a | 0.017 | 2.614 | 0.256 | 0.017 |
| p99 | 34.417 | 1.611 | 0.000 | 1.031 | 4.916 | n/a | 0.000 | 9.706 | 10.000 | 5.788 | 0.056 | n/a | 2.526 | 19.724 | 12.355 | n/a | 0.059 | 10.853 | 0.627 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000081a | 45.030 | 1.442 | n/a | 0.000 | 26.235 | 8.987 | 0.817 | 0.009 | n/a | 0.177 | 6.929 | 0.422 | n/a | 0.012 | 27.677 | 0.615 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.235ms; driver.publication.persist-deferred 1.072ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 0.979ms; driver.publication.persist-deferred 0.975ms |
| 5a2d7a1cf191fe120000000000000547 | 39.277 | 1.946 | n/a | 0.000 | 4.198 | 0.564 | 4.393 | 0.031 | n/a | 0.067 | 27.108 | 0.958 | n/a | 0.013 | 6.143 | 0.156 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.141ms; driver.publication.persist-deferred 0.909ms |
| 5a2d7a1cf191fe1200000000000004a5 | 37.622 | 2.929 | n/a | 0.000 | 0.315 | 1.888 | 0.598 | 0.007 | n/a | 0.023 | 15.153 | 16.704 | n/a | 0.005 | 3.244 | 0.086 | 0.005 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.582ms; driver.publication.persist-deferred 1.068ms; driver.publication.persist-deferred 0.904ms; driver.publication.persist-deferred 0.049ms |
| 5a2d7a1cf191fe120000000000000945 | 36.814 | 3.373 | n/a | 0.000 | 0.554 | 26.173 | 2.723 | 0.034 | n/a | 0.240 | 3.446 | 0.257 | n/a | 0.016 | 3.926 | 0.107 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 2.016ms; driver.publication.persist-deferred 0.857ms; driver.reader-basis.broadcast 0.105ms |
| 5a2d7a1cf191fe12000000000000039c | 34.417 | 2.864 | n/a | 0.000 | 1.128 | 5.117 | 0.700 | 0.009 | n/a | 0.191 | 24.074 | 0.301 | n/a | 0.033 | 3.992 | 0.116 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe120000000000000794 | 32.823 | 2.527 | n/a | 0.000 | 21.639 | 1.036 | 1.189 | 0.013 | n/a | 0.506 | 5.618 | 0.258 | n/a | 0.037 | 24.166 | 0.736 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 21.437ms |
| 5a2d7a1cf191fe1200000000000003eb | 31.723 | 5.672 | n/a | 0.000 | 0.701 | 10.025 | 5.177 | 0.052 | n/a | 1.593 | 7.539 | 0.927 | n/a | 0.037 | 6.374 | 0.201 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.235ms |
| 5a2d7a1cf191fe120000000000000949 | 31.463 | 1.909 | n/a | 0.000 | 15.793 | 8.011 | 0.875 | 0.013 | n/a | 0.656 | 3.901 | 0.282 | n/a | 0.024 | 17.702 | 0.563 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.063ms; driver.publication.persist-deferred 0.857ms |
| 5a2d7a1cf191fe1200000000000003f7 | 31.407 | 3.060 | n/a | 0.000 | 0.459 | 2.289 | 3.898 | 0.016 | n/a | 0.769 | 19.724 | 1.157 | n/a | 0.035 | 3.519 | 0.112 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.248ms |
| 5a2d7a1cf191fe120000000000000948 | 30.337 | 1.681 | n/a | 0.000 | 0.738 | 0.292 | 21.222 | 0.029 | n/a | 0.093 | 5.777 | 0.493 | n/a | 0.013 | 2.419 | 0.080 | 0.013 | gw-w/thread-43/commit.prepare-and-validate | driver.publication.persist-deferred 0.857ms |
| 5a2d7a1cf191fe1200000000000004d2 | 29.435 | 3.820 | n/a | 0.000 | 6.049 | 0.771 | 1.198 | 0.038 | n/a | 3.464 | 13.370 | 0.693 | n/a | 0.031 | 9.869 | 0.335 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.738ms; driver.expected-state.bind-receipt 1.319ms; driver.reader-basis.broadcast 0.138ms |
| 5a2d7a1cf191fe1200000000000002e1 | 29.308 | 7.067 | n/a | 0.000 | 0.974 | 2.240 | 9.268 | 0.052 | n/a | 0.218 | 8.742 | 0.723 | n/a | 0.025 | 8.040 | 0.274 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000004a7 | 29.132 | 1.189 | n/a | 0.000 | 0.390 | 2.773 | 0.706 | 0.016 | n/a | 0.297 | 23.378 | 0.361 | n/a | 0.023 | 1.579 | 0.054 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.582ms; driver.publication.persist-deferred 1.831ms; driver.publication.persist-deferred 0.904ms |
| 5a2d7a1cf191fe120000000000000538 | 28.372 | 2.160 | n/a | 0.000 | 0.499 | 10.000 | 0.613 | 0.009 | n/a | 0.025 | 12.647 | 2.414 | n/a | 0.005 | 2.659 | 0.094 | 0.005 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.109ms; driver.publication.persist-deferred 1.216ms; driver.publication.persist-deferred 1.190ms |
| 5a2d7a1cf191fe120000000000000649 | 28.061 | 1.972 | n/a | 0.000 | 0.297 | 5.439 | 0.945 | 0.012 | n/a | 1.774 | 11.644 | 5.931 | n/a | 0.046 | 2.270 | 0.081 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.278ms; driver.publication.persist-deferred 1.270ms; driver.reader-basis.broadcast 0.067ms |
| 5a2d7a1cf191fe1200000000000004b8 | 26.798 | 1.312 | n/a | 0.000 | 0.414 | 3.412 | 1.163 | 0.060 | n/a | 0.174 | 19.870 | 0.377 | n/a | 0.015 | 1.726 | 0.064 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.024ms; driver.reader-basis.broadcast 0.122ms |
| 5a2d7a1cf191fe12000000000000038a | 26.750 | 1.588 | n/a | 0.000 | 0.478 | 1.480 | 0.846 | 0.015 | n/a | 2.526 | 13.412 | 6.384 | n/a | 0.021 | 2.066 | 0.077 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.732ms |
| 5a2d7a1cf191fe1200000000000006ea | 25.845 | 2.590 | n/a | 0.000 | 0.617 | 1.450 | 0.916 | 0.011 | n/a | 0.903 | 3.197 | 16.139 | n/a | 0.022 | 3.207 | 0.124 | 0.022 | tx/thread-87/transactor.triplex-function | driver.reader-basis.broadcast 0.089ms |
| 5a2d7a1cf191fe1200000000000007f2 | 25.810 | 2.303 | n/a | 0.000 | 0.399 | 12.842 | 1.361 | 0.019 | n/a | 0.115 | 8.368 | 0.397 | n/a | 0.006 | 2.702 | 0.105 | 0.006 | node-14/thread-0/socket.queue-and-write | driver.publication.persist-deferred 6.553ms; driver.publication.persist-deferred 1.126ms; driver.publication.persist-deferred 0.965ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.890ms |
| 5a2d7a1cf191fe120000000000000336 | 25.166 | 1.942 | n/a | 0.000 | 0.470 | 4.573 | 1.291 | 0.026 | n/a | 0.105 | 12.484 | 4.257 | n/a | 0.017 | 2.412 | 0.096 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.217ms |

## P2 / tail / commit (2632 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.232 | 0.111 | 0.000 | 0.510 | 2.159 | n/a | 0.000 | 0.693 | 0.579 | 0.921 | 0.011 | n/a | 0.093 | 3.790 | 0.618 | n/a | 0.013 | 3.016 | 0.305 | 0.013 |
| p99 | 36.009 | 2.015 | 0.033 | 2.117 | 6.934 | n/a | 0.000 | 10.673 | 8.592 | 5.638 | 0.041 | n/a | 2.772 | 17.287 | 4.746 | n/a | 0.042 | 13.905 | 0.658 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000127e | 85.690 | 3.368 | n/a | 0.000 | 61.213 | 5.903 | 1.284 | 0.020 | n/a | 3.449 | 10.003 | 0.418 | n/a | 0.031 | 64.582 | 0.754 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 61.040ms; driver.publication.persist-deferred 1.832ms; driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.187ms |
| 5a2d7a1cf191fe12000000000000127f | 74.364 | 4.755 | n/a | 0.000 | 57.254 | 4.119 | 0.948 | 0.009 | n/a | 0.034 | 6.303 | 0.935 | n/a | 0.006 | 62.010 | 0.834 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 56.675ms; driver.reader-basis.broadcast 0.187ms |
| 5a2d7a1cf191fe1200000000000016df | 71.427 | 2.654 | n/a | 0.000 | 0.252 | 0.499 | 0.932 | 0.012 | n/a | 0.085 | 66.458 | 0.467 | n/a | 0.067 | 2.906 | 0.041 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.536ms |
| 5a2d7a1cf191fe120000000000001280 | 71.285 | 5.396 | n/a | 0.000 | 48.337 | 7.493 | 0.848 | 0.009 | n/a | 0.019 | 8.429 | 0.750 | n/a | 0.005 | 53.734 | 0.754 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 47.597ms; driver.publication.persist-deferred 1.832ms; driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.187ms |
| 5a2d7a1cf191fe1200000000000011ba | 62.117 | 1.408 | n/a | 0.000 | 49.262 | 1.961 | 0.990 | 0.012 | n/a | 0.061 | 7.544 | 0.822 | n/a | 0.058 | 50.670 | 0.816 | 0.058 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.551ms; driver.expected-state.bind-receipt 1.485ms; driver.publication.persist-deferred 1.178ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.persist-deferred 1.011ms |
| 5a2d7a1cf191fe12000000000000128d | 56.952 | 3.045 | 2.296 | 0.000 | 0.014 | 6.607 | 34.337 | 0.018 | n/a | 0.358 | 7.682 | 2.587 | n/a | 0.006 | 5.356 | 0.094 | 0.006 | gw-w/thread-40/gateway.admitted-work | driver.publication.persist-deferred 1.293ms; driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 1.003ms; driver.publication.persist-deferred 0.885ms; driver.publication.persist-deferred 0.817ms |
| 5a2d7a1cf191fe1200000000000011b7 | 52.543 | 7.956 | n/a | 0.000 | 1.485 | 22.566 | 2.630 | 0.030 | n/a | 0.617 | 16.742 | 0.487 | n/a | 0.030 | 9.440 | 0.180 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.551ms; driver.expected-state.bind-receipt 1.485ms; driver.publication.persist-deferred 1.178ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.persist-deferred 1.011ms |
| 5a2d7a1cf191fe120000000000001bde | 50.159 | 1.733 | n/a | 0.000 | 0.665 | 41.135 | 0.794 | 0.011 | n/a | 0.077 | 4.917 | 0.802 | n/a | 0.023 | 2.398 | 0.048 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5a2d7a1cf191fe120000000000001bdf | 49.740 | 1.245 | n/a | 0.000 | 1.203 | 40.790 | 0.430 | 0.005 | n/a | 0.025 | 5.368 | 0.668 | n/a | 0.005 | 2.448 | 0.049 | 0.005 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5a2d7a1cf191fe120000000000001545 | 43.385 | 1.353 | n/a | 0.000 | 17.977 | 0.349 | 0.735 | 0.011 | n/a | 0.069 | 22.348 | 0.533 | n/a | 0.011 | 19.329 | 0.446 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 0.980ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.697ms; driver.reader-basis.broadcast 0.253ms |
| 5a2d7a1cf191fe120000000000001672 | 43.292 | 1.930 | n/a | 0.000 | 2.688 | 8.665 | 0.774 | 0.010 | n/a | 0.275 | 28.307 | 0.628 | n/a | 0.014 | 4.618 | 0.107 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.154ms; driver.publication.persist-deferred 1.002ms; driver.reader-basis.broadcast 0.558ms |
| 5a2d7a1cf191fe120000000000001670 | 43.083 | 2.020 | n/a | 0.000 | 0.555 | 7.673 | 0.749 | 0.012 | n/a | 0.060 | 30.733 | 1.266 | n/a | 0.014 | 2.575 | 0.060 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.154ms; driver.publication.persist-deferred 1.002ms; driver.reader-basis.broadcast 0.558ms |
| 5a2d7a1cf191fe120000000000000ad4 | 41.989 | 4.472 | n/a | 0.000 | 0.360 | 4.052 | 2.200 | 0.029 | n/a | 0.528 | 29.101 | 1.213 | n/a | 0.034 | 4.832 | 0.115 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 0.837ms; driver.publication.persist-deferred 0.807ms |
| 5a2d7a1cf191fe120000000000000c8b | 41.756 | 3.284 | n/a | 0.000 | 24.302 | 2.592 | 0.739 | 0.012 | n/a | 0.094 | 6.515 | 4.194 | n/a | 0.024 | 27.586 | 0.661 | 0.024 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.855ms; driver.publication.persist-deferred 3.005ms; driver.publication.persist-deferred 1.059ms; driver.publication.persist-deferred 0.742ms |
| 5a2d7a1cf191fe120000000000000c87 | 41.618 | 5.896 | n/a | 0.000 | 0.208 | 2.138 | 3.238 | 0.019 | n/a | 0.053 | 29.529 | 0.524 | n/a | 0.013 | 6.104 | 0.147 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 5a2d7a1cf191fe1200000000000009d7 | 41.156 | 3.968 | n/a | 0.000 | 3.678 | 11.028 | 2.765 | 5.766 | n/a | 0.300 | 12.586 | 1.036 | n/a | 0.028 | 7.647 | 0.186 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.192ms; driver.publication.persist-deferred 1.352ms; driver.publication.persist-deferred 1.222ms |
| 5a2d7a1cf191fe120000000000000c8a | 41.150 | 15.466 | n/a | 0.000 | 0.335 | 0.754 | 2.779 | 0.035 | n/a | 0.181 | 19.605 | 1.973 | n/a | 0.021 | 15.801 | 0.384 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.855ms; driver.publication.persist-deferred 3.005ms; driver.publication.persist-deferred 0.742ms |
| 5a2d7a1cf191fe12000000000000128e | 40.901 | 2.158 | n/a | 0.000 | 0.677 | 2.541 | 1.756 | 0.004 | n/a | 0.695 | 31.833 | 1.234 | n/a | 0.003 | 2.835 | 0.069 | 0.003 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.042ms; driver.publication.persist-deferred 1.003ms; driver.reader-basis.broadcast 0.430ms |
| 5a2d7a1cf191fe120000000000001673 | 40.186 | 1.299 | n/a | 0.000 | 1.554 | 9.018 | 0.515 | 0.007 | n/a | 0.031 | 27.428 | 0.324 | n/a | 0.009 | 2.854 | 0.071 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.002ms; driver.reader-basis.broadcast 0.558ms |
| 5a2d7a1cf191fe1200000000000016e0 | 39.885 | 2.159 | n/a | 0.000 | 0.270 | 1.888 | 1.216 | 0.014 | n/a | 0.269 | 33.472 | 0.546 | n/a | 0.051 | 2.429 | 0.061 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.824ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.030 | 0.000 | 0.000 | 0.389 | 1.711 | n/a | 0.000 | 0.704 | 0.560 | 0.805 | 0.011 | n/a | 0.093 | 3.542 | 0.479 | n/a | 0.013 | 2.537 | 0.291 | 0.013 |
| p99 | 37.174 | 1.737 | 0.033 | 0.865 | 4.914 | n/a | 0.000 | 11.702 | 9.018 | 4.183 | 0.038 | n/a | 2.717 | 18.391 | 3.563 | n/a | 0.048 | 13.298 | 0.680 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5a2d7a1cf191fe12000000000000127e | 85.690 | 3.368 | n/a | 0.000 | 61.213 | 5.903 | 1.284 | 0.020 | n/a | 3.449 | 10.003 | 0.418 | n/a | 0.031 | 64.582 | 0.754 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 61.040ms; driver.publication.persist-deferred 1.832ms; driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.187ms |
| 5a2d7a1cf191fe12000000000000127f | 74.364 | 4.755 | n/a | 0.000 | 57.254 | 4.119 | 0.948 | 0.009 | n/a | 0.034 | 6.303 | 0.935 | n/a | 0.006 | 62.010 | 0.834 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 56.675ms; driver.reader-basis.broadcast 0.187ms |
| 5a2d7a1cf191fe1200000000000016df | 71.427 | 2.654 | n/a | 0.000 | 0.252 | 0.499 | 0.932 | 0.012 | n/a | 0.085 | 66.458 | 0.467 | n/a | 0.067 | 2.906 | 0.041 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.536ms |
| 5a2d7a1cf191fe120000000000001280 | 71.285 | 5.396 | n/a | 0.000 | 48.337 | 7.493 | 0.848 | 0.009 | n/a | 0.019 | 8.429 | 0.750 | n/a | 0.005 | 53.734 | 0.754 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 47.597ms; driver.publication.persist-deferred 1.832ms; driver.publication.persist-deferred 1.240ms; driver.reader-basis.broadcast 0.187ms |
| 5a2d7a1cf191fe1200000000000011ba | 62.117 | 1.408 | n/a | 0.000 | 49.262 | 1.961 | 0.990 | 0.012 | n/a | 0.061 | 7.544 | 0.822 | n/a | 0.058 | 50.670 | 0.816 | 0.058 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.551ms; driver.expected-state.bind-receipt 1.485ms; driver.publication.persist-deferred 1.178ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.persist-deferred 1.011ms |
| 5a2d7a1cf191fe1200000000000011b7 | 52.543 | 7.956 | n/a | 0.000 | 1.485 | 22.566 | 2.630 | 0.030 | n/a | 0.617 | 16.742 | 0.487 | n/a | 0.030 | 9.440 | 0.180 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.551ms; driver.expected-state.bind-receipt 1.485ms; driver.publication.persist-deferred 1.178ms; driver.expected-state.bind-receipt 1.089ms; driver.publication.persist-deferred 1.011ms |
| 5a2d7a1cf191fe120000000000001bde | 50.159 | 1.733 | n/a | 0.000 | 0.665 | 41.135 | 0.794 | 0.011 | n/a | 0.077 | 4.917 | 0.802 | n/a | 0.023 | 2.398 | 0.048 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5a2d7a1cf191fe120000000000001bdf | 49.740 | 1.245 | n/a | 0.000 | 1.203 | 40.790 | 0.430 | 0.005 | n/a | 0.025 | 5.368 | 0.668 | n/a | 0.005 | 2.448 | 0.049 | 0.005 | node-14/thread-0/socket.wait-first-byte | none observed |
| 5a2d7a1cf191fe120000000000001545 | 43.385 | 1.353 | n/a | 0.000 | 17.977 | 0.349 | 0.735 | 0.011 | n/a | 0.069 | 22.348 | 0.533 | n/a | 0.011 | 19.329 | 0.446 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.093ms; driver.publication.persist-deferred 0.980ms; driver.publication.persist-deferred 0.940ms; driver.publication.persist-deferred 0.697ms; driver.reader-basis.broadcast 0.253ms |
| 5a2d7a1cf191fe120000000000001670 | 43.083 | 2.020 | n/a | 0.000 | 0.555 | 7.673 | 0.749 | 0.012 | n/a | 0.060 | 30.733 | 1.266 | n/a | 0.014 | 2.575 | 0.060 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.154ms; driver.publication.persist-deferred 1.002ms; driver.reader-basis.broadcast 0.558ms |
| 5a2d7a1cf191fe120000000000000ad4 | 41.989 | 4.472 | n/a | 0.000 | 0.360 | 4.052 | 2.200 | 0.029 | n/a | 0.528 | 29.101 | 1.213 | n/a | 0.034 | 4.832 | 0.115 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.075ms; driver.publication.persist-deferred 0.837ms; driver.publication.persist-deferred 0.807ms |
| 5a2d7a1cf191fe120000000000000c8b | 41.756 | 3.284 | n/a | 0.000 | 24.302 | 2.592 | 0.739 | 0.012 | n/a | 0.094 | 6.515 | 4.194 | n/a | 0.024 | 27.586 | 0.661 | 0.024 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 3.855ms; driver.publication.persist-deferred 3.005ms; driver.publication.persist-deferred 1.059ms; driver.publication.persist-deferred 0.742ms |
| 5a2d7a1cf191fe120000000000001673 | 40.186 | 1.299 | n/a | 0.000 | 1.554 | 9.018 | 0.515 | 0.007 | n/a | 0.031 | 27.428 | 0.324 | n/a | 0.009 | 2.854 | 0.071 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.002ms; driver.reader-basis.broadcast 0.558ms |
| 5a2d7a1cf191fe1200000000000016e0 | 39.885 | 2.159 | n/a | 0.000 | 0.270 | 1.888 | 1.216 | 0.014 | n/a | 0.269 | 33.472 | 0.546 | n/a | 0.051 | 2.429 | 0.061 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.824ms |
| 5a2d7a1cf191fe1200000000000009d8 | 38.987 | 3.608 | n/a | 0.000 | 3.262 | 14.614 | 1.307 | 0.024 | n/a | 2.352 | 11.646 | 2.161 | n/a | 0.013 | 6.870 | 0.176 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 5.192ms; driver.publication.persist-deferred 1.352ms; driver.publication.persist-deferred 1.222ms |
| 5a2d7a1cf191fe1200000000000009ae | 37.174 | 1.992 | n/a | 0.000 | 7.277 | 7.671 | 1.266 | 0.018 | n/a | 3.514 | 14.968 | 0.463 | n/a | 0.005 | 9.269 | 0.249 | 0.005 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.555ms; driver.publication.persist-deferred 1.355ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.179ms; driver.publication.persist-deferred 1.103ms |
| 5a2d7a1cf191fe120000000000001676 | 36.198 | 1.351 | n/a | 0.000 | 1.433 | 9.362 | 0.941 | 0.016 | n/a | 0.124 | 22.720 | 0.245 | n/a | 0.008 | 2.784 | 0.077 | 0.008 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.002ms; driver.reader-basis.broadcast 0.558ms |
| 5a2d7a1cf191fe120000000000001c0c | 34.749 | 2.359 | n/a | 0.000 | 1.107 | 0.428 | 19.792 | 0.003 | n/a | 0.011 | 10.081 | 0.949 | n/a | 0.020 | 3.466 | 0.100 | 0.020 | gw-w/thread-46/commit.prepare-and-validate | driver.publication.persist-deferred 4.816ms |
| 5a2d7a1cf191fe120000000000001656 | 34.462 | 9.165 | n/a | 0.000 | 0.718 | 18.061 | 1.913 | 0.027 | n/a | 0.247 | 3.871 | 0.453 | n/a | 0.006 | 9.883 | 0.287 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 2.823ms; driver.publication.persist-deferred 1.414ms; driver.publication.persist-deferred 1.319ms; driver.publication.persist-deferred 0.976ms; driver.publication.persist-deferred 0.650ms |
| 5a2d7a1cf191fe1200000000000009af | 33.022 | 3.139 | n/a | 0.000 | 3.830 | 10.745 | 0.576 | 0.005 | n/a | 0.046 | 11.103 | 3.572 | n/a | 0.006 | 6.969 | 0.211 | 0.006 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.355ms; driver.expected-state.bind-receipt 1.311ms; driver.publication.persist-deferred 1.179ms; driver.publication.persist-deferred 1.103ms; driver.expected-state.bind-receipt 1.097ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.994 | n/a | n/a | n/a | 0.130 | n/a | 0.000 | 0.000 | 0.896 | 200.481 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.110 | 0.130 | 0.001 | 0.110 |
| p99 | 421.957 | n/a | n/a | n/a | 19.077 | n/a | 1.882 | 0.000 | 4.010 | 418.049 | 0.112 | n/a | 0.123 | 0.000 | n/a | n/a | 0.281 | 20.510 | 0.328 | 0.281 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace0000000000000002 | 421.957 | 2.542 | n/a | 0.000 | 0.000 | 0.896 | 418.049 | 0.112 | n/a | 0.076 | 0.000 | n/a | n/a | 0.281 | 2.542 | 0.006 | 0.281 | gw-r/thread-44/gateway.admitted-work | none observed |
| 0c355bf3247cf8720000000000000006 | 202.604 | 0.130 | n/a | 0.000 | 0.000 | 1.134 | 201.100 | 0.016 | n/a | 0.123 | 0.000 | n/a | n/a | 0.101 | 0.130 | 0.001 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000005 | 202.131 | 0.045 | n/a | 0.000 | 0.000 | 0.804 | 201.005 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.154 | 0.045 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf8720000000000000f10 | 201.171 | 0.051 | n/a | 0.000 | 0.000 | 0.528 | 200.481 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.081 | 0.051 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf8720000000000000f11 | 200.994 | 0.029 | n/a | 0.000 | 0.000 | 0.518 | 200.362 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000f12 | 200.905 | 0.019 | n/a | 0.000 | 0.000 | 0.226 | 200.567 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.042 | 0.019 | 0.000 | 0.042 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000f16 | 63.201 | 19.077 | n/a | 0.000 | 0.000 | 4.010 | 39.972 | 0.003 | n/a | 0.006 | 0.000 | n/a | n/a | 0.133 | 19.077 | 0.302 | 0.133 | gw-r/thread-44/gateway.admitted-work | none observed |
| 0c355bf3247cf8720000000000000f17 | 62.519 | 18.629 | n/a | 1.882 | 0.000 | 3.119 | 38.750 | 0.003 | n/a | 0.005 | 0.000 | n/a | n/a | 0.131 | 20.510 | 0.328 | 0.131 | gw-r/thread-43/gateway.admitted-work | none observed |
| 0c355bf3247cf8720000000000000f15 | 58.710 | 14.481 | n/a | 0.000 | 0.000 | 3.566 | 40.543 | 0.006 | n/a | 0.005 | 0.000 | n/a | n/a | 0.110 | 14.481 | 0.247 | 0.110 | gw-r/thread-45/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 822.014 | n/a | n/a | n/a | 0.171 | n/a | 0.000 | 0.000 | 0.951 | 791.902 | 0.010 | n/a | 0.341 | 0.000 | n/a | n/a | 0.390 | 0.171 | 0.000 | 0.390 |
| p99 | 1006.314 | n/a | n/a | n/a | 28.413 | n/a | 0.000 | 0.000 | 1.331 | 1002.954 | 0.012 | n/a | 0.346 | 0.000 | n/a | n/a | 1.507 | 28.413 | 0.035 | 1.507 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace00000000000000a4 | 1006.314 | 0.171 | n/a | 0.000 | 0.000 | 1.331 | 1002.954 | 0.010 | n/a | 0.341 | 0.000 | n/a | n/a | 1.507 | 0.171 | 0.000 | 1.507 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000a5 | 822.014 | 28.413 | n/a | 0.000 | 0.000 | 0.951 | 791.902 | 0.012 | n/a | 0.346 | 0.000 | n/a | n/a | 0.390 | 28.413 | 0.035 | 0.390 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 459.438 | n/a | n/a | n/a | 2.624 | n/a | 0.000 | 0.000 | 0.900 | 455.372 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.092 | 2.624 | 0.008 | 0.092 |
| p99 | 1003.181 | n/a | n/a | n/a | 11.063 | n/a | 0.000 | 0.000 | 3.444 | 1001.300 | 0.073 | n/a | 0.187 | 0.000 | n/a | n/a | 1.098 | 11.063 | 0.078 | 1.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace00000000000000ae | 1003.181 | 0.120 | n/a | 0.000 | 0.000 | 0.443 | 1001.300 | 0.073 | n/a | 0.146 | 0.000 | n/a | n/a | 1.098 | 0.120 | 0.000 | 1.098 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000bc | 998.101 | 2.494 | n/a | 0.000 | 0.000 | 3.444 | 992.008 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.082 | 2.494 | 0.002 | 0.082 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace00000000000000bb | 994.735 | 2.822 | n/a | 0.000 | 0.000 | 1.032 | 990.694 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.086 | 2.822 | 0.003 | 0.086 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000b5 | 988.144 | 2.512 | n/a | 0.000 | 0.000 | 1.227 | 984.179 | 0.021 | n/a | 0.103 | 0.000 | n/a | n/a | 0.103 | 2.512 | 0.003 | 0.103 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000cf | 970.200 | 2.508 | n/a | 0.000 | 0.000 | 0.636 | 966.869 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.076 | 2.508 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000ab | 940.465 | 5.268 | n/a | 0.000 | 0.000 | 0.663 | 934.226 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.217 | 5.268 | 0.006 | 0.217 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace00000000000000a8 | 899.779 | 2.172 | n/a | 0.000 | 0.000 | 0.501 | 896.951 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.098 | 2.172 | 0.002 | 0.098 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000000c2 | 889.814 | 11.063 | n/a | 0.000 | 0.000 | 0.742 | 877.733 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.204 | 11.063 | 0.012 | 0.204 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000000cb | 758.145 | 3.947 | n/a | 0.000 | 0.000 | 0.501 | 753.477 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.126 | 3.947 | 0.005 | 0.126 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000b4 | 565.852 | 3.230 | n/a | 0.000 | 0.000 | 1.622 | 560.813 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.099 | 3.230 | 0.006 | 0.099 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000c5 | 540.013 | 2.611 | n/a | 0.000 | 0.000 | 2.322 | 534.855 | 0.018 | n/a | 0.116 | 0.000 | n/a | n/a | 0.090 | 2.611 | 0.005 | 0.090 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000000ca | 505.506 | 2.284 | n/a | 0.000 | 0.000 | 0.696 | 502.253 | 0.026 | n/a | 0.170 | 0.000 | n/a | n/a | 0.076 | 2.284 | 0.005 | 0.076 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000000c8 | 493.173 | 2.626 | n/a | 0.000 | 0.000 | 0.961 | 489.434 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.068 | 2.626 | 0.005 | 0.068 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000c1 | 486.723 | 3.887 | n/a | 0.000 | 0.000 | 1.969 | 480.636 | 0.020 | n/a | 0.119 | 0.000 | n/a | n/a | 0.092 | 3.887 | 0.008 | 0.092 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace00000000000000c7 | 459.438 | 2.390 | n/a | 0.000 | 0.000 | 1.551 | 455.372 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 2.390 | 0.005 | 0.077 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000000b8 | 438.843 | 3.439 | n/a | 0.000 | 0.000 | 0.533 | 434.618 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.209 | 3.439 | 0.008 | 0.209 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace00000000000000b6 | 334.469 | 4.887 | n/a | 0.000 | 0.000 | 0.513 | 328.906 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.085 | 4.887 | 0.015 | 0.085 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace00000000000000b2 | 311.787 | 7.010 | n/a | 0.000 | 0.000 | 2.821 | 301.645 | 0.021 | n/a | 0.187 | 0.000 | n/a | n/a | 0.104 | 7.010 | 0.022 | 0.104 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000a7 | 284.365 | 3.120 | n/a | 0.000 | 0.000 | 0.900 | 280.035 | 0.027 | n/a | 0.149 | 0.000 | n/a | n/a | 0.134 | 3.120 | 0.011 | 0.134 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000bd | 264.378 | 2.376 | n/a | 0.000 | 0.000 | 1.389 | 260.426 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.081 | 2.376 | 0.009 | 0.081 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 455.079 | n/a | n/a | n/a | 3.902 | n/a | 0.548 | 0.000 | 0.790 | 450.064 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.088 | 4.411 | 0.011 | 0.088 |
| p99 | 1010.848 | n/a | n/a | n/a | 13.467 | n/a | 5.120 | 0.000 | 4.309 | 1003.631 | 2.177 | n/a | 0.162 | 0.000 | n/a | n/a | 0.251 | 16.467 | 0.459 | 0.251 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace00000000000000dd | 1010.848 | 5.014 | n/a | 0.708 | 0.000 | 1.324 | 1003.631 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.103 | 5.722 | 0.006 | 0.103 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000000d1 | 1006.956 | 13.467 | n/a | 0.773 | 0.000 | 1.079 | 991.394 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.168 | 14.240 | 0.014 | 0.168 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace00000000000000d2 | 999.661 | 3.708 | n/a | 0.548 | 0.000 | 0.677 | 994.570 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.087 | 4.256 | 0.004 | 0.087 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000104 | 997.794 | 2.714 | n/a | 0.660 | 0.000 | 0.768 | 993.469 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.100 | 3.374 | 0.003 | 0.100 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000fd | 996.679 | 2.514 | n/a | 0.595 | 0.000 | 0.563 | 992.797 | 0.014 | n/a | 0.108 | 0.000 | n/a | n/a | 0.088 | 3.109 | 0.003 | 0.088 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000d9 | 996.134 | 3.386 | n/a | 1.071 | 0.000 | 1.564 | 989.954 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.076 | 4.456 | 0.004 | 0.076 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000de | 990.227 | 3.313 | n/a | 0.540 | 0.000 | 0.690 | 985.449 | 0.026 | n/a | 0.095 | 0.000 | n/a | n/a | 0.113 | 3.853 | 0.004 | 0.113 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000000d8 | 985.275 | 7.145 | n/a | 0.737 | 0.000 | 2.170 | 975.074 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.099 | 7.882 | 0.008 | 0.099 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace000000000000010c | 984.104 | 4.411 | n/a | 0.000 | 0.000 | 3.125 | 976.457 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.065 | 4.411 | 0.004 | 0.065 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000000df | 908.662 | 3.989 | n/a | 0.528 | 0.000 | 0.410 | 903.592 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.083 | 4.517 | 0.005 | 0.083 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace0000000000000100 | 907.021 | 2.887 | n/a | 0.000 | 0.000 | 0.715 | 903.249 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.083 | 2.887 | 0.003 | 0.083 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000000101 | 894.702 | 2.511 | n/a | 0.662 | 0.000 | 1.751 | 889.614 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.089 | 3.174 | 0.004 | 0.089 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000e4 | 701.565 | 6.451 | n/a | 0.705 | 0.000 | 1.519 | 692.574 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.251 | 7.156 | 0.010 | 0.251 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000000ea | 672.715 | 4.684 | n/a | 0.630 | 0.000 | 0.670 | 666.525 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.120 | 5.314 | 0.008 | 0.120 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace00000000000000fa | 671.301 | 8.369 | n/a | 0.000 | 0.000 | 0.790 | 661.998 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.082 | 8.369 | 0.012 | 0.082 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000000da | 644.063 | 6.861 | n/a | 0.753 | 0.000 | 1.433 | 634.748 | 0.015 | n/a | 0.162 | 0.000 | n/a | n/a | 0.092 | 7.614 | 0.012 | 0.092 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000000d3 | 515.653 | 3.712 | n/a | 0.807 | 0.000 | 1.240 | 509.711 | 0.015 | n/a | 0.085 | 0.000 | n/a | n/a | 0.083 | 4.519 | 0.009 | 0.083 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000000e5 | 512.062 | 3.926 | n/a | 0.612 | 0.000 | 0.849 | 506.498 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.084 | 4.538 | 0.009 | 0.084 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace00000000000000e7 | 483.712 | 3.131 | n/a | 0.666 | 0.000 | 0.541 | 479.202 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.105 | 3.797 | 0.008 | 0.105 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace0000000000000106 | 467.118 | 11.347 | n/a | 5.120 | 0.000 | 0.424 | 450.064 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.129 | 16.467 | 0.035 | 0.129 | gw-r/thread-41/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 433.822 | n/a | n/a | n/a | 3.115 | n/a | 0.000 | 0.000 | 0.724 | 421.008 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.081 | 3.251 | 0.011 | 0.081 |
| p99 | 1007.640 | n/a | n/a | n/a | 11.370 | n/a | 2.208 | 0.000 | 4.168 | 1004.489 | 0.643 | n/a | 0.101 | 0.000 | n/a | n/a | 1.131 | 12.088 | 0.409 | 1.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace0000000000000128 | 1007.640 | 2.640 | n/a | 0.000 | 0.000 | 0.393 | 1004.489 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.072 | 2.640 | 0.003 | 0.072 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000135 | 1003.014 | 0.199 | n/a | 0.000 | 0.000 | 0.561 | 1001.031 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 1.131 | 0.199 | 0.000 | 1.131 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000113 | 1000.578 | 2.678 | n/a | 0.748 | 0.000 | 0.619 | 996.386 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.100 | 3.426 | 0.003 | 0.100 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000129 | 998.633 | 3.115 | n/a | 0.000 | 0.000 | 0.458 | 994.920 | 0.031 | n/a | 0.044 | 0.000 | n/a | n/a | 0.065 | 3.115 | 0.003 | 0.065 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace000000000000011b | 994.704 | 4.032 | n/a | 0.752 | 0.000 | 4.168 | 985.579 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.111 | 4.784 | 0.005 | 0.111 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000000124 | 989.349 | 2.718 | n/a | 0.000 | 0.000 | 0.834 | 985.601 | 0.016 | n/a | 0.062 | 0.000 | n/a | n/a | 0.117 | 2.718 | 0.003 | 0.117 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000110 | 927.720 | 2.326 | n/a | 0.609 | 0.000 | 2.679 | 921.975 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.078 | 2.936 | 0.003 | 0.078 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000125 | 871.072 | 9.865 | n/a | 1.273 | 0.000 | 1.108 | 858.548 | 0.028 | n/a | 0.059 | 0.000 | n/a | n/a | 0.191 | 11.137 | 0.013 | 0.191 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace000000000000013f | 858.807 | 2.589 | n/a | 0.000 | 0.000 | 0.468 | 855.623 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.059 | 2.589 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace000000000000011c | 854.529 | 2.266 | n/a | 0.000 | 0.000 | 0.423 | 851.695 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.065 | 2.266 | 0.003 | 0.065 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000132 | 792.233 | 7.438 | n/a | 0.930 | 0.000 | 0.692 | 782.889 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.237 | 8.368 | 0.011 | 0.237 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace000000000000010d | 779.188 | 2.608 | n/a | 0.643 | 0.000 | 0.425 | 775.366 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.097 | 3.251 | 0.004 | 0.097 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000140 | 729.189 | 5.131 | n/a | 0.630 | 0.000 | 0.551 | 722.683 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.142 | 5.761 | 0.008 | 0.142 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000137 | 678.250 | 8.273 | n/a | 0.703 | 0.000 | 0.538 | 668.572 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.103 | 8.976 | 0.013 | 0.103 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000000147 | 642.268 | 4.274 | n/a | 1.573 | 0.000 | 3.146 | 633.085 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.142 | 5.846 | 0.009 | 0.142 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace000000000000013c | 612.522 | 4.645 | n/a | 0.000 | 0.000 | 0.724 | 606.983 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.124 | 4.645 | 0.008 | 0.124 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000131 | 603.444 | 2.416 | n/a | 0.000 | 0.000 | 0.753 | 600.173 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.416 | 0.004 | 0.063 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000122 | 572.465 | 4.415 | n/a | 0.000 | 0.000 | 1.471 | 566.385 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.148 | 4.415 | 0.008 | 0.148 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace000000000000012b | 531.978 | 2.497 | n/a | 0.000 | 0.000 | 0.369 | 529.011 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.066 | 2.497 | 0.005 | 0.066 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace000000000000012a | 460.429 | 4.165 | n/a | 0.000 | 0.000 | 3.005 | 453.110 | 0.016 | n/a | 0.056 | 0.000 | n/a | n/a | 0.077 | 4.165 | 0.009 | 0.077 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 471.000 | n/a | n/a | n/a | 2.570 | n/a | 0.000 | 0.000 | 0.747 | 467.841 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.076 | 2.695 | 0.007 | 0.076 |
| p99 | 1005.523 | n/a | n/a | n/a | 10.233 | n/a | 0.951 | 0.000 | 6.447 | 1001.239 | 0.779 | n/a | 0.088 | 0.000 | n/a | n/a | 1.050 | 10.233 | 0.572 | 1.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace0000000000000152 | 1005.523 | 4.121 | n/a | 0.000 | 0.000 | 3.894 | 997.392 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.081 | 4.121 | 0.004 | 0.081 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000000182 | 1003.534 | 0.106 | n/a | 0.000 | 0.000 | 1.041 | 1001.239 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 1.050 | 0.106 | 0.000 | 1.050 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace000000000000017b | 1003.058 | 2.329 | n/a | 0.000 | 0.000 | 0.706 | 999.849 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.122 | 2.329 | 0.002 | 0.122 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000000162 | 1001.818 | 2.399 | n/a | 0.000 | 0.000 | 0.490 | 998.818 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.073 | 2.399 | 0.002 | 0.073 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000000181 | 999.013 | 2.457 | n/a | 0.000 | 0.000 | 1.773 | 994.669 | 0.022 | n/a | 0.034 | 0.000 | n/a | n/a | 0.058 | 2.457 | 0.002 | 0.058 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace000000000000016b | 992.269 | 6.451 | n/a | 0.000 | 0.000 | 0.967 | 984.714 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.080 | 6.451 | 0.007 | 0.080 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000170 | 856.384 | 2.695 | n/a | 0.000 | 0.000 | 1.262 | 852.330 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.064 | 2.695 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000153 | 838.159 | 4.453 | n/a | 0.000 | 0.000 | 6.447 | 827.089 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.130 | 4.453 | 0.005 | 0.130 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace0000000000000176 | 746.470 | 4.160 | n/a | 0.000 | 0.000 | 0.674 | 741.531 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.067 | 4.160 | 0.006 | 0.067 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000157 | 744.444 | 3.594 | n/a | 0.000 | 0.000 | 0.392 | 740.358 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.067 | 3.594 | 0.005 | 0.067 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace000000000000014d | 700.848 | 3.453 | n/a | 0.000 | 0.000 | 4.222 | 693.023 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.108 | 3.453 | 0.005 | 0.108 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace0000000000000163 | 680.895 | 10.233 | n/a | 0.000 | 0.000 | 2.820 | 667.694 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.091 | 10.233 | 0.015 | 0.091 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace000000000000016a | 531.179 | 5.212 | n/a | 0.000 | 0.000 | 0.567 | 525.118 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.214 | 5.212 | 0.010 | 0.214 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace000000000000017f | 526.573 | 2.313 | n/a | 0.000 | 0.000 | 0.503 | 523.638 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.061 | 2.313 | 0.004 | 0.061 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000172 | 516.853 | 3.445 | n/a | 0.000 | 0.000 | 0.829 | 512.453 | 0.003 | n/a | 0.050 | 0.000 | n/a | n/a | 0.073 | 3.445 | 0.007 | 0.073 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace000000000000016c | 513.456 | 8.414 | n/a | 0.000 | 0.000 | 2.157 | 502.680 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.171 | 8.414 | 0.016 | 0.171 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace0000000000000184 | 503.491 | 2.509 | n/a | 0.000 | 0.000 | 0.641 | 500.219 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.076 | 2.509 | 0.005 | 0.076 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000185 | 491.986 | 2.350 | n/a | 0.951 | 0.000 | 0.725 | 487.829 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.090 | 3.301 | 0.007 | 0.090 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace000000000000017a | 486.436 | 2.475 | n/a | 0.000 | 0.000 | 0.759 | 482.271 | 0.779 | n/a | 0.033 | 0.000 | n/a | n/a | 0.118 | 2.475 | 0.005 | 0.118 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000173 | 480.630 | 2.395 | n/a | 0.000 | 0.000 | 0.474 | 477.640 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.061 | 2.395 | 0.005 | 0.061 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 308.590 | n/a | n/a | n/a | 2.694 | n/a | 0.000 | 0.000 | 0.600 | 305.766 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.072 | 2.694 | 0.012 | 0.072 |
| p99 | 1001.266 | n/a | n/a | n/a | 9.578 | n/a | 0.000 | 0.000 | 3.712 | 996.310 | 4.797 | n/a | 0.312 | 0.000 | n/a | n/a | 0.218 | 9.578 | 0.628 | 0.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace0000000000000187 | 1001.266 | 5.984 | n/a | 0.000 | 0.000 | 3.129 | 991.921 | 0.017 | n/a | 0.031 | 0.000 | n/a | n/a | 0.185 | 5.984 | 0.006 | 0.185 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001a3 | 999.547 | 2.694 | n/a | 0.000 | 0.000 | 0.430 | 996.310 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.068 | 2.694 | 0.003 | 0.068 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000001a2 | 998.076 | 2.472 | n/a | 0.000 | 0.000 | 0.474 | 995.033 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.061 | 2.472 | 0.002 | 0.061 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace00000000000001bf | 996.351 | 2.311 | n/a | 0.000 | 0.000 | 2.135 | 991.809 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.061 | 2.311 | 0.002 | 0.061 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000196 | 995.663 | 2.448 | n/a | 0.000 | 0.000 | 2.104 | 991.018 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.067 | 2.448 | 0.002 | 0.067 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace00000000000001c0 | 995.659 | 2.417 | n/a | 0.000 | 0.000 | 0.328 | 992.812 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.065 | 2.417 | 0.002 | 0.065 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000001d0 | 851.305 | 3.545 | n/a | 0.000 | 0.000 | 1.009 | 846.563 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.121 | 3.545 | 0.004 | 0.121 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000198 | 845.419 | 7.415 | n/a | 0.000 | 0.000 | 0.986 | 836.799 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.153 | 7.415 | 0.009 | 0.153 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001a0 | 822.844 | 2.548 | n/a | 0.000 | 0.000 | 0.542 | 819.648 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.070 | 2.548 | 0.003 | 0.070 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace000000000000019c | 740.156 | 7.028 | n/a | 0.000 | 0.000 | 0.940 | 732.081 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.072 | 7.028 | 0.009 | 0.072 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000001c1 | 722.864 | 3.143 | n/a | 0.000 | 0.000 | 0.441 | 719.149 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.093 | 3.143 | 0.004 | 0.093 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001a4 | 696.545 | 2.183 | n/a | 0.000 | 0.000 | 2.829 | 691.395 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.081 | 2.183 | 0.003 | 0.081 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000001be | 693.690 | 2.363 | n/a | 0.000 | 0.000 | 1.793 | 689.415 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.074 | 2.363 | 0.003 | 0.074 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000001ab | 672.393 | 4.986 | n/a | 0.000 | 0.000 | 0.697 | 666.613 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.065 | 4.986 | 0.007 | 0.065 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001b2 | 562.324 | 2.301 | n/a | 0.000 | 0.000 | 0.381 | 559.519 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.057 | 2.301 | 0.004 | 0.057 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000001cc | 550.016 | 2.679 | n/a | 0.000 | 0.000 | 0.383 | 546.819 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.070 | 2.679 | 0.005 | 0.070 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001b4 | 521.537 | 2.641 | n/a | 0.000 | 0.000 | 0.599 | 518.197 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.060 | 2.641 | 0.005 | 0.060 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001b3 | 512.387 | 9.578 | n/a | 0.000 | 0.000 | 1.001 | 501.643 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.111 | 9.578 | 0.019 | 0.111 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace00000000000001ca | 474.283 | 3.164 | n/a | 0.000 | 0.000 | 0.848 | 470.159 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.084 | 3.164 | 0.007 | 0.084 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000000191 | 444.800 | 1.911 | n/a | 0.000 | 0.000 | 3.712 | 438.990 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.054 | 1.911 | 0.004 | 0.054 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 305.266 | n/a | n/a | n/a | 2.618 | n/a | 0.000 | 0.000 | 0.523 | 300.824 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.074 | 2.618 | 0.009 | 0.074 |
| p99 | 1005.845 | n/a | n/a | n/a | 9.562 | n/a | 0.000 | 0.000 | 4.224 | 1001.070 | 0.385 | n/a | 0.067 | 0.000 | n/a | n/a | 1.103 | 9.562 | 0.558 | 1.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace00000000000001e5 | 1005.845 | 4.106 | n/a | 0.000 | 0.000 | 0.833 | 1000.750 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.113 | 4.106 | 0.004 | 0.113 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace000000000000020d | 1002.641 | 0.108 | n/a | 0.000 | 0.000 | 0.298 | 1001.070 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 1.103 | 0.108 | 0.000 | 1.103 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace000000000000020c | 1002.594 | 4.415 | n/a | 0.000 | 0.000 | 1.188 | 996.847 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.101 | 4.415 | 0.004 | 0.101 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000212 | 1002.499 | 0.113 | n/a | 0.000 | 0.000 | 0.398 | 1000.814 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 1.099 | 0.113 | 0.000 | 1.099 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000001f9 | 1001.369 | 2.238 | n/a | 0.000 | 0.000 | 0.305 | 998.717 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.058 | 2.238 | 0.002 | 0.058 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000214 | 988.390 | 2.455 | n/a | 0.000 | 0.000 | 0.419 | 985.402 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.078 | 2.455 | 0.002 | 0.078 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace00000000000001fa | 891.495 | 2.218 | n/a | 0.000 | 0.000 | 0.561 | 888.553 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.080 | 2.218 | 0.002 | 0.080 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000210 | 877.042 | 2.759 | n/a | 0.000 | 0.000 | 0.361 | 873.840 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.054 | 2.759 | 0.003 | 0.054 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000202 | 838.282 | 2.490 | n/a | 0.000 | 0.000 | 0.460 | 835.217 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.083 | 2.490 | 0.003 | 0.083 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace00000000000001fd | 833.325 | 4.165 | n/a | 0.000 | 0.000 | 0.949 | 828.047 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.125 | 4.165 | 0.005 | 0.125 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace00000000000001eb | 818.764 | 1.816 | n/a | 0.000 | 0.000 | 3.188 | 813.653 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.058 | 1.816 | 0.002 | 0.058 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001d8 | 816.541 | 2.888 | n/a | 0.000 | 0.000 | 2.178 | 811.365 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.074 | 2.888 | 0.004 | 0.074 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace00000000000001f2 | 742.215 | 3.013 | n/a | 0.000 | 0.000 | 0.458 | 738.643 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.068 | 3.013 | 0.004 | 0.068 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace00000000000001d5 | 618.670 | 4.018 | n/a | 0.000 | 0.000 | 0.745 | 613.757 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.124 | 4.018 | 0.006 | 0.124 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000001f4 | 611.819 | 2.079 | n/a | 0.000 | 0.000 | 1.651 | 607.953 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.075 | 2.079 | 0.003 | 0.075 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace00000000000001f0 | 610.172 | 3.290 | n/a | 0.000 | 0.000 | 0.667 | 606.092 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.072 | 3.290 | 0.005 | 0.072 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace00000000000001e4 | 571.702 | 2.241 | n/a | 0.000 | 0.000 | 0.368 | 568.975 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.071 | 2.241 | 0.004 | 0.071 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000001dd | 478.758 | 3.571 | n/a | 0.000 | 0.000 | 4.224 | 470.851 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.077 | 3.571 | 0.007 | 0.077 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace000000000000020a | 395.814 | 2.445 | n/a | 0.000 | 0.000 | 0.447 | 392.821 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 2.445 | 0.006 | 0.068 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000001e9 | 379.653 | 2.451 | n/a | 0.000 | 0.000 | 0.523 | 376.571 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 2.451 | 0.006 | 0.064 | gw-r/thread-41/journal/page | none observed |

## P3 / L1024 / internal (747 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.130 | n/a | n/a | n/a | 2.878 | n/a | 0.000 | 0.000 | 0.533 | 9.257 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.072 | 2.878 | 0.245 | 0.072 |
| p99 | 114.025 | n/a | n/a | n/a | 12.954 | n/a | 1.543 | 0.000 | 5.188 | 104.497 | 0.190 | n/a | 0.061 | 0.000 | n/a | n/a | 0.615 | 13.874 | 0.810 | 0.615 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace0000000000000220 | 966.497 | 4.324 | n/a | 0.000 | 0.000 | 0.335 | 961.702 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.106 | 4.324 | 0.004 | 0.106 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000215 | 965.527 | 3.406 | n/a | 0.000 | 0.000 | 0.577 | 961.369 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.130 | 3.406 | 0.004 | 0.130 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace0000000000000221 | 951.435 | 2.932 | n/a | 0.000 | 0.000 | 1.327 | 947.067 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.070 | 2.932 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace0000000000000218 | 811.588 | 1.993 | n/a | 0.000 | 0.000 | 0.814 | 808.654 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.063 | 1.993 | 0.002 | 0.063 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace000000000000021c | 794.787 | 2.341 | n/a | 0.000 | 0.000 | 0.553 | 791.782 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.069 | 2.341 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000219 | 197.501 | 2.362 | n/a | 0.000 | 0.000 | 0.392 | 194.638 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.076 | 2.362 | 0.012 | 0.076 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace000000000000021e | 186.213 | 3.598 | n/a | 0.000 | 0.000 | 0.818 | 181.672 | 0.017 | n/a | 0.039 | 0.000 | n/a | n/a | 0.068 | 3.598 | 0.019 | 0.068 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace00000000000004e9 | 114.025 | 7.796 | n/a | 1.200 | 0.000 | 0.362 | 104.497 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.129 | 8.996 | 0.079 | 0.129 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000002f1 | 105.409 | 6.620 | n/a | 0.000 | 0.000 | 1.047 | 97.631 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.094 | 6.620 | 0.063 | 0.094 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000756 | 91.269 | 3.840 | n/a | 0.000 | 0.000 | 1.031 | 86.305 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.071 | 3.840 | 0.042 | 0.071 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace000000000000046c | 87.809 | 9.355 | n/a | 0.000 | 0.000 | 5.762 | 72.541 | 0.002 | n/a | 0.029 | 0.000 | n/a | n/a | 0.120 | 9.355 | 0.107 | 0.120 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000791 | 87.202 | 8.756 | n/a | 0.000 | 0.000 | 0.558 | 77.516 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.330 | 8.756 | 0.100 | 0.330 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace00000000000005e8 | 86.349 | 3.464 | n/a | 0.000 | 0.000 | 0.516 | 82.251 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.066 | 3.464 | 0.040 | 0.066 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000000775 | 85.384 | 7.986 | n/a | 0.000 | 0.000 | 2.015 | 58.880 | 16.404 | n/a | 0.015 | 0.000 | n/a | n/a | 0.085 | 7.986 | 0.094 | 0.085 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace00000000000004f1 | 84.371 | 4.242 | n/a | 0.000 | 0.000 | 0.474 | 79.407 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.212 | 4.242 | 0.050 | 0.212 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace0000000000000798 | 83.793 | 3.568 | n/a | 0.000 | 0.000 | 0.329 | 79.748 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.122 | 3.568 | 0.043 | 0.122 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000631 | 80.150 | 3.098 | n/a | 0.000 | 0.000 | 0.389 | 76.548 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.071 | 3.098 | 0.039 | 0.071 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace000000000000081b | 79.797 | 6.044 | n/a | 0.000 | 0.000 | 0.648 | 72.904 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.169 | 6.044 | 0.076 | 0.169 | gw-r/thread-45/journal/page | none observed |
| ecba898fa0b88ace0000000000000664 | 74.773 | 4.372 | n/a | 0.000 | 0.000 | 0.845 | 69.265 | 0.096 | n/a | 0.034 | 0.000 | n/a | n/a | 0.160 | 4.372 | 0.058 | 0.160 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000000763 | 73.335 | 4.289 | n/a | 0.000 | 0.000 | 0.454 | 68.486 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.070 | 4.289 | 0.058 | 0.070 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / internal (2307 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.427 | n/a | n/a | n/a | 3.768 | n/a | 0.000 | 0.000 | 0.450 | 7.850 | 0.004 | n/a | 0.009 | 0.000 | n/a | n/a | 0.084 | 3.789 | 0.317 | 0.084 |
| p99 | 341.194 | n/a | n/a | n/a | 17.645 | n/a | 1.721 | 0.000 | 5.705 | 338.148 | 0.247 | n/a | 0.044 | 0.000 | n/a | n/a | 1.218 | 17.853 | 0.861 | 1.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ecba898fa0b88ace0000000000001ae2 | 1002.620 | 0.094 | n/a | 0.000 | 0.000 | 0.440 | 1000.954 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 1.077 | 0.094 | 0.000 | 1.077 | gw-r/thread-44/journal/page | none observed |
| ecba898fa0b88ace0000000000001a95 | 1002.458 | 0.255 | n/a | 0.000 | 0.000 | 0.447 | 1000.541 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.175 | 0.255 | 0.000 | 1.175 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000001a9a | 999.921 | 3.908 | n/a | 0.000 | 0.000 | 0.184 | 995.675 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.111 | 3.908 | 0.004 | 0.111 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000001add | 996.043 | 2.487 | n/a | 0.000 | 0.000 | 0.631 | 992.833 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.062 | 2.487 | 0.002 | 0.062 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000001a97 | 958.312 | 11.953 | n/a | 1.327 | 0.000 | 0.789 | 943.705 | 0.002 | n/a | 0.017 | 0.000 | n/a | n/a | 0.519 | 13.281 | 0.014 | 0.519 | gw-r/thread-63/journal/page | none observed |
| ecba898fa0b88ace0000000000001a9e | 940.305 | 2.369 | n/a | 0.000 | 0.000 | 0.452 | 937.407 | 0.002 | n/a | 0.020 | 0.000 | n/a | n/a | 0.055 | 2.369 | 0.003 | 0.055 | gw-r/thread-63/journal/page | none observed |
| ecba898fa0b88ace0000000000001ab7 | 922.749 | 2.351 | n/a | 0.000 | 0.000 | 0.356 | 919.954 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.060 | 2.351 | 0.003 | 0.060 | gw-r/thread-43/journal/page | none observed |
| ecba898fa0b88ace0000000000001aa9 | 914.355 | 2.201 | n/a | 0.000 | 0.000 | 0.523 | 911.521 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.052 | 2.201 | 0.002 | 0.052 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000001ad8 | 867.452 | 2.705 | n/a | 0.000 | 0.000 | 0.395 | 864.287 | 0.001 | n/a | 0.007 | 0.000 | n/a | n/a | 0.056 | 2.705 | 0.003 | 0.056 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000001ada | 860.143 | 1.954 | n/a | 0.000 | 0.000 | 0.352 | 857.730 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.059 | 1.954 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000001a93 | 857.906 | 2.127 | n/a | 0.000 | 0.000 | 0.309 | 855.388 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.053 | 2.127 | 0.002 | 0.053 | gw-r/thread-41/journal/page | none observed |
| ecba898fa0b88ace0000000000001abb | 694.646 | 2.365 | n/a | 0.000 | 0.000 | 0.429 | 691.738 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.053 | 2.365 | 0.003 | 0.053 | gw-r/thread-47/journal/page | none observed |
| ecba898fa0b88ace0000000000001aa0 | 679.142 | 1.605 | n/a | 0.000 | 0.000 | 0.366 | 677.083 | 0.002 | n/a | 0.015 | 0.000 | n/a | n/a | 0.071 | 1.605 | 0.002 | 0.071 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000001ad4 | 668.336 | 1.968 | n/a | 0.000 | 0.000 | 0.459 | 665.833 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.055 | 1.968 | 0.003 | 0.055 | gw-r/thread-46/journal/page | none observed |
| ecba898fa0b88ace0000000000001abc | 658.171 | 7.389 | n/a | 0.000 | 0.000 | 0.255 | 650.277 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.216 | 7.389 | 0.011 | 0.216 | gw-r/thread-63/journal/page | none observed |
| ecba898fa0b88ace0000000000001ab5 | 617.689 | 2.117 | n/a | 0.000 | 0.000 | 0.385 | 615.101 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.054 | 2.117 | 0.003 | 0.054 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000001aca | 564.282 | 2.467 | n/a | 0.000 | 0.000 | 0.302 | 561.414 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.054 | 2.467 | 0.004 | 0.054 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000001aaf | 533.934 | 2.602 | n/a | 0.000 | 0.000 | 0.391 | 530.859 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.057 | 2.602 | 0.005 | 0.057 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000001acf | 530.743 | 3.823 | n/a | 0.000 | 0.000 | 0.391 | 526.397 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.105 | 3.823 | 0.007 | 0.105 | gw-r/thread-48/journal/page | none observed |
| ecba898fa0b88ace0000000000001ad2 | 439.052 | 5.152 | n/a | 0.000 | 0.000 | 0.551 | 433.200 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.102 | 5.152 | 0.012 | 0.102 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.116 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.837 | 201.021 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 |
| p99 | 206.511 | n/a | n/a | n/a | 0.125 | n/a | 0.000 | 0.000 | 4.076 | 205.105 | 5.878 | n/a | 0.612 | 0.000 | n/a | n/a | 0.258 | 0.125 | 0.001 | 0.258 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf8720000000000000015 | 206.511 | 0.039 | n/a | 0.000 | 0.000 | 1.102 | 205.105 | 0.018 | n/a | 0.144 | 0.000 | n/a | n/a | 0.104 | 0.039 | 0.000 | 0.104 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000049 | 205.793 | 0.030 | n/a | 0.000 | 0.000 | 0.499 | 201.779 | 3.297 | n/a | 0.124 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf872000000000000001c | 205.644 | 0.041 | n/a | 0.000 | 0.000 | 4.076 | 201.198 | 0.049 | n/a | 0.192 | 0.000 | n/a | n/a | 0.087 | 0.041 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf8720000000000000007 | 205.282 | 0.042 | n/a | 0.000 | 0.000 | 1.474 | 203.462 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.176 | 0.042 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf872000000000000002b | 204.729 | 0.052 | n/a | 0.000 | 0.000 | 1.524 | 202.865 | 0.015 | n/a | 0.123 | 0.000 | n/a | n/a | 0.150 | 0.052 | 0.000 | 0.150 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000056 | 204.619 | 0.032 | n/a | 0.000 | 0.000 | 0.880 | 203.530 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf8720000000000000043 | 204.173 | 0.033 | n/a | 0.000 | 0.000 | 0.800 | 203.017 | 0.035 | n/a | 0.212 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000016 | 203.396 | 0.050 | n/a | 0.000 | 0.000 | 0.991 | 202.058 | 0.014 | n/a | 0.147 | 0.000 | n/a | n/a | 0.137 | 0.050 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000009 | 203.393 | 0.029 | n/a | 0.000 | 0.000 | 1.667 | 201.279 | 0.009 | n/a | 0.152 | 0.000 | n/a | n/a | 0.258 | 0.029 | 0.000 | 0.258 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000014 | 203.390 | 0.034 | n/a | 0.000 | 0.000 | 0.800 | 202.256 | 0.023 | n/a | 0.200 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf8720000000000000021 | 203.332 | 0.033 | n/a | 0.000 | 0.000 | 2.242 | 200.827 | 0.015 | n/a | 0.137 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000032 | 203.312 | 0.028 | n/a | 0.000 | 0.000 | 0.991 | 201.579 | 0.013 | n/a | 0.612 | 0.000 | n/a | n/a | 0.088 | 0.028 | 0.000 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000010 | 203.217 | 0.028 | n/a | 0.000 | 0.000 | 0.501 | 202.316 | 0.030 | n/a | 0.278 | 0.000 | n/a | n/a | 0.065 | 0.028 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000004a | 203.124 | 0.043 | n/a | 0.000 | 0.000 | 0.977 | 201.656 | 0.144 | n/a | 0.195 | 0.000 | n/a | n/a | 0.109 | 0.043 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf872000000000000003a | 203.027 | 0.063 | n/a | 0.000 | 0.000 | 1.546 | 201.183 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.142 | 0.063 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000000b | 202.929 | 0.044 | n/a | 0.000 | 0.000 | 0.871 | 201.662 | 0.021 | n/a | 0.239 | 0.000 | n/a | n/a | 0.093 | 0.044 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000003f | 202.884 | 0.029 | n/a | 0.000 | 0.000 | 0.975 | 201.617 | 0.027 | n/a | 0.162 | 0.000 | n/a | n/a | 0.073 | 0.029 | 0.000 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf872000000000000005b | 202.857 | 0.028 | n/a | 0.000 | 0.000 | 1.610 | 201.019 | 0.012 | n/a | 0.118 | 0.000 | n/a | n/a | 0.071 | 0.028 | 0.000 | 0.071 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000008 | 202.744 | 0.026 | n/a | 0.000 | 0.000 | 0.827 | 201.630 | 0.021 | n/a | 0.172 | 0.000 | n/a | n/a | 0.068 | 0.026 | 0.000 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf872000000000000003c | 202.638 | 0.031 | n/a | 0.000 | 0.000 | 1.357 | 201.028 | 0.017 | n/a | 0.134 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.133 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.840 | 201.024 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 |
| p99 | 207.145 | n/a | n/a | n/a | 0.104 | n/a | 0.000 | 0.000 | 3.432 | 205.092 | 7.826 | n/a | 2.645 | 0.000 | n/a | n/a | 0.242 | 0.104 | 0.001 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf8720000000000000079 | 207.145 | 0.058 | n/a | 0.000 | 0.000 | 2.660 | 204.184 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.129 | 0.058 | 0.000 | 0.129 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000091 | 205.910 | 0.029 | n/a | 0.000 | 0.000 | 0.550 | 205.092 | 0.040 | n/a | 0.124 | 0.000 | n/a | n/a | 0.075 | 0.029 | 0.000 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000069 | 205.157 | 0.049 | n/a | 0.000 | 0.000 | 1.042 | 203.831 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.126 | 0.049 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf8720000000000000063 | 204.857 | 0.041 | n/a | 0.000 | 0.000 | 0.755 | 203.899 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000083 | 204.496 | 0.027 | n/a | 0.000 | 0.000 | 3.005 | 201.243 | 0.018 | n/a | 0.146 | 0.000 | n/a | n/a | 0.056 | 0.027 | 0.000 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf872000000000000007e | 204.386 | 0.058 | n/a | 0.000 | 0.000 | 3.432 | 200.687 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.140 | 0.058 | 0.000 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000095 | 204.251 | 0.027 | n/a | 0.000 | 0.000 | 2.563 | 201.295 | 0.026 | n/a | 0.262 | 0.000 | n/a | n/a | 0.079 | 0.027 | 0.000 | 0.079 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000084 | 204.240 | 0.029 | n/a | 0.000 | 0.000 | 0.561 | 203.403 | 0.093 | n/a | 0.078 | 0.000 | n/a | n/a | 0.075 | 0.029 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf872000000000000005e | 204.164 | 0.041 | n/a | 0.000 | 0.000 | 0.526 | 203.398 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.111 | 0.041 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf87200000000000000b1 | 203.948 | 0.028 | n/a | 0.000 | 0.000 | 2.332 | 201.314 | 0.019 | n/a | 0.178 | 0.000 | n/a | n/a | 0.076 | 0.028 | 0.000 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf87200000000000000b3 | 203.916 | 0.056 | n/a | 0.000 | 0.000 | 2.811 | 200.800 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.158 | 0.056 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000008b | 203.869 | 0.035 | n/a | 0.000 | 0.000 | 0.993 | 202.649 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.081 | 0.035 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000065 | 203.595 | 0.022 | n/a | 0.000 | 0.000 | 0.757 | 202.483 | 0.018 | n/a | 0.264 | 0.000 | n/a | n/a | 0.050 | 0.022 | 0.000 | 0.050 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000080 | 203.423 | 0.051 | n/a | 0.000 | 0.000 | 0.812 | 202.259 | 0.019 | n/a | 0.149 | 0.000 | n/a | n/a | 0.134 | 0.051 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf872000000000000008e | 203.234 | 0.027 | n/a | 0.000 | 0.000 | 0.722 | 202.232 | 0.033 | n/a | 0.158 | 0.000 | n/a | n/a | 0.062 | 0.027 | 0.000 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000064 | 203.210 | 0.025 | n/a | 0.000 | 0.000 | 1.566 | 201.416 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.067 | 0.025 | 0.000 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000006f | 203.198 | 0.060 | n/a | 0.000 | 0.000 | 1.929 | 201.025 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.082 | 0.060 | 0.000 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000066 | 203.108 | 0.052 | n/a | 0.000 | 0.000 | 1.071 | 199.196 | 0.013 | n/a | 2.645 | 0.000 | n/a | n/a | 0.133 | 0.052 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf872000000000000005f | 203.062 | 0.053 | n/a | 0.000 | 0.000 | 1.022 | 201.716 | 0.011 | n/a | 0.112 | 0.000 | n/a | n/a | 0.148 | 0.053 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf87200000000000000ae | 202.868 | 0.039 | n/a | 0.000 | 0.000 | 1.492 | 201.086 | 0.017 | n/a | 0.151 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.654 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.751 | 200.736 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.074 | 0.036 | 0.000 | 0.074 |
| p99 | 212.323 | n/a | n/a | n/a | 0.089 | n/a | 0.000 | 0.000 | 4.351 | 210.131 | 13.555 | n/a | 0.102 | 0.000 | n/a | n/a | 0.205 | 0.089 | 0.001 | 0.205 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf87200000000000000db | 212.323 | 0.052 | n/a | 0.000 | 0.000 | 1.879 | 210.131 | 0.035 | n/a | 0.102 | 0.000 | n/a | n/a | 0.124 | 0.052 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf87200000000000000e9 | 206.691 | 0.044 | n/a | 0.000 | 0.000 | 3.446 | 203.050 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.097 | 0.044 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf87200000000000000e0 | 206.124 | 0.029 | n/a | 0.000 | 0.000 | 0.578 | 205.371 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf87200000000000000d0 | 205.478 | 0.023 | n/a | 0.000 | 0.000 | 4.114 | 201.172 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.063 | 0.023 | 0.000 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf872000000000000011b | 205.295 | 0.025 | n/a | 0.000 | 0.000 | 0.969 | 204.177 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.061 | 0.025 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000121 | 205.158 | 0.052 | n/a | 0.000 | 0.000 | 1.346 | 203.554 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.130 | 0.052 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf87200000000000000fd | 205.114 | 0.027 | n/a | 0.000 | 0.000 | 0.516 | 204.417 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.065 | 0.027 | 0.000 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf87200000000000000e2 | 204.595 | 0.027 | n/a | 0.000 | 0.000 | 3.759 | 200.669 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf87200000000000000fc | 204.433 | 0.059 | n/a | 0.000 | 0.000 | 3.509 | 200.684 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.145 | 0.059 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000127 | 203.925 | 0.037 | n/a | 0.000 | 0.000 | 0.711 | 202.981 | 0.024 | n/a | 0.086 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf87200000000000000d7 | 203.901 | 0.025 | n/a | 0.000 | 0.000 | 3.084 | 200.672 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.069 | 0.025 | 0.000 | 0.069 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf87200000000000000e8 | 203.308 | 0.036 | n/a | 0.000 | 0.000 | 2.162 | 200.912 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.111 | 0.036 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf87200000000000000cc | 203.225 | 0.026 | n/a | 0.000 | 0.000 | 0.433 | 202.666 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 0.026 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000126 | 203.063 | 0.086 | n/a | 0.000 | 0.000 | 1.409 | 201.220 | 0.051 | n/a | 0.091 | 0.000 | n/a | n/a | 0.205 | 0.086 | 0.000 | 0.205 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000104 | 203.027 | 0.048 | n/a | 0.000 | 0.000 | 1.440 | 201.341 | 0.005 | n/a | 0.082 | 0.000 | n/a | n/a | 0.110 | 0.048 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf872000000000000010c | 202.858 | 0.029 | n/a | 0.000 | 0.000 | 1.941 | 200.752 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf87200000000000000f5 | 202.830 | 0.041 | n/a | 0.000 | 0.000 | 0.763 | 201.822 | 0.013 | n/a | 0.075 | 0.000 | n/a | n/a | 0.116 | 0.041 | 0.000 | 0.116 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000119 | 202.585 | 0.043 | n/a | 0.000 | 0.000 | 0.588 | 201.747 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.150 | 0.043 | 0.000 | 0.150 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf87200000000000000e3 | 202.559 | 0.027 | n/a | 0.000 | 0.000 | 1.367 | 201.000 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.075 | 0.027 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000012d | 202.457 | 0.031 | n/a | 0.000 | 0.000 | 1.536 | 200.736 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.631 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.664 | 200.769 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.073 | 0.037 | 0.000 | 0.073 |
| p99 | 209.059 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 5.585 | 208.302 | 16.952 | n/a | 0.190 | 0.000 | n/a | n/a | 0.245 | 0.090 | 0.001 | 0.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf8720000000000000161 | 209.059 | 0.030 | n/a | 0.000 | 0.000 | 0.578 | 208.302 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000142 | 207.783 | 0.032 | n/a | 0.000 | 0.000 | 4.936 | 202.669 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.064 | 0.032 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000133 | 205.255 | 0.034 | n/a | 0.000 | 0.000 | 4.326 | 200.758 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf872000000000000017a | 205.196 | 0.030 | n/a | 0.000 | 0.000 | 3.543 | 201.374 | 0.010 | n/a | 0.158 | 0.000 | n/a | n/a | 0.080 | 0.030 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf872000000000000017c | 205.115 | 0.030 | n/a | 0.000 | 0.000 | 3.345 | 201.610 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf872000000000000013b | 204.871 | 0.039 | n/a | 0.000 | 0.000 | 3.836 | 200.859 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000156 | 204.537 | 0.031 | n/a | 0.000 | 0.000 | 3.501 | 200.872 | 0.014 | n/a | 0.050 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf872000000000000016a | 204.177 | 0.090 | n/a | 0.000 | 0.000 | 1.711 | 202.085 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.206 | 0.090 | 0.000 | 0.206 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000138 | 203.999 | 0.083 | n/a | 0.000 | 0.000 | 1.639 | 201.859 | 0.028 | n/a | 0.190 | 0.000 | n/a | n/a | 0.199 | 0.083 | 0.000 | 0.199 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf872000000000000014b | 203.358 | 0.060 | n/a | 0.000 | 0.000 | 2.467 | 200.633 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.139 | 0.060 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000166 | 202.727 | 0.060 | n/a | 0.000 | 0.000 | 1.242 | 201.184 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.154 | 0.060 | 0.000 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000130 | 202.459 | 0.048 | n/a | 0.000 | 0.000 | 1.261 | 200.927 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.124 | 0.048 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000169 | 202.443 | 0.031 | n/a | 0.000 | 0.000 | 0.407 | 201.813 | 0.038 | n/a | 0.089 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000140 | 202.400 | 0.029 | n/a | 0.000 | 0.000 | 0.953 | 201.247 | 0.006 | n/a | 0.094 | 0.000 | n/a | n/a | 0.072 | 0.029 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf872000000000000018c | 202.369 | 0.034 | n/a | 0.000 | 0.000 | 0.834 | 201.324 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.082 | 0.034 | 0.000 | 0.082 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf872000000000000013e | 202.353 | 0.061 | n/a | 0.000 | 0.000 | 0.958 | 201.161 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.082 | 0.061 | 0.000 | 0.082 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000131 | 202.298 | 0.064 | n/a | 0.000 | 0.000 | 0.999 | 200.971 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.187 | 0.064 | 0.000 | 0.187 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf8720000000000000171 | 202.274 | 0.050 | n/a | 0.000 | 0.000 | 0.889 | 201.149 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.110 | 0.050 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000164 | 202.264 | 0.037 | n/a | 0.000 | 0.000 | 0.943 | 201.110 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.080 | 0.037 | 0.000 | 0.080 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000183 | 202.262 | 0.066 | n/a | 0.000 | 0.000 | 0.660 | 201.255 | 0.016 | n/a | 0.121 | 0.000 | n/a | n/a | 0.145 | 0.066 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / read (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.315 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.633 | 200.636 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 |
| p99 | 203.568 | n/a | n/a | n/a | 0.102 | n/a | 0.000 | 0.000 | 3.748 | 202.118 | 2.196 | n/a | 0.118 | 0.000 | n/a | n/a | 0.226 | 0.102 | 0.001 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf8720000000000000209 | 204.970 | 0.045 | n/a | 0.000 | 0.000 | 0.903 | 203.837 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.118 | 0.045 | 0.000 | 0.118 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf87200000000000001a9 | 203.568 | 0.030 | n/a | 0.000 | 0.000 | 2.701 | 200.723 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf87200000000000001cd | 203.076 | 0.111 | n/a | 0.000 | 0.000 | 1.194 | 201.414 | 0.014 | n/a | 0.118 | 0.000 | n/a | n/a | 0.226 | 0.111 | 0.001 | 0.226 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf87200000000000001e1 | 203.068 | 0.026 | n/a | 0.000 | 0.000 | 0.841 | 202.118 | 0.006 | n/a | 0.020 | 0.000 | n/a | n/a | 0.057 | 0.026 | 0.000 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001c9 | 202.934 | 0.024 | n/a | 0.000 | 0.000 | 0.926 | 201.725 | 0.012 | n/a | 0.191 | 0.000 | n/a | n/a | 0.056 | 0.024 | 0.000 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf87200000000000001b8 | 202.843 | 0.087 | n/a | 0.000 | 0.000 | 0.739 | 201.889 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.104 | 0.087 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001ee | 202.651 | 0.042 | n/a | 0.000 | 0.000 | 1.209 | 201.243 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000199 | 202.623 | 0.046 | n/a | 0.000 | 0.000 | 1.574 | 200.709 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.265 | 0.046 | 0.000 | 0.265 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf87200000000000001c7 | 202.590 | 0.046 | n/a | 0.000 | 0.000 | 0.873 | 201.494 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.104 | 0.046 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001c2 | 202.529 | 0.052 | n/a | 0.000 | 0.000 | 0.946 | 201.242 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.158 | 0.052 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001ed | 202.407 | 0.064 | n/a | 0.000 | 0.000 | 1.119 | 200.953 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.193 | 0.064 | 0.000 | 0.193 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf87200000000000001de | 202.385 | 0.041 | n/a | 0.000 | 0.000 | 0.867 | 201.291 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001d3 | 202.261 | 0.021 | n/a | 0.000 | 0.000 | 0.793 | 201.295 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.054 | 0.021 | 0.000 | 0.054 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf87200000000000001cc | 202.230 | 0.044 | n/a | 0.000 | 0.000 | 0.903 | 201.108 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001f4 | 202.213 | 0.053 | n/a | 0.000 | 0.000 | 1.098 | 200.869 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.141 | 0.053 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf87200000000000001fd | 202.183 | 0.027 | n/a | 0.000 | 0.000 | 0.995 | 201.016 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.065 | 0.027 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf87200000000000001dc | 202.181 | 0.037 | n/a | 0.000 | 0.000 | 0.963 | 201.031 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.082 | 0.037 | 0.000 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf872000000000000020a | 202.116 | 0.029 | n/a | 0.000 | 0.000 | 0.486 | 201.419 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.076 | 0.029 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf87200000000000001ac | 202.101 | 0.047 | n/a | 0.000 | 0.000 | 0.623 | 201.185 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.132 | 0.047 | 0.000 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf87200000000000001c3 | 202.086 | 0.039 | n/a | 0.000 | 0.000 | 0.608 | 201.304 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 0.039 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.370 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.576 | 200.668 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.071 | 0.036 | 0.000 | 0.071 |
| p99 | 204.850 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 4.374 | 202.093 | 1.893 | n/a | 0.148 | 0.000 | n/a | n/a | 0.202 | 0.085 | 0.002 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf872000000000000027a | 209.653 | 0.029 | n/a | 0.000 | 0.000 | 6.010 | 203.513 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf872000000000000025d | 204.850 | 0.029 | n/a | 0.000 | 0.000 | 3.197 | 201.425 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf872000000000000025b | 203.716 | 0.029 | n/a | 0.000 | 0.000 | 2.718 | 200.850 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.071 | 0.029 | 0.000 | 0.071 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf872000000000000023e | 203.714 | 0.030 | n/a | 0.000 | 0.000 | 2.599 | 200.943 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.074 | 0.030 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf872000000000000021b | 202.761 | 0.031 | n/a | 0.000 | 0.000 | 0.491 | 202.093 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.080 | 0.031 | 0.000 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf872000000000000020f | 202.673 | 0.027 | n/a | 0.000 | 0.000 | 0.872 | 200.789 | 0.009 | n/a | 0.926 | 0.000 | n/a | n/a | 0.051 | 0.027 | 0.000 | 0.051 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000227 | 202.624 | 0.032 | n/a | 0.000 | 0.000 | 0.847 | 201.502 | 0.022 | n/a | 0.148 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000215 | 202.348 | 0.075 | n/a | 0.000 | 0.000 | 1.185 | 200.835 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.198 | 0.075 | 0.000 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000220 | 202.322 | 0.030 | n/a | 0.000 | 0.000 | 0.467 | 201.646 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000278 | 202.303 | 0.054 | n/a | 0.000 | 0.000 | 0.718 | 201.265 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.145 | 0.054 | 0.000 | 0.145 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000243 | 202.277 | 0.058 | n/a | 0.000 | 0.000 | 1.049 | 200.914 | 0.018 | n/a | 0.070 | 0.000 | n/a | n/a | 0.168 | 0.058 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000271 | 202.231 | 0.041 | n/a | 0.000 | 0.000 | 0.642 | 201.365 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.088 | 0.041 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf872000000000000025a | 202.209 | 0.041 | n/a | 0.000 | 0.000 | 0.416 | 201.525 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.091 | 0.041 | 0.000 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000021e | 202.168 | 0.042 | n/a | 0.000 | 0.000 | 1.132 | 200.830 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.107 | 0.042 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000277 | 202.166 | 0.047 | n/a | 0.000 | 0.000 | 0.930 | 201.004 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.115 | 0.047 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000226 | 202.143 | 0.033 | n/a | 0.000 | 0.000 | 0.639 | 201.323 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf872000000000000024a | 202.139 | 0.080 | n/a | 0.000 | 0.000 | 1.123 | 200.695 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.202 | 0.080 | 0.000 | 0.202 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000267 | 202.063 | 0.038 | n/a | 0.000 | 0.000 | 0.593 | 201.280 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf872000000000000027d | 202.053 | 0.110 | n/a | 0.000 | 0.000 | 1.150 | 200.563 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 0.208 | 0.110 | 0.001 | 0.208 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000223 | 202.036 | 0.027 | n/a | 0.000 | 0.000 | 0.664 | 201.211 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.057 | 0.027 | 0.000 | 0.057 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.926 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.512 | 70.443 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.057 | 0.044 | 0.001 | 0.057 |
| p99 | 202.742 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 3.809 | 201.595 | 6.773 | n/a | 0.133 | 0.000 | n/a | n/a | 0.161 | 0.096 | 0.015 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf8720000000000000285 | 202.742 | 0.072 | n/a | 0.000 | 0.000 | 1.753 | 200.689 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.161 | 0.072 | 0.000 | 0.161 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf872000000000000028c | 202.563 | 0.032 | n/a | 0.000 | 0.000 | 0.709 | 201.595 | 0.017 | n/a | 0.133 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000293 | 202.357 | 0.031 | n/a | 0.000 | 0.000 | 0.917 | 201.248 | 0.006 | n/a | 0.087 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf8720000000000000292 | 202.173 | 0.059 | n/a | 0.000 | 0.000 | 1.089 | 200.820 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.153 | 0.059 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000028d | 202.022 | 0.044 | n/a | 0.000 | 0.000 | 1.020 | 200.832 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.081 | 0.044 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000296 | 201.806 | 0.038 | n/a | 0.000 | 0.000 | 0.793 | 200.809 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.108 | 0.038 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000281 | 201.644 | 0.027 | n/a | 0.000 | 0.000 | 0.468 | 200.988 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000298 | 201.639 | 0.054 | n/a | 0.000 | 0.000 | 0.809 | 200.607 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.130 | 0.054 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 0c355bf3247cf8720000000000000297 | 201.622 | 0.047 | n/a | 0.000 | 0.000 | 0.747 | 200.682 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.094 | 0.047 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf872000000000000028b | 201.607 | 0.041 | n/a | 0.000 | 0.000 | 0.681 | 200.736 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000282 | 201.434 | 0.026 | n/a | 0.000 | 0.000 | 0.510 | 200.792 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.058 | 0.026 | 0.000 | 0.058 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000291 | 201.401 | 0.045 | n/a | 0.000 | 0.000 | 0.602 | 200.586 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.127 | 0.045 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000286 | 201.396 | 0.034 | n/a | 0.000 | 0.000 | 0.705 | 200.544 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf872000000000000027f | 201.230 | 0.025 | n/a | 0.000 | 0.000 | 0.453 | 200.667 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.055 | 0.025 | 0.000 | 0.055 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000280 | 201.111 | 0.027 | n/a | 0.000 | 0.000 | 0.363 | 200.602 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.070 | 0.027 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 0c355bf3247cf8720000000000000295 | 201.075 | 0.026 | n/a | 0.000 | 0.000 | 0.448 | 200.515 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.054 | 0.026 | 0.000 | 0.054 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000290 | 201.013 | 0.026 | n/a | 0.000 | 0.000 | 0.408 | 200.500 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.053 | 0.026 | 0.000 | 0.053 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000287 | 200.882 | 0.021 | n/a | 0.000 | 0.000 | 0.353 | 200.437 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.046 | 0.021 | 0.000 | 0.046 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf8720000000000000289 | 193.354 | 0.043 | n/a | 0.000 | 0.000 | 0.340 | 192.865 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.094 | 0.043 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf872000000000000028f | 179.770 | 0.049 | n/a | 0.000 | 0.000 | 0.585 | 172.282 | 6.773 | n/a | 0.015 | 0.000 | n/a | n/a | 0.065 | 0.049 | 0.000 | 0.065 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.393 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.449 | 82.717 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.060 | 0.037 | 0.000 | 0.060 |
| p99 | 203.482 | n/a | n/a | n/a | 0.092 | n/a | 0.000 | 0.000 | 4.113 | 201.846 | 0.723 | n/a | 0.077 | 0.000 | n/a | n/a | 0.154 | 0.092 | 0.001 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0c355bf3247cf8720000000000000eee | 204.655 | 0.032 | n/a | 0.000 | 0.000 | 3.660 | 200.830 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 0c355bf3247cf8720000000000000ef6 | 203.590 | 0.046 | n/a | 0.000 | 0.000 | 0.905 | 202.492 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.099 | 0.046 | 0.000 | 0.099 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000eb5 | 203.482 | 0.024 | n/a | 0.000 | 0.000 | 0.264 | 203.101 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 0.024 | 0.000 | 0.064 | gw-r/thread-63/journal/page | none observed |
| 0c355bf3247cf8720000000000000ec3 | 203.473 | 0.025 | n/a | 0.000 | 0.000 | 2.579 | 200.759 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.063 | 0.025 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000ec1 | 203.342 | 0.025 | n/a | 0.000 | 0.000 | 2.131 | 201.053 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.062 | 0.025 | 0.000 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000f0a | 202.646 | 0.039 | n/a | 0.000 | 0.000 | 1.686 | 200.744 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.112 | 0.039 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000ec9 | 202.504 | 0.031 | n/a | 0.000 | 0.000 | 0.520 | 201.846 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-63/journal/page | none observed |
| 0c355bf3247cf8720000000000000ed8 | 202.067 | 0.024 | n/a | 0.000 | 0.000 | 1.316 | 200.616 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.060 | 0.024 | 0.000 | 0.060 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000ed2 | 201.964 | 0.041 | n/a | 0.000 | 0.000 | 1.186 | 200.548 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.135 | 0.041 | 0.000 | 0.135 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000e9d | 201.896 | 0.057 | n/a | 0.000 | 0.000 | 0.905 | 200.719 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.176 | 0.057 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000e9f | 201.856 | 0.040 | n/a | 0.000 | 0.000 | 1.108 | 200.588 | 0.012 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 0.040 | 0.000 | 0.074 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000ea8 | 201.808 | 0.056 | n/a | 0.000 | 0.000 | 0.849 | 200.691 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.155 | 0.056 | 0.000 | 0.155 | gw-r/thread-63/journal/page | none observed |
| 0c355bf3247cf8720000000000000f00 | 201.753 | 0.042 | n/a | 0.000 | 0.000 | 0.679 | 200.823 | 0.004 | n/a | 0.073 | 0.000 | n/a | n/a | 0.132 | 0.042 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000f0e | 201.727 | 0.034 | n/a | 0.000 | 0.000 | 0.484 | 201.056 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000efe | 201.698 | 0.026 | n/a | 0.000 | 0.000 | 1.126 | 200.452 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.062 | 0.026 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 0c355bf3247cf8720000000000000eb1 | 201.672 | 0.024 | n/a | 0.000 | 0.000 | 1.187 | 200.375 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.057 | 0.024 | 0.000 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000ebc | 201.662 | 0.022 | n/a | 0.000 | 0.000 | 0.523 | 201.003 | 0.003 | n/a | 0.053 | 0.000 | n/a | n/a | 0.057 | 0.022 | 0.000 | 0.057 | gw-r/thread-44/journal/page | none observed |
| 0c355bf3247cf8720000000000000f05 | 201.662 | 0.061 | n/a | 0.000 | 0.000 | 0.571 | 200.858 | 0.003 | n/a | 0.050 | 0.000 | n/a | n/a | 0.119 | 0.061 | 0.000 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 0c355bf3247cf8720000000000000ed0 | 201.627 | 0.036 | n/a | 0.000 | 0.000 | 0.618 | 200.795 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.125 | 0.036 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 0c355bf3247cf8720000000000000eba | 201.621 | 0.040 | n/a | 0.000 | 0.000 | 0.695 | 200.736 | 0.003 | n/a | 0.042 | 0.000 | n/a | n/a | 0.104 | 0.040 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
