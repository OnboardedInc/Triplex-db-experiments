# Trace report

The slowest observed commits spent their largest exclusive interval in `node-13/thread-5/socket.wait-first-byte` (62.550 ms, trace `f7a146af1fdfe61700000000000003e7`); `gw-w/thread-45/gateway.request-parse` (65.438 ms, trace `f7a146af1fdfe61700000000000003f0`); `gw-w/thread-45/gateway.admitted-work` (178.238 ms, trace `f7a146af1fdfe61700000000000000f5`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (52.484 ms, trace `f7a146af1fdfe61700000000000003f1`); `gw-w/thread-47/gateway.admitted-work` (63.765 ms, trace `f7a146af1fdfe61700000000000003e6`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p4-core-zero-a-1-baseline`; source `04dd61f7ae9431b4ea3053f191c001a944c8a7d8`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6704106.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 230 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13432.624 | 639.193 | 48.845 | 308 |
| L1 | 0 | 19072.024 | 487.173 | 30.866 | 462 |
| L4 | 0 | 19275.445 | 403.313 | 14.653 | 426 |
| L16 | 0 | 19426.331 | 400.334 | 10.322 | 474 |
| L64 | 0 | 19758.257 | 510.725 | 13.526 | 596 |
| L256 | 0 | 19045.437 | 569.970 | 36.643 | 486 |
| L1024 | 0 | 19976.292 | 4384.535 | 158.369 | 12048 |
| tail | 0 | 64576.966 | 11856.724 | 722.058 | 37440 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f7a146af1fdfe61700000000000003e7 | driver.queue.scheduler-dispatch | 0.124 | none | 1 / 32 |
| f7a146af1fdfe61700000000000003e7 | driver.queue.scheduler-late | 0.003 | none | 1 / 32 |

Observed active steps while trace f7a146af1fdfe61700000000000003e7 waited: []

| f7a146af1fdfe61700000000000003f0 | driver.queue.scheduler-late | 1.431 | none | 6 / 32 |
| f7a146af1fdfe61700000000000003f0 | driver.queue.scheduler-dispatch | 0.088 | none | 6 / 32 |

Observed active steps while trace f7a146af1fdfe61700000000000003f0 waited: []

| f7a146af1fdfe61700000000000000f5 | driver.queue.scheduler-dispatch | 0.202 | none | 0 / 32 |
| f7a146af1fdfe61700000000000000f5 | driver.queue.scheduler-late | 0.009 | none | 0 / 32 |

Observed active steps while trace f7a146af1fdfe61700000000000000f5 waited: []

| f7a146af1fdfe61700000000000003f1 | driver.queue.scheduler-late | 1.023 | none | 7 / 32 |
| f7a146af1fdfe61700000000000003f1 | driver.queue.scheduler-dispatch | 0.070 | none | 7 / 32 |

Observed active steps while trace f7a146af1fdfe61700000000000003f1 waited: []

| f7a146af1fdfe61700000000000003e6 | driver.queue.scheduler-late | 0.580 | none | 0 / 32 |
| f7a146af1fdfe61700000000000003e6 | driver.queue.scheduler-dispatch | 0.058 | none | 0 / 32 |

Observed active steps while trace f7a146af1fdfe61700000000000003e6 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.668 | 0.742 | 0.000 | 1.024 | 6.259 | 0.018 | 0.000 | 0.332 | 1.718 | 10.916 | 0.059 | n/a | 0.385 | 17.571 | n/a | n/a | 0.061 | 7.090 | 0.186 | 0.061 |
| p99 | 234.855 | 4.945 | 0.091 | 5.912 | 16.699 | 2.767 | 7.220 | 1.397 | 5.164 | 189.661 | 0.214 | n/a | 3.234 | 55.401 | n/a | n/a | 0.325 | 18.473 | 0.479 | 0.325 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000000f5 | 234.855 | 6.878 | 2.767 | 0.000 | 0.211 | 4.494 | 189.661 | 0.087 | n/a | 1.972 | 28.621 | n/a | n/a | 0.165 | 9.855 | 0.042 | 0.165 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000000f9 | 144.813 | 7.858 | 0.457 | 0.000 | 0.127 | 4.295 | 75.538 | 0.150 | n/a | 0.921 | 55.401 | n/a | n/a | 0.067 | 8.442 | 0.058 | 0.067 | gw-w/thread-43/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000109 | 70.088 | 8.506 | 1.089 | 0.000 | 0.069 | 2.176 | 43.124 | 0.148 | n/a | 3.149 | 11.769 | n/a | n/a | 0.058 | 9.664 | 0.138 | 0.058 | gw-w/thread-44/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000000f1 | 63.820 | 16.699 | 0.625 | 0.000 | 0.087 | 3.135 | 14.123 | 0.214 | n/a | 0.698 | 28.184 | n/a | n/a | 0.055 | 17.411 | 0.273 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000000ee | 59.819 | 9.844 | 0.012 | 7.220 | 1.397 | 0.738 | 13.436 | 0.206 | n/a | 0.170 | 26.492 | n/a | n/a | 0.304 | 18.473 | 0.309 | 0.304 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000000fb | 48.370 | 4.997 | 0.316 | 0.000 | 0.099 | 2.185 | 21.693 | 0.066 | n/a | 0.158 | 18.775 | n/a | n/a | 0.081 | 5.412 | 0.112 | 0.081 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe617000000000000011f | 46.850 | 7.510 | 0.359 | 0.767 | 0.061 | 2.163 | 11.161 | 0.103 | n/a | 1.280 | 23.393 | n/a | n/a | 0.053 | 8.697 | 0.186 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000011b | 46.679 | 4.589 | 0.224 | 0.000 | 0.074 | 1.544 | 17.059 | 0.142 | n/a | 0.795 | 22.151 | n/a | n/a | 0.101 | 4.887 | 0.105 | 0.101 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000103 | 46.112 | 7.439 | 0.229 | 0.000 | 0.332 | 1.801 | 11.767 | 0.062 | n/a | 0.197 | 24.227 | n/a | n/a | 0.058 | 8.000 | 0.173 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000101 | 44.217 | 6.259 | 0.237 | 0.000 | 0.088 | 2.021 | 15.614 | 0.146 | n/a | 0.304 | 19.479 | n/a | n/a | 0.069 | 6.584 | 0.149 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000117 | 41.580 | 6.641 | 0.474 | 0.671 | 0.112 | 2.794 | 9.572 | 0.048 | n/a | 0.373 | 20.834 | n/a | n/a | 0.061 | 7.898 | 0.190 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000115 | 40.098 | 8.106 | 0.007 | 4.406 | 0.538 | 0.905 | 4.134 | 0.039 | n/a | 0.557 | 21.346 | n/a | n/a | 0.061 | 13.057 | 0.326 | 0.061 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000000ff | 39.110 | 6.468 | 0.009 | 3.532 | 0.797 | 0.853 | 2.222 | 0.043 | n/a | 0.613 | 24.500 | n/a | n/a | 0.071 | 10.807 | 0.276 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000125 | 37.877 | 3.488 | 0.187 | 0.000 | 0.038 | 1.492 | 11.765 | 0.057 | n/a | 0.115 | 20.703 | n/a | n/a | 0.032 | 3.713 | 0.098 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000010d | 37.668 | 6.218 | 0.643 | 0.000 | 0.071 | 3.273 | 11.375 | 0.152 | n/a | 0.697 | 15.199 | n/a | n/a | 0.040 | 6.932 | 0.184 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000113 | 37.461 | 5.949 | 0.215 | 0.000 | 0.070 | 5.130 | 14.056 | 0.048 | n/a | 0.385 | 11.559 | n/a | n/a | 0.051 | 6.234 | 0.166 | 0.051 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000111 | 37.274 | 5.439 | 0.007 | 0.000 | 1.189 | 2.219 | 5.143 | 0.059 | n/a | 0.123 | 23.014 | n/a | n/a | 0.081 | 6.635 | 0.178 | 0.081 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000011d | 34.901 | 3.478 | 0.005 | 0.000 | 0.517 | 1.112 | 17.688 | 0.076 | n/a | 0.175 | 11.812 | n/a | n/a | 0.038 | 4.000 | 0.115 | 0.038 | gw-w/thread-40/commit.prepare-and-validate | none observed |
| f7a146af1fdfe6170000000000000104 | 32.126 | 7.060 | 0.007 | 2.821 | 0.440 | 1.100 | 2.917 | 0.039 | n/a | 0.109 | 17.571 | n/a | n/a | 0.062 | 10.329 | 0.322 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000010b | 29.391 | 6.746 | 0.278 | 0.000 | 0.066 | 2.133 | 10.916 | 0.061 | n/a | 2.861 | 6.290 | n/a | n/a | 0.041 | 7.090 | 0.241 | 0.041 | gw-w/thread-42/gateway.admitted-work | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.329 | 0.992 | 0.000 | 2.130 | 4.644 | 0.007 | 0.000 | 0.632 | 1.171 | 1.670 | 0.047 | n/a | 0.175 | 10.949 | n/a | n/a | 0.070 | 6.635 | 0.285 | 0.070 |
| p99 | 37.274 | 3.028 | 0.091 | 3.449 | 7.298 | 0.018 | 4.171 | 1.215 | 5.164 | 17.688 | 0.098 | n/a | 3.017 | 23.014 | n/a | n/a | 0.325 | 11.648 | 0.479 | 0.325 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe6170000000000000111 | 37.274 | 5.439 | 0.007 | 0.000 | 1.189 | 2.219 | 5.143 | 0.059 | n/a | 0.123 | 23.014 | n/a | n/a | 0.081 | 6.635 | 0.178 | 0.081 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000011d | 34.901 | 3.478 | 0.005 | 0.000 | 0.517 | 1.112 | 17.688 | 0.076 | n/a | 0.175 | 11.812 | n/a | n/a | 0.038 | 4.000 | 0.115 | 0.038 | gw-w/thread-40/commit.prepare-and-validate | none observed |
| f7a146af1fdfe6170000000000000119 | 26.099 | 3.633 | 0.007 | 0.000 | 0.542 | 5.164 | 2.279 | 0.098 | n/a | 2.170 | 12.152 | n/a | n/a | 0.055 | 4.181 | 0.160 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000000f7 | 25.658 | 7.298 | 0.010 | 0.000 | 1.215 | 1.171 | 1.878 | 0.050 | n/a | 3.017 | 10.949 | n/a | n/a | 0.070 | 8.522 | 0.332 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000000fc | 24.329 | 6.832 | 0.018 | 4.171 | 0.628 | 1.172 | 1.587 | 0.046 | n/a | 0.103 | 9.687 | n/a | n/a | 0.086 | 11.648 | 0.479 | 0.086 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000123 | 21.627 | 3.445 | 0.006 | 0.000 | 0.943 | 0.926 | 1.246 | 0.036 | n/a | 0.341 | 14.644 | n/a | n/a | 0.039 | 4.394 | 0.203 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000000f3 | 18.554 | 4.644 | 0.012 | 0.000 | 0.632 | 1.167 | 1.360 | 0.041 | n/a | 0.396 | 9.978 | n/a | n/a | 0.325 | 5.288 | 0.285 | 0.325 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000010e | 18.160 | 5.397 | 0.006 | 1.674 | 0.865 | 1.718 | 1.335 | 0.039 | n/a | 0.124 | 6.923 | n/a | n/a | 0.080 | 7.942 | 0.437 | 0.080 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000121 | 15.104 | 4.380 | 0.007 | 1.772 | 0.610 | 0.691 | 1.670 | 0.047 | n/a | 0.110 | 5.775 | n/a | n/a | 0.042 | 6.769 | 0.448 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.527 | 0.693 | 0.000 | 1.448 | 5.619 | 0.012 | 0.000 | 0.244 | 1.612 | 10.901 | 0.063 | n/a | 0.413 | 15.015 | n/a | n/a | 0.060 | 6.379 | 0.183 | 0.060 |
| p99 | 87.552 | 3.612 | 2.375 | 4.356 | 15.658 | 4.076 | 1.917 | 14.807 | 9.259 | 40.669 | 0.362 | n/a | 11.737 | 41.407 | n/a | n/a | 0.146 | 21.763 | 0.635 | 0.146 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe617000000000000012c | 87.552 | 15.658 | 4.076 | 0.582 | 0.142 | 3.927 | 34.676 | 0.194 | n/a | 0.188 | 28.003 | n/a | n/a | 0.106 | 20.458 | 0.234 | 0.106 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000015f | 77.187 | 7.413 | 0.395 | 0.000 | 0.244 | 5.259 | 40.669 | 0.059 | n/a | 0.360 | 22.665 | n/a | n/a | 0.123 | 8.052 | 0.104 | 0.123 | gw-w/thread-42/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000139 | 68.395 | 11.386 | 0.012 | 0.000 | 0.426 | 1.174 | 12.812 | 0.115 | n/a | 0.917 | 41.407 | n/a | n/a | 0.146 | 11.824 | 0.173 | 0.146 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000014d | 52.016 | 6.944 | 0.234 | 0.000 | 0.025 | 2.220 | 22.189 | 0.119 | n/a | 1.521 | 18.724 | n/a | n/a | 0.040 | 7.203 | 0.138 | 0.040 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe617000000000000016f | 51.224 | 8.567 | 0.700 | 0.000 | 0.083 | 2.284 | 16.289 | 0.148 | n/a | 0.905 | 22.189 | n/a | n/a | 0.059 | 9.351 | 0.183 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000016d | 49.249 | 6.770 | 0.372 | 0.000 | 0.080 | 7.458 | 13.223 | 0.108 | n/a | 0.255 | 20.939 | n/a | n/a | 0.044 | 7.221 | 0.147 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000135 | 48.504 | 5.812 | 0.305 | 0.000 | 0.119 | 1.855 | 21.682 | 0.063 | n/a | 0.427 | 18.127 | n/a | n/a | 0.114 | 6.235 | 0.129 | 0.114 | gw-w/thread-47/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000132 | 47.802 | 6.760 | 0.309 | 0.000 | 0.129 | 1.818 | 24.708 | 0.050 | n/a | 1.985 | 11.970 | n/a | n/a | 0.073 | 7.198 | 0.151 | 0.073 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe617000000000000013d | 47.257 | 5.619 | 0.397 | 0.000 | 0.123 | 2.288 | 18.225 | 0.071 | n/a | 3.557 | 16.898 | n/a | n/a | 0.078 | 6.139 | 0.130 | 0.078 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000147 | 46.839 | 5.854 | 0.494 | 0.000 | 0.088 | 2.101 | 13.185 | 0.083 | n/a | 3.672 | 21.299 | n/a | n/a | 0.062 | 6.436 | 0.137 | 0.062 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000013b | 45.331 | 5.538 | 0.197 | 0.000 | 0.068 | 3.321 | 17.892 | 0.116 | n/a | 0.159 | 17.997 | n/a | n/a | 0.043 | 5.803 | 0.128 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000177 | 42.740 | 4.958 | 0.270 | 0.000 | 0.125 | 2.577 | 17.220 | 0.064 | n/a | 0.106 | 17.361 | n/a | n/a | 0.060 | 5.353 | 0.125 | 0.060 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000141 | 42.001 | 5.947 | 0.007 | 0.000 | 0.425 | 1.612 | 2.002 | 0.048 | n/a | 11.737 | 20.165 | n/a | n/a | 0.057 | 6.379 | 0.152 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000169 | 40.852 | 3.656 | 0.237 | 0.000 | 0.136 | 2.214 | 18.400 | 0.130 | n/a | 1.009 | 15.007 | n/a | n/a | 0.062 | 4.030 | 0.099 | 0.062 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000013f | 38.725 | 5.722 | 0.258 | 0.000 | 0.148 | 2.399 | 16.076 | 0.070 | n/a | 0.494 | 13.484 | n/a | n/a | 0.074 | 6.129 | 0.158 | 0.074 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000129 | 38.520 | 4.516 | 0.356 | 0.380 | 0.113 | 1.408 | 12.165 | 0.048 | n/a | 0.115 | 19.366 | n/a | n/a | 0.052 | 5.365 | 0.139 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000134 | 38.356 | 7.559 | 0.005 | 0.000 | 0.583 | 9.259 | 10.408 | 0.070 | n/a | 0.344 | 10.051 | n/a | n/a | 0.077 | 8.148 | 0.212 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000143 | 38.006 | 4.406 | 0.298 | 0.000 | 0.069 | 1.895 | 13.680 | 0.121 | n/a | 1.068 | 16.429 | n/a | n/a | 0.041 | 4.772 | 0.126 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000167 | 36.948 | 3.756 | 0.450 | 0.000 | 0.025 | 2.507 | 14.768 | 0.091 | n/a | 0.149 | 15.169 | n/a | n/a | 0.032 | 4.232 | 0.115 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000127 | 36.790 | 4.433 | 0.296 | 0.452 | 0.047 | 1.219 | 16.895 | 0.046 | n/a | 0.145 | 13.209 | n/a | n/a | 0.048 | 5.228 | 0.142 | 0.048 | gw-w/thread-43/gateway.admitted-work | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.289 | 0.987 | 0.000 | 1.838 | 5.029 | 0.008 | 0.000 | 0.583 | 0.959 | 1.488 | 0.040 | n/a | 0.344 | 10.051 | n/a | n/a | 0.055 | 6.417 | 0.269 | 0.055 |
| p99 | 38.356 | 1.866 | 2.375 | 3.863 | 7.559 | 0.011 | 1.917 | 14.807 | 9.259 | 10.408 | 0.076 | n/a | 0.968 | 23.099 | n/a | n/a | 0.084 | 21.763 | 0.635 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe6170000000000000134 | 38.356 | 7.559 | 0.005 | 0.000 | 0.583 | 9.259 | 10.408 | 0.070 | n/a | 0.344 | 10.051 | n/a | n/a | 0.077 | 8.148 | 0.212 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000174 | 34.285 | 5.029 | 0.010 | 1.917 | 14.807 | 0.951 | 1.342 | 0.040 | n/a | 0.476 | 9.663 | n/a | n/a | 0.050 | 21.763 | 0.635 | 0.050 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.290ms; driver.publication 1.015ms |
| f7a146af1fdfe6170000000000000130 | 32.478 | 4.923 | 0.005 | 1.298 | 0.886 | 0.604 | 1.497 | 0.037 | n/a | 0.081 | 23.099 | n/a | n/a | 0.047 | 7.113 | 0.219 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000016b | 23.811 | 5.810 | 0.011 | 0.000 | 0.596 | 1.365 | 1.952 | 0.076 | n/a | 0.649 | 13.297 | n/a | n/a | 0.055 | 6.417 | 0.270 | 0.055 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000144 | 21.289 | 5.219 | 0.010 | 0.000 | 0.501 | 0.959 | 1.488 | 0.040 | n/a | 0.086 | 12.902 | n/a | n/a | 0.084 | 5.730 | 0.269 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000014f | 17.909 | 6.319 | 0.008 | 0.000 | 0.248 | 1.394 | 2.127 | 0.063 | n/a | 0.647 | 7.025 | n/a | n/a | 0.079 | 6.574 | 0.367 | 0.079 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000159 | 15.552 | 3.007 | 0.005 | 0.000 | 0.096 | 0.835 | 1.074 | 0.038 | n/a | 0.109 | 10.348 | n/a | n/a | 0.040 | 3.108 | 0.200 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000015d | 14.737 | 4.539 | 0.010 | 0.000 | 1.034 | 2.425 | 1.110 | 0.038 | n/a | 0.968 | 4.539 | n/a | n/a | 0.075 | 5.582 | 0.379 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.642 | 0.579 | 0.000 | 1.091 | 5.321 | 0.205 | 0.000 | 0.253 | 1.873 | 8.894 | 0.060 | n/a | 0.219 | 13.535 | n/a | n/a | 0.066 | 6.214 | 0.196 | 0.066 |
| p99 | 86.406 | 3.100 | 0.719 | 4.133 | 10.605 | 0.621 | 0.000 | 1.147 | 5.422 | 37.045 | 0.240 | n/a | 3.899 | 75.190 | n/a | n/a | 0.115 | 11.498 | 0.482 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000001b7 | 86.406 | 7.122 | 0.009 | 0.000 | 0.506 | 1.152 | 2.037 | 0.092 | n/a | 0.219 | 75.190 | n/a | n/a | 0.079 | 7.636 | 0.088 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000198 | 57.006 | 6.152 | 0.401 | 0.000 | 0.126 | 2.135 | 30.322 | 0.060 | n/a | 0.098 | 17.637 | n/a | n/a | 0.074 | 6.679 | 0.117 | 0.074 | gw-w/thread-42/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000001a2 | 56.735 | 6.107 | 0.349 | 0.000 | 0.089 | 1.873 | 33.015 | 0.052 | n/a | 0.114 | 15.092 | n/a | n/a | 0.044 | 6.545 | 0.115 | 0.044 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe617000000000000018c | 54.671 | 4.400 | 0.296 | 0.000 | 0.077 | 1.803 | 37.045 | 0.106 | n/a | 0.141 | 10.752 | n/a | n/a | 0.051 | 4.774 | 0.087 | 0.051 | gw-w/thread-47/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000001c0 | 46.365 | 9.375 | 0.029 | 0.000 | 0.660 | 5.422 | 6.447 | 0.240 | n/a | 3.899 | 20.184 | n/a | n/a | 0.109 | 10.063 | 0.217 | 0.109 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001a6 | 44.935 | 6.234 | 0.233 | 0.000 | 0.131 | 2.135 | 23.179 | 0.057 | n/a | 0.143 | 12.717 | n/a | n/a | 0.106 | 6.597 | 0.147 | 0.106 | gw-w/thread-42/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000001ba | 43.912 | 7.622 | 0.322 | 0.000 | 0.071 | 2.127 | 13.294 | 0.179 | n/a | 0.608 | 19.647 | n/a | n/a | 0.041 | 8.016 | 0.183 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000194 | 43.690 | 6.742 | 0.299 | 0.000 | 0.128 | 3.272 | 13.736 | 0.104 | n/a | 0.278 | 19.051 | n/a | n/a | 0.081 | 7.169 | 0.164 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001b6 | 43.296 | 6.989 | 0.446 | 0.000 | 0.088 | 3.080 | 12.778 | 0.056 | n/a | 0.447 | 19.366 | n/a | n/a | 0.046 | 7.522 | 0.174 | 0.046 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000179 | 42.988 | 7.549 | 0.621 | 0.000 | 0.126 | 2.279 | 14.829 | 0.077 | n/a | 0.413 | 17.005 | n/a | n/a | 0.089 | 8.296 | 0.193 | 0.089 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001a0 | 42.564 | 8.696 | 0.212 | 0.000 | 0.088 | 2.493 | 11.227 | 0.096 | n/a | 0.159 | 19.545 | n/a | n/a | 0.047 | 8.996 | 0.211 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001be | 40.025 | 8.038 | 0.459 | 0.000 | 0.132 | 2.553 | 11.492 | 0.063 | n/a | 0.763 | 16.423 | n/a | n/a | 0.101 | 8.629 | 0.216 | 0.101 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000017d | 38.496 | 3.749 | 0.205 | 0.000 | 0.082 | 5.239 | 8.894 | 0.049 | n/a | 0.121 | 20.110 | n/a | n/a | 0.047 | 4.036 | 0.105 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001c2 | 37.382 | 4.439 | 0.370 | 0.000 | 0.253 | 1.444 | 6.360 | 0.044 | n/a | 0.378 | 23.978 | n/a | n/a | 0.115 | 5.063 | 0.135 | 0.115 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000019e | 35.638 | 5.156 | 0.401 | 0.000 | 0.077 | 1.815 | 14.256 | 0.053 | n/a | 0.177 | 13.643 | n/a | n/a | 0.060 | 5.635 | 0.158 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000019a | 35.482 | 6.155 | 0.318 | 0.000 | 0.127 | 2.118 | 17.568 | 0.047 | n/a | 0.152 | 8.909 | n/a | n/a | 0.089 | 6.599 | 0.186 | 0.089 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000001b2 | 33.109 | 4.208 | 0.317 | 0.000 | 0.150 | 2.200 | 9.208 | 0.134 | n/a | 0.698 | 16.103 | n/a | n/a | 0.091 | 4.675 | 0.141 | 0.091 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000182 | 32.732 | 4.116 | 0.283 | 0.000 | 0.128 | 1.826 | 10.487 | 0.113 | n/a | 1.225 | 14.475 | n/a | n/a | 0.080 | 4.527 | 0.138 | 0.080 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001ac | 32.157 | 4.858 | 0.317 | 0.000 | 0.071 | 3.781 | 14.966 | 0.046 | n/a | 0.109 | 7.953 | n/a | n/a | 0.056 | 5.246 | 0.163 | 0.056 | gw-w/thread-43/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000185 | 31.642 | 5.373 | 0.005 | 0.000 | 0.836 | 0.723 | 9.510 | 0.060 | n/a | 0.076 | 15.003 | n/a | n/a | 0.055 | 6.214 | 0.196 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.980 | 0.703 | 0.000 | 1.909 | 3.836 | 0.006 | 0.000 | 0.698 | 1.010 | 1.874 | 0.059 | n/a | 0.465 | 9.809 | n/a | n/a | 0.051 | 4.305 | 0.240 | 0.051 |
| p99 | 23.127 | 1.961 | 0.719 | 3.001 | 6.417 | 0.009 | 0.000 | 1.015 | 4.810 | 4.820 | 0.195 | n/a | 0.963 | 13.535 | n/a | n/a | 0.093 | 7.422 | 0.381 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe617000000000000017f | 23.127 | 4.337 | 0.007 | 0.000 | 0.556 | 1.207 | 4.820 | 0.047 | n/a | 0.139 | 11.963 | n/a | n/a | 0.051 | 4.900 | 0.212 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000017b | 20.592 | 3.439 | 0.005 | 0.000 | 0.734 | 0.751 | 1.566 | 0.051 | n/a | 0.465 | 13.535 | n/a | n/a | 0.045 | 4.178 | 0.203 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001c3 | 20.024 | 3.210 | 0.005 | 0.000 | 0.782 | 1.025 | 2.001 | 0.104 | n/a | 0.771 | 12.081 | n/a | n/a | 0.044 | 3.998 | 0.200 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000192 | 19.537 | 6.417 | 0.009 | 0.000 | 0.996 | 0.918 | 1.169 | 0.046 | n/a | 0.080 | 9.809 | n/a | n/a | 0.093 | 7.422 | 0.380 | 0.093 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001bb | 19.470 | 4.303 | 0.006 | 0.000 | 0.981 | 1.006 | 4.260 | 0.195 | n/a | 0.778 | 7.849 | n/a | n/a | 0.092 | 5.290 | 0.272 | 0.092 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000190 | 18.980 | 4.354 | 0.006 | 0.000 | 0.407 | 4.810 | 1.928 | 0.059 | n/a | 0.166 | 7.176 | n/a | n/a | 0.075 | 4.768 | 0.251 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001c5 | 18.085 | 3.163 | 0.006 | 0.000 | 0.283 | 1.195 | 1.874 | 0.099 | n/a | 0.821 | 10.566 | n/a | n/a | 0.078 | 3.452 | 0.191 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000018a | 17.900 | 3.836 | 0.005 | 0.000 | 0.464 | 0.657 | 1.120 | 0.038 | n/a | 0.299 | 11.437 | n/a | n/a | 0.045 | 4.305 | 0.241 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001a3 | 17.064 | 3.392 | 0.006 | 0.000 | 0.698 | 1.088 | 2.016 | 0.096 | n/a | 0.963 | 8.755 | n/a | n/a | 0.049 | 4.096 | 0.240 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001ae | 16.452 | 5.244 | 0.006 | 0.000 | 1.015 | 1.010 | 1.850 | 0.075 | n/a | 0.810 | 6.388 | n/a | n/a | 0.055 | 6.265 | 0.381 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.245 | 0.766 | 0.000 | 1.510 | 4.648 | 0.013 | 0.000 | 0.268 | 1.509 | 5.676 | 0.057 | n/a | 0.420 | 11.580 | n/a | n/a | 0.066 | 5.312 | 0.199 | 0.066 |
| p99 | 102.023 | 3.322 | 0.000 | 3.747 | 12.707 | 4.127 | 0.567 | 1.199 | 5.499 | 37.752 | 0.263 | n/a | 3.465 | 46.980 | n/a | n/a | 0.183 | 12.843 | 0.473 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000001ed | 102.023 | 12.707 | 0.013 | 0.000 | 0.123 | 3.935 | 37.752 | 0.169 | n/a | 0.297 | 46.980 | n/a | n/a | 0.048 | 12.843 | 0.126 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001d7 | 71.739 | 4.450 | 0.259 | 0.000 | 0.070 | 3.965 | 24.031 | 0.053 | n/a | 3.144 | 35.697 | n/a | n/a | 0.071 | 4.779 | 0.067 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000213 | 43.420 | 4.649 | 0.343 | 0.000 | 0.114 | 2.609 | 17.822 | 0.190 | n/a | 1.513 | 16.115 | n/a | n/a | 0.065 | 5.106 | 0.118 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000217 | 41.845 | 3.893 | 0.306 | 0.000 | 0.165 | 5.499 | 13.872 | 0.085 | n/a | 3.465 | 14.475 | n/a | n/a | 0.085 | 4.364 | 0.104 | 0.085 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000207 | 41.804 | 5.794 | 0.221 | 0.505 | 0.347 | 2.432 | 23.066 | 0.055 | n/a | 0.434 | 8.771 | n/a | n/a | 0.180 | 6.867 | 0.164 | 0.180 | gw-w/thread-47/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000001d5 | 37.645 | 4.541 | 0.396 | 0.000 | 0.134 | 1.942 | 15.291 | 0.096 | n/a | 0.827 | 14.235 | n/a | n/a | 0.183 | 5.071 | 0.135 | 0.183 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001eb | 36.327 | 5.542 | 0.316 | 0.541 | 0.150 | 2.573 | 13.839 | 0.102 | n/a | 1.014 | 12.175 | n/a | n/a | 0.075 | 6.549 | 0.180 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000020d | 35.747 | 4.114 | 0.315 | 0.000 | 0.123 | 1.341 | 9.478 | 0.053 | n/a | 0.448 | 19.787 | n/a | n/a | 0.088 | 4.552 | 0.127 | 0.088 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001ff | 34.992 | 5.520 | 4.127 | 0.567 | 0.268 | 1.911 | 9.816 | 0.045 | n/a | 0.365 | 12.233 | n/a | n/a | 0.140 | 10.482 | 0.300 | 0.140 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001df | 34.523 | 4.707 | 2.759 | 0.000 | 0.121 | 1.795 | 12.226 | 0.043 | n/a | 0.303 | 12.504 | n/a | n/a | 0.065 | 7.587 | 0.220 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.292ms |
| f7a146af1fdfe61700000000000001dc | 34.182 | 7.225 | 0.006 | 0.000 | 0.293 | 0.799 | 1.590 | 0.045 | n/a | 0.084 | 24.075 | n/a | n/a | 0.066 | 7.523 | 0.220 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001db | 33.797 | 5.741 | 0.314 | 0.000 | 0.212 | 1.953 | 13.616 | 0.120 | n/a | 0.582 | 11.179 | n/a | n/a | 0.079 | 6.268 | 0.185 | 0.079 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001f7 | 32.846 | 5.564 | 0.291 | 0.453 | 0.087 | 1.509 | 10.938 | 0.052 | n/a | 0.430 | 13.474 | n/a | n/a | 0.047 | 6.396 | 0.195 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000203 | 31.583 | 4.897 | 0.218 | 0.483 | 0.084 | 2.423 | 10.479 | 0.084 | n/a | 0.144 | 12.724 | n/a | n/a | 0.047 | 5.682 | 0.180 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001d1 | 31.206 | 5.312 | 0.003 | 0.000 | 0.882 | 3.063 | 2.274 | 0.059 | n/a | 0.129 | 19.456 | n/a | n/a | 0.027 | 6.197 | 0.199 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.193ms |
| f7a146af1fdfe61700000000000001f5 | 30.569 | 3.727 | 0.275 | 0.300 | 0.135 | 1.455 | 11.749 | 0.057 | n/a | 0.146 | 12.660 | n/a | n/a | 0.065 | 4.438 | 0.145 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001ce | 30.431 | 4.114 | 0.297 | 0.000 | 0.336 | 1.482 | 9.771 | 0.098 | n/a | 0.616 | 13.656 | n/a | n/a | 0.060 | 4.747 | 0.156 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001ef | 28.053 | 4.648 | 0.241 | 0.300 | 0.124 | 2.019 | 8.068 | 0.045 | n/a | 0.313 | 12.234 | n/a | n/a | 0.060 | 5.312 | 0.189 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000020b | 27.552 | 4.117 | 0.302 | 0.000 | 0.123 | 1.535 | 9.593 | 0.250 | n/a | 0.468 | 11.089 | n/a | n/a | 0.076 | 4.542 | 0.165 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001d0 | 27.394 | 3.994 | 0.009 | 0.000 | 1.000 | 1.213 | 4.678 | 0.154 | n/a | 1.279 | 15.001 | n/a | n/a | 0.064 | 5.004 | 0.183 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.262 | 0.933 | 0.000 | 1.784 | 4.129 | 0.008 | 0.000 | 0.640 | 1.003 | 1.840 | 0.050 | n/a | 0.277 | 8.756 | n/a | n/a | 0.059 | 4.653 | 0.234 | 0.059 |
| p99 | 27.394 | 2.147 | 0.000 | 2.163 | 5.336 | 0.012 | 0.000 | 1.199 | 4.551 | 5.724 | 0.154 | n/a | 2.705 | 16.866 | n/a | n/a | 0.104 | 6.544 | 0.473 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000001d0 | 27.394 | 3.994 | 0.009 | 0.000 | 1.000 | 1.213 | 4.678 | 0.154 | n/a | 1.279 | 15.001 | n/a | n/a | 0.064 | 5.004 | 0.183 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001e0 | 26.628 | 5.336 | 0.009 | 0.000 | 1.199 | 1.825 | 1.219 | 0.043 | n/a | 0.062 | 16.866 | n/a | n/a | 0.068 | 6.544 | 0.246 | 0.068 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000020e | 23.918 | 4.618 | 0.009 | 0.000 | 0.779 | 0.951 | 5.676 | 0.079 | n/a | 0.121 | 11.580 | n/a | n/a | 0.104 | 5.407 | 0.226 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001fc | 22.199 | 3.354 | 0.006 | 0.000 | 1.049 | 2.113 | 1.840 | 0.112 | n/a | 0.219 | 13.458 | n/a | n/a | 0.049 | 4.409 | 0.199 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001f2 | 21.495 | 3.623 | 0.007 | 0.000 | 0.445 | 1.003 | 5.125 | 0.122 | n/a | 2.705 | 8.419 | n/a | n/a | 0.045 | 4.075 | 0.190 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001e7 | 20.873 | 3.566 | 0.006 | 0.000 | 0.932 | 4.551 | 1.262 | 0.050 | n/a | 0.146 | 10.316 | n/a | n/a | 0.044 | 4.504 | 0.216 | 0.044 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001cc | 19.869 | 4.496 | 0.006 | 0.000 | 0.150 | 1.377 | 2.563 | 0.126 | n/a | 0.222 | 10.882 | n/a | n/a | 0.046 | 4.653 | 0.234 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001e2 | 19.262 | 3.143 | 0.006 | 0.000 | 0.497 | 0.701 | 5.724 | 0.038 | n/a | 0.085 | 9.017 | n/a | n/a | 0.051 | 3.646 | 0.189 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001d9 | 17.688 | 4.260 | 0.006 | 0.000 | 0.447 | 0.979 | 3.115 | 0.043 | n/a | 0.874 | 7.900 | n/a | n/a | 0.065 | 4.713 | 0.266 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000218 | 16.479 | 5.010 | 0.010 | 0.000 | 1.057 | 1.067 | 1.396 | 0.039 | n/a | 0.796 | 7.034 | n/a | n/a | 0.069 | 6.077 | 0.369 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000200 | 16.465 | 5.123 | 0.010 | 0.000 | 0.640 | 0.956 | 1.060 | 0.043 | n/a | 0.104 | 8.447 | n/a | n/a | 0.083 | 5.773 | 0.351 | 0.083 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001c9 | 15.683 | 3.154 | 0.006 | 0.000 | 0.446 | 0.959 | 1.926 | 0.108 | n/a | 0.277 | 8.756 | n/a | n/a | 0.052 | 3.605 | 0.230 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000208 | 15.142 | 3.624 | 0.008 | 0.000 | 0.572 | 1.070 | 1.279 | 0.050 | n/a | 0.416 | 8.071 | n/a | n/a | 0.052 | 4.204 | 0.278 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000204 | 13.754 | 4.129 | 0.009 | 0.000 | 0.223 | 0.750 | 1.253 | 0.038 | n/a | 0.512 | 6.780 | n/a | n/a | 0.059 | 4.362 | 0.317 | 0.059 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000001e5 | 12.749 | 4.875 | 0.012 | 0.000 | 1.137 | 0.886 | 1.125 | 0.043 | n/a | 0.460 | 4.114 | n/a | n/a | 0.095 | 6.024 | 0.473 | 0.095 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.224 | 0.779 | 0.000 | 1.554 | 5.594 | 0.011 | 0.000 | 0.329 | 1.463 | 3.419 | 0.068 | n/a | 0.345 | 12.550 | n/a | n/a | 0.067 | 6.204 | 0.225 | 0.067 |
| p99 | 120.844 | 3.443 | 0.000 | 4.490 | 12.893 | 0.871 | 0.000 | 1.388 | 5.324 | 72.802 | 3.259 | n/a | 8.311 | 52.663 | n/a | n/a | 0.185 | 13.497 | 0.469 | 0.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe6170000000000000243 | 120.844 | 12.893 | 0.356 | 0.000 | 0.134 | 2.121 | 72.802 | 0.078 | n/a | 3.731 | 28.609 | n/a | n/a | 0.120 | 13.383 | 0.111 | 0.120 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe617000000000000024b | 68.230 | 5.685 | 0.455 | 0.000 | 0.069 | 2.840 | 49.565 | 0.057 | n/a | 0.507 | 8.988 | n/a | n/a | 0.063 | 6.209 | 0.091 | 0.063 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000239 | 66.626 | 8.789 | 0.021 | 0.000 | 0.644 | 1.595 | 2.063 | 0.063 | n/a | 0.687 | 52.663 | n/a | n/a | 0.101 | 9.454 | 0.142 | 0.101 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000259 | 64.238 | 3.635 | 0.217 | 0.000 | 0.082 | 1.555 | 41.567 | 0.128 | n/a | 0.170 | 16.834 | n/a | n/a | 0.049 | 3.935 | 0.061 | 0.049 | gw-w/thread-47/gateway.admitted-work | driver.publication 1.535ms; driver.publication 1.172ms |
| f7a146af1fdfe617000000000000023b | 58.113 | 5.054 | 0.234 | 0.000 | 0.064 | 1.884 | 14.679 | 3.259 | n/a | 0.244 | 32.611 | n/a | n/a | 0.084 | 5.353 | 0.092 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000022f | 56.752 | 6.636 | 0.355 | 0.000 | 0.158 | 3.169 | 20.370 | 0.124 | n/a | 0.940 | 24.920 | n/a | n/a | 0.079 | 7.149 | 0.126 | 0.079 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000231 | 54.035 | 6.818 | 0.349 | 0.000 | 0.135 | 1.715 | 20.737 | 0.121 | n/a | 0.871 | 23.184 | n/a | n/a | 0.105 | 7.302 | 0.135 | 0.105 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000026d | 45.391 | 5.892 | 0.871 | 0.000 | 0.016 | 2.141 | 20.797 | 0.098 | n/a | 0.862 | 14.672 | n/a | n/a | 0.042 | 6.779 | 0.149 | 0.042 | gw-w/thread-40/gateway.admitted-work | driver.publication 1.292ms |
| f7a146af1fdfe6170000000000000237 | 43.476 | 12.688 | 0.631 | 0.000 | 0.178 | 3.498 | 9.186 | 0.086 | n/a | 3.563 | 13.529 | n/a | n/a | 0.119 | 13.497 | 0.310 | 0.119 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000023f | 42.695 | 6.708 | 0.392 | 0.000 | 0.398 | 2.682 | 17.183 | 0.100 | n/a | 1.769 | 13.278 | n/a | n/a | 0.185 | 7.498 | 0.176 | 0.185 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000241 | 42.688 | 6.163 | 0.657 | 0.000 | 0.098 | 2.409 | 11.035 | 0.093 | n/a | 1.659 | 20.448 | n/a | n/a | 0.126 | 6.918 | 0.162 | 0.126 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000021e | 41.024 | 6.723 | 0.528 | 0.000 | 0.116 | 2.494 | 14.862 | 0.086 | n/a | 0.826 | 15.315 | n/a | n/a | 0.075 | 7.366 | 0.180 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000268 | 40.766 | 3.921 | 0.279 | 0.000 | 0.136 | 5.324 | 20.674 | 0.130 | n/a | 0.345 | 9.876 | n/a | n/a | 0.082 | 4.335 | 0.106 | 0.082 | gw-w/thread-47/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000246 | 37.692 | 4.308 | 0.005 | 0.000 | 1.388 | 0.695 | 6.581 | 0.041 | n/a | 4.002 | 20.635 | n/a | n/a | 0.038 | 5.700 | 0.151 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.165ms |
| f7a146af1fdfe617000000000000025a | 37.392 | 6.292 | 0.014 | 0.000 | 0.794 | 1.779 | 2.996 | 0.082 | n/a | 8.311 | 17.092 | n/a | n/a | 0.031 | 7.100 | 0.190 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000229 | 36.793 | 4.031 | 0.246 | 0.000 | 0.058 | 1.529 | 13.745 | 0.081 | n/a | 0.165 | 16.882 | n/a | n/a | 0.056 | 4.335 | 0.118 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000021b | 35.711 | 5.705 | 0.472 | 0.000 | 0.081 | 1.578 | 8.715 | 0.059 | n/a | 0.425 | 18.597 | n/a | n/a | 0.080 | 6.258 | 0.175 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000264 | 35.613 | 6.019 | 0.008 | 0.000 | 0.846 | 2.333 | 22.307 | 0.096 | n/a | 0.694 | 3.223 | n/a | n/a | 0.087 | 6.874 | 0.193 | 0.087 | gw-w/thread-44/storage/begin-command! | none observed |
| f7a146af1fdfe6170000000000000256 | 35.280 | 11.792 | 0.007 | 0.000 | 0.794 | 1.066 | 3.001 | 0.053 | n/a | 1.589 | 16.906 | n/a | n/a | 0.073 | 12.593 | 0.357 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000235 | 32.729 | 5.411 | 0.007 | 0.000 | 0.771 | 1.200 | 2.951 | 0.242 | n/a | 2.030 | 20.045 | n/a | n/a | 0.072 | 6.188 | 0.189 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.761 | 0.630 | 0.000 | 1.821 | 4.308 | 0.006 | 0.000 | 0.794 | 0.839 | 2.291 | 0.052 | n/a | 0.337 | 8.746 | n/a | n/a | 0.049 | 5.116 | 0.243 | 0.049 |
| p99 | 37.692 | 1.804 | 0.000 | 3.220 | 6.292 | 0.015 | 0.000 | 1.388 | 2.333 | 22.307 | 0.131 | n/a | 8.311 | 20.635 | n/a | n/a | 0.087 | 7.100 | 0.416 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe6170000000000000246 | 37.692 | 4.308 | 0.005 | 0.000 | 1.388 | 0.695 | 6.581 | 0.041 | n/a | 4.002 | 20.635 | n/a | n/a | 0.038 | 5.700 | 0.151 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.165ms |
| f7a146af1fdfe617000000000000025a | 37.392 | 6.292 | 0.014 | 0.000 | 0.794 | 1.779 | 2.996 | 0.082 | n/a | 8.311 | 17.092 | n/a | n/a | 0.031 | 7.100 | 0.190 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000264 | 35.613 | 6.019 | 0.008 | 0.000 | 0.846 | 2.333 | 22.307 | 0.096 | n/a | 0.694 | 3.223 | n/a | n/a | 0.087 | 6.874 | 0.193 | 0.087 | gw-w/thread-44/storage/begin-command! | none observed |
| f7a146af1fdfe6170000000000000232 | 26.984 | 5.385 | 0.012 | 0.000 | 0.868 | 1.127 | 2.333 | 0.121 | n/a | 0.966 | 16.122 | n/a | n/a | 0.049 | 6.265 | 0.232 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000023c | 23.587 | 6.002 | 0.011 | 0.000 | 0.755 | 1.177 | 4.936 | 0.042 | n/a | 0.094 | 10.487 | n/a | n/a | 0.083 | 6.769 | 0.287 | 0.083 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000022a | 21.551 | 3.283 | 0.005 | 0.000 | 0.722 | 0.693 | 2.291 | 0.039 | n/a | 0.080 | 14.394 | n/a | n/a | 0.043 | 4.011 | 0.186 | 0.043 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000025b | 20.282 | 4.779 | 0.009 | 0.000 | 0.329 | 0.541 | 1.637 | 0.052 | n/a | 0.128 | 12.747 | n/a | n/a | 0.061 | 5.116 | 0.252 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.535ms |
| f7a146af1fdfe617000000000000024f | 18.775 | 4.471 | 0.010 | 0.000 | 0.908 | 1.463 | 2.305 | 0.087 | n/a | 2.827 | 6.626 | n/a | n/a | 0.079 | 5.389 | 0.287 | 0.079 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000026a | 18.761 | 5.594 | 0.006 | 0.000 | 0.586 | 1.355 | 5.304 | 0.056 | n/a | 1.173 | 4.632 | n/a | n/a | 0.055 | 6.187 | 0.330 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000221 | 18.493 | 3.281 | 0.006 | 0.000 | 0.951 | 1.004 | 2.029 | 0.131 | n/a | 0.337 | 10.711 | n/a | n/a | 0.043 | 4.238 | 0.229 | 0.043 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000226 | 17.629 | 3.234 | 0.005 | 0.000 | 1.045 | 0.620 | 1.060 | 0.034 | n/a | 0.139 | 11.452 | n/a | n/a | 0.039 | 4.284 | 0.243 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000278 | 16.662 | 4.127 | 0.006 | 0.000 | 0.946 | 0.839 | 1.477 | 0.042 | n/a | 0.487 | 8.678 | n/a | n/a | 0.060 | 5.078 | 0.305 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000027c | 14.967 | 2.895 | 0.005 | 0.000 | 0.690 | 0.736 | 1.658 | 0.066 | n/a | 0.125 | 8.746 | n/a | n/a | 0.046 | 3.589 | 0.240 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000021d | 14.428 | 5.499 | 0.015 | 0.000 | 0.235 | 1.726 | 3.313 | 0.073 | n/a | 0.344 | 3.139 | n/a | n/a | 0.083 | 5.749 | 0.398 | 0.083 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000271 | 10.510 | 3.497 | 0.005 | 0.000 | 0.695 | 0.578 | 1.144 | 0.035 | n/a | 0.162 | 4.345 | n/a | n/a | 0.049 | 4.198 | 0.399 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000260 | 9.337 | 2.850 | 0.005 | 0.000 | 1.026 | 0.671 | 0.950 | 0.034 | n/a | 0.094 | 3.666 | n/a | n/a | 0.041 | 3.882 | 0.416 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.393 | 0.585 | 0.000 | 1.441 | 4.691 | 0.015 | 0.000 | 0.303 | 1.392 | 3.846 | 0.048 | n/a | 0.193 | 10.184 | n/a | n/a | 0.061 | 5.120 | 0.245 | 0.061 |
| p99 | 101.587 | 2.986 | 3.004 | 11.162 | 13.048 | n/a | 0.000 | 1.188 | 4.064 | 34.654 | 0.124 | n/a | 3.380 | 82.764 | n/a | n/a | 0.148 | 13.905 | 0.475 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000002a9 | 101.587 | 4.806 | 0.372 | 0.000 | 0.074 | 1.714 | 11.593 | 0.049 | n/a | 0.137 | 82.764 | n/a | n/a | 0.078 | 5.252 | 0.052 | 0.078 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002af | 56.704 | 7.927 | 0.446 | 0.000 | 0.304 | 1.392 | 34.654 | 0.039 | n/a | 0.116 | 11.707 | n/a | n/a | 0.119 | 8.677 | 0.153 | 0.119 | gw-w/thread-43/gateway.admitted-work | none observed |
| f7a146af1fdfe6170000000000000297 | 54.221 | 4.981 | 0.326 | 0.000 | 0.111 | 2.456 | 25.668 | 0.108 | n/a | 0.126 | 20.385 | n/a | n/a | 0.060 | 5.418 | 0.100 | 0.060 | gw-w/thread-46/gateway.admitted-work | none observed |
| f7a146af1fdfe617000000000000027f | 50.546 | 4.162 | 0.644 | 0.000 | 0.054 | 1.495 | 20.166 | 0.048 | n/a | 0.090 | 23.836 | n/a | n/a | 0.052 | 4.860 | 0.096 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.339ms |
| f7a146af1fdfe617000000000000028f | 41.230 | 4.227 | 0.237 | 0.000 | 0.114 | 1.721 | 13.612 | 0.124 | n/a | 0.206 | 20.920 | n/a | n/a | 0.069 | 4.577 | 0.111 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002d2 | 36.411 | 3.930 | 0.338 | 0.000 | 0.109 | 1.405 | 13.028 | 0.067 | n/a | 0.213 | 17.248 | n/a | n/a | 0.074 | 4.377 | 0.120 | 0.074 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002a1 | 35.813 | 5.754 | 0.311 | 0.000 | 0.257 | 1.788 | 13.948 | 0.065 | n/a | 0.407 | 13.207 | n/a | n/a | 0.076 | 6.322 | 0.177 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000289 | 33.261 | 6.768 | 0.249 | 0.000 | 0.073 | 1.957 | 17.857 | 0.083 | n/a | 0.209 | 6.020 | n/a | n/a | 0.045 | 7.090 | 0.213 | 0.045 | gw-w/thread-45/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000002b1 | 33.023 | 4.691 | 0.435 | 0.000 | 0.218 | 2.452 | 14.850 | 0.077 | n/a | 0.176 | 10.048 | n/a | n/a | 0.075 | 5.344 | 0.162 | 0.075 | gw-w/thread-46/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000002b5 | 32.640 | 4.835 | 0.176 | 0.000 | 0.102 | 1.820 | 14.368 | 0.038 | n/a | 0.105 | 11.145 | n/a | n/a | 0.051 | 5.113 | 0.157 | 0.051 | gw-w/thread-47/gateway.admitted-work | none observed |
| f7a146af1fdfe61700000000000002b9 | 31.727 | 5.636 | 0.318 | 0.000 | 0.088 | 1.828 | 10.275 | 0.043 | n/a | 3.224 | 10.226 | n/a | n/a | 0.088 | 6.042 | 0.190 | 0.088 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000295 | 31.697 | 4.169 | 0.274 | 0.000 | 0.095 | 1.930 | 13.466 | 0.039 | n/a | 0.135 | 11.520 | n/a | n/a | 0.069 | 4.538 | 0.143 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002cd | 29.869 | 4.699 | 0.249 | 0.000 | 0.102 | 2.447 | 10.915 | 0.051 | n/a | 0.488 | 10.860 | n/a | n/a | 0.059 | 5.050 | 0.169 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.735ms; driver.publication 1.473ms |
| f7a146af1fdfe6170000000000000284 | 29.691 | 4.312 | 0.319 | 0.000 | 0.123 | 1.784 | 11.161 | 0.040 | n/a | 0.350 | 11.543 | n/a | n/a | 0.060 | 4.753 | 0.160 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000029a | 29.287 | 13.048 | 0.006 | 0.000 | 0.851 | 4.064 | 1.889 | 0.077 | n/a | 3.380 | 5.920 | n/a | n/a | 0.051 | 13.905 | 0.475 | 0.051 | node-13/thread-0/driver.publication | none observed |
| f7a146af1fdfe617000000000000028a | 29.215 | 8.604 | 0.012 | 0.000 | 0.563 | 0.839 | 3.846 | 0.037 | n/a | 0.268 | 14.898 | n/a | n/a | 0.148 | 9.179 | 0.314 | 0.148 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002bd | 27.877 | 4.053 | 0.303 | 0.000 | 0.116 | 1.683 | 8.938 | 0.098 | n/a | 0.167 | 12.424 | n/a | n/a | 0.095 | 4.472 | 0.160 | 0.095 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000029d | 26.900 | 4.510 | 0.224 | 0.000 | 0.072 | 1.382 | 8.042 | 0.082 | n/a | 0.762 | 11.772 | n/a | n/a | 0.055 | 4.806 | 0.179 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002a5 | 26.622 | 3.701 | 0.359 | 0.000 | 0.108 | 1.752 | 10.155 | 0.040 | n/a | 0.100 | 10.345 | n/a | n/a | 0.061 | 4.168 | 0.157 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002c7 | 24.063 | 3.418 | 0.177 | 0.000 | 0.082 | 1.396 | 7.648 | 0.054 | n/a | 0.380 | 10.821 | n/a | n/a | 0.086 | 3.677 | 0.153 | 0.086 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.904 | 0.875 | 0.000 | 1.977 | 4.489 | 0.007 | 0.000 | 0.668 | 0.820 | 1.441 | 0.040 | n/a | 0.122 | 6.905 | n/a | n/a | 0.069 | 5.261 | 0.307 | 0.069 |
| p99 | 29.287 | 2.123 | 3.004 | 11.162 | 13.048 | n/a | 0.000 | 1.188 | 4.064 | 11.150 | 0.112 | n/a | 3.380 | 12.236 | n/a | n/a | 0.145 | 13.905 | 0.475 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe617000000000000029a | 29.287 | 13.048 | 0.006 | 0.000 | 0.851 | 4.064 | 1.889 | 0.077 | n/a | 3.380 | 5.920 | n/a | n/a | 0.051 | 13.905 | 0.475 | 0.051 | node-13/thread-0/driver.publication | none observed |
| f7a146af1fdfe61700000000000002ba | 22.058 | 6.162 | 0.010 | 0.000 | 0.598 | 1.397 | 1.292 | 0.040 | n/a | 0.405 | 12.079 | n/a | n/a | 0.075 | 6.770 | 0.307 | 0.075 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002b7 | 20.589 | 4.739 | 0.008 | 0.000 | 0.373 | 0.950 | 2.072 | 0.037 | n/a | 0.108 | 12.236 | n/a | n/a | 0.066 | 5.120 | 0.249 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002aa | 19.610 | 8.591 | 0.008 | 0.000 | 0.463 | 1.056 | 1.833 | 0.067 | n/a | 0.651 | 6.817 | n/a | n/a | 0.125 | 9.061 | 0.462 | 0.125 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000027e | 18.678 | 4.401 | 0.006 | 0.000 | 0.854 | 0.700 | 4.737 | 0.032 | n/a | 0.102 | 7.731 | n/a | n/a | 0.114 | 5.261 | 0.282 | 0.114 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002b3 | 18.281 | 4.163 | 0.006 | 0.000 | 0.303 | 0.820 | 2.813 | 0.040 | n/a | 0.118 | 9.950 | n/a | n/a | 0.069 | 4.471 | 0.245 | 0.069 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002be | 18.045 | 5.263 | 0.012 | 0.000 | 0.485 | 0.820 | 0.998 | 0.037 | n/a | 0.100 | 10.184 | n/a | n/a | 0.145 | 5.760 | 0.319 | 0.145 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe617000000000000029f | 17.904 | 5.476 | 0.015 | 0.000 | 1.188 | 1.297 | 1.988 | 0.112 | n/a | 0.798 | 6.886 | n/a | n/a | 0.144 | 6.679 | 0.373 | 0.144 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002a2 | 16.012 | 3.021 | 0.006 | 0.000 | 1.053 | 0.604 | 1.441 | 0.067 | n/a | 0.234 | 9.541 | n/a | n/a | 0.045 | 4.080 | 0.255 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002c9 | 15.583 | 1.942 | n/a | 0.000 | 0.966 | 1.409 | 11.150 | 0.020 | n/a | 0.044 | 0.000 | n/a | n/a | 0.052 | 2.908 | 0.187 | 0.052 | gw-w/thread-45/gateway /v1/db/{db}/release | none observed |
| f7a146af1fdfe61700000000000002c4 | 15.131 | 4.008 | 0.006 | 0.000 | 0.554 | 0.743 | 1.287 | 0.046 | n/a | 0.109 | 8.322 | n/a | n/a | 0.056 | 4.568 | 0.302 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000298 | 14.595 | 4.936 | 0.007 | 0.000 | 0.668 | 0.745 | 1.092 | 0.033 | n/a | 0.122 | 6.905 | n/a | n/a | 0.088 | 5.611 | 0.384 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000290 | 14.470 | 3.559 | 0.005 | 0.000 | 0.541 | 0.861 | 1.163 | 0.038 | n/a | 1.581 | 6.683 | n/a | n/a | 0.039 | 4.105 | 0.284 | 0.039 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000000282 | 13.654 | 4.489 | 0.008 | 0.000 | 1.050 | 0.678 | 0.993 | 0.057 | n/a | 0.481 | 5.798 | n/a | n/a | 0.099 | 5.548 | 0.406 | 0.099 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000002c2 | 10.063 | 2.941 | 0.004 | 0.000 | 1.059 | 0.592 | 0.891 | 0.032 | n/a | 0.096 | 4.419 | n/a | n/a | 0.029 | 4.004 | 0.398 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.208 | 0.976 | 0.000 | 1.805 | 4.149 | 0.005 | 0.000 | 0.891 | 1.166 | 1.463 | 0.041 | n/a | 0.189 | 8.439 | n/a | n/a | 0.044 | 5.461 | 0.310 | 0.044 |
| p99 | 160.967 | 3.887 | 1.668 | 9.671 | 20.100 | 3.215 | 0.000 | 72.187 | 31.802 | 46.098 | 9.338 | n/a | 4.581 | 68.532 | n/a | n/a | 0.157 | 78.092 | 0.790 | 0.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000003e7 | 256.761 | 11.517 | 0.408 | 0.000 | 0.127 | 64.418 | 90.005 | 12.410 | n/a | 8.231 | 69.541 | n/a | n/a | 0.104 | 12.052 | 0.047 | 0.104 | node-13/thread-5/socket.wait-first-byte | driver.publication 4.476ms; driver.publication 2.962ms; driver.publication 1.481ms; driver.publication 1.450ms; driver.publication 1.324ms |
| f7a146af1fdfe61700000000000003f0 | 244.060 | 14.548 | 0.402 | 0.000 | 1.520 | 35.026 | 95.316 | 0.130 | n/a | 9.344 | 87.712 | n/a | n/a | 0.063 | 16.470 | 0.067 | 0.063 | gw-w/thread-45/gateway.request-parse | driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms; driver.publication 1.558ms |
| f7a146af1fdfe61700000000000003f1 | 225.437 | 8.924 | 0.015 | 0.000 | 1.093 | 37.637 | 50.434 | 34.808 | n/a | 0.473 | 92.003 | n/a | n/a | 0.050 | 10.032 | 0.045 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms |
| f7a146af1fdfe61700000000000003e6 | 202.414 | 18.375 | 0.015 | 0.000 | 0.638 | 52.896 | 94.344 | 0.326 | n/a | 4.125 | 31.651 | n/a | n/a | 0.044 | 19.028 | 0.094 | 0.044 | gw-w/thread-47/gateway.admitted-work | driver.publication 4.476ms; driver.publication 1.450ms |
| f7a146af1fdfe61700000000000003f3 | 180.636 | 5.192 | 0.015 | 0.000 | 75.281 | 18.970 | 2.205 | 0.111 | n/a | 0.163 | 78.655 | n/a | n/a | 0.045 | 80.488 | 0.446 | 0.045 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms; driver.expected-state.bind-receipt 1.551ms |
| f7a146af1fdfe6170000000000000401 | 174.472 | 3.637 | 0.006 | 0.000 | 155.670 | 2.444 | 2.012 | 0.059 | n/a | 2.289 | 8.316 | n/a | n/a | 0.040 | 159.312 | 0.913 | 0.040 | node-13/thread-0/driver.queue.subject | driver.publication 5.132ms; driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 2.196ms; driver.publication 1.896ms |
| f7a146af1fdfe61700000000000003ed | 165.781 | 7.503 | 0.013 | 0.000 | 4.930 | 5.605 | 111.370 | 0.034 | n/a | 0.104 | 36.178 | n/a | n/a | 0.044 | 12.447 | 0.075 | 0.044 | gw-w/thread-42/commit.prepare-and-validate | driver.publication 3.991ms; driver.expected-state.bind-receipt 1.176ms; driver.publication 1.099ms |
| f7a146af1fdfe6170000000000000400 | 165.025 | 7.685 | 0.008 | 2.268 | 96.795 | 3.026 | 29.980 | 0.109 | n/a | 0.229 | 24.884 | n/a | n/a | 0.040 | 106.756 | 0.647 | 0.040 | node-13/thread-0/driver.queue.subject | driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 2.196ms; driver.publication 1.896ms; driver.publication 1.666ms |
| f7a146af1fdfe61700000000000003eb | 160.967 | 5.797 | 0.021 | 0.000 | 1.122 | 2.001 | 80.393 | 0.194 | n/a | 40.598 | 30.753 | n/a | n/a | 0.089 | 6.940 | 0.043 | 0.089 | gw-w/thread-44/commit.prepare-and-validate | driver.publication 4.476ms |
| f7a146af1fdfe61700000000000003ee | 150.517 | 8.964 | 0.008 | 0.000 | 1.019 | 3.372 | 94.131 | 1.389 | n/a | 0.037 | 41.519 | n/a | n/a | 0.078 | 9.992 | 0.066 | 0.078 | gw-w/thread-65/commit.prepare-and-validate | driver.expected-state.bind-receipt 1.176ms; driver.publication 1.175ms; driver.publication 1.099ms |
| f7a146af1fdfe61700000000000003ef | 141.784 | 7.940 | 0.018 | 0.000 | 1.092 | 35.014 | 46.098 | 0.015 | n/a | 0.021 | 51.509 | n/a | n/a | 0.078 | 9.049 | 0.064 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms; driver.publication 1.175ms; driver.publication 1.099ms; driver.expected-state.bind-receipt 1.070ms |
| f7a146af1fdfe61700000000000005d0 | 129.200 | 4.359 | 0.008 | 0.000 | 96.493 | 0.767 | 5.397 | 0.087 | n/a | 0.213 | 21.823 | n/a | n/a | 0.052 | 100.860 | 0.781 | 0.052 | node-13/thread-0/driver.queue.subject | driver.publication 8.082ms; driver.publication 5.330ms; driver.publication 3.313ms; driver.publication 2.242ms; driver.publication 2.022ms |
| f7a146af1fdfe61700000000000003fc | 126.599 | 6.022 | 0.010 | 0.000 | 69.213 | 15.615 | 2.518 | 0.088 | n/a | 0.153 | 32.900 | n/a | n/a | 0.081 | 75.245 | 0.594 | 0.081 | node-13/thread-0/driver.queue.subject | driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms |
| f7a146af1fdfe61700000000000003f4 | 126.065 | 12.020 | 0.007 | 0.000 | 0.770 | 35.015 | 0.874 | 9.338 | n/a | 0.056 | 67.917 | n/a | n/a | 0.068 | 12.797 | 0.102 | 0.068 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.666ms; driver.publication 1.481ms; driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms; driver.publication 1.175ms |
| f7a146af1fdfe61700000000000003f6 | 124.816 | 8.787 | 6.682 | 0.000 | 1.725 | 17.548 | 6.910 | 0.041 | n/a | 1.358 | 81.713 | n/a | n/a | 0.051 | 17.195 | 0.138 | 0.051 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.666ms; driver.publication 1.481ms; driver.publication 1.453ms; driver.publication 1.324ms |
| f7a146af1fdfe6170000000000000402 | 124.528 | 4.331 | 0.007 | 0.000 | 78.380 | 0.918 | 1.419 | 0.063 | n/a | 0.563 | 38.774 | n/a | n/a | 0.073 | 82.718 | 0.664 | 0.073 | node-13/thread-0/driver.queue.subject | driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.publication 1.574ms |
| f7a146af1fdfe61700000000000003f7 | 120.856 | 4.357 | 3.802 | 0.000 | 0.655 | 4.825 | 1.510 | 12.070 | n/a | 2.148 | 91.445 | n/a | n/a | 0.045 | 8.813 | 0.073 | 0.045 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms; driver.publication 1.501ms; driver.publication 1.481ms |
| f7a146af1fdfe61700000000000003f5 | 113.368 | 4.551 | 0.010 | 0.000 | 0.862 | 27.524 | 0.745 | 10.952 | n/a | 0.056 | 68.532 | n/a | n/a | 0.137 | 5.423 | 0.048 | 0.137 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.666ms; driver.publication 1.481ms; driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms |
| f7a146af1fdfe61700000000000003f2 | 112.657 | 5.364 | 0.010 | 0.000 | 1.141 | 37.766 | 0.760 | 9.767 | n/a | 0.171 | 57.576 | n/a | n/a | 0.100 | 6.516 | 0.058 | 0.100 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.481ms; driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms; driver.publication 1.175ms; driver.publication 1.099ms |
| f7a146af1fdfe61700000000000005cf | 108.380 | 17.701 | 3.215 | 0.000 | 8.742 | 16.501 | 15.763 | 0.085 | n/a | 0.322 | 46.004 | n/a | n/a | 0.045 | 29.658 | 0.274 | 0.045 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 5.330ms; driver.publication 2.242ms; driver.expected-state.bind-receipt 1.916ms; driver.publication 1.695ms; driver.publication 1.050ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.616 | 0.798 | 0.000 | 1.616 | 3.606 | 0.005 | 0.000 | 0.957 | 1.068 | 1.248 | 0.039 | n/a | 0.171 | 7.925 | n/a | n/a | 0.044 | 4.804 | 0.309 | 0.044 |
| p99 | 141.784 | 4.067 | 1.366 | 9.177 | 19.824 | 2.290 | 0.000 | 76.036 | 35.014 | 16.040 | 8.830 | n/a | 4.581 | 63.909 | n/a | n/a | 0.155 | 81.508 | 0.844 | 0.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000003f0 | 244.060 | 14.548 | 0.402 | 0.000 | 1.520 | 35.026 | 95.316 | 0.130 | n/a | 9.344 | 87.712 | n/a | n/a | 0.063 | 16.470 | 0.067 | 0.063 | gw-w/thread-45/gateway.request-parse | driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms; driver.publication 1.558ms |
| f7a146af1fdfe61700000000000003e6 | 202.414 | 18.375 | 0.015 | 0.000 | 0.638 | 52.896 | 94.344 | 0.326 | n/a | 4.125 | 31.651 | n/a | n/a | 0.044 | 19.028 | 0.094 | 0.044 | gw-w/thread-47/gateway.admitted-work | driver.publication 4.476ms; driver.publication 1.450ms |
| f7a146af1fdfe61700000000000003f3 | 180.636 | 5.192 | 0.015 | 0.000 | 75.281 | 18.970 | 2.205 | 0.111 | n/a | 0.163 | 78.655 | n/a | n/a | 0.045 | 80.488 | 0.446 | 0.045 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms; driver.expected-state.bind-receipt 1.551ms |
| f7a146af1fdfe6170000000000000401 | 174.472 | 3.637 | 0.006 | 0.000 | 155.670 | 2.444 | 2.012 | 0.059 | n/a | 2.289 | 8.316 | n/a | n/a | 0.040 | 159.312 | 0.913 | 0.040 | node-13/thread-0/driver.queue.subject | driver.publication 5.132ms; driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 2.196ms; driver.publication 1.896ms |
| f7a146af1fdfe61700000000000003ef | 141.784 | 7.940 | 0.018 | 0.000 | 1.092 | 35.014 | 46.098 | 0.015 | n/a | 0.021 | 51.509 | n/a | n/a | 0.078 | 9.049 | 0.064 | 0.078 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms; driver.publication 1.175ms; driver.publication 1.099ms; driver.expected-state.bind-receipt 1.070ms |
| f7a146af1fdfe61700000000000005d0 | 129.200 | 4.359 | 0.008 | 0.000 | 96.493 | 0.767 | 5.397 | 0.087 | n/a | 0.213 | 21.823 | n/a | n/a | 0.052 | 100.860 | 0.781 | 0.052 | node-13/thread-0/driver.queue.subject | driver.publication 8.082ms; driver.publication 5.330ms; driver.publication 3.313ms; driver.publication 2.242ms; driver.publication 2.022ms |
| f7a146af1fdfe6170000000000000402 | 124.528 | 4.331 | 0.007 | 0.000 | 78.380 | 0.918 | 1.419 | 0.063 | n/a | 0.563 | 38.774 | n/a | n/a | 0.073 | 82.718 | 0.664 | 0.073 | node-13/thread-0/driver.queue.subject | driver.publication 4.436ms; driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.publication 1.574ms |
| f7a146af1fdfe61700000000000003f5 | 113.368 | 4.551 | 0.010 | 0.000 | 0.862 | 27.524 | 0.745 | 10.952 | n/a | 0.056 | 68.532 | n/a | n/a | 0.137 | 5.423 | 0.048 | 0.137 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.666ms; driver.publication 1.481ms; driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms |
| f7a146af1fdfe61700000000000003f2 | 112.657 | 5.364 | 0.010 | 0.000 | 1.141 | 37.766 | 0.760 | 9.767 | n/a | 0.171 | 57.576 | n/a | n/a | 0.100 | 6.516 | 0.058 | 0.100 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.481ms; driver.publication 1.324ms; driver.expected-state.bind-receipt 1.176ms; driver.publication 1.175ms; driver.publication 1.099ms |
| f7a146af1fdfe61700000000000005cf | 108.380 | 17.701 | 3.215 | 0.000 | 8.742 | 16.501 | 15.763 | 0.085 | n/a | 0.322 | 46.004 | n/a | n/a | 0.045 | 29.658 | 0.274 | 0.045 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 5.330ms; driver.publication 2.242ms; driver.expected-state.bind-receipt 1.916ms; driver.publication 1.695ms; driver.publication 1.050ms |
| f7a146af1fdfe61700000000000007a4 | 102.852 | 3.544 | 0.004 | 0.000 | 72.187 | 2.229 | 3.566 | 0.651 | n/a | 0.078 | 20.545 | n/a | n/a | 0.049 | 75.735 | 0.736 | 0.049 | node-13/thread-0/driver.queue.subject | driver.publication 21.403ms; driver.publication 12.293ms; driver.publication 2.478ms; driver.publication 2.423ms; driver.expected-state.bind-receipt 2.342ms |
| f7a146af1fdfe61700000000000005cd | 99.356 | 8.894 | 2.290 | 0.000 | 16.315 | 1.012 | 6.799 | 0.041 | n/a | 0.071 | 63.909 | n/a | n/a | 0.025 | 27.499 | 0.277 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 5.330ms; driver.publication 2.242ms; driver.publication 0.576ms |
| f7a146af1fdfe6170000000000000594 | 97.797 | 3.842 | 0.005 | 0.000 | 71.777 | 0.978 | 1.903 | 0.096 | n/a | 4.251 | 14.882 | n/a | n/a | 0.061 | 75.624 | 0.773 | 0.061 | node-13/thread-0/driver.queue.subject | driver.publication 9.328ms; driver.publication 7.961ms; driver.publication 3.361ms; driver.publication 1.436ms |
| f7a146af1fdfe61700000000000003fe | 95.485 | 12.110 | 0.211 | 0.000 | 1.929 | 13.155 | 6.301 | 0.044 | n/a | 0.070 | 61.511 | n/a | n/a | 0.155 | 14.250 | 0.149 | 0.155 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 4.143ms; driver.publication 1.896ms; driver.publication 1.666ms; driver.expected-state.bind-receipt 1.559ms; driver.expected-state.bind-receipt 1.551ms |
| f7a146af1fdfe617000000000000041c | 94.932 | 5.376 | 0.005 | 0.000 | 81.178 | 2.817 | 1.057 | 0.040 | n/a | 0.399 | 3.987 | n/a | n/a | 0.073 | 86.559 | 0.912 | 0.073 | node-13/thread-0/driver.queue.subject | driver.publication 5.132ms; driver.publication 2.196ms; driver.publication 1.670ms; driver.publication 1.582ms; driver.publication 1.375ms |
| f7a146af1fdfe617000000000000041f | 90.311 | 5.461 | 0.010 | 0.000 | 76.036 | 2.103 | 1.168 | 0.036 | n/a | 0.370 | 5.072 | n/a | n/a | 0.054 | 81.508 | 0.903 | 0.054 | node-13/thread-0/driver.queue.subject | driver.publication 5.132ms; driver.publication 2.881ms; driver.publication 2.196ms; driver.publication 1.670ms; driver.publication 1.320ms |
| f7a146af1fdfe61700000000000005cc | 87.788 | 7.563 | 0.008 | 0.000 | 17.696 | 7.777 | 7.764 | 0.067 | n/a | 0.227 | 46.642 | n/a | n/a | 0.044 | 25.268 | 0.288 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.330ms; driver.publication 2.258ms |
| f7a146af1fdfe61700000000000007a2 | 87.704 | 5.948 | 0.010 | 0.000 | 0.969 | 1.631 | 2.129 | 0.033 | n/a | 5.652 | 71.271 | n/a | n/a | 0.062 | 6.927 | 0.079 | 0.062 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 21.403ms; driver.publication 12.293ms; driver.publication 5.623ms; driver.expected-state.bind-receipt 2.052ms; driver.expected-state.bind-receipt 1.218ms |
| f7a146af1fdfe6170000000000000411 | 86.335 | 4.147 | 0.011 | 0.000 | 46.173 | 4.986 | 2.558 | 0.076 | n/a | 0.144 | 28.193 | n/a | n/a | 0.047 | 50.332 | 0.583 | 0.047 | node-13/thread-0/driver.queue.subject | driver.publication 5.132ms; driver.publication 4.436ms; driver.publication 2.196ms; driver.publication 1.582ms; driver.publication 1.574ms |
| f7a146af1fdfe61700000000000005d2 | 85.513 | 19.824 | 0.295 | 0.000 | 8.631 | 9.772 | 2.031 | 4.986 | n/a | 0.165 | 39.759 | n/a | n/a | 0.050 | 28.751 | 0.336 | 0.050 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 8.082ms; driver.publication 5.330ms; driver.publication 3.313ms; driver.publication 2.242ms; driver.expected-state.bind-receipt 1.916ms |

## P2/P4 / read-your-own-write / read (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.061 | n/a | n/a | n/a | 31.968 | 10.588 | 2.447 | 0.000 | 0.503 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.046 | 58.030 | 0.786 | 16.046 |
| p99 | 244.282 | n/a | n/a | n/a | 90.600 | 109.333 | 14.246 | 0.000 | 25.537 | 82.336 | 0.010 | n/a | 0.014 | 0.000 | n/a | n/a | 152.746 | 211.584 | 1.000 | 152.746 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe617000000000000157e | 244.282 | 90.600 | 109.333 | 11.651 | 0.000 | 0.880 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.819 | 211.584 | 0.866 | 31.819 | node-13/thread-0/rpc.gateway-observer.observe | client.encode 3.436ms; driver.publication 3.138ms; driver.publication 1.594ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.417ms |
| f7a146af1fdfe61700000000000009ea | 212.232 | 58.572 | 63.339 | 7.407 | 0.000 | 0.305 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.608 | 129.318 | 0.609 | 82.608 | node-13/thread-3/socket.wait-first-byte | driver.publication 4.587ms; driver.publication 2.540ms; driver.publication 2.311ms; driver.publication 1.632ms; driver.publication 1.394ms |
| f7a146af1fdfe617000000000000158c | 203.653 | 30.562 | 84.154 | 1.099 | 0.000 | 0.316 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 87.522 | 115.815 | 0.569 | 87.522 | node-13/thread-3/socket.wait-first-byte | driver.publication 3.138ms; driver.publication 1.594ms; driver.publication 1.417ms; driver.publication 1.375ms; driver.publication 1.368ms |
| f7a146af1fdfe617000000000000048a | 193.201 | 24.897 | 0.383 | 13.969 | 0.000 | 1.207 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 152.746 | 39.248 | 0.203 | 152.746 | node-13/thread-3/socket.wait-first-byte | driver.publication 5.461ms; driver.publication 4.597ms; driver.publication 4.213ms; driver.publication 3.599ms; driver.expected-state.bind-receipt 2.994ms |
| f7a146af1fdfe6170000000000000483 | 192.198 | 86.072 | 7.087 | 14.246 | 0.000 | 2.417 | 82.336 | 0.010 | n/a | 0.014 | 0.000 | n/a | n/a | 0.015 | 107.406 | 0.559 | 0.015 | gw-r/thread-48/gateway.admitted-work | driver.publication 5.461ms; driver.publication 4.597ms; driver.publication 1.708ms; driver.publication 1.674ms; driver.expected-state.bind-receipt 1.644ms |
| f7a146af1fdfe6170000000000000487 | 179.700 | 27.045 | 19.990 | 0.000 | 0.000 | 2.391 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 130.274 | 47.035 | 0.262 | 130.274 | node-13/thread-3/socket.wait-first-byte | driver.publication 5.461ms; driver.publication 4.597ms; driver.publication 1.885ms; driver.publication 1.674ms; driver.publication 1.525ms |
| f7a146af1fdfe6170000000000000490 | 171.566 | 11.124 | 88.147 | 0.000 | 0.000 | 0.528 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.766 | 99.271 | 0.579 | 71.766 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 5.461ms; driver.publication 4.597ms; driver.publication 4.213ms; driver.publication 3.599ms; driver.expected-state.bind-receipt 2.994ms |
| f7a146af1fdfe6170000000000001d34 | 169.986 | 79.342 | 3.284 | 8.717 | 0.000 | 25.537 | 53.086 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.007 | 91.343 | 0.537 | 0.007 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 2.385ms; driver.publication 1.675ms; driver.publication 1.216ms; driver.expected-state.bind-receipt 1.112ms; driver.publication 1.069ms |
| f7a146af1fdfe6170000000000000491 | 168.476 | 14.711 | 103.531 | 0.000 | 0.000 | 0.677 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 49.556 | 118.243 | 0.702 | 49.556 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 5.461ms; driver.publication 4.597ms; driver.publication 4.213ms; driver.publication 3.599ms; driver.expected-state.bind-receipt 2.994ms |
| f7a146af1fdfe61700000000000009e9 | 167.851 | 70.968 | 64.874 | 10.406 | 0.000 | 0.445 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.157 | 146.249 | 0.871 | 21.157 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.462ms; driver.publication 2.540ms; driver.publication 1.304ms; driver.publication 1.182ms |
| f7a146af1fdfe617000000000000048c | 163.898 | 29.860 | 9.194 | 0.000 | 0.000 | 1.729 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 123.115 | 39.054 | 0.238 | 123.115 | node-13/thread-3/socket.wait-first-byte | driver.publication 5.461ms; driver.publication 4.597ms; driver.publication 4.213ms; driver.expected-state.bind-receipt 2.994ms; driver.publication 1.885ms |
| f7a146af1fdfe617000000000000040d | 158.747 | 54.137 | 14.937 | 3.018 | 0.000 | 4.424 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.231 | 72.092 | 0.454 | 82.231 | node-13/thread-3/socket.wait-first-byte | driver.publication 5.132ms; driver.publication 4.436ms; driver.publication 2.881ms; driver.publication 2.196ms; driver.publication 1.709ms |
| f7a146af1fdfe6170000000000001577 | 146.902 | 57.456 | 4.284 | 6.375 | 0.000 | 2.197 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 76.591 | 68.115 | 0.464 | 76.591 | node-13/thread-3/socket.wait-first-byte | client.encode 3.436ms; driver.publication 2.744ms; driver.publication 1.594ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.398ms |
| f7a146af1fdfe6170000000000001588 | 126.122 | 46.199 | 11.069 | 2.892 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 65.658 | 60.160 | 0.477 | 65.658 | node-13/thread-3/socket.wait-first-byte | driver.publication 3.138ms; driver.publication 1.594ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.398ms; driver.publication 1.368ms |
| f7a146af1fdfe61700000000000009e1 | 125.289 | 50.157 | 68.796 | 3.670 | 0.000 | 0.503 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.162 | 122.624 | 0.979 | 2.162 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.501ms; driver.publication 3.462ms; driver.publication 1.416ms; driver.publication 1.304ms; driver.publication 1.111ms |
| f7a146af1fdfe6170000000000001acf | 121.253 | 30.298 | 0.324 | 1.618 | 0.000 | 0.316 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 88.698 | 32.240 | 0.266 | 88.698 | node-13/thread-3/socket.wait-first-byte | driver.publication 4.179ms; driver.publication 1.307ms; driver.publication 1.236ms; driver.publication 1.158ms |
| f7a146af1fdfe6170000000000001acc | 116.431 | 83.922 | 0.372 | 13.031 | 0.000 | 0.749 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.357 | 97.325 | 0.836 | 18.357 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 4.179ms; driver.publication 1.307ms; driver.publication 1.236ms; driver.publication 1.158ms; driver.publication 1.150ms |
| f7a146af1fdfe6170000000000001586 | 112.968 | 20.488 | 36.172 | 1.123 | 0.000 | 0.548 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.637 | 57.783 | 0.511 | 54.637 | node-13/thread-3/socket.wait-first-byte | driver.publication 1.594ms; driver.expected-state.bind-receipt 1.589ms; driver.publication 1.398ms; driver.publication 1.368ms; driver.publication 1.293ms |
| f7a146af1fdfe61700000000000009df | 109.669 | 48.133 | 0.340 | 3.142 | 0.000 | 0.276 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 57.779 | 51.615 | 0.471 | 57.779 | node-13/thread-3/socket.wait-first-byte | driver.publication 3.501ms; driver.publication 3.462ms; driver.publication 1.416ms; driver.publication 1.304ms; driver.publication 1.111ms |
| f7a146af1fdfe617000000000000040c | 108.663 | 53.353 | 24.182 | 9.813 | 0.000 | 7.681 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.633 | 87.349 | 0.804 | 13.633 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 5.132ms; driver.publication 4.436ms; driver.publication 2.196ms; driver.publication 1.896ms; driver.publication 1.670ms |

## P2 / tail / commit (2623 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.559 | 0.796 | 0.000 | 1.657 | 3.703 | 0.005 | 0.000 | 0.759 | 0.763 | 1.188 | 0.032 | n/a | 0.122 | 5.695 | n/a | n/a | 0.034 | 4.700 | 0.353 | 0.034 |
| p99 | 62.609 | 2.995 | 2.670 | 6.045 | 13.893 | 0.964 | 0.000 | 20.097 | 15.483 | 15.426 | 3.302 | n/a | 4.213 | 30.086 | n/a | n/a | 0.102 | 28.052 | 0.727 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe6170000000000001d6f | 188.783 | 23.164 | 7.908 | 0.000 | 0.081 | 5.881 | 24.357 | 0.142 | n/a | 1.303 | 125.767 | n/a | n/a | 0.181 | 31.154 | 0.165 | 0.181 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000001445 | 87.484 | 14.131 | 0.013 | 0.000 | 0.523 | 4.612 | 34.700 | 0.212 | n/a | 8.316 | 24.933 | n/a | n/a | 0.044 | 14.668 | 0.168 | 0.044 | gw-w/thread-68/gateway.admitted-work | driver.publication 3.309ms; driver.publication 2.028ms |
| f7a146af1fdfe61700000000000015d6 | 85.501 | 3.605 | 0.201 | 0.000 | 0.034 | 28.904 | 40.440 | 0.050 | n/a | 0.493 | 11.734 | n/a | n/a | 0.040 | 3.841 | 0.045 | 0.040 | gw-w/thread-42/gateway.admitted-work | driver.publication 1.417ms; driver.publication 1.349ms; driver.publication 1.330ms; driver.publication 1.248ms; driver.publication 1.164ms |
| f7a146af1fdfe6170000000000000a65 | 82.683 | 5.236 | 0.423 | 0.000 | 0.050 | 2.666 | 42.622 | 0.054 | n/a | 0.391 | 31.096 | n/a | n/a | 0.146 | 5.708 | 0.069 | 0.146 | gw-w/thread-40/gateway.admitted-work | driver.publication 2.631ms; driver.publication 2.463ms; driver.publication 1.414ms; driver.publication 1.376ms |
| f7a146af1fdfe61700000000000011b7 | 78.476 | 2.198 | 0.005 | 0.000 | 71.192 | 0.624 | 0.993 | 0.034 | n/a | 0.072 | 3.334 | n/a | n/a | 0.025 | 73.395 | 0.935 | 0.025 | node-13/thread-0/driver.queue.subject | driver.publication 4.619ms; driver.publication 2.054ms; driver.publication 1.704ms; driver.publication 1.344ms; driver.publication 1.248ms |
| f7a146af1fdfe6170000000000001390 | 77.918 | 28.287 | 4.710 | 0.000 | 0.059 | 1.773 | 17.026 | 0.069 | n/a | 0.139 | 25.778 | n/a | n/a | 0.077 | 33.056 | 0.424 | 0.077 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 20.840ms; driver.publication 4.734ms; driver.expected-state.bind-receipt 2.292ms |
| f7a146af1fdfe6170000000000001a4b | 77.427 | 3.324 | 0.005 | 0.000 | 20.212 | 45.677 | 1.557 | 0.049 | n/a | 0.162 | 6.413 | n/a | n/a | 0.027 | 23.542 | 0.304 | 0.027 | node-13/thread-0/socket.wait-first-byte | driver.publication 4.495ms; driver.publication 3.472ms; driver.publication 2.693ms |
| f7a146af1fdfe6170000000000001902 | 76.979 | 52.996 | 0.007 | 0.000 | 0.874 | 9.611 | 1.372 | 0.028 | n/a | 0.092 | 11.931 | n/a | n/a | 0.068 | 53.877 | 0.700 | 0.068 | node-13/thread-0/driver.publication | none observed |
| f7a146af1fdfe61700000000000010d9 | 76.401 | 21.157 | 0.345 | 0.000 | 2.540 | 4.072 | 4.614 | 1.158 | n/a | 0.893 | 41.593 | n/a | n/a | 0.029 | 24.042 | 0.315 | 0.029 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.854ms; driver.publication 1.640ms; driver.publication 1.385ms; driver.publication 1.384ms; driver.publication 1.198ms |
| f7a146af1fdfe6170000000000001c1c | 76.360 | 4.031 | 0.007 | 0.000 | 62.367 | 0.755 | 1.466 | 0.059 | n/a | 0.502 | 7.123 | n/a | n/a | 0.050 | 66.405 | 0.870 | 0.050 | node-13/thread-0/driver.queue.subject | driver.publication 2.276ms; driver.expected-state.bind-receipt 2.228ms; driver.publication 1.611ms; driver.publication 1.581ms; driver.publication 1.429ms |
| f7a146af1fdfe61700000000000011b4 | 74.506 | 15.802 | 0.016 | 0.000 | 0.295 | 25.582 | 3.237 | 0.083 | n/a | 1.040 | 28.411 | n/a | n/a | 0.040 | 16.113 | 0.216 | 0.040 | node-13/thread-0/socket.wait-first-byte | driver.publication 4.619ms; driver.publication 1.704ms; driver.publication 1.344ms; driver.publication 1.248ms; driver.expected-state.bind-receipt 1.242ms |
| f7a146af1fdfe61700000000000015d3 | 73.759 | 5.738 | 0.010 | 0.000 | 48.696 | 4.863 | 2.147 | 0.067 | n/a | 3.463 | 8.731 | n/a | n/a | 0.044 | 54.443 | 0.738 | 0.044 | node-13/thread-0/driver.queue.subject | driver.publication 1.417ms; driver.publication 1.330ms; driver.publication 1.248ms; driver.publication 1.168ms; driver.publication 1.164ms |
| f7a146af1fdfe6170000000000000ca9 | 73.112 | 5.285 | 0.005 | 0.000 | 56.268 | 5.396 | 1.140 | 0.038 | n/a | 0.088 | 4.850 | n/a | n/a | 0.042 | 61.558 | 0.842 | 0.042 | node-13/thread-0/driver.queue.subject | driver.plan-and-encode-command 4.652ms; driver.publication 4.394ms; driver.expected-state.bind-receipt 2.006ms; driver.publication 1.533ms; driver.expected-state.bind-receipt 1.522ms |
| f7a146af1fdfe6170000000000000da3 | 72.857 | 16.778 | 0.499 | 0.000 | 0.097 | 15.690 | 15.871 | 0.158 | n/a | 1.351 | 22.187 | n/a | n/a | 0.227 | 17.374 | 0.238 | 0.227 | node-13/thread-5/socket.wait-first-byte | driver.publication 5.935ms; driver.publication 2.798ms; driver.publication 1.450ms |
| f7a146af1fdfe6170000000000001903 | 72.780 | 12.991 | 0.012 | 0.000 | 0.776 | 14.356 | 1.120 | 0.025 | n/a | 0.285 | 43.179 | n/a | n/a | 0.035 | 13.779 | 0.189 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 40.733ms; driver.expected-state.bind-receipt 4.388ms |
| f7a146af1fdfe6170000000000001447 | 70.334 | 11.319 | 0.012 | 0.000 | 0.633 | 6.420 | 11.167 | 5.936 | n/a | 0.215 | 34.558 | n/a | n/a | 0.073 | 11.965 | 0.170 | 0.073 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.309ms |
| f7a146af1fdfe6170000000000001a42 | 69.115 | 19.529 | 0.166 | 0.000 | 1.307 | 32.911 | 0.574 | 1.108 | n/a | 0.359 | 13.133 | n/a | n/a | 0.028 | 21.002 | 0.304 | 0.028 | node-13/thread-0/socket.wait-first-byte | driver.publication 11.009ms; driver.expected-state.bind-receipt 1.819ms; driver.publication 1.251ms |
| f7a146af1fdfe61700000000000015d0 | 67.067 | 5.527 | 0.009 | 0.000 | 4.629 | 11.678 | 2.384 | 0.046 | n/a | 0.077 | 42.690 | n/a | n/a | 0.027 | 10.164 | 0.152 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.417ms; driver.publication 1.330ms; driver.publication 1.168ms; driver.publication 1.164ms; driver.publication 0.686ms |
| f7a146af1fdfe6170000000000000f60 | 65.331 | 8.205 | 0.012 | 2.005 | 0.510 | 21.065 | 8.021 | 0.101 | n/a | 4.193 | 21.185 | n/a | n/a | 0.034 | 10.732 | 0.164 | 0.034 | node-13/thread-0/socket.wait-first-byte | driver.publication 1.289ms; driver.publication 1.204ms; driver.publication 1.174ms; driver.publication 1.046ms |
| f7a146af1fdfe6170000000000000cb2 | 65.200 | 12.272 | 0.009 | 0.000 | 6.070 | 35.241 | 7.879 | 0.074 | n/a | 0.193 | 3.368 | n/a | n/a | 0.094 | 18.351 | 0.281 | 0.094 | node-13/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.694ms; driver.publication 1.906ms; driver.expected-state.bind-receipt 1.444ms; driver.publication 1.182ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.742 | 0.669 | 0.000 | 1.488 | 3.231 | 0.005 | 0.000 | 0.764 | 0.750 | 0.980 | 0.031 | n/a | 0.122 | 5.055 | n/a | n/a | 0.034 | 4.154 | 0.349 | 0.034 |
| p99 | 53.094 | 2.389 | 1.950 | 5.315 | 10.680 | 0.162 | 0.000 | 20.097 | 12.806 | 5.854 | 3.693 | n/a | 3.702 | 28.080 | n/a | n/a | 0.095 | 24.632 | 0.722 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f7a146af1fdfe61700000000000011b7 | 78.476 | 2.198 | 0.005 | 0.000 | 71.192 | 0.624 | 0.993 | 0.034 | n/a | 0.072 | 3.334 | n/a | n/a | 0.025 | 73.395 | 0.935 | 0.025 | node-13/thread-0/driver.queue.subject | driver.publication 4.619ms; driver.publication 2.054ms; driver.publication 1.704ms; driver.publication 1.344ms; driver.publication 1.248ms |
| f7a146af1fdfe6170000000000001a4b | 77.427 | 3.324 | 0.005 | 0.000 | 20.212 | 45.677 | 1.557 | 0.049 | n/a | 0.162 | 6.413 | n/a | n/a | 0.027 | 23.542 | 0.304 | 0.027 | node-13/thread-0/socket.wait-first-byte | driver.publication 4.495ms; driver.publication 3.472ms; driver.publication 2.693ms |
| f7a146af1fdfe6170000000000001c1c | 76.360 | 4.031 | 0.007 | 0.000 | 62.367 | 0.755 | 1.466 | 0.059 | n/a | 0.502 | 7.123 | n/a | n/a | 0.050 | 66.405 | 0.870 | 0.050 | node-13/thread-0/driver.queue.subject | driver.publication 2.276ms; driver.expected-state.bind-receipt 2.228ms; driver.publication 1.611ms; driver.publication 1.581ms; driver.publication 1.429ms |
| f7a146af1fdfe61700000000000011b4 | 74.506 | 15.802 | 0.016 | 0.000 | 0.295 | 25.582 | 3.237 | 0.083 | n/a | 1.040 | 28.411 | n/a | n/a | 0.040 | 16.113 | 0.216 | 0.040 | node-13/thread-0/socket.wait-first-byte | driver.publication 4.619ms; driver.publication 1.704ms; driver.publication 1.344ms; driver.publication 1.248ms; driver.expected-state.bind-receipt 1.242ms |
| f7a146af1fdfe6170000000000000ca9 | 73.112 | 5.285 | 0.005 | 0.000 | 56.268 | 5.396 | 1.140 | 0.038 | n/a | 0.088 | 4.850 | n/a | n/a | 0.042 | 61.558 | 0.842 | 0.042 | node-13/thread-0/driver.queue.subject | driver.plan-and-encode-command 4.652ms; driver.publication 4.394ms; driver.expected-state.bind-receipt 2.006ms; driver.publication 1.533ms; driver.expected-state.bind-receipt 1.522ms |
| f7a146af1fdfe6170000000000001447 | 70.334 | 11.319 | 0.012 | 0.000 | 0.633 | 6.420 | 11.167 | 5.936 | n/a | 0.215 | 34.558 | n/a | n/a | 0.073 | 11.965 | 0.170 | 0.073 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.309ms |
| f7a146af1fdfe6170000000000001a42 | 69.115 | 19.529 | 0.166 | 0.000 | 1.307 | 32.911 | 0.574 | 1.108 | n/a | 0.359 | 13.133 | n/a | n/a | 0.028 | 21.002 | 0.304 | 0.028 | node-13/thread-0/socket.wait-first-byte | driver.publication 11.009ms; driver.expected-state.bind-receipt 1.819ms; driver.publication 1.251ms |
| f7a146af1fdfe6170000000000000ca8 | 64.602 | 7.550 | 0.005 | 0.000 | 49.960 | 0.905 | 0.993 | 0.033 | n/a | 0.069 | 5.045 | n/a | n/a | 0.042 | 57.515 | 0.890 | 0.042 | node-13/thread-0/driver.queue.subject | driver.plan-and-encode-command 4.652ms; driver.publication 4.323ms; driver.expected-state.bind-receipt 2.006ms; driver.publication 1.533ms; driver.expected-state.bind-receipt 1.522ms |
| f7a146af1fdfe6170000000000000c36 | 64.165 | 5.041 | 0.016 | 0.000 | 0.114 | 0.848 | 1.377 | 0.037 | n/a | 3.586 | 53.094 | n/a | n/a | 0.053 | 5.170 | 0.081 | 0.053 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe6170000000000001a45 | 62.609 | 2.902 | 0.008 | 0.000 | 9.146 | 34.853 | 1.174 | 0.052 | n/a | 0.067 | 14.390 | n/a | n/a | 0.017 | 12.056 | 0.193 | 0.017 | node-13/thread-0/socket.wait-first-byte | driver.publication 11.009ms; driver.publication 4.495ms; driver.expected-state.bind-receipt 1.819ms; driver.publication 1.251ms |
| f7a146af1fdfe617000000000000153d | 62.569 | 4.061 | 0.008 | 0.000 | 41.895 | 0.814 | 2.920 | 0.075 | n/a | 0.424 | 12.336 | n/a | n/a | 0.035 | 45.964 | 0.735 | 0.035 | node-13/thread-0/driver.queue.subject | driver.publication 2.982ms; driver.publication 1.252ms; driver.publication 1.213ms |
| f7a146af1fdfe6170000000000001908 | 58.378 | 11.197 | 0.016 | 0.000 | 6.257 | 18.466 | 8.451 | 0.142 | n/a | 1.476 | 12.338 | n/a | n/a | 0.036 | 17.469 | 0.299 | 0.036 | node-13/thread-0/socket.wait-first-byte | driver.publication 1.614ms; driver.publication 1.491ms; driver.publication 1.349ms; driver.publication 1.096ms; driver.expected-state.bind-receipt 1.041ms |
| f7a146af1fdfe61700000000000010db | 57.583 | 9.022 | 1.726 | 0.000 | 11.233 | 7.657 | 1.213 | 9.327 | n/a | 0.623 | 16.717 | n/a | n/a | 0.063 | 21.982 | 0.382 | 0.063 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 1.385ms; driver.publication 1.384ms; driver.expected-state.bind-receipt 1.091ms; driver.publication 1.049ms |
| f7a146af1fdfe6170000000000001a4e | 56.260 | 5.429 | 0.007 | 0.000 | 5.571 | 38.269 | 1.171 | 0.034 | n/a | 0.102 | 5.650 | n/a | n/a | 0.027 | 11.006 | 0.196 | 0.027 | node-13/thread-0/socket.wait-first-byte | driver.publication 3.472ms; driver.publication 1.192ms |
| f7a146af1fdfe6170000000000000f8c | 56.205 | 3.673 | 0.007 | 0.000 | 1.963 | 6.446 | 1.442 | 0.037 | n/a | 3.033 | 39.563 | n/a | n/a | 0.040 | 5.643 | 0.100 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.159ms; driver.publication 1.159ms; driver.publication 1.150ms |
| f7a146af1fdfe6170000000000000f8b | 53.094 | 8.223 | 0.007 | 0.000 | 0.578 | 2.808 | 1.075 | 0.449 | n/a | 0.240 | 39.663 | n/a | n/a | 0.051 | 8.808 | 0.166 | 0.051 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.159ms; driver.publication 1.150ms |
| f7a146af1fdfe6170000000000000f8d | 53.085 | 3.833 | 0.008 | 0.000 | 0.796 | 4.427 | 0.808 | 0.407 | n/a | 0.065 | 42.706 | n/a | n/a | 0.035 | 4.636 | 0.087 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.159ms; driver.publication 1.159ms; driver.publication 1.150ms; driver.publication 1.106ms |
| f7a146af1fdfe6170000000000000a5f | 51.655 | 26.321 | 0.006 | 0.000 | 3.757 | 4.916 | 1.924 | 0.041 | n/a | 0.401 | 14.154 | n/a | n/a | 0.135 | 30.085 | 0.582 | 0.135 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| f7a146af1fdfe61700000000000015d2 | 50.252 | 3.629 | 0.005 | 0.000 | 2.062 | 2.664 | 0.947 | 30.663 | n/a | 0.014 | 10.235 | n/a | n/a | 0.031 | 5.697 | 0.113 | 0.031 | gw-w/thread-70/gateway.commit-order-wait | driver.publication 1.330ms; driver.publication 1.168ms |
| f7a146af1fdfe6170000000000001651 | 50.105 | 10.778 | 0.011 | 0.000 | 1.466 | 18.019 | 2.194 | 0.042 | n/a | 0.296 | 17.262 | n/a | n/a | 0.038 | 12.255 | 0.245 | 0.038 | node-13/thread-0/socket.wait-first-byte | driver.publication 1.198ms; driver.publication 1.124ms; driver.publication 1.026ms; driver.expected-state.bind-receipt 1.017ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.310 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 200.662 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 |
| p99 | 202.827 | n/a | n/a | n/a | 22.049 | n/a | 2.553 | 0.000 | 9.182 | 201.263 | 0.136 | n/a | 0.234 | 0.000 | n/a | n/a | 0.400 | 22.049 | 0.260 | 0.400 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad1523260000000000000007 | 202.827 | 0.000 | n/a | 0.000 | 0.000 | 1.134 | 201.220 | 0.063 | n/a | 0.158 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad1523260000000000000006 | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 201.263 | 0.035 | n/a | 0.234 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000005 | 202.568 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.069 | 0.022 | n/a | 0.158 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000ef2 | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 201.101 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000ef1 | 201.477 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 200.745 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000ef3 | 201.310 | 0.000 | n/a | 0.000 | 0.000 | 0.525 | 200.657 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000ef4 | 201.300 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 200.662 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000002 | 188.528 | 5.081 | n/a | 0.000 | 0.000 | 1.022 | 181.751 | 0.136 | n/a | 0.138 | 0.000 | n/a | n/a | 0.400 | 5.081 | 0.027 | 0.400 | gw-r/thread-48/gateway.admitted-work | none observed |
| 3abe0c10ad1523260000000000000ef7 | 100.545 | 17.983 | n/a | 2.553 | 0.000 | 9.182 | 70.679 | 0.007 | n/a | 0.004 | 0.000 | n/a | n/a | 0.136 | 20.536 | 0.204 | 0.136 | gw-r/thread-65/gateway.admitted-work | none observed |
| 3abe0c10ad1523260000000000000ef8 | 84.698 | 22.049 | n/a | 0.000 | 0.000 | 4.833 | 57.566 | 0.008 | n/a | 0.010 | 0.000 | n/a | n/a | 0.231 | 22.049 | 0.260 | 0.231 | gw-r/thread-50/gateway.admitted-work | none observed |
| 3abe0c10ad1523260000000000000ef9 | 80.770 | 17.950 | n/a | 1.487 | 0.000 | 7.286 | 53.863 | 0.007 | n/a | 0.019 | 0.000 | n/a | n/a | 0.159 | 19.437 | 0.241 | 0.159 | gw-r/thread-50/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 821.998 | n/a | n/a | n/a | 0.291 | n/a | 0.000 | 0.000 | 0.977 | 810.844 | 0.011 | n/a | 0.206 | 0.000 | n/a | n/a | 0.379 | 0.291 | 0.000 | 0.379 |
| p99 | 1004.091 | n/a | n/a | n/a | 9.582 | n/a | 0.000 | 0.000 | 1.465 | 1000.751 | 0.013 | n/a | 0.336 | 0.000 | n/a | n/a | 1.234 | 9.582 | 0.012 | 1.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f00000000000000a4 | 1004.091 | 0.291 | n/a | 0.000 | 0.000 | 1.465 | 1000.751 | 0.013 | n/a | 0.336 | 0.000 | n/a | n/a | 1.234 | 0.291 | 0.000 | 1.234 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000a5 | 821.998 | 9.582 | n/a | 0.000 | 0.000 | 0.977 | 810.844 | 0.011 | n/a | 0.206 | 0.000 | n/a | n/a | 0.379 | 9.582 | 0.012 | 0.379 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 433.735 | n/a | n/a | n/a | 3.021 | n/a | 0.000 | 0.000 | 0.912 | 428.943 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.123 | 3.021 | 0.008 | 0.123 |
| p99 | 1009.475 | n/a | n/a | n/a | 7.238 | n/a | 0.000 | 0.000 | 2.186 | 1002.083 | 0.393 | n/a | 1.157 | 0.000 | n/a | n/a | 28.936 | 7.238 | 0.610 | 28.936 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f00000000000000b4 | 1009.475 | 6.070 | n/a | 0.000 | 0.000 | 0.919 | 1002.083 | 0.020 | n/a | 0.140 | 0.000 | n/a | n/a | 0.244 | 6.070 | 0.006 | 0.244 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000000bb | 1002.871 | 0.125 | n/a | 0.000 | 0.000 | 0.661 | 1000.847 | 0.012 | n/a | 0.118 | 0.000 | n/a | n/a | 1.107 | 0.125 | 0.000 | 1.107 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000d0 | 991.763 | 3.021 | n/a | 0.000 | 0.000 | 0.912 | 987.510 | 0.152 | n/a | 0.074 | 0.000 | n/a | n/a | 0.094 | 3.021 | 0.003 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000000ba | 951.906 | 3.287 | n/a | 0.000 | 0.000 | 0.815 | 947.610 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.087 | 3.287 | 0.003 | 0.087 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f00000000000000ae | 913.274 | 2.770 | n/a | 0.000 | 0.000 | 0.694 | 909.510 | 0.023 | n/a | 0.183 | 0.000 | n/a | n/a | 0.094 | 2.770 | 0.003 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000000a8 | 813.005 | 2.632 | n/a | 0.000 | 0.000 | 0.966 | 809.149 | 0.015 | n/a | 0.135 | 0.000 | n/a | n/a | 0.109 | 2.632 | 0.003 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000000c2 | 792.107 | 6.311 | n/a | 0.000 | 0.000 | 1.142 | 784.419 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.123 | 6.311 | 0.008 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f00000000000000ab | 663.463 | 3.445 | n/a | 0.000 | 0.000 | 1.054 | 658.707 | 0.015 | n/a | 0.133 | 0.000 | n/a | n/a | 0.110 | 3.445 | 0.005 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000000cb | 648.588 | 2.181 | n/a | 0.000 | 0.000 | 0.562 | 645.585 | 0.021 | n/a | 0.166 | 0.000 | n/a | n/a | 0.072 | 2.181 | 0.003 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000000b2 | 648.155 | 2.824 | n/a | 0.000 | 0.000 | 1.044 | 644.115 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.073 | 2.824 | 0.004 | 0.073 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000000c9 | 606.276 | 2.746 | n/a | 0.000 | 0.000 | 0.588 | 602.311 | 0.393 | n/a | 0.084 | 0.000 | n/a | n/a | 0.154 | 2.746 | 0.005 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f00000000000000c1 | 566.661 | 5.277 | n/a | 0.000 | 0.000 | 0.825 | 560.144 | 0.114 | n/a | 0.078 | 0.000 | n/a | n/a | 0.223 | 5.277 | 0.009 | 0.223 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000000c6 | 563.326 | 2.748 | n/a | 0.000 | 0.000 | 0.842 | 559.503 | 0.055 | n/a | 0.069 | 0.000 | n/a | n/a | 0.109 | 2.748 | 0.005 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000000c5 | 436.386 | 2.512 | n/a | 0.000 | 0.000 | 0.944 | 432.625 | 0.028 | n/a | 0.192 | 0.000 | n/a | n/a | 0.086 | 2.512 | 0.006 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000b6 | 433.735 | 2.547 | n/a | 0.000 | 0.000 | 0.997 | 428.943 | 0.012 | n/a | 1.157 | 0.000 | n/a | n/a | 0.079 | 2.547 | 0.006 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000000c8 | 395.973 | 2.242 | n/a | 0.000 | 0.000 | 0.698 | 392.916 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 2.242 | 0.006 | 0.077 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f00000000000000a7 | 376.127 | 6.125 | n/a | 0.000 | 0.000 | 1.677 | 367.885 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.312 | 6.125 | 0.016 | 0.312 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000000b9 | 367.735 | 7.238 | n/a | 0.000 | 0.000 | 0.719 | 359.428 | 0.034 | n/a | 0.125 | 0.000 | n/a | n/a | 0.191 | 7.238 | 0.020 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f00000000000000a9 | 353.787 | 3.763 | n/a | 0.000 | 0.000 | 0.719 | 348.923 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.245 | 3.763 | 0.011 | 0.245 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000b1 | 309.196 | 5.441 | n/a | 0.000 | 0.000 | 1.170 | 302.354 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.129 | 5.441 | 0.018 | 0.129 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 431.675 | n/a | n/a | n/a | 6.118 | n/a | 0.651 | 0.000 | 0.846 | 424.350 | 0.024 | n/a | 0.087 | 0.000 | n/a | n/a | 0.173 | 6.687 | 0.018 | 0.173 |
| p99 | 1011.638 | n/a | n/a | n/a | 14.572 | n/a | 2.414 | 0.000 | 3.896 | 1001.918 | 1.559 | n/a | 0.163 | 0.000 | n/a | n/a | 42.539 | 16.986 | 0.263 | 42.539 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f00000000000000d1 | 1011.638 | 12.660 | n/a | 1.404 | 0.000 | 0.738 | 996.376 | 0.159 | n/a | 0.073 | 0.000 | n/a | n/a | 0.227 | 14.064 | 0.014 | 0.227 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f00000000000000d2 | 1004.991 | 0.375 | n/a | 0.000 | 0.000 | 1.245 | 1001.918 | 0.052 | n/a | 0.154 | 0.000 | n/a | n/a | 1.248 | 0.375 | 0.000 | 1.248 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000de | 1004.566 | 6.131 | n/a | 0.556 | 0.000 | 1.018 | 996.351 | 0.177 | n/a | 0.150 | 0.000 | n/a | n/a | 0.184 | 6.687 | 0.007 | 0.184 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000105 | 1004.016 | 8.287 | n/a | 1.379 | 0.000 | 1.143 | 992.589 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.525 | 9.666 | 0.010 | 0.525 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000101 | 1003.368 | 3.054 | n/a | 0.000 | 0.000 | 1.005 | 999.138 | 0.014 | n/a | 0.087 | 0.000 | n/a | n/a | 0.071 | 3.054 | 0.003 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000d9 | 997.521 | 7.112 | n/a | 0.813 | 0.000 | 2.234 | 987.074 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.161 | 7.925 | 0.008 | 0.161 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f000000000000010d | 997.296 | 3.315 | n/a | 0.000 | 0.000 | 3.896 | 989.712 | 0.179 | n/a | 0.075 | 0.000 | n/a | n/a | 0.118 | 3.315 | 0.003 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000000df | 994.797 | 7.269 | n/a | 0.510 | 0.000 | 0.997 | 985.530 | 0.202 | n/a | 0.083 | 0.000 | n/a | n/a | 0.205 | 7.779 | 0.008 | 0.205 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f00000000000000da | 976.593 | 6.506 | n/a | 0.722 | 0.000 | 0.775 | 966.875 | 1.559 | n/a | 0.061 | 0.000 | n/a | n/a | 0.095 | 7.229 | 0.007 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000000fe | 964.678 | 7.111 | n/a | 1.393 | 0.000 | 0.917 | 954.868 | 0.167 | n/a | 0.087 | 0.000 | n/a | n/a | 0.136 | 8.504 | 0.009 | 0.136 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000000e4 | 839.744 | 7.395 | n/a | 1.456 | 0.000 | 0.947 | 829.166 | 0.462 | n/a | 0.156 | 0.000 | n/a | n/a | 0.162 | 8.851 | 0.011 | 0.162 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000000e0 | 796.695 | 6.234 | n/a | 0.558 | 0.000 | 0.708 | 788.866 | 0.015 | n/a | 0.059 | 0.000 | n/a | n/a | 0.255 | 6.792 | 0.009 | 0.255 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000102 | 776.508 | 8.571 | n/a | 1.188 | 0.000 | 1.250 | 765.110 | 0.013 | n/a | 0.141 | 0.000 | n/a | n/a | 0.235 | 9.760 | 0.013 | 0.235 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000000eb | 613.418 | 3.096 | n/a | 0.000 | 0.000 | 0.876 | 609.072 | 0.157 | n/a | 0.118 | 0.000 | n/a | n/a | 0.099 | 3.096 | 0.005 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f00000000000000e8 | 583.252 | 14.572 | n/a | 2.414 | 0.000 | 1.689 | 563.975 | 0.292 | n/a | 0.163 | 0.000 | n/a | n/a | 0.147 | 16.986 | 0.029 | 0.147 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000000db | 535.593 | 6.081 | n/a | 1.090 | 0.000 | 0.837 | 527.326 | 0.029 | n/a | 0.110 | 0.000 | n/a | n/a | 0.121 | 7.170 | 0.013 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f00000000000000fb | 524.520 | 5.589 | n/a | 0.781 | 0.000 | 0.809 | 516.925 | 0.177 | n/a | 0.111 | 0.000 | n/a | n/a | 0.128 | 6.370 | 0.012 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f00000000000000dd | 483.010 | 4.608 | n/a | 0.830 | 0.000 | 0.450 | 476.826 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.190 | 5.438 | 0.011 | 0.190 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000107 | 466.052 | 12.512 | n/a | 0.582 | 0.000 | 0.744 | 451.777 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.356 | 13.094 | 0.028 | 0.356 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f00000000000000d5 | 440.332 | 4.601 | n/a | 0.528 | 0.000 | 0.846 | 434.177 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.093 | 5.128 | 0.012 | 0.093 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 422.809 | n/a | n/a | n/a | 4.489 | n/a | 0.000 | 0.000 | 0.714 | 418.850 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.139 | 4.489 | 0.010 | 0.139 |
| p99 | 1004.154 | n/a | n/a | n/a | 11.776 | n/a | 1.344 | 0.000 | 3.313 | 1001.302 | 0.353 | n/a | 0.123 | 0.000 | n/a | n/a | 44.974 | 12.414 | 0.361 | 44.974 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f0000000000000137 | 1004.154 | 2.685 | n/a | 0.000 | 0.000 | 0.534 | 1000.785 | 0.019 | n/a | 0.061 | 0.000 | n/a | n/a | 0.070 | 2.685 | 0.003 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f000000000000012a | 1003.356 | 0.136 | n/a | 0.000 | 0.000 | 0.680 | 1001.302 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 1.118 | 0.136 | 0.000 | 1.118 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000129 | 1000.570 | 2.986 | n/a | 0.000 | 0.000 | 1.121 | 996.245 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.151 | 2.986 | 0.003 | 0.151 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000000114 | 992.492 | 3.351 | n/a | 0.585 | 0.000 | 3.313 | 984.826 | 0.138 | n/a | 0.093 | 0.000 | n/a | n/a | 0.186 | 3.936 | 0.004 | 0.186 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000140 | 980.763 | 4.516 | n/a | 0.000 | 0.000 | 0.649 | 975.389 | 0.018 | n/a | 0.073 | 0.000 | n/a | n/a | 0.119 | 4.516 | 0.005 | 0.119 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f000000000000011c | 978.868 | 5.195 | n/a | 0.666 | 0.000 | 0.459 | 972.260 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.202 | 5.861 | 0.006 | 0.202 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f0000000000000125 | 976.297 | 4.029 | n/a | 0.000 | 0.000 | 0.924 | 971.163 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.095 | 4.029 | 0.004 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000111 | 816.604 | 3.277 | n/a | 0.625 | 0.000 | 0.754 | 811.582 | 0.160 | n/a | 0.082 | 0.000 | n/a | n/a | 0.124 | 3.902 | 0.005 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f0000000000000147 | 759.688 | 3.050 | n/a | 0.833 | 0.000 | 0.603 | 754.845 | 0.168 | n/a | 0.055 | 0.000 | n/a | n/a | 0.134 | 3.883 | 0.005 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000126 | 735.423 | 6.863 | n/a | 0.736 | 0.000 | 0.865 | 726.766 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.135 | 7.598 | 0.010 | 0.135 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f000000000000011d | 732.255 | 6.526 | n/a | 0.000 | 0.000 | 0.823 | 724.711 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.119 | 6.526 | 0.009 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 3bf40680f9371b4f0000000000000132 | 726.808 | 2.577 | n/a | 0.000 | 0.000 | 0.438 | 723.655 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.078 | 2.577 | 0.004 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000000123 | 722.471 | 6.681 | n/a | 0.000 | 0.000 | 3.048 | 712.283 | 0.153 | n/a | 0.081 | 0.000 | n/a | n/a | 0.225 | 6.681 | 0.009 | 0.225 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f000000000000013c | 695.515 | 6.102 | n/a | 0.000 | 0.000 | 0.773 | 688.429 | 0.018 | n/a | 0.092 | 0.000 | n/a | n/a | 0.101 | 6.102 | 0.009 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f000000000000012d | 671.978 | 4.729 | n/a | 0.000 | 0.000 | 0.680 | 666.290 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.207 | 4.729 | 0.007 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000134 | 663.694 | 3.456 | n/a | 0.620 | 0.000 | 0.668 | 658.765 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.133 | 4.076 | 0.006 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f000000000000010e | 655.816 | 5.418 | n/a | 0.634 | 0.000 | 0.963 | 648.512 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.155 | 6.052 | 0.009 | 0.155 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000141 | 619.409 | 5.766 | n/a | 0.891 | 0.000 | 1.100 | 611.275 | 0.172 | n/a | 0.062 | 0.000 | n/a | n/a | 0.143 | 6.657 | 0.011 | 0.143 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000138 | 550.875 | 11.776 | n/a | 0.639 | 0.000 | 0.925 | 537.289 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.127 | 12.414 | 0.023 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000139 | 460.074 | 4.489 | n/a | 0.000 | 0.000 | 0.827 | 454.604 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.080 | 4.489 | 0.010 | 0.080 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 384.365 | n/a | n/a | n/a | 3.272 | n/a | 0.000 | 0.000 | 0.666 | 381.044 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.141 | 3.272 | 0.009 | 0.141 |
| p99 | 1004.025 | n/a | n/a | n/a | 12.046 | n/a | 0.917 | 0.000 | 18.318 | 1001.483 | 0.338 | n/a | 0.133 | 0.000 | n/a | n/a | 41.655 | 12.046 | 0.689 | 41.655 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f0000000000000164 | 1004.025 | 0.184 | n/a | 0.000 | 0.000 | 1.058 | 1001.483 | 0.018 | n/a | 0.104 | 0.000 | n/a | n/a | 1.178 | 0.184 | 0.000 | 1.178 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000153 | 1003.571 | 0.164 | n/a | 0.000 | 0.000 | 1.002 | 1001.190 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 1.113 | 0.164 | 0.000 | 1.113 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000186 | 1003.147 | 0.179 | n/a | 0.000 | 0.000 | 1.013 | 1000.739 | 0.017 | n/a | 0.047 | 0.000 | n/a | n/a | 1.152 | 0.179 | 0.000 | 1.152 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f000000000000017e | 1002.860 | 0.135 | n/a | 0.000 | 0.000 | 0.619 | 1000.901 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 1.137 | 0.135 | 0.000 | 1.137 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f000000000000016e | 1000.483 | 2.456 | n/a | 0.000 | 0.000 | 0.712 | 997.185 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.079 | 2.456 | 0.002 | 0.079 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000185 | 982.862 | 3.141 | n/a | 0.000 | 0.000 | 1.816 | 977.739 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.093 | 3.141 | 0.003 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000173 | 974.272 | 4.049 | n/a | 0.000 | 0.000 | 0.666 | 969.317 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.194 | 4.049 | 0.004 | 0.194 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000159 | 846.488 | 3.061 | n/a | 0.000 | 0.000 | 0.827 | 842.448 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.084 | 3.061 | 0.004 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000179 | 825.044 | 3.533 | n/a | 0.000 | 0.000 | 2.740 | 818.633 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.093 | 3.533 | 0.004 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000183 | 668.648 | 5.019 | n/a | 0.000 | 0.000 | 0.606 | 662.793 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.176 | 5.019 | 0.008 | 0.176 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000155 | 664.063 | 2.153 | n/a | 0.000 | 0.000 | 0.505 | 661.258 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.090 | 2.153 | 0.003 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f000000000000016c | 656.123 | 2.731 | n/a | 0.000 | 0.000 | 0.579 | 652.607 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.138 | 2.731 | 0.004 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000176 | 617.985 | 5.364 | n/a | 0.000 | 0.000 | 0.658 | 611.465 | 0.250 | n/a | 0.051 | 0.000 | n/a | n/a | 0.195 | 5.364 | 0.009 | 0.195 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000000189 | 615.328 | 5.400 | n/a | 0.694 | 0.000 | 0.576 | 608.264 | 0.175 | n/a | 0.057 | 0.000 | n/a | n/a | 0.163 | 6.093 | 0.010 | 0.163 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f000000000000017c | 599.580 | 3.421 | n/a | 0.000 | 0.000 | 0.662 | 595.059 | 0.093 | n/a | 0.073 | 0.000 | n/a | n/a | 0.272 | 3.421 | 0.006 | 0.272 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000170 | 597.699 | 3.272 | n/a | 0.000 | 0.000 | 0.666 | 593.267 | 0.335 | n/a | 0.055 | 0.000 | n/a | n/a | 0.104 | 3.272 | 0.005 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f000000000000014e | 579.739 | 2.390 | n/a | 0.000 | 0.000 | 0.629 | 576.462 | 0.017 | n/a | 0.133 | 0.000 | n/a | n/a | 0.108 | 2.390 | 0.004 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000000166 | 521.481 | 12.046 | n/a | 0.000 | 0.000 | 2.353 | 506.427 | 0.338 | n/a | 0.082 | 0.000 | n/a | n/a | 0.234 | 12.046 | 0.023 | 0.234 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000167 | 470.903 | 3.275 | n/a | 0.000 | 0.000 | 0.782 | 466.667 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.095 | 3.275 | 0.007 | 0.095 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000000151 | 411.785 | 2.532 | n/a | 0.000 | 0.000 | 0.589 | 408.490 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.094 | 2.532 | 0.006 | 0.094 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 315.735 | n/a | n/a | n/a | 3.682 | n/a | 0.000 | 0.000 | 0.583 | 308.193 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.121 | 3.682 | 0.015 | 0.121 |
| p99 | 1003.799 | n/a | n/a | n/a | 12.879 | n/a | 1.874 | 0.000 | 3.611 | 1001.286 | 0.297 | n/a | 0.102 | 0.000 | n/a | n/a | 41.062 | 14.286 | 0.684 | 41.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f00000000000001a6 | 1003.799 | 6.438 | n/a | 0.000 | 0.000 | 0.790 | 996.245 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.268 | 6.438 | 0.006 | 0.268 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000001a7 | 1003.333 | 0.240 | n/a | 0.000 | 0.000 | 0.958 | 1000.905 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 1.157 | 0.240 | 0.000 | 1.157 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000001c5 | 1003.283 | 0.145 | n/a | 0.000 | 0.000 | 0.603 | 1001.286 | 0.020 | n/a | 0.102 | 0.000 | n/a | n/a | 1.127 | 0.145 | 0.000 | 1.127 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f000000000000018b | 999.792 | 3.440 | n/a | 0.000 | 0.000 | 0.554 | 995.689 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.063 | 3.440 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f000000000000019a | 992.928 | 3.890 | n/a | 0.000 | 0.000 | 2.242 | 986.605 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.134 | 3.890 | 0.004 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000001c4 | 992.382 | 2.691 | n/a | 0.000 | 0.000 | 0.852 | 988.663 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.094 | 2.691 | 0.003 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f00000000000001a4 | 953.821 | 3.631 | n/a | 0.000 | 0.000 | 0.719 | 949.297 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.116 | 3.631 | 0.004 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f000000000000019d | 848.643 | 12.497 | n/a | 0.000 | 0.000 | 0.963 | 834.699 | 0.080 | n/a | 0.063 | 0.000 | n/a | n/a | 0.341 | 12.497 | 0.015 | 0.341 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000001c2 | 819.918 | 2.919 | n/a | 0.000 | 0.000 | 0.639 | 816.107 | 0.114 | n/a | 0.072 | 0.000 | n/a | n/a | 0.067 | 2.919 | 0.004 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000001d6 | 725.163 | 1.755 | n/a | 0.000 | 0.000 | 0.968 | 722.287 | 0.013 | n/a | 0.055 | 0.000 | n/a | n/a | 0.085 | 1.755 | 0.002 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000001b6 | 692.654 | 4.303 | n/a | 0.000 | 0.000 | 0.404 | 687.826 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.082 | 4.303 | 0.006 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f00000000000001b9 | 611.593 | 3.643 | n/a | 0.000 | 0.000 | 0.528 | 607.024 | 0.203 | n/a | 0.060 | 0.000 | n/a | n/a | 0.134 | 3.643 | 0.006 | 0.134 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001a0 | 607.509 | 7.628 | n/a | 0.000 | 0.000 | 1.087 | 598.336 | 0.152 | n/a | 0.088 | 0.000 | n/a | n/a | 0.218 | 7.628 | 0.013 | 0.218 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000001cf | 599.801 | 3.708 | n/a | 0.000 | 0.000 | 0.355 | 595.254 | 0.230 | n/a | 0.047 | 0.000 | n/a | n/a | 0.207 | 3.708 | 0.006 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000001c7 | 584.456 | 6.595 | n/a | 0.000 | 0.000 | 1.294 | 576.191 | 0.183 | n/a | 0.072 | 0.000 | n/a | n/a | 0.121 | 6.595 | 0.011 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000001d2 | 546.735 | 3.164 | n/a | 0.000 | 0.000 | 0.573 | 542.831 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.108 | 3.164 | 0.006 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000001b0 | 530.039 | 4.937 | n/a | 0.000 | 0.000 | 0.516 | 524.468 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.094 | 4.937 | 0.009 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000000199 | 521.486 | 3.702 | n/a | 0.000 | 0.000 | 0.495 | 516.790 | 0.182 | n/a | 0.058 | 0.000 | n/a | n/a | 0.260 | 3.702 | 0.007 | 0.260 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001a9 | 430.740 | 3.491 | n/a | 0.000 | 0.000 | 2.074 | 425.026 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.094 | 3.491 | 0.008 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001c8 | 414.618 | 12.412 | n/a | 1.874 | 0.000 | 0.530 | 399.470 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.289 | 14.286 | 0.034 | 0.289 | gw-r/thread-65/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 324.197 | n/a | n/a | n/a | 3.719 | n/a | 0.000 | 0.000 | 0.707 | 320.951 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.101 | 3.719 | 0.010 | 0.101 |
| p99 | 1003.405 | n/a | n/a | n/a | 12.814 | n/a | 0.000 | 0.000 | 4.261 | 1001.258 | 0.161 | n/a | 0.086 | 0.000 | n/a | n/a | 36.945 | 12.814 | 0.217 | 36.945 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f0000000000000218 | 1003.405 | 0.308 | n/a | 0.000 | 0.000 | 0.941 | 1000.970 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 1.121 | 0.308 | 0.000 | 1.121 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000001eb | 1003.295 | 0.151 | n/a | 0.000 | 0.000 | 0.652 | 1001.258 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 1.135 | 0.151 | 0.000 | 1.135 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000213 | 994.413 | 2.734 | n/a | 0.000 | 0.000 | 0.900 | 990.637 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.082 | 2.734 | 0.003 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000000214 | 993.682 | 6.438 | n/a | 0.000 | 0.000 | 0.727 | 986.338 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.118 | 6.438 | 0.006 | 0.118 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f000000000000021a | 991.719 | 2.762 | n/a | 0.000 | 0.000 | 0.584 | 988.194 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.098 | 2.762 | 0.003 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f0000000000000217 | 983.997 | 2.543 | n/a | 0.000 | 0.000 | 1.951 | 979.326 | 0.018 | n/a | 0.067 | 0.000 | n/a | n/a | 0.092 | 2.543 | 0.003 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000200 | 980.849 | 5.195 | n/a | 0.000 | 0.000 | 0.822 | 974.567 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.214 | 5.195 | 0.005 | 0.214 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000208 | 961.515 | 5.129 | n/a | 0.000 | 0.000 | 0.567 | 955.562 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.207 | 5.129 | 0.005 | 0.207 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001f9 | 930.194 | 2.358 | n/a | 0.000 | 0.000 | 0.649 | 926.941 | 0.123 | n/a | 0.044 | 0.000 | n/a | n/a | 0.079 | 2.358 | 0.003 | 0.079 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000000201 | 761.355 | 2.323 | n/a | 0.000 | 0.000 | 0.782 | 758.086 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.101 | 2.323 | 0.003 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001f6 | 722.963 | 2.627 | n/a | 0.000 | 0.000 | 0.598 | 719.604 | 0.012 | n/a | 0.044 | 0.000 | n/a | n/a | 0.078 | 2.627 | 0.004 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000204 | 706.071 | 4.162 | n/a | 0.000 | 0.000 | 0.707 | 701.055 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.104 | 4.162 | 0.006 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001ea | 696.736 | 2.833 | n/a | 0.000 | 0.000 | 0.794 | 692.875 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.158 | 2.833 | 0.004 | 0.158 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f00000000000001de | 692.265 | 4.885 | n/a | 0.000 | 0.000 | 3.635 | 683.521 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.167 | 4.885 | 0.007 | 0.167 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f00000000000001f2 | 687.334 | 2.116 | n/a | 0.000 | 0.000 | 2.324 | 682.608 | 0.156 | n/a | 0.046 | 0.000 | n/a | n/a | 0.084 | 2.116 | 0.003 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f00000000000001db | 565.616 | 4.018 | n/a | 0.000 | 0.000 | 0.832 | 560.592 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.110 | 4.018 | 0.007 | 0.110 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000000211 | 527.697 | 2.710 | n/a | 0.000 | 0.000 | 0.518 | 524.277 | 0.076 | n/a | 0.047 | 0.000 | n/a | n/a | 0.069 | 2.710 | 0.005 | 0.069 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f00000000000001f0 | 501.294 | 3.249 | n/a | 0.000 | 0.000 | 0.691 | 497.132 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.175 | 3.249 | 0.006 | 0.175 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f00000000000001e2 | 465.526 | 3.719 | n/a | 0.000 | 0.000 | 1.019 | 460.670 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.076 | 3.719 | 0.008 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f00000000000001fb | 434.700 | 12.814 | n/a | 0.000 | 0.000 | 2.870 | 418.591 | 0.158 | n/a | 0.057 | 0.000 | n/a | n/a | 0.209 | 12.814 | 0.029 | 0.209 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / internal (723 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.600 | n/a | n/a | n/a | 3.797 | n/a | 0.000 | 0.000 | 0.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.041 | 3.797 | 0.313 | 7.041 |
| p99 | 170.739 | n/a | n/a | n/a | 18.558 | n/a | 1.755 | 0.000 | 0.861 | 167.643 | 0.205 | n/a | 0.067 | 0.000 | n/a | n/a | 47.902 | 19.340 | 0.822 | 47.902 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f0000000000000226 | 970.077 | 2.662 | n/a | 0.000 | 0.000 | 0.586 | 966.605 | 0.112 | n/a | 0.034 | 0.000 | n/a | n/a | 0.079 | 2.662 | 0.003 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f000000000000021b | 834.314 | 1.731 | n/a | 0.000 | 0.000 | 0.628 | 831.833 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.076 | 1.731 | 0.002 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f0000000000000227 | 827.162 | 4.373 | n/a | 0.000 | 0.000 | 0.720 | 821.676 | 0.205 | n/a | 0.061 | 0.000 | n/a | n/a | 0.127 | 4.373 | 0.005 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000223 | 688.558 | 2.919 | n/a | 0.000 | 0.000 | 0.822 | 684.483 | 0.162 | n/a | 0.074 | 0.000 | n/a | n/a | 0.097 | 2.919 | 0.004 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f000000000000021e | 670.316 | 2.116 | n/a | 0.000 | 0.000 | 0.646 | 667.396 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.078 | 2.116 | 0.003 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000224 | 305.308 | 5.170 | n/a | 0.000 | 0.000 | 0.759 | 299.151 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.178 | 5.170 | 0.017 | 0.178 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f000000000000021f | 251.444 | 2.035 | n/a | 0.000 | 0.000 | 0.400 | 248.586 | 0.298 | n/a | 0.067 | 0.000 | n/a | n/a | 0.057 | 2.035 | 0.008 | 0.057 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f000000000000021c | 170.739 | 2.471 | n/a | 0.000 | 0.000 | 0.475 | 167.643 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.101 | 2.471 | 0.014 | 0.101 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000000319 | 145.700 | 4.617 | n/a | 0.000 | 0.000 | 0.929 | 139.717 | 0.010 | n/a | 0.297 | 0.000 | n/a | n/a | 0.130 | 4.617 | 0.032 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000000459 | 129.263 | 10.369 | n/a | 0.000 | 0.000 | 0.835 | 117.394 | 0.345 | n/a | 0.081 | 0.000 | n/a | n/a | 0.239 | 10.369 | 0.080 | 0.239 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f0000000000000310 | 121.271 | 6.330 | n/a | 0.000 | 0.000 | 0.929 | 113.664 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.241 | 6.330 | 0.052 | 0.241 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f0000000000000221 | 102.837 | 5.290 | n/a | 0.000 | 0.000 | 0.797 | 96.569 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.116 | 5.290 | 0.051 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000000738 | 92.072 | 6.925 | n/a | 0.000 | 0.000 | 0.825 | 84.007 | 0.119 | n/a | 0.019 | 0.000 | n/a | n/a | 0.177 | 6.925 | 0.075 | 0.177 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000647 | 91.203 | 6.876 | n/a | 0.000 | 0.000 | 0.840 | 83.369 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.083 | 6.876 | 0.075 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f00000000000005cc | 88.813 | 3.336 | n/a | 0.000 | 0.000 | 0.304 | 85.083 | 0.016 | n/a | 0.014 | 0.000 | n/a | n/a | 0.061 | 3.336 | 0.038 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000472 | 85.554 | 22.293 | n/a | 0.000 | 0.000 | 1.241 | 61.560 | 0.292 | n/a | 0.026 | 0.000 | n/a | n/a | 0.142 | 22.293 | 0.261 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000000615 | 85.117 | 3.318 | n/a | 0.000 | 0.000 | 0.476 | 81.202 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.074 | 3.318 | 0.039 | 0.074 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f000000000000077c | 84.768 | 2.470 | n/a | 0.000 | 0.000 | 0.637 | 81.326 | 0.117 | n/a | 0.023 | 0.000 | n/a | n/a | 0.194 | 2.470 | 0.029 | 0.194 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000000287 | 83.655 | 3.052 | n/a | 0.000 | 0.000 | 0.537 | 79.799 | 0.124 | n/a | 0.012 | 0.000 | n/a | n/a | 0.131 | 3.052 | 0.036 | 0.131 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f000000000000039a | 83.216 | 14.348 | n/a | 0.000 | 0.000 | 0.424 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.444 | 14.348 | 0.172 | 68.444 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / tail / internal (2297 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.359 | n/a | n/a | n/a | 4.275 | n/a | 0.000 | 0.000 | 0.254 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.323 | 4.297 | 0.360 | 6.323 |
| p99 | 340.622 | n/a | n/a | n/a | 18.575 | n/a | 1.759 | 0.000 | 1.161 | 337.490 | 0.131 | n/a | 0.039 | 0.000 | n/a | n/a | 47.470 | 18.575 | 0.844 | 47.470 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3bf40680f9371b4f0000000000001a77 | 1015.672 | 1.048 | n/a | 0.000 | 0.000 | 6.843 | 1006.409 | 0.050 | n/a | 0.044 | 0.000 | n/a | n/a | 1.278 | 1.048 | 0.001 | 1.278 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a81 | 1006.291 | 4.853 | n/a | 0.000 | 0.000 | 0.518 | 1000.773 | 0.003 | n/a | 0.036 | 0.000 | n/a | n/a | 0.107 | 4.853 | 0.005 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000001abc | 1004.748 | 0.307 | n/a | 0.000 | 0.000 | 0.915 | 1001.749 | 0.394 | n/a | 0.184 | 0.000 | n/a | n/a | 1.199 | 0.307 | 0.000 | 1.199 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000001ac5 | 1002.542 | 0.121 | n/a | 0.000 | 0.000 | 0.463 | 1000.810 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 1.096 | 0.121 | 0.000 | 1.096 | gw-r/thread-48/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a9a | 1002.521 | 0.104 | n/a | 0.000 | 0.000 | 0.472 | 1000.772 | 0.017 | n/a | 0.049 | 0.000 | n/a | n/a | 1.106 | 0.104 | 0.000 | 1.106 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a75 | 1002.397 | 0.097 | n/a | 0.000 | 0.000 | 0.465 | 1000.694 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 1.090 | 0.097 | 0.000 | 1.090 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000001ac1 | 976.927 | 5.190 | n/a | 0.000 | 0.000 | 0.687 | 970.710 | 0.111 | n/a | 0.034 | 0.000 | n/a | n/a | 0.195 | 5.190 | 0.005 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a8b | 914.448 | 6.301 | n/a | 0.000 | 0.000 | 0.360 | 907.589 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.168 | 6.301 | 0.007 | 0.168 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a7c | 887.740 | 4.779 | n/a | 0.000 | 0.000 | 0.493 | 882.314 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.120 | 4.779 | 0.005 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a9d | 845.310 | 2.936 | n/a | 0.000 | 0.000 | 0.573 | 841.618 | 0.071 | n/a | 0.031 | 0.000 | n/a | n/a | 0.081 | 2.936 | 0.003 | 0.081 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a96 | 701.582 | 3.507 | n/a | 0.000 | 0.000 | 0.484 | 697.351 | 0.082 | n/a | 0.027 | 0.000 | n/a | n/a | 0.132 | 3.507 | 0.005 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a91 | 684.034 | 2.386 | n/a | 0.000 | 0.000 | 0.367 | 681.177 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.056 | 2.386 | 0.003 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000001abe | 678.636 | 5.496 | n/a | 0.000 | 0.000 | 1.393 | 671.613 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.108 | 5.496 | 0.008 | 0.108 | gw-r/thread-65/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a79 | 645.138 | 11.591 | n/a | 0.000 | 0.000 | 0.782 | 632.311 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.384 | 11.591 | 0.018 | 0.384 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000001ab5 | 576.721 | 5.571 | n/a | 0.000 | 0.000 | 0.467 | 570.415 | 0.089 | n/a | 0.033 | 0.000 | n/a | n/a | 0.146 | 5.571 | 0.010 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a82 | 543.325 | 2.185 | n/a | 0.000 | 0.000 | 0.491 | 540.437 | 0.102 | n/a | 0.027 | 0.000 | n/a | n/a | 0.084 | 2.185 | 0.004 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 3bf40680f9371b4f0000000000001ab7 | 537.979 | 3.232 | n/a | 0.000 | 0.000 | 0.689 | 533.967 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.066 | 3.232 | 0.006 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 3bf40680f9371b4f0000000000001a9f | 520.694 | 11.630 | n/a | 1.371 | 0.000 | 0.489 | 506.682 | 0.012 | n/a | 0.042 | 0.000 | n/a | n/a | 0.467 | 13.001 | 0.025 | 0.467 | gw-r/thread-46/journal/page | none observed |
| 3bf40680f9371b4f0000000000001aab | 510.171 | 3.039 | n/a | 0.000 | 0.000 | 0.334 | 506.723 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.049 | 3.039 | 0.006 | 0.049 | gw-r/thread-50/journal/page | none observed |
| 3bf40680f9371b4f0000000000001ab8 | 451.534 | 2.001 | n/a | 0.000 | 0.000 | 0.326 | 449.043 | 0.085 | n/a | 0.024 | 0.000 | n/a | n/a | 0.055 | 2.001 | 0.004 | 0.055 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.210 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.046 | 0.015 | n/a | 0.127 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 |
| p99 | 213.940 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.518 | 213.249 | 7.368 | n/a | 0.599 | 0.000 | n/a | n/a | 0.459 | 0.000 | 0.000 | 0.459 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad152326000000000000002e | 213.940 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 213.249 | 0.051 | n/a | 0.103 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000000e | 205.391 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 204.223 | 0.014 | n/a | 0.172 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000011 | 203.972 | 0.000 | n/a | 0.000 | 0.000 | 1.184 | 201.976 | 0.017 | n/a | 0.599 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad152326000000000000004e | 203.960 | 0.000 | n/a | 0.000 | 0.000 | 2.321 | 201.278 | 0.012 | n/a | 0.124 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000009 | 203.945 | 0.000 | n/a | 0.000 | 0.000 | 1.818 | 201.489 | 0.019 | n/a | 0.161 | 0.000 | n/a | n/a | 0.459 | 0.000 | 0.000 | 0.459 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad1523260000000000000024 | 203.797 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 202.233 | 0.031 | n/a | 0.354 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000029 | 203.732 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 202.249 | 0.031 | n/a | 0.349 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000019 | 203.540 | 0.000 | n/a | 0.000 | 0.000 | 1.437 | 201.698 | 0.028 | n/a | 0.271 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000001f | 203.424 | 0.000 | n/a | 0.000 | 0.000 | 1.929 | 201.127 | 0.021 | n/a | 0.117 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000056 | 203.318 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 201.983 | 0.020 | n/a | 0.170 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000017 | 203.218 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.860 | 0.055 | n/a | 0.217 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000042 | 203.210 | 0.000 | n/a | 0.000 | 0.000 | 1.121 | 201.715 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000038 | 203.161 | 0.000 | n/a | 0.000 | 0.000 | 1.193 | 201.418 | 0.056 | n/a | 0.282 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000041 | 203.136 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.760 | 0.068 | n/a | 0.284 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000015 | 203.089 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.751 | 0.017 | n/a | 0.223 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad152326000000000000000d | 202.962 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 201.682 | 0.026 | n/a | 0.260 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad152326000000000000004b | 202.942 | 0.000 | n/a | 0.000 | 0.000 | 1.477 | 201.196 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000057 | 202.907 | 0.000 | n/a | 0.000 | 0.000 | 1.210 | 201.253 | 0.018 | n/a | 0.216 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000032 | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.490 | 200.998 | 0.013 | n/a | 0.133 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000001c | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 201.346 | 0.026 | n/a | 0.167 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.216 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 200.994 | 0.017 | n/a | 0.116 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 206.712 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.504 | 205.362 | 5.768 | n/a | 0.238 | 0.000 | n/a | n/a | 0.348 | 0.000 | 0.000 | 0.348 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad152326000000000000007e | 206.712 | 0.000 | n/a | 0.000 | 0.000 | 2.878 | 203.350 | 0.047 | n/a | 0.179 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000075 | 206.299 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 205.362 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000be | 205.758 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 204.533 | 0.021 | n/a | 0.193 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad152326000000000000006b | 205.732 | 0.000 | n/a | 0.000 | 0.000 | 4.504 | 200.912 | 0.014 | n/a | 0.108 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad15232600000000000000a3 | 204.267 | 0.000 | n/a | 0.000 | 0.000 | 1.448 | 202.307 | 0.090 | n/a | 0.218 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad15232600000000000000bd | 204.155 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 202.644 | 0.024 | n/a | 0.212 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad152326000000000000006c | 203.928 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 202.690 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000b6 | 203.928 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 202.426 | 0.055 | n/a | 0.159 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad15232600000000000000c0 | 203.645 | 0.000 | n/a | 0.000 | 0.000 | 1.281 | 201.863 | 0.026 | n/a | 0.224 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000095 | 203.465 | 0.000 | n/a | 0.000 | 0.000 | 2.072 | 201.072 | 0.016 | n/a | 0.116 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000079 | 203.339 | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 201.718 | 0.046 | n/a | 0.219 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad152326000000000000007d | 203.282 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 201.593 | 0.045 | n/a | 0.164 | 0.000 | n/a | n/a | 0.340 | 0.000 | 0.000 | 0.340 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad1523260000000000000062 | 203.217 | 0.000 | n/a | 0.000 | 0.000 | 1.378 | 201.486 | 0.021 | n/a | 0.149 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad152326000000000000008f | 203.110 | 0.000 | n/a | 0.000 | 0.000 | 1.403 | 201.326 | 0.023 | n/a | 0.119 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad152326000000000000009a | 202.968 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.532 | 0.041 | n/a | 0.226 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000092 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.893 | 0.042 | n/a | 0.215 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000061 | 202.798 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 201.663 | 0.021 | n/a | 0.233 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000096 | 202.794 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.535 | 0.024 | n/a | 0.207 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad15232600000000000000b8 | 202.761 | 0.000 | n/a | 0.000 | 0.000 | 1.120 | 201.335 | 0.010 | n/a | 0.147 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000091 | 202.757 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.404 | 0.016 | n/a | 0.204 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.092 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 201.053 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 204.663 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.140 | 203.278 | 3.514 | n/a | 0.206 | 0.000 | n/a | n/a | 0.600 | 0.000 | 0.000 | 0.600 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad15232600000000000000d1 | 204.663 | 0.000 | n/a | 0.000 | 0.000 | 1.046 | 203.278 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000000df | 204.635 | 0.000 | n/a | 0.000 | 0.000 | 2.140 | 201.896 | 0.016 | n/a | 0.140 | 0.000 | n/a | n/a | 0.443 | 0.000 | 0.000 | 0.443 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000000c4 | 203.743 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 202.741 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad1523260000000000000103 | 203.505 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 202.269 | 0.032 | n/a | 0.113 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad15232600000000000000e8 | 203.497 | 0.000 | n/a | 0.000 | 0.000 | 1.247 | 201.924 | 0.078 | n/a | 0.122 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000de | 203.170 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 201.789 | 0.017 | n/a | 0.134 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000010d | 203.081 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 201.668 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad15232600000000000000c2 | 203.034 | 0.000 | n/a | 0.000 | 0.000 | 1.546 | 201.101 | 0.018 | n/a | 0.206 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad15232600000000000000f7 | 202.851 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.398 | 0.011 | n/a | 0.179 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad15232600000000000000f0 | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.485 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-45/journal/page | none observed |
| 3abe0c10ad15232600000000000000fd | 202.693 | 0.000 | n/a | 0.000 | 0.000 | 1.164 | 201.182 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000cf | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.509 | 0.013 | n/a | 0.131 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000000e6 | 202.571 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.289 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000c5 | 202.514 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.595 | 0.016 | n/a | 0.158 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000011e | 202.490 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 201.394 | 0.016 | n/a | 0.089 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad15232600000000000000d9 | 202.483 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 201.385 | 0.027 | n/a | 0.152 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad15232600000000000000e7 | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.336 | 0.019 | n/a | 0.172 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad15232600000000000000ec | 202.440 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.344 | 0.010 | n/a | 0.119 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000e4 | 202.412 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.326 | 0.019 | n/a | 0.121 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000000d6 | 202.399 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 201.407 | 0.032 | n/a | 0.122 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.773 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 200.908 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 203.923 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.731 | 202.736 | 3.790 | n/a | 0.167 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad1523260000000000000152 | 203.923 | 0.000 | n/a | 0.000 | 0.000 | 2.731 | 201.017 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000177 | 203.596 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 202.736 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000171 | 203.300 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 202.101 | 0.082 | n/a | 0.103 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000129 | 203.270 | 0.000 | n/a | 0.000 | 0.000 | 1.876 | 201.118 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad152326000000000000016c | 202.926 | 0.000 | n/a | 0.000 | 0.000 | 1.115 | 201.395 | 0.028 | n/a | 0.113 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000188 | 202.740 | 0.000 | n/a | 0.000 | 0.000 | 1.260 | 201.209 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000016d | 202.685 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.721 | 0.016 | n/a | 0.167 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000018b | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 1.637 | 200.848 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000159 | 202.630 | 0.000 | n/a | 0.000 | 0.000 | 1.233 | 201.142 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad152326000000000000015d | 202.628 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 201.594 | 0.051 | n/a | 0.076 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000130 | 202.589 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 201.231 | 0.043 | n/a | 0.106 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000137 | 202.557 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 201.386 | 0.019 | n/a | 0.099 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000167 | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 201.548 | 0.018 | n/a | 0.102 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000138 | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 201.313 | 0.009 | n/a | 0.137 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000150 | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.286 | 0.008 | n/a | 0.095 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000014f | 202.371 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 201.448 | 0.010 | n/a | 0.114 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000142 | 202.289 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.235 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000175 | 202.272 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 201.046 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad152326000000000000017c | 202.250 | 0.000 | n/a | 0.000 | 0.000 | 0.499 | 201.522 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad152326000000000000016a | 202.237 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.251 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.762 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.787 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 |
| p99 | 203.633 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.710 | 202.164 | 2.102 | n/a | 0.231 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad15232600000000000001c2 | 225.379 | 0.000 | n/a | 0.000 | 0.000 | 24.198 | 200.946 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000001ae | 203.633 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 202.164 | 0.020 | n/a | 0.231 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad15232600000000000001c9 | 203.374 | 0.000 | n/a | 0.000 | 0.000 | 1.710 | 201.416 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000001a4 | 203.324 | 0.000 | n/a | 0.000 | 0.000 | 1.338 | 201.556 | 0.009 | n/a | 0.136 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad15232600000000000001a9 | 203.208 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 202.195 | 0.022 | n/a | 0.275 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000001a0 | 203.097 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.906 | 0.024 | n/a | 0.126 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad15232600000000000001e8 | 202.957 | 0.000 | n/a | 0.000 | 0.000 | 1.530 | 200.884 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.472 | 0.000 | 0.000 | 0.472 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000001e0 | 202.951 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 201.768 | 0.019 | n/a | 0.151 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad15232600000000000001aa | 202.834 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.688 | 0.020 | n/a | 0.098 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000191 | 202.768 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 201.655 | 0.011 | n/a | 0.123 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad15232600000000000001cf | 202.701 | 0.000 | n/a | 0.000 | 0.000 | 1.312 | 201.177 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad15232600000000000001f6 | 202.689 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 201.322 | 0.043 | n/a | 0.069 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000200 | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 200.999 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000019c | 202.558 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 201.335 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000001ed | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.456 | 0.049 | n/a | 0.096 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad15232600000000000001e4 | 202.473 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 201.093 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad152326000000000000019f | 202.472 | 0.000 | n/a | 0.000 | 0.000 | 1.574 | 200.691 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad15232600000000000001e7 | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 201.618 | 0.017 | n/a | 0.133 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad15232600000000000001ca | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 1.438 | 200.838 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad15232600000000000001d8 | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 201.658 | 0.049 | n/a | 0.124 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.614 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 200.810 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 204.306 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.008 | 202.637 | 4.161 | n/a | 0.177 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad1523260000000000000211 | 207.375 | 0.000 | n/a | 0.000 | 0.000 | 3.879 | 203.327 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000225 | 204.306 | 0.000 | n/a | 0.000 | 0.000 | 1.284 | 202.637 | 0.006 | n/a | 0.177 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000235 | 203.255 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 201.930 | 0.017 | n/a | 0.095 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad152326000000000000025b | 202.879 | 0.000 | n/a | 0.000 | 0.000 | 2.008 | 200.707 | 0.008 | n/a | 0.049 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000023f | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.311 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.290 | 0.000 | 0.000 | 0.290 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000230 | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 1.373 | 201.013 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000252 | 202.599 | 0.000 | n/a | 0.000 | 0.000 | 0.996 | 201.238 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000246 | 202.585 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 201.183 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000212 | 202.562 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 201.320 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000021a | 202.525 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 201.456 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad152326000000000000024e | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.323 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000224 | 202.336 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 201.282 | 0.040 | n/a | 0.118 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000261 | 202.323 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 201.419 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000269 | 202.322 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 201.167 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000227 | 202.285 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 201.141 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000231 | 202.260 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 201.220 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000236 | 202.239 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 201.086 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000242 | 202.233 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 201.298 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad152326000000000000021e | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 200.960 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad152326000000000000022b | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 201.478 | 0.029 | n/a | 0.075 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (65 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.977 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 69.738 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 204.439 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.707 | 203.777 | 6.444 | n/a | 0.236 | 0.000 | n/a | n/a | 62.840 | 0.000 | 0.000 | 62.840 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad1523260000000000000288 | 204.439 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 203.777 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000286 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 1.077 | 201.208 | 0.008 | n/a | 0.090 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad152326000000000000028c | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 0.972 | 201.225 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000290 | 202.274 | 0.000 | n/a | 0.000 | 0.000 | 0.503 | 201.486 | 0.014 | n/a | 0.131 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000291 | 202.246 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 201.178 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000027e | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 200.827 | 0.014 | n/a | 0.047 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad152326000000000000028b | 201.913 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.830 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000285 | 201.881 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 201.001 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000281 | 201.872 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.875 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad152326000000000000027a | 201.869 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 200.667 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000279 | 201.758 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 200.842 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad152326000000000000027d | 201.755 | 0.000 | n/a | 0.000 | 0.000 | 0.561 | 201.013 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000028f | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 200.892 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000028d | 201.476 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 200.695 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 3abe0c10ad1523260000000000000278 | 201.462 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 200.704 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad152326000000000000027f | 201.408 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 200.697 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000284 | 201.368 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 200.729 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad152326000000000000028a | 201.367 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 200.739 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad152326000000000000027b | 166.867 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 166.130 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad152326000000000000027c | 166.510 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 165.111 | 0.571 | n/a | 0.037 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / read (212 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.796 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 81.969 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 202.398 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.885 | 201.436 | 1.756 | n/a | 0.315 | 0.000 | n/a | n/a | 50.182 | 0.000 | 0.000 | 50.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3abe0c10ad1523260000000000000e81 | 210.636 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 208.609 | 0.935 | n/a | 0.315 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000e83 | 208.341 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 205.362 | 0.017 | n/a | 0.951 | 0.000 | n/a | n/a | 0.874 | 0.000 | 0.000 | 0.874 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000e8c | 202.398 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 201.436 | 0.011 | n/a | 0.146 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000ede | 202.272 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 199.870 | 0.005 | n/a | 1.598 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000e82 | 202.104 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.000 | 0.006 | n/a | 0.154 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000e85 | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 201.042 | 0.004 | n/a | 0.057 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000eaa | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 200.864 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000e9e | 201.929 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.874 | 0.004 | n/a | 0.077 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000eb7 | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 200.899 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000edd | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 200.713 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000e91 | 201.821 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 201.117 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000eb8 | 201.821 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 200.858 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000ea8 | 201.820 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 200.959 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 3abe0c10ad1523260000000000000ed9 | 201.781 | 0.000 | n/a | 0.000 | 0.000 | 0.744 | 200.812 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-65/journal/page | none observed |
| 3abe0c10ad1523260000000000000ef0 | 201.764 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 200.910 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 3abe0c10ad1523260000000000000ec7 | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.363 | 201.241 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000e93 | 201.725 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.865 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 3abe0c10ad1523260000000000000edf | 201.659 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.723 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-48/journal/page | none observed |
| 3abe0c10ad1523260000000000000ec4 | 201.616 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 200.714 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 3abe0c10ad1523260000000000000ee8 | 201.610 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 200.812 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
