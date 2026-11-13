# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (127.715 ms, trace `7b672587083433f40000000000001ae3`); `node-14/thread-0/driver.queue.scheduler-late` (110.864 ms, trace `7b672587083433f40000000000001ae4`); `node-14/thread-0/driver.queue.scheduler-late` (94.339 ms, trace `7b672587083433f40000000000001ae5`); `node-14/thread-0/driver.queue.subject` (68.819 ms, trace `7b672587083433f40000000000001aed`); `node-14/thread-0/driver.queue.scheduler-late` (84.273 ms, trace `7b672587083433f40000000000001ae7`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-cpu-floor-a-3-engine-isolated`; source `04f9aa93ffa8297049405cedb99839753b8aeb3f`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 37843636.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 208 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13437.801 | 606.380 | 47.165 | 308 |
| L1 | 0 | 19914.691 | 455.851 | 22.321 | 467 |
| L4 | 0 | 19355.246 | 346.696 | 16.171 | 426 |
| L16 | 0 | 19661.342 | 486.616 | 27.551 | 474 |
| L64 | 0 | 19119.274 | 383.396 | 24.071 | 610 |
| L256 | 0 | 19397.744 | 351.037 | 17.529 | 467 |
| L1024 | 0 | 19984.081 | 3675.739 | 122.135 | 12045 |
| tail | 0 | 64530.054 | 11573.441 | 502.139 | 37427 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 7b672587083433f40000000000001ae3 | driver.queue.scheduler-late | 0.861 | none | 0 / 32 |
| 7b672587083433f40000000000001ae3 | driver.queue.scheduler-dispatch | 0.044 | none | 0 / 32 |

Observed active steps while trace 7b672587083433f40000000000001ae3 waited: []

| 7b672587083433f40000000000001ae4 | driver.queue.scheduler-late | 110.864 | none | 1 / 32 |
| 7b672587083433f40000000000001ae4 | driver.queue.scheduler-dispatch | 0.057 | none | 1 / 32 |

Observed active steps while trace 7b672587083433f40000000000001ae4 waited: []

| 7b672587083433f40000000000001ae5 | driver.queue.scheduler-late | 94.339 | none | 2 / 32 |
| 7b672587083433f40000000000001ae5 | driver.queue.subject | 20.435 | 7b672587083433f40000000000001ae4 | 2 / 32 |
| 7b672587083433f40000000000001ae5 | driver.queue.scheduler-dispatch | 0.069 | none | 3 / 32 |

Observed active steps while trace 7b672587083433f40000000000001ae5 waited: []

| 7b672587083433f40000000000001aed | driver.queue.subject | 68.819 | 7b672587083433f40000000000001aea | 4 / 32 |
| 7b672587083433f40000000000001aed | driver.queue.scheduler-late | 9.145 | none | 4 / 32 |
| 7b672587083433f40000000000001aed | driver.queue.scheduler-dispatch | 0.064 | none | 1 / 32 |

Observed active steps while trace 7b672587083433f40000000000001aed waited: [{"at":1794585062441.1348,"inFlight":4,"capacity":32,"active":[{"traceId":"7b672587083433f40000000000001ae6","step":"client.http"},{"traceId":"7b672587083433f40000000000001ae8","step":"client.http"},{"traceId":"7b672587083433f40000000000001aeb","step":"client.http"},{"traceId":"7b672587083433f40000000000001ae5","step":"client.http"}]},{"at":1794585062463.0786,"inFlight":2,"capacity":32,"active":[{"traceId":"7b672587083433f40000000000001ae9","step":"client.http"},{"traceId":"7b672587083433f40000000000001af4","step":"client.http"}]},{"at":1794585062486.1985,"inFlight":2,"capacity":32,"active":[{"traceId":"7b672587083433f40000000000001ae9","step":"client.http"},{"traceId":"7b672587083433f40000000000001af4","step":"client.http"}]}]

| 7b672587083433f40000000000001ae7 | driver.queue.scheduler-late | 84.273 | none | 3 / 32 |
| 7b672587083433f40000000000001ae7 | driver.queue.subject | 31.918 | 7b672587083433f40000000000001ae5 | 3 / 32 |
| 7b672587083433f40000000000001ae7 | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |

Observed active steps while trace 7b672587083433f40000000000001ae7 waited: [{"at":1794585062441.1348,"inFlight":4,"capacity":32,"active":[{"traceId":"7b672587083433f40000000000001ae6","step":"client.http"},{"traceId":"7b672587083433f40000000000001ae8","step":"client.http"},{"traceId":"7b672587083433f40000000000001aeb","step":"client.http"},{"traceId":"7b672587083433f40000000000001ae5","step":"client.http"}]}]

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.395 | 0.567 | 0.000 | 1.538 | 5.131 | 0.082 | 0.000 | 0.163 | 1.544 | 6.707 | 0.040 | 0.000 | 0.466 | 12.324 | n/a | n/a | 0.054 | 6.277 | 0.237 | 0.054 |
| p99 | 66.042 | 3.159 | 0.000 | 4.702 | 18.224 | 2.757 | 4.311 | 1.289 | 6.454 | 16.628 | 0.097 | 0.000 | 5.242 | 51.451 | n/a | n/a | 0.488 | 19.025 | 0.565 | 0.488 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000425 | 66.042 | 18.224 | 0.681 | 0.000 | 0.120 | 6.454 | 16.628 | 0.097 | 0.000 | 1.313 | 22.458 | n/a | n/a | 0.067 | 19.025 | 0.288 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000042b | 60.599 | 5.196 | 0.010 | 0.000 | 1.072 | 0.753 | 1.119 | 0.027 | 0.000 | 0.886 | 51.451 | n/a | n/a | 0.086 | 6.277 | 0.104 | 0.086 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000422 | 51.030 | 14.035 | 0.082 | 0.000 | 1.289 | 1.545 | 9.198 | 0.084 | 0.000 | 5.242 | 19.067 | n/a | n/a | 0.488 | 15.406 | 0.302 | 0.488 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000043d | 44.433 | 9.725 | 0.197 | 1.434 | 0.062 | 1.782 | 11.698 | 0.060 | 0.000 | 0.314 | 19.125 | n/a | n/a | 0.035 | 11.418 | 0.257 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000447 | 40.323 | 8.282 | 0.484 | 0.000 | 0.063 | 1.767 | 9.950 | 0.040 | 0.000 | 3.646 | 16.034 | n/a | n/a | 0.058 | 8.828 | 0.219 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000437 | 39.896 | 4.334 | 0.340 | 0.000 | 0.226 | 2.384 | 16.170 | 0.082 | 0.000 | 0.306 | 16.000 | n/a | n/a | 0.053 | 4.900 | 0.123 | 0.053 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000042f | 36.776 | 4.750 | 0.383 | 0.000 | 0.077 | 2.346 | 11.139 | 0.033 | 0.000 | 0.170 | 17.807 | n/a | n/a | 0.072 | 5.209 | 0.142 | 0.072 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000044b | 35.999 | 4.785 | 0.337 | 0.499 | 0.120 | 1.804 | 6.707 | 0.036 | 0.000 | 0.604 | 21.041 | n/a | n/a | 0.067 | 5.741 | 0.159 | 0.067 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000441 | 35.774 | 5.083 | 2.757 | 0.397 | 0.062 | 1.544 | 14.278 | 0.033 | 0.000 | 0.195 | 11.385 | n/a | n/a | 0.042 | 8.298 | 0.232 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000453 | 33.738 | 5.804 | 0.290 | 0.533 | 0.136 | 1.620 | 11.729 | 0.037 | 0.000 | 0.179 | 13.301 | n/a | n/a | 0.108 | 6.763 | 0.200 | 0.108 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000449 | 29.614 | 5.941 | 0.005 | 1.426 | 1.119 | 1.491 | 1.986 | 0.085 | 0.000 | 1.243 | 16.277 | n/a | n/a | 0.041 | 8.491 | 0.287 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000435 | 28.794 | 5.131 | 0.348 | 0.000 | 0.106 | 1.935 | 9.151 | 0.034 | 0.000 | 0.513 | 11.476 | n/a | n/a | 0.101 | 5.585 | 0.194 | 0.101 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000042d | 28.778 | 4.612 | 0.266 | 0.000 | 0.066 | 2.401 | 6.967 | 0.050 | 0.000 | 0.466 | 13.902 | n/a | n/a | 0.048 | 4.945 | 0.172 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000043b | 28.738 | 5.345 | 0.008 | 0.000 | 1.224 | 1.337 | 1.515 | 0.049 | 0.000 | 0.779 | 18.431 | n/a | n/a | 0.049 | 6.577 | 0.229 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000429 | 28.395 | 9.142 | 0.398 | 0.000 | 0.075 | 2.430 | 8.845 | 0.073 | 0.000 | 0.234 | 7.129 | n/a | n/a | 0.068 | 9.615 | 0.339 | 0.068 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000044f | 26.787 | 3.943 | 0.250 | 0.000 | 0.134 | 1.954 | 6.715 | 0.054 | 0.000 | 0.424 | 13.247 | n/a | n/a | 0.066 | 4.327 | 0.162 | 0.066 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000459 | 26.480 | 3.534 | 0.422 | 0.000 | 0.060 | 1.223 | 9.615 | 0.046 | 0.000 | 0.187 | 11.357 | n/a | n/a | 0.035 | 4.015 | 0.152 | 0.035 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000439 | 26.374 | 9.420 | 0.010 | 4.311 | 1.165 | 2.249 | 2.887 | 0.039 | 0.000 | 1.000 | 5.235 | n/a | n/a | 0.059 | 14.906 | 0.565 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000427 | 25.922 | 7.696 | 0.015 | 0.000 | 0.682 | 1.433 | 2.557 | 0.059 | 0.000 | 1.062 | 12.310 | n/a | n/a | 0.108 | 8.393 | 0.324 | 0.108 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000451 | 24.439 | 3.707 | 0.006 | 0.000 | 1.123 | 0.962 | 4.226 | 0.058 | 0.000 | 2.000 | 12.324 | n/a | n/a | 0.033 | 4.835 | 0.198 | 0.033 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.720 | n/a | n/a | n/a | 22.508 | 19.137 | 0.000 | 0.000 | 0.628 | 9.420 | 0.005 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.011 | 53.634 | 0.811 | 0.011 |
| p99 | 173.799 | n/a | n/a | n/a | 72.360 | 73.414 | 12.044 | 0.000 | 79.575 | 103.261 | 48.708 | 9.850 | 0.229 | 0.000 | n/a | n/a | 0.060 | 148.314 | 1.000 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000001ae1 | 173.799 | 72.360 | 67.078 | 8.876 | 0.000 | 0.578 | 24.881 | 0.005 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.009 | 148.314 | 0.853 | 0.009 | node-14/thread-0/rpc.replica.observe | none observed |
| 7b672587083433f4000000000000046e | 154.921 | 28.987 | 15.725 | 5.486 | 0.000 | 1.402 | 103.261 | 0.011 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.018 | 50.198 | 0.324 | 0.018 | gw-w/thread-53/gateway.admitted-work | none observed |
| 7b672587083433f40000000000000e56 | 152.593 | 38.842 | 20.258 | 2.228 | 0.000 | 56.467 | 34.727 | 0.024 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.013 | 61.328 | 0.402 | 0.013 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 1.529ms; client.parse 1.347ms; driver.publication 1.269ms; driver.publication 1.245ms; driver.publication 1.196ms |
| 7b672587083433f40000000000001822 | 139.098 | 13.985 | 4.135 | 0.000 | 0.000 | 79.575 | 15.011 | 26.367 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.013 | 18.120 | 0.130 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.629ms; driver.expected-state.bind-receipt 1.586ms; driver.publication 1.578ms; driver.publication 1.406ms; driver.publication 1.360ms |
| 7b672587083433f4000000000000181d | 132.865 | 15.559 | 5.479 | 0.000 | 0.000 | 65.901 | 12.991 | 32.919 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.008 | 21.038 | 0.158 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.629ms; driver.publication 1.578ms; driver.publication 1.360ms; driver.publication 1.343ms; driver.publication 1.149ms |
| 7b672587083433f40000000000000a6c | 126.255 | 47.236 | 40.419 | 3.011 | 0.000 | 0.710 | 34.847 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.011 | 90.666 | 0.718 | 0.011 | node-14/thread-0/rpc.replica.observe | driver.publication 1.237ms; driver.publication 1.122ms |
| 7b672587083433f40000000000001821 | 122.457 | 11.258 | 0.659 | 0.000 | 0.000 | 52.756 | 14.986 | 42.729 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.060 | 11.917 | 0.097 | 0.060 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.629ms; driver.publication 1.578ms; driver.publication 1.360ms; driver.publication 1.343ms; client.parse 1.068ms |
| 7b672587083433f40000000000001828 | 116.221 | 18.078 | 5.921 | 0.000 | 0.000 | 54.659 | 4.131 | 33.404 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.014 | 23.999 | 0.206 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.586ms; driver.publication 1.578ms; driver.publication 1.406ms; driver.publication 1.360ms; client.parse 1.068ms |
| 7b672587083433f4000000000000071a | 111.220 | 12.832 | 1.398 | 0.000 | 0.000 | 32.216 | 16.028 | 48.708 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.010 | 14.230 | 0.128 | 0.010 | gw-w/thread-50/gateway.admission-wait | none observed |
| 7b672587083433f40000000000001d94 | 108.981 | 17.086 | 7.590 | 0.000 | 0.000 | 51.852 | 15.126 | 17.310 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.013 | 24.676 | 0.226 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.159ms; driver.publication 1.136ms; driver.publication 1.066ms |
| 7b672587083433f40000000000000719 | 106.049 | 32.516 | 15.101 | 2.467 | 0.000 | 0.802 | 55.100 | 0.018 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.013 | 50.084 | 0.472 | 0.013 | gw-w/thread-54/gateway.admitted-work | driver.publication 1.131ms |
| 7b672587083433f4000000000000181e | 103.077 | 40.207 | 23.245 | 3.416 | 0.000 | 3.459 | 22.862 | 0.008 | 9.850 | 0.020 | 0.000 | n/a | n/a | 0.009 | 66.868 | 0.649 | 0.009 | node-14/thread-0/client.reach | driver.publication 1.629ms; driver.publication 1.343ms; driver.publication 1.149ms |
| 7b672587083433f4000000000000199e | 102.022 | 42.877 | 21.133 | 6.168 | 0.000 | 1.515 | 30.284 | 0.009 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.016 | 70.178 | 0.688 | 0.016 | node-14/thread-0/client.reach | driver.publication 1.299ms |
| 7b672587083433f40000000000000691 | 99.408 | 14.058 | 9.974 | 0.000 | 0.000 | 25.107 | 13.923 | 36.314 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.015 | 24.032 | 0.242 | 0.015 | gw-w/thread-47/gateway.admission-wait | driver.publication 2.744ms; driver.publication 2.122ms; driver.publication 1.283ms; driver.publication 1.123ms; driver.publication 1.106ms |
| 7b672587083433f40000000000001f1c | 96.346 | 62.125 | 12.614 | 3.382 | 0.000 | 0.628 | 17.558 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.016 | 78.121 | 0.811 | 0.016 | node-14/thread-2/replica.pull-at | driver.publication 1.045ms |
| 7b672587083433f40000000000000423 | 96.146 | 20.278 | 6.332 | 0.000 | 0.000 | 0.932 | 68.227 | 0.116 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.033 | 26.610 | 0.277 | 0.033 | gw-w/thread-53/gateway.admitted-work | none observed |
| 7b672587083433f40000000000000690 | 94.668 | 16.390 | 7.781 | 0.000 | 0.000 | 3.149 | 67.295 | 0.016 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.012 | 24.170 | 0.255 | 0.012 | gw-w/thread-54/gateway.admitted-work | driver.publication 2.744ms; driver.publication 2.472ms; driver.publication 2.122ms; driver.publication 1.123ms; driver.publication 1.059ms |
| 7b672587083433f40000000000001d95 | 91.321 | 20.906 | 4.301 | 1.732 | 0.000 | 40.862 | 2.027 | 21.467 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.016 | 26.939 | 0.295 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.159ms; driver.publication 1.066ms |
| 7b672587083433f400000000000019aa | 90.139 | 39.333 | 14.667 | 2.701 | 0.000 | 17.847 | 10.807 | 4.768 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.008 | 56.701 | 0.629 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication 1.826ms; driver.publication 1.174ms; driver.publication 1.046ms |
| 7b672587083433f40000000000001afa | 83.067 | 40.779 | 21.270 | 3.869 | 0.000 | 2.592 | 14.520 | 0.008 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.008 | 65.919 | 0.794 | 0.008 | node-14/thread-2/replica.pull-at | driver.publication 1.688ms; driver.expected-state.bind-receipt 1.257ms; driver.publication 1.195ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.485 | 0.569 | 0.000 | 1.792 | 4.440 | 0.010 | 0.000 | 0.602 | 0.802 | 1.290 | 0.029 | 0.000 | 0.510 | 8.487 | n/a | n/a | 0.054 | 5.513 | 0.324 | 0.054 |
| p99 | 60.599 | 1.577 | 0.000 | 3.830 | 7.696 | 0.015 | 1.603 | 1.123 | 1.433 | 4.226 | 0.059 | 0.000 | 2.000 | 51.451 | n/a | n/a | 0.108 | 8.393 | 0.414 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f4000000000000042b | 60.599 | 5.196 | 0.010 | 0.000 | 1.072 | 0.753 | 1.119 | 0.027 | 0.000 | 0.886 | 51.451 | n/a | n/a | 0.086 | 6.277 | 0.104 | 0.086 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000427 | 25.922 | 7.696 | 0.015 | 0.000 | 0.682 | 1.433 | 2.557 | 0.059 | 0.000 | 1.062 | 12.310 | n/a | n/a | 0.108 | 8.393 | 0.324 | 0.108 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000451 | 24.439 | 3.707 | 0.006 | 0.000 | 1.123 | 0.962 | 4.226 | 0.058 | 0.000 | 2.000 | 12.324 | n/a | n/a | 0.033 | 4.835 | 0.198 | 0.033 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000455 | 19.701 | 7.522 | 0.010 | 0.000 | 0.236 | 1.099 | 1.987 | 0.049 | 0.000 | 0.250 | 8.487 | n/a | n/a | 0.061 | 7.768 | 0.394 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000445 | 18.485 | 3.312 | 0.005 | 1.603 | 0.593 | 0.756 | 1.290 | 0.029 | 0.000 | 0.510 | 10.350 | n/a | n/a | 0.037 | 5.513 | 0.298 | 0.037 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000430 | 16.962 | 6.090 | 0.009 | 0.000 | 0.916 | 0.756 | 1.056 | 0.035 | 0.000 | 0.163 | 7.882 | n/a | n/a | 0.057 | 7.014 | 0.414 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000442 | 14.436 | 4.440 | 0.010 | 0.000 | 0.163 | 0.800 | 0.956 | 0.028 | 0.000 | 0.522 | 7.469 | n/a | n/a | 0.050 | 4.613 | 0.320 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000457 | 13.552 | 3.008 | 0.005 | 1.473 | 0.602 | 0.862 | 1.725 | 0.028 | 0.000 | 0.395 | 5.421 | n/a | n/a | 0.034 | 5.088 | 0.375 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000044d | 12.075 | 4.061 | 0.010 | 0.000 | 0.568 | 0.802 | 1.133 | 0.026 | 0.000 | 0.187 | 5.233 | n/a | n/a | 0.054 | 4.638 | 0.384 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.035 | 0.675 | 0.000 | 0.532 | 2.897 | 0.002 | 0.000 | 0.177 | 2.461 | 1.173 | 0.051 | 0.000 | 0.138 | 11.102 | n/a | n/a | 0.033 | 3.076 | 0.171 | 0.033 |
| p99 | 116.629 | 1.187 | 0.000 | 1.672 | 19.921 | 0.394 | 2.108 | 0.561 | 21.050 | 51.291 | 0.172 | 0.000 | 0.829 | 20.246 | n/a | n/a | 0.057 | 22.984 | 0.197 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f4000000000000045b | 116.629 | 19.921 | 0.394 | 2.108 | 0.561 | 21.050 | 51.291 | 0.172 | 0.000 | 0.829 | 20.246 | n/a | n/a | 0.057 | 22.984 | 0.197 | 0.057 | gw-w/thread-47/gateway.admitted-work | none observed |
| 7b672587083433f40000000000000ca2 | 18.035 | 2.897 | 0.002 | 0.000 | 0.177 | 2.461 | 1.173 | 0.051 | 0.000 | 0.138 | 11.102 | n/a | n/a | 0.033 | 3.076 | 0.171 | 0.033 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.039ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.512 | 0.436 | 0.000 | 0.844 | 4.248 | 0.012 | 0.000 | 0.128 | 1.271 | 6.275 | 0.039 | 0.000 | 0.414 | 11.527 | n/a | n/a | 0.051 | 4.814 | 0.214 | 0.051 |
| p99 | 95.814 | 4.450 | 0.000 | 4.552 | 11.335 | 1.429 | 1.918 | 8.409 | 4.775 | 27.282 | 1.875 | 30.553 | 2.619 | 70.788 | n/a | n/a | 0.151 | 12.231 | 0.394 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000470 | 95.814 | 5.165 | 0.229 | 0.409 | 0.128 | 1.158 | 17.672 | 0.036 | 0.000 | 0.168 | 70.788 | n/a | n/a | 0.060 | 5.931 | 0.062 | 0.060 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004ae | 54.405 | 4.965 | 0.315 | 0.384 | 0.098 | 1.515 | 7.152 | 0.054 | 30.553 | 0.466 | 8.838 | n/a | n/a | 0.066 | 5.762 | 0.106 | 0.066 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 7b672587083433f4000000000000049e | 51.296 | 4.852 | 0.376 | 0.374 | 0.077 | 2.197 | 10.210 | 0.048 | 0.000 | 1.086 | 32.021 | n/a | n/a | 0.055 | 5.679 | 0.111 | 0.055 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000494 | 44.542 | 3.796 | 0.174 | 0.616 | 0.063 | 1.499 | 27.282 | 0.050 | 0.000 | 1.606 | 9.417 | n/a | n/a | 0.038 | 4.650 | 0.104 | 0.038 | gw-w/thread-54/gateway.admitted-work | none observed |
| 7b672587083433f4000000000000046d | 42.383 | 8.747 | 0.012 | 0.000 | 1.365 | 1.671 | 4.324 | 0.049 | 0.000 | 0.553 | 25.613 | n/a | n/a | 0.048 | 10.125 | 0.239 | 0.048 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000464 | 41.538 | 4.042 | 0.005 | 0.000 | 0.707 | 2.984 | 1.504 | 0.028 | 0.000 | 0.195 | 32.029 | n/a | n/a | 0.044 | 4.754 | 0.114 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000047c | 39.878 | 3.625 | 0.236 | 0.406 | 0.058 | 1.609 | 15.431 | 0.035 | 0.000 | 0.218 | 18.219 | n/a | n/a | 0.042 | 4.324 | 0.108 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004a2 | 37.774 | 4.248 | 0.257 | 0.235 | 0.074 | 1.435 | 10.716 | 0.056 | 0.000 | 0.709 | 19.993 | n/a | n/a | 0.051 | 4.814 | 0.127 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000046b | 36.795 | 3.614 | 0.266 | 0.000 | 0.064 | 1.243 | 2.796 | 0.062 | 0.000 | 0.289 | 28.406 | n/a | n/a | 0.055 | 3.945 | 0.107 | 0.055 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000469 | 36.497 | 7.084 | 0.305 | 0.345 | 0.071 | 3.944 | 8.865 | 0.112 | 0.000 | 2.031 | 13.701 | n/a | n/a | 0.040 | 7.805 | 0.214 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000480 | 35.174 | 11.335 | 0.012 | 0.000 | 0.883 | 1.575 | 9.433 | 0.055 | 0.000 | 0.282 | 11.527 | n/a | n/a | 0.070 | 12.231 | 0.348 | 0.070 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000048a | 31.717 | 8.501 | 0.011 | 0.000 | 0.756 | 0.897 | 1.977 | 0.061 | 0.000 | 0.513 | 18.923 | n/a | n/a | 0.076 | 9.269 | 0.292 | 0.076 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004a4 | 31.585 | 3.586 | 0.252 | 0.242 | 0.071 | 1.377 | 8.808 | 0.033 | 0.000 | 0.241 | 16.934 | n/a | n/a | 0.041 | 4.151 | 0.131 | 0.041 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000488 | 30.083 | 3.263 | 0.178 | 0.315 | 0.054 | 1.209 | 9.604 | 0.042 | 0.000 | 0.507 | 14.869 | n/a | n/a | 0.042 | 3.810 | 0.127 | 0.042 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000472 | 29.573 | 5.059 | 0.259 | 0.434 | 0.070 | 1.956 | 7.708 | 0.052 | 0.000 | 0.705 | 13.287 | n/a | n/a | 0.042 | 5.822 | 0.197 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004a9 | 29.525 | 2.784 | 0.004 | 0.000 | 8.409 | 0.563 | 6.275 | 0.038 | 0.000 | 0.249 | 11.160 | n/a | n/a | 0.042 | 11.198 | 0.379 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.222ms |
| 7b672587083433f4000000000000049c | 29.395 | 3.633 | 1.429 | 0.267 | 0.018 | 1.278 | 9.060 | 0.051 | 0.000 | 0.484 | 13.137 | n/a | n/a | 0.037 | 5.346 | 0.182 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000478 | 29.240 | 3.733 | 0.255 | 0.248 | 0.055 | 1.271 | 12.282 | 0.039 | 0.000 | 0.210 | 11.112 | n/a | n/a | 0.036 | 4.291 | 0.147 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000474 | 28.437 | 5.425 | 0.274 | 0.473 | 0.062 | 1.370 | 6.324 | 0.033 | 0.000 | 2.619 | 11.795 | n/a | n/a | 0.061 | 6.235 | 0.219 | 0.061 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000045d | 27.825 | 5.337 | 0.202 | 0.416 | 0.063 | 1.576 | 8.420 | 0.053 | 0.000 | 0.269 | 11.450 | n/a | n/a | 0.039 | 6.019 | 0.216 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.516 | 0.496 | 0.000 | 1.375 | 3.413 | 0.005 | 0.000 | 0.884 | 0.638 | 1.025 | 0.028 | 0.000 | 0.263 | 7.258 | n/a | n/a | 0.044 | 4.193 | 0.310 | 0.044 |
| p99 | 41.538 | 1.128 | 0.000 | 2.007 | 6.913 | 0.010 | 0.000 | 8.409 | 4.775 | 6.275 | 0.047 | 0.000 | 0.538 | 32.029 | n/a | n/a | 0.064 | 11.198 | 0.394 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000464 | 41.538 | 4.042 | 0.005 | 0.000 | 0.707 | 2.984 | 1.504 | 0.028 | 0.000 | 0.195 | 32.029 | n/a | n/a | 0.044 | 4.754 | 0.114 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004a9 | 29.525 | 2.784 | 0.004 | 0.000 | 8.409 | 0.563 | 6.275 | 0.038 | 0.000 | 0.249 | 11.160 | n/a | n/a | 0.042 | 11.198 | 0.379 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.222ms |
| 7b672587083433f40000000000000468 | 24.498 | 6.913 | 0.005 | 0.000 | 0.884 | 4.775 | 4.075 | 0.047 | 0.000 | 0.494 | 7.258 | n/a | n/a | 0.047 | 7.802 | 0.318 | 0.047 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000047a | 16.101 | 3.413 | 0.004 | 0.000 | 1.228 | 0.583 | 0.857 | 0.029 | 0.000 | 0.419 | 9.528 | n/a | n/a | 0.039 | 4.646 | 0.289 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000048e | 13.516 | 3.855 | 0.010 | 0.000 | 0.327 | 0.769 | 0.851 | 0.025 | 0.000 | 0.263 | 7.360 | n/a | n/a | 0.054 | 4.193 | 0.310 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000492 | 13.368 | 3.041 | 0.007 | 0.000 | 0.909 | 1.486 | 2.146 | 0.039 | 0.000 | 0.258 | 5.426 | n/a | n/a | 0.057 | 3.957 | 0.296 | 0.057 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000484 | 10.661 | 3.433 | 0.006 | 0.000 | 0.250 | 0.638 | 0.885 | 0.024 | 0.000 | 0.371 | 4.991 | n/a | n/a | 0.064 | 3.688 | 0.346 | 0.064 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004a0 | 10.473 | 2.997 | 0.005 | 0.000 | 1.124 | 0.628 | 1.025 | 0.025 | 0.000 | 0.538 | 4.086 | n/a | n/a | 0.044 | 4.127 | 0.394 | 0.044 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.099 | 0.424 | 0.000 | 0.666 | 3.785 | 0.192 | 0.000 | 0.119 | 1.212 | 5.890 | 0.038 | 0.000 | 0.449 | 11.139 | n/a | n/a | 0.051 | 4.376 | 0.184 | 0.051 |
| p99 | 61.788 | 1.727 | 2.982 | 6.772 | 11.153 | 0.343 | 0.462 | 0.936 | 3.010 | 15.387 | 0.155 | 0.000 | 3.817 | 44.763 | n/a | n/a | 0.116 | 11.927 | 0.451 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f400000000000004eb | 61.788 | 9.033 | 0.016 | 0.000 | 0.936 | 0.805 | 5.519 | 0.155 | 0.000 | 1.010 | 44.198 | n/a | n/a | 0.116 | 9.984 | 0.162 | 0.116 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004b8 | 56.178 | 5.855 | 0.222 | 0.297 | 0.106 | 1.478 | 2.908 | 0.043 | 0.000 | 0.449 | 44.763 | n/a | n/a | 0.056 | 6.481 | 0.115 | 0.056 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004bd | 48.650 | 11.153 | 0.011 | 0.000 | 0.762 | 2.224 | 3.426 | 0.062 | 0.000 | 0.352 | 30.600 | n/a | n/a | 0.060 | 11.927 | 0.245 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004e9 | 38.763 | 5.287 | 0.196 | 0.462 | 0.065 | 2.746 | 15.387 | 0.081 | 0.000 | 1.941 | 12.549 | n/a | n/a | 0.049 | 6.010 | 0.155 | 0.049 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004d5 | 33.750 | 3.583 | 0.196 | 0.215 | 0.057 | 1.329 | 14.233 | 0.064 | 0.000 | 2.071 | 11.962 | n/a | n/a | 0.040 | 4.051 | 0.120 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004cf | 32.449 | 4.153 | 0.343 | 0.231 | 0.070 | 1.523 | 10.865 | 0.037 | 0.000 | 0.583 | 14.584 | n/a | n/a | 0.060 | 4.797 | 0.148 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004dd | 32.315 | 3.444 | 0.238 | 0.251 | 0.077 | 1.451 | 10.038 | 0.083 | 0.000 | 0.452 | 16.233 | n/a | n/a | 0.047 | 4.010 | 0.124 | 0.047 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004f5 | 30.309 | 3.476 | 0.195 | 0.000 | 0.061 | 1.802 | 14.717 | 0.056 | 0.000 | 0.318 | 9.629 | n/a | n/a | 0.054 | 3.731 | 0.123 | 0.054 | gw-w/thread-52/gateway.admitted-work | none observed |
| 7b672587083433f400000000000004d9 | 28.555 | 3.785 | 0.241 | 0.282 | 0.100 | 0.858 | 6.959 | 0.038 | 0.000 | 0.264 | 15.966 | n/a | n/a | 0.063 | 4.408 | 0.154 | 0.063 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004cd | 28.298 | 4.847 | 0.006 | 0.000 | 0.906 | 0.741 | 5.780 | 0.053 | 0.000 | 1.136 | 14.789 | n/a | n/a | 0.041 | 5.758 | 0.203 | 0.041 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004ed | 28.180 | 3.908 | 0.207 | 0.427 | 0.072 | 1.436 | 9.714 | 0.032 | 0.000 | 0.237 | 12.106 | n/a | n/a | 0.039 | 4.615 | 0.164 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004b4 | 27.726 | 3.699 | 0.238 | 0.231 | 0.061 | 3.010 | 11.582 | 0.034 | 0.000 | 0.184 | 8.650 | n/a | n/a | 0.037 | 4.229 | 0.153 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004c5 | 27.616 | 3.216 | 0.229 | 0.210 | 0.069 | 1.117 | 8.084 | 0.045 | 0.000 | 0.473 | 14.127 | n/a | n/a | 0.046 | 3.725 | 0.135 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004ff | 27.514 | 4.717 | 0.233 | 0.000 | 0.116 | 1.952 | 7.303 | 0.037 | 0.000 | 0.234 | 12.859 | n/a | n/a | 0.062 | 5.066 | 0.184 | 0.062 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004d1 | 27.352 | 5.029 | 0.280 | 0.420 | 0.063 | 1.587 | 8.581 | 0.032 | 0.000 | 0.165 | 11.139 | n/a | n/a | 0.056 | 5.792 | 0.212 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004e3 | 27.242 | 3.584 | 0.256 | 0.335 | 0.067 | 1.212 | 10.681 | 0.032 | 0.000 | 0.174 | 10.845 | n/a | n/a | 0.056 | 4.242 | 0.156 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004c3 | 26.291 | 3.802 | 0.276 | 0.348 | 0.107 | 1.142 | 8.004 | 0.031 | 0.000 | 0.632 | 11.856 | n/a | n/a | 0.094 | 4.533 | 0.172 | 0.094 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004d3 | 26.223 | 6.833 | 0.006 | 0.000 | 0.753 | 1.604 | 1.479 | 0.029 | 0.000 | 1.501 | 13.978 | n/a | n/a | 0.040 | 7.592 | 0.290 | 0.040 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004ef | 26.192 | 4.367 | 0.007 | 0.000 | 0.755 | 1.031 | 2.465 | 0.086 | 0.000 | 0.294 | 17.127 | n/a | n/a | 0.061 | 5.129 | 0.196 | 0.061 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004d7 | 26.099 | 4.874 | 0.205 | 0.385 | 0.066 | 1.375 | 5.890 | 0.039 | 0.000 | 2.552 | 10.669 | n/a | n/a | 0.044 | 5.530 | 0.212 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.739 | 0.582 | 0.000 | 1.560 | 3.152 | 0.005 | 0.000 | 0.524 | 0.605 | 0.958 | 0.026 | 0.000 | 0.579 | 7.956 | n/a | n/a | 0.042 | 3.669 | 0.233 | 0.042 |
| p99 | 22.817 | 1.651 | 0.000 | 4.320 | 5.886 | 0.011 | 0.000 | 0.812 | 2.052 | 2.306 | 0.069 | 0.000 | 3.817 | 12.099 | n/a | n/a | 0.115 | 6.165 | 0.451 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f400000000000004c9 | 22.817 | 5.192 | 0.011 | 0.000 | 0.423 | 2.052 | 2.306 | 0.039 | 0.000 | 0.579 | 12.099 | n/a | n/a | 0.115 | 5.626 | 0.247 | 0.115 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004b2 | 17.281 | 3.431 | 0.005 | 0.000 | 0.524 | 0.605 | 1.154 | 0.034 | 0.000 | 0.426 | 11.058 | n/a | n/a | 0.044 | 3.960 | 0.229 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004c1 | 17.090 | 2.978 | 0.006 | 0.000 | 0.153 | 0.558 | 0.958 | 0.067 | 0.000 | 3.817 | 8.510 | n/a | n/a | 0.043 | 3.136 | 0.184 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004fa | 16.474 | 2.981 | 0.005 | 0.000 | 0.630 | 0.583 | 0.853 | 0.025 | 0.000 | 0.764 | 10.591 | n/a | n/a | 0.042 | 3.617 | 0.220 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004fd | 15.840 | 3.417 | 0.004 | 0.000 | 0.249 | 1.824 | 1.964 | 0.069 | 0.000 | 1.259 | 7.018 | n/a | n/a | 0.038 | 3.669 | 0.232 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004e5 | 14.739 | 3.152 | 0.005 | 0.000 | 0.812 | 0.694 | 1.037 | 0.025 | 0.000 | 0.171 | 8.762 | n/a | n/a | 0.080 | 3.969 | 0.269 | 0.080 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004f2 | 14.114 | 2.552 | 0.005 | 0.000 | 0.737 | 0.603 | 0.888 | 0.025 | 0.000 | 1.373 | 7.897 | n/a | n/a | 0.036 | 3.293 | 0.233 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004c7 | 13.663 | 5.886 | 0.006 | 0.000 | 0.273 | 0.930 | 1.598 | 0.058 | 0.000 | 0.919 | 3.924 | n/a | n/a | 0.070 | 6.165 | 0.451 | 0.070 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004b6 | 13.317 | 2.721 | 0.005 | 0.000 | 0.593 | 0.542 | 0.925 | 0.024 | 0.000 | 0.512 | 7.956 | n/a | n/a | 0.038 | 3.319 | 0.249 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000004db | 10.793 | 3.625 | 0.006 | 0.000 | 0.656 | 0.621 | 0.936 | 0.026 | 0.000 | 0.230 | 4.654 | n/a | n/a | 0.040 | 4.287 | 0.397 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.667 | 0.522 | 0.000 | 1.275 | 3.898 | 0.012 | 0.000 | 0.117 | 1.093 | 2.075 | 0.033 | 0.000 | 0.401 | 11.683 | n/a | n/a | 0.051 | 4.717 | 0.214 | 0.051 |
| p99 | 61.530 | 2.027 | 0.002 | 3.264 | 12.938 | 0.440 | 0.489 | 1.139 | 4.089 | 18.992 | 0.068 | 0.000 | 3.674 | 43.297 | n/a | n/a | 0.189 | 14.087 | 0.389 | 0.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000512 | 61.530 | 6.976 | 0.290 | 0.000 | 0.107 | 1.193 | 17.974 | 0.046 | 0.000 | 0.401 | 34.478 | n/a | n/a | 0.065 | 7.373 | 0.120 | 0.065 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000054b | 58.041 | 3.420 | 0.271 | 0.000 | 0.062 | 1.133 | 9.600 | 0.030 | 0.000 | 0.168 | 43.297 | n/a | n/a | 0.060 | 3.753 | 0.065 | 0.060 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000539 | 48.769 | 3.839 | 0.005 | 0.000 | 0.076 | 0.848 | 1.443 | 0.050 | 0.000 | 0.671 | 41.766 | n/a | n/a | 0.072 | 3.920 | 0.080 | 0.072 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000050e | 38.820 | 6.662 | 0.268 | 0.000 | 0.131 | 1.647 | 11.093 | 0.048 | 0.000 | 0.638 | 18.263 | n/a | n/a | 0.070 | 7.061 | 0.182 | 0.070 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000525 | 36.191 | 12.938 | 0.010 | 0.000 | 1.139 | 4.089 | 7.069 | 0.068 | 0.000 | 1.517 | 9.293 | n/a | n/a | 0.067 | 14.087 | 0.389 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000054d | 34.688 | 3.357 | 0.205 | 0.000 | 0.060 | 1.432 | 18.992 | 0.053 | 0.000 | 0.186 | 10.357 | n/a | n/a | 0.046 | 3.622 | 0.104 | 0.046 | gw-w/thread-47/gateway.admitted-work | none observed |
| 7b672587083433f40000000000000517 | 34.524 | 4.512 | 0.440 | 0.000 | 0.070 | 2.166 | 11.524 | 0.039 | 0.000 | 0.551 | 15.167 | n/a | n/a | 0.054 | 5.023 | 0.145 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.364ms |
| 7b672587083433f40000000000000545 | 31.663 | 3.427 | 0.285 | 0.000 | 0.066 | 1.471 | 11.851 | 0.038 | 0.000 | 0.453 | 14.020 | n/a | n/a | 0.053 | 3.778 | 0.119 | 0.053 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000508 | 31.393 | 7.347 | 0.010 | 0.000 | 0.994 | 2.559 | 1.738 | 0.027 | 0.000 | 0.599 | 18.077 | n/a | n/a | 0.043 | 8.350 | 0.266 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.506ms |
| 7b672587083433f40000000000000533 | 30.487 | 7.678 | 0.243 | 0.274 | 0.072 | 1.093 | 8.477 | 0.065 | 0.000 | 0.205 | 12.330 | n/a | n/a | 0.049 | 8.267 | 0.271 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000523 | 29.693 | 5.050 | 0.234 | 0.386 | 0.068 | 1.215 | 8.289 | 0.030 | 0.000 | 0.179 | 14.187 | n/a | n/a | 0.056 | 5.738 | 0.193 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000052f | 26.136 | 5.804 | 0.251 | 0.489 | 0.071 | 1.605 | 5.618 | 0.037 | 0.000 | 0.388 | 11.683 | n/a | n/a | 0.189 | 6.615 | 0.253 | 0.189 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000513 | 25.567 | 4.810 | 0.006 | 0.000 | 0.236 | 0.836 | 1.823 | 0.034 | 0.000 | 3.674 | 14.108 | n/a | n/a | 0.041 | 5.051 | 0.198 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000050b | 25.508 | 4.692 | 0.205 | 0.000 | 0.092 | 2.135 | 7.512 | 0.031 | 0.000 | 0.170 | 10.631 | n/a | n/a | 0.042 | 4.988 | 0.196 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000527 | 24.539 | 3.559 | 0.304 | 0.248 | 0.062 | 1.165 | 6.897 | 0.031 | 0.000 | 0.455 | 11.776 | n/a | n/a | 0.042 | 4.173 | 0.170 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000507 | 24.299 | 4.343 | 0.010 | 0.000 | 0.879 | 0.855 | 1.195 | 0.028 | 0.000 | 0.208 | 16.737 | n/a | n/a | 0.044 | 5.231 | 0.215 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000053b | 24.009 | 3.157 | 0.196 | 0.000 | 0.071 | 1.548 | 8.233 | 0.036 | 0.000 | 0.480 | 10.244 | n/a | n/a | 0.043 | 3.425 | 0.143 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000537 | 23.792 | 3.269 | 0.226 | 0.258 | 0.114 | 1.227 | 6.954 | 0.031 | 0.000 | 0.155 | 11.497 | n/a | n/a | 0.061 | 3.867 | 0.163 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000053f | 23.515 | 3.803 | 0.271 | 0.000 | 0.063 | 1.296 | 5.733 | 0.033 | 0.000 | 0.358 | 11.911 | n/a | n/a | 0.046 | 4.137 | 0.176 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000553 | 23.127 | 3.723 | 0.309 | 0.000 | 0.111 | 1.483 | 8.897 | 0.031 | 0.000 | 0.189 | 8.327 | n/a | n/a | 0.056 | 4.144 | 0.179 | 0.056 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.593 | 0.811 | 0.000 | 1.859 | 3.922 | 0.006 | 0.000 | 0.583 | 0.763 | 1.157 | 0.028 | 0.000 | 0.414 | 12.177 | n/a | n/a | 0.061 | 4.740 | 0.262 | 0.061 |
| p99 | 48.769 | 2.027 | 0.002 | 3.264 | 6.088 | 0.012 | 0.000 | 1.125 | 1.870 | 2.075 | 0.068 | 0.000 | 0.911 | 41.766 | n/a | n/a | 0.090 | 6.230 | 0.369 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000539 | 48.769 | 3.839 | 0.005 | 0.000 | 0.076 | 0.848 | 1.443 | 0.050 | 0.000 | 0.671 | 41.766 | n/a | n/a | 0.072 | 3.920 | 0.080 | 0.072 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000507 | 24.299 | 4.343 | 0.010 | 0.000 | 0.879 | 0.855 | 1.195 | 0.028 | 0.000 | 0.208 | 16.737 | n/a | n/a | 0.044 | 5.231 | 0.215 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000518 | 21.913 | 4.416 | 0.006 | 0.000 | 0.295 | 0.613 | 1.686 | 0.059 | 0.000 | 0.336 | 14.412 | n/a | n/a | 0.090 | 4.717 | 0.215 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000051f | 21.176 | 3.922 | 0.005 | 0.000 | 0.583 | 0.763 | 1.473 | 0.068 | 0.000 | 0.911 | 13.411 | n/a | n/a | 0.039 | 4.510 | 0.213 | 0.039 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000501 | 20.508 | 4.323 | 0.010 | 0.000 | 1.043 | 1.028 | 1.541 | 0.048 | 0.000 | 0.270 | 12.177 | n/a | n/a | 0.067 | 5.376 | 0.262 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000051a | 20.408 | 4.494 | 0.012 | 0.000 | 1.125 | 0.724 | 0.899 | 0.026 | 0.000 | 0.475 | 12.587 | n/a | n/a | 0.066 | 5.631 | 0.276 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000547 | 19.925 | 4.689 | 0.010 | 0.000 | 0.363 | 0.639 | 0.794 | 0.026 | 0.000 | 0.231 | 13.112 | n/a | n/a | 0.061 | 5.062 | 0.254 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000052b | 17.593 | 3.178 | 0.005 | 0.000 | 0.285 | 0.572 | 1.022 | 0.028 | 0.000 | 0.170 | 12.273 | n/a | n/a | 0.058 | 3.469 | 0.197 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000510 | 16.904 | 6.088 | 0.011 | 0.000 | 0.131 | 0.850 | 2.075 | 0.031 | 0.000 | 0.475 | 7.166 | n/a | n/a | 0.077 | 6.230 | 0.369 | 0.077 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000534 | 16.877 | 3.742 | 0.005 | 0.000 | 1.038 | 1.870 | 0.814 | 0.026 | 0.000 | 0.414 | 8.926 | n/a | n/a | 0.044 | 4.784 | 0.283 | 0.044 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000551 | 16.198 | 4.692 | 0.012 | 0.000 | 0.966 | 0.983 | 1.197 | 0.030 | 0.000 | 0.488 | 7.761 | n/a | n/a | 0.071 | 5.670 | 0.350 | 0.071 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000503 | 16.169 | 3.031 | 0.006 | 0.000 | 0.767 | 0.661 | 1.155 | 0.025 | 0.000 | 0.159 | 10.315 | n/a | n/a | 0.048 | 3.805 | 0.235 | 0.048 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000051d | 15.877 | 3.695 | 0.007 | 0.000 | 1.039 | 0.777 | 1.157 | 0.026 | 0.000 | 0.507 | 8.620 | n/a | n/a | 0.049 | 4.740 | 0.299 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000541 | 10.957 | 2.558 | 0.006 | 0.000 | 0.305 | 0.558 | 1.048 | 0.029 | 0.000 | 0.193 | 6.196 | n/a | n/a | 0.064 | 2.869 | 0.262 | 0.064 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000053c | 9.604 | 2.614 | 0.005 | 0.000 | 0.117 | 0.747 | 0.892 | 0.026 | 0.000 | 0.476 | 4.688 | n/a | n/a | 0.038 | 2.736 | 0.285 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.926 | 0.424 | 0.000 | 1.352 | 4.055 | 0.010 | 0.000 | 0.271 | 1.007 | 2.841 | 0.040 | 0.000 | 0.249 | 9.955 | n/a | n/a | 0.049 | 4.536 | 0.243 | 0.049 |
| p99 | 53.699 | 2.701 | 0.003 | 3.385 | 7.854 | 0.383 | 0.000 | 1.154 | 4.606 | 14.790 | 1.286 | 14.886 | 1.834 | 41.775 | n/a | n/a | 0.102 | 9.293 | 0.426 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000579 | 53.699 | 4.411 | 0.198 | 0.000 | 0.067 | 1.544 | 5.413 | 0.066 | 0.000 | 0.178 | 41.775 | n/a | n/a | 0.046 | 4.676 | 0.087 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005b2 | 47.076 | 3.315 | 0.244 | 0.000 | 0.063 | 1.002 | 5.611 | 0.040 | 0.000 | 0.189 | 36.551 | n/a | n/a | 0.061 | 3.622 | 0.077 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000560 | 39.577 | 3.408 | 0.217 | 0.000 | 0.053 | 1.501 | 9.095 | 0.052 | 14.886 | 0.216 | 10.106 | n/a | n/a | 0.043 | 3.677 | 0.093 | 0.043 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 7b672587083433f400000000000005b7 | 32.655 | 4.957 | 0.285 | 0.000 | 0.094 | 1.379 | 14.790 | 0.032 | 0.000 | 0.168 | 10.878 | n/a | n/a | 0.071 | 5.337 | 0.163 | 0.071 | gw-w/thread-53/gateway.admitted-work | driver.publication 1.235ms |
| 7b672587083433f400000000000005a0 | 32.513 | 4.324 | 0.379 | 0.000 | 0.620 | 2.123 | 14.521 | 0.043 | 0.000 | 0.206 | 10.195 | n/a | n/a | 0.102 | 5.322 | 0.164 | 0.102 | gw-w/thread-52/gateway.admitted-work | none observed |
| 7b672587083433f4000000000000059b | 32.345 | 6.481 | 0.235 | 0.000 | 0.108 | 1.720 | 9.764 | 0.063 | 0.000 | 0.253 | 13.666 | n/a | n/a | 0.055 | 6.824 | 0.211 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000567 | 32.180 | 3.450 | 0.270 | 0.000 | 0.072 | 1.452 | 11.633 | 0.033 | 0.000 | 0.157 | 15.072 | n/a | n/a | 0.041 | 3.792 | 0.118 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000591 | 31.636 | 4.280 | 0.220 | 0.000 | 0.100 | 1.963 | 7.011 | 0.051 | 0.000 | 0.249 | 17.701 | n/a | n/a | 0.061 | 4.601 | 0.145 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 2.933ms |
| 7b672587083433f40000000000000583 | 29.179 | 4.924 | 0.339 | 0.000 | 0.110 | 1.905 | 6.157 | 0.044 | 0.000 | 0.323 | 15.301 | n/a | n/a | 0.076 | 5.373 | 0.184 | 0.076 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000059e | 27.666 | 4.067 | 0.340 | 0.000 | 0.137 | 1.365 | 5.596 | 0.037 | 0.000 | 0.203 | 15.844 | n/a | n/a | 0.077 | 4.544 | 0.164 | 0.077 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000577 | 26.492 | 3.967 | 0.184 | 0.000 | 0.064 | 1.601 | 8.310 | 0.065 | 0.000 | 0.304 | 11.951 | n/a | n/a | 0.045 | 4.215 | 0.159 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000058f | 26.336 | 6.031 | 0.005 | 0.000 | 0.354 | 0.659 | 1.531 | 0.027 | 0.000 | 0.259 | 17.424 | n/a | n/a | 0.044 | 6.391 | 0.243 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005a5 | 26.239 | 4.803 | 0.383 | 0.000 | 0.017 | 1.435 | 5.316 | 0.078 | 0.000 | 0.368 | 13.765 | n/a | n/a | 0.073 | 5.203 | 0.198 | 0.073 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000058b | 25.087 | 7.854 | 0.286 | 0.000 | 1.154 | 1.115 | 2.841 | 0.076 | 0.000 | 1.834 | 9.862 | n/a | n/a | 0.064 | 9.293 | 0.370 | 0.064 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000596 | 24.897 | 4.571 | 0.005 | 0.000 | 1.024 | 0.697 | 2.031 | 0.082 | 0.000 | 0.287 | 16.148 | n/a | n/a | 0.052 | 5.600 | 0.225 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000569 | 24.621 | 4.816 | 0.261 | 0.000 | 0.075 | 1.996 | 7.782 | 0.041 | 0.000 | 0.172 | 9.417 | n/a | n/a | 0.061 | 5.153 | 0.209 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000057b | 24.524 | 4.055 | 0.377 | 0.000 | 0.104 | 1.437 | 8.969 | 0.039 | 0.000 | 0.206 | 9.257 | n/a | n/a | 0.081 | 4.536 | 0.185 | 0.081 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005ac | 24.395 | 3.512 | 0.348 | 0.000 | 0.145 | 1.528 | 8.518 | 0.042 | 0.000 | 0.268 | 9.955 | n/a | n/a | 0.078 | 4.006 | 0.164 | 0.078 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000589 | 24.334 | 3.605 | 0.263 | 0.000 | 0.051 | 1.231 | 5.253 | 0.030 | 0.000 | 0.180 | 13.680 | n/a | n/a | 0.040 | 3.919 | 0.161 | 0.040 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000556 | 24.067 | 3.292 | 0.264 | 0.000 | 0.054 | 1.241 | 8.602 | 0.031 | 0.000 | 0.159 | 10.390 | n/a | n/a | 0.033 | 3.610 | 0.150 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.456 | 0.479 | 0.000 | 1.417 | 3.131 | 0.005 | 0.000 | 0.381 | 0.740 | 1.234 | 0.037 | 0.000 | 0.266 | 7.380 | n/a | n/a | 0.045 | 3.607 | 0.294 | 0.045 |
| p99 | 23.003 | 2.701 | 0.003 | 3.385 | 6.264 | 0.015 | 0.000 | 1.058 | 4.606 | 5.939 | 1.286 | 0.000 | 0.665 | 17.638 | n/a | n/a | 0.093 | 7.026 | 0.381 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f4000000000000057e | 23.003 | 2.555 | 0.003 | 0.000 | 0.437 | 0.380 | 0.642 | 1.286 | 0.000 | 0.031 | 17.638 | n/a | n/a | 0.032 | 2.995 | 0.130 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.059ms |
| 7b672587083433f4000000000000056a | 20.926 | 3.131 | 0.005 | 0.000 | 0.381 | 0.663 | 1.064 | 0.025 | 0.000 | 0.169 | 15.436 | n/a | n/a | 0.053 | 3.516 | 0.168 | 0.053 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000555 | 19.497 | 6.264 | 0.010 | 0.000 | 0.309 | 2.261 | 4.060 | 0.038 | 0.000 | 0.236 | 6.225 | n/a | n/a | 0.093 | 6.583 | 0.338 | 0.093 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000592 | 18.753 | 6.225 | 0.015 | 0.000 | 0.786 | 0.598 | 0.921 | 0.037 | 0.000 | 0.135 | 10.002 | n/a | n/a | 0.035 | 7.026 | 0.375 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000563 | 17.061 | 2.988 | 0.005 | 0.000 | 0.563 | 1.774 | 1.284 | 0.047 | 0.000 | 0.665 | 9.692 | n/a | n/a | 0.044 | 3.556 | 0.208 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005a2 | 16.948 | 5.402 | 0.005 | 0.000 | 1.058 | 0.894 | 1.794 | 0.067 | 0.000 | 0.268 | 7.396 | n/a | n/a | 0.064 | 6.466 | 0.381 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005b6 | 15.880 | 4.501 | 0.010 | 0.000 | 0.865 | 0.815 | 3.785 | 0.029 | 0.000 | 0.523 | 5.293 | n/a | n/a | 0.059 | 5.376 | 0.339 | 0.059 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000594 | 15.290 | 4.046 | 0.011 | 0.000 | 0.232 | 1.335 | 1.860 | 0.061 | 0.000 | 0.334 | 7.380 | n/a | n/a | 0.031 | 4.289 | 0.281 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005b4 | 14.456 | 2.617 | 0.004 | 0.000 | 0.067 | 4.606 | 1.432 | 0.053 | 0.000 | 0.266 | 5.367 | n/a | n/a | 0.045 | 2.688 | 0.186 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000598 | 14.365 | 2.547 | 0.005 | 0.000 | 1.055 | 0.487 | 1.067 | 0.027 | 0.000 | 0.233 | 8.905 | n/a | n/a | 0.039 | 3.607 | 0.251 | 0.039 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000055a | 14.324 | 3.942 | 0.009 | 0.000 | 0.227 | 0.595 | 1.234 | 0.025 | 0.000 | 0.467 | 7.772 | n/a | n/a | 0.052 | 4.178 | 0.292 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000059d | 14.149 | 3.680 | 0.005 | 0.000 | 0.616 | 1.325 | 5.939 | 0.055 | 0.000 | 0.210 | 2.269 | n/a | n/a | 0.048 | 4.301 | 0.304 | 0.048 | gw-w/thread-49/storage/begin-command! | none observed |
| 7b672587083433f4000000000000055e | 12.934 | 4.028 | 0.009 | 0.000 | 0.193 | 0.820 | 1.013 | 0.023 | 0.000 | 0.467 | 6.339 | n/a | n/a | 0.042 | 4.230 | 0.327 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005b0 | 12.731 | 2.916 | 0.005 | 0.000 | 0.167 | 0.572 | 0.854 | 0.025 | 0.000 | 0.156 | 7.987 | n/a | n/a | 0.050 | 3.088 | 0.243 | 0.050 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000574 | 11.258 | 2.544 | 0.004 | 0.000 | 0.894 | 0.740 | 1.417 | 0.040 | 0.000 | 0.283 | 5.301 | n/a | n/a | 0.036 | 3.441 | 0.306 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000587 | 11.016 | 3.068 | 0.005 | 0.000 | 0.161 | 0.676 | 0.946 | 0.028 | 0.000 | 0.200 | 5.886 | n/a | n/a | 0.046 | 3.234 | 0.294 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005aa | 10.280 | 2.856 | 0.005 | 0.000 | 0.295 | 0.714 | 0.895 | 0.024 | 0.000 | 0.441 | 5.010 | n/a | n/a | 0.041 | 3.155 | 0.307 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.193 | 0.696 | 0.000 | 1.436 | 3.928 | 0.011 | 0.000 | 0.127 | 1.140 | 2.426 | 0.033 | 0.000 | 0.300 | 8.365 | n/a | n/a | 0.057 | 4.338 | 0.242 | 0.057 |
| p99 | 56.700 | 3.236 | 8.446 | 9.571 | 13.209 | n/a | 0.000 | 1.036 | 3.831 | 14.738 | 0.157 | 24.673 | 3.191 | 36.884 | n/a | n/a | 0.126 | 13.625 | 0.405 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f4000000000000060c | 56.700 | 4.120 | 0.209 | 0.000 | 0.071 | 1.859 | 14.738 | 0.076 | 24.673 | 0.347 | 10.546 | n/a | n/a | 0.062 | 4.400 | 0.078 | 0.062 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 7b672587083433f400000000000005d7 | 43.338 | 3.606 | 0.009 | 0.000 | 0.696 | 0.739 | 0.848 | 0.025 | 0.000 | 0.469 | 36.884 | n/a | n/a | 0.061 | 4.311 | 0.099 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005e9 | 36.711 | 5.389 | 0.416 | 0.000 | 0.116 | 1.756 | 10.559 | 0.111 | 0.000 | 0.777 | 17.490 | n/a | n/a | 0.098 | 5.921 | 0.161 | 0.098 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005f1 | 35.984 | 13.209 | 0.345 | 0.000 | 0.071 | 1.522 | 9.154 | 0.055 | 0.000 | 0.344 | 11.216 | n/a | n/a | 0.068 | 13.625 | 0.379 | 0.068 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005e5 | 35.592 | 3.424 | 0.006 | 0.000 | 0.911 | 0.801 | 1.740 | 0.049 | 0.000 | 0.284 | 28.335 | n/a | n/a | 0.043 | 4.340 | 0.122 | 0.043 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005c7 | 35.360 | 3.468 | 0.326 | 0.000 | 0.062 | 2.295 | 9.956 | 0.037 | 0.000 | 0.183 | 18.974 | n/a | n/a | 0.059 | 3.856 | 0.109 | 0.059 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000605 | 26.162 | 3.739 | 0.320 | 0.000 | 0.096 | 1.490 | 6.604 | 0.091 | 0.000 | 0.325 | 13.433 | n/a | n/a | 0.063 | 4.156 | 0.159 | 0.063 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.603ms; driver.publication 1.284ms |
| 7b672587083433f400000000000005bc | 24.149 | 6.123 | 0.265 | 0.000 | 0.115 | 1.338 | 7.784 | 0.031 | 0.000 | 0.152 | 8.270 | n/a | n/a | 0.070 | 6.503 | 0.269 | 0.070 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005f5 | 24.124 | 3.726 | 0.281 | 0.000 | 0.103 | 1.422 | 6.790 | 0.032 | 0.000 | 0.157 | 11.506 | n/a | n/a | 0.106 | 4.110 | 0.170 | 0.106 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000604 | 23.949 | 7.546 | 0.007 | 0.000 | 0.243 | 1.785 | 3.835 | 0.157 | 0.000 | 0.518 | 9.785 | n/a | n/a | 0.073 | 7.796 | 0.326 | 0.073 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005cf | 23.744 | 5.276 | 0.321 | 0.000 | 0.136 | 2.160 | 5.738 | 0.033 | 0.000 | 0.213 | 9.779 | n/a | n/a | 0.087 | 5.734 | 0.242 | 0.087 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f4000000000000060a | 23.702 | 3.927 | 0.281 | 0.000 | 0.129 | 1.439 | 6.720 | 0.060 | 0.000 | 0.310 | 10.762 | n/a | n/a | 0.073 | 4.338 | 0.183 | 0.073 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005cd | 23.518 | 3.928 | 0.264 | 0.000 | 0.057 | 1.516 | 8.341 | 0.043 | 0.000 | 0.396 | 8.931 | n/a | n/a | 0.042 | 4.248 | 0.181 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005ff | 23.330 | 4.051 | 0.196 | 0.000 | 0.067 | 1.318 | 6.730 | 0.032 | 0.000 | 0.358 | 10.529 | n/a | n/a | 0.048 | 4.314 | 0.185 | 0.048 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005c0 | 22.200 | 5.308 | 0.204 | 0.000 | 0.058 | 1.353 | 9.665 | 0.034 | 0.000 | 0.167 | 5.374 | n/a | n/a | 0.037 | 5.570 | 0.251 | 0.037 | gw-w/thread-52/gateway.admitted-work | none observed |
| 7b672587083433f40000000000000602 | 22.075 | 3.636 | 0.329 | 0.000 | 0.127 | 1.496 | 5.802 | 0.038 | 0.000 | 1.935 | 8.654 | n/a | n/a | 0.059 | 4.092 | 0.185 | 0.059 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005be | 21.438 | 3.590 | 0.005 | 0.000 | 0.885 | 0.563 | 1.363 | 0.026 | 0.000 | 0.487 | 14.479 | n/a | n/a | 0.040 | 4.480 | 0.209 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005c2 | 21.032 | 3.973 | 0.005 | 0.000 | 0.587 | 2.252 | 1.065 | 0.024 | 0.000 | 0.413 | 12.653 | n/a | n/a | 0.059 | 4.565 | 0.217 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005f2 | 20.911 | 4.678 | 0.005 | 0.000 | 0.102 | 0.663 | 0.961 | 0.027 | 0.000 | 0.186 | 14.236 | n/a | n/a | 0.052 | 4.785 | 0.229 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005e1 | 20.644 | 4.124 | 0.239 | 0.000 | 0.069 | 1.579 | 5.159 | 0.032 | 0.000 | 0.384 | 9.013 | n/a | n/a | 0.045 | 4.431 | 0.215 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.288 | 0.880 | 0.000 | 1.722 | 3.606 | 0.005 | 0.000 | 0.335 | 0.703 | 1.104 | 0.027 | 0.000 | 0.235 | 6.857 | n/a | n/a | 0.052 | 4.252 | 0.263 | 0.052 |
| p99 | 43.338 | 1.720 | 0.000 | 2.636 | 5.752 | n/a | 0.000 | 1.036 | 3.831 | 10.920 | 0.061 | 0.000 | 3.191 | 36.884 | n/a | n/a | 0.126 | 6.300 | 0.383 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f400000000000005d7 | 43.338 | 3.606 | 0.009 | 0.000 | 0.696 | 0.739 | 0.848 | 0.025 | 0.000 | 0.469 | 36.884 | n/a | n/a | 0.061 | 4.311 | 0.099 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005f2 | 20.911 | 4.678 | 0.005 | 0.000 | 0.102 | 0.663 | 0.961 | 0.027 | 0.000 | 0.186 | 14.236 | n/a | n/a | 0.052 | 4.785 | 0.229 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005f6 | 18.151 | 4.218 | 0.006 | 0.000 | 1.033 | 0.718 | 1.035 | 0.024 | 0.000 | 0.166 | 10.900 | n/a | n/a | 0.052 | 5.257 | 0.290 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f40000000000000601 | 17.249 | 2.125 | n/a | 0.000 | 0.201 | 3.831 | 10.920 | 0.025 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.088 | 2.326 | 0.135 | 0.088 | gw-w/thread-49/gateway.admitted-work | none observed |
| 7b672587083433f400000000000005eb | 16.438 | 5.752 | 0.011 | 0.000 | 0.537 | 0.824 | 1.245 | 0.028 | 0.000 | 0.229 | 7.748 | n/a | n/a | 0.065 | 6.300 | 0.383 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005e3 | 16.137 | 3.616 | 0.005 | 0.000 | 0.630 | 0.489 | 1.427 | 0.027 | 0.000 | 0.460 | 9.356 | n/a | n/a | 0.126 | 4.252 | 0.263 | 0.126 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005ef | 14.511 | 5.241 | 0.007 | 0.000 | 0.230 | 0.743 | 1.212 | 0.033 | 0.000 | 0.251 | 6.709 | n/a | n/a | 0.084 | 5.478 | 0.378 | 0.084 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005c8 | 14.288 | 2.835 | 0.006 | 0.000 | 0.794 | 1.406 | 0.859 | 0.025 | 0.000 | 0.179 | 8.147 | n/a | n/a | 0.036 | 3.635 | 0.254 | 0.036 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005d3 | 14.114 | 3.988 | 0.008 | 0.000 | 0.253 | 0.834 | 1.762 | 0.050 | 0.000 | 0.284 | 6.857 | n/a | n/a | 0.078 | 4.250 | 0.301 | 0.078 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005da | 14.066 | 2.917 | 0.005 | 0.000 | 0.749 | 0.628 | 0.872 | 0.027 | 0.000 | 3.191 | 5.637 | n/a | n/a | 0.039 | 3.671 | 0.261 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005d0 | 13.079 | 3.246 | 0.005 | 0.000 | 1.036 | 0.585 | 1.104 | 0.024 | 0.000 | 0.185 | 6.855 | n/a | n/a | 0.040 | 4.286 | 0.328 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005fa | 13.001 | 3.457 | 0.004 | 0.000 | 0.039 | 0.702 | 2.426 | 0.061 | 0.000 | 0.300 | 5.978 | n/a | n/a | 0.034 | 3.500 | 0.269 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005fd | 12.840 | 4.698 | 0.005 | 0.000 | 0.116 | 0.703 | 1.043 | 0.028 | 0.000 | 0.235 | 5.949 | n/a | n/a | 0.062 | 4.820 | 0.375 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000005ba | 12.662 | 2.802 | 0.005 | 0.000 | 0.335 | 0.679 | 1.311 | 0.042 | 0.000 | 0.250 | 7.187 | n/a | n/a | 0.052 | 3.142 | 0.248 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (849 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.325 | 0.808 | 0.000 | 1.631 | 3.516 | 0.006 | 0.000 | 0.752 | 0.768 | 1.195 | 0.032 | 0.000 | 0.279 | 7.187 | n/a | n/a | 0.038 | 4.563 | 0.304 | 0.038 |
| p99 | 54.429 | 2.848 | 2.462 | 5.145 | 10.137 | 2.483 | 0.000 | 20.137 | 11.804 | 10.480 | 4.871 | 0.000 | 4.026 | 32.699 | n/a | n/a | 0.100 | 25.680 | 0.668 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000a71 | 92.152 | 4.596 | 0.012 | 0.000 | 0.599 | 78.067 | 0.712 | 0.029 | 0.000 | 3.150 | 4.944 | n/a | n/a | 0.042 | 5.208 | 0.057 | 0.042 | node-14/thread-0/socket.wait-first-byte | client.parse 2.966ms; driver.publication 1.122ms |
| 7b672587083433f40000000000000bd9 | 87.437 | 6.530 | 0.097 | 0.000 | 0.864 | 46.263 | 0.870 | 23.225 | 0.000 | 0.315 | 9.245 | n/a | n/a | 0.028 | 7.491 | 0.086 | 0.028 | node-14/thread-0/socket.wait-first-byte | driver.publication 42.564ms |
| 7b672587083433f40000000000000b52 | 87.291 | 10.294 | 0.012 | 0.000 | 4.426 | 28.533 | 19.976 | 0.775 | 0.000 | 0.788 | 22.445 | n/a | n/a | 0.041 | 14.732 | 0.169 | 0.041 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.221ms; driver.publication 1.932ms; driver.publication 1.735ms; driver.expected-state.bind-receipt 1.733ms; driver.publication 1.632ms |
| 7b672587083433f40000000000000bd8 | 82.718 | 47.920 | 0.007 | 0.000 | 0.844 | 0.988 | 3.688 | 0.011 | 20.582 | 0.129 | 8.523 | n/a | n/a | 0.025 | 48.770 | 0.590 | 0.025 | node-14/thread-0/driver.publication | none observed |
| 7b672587083433f40000000000000bda | 76.043 | 4.044 | 0.005 | 0.000 | 0.320 | 15.797 | 0.870 | 0.813 | 0.000 | 0.051 | 54.102 | n/a | n/a | 0.040 | 4.369 | 0.057 | 0.040 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 42.564ms; driver.publication 1.394ms |
| 7b672587083433f40000000000000b50 | 64.395 | 7.565 | 0.006 | 0.000 | 33.782 | 1.609 | 2.065 | 0.130 | 0.000 | 6.136 | 13.046 | n/a | n/a | 0.056 | 41.354 | 0.642 | 0.056 | node-14/thread-0/driver.queue.subject | driver.publication 3.221ms; driver.publication 1.932ms; driver.publication 1.520ms; driver.publication 1.476ms; driver.publication 1.341ms |
| 7b672587083433f40000000000000698 | 62.379 | 4.040 | 0.006 | 0.000 | 13.090 | 6.385 | 1.431 | 14.843 | 0.000 | 1.827 | 20.732 | n/a | n/a | 0.025 | 17.136 | 0.275 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.744ms; driver.publication 2.122ms; driver.publication 1.123ms; driver.publication 1.059ms; driver.publication 1.025ms |
| 7b672587083433f4000000000000069c | 54.499 | 3.468 | 0.005 | 0.000 | 31.007 | 3.323 | 1.515 | 0.040 | 0.000 | 0.171 | 14.938 | n/a | n/a | 0.031 | 34.480 | 0.633 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.744ms; driver.publication 1.283ms; driver.publication 1.123ms; driver.publication 1.059ms; driver.publication 1.025ms |
| 7b672587083433f40000000000000695 | 54.429 | 7.157 | 0.242 | 0.000 | 1.063 | 10.123 | 11.754 | 0.064 | 0.000 | 5.643 | 18.361 | n/a | n/a | 0.023 | 8.462 | 0.155 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.744ms; driver.publication 2.122ms; driver.publication 1.025ms |
| 7b672587083433f40000000000000bdc | 52.313 | 3.203 | 0.007 | 0.000 | 40.603 | 1.003 | 0.727 | 0.028 | 0.000 | 1.073 | 5.641 | n/a | n/a | 0.028 | 43.812 | 0.838 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 39.019ms; driver.publication 2.116ms; driver.publication 1.394ms |
| 7b672587083433f400000000000007db | 51.869 | 5.201 | 0.009 | 0.000 | 8.400 | 1.142 | 1.918 | 0.033 | 0.000 | 0.515 | 34.608 | n/a | n/a | 0.043 | 13.610 | 0.262 | 0.043 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 2.400ms; driver.publication 2.387ms; driver.expected-state.bind-receipt 1.834ms; driver.publication 1.329ms |
| 7b672587083433f400000000000006c1 | 50.023 | 4.325 | 0.093 | 0.000 | 0.831 | 0.304 | 0.891 | 0.779 | 0.000 | 0.238 | 42.542 | n/a | n/a | 0.021 | 5.249 | 0.105 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.196ms |
| 7b672587083433f40000000000000a7e | 49.959 | 5.648 | 0.005 | 0.000 | 33.788 | 0.716 | 1.572 | 0.032 | 0.000 | 0.867 | 7.285 | n/a | n/a | 0.047 | 39.440 | 0.789 | 0.047 | node-14/thread-0/driver.queue.subject | driver.publication 1.493ms; driver.publication 1.074ms; driver.publication 1.073ms; driver.publication 0.472ms |
| 7b672587083433f40000000000000b4d | 48.997 | 4.010 | 0.008 | 0.000 | 26.612 | 10.399 | 1.307 | 0.177 | 0.000 | 0.681 | 5.777 | n/a | n/a | 0.025 | 30.630 | 0.625 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication 3.221ms; driver.publication 1.932ms; driver.publication 1.520ms; driver.publication 1.341ms; driver.publication 1.168ms |
| 7b672587083433f400000000000009db | 48.852 | 2.458 | 0.005 | 0.000 | 1.110 | 0.551 | 0.860 | 0.030 | 0.000 | 0.132 | 43.678 | n/a | n/a | 0.028 | 3.573 | 0.073 | 0.028 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.851ms; driver.publication 1.431ms; driver.publication 0.469ms |
| 7b672587083433f400000000000006a5 | 47.894 | 2.624 | 0.005 | 0.000 | 34.400 | 0.561 | 1.076 | 0.064 | 0.000 | 0.335 | 8.802 | n/a | n/a | 0.026 | 37.029 | 0.773 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 1.283ms; driver.publication 1.106ms |
| 7b672587083433f4000000000000077c | 47.612 | 3.271 | 0.005 | 0.000 | 9.596 | 4.123 | 1.391 | 0.028 | 0.000 | 0.983 | 28.178 | n/a | n/a | 0.037 | 12.872 | 0.270 | 0.037 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.645ms; driver.publication 1.551ms; driver.publication 1.153ms |
| 7b672587083433f40000000000000779 | 47.556 | 9.814 | 0.012 | 0.000 | 1.186 | 0.923 | 2.319 | 0.048 | 0.000 | 2.089 | 31.083 | n/a | n/a | 0.082 | 11.012 | 0.232 | 0.082 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.153ms |
| 7b672587083433f4000000000000061b | 45.987 | 4.086 | 0.263 | 0.000 | 0.111 | 1.718 | 10.759 | 0.079 | 0.000 | 0.449 | 28.464 | n/a | n/a | 0.059 | 4.461 | 0.097 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7b672587083433f400000000000007de | 45.681 | 4.623 | 0.007 | 0.000 | 22.231 | 0.684 | 1.803 | 0.061 | 0.000 | 1.980 | 14.250 | n/a | n/a | 0.042 | 26.861 | 0.588 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 2.400ms; driver.publication 2.387ms; driver.expected-state.bind-receipt 1.834ms; driver.publication 1.617ms; driver.publication 1.329ms |

## P2 / L1024 / commit / 5-10 facts (492 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.436 | 0.687 | 0.000 | 1.479 | 3.106 | 0.006 | 0.000 | 0.785 | 0.750 | 1.043 | 0.032 | 0.000 | 0.301 | 6.592 | n/a | n/a | 0.037 | 4.100 | 0.292 | 0.037 |
| p99 | 48.997 | 2.405 | 2.499 | 5.083 | 7.291 | 0.216 | 0.000 | 17.861 | 11.804 | 6.250 | 4.034 | 0.000 | 4.026 | 31.001 | n/a | n/a | 0.104 | 21.560 | 0.704 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000a71 | 92.152 | 4.596 | 0.012 | 0.000 | 0.599 | 78.067 | 0.712 | 0.029 | 0.000 | 3.150 | 4.944 | n/a | n/a | 0.042 | 5.208 | 0.057 | 0.042 | node-14/thread-0/socket.wait-first-byte | client.parse 2.966ms; driver.publication 1.122ms |
| 7b672587083433f40000000000000bd9 | 87.437 | 6.530 | 0.097 | 0.000 | 0.864 | 46.263 | 0.870 | 23.225 | 0.000 | 0.315 | 9.245 | n/a | n/a | 0.028 | 7.491 | 0.086 | 0.028 | node-14/thread-0/socket.wait-first-byte | driver.publication 42.564ms |
| 7b672587083433f40000000000000bdc | 52.313 | 3.203 | 0.007 | 0.000 | 40.603 | 1.003 | 0.727 | 0.028 | 0.000 | 1.073 | 5.641 | n/a | n/a | 0.028 | 43.812 | 0.838 | 0.028 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 39.019ms; driver.publication 2.116ms; driver.publication 1.394ms |
| 7b672587083433f400000000000007db | 51.869 | 5.201 | 0.009 | 0.000 | 8.400 | 1.142 | 1.918 | 0.033 | 0.000 | 0.515 | 34.608 | n/a | n/a | 0.043 | 13.610 | 0.262 | 0.043 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 2.400ms; driver.publication 2.387ms; driver.expected-state.bind-receipt 1.834ms; driver.publication 1.329ms |
| 7b672587083433f40000000000000b4d | 48.997 | 4.010 | 0.008 | 0.000 | 26.612 | 10.399 | 1.307 | 0.177 | 0.000 | 0.681 | 5.777 | n/a | n/a | 0.025 | 30.630 | 0.625 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication 3.221ms; driver.publication 1.932ms; driver.publication 1.520ms; driver.publication 1.341ms; driver.publication 1.168ms |
| 7b672587083433f400000000000009db | 48.852 | 2.458 | 0.005 | 0.000 | 1.110 | 0.551 | 0.860 | 0.030 | 0.000 | 0.132 | 43.678 | n/a | n/a | 0.028 | 3.573 | 0.073 | 0.028 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.851ms; driver.publication 1.431ms; driver.publication 0.469ms |
| 7b672587083433f400000000000006a5 | 47.894 | 2.624 | 0.005 | 0.000 | 34.400 | 0.561 | 1.076 | 0.064 | 0.000 | 0.335 | 8.802 | n/a | n/a | 0.026 | 37.029 | 0.773 | 0.026 | node-14/thread-0/driver.queue.subject | driver.publication 1.283ms; driver.publication 1.106ms |
| 7b672587083433f4000000000000077c | 47.612 | 3.271 | 0.005 | 0.000 | 9.596 | 4.123 | 1.391 | 0.028 | 0.000 | 0.983 | 28.178 | n/a | n/a | 0.037 | 12.872 | 0.270 | 0.037 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.645ms; driver.publication 1.551ms; driver.publication 1.153ms |
| 7b672587083433f400000000000007dd | 44.507 | 4.490 | 0.013 | 0.000 | 5.029 | 0.580 | 1.506 | 0.047 | 0.000 | 0.211 | 32.574 | n/a | n/a | 0.057 | 9.532 | 0.214 | 0.057 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.400ms; driver.publication 2.387ms; driver.expected-state.bind-receipt 1.834ms; driver.publication 1.617ms; driver.publication 1.329ms |
| 7b672587083433f4000000000000068f | 42.153 | 5.081 | 0.006 | 0.000 | 0.943 | 8.408 | 8.261 | 0.043 | 0.000 | 0.127 | 19.243 | n/a | n/a | 0.041 | 6.030 | 0.143 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.472ms; driver.publication 1.044ms |
| 7b672587083433f40000000000000665 | 40.160 | 3.168 | 0.006 | 0.000 | 0.439 | 0.904 | 5.362 | 0.065 | 0.000 | 1.925 | 28.248 | n/a | n/a | 0.042 | 3.614 | 0.090 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.653ms; driver.publication 1.511ms |
| 7b672587083433f40000000000000b4e | 39.764 | 3.435 | 0.003 | 0.000 | 2.975 | 12.446 | 1.559 | 0.013 | 0.000 | 0.076 | 19.216 | n/a | n/a | 0.041 | 6.413 | 0.161 | 0.041 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.221ms; driver.publication 1.932ms; driver.publication 1.520ms; driver.publication 1.145ms |
| 7b672587083433f40000000000000694 | 39.476 | 6.794 | 0.049 | 0.000 | 0.760 | 2.090 | 1.480 | 0.042 | 0.000 | 0.184 | 28.016 | n/a | n/a | 0.059 | 7.604 | 0.193 | 0.059 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 2.122ms; driver.publication 1.025ms |
| 7b672587083433f400000000000006c3 | 39.072 | 2.964 | 0.006 | 0.000 | 0.958 | 2.182 | 0.950 | 0.028 | 18.667 | 4.915 | 8.368 | n/a | n/a | 0.035 | 3.928 | 0.101 | 0.035 | gw-w/thread--1/jdk.GCPhasePause | driver.publication 1.372ms |
| 7b672587083433f40000000000000692 | 38.929 | 3.127 | 0.006 | 0.000 | 1.001 | 0.469 | 2.159 | 0.058 | 0.000 | 0.313 | 31.763 | n/a | n/a | 0.032 | 4.134 | 0.106 | 0.032 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 2.122ms |
| 7b672587083433f400000000000009d6 | 37.864 | 3.892 | 0.013 | 0.000 | 0.274 | 3.895 | 0.631 | 0.026 | 0.000 | 0.074 | 29.025 | n/a | n/a | 0.034 | 4.178 | 0.110 | 0.034 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.530ms |
| 7b672587083433f40000000000000a7b | 37.650 | 2.548 | 0.006 | 0.000 | 0.671 | 0.472 | 0.644 | 0.021 | 0.000 | 2.254 | 31.001 | n/a | n/a | 0.034 | 3.225 | 0.086 | 0.034 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 2.526ms; driver.publication 1.493ms; driver.publication 1.073ms |
| 7b672587083433f40000000000000aa3 | 37.296 | 4.968 | 0.108 | 0.000 | 3.996 | 2.682 | 1.331 | 9.324 | 0.000 | 0.040 | 14.819 | n/a | n/a | 0.028 | 9.072 | 0.243 | 0.028 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 3.855ms |
| 7b672587083433f400000000000007a0 | 37.136 | 3.502 | 0.002 | 0.000 | 1.338 | 5.938 | 0.818 | 0.608 | 0.000 | 0.173 | 24.731 | n/a | n/a | 0.025 | 4.843 | 0.130 | 0.025 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.141ms; driver.publication 1.076ms |
| 7b672587083433f400000000000007ff | 36.497 | 5.534 | 0.010 | 0.000 | 20.137 | 1.524 | 1.524 | 0.042 | 0.000 | 0.218 | 7.469 | n/a | n/a | 0.039 | 25.680 | 0.704 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.242ms; driver.expected-state.bind-receipt 1.087ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.035 | 1.187 | 0.000 | 1.672 | 2.897 | 0.002 | 0.000 | 0.177 | 2.461 | 1.173 | 0.051 | 0.000 | 0.138 | 11.102 | n/a | n/a | 0.033 | 3.076 | 0.171 | 0.033 |
| p99 | 18.035 | 1.187 | 0.000 | 1.672 | 2.897 | 0.002 | 0.000 | 0.177 | 2.461 | 1.173 | 0.051 | 0.000 | 0.138 | 11.102 | n/a | n/a | 0.033 | 3.076 | 0.171 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000000ca2 | 18.035 | 2.897 | 0.002 | 0.000 | 0.177 | 2.461 | 1.173 | 0.051 | 0.000 | 0.138 | 11.102 | n/a | n/a | 0.033 | 3.076 | 0.171 | 0.033 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.039ms |

## P2 / tail / commit (2618 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.736 | 0.697 | 0.000 | 1.603 | 3.529 | 0.006 | 0.000 | 0.775 | 0.681 | 1.138 | 0.030 | 0.000 | 0.182 | 6.273 | n/a | n/a | 0.033 | 4.528 | 0.335 | 0.033 |
| p99 | 76.423 | 2.787 | 2.728 | 5.636 | 11.060 | 1.294 | 0.000 | 28.082 | 26.104 | 9.200 | 2.771 | 0.000 | 3.094 | 29.289 | n/a | n/a | 0.100 | 34.586 | 0.744 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000001ae3 | 144.067 | 4.831 | 0.006 | 0.000 | 0.905 | 127.933 | 1.208 | 0.024 | 0.000 | 0.101 | 9.010 | n/a | n/a | 0.049 | 5.742 | 0.040 | 0.049 | node-14/thread-0/socket.wait-first-byte | client.parse 2.949ms |
| 7b672587083433f40000000000001ae4 | 131.883 | 7.411 | 0.013 | 2.231 | 110.922 | 1.770 | 2.011 | 0.016 | 0.000 | 0.093 | 7.375 | n/a | n/a | 0.041 | 120.576 | 0.914 | 0.041 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.243ms |
| 7b672587083433f40000000000001ae5 | 126.437 | 2.580 | 0.005 | 0.000 | 114.843 | 1.896 | 1.153 | 0.027 | 0.000 | 0.091 | 5.820 | n/a | n/a | 0.022 | 117.428 | 0.929 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.243ms |
| 7b672587083433f40000000000001aed | 126.138 | 3.882 | 0.005 | 0.000 | 78.028 | 25.863 | 0.804 | 0.013 | 0.000 | 0.042 | 17.468 | n/a | n/a | 0.031 | 81.916 | 0.649 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.688ms; driver.publication 1.426ms; driver.expected-state.bind-receipt 1.257ms |
| 7b672587083433f40000000000001ae7 | 125.267 | 2.398 | 0.004 | 0.000 | 116.242 | 0.811 | 0.842 | 0.027 | 0.000 | 0.106 | 4.811 | n/a | n/a | 0.027 | 118.644 | 0.947 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.243ms |
| 7b672587083433f40000000000001ae9 | 119.113 | 3.947 | 0.010 | 0.000 | 90.605 | 13.962 | 1.374 | 0.050 | 0.000 | 0.211 | 8.910 | n/a | n/a | 0.044 | 94.562 | 0.794 | 0.044 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.243ms |
| 7b672587083433f40000000000001d96 | 118.556 | 4.990 | 0.008 | 0.000 | 1.831 | 77.565 | 3.222 | 18.293 | 0.000 | 1.549 | 11.070 | n/a | n/a | 0.029 | 6.828 | 0.058 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.159ms; driver.publication 1.066ms; driver.publication 0.723ms |
| 7b672587083433f40000000000001d97 | 115.499 | 37.206 | 0.010 | 3.845 | 2.302 | 51.893 | 3.865 | 0.073 | 0.000 | 1.345 | 14.928 | n/a | n/a | 0.030 | 43.364 | 0.375 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.066ms |
| 7b672587083433f40000000000001ae6 | 112.981 | 6.753 | 0.870 | 2.231 | 87.999 | 0.115 | 0.827 | 1.271 | 0.000 | 0.021 | 12.873 | n/a | n/a | 0.022 | 97.852 | 0.866 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.243ms |
| 7b672587083433f40000000000001aea | 112.348 | 3.598 | 0.008 | 0.000 | 100.505 | 0.520 | 0.891 | 0.028 | 0.000 | 0.324 | 6.439 | n/a | n/a | 0.035 | 104.111 | 0.927 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.246ms; driver.publication 1.243ms; driver.publication 1.146ms |
| 7b672587083433f40000000000001820 | 106.325 | 4.741 | 0.147 | 0.000 | 0.617 | 59.978 | 10.003 | 0.182 | 0.000 | 0.189 | 30.433 | n/a | n/a | 0.037 | 5.505 | 0.052 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.629ms; driver.publication 1.343ms; driver.publication 1.149ms; client.parse 1.068ms |
| 7b672587083433f40000000000001826 | 106.031 | 5.357 | 0.009 | 0.000 | 0.216 | 71.545 | 1.181 | 0.031 | 0.000 | 0.115 | 27.538 | n/a | n/a | 0.038 | 5.582 | 0.053 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.629ms; driver.publication 1.360ms; client.parse 1.068ms |
| 7b672587083433f40000000000001ae8 | 102.477 | 7.958 | 0.990 | 2.231 | 71.963 | 3.877 | 1.428 | 0.008 | 0.000 | 0.020 | 13.982 | n/a | n/a | 0.020 | 83.142 | 0.811 | 0.020 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.243ms |
| 7b672587083433f400000000000019db | 95.656 | 20.334 | 2.646 | 0.000 | 0.118 | 8.799 | 14.452 | 0.145 | 0.000 | 4.147 | 44.810 | n/a | n/a | 0.206 | 23.098 | 0.241 | 0.206 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 5.535ms; driver.publication 3.305ms; driver.publication 2.763ms; driver.publication 2.418ms |
| 7b672587083433f40000000000001831 | 91.280 | 3.231 | 3.410 | 0.000 | 55.779 | 9.194 | 0.474 | 0.281 | 0.000 | 0.023 | 18.862 | n/a | n/a | 0.024 | 62.420 | 0.684 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 3.083ms; driver.expected-state.bind-receipt 1.586ms; driver.publication 1.578ms; driver.publication 1.554ms; driver.publication 1.406ms |
| 7b672587083433f4000000000000182b | 89.667 | 8.325 | 0.007 | 0.000 | 0.727 | 58.227 | 2.841 | 0.084 | 0.000 | 4.925 | 14.482 | n/a | n/a | 0.049 | 9.059 | 0.101 | 0.049 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.578ms; driver.publication 1.360ms; client.parse 1.068ms |
| 7b672587083433f40000000000001a55 | 88.594 | 3.591 | 0.004 | 0.000 | 0.484 | 24.759 | 3.104 | 14.532 | 0.000 | 1.390 | 40.709 | n/a | n/a | 0.022 | 4.078 | 0.046 | 0.022 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.281ms; driver.publication 1.226ms; driver.publication 1.167ms; driver.publication 1.167ms; driver.publication 1.079ms |
| 7b672587083433f400000000000019a2 | 88.560 | 7.343 | 0.007 | 0.000 | 7.217 | 64.989 | 0.904 | 0.027 | 0.000 | 0.100 | 7.939 | n/a | n/a | 0.035 | 14.567 | 0.164 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.243ms; client.parse 1.170ms |
| 7b672587083433f40000000000001a54 | 88.152 | 3.953 | 0.006 | 0.000 | 0.775 | 23.810 | 4.383 | 15.917 | 0.000 | 0.273 | 39.006 | n/a | n/a | 0.030 | 4.734 | 0.054 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.281ms; driver.publication 1.226ms; driver.publication 1.167ms; driver.publication 1.167ms; driver.publication 1.079ms |
| 7b672587083433f40000000000001a51 | 87.697 | 7.229 | 0.005 | 0.000 | 32.326 | 10.620 | 5.599 | 9.892 | 0.000 | 0.130 | 21.850 | n/a | n/a | 0.046 | 39.560 | 0.451 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 1.281ms; driver.publication 1.167ms; driver.publication 1.079ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.187 | 0.573 | 0.000 | 1.472 | 3.095 | 0.005 | 0.000 | 0.791 | 0.657 | 0.964 | 0.029 | 0.000 | 0.182 | 5.872 | n/a | n/a | 0.033 | 4.023 | 0.325 | 0.033 |
| p99 | 71.230 | 2.200 | 2.559 | 5.367 | 10.066 | 0.465 | 0.000 | 28.788 | 23.521 | 6.179 | 2.804 | 0.000 | 2.892 | 29.280 | n/a | n/a | 0.097 | 37.905 | 0.764 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7b672587083433f40000000000001ae7 | 125.267 | 2.398 | 0.004 | 0.000 | 116.242 | 0.811 | 0.842 | 0.027 | 0.000 | 0.106 | 4.811 | n/a | n/a | 0.027 | 118.644 | 0.947 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.243ms |
| 7b672587083433f40000000000001ae9 | 119.113 | 3.947 | 0.010 | 0.000 | 90.605 | 13.962 | 1.374 | 0.050 | 0.000 | 0.211 | 8.910 | n/a | n/a | 0.044 | 94.562 | 0.794 | 0.044 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.243ms |
| 7b672587083433f40000000000001d97 | 115.499 | 37.206 | 0.010 | 3.845 | 2.302 | 51.893 | 3.865 | 0.073 | 0.000 | 1.345 | 14.928 | n/a | n/a | 0.030 | 43.364 | 0.375 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.066ms |
| 7b672587083433f40000000000001ae6 | 112.981 | 6.753 | 0.870 | 2.231 | 87.999 | 0.115 | 0.827 | 1.271 | 0.000 | 0.021 | 12.873 | n/a | n/a | 0.022 | 97.852 | 0.866 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 1.243ms |
| 7b672587083433f40000000000001aea | 112.348 | 3.598 | 0.008 | 0.000 | 100.505 | 0.520 | 0.891 | 0.028 | 0.000 | 0.324 | 6.439 | n/a | n/a | 0.035 | 104.111 | 0.927 | 0.035 | node-14/thread-0/driver.queue.subject | driver.publication 2.134ms; driver.publication 1.988ms; driver.publication 1.246ms; driver.publication 1.243ms; driver.publication 1.146ms |
| 7b672587083433f40000000000001820 | 106.325 | 4.741 | 0.147 | 0.000 | 0.617 | 59.978 | 10.003 | 0.182 | 0.000 | 0.189 | 30.433 | n/a | n/a | 0.037 | 5.505 | 0.052 | 0.037 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.629ms; driver.publication 1.343ms; driver.publication 1.149ms; client.parse 1.068ms |
| 7b672587083433f40000000000001ae8 | 102.477 | 7.958 | 0.990 | 2.231 | 71.963 | 3.877 | 1.428 | 0.008 | 0.000 | 0.020 | 13.982 | n/a | n/a | 0.020 | 83.142 | 0.811 | 0.020 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.134ms; driver.publication 1.243ms |
| 7b672587083433f40000000000001831 | 91.280 | 3.231 | 3.410 | 0.000 | 55.779 | 9.194 | 0.474 | 0.281 | 0.000 | 0.023 | 18.862 | n/a | n/a | 0.024 | 62.420 | 0.684 | 0.024 | node-14/thread-0/driver.queue.subject | driver.publication 3.083ms; driver.expected-state.bind-receipt 1.586ms; driver.publication 1.578ms; driver.publication 1.554ms; driver.publication 1.406ms |
| 7b672587083433f40000000000001a55 | 88.594 | 3.591 | 0.004 | 0.000 | 0.484 | 24.759 | 3.104 | 14.532 | 0.000 | 1.390 | 40.709 | n/a | n/a | 0.022 | 4.078 | 0.046 | 0.022 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 1.281ms; driver.publication 1.226ms; driver.publication 1.167ms; driver.publication 1.167ms; driver.publication 1.079ms |
| 7b672587083433f400000000000019a2 | 88.560 | 7.343 | 0.007 | 0.000 | 7.217 | 64.989 | 0.904 | 0.027 | 0.000 | 0.100 | 7.939 | n/a | n/a | 0.035 | 14.567 | 0.164 | 0.035 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.243ms; client.parse 1.170ms |
| 7b672587083433f40000000000001a56 | 84.063 | 3.095 | 0.005 | 0.000 | 69.218 | 3.431 | 1.084 | 0.023 | 0.000 | 0.514 | 6.663 | n/a | n/a | 0.030 | 72.318 | 0.860 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 1.570ms; driver.publication 1.281ms; driver.publication 1.226ms; driver.publication 1.167ms; driver.publication 1.167ms |
| 7b672587083433f40000000000000ecf | 83.309 | 6.785 | 0.634 | 0.000 | 13.842 | 8.017 | 7.355 | 10.412 | 0.000 | 0.705 | 35.531 | n/a | n/a | 0.029 | 21.260 | 0.255 | 0.029 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 3.693ms; driver.publication 2.188ms; driver.publication 1.334ms; driver.publication 1.132ms; driver.publication 1.047ms |
| 7b672587083433f40000000000001a53 | 82.486 | 4.201 | 0.009 | 0.000 | 0.083 | 19.127 | 22.609 | 0.039 | 0.000 | 0.079 | 36.280 | n/a | n/a | 0.060 | 4.292 | 0.052 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.281ms; driver.publication 1.167ms; driver.publication 1.079ms |
| 7b672587083433f40000000000001a59 | 81.967 | 3.029 | 0.005 | 0.000 | 72.724 | 0.482 | 1.326 | 0.033 | 0.000 | 0.317 | 4.010 | n/a | n/a | 0.040 | 75.759 | 0.924 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 1.570ms; driver.publication 1.372ms; driver.publication 1.281ms; driver.publication 1.226ms; driver.publication 1.167ms |
| 7b672587083433f4000000000000182d | 73.525 | 4.516 | 0.008 | 0.000 | 27.307 | 28.206 | 1.536 | 0.034 | 0.000 | 2.799 | 9.081 | n/a | n/a | 0.038 | 31.831 | 0.433 | 0.038 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.586ms; driver.publication 1.578ms; driver.publication 1.406ms; driver.publication 1.360ms |
| 7b672587083433f4000000000000182e | 71.230 | 5.483 | 4.262 | 0.000 | 23.500 | 23.521 | 0.810 | 1.525 | 0.000 | 0.098 | 12.011 | n/a | n/a | 0.021 | 33.244 | 0.467 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 1.586ms; driver.publication 1.578ms; driver.publication 1.406ms; driver.publication 1.360ms; driver.publication 1.319ms |
| 7b672587083433f40000000000001d0b | 69.893 | 13.548 | 0.014 | 0.000 | 46.582 | 0.766 | 0.949 | 0.030 | 0.000 | 0.179 | 7.767 | n/a | n/a | 0.058 | 60.144 | 0.861 | 0.058 | node-14/thread-0/driver.queue.scheduler-late | client.parse 1.520ms |
| 7b672587083433f400000000000019e1 | 69.454 | 11.599 | 0.093 | 0.000 | 1.147 | 31.774 | 14.857 | 0.080 | 0.000 | 0.222 | 9.636 | n/a | n/a | 0.044 | 12.840 | 0.185 | 0.044 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.535ms; driver.publication 3.305ms; driver.expected-state.bind-receipt 1.018ms |
| 7b672587083433f40000000000000e57 | 68.524 | 3.380 | 0.006 | 0.000 | 0.988 | 41.967 | 1.249 | 0.080 | 0.000 | 0.182 | 20.639 | n/a | n/a | 0.033 | 4.374 | 0.064 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.529ms; client.parse 1.347ms; driver.publication 1.245ms |
| 7b672587083433f40000000000001f1f | 66.543 | 3.228 | 0.006 | 0.000 | 1.183 | 46.614 | 1.414 | 0.026 | 0.000 | 4.474 | 9.544 | n/a | n/a | 0.053 | 4.417 | 0.066 | 0.053 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.045ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.108 | n/a | n/a | n/a | 0.075 | n/a | 0.000 | 0.000 | 1.211 | 200.559 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.170 | 0.075 | 0.000 | 0.170 |
| p99 | 203.836 | n/a | n/a | n/a | 18.764 | n/a | 2.016 | 0.000 | 6.182 | 202.188 | 0.229 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.543 | 20.781 | 0.252 | 0.543 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba420000000000000005 | 203.836 | 0.055 | n/a | 0.000 | 0.000 | 1.133 | 202.188 | 0.049 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.221 | 0.055 | 0.000 | 0.221 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000007 | 203.431 | 0.075 | n/a | 0.000 | 0.000 | 1.345 | 201.309 | 0.013 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.543 | 0.075 | 0.000 | 0.543 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000206 | 202.995 | 0.044 | n/a | 0.000 | 0.000 | 1.992 | 200.767 | 0.006 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.074 | 0.044 | 0.000 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000006 | 202.392 | 0.113 | n/a | 0.000 | 0.000 | 1.120 | 200.926 | 0.011 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.111 | 0.113 | 0.001 | 0.111 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000f04 | 201.306 | 0.026 | n/a | 0.000 | 0.000 | 0.383 | 200.770 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.064 | 0.026 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000f03 | 201.108 | 0.035 | n/a | 0.000 | 0.000 | 0.399 | 200.559 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.069 | 0.035 | 0.000 | 0.069 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000f05 | 201.073 | 0.028 | n/a | 0.000 | 0.000 | 0.422 | 200.512 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.075 | 0.028 | 0.000 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000000002 | 148.604 | 1.199 | n/a | 0.000 | 0.000 | 1.211 | 145.643 | 0.229 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.235 | 1.199 | 0.008 | 0.235 | gw-r/thread-49/gateway.admitted-work | none observed |
| 99380c5b5a81ba420000000000000f08 | 86.950 | 18.764 | n/a | 2.016 | 0.000 | 6.182 | 59.707 | 0.005 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.272 | 20.781 | 0.239 | 0.272 | gw-r/thread-53/gateway.admitted-work | none observed |
| 99380c5b5a81ba420000000000000f09 | 69.310 | 17.482 | n/a | 0.000 | 0.000 | 1.997 | 49.646 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.170 | 17.482 | 0.252 | 0.170 | gw-r/thread-53/gateway.admitted-work | none observed |
| 99380c5b5a81ba420000000000000f0a | 61.413 | 14.099 | n/a | 0.000 | 0.000 | 2.431 | 44.686 | 0.013 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.175 | 14.099 | 0.230 | 0.175 | gw-r/thread-54/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 825.952 | n/a | n/a | n/a | 0.241 | n/a | 0.000 | 0.000 | 0.951 | 810.519 | 0.011 | 0.000 | 0.348 | 0.000 | n/a | n/a | 0.375 | 0.241 | 0.000 | 0.375 |
| p99 | 1005.000 | n/a | n/a | n/a | 13.222 | n/a | 0.000 | 0.000 | 1.762 | 1001.284 | 0.031 | 0.000 | 0.853 | 0.000 | n/a | n/a | 1.354 | 13.222 | 0.016 | 1.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f8100000000000000a4 | 1005.000 | 0.241 | n/a | 0.000 | 0.000 | 1.762 | 1001.284 | 0.011 | 0.000 | 0.348 | 0.000 | n/a | n/a | 1.354 | 0.241 | 0.000 | 1.354 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f8100000000000000a5 | 825.952 | 13.222 | n/a | 0.000 | 0.000 | 0.951 | 810.519 | 0.031 | 0.000 | 0.853 | 0.000 | n/a | n/a | 0.375 | 13.222 | 0.016 | 0.375 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 417.306 | n/a | n/a | n/a | 2.896 | n/a | 0.000 | 0.000 | 0.744 | 412.235 | 0.020 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.110 | 2.896 | 0.007 | 0.110 |
| p99 | 1020.923 | n/a | n/a | n/a | 9.853 | n/a | 0.000 | 0.000 | 2.610 | 1014.986 | 3.380 | 0.000 | 1.950 | 0.000 | n/a | n/a | 1.302 | 9.853 | 0.359 | 1.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f8100000000000000d0 | 1020.923 | 0.787 | n/a | 0.000 | 0.000 | 1.700 | 1014.986 | 0.198 | 0.000 | 1.950 | 0.000 | n/a | n/a | 1.302 | 0.787 | 0.001 | 1.302 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000000bc | 1009.048 | 6.319 | n/a | 0.000 | 0.000 | 0.764 | 1001.775 | 0.010 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.110 | 6.319 | 0.006 | 0.110 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000ae | 1007.407 | 3.964 | n/a | 0.000 | 0.000 | 0.490 | 1002.692 | 0.026 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.092 | 3.964 | 0.004 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000b4 | 1003.792 | 0.114 | n/a | 0.000 | 0.000 | 0.793 | 1001.562 | 0.038 | 0.000 | 0.174 | 0.000 | n/a | n/a | 1.111 | 0.114 | 0.000 | 1.111 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000000bb | 989.235 | 2.500 | n/a | 0.000 | 0.000 | 2.610 | 983.867 | 0.038 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.108 | 2.500 | 0.003 | 0.108 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000000ab | 885.196 | 2.942 | n/a | 0.000 | 0.000 | 0.550 | 881.510 | 0.017 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.104 | 2.942 | 0.003 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000000a8 | 798.075 | 2.333 | n/a | 0.000 | 0.000 | 0.569 | 793.791 | 0.011 | 0.000 | 1.225 | 0.000 | n/a | n/a | 0.146 | 2.333 | 0.003 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000000c2 | 772.566 | 5.751 | n/a | 0.000 | 0.000 | 0.590 | 765.066 | 0.939 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.111 | 5.751 | 0.007 | 0.111 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000000b3 | 661.752 | 3.198 | n/a | 0.000 | 0.000 | 0.744 | 657.588 | 0.021 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.095 | 3.198 | 0.005 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000000cb | 649.602 | 4.689 | n/a | 0.000 | 0.000 | 0.710 | 643.320 | 0.617 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.203 | 4.689 | 0.007 | 0.203 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000c9 | 621.337 | 3.644 | n/a | 0.000 | 0.000 | 0.589 | 616.894 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.133 | 3.644 | 0.006 | 0.133 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f8100000000000000c1 | 601.555 | 2.350 | n/a | 0.000 | 0.000 | 0.619 | 598.354 | 0.021 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.089 | 2.350 | 0.004 | 0.089 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f8100000000000000c7 | 574.544 | 2.660 | n/a | 0.000 | 0.000 | 0.809 | 567.523 | 3.380 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.074 | 2.660 | 0.005 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000000b7 | 446.094 | 2.769 | n/a | 0.000 | 0.000 | 0.756 | 442.322 | 0.023 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.112 | 2.769 | 0.006 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000000c5 | 417.306 | 3.688 | n/a | 0.000 | 0.000 | 0.702 | 412.235 | 0.398 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.085 | 3.688 | 0.009 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f8100000000000000a7 | 395.415 | 2.896 | n/a | 0.000 | 0.000 | 0.701 | 391.289 | 0.198 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.130 | 2.896 | 0.007 | 0.130 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000000c8 | 382.073 | 2.538 | n/a | 0.000 | 0.000 | 0.805 | 378.532 | 0.012 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.077 | 2.538 | 0.007 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f8100000000000000b9 | 340.099 | 2.766 | n/a | 0.000 | 0.000 | 1.379 | 335.759 | 0.012 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.112 | 2.766 | 0.008 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f8100000000000000b0 | 316.033 | 9.853 | n/a | 0.000 | 0.000 | 0.726 | 305.086 | 0.014 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.250 | 9.853 | 0.031 | 0.250 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000000cc | 269.427 | 3.233 | n/a | 0.000 | 0.000 | 0.985 | 265.047 | 0.012 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.085 | 3.233 | 0.012 | 0.085 | gw-r/thread-56/journal/page | none observed |

## P3 / L1 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 413.487 | n/a | n/a | n/a | 3.867 | n/a | 0.601 | 0.000 | 0.695 | 402.789 | 0.013 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.114 | 4.457 | 0.018 | 0.114 |
| p99 | 1008.446 | n/a | n/a | n/a | 12.199 | n/a | 4.147 | 0.000 | 9.358 | 1001.205 | 3.029 | 26.389 | 0.409 | 0.000 | n/a | n/a | 1.208 | 16.020 | 0.589 | 1.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f810000000000000102 | 1008.446 | 0.228 | n/a | 0.000 | 0.000 | 5.554 | 1001.205 | 0.023 | 0.000 | 0.228 | 0.000 | n/a | n/a | 1.208 | 0.228 | 0.000 | 1.208 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f8100000000000000d9 | 1003.065 | 0.200 | n/a | 0.000 | 0.000 | 0.768 | 1000.886 | 0.014 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.122 | 0.200 | 0.000 | 1.122 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f8100000000000000db | 1002.135 | 5.873 | n/a | 0.666 | 0.000 | 2.836 | 991.732 | 0.816 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.151 | 6.539 | 0.007 | 0.151 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000000e0 | 994.867 | 3.267 | n/a | 0.633 | 0.000 | 0.597 | 990.171 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.094 | 3.900 | 0.004 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000000d3 | 994.460 | 6.490 | n/a | 0.822 | 0.000 | 0.609 | 986.351 | 0.012 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.121 | 7.313 | 0.007 | 0.121 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000107 | 990.782 | 3.667 | n/a | 0.000 | 0.000 | 0.627 | 986.354 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.066 | 3.667 | 0.004 | 0.066 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000ff | 976.209 | 5.349 | n/a | 0.000 | 0.000 | 0.476 | 970.209 | 0.007 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.091 | 5.349 | 0.005 | 0.091 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f81000000000000010f | 965.416 | 4.131 | n/a | 0.000 | 0.000 | 0.689 | 960.406 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.074 | 4.131 | 0.004 | 0.074 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000df | 932.483 | 3.068 | n/a | 0.615 | 0.000 | 0.758 | 927.778 | 0.057 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.113 | 3.683 | 0.004 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f8100000000000000d2 | 912.492 | 12.199 | n/a | 0.961 | 0.000 | 1.537 | 897.195 | 0.014 | 0.000 | 0.409 | 0.000 | n/a | n/a | 0.177 | 13.160 | 0.014 | 0.177 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000000e6 | 832.813 | 2.972 | n/a | 0.555 | 0.000 | 0.663 | 828.415 | 0.017 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.114 | 3.527 | 0.004 | 0.114 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000e1 | 791.675 | 5.511 | n/a | 0.666 | 0.000 | 0.682 | 784.658 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.079 | 6.177 | 0.008 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f810000000000000104 | 748.066 | 6.515 | n/a | 0.000 | 0.000 | 0.688 | 740.604 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.189 | 6.515 | 0.009 | 0.189 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000110 | 666.591 | 3.795 | n/a | 0.662 | 0.000 | 0.478 | 661.526 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.064 | 4.457 | 0.007 | 0.064 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000000ec | 640.031 | 2.395 | n/a | 0.000 | 0.000 | 0.494 | 636.980 | 0.013 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.094 | 2.395 | 0.004 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000000e9 | 581.996 | 9.262 | n/a | 1.587 | 0.000 | 0.822 | 570.067 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.171 | 10.849 | 0.019 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f8100000000000000fc | 552.048 | 5.688 | n/a | 0.784 | 0.000 | 0.721 | 541.635 | 3.029 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.110 | 6.471 | 0.012 | 0.110 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f8100000000000000dc | 531.052 | 11.933 | n/a | 1.548 | 0.000 | 0.567 | 516.691 | 0.012 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.234 | 13.481 | 0.025 | 0.234 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000000de | 526.043 | 4.156 | n/a | 0.569 | 0.000 | 2.294 | 516.720 | 2.127 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.096 | 4.725 | 0.009 | 0.096 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f81000000000000010a | 494.198 | 11.873 | n/a | 4.147 | 0.000 | 0.754 | 450.796 | 0.014 | 26.389 | 0.072 | 0.000 | n/a | n/a | 0.153 | 16.020 | 0.032 | 0.153 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 386.373 | n/a | n/a | n/a | 3.534 | n/a | 0.000 | 0.000 | 0.671 | 382.233 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.110 | 3.714 | 0.010 | 0.110 |
| p99 | 1004.115 | n/a | n/a | n/a | 12.053 | n/a | 1.245 | 0.000 | 2.851 | 1000.667 | 0.672 | 0.000 | 0.345 | 0.000 | n/a | n/a | 1.158 | 12.761 | 0.203 | 1.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f81000000000000011e | 1004.115 | 4.684 | n/a | 0.000 | 0.000 | 0.574 | 998.711 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.097 | 4.684 | 0.005 | 0.097 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000138 | 1002.661 | 0.189 | n/a | 0.000 | 0.000 | 0.574 | 1000.667 | 0.016 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.158 | 0.189 | 0.000 | 1.158 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f81000000000000012c | 1000.293 | 3.441 | n/a | 0.000 | 0.000 | 0.512 | 996.221 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.070 | 3.441 | 0.003 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f810000000000000127 | 994.656 | 2.933 | n/a | 0.000 | 0.000 | 0.630 | 990.964 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.083 | 2.933 | 0.003 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000012b | 993.057 | 2.813 | n/a | 0.000 | 0.000 | 1.231 | 988.697 | 0.182 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.099 | 2.813 | 0.003 | 0.099 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000142 | 976.159 | 4.351 | n/a | 0.000 | 0.000 | 0.843 | 970.785 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.122 | 4.351 | 0.004 | 0.122 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000000116 | 970.050 | 3.324 | n/a | 0.000 | 0.000 | 0.659 | 965.911 | 0.006 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.078 | 3.324 | 0.003 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000000113 | 812.143 | 3.407 | n/a | 0.000 | 0.000 | 0.499 | 808.116 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.075 | 3.407 | 0.004 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f810000000000000149 | 762.237 | 3.846 | n/a | 0.692 | 0.000 | 0.772 | 756.726 | 0.006 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.123 | 4.538 | 0.006 | 0.123 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000128 | 740.942 | 8.371 | n/a | 1.245 | 0.000 | 0.828 | 730.150 | 0.150 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.160 | 9.616 | 0.013 | 0.160 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000013e | 739.047 | 2.787 | n/a | 0.000 | 0.000 | 0.819 | 735.289 | 0.011 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.060 | 2.787 | 0.004 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000133 | 728.205 | 4.395 | n/a | 0.000 | 0.000 | 0.466 | 723.026 | 0.128 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.144 | 4.395 | 0.006 | 0.144 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000011f | 721.456 | 3.534 | n/a | 0.000 | 0.000 | 0.613 | 717.149 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.110 | 3.534 | 0.005 | 0.110 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000125 | 687.650 | 3.098 | n/a | 0.000 | 0.000 | 1.361 | 683.050 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.074 | 3.098 | 0.005 | 0.074 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f81000000000000012e | 670.757 | 5.856 | n/a | 0.000 | 0.000 | 0.513 | 664.122 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.225 | 5.856 | 0.009 | 0.225 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f810000000000000135 | 662.375 | 3.112 | n/a | 0.617 | 0.000 | 0.778 | 657.688 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.123 | 3.729 | 0.006 | 0.123 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000000143 | 606.973 | 5.821 | n/a | 0.728 | 0.000 | 0.839 | 599.377 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.147 | 6.550 | 0.011 | 0.147 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f81000000000000013a | 579.081 | 12.053 | n/a | 0.708 | 0.000 | 0.806 | 565.126 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.330 | 12.761 | 0.022 | 0.330 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f81000000000000013b | 411.381 | 3.656 | n/a | 0.000 | 0.000 | 0.943 | 406.630 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.070 | 3.656 | 0.009 | 0.070 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000011c | 393.747 | 3.343 | n/a | 0.667 | 0.000 | 0.389 | 389.189 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.122 | 4.009 | 0.010 | 0.122 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 399.506 | n/a | n/a | n/a | 2.699 | n/a | 0.000 | 0.000 | 0.746 | 393.297 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.080 | 2.733 | 0.008 | 0.080 |
| p99 | 1006.727 | n/a | n/a | n/a | 11.344 | n/a | 1.254 | 0.000 | 4.679 | 1001.124 | 0.361 | 14.385 | 1.202 | 0.000 | n/a | n/a | 1.176 | 12.598 | 0.621 | 1.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f81000000000000018c | 1006.727 | 3.190 | n/a | 0.000 | 0.000 | 2.747 | 1000.656 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.080 | 3.190 | 0.003 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000155 | 1003.852 | 0.115 | n/a | 0.000 | 0.000 | 1.489 | 1001.058 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.115 | 0.115 | 0.000 | 1.115 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000180 | 1003.325 | 0.146 | n/a | 0.000 | 0.000 | 0.796 | 1001.124 | 0.007 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.176 | 0.146 | 0.000 | 1.176 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f81000000000000016f | 1002.604 | 0.117 | n/a | 0.000 | 0.000 | 0.824 | 1000.515 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.105 | 0.117 | 0.000 | 1.105 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000000166 | 1001.309 | 2.513 | n/a | 0.000 | 0.000 | 0.821 | 997.653 | 0.221 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.513 | 0.003 | 0.064 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000000188 | 987.560 | 2.616 | n/a | 0.000 | 0.000 | 0.564 | 984.100 | 0.127 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.086 | 2.616 | 0.003 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000187 | 977.297 | 2.391 | n/a | 0.000 | 0.000 | 2.294 | 972.499 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.062 | 2.391 | 0.002 | 0.062 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000175 | 975.394 | 2.788 | n/a | 0.000 | 0.000 | 1.192 | 971.303 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.074 | 2.788 | 0.003 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000015c | 823.862 | 3.353 | n/a | 0.000 | 0.000 | 3.120 | 811.834 | 0.032 | 5.395 | 0.051 | 0.000 | n/a | n/a | 0.077 | 3.353 | 0.004 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f81000000000000017b | 810.271 | 3.621 | n/a | 0.000 | 0.000 | 0.718 | 805.803 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.078 | 3.621 | 0.004 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f810000000000000157 | 704.740 | 2.733 | n/a | 0.000 | 0.000 | 0.888 | 700.728 | 0.007 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.105 | 2.733 | 0.004 | 0.105 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000000186 | 679.575 | 2.506 | n/a | 0.000 | 0.000 | 0.585 | 676.353 | 0.016 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.061 | 2.506 | 0.004 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000016e | 638.094 | 2.785 | n/a | 0.000 | 0.000 | 0.472 | 634.714 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.073 | 2.785 | 0.004 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000172 | 604.956 | 2.525 | n/a | 0.000 | 0.000 | 0.692 | 601.256 | 0.361 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.068 | 2.525 | 0.004 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f81000000000000017e | 599.963 | 2.679 | n/a | 0.000 | 0.000 | 0.330 | 596.726 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.181 | 2.679 | 0.004 | 0.181 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000178 | 599.330 | 2.845 | n/a | 0.000 | 0.000 | 0.746 | 595.577 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.116 | 2.845 | 0.005 | 0.116 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f81000000000000018b | 594.721 | 2.431 | n/a | 0.732 | 0.000 | 0.321 | 591.115 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.092 | 3.163 | 0.005 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000150 | 582.921 | 2.149 | n/a | 0.000 | 0.000 | 0.501 | 580.070 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.158 | 2.149 | 0.004 | 0.158 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000167 | 523.980 | 8.195 | n/a | 0.000 | 0.000 | 2.360 | 512.979 | 0.325 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.073 | 8.195 | 0.016 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f810000000000000168 | 469.124 | 2.413 | n/a | 0.000 | 0.000 | 0.596 | 465.994 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.080 | 2.413 | 0.005 | 0.080 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 327.325 | n/a | n/a | n/a | 3.250 | n/a | 0.000 | 0.000 | 0.660 | 321.420 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.078 | 3.250 | 0.012 | 0.078 |
| p99 | 1009.299 | n/a | n/a | n/a | 10.723 | n/a | 1.121 | 0.000 | 3.590 | 1004.842 | 3.785 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.120 | 10.723 | 0.656 | 1.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f8100000000000001c6 | 1009.299 | 3.482 | n/a | 0.000 | 0.000 | 0.763 | 1004.842 | 0.006 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.071 | 3.482 | 0.003 | 0.071 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f8100000000000001a7 | 1003.089 | 0.123 | n/a | 0.000 | 0.000 | 0.596 | 1001.161 | 0.017 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.120 | 0.123 | 0.000 | 1.120 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000001c5 | 998.205 | 3.151 | n/a | 0.000 | 0.000 | 0.795 | 994.057 | 0.005 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.091 | 3.151 | 0.003 | 0.091 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f81000000000000019b | 994.999 | 4.822 | n/a | 0.000 | 0.000 | 2.532 | 983.729 | 3.785 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.077 | 4.822 | 0.005 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000001a9 | 968.641 | 2.357 | n/a | 0.000 | 0.000 | 0.655 | 965.353 | 0.171 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.063 | 2.357 | 0.002 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000001a5 | 947.749 | 3.654 | n/a | 0.000 | 0.000 | 0.762 | 943.221 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.080 | 3.654 | 0.004 | 0.080 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f81000000000000019e | 827.460 | 4.858 | n/a | 0.000 | 0.000 | 0.652 | 821.469 | 0.278 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.129 | 4.858 | 0.006 | 0.129 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f8100000000000001c3 | 821.038 | 2.647 | n/a | 0.000 | 0.000 | 0.613 | 817.656 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.069 | 2.647 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f8100000000000001d6 | 709.703 | 1.806 | n/a | 0.000 | 0.000 | 0.426 | 707.367 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.066 | 1.806 | 0.003 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000001b7 | 673.640 | 2.408 | n/a | 0.000 | 0.000 | 0.694 | 670.412 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.070 | 2.408 | 0.004 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f8100000000000001a1 | 611.030 | 4.518 | n/a | 0.000 | 0.000 | 0.768 | 605.592 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.116 | 4.518 | 0.007 | 0.116 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001bb | 596.411 | 3.544 | n/a | 0.000 | 0.000 | 0.518 | 592.157 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.155 | 3.544 | 0.006 | 0.155 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000001cf | 590.106 | 2.931 | n/a | 0.000 | 0.000 | 0.654 | 586.260 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.210 | 2.931 | 0.005 | 0.210 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f8100000000000001db | 584.670 | 2.099 | n/a | 0.000 | 0.000 | 0.623 | 581.811 | 0.005 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.065 | 2.099 | 0.004 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001c7 | 581.957 | 4.807 | n/a | 0.000 | 0.000 | 0.581 | 576.429 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.100 | 4.807 | 0.008 | 0.100 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001aa | 562.150 | 4.491 | n/a | 0.000 | 0.000 | 1.153 | 556.355 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.083 | 4.491 | 0.008 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000001b1 | 560.901 | 4.915 | n/a | 0.000 | 0.000 | 0.341 | 555.450 | 0.008 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.073 | 4.915 | 0.009 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001d2 | 540.985 | 2.599 | n/a | 0.000 | 0.000 | 0.667 | 537.616 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.599 | 0.005 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f810000000000000199 | 509.072 | 4.646 | n/a | 0.000 | 0.000 | 1.798 | 502.518 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.063 | 4.646 | 0.009 | 0.063 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001c8 | 404.031 | 9.005 | n/a | 1.121 | 0.000 | 0.491 | 393.240 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.132 | 10.125 | 0.025 | 0.132 | gw-r/thread-56/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 313.575 | n/a | n/a | n/a | 3.257 | n/a | 0.000 | 0.000 | 0.631 | 306.838 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.081 | 3.257 | 0.010 | 0.081 |
| p99 | 1003.238 | n/a | n/a | n/a | 9.212 | n/a | 0.000 | 0.000 | 5.152 | 1001.173 | 2.319 | 0.000 | 0.148 | 0.000 | n/a | n/a | 1.151 | 9.212 | 0.271 | 1.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f810000000000000218 | 1003.238 | 0.181 | n/a | 0.000 | 0.000 | 0.656 | 1001.173 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 1.145 | 0.181 | 0.000 | 1.145 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f8100000000000001ff | 1003.029 | 0.205 | n/a | 0.000 | 0.000 | 0.717 | 1000.878 | 0.010 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.151 | 0.205 | 0.000 | 1.151 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f81000000000000021a | 1002.554 | 0.154 | n/a | 0.000 | 0.000 | 0.475 | 1000.743 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.124 | 0.154 | 0.000 | 1.124 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000214 | 1001.450 | 9.212 | n/a | 0.000 | 0.000 | 3.602 | 988.485 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.112 | 9.212 | 0.009 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000001eb | 1000.049 | 2.411 | n/a | 0.000 | 0.000 | 0.627 | 996.911 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.067 | 2.411 | 0.002 | 0.067 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000000213 | 999.970 | 3.341 | n/a | 0.000 | 0.000 | 0.356 | 995.967 | 0.157 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.111 | 3.341 | 0.003 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000217 | 979.294 | 3.257 | n/a | 0.000 | 0.000 | 0.632 | 975.099 | 0.203 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.070 | 3.257 | 0.003 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f810000000000000208 | 956.189 | 3.506 | n/a | 0.000 | 0.000 | 0.596 | 951.961 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.085 | 3.506 | 0.004 | 0.085 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001f8 | 854.307 | 2.349 | n/a | 0.000 | 0.000 | 0.424 | 851.426 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.076 | 2.349 | 0.003 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000201 | 759.682 | 3.706 | n/a | 0.000 | 0.000 | 0.598 | 755.221 | 0.008 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.121 | 3.706 | 0.005 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000204 | 718.075 | 2.846 | n/a | 0.000 | 0.000 | 0.781 | 714.307 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.075 | 2.846 | 0.004 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001f1 | 717.923 | 1.975 | n/a | 0.000 | 0.000 | 1.900 | 713.950 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.063 | 1.975 | 0.003 | 0.063 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001f5 | 717.070 | 2.409 | n/a | 0.000 | 0.000 | 0.540 | 714.003 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.072 | 2.409 | 0.003 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000001de | 706.950 | 5.788 | n/a | 0.000 | 0.000 | 4.856 | 696.145 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.120 | 5.788 | 0.008 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f8100000000000001ea | 689.139 | 2.419 | n/a | 0.000 | 0.000 | 0.631 | 685.971 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.076 | 2.419 | 0.004 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000211 | 529.253 | 3.056 | n/a | 0.000 | 0.000 | 0.562 | 525.432 | 0.108 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.062 | 3.056 | 0.006 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f8100000000000001fa | 505.516 | 2.198 | n/a | 0.000 | 0.000 | 5.152 | 498.056 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.063 | 2.198 | 0.004 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000001ef | 505.097 | 4.267 | n/a | 0.000 | 0.000 | 0.815 | 499.857 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.101 | 4.267 | 0.008 | 0.101 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000001e2 | 463.272 | 3.936 | n/a | 0.000 | 0.000 | 0.531 | 458.667 | 0.010 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.081 | 3.936 | 0.008 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000001dc | 407.308 | 2.844 | n/a | 0.000 | 0.000 | 0.569 | 403.693 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.153 | 2.844 | 0.007 | 0.153 | gw-r/thread-56/journal/page | none observed |

## P3 / L1024 / internal (753 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.537 | n/a | n/a | n/a | 3.525 | n/a | 0.000 | 0.000 | 0.568 | 8.479 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.083 | 3.525 | 0.277 | 0.083 |
| p99 | 166.656 | n/a | n/a | n/a | 13.581 | n/a | 0.959 | 0.000 | 5.394 | 161.980 | 0.795 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.555 | 13.804 | 0.806 | 0.555 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f810000000000000227 | 979.323 | 2.324 | n/a | 0.000 | 0.000 | 0.770 | 976.094 | 0.005 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.071 | 2.324 | 0.002 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000000228 | 804.163 | 2.217 | n/a | 0.000 | 0.000 | 0.334 | 801.423 | 0.042 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.080 | 2.217 | 0.003 | 0.080 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000021c | 800.620 | 1.890 | n/a | 0.000 | 0.000 | 0.718 | 797.682 | 0.192 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.073 | 1.890 | 0.002 | 0.073 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000000224 | 721.776 | 4.880 | n/a | 0.000 | 0.000 | 0.680 | 716.088 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.074 | 4.880 | 0.007 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000021f | 677.426 | 3.122 | n/a | 0.000 | 0.000 | 0.512 | 673.499 | 0.152 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.098 | 3.122 | 0.005 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000000225 | 317.653 | 3.662 | n/a | 0.000 | 0.000 | 0.496 | 313.169 | 0.187 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.087 | 3.662 | 0.012 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000220 | 249.794 | 2.181 | n/a | 0.000 | 0.000 | 0.635 | 246.705 | 0.148 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.078 | 2.181 | 0.009 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f81000000000000021d | 166.656 | 3.595 | n/a | 0.000 | 0.000 | 0.704 | 161.980 | 0.120 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.197 | 3.595 | 0.022 | 0.197 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f8100000000000004ec | 109.071 | 5.914 | n/a | 3.713 | 0.000 | 0.445 | 98.809 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.149 | 9.627 | 0.088 | 0.149 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000000664 | 102.056 | 8.135 | n/a | 0.000 | 0.000 | 0.709 | 93.016 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.143 | 8.135 | 0.080 | 0.143 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f81000000000000046f | 94.955 | 8.009 | n/a | 0.000 | 0.000 | 0.611 | 85.903 | 0.308 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.095 | 8.009 | 0.084 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f8100000000000002f0 | 92.584 | 7.843 | n/a | 0.000 | 0.000 | 6.082 | 78.509 | 0.010 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.087 | 7.843 | 0.085 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f81000000000000030d | 91.082 | 4.044 | n/a | 0.000 | 0.000 | 0.699 | 86.218 | 0.003 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.066 | 4.044 | 0.044 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 3f82dd4186814f81000000000000079a | 87.623 | 2.344 | n/a | 0.000 | 0.000 | 0.475 | 84.703 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.082 | 2.344 | 0.027 | 0.082 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000000754 | 83.926 | 3.152 | n/a | 0.000 | 0.000 | 0.804 | 79.765 | 0.084 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.086 | 3.152 | 0.038 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000004f4 | 82.627 | 4.508 | n/a | 0.000 | 0.000 | 0.647 | 77.198 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.237 | 4.508 | 0.055 | 0.237 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f8100000000000005ec | 78.677 | 5.929 | n/a | 0.000 | 0.000 | 0.511 | 72.058 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.165 | 5.929 | 0.075 | 0.165 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000000633 | 78.108 | 3.465 | n/a | 0.000 | 0.000 | 0.520 | 74.039 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.065 | 3.465 | 0.044 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000000635 | 76.264 | 8.536 | n/a | 0.000 | 0.000 | 0.442 | 67.004 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.266 | 8.536 | 0.112 | 0.266 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f81000000000000081d | 75.509 | 4.422 | n/a | 0.000 | 0.000 | 0.587 | 70.287 | 0.057 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.128 | 4.422 | 0.059 | 0.128 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / internal (2243 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.021 | n/a | n/a | n/a | 4.211 | n/a | 0.000 | 0.000 | 0.530 | 7.586 | 0.005 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.100 | 4.251 | 0.331 | 0.100 |
| p99 | 342.364 | n/a | n/a | n/a | 18.539 | n/a | 1.607 | 0.000 | 4.590 | 339.208 | 0.597 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.385 | 19.473 | 0.849 | 1.385 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f82dd4186814f810000000000001a63 | 1004.356 | 2.444 | n/a | 0.000 | 0.000 | 0.520 | 1001.263 | 0.009 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.086 | 2.444 | 0.002 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001a85 | 1003.422 | 2.513 | n/a | 0.000 | 0.000 | 0.365 | 1000.465 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.055 | 2.513 | 0.003 | 0.055 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000001aae | 1002.432 | 0.098 | n/a | 0.000 | 0.000 | 0.515 | 1000.680 | 0.003 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.096 | 0.098 | 0.000 | 1.096 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000001aaa | 999.991 | 2.646 | n/a | 0.000 | 0.000 | 0.447 | 996.801 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.068 | 2.646 | 0.003 | 0.068 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001a6c | 996.925 | 2.948 | n/a | 0.000 | 0.000 | 0.334 | 993.468 | 0.077 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.074 | 2.948 | 0.003 | 0.074 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001aa6 | 993.576 | 2.922 | n/a | 0.000 | 0.000 | 0.432 | 990.063 | 0.070 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.060 | 2.922 | 0.003 | 0.060 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000001a62 | 987.038 | 2.637 | n/a | 0.000 | 0.000 | 0.323 | 983.988 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.637 | 0.003 | 0.062 | gw-r/thread-54/journal/page | none observed |
| 3f82dd4186814f810000000000001a76 | 919.331 | 5.340 | n/a | 0.000 | 0.000 | 0.501 | 913.315 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.144 | 5.340 | 0.006 | 0.144 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001a67 | 893.731 | 5.119 | n/a | 0.000 | 0.000 | 0.609 | 887.864 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.119 | 5.119 | 0.006 | 0.119 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001a87 | 846.089 | 3.200 | n/a | 0.000 | 0.000 | 0.600 | 842.203 | 0.003 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.058 | 3.200 | 0.004 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000001a64 | 820.873 | 10.484 | n/a | 0.000 | 0.000 | 0.412 | 808.726 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.222 | 10.484 | 0.013 | 1.222 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000001aa7 | 717.651 | 2.632 | n/a | 0.000 | 0.000 | 0.709 | 714.203 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.075 | 2.632 | 0.004 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 3f82dd4186814f810000000000001a81 | 709.909 | 4.857 | n/a | 0.000 | 0.000 | 0.641 | 704.222 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.157 | 4.857 | 0.007 | 0.157 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000001a7c | 668.124 | 2.661 | n/a | 0.000 | 0.000 | 0.417 | 664.935 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.064 | 2.661 | 0.004 | 0.064 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000001a9f | 569.721 | 2.944 | n/a | 0.000 | 0.000 | 0.422 | 566.260 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.065 | 2.944 | 0.005 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001a6d | 553.363 | 1.781 | n/a | 0.000 | 0.000 | 0.263 | 551.221 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.057 | 1.781 | 0.003 | 0.057 | gw-r/thread-53/journal/page | none observed |
| 3f82dd4186814f810000000000001aa1 | 541.274 | 1.995 | n/a | 0.000 | 0.000 | 0.527 | 538.666 | 0.003 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.061 | 1.995 | 0.004 | 0.061 | gw-r/thread-56/journal/page | none observed |
| 3f82dd4186814f810000000000001a89 | 515.063 | 8.493 | n/a | 0.000 | 0.000 | 0.439 | 505.865 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.236 | 8.493 | 0.016 | 0.236 | gw-r/thread-55/journal/page | none observed |
| 3f82dd4186814f810000000000001a95 | 493.235 | 5.042 | n/a | 0.000 | 0.000 | 0.560 | 487.443 | 0.079 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.083 | 5.042 | 0.010 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 3f82dd4186814f810000000000001aa3 | 463.239 | 2.616 | n/a | 0.000 | 0.000 | 1.457 | 458.913 | 0.125 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.068 | 2.616 | 0.006 | 0.068 | gw-r/thread-54/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.873 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.802 | 200.865 | 0.013 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.086 | 0.043 | 0.000 | 0.086 |
| p99 | 205.546 | n/a | n/a | n/a | 0.190 | n/a | 0.000 | 0.000 | 2.811 | 202.776 | 2.191 | 0.000 | 3.458 | 0.000 | n/a | n/a | 0.344 | 0.190 | 0.001 | 0.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba420000000000000009 | 205.546 | 0.070 | n/a | 0.000 | 0.000 | 2.811 | 202.084 | 0.014 | 0.000 | 0.223 | 0.000 | n/a | n/a | 0.344 | 0.070 | 0.000 | 0.344 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000059 | 203.955 | 0.101 | n/a | 0.000 | 0.000 | 1.660 | 201.870 | 0.014 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.222 | 0.101 | 0.000 | 0.222 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000000e | 203.793 | 0.034 | n/a | 0.000 | 0.000 | 0.735 | 202.776 | 0.014 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000008 | 203.786 | 0.042 | n/a | 0.000 | 0.000 | 1.419 | 201.946 | 0.050 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.124 | 0.042 | 0.000 | 0.124 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000014 | 203.571 | 0.034 | n/a | 0.000 | 0.000 | 1.669 | 201.586 | 0.019 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.084 | 0.034 | 0.000 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000013 | 203.496 | 0.049 | n/a | 0.000 | 0.000 | 1.287 | 201.760 | 0.049 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.122 | 0.049 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000058 | 203.042 | 0.074 | n/a | 0.000 | 0.000 | 0.382 | 202.036 | 0.044 | 0.000 | 0.314 | 0.000 | n/a | n/a | 0.192 | 0.074 | 0.000 | 0.192 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba42000000000000002a | 203.006 | 0.062 | n/a | 0.000 | 0.000 | 0.744 | 201.985 | 0.013 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.089 | 0.062 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000012 | 202.979 | 0.037 | n/a | 0.000 | 0.000 | 1.084 | 201.527 | 0.012 | 0.000 | 0.242 | 0.000 | n/a | n/a | 0.077 | 0.037 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000036 | 202.929 | 0.050 | n/a | 0.000 | 0.000 | 1.098 | 201.424 | 0.039 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.129 | 0.050 | 0.000 | 0.129 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000004d | 202.622 | 0.031 | n/a | 0.000 | 0.000 | 0.739 | 201.602 | 0.037 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba42000000000000004a | 202.575 | 0.037 | n/a | 0.000 | 0.000 | 0.551 | 201.552 | 0.116 | 0.000 | 0.240 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000040 | 202.545 | 0.046 | n/a | 0.000 | 0.000 | 0.993 | 201.220 | 0.031 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.113 | 0.046 | 0.000 | 0.113 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000019 | 202.525 | 0.056 | n/a | 0.000 | 0.000 | 1.203 | 200.937 | 0.018 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.138 | 0.056 | 0.000 | 0.138 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000026 | 202.493 | 0.046 | n/a | 0.000 | 0.000 | 0.835 | 201.359 | 0.018 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.091 | 0.046 | 0.000 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba42000000000000000f | 202.344 | 0.052 | n/a | 0.000 | 0.000 | 0.952 | 201.053 | 0.022 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.114 | 0.052 | 0.000 | 0.114 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000034 | 202.294 | 0.051 | n/a | 0.000 | 0.000 | 0.989 | 200.977 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.146 | 0.051 | 0.000 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000000b | 202.291 | 0.037 | n/a | 0.000 | 0.000 | 0.657 | 198.044 | 0.012 | 0.000 | 3.458 | 0.000 | n/a | n/a | 0.082 | 0.037 | 0.000 | 0.082 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000015 | 202.282 | 0.040 | n/a | 0.000 | 0.000 | 0.867 | 201.089 | 0.025 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000001b | 202.208 | 0.054 | n/a | 0.000 | 0.000 | 0.910 | 200.942 | 0.013 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.156 | 0.054 | 0.000 | 0.156 | gw-r/thread-56/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.844 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.797 | 200.846 | 0.013 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.087 | 0.043 | 0.000 | 0.087 |
| p99 | 212.485 | n/a | n/a | n/a | 0.102 | n/a | 0.000 | 0.000 | 3.959 | 210.268 | 15.548 | 0.000 | 0.609 | 0.000 | n/a | n/a | 0.275 | 0.102 | 0.001 | 0.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba420000000000000078 | 212.485 | 0.040 | n/a | 0.000 | 0.000 | 1.985 | 210.268 | 0.016 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000061 | 207.441 | 0.055 | n/a | 0.000 | 0.000 | 1.052 | 205.936 | 0.096 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.146 | 0.055 | 0.000 | 0.146 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba4200000000000000b6 | 204.950 | 0.034 | n/a | 0.000 | 0.000 | 3.959 | 200.781 | 0.009 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000080 | 204.850 | 0.046 | n/a | 0.000 | 0.000 | 0.841 | 203.746 | 0.013 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.119 | 0.046 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000068 | 203.562 | 0.033 | n/a | 0.000 | 0.000 | 2.149 | 200.950 | 0.026 | 0.000 | 0.326 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000076 | 203.311 | 0.041 | n/a | 0.000 | 0.000 | 0.961 | 201.969 | 0.097 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.105 | 0.041 | 0.000 | 0.105 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000097 | 203.227 | 0.059 | n/a | 0.000 | 0.000 | 1.542 | 201.307 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.176 | 0.059 | 0.000 | 0.176 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000087 | 203.169 | 0.102 | n/a | 0.000 | 0.000 | 1.684 | 201.109 | 0.012 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.149 | 0.102 | 0.000 | 0.149 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000086 | 203.040 | 0.034 | n/a | 0.000 | 0.000 | 1.357 | 201.414 | 0.013 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.081 | 0.034 | 0.000 | 0.081 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000082 | 202.861 | 0.098 | n/a | 0.000 | 0.000 | 1.585 | 200.851 | 0.011 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.180 | 0.098 | 0.000 | 0.180 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000007c | 202.841 | 0.041 | n/a | 0.000 | 0.000 | 0.923 | 201.444 | 0.024 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.275 | 0.041 | 0.000 | 0.275 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000075 | 202.691 | 0.044 | n/a | 0.000 | 0.000 | 0.807 | 201.566 | 0.019 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.136 | 0.044 | 0.000 | 0.136 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000062 | 202.674 | 0.039 | n/a | 0.000 | 0.000 | 1.008 | 201.384 | 0.017 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.088 | 0.039 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000079 | 202.656 | 0.033 | n/a | 0.000 | 0.000 | 0.590 | 201.316 | 0.023 | 0.000 | 0.609 | 0.000 | n/a | n/a | 0.084 | 0.033 | 0.000 | 0.084 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba42000000000000005e | 202.514 | 0.036 | n/a | 0.000 | 0.000 | 0.951 | 201.299 | 0.014 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.118 | 0.036 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000072 | 202.508 | 0.045 | n/a | 0.000 | 0.000 | 1.063 | 201.112 | 0.013 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.091 | 0.045 | 0.000 | 0.091 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000081 | 202.473 | 0.049 | n/a | 0.000 | 0.000 | 1.254 | 200.924 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.139 | 0.049 | 0.000 | 0.139 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba4200000000000000c0 | 202.436 | 0.050 | n/a | 0.000 | 0.000 | 1.015 | 201.114 | 0.010 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.135 | 0.050 | 0.000 | 0.135 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba42000000000000006d | 202.359 | 0.044 | n/a | 0.000 | 0.000 | 1.182 | 200.893 | 0.012 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.138 | 0.044 | 0.000 | 0.138 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba4200000000000000b8 | 202.323 | 0.031 | n/a | 0.000 | 0.000 | 1.192 | 200.912 | 0.008 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.089 | 0.031 | 0.000 | 0.089 | gw-r/thread-55/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.845 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.721 | 200.807 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.085 | 0.042 | 0.000 | 0.085 |
| p99 | 222.085 | n/a | n/a | n/a | 0.107 | n/a | 0.000 | 0.000 | 20.882 | 203.111 | 4.810 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.165 | 0.107 | 0.001 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba4200000000000000e0 | 222.085 | 0.037 | n/a | 0.000 | 0.000 | 20.882 | 200.994 | 0.015 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.086 | 0.037 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba4200000000000000d5 | 203.948 | 0.035 | n/a | 0.000 | 0.000 | 0.659 | 203.111 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba4200000000000000db | 203.873 | 0.053 | n/a | 0.000 | 0.000 | 1.909 | 201.686 | 0.007 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.098 | 0.053 | 0.000 | 0.098 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba4200000000000000ff | 203.065 | 0.043 | n/a | 0.000 | 0.000 | 0.886 | 201.966 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.043 | 0.000 | 0.107 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba4200000000000000e8 | 202.992 | 0.044 | n/a | 0.000 | 0.000 | 1.639 | 201.139 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.087 | 0.044 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000116 | 202.896 | 0.042 | n/a | 0.000 | 0.000 | 1.492 | 201.106 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.165 | 0.042 | 0.000 | 0.165 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba4200000000000000c3 | 202.782 | 0.032 | n/a | 0.000 | 0.000 | 0.848 | 201.735 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.078 | 0.032 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba4200000000000000e4 | 202.728 | 0.055 | n/a | 0.000 | 0.000 | 1.626 | 200.842 | 0.006 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.118 | 0.055 | 0.000 | 0.118 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba4200000000000000fd | 202.655 | 0.060 | n/a | 0.000 | 0.000 | 1.076 | 201.212 | 0.011 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.140 | 0.060 | 0.000 | 0.140 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba4200000000000000e9 | 202.587 | 0.031 | n/a | 0.000 | 0.000 | 0.663 | 201.707 | 0.019 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000129 | 202.536 | 0.067 | n/a | 0.000 | 0.000 | 0.985 | 201.267 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.114 | 0.067 | 0.000 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba4200000000000000fe | 202.531 | 0.047 | n/a | 0.000 | 0.000 | 1.083 | 201.202 | 0.009 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.104 | 0.047 | 0.000 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000011c | 202.498 | 0.042 | n/a | 0.000 | 0.000 | 0.721 | 201.545 | 0.009 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.077 | 0.042 | 0.000 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000115 | 202.458 | 0.052 | n/a | 0.000 | 0.000 | 0.856 | 201.283 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.157 | 0.052 | 0.000 | 0.157 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000128 | 202.448 | 0.034 | n/a | 0.000 | 0.000 | 0.940 | 201.306 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.066 | 0.034 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba4200000000000000ca | 202.446 | 0.042 | n/a | 0.000 | 0.000 | 1.192 | 201.013 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.109 | 0.042 | 0.000 | 0.109 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba4200000000000000e1 | 202.431 | 0.032 | n/a | 0.000 | 0.000 | 0.807 | 201.374 | 0.025 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.086 | 0.032 | 0.000 | 0.086 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba4200000000000000ed | 202.349 | 0.059 | n/a | 0.000 | 0.000 | 0.985 | 201.150 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.081 | 0.059 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000114 | 202.258 | 0.033 | n/a | 0.000 | 0.000 | 0.597 | 201.493 | 0.006 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba4200000000000000da | 202.242 | 0.031 | n/a | 0.000 | 0.000 | 1.018 | 201.027 | 0.014 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.680 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.661 | 200.785 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.079 | 0.043 | 0.000 | 0.079 |
| p99 | 205.667 | n/a | n/a | n/a | 0.180 | n/a | 0.000 | 0.000 | 2.742 | 204.563 | 3.823 | 14.385 | 0.254 | 0.000 | n/a | n/a | 0.301 | 0.180 | 0.002 | 0.301 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba42000000000000012e | 205.667 | 0.045 | n/a | 0.000 | 0.000 | 0.859 | 204.563 | 0.011 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.111 | 0.045 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000139 | 204.395 | 0.180 | n/a | 0.000 | 0.000 | 2.134 | 201.521 | 0.006 | 0.000 | 0.254 | 0.000 | n/a | n/a | 0.301 | 0.180 | 0.001 | 0.301 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000141 | 203.555 | 0.062 | n/a | 0.000 | 0.000 | 0.779 | 202.292 | 0.269 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.093 | 0.062 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000191 | 203.250 | 0.036 | n/a | 0.000 | 0.000 | 1.872 | 201.167 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.101 | 0.036 | 0.000 | 0.101 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba42000000000000014f | 202.871 | 0.062 | n/a | 0.000 | 0.000 | 0.827 | 201.703 | 0.024 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.159 | 0.062 | 0.000 | 0.159 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000013e | 202.670 | 0.047 | n/a | 0.000 | 0.000 | 1.222 | 201.177 | 0.005 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.147 | 0.047 | 0.000 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000158 | 202.562 | 0.061 | n/a | 0.000 | 0.000 | 1.101 | 201.158 | 0.006 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.164 | 0.061 | 0.000 | 0.164 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba42000000000000013d | 202.438 | 0.040 | n/a | 0.000 | 0.000 | 0.876 | 201.347 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.082 | 0.040 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000133 | 202.379 | 0.030 | n/a | 0.000 | 0.000 | 0.803 | 201.365 | 0.019 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000144 | 202.359 | 0.047 | n/a | 0.000 | 0.000 | 0.878 | 201.249 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.117 | 0.047 | 0.000 | 0.117 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000013f | 202.320 | 0.087 | n/a | 0.000 | 0.000 | 0.956 | 201.023 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.188 | 0.087 | 0.000 | 0.188 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000018a | 202.252 | 0.045 | n/a | 0.000 | 0.000 | 0.837 | 201.210 | 0.009 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000183 | 202.228 | 0.112 | n/a | 0.000 | 0.000 | 1.144 | 200.785 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.129 | 0.112 | 0.001 | 0.129 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba42000000000000015e | 202.211 | 0.053 | n/a | 0.000 | 0.000 | 0.889 | 201.066 | 0.009 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.121 | 0.053 | 0.000 | 0.121 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000185 | 202.209 | 0.034 | n/a | 0.000 | 0.000 | 0.714 | 201.252 | 0.006 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000136 | 202.198 | 0.043 | n/a | 0.000 | 0.000 | 0.826 | 201.115 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.120 | 0.043 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000145 | 202.169 | 0.043 | n/a | 0.000 | 0.000 | 0.831 | 195.682 | 0.007 | 5.395 | 0.122 | 0.000 | n/a | n/a | 0.089 | 0.043 | 0.000 | 0.089 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000157 | 202.158 | 0.034 | n/a | 0.000 | 0.000 | 0.636 | 201.341 | 0.008 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000016e | 202.140 | 0.042 | n/a | 0.000 | 0.000 | 0.760 | 201.146 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.113 | 0.042 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000155 | 202.118 | 0.030 | n/a | 0.000 | 0.000 | 0.601 | 201.307 | 0.036 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.437 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.608 | 200.706 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.075 | 0.043 | 0.000 | 0.075 |
| p99 | 203.132 | n/a | n/a | n/a | 0.137 | n/a | 0.000 | 0.000 | 1.171 | 202.314 | 2.908 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.162 | 0.137 | 0.001 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba4200000000000001a0 | 204.603 | 0.047 | n/a | 0.000 | 0.000 | 0.702 | 203.671 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.111 | 0.047 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000193 | 203.132 | 0.052 | n/a | 0.000 | 0.000 | 1.302 | 201.565 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.139 | 0.052 | 0.000 | 0.139 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba42000000000000019d | 203.070 | 0.049 | n/a | 0.000 | 0.000 | 0.583 | 202.314 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.081 | 0.049 | 0.000 | 0.081 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000198 | 202.544 | 0.056 | n/a | 0.000 | 0.000 | 0.970 | 201.304 | 0.024 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.125 | 0.056 | 0.000 | 0.125 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba4200000000000001d2 | 202.459 | 0.036 | n/a | 0.000 | 0.000 | 0.623 | 201.605 | 0.010 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba4200000000000001c3 | 202.412 | 0.037 | n/a | 0.000 | 0.000 | 0.720 | 201.474 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.081 | 0.037 | 0.000 | 0.081 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba4200000000000001ae | 202.341 | 0.046 | n/a | 0.000 | 0.000 | 1.132 | 200.973 | 0.005 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.104 | 0.046 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba4200000000000001e3 | 202.297 | 0.041 | n/a | 0.000 | 0.000 | 1.125 | 200.902 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.173 | 0.041 | 0.000 | 0.173 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000200 | 202.256 | 0.044 | n/a | 0.000 | 0.000 | 1.031 | 200.977 | 0.009 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.101 | 0.044 | 0.000 | 0.101 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba4200000000000001aa | 202.207 | 0.094 | n/a | 0.000 | 0.000 | 1.171 | 200.748 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.090 | 0.094 | 0.000 | 0.090 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000201 | 202.135 | 0.035 | n/a | 0.000 | 0.000 | 0.668 | 201.242 | 0.009 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.069 | 0.035 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba4200000000000001a1 | 202.081 | 0.039 | n/a | 0.000 | 0.000 | 0.695 | 201.158 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.088 | 0.039 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba4200000000000001ab | 202.043 | 0.073 | n/a | 0.000 | 0.000 | 0.924 | 200.896 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.092 | 0.073 | 0.000 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba4200000000000001c0 | 202.015 | 0.044 | n/a | 0.000 | 0.000 | 0.813 | 200.891 | 0.005 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.108 | 0.044 | 0.000 | 0.108 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba4200000000000001d3 | 202.015 | 0.045 | n/a | 0.000 | 0.000 | 0.887 | 200.906 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.124 | 0.045 | 0.000 | 0.124 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba4200000000000001d0 | 202.011 | 0.041 | n/a | 0.000 | 0.000 | 0.757 | 201.032 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.108 | 0.041 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba4200000000000001d9 | 201.984 | 0.038 | n/a | 0.000 | 0.000 | 0.620 | 201.165 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.082 | 0.038 | 0.000 | 0.082 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba4200000000000001f3 | 201.975 | 0.038 | n/a | 0.000 | 0.000 | 0.510 | 201.254 | 0.010 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.068 | 0.038 | 0.000 | 0.068 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba4200000000000001fb | 201.932 | 0.032 | n/a | 0.000 | 0.000 | 0.625 | 201.126 | 0.005 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.069 | 0.032 | 0.000 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba4200000000000001a9 | 201.886 | 0.044 | n/a | 0.000 | 0.000 | 0.714 | 200.952 | 0.005 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.102 | 0.044 | 0.000 | 0.102 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.544 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.653 | 200.745 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.078 | 0.044 | 0.000 | 0.078 |
| p99 | 203.241 | n/a | n/a | n/a | 0.108 | n/a | 0.000 | 0.000 | 1.217 | 201.992 | 0.929 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.181 | 0.108 | 0.001 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba420000000000000215 | 204.990 | 0.032 | n/a | 0.000 | 0.000 | 1.095 | 203.715 | 0.021 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000240 | 203.241 | 0.073 | n/a | 0.000 | 0.000 | 0.685 | 201.992 | 0.018 | 0.000 | 0.312 | 0.000 | n/a | n/a | 0.162 | 0.073 | 0.000 | 0.162 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000261 | 203.136 | 0.056 | n/a | 0.000 | 0.000 | 1.304 | 201.562 | 0.007 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.103 | 0.056 | 0.000 | 0.103 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000249 | 202.628 | 0.054 | n/a | 0.000 | 0.000 | 0.948 | 201.395 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.144 | 0.054 | 0.000 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000242 | 202.369 | 0.033 | n/a | 0.000 | 0.000 | 0.676 | 201.499 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.079 | 0.033 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000020b | 202.357 | 0.050 | n/a | 0.000 | 0.000 | 1.136 | 201.009 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.114 | 0.050 | 0.000 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000260 | 202.306 | 0.048 | n/a | 0.000 | 0.000 | 0.711 | 201.305 | 0.016 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.156 | 0.048 | 0.000 | 0.156 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000241 | 202.302 | 0.054 | n/a | 0.000 | 0.000 | 1.091 | 200.969 | 0.006 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.127 | 0.054 | 0.000 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000264 | 202.294 | 0.033 | n/a | 0.000 | 0.000 | 0.829 | 201.287 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.062 | 0.033 | 0.000 | 0.062 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba42000000000000022b | 202.289 | 0.045 | n/a | 0.000 | 0.000 | 0.815 | 201.144 | 0.008 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.104 | 0.045 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000276 | 202.279 | 0.108 | n/a | 0.000 | 0.000 | 1.217 | 200.789 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.106 | 0.108 | 0.001 | 0.106 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000272 | 202.270 | 0.045 | n/a | 0.000 | 0.000 | 0.944 | 201.119 | 0.006 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.076 | 0.045 | 0.000 | 0.076 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000245 | 202.230 | 0.035 | n/a | 0.000 | 0.000 | 1.185 | 200.895 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000247 | 202.175 | 0.044 | n/a | 0.000 | 0.000 | 0.861 | 201.096 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.106 | 0.044 | 0.000 | 0.106 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba42000000000000020d | 202.135 | 0.034 | n/a | 0.000 | 0.000 | 0.657 | 201.268 | 0.019 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000207 | 202.107 | 0.041 | n/a | 0.000 | 0.000 | 0.870 | 201.017 | 0.008 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.084 | 0.041 | 0.000 | 0.084 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba42000000000000021f | 202.107 | 0.052 | n/a | 0.000 | 0.000 | 0.838 | 200.992 | 0.008 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.144 | 0.052 | 0.000 | 0.144 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000271 | 202.106 | 0.125 | n/a | 0.000 | 0.000 | 0.647 | 200.997 | 0.017 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.164 | 0.125 | 0.001 | 0.164 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000254 | 202.059 | 0.045 | n/a | 0.000 | 0.000 | 0.908 | 200.950 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.089 | 0.045 | 0.000 | 0.089 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000232 | 202.045 | 0.038 | n/a | 0.000 | 0.000 | 0.653 | 201.203 | 0.008 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-56/journal/page | none observed |

## P3 / L1024 / read (66 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.802 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 0.594 | 70.182 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.069 | 0.050 | 0.001 | 0.069 |
| p99 | 204.535 | n/a | n/a | n/a | 0.113 | n/a | 0.000 | 0.000 | 2.419 | 203.842 | 4.020 | 0.000 | 2.284 | 0.000 | n/a | n/a | 0.115 | 0.113 | 0.007 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba42000000000000028b | 204.535 | 0.035 | n/a | 0.000 | 0.000 | 0.528 | 203.842 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000028c | 202.657 | 0.044 | n/a | 0.000 | 0.000 | 0.777 | 201.528 | 0.019 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.114 | 0.044 | 0.000 | 0.114 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000280 | 202.388 | 0.033 | n/a | 0.000 | 0.000 | 0.899 | 201.315 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000289 | 202.085 | 0.036 | n/a | 0.000 | 0.000 | 0.696 | 201.203 | 0.006 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000287 | 202.070 | 0.033 | n/a | 0.000 | 0.000 | 0.655 | 201.232 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000285 | 201.797 | 0.032 | n/a | 0.000 | 0.000 | 0.810 | 200.830 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba42000000000000027f | 201.771 | 0.034 | n/a | 0.000 | 0.000 | 0.667 | 200.933 | 0.005 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba42000000000000027b | 201.760 | 0.045 | n/a | 0.000 | 0.000 | 0.726 | 200.820 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba42000000000000027a | 201.724 | 0.042 | n/a | 0.000 | 0.000 | 0.597 | 200.942 | 0.006 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.071 | 0.042 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000292 | 201.691 | 0.113 | n/a | 0.000 | 0.000 | 0.711 | 200.727 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.087 | 0.113 | 0.001 | 0.087 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba42000000000000028e | 201.594 | 0.036 | n/a | 0.000 | 0.000 | 0.608 | 200.824 | 0.010 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba420000000000000291 | 201.573 | 0.033 | n/a | 0.000 | 0.000 | 0.536 | 200.863 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba42000000000000027e | 201.549 | 0.032 | n/a | 0.000 | 0.000 | 0.404 | 200.969 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba42000000000000028d | 201.529 | 0.038 | n/a | 0.000 | 0.000 | 0.585 | 200.771 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000290 | 201.463 | 0.032 | n/a | 0.000 | 0.000 | 0.509 | 200.802 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.063 | 0.032 | 0.000 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000279 | 201.413 | 0.036 | n/a | 0.000 | 0.000 | 0.527 | 200.735 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.069 | 0.036 | 0.000 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000286 | 201.344 | 0.031 | n/a | 0.000 | 0.000 | 0.522 | 200.676 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000282 | 201.131 | 0.038 | n/a | 0.000 | 0.000 | 0.404 | 200.569 | 0.010 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.064 | 0.038 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 99380c5b5a81ba42000000000000027d | 161.607 | 0.044 | n/a | 0.000 | 0.000 | 0.618 | 160.846 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.067 | 0.044 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000293 | 137.339 | 0.070 | n/a | 0.000 | 0.000 | 0.778 | 136.330 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.108 | 0.070 | 0.001 | 0.108 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.434 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.488 | 83.331 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.070 | 0.043 | 0.001 | 0.070 |
| p99 | 202.004 | n/a | n/a | n/a | 0.117 | n/a | 0.000 | 0.000 | 2.707 | 201.049 | 2.577 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.183 | 0.117 | 0.002 | 0.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 99380c5b5a81ba420000000000000eda | 203.015 | 0.041 | n/a | 0.000 | 0.000 | 1.956 | 200.774 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.197 | 0.041 | 0.000 | 0.197 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000efb | 202.123 | 0.035 | n/a | 0.000 | 0.000 | 1.066 | 200.859 | 0.010 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.114 | 0.035 | 0.000 | 0.114 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000ecd | 202.004 | 0.040 | n/a | 0.000 | 0.000 | 1.073 | 200.766 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000ed5 | 201.919 | 0.056 | n/a | 0.000 | 0.000 | 0.757 | 200.937 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.056 | 0.000 | 0.107 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000e96 | 201.857 | 0.037 | n/a | 0.000 | 0.000 | 0.705 | 200.954 | 0.004 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.093 | 0.037 | 0.000 | 0.093 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000e8b | 201.852 | 0.029 | n/a | 0.000 | 0.000 | 0.429 | 201.246 | 0.012 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.072 | 0.029 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000eb4 | 201.817 | 0.029 | n/a | 0.000 | 0.000 | 0.843 | 200.828 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000ec5 | 201.811 | 0.032 | n/a | 0.000 | 0.000 | 0.539 | 201.104 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000eef | 201.741 | 0.036 | n/a | 0.000 | 0.000 | 0.822 | 200.726 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.103 | 0.036 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000ea3 | 201.717 | 0.036 | n/a | 0.000 | 0.000 | 0.577 | 200.978 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.062 | 0.036 | 0.000 | 0.062 | gw-r/thread-53/journal/page | none observed |
| 99380c5b5a81ba420000000000000eb6 | 201.714 | 0.040 | n/a | 0.000 | 0.000 | 0.684 | 200.853 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.082 | 0.040 | 0.000 | 0.082 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000ee4 | 201.711 | 0.078 | n/a | 0.000 | 0.000 | 0.773 | 200.635 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.183 | 0.078 | 0.000 | 0.183 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000ee5 | 201.706 | 0.030 | n/a | 0.000 | 0.000 | 0.487 | 201.049 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.073 | 0.030 | 0.000 | 0.073 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000e8c | 201.702 | 0.043 | n/a | 0.000 | 0.000 | 0.746 | 200.765 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.100 | 0.043 | 0.000 | 0.100 | gw-r/thread-55/journal/page | none observed |
| 99380c5b5a81ba420000000000000e99 | 201.701 | 0.044 | n/a | 0.000 | 0.000 | 0.517 | 201.000 | 0.013 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.073 | 0.044 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 99380c5b5a81ba420000000000000eaf | 201.609 | 0.037 | n/a | 0.000 | 0.000 | 0.574 | 200.851 | 0.004 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.097 | 0.037 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000ea6 | 201.599 | 0.041 | n/a | 0.000 | 0.000 | 0.479 | 200.792 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.220 | 0.041 | 0.000 | 0.220 | gw-r/thread-56/journal/page | none observed |
| 99380c5b5a81ba420000000000000ec4 | 201.599 | 0.039 | n/a | 0.000 | 0.000 | 0.663 | 200.751 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.098 | 0.039 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 99380c5b5a81ba420000000000000ea0 | 201.599 | 0.039 | n/a | 0.000 | 0.000 | 0.650 | 200.759 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.103 | 0.039 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 99380c5b5a81ba420000000000000ef0 | 201.564 | 0.065 | n/a | 0.000 | 0.000 | 0.801 | 200.563 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.098 | 0.065 | 0.000 | 0.098 | gw-r/thread-53/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
