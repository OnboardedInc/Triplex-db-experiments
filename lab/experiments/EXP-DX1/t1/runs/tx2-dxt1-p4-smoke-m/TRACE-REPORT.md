# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (306.900 ms, trace `f79f20fd0ae5820c0000000000000058`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (175.801 ms, trace `f79f20fd0ae5820c00000000000000d9`); `gw-w/thread-65/peer.transact-await (includes order/network/storage)` (90.017 ms, trace `f79f20fd0ae5820c00000000000000e6`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (98.272 ms, trace `f79f20fd0ae5820c0000000000000074`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (88.538 ms, trace `f79f20fd0ae5820c00000000000000e5`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-m`; source `ef7473361c138176ead9c0222b2ccc53e33dde11`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 81/81 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 81/81. Raw trace bytes: 726015.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 100 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1273.158 | 161.266 | 262.470 | 36 |
| baseline | 0 | 1979.914 | 37.302 | 8.207 | 44 |
| L1 | 1 | 1980.111 | 181.487 | 13.178 | 30 |
| L4 | 4 | 1972.555 | 252.989 | 231.687 | 44 |
| L16 | 16 | 1942.013 | 189.717 | 211.199 | 44 |
| L64 | 16 | 1933.608 | 174.292 | 243.105 | 44 |
| L256 | 16 | 1914.750 | 169.751 | 207.174 | 58 |
| L1024 | 16 | 1865.773 | 266.796 | 327.315 | 16 |
| recovery | 16 | 1973.442 | 182.086 | 263.252 | 49 |
| p4mix | 1 | 1830.353 | 39.044 | 17.361 | 38 |
| p4h1 | 1 | 1019.263 | 14.651 | 11.032 | 16 |
| grow3 | 0 | 436.976 | 67.479 | 0.297 | 36 |
| p4h3 | 1 | 1942.723 | 75.175 | 34.089 | 128 |
| grow10 | 0 | 112.258 | 16.795 | 11.359 | 8 |
| p4h10 | 1 | 1577.294 | 30.863 | 27.244 | 44 |
| presweep | 16 | 1895.330 | 192.719 | 294.029 | 58 |
| sweep | 16 | 136.071 | 30.194 | 46.019 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000058 | driver.queue.scheduler-dispatch | 0.037 | none | 1 / 32 |
| f79f20fd0ae5820c0000000000000058 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace f79f20fd0ae5820c0000000000000058 waited: []

| f79f20fd0ae5820c00000000000000d9 | driver.queue.scheduler-dispatch | 0.071 | none | 0 / 32 |
| f79f20fd0ae5820c00000000000000d9 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace f79f20fd0ae5820c00000000000000d9 waited: []

| f79f20fd0ae5820c00000000000000e6 | driver.queue.scheduler-dispatch | 0.010 | none | 9 / 32 |
| f79f20fd0ae5820c00000000000000e6 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace f79f20fd0ae5820c00000000000000e6 waited: []

| f79f20fd0ae5820c0000000000000074 | driver.queue.scheduler-dispatch | 0.056 | none | 0 / 32 |
| f79f20fd0ae5820c0000000000000074 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace f79f20fd0ae5820c0000000000000074 waited: []

| f79f20fd0ae5820c00000000000000e5 | driver.queue.scheduler-dispatch | 0.009 | none | 8 / 32 |
| f79f20fd0ae5820c00000000000000e5 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace f79f20fd0ae5820c00000000000000e5 waited: []

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.147 | 1.228 | 0.000 | 1.900 | 9.201 | 0.011 | 0.000 | 0.634 | 3.508 | 6.130 | 0.077 | n/a | 0.137 | 13.951 | n/a | n/a | 0.085 | 10.345 | 0.264 | 0.085 |
| p99 | 67.930 | 2.451 | 0.000 | 3.622 | 32.108 | 0.744 | 0.000 | 1.133 | 9.445 | 13.289 | 0.163 | n/a | 0.281 | 18.883 | n/a | n/a | 0.286 | 32.942 | 0.485 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000039 | 67.930 | 32.108 | 0.744 | 0.000 | 0.090 | 9.445 | 6.130 | 0.163 | n/a | 0.281 | 18.883 | n/a | n/a | 0.085 | 32.942 | 0.485 | 0.085 | node-14/thread-9/client.validation-and-staging | none observed |
| f79f20fd0ae5820c0000000000000037 | 39.147 | 9.201 | 0.011 | 0.000 | 1.133 | 1.066 | 13.289 | 0.077 | n/a | 0.133 | 13.951 | n/a | n/a | 0.286 | 10.345 | 0.264 | 0.286 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000003b | 23.007 | 4.252 | 0.006 | 0.000 | 0.634 | 3.508 | 1.551 | 0.043 | n/a | 0.137 | 12.819 | n/a | n/a | 0.057 | 4.892 | 0.213 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.007 | 1.228 | 0.000 | 1.900 | 4.252 | 0.006 | 0.000 | 0.634 | 3.508 | 1.551 | 0.043 | n/a | 0.137 | 12.819 | n/a | n/a | 0.057 | 4.892 | 0.213 | 0.057 |
| p99 | 23.007 | 1.228 | 0.000 | 1.900 | 4.252 | 0.006 | 0.000 | 0.634 | 3.508 | 1.551 | 0.043 | n/a | 0.137 | 12.819 | n/a | n/a | 0.057 | 4.892 | 0.213 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000003b | 23.007 | 4.252 | 0.006 | 0.000 | 0.634 | 3.508 | 1.551 | 0.043 | n/a | 0.137 | 12.819 | n/a | n/a | 0.057 | 4.892 | 0.213 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.832 | 0.125 | 0.000 | 0.460 | 4.871 | 0.194 | 0.000 | 0.083 | 1.504 | 5.547 | 0.057 | n/a | 0.425 | 11.300 | n/a | n/a | 0.049 | 5.227 | 0.201 | 0.049 |
| p99 | 46.554 | 2.083 | 0.000 | 2.576 | 10.712 | 0.281 | 0.693 | 0.797 | 4.621 | 14.250 | 0.133 | n/a | 3.705 | 20.848 | n/a | n/a | 0.064 | 10.966 | 0.296 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000008d | 46.554 | 5.936 | 0.241 | 0.000 | 0.065 | 4.621 | 14.250 | 0.063 | n/a | 0.483 | 20.848 | n/a | n/a | 0.049 | 6.242 | 0.134 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000a3 | 43.710 | 10.712 | 0.013 | 0.000 | 0.241 | 1.339 | 10.321 | 0.133 | n/a | 0.286 | 20.607 | n/a | n/a | 0.059 | 10.966 | 0.251 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000c9 | 40.398 | 5.775 | 0.194 | 0.693 | 0.053 | 2.478 | 13.649 | 0.098 | n/a | 2.555 | 14.863 | n/a | n/a | 0.041 | 6.715 | 0.166 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000c7 | 37.678 | 4.604 | 0.281 | 0.000 | 0.052 | 1.727 | 12.929 | 0.057 | n/a | 3.705 | 14.266 | n/a | n/a | 0.057 | 4.936 | 0.131 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000008a | 27.125 | 5.315 | 0.005 | 0.000 | 0.781 | 1.014 | 1.832 | 0.050 | n/a | 3.022 | 15.046 | n/a | n/a | 0.062 | 6.100 | 0.225 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000009f | 25.832 | 4.788 | 0.254 | 0.000 | 0.137 | 2.002 | 8.729 | 0.056 | n/a | 0.225 | 9.578 | n/a | n/a | 0.063 | 5.180 | 0.201 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000a5 | 22.354 | 3.623 | 0.234 | 0.525 | 0.053 | 1.404 | 4.872 | 0.044 | n/a | 0.253 | 11.300 | n/a | n/a | 0.047 | 4.435 | 0.198 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000c5 | 21.096 | 5.431 | 0.011 | 0.000 | 0.797 | 1.504 | 5.547 | 0.085 | n/a | 0.167 | 7.506 | n/a | n/a | 0.047 | 6.239 | 0.296 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000003d | 20.648 | 4.871 | 0.273 | 0.000 | 0.083 | 2.771 | 3.789 | 0.062 | n/a | 0.895 | 7.840 | n/a | n/a | 0.064 | 5.227 | 0.253 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000a0 | 14.287 | 3.364 | 0.005 | 0.000 | 0.341 | 0.816 | 1.278 | 0.035 | n/a | 0.425 | 7.984 | n/a | n/a | 0.039 | 3.710 | 0.260 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.003 | 0.000 | 0.000 | 0.330 | 3.920 | 0.010 | 0.000 | 0.052 | 1.846 | 1.907 | 0.048 | n/a | 0.284 | 8.722 | n/a | n/a | 0.059 | 4.153 | 0.166 | 0.059 |
| p99 | 42.503 | 1.272 | 0.381 | 2.567 | 5.888 | 0.190 | 0.000 | 0.603 | 4.792 | 7.634 | 0.120 | n/a | 0.687 | 29.258 | n/a | n/a | 0.164 | 6.149 | 0.306 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000003f | 42.503 | 5.888 | 0.010 | 0.000 | 0.251 | 4.792 | 1.907 | 0.054 | n/a | 0.284 | 29.258 | n/a | n/a | 0.059 | 6.149 | 0.145 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000041 | 25.081 | 3.920 | 0.182 | 0.000 | 0.051 | 1.846 | 7.634 | 0.120 | n/a | 0.207 | 11.074 | n/a | n/a | 0.047 | 4.153 | 0.166 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000045 | 21.003 | 4.330 | 0.190 | 0.000 | 0.052 | 2.105 | 5.049 | 0.048 | n/a | 0.441 | 8.722 | n/a | n/a | 0.065 | 4.572 | 0.218 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000043 | 11.636 | 2.958 | 0.005 | 0.000 | 0.603 | 1.013 | 1.630 | 0.038 | n/a | 0.687 | 4.538 | n/a | n/a | 0.164 | 3.566 | 0.306 | 0.164 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.636 | 0.575 | 0.000 | 1.577 | 2.958 | 0.005 | 0.000 | 0.251 | 1.013 | 1.630 | 0.038 | n/a | 0.284 | 4.538 | n/a | n/a | 0.059 | 3.566 | 0.145 | 0.059 |
| p99 | 42.503 | 1.272 | 0.381 | 2.567 | 5.888 | 0.010 | 0.000 | 0.603 | 4.792 | 1.907 | 0.054 | n/a | 0.687 | 29.258 | n/a | n/a | 0.164 | 6.149 | 0.306 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000003f | 42.503 | 5.888 | 0.010 | 0.000 | 0.251 | 4.792 | 1.907 | 0.054 | n/a | 0.284 | 29.258 | n/a | n/a | 0.059 | 6.149 | 0.145 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000043 | 11.636 | 2.958 | 0.005 | 0.000 | 0.603 | 1.013 | 1.630 | 0.038 | n/a | 0.687 | 4.538 | n/a | n/a | 0.164 | 3.566 | 0.306 | 0.164 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.366 | 0.371 | 0.000 | 0.414 | 7.820 | 0.168 | 0.000 | 0.209 | 2.300 | 5.801 | 0.054 | n/a | 0.282 | 11.543 | n/a | n/a | 0.056 | 8.897 | 0.305 | 0.056 |
| p99 | 30.770 | 1.568 | 0.000 | 2.727 | 8.660 | 0.931 | 0.000 | 0.218 | 2.733 | 6.889 | 0.077 | n/a | 0.605 | 11.996 | n/a | n/a | 0.067 | 8.969 | 0.335 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000049 | 30.770 | 8.660 | 0.168 | 0.000 | 0.068 | 2.733 | 6.889 | 0.054 | n/a | 0.605 | 11.543 | n/a | n/a | 0.049 | 8.897 | 0.289 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000004c | 29.366 | 7.820 | 0.931 | 0.000 | 0.218 | 2.300 | 5.801 | 0.077 | n/a | 0.168 | 11.996 | n/a | n/a | 0.056 | 8.969 | 0.305 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000046 | 23.340 | 7.613 | 0.006 | 0.000 | 0.209 | 1.793 | 4.978 | 0.052 | n/a | 0.282 | 8.341 | n/a | n/a | 0.067 | 7.827 | 0.335 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 53.287 | 0.415 | 0.000 | 0.352 | 5.586 | 0.011 | 0.000 | 0.120 | 1.470 | 8.247 | 0.046 | n/a | 0.957 | 31.919 | n/a | n/a | 0.039 | 6.241 | 0.093 | 0.039 |
| p99 | 79.383 | 1.460 | 0.000 | 2.187 | 5.848 | 0.541 | 0.000 | 1.111 | 21.046 | 9.826 | 0.828 | n/a | 4.155 | 58.696 | n/a | n/a | 0.048 | 6.508 | 0.129 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000052 | 79.383 | 5.804 | 0.430 | 0.000 | 0.106 | 4.664 | 8.573 | 0.105 | n/a | 0.957 | 58.696 | n/a | n/a | 0.047 | 6.341 | 0.080 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.worker-message 1.068ms; driver.worker-message 0.640ms |
| f79f20fd0ae5820c0000000000000055 | 58.352 | 5.848 | 0.541 | 0.000 | 0.120 | 21.046 | 9.826 | 0.828 | n/a | 4.155 | 15.942 | n/a | n/a | 0.048 | 6.508 | 0.112 | 0.048 | node-14/thread-9/socket.wait-first-byte | none observed |
| f79f20fd0ae5820c0000000000000050 | 53.287 | 3.845 | 0.005 | 0.000 | 1.111 | 0.800 | 7.327 | 0.046 | n/a | 3.025 | 37.093 | n/a | n/a | 0.036 | 4.961 | 0.093 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000004d | 48.316 | 5.586 | 0.011 | 0.000 | 0.644 | 1.470 | 8.247 | 0.042 | n/a | 0.359 | 31.919 | n/a | n/a | 0.039 | 6.241 | 0.129 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.125 | 0.591 | 0.000 | 0.563 | 4.814 | 0.009 | 0.000 | 0.067 | 1.496 | 5.731 | 0.089 | n/a | 0.310 | 25.121 | n/a | n/a | 0.049 | 5.453 | 0.034 | 0.049 |
| p99 | 323.128 | 1.125 | 0.000 | 2.020 | 7.270 | 0.448 | 0.454 | 0.630 | 5.848 | 40.181 | 0.188 | n/a | 3.002 | 306.900 | n/a | n/a | 0.096 | 7.785 | 0.230 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000058 | 323.128 | 6.015 | 0.153 | 0.454 | 0.040 | 3.184 | 5.731 | 0.083 | n/a | 0.542 | 306.900 | n/a | n/a | 0.028 | 6.661 | 0.021 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.226ms |
| f79f20fd0ae5820c000000000000005b | 116.975 | 3.871 | 0.005 | 0.000 | 0.129 | 1.007 | 40.181 | 0.089 | n/a | 0.139 | 71.458 | n/a | n/a | 0.096 | 4.005 | 0.034 | 0.096 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000005f | 67.125 | 7.270 | 0.448 | 0.000 | 0.067 | 5.848 | 25.132 | 0.188 | n/a | 3.002 | 25.121 | n/a | n/a | 0.049 | 7.785 | 0.116 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000057 | 23.684 | 4.814 | 0.009 | 0.000 | 0.630 | 1.496 | 5.582 | 0.120 | n/a | 0.310 | 10.654 | n/a | n/a | 0.069 | 5.453 | 0.230 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.684 | 0.593 | 0.000 | 1.851 | 3.871 | 0.005 | 0.000 | 0.129 | 1.007 | 5.582 | 0.089 | n/a | 0.139 | 10.654 | n/a | n/a | 0.069 | 4.005 | 0.034 | 0.069 |
| p99 | 116.975 | 1.125 | 0.000 | 2.020 | 4.814 | 0.009 | 0.000 | 0.630 | 1.496 | 40.181 | 0.120 | n/a | 0.310 | 71.458 | n/a | n/a | 0.096 | 5.453 | 0.230 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000005b | 116.975 | 3.871 | 0.005 | 0.000 | 0.129 | 1.007 | 40.181 | 0.089 | n/a | 0.139 | 71.458 | n/a | n/a | 0.096 | 4.005 | 0.034 | 0.096 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000057 | 23.684 | 4.814 | 0.009 | 0.000 | 0.630 | 1.496 | 5.582 | 0.120 | n/a | 0.310 | 10.654 | n/a | n/a | 0.069 | 5.453 | 0.230 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.583 | 0.401 | 0.000 | 0.308 | 3.932 | 0.005 | 0.000 | 0.053 | 2.135 | 14.662 | 0.094 | n/a | 0.164 | 51.993 | n/a | n/a | 0.039 | 4.324 | 0.060 | 0.039 |
| p99 | 98.006 | 1.908 | 0.000 | 2.347 | 5.254 | 0.233 | 1.416 | 0.650 | 3.341 | 26.286 | 0.162 | n/a | 1.424 | 75.605 | n/a | n/a | 0.050 | 6.266 | 0.134 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000061 | 98.006 | 5.254 | 0.005 | 0.000 | 0.650 | 1.032 | 14.662 | 0.094 | n/a | 0.662 | 75.605 | n/a | n/a | 0.042 | 5.909 | 0.060 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000064 | 93.921 | 4.565 | 0.233 | 1.416 | 0.051 | 2.172 | 26.286 | 0.120 | n/a | 0.164 | 58.878 | n/a | n/a | 0.035 | 6.266 | 0.067 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000069 | 85.583 | 3.932 | 0.159 | 0.000 | 0.053 | 2.135 | 25.687 | 0.162 | n/a | 1.424 | 51.993 | n/a | n/a | 0.039 | 4.144 | 0.048 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000066 | 32.356 | 3.754 | 0.005 | 0.000 | 0.565 | 3.341 | 1.512 | 0.036 | n/a | 0.141 | 22.952 | n/a | n/a | 0.050 | 4.324 | 0.134 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.070 | n/a | n/a | n/a | 8.511 | 2.315 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 10.056 | 0.997 | 0.014 |
| p99 | 114.082 | n/a | n/a | n/a | 78.403 | 7.727 | 14.285 | 0.000 | 0.935 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.316 | 92.831 | 0.999 | 20.316 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000062 | 114.082 | 78.403 | 3.243 | 11.185 | 0.000 | 0.935 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.316 | 92.831 | 0.814 | 20.316 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| f79f20fd0ae5820c000000000000007d | 95.080 | 63.698 | 2.708 | 14.285 | 0.000 | 0.816 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.572 | 80.692 | 0.849 | 13.572 | node-14/thread-3/client.reach-decode-and-cache | none observed |
| f79f20fd0ae5820c0000000000000038 | 47.357 | 37.465 | 2.740 | 7.114 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 47.319 | 0.999 | 0.039 | node-14/thread-2/replica.pull-at | driver.worker-message 1.367ms |
| f79f20fd0ae5820c000000000000005d | 43.061 | 25.590 | 1.801 | 1.750 | 0.000 | 0.843 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.077 | 29.140 | 0.677 | 13.077 | node-14/thread-3/socket.wait-first-byte | none observed |
| f79f20fd0ae5820c0000000000000081 | 28.519 | 18.188 | 2.315 | 0.000 | 0.000 | 0.552 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.463 | 20.503 | 0.719 | 7.463 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c00000000000000d5 | 24.189 | 22.629 | 1.546 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 24.176 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | driver.publication 1.825ms |
| f79f20fd0ae5820c00000000000000a8 | 13.889 | 13.742 | 0.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 13.877 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c0000000000000067 | 12.878 | 11.860 | 1.001 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 12.862 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c00000000000000d6 | 12.588 | 4.848 | 7.727 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 12.575 | 0.999 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| f79f20fd0ae5820c000000000000008b | 10.170 | 7.774 | 2.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 10.141 | 0.997 | 0.030 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c00000000000000d1 | 10.070 | 9.979 | 0.077 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.056 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c00000000000000c6 | 9.767 | 9.611 | 0.142 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 9.753 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c000000000000006b | 8.853 | 5.323 | 3.510 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.833 | 0.998 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c0000000000000047 | 8.702 | 8.511 | 0.164 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 8.675 | 0.997 | 0.028 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c00000000000000cc | 6.783 | 6.651 | 0.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.768 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c00000000000000a1 | 6.567 | 0.358 | 6.194 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 6.552 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| f79f20fd0ae5820c00000000000000ba | 5.324 | 5.123 | 0.188 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 5.311 | 0.997 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| f79f20fd0ae5820c000000000000004e | 5.316 | 0.394 | 4.909 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 5.302 | 0.997 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| f79f20fd0ae5820c00000000000000a4 | 4.798 | 0.179 | 4.606 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.785 | 0.997 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| f79f20fd0ae5820c0000000000000095 | 3.858 | 0.368 | 3.478 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.845 | 0.997 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.356 | 0.702 | 0.000 | 1.902 | 3.754 | 0.005 | 0.000 | 0.565 | 3.341 | 1.512 | 0.036 | n/a | 0.141 | 22.952 | n/a | n/a | 0.050 | 4.324 | 0.134 | 0.050 |
| p99 | 32.356 | 0.702 | 0.000 | 1.902 | 3.754 | 0.005 | 0.000 | 0.565 | 3.341 | 1.512 | 0.036 | n/a | 0.141 | 22.952 | n/a | n/a | 0.050 | 4.324 | 0.134 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000066 | 32.356 | 3.754 | 0.005 | 0.000 | 0.565 | 3.341 | 1.512 | 0.036 | n/a | 0.141 | 22.952 | n/a | n/a | 0.050 | 4.324 | 0.134 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.067 | 0.401 | 0.000 | 1.515 | 5.470 | 0.013 | 0.000 | 0.475 | 1.606 | 5.163 | 0.055 | n/a | 1.051 | 15.531 | n/a | n/a | 0.038 | 6.390 | 0.190 | 0.038 |
| p99 | 134.932 | 1.947 | 0.000 | 2.059 | 9.367 | 2.997 | 1.050 | 0.914 | 2.242 | 26.501 | 0.142 | n/a | 3.010 | 98.272 | n/a | n/a | 0.068 | 13.473 | 0.326 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000074 | 134.932 | 7.383 | 0.157 | 0.000 | 0.058 | 2.242 | 26.501 | 0.142 | n/a | 0.138 | 98.272 | n/a | n/a | 0.038 | 7.599 | 0.056 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000006d | 41.370 | 9.367 | 2.997 | 1.050 | 0.059 | 1.909 | 9.292 | 0.055 | n/a | 1.051 | 15.531 | n/a | n/a | 0.059 | 13.473 | 0.326 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000006a | 38.067 | 5.470 | 0.006 | 0.000 | 0.914 | 1.606 | 5.163 | 0.112 | n/a | 3.010 | 21.719 | n/a | n/a | 0.068 | 6.390 | 0.168 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000070 | 20.844 | 3.071 | 0.005 | 0.000 | 0.875 | 0.775 | 4.485 | 0.046 | n/a | 1.200 | 10.351 | n/a | n/a | 0.036 | 3.951 | 0.190 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000072 | 14.374 | 2.931 | 0.013 | 0.000 | 0.475 | 0.952 | 1.803 | 0.038 | n/a | 0.942 | 7.184 | n/a | n/a | 0.036 | 3.419 | 0.238 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.844 | 0.587 | 0.000 | 1.521 | 3.071 | 0.006 | 0.000 | 0.875 | 0.952 | 4.485 | 0.046 | n/a | 1.200 | 10.351 | n/a | n/a | 0.036 | 3.951 | 0.190 | 0.036 |
| p99 | 38.067 | 1.947 | 0.000 | 2.059 | 5.470 | 0.013 | 0.000 | 0.914 | 1.606 | 5.163 | 0.112 | n/a | 3.010 | 21.719 | n/a | n/a | 0.068 | 6.390 | 0.238 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000006a | 38.067 | 5.470 | 0.006 | 0.000 | 0.914 | 1.606 | 5.163 | 0.112 | n/a | 3.010 | 21.719 | n/a | n/a | 0.068 | 6.390 | 0.168 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000070 | 20.844 | 3.071 | 0.005 | 0.000 | 0.875 | 0.775 | 4.485 | 0.046 | n/a | 1.200 | 10.351 | n/a | n/a | 0.036 | 3.951 | 0.190 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000072 | 14.374 | 2.931 | 0.013 | 0.000 | 0.475 | 0.952 | 1.803 | 0.038 | n/a | 0.942 | 7.184 | n/a | n/a | 0.036 | 3.419 | 0.238 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.197 | 0.000 | 0.000 | 0.334 | 9.427 | 0.853 | 0.000 | 0.062 | 2.649 | 18.450 | 0.079 | n/a | 0.633 | 17.081 | n/a | n/a | 0.049 | 11.325 | 0.170 | 0.049 |
| p99 | 66.602 | 1.056 | 0.000 | 0.879 | 11.320 | 1.825 | 0.000 | 0.073 | 7.680 | 19.044 | 0.160 | n/a | 4.148 | 24.196 | n/a | n/a | 0.072 | 12.234 | 0.239 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000079 | 66.602 | 9.427 | 1.825 | 0.000 | 0.073 | 7.680 | 19.044 | 0.160 | n/a | 4.148 | 24.196 | n/a | n/a | 0.049 | 11.325 | 0.170 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000076 | 51.197 | 11.320 | 0.853 | 0.000 | 0.062 | 2.649 | 18.450 | 0.079 | n/a | 0.633 | 17.081 | n/a | n/a | 0.072 | 12.234 | 0.239 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.903 | 0.313 | 0.000 | 0.372 | 4.622 | 0.014 | 0.000 | 0.115 | 1.182 | 7.511 | 0.066 | n/a | 0.466 | 12.682 | n/a | n/a | 0.042 | 5.162 | 0.131 | 0.042 |
| p99 | 74.605 | 1.853 | 0.000 | 2.580 | 8.857 | 2.006 | 0.325 | 0.755 | 2.578 | 11.944 | 0.443 | n/a | 0.709 | 60.065 | n/a | n/a | 0.059 | 11.304 | 0.289 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000007c | 74.605 | 4.622 | 0.014 | 0.000 | 0.526 | 0.873 | 7.923 | 0.074 | n/a | 0.466 | 60.065 | n/a | n/a | 0.042 | 5.162 | 0.069 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000083 | 39.048 | 8.857 | 2.006 | 0.325 | 0.115 | 2.578 | 11.944 | 0.443 | n/a | 0.229 | 12.500 | n/a | n/a | 0.051 | 11.304 | 0.289 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c000000000000007b | 33.903 | 3.977 | 0.173 | 0.238 | 0.065 | 1.729 | 7.511 | 0.066 | n/a | 0.709 | 19.396 | n/a | n/a | 0.040 | 4.453 | 0.131 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000080 | 21.550 | 4.774 | 0.005 | 0.000 | 0.755 | 1.182 | 1.446 | 0.057 | n/a | 0.590 | 12.682 | n/a | n/a | 0.059 | 5.534 | 0.257 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.550 | 1.853 | 0.000 | 1.885 | 4.774 | 0.005 | 0.000 | 0.755 | 1.182 | 1.446 | 0.057 | n/a | 0.590 | 12.682 | n/a | n/a | 0.059 | 5.534 | 0.257 | 0.059 |
| p99 | 21.550 | 1.853 | 0.000 | 1.885 | 4.774 | 0.005 | 0.000 | 0.755 | 1.182 | 1.446 | 0.057 | n/a | 0.590 | 12.682 | n/a | n/a | 0.059 | 5.534 | 0.257 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000080 | 21.550 | 4.774 | 0.005 | 0.000 | 0.755 | 1.182 | 1.446 | 0.057 | n/a | 0.590 | 12.682 | n/a | n/a | 0.059 | 5.534 | 0.257 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.629 | 0.333 | 0.000 | 0.391 | 4.462 | 0.259 | 0.000 | 0.114 | 2.251 | 11.386 | 0.063 | n/a | 0.629 | 9.383 | n/a | n/a | 0.067 | 7.385 | 0.355 | 0.067 |
| p99 | 41.600 | 0.701 | 0.000 | 0.623 | 9.473 | 2.472 | 0.353 | 1.035 | 3.819 | 15.824 | 0.135 | n/a | 0.678 | 18.094 | n/a | n/a | 0.087 | 10.512 | 0.357 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000086 | 41.600 | 4.253 | 0.259 | 0.000 | 0.114 | 2.251 | 15.824 | 0.063 | n/a | 0.678 | 18.094 | n/a | n/a | 0.064 | 4.626 | 0.111 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000084 | 29.629 | 9.473 | 0.005 | 0.000 | 1.035 | 3.819 | 11.386 | 0.135 | n/a | 0.406 | 3.284 | n/a | n/a | 0.087 | 10.512 | 0.355 | 0.087 | node-14/thread-0/driver.execute | none observed |
| f79f20fd0ae5820c0000000000000088 | 20.671 | 4.462 | 2.472 | 0.353 | 0.098 | 1.200 | 1.966 | 0.041 | n/a | 0.629 | 9.383 | n/a | n/a | 0.067 | 7.385 | 0.357 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.629 | 0.000 | 0.000 | 0.338 | 9.473 | 0.005 | 0.000 | 1.035 | 3.819 | 11.386 | 0.135 | n/a | 0.406 | 3.284 | n/a | n/a | 0.087 | 10.512 | 0.355 | 0.087 |
| p99 | 29.629 | 0.000 | 0.000 | 0.338 | 9.473 | 0.005 | 0.000 | 1.035 | 3.819 | 11.386 | 0.135 | n/a | 0.406 | 3.284 | n/a | n/a | 0.087 | 10.512 | 0.355 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000084 | 29.629 | 9.473 | 0.005 | 0.000 | 1.035 | 3.819 | 11.386 | 0.135 | n/a | 0.406 | 3.284 | n/a | n/a | 0.087 | 10.512 | 0.355 | 0.087 | node-14/thread-0/driver.execute | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.684 | 0.000 | 0.000 | 0.297 | 5.065 | 0.237 | 0.000 | 0.059 | 1.324 | 1.642 | 0.062 | n/a | 0.143 | 10.935 | n/a | n/a | 0.035 | 5.542 | 0.071 | 0.035 |
| p99 | 89.832 | 0.162 | 0.000 | 0.320 | 5.544 | 0.418 | 0.515 | 0.059 | 2.640 | 20.533 | 0.147 | n/a | 0.440 | 59.683 | n/a | n/a | 0.036 | 6.355 | 0.282 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c000000000000008f | 89.832 | 5.544 | 0.237 | 0.515 | 0.059 | 2.640 | 20.533 | 0.147 | n/a | 0.440 | 59.683 | n/a | n/a | 0.035 | 6.355 | 0.071 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000091 | 19.684 | 5.065 | 0.418 | 0.000 | 0.059 | 1.324 | 1.642 | 0.062 | n/a | 0.143 | 10.935 | n/a | n/a | 0.036 | 5.542 | 0.282 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.218 | 0.594 | 0.000 | 1.703 | 3.821 | 0.579 | 0.000 | 0.236 | 2.312 | 2.388 | 0.037 | n/a | 3.093 | 19.738 | n/a | n/a | 0.034 | 6.740 | 0.151 | 0.034 |
| p99 | 44.751 | 0.890 | 0.000 | 1.706 | 5.468 | 3.558 | 0.641 | 0.373 | 10.766 | 13.231 | 0.203 | n/a | 3.644 | 32.741 | n/a | n/a | 0.041 | 7.426 | 0.172 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000096 | 44.751 | 5.468 | 0.579 | 0.641 | 0.053 | 2.312 | 13.231 | 0.203 | n/a | 3.093 | 19.137 | n/a | n/a | 0.034 | 6.740 | 0.151 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 3.139ms |
| f79f20fd0ae5820c0000000000000098 | 43.218 | 3.496 | 3.558 | 0.000 | 0.373 | 0.472 | 2.388 | 0.037 | n/a | 0.125 | 32.741 | n/a | n/a | 0.029 | 7.426 | 0.172 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c0000000000000094 | 39.563 | 3.821 | 0.005 | 0.000 | 0.236 | 10.766 | 1.276 | 0.037 | n/a | 3.644 | 19.738 | n/a | n/a | 0.041 | 4.062 | 0.103 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.218 | 0.890 | 0.000 | 1.703 | 3.496 | 3.558 | 0.000 | 0.373 | 0.472 | 2.388 | 0.037 | n/a | 0.125 | 32.741 | n/a | n/a | 0.029 | 7.426 | 0.172 | 0.029 |
| p99 | 43.218 | 0.890 | 0.000 | 1.703 | 3.496 | 3.558 | 0.000 | 0.373 | 0.472 | 2.388 | 0.037 | n/a | 0.125 | 32.741 | n/a | n/a | 0.029 | 7.426 | 0.172 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c0000000000000098 | 43.218 | 3.496 | 3.558 | 0.000 | 0.373 | 0.472 | 2.388 | 0.037 | n/a | 0.125 | 32.741 | n/a | n/a | 0.029 | 7.426 | 0.172 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.558 | 0.890 | 0.000 | 1.741 | 3.961 | 0.012 | 0.000 | 0.656 | 1.586 | 2.290 | 0.056 | n/a | 0.487 | 10.920 | n/a | n/a | 0.050 | 5.554 | 0.247 | 0.050 |
| p99 | 46.890 | 2.140 | 0.611 | 4.829 | 8.153 | 1.089 | 0.000 | 2.462 | 5.704 | 6.735 | 1.087 | n/a | 1.384 | 36.663 | n/a | n/a | 0.135 | 8.987 | 0.338 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000a7 | 46.890 | 3.087 | 0.005 | 0.000 | 2.462 | 0.967 | 2.991 | 0.038 | n/a | 0.636 | 36.663 | n/a | n/a | 0.041 | 5.554 | 0.118 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b7 | 41.865 | 3.961 | 1.089 | 0.000 | 0.120 | 1.586 | 5.798 | 0.157 | n/a | 0.814 | 28.263 | n/a | n/a | 0.076 | 5.170 | 0.123 | 0.076 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000a9 | 29.593 | 6.710 | 0.005 | 0.000 | 0.586 | 0.952 | 2.290 | 0.088 | n/a | 0.342 | 18.555 | n/a | n/a | 0.066 | 7.301 | 0.247 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b9 | 28.943 | 8.153 | 0.012 | 0.000 | 0.530 | 1.195 | 2.277 | 0.056 | n/a | 0.487 | 16.156 | n/a | n/a | 0.077 | 8.695 | 0.300 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000ac | 28.298 | 6.181 | 0.021 | 0.000 | 0.656 | 2.284 | 6.735 | 0.056 | n/a | 0.112 | 12.153 | n/a | n/a | 0.101 | 6.857 | 0.242 | 0.101 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b1 | 26.558 | 7.788 | 0.025 | 0.000 | 1.174 | 4.332 | 1.798 | 1.087 | n/a | 0.650 | 9.570 | n/a | n/a | 0.135 | 8.987 | 0.338 | 0.135 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b2 | 26.419 | 5.942 | 0.016 | 0.000 | 0.944 | 5.704 | 3.207 | 0.088 | n/a | 1.384 | 9.094 | n/a | n/a | 0.040 | 6.902 | 0.261 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.414ms |
| f79f20fd0ae5820c00000000000000ab | 23.623 | 3.879 | 0.237 | 0.000 | 0.072 | 1.618 | 6.399 | 0.045 | n/a | 0.404 | 10.920 | n/a | n/a | 0.050 | 4.188 | 0.177 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b5 | 13.478 | 3.314 | 0.005 | 0.000 | 0.906 | 2.198 | 1.347 | 0.037 | n/a | 1.353 | 4.272 | n/a | n/a | 0.046 | 4.225 | 0.313 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000af | 13.284 | 3.361 | 0.005 | 0.000 | 0.860 | 0.708 | 1.595 | 0.038 | n/a | 0.465 | 6.212 | n/a | n/a | 0.040 | 4.226 | 0.318 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.558 | 1.007 | 0.000 | 1.839 | 3.314 | 0.005 | 0.000 | 1.174 | 2.198 | 1.798 | 0.038 | n/a | 0.650 | 9.570 | n/a | n/a | 0.046 | 5.554 | 0.313 | 0.046 |
| p99 | 46.890 | 2.140 | 0.611 | 3.139 | 7.788 | 0.025 | 0.000 | 2.462 | 4.332 | 2.991 | 1.087 | n/a | 1.353 | 36.663 | n/a | n/a | 0.135 | 8.987 | 0.338 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000a7 | 46.890 | 3.087 | 0.005 | 0.000 | 2.462 | 0.967 | 2.991 | 0.038 | n/a | 0.636 | 36.663 | n/a | n/a | 0.041 | 5.554 | 0.118 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b1 | 26.558 | 7.788 | 0.025 | 0.000 | 1.174 | 4.332 | 1.798 | 1.087 | n/a | 0.650 | 9.570 | n/a | n/a | 0.135 | 8.987 | 0.338 | 0.135 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000b5 | 13.478 | 3.314 | 0.005 | 0.000 | 0.906 | 2.198 | 1.347 | 0.037 | n/a | 1.353 | 4.272 | n/a | n/a | 0.046 | 4.225 | 0.313 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 112.311 | 1.001 | 0.000 | 0.297 | 8.377 | 14.231 | 0.000 | 0.065 | 5.247 | 16.592 | 0.093 | n/a | 0.186 | 67.473 | n/a | n/a | 0.047 | 22.674 | 0.202 | 0.047 |
| p99 | 112.311 | 1.001 | 0.000 | 0.297 | 8.377 | 14.231 | 0.000 | 0.065 | 5.247 | 16.592 | 0.093 | n/a | 0.186 | 67.473 | n/a | n/a | 0.047 | 22.674 | 0.202 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000be | 112.311 | 8.377 | 14.231 | 0.000 | 0.065 | 5.247 | 16.592 | 0.093 | n/a | 0.186 | 67.473 | n/a | n/a | 0.047 | 22.674 | 0.202 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.577 | 0.339 | 0.000 | 0.572 | 3.948 | 0.013 | 0.000 | 0.123 | 1.284 | 7.663 | 0.132 | n/a | 0.248 | 15.178 | n/a | n/a | 0.049 | 4.612 | 0.101 | 0.049 |
| p99 | 72.582 | 0.909 | 0.009 | 2.105 | 5.399 | 0.251 | 0.314 | 1.006 | 7.415 | 18.284 | 0.210 | n/a | 1.152 | 51.515 | n/a | n/a | 0.113 | 6.418 | 0.257 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000cb | 72.582 | 3.714 | 0.005 | 0.000 | 0.893 | 1.035 | 15.036 | 0.132 | n/a | 0.139 | 51.515 | n/a | n/a | 0.113 | 4.612 | 0.064 | 0.113 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000cf | 45.971 | 4.016 | 0.251 | 0.314 | 0.068 | 7.415 | 18.284 | 0.148 | n/a | 0.248 | 15.178 | n/a | n/a | 0.049 | 4.649 | 0.101 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000cd | 33.577 | 3.948 | 0.239 | 0.223 | 0.123 | 5.176 | 7.663 | 0.210 | n/a | 0.426 | 15.500 | n/a | n/a | 0.070 | 4.532 | 0.135 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000d0 | 24.935 | 5.399 | 0.013 | 0.000 | 1.006 | 1.284 | 1.770 | 0.048 | n/a | 1.152 | 14.222 | n/a | n/a | 0.040 | 6.418 | 0.257 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.582 | 0.655 | 0.009 | 1.972 | 3.714 | 0.005 | 0.000 | 0.893 | 1.035 | 15.036 | 0.132 | n/a | 0.139 | 51.515 | n/a | n/a | 0.113 | 4.612 | 0.064 | 0.113 |
| p99 | 72.582 | 0.655 | 0.009 | 1.972 | 3.714 | 0.005 | 0.000 | 0.893 | 1.035 | 15.036 | 0.132 | n/a | 0.139 | 51.515 | n/a | n/a | 0.113 | 4.612 | 0.064 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000cb | 72.582 | 3.714 | 0.005 | 0.000 | 0.893 | 1.035 | 15.036 | 0.132 | n/a | 0.139 | 51.515 | n/a | n/a | 0.113 | 4.612 | 0.064 | 0.113 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.838 | 0.970 | 0.000 | 2.123 | 5.093 | 0.009 | 0.000 | 0.399 | 1.615 | 3.086 | 0.044 | n/a | 0.156 | 13.738 | n/a | n/a | 0.059 | 5.996 | 0.242 | 0.059 |
| p99 | 195.612 | 1.435 | 0.560 | 2.391 | 6.438 | 0.405 | 0.469 | 3.744 | 4.785 | 9.492 | 0.084 | n/a | 1.060 | 175.801 | n/a | n/a | 0.061 | 7.705 | 0.370 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000d9 | 195.612 | 6.438 | 0.405 | 0.469 | 0.073 | 1.764 | 9.475 | 0.084 | n/a | 1.060 | 175.801 | n/a | n/a | 0.042 | 7.386 | 0.038 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000d7 | 30.770 | 5.093 | 0.251 | 0.258 | 0.053 | 1.615 | 9.492 | 0.070 | n/a | 0.141 | 13.738 | n/a | n/a | 0.059 | 5.656 | 0.184 | 0.059 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000d3 | 22.838 | 5.592 | 0.005 | 0.000 | 0.399 | 0.684 | 1.646 | 0.036 | n/a | 0.156 | 14.262 | n/a | n/a | 0.059 | 5.996 | 0.263 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000db | 22.438 | 5.003 | 0.009 | 0.000 | 0.415 | 0.946 | 3.086 | 0.036 | n/a | 0.360 | 12.523 | n/a | n/a | 0.061 | 5.427 | 0.242 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000d4 | 20.847 | 3.957 | 0.005 | 0.000 | 3.744 | 4.785 | 1.158 | 0.044 | n/a | 0.137 | 6.980 | n/a | n/a | 0.038 | 7.705 | 0.370 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.114ms |

## P5 / presweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.847 | 0.970 | 0.000 | 2.123 | 3.957 | 0.005 | 0.000 | 0.415 | 0.946 | 1.158 | 0.036 | n/a | 0.137 | 6.980 | n/a | n/a | 0.038 | 5.427 | 0.242 | 0.038 |
| p99 | 22.438 | 1.053 | 0.560 | 2.144 | 5.003 | 0.009 | 0.000 | 3.744 | 4.785 | 3.086 | 0.044 | n/a | 0.360 | 12.523 | n/a | n/a | 0.061 | 7.705 | 0.370 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000db | 22.438 | 5.003 | 0.009 | 0.000 | 0.415 | 0.946 | 3.086 | 0.036 | n/a | 0.360 | 12.523 | n/a | n/a | 0.061 | 5.427 | 0.242 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f79f20fd0ae5820c00000000000000d4 | 20.847 | 3.957 | 0.005 | 0.000 | 3.744 | 4.785 | 1.158 | 0.044 | n/a | 0.137 | 6.980 | n/a | n/a | 0.038 | 7.705 | 0.370 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.114ms |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.205 | 0.507 | 0.001 | 3.375 | 7.085 | 4.686 | 0.000 | 0.010 | 4.196 | 1.107 | 8.155 | n/a | 0.240 | 43.238 | n/a | n/a | 0.031 | 11.652 | 0.154 | 0.031 |
| p99 | 135.111 | 1.629 | 2.570 | 7.688 | 11.104 | 14.311 | 0.000 | 0.046 | 21.333 | 2.701 | 12.584 | n/a | 6.220 | 90.017 | n/a | n/a | 0.064 | 21.446 | 0.238 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f79f20fd0ae5820c00000000000000e6 | 135.111 | 7.125 | 14.311 | 0.000 | 0.010 | 21.333 | 1.935 | 0.099 | n/a | 0.218 | 90.017 | n/a | n/a | 0.064 | 21.446 | 0.159 | 0.064 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms; driver.publication 3.571ms; driver.publication 3.216ms |
| f79f20fd0ae5820c00000000000000e5 | 117.196 | 5.817 | 10.636 | 0.000 | 0.010 | 6.609 | 1.491 | 3.754 | n/a | 0.312 | 88.538 | n/a | n/a | 0.031 | 16.462 | 0.140 | 0.031 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms; driver.publication 3.571ms; driver.publication 3.216ms |
| f79f20fd0ae5820c00000000000000e4 | 103.377 | 7.085 | 9.836 | 0.000 | 0.008 | 2.810 | 1.647 | 8.026 | n/a | 0.240 | 73.707 | n/a | n/a | 0.018 | 16.929 | 0.164 | 0.018 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms; driver.publication 3.571ms; driver.publication 2.827ms |
| f79f20fd0ae5820c00000000000000e3 | 87.912 | 7.253 | 5.656 | 0.000 | 0.010 | 4.544 | 2.701 | 8.155 | n/a | 1.542 | 58.019 | n/a | n/a | 0.032 | 12.920 | 0.147 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms; driver.publication 2.827ms; driver.publication 2.807ms |
| f79f20fd0ae5820c00000000000000e2 | 83.235 | 6.474 | 5.172 | 0.000 | 0.007 | 4.196 | 1.000 | 10.583 | n/a | 0.247 | 55.531 | n/a | n/a | 0.025 | 11.652 | 0.140 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms; driver.publication 2.807ms; driver.publication 1.150ms |
| f79f20fd0ae5820c00000000000000e1 | 70.205 | 4.673 | 4.686 | 0.000 | 0.014 | 4.526 | 0.953 | 12.584 | n/a | 0.311 | 42.429 | n/a | n/a | 0.028 | 9.373 | 0.134 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms; driver.publication 2.807ms |
| f79f20fd0ae5820c00000000000000e0 | 68.091 | 6.738 | 3.748 | 0.000 | 0.011 | 2.830 | 0.886 | 10.565 | n/a | 0.042 | 43.238 | n/a | n/a | 0.033 | 10.497 | 0.154 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 7.239ms; driver.publication 4.898ms; driver.publication 4.424ms |
| f79f20fd0ae5820c00000000000000df | 59.534 | 11.104 | 1.974 | 0.000 | 0.007 | 4.274 | 1.022 | 10.954 | n/a | 0.225 | 29.932 | n/a | n/a | 0.041 | 13.085 | 0.220 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 4.898ms; driver.publication 4.424ms |
| f79f20fd0ae5820c00000000000000de | 46.236 | 7.722 | 1.776 | 0.000 | 0.012 | 2.076 | 1.902 | 10.242 | n/a | 0.184 | 22.296 | n/a | n/a | 0.024 | 9.511 | 0.206 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 4.898ms |
| f79f20fd0ae5820c00000000000000dd | 32.603 | 7.689 | 0.017 | 0.000 | 0.046 | 4.075 | 1.107 | 0.041 | n/a | 6.220 | 13.364 | n/a | n/a | 0.043 | 7.752 | 0.238 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (216 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.029 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 285.446 | n/a | n/a | n/a | 44.094 | n/a | 5.422 | 285.384 | 18.229 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.460 | 285.443 | 1.000 | 40.460 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc0d0a2dc13ad7c3000000000000027b | 285.523 | 0.313 | n/a | 0.000 | 285.199 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 285.512 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000000027e | 285.462 | 0.029 | n/a | 0.000 | 285.431 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.460 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000000027d | 285.446 | 0.029 | n/a | 0.000 | 285.415 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.443 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000000027c | 285.431 | 0.043 | n/a | 0.000 | 285.384 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 285.427 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000000195 | 284.538 | 0.597 | n/a | 0.000 | 283.932 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 284.529 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | client.reach-decode-and-cache 1.608ms |
| fb105255d56f093600000000000001b5 | 278.952 | 0.042 | n/a | 0.000 | 278.907 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.949 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f093600000000000001b4 | 278.926 | 0.088 | n/a | 0.000 | 278.835 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.922 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f093600000000000001d8 | 277.810 | 0.075 | n/a | 0.000 | 277.731 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.806 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f093600000000000001dc | 277.533 | 0.050 | n/a | 0.000 | 277.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.530 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000000296 | 274.304 | 0.058 | n/a | 0.000 | 274.242 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.300 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000009a79 | 271.657 | 0.030 | n/a | 0.000 | 271.626 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.656 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000009a78 | 271.622 | 0.149 | n/a | 0.000 | 271.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.621 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000009442 | 271.525 | 0.026 | n/a | 0.000 | 271.499 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.524 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000009441 | 271.499 | 0.043 | n/a | 0.000 | 271.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.497 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000009a77 | 271.471 | 0.043 | n/a | 0.000 | 271.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.470 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000009440 | 271.455 | 0.031 | n/a | 0.000 | 271.423 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.454 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000009a75 | 271.442 | 0.330 | n/a | 0.000 | 271.107 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.438 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000009a76 | 271.434 | 0.062 | n/a | 0.000 | 271.370 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.432 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fb105255d56f0936000000000000943f | 271.425 | 0.053 | n/a | 0.000 | 271.371 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.424 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f093600000000000001e5 | 271.381 | 0.061 | n/a | 0.000 | 271.313 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 271.375 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 170.188 | n/a | n/a | n/a | 0.719 | n/a | 0.000 | 169.972 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.918 | 170.184 | 1.000 | 0.918 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f0936000000000001fd9e | 297.629 | 0.247 | n/a | 0.000 | 297.379 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.626 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| fb105255d56f0936000000000000d502 | 170.188 | 0.212 | n/a | 0.000 | 169.972 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 170.184 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| fb105255d56f0936000000000000d530 | 4.732 | 1.707 | n/a | 0.000 | 0.000 | 0.630 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.396 | 1.707 | 0.361 | 2.396 | node-14/thread-4/socket.wait-first-byte | none observed |
| fb105255d56f09360000000000018914 | 0.918 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.918 | 0.000 | 0.000 | 0.918 | uncovered | none observed |
| fb105255d56f09360000000000018939 | 0.757 | 0.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.704 | 0.929 | 0.053 | node-14/thread-4/reader.observe | none observed |
| fb105255d56f093600000000000116bf | 0.721 | 0.719 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.719 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f09360000000000010300 | 0.701 | 0.699 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.699 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000199fc | 0.619 | 0.617 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.617 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000195dd | 0.525 | 0.522 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.522 | 0.995 | 0.002 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f0936000000000000d4f1 | 0.511 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.511 | 0.000 | 0.000 | 0.511 | uncovered | none observed |
| fb105255d56f0936000000000001e74e | 0.481 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.481 | 0.000 | 0.000 | 0.481 | uncovered | none observed |
| fb105255d56f0936000000000001887d | 0.468 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.468 | 0.000 | 0.000 | 0.468 | uncovered | none observed |
| fb105255d56f0936000000000000e1fe | 0.462 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.462 | 0.000 | 0.000 | 0.462 | uncovered | none observed |
| fb105255d56f09360000000000018b9f | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| fb105255d56f09360000000000018bab | 0.449 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 | uncovered | none observed |
| fb105255d56f093600000000000189fc | 0.440 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.440 | 0.000 | 0.000 | 0.440 | uncovered | none observed |
| fb105255d56f09360000000000014318 | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| fb105255d56f0936000000000001dee5 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| fb105255d56f0936000000000001879a | 0.383 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.383 | 0.000 | 0.000 | 0.383 | uncovered | none observed |
| fb105255d56f093600000000000156c1 | 0.369 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.369 | 0.000 | 0.000 | 0.369 | uncovered | none observed |

## P1 / L4 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 302.892 | n/a | n/a | n/a | 3.207 | n/a | 0.000 | 302.767 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.901 | 302.890 | 1.000 | 1.901 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc0d0a2dc13ad7c3000000000000ce2d | 303.034 | 0.168 | n/a | 0.000 | 302.860 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 303.028 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| fb105255d56f093600000000000206f2 | 302.938 | 0.169 | n/a | 0.000 | 302.767 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.936 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| fb105255d56f093600000000000206f3 | 302.892 | 0.035 | n/a | 0.000 | 302.855 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.890 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 6fe5674082e52ffc000000000000de28 | 302.785 | 0.159 | n/a | 0.000 | 302.622 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 302.781 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| cc0d0a2dc13ad7c3000000000000c4bc | 87.411 | 0.343 | n/a | 0.000 | 87.058 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 87.401 | 1.000 | 0.009 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 6fe5674082e52ffc000000000000d0ab | 86.912 | 0.219 | n/a | 0.000 | 86.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 86.908 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| fb105255d56f0936000000000001fda1 | 86.558 | 0.079 | n/a | 0.000 | 86.477 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 86.556 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| fb105255d56f0936000000000001fe4f | 54.804 | 45.179 | n/a | 6.154 | 0.000 | 1.551 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.920 | 51.333 | 0.937 | 1.920 | node-14/thread-4/reader.execute | none observed |
| cc0d0a2dc13ad7c3000000000000c4c5 | 30.464 | 22.344 | n/a | 5.726 | 0.000 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.901 | 28.069 | 0.921 | 1.901 | node-14/thread-6/reader.execute | replica.apply-delta 0.026ms |
| 6fe5674082e52ffc000000000000d0e5 | 4.281 | 2.528 | n/a | 0.000 | 0.000 | 0.631 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.122 | 2.528 | 0.591 | 1.122 | node-14/thread-5/reader.execute | none observed |
| cc0d0a2dc13ad7c3000000000000d075 | 3.211 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.211 | 0.000 | 0.000 | 3.211 | uncovered | none observed |
| fb105255d56f09360000000000030d19 | 3.208 | 3.207 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.207 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000000e0c6 | 2.520 | 2.518 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.518 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| fb105255d56f0936000000000002ae44 | 1.327 | 1.326 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.326 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000001544d | 1.264 | 1.263 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.263 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| cc0d0a2dc13ad7c3000000000000f42e | 1.053 | 1.048 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 1.048 | 0.995 | 0.006 | node-14/thread-6/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000000e5be | 0.931 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.931 | 0.000 | 0.000 | 0.931 | uncovered | none observed |
| fb105255d56f09360000000000020846 | 0.826 | 0.825 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.825 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| cc0d0a2dc13ad7c30000000000010d8a | 0.786 | 0.779 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.779 | 0.992 | 0.007 | node-14/thread-6/reader.execute | none observed |
| fb105255d56f09360000000000022aef | 0.784 | 0.782 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.782 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L16 / read (256 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 339.860 | n/a | n/a | n/a | 6.050 | n/a | 0.000 | 339.839 | 0.463 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.297 | 339.859 | 1.000 | 2.297 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc0d0a2dc13ad7c30000000000021974 | 341.170 | 0.111 | n/a | 0.000 | 341.057 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.168 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| fb105255d56f09360000000000038ca4 | 339.865 | 0.058 | n/a | 0.000 | 339.806 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.864 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| fb105255d56f09360000000000038ca7 | 339.860 | 0.013 | n/a | 0.000 | 339.846 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.859 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| fb105255d56f09360000000000038ca6 | 339.854 | 0.013 | n/a | 0.000 | 339.839 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.853 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| fb105255d56f09360000000000038ca5 | 339.844 | 0.015 | n/a | 0.000 | 339.828 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 339.843 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| fb105255d56f09360000000000038ca3 | 339.840 | 0.101 | n/a | 0.000 | 339.731 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 339.832 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 6fe5674082e52ffc00000000000224e5 | 339.296 | 0.077 | n/a | 0.000 | 339.215 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 339.292 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 6fe5674082e52ffc00000000000224e4 | 339.295 | 0.031 | n/a | 0.000 | 339.262 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 339.293 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 6fe5674082e52ffc00000000000224e2 | 339.294 | 0.054 | n/a | 0.000 | 339.237 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 339.292 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 6fe5674082e52ffc00000000000224e3 | 339.289 | 0.033 | n/a | 0.000 | 339.252 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 339.286 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 6fe5674082e52ffc00000000000224e1 | 339.215 | 0.241 | n/a | 0.000 | 338.965 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 339.206 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| fb105255d56f09360000000000038ce6 | 338.589 | 0.020 | n/a | 0.000 | 338.567 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 338.587 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| cc0d0a2dc13ad7c30000000000021975 | 338.445 | 0.095 | n/a | 0.000 | 338.344 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 338.439 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| cc0d0a2dc13ad7c30000000000021976 | 338.371 | 0.029 | n/a | 0.000 | 338.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.370 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| cc0d0a2dc13ad7c30000000000021977 | 338.366 | 0.022 | n/a | 0.000 | 338.343 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.365 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| cc0d0a2dc13ad7c30000000000021978 | 338.361 | 0.015 | n/a | 0.000 | 338.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 338.361 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| fb105255d56f09360000000000038c57 | 272.708 | 0.012 | n/a | 0.000 | 272.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.707 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f09360000000000038c56 | 272.702 | 0.013 | n/a | 0.000 | 272.688 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.701 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f09360000000000038c55 | 272.693 | 0.014 | n/a | 0.000 | 272.679 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 272.693 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f09360000000000038c54 | 272.686 | 0.014 | n/a | 0.000 | 272.671 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.685 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |

## P1 / L64 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 342.917 | n/a | n/a | n/a | 8.801 | n/a | 0.000 | 342.870 | 0.594 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.196 | 342.916 | 1.000 | 11.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc0d0a2dc13ad7c3000000000002c239 | 343.119 | 0.364 | n/a | 0.000 | 342.748 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 343.112 | 1.000 | 0.007 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000002c23d | 342.929 | 0.083 | n/a | 0.000 | 342.845 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.928 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000002c23a | 342.917 | 0.045 | n/a | 0.000 | 342.870 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.916 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000002c23c | 342.909 | 0.014 | n/a | 0.000 | 342.895 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.909 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c3000000000002c23b | 342.904 | 0.016 | n/a | 0.000 | 342.887 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.903 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000002ccd4 | 341.129 | 0.183 | n/a | 0.000 | 340.936 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 341.119 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000002ccd8 | 341.094 | 0.018 | n/a | 0.000 | 341.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 341.092 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000002ccd7 | 341.087 | 0.017 | n/a | 0.000 | 341.068 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.085 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000002ccd5 | 341.081 | 0.022 | n/a | 0.000 | 341.057 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.079 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000002ccd6 | 341.080 | 0.017 | n/a | 0.000 | 341.061 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 341.079 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000043596 | 341.011 | 0.348 | n/a | 0.000 | 340.660 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 341.008 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000043597 | 340.824 | 0.113 | n/a | 0.000 | 340.710 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.823 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f0936000000000004359a | 340.752 | 0.015 | n/a | 0.000 | 340.736 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.751 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f0936000000000004359b | 340.752 | 0.017 | n/a | 0.000 | 340.734 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.751 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000043599 | 340.749 | 0.015 | n/a | 0.000 | 340.733 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.748 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000043598 | 340.744 | 0.017 | n/a | 0.000 | 340.725 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 340.743 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f0936000000000004d9c1 | 287.345 | 0.013 | n/a | 0.000 | 287.331 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.344 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| fb105255d56f0936000000000004d9c0 | 287.337 | 0.013 | n/a | 0.000 | 287.323 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.336 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| fb105255d56f0936000000000004d9bf | 287.331 | 0.023 | n/a | 0.000 | 287.308 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.330 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| fb105255d56f0936000000000004d9be | 287.317 | 0.015 | n/a | 0.000 | 287.301 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.316 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |

## P1 / L256 / read (218 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 270.711 | n/a | n/a | n/a | 3.992 | n/a | 0.000 | 270.605 | 0.471 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.478 | 270.709 | 1.000 | 12.478 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc0d0a2dc13ad7c30000000000040d5c | 271.543 | 0.444 | n/a | 0.000 | 271.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.540 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000058bff | 270.767 | 0.042 | n/a | 0.000 | 270.723 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.766 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000058bfe | 270.711 | 0.104 | n/a | 0.000 | 270.605 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.709 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000041203 | 270.688 | 0.163 | n/a | 0.000 | 270.522 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.685 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000058c1b | 270.306 | 0.035 | n/a | 0.000 | 270.268 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 270.302 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000058c1c | 270.278 | 0.021 | n/a | 0.000 | 270.254 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.275 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000058c1d | 270.266 | 0.019 | n/a | 0.000 | 270.245 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.264 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| fb105255d56f09360000000000058c1e | 270.256 | 0.021 | n/a | 0.000 | 270.233 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.254 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000040d69 | 269.605 | 0.105 | n/a | 0.000 | 269.490 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 269.595 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000040d6a | 269.551 | 0.038 | n/a | 0.000 | 269.510 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.549 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000040d6b | 269.548 | 0.021 | n/a | 0.000 | 269.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.546 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000040d6c | 269.543 | 0.020 | n/a | 0.000 | 269.522 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.542 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000004121c | 267.478 | 0.104 | n/a | 0.000 | 267.364 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 267.468 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000004121d | 267.367 | 0.024 | n/a | 0.000 | 267.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.365 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000041240 | 266.451 | 0.019 | n/a | 0.000 | 266.430 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.449 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc0000000000041241 | 266.447 | 0.014 | n/a | 0.000 | 266.432 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.446 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc00000000000412c9 | 265.293 | 0.015 | n/a | 0.000 | 265.278 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.292 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc00000000000412c8 | 265.289 | 0.015 | n/a | 0.000 | 265.273 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.288 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc00000000000412c6 | 265.280 | 0.045 | n/a | 0.000 | 265.234 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.279 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc00000000000412c7 | 265.278 | 0.016 | n/a | 0.000 | 265.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.277 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (285 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 21.931 | n/a | n/a | n/a | 5.089 | n/a | 0.000 | 0.000 | 0.587 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.150 | 5.089 | 1.000 | 18.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f0936000000000005b592 | 58.564 | 20.925 | n/a | 1.731 | 0.000 | 0.820 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.089 | 22.656 | 0.387 | 35.089 | node-14/thread-4/socket.wait-first-byte | none observed |
| 6fe5674082e52ffc0000000000043a5d | 47.113 | 10.956 | n/a | 1.450 | 0.000 | 0.587 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.119 | 12.407 | 0.263 | 34.119 | node-14/thread-5/socket.wait-first-byte | none observed |
| cc0d0a2dc13ad7c3000000000004378d | 21.931 | 2.934 | n/a | 0.000 | 0.000 | 0.848 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.150 | 2.934 | 0.134 | 18.150 | node-14/thread-6/socket.wait-first-byte | none observed |
| cc0d0a2dc13ad7c3000000000004e8ea | 5.091 | 5.089 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.089 | 1.000 | 0.002 | node-14/thread-6/replica.pull-at | none observed |
| cc0d0a2dc13ad7c3000000000004e8eb | 5.090 | 5.081 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 5.081 | 0.998 | 0.009 | node-14/thread-6/replica.pull-at | none observed |
| cc0d0a2dc13ad7c3000000000004e8ec | 5.082 | 5.071 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 5.071 | 0.998 | 0.010 | node-14/thread-6/replica.pull-at | none observed |
| fb105255d56f09360000000000065f7d | 3.594 | 3.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.593 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000004f899 | 3.430 | 3.426 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.426 | 0.999 | 0.005 | node-14/thread-5/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000004f84c | 3.351 | 3.348 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.348 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000004f84d | 3.318 | 3.304 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.304 | 0.996 | 0.014 | node-14/thread-5/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000004f84e | 3.307 | 3.292 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.292 | 0.995 | 0.015 | node-14/thread-5/replica.pull-at | none observed |
| cc0d0a2dc13ad7c3000000000004df9c | 3.296 | 3.294 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.294 | 0.999 | 0.002 | node-14/thread-6/replica.pull-at | none observed |
| cc0d0a2dc13ad7c30000000000056cfc | 3.289 | 3.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.288 | 1.000 | 0.001 | node-14/thread-6/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000004f84f | 3.275 | 3.259 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.259 | 0.995 | 0.016 | node-14/thread-5/replica.pull-at | none observed |
| 6fe5674082e52ffc000000000004ef09 | 3.272 | 3.247 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.247 | 0.992 | 0.025 | node-14/thread-5/replica.pull-at | none observed |
| fb105255d56f093600000000000665f0 | 3.250 | 3.237 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.237 | 0.996 | 0.014 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000665ef | 3.243 | 3.239 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.239 | 0.999 | 0.005 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000665f1 | 3.230 | 3.216 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.216 | 0.996 | 0.014 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000665f2 | 3.224 | 3.209 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.209 | 0.995 | 0.015 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f09360000000000065ec4 | 3.213 | 3.209 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.209 | 0.999 | 0.005 | node-14/thread-4/replica.pull-at | none observed |

## P1 / recovery / read (207 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 322.827 | n/a | n/a | n/a | 8.208 | n/a | 0.000 | 322.812 | 0.471 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.546 | 322.827 | 1.000 | 4.546 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f0936000000000007781c | 322.845 | 0.016 | n/a | 0.000 | 322.827 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 322.843 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| fb105255d56f0936000000000007781b | 322.839 | 0.013 | n/a | 0.000 | 322.824 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.838 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| fb105255d56f0936000000000007781a | 322.827 | 0.015 | n/a | 0.000 | 322.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 322.827 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| fb105255d56f09360000000000077819 | 322.812 | 0.018 | n/a | 0.000 | 322.794 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.811 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| fb105255d56f09360000000000077818 | 322.776 | 0.025 | n/a | 0.000 | 322.750 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.775 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| fb105255d56f09360000000000077817 | 322.737 | 0.156 | n/a | 0.000 | 322.576 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 322.732 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 6fe5674082e52ffc000000000005ee98 | 321.985 | 0.077 | n/a | 0.000 | 321.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 321.983 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 6fe5674082e52ffc000000000005ee99 | 321.965 | 0.023 | n/a | 0.000 | 321.940 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.963 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 6fe5674082e52ffc000000000005ee97 | 321.933 | 0.154 | n/a | 0.000 | 321.775 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 321.929 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 6fe5674082e52ffc000000000005eeaa | 321.582 | 0.034 | n/a | 0.000 | 321.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.581 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 6fe5674082e52ffc000000000005eeab | 321.562 | 0.018 | n/a | 0.000 | 321.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 321.560 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| cc0d0a2dc13ad7c300000000000602cf | 319.582 | 0.051 | n/a | 0.000 | 319.530 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.581 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| cc0d0a2dc13ad7c300000000000602ce | 319.550 | 0.017 | n/a | 0.000 | 319.532 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.549 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| cc0d0a2dc13ad7c300000000000602cd | 319.539 | 0.017 | n/a | 0.000 | 319.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.538 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| cc0d0a2dc13ad7c300000000000602cc | 319.524 | 0.029 | n/a | 0.000 | 319.494 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.523 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| cc0d0a2dc13ad7c300000000000602cb | 319.459 | 0.221 | n/a | 0.000 | 319.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 319.456 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 6fe5674082e52ffc000000000005f627 | 271.589 | 0.194 | n/a | 0.000 | 271.392 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.586 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc000000000005f626 | 271.411 | 0.280 | n/a | 0.000 | 271.127 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.407 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000060be7 | 271.076 | 0.049 | n/a | 0.000 | 271.026 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.075 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000060be6 | 270.963 | 0.134 | n/a | 0.000 | 270.827 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.960 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (162 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 1.482 | n/a | n/a | n/a | 1.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 1.481 | 0.998 | 0.497 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f0936000000000007b84b | 4.759 | 2.177 | n/a | 0.000 | 0.000 | 0.439 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.143 | 2.177 | 0.457 | 2.143 | node-14/thread-4/socket.wait-first-byte | none observed |
| fb105255d56f0936000000000007bbda | 1.482 | 1.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.481 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000007c97c | 1.126 | 1.124 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.124 | 0.997 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f09360000000000086014 | 1.038 | 1.036 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.036 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000008a4ed | 1.015 | 1.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.013 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000007d4e5 | 0.905 | 0.903 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.903 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000976d1 | 0.813 | 0.811 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.811 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000008816c | 0.635 | 0.620 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.620 | 0.977 | 0.015 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000928ff | 0.580 | 0.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.577 | 0.995 | 0.003 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f09360000000000084ab2 | 0.568 | 0.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.566 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000008e996 | 0.556 | 0.554 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.554 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000007c7d3 | 0.531 | 0.528 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.528 | 0.994 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f09360000000000084092 | 0.525 | 0.523 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.523 | 0.996 | 0.002 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f09360000000000087174 | 0.521 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.519 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f09360000000000086a86 | 0.511 | 0.510 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.510 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000008957f | 0.497 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 | uncovered | none observed |
| fb105255d56f09360000000000090a38 | 0.490 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.490 | 0.000 | 0.000 | 0.490 | uncovered | none observed |
| fb105255d56f0936000000000007c339 | 0.429 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.429 | 0.000 | 0.000 | 0.429 | uncovered | none observed |
| fb105255d56f09360000000000080e56 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| fb105255d56f09360000000000082fe5 | 0.414 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | uncovered | none observed |

## P4 / p4h1 / read (183 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.809 | n/a | n/a | n/a | 0.807 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 0.807 | 0.994 | 0.497 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f0936000000000009c073 | 29.711 | 18.578 | n/a | 2.157 | 0.000 | 0.618 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.357 | 20.735 | 0.698 | 8.357 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000b6b49 | 0.809 | 0.807 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.807 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000a22fd | 0.604 | 0.601 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.601 | 0.994 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f0936000000000009d039 | 0.532 | 0.503 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 0.503 | 0.945 | 0.029 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f0936000000000009c4ae | 0.497 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 | uncovered | none observed |
| fb105255d56f093600000000000a1821 | 0.497 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.497 | 0.000 | 0.000 | 0.497 | uncovered | none observed |
| fb105255d56f093600000000000a115f | 0.488 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 | uncovered | none observed |
| fb105255d56f093600000000000acec1 | 0.460 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.460 | 0.000 | 0.000 | 0.460 | uncovered | none observed |
| fb105255d56f0936000000000009d064 | 0.438 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.438 | 0.000 | 0.000 | 0.438 | uncovered | none observed |
| fb105255d56f093600000000000b605f | 0.392 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | uncovered | none observed |
| fb105255d56f093600000000000a2b09 | 0.391 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.391 | 0.000 | 0.000 | 0.391 | uncovered | none observed |
| fb105255d56f093600000000000b59f4 | 0.367 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | uncovered | none observed |
| fb105255d56f093600000000000a4301 | 0.366 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | uncovered | none observed |
| fb105255d56f093600000000000bc8c7 | 0.363 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | uncovered | none observed |
| fb105255d56f093600000000000a2715 | 0.362 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.362 | 0.000 | 0.000 | 0.362 | uncovered | none observed |
| fb105255d56f093600000000000a81ac | 0.357 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | uncovered | none observed |
| fb105255d56f093600000000000a1953 | 0.351 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.351 | 0.000 | 0.000 | 0.351 | uncovered | none observed |
| fb105255d56f093600000000000a18e3 | 0.349 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.349 | 0.000 | 0.000 | 0.349 | uncovered | none observed |
| fb105255d56f093600000000000b412f | 0.343 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 | uncovered | none observed |
| fb105255d56f093600000000000c1c55 | 0.341 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.341 | 0.000 | 0.000 | 0.341 | uncovered | none observed |

## P4 / p4h3 / read (175 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 2.190 | n/a | n/a | n/a | 2.185 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.466 | 2.185 | 0.997 | 0.466 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f093600000000000c29e7 | 10.550 | 2.347 | n/a | 0.000 | 0.000 | 0.538 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.664 | 2.347 | 0.222 | 7.664 | node-14/thread-4/socket.wait-first-byte | none observed |
| fb105255d56f093600000000000c75f2 | 2.190 | 2.185 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.185 | 0.997 | 0.006 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000d8c6a | 0.876 | 0.875 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.875 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000d75d7 | 0.762 | 0.760 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.760 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000e48f3 | 0.718 | 0.715 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.715 | 0.996 | 0.003 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000ce5f7 | 0.649 | 0.647 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.647 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000c6746 | 0.586 | 0.584 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.584 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000cd852 | 0.532 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.531 | 0.997 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000c29e8 | 0.526 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.511 | 0.971 | 0.015 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000e40f7 | 0.466 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.466 | 0.000 | 0.000 | 0.466 | uncovered | none observed |
| fb105255d56f093600000000000da816 | 0.449 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.449 | 0.000 | 0.000 | 0.449 | uncovered | none observed |
| fb105255d56f093600000000000ce35a | 0.442 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 | uncovered | none observed |
| fb105255d56f093600000000000d35e2 | 0.430 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.430 | 0.000 | 0.000 | 0.430 | uncovered | none observed |
| fb105255d56f093600000000000dac9e | 0.429 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.429 | 0.000 | 0.000 | 0.429 | uncovered | none observed |
| fb105255d56f093600000000000e64c6 | 0.420 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | uncovered | none observed |
| fb105255d56f093600000000000cad51 | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| fb105255d56f093600000000000da81a | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| fb105255d56f093600000000000c36a7 | 0.398 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | uncovered | none observed |
| fb105255d56f093600000000000d0f40 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| fb105255d56f093600000000000c760b | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |

## P4 / p4h10 / read (167 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.692 | n/a | n/a | n/a | 0.690 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.469 | 0.690 | 0.997 | 0.469 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f093600000000000e651b | 10.842 | 3.457 | n/a | 0.000 | 0.000 | 0.465 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.920 | 3.457 | 0.319 | 6.920 | node-14/thread-4/socket.wait-first-byte | none observed |
| fb105255d56f093600000000000f2bfe | 0.692 | 0.690 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.690 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000f9184 | 0.638 | 0.636 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.636 | 0.997 | 0.002 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000000e7b7c | 0.631 | 0.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.629 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000efee5 | 0.576 | 0.574 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.574 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| fb105255d56f093600000000000e9c32 | 0.515 | 0.511 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.511 | 0.992 | 0.004 | node-14/thread-4/reader.execute | none observed |
| fb105255d56f093600000000001032d6 | 0.469 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | uncovered | none observed |
| fb105255d56f093600000000000fca61 | 0.452 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.452 | 0.000 | 0.000 | 0.452 | uncovered | none observed |
| fb105255d56f093600000000000e651c | 0.450 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.450 | 0.000 | 0.000 | 0.450 | uncovered | none observed |
| fb105255d56f09360000000000107164 | 0.444 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | uncovered | none observed |
| fb105255d56f093600000000000e84f7 | 0.440 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.440 | 0.000 | 0.000 | 0.440 | uncovered | none observed |
| fb105255d56f093600000000000f7344 | 0.435 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | uncovered | none observed |
| fb105255d56f093600000000000f8e3a | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |
| fb105255d56f093600000000000f8caf | 0.408 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | uncovered | none observed |
| fb105255d56f093600000000000e8142 | 0.404 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.404 | 0.000 | 0.000 | 0.404 | uncovered | none observed |
| fb105255d56f093600000000000ef146 | 0.397 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.397 | 0.000 | 0.000 | 0.397 | uncovered | none observed |
| fb105255d56f093600000000000f8f5c | 0.393 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.393 | 0.000 | 0.000 | 0.393 | uncovered | none observed |
| fb105255d56f09360000000000104bcc | 0.384 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 | uncovered | none observed |
| fb105255d56f093600000000001047a8 | 0.381 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.381 | 0.000 | 0.000 | 0.381 | uncovered | none observed |
| fb105255d56f09360000000000105298 | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |

## P5 / presweep / read (198 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.052 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 273.544 | n/a | n/a | n/a | 17.940 | n/a | 5.102 | 273.529 | 0.536 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.690 | 273.543 | 1.000 | 5.690 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f093600000000001171cb | 273.558 | 0.014 | n/a | 0.000 | 273.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.557 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f093600000000001171ca | 273.544 | 0.014 | n/a | 0.000 | 273.529 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.543 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f093600000000001171c9 | 273.539 | 0.014 | n/a | 0.000 | 273.524 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.538 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f093600000000001171c8 | 273.533 | 0.021 | n/a | 0.000 | 273.510 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.531 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f093600000000001171c7 | 273.525 | 0.113 | n/a | 0.000 | 273.411 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.523 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fb105255d56f093600000000001171d4 | 273.432 | 0.026 | n/a | 0.000 | 273.404 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.431 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| cc0d0a2dc13ad7c300000000000700ab | 271.581 | 0.157 | n/a | 0.000 | 271.421 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.578 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| cc0d0a2dc13ad7c300000000000700ac | 271.491 | 0.035 | n/a | 0.000 | 271.454 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.489 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 6fe5674082e52ffc000000000006f4cd | 271.356 | 0.015 | n/a | 0.000 | 271.340 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.354 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 6fe5674082e52ffc000000000006f4cc | 271.352 | 0.029 | n/a | 0.000 | 271.322 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.351 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 6fe5674082e52ffc000000000006f4cb | 271.319 | 0.018 | n/a | 0.000 | 271.299 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.317 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 6fe5674082e52ffc000000000006f4ca | 271.308 | 0.035 | n/a | 0.000 | 271.271 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.306 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 6fe5674082e52ffc000000000006f4c9 | 271.303 | 0.107 | n/a | 0.000 | 271.193 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.300 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| cc0d0a2dc13ad7c300000000000700cb | 270.451 | 0.023 | n/a | 0.000 | 270.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.449 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| cc0d0a2dc13ad7c300000000000700ca | 270.451 | 0.029 | n/a | 0.000 | 270.419 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.448 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| cc0d0a2dc13ad7c300000000000700cf | 270.218 | 0.061 | n/a | 0.000 | 270.155 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.216 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| cc0d0a2dc13ad7c30000000000063c74 | 96.257 | 0.019 | n/a | 0.000 | 96.237 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 96.256 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000063c73 | 96.257 | 0.025 | n/a | 0.000 | 96.230 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 96.255 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| cc0d0a2dc13ad7c30000000000063c72 | 96.231 | 0.135 | n/a | 0.000 | 96.094 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 96.229 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 6fe5674082e52ffc00000000000629f7 | 95.602 | 0.500 | n/a | 0.000 | 95.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 95.597 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P5 / sweep / read (86 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.374 | n/a | n/a | n/a | 2.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 2.278 | 0.995 | 0.014 |
| p99 | 29.504 | n/a | n/a | n/a | 22.550 | n/a | 5.244 | 0.000 | 3.829 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.108 | 27.794 | 1.000 | 6.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f093600000000001174e3 | 29.504 | 22.550 | n/a | 5.244 | 0.000 | 0.439 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.271 | 27.794 | 0.942 | 1.271 | node-14/thread-4/reader.execute | none observed |
| 6fe5674082e52ffc000000000006f837 | 11.629 | 1.692 | n/a | 0.000 | 0.000 | 3.829 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.108 | 1.692 | 0.146 | 6.108 | node-14/thread-5/socket.wait-first-byte | none observed |
| 6890f642bb8d2ef90000000000000053 | 7.103 | 2.221 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.089 | 0.998 | 0.014 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000054 | 7.040 | 2.151 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 7.018 | 0.997 | 0.021 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000055 | 6.997 | 2.104 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 6.971 | 0.996 | 0.025 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000273 | 6.981 | 6.962 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.962 | 0.997 | 0.019 | node-14/thread-7/replica.pull-at | none observed |
| 6890f642bb8d2ef90000000000000056 | 6.950 | 2.053 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 6.921 | 0.996 | 0.029 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000057 | 6.909 | 2.008 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.033 | 6.875 | 0.995 | 0.033 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000058 | 6.864 | 1.959 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.037 | 6.827 | 0.995 | 0.037 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000059 | 6.820 | 1.912 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.041 | 6.780 | 0.994 | 0.041 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000274 | 6.794 | 6.770 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.770 | 0.996 | 0.024 | node-14/thread-7/replica.pull-at | none observed |
| 6890f642bb8d2ef9000000000000005a | 6.777 | 1.865 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 6.733 | 0.993 | 0.044 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef9000000000000005b | 6.734 | 1.819 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.047 | 6.687 | 0.993 | 0.047 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000275 | 6.729 | 6.701 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 6.701 | 0.996 | 0.029 | node-14/thread-7/replica.pull-at | none observed |
| 6890f642bb8d2ef9000000000000005c | 6.685 | 1.766 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 6.634 | 0.992 | 0.051 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000276 | 6.650 | 6.619 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 6.619 | 0.995 | 0.031 | node-14/thread-7/replica.pull-at | none observed |
| 6890f642bb8d2ef9000000000000005d | 6.635 | 1.713 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 6.581 | 0.992 | 0.054 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef90000000000000277 | 6.590 | 6.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.558 | 0.995 | 0.032 | node-14/thread-7/replica.pull-at | none observed |
| 6890f642bb8d2ef9000000000000005e | 6.580 | 1.655 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.058 | 6.522 | 0.991 | 0.058 | node-14/thread-7/node.gc | none observed |
| 6890f642bb8d2ef9000000000000005f | 6.532 | 1.603 | n/a | 4.868 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.061 | 6.471 | 0.991 | 0.061 | node-14/thread-7/node.gc | none observed |

## P1 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.078 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 |
| p99 | 0.097 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb105255d56f09360000000000117cb6 | 0.097 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | uncovered | none observed |
| 6fe5674082e52ffc000000000006ff8b | 0.096 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | uncovered | none observed |
| fb105255d56f09360000000000117cb7 | 0.090 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | uncovered | none observed |
| fb105255d56f09360000000000117cb8 | 0.082 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | uncovered | none observed |
| 6fe5674082e52ffc000000000006ff8c | 0.078 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | uncovered | none observed |
| fb105255d56f09360000000000117cb9 | 0.075 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | uncovered | none observed |
| fb105255d56f09360000000000117cba | 0.067 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.067 | 0.000 | 0.000 | 0.067 | uncovered | none observed |
| fb105255d56f09360000000000117cbb | 0.042 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.042 | 0.000 | 0.000 | 0.042 | uncovered | none observed |

## P3 / outside-phases / internal (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 599.749 | n/a | n/a | n/a | 2.902 | n/a | 0.000 | 0.000 | 0.992 | 590.343 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 0.172 | 2.902 | 0.005 | 0.172 |
| p99 | 1005.261 | n/a | n/a | n/a | 90.129 | n/a | 3.122 | 0.000 | 1.707 | 1002.663 | 1.770 | n/a | 3.725 | 0.000 | n/a | n/a | 14.111 | 93.251 | 0.860 | 14.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000018 | 1005.261 | 0.208 | n/a | 0.000 | 0.000 | 1.065 | 1002.663 | 0.021 | n/a | 0.149 | 0.000 | n/a | n/a | 1.155 | 0.208 | 0.000 | 1.155 | gw-r/thread-47/journal/page | none observed |
| e8748cd0754faa67000000000000007e | 1005.054 | 4.349 | n/a | 0.000 | 0.000 | 0.860 | 999.261 | 0.437 | n/a | 0.074 | 0.000 | n/a | n/a | 0.072 | 4.349 | 0.004 | 0.072 | gw-r/thread-48/journal/page | none observed |
| e8748cd0754faa670000000000000017 | 1004.780 | 0.185 | n/a | 0.000 | 0.000 | 1.395 | 1001.689 | 0.016 | n/a | 0.265 | 0.000 | n/a | n/a | 1.230 | 0.185 | 0.000 | 1.230 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa670000000000000019 | 1003.586 | 0.244 | n/a | 0.000 | 0.000 | 0.878 | 1001.148 | 0.011 | n/a | 0.130 | 0.000 | n/a | n/a | 1.176 | 0.244 | 0.000 | 1.176 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa670000000000000052 | 1002.893 | 0.152 | n/a | 0.000 | 0.000 | 0.651 | 1000.838 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 1.140 | 0.152 | 0.000 | 1.140 | gw-r/thread-64/journal/page | none observed |
| e8748cd0754faa670000000000000051 | 686.933 | 2.902 | n/a | 0.000 | 0.000 | 0.747 | 681.348 | 1.770 | n/a | 0.081 | 0.000 | n/a | n/a | 0.085 | 2.902 | 0.004 | 0.085 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa67000000000000007f | 664.820 | 2.201 | n/a | 0.000 | 0.000 | 1.170 | 657.615 | 0.011 | n/a | 3.725 | 0.000 | n/a | n/a | 0.098 | 2.201 | 0.003 | 0.098 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa67000000000000005e | 599.749 | 7.470 | n/a | 0.923 | 0.000 | 0.770 | 590.343 | 0.026 | n/a | 0.074 | 0.000 | n/a | n/a | 0.143 | 8.393 | 0.014 | 0.143 | gw-r/thread-50/journal/page | none observed |
| e8748cd0754faa670000000000000062 | 516.160 | 2.334 | n/a | 0.000 | 0.000 | 1.707 | 511.822 | 0.018 | n/a | 0.106 | 0.000 | n/a | n/a | 0.172 | 2.334 | 0.005 | 0.172 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa67000000000000005d | 220.562 | 5.340 | n/a | 0.000 | 0.000 | 1.108 | 213.838 | 0.044 | n/a | 0.055 | 0.000 | n/a | n/a | 0.177 | 5.340 | 0.024 | 0.177 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa670000000000000060 | 190.767 | 4.392 | n/a | 0.000 | 0.000 | 0.992 | 185.135 | 0.054 | n/a | 0.083 | 0.000 | n/a | n/a | 0.112 | 4.392 | 0.023 | 0.112 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa67000000000000007d | 188.267 | 2.660 | n/a | 0.000 | 0.000 | 0.710 | 184.788 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.069 | 2.660 | 0.014 | 0.069 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa67000000000000005c | 144.551 | 3.038 | n/a | 0.000 | 0.000 | 1.118 | 140.188 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.097 | 3.038 | 0.021 | 0.097 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa67000000000000005b | 108.429 | 90.129 | n/a | 3.122 | 0.000 | 1.066 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.111 | 93.251 | 0.860 | 14.111 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa67000000000000007b | 12.176 | 8.188 | n/a | 0.000 | 0.000 | 0.573 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.415 | 8.188 | 0.672 | 3.415 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 331.357 | n/a | n/a | n/a | 2.268 | n/a | 0.000 | 0.000 | 0.946 | 328.248 | 0.022 | n/a | 0.132 | 0.000 | n/a | n/a | 0.166 | 2.268 | 0.007 | 0.166 |
| p99 | 620.979 | n/a | n/a | n/a | 32.903 | n/a | 7.114 | 0.000 | 1.502 | 617.418 | 0.202 | n/a | 0.145 | 0.000 | n/a | n/a | 0.389 | 40.016 | 0.216 | 0.389 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000001d | 620.979 | 2.268 | n/a | 0.000 | 0.000 | 0.946 | 617.418 | 0.049 | n/a | 0.132 | 0.000 | n/a | n/a | 0.166 | 2.268 | 0.004 | 0.166 | gw-r/thread-64/journal/page | none observed |
| e8748cd0754faa67000000000000001c | 570.314 | 8.107 | n/a | 0.000 | 0.000 | 1.502 | 560.082 | 0.202 | n/a | 0.145 | 0.000 | n/a | n/a | 0.277 | 8.107 | 0.014 | 0.277 | gw-r/thread-47/journal/page | none observed |
| e8748cd0754faa67000000000000001e | 331.357 | 2.238 | n/a | 0.000 | 0.000 | 0.616 | 328.248 | 0.019 | n/a | 0.142 | 0.000 | n/a | n/a | 0.095 | 2.238 | 0.007 | 0.095 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa67000000000000001a | 184.965 | 32.903 | n/a | 7.114 | 0.000 | 1.098 | 143.336 | 0.022 | n/a | 0.104 | 0.000 | n/a | n/a | 0.389 | 40.016 | 0.216 | 0.389 | gw-r/thread-51/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 306.224 | n/a | n/a | n/a | 2.459 | n/a | 0.000 | 0.000 | 0.865 | 302.331 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.080 | 2.459 | 0.007 | 0.080 |
| p99 | 849.569 | n/a | n/a | n/a | 4.528 | n/a | 0.000 | 0.000 | 1.224 | 847.090 | 0.018 | n/a | 0.144 | 0.000 | n/a | n/a | 0.130 | 4.528 | 0.018 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000023 | 849.569 | 1.695 | n/a | 0.000 | 0.000 | 0.595 | 847.090 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.083 | 1.695 | 0.002 | 0.083 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa670000000000000020 | 696.536 | 4.528 | n/a | 0.000 | 0.000 | 0.865 | 690.851 | 0.018 | n/a | 0.144 | 0.000 | n/a | n/a | 0.130 | 4.528 | 0.007 | 0.130 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000021 | 306.224 | 2.459 | n/a | 0.000 | 0.000 | 1.224 | 302.331 | 0.017 | n/a | 0.113 | 0.000 | n/a | n/a | 0.080 | 2.459 | 0.008 | 0.080 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000024 | 146.158 | 2.635 | n/a | 0.000 | 0.000 | 0.891 | 142.447 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.080 | 2.635 | 0.018 | 0.080 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 836.456 | n/a | n/a | n/a | 4.828 | n/a | 0.000 | 0.000 | 1.033 | 832.732 | 0.017 | n/a | 0.150 | 0.000 | n/a | n/a | 0.090 | 4.828 | 0.005 | 0.090 |
| p99 | 1002.452 | n/a | n/a | n/a | 5.497 | n/a | 0.000 | 0.000 | 1.208 | 995.340 | 0.044 | n/a | 0.181 | 0.000 | n/a | n/a | 0.183 | 5.497 | 0.028 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000029 | 1002.452 | 5.497 | n/a | 0.000 | 0.000 | 1.208 | 995.340 | 0.044 | n/a | 0.181 | 0.000 | n/a | n/a | 0.183 | 5.497 | 0.005 | 0.183 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa670000000000000028 | 836.456 | 2.437 | n/a | 0.000 | 0.000 | 1.033 | 832.732 | 0.017 | n/a | 0.150 | 0.000 | n/a | n/a | 0.086 | 2.437 | 0.003 | 0.086 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa670000000000000026 | 170.390 | 4.828 | n/a | 0.000 | 0.000 | 0.917 | 164.394 | 0.016 | n/a | 0.146 | 0.000 | n/a | n/a | 0.090 | 4.828 | 0.028 | 0.090 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 438.046 | n/a | n/a | n/a | 2.353 | n/a | 0.000 | 0.000 | 0.735 | 434.189 | 0.014 | n/a | 0.098 | 0.000 | n/a | n/a | 0.090 | 2.353 | 0.004 | 0.090 |
| p99 | 981.610 | n/a | n/a | n/a | 5.852 | n/a | 0.000 | 0.000 | 1.058 | 978.287 | 0.016 | n/a | 0.119 | 0.000 | n/a | n/a | 0.158 | 5.852 | 0.081 | 0.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000002f | 981.610 | 2.353 | n/a | 0.000 | 0.000 | 0.735 | 978.287 | 0.015 | n/a | 0.119 | 0.000 | n/a | n/a | 0.101 | 2.353 | 0.002 | 0.101 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa67000000000000002d | 531.433 | 2.325 | n/a | 0.000 | 0.000 | 0.678 | 528.221 | 0.016 | n/a | 0.113 | 0.000 | n/a | n/a | 0.080 | 2.325 | 0.004 | 0.080 | gw-r/thread-64/journal/page | none observed |
| e8748cd0754faa67000000000000002b | 438.046 | 2.819 | n/a | 0.000 | 0.000 | 0.840 | 434.189 | 0.014 | n/a | 0.094 | 0.000 | n/a | n/a | 0.090 | 2.819 | 0.006 | 0.090 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa67000000000000002a | 72.566 | 5.852 | n/a | 0.000 | 0.000 | 1.058 | 65.389 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.158 | 5.852 | 0.081 | 0.158 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 317.187 | n/a | n/a | n/a | 2.491 | n/a | 0.000 | 0.000 | 0.682 | 310.497 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.095 | 2.491 | 0.008 | 0.095 |
| p99 | 963.684 | n/a | n/a | n/a | 9.577 | n/a | 0.000 | 0.000 | 3.539 | 960.115 | 3.334 | n/a | 0.098 | 0.000 | n/a | n/a | 36.631 | 9.577 | 0.070 | 36.631 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000030 | 963.684 | 2.187 | n/a | 0.000 | 0.000 | 1.181 | 960.115 | 0.019 | n/a | 0.098 | 0.000 | n/a | n/a | 0.082 | 2.187 | 0.002 | 0.082 | gw-r/thread-50/journal/page | none observed |
| e8748cd0754faa670000000000000035 | 715.287 | 9.577 | n/a | 0.000 | 0.000 | 3.539 | 701.948 | 0.018 | n/a | 0.066 | 0.000 | n/a | n/a | 0.139 | 9.577 | 0.013 | 0.139 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa670000000000000031 | 317.187 | 2.491 | n/a | 0.000 | 0.000 | 0.682 | 310.497 | 3.334 | n/a | 0.088 | 0.000 | n/a | n/a | 0.095 | 2.491 | 0.008 | 0.095 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa670000000000000033 | 39.730 | 2.766 | n/a | 0.000 | 0.000 | 0.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.631 | 2.766 | 0.070 | 36.631 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.498 | n/a | n/a | n/a | 2.372 | n/a | 0.000 | 0.000 | 1.679 | 372.419 | 0.025 | n/a | 0.118 | 0.000 | n/a | n/a | 0.083 | 2.372 | 0.007 | 0.083 |
| p99 | 782.904 | n/a | n/a | n/a | 6.808 | n/a | 0.000 | 0.000 | 3.469 | 775.812 | 3.311 | n/a | 0.128 | 0.000 | n/a | n/a | 0.136 | 6.808 | 0.011 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000003b | 782.904 | 5.775 | n/a | 0.000 | 0.000 | 1.098 | 775.812 | 0.019 | n/a | 0.120 | 0.000 | n/a | n/a | 0.080 | 5.775 | 0.007 | 0.080 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa670000000000000036 | 638.434 | 6.808 | n/a | 0.000 | 0.000 | 1.679 | 626.381 | 3.311 | n/a | 0.118 | 0.000 | n/a | n/a | 0.136 | 6.808 | 0.011 | 0.136 | gw-r/thread-64/journal/page | none observed |
| e8748cd0754faa670000000000000038 | 378.498 | 2.372 | n/a | 0.000 | 0.000 | 3.469 | 372.419 | 0.026 | n/a | 0.128 | 0.000 | n/a | n/a | 0.083 | 2.372 | 0.006 | 0.083 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000039 | 205.227 | 2.030 | n/a | 0.000 | 0.000 | 2.133 | 200.844 | 0.025 | n/a | 0.105 | 0.000 | n/a | n/a | 0.088 | 2.030 | 0.010 | 0.088 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 367.906 | n/a | n/a | n/a | 4.056 | n/a | 0.000 | 0.000 | 1.033 | 357.614 | 0.208 | n/a | 0.116 | 0.000 | n/a | n/a | 0.143 | 4.056 | 0.010 | 0.143 |
| p99 | 781.058 | n/a | n/a | n/a | 9.017 | n/a | 0.000 | 0.000 | 2.381 | 772.753 | 0.643 | n/a | 0.133 | 0.000 | n/a | n/a | 0.251 | 9.017 | 0.025 | 0.251 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000003e | 781.058 | 6.799 | n/a | 0.000 | 0.000 | 1.033 | 772.753 | 0.208 | n/a | 0.123 | 0.000 | n/a | n/a | 0.143 | 6.799 | 0.009 | 0.143 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa67000000000000003f | 469.081 | 2.870 | n/a | 0.000 | 0.000 | 2.381 | 462.996 | 0.643 | n/a | 0.093 | 0.000 | n/a | n/a | 0.099 | 2.870 | 0.006 | 0.099 | gw-r/thread-50/journal/page | none observed |
| e8748cd0754faa670000000000000042 | 367.906 | 9.017 | n/a | 0.000 | 0.000 | 0.870 | 357.614 | 0.021 | n/a | 0.133 | 0.000 | n/a | n/a | 0.251 | 9.017 | 0.025 | 0.251 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa670000000000000040 | 269.735 | 2.790 | n/a | 0.000 | 0.000 | 1.032 | 265.685 | 0.020 | n/a | 0.116 | 0.000 | n/a | n/a | 0.093 | 2.790 | 0.010 | 0.093 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa67000000000000003c | 167.528 | 4.056 | n/a | 0.000 | 0.000 | 2.174 | 160.678 | 0.362 | n/a | 0.113 | 0.000 | n/a | n/a | 0.144 | 4.056 | 0.024 | 0.144 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 899.105 | n/a | n/a | n/a | 0.158 | n/a | 0.000 | 0.000 | 0.581 | 894.431 | 0.019 | n/a | 0.089 | 0.000 | n/a | n/a | 0.103 | 0.158 | 0.000 | 0.103 |
| p99 | 1003.210 | n/a | n/a | n/a | 3.372 | n/a | 0.000 | 0.000 | 1.087 | 1001.064 | 0.023 | n/a | 0.133 | 0.000 | n/a | n/a | 1.254 | 3.372 | 0.004 | 1.254 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000045 | 1003.210 | 0.158 | n/a | 0.000 | 0.000 | 0.581 | 1001.064 | 0.019 | n/a | 0.133 | 0.000 | n/a | n/a | 1.254 | 0.158 | 0.000 | 1.254 | gw-r/thread-48/journal/page | none observed |
| e8748cd0754faa670000000000000044 | 899.105 | 3.372 | n/a | 0.000 | 0.000 | 1.087 | 894.431 | 0.023 | n/a | 0.089 | 0.000 | n/a | n/a | 0.103 | 3.372 | 0.004 | 0.103 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 300.418 | n/a | n/a | n/a | 2.441 | n/a | 0.000 | 0.000 | 0.925 | 292.738 | 0.016 | n/a | 0.085 | 0.000 | n/a | n/a | 0.088 | 2.441 | 0.008 | 0.088 |
| p99 | 1007.918 | n/a | n/a | n/a | 4.068 | n/a | 0.000 | 0.000 | 2.718 | 1003.743 | 3.745 | n/a | 0.140 | 0.000 | n/a | n/a | 12.026 | 4.068 | 0.153 | 12.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000004d | 1007.918 | 2.854 | n/a | 0.000 | 0.000 | 0.581 | 1003.743 | 0.552 | n/a | 0.108 | 0.000 | n/a | n/a | 0.080 | 2.854 | 0.003 | 0.080 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000047 | 971.835 | 2.441 | n/a | 0.000 | 0.000 | 0.954 | 968.258 | 0.016 | n/a | 0.078 | 0.000 | n/a | n/a | 0.089 | 2.441 | 0.003 | 0.089 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa67000000000000004a | 397.915 | 4.068 | n/a | 0.000 | 0.000 | 2.718 | 390.793 | 0.084 | n/a | 0.140 | 0.000 | n/a | n/a | 0.112 | 4.068 | 0.010 | 0.112 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000048 | 300.418 | 2.838 | n/a | 0.000 | 0.000 | 0.925 | 292.737 | 3.745 | n/a | 0.085 | 0.000 | n/a | n/a | 0.088 | 2.838 | 0.009 | 0.088 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa67000000000000004c | 296.658 | 2.253 | n/a | 0.000 | 0.000 | 1.494 | 292.738 | 0.016 | n/a | 0.085 | 0.000 | n/a | n/a | 0.072 | 2.253 | 0.008 | 0.072 | gw-r/thread-64/journal/page | none observed |
| e8748cd0754faa670000000000000046 | 14.747 | 2.249 | n/a | 0.000 | 0.000 | 0.471 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.026 | 2.249 | 0.153 | 12.026 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 337.150 | n/a | n/a | n/a | 6.752 | n/a | 0.000 | 0.000 | 0.495 | 325.365 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 6.752 | 0.007 | 0.080 |
| p99 | 983.735 | n/a | n/a | n/a | 6.895 | n/a | 0.000 | 0.000 | 4.688 | 976.211 | 0.164 | n/a | 0.076 | 0.000 | n/a | n/a | 0.105 | 6.895 | 0.020 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000004e | 983.735 | 6.895 | n/a | 0.000 | 0.000 | 0.495 | 976.211 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 6.895 | 0.007 | 0.080 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa67000000000000004f | 337.150 | 6.752 | n/a | 0.000 | 0.000 | 4.688 | 325.365 | 0.164 | n/a | 0.076 | 0.000 | n/a | n/a | 0.105 | 6.752 | 0.020 | 0.105 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 651.594 | n/a | n/a | n/a | 3.246 | n/a | 0.000 | 0.000 | 0.596 | 647.512 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.150 | 3.246 | 0.005 | 0.150 |
| p99 | 925.385 | n/a | n/a | n/a | 4.979 | n/a | 0.000 | 0.000 | 0.857 | 921.972 | 0.139 | n/a | 0.080 | 0.000 | n/a | n/a | 40.319 | 4.979 | 0.109 | 40.319 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000054 | 925.385 | 2.270 | n/a | 0.000 | 0.000 | 0.857 | 921.972 | 0.139 | n/a | 0.069 | 0.000 | n/a | n/a | 0.079 | 2.270 | 0.002 | 0.079 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa670000000000000055 | 651.594 | 3.246 | n/a | 0.000 | 0.000 | 0.596 | 647.512 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.150 | 3.246 | 0.005 | 0.150 | gw-r/thread-64/journal/page | none observed |
| e8748cd0754faa670000000000000053 | 45.640 | 4.979 | n/a | 0.000 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.319 | 4.979 | 0.109 | 40.319 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 370.678 | n/a | n/a | n/a | 2.420 | n/a | 0.000 | 0.000 | 0.560 | 367.526 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 5.483 | 2.420 | 0.070 | 5.483 |
| p99 | 704.428 | n/a | n/a | n/a | 92.165 | n/a | 4.361 | 0.000 | 0.643 | 601.640 | 0.020 | n/a | 0.116 | 0.000 | n/a | n/a | 22.978 | 96.526 | 0.137 | 22.978 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000059 | 704.428 | 92.165 | n/a | 4.361 | 0.000 | 0.643 | 601.640 | 0.020 | n/a | 0.116 | 0.000 | n/a | n/a | 5.483 | 96.526 | 0.137 | 5.483 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa670000000000000056 | 370.678 | 2.420 | n/a | 0.000 | 0.000 | 0.560 | 367.526 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.082 | 2.420 | 0.007 | 0.082 | gw-r/thread-47/journal/page | none observed |
| e8748cd0754faa670000000000000058 | 25.072 | 1.761 | n/a | 0.000 | 0.000 | 0.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.978 | 1.761 | 0.070 | 22.978 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 269.488 | n/a | n/a | n/a | 2.904 | n/a | 0.000 | 0.000 | 0.572 | 266.260 | 0.019 | n/a | 0.069 | 0.000 | n/a | n/a | 0.068 | 2.904 | 0.011 | 0.068 |
| p99 | 549.852 | n/a | n/a | n/a | 84.693 | n/a | 3.038 | 0.000 | 1.170 | 459.358 | 0.370 | n/a | 0.190 | 0.000 | n/a | n/a | 38.531 | 87.731 | 0.160 | 38.531 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000074 | 549.852 | 84.693 | n/a | 3.038 | 0.000 | 1.170 | 459.358 | 0.019 | n/a | 0.118 | 0.000 | n/a | n/a | 1.456 | 87.731 | 0.160 | 1.456 | gw-r/thread-47/journal/page | none observed |
| e8748cd0754faa670000000000000072 | 398.298 | 3.639 | n/a | 0.000 | 0.000 | 0.538 | 393.821 | 0.167 | n/a | 0.070 | 0.000 | n/a | n/a | 0.064 | 3.639 | 0.009 | 0.064 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000065 | 336.382 | 2.045 | n/a | 0.000 | 0.000 | 0.920 | 333.143 | 0.144 | n/a | 0.069 | 0.000 | n/a | n/a | 0.061 | 2.045 | 0.006 | 0.061 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa670000000000000068 | 296.708 | 2.904 | n/a | 0.000 | 0.000 | 0.736 | 292.730 | 0.175 | n/a | 0.095 | 0.000 | n/a | n/a | 0.067 | 2.904 | 0.010 | 0.067 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa67000000000000006b | 279.205 | 3.166 | n/a | 0.000 | 0.000 | 0.718 | 274.982 | 0.042 | n/a | 0.190 | 0.000 | n/a | n/a | 0.108 | 3.166 | 0.011 | 0.108 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa670000000000000070 | 269.488 | 2.136 | n/a | 0.000 | 0.000 | 0.572 | 266.260 | 0.370 | n/a | 0.089 | 0.000 | n/a | n/a | 0.060 | 2.136 | 0.008 | 0.060 | gw-r/thread-47/journal/page | none observed |
| e8748cd0754faa670000000000000064 | 136.553 | 3.381 | n/a | 0.000 | 0.000 | 0.893 | 132.164 | 0.016 | n/a | 0.024 | 0.000 | n/a | n/a | 0.076 | 3.381 | 0.025 | 0.076 | gw-r/thread-48/journal/page | none observed |
| e8748cd0754faa670000000000000067 | 110.276 | 5.263 | n/a | 0.000 | 0.000 | 0.531 | 104.378 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 5.263 | 0.048 | 0.068 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa67000000000000006f | 40.833 | 1.899 | n/a | 0.000 | 0.000 | 0.404 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.531 | 1.899 | 0.047 | 38.531 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa67000000000000006c | 21.154 | 2.532 | n/a | 0.000 | 0.000 | 0.370 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.252 | 2.532 | 0.120 | 18.252 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 122.865 | n/a | n/a | n/a | 85.916 | n/a | 4.523 | 0.000 | 0.971 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.793 | 90.633 | 0.838 | 12.793 |
| p99 | 210.265 | n/a | n/a | n/a | 124.638 | n/a | 7.115 | 0.000 | 1.196 | 89.422 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 23.613 | 129.161 | 0.868 | 23.613 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000077 | 210.265 | 111.061 | n/a | 6.178 | 0.000 | 1.097 | 89.422 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 2.463 | 117.239 | 0.558 | 2.463 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa67000000000000007a | 153.542 | 124.638 | n/a | 4.523 | 0.000 | 0.767 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.613 | 129.161 | 0.841 | 23.613 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa670000000000000078 | 147.585 | 85.916 | n/a | 4.718 | 0.000 | 1.196 | 54.258 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 1.401 | 90.633 | 0.614 | 1.401 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa670000000000000076 | 122.865 | 96.630 | n/a | 7.115 | 0.000 | 1.025 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.094 | 103.745 | 0.844 | 18.094 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa670000000000000075 | 102.081 | 85.393 | n/a | 3.189 | 0.000 | 0.706 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.793 | 88.582 | 0.868 | 12.793 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa670000000000000079 | 100.186 | 79.831 | n/a | 4.135 | 0.000 | 0.971 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.248 | 83.966 | 0.838 | 15.248 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 334.459 | n/a | n/a | n/a | 2.199 | n/a | 0.000 | 0.000 | 0.815 | 331.090 | 0.021 | n/a | 0.079 | 0.000 | n/a | n/a | 0.084 | 2.199 | 0.007 | 0.084 |
| p99 | 1007.130 | n/a | n/a | n/a | 20.933 | n/a | 0.000 | 0.000 | 1.818 | 1003.880 | 0.139 | n/a | 0.136 | 0.000 | n/a | n/a | 0.214 | 20.933 | 0.045 | 0.214 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000082 | 1007.130 | 2.199 | n/a | 0.000 | 0.000 | 0.755 | 1003.880 | 0.139 | n/a | 0.076 | 0.000 | n/a | n/a | 0.080 | 2.199 | 0.002 | 0.080 | gw-r/thread-51/journal/page | none observed |
| e8748cd0754faa670000000000000085 | 468.024 | 20.933 | n/a | 0.000 | 0.000 | 1.818 | 444.969 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.214 | 20.933 | 0.045 | 0.214 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa670000000000000081 | 334.459 | 2.186 | n/a | 0.000 | 0.000 | 0.939 | 331.090 | 0.021 | n/a | 0.136 | 0.000 | n/a | n/a | 0.086 | 2.186 | 0.007 | 0.086 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa670000000000000083 | 167.079 | 5.255 | n/a | 0.000 | 0.000 | 0.815 | 160.706 | 0.125 | n/a | 0.094 | 0.000 | n/a | n/a | 0.084 | 5.255 | 0.031 | 0.084 | gw-r/thread-49/journal/page | none observed |

## P3 / presweep / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 154.562 | n/a | n/a | n/a | 2.687 | n/a | 0.000 | 0.000 | 0.691 | 150.129 | 0.038 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 2.687 | 0.008 | 0.104 |
| p99 | 1003.267 | n/a | n/a | n/a | 3.209 | n/a | 0.000 | 0.000 | 1.721 | 1001.198 | 0.304 | n/a | 0.130 | 0.000 | n/a | n/a | 1.289 | 3.209 | 0.629 | 1.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa67000000000000008a | 1003.267 | 0.127 | n/a | 0.000 | 0.000 | 0.655 | 1001.198 | 0.049 | n/a | 0.130 | 0.000 | n/a | n/a | 1.107 | 0.127 | 0.000 | 1.107 | gw-r/thread-46/journal/page | none observed |
| e8748cd0754faa670000000000000089 | 347.656 | 2.344 | n/a | 0.000 | 0.000 | 1.721 | 343.081 | 0.304 | n/a | 0.118 | 0.000 | n/a | n/a | 0.089 | 2.344 | 0.007 | 0.089 | gw-r/thread-63/journal/page | none observed |
| e8748cd0754faa67000000000000008c | 337.200 | 2.735 | n/a | 0.000 | 0.000 | 0.730 | 333.589 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.059 | 2.735 | 0.008 | 0.059 | gw-r/thread-49/journal/page | none observed |
| e8748cd0754faa67000000000000008b | 154.562 | 3.209 | n/a | 0.000 | 0.000 | 0.849 | 150.129 | 0.146 | n/a | 0.079 | 0.000 | n/a | n/a | 0.149 | 3.209 | 0.021 | 0.149 | gw-r/thread-50/journal/page | none observed |
| e8748cd0754faa67000000000000008d | 61.412 | 2.687 | n/a | 0.000 | 0.000 | 0.691 | 57.783 | 0.038 | n/a | 0.109 | 0.000 | n/a | n/a | 0.104 | 2.687 | 0.044 | 0.104 | gw-r/thread-44/journal/page | none observed |
| e8748cd0754faa670000000000000087 | 4.381 | 2.758 | n/a | 0.000 | 0.000 | 0.334 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.289 | 2.758 | 0.629 | 1.289 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / sweep / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.557 | n/a | n/a | n/a | 4.625 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.228 | 4.625 | 0.411 | 5.228 |
| p99 | 1003.781 | n/a | n/a | n/a | 11.875 | n/a | 0.000 | 0.000 | 1.048 | 1001.310 | 0.016 | n/a | 0.129 | 0.000 | n/a | n/a | 15.191 | 11.875 | 0.703 | 15.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e8748cd0754faa670000000000000097 | 1003.781 | 0.163 | n/a | 0.000 | 0.000 | 1.048 | 1001.310 | 0.016 | n/a | 0.129 | 0.000 | n/a | n/a | 1.116 | 0.163 | 0.000 | 1.116 | gw-r/thread-48/journal/page | none observed |
| e8748cd0754faa67000000000000008f | 20.283 | 4.724 | n/a | 0.000 | 0.000 | 0.368 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.191 | 4.724 | 0.233 | 15.191 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa670000000000000092 | 16.890 | 11.875 | n/a | 0.000 | 0.000 | 0.410 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.605 | 11.875 | 0.703 | 4.605 | node-14/thread-2/replica.fetch-feed | none observed |
| e8748cd0754faa670000000000000091 | 14.913 | 2.223 | n/a | 0.000 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.386 | 2.223 | 0.149 | 12.386 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa670000000000000095 | 14.557 | 3.954 | n/a | 0.000 | 0.000 | 0.502 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.101 | 3.954 | 0.272 | 10.101 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa670000000000000096 | 12.455 | 6.681 | n/a | 0.000 | 0.000 | 0.546 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.228 | 6.681 | 0.536 | 5.228 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa670000000000000093 | 12.325 | 6.044 | n/a | 0.000 | 0.000 | 0.352 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.929 | 6.044 | 0.490 | 5.929 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa670000000000000090 | 9.614 | 4.625 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.577 | 4.625 | 0.481 | 4.577 | node-14/thread-2/socket.wait-first-byte | none observed |
| e8748cd0754faa670000000000000094 | 8.140 | 3.348 | n/a | 0.000 | 0.000 | 0.477 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.314 | 3.348 | 0.411 | 4.314 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / outside-phases / read (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.035 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 200.872 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 |
| p99 | 203.518 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 202.511 | 1.526 | n/a | 0.250 | 0.000 | n/a | n/a | 25.681 | 0.000 | 0.000 | 25.681 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000007 | 203.518 | 0.000 | n/a | 0.000 | 0.000 | 1.386 | 201.566 | 0.015 | n/a | 0.178 | 0.000 | n/a | n/a | 0.373 | 0.000 | 0.000 | 0.373 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000009e | 203.404 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 202.511 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000009a | 202.778 | 0.000 | n/a | 0.000 | 0.000 | 1.144 | 201.203 | 0.013 | n/a | 0.250 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000076 | 202.725 | 0.000 | n/a | 0.000 | 0.000 | 1.213 | 201.228 | 0.052 | n/a | 0.106 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000005 | 202.669 | 0.000 | n/a | 0.000 | 0.000 | 1.127 | 201.124 | 0.013 | n/a | 0.188 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000007d | 202.649 | 0.000 | n/a | 0.000 | 0.000 | 1.232 | 201.114 | 0.027 | n/a | 0.144 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000006 | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 1.013 | 201.215 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000060 | 202.483 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 201.151 | 0.013 | n/a | 0.141 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000c2 | 202.438 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 201.189 | 0.017 | n/a | 0.170 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000c4 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 201.058 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000005e | 202.163 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 200.889 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000005f | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 200.931 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000c3 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 200.869 | 0.019 | n/a | 0.119 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000009b | 202.037 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 200.885 | 0.015 | n/a | 0.104 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000007a | 202.035 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 200.838 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000c1 | 201.975 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 200.919 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000078 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 200.872 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000009c | 201.838 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.833 | 0.017 | n/a | 0.114 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000099 | 201.758 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 200.785 | 0.017 | n/a | 0.101 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000062 | 201.625 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 200.836 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.120 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 200.816 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 |
| p99 | 205.586 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.463 | 201.398 | 4.749 | n/a | 0.216 | 0.000 | n/a | n/a | 0.844 | 0.000 | 0.000 | 0.844 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000008 | 205.586 | 0.000 | n/a | 0.000 | 0.000 | 4.463 | 200.816 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000000b | 202.923 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 201.120 | 0.017 | n/a | 0.147 | 0.000 | n/a | n/a | 0.348 | 0.000 | 0.000 | 0.348 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000000e | 202.789 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.398 | 0.049 | n/a | 0.216 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000000a | 202.464 | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 201.065 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000000d | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 201.009 | 0.015 | n/a | 0.166 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000010 | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 201.013 | 0.017 | n/a | 0.148 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000000f | 172.426 | 0.000 | n/a | 0.000 | 0.000 | 1.004 | 171.082 | 0.012 | n/a | 0.158 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000000c | 126.623 | 0.000 | n/a | 0.000 | 0.000 | 1.195 | 125.006 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000009 | 121.163 | 0.000 | n/a | 0.000 | 0.000 | 2.867 | 112.566 | 4.749 | n/a | 0.137 | 0.000 | n/a | n/a | 0.844 | 0.000 | 0.000 | 0.844 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000011 | 107.141 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 105.541 | 0.204 | n/a | 0.162 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.275 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.927 | 0.014 | n/a | 0.125 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 202.665 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 201.355 | 0.031 | n/a | 0.181 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000014 | 202.665 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 201.355 | 0.031 | n/a | 0.181 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000013 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 200.927 | 0.014 | n/a | 0.125 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000012 | 201.622 | 0.000 | n/a | 0.000 | 0.000 | 0.556 | 200.820 | 0.014 | n/a | 0.108 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.460 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.102 | 201.125 | 0.021 | n/a | 0.147 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 215.511 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.755 | 213.976 | 0.077 | n/a | 0.272 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000020 | 215.511 | 0.000 | n/a | 0.000 | 0.000 | 1.102 | 213.976 | 0.077 | n/a | 0.235 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000023 | 205.601 | 0.000 | n/a | 0.000 | 0.000 | 2.755 | 202.418 | 0.026 | n/a | 0.272 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000024 | 202.460 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.098 | 0.016 | n/a | 0.137 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000025 | 202.174 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 201.125 | 0.021 | n/a | 0.147 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000021 | 64.645 | 0.000 | n/a | 0.000 | 0.000 | 1.120 | 63.276 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.451 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.257 | 0.023 | n/a | 0.143 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 207.500 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.817 | 205.888 | 12.478 | n/a | 0.440 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe000000000000002d | 207.500 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 205.888 | 0.102 | n/a | 0.435 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000027 | 206.339 | 0.000 | n/a | 0.000 | 0.000 | 2.342 | 203.411 | 0.021 | n/a | 0.440 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000002a | 204.214 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 203.202 | 0.027 | n/a | 0.154 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000002c | 203.682 | 0.000 | n/a | 0.000 | 0.000 | 2.817 | 189.443 | 11.173 | n/a | 0.034 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000002e | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.257 | 0.023 | n/a | 0.147 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000002f | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.383 | 0.021 | n/a | 0.166 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000028 | 202.407 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 201.282 | 0.013 | n/a | 0.143 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000002b | 172.576 | 0.000 | n/a | 0.000 | 0.000 | 1.047 | 158.805 | 12.478 | n/a | 0.091 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000029 | 157.605 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 156.557 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000030 | 102.287 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 88.851 | 12.352 | n/a | 0.057 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.572 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.119 | 201.076 | 0.018 | n/a | 0.130 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 209.006 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.978 | 206.185 | 15.969 | n/a | 0.210 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe000000000000003b | 209.006 | 0.000 | n/a | 0.000 | 0.000 | 2.531 | 206.185 | 0.020 | n/a | 0.140 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000036 | 205.312 | 0.000 | n/a | 0.000 | 0.000 | 3.978 | 201.076 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000032 | 203.848 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 202.824 | 0.017 | n/a | 0.210 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000034 | 203.334 | 0.000 | n/a | 0.000 | 0.000 | 1.752 | 201.115 | 0.016 | n/a | 0.130 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000033 | 202.868 | 0.000 | n/a | 0.000 | 0.000 | 1.277 | 201.294 | 0.018 | n/a | 0.141 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000039 | 202.572 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 201.222 | 0.031 | n/a | 0.159 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000037 | 202.296 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.052 | 0.024 | n/a | 0.095 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000031 | 155.773 | 0.000 | n/a | 0.000 | 0.000 | 1.487 | 153.918 | 0.022 | n/a | 0.130 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000003c | 124.826 | 0.000 | n/a | 0.000 | 0.000 | 1.119 | 107.546 | 15.969 | n/a | 0.050 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000035 | 99.755 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 98.671 | 0.016 | n/a | 0.091 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.808 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 201.624 | 0.025 | n/a | 0.158 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 209.939 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.985 | 201.897 | 0.089 | n/a | 0.239 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000040 | 209.939 | 0.000 | n/a | 0.000 | 0.000 | 7.985 | 201.643 | 0.025 | n/a | 0.158 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000003e | 203.695 | 0.000 | n/a | 0.000 | 0.000 | 1.679 | 201.624 | 0.027 | n/a | 0.175 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000042 | 203.292 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 201.897 | 0.050 | n/a | 0.204 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000003f | 203.178 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 201.769 | 0.089 | n/a | 0.239 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000003d | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 201.773 | 0.051 | n/a | 0.177 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000043 | 202.772 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 201.360 | 0.015 | n/a | 0.139 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000044 | 202.528 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.059 | 0.023 | n/a | 0.137 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000045 | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 201.039 | 0.023 | n/a | 0.121 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000046 | 109.051 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 107.803 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |

## P3 / recovery / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.154 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 201.082 | 0.019 | n/a | 0.131 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 205.377 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.666 | 202.814 | 18.908 | n/a | 0.376 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe000000000000004c | 205.377 | 0.000 | n/a | 0.000 | 0.000 | 2.163 | 202.814 | 0.013 | n/a | 0.138 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000004a | 203.449 | 0.000 | n/a | 0.000 | 0.000 | 1.192 | 201.751 | 0.020 | n/a | 0.376 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000050 | 203.161 | 0.000 | n/a | 0.000 | 0.000 | 1.134 | 201.645 | 0.023 | n/a | 0.229 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000048 | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.131 | 0.019 | n/a | 0.131 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000049 | 202.371 | 0.000 | n/a | 0.000 | 0.000 | 0.842 | 201.261 | 0.023 | n/a | 0.135 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000052 | 202.322 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.300 | 0.029 | n/a | 0.147 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000047 | 202.154 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.082 | 0.021 | n/a | 0.142 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000004e | 202.046 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.041 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000004f | 180.577 | 0.000 | n/a | 0.000 | 0.000 | 2.226 | 159.252 | 18.908 | n/a | 0.064 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000051 | 69.619 | 0.000 | n/a | 0.000 | 0.000 | 3.666 | 65.799 | 0.014 | n/a | 0.037 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000004d | 65.781 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 64.670 | 0.017 | n/a | 0.060 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000004b | 62.623 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 61.592 | 0.019 | n/a | 0.070 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-63/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.976 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.910 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 202.611 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.847 | 201.251 | 2.423 | n/a | 0.167 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000054 | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 1.241 | 201.063 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000055 | 202.535 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.251 | 0.032 | n/a | 0.167 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000057 | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 201.235 | 0.017 | n/a | 0.154 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000005a | 202.060 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 200.910 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000058 | 201.995 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.928 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000059 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.921 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000053 | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 200.888 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000005c | 201.577 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 200.738 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000056 | 105.337 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 103.959 | 0.017 | n/a | 0.147 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000005b | 92.136 | 0.000 | n/a | 0.000 | 0.000 | 3.847 | 85.623 | 2.423 | n/a | 0.037 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.094 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 200.933 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 |
| p99 | 203.835 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.348 | 201.593 | 5.457 | n/a | 0.226 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe000000000000006e | 203.835 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 200.295 | 2.419 | n/a | 0.032 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000064 | 203.405 | 0.000 | n/a | 0.000 | 0.000 | 1.348 | 201.593 | 0.020 | n/a | 0.226 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000063 | 202.601 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 201.349 | 0.025 | n/a | 0.149 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000006a | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.120 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000006c | 202.326 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 201.227 | 0.013 | n/a | 0.118 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000006d | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 200.933 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000068 | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 200.920 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000065 | 202.022 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 200.955 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000067 | 201.931 | 0.000 | n/a | 0.000 | 0.000 | 0.793 | 200.906 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000069 | 201.929 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 200.827 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000066 | 155.157 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 148.532 | 5.457 | n/a | 0.088 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-49/journal/page | none observed |

## P3 / grow3 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.877 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.970 | 0.067 | n/a | 0.150 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 |
| p99 | 202.781 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 201.394 | 79.056 | n/a | 0.193 | 0.000 | n/a | n/a | 0.518 | 0.000 | 0.000 | 0.518 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000073 | 202.781 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 201.394 | 0.067 | n/a | 0.150 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000072 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 201.196 | 0.032 | n/a | 0.160 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000006f | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 200.970 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000074 | 157.410 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 76.581 | 79.056 | n/a | 0.193 | 0.000 | n/a | n/a | 0.518 | 0.000 | 0.000 | 0.518 | gw-r/thread-48/gateway.admission-wait | none observed |
| 6ad99ce857cd0cfe0000000000000070 | 145.889 | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 142.288 | 2.080 | n/a | 0.087 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-63/journal/page | none observed |

## P3 / p4h3 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 170.765 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 169.623 | 0.015 | n/a | 0.106 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 |
| p99 | 202.970 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.618 | 12.767 | n/a | 0.216 | 0.000 | n/a | n/a | 50.978 | 0.000 | 0.000 | 50.978 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe0000000000000086 | 202.970 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.584 | 0.050 | n/a | 0.198 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000008c | 202.828 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.618 | 0.051 | n/a | 0.216 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000081 | 202.529 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 201.414 | 0.069 | n/a | 0.151 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000007e | 202.259 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 200.873 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000008e | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 201.003 | 0.014 | n/a | 0.155 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000084 | 202.166 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 201.065 | 0.022 | n/a | 0.153 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000008a | 201.740 | 0.000 | n/a | 0.000 | 0.000 | 0.450 | 200.990 | 0.036 | n/a | 0.162 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000008d | 170.765 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 169.623 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000080 | 130.074 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 129.125 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000083 | 108.563 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 107.747 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000082 | 106.754 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 105.671 | 0.017 | n/a | 0.099 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000085 | 69.642 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 68.269 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000007f | 67.756 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 53.659 | 12.767 | n/a | 0.037 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000087 | 51.643 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.978 | 0.000 | 0.000 | 50.978 | node-14/thread-8/socket.wait-first-byte | none observed |

## P3 / grow10 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 56.671 | n/a | n/a | n/a | 0.519 | n/a | 0.000 | 0.000 | 0.812 | 55.145 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 0.196 | 0.519 | 0.005 | 0.196 |
| p99 | 241.241 | n/a | n/a | n/a | 0.778 | n/a | 0.000 | 0.000 | 1.651 | 156.577 | 115.480 | n/a | 0.174 | 0.000 | n/a | n/a | 51.293 | 0.778 | 0.014 | 51.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe000000000000008f | 241.241 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 124.295 | 115.480 | n/a | 0.100 | 0.000 | n/a | n/a | 0.554 | 0.000 | 0.000 | 0.554 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000093 | 158.823 | 0.000 | n/a | 0.000 | 0.000 | 1.583 | 156.577 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.551 | 0.000 | 0.000 | 0.551 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000094 | 121.373 | 0.585 | n/a | 0.000 | 0.000 | 1.115 | 111.120 | 8.199 | n/a | 0.174 | 0.000 | n/a | n/a | 0.178 | 0.585 | 0.005 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000091 | 56.671 | 0.519 | n/a | 0.000 | 0.000 | 0.783 | 55.145 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 0.135 | 0.519 | 0.009 | 0.135 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000096 | 56.480 | 0.778 | n/a | 0.000 | 0.000 | 1.651 | 53.775 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.196 | 0.778 | 0.014 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe0000000000000095 | 52.678 | 0.730 | n/a | 0.000 | 0.000 | 0.655 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.293 | 0.730 | 0.014 | 51.293 | node-14/thread-8/socket.wait-first-byte | none observed |

## P3 / p4h10 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.804 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.809 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 202.554 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 201.096 | 5.583 | n/a | 0.129 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe00000000000000a2 | 202.554 | 0.000 | n/a | 0.000 | 0.000 | 1.229 | 201.022 | 0.013 | n/a | 0.129 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000aa | 202.414 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 200.990 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a0 | 202.004 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 200.839 | 0.017 | n/a | 0.099 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000ab | 201.926 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 200.760 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a4 | 201.853 | 0.000 | n/a | 0.000 | 0.000 | 0.492 | 201.096 | 0.031 | n/a | 0.115 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe000000000000009f | 201.823 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.837 | 0.013 | n/a | 0.091 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a7 | 201.804 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.820 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a5 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.806 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a6 | 201.757 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.809 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a9 | 157.845 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 156.790 | 0.018 | n/a | 0.082 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-63/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a8 | 112.506 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 111.526 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000a3 | 102.823 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 96.358 | 5.583 | n/a | 0.053 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.907 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 200.970 | 0.019 | n/a | 0.113 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 203.239 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.245 | 201.553 | 1.529 | n/a | 0.160 | 0.000 | n/a | n/a | 0.988 | 0.000 | 0.000 | 0.988 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe00000000000000b2 | 203.239 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 201.053 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.988 | 0.000 | 0.000 | 0.988 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b1 | 202.977 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.553 | 0.021 | n/a | 0.160 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b0 | 202.403 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 201.217 | 0.060 | n/a | 0.151 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b3 | 202.344 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 201.108 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b6 | 202.232 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 201.255 | 0.023 | n/a | 0.127 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b4 | 201.907 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 200.866 | 0.017 | n/a | 0.114 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000ae | 201.905 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 200.970 | 0.019 | n/a | 0.113 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000af | 122.406 | 0.000 | n/a | 0.000 | 0.000 | 3.245 | 118.931 | 0.019 | n/a | 0.094 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b7 | 108.196 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 105.546 | 1.529 | n/a | 0.034 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-64/journal/page | none observed |
| 6ad99ce857cd0cfe00000000000000b8 | 53.773 | 0.000 | n/a | 0.000 | 0.000 | 2.901 | 50.702 | 0.012 | n/a | 0.041 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-63/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 200.777 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 202.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 200.777 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6ad99ce857cd0cfe00000000000000c0 | 202.030 | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 200.777 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
