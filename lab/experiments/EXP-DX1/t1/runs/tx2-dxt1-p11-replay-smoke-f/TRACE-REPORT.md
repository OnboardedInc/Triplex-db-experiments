# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (146.497 ms, trace `0eb430293e9d132d0000000000000659`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (96.618 ms, trace `0eb430293e9d132d000000000000006d`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (96.298 ms, trace `0eb430293e9d132d0000000000000134`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (132.870 ms, trace `0eb430293e9d132d000000000000065b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (87.677 ms, trace `0eb430293e9d132d00000000000000b2`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-replay-smoke-f`; source `d62b4e952e5d2b0c5570225ff6e612eabee2f38b`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3511/3512 (99.972%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3512/3512. Raw trace bytes: 20808227.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 236 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13377.127 | 312.253 | 6.753 | 280 |
| L1 | 0 | 16435.010 | 321.947 | 9.491 | 422 |
| L4 | 0 | 18601.567 | 330.264 | 11.277 | 382 |
| L16 | 0 | 19060.109 | 341.396 | 9.528 | 442 |
| L64 | 0 | 18837.837 | 382.713 | 9.976 | 604 |
| L256 | 0 | 17030.414 | 293.405 | 13.134 | 462 |
| L1024 | 0 | 18988.979 | 3924.730 | 39.413 | 16528 |
| tail | 0 | 64683.694 | 11798.195 | 106.944 | 52110 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 0eb430293e9d132d0000000000000659 | driver.queue.subject | 5.573 | 0eb430293e9d132d0000000000000658 | 1 / 32 |
| 0eb430293e9d132d0000000000000659 | driver.queue.scheduler-dispatch | 0.070 | none | 0 / 32 |
| 0eb430293e9d132d0000000000000659 | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace 0eb430293e9d132d0000000000000659 waited: []

| 0eb430293e9d132d000000000000006d | driver.queue.scheduler-dispatch | 0.054 | none | 0 / 32 |
| 0eb430293e9d132d000000000000006d | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 0eb430293e9d132d000000000000006d waited: []

| 0eb430293e9d132d0000000000000134 | driver.queue.scheduler-dispatch | 0.059 | none | 0 / 32 |
| 0eb430293e9d132d0000000000000134 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 0eb430293e9d132d0000000000000134 waited: []

| 0eb430293e9d132d000000000000065b | driver.queue.scheduler-dispatch | 0.048 | none | 1 / 32 |
| 0eb430293e9d132d000000000000065b | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace 0eb430293e9d132d000000000000065b waited: []

| 0eb430293e9d132d00000000000000b2 | driver.queue.scheduler-dispatch | 0.091 | none | 0 / 32 |
| 0eb430293e9d132d00000000000000b2 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 0eb430293e9d132d00000000000000b2 waited: []

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.462 | 0.987 | 0.000 | 1.000 | 2.830 | n/a | 0.000 | 0.087 | 1.262 | 2.706 | 0.027 | 0.000 | 0.589 | 10.622 | 0.912 | n/a | 0.034 | 3.287 | 0.171 | 0.034 |
| p99 | 70.520 | 3.959 | 0.000 | 3.344 | 13.467 | n/a | 1.263 | 1.394 | 2.664 | 12.188 | 0.073 | 0.000 | 4.502 | 27.842 | 14.495 | n/a | 0.276 | 13.991 | 0.252 | 0.276 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d0000000000000036 | 70.520 | 13.467 | n/a | 0.000 | 0.525 | 1.462 | 12.188 | 0.063 | 0.000 | 0.203 | 27.842 | 14.495 | n/a | 0.276 | 13.991 | 0.198 | 0.276 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 0eb430293e9d132d0000000000000053 | 30.560 | 6.510 | n/a | 0.000 | 0.240 | 1.845 | 5.860 | 0.038 | 0.000 | 0.198 | 13.516 | 2.292 | n/a | 0.062 | 6.749 | 0.221 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000043 | 30.127 | 4.122 | n/a | 0.000 | 0.143 | 1.333 | 6.016 | 0.027 | 0.000 | 0.558 | 17.011 | 0.864 | n/a | 0.053 | 4.265 | 0.142 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 0eb430293e9d132d000000000000003d | 29.380 | 2.830 | n/a | 0.000 | 0.060 | 2.664 | 4.375 | 0.062 | 0.000 | 1.956 | 12.587 | 4.816 | n/a | 0.030 | 2.890 | 0.098 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000047 | 25.616 | 4.437 | n/a | 0.000 | 1.394 | 1.174 | 5.316 | 0.027 | 0.000 | 0.141 | 10.979 | 2.123 | n/a | 0.024 | 5.831 | 0.228 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000005e | 25.442 | 2.699 | n/a | 0.249 | 0.047 | 1.073 | 5.548 | 0.073 | 0.000 | 0.948 | 10.622 | 4.164 | n/a | 0.020 | 2.995 | 0.118 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 0eb430293e9d132d0000000000000056 | 23.865 | 3.569 | n/a | 1.263 | 0.098 | 1.382 | 1.735 | 0.025 | 0.000 | 4.502 | 10.766 | 0.488 | n/a | 0.035 | 4.930 | 0.207 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0eb430293e9d132d0000000000000049 | 21.462 | 2.664 | n/a | 0.000 | 0.095 | 1.290 | 6.552 | 0.030 | 0.000 | 0.971 | 8.991 | 0.690 | n/a | 0.177 | 2.759 | 0.129 | 0.177 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000003a | 20.011 | 2.586 | n/a | 0.000 | 0.087 | 0.976 | 2.706 | 0.023 | 0.000 | 0.503 | 11.594 | 1.510 | n/a | 0.026 | 2.673 | 0.134 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 0eb430293e9d132d0000000000000050 | 18.768 | 4.174 | n/a | 0.000 | 0.254 | 0.989 | 1.404 | 0.022 | 0.000 | 1.297 | 9.675 | 0.912 | n/a | 0.042 | 4.428 | 0.236 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000005c | 16.284 | 3.435 | n/a | 0.605 | 0.058 | 1.262 | 1.837 | 0.025 | 0.000 | 0.191 | 8.296 | 0.553 | n/a | 0.022 | 4.098 | 0.252 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000059 | 15.917 | 2.734 | n/a | 0.474 | 0.080 | 0.846 | 2.001 | 0.053 | 0.000 | 0.759 | 7.945 | 1.006 | n/a | 0.019 | 3.287 | 0.207 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000004e | 14.223 | 2.363 | n/a | 0.000 | 0.074 | 0.916 | 1.604 | 0.024 | 0.000 | 0.589 | 8.061 | 0.555 | n/a | 0.036 | 2.437 | 0.171 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000041 | 11.610 | 1.755 | n/a | 0.000 | 0.074 | 1.591 | 1.359 | 0.022 | 0.000 | 1.022 | 5.239 | 0.515 | n/a | 0.034 | 1.828 | 0.157 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (130 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.977 | n/a | n/a | n/a | 43.697 | 8.607 | 3.116 | 0.000 | 15.484 | 4.198 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.006 | 59.236 | 0.769 | 0.006 |
| p99 | 436.685 | n/a | n/a | n/a | 153.241 | 278.425 | 15.461 | 0.000 | 155.762 | 30.794 | 28.268 | 25.347 | 0.050 | 0.000 | n/a | n/a | 0.022 | 336.160 | 1.000 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d0000000000001af3 | 456.499 | 40.054 | 278.425 | 2.999 | 0.000 | 132.690 | 2.316 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.005 | 321.478 | 0.704 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.586ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.255ms |
| 0eb430293e9d132d0000000000001b02 | 436.685 | 48.691 | 287.951 | 5.661 | 0.000 | 90.027 | 4.341 | 0.002 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.006 | 342.303 | 0.784 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.586ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.255ms |
| 0eb430293e9d132d0000000000001c3e | 387.241 | 75.008 | 139.428 | 3.737 | 0.000 | 160.543 | 8.505 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.005 | 218.173 | 0.563 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.245ms; driver.reader-basis.broadcast 0.228ms; driver.reader-basis.broadcast 0.220ms; driver.reader-basis.broadcast 0.202ms; driver.publication.readback 0.116ms |
| 0eb430293e9d132d0000000000001af1 | 381.317 | 67.615 | 254.310 | 8.196 | 0.000 | 40.583 | 6.151 | 4.445 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.011 | 330.121 | 0.866 | 0.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.255ms; driver.reader-basis.broadcast 0.241ms |
| 0eb430293e9d132d0000000000001b23 | 340.877 | 54.627 | 278.243 | 3.289 | 0.000 | 0.511 | 4.182 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.010 | 336.160 | 0.986 | 0.010 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.044ms; driver.reader-basis.broadcast 0.586ms; driver.reader-basis.broadcast 0.255ms; driver.reader-basis.broadcast 0.230ms; driver.reader-basis.broadcast 0.229ms |
| 0eb430293e9d132d0000000000001ae8 | 339.129 | 53.473 | 221.289 | 1.462 | 0.000 | 60.010 | 2.878 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.006 | 276.223 | 0.815 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.255ms; driver.reader-basis.broadcast 0.241ms |
| 0eb430293e9d132d0000000000001ae5 | 328.609 | 60.374 | 152.344 | 6.953 | 0.000 | 105.427 | 3.489 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.008 | 219.671 | 0.668 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.165ms |
| 0eb430293e9d132d0000000000001b1f | 310.502 | 51.417 | 194.188 | 4.381 | 0.000 | 50.841 | 9.645 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.006 | 249.986 | 0.805 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.044ms; driver.reader-basis.broadcast 0.586ms; driver.reader-basis.broadcast 0.255ms; driver.reader-basis.broadcast 0.230ms; driver.publication.readback 0.107ms |
| 0eb430293e9d132d0000000000001c3a | 305.835 | 64.770 | 69.518 | 7.961 | 0.000 | 155.087 | 8.478 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.006 | 142.249 | 0.465 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.245ms; driver.reader-basis.broadcast 0.220ms; driver.reader-basis.broadcast 0.202ms; driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.093ms |
| 0eb430293e9d132d0000000000001b21 | 304.400 | 12.525 | 245.189 | 0.000 | 0.000 | 46.145 | 0.524 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.005 | 257.714 | 0.847 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.044ms; driver.reader-basis.broadcast 0.586ms; driver.reader-basis.broadcast 0.255ms; driver.reader-basis.broadcast 0.230ms; driver.publication.readback 0.104ms |
| 0eb430293e9d132d0000000000001c42 | 303.777 | 146.031 | 84.736 | 13.749 | 0.000 | 47.764 | 11.477 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.006 | 244.516 | 0.805 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.245ms; driver.reader-basis.broadcast 0.220ms; driver.reader-basis.broadcast 0.202ms; driver.publication.readback 0.112ms; driver.publication.persist-deferred 0.093ms |
| 0eb430293e9d132d0000000000001c41 | 302.434 | 153.241 | 60.929 | 15.461 | 0.000 | 67.209 | 4.676 | 0.904 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.005 | 229.632 | 0.759 | 0.005 | node-14/thread-3/client.reach | driver.reader-basis.broadcast 0.245ms; driver.reader-basis.broadcast 0.220ms; driver.reader-basis.broadcast 0.202ms; driver.publication.readback 0.116ms; driver.publication.readback 0.112ms |
| 0eb430293e9d132d0000000000001adf | 302.061 | 18.582 | 152.256 | 0.000 | 0.000 | 129.885 | 1.314 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.013 | 170.838 | 0.566 | 0.013 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.139ms |
| 0eb430293e9d132d0000000000001af2 | 292.471 | 34.914 | 213.934 | 3.574 | 0.000 | 38.376 | 1.657 | 0.003 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.005 | 252.422 | 0.863 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.165ms |
| 0eb430293e9d132d0000000000001adb | 288.945 | 58.010 | 171.040 | 7.794 | 0.000 | 40.936 | 11.154 | 0.001 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.007 | 236.845 | 0.820 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.139ms; driver.publication.readback 0.130ms |
| 0eb430293e9d132d0000000000001ae6 | 286.763 | 47.171 | 203.767 | 3.429 | 0.000 | 31.093 | 1.287 | 0.002 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.007 | 254.367 | 0.887 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.139ms |
| 0eb430293e9d132d0000000000001af0 | 283.340 | 57.101 | 200.894 | 7.125 | 0.000 | 16.309 | 1.898 | 0.002 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.006 | 265.120 | 0.936 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.165ms |
| 0eb430293e9d132d0000000000001ae4 | 281.809 | 54.065 | 63.486 | 6.173 | 0.000 | 155.762 | 2.300 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.006 | 123.724 | 0.439 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.139ms |
| 0eb430293e9d132d0000000000001b01 | 251.658 | 24.636 | 191.031 | 0.000 | 0.000 | 29.759 | 6.217 | 0.003 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.007 | 215.668 | 0.857 | 0.007 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.444ms; driver.reader-basis.broadcast 0.540ms; driver.reader-basis.broadcast 0.276ms; driver.reader-basis.broadcast 0.255ms; driver.publication.readback 0.165ms |
| 0eb430293e9d132d00000000000016a9 | 242.692 | 64.365 | 100.270 | 4.568 | 0.000 | 57.802 | 15.669 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.006 | 169.203 | 0.697 | 0.006 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.457ms; driver.reader-basis.broadcast 0.217ms; driver.publication.readback 0.123ms; driver.publication.readback 0.118ms; driver.publication.readback 0.113ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.768 | 0.993 | 0.000 | 1.118 | 2.734 | n/a | 0.000 | 0.074 | 1.073 | 1.837 | 0.025 | 0.000 | 0.948 | 9.675 | 0.912 | n/a | 0.030 | 2.995 | 0.171 | 0.030 |
| p99 | 29.380 | 1.945 | 0.000 | 1.915 | 4.174 | n/a | 1.263 | 0.254 | 2.664 | 5.548 | 0.073 | 0.000 | 4.502 | 12.587 | 4.816 | n/a | 0.042 | 4.930 | 0.252 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d000000000000003d | 29.380 | 2.830 | n/a | 0.000 | 0.060 | 2.664 | 4.375 | 0.062 | 0.000 | 1.956 | 12.587 | 4.816 | n/a | 0.030 | 2.890 | 0.098 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000005e | 25.442 | 2.699 | n/a | 0.249 | 0.047 | 1.073 | 5.548 | 0.073 | 0.000 | 0.948 | 10.622 | 4.164 | n/a | 0.020 | 2.995 | 0.118 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 0eb430293e9d132d0000000000000056 | 23.865 | 3.569 | n/a | 1.263 | 0.098 | 1.382 | 1.735 | 0.025 | 0.000 | 4.502 | 10.766 | 0.488 | n/a | 0.035 | 4.930 | 0.207 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0eb430293e9d132d000000000000003a | 20.011 | 2.586 | n/a | 0.000 | 0.087 | 0.976 | 2.706 | 0.023 | 0.000 | 0.503 | 11.594 | 1.510 | n/a | 0.026 | 2.673 | 0.134 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| 0eb430293e9d132d0000000000000050 | 18.768 | 4.174 | n/a | 0.000 | 0.254 | 0.989 | 1.404 | 0.022 | 0.000 | 1.297 | 9.675 | 0.912 | n/a | 0.042 | 4.428 | 0.236 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000005c | 16.284 | 3.435 | n/a | 0.605 | 0.058 | 1.262 | 1.837 | 0.025 | 0.000 | 0.191 | 8.296 | 0.553 | n/a | 0.022 | 4.098 | 0.252 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000059 | 15.917 | 2.734 | n/a | 0.474 | 0.080 | 0.846 | 2.001 | 0.053 | 0.000 | 0.759 | 7.945 | 1.006 | n/a | 0.019 | 3.287 | 0.207 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000004e | 14.223 | 2.363 | n/a | 0.000 | 0.074 | 0.916 | 1.604 | 0.024 | 0.000 | 0.589 | 8.061 | 0.555 | n/a | 0.036 | 2.437 | 0.171 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000041 | 11.610 | 1.755 | n/a | 0.000 | 0.074 | 1.591 | 1.359 | 0.022 | 0.000 | 1.022 | 5.239 | 0.515 | n/a | 0.034 | 1.828 | 0.157 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.551 | 0.997 | 0.000 | 0.846 | 4.290 | n/a | 0.000 | 0.063 | 1.356 | 2.959 | 0.027 | 0.000 | 0.771 | 10.669 | 2.213 | n/a | 0.025 | 4.903 | 0.174 | 0.025 |
| p99 | 147.032 | 3.992 | 0.019 | 2.792 | 8.121 | n/a | 1.470 | 9.122 | 14.219 | 9.003 | 0.293 | 0.000 | 3.914 | 96.618 | 30.194 | n/a | 0.065 | 10.720 | 0.436 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d000000000000006d | 147.032 | 8.121 | n/a | 0.660 | 0.055 | 1.427 | 9.003 | 0.027 | 0.000 | 0.906 | 96.618 | 30.194 | n/a | 0.021 | 8.836 | 0.060 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 0eb430293e9d132d0000000000000077 | 41.979 | 2.673 | n/a | 0.449 | 0.067 | 1.210 | 3.703 | 0.061 | 0.000 | 0.632 | 26.744 | 6.411 | n/a | 0.028 | 3.190 | 0.076 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000007c | 39.582 | 6.095 | n/a | 1.382 | 0.057 | 1.025 | 2.599 | 0.026 | 0.000 | 3.914 | 16.330 | 8.122 | n/a | 0.031 | 7.534 | 0.190 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000008f | 33.472 | 6.001 | n/a | 0.000 | 0.175 | 2.030 | 2.959 | 0.029 | 0.000 | 1.074 | 16.319 | 4.820 | n/a | 0.065 | 6.176 | 0.185 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000006a | 31.596 | 6.812 | n/a | 0.000 | 0.049 | 14.219 | 6.698 | 0.139 | 0.000 | 0.510 | 2.730 | 0.417 | n/a | 0.023 | 6.861 | 0.217 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0eb430293e9d132d0000000000000067 | 31.120 | 2.586 | n/a | 0.413 | 0.056 | 1.009 | 2.596 | 0.047 | 0.000 | 3.388 | 15.886 | 5.115 | n/a | 0.023 | 3.055 | 0.098 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000007a | 29.861 | 4.436 | n/a | 0.000 | 0.467 | 1.794 | 2.239 | 0.023 | 0.000 | 0.339 | 10.819 | 9.724 | n/a | 0.021 | 4.903 | 0.164 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000092 | 29.590 | 5.806 | n/a | 0.000 | 0.132 | 5.057 | 1.846 | 0.023 | 0.000 | 0.147 | 14.284 | 2.241 | n/a | 0.053 | 5.938 | 0.201 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000086 | 29.368 | 5.162 | n/a | 0.000 | 0.148 | 1.506 | 5.343 | 0.045 | 0.000 | 2.980 | 11.957 | 2.176 | n/a | 0.052 | 5.310 | 0.181 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000084 | 28.580 | 4.290 | n/a | 0.000 | 0.062 | 0.933 | 4.337 | 0.028 | 0.000 | 0.145 | 17.866 | 0.896 | n/a | 0.024 | 4.352 | 0.152 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000073 | 28.551 | 4.457 | n/a | 0.453 | 0.048 | 2.475 | 1.817 | 0.021 | 0.000 | 0.154 | 10.574 | 8.532 | n/a | 0.020 | 4.958 | 0.174 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000007f | 28.235 | 4.326 | n/a | 1.470 | 0.103 | 1.643 | 2.154 | 0.027 | 0.000 | 0.448 | 10.669 | 7.365 | n/a | 0.032 | 5.899 | 0.209 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000009c | 28.184 | 4.925 | n/a | 0.000 | 0.057 | 4.072 | 7.177 | 0.022 | 0.000 | 0.135 | 9.557 | 2.213 | n/a | 0.026 | 4.982 | 0.177 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000065 | 25.412 | 2.447 | n/a | 0.216 | 0.049 | 0.771 | 5.370 | 0.023 | 0.000 | 0.556 | 13.829 | 2.134 | n/a | 0.018 | 2.711 | 0.107 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000009d | 24.605 | 1.598 | n/a | 0.000 | 9.122 | 1.245 | 1.866 | 0.029 | 0.000 | 0.771 | 8.785 | 1.174 | n/a | 0.016 | 10.720 | 0.436 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d000000000000008a | 20.997 | 4.009 | n/a | 0.000 | 0.093 | 1.277 | 2.731 | 0.077 | 0.000 | 1.034 | 8.285 | 3.459 | n/a | 0.033 | 4.102 | 0.195 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000096 | 19.040 | 1.999 | n/a | 0.000 | 0.068 | 1.268 | 3.117 | 0.021 | 0.000 | 3.561 | 8.351 | 0.630 | n/a | 0.024 | 2.067 | 0.109 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000081 | 17.929 | 2.829 | n/a | 0.000 | 0.081 | 0.712 | 3.684 | 0.057 | 0.000 | 1.454 | 7.733 | 1.355 | n/a | 0.025 | 2.909 | 0.162 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000088 | 14.461 | 1.977 | n/a | 0.000 | 0.060 | 1.770 | 3.629 | 0.293 | 0.000 | 1.014 | 5.025 | 0.670 | n/a | 0.025 | 2.037 | 0.141 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 0eb430293e9d132d000000000000009a | 13.505 | 2.648 | n/a | 0.000 | 0.063 | 1.356 | 1.954 | 0.020 | 0.000 | 0.577 | 5.347 | 1.514 | n/a | 0.026 | 2.711 | 0.201 | 0.026 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.605 | 0.639 | 0.000 | 0.442 | 1.999 | n/a | 0.000 | 0.060 | 1.245 | 2.596 | 0.029 | 0.000 | 0.771 | 8.351 | 0.670 | n/a | 0.023 | 3.055 | 0.141 | 0.023 |
| p99 | 41.979 | 1.697 | 0.000 | 1.179 | 6.812 | n/a | 1.470 | 9.122 | 14.219 | 6.698 | 0.293 | 0.000 | 3.561 | 26.744 | 7.365 | n/a | 0.032 | 10.720 | 0.436 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d0000000000000077 | 41.979 | 2.673 | n/a | 0.449 | 0.067 | 1.210 | 3.703 | 0.061 | 0.000 | 0.632 | 26.744 | 6.411 | n/a | 0.028 | 3.190 | 0.076 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000006a | 31.596 | 6.812 | n/a | 0.000 | 0.049 | 14.219 | 6.698 | 0.139 | 0.000 | 0.510 | 2.730 | 0.417 | n/a | 0.023 | 6.861 | 0.217 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0eb430293e9d132d0000000000000067 | 31.120 | 2.586 | n/a | 0.413 | 0.056 | 1.009 | 2.596 | 0.047 | 0.000 | 3.388 | 15.886 | 5.115 | n/a | 0.023 | 3.055 | 0.098 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000007f | 28.235 | 4.326 | n/a | 1.470 | 0.103 | 1.643 | 2.154 | 0.027 | 0.000 | 0.448 | 10.669 | 7.365 | n/a | 0.032 | 5.899 | 0.209 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000009d | 24.605 | 1.598 | n/a | 0.000 | 9.122 | 1.245 | 1.866 | 0.029 | 0.000 | 0.771 | 8.785 | 1.174 | n/a | 0.016 | 10.720 | 0.436 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d0000000000000096 | 19.040 | 1.999 | n/a | 0.000 | 0.068 | 1.268 | 3.117 | 0.021 | 0.000 | 3.561 | 8.351 | 0.630 | n/a | 0.024 | 2.067 | 0.109 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000088 | 14.461 | 1.977 | n/a | 0.000 | 0.060 | 1.770 | 3.629 | 0.293 | 0.000 | 1.014 | 5.025 | 0.670 | n/a | 0.025 | 2.037 | 0.141 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 0eb430293e9d132d000000000000008c | 11.333 | 1.601 | n/a | 0.000 | 0.034 | 0.722 | 1.369 | 0.021 | 0.000 | 0.901 | 6.125 | 0.546 | n/a | 0.014 | 1.635 | 0.144 | 0.014 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.298 | 0.600 | 0.000 | 0.596 | 2.597 | n/a | 0.000 | 0.084 | 1.189 | 2.054 | 0.027 | 0.000 | 0.220 | 12.121 | 6.803 | n/a | 0.029 | 2.762 | 0.133 | 0.029 |
| p99 | 120.972 | 1.993 | 0.000 | 1.582 | 5.941 | n/a | 0.839 | 76.162 | 4.171 | 12.585 | 0.099 | 0.000 | 3.715 | 87.677 | 16.774 | n/a | 0.057 | 77.859 | 0.883 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d00000000000000b2 | 120.972 | 2.316 | n/a | 0.000 | 0.093 | 1.321 | 12.585 | 0.034 | 0.000 | 0.136 | 87.677 | 16.774 | n/a | 0.035 | 2.410 | 0.020 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| 0eb430293e9d132d00000000000000b3 | 88.168 | 1.697 | n/a | 0.000 | 76.162 | 0.830 | 2.158 | 0.027 | 0.000 | 0.152 | 6.426 | 0.699 | n/a | 0.017 | 77.859 | 0.883 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.066ms; driver.reader-basis.broadcast 0.021ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d00000000000000aa | 50.374 | 5.941 | n/a | 0.000 | 0.064 | 1.440 | 2.571 | 0.049 | 0.000 | 3.452 | 30.022 | 6.803 | n/a | 0.031 | 6.006 | 0.119 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000ac | 36.005 | 3.220 | n/a | 0.000 | 0.105 | 0.658 | 2.244 | 0.026 | 0.000 | 0.142 | 20.074 | 9.497 | n/a | 0.040 | 3.325 | 0.092 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 0eb430293e9d132d00000000000000b9 | 33.846 | 5.926 | n/a | 0.839 | 0.071 | 1.052 | 1.959 | 0.021 | 0.000 | 3.715 | 12.121 | 8.115 | n/a | 0.026 | 6.836 | 0.202 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000c5 | 33.404 | 4.388 | n/a | 0.000 | 0.066 | 1.086 | 2.582 | 0.033 | 0.000 | 0.220 | 12.850 | 12.155 | n/a | 0.023 | 4.454 | 0.133 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000db | 33.370 | 2.194 | n/a | 0.000 | 0.109 | 1.352 | 1.712 | 0.024 | 0.000 | 0.192 | 13.480 | 14.250 | n/a | 0.057 | 2.304 | 0.069 | 0.057 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.027ms |
| 0eb430293e9d132d00000000000000bd | 33.125 | 5.581 | n/a | 0.000 | 0.104 | 2.211 | 2.054 | 0.031 | 0.000 | 0.179 | 13.755 | 9.165 | n/a | 0.046 | 5.685 | 0.172 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 0eb430293e9d132d00000000000000cf | 33.040 | 4.544 | n/a | 0.000 | 0.085 | 1.480 | 4.169 | 0.058 | 0.000 | 0.263 | 12.215 | 10.200 | n/a | 0.028 | 4.628 | 0.140 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| 0eb430293e9d132d00000000000000d4 | 27.298 | 1.972 | n/a | 0.000 | 0.083 | 4.171 | 1.967 | 0.099 | 0.000 | 0.991 | 6.814 | 11.162 | n/a | 0.038 | 2.055 | 0.075 | 0.038 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d00000000000000d2 | 25.858 | 3.963 | n/a | 0.000 | 0.156 | 0.838 | 1.564 | 0.027 | 0.000 | 0.162 | 10.468 | 8.630 | n/a | 0.051 | 4.119 | 0.159 | 0.051 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| 0eb430293e9d132d00000000000000cb | 24.604 | 2.467 | n/a | 0.000 | 0.084 | 1.189 | 1.516 | 0.024 | 0.000 | 1.376 | 13.403 | 4.510 | n/a | 0.036 | 2.551 | 0.104 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000a5 | 20.980 | 1.957 | n/a | 0.000 | 0.075 | 0.786 | 1.473 | 0.021 | 0.000 | 1.922 | 13.329 | 1.388 | n/a | 0.029 | 2.032 | 0.097 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000c8 | 19.112 | 2.698 | n/a | 0.000 | 0.063 | 2.033 | 2.643 | 0.063 | 0.000 | 0.226 | 8.833 | 2.527 | n/a | 0.024 | 2.762 | 0.145 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000de | 18.308 | 1.951 | n/a | 0.000 | 0.467 | 1.110 | 2.182 | 0.086 | 0.000 | 0.761 | 7.501 | 4.229 | n/a | 0.021 | 2.418 | 0.132 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000a2 | 17.344 | 2.094 | n/a | 0.000 | 0.069 | 0.849 | 1.968 | 0.021 | 0.000 | 0.389 | 7.691 | 4.237 | n/a | 0.027 | 2.163 | 0.125 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000d8 | 16.031 | 3.026 | n/a | 0.000 | 0.084 | 1.196 | 1.784 | 0.021 | 0.000 | 0.142 | 6.782 | 2.967 | n/a | 0.029 | 3.111 | 0.194 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000c2 | 14.805 | 2.089 | n/a | 0.000 | 0.085 | 0.895 | 1.265 | 0.028 | 0.000 | 0.158 | 7.128 | 3.130 | n/a | 0.027 | 2.174 | 0.147 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000ae | 12.652 | 2.597 | n/a | 0.000 | 0.050 | 1.215 | 2.705 | 0.019 | 0.000 | 0.122 | 5.284 | 0.636 | n/a | 0.023 | 2.647 | 0.209 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.980 | 0.000 | 0.000 | 0.449 | 2.089 | n/a | 0.000 | 0.084 | 1.110 | 1.967 | 0.024 | 0.000 | 0.192 | 7.501 | 4.229 | n/a | 0.027 | 2.304 | 0.104 | 0.027 |
| p99 | 120.972 | 0.996 | 0.000 | 0.893 | 2.597 | n/a | 0.000 | 76.162 | 4.171 | 12.585 | 0.099 | 0.000 | 1.922 | 87.677 | 16.774 | n/a | 0.057 | 77.859 | 0.883 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d00000000000000b2 | 120.972 | 2.316 | n/a | 0.000 | 0.093 | 1.321 | 12.585 | 0.034 | 0.000 | 0.136 | 87.677 | 16.774 | n/a | 0.035 | 2.410 | 0.020 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| 0eb430293e9d132d00000000000000b3 | 88.168 | 1.697 | n/a | 0.000 | 76.162 | 0.830 | 2.158 | 0.027 | 0.000 | 0.152 | 6.426 | 0.699 | n/a | 0.017 | 77.859 | 0.883 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.066ms; driver.reader-basis.broadcast 0.021ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d00000000000000db | 33.370 | 2.194 | n/a | 0.000 | 0.109 | 1.352 | 1.712 | 0.024 | 0.000 | 0.192 | 13.480 | 14.250 | n/a | 0.057 | 2.304 | 0.069 | 0.057 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.027ms |
| 0eb430293e9d132d00000000000000d4 | 27.298 | 1.972 | n/a | 0.000 | 0.083 | 4.171 | 1.967 | 0.099 | 0.000 | 0.991 | 6.814 | 11.162 | n/a | 0.038 | 2.055 | 0.075 | 0.038 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d00000000000000cb | 24.604 | 2.467 | n/a | 0.000 | 0.084 | 1.189 | 1.516 | 0.024 | 0.000 | 1.376 | 13.403 | 4.510 | n/a | 0.036 | 2.551 | 0.104 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000a5 | 20.980 | 1.957 | n/a | 0.000 | 0.075 | 0.786 | 1.473 | 0.021 | 0.000 | 1.922 | 13.329 | 1.388 | n/a | 0.029 | 2.032 | 0.097 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000de | 18.308 | 1.951 | n/a | 0.000 | 0.467 | 1.110 | 2.182 | 0.086 | 0.000 | 0.761 | 7.501 | 4.229 | n/a | 0.021 | 2.418 | 0.132 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000a2 | 17.344 | 2.094 | n/a | 0.000 | 0.069 | 0.849 | 1.968 | 0.021 | 0.000 | 0.389 | 7.691 | 4.237 | n/a | 0.027 | 2.163 | 0.125 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000c2 | 14.805 | 2.089 | n/a | 0.000 | 0.085 | 0.895 | 1.265 | 0.028 | 0.000 | 0.158 | 7.128 | 3.130 | n/a | 0.027 | 2.174 | 0.147 | 0.027 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000ae | 12.652 | 2.597 | n/a | 0.000 | 0.050 | 1.215 | 2.705 | 0.019 | 0.000 | 0.122 | 5.284 | 0.636 | n/a | 0.023 | 2.647 | 0.209 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.896 | 0.647 | 0.000 | 0.530 | 2.996 | n/a | 0.000 | 0.084 | 1.119 | 1.753 | 0.023 | 0.000 | 0.300 | 9.170 | 2.411 | n/a | 0.035 | 3.109 | 0.141 | 0.035 |
| p99 | 95.250 | 2.566 | 0.000 | 1.667 | 15.095 | n/a | 0.000 | 0.268 | 4.083 | 26.941 | 0.195 | 0.000 | 3.239 | 60.707 | 18.916 | n/a | 0.077 | 15.197 | 0.258 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d00000000000000ed | 95.250 | 2.996 | n/a | 0.000 | 0.108 | 1.149 | 8.070 | 0.023 | 0.000 | 3.239 | 60.707 | 18.916 | n/a | 0.042 | 3.104 | 0.033 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 0eb430293e9d132d00000000000000ff | 61.699 | 15.095 | n/a | 0.000 | 0.102 | 4.083 | 26.941 | 0.185 | 0.000 | 0.822 | 10.171 | 4.260 | n/a | 0.041 | 15.197 | 0.246 | 0.041 | gw-w/thread-52/gateway.admitted-work | driver.reader-basis.broadcast 0.075ms |
| 0eb430293e9d132d000000000000011a | 32.724 | 4.123 | n/a | 0.000 | 0.108 | 0.921 | 1.457 | 0.020 | 0.000 | 0.116 | 16.346 | 9.592 | n/a | 0.042 | 4.231 | 0.129 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 0eb430293e9d132d00000000000000f1 | 29.143 | 4.493 | n/a | 0.000 | 0.045 | 0.633 | 2.156 | 0.021 | 0.000 | 1.204 | 13.470 | 7.091 | n/a | 0.029 | 4.538 | 0.156 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000f3 | 26.346 | 2.693 | n/a | 0.000 | 0.051 | 3.762 | 5.477 | 0.063 | 0.000 | 1.486 | 6.074 | 6.715 | n/a | 0.025 | 2.745 | 0.104 | 0.025 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d0000000000000108 | 25.803 | 3.423 | n/a | 0.000 | 0.071 | 1.272 | 5.379 | 0.109 | 0.000 | 0.300 | 10.684 | 4.532 | n/a | 0.033 | 3.494 | 0.135 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e7 | 25.606 | 3.587 | n/a | 0.000 | 0.024 | 2.313 | 6.665 | 0.060 | 0.000 | 2.752 | 8.941 | 1.253 | n/a | 0.012 | 3.611 | 0.141 | 0.012 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d00000000000000f8 | 21.137 | 2.584 | n/a | 0.000 | 0.084 | 1.314 | 3.527 | 0.023 | 0.000 | 0.131 | 10.648 | 2.791 | n/a | 0.035 | 2.668 | 0.126 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000010e | 21.115 | 2.412 | n/a | 0.000 | 0.043 | 1.119 | 1.716 | 0.042 | 0.000 | 0.134 | 9.170 | 6.459 | n/a | 0.019 | 2.455 | 0.116 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e3 | 20.096 | 1.843 | n/a | 0.000 | 0.072 | 0.683 | 5.166 | 0.195 | 0.000 | 0.138 | 11.339 | 0.633 | n/a | 0.027 | 1.914 | 0.095 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000f6 | 18.896 | 2.987 | n/a | 0.000 | 0.122 | 1.091 | 1.636 | 0.019 | 0.000 | 0.478 | 10.107 | 2.411 | n/a | 0.045 | 3.109 | 0.165 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000104 | 18.288 | 2.680 | n/a | 0.000 | 0.206 | 1.757 | 2.106 | 0.023 | 0.000 | 0.537 | 8.616 | 2.306 | n/a | 0.056 | 2.886 | 0.158 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000101 | 17.664 | 3.842 | n/a | 0.000 | 0.159 | 1.132 | 1.505 | 0.024 | 0.000 | 0.640 | 8.099 | 2.187 | n/a | 0.077 | 4.000 | 0.226 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e6 | 16.862 | 1.786 | n/a | 0.000 | 0.075 | 0.829 | 1.612 | 0.036 | 0.000 | 0.192 | 11.694 | 0.611 | n/a | 0.027 | 1.861 | 0.110 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000111 | 16.231 | 3.135 | n/a | 0.000 | 0.104 | 0.896 | 1.193 | 0.020 | 0.000 | 0.412 | 6.598 | 3.833 | n/a | 0.040 | 3.239 | 0.200 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e1 | 16.069 | 1.751 | n/a | 0.000 | 0.072 | 0.747 | 1.753 | 0.020 | 0.000 | 0.182 | 9.695 | 1.814 | n/a | 0.035 | 1.823 | 0.113 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 0eb430293e9d132d00000000000000fb | 15.006 | 3.254 | n/a | 0.000 | 0.141 | 1.008 | 1.297 | 0.024 | 0.000 | 0.595 | 6.271 | 2.364 | n/a | 0.052 | 3.395 | 0.226 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000011f | 14.114 | 3.449 | n/a | 0.000 | 0.198 | 1.481 | 1.891 | 0.027 | 0.000 | 0.196 | 6.159 | 0.647 | n/a | 0.066 | 3.646 | 0.258 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000010a | 13.823 | 1.839 | n/a | 0.000 | 0.053 | 0.744 | 1.626 | 0.021 | 0.000 | 0.145 | 6.611 | 2.763 | n/a | 0.021 | 1.892 | 0.137 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000118 | 13.681 | 3.247 | n/a | 0.000 | 0.268 | 1.734 | 1.227 | 0.021 | 0.000 | 0.222 | 6.378 | 0.547 | n/a | 0.036 | 3.515 | 0.257 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.862 | 0.468 | 0.000 | 0.453 | 2.680 | n/a | 0.000 | 0.084 | 1.091 | 1.716 | 0.023 | 0.000 | 0.204 | 8.616 | 2.364 | n/a | 0.035 | 2.745 | 0.137 | 0.035 |
| p99 | 95.250 | 2.566 | 0.000 | 0.833 | 3.449 | n/a | 0.000 | 0.268 | 3.762 | 8.070 | 0.195 | 0.000 | 3.239 | 60.707 | 18.916 | n/a | 0.066 | 3.646 | 0.258 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d00000000000000ed | 95.250 | 2.996 | n/a | 0.000 | 0.108 | 1.149 | 8.070 | 0.023 | 0.000 | 3.239 | 60.707 | 18.916 | n/a | 0.042 | 3.104 | 0.033 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 0eb430293e9d132d00000000000000f3 | 26.346 | 2.693 | n/a | 0.000 | 0.051 | 3.762 | 5.477 | 0.063 | 0.000 | 1.486 | 6.074 | 6.715 | n/a | 0.025 | 2.745 | 0.104 | 0.025 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d00000000000000f8 | 21.137 | 2.584 | n/a | 0.000 | 0.084 | 1.314 | 3.527 | 0.023 | 0.000 | 0.131 | 10.648 | 2.791 | n/a | 0.035 | 2.668 | 0.126 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000010e | 21.115 | 2.412 | n/a | 0.000 | 0.043 | 1.119 | 1.716 | 0.042 | 0.000 | 0.134 | 9.170 | 6.459 | n/a | 0.019 | 2.455 | 0.116 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e3 | 20.096 | 1.843 | n/a | 0.000 | 0.072 | 0.683 | 5.166 | 0.195 | 0.000 | 0.138 | 11.339 | 0.633 | n/a | 0.027 | 1.914 | 0.095 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000f6 | 18.896 | 2.987 | n/a | 0.000 | 0.122 | 1.091 | 1.636 | 0.019 | 0.000 | 0.478 | 10.107 | 2.411 | n/a | 0.045 | 3.109 | 0.165 | 0.045 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000104 | 18.288 | 2.680 | n/a | 0.000 | 0.206 | 1.757 | 2.106 | 0.023 | 0.000 | 0.537 | 8.616 | 2.306 | n/a | 0.056 | 2.886 | 0.158 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e6 | 16.862 | 1.786 | n/a | 0.000 | 0.075 | 0.829 | 1.612 | 0.036 | 0.000 | 0.192 | 11.694 | 0.611 | n/a | 0.027 | 1.861 | 0.110 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000111 | 16.231 | 3.135 | n/a | 0.000 | 0.104 | 0.896 | 1.193 | 0.020 | 0.000 | 0.412 | 6.598 | 3.833 | n/a | 0.040 | 3.239 | 0.200 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000000e1 | 16.069 | 1.751 | n/a | 0.000 | 0.072 | 0.747 | 1.753 | 0.020 | 0.000 | 0.182 | 9.695 | 1.814 | n/a | 0.035 | 1.823 | 0.113 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 0eb430293e9d132d00000000000000fb | 15.006 | 3.254 | n/a | 0.000 | 0.141 | 1.008 | 1.297 | 0.024 | 0.000 | 0.595 | 6.271 | 2.364 | n/a | 0.052 | 3.395 | 0.226 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000011f | 14.114 | 3.449 | n/a | 0.000 | 0.198 | 1.481 | 1.891 | 0.027 | 0.000 | 0.196 | 6.159 | 0.647 | n/a | 0.066 | 3.646 | 0.258 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000010a | 13.823 | 1.839 | n/a | 0.000 | 0.053 | 0.744 | 1.626 | 0.021 | 0.000 | 0.145 | 6.611 | 2.763 | n/a | 0.021 | 1.892 | 0.137 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000118 | 13.681 | 3.247 | n/a | 0.000 | 0.268 | 1.734 | 1.227 | 0.021 | 0.000 | 0.222 | 6.378 | 0.547 | n/a | 0.036 | 3.515 | 0.257 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 0eb430293e9d132d0000000000000114 | 9.354 | 1.684 | n/a | 0.000 | 0.064 | 0.760 | 1.429 | 0.021 | 0.000 | 0.204 | 4.537 | 0.627 | n/a | 0.028 | 1.749 | 0.187 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.585 | 0.612 | 0.000 | 0.586 | 2.783 | n/a | 0.000 | 0.062 | 1.201 | 2.336 | 0.025 | 0.000 | 0.323 | 9.359 | 1.743 | n/a | 0.028 | 2.876 | 0.134 | 0.028 |
| p99 | 140.594 | 2.934 | 0.008 | 2.744 | 8.451 | n/a | 0.000 | 1.145 | 3.680 | 10.074 | 0.109 | 0.000 | 3.906 | 96.298 | 30.693 | n/a | 0.117 | 8.563 | 0.335 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d0000000000000134 | 140.594 | 1.742 | n/a | 0.000 | 0.062 | 1.204 | 10.004 | 0.028 | 0.000 | 0.531 | 96.298 | 30.693 | n/a | 0.031 | 1.804 | 0.013 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0eb430293e9d132d0000000000000143 | 43.702 | 1.568 | n/a | 0.000 | 0.016 | 0.644 | 3.509 | 0.038 | 0.000 | 0.115 | 20.050 | 17.753 | n/a | 0.009 | 1.584 | 0.036 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.018ms; driver.reader-basis.broadcast 0.011ms |
| 0eb430293e9d132d000000000000012e | 40.597 | 2.803 | n/a | 0.000 | 0.142 | 1.300 | 1.442 | 0.025 | 0.000 | 0.576 | 12.200 | 22.057 | n/a | 0.052 | 2.945 | 0.073 | 0.052 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d0000000000000153 | 39.811 | 2.094 | n/a | 0.000 | 0.054 | 1.046 | 9.732 | 0.069 | 0.000 | 0.268 | 21.692 | 4.833 | n/a | 0.024 | 2.148 | 0.054 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000137 | 34.095 | 3.176 | n/a | 0.000 | 0.647 | 1.367 | 5.756 | 0.059 | 0.000 | 1.359 | 9.545 | 12.165 | n/a | 0.022 | 3.823 | 0.112 | 0.022 | tx/thread-83/transactor.triplex-function | driver.reader-basis.broadcast 0.014ms |
| 0eb430293e9d132d0000000000000142 | 31.622 | 2.783 | n/a | 0.000 | 0.090 | 1.503 | 3.299 | 0.085 | 0.000 | 3.906 | 18.500 | 1.424 | n/a | 0.033 | 2.873 | 0.091 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000162 | 31.302 | 8.451 | n/a | 0.000 | 0.112 | 1.517 | 1.989 | 0.024 | 0.000 | 0.499 | 15.746 | 2.911 | n/a | 0.054 | 8.563 | 0.274 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000151 | 26.577 | 7.000 | n/a | 0.000 | 0.063 | 2.200 | 2.377 | 0.026 | 0.000 | 0.219 | 9.163 | 5.486 | n/a | 0.042 | 7.063 | 0.266 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 0eb430293e9d132d0000000000000146 | 26.101 | 2.167 | n/a | 0.000 | 0.048 | 0.990 | 3.069 | 0.055 | 0.000 | 0.219 | 13.785 | 5.749 | n/a | 0.018 | 2.215 | 0.085 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000130 | 25.266 | 2.816 | n/a | 0.000 | 0.060 | 0.684 | 4.312 | 0.021 | 0.000 | 0.116 | 15.638 | 1.593 | n/a | 0.026 | 2.876 | 0.114 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000157 | 24.056 | 2.518 | n/a | 0.000 | 0.049 | 0.704 | 1.359 | 0.019 | 0.000 | 1.915 | 8.767 | 8.701 | n/a | 0.025 | 2.566 | 0.107 | 0.025 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000149 | 23.453 | 4.088 | n/a | 0.000 | 0.222 | 1.903 | 3.640 | 0.075 | 0.000 | 0.331 | 10.356 | 2.756 | n/a | 0.082 | 4.310 | 0.184 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 0eb430293e9d132d000000000000013c | 21.466 | 4.259 | n/a | 0.000 | 0.213 | 1.560 | 3.079 | 0.095 | 0.000 | 0.323 | 10.400 | 1.420 | n/a | 0.117 | 4.472 | 0.208 | 0.117 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000154 | 20.891 | 1.667 | n/a | 0.000 | 0.036 | 1.611 | 1.425 | 0.020 | 0.000 | 0.098 | 15.428 | 0.588 | n/a | 0.016 | 1.703 | 0.082 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms |
| 0eb430293e9d132d000000000000013a | 20.602 | 3.770 | n/a | 0.000 | 0.072 | 1.212 | 2.664 | 0.023 | 0.000 | 0.605 | 9.212 | 3.017 | n/a | 0.028 | 3.842 | 0.186 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000015d | 20.585 | 3.320 | n/a | 0.000 | 0.094 | 3.680 | 10.074 | 0.046 | 0.000 | 0.170 | 2.856 | 0.309 | n/a | 0.036 | 3.414 | 0.166 | 0.036 | gw-w/thread-52/gateway.admitted-work | none observed |
| 0eb430293e9d132d0000000000000122 | 20.471 | 3.994 | n/a | 0.000 | 0.070 | 2.696 | 5.437 | 0.109 | 0.000 | 0.355 | 7.281 | 0.492 | n/a | 0.037 | 4.063 | 0.198 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000128 | 20.466 | 3.996 | n/a | 0.000 | 0.059 | 0.960 | 1.427 | 0.022 | 0.000 | 3.877 | 8.353 | 1.743 | n/a | 0.028 | 4.055 | 0.198 | 0.028 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000169 | 20.361 | 3.198 | n/a | 0.000 | 0.050 | 0.752 | 4.401 | 0.020 | 0.000 | 0.146 | 11.027 | 0.734 | n/a | 0.034 | 3.248 | 0.160 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000016c | 19.764 | 2.108 | n/a | 0.000 | 0.084 | 1.704 | 2.979 | 0.058 | 0.000 | 0.247 | 9.359 | 3.191 | n/a | 0.033 | 2.192 | 0.111 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.764 | 0.241 | 0.000 | 0.449 | 2.094 | n/a | 0.000 | 0.062 | 1.201 | 1.902 | 0.028 | 0.000 | 0.268 | 9.172 | 1.103 | n/a | 0.026 | 2.192 | 0.130 | 0.026 |
| p99 | 140.594 | 1.963 | 0.000 | 1.032 | 4.259 | n/a | 0.000 | 1.145 | 3.680 | 10.074 | 0.109 | 0.000 | 3.726 | 96.298 | 30.693 | n/a | 0.117 | 4.472 | 0.236 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d0000000000000134 | 140.594 | 1.742 | n/a | 0.000 | 0.062 | 1.204 | 10.004 | 0.028 | 0.000 | 0.531 | 96.298 | 30.693 | n/a | 0.031 | 1.804 | 0.013 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 0eb430293e9d132d0000000000000143 | 43.702 | 1.568 | n/a | 0.000 | 0.016 | 0.644 | 3.509 | 0.038 | 0.000 | 0.115 | 20.050 | 17.753 | n/a | 0.009 | 1.584 | 0.036 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.018ms; driver.reader-basis.broadcast 0.011ms |
| 0eb430293e9d132d000000000000012e | 40.597 | 2.803 | n/a | 0.000 | 0.142 | 1.300 | 1.442 | 0.025 | 0.000 | 0.576 | 12.200 | 22.057 | n/a | 0.052 | 2.945 | 0.073 | 0.052 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d0000000000000153 | 39.811 | 2.094 | n/a | 0.000 | 0.054 | 1.046 | 9.732 | 0.069 | 0.000 | 0.268 | 21.692 | 4.833 | n/a | 0.024 | 2.148 | 0.054 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000013c | 21.466 | 4.259 | n/a | 0.000 | 0.213 | 1.560 | 3.079 | 0.095 | 0.000 | 0.323 | 10.400 | 1.420 | n/a | 0.117 | 4.472 | 0.208 | 0.117 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000154 | 20.891 | 1.667 | n/a | 0.000 | 0.036 | 1.611 | 1.425 | 0.020 | 0.000 | 0.098 | 15.428 | 0.588 | n/a | 0.016 | 1.703 | 0.082 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms |
| 0eb430293e9d132d000000000000015d | 20.585 | 3.320 | n/a | 0.000 | 0.094 | 3.680 | 10.074 | 0.046 | 0.000 | 0.170 | 2.856 | 0.309 | n/a | 0.036 | 3.414 | 0.166 | 0.036 | gw-w/thread-52/gateway.admitted-work | none observed |
| 0eb430293e9d132d0000000000000122 | 20.471 | 3.994 | n/a | 0.000 | 0.070 | 2.696 | 5.437 | 0.109 | 0.000 | 0.355 | 7.281 | 0.492 | n/a | 0.037 | 4.063 | 0.198 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000016c | 19.764 | 2.108 | n/a | 0.000 | 0.084 | 1.704 | 2.979 | 0.058 | 0.000 | 0.247 | 9.359 | 3.191 | n/a | 0.033 | 2.192 | 0.111 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000167 | 17.888 | 1.833 | n/a | 0.000 | 0.059 | 1.173 | 1.902 | 0.043 | 0.000 | 0.531 | 11.156 | 1.169 | n/a | 0.022 | 1.892 | 0.106 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000012a | 16.677 | 3.324 | n/a | 0.000 | 0.105 | 0.992 | 1.183 | 0.020 | 0.000 | 3.726 | 6.720 | 0.564 | n/a | 0.042 | 3.429 | 0.206 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 0eb430293e9d132d0000000000000160 | 15.828 | 2.256 | n/a | 0.000 | 0.061 | 0.820 | 2.216 | 0.025 | 0.000 | 0.149 | 9.172 | 1.103 | n/a | 0.026 | 2.317 | 0.146 | 0.026 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000126 | 14.279 | 1.867 | n/a | 0.000 | 0.053 | 3.557 | 1.811 | 0.041 | 0.000 | 0.177 | 6.117 | 0.635 | n/a | 0.021 | 1.920 | 0.134 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| 0eb430293e9d132d000000000000014b | 13.413 | 2.021 | n/a | 0.000 | 1.145 | 1.041 | 1.353 | 0.021 | 0.000 | 0.146 | 7.077 | 0.585 | n/a | 0.022 | 3.166 | 0.236 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000015a | 12.125 | 1.529 | n/a | 0.000 | 0.045 | 0.375 | 1.416 | 0.019 | 0.000 | 0.434 | 5.735 | 2.552 | n/a | 0.019 | 1.574 | 0.130 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000016f | 10.519 | 2.351 | n/a | 0.000 | 0.118 | 1.201 | 1.491 | 0.021 | 0.000 | 0.408 | 4.404 | 0.478 | n/a | 0.048 | 2.469 | 0.235 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.424 | 0.000 | 0.000 | 0.621 | 2.953 | n/a | 0.000 | 0.084 | 1.017 | 1.830 | 0.025 | 0.000 | 0.494 | 8.697 | 2.376 | n/a | 0.034 | 3.004 | 0.150 | 0.034 |
| p99 | 110.210 | 2.349 | 0.000 | 1.331 | 7.351 | n/a | 0.000 | 0.232 | 3.107 | 11.026 | 3.242 | 0.000 | 3.365 | 76.810 | 19.001 | n/a | 0.089 | 7.560 | 0.281 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d000000000000017f | 110.210 | 3.093 | n/a | 0.000 | 0.100 | 0.856 | 10.190 | 0.032 | 0.000 | 0.085 | 76.810 | 19.001 | n/a | 0.043 | 3.193 | 0.029 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 0eb430293e9d132d000000000000018e | 45.727 | 2.445 | n/a | 0.000 | 0.092 | 0.813 | 1.283 | 0.022 | 0.000 | 0.550 | 22.074 | 18.430 | n/a | 0.019 | 2.536 | 0.055 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 0eb430293e9d132d0000000000000177 | 34.113 | 4.026 | n/a | 0.000 | 0.091 | 1.491 | 1.784 | 0.032 | 0.000 | 0.275 | 18.488 | 7.892 | n/a | 0.034 | 4.117 | 0.121 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000001ae | 31.222 | 7.351 | n/a | 0.000 | 0.209 | 1.437 | 3.825 | 0.080 | 0.000 | 1.746 | 15.199 | 1.284 | n/a | 0.089 | 7.560 | 0.242 | 0.089 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 0eb430293e9d132d0000000000000196 | 26.655 | 3.215 | n/a | 0.000 | 0.084 | 1.161 | 4.125 | 0.026 | 0.000 | 0.500 | 8.067 | 9.441 | n/a | 0.036 | 3.299 | 0.124 | 0.036 | tx/thread-83/transactor.triplex-function | none observed |
| 0eb430293e9d132d00000000000001ac | 25.374 | 4.791 | n/a | 0.000 | 0.108 | 3.107 | 11.026 | 0.097 | 0.000 | 3.356 | 2.569 | 0.279 | n/a | 0.040 | 4.899 | 0.193 | 0.040 | gw-w/thread-49/storage/begin-command! | driver.reader-basis.broadcast 0.021ms |
| 0eb430293e9d132d0000000000000190 | 24.621 | 2.953 | n/a | 0.000 | 0.051 | 0.684 | 2.308 | 0.022 | 0.000 | 0.573 | 14.395 | 3.612 | n/a | 0.024 | 3.004 | 0.122 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000017d | 24.195 | 2.782 | n/a | 0.000 | 0.058 | 1.098 | 1.830 | 0.022 | 0.000 | 0.185 | 17.441 | 0.759 | n/a | 0.021 | 2.839 | 0.117 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000188 | 23.552 | 2.706 | n/a | 0.000 | 0.122 | 0.971 | 1.739 | 0.023 | 0.000 | 3.365 | 9.980 | 4.593 | n/a | 0.052 | 2.828 | 0.120 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000182 | 23.352 | 3.769 | n/a | 0.000 | 0.112 | 0.929 | 6.036 | 0.067 | 0.000 | 0.156 | 8.095 | 4.149 | n/a | 0.039 | 3.881 | 0.166 | 0.039 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000001a2 | 22.334 | 1.705 | n/a | 0.000 | 0.042 | 0.757 | 1.219 | 0.020 | 0.000 | 0.136 | 15.015 | 3.418 | n/a | 0.022 | 1.747 | 0.078 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000019a | 21.424 | 4.003 | n/a | 0.000 | 0.093 | 1.466 | 1.564 | 3.242 | 0.000 | 0.222 | 10.079 | 0.720 | n/a | 0.036 | 4.095 | 0.191 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 0eb430293e9d132d000000000000017a | 20.423 | 3.701 | n/a | 0.000 | 0.063 | 1.616 | 3.643 | 0.128 | 0.000 | 0.329 | 9.236 | 1.675 | n/a | 0.033 | 3.764 | 0.184 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000186 | 18.926 | 2.062 | n/a | 0.000 | 0.055 | 1.063 | 1.532 | 0.019 | 0.000 | 0.499 | 10.056 | 3.614 | n/a | 0.026 | 2.117 | 0.112 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000171 | 17.987 | 3.208 | n/a | 0.000 | 0.119 | 0.905 | 4.731 | 0.025 | 0.000 | 0.102 | 6.626 | 2.219 | n/a | 0.051 | 3.327 | 0.185 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 0eb430293e9d132d00000000000001a7 | 17.623 | 2.222 | n/a | 0.000 | 0.061 | 0.779 | 5.005 | 0.023 | 0.000 | 0.100 | 7.081 | 2.327 | n/a | 0.024 | 2.283 | 0.130 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000019f | 17.068 | 3.040 | n/a | 0.000 | 0.232 | 1.017 | 1.375 | 0.024 | 0.000 | 0.224 | 8.697 | 2.376 | n/a | 0.083 | 3.272 | 0.192 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000018b | 16.712 | 2.341 | n/a | 0.000 | 0.082 | 1.213 | 2.048 | 0.032 | 0.000 | 0.750 | 7.427 | 2.778 | n/a | 0.040 | 2.423 | 0.145 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 0eb430293e9d132d0000000000000174 | 16.294 | 2.380 | n/a | 0.000 | 0.063 | 1.167 | 2.405 | 0.056 | 0.000 | 0.922 | 7.321 | 1.952 | n/a | 0.028 | 2.443 | 0.150 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000001a9 | 15.484 | 2.462 | n/a | 0.000 | 0.047 | 0.908 | 1.714 | 0.024 | 0.000 | 0.564 | 8.361 | 1.382 | n/a | 0.023 | 2.508 | 0.162 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.987 | 0.000 | 0.000 | 0.518 | 2.445 | n/a | 0.000 | 0.092 | 0.971 | 1.714 | 0.024 | 0.000 | 0.499 | 8.361 | 2.376 | n/a | 0.036 | 2.534 | 0.150 | 0.036 |
| p99 | 110.210 | 0.982 | 0.000 | 0.760 | 4.791 | n/a | 0.000 | 0.232 | 3.107 | 11.026 | 3.242 | 0.000 | 3.365 | 76.810 | 19.001 | n/a | 0.083 | 4.899 | 0.193 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d000000000000017f | 110.210 | 3.093 | n/a | 0.000 | 0.100 | 0.856 | 10.190 | 0.032 | 0.000 | 0.085 | 76.810 | 19.001 | n/a | 0.043 | 3.193 | 0.029 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 0eb430293e9d132d000000000000018e | 45.727 | 2.445 | n/a | 0.000 | 0.092 | 0.813 | 1.283 | 0.022 | 0.000 | 0.550 | 22.074 | 18.430 | n/a | 0.019 | 2.536 | 0.055 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| 0eb430293e9d132d00000000000001ac | 25.374 | 4.791 | n/a | 0.000 | 0.108 | 3.107 | 11.026 | 0.097 | 0.000 | 3.356 | 2.569 | 0.279 | n/a | 0.040 | 4.899 | 0.193 | 0.040 | gw-w/thread-49/storage/begin-command! | driver.reader-basis.broadcast 0.021ms |
| 0eb430293e9d132d0000000000000188 | 23.552 | 2.706 | n/a | 0.000 | 0.122 | 0.971 | 1.739 | 0.023 | 0.000 | 3.365 | 9.980 | 4.593 | n/a | 0.052 | 2.828 | 0.120 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000001a2 | 22.334 | 1.705 | n/a | 0.000 | 0.042 | 0.757 | 1.219 | 0.020 | 0.000 | 0.136 | 15.015 | 3.418 | n/a | 0.022 | 1.747 | 0.078 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000019a | 21.424 | 4.003 | n/a | 0.000 | 0.093 | 1.466 | 1.564 | 3.242 | 0.000 | 0.222 | 10.079 | 0.720 | n/a | 0.036 | 4.095 | 0.191 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 0eb430293e9d132d0000000000000186 | 18.926 | 2.062 | n/a | 0.000 | 0.055 | 1.063 | 1.532 | 0.019 | 0.000 | 0.499 | 10.056 | 3.614 | n/a | 0.026 | 2.117 | 0.112 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000171 | 17.987 | 3.208 | n/a | 0.000 | 0.119 | 0.905 | 4.731 | 0.025 | 0.000 | 0.102 | 6.626 | 2.219 | n/a | 0.051 | 3.327 | 0.185 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 0eb430293e9d132d00000000000001a7 | 17.623 | 2.222 | n/a | 0.000 | 0.061 | 0.779 | 5.005 | 0.023 | 0.000 | 0.100 | 7.081 | 2.327 | n/a | 0.024 | 2.283 | 0.130 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000019f | 17.068 | 3.040 | n/a | 0.000 | 0.232 | 1.017 | 1.375 | 0.024 | 0.000 | 0.224 | 8.697 | 2.376 | n/a | 0.083 | 3.272 | 0.192 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000018b | 16.712 | 2.341 | n/a | 0.000 | 0.082 | 1.213 | 2.048 | 0.032 | 0.000 | 0.750 | 7.427 | 2.778 | n/a | 0.040 | 2.423 | 0.145 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 0eb430293e9d132d0000000000000174 | 16.294 | 2.380 | n/a | 0.000 | 0.063 | 1.167 | 2.405 | 0.056 | 0.000 | 0.922 | 7.321 | 1.952 | n/a | 0.028 | 2.443 | 0.150 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000001a9 | 15.484 | 2.462 | n/a | 0.000 | 0.047 | 0.908 | 1.714 | 0.024 | 0.000 | 0.564 | 8.361 | 1.382 | n/a | 0.023 | 2.508 | 0.162 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d000000000000019d | 14.940 | 2.438 | n/a | 0.000 | 0.095 | 1.141 | 1.595 | 0.062 | 0.000 | 0.494 | 6.274 | 2.804 | n/a | 0.036 | 2.534 | 0.170 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d0000000000000194 | 10.274 | 1.700 | n/a | 0.000 | 0.054 | 0.741 | 1.170 | 0.020 | 0.000 | 0.883 | 5.149 | 0.537 | n/a | 0.020 | 1.754 | 0.171 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (817 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.389 | 0.479 | 0.000 | 0.524 | 2.104 | n/a | 0.000 | 0.048 | 0.669 | 1.282 | 0.017 | 0.000 | 0.147 | 6.778 | 0.598 | n/a | 0.017 | 2.456 | 0.192 | 0.017 |
| p99 | 72.065 | 2.006 | 0.051 | 2.112 | 7.003 | n/a | 0.000 | 31.836 | 6.898 | 6.605 | 0.095 | 0.000 | 3.761 | 34.370 | 9.216 | n/a | 0.054 | 35.271 | 0.709 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d0000000000000659 | 159.361 | 4.097 | n/a | 0.000 | 5.644 | 0.808 | 1.165 | 0.012 | 0.000 | 0.337 | 146.497 | 0.789 | n/a | 0.011 | 9.742 | 0.061 | 0.011 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.reader-basis.broadcast 0.117ms; driver.reader-basis.broadcast 0.057ms; driver.publication.persist-deferred 0.038ms |
| 0eb430293e9d132d000000000000065b | 139.761 | 2.222 | n/a | 0.000 | 0.049 | 2.348 | 1.578 | 0.022 | 0.000 | 0.106 | 132.870 | 0.540 | n/a | 0.026 | 2.271 | 0.016 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms; driver.publication.persist-deferred 0.020ms |
| 0eb430293e9d132d000000000000065c | 85.620 | 1.527 | n/a | 0.000 | 0.060 | 1.910 | 0.843 | 0.012 | 0.000 | 0.066 | 80.660 | 0.518 | n/a | 0.025 | 1.587 | 0.019 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms; driver.publication.persist-deferred 0.020ms |
| 0eb430293e9d132d00000000000001c2 | 81.792 | 1.970 | n/a | 0.000 | 68.154 | 0.884 | 2.586 | 0.055 | 0.000 | 0.225 | 7.493 | 0.398 | n/a | 0.026 | 70.124 | 0.857 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.042ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d00000000000001c3 | 77.343 | 1.993 | n/a | 0.000 | 0.015 | 0.670 | 4.073 | 0.017 | 0.000 | 0.097 | 63.219 | 7.247 | n/a | 0.015 | 2.008 | 0.026 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.042ms |
| 0eb430293e9d132d00000000000006f5 | 74.777 | 3.486 | n/a | 0.000 | 46.536 | 1.689 | 1.140 | 0.008 | 0.000 | 0.509 | 11.005 | 10.394 | n/a | 0.011 | 50.022 | 0.669 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.214ms; driver.publication.readback 0.136ms; driver.publication.readback 0.130ms; driver.publication.readback 0.097ms; driver.publication.readback 0.090ms |
| 0eb430293e9d132d00000000000001c4 | 74.319 | 2.608 | n/a | 0.000 | 46.344 | 0.796 | 2.587 | 0.047 | 0.000 | 0.209 | 17.575 | 4.143 | n/a | 0.011 | 48.951 | 0.659 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.042ms; driver.publication.readback 0.024ms |
| 0eb430293e9d132d00000000000001c1 | 73.705 | 2.718 | n/a | 0.000 | 0.095 | 1.246 | 4.432 | 0.027 | 0.000 | 0.145 | 50.888 | 14.115 | n/a | 0.039 | 2.813 | 0.038 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000002eb | 72.065 | 1.714 | n/a | 0.000 | 47.027 | 4.825 | 2.263 | 0.051 | 0.000 | 0.116 | 15.566 | 0.493 | n/a | 0.010 | 48.741 | 0.676 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.287ms; driver.reader-basis.broadcast 0.155ms; driver.publication.readback 0.074ms; driver.publication.readback 0.054ms; driver.publication.readback 0.051ms |
| 0eb430293e9d132d00000000000006f7 | 59.380 | 8.387 | n/a | 0.000 | 19.415 | 3.496 | 3.102 | 0.048 | 0.000 | 1.309 | 17.676 | 5.926 | n/a | 0.021 | 27.801 | 0.468 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.214ms; driver.publication.readback 0.130ms; driver.publication.readback 0.097ms; driver.publication.readback 0.090ms; driver.reader-basis.broadcast 0.059ms |
| 0eb430293e9d132d00000000000001e2 | 57.545 | 1.517 | n/a | 0.000 | 40.043 | 0.553 | 1.408 | 0.029 | 0.000 | 3.761 | 9.597 | 0.624 | n/a | 0.012 | 41.560 | 0.722 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.115ms; driver.publication.readback 0.074ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.019ms |
| 0eb430293e9d132d00000000000001d3 | 57.244 | 4.221 | n/a | 0.000 | 25.044 | 1.229 | 1.530 | 0.051 | 0.000 | 0.092 | 23.880 | 1.177 | n/a | 0.020 | 29.266 | 0.511 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.140ms; driver.publication.readback 0.119ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.053ms; driver.publication.persist-deferred 0.017ms |
| 0eb430293e9d132d00000000000002f1 | 57.157 | 4.390 | n/a | 0.000 | 23.905 | 0.564 | 1.435 | 0.023 | 0.000 | 7.202 | 18.874 | 0.751 | n/a | 0.014 | 28.295 | 0.495 | 0.014 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.155ms; driver.publication.readback 0.054ms; driver.publication.readback 0.051ms; driver.publication.readback 0.046ms; driver.publication.readback 0.046ms |
| 0eb430293e9d132d0000000000000242 | 52.691 | 3.445 | n/a | 0.000 | 39.974 | 0.708 | 1.628 | 0.034 | 0.000 | 0.335 | 5.951 | 0.593 | n/a | 0.022 | 43.419 | 0.824 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.174ms; driver.publication.readback 0.089ms; driver.publication.readback 0.052ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.040ms |
| 0eb430293e9d132d00000000000006f3 | 52.532 | 1.577 | n/a | 0.000 | 35.968 | 1.844 | 0.621 | 0.010 | 0.000 | 0.059 | 11.902 | 0.536 | n/a | 0.016 | 37.545 | 0.715 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.214ms; driver.publication.readback 0.130ms; driver.publication.readback 0.090ms; driver.reader-basis.broadcast 0.059ms; driver.publication.persist-deferred 0.046ms |
| 0eb430293e9d132d0000000000000465 | 51.174 | 2.628 | n/a | 0.000 | 0.061 | 1.831 | 6.605 | 0.006 | 29.445 | 0.022 | 10.122 | 0.422 | n/a | 0.031 | 2.689 | 0.053 | 0.031 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d00000000000001e1 | 49.637 | 3.312 | n/a | 0.000 | 0.099 | 0.736 | 1.429 | 0.018 | 0.000 | 0.920 | 42.441 | 0.641 | n/a | 0.041 | 3.411 | 0.069 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.115ms; driver.publication.persist-deferred 0.026ms |
| 0eb430293e9d132d0000000000000345 | 48.362 | 2.653 | n/a | 0.000 | 23.336 | 0.980 | 2.646 | 0.072 | 0.000 | 0.188 | 15.549 | 2.914 | n/a | 0.025 | 25.990 | 0.537 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.publication.readback 0.112ms; driver.publication.persist-deferred 0.050ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.032ms |
| 0eb430293e9d132d00000000000002e9 | 48.196 | 1.483 | n/a | 0.000 | 24.181 | 4.300 | 2.315 | 0.070 | 0.000 | 0.640 | 14.909 | 0.285 | n/a | 0.013 | 25.665 | 0.533 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.287ms; driver.publication.readback 0.074ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.037ms |
| 0eb430293e9d132d00000000000001da | 47.184 | 1.762 | n/a | 0.000 | 0.083 | 0.981 | 1.691 | 0.045 | 0.000 | 0.095 | 36.826 | 5.678 | n/a | 0.022 | 1.845 | 0.039 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.090ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.018ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.827 | 0.000 | 0.000 | 0.408 | 1.738 | n/a | 0.000 | 0.046 | 0.656 | 1.129 | 0.017 | 0.000 | 0.145 | 6.619 | 0.450 | n/a | 0.017 | 2.010 | 0.173 | 0.017 |
| p99 | 57.545 | 1.983 | 0.000 | 0.891 | 4.297 | n/a | 0.000 | 33.411 | 6.940 | 5.626 | 0.072 | 0.000 | 3.407 | 31.485 | 7.159 | n/a | 0.073 | 35.313 | 0.708 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d000000000000065c | 85.620 | 1.527 | n/a | 0.000 | 0.060 | 1.910 | 0.843 | 0.012 | 0.000 | 0.066 | 80.660 | 0.518 | n/a | 0.025 | 1.587 | 0.019 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms; driver.publication.persist-deferred 0.020ms |
| 0eb430293e9d132d00000000000001c2 | 81.792 | 1.970 | n/a | 0.000 | 68.154 | 0.884 | 2.586 | 0.055 | 0.000 | 0.225 | 7.493 | 0.398 | n/a | 0.026 | 70.124 | 0.857 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.042ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d00000000000001c1 | 73.705 | 2.718 | n/a | 0.000 | 0.095 | 1.246 | 4.432 | 0.027 | 0.000 | 0.145 | 50.888 | 14.115 | n/a | 0.039 | 2.813 | 0.038 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000002eb | 72.065 | 1.714 | n/a | 0.000 | 47.027 | 4.825 | 2.263 | 0.051 | 0.000 | 0.116 | 15.566 | 0.493 | n/a | 0.010 | 48.741 | 0.676 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.287ms; driver.reader-basis.broadcast 0.155ms; driver.publication.readback 0.074ms; driver.publication.readback 0.054ms; driver.publication.readback 0.051ms |
| 0eb430293e9d132d00000000000001e2 | 57.545 | 1.517 | n/a | 0.000 | 40.043 | 0.553 | 1.408 | 0.029 | 0.000 | 3.761 | 9.597 | 0.624 | n/a | 0.012 | 41.560 | 0.722 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.115ms; driver.publication.readback 0.074ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.019ms |
| 0eb430293e9d132d00000000000006f3 | 52.532 | 1.577 | n/a | 0.000 | 35.968 | 1.844 | 0.621 | 0.010 | 0.000 | 0.059 | 11.902 | 0.536 | n/a | 0.016 | 37.545 | 0.715 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.214ms; driver.publication.readback 0.130ms; driver.publication.readback 0.090ms; driver.reader-basis.broadcast 0.059ms; driver.publication.persist-deferred 0.046ms |
| 0eb430293e9d132d0000000000000345 | 48.362 | 2.653 | n/a | 0.000 | 23.336 | 0.980 | 2.646 | 0.072 | 0.000 | 0.188 | 15.549 | 2.914 | n/a | 0.025 | 25.990 | 0.537 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.publication.readback 0.112ms; driver.publication.persist-deferred 0.050ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.032ms |
| 0eb430293e9d132d00000000000002e9 | 48.196 | 1.483 | n/a | 0.000 | 24.181 | 4.300 | 2.315 | 0.070 | 0.000 | 0.640 | 14.909 | 0.285 | n/a | 0.013 | 25.665 | 0.533 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.287ms; driver.publication.readback 0.074ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.049ms; driver.publication.readback 0.037ms |
| 0eb430293e9d132d00000000000001da | 47.184 | 1.762 | n/a | 0.000 | 0.083 | 0.981 | 1.691 | 0.045 | 0.000 | 0.095 | 36.826 | 5.678 | n/a | 0.022 | 1.845 | 0.039 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.090ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d00000000000001c6 | 46.300 | 2.071 | n/a | 0.000 | 3.133 | 6.461 | 0.979 | 0.019 | 0.000 | 0.087 | 26.656 | 6.878 | n/a | 0.016 | 5.204 | 0.112 | 0.016 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.116ms; driver.publication.readback 0.073ms; driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.042ms |
| 0eb430293e9d132d000000000000024b | 45.233 | 1.902 | n/a | 0.000 | 33.411 | 0.736 | 1.595 | 0.042 | 0.000 | 0.123 | 7.008 | 0.395 | n/a | 0.021 | 35.313 | 0.781 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.174ms; driver.publication.readback 0.061ms; driver.publication.readback 0.051ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.040ms |
| 0eb430293e9d132d00000000000001e9 | 44.090 | 1.845 | n/a | 0.000 | 14.363 | 2.977 | 1.149 | 0.025 | 0.000 | 3.109 | 16.736 | 3.874 | n/a | 0.012 | 16.209 | 0.368 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.readback 0.055ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.021ms |
| 0eb430293e9d132d0000000000000466 | 43.471 | 1.707 | n/a | 0.000 | 0.041 | 26.695 | 4.799 | 0.014 | 0.000 | 0.055 | 9.666 | 0.475 | n/a | 0.019 | 1.748 | 0.040 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 0eb430293e9d132d00000000000001e0 | 43.384 | 2.433 | n/a | 0.000 | 0.042 | 0.817 | 5.010 | 0.023 | 0.000 | 0.086 | 28.088 | 6.863 | n/a | 0.022 | 2.475 | 0.057 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 0eb430293e9d132d00000000000002af | 42.531 | 1.877 | n/a | 0.000 | 4.140 | 0.562 | 1.556 | 0.050 | 0.000 | 3.685 | 26.355 | 4.291 | n/a | 0.016 | 6.017 | 0.141 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.115ms; driver.publication.readback 0.098ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.028ms |
| 0eb430293e9d132d0000000000000241 | 42.511 | 1.682 | n/a | 0.000 | 17.823 | 3.003 | 0.968 | 0.017 | 0.000 | 0.062 | 16.802 | 2.137 | n/a | 0.017 | 19.505 | 0.459 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.089ms; driver.publication.readback 0.052ms; driver.publication.readback 0.041ms; driver.publication.readback 0.039ms; driver.publication.readback 0.027ms |
| 0eb430293e9d132d00000000000002b9 | 40.857 | 5.812 | n/a | 0.000 | 0.062 | 4.320 | 16.823 | 0.131 | 0.000 | 0.659 | 12.113 | 0.902 | n/a | 0.034 | 5.874 | 0.144 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d0000000000000518 | 40.283 | 1.463 | n/a | 0.000 | 0.020 | 0.527 | 6.719 | 0.005 | 16.688 | 0.030 | 14.409 | 0.408 | n/a | 0.014 | 1.482 | 0.037 | 0.014 | gw-w/thread--1/jdk.GCPhasePause | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d0000000000000508 | 39.610 | 1.397 | n/a | 0.000 | 25.545 | 0.443 | 0.743 | 0.017 | 0.000 | 0.247 | 9.281 | 1.925 | n/a | 0.012 | 26.943 | 0.680 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.549ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.050ms; driver.publication.readback 0.049ms; driver.publication.readback 0.046ms |
| 0eb430293e9d132d00000000000001eb | 39.339 | 2.710 | n/a | 0.000 | 20.180 | 3.859 | 1.544 | 0.019 | 0.000 | 1.672 | 8.870 | 0.464 | n/a | 0.021 | 22.890 | 0.582 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.061ms; driver.publication.readback 0.055ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.026ms |

## P2 / tail / commit (2567 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.129 | 0.249 | 0.000 | 0.490 | 2.072 | n/a | 0.000 | 0.038 | 0.533 | 0.961 | 0.012 | 0.000 | 0.098 | 4.502 | 0.566 | n/a | 0.013 | 2.364 | 0.240 | 0.013 |
| p99 | 38.171 | 2.007 | 0.044 | 1.900 | 6.390 | n/a | 0.000 | 19.279 | 5.125 | 4.316 | 0.047 | 0.000 | 3.162 | 20.455 | 4.247 | n/a | 0.039 | 21.542 | 0.707 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d00000000000008b0 | 57.346 | 1.883 | n/a | 0.000 | 2.488 | 0.893 | 0.576 | 0.004 | 0.000 | 2.636 | 34.004 | 14.855 | n/a | 0.008 | 4.371 | 0.076 | 0.008 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.071ms; driver.publication.readback 0.052ms; driver.publication.readback 0.041ms |
| 0eb430293e9d132d00000000000008b3 | 57.333 | 4.987 | n/a | 0.000 | 0.026 | 2.056 | 1.125 | 0.009 | 0.000 | 0.356 | 45.656 | 3.101 | n/a | 0.017 | 5.013 | 0.087 | 0.017 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.052ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.041ms |
| 0eb430293e9d132d00000000000008ad | 50.491 | 1.719 | n/a | 0.000 | 0.021 | 1.660 | 1.641 | 0.004 | 11.089 | 0.020 | 33.836 | 0.484 | n/a | 0.016 | 1.741 | 0.034 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d0000000000001700 | 50.128 | 2.006 | n/a | 0.000 | 33.115 | 0.383 | 0.605 | 0.008 | 0.000 | 0.044 | 12.903 | 1.054 | n/a | 0.011 | 35.121 | 0.701 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.313ms; driver.publication.readback 0.117ms; driver.publication.readback 0.093ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.036ms |
| 0eb430293e9d132d00000000000008b5 | 47.845 | 2.949 | n/a | 0.000 | 0.066 | 0.580 | 1.110 | 0.011 | 0.000 | 0.115 | 30.000 | 12.985 | n/a | 0.028 | 3.016 | 0.063 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.521ms; driver.reader-basis.broadcast 0.292ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms |
| 0eb430293e9d132d00000000000008af | 47.734 | 3.397 | n/a | 0.000 | 0.199 | 4.592 | 1.082 | 0.004 | 0.000 | 0.017 | 35.750 | 2.677 | n/a | 0.015 | 3.595 | 0.075 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.readback 0.071ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d00000000000016fb | 47.643 | 2.223 | n/a | 0.000 | 32.381 | 0.476 | 1.390 | 0.018 | 0.000 | 0.056 | 10.403 | 0.685 | n/a | 0.010 | 34.604 | 0.726 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.206ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| 0eb430293e9d132d0000000000000aa8 | 47.126 | 2.965 | n/a | 0.000 | 22.629 | 0.478 | 3.585 | 0.007 | 0.000 | 0.030 | 16.258 | 1.152 | n/a | 0.022 | 25.595 | 0.543 | 0.022 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.477ms; driver.publication.readback 0.115ms; driver.publication.readback 0.106ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.015ms |
| 0eb430293e9d132d00000000000008b1 | 46.939 | 3.263 | n/a | 0.000 | 0.596 | 2.306 | 0.911 | 0.004 | 0.000 | 0.009 | 38.920 | 0.923 | n/a | 0.008 | 3.859 | 0.082 | 0.008 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.071ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.025ms |
| 0eb430293e9d132d00000000000018df | 46.222 | 7.139 | n/a | 0.000 | 31.011 | 0.565 | 1.588 | 0.015 | 0.000 | 0.375 | 4.453 | 1.066 | n/a | 0.009 | 38.151 | 0.825 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.232ms; driver.publication.readback 0.118ms; driver.publication.persist-deferred 0.055ms |
| 0eb430293e9d132d00000000000008b4 | 44.543 | 2.081 | n/a | 0.000 | 0.028 | 0.667 | 4.027 | 0.028 | 0.000 | 0.250 | 37.087 | 0.362 | n/a | 0.014 | 2.108 | 0.047 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.052ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms |
| 0eb430293e9d132d0000000000001ad0 | 44.355 | 2.911 | n/a | 0.000 | 35.519 | 0.750 | 1.038 | 0.013 | 0.000 | 0.073 | 3.416 | 0.618 | n/a | 0.016 | 38.430 | 0.866 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.106ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.059ms; driver.publication.persist-deferred 0.052ms |
| 0eb430293e9d132d0000000000001ac9 | 43.521 | 4.794 | n/a | 0.000 | 17.459 | 11.315 | 2.727 | 0.035 | 0.000 | 0.534 | 5.101 | 1.547 | n/a | 0.009 | 22.253 | 0.511 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.052ms; driver.publication.readback 0.038ms; driver.publication.readback 0.034ms |
| 0eb430293e9d132d00000000000014ca | 43.186 | 3.501 | n/a | 0.000 | 28.867 | 3.142 | 3.363 | 0.044 | 0.000 | 0.129 | 3.659 | 0.471 | n/a | 0.009 | 32.369 | 0.750 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.825ms; driver.reader-basis.broadcast 0.189ms; driver.publication.readback 0.123ms; driver.publication.readback 0.055ms; driver.publication.readback 0.052ms |
| 0eb430293e9d132d00000000000008b7 | 43.045 | 2.435 | n/a | 0.000 | 0.042 | 1.505 | 0.861 | 0.013 | 0.000 | 2.029 | 35.035 | 1.101 | n/a | 0.023 | 2.477 | 0.058 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.521ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms; driver.publication.readback 0.046ms |
| 0eb430293e9d132d00000000000008ba | 42.933 | 2.098 | n/a | 0.000 | 34.664 | 0.657 | 0.854 | 0.012 | 0.000 | 0.475 | 3.771 | 0.380 | n/a | 0.021 | 36.762 | 0.856 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.521ms; driver.publication.readback 0.104ms; driver.publication.readback 0.064ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms |
| 0eb430293e9d132d0000000000001acd | 42.807 | 3.247 | n/a | 0.000 | 29.928 | 0.624 | 1.720 | 0.031 | 0.000 | 0.082 | 5.625 | 1.536 | n/a | 0.015 | 33.175 | 0.775 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.052ms; driver.publication.readback 0.038ms; driver.publication.readback 0.034ms |
| 0eb430293e9d132d0000000000001532 | 42.580 | 3.115 | n/a | 0.000 | 27.383 | 0.450 | 1.419 | 0.029 | 0.000 | 0.073 | 9.358 | 0.740 | n/a | 0.013 | 30.498 | 0.716 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.106ms; driver.publication.readback 0.093ms; driver.publication.readback 0.062ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.045ms |
| 0eb430293e9d132d0000000000001b1b | 40.505 | 1.842 | n/a | 0.000 | 30.511 | 0.680 | 1.270 | 0.029 | 0.000 | 0.411 | 4.666 | 1.066 | n/a | 0.031 | 32.352 | 0.799 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.165ms; driver.publication.readback 0.107ms; driver.publication.readback 0.070ms; driver.publication.readback 0.053ms; driver.publication.readback 0.050ms |
| 0eb430293e9d132d000000000000087e | 40.316 | 9.731 | n/a | 0.000 | 0.950 | 4.430 | 2.245 | 0.021 | 0.000 | 0.070 | 20.332 | 2.526 | n/a | 0.010 | 10.681 | 0.265 | 0.010 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.124ms; driver.publication.persist-deferred 0.040ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.016ms |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.027 | 0.000 | 0.000 | 0.382 | 1.656 | n/a | 0.000 | 0.038 | 0.529 | 0.838 | 0.011 | 0.000 | 0.098 | 4.168 | 0.451 | n/a | 0.013 | 1.873 | 0.221 | 0.013 |
| p99 | 36.672 | 1.865 | 0.037 | 0.808 | 4.794 | n/a | 0.000 | 19.485 | 5.171 | 4.119 | 0.047 | 0.000 | 2.881 | 20.687 | 3.416 | n/a | 0.039 | 21.542 | 0.708 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0eb430293e9d132d00000000000008b0 | 57.346 | 1.883 | n/a | 0.000 | 2.488 | 0.893 | 0.576 | 0.004 | 0.000 | 2.636 | 34.004 | 14.855 | n/a | 0.008 | 4.371 | 0.076 | 0.008 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.071ms; driver.publication.readback 0.052ms; driver.publication.readback 0.041ms |
| 0eb430293e9d132d00000000000008ad | 50.491 | 1.719 | n/a | 0.000 | 0.021 | 1.660 | 1.641 | 0.004 | 11.089 | 0.020 | 33.836 | 0.484 | n/a | 0.016 | 1.741 | 0.034 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d0000000000001700 | 50.128 | 2.006 | n/a | 0.000 | 33.115 | 0.383 | 0.605 | 0.008 | 0.000 | 0.044 | 12.903 | 1.054 | n/a | 0.011 | 35.121 | 0.701 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.313ms; driver.publication.readback 0.117ms; driver.publication.readback 0.093ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.036ms |
| 0eb430293e9d132d00000000000008b5 | 47.845 | 2.949 | n/a | 0.000 | 0.066 | 0.580 | 1.110 | 0.011 | 0.000 | 0.115 | 30.000 | 12.985 | n/a | 0.028 | 3.016 | 0.063 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.521ms; driver.reader-basis.broadcast 0.292ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.064ms |
| 0eb430293e9d132d0000000000000aa8 | 47.126 | 2.965 | n/a | 0.000 | 22.629 | 0.478 | 3.585 | 0.007 | 0.000 | 0.030 | 16.258 | 1.152 | n/a | 0.022 | 25.595 | 0.543 | 0.022 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.477ms; driver.publication.readback 0.115ms; driver.publication.readback 0.106ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.015ms |
| 0eb430293e9d132d00000000000008b4 | 44.543 | 2.081 | n/a | 0.000 | 0.028 | 0.667 | 4.027 | 0.028 | 0.000 | 0.250 | 37.087 | 0.362 | n/a | 0.014 | 2.108 | 0.047 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.292ms; driver.publication.persist-deferred 0.098ms; driver.publication.readback 0.052ms; driver.publication.readback 0.046ms; driver.publication.readback 0.041ms |
| 0eb430293e9d132d0000000000001ad0 | 44.355 | 2.911 | n/a | 0.000 | 35.519 | 0.750 | 1.038 | 0.013 | 0.000 | 0.073 | 3.416 | 0.618 | n/a | 0.016 | 38.430 | 0.866 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.106ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.059ms; driver.publication.persist-deferred 0.052ms |
| 0eb430293e9d132d0000000000001ac9 | 43.521 | 4.794 | n/a | 0.000 | 17.459 | 11.315 | 2.727 | 0.035 | 0.000 | 0.534 | 5.101 | 1.547 | n/a | 0.009 | 22.253 | 0.511 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.116ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.052ms; driver.publication.readback 0.038ms; driver.publication.readback 0.034ms |
| 0eb430293e9d132d00000000000008ba | 42.933 | 2.098 | n/a | 0.000 | 34.664 | 0.657 | 0.854 | 0.012 | 0.000 | 0.475 | 3.771 | 0.380 | n/a | 0.021 | 36.762 | 0.856 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.521ms; driver.publication.readback 0.104ms; driver.publication.readback 0.064ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms |
| 0eb430293e9d132d0000000000001b1b | 40.505 | 1.842 | n/a | 0.000 | 30.511 | 0.680 | 1.270 | 0.029 | 0.000 | 0.411 | 4.666 | 1.066 | n/a | 0.031 | 32.352 | 0.799 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.165ms; driver.publication.readback 0.107ms; driver.publication.readback 0.070ms; driver.publication.readback 0.053ms; driver.publication.readback 0.050ms |
| 0eb430293e9d132d000000000000108a | 40.221 | 1.950 | n/a | 0.000 | 25.693 | 0.622 | 0.744 | 0.012 | 0.000 | 0.265 | 9.929 | 0.992 | n/a | 0.015 | 27.643 | 0.687 | 0.015 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.021ms; driver.reader-basis.broadcast 0.345ms; driver.publication.readback 0.098ms; driver.publication.readback 0.071ms; driver.publication.readback 0.063ms |
| 0eb430293e9d132d000000000000119a | 39.893 | 1.460 | n/a | 0.000 | 28.987 | 0.483 | 1.131 | 0.016 | 0.000 | 0.061 | 7.243 | 0.501 | n/a | 0.011 | 30.447 | 0.763 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.153ms; driver.publication.readback 0.061ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.039ms |
| 0eb430293e9d132d0000000000000f4c | 38.171 | 1.385 | n/a | 0.000 | 20.157 | 0.432 | 0.700 | 0.015 | 0.000 | 0.087 | 14.945 | 0.440 | n/a | 0.011 | 21.542 | 0.564 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.120ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.019ms |
| 0eb430293e9d132d00000000000016fd | 38.027 | 2.827 | n/a | 0.000 | 30.375 | 0.610 | 0.819 | 0.012 | 0.000 | 0.269 | 2.617 | 0.480 | n/a | 0.018 | 33.202 | 0.873 | 0.018 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.093ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.034ms; driver.publication.persist-deferred 0.018ms |
| 0eb430293e9d132d0000000000001614 | 37.023 | 2.001 | n/a | 0.000 | 28.642 | 0.460 | 1.126 | 0.013 | 0.000 | 0.116 | 4.208 | 0.444 | n/a | 0.011 | 30.643 | 0.828 | 0.011 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.072ms; driver.publication.readback 0.058ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.020ms |
| 0eb430293e9d132d000000000000144c | 36.672 | 1.277 | n/a | 0.000 | 22.607 | 0.606 | 0.702 | 0.012 | 0.000 | 0.080 | 11.011 | 0.369 | n/a | 0.007 | 23.884 | 0.651 | 0.007 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.056ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d000000000000152c | 35.873 | 5.446 | n/a | 0.000 | 0.190 | 3.490 | 1.639 | 0.024 | 0.000 | 0.101 | 23.837 | 1.131 | n/a | 0.014 | 5.636 | 0.157 | 0.014 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.095ms; driver.publication.readback 0.093ms; driver.publication.readback 0.062ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.035ms |
| 0eb430293e9d132d0000000000000d71 | 34.825 | 2.079 | n/a | 0.000 | 0.059 | 0.654 | 4.928 | 0.004 | 15.573 | 0.013 | 11.223 | 0.269 | n/a | 0.023 | 2.138 | 0.061 | 0.023 | gw-w/thread--1/jdk.GCPhasePause | driver.reader-basis.broadcast 0.265ms; driver.publication.readback 0.089ms; driver.publication.persist-deferred 0.016ms |
| 0eb430293e9d132d00000000000018de | 33.688 | 2.271 | n/a | 0.000 | 0.025 | 0.917 | 0.778 | 0.012 | 0.000 | 0.232 | 27.473 | 1.964 | n/a | 0.016 | 2.296 | 0.068 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.232ms; driver.publication.readback 0.108ms |
| 0eb430293e9d132d000000000000142f | 33.314 | 1.052 | n/a | 0.000 | 19.494 | 1.259 | 0.972 | 0.019 | 0.000 | 0.066 | 9.976 | 0.466 | n/a | 0.010 | 20.546 | 0.617 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.054ms; driver.publication.readback 0.052ms; driver.publication.readback 0.048ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.039ms |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.157 | n/a | n/a | n/a | 0.054 | n/a | 0.000 | 0.000 | 0.841 | 200.646 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.092 | 0.054 | 0.000 | 0.092 |
| p99 | 207.046 | n/a | n/a | n/a | 16.494 | n/a | 1.092 | 0.000 | 3.297 | 204.448 | 0.100 | 0.000 | 0.279 | 0.000 | n/a | n/a | 0.652 | 17.586 | 0.338 | 0.652 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af08840000000000000006 | 207.046 | 0.146 | n/a | 0.000 | 0.000 | 2.145 | 204.448 | 0.022 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.088 | 0.146 | 0.001 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000005 | 203.156 | 0.054 | n/a | 0.000 | 0.000 | 0.841 | 201.784 | 0.031 | 0.000 | 0.279 | 0.000 | n/a | n/a | 0.167 | 0.054 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000ebd | 201.582 | 0.039 | n/a | 0.000 | 0.000 | 0.743 | 200.672 | 0.003 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.092 | 0.039 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000ebb | 201.180 | 0.020 | n/a | 0.000 | 0.000 | 0.448 | 200.646 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.040 | 0.020 | 0.000 | 0.040 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000ebc | 201.157 | 0.025 | n/a | 0.000 | 0.000 | 0.296 | 200.690 | 0.016 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.069 | 0.025 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000ec1 | 58.412 | 15.676 | n/a | 0.000 | 0.000 | 3.297 | 38.773 | 0.006 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.652 | 15.676 | 0.268 | 0.652 | gw-r/thread-45/gateway.admitted-work | none observed |
| 77edc823a15682c60000000000000002 | 55.814 | 0.294 | n/a | 0.000 | 0.000 | 1.104 | 53.774 | 0.100 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.463 | 0.294 | 0.005 | 0.463 | gw-r/thread-50/gateway.admitted-work | none observed |
| 7f57495f08af08840000000000000ec0 | 51.985 | 16.494 | n/a | 1.092 | 0.000 | 2.682 | 31.577 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.134 | 17.586 | 0.338 | 0.134 | gw-r/thread-51/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1012.045 | n/a | n/a | n/a | 0.250 | n/a | 0.000 | 0.000 | 1.842 | 1008.281 | 0.022 | 0.000 | 0.347 | 0.000 | n/a | n/a | 1.302 | 0.250 | 0.000 | 1.302 |
| p99 | 1012.045 | n/a | n/a | n/a | 0.250 | n/a | 0.000 | 0.000 | 1.842 | 1008.281 | 0.022 | 0.000 | 0.347 | 0.000 | n/a | n/a | 1.302 | 0.250 | 0.000 | 1.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c60000000000000017 | 1012.045 | 0.250 | n/a | 0.000 | 0.000 | 1.842 | 1008.281 | 0.022 | 0.000 | 0.347 | 0.000 | n/a | n/a | 1.302 | 0.250 | 0.000 | 1.302 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 827.057 | n/a | n/a | n/a | 2.594 | n/a | 0.000 | 0.000 | 1.010 | 812.493 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.270 | 2.594 | 0.006 | 0.270 |
| p99 | 1011.467 | n/a | n/a | n/a | 12.974 | n/a | 0.502 | 0.000 | 8.821 | 1002.032 | 0.036 | 0.000 | 0.904 | 0.000 | n/a | n/a | 1.184 | 12.974 | 0.393 | 1.184 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c6000000000000001d | 1011.467 | 0.159 | n/a | 0.000 | 0.000 | 8.821 | 1001.198 | 0.022 | 0.000 | 0.165 | 0.000 | n/a | n/a | 1.102 | 0.159 | 0.000 | 1.102 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000020 | 1005.980 | 0.135 | n/a | 0.000 | 0.000 | 3.172 | 1001.394 | 0.012 | 0.000 | 0.157 | 0.000 | n/a | n/a | 1.111 | 0.135 | 0.000 | 1.111 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c6000000000000002b | 1003.940 | 0.354 | n/a | 0.000 | 0.000 | 0.830 | 1001.375 | 0.014 | 0.000 | 0.183 | 0.000 | n/a | n/a | 1.184 | 0.354 | 0.000 | 1.184 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c6000000000000001a | 1003.888 | 0.238 | n/a | 0.000 | 0.000 | 0.774 | 1001.536 | 0.019 | 0.000 | 0.170 | 0.000 | n/a | n/a | 1.152 | 0.238 | 0.000 | 1.152 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000030 | 1003.853 | 0.162 | n/a | 0.000 | 0.000 | 0.394 | 1002.032 | 0.021 | 0.000 | 0.131 | 0.000 | n/a | n/a | 1.113 | 0.162 | 0.000 | 1.113 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000024 | 1003.849 | 0.164 | n/a | 0.000 | 0.000 | 0.739 | 1001.735 | 0.011 | 0.000 | 0.069 | 0.000 | n/a | n/a | 1.130 | 0.164 | 0.000 | 1.130 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000036 | 1003.695 | 0.144 | n/a | 0.000 | 0.000 | 1.244 | 1001.067 | 0.016 | 0.000 | 0.090 | 0.000 | n/a | n/a | 1.134 | 0.144 | 0.000 | 1.134 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c6000000000000002a | 1003.435 | 0.264 | n/a | 0.000 | 0.000 | 0.783 | 1001.171 | 0.015 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.152 | 0.264 | 0.000 | 1.152 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c6000000000000003b | 1002.724 | 0.180 | n/a | 0.000 | 0.000 | 0.696 | 1000.666 | 0.011 | 0.000 | 0.071 | 0.000 | n/a | n/a | 1.101 | 0.180 | 0.000 | 1.101 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000034 | 941.854 | 3.784 | n/a | 0.347 | 0.000 | 1.688 | 935.555 | 0.011 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.387 | 4.132 | 0.004 | 0.387 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000026 | 886.936 | 5.322 | n/a | 0.000 | 0.000 | 3.145 | 878.209 | 0.012 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.108 | 5.322 | 0.006 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000018 | 827.057 | 12.974 | n/a | 0.000 | 0.000 | 1.188 | 812.493 | 0.013 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.275 | 12.974 | 0.016 | 0.275 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000033 | 643.132 | 3.156 | n/a | 0.373 | 0.000 | 0.685 | 638.778 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.093 | 3.529 | 0.005 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c6000000000000002c | 485.030 | 4.474 | n/a | 0.000 | 0.000 | 1.590 | 478.646 | 0.009 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.270 | 4.474 | 0.009 | 0.270 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000028 | 439.552 | 2.594 | n/a | 0.000 | 0.000 | 0.652 | 436.154 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.089 | 2.594 | 0.006 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000031 | 379.890 | 10.428 | n/a | 0.000 | 0.000 | 0.894 | 368.274 | 0.012 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.188 | 10.428 | 0.027 | 0.188 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000023 | 306.926 | 6.954 | n/a | 0.000 | 0.000 | 1.047 | 298.701 | 0.024 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.119 | 6.954 | 0.023 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c6000000000000003a | 282.040 | 2.888 | n/a | 0.269 | 0.000 | 1.010 | 277.687 | 0.027 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.093 | 3.157 | 0.011 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000038 | 271.515 | 3.247 | n/a | 0.502 | 0.000 | 0.995 | 266.533 | 0.028 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.085 | 3.749 | 0.014 | 0.085 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c6000000000000002e | 251.882 | 2.222 | n/a | 0.000 | 0.000 | 0.849 | 247.807 | 0.009 | 0.000 | 0.904 | 0.000 | n/a | n/a | 0.090 | 2.222 | 0.009 | 0.090 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 583.057 | n/a | n/a | n/a | 2.188 | n/a | 0.000 | 0.000 | 0.885 | 574.648 | 0.012 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.126 | 2.436 | 0.007 | 0.126 |
| p99 | 1006.716 | n/a | n/a | n/a | 11.263 | n/a | 1.582 | 0.000 | 7.286 | 1003.072 | 0.149 | 7.760 | 1.019 | 0.000 | n/a | n/a | 1.181 | 12.845 | 0.297 | 1.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c60000000000000048 | 1006.716 | 0.118 | n/a | 0.000 | 0.000 | 4.483 | 1000.955 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.098 | 0.118 | 0.000 | 1.098 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000069 | 1006.335 | 0.179 | n/a | 0.000 | 0.000 | 3.227 | 1001.617 | 0.026 | 0.000 | 0.170 | 0.000 | n/a | n/a | 1.116 | 0.179 | 0.000 | 1.116 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c6000000000000003e | 1005.492 | 0.187 | n/a | 0.000 | 0.000 | 2.047 | 1001.048 | 0.011 | 0.000 | 1.019 | 0.000 | n/a | n/a | 1.181 | 0.187 | 0.000 | 1.181 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c6000000000000004e | 1004.985 | 0.114 | n/a | 0.000 | 0.000 | 0.474 | 1003.072 | 0.036 | 0.000 | 0.182 | 0.000 | n/a | n/a | 1.108 | 0.114 | 0.000 | 1.108 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000044 | 1004.418 | 0.291 | n/a | 0.000 | 0.000 | 1.008 | 1001.739 | 0.019 | 0.000 | 0.189 | 0.000 | n/a | n/a | 1.173 | 0.291 | 0.000 | 1.173 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000003d | 1003.778 | 0.112 | n/a | 0.000 | 0.000 | 1.140 | 1001.378 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.060 | 0.112 | 0.000 | 1.060 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c6000000000000006f | 1003.758 | 0.121 | n/a | 0.000 | 0.000 | 1.507 | 1000.893 | 0.015 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.093 | 0.121 | 0.000 | 1.093 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000065 | 1003.661 | 0.152 | n/a | 0.000 | 0.000 | 0.983 | 1001.241 | 0.018 | 0.000 | 0.164 | 0.000 | n/a | n/a | 1.103 | 0.152 | 0.000 | 1.103 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000042 | 1003.425 | 0.118 | n/a | 0.000 | 0.000 | 0.793 | 1001.232 | 0.011 | 0.000 | 0.117 | 0.000 | n/a | n/a | 1.154 | 0.118 | 0.000 | 1.154 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000063 | 1003.159 | 0.148 | n/a | 0.000 | 0.000 | 0.466 | 1001.368 | 0.014 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.104 | 0.148 | 0.000 | 1.104 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000047 | 1002.766 | 0.177 | n/a | 0.000 | 0.000 | 0.766 | 1000.662 | 0.011 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.115 | 0.177 | 0.000 | 1.115 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000049 | 1002.600 | 0.145 | n/a | 0.000 | 0.000 | 0.534 | 1000.726 | 0.012 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.104 | 0.145 | 0.000 | 1.104 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000067 | 801.574 | 5.218 | n/a | 0.000 | 0.000 | 0.621 | 795.479 | 0.023 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.128 | 5.218 | 0.007 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000045 | 774.148 | 11.263 | n/a | 1.582 | 0.000 | 2.815 | 750.371 | 0.016 | 7.760 | 0.099 | 0.000 | n/a | n/a | 0.242 | 12.845 | 0.017 | 0.242 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000053 | 680.938 | 2.188 | n/a | 0.248 | 0.000 | 0.553 | 677.838 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.080 | 2.436 | 0.004 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000061 | 675.789 | 4.069 | n/a | 0.203 | 0.000 | 0.889 | 670.470 | 0.015 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.082 | 4.273 | 0.006 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000051 | 583.057 | 7.295 | n/a | 0.531 | 0.000 | 0.433 | 574.648 | 0.012 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.088 | 7.826 | 0.013 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000006a | 542.115 | 4.925 | n/a | 0.284 | 0.000 | 0.899 | 535.811 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.088 | 5.209 | 0.010 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000006c | 473.348 | 8.611 | n/a | 0.560 | 0.000 | 0.526 | 463.470 | 0.009 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.128 | 9.171 | 0.019 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c6000000000000003f | 468.233 | 3.993 | n/a | 0.620 | 0.000 | 0.763 | 462.683 | 0.011 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.087 | 4.614 | 0.010 | 0.087 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 768.881 | n/a | n/a | n/a | 2.253 | n/a | 0.000 | 0.000 | 0.971 | 766.537 | 0.012 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.088 | 2.253 | 0.005 | 0.088 |
| p99 | 1007.222 | n/a | n/a | n/a | 7.415 | n/a | 2.035 | 0.000 | 4.745 | 1005.282 | 0.107 | 13.706 | 0.139 | 0.000 | n/a | n/a | 2.264 | 7.948 | 0.217 | 2.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c60000000000000089 | 1007.222 | 0.133 | n/a | 0.000 | 0.000 | 0.456 | 1005.282 | 0.107 | 0.000 | 0.139 | 0.000 | n/a | n/a | 1.104 | 0.133 | 0.000 | 1.104 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c60000000000000094 | 1006.151 | 0.114 | n/a | 0.000 | 0.000 | 4.100 | 1000.782 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.094 | 0.114 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000086 | 1005.466 | 0.172 | n/a | 0.000 | 0.000 | 2.412 | 1001.698 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.147 | 0.172 | 0.000 | 1.147 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c6000000000000007c | 1005.342 | 0.194 | n/a | 0.000 | 0.000 | 1.772 | 1000.976 | 0.013 | 0.000 | 0.123 | 0.000 | n/a | n/a | 2.264 | 0.194 | 0.000 | 2.264 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000073 | 1004.674 | 0.200 | n/a | 0.000 | 0.000 | 1.875 | 1001.169 | 0.017 | 0.000 | 0.135 | 0.000 | n/a | n/a | 1.278 | 0.200 | 0.000 | 1.278 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c6000000000000009b | 1004.427 | 0.300 | n/a | 0.000 | 0.000 | 1.580 | 1001.250 | 0.013 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.155 | 0.300 | 0.000 | 1.155 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c60000000000000075 | 1003.684 | 0.143 | n/a | 0.000 | 0.000 | 1.171 | 1001.120 | 0.020 | 0.000 | 0.124 | 0.000 | n/a | n/a | 1.106 | 0.143 | 0.000 | 1.106 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000085 | 1003.384 | 0.151 | n/a | 0.217 | 0.000 | 0.723 | 1001.069 | 0.012 | 0.000 | 0.116 | 0.000 | n/a | n/a | 1.096 | 0.367 | 0.000 | 1.096 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c6000000000000007e | 1003.293 | 0.139 | n/a | 0.000 | 0.000 | 1.046 | 1000.927 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.121 | 0.139 | 0.000 | 1.121 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c6000000000000008a | 1003.080 | 0.106 | n/a | 0.000 | 0.000 | 0.884 | 1000.860 | 0.008 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.162 | 0.106 | 0.000 | 1.162 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000000a2 | 1002.744 | 0.117 | n/a | 0.000 | 0.000 | 0.553 | 1000.863 | 0.012 | 0.000 | 0.095 | 0.000 | n/a | n/a | 1.103 | 0.117 | 0.000 | 1.103 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000091 | 1002.641 | 0.125 | n/a | 0.000 | 0.000 | 0.638 | 1000.717 | 0.009 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.098 | 0.125 | 0.000 | 1.098 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c6000000000000008d | 921.940 | 5.897 | n/a | 2.035 | 0.000 | 1.705 | 898.468 | 0.007 | 13.706 | 0.038 | 0.000 | n/a | n/a | 0.082 | 7.933 | 0.009 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000095 | 881.908 | 7.415 | n/a | 0.533 | 0.000 | 0.674 | 873.118 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.105 | 7.948 | 0.009 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000071 | 846.515 | 2.431 | n/a | 0.322 | 0.000 | 0.538 | 843.089 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.073 | 2.753 | 0.003 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000099 | 768.881 | 1.532 | n/a | 0.000 | 0.000 | 0.663 | 766.537 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.070 | 1.532 | 0.002 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000097 | 699.298 | 5.431 | n/a | 0.000 | 0.000 | 0.971 | 692.644 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.159 | 5.431 | 0.008 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000008b | 582.850 | 2.284 | n/a | 0.000 | 0.000 | 0.555 | 579.865 | 0.011 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.081 | 2.284 | 0.004 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c6000000000000009c | 577.834 | 3.875 | n/a | 0.000 | 0.000 | 0.912 | 572.815 | 0.020 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.081 | 3.875 | 0.007 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000077 | 503.794 | 4.350 | n/a | 1.558 | 0.000 | 0.547 | 497.133 | 0.020 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.088 | 5.908 | 0.012 | 0.088 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 803.293 | n/a | n/a | n/a | 1.962 | n/a | 0.000 | 0.000 | 0.686 | 799.465 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.090 | 1.962 | 0.004 | 0.090 |
| p99 | 1005.700 | n/a | n/a | n/a | 10.081 | n/a | 0.646 | 0.000 | 7.349 | 1003.963 | 0.360 | 14.101 | 0.094 | 0.000 | n/a | n/a | 1.173 | 10.409 | 0.258 | 1.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c600000000000000cb | 1005.700 | 0.115 | n/a | 0.000 | 0.000 | 0.480 | 1003.963 | 0.009 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.097 | 0.115 | 0.000 | 1.097 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c600000000000000ab | 1003.563 | 0.135 | n/a | 0.000 | 0.000 | 0.587 | 1001.661 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.100 | 0.135 | 0.000 | 1.100 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000c0 | 1003.512 | 0.104 | n/a | 0.000 | 0.000 | 1.032 | 1001.109 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.173 | 0.104 | 0.000 | 1.173 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c600000000000000d5 | 1003.317 | 0.180 | n/a | 0.000 | 0.000 | 0.686 | 1001.297 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.112 | 0.180 | 0.000 | 1.112 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000d4 | 1003.305 | 0.168 | n/a | 0.000 | 0.000 | 1.308 | 1000.658 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.124 | 0.168 | 0.000 | 1.124 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c600000000000000d3 | 1003.200 | 0.155 | n/a | 0.000 | 0.000 | 0.754 | 1001.080 | 0.008 | 0.000 | 0.094 | 0.000 | n/a | n/a | 1.108 | 0.155 | 0.000 | 1.108 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c600000000000000ce | 1003.091 | 0.141 | n/a | 0.000 | 0.000 | 0.926 | 1000.875 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.103 | 0.141 | 0.000 | 1.103 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c600000000000000ac | 1002.962 | 0.133 | n/a | 0.000 | 0.000 | 0.842 | 1000.807 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.113 | 0.133 | 0.000 | 1.113 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c600000000000000c6 | 1002.792 | 0.125 | n/a | 0.000 | 0.000 | 0.741 | 1000.780 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.098 | 0.125 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000000c1 | 1002.681 | 0.146 | n/a | 0.000 | 0.000 | 0.758 | 1000.630 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.109 | 0.146 | 0.000 | 1.109 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000000d8 | 1002.610 | 0.162 | n/a | 0.000 | 0.000 | 0.636 | 1000.652 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.118 | 0.162 | 0.000 | 1.118 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000000b9 | 1002.195 | 0.117 | n/a | 0.000 | 0.000 | 0.383 | 1000.567 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.103 | 0.117 | 0.000 | 1.103 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000000a6 | 883.100 | 1.777 | n/a | 0.000 | 0.000 | 0.588 | 880.559 | 0.012 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.090 | 1.777 | 0.002 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000000cf | 861.890 | 3.200 | n/a | 0.000 | 0.000 | 0.573 | 857.914 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.141 | 3.200 | 0.004 | 0.141 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000000b1 | 857.555 | 2.559 | n/a | 0.000 | 0.000 | 0.535 | 854.327 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.060 | 2.559 | 0.003 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c600000000000000ba | 842.883 | 10.081 | n/a | 0.329 | 0.000 | 0.720 | 831.646 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.090 | 10.409 | 0.012 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000c8 | 803.293 | 1.962 | n/a | 0.000 | 0.000 | 1.735 | 799.465 | 0.010 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.063 | 1.962 | 0.002 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000c4 | 621.941 | 1.875 | n/a | 0.000 | 0.000 | 0.337 | 619.632 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.063 | 1.875 | 0.003 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c600000000000000bb | 516.374 | 3.713 | n/a | 0.000 | 0.000 | 1.487 | 511.006 | 0.006 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.079 | 3.713 | 0.007 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c600000000000000c7 | 363.542 | 2.311 | n/a | 0.000 | 0.000 | 0.468 | 360.660 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.311 | 0.006 | 0.063 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 494.416 | n/a | n/a | n/a | 3.612 | n/a | 0.283 | 0.000 | 0.658 | 489.926 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.100 | 3.836 | 0.008 | 0.100 |
| p99 | 1008.816 | n/a | n/a | n/a | 9.043 | n/a | 0.840 | 0.000 | 6.645 | 1006.632 | 1.075 | 11.237 | 0.079 | 0.000 | n/a | n/a | 1.147 | 9.669 | 0.248 | 1.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c600000000000000ef | 1008.816 | 0.120 | n/a | 0.000 | 0.000 | 6.645 | 1000.887 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.102 | 0.120 | 0.000 | 1.102 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c600000000000000e5 | 1008.492 | 0.104 | n/a | 0.000 | 0.000 | 0.621 | 1006.632 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.095 | 0.104 | 0.000 | 1.095 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c600000000000000fd | 1005.094 | 0.145 | n/a | 0.000 | 0.000 | 2.344 | 1001.389 | 0.011 | 0.000 | 0.076 | 0.000 | n/a | n/a | 1.129 | 0.145 | 0.000 | 1.129 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000116 | 1003.261 | 0.100 | n/a | 0.000 | 0.000 | 1.543 | 1000.492 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 1.100 | 0.100 | 0.000 | 1.100 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c600000000000000ed | 1003.158 | 0.192 | n/a | 0.000 | 0.000 | 0.806 | 1000.948 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.147 | 0.192 | 0.000 | 1.147 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000000f0 | 1002.896 | 0.143 | n/a | 0.000 | 0.000 | 0.718 | 1000.880 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.109 | 0.143 | 0.000 | 1.109 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000107 | 1002.894 | 0.211 | n/a | 0.000 | 0.000 | 0.779 | 1000.713 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.146 | 0.211 | 0.000 | 1.146 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000108 | 1002.317 | 0.130 | n/a | 0.000 | 0.000 | 0.697 | 1000.364 | 0.003 | 0.000 | 0.011 | 0.000 | n/a | n/a | 1.112 | 0.130 | 0.000 | 1.112 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000109 | 1002.273 | 0.139 | n/a | 0.000 | 0.000 | 0.440 | 1000.551 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 1.108 | 0.139 | 0.000 | 1.108 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000f7 | 869.814 | 4.322 | n/a | 0.448 | 0.000 | 0.809 | 864.107 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.073 | 4.771 | 0.005 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c600000000000000d9 | 793.873 | 7.061 | n/a | 0.608 | 0.000 | 0.781 | 785.203 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.185 | 7.668 | 0.010 | 0.185 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c600000000000000ea | 743.552 | 4.226 | n/a | 0.515 | 0.000 | 0.537 | 738.159 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.074 | 4.741 | 0.006 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000e8 | 725.939 | 3.899 | n/a | 0.493 | 0.000 | 0.572 | 720.863 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.075 | 4.393 | 0.006 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000111 | 719.726 | 3.516 | n/a | 0.313 | 0.000 | 0.469 | 715.322 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.075 | 3.829 | 0.005 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000100 | 619.186 | 4.492 | n/a | 0.242 | 0.000 | 0.529 | 613.788 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.099 | 4.734 | 0.008 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c600000000000000e6 | 612.167 | 3.805 | n/a | 0.384 | 0.000 | 0.578 | 607.258 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.100 | 4.189 | 0.007 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000000e0 | 582.021 | 2.212 | n/a | 0.277 | 0.000 | 0.656 | 578.727 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.063 | 2.489 | 0.004 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000113 | 557.134 | 2.136 | n/a | 0.000 | 0.000 | 0.420 | 554.485 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.056 | 2.136 | 0.004 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000000f1 | 494.416 | 3.612 | n/a | 0.309 | 0.000 | 0.406 | 489.926 | 0.009 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.079 | 3.921 | 0.008 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c600000000000000ec | 439.083 | 2.159 | n/a | 0.283 | 0.000 | 2.196 | 434.328 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.074 | 2.442 | 0.006 | 0.074 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 608.699 | n/a | n/a | n/a | 2.237 | n/a | 0.000 | 0.000 | 0.584 | 600.504 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.113 | 2.237 | 0.005 | 0.113 |
| p99 | 1003.636 | n/a | n/a | n/a | 8.274 | n/a | 2.148 | 0.000 | 5.995 | 1001.166 | 0.014 | 8.041 | 0.091 | 0.000 | n/a | n/a | 1.144 | 8.882 | 0.112 | 1.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c6000000000000014f | 1003.636 | 0.130 | n/a | 0.000 | 0.000 | 1.142 | 1001.166 | 0.005 | 0.000 | 0.091 | 0.000 | n/a | n/a | 1.102 | 0.130 | 0.000 | 1.102 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c6000000000000012c | 1003.628 | 0.194 | n/a | 0.000 | 0.000 | 0.670 | 993.549 | 0.008 | 8.041 | 0.051 | 0.000 | n/a | n/a | 1.116 | 0.194 | 0.000 | 1.116 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c6000000000000014c | 1002.865 | 0.208 | n/a | 0.000 | 0.000 | 0.680 | 1000.787 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.144 | 0.208 | 0.000 | 1.144 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c6000000000000014e | 1002.624 | 0.259 | n/a | 0.000 | 0.000 | 0.839 | 1000.365 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.137 | 0.259 | 0.000 | 1.137 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c6000000000000013f | 1002.593 | 0.137 | n/a | 0.000 | 0.000 | 0.909 | 1000.411 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.111 | 0.137 | 0.000 | 1.111 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000134 | 1002.501 | 0.198 | n/a | 0.000 | 0.000 | 0.584 | 1000.556 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.125 | 0.198 | 0.000 | 1.125 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c60000000000000148 | 1002.463 | 0.117 | n/a | 0.000 | 0.000 | 0.517 | 1000.671 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.101 | 0.117 | 0.000 | 1.101 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000139 | 1002.449 | 0.173 | n/a | 0.000 | 0.000 | 0.590 | 1000.509 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.132 | 0.173 | 0.000 | 1.132 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c6000000000000011c | 1002.421 | 0.135 | n/a | 0.000 | 0.000 | 0.597 | 1000.548 | 0.006 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.116 | 0.135 | 0.000 | 1.116 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000128 | 1002.372 | 0.145 | n/a | 0.000 | 0.000 | 0.590 | 1000.485 | 0.014 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.103 | 0.145 | 0.000 | 1.103 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000014a | 1002.045 | 0.108 | n/a | 0.000 | 0.000 | 0.455 | 1000.368 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 1.099 | 0.108 | 0.000 | 1.099 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c6000000000000013a | 965.814 | 2.672 | n/a | 0.000 | 0.000 | 0.740 | 962.223 | 0.005 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.089 | 2.672 | 0.003 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c6000000000000013b | 937.488 | 4.925 | n/a | 0.000 | 0.000 | 0.730 | 931.674 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.113 | 4.925 | 0.005 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000129 | 918.470 | 2.431 | n/a | 0.000 | 0.000 | 0.500 | 915.426 | 0.014 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.069 | 2.431 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000000132 | 842.608 | 7.351 | n/a | 0.276 | 0.000 | 0.667 | 834.186 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.068 | 7.627 | 0.009 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000130 | 623.347 | 2.604 | n/a | 0.370 | 0.000 | 0.567 | 619.700 | 0.003 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.074 | 2.974 | 0.005 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c60000000000000124 | 608.699 | 2.404 | n/a | 0.000 | 0.000 | 5.995 | 600.165 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.058 | 2.404 | 0.004 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000011b | 603.732 | 1.921 | n/a | 0.000 | 0.000 | 1.196 | 600.504 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.074 | 1.921 | 0.003 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c6000000000000014b | 526.158 | 8.274 | n/a | 0.608 | 0.000 | 2.077 | 515.054 | 0.008 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.111 | 8.882 | 0.017 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000121 | 478.225 | 4.122 | n/a | 0.000 | 0.000 | 0.512 | 473.481 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.073 | 4.122 | 0.009 | 0.073 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (736 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.874 | n/a | n/a | n/a | 3.178 | n/a | 0.000 | 0.000 | 0.551 | 9.285 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.081 | 3.190 | 0.260 | 0.081 |
| p99 | 152.775 | n/a | n/a | n/a | 12.503 | n/a | 0.706 | 0.000 | 4.553 | 144.708 | 0.019 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.713 | 13.462 | 0.812 | 0.713 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c60000000000000157 | 1004.288 | 0.147 | n/a | 0.000 | 0.000 | 1.197 | 1001.693 | 0.014 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.113 | 0.147 | 0.000 | 1.113 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000000159 | 1002.363 | 0.153 | n/a | 0.000 | 0.000 | 0.755 | 1000.329 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 1.109 | 0.153 | 0.000 | 1.109 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c60000000000000151 | 839.943 | 2.599 | n/a | 0.948 | 0.000 | 0.523 | 835.677 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.136 | 3.547 | 0.004 | 0.136 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000150 | 839.758 | 3.038 | n/a | 0.000 | 0.000 | 0.678 | 835.917 | 0.008 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.079 | 3.038 | 0.004 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000155 | 781.980 | 2.249 | n/a | 0.339 | 0.000 | 0.697 | 778.582 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.075 | 2.588 | 0.003 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000153 | 251.371 | 2.831 | n/a | 0.000 | 0.000 | 1.345 | 247.024 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.133 | 2.831 | 0.011 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c6000000000000015a | 157.763 | 2.407 | n/a | 0.000 | 0.000 | 0.489 | 154.755 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.079 | 2.407 | 0.015 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c6000000000000059a | 152.775 | 7.349 | n/a | 0.000 | 0.000 | 0.551 | 144.708 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.155 | 7.349 | 0.048 | 0.155 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000229 | 118.514 | 14.763 | n/a | 0.398 | 0.000 | 3.885 | 99.149 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.299 | 15.161 | 0.128 | 0.299 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c60000000000000243 | 110.928 | 5.256 | n/a | 0.000 | 0.000 | 1.245 | 104.168 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.221 | 5.256 | 0.047 | 0.221 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000595 | 91.451 | 6.923 | n/a | 0.462 | 0.000 | 0.461 | 83.454 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.109 | 7.385 | 0.081 | 0.109 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000000684 | 90.875 | 2.701 | n/a | 0.000 | 0.000 | 0.329 | 87.753 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.080 | 2.701 | 0.030 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000000517 | 86.672 | 3.488 | n/a | 0.000 | 0.000 | 0.410 | 82.665 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.076 | 3.488 | 0.040 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c6000000000000039e | 85.332 | 3.452 | n/a | 0.000 | 0.000 | 0.483 | 81.288 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.070 | 3.452 | 0.040 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000006c8 | 84.934 | 2.826 | n/a | 0.000 | 0.000 | 1.553 | 80.417 | 0.021 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.104 | 2.826 | 0.033 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c60000000000000420 | 83.241 | 4.821 | n/a | 0.000 | 0.000 | 0.776 | 77.375 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.220 | 4.821 | 0.058 | 0.220 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c600000000000006a1 | 80.219 | 11.366 | n/a | 0.539 | 0.000 | 0.655 | 67.475 | 0.003 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.157 | 11.906 | 0.148 | 0.157 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c6000000000000074a | 78.907 | 7.745 | n/a | 0.000 | 0.000 | 0.984 | 69.991 | 0.002 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.173 | 7.745 | 0.098 | 0.173 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c600000000000006b5 | 78.854 | 7.510 | n/a | 0.000 | 0.000 | 0.947 | 70.233 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.136 | 7.510 | 0.095 | 0.136 | gw-r/thread-52/journal/page | none observed |
| 77edc823a15682c60000000000000691 | 77.835 | 3.124 | n/a | 0.000 | 0.000 | 0.302 | 74.293 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.074 | 3.124 | 0.040 | 0.074 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / internal (2227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.029 | n/a | n/a | n/a | 4.544 | n/a | 0.000 | 0.000 | 0.466 | 7.116 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.127 | 4.573 | 0.377 | 0.127 |
| p99 | 345.430 | n/a | n/a | n/a | 19.178 | n/a | 1.610 | 0.000 | 4.291 | 342.101 | 0.015 | 10.686 | 0.043 | 0.000 | n/a | n/a | 1.574 | 20.359 | 0.860 | 1.574 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77edc823a15682c600000000000019bc | 1002.663 | 0.125 | n/a | 0.000 | 0.000 | 0.611 | 1000.770 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.105 | 0.125 | 0.000 | 1.105 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000019ba | 1002.621 | 0.248 | n/a | 0.000 | 0.000 | 0.899 | 1000.311 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 1.147 | 0.248 | 0.000 | 1.147 | gw-r/thread-64/journal/page | none observed |
| 77edc823a15682c6000000000000199d | 1002.405 | 0.114 | n/a | 0.000 | 0.000 | 0.296 | 1000.813 | 0.029 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.098 | 0.114 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c6000000000000197e | 1002.308 | 0.162 | n/a | 0.000 | 0.000 | 0.444 | 1000.523 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.132 | 0.162 | 0.000 | 1.132 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000001988 | 1002.256 | 0.102 | n/a | 0.000 | 0.000 | 0.330 | 1000.685 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.083 | 0.102 | 0.000 | 1.083 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000001982 | 1002.010 | 0.107 | n/a | 0.000 | 0.000 | 0.325 | 1000.449 | 0.003 | 0.000 | 0.029 | 0.000 | n/a | n/a | 1.097 | 0.107 | 0.000 | 1.097 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c600000000000019a0 | 1001.931 | 0.120 | n/a | 0.000 | 0.000 | 0.318 | 990.945 | 0.003 | 9.442 | 0.017 | 0.000 | n/a | n/a | 1.085 | 0.120 | 0.000 | 1.085 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c60000000000001980 | 1001.916 | 0.105 | n/a | 0.000 | 0.000 | 0.421 | 1000.278 | 0.002 | 0.000 | 0.008 | 0.000 | n/a | n/a | 1.102 | 0.105 | 0.000 | 1.102 | gw-r/thread-51/journal/page | none observed |
| 77edc823a15682c600000000000019c1 | 1001.862 | 0.107 | n/a | 0.000 | 0.000 | 0.293 | 1000.345 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.094 | 0.107 | 0.000 | 1.094 | gw-r/thread-64/journal/page | none observed |
| 77edc823a15682c600000000000019b5 | 1001.831 | 0.092 | n/a | 0.000 | 0.000 | 0.282 | 1000.329 | 0.003 | 0.000 | 0.019 | 0.000 | n/a | n/a | 1.107 | 0.092 | 0.000 | 1.107 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c60000000000001990 | 979.742 | 9.100 | n/a | 0.883 | 0.000 | 0.650 | 968.584 | 0.008 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.412 | 9.983 | 0.010 | 0.412 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000019ac | 917.746 | 2.228 | n/a | 0.000 | 0.000 | 0.286 | 915.155 | 0.003 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.054 | 2.228 | 0.002 | 0.054 | gw-r/thread-50/journal/page | none observed |
| 77edc823a15682c60000000000001981 | 809.813 | 9.270 | n/a | 0.805 | 0.000 | 0.325 | 798.974 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.416 | 10.075 | 0.012 | 0.416 | gw-r/thread-49/journal/page | none observed |
| 77edc823a15682c600000000000019bb | 726.657 | 4.527 | n/a | 0.000 | 0.000 | 0.602 | 721.340 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.165 | 4.527 | 0.006 | 0.165 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c6000000000000199b | 706.425 | 3.553 | n/a | 0.000 | 0.000 | 0.558 | 702.156 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.130 | 3.553 | 0.005 | 0.130 | gw-r/thread-64/journal/page | none observed |
| 77edc823a15682c60000000000001997 | 686.578 | 9.126 | n/a | 0.000 | 0.000 | 0.405 | 655.908 | 0.006 | 20.762 | 0.026 | 0.000 | n/a | n/a | 0.345 | 9.126 | 0.013 | 0.345 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000019b1 | 629.644 | 3.829 | n/a | 0.000 | 0.000 | 0.433 | 625.248 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.086 | 3.829 | 0.006 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 77edc823a15682c60000000000001989 | 618.964 | 3.211 | n/a | 0.000 | 0.000 | 0.401 | 615.188 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.100 | 3.211 | 0.005 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 77edc823a15682c600000000000019b8 | 455.693 | 2.261 | n/a | 0.000 | 0.000 | 0.577 | 452.762 | 0.007 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.061 | 2.261 | 0.005 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 77edc823a15682c600000000000019be | 452.144 | 3.140 | n/a | 0.000 | 0.000 | 0.725 | 448.122 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.112 | 3.140 | 0.007 | 0.112 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.938 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 1.053 | 201.313 | 0.013 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 |
| p99 | 208.933 | n/a | n/a | n/a | 0.203 | n/a | 0.000 | 0.000 | 6.388 | 204.646 | 1.678 | 0.000 | 0.454 | 0.000 | n/a | n/a | 0.381 | 0.203 | 0.002 | 0.381 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af08840000000000000016 | 208.933 | 0.039 | n/a | 0.000 | 0.000 | 6.388 | 202.210 | 0.020 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000001a | 207.425 | 0.030 | n/a | 0.000 | 0.000 | 5.097 | 202.090 | 0.011 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.076 | 0.030 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000023 | 207.076 | 0.041 | n/a | 0.000 | 0.000 | 1.473 | 204.646 | 0.574 | 0.000 | 0.243 | 0.000 | n/a | n/a | 0.098 | 0.041 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000014 | 206.802 | 0.203 | n/a | 0.000 | 0.000 | 5.010 | 201.361 | 0.017 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.115 | 0.203 | 0.001 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000000d | 206.196 | 0.037 | n/a | 0.000 | 0.000 | 1.326 | 204.571 | 0.014 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.100 | 0.037 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000001e | 206.190 | 0.035 | n/a | 0.000 | 0.000 | 4.815 | 201.098 | 0.017 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000030 | 206.110 | 0.032 | n/a | 0.000 | 0.000 | 1.053 | 204.521 | 0.283 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.086 | 0.032 | 0.000 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000000c | 205.626 | 0.036 | n/a | 0.000 | 0.000 | 0.853 | 204.475 | 0.015 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000018 | 205.580 | 0.049 | n/a | 0.000 | 0.000 | 4.171 | 201.071 | 0.013 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.104 | 0.049 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af0884000000000000004a | 205.449 | 0.028 | n/a | 0.000 | 0.000 | 0.587 | 204.541 | 0.025 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.073 | 0.028 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000002a | 205.024 | 0.028 | n/a | 0.000 | 0.000 | 0.565 | 204.039 | 0.049 | 0.000 | 0.270 | 0.000 | n/a | n/a | 0.073 | 0.028 | 0.000 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000000f | 204.535 | 0.042 | n/a | 0.000 | 0.000 | 2.503 | 201.360 | 0.041 | 0.000 | 0.454 | 0.000 | n/a | n/a | 0.134 | 0.042 | 0.000 | 0.134 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000034 | 204.414 | 0.035 | n/a | 0.000 | 0.000 | 0.936 | 203.172 | 0.018 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.086 | 0.035 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000025 | 204.402 | 0.031 | n/a | 0.000 | 0.000 | 0.824 | 203.094 | 0.039 | 0.000 | 0.340 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000033 | 204.371 | 0.047 | n/a | 0.000 | 0.000 | 0.963 | 203.100 | 0.012 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.107 | 0.047 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000003a | 204.146 | 0.042 | n/a | 0.000 | 0.000 | 1.815 | 201.972 | 0.012 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.129 | 0.042 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000053 | 204.088 | 0.046 | n/a | 0.000 | 0.000 | 1.395 | 202.346 | 0.013 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.114 | 0.046 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000011 | 203.941 | 0.060 | n/a | 0.000 | 0.000 | 2.057 | 201.394 | 0.024 | 0.000 | 0.261 | 0.000 | n/a | n/a | 0.145 | 0.060 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000041 | 203.855 | 0.029 | n/a | 0.000 | 0.000 | 2.353 | 201.309 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.074 | 0.029 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af0884000000000000003b | 203.798 | 0.031 | n/a | 0.000 | 0.000 | 2.765 | 200.811 | 0.012 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / read (84 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.389 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.880 | 201.146 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.085 | 0.039 | 0.000 | 0.085 |
| p99 | 212.004 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 5.589 | 210.842 | 24.566 | 0.000 | 2.436 | 0.000 | n/a | n/a | 0.224 | 0.085 | 0.001 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af08840000000000000069 | 212.004 | 0.039 | n/a | 0.000 | 0.000 | 0.927 | 210.842 | 0.026 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af0884000000000000007f | 206.979 | 0.028 | n/a | 0.000 | 0.000 | 5.589 | 201.109 | 0.023 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.061 | 0.028 | 0.000 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000085 | 206.772 | 0.035 | n/a | 0.000 | 0.000 | 0.981 | 205.490 | 0.031 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.066 | 0.035 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000079 | 206.530 | 0.069 | n/a | 0.000 | 0.000 | 1.780 | 204.307 | 0.017 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.201 | 0.069 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000064 | 206.187 | 0.037 | n/a | 0.000 | 0.000 | 0.896 | 205.008 | 0.018 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.084 | 0.037 | 0.000 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000000b0 | 206.099 | 0.026 | n/a | 0.000 | 0.000 | 0.558 | 205.276 | 0.023 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.059 | 0.026 | 0.000 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000090 | 205.222 | 0.026 | n/a | 0.000 | 0.000 | 3.738 | 201.246 | 0.012 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.063 | 0.026 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000009d | 205.074 | 0.040 | n/a | 0.000 | 0.000 | 3.519 | 201.239 | 0.014 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.094 | 0.040 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000084 | 204.858 | 0.038 | n/a | 0.000 | 0.000 | 3.596 | 201.043 | 0.014 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.090 | 0.038 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af0884000000000000007b | 204.513 | 0.047 | n/a | 0.000 | 0.000 | 1.931 | 202.231 | 0.018 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.142 | 0.047 | 0.000 | 0.142 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000072 | 203.861 | 0.041 | n/a | 0.000 | 0.000 | 1.331 | 202.229 | 0.014 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.096 | 0.041 | 0.000 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000082 | 203.812 | 0.039 | n/a | 0.000 | 0.000 | 0.989 | 202.641 | 0.014 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.082 | 0.039 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000008c | 203.750 | 0.039 | n/a | 0.000 | 0.000 | 1.111 | 202.192 | 0.039 | 0.000 | 0.276 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af088400000000000000a7 | 203.701 | 0.064 | n/a | 0.000 | 0.000 | 1.772 | 201.547 | 0.016 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.212 | 0.064 | 0.000 | 0.212 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000074 | 203.617 | 0.074 | n/a | 0.000 | 0.000 | 1.335 | 201.695 | 0.033 | 0.000 | 0.276 | 0.000 | n/a | n/a | 0.204 | 0.074 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af088400000000000000a9 | 203.594 | 0.038 | n/a | 0.000 | 0.000 | 1.138 | 202.120 | 0.016 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.090 | 0.038 | 0.000 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af0884000000000000005d | 203.531 | 0.041 | n/a | 0.000 | 0.000 | 0.820 | 202.418 | 0.017 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af088400000000000000a0 | 203.366 | 0.059 | n/a | 0.000 | 0.000 | 1.848 | 201.224 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.142 | 0.059 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af088400000000000000a6 | 203.361 | 0.031 | n/a | 0.000 | 0.000 | 1.465 | 201.609 | 0.024 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000006c | 203.192 | 0.032 | n/a | 0.000 | 0.000 | 1.049 | 201.873 | 0.013 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (83 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.211 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.796 | 201.017 | 0.013 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 |
| p99 | 213.148 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 4.350 | 208.416 | 11.900 | 0.000 | 3.184 | 0.000 | n/a | n/a | 0.198 | 0.097 | 0.001 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af088400000000000000d6 | 213.148 | 0.097 | n/a | 0.000 | 0.000 | 0.787 | 203.924 | 8.168 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.108 | 0.097 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af088400000000000000c9 | 209.209 | 0.037 | n/a | 0.000 | 0.000 | 0.476 | 208.416 | 0.026 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.094 | 0.037 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000111 | 207.919 | 0.032 | n/a | 0.000 | 0.000 | 2.435 | 205.157 | 0.017 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af088400000000000000da | 206.975 | 0.031 | n/a | 0.000 | 0.000 | 1.033 | 205.497 | 0.078 | 0.000 | 0.258 | 0.000 | n/a | n/a | 0.078 | 0.031 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000000fb | 205.977 | 0.042 | n/a | 0.000 | 0.000 | 4.350 | 201.267 | 0.017 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.111 | 0.042 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af088400000000000000d5 | 205.550 | 0.033 | n/a | 0.000 | 0.000 | 4.309 | 201.031 | 0.012 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000112 | 205.091 | 0.028 | n/a | 0.000 | 0.000 | 3.875 | 200.999 | 0.011 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.060 | 0.028 | 0.000 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af088400000000000000e5 | 204.896 | 0.044 | n/a | 0.000 | 0.000 | 3.876 | 200.825 | 0.012 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.097 | 0.044 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af088400000000000000bb | 204.889 | 0.038 | n/a | 0.000 | 0.000 | 0.816 | 203.852 | 0.010 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af088400000000000000b6 | 204.603 | 0.041 | n/a | 0.000 | 0.000 | 0.850 | 201.212 | 2.266 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.099 | 0.041 | 0.000 | 0.099 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af088400000000000000b7 | 204.404 | 0.042 | n/a | 0.000 | 0.000 | 1.916 | 202.262 | 0.041 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.069 | 0.042 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af088400000000000000bd | 204.276 | 0.030 | n/a | 0.000 | 0.000 | 2.172 | 201.899 | 0.010 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.074 | 0.030 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000000ee | 204.270 | 0.041 | n/a | 0.000 | 0.000 | 0.600 | 203.427 | 0.014 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.081 | 0.041 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000000ec | 203.836 | 0.028 | n/a | 0.000 | 0.000 | 2.425 | 201.148 | 0.012 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.066 | 0.028 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af088400000000000000fc | 203.707 | 0.041 | n/a | 0.000 | 0.000 | 1.837 | 201.560 | 0.012 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.088 | 0.041 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af0884000000000000010a | 203.617 | 0.034 | n/a | 0.000 | 0.000 | 2.539 | 200.857 | 0.010 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af088400000000000000cb | 203.567 | 0.052 | n/a | 0.000 | 0.000 | 0.962 | 202.298 | 0.012 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.133 | 0.052 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000000e8 | 203.517 | 0.028 | n/a | 0.000 | 0.000 | 0.869 | 202.299 | 0.020 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.071 | 0.028 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000000cd | 203.219 | 0.044 | n/a | 0.000 | 0.000 | 1.302 | 201.649 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af088400000000000000d2 | 203.209 | 0.031 | n/a | 0.000 | 0.000 | 0.772 | 202.197 | 0.012 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.569 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.637 | 200.752 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 |
| p99 | 225.534 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 4.688 | 205.305 | 23.989 | 0.000 | 0.340 | 0.000 | n/a | n/a | 0.185 | 0.083 | 0.001 | 0.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af08840000000000000125 | 225.534 | 0.054 | n/a | 0.000 | 0.000 | 0.821 | 200.535 | 23.989 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.077 | 0.054 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000142 | 208.597 | 0.026 | n/a | 0.000 | 0.000 | 4.117 | 204.310 | 0.025 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.061 | 0.026 | 0.000 | 0.061 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000118 | 206.398 | 0.069 | n/a | 0.000 | 0.000 | 4.688 | 200.895 | 0.468 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.163 | 0.069 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af0884000000000000011e | 206.289 | 0.039 | n/a | 0.000 | 0.000 | 0.704 | 205.305 | 0.016 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.080 | 0.039 | 0.000 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af0884000000000000011a | 205.850 | 0.058 | n/a | 0.000 | 0.000 | 3.895 | 201.770 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.084 | 0.058 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000128 | 204.848 | 0.028 | n/a | 0.000 | 0.000 | 3.260 | 201.336 | 0.016 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.068 | 0.028 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000139 | 204.582 | 0.038 | n/a | 0.000 | 0.000 | 3.544 | 200.850 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.082 | 0.038 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af0884000000000000013f | 204.288 | 0.035 | n/a | 0.000 | 0.000 | 0.907 | 203.133 | 0.014 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.080 | 0.035 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000113 | 203.730 | 0.041 | n/a | 0.000 | 0.000 | 0.707 | 202.788 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000169 | 203.609 | 0.031 | n/a | 0.000 | 0.000 | 0.535 | 202.889 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.083 | 0.031 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000013e | 203.290 | 0.032 | n/a | 0.000 | 0.000 | 1.902 | 201.239 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000119 | 203.063 | 0.063 | n/a | 0.000 | 0.000 | 1.507 | 201.252 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.158 | 0.063 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000012a | 202.859 | 0.033 | n/a | 0.000 | 0.000 | 0.759 | 201.809 | 0.020 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af0884000000000000016b | 202.795 | 0.036 | n/a | 0.000 | 0.000 | 0.466 | 202.087 | 0.014 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af0884000000000000014b | 202.552 | 0.043 | n/a | 0.000 | 0.000 | 1.687 | 200.679 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.091 | 0.043 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000115 | 202.254 | 0.035 | n/a | 0.000 | 0.000 | 0.607 | 201.385 | 0.021 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000146 | 202.181 | 0.044 | n/a | 0.000 | 0.000 | 0.556 | 201.393 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.115 | 0.044 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000162 | 202.175 | 0.027 | n/a | 0.000 | 0.000 | 0.680 | 201.271 | 0.051 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.056 | 0.027 | 0.000 | 0.056 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000168 | 202.119 | 0.051 | n/a | 0.000 | 0.000 | 0.844 | 201.054 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.122 | 0.051 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000120 | 202.096 | 0.046 | n/a | 0.000 | 0.000 | 0.826 | 200.981 | 0.052 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.106 | 0.046 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.598 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.645 | 200.697 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.071 | 0.039 | 0.000 | 0.071 |
| p99 | 206.468 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 0.000 | 4.090 | 203.920 | 4.369 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.177 | 0.087 | 0.001 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af0884000000000000017e | 208.979 | 0.040 | n/a | 0.000 | 0.000 | 8.203 | 200.615 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.066 | 0.040 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af088400000000000001ae | 206.468 | 0.042 | n/a | 0.000 | 0.000 | 1.321 | 204.889 | 0.011 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.091 | 0.042 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000018c | 206.196 | 0.062 | n/a | 0.000 | 0.000 | 4.090 | 201.757 | 0.014 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.136 | 0.062 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000194 | 204.742 | 0.031 | n/a | 0.000 | 0.000 | 0.666 | 203.920 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000197 | 203.978 | 0.030 | n/a | 0.000 | 0.000 | 0.604 | 202.901 | 0.096 | 0.000 | 0.288 | 0.000 | n/a | n/a | 0.059 | 0.030 | 0.000 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af0884000000000000019a | 203.677 | 0.025 | n/a | 0.000 | 0.000 | 2.176 | 201.351 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.060 | 0.025 | 0.000 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af0884000000000000018e | 203.452 | 0.032 | n/a | 0.000 | 0.000 | 2.332 | 200.938 | 0.007 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af088400000000000001cb | 202.995 | 0.065 | n/a | 0.000 | 0.000 | 1.644 | 201.096 | 0.009 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.093 | 0.065 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000188 | 202.988 | 0.044 | n/a | 0.000 | 0.000 | 1.057 | 201.641 | 0.011 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.081 | 0.044 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af088400000000000001d5 | 202.812 | 0.040 | n/a | 0.000 | 0.000 | 0.712 | 201.795 | 0.014 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000191 | 202.494 | 0.049 | n/a | 0.000 | 0.000 | 1.189 | 201.015 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.160 | 0.049 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af088400000000000001ba | 202.351 | 0.084 | n/a | 0.000 | 0.000 | 1.383 | 200.643 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.205 | 0.084 | 0.000 | 0.205 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000001b9 | 202.325 | 0.033 | n/a | 0.000 | 0.000 | 0.801 | 201.314 | 0.010 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000170 | 202.299 | 0.087 | n/a | 0.000 | 0.000 | 1.053 | 200.890 | 0.008 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.177 | 0.087 | 0.000 | 0.177 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000198 | 202.291 | 0.031 | n/a | 0.000 | 0.000 | 0.717 | 201.351 | 0.011 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000019f | 202.263 | 0.038 | n/a | 0.000 | 0.000 | 0.377 | 201.604 | 0.015 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.107 | 0.038 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af088400000000000001bb | 202.250 | 0.067 | n/a | 0.000 | 0.000 | 1.040 | 200.949 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.124 | 0.067 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000182 | 202.214 | 0.032 | n/a | 0.000 | 0.000 | 0.772 | 201.237 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af0884000000000000019b | 202.164 | 0.040 | n/a | 0.000 | 0.000 | 0.416 | 201.492 | 0.014 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000193 | 202.139 | 0.031 | n/a | 0.000 | 0.000 | 0.919 | 201.043 | 0.006 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / read (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.507 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.615 | 200.712 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 |
| p99 | 205.463 | n/a | n/a | n/a | 0.106 | n/a | 0.000 | 0.000 | 2.367 | 204.167 | 6.537 | 8.041 | 1.992 | 0.000 | n/a | n/a | 0.231 | 0.106 | 0.001 | 0.231 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af08840000000000000232 | 205.463 | 0.031 | n/a | 0.000 | 0.000 | 1.157 | 204.167 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.059 | 0.031 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af088400000000000001e8 | 205.229 | 0.035 | n/a | 0.000 | 0.000 | 2.037 | 203.009 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.080 | 0.035 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af088400000000000001dd | 204.508 | 0.042 | n/a | 0.000 | 0.000 | 0.634 | 203.671 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.107 | 0.042 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000233 | 203.764 | 0.039 | n/a | 0.000 | 0.000 | 0.674 | 200.967 | 0.015 | 0.000 | 1.992 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000200 | 203.274 | 0.052 | n/a | 0.000 | 0.000 | 2.367 | 200.683 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.113 | 0.052 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af088400000000000001ec | 203.159 | 0.037 | n/a | 0.000 | 0.000 | 1.865 | 201.092 | 0.011 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.074 | 0.037 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af088400000000000001ee | 202.959 | 0.042 | n/a | 0.000 | 0.000 | 1.141 | 201.628 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.080 | 0.042 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af0884000000000000023e | 202.732 | 0.059 | n/a | 0.000 | 0.000 | 0.886 | 201.525 | 0.014 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.122 | 0.059 | 0.000 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000224 | 202.731 | 0.028 | n/a | 0.000 | 0.000 | 1.195 | 201.336 | 0.012 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.057 | 0.028 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af0884000000000000021f | 202.664 | 0.056 | n/a | 0.000 | 0.000 | 1.110 | 201.280 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.113 | 0.056 | 0.000 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000234 | 202.504 | 0.043 | n/a | 0.000 | 0.000 | 0.578 | 201.635 | 0.013 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.092 | 0.043 | 0.000 | 0.092 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af0884000000000000023b | 202.474 | 0.106 | n/a | 0.000 | 0.000 | 1.096 | 201.029 | 0.020 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.146 | 0.106 | 0.001 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000227 | 202.451 | 0.025 | n/a | 0.000 | 0.000 | 0.636 | 201.593 | 0.013 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.048 | 0.025 | 0.000 | 0.048 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af0884000000000000023d | 202.355 | 0.060 | n/a | 0.000 | 0.000 | 1.000 | 201.044 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.160 | 0.060 | 0.000 | 0.160 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000239 | 202.262 | 0.045 | n/a | 0.000 | 0.000 | 0.858 | 201.172 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.098 | 0.045 | 0.000 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000023a | 202.249 | 0.052 | n/a | 0.000 | 0.000 | 1.099 | 200.873 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.152 | 0.052 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000218 | 202.198 | 0.027 | n/a | 0.000 | 0.000 | 0.563 | 201.440 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.064 | 0.027 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af088400000000000001f0 | 202.196 | 0.030 | n/a | 0.000 | 0.000 | 0.636 | 201.337 | 0.010 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.064 | 0.030 | 0.000 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000208 | 202.168 | 0.045 | n/a | 0.000 | 0.000 | 0.925 | 201.039 | 0.008 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.081 | 0.045 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000214 | 202.125 | 0.043 | n/a | 0.000 | 0.000 | 1.022 | 200.910 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.086 | 0.043 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.701 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 0.537 | 70.519 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.064 | 0.045 | 0.001 | 0.064 |
| p99 | 207.406 | n/a | n/a | n/a | 0.334 | n/a | 0.000 | 0.000 | 5.000 | 206.737 | 6.263 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.223 | 0.334 | 0.005 | 0.223 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af0884000000000000024e | 207.406 | 0.037 | n/a | 0.000 | 0.000 | 0.509 | 206.737 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000023f | 205.979 | 0.061 | n/a | 0.000 | 0.000 | 5.000 | 200.744 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.133 | 0.061 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000254 | 205.180 | 0.027 | n/a | 0.000 | 0.000 | 0.574 | 204.473 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.059 | 0.027 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000248 | 204.638 | 0.034 | n/a | 0.000 | 0.000 | 0.687 | 203.791 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000242 | 202.881 | 0.044 | n/a | 0.000 | 0.000 | 0.827 | 201.763 | 0.014 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.095 | 0.044 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000250 | 202.279 | 0.031 | n/a | 0.000 | 0.000 | 0.868 | 201.241 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000252 | 202.035 | 0.073 | n/a | 0.000 | 0.000 | 0.878 | 200.880 | 0.018 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.121 | 0.073 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000253 | 202.023 | 0.039 | n/a | 0.000 | 0.000 | 0.736 | 201.069 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000246 | 201.964 | 0.041 | n/a | 0.000 | 0.000 | 0.765 | 200.989 | 0.007 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af0884000000000000024c | 201.933 | 0.074 | n/a | 0.000 | 0.000 | 1.050 | 200.552 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.223 | 0.074 | 0.000 | 0.223 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000241 | 201.826 | 0.035 | n/a | 0.000 | 0.000 | 0.426 | 201.245 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000251 | 201.798 | 0.039 | n/a | 0.000 | 0.000 | 0.528 | 201.085 | 0.012 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000245 | 201.792 | 0.033 | n/a | 0.000 | 0.000 | 0.716 | 200.902 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af0884000000000000024a | 201.725 | 0.035 | n/a | 0.000 | 0.000 | 0.632 | 200.904 | 0.005 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000255 | 201.647 | 0.042 | n/a | 0.000 | 0.000 | 0.720 | 200.759 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af0884000000000000024f | 201.524 | 0.025 | n/a | 0.000 | 0.000 | 0.596 | 200.797 | 0.014 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.044 | 0.025 | 0.000 | 0.044 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af0884000000000000024b | 201.199 | 0.034 | n/a | 0.000 | 0.000 | 0.470 | 200.574 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000240 | 201.136 | 0.032 | n/a | 0.000 | 0.000 | 0.413 | 200.580 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000256 | 201.008 | 0.034 | n/a | 0.000 | 0.000 | 0.419 | 200.464 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000244 | 201.001 | 0.044 | n/a | 0.000 | 0.000 | 0.329 | 200.510 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.066 | 0.044 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (214 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.479 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.461 | 86.007 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.060 | 0.037 | 0.000 | 0.060 |
| p99 | 202.852 | n/a | n/a | n/a | 0.101 | n/a | 0.000 | 0.000 | 3.302 | 201.115 | 4.535 | 9.442 | 0.081 | 0.000 | n/a | n/a | 0.144 | 0.101 | 0.002 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f57495f08af08840000000000000e76 | 225.720 | 0.030 | n/a | 0.000 | 0.000 | 0.597 | 204.210 | 0.004 | 20.762 | 0.049 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000e85 | 204.218 | 0.031 | n/a | 0.000 | 0.000 | 3.302 | 191.289 | 0.009 | 9.442 | 0.080 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000e8e | 202.852 | 0.038 | n/a | 0.000 | 0.000 | 2.257 | 200.447 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-64/journal/page | none observed |
| 7f57495f08af08840000000000000eb0 | 202.043 | 0.023 | n/a | 0.000 | 0.000 | 1.000 | 200.894 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.055 | 0.023 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000e5b | 202.004 | 0.028 | n/a | 0.000 | 0.000 | 1.260 | 200.609 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.066 | 0.028 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000e6f | 201.983 | 0.044 | n/a | 0.000 | 0.000 | 0.628 | 201.115 | 0.010 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.104 | 0.044 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000e7d | 201.952 | 0.061 | n/a | 0.000 | 0.000 | 0.944 | 200.777 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.136 | 0.061 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000ea0 | 201.947 | 0.058 | n/a | 0.000 | 0.000 | 0.589 | 201.046 | 0.029 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.145 | 0.058 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |
| 7f57495f08af08840000000000000e73 | 201.937 | 0.033 | n/a | 0.000 | 0.000 | 1.182 | 200.604 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000e54 | 201.921 | 0.037 | n/a | 0.000 | 0.000 | 0.427 | 201.258 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.095 | 0.037 | 0.000 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000e6e | 201.868 | 0.033 | n/a | 0.000 | 0.000 | 0.595 | 201.088 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-64/journal/page | none observed |
| 7f57495f08af08840000000000000e96 | 201.810 | 0.042 | n/a | 0.000 | 0.000 | 0.597 | 200.972 | 0.018 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.114 | 0.042 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 7f57495f08af08840000000000000ea1 | 201.764 | 0.041 | n/a | 0.000 | 0.000 | 0.645 | 200.976 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.052 | 0.041 | 0.000 | 0.052 | gw-r/thread-52/journal/page | none observed |
| 7f57495f08af08840000000000000e83 | 201.756 | 0.025 | n/a | 0.000 | 0.000 | 0.879 | 200.729 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.058 | 0.025 | 0.000 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000eba | 201.748 | 0.033 | n/a | 0.000 | 0.000 | 0.437 | 201.088 | 0.010 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.094 | 0.033 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000e56 | 201.718 | 0.038 | n/a | 0.000 | 0.000 | 0.589 | 200.979 | 0.003 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 7f57495f08af08840000000000000e87 | 201.618 | 0.046 | n/a | 0.000 | 0.000 | 0.823 | 200.617 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.094 | 0.046 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 7f57495f08af08840000000000000e86 | 201.596 | 0.036 | n/a | 0.000 | 0.000 | 0.535 | 200.886 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.080 | 0.036 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 7f57495f08af08840000000000000e55 | 201.587 | 0.023 | n/a | 0.000 | 0.000 | 0.508 | 200.946 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.041 | 0.023 | 0.000 | 0.041 | gw-r/thread-47/journal/page | none observed |
| 7f57495f08af08840000000000000e70 | 201.576 | 0.028 | n/a | 0.000 | 0.000 | 0.406 | 201.015 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.057 | 0.028 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/2.702 ms; post-ACK p50/p99: 0.372/1.748 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 11.135 | 10.681 | 10.495 | reported |
| All-primary p99 ms | 47.643 | 46.888 | 46.886 | <=50 |
| L256 5-10 p50Ms | 17.663 | 17.407 | 17.407 | <=10 |
| L256 5-10 p99Ms | 110.210 | 109.839 | 109.836 | <=50 |
| L256 11-25 p50Ms | 23.423 | 22.911 | 22.911 | <=10 |
| L256 11-25 p99Ms | 26.655 | 25.871 | 25.868 | <=50 |
| L256 26-50 p50Ms | 24.703 | 24.063 | 24.063 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 31.222 | 30.349 | 30.342 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.663 | 9.343 | 9.151 | <=10 |
| Burst 11-25 p50 ms | 11.775 | 11.199 | 11.135 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 110.210 | 109.839 | 109.836 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 159.361 | 158.086 | 158.085 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 30.321/69.996 | 28.675 | 14.868 | 34.993 | 0.111/0.030 |
| 5-10 | >=1000 | 31 | 16.226/140.532 | 15.754 | 10.956 | 26.643 | 0.086/0.020 |
| 5-10 | 250-1000 | 35 | 19.135/110.110 | 18.818 | 12.285 | 31.022 | 0.075/0.021 |
| 11-25 | 250-1000 | 23 | 20.407/33.448 | 19.338 | 12.836 | 31.509 | 0.087/0.029 |
| 5-10 | 100-250 | 15 | 14.865/33.475 | 14.514 | 6.980 | 17.424 | 0.064/0.019 |
| 11-25 | >=1000 | 13 | 29.394/146.977 | 28.668 | 19.257 | 44.792 | 0.093/0.022 |
| 26-50 | 250-1000 | 8 | 29.098/39.525 | 27.812 | 19.160 | 43.011 | 0.089/0.021 |
| 11-25 | 100-250 | 6 | 13.946/35.900 | 13.401 | 8.067 | 21.225 | 0.073/0.018 |
| 11-25 | 0-50 | 543 | 10.509/27.828 | 9.914 | 5.705 | 14.128 | 0.046/0.016 |
| 5-10 | 0-50 | 1145 | 8.542/29.121 | 8.216 | 4.813 | 11.878 | 0.042/0.016 |
| 5-10 | 50-100 | 55 | 8.525/17.829 | 8.258 | 4.961 | 11.991 | 0.052/0.016 |
| 26-50 | overlap | 144 | 16.683/47.535 | 16.006 | 9.865 | 23.241 | 0.050/0.017 |
| 11-25 | 50-100 | 38 | 12.249/32.616 | 11.691 | 6.585 | 16.476 | 0.062/0.017 |
| 5-10 | overlap | 784 | 10.596/43.167 | 10.316 | 6.813 | 15.068 | 0.036/0.015 |
| 11-25 | overlap | 363 | 12.538/45.254 | 11.841 | 7.657 | 17.569 | 0.040/0.016 |
| 26-50 | 0-50 | 197 | 14.019/46.693 | 13.166 | 7.151 | 18.420 | 0.060/0.017 |
| 26-50 | 50-100 | 12 | 14.594/25.456 | 13.651 | 7.619 | 20.029 | 0.063/0.016 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 880 | 20 | 1694.823 |
| burst | 2540 | 9 | 631.762 |

## Writer heap, GC and scheduler stalls

Source d62b4e952e5d2b0c5570225ff6e612eabee2f38b; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 100.153 / 299.605 |
| GC events / total duration / maximum ms | 652 / 850.856 / 21.549 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":626,"4":13,"8":13} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 47.643 / 29 / 2326.585 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
