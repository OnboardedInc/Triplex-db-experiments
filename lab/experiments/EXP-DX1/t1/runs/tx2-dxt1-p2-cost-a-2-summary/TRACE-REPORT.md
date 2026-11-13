# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/gateway.admitted-work` (55.159 ms, trace `f62327ee106316160000000000001558`); `node-15/thread-0/socket.wait-first-byte` (177.077 ms, trace `f62327ee106316160000000000001be3`); `node-15/thread-0/client.persist-and-resolve` (198.866 ms, trace `f62327ee106316160000000000001be4`); `node-15/thread-0/driver.queue.scheduler-late` (116.541 ms, trace `f62327ee106316160000000000001be8`); `node-15/thread-0/driver.queue.scheduler-late` (162.497 ms, trace `f62327ee106316160000000000001be6`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-cost-a-2-summary`; source `d7c89645926a6a867c856f24dca2d4caba04c075`; subjects 10000; tracing summary.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. Native DEBUG transaction logging and its metrics callback are excluded from the summary default; full retains them.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 14648719.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14362.594 | 755.418 | 72.018 | 311 |
| L1 | 0 | 19966.002 | 466.196 | 28.760 | 462 |
| L4 | 0 | 19843.428 | 416.502 | 13.425 | 426 |
| L16 | 0 | 19980.309 | 393.123 | 18.216 | 474 |
| L64 | 0 | 19970.035 | 557.415 | 13.610 | 596 |
| L256 | 0 | 19964.230 | 450.947 | 20.860 | 486 |
| L1024 | 0 | 19993.595 | 4254.143 | 105.206 | 11846 |
| tail | 0 | 64605.557 | 13465.562 | 557.213 | 36927 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f62327ee106316160000000000001558 | driver.queue.subject | 41.971 | f62327ee106316160000000000001553 | 5 / 32 |
| f62327ee106316160000000000001558 | driver.queue.scheduler-late | 8.769 | none | 5 / 32 |
| f62327ee106316160000000000001558 | driver.queue.scheduler-dispatch | 0.110 | none | 4 / 32 |

Observed active steps while trace f62327ee106316160000000000001558 waited: [{"at":1794544006038.323,"inFlight":5,"capacity":32,"active":[{"traceId":"f62327ee10631616000000000000154e","step":"rpc.probe.transact"},{"traceId":"f62327ee106316160000000000001553","step":"client.http"},{"traceId":"f62327ee106316160000000000001554","step":"client.http"},{"traceId":"f62327ee106316160000000000001556","step":"client.http"},{"traceId":"f62327ee10631616000000000000155a","step":"client.http"}]}]

| f62327ee106316160000000000001be3 | driver.queue.scheduler-late | 38.821 | none | 0 / 32 |
| f62327ee106316160000000000001be3 | driver.queue.scheduler-dispatch | 0.052 | none | 0 / 32 |

Observed active steps while trace f62327ee106316160000000000001be3 waited: []

| f62327ee106316160000000000001be4 | driver.queue.scheduler-late | 2.713 | none | 1 / 32 |
| f62327ee106316160000000000001be4 | driver.queue.scheduler-dispatch | 0.014 | none | 1 / 32 |

Observed active steps while trace f62327ee106316160000000000001be4 waited: []

| f62327ee106316160000000000001be8 | driver.queue.scheduler-late | 116.541 | none | 4 / 32 |
| f62327ee106316160000000000001be8 | driver.queue.subject | 52.825 | f62327ee106316160000000000001be7 | 4 / 32 |
| f62327ee106316160000000000001be8 | driver.queue.scheduler-dispatch | 0.069 | none | 8 / 32 |

Observed active steps while trace f62327ee106316160000000000001be8 waited: [{"at":1794544020638.174,"inFlight":10,"capacity":32,"active":[{"traceId":"f62327ee106316160000000000001be6","step":"client.http"},{"traceId":"f62327ee106316160000000000001be7","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001be9","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001bea","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001beb","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001bf0","step":"client.http"},{"traceId":"f62327ee106316160000000000001bf1","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001bf2","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001bf3","step":"client.persist-and-resolve"},{"traceId":"f62327ee106316160000000000001bf4","step":"client.persist-and-resolve"}]}]

| f62327ee106316160000000000001be6 | driver.queue.scheduler-late | 162.497 | none | 2 / 32 |
| f62327ee106316160000000000001be6 | driver.queue.scheduler-dispatch | 0.079 | none | 2 / 32 |

Observed active steps while trace f62327ee106316160000000000001be6 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.250 | 0.703 | 0.000 | 1.548 | 5.772 | 2.754 | 0.000 | 0.158 | 10.455 | 4.617 | 0.000 | 0.000 | 0.000 | 12.614 | n/a | n/a | 0.057 | 6.632 | 0.212 | 0.057 |
| p99 | 130.052 | 5.301 | 0.966 | 6.974 | 19.342 | n/a | 6.505 | 1.182 | 11.466 | 24.293 | 0.418 | 81.763 | 1.079 | 67.484 | n/a | n/a | 0.351 | 19.948 | 0.501 | 0.351 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000442 | 130.052 | 6.058 | 0.348 | 0.412 | 0.067 | 10.736 | 15.870 | 0.000 | 81.763 | 0.000 | 14.765 | n/a | n/a | 0.033 | 6.885 | 0.053 | 0.033 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee106316160000000000000451 | 93.238 | 12.019 | n/a | 0.000 | 0.665 | 5.625 | 5.852 | 0.418 | 0.000 | 1.079 | 67.484 | n/a | n/a | 0.097 | 12.683 | 0.136 | 0.097 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000044c | 80.340 | 3.850 | 0.242 | 0.302 | 0.088 | 10.654 | 20.551 | 0.000 | 28.217 | 0.000 | 16.372 | n/a | n/a | 0.064 | 4.482 | 0.056 | 0.064 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee106316160000000000000426 | 78.680 | 15.084 | 0.596 | 0.000 | 0.116 | 11.302 | 24.293 | 0.051 | 0.000 | 0.274 | 26.900 | n/a | n/a | 0.065 | 15.796 | 0.201 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000438 | 71.699 | 13.615 | 2.754 | 0.000 | 0.189 | 10.705 | 23.551 | 0.068 | 0.000 | 0.321 | 20.426 | n/a | n/a | 0.069 | 16.559 | 0.231 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000422 | 64.387 | 19.342 | n/a | 0.000 | 0.606 | 5.580 | 10.490 | 0.124 | 0.000 | 0.333 | 27.562 | n/a | n/a | 0.351 | 19.948 | 0.310 | 0.351 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000440 | 59.974 | 5.268 | 0.462 | 0.000 | 0.046 | 10.691 | 1.326 | 0.000 | 0.000 | 0.000 | 42.148 | n/a | n/a | 0.033 | 5.776 | 0.096 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000430 | 57.565 | 8.487 | 0.271 | 0.000 | 0.060 | 11.466 | 14.383 | 0.000 | 0.000 | 0.000 | 22.834 | n/a | n/a | 0.064 | 8.818 | 0.153 | 0.064 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000436 | 46.368 | 4.809 | 0.215 | 0.000 | 0.093 | 10.455 | 18.126 | 0.000 | 0.000 | 0.000 | 12.614 | n/a | n/a | 0.057 | 5.117 | 0.110 | 0.057 | gw-w/thread-47/gateway.admitted-work | none observed |
| f62327ee106316160000000000000454 | 46.200 | 4.740 | 0.265 | 0.453 | 0.063 | 10.571 | 10.711 | 0.000 | 0.000 | 0.000 | 19.350 | n/a | n/a | 0.048 | 5.520 | 0.119 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000449 | 40.092 | 8.622 | n/a | 3.735 | 0.530 | 5.263 | 0.299 | 0.000 | 0.000 | 0.000 | 21.584 | n/a | n/a | 0.059 | 12.887 | 0.321 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000045c | 39.550 | 4.145 | 0.194 | 0.391 | 0.054 | 10.557 | 14.980 | 0.000 | 0.000 | 0.000 | 9.196 | n/a | n/a | 0.034 | 4.784 | 0.121 | 0.034 | gw-w/thread-52/gateway.admitted-work | none observed |
| f62327ee106316160000000000000459 | 38.885 | 5.324 | 0.565 | 0.000 | 0.070 | 10.665 | 11.774 | 0.000 | 0.000 | 0.000 | 10.436 | n/a | n/a | 0.050 | 5.960 | 0.153 | 0.050 | gw-w/thread-50/gateway.admitted-work | driver.publication 1.070ms |
| f62327ee106316160000000000000450 | 37.348 | 5.772 | 0.257 | 0.000 | 0.054 | 10.692 | 4.462 | 0.000 | 0.000 | 0.000 | 16.063 | n/a | n/a | 0.048 | 6.083 | 0.163 | 0.048 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000042a | 36.250 | 5.925 | 0.264 | 0.000 | 0.066 | 10.730 | 7.800 | 0.000 | 0.000 | 0.000 | 11.406 | n/a | n/a | 0.059 | 6.254 | 0.173 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000455 | 34.205 | 7.432 | n/a | 2.894 | 1.148 | 5.277 | 9.290 | 0.064 | 0.000 | 0.982 | 7.028 | n/a | n/a | 0.090 | 11.474 | 0.335 | 0.090 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000439 | 33.390 | 9.570 | n/a | 6.505 | 0.663 | 5.344 | 0.273 | 0.014 | 0.000 | 0.835 | 10.133 | n/a | n/a | 0.054 | 16.738 | 0.501 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000042e | 33.313 | 4.626 | 0.282 | 0.000 | 0.061 | 11.044 | 4.617 | 0.000 | 0.000 | 0.000 | 12.635 | n/a | n/a | 0.049 | 4.969 | 0.149 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000042b | 32.469 | 5.960 | n/a | 0.000 | 0.916 | 5.146 | 0.706 | 0.223 | 0.000 | 0.646 | 18.801 | n/a | n/a | 0.072 | 6.876 | 0.212 | 0.072 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000433 | 30.622 | 6.875 | n/a | 0.000 | 0.158 | 5.224 | 0.705 | 0.000 | 0.000 | 0.000 | 17.599 | n/a | n/a | 0.061 | 7.033 | 0.230 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.690 | n/a | n/a | n/a | 28.019 | 21.781 | 0.936 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 56.433 | 0.992 | 0.021 |
| p99 | 307.572 | n/a | n/a | n/a | 78.644 | 95.143 | 8.419 | 0.000 | 119.835 | 94.080 | 29.850 | 0.000 | 0.000 | 0.000 | n/a | n/a | 187.958 | 134.316 | 1.000 | 187.958 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000001bdf | 307.572 | 33.415 | 85.907 | 0.000 | 0.000 | 0.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 187.958 | 119.322 | 0.388 | 187.958 | node-15/thread-0/socket.wait-first-byte | driver.publication 1.844ms; client.parse 1.806ms; client.parse 1.563ms; client.parse 1.289ms |
| f62327ee106316160000000000001bdc | 282.327 | 78.103 | 35.272 | 2.587 | 0.000 | 102.316 | 34.185 | 29.850 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 115.962 | 0.411 | 0.013 | node-15/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.926ms; client.parse 1.563ms; client.parse 1.289ms; driver.publication 1.043ms; driver.publication 1.029ms |
| f62327ee106316160000000000001bde | 171.641 | 47.970 | 32.471 | 3.020 | 0.000 | 0.500 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 87.681 | 83.460 | 0.486 | 87.681 | node-15/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.926ms; client.parse 1.289ms; driver.publication 1.029ms |
| f62327ee10631616000000000000121f | 166.106 | 18.324 | 3.411 | 0.000 | 0.000 | 119.835 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 24.536 | 21.736 | 0.131 | 24.536 | node-15/thread-0/socket.queue-and-write | driver.publication 2.030ms; driver.publication 1.849ms; driver.publication 1.441ms; driver.publication 1.296ms; client.parse 1.233ms |
| f62327ee106316160000000000001f2c | 163.511 | 78.644 | 52.018 | 3.654 | 0.000 | 0.584 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 28.611 | 134.316 | 0.821 | 28.611 | node-15/thread-0/rpc.replica.observe | driver.publication 1.255ms; driver.publication 1.172ms |
| f62327ee1063161600000000000014a3 | 156.547 | 24.923 | 18.061 | 2.439 | 0.000 | 0.310 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 110.813 | 45.423 | 0.290 | 110.813 | node-15/thread-0/socket.wait-first-byte | client.parse 1.792ms; driver.publication 1.441ms; driver.publication 1.417ms; driver.publication 1.373ms |
| f62327ee106316160000000000001216 | 139.672 | 24.074 | 20.147 | 4.286 | 0.000 | 0.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 90.727 | 48.508 | 0.347 | 90.727 | node-15/thread-0/socket.wait-first-byte | driver.publication 2.638ms; driver.publication 2.030ms; driver.publication 1.324ms; client.parse 1.233ms |
| f62327ee106316160000000000001219 | 137.385 | 18.516 | 3.370 | 2.525 | 0.000 | 1.232 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 111.742 | 24.411 | 0.178 | 111.742 | node-15/thread-0/socket.wait-first-byte | driver.publication 2.030ms; driver.publication 1.324ms; client.parse 1.233ms; client.parse 1.044ms |
| f62327ee106316160000000000000423 | 127.424 | 19.110 | 8.916 | 0.000 | 0.000 | 5.257 | 94.080 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.060 | 28.026 | 0.220 | 0.060 | gw-w/thread-47/gateway.admitted-work | none observed |
| f62327ee106316160000000000001057 | 121.129 | 60.154 | 31.729 | 1.405 | 0.000 | 0.337 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.504 | 93.288 | 0.770 | 27.504 | node-15/thread-2/replica.pull-at | driver.publication 2.367ms; driver.publication 1.336ms; driver.publication 1.324ms; driver.publication 1.186ms |
| f62327ee106316160000000000001217 | 115.421 | 13.373 | 15.692 | 0.000 | 0.000 | 0.234 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 86.123 | 29.065 | 0.252 | 86.123 | node-15/thread-0/socket.wait-first-byte | driver.publication 2.638ms; driver.publication 2.030ms; driver.publication 1.324ms; client.parse 1.233ms |
| f62327ee1063161600000000000014a1 | 114.082 | 45.053 | 37.712 | 2.783 | 0.000 | 5.848 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 22.686 | 85.548 | 0.750 | 22.686 | node-15/thread-0/rpc.replica.observe | driver.publication 1.441ms; driver.publication 1.417ms; driver.publication 1.373ms; driver.publication 1.283ms; driver.publication 1.127ms |
| f62327ee10631616000000000000164e | 112.447 | 26.945 | 8.111 | 0.000 | 0.000 | 0.211 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 77.180 | 35.055 | 0.312 | 77.180 | node-15/thread-0/socket.wait-first-byte | driver.publication 3.425ms; driver.publication 2.224ms; driver.publication 1.020ms; client.parse 1.018ms |
| f62327ee10631616000000000000105a | 106.651 | 37.768 | 67.563 | 1.309 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 106.639 | 1.000 | 0.012 | node-15/thread-0/rpc.replica.observe | driver.publication 2.367ms; driver.publication 1.336ms; driver.publication 1.186ms; client.parse 1.067ms |
| f62327ee1063161600000000000014a8 | 105.261 | 14.366 | 2.862 | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 87.762 | 17.228 | 0.164 | 87.762 | node-15/thread-0/socket.wait-first-byte | client.parse 1.792ms; driver.publication 1.441ms; driver.publication 1.417ms |
| f62327ee1063161600000000000018ba | 103.160 | 42.570 | 38.274 | 1.654 | 0.000 | 0.319 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 20.343 | 82.498 | 0.800 | 20.343 | node-15/thread-0/rpc.replica.observe | client.parse 1.085ms |
| f62327ee106316160000000000001218 | 100.969 | 44.054 | 29.165 | 0.000 | 0.000 | 0.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.386 | 73.219 | 0.725 | 27.386 | node-15/thread-0/client.reach | driver.publication 2.638ms; driver.publication 1.324ms |
| f62327ee106316160000000000001f35 | 100.189 | 5.033 | 95.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 100.176 | 1.000 | 0.013 | node-15/thread-0/rpc.replica.observe | client.parse 4.065ms; driver.publication 1.281ms |
| f62327ee10631616000000000000164b | 98.303 | 38.583 | 19.155 | 2.479 | 0.000 | 0.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 37.676 | 60.217 | 0.613 | 37.676 | node-15/thread-0/socket.wait-first-byte | driver.publication 2.224ms; driver.publication 1.183ms; driver.publication 1.020ms |
| f62327ee106316160000000000001f1e | 97.844 | 41.212 | 49.567 | 7.050 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 97.830 | 1.000 | 0.014 | node-15/thread-0/rpc.replica.observe | client.encode 3.654ms; driver.publication 3.087ms; driver.publication 2.191ms; driver.publication 2.010ms; driver.expected-state.bind-receipt 1.682ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.995 | 1.166 | 0.000 | 2.261 | 5.450 | n/a | 0.000 | 0.916 | 5.289 | 0.351 | 0.000 | 0.000 | 0.000 | 7.645 | n/a | n/a | 0.072 | 6.632 | 0.302 | 0.072 |
| p99 | 93.238 | 4.493 | 0.367 | 6.974 | 12.019 | n/a | 2.894 | 1.182 | 5.877 | 9.290 | 0.418 | 0.000 | 1.079 | 67.484 | n/a | n/a | 0.105 | 12.683 | 0.443 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000451 | 93.238 | 12.019 | n/a | 0.000 | 0.665 | 5.625 | 5.852 | 0.418 | 0.000 | 1.079 | 67.484 | n/a | n/a | 0.097 | 12.683 | 0.136 | 0.097 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000455 | 34.205 | 7.432 | n/a | 2.894 | 1.148 | 5.277 | 9.290 | 0.064 | 0.000 | 0.982 | 7.028 | n/a | n/a | 0.090 | 11.474 | 0.335 | 0.090 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000042b | 32.469 | 5.960 | n/a | 0.000 | 0.916 | 5.146 | 0.706 | 0.223 | 0.000 | 0.646 | 18.801 | n/a | n/a | 0.072 | 6.876 | 0.212 | 0.072 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000445 | 22.468 | 5.753 | n/a | 0.000 | 0.241 | 5.365 | 0.351 | 0.000 | 0.000 | 0.000 | 10.705 | n/a | n/a | 0.052 | 5.995 | 0.267 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000427 | 21.995 | 5.450 | n/a | 0.000 | 1.182 | 5.391 | 0.335 | 0.034 | 0.000 | 0.860 | 8.667 | n/a | n/a | 0.075 | 6.632 | 0.302 | 0.075 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000443 | 20.364 | 5.436 | n/a | 2.459 | 1.121 | 5.289 | 0.295 | 0.000 | 0.000 | 0.000 | 5.712 | n/a | n/a | 0.052 | 9.016 | 0.443 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000458 | 17.550 | 3.341 | n/a | 0.000 | 0.833 | 5.194 | 0.497 | 0.000 | 0.000 | 0.000 | 7.645 | n/a | n/a | 0.040 | 4.175 | 0.238 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000044d | 12.851 | 3.493 | n/a | 0.000 | 0.938 | 5.877 | 0.255 | 0.000 | 0.000 | 0.000 | 2.251 | n/a | n/a | 0.038 | 4.431 | 0.345 | 0.038 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000431 | 10.995 | 3.331 | n/a | 0.000 | 0.464 | 5.239 | 0.242 | 0.000 | 0.000 | 0.000 | 1.615 | n/a | n/a | 0.105 | 3.794 | 0.345 | 0.105 | node-15/thread-0/socket.wait-first-byte | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.945 | 0.544 | 0.000 | 0.900 | 4.627 | n/a | 0.000 | 0.117 | 10.511 | 1.449 | 0.000 | 0.000 | 0.000 | 9.374 | n/a | n/a | 0.043 | 5.500 | 0.232 | 0.043 |
| p99 | 194.205 | 4.500 | 0.833 | 5.051 | 10.801 | n/a | 2.307 | 4.059 | 14.089 | 15.741 | 0.135 | 97.597 | 2.264 | 165.705 | n/a | n/a | 0.125 | 11.351 | 0.441 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000460 | 194.205 | 4.520 | 0.291 | 0.000 | 0.072 | 10.664 | 12.647 | 0.059 | 0.000 | 0.211 | 165.705 | n/a | n/a | 0.038 | 4.883 | 0.025 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004ae | 159.650 | 10.329 | 0.364 | 0.541 | 0.117 | 12.239 | 15.741 | 0.135 | 97.597 | 0.000 | 22.485 | n/a | n/a | 0.103 | 11.351 | 0.071 | 0.103 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee106316160000000000000470 | 97.666 | 3.942 | 0.288 | 0.000 | 0.096 | 10.594 | 15.069 | 0.047 | 0.000 | 0.252 | 67.324 | n/a | n/a | 0.052 | 4.327 | 0.044 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000468 | 54.184 | 9.016 | n/a | 0.000 | 0.205 | 14.089 | 2.041 | 0.056 | 0.000 | 0.242 | 28.458 | n/a | n/a | 0.077 | 9.221 | 0.170 | 0.077 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000046c | 46.062 | 4.615 | 0.272 | 0.000 | 0.061 | 10.633 | 14.114 | 0.000 | 0.000 | 0.000 | 16.330 | n/a | n/a | 0.037 | 4.948 | 0.107 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000049e | 40.574 | 5.605 | 0.313 | 0.550 | 0.070 | 10.603 | 11.697 | 0.000 | 0.000 | 0.000 | 11.698 | n/a | n/a | 0.039 | 6.537 | 0.161 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000046a | 38.891 | 5.226 | 0.207 | 0.000 | 0.068 | 10.602 | 9.656 | 0.000 | 0.000 | 0.000 | 13.094 | n/a | n/a | 0.039 | 5.500 | 0.141 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000494 | 38.566 | 4.061 | 0.427 | 0.249 | 0.018 | 10.802 | 14.542 | 0.000 | 0.000 | 0.000 | 8.440 | n/a | n/a | 0.025 | 4.756 | 0.123 | 0.025 | gw-w/thread-51/gateway.admitted-work | none observed |
| f62327ee106316160000000000000498 | 37.582 | 4.627 | 0.197 | 0.419 | 0.040 | 10.621 | 12.075 | 0.000 | 0.000 | 0.000 | 9.571 | n/a | n/a | 0.031 | 5.283 | 0.141 | 0.031 | gw-w/thread-48/gateway.admitted-work | none observed |
| f62327ee1063161600000000000004a2 | 37.206 | 5.341 | 0.237 | 0.406 | 0.089 | 10.681 | 3.506 | 0.000 | 0.000 | 0.000 | 16.898 | n/a | n/a | 0.046 | 6.073 | 0.163 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000045e | 36.177 | 4.060 | 0.190 | 0.000 | 0.048 | 10.621 | 8.577 | 0.000 | 0.000 | 0.000 | 12.646 | n/a | n/a | 0.036 | 4.298 | 0.119 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000046d | 34.684 | 6.863 | n/a | 2.307 | 0.439 | 5.231 | 0.479 | 0.000 | 0.000 | 0.000 | 19.314 | n/a | n/a | 0.052 | 9.609 | 0.277 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000462 | 31.345 | 6.337 | n/a | 1.924 | 0.795 | 5.430 | 5.368 | 0.059 | 0.000 | 2.264 | 9.104 | n/a | n/a | 0.064 | 9.056 | 0.289 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000480 | 31.027 | 4.120 | 4.643 | 0.234 | 0.044 | 10.548 | 6.110 | 0.000 | 0.000 | 0.000 | 5.292 | n/a | n/a | 0.035 | 9.042 | 0.291 | 0.035 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000049a | 30.574 | 3.629 | 0.316 | 0.237 | 0.112 | 10.514 | 6.332 | 0.000 | 0.000 | 0.000 | 9.374 | n/a | n/a | 0.061 | 4.294 | 0.140 | 0.061 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000004a4 | 30.153 | 4.241 | 0.182 | 0.330 | 0.033 | 10.778 | 2.087 | 0.000 | 0.000 | 0.000 | 12.473 | n/a | n/a | 0.029 | 4.786 | 0.159 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000478 | 30.150 | 4.382 | 0.270 | 0.257 | 0.090 | 10.698 | 5.256 | 0.000 | 0.000 | 0.000 | 9.147 | n/a | n/a | 0.049 | 5.000 | 0.166 | 0.049 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000489 | 29.464 | 8.609 | n/a | 0.000 | 0.837 | 6.175 | 0.517 | 0.000 | 0.000 | 0.000 | 13.283 | n/a | n/a | 0.043 | 9.446 | 0.321 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004ac | 29.241 | 5.468 | 0.255 | 0.362 | 0.034 | 10.613 | 6.126 | 0.000 | 0.000 | 0.000 | 6.354 | n/a | n/a | 0.030 | 6.118 | 0.209 | 0.030 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000474 | 28.717 | 4.221 | 0.292 | 0.302 | 0.040 | 10.511 | 5.797 | 0.000 | 0.000 | 0.000 | 7.497 | n/a | n/a | 0.055 | 4.856 | 0.169 | 0.055 | node-15/thread-4/socket.wait-first-byte | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.049 | 1.162 | 0.000 | 1.454 | 3.734 | n/a | 0.000 | 0.392 | 5.456 | 0.420 | 0.000 | 0.000 | 0.000 | 4.442 | n/a | n/a | 0.042 | 5.437 | 0.295 | 0.042 |
| p99 | 54.184 | 3.316 | 0.833 | 3.205 | 9.016 | n/a | 1.538 | 4.059 | 14.089 | 2.041 | 0.056 | 0.000 | 0.242 | 28.458 | n/a | n/a | 0.077 | 9.221 | 0.441 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000468 | 54.184 | 9.016 | n/a | 0.000 | 0.205 | 14.089 | 2.041 | 0.056 | 0.000 | 0.242 | 28.458 | n/a | n/a | 0.077 | 9.221 | 0.170 | 0.077 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000464 | 24.207 | 3.784 | n/a | 1.538 | 0.115 | 5.825 | 0.506 | 0.000 | 0.000 | 0.000 | 12.391 | n/a | n/a | 0.047 | 5.437 | 0.225 | 0.047 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000048d | 18.968 | 4.719 | n/a | 0.000 | 0.826 | 6.024 | 0.264 | 0.000 | 0.000 | 0.000 | 7.071 | n/a | n/a | 0.063 | 5.545 | 0.292 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000479 | 18.665 | 5.294 | n/a | 0.000 | 0.392 | 5.775 | 0.420 | 0.000 | 0.000 | 0.000 | 6.749 | n/a | n/a | 0.035 | 5.686 | 0.305 | 0.035 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004a9 | 16.049 | 3.021 | n/a | 0.000 | 4.059 | 5.313 | 0.288 | 0.000 | 0.000 | 0.000 | 3.336 | n/a | n/a | 0.031 | 7.080 | 0.441 | 0.031 | node-15/thread-0/socket.wait-first-byte | driver.publication 1.560ms |
| f62327ee10631616000000000000049f | 14.704 | 3.734 | n/a | 0.000 | 0.610 | 5.405 | 0.471 | 0.000 | 0.000 | 0.000 | 4.442 | n/a | n/a | 0.042 | 4.344 | 0.295 | 0.042 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000492 | 12.947 | 3.541 | n/a | 0.000 | 1.411 | 5.261 | 0.429 | 0.000 | 0.000 | 0.000 | 2.255 | n/a | n/a | 0.050 | 4.952 | 0.383 | 0.050 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000483 | 10.749 | 3.104 | n/a | 0.000 | 0.357 | 5.456 | 0.318 | 0.000 | 0.000 | 0.000 | 1.478 | n/a | n/a | 0.037 | 3.460 | 0.322 | 0.037 | node-15/thread-0/socket.wait-first-byte | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.847 | 0.534 | 0.000 | 1.252 | 4.855 | 0.921 | 0.000 | 0.175 | 7.560 | 2.001 | 0.000 | 0.000 | 0.000 | 9.697 | n/a | n/a | 0.058 | 5.410 | 0.204 | 0.058 |
| p99 | 100.670 | 4.949 | 3.725 | 9.345 | 11.586 | n/a | 1.962 | 1.132 | 11.246 | 19.950 | 0.115 | 17.355 | 3.448 | 60.585 | n/a | n/a | 0.115 | 14.296 | 0.466 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee1063161600000000000004b8 | 100.670 | 5.370 | 0.225 | 0.345 | 0.075 | 10.497 | 19.950 | 0.115 | 0.000 | 3.448 | 60.585 | n/a | n/a | 0.060 | 6.015 | 0.060 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004da | 52.406 | 4.827 | 0.216 | 0.000 | 0.106 | 10.669 | 5.145 | 0.000 | 17.355 | 0.000 | 14.029 | n/a | n/a | 0.060 | 5.148 | 0.098 | 0.060 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee1063161600000000000004c0 | 51.117 | 3.890 | 0.308 | 0.333 | 0.079 | 10.525 | 15.202 | 0.000 | 0.000 | 0.000 | 20.720 | n/a | n/a | 0.059 | 4.611 | 0.090 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004d4 | 49.506 | 5.026 | 0.323 | 0.000 | 0.077 | 11.246 | 4.157 | 0.000 | 0.000 | 0.000 | 28.631 | n/a | n/a | 0.046 | 5.426 | 0.110 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004cc | 46.401 | 8.464 | 0.611 | 0.298 | 0.091 | 11.054 | 6.398 | 0.000 | 0.000 | 0.000 | 19.422 | n/a | n/a | 0.063 | 9.464 | 0.204 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004ea | 43.639 | 4.672 | 0.431 | 0.000 | 0.252 | 10.541 | 7.616 | 0.000 | 9.279 | 0.000 | 10.734 | n/a | n/a | 0.115 | 5.355 | 0.123 | 0.115 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004b1 | 40.957 | 5.705 | 0.390 | 0.492 | 0.061 | 10.648 | 11.932 | 0.000 | 0.000 | 0.000 | 11.648 | n/a | n/a | 0.081 | 6.648 | 0.162 | 0.081 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004ba | 40.291 | 11.586 | n/a | 1.962 | 0.748 | 5.483 | 2.001 | 0.059 | 0.000 | 0.340 | 18.052 | n/a | n/a | 0.059 | 14.296 | 0.355 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004dc | 37.657 | 9.395 | n/a | 0.000 | 0.249 | 5.318 | 0.413 | 0.000 | 0.000 | 0.000 | 22.215 | n/a | n/a | 0.068 | 9.644 | 0.256 | 0.068 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004d6 | 37.182 | 4.855 | 0.238 | 0.000 | 0.074 | 10.569 | 6.312 | 0.000 | 0.000 | 0.000 | 15.079 | n/a | n/a | 0.055 | 5.167 | 0.139 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004ce | 36.080 | 6.494 | 0.328 | 0.000 | 0.063 | 10.513 | 2.806 | 0.000 | 0.000 | 0.000 | 15.817 | n/a | n/a | 0.059 | 6.885 | 0.191 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004e8 | 35.754 | 8.193 | n/a | 0.000 | 0.870 | 5.396 | 0.289 | 0.000 | 0.000 | 0.000 | 20.949 | n/a | n/a | 0.057 | 9.063 | 0.253 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004ee | 33.695 | 4.238 | 0.216 | 0.000 | 0.073 | 10.664 | 11.054 | 0.000 | 0.000 | 0.000 | 7.396 | n/a | n/a | 0.054 | 4.528 | 0.134 | 0.054 | gw-w/thread-49/gateway.admitted-work | none observed |
| f62327ee1063161600000000000004d0 | 32.441 | 11.013 | n/a | 0.000 | 0.169 | 5.284 | 0.276 | 0.000 | 0.000 | 0.000 | 15.650 | n/a | n/a | 0.050 | 11.182 | 0.345 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004c8 | 30.811 | 5.102 | 0.209 | 0.494 | 0.059 | 10.798 | 5.747 | 0.000 | 0.000 | 0.000 | 8.353 | n/a | n/a | 0.050 | 5.864 | 0.190 | 0.050 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000004e0 | 30.537 | 3.455 | 0.201 | 0.000 | 0.062 | 10.510 | 2.801 | 0.000 | 0.000 | 0.000 | 13.470 | n/a | n/a | 0.039 | 3.718 | 0.122 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004c2 | 30.354 | 4.262 | 0.250 | 0.517 | 0.170 | 10.625 | 7.162 | 0.000 | 0.000 | 0.000 | 7.271 | n/a | n/a | 0.097 | 5.199 | 0.171 | 0.097 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000004bc | 30.033 | 5.548 | n/a | 0.000 | 0.217 | 5.315 | 0.288 | 0.000 | 0.000 | 0.484 | 18.120 | n/a | n/a | 0.061 | 5.765 | 0.192 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004f2 | 28.848 | 4.731 | 0.480 | 0.000 | 0.097 | 10.706 | 2.525 | 0.000 | 0.000 | 0.000 | 10.238 | n/a | n/a | 0.071 | 5.308 | 0.184 | 0.071 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000004ec | 27.847 | 5.802 | n/a | 0.000 | 0.367 | 5.365 | 0.393 | 0.000 | 0.000 | 0.000 | 15.865 | n/a | n/a | 0.056 | 6.169 | 0.222 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.649 | 0.625 | 0.000 | 1.804 | 4.216 | n/a | 0.000 | 0.710 | 5.251 | 0.280 | 0.000 | 0.000 | 0.000 | 6.153 | n/a | n/a | 0.052 | 4.926 | 0.283 | 0.052 |
| p99 | 27.415 | 2.902 | 0.000 | 4.312 | 9.194 | n/a | 0.000 | 0.826 | 6.342 | 3.812 | 0.000 | 0.000 | 0.000 | 11.727 | n/a | n/a | 0.110 | 9.907 | 0.466 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee1063161600000000000004af | 27.415 | 9.194 | n/a | 0.000 | 0.713 | 5.417 | 0.313 | 0.000 | 0.000 | 0.000 | 11.727 | n/a | n/a | 0.052 | 9.907 | 0.361 | 0.052 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004b3 | 23.177 | 4.646 | n/a | 0.000 | 0.607 | 6.342 | 0.623 | 0.000 | 0.000 | 0.000 | 10.898 | n/a | n/a | 0.061 | 5.253 | 0.227 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004f8 | 21.402 | 6.157 | n/a | 0.000 | 0.652 | 5.251 | 0.236 | 0.000 | 0.000 | 0.000 | 9.048 | n/a | n/a | 0.058 | 6.809 | 0.318 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004c6 | 20.249 | 4.998 | n/a | 0.000 | 0.730 | 5.252 | 3.812 | 0.000 | 0.000 | 0.000 | 5.404 | n/a | n/a | 0.053 | 5.728 | 0.283 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004be | 18.217 | 3.544 | n/a | 0.000 | 0.550 | 5.287 | 0.279 | 0.000 | 0.000 | 0.000 | 8.510 | n/a | n/a | 0.048 | 4.094 | 0.225 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004e2 | 17.649 | 3.301 | n/a | 0.000 | 0.521 | 5.179 | 0.373 | 0.000 | 0.000 | 0.000 | 8.229 | n/a | n/a | 0.046 | 3.822 | 0.217 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004f0 | 16.492 | 3.808 | n/a | 0.000 | 0.826 | 5.112 | 0.550 | 0.000 | 0.000 | 0.000 | 6.153 | n/a | n/a | 0.044 | 4.634 | 0.281 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004c4 | 13.749 | 4.216 | n/a | 0.000 | 0.710 | 5.284 | 0.280 | 0.000 | 0.000 | 0.000 | 3.188 | n/a | n/a | 0.071 | 4.926 | 0.358 | 0.071 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000004d8 | 12.470 | 3.785 | n/a | 0.000 | 0.747 | 5.228 | 0.239 | 0.000 | 0.000 | 0.000 | 2.419 | n/a | n/a | 0.052 | 4.532 | 0.363 | 0.052 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000004fa | 11.041 | 4.387 | n/a | 0.000 | 0.758 | 5.250 | 0.210 | 0.000 | 0.000 | 0.000 | 0.327 | n/a | n/a | 0.110 | 5.145 | 0.466 | 0.110 | node-15/thread-0/socket.wait-first-byte | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.889 | 0.509 | 0.000 | 1.417 | 4.403 | n/a | 0.000 | 0.204 | 9.259 | 0.488 | 0.000 | 0.000 | 0.000 | 7.360 | n/a | n/a | 0.058 | 5.191 | 0.230 | 0.058 |
| p99 | 95.411 | 1.873 | 0.008 | 3.455 | 14.416 | n/a | 0.000 | 1.236 | 20.310 | 24.041 | 0.070 | 29.858 | 1.621 | 84.519 | n/a | n/a | 0.118 | 14.738 | 0.453 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000527 | 95.411 | 4.432 | n/a | 0.000 | 0.861 | 5.271 | 0.267 | 0.000 | 0.000 | 0.000 | 84.519 | n/a | n/a | 0.062 | 5.292 | 0.055 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000549 | 90.415 | 6.235 | 0.585 | 0.000 | 0.206 | 10.814 | 24.041 | 0.018 | 29.858 | 0.000 | 18.540 | n/a | n/a | 0.118 | 7.025 | 0.078 | 0.118 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee106316160000000000000521 | 42.341 | 14.416 | n/a | 0.000 | 0.322 | 20.310 | 2.835 | 0.000 | 0.000 | 0.000 | 4.418 | n/a | n/a | 0.039 | 14.738 | 0.348 | 0.039 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000052b | 41.771 | 3.594 | 0.266 | 0.000 | 0.076 | 10.531 | 6.794 | 0.000 | 14.012 | 0.000 | 6.438 | n/a | n/a | 0.059 | 3.936 | 0.094 | 0.059 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee10631616000000000000054b | 38.770 | 3.674 | 0.293 | 0.000 | 0.108 | 10.495 | 4.597 | 0.000 | 0.000 | 0.000 | 19.518 | n/a | n/a | 0.086 | 4.074 | 0.105 | 0.086 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000051f | 35.923 | 3.744 | 0.196 | 0.000 | 0.072 | 10.551 | 7.654 | 0.000 | 0.000 | 0.000 | 13.662 | n/a | n/a | 0.043 | 4.012 | 0.112 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000050f | 35.522 | 3.797 | 0.272 | 0.000 | 0.084 | 10.573 | 5.327 | 0.000 | 0.000 | 0.000 | 15.402 | n/a | n/a | 0.067 | 4.153 | 0.117 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000053f | 34.657 | 3.348 | 0.239 | 0.000 | 0.099 | 10.452 | 3.636 | 0.000 | 0.000 | 0.000 | 16.822 | n/a | n/a | 0.062 | 3.686 | 0.106 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000547 | 33.566 | 3.452 | 0.206 | 0.000 | 0.068 | 10.566 | 2.694 | 0.000 | 0.000 | 0.000 | 16.534 | n/a | n/a | 0.047 | 3.726 | 0.111 | 0.047 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000050b | 32.099 | 5.027 | 0.248 | 0.000 | 0.131 | 10.556 | 6.026 | 0.000 | 0.000 | 0.000 | 10.041 | n/a | n/a | 0.071 | 5.406 | 0.168 | 0.071 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000505 | 32.007 | 8.186 | n/a | 0.000 | 0.496 | 5.216 | 0.488 | 0.000 | 0.000 | 0.000 | 17.584 | n/a | n/a | 0.037 | 8.682 | 0.271 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.176ms |
| f62327ee10631616000000000000054f | 31.449 | 6.896 | 0.253 | 0.000 | 0.054 | 10.558 | 6.365 | 0.000 | 0.000 | 0.000 | 7.250 | n/a | n/a | 0.073 | 7.203 | 0.229 | 0.073 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000502 | 31.094 | 3.678 | 0.177 | 0.000 | 0.050 | 10.719 | 1.431 | 0.000 | 0.000 | 0.000 | 14.986 | n/a | n/a | 0.052 | 3.906 | 0.126 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000537 | 30.395 | 6.370 | 0.276 | 0.000 | 0.060 | 10.909 | 2.729 | 0.000 | 0.000 | 0.000 | 9.990 | n/a | n/a | 0.061 | 6.706 | 0.221 | 0.061 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000533 | 30.307 | 5.534 | 0.234 | 0.000 | 0.126 | 10.859 | 3.805 | 0.000 | 0.000 | 0.000 | 9.679 | n/a | n/a | 0.070 | 5.893 | 0.194 | 0.070 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000511 | 28.171 | 5.250 | n/a | 0.000 | 0.283 | 5.179 | 0.434 | 0.000 | 0.000 | 0.000 | 16.981 | n/a | n/a | 0.044 | 5.533 | 0.196 | 0.044 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000508 | 27.696 | 3.491 | 2.612 | 0.000 | 0.075 | 10.579 | 2.514 | 0.000 | 0.000 | 0.000 | 8.383 | n/a | n/a | 0.042 | 6.178 | 0.223 | 0.042 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000523 | 26.707 | 4.066 | 0.262 | 0.000 | 0.098 | 10.232 | 0.239 | 0.000 | 0.000 | 0.000 | 11.744 | n/a | n/a | 0.065 | 4.426 | 0.166 | 0.065 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000053b | 24.888 | 4.219 | 0.315 | 0.000 | 0.079 | 10.723 | 1.512 | 0.000 | 0.000 | 0.000 | 7.958 | n/a | n/a | 0.083 | 4.613 | 0.185 | 0.083 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000515 | 24.603 | 5.187 | n/a | 0.000 | 0.463 | 5.248 | 0.224 | 0.000 | 0.000 | 1.621 | 11.805 | n/a | n/a | 0.056 | 5.650 | 0.230 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.833 | 0.895 | 0.000 | 1.813 | 4.403 | n/a | 0.000 | 0.861 | 5.264 | 0.248 | 0.000 | 0.000 | 0.000 | 5.776 | n/a | n/a | 0.056 | 5.292 | 0.305 | 0.056 |
| p99 | 95.411 | 1.789 | 0.000 | 2.308 | 5.800 | n/a | 0.000 | 1.236 | 6.155 | 1.164 | 0.070 | 0.000 | 1.621 | 84.519 | n/a | n/a | 0.068 | 6.341 | 0.453 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000527 | 95.411 | 4.432 | n/a | 0.000 | 0.861 | 5.271 | 0.267 | 0.000 | 0.000 | 0.000 | 84.519 | n/a | n/a | 0.062 | 5.292 | 0.055 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000515 | 24.603 | 5.187 | n/a | 0.000 | 0.463 | 5.248 | 0.224 | 0.000 | 0.000 | 1.621 | 11.805 | n/a | n/a | 0.056 | 5.650 | 0.230 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000500 | 21.061 | 3.238 | n/a | 0.000 | 0.855 | 6.155 | 1.164 | 0.070 | 0.000 | 0.245 | 9.280 | n/a | n/a | 0.053 | 4.094 | 0.194 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000054d | 19.268 | 5.800 | n/a | 0.000 | 0.541 | 5.259 | 0.245 | 0.000 | 0.000 | 0.000 | 7.360 | n/a | n/a | 0.064 | 6.341 | 0.329 | 0.064 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000504 | 18.276 | 4.428 | n/a | 0.000 | 1.154 | 5.258 | 0.248 | 0.000 | 0.000 | 0.000 | 7.135 | n/a | n/a | 0.053 | 5.581 | 0.305 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000517 | 17.934 | 5.584 | n/a | 0.000 | 0.180 | 6.083 | 0.245 | 0.000 | 0.000 | 0.000 | 5.776 | n/a | n/a | 0.066 | 5.764 | 0.321 | 0.066 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000543 | 17.723 | 4.443 | n/a | 0.000 | 1.006 | 5.257 | 0.327 | 0.000 | 0.000 | 0.000 | 6.627 | n/a | n/a | 0.062 | 5.449 | 0.307 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000531 | 16.833 | 4.510 | n/a | 0.000 | 1.159 | 5.360 | 0.269 | 0.000 | 0.000 | 0.000 | 5.480 | n/a | n/a | 0.056 | 5.669 | 0.337 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000535 | 15.687 | 3.496 | n/a | 0.000 | 0.204 | 5.370 | 0.249 | 0.000 | 0.000 | 0.000 | 6.327 | n/a | n/a | 0.040 | 3.700 | 0.236 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000004fe | 14.842 | 3.493 | n/a | 0.000 | 0.947 | 5.291 | 0.220 | 0.000 | 0.000 | 0.000 | 4.833 | n/a | n/a | 0.059 | 4.439 | 0.299 | 0.059 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000051b | 14.571 | 3.023 | n/a | 0.000 | 0.954 | 5.231 | 0.222 | 0.000 | 0.000 | 0.000 | 5.103 | n/a | n/a | 0.038 | 3.977 | 0.273 | 0.038 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000050d | 12.878 | 4.116 | n/a | 0.000 | 0.614 | 5.422 | 0.279 | 0.000 | 0.000 | 0.000 | 2.403 | n/a | n/a | 0.044 | 4.730 | 0.367 | 0.044 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000519 | 12.454 | 4.403 | n/a | 0.000 | 1.236 | 5.250 | 0.241 | 0.000 | 0.000 | 0.000 | 1.255 | n/a | n/a | 0.068 | 5.639 | 0.453 | 0.068 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000053d | 12.054 | 3.016 | n/a | 0.000 | 0.559 | 5.228 | 0.297 | 0.000 | 0.000 | 0.000 | 2.916 | n/a | n/a | 0.039 | 3.575 | 0.297 | 0.039 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000539 | 12.003 | 3.427 | n/a | 0.000 | 0.897 | 5.264 | 0.241 | 0.000 | 0.000 | 0.000 | 2.137 | n/a | n/a | 0.036 | 4.325 | 0.360 | 0.036 | node-15/thread-0/socket.wait-first-byte | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.450 | 0.822 | 0.000 | 1.792 | 5.049 | n/a | 0.000 | 0.173 | 5.382 | 0.479 | 0.000 | 0.000 | 0.000 | 9.858 | n/a | n/a | 0.058 | 5.731 | 0.243 | 0.058 |
| p99 | 166.178 | 11.628 | 2.843 | 13.397 | 59.570 | n/a | 0.000 | 2.570 | 17.199 | 27.157 | 0.072 | 14.663 | 3.417 | 128.045 | n/a | n/a | 0.162 | 62.139 | 0.508 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee10631616000000000000058b | 166.178 | 59.570 | n/a | 0.000 | 2.570 | 5.363 | 4.118 | 0.068 | 0.000 | 3.417 | 90.929 | n/a | n/a | 0.144 | 62.139 | 0.374 | 0.144 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000593 | 138.236 | 4.367 | n/a | 0.000 | 0.259 | 5.238 | 0.291 | 0.000 | 0.000 | 0.000 | 128.045 | n/a | n/a | 0.037 | 4.625 | 0.033 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000563 | 77.044 | 7.757 | 0.241 | 0.000 | 0.058 | 11.101 | 19.900 | 0.072 | 14.663 | 0.000 | 23.202 | n/a | n/a | 0.049 | 8.057 | 0.105 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000552 | 49.176 | 3.554 | 0.231 | 0.000 | 0.056 | 10.613 | 27.157 | 0.000 | 0.000 | 0.000 | 7.518 | n/a | n/a | 0.046 | 3.841 | 0.078 | 0.046 | gw-w/thread-51/gateway.admitted-work | none observed |
| f62327ee106316160000000000000565 | 45.295 | 7.056 | 0.385 | 0.000 | 0.121 | 11.021 | 12.858 | 0.000 | 0.000 | 0.000 | 13.791 | n/a | n/a | 0.063 | 7.562 | 0.167 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000597 | 43.896 | 4.623 | 0.391 | 0.000 | 0.096 | 10.756 | 14.163 | 0.016 | 0.000 | 0.000 | 13.769 | n/a | n/a | 0.082 | 5.109 | 0.116 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000056b | 43.797 | 6.226 | 0.288 | 0.000 | 0.096 | 10.743 | 17.292 | 0.000 | 0.000 | 0.000 | 9.066 | n/a | n/a | 0.085 | 6.611 | 0.151 | 0.085 | gw-w/thread-47/gateway.admitted-work | none observed |
| f62327ee106316160000000000000583 | 43.749 | 3.583 | 2.971 | 0.000 | 0.062 | 10.581 | 5.571 | 0.000 | 0.000 | 0.000 | 20.924 | n/a | n/a | 0.056 | 6.617 | 0.151 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.363ms |
| f62327ee106316160000000000000594 | 43.552 | 4.024 | n/a | 0.000 | 0.311 | 7.427 | 0.096 | 0.000 | 0.000 | 0.000 | 31.639 | n/a | n/a | 0.055 | 4.335 | 0.100 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.147ms |
| f62327ee1063161600000000000005b2 | 43.054 | 9.497 | 4.038 | 0.000 | 0.127 | 11.014 | 4.121 | 0.000 | 0.000 | 0.000 | 14.185 | n/a | n/a | 0.072 | 13.663 | 0.317 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005ac | 39.796 | 5.127 | n/a | 0.000 | 0.915 | 5.196 | 0.000 | 0.000 | 0.443 | 0.000 | 28.062 | n/a | n/a | 0.054 | 6.042 | 0.152 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000587 | 38.808 | 6.984 | n/a | 0.000 | 0.900 | 5.366 | 0.000 | 0.000 | 0.275 | 0.000 | 25.240 | n/a | n/a | 0.043 | 7.884 | 0.203 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000551 | 34.116 | 7.131 | n/a | 0.000 | 0.162 | 17.199 | 0.707 | 0.000 | 0.000 | 0.000 | 8.839 | n/a | n/a | 0.078 | 7.293 | 0.214 | 0.078 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000055c | 32.877 | 4.123 | 0.422 | 0.000 | 0.173 | 10.684 | 0.929 | 0.000 | 0.000 | 0.000 | 16.440 | n/a | n/a | 0.106 | 4.718 | 0.143 | 0.106 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000575 | 32.152 | 7.589 | 0.247 | 0.000 | 0.062 | 10.575 | 3.763 | 0.000 | 0.000 | 0.000 | 9.858 | n/a | n/a | 0.058 | 7.897 | 0.246 | 0.058 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000577 | 32.063 | 4.623 | 0.365 | 0.000 | 0.100 | 10.841 | 3.275 | 0.000 | 0.000 | 0.000 | 12.790 | n/a | n/a | 0.070 | 5.087 | 0.159 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000057a | 31.558 | 6.208 | n/a | 0.000 | 0.125 | 5.343 | 0.268 | 0.000 | 0.000 | 0.000 | 19.549 | n/a | n/a | 0.066 | 6.333 | 0.201 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.360ms; driver.publication 1.161ms |
| f62327ee10631616000000000000058d | 31.471 | 5.021 | 0.243 | 0.000 | 0.091 | 10.892 | 3.178 | 0.000 | 0.000 | 0.000 | 11.979 | n/a | n/a | 0.068 | 5.354 | 0.170 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000573 | 30.228 | 4.619 | 0.232 | 0.000 | 0.119 | 10.792 | 1.837 | 0.000 | 0.000 | 0.000 | 12.531 | n/a | n/a | 0.097 | 4.970 | 0.164 | 0.097 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000056f | 29.758 | 4.276 | 0.236 | 0.000 | 0.057 | 10.491 | 1.259 | 0.000 | 0.000 | 0.000 | 13.396 | n/a | n/a | 0.043 | 4.569 | 0.154 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.990 | 0.822 | 0.000 | 1.934 | 4.723 | n/a | 0.000 | 0.492 | 5.342 | 0.286 | 0.000 | 0.000 | 0.000 | 6.865 | n/a | n/a | 0.053 | 5.359 | 0.285 | 0.053 |
| p99 | 43.552 | 2.078 | 2.843 | 4.859 | 7.131 | n/a | 0.000 | 1.117 | 17.199 | 4.157 | 0.025 | 0.443 | 0.000 | 31.639 | n/a | n/a | 0.091 | 7.669 | 0.508 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000594 | 43.552 | 4.024 | n/a | 0.000 | 0.311 | 7.427 | 0.096 | 0.000 | 0.000 | 0.000 | 31.639 | n/a | n/a | 0.055 | 4.335 | 0.100 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.147ms |
| f62327ee1063161600000000000005ac | 39.796 | 5.127 | n/a | 0.000 | 0.915 | 5.196 | 0.000 | 0.000 | 0.443 | 0.000 | 28.062 | n/a | n/a | 0.054 | 6.042 | 0.152 | 0.054 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000551 | 34.116 | 7.131 | n/a | 0.000 | 0.162 | 17.199 | 0.707 | 0.000 | 0.000 | 0.000 | 8.839 | n/a | n/a | 0.078 | 7.293 | 0.214 | 0.078 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000057a | 31.558 | 6.208 | n/a | 0.000 | 0.125 | 5.343 | 0.268 | 0.000 | 0.000 | 0.000 | 19.549 | n/a | n/a | 0.066 | 6.333 | 0.201 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.360ms; driver.publication 1.161ms |
| f62327ee106316160000000000000584 | 27.982 | 4.877 | n/a | 0.000 | 0.617 | 5.251 | 0.195 | 0.000 | 0.000 | 0.000 | 16.991 | n/a | n/a | 0.050 | 5.494 | 0.196 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000599 | 23.628 | 5.874 | n/a | 0.000 | 1.117 | 12.402 | 4.157 | 0.025 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.053 | 6.991 | 0.296 | 0.053 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000556 | 20.561 | 3.869 | n/a | 0.000 | 0.810 | 5.343 | 0.486 | 0.000 | 0.000 | 0.000 | 10.011 | n/a | n/a | 0.043 | 4.678 | 0.228 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000055f | 19.964 | 4.585 | n/a | 0.000 | 1.110 | 5.363 | 0.300 | 0.000 | 0.000 | 0.000 | 8.516 | n/a | n/a | 0.091 | 5.695 | 0.285 | 0.091 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000058e | 17.990 | 4.607 | n/a | 0.000 | 0.751 | 5.299 | 0.405 | 0.000 | 0.000 | 0.000 | 6.865 | n/a | n/a | 0.062 | 5.359 | 0.298 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000571 | 16.785 | 3.664 | n/a | 0.000 | 0.513 | 5.258 | 0.228 | 0.000 | 0.000 | 0.000 | 7.081 | n/a | n/a | 0.041 | 4.177 | 0.249 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005a6 | 16.405 | 5.049 | n/a | 0.000 | 0.271 | 5.235 | 0.479 | 0.000 | 0.000 | 0.000 | 5.306 | n/a | n/a | 0.066 | 5.320 | 0.324 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000590 | 15.097 | 7.074 | n/a | 0.000 | 0.595 | 5.342 | 0.294 | 0.000 | 0.000 | 0.000 | 1.748 | n/a | n/a | 0.043 | 7.669 | 0.508 | 0.043 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000055a | 14.851 | 4.723 | n/a | 0.000 | 0.299 | 5.349 | 0.278 | 0.000 | 0.000 | 0.000 | 4.152 | n/a | n/a | 0.050 | 5.022 | 0.338 | 0.050 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee106316160000000000000566 | 13.932 | 3.745 | n/a | 0.000 | 0.492 | 5.786 | 0.286 | 0.000 | 0.000 | 0.000 | 3.576 | n/a | n/a | 0.048 | 4.237 | 0.304 | 0.048 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee10631616000000000000059e | 13.462 | 5.463 | n/a | 0.000 | 0.130 | 5.298 | 0.286 | 0.000 | 0.000 | 0.000 | 2.246 | n/a | n/a | 0.039 | 5.594 | 0.416 | 0.039 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005b0 | 12.250 | 3.983 | n/a | 0.000 | 0.420 | 5.322 | 0.199 | 0.000 | 0.000 | 0.000 | 2.270 | n/a | n/a | 0.055 | 4.403 | 0.359 | 0.055 | node-15/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.372 | 0.601 | 0.000 | 1.336 | 5.040 | n/a | 0.000 | 0.149 | 6.329 | 0.412 | 0.000 | 0.000 | 0.000 | 7.486 | n/a | n/a | 0.063 | 5.275 | 0.271 | 0.063 |
| p99 | 75.207 | 2.960 | 0.306 | 5.386 | 9.260 | n/a | 0.000 | 1.117 | 11.116 | 14.394 | 0.048 | 24.992 | 1.753 | 56.859 | n/a | n/a | 0.148 | 9.866 | 0.467 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000601 | 75.207 | 6.251 | 0.268 | 0.000 | 0.082 | 10.655 | 1.025 | 0.000 | 0.000 | 0.000 | 56.859 | n/a | n/a | 0.067 | 6.601 | 0.088 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005c4 | 55.916 | 6.088 | 0.605 | 0.000 | 0.063 | 10.700 | 14.394 | 0.033 | 0.000 | 0.000 | 23.975 | n/a | n/a | 0.058 | 6.756 | 0.121 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005cc | 54.751 | 4.388 | 0.225 | 0.000 | 0.085 | 10.602 | 5.536 | 0.000 | 24.992 | 0.000 | 8.865 | n/a | n/a | 0.058 | 4.698 | 0.086 | 0.058 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee1063161600000000000005ee | 52.781 | 5.665 | 2.111 | 0.000 | 0.068 | 10.811 | 8.584 | 0.000 | 13.144 | 0.000 | 12.326 | n/a | n/a | 0.072 | 7.844 | 0.149 | 0.072 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| f62327ee1063161600000000000005d6 | 38.286 | 5.917 | 0.317 | 0.000 | 0.126 | 10.701 | 4.955 | 0.048 | 0.000 | 0.274 | 15.846 | n/a | n/a | 0.102 | 6.360 | 0.166 | 0.102 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005b8 | 36.120 | 3.864 | 0.225 | 0.000 | 0.103 | 10.631 | 8.711 | 0.006 | 0.000 | 0.000 | 12.489 | n/a | n/a | 0.091 | 4.192 | 0.116 | 0.091 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000602 | 35.096 | 8.740 | n/a | 0.000 | 0.474 | 6.329 | 0.412 | 0.000 | 0.000 | 1.753 | 17.307 | n/a | n/a | 0.080 | 9.215 | 0.263 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005e6 | 34.750 | 3.824 | 0.195 | 0.000 | 0.062 | 10.622 | 12.430 | 0.042 | 0.000 | 0.000 | 7.524 | n/a | n/a | 0.049 | 4.082 | 0.117 | 0.049 | gw-w/thread-50/gateway.admitted-work | none observed |
| f62327ee1063161600000000000005e4 | 33.246 | 5.040 | 0.171 | 0.000 | 0.064 | 10.633 | 6.861 | 0.000 | 0.000 | 0.000 | 10.438 | n/a | n/a | 0.039 | 5.275 | 0.159 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000609 | 30.427 | 3.990 | 0.304 | 0.000 | 0.077 | 10.495 | 5.798 | 0.036 | 0.000 | 0.000 | 9.676 | n/a | n/a | 0.052 | 4.371 | 0.144 | 0.052 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005de | 28.631 | 4.023 | 0.295 | 0.000 | 0.072 | 10.570 | 1.260 | 0.000 | 0.000 | 0.000 | 12.339 | n/a | n/a | 0.071 | 4.391 | 0.153 | 0.071 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee106316160000000000000607 | 28.498 | 5.520 | 0.301 | 0.000 | 0.080 | 10.737 | 1.452 | 0.000 | 0.000 | 0.000 | 10.359 | n/a | n/a | 0.049 | 5.901 | 0.207 | 0.049 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005ca | 27.120 | 5.132 | 0.376 | 0.000 | 0.149 | 10.110 | 1.951 | 0.000 | 0.000 | 0.000 | 9.308 | n/a | n/a | 0.093 | 5.657 | 0.209 | 0.093 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005ba | 26.416 | 7.872 | n/a | 0.000 | 0.963 | 5.266 | 0.547 | 0.000 | 0.000 | 0.000 | 11.700 | n/a | n/a | 0.068 | 8.835 | 0.334 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005bf | 26.031 | 9.260 | n/a | 0.000 | 0.605 | 5.248 | 0.296 | 0.000 | 0.000 | 0.000 | 10.560 | n/a | n/a | 0.061 | 9.866 | 0.379 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005e2 | 26.023 | 4.923 | n/a | 0.000 | 0.211 | 5.386 | 0.337 | 0.000 | 0.000 | 0.000 | 15.111 | n/a | n/a | 0.055 | 5.133 | 0.197 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005fc | 25.799 | 3.908 | 0.408 | 0.000 | 0.083 | 10.540 | 1.145 | 0.000 | 0.000 | 0.000 | 9.660 | n/a | n/a | 0.055 | 4.399 | 0.171 | 0.055 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005f2 | 25.144 | 3.496 | 0.378 | 0.000 | 0.073 | 10.545 | 4.156 | 0.000 | 0.000 | 0.000 | 6.423 | n/a | n/a | 0.073 | 3.947 | 0.157 | 0.073 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005bc | 23.506 | 7.985 | 0.405 | 0.000 | 0.067 | 11.116 | 0.995 | 0.000 | 0.000 | 0.000 | 2.874 | n/a | n/a | 0.063 | 8.458 | 0.360 | 0.063 | node-15/thread-4/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005c2 | 23.009 | 8.020 | n/a | 0.000 | 0.370 | 5.309 | 0.366 | 0.000 | 0.000 | 0.000 | 8.827 | n/a | n/a | 0.116 | 8.391 | 0.365 | 0.116 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.774 | 0.823 | 0.000 | 2.054 | 4.661 | n/a | 0.000 | 0.242 | 5.305 | 0.270 | 0.000 | 0.000 | 0.000 | 5.189 | n/a | n/a | 0.061 | 4.915 | 0.313 | 0.061 |
| p99 | 22.631 | 2.960 | 0.306 | 5.386 | 8.266 | n/a | 0.000 | 1.117 | 7.364 | 1.260 | 0.000 | 0.000 | 0.312 | 11.834 | n/a | n/a | 0.148 | 8.843 | 0.467 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee1063161600000000000005ef | 22.631 | 4.216 | n/a | 0.000 | 0.940 | 5.406 | 0.234 | 0.000 | 0.000 | 0.000 | 11.787 | n/a | n/a | 0.049 | 5.156 | 0.228 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005f4 | 22.372 | 4.679 | n/a | 0.000 | 0.128 | 5.305 | 0.268 | 0.000 | 0.000 | 0.048 | 11.834 | n/a | n/a | 0.110 | 4.807 | 0.215 | 0.110 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005b3 | 20.021 | 5.363 | n/a | 0.000 | 0.206 | 5.440 | 0.374 | 0.000 | 0.000 | 0.000 | 8.593 | n/a | n/a | 0.046 | 5.569 | 0.278 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005ce | 19.816 | 7.011 | n/a | 0.000 | 1.117 | 5.283 | 0.312 | 0.000 | 0.000 | 0.000 | 6.009 | n/a | n/a | 0.083 | 8.129 | 0.410 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005fa | 19.423 | 8.266 | n/a | 0.000 | 0.577 | 5.503 | 0.508 | 0.000 | 0.000 | 0.000 | 4.496 | n/a | n/a | 0.073 | 8.843 | 0.455 | 0.073 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005e8 | 17.542 | 7.654 | n/a | 0.000 | 0.534 | 5.295 | 0.312 | 0.000 | 0.000 | 0.000 | 3.634 | n/a | n/a | 0.113 | 8.188 | 0.467 | 0.113 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005d0 | 17.281 | 3.797 | n/a | 0.000 | 0.912 | 5.238 | 0.243 | 0.000 | 0.000 | 0.000 | 7.031 | n/a | n/a | 0.060 | 4.709 | 0.272 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005d4 | 16.774 | 4.024 | n/a | 0.000 | 0.516 | 5.336 | 0.318 | 0.000 | 0.000 | 0.000 | 6.537 | n/a | n/a | 0.043 | 4.541 | 0.271 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005e0 | 16.158 | 4.593 | n/a | 0.000 | 0.209 | 5.250 | 0.270 | 0.000 | 0.000 | 0.000 | 5.769 | n/a | n/a | 0.068 | 4.802 | 0.297 | 0.068 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005d8 | 15.992 | 4.830 | n/a | 0.000 | 0.111 | 5.232 | 0.263 | 0.000 | 0.000 | 0.312 | 5.189 | n/a | n/a | 0.055 | 4.940 | 0.309 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee1063161600000000000005c6 | 15.250 | 4.661 | n/a | 0.000 | 0.108 | 5.269 | 0.222 | 0.000 | 0.000 | 0.000 | 4.930 | n/a | n/a | 0.061 | 4.769 | 0.313 | 0.061 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005b6 | 15.239 | 4.557 | n/a | 0.000 | 0.358 | 5.321 | 0.410 | 0.000 | 0.000 | 0.000 | 4.540 | n/a | n/a | 0.052 | 4.915 | 0.323 | 0.052 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005fe | 13.920 | 4.906 | n/a | 0.000 | 0.242 | 7.364 | 1.260 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.148 | 5.148 | 0.370 | 0.148 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005ec | 12.742 | 4.463 | n/a | 0.000 | 0.204 | 5.422 | 0.252 | 0.000 | 0.000 | 0.000 | 2.356 | n/a | n/a | 0.045 | 4.667 | 0.366 | 0.045 | node-15/thread-0/socket.wait-first-byte | none observed |
| f62327ee1063161600000000000005f8 | 9.073 | 3.599 | n/a | 0.000 | 0.068 | 5.249 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.083 | 3.667 | 0.404 | 0.083 | node-15/thread-0/socket.wait-first-byte | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.281 | 0.816 | 0.000 | 1.723 | 3.932 | n/a | 0.000 | 0.824 | 5.302 | 0.249 | 0.000 | 0.000 | 0.000 | 4.977 | n/a | n/a | 0.039 | 5.080 | 0.309 | 0.039 |
| p99 | 84.190 | 3.274 | 0.925 | 4.746 | 40.968 | n/a | 2.126 | 40.154 | 20.813 | 9.243 | 1.758 | 1.605 | 4.025 | 50.114 | n/a | n/a | 0.137 | 49.525 | 0.999 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000baa | 168.461 | 24.975 | n/a | 0.000 | 1.077 | 62.059 | 9.048 | 0.526 | 0.000 | 22.616 | 46.690 | n/a | n/a | 1.468 | 26.052 | 0.155 | 1.468 | node-15/thread-0/socket.wait-first-byte | driver.publication 4.365ms; client.encode 2.148ms; driver.expected-state.bind-receipt 1.043ms |
| f62327ee106316160000000000000bac | 162.678 | 6.775 | n/a | 0.000 | 110.857 | 9.084 | 0.094 | 0.000 | 0.000 | 0.000 | 35.786 | n/a | n/a | 0.081 | 117.632 | 0.723 | 0.081 | node-15/thread-0/driver.queue.subject | client.encode 2.148ms; driver.publication 1.783ms; driver.publication 1.506ms; driver.expected-state.bind-receipt 1.060ms |
| f62327ee106316160000000000000a0a | 132.071 | 5.223 | n/a | 0.000 | 68.519 | 5.391 | 0.240 | 0.000 | 0.000 | 10.388 | 42.257 | n/a | n/a | 0.052 | 73.742 | 0.558 | 0.052 | node-15/thread-0/driver.queue.subject | driver.publication 2.031ms; driver.publication 1.617ms; driver.publication 1.523ms; driver.publication 1.406ms; driver.publication 1.384ms |
| f62327ee106316160000000000000baf | 121.341 | 15.030 | n/a | 0.000 | 11.384 | 24.137 | 0.894 | 14.924 | 0.000 | 0.058 | 54.474 | n/a | n/a | 0.440 | 26.414 | 0.218 | 0.440 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | client.encode 2.148ms; driver.publication 1.783ms; driver.expected-state.bind-receipt 1.060ms |
| f62327ee106316160000000000000bad | 116.494 | 25.447 | n/a | 0.000 | 0.799 | 44.669 | 29.018 | 0.080 | 0.000 | 2.787 | 13.250 | n/a | n/a | 0.445 | 26.245 | 0.225 | 0.445 | node-15/thread-0/socket.wait-first-byte | client.encode 2.148ms |
| f62327ee106316160000000000000bae | 106.311 | 12.213 | n/a | 0.000 | 7.066 | 5.837 | 14.912 | 8.390 | 0.000 | 1.365 | 56.460 | n/a | n/a | 0.069 | 19.280 | 0.181 | 0.069 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.506ms |
| f62327ee106316160000000000000a0b | 89.509 | 8.867 | n/a | 0.000 | 53.093 | 5.187 | 0.304 | 0.000 | 0.000 | 0.000 | 22.010 | n/a | n/a | 0.047 | 61.960 | 0.692 | 0.047 | node-15/thread-0/driver.queue.subject | driver.publication 2.031ms; driver.publication 1.617ms; driver.publication 1.523ms; driver.publication 1.406ms; driver.publication 1.384ms |
| f62327ee106316160000000000000a0f | 86.647 | 4.376 | n/a | 0.000 | 28.216 | 8.088 | 0.145 | 2.411 | 0.000 | 0.186 | 43.188 | n/a | n/a | 0.037 | 32.592 | 0.376 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.617ms; driver.publication 1.604ms; driver.publication 1.523ms; driver.publication 1.406ms |
| f62327ee10631616000000000000075c | 84.190 | 5.587 | n/a | 0.000 | 49.639 | 5.338 | 0.487 | 0.000 | 0.000 | 0.000 | 23.084 | n/a | n/a | 0.056 | 55.226 | 0.656 | 0.056 | node-15/thread-0/driver.queue.subject | driver.publication 2.246ms; driver.publication 1.523ms; driver.publication 1.389ms |
| f62327ee106316160000000000000776 | 82.011 | 4.338 | n/a | 0.000 | 1.106 | 8.586 | 14.955 | 0.060 | 0.000 | 1.928 | 51.016 | n/a | n/a | 0.023 | 5.444 | 0.066 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.667ms; driver.publication 2.354ms; driver.publication 2.127ms; driver.expected-state.bind-receipt 2.071ms; driver.publication 1.574ms |
| f62327ee106316160000000000000775 | 81.093 | 5.348 | n/a | 0.000 | 0.846 | 5.337 | 5.761 | 0.093 | 0.000 | 0.392 | 63.260 | n/a | n/a | 0.056 | 6.195 | 0.076 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 2.667ms; driver.publication 2.127ms; driver.expected-state.bind-receipt 2.071ms; driver.publication 1.574ms; driver.publication 1.573ms |
| f62327ee106316160000000000000a09 | 79.395 | 5.073 | n/a | 0.000 | 5.155 | 13.534 | 0.406 | 0.000 | 0.000 | 0.735 | 54.457 | n/a | n/a | 0.035 | 10.228 | 0.129 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.141ms; driver.publication 1.406ms; driver.expected-state.bind-receipt 1.067ms |
| f62327ee1063161600000000000007d9 | 76.450 | 5.100 | n/a | 0.000 | 51.063 | 5.238 | 0.501 | 0.000 | 0.000 | 0.000 | 14.505 | n/a | n/a | 0.044 | 56.162 | 0.735 | 0.044 | node-15/thread-0/driver.queue.subject | driver.publication 1.713ms; driver.publication 1.548ms; driver.expected-state.bind-receipt 1.493ms; driver.publication 1.433ms; driver.publication 1.316ms |
| f62327ee106316160000000000000a07 | 75.645 | 3.901 | n/a | 0.000 | 0.711 | 5.337 | 0.407 | 0.000 | 0.000 | 0.000 | 65.239 | n/a | n/a | 0.050 | 4.612 | 0.061 | 0.050 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 2.141ms; driver.expected-state.bind-receipt 1.067ms |
| f62327ee106316160000000000000759 | 75.337 | 3.807 | n/a | 0.000 | 4.131 | 7.131 | 0.295 | 1.043 | 0.000 | 0.315 | 58.578 | n/a | n/a | 0.037 | 7.938 | 0.105 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.631ms; driver.publication 1.523ms |
| f62327ee106316160000000000000794 | 74.963 | 7.740 | 3.498 | 0.000 | 0.018 | 16.518 | 0.796 | 0.000 | 0.000 | 1.755 | 44.613 | n/a | n/a | 0.025 | 11.256 | 0.150 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.493ms; driver.publication 2.440ms; driver.publication 1.326ms; driver.publication 1.317ms; driver.publication 1.233ms |
| f62327ee10631616000000000000083d | 73.921 | 4.116 | n/a | 0.000 | 49.358 | 9.674 | 0.087 | 0.000 | 0.000 | 0.000 | 10.645 | n/a | n/a | 0.040 | 53.474 | 0.723 | 0.040 | node-15/thread-0/driver.queue.subject | driver.publication 1.578ms; driver.publication 1.348ms; driver.publication 1.323ms; driver.publication 1.244ms; driver.publication 1.083ms |
| f62327ee1063161600000000000007d2 | 73.657 | 62.415 | n/a | 3.732 | 7.460 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 73.607 | 0.999 | 0.050 | node-15/thread-0/client.persist-and-resolve | driver.publication 4.300ms; driver.publication 1.610ms; driver.expected-state.bind-receipt 1.493ms; driver.publication 1.433ms; driver.publication 1.357ms |
| f62327ee10631616000000000000083c | 72.443 | 3.406 | n/a | 0.000 | 40.939 | 5.188 | 0.378 | 0.000 | 0.000 | 0.000 | 22.449 | n/a | n/a | 0.081 | 44.346 | 0.612 | 0.081 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 1.348ms; driver.publication 1.244ms |
| f62327ee1063161600000000000007d7 | 72.023 | 64.930 | n/a | 3.732 | 3.294 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.066 | 71.957 | 0.999 | 0.066 | node-15/thread-0/client.persist-and-resolve | driver.publication 1.548ms; driver.expected-state.bind-receipt 1.493ms; driver.publication 1.433ms; driver.publication 1.316ms; driver.publication 1.276ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.702 | 0.706 | 0.000 | 1.571 | 3.419 | n/a | 0.000 | 0.827 | 5.281 | 0.243 | 0.000 | 0.000 | 0.000 | 4.287 | n/a | n/a | 0.040 | 4.510 | 0.302 | 0.040 |
| p99 | 75.645 | 2.769 | 0.391 | 4.730 | 36.652 | n/a | 2.127 | 29.062 | 17.517 | 4.264 | 2.021 | 1.275 | 3.404 | 54.474 | n/a | n/a | 0.133 | 48.770 | 0.999 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000000a0a | 132.071 | 5.223 | n/a | 0.000 | 68.519 | 5.391 | 0.240 | 0.000 | 0.000 | 10.388 | 42.257 | n/a | n/a | 0.052 | 73.742 | 0.558 | 0.052 | node-15/thread-0/driver.queue.subject | driver.publication 2.031ms; driver.publication 1.617ms; driver.publication 1.523ms; driver.publication 1.406ms; driver.publication 1.384ms |
| f62327ee106316160000000000000baf | 121.341 | 15.030 | n/a | 0.000 | 11.384 | 24.137 | 0.894 | 14.924 | 0.000 | 0.058 | 54.474 | n/a | n/a | 0.440 | 26.414 | 0.218 | 0.440 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | client.encode 2.148ms; driver.publication 1.783ms; driver.expected-state.bind-receipt 1.060ms |
| f62327ee106316160000000000000bae | 106.311 | 12.213 | n/a | 0.000 | 7.066 | 5.837 | 14.912 | 8.390 | 0.000 | 1.365 | 56.460 | n/a | n/a | 0.069 | 19.280 | 0.181 | 0.069 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.506ms |
| f62327ee10631616000000000000075c | 84.190 | 5.587 | n/a | 0.000 | 49.639 | 5.338 | 0.487 | 0.000 | 0.000 | 0.000 | 23.084 | n/a | n/a | 0.056 | 55.226 | 0.656 | 0.056 | node-15/thread-0/driver.queue.subject | driver.publication 2.246ms; driver.publication 1.523ms; driver.publication 1.389ms |
| f62327ee106316160000000000000a07 | 75.645 | 3.901 | n/a | 0.000 | 0.711 | 5.337 | 0.407 | 0.000 | 0.000 | 0.000 | 65.239 | n/a | n/a | 0.050 | 4.612 | 0.061 | 0.050 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 2.141ms; driver.expected-state.bind-receipt 1.067ms |
| f62327ee106316160000000000000759 | 75.337 | 3.807 | n/a | 0.000 | 4.131 | 7.131 | 0.295 | 1.043 | 0.000 | 0.315 | 58.578 | n/a | n/a | 0.037 | 7.938 | 0.105 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.631ms; driver.publication 1.523ms |
| f62327ee10631616000000000000083c | 72.443 | 3.406 | n/a | 0.000 | 40.939 | 5.188 | 0.378 | 0.000 | 0.000 | 0.000 | 22.449 | n/a | n/a | 0.081 | 44.346 | 0.612 | 0.081 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 1.348ms; driver.publication 1.244ms |
| f62327ee1063161600000000000007d7 | 72.023 | 64.930 | n/a | 3.732 | 3.294 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.066 | 71.957 | 0.999 | 0.066 | node-15/thread-0/client.persist-and-resolve | driver.publication 1.548ms; driver.expected-state.bind-receipt 1.493ms; driver.publication 1.433ms; driver.publication 1.316ms; driver.publication 1.276ms |
| f62327ee106316160000000000000c02 | 69.866 | 5.453 | n/a | 0.000 | 15.610 | 5.271 | 0.298 | 0.042 | 0.000 | 0.159 | 42.975 | n/a | n/a | 0.057 | 21.063 | 0.301 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| f62327ee10631616000000000000075a | 67.112 | 5.182 | n/a | 0.000 | 0.963 | 10.392 | 0.343 | 0.000 | 0.000 | 0.000 | 50.114 | n/a | n/a | 0.119 | 6.145 | 0.092 | 0.119 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.523ms; driver.publication 1.389ms |
| f62327ee1063161600000000000007d8 | 65.110 | 3.424 | n/a | 0.000 | 0.329 | 5.180 | 0.236 | 0.000 | 0.000 | 0.000 | 55.903 | n/a | n/a | 0.038 | 3.753 | 0.058 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.548ms; driver.expected-state.bind-receipt 1.493ms; driver.publication 1.433ms; driver.publication 1.316ms; driver.publication 1.276ms |
| f62327ee106316160000000000000c03 | 61.482 | 5.182 | n/a | 0.000 | 1.148 | 12.233 | 0.185 | 0.000 | 0.000 | 0.540 | 42.163 | n/a | n/a | 0.031 | 6.330 | 0.103 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.305ms; driver.publication 1.112ms |
| f62327ee10631616000000000000069f | 59.420 | 2.840 | n/a | 0.000 | 10.240 | 5.196 | 0.248 | 0.197 | 0.000 | 0.177 | 40.493 | n/a | n/a | 0.030 | 13.079 | 0.220 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.157ms; driver.publication 1.336ms; driver.publication 1.055ms |
| f62327ee1063161600000000000007b3 | 56.588 | 3.638 | n/a | 0.000 | 29.062 | 18.009 | 0.244 | 0.000 | 0.000 | 0.000 | 5.546 | n/a | n/a | 0.089 | 32.700 | 0.578 | 0.089 | node-15/thread-0/driver.queue.scheduler-late | none observed |
| f62327ee106316160000000000000a6d | 55.624 | 2.967 | n/a | 0.000 | 1.061 | 5.288 | 0.720 | 0.000 | 0.000 | 0.000 | 45.549 | n/a | n/a | 0.039 | 4.027 | 0.072 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.128ms |
| f62327ee106316160000000000000a0d | 55.598 | 3.036 | n/a | 0.000 | 2.225 | 17.427 | 0.159 | 0.000 | 0.000 | 0.000 | 32.721 | n/a | n/a | 0.029 | 5.261 | 0.095 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.523ms; driver.publication 1.406ms |
| f62327ee106316160000000000000a0c | 54.098 | 4.704 | n/a | 0.000 | 1.110 | 15.731 | 0.292 | 0.000 | 0.000 | 0.000 | 32.192 | n/a | n/a | 0.067 | 5.814 | 0.107 | 0.067 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 2.031ms; driver.publication 1.406ms |
| f62327ee106316160000000000000796 | 53.393 | 5.045 | n/a | 0.000 | 10.219 | 7.948 | 0.301 | 0.000 | 0.000 | 1.505 | 28.319 | n/a | n/a | 0.056 | 15.264 | 0.286 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 1.317ms; driver.publication 1.233ms; driver.publication 1.172ms; driver.publication 1.131ms; driver.publication 1.101ms |
| f62327ee10631616000000000000077c | 51.525 | 3.061 | n/a | 0.000 | 0.139 | 9.670 | 9.545 | 0.128 | 13.228 | 0.370 | 15.359 | n/a | n/a | 0.026 | 3.199 | 0.062 | 0.026 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.354ms; driver.publication 1.831ms; driver.publication 1.057ms |
| f62327ee1063161600000000000009fd | 51.418 | 4.141 | n/a | 0.000 | 0.833 | 5.654 | 0.436 | 0.000 | 0.000 | 0.000 | 40.299 | n/a | n/a | 0.056 | 4.974 | 0.097 | 0.056 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.608 | 0.777 | 0.000 | 1.641 | 3.836 | n/a | 0.000 | 0.790 | 5.247 | 0.219 | 0.000 | 0.000 | 0.000 | 3.437 | n/a | n/a | 0.036 | 4.988 | 0.340 | 0.036 |
| p99 | 123.212 | 3.358 | 2.435 | 5.830 | 52.354 | n/a | 3.859 | 68.946 | 31.800 | 6.488 | 1.858 | 0.190 | 3.212 | 40.527 | n/a | n/a | 0.103 | 90.366 | 1.000 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000001558 | 253.361 | 26.356 | n/a | 0.000 | 50.851 | 27.284 | 86.712 | 0.141 | 0.000 | 3.413 | 58.526 | n/a | n/a | 0.078 | 77.207 | 0.305 | 0.078 | gw-w/thread-52/gateway.admitted-work | driver.publication 11.066ms; driver.publication 4.040ms; driver.publication 2.997ms; driver.publication 2.567ms; driver.publication 2.439ms |
| f62327ee106316160000000000001be3 | 231.259 | 4.783 | n/a | 0.000 | 38.872 | 177.124 | 0.484 | 0.000 | 0.000 | 0.000 | 9.924 | n/a | n/a | 0.072 | 43.656 | 0.189 | 0.072 | node-15/thread-0/socket.wait-first-byte | client.parse 1.806ms; client.parse 1.563ms |
| f62327ee106316160000000000001be4 | 224.444 | 202.229 | n/a | 19.459 | 2.727 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 224.414 | 1.000 | 0.030 | node-15/thread-0/client.persist-and-resolve | driver.publication 1.844ms; client.parse 1.806ms; client.parse 1.563ms; driver.publication 1.210ms |
| f62327ee106316160000000000001be8 | 222.522 | 53.051 | n/a | 0.000 | 169.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 222.486 | 1.000 | 0.036 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 2.123ms; driver.publication 2.034ms; driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.351ms |
| f62327ee106316160000000000001be6 | 213.881 | 4.635 | n/a | 0.000 | 162.576 | 37.812 | 0.239 | 0.000 | 0.000 | 0.000 | 8.560 | n/a | n/a | 0.058 | 167.211 | 0.782 | 0.058 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.210ms |
| f62327ee10631616000000000000154e | 202.819 | 11.435 | 3.809 | 0.000 | 0.152 | 11.087 | 116.589 | 0.156 | 0.000 | 0.328 | 59.154 | n/a | n/a | 0.111 | 15.396 | 0.076 | 0.111 | gw-w/thread-48/gateway.admitted-work | driver.publication 11.066ms; driver.publication 8.073ms; driver.publication 5.648ms; driver.publication 4.040ms; driver.publication 2.567ms |
| f62327ee10631616000000000000155c | 192.779 | 9.992 | n/a | 0.000 | 10.999 | 28.900 | 24.961 | 61.365 | 0.000 | 0.810 | 55.709 | n/a | n/a | 0.044 | 20.991 | 0.109 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 4.040ms; driver.publication 2.997ms; driver.expected-state.bind-receipt 2.051ms; driver.publication 1.800ms; driver.publication 1.704ms |
| f62327ee106316160000000000001be7 | 186.905 | 47.117 | n/a | 5.859 | 133.898 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 186.874 | 1.000 | 0.031 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 2.123ms; driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee10631616000000000000120c | 177.516 | 5.196 | n/a | 0.000 | 107.630 | 48.702 | 0.344 | 0.000 | 0.000 | 0.000 | 15.607 | n/a | n/a | 0.036 | 112.826 | 0.636 | 0.036 | node-15/thread-0/driver.queue.subject | driver.publication 2.822ms; driver.publication 2.785ms; driver.publication 2.638ms; driver.publication 1.592ms; driver.publication 1.456ms |
| f62327ee106316160000000000001be9 | 165.915 | 49.556 | n/a | 5.859 | 110.477 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 165.892 | 1.000 | 0.022 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 2.123ms; driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee106316160000000000001215 | 164.739 | 2.803 | n/a | 0.000 | 117.126 | 32.521 | 0.199 | 0.000 | 0.000 | 0.000 | 12.054 | n/a | n/a | 0.036 | 119.929 | 0.728 | 0.036 | node-15/thread-0/driver.queue.subject | driver.publication 2.638ms; driver.publication 2.030ms; driver.publication 1.456ms; driver.publication 1.324ms; driver.publication 1.245ms |
| f62327ee10631616000000000000121e | 151.974 | 5.134 | n/a | 0.000 | 131.625 | 13.043 | 0.205 | 0.000 | 0.000 | 0.000 | 1.936 | n/a | n/a | 0.031 | 136.758 | 0.900 | 0.031 | node-15/thread-0/driver.queue.subject | driver.publication 2.030ms; driver.publication 1.849ms; driver.publication 1.324ms; client.parse 1.233ms; driver.publication 1.214ms |
| f62327ee106316160000000000001980 | 150.741 | 37.806 | n/a | 0.000 | 5.102 | 46.544 | 4.170 | 1.858 | 0.000 | 0.723 | 54.491 | n/a | n/a | 0.046 | 42.909 | 0.285 | 0.046 | node-15/thread-0/socket.wait-first-byte | driver.publication 3.782ms; driver.publication 2.777ms; driver.expected-state.bind-receipt 2.313ms; driver.publication 2.132ms; driver.publication 2.029ms |
| f62327ee106316160000000000001f31 | 136.174 | 7.177 | n/a | 0.000 | 32.929 | 52.923 | 0.983 | 0.059 | 0.000 | 0.619 | 41.452 | n/a | n/a | 0.032 | 40.106 | 0.295 | 0.032 | node-15/thread-0/socket.wait-first-byte | client.parse 4.065ms; driver.publication 1.281ms; driver.publication 1.255ms; driver.publication 1.172ms |
| f62327ee106316160000000000001207 | 136.118 | 98.709 | n/a | 13.870 | 23.471 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 136.049 | 0.999 | 0.069 | node-15/thread-0/client.persist-and-resolve | driver.publication 17.324ms; driver.publication 2.822ms; driver.publication 2.785ms; driver.expected-state.bind-receipt 2.175ms; driver.publication 1.592ms |
| f62327ee106316160000000000001bec | 132.535 | 45.659 | n/a | 0.000 | 86.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 132.500 | 1.000 | 0.034 | node-15/thread-0/driver.queue.subject | driver.publication 2.123ms; driver.publication 2.034ms; driver.publication 1.844ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee106316160000000000001206 | 131.908 | 91.599 | n/a | 13.870 | 26.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 131.867 | 1.000 | 0.041 | node-15/thread-0/client.persist-and-resolve | driver.publication 20.683ms; driver.publication 2.822ms; driver.publication 2.785ms; driver.expected-state.bind-receipt 2.175ms |
| f62327ee106316160000000000001985 | 131.642 | 9.158 | n/a | 0.000 | 84.010 | 5.192 | 2.036 | 0.058 | 0.000 | 4.952 | 26.192 | n/a | n/a | 0.043 | 93.168 | 0.708 | 0.043 | node-15/thread-0/driver.queue.subject | driver.publication 3.782ms; driver.publication 2.777ms; driver.publication 2.461ms; driver.expected-state.bind-receipt 2.313ms; driver.publication 2.132ms |
| f62327ee106316160000000000001f47 | 129.456 | 2.881 | n/a | 0.000 | 104.002 | 8.727 | 0.228 | 0.000 | 0.000 | 0.378 | 13.194 | n/a | n/a | 0.047 | 106.882 | 0.826 | 0.047 | node-15/thread-0/driver.queue.subject | driver.publication 1.343ms; driver.publication 1.261ms; driver.publication 1.188ms; driver.publication 1.185ms; driver.publication 1.154ms |
| f62327ee1063161600000000000014b0 | 129.169 | 4.632 | n/a | 0.000 | 80.436 | 33.842 | 0.245 | 0.000 | 0.000 | 1.133 | 8.842 | n/a | n/a | 0.039 | 85.068 | 0.659 | 0.039 | node-15/thread-0/driver.queue.scheduler-late | client.parse 1.792ms; driver.publication 1.163ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.750 | 0.668 | 0.000 | 1.506 | 3.322 | n/a | 0.000 | 0.794 | 5.240 | 0.212 | 0.000 | 0.000 | 0.000 | 2.620 | n/a | n/a | 0.035 | 4.306 | 0.331 | 0.035 |
| p99 | 124.094 | 2.401 | 1.960 | 5.072 | 49.556 | n/a | 4.068 | 78.522 | 39.843 | 3.853 | 1.999 | 0.000 | 2.888 | 39.797 | n/a | n/a | 0.100 | 95.522 | 1.000 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f62327ee106316160000000000001be3 | 231.259 | 4.783 | n/a | 0.000 | 38.872 | 177.124 | 0.484 | 0.000 | 0.000 | 0.000 | 9.924 | n/a | n/a | 0.072 | 43.656 | 0.189 | 0.072 | node-15/thread-0/socket.wait-first-byte | client.parse 1.806ms; client.parse 1.563ms |
| f62327ee106316160000000000001be4 | 224.444 | 202.229 | n/a | 19.459 | 2.727 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 224.414 | 1.000 | 0.030 | node-15/thread-0/client.persist-and-resolve | driver.publication 1.844ms; client.parse 1.806ms; client.parse 1.563ms; driver.publication 1.210ms |
| f62327ee106316160000000000001be8 | 222.522 | 53.051 | n/a | 0.000 | 169.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 222.486 | 1.000 | 0.036 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 2.123ms; driver.publication 2.034ms; driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.351ms |
| f62327ee106316160000000000001be6 | 213.881 | 4.635 | n/a | 0.000 | 162.576 | 37.812 | 0.239 | 0.000 | 0.000 | 0.000 | 8.560 | n/a | n/a | 0.058 | 167.211 | 0.782 | 0.058 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.210ms |
| f62327ee10631616000000000000155c | 192.779 | 9.992 | n/a | 0.000 | 10.999 | 28.900 | 24.961 | 61.365 | 0.000 | 0.810 | 55.709 | n/a | n/a | 0.044 | 20.991 | 0.109 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 4.040ms; driver.publication 2.997ms; driver.expected-state.bind-receipt 2.051ms; driver.publication 1.800ms; driver.publication 1.704ms |
| f62327ee106316160000000000001be7 | 186.905 | 47.117 | n/a | 5.859 | 133.898 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 186.874 | 1.000 | 0.031 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 2.123ms; driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee10631616000000000000120c | 177.516 | 5.196 | n/a | 0.000 | 107.630 | 48.702 | 0.344 | 0.000 | 0.000 | 0.000 | 15.607 | n/a | n/a | 0.036 | 112.826 | 0.636 | 0.036 | node-15/thread-0/driver.queue.subject | driver.publication 2.822ms; driver.publication 2.785ms; driver.publication 2.638ms; driver.publication 1.592ms; driver.publication 1.456ms |
| f62327ee106316160000000000001be9 | 165.915 | 49.556 | n/a | 5.859 | 110.477 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 165.892 | 1.000 | 0.022 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 2.123ms; driver.publication 1.844ms; client.parse 1.806ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee106316160000000000001215 | 164.739 | 2.803 | n/a | 0.000 | 117.126 | 32.521 | 0.199 | 0.000 | 0.000 | 0.000 | 12.054 | n/a | n/a | 0.036 | 119.929 | 0.728 | 0.036 | node-15/thread-0/driver.queue.subject | driver.publication 2.638ms; driver.publication 2.030ms; driver.publication 1.456ms; driver.publication 1.324ms; driver.publication 1.245ms |
| f62327ee106316160000000000001980 | 150.741 | 37.806 | n/a | 0.000 | 5.102 | 46.544 | 4.170 | 1.858 | 0.000 | 0.723 | 54.491 | n/a | n/a | 0.046 | 42.909 | 0.285 | 0.046 | node-15/thread-0/socket.wait-first-byte | driver.publication 3.782ms; driver.publication 2.777ms; driver.expected-state.bind-receipt 2.313ms; driver.publication 2.132ms; driver.publication 2.029ms |
| f62327ee106316160000000000001207 | 136.118 | 98.709 | n/a | 13.870 | 23.471 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 136.049 | 0.999 | 0.069 | node-15/thread-0/client.persist-and-resolve | driver.publication 17.324ms; driver.publication 2.822ms; driver.publication 2.785ms; driver.expected-state.bind-receipt 2.175ms; driver.publication 1.592ms |
| f62327ee106316160000000000001bec | 132.535 | 45.659 | n/a | 0.000 | 86.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 132.500 | 1.000 | 0.034 | node-15/thread-0/driver.queue.subject | driver.publication 2.123ms; driver.publication 2.034ms; driver.publication 1.844ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee106316160000000000001f47 | 129.456 | 2.881 | n/a | 0.000 | 104.002 | 8.727 | 0.228 | 0.000 | 0.000 | 0.378 | 13.194 | n/a | n/a | 0.047 | 106.882 | 0.826 | 0.047 | node-15/thread-0/driver.queue.subject | driver.publication 1.343ms; driver.publication 1.261ms; driver.publication 1.188ms; driver.publication 1.185ms; driver.publication 1.154ms |
| f62327ee106316160000000000001bed | 128.918 | 2.643 | n/a | 0.000 | 118.583 | 5.166 | 0.207 | 0.000 | 0.000 | 0.000 | 2.293 | n/a | n/a | 0.025 | 121.227 | 0.940 | 0.025 | node-15/thread-0/driver.queue.subject | driver.publication 2.123ms; driver.publication 2.034ms; driver.publication 1.844ms; driver.publication 1.351ms; driver.publication 1.210ms |
| f62327ee10631616000000000000120a | 125.446 | 6.140 | n/a | 0.000 | 112.083 | 5.386 | 0.276 | 0.000 | 0.000 | 0.000 | 1.486 | n/a | n/a | 0.076 | 118.223 | 0.942 | 0.076 | node-15/thread-0/driver.queue.subject | driver.publication 2.822ms; driver.publication 2.785ms; driver.publication 1.592ms; driver.publication 1.456ms; driver.expected-state.bind-receipt 1.411ms |
| f62327ee1063161600000000000014ae | 124.094 | 3.373 | n/a | 0.000 | 0.296 | 114.529 | 0.258 | 0.000 | 0.000 | 0.000 | 5.592 | n/a | n/a | 0.046 | 3.669 | 0.030 | 0.046 | node-15/thread-0/socket.wait-first-byte | client.parse 1.792ms |
| f62327ee106316160000000000001f45 | 123.314 | 3.088 | n/a | 0.000 | 87.278 | 6.932 | 2.001 | 0.080 | 0.000 | 1.260 | 22.635 | n/a | n/a | 0.041 | 90.366 | 0.733 | 0.041 | node-15/thread-0/driver.queue.subject | driver.publication 1.343ms; driver.publication 1.261ms; driver.publication 1.188ms; driver.publication 1.185ms; driver.publication 1.154ms |
| f62327ee106316160000000000001205 | 123.212 | 10.987 | n/a | 0.000 | 31.866 | 10.947 | 4.200 | 0.223 | 0.000 | 0.920 | 63.958 | n/a | n/a | 0.111 | 42.853 | 0.348 | 0.111 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 26.836ms; driver.expected-state.bind-receipt 2.175ms |
| f62327ee10631616000000000000155a | 122.769 | 11.765 | n/a | 0.000 | 11.725 | 48.749 | 19.267 | 0.128 | 0.000 | 5.029 | 26.012 | n/a | n/a | 0.094 | 23.490 | 0.191 | 0.094 | node-15/thread-0/socket.wait-first-byte | driver.publication 9.516ms; driver.publication 4.040ms; driver.publication 2.439ms; driver.publication 1.704ms; driver.expected-state.bind-receipt 1.058ms |
| f62327ee1063161600000000000014b2 | 121.633 | 47.553 | n/a | 6.708 | 67.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 121.618 | 1.000 | 0.015 | node-15/thread-0/driver.queue.scheduler-late | driver.publication 1.532ms; driver.publication 1.328ms; driver.publication 1.163ms; driver.publication 1.072ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.338 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 200.339 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 |
| p99 | 222.142 | n/a | n/a | n/a | 20.699 | n/a | 1.529 | 0.000 | 7.113 | 201.570 | 0.168 | 28.076 | 0.209 | 0.000 | n/a | n/a | 47.190 | 20.699 | 0.267 | 47.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d0000000000000002 | 222.142 | 2.058 | n/a | 0.000 | 0.000 | 2.152 | 189.300 | 0.168 | 28.076 | 0.000 | 0.000 | n/a | n/a | 0.388 | 2.058 | 0.009 | 0.388 | gw-r/thread-51/gateway.admitted-work | none observed |
| 1631c30179c3b0450000000000000007 | 203.534 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 201.541 | 0.023 | 0.000 | 0.209 | 0.000 | n/a | n/a | 0.418 | 0.000 | 0.000 | 0.418 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000006 | 202.946 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.570 | 0.021 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000005 | 202.253 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.042 | 0.021 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.287 | 0.000 | 0.000 | 0.287 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000ed7 | 201.508 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 200.573 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000ed8 | 201.338 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 200.431 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000ed6 | 201.218 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 200.339 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000edb | 105.295 | 18.148 | n/a | 1.529 | 0.000 | 3.062 | 82.382 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.174 | 19.677 | 0.187 | 0.174 | gw-r/thread-53/gateway.admitted-work | none observed |
| 1631c30179c3b0450000000000000edd | 77.394 | 20.699 | n/a | 0.000 | 0.000 | 1.946 | 54.435 | 0.005 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.308 | 20.699 | 0.267 | 0.308 | gw-r/thread-53/gateway.admitted-work | none observed |
| 1631c30179c3b0450000000000000edc | 71.447 | 17.144 | n/a | 0.000 | 0.000 | 7.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 47.190 | 17.144 | 0.240 | 47.190 | node-15/thread-3/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 845.338 | n/a | n/a | n/a | 0.297 | n/a | 0.000 | 0.000 | 1.833 | 818.859 | 0.017 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.452 | 0.297 | 0.000 | 1.452 |
| p99 | 1006.227 | n/a | n/a | n/a | 15.523 | n/a | 0.000 | 0.000 | 2.914 | 1001.973 | 0.020 | 0.000 | 0.652 | 0.000 | n/a | n/a | 7.941 | 15.523 | 0.018 | 7.941 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d00000000000000a4 | 1006.227 | 0.297 | n/a | 0.000 | 0.000 | 1.833 | 1001.973 | 0.020 | 0.000 | 0.652 | 0.000 | n/a | n/a | 1.452 | 0.297 | 0.000 | 1.452 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000a5 | 845.338 | 15.523 | n/a | 0.000 | 0.000 | 2.914 | 818.859 | 0.017 | 0.000 | 0.084 | 0.000 | n/a | n/a | 7.941 | 15.523 | 0.018 | 7.941 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.732 | n/a | n/a | n/a | 3.066 | n/a | 0.000 | 0.000 | 0.819 | 418.659 | 0.019 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.128 | 3.066 | 0.010 | 0.128 |
| p99 | 1005.386 | n/a | n/a | n/a | 8.288 | n/a | 0.000 | 0.000 | 2.223 | 1001.830 | 0.249 | 0.000 | 0.281 | 0.000 | n/a | n/a | 41.395 | 8.288 | 0.394 | 41.395 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d00000000000000b5 | 1005.386 | 0.137 | n/a | 0.000 | 0.000 | 0.810 | 1000.955 | 0.018 | 0.000 | 0.118 | 0.000 | n/a | n/a | 3.348 | 0.137 | 0.000 | 3.348 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000ae | 1004.328 | 0.208 | n/a | 0.000 | 0.000 | 0.944 | 1001.653 | 0.110 | 0.000 | 0.281 | 0.000 | n/a | n/a | 1.132 | 0.208 | 0.000 | 1.132 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000bc | 1004.101 | 0.142 | n/a | 0.000 | 0.000 | 0.787 | 1001.830 | 0.031 | 0.000 | 0.197 | 0.000 | n/a | n/a | 1.115 | 0.142 | 0.000 | 1.115 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000d2 | 1000.110 | 3.372 | n/a | 0.000 | 0.000 | 0.757 | 995.830 | 0.017 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.092 | 3.372 | 0.003 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000be | 965.334 | 4.392 | n/a | 0.000 | 0.000 | 0.791 | 959.812 | 0.022 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.193 | 4.392 | 0.005 | 0.193 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000ab | 896.628 | 2.657 | n/a | 0.000 | 0.000 | 0.751 | 892.937 | 0.025 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.123 | 2.657 | 0.003 | 0.123 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000c4 | 838.342 | 5.875 | n/a | 0.000 | 0.000 | 2.223 | 829.951 | 0.026 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.128 | 5.875 | 0.007 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000a8 | 827.942 | 2.105 | n/a | 0.000 | 0.000 | 0.658 | 824.924 | 0.068 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.113 | 2.105 | 0.003 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000cd | 702.698 | 7.277 | n/a | 0.000 | 0.000 | 0.844 | 694.124 | 0.249 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.106 | 7.277 | 0.010 | 0.106 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000b3 | 628.539 | 2.402 | n/a | 0.000 | 0.000 | 0.950 | 624.993 | 0.018 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.082 | 2.402 | 0.004 | 0.082 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000c2 | 541.990 | 2.569 | n/a | 0.000 | 0.000 | 0.719 | 538.517 | 0.020 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.082 | 2.569 | 0.005 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000c8 | 534.524 | 6.114 | n/a | 0.000 | 0.000 | 0.958 | 527.085 | 0.049 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.195 | 6.114 | 0.011 | 0.195 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000cb | 511.527 | 4.442 | n/a | 0.000 | 0.000 | 2.021 | 504.741 | 0.016 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.140 | 4.442 | 0.009 | 0.140 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000ca | 499.595 | 7.822 | n/a | 0.000 | 0.000 | 2.025 | 488.995 | 0.080 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.478 | 7.822 | 0.016 | 0.478 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000b8 | 429.391 | 3.123 | n/a | 0.000 | 0.000 | 1.282 | 424.802 | 0.013 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.099 | 3.123 | 0.007 | 0.099 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000c7 | 421.732 | 2.015 | n/a | 0.000 | 0.000 | 0.842 | 418.659 | 0.017 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.118 | 2.015 | 0.005 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000a7 | 340.449 | 2.600 | n/a | 0.000 | 0.000 | 0.785 | 336.809 | 0.019 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.122 | 2.600 | 0.008 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000b1 | 317.955 | 5.044 | n/a | 0.000 | 0.000 | 1.017 | 311.656 | 0.023 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.127 | 5.044 | 0.016 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000ba | 289.103 | 2.614 | n/a | 0.000 | 0.000 | 0.766 | 285.530 | 0.031 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.089 | 2.614 | 0.009 | 0.089 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000ce | 251.208 | 2.839 | n/a | 0.000 | 0.000 | 0.796 | 247.261 | 0.142 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.103 | 2.839 | 0.011 | 0.103 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 399.873 | n/a | n/a | n/a | 4.355 | n/a | 0.569 | 0.000 | 0.870 | 391.602 | 0.021 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.145 | 5.161 | 0.018 | 0.145 |
| p99 | 1005.483 | n/a | n/a | n/a | 19.018 | n/a | 1.916 | 0.000 | 2.198 | 1001.488 | 0.573 | 0.000 | 0.353 | 0.000 | n/a | n/a | 39.059 | 20.934 | 0.583 | 39.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d00000000000000dd | 1005.483 | 6.483 | n/a | 0.000 | 0.000 | 0.911 | 997.762 | 0.031 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.178 | 6.483 | 0.006 | 0.178 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000110 | 1004.272 | 0.259 | n/a | 0.000 | 0.000 | 0.951 | 1001.488 | 0.049 | 0.000 | 0.353 | 0.000 | n/a | n/a | 1.172 | 0.259 | 0.000 | 1.172 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000d4 | 1003.585 | 0.138 | n/a | 0.000 | 0.000 | 0.827 | 1001.269 | 0.021 | 0.000 | 0.204 | 0.000 | n/a | n/a | 1.126 | 0.138 | 0.000 | 1.126 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000db | 1003.318 | 0.172 | n/a | 0.000 | 0.000 | 0.893 | 1000.978 | 0.021 | 0.000 | 0.107 | 0.000 | n/a | n/a | 1.147 | 0.172 | 0.000 | 1.147 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000d3 | 997.539 | 3.780 | n/a | 0.000 | 0.000 | 0.766 | 992.806 | 0.015 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.097 | 3.780 | 0.004 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000e2 | 995.064 | 2.581 | n/a | 0.000 | 0.000 | 0.781 | 991.490 | 0.021 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.112 | 2.581 | 0.003 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000108 | 991.049 | 3.831 | n/a | 0.000 | 0.000 | 0.762 | 986.117 | 0.042 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.146 | 3.831 | 0.004 | 0.146 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000101 | 988.630 | 3.512 | n/a | 0.000 | 0.000 | 0.786 | 982.531 | 0.573 | 0.000 | 0.089 | 0.000 | n/a | n/a | 1.140 | 3.512 | 0.004 | 1.140 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000103 | 985.221 | 4.210 | n/a | 0.794 | 0.000 | 0.906 | 979.076 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.114 | 5.004 | 0.005 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000e1 | 925.923 | 2.737 | n/a | 0.000 | 0.000 | 0.876 | 922.116 | 0.021 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.102 | 2.737 | 0.003 | 0.102 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000e3 | 870.847 | 19.018 | n/a | 1.916 | 0.000 | 2.020 | 847.651 | 0.015 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.145 | 20.934 | 0.024 | 0.145 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000105 | 822.909 | 3.267 | n/a | 0.000 | 0.000 | 0.941 | 818.441 | 0.027 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.108 | 3.267 | 0.004 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000e7 | 763.176 | 6.490 | n/a | 1.626 | 0.000 | 0.968 | 753.798 | 0.044 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.118 | 8.116 | 0.011 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000ee | 668.133 | 3.096 | n/a | 0.569 | 0.000 | 0.765 | 663.483 | 0.043 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.099 | 3.665 | 0.005 | 0.099 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000fe | 623.351 | 5.642 | n/a | 0.826 | 0.000 | 0.884 | 615.474 | 0.188 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.229 | 6.468 | 0.010 | 0.229 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000eb | 548.826 | 5.043 | n/a | 1.040 | 0.000 | 0.783 | 541.611 | 0.061 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.174 | 6.083 | 0.011 | 0.174 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000de | 533.104 | 5.897 | n/a | 0.000 | 0.000 | 0.870 | 526.114 | 0.017 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.141 | 5.897 | 0.011 | 0.141 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000df | 527.154 | 6.993 | n/a | 0.000 | 0.000 | 1.131 | 518.702 | 0.024 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.214 | 6.993 | 0.013 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000010a | 468.474 | 16.589 | n/a | 1.605 | 0.000 | 0.999 | 448.499 | 0.344 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.288 | 18.194 | 0.039 | 0.288 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000000e9 | 453.779 | 4.613 | n/a | 1.232 | 0.000 | 0.796 | 447.035 | 0.010 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.083 | 5.844 | 0.013 | 0.083 | gw-r/thread-50/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 365.095 | n/a | n/a | n/a | 3.447 | n/a | 0.000 | 0.000 | 0.883 | 351.323 | 0.014 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.132 | 3.781 | 0.012 | 0.132 |
| p99 | 1004.437 | n/a | n/a | n/a | 17.989 | n/a | 2.155 | 0.000 | 2.653 | 1001.767 | 0.493 | 30.189 | 0.173 | 0.000 | n/a | n/a | 45.455 | 19.378 | 0.198 | 45.455 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d0000000000000118 | 1004.437 | 0.250 | n/a | 0.000 | 0.000 | 1.040 | 1001.767 | 0.038 | 0.000 | 0.173 | 0.000 | n/a | n/a | 1.169 | 0.250 | 0.000 | 1.169 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000012e | 1003.380 | 0.089 | n/a | 0.000 | 0.000 | 1.722 | 1000.373 | 0.021 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.097 | 0.089 | 0.000 | 1.097 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000013c | 1001.085 | 2.819 | n/a | 0.000 | 0.000 | 2.653 | 995.471 | 0.014 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.062 | 2.819 | 0.003 | 0.062 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000012a | 990.775 | 2.984 | n/a | 0.000 | 0.000 | 2.039 | 985.583 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.092 | 2.984 | 0.003 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000130 | 988.085 | 3.132 | n/a | 0.696 | 0.000 | 0.742 | 983.155 | 0.161 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.135 | 3.828 | 0.004 | 0.135 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000121 | 979.979 | 3.311 | n/a | 0.000 | 0.000 | 0.800 | 975.624 | 0.024 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.132 | 3.311 | 0.003 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000145 | 917.375 | 3.221 | n/a | 0.000 | 0.000 | 1.000 | 912.982 | 0.012 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.107 | 3.221 | 0.004 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000115 | 862.172 | 3.115 | n/a | 0.000 | 0.000 | 0.704 | 858.177 | 0.012 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.105 | 3.115 | 0.004 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000012b | 798.022 | 9.043 | n/a | 0.777 | 0.000 | 1.877 | 786.144 | 0.014 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.097 | 9.820 | 0.012 | 0.097 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000122 | 783.600 | 3.383 | n/a | 0.000 | 0.000 | 0.808 | 747.721 | 0.021 | 30.189 | 0.084 | 0.000 | n/a | n/a | 1.395 | 3.383 | 0.004 | 1.395 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000139 | 722.732 | 3.405 | n/a | 0.000 | 0.000 | 0.795 | 718.139 | 0.171 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.168 | 3.405 | 0.005 | 0.168 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000014c | 699.704 | 4.103 | n/a | 0.000 | 0.000 | 0.903 | 694.124 | 0.411 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.104 | 4.103 | 0.006 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000141 | 685.187 | 3.551 | n/a | 0.000 | 0.000 | 0.743 | 680.723 | 0.011 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.105 | 3.551 | 0.005 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000137 | 668.799 | 5.358 | n/a | 0.000 | 0.000 | 1.224 | 662.036 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.102 | 5.358 | 0.008 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000146 | 662.024 | 3.781 | n/a | 0.000 | 0.000 | 0.774 | 657.287 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.127 | 3.781 | 0.006 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000129 | 650.175 | 3.740 | n/a | 0.675 | 0.000 | 0.904 | 643.985 | 0.493 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.285 | 4.415 | 0.007 | 0.285 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000013d | 627.940 | 17.989 | n/a | 0.743 | 0.000 | 1.092 | 607.879 | 0.016 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.130 | 18.731 | 0.030 | 0.130 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000133 | 625.932 | 3.284 | n/a | 0.658 | 0.000 | 0.731 | 621.034 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.129 | 3.943 | 0.006 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000112 | 576.418 | 3.875 | n/a | 0.000 | 0.000 | 2.129 | 570.173 | 0.015 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.137 | 3.875 | 0.007 | 0.137 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000131 | 389.427 | 2.444 | n/a | 0.000 | 0.000 | 0.853 | 385.695 | 0.229 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.108 | 2.444 | 0.006 | 0.108 | gw-r/thread-51/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 416.027 | n/a | n/a | n/a | 3.123 | n/a | 0.000 | 0.000 | 0.810 | 411.159 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.107 | 3.131 | 0.010 | 0.107 |
| p99 | 1008.995 | n/a | n/a | n/a | 10.141 | n/a | 0.840 | 0.000 | 10.832 | 1001.393 | 0.698 | 0.345 | 0.118 | 0.000 | n/a | n/a | 41.380 | 10.141 | 0.487 | 41.380 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d000000000000018a | 1008.995 | 0.549 | n/a | 0.000 | 0.000 | 5.704 | 1001.393 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.249 | 0.549 | 0.001 | 1.249 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000158 | 1004.775 | 0.159 | n/a | 0.000 | 0.000 | 3.036 | 1000.401 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 1.149 | 0.159 | 0.000 | 1.149 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000169 | 1002.798 | 0.121 | n/a | 0.000 | 0.000 | 0.777 | 1000.725 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.112 | 0.121 | 0.000 | 1.112 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000173 | 1002.517 | 0.124 | n/a | 0.000 | 0.000 | 0.716 | 1000.504 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.108 | 0.124 | 0.000 | 1.108 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000184 | 988.299 | 2.443 | n/a | 0.000 | 0.000 | 0.806 | 984.941 | 0.007 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.443 | 0.002 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000018c | 938.848 | 4.265 | n/a | 0.000 | 0.000 | 0.788 | 933.204 | 0.406 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.109 | 4.265 | 0.005 | 0.109 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000179 | 923.566 | 2.628 | n/a | 0.000 | 0.000 | 2.724 | 918.100 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.077 | 2.628 | 0.003 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000015e | 787.637 | 3.131 | n/a | 0.000 | 0.000 | 0.957 | 783.371 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.131 | 3.131 | 0.004 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000015a | 761.486 | 2.862 | n/a | 0.000 | 0.000 | 0.810 | 757.620 | 0.014 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.129 | 2.862 | 0.004 | 0.129 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000017f | 752.348 | 2.531 | n/a | 0.000 | 0.000 | 2.499 | 747.052 | 0.129 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.081 | 2.531 | 0.003 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000153 | 632.428 | 2.039 | n/a | 0.000 | 0.000 | 0.741 | 629.493 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.113 | 2.039 | 0.003 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000188 | 603.607 | 3.939 | n/a | 0.000 | 0.000 | 0.703 | 598.836 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.093 | 3.939 | 0.007 | 0.093 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000016b | 577.558 | 6.066 | n/a | 0.000 | 0.000 | 4.568 | 566.664 | 0.123 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.089 | 6.066 | 0.011 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000017c | 558.250 | 2.619 | n/a | 0.000 | 0.000 | 0.759 | 554.763 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.075 | 2.619 | 0.005 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000182 | 552.876 | 2.507 | n/a | 0.000 | 0.000 | 0.731 | 549.472 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.120 | 2.507 | 0.005 | 0.120 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000018e | 548.485 | 3.374 | n/a | 0.840 | 0.000 | 0.763 | 543.351 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.104 | 4.214 | 0.008 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000176 | 541.023 | 2.691 | n/a | 0.000 | 0.000 | 0.743 | 537.337 | 0.123 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.094 | 2.691 | 0.005 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000172 | 515.160 | 7.397 | n/a | 0.000 | 0.000 | 0.955 | 506.543 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.226 | 7.397 | 0.014 | 0.226 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000181 | 456.241 | 2.105 | n/a | 0.000 | 0.000 | 0.727 | 453.255 | 0.025 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.103 | 2.105 | 0.005 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000018d | 450.196 | 3.123 | n/a | 0.000 | 0.000 | 0.814 | 446.075 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.109 | 3.123 | 0.007 | 0.109 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 328.505 | n/a | n/a | n/a | 3.687 | n/a | 0.000 | 0.000 | 0.822 | 324.025 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.109 | 3.687 | 0.013 | 0.109 |
| p99 | 1004.450 | n/a | n/a | n/a | 23.784 | n/a | 1.418 | 0.000 | 7.713 | 1000.944 | 0.538 | 0.000 | 0.078 | 0.000 | n/a | n/a | 45.246 | 23.784 | 0.696 | 45.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d0000000000000190 | 1004.450 | 0.194 | n/a | 0.000 | 0.000 | 2.118 | 1000.944 | 0.014 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.114 | 0.194 | 0.000 | 1.114 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ca | 1003.126 | 2.487 | n/a | 0.000 | 0.000 | 2.540 | 997.834 | 0.151 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.082 | 2.487 | 0.002 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ad | 1001.957 | 2.899 | n/a | 0.000 | 0.000 | 0.822 | 998.094 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.103 | 2.899 | 0.003 | 0.103 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ac | 999.007 | 4.263 | n/a | 0.000 | 0.000 | 0.920 | 993.680 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.093 | 4.263 | 0.004 | 0.093 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001c9 | 980.618 | 3.146 | n/a | 0.000 | 0.000 | 0.753 | 976.389 | 0.143 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.132 | 3.146 | 0.003 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001a0 | 963.455 | 4.216 | n/a | 0.000 | 0.000 | 7.713 | 951.204 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.236 | 4.216 | 0.004 | 0.236 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001aa | 887.162 | 2.956 | n/a | 0.000 | 0.000 | 0.732 | 883.334 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.089 | 2.956 | 0.003 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001a2 | 847.490 | 9.282 | n/a | 0.000 | 0.000 | 3.513 | 834.411 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.231 | 9.282 | 0.011 | 0.231 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001da | 786.216 | 2.093 | n/a | 0.000 | 0.000 | 0.772 | 783.230 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.071 | 2.093 | 0.003 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001c8 | 740.008 | 4.723 | n/a | 0.000 | 0.000 | 0.758 | 734.035 | 0.238 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.204 | 4.723 | 0.006 | 0.204 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001a6 | 654.298 | 5.010 | n/a | 0.000 | 0.000 | 0.945 | 648.177 | 0.028 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.100 | 5.010 | 0.008 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001cb | 644.839 | 5.122 | n/a | 0.000 | 0.000 | 0.938 | 638.324 | 0.163 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.261 | 5.122 | 0.008 | 0.261 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001b5 | 624.366 | 4.927 | n/a | 0.000 | 0.000 | 0.901 | 618.402 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.097 | 4.927 | 0.008 | 0.097 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001bb | 620.497 | 3.930 | n/a | 0.000 | 0.000 | 0.747 | 615.610 | 0.063 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.094 | 3.930 | 0.006 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ae | 619.653 | 5.904 | n/a | 0.000 | 0.000 | 4.231 | 609.349 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.113 | 5.904 | 0.010 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001bd | 600.894 | 23.784 | n/a | 0.000 | 0.000 | 5.355 | 570.580 | 0.538 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.572 | 23.784 | 0.040 | 0.572 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001d6 | 540.005 | 3.294 | n/a | 0.000 | 0.000 | 0.983 | 535.382 | 0.120 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.179 | 3.294 | 0.006 | 0.179 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001d3 | 530.431 | 3.141 | n/a | 0.000 | 0.000 | 0.954 | 526.206 | 0.007 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.089 | 3.141 | 0.006 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000019e | 498.903 | 5.264 | n/a | 0.000 | 0.000 | 0.915 | 492.562 | 0.013 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.094 | 5.264 | 0.011 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001be | 406.448 | 5.189 | n/a | 0.000 | 0.000 | 2.081 | 398.834 | 0.174 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.132 | 5.189 | 0.013 | 0.132 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 308.650 | n/a | n/a | n/a | 3.454 | n/a | 0.000 | 0.000 | 0.781 | 303.572 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.115 | 3.454 | 0.012 | 0.115 |
| p99 | 1004.191 | n/a | n/a | n/a | 13.768 | n/a | 0.000 | 0.000 | 4.002 | 1001.060 | 0.497 | 22.010 | 0.086 | 0.000 | n/a | n/a | 48.285 | 13.768 | 0.780 | 48.285 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d0000000000000219 | 1004.191 | 0.126 | n/a | 0.000 | 0.000 | 1.796 | 1001.060 | 0.013 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.120 | 0.126 | 0.000 | 1.120 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ef | 1002.866 | 0.129 | n/a | 0.000 | 0.000 | 0.778 | 1000.769 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.120 | 0.129 | 0.000 | 1.120 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000204 | 1002.549 | 0.129 | n/a | 0.000 | 0.000 | 0.743 | 1000.458 | 0.008 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.180 | 0.129 | 0.000 | 1.180 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000021e | 1002.433 | 0.135 | n/a | 0.000 | 0.000 | 0.765 | 1000.371 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.109 | 0.135 | 0.000 | 1.109 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000218 | 998.710 | 4.412 | n/a | 0.000 | 0.000 | 0.919 | 993.184 | 0.012 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.131 | 4.412 | 0.004 | 0.131 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000220 | 997.927 | 3.573 | n/a | 0.000 | 0.000 | 0.751 | 993.074 | 0.119 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.379 | 3.573 | 0.004 | 0.379 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000021d | 924.477 | 3.197 | n/a | 0.000 | 0.000 | 2.111 | 918.991 | 0.014 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.115 | 3.197 | 0.003 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000020d | 900.772 | 2.788 | n/a | 0.000 | 0.000 | 0.888 | 896.948 | 0.012 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.101 | 2.788 | 0.003 | 0.101 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000206 | 815.616 | 2.333 | n/a | 0.000 | 0.000 | 0.772 | 812.341 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.123 | 2.333 | 0.003 | 0.123 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001fd | 802.334 | 2.682 | n/a | 0.000 | 0.000 | 2.548 | 796.948 | 0.037 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.088 | 2.682 | 0.003 | 0.088 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000209 | 772.397 | 3.714 | n/a | 0.000 | 0.000 | 2.524 | 765.867 | 0.152 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.093 | 3.714 | 0.005 | 0.093 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001e2 | 756.394 | 6.198 | n/a | 0.000 | 0.000 | 0.781 | 748.963 | 0.152 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.238 | 6.198 | 0.008 | 0.238 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001f6 | 748.235 | 2.570 | n/a | 0.000 | 0.000 | 0.877 | 744.646 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.082 | 2.570 | 0.003 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001fa | 660.443 | 2.520 | n/a | 0.000 | 0.000 | 0.745 | 657.051 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.082 | 2.520 | 0.004 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ed | 632.581 | 3.454 | n/a | 0.000 | 0.000 | 0.946 | 628.031 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.115 | 3.454 | 0.005 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001de | 607.338 | 2.505 | n/a | 0.000 | 0.000 | 0.828 | 603.844 | 0.020 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.077 | 2.505 | 0.004 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001ff | 551.433 | 2.394 | n/a | 0.000 | 0.000 | 0.754 | 548.127 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.110 | 2.394 | 0.004 | 0.110 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000216 | 473.044 | 2.916 | n/a | 0.000 | 0.000 | 0.769 | 469.244 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.075 | 2.916 | 0.006 | 0.075 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001e7 | 445.436 | 13.768 | n/a | 0.000 | 0.000 | 1.527 | 409.115 | 0.007 | 20.701 | 0.033 | 0.000 | n/a | n/a | 0.284 | 13.768 | 0.031 | 0.284 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000001f4 | 437.355 | 3.675 | n/a | 0.000 | 0.000 | 1.052 | 432.493 | 0.007 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.104 | 3.675 | 0.008 | 0.104 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / internal (756 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.490 | n/a | n/a | n/a | 3.520 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.376 | 3.520 | 0.286 | 6.376 |
| p99 | 196.694 | n/a | n/a | n/a | 15.336 | n/a | 1.153 | 0.000 | 1.824 | 176.302 | 0.157 | 0.000 | 0.048 | 0.000 | n/a | n/a | 47.538 | 16.212 | 0.831 | 47.538 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d000000000000022c | 994.160 | 5.307 | n/a | 0.000 | 0.000 | 0.887 | 969.344 | 0.016 | 18.275 | 0.079 | 0.000 | n/a | n/a | 0.252 | 5.307 | 0.005 | 0.252 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000221 | 883.605 | 1.756 | n/a | 0.000 | 0.000 | 0.719 | 880.971 | 0.011 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.097 | 1.756 | 0.002 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000022d | 873.674 | 4.062 | n/a | 0.000 | 0.000 | 1.131 | 868.306 | 0.014 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.113 | 4.062 | 0.005 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000228 | 781.555 | 7.013 | n/a | 0.000 | 0.000 | 0.786 | 773.497 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.181 | 7.013 | 0.009 | 0.181 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000224 | 740.332 | 2.077 | n/a | 0.000 | 0.000 | 0.796 | 737.327 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.084 | 2.077 | 0.003 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000225 | 254.768 | 2.034 | n/a | 0.000 | 0.000 | 0.723 | 251.732 | 0.159 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.073 | 2.034 | 0.008 | 0.073 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000022a | 239.935 | 2.985 | n/a | 0.000 | 0.000 | 0.966 | 235.856 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.084 | 2.985 | 0.012 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000761 | 196.694 | 11.472 | n/a | 0.000 | 0.000 | 8.122 | 176.302 | 0.573 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.185 | 11.472 | 0.058 | 0.185 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000004ea | 115.595 | 5.812 | n/a | 0.000 | 0.000 | 0.739 | 108.765 | 0.134 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.104 | 5.812 | 0.050 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000300 | 109.159 | 13.116 | n/a | 0.000 | 0.000 | 1.180 | 94.450 | 0.202 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.163 | 13.116 | 0.120 | 0.163 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000004f3 | 106.855 | 2.461 | n/a | 0.000 | 0.000 | 0.764 | 103.496 | 0.009 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.094 | 2.461 | 0.023 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000222 | 106.024 | 2.448 | n/a | 0.000 | 0.000 | 0.903 | 102.486 | 0.012 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.126 | 2.448 | 0.023 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000031c | 103.285 | 5.211 | n/a | 0.000 | 0.000 | 0.900 | 96.938 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.215 | 5.211 | 0.050 | 0.215 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000066a | 90.192 | 6.278 | n/a | 0.000 | 0.000 | 2.244 | 81.204 | 0.325 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.126 | 6.278 | 0.070 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d00000000000007a4 | 90.135 | 2.371 | n/a | 0.000 | 0.000 | 0.824 | 86.809 | 0.008 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.096 | 2.371 | 0.026 | 0.096 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000638 | 84.034 | 5.669 | n/a | 0.000 | 0.000 | 0.875 | 77.301 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.143 | 5.669 | 0.067 | 0.143 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000475 | 81.049 | 3.907 | n/a | 0.000 | 0.000 | 0.917 | 76.129 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.068 | 3.907 | 0.048 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000077f | 79.094 | 11.972 | n/a | 0.000 | 0.000 | 1.960 | 64.756 | 0.141 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.251 | 11.972 | 0.151 | 0.251 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000000793 | 78.603 | 9.889 | n/a | 0.000 | 0.000 | 0.867 | 67.412 | 0.169 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.251 | 9.889 | 0.126 | 0.251 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d000000000000068e | 76.776 | 6.039 | n/a | 0.000 | 0.000 | 0.865 | 69.627 | 0.134 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.073 | 6.039 | 0.079 | 0.073 | gw-r/thread-53/journal/page | none observed |

## P3 / tail / internal (2215 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.423 | n/a | n/a | n/a | 4.359 | n/a | 0.000 | 0.000 | 0.263 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.223 | 4.383 | 0.356 | 6.223 |
| p99 | 387.718 | n/a | n/a | n/a | 21.470 | n/a | 1.654 | 0.000 | 1.710 | 363.356 | 0.129 | 0.000 | 0.033 | 0.000 | n/a | n/a | 47.637 | 22.385 | 0.855 | 47.637 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98fc0ff9a0c2845d0000000000001a71 | 1003.404 | 2.264 | n/a | 0.000 | 0.000 | 2.218 | 998.838 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.055 | 2.264 | 0.002 | 0.055 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a4e | 1002.682 | 0.162 | n/a | 0.000 | 0.000 | 0.802 | 1000.550 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.123 | 0.162 | 0.000 | 1.123 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a9a | 1002.425 | 0.156 | n/a | 0.000 | 0.000 | 0.819 | 1000.287 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 1.132 | 0.156 | 0.000 | 1.132 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a58 | 999.700 | 4.754 | n/a | 0.000 | 0.000 | 0.870 | 980.663 | 0.078 | 13.203 | 0.021 | 0.000 | n/a | n/a | 0.111 | 4.754 | 0.005 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a96 | 988.252 | 3.131 | n/a | 0.000 | 0.000 | 0.743 | 984.248 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.085 | 3.131 | 0.003 | 0.085 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a91 | 987.585 | 2.805 | n/a | 0.000 | 0.000 | 0.715 | 983.967 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.069 | 2.805 | 0.003 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a4c | 979.168 | 2.398 | n/a | 0.000 | 0.000 | 0.731 | 975.942 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.067 | 2.398 | 0.002 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a62 | 940.318 | 8.025 | n/a | 0.000 | 0.000 | 0.782 | 931.059 | 0.107 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.325 | 8.025 | 0.009 | 0.325 | gw-r/thread-50/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a53 | 910.287 | 3.980 | n/a | 0.000 | 0.000 | 0.765 | 905.279 | 0.115 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.109 | 3.980 | 0.004 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a50 | 832.743 | 9.020 | n/a | 0.000 | 0.000 | 3.378 | 819.898 | 0.094 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.320 | 9.020 | 0.011 | 0.320 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a73 | 823.495 | 2.428 | n/a | 0.000 | 0.000 | 0.804 | 820.164 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.068 | 2.428 | 0.003 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a93 | 732.961 | 4.180 | n/a | 0.000 | 0.000 | 0.887 | 727.739 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.127 | 4.180 | 0.006 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a6d | 707.122 | 2.257 | n/a | 0.000 | 0.000 | 0.760 | 704.009 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.069 | 2.257 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a68 | 653.245 | 5.051 | n/a | 0.000 | 0.000 | 0.830 | 647.237 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.118 | 5.051 | 0.008 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a59 | 564.802 | 2.276 | n/a | 0.000 | 0.000 | 0.841 | 561.503 | 0.095 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.068 | 2.276 | 0.004 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a8d | 553.443 | 2.961 | n/a | 0.000 | 0.000 | 0.770 | 549.597 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.082 | 2.961 | 0.005 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a8b | 549.804 | 2.652 | n/a | 0.000 | 0.000 | 0.755 | 546.281 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.086 | 2.652 | 0.005 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a75 | 536.355 | 7.887 | n/a | 0.000 | 0.000 | 0.929 | 527.198 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.280 | 7.887 | 0.015 | 0.280 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a8e | 455.158 | 4.073 | n/a | 0.000 | 0.000 | 0.721 | 450.152 | 0.104 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.077 | 4.073 | 0.009 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 98fc0ff9a0c2845d0000000000001a83 | 446.862 | 3.662 | n/a | 0.000 | 0.000 | 0.769 | 442.299 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.094 | 3.662 | 0.008 | 0.094 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.365 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.095 | 0.020 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 |
| p99 | 212.141 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.497 | 202.309 | 6.442 | 0.059 | 1.723 | 0.000 | n/a | n/a | 0.504 | 0.000 | 0.000 | 0.504 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b0450000000000000034 | 212.141 | 0.000 | n/a | 0.000 | 0.000 | 10.497 | 201.168 | 0.017 | 0.059 | 0.132 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b045000000000000004a | 204.630 | 0.000 | n/a | 0.000 | 0.000 | 1.821 | 202.164 | 0.109 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.340 | 0.000 | 0.000 | 0.340 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b045000000000000004d | 204.579 | 0.000 | n/a | 0.000 | 0.000 | 2.136 | 202.052 | 0.023 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000009 | 204.336 | 0.000 | n/a | 0.000 | 0.000 | 2.242 | 201.346 | 0.048 | 0.000 | 0.300 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000004b | 204.169 | 0.000 | n/a | 0.000 | 0.000 | 1.088 | 202.292 | 0.047 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.504 | 0.000 | 0.000 | 0.504 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000024 | 203.894 | 0.000 | n/a | 0.000 | 0.000 | 1.398 | 202.043 | 0.029 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000051 | 203.784 | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 201.754 | 0.055 | 0.000 | 0.235 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000013 | 203.784 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 202.292 | 0.044 | 0.000 | 0.344 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000008 | 203.527 | 0.000 | n/a | 0.000 | 0.000 | 1.778 | 201.308 | 0.016 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b045000000000000000d | 203.509 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 202.309 | 0.129 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000052 | 203.260 | 0.000 | n/a | 0.000 | 0.000 | 1.436 | 201.234 | 0.020 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b045000000000000000b | 203.168 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.848 | 0.017 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000054 | 203.113 | 0.000 | n/a | 0.000 | 0.000 | 1.397 | 201.345 | 0.016 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000031 | 203.101 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 201.427 | 0.065 | 0.000 | 0.366 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000045 | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 1.246 | 201.483 | 0.040 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000059 | 203.082 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 201.511 | 0.022 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000032 | 203.022 | 0.000 | n/a | 0.000 | 0.000 | 1.115 | 201.413 | 0.113 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b045000000000000004e | 203.010 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.656 | 0.022 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000001a | 203.000 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 201.749 | 0.022 | 0.000 | 0.209 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000025 | 202.994 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.628 | 0.023 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-54/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.396 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 201.051 | 0.024 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 |
| p99 | 209.392 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.458 | 208.031 | 6.105 | 0.000 | 0.447 | 0.000 | n/a | n/a | 0.610 | 0.000 | 0.000 | 0.610 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b045000000000000007a | 209.392 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 208.031 | 0.059 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b04500000000000000c5 | 206.155 | 0.000 | n/a | 0.000 | 0.000 | 2.238 | 203.042 | 0.076 | 0.000 | 0.263 | 0.000 | n/a | n/a | 0.537 | 0.000 | 0.000 | 0.537 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000c4 | 205.281 | 0.000 | n/a | 0.000 | 0.000 | 1.913 | 202.868 | 0.055 | 0.000 | 0.243 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000077 | 205.013 | 0.000 | n/a | 0.000 | 0.000 | 3.458 | 201.240 | 0.029 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000000c3 | 203.909 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 201.922 | 0.040 | 0.000 | 0.255 | 0.000 | n/a | n/a | 0.525 | 0.000 | 0.000 | 0.525 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000a1 | 203.617 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 202.059 | 0.048 | 0.000 | 0.447 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000b0 | 203.607 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 202.398 | 0.031 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000000c1 | 203.552 | 0.000 | n/a | 0.000 | 0.000 | 1.551 | 201.582 | 0.046 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000006d | 203.514 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.313 | 0.095 | 0.000 | 0.399 | 0.000 | n/a | n/a | 0.610 | 0.000 | 0.000 | 0.610 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000069 | 203.493 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 202.257 | 0.028 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000ad | 203.468 | 0.000 | n/a | 0.000 | 0.000 | 1.937 | 201.084 | 0.019 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000072 | 203.384 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 202.082 | 0.098 | 0.000 | 0.209 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b045000000000000009f | 203.331 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.675 | 0.251 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b04500000000000000a9 | 203.320 | 0.000 | n/a | 0.000 | 0.000 | 1.443 | 201.498 | 0.014 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b04500000000000000ab | 203.241 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 202.048 | 0.048 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b04500000000000000ae | 203.198 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 201.617 | 0.019 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000000b8 | 203.153 | 0.000 | n/a | 0.000 | 0.000 | 0.885 | 201.841 | 0.050 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b04500000000000000a8 | 203.127 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 201.664 | 0.047 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b045000000000000009b | 203.065 | 0.000 | n/a | 0.000 | 0.000 | 1.035 | 201.691 | 0.038 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b045000000000000009a | 202.954 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 201.483 | 0.023 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.065 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 200.902 | 0.015 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 205.183 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.625 | 202.824 | 5.477 | 30.189 | 0.337 | 0.000 | n/a | n/a | 52.358 | 0.000 | 0.000 | 52.358 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b04500000000000000ff | 205.183 | 0.000 | n/a | 0.000 | 0.000 | 3.625 | 201.230 | 0.023 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000000df | 204.036 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 202.578 | 0.091 | 0.000 | 0.337 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000d8 | 203.833 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 202.824 | 0.027 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000000e0 | 203.827 | 0.000 | n/a | 0.000 | 0.000 | 1.793 | 201.642 | 0.020 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b04500000000000000eb | 203.066 | 0.000 | n/a | 0.000 | 0.000 | 1.583 | 201.081 | 0.013 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000d1 | 203.002 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 201.460 | 0.031 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b045000000000000011f | 202.912 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 201.526 | 0.013 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000cd | 202.900 | 0.000 | n/a | 0.000 | 0.000 | 1.252 | 201.338 | 0.012 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b04500000000000000e4 | 202.892 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 201.461 | 0.010 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b04500000000000000d4 | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.214 | 0.014 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.282 | 0.000 | 0.000 | 0.282 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000011e | 202.765 | 0.000 | n/a | 0.000 | 0.000 | 1.144 | 201.317 | 0.019 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b04500000000000000de | 202.700 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 201.316 | 0.011 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000104 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 201.205 | 0.013 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b04500000000000000c7 | 202.603 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.260 | 0.013 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000011d | 202.575 | 0.000 | n/a | 0.000 | 0.000 | 1.143 | 201.088 | 0.012 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000101 | 202.573 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.296 | 0.020 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000000f4 | 202.571 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 201.385 | 0.017 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000ed | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.298 | 0.026 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000000ee | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.258 | 0.013 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b04500000000000000fa | 202.458 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 201.364 | 0.012 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.854 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 200.823 | 0.010 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 215.934 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 11.475 | 210.609 | 2.510 | 0.000 | 0.688 | 0.000 | n/a | n/a | 0.534 | 0.000 | 0.000 | 0.534 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b0450000000000000142 | 215.934 | 0.000 | n/a | 0.000 | 0.000 | 11.475 | 204.224 | 0.024 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000187 | 212.302 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 210.609 | 0.014 | 0.000 | 0.688 | 0.000 | n/a | n/a | 0.464 | 0.000 | 0.000 | 0.464 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000172 | 203.573 | 0.000 | n/a | 0.000 | 0.000 | 1.410 | 201.927 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000188 | 203.532 | 0.000 | n/a | 0.000 | 0.000 | 1.662 | 201.563 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b045000000000000016c | 203.363 | 0.000 | n/a | 0.000 | 0.000 | 2.177 | 200.983 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000017b | 203.089 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 202.023 | 0.019 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000134 | 202.979 | 0.000 | n/a | 0.000 | 0.000 | 1.024 | 201.639 | 0.010 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b045000000000000013f | 202.704 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 201.670 | 0.081 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000156 | 202.574 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.212 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000166 | 202.538 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.433 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000147 | 202.501 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.254 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000162 | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.446 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b045000000000000018d | 202.435 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.229 | 0.012 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000186 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.304 | 0.017 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000163 | 202.384 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.326 | 0.010 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b045000000000000018b | 202.374 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 201.314 | 0.013 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000133 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.357 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b045000000000000012d | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 201.197 | 0.020 | 0.000 | 0.305 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000152 | 202.360 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 201.330 | 0.048 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b045000000000000017e | 202.274 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 201.033 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.823 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.765 | 0.010 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 |
| p99 | 203.900 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.625 | 202.287 | 1.099 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.424 | 0.000 | 0.000 | 0.424 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b04500000000000001a5 | 206.705 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 205.377 | 0.017 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b04500000000000001dc | 203.900 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 202.287 | 0.022 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000198 | 203.511 | 0.000 | n/a | 0.000 | 0.000 | 2.361 | 200.723 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b045000000000000019b | 202.966 | 0.000 | n/a | 0.000 | 0.000 | 2.023 | 200.472 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.424 | 0.000 | 0.000 | 0.424 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000001b0 | 202.893 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 201.705 | 0.036 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b04500000000000001db | 202.886 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.895 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000197 | 202.791 | 0.000 | n/a | 0.000 | 0.000 | 1.251 | 200.993 | 0.026 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.483 | 0.000 | 0.000 | 0.483 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000001ab | 202.751 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 201.596 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000001bc | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.579 | 0.026 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b04500000000000001ea | 202.591 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 201.147 | 0.008 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000001f0 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.565 | 0.018 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b04500000000000001c6 | 202.531 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 201.201 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000001e9 | 202.517 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.278 | 0.014 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b04500000000000001f8 | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.288 | 0.012 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b04500000000000001b7 | 202.435 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.309 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b04500000000000001a9 | 202.418 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.421 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000001a8 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 1.100 | 201.142 | 0.011 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b04500000000000001e6 | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.309 | 0.009 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b04500000000000001bb | 202.340 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.102 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b04500000000000001c0 | 202.292 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.097 | 0.021 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-54/journal/page | none observed |

## P3 / L256 / read (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.776 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.768 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 207.719 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.399 | 203.714 | 4.435 | 20.701 | 0.175 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b045000000000000021b | 207.719 | 0.000 | n/a | 0.000 | 0.000 | 3.399 | 203.714 | 0.012 | 0.268 | 0.175 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000219 | 204.221 | 0.000 | n/a | 0.000 | 0.000 | 1.671 | 181.307 | 0.015 | 20.701 | 0.113 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000218 | 203.137 | 0.000 | n/a | 0.000 | 0.000 | 1.205 | 201.656 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000268 | 202.820 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.483 | 0.012 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000264 | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.261 | 0.020 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b045000000000000022b | 202.623 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 200.921 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000269 | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 200.686 | 0.011 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000275 | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 201.090 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b045000000000000023b | 202.378 | 0.000 | n/a | 0.000 | 0.000 | 1.316 | 200.844 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000220 | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 201.069 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000223 | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.339 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b045000000000000020b | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.928 | 201.110 | 0.008 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000261 | 202.300 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.327 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000265 | 202.292 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.103 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b045000000000000027a | 202.286 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.112 | 0.010 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000266 | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 201.302 | 0.021 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000238 | 202.246 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 201.353 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000247 | 202.238 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 201.034 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000210 | 202.143 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 201.240 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000212 | 202.142 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 200.930 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-52/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.847 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 72.716 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 203.363 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.071 | 201.370 | 2.524 | 18.275 | 0.077 | 0.000 | n/a | n/a | 50.144 | 0.000 | 0.000 | 50.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b0450000000000000290 | 203.363 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 183.911 | 0.011 | 18.275 | 0.055 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b045000000000000028a | 202.513 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 201.067 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000292 | 202.325 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 200.971 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000285 | 202.295 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 201.370 | 0.013 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b045000000000000028c | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 0.746 | 201.229 | 0.010 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b045000000000000028e | 202.162 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.131 | 0.011 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000298 | 202.145 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.167 | 0.013 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b045000000000000027f | 201.993 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 201.043 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000280 | 201.781 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.658 | 0.017 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b045000000000000027e | 201.701 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 200.591 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000297 | 201.672 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.623 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000291 | 201.665 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 200.763 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000296 | 201.572 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 200.475 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000283 | 201.520 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.657 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000284 | 201.502 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.569 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000293 | 201.475 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 200.617 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b045000000000000028b | 201.455 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 200.566 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b045000000000000027d | 201.448 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 200.568 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000287 | 201.427 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.479 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000295 | 201.148 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.330 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.553 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 82.550 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 202.175 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.267 | 200.943 | 4.923 | 22.937 | 0.115 | 0.000 | n/a | n/a | 50.176 | 0.000 | 0.000 | 50.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1631c30179c3b0450000000000000eab | 206.180 | 0.000 | n/a | 0.000 | 0.000 | 2.267 | 203.743 | 0.004 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000ea9 | 204.507 | 0.000 | n/a | 0.000 | 0.000 | 1.810 | 201.837 | 0.023 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.620 | 0.000 | 0.000 | 0.620 | gw-r/thread-53/journal/page | none observed |
| 1631c30179c3b0450000000000000e81 | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 1.674 | 200.346 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000e93 | 201.971 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 200.929 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000ec7 | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 200.943 | 0.011 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000e9c | 201.847 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 200.854 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000ece | 201.810 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 200.761 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000e65 | 201.733 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.740 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000e7a | 201.722 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.813 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000e8f | 201.696 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.814 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000ed5 | 201.669 | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 200.493 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000e61 | 201.632 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 200.482 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-54/journal/page | none observed |
| 1631c30179c3b0450000000000000e69 | 201.621 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 200.666 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000e97 | 201.619 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 200.559 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000eb2 | 201.609 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.653 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 1631c30179c3b0450000000000000e8b | 201.608 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 200.713 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 1631c30179c3b0450000000000000e64 | 201.592 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 200.669 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 1631c30179c3b0450000000000000eb8 | 201.585 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.638 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 1631c30179c3b0450000000000000eae | 201.564 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 200.625 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-52/journal/page | none observed |
| 1631c30179c3b0450000000000000ec3 | 201.536 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.646 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-53/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
