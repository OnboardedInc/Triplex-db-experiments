# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (93.735 ms, trace `527010f61e35473800000000000000f4`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (123.756 ms, trace `527010f61e354738000000000000013f`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (93.678 ms, trace `527010f61e35473800000000000001c3`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (80.369 ms, trace `527010f61e3547380000000000000108`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (13.898 ms, trace `527010f61e35473800000000000001b4`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p12-six-loaded-c-1-eight-zero`; source `fa53d2dacfa3ed2dd6f7b5c8979f755edf831a2b`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 72/72 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 1109804.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 166 source calibrations, offsets preserved in raw traces and trace-summary.json. 0 JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-0.jsonl.gz: unexpected end of file; node-14-1.jsonl.gz: unexpected end of file; node-14-2.jsonl.gz: unexpected end of file; node-14-3.jsonl.gz: unexpected end of file; node-14-5.jsonl.gz: unexpected end of file; system-linux.jsonl.gz: unexpected end of file; Writer file absent: cannot establish complete commit denominator; No final Node histograms: recorder drain not proven. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13371.290 | 322.290 | 15.901 | 282 |
| baseline | 0 | 41774.427 | 831.187 | 23.579 | 924 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 527010f61e35473800000000000000f4 | driver.queue.scheduler-dispatch | 0.910 | none | 0 / 32 |
| 527010f61e35473800000000000000f4 | driver.queue.scheduler-late | 0.328 | none | 0 / 32 |

Observed active steps while trace 527010f61e35473800000000000000f4 waited: []

| 527010f61e354738000000000000013f | driver.queue.scheduler-dispatch | 0.083 | none | 0 / 32 |
| 527010f61e354738000000000000013f | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 527010f61e354738000000000000013f waited: []

| 527010f61e35473800000000000001c3 | driver.queue.scheduler-dispatch | 0.084 | none | 0 / 32 |
| 527010f61e35473800000000000001c3 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 527010f61e35473800000000000001c3 waited: []

| 527010f61e3547380000000000000108 | driver.queue.scheduler-dispatch | 0.085 | none | 0 / 32 |
| 527010f61e3547380000000000000108 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 527010f61e3547380000000000000108 waited: []

| 527010f61e35473800000000000001b4 | driver.queue.scheduler-dispatch | 0.080 | none | 0 / 32 |
| 527010f61e35473800000000000001b4 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 527010f61e35473800000000000001b4 waited: []

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.897 | 1.001 | 0.000 | 1.119 | 5.198 | n/a | 0.000 | 0.135 | 0.964 | 4.660 | 0.020 | n/a | 0.628 | 15.873 | n/a | n/a | 0.049 | 5.274 | 0.176 | 0.049 |
| p99 | 183.436 | 7.959 | 0.000 | 8.684 | 40.245 | n/a | 2.529 | 1.239 | 1.899 | 37.476 | 0.062 | n/a | 6.395 | 93.735 | n/a | n/a | 0.424 | 43.520 | 0.288 | 0.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 527010f61e35473800000000000000f4 | 183.436 | 40.245 | n/a | 2.036 | 1.239 | 1.824 | 37.476 | 0.062 | n/a | 6.395 | 93.735 | n/a | n/a | 0.424 | 43.520 | 0.237 | 0.424 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms; driver.reader-basis.broadcast 0.018ms |
| 527010f61e3547380000000000000108 | 97.768 | 6.413 | n/a | 0.000 | 0.087 | 1.290 | 7.030 | 0.015 | n/a | 2.532 | 80.369 | n/a | n/a | 0.032 | 6.500 | 0.066 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 527010f61e3547380000000000000112 | 61.131 | 9.727 | n/a | 2.529 | 0.278 | 0.742 | 4.660 | 0.014 | n/a | 0.463 | 42.630 | n/a | n/a | 0.086 | 12.535 | 0.205 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000101 | 53.950 | 7.164 | n/a | 1.449 | 0.135 | 1.003 | 7.078 | 0.031 | n/a | 4.202 | 32.834 | n/a | n/a | 0.055 | 8.747 | 0.162 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 527010f61e35473800000000000000fb | 45.391 | 3.863 | n/a | 0.000 | 0.091 | 0.752 | 1.504 | 0.017 | n/a | 2.132 | 36.985 | n/a | n/a | 0.046 | 3.954 | 0.087 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000010e | 41.132 | 6.675 | n/a | 0.000 | 0.193 | 0.907 | 4.369 | 0.023 | n/a | 0.745 | 28.157 | n/a | n/a | 0.062 | 6.868 | 0.167 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000117 | 36.563 | 5.324 | n/a | 0.000 | 0.154 | 1.899 | 5.199 | 0.021 | n/a | 0.482 | 23.423 | n/a | n/a | 0.062 | 5.478 | 0.150 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000011b | 25.897 | 4.353 | n/a | 0.000 | 0.204 | 1.124 | 5.529 | 0.049 | n/a | 0.628 | 13.950 | n/a | n/a | 0.060 | 4.557 | 0.176 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000114 | 23.457 | 5.198 | n/a | 0.000 | 0.075 | 0.964 | 1.196 | 0.014 | n/a | 0.106 | 15.873 | n/a | n/a | 0.030 | 5.274 | 0.225 | 0.030 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 527010f61e35473800000000000000f8 | 23.448 | 4.115 | n/a | 0.000 | 0.098 | 0.867 | 5.259 | 0.022 | n/a | 0.433 | 12.605 | n/a | n/a | 0.049 | 4.212 | 0.180 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 527010f61e354738000000000000010c | 22.147 | 3.058 | n/a | 0.000 | 0.125 | 1.178 | 2.476 | 0.037 | n/a | 2.623 | 12.598 | n/a | n/a | 0.053 | 3.183 | 0.144 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000011d | 19.939 | 3.028 | n/a | 0.000 | 1.228 | 0.753 | 4.234 | 0.013 | n/a | 0.061 | 10.604 | n/a | n/a | 0.018 | 4.255 | 0.213 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000105 | 19.554 | 5.547 | n/a | 0.000 | 0.081 | 1.379 | 5.982 | 0.020 | n/a | 0.093 | 6.423 | n/a | n/a | 0.029 | 5.628 | 0.288 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000000fe | 18.099 | 2.288 | n/a | 0.000 | 1.076 | 0.596 | 1.016 | 0.011 | n/a | 3.146 | 9.936 | n/a | n/a | 0.030 | 3.364 | 0.186 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.193 | 0.804 | 0.000 | 0.779 | 3.504 | n/a | 0.000 | 0.073 | 0.911 | 1.746 | 0.021 | n/a | 0.287 | 12.072 | n/a | n/a | 0.031 | 3.950 | 0.203 | 0.031 |
| p99 | 137.308 | 6.573 | 0.000 | 7.271 | 11.325 | n/a | 2.438 | 2.621 | 7.881 | 19.272 | 0.185 | n/a | 3.638 | 123.756 | n/a | n/a | 0.148 | 13.848 | 0.448 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 527010f61e354738000000000000013f | 137.308 | 6.530 | n/a | 0.000 | 0.085 | 1.597 | 5.197 | 0.018 | n/a | 0.089 | 123.756 | n/a | n/a | 0.036 | 6.615 | 0.048 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 527010f61e3547380000000000000127 | 45.916 | 8.016 | n/a | 0.000 | 0.072 | 5.389 | 19.272 | 0.185 | n/a | 0.830 | 12.112 | n/a | n/a | 0.039 | 8.089 | 0.176 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000019e | 42.610 | 4.097 | n/a | 0.000 | 0.017 | 7.881 | 1.689 | 0.018 | n/a | 1.153 | 27.744 | n/a | n/a | 0.011 | 4.114 | 0.097 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.017ms |
| 527010f61e3547380000000000000125 | 38.742 | 7.276 | n/a | 0.000 | 0.160 | 0.966 | 5.152 | 0.018 | n/a | 0.100 | 25.019 | n/a | n/a | 0.051 | 7.436 | 0.192 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.001ms |
| 527010f61e35473800000000000001a6 | 37.093 | 4.878 | n/a | 0.000 | 0.073 | 0.762 | 2.746 | 0.029 | n/a | 2.807 | 25.769 | n/a | n/a | 0.029 | 4.951 | 0.133 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 527010f61e354738000000000000012a | 36.437 | 7.303 | n/a | 0.000 | 0.071 | 0.823 | 1.911 | 0.022 | n/a | 3.150 | 23.130 | n/a | n/a | 0.027 | 7.375 | 0.202 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000177 | 35.917 | 7.248 | n/a | 0.000 | 0.205 | 1.049 | 2.239 | 0.027 | n/a | 0.196 | 24.855 | n/a | n/a | 0.099 | 7.453 | 0.208 | 0.099 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 527010f61e3547380000000000000187 | 32.430 | 5.348 | n/a | 0.000 | 1.907 | 0.935 | 5.666 | 0.066 | n/a | 0.175 | 18.305 | n/a | n/a | 0.030 | 7.255 | 0.224 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.072ms |
| 527010f61e3547380000000000000132 | 31.100 | 2.436 | n/a | 0.000 | 0.063 | 4.493 | 1.200 | 0.015 | n/a | 0.114 | 22.749 | n/a | n/a | 0.029 | 2.499 | 0.080 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000138 | 30.927 | 11.325 | n/a | 2.438 | 0.085 | 1.718 | 5.222 | 0.020 | n/a | 0.622 | 9.458 | n/a | n/a | 0.041 | 13.848 | 0.448 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000172 | 29.028 | 4.772 | n/a | 0.000 | 2.188 | 0.774 | 3.101 | 0.026 | n/a | 2.122 | 16.025 | n/a | n/a | 0.020 | 6.960 | 0.240 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000014f | 28.982 | 8.761 | n/a | 0.000 | 0.191 | 1.109 | 5.553 | 0.033 | n/a | 0.122 | 13.150 | n/a | n/a | 0.061 | 8.953 | 0.309 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000019d | 28.837 | 2.086 | n/a | 0.000 | 0.056 | 0.979 | 5.041 | 0.041 | n/a | 3.638 | 16.969 | n/a | n/a | 0.028 | 2.142 | 0.074 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000184 | 26.892 | 2.196 | n/a | 0.000 | 0.056 | 0.708 | 1.617 | 0.020 | n/a | 0.204 | 22.068 | n/a | n/a | 0.025 | 2.251 | 0.084 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000015f | 25.907 | 2.375 | n/a | 0.000 | 0.043 | 0.822 | 1.315 | 0.018 | n/a | 0.349 | 20.965 | n/a | n/a | 0.022 | 2.418 | 0.093 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000017e | 25.333 | 8.018 | n/a | 0.000 | 0.131 | 0.637 | 1.746 | 0.018 | n/a | 0.108 | 14.607 | n/a | n/a | 0.069 | 8.148 | 0.322 | 0.069 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e354738000000000000014a | 24.214 | 6.024 | n/a | 0.000 | 0.059 | 1.082 | 1.563 | 0.015 | n/a | 0.106 | 15.337 | n/a | n/a | 0.027 | 6.083 | 0.251 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000156 | 22.891 | 3.431 | n/a | 0.000 | 2.621 | 1.014 | 2.516 | 0.024 | n/a | 0.105 | 13.148 | n/a | n/a | 0.031 | 6.052 | 0.264 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 527010f61e3547380000000000000167 | 21.445 | 2.638 | n/a | 0.000 | 0.072 | 0.615 | 6.037 | 0.035 | n/a | 0.139 | 11.879 | n/a | n/a | 0.030 | 2.709 | 0.126 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e3547380000000000000159 | 21.317 | 6.055 | n/a | 0.000 | 0.091 | 0.877 | 4.324 | 0.032 | n/a | 1.453 | 8.440 | n/a | n/a | 0.044 | 6.146 | 0.288 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.068 | 1.000 | 0.000 | 1.085 | 3.576 | n/a | 0.000 | 0.082 | 1.171 | 1.430 | 0.023 | n/a | 0.441 | 14.499 | n/a | n/a | 0.039 | 3.785 | 0.179 | 0.039 |
| p99 | 109.785 | 4.309 | 0.000 | 2.291 | 14.234 | n/a | 0.000 | 0.209 | 7.986 | 14.050 | 2.294 | n/a | 3.116 | 93.678 | n/a | n/a | 0.054 | 14.316 | 0.214 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 527010f61e35473800000000000001c3 | 109.785 | 3.734 | n/a | 0.000 | 0.088 | 2.204 | 9.892 | 0.028 | n/a | 0.111 | 93.678 | n/a | n/a | 0.050 | 3.822 | 0.035 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 527010f61e35473800000000000001b4 | 66.873 | 14.234 | n/a | 0.000 | 0.082 | 7.986 | 14.050 | 2.294 | n/a | 1.045 | 27.142 | n/a | n/a | 0.040 | 14.316 | 0.214 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 527010f61e35473800000000000001a9 | 39.272 | 6.988 | n/a | 0.000 | 0.157 | 1.546 | 2.891 | 0.046 | n/a | 1.766 | 25.825 | n/a | n/a | 0.054 | 7.145 | 0.182 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001bd | 25.595 | 4.929 | n/a | 0.000 | 0.058 | 0.740 | 2.355 | 0.023 | n/a | 3.116 | 14.349 | n/a | n/a | 0.025 | 4.987 | 0.195 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001b0 | 25.517 | 4.501 | n/a | 0.000 | 0.075 | 1.994 | 2.122 | 0.069 | n/a | 0.904 | 15.816 | n/a | n/a | 0.036 | 4.576 | 0.179 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001c7 | 22.927 | 4.168 | n/a | 0.000 | 0.104 | 1.171 | 1.142 | 0.018 | n/a | 1.474 | 14.804 | n/a | n/a | 0.045 | 4.272 | 0.186 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001ca | 22.068 | 3.576 | n/a | 0.000 | 0.209 | 1.317 | 1.661 | 0.036 | n/a | 0.441 | 14.773 | n/a | n/a | 0.054 | 3.785 | 0.172 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001c0 | 20.463 | 3.393 | n/a | 0.000 | 0.119 | 1.381 | 1.044 | 0.017 | n/a | 0.428 | 14.029 | n/a | n/a | 0.052 | 3.511 | 0.172 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001b9 | 19.865 | 3.004 | n/a | 0.000 | 0.112 | 0.795 | 1.133 | 0.015 | n/a | 0.277 | 14.499 | n/a | n/a | 0.029 | 3.117 | 0.157 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001ad | 15.589 | 3.276 | n/a | 0.000 | 0.055 | 0.817 | 1.196 | 0.014 | n/a | 0.114 | 10.088 | n/a | n/a | 0.028 | 3.332 | 0.214 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001ab | 15.204 | 2.612 | n/a | 0.000 | 0.078 | 0.907 | 1.294 | 0.017 | n/a | 0.079 | 10.187 | n/a | n/a | 0.029 | 2.690 | 0.177 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 527010f61e35473800000000000001b7 | 13.878 | 2.848 | n/a | 0.000 | 0.076 | 0.683 | 1.430 | 0.025 | n/a | 0.470 | 8.307 | n/a | n/a | 0.039 | 2.924 | 0.211 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.684 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 200.761 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 366.629 | n/a | n/a | n/a | 2.756 | n/a | 0.000 | 0.000 | 4.071 | 361.291 | 11.646 | n/a | 0.201 | 0.000 | n/a | n/a | 0.302 | 2.756 | 0.008 | 0.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a002b4f8811b62180000000000000002 | 366.629 | 2.756 | n/a | 0.000 | 0.000 | 1.972 | 361.291 | 0.107 | n/a | 0.201 | 0.000 | n/a | n/a | 0.302 | 2.756 | 0.008 | 0.302 | gw-r/thread-45/gateway.admitted-work | none observed |
| 740b275d74e011f8000000000000015d | 213.082 | 0.000 | n/a | 0.000 | 0.000 | 1.015 | 211.861 | 0.018 | n/a | 0.049 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 740b275d74e011f80000000000000005 | 209.818 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 208.702 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f8000000000000016d | 205.275 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 204.337 | 0.010 | n/a | 0.030 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000163 | 205.084 | 0.000 | n/a | 0.000 | 0.000 | 4.071 | 200.885 | 0.009 | n/a | 0.026 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f8000000000000015c | 203.832 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 202.276 | 0.016 | n/a | 0.120 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000169 | 203.547 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 202.557 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000164 | 203.545 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 202.768 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f8000000000000017e | 203.276 | 0.000 | n/a | 0.000 | 0.000 | 0.384 | 202.668 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f8000000000000017a | 203.232 | 0.000 | n/a | 0.000 | 0.000 | 2.251 | 200.829 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f8000000000000014f | 202.660 | 0.000 | n/a | 0.000 | 0.000 | 1.846 | 200.639 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f80000000000000167 | 202.353 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 201.264 | 0.018 | n/a | 0.117 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f80000000000000171 | 202.283 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 200.929 | 0.009 | n/a | 0.117 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f8000000000000014a | 202.267 | 0.000 | n/a | 0.000 | 0.000 | 1.562 | 200.472 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f8000000000000017f | 202.247 | 0.000 | n/a | 0.000 | 0.000 | 1.096 | 200.805 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f8000000000000015b | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 201.269 | 0.041 | n/a | 0.088 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f80000000000000172 | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 200.970 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000165 | 202.127 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 201.124 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f80000000000000166 | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 201.213 | 0.034 | n/a | 0.093 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f80000000000000178 | 202.067 | 0.000 | n/a | 0.000 | 0.000 | 0.998 | 200.770 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-44/journal/page | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1006.009 | n/a | n/a | n/a | 0.192 | n/a | 0.000 | 0.000 | 1.262 | 999.789 | 0.009 | n/a | 3.499 | 0.000 | n/a | n/a | 1.259 | 0.192 | 0.000 | 1.259 |
| p99 | 1006.009 | n/a | n/a | n/a | 0.192 | n/a | 0.000 | 0.000 | 1.262 | 999.789 | 0.009 | n/a | 3.499 | 0.000 | n/a | n/a | 1.259 | 0.192 | 0.000 | 1.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a002b4f8811b621800000000000000a4 | 1006.009 | 0.192 | n/a | 0.000 | 0.000 | 1.262 | 999.789 | 0.009 | n/a | 3.499 | 0.000 | n/a | n/a | 1.259 | 0.192 | 0.000 | 1.259 | gw-r/thread-43/journal/page | none observed |

## P3 / warmup / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 872.697 | n/a | n/a | n/a | 2.886 | n/a | 0.000 | 0.000 | 0.686 | 855.437 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.837 | 2.886 | 0.008 | 0.837 |
| p99 | 1008.781 | n/a | n/a | n/a | 18.878 | n/a | 6.934 | 0.000 | 16.164 | 1003.464 | 0.422 | n/a | 0.697 | 0.000 | n/a | n/a | 32.029 | 25.811 | 0.303 | 32.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a002b4f8811b621800000000000000a7 | 1008.781 | 0.270 | n/a | 0.000 | 0.000 | 5.045 | 1002.133 | 0.021 | n/a | 0.158 | 0.000 | n/a | n/a | 1.155 | 0.270 | 0.000 | 1.155 | gw-r/thread-45/journal/page | none observed |
| a002b4f8811b621800000000000000aa | 1006.838 | 0.132 | n/a | 0.000 | 0.000 | 4.753 | 1000.781 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 1.107 | 0.132 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| a002b4f8811b621800000000000000b8 | 1005.261 | 0.156 | n/a | 0.000 | 0.000 | 0.510 | 1003.464 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 1.102 | 0.156 | 0.000 | 1.102 | gw-r/thread-43/journal/page | none observed |
| a002b4f8811b621800000000000000c8 | 1004.456 | 0.119 | n/a | 0.000 | 0.000 | 0.656 | 1002.499 | 0.018 | n/a | 0.067 | 0.000 | n/a | n/a | 1.096 | 0.119 | 0.000 | 1.096 | gw-r/thread-45/journal/page | none observed |
| a002b4f8811b621800000000000000ad | 1003.509 | 0.123 | n/a | 0.000 | 0.000 | 0.424 | 1001.158 | 0.012 | n/a | 0.697 | 0.000 | n/a | n/a | 1.094 | 0.123 | 0.000 | 1.094 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000c3 | 1003.433 | 0.145 | n/a | 0.000 | 0.000 | 0.686 | 1001.351 | 0.008 | n/a | 0.128 | 0.000 | n/a | n/a | 1.115 | 0.145 | 0.000 | 1.115 | gw-r/thread-45/journal/page | none observed |
| a002b4f8811b621800000000000000b7 | 1003.240 | 0.151 | n/a | 0.000 | 0.000 | 0.881 | 1000.949 | 0.005 | n/a | 0.128 | 0.000 | n/a | n/a | 1.125 | 0.151 | 0.000 | 1.125 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000b1 | 1002.942 | 0.198 | n/a | 0.000 | 0.000 | 0.645 | 1000.912 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 1.130 | 0.198 | 0.000 | 1.130 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000bc | 1002.906 | 0.112 | n/a | 0.000 | 0.000 | 1.096 | 1000.572 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 1.096 | 0.112 | 0.000 | 1.096 | gw-r/thread-43/journal/page | none observed |
| a002b4f8811b621800000000000000a5 | 979.869 | 18.878 | n/a | 6.934 | 0.000 | 1.260 | 951.917 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.837 | 25.811 | 0.026 | 0.837 | gw-r/thread-44/journal/page | none observed |
| a002b4f8811b621800000000000000c1 | 957.842 | 4.239 | n/a | 0.000 | 0.000 | 16.164 | 937.305 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.092 | 4.239 | 0.004 | 0.092 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000b3 | 872.697 | 10.464 | n/a | 0.000 | 0.000 | 6.574 | 855.437 | 0.003 | n/a | 0.040 | 0.000 | n/a | n/a | 0.179 | 10.464 | 0.012 | 0.179 | gw-r/thread-48/journal/page | none observed |
| a002b4f8811b621800000000000000c0 | 613.560 | 5.053 | n/a | 0.000 | 0.000 | 0.787 | 607.585 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.084 | 5.053 | 0.008 | 0.084 | gw-r/thread-41/journal/page | none observed |
| a002b4f8811b621800000000000000b5 | 510.036 | 4.252 | n/a | 0.000 | 0.000 | 0.976 | 504.627 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.115 | 4.252 | 0.008 | 0.115 | gw-r/thread-47/journal/page | none observed |
| a002b4f8811b621800000000000000b9 | 422.349 | 7.400 | n/a | 0.000 | 0.000 | 0.654 | 413.967 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.286 | 7.400 | 0.018 | 0.286 | gw-r/thread-47/journal/page | none observed |
| a002b4f8811b621800000000000000be | 394.650 | 11.466 | n/a | 0.000 | 0.000 | 0.973 | 382.016 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.137 | 11.466 | 0.029 | 0.137 | gw-r/thread-44/journal/page | none observed |
| a002b4f8811b621800000000000000b0 | 318.619 | 5.182 | n/a | 0.000 | 0.000 | 1.327 | 311.453 | 0.422 | n/a | 0.038 | 0.000 | n/a | n/a | 0.196 | 5.182 | 0.016 | 0.196 | gw-r/thread-41/journal/page | none observed |
| a002b4f8811b621800000000000000c6 | 270.632 | 2.504 | n/a | 0.000 | 0.000 | 0.607 | 267.263 | 0.120 | n/a | 0.060 | 0.000 | n/a | n/a | 0.077 | 2.504 | 0.009 | 0.077 | gw-r/thread-47/journal/page | none observed |
| a002b4f8811b621800000000000000c5 | 261.807 | 2.886 | n/a | 0.000 | 0.000 | 0.644 | 258.139 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.079 | 2.886 | 0.011 | 0.079 | gw-r/thread-41/journal/page | none observed |
| a002b4f8811b621800000000000000bb | 252.946 | 3.434 | n/a | 0.000 | 0.000 | 0.608 | 248.721 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.137 | 3.434 | 0.014 | 0.137 | gw-r/thread-44/journal/page | none observed |

## P3 / baseline / internal (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 627.431 | n/a | n/a | n/a | 2.748 | n/a | 0.000 | 0.000 | 0.610 | 615.901 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.214 | 2.748 | 0.008 | 0.214 |
| p99 | 1012.260 | n/a | n/a | n/a | 18.425 | n/a | 5.148 | 0.000 | 9.067 | 1004.810 | 0.021 | n/a | 1.531 | 0.000 | n/a | n/a | 43.392 | 19.694 | 0.387 | 43.392 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a002b4f8811b621800000000000000f0 | 1012.260 | 0.133 | n/a | 0.000 | 0.000 | 9.067 | 1001.715 | 0.013 | n/a | 0.225 | 0.000 | n/a | n/a | 1.106 | 0.133 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| a002b4f8811b62180000000000000109 | 1006.805 | 0.143 | n/a | 0.000 | 0.000 | 0.671 | 1004.810 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 1.126 | 0.143 | 0.000 | 1.126 | gw-r/thread-44/journal/page | none observed |
| a002b4f8811b6218000000000000010b | 1006.026 | 0.211 | n/a | 0.000 | 0.000 | 0.628 | 1004.033 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 1.140 | 0.211 | 0.000 | 1.140 | gw-r/thread-48/journal/page | none observed |
| a002b4f8811b62180000000000000121 | 1005.500 | 0.156 | n/a | 0.000 | 0.000 | 3.403 | 1000.789 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 1.108 | 0.156 | 0.000 | 1.108 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b6218000000000000011e | 1005.432 | 0.271 | n/a | 0.000 | 0.000 | 3.451 | 1000.521 | 0.007 | n/a | 0.020 | 0.000 | n/a | n/a | 1.162 | 0.271 | 0.000 | 1.162 | gw-r/thread-41/journal/page | none observed |
| a002b4f8811b62180000000000000115 | 1004.346 | 0.130 | n/a | 0.000 | 0.000 | 0.673 | 1002.400 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 1.106 | 0.130 | 0.000 | 1.106 | gw-r/thread-43/journal/page | none observed |
| a002b4f8811b621800000000000000fd | 1004.249 | 0.133 | n/a | 0.000 | 0.000 | 0.570 | 1000.904 | 0.021 | n/a | 1.531 | 0.000 | n/a | n/a | 1.090 | 0.133 | 0.000 | 1.090 | gw-r/thread-48/journal/page | none observed |
| a002b4f8811b621800000000000000d3 | 1003.684 | 0.167 | n/a | 0.000 | 0.000 | 0.796 | 1001.444 | 0.013 | n/a | 0.151 | 0.000 | n/a | n/a | 1.114 | 0.167 | 0.000 | 1.114 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000db | 1003.429 | 0.218 | n/a | 0.000 | 0.000 | 1.317 | 1000.699 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 1.151 | 0.218 | 0.000 | 1.151 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b62180000000000000117 | 1003.336 | 0.196 | n/a | 0.000 | 0.000 | 0.680 | 1001.170 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 1.206 | 0.196 | 0.000 | 1.206 | gw-r/thread-44/journal/page | none observed |
| a002b4f8811b6218000000000000012e | 1002.981 | 0.122 | n/a | 0.568 | 0.000 | 0.502 | 1000.655 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 1.093 | 0.690 | 0.001 | 1.093 | gw-r/thread-47/journal/page | none observed |
| a002b4f8811b621800000000000000cb | 1002.892 | 0.122 | n/a | 0.000 | 0.000 | 0.633 | 1000.981 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 1.095 | 0.122 | 0.000 | 1.095 | gw-r/thread-45/journal/page | none observed |
| a002b4f8811b62180000000000000128 | 1002.759 | 0.118 | n/a | 0.000 | 0.000 | 0.890 | 1000.525 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 1.179 | 0.118 | 0.000 | 1.179 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000d6 | 1002.710 | 0.112 | n/a | 0.000 | 0.000 | 0.392 | 1001.010 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 1.093 | 0.112 | 0.000 | 1.093 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000f5 | 1002.684 | 0.286 | n/a | 0.000 | 0.000 | 0.710 | 1000.464 | 0.005 | n/a | 0.018 | 0.000 | n/a | n/a | 1.201 | 0.286 | 0.000 | 1.201 | gw-r/thread-45/journal/page | none observed |
| a002b4f8811b621800000000000000ca | 1002.636 | 0.156 | n/a | 0.000 | 0.000 | 0.555 | 1000.764 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 1.096 | 0.156 | 0.000 | 1.096 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b621800000000000000ff | 1002.615 | 0.181 | n/a | 0.000 | 0.000 | 0.686 | 1000.575 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 1.134 | 0.181 | 0.000 | 1.134 | gw-r/thread-48/journal/page | none observed |
| a002b4f8811b621800000000000000d5 | 1002.592 | 0.127 | n/a | 0.000 | 0.000 | 0.595 | 1000.709 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 1.109 | 0.127 | 0.000 | 1.109 | gw-r/thread-43/journal/page | none observed |
| a002b4f8811b621800000000000000d0 | 1002.570 | 0.164 | n/a | 0.000 | 0.000 | 0.653 | 1000.593 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 1.123 | 0.164 | 0.000 | 1.123 | gw-r/thread-46/journal/page | none observed |
| a002b4f8811b62180000000000000138 | 1002.490 | 0.105 | n/a | 0.000 | 0.000 | 0.437 | 1000.780 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 1.094 | 0.105 | 0.000 | 1.094 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.399 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.135 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 209.680 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.547 | 207.773 | 0.930 | n/a | 1.659 | 0.000 | n/a | n/a | 0.735 | 0.000 | 0.000 | 0.735 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 740b275d74e011f80000000000000009 | 209.680 | 0.000 | n/a | 0.000 | 0.000 | 4.547 | 204.409 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.661 | 0.000 | 0.000 | 0.661 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f8000000000000001f | 208.540 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 207.773 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f80000000000000008 | 208.349 | 0.000 | n/a | 0.000 | 0.000 | 2.673 | 205.261 | 0.007 | n/a | 0.156 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-45/journal/page | none observed |
| 740b275d74e011f80000000000000007 | 207.906 | 0.000 | n/a | 0.000 | 0.000 | 1.878 | 204.993 | 0.014 | n/a | 0.285 | 0.000 | n/a | n/a | 0.735 | 0.000 | 0.000 | 0.735 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f80000000000000006 | 207.901 | 0.000 | n/a | 0.000 | 0.000 | 3.988 | 203.498 | 0.015 | n/a | 0.083 | 0.000 | n/a | n/a | 0.318 | 0.000 | 0.000 | 0.318 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f8000000000000000c | 207.369 | 0.000 | n/a | 0.000 | 0.000 | 4.123 | 203.041 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f80000000000000015 | 206.962 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 205.955 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000018 | 206.280 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 205.348 | 0.004 | n/a | 0.073 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f80000000000000010 | 205.832 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 205.004 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f8000000000000002e | 205.632 | 0.000 | n/a | 0.000 | 0.000 | 4.364 | 201.039 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f8000000000000004d | 205.510 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 204.389 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f8000000000000000f | 205.124 | 0.000 | n/a | 0.000 | 0.000 | 3.016 | 201.909 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f80000000000000011 | 204.773 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 203.909 | 0.017 | n/a | 0.053 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f8000000000000004a | 204.663 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 204.119 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f80000000000000028 | 204.154 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 203.153 | 0.027 | n/a | 0.156 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| 740b275d74e011f80000000000000012 | 204.136 | 0.000 | n/a | 0.000 | 0.000 | 2.079 | 201.622 | 0.007 | n/a | 0.181 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-45/journal/page | none observed |
| 740b275d74e011f80000000000000016 | 203.887 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 202.893 | 0.026 | n/a | 0.094 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 740b275d74e011f80000000000000021 | 203.863 | 0.000 | n/a | 0.000 | 0.000 | 1.241 | 202.294 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f8000000000000001a | 203.657 | 0.000 | n/a | 0.000 | 0.000 | 2.099 | 201.251 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f8000000000000002f | 203.587 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 202.614 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (210 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.670 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 200.739 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 206.759 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.895 | 205.189 | 0.025 | n/a | 1.159 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 740b275d74e011f8000000000000007e | 208.995 | 0.000 | n/a | 0.000 | 0.000 | 1.220 | 207.421 | 0.026 | n/a | 0.093 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000108 | 207.675 | 0.000 | n/a | 0.000 | 0.000 | 6.889 | 200.556 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f80000000000000085 | 206.759 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 205.903 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f8000000000000005c | 206.499 | 0.000 | n/a | 0.000 | 0.000 | 0.996 | 205.189 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f80000000000000053 | 206.465 | 0.000 | n/a | 0.000 | 0.000 | 1.440 | 204.610 | 0.011 | n/a | 0.186 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f800000000000000eb | 206.163 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 204.927 | 0.021 | n/a | 0.077 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f8000000000000005f | 205.818 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 204.996 | 0.016 | n/a | 0.085 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f800000000000000ec | 205.632 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 204.545 | 0.017 | n/a | 0.080 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f80000000000000069 | 205.501 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 204.267 | 0.008 | n/a | 0.118 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f8000000000000008e | 205.499 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 204.402 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-45/journal/page | none observed |
| 740b275d74e011f800000000000000ae | 205.463 | 0.000 | n/a | 0.000 | 0.000 | 1.487 | 203.677 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f8000000000000007c | 205.391 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 204.351 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-44/journal/page | none observed |
| 740b275d74e011f800000000000000a1 | 205.241 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 204.241 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f80000000000000056 | 205.201 | 0.000 | n/a | 0.000 | 0.000 | 0.457 | 204.585 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-41/journal/page | none observed |
| 740b275d74e011f80000000000000055 | 205.054 | 0.000 | n/a | 0.000 | 0.000 | 0.794 | 203.992 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f800000000000000e7 | 205.041 | 0.000 | n/a | 0.000 | 0.000 | 4.285 | 200.595 | 0.021 | n/a | 0.045 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 740b275d74e011f800000000000000ea | 204.885 | 0.000 | n/a | 0.000 | 0.000 | 3.895 | 200.832 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 740b275d74e011f800000000000000bd | 204.799 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 204.224 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 740b275d74e011f800000000000000bf | 204.772 | 0.000 | n/a | 0.000 | 0.000 | 0.525 | 204.085 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 740b275d74e011f80000000000000059 | 204.740 | 0.000 | n/a | 0.000 | 0.000 | 3.891 | 200.681 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.



## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |


| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |

