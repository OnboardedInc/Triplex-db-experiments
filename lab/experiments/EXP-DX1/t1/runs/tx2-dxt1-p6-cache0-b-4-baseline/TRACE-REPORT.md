# Trace report

The slowest observed commits spent their largest exclusive interval in `tx/thread-87/transactor.triplex-function` (52.369 ms, trace `732c517d408b68c700000000000001ee`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (66.528 ms, trace `732c517d408b68c7000000000000013a`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (30.435 ms, trace `732c517d408b68c70000000000001654`); `gw-w/thread-45/gateway.admitted-work` (62.759 ms, trace `732c517d408b68c700000000000002c9`); `node-14/thread-0/driver.queue.subject` (58.409 ms, trace `732c517d408b68c7000000000000165a`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-cache0-b-4-baseline`; source `9ac79685c6286ce7a20f3d06be5556d314817f42`; subjects 10000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 17624306.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 193 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13371.533 | 237.440 | 8.687 | 454 |
| L1 | 0 | 19966.786 | 312.451 | 7.421 | 668 |
| L4 | 0 | 19977.047 | 289.762 | 4.836 | 628 |
| L16 | 0 | 19980.681 | 294.741 | 9.602 | 686 |
| L64 | 0 | 19870.644 | 436.593 | 4.483 | 847 |
| L256 | 0 | 19025.061 | 283.584 | 3.501 | 708 |
| L1024 | 0 | 19954.232 | 3153.414 | 18.944 | 16846 |
| tail | 0 | 64697.930 | 9867.865 | 63.312 | 53116 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 732c517d408b68c700000000000001ee | driver.queue.scheduler-late | 0.759 | none | 0 / 32 |
| 732c517d408b68c700000000000001ee | driver.queue.scheduler-dispatch | 0.076 | none | 0 / 32 |

Observed active steps while trace 732c517d408b68c700000000000001ee waited: []

| 732c517d408b68c7000000000000013a | driver.queue.scheduler-late | 0.628 | none | 0 / 32 |
| 732c517d408b68c7000000000000013a | driver.queue.scheduler-dispatch | 0.070 | none | 0 / 32 |

Observed active steps while trace 732c517d408b68c7000000000000013a waited: []

| 732c517d408b68c70000000000001654 | driver.queue.scheduler-late | 0.959 | none | 1 / 32 |
| 732c517d408b68c70000000000001654 | driver.queue.scheduler-dispatch | 0.008 | none | 1 / 32 |

Observed active steps while trace 732c517d408b68c70000000000001654 waited: []

| 732c517d408b68c700000000000002c9 | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |
| 732c517d408b68c700000000000002c9 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 732c517d408b68c700000000000002c9 waited: []

| 732c517d408b68c7000000000000165a | driver.queue.subject | 58.409 | 732c517d408b68c70000000000001657 | 4 / 32 |
| 732c517d408b68c7000000000000165a | driver.queue.scheduler-late | 0.767 | none | 4 / 32 |
| 732c517d408b68c7000000000000165a | driver.queue.scheduler-dispatch | 0.129 | none | 2 / 32 |

Observed active steps while trace 732c517d408b68c7000000000000165a waited: [{"at":1794663275979.0278,"inFlight":5,"capacity":32,"active":[{"traceId":"732c517d408b68c70000000000001654","step":"client.http"},{"traceId":"732c517d408b68c7000000000000165b","step":"client.http"},{"traceId":"732c517d408b68c7000000000000165c","step":"client.http"},{"traceId":"732c517d408b68c7000000000000165d","step":"client.http"},{"traceId":"732c517d408b68c70000000000001657","step":"client.http"}]},{"at":1794663275999.3384,"inFlight":4,"capacity":32,"active":[{"traceId":"732c517d408b68c70000000000001654","step":"client.http"},{"traceId":"732c517d408b68c7000000000000165d","step":"client.http"},{"traceId":"732c517d408b68c70000000000001657","step":"client.http"},{"traceId":"732c517d408b68c70000000000001663","step":"client.http"}]}]

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.878 | 0.210 | 0.000 | 0.533 | 4.158 | 0.530 | 0.000 | 0.155 | 1.587 | 7.446 | 0.036 | n/a | 0.330 | 9.699 | 3.895 | n/a | 0.028 | 4.977 | 0.176 | 0.028 |
| p99 | 67.792 | 4.727 | 0.096 | 4.502 | 16.281 | n/a | 4.260 | 3.014 | 2.522 | 19.230 | 0.122 | n/a | 5.275 | 23.533 | 14.591 | n/a | 0.163 | 16.870 | 0.394 | 0.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000000ef | 67.792 | 9.938 | n/a | 1.635 | 0.448 | 1.731 | 10.412 | 0.065 | n/a | 5.275 | 23.533 | 14.591 | n/a | 0.163 | 12.022 | 0.177 | 0.163 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000000f3 | 60.606 | 16.281 | 0.530 | 0.000 | 0.059 | 1.789 | 19.230 | 0.122 | n/a | 0.213 | 13.564 | 8.790 | n/a | 0.028 | 16.870 | 0.278 | 0.028 | gw-w/thread-47/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000000f7 | 50.950 | 8.859 | 0.216 | 0.000 | 0.057 | 2.210 | 15.686 | 0.087 | n/a | 0.119 | 11.333 | 12.350 | n/a | 0.033 | 9.132 | 0.179 | 0.033 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000000fa | 40.463 | 4.091 | 0.241 | 0.000 | 0.155 | 2.522 | 14.454 | 0.073 | n/a | 0.249 | 11.284 | 7.340 | n/a | 0.056 | 4.486 | 0.111 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.112ms |
| 732c517d408b68c70000000000000106 | 37.456 | 9.385 | n/a | 4.260 | 1.094 | 1.155 | 6.176 | 0.032 | n/a | 0.127 | 10.120 | 5.041 | n/a | 0.066 | 14.739 | 0.394 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000103 | 36.818 | 5.905 | 0.250 | 0.000 | 0.137 | 1.366 | 7.446 | 0.029 | n/a | 0.324 | 17.561 | 3.751 | n/a | 0.049 | 6.292 | 0.171 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000000f9 | 36.102 | 4.866 | n/a | 0.000 | 0.300 | 1.365 | 8.929 | 0.114 | n/a | 0.888 | 15.278 | 4.301 | n/a | 0.062 | 5.167 | 0.143 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000119 | 35.468 | 4.086 | 0.155 | 0.397 | 0.053 | 1.488 | 12.095 | 0.067 | n/a | 0.107 | 13.376 | 3.620 | n/a | 0.022 | 4.692 | 0.132 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000000fd | 35.007 | 4.633 | 0.315 | 0.000 | 0.045 | 2.098 | 13.468 | 0.031 | n/a | 0.330 | 9.699 | 4.361 | n/a | 0.027 | 4.994 | 0.143 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000105 | 34.146 | 4.641 | 0.284 | 0.000 | 0.053 | 1.659 | 9.047 | 0.050 | n/a | 0.132 | 12.277 | 5.981 | n/a | 0.023 | 4.977 | 0.146 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000100 | 32.577 | 4.290 | n/a | 0.000 | 1.029 | 1.254 | 4.715 | 0.066 | n/a | 0.245 | 14.122 | 6.829 | n/a | 0.028 | 5.319 | 0.163 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000010f | 32.507 | 5.900 | 0.286 | 0.000 | 0.057 | 1.829 | 10.609 | 0.035 | n/a | 0.467 | 8.701 | 4.602 | n/a | 0.022 | 6.242 | 0.192 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000116 | 32.447 | 7.159 | n/a | 2.308 | 0.969 | 2.161 | 3.267 | 0.083 | n/a | 0.923 | 11.298 | 4.250 | n/a | 0.031 | 10.435 | 0.322 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000010b | 32.446 | 5.544 | 0.316 | 0.000 | 0.042 | 1.587 | 11.568 | 0.080 | n/a | 0.143 | 9.332 | 3.812 | n/a | 0.020 | 5.903 | 0.182 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000121 | 30.878 | 5.229 | 0.206 | 0.000 | 0.063 | 2.156 | 7.426 | 0.031 | n/a | 3.645 | 8.199 | 3.895 | n/a | 0.028 | 5.498 | 0.178 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000112 | 29.910 | 2.686 | n/a | 0.000 | 0.135 | 1.106 | 1.651 | 0.036 | n/a | 0.445 | 20.499 | 3.324 | n/a | 0.029 | 2.821 | 0.094 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000125 | 29.372 | 3.930 | 0.299 | 0.000 | 0.067 | 1.688 | 11.004 | 0.045 | n/a | 0.643 | 7.750 | 3.914 | n/a | 0.032 | 4.296 | 0.146 | 0.032 | gw-w/thread-48/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000108 | 26.396 | 3.304 | n/a | 0.000 | 0.625 | 2.132 | 6.077 | 0.063 | n/a | 0.205 | 8.631 | 5.329 | n/a | 0.030 | 3.929 | 0.149 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000115 | 25.930 | 4.158 | 0.275 | 0.000 | 0.064 | 1.657 | 9.858 | 0.032 | n/a | 0.097 | 6.123 | 3.643 | n/a | 0.023 | 4.497 | 0.173 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000011d | 25.884 | 4.007 | 0.289 | 0.000 | 0.271 | 1.581 | 8.061 | 0.035 | n/a | 0.488 | 7.107 | 3.969 | n/a | 0.076 | 4.567 | 0.176 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.655 | 0.996 | 0.000 | 0.729 | 2.686 | n/a | 0.000 | 0.900 | 0.938 | 1.651 | 0.026 | n/a | 0.651 | 8.433 | 1.029 | n/a | 0.029 | 3.251 | 0.190 | 0.029 |
| p99 | 36.102 | 1.004 | 0.000 | 0.937 | 4.866 | n/a | 0.000 | 3.014 | 1.680 | 8.929 | 0.114 | n/a | 3.009 | 20.499 | 4.301 | n/a | 0.062 | 7.134 | 0.330 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000000f9 | 36.102 | 4.866 | n/a | 0.000 | 0.300 | 1.365 | 8.929 | 0.114 | n/a | 0.888 | 15.278 | 4.301 | n/a | 0.062 | 5.167 | 0.143 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000112 | 29.910 | 2.686 | n/a | 0.000 | 0.135 | 1.106 | 1.651 | 0.036 | n/a | 0.445 | 20.499 | 3.324 | n/a | 0.029 | 2.821 | 0.094 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000110 | 21.618 | 4.119 | n/a | 0.000 | 3.014 | 1.093 | 1.519 | 0.020 | n/a | 0.445 | 10.331 | 1.029 | n/a | 0.049 | 7.134 | 0.330 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000126 | 19.892 | 1.782 | n/a | 0.000 | 1.097 | 0.626 | 1.279 | 0.018 | n/a | 0.723 | 13.360 | 0.987 | n/a | 0.019 | 2.879 | 0.145 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000011e | 19.655 | 3.187 | n/a | 0.000 | 1.133 | 0.938 | 3.916 | 0.020 | n/a | 0.077 | 6.650 | 3.703 | n/a | 0.031 | 4.320 | 0.220 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000122 | 17.115 | 2.351 | n/a | 0.000 | 0.900 | 1.680 | 1.796 | 0.026 | n/a | 0.651 | 8.433 | 1.254 | n/a | 0.024 | 3.251 | 0.190 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000000f5 | 16.775 | 2.475 | n/a | 0.000 | 1.223 | 0.803 | 2.135 | 0.048 | n/a | 2.002 | 7.280 | 0.785 | n/a | 0.026 | 3.697 | 0.220 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000000fe | 13.943 | 1.929 | n/a | 0.000 | 0.199 | 0.604 | 1.371 | 0.019 | n/a | 3.009 | 5.789 | 0.993 | n/a | 0.031 | 2.128 | 0.153 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000011a | 13.588 | 2.849 | n/a | 0.000 | 0.306 | 0.918 | 1.259 | 0.036 | n/a | 0.086 | 7.608 | 0.503 | n/a | 0.023 | 3.155 | 0.232 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.855 | 0.255 | 0.000 | 0.394 | 4.930 | 0.195 | 0.000 | 0.056 | 1.945 | 12.372 | 0.098 | n/a | 0.727 | 9.844 | 3.666 | n/a | 0.023 | 5.181 | 0.153 | 0.023 |
| p99 | 33.855 | 0.255 | 0.000 | 0.394 | 4.930 | 0.195 | 0.000 | 0.056 | 1.945 | 12.372 | 0.098 | n/a | 0.727 | 9.844 | 3.666 | n/a | 0.023 | 5.181 | 0.153 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000000129 | 33.855 | 4.930 | 0.195 | 0.000 | 0.056 | 1.945 | 12.372 | 0.098 | n/a | 0.727 | 9.844 | 3.666 | n/a | 0.023 | 5.181 | 0.153 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.540 | 0.322 | 0.000 | 0.529 | 3.442 | n/a | 0.000 | 0.156 | 1.267 | 4.586 | 0.030 | n/a | 0.164 | 7.978 | 3.851 | n/a | 0.025 | 3.967 | 0.187 | 0.025 |
| p99 | 97.821 | 3.432 | 0.000 | 3.148 | 7.431 | n/a | 3.491 | 8.237 | 6.732 | 14.388 | 0.163 | n/a | 2.587 | 66.528 | 15.710 | n/a | 0.072 | 11.255 | 0.549 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c7000000000000013a | 97.821 | 4.720 | n/a | 0.000 | 0.698 | 2.207 | 7.830 | 0.025 | n/a | 0.072 | 66.528 | 15.710 | n/a | 0.031 | 5.417 | 0.055 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000137 | 46.050 | 4.675 | 0.271 | 0.000 | 0.111 | 1.528 | 11.878 | 0.063 | n/a | 0.766 | 13.800 | 12.917 | n/a | 0.042 | 5.057 | 0.110 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000133 | 42.998 | 4.435 | 0.233 | 0.706 | 0.042 | 6.732 | 6.066 | 0.027 | n/a | 0.112 | 18.215 | 6.411 | n/a | 0.019 | 5.417 | 0.126 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.152ms |
| 732c517d408b68c70000000000000145 | 40.972 | 3.253 | 0.248 | 0.000 | 0.037 | 2.224 | 8.478 | 0.032 | n/a | 0.072 | 18.543 | 8.070 | n/a | 0.017 | 3.537 | 0.086 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000012b | 35.267 | 6.431 | 0.244 | 0.323 | 0.058 | 1.359 | 9.264 | 0.065 | n/a | 0.164 | 7.749 | 9.586 | n/a | 0.024 | 7.055 | 0.200 | 0.024 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c7000000000000013d | 34.862 | 3.061 | 0.160 | 0.000 | 0.053 | 1.388 | 12.088 | 0.092 | n/a | 0.452 | 10.494 | 7.054 | n/a | 0.020 | 3.273 | 0.094 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000016b | 33.543 | 5.591 | 0.244 | 0.486 | 0.156 | 1.464 | 6.019 | 0.034 | n/a | 0.520 | 9.717 | 9.261 | n/a | 0.052 | 6.477 | 0.193 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000012d | 33.130 | 3.404 | 0.256 | 0.000 | 0.048 | 1.045 | 14.388 | 0.030 | n/a | 0.072 | 7.826 | 6.039 | n/a | 0.022 | 3.708 | 0.112 | 0.022 | gw-w/thread-48/gateway.admitted-work | none observed |
| 732c517d408b68c7000000000000013f | 32.084 | 3.320 | 0.252 | 0.000 | 0.047 | 1.081 | 11.623 | 0.034 | n/a | 0.396 | 11.023 | 4.287 | n/a | 0.022 | 3.619 | 0.113 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000141 | 32.069 | 3.869 | 0.375 | 0.000 | 0.121 | 1.491 | 5.436 | 0.030 | n/a | 0.418 | 15.801 | 4.478 | n/a | 0.049 | 4.365 | 0.136 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000015c | 31.666 | 4.238 | 0.145 | 3.491 | 0.042 | 1.402 | 9.420 | 0.045 | n/a | 0.479 | 7.978 | 4.409 | n/a | 0.017 | 7.916 | 0.250 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.783ms |
| 732c517d408b68c7000000000000014a | 30.665 | 4.840 | n/a | 0.000 | 0.653 | 1.762 | 6.930 | 0.102 | n/a | 0.303 | 11.300 | 4.703 | n/a | 0.072 | 5.493 | 0.179 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000132 | 28.874 | 3.027 | n/a | 0.000 | 0.775 | 0.868 | 1.243 | 0.019 | n/a | 0.102 | 14.646 | 8.167 | n/a | 0.028 | 3.801 | 0.132 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000167 | 28.518 | 3.281 | 0.188 | 0.260 | 0.046 | 1.183 | 6.131 | 0.036 | n/a | 0.085 | 12.696 | 4.591 | n/a | 0.021 | 3.775 | 0.132 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000149 | 28.514 | 4.028 | 0.315 | 0.000 | 0.047 | 1.180 | 5.316 | 0.030 | n/a | 0.782 | 10.454 | 6.333 | n/a | 0.028 | 4.391 | 0.154 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000174 | 27.243 | 7.431 | n/a | 2.248 | 0.166 | 2.070 | 4.188 | 0.068 | n/a | 0.233 | 9.619 | 1.188 | n/a | 0.031 | 9.845 | 0.361 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000142 | 26.821 | 3.404 | n/a | 0.000 | 0.434 | 4.889 | 3.128 | 0.074 | n/a | 0.183 | 11.882 | 2.788 | n/a | 0.039 | 3.838 | 0.143 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000014d | 26.734 | 4.863 | 0.200 | 0.759 | 0.056 | 1.776 | 9.113 | 0.046 | n/a | 0.110 | 6.210 | 3.566 | n/a | 0.036 | 5.877 | 0.220 | 0.036 | gw-w/thread-41/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000179 | 24.914 | 4.309 | 0.245 | 0.344 | 0.040 | 1.201 | 9.886 | 0.038 | n/a | 0.125 | 5.289 | 3.419 | n/a | 0.018 | 4.938 | 0.198 | 0.018 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000156 | 24.675 | 5.046 | n/a | 0.000 | 0.900 | 1.976 | 1.711 | 0.024 | n/a | 0.133 | 9.667 | 5.188 | n/a | 0.029 | 5.946 | 0.241 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.708 | 0.000 | 0.000 | 0.447 | 2.665 | n/a | 0.000 | 0.606 | 0.868 | 1.243 | 0.021 | n/a | 0.102 | 6.575 | 0.837 | n/a | 0.033 | 3.271 | 0.204 | 0.033 |
| p99 | 28.874 | 1.003 | 0.000 | 0.958 | 6.863 | n/a | 0.000 | 8.237 | 5.077 | 5.399 | 0.163 | n/a | 0.715 | 14.646 | 8.167 | n/a | 0.059 | 11.255 | 0.549 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000000132 | 28.874 | 3.027 | n/a | 0.000 | 0.775 | 0.868 | 1.243 | 0.019 | n/a | 0.102 | 14.646 | 8.167 | n/a | 0.028 | 3.801 | 0.132 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000135 | 24.371 | 6.863 | n/a | 0.000 | 1.117 | 5.077 | 5.399 | 0.065 | n/a | 0.715 | 4.610 | 0.472 | n/a | 0.054 | 7.980 | 0.327 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000146 | 20.646 | 3.744 | n/a | 0.000 | 0.478 | 1.881 | 2.221 | 0.030 | n/a | 0.141 | 8.242 | 3.851 | n/a | 0.058 | 4.222 | 0.204 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000175 | 20.493 | 3.019 | n/a | 0.000 | 8.237 | 0.863 | 1.666 | 0.021 | n/a | 0.341 | 5.823 | 0.490 | n/a | 0.033 | 11.255 | 0.549 | 0.033 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.258ms; driver.publication.persist-deferred 1.086ms |
| 732c517d408b68c7000000000000016c | 17.708 | 2.665 | n/a | 0.000 | 0.606 | 1.672 | 4.220 | 0.163 | n/a | 0.467 | 6.915 | 0.942 | n/a | 0.059 | 3.271 | 0.185 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000015b | 16.102 | 1.832 | n/a | 0.000 | 0.705 | 0.427 | 0.967 | 0.019 | n/a | 0.075 | 9.876 | 2.186 | n/a | 0.016 | 2.537 | 0.158 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000160 | 12.454 | 2.420 | n/a | 0.000 | 0.342 | 1.169 | 0.980 | 0.019 | n/a | 0.071 | 6.575 | 0.837 | n/a | 0.040 | 2.762 | 0.222 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000150 | 9.356 | 1.943 | n/a | 0.000 | 0.300 | 0.730 | 1.067 | 0.021 | n/a | 0.080 | 4.656 | 0.538 | n/a | 0.022 | 2.242 | 0.240 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.510 | 0.143 | 0.000 | 0.501 | 3.578 | 0.380 | 0.000 | 0.190 | 1.365 | 6.006 | 0.030 | n/a | 0.153 | 7.036 | 3.967 | n/a | 0.034 | 4.262 | 0.173 | 0.034 |
| p99 | 73.447 | 3.533 | 0.000 | 3.497 | 11.615 | n/a | 2.078 | 1.127 | 4.926 | 26.076 | 0.249 | n/a | 1.302 | 33.932 | 43.987 | n/a | 0.091 | 12.521 | 0.380 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000000195 | 73.447 | 4.767 | 0.261 | 0.208 | 0.100 | 1.370 | 8.776 | 0.249 | n/a | 0.590 | 13.102 | 43.987 | n/a | 0.036 | 5.336 | 0.073 | 0.036 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000180 | 60.974 | 2.956 | n/a | 0.000 | 0.381 | 1.176 | 19.900 | 0.032 | n/a | 0.131 | 33.932 | 2.430 | n/a | 0.037 | 3.337 | 0.055 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000181 | 49.698 | 4.387 | 0.236 | 0.000 | 0.075 | 4.689 | 26.076 | 0.027 | n/a | 0.071 | 5.288 | 8.825 | n/a | 0.024 | 4.698 | 0.095 | 0.024 | gw-w/thread-46/gateway.admitted-work | driver.publication.persist-deferred 1.121ms |
| 732c517d408b68c700000000000001a7 | 35.294 | 3.165 | 0.204 | 0.265 | 0.081 | 4.926 | 14.626 | 0.046 | n/a | 0.519 | 6.091 | 5.332 | n/a | 0.039 | 3.714 | 0.105 | 0.039 | gw-w/thread-41/gateway.admitted-work | none observed |
| 732c517d408b68c7000000000000019b | 34.908 | 5.259 | 0.380 | 0.000 | 0.079 | 2.554 | 13.606 | 0.142 | n/a | 1.302 | 8.202 | 3.333 | n/a | 0.052 | 5.718 | 0.164 | 0.052 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000001bf | 34.823 | 3.578 | 0.279 | 0.222 | 0.084 | 3.406 | 16.135 | 0.030 | n/a | 0.136 | 6.852 | 4.061 | n/a | 0.041 | 4.162 | 0.120 | 0.041 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000001bb | 34.766 | 3.270 | 0.152 | 0.318 | 0.051 | 1.329 | 11.082 | 0.042 | n/a | 0.098 | 11.725 | 6.668 | n/a | 0.030 | 3.792 | 0.109 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001a1 | 33.522 | 11.615 | 0.357 | 0.434 | 0.115 | 2.153 | 6.245 | 0.047 | n/a | 0.110 | 9.189 | 3.210 | n/a | 0.047 | 12.521 | 0.374 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000199 | 33.295 | 3.810 | 0.345 | 0.355 | 0.190 | 2.057 | 15.014 | 0.052 | n/a | 0.152 | 6.054 | 5.184 | n/a | 0.081 | 4.700 | 0.141 | 0.081 | gw-w/thread-47/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000185 | 31.720 | 4.054 | 0.156 | 0.000 | 0.052 | 1.365 | 8.848 | 0.029 | n/a | 0.104 | 9.395 | 7.688 | n/a | 0.028 | 4.262 | 0.134 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000017f | 31.581 | 4.366 | 0.162 | 0.000 | 0.047 | 1.768 | 11.002 | 0.052 | n/a | 0.173 | 5.906 | 8.079 | n/a | 0.024 | 4.575 | 0.145 | 0.024 | gw-w/thread-45/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000187 | 28.631 | 3.074 | n/a | 0.000 | 0.295 | 0.827 | 11.519 | 0.028 | n/a | 0.068 | 6.750 | 6.037 | n/a | 0.033 | 3.369 | 0.118 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001b7 | 27.765 | 4.910 | 0.358 | 0.403 | 0.074 | 1.714 | 6.031 | 0.035 | n/a | 0.142 | 10.368 | 3.691 | n/a | 0.037 | 5.746 | 0.207 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000019f | 27.650 | 4.704 | 0.296 | 0.442 | 0.136 | 1.406 | 9.845 | 0.029 | n/a | 0.087 | 7.036 | 3.618 | n/a | 0.051 | 5.578 | 0.202 | 0.051 | gw-w/thread-47/gateway.admitted-work | none observed |
| 732c517d408b68c7000000000000018f | 27.239 | 3.914 | 0.338 | 0.273 | 0.190 | 1.636 | 6.183 | 0.042 | n/a | 0.137 | 7.066 | 7.395 | n/a | 0.065 | 4.715 | 0.173 | 0.065 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001a3 | 27.045 | 3.445 | 0.216 | 0.376 | 0.075 | 1.440 | 8.375 | 0.052 | n/a | 0.131 | 8.178 | 4.729 | n/a | 0.028 | 4.112 | 0.152 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000018d | 26.989 | 3.414 | 0.275 | 0.000 | 0.053 | 4.009 | 6.399 | 0.029 | n/a | 0.316 | 5.926 | 6.547 | n/a | 0.021 | 3.742 | 0.139 | 0.021 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001b5 | 26.948 | 4.757 | n/a | 0.000 | 1.109 | 0.719 | 2.022 | 0.019 | n/a | 0.502 | 12.477 | 5.312 | n/a | 0.031 | 5.866 | 0.218 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001c1 | 26.336 | 2.833 | n/a | 0.000 | 0.454 | 0.918 | 1.320 | 0.021 | n/a | 0.374 | 12.823 | 7.566 | n/a | 0.027 | 3.288 | 0.125 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001b9 | 25.510 | 4.170 | n/a | 0.000 | 0.799 | 1.259 | 1.742 | 0.030 | n/a | 0.270 | 10.188 | 6.963 | n/a | 0.090 | 4.969 | 0.195 | 0.090 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.912 | 0.620 | 0.000 | 0.434 | 1.963 | n/a | 0.000 | 0.404 | 0.820 | 1.612 | 0.023 | n/a | 0.131 | 6.792 | 2.263 | n/a | 0.030 | 2.396 | 0.162 | 0.030 |
| p99 | 60.974 | 1.002 | 0.000 | 0.733 | 3.985 | n/a | 0.000 | 1.127 | 1.724 | 19.900 | 0.069 | n/a | 0.710 | 33.932 | 7.981 | n/a | 0.060 | 5.112 | 0.269 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000000180 | 60.974 | 2.956 | n/a | 0.000 | 0.381 | 1.176 | 19.900 | 0.032 | n/a | 0.131 | 33.932 | 2.430 | n/a | 0.037 | 3.337 | 0.055 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000018b | 21.497 | 2.099 | n/a | 0.000 | 0.268 | 0.988 | 1.828 | 0.051 | n/a | 0.710 | 7.546 | 7.981 | n/a | 0.026 | 2.368 | 0.110 | 0.026 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c7000000000000017c | 18.982 | 3.985 | n/a | 0.000 | 1.127 | 1.055 | 1.612 | 0.023 | n/a | 0.138 | 7.014 | 3.967 | n/a | 0.060 | 5.112 | 0.269 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001bd | 17.557 | 2.606 | n/a | 0.000 | 0.813 | 1.724 | 1.471 | 0.056 | n/a | 0.678 | 7.900 | 2.263 | n/a | 0.046 | 3.419 | 0.195 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001c7 | 16.347 | 1.686 | n/a | 0.000 | 0.259 | 0.684 | 4.839 | 0.023 | n/a | 0.128 | 8.208 | 0.487 | n/a | 0.034 | 1.945 | 0.119 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000193 | 15.912 | 1.834 | n/a | 0.000 | 0.188 | 0.601 | 1.021 | 0.019 | n/a | 0.124 | 5.372 | 6.736 | n/a | 0.016 | 2.022 | 0.127 | 0.016 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001c5 | 14.764 | 1.883 | n/a | 0.000 | 0.513 | 0.512 | 1.583 | 0.069 | n/a | 0.263 | 6.298 | 3.614 | n/a | 0.030 | 2.396 | 0.162 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001af | 13.392 | 2.483 | n/a | 0.000 | 0.488 | 0.767 | 1.808 | 0.022 | n/a | 0.164 | 6.531 | 1.079 | n/a | 0.052 | 2.971 | 0.222 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001a5 | 12.879 | 1.871 | n/a | 0.000 | 0.862 | 0.820 | 4.448 | 0.021 | n/a | 0.081 | 4.281 | 0.469 | n/a | 0.026 | 2.732 | 0.212 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000191 | 11.992 | 1.963 | n/a | 0.000 | 0.404 | 0.837 | 1.235 | 0.024 | n/a | 0.128 | 6.792 | 0.580 | n/a | 0.030 | 2.367 | 0.197 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.249 | 0.000 | 0.000 | 0.396 | 3.496 | n/a | 0.000 | 0.155 | 1.391 | 3.809 | 0.033 | n/a | 0.285 | 7.470 | 4.395 | n/a | 0.032 | 4.276 | 0.172 | 0.032 |
| p99 | 102.216 | 1.993 | 0.000 | 2.304 | 11.574 | n/a | 0.640 | 1.121 | 7.071 | 17.480 | 0.126 | n/a | 4.234 | 15.591 | 52.369 | n/a | 0.099 | 12.408 | 0.306 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000001ee | 102.216 | 11.574 | n/a | 0.000 | 0.834 | 3.712 | 17.480 | 0.126 | n/a | 0.499 | 15.591 | 52.369 | n/a | 0.031 | 12.408 | 0.121 | 0.031 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001dc | 47.417 | 4.282 | 0.156 | 0.000 | 0.047 | 7.071 | 17.248 | 0.109 | n/a | 0.285 | 9.326 | 8.870 | n/a | 0.023 | 4.484 | 0.095 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000219 | 44.507 | 4.688 | 0.362 | 0.418 | 0.073 | 5.626 | 15.484 | 0.050 | n/a | 0.414 | 7.675 | 9.687 | n/a | 0.031 | 5.540 | 0.124 | 0.031 | gw-w/thread-46/gateway.admitted-work | none observed |
| 732c517d408b68c7000000000000020f | 40.303 | 3.409 | 0.214 | 0.509 | 0.080 | 2.252 | 16.883 | 0.105 | n/a | 0.237 | 9.655 | 6.928 | n/a | 0.032 | 4.212 | 0.105 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001d5 | 39.407 | 6.082 | 0.205 | 0.000 | 0.102 | 4.769 | 10.198 | 0.028 | n/a | 1.765 | 7.106 | 9.107 | n/a | 0.047 | 6.389 | 0.162 | 0.047 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000215 | 35.569 | 8.066 | 0.227 | 0.339 | 0.167 | 1.480 | 9.900 | 0.045 | n/a | 0.101 | 10.876 | 4.310 | n/a | 0.058 | 8.799 | 0.247 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000205 | 35.334 | 3.601 | 1.390 | 0.282 | 0.080 | 1.683 | 6.714 | 0.035 | n/a | 0.119 | 9.822 | 11.580 | n/a | 0.029 | 5.353 | 0.151 | 0.029 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001d1 | 34.814 | 1.820 | n/a | 0.000 | 0.227 | 4.534 | 1.625 | 0.052 | n/a | 4.234 | 14.148 | 8.142 | n/a | 0.032 | 2.047 | 0.059 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.608ms; driver.publication.persist-deferred 0.954ms |
| 732c517d408b68c70000000000000209 | 31.463 | 3.823 | 0.197 | 0.269 | 0.090 | 2.401 | 12.472 | 0.047 | n/a | 0.480 | 7.439 | 4.205 | n/a | 0.038 | 4.380 | 0.139 | 0.038 | gw-w/thread-47/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000001da | 29.597 | 2.050 | n/a | 0.000 | 0.981 | 2.083 | 6.200 | 0.055 | n/a | 0.110 | 9.024 | 9.059 | n/a | 0.033 | 3.031 | 0.102 | 0.033 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001f0 | 29.036 | 3.946 | 1.171 | 0.289 | 0.080 | 1.183 | 8.782 | 0.029 | n/a | 0.078 | 8.833 | 4.603 | n/a | 0.042 | 5.486 | 0.189 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001f9 | 28.532 | 3.596 | 0.197 | 0.407 | 0.077 | 1.375 | 7.372 | 0.033 | n/a | 0.131 | 9.689 | 5.625 | n/a | 0.032 | 4.276 | 0.150 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001ec | 27.928 | 3.466 | 0.736 | 0.534 | 0.067 | 2.075 | 6.901 | 0.038 | n/a | 0.146 | 6.341 | 7.586 | n/a | 0.039 | 4.802 | 0.172 | 0.039 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000201 | 27.642 | 3.431 | 0.235 | 0.270 | 0.148 | 1.607 | 9.036 | 0.033 | n/a | 0.388 | 8.108 | 4.327 | n/a | 0.058 | 4.083 | 0.148 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001d8 | 27.491 | 3.496 | 0.204 | 0.359 | 0.078 | 1.391 | 6.991 | 0.033 | n/a | 0.458 | 9.189 | 5.255 | n/a | 0.038 | 4.136 | 0.150 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000217 | 26.045 | 3.532 | 0.213 | 0.282 | 0.076 | 5.075 | 10.842 | 0.056 | n/a | 0.539 | 4.539 | 0.862 | n/a | 0.030 | 4.103 | 0.158 | 0.030 | gw-w/thread-44/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000001cd | 24.887 | 3.742 | n/a | 0.000 | 0.873 | 1.038 | 1.227 | 0.021 | n/a | 0.496 | 13.123 | 4.335 | n/a | 0.030 | 4.615 | 0.185 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001f7 | 23.514 | 3.748 | 0.236 | 0.250 | 0.155 | 1.513 | 6.399 | 0.034 | n/a | 0.952 | 6.681 | 3.489 | n/a | 0.058 | 4.389 | 0.187 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000021d | 23.295 | 3.690 | 0.298 | 0.292 | 0.066 | 1.912 | 6.272 | 0.042 | n/a | 1.191 | 5.989 | 3.520 | n/a | 0.022 | 4.347 | 0.187 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001cb | 23.263 | 3.664 | n/a | 0.000 | 1.121 | 1.250 | 1.400 | 0.030 | n/a | 0.638 | 10.513 | 4.551 | n/a | 0.099 | 4.784 | 0.206 | 0.099 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.016 | 0.000 | 0.000 | 0.476 | 2.368 | n/a | 0.000 | 0.868 | 1.038 | 1.627 | 0.030 | n/a | 0.250 | 8.223 | 4.551 | n/a | 0.032 | 3.031 | 0.163 | 0.032 |
| p99 | 34.814 | 1.009 | 0.000 | 0.803 | 3.974 | n/a | 0.000 | 1.121 | 4.534 | 6.200 | 0.066 | n/a | 4.234 | 14.148 | 9.059 | n/a | 0.099 | 4.946 | 0.306 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000001d1 | 34.814 | 1.820 | n/a | 0.000 | 0.227 | 4.534 | 1.625 | 0.052 | n/a | 4.234 | 14.148 | 8.142 | n/a | 0.032 | 2.047 | 0.059 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.608ms; driver.publication.persist-deferred 0.954ms |
| 732c517d408b68c700000000000001da | 29.597 | 2.050 | n/a | 0.000 | 0.981 | 2.083 | 6.200 | 0.055 | n/a | 0.110 | 9.024 | 9.059 | n/a | 0.033 | 3.031 | 0.102 | 0.033 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001cd | 24.887 | 3.742 | n/a | 0.000 | 0.873 | 1.038 | 1.227 | 0.021 | n/a | 0.496 | 13.123 | 4.335 | n/a | 0.030 | 4.615 | 0.185 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001cb | 23.263 | 3.664 | n/a | 0.000 | 1.121 | 1.250 | 1.400 | 0.030 | n/a | 0.638 | 10.513 | 4.551 | n/a | 0.099 | 4.784 | 0.206 | 0.099 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000211 | 23.249 | 3.974 | n/a | 0.000 | 0.972 | 1.350 | 2.477 | 0.060 | n/a | 2.161 | 7.470 | 4.699 | n/a | 0.085 | 4.946 | 0.213 | 0.085 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001e2 | 23.044 | 2.632 | n/a | 0.000 | 0.474 | 0.931 | 2.722 | 0.042 | n/a | 0.250 | 11.723 | 4.242 | n/a | 0.028 | 3.106 | 0.135 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001e4 | 22.976 | 1.741 | n/a | 0.000 | 0.969 | 1.095 | 2.047 | 0.066 | n/a | 0.223 | 9.782 | 7.023 | n/a | 0.029 | 2.710 | 0.118 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000203 | 20.016 | 2.292 | n/a | 0.000 | 0.092 | 0.983 | 1.835 | 0.029 | n/a | 0.174 | 8.223 | 6.356 | n/a | 0.032 | 2.384 | 0.119 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001f4 | 18.711 | 2.146 | n/a | 0.000 | 0.896 | 1.030 | 1.975 | 0.032 | n/a | 3.087 | 4.672 | 4.836 | n/a | 0.036 | 3.042 | 0.163 | 0.036 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000001ff | 18.484 | 2.497 | n/a | 0.000 | 0.347 | 0.956 | 1.400 | 0.025 | n/a | 2.035 | 7.374 | 3.827 | n/a | 0.023 | 2.844 | 0.154 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000207 | 18.003 | 3.810 | n/a | 0.000 | 0.868 | 1.206 | 1.362 | 0.023 | n/a | 0.145 | 9.630 | 0.879 | n/a | 0.079 | 4.678 | 0.260 | 0.079 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001e8 | 16.719 | 2.047 | n/a | 0.000 | 0.429 | 0.748 | 1.627 | 0.023 | n/a | 0.129 | 6.720 | 4.964 | n/a | 0.032 | 2.476 | 0.148 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000001e6 | 14.052 | 3.182 | n/a | 0.000 | 1.119 | 1.385 | 2.215 | 0.065 | n/a | 0.200 | 5.254 | 0.579 | n/a | 0.053 | 4.301 | 0.306 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000021b | 13.925 | 2.368 | n/a | 0.000 | 0.513 | 1.015 | 1.566 | 0.025 | n/a | 0.827 | 6.330 | 1.230 | n/a | 0.051 | 2.881 | 0.207 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000020b | 12.986 | 1.681 | n/a | 0.000 | 0.839 | 0.673 | 1.002 | 0.020 | n/a | 0.146 | 5.166 | 3.435 | n/a | 0.025 | 2.520 | 0.194 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 66.176 | n/a | n/a | n/a | 36.285 | 2.239 | 2.969 | 0.000 | 11.396 | 3.417 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.008 | 49.151 | 0.756 | 0.008 |
| p99 | 207.388 | n/a | n/a | n/a | 109.790 | 97.269 | 27.333 | 0.000 | 63.020 | 37.539 | 6.800 | n/a | 0.059 | 0.000 | n/a | n/a | 0.077 | 141.183 | 1.000 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000019ae | 207.388 | 109.790 | 4.061 | 27.333 | 0.000 | 22.104 | 37.285 | 6.800 | n/a | 0.010 | 0.000 | n/a | n/a | 0.008 | 141.183 | 0.681 | 0.008 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.298ms; driver.publication.persist-deferred 1.087ms; driver.publication.persist-deferred 1.053ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.956ms |
| 732c517d408b68c7000000000000120e | 172.768 | 93.526 | 0.861 | 17.695 | 0.000 | 54.465 | 6.209 | 0.001 | n/a | 0.005 | 0.000 | n/a | n/a | 0.006 | 112.082 | 0.649 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 6.160ms; driver.publication.persist-deferred 2.670ms; driver.publication.persist-deferred 2.647ms; driver.publication.persist-deferred 2.128ms; driver.publication.persist-deferred 1.352ms |
| 732c517d408b68c70000000000000973 | 136.478 | 91.799 | 1.188 | 15.873 | 0.000 | 19.094 | 8.434 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.077 | 108.860 | 0.798 | 0.077 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.872ms; driver.publication.persist-deferred 1.166ms; driver.publication.persist-deferred 0.875ms; driver.publication.persist-deferred 0.870ms; driver.publication.persist-deferred 0.838ms |
| 732c517d408b68c70000000000000976 | 132.505 | 32.524 | 97.269 | 0.000 | 0.000 | 0.528 | 2.153 | 0.005 | n/a | 0.016 | 0.000 | n/a | n/a | 0.011 | 129.793 | 0.980 | 0.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.872ms; driver.publication.persist-deferred 1.166ms; driver.publication.persist-deferred 0.875ms; driver.publication.persist-deferred 0.870ms; driver.publication.persist-deferred 0.838ms |
| 732c517d408b68c70000000000000cc1 | 109.496 | 58.793 | 37.128 | 6.108 | 0.000 | 4.032 | 3.417 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.008 | 102.030 | 0.932 | 0.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.118ms; driver.publication.persist-deferred 0.914ms; driver.publication.persist-deferred 0.907ms; driver.publication.persist-deferred 0.880ms; driver.publication.persist-deferred 0.850ms |
| 732c517d408b68c7000000000000131d | 101.807 | 44.483 | 5.677 | 4.990 | 0.000 | 44.204 | 2.434 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.007 | 55.150 | 0.542 | 0.007 | node-14/thread-3/socket.queue-and-write | driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.247ms; driver.publication.persist-deferred 1.192ms; driver.publication.persist-deferred 1.071ms; driver.publication.persist-deferred 1.046ms |
| 732c517d408b68c70000000000001c27 | 94.548 | 65.941 | 1.256 | 4.324 | 0.000 | 18.311 | 4.702 | 0.001 | n/a | 0.003 | 0.000 | n/a | n/a | 0.009 | 71.522 | 0.756 | 0.009 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.652ms; driver.publication.persist-deferred 0.913ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.795ms; driver.publication.persist-deferred 0.756ms |
| 732c517d408b68c70000000000001315 | 90.397 | 16.157 | 0.301 | 2.314 | 0.000 | 63.020 | 8.590 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.005 | 18.773 | 0.208 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.365ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.270ms; driver.publication.persist-deferred 1.247ms; driver.publication.persist-deferred 1.192ms |
| 732c517d408b68c70000000000001319 | 87.299 | 24.663 | 26.727 | 0.000 | 0.000 | 31.109 | 4.782 | 0.001 | n/a | 0.008 | 0.000 | n/a | n/a | 0.009 | 51.390 | 0.589 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.247ms; driver.publication.persist-deferred 1.192ms; driver.publication.persist-deferred 1.148ms; driver.publication.persist-deferred 1.071ms |
| 732c517d408b68c70000000000000419 | 81.879 | 33.902 | 0.293 | 6.964 | 0.000 | 6.576 | 34.074 | 0.003 | n/a | 0.059 | 0.000 | n/a | n/a | 0.009 | 41.159 | 0.503 | 0.009 | gw-r/thread-46/gateway.response-write | driver.publication.persist-deferred 0.878ms; driver.publication.persist-deferred 0.876ms; driver.publication.persist-deferred 0.860ms; driver.publication.persist-deferred 0.728ms; driver.publication.persist-deferred 0.654ms |
| 732c517d408b68c700000000000019ad | 78.584 | 43.612 | 6.334 | 6.637 | 0.000 | 13.268 | 8.713 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.009 | 56.582 | 0.720 | 0.009 | node-14/thread-3/worker.gateway-observer.observe | driver.publication.persist-deferred 1.298ms; driver.publication.persist-deferred 1.053ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.956ms; driver.publication.persist-deferred 0.791ms |
| 732c517d408b68c700000000000001f5 | 77.054 | 49.989 | 0.564 | 5.711 | 0.000 | 11.396 | 9.354 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.010 | 56.265 | 0.730 | 0.010 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.167ms |
| 732c517d408b68c70000000000001317 | 75.094 | 32.132 | 0.225 | 2.492 | 0.000 | 38.899 | 1.327 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.009 | 34.849 | 0.464 | 0.009 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.270ms; driver.publication.persist-deferred 1.247ms; driver.publication.persist-deferred 1.192ms; driver.publication.persist-deferred 1.148ms |
| 732c517d408b68c70000000000000411 | 73.974 | 28.051 | 2.474 | 2.969 | 0.000 | 2.914 | 37.539 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.007 | 33.494 | 0.453 | 0.007 | gw-r/thread-45/gateway.admitted-work | driver.publication.persist-deferred 2.464ms; driver.publication.persist-deferred 0.932ms; driver.publication.persist-deferred 0.878ms; driver.publication.persist-deferred 0.808ms; driver.publication.persist-deferred 0.728ms |
| 732c517d408b68c700000000000019b0 | 68.225 | 15.427 | 2.480 | 0.558 | 0.000 | 45.566 | 2.108 | 2.063 | n/a | 0.015 | 0.000 | n/a | n/a | 0.007 | 18.465 | 0.271 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.053ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.956ms |
| 732c517d408b68c70000000000001aaa | 66.462 | 56.196 | 0.179 | 7.519 | 0.000 | 0.428 | 2.128 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.003 | 63.894 | 0.961 | 0.003 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 0.951ms; driver.publication.persist-deferred 0.872ms; driver.publication.persist-deferred 0.683ms; driver.publication.persist-deferred 0.565ms |
| 732c517d408b68c7000000000000120f | 66.176 | 44.571 | 0.289 | 7.235 | 0.000 | 11.683 | 1.491 | 0.895 | n/a | 0.006 | 0.000 | n/a | n/a | 0.006 | 52.095 | 0.787 | 0.006 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 6.160ms; driver.publication.persist-deferred 1.027ms; driver.publication.persist-deferred 0.970ms; driver.publication.persist-deferred 0.909ms |
| 732c517d408b68c70000000000001312 | 65.932 | 36.285 | 6.468 | 2.803 | 0.000 | 11.605 | 8.725 | 0.004 | n/a | 0.009 | 0.000 | n/a | n/a | 0.034 | 45.555 | 0.691 | 0.034 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 2.365ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.270ms; driver.publication.persist-deferred 1.192ms; driver.publication.persist-deferred 1.148ms |
| 732c517d408b68c70000000000001d39 | 63.213 | 46.796 | 2.526 | 6.250 | 0.000 | 0.689 | 6.939 | 0.001 | n/a | 0.006 | 0.000 | n/a | n/a | 0.005 | 55.572 | 0.879 | 0.005 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 0.836ms; driver.publication.persist-deferred 0.801ms; driver.publication.persist-deferred 0.751ms |
| 732c517d408b68c7000000000000155c | 62.578 | 49.444 | 2.601 | 2.816 | 0.000 | 0.536 | 7.169 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.004 | 54.860 | 0.877 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | client.encode 2.073ms; driver.publication.persist-deferred 0.960ms; driver.publication.persist-deferred 0.937ms; driver.publication.persist-deferred 0.849ms; driver.publication.persist-deferred 0.822ms |

## P2 / L64 / commit (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.363 | 0.140 | 0.000 | 0.487 | 3.245 | n/a | 0.000 | 0.286 | 1.134 | 4.604 | 0.028 | n/a | 0.230 | 6.231 | 2.423 | n/a | 0.031 | 4.036 | 0.194 | 0.031 |
| p99 | 71.290 | 2.333 | 0.000 | 1.706 | 7.637 | n/a | 0.524 | 2.225 | 4.314 | 26.986 | 0.316 | n/a | 3.352 | 49.162 | 7.794 | n/a | 0.079 | 8.642 | 0.351 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000000243 | 71.290 | 5.267 | 0.304 | 0.461 | 0.071 | 1.603 | 6.154 | 0.021 | n/a | 1.817 | 49.162 | 6.404 | n/a | 0.026 | 6.103 | 0.086 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000245 | 47.457 | 3.450 | 0.281 | 0.276 | 0.073 | 1.575 | 26.986 | 0.023 | n/a | 0.154 | 8.601 | 5.992 | n/a | 0.044 | 4.080 | 0.086 | 0.044 | gw-w/thread-46/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000231 | 38.696 | 4.271 | 0.178 | 0.249 | 0.053 | 1.186 | 15.932 | 0.023 | n/a | 0.329 | 11.553 | 4.901 | n/a | 0.021 | 4.751 | 0.123 | 0.021 | gw-w/thread-46/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000248 | 36.093 | 1.903 | n/a | 0.000 | 2.225 | 3.260 | 5.951 | 0.048 | n/a | 1.916 | 14.472 | 6.284 | n/a | 0.035 | 4.127 | 0.114 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.273ms |
| 732c517d408b68c7000000000000023d | 35.448 | 4.186 | 0.274 | 0.247 | 0.117 | 1.489 | 15.377 | 0.022 | n/a | 0.709 | 9.316 | 3.657 | n/a | 0.054 | 4.824 | 0.136 | 0.054 | gw-w/thread-46/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000276 | 34.634 | 4.363 | 0.246 | 0.368 | 0.200 | 1.632 | 13.715 | 0.036 | n/a | 0.155 | 10.305 | 3.552 | n/a | 0.063 | 5.177 | 0.149 | 0.063 | gw-w/thread-44/gateway.admitted-work | none observed |
| 732c517d408b68c7000000000000022a | 32.748 | 3.793 | 0.968 | 0.272 | 0.042 | 1.090 | 13.051 | 0.037 | n/a | 0.109 | 5.572 | 7.794 | n/a | 0.020 | 5.075 | 0.155 | 0.020 | gw-w/thread-44/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000259 | 32.581 | 5.995 | n/a | 0.000 | 1.047 | 0.904 | 6.000 | 0.024 | n/a | 0.146 | 13.946 | 4.442 | n/a | 0.076 | 7.042 | 0.216 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000233 | 32.081 | 3.870 | 0.287 | 0.254 | 0.054 | 2.053 | 15.550 | 0.059 | n/a | 0.964 | 5.318 | 3.646 | n/a | 0.024 | 4.466 | 0.139 | 0.024 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000257 | 31.404 | 6.896 | 0.319 | 0.524 | 0.194 | 1.784 | 13.232 | 0.064 | n/a | 0.143 | 5.401 | 2.776 | n/a | 0.072 | 7.933 | 0.253 | 0.072 | gw-w/thread-44/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000241 | 28.989 | 4.712 | 0.327 | 0.374 | 0.089 | 1.768 | 12.669 | 0.027 | n/a | 0.089 | 5.444 | 3.446 | n/a | 0.044 | 5.502 | 0.190 | 0.044 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000267 | 26.496 | 7.637 | n/a | 0.000 | 1.004 | 3.253 | 6.904 | 0.044 | n/a | 0.726 | 6.278 | 0.576 | n/a | 0.074 | 8.642 | 0.326 | 0.074 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000024d | 26.232 | 2.943 | 0.167 | 0.263 | 0.043 | 1.134 | 11.051 | 0.023 | n/a | 0.076 | 6.231 | 4.278 | n/a | 0.024 | 3.415 | 0.130 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000021f | 25.752 | 3.177 | 0.188 | 0.357 | 0.056 | 1.188 | 5.444 | 0.027 | n/a | 0.130 | 8.787 | 6.378 | n/a | 0.021 | 3.778 | 0.147 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000026e | 25.607 | 3.490 | 0.180 | 0.298 | 0.060 | 2.315 | 8.503 | 0.041 | n/a | 0.957 | 3.567 | 6.171 | n/a | 0.026 | 4.028 | 0.157 | 0.026 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000251 | 25.365 | 4.290 | 0.396 | 0.435 | 0.061 | 1.906 | 6.458 | 0.316 | n/a | 0.397 | 6.294 | 4.781 | n/a | 0.031 | 5.181 | 0.204 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000026a | 25.178 | 3.202 | 0.340 | 0.298 | 0.205 | 1.412 | 11.881 | 0.073 | n/a | 0.151 | 5.174 | 2.364 | n/a | 0.079 | 4.045 | 0.161 | 0.079 | gw-w/thread-46/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000237 | 24.872 | 5.052 | n/a | 0.000 | 0.778 | 4.314 | 1.791 | 0.019 | n/a | 3.352 | 6.316 | 3.211 | n/a | 0.039 | 5.830 | 0.234 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000022f | 23.789 | 4.350 | n/a | 0.000 | 1.105 | 0.784 | 7.607 | 0.018 | n/a | 0.058 | 6.217 | 3.607 | n/a | 0.043 | 5.456 | 0.229 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000025b | 23.408 | 4.865 | 0.347 | 0.469 | 0.196 | 1.818 | 5.981 | 0.028 | n/a | 0.124 | 5.734 | 3.773 | n/a | 0.075 | 5.876 | 0.251 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.555 | 0.000 | 0.000 | 0.427 | 2.019 | n/a | 0.000 | 0.627 | 0.788 | 1.357 | 0.019 | n/a | 0.230 | 5.194 | 0.617 | n/a | 0.027 | 2.977 | 0.198 | 0.027 |
| p99 | 36.093 | 2.000 | 0.000 | 0.907 | 7.637 | n/a | 0.000 | 2.225 | 3.260 | 6.904 | 0.311 | n/a | 1.916 | 14.472 | 6.284 | n/a | 0.074 | 8.642 | 0.351 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000000248 | 36.093 | 1.903 | n/a | 0.000 | 2.225 | 3.260 | 5.951 | 0.048 | n/a | 1.916 | 14.472 | 6.284 | n/a | 0.035 | 4.127 | 0.114 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.273ms |
| 732c517d408b68c70000000000000267 | 26.496 | 7.637 | n/a | 0.000 | 1.004 | 3.253 | 6.904 | 0.044 | n/a | 0.726 | 6.278 | 0.576 | n/a | 0.074 | 8.642 | 0.326 | 0.074 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000022d | 22.878 | 3.226 | n/a | 0.000 | 1.103 | 1.112 | 5.025 | 0.025 | n/a | 0.115 | 8.020 | 4.215 | n/a | 0.037 | 4.329 | 0.189 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000026c | 20.537 | 2.583 | n/a | 0.000 | 0.384 | 0.788 | 1.126 | 0.015 | n/a | 0.075 | 11.202 | 4.331 | n/a | 0.033 | 2.967 | 0.144 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000228 | 19.542 | 2.432 | n/a | 0.000 | 0.546 | 0.767 | 1.109 | 0.016 | n/a | 0.388 | 11.938 | 2.323 | n/a | 0.024 | 2.977 | 0.152 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000025d | 14.754 | 1.726 | n/a | 0.000 | 1.078 | 0.542 | 4.040 | 0.028 | n/a | 0.353 | 5.765 | 1.204 | n/a | 0.018 | 2.804 | 0.190 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000224 | 13.682 | 1.946 | n/a | 0.000 | 1.076 | 0.648 | 1.201 | 0.019 | n/a | 0.188 | 5.194 | 3.387 | n/a | 0.023 | 3.022 | 0.221 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000027e | 13.583 | 1.726 | n/a | 0.000 | 0.511 | 0.603 | 4.604 | 0.020 | n/a | 0.094 | 5.377 | 0.617 | n/a | 0.031 | 2.238 | 0.165 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000027a | 12.555 | 1.918 | n/a | 0.000 | 0.520 | 0.945 | 1.849 | 0.037 | n/a | 0.205 | 4.700 | 2.355 | n/a | 0.026 | 2.438 | 0.194 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000263 | 12.480 | 1.616 | n/a | 0.000 | 0.852 | 1.951 | 1.213 | 0.018 | n/a | 0.143 | 6.080 | 0.582 | n/a | 0.025 | 2.469 | 0.198 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000220 | 12.298 | 3.588 | n/a | 0.000 | 0.627 | 1.288 | 3.012 | 0.311 | n/a | 1.400 | 1.837 | 0.212 | n/a | 0.023 | 4.215 | 0.343 | 0.023 | node-14/thread-0/driver.execute | none observed |
| 732c517d408b68c7000000000000023f | 11.073 | 3.022 | n/a | 0.000 | 0.286 | 0.618 | 1.239 | 0.014 | n/a | 0.411 | 4.825 | 0.600 | n/a | 0.057 | 3.309 | 0.299 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000235 | 10.682 | 1.511 | n/a | 0.000 | 0.801 | 1.385 | 1.060 | 0.014 | n/a | 0.377 | 3.881 | 1.638 | n/a | 0.017 | 2.312 | 0.216 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000025f | 10.641 | 2.019 | n/a | 0.000 | 0.796 | 0.391 | 1.560 | 0.015 | n/a | 0.094 | 5.191 | 0.548 | n/a | 0.027 | 2.814 | 0.264 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000274 | 10.623 | 3.245 | n/a | 0.000 | 0.486 | 0.852 | 1.357 | 0.018 | n/a | 0.412 | 3.753 | 0.460 | n/a | 0.041 | 3.730 | 0.351 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000252 | 9.766 | 2.564 | n/a | 0.000 | 0.454 | 0.615 | 1.082 | 0.059 | n/a | 0.230 | 4.224 | 0.491 | n/a | 0.047 | 3.018 | 0.309 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.698 | 0.191 | 0.000 | 0.470 | 3.177 | n/a | 0.000 | 0.179 | 1.172 | 4.493 | 0.025 | n/a | 0.327 | 5.780 | 3.260 | n/a | 0.028 | 3.730 | 0.197 | 0.028 |
| p99 | 88.134 | 1.653 | 0.000 | 1.979 | 6.475 | n/a | 0.748 | 1.195 | 5.855 | 65.629 | 0.062 | n/a | 3.770 | 10.322 | n/a | n/a | 0.077 | 7.287 | 0.391 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000002c9 | 88.134 | 5.065 | 0.212 | 0.491 | 0.052 | 1.908 | 65.629 | 0.048 | n/a | 3.642 | 8.527 | 2.538 | n/a | 0.022 | 5.819 | 0.066 | 0.022 | gw-w/thread-45/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000002ab | 59.365 | 4.168 | 0.364 | 0.000 | 0.222 | 2.011 | 6.554 | 0.033 | n/a | 3.770 | 5.766 | 36.405 | n/a | 0.072 | 4.754 | 0.080 | 0.072 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000291 | 37.328 | 3.029 | 0.182 | 0.264 | 0.055 | 1.078 | 18.367 | 0.062 | n/a | 0.135 | 6.007 | 8.127 | n/a | 0.021 | 3.530 | 0.095 | 0.021 | gw-w/thread-41/gateway.admitted-work | none observed |
| 732c517d408b68c70000000000000280 | 30.310 | 3.177 | 0.235 | 0.269 | 0.035 | 1.039 | 6.763 | 0.021 | n/a | 0.342 | 10.322 | 8.092 | n/a | 0.016 | 3.715 | 0.123 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002bb | 29.668 | 3.803 | 0.361 | 0.306 | 0.051 | 5.239 | 8.231 | 0.023 | n/a | 0.082 | 6.158 | 5.388 | n/a | 0.025 | 4.521 | 0.152 | 0.025 | gw-w/thread-47/gateway.admitted-work | none observed |
| 732c517d408b68c7000000000000028f | 27.959 | 4.635 | n/a | 0.000 | 0.847 | 0.906 | 6.718 | 0.014 | n/a | 0.069 | 5.799 | 8.928 | n/a | 0.044 | 5.483 | 0.196 | 0.044 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000299 | 27.662 | 3.718 | 0.282 | 0.000 | 0.067 | 1.411 | 9.304 | 0.026 | n/a | 0.319 | 6.542 | 5.964 | n/a | 0.026 | 4.068 | 0.147 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002bf | 27.362 | 6.475 | 0.164 | 0.575 | 0.072 | 2.135 | 6.979 | 0.034 | n/a | 0.497 | 6.340 | 4.062 | n/a | 0.027 | 7.287 | 0.266 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000286 | 26.437 | 3.515 | 0.275 | 0.275 | 0.141 | 1.427 | 10.328 | 0.027 | n/a | 0.109 | 7.023 | 3.239 | n/a | 0.077 | 4.206 | 0.159 | 0.077 | gw-w/thread-43/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000002a3 | 26.194 | 5.245 | 0.156 | 0.000 | 0.047 | 1.746 | 9.503 | 0.045 | n/a | 0.675 | 5.496 | 3.260 | n/a | 0.020 | 5.448 | 0.208 | 0.020 | gw-w/thread-45/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000002d4 | 25.592 | 3.208 | 0.174 | 0.000 | 0.063 | 2.037 | 8.404 | 0.042 | n/a | 0.153 | 6.124 | 5.363 | n/a | 0.027 | 3.444 | 0.135 | 0.027 | gw-w/thread-46/gateway.admitted-work | none observed |
| 732c517d408b68c700000000000002b3 | 25.460 | 4.753 | 0.176 | 0.748 | 0.061 | 1.932 | 7.152 | 0.045 | n/a | 0.461 | 5.780 | 4.328 | n/a | 0.024 | 5.738 | 0.225 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002b1 | 24.968 | 3.909 | 0.332 | 0.343 | 0.060 | 1.323 | 5.464 | 0.038 | n/a | 0.704 | 6.709 | 6.055 | n/a | 0.031 | 4.644 | 0.186 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000028b | 23.706 | 3.830 | 0.254 | 0.535 | 0.057 | 1.172 | 6.124 | 0.033 | n/a | 0.741 | 6.957 | 3.977 | n/a | 0.026 | 4.676 | 0.197 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002b7 | 22.238 | 4.111 | 0.206 | 0.248 | 0.097 | 1.166 | 5.325 | 0.025 | n/a | 0.289 | 4.552 | 6.180 | n/a | 0.040 | 4.661 | 0.210 | 0.040 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c7000000000000028d | 22.235 | 2.616 | n/a | 0.000 | 0.200 | 2.097 | 5.685 | 0.037 | n/a | 0.271 | 7.690 | 3.604 | n/a | 0.033 | 2.816 | 0.127 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002a7 | 22.212 | 2.966 | 0.175 | 0.000 | 0.082 | 1.183 | 8.884 | 0.027 | n/a | 0.094 | 5.268 | 3.503 | n/a | 0.032 | 3.222 | 0.145 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000297 | 21.512 | 5.489 | 0.310 | 0.000 | 0.188 | 1.323 | 5.325 | 0.025 | n/a | 0.106 | 5.385 | 3.306 | n/a | 0.055 | 5.988 | 0.278 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002ce | 21.088 | 2.955 | 0.173 | 0.553 | 0.054 | 1.630 | 5.166 | 0.035 | n/a | 0.665 | 6.361 | 3.471 | n/a | 0.024 | 3.736 | 0.177 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002bd | 20.265 | 2.568 | n/a | 0.000 | 1.025 | 0.594 | 1.201 | 0.021 | n/a | 0.459 | 8.950 | 5.424 | n/a | 0.023 | 3.592 | 0.177 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.541 | 0.000 | 0.000 | 0.464 | 2.069 | n/a | 0.000 | 0.644 | 0.882 | 1.512 | 0.021 | n/a | 0.244 | 6.344 | 1.429 | n/a | 0.029 | 2.767 | 0.211 | 0.029 |
| p99 | 20.265 | 1.653 | 0.000 | 0.929 | 3.817 | n/a | 0.000 | 1.195 | 5.855 | 8.052 | 0.059 | n/a | 0.531 | 9.010 | n/a | n/a | 0.074 | 4.363 | 0.335 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c700000000000002bd | 20.265 | 2.568 | n/a | 0.000 | 1.025 | 0.594 | 1.201 | 0.021 | n/a | 0.459 | 8.950 | 5.424 | n/a | 0.023 | 3.592 | 0.177 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002b9 | 18.040 | 3.817 | n/a | 0.000 | 0.545 | 0.889 | 4.493 | 0.018 | n/a | 0.086 | 6.771 | 1.379 | n/a | 0.041 | 4.363 | 0.242 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002c1 | 17.698 | 3.598 | n/a | 0.000 | 0.132 | 0.712 | 1.068 | 0.019 | n/a | 0.474 | 4.393 | 7.251 | n/a | 0.052 | 3.730 | 0.211 | 0.052 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c700000000000002cb | 16.959 | 1.759 | n/a | 0.000 | 1.195 | 5.855 | 8.052 | 0.014 | n/a | 0.041 | 0.000 | n/a | n/a | 0.042 | 2.954 | 0.174 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| 732c517d408b68c70000000000000293 | 15.654 | 1.983 | n/a | 0.000 | 0.560 | 0.832 | 2.126 | 0.059 | n/a | 0.334 | 9.010 | 0.720 | n/a | 0.029 | 2.543 | 0.162 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000029d | 15.419 | 3.256 | n/a | 0.000 | 0.989 | 1.372 | 2.490 | 0.046 | n/a | 0.273 | 6.344 | 0.574 | n/a | 0.074 | 4.245 | 0.275 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002a5 | 15.272 | 2.314 | n/a | 0.000 | 0.179 | 0.813 | 1.448 | 0.026 | n/a | 0.244 | 8.790 | 1.429 | n/a | 0.029 | 2.493 | 0.163 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002b5 | 14.541 | 2.030 | n/a | 0.000 | 0.737 | 1.196 | 1.512 | 0.019 | n/a | 0.531 | 7.798 | 0.688 | n/a | 0.029 | 2.767 | 0.190 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000281 | 13.718 | 1.787 | n/a | 0.000 | 0.644 | 1.406 | 1.935 | 0.028 | n/a | 0.115 | 6.599 | 1.177 | n/a | 0.027 | 2.430 | 0.177 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000284 | 13.354 | 2.875 | n/a | 0.000 | 0.760 | 0.882 | 1.008 | 0.016 | n/a | 0.333 | 6.444 | 0.991 | n/a | 0.046 | 3.635 | 0.272 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002a1 | 12.984 | 1.716 | n/a | 0.000 | 0.327 | 1.716 | 1.734 | 0.021 | n/a | 0.113 | 5.129 | 2.200 | n/a | 0.028 | 2.042 | 0.157 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002c7 | 12.534 | 3.726 | n/a | 0.000 | 0.470 | 0.958 | 1.031 | 0.016 | n/a | 0.115 | 4.125 | 2.039 | n/a | 0.055 | 4.196 | 0.335 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000029b | 11.713 | 2.069 | n/a | 0.000 | 0.541 | 0.663 | 1.185 | 0.022 | n/a | 0.176 | 4.817 | 2.213 | n/a | 0.028 | 2.610 | 0.223 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002ad | 11.361 | 1.849 | n/a | 0.000 | 0.654 | 0.751 | 1.167 | 0.020 | n/a | 0.528 | 4.164 | 2.204 | n/a | 0.025 | 2.503 | 0.220 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000002c5 | 9.489 | 1.363 | n/a | 0.000 | 1.012 | 0.613 | 1.984 | 0.029 | n/a | 0.227 | 3.747 | 0.499 | n/a | 0.015 | 2.375 | 0.250 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (837 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.190 | 0.123 | 0.000 | 0.521 | 2.166 | n/a | 0.000 | 0.673 | 0.685 | 1.070 | 0.013 | n/a | 0.123 | 5.033 | 0.819 | n/a | 0.017 | 3.028 | 0.246 | 0.017 |
| p99 | 48.411 | 2.242 | 0.020 | 2.131 | 8.507 | n/a | 0.000 | 13.020 | 9.085 | 9.878 | 0.053 | n/a | 3.800 | 31.277 | 17.240 | n/a | 0.050 | 15.264 | 0.587 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c7000000000000074b | 75.295 | 1.420 | n/a | 0.000 | 1.609 | 0.332 | 0.753 | 0.012 | n/a | 0.334 | 60.971 | 9.845 | n/a | 0.019 | 3.029 | 0.040 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.887ms; driver.publication.persist-deferred 0.789ms; driver.publication.persist-deferred 0.527ms |
| 732c517d408b68c7000000000000074e | 65.590 | 1.231 | n/a | 0.000 | 1.559 | 1.588 | 0.787 | 0.013 | n/a | 0.404 | 59.644 | 0.353 | n/a | 0.011 | 2.790 | 0.043 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.848ms; driver.publication.persist-deferred 0.527ms |
| 732c517d408b68c7000000000000072d | 59.440 | 3.451 | n/a | 2.618 | 0.884 | 36.479 | 2.009 | 0.024 | n/a | 0.103 | 9.460 | 4.398 | n/a | 0.014 | 6.954 | 0.117 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 25.284ms |
| 732c517d408b68c70000000000000731 | 54.541 | 2.033 | n/a | 0.000 | 40.928 | 0.546 | 1.796 | 0.029 | n/a | 0.162 | 8.627 | 0.404 | n/a | 0.017 | 42.960 | 0.788 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 16.035ms; driver.expected-state.bind-receipt 3.497ms; driver.publication.persist-deferred 1.275ms; driver.publication.persist-deferred 0.951ms; driver.publication.persist-deferred 0.757ms |
| 732c517d408b68c70000000000000730 | 53.281 | 7.914 | n/a | 0.000 | 21.110 | 10.745 | 0.371 | 0.003 | n/a | 0.010 | 12.555 | 0.561 | n/a | 0.012 | 29.024 | 0.545 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 20.493ms; driver.expected-state.bind-receipt 3.497ms; driver.publication.persist-deferred 1.275ms; driver.publication.persist-deferred 0.681ms |
| 732c517d408b68c7000000000000032b | 51.761 | 1.591 | n/a | 0.000 | 40.030 | 0.408 | 0.799 | 0.016 | n/a | 0.076 | 8.272 | 0.545 | n/a | 0.024 | 41.621 | 0.804 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.913ms; driver.publication.persist-deferred 0.822ms; driver.publication.persist-deferred 0.600ms; driver.publication.persist-deferred 0.513ms |
| 732c517d408b68c70000000000000329 | 48.610 | 3.060 | n/a | 0.000 | 1.048 | 0.610 | 1.075 | 0.014 | n/a | 0.099 | 15.710 | 26.957 | n/a | 0.037 | 4.108 | 0.085 | 0.037 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000769 | 48.507 | 1.834 | n/a | 0.000 | 0.250 | 0.382 | 0.873 | 0.014 | n/a | 0.101 | 30.697 | 14.339 | n/a | 0.017 | 2.084 | 0.043 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.162ms |
| 732c517d408b68c7000000000000072f | 48.411 | 2.817 | n/a | 0.000 | 23.760 | 7.559 | 1.130 | 0.010 | n/a | 0.057 | 10.671 | 2.360 | n/a | 0.047 | 26.577 | 0.549 | 0.047 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 23.611ms; driver.expected-state.bind-receipt 3.497ms; driver.publication.persist-deferred 1.275ms |
| 732c517d408b68c70000000000000817 | 46.780 | 1.753 | n/a | 0.000 | 27.504 | 3.905 | 0.587 | 0.006 | n/a | 0.025 | 12.600 | 0.386 | n/a | 0.012 | 29.258 | 0.625 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.358ms; driver.publication.persist-deferred 0.862ms; driver.publication.persist-deferred 0.793ms; driver.publication.persist-deferred 0.749ms; driver.publication.persist-deferred 0.686ms |
| 732c517d408b68c70000000000000438 | 44.810 | 1.792 | n/a | 0.000 | 0.242 | 0.698 | 2.128 | 0.033 | n/a | 0.152 | 35.236 | 4.506 | n/a | 0.023 | 2.033 | 0.045 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000076b | 44.670 | 2.580 | n/a | 0.000 | 0.489 | 1.802 | 0.797 | 0.011 | n/a | 0.093 | 37.917 | 0.942 | n/a | 0.037 | 3.069 | 0.069 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.809ms |
| 732c517d408b68c7000000000000032a | 44.647 | 3.434 | n/a | 0.000 | 0.918 | 2.342 | 1.014 | 0.011 | n/a | 0.074 | 36.123 | 0.714 | n/a | 0.018 | 4.352 | 0.097 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.913ms |
| 732c517d408b68c70000000000000732 | 44.600 | 10.262 | n/a | 0.000 | 14.105 | 6.240 | 0.694 | 0.006 | n/a | 0.017 | 12.320 | 0.941 | n/a | 0.015 | 24.367 | 0.546 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 13.379ms; driver.expected-state.bind-receipt 3.497ms; driver.publication.persist-deferred 1.275ms; driver.publication.persist-deferred 0.681ms |
| 732c517d408b68c7000000000000076c | 44.187 | 1.638 | n/a | 0.000 | 2.148 | 1.787 | 0.394 | 0.006 | n/a | 0.047 | 37.417 | 0.734 | n/a | 0.016 | 3.786 | 0.086 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.809ms |
| 732c517d408b68c700000000000004a2 | 43.728 | 1.888 | n/a | 0.000 | 0.699 | 0.547 | 0.870 | 0.008 | n/a | 2.885 | 26.633 | 10.183 | n/a | 0.013 | 2.587 | 0.059 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.004ms; driver.publication.persist-deferred 0.934ms |
| 732c517d408b68c700000000000003a1 | 43.561 | 3.489 | n/a | 0.000 | 0.280 | 3.211 | 1.518 | 0.032 | n/a | 0.104 | 5.234 | 29.665 | n/a | 0.029 | 3.769 | 0.087 | 0.029 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c7000000000000081c | 43.413 | 8.505 | n/a | 0.000 | 1.062 | 9.293 | 2.325 | 0.030 | n/a | 0.776 | 19.790 | 1.623 | n/a | 0.008 | 9.567 | 0.220 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.358ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.793ms; driver.publication.persist-deferred 0.749ms; driver.publication.persist-deferred 0.635ms |
| 732c517d408b68c70000000000000316 | 42.766 | 3.970 | n/a | 0.000 | 2.874 | 0.679 | 1.096 | 0.016 | n/a | 0.090 | 31.277 | 2.738 | n/a | 0.028 | 6.843 | 0.160 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.214ms; driver.publication.persist-deferred 0.932ms; driver.publication.persist-deferred 0.733ms |
| 732c517d408b68c700000000000003a2 | 42.219 | 5.167 | n/a | 0.000 | 0.500 | 2.477 | 1.377 | 0.023 | n/a | 0.101 | 30.148 | 2.399 | n/a | 0.027 | 5.667 | 0.134 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.072ms |

## P2 / L1024 / commit / 5-10 facts (487 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.499 | 0.000 | 0.000 | 0.405 | 1.782 | n/a | 0.000 | 0.660 | 0.656 | 0.908 | 0.012 | n/a | 0.129 | 4.663 | 0.600 | n/a | 0.017 | 2.586 | 0.232 | 0.017 |
| p99 | 51.761 | 1.810 | 0.000 | 0.902 | 5.079 | n/a | 0.000 | 13.876 | 8.153 | 5.687 | 0.061 | n/a | 3.601 | 35.236 | 19.179 | n/a | 0.055 | 15.242 | 0.628 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c7000000000000074b | 75.295 | 1.420 | n/a | 0.000 | 1.609 | 0.332 | 0.753 | 0.012 | n/a | 0.334 | 60.971 | 9.845 | n/a | 0.019 | 3.029 | 0.040 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.887ms; driver.publication.persist-deferred 0.789ms; driver.publication.persist-deferred 0.527ms |
| 732c517d408b68c7000000000000074e | 65.590 | 1.231 | n/a | 0.000 | 1.559 | 1.588 | 0.787 | 0.013 | n/a | 0.404 | 59.644 | 0.353 | n/a | 0.011 | 2.790 | 0.043 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.848ms; driver.publication.persist-deferred 0.527ms |
| 732c517d408b68c70000000000000731 | 54.541 | 2.033 | n/a | 0.000 | 40.928 | 0.546 | 1.796 | 0.029 | n/a | 0.162 | 8.627 | 0.404 | n/a | 0.017 | 42.960 | 0.788 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 16.035ms; driver.expected-state.bind-receipt 3.497ms; driver.publication.persist-deferred 1.275ms; driver.publication.persist-deferred 0.951ms; driver.publication.persist-deferred 0.757ms |
| 732c517d408b68c70000000000000730 | 53.281 | 7.914 | n/a | 0.000 | 21.110 | 10.745 | 0.371 | 0.003 | n/a | 0.010 | 12.555 | 0.561 | n/a | 0.012 | 29.024 | 0.545 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 20.493ms; driver.expected-state.bind-receipt 3.497ms; driver.publication.persist-deferred 1.275ms; driver.publication.persist-deferred 0.681ms |
| 732c517d408b68c7000000000000032b | 51.761 | 1.591 | n/a | 0.000 | 40.030 | 0.408 | 0.799 | 0.016 | n/a | 0.076 | 8.272 | 0.545 | n/a | 0.024 | 41.621 | 0.804 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 0.913ms; driver.publication.persist-deferred 0.822ms; driver.publication.persist-deferred 0.600ms; driver.publication.persist-deferred 0.513ms |
| 732c517d408b68c70000000000000329 | 48.610 | 3.060 | n/a | 0.000 | 1.048 | 0.610 | 1.075 | 0.014 | n/a | 0.099 | 15.710 | 26.957 | n/a | 0.037 | 4.108 | 0.085 | 0.037 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000769 | 48.507 | 1.834 | n/a | 0.000 | 0.250 | 0.382 | 0.873 | 0.014 | n/a | 0.101 | 30.697 | 14.339 | n/a | 0.017 | 2.084 | 0.043 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.162ms |
| 732c517d408b68c70000000000000817 | 46.780 | 1.753 | n/a | 0.000 | 27.504 | 3.905 | 0.587 | 0.006 | n/a | 0.025 | 12.600 | 0.386 | n/a | 0.012 | 29.258 | 0.625 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.358ms; driver.publication.persist-deferred 0.862ms; driver.publication.persist-deferred 0.793ms; driver.publication.persist-deferred 0.749ms; driver.publication.persist-deferred 0.686ms |
| 732c517d408b68c70000000000000438 | 44.810 | 1.792 | n/a | 0.000 | 0.242 | 0.698 | 2.128 | 0.033 | n/a | 0.152 | 35.236 | 4.506 | n/a | 0.023 | 2.033 | 0.045 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c7000000000000076b | 44.670 | 2.580 | n/a | 0.000 | 0.489 | 1.802 | 0.797 | 0.011 | n/a | 0.093 | 37.917 | 0.942 | n/a | 0.037 | 3.069 | 0.069 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.809ms |
| 732c517d408b68c7000000000000076c | 44.187 | 1.638 | n/a | 0.000 | 2.148 | 1.787 | 0.394 | 0.006 | n/a | 0.047 | 37.417 | 0.734 | n/a | 0.016 | 3.786 | 0.086 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.809ms |
| 732c517d408b68c700000000000003a1 | 43.561 | 3.489 | n/a | 0.000 | 0.280 | 3.211 | 1.518 | 0.032 | n/a | 0.104 | 5.234 | 29.665 | n/a | 0.029 | 3.769 | 0.087 | 0.029 | tx/thread-87/transactor.triplex-function | none observed |
| 732c517d408b68c70000000000000318 | 39.069 | 3.327 | n/a | 0.000 | 0.193 | 0.461 | 0.995 | 0.017 | n/a | 0.379 | 26.784 | 6.888 | n/a | 0.023 | 3.520 | 0.090 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.795ms |
| 732c517d408b68c700000000000004a6 | 37.615 | 1.675 | n/a | 0.000 | 1.293 | 6.015 | 0.547 | 0.008 | n/a | 0.047 | 26.731 | 1.281 | n/a | 0.017 | 2.969 | 0.079 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.934ms; driver.publication.persist-deferred 0.760ms; driver.publication.persist-deferred 0.745ms; driver.publication.persist-deferred 0.731ms |
| 732c517d408b68c700000000000004a4 | 34.647 | 2.850 | n/a | 0.000 | 0.558 | 2.745 | 0.448 | 0.005 | n/a | 0.021 | 27.538 | 0.475 | n/a | 0.006 | 3.408 | 0.098 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.004ms; driver.publication.persist-deferred 0.934ms; driver.publication.persist-deferred 0.760ms |
| 732c517d408b68c70000000000000319 | 33.492 | 2.383 | n/a | 0.000 | 0.896 | 0.583 | 1.359 | 0.031 | n/a | 0.756 | 23.697 | 3.749 | n/a | 0.039 | 3.279 | 0.098 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.831ms; driver.publication.persist-deferred 0.795ms |
| 732c517d408b68c7000000000000064b | 32.546 | 1.635 | n/a | 0.000 | 1.201 | 1.894 | 0.796 | 0.013 | n/a | 0.932 | 19.441 | 6.628 | n/a | 0.007 | 2.836 | 0.087 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.986ms; driver.publication.persist-deferred 0.935ms |
| 732c517d408b68c7000000000000076f | 31.768 | 2.405 | n/a | 0.000 | 0.529 | 1.779 | 0.965 | 0.009 | n/a | 0.164 | 18.959 | 6.940 | n/a | 0.019 | 2.934 | 0.092 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.989ms; driver.publication.persist-deferred 0.809ms; driver.publication.persist-deferred 0.802ms; driver.publication.persist-deferred 0.635ms; driver.publication.persist-deferred 0.562ms |
| 732c517d408b68c70000000000000665 | 31.714 | 1.938 | n/a | 0.000 | 2.217 | 1.454 | 1.227 | 0.017 | n/a | 1.297 | 4.374 | 19.179 | n/a | 0.011 | 4.155 | 0.131 | 0.011 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 0.674ms |
| 732c517d408b68c7000000000000064a | 31.271 | 1.609 | n/a | 0.000 | 1.338 | 1.836 | 0.624 | 0.004 | n/a | 0.182 | 21.082 | 4.584 | n/a | 0.011 | 2.948 | 0.094 | 0.011 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.935ms |

## P2 / tail / commit (2632 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.030 | 0.204 | 0.000 | 0.498 | 2.177 | n/a | 0.000 | 0.701 | 0.582 | 0.920 | 0.012 | n/a | 0.087 | 4.156 | 0.737 | n/a | 0.013 | 3.057 | 0.285 | 0.013 |
| p99 | 39.570 | 2.004 | 0.023 | 1.895 | 6.563 | n/a | 0.000 | 11.547 | 7.053 | 6.449 | 0.043 | n/a | 2.944 | 25.443 | 8.543 | n/a | 0.043 | 14.088 | 0.645 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000001654 | 88.905 | 9.660 | n/a | 0.000 | 0.967 | 12.694 | 2.391 | 0.034 | n/a | 0.799 | 60.346 | 2.009 | n/a | 0.005 | 10.627 | 0.120 | 0.005 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.092ms; driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.962ms; driver.publication.persist-deferred 0.898ms |
| 732c517d408b68c7000000000000165a | 87.547 | 5.045 | n/a | 0.000 | 59.305 | 0.623 | 1.123 | 0.012 | n/a | 0.056 | 17.055 | 4.313 | n/a | 0.016 | 64.350 | 0.735 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.092ms; driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.962ms; driver.publication.persist-deferred 0.898ms |
| 732c517d408b68c70000000000000d20 | 68.137 | 3.085 | 2.264 | 0.000 | 0.009 | 21.527 | 6.914 | 0.017 | n/a | 0.052 | 20.750 | 13.514 | n/a | 0.005 | 5.358 | 0.079 | 0.005 | node-14/thread-5/socket.wait-first-byte | driver.publication.persist-deferred 2.188ms; driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.900ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.662ms |
| 732c517d408b68c70000000000001657 | 67.229 | 2.322 | n/a | 0.000 | 36.958 | 0.769 | 1.162 | 0.013 | n/a | 0.354 | 21.887 | 3.749 | n/a | 0.014 | 39.280 | 0.584 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.962ms; driver.publication.persist-deferred 0.766ms; driver.publication.persist-deferred 0.765ms |
| 732c517d408b68c70000000000001664 | 58.534 | 1.866 | n/a | 0.000 | 40.310 | 7.318 | 0.925 | 0.009 | n/a | 0.921 | 4.660 | 2.508 | n/a | 0.017 | 42.176 | 0.721 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.464ms; driver.publication.persist-deferred 1.092ms; driver.expected-state.bind-receipt 1.029ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.883ms |
| 732c517d408b68c7000000000000095b | 58.116 | 2.437 | n/a | 0.000 | 18.261 | 0.455 | 1.878 | 0.012 | n/a | 0.327 | 33.848 | 0.887 | n/a | 0.011 | 20.698 | 0.356 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.444ms; driver.publication.persist-deferred 1.277ms; driver.publication.persist-deferred 0.933ms; driver.publication.persist-deferred 0.872ms; driver.publication.persist-deferred 0.816ms |
| 732c517d408b68c7000000000000120c | 58.021 | 4.348 | n/a | 0.000 | 1.039 | 6.779 | 2.371 | 0.020 | n/a | 0.047 | 14.600 | 28.802 | n/a | 0.014 | 5.387 | 0.093 | 0.014 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 2.670ms |
| 732c517d408b68c70000000000000963 | 55.554 | 8.001 | n/a | 0.000 | 0.557 | 5.770 | 7.734 | 0.049 | n/a | 1.203 | 28.805 | 3.415 | n/a | 0.019 | 8.559 | 0.154 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.083ms; driver.publication.persist-deferred 0.892ms; driver.publication.persist-deferred 0.869ms |
| 732c517d408b68c70000000000000e1e | 52.054 | 5.718 | n/a | 0.000 | 0.851 | 0.932 | 1.240 | 0.013 | n/a | 0.061 | 42.069 | 1.155 | n/a | 0.016 | 6.569 | 0.126 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.147ms |
| 732c517d408b68c7000000000000120d | 49.402 | 1.305 | n/a | 0.000 | 0.904 | 0.371 | 1.486 | 0.023 | n/a | 3.829 | 41.002 | 0.477 | n/a | 0.006 | 2.208 | 0.045 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000001dcb | 49.047 | 2.917 | 0.163 | 0.000 | 0.033 | 0.861 | 4.414 | 0.018 | n/a | 0.068 | 37.496 | 3.062 | n/a | 0.016 | 3.113 | 0.063 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000011b6 | 47.393 | 0.944 | n/a | 0.000 | 33.398 | 1.072 | 0.446 | 0.010 | n/a | 0.055 | 11.130 | 0.331 | n/a | 0.007 | 34.343 | 0.725 | 0.007 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.061ms; driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.862ms |
| 732c517d408b68c70000000000000d23 | 46.035 | 3.813 | n/a | 0.000 | 2.335 | 5.611 | 0.384 | 0.006 | n/a | 0.104 | 33.084 | 0.687 | n/a | 0.011 | 6.148 | 0.134 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.900ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.662ms; driver.publication.persist-deferred 0.462ms |
| 732c517d408b68c700000000000014b5 | 44.970 | 1.295 | n/a | 0.000 | 9.354 | 0.273 | 0.943 | 0.030 | n/a | 0.129 | 32.354 | 0.583 | n/a | 0.010 | 10.650 | 0.237 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.037ms |
| 732c517d408b68c7000000000000165d | 43.697 | 2.182 | n/a | 0.000 | 0.852 | 5.983 | 1.467 | 0.020 | n/a | 0.795 | 27.623 | 4.769 | n/a | 0.005 | 3.033 | 0.069 | 0.005 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.962ms; driver.publication.persist-deferred 0.766ms; driver.publication.persist-deferred 0.702ms |
| 732c517d408b68c7000000000000108e | 43.220 | 2.730 | n/a | 0.000 | 9.008 | 0.361 | 1.162 | 0.007 | n/a | 0.061 | 29.048 | 0.832 | n/a | 0.010 | 11.739 | 0.272 | 0.010 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.254ms; driver.publication.persist-deferred 0.894ms |
| 732c517d408b68c70000000000000a6c | 42.666 | 2.683 | n/a | 0.000 | 1.102 | 0.292 | 0.864 | 0.006 | n/a | 0.026 | 10.788 | 26.898 | n/a | 0.007 | 3.785 | 0.089 | 0.007 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 1.161ms |
| 732c517d408b68c70000000000000d24 | 42.654 | 4.695 | n/a | 0.000 | 0.158 | 0.444 | 0.940 | 0.007 | n/a | 0.035 | 35.025 | 1.321 | n/a | 0.030 | 4.853 | 0.114 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.188ms; driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.900ms; driver.publication.persist-deferred 0.662ms; driver.publication.persist-deferred 0.462ms |
| 732c517d408b68c70000000000000d2f | 41.747 | 2.750 | n/a | 0.000 | 1.581 | 13.209 | 7.964 | 0.016 | n/a | 0.082 | 11.913 | 4.224 | n/a | 0.008 | 4.330 | 0.104 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.433ms; driver.publication.persist-deferred 0.658ms |
| 732c517d408b68c7000000000000178d | 41.524 | 2.728 | 0.145 | 0.301 | 0.035 | 0.898 | 5.886 | 0.019 | n/a | 0.053 | 24.793 | 6.651 | n/a | 0.013 | 3.209 | 0.077 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (1561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.688 | 0.000 | 0.000 | 0.383 | 1.719 | n/a | 0.000 | 0.729 | 0.559 | 0.799 | 0.012 | n/a | 0.085 | 3.873 | 0.553 | n/a | 0.013 | 2.578 | 0.275 | 0.013 |
| p99 | 37.153 | 1.706 | 0.027 | 0.879 | 5.338 | n/a | 0.000 | 11.532 | 6.193 | 3.482 | 0.039 | n/a | 2.944 | 24.803 | 6.317 | n/a | 0.043 | 13.124 | 0.680 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 732c517d408b68c70000000000001654 | 88.905 | 9.660 | n/a | 0.000 | 0.967 | 12.694 | 2.391 | 0.034 | n/a | 0.799 | 60.346 | 2.009 | n/a | 0.005 | 10.627 | 0.120 | 0.005 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.115ms; driver.publication.persist-deferred 1.092ms; driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.962ms; driver.publication.persist-deferred 0.898ms |
| 732c517d408b68c70000000000001664 | 58.534 | 1.866 | n/a | 0.000 | 40.310 | 7.318 | 0.925 | 0.009 | n/a | 0.921 | 4.660 | 2.508 | n/a | 0.017 | 42.176 | 0.721 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.464ms; driver.publication.persist-deferred 1.092ms; driver.expected-state.bind-receipt 1.029ms; driver.publication.persist-deferred 0.898ms; driver.publication.persist-deferred 0.883ms |
| 732c517d408b68c7000000000000120d | 49.402 | 1.305 | n/a | 0.000 | 0.904 | 0.371 | 1.486 | 0.023 | n/a | 3.829 | 41.002 | 0.477 | n/a | 0.006 | 2.208 | 0.045 | 0.006 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c700000000000011b6 | 47.393 | 0.944 | n/a | 0.000 | 33.398 | 1.072 | 0.446 | 0.010 | n/a | 0.055 | 11.130 | 0.331 | n/a | 0.007 | 34.343 | 0.725 | 0.007 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.061ms; driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.862ms |
| 732c517d408b68c70000000000000d23 | 46.035 | 3.813 | n/a | 0.000 | 2.335 | 5.611 | 0.384 | 0.006 | n/a | 0.104 | 33.084 | 0.687 | n/a | 0.011 | 6.148 | 0.134 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.902ms; driver.publication.persist-deferred 0.900ms; driver.publication.persist-deferred 0.851ms; driver.publication.persist-deferred 0.662ms; driver.publication.persist-deferred 0.462ms |
| 732c517d408b68c700000000000014b5 | 44.970 | 1.295 | n/a | 0.000 | 9.354 | 0.273 | 0.943 | 0.030 | n/a | 0.129 | 32.354 | 0.583 | n/a | 0.010 | 10.650 | 0.237 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.037ms |
| 732c517d408b68c70000000000000d30 | 40.965 | 1.370 | n/a | 0.000 | 0.707 | 19.926 | 0.599 | 0.004 | n/a | 0.011 | 15.774 | 2.568 | n/a | 0.006 | 2.077 | 0.051 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 1.433ms; driver.publication.persist-deferred 0.910ms |
| 732c517d408b68c70000000000000d31 | 40.823 | 1.926 | n/a | 0.000 | 0.952 | 4.352 | 7.465 | 0.003 | n/a | 0.022 | 24.194 | 1.897 | n/a | 0.012 | 2.878 | 0.070 | 0.012 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.433ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.730ms |
| 732c517d408b68c700000000000009ac | 39.954 | 1.568 | n/a | 0.000 | 1.992 | 0.482 | 0.893 | 0.012 | n/a | 0.320 | 22.907 | 11.768 | n/a | 0.013 | 3.560 | 0.089 | 0.013 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.107ms; driver.publication.persist-deferred 0.872ms; driver.publication.persist-deferred 0.856ms; driver.publication.persist-deferred 0.816ms; driver.publication.persist-deferred 0.734ms |
| 732c517d408b68c700000000000009e0 | 38.314 | 1.790 | n/a | 0.000 | 1.611 | 0.401 | 0.845 | 0.017 | n/a | 0.125 | 32.877 | 0.635 | n/a | 0.012 | 3.402 | 0.089 | 0.012 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.932ms; driver.publication.persist-deferred 0.903ms; driver.publication.persist-deferred 0.679ms |
| 732c517d408b68c70000000000001655 | 38.127 | 1.874 | n/a | 0.000 | 0.944 | 0.361 | 0.610 | 0.009 | n/a | 0.038 | 13.892 | 20.394 | n/a | 0.006 | 2.818 | 0.074 | 0.006 | tx/thread-87/transactor.triplex-function | driver.publication.persist-deferred 0.765ms |
| 732c517d408b68c70000000000001656 | 38.117 | 0.953 | n/a | 0.000 | 0.934 | 2.651 | 0.319 | 0.005 | n/a | 0.110 | 32.822 | 0.319 | n/a | 0.005 | 1.887 | 0.050 | 0.005 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.057ms; driver.publication.persist-deferred 0.765ms |
| 732c517d408b68c70000000000000e21 | 37.636 | 1.593 | n/a | 0.000 | 0.754 | 0.618 | 1.203 | 0.018 | n/a | 0.148 | 21.025 | 12.262 | n/a | 0.016 | 2.347 | 0.062 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.147ms; driver.publication.persist-deferred 0.932ms; driver.publication.persist-deferred 0.871ms |
| 732c517d408b68c70000000000001348 | 37.561 | 2.089 | n/a | 0.000 | 0.962 | 0.673 | 1.241 | 0.021 | n/a | 0.076 | 31.824 | 0.660 | n/a | 0.014 | 3.052 | 0.081 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 732c517d408b68c70000000000000d33 | 37.173 | 2.305 | n/a | 0.000 | 25.665 | 3.699 | 0.790 | 0.012 | n/a | 0.056 | 4.190 | 0.439 | n/a | 0.015 | 27.971 | 0.752 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.695ms; driver.publication.persist-deferred 1.479ms; driver.publication.persist-deferred 1.433ms; driver.publication.persist-deferred 1.220ms; driver.publication.persist-deferred 0.910ms |
| 732c517d408b68c70000000000000962 | 37.153 | 2.425 | n/a | 0.000 | 1.315 | 1.990 | 0.985 | 0.013 | n/a | 0.283 | 29.676 | 0.441 | n/a | 0.025 | 3.740 | 0.101 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.231ms; driver.publication.persist-deferred 1.083ms |
| 732c517d408b68c700000000000009e2 | 37.121 | 3.363 | n/a | 0.000 | 2.966 | 0.669 | 0.978 | 0.010 | n/a | 0.071 | 18.436 | 10.599 | n/a | 0.029 | 6.330 | 0.171 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.932ms; driver.publication.persist-deferred 0.903ms; driver.publication.persist-deferred 0.534ms |
| 732c517d408b68c700000000000011b3 | 36.688 | 6.906 | n/a | 0.000 | 0.797 | 6.193 | 1.695 | 0.022 | n/a | 0.335 | 20.207 | 0.517 | n/a | 0.016 | 7.702 | 0.210 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.884ms; driver.publication.persist-deferred 0.862ms |
| 732c517d408b68c7000000000000166c | 35.659 | 2.460 | n/a | 0.000 | 0.622 | 11.140 | 0.332 | 0.003 | n/a | 0.009 | 20.511 | 0.580 | n/a | 0.003 | 3.081 | 0.086 | 0.003 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.464ms; driver.expected-state.bind-receipt 1.029ms; driver.publication.persist-deferred 0.883ms; driver.publication.persist-deferred 0.768ms; driver.publication.persist-deferred 0.609ms |
| 732c517d408b68c700000000000019e3 | 35.608 | 2.220 | n/a | 0.000 | 0.556 | 0.616 | 1.417 | 0.020 | n/a | 0.068 | 30.288 | 0.406 | n/a | 0.016 | 2.776 | 0.078 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.322 | n/a | n/a | n/a | 0.188 | n/a | 0.000 | 0.000 | 1.972 | 200.614 | 0.013 | n/a | 0.045 | 0.000 | n/a | n/a | 0.137 | 0.188 | 0.001 | 0.137 |
| p99 | 371.109 | n/a | n/a | n/a | 16.044 | n/a | 1.263 | 0.000 | 3.279 | 364.349 | 0.100 | n/a | 0.181 | 0.000 | n/a | n/a | 0.392 | 17.307 | 0.283 | 0.392 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b0000000000000002 | 371.109 | 4.208 | n/a | 0.000 | 0.000 | 1.972 | 364.349 | 0.100 | n/a | 0.088 | 0.000 | n/a | n/a | 0.392 | 4.208 | 0.011 | 0.392 | gw-r/thread-48/gateway.admitted-work | none observed |
| 7f80eb30bcdd8b220000000000000006 | 203.447 | 0.188 | n/a | 0.000 | 0.000 | 1.169 | 201.726 | 0.045 | n/a | 0.181 | 0.000 | n/a | n/a | 0.137 | 0.188 | 0.001 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f3c | 203.405 | 0.048 | n/a | 0.000 | 0.000 | 2.059 | 201.132 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.103 | 0.048 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000005 | 202.131 | 0.048 | n/a | 0.000 | 0.000 | 0.810 | 201.002 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.137 | 0.048 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f3e | 201.322 | 0.026 | n/a | 0.000 | 0.000 | 0.617 | 200.584 | 0.003 | n/a | 0.041 | 0.000 | n/a | n/a | 0.051 | 0.026 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f3d | 201.147 | 0.026 | n/a | 0.000 | 0.000 | 0.390 | 200.614 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.066 | 0.026 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f41 | 83.311 | 16.044 | n/a | 1.263 | 0.000 | 2.452 | 63.357 | 0.028 | n/a | 0.020 | 0.000 | n/a | n/a | 0.148 | 17.307 | 0.208 | 0.148 | gw-r/thread-64/gateway.admitted-work | none observed |
| 7f80eb30bcdd8b220000000000000f43 | 60.144 | 14.660 | n/a | 0.000 | 0.000 | 3.279 | 42.041 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.154 | 14.660 | 0.244 | 0.154 | gw-r/thread-41/gateway.admitted-work | none observed |
| 7f80eb30bcdd8b220000000000000f42 | 53.435 | 15.122 | n/a | 0.000 | 0.000 | 3.107 | 35.000 | 0.024 | n/a | 0.021 | 0.000 | n/a | n/a | 0.162 | 15.122 | 0.283 | 0.162 | gw-r/thread-61/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 828.153 | n/a | n/a | n/a | 0.176 | n/a | 0.000 | 0.000 | 0.561 | 816.852 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.219 | 0.176 | 0.000 | 0.219 |
| p99 | 1008.017 | n/a | n/a | n/a | 10.427 | n/a | 0.000 | 0.000 | 1.329 | 1004.991 | 0.012 | n/a | 0.286 | 0.000 | n/a | n/a | 1.222 | 10.427 | 0.013 | 1.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b00000000000000a4 | 1008.017 | 0.176 | n/a | 0.000 | 0.000 | 1.329 | 1004.991 | 0.012 | n/a | 0.286 | 0.000 | n/a | n/a | 1.222 | 0.176 | 0.000 | 1.222 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000a5 | 828.153 | 10.427 | n/a | 0.000 | 0.000 | 0.561 | 816.852 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.219 | 10.427 | 0.013 | 0.219 | gw-r/thread-41/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 442.613 | n/a | n/a | n/a | 2.580 | n/a | 0.000 | 0.000 | 0.646 | 437.642 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.073 | 2.580 | 0.006 | 0.073 |
| p99 | 1006.105 | n/a | n/a | n/a | 8.382 | n/a | 0.000 | 0.000 | 3.133 | 1002.299 | 0.038 | n/a | 0.143 | 0.000 | n/a | n/a | 0.186 | 8.382 | 0.085 | 0.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b00000000000000bb | 1006.105 | 2.540 | n/a | 0.000 | 0.000 | 1.100 | 1002.299 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.081 | 2.540 | 0.003 | 0.081 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000b4 | 1000.710 | 2.580 | n/a | 0.000 | 0.000 | 0.552 | 997.399 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.091 | 2.580 | 0.003 | 0.091 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000ae | 996.068 | 2.435 | n/a | 0.000 | 0.000 | 1.900 | 991.558 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.066 | 2.435 | 0.002 | 0.066 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000ba | 992.215 | 4.394 | n/a | 0.000 | 0.000 | 0.484 | 987.154 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.094 | 4.394 | 0.004 | 0.094 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000ab | 962.854 | 2.640 | n/a | 0.000 | 0.000 | 0.582 | 959.378 | 0.038 | n/a | 0.121 | 0.000 | n/a | n/a | 0.096 | 2.640 | 0.003 | 0.096 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000ce | 949.572 | 3.117 | n/a | 0.000 | 0.000 | 1.312 | 944.968 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.090 | 3.117 | 0.003 | 0.090 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000a8 | 926.548 | 2.039 | n/a | 0.000 | 0.000 | 0.502 | 923.814 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.092 | 2.039 | 0.002 | 0.092 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000c1 | 915.155 | 8.382 | n/a | 0.000 | 0.000 | 0.465 | 906.058 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.184 | 8.382 | 0.009 | 0.184 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000ca | 774.343 | 2.196 | n/a | 0.000 | 0.000 | 2.495 | 769.454 | 0.022 | n/a | 0.106 | 0.000 | n/a | n/a | 0.069 | 2.196 | 0.003 | 0.069 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000c4 | 556.792 | 2.919 | n/a | 0.000 | 0.000 | 3.133 | 550.552 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.085 | 2.919 | 0.005 | 0.085 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000b2 | 543.345 | 2.712 | n/a | 0.000 | 0.000 | 0.458 | 539.978 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.065 | 2.712 | 0.005 | 0.065 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000c7 | 505.764 | 2.145 | n/a | 0.000 | 0.000 | 0.508 | 502.967 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.068 | 2.145 | 0.004 | 0.068 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000c8 | 497.635 | 2.239 | n/a | 0.000 | 0.000 | 0.606 | 494.555 | 0.033 | n/a | 0.132 | 0.000 | n/a | n/a | 0.070 | 2.239 | 0.004 | 0.070 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000c0 | 451.175 | 2.300 | n/a | 0.000 | 0.000 | 0.736 | 447.980 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.069 | 2.300 | 0.005 | 0.069 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000c6 | 442.613 | 2.799 | n/a | 0.000 | 0.000 | 2.005 | 437.642 | 0.030 | n/a | 0.054 | 0.000 | n/a | n/a | 0.083 | 2.799 | 0.006 | 0.083 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000b7 | 425.078 | 2.546 | n/a | 0.000 | 0.000 | 0.646 | 421.698 | 0.018 | n/a | 0.105 | 0.000 | n/a | n/a | 0.066 | 2.546 | 0.006 | 0.066 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000b5 | 356.256 | 5.138 | n/a | 0.000 | 0.000 | 0.684 | 350.202 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.138 | 5.138 | 0.014 | 0.138 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000b1 | 312.873 | 4.356 | n/a | 0.000 | 0.000 | 0.843 | 307.474 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.130 | 4.356 | 0.014 | 0.130 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000bc | 281.832 | 2.045 | n/a | 0.000 | 0.000 | 0.497 | 279.092 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.067 | 2.045 | 0.007 | 0.067 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000bd | 261.105 | 3.384 | n/a | 0.000 | 0.000 | 0.726 | 256.776 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.134 | 3.384 | 0.013 | 0.134 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 465.721 | n/a | n/a | n/a | 3.808 | n/a | 0.522 | 0.000 | 0.824 | 455.479 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.086 | 4.150 | 0.013 | 0.086 |
| p99 | 1007.887 | n/a | n/a | n/a | 13.339 | n/a | 1.247 | 0.000 | 3.712 | 1000.591 | 0.603 | n/a | 0.133 | 0.000 | n/a | n/a | 1.156 | 13.872 | 0.567 | 1.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b00000000000000d0 | 1007.887 | 11.804 | n/a | 1.247 | 0.000 | 1.045 | 993.587 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.131 | 13.051 | 0.013 | 0.131 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000fc | 1003.110 | 0.185 | n/a | 0.000 | 0.000 | 1.095 | 1000.591 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 1.156 | 0.185 | 0.000 | 1.156 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000d7 | 1002.078 | 5.695 | n/a | 0.630 | 0.000 | 0.874 | 994.687 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.104 | 6.325 | 0.006 | 0.104 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000dc | 1000.085 | 3.102 | n/a | 0.513 | 0.000 | 1.083 | 995.175 | 0.016 | n/a | 0.102 | 0.000 | n/a | n/a | 0.095 | 3.615 | 0.004 | 0.095 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b000000000000010c | 999.202 | 2.610 | n/a | 0.000 | 0.000 | 1.280 | 995.182 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.062 | 2.610 | 0.003 | 0.062 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000104 | 998.846 | 3.160 | n/a | 0.000 | 0.000 | 0.651 | 994.199 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.767 | 3.160 | 0.003 | 0.767 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000dd | 998.810 | 3.890 | n/a | 0.595 | 0.000 | 0.773 | 993.360 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.114 | 4.485 | 0.004 | 0.114 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000d1 | 992.902 | 3.564 | n/a | 0.586 | 0.000 | 0.505 | 988.089 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.076 | 4.150 | 0.004 | 0.076 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000d8 | 972.318 | 7.089 | n/a | 0.606 | 0.000 | 0.689 | 963.662 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.184 | 7.696 | 0.008 | 0.184 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000de | 927.537 | 4.058 | n/a | 0.527 | 0.000 | 0.479 | 922.292 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.082 | 4.585 | 0.005 | 0.082 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000101 | 910.041 | 2.506 | n/a | 0.628 | 0.000 | 0.734 | 905.995 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.076 | 3.134 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000100 | 895.830 | 2.741 | n/a | 0.000 | 0.000 | 0.839 | 892.080 | 0.009 | n/a | 0.089 | 0.000 | n/a | n/a | 0.072 | 2.741 | 0.003 | 0.072 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000d9 | 719.682 | 7.868 | n/a | 1.126 | 0.000 | 0.926 | 709.503 | 0.015 | n/a | 0.098 | 0.000 | n/a | n/a | 0.146 | 8.995 | 0.012 | 0.146 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000e2 | 679.053 | 3.948 | n/a | 0.573 | 0.000 | 0.651 | 673.755 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.089 | 4.522 | 0.007 | 0.089 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000e9 | 670.958 | 2.607 | n/a | 0.627 | 0.000 | 0.475 | 667.124 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.071 | 3.234 | 0.005 | 0.071 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000f9 | 657.071 | 4.753 | n/a | 0.000 | 0.000 | 1.046 | 651.179 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.069 | 4.753 | 0.007 | 0.069 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000e4 | 540.984 | 3.808 | n/a | 0.499 | 0.000 | 0.984 | 535.547 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.067 | 4.307 | 0.008 | 0.067 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000000d2 | 533.911 | 6.989 | n/a | 0.659 | 0.000 | 1.945 | 524.180 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.082 | 7.647 | 0.014 | 0.082 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000105 | 473.812 | 3.932 | n/a | 0.000 | 0.000 | 0.464 | 469.273 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.064 | 3.932 | 0.008 | 0.064 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000107 | 472.901 | 13.339 | n/a | 0.533 | 0.000 | 0.471 | 457.648 | 0.603 | n/a | 0.035 | 0.000 | n/a | n/a | 0.271 | 13.872 | 0.029 | 0.271 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 481.154 | n/a | n/a | n/a | 2.805 | n/a | 0.000 | 0.000 | 0.644 | 478.088 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.072 | 3.024 | 0.008 | 0.072 |
| p99 | 1009.692 | n/a | n/a | n/a | 9.065 | n/a | 0.823 | 0.000 | 4.630 | 1002.571 | 0.614 | n/a | 0.113 | 0.000 | n/a | n/a | 0.236 | 9.065 | 0.088 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b0000000000000128 | 1009.692 | 6.276 | n/a | 0.000 | 0.000 | 0.567 | 1002.571 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.199 | 6.276 | 0.006 | 0.199 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000124 | 1005.430 | 2.492 | n/a | 0.000 | 0.000 | 0.578 | 1002.135 | 0.054 | n/a | 0.113 | 0.000 | n/a | n/a | 0.058 | 2.492 | 0.002 | 0.058 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000135 | 1001.230 | 2.397 | n/a | 0.000 | 0.000 | 1.079 | 997.624 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.054 | 2.397 | 0.002 | 0.054 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b000000000000011b | 1001.159 | 2.757 | n/a | 0.615 | 0.000 | 0.391 | 997.216 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.101 | 3.372 | 0.003 | 0.101 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000129 | 988.904 | 2.552 | n/a | 0.000 | 0.000 | 4.630 | 981.586 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.082 | 2.552 | 0.003 | 0.082 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000113 | 988.518 | 2.727 | n/a | 0.502 | 0.000 | 0.936 | 984.180 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.093 | 3.229 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000110 | 955.342 | 2.510 | n/a | 0.689 | 0.000 | 0.446 | 951.513 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.100 | 3.199 | 0.003 | 0.100 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000125 | 869.358 | 5.885 | n/a | 0.000 | 0.000 | 0.578 | 862.754 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.097 | 5.885 | 0.007 | 0.097 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b000000000000011c | 864.289 | 2.263 | n/a | 0.000 | 0.000 | 0.407 | 861.495 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.064 | 2.263 | 0.003 | 0.064 | gw-r/thread-43/journal/page | none observed |
| a75eb1c3f2a6228b000000000000013e | 839.755 | 2.269 | n/a | 0.000 | 0.000 | 0.423 | 836.902 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.069 | 2.269 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b000000000000010d | 807.837 | 2.532 | n/a | 0.823 | 0.000 | 0.500 | 803.854 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.083 | 3.355 | 0.004 | 0.083 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000132 | 798.322 | 2.233 | n/a | 0.000 | 0.000 | 0.346 | 795.608 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.055 | 2.233 | 0.003 | 0.055 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b000000000000013f | 749.655 | 6.525 | n/a | 0.663 | 0.000 | 0.674 | 741.610 | 0.016 | n/a | 0.072 | 0.000 | n/a | n/a | 0.094 | 7.187 | 0.010 | 0.094 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000136 | 695.435 | 7.957 | n/a | 0.709 | 0.000 | 3.874 | 682.698 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.102 | 8.666 | 0.012 | 0.102 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000146 | 613.136 | 4.725 | n/a | 0.000 | 0.000 | 0.764 | 607.427 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.156 | 4.725 | 0.008 | 0.156 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b000000000000013a | 611.090 | 3.078 | n/a | 0.000 | 0.000 | 0.768 | 607.095 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.065 | 3.078 | 0.005 | 0.065 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000131 | 588.964 | 3.085 | n/a | 0.000 | 0.000 | 0.637 | 585.082 | 0.017 | n/a | 0.077 | 0.000 | n/a | n/a | 0.066 | 3.085 | 0.005 | 0.066 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000123 | 555.509 | 2.805 | n/a | 0.000 | 0.000 | 0.556 | 551.895 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.196 | 2.805 | 0.005 | 0.196 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b000000000000012c | 533.030 | 2.769 | n/a | 0.000 | 0.000 | 0.897 | 529.251 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.061 | 2.769 | 0.005 | 0.061 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b000000000000012a | 481.154 | 1.976 | n/a | 0.000 | 0.000 | 0.925 | 478.088 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.070 | 1.976 | 0.004 | 0.070 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 456.561 | n/a | n/a | n/a | 2.498 | n/a | 0.000 | 0.000 | 0.653 | 451.283 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.069 | 2.539 | 0.007 | 0.069 |
| p99 | 1003.969 | n/a | n/a | n/a | 10.340 | n/a | 0.872 | 0.000 | 3.619 | 1001.338 | 0.033 | n/a | 3.221 | 0.000 | n/a | n/a | 1.137 | 11.212 | 0.346 | 1.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b000000000000016b | 1003.969 | 2.316 | n/a | 0.000 | 0.000 | 1.044 | 1000.476 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.069 | 2.316 | 0.002 | 0.069 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000161 | 1002.916 | 0.098 | n/a | 0.000 | 0.000 | 0.294 | 1001.338 | 0.024 | n/a | 0.070 | 0.000 | n/a | n/a | 1.092 | 0.098 | 0.000 | 1.092 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b000000000000017b | 1002.598 | 0.129 | n/a | 0.000 | 0.000 | 0.475 | 1000.828 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 1.097 | 0.129 | 0.000 | 1.097 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000183 | 1002.531 | 0.170 | n/a | 0.000 | 0.000 | 0.633 | 1000.555 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 1.137 | 0.170 | 0.000 | 1.137 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000182 | 995.786 | 2.776 | n/a | 0.000 | 0.000 | 0.484 | 992.432 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.057 | 2.776 | 0.003 | 0.057 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000151 | 988.253 | 2.841 | n/a | 0.000 | 0.000 | 0.508 | 984.791 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.081 | 2.841 | 0.003 | 0.081 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000152 | 872.405 | 2.022 | n/a | 0.000 | 0.000 | 0.513 | 869.734 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.067 | 2.022 | 0.002 | 0.067 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000170 | 838.183 | 3.662 | n/a | 0.000 | 0.000 | 0.681 | 833.748 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.060 | 3.662 | 0.004 | 0.060 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b000000000000014c | 732.300 | 6.969 | n/a | 0.680 | 0.000 | 0.473 | 724.013 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.134 | 7.649 | 0.010 | 0.134 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000163 | 718.293 | 6.260 | n/a | 0.000 | 0.000 | 0.595 | 711.315 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.073 | 6.260 | 0.009 | 0.073 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000156 | 705.067 | 2.760 | n/a | 0.000 | 0.000 | 0.887 | 701.324 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.760 | 0.004 | 0.064 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000177 | 670.863 | 2.789 | n/a | 0.000 | 0.000 | 0.759 | 667.205 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.069 | 2.789 | 0.004 | 0.069 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000178 | 536.246 | 3.161 | n/a | 0.000 | 0.000 | 0.536 | 532.366 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.106 | 3.161 | 0.006 | 0.106 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b000000000000016c | 531.625 | 4.386 | n/a | 0.000 | 0.000 | 2.345 | 524.805 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.061 | 4.386 | 0.008 | 0.061 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000172 | 529.853 | 2.125 | n/a | 0.000 | 0.000 | 0.674 | 526.943 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 2.125 | 0.004 | 0.062 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000185 | 513.367 | 2.088 | n/a | 0.000 | 0.000 | 0.450 | 510.687 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.064 | 2.088 | 0.004 | 0.064 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000181 | 510.109 | 2.293 | n/a | 0.000 | 0.000 | 0.680 | 507.021 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.067 | 2.293 | 0.004 | 0.067 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000147 | 503.983 | 1.855 | n/a | 0.000 | 0.000 | 1.634 | 500.389 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.074 | 1.855 | 0.004 | 0.074 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b000000000000016a | 486.205 | 2.418 | n/a | 0.000 | 0.000 | 1.217 | 482.471 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.418 | 0.005 | 0.063 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000173 | 481.995 | 3.398 | n/a | 0.000 | 0.000 | 0.400 | 477.989 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.151 | 3.398 | 0.007 | 0.151 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 309.610 | n/a | n/a | n/a | 2.750 | n/a | 0.000 | 0.000 | 0.589 | 306.208 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.064 | 2.750 | 0.011 | 0.064 |
| p99 | 1004.417 | n/a | n/a | n/a | 12.499 | n/a | 0.000 | 0.000 | 3.312 | 1001.418 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 1.158 | 12.499 | 0.584 | 1.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b00000000000001a3 | 1004.417 | 0.187 | n/a | 0.000 | 0.000 | 2.105 | 1000.909 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 1.158 | 0.187 | 0.000 | 1.158 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001c2 | 1003.514 | 0.220 | n/a | 0.000 | 0.000 | 0.661 | 1001.418 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 1.157 | 0.220 | 0.000 | 1.157 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000188 | 1000.005 | 4.161 | n/a | 0.000 | 0.000 | 1.150 | 994.586 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.062 | 4.161 | 0.004 | 0.062 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001c1 | 996.348 | 4.072 | n/a | 0.000 | 0.000 | 0.456 | 991.638 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.151 | 4.072 | 0.004 | 0.151 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000197 | 986.164 | 2.495 | n/a | 0.000 | 0.000 | 1.676 | 981.868 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.067 | 2.495 | 0.003 | 0.067 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001a5 | 975.056 | 4.571 | n/a | 0.000 | 0.000 | 0.637 | 969.644 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.145 | 4.571 | 0.005 | 0.145 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001d3 | 850.883 | 3.319 | n/a | 0.000 | 0.000 | 0.510 | 846.890 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.129 | 3.319 | 0.004 | 0.129 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b000000000000019a | 850.501 | 4.099 | n/a | 0.000 | 0.000 | 0.676 | 845.615 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.073 | 4.099 | 0.005 | 0.073 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001a2 | 826.121 | 2.501 | n/a | 0.000 | 0.000 | 0.386 | 823.138 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.062 | 2.501 | 0.003 | 0.062 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b000000000000019d | 755.103 | 6.386 | n/a | 0.000 | 0.000 | 0.598 | 748.006 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.063 | 6.386 | 0.008 | 0.063 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001c4 | 712.747 | 2.627 | n/a | 0.000 | 0.000 | 0.380 | 709.652 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.059 | 2.627 | 0.004 | 0.059 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001bf | 692.285 | 2.310 | n/a | 0.000 | 0.000 | 0.699 | 689.175 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.057 | 2.310 | 0.003 | 0.057 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001ad | 681.617 | 4.041 | n/a | 0.000 | 0.000 | 0.547 | 676.927 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 4.041 | 0.006 | 0.068 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001a6 | 652.950 | 3.223 | n/a | 0.000 | 0.000 | 2.281 | 647.329 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.087 | 3.223 | 0.005 | 0.087 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001b4 | 573.896 | 2.520 | n/a | 0.000 | 0.000 | 0.501 | 570.782 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.051 | 2.520 | 0.004 | 0.051 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001cf | 545.240 | 2.155 | n/a | 0.000 | 0.000 | 0.424 | 542.559 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.064 | 2.155 | 0.004 | 0.064 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001b5 | 518.777 | 12.499 | n/a | 0.000 | 0.000 | 0.961 | 505.185 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.097 | 12.499 | 0.024 | 0.097 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001cd | 477.119 | 2.451 | n/a | 0.000 | 0.000 | 0.514 | 474.054 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.059 | 2.451 | 0.005 | 0.059 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001b7 | 472.569 | 2.750 | n/a | 0.000 | 0.000 | 0.602 | 469.115 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.057 | 2.750 | 0.006 | 0.057 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000192 | 444.480 | 3.866 | n/a | 0.000 | 0.000 | 3.312 | 437.156 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.106 | 3.866 | 0.009 | 0.106 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 302.635 | n/a | n/a | n/a | 2.394 | n/a | 0.000 | 0.000 | 0.552 | 298.994 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.069 | 2.394 | 0.009 | 0.069 |
| p99 | 1002.713 | n/a | n/a | n/a | 7.527 | n/a | 0.000 | 0.000 | 2.546 | 1001.136 | 0.029 | n/a | 0.078 | 0.000 | n/a | n/a | 1.196 | 7.527 | 0.691 | 1.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b00000000000001fc | 1002.713 | 0.100 | n/a | 0.000 | 0.000 | 0.344 | 1001.136 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 1.096 | 0.100 | 0.000 | 1.096 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001e8 | 1002.592 | 2.410 | n/a | 0.000 | 0.000 | 0.457 | 999.628 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.068 | 2.410 | 0.002 | 0.068 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000216 | 1002.425 | 0.107 | n/a | 0.000 | 0.000 | 0.375 | 1000.671 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 1.196 | 0.107 | 0.000 | 1.196 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000211 | 1002.097 | 0.105 | n/a | 0.000 | 0.000 | 0.333 | 1000.518 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.098 | 0.105 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000218 | 999.946 | 2.289 | n/a | 0.000 | 0.000 | 0.587 | 996.953 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.084 | 2.289 | 0.002 | 0.084 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000210 | 928.359 | 2.235 | n/a | 0.000 | 0.000 | 0.567 | 925.409 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.111 | 2.235 | 0.002 | 0.111 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001fe | 892.957 | 2.577 | n/a | 0.000 | 0.000 | 0.306 | 889.919 | 0.029 | n/a | 0.057 | 0.000 | n/a | n/a | 0.070 | 2.577 | 0.003 | 0.070 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000214 | 881.558 | 2.149 | n/a | 0.000 | 0.000 | 0.523 | 878.782 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.059 | 2.149 | 0.002 | 0.059 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000201 | 843.020 | 3.928 | n/a | 0.000 | 0.000 | 1.762 | 837.224 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.072 | 3.928 | 0.005 | 0.072 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000205 | 838.385 | 2.361 | n/a | 0.000 | 0.000 | 0.609 | 835.304 | 0.017 | n/a | 0.038 | 0.000 | n/a | n/a | 0.056 | 2.361 | 0.003 | 0.056 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001ee | 814.013 | 3.521 | n/a | 0.000 | 0.000 | 0.665 | 809.693 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.099 | 3.521 | 0.004 | 0.099 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001db | 812.507 | 2.560 | n/a | 0.000 | 0.000 | 0.462 | 809.394 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.058 | 2.560 | 0.003 | 0.058 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001f6 | 773.260 | 3.287 | n/a | 0.000 | 0.000 | 0.684 | 769.158 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.062 | 3.287 | 0.004 | 0.062 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001d7 | 614.103 | 4.747 | n/a | 0.000 | 0.000 | 0.552 | 608.672 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.098 | 4.747 | 0.008 | 0.098 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001f3 | 597.547 | 2.181 | n/a | 0.000 | 0.000 | 0.447 | 594.822 | 0.008 | n/a | 0.020 | 0.000 | n/a | n/a | 0.070 | 2.181 | 0.004 | 0.070 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001f7 | 580.538 | 1.846 | n/a | 0.000 | 0.000 | 2.521 | 576.068 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 1.846 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001e7 | 569.704 | 2.176 | n/a | 0.000 | 0.000 | 0.354 | 567.078 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.062 | 2.176 | 0.004 | 0.062 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001df | 483.226 | 7.075 | n/a | 0.000 | 0.000 | 0.882 | 475.146 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.070 | 7.075 | 0.015 | 0.070 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b000000000000020f | 468.342 | 2.172 | n/a | 0.000 | 0.000 | 0.468 | 465.619 | 0.002 | n/a | 0.021 | 0.000 | n/a | n/a | 0.059 | 2.172 | 0.005 | 0.059 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000001f1 | 400.350 | 4.132 | n/a | 0.000 | 0.000 | 0.604 | 395.406 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.135 | 4.132 | 0.010 | 0.135 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / internal (752 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.354 | n/a | n/a | n/a | 2.951 | n/a | 0.000 | 0.000 | 0.489 | 9.570 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.070 | 2.951 | 0.227 | 0.070 |
| p99 | 116.530 | n/a | n/a | n/a | 12.724 | n/a | 0.933 | 0.000 | 4.123 | 110.282 | 0.282 | n/a | 0.071 | 0.000 | n/a | n/a | 0.524 | 12.724 | 0.852 | 0.524 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b0000000000000224 | 987.259 | 4.691 | n/a | 0.000 | 0.000 | 0.634 | 981.720 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.182 | 4.691 | 0.005 | 0.182 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000219 | 956.013 | 1.619 | n/a | 0.000 | 0.000 | 0.349 | 953.914 | 0.014 | n/a | 0.054 | 0.000 | n/a | n/a | 0.063 | 1.619 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000225 | 937.757 | 2.198 | n/a | 0.000 | 0.000 | 1.531 | 933.884 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.069 | 2.198 | 0.002 | 0.069 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b000000000000021c | 814.008 | 2.142 | n/a | 0.000 | 0.000 | 0.336 | 811.409 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.059 | 2.142 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000220 | 790.142 | 3.897 | n/a | 0.000 | 0.000 | 0.436 | 785.643 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.126 | 3.897 | 0.005 | 0.126 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b000000000000021e | 193.157 | 2.218 | n/a | 0.000 | 0.000 | 0.383 | 190.319 | 0.155 | n/a | 0.022 | 0.000 | n/a | n/a | 0.060 | 2.218 | 0.011 | 0.060 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000223 | 178.638 | 4.393 | n/a | 0.000 | 0.000 | 0.813 | 171.901 | 1.346 | n/a | 0.042 | 0.000 | n/a | n/a | 0.143 | 4.393 | 0.025 | 0.143 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b00000000000004ea | 116.530 | 5.114 | n/a | 0.726 | 0.000 | 0.280 | 110.282 | 0.002 | n/a | 0.017 | 0.000 | n/a | n/a | 0.108 | 5.840 | 0.050 | 0.108 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b000000000000079d | 97.214 | 2.166 | n/a | 0.000 | 0.000 | 2.654 | 92.176 | 0.144 | n/a | 0.009 | 0.000 | n/a | n/a | 0.066 | 2.166 | 0.022 | 0.066 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b00000000000002f5 | 96.378 | 5.411 | n/a | 0.000 | 0.000 | 1.321 | 89.528 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.083 | 5.411 | 0.056 | 0.083 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000758 | 90.762 | 3.937 | n/a | 0.000 | 0.000 | 0.291 | 86.434 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.075 | 3.937 | 0.043 | 0.075 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b00000000000005ec | 88.410 | 5.122 | n/a | 0.000 | 0.000 | 0.545 | 82.644 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.073 | 5.122 | 0.058 | 0.073 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000632 | 84.591 | 3.313 | n/a | 0.000 | 0.000 | 0.385 | 80.776 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.063 | 3.313 | 0.039 | 0.063 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b00000000000004f2 | 79.867 | 3.010 | n/a | 0.000 | 0.000 | 0.544 | 76.187 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.086 | 3.010 | 0.038 | 0.086 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b000000000000078c | 77.919 | 6.858 | n/a | 0.000 | 0.000 | 0.399 | 70.486 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.151 | 6.858 | 0.088 | 0.151 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000777 | 77.325 | 10.591 | n/a | 0.000 | 0.000 | 1.171 | 65.454 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.084 | 10.591 | 0.137 | 0.084 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000796 | 75.716 | 8.306 | n/a | 0.000 | 0.000 | 0.521 | 66.711 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.167 | 8.306 | 0.110 | 0.167 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000623 | 70.966 | 24.871 | n/a | 1.129 | 0.000 | 2.859 | 41.760 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.287 | 26.000 | 0.366 | 0.287 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000000765 | 70.538 | 2.580 | n/a | 0.000 | 0.000 | 0.628 | 67.229 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.060 | 2.580 | 0.037 | 0.060 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b000000000000046d | 69.591 | 3.058 | n/a | 0.000 | 0.000 | 0.453 | 65.987 | 0.002 | n/a | 0.028 | 0.000 | n/a | n/a | 0.062 | 3.058 | 0.044 | 0.062 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / internal (2344 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.989 | n/a | n/a | n/a | 3.720 | n/a | 0.000 | 0.000 | 0.432 | 8.234 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.084 | 3.726 | 0.306 | 0.084 |
| p99 | 332.428 | n/a | n/a | n/a | 14.193 | n/a | 1.318 | 0.000 | 4.464 | 329.773 | 0.269 | n/a | 0.042 | 0.000 | n/a | n/a | 1.059 | 14.928 | 0.857 | 1.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a75eb1c3f2a6228b0000000000001b10 | 1002.841 | 0.466 | n/a | 0.000 | 0.000 | 0.910 | 1000.284 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 1.166 | 0.466 | 0.000 | 1.166 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ac3 | 1001.977 | 0.111 | n/a | 0.000 | 0.000 | 0.275 | 1000.459 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 1.094 | 0.111 | 0.000 | 1.094 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ac8 | 993.922 | 2.432 | n/a | 0.000 | 0.000 | 0.281 | 991.122 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.060 | 2.432 | 0.002 | 0.060 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ac5 | 974.859 | 7.473 | n/a | 0.969 | 0.000 | 0.318 | 965.493 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.580 | 8.442 | 0.009 | 0.580 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001b0b | 961.174 | 2.275 | n/a | 0.000 | 0.000 | 0.369 | 958.442 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.057 | 2.275 | 0.002 | 0.057 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001acc | 915.289 | 4.417 | n/a | 0.000 | 0.000 | 0.325 | 910.422 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.107 | 4.417 | 0.005 | 0.107 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ae5 | 898.042 | 2.500 | n/a | 0.000 | 0.000 | 0.404 | 895.059 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.058 | 2.500 | 0.003 | 0.058 | gw-r/thread-41/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ad6 | 882.337 | 2.882 | n/a | 0.000 | 0.000 | 0.406 | 878.967 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.059 | 2.882 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001b08 | 879.051 | 1.750 | n/a | 0.000 | 0.000 | 0.291 | 876.934 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 0.058 | 1.750 | 0.002 | 0.058 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001b07 | 847.730 | 2.104 | n/a | 0.000 | 0.000 | 0.313 | 845.235 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.053 | 2.104 | 0.002 | 0.053 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ac1 | 832.476 | 2.138 | n/a | 0.000 | 0.000 | 0.320 | 829.933 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.054 | 2.138 | 0.003 | 0.054 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ace | 717.554 | 3.282 | n/a | 0.000 | 0.000 | 0.526 | 713.583 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.133 | 3.282 | 0.005 | 0.133 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001b02 | 700.473 | 2.081 | n/a | 0.000 | 0.000 | 0.315 | 697.974 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.058 | 2.081 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001aea | 680.928 | 7.689 | n/a | 0.000 | 0.000 | 0.350 | 672.645 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.223 | 7.689 | 0.011 | 0.223 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ae8 | 680.568 | 2.898 | n/a | 0.000 | 0.000 | 2.200 | 675.385 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.058 | 2.898 | 0.004 | 0.058 | gw-r/thread-48/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001ae2 | 607.271 | 2.052 | n/a | 0.000 | 0.000 | 0.660 | 604.460 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.065 | 2.052 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001af8 | 593.134 | 3.550 | n/a | 0.000 | 0.000 | 0.511 | 588.978 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.066 | 3.550 | 0.006 | 0.066 | gw-r/thread-44/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001afd | 560.081 | 2.523 | n/a | 0.000 | 0.000 | 0.597 | 556.848 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.070 | 2.523 | 0.005 | 0.070 | gw-r/thread-61/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001add | 507.267 | 3.018 | n/a | 0.000 | 0.000 | 0.291 | 503.875 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.058 | 3.018 | 0.006 | 0.058 | gw-r/thread-46/journal/page | none observed |
| a75eb1c3f2a6228b0000000000001b00 | 410.405 | 3.049 | n/a | 0.000 | 0.000 | 0.271 | 406.976 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.066 | 3.049 | 0.007 | 0.066 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.979 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.843 | 200.840 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 |
| p99 | 206.038 | n/a | n/a | n/a | 0.136 | n/a | 0.000 | 0.000 | 5.005 | 205.176 | 9.127 | n/a | 1.171 | 0.000 | n/a | n/a | 0.286 | 0.136 | 0.001 | 0.286 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b220000000000000014 | 206.038 | 0.030 | n/a | 0.000 | 0.000 | 0.490 | 205.176 | 0.023 | n/a | 0.249 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000059 | 205.775 | 0.029 | n/a | 0.000 | 0.000 | 5.005 | 200.598 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.080 | 0.029 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000003d | 205.661 | 0.054 | n/a | 0.000 | 0.000 | 0.602 | 204.697 | 0.021 | n/a | 0.190 | 0.000 | n/a | n/a | 0.098 | 0.054 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000031 | 205.636 | 0.032 | n/a | 0.000 | 0.000 | 1.000 | 204.372 | 0.012 | n/a | 0.130 | 0.000 | n/a | n/a | 0.089 | 0.032 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000052 | 205.118 | 0.031 | n/a | 0.000 | 0.000 | 4.296 | 200.608 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000002d | 204.749 | 0.032 | n/a | 0.000 | 0.000 | 2.628 | 201.838 | 0.035 | n/a | 0.147 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000000e | 204.673 | 0.062 | n/a | 0.000 | 0.000 | 2.289 | 201.914 | 0.041 | n/a | 0.198 | 0.000 | n/a | n/a | 0.170 | 0.062 | 0.000 | 0.170 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000049 | 204.443 | 0.047 | n/a | 0.000 | 0.000 | 3.638 | 200.633 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.088 | 0.047 | 0.000 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000034 | 204.325 | 0.032 | n/a | 0.000 | 0.000 | 2.702 | 201.378 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.084 | 0.032 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000043 | 204.261 | 0.025 | n/a | 0.000 | 0.000 | 2.476 | 201.622 | 0.013 | n/a | 0.061 | 0.000 | n/a | n/a | 0.065 | 0.025 | 0.000 | 0.065 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000005b | 204.191 | 0.033 | n/a | 0.000 | 0.000 | 1.858 | 202.057 | 0.013 | n/a | 0.157 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000001a | 204.080 | 0.027 | n/a | 0.000 | 0.000 | 1.449 | 201.643 | 0.023 | n/a | 0.869 | 0.000 | n/a | n/a | 0.069 | 0.027 | 0.000 | 0.069 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000004a | 204.068 | 0.040 | n/a | 0.000 | 0.000 | 0.774 | 200.830 | 2.260 | n/a | 0.074 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000000f | 203.976 | 0.048 | n/a | 0.000 | 0.000 | 0.992 | 201.636 | 0.045 | n/a | 1.171 | 0.000 | n/a | n/a | 0.084 | 0.048 | 0.000 | 0.084 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000015 | 203.717 | 0.031 | n/a | 0.000 | 0.000 | 0.953 | 202.489 | 0.013 | n/a | 0.158 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000042 | 203.515 | 0.042 | n/a | 0.000 | 0.000 | 2.030 | 201.186 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.152 | 0.042 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000009 | 203.501 | 0.036 | n/a | 0.000 | 0.000 | 1.708 | 201.299 | 0.012 | n/a | 0.160 | 0.000 | n/a | n/a | 0.286 | 0.036 | 0.000 | 0.286 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000032 | 203.483 | 0.045 | n/a | 0.000 | 0.000 | 1.376 | 201.487 | 0.015 | n/a | 0.446 | 0.000 | n/a | n/a | 0.114 | 0.045 | 0.000 | 0.114 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000016 | 203.319 | 0.029 | n/a | 0.000 | 0.000 | 0.933 | 202.128 | 0.012 | n/a | 0.153 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000003e | 203.097 | 0.039 | n/a | 0.000 | 0.000 | 1.048 | 201.750 | 0.021 | n/a | 0.158 | 0.000 | n/a | n/a | 0.080 | 0.039 | 0.000 | 0.080 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.956 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.782 | 200.896 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.077 | 0.038 | 0.000 | 0.077 |
| p99 | 212.196 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 4.319 | 209.835 | 8.632 | n/a | 0.749 | 0.000 | n/a | n/a | 1.239 | 0.088 | 0.001 | 1.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b220000000000000079 | 212.196 | 0.032 | n/a | 0.000 | 0.000 | 2.090 | 209.835 | 0.029 | n/a | 0.144 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000bb | 206.313 | 0.032 | n/a | 0.000 | 0.000 | 1.108 | 204.951 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 0.085 | 0.032 | 0.000 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000006c | 205.536 | 0.049 | n/a | 0.000 | 0.000 | 1.541 | 203.719 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.123 | 0.049 | 0.000 | 0.123 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000ab | 205.204 | 0.030 | n/a | 0.000 | 0.000 | 0.447 | 204.548 | 0.023 | n/a | 0.082 | 0.000 | n/a | n/a | 0.074 | 0.030 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000be | 205.041 | 0.021 | n/a | 0.000 | 0.000 | 4.319 | 200.586 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.060 | 0.021 | 0.000 | 0.060 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000064 | 204.864 | 0.039 | n/a | 0.000 | 0.000 | 0.842 | 203.846 | 0.012 | n/a | 0.030 | 0.000 | n/a | n/a | 0.095 | 0.039 | 0.000 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000084 | 204.813 | 0.053 | n/a | 0.000 | 0.000 | 0.709 | 203.820 | 0.023 | n/a | 0.089 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000091 | 204.793 | 0.030 | n/a | 0.000 | 0.000 | 3.667 | 200.926 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000068 | 204.518 | 0.032 | n/a | 0.000 | 0.000 | 0.699 | 203.567 | 0.011 | n/a | 0.138 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000080 | 204.188 | 0.073 | n/a | 0.000 | 0.000 | 1.490 | 202.380 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.188 | 0.073 | 0.000 | 0.188 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000c1 | 204.181 | 0.036 | n/a | 0.000 | 0.000 | 0.752 | 203.269 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.079 | 0.036 | 0.000 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000006f | 204.050 | 0.038 | n/a | 0.000 | 0.000 | 2.859 | 200.966 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000005e | 203.478 | 0.044 | n/a | 0.000 | 0.000 | 2.058 | 201.150 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.108 | 0.044 | 0.000 | 0.108 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000008f | 203.203 | 0.054 | n/a | 0.000 | 0.000 | 0.875 | 200.910 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 1.239 | 0.054 | 0.000 | 1.239 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000071 | 202.803 | 0.051 | n/a | 0.000 | 0.000 | 0.830 | 201.625 | 0.024 | n/a | 0.127 | 0.000 | n/a | n/a | 0.146 | 0.051 | 0.000 | 0.146 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000081 | 202.698 | 0.036 | n/a | 0.000 | 0.000 | 1.271 | 201.197 | 0.009 | n/a | 0.107 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000007b | 202.648 | 0.031 | n/a | 0.000 | 0.000 | 0.923 | 201.472 | 0.021 | n/a | 0.138 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000005f | 202.648 | 0.042 | n/a | 0.000 | 0.000 | 1.034 | 201.326 | 0.010 | n/a | 0.116 | 0.000 | n/a | n/a | 0.120 | 0.042 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000086 | 202.632 | 0.032 | n/a | 0.000 | 0.000 | 0.737 | 201.557 | 0.019 | n/a | 0.214 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000009d | 202.600 | 0.033 | n/a | 0.000 | 0.000 | 0.968 | 201.350 | 0.015 | n/a | 0.155 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.768 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.718 | 200.695 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 |
| p99 | 205.711 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 4.499 | 204.956 | 7.140 | n/a | 2.583 | 0.000 | n/a | n/a | 0.191 | 0.083 | 0.001 | 0.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b2200000000000000e8 | 205.711 | 0.030 | n/a | 0.000 | 0.000 | 0.545 | 204.956 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000cf | 205.338 | 0.028 | n/a | 0.000 | 0.000 | 4.499 | 200.664 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000ec | 205.233 | 0.035 | n/a | 0.000 | 0.000 | 4.220 | 200.812 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000ee | 205.100 | 0.031 | n/a | 0.000 | 0.000 | 0.772 | 201.604 | 0.042 | n/a | 2.583 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000db | 204.860 | 0.055 | n/a | 0.000 | 0.000 | 0.661 | 196.902 | 7.137 | n/a | 0.030 | 0.000 | n/a | n/a | 0.075 | 0.055 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000d2 | 204.130 | 0.038 | n/a | 0.000 | 0.000 | 0.704 | 203.237 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.111 | 0.038 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000129 | 203.784 | 0.059 | n/a | 0.000 | 0.000 | 0.676 | 202.881 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.095 | 0.059 | 0.000 | 0.095 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000da | 203.780 | 0.035 | n/a | 0.000 | 0.000 | 0.926 | 202.635 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000f4 | 203.442 | 0.029 | n/a | 0.000 | 0.000 | 0.634 | 201.306 | 1.309 | n/a | 0.104 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000ca | 203.110 | 0.031 | n/a | 0.000 | 0.000 | 0.575 | 202.382 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000d5 | 203.102 | 0.050 | n/a | 0.000 | 0.000 | 0.718 | 202.145 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.132 | 0.050 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000109 | 203.056 | 0.032 | n/a | 0.000 | 0.000 | 0.965 | 201.757 | 0.016 | n/a | 0.226 | 0.000 | n/a | n/a | 0.061 | 0.032 | 0.000 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000e3 | 202.999 | 0.042 | n/a | 0.000 | 0.000 | 1.334 | 201.405 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.085 | 0.042 | 0.000 | 0.085 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000f3 | 202.891 | 0.028 | n/a | 0.000 | 0.000 | 1.061 | 201.571 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.067 | 0.028 | 0.000 | 0.067 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000df | 202.884 | 0.045 | n/a | 0.000 | 0.000 | 2.048 | 200.629 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.081 | 0.045 | 0.000 | 0.081 | gw-r/thread-43/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000012b | 202.875 | 0.032 | n/a | 0.000 | 0.000 | 1.831 | 200.856 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.065 | 0.032 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000ef | 202.871 | 0.017 | n/a | 0.000 | 0.000 | 0.656 | 201.882 | 0.027 | n/a | 0.205 | 0.000 | n/a | n/a | 0.085 | 0.017 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000000d8 | 202.849 | 0.029 | n/a | 0.000 | 0.000 | 0.789 | 201.726 | 0.014 | n/a | 0.233 | 0.000 | n/a | n/a | 0.059 | 0.029 | 0.000 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000108 | 202.819 | 0.059 | n/a | 0.000 | 0.000 | 0.988 | 201.604 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.083 | 0.059 | 0.000 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000120 | 202.681 | 0.064 | n/a | 0.000 | 0.000 | 1.287 | 201.097 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.104 | 0.064 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.673 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.715 | 200.773 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.073 | 0.041 | 0.000 | 0.073 |
| p99 | 209.706 | n/a | n/a | n/a | 0.085 | n/a | 0.000 | 0.000 | 4.228 | 207.196 | 23.985 | n/a | 0.166 | 0.000 | n/a | n/a | 0.179 | 0.085 | 0.001 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b220000000000000140 | 209.706 | 0.058 | n/a | 0.000 | 0.000 | 2.272 | 207.196 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.122 | 0.058 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000017b | 205.961 | 0.052 | n/a | 0.000 | 0.000 | 1.553 | 204.156 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.129 | 0.052 | 0.000 | 0.129 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000016e | 205.392 | 0.043 | n/a | 0.000 | 0.000 | 4.228 | 200.987 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.069 | 0.043 | 0.000 | 0.069 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000131 | 205.364 | 0.044 | n/a | 0.000 | 0.000 | 0.796 | 204.330 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.103 | 0.044 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000018f | 205.013 | 0.047 | n/a | 0.000 | 0.000 | 1.312 | 203.383 | 0.015 | n/a | 0.166 | 0.000 | n/a | n/a | 0.090 | 0.047 | 0.000 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000016a | 203.287 | 0.030 | n/a | 0.000 | 0.000 | 1.504 | 201.600 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.063 | 0.030 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000191 | 203.278 | 0.044 | n/a | 0.000 | 0.000 | 2.212 | 200.796 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.164 | 0.044 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000016b | 203.232 | 0.033 | n/a | 0.000 | 0.000 | 1.028 | 201.944 | 0.016 | n/a | 0.143 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000136 | 203.093 | 0.029 | n/a | 0.000 | 0.000 | 1.071 | 201.812 | 0.010 | n/a | 0.108 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000187 | 203.047 | 0.045 | n/a | 0.000 | 0.000 | 0.828 | 202.036 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.075 | 0.045 | 0.000 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000164 | 202.971 | 0.053 | n/a | 0.000 | 0.000 | 1.095 | 201.577 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.138 | 0.053 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000188 | 202.872 | 0.027 | n/a | 0.000 | 0.000 | 0.842 | 201.830 | 0.014 | n/a | 0.085 | 0.000 | n/a | n/a | 0.073 | 0.027 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000017a | 202.771 | 0.030 | n/a | 0.000 | 0.000 | 0.417 | 202.208 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000175 | 202.711 | 0.048 | n/a | 0.000 | 0.000 | 1.860 | 200.611 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.139 | 0.048 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000189 | 202.611 | 0.029 | n/a | 0.000 | 0.000 | 1.105 | 201.323 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000015d | 202.564 | 0.029 | n/a | 0.000 | 0.000 | 0.957 | 201.430 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.060 | 0.029 | 0.000 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000141 | 202.397 | 0.050 | n/a | 0.000 | 0.000 | 0.494 | 201.649 | 0.013 | n/a | 0.062 | 0.000 | n/a | n/a | 0.129 | 0.050 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000149 | 202.396 | 0.023 | n/a | 0.000 | 0.000 | 0.687 | 201.549 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.049 | 0.023 | 0.000 | 0.049 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000154 | 202.281 | 0.029 | n/a | 0.000 | 0.000 | 1.013 | 201.103 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.061 | 0.029 | 0.000 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000013d | 202.278 | 0.043 | n/a | 0.000 | 0.000 | 1.029 | 201.010 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.118 | 0.043 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.444 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.663 | 200.649 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 |
| p99 | 204.370 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 2.023 | 201.919 | 3.311 | n/a | 0.116 | 0.000 | n/a | n/a | 0.143 | 0.079 | 0.001 | 0.143 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b2200000000000001e0 | 205.036 | 0.029 | n/a | 0.000 | 0.000 | 0.589 | 204.281 | 0.014 | n/a | 0.061 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000203 | 204.370 | 0.029 | n/a | 0.000 | 0.000 | 3.591 | 200.646 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.065 | 0.029 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001f1 | 203.159 | 0.054 | n/a | 0.000 | 0.000 | 1.366 | 201.509 | 0.015 | n/a | 0.116 | 0.000 | n/a | n/a | 0.099 | 0.054 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001fb | 202.781 | 0.059 | n/a | 0.000 | 0.000 | 1.435 | 201.077 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.131 | 0.059 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001da | 202.753 | 0.045 | n/a | 0.000 | 0.000 | 1.298 | 201.214 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.103 | 0.045 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001f2 | 202.644 | 0.051 | n/a | 0.000 | 0.000 | 0.914 | 201.440 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.126 | 0.051 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001ec | 202.600 | 0.055 | n/a | 0.000 | 0.000 | 1.234 | 201.098 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.135 | 0.055 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001dd | 202.593 | 0.024 | n/a | 0.000 | 0.000 | 0.516 | 201.919 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.052 | 0.024 | 0.000 | 0.052 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001ea | 202.405 | 0.050 | n/a | 0.000 | 0.000 | 1.054 | 201.106 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.148 | 0.050 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001bf | 202.348 | 0.042 | n/a | 0.000 | 0.000 | 1.542 | 200.617 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.100 | 0.042 | 0.000 | 0.100 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001a7 | 202.312 | 0.046 | n/a | 0.000 | 0.000 | 0.571 | 201.519 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 0.046 | 0.000 | 0.113 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001df | 202.310 | 0.033 | n/a | 0.000 | 0.000 | 0.959 | 201.173 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.065 | 0.033 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000197 | 202.300 | 0.046 | n/a | 0.000 | 0.000 | 0.869 | 201.222 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.068 | 0.046 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001d4 | 202.257 | 0.041 | n/a | 0.000 | 0.000 | 0.632 | 201.401 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000019a | 202.239 | 0.041 | n/a | 0.000 | 0.000 | 0.888 | 201.137 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.091 | 0.041 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001ac | 202.232 | 0.033 | n/a | 0.000 | 0.000 | 0.881 | 201.153 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.083 | 0.033 | 0.000 | 0.083 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001ab | 202.215 | 0.038 | n/a | 0.000 | 0.000 | 0.871 | 201.148 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001aa | 202.166 | 0.044 | n/a | 0.000 | 0.000 | 0.689 | 201.237 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.108 | 0.044 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000198 | 202.161 | 0.026 | n/a | 0.000 | 0.000 | 0.453 | 201.503 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.063 | 0.026 | 0.000 | 0.063 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b2200000000000001c4 | 202.131 | 0.058 | n/a | 0.000 | 0.000 | 0.904 | 200.961 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.133 | 0.058 | 0.000 | 0.133 | gw-r/thread-41/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.387 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.643 | 200.606 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 |
| p99 | 204.364 | n/a | n/a | n/a | 0.082 | n/a | 0.000 | 0.000 | 4.260 | 203.432 | 1.337 | n/a | 0.135 | 0.000 | n/a | n/a | 0.171 | 0.082 | 0.001 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b220000000000000219 | 210.701 | 0.036 | n/a | 0.000 | 0.000 | 5.319 | 205.213 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000022b | 204.364 | 0.037 | n/a | 0.000 | 0.000 | 0.712 | 203.432 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.070 | 0.037 | 0.000 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000023f | 204.036 | 0.032 | n/a | 0.000 | 0.000 | 3.281 | 200.606 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 0.032 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000222 | 203.254 | 0.047 | n/a | 0.000 | 0.000 | 0.751 | 202.288 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.131 | 0.047 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000247 | 203.051 | 0.040 | n/a | 0.000 | 0.000 | 0.962 | 201.801 | 0.014 | n/a | 0.162 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000025a | 202.935 | 0.042 | n/a | 0.000 | 0.000 | 2.182 | 200.578 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.075 | 0.042 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000214 | 202.758 | 0.034 | n/a | 0.000 | 0.000 | 0.906 | 201.600 | 0.015 | n/a | 0.135 | 0.000 | n/a | n/a | 0.067 | 0.034 | 0.000 | 0.067 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000269 | 202.553 | 0.066 | n/a | 0.000 | 0.000 | 1.278 | 200.997 | 0.008 | n/a | 0.020 | 0.000 | n/a | n/a | 0.184 | 0.066 | 0.000 | 0.184 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000023c | 202.485 | 0.037 | n/a | 0.000 | 0.000 | 0.599 | 201.651 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000252 | 202.389 | 0.064 | n/a | 0.000 | 0.000 | 0.791 | 201.291 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.152 | 0.064 | 0.000 | 0.152 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000027a | 202.329 | 0.052 | n/a | 0.000 | 0.000 | 0.974 | 201.101 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.136 | 0.052 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000023b | 202.305 | 0.024 | n/a | 0.000 | 0.000 | 0.598 | 201.512 | 0.038 | n/a | 0.075 | 0.000 | n/a | n/a | 0.059 | 0.024 | 0.000 | 0.059 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000230 | 202.296 | 0.020 | n/a | 0.000 | 0.000 | 0.770 | 201.385 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.044 | 0.020 | 0.000 | 0.044 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000026a | 202.283 | 0.047 | n/a | 0.000 | 0.000 | 1.074 | 200.995 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.114 | 0.047 | 0.000 | 0.114 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000239 | 202.254 | 0.065 | n/a | 0.000 | 0.000 | 1.209 | 200.772 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.157 | 0.065 | 0.000 | 0.157 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000024d | 202.228 | 0.045 | n/a | 0.000 | 0.000 | 0.981 | 200.960 | 0.008 | n/a | 0.109 | 0.000 | n/a | n/a | 0.126 | 0.045 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000237 | 202.217 | 0.026 | n/a | 0.000 | 0.000 | 0.760 | 201.246 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.059 | 0.026 | 0.000 | 0.059 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000263 | 202.217 | 0.033 | n/a | 0.000 | 0.000 | 1.609 | 200.472 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000264 | 202.197 | 0.024 | n/a | 0.000 | 0.000 | 0.655 | 201.368 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.053 | 0.024 | 0.000 | 0.053 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000248 | 202.193 | 0.069 | n/a | 0.000 | 0.000 | 1.191 | 200.723 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.157 | 0.069 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.363 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.553 | 64.819 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.059 | 0.044 | 0.001 | 0.059 |
| p99 | 203.536 | n/a | n/a | n/a | 0.136 | n/a | 0.000 | 0.000 | 1.999 | 201.698 | 0.575 | n/a | 0.138 | 0.000 | n/a | n/a | 0.193 | 0.136 | 0.007 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b220000000000000285 | 203.536 | 0.112 | n/a | 0.000 | 0.000 | 1.383 | 201.698 | 0.012 | n/a | 0.138 | 0.000 | n/a | n/a | 0.193 | 0.112 | 0.001 | 0.193 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000280 | 203.133 | 0.044 | n/a | 0.000 | 0.000 | 1.651 | 201.247 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.092 | 0.044 | 0.000 | 0.092 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000295 | 202.642 | 0.039 | n/a | 0.000 | 0.000 | 0.740 | 201.632 | 0.016 | n/a | 0.130 | 0.000 | n/a | n/a | 0.086 | 0.039 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000027f | 202.635 | 0.025 | n/a | 0.000 | 0.000 | 1.204 | 201.277 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.058 | 0.025 | 0.000 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000296 | 202.473 | 0.043 | n/a | 0.000 | 0.000 | 1.160 | 201.092 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.089 | 0.043 | 0.000 | 0.089 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000028b | 202.421 | 0.053 | n/a | 0.000 | 0.000 | 1.076 | 201.073 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.128 | 0.053 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000289 | 202.289 | 0.036 | n/a | 0.000 | 0.000 | 0.756 | 201.321 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000028e | 201.984 | 0.044 | n/a | 0.000 | 0.000 | 0.711 | 201.039 | 0.036 | n/a | 0.073 | 0.000 | n/a | n/a | 0.081 | 0.044 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000283 | 201.923 | 0.032 | n/a | 0.000 | 0.000 | 0.819 | 200.920 | 0.015 | n/a | 0.059 | 0.000 | n/a | n/a | 0.079 | 0.032 | 0.000 | 0.079 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000290 | 201.681 | 0.024 | n/a | 0.000 | 0.000 | 0.362 | 201.141 | 0.015 | n/a | 0.084 | 0.000 | n/a | n/a | 0.054 | 0.024 | 0.000 | 0.054 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000291 | 201.555 | 0.027 | n/a | 0.000 | 0.000 | 0.598 | 200.804 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.061 | 0.027 | 0.000 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000028a | 201.487 | 0.020 | n/a | 0.000 | 0.000 | 0.569 | 200.820 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.040 | 0.020 | 0.000 | 0.040 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000294 | 201.445 | 0.045 | n/a | 0.000 | 0.000 | 0.680 | 200.556 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.117 | 0.045 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000028f | 201.349 | 0.030 | n/a | 0.000 | 0.000 | 0.645 | 200.578 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000027d | 201.305 | 0.026 | n/a | 0.000 | 0.000 | 0.517 | 200.654 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.052 | 0.026 | 0.000 | 0.052 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000027e | 201.291 | 0.047 | n/a | 0.000 | 0.000 | 0.582 | 200.511 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.122 | 0.047 | 0.000 | 0.122 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000293 | 201.276 | 0.042 | n/a | 0.000 | 0.000 | 0.491 | 200.585 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.104 | 0.042 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000284 | 201.133 | 0.025 | n/a | 0.000 | 0.000 | 0.411 | 200.621 | 0.007 | n/a | 0.020 | 0.000 | n/a | n/a | 0.050 | 0.025 | 0.000 | 0.050 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000287 | 192.893 | 0.039 | n/a | 0.000 | 0.000 | 0.556 | 192.171 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.053 | 0.039 | 0.000 | 0.053 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b22000000000000028d | 168.491 | 0.051 | n/a | 0.000 | 0.000 | 0.727 | 167.624 | 0.008 | n/a | 0.020 | 0.000 | n/a | n/a | 0.062 | 0.051 | 0.000 | 0.062 | gw-r/thread-61/journal/page | none observed |

## P3 / tail / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.995 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.441 | 80.476 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.058 | 0.037 | 0.000 | 0.058 |
| p99 | 202.695 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 4.035 | 201.189 | 1.177 | n/a | 0.084 | 0.000 | n/a | n/a | 0.154 | 0.086 | 0.002 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f80eb30bcdd8b220000000000000eee | 203.180 | 0.046 | n/a | 0.000 | 0.000 | 2.341 | 200.598 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.150 | 0.046 | 0.000 | 0.150 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f2b | 202.935 | 0.029 | n/a | 0.000 | 0.000 | 2.099 | 200.695 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.061 | 0.029 | 0.000 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f1a | 202.695 | 0.042 | n/a | 0.000 | 0.000 | 0.502 | 201.932 | 0.041 | n/a | 0.055 | 0.000 | n/a | n/a | 0.123 | 0.042 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ecf | 202.332 | 0.031 | n/a | 0.000 | 0.000 | 0.842 | 201.295 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.091 | 0.031 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000eda | 202.015 | 0.039 | n/a | 0.000 | 0.000 | 0.577 | 201.189 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.105 | 0.039 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000edf | 201.873 | 0.042 | n/a | 0.000 | 0.000 | 0.645 | 200.972 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.122 | 0.042 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ece | 201.829 | 0.036 | n/a | 0.000 | 0.000 | 0.888 | 200.805 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.062 | 0.036 | 0.000 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ed4 | 201.735 | 0.070 | n/a | 0.000 | 0.000 | 0.816 | 200.751 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.062 | 0.070 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f2c | 201.733 | 0.060 | n/a | 0.000 | 0.000 | 1.075 | 200.482 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.089 | 0.060 | 0.000 | 0.089 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ec8 | 201.676 | 0.029 | n/a | 0.000 | 0.000 | 0.549 | 200.974 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.063 | 0.029 | 0.000 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f06 | 201.656 | 0.032 | n/a | 0.000 | 0.000 | 0.470 | 200.983 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ed5 | 201.616 | 0.066 | n/a | 0.000 | 0.000 | 0.743 | 200.658 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.081 | 0.066 | 0.000 | 0.081 | gw-r/thread-61/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f0c | 201.607 | 0.041 | n/a | 0.000 | 0.000 | 0.529 | 200.852 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.121 | 0.041 | 0.000 | 0.121 | gw-r/thread-44/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ef1 | 201.607 | 0.043 | n/a | 0.000 | 0.000 | 0.627 | 200.757 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.116 | 0.043 | 0.000 | 0.116 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f2e | 201.606 | 0.026 | n/a | 0.000 | 0.000 | 0.660 | 200.816 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.058 | 0.026 | 0.000 | 0.058 | gw-r/thread-41/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000efb | 201.604 | 0.034 | n/a | 0.000 | 0.000 | 0.647 | 200.754 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.118 | 0.034 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000f34 | 201.564 | 0.037 | n/a | 0.000 | 0.000 | 0.624 | 200.740 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.074 | 0.037 | 0.000 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000edc | 201.530 | 0.055 | n/a | 0.000 | 0.000 | 0.842 | 200.468 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.122 | 0.055 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000eca | 201.514 | 0.034 | n/a | 0.000 | 0.000 | 0.632 | 200.704 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.092 | 0.034 | 0.000 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 7f80eb30bcdd8b220000000000000ef6 | 201.512 | 0.037 | n/a | 0.000 | 0.000 | 0.425 | 200.880 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.106 | 0.037 | 0.000 | 0.106 | gw-r/thread-41/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
