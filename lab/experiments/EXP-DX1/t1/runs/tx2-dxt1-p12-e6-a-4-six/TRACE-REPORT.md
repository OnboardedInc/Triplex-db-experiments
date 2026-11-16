# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.queue-and-write` (387.563 ms, trace `7ae69e970b053a8b000000000000040b`); `node-14/thread-0/socket.queue-and-write` (328.224 ms, trace `7ae69e970b053a8b000000000000040c`); `node-14/thread-0/socket.wait-first-byte` (482.655 ms, trace `7ae69e970b053a8b0000000000000409`); `node-14/thread-0/socket.queue-and-write` (269.500 ms, trace `7ae69e970b053a8b000000000000040d`); `node-14/thread-0/socket.wait-first-byte` (487.915 ms, trace `7ae69e970b053a8b000000000000040a`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p12-e6-a-4-six`; source `8d4e3e21eac91cdd7a2777673a3a8a06e2b8e66a`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 800/800 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 800/800. Raw trace bytes: 3431432.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 343 source calibrations, offsets preserved in raw traces and trace-summary.json. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 6005.874 | 1830.766 | 29.665 | 4046 |
| idle-25 | 0 | 4714.446 | 2037.014 | 25.319 | 2992 |
| idle-50 | 0 | 8400.979 | 1602.266 | 29.599 | 3007 |
| idle-250 | 0 | 38264.715 | 2611.381 | 101.937 | 3034 |
| idle-1000 | 0 | 148018.050 | 7077.474 | 290.652 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 7ae69e970b053a8b000000000000040b | driver.queue.scheduler-late | 131.102 | none | 2 / 32 |
| 7ae69e970b053a8b000000000000040b | driver.queue.scheduler-dispatch | 0.052 | none | 2 / 32 |

Observed active steps while trace 7ae69e970b053a8b000000000000040b waited: []

| 7ae69e970b053a8b000000000000040c | driver.queue.scheduler-late | 111.699 | none | 3 / 32 |
| 7ae69e970b053a8b000000000000040c | driver.queue.scheduler-dispatch | 0.045 | none | 3 / 32 |

Observed active steps while trace 7ae69e970b053a8b000000000000040c waited: []

| 7ae69e970b053a8b0000000000000409 | driver.queue.scheduler-late | 39.584 | none | 0 / 32 |
| 7ae69e970b053a8b0000000000000409 | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |

Observed active steps while trace 7ae69e970b053a8b0000000000000409 waited: []

| 7ae69e970b053a8b000000000000040d | driver.queue.scheduler-late | 92.067 | none | 4 / 32 |
| 7ae69e970b053a8b000000000000040d | driver.queue.scheduler-dispatch | 0.035 | none | 4 / 32 |

Observed active steps while trace 7ae69e970b053a8b000000000000040d waited: []

| 7ae69e970b053a8b000000000000040a | driver.queue.scheduler-late | 20.101 | none | 1 / 32 |
| 7ae69e970b053a8b000000000000040a | driver.queue.scheduler-dispatch | 0.047 | none | 1 / 32 |

Observed active steps while trace 7ae69e970b053a8b000000000000040a waited: []

## P2 / outside-phases / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.138 | 0.718 | 0.000 | 1.006 | 4.993 | n/a | 0.000 | 0.137 | 1.684 | 5.320 | 0.051 | n/a | 0.174 | 14.610 | n/a | n/a | 0.056 | 5.129 | 0.165 | 0.056 |
| p99 | 107.998 | 7.996 | 0.047 | 7.757 | 15.919 | n/a | 2.934 | 1.181 | 3.294 | 9.219 | 0.110 | n/a | 1.920 | 76.422 | n/a | n/a | 0.301 | 20.034 | 0.254 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000000ff | 107.998 | 15.919 | n/a | 2.934 | 1.181 | 1.684 | 9.219 | 0.110 | n/a | 0.227 | 76.422 | n/a | n/a | 0.301 | 20.034 | 0.186 | 0.301 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 7ae69e970b053a8b000000000000035e | 48.886 | 11.504 | n/a | 0.000 | 0.894 | 3.146 | 5.320 | 0.050 | n/a | 1.920 | 25.997 | n/a | n/a | 0.056 | 12.397 | 0.254 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000035f | 31.138 | 4.993 | n/a | 0.000 | 0.137 | 3.294 | 7.800 | 0.051 | n/a | 0.174 | 14.610 | n/a | n/a | 0.079 | 5.129 | 0.165 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms; driver.publication.persist-deferred 0.025ms |
| 7ae69e970b053a8b0000000000000361 | 19.923 | 3.042 | n/a | 0.000 | 0.038 | 1.205 | 3.553 | 0.073 | n/a | 0.154 | 11.842 | n/a | n/a | 0.016 | 3.079 | 0.155 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.095ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.012ms |
| 7ae69e970b053a8b0000000000000527 | 13.423 | 2.156 | n/a | 0.000 | 0.054 | 0.752 | 2.318 | 0.020 | n/a | 0.089 | 8.009 | n/a | n/a | 0.025 | 2.210 | 0.165 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.138 | 0.718 | 0.000 | 1.006 | 4.993 | n/a | 0.000 | 0.137 | 1.684 | 5.320 | 0.051 | n/a | 0.174 | 14.610 | n/a | n/a | 0.056 | 5.129 | 0.165 | 0.056 |
| p99 | 107.998 | 7.996 | 0.047 | 7.757 | 15.919 | n/a | 2.934 | 1.181 | 3.294 | 9.219 | 0.110 | n/a | 1.920 | 76.422 | n/a | n/a | 0.301 | 20.034 | 0.254 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000000ff | 107.998 | 15.919 | n/a | 2.934 | 1.181 | 1.684 | 9.219 | 0.110 | n/a | 0.227 | 76.422 | n/a | n/a | 0.301 | 20.034 | 0.186 | 0.301 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 7ae69e970b053a8b000000000000035e | 48.886 | 11.504 | n/a | 0.000 | 0.894 | 3.146 | 5.320 | 0.050 | n/a | 1.920 | 25.997 | n/a | n/a | 0.056 | 12.397 | 0.254 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000035f | 31.138 | 4.993 | n/a | 0.000 | 0.137 | 3.294 | 7.800 | 0.051 | n/a | 0.174 | 14.610 | n/a | n/a | 0.079 | 5.129 | 0.165 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms; driver.publication.persist-deferred 0.025ms |
| 7ae69e970b053a8b0000000000000361 | 19.923 | 3.042 | n/a | 0.000 | 0.038 | 1.205 | 3.553 | 0.073 | n/a | 0.154 | 11.842 | n/a | n/a | 0.016 | 3.079 | 0.155 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.095ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.012ms |
| 7ae69e970b053a8b0000000000000527 | 13.423 | 2.156 | n/a | 0.000 | 0.054 | 0.752 | 2.318 | 0.020 | n/a | 0.089 | 8.009 | n/a | n/a | 0.025 | 2.210 | 0.165 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.126 | 0.997 | 0.000 | 0.893 | 3.806 | n/a | 0.000 | 0.088 | 1.317 | 2.545 | 0.051 | n/a | 0.317 | 11.288 | n/a | n/a | 0.030 | 4.184 | 0.204 | 0.030 |
| p99 | 113.791 | 4.959 | 0.007 | 11.259 | 15.368 | n/a | 6.520 | 14.413 | 12.142 | 11.331 | 0.982 | n/a | 4.771 | 81.006 | n/a | n/a | 0.137 | 20.351 | 0.528 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000001bf | 138.456 | 3.913 | n/a | 0.000 | 0.152 | 11.003 | 2.718 | 0.042 | n/a | 0.174 | 120.419 | n/a | n/a | 0.036 | 4.065 | 0.029 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.readback 0.164ms; driver.reader-basis.broadcast 0.061ms; driver.reader-basis.broadcast 0.037ms |
| 7ae69e970b053a8b00000000000001c0 | 117.262 | 4.211 | n/a | 0.000 | 0.134 | 1.020 | 6.890 | 0.043 | n/a | 0.423 | 104.500 | n/a | n/a | 0.040 | 4.345 | 0.037 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.037ms |
| 7ae69e970b053a8b0000000000000100 | 113.791 | 5.186 | n/a | 6.520 | 11.635 | 17.102 | 9.920 | 0.099 | n/a | 0.144 | 63.050 | n/a | n/a | 0.134 | 23.341 | 0.205 | 0.134 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.oracle-record 3.301ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms; driver.publication.persist-deferred 0.137ms; driver.publication.persist-deferred 0.043ms |
| 7ae69e970b053a8b00000000000001c1 | 95.369 | 5.646 | n/a | 0.000 | 0.137 | 1.672 | 6.522 | 0.068 | n/a | 0.170 | 81.006 | n/a | n/a | 0.148 | 5.783 | 0.061 | 0.148 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.022ms |
| 7ae69e970b053a8b000000000000035d | 79.311 | 3.107 | n/a | 0.000 | 14.700 | 3.276 | 20.912 | 0.467 | n/a | 4.771 | 32.051 | n/a | n/a | 0.026 | 17.807 | 0.225 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms; driver.publication.persist-deferred 0.025ms |
| 7ae69e970b053a8b0000000000000101 | 76.550 | 5.926 | n/a | 0.000 | 4.084 | 7.977 | 7.623 | 0.076 | n/a | 2.672 | 47.797 | n/a | n/a | 0.395 | 10.010 | 0.131 | 0.395 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.oracle-record 3.301ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms; driver.publication.persist-deferred 0.137ms; driver.reader-basis.broadcast 0.028ms |
| 7ae69e970b053a8b0000000000000102 | 75.348 | 7.205 | n/a | 6.800 | 0.163 | 4.858 | 5.344 | 0.114 | n/a | 0.587 | 50.178 | n/a | n/a | 0.100 | 14.167 | 0.188 | 0.100 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.oracle-record 3.301ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms; driver.publication.readback 0.173ms; driver.publication.persist-deferred 0.137ms |
| 7ae69e970b053a8b00000000000001c5 | 73.951 | 6.708 | n/a | 0.000 | 0.084 | 1.110 | 4.962 | 0.133 | n/a | 1.254 | 59.662 | n/a | n/a | 0.036 | 6.793 | 0.092 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.readback 0.089ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.022ms |
| 7ae69e970b053a8b0000000000000121 | 71.032 | 5.355 | n/a | 0.000 | 3.179 | 5.769 | 25.929 | 0.144 | n/a | 1.774 | 28.816 | n/a | n/a | 0.065 | 8.534 | 0.120 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.605ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.020ms; driver.reader-basis.broadcast 0.011ms |
| 7ae69e970b053a8b00000000000001c8 | 64.988 | 3.175 | n/a | 0.000 | 0.094 | 37.468 | 1.603 | 0.029 | n/a | 1.604 | 20.986 | n/a | n/a | 0.031 | 3.268 | 0.050 | 0.031 | node-14/thread-0/socket.queue-and-write | client.encode 6.582ms; driver.publication.readback 0.220ms; driver.publication.readback 0.115ms; driver.publication.readback 0.089ms; driver.publication.readback 0.077ms |
| 7ae69e970b053a8b0000000000000123 | 62.868 | 8.405 | n/a | 0.000 | 5.074 | 12.142 | 9.923 | 0.146 | n/a | 0.297 | 26.855 | n/a | n/a | 0.026 | 13.479 | 0.214 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 1.004ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.028ms |
| 7ae69e970b053a8b0000000000000107 | 61.470 | 5.705 | n/a | 0.000 | 5.024 | 4.966 | 3.996 | 0.090 | n/a | 0.908 | 40.742 | n/a | n/a | 0.039 | 10.729 | 0.175 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.579ms; client.encode 3.177ms; driver.publication.readback 0.173ms; driver.publication.readback 0.115ms; driver.publication.readback 0.113ms |
| 7ae69e970b053a8b0000000000000104 | 59.351 | 5.439 | n/a | 0.000 | 9.277 | 4.963 | 9.004 | 0.030 | n/a | 0.213 | 30.403 | n/a | n/a | 0.021 | 14.716 | 0.248 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.579ms; driver.oracle-record 3.301ms; client.encode 3.177ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms |
| 7ae69e970b053a8b0000000000000125 | 50.866 | 5.481 | n/a | 5.049 | 0.115 | 1.493 | 5.053 | 0.070 | n/a | 0.154 | 33.405 | n/a | n/a | 0.046 | 10.645 | 0.209 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | client.encode 1.004ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.028ms |
| 7ae69e970b053a8b00000000000001c9 | 50.316 | 9.944 | n/a | 0.000 | 3.007 | 6.038 | 1.820 | 0.037 | n/a | 0.156 | 29.296 | n/a | n/a | 0.019 | 12.951 | 0.257 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.220ms; driver.publication.readback 0.137ms; driver.publication.readback 0.115ms; driver.publication.readback 0.089ms; driver.publication.readback 0.077ms |
| 7ae69e970b053a8b000000000000019c | 48.862 | 2.875 | n/a | 0.000 | 7.028 | 0.959 | 3.196 | 0.166 | n/a | 6.328 | 28.264 | n/a | n/a | 0.047 | 9.903 | 0.203 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms |
| 7ae69e970b053a8b000000000000012d | 47.071 | 4.612 | n/a | 0.000 | 14.058 | 1.011 | 6.224 | 0.208 | n/a | 3.550 | 17.385 | n/a | n/a | 0.024 | 18.670 | 0.397 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.063ms |
| 7ae69e970b053a8b000000000000032e | 46.757 | 26.218 | n/a | 0.000 | 0.317 | 0.874 | 6.641 | 0.047 | n/a | 0.121 | 12.479 | n/a | n/a | 0.059 | 26.535 | 0.568 | 0.059 | node-14/thread-0/triplex.transact | none observed |
| 7ae69e970b053a8b000000000000011b | 46.269 | 9.103 | n/a | 0.000 | 8.489 | 1.735 | 3.412 | 0.033 | n/a | 1.819 | 21.657 | n/a | n/a | 0.021 | 17.592 | 0.380 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.201ms |
| 7ae69e970b053a8b0000000000000127 | 46.142 | 7.949 | n/a | 3.854 | 0.138 | 8.027 | 3.242 | 0.103 | n/a | 0.653 | 22.143 | n/a | n/a | 0.033 | 11.942 | 0.259 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.110ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.028ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.021ms |

## P2 / warmup / commit / 5-10 facts (200 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.126 | 0.997 | 0.000 | 0.893 | 3.806 | n/a | 0.000 | 0.088 | 1.317 | 2.545 | 0.051 | n/a | 0.317 | 11.288 | n/a | n/a | 0.030 | 4.184 | 0.204 | 0.030 |
| p99 | 113.791 | 4.959 | 0.007 | 11.259 | 15.368 | n/a | 6.520 | 14.413 | 12.142 | 11.331 | 0.982 | n/a | 4.771 | 81.006 | n/a | n/a | 0.137 | 20.351 | 0.528 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000001bf | 138.456 | 3.913 | n/a | 0.000 | 0.152 | 11.003 | 2.718 | 0.042 | n/a | 0.174 | 120.419 | n/a | n/a | 0.036 | 4.065 | 0.029 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.readback 0.164ms; driver.reader-basis.broadcast 0.061ms; driver.reader-basis.broadcast 0.037ms |
| 7ae69e970b053a8b00000000000001c0 | 117.262 | 4.211 | n/a | 0.000 | 0.134 | 1.020 | 6.890 | 0.043 | n/a | 0.423 | 104.500 | n/a | n/a | 0.040 | 4.345 | 0.037 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.037ms |
| 7ae69e970b053a8b0000000000000100 | 113.791 | 5.186 | n/a | 6.520 | 11.635 | 17.102 | 9.920 | 0.099 | n/a | 0.144 | 63.050 | n/a | n/a | 0.134 | 23.341 | 0.205 | 0.134 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.oracle-record 3.301ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms; driver.publication.persist-deferred 0.137ms; driver.publication.persist-deferred 0.043ms |
| 7ae69e970b053a8b00000000000001c1 | 95.369 | 5.646 | n/a | 0.000 | 0.137 | 1.672 | 6.522 | 0.068 | n/a | 0.170 | 81.006 | n/a | n/a | 0.148 | 5.783 | 0.061 | 0.148 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.022ms |
| 7ae69e970b053a8b000000000000035d | 79.311 | 3.107 | n/a | 0.000 | 14.700 | 3.276 | 20.912 | 0.467 | n/a | 4.771 | 32.051 | n/a | n/a | 0.026 | 17.807 | 0.225 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms; driver.publication.persist-deferred 0.025ms |
| 7ae69e970b053a8b0000000000000101 | 76.550 | 5.926 | n/a | 0.000 | 4.084 | 7.977 | 7.623 | 0.076 | n/a | 2.672 | 47.797 | n/a | n/a | 0.395 | 10.010 | 0.131 | 0.395 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.oracle-record 3.301ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms; driver.publication.persist-deferred 0.137ms; driver.reader-basis.broadcast 0.028ms |
| 7ae69e970b053a8b0000000000000102 | 75.348 | 7.205 | n/a | 6.800 | 0.163 | 4.858 | 5.344 | 0.114 | n/a | 0.587 | 50.178 | n/a | n/a | 0.100 | 14.167 | 0.188 | 0.100 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.oracle-record 3.301ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms; driver.publication.readback 0.173ms; driver.publication.persist-deferred 0.137ms |
| 7ae69e970b053a8b00000000000001c5 | 73.951 | 6.708 | n/a | 0.000 | 0.084 | 1.110 | 4.962 | 0.133 | n/a | 1.254 | 59.662 | n/a | n/a | 0.036 | 6.793 | 0.092 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | client.encode 6.582ms; driver.publication.readback 0.089ms; driver.publication.persist-deferred 0.063ms; driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.022ms |
| 7ae69e970b053a8b0000000000000121 | 71.032 | 5.355 | n/a | 0.000 | 3.179 | 5.769 | 25.929 | 0.144 | n/a | 1.774 | 28.816 | n/a | n/a | 0.065 | 8.534 | 0.120 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.605ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.020ms; driver.reader-basis.broadcast 0.011ms |
| 7ae69e970b053a8b00000000000001c8 | 64.988 | 3.175 | n/a | 0.000 | 0.094 | 37.468 | 1.603 | 0.029 | n/a | 1.604 | 20.986 | n/a | n/a | 0.031 | 3.268 | 0.050 | 0.031 | node-14/thread-0/socket.queue-and-write | client.encode 6.582ms; driver.publication.readback 0.220ms; driver.publication.readback 0.115ms; driver.publication.readback 0.089ms; driver.publication.readback 0.077ms |
| 7ae69e970b053a8b0000000000000123 | 62.868 | 8.405 | n/a | 0.000 | 5.074 | 12.142 | 9.923 | 0.146 | n/a | 0.297 | 26.855 | n/a | n/a | 0.026 | 13.479 | 0.214 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 1.004ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.028ms |
| 7ae69e970b053a8b0000000000000107 | 61.470 | 5.705 | n/a | 0.000 | 5.024 | 4.966 | 3.996 | 0.090 | n/a | 0.908 | 40.742 | n/a | n/a | 0.039 | 10.729 | 0.175 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.579ms; client.encode 3.177ms; driver.publication.readback 0.173ms; driver.publication.readback 0.115ms; driver.publication.readback 0.113ms |
| 7ae69e970b053a8b0000000000000104 | 59.351 | 5.439 | n/a | 0.000 | 9.277 | 4.963 | 9.004 | 0.030 | n/a | 0.213 | 30.403 | n/a | n/a | 0.021 | 14.716 | 0.248 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.579ms; driver.oracle-record 3.301ms; client.encode 3.177ms; driver.publication.readback 1.841ms; driver.expected-state.bind-receipt 1.022ms |
| 7ae69e970b053a8b0000000000000125 | 50.866 | 5.481 | n/a | 5.049 | 0.115 | 1.493 | 5.053 | 0.070 | n/a | 0.154 | 33.405 | n/a | n/a | 0.046 | 10.645 | 0.209 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | client.encode 1.004ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.028ms |
| 7ae69e970b053a8b00000000000001c9 | 50.316 | 9.944 | n/a | 0.000 | 3.007 | 6.038 | 1.820 | 0.037 | n/a | 0.156 | 29.296 | n/a | n/a | 0.019 | 12.951 | 0.257 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.220ms; driver.publication.readback 0.137ms; driver.publication.readback 0.115ms; driver.publication.readback 0.089ms; driver.publication.readback 0.077ms |
| 7ae69e970b053a8b000000000000019c | 48.862 | 2.875 | n/a | 0.000 | 7.028 | 0.959 | 3.196 | 0.166 | n/a | 6.328 | 28.264 | n/a | n/a | 0.047 | 9.903 | 0.203 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms |
| 7ae69e970b053a8b000000000000012d | 47.071 | 4.612 | n/a | 0.000 | 14.058 | 1.011 | 6.224 | 0.208 | n/a | 3.550 | 17.385 | n/a | n/a | 0.024 | 18.670 | 0.397 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.063ms |
| 7ae69e970b053a8b000000000000032e | 46.757 | 26.218 | n/a | 0.000 | 0.317 | 0.874 | 6.641 | 0.047 | n/a | 0.121 | 12.479 | n/a | n/a | 0.059 | 26.535 | 0.568 | 0.059 | node-14/thread-0/triplex.transact | none observed |
| 7ae69e970b053a8b000000000000011b | 46.269 | 9.103 | n/a | 0.000 | 8.489 | 1.735 | 3.412 | 0.033 | n/a | 1.819 | 21.657 | n/a | n/a | 0.021 | 17.592 | 0.380 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.201ms |
| 7ae69e970b053a8b0000000000000127 | 46.142 | 7.949 | n/a | 3.854 | 0.138 | 8.027 | 3.242 | 0.103 | n/a | 0.653 | 22.143 | n/a | n/a | 0.033 | 11.942 | 0.259 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.110ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.028ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.021ms |

## P2/P4 / read-your-own-write / read (449 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1094.114 | n/a | n/a | n/a | 89.670 | 883.454 | 0.000 | 0.000 | 5.125 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.512 | 998.130 | 0.920 | 68.512 |
| p99 | 2007.383 | n/a | n/a | n/a | 261.098 | 1847.060 | 38.213 | 0.000 | 78.697 | 45.790 | 2.347 | n/a | 0.028 | 0.000 | n/a | n/a | 352.079 | 1918.672 | 1.000 | 352.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b0000000000000258 | 2119.338 | 112.085 | 1847.060 | 5.913 | 0.000 | 0.616 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 153.663 | 1965.059 | 0.927 | 153.663 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b0000000000000260 | 2080.739 | 103.861 | 1919.059 | 5.913 | 0.000 | 0.382 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.523 | 2028.833 | 0.975 | 51.523 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b000000000000024d | 2031.915 | 172.160 | 1610.538 | 0.000 | 0.000 | 25.807 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 223.409 | 1782.698 | 0.877 | 223.409 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b000000000000026d | 2031.316 | 21.835 | 1962.621 | 0.000 | 0.000 | 4.564 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.296 | 1984.456 | 0.977 | 42.296 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b0000000000000280 | 2007.383 | 17.348 | 1922.727 | 0.000 | 0.000 | 0.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 67.039 | 1940.075 | 0.966 | 67.039 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b000000000000028c | 1938.709 | 31.773 | 1886.899 | 0.000 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.724 | 1918.672 | 0.990 | 19.724 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b000000000000024e | 1934.255 | 203.046 | 1552.855 | 0.000 | 0.000 | 0.299 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 178.055 | 1755.901 | 0.908 | 178.055 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b000000000000025b | 1904.553 | 130.744 | 1727.045 | 5.913 | 0.000 | 8.840 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.011 | 1863.702 | 0.979 | 32.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b0000000000000244 | 1891.170 | 149.573 | 1499.016 | 23.509 | 0.000 | 1.175 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 217.897 | 1672.098 | 0.884 | 217.897 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.346ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b0000000000000298 | 1887.199 | 25.367 | 1828.831 | 0.000 | 0.000 | 2.598 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.403 | 1854.198 | 0.983 | 30.403 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b0000000000000267 | 1884.032 | 43.849 | 1798.033 | 0.000 | 0.000 | 0.498 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.652 | 1841.882 | 0.978 | 41.652 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b000000000000027a | 1866.745 | 89.925 | 1711.159 | 0.000 | 0.000 | 9.548 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.114 | 1801.083 | 0.965 | 56.114 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b0000000000000286 | 1839.107 | 32.815 | 1744.767 | 0.000 | 0.000 | 12.002 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.524 | 1777.581 | 0.967 | 49.524 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b0000000000000246 | 1822.056 | 213.327 | 1429.578 | 0.000 | 0.000 | 2.109 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 177.042 | 1642.905 | 0.902 | 177.042 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.346ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms |
| 7ae69e970b053a8b00000000000002a4 | 1814.720 | 119.056 | 1662.906 | 0.000 | 0.000 | 1.290 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.468 | 1781.962 | 0.982 | 31.468 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b0000000000000512 | 1805.488 | 91.816 | 1637.030 | 0.000 | 0.000 | 15.255 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.386 | 1728.846 | 0.958 | 61.386 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.072ms; driver.publication.readback 0.434ms; driver.publication.readback 0.271ms; driver.publication.readback 0.204ms; driver.publication.readback 0.199ms |
| 7ae69e970b053a8b0000000000000507 | 1802.479 | 60.726 | 1604.604 | 0.000 | 0.000 | 15.763 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 121.387 | 1665.330 | 0.924 | 121.387 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.072ms; driver.publication.readback 0.434ms; driver.publication.readback 0.271ms; driver.publication.readback 0.204ms; driver.publication.readback 0.199ms |
| 7ae69e970b053a8b00000000000002ad | 1791.741 | 20.164 | 1701.298 | 0.000 | 0.000 | 0.484 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 69.794 | 1721.462 | 0.961 | 69.794 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b000000000000028e | 1788.071 | 87.398 | 1657.940 | 0.000 | 0.000 | 4.821 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 37.913 | 1745.338 | 0.976 | 37.913 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.capture 10.549ms; driver.expected-state.bind-receipt 3.215ms; driver.expected-state.bind-receipt 1.273ms; driver.expected-state.bind-receipt 1.135ms; driver.publication.readback 0.425ms |
| 7ae69e970b053a8b00000000000001f2 | 1763.045 | 233.823 | 1351.081 | 27.448 | 0.000 | 3.725 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 146.968 | 1612.352 | 0.915 | 146.968 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 2.477ms; driver.expected-state.bind-receipt 1.346ms; driver.publication.readback 1.248ms; driver.expected-state.bind-receipt 1.135ms; driver.expected-state.bind-receipt 1.035ms |

## P2 / idle-25 / commit (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.013 | 0.998 | 0.000 | 0.801 | 3.791 | n/a | 0.000 | 0.104 | 1.313 | 2.056 | 0.035 | n/a | 0.211 | 9.625 | n/a | n/a | 0.030 | 4.081 | 0.234 | 0.030 |
| p99 | 686.299 | 13.890 | 0.310 | 11.688 | 312.565 | n/a | 0.000 | 445.994 | 489.204 | 24.289 | 0.238 | n/a | 18.866 | 110.544 | n/a | n/a | 0.195 | 476.827 | 0.828 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b000000000000040b | 710.291 | 94.957 | n/a | 0.000 | 131.155 | 446.765 | 1.493 | 0.023 | n/a | 2.772 | 33.100 | n/a | n/a | 0.026 | 226.111 | 0.318 | 0.026 | node-14/thread-0/socket.queue-and-write | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.572ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b000000000000040c | 686.299 | 148.875 | n/a | 0.000 | 111.744 | 380.953 | 10.163 | 0.033 | n/a | 0.089 | 34.423 | n/a | n/a | 0.019 | 260.619 | 0.380 | 0.019 | node-14/thread-0/socket.queue-and-write | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.572ms; client.encode 10.336ms |
| 7ae69e970b053a8b0000000000000409 | 669.247 | 68.301 | n/a | 0.000 | 39.635 | 545.259 | 1.643 | 0.032 | n/a | 3.244 | 11.102 | n/a | n/a | 0.031 | 107.936 | 0.161 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 26.275ms; client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms |
| 7ae69e970b053a8b000000000000040d | 659.532 | 202.196 | n/a | 0.000 | 92.103 | 342.181 | 1.817 | 0.024 | n/a | 0.108 | 21.084 | n/a | n/a | 0.019 | 294.299 | 0.446 | 0.019 | node-14/thread-0/socket.queue-and-write | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.329ms; client.encode 10.325ms |
| 7ae69e970b053a8b000000000000040a | 645.362 | 122.919 | n/a | 0.000 | 20.148 | 489.204 | 1.811 | 0.029 | n/a | 1.782 | 9.447 | n/a | n/a | 0.022 | 143.067 | 0.222 | 0.022 | node-14/thread-0/socket.wait-first-byte | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.572ms; client.encode 10.336ms |
| 7ae69e970b053a8b000000000000040e | 637.332 | 254.447 | n/a | 0.000 | 72.933 | 266.502 | 2.208 | 0.052 | n/a | 5.878 | 35.278 | n/a | n/a | 0.034 | 327.380 | 0.514 | 0.034 | node-14/thread-0/socket.queue-and-write | client.encode 11.215ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms; client.encode 10.325ms |
| 7ae69e970b053a8b000000000000040f | 635.848 | 312.565 | n/a | 0.000 | 53.717 | 252.404 | 1.916 | 0.042 | n/a | 2.563 | 12.612 | n/a | n/a | 0.028 | 366.282 | 0.576 | 0.028 | node-14/thread-0/client.validation-and-staging | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.336ms; client.encode 10.329ms; client.encode 10.325ms |
| 7ae69e970b053a8b0000000000000410 | 620.941 | 327.538 | n/a | 126.250 | 34.377 | 100.948 | 1.535 | 0.078 | n/a | 0.216 | 29.951 | n/a | n/a | 0.048 | 488.165 | 0.786 | 0.048 | node-14/thread-0/client.validation-and-staging | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b0000000000000418 | 590.366 | 11.594 | n/a | 0.000 | 421.132 | 103.943 | 1.255 | 0.036 | n/a | 0.076 | 52.324 | n/a | n/a | 0.007 | 432.726 | 0.733 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b000000000000041d | 585.608 | 24.906 | n/a | 0.000 | 296.783 | 151.507 | 4.632 | 0.028 | n/a | 5.729 | 102.012 | n/a | n/a | 0.011 | 321.690 | 0.549 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.358ms |
| 7ae69e970b053a8b0000000000000416 | 572.951 | 6.215 | n/a | 0.000 | 470.611 | 85.197 | 2.032 | 0.048 | n/a | 0.108 | 8.715 | n/a | n/a | 0.025 | 476.827 | 0.832 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b0000000000000419 | 561.813 | 15.637 | n/a | 0.000 | 396.279 | 103.862 | 1.750 | 0.028 | n/a | 0.089 | 44.159 | n/a | n/a | 0.008 | 411.916 | 0.733 | 0.008 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms; client.encode 0.454ms |
| 7ae69e970b053a8b000000000000041a | 560.768 | 18.098 | n/a | 0.000 | 371.378 | 106.988 | 1.906 | 0.028 | n/a | 13.372 | 48.992 | n/a | n/a | 0.006 | 389.476 | 0.695 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms; driver.publication.readback 0.336ms |
| 7ae69e970b053a8b0000000000000417 | 549.536 | 8.902 | n/a | 0.000 | 445.994 | 71.953 | 2.325 | 0.050 | n/a | 4.106 | 16.193 | n/a | n/a | 0.013 | 454.896 | 0.828 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b000000000000041c | 543.833 | 23.592 | n/a | 0.000 | 321.608 | 128.077 | 1.837 | 0.058 | n/a | 0.110 | 68.545 | n/a | n/a | 0.007 | 345.200 | 0.635 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.336ms |
| 7ae69e970b053a8b000000000000041b | 518.817 | 21.794 | n/a | 0.000 | 346.459 | 100.143 | 2.252 | 0.134 | n/a | 0.108 | 47.902 | n/a | n/a | 0.026 | 368.253 | 0.710 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 9.767ms; driver.publication.readback 0.336ms |
| 7ae69e970b053a8b000000000000041e | 505.099 | 25.167 | n/a | 0.000 | 272.003 | 130.157 | 3.357 | 0.024 | n/a | 0.142 | 74.238 | n/a | n/a | 0.011 | 297.169 | 0.588 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.336ms; driver.publication.readback 0.211ms |
| 7ae69e970b053a8b0000000000000420 | 496.469 | 33.409 | n/a | 0.000 | 222.286 | 142.010 | 3.100 | 0.061 | n/a | 0.208 | 95.387 | n/a | n/a | 0.009 | 255.695 | 0.515 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.600ms; driver.expected-state.bind-receipt 1.765ms; client.encode 1.463ms; driver.publication.readback 0.336ms; driver.publication.readback 0.211ms |
| 7ae69e970b053a8b0000000000000421 | 446.739 | 32.270 | n/a | 0.000 | 197.389 | 118.168 | 3.834 | 0.043 | n/a | 18.866 | 76.163 | n/a | n/a | 0.006 | 229.658 | 0.514 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.600ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.336ms; driver.publication.readback 0.211ms; driver.publication.readback 0.196ms |
| 7ae69e970b053a8b000000000000041f | 440.845 | 27.854 | n/a | 0.000 | 247.147 | 105.843 | 1.531 | 0.025 | n/a | 0.087 | 58.349 | n/a | n/a | 0.009 | 275.001 | 0.624 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; driver.publication.readback 0.336ms; driver.publication.readback 0.196ms; driver.reader-basis.broadcast 0.194ms |

## P2 / idle-25 / commit / 5-10 facts (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.013 | 0.998 | 0.000 | 0.801 | 3.791 | n/a | 0.000 | 0.104 | 1.313 | 2.056 | 0.035 | n/a | 0.211 | 9.625 | n/a | n/a | 0.030 | 4.081 | 0.234 | 0.030 |
| p99 | 686.299 | 13.890 | 0.310 | 11.688 | 312.565 | n/a | 0.000 | 445.994 | 489.204 | 24.289 | 0.238 | n/a | 18.866 | 110.544 | n/a | n/a | 0.195 | 476.827 | 0.828 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b000000000000040b | 710.291 | 94.957 | n/a | 0.000 | 131.155 | 446.765 | 1.493 | 0.023 | n/a | 2.772 | 33.100 | n/a | n/a | 0.026 | 226.111 | 0.318 | 0.026 | node-14/thread-0/socket.queue-and-write | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.572ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b000000000000040c | 686.299 | 148.875 | n/a | 0.000 | 111.744 | 380.953 | 10.163 | 0.033 | n/a | 0.089 | 34.423 | n/a | n/a | 0.019 | 260.619 | 0.380 | 0.019 | node-14/thread-0/socket.queue-and-write | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.572ms; client.encode 10.336ms |
| 7ae69e970b053a8b0000000000000409 | 669.247 | 68.301 | n/a | 0.000 | 39.635 | 545.259 | 1.643 | 0.032 | n/a | 3.244 | 11.102 | n/a | n/a | 0.031 | 107.936 | 0.161 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 26.275ms; client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms |
| 7ae69e970b053a8b000000000000040d | 659.532 | 202.196 | n/a | 0.000 | 92.103 | 342.181 | 1.817 | 0.024 | n/a | 0.108 | 21.084 | n/a | n/a | 0.019 | 294.299 | 0.446 | 0.019 | node-14/thread-0/socket.queue-and-write | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.329ms; client.encode 10.325ms |
| 7ae69e970b053a8b000000000000040a | 645.362 | 122.919 | n/a | 0.000 | 20.148 | 489.204 | 1.811 | 0.029 | n/a | 1.782 | 9.447 | n/a | n/a | 0.022 | 143.067 | 0.222 | 0.022 | node-14/thread-0/socket.wait-first-byte | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.572ms; client.encode 10.336ms |
| 7ae69e970b053a8b000000000000040e | 637.332 | 254.447 | n/a | 0.000 | 72.933 | 266.502 | 2.208 | 0.052 | n/a | 5.878 | 35.278 | n/a | n/a | 0.034 | 327.380 | 0.514 | 0.034 | node-14/thread-0/socket.queue-and-write | client.encode 11.215ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms; client.encode 10.325ms |
| 7ae69e970b053a8b000000000000040f | 635.848 | 312.565 | n/a | 0.000 | 53.717 | 252.404 | 1.916 | 0.042 | n/a | 2.563 | 12.612 | n/a | n/a | 0.028 | 366.282 | 0.576 | 0.028 | node-14/thread-0/client.validation-and-staging | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.336ms; client.encode 10.329ms; client.encode 10.325ms |
| 7ae69e970b053a8b0000000000000410 | 620.941 | 327.538 | n/a | 126.250 | 34.377 | 100.948 | 1.535 | 0.078 | n/a | 0.216 | 29.951 | n/a | n/a | 0.048 | 488.165 | 0.786 | 0.048 | node-14/thread-0/client.validation-and-staging | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b0000000000000418 | 590.366 | 11.594 | n/a | 0.000 | 421.132 | 103.943 | 1.255 | 0.036 | n/a | 0.076 | 52.324 | n/a | n/a | 0.007 | 432.726 | 0.733 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b000000000000041d | 585.608 | 24.906 | n/a | 0.000 | 296.783 | 151.507 | 4.632 | 0.028 | n/a | 5.729 | 102.012 | n/a | n/a | 0.011 | 321.690 | 0.549 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.358ms |
| 7ae69e970b053a8b0000000000000416 | 572.951 | 6.215 | n/a | 0.000 | 470.611 | 85.197 | 2.032 | 0.048 | n/a | 0.108 | 8.715 | n/a | n/a | 0.025 | 476.827 | 0.832 | 0.025 | node-14/thread-0/driver.queue.scheduler-late | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b0000000000000419 | 561.813 | 15.637 | n/a | 0.000 | 396.279 | 103.862 | 1.750 | 0.028 | n/a | 0.089 | 44.159 | n/a | n/a | 0.008 | 411.916 | 0.733 | 0.008 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms; client.encode 0.454ms |
| 7ae69e970b053a8b000000000000041a | 560.768 | 18.098 | n/a | 0.000 | 371.378 | 106.988 | 1.906 | 0.028 | n/a | 13.372 | 48.992 | n/a | n/a | 0.006 | 389.476 | 0.695 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms; driver.publication.readback 0.336ms |
| 7ae69e970b053a8b0000000000000417 | 549.536 | 8.902 | n/a | 0.000 | 445.994 | 71.953 | 2.325 | 0.050 | n/a | 4.106 | 16.193 | n/a | n/a | 0.013 | 454.896 | 0.828 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | client.encode 11.215ms; client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 10.329ms |
| 7ae69e970b053a8b000000000000041c | 543.833 | 23.592 | n/a | 0.000 | 321.608 | 128.077 | 1.837 | 0.058 | n/a | 0.110 | 68.545 | n/a | n/a | 0.007 | 345.200 | 0.635 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.336ms |
| 7ae69e970b053a8b000000000000041b | 518.817 | 21.794 | n/a | 0.000 | 346.459 | 100.143 | 2.252 | 0.134 | n/a | 0.108 | 47.902 | n/a | n/a | 0.026 | 368.253 | 0.710 | 0.026 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; client.encode 10.336ms; client.encode 9.767ms; driver.publication.readback 0.336ms |
| 7ae69e970b053a8b000000000000041e | 505.099 | 25.167 | n/a | 0.000 | 272.003 | 130.157 | 3.357 | 0.024 | n/a | 0.142 | 74.238 | n/a | n/a | 0.011 | 297.169 | 0.588 | 0.011 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.336ms; driver.publication.readback 0.211ms |
| 7ae69e970b053a8b0000000000000420 | 496.469 | 33.409 | n/a | 0.000 | 222.286 | 142.010 | 3.100 | 0.061 | n/a | 0.208 | 95.387 | n/a | n/a | 0.009 | 255.695 | 0.515 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.600ms; driver.expected-state.bind-receipt 1.765ms; client.encode 1.463ms; driver.publication.readback 0.336ms; driver.publication.readback 0.211ms |
| 7ae69e970b053a8b0000000000000421 | 446.739 | 32.270 | n/a | 0.000 | 197.389 | 118.168 | 3.834 | 0.043 | n/a | 18.866 | 76.163 | n/a | n/a | 0.006 | 229.658 | 0.514 | 0.006 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.600ms; driver.expected-state.bind-receipt 1.765ms; driver.publication.readback 0.336ms; driver.publication.readback 0.211ms; driver.publication.readback 0.196ms |
| 7ae69e970b053a8b000000000000041f | 440.845 | 27.854 | n/a | 0.000 | 247.147 | 105.843 | 1.531 | 0.025 | n/a | 0.087 | 58.349 | n/a | n/a | 0.009 | 275.001 | 0.624 | 0.009 | node-14/thread-0/driver.queue.scheduler-late | client.encode 10.618ms; client.encode 10.600ms; driver.publication.readback 0.336ms; driver.publication.readback 0.196ms; driver.reader-basis.broadcast 0.194ms |

## P2 / idle-50 / commit (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.011 | 0.998 | 0.000 | 0.852 | 3.728 | n/a | 0.000 | 0.106 | 1.066 | 2.076 | 0.031 | n/a | 0.304 | 8.176 | n/a | n/a | 0.036 | 3.993 | 0.245 | 0.036 |
| p99 | 73.242 | 34.054 | 0.053 | 34.321 | 36.607 | n/a | 0.000 | 17.285 | 9.547 | 8.665 | 1.751 | n/a | 3.578 | 19.620 | n/a | n/a | 0.169 | 39.142 | 0.659 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000005cd | 80.667 | 4.090 | n/a | 0.000 | 17.285 | 46.972 | 1.601 | 0.021 | n/a | 0.118 | 10.411 | n/a | n/a | 0.169 | 21.375 | 0.265 | 0.169 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 5.110ms; driver.publication.persist-deferred 0.252ms; driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.096ms |
| 7ae69e970b053a8b0000000000000586 | 73.242 | 44.699 | n/a | 0.000 | 0.067 | 4.624 | 3.632 | 0.035 | n/a | 3.578 | 16.576 | n/a | n/a | 0.031 | 44.766 | 0.611 | 0.031 | node-14/thread-0/driver.expected-state.bind-receipt | none observed |
| 7ae69e970b053a8b00000000000005cb | 55.711 | 36.607 | n/a | 0.000 | 0.083 | 3.930 | 2.518 | 0.035 | n/a | 0.113 | 12.389 | n/a | n/a | 0.037 | 36.690 | 0.659 | 0.037 | node-14/thread-0/driver.expected-state.bind-receipt | none observed |
| 7ae69e970b053a8b0000000000000588 | 51.447 | 14.077 | n/a | 0.000 | 25.065 | 0.612 | 1.544 | 0.024 | n/a | 0.104 | 9.984 | n/a | n/a | 0.037 | 39.142 | 0.761 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 21.329ms; driver.expected-state.add-commit 1.558ms; driver.reader-basis.broadcast 0.127ms; driver.publication.persist-deferred 0.114ms |
| 7ae69e970b053a8b00000000000005b0 | 42.183 | 4.967 | n/a | 0.000 | 14.001 | 2.030 | 4.224 | 0.130 | n/a | 0.357 | 16.434 | n/a | n/a | 0.040 | 18.968 | 0.450 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.133ms |
| 7ae69e970b053a8b00000000000005e3 | 41.131 | 5.498 | n/a | 0.000 | 11.922 | 1.229 | 2.556 | 0.061 | n/a | 3.780 | 16.052 | n/a | n/a | 0.031 | 17.420 | 0.424 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000059e | 40.688 | 8.928 | n/a | 0.000 | 7.125 | 1.241 | 2.700 | 0.122 | n/a | 3.098 | 17.423 | n/a | n/a | 0.050 | 16.054 | 0.395 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.145ms |
| 7ae69e970b053a8b0000000000000556 | 39.672 | 4.503 | n/a | 0.000 | 6.007 | 2.478 | 8.665 | 0.056 | n/a | 0.303 | 17.635 | n/a | n/a | 0.026 | 10.510 | 0.265 | 0.026 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005ce | 33.604 | 2.908 | n/a | 0.000 | 16.510 | 0.935 | 4.376 | 0.031 | n/a | 0.100 | 8.710 | n/a | n/a | 0.033 | 19.418 | 0.578 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.016ms |
| 7ae69e970b053a8b0000000000000671 | 32.676 | 5.258 | n/a | 0.000 | 0.109 | 1.943 | 2.385 | 0.031 | n/a | 1.019 | 21.873 | n/a | n/a | 0.058 | 5.367 | 0.164 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.119ms |
| 7ae69e970b053a8b0000000000000554 | 32.019 | 5.957 | n/a | 0.000 | 0.141 | 1.184 | 4.495 | 0.086 | n/a | 0.487 | 19.620 | n/a | n/a | 0.051 | 6.097 | 0.190 | 0.051 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000696 | 31.101 | 6.300 | n/a | 0.000 | 0.122 | 6.702 | 1.564 | 0.015 | n/a | 0.417 | 15.932 | n/a | n/a | 0.049 | 6.421 | 0.206 | 0.049 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005a0 | 30.157 | 8.721 | n/a | 0.000 | 0.162 | 0.683 | 1.690 | 0.022 | n/a | 0.304 | 18.387 | n/a | n/a | 0.188 | 8.883 | 0.295 | 0.188 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms |
| 7ae69e970b053a8b000000000000056f | 28.569 | 3.813 | n/a | 0.000 | 3.583 | 3.316 | 5.715 | 0.030 | n/a | 2.291 | 9.796 | n/a | n/a | 0.025 | 7.396 | 0.259 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005e5 | 28.537 | 5.758 | n/a | 0.000 | 0.114 | 3.854 | 5.512 | 0.035 | n/a | 0.251 | 12.983 | n/a | n/a | 0.031 | 5.872 | 0.206 | 0.031 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.202ms; driver.reader-basis.broadcast 0.160ms |
| 7ae69e970b053a8b00000000000005d5 | 28.502 | 8.294 | n/a | 0.000 | 0.161 | 1.558 | 2.649 | 0.073 | n/a | 0.106 | 15.588 | n/a | n/a | 0.073 | 8.455 | 0.297 | 0.073 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005a2 | 28.366 | 9.247 | n/a | 0.000 | 0.078 | 3.155 | 6.734 | 0.144 | n/a | 0.769 | 8.157 | n/a | n/a | 0.083 | 9.325 | 0.329 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.246ms |
| 7ae69e970b053a8b00000000000005b2 | 27.852 | 8.729 | n/a | 0.000 | 0.075 | 0.964 | 5.037 | 0.036 | n/a | 0.681 | 12.256 | n/a | n/a | 0.074 | 8.805 | 0.316 | 0.074 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005d3 | 27.835 | 12.386 | n/a | 0.000 | 0.177 | 1.287 | 2.024 | 0.044 | n/a | 0.160 | 11.700 | n/a | n/a | 0.058 | 12.563 | 0.451 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |
| 7ae69e970b053a8b00000000000005d1 | 27.050 | 4.402 | n/a | 0.000 | 0.109 | 0.945 | 2.671 | 0.656 | n/a | 1.189 | 17.055 | n/a | n/a | 0.023 | 4.511 | 0.167 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.011 | 0.998 | 0.000 | 0.852 | 3.728 | n/a | 0.000 | 0.106 | 1.066 | 2.076 | 0.031 | n/a | 0.304 | 8.176 | n/a | n/a | 0.036 | 3.993 | 0.245 | 0.036 |
| p99 | 73.242 | 34.054 | 0.053 | 34.321 | 36.607 | n/a | 0.000 | 17.285 | 9.547 | 8.665 | 1.751 | n/a | 3.578 | 19.620 | n/a | n/a | 0.169 | 39.142 | 0.659 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000005cd | 80.667 | 4.090 | n/a | 0.000 | 17.285 | 46.972 | 1.601 | 0.021 | n/a | 0.118 | 10.411 | n/a | n/a | 0.169 | 21.375 | 0.265 | 0.169 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 5.110ms; driver.publication.persist-deferred 0.252ms; driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.096ms |
| 7ae69e970b053a8b0000000000000586 | 73.242 | 44.699 | n/a | 0.000 | 0.067 | 4.624 | 3.632 | 0.035 | n/a | 3.578 | 16.576 | n/a | n/a | 0.031 | 44.766 | 0.611 | 0.031 | node-14/thread-0/driver.expected-state.bind-receipt | none observed |
| 7ae69e970b053a8b00000000000005cb | 55.711 | 36.607 | n/a | 0.000 | 0.083 | 3.930 | 2.518 | 0.035 | n/a | 0.113 | 12.389 | n/a | n/a | 0.037 | 36.690 | 0.659 | 0.037 | node-14/thread-0/driver.expected-state.bind-receipt | none observed |
| 7ae69e970b053a8b0000000000000588 | 51.447 | 14.077 | n/a | 0.000 | 25.065 | 0.612 | 1.544 | 0.024 | n/a | 0.104 | 9.984 | n/a | n/a | 0.037 | 39.142 | 0.761 | 0.037 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 21.329ms; driver.expected-state.add-commit 1.558ms; driver.reader-basis.broadcast 0.127ms; driver.publication.persist-deferred 0.114ms |
| 7ae69e970b053a8b00000000000005b0 | 42.183 | 4.967 | n/a | 0.000 | 14.001 | 2.030 | 4.224 | 0.130 | n/a | 0.357 | 16.434 | n/a | n/a | 0.040 | 18.968 | 0.450 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.133ms |
| 7ae69e970b053a8b00000000000005e3 | 41.131 | 5.498 | n/a | 0.000 | 11.922 | 1.229 | 2.556 | 0.061 | n/a | 3.780 | 16.052 | n/a | n/a | 0.031 | 17.420 | 0.424 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000059e | 40.688 | 8.928 | n/a | 0.000 | 7.125 | 1.241 | 2.700 | 0.122 | n/a | 3.098 | 17.423 | n/a | n/a | 0.050 | 16.054 | 0.395 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.145ms |
| 7ae69e970b053a8b0000000000000556 | 39.672 | 4.503 | n/a | 0.000 | 6.007 | 2.478 | 8.665 | 0.056 | n/a | 0.303 | 17.635 | n/a | n/a | 0.026 | 10.510 | 0.265 | 0.026 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005ce | 33.604 | 2.908 | n/a | 0.000 | 16.510 | 0.935 | 4.376 | 0.031 | n/a | 0.100 | 8.710 | n/a | n/a | 0.033 | 19.418 | 0.578 | 0.033 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.016ms |
| 7ae69e970b053a8b0000000000000671 | 32.676 | 5.258 | n/a | 0.000 | 0.109 | 1.943 | 2.385 | 0.031 | n/a | 1.019 | 21.873 | n/a | n/a | 0.058 | 5.367 | 0.164 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.119ms |
| 7ae69e970b053a8b0000000000000554 | 32.019 | 5.957 | n/a | 0.000 | 0.141 | 1.184 | 4.495 | 0.086 | n/a | 0.487 | 19.620 | n/a | n/a | 0.051 | 6.097 | 0.190 | 0.051 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000696 | 31.101 | 6.300 | n/a | 0.000 | 0.122 | 6.702 | 1.564 | 0.015 | n/a | 0.417 | 15.932 | n/a | n/a | 0.049 | 6.421 | 0.206 | 0.049 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005a0 | 30.157 | 8.721 | n/a | 0.000 | 0.162 | 0.683 | 1.690 | 0.022 | n/a | 0.304 | 18.387 | n/a | n/a | 0.188 | 8.883 | 0.295 | 0.188 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms |
| 7ae69e970b053a8b000000000000056f | 28.569 | 3.813 | n/a | 0.000 | 3.583 | 3.316 | 5.715 | 0.030 | n/a | 2.291 | 9.796 | n/a | n/a | 0.025 | 7.396 | 0.259 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005e5 | 28.537 | 5.758 | n/a | 0.000 | 0.114 | 3.854 | 5.512 | 0.035 | n/a | 0.251 | 12.983 | n/a | n/a | 0.031 | 5.872 | 0.206 | 0.031 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.202ms; driver.reader-basis.broadcast 0.160ms |
| 7ae69e970b053a8b00000000000005d5 | 28.502 | 8.294 | n/a | 0.000 | 0.161 | 1.558 | 2.649 | 0.073 | n/a | 0.106 | 15.588 | n/a | n/a | 0.073 | 8.455 | 0.297 | 0.073 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005a2 | 28.366 | 9.247 | n/a | 0.000 | 0.078 | 3.155 | 6.734 | 0.144 | n/a | 0.769 | 8.157 | n/a | n/a | 0.083 | 9.325 | 0.329 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.246ms |
| 7ae69e970b053a8b00000000000005b2 | 27.852 | 8.729 | n/a | 0.000 | 0.075 | 0.964 | 5.037 | 0.036 | n/a | 0.681 | 12.256 | n/a | n/a | 0.074 | 8.805 | 0.316 | 0.074 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000005d3 | 27.835 | 12.386 | n/a | 0.000 | 0.177 | 1.287 | 2.024 | 0.044 | n/a | 0.160 | 11.700 | n/a | n/a | 0.058 | 12.563 | 0.451 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |
| 7ae69e970b053a8b00000000000005d1 | 27.050 | 4.402 | n/a | 0.000 | 0.109 | 0.945 | 2.671 | 0.656 | n/a | 1.189 | 17.055 | n/a | n/a | 0.023 | 4.511 | 0.167 | 0.023 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.988 | 1.001 | 0.000 | 0.914 | 3.943 | n/a | 0.000 | 0.101 | 1.104 | 2.087 | 0.022 | n/a | 0.246 | 7.837 | n/a | n/a | 0.046 | 4.078 | 0.258 | 0.046 |
| p99 | 186.022 | 3.975 | 0.000 | 3.844 | 14.449 | n/a | 0.000 | 4.268 | 9.648 | 9.840 | 0.163 | n/a | 3.042 | 169.500 | n/a | n/a | 0.166 | 15.655 | 0.485 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000007aa | 281.117 | 4.254 | n/a | 0.000 | 0.078 | 0.917 | 1.986 | 0.014 | n/a | 0.109 | 273.708 | n/a | n/a | 0.051 | 4.332 | 0.015 | 0.051 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.175ms; driver.reader-basis.broadcast 0.104ms; driver.reader-basis.broadcast 0.101ms |
| 7ae69e970b053a8b00000000000007b0 | 186.022 | 10.046 | n/a | 0.000 | 0.250 | 1.391 | 4.297 | 0.053 | n/a | 0.410 | 169.500 | n/a | n/a | 0.073 | 10.296 | 0.055 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.887ms; driver.reader-basis.broadcast 0.426ms |
| 7ae69e970b053a8b00000000000007ab | 68.716 | 8.925 | n/a | 0.000 | 0.081 | 1.786 | 5.420 | 0.084 | n/a | 0.598 | 51.766 | n/a | n/a | 0.057 | 9.006 | 0.131 | 0.057 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.237ms; driver.publication.persist-deferred 0.053ms |
| 7ae69e970b053a8b00000000000007f6 | 49.365 | 5.618 | n/a | 0.000 | 3.884 | 1.915 | 27.175 | 0.039 | n/a | 0.135 | 10.552 | n/a | n/a | 0.047 | 9.502 | 0.192 | 0.047 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 7ae69e970b053a8b000000000000073d | 48.181 | 15.176 | n/a | 0.000 | 0.122 | 2.865 | 9.840 | 0.078 | n/a | 1.153 | 18.884 | n/a | n/a | 0.064 | 15.297 | 0.317 | 0.064 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006ec | 47.457 | 14.449 | n/a | 0.000 | 1.206 | 1.735 | 7.689 | 0.069 | n/a | 0.353 | 21.903 | n/a | n/a | 0.052 | 15.655 | 0.330 | 0.052 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000762 | 46.816 | 13.066 | n/a | 0.000 | 0.647 | 9.648 | 8.498 | 0.071 | n/a | 0.488 | 14.287 | n/a | n/a | 0.110 | 13.713 | 0.293 | 0.110 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.192ms |
| 7ae69e970b053a8b000000000000074b | 42.031 | 14.187 | n/a | 0.000 | 3.142 | 7.498 | 5.454 | 0.032 | n/a | 0.130 | 11.463 | n/a | n/a | 0.126 | 17.329 | 0.412 | 0.126 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.185ms |
| 7ae69e970b053a8b00000000000006fc | 40.659 | 4.590 | n/a | 0.000 | 0.120 | 0.751 | 1.609 | 0.014 | n/a | 0.681 | 32.831 | n/a | n/a | 0.063 | 4.710 | 0.116 | 0.063 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000075f | 40.468 | 11.322 | n/a | 0.000 | 0.135 | 15.038 | 4.077 | 0.035 | n/a | 0.590 | 9.165 | n/a | n/a | 0.108 | 11.456 | 0.283 | 0.108 | node-14/thread-0/socket.body-read | none observed |
| 7ae69e970b053a8b00000000000006da | 38.120 | 13.269 | n/a | 0.000 | 0.156 | 2.354 | 4.783 | 0.054 | n/a | 0.365 | 17.041 | n/a | n/a | 0.098 | 13.425 | 0.352 | 0.098 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006f5 | 36.946 | 6.223 | n/a | 0.000 | 0.253 | 2.518 | 5.917 | 0.038 | n/a | 0.805 | 21.104 | n/a | n/a | 0.088 | 6.476 | 0.175 | 0.088 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000734 | 33.986 | 7.715 | n/a | 0.000 | 0.122 | 2.341 | 6.846 | 0.074 | n/a | 0.299 | 16.541 | n/a | n/a | 0.048 | 7.837 | 0.231 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000007f9 | 33.221 | 11.232 | n/a | 0.000 | 0.103 | 1.432 | 6.882 | 0.053 | n/a | 0.655 | 12.827 | n/a | n/a | 0.037 | 11.335 | 0.341 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000007fd | 32.610 | 8.418 | n/a | 0.000 | 4.268 | 1.873 | 3.593 | 0.268 | n/a | 1.071 | 13.074 | n/a | n/a | 0.045 | 12.687 | 0.389 | 0.045 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000007b2 | 29.211 | 7.960 | n/a | 0.000 | 0.210 | 1.898 | 6.251 | 0.041 | n/a | 0.928 | 11.844 | n/a | n/a | 0.079 | 8.171 | 0.280 | 0.079 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000802 | 29.020 | 13.758 | n/a | 0.000 | 0.128 | 1.002 | 1.631 | 0.013 | n/a | 0.098 | 12.339 | n/a | n/a | 0.051 | 13.886 | 0.479 | 0.051 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006e1 | 28.978 | 14.392 | n/a | 0.000 | 1.083 | 1.268 | 2.145 | 0.028 | n/a | 0.282 | 9.712 | n/a | n/a | 0.069 | 15.475 | 0.534 | 0.069 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006cd | 28.469 | 4.702 | n/a | 0.000 | 0.136 | 1.666 | 6.245 | 0.041 | n/a | 0.223 | 15.425 | n/a | n/a | 0.031 | 4.838 | 0.170 | 0.031 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000744 | 28.397 | 5.334 | n/a | 0.000 | 0.079 | 2.297 | 4.636 | 0.063 | n/a | 0.281 | 15.660 | n/a | n/a | 0.047 | 5.413 | 0.191 | 0.047 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.988 | 1.001 | 0.000 | 0.914 | 3.943 | n/a | 0.000 | 0.101 | 1.104 | 2.087 | 0.022 | n/a | 0.246 | 7.837 | n/a | n/a | 0.046 | 4.078 | 0.258 | 0.046 |
| p99 | 186.022 | 3.975 | 0.000 | 3.844 | 14.449 | n/a | 0.000 | 4.268 | 9.648 | 9.840 | 0.163 | n/a | 3.042 | 169.500 | n/a | n/a | 0.166 | 15.655 | 0.485 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b00000000000007aa | 281.117 | 4.254 | n/a | 0.000 | 0.078 | 0.917 | 1.986 | 0.014 | n/a | 0.109 | 273.708 | n/a | n/a | 0.051 | 4.332 | 0.015 | 0.051 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.175ms; driver.reader-basis.broadcast 0.104ms; driver.reader-basis.broadcast 0.101ms |
| 7ae69e970b053a8b00000000000007b0 | 186.022 | 10.046 | n/a | 0.000 | 0.250 | 1.391 | 4.297 | 0.053 | n/a | 0.410 | 169.500 | n/a | n/a | 0.073 | 10.296 | 0.055 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.887ms; driver.reader-basis.broadcast 0.426ms |
| 7ae69e970b053a8b00000000000007ab | 68.716 | 8.925 | n/a | 0.000 | 0.081 | 1.786 | 5.420 | 0.084 | n/a | 0.598 | 51.766 | n/a | n/a | 0.057 | 9.006 | 0.131 | 0.057 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.237ms; driver.publication.persist-deferred 0.053ms |
| 7ae69e970b053a8b00000000000007f6 | 49.365 | 5.618 | n/a | 0.000 | 3.884 | 1.915 | 27.175 | 0.039 | n/a | 0.135 | 10.552 | n/a | n/a | 0.047 | 9.502 | 0.192 | 0.047 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| 7ae69e970b053a8b000000000000073d | 48.181 | 15.176 | n/a | 0.000 | 0.122 | 2.865 | 9.840 | 0.078 | n/a | 1.153 | 18.884 | n/a | n/a | 0.064 | 15.297 | 0.317 | 0.064 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006ec | 47.457 | 14.449 | n/a | 0.000 | 1.206 | 1.735 | 7.689 | 0.069 | n/a | 0.353 | 21.903 | n/a | n/a | 0.052 | 15.655 | 0.330 | 0.052 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000762 | 46.816 | 13.066 | n/a | 0.000 | 0.647 | 9.648 | 8.498 | 0.071 | n/a | 0.488 | 14.287 | n/a | n/a | 0.110 | 13.713 | 0.293 | 0.110 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.192ms |
| 7ae69e970b053a8b000000000000074b | 42.031 | 14.187 | n/a | 0.000 | 3.142 | 7.498 | 5.454 | 0.032 | n/a | 0.130 | 11.463 | n/a | n/a | 0.126 | 17.329 | 0.412 | 0.126 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.185ms |
| 7ae69e970b053a8b00000000000006fc | 40.659 | 4.590 | n/a | 0.000 | 0.120 | 0.751 | 1.609 | 0.014 | n/a | 0.681 | 32.831 | n/a | n/a | 0.063 | 4.710 | 0.116 | 0.063 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000075f | 40.468 | 11.322 | n/a | 0.000 | 0.135 | 15.038 | 4.077 | 0.035 | n/a | 0.590 | 9.165 | n/a | n/a | 0.108 | 11.456 | 0.283 | 0.108 | node-14/thread-0/socket.body-read | none observed |
| 7ae69e970b053a8b00000000000006da | 38.120 | 13.269 | n/a | 0.000 | 0.156 | 2.354 | 4.783 | 0.054 | n/a | 0.365 | 17.041 | n/a | n/a | 0.098 | 13.425 | 0.352 | 0.098 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006f5 | 36.946 | 6.223 | n/a | 0.000 | 0.253 | 2.518 | 5.917 | 0.038 | n/a | 0.805 | 21.104 | n/a | n/a | 0.088 | 6.476 | 0.175 | 0.088 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000734 | 33.986 | 7.715 | n/a | 0.000 | 0.122 | 2.341 | 6.846 | 0.074 | n/a | 0.299 | 16.541 | n/a | n/a | 0.048 | 7.837 | 0.231 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000007f9 | 33.221 | 11.232 | n/a | 0.000 | 0.103 | 1.432 | 6.882 | 0.053 | n/a | 0.655 | 12.827 | n/a | n/a | 0.037 | 11.335 | 0.341 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000007fd | 32.610 | 8.418 | n/a | 0.000 | 4.268 | 1.873 | 3.593 | 0.268 | n/a | 1.071 | 13.074 | n/a | n/a | 0.045 | 12.687 | 0.389 | 0.045 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000007b2 | 29.211 | 7.960 | n/a | 0.000 | 0.210 | 1.898 | 6.251 | 0.041 | n/a | 0.928 | 11.844 | n/a | n/a | 0.079 | 8.171 | 0.280 | 0.079 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000802 | 29.020 | 13.758 | n/a | 0.000 | 0.128 | 1.002 | 1.631 | 0.013 | n/a | 0.098 | 12.339 | n/a | n/a | 0.051 | 13.886 | 0.479 | 0.051 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006e1 | 28.978 | 14.392 | n/a | 0.000 | 1.083 | 1.268 | 2.145 | 0.028 | n/a | 0.282 | 9.712 | n/a | n/a | 0.069 | 15.475 | 0.534 | 0.069 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000006cd | 28.469 | 4.702 | n/a | 0.000 | 0.136 | 1.666 | 6.245 | 0.041 | n/a | 0.223 | 15.425 | n/a | n/a | 0.031 | 4.838 | 0.170 | 0.031 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000744 | 28.397 | 5.334 | n/a | 0.000 | 0.079 | 2.297 | 4.636 | 0.063 | n/a | 0.281 | 15.660 | n/a | n/a | 0.047 | 5.413 | 0.191 | 0.047 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.523 | 1.002 | 0.000 | 0.967 | 3.897 | n/a | 0.000 | 0.112 | 0.996 | 2.088 | 0.024 | n/a | 0.261 | 8.195 | n/a | n/a | 0.052 | 4.154 | 0.254 | 0.052 |
| p99 | 75.700 | 7.466 | 0.000 | 7.471 | 21.227 | n/a | 3.278 | 6.585 | 3.294 | 5.969 | 0.125 | n/a | 2.556 | 23.537 | n/a | n/a | 0.396 | 21.358 | 0.551 | 0.396 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b0000000000000963 | 141.250 | 9.016 | n/a | 0.000 | 0.236 | 1.988 | 3.961 | 0.050 | n/a | 1.150 | 124.623 | n/a | n/a | 0.226 | 9.252 | 0.065 | 0.226 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.123ms; driver.reader-basis.broadcast 0.111ms |
| 7ae69e970b053a8b0000000000000892 | 75.700 | 21.786 | n/a | 0.000 | 21.721 | 3.294 | 5.969 | 0.074 | n/a | 0.728 | 21.951 | n/a | n/a | 0.178 | 43.506 | 0.575 | 0.178 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.282ms |
| 7ae69e970b053a8b00000000000009ab | 48.070 | 11.799 | n/a | 0.000 | 6.585 | 2.113 | 11.731 | 0.046 | n/a | 0.629 | 14.771 | n/a | n/a | 0.396 | 18.385 | 0.382 | 0.396 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.296ms |
| 7ae69e970b053a8b0000000000000966 | 47.236 | 12.948 | n/a | 0.000 | 0.152 | 1.185 | 5.645 | 0.125 | n/a | 3.521 | 23.537 | n/a | n/a | 0.123 | 13.100 | 0.277 | 0.123 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 7ae69e970b053a8b000000000000096f | 38.751 | 21.227 | n/a | 0.000 | 0.132 | 2.429 | 3.017 | 0.038 | n/a | 0.317 | 11.389 | n/a | n/a | 0.202 | 21.358 | 0.551 | 0.202 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000099f | 36.302 | 7.112 | n/a | 0.000 | 5.377 | 2.697 | 5.721 | 0.070 | n/a | 0.522 | 14.656 | n/a | n/a | 0.147 | 12.489 | 0.344 | 0.147 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.264ms |
| 7ae69e970b053a8b0000000000000996 | 33.342 | 4.013 | n/a | 0.000 | 0.189 | 2.227 | 3.717 | 0.059 | n/a | 0.649 | 22.433 | n/a | n/a | 0.054 | 4.202 | 0.126 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.231ms |
| 7ae69e970b053a8b000000000000097b | 32.725 | 9.569 | n/a | 0.000 | 0.163 | 2.539 | 4.144 | 0.039 | n/a | 0.605 | 15.573 | n/a | n/a | 0.093 | 9.732 | 0.297 | 0.093 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000972 | 32.395 | 7.144 | n/a | 0.000 | 0.132 | 1.647 | 2.856 | 0.056 | n/a | 0.380 | 20.056 | n/a | n/a | 0.123 | 7.276 | 0.225 | 0.123 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000960 | 30.627 | 10.527 | n/a | 0.000 | 0.128 | 2.485 | 4.997 | 0.066 | n/a | 0.572 | 11.788 | n/a | n/a | 0.064 | 10.655 | 0.348 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.398ms |
| 7ae69e970b053a8b0000000000000895 | 28.799 | 7.344 | n/a | 0.000 | 0.114 | 1.128 | 3.041 | 0.040 | n/a | 0.261 | 16.808 | n/a | n/a | 0.063 | 7.458 | 0.259 | 0.063 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000921 | 27.548 | 5.018 | n/a | 0.000 | 0.389 | 1.372 | 5.596 | 0.083 | n/a | 0.272 | 14.744 | n/a | n/a | 0.074 | 5.407 | 0.196 | 0.074 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000009ae | 27.536 | 7.542 | n/a | 0.000 | 0.263 | 2.468 | 5.003 | 0.023 | n/a | 0.229 | 11.861 | n/a | n/a | 0.147 | 7.806 | 0.283 | 0.147 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000936 | 26.804 | 6.791 | n/a | 0.000 | 0.167 | 1.531 | 4.958 | 0.101 | n/a | 0.453 | 12.739 | n/a | n/a | 0.064 | 6.958 | 0.260 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000008a0 | 25.677 | 4.092 | n/a | 0.000 | 0.093 | 1.226 | 1.940 | 0.023 | n/a | 0.955 | 17.302 | n/a | n/a | 0.046 | 4.185 | 0.163 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000993 | 25.564 | 7.822 | n/a | 4.687 | 0.103 | 1.283 | 2.577 | 0.033 | n/a | 0.307 | 8.685 | n/a | n/a | 0.067 | 12.612 | 0.493 | 0.067 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.310ms |
| 7ae69e970b053a8b000000000000088c | 25.549 | 5.916 | n/a | 0.000 | 0.139 | 1.715 | 4.093 | 0.049 | n/a | 0.957 | 12.599 | n/a | n/a | 0.082 | 6.055 | 0.237 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000083e | 24.881 | 7.558 | n/a | 0.000 | 0.126 | 1.025 | 4.075 | 0.043 | n/a | 0.283 | 11.727 | n/a | n/a | 0.044 | 7.684 | 0.309 | 0.044 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.200ms |
| 7ae69e970b053a8b000000000000097e | 24.110 | 8.466 | n/a | 0.000 | 0.136 | 1.932 | 2.725 | 0.042 | n/a | 0.370 | 10.387 | n/a | n/a | 0.053 | 8.602 | 0.357 | 0.053 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000987 | 23.758 | 5.002 | n/a | 0.000 | 0.150 | 1.315 | 5.360 | 0.035 | n/a | 1.028 | 10.766 | n/a | n/a | 0.102 | 5.152 | 0.217 | 0.102 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.523 | 1.002 | 0.000 | 0.967 | 3.897 | n/a | 0.000 | 0.112 | 0.996 | 2.088 | 0.024 | n/a | 0.261 | 8.195 | n/a | n/a | 0.052 | 4.154 | 0.254 | 0.052 |
| p99 | 75.700 | 7.466 | 0.000 | 7.471 | 21.227 | n/a | 3.278 | 6.585 | 3.294 | 5.969 | 0.125 | n/a | 2.556 | 23.537 | n/a | n/a | 0.396 | 21.358 | 0.551 | 0.396 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ae69e970b053a8b0000000000000963 | 141.250 | 9.016 | n/a | 0.000 | 0.236 | 1.988 | 3.961 | 0.050 | n/a | 1.150 | 124.623 | n/a | n/a | 0.226 | 9.252 | 0.065 | 0.226 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.123ms; driver.reader-basis.broadcast 0.111ms |
| 7ae69e970b053a8b0000000000000892 | 75.700 | 21.786 | n/a | 0.000 | 21.721 | 3.294 | 5.969 | 0.074 | n/a | 0.728 | 21.951 | n/a | n/a | 0.178 | 43.506 | 0.575 | 0.178 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.282ms |
| 7ae69e970b053a8b00000000000009ab | 48.070 | 11.799 | n/a | 0.000 | 6.585 | 2.113 | 11.731 | 0.046 | n/a | 0.629 | 14.771 | n/a | n/a | 0.396 | 18.385 | 0.382 | 0.396 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.296ms |
| 7ae69e970b053a8b0000000000000966 | 47.236 | 12.948 | n/a | 0.000 | 0.152 | 1.185 | 5.645 | 0.125 | n/a | 3.521 | 23.537 | n/a | n/a | 0.123 | 13.100 | 0.277 | 0.123 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| 7ae69e970b053a8b000000000000096f | 38.751 | 21.227 | n/a | 0.000 | 0.132 | 2.429 | 3.017 | 0.038 | n/a | 0.317 | 11.389 | n/a | n/a | 0.202 | 21.358 | 0.551 | 0.202 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000099f | 36.302 | 7.112 | n/a | 0.000 | 5.377 | 2.697 | 5.721 | 0.070 | n/a | 0.522 | 14.656 | n/a | n/a | 0.147 | 12.489 | 0.344 | 0.147 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.264ms |
| 7ae69e970b053a8b0000000000000996 | 33.342 | 4.013 | n/a | 0.000 | 0.189 | 2.227 | 3.717 | 0.059 | n/a | 0.649 | 22.433 | n/a | n/a | 0.054 | 4.202 | 0.126 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.231ms |
| 7ae69e970b053a8b000000000000097b | 32.725 | 9.569 | n/a | 0.000 | 0.163 | 2.539 | 4.144 | 0.039 | n/a | 0.605 | 15.573 | n/a | n/a | 0.093 | 9.732 | 0.297 | 0.093 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000972 | 32.395 | 7.144 | n/a | 0.000 | 0.132 | 1.647 | 2.856 | 0.056 | n/a | 0.380 | 20.056 | n/a | n/a | 0.123 | 7.276 | 0.225 | 0.123 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000960 | 30.627 | 10.527 | n/a | 0.000 | 0.128 | 2.485 | 4.997 | 0.066 | n/a | 0.572 | 11.788 | n/a | n/a | 0.064 | 10.655 | 0.348 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.398ms |
| 7ae69e970b053a8b0000000000000895 | 28.799 | 7.344 | n/a | 0.000 | 0.114 | 1.128 | 3.041 | 0.040 | n/a | 0.261 | 16.808 | n/a | n/a | 0.063 | 7.458 | 0.259 | 0.063 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000921 | 27.548 | 5.018 | n/a | 0.000 | 0.389 | 1.372 | 5.596 | 0.083 | n/a | 0.272 | 14.744 | n/a | n/a | 0.074 | 5.407 | 0.196 | 0.074 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000009ae | 27.536 | 7.542 | n/a | 0.000 | 0.263 | 2.468 | 5.003 | 0.023 | n/a | 0.229 | 11.861 | n/a | n/a | 0.147 | 7.806 | 0.283 | 0.147 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000936 | 26.804 | 6.791 | n/a | 0.000 | 0.167 | 1.531 | 4.958 | 0.101 | n/a | 0.453 | 12.739 | n/a | n/a | 0.064 | 6.958 | 0.260 | 0.064 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b00000000000008a0 | 25.677 | 4.092 | n/a | 0.000 | 0.093 | 1.226 | 1.940 | 0.023 | n/a | 0.955 | 17.302 | n/a | n/a | 0.046 | 4.185 | 0.163 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000993 | 25.564 | 7.822 | n/a | 4.687 | 0.103 | 1.283 | 2.577 | 0.033 | n/a | 0.307 | 8.685 | n/a | n/a | 0.067 | 12.612 | 0.493 | 0.067 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.310ms |
| 7ae69e970b053a8b000000000000088c | 25.549 | 5.916 | n/a | 0.000 | 0.139 | 1.715 | 4.093 | 0.049 | n/a | 0.957 | 12.599 | n/a | n/a | 0.082 | 6.055 | 0.237 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b000000000000083e | 24.881 | 7.558 | n/a | 0.000 | 0.126 | 1.025 | 4.075 | 0.043 | n/a | 0.283 | 11.727 | n/a | n/a | 0.044 | 7.684 | 0.309 | 0.044 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.200ms |
| 7ae69e970b053a8b000000000000097e | 24.110 | 8.466 | n/a | 0.000 | 0.136 | 1.932 | 2.725 | 0.042 | n/a | 0.370 | 10.387 | n/a | n/a | 0.053 | 8.602 | 0.357 | 0.053 | gw-w/thread-75/peer.transact-await (includes order/network/storage) | none observed |
| 7ae69e970b053a8b0000000000000987 | 23.758 | 5.002 | n/a | 0.000 | 0.150 | 1.315 | 5.360 | 0.035 | n/a | 1.028 | 10.766 | n/a | n/a | 0.102 | 5.152 | 0.217 | 0.102 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.558 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.210 | 201.183 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 |
| p99 | 575.209 | n/a | n/a | n/a | 48.113 | n/a | 0.000 | 0.000 | 21.568 | 557.542 | 0.216 | n/a | 0.143 | 0.000 | n/a | n/a | 0.554 | 48.113 | 0.349 | 0.554 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df2660000000000000002 | 575.209 | 10.510 | n/a | 0.000 | 0.000 | 6.245 | 557.542 | 0.216 | n/a | 0.143 | 0.000 | n/a | n/a | 0.554 | 10.510 | 0.018 | 0.554 | gw-r/thread-47/gateway.admitted-work | none observed |
| 4506074485361ef60000000000000516 | 203.667 | 0.000 | n/a | 0.000 | 0.000 | 1.067 | 202.283 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef60000000000000518 | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 1.274 | 201.166 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef60000000000000519 | 202.558 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.355 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef6000000000000051a | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 201.183 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef60000000000000517 | 202.495 | 0.000 | n/a | 0.000 | 0.000 | 1.210 | 201.077 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| 4506074485361ef6000000000000051d | 137.683 | 48.113 | n/a | 0.000 | 0.000 | 21.568 | 67.784 | 0.003 | n/a | 0.005 | 0.000 | n/a | n/a | 0.211 | 48.113 | 0.349 | 0.211 | gw-r/thread-43/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 258.281 | n/a | n/a | n/a | 0.302 | n/a | 0.000 | 0.000 | 2.167 | 184.656 | 0.013 | n/a | 3.276 | 0.000 | n/a | n/a | 1.885 | 0.302 | 0.000 | 1.885 |
| p99 | 1007.017 | n/a | n/a | n/a | 56.997 | n/a | 0.000 | 0.000 | 7.735 | 998.667 | 0.020 | n/a | 3.977 | 0.000 | n/a | n/a | 5.604 | 56.997 | 0.221 | 5.604 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df26600000000000000a4 | 1007.017 | 0.302 | n/a | 0.000 | 0.000 | 2.167 | 998.667 | 0.020 | n/a | 3.977 | 0.000 | n/a | n/a | 1.885 | 0.302 | 0.000 | 1.885 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df26600000000000000a5 | 258.281 | 56.997 | n/a | 0.000 | 0.000 | 7.735 | 184.656 | 0.013 | n/a | 3.276 | 0.000 | n/a | n/a | 5.604 | 56.997 | 0.221 | 5.604 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 131.243 | n/a | n/a | n/a | 72.756 | n/a | 0.000 | 0.000 | 5.517 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.146 | 85.296 | 0.674 | 23.146 |
| p99 | 345.999 | n/a | n/a | n/a | 234.966 | n/a | 28.027 | 0.000 | 29.010 | 124.576 | 20.812 | n/a | 0.116 | 0.000 | n/a | n/a | 84.729 | 234.966 | 0.957 | 84.729 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df26600000000000000ac | 345.999 | 214.120 | n/a | 0.000 | 0.000 | 6.446 | 124.576 | 0.011 | n/a | 0.023 | 0.000 | n/a | n/a | 0.824 | 214.120 | 0.619 | 0.824 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000000ec | 294.245 | 234.966 | n/a | 0.000 | 0.000 | 6.487 | 31.304 | 20.812 | n/a | 0.037 | 0.000 | n/a | n/a | 0.639 | 234.966 | 0.799 | 0.639 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000000ef | 285.009 | 212.896 | n/a | 0.000 | 0.000 | 7.700 | 63.713 | 0.240 | n/a | 0.022 | 0.000 | n/a | n/a | 0.438 | 212.896 | 0.747 | 0.438 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000016d | 245.341 | 132.139 | n/a | 28.027 | 0.000 | 0.446 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.729 | 160.166 | 0.653 | 84.729 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000000b5 | 215.933 | 144.318 | n/a | 0.000 | 0.000 | 8.100 | 57.049 | 0.051 | n/a | 0.116 | 0.000 | n/a | n/a | 6.300 | 144.318 | 0.668 | 6.300 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000100 | 206.728 | 131.422 | n/a | 0.000 | 0.000 | 5.517 | 63.850 | 0.010 | n/a | 0.023 | 0.000 | n/a | n/a | 5.906 | 131.422 | 0.636 | 5.906 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000160 | 191.949 | 91.416 | n/a | 16.735 | 0.000 | 1.626 | 71.430 | 0.019 | n/a | 0.074 | 0.000 | n/a | n/a | 10.649 | 108.151 | 0.563 | 10.649 | gw-r/thread-45/gateway.admitted-work | none observed |
| 81499b0b497df26600000000000000c2 | 187.606 | 137.503 | n/a | 0.000 | 0.000 | 10.528 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.575 | 137.503 | 0.733 | 39.575 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000120 | 183.914 | 154.681 | n/a | 0.000 | 0.000 | 26.165 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.068 | 154.681 | 0.841 | 3.068 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000166 | 180.883 | 121.918 | n/a | 0.000 | 0.000 | 1.465 | 50.606 | 0.061 | n/a | 0.017 | 0.000 | n/a | n/a | 6.817 | 121.918 | 0.674 | 6.817 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000000cc | 179.114 | 103.099 | n/a | 0.000 | 0.000 | 2.060 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.955 | 103.099 | 0.576 | 73.955 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000180 | 177.033 | 111.799 | n/a | 21.680 | 0.000 | 2.192 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.362 | 133.479 | 0.754 | 41.362 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000000d5 | 174.400 | 139.824 | n/a | 0.000 | 0.000 | 11.104 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.472 | 139.824 | 0.802 | 23.472 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000176 | 155.160 | 102.459 | n/a | 0.000 | 0.000 | 10.912 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.789 | 102.459 | 0.660 | 41.789 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000143 | 149.864 | 86.168 | n/a | 0.000 | 0.000 | 11.849 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.847 | 86.168 | 0.575 | 51.847 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000000dc | 149.146 | 101.094 | n/a | 0.000 | 0.000 | 4.370 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.681 | 101.094 | 0.678 | 43.681 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000195 | 147.325 | 127.832 | n/a | 13.098 | 0.000 | 2.728 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.668 | 140.930 | 0.957 | 3.668 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000018c | 141.932 | 46.770 | n/a | 26.385 | 0.000 | 5.135 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.643 | 73.155 | 0.515 | 63.643 | node-14/thread-2/socket.wait-first-byte | none observed |
| 81499b0b497df26600000000000000e5 | 134.987 | 80.940 | n/a | 0.000 | 0.000 | 13.598 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.449 | 80.940 | 0.600 | 40.449 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000018e | 134.542 | 67.334 | n/a | 8.496 | 0.000 | 0.353 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 58.360 | 75.830 | 0.564 | 58.360 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / idle-25 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 105.843 | n/a | n/a | n/a | 65.707 | n/a | 0.000 | 0.000 | 3.655 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.363 | 72.311 | 0.712 | 21.363 |
| p99 | 283.635 | n/a | n/a | n/a | 192.524 | n/a | 21.832 | 0.000 | 30.195 | 62.137 | 0.093 | n/a | 13.670 | 0.000 | n/a | n/a | 83.670 | 192.524 | 0.920 | 83.670 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df266000000000000020d | 283.635 | 192.524 | n/a | 0.000 | 0.000 | 7.441 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 83.670 | 192.524 | 0.679 | 83.670 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001df | 267.899 | 185.601 | n/a | 0.000 | 0.000 | 19.047 | 62.137 | 0.007 | n/a | 0.017 | 0.000 | n/a | n/a | 1.091 | 185.601 | 0.693 | 1.091 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001dd | 219.879 | 156.222 | n/a | 0.000 | 0.000 | 8.075 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 55.582 | 156.222 | 0.710 | 55.582 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001de | 213.353 | 165.018 | n/a | 0.000 | 0.000 | 4.837 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.498 | 165.018 | 0.773 | 43.498 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001dc | 200.534 | 174.174 | n/a | 0.000 | 0.000 | 25.639 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.721 | 174.174 | 0.869 | 0.721 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001ac | 175.400 | 143.134 | n/a | 9.191 | 0.000 | 21.942 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.134 | 152.324 | 0.868 | 1.134 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001f5 | 166.954 | 133.191 | n/a | 0.000 | 0.000 | 5.983 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.780 | 133.191 | 0.798 | 27.780 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000196 | 157.797 | 82.964 | n/a | 0.000 | 0.000 | 13.938 | 46.860 | 0.093 | n/a | 13.670 | 0.000 | n/a | n/a | 0.273 | 82.964 | 0.526 | 0.273 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001d8 | 150.073 | 118.132 | n/a | 0.000 | 0.000 | 0.656 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.285 | 118.132 | 0.787 | 31.285 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001a5 | 147.248 | 82.695 | n/a | 0.000 | 0.000 | 3.284 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.269 | 82.695 | 0.562 | 61.269 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001c3 | 147.084 | 112.316 | n/a | 0.000 | 0.000 | 0.383 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.385 | 112.316 | 0.764 | 34.385 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001a0 | 138.186 | 98.709 | n/a | 0.000 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.164 | 98.709 | 0.714 | 39.164 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000024a | 137.558 | 48.835 | n/a | 0.000 | 0.000 | 29.759 | 58.598 | 0.005 | n/a | 0.014 | 0.000 | n/a | n/a | 0.346 | 48.835 | 0.355 | 0.346 | gw-r/thread-46/gateway.admitted-work | none observed |
| 81499b0b497df2660000000000000216 | 136.450 | 104.518 | n/a | 0.000 | 0.000 | 9.216 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.716 | 104.518 | 0.766 | 22.716 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000252 | 132.542 | 114.407 | n/a | 0.000 | 0.000 | 3.655 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.480 | 114.407 | 0.863 | 14.480 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000220 | 126.138 | 89.867 | n/a | 0.000 | 0.000 | 0.306 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.964 | 89.867 | 0.712 | 35.964 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000024d | 120.911 | 61.667 | n/a | 0.000 | 0.000 | 1.450 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.793 | 61.667 | 0.510 | 57.793 | node-14/thread-2/socket.wait-first-byte | none observed |
| 81499b0b497df26600000000000001ce | 120.348 | 88.937 | n/a | 21.832 | 0.000 | 8.674 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.906 | 110.769 | 0.920 | 0.906 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000001cf | 110.366 | 65.707 | n/a | 0.000 | 0.000 | 0.327 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.332 | 65.707 | 0.595 | 44.332 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000022d | 105.843 | 62.344 | n/a | 21.785 | 0.000 | 0.282 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.431 | 84.129 | 0.795 | 21.431 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / idle-50 / internal (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.299 | n/a | n/a | n/a | 10.385 | n/a | 0.000 | 0.000 | 1.615 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.211 | 10.385 | 0.206 | 33.211 |
| p99 | 1002.990 | n/a | n/a | n/a | 302.302 | n/a | 5.970 | 0.000 | 32.829 | 1001.139 | 0.025 | n/a | 0.173 | 0.000 | n/a | n/a | 69.042 | 302.302 | 0.943 | 69.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df2660000000000000343 | 1002.990 | 0.133 | n/a | 0.000 | 0.000 | 0.475 | 1001.139 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 1.177 | 0.133 | 0.000 | 1.177 | gw-r/thread-48/journal/page | none observed |
| 81499b0b497df2660000000000000294 | 364.427 | 302.302 | n/a | 0.000 | 0.000 | 1.608 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 60.517 | 302.302 | 0.830 | 60.517 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000027c | 271.716 | 244.726 | n/a | 0.000 | 0.000 | 17.963 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.027 | 244.726 | 0.901 | 9.027 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000286 | 247.606 | 185.138 | n/a | 0.000 | 0.000 | 18.303 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.165 | 185.138 | 0.748 | 44.165 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000347 | 244.823 | 7.736 | n/a | 0.000 | 0.000 | 0.512 | 236.450 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.075 | 7.736 | 0.032 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df2660000000000000289 | 207.958 | 173.581 | n/a | 0.000 | 0.000 | 3.590 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.787 | 173.581 | 0.835 | 30.787 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000026f | 202.849 | 89.857 | n/a | 0.000 | 0.000 | 15.275 | 81.089 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 16.562 | 89.857 | 0.443 | 16.562 | gw-r/thread-46/gateway.admitted-work | none observed |
| 81499b0b497df266000000000000025a | 190.824 | 138.307 | n/a | 0.000 | 0.000 | 6.080 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.437 | 138.307 | 0.725 | 46.437 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000266 | 183.864 | 144.207 | n/a | 0.000 | 0.000 | 19.660 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.998 | 144.207 | 0.784 | 19.998 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000026a | 174.598 | 122.376 | n/a | 0.000 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.872 | 122.376 | 0.701 | 51.872 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000002ae | 162.343 | 141.131 | n/a | 0.000 | 0.000 | 9.561 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.651 | 141.131 | 0.869 | 11.651 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000028f | 160.881 | 125.201 | n/a | 0.000 | 0.000 | 10.414 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.266 | 125.201 | 0.778 | 25.266 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000002a4 | 153.465 | 114.887 | n/a | 0.000 | 0.000 | 8.203 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.376 | 114.887 | 0.749 | 30.376 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000002a0 | 147.116 | 94.718 | n/a | 0.000 | 0.000 | 10.129 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.269 | 94.718 | 0.644 | 42.269 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000262 | 145.034 | 114.856 | n/a | 0.000 | 0.000 | 0.591 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.587 | 114.856 | 0.792 | 29.587 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000002bf | 133.595 | 99.850 | n/a | 0.000 | 0.000 | 0.393 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.352 | 99.850 | 0.747 | 33.352 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000258 | 127.990 | 106.921 | n/a | 0.000 | 0.000 | 8.418 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.651 | 106.921 | 0.835 | 12.651 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df2660000000000000279 | 120.547 | 95.171 | n/a | 0.000 | 0.000 | 4.701 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.675 | 95.171 | 0.789 | 20.675 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df26600000000000002b6 | 119.574 | 85.870 | n/a | 0.000 | 0.000 | 32.829 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.875 | 85.870 | 0.718 | 0.875 | node-14/thread-2/replica.fetch-feed | none observed |
| 81499b0b497df266000000000000025e | 116.560 | 109.941 | n/a | 0.000 | 0.000 | 5.123 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.496 | 109.941 | 0.943 | 1.496 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.412 | n/a | n/a | n/a | 7.938 | n/a | 0.000 | 0.000 | 1.175 | 239.738 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.126 | 7.938 | 0.032 | 0.126 |
| p99 | 1000.489 | n/a | n/a | n/a | 32.334 | n/a | 0.000 | 0.000 | 17.480 | 987.792 | 0.057 | n/a | 0.982 | 0.000 | n/a | n/a | 6.284 | 32.334 | 0.269 | 6.284 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df2660000000000000470 | 1007.378 | 0.200 | n/a | 0.000 | 0.000 | 1.709 | 1004.221 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 1.118 | 0.200 | 0.000 | 1.118 | gw-r/thread-48/journal/page | none observed |
| 81499b0b497df2660000000000000473 | 1000.489 | 11.511 | n/a | 0.000 | 0.000 | 0.931 | 987.792 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.145 | 11.511 | 0.012 | 0.145 | gw-r/thread-65/journal/page | none observed |
| 81499b0b497df2660000000000000423 | 565.867 | 32.101 | n/a | 0.000 | 0.000 | 17.480 | 510.084 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 6.129 | 32.101 | 0.057 | 6.129 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df26600000000000003c2 | 384.074 | 103.263 | n/a | 0.000 | 0.000 | 0.394 | 277.156 | 0.020 | n/a | 0.105 | 0.000 | n/a | n/a | 3.135 | 103.263 | 0.269 | 3.135 | gw-r/thread-46/journal/page | none observed |
| 81499b0b497df2660000000000000427 | 330.787 | 10.946 | n/a | 0.000 | 0.000 | 1.471 | 317.893 | 0.019 | n/a | 0.195 | 0.000 | n/a | n/a | 0.263 | 10.946 | 0.033 | 0.263 | gw-r/thread-63/journal/page | none observed |
| 81499b0b497df26600000000000003e0 | 327.965 | 32.334 | n/a | 0.000 | 0.000 | 15.849 | 279.559 | 0.019 | n/a | 0.075 | 0.000 | n/a | n/a | 0.129 | 32.334 | 0.099 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 81499b0b497df2660000000000000464 | 297.309 | 15.323 | n/a | 0.000 | 0.000 | 2.255 | 279.467 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.177 | 15.323 | 0.052 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 81499b0b497df266000000000000037a | 292.755 | 13.052 | n/a | 0.000 | 0.000 | 4.782 | 271.353 | 0.037 | n/a | 0.112 | 0.000 | n/a | n/a | 3.419 | 13.052 | 0.045 | 3.419 | gw-r/thread-48/journal/page | none observed |
| 81499b0b497df26600000000000003ce | 283.888 | 19.089 | n/a | 0.000 | 0.000 | 0.999 | 263.504 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.194 | 19.089 | 0.067 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 81499b0b497df2660000000000000382 | 276.708 | 9.529 | n/a | 0.000 | 0.000 | 1.930 | 264.733 | 0.010 | n/a | 0.229 | 0.000 | n/a | n/a | 0.277 | 9.529 | 0.034 | 0.277 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df266000000000000045c | 273.115 | 22.634 | n/a | 0.000 | 0.000 | 0.630 | 249.585 | 0.021 | n/a | 0.081 | 0.000 | n/a | n/a | 0.164 | 22.634 | 0.083 | 0.164 | gw-r/thread-63/journal/page | none observed |
| 81499b0b497df266000000000000046b | 272.706 | 8.868 | n/a | 0.000 | 0.000 | 1.491 | 262.120 | 0.057 | n/a | 0.075 | 0.000 | n/a | n/a | 0.095 | 8.868 | 0.033 | 0.095 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df266000000000000034c | 270.612 | 10.295 | n/a | 0.000 | 0.000 | 1.561 | 258.553 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.119 | 10.295 | 0.038 | 0.119 | gw-r/thread-65/journal/page | none observed |
| 81499b0b497df266000000000000046e | 270.281 | 10.371 | n/a | 0.000 | 0.000 | 0.627 | 257.341 | 0.016 | n/a | 0.054 | 0.000 | n/a | n/a | 1.872 | 10.371 | 0.038 | 1.872 | gw-r/thread-45/journal/page | none observed |
| 81499b0b497df26600000000000003ca | 268.791 | 19.641 | n/a | 0.000 | 0.000 | 4.930 | 241.262 | 0.058 | n/a | 0.182 | 0.000 | n/a | n/a | 2.717 | 19.641 | 0.073 | 2.717 | gw-r/thread-45/journal/page | none observed |
| 81499b0b497df2660000000000000352 | 268.671 | 9.506 | n/a | 0.000 | 0.000 | 1.185 | 257.486 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.406 | 9.506 | 0.035 | 0.406 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df266000000000000043a | 267.318 | 11.255 | n/a | 0.000 | 0.000 | 0.827 | 255.084 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.115 | 11.255 | 0.042 | 0.115 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df26600000000000003ba | 265.857 | 15.039 | n/a | 0.000 | 0.000 | 1.583 | 249.032 | 0.015 | n/a | 0.069 | 0.000 | n/a | n/a | 0.118 | 15.039 | 0.057 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 81499b0b497df2660000000000000370 | 265.848 | 23.907 | n/a | 0.000 | 0.000 | 3.735 | 237.944 | 0.024 | n/a | 0.082 | 0.000 | n/a | n/a | 0.157 | 23.907 | 0.090 | 0.157 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df266000000000000035e | 265.545 | 11.397 | n/a | 0.000 | 0.000 | 0.972 | 251.986 | 0.010 | n/a | 0.989 | 0.000 | n/a | n/a | 0.191 | 11.397 | 0.043 | 0.191 | gw-r/thread-44/journal/page | none observed |

## P3 / idle-1000 / internal (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.350 | n/a | n/a | n/a | 8.845 | n/a | 0.000 | 0.000 | 1.133 | 988.475 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.176 | 9.540 | 0.010 | 0.176 |
| p99 | 1074.869 | n/a | n/a | n/a | 117.144 | n/a | 12.287 | 0.000 | 12.834 | 1014.177 | 0.043 | n/a | 0.422 | 0.000 | n/a | n/a | 19.482 | 117.144 | 0.808 | 19.482 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 81499b0b497df2660000000000000567 | 1140.537 | 117.144 | n/a | 0.000 | 0.000 | 7.668 | 1014.177 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 1.452 | 117.144 | 0.103 | 1.452 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df266000000000000055f | 1074.869 | 13.565 | n/a | 0.000 | 0.000 | 3.400 | 1047.246 | 0.055 | n/a | 5.624 | 0.000 | n/a | n/a | 4.978 | 13.565 | 0.013 | 4.978 | gw-r/thread-45/journal/page | none observed |
| 81499b0b497df2660000000000000532 | 1067.445 | 21.775 | n/a | 12.287 | 0.000 | 1.643 | 1012.105 | 0.043 | n/a | 0.109 | 0.000 | n/a | n/a | 19.482 | 34.063 | 0.032 | 19.482 | gw-r/thread-45/journal/page | none observed |
| 81499b0b497df26600000000000004d1 | 1065.540 | 0.221 | n/a | 0.000 | 0.000 | 46.763 | 1001.525 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 16.948 | 0.221 | 0.000 | 16.948 | gw-r/thread-47/journal/page | none observed |
| 81499b0b497df2660000000000000538 | 1028.826 | 24.735 | n/a | 0.000 | 0.000 | 0.539 | 1003.211 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.289 | 24.735 | 0.024 | 0.289 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df266000000000000055a | 1027.571 | 28.111 | n/a | 0.000 | 0.000 | 0.700 | 997.907 | 0.019 | n/a | 0.068 | 0.000 | n/a | n/a | 0.766 | 28.111 | 0.027 | 0.766 | gw-r/thread-43/journal/page | none observed |
| 81499b0b497df266000000000000054e | 1022.804 | 16.313 | n/a | 8.900 | 0.000 | 0.927 | 996.250 | 0.018 | n/a | 0.087 | 0.000 | n/a | n/a | 0.310 | 25.213 | 0.025 | 0.310 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df2660000000000000540 | 1022.429 | 21.581 | n/a | 0.000 | 0.000 | 2.533 | 997.962 | 0.027 | n/a | 0.073 | 0.000 | n/a | n/a | 0.253 | 21.581 | 0.021 | 0.253 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df2660000000000000587 | 1021.658 | 20.611 | n/a | 0.000 | 0.000 | 3.122 | 997.518 | 0.040 | n/a | 0.075 | 0.000 | n/a | n/a | 0.292 | 20.611 | 0.020 | 0.292 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df26600000000000004e8 | 1019.610 | 19.077 | n/a | 7.654 | 0.000 | 0.784 | 991.620 | 0.016 | n/a | 0.091 | 0.000 | n/a | n/a | 0.369 | 26.730 | 0.026 | 0.369 | gw-r/thread-41/journal/page | none observed |
| 81499b0b497df26600000000000004e3 | 1017.423 | 32.065 | n/a | 1.008 | 0.000 | 0.557 | 983.457 | 0.023 | n/a | 0.174 | 0.000 | n/a | n/a | 0.138 | 33.074 | 0.033 | 0.138 | gw-r/thread-45/journal/page | none observed |
| 81499b0b497df2660000000000000496 | 1015.180 | 10.209 | n/a | 0.000 | 0.000 | 0.457 | 1004.179 | 0.027 | n/a | 0.143 | 0.000 | n/a | n/a | 0.165 | 10.209 | 0.010 | 0.165 | gw-r/thread-46/journal/page | none observed |
| 81499b0b497df26600000000000004f1 | 1014.831 | 12.680 | n/a | 4.351 | 0.000 | 0.532 | 997.063 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.125 | 17.031 | 0.017 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 81499b0b497df266000000000000056f | 1014.263 | 25.355 | n/a | 0.000 | 0.000 | 2.656 | 985.935 | 0.019 | n/a | 0.070 | 0.000 | n/a | n/a | 0.229 | 25.355 | 0.025 | 0.229 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df2660000000000000581 | 1014.053 | 21.443 | n/a | 0.000 | 0.000 | 1.474 | 990.695 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.362 | 21.443 | 0.021 | 0.362 | gw-r/thread-63/journal/page | none observed |
| 81499b0b497df2660000000000000502 | 1013.606 | 19.913 | n/a | 0.000 | 0.000 | 0.692 | 992.723 | 0.015 | n/a | 0.065 | 0.000 | n/a | n/a | 0.198 | 19.913 | 0.020 | 0.198 | gw-r/thread-44/journal/page | none observed |
| 81499b0b497df266000000000000057f | 1011.405 | 14.900 | n/a | 0.000 | 0.000 | 0.775 | 995.338 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.295 | 14.900 | 0.015 | 0.295 | gw-r/thread-43/journal/page | none observed |
| 81499b0b497df26600000000000004a4 | 1010.754 | 15.383 | n/a | 0.000 | 0.000 | 0.742 | 994.424 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.118 | 15.383 | 0.015 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 81499b0b497df2660000000000000596 | 1009.841 | 9.630 | n/a | 0.000 | 0.000 | 1.580 | 998.407 | 0.020 | n/a | 0.061 | 0.000 | n/a | n/a | 0.144 | 9.630 | 0.010 | 0.144 | gw-r/thread-63/journal/page | none observed |
| 81499b0b497df26600000000000004dc | 1009.504 | 6.703 | n/a | 2.781 | 0.000 | 1.530 | 998.205 | 0.017 | n/a | 0.153 | 0.000 | n/a | n/a | 0.115 | 9.484 | 0.009 | 0.115 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.826 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.383 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 |
| p99 | 241.125 | n/a | n/a | n/a | 12.301 | n/a | 0.000 | 0.000 | 23.218 | 231.699 | 0.206 | n/a | 0.202 | 0.000 | n/a | n/a | 73.212 | 12.301 | 0.190 | 73.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4506074485361ef60000000000000030 | 241.125 | 0.000 | n/a | 0.000 | 0.000 | 23.218 | 217.633 | 0.013 | n/a | 0.136 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef60000000000000031 | 237.532 | 0.000 | n/a | 0.000 | 0.000 | 5.221 | 231.699 | 0.206 | n/a | 0.202 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef6000000000000002f | 214.187 | 0.000 | n/a | 0.000 | 0.000 | 9.872 | 204.028 | 0.025 | n/a | 0.089 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef6000000000000002e | 213.043 | 0.000 | n/a | 0.000 | 0.000 | 1.416 | 211.208 | 0.029 | n/a | 0.193 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-43/journal/page | none observed |
| 4506074485361ef60000000000000008 | 79.826 | 5.233 | n/a | 0.000 | 0.000 | 1.425 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.168 | 5.233 | 0.066 | 73.168 | node-14/thread-5/socket.wait-first-byte | none observed |
| 4506074485361ef60000000000000025 | 73.642 | 0.000 | n/a | 0.000 | 0.000 | 0.430 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 73.212 | 0.000 | 0.000 | 73.212 | node-14/thread-5/socket.wait-first-byte | none observed |
| 4506074485361ef60000000000000007 | 64.806 | 12.301 | n/a | 0.000 | 0.000 | 3.383 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.121 | 12.301 | 0.190 | 49.121 | node-14/thread-5/socket.wait-first-byte | none observed |
| 4506074485361ef60000000000000027 | 52.550 | 0.000 | n/a | 0.000 | 0.000 | 3.737 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.813 | 0.000 | 0.000 | 48.813 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / idle-25 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 213.874 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.883 | 203.341 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 |
| p99 | 241.621 | n/a | n/a | n/a | 2.002 | n/a | 0.000 | 0.000 | 36.976 | 206.832 | 13.003 | n/a | 0.106 | 0.000 | n/a | n/a | 48.977 | 2.002 | 0.037 | 48.977 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4506074485361ef60000000000000061 | 241.621 | 0.000 | n/a | 0.000 | 0.000 | 36.976 | 204.412 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-43/journal/page | none observed |
| 4506074485361ef60000000000000060 | 235.921 | 0.000 | n/a | 0.000 | 0.000 | 18.449 | 204.072 | 13.003 | n/a | 0.106 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef60000000000000063 | 215.419 | 0.000 | n/a | 0.000 | 0.000 | 11.805 | 203.341 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-43/journal/page | none observed |
| 4506074485361ef60000000000000062 | 213.874 | 0.000 | n/a | 0.000 | 0.000 | 6.883 | 206.832 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef60000000000000053 | 135.772 | 0.000 | n/a | 0.000 | 0.000 | 2.337 | 132.949 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.392 | 0.000 | 0.000 | 0.392 | gw-r/thread-65/journal/page | none observed |
| 4506074485361ef60000000000000035 | 54.331 | 2.002 | n/a | 0.000 | 0.000 | 3.352 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.977 | 2.002 | 0.037 | 48.977 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / idle-50 / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.865 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.692 | 54.518 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 |
| p99 | 204.848 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 46.529 | 202.880 | 72.364 | n/a | 2.571 | 0.000 | n/a | n/a | 46.369 | 0.000 | 0.000 | 46.369 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4506074485361ef600000000000000f9 | 204.848 | 0.000 | n/a | 0.000 | 0.000 | 1.692 | 202.880 | 0.006 | n/a | 0.102 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef600000000000000f7 | 204.444 | 0.000 | n/a | 0.000 | 0.000 | 3.016 | 201.191 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef600000000000000f8 | 202.758 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.329 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.381 | 0.000 | 0.000 | 0.381 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef600000000000000fb | 202.579 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 201.509 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-65/journal/page | none observed |
| 4506074485361ef600000000000000f6 | 202.145 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 200.966 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 4506074485361ef600000000000000fa | 137.727 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 136.381 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef6000000000000007b | 86.181 | 0.000 | n/a | 0.000 | 0.000 | 12.950 | 0.695 | 72.364 | n/a | 0.013 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-48/gateway.admission-wait | none observed |
| 4506074485361ef60000000000000083 | 81.934 | 0.000 | n/a | 0.000 | 0.000 | 1.237 | 77.938 | 0.055 | n/a | 2.571 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef60000000000000095 | 69.865 | 0.000 | n/a | 0.000 | 0.000 | 6.896 | 31.542 | 29.569 | n/a | 1.536 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 | gw-r/thread-65/gateway.admission-wait | none observed |
| 4506074485361ef600000000000000c1 | 61.459 | 0.000 | n/a | 0.000 | 0.000 | 2.549 | 58.592 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-44/journal/page | none observed |
| 4506074485361ef60000000000000098 | 57.249 | 0.000 | n/a | 0.000 | 0.000 | 46.529 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.720 | 0.000 | 0.000 | 10.720 | node-14/thread-5/socket.queue-and-write | none observed |
| 4506074485361ef600000000000000ef | 57.125 | 0.000 | n/a | 0.000 | 0.000 | 1.216 | 54.518 | 0.030 | n/a | 1.179 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef60000000000000080 | 55.484 | 0.000 | n/a | 0.000 | 0.000 | 4.090 | 39.200 | 11.849 | n/a | 0.052 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef600000000000000ea | 52.071 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 49.472 | 1.074 | n/a | 0.238 | 0.000 | n/a | n/a | 0.757 | 0.000 | 0.000 | 0.757 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef60000000000000075 | 51.546 | 0.000 | n/a | 0.000 | 0.000 | 5.177 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.369 | 0.000 | 0.000 | 46.369 | node-14/thread-5/socket.wait-first-byte | none observed |
| 4506074485361ef6000000000000008a | 50.870 | 0.000 | n/a | 0.000 | 0.000 | 9.762 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.107 | 0.000 | 0.000 | 41.107 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / idle-250 / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.496 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.186 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 |
| p99 | 207.871 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.071 | 204.773 | 0.314 | n/a | 2.490 | 0.000 | n/a | n/a | 1.790 | 0.000 | 0.000 | 1.790 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4506074485361ef60000000000000137 | 210.063 | 1.154 | n/a | 0.000 | 0.000 | 2.284 | 206.215 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.306 | 1.154 | 0.005 | 0.306 | gw-r/thread-65/journal/page | none observed |
| 4506074485361ef60000000000000167 | 207.871 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 203.564 | 0.033 | n/a | 2.892 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef60000000000000143 | 206.623 | 0.000 | n/a | 0.000 | 0.000 | 1.518 | 204.773 | 0.018 | n/a | 0.094 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef6000000000000011f | 206.550 | 0.000 | n/a | 0.000 | 0.000 | 2.920 | 203.211 | 0.026 | n/a | 0.210 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef6000000000000011d | 206.100 | 0.000 | n/a | 0.000 | 0.000 | 2.027 | 203.710 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef600000000000001d8 | 205.654 | 0.000 | n/a | 0.000 | 0.000 | 2.468 | 200.198 | 0.029 | n/a | 2.490 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | gw-r/thread-65/journal/page | none observed |
| 4506074485361ef600000000000001b0 | 205.544 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 202.536 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 2.040 | 0.000 | 0.000 | 2.040 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef60000000000000217 | 205.362 | 0.000 | n/a | 0.000 | 0.000 | 1.721 | 203.297 | 0.046 | n/a | 0.108 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef60000000000000125 | 205.252 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 203.948 | 0.029 | n/a | 0.241 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef60000000000000196 | 205.222 | 0.000 | n/a | 0.000 | 0.000 | 3.611 | 201.350 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef6000000000000013d | 205.109 | 0.000 | n/a | 0.000 | 0.000 | 2.541 | 202.200 | 0.021 | n/a | 0.128 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef60000000000000180 | 205.090 | 0.000 | n/a | 0.000 | 0.000 | 1.790 | 202.823 | 0.025 | n/a | 0.196 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef600000000000001a0 | 204.958 | 0.000 | n/a | 0.000 | 0.000 | 1.359 | 203.151 | 0.052 | n/a | 0.131 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-65/journal/page | none observed |
| 4506074485361ef6000000000000015d | 204.794 | 0.000 | n/a | 0.000 | 0.000 | 1.185 | 203.362 | 0.005 | n/a | 0.092 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef60000000000000187 | 204.764 | 0.000 | n/a | 0.000 | 0.000 | 2.064 | 202.105 | 0.024 | n/a | 0.091 | 0.000 | n/a | n/a | 0.480 | 0.000 | 0.000 | 0.480 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef60000000000000191 | 204.498 | 0.000 | n/a | 0.000 | 0.000 | 3.071 | 201.141 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef600000000000001ba | 204.453 | 0.000 | n/a | 0.000 | 0.000 | 3.017 | 201.206 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef60000000000000184 | 204.304 | 0.000 | n/a | 0.000 | 0.000 | 2.047 | 201.979 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef60000000000000221 | 204.159 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 203.035 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-43/journal/page | none observed |
| 4506074485361ef60000000000000117 | 204.095 | 0.000 | n/a | 0.000 | 0.000 | 1.605 | 202.118 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-63/journal/page | none observed |

## P3 / idle-1000 / read (747 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.381 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.071 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 |
| p99 | 212.786 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.647 | 206.420 | 1.680 | n/a | 0.632 | 0.000 | n/a | n/a | 0.730 | 0.000 | 0.000 | 0.730 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4506074485361ef6000000000000030f | 420.304 | 0.000 | n/a | 0.000 | 0.000 | 92.706 | 327.077 | 0.045 | n/a | 0.165 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef6000000000000030e | 280.469 | 0.000 | n/a | 0.000 | 0.000 | 53.277 | 226.624 | 0.026 | n/a | 0.229 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef6000000000000046e | 225.295 | 0.000 | n/a | 0.000 | 0.000 | 1.474 | 223.287 | 0.120 | n/a | 0.174 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef60000000000000400 | 224.120 | 0.000 | n/a | 0.000 | 0.000 | 12.246 | 211.357 | 0.052 | n/a | 0.241 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef600000000000002a4 | 220.086 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 218.941 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef6000000000000046b | 216.573 | 0.000 | n/a | 0.000 | 0.000 | 2.657 | 213.169 | 0.030 | n/a | 0.538 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef6000000000000027d | 213.459 | 0.000 | n/a | 0.000 | 0.000 | 3.642 | 206.354 | 0.083 | n/a | 0.224 | 0.000 | n/a | n/a | 3.158 | 0.000 | 0.000 | 3.158 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef6000000000000046c | 212.786 | 0.000 | n/a | 0.000 | 0.000 | 5.903 | 206.367 | 0.021 | n/a | 0.107 | 0.000 | n/a | n/a | 0.387 | 0.000 | 0.000 | 0.387 | gw-r/thread-44/journal/page | none observed |
| 4506074485361ef60000000000000313 | 210.361 | 0.000 | n/a | 0.000 | 0.000 | 6.551 | 202.728 | 0.354 | n/a | 0.167 | 0.000 | n/a | n/a | 0.562 | 0.000 | 0.000 | 0.562 | gw-r/thread-44/journal/page | none observed |
| 4506074485361ef60000000000000312 | 209.895 | 0.000 | n/a | 0.000 | 0.000 | 2.606 | 206.697 | 0.024 | n/a | 0.093 | 0.000 | n/a | n/a | 0.475 | 0.000 | 0.000 | 0.475 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef6000000000000027f | 209.856 | 0.000 | n/a | 0.000 | 0.000 | 6.647 | 202.676 | 0.220 | n/a | 0.101 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef60000000000000481 | 209.777 | 0.000 | n/a | 0.000 | 0.000 | 4.284 | 204.906 | 0.015 | n/a | 0.148 | 0.000 | n/a | n/a | 0.423 | 0.000 | 0.000 | 0.423 | gw-r/thread-63/journal/page | none observed |
| 4506074485361ef600000000000004c7 | 208.821 | 0.000 | n/a | 0.000 | 0.000 | 1.659 | 206.420 | 0.006 | n/a | 0.071 | 0.000 | n/a | n/a | 0.665 | 0.000 | 0.000 | 0.665 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef6000000000000027e | 208.137 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 206.234 | 0.063 | n/a | 0.180 | 0.000 | n/a | n/a | 0.592 | 0.000 | 0.000 | 0.592 | gw-r/thread-47/journal/page | none observed |
| 4506074485361ef600000000000003fe | 207.991 | 0.000 | n/a | 0.000 | 0.000 | 3.580 | 204.082 | 0.047 | n/a | 0.152 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-41/journal/page | none observed |
| 4506074485361ef6000000000000047f | 207.867 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 204.502 | 0.206 | n/a | 2.342 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-44/journal/page | none observed |
| 4506074485361ef600000000000004f5 | 207.486 | 0.000 | n/a | 0.000 | 0.000 | 3.189 | 203.896 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-45/journal/page | none observed |
| 4506074485361ef600000000000002b3 | 207.217 | 0.000 | n/a | 0.000 | 0.000 | 1.724 | 203.937 | 0.012 | n/a | 0.238 | 0.000 | n/a | n/a | 1.307 | 0.000 | 0.000 | 1.307 | gw-r/thread-46/journal/page | none observed |
| 4506074485361ef600000000000003fb | 207.010 | 0.000 | n/a | 0.000 | 0.000 | 4.212 | 202.402 | 0.024 | n/a | 0.208 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| 4506074485361ef6000000000000025b | 206.769 | 0.000 | n/a | 0.000 | 0.000 | 5.085 | 201.410 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-41/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 800 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.005/271.916 ms; post-ACK p50/p99: 0.607/4.513 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 17.641 | 18.458 | 17.371 | reported |
| All-primary p99 ms | 589.998 | 590.366 | 294.294 | <=50 |
| L256 5-10 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 5-10 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 11-25 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 11-25 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 26-50 p50Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| L256 26-50 p99Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| Burst 5-10 p50 ms | unavailable | unavailable | unavailable | <=10 |
| Burst 11-25 p50 ms | unavailable | unavailable | unavailable | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | unavailable | unavailable | unavailable | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | unavailable | unavailable | unavailable | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5-10 | >=1000 | 6 | 14.667/106.816 | 14.312 | 9.829 | 23.017 | 0.082/0.035 |
| 5-10 | overlap | 114 | 43.772/586.564 | 42.859 | 21.207 | 51.388 | 0.092/0.031 |
| 5-10 | 0-50 | 383 | 17.729/67.623 | 17.151 | 9.487 | 24.799 | 0.083/0.030 |
| 5-10 | 50-100 | 2 | 28.182/29.001 | 27.077 | 12.778 | 40.795 | 0.110/0.024 |
| 5-10 | 100-250 | 147 | 15.710/185.771 | 15.074 | 8.172 | 21.231 | 0.120/0.032 |
| 5-10 | 250-1000 | 148 | 15.989/47.084 | 15.176 | 8.561 | 22.016 | 0.135/0.035 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 800 | 64 | 17633.023 |

## Writer heap, GC and scheduler stalls

Source 8d4e3e21eac91cdd7a2777673a3a8a06e2b8e66a; 800 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 332.500 / 1060.852 |
| GC events / total duration / maximum ms | 184 / 1809.258 / 367.564 |
| GC events >50 ms / total duration ms | 3 / 570.756 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":178,"4":3,"8":3} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 24 / 5233.969 |
| Union stall episodes / duration ms | 2 / 710.696 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 590.366 / 69 / 17989.839 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.
