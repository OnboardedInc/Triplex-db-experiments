# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (703.119 ms, trace `067b4fd88797856a00000000000023c0`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (544.077 ms, trace `067b4fd88797856a00000000000023dc`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (495.034 ms, trace `067b4fd88797856a00000000000024cc`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (460.030 ms, trace `067b4fd88797856a00000000000028b3`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (463.688 ms, trace `067b4fd88797856a00000000000028b4`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p4-verdict-a-ladder`; source `42b6a31ae8c63fb67a2a9e35c0d98ac1284d6743`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 8458/8463 (99.941%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 27356654.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 575 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-0.jsonl.gz: unexpected end of file; node-14-1.jsonl.gz: unexpected end of file; node-14-2.jsonl.gz: unexpected end of file; node-14-3.jsonl.gz: unexpected end of file; node-14-4.jsonl.gz: unexpected end of file; node-14-5.jsonl.gz: unexpected end of file; node-14-6.jsonl.gz: unexpected end of file; node-14-8.jsonl.gz: unexpected end of file; node-14-9.jsonl.gz: unexpected end of file; system-linux.jsonl.gz: unexpected end of file; 20 worker RPC spans have no bound receiver trace; Writer file absent: cannot establish complete commit denominator. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 14442.479 | 1211.711 | 35.008 | 311 |
| baseline | 0 | 44856.450 | 1097.461 | 49.666 | 1014 |
| L1 | 1 | 44795.209 | 2173.252 | 56.975 | 1217 |
| L4 | 4 | 44957.505 | 9591.980 | 137.577 | 24188 |
| L16 | 16 | 44463.442 | 10531.919 | 174.929 | 25331 |
| L64 | 64 | 44604.470 | 4271.625 | 131.751 | 1072 |
| L256 | 256 | 44099.198 | 4883.059 | 99.845 | 1108 |
| L1024 | 1024 | 44601.768 | 5493.603 | 324.228 | 1078 |
| recovery | 256 | 59071.702 | 6522.526 | 147.041 | 1704 |
| p4mix | 1 | 44761.302 | 2375.751 | 38.732 | 1192 |
| p4h1 | 1 | 44613.962 | 2352.850 | 55.087 | 1040 |
| grow3 | 0 | 9135.266 | 2575.110 | 17.877 | 235 |
| p4h3 | 1 | 44164.061 | 2234.823 | 29.717 | 1126 |
| grow10 | 0 | 19536.969 | 8554.868 | 35.107 | 489 |
| p4h10 | 1 | 44025.913 | 2213.002 | 43.418 | 976 |
| presweep | 64 | 44253.425 | 4328.828 | 116.626 | 1174 |
| sweep | 64 | 997.732 | 195.078 | 6.179 | 166 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 067b4fd88797856a00000000000023c0 | driver.queue.scheduler-late | 0.606 | none | 0 / 32 |
| 067b4fd88797856a00000000000023c0 | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |

Observed active steps while trace 067b4fd88797856a00000000000023c0 waited: []

| 067b4fd88797856a00000000000023dc | driver.queue.scheduler-dispatch | 0.045 | none | 0 / 32 |
| 067b4fd88797856a00000000000023dc | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 067b4fd88797856a00000000000023dc waited: []

| 067b4fd88797856a00000000000024cc | driver.queue.scheduler-dispatch | 0.052 | none | 0 / 32 |
| 067b4fd88797856a00000000000024cc | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 067b4fd88797856a00000000000024cc waited: []

| 067b4fd88797856a00000000000028b3 | driver.queue.scheduler-late | 0.290 | none | 0 / 32 |
| 067b4fd88797856a00000000000028b3 | driver.queue.scheduler-dispatch | 0.027 | none | 0 / 32 |

Observed active steps while trace 067b4fd88797856a00000000000028b3 waited: []

| 067b4fd88797856a00000000000028b4 | driver.queue.scheduler-late | 0.496 | none | 1 / 32 |
| 067b4fd88797856a00000000000028b4 | driver.queue.scheduler-dispatch | 0.134 | none | 1 / 32 |

Observed active steps while trace 067b4fd88797856a00000000000028b4 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.403 | 0.827 | 0.000 | 1.549 | 7.229 | 0.175 | 0.000 | 0.163 | 1.865 | 8.157 | 0.071 | n/a | 0.485 | 21.567 | n/a | n/a | 0.064 | 7.918 | 0.202 | 0.064 |
| p99 | 138.725 | 4.873 | 0.125 | 5.060 | 19.613 | 0.652 | 1.802 | 1.039 | 8.979 | 89.680 | 0.463 | n/a | 3.733 | 42.293 | n/a | n/a | 0.443 | 21.996 | 0.358 | 0.443 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000000141 | 138.725 | 4.050 | 0.175 | 0.288 | 0.068 | 1.865 | 89.680 | 0.096 | n/a | 0.173 | 42.293 | n/a | n/a | 0.038 | 4.581 | 0.033 | 0.038 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000011b | 79.759 | 7.229 | 0.470 | 0.000 | 0.219 | 5.129 | 40.084 | 0.103 | n/a | 1.295 | 25.069 | n/a | n/a | 0.161 | 7.918 | 0.099 | 0.161 | gw-w/thread-46/gateway.admitted-work | driver.worker-message 1.544ms |
| 067b4fd88797856a000000000000010b | 78.025 | 13.665 | 0.548 | 0.000 | 0.091 | 2.977 | 29.775 | 0.463 | n/a | 0.506 | 29.936 | n/a | n/a | 0.064 | 14.303 | 0.183 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000011d | 77.724 | 8.167 | 0.329 | 0.000 | 0.196 | 2.854 | 38.971 | 0.112 | n/a | 1.223 | 25.758 | n/a | n/a | 0.115 | 8.692 | 0.112 | 0.115 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000010f | 70.761 | 11.651 | 0.234 | 0.000 | 0.072 | 4.280 | 22.435 | 0.110 | n/a | 0.137 | 31.778 | n/a | n/a | 0.062 | 11.958 | 0.169 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000113 | 63.907 | 9.641 | 0.324 | 0.000 | 0.125 | 4.943 | 13.151 | 0.168 | n/a | 0.223 | 35.255 | n/a | n/a | 0.076 | 10.090 | 0.158 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000135 | 62.005 | 11.461 | 0.189 | 0.778 | 0.087 | 5.655 | 17.810 | 0.069 | n/a | 0.942 | 24.969 | n/a | n/a | 0.046 | 12.514 | 0.202 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000108 | 61.519 | 19.613 | 0.022 | 1.802 | 0.559 | 1.157 | 8.024 | 0.168 | n/a | 3.733 | 25.998 | n/a | n/a | 0.443 | 21.996 | 0.358 | 0.443 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000139 | 60.831 | 6.515 | 0.526 | 0.244 | 0.081 | 8.979 | 19.649 | 0.091 | n/a | 0.260 | 24.445 | n/a | n/a | 0.042 | 7.366 | 0.121 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000123 | 60.000 | 9.754 | 0.199 | 0.000 | 0.163 | 5.834 | 13.993 | 0.064 | n/a | 3.567 | 26.380 | n/a | n/a | 0.046 | 10.116 | 0.169 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000131 | 58.988 | 7.417 | 0.652 | 0.320 | 0.098 | 6.078 | 15.968 | 0.113 | n/a | 0.564 | 27.726 | n/a | n/a | 0.052 | 8.488 | 0.144 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000115 | 55.690 | 14.912 | 0.331 | 0.000 | 0.077 | 5.393 | 18.533 | 0.059 | n/a | 2.564 | 13.760 | n/a | n/a | 0.062 | 15.320 | 0.275 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.384ms |
| 067b4fd88797856a000000000000012d | 52.656 | 8.554 | 0.530 | 0.334 | 0.132 | 2.266 | 18.870 | 0.129 | n/a | 0.168 | 21.567 | n/a | n/a | 0.107 | 9.549 | 0.181 | 0.107 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000013f | 41.523 | 4.357 | 0.219 | 0.281 | 0.082 | 1.615 | 14.281 | 0.111 | n/a | 0.197 | 20.329 | n/a | n/a | 0.051 | 4.939 | 0.119 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000127 | 40.403 | 8.002 | 0.198 | 0.000 | 0.066 | 2.796 | 8.157 | 0.046 | n/a | 0.401 | 20.691 | n/a | n/a | 0.046 | 8.266 | 0.205 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000118 | 37.659 | 6.424 | 0.007 | 0.000 | 0.911 | 0.933 | 2.321 | 0.042 | n/a | 0.187 | 26.777 | n/a | n/a | 0.057 | 7.341 | 0.195 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000012e | 35.736 | 8.329 | 0.011 | 0.000 | 0.643 | 1.055 | 2.299 | 0.048 | n/a | 0.687 | 22.598 | n/a | n/a | 0.065 | 8.983 | 0.251 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000136 | 34.848 | 4.518 | 0.006 | 0.000 | 0.369 | 1.336 | 6.780 | 0.054 | n/a | 0.188 | 21.509 | n/a | n/a | 0.087 | 4.893 | 0.140 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000011e | 33.906 | 9.088 | 0.006 | 0.000 | 0.536 | 1.079 | 5.751 | 0.071 | n/a | 0.147 | 17.178 | n/a | n/a | 0.050 | 9.630 | 0.284 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000125 | 33.739 | 9.190 | 0.636 | 0.476 | 0.073 | 2.417 | 11.529 | 0.057 | n/a | 0.485 | 8.803 | n/a | n/a | 0.072 | 10.375 | 0.308 | 0.072 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2/P4 / read-your-own-write / read (1083 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 123.663 | n/a | n/a | n/a | 44.687 | 40.869 | 2.480 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.792 | 101.185 | 0.971 | 4.792 |
| p99 | 1210.755 | n/a | n/a | n/a | 176.872 | 1062.837 | 32.363 | 0.000 | 65.714 | 49.745 | 45.293 | n/a | 0.015 | 0.000 | n/a | n/a | 224.881 | 1139.307 | 1.000 | 224.881 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000003b97 | 1406.439 | 28.990 | 1278.764 | 1.848 | 0.000 | 0.368 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 96.470 | 1309.602 | 0.931 | 96.470 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.840ms; driver.publication 1.871ms |
| 067b4fd88797856a0000000000003b74 | 1384.759 | 73.498 | 1139.023 | 7.540 | 0.000 | 16.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 148.400 | 1220.060 | 0.881 | 148.400 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 1.871ms; driver.publication 1.834ms |
| 067b4fd88797856a0000000000003ba6 | 1365.290 | 50.880 | 1301.662 | 1.655 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.788 | 1354.197 | 0.992 | 10.788 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.840ms; driver.publication 1.871ms |
| 067b4fd88797856a0000000000003b9c | 1357.266 | 85.943 | 1120.409 | 13.334 | 0.000 | 0.428 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 137.151 | 1219.687 | 0.899 | 137.151 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.840ms; driver.publication 1.871ms |
| 067b4fd88797856a0000000000003bbe | 1349.514 | 83.269 | 1164.517 | 7.340 | 0.000 | 0.380 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 94.008 | 1255.126 | 0.930 | 94.008 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.912ms; driver.publication 2.840ms |
| 067b4fd88797856a0000000000003bb1 | 1336.171 | 60.786 | 1215.946 | 4.386 | 0.000 | 0.373 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.680 | 1281.118 | 0.959 | 54.680 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.840ms; driver.publication 1.777ms |
| 067b4fd88797856a0000000000003b8e | 1325.468 | 69.294 | 1187.919 | 3.583 | 0.000 | 0.392 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.281 | 1260.796 | 0.951 | 64.281 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 1.871ms; driver.publication 1.777ms |
| 067b4fd88797856a0000000000003bba | 1272.849 | 78.694 | 1159.226 | 9.409 | 0.000 | 0.411 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.109 | 1247.330 | 0.980 | 25.109 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.912ms; driver.publication 2.840ms |
| 067b4fd88797856a0000000000003bc4 | 1241.636 | 22.205 | 1095.977 | 0.000 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 123.199 | 1118.182 | 0.901 | 123.199 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.912ms; driver.publication 2.840ms |
| 067b4fd88797856a0000000000003b65 | 1227.630 | 77.416 | 1043.326 | 8.590 | 0.000 | 0.417 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 97.882 | 1129.332 | 0.920 | 97.882 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.167ms; driver.publication 1.871ms; driver.publication 1.834ms; driver.publication 1.777ms; driver.publication 1.711ms |
| 067b4fd88797856a0000000000003b9d | 1210.755 | 34.574 | 1006.768 | 4.068 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 164.997 | 1045.409 | 0.863 | 164.997 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 1.871ms; driver.publication 1.777ms |
| 067b4fd88797856a0000000000001abb | 1205.897 | 28.306 | 1071.746 | 10.530 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 95.011 | 1110.582 | 0.921 | 95.011 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.156ms; driver.publication 3.078ms; driver.publication 2.811ms; driver.publication 2.576ms; driver.publication 2.517ms |
| 067b4fd88797856a0000000000003b55 | 1176.729 | 46.306 | 688.037 | 3.132 | 0.000 | 0.656 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 438.599 | 737.474 | 0.627 | 438.599 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.167ms; driver.publication 1.871ms; driver.publication 1.834ms; driver.publication 1.777ms; driver.publication 1.711ms |
| 067b4fd88797856a0000000000001aa9 | 1174.696 | 54.426 | 1051.950 | 3.808 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.254 | 1110.185 | 0.945 | 64.254 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.156ms; driver.publication 3.078ms; driver.publication 2.811ms; driver.publication 2.576ms; driver.publication 2.517ms |
| 067b4fd88797856a0000000000001a9a | 1174.157 | 96.033 | 998.594 | 11.423 | 0.000 | 0.235 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 67.873 | 1106.050 | 0.942 | 67.873 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 4.491ms; driver.publication 3.752ms; driver.publication 3.156ms; driver.publication 3.078ms; driver.publication 2.811ms |
| 067b4fd88797856a0000000000003b95 | 1165.286 | 92.929 | 998.461 | 11.663 | 0.000 | 0.423 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 61.811 | 1103.052 | 0.947 | 61.811 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 1.871ms; driver.publication 1.777ms; driver.publication 1.764ms |
| 067b4fd88797856a0000000000003bda | 1165.281 | 122.672 | 986.659 | 7.422 | 0.000 | 28.457 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.072 | 1116.753 | 0.958 | 20.072 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.912ms; driver.publication 2.840ms |
| 067b4fd88797856a0000000000003b79 | 1157.933 | 38.955 | 1001.543 | 1.224 | 0.000 | 0.485 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 115.726 | 1041.722 | 0.900 | 115.726 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.167ms; driver.publication 1.871ms; driver.publication 1.834ms; driver.publication 1.777ms; driver.publication 1.711ms |
| 067b4fd88797856a0000000000001aa1 | 1156.081 | 87.073 | 1035.341 | 16.893 | 0.000 | 1.621 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.153 | 1139.307 | 0.985 | 15.153 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.156ms; driver.publication 3.078ms; driver.publication 2.811ms; driver.publication 2.576ms; driver.publication 2.517ms |
| 067b4fd88797856a0000000000003bb9 | 1153.990 | 17.766 | 965.959 | 0.000 | 0.000 | 0.337 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 169.928 | 983.725 | 0.852 | 169.928 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.363ms; driver.publication 3.167ms; driver.publication 3.057ms; driver.publication 2.840ms; driver.publication 1.777ms |

## P2 / baseline / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.298 | 0.576 | 0.000 | 1.270 | 4.568 | 0.018 | 0.000 | 0.139 | 1.280 | 4.148 | 0.058 | n/a | 0.352 | 12.439 | n/a | n/a | 0.056 | 5.188 | 0.228 | 0.056 |
| p99 | 143.056 | 3.573 | 0.675 | 4.133 | 11.445 | 1.057 | 0.619 | 6.997 | 8.676 | 60.661 | 2.270 | n/a | 4.325 | 132.337 | n/a | n/a | 0.131 | 12.573 | 0.556 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a000000000000016e | 143.056 | 4.520 | 0.007 | 0.000 | 0.122 | 3.731 | 1.907 | 0.044 | n/a | 0.342 | 132.337 | n/a | n/a | 0.047 | 4.648 | 0.032 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000193 | 95.202 | 4.471 | 0.239 | 0.304 | 0.069 | 3.222 | 35.404 | 0.149 | n/a | 0.736 | 50.540 | n/a | n/a | 0.067 | 5.084 | 0.053 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000001a7 | 86.278 | 4.283 | 0.264 | 0.273 | 0.083 | 1.630 | 7.039 | 0.048 | n/a | 0.425 | 72.191 | n/a | n/a | 0.041 | 4.904 | 0.057 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000183 | 82.769 | 3.988 | 0.205 | 0.351 | 0.085 | 1.427 | 60.661 | 0.080 | n/a | 0.143 | 15.787 | n/a | n/a | 0.043 | 4.629 | 0.056 | 0.043 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a00000000000001b9 | 61.938 | 3.782 | 0.192 | 0.258 | 0.069 | 0.944 | 1.665 | 0.057 | n/a | 0.471 | 54.457 | n/a | n/a | 0.042 | 4.301 | 0.069 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000156 | 56.685 | 6.472 | 0.713 | 0.000 | 0.090 | 2.344 | 17.547 | 0.088 | n/a | 0.190 | 29.189 | n/a | n/a | 0.052 | 7.275 | 0.128 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000001b1 | 49.951 | 8.693 | 0.344 | 0.270 | 0.073 | 1.499 | 28.625 | 0.086 | n/a | 0.258 | 10.053 | n/a | n/a | 0.050 | 9.380 | 0.188 | 0.050 | gw-w/thread-45/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000014e | 48.181 | 4.196 | 0.195 | 0.000 | 0.075 | 2.816 | 22.041 | 0.136 | n/a | 0.743 | 17.937 | n/a | n/a | 0.043 | 4.465 | 0.093 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000154 | 47.337 | 3.881 | 0.185 | 0.000 | 0.066 | 3.423 | 19.906 | 0.056 | n/a | 0.753 | 19.025 | n/a | n/a | 0.041 | 4.131 | 0.087 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000017a | 46.179 | 10.408 | 0.026 | 0.000 | 1.283 | 3.579 | 9.247 | 0.236 | n/a | 0.693 | 20.575 | n/a | n/a | 0.131 | 11.718 | 0.254 | 0.131 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000160 | 45.458 | 5.835 | 0.233 | 0.436 | 0.178 | 2.210 | 15.016 | 0.073 | n/a | 0.164 | 21.239 | n/a | n/a | 0.075 | 6.682 | 0.147 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000001d0 | 44.909 | 7.206 | 0.012 | 0.000 | 0.551 | 3.657 | 7.958 | 0.144 | n/a | 4.325 | 20.965 | n/a | n/a | 0.092 | 7.768 | 0.173 | 0.092 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000001ed | 42.797 | 4.381 | 0.175 | 0.000 | 0.050 | 1.228 | 14.973 | 0.042 | n/a | 0.081 | 21.817 | n/a | n/a | 0.050 | 4.606 | 0.108 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000017d | 42.577 | 5.053 | 0.307 | 0.293 | 0.075 | 1.456 | 20.448 | 0.054 | n/a | 0.109 | 14.713 | n/a | n/a | 0.069 | 5.728 | 0.135 | 0.069 | gw-w/thread-48/gateway.admitted-work | none observed |
| 067b4fd88797856a00000000000001d4 | 42.014 | 3.741 | 0.167 | 0.292 | 0.020 | 1.150 | 20.900 | 0.067 | n/a | 0.417 | 15.228 | n/a | n/a | 0.032 | 4.220 | 0.100 | 0.032 | gw-w/thread-44/gateway.admitted-work | driver.publication 1.431ms |
| 067b4fd88797856a00000000000001e9 | 41.724 | 10.026 | 0.012 | 0.000 | 1.210 | 1.515 | 5.354 | 0.060 | n/a | 0.150 | 23.343 | n/a | n/a | 0.053 | 11.249 | 0.270 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.380ms |
| 067b4fd88797856a0000000000000145 | 40.819 | 4.641 | 0.372 | 0.000 | 0.070 | 2.177 | 14.363 | 0.096 | n/a | 1.353 | 17.705 | n/a | n/a | 0.043 | 5.083 | 0.125 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000191 | 38.911 | 6.104 | 0.185 | 0.281 | 0.067 | 1.321 | 13.810 | 0.079 | n/a | 0.107 | 16.915 | n/a | n/a | 0.042 | 6.637 | 0.171 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000001cb | 37.441 | 3.988 | 0.173 | 0.234 | 0.059 | 0.963 | 6.470 | 0.046 | n/a | 0.421 | 25.044 | n/a | n/a | 0.043 | 4.454 | 0.119 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000189 | 37.414 | 4.264 | 0.193 | 0.275 | 0.086 | 2.377 | 9.616 | 0.063 | n/a | 0.129 | 20.351 | n/a | n/a | 0.061 | 4.818 | 0.129 | 0.061 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.098 | 0.635 | 0.000 | 1.614 | 4.541 | 0.013 | 0.000 | 0.257 | 1.222 | 3.594 | 0.046 | n/a | 0.323 | 12.095 | n/a | n/a | 0.054 | 5.154 | 0.210 | 0.054 |
| p99 | 100.496 | 5.126 | 0.013 | 6.522 | 19.945 | 0.419 | 0.000 | 1.444 | 5.774 | 39.736 | 0.421 | n/a | 4.240 | 84.729 | n/a | n/a | 0.111 | 20.797 | 0.457 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000000280 | 133.295 | 5.482 | 0.154 | 0.000 | 0.096 | 1.885 | 15.339 | 0.051 | n/a | 0.133 | 110.096 | n/a | n/a | 0.058 | 5.732 | 0.043 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000021c | 100.496 | 4.517 | 0.277 | 0.000 | 0.046 | 1.335 | 9.157 | 0.046 | n/a | 0.343 | 84.729 | n/a | n/a | 0.045 | 4.839 | 0.048 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000229 | 86.213 | 6.165 | 0.005 | 0.000 | 0.367 | 0.696 | 4.855 | 0.039 | n/a | 0.071 | 73.972 | n/a | n/a | 0.043 | 6.537 | 0.076 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000204 | 81.021 | 8.016 | 0.228 | 0.000 | 0.069 | 1.210 | 14.267 | 0.046 | n/a | 0.119 | 57.011 | n/a | n/a | 0.056 | 8.313 | 0.103 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.637ms |
| 067b4fd88797856a0000000000000208 | 73.547 | 7.156 | 0.378 | 0.000 | 0.101 | 2.259 | 47.986 | 0.109 | n/a | 0.130 | 15.373 | n/a | n/a | 0.055 | 7.635 | 0.104 | 0.055 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| 067b4fd88797856a00000000000002aa | 66.558 | 5.994 | 0.005 | 0.000 | 0.563 | 0.576 | 39.736 | 0.055 | n/a | 0.158 | 19.438 | n/a | n/a | 0.032 | 6.562 | 0.099 | 0.032 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| 067b4fd88797856a0000000000000205 | 65.929 | 19.945 | 0.014 | 0.000 | 0.838 | 5.774 | 22.106 | 0.207 | n/a | 3.040 | 13.903 | n/a | n/a | 0.103 | 20.797 | 0.315 | 0.103 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000209 | 63.574 | 5.396 | 0.013 | 0.000 | 0.705 | 23.434 | 1.965 | 0.079 | n/a | 4.321 | 27.594 | n/a | n/a | 0.067 | 6.114 | 0.096 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000027e | 61.158 | 6.454 | 0.161 | 0.000 | 0.083 | 1.550 | 8.422 | 0.051 | n/a | 0.132 | 44.234 | n/a | n/a | 0.072 | 6.698 | 0.110 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000025d | 53.286 | 3.955 | 0.006 | 0.000 | 0.178 | 0.582 | 0.851 | 0.182 | n/a | 0.039 | 47.425 | n/a | n/a | 0.067 | 4.139 | 0.078 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.601ms |
| 067b4fd88797856a0000000000000230 | 51.558 | 4.196 | 0.252 | 0.000 | 0.112 | 1.314 | 36.584 | 0.054 | n/a | 0.353 | 8.610 | n/a | n/a | 0.082 | 4.560 | 0.088 | 0.082 | gw-w/thread-47/gateway.admitted-work | none observed |
| 067b4fd88797856a00000000000002be | 50.648 | 41.675 | 0.006 | 0.000 | 0.846 | 1.036 | 1.227 | 0.036 | n/a | 0.134 | 5.625 | n/a | n/a | 0.061 | 42.528 | 0.840 | 0.061 | node-14/thread-0/driver.publication | none observed |
| 067b4fd88797856a0000000000000210 | 45.857 | 3.817 | 0.158 | 0.000 | 0.067 | 1.222 | 9.924 | 0.044 | n/a | 0.459 | 30.125 | n/a | n/a | 0.041 | 4.042 | 0.088 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000252 | 43.812 | 5.818 | 0.246 | 0.000 | 0.070 | 1.653 | 16.770 | 0.034 | n/a | 0.337 | 18.828 | n/a | n/a | 0.055 | 6.135 | 0.140 | 0.055 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000249 | 41.232 | 4.591 | 0.299 | 0.000 | 0.122 | 1.495 | 13.093 | 0.058 | n/a | 0.110 | 21.398 | n/a | n/a | 0.067 | 5.011 | 0.122 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.199ms |
| 067b4fd88797856a0000000000000211 | 40.485 | 5.849 | 0.007 | 0.000 | 0.677 | 0.872 | 1.389 | 0.047 | n/a | 0.959 | 30.635 | n/a | n/a | 0.050 | 6.533 | 0.161 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000020e | 40.357 | 4.950 | 0.310 | 0.000 | 0.061 | 1.475 | 13.135 | 0.091 | n/a | 0.166 | 20.110 | n/a | n/a | 0.061 | 5.320 | 0.132 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000292 | 37.833 | 4.588 | 0.184 | 0.000 | 0.088 | 1.599 | 13.066 | 0.050 | n/a | 0.105 | 18.103 | n/a | n/a | 0.050 | 4.860 | 0.128 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000215 | 35.464 | 5.536 | 0.299 | 0.000 | 0.030 | 2.207 | 3.456 | 0.105 | n/a | 0.657 | 23.124 | n/a | n/a | 0.049 | 5.865 | 0.165 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.485ms |
| 067b4fd88797856a000000000000027b | 34.689 | 6.533 | 0.585 | 0.000 | 0.175 | 2.161 | 8.380 | 0.090 | n/a | 0.193 | 16.477 | n/a | n/a | 0.096 | 7.292 | 0.210 | 0.096 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (1704 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.816 | 0.860 | 0.000 | 1.656 | 3.747 | 0.005 | 0.000 | 0.775 | 0.846 | 1.227 | 0.035 | n/a | 0.133 | 7.373 | n/a | n/a | 0.038 | 4.866 | 0.321 | 0.038 |
| p99 | 116.414 | 3.476 | 0.152 | 7.570 | 17.343 | 4.703 | 0.000 | 33.484 | 21.908 | 15.280 | 3.836 | n/a | 3.635 | 63.877 | n/a | n/a | 0.114 | 47.552 | 0.754 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a00000000000002d1 | 195.937 | 7.991 | 0.261 | 0.000 | 0.105 | 1.841 | 16.162 | 0.142 | n/a | 0.227 | 169.156 | n/a | n/a | 0.053 | 8.356 | 0.043 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.352ms |
| 067b4fd88797856a00000000000002d2 | 183.348 | 5.287 | 0.009 | 0.000 | 1.043 | 2.997 | 4.344 | 0.054 | n/a | 0.114 | 169.430 | n/a | n/a | 0.069 | 6.338 | 0.035 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000000ea8 | 180.574 | 20.914 | 8.162 | 0.000 | 22.119 | 3.261 | 10.149 | 6.591 | n/a | 0.134 | 109.208 | n/a | n/a | 0.036 | 51.194 | 0.284 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 17.574ms; driver.publication 3.557ms; driver.publication 2.849ms; driver.publication 2.458ms; driver.expected-state.bind-receipt 2.314ms |
| 067b4fd88797856a0000000000000ef7 | 175.157 | 4.447 | 0.006 | 0.000 | 153.526 | 3.341 | 1.757 | 0.036 | n/a | 0.138 | 11.874 | n/a | n/a | 0.033 | 157.980 | 0.902 | 0.033 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 11.551ms; driver.publication 6.045ms; driver.publication 5.195ms; driver.publication 3.768ms; driver.expected-state.bind-receipt 2.898ms |
| 067b4fd88797856a0000000000000ea9 | 173.465 | 18.359 | 9.104 | 0.000 | 13.668 | 11.241 | 1.985 | 8.170 | n/a | 0.055 | 110.849 | n/a | n/a | 0.034 | 41.131 | 0.237 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 8.370ms; driver.publication 3.557ms; driver.publication 2.849ms; driver.publication 2.458ms; driver.publication 2.369ms |
| 067b4fd88797856a0000000000000ef6 | 155.219 | 27.768 | 2.831 | 0.000 | 26.810 | 37.150 | 20.645 | 16.346 | n/a | 0.190 | 23.414 | n/a | n/a | 0.064 | 57.408 | 0.370 | 0.064 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 11.551ms; driver.publication 6.045ms; driver.publication 5.195ms; driver.publication 3.768ms; driver.expected-state.bind-receipt 2.898ms |
| 067b4fd88797856a0000000000000ea6 | 153.414 | 21.708 | 6.566 | 0.000 | 39.212 | 1.465 | 21.000 | 0.091 | n/a | 1.451 | 61.708 | n/a | n/a | 0.213 | 67.487 | 0.440 | 0.213 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 23.892ms; driver.publication 4.986ms; driver.publication 3.557ms; driver.publication 2.849ms; driver.publication 1.978ms |
| 067b4fd88797856a0000000000000ea7 | 151.772 | 16.841 | 9.912 | 0.000 | 33.807 | 9.289 | 2.782 | 16.048 | n/a | 0.790 | 62.176 | n/a | n/a | 0.127 | 60.560 | 0.399 | 0.127 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 23.892ms; driver.publication 3.557ms; driver.publication 2.849ms; driver.publication 2.458ms; driver.expected-state.bind-receipt 2.314ms |
| 067b4fd88797856a0000000000000ef0 | 145.384 | 25.404 | 0.021 | 0.000 | 20.354 | 11.300 | 19.653 | 0.306 | n/a | 0.196 | 68.044 | n/a | n/a | 0.107 | 45.778 | 0.315 | 0.107 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 6.045ms; driver.publication 3.386ms; driver.expected-state.bind-receipt 2.898ms; driver.publication 2.588ms; driver.publication 2.573ms |
| 067b4fd88797856a0000000000000e9e | 140.663 | 10.264 | 0.010 | 0.000 | 2.647 | 64.973 | 6.486 | 0.054 | n/a | 0.167 | 55.931 | n/a | n/a | 0.132 | 12.921 | 0.092 | 0.132 | node-14/thread-0/socket.wait-first-byte | driver.publication 23.892ms; driver.publication 11.352ms; driver.publication 4.986ms; driver.publication 4.421ms; client.encode 1.368ms |
| 067b4fd88797856a0000000000000e9d | 138.449 | 35.109 | 4.532 | 0.000 | 9.113 | 21.435 | 1.024 | 5.436 | n/a | 0.008 | 61.730 | n/a | n/a | 0.062 | 48.754 | 0.352 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 11.352ms; driver.publication 4.986ms; driver.publication 4.421ms; driver.expected-state.bind-receipt 1.806ms; client.encode 1.368ms |
| 067b4fd88797856a0000000000000ef2 | 132.196 | 15.340 | 0.099 | 0.000 | 1.172 | 6.750 | 3.635 | 0.058 | n/a | 0.473 | 104.565 | n/a | n/a | 0.104 | 16.611 | 0.126 | 0.104 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 11.551ms; driver.publication 6.045ms; driver.publication 5.195ms; driver.expected-state.bind-receipt 2.898ms; driver.publication 2.573ms |
| 067b4fd88797856a0000000000000eed | 131.124 | 21.153 | 4.703 | 0.000 | 8.669 | 54.196 | 1.640 | 2.582 | n/a | 0.290 | 37.821 | n/a | n/a | 0.071 | 34.525 | 0.263 | 0.071 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.208ms; driver.publication 3.386ms; driver.publication 2.588ms; driver.publication 2.573ms; driver.publication 2.462ms |
| 067b4fd88797856a0000000000000efa | 130.067 | 3.785 | 0.005 | 0.000 | 113.348 | 0.629 | 1.305 | 0.026 | n/a | 0.111 | 10.819 | n/a | n/a | 0.040 | 117.138 | 0.901 | 0.040 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 11.551ms; driver.publication 5.195ms; driver.publication 3.768ms; driver.expected-state.bind-receipt 2.249ms; driver.publication 2.148ms |
| 067b4fd88797856a0000000000000ef5 | 125.838 | 20.301 | 0.014 | 0.000 | 27.993 | 24.352 | 23.874 | 0.564 | n/a | 2.741 | 25.931 | n/a | n/a | 0.070 | 48.308 | 0.384 | 0.070 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 11.551ms; driver.publication 6.045ms; driver.publication 5.195ms; driver.publication 3.768ms; driver.expected-state.bind-receipt 2.898ms |
| 067b4fd88797856a0000000000000ea0 | 121.891 | 7.186 | 0.010 | 0.000 | 10.986 | 64.277 | 2.947 | 0.158 | n/a | 0.217 | 36.058 | n/a | n/a | 0.052 | 18.183 | 0.149 | 0.052 | node-14/thread-0/socket.wait-first-byte | driver.publication 23.892ms; driver.publication 8.649ms; driver.publication 4.986ms; driver.publication 4.421ms; driver.publication 3.557ms |
| 067b4fd88797856a0000000000000e9c | 120.655 | 18.640 | 3.030 | 0.000 | 17.297 | 12.338 | 1.594 | 7.805 | n/a | 0.030 | 59.873 | n/a | n/a | 0.049 | 38.967 | 0.323 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 11.352ms; driver.publication 9.534ms; driver.publication 4.421ms; driver.expected-state.bind-receipt 1.806ms; client.encode 1.368ms |
| 067b4fd88797856a0000000000000eaf | 116.414 | 19.444 | 0.014 | 0.000 | 4.826 | 3.301 | 4.749 | 5.543 | n/a | 0.104 | 78.360 | n/a | n/a | 0.072 | 24.284 | 0.209 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.458ms; driver.publication 2.369ms; driver.expected-state.bind-receipt 2.314ms; driver.publication 1.828ms; driver.publication 1.338ms |
| 067b4fd88797856a0000000000000eae | 116.065 | 9.104 | 0.010 | 0.000 | 6.213 | 6.443 | 28.951 | 0.418 | n/a | 1.012 | 63.877 | n/a | n/a | 0.037 | 15.327 | 0.132 | 0.037 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 2.849ms; driver.publication 2.458ms; driver.publication 2.369ms; driver.expected-state.bind-receipt 2.314ms; driver.publication 1.828ms |
| 067b4fd88797856a0000000000000ef9 | 111.018 | 29.486 | 11.285 | 0.000 | 0.090 | 2.670 | 45.947 | 0.057 | n/a | 1.605 | 19.829 | n/a | n/a | 0.049 | 40.861 | 0.368 | 0.049 | gw-w/thread-46/gateway.admitted-work | driver.expected-state.bind-receipt 11.551ms; driver.publication 5.195ms; driver.publication 3.768ms; driver.expected-state.bind-receipt 2.249ms; driver.publication 2.148ms |

## P2 / L16 / commit (1774 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.566 | 0.827 | 0.000 | 1.664 | 3.901 | 0.006 | 0.000 | 0.797 | 0.771 | 1.231 | 0.033 | n/a | 0.115 | 6.256 | n/a | n/a | 0.038 | 5.115 | 0.353 | 0.038 |
| p99 | 83.004 | 3.129 | 0.136 | 6.220 | 13.757 | 2.367 | 0.000 | 32.429 | 18.110 | 13.357 | 2.664 | n/a | 3.266 | 54.337 | n/a | n/a | 0.105 | 38.968 | 0.771 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a00000000000015be | 155.123 | 3.382 | 0.005 | 0.000 | 128.249 | 4.991 | 1.333 | 0.044 | n/a | 0.170 | 16.910 | n/a | n/a | 0.039 | 131.636 | 0.849 | 0.039 | node-14/thread-0/driver.queue.subject | driver.publication 5.267ms; driver.expected-state.bind-receipt 3.671ms; driver.publication 3.564ms; driver.publication 2.183ms; driver.expected-state.bind-receipt 1.643ms |
| 067b4fd88797856a00000000000015bd | 129.718 | 28.433 | 0.015 | 0.000 | 8.177 | 66.953 | 16.566 | 0.093 | n/a | 5.781 | 3.579 | n/a | n/a | 0.121 | 36.625 | 0.282 | 0.121 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.267ms; driver.expected-state.bind-receipt 3.671ms; driver.publication 3.564ms; driver.publication 2.183ms; driver.publication 1.192ms |
| 067b4fd88797856a0000000000001284 | 126.496 | 11.143 | 0.015 | 0.000 | 0.811 | 35.543 | 6.452 | 0.684 | n/a | 0.294 | 71.510 | n/a | n/a | 0.044 | 11.969 | 0.095 | 0.044 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.452ms; driver.expected-state.bind-receipt 1.849ms; driver.publication 1.644ms; driver.publication 1.493ms; driver.publication 1.407ms |
| 067b4fd88797856a00000000000015c0 | 121.748 | 21.885 | 0.010 | 0.000 | 14.732 | 49.610 | 20.785 | 0.060 | n/a | 0.453 | 14.157 | n/a | n/a | 0.057 | 36.626 | 0.301 | 0.057 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.267ms; driver.expected-state.bind-receipt 3.671ms; driver.publication 3.564ms; driver.publication 2.183ms; driver.expected-state.bind-receipt 1.643ms |
| 067b4fd88797856a0000000000001b10 | 115.423 | 3.178 | 0.007 | 0.000 | 90.875 | 5.837 | 1.365 | 0.041 | n/a | 0.095 | 13.979 | n/a | n/a | 0.046 | 94.060 | 0.815 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 1.635ms; driver.publication 1.583ms; driver.publication 1.387ms; driver.publication 1.385ms; driver.publication 1.333ms |
| 067b4fd88797856a00000000000015ba | 108.873 | 11.947 | 0.007 | 0.000 | 11.632 | 12.393 | 2.800 | 0.033 | n/a | 3.806 | 66.168 | n/a | n/a | 0.088 | 23.586 | 0.217 | 0.088 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 6.592ms; driver.publication 4.607ms; driver.publication 2.500ms; client.encode 2.404ms; driver.expected-state.bind-receipt 1.591ms |
| 067b4fd88797856a00000000000015d5 | 104.000 | 3.280 | 0.006 | 0.000 | 91.796 | 0.424 | 0.839 | 0.032 | n/a | 0.090 | 7.483 | n/a | n/a | 0.050 | 95.082 | 0.914 | 0.050 | node-14/thread-0/driver.queue.subject | driver.publication 4.551ms; driver.publication 2.741ms; driver.publication 2.222ms; driver.publication 1.391ms; driver.publication 1.379ms |
| 067b4fd88797856a00000000000015bf | 99.997 | 8.697 | 0.006 | 0.000 | 15.269 | 48.480 | 2.444 | 10.195 | n/a | 0.119 | 14.719 | n/a | n/a | 0.068 | 23.972 | 0.240 | 0.068 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 3.671ms; driver.publication 2.183ms |
| 067b4fd88797856a0000000000001b0f | 99.720 | 3.849 | 0.010 | 0.000 | 62.981 | 9.888 | 0.898 | 0.024 | n/a | 0.035 | 22.005 | n/a | n/a | 0.031 | 66.839 | 0.670 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 1.635ms; driver.publication 1.583ms; driver.publication 1.387ms; driver.publication 1.385ms; driver.publication 1.261ms |
| 067b4fd88797856a0000000000001b13 | 97.965 | 4.899 | 0.008 | 0.000 | 83.241 | 0.885 | 0.930 | 0.028 | n/a | 0.063 | 7.858 | n/a | n/a | 0.052 | 88.148 | 0.900 | 0.052 | node-14/thread-0/driver.queue.subject | driver.publication 1.583ms; driver.publication 1.387ms; driver.publication 1.385ms; driver.publication 1.333ms; driver.publication 1.281ms |
| 067b4fd88797856a00000000000018cb | 95.684 | 23.365 | 0.007 | 0.000 | 38.218 | 14.700 | 13.799 | 0.315 | n/a | 2.612 | 2.596 | n/a | n/a | 0.072 | 61.591 | 0.644 | 0.072 | node-14/thread-0/driver.queue.subject | driver.publication 9.116ms; driver.publication 7.553ms; driver.publication 2.580ms; driver.publication 2.502ms; driver.expected-state.bind-receipt 1.693ms |
| 067b4fd88797856a0000000000001e92 | 95.123 | 6.260 | 0.158 | 0.000 | 0.040 | 3.702 | 2.729 | 0.036 | n/a | 0.458 | 81.708 | n/a | n/a | 0.031 | 6.458 | 0.068 | 0.031 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000015d4 | 93.559 | 6.007 | 0.007 | 0.000 | 66.227 | 0.471 | 1.280 | 0.050 | n/a | 0.078 | 19.399 | n/a | n/a | 0.040 | 72.241 | 0.772 | 0.040 | node-14/thread-0/driver.queue.subject | driver.publication 4.551ms; driver.publication 2.222ms; driver.publication 1.391ms; driver.publication 1.379ms; driver.expected-state.bind-receipt 1.198ms |
| 067b4fd88797856a0000000000001243 | 93.359 | 2.516 | 0.004 | 0.000 | 66.765 | 1.886 | 0.829 | 0.027 | n/a | 0.075 | 21.223 | n/a | n/a | 0.035 | 69.284 | 0.742 | 0.035 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.199ms; driver.publication 1.680ms; driver.publication 1.650ms; driver.publication 1.513ms; driver.publication 1.232ms |
| 067b4fd88797856a0000000000001749 | 92.679 | 14.256 | 0.006 | 3.701 | 0.066 | 15.733 | 4.338 | 0.106 | n/a | 0.134 | 54.312 | n/a | n/a | 0.027 | 18.028 | 0.195 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.570ms; driver.publication 1.273ms; driver.publication 1.246ms; driver.publication 1.173ms; driver.expected-state.bind-receipt 1.006ms |
| 067b4fd88797856a0000000000001119 | 92.310 | 4.596 | 0.005 | 0.000 | 11.226 | 0.901 | 1.220 | 0.031 | n/a | 0.133 | 74.160 | n/a | n/a | 0.039 | 15.826 | 0.171 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.122ms |
| 067b4fd88797856a0000000000001287 | 89.762 | 4.094 | 0.008 | 0.000 | 65.753 | 6.758 | 0.816 | 0.029 | n/a | 0.126 | 12.147 | n/a | n/a | 0.032 | 69.854 | 0.778 | 0.032 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.849ms; driver.publication 1.644ms; driver.publication 1.329ms; driver.expected-state.bind-receipt 1.306ms; driver.publication 1.283ms |
| 067b4fd88797856a00000000000015c5 | 83.004 | 13.437 | 0.853 | 0.000 | 11.650 | 12.054 | 6.025 | 19.384 | n/a | 0.037 | 19.514 | n/a | n/a | 0.050 | 25.940 | 0.313 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.267ms; driver.expected-state.bind-receipt 3.671ms; driver.publication 3.564ms; driver.publication 2.183ms; driver.publication 1.192ms |
| 067b4fd88797856a0000000000001a13 | 82.691 | 8.304 | 0.016 | 0.000 | 3.975 | 1.028 | 1.895 | 0.053 | n/a | 0.166 | 67.195 | n/a | n/a | 0.060 | 12.295 | 0.149 | 0.060 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 2.583ms; driver.publication 1.794ms; driver.publication 0.060ms |
| 067b4fd88797856a000000000000111c | 81.890 | 4.178 | 0.006 | 0.000 | 0.356 | 3.411 | 0.968 | 0.024 | n/a | 0.259 | 72.656 | n/a | n/a | 0.033 | 4.539 | 0.055 | 0.033 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.006ms |

## P2 / L64 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.663 | 0.699 | 0.000 | 1.489 | 5.214 | 0.014 | 0.000 | 0.116 | 1.183 | 2.406 | 0.039 | n/a | 0.163 | 7.237 | n/a | n/a | 0.062 | 5.537 | 0.324 | 0.062 |
| p99 | 456.557 | 5.919 | 0.019 | 7.879 | 21.614 | 4.805 | 0.000 | 3.520 | 20.161 | 87.176 | 0.687 | n/a | 3.103 | 351.585 | n/a | n/a | 0.389 | 22.531 | 0.617 | 0.389 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000001f46 | 456.557 | 7.338 | 4.805 | 0.000 | 0.078 | 2.650 | 87.176 | 0.134 | n/a | 2.757 | 351.585 | n/a | n/a | 0.035 | 12.220 | 0.027 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 4.294ms; driver.expected-state.bind-receipt 1.240ms |
| 067b4fd88797856a0000000000001f48 | 244.089 | 14.850 | 0.014 | 0.000 | 0.477 | 0.876 | 1.856 | 0.049 | n/a | 1.513 | 224.064 | n/a | n/a | 0.389 | 15.342 | 0.063 | 0.389 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f59 | 56.882 | 19.156 | 0.332 | 0.000 | 0.062 | 20.161 | 8.177 | 0.046 | n/a | 0.120 | 8.746 | n/a | n/a | 0.082 | 19.550 | 0.344 | 0.082 | node-14/thread-9/client.persist-and-resolve | none observed |
| 067b4fd88797856a0000000000001f08 | 56.873 | 21.614 | 0.015 | 0.000 | 0.902 | 1.861 | 13.411 | 0.687 | n/a | 0.290 | 17.989 | n/a | n/a | 0.103 | 22.531 | 0.396 | 0.103 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f0a | 52.861 | 13.380 | 0.225 | 0.000 | 0.086 | 15.327 | 7.742 | 0.123 | n/a | 0.344 | 15.568 | n/a | n/a | 0.067 | 13.692 | 0.259 | 0.067 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001ed3 | 48.781 | 5.511 | 0.200 | 0.000 | 0.047 | 4.564 | 8.337 | 0.042 | n/a | 0.141 | 29.898 | n/a | n/a | 0.041 | 5.758 | 0.118 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f32 | 47.044 | 10.473 | 0.313 | 0.000 | 0.068 | 1.877 | 14.028 | 0.093 | n/a | 0.846 | 19.260 | n/a | n/a | 0.086 | 10.854 | 0.231 | 0.086 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f40 | 44.679 | 5.453 | 0.216 | 0.000 | 0.042 | 3.659 | 12.240 | 0.044 | n/a | 0.157 | 22.776 | n/a | n/a | 0.093 | 5.710 | 0.128 | 0.093 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f6b | 40.844 | 11.152 | 2.374 | 0.000 | 0.067 | 2.613 | 9.000 | 0.035 | n/a | 0.414 | 15.113 | n/a | n/a | 0.077 | 13.593 | 0.333 | 0.077 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001ee6 | 39.482 | 10.578 | 0.268 | 0.000 | 0.046 | 2.459 | 13.749 | 0.074 | n/a | 0.159 | 12.100 | n/a | n/a | 0.049 | 10.891 | 0.276 | 0.049 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f55 | 38.351 | 8.259 | 0.244 | 0.000 | 0.063 | 3.079 | 19.903 | 0.185 | n/a | 0.079 | 6.500 | n/a | n/a | 0.041 | 8.565 | 0.223 | 0.041 | gw-w/thread-45/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000001f67 | 37.833 | 7.773 | 0.240 | 0.000 | 0.045 | 3.801 | 15.888 | 0.087 | n/a | 0.199 | 9.729 | n/a | n/a | 0.070 | 8.059 | 0.213 | 0.070 | gw-w/thread-43/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000001ef1 | 35.967 | 7.317 | 0.011 | 0.000 | 0.855 | 1.531 | 11.131 | 0.108 | n/a | 2.866 | 12.114 | n/a | n/a | 0.033 | 8.183 | 0.228 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f26 | 32.278 | 9.290 | 0.272 | 0.000 | 0.037 | 1.323 | 11.624 | 0.061 | n/a | 0.161 | 9.459 | n/a | n/a | 0.052 | 9.599 | 0.297 | 0.052 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001ee1 | 32.057 | 5.274 | 0.006 | 0.000 | 0.917 | 1.725 | 1.867 | 0.030 | n/a | 0.069 | 22.085 | n/a | n/a | 0.085 | 6.196 | 0.193 | 0.085 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f5d | 31.971 | 5.214 | 0.176 | 0.000 | 0.034 | 4.047 | 11.399 | 0.049 | n/a | 0.107 | 10.901 | n/a | n/a | 0.044 | 5.424 | 0.170 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f81 | 31.596 | 6.747 | 0.250 | 0.000 | 0.041 | 1.647 | 11.178 | 0.061 | n/a | 0.189 | 11.430 | n/a | n/a | 0.053 | 7.038 | 0.223 | 0.053 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f34 | 31.511 | 9.110 | 0.264 | 0.000 | 0.050 | 1.613 | 11.909 | 0.047 | n/a | 0.369 | 8.094 | n/a | n/a | 0.055 | 9.424 | 0.299 | 0.055 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000001ee8 | 31.402 | 7.209 | 0.206 | 0.000 | 0.072 | 1.435 | 11.979 | 0.040 | n/a | 0.131 | 10.276 | n/a | n/a | 0.053 | 7.487 | 0.238 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f24 | 31.203 | 6.457 | 0.159 | 0.000 | 0.042 | 6.972 | 11.073 | 0.049 | n/a | 0.149 | 6.241 | n/a | n/a | 0.062 | 6.658 | 0.213 | 0.062 | gw-w/thread-44/gateway.admitted-work | none observed |

## P2 / L256 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.413 | 0.496 | 0.000 | 1.307 | 5.092 | 0.018 | 0.000 | 0.145 | 1.183 | 1.856 | 0.036 | n/a | 0.114 | 7.529 | n/a | n/a | 0.062 | 5.733 | 0.318 | 0.062 |
| p99 | 236.729 | 2.976 | 0.009 | 4.900 | 35.159 | 7.604 | 0.000 | 3.016 | 14.849 | 88.588 | 0.391 | n/a | 3.669 | 229.633 | n/a | n/a | 0.130 | 41.281 | 0.631 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000001fdd | 236.729 | 4.563 | 0.006 | 0.000 | 0.548 | 0.621 | 0.982 | 0.027 | n/a | 0.305 | 229.633 | n/a | n/a | 0.044 | 5.117 | 0.022 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001fde | 195.436 | 7.535 | 0.212 | 0.000 | 0.061 | 3.049 | 4.863 | 0.049 | n/a | 0.083 | 179.514 | n/a | n/a | 0.070 | 7.808 | 0.040 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.867ms |
| 067b4fd88797856a0000000000001fdf | 143.060 | 3.821 | 0.005 | 0.000 | 0.896 | 3.002 | 0.828 | 0.025 | n/a | 0.059 | 134.381 | n/a | n/a | 0.042 | 4.722 | 0.033 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.867ms |
| 067b4fd88797856a000000000000202d | 106.732 | 9.083 | 0.154 | 0.000 | 0.043 | 1.079 | 88.588 | 0.081 | n/a | 0.146 | 7.505 | n/a | n/a | 0.052 | 9.280 | 0.087 | 0.052 | gw-w/thread-65/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000002015 | 101.274 | 5.303 | 2.416 | 0.000 | 0.042 | 7.473 | 10.010 | 0.035 | n/a | 0.070 | 75.876 | n/a | n/a | 0.049 | 7.760 | 0.077 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000200b | 92.229 | 33.826 | 0.451 | 0.000 | 0.070 | 6.433 | 11.169 | 0.059 | n/a | 0.151 | 39.946 | n/a | n/a | 0.125 | 34.346 | 0.372 | 0.125 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001fa2 | 82.584 | 3.504 | 0.014 | 0.000 | 0.657 | 0.531 | 5.794 | 0.024 | n/a | 0.056 | 71.954 | n/a | n/a | 0.051 | 4.175 | 0.051 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f96 | 70.453 | 11.528 | 0.183 | 0.000 | 0.044 | 1.385 | 7.519 | 0.044 | n/a | 0.127 | 49.556 | n/a | n/a | 0.067 | 11.755 | 0.167 | 0.067 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001fe5 | 65.425 | 35.159 | 6.072 | 0.000 | 0.050 | 1.286 | 9.049 | 0.051 | n/a | 0.099 | 13.600 | n/a | n/a | 0.059 | 41.281 | 0.631 | 0.059 | node-14/thread-9/client.persist-and-resolve | none observed |
| 067b4fd88797856a0000000000001fa8 | 58.684 | 5.131 | 0.662 | 0.000 | 0.081 | 14.849 | 17.988 | 0.111 | n/a | 0.226 | 19.507 | n/a | n/a | 0.130 | 5.873 | 0.100 | 0.130 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002003 | 49.465 | 9.351 | 2.464 | 0.000 | 0.135 | 8.013 | 10.347 | 0.072 | n/a | 0.183 | 18.771 | n/a | n/a | 0.129 | 11.950 | 0.242 | 0.129 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.worker-message 1.874ms |
| 067b4fd88797856a0000000000001f9c | 48.279 | 13.610 | 0.351 | 0.000 | 0.045 | 1.749 | 11.856 | 0.083 | n/a | 3.669 | 16.835 | n/a | n/a | 0.079 | 14.006 | 0.290 | 0.079 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000203f | 47.925 | 8.551 | 0.205 | 0.000 | 0.043 | 1.433 | 27.847 | 0.051 | n/a | 0.064 | 9.675 | n/a | n/a | 0.056 | 8.799 | 0.184 | 0.056 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 067b4fd88797856a0000000000002023 | 45.739 | 4.243 | 7.604 | 0.000 | 0.052 | 13.508 | 7.747 | 0.042 | n/a | 0.068 | 12.412 | n/a | n/a | 0.063 | 11.899 | 0.260 | 0.063 | node-14/thread-9/socket.wait-first-byte | none observed |
| 067b4fd88797856a0000000000001fc6 | 40.698 | 3.275 | 0.203 | 0.000 | 0.045 | 0.969 | 31.307 | 0.031 | n/a | 0.092 | 4.714 | n/a | n/a | 0.062 | 3.523 | 0.087 | 0.062 | gw-w/thread-43/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000203b | 39.433 | 4.935 | 0.183 | 0.000 | 0.059 | 6.925 | 9.592 | 0.080 | n/a | 0.553 | 17.044 | n/a | n/a | 0.062 | 5.177 | 0.131 | 0.062 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000200d | 37.160 | 11.418 | 0.236 | 0.000 | 0.073 | 1.509 | 7.609 | 0.116 | n/a | 0.086 | 16.017 | n/a | n/a | 0.095 | 11.728 | 0.316 | 0.095 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001fb0 | 36.725 | 11.567 | 0.220 | 0.000 | 0.060 | 5.000 | 4.165 | 0.042 | n/a | 0.091 | 15.510 | n/a | n/a | 0.070 | 11.847 | 0.323 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000001f87 | 34.517 | 4.024 | 0.253 | 0.000 | 0.045 | 4.140 | 17.741 | 0.062 | n/a | 0.605 | 7.592 | n/a | n/a | 0.056 | 4.322 | 0.125 | 0.056 | gw-w/thread-47/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000002049 | 32.240 | 8.728 | 0.334 | 0.000 | 0.043 | 1.810 | 4.503 | 0.047 | n/a | 0.073 | 16.644 | n/a | n/a | 0.057 | 9.105 | 0.282 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.840 | 0.602 | 0.000 | 1.479 | 7.121 | 0.016 | 0.000 | 0.135 | 1.267 | 2.099 | 0.044 | n/a | 0.115 | 8.434 | n/a | n/a | 0.067 | 7.731 | 0.369 | 0.067 |
| p99 | 374.958 | 74.002 | 3.214 | 72.547 | 94.948 | 179.933 | 0.529 | 3.160 | 20.294 | 22.247 | 0.289 | n/a | 2.083 | 209.317 | n/a | n/a | 1.532 | 212.383 | 0.872 | 1.532 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000002101 | 374.958 | 31.842 | 179.933 | 0.529 | 0.080 | 9.973 | 8.458 | 0.079 | n/a | 0.147 | 142.386 | n/a | n/a | 1.532 | 212.383 | 0.566 | 1.532 | node-14/thread-0/rpc.probe.transact | none observed |
| 067b4fd88797856a000000000000206a | 250.067 | 10.484 | 1.370 | 0.000 | 0.049 | 9.254 | 19.280 | 0.053 | n/a | 0.117 | 209.317 | n/a | n/a | 0.144 | 11.903 | 0.048 | 0.144 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002068 | 110.179 | 94.948 | 0.010 | 0.000 | 1.129 | 0.899 | 2.513 | 0.038 | n/a | 0.124 | 10.384 | n/a | n/a | 0.135 | 96.086 | 0.872 | 0.135 | node-14/thread-0/driver.expected-state.bind-receipt | none observed |
| 067b4fd88797856a00000000000020d1 | 94.635 | 8.535 | 0.223 | 0.000 | 0.097 | 3.081 | 6.075 | 0.072 | n/a | 0.084 | 76.401 | n/a | n/a | 0.067 | 8.854 | 0.094 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000207c | 90.504 | 10.406 | 0.166 | 0.000 | 0.044 | 5.036 | 8.333 | 0.038 | n/a | 0.341 | 66.072 | n/a | n/a | 0.067 | 10.617 | 0.117 | 0.067 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020f1 | 75.461 | 3.725 | 0.006 | 0.000 | 0.553 | 1.143 | 0.767 | 0.025 | n/a | 0.209 | 68.977 | n/a | n/a | 0.056 | 4.284 | 0.057 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020d4 | 68.875 | 4.455 | 0.006 | 0.000 | 1.013 | 0.690 | 1.539 | 0.042 | n/a | 0.112 | 60.959 | n/a | n/a | 0.061 | 5.473 | 0.079 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000208f | 66.433 | 9.914 | 0.015 | 0.000 | 0.988 | 0.828 | 2.524 | 0.067 | n/a | 0.819 | 51.204 | n/a | n/a | 0.074 | 10.917 | 0.164 | 0.074 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002052 | 62.642 | 5.999 | 0.261 | 0.000 | 0.041 | 7.458 | 2.934 | 0.065 | n/a | 0.125 | 45.701 | n/a | n/a | 0.059 | 6.300 | 0.101 | 0.059 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020b9 | 60.938 | 7.475 | 0.007 | 0.000 | 0.976 | 0.905 | 2.668 | 0.049 | n/a | 0.116 | 48.690 | n/a | n/a | 0.052 | 8.458 | 0.139 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020a7 | 59.208 | 5.096 | 0.012 | 0.000 | 1.119 | 0.990 | 1.331 | 0.054 | n/a | 0.125 | 50.407 | n/a | n/a | 0.072 | 6.227 | 0.105 | 0.072 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002103 | 56.837 | 9.764 | 0.611 | 0.000 | 0.136 | 6.145 | 18.917 | 0.216 | n/a | 0.315 | 20.557 | n/a | n/a | 0.176 | 10.511 | 0.185 | 0.176 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020ff | 50.632 | 12.440 | 0.220 | 0.000 | 0.046 | 20.294 | 5.656 | 0.043 | n/a | 0.290 | 11.586 | n/a | n/a | 0.056 | 12.707 | 0.251 | 0.056 | node-14/thread-9/socket.wait-first-byte | none observed |
| 067b4fd88797856a000000000000205a | 50.074 | 8.408 | 0.802 | 0.000 | 0.040 | 1.974 | 13.224 | 0.074 | n/a | 0.392 | 25.087 | n/a | n/a | 0.073 | 9.250 | 0.185 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000205e | 48.907 | 4.960 | 0.173 | 0.000 | 0.042 | 9.428 | 14.127 | 0.091 | n/a | 0.956 | 19.077 | n/a | n/a | 0.055 | 5.174 | 0.106 | 0.055 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020b1 | 47.216 | 5.256 | 0.202 | 0.000 | 0.042 | 3.525 | 22.247 | 0.099 | n/a | 0.137 | 15.605 | n/a | n/a | 0.104 | 5.499 | 0.116 | 0.104 | gw-w/thread-46/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000206e | 46.436 | 24.502 | 5.597 | 0.000 | 0.046 | 2.305 | 4.247 | 0.044 | n/a | 0.433 | 9.169 | n/a | n/a | 0.093 | 30.145 | 0.649 | 0.093 | node-14/thread-0/driver.expected-state.bind-receipt | driver.worker-message 3.161ms; driver.worker-message 3.145ms |
| 067b4fd88797856a0000000000002095 | 46.106 | 7.121 | 0.393 | 0.000 | 0.061 | 1.168 | 5.102 | 0.046 | n/a | 1.171 | 30.973 | n/a | n/a | 0.071 | 7.575 | 0.164 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000020ed | 42.375 | 17.381 | 0.193 | 0.000 | 0.044 | 2.016 | 13.956 | 0.045 | n/a | 0.087 | 8.589 | n/a | n/a | 0.064 | 17.618 | 0.416 | 0.064 | gw-w/thread-47/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000002054 | 42.165 | 3.587 | 0.214 | 0.000 | 0.042 | 1.247 | 7.912 | 0.049 | n/a | 0.073 | 28.994 | n/a | n/a | 0.049 | 3.843 | 0.091 | 0.049 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (142 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.306 | 0.561 | 0.000 | 1.607 | 5.491 | 0.013 | 0.000 | 0.280 | 1.071 | 2.012 | 0.040 | n/a | 0.107 | 6.977 | n/a | n/a | 0.070 | 6.044 | 0.348 | 0.070 |
| p99 | 126.209 | 3.648 | 0.872 | 5.008 | 14.687 | 4.875 | 1.969 | 2.410 | 9.992 | 30.994 | 0.181 | n/a | 1.496 | 107.594 | n/a | n/a | 0.358 | 16.538 | 0.594 | 0.358 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a0000000000002199 | 195.901 | 4.843 | 0.163 | 0.000 | 0.047 | 1.255 | 9.462 | 0.050 | n/a | 0.668 | 179.339 | n/a | n/a | 0.075 | 5.053 | 0.026 | 0.075 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002166 | 126.209 | 5.175 | 4.875 | 0.000 | 0.049 | 1.303 | 7.068 | 0.035 | n/a | 0.045 | 107.594 | n/a | n/a | 0.063 | 10.100 | 0.080 | 0.063 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 3.748ms |
| 067b4fd88797856a0000000000002111 | 102.016 | 11.421 | 0.010 | 0.000 | 0.878 | 0.699 | 4.192 | 0.050 | n/a | 0.222 | 84.467 | n/a | n/a | 0.077 | 12.309 | 0.121 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000212f | 101.208 | 11.737 | 0.202 | 0.000 | 0.042 | 2.751 | 2.008 | 0.059 | n/a | 0.095 | 84.257 | n/a | n/a | 0.057 | 11.981 | 0.118 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002183 | 97.353 | 9.526 | 0.022 | 0.000 | 0.572 | 2.402 | 2.654 | 0.078 | n/a | 0.680 | 81.360 | n/a | n/a | 0.061 | 10.119 | 0.104 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002167 | 95.804 | 8.454 | 0.008 | 0.000 | 0.471 | 0.908 | 2.118 | 0.036 | n/a | 0.299 | 83.445 | n/a | n/a | 0.065 | 8.933 | 0.093 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000214d | 95.375 | 7.283 | 0.200 | 0.000 | 0.050 | 9.992 | 3.595 | 0.099 | n/a | 0.470 | 73.635 | n/a | n/a | 0.051 | 7.532 | 0.079 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000021c9 | 92.747 | 9.711 | 0.253 | 0.000 | 0.043 | 1.497 | 9.893 | 0.038 | n/a | 0.072 | 71.155 | n/a | n/a | 0.084 | 10.008 | 0.108 | 0.084 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000221b | 87.657 | 14.687 | 0.261 | 0.000 | 0.081 | 2.729 | 29.164 | 0.080 | n/a | 0.120 | 40.453 | n/a | n/a | 0.083 | 15.029 | 0.171 | 0.083 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 3.629ms |
| 067b4fd88797856a0000000000002197 | 72.639 | 5.037 | 0.006 | 0.000 | 1.907 | 0.813 | 2.300 | 0.061 | n/a | 0.092 | 62.364 | n/a | n/a | 0.059 | 6.950 | 0.096 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000021af | 63.782 | 7.333 | 0.012 | 0.000 | 0.911 | 3.123 | 1.414 | 0.024 | n/a | 0.393 | 50.474 | n/a | n/a | 0.097 | 8.257 | 0.129 | 0.097 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000021f1 | 60.927 | 4.166 | 0.006 | 0.000 | 0.306 | 0.771 | 1.711 | 0.036 | n/a | 0.280 | 53.583 | n/a | n/a | 0.067 | 4.478 | 0.073 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000220d | 58.209 | 8.299 | 0.151 | 0.000 | 0.046 | 1.136 | 1.769 | 0.034 | n/a | 0.072 | 46.648 | n/a | n/a | 0.055 | 8.497 | 0.146 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000021db | 58.152 | 6.302 | 0.013 | 1.969 | 0.388 | 0.796 | 1.590 | 0.052 | n/a | 0.596 | 46.344 | n/a | n/a | 0.101 | 8.672 | 0.149 | 0.101 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000210d | 52.189 | 5.667 | 0.009 | 0.000 | 0.801 | 0.809 | 39.080 | 0.048 | n/a | 0.111 | 5.583 | n/a | n/a | 0.081 | 6.477 | 0.124 | 0.081 | gw-w/thread-44/gateway.request-parse | none observed |
| 067b4fd88797856a00000000000021d7 | 50.579 | 8.356 | 0.390 | 0.000 | 0.065 | 2.032 | 25.803 | 0.122 | n/a | 0.126 | 13.625 | n/a | n/a | 0.059 | 8.812 | 0.174 | 0.059 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| 067b4fd88797856a0000000000002172 | 49.959 | 8.837 | 0.020 | 0.000 | 21.340 | 1.903 | 3.854 | 0.067 | n/a | 0.874 | 10.261 | n/a | n/a | 2.803 | 30.197 | 0.604 | 2.803 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 067b4fd88797856a00000000000021f7 | 42.083 | 7.848 | 0.459 | 0.000 | 0.182 | 2.502 | 12.708 | 0.290 | n/a | 0.422 | 17.527 | n/a | n/a | 0.146 | 8.489 | 0.202 | 0.146 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002133 | 41.574 | 4.917 | 0.216 | 0.000 | 0.062 | 1.026 | 25.749 | 0.043 | n/a | 0.077 | 9.354 | n/a | n/a | 0.130 | 5.195 | 0.125 | 0.130 | gw-w/thread-66/commit.prepare-and-validate | none observed |
| 067b4fd88797856a00000000000021bb | 41.447 | 2.993 | 0.163 | 0.000 | 0.042 | 1.301 | 30.994 | 0.053 | n/a | 0.103 | 5.747 | n/a | n/a | 0.051 | 3.198 | 0.077 | 0.051 | gw-w/thread-46/gateway.admitted-work | none observed |

## P4 / p4mix / commit (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.992 | 0.674 | 0.000 | 1.590 | 4.660 | 0.012 | 0.000 | 0.176 | 0.956 | 1.826 | 0.037 | n/a | 0.118 | 6.363 | n/a | n/a | 0.067 | 5.168 | 0.340 | 0.067 |
| p99 | 123.425 | 3.692 | 0.008 | 3.655 | 10.033 | 3.762 | 0.000 | 2.825 | 3.637 | 26.425 | 0.121 | n/a | 1.602 | 114.370 | n/a | n/a | 0.210 | 10.915 | 0.549 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a000000000000226f | 313.143 | 6.562 | 0.641 | 0.000 | 0.106 | 2.080 | 3.743 | 0.067 | n/a | 0.490 | 299.311 | n/a | n/a | 0.143 | 7.309 | 0.023 | 0.143 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002253 | 123.425 | 5.272 | 0.656 | 0.000 | 0.072 | 0.855 | 2.024 | 0.036 | n/a | 0.064 | 114.370 | n/a | n/a | 0.075 | 6.000 | 0.049 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002259 | 85.534 | 4.150 | 0.658 | 0.000 | 0.063 | 2.254 | 70.468 | 0.074 | n/a | 0.104 | 7.696 | n/a | n/a | 0.068 | 4.870 | 0.057 | 0.068 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| 067b4fd88797856a000000000000229e | 76.159 | 4.078 | 0.281 | 0.000 | 0.049 | 1.558 | 4.314 | 0.044 | n/a | 0.054 | 65.720 | n/a | n/a | 0.062 | 4.408 | 0.058 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002286 | 71.488 | 7.088 | 0.008 | 0.000 | 0.278 | 0.649 | 1.184 | 0.025 | n/a | 0.077 | 62.126 | n/a | n/a | 0.053 | 7.374 | 0.103 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002251 | 70.047 | 19.604 | 6.882 | 0.000 | 0.293 | 2.829 | 25.634 | 0.396 | n/a | 0.651 | 10.985 | n/a | n/a | 2.775 | 26.778 | 0.382 | 2.775 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000221f | 69.647 | 4.208 | 0.258 | 0.000 | 0.049 | 1.046 | 2.057 | 0.043 | n/a | 0.340 | 61.579 | n/a | n/a | 0.066 | 4.515 | 0.065 | 0.066 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000022d7 | 52.916 | 4.959 | 0.351 | 0.000 | 0.045 | 1.392 | 1.401 | 0.030 | n/a | 0.061 | 44.614 | n/a | n/a | 0.063 | 5.356 | 0.101 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000022bc | 47.155 | 4.604 | 0.007 | 0.000 | 0.932 | 0.709 | 1.076 | 0.027 | n/a | 0.065 | 39.668 | n/a | n/a | 0.068 | 5.542 | 0.118 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002279 | 45.911 | 8.934 | 0.377 | 0.000 | 0.151 | 2.581 | 11.738 | 0.121 | n/a | 0.297 | 21.588 | n/a | n/a | 0.124 | 9.462 | 0.206 | 0.124 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002229 | 45.569 | 3.516 | 0.006 | 0.000 | 0.685 | 0.547 | 1.229 | 0.031 | n/a | 0.074 | 39.413 | n/a | n/a | 0.067 | 4.207 | 0.092 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000227e | 45.022 | 5.703 | 0.321 | 0.000 | 0.037 | 1.446 | 26.425 | 0.031 | n/a | 0.067 | 10.941 | n/a | n/a | 0.051 | 6.061 | 0.135 | 0.051 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a00000000000022b6 | 30.564 | 5.706 | 3.762 | 0.000 | 0.054 | 3.637 | 4.697 | 0.038 | n/a | 0.295 | 12.326 | n/a | n/a | 0.050 | 9.522 | 0.312 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002247 | 28.375 | 3.317 | 0.246 | 0.000 | 0.078 | 1.007 | 10.577 | 0.047 | n/a | 0.068 | 12.939 | n/a | n/a | 0.096 | 3.641 | 0.128 | 0.096 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000022be | 28.026 | 3.440 | 0.813 | 0.000 | 0.023 | 1.359 | 10.346 | 0.104 | n/a | 0.094 | 11.791 | n/a | n/a | 0.056 | 4.276 | 0.153 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002225 | 26.300 | 4.252 | 0.320 | 0.000 | 0.099 | 1.287 | 8.087 | 0.039 | n/a | 0.094 | 12.029 | n/a | n/a | 0.093 | 4.671 | 0.178 | 0.093 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000022ea | 26.035 | 6.959 | 0.007 | 0.000 | 0.978 | 0.698 | 1.203 | 0.027 | n/a | 0.087 | 15.997 | n/a | n/a | 0.080 | 7.944 | 0.305 | 0.080 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002266 | 25.171 | 8.369 | 0.008 | 0.000 | 1.024 | 0.839 | 2.392 | 0.048 | n/a | 0.081 | 12.338 | n/a | n/a | 0.073 | 9.400 | 0.373 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000222d | 25.050 | 8.465 | 0.007 | 0.000 | 0.915 | 2.818 | 3.111 | 0.035 | n/a | 0.068 | 9.570 | n/a | n/a | 0.060 | 9.387 | 0.375 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000022af | 25.041 | 7.367 | 0.010 | 0.000 | 0.473 | 1.295 | 3.725 | 0.047 | n/a | 0.315 | 11.702 | n/a | n/a | 0.106 | 7.851 | 0.314 | 0.106 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (3771 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.420 | 0.825 | 0.000 | 1.693 | 3.907 | 0.006 | 0.000 | 0.756 | 0.753 | 1.128 | 0.027 | n/a | 0.064 | 5.566 | n/a | n/a | 0.036 | 5.013 | 0.376 | 0.036 |
| p99 | 101.440 | 3.854 | 0.096 | 6.049 | 14.146 | 2.178 | 0.000 | 23.792 | 18.669 | 8.058 | 1.459 | n/a | 2.249 | 72.767 | n/a | n/a | 0.145 | 34.485 | 0.751 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a00000000000028b3 | 508.138 | 7.434 | 0.008 | 0.000 | 0.317 | 0.970 | 39.182 | 0.028 | n/a | 0.107 | 460.030 | n/a | n/a | 0.062 | 7.759 | 0.015 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000028b4 | 489.583 | 4.872 | 0.010 | 0.000 | 0.629 | 14.258 | 1.392 | 4.620 | n/a | 0.032 | 463.688 | n/a | n/a | 0.082 | 5.511 | 0.011 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms |
| 067b4fd88797856a00000000000028b5 | 483.851 | 4.713 | 0.013 | 0.000 | 0.539 | 13.073 | 1.313 | 0.015 | n/a | 0.029 | 464.098 | n/a | n/a | 0.057 | 5.265 | 0.011 | 0.057 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms |
| 067b4fd88797856a00000000000028b6 | 477.031 | 3.478 | 0.006 | 0.000 | 0.296 | 10.627 | 1.555 | 0.021 | n/a | 0.035 | 460.948 | n/a | n/a | 0.066 | 3.780 | 0.008 | 0.066 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.319ms |
| 067b4fd88797856a00000000000028bd | 415.464 | 4.162 | 0.010 | 0.000 | 349.141 | 15.314 | 1.306 | 0.037 | n/a | 0.094 | 45.318 | n/a | n/a | 0.082 | 353.313 | 0.850 | 0.082 | node-14/thread-0/driver.queue.subject | driver.publication 2.974ms; driver.expected-state.bind-receipt 2.542ms; driver.expected-state.bind-receipt 2.265ms; driver.expected-state.bind-receipt 1.889ms; driver.publication 1.645ms |
| 067b4fd88797856a00000000000028b8 | 384.987 | 3.443 | 0.008 | 0.000 | 0.294 | 4.567 | 1.191 | 0.025 | n/a | 0.057 | 375.347 | n/a | n/a | 0.056 | 3.744 | 0.010 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.319ms; driver.publication 1.096ms |
| 067b4fd88797856a00000000000028c0 | 383.408 | 3.397 | 0.007 | 0.000 | 310.775 | 14.955 | 2.054 | 0.059 | n/a | 0.093 | 51.992 | n/a | n/a | 0.077 | 314.179 | 0.819 | 0.077 | node-14/thread-0/driver.queue.subject | driver.publication 2.974ms; driver.expected-state.bind-receipt 2.542ms; driver.expected-state.bind-receipt 2.265ms; driver.expected-state.bind-receipt 1.889ms; driver.publication 1.645ms |
| 067b4fd88797856a00000000000028ba | 383.140 | 4.972 | 0.006 | 0.000 | 0.928 | 3.460 | 1.207 | 0.020 | n/a | 0.045 | 372.454 | n/a | n/a | 0.048 | 5.906 | 0.015 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.319ms; driver.publication 1.228ms; driver.publication 1.096ms |
| 067b4fd88797856a00000000000028b9 | 381.404 | 3.925 | 0.005 | 0.000 | 2.718 | 2.327 | 1.142 | 0.020 | n/a | 0.042 | 371.193 | n/a | n/a | 0.032 | 6.648 | 0.017 | 0.032 | gw-w/thread-76/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.319ms; driver.publication 1.096ms; driver.publication 1.003ms |
| 067b4fd88797856a00000000000028bb | 376.410 | 4.468 | 0.007 | 0.000 | 0.168 | 6.755 | 1.414 | 0.025 | n/a | 0.046 | 363.482 | n/a | n/a | 0.045 | 4.643 | 0.012 | 0.045 | gw-w/thread-77/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.462ms; driver.publication 1.319ms; driver.publication 1.228ms |
| 067b4fd88797856a00000000000028bc | 376.166 | 4.206 | 0.005 | 0.000 | 0.768 | 1.453 | 0.883 | 0.018 | n/a | 0.044 | 368.677 | n/a | n/a | 0.112 | 4.979 | 0.013 | 0.112 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.462ms; driver.publication 1.319ms; driver.publication 1.228ms |
| 067b4fd88797856a000000000000448b | 372.076 | 4.083 | 0.277 | 0.000 | 0.043 | 0.916 | 1.748 | 0.035 | n/a | 0.043 | 364.884 | n/a | n/a | 0.047 | 4.403 | 0.012 | 0.047 | gw-w/thread-88/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000028bf | 351.983 | 8.259 | 0.007 | 0.000 | 0.633 | 14.492 | 1.598 | 0.024 | n/a | 0.053 | 326.808 | n/a | n/a | 0.108 | 8.900 | 0.025 | 0.108 | gw-w/thread-81/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.expected-state.bind-receipt 2.265ms; driver.publication 1.645ms; driver.publication 1.561ms; driver.publication 1.462ms |
| 067b4fd88797856a00000000000028be | 348.627 | 5.829 | 0.007 | 0.000 | 0.505 | 7.929 | 1.328 | 0.026 | n/a | 0.058 | 332.852 | n/a | n/a | 0.092 | 6.342 | 0.018 | 0.092 | gw-w/thread-80/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.561ms; driver.publication 1.462ms; driver.publication 1.387ms; driver.publication 1.319ms |
| 067b4fd88797856a00000000000028c1 | 341.893 | 10.109 | 0.011 | 0.000 | 307.198 | 9.867 | 1.760 | 0.034 | n/a | 0.595 | 12.234 | n/a | n/a | 0.085 | 317.318 | 0.928 | 0.085 | node-14/thread-0/driver.queue.subject | driver.publication 2.974ms; driver.expected-state.bind-receipt 2.542ms; driver.expected-state.bind-receipt 2.265ms; driver.expected-state.bind-receipt 1.889ms; driver.publication 1.645ms |
| 067b4fd88797856a00000000000028c5 | 302.199 | 3.078 | 0.005 | 0.000 | 289.528 | 3.023 | 1.237 | 0.025 | n/a | 0.292 | 4.957 | n/a | n/a | 0.055 | 292.611 | 0.968 | 0.055 | node-14/thread-0/driver.queue.subject | driver.publication 2.974ms; driver.expected-state.bind-receipt 2.542ms; driver.publication 2.303ms; driver.expected-state.bind-receipt 2.265ms; driver.expected-state.bind-receipt 1.889ms |
| 067b4fd88797856a00000000000028c3 | 281.117 | 8.293 | 0.013 | 0.000 | 190.507 | 14.295 | 7.507 | 0.072 | n/a | 3.986 | 56.355 | n/a | n/a | 0.088 | 198.814 | 0.707 | 0.088 | node-14/thread-0/driver.queue.subject | driver.publication 2.974ms; driver.expected-state.bind-receipt 2.542ms; driver.expected-state.bind-receipt 2.265ms; driver.expected-state.bind-receipt 1.889ms; driver.publication 1.645ms |
| 067b4fd88797856a000000000000450d | 280.306 | 6.714 | 0.352 | 0.000 | 0.093 | 1.547 | 251.234 | 0.125 | n/a | 0.168 | 19.900 | n/a | n/a | 0.172 | 7.159 | 0.026 | 0.172 | gw-w/thread-72/commit.prepare-and-validate | none observed |
| 067b4fd88797856a0000000000002720 | 252.548 | 3.096 | 0.208 | 0.000 | 0.043 | 0.713 | 124.443 | 0.044 | n/a | 0.067 | 123.882 | n/a | n/a | 0.051 | 3.347 | 0.013 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | client.encode 3.894ms |
| 067b4fd88797856a00000000000028c2 | 247.021 | 7.377 | 0.009 | 0.000 | 0.553 | 8.912 | 2.178 | 0.040 | n/a | 0.085 | 227.789 | n/a | n/a | 0.078 | 7.939 | 0.032 | 0.078 | gw-w/thread-82/peer.transact-await (includes order/network/storage) | driver.publication 2.974ms; driver.publication 1.645ms; driver.publication 1.561ms; driver.publication 1.462ms; driver.publication 1.387ms |

## P4 / p4h1 / commit (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.207 | 0.622 | 0.000 | 1.375 | 4.296 | 0.021 | 0.000 | 0.115 | 0.909 | 1.898 | 0.040 | n/a | 0.120 | 7.767 | n/a | n/a | 0.065 | 4.792 | 0.310 | 0.065 |
| p99 | 149.016 | 9.398 | 0.040 | 29.480 | 47.208 | 3.246 | 0.000 | 3.689 | 3.682 | 33.660 | 0.520 | n/a | 2.193 | 132.077 | n/a | n/a | 0.326 | 48.687 | 0.555 | 0.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a000000000000237b | 149.016 | 5.169 | 0.176 | 0.000 | 0.041 | 2.430 | 8.987 | 0.032 | n/a | 0.048 | 132.077 | n/a | n/a | 0.055 | 5.386 | 0.036 | 0.055 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002305 | 133.974 | 47.208 | 0.068 | 0.000 | 1.411 | 1.499 | 14.961 | 0.520 | n/a | 0.455 | 67.527 | n/a | n/a | 0.326 | 48.687 | 0.363 | 0.326 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000232f | 47.771 | 3.992 | 0.007 | 0.000 | 0.971 | 0.582 | 33.660 | 0.047 | n/a | 0.072 | 8.402 | n/a | n/a | 0.039 | 4.970 | 0.104 | 0.039 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| 067b4fd88797856a00000000000023a6 | 44.590 | 3.352 | 0.241 | 0.000 | 0.041 | 0.943 | 31.620 | 0.030 | n/a | 0.083 | 8.227 | n/a | n/a | 0.054 | 3.634 | 0.081 | 0.054 | gw-w/thread-43/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000231f | 43.488 | 5.296 | 0.255 | 0.000 | 0.080 | 1.660 | 13.993 | 0.038 | n/a | 0.092 | 22.007 | n/a | n/a | 0.068 | 5.630 | 0.129 | 0.068 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002354 | 40.261 | 3.479 | 0.173 | 0.000 | 0.037 | 1.082 | 25.457 | 0.036 | n/a | 0.069 | 9.882 | n/a | n/a | 0.046 | 3.690 | 0.092 | 0.046 | gw-w/thread-47/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000236d | 39.970 | 6.056 | 0.301 | 0.000 | 0.047 | 1.357 | 4.719 | 0.028 | n/a | 0.767 | 26.624 | n/a | n/a | 0.071 | 6.404 | 0.160 | 0.071 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002323 | 38.881 | 3.835 | 0.195 | 0.000 | 0.045 | 0.785 | 1.648 | 0.036 | n/a | 0.080 | 32.209 | n/a | n/a | 0.048 | 4.076 | 0.105 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002313 | 37.805 | 4.343 | 0.259 | 0.000 | 0.046 | 1.217 | 10.073 | 0.055 | n/a | 0.089 | 21.670 | n/a | n/a | 0.052 | 4.648 | 0.123 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002307 | 37.327 | 10.700 | 0.544 | 0.000 | 0.077 | 2.154 | 6.427 | 0.084 | n/a | 0.180 | 17.072 | n/a | n/a | 0.090 | 11.322 | 0.303 | 0.090 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002315 | 35.113 | 3.306 | 3.246 | 0.000 | 0.049 | 1.086 | 11.079 | 0.051 | n/a | 0.085 | 16.178 | n/a | n/a | 0.032 | 6.601 | 0.188 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.221ms |
| 067b4fd88797856a00000000000022fb | 33.896 | 4.232 | 0.234 | 0.000 | 0.082 | 0.962 | 15.346 | 0.249 | n/a | 0.200 | 12.501 | n/a | n/a | 0.090 | 4.548 | 0.134 | 0.090 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000231d | 32.566 | 3.755 | 0.280 | 0.000 | 0.044 | 1.236 | 9.837 | 0.059 | n/a | 0.122 | 17.164 | n/a | n/a | 0.069 | 4.078 | 0.125 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002381 | 31.572 | 16.569 | 0.730 | 0.000 | 0.214 | 2.359 | 2.622 | 0.043 | n/a | 0.371 | 8.511 | n/a | n/a | 0.153 | 17.513 | 0.555 | 0.153 | node-14/thread-9/client.persist-and-resolve | none observed |
| 067b4fd88797856a00000000000023ac | 31.145 | 3.911 | 0.009 | 0.000 | 0.860 | 0.760 | 1.198 | 0.030 | n/a | 0.093 | 24.230 | n/a | n/a | 0.054 | 4.779 | 0.153 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002319 | 30.648 | 4.302 | 3.235 | 0.000 | 0.066 | 0.906 | 10.342 | 0.063 | n/a | 0.128 | 11.519 | n/a | n/a | 0.085 | 7.604 | 0.248 | 0.085 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002303 | 29.619 | 9.269 | 0.364 | 0.000 | 0.107 | 2.156 | 5.643 | 0.075 | n/a | 0.245 | 11.648 | n/a | n/a | 0.112 | 9.740 | 0.329 | 0.112 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002388 | 29.316 | 7.080 | 0.008 | 0.000 | 0.088 | 0.742 | 2.301 | 0.074 | n/a | 0.154 | 18.808 | n/a | n/a | 0.061 | 7.176 | 0.245 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000236f | 29.009 | 13.191 | 0.013 | 0.000 | 0.303 | 0.733 | 1.579 | 0.028 | n/a | 0.542 | 12.561 | n/a | n/a | 0.059 | 13.507 | 0.466 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002396 | 28.720 | 4.878 | 0.012 | 0.000 | 0.763 | 0.679 | 1.347 | 0.026 | n/a | 0.068 | 20.880 | n/a | n/a | 0.068 | 5.653 | 0.197 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 146.052 | 0.740 | 0.000 | 1.525 | 4.601 | 0.013 | 0.000 | 0.519 | 2.277 | 2.226 | 0.058 | n/a | 0.376 | 38.968 | n/a | n/a | 0.058 | 5.275 | 0.156 | 0.058 |
| p99 | 721.376 | 2.631 | 0.004 | 3.038 | 7.965 | 344.797 | 0.000 | 1.799 | 98.704 | 6.763 | 5.159 | n/a | 5.298 | 703.119 | n/a | n/a | 0.208 | 354.560 | 0.865 | 0.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a00000000000023c0 | 721.376 | 4.411 | 0.008 | 0.000 | 0.651 | 5.218 | 2.635 | 5.159 | n/a | 0.122 | 703.119 | n/a | n/a | 0.054 | 5.070 | 0.007 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023dc | 652.148 | 5.414 | 98.279 | 0.000 | 0.048 | 1.640 | 2.085 | 0.068 | n/a | 0.500 | 544.077 | n/a | n/a | 0.036 | 103.741 | 0.159 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.290ms |
| 067b4fd88797856a00000000000023dd | 456.575 | 4.143 | 0.013 | 0.000 | 1.119 | 98.704 | 0.801 | 0.028 | n/a | 0.052 | 351.640 | n/a | n/a | 0.075 | 5.275 | 0.012 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023d9 | 414.726 | 6.805 | 69.650 | 0.000 | 0.069 | 1.446 | 6.763 | 0.078 | n/a | 0.376 | 329.480 | n/a | n/a | 0.058 | 76.525 | 0.185 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023b7 | 410.056 | 7.965 | 344.797 | 0.000 | 1.799 | 8.561 | 3.772 | 4.029 | n/a | 0.100 | 38.968 | n/a | n/a | 0.068 | 354.560 | 0.865 | 0.068 | node-14/thread-0/client.commit-send-queue | client.encode 68.336ms |
| 067b4fd88797856a00000000000023e3 | 408.010 | 6.196 | 0.008 | 0.000 | 0.987 | 52.784 | 4.061 | 0.038 | n/a | 0.062 | 343.792 | n/a | n/a | 0.083 | 7.190 | 0.018 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023e4 | 371.408 | 5.912 | 51.823 | 0.000 | 0.084 | 1.934 | 3.286 | 0.065 | n/a | 0.508 | 307.739 | n/a | n/a | 0.058 | 57.818 | 0.156 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.785ms; driver.publication 1.299ms; driver.publication 1.011ms |
| 067b4fd88797856a00000000000023c1 | 361.687 | 6.198 | 84.160 | 0.000 | 0.052 | 1.465 | 3.136 | 0.069 | n/a | 0.483 | 266.073 | n/a | n/a | 0.049 | 90.410 | 0.250 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.325ms; driver.publication 1.741ms |
| 067b4fd88797856a00000000000023e5 | 290.341 | 3.077 | 0.008 | 0.000 | 0.848 | 55.473 | 0.779 | 0.031 | n/a | 0.077 | 229.994 | n/a | n/a | 0.054 | 3.934 | 0.014 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.785ms |
| 067b4fd88797856a00000000000023d1 | 248.198 | 5.856 | 0.745 | 0.000 | 0.212 | 1.326 | 3.920 | 0.082 | n/a | 0.310 | 235.540 | n/a | n/a | 0.208 | 6.813 | 0.027 | 0.208 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023c2 | 223.597 | 4.061 | 0.009 | 0.000 | 0.746 | 3.932 | 1.180 | 0.036 | n/a | 0.666 | 212.927 | n/a | n/a | 0.041 | 4.815 | 0.022 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.325ms |
| 067b4fd88797856a00000000000023e6 | 146.052 | 3.871 | 0.008 | 0.000 | 0.514 | 59.765 | 0.702 | 0.027 | n/a | 0.062 | 81.032 | n/a | n/a | 0.072 | 4.393 | 0.030 | 0.072 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.785ms; driver.publication 1.011ms |
| 067b4fd88797856a00000000000023df | 110.789 | 2.907 | 0.012 | 0.000 | 1.188 | 94.758 | 3.532 | 0.032 | n/a | 0.067 | 8.232 | n/a | n/a | 0.061 | 4.108 | 0.037 | 0.061 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.290ms |
| 067b4fd88797856a00000000000023e7 | 74.970 | 3.744 | 0.011 | 0.000 | 0.461 | 60.958 | 0.712 | 0.040 | n/a | 0.119 | 8.828 | n/a | n/a | 0.095 | 4.217 | 0.056 | 0.095 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.785ms; driver.publication 1.299ms; driver.publication 1.011ms |
| 067b4fd88797856a00000000000023d5 | 53.551 | 5.509 | 0.467 | 0.000 | 0.113 | 20.283 | 4.632 | 0.085 | n/a | 3.664 | 18.678 | n/a | n/a | 0.120 | 6.089 | 0.114 | 0.120 | node-14/thread-9/socket.wait-first-byte | none observed |
| 067b4fd88797856a00000000000023b9 | 38.187 | 4.601 | 0.246 | 0.000 | 0.031 | 1.218 | 2.226 | 0.028 | n/a | 0.599 | 29.191 | n/a | n/a | 0.047 | 4.878 | 0.128 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023b2 | 28.969 | 4.911 | 0.011 | 0.000 | 0.894 | 0.666 | 1.689 | 0.075 | n/a | 5.298 | 15.344 | n/a | n/a | 0.081 | 5.816 | 0.201 | 0.081 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023cd | 27.044 | 5.419 | 5.146 | 0.000 | 0.039 | 2.446 | 1.781 | 0.058 | n/a | 3.057 | 9.057 | n/a | n/a | 0.042 | 10.604 | 0.392 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023b4 | 21.065 | 4.173 | 0.008 | 0.000 | 0.687 | 2.277 | 0.826 | 0.023 | n/a | 0.039 | 12.978 | n/a | n/a | 0.054 | 4.867 | 0.231 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000023c9 | 19.959 | 4.645 | 0.014 | 0.000 | 0.953 | 1.632 | 1.816 | 0.062 | n/a | 0.074 | 10.683 | n/a | n/a | 0.082 | 5.612 | 0.281 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.860 | 0.598 | 0.000 | 1.477 | 4.588 | 0.014 | 0.000 | 0.225 | 0.872 | 2.083 | 0.038 | n/a | 0.107 | 7.770 | n/a | n/a | 0.067 | 5.073 | 0.316 | 0.067 |
| p99 | 64.734 | 17.462 | 0.027 | 19.024 | 26.019 | 2.562 | 0.000 | 3.231 | 5.697 | 23.838 | 0.232 | n/a | 0.828 | 52.065 | n/a | n/a | 0.251 | 26.312 | 0.561 | 0.251 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a000000000000244b | 64.734 | 18.583 | 0.015 | 0.000 | 0.994 | 0.866 | 3.003 | 0.061 | n/a | 0.828 | 40.295 | n/a | n/a | 0.088 | 19.592 | 0.303 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002447 | 63.623 | 5.277 | 0.358 | 0.000 | 0.041 | 1.867 | 3.608 | 0.096 | n/a | 0.242 | 52.065 | n/a | n/a | 0.069 | 5.676 | 0.089 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000244e | 57.270 | 11.990 | 2.562 | 0.000 | 0.069 | 2.678 | 23.838 | 0.096 | n/a | 0.214 | 15.696 | n/a | n/a | 0.127 | 14.621 | 0.255 | 0.127 | gw-w/thread-44/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000242b | 51.255 | 4.535 | 0.274 | 0.000 | 0.074 | 0.858 | 4.235 | 0.029 | n/a | 0.043 | 41.125 | n/a | n/a | 0.082 | 4.884 | 0.095 | 0.082 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024a4 | 46.931 | 26.019 | 0.009 | 0.000 | 0.283 | 3.193 | 3.253 | 0.232 | n/a | 0.130 | 13.687 | n/a | n/a | 0.124 | 26.312 | 0.561 | 0.124 | node-14/thread-0/driver.expected-state.bind-receipt | none observed |
| 067b4fd88797856a0000000000002458 | 42.479 | 4.338 | 0.376 | 0.000 | 0.223 | 1.184 | 2.492 | 0.057 | n/a | 0.125 | 33.558 | n/a | n/a | 0.126 | 4.936 | 0.116 | 0.126 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002412 | 41.110 | 4.686 | 0.008 | 0.000 | 0.315 | 0.534 | 1.022 | 0.027 | n/a | 0.274 | 34.187 | n/a | n/a | 0.057 | 5.010 | 0.122 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002406 | 39.343 | 4.811 | 0.230 | 0.000 | 0.089 | 1.317 | 14.460 | 0.039 | n/a | 0.201 | 18.142 | n/a | n/a | 0.053 | 5.130 | 0.130 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002439 | 38.689 | 3.958 | 0.164 | 0.000 | 0.045 | 1.003 | 8.020 | 0.044 | n/a | 0.045 | 25.350 | n/a | n/a | 0.060 | 4.167 | 0.108 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024b6 | 37.901 | 7.508 | 0.188 | 0.000 | 0.042 | 1.890 | 4.622 | 0.049 | n/a | 0.120 | 23.399 | n/a | n/a | 0.083 | 7.739 | 0.204 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000243f | 37.120 | 4.063 | 2.504 | 0.000 | 0.012 | 1.800 | 4.729 | 0.052 | n/a | 0.066 | 23.858 | n/a | n/a | 0.036 | 6.579 | 0.177 | 0.036 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024c2 | 33.206 | 5.077 | 0.204 | 0.000 | 0.042 | 1.654 | 9.376 | 0.044 | n/a | 0.105 | 16.646 | n/a | n/a | 0.057 | 5.323 | 0.160 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000249e | 31.230 | 8.543 | 0.743 | 0.000 | 0.045 | 2.805 | 6.673 | 0.062 | n/a | 0.201 | 12.092 | n/a | n/a | 0.065 | 9.332 | 0.299 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002404 | 29.905 | 3.887 | 0.007 | 0.000 | 1.008 | 0.808 | 2.270 | 0.028 | n/a | 0.049 | 21.804 | n/a | n/a | 0.045 | 4.902 | 0.164 | 0.045 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002496 | 29.680 | 4.963 | 0.208 | 0.000 | 0.050 | 5.697 | 5.057 | 0.083 | n/a | 0.077 | 13.493 | n/a | n/a | 0.054 | 5.221 | 0.176 | 0.054 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024ba | 29.324 | 8.239 | 0.009 | 0.000 | 0.504 | 0.827 | 1.819 | 0.033 | n/a | 0.068 | 17.772 | n/a | n/a | 0.052 | 8.752 | 0.298 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000240a | 28.616 | 5.427 | 0.213 | 0.000 | 0.041 | 1.760 | 8.291 | 0.056 | n/a | 0.712 | 12.066 | n/a | n/a | 0.051 | 5.681 | 0.199 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000246a | 27.485 | 4.508 | 0.219 | 0.000 | 0.042 | 1.756 | 8.392 | 0.054 | n/a | 0.117 | 12.321 | n/a | n/a | 0.074 | 4.770 | 0.174 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002489 | 27.021 | 6.856 | 0.803 | 0.000 | 0.225 | 2.069 | 5.444 | 0.038 | n/a | 0.305 | 11.031 | n/a | n/a | 0.251 | 7.885 | 0.292 | 0.251 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000249a | 26.287 | 3.847 | 0.304 | 0.000 | 0.073 | 1.517 | 8.235 | 0.040 | n/a | 0.084 | 12.109 | n/a | n/a | 0.078 | 4.224 | 0.161 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.096 | 0.629 | 0.000 | 1.464 | 4.236 | 0.200 | 0.000 | 0.157 | 1.743 | 1.638 | 0.040 | n/a | 0.082 | 12.256 | n/a | n/a | 0.047 | 6.456 | 0.282 | 0.047 |
| p99 | 586.903 | 1.896 | 0.073 | 4.075 | 23.124 | 180.091 | 0.000 | 285.865 | 67.375 | 19.525 | 3.711 | n/a | 2.402 | 495.034 | n/a | n/a | 0.105 | 289.509 | 0.944 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a00000000000024cc | 586.903 | 9.059 | 76.947 | 0.000 | 0.054 | 1.712 | 3.652 | 0.092 | n/a | 0.305 | 495.034 | n/a | n/a | 0.047 | 86.061 | 0.147 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024cf | 383.226 | 6.207 | 66.991 | 0.000 | 0.059 | 1.743 | 5.098 | 0.042 | n/a | 0.425 | 302.618 | n/a | n/a | 0.042 | 73.257 | 0.191 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.509ms |
| 067b4fd88797856a00000000000024d0 | 338.583 | 5.092 | 0.015 | 0.000 | 0.579 | 67.375 | 1.228 | 0.047 | n/a | 0.353 | 263.815 | n/a | n/a | 0.079 | 5.686 | 0.017 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002508 | 315.798 | 3.638 | 0.007 | 0.000 | 285.865 | 5.756 | 0.749 | 0.036 | n/a | 2.114 | 17.595 | n/a | n/a | 0.039 | 289.509 | 0.917 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | client.encode 23.872ms |
| 067b4fd88797856a00000000000024e2 | 304.002 | 23.124 | 77.436 | 0.000 | 0.047 | 1.515 | 7.903 | 0.044 | n/a | 0.126 | 193.760 | n/a | n/a | 0.046 | 100.607 | 0.331 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024dc | 281.044 | 4.254 | 63.639 | 0.000 | 0.083 | 0.887 | 1.855 | 0.031 | n/a | 0.075 | 210.113 | n/a | n/a | 0.105 | 67.977 | 0.242 | 0.105 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.publication 1.752ms |
| 067b4fd88797856a000000000000254c | 262.063 | 4.292 | 59.715 | 0.000 | 0.048 | 1.421 | 4.046 | 0.027 | n/a | 0.193 | 192.287 | n/a | n/a | 0.035 | 64.054 | 0.244 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024dd | 254.751 | 5.049 | 0.014 | 0.000 | 0.902 | 63.403 | 1.100 | 0.044 | n/a | 0.111 | 184.041 | n/a | n/a | 0.087 | 5.965 | 0.023 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002519 | 234.258 | 3.442 | 180.091 | 0.000 | 29.490 | 3.122 | 0.965 | 0.030 | n/a | 0.043 | 17.042 | n/a | n/a | 0.033 | 213.022 | 0.909 | 0.033 | node-14/thread-0/client.commit-send-queue | client.encode 13.199ms |
| 067b4fd88797856a0000000000002518 | 215.802 | 4.163 | 61.987 | 0.000 | 0.096 | 0.947 | 3.026 | 0.030 | n/a | 0.056 | 145.427 | n/a | n/a | 0.070 | 66.247 | 0.307 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000024d2 | 172.941 | 3.507 | 136.792 | 0.000 | 9.441 | 6.678 | 0.977 | 0.032 | n/a | 0.046 | 15.423 | n/a | n/a | 0.044 | 149.740 | 0.866 | 0.044 | node-14/thread-0/client.commit-send-queue | client.encode 16.381ms |
| 067b4fd88797856a0000000000002503 | 163.069 | 3.375 | 0.007 | 0.000 | 0.494 | 65.132 | 0.852 | 0.046 | n/a | 0.212 | 92.889 | n/a | n/a | 0.063 | 3.876 | 0.024 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002547 | 159.733 | 6.503 | 0.012 | 0.000 | 114.161 | 0.581 | 3.237 | 0.029 | n/a | 0.044 | 35.125 | n/a | n/a | 0.039 | 120.677 | 0.755 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | client.encode 35.632ms |
| 067b4fd88797856a000000000000251d | 156.119 | 3.680 | 0.004 | 0.000 | 0.778 | 0.853 | 1.055 | 0.061 | n/a | 0.349 | 149.274 | n/a | n/a | 0.064 | 4.463 | 0.029 | 0.064 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002513 | 154.358 | 5.929 | 139.675 | 0.000 | 0.038 | 0.830 | 1.638 | 0.035 | n/a | 0.332 | 5.845 | n/a | n/a | 0.037 | 145.642 | 0.944 | 0.037 | node-14/thread-0/rpc.probe.transact | client.encode 25.165ms |
| 067b4fd88797856a00000000000024e4 | 131.621 | 4.050 | 0.008 | 0.000 | 116.871 | 0.487 | 0.973 | 0.028 | n/a | 0.446 | 8.703 | n/a | n/a | 0.055 | 120.929 | 0.919 | 0.055 | node-14/thread-0/driver.queue.scheduler-late | client.encode 23.918ms |
| 067b4fd88797856a0000000000002525 | 121.912 | 5.064 | 67.387 | 0.000 | 0.057 | 1.033 | 1.156 | 0.029 | n/a | 0.212 | 46.909 | n/a | n/a | 0.064 | 72.508 | 0.595 | 0.064 | node-14/thread-0/rpc.probe.transact | none observed |
| 067b4fd88797856a00000000000024f8 | 79.931 | 5.534 | 0.016 | 0.000 | 0.980 | 1.988 | 6.352 | 0.074 | n/a | 0.457 | 64.479 | n/a | n/a | 0.051 | 6.531 | 0.082 | 0.051 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000253c | 67.661 | 3.017 | 0.004 | 0.000 | 57.656 | 0.744 | 0.924 | 0.027 | n/a | 0.046 | 5.192 | n/a | n/a | 0.051 | 60.677 | 0.897 | 0.051 | node-14/thread-0/driver.queue.scheduler-late | client.encode 42.043ms |
| 067b4fd88797856a0000000000002535 | 56.871 | 5.846 | 0.004 | 0.000 | 0.045 | 2.088 | 0.675 | 0.021 | n/a | 0.035 | 48.110 | n/a | n/a | 0.047 | 5.895 | 0.104 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.801 | 0.481 | 0.000 | 0.986 | 4.263 | 0.171 | 0.000 | 0.088 | 0.961 | 1.965 | 0.035 | n/a | 0.092 | 7.991 | n/a | n/a | 0.057 | 4.683 | 0.281 | 0.057 |
| p99 | 58.808 | 1.904 | 0.036 | 9.255 | 11.708 | 0.813 | 0.000 | 1.696 | 4.756 | 26.519 | 0.223 | n/a | 0.806 | 39.073 | n/a | n/a | 0.176 | 12.584 | 0.553 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a000000000000258f | 58.808 | 8.769 | 0.387 | 0.000 | 0.056 | 2.069 | 26.519 | 0.060 | n/a | 0.739 | 20.145 | n/a | n/a | 0.064 | 9.212 | 0.157 | 0.064 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000256f | 49.165 | 4.231 | 0.229 | 0.000 | 0.115 | 1.340 | 3.890 | 0.084 | n/a | 0.121 | 39.073 | n/a | n/a | 0.082 | 4.575 | 0.093 | 0.082 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025e3 | 44.635 | 4.742 | 0.008 | 0.000 | 0.302 | 0.451 | 1.464 | 0.027 | n/a | 0.056 | 37.519 | n/a | n/a | 0.068 | 5.051 | 0.113 | 0.068 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000255a | 42.215 | 3.866 | 0.012 | 0.000 | 0.088 | 0.755 | 2.982 | 0.039 | n/a | 0.081 | 34.321 | n/a | n/a | 0.071 | 3.966 | 0.094 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000255d | 40.876 | 3.083 | 0.183 | 0.000 | 0.059 | 0.998 | 5.911 | 0.035 | n/a | 0.223 | 30.349 | n/a | n/a | 0.034 | 3.325 | 0.081 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002601 | 38.566 | 5.853 | 0.013 | 0.000 | 0.518 | 0.753 | 1.722 | 0.056 | n/a | 0.196 | 29.378 | n/a | n/a | 0.077 | 6.384 | 0.166 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000258d | 35.618 | 6.886 | 0.007 | 0.000 | 1.696 | 0.959 | 1.794 | 0.066 | n/a | 0.806 | 23.348 | n/a | n/a | 0.056 | 8.588 | 0.241 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002557 | 29.212 | 4.051 | 0.214 | 0.000 | 0.063 | 1.270 | 6.449 | 0.033 | n/a | 0.204 | 16.865 | n/a | n/a | 0.063 | 4.328 | 0.148 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025a9 | 27.950 | 3.913 | 0.250 | 0.000 | 0.043 | 0.957 | 7.531 | 0.030 | n/a | 0.069 | 15.108 | n/a | n/a | 0.049 | 4.207 | 0.151 | 0.049 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002577 | 27.869 | 4.720 | 0.265 | 0.000 | 0.054 | 1.121 | 6.923 | 0.055 | n/a | 0.379 | 14.289 | n/a | n/a | 0.063 | 5.040 | 0.181 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002571 | 26.588 | 5.598 | 0.012 | 0.000 | 0.391 | 0.961 | 2.140 | 0.223 | n/a | 0.348 | 16.830 | n/a | n/a | 0.085 | 6.000 | 0.226 | 0.085 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000255f | 26.280 | 3.702 | 0.315 | 0.000 | 0.058 | 3.750 | 8.103 | 0.039 | n/a | 0.052 | 10.216 | n/a | n/a | 0.046 | 4.075 | 0.155 | 0.046 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025d8 | 25.705 | 4.836 | 0.237 | 0.000 | 0.037 | 1.462 | 7.820 | 0.063 | n/a | 0.534 | 10.650 | n/a | n/a | 0.065 | 5.110 | 0.199 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025bb | 24.623 | 3.210 | 0.179 | 0.000 | 0.041 | 0.969 | 1.370 | 0.029 | n/a | 0.256 | 18.524 | n/a | n/a | 0.044 | 3.430 | 0.139 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000256d | 24.547 | 4.316 | 0.235 | 0.000 | 0.042 | 1.269 | 3.580 | 0.033 | n/a | 0.078 | 14.959 | n/a | n/a | 0.034 | 4.593 | 0.187 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025f9 | 24.475 | 11.708 | 0.008 | 0.000 | 0.869 | 0.427 | 1.430 | 0.033 | n/a | 0.384 | 9.529 | n/a | n/a | 0.087 | 12.584 | 0.514 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025e8 | 24.075 | 6.408 | 0.293 | 0.000 | 0.042 | 4.375 | 1.922 | 0.038 | n/a | 0.055 | 10.879 | n/a | n/a | 0.064 | 6.743 | 0.280 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002599 | 23.838 | 4.579 | 0.269 | 0.000 | 0.060 | 1.060 | 3.542 | 0.042 | n/a | 0.071 | 14.154 | n/a | n/a | 0.062 | 4.907 | 0.206 | 0.062 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000257f | 23.533 | 4.396 | 0.231 | 0.000 | 0.042 | 1.132 | 3.349 | 0.035 | n/a | 0.075 | 14.227 | n/a | n/a | 0.046 | 4.669 | 0.198 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000025cc | 22.845 | 5.108 | 0.010 | 0.000 | 0.592 | 0.652 | 1.475 | 0.056 | n/a | 0.068 | 14.806 | n/a | n/a | 0.077 | 5.711 | 0.250 | 0.077 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.806 | 0.645 | 0.000 | 1.596 | 4.975 | 0.016 | 0.000 | 0.178 | 0.937 | 2.103 | 0.042 | n/a | 0.091 | 6.513 | n/a | n/a | 0.061 | 5.683 | 0.359 | 0.061 |
| p99 | 142.237 | 4.212 | 0.009 | 6.015 | 29.380 | 3.819 | 0.000 | 5.372 | 8.939 | 13.990 | 0.132 | n/a | 2.117 | 84.054 | n/a | n/a | 0.138 | 29.776 | 0.605 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a000000000000266f | 142.690 | 13.990 | 0.013 | 0.000 | 1.769 | 8.939 | 89.575 | 0.209 | n/a | 0.288 | 27.809 | n/a | n/a | 0.097 | 15.773 | 0.111 | 0.097 | gw-w/thread-46/storage/begin-command! | driver.worker-message 1.637ms |
| 067b4fd88797856a0000000000002672 | 142.237 | 48.066 | 0.010 | 0.000 | 5.500 | 0.914 | 3.473 | 0.034 | n/a | 0.086 | 84.054 | n/a | n/a | 0.100 | 53.576 | 0.377 | 0.100 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002687 | 135.813 | 10.941 | 0.175 | 0.000 | 0.051 | 2.480 | 3.144 | 0.040 | n/a | 0.091 | 118.767 | n/a | n/a | 0.125 | 11.167 | 0.082 | 0.125 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000262e | 82.551 | 5.638 | 0.708 | 0.000 | 0.038 | 2.021 | 2.662 | 0.049 | n/a | 0.381 | 71.000 | n/a | n/a | 0.053 | 6.385 | 0.077 | 0.053 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002644 | 70.767 | 8.183 | 0.159 | 0.000 | 0.049 | 1.081 | 2.125 | 0.064 | n/a | 0.111 | 58.951 | n/a | n/a | 0.044 | 8.390 | 0.119 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026bc | 64.112 | 5.731 | 0.007 | 0.000 | 0.561 | 1.627 | 2.851 | 0.042 | n/a | 0.728 | 52.527 | n/a | n/a | 0.038 | 6.300 | 0.098 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002671 | 63.285 | 16.236 | 0.408 | 0.000 | 0.060 | 2.002 | 3.116 | 0.083 | n/a | 0.080 | 41.229 | n/a | n/a | 0.071 | 16.704 | 0.264 | 0.071 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026cd | 56.766 | 10.252 | 0.189 | 0.000 | 0.047 | 1.344 | 3.251 | 0.115 | n/a | 0.103 | 41.426 | n/a | n/a | 0.039 | 10.489 | 0.185 | 0.039 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000265a | 49.605 | 12.689 | 0.435 | 0.000 | 0.129 | 1.309 | 1.552 | 0.046 | n/a | 0.088 | 33.148 | n/a | n/a | 0.209 | 13.253 | 0.267 | 0.209 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026cb | 46.342 | 15.235 | 0.330 | 0.000 | 0.086 | 3.860 | 9.337 | 0.105 | n/a | 0.464 | 16.787 | n/a | n/a | 0.138 | 15.651 | 0.338 | 0.138 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026a3 | 44.318 | 5.018 | 0.007 | 0.000 | 0.441 | 0.684 | 2.449 | 0.058 | n/a | 0.075 | 35.551 | n/a | n/a | 0.036 | 5.466 | 0.123 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000268d | 41.740 | 29.380 | 0.308 | 0.000 | 0.088 | 1.868 | 2.600 | 0.085 | n/a | 0.113 | 7.223 | n/a | n/a | 0.074 | 29.776 | 0.713 | 0.074 | node-14/thread-0/driver.plan-and-encode-command | none observed |
| 067b4fd88797856a000000000000269d | 37.646 | 6.627 | 0.409 | 0.000 | 0.039 | 15.759 | 6.993 | 0.045 | n/a | 0.365 | 7.349 | n/a | n/a | 0.061 | 7.075 | 0.188 | 0.061 | node-14/thread-9/socket.wait-first-byte | none observed |
| 067b4fd88797856a0000000000002614 | 32.792 | 4.106 | 1.073 | 0.000 | 0.042 | 1.322 | 5.090 | 0.040 | n/a | 0.051 | 21.023 | n/a | n/a | 0.045 | 5.221 | 0.159 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a000000000000262a | 32.230 | 3.354 | 0.169 | 0.000 | 0.040 | 1.016 | 13.990 | 0.031 | n/a | 2.264 | 11.323 | n/a | n/a | 0.043 | 3.563 | 0.111 | 0.043 | gw-w/thread-47/gateway.admitted-work | none observed |
| 067b4fd88797856a0000000000002656 | 30.224 | 11.422 | 0.184 | 0.000 | 0.055 | 2.398 | 9.097 | 0.056 | n/a | 0.112 | 6.842 | n/a | n/a | 0.058 | 11.661 | 0.386 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026c2 | 29.958 | 12.194 | 2.260 | 0.000 | 0.044 | 1.774 | 7.406 | 0.036 | n/a | 0.278 | 5.914 | n/a | n/a | 0.052 | 14.498 | 0.484 | 0.052 | node-14/thread-9/client.persist-and-resolve | none observed |
| 067b4fd88797856a0000000000002699 | 29.835 | 7.104 | 0.225 | 0.000 | 0.039 | 5.597 | 11.504 | 0.072 | n/a | 0.170 | 5.078 | n/a | n/a | 0.046 | 7.367 | 0.247 | 0.046 | gw-w/thread-43/gateway.admitted-work | none observed |
| 067b4fd88797856a000000000000264e | 28.076 | 7.937 | 0.019 | 0.000 | 4.403 | 1.051 | 2.900 | 0.095 | n/a | 2.117 | 9.474 | n/a | n/a | 0.080 | 12.359 | 0.440 | 0.080 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a0000000000002681 | 27.779 | 6.276 | 0.226 | 0.000 | 0.041 | 1.354 | 5.908 | 0.081 | n/a | 0.090 | 13.741 | n/a | n/a | 0.063 | 6.543 | 0.236 | 0.063 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.648 | 0.858 | 0.000 | 1.864 | 6.996 | 3.865 | 0.000 | 0.008 | 6.576 | 1.432 | 0.955 | n/a | 0.163 | 19.183 | n/a | n/a | 0.040 | 12.208 | 0.297 | 0.040 |
| p99 | 79.475 | 3.741 | 0.059 | 15.256 | 23.826 | 22.920 | 0.000 | 0.507 | 25.824 | 8.681 | 8.474 | n/a | 4.449 | 34.895 | n/a | n/a | 0.170 | 29.922 | 0.541 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 067b4fd88797856a00000000000026d9 | 79.475 | 3.906 | 4.335 | 0.000 | 0.008 | 25.824 | 4.440 | 5.963 | n/a | 0.038 | 34.895 | n/a | n/a | 0.064 | 8.250 | 0.104 | 0.064 | gw-w/thread-78/peer.transact-await (includes order/network/storage) | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.516ms; driver.publication 1.469ms; driver.publication 1.328ms |
| 067b4fd88797856a00000000000026dd | 72.156 | 6.996 | 22.920 | 0.000 | 0.006 | 4.570 | 1.126 | 8.234 | n/a | 0.041 | 28.238 | n/a | n/a | 0.025 | 29.922 | 0.415 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.516ms; driver.publication 1.469ms; driver.publication 1.328ms |
| 067b4fd88797856a00000000000026dc | 67.006 | 7.233 | 22.527 | 0.000 | 0.007 | 8.799 | 1.432 | 4.073 | n/a | 0.495 | 22.408 | n/a | n/a | 0.032 | 29.768 | 0.444 | 0.032 | node-14/thread-0/client.commit-send-queue | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.516ms; driver.publication 1.469ms; driver.publication 1.328ms |
| 067b4fd88797856a00000000000026de | 60.111 | 23.826 | 0.031 | 0.000 | 0.507 | 3.557 | 7.219 | 0.244 | n/a | 0.425 | 24.132 | n/a | n/a | 0.170 | 24.363 | 0.405 | 0.170 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026db | 60.106 | 7.011 | 22.077 | 0.000 | 0.050 | 12.229 | 1.857 | 0.700 | n/a | 0.064 | 16.072 | n/a | n/a | 0.045 | 29.139 | 0.485 | 0.045 | node-14/thread-0/client.commit-send-queue | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.516ms; driver.publication 1.469ms; driver.publication 1.328ms |
| 067b4fd88797856a00000000000026da | 55.812 | 7.330 | 21.342 | 0.000 | 0.007 | 8.638 | 0.855 | 5.989 | n/a | 0.410 | 11.189 | n/a | n/a | 0.050 | 28.679 | 0.514 | 0.050 | node-14/thread-0/client.commit-send-queue | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.469ms; driver.publication 1.328ms; driver.publication 1.080ms |
| 067b4fd88797856a00000000000026d8 | 51.648 | 6.935 | 21.019 | 0.000 | 0.008 | 0.552 | 1.179 | 8.474 | n/a | 2.528 | 10.913 | n/a | n/a | 0.040 | 27.961 | 0.541 | 0.040 | node-14/thread-0/client.commit-send-queue | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.469ms; driver.publication 1.080ms |
| 067b4fd88797856a00000000000026d7 | 49.028 | 6.872 | 3.289 | 0.000 | 0.009 | 17.594 | 5.739 | 0.055 | n/a | 4.449 | 10.982 | n/a | n/a | 0.038 | 10.170 | 0.207 | 0.038 | node-14/thread-0/socket.queue-and-write | driver.publication 2.446ms; driver.publication 1.627ms; driver.publication 1.469ms |
| 067b4fd88797856a00000000000026d4 | 41.879 | 5.049 | 0.023 | 0.000 | 0.031 | 3.437 | 1.166 | 0.039 | n/a | 0.040 | 32.065 | n/a | n/a | 0.029 | 5.102 | 0.122 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.446ms; driver.publication 1.627ms |
| 067b4fd88797856a00000000000026e1 | 41.171 | 8.259 | 3.865 | 0.000 | 0.083 | 9.940 | 8.681 | 0.140 | n/a | 0.151 | 9.974 | n/a | n/a | 0.077 | 12.208 | 0.297 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 067b4fd88797856a00000000000026d5 | 39.136 | 7.032 | 2.786 | 0.000 | 0.008 | 6.576 | 1.004 | 1.042 | n/a | 0.208 | 20.455 | n/a | n/a | 0.024 | 9.826 | 0.251 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.627ms |
| 067b4fd88797856a00000000000026d6 | 34.883 | 6.851 | 3.126 | 0.000 | 0.007 | 0.478 | 4.054 | 0.955 | n/a | 0.163 | 19.183 | n/a | n/a | 0.065 | 9.984 | 0.286 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (1001 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.069 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 |
| p99 | 296.349 | n/a | n/a | n/a | 28.614 | n/a | 1.887 | 296.243 | 0.146 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.624 | 296.321 | 1.000 | 8.624 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7751f5de1d8a17c5000000000000037f | 305.995 | 0.333 | n/a | 0.000 | 305.658 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 305.990 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c50000000000000380 | 305.956 | 0.047 | n/a | 0.000 | 305.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 305.953 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000000039a | 304.953 | 0.041 | n/a | 0.000 | 304.909 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.950 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c500000000000003a8 | 304.373 | 0.047 | n/a | 0.000 | 304.320 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 304.368 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c500000000000003a7 | 304.365 | 0.041 | n/a | 0.000 | 304.321 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 304.362 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000000296 | 304.009 | 0.466 | n/a | 0.000 | 303.534 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 304.000 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000002ae | 299.893 | 0.063 | n/a | 0.000 | 299.827 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 299.890 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000002b6 | 298.825 | 0.046 | n/a | 0.000 | 298.775 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.821 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000000048a | 297.676 | 0.619 | n/a | 0.000 | 297.042 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 297.661 | 1.000 | 0.015 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000000049b | 296.424 | 0.045 | n/a | 0.000 | 296.376 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.421 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000000049a | 296.349 | 0.078 | n/a | 0.000 | 296.243 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 296.321 | 1.000 | 0.028 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000000498 | 296.266 | 0.063 | n/a | 0.000 | 296.199 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.263 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000000497 | 296.197 | 0.092 | n/a | 0.000 | 296.101 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 296.193 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000002db | 293.619 | 0.044 | n/a | 0.000 | 293.573 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.617 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000002df | 290.386 | 0.052 | n/a | 0.000 | 290.326 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 290.378 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000002ef | 288.170 | 0.142 | n/a | 0.000 | 288.009 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 288.151 | 1.000 | 0.019 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000000ffcc | 286.196 | 0.252 | n/a | 0.000 | 285.942 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.193 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| 4caf76a59889ff43000000000002eb28 | 285.873 | 0.245 | n/a | 0.000 | 285.622 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 285.867 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000002eb29 | 285.855 | 0.080 | n/a | 0.000 | 285.772 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.853 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000000ea6d | 285.662 | 0.274 | n/a | 0.000 | 285.384 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 285.658 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.042ms |

## P1 / L1 / read (822 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 275.073 | n/a | n/a | n/a | 0.260 | n/a | 0.000 | 274.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.150 | 275.060 | 1.000 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff43000000000004a7fb | 313.889 | 0.237 | n/a | 0.000 | 313.648 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 313.885 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.072ms |
| 4caf76a59889ff43000000000004b924 | 309.493 | 0.118 | n/a | 0.000 | 309.372 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.490 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.102ms |
| 4caf76a59889ff4300000000000f4e2d | 299.692 | 0.208 | n/a | 0.000 | 299.481 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 299.689 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms; replica.apply-delta 0.027ms |
| 4caf76a59889ff4300000000000543a4 | 286.499 | 0.150 | n/a | 0.000 | 286.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 286.496 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000ad245 | 281.080 | 0.365 | n/a | 0.000 | 280.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 281.077 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.105ms |
| 4caf76a59889ff430000000000055f24 | 277.374 | 0.139 | n/a | 0.000 | 277.232 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.371 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000b6cb5 | 277.298 | 0.158 | n/a | 0.000 | 277.136 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.294 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000b1262 | 276.976 | 0.223 | n/a | 0.000 | 276.749 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.972 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000d61f0 | 275.073 | 0.247 | n/a | 0.000 | 274.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 275.060 | 1.000 | 0.013 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000005f049 | 274.802 | 0.199 | n/a | 0.000 | 274.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.799 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 4caf76a59889ff430000000000089b3f | 273.475 | 0.107 | n/a | 0.000 | 273.366 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.473 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000005be94 | 273.465 | 0.209 | n/a | 0.000 | 273.253 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.462 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000088284 | 273.398 | 0.226 | n/a | 0.000 | 273.169 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.395 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000093db0 | 273.035 | 0.134 | n/a | 0.000 | 272.899 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.032 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000fb4ca | 272.380 | 0.150 | n/a | 0.000 | 272.228 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.378 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000e945c | 271.859 | 0.143 | n/a | 0.000 | 271.714 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.857 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 4caf76a59889ff4300000000000caa4c | 271.105 | 0.267 | n/a | 0.000 | 270.834 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.101 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.084ms |
| 4caf76a59889ff430000000000097f96 | 271.068 | 0.096 | n/a | 0.000 | 270.969 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.065 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.056ms; replica.apply-delta 0.049ms |
| 4caf76a59889ff4300000000000ca64b | 270.011 | 0.108 | n/a | 0.000 | 269.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.010 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000000cec25 | 269.342 | 0.166 | n/a | 0.000 | 269.174 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.340 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L4 / read (1212 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.076 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 269.638 | n/a | n/a | n/a | 81.940 | n/a | 12.441 | 264.677 | 4.716 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.261 | 264.699 | 1.000 | 42.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1f983bc1e3657270000000000045aeb | 432.741 | 0.225 | n/a | 0.000 | 432.511 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 432.737 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000004c696 | 432.215 | 0.168 | n/a | 0.000 | 432.044 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 432.211 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000107af1 | 431.917 | 0.166 | n/a | 0.000 | 431.748 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 431.914 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000107af2 | 431.880 | 0.031 | n/a | 0.000 | 431.846 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 431.877 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000013fa20 | 355.950 | 193.768 | n/a | 34.013 | 2.489 | 4.031 | 104.031 | 17.611 | n/a | 0.002 | 0.000 | n/a | n/a | 0.005 | 230.269 | 0.647 | 0.005 | node-14/thread-4/client.reach-decode-and-cache | client.reach-decode-and-cache 6.398ms; reader.observe 6.238ms; replica.apply-delta 0.086ms; replica.apply-delta 0.062ms; replica.apply-delta 0.048ms |
| a1f983bc1e3657270000000000052587 | 300.079 | 0.394 | n/a | 0.000 | 299.682 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 300.075 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000011676e | 299.784 | 0.032 | n/a | 0.000 | 299.751 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.783 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000011676d | 299.735 | 0.199 | n/a | 0.000 | 299.533 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.732 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000005a092 | 298.958 | 0.160 | n/a | 0.000 | 298.794 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.954 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a1f983bc1e36572700000000000729a9 | 296.738 | 201.451 | n/a | 26.511 | 0.000 | 10.548 | 29.956 | 28.247 | n/a | 0.016 | 0.000 | n/a | n/a | 0.009 | 227.962 | 0.768 | 0.009 | node-14/thread-6/client.reach-decode-and-cache | replica.apply-delta 0.115ms; replica.apply-delta 0.108ms; replica.apply-delta 0.103ms |
| 4caf76a59889ff43000000000013a77b | 270.310 | 0.157 | n/a | 0.000 | 270.149 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.307 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000013a77d | 270.212 | 0.025 | n/a | 0.000 | 270.186 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.211 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000006ffdd | 269.638 | 0.126 | n/a | 0.000 | 269.510 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.636 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000007c442 | 269.544 | 0.158 | n/a | 0.000 | 269.383 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.541 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000103a1a | 264.700 | 0.022 | n/a | 0.000 | 264.677 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.699 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000103a19 | 264.658 | 0.108 | n/a | 0.000 | 264.548 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.656 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000004243a | 264.350 | 0.145 | n/a | 0.000 | 264.201 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 264.346 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c50000000000048ab3 | 264.278 | 0.167 | n/a | 0.000 | 264.104 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 264.271 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000004852d | 264.257 | 0.477 | n/a | 0.000 | 263.776 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 264.253 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| 7751f5de1d8a17c5000000000004f37c | 263.993 | 0.192 | n/a | 0.000 | 263.799 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.991 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |

## P1 / L16 / read (2461 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 60.784 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 54.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 56.924 | 1.000 | 0.004 |
| p99 | 406.693 | n/a | n/a | n/a | 190.356 | n/a | 36.171 | 270.325 | 15.708 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 197.335 | 291.122 | 1.000 | 197.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff430000000000149d6e | 752.062 | 279.658 | n/a | 62.791 | 7.499 | 0.566 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 401.549 | 349.947 | 0.465 | 401.549 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 28.516ms; reader.observe 27.635ms; reader.observe 20.528ms; reader.observe 16.875ms; client.parse 4.852ms |
| 7751f5de1d8a17c50000000000087cd7 | 673.173 | 405.874 | n/a | 76.048 | 14.187 | 4.978 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 172.086 | 496.108 | 0.737 | 172.086 | node-14/thread-5/client.reach | reader.observe 17.719ms; client.reach-decode-and-cache 2.671ms; reader.observe 1.992ms; reader.observe 1.549ms; client.reach-decode-and-cache 1.115ms |
| 4caf76a59889ff430000000000149d6d | 643.579 | 190.356 | n/a | 55.802 | 0.000 | 0.995 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 396.426 | 246.158 | 0.382 | 396.426 | node-14/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 29.343ms; replica.apply-delta 28.516ms; reader.observe 27.635ms; reader.observe 20.528ms; client.parse 4.852ms |
| 4caf76a59889ff430000000000149d68 | 637.172 | 56.693 | n/a | 22.075 | 0.000 | 1.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 557.071 | 78.768 | 0.124 | 557.071 | node-14/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 36.917ms; reader.observe 17.805ms; reader.observe 12.462ms; client.parse 4.852ms; client.reach-decode-and-cache 4.103ms |
| 4caf76a59889ff430000000000149d66 | 623.975 | 384.496 | n/a | 89.756 | 1.885 | 13.325 | 86.552 | 0.005 | n/a | 0.011 | 0.000 | n/a | n/a | 47.944 | 476.137 | 0.763 | 47.944 | node-14/thread-4/replica.pull-at | reader.observe 17.805ms; client.parse 13.607ms; reader.observe 12.462ms; reader.observe 12.086ms; client.reach-decode-and-cache 10.372ms |
| 4caf76a59889ff430000000000149d6a | 613.717 | 224.375 | n/a | 53.152 | 0.000 | 0.590 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 335.600 | 277.527 | 0.452 | 335.600 | node-14/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 29.343ms; replica.apply-delta 28.516ms; reader.observe 20.528ms; client.parse 4.852ms; client.reach-decode-and-cache 3.934ms |
| 7751f5de1d8a17c50000000000087cda | 582.093 | 287.489 | n/a | 62.623 | 3.385 | 0.433 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 228.162 | 353.498 | 0.607 | 228.162 | node-14/thread-5/replica.pull-at | client.parse 14.975ms; reader.observe 8.382ms; replica.apply-delta 1.887ms; replica.apply-delta 0.096ms; replica.apply-delta 0.090ms |
| 7751f5de1d8a17c50000000000087cd8 | 566.470 | 69.875 | n/a | 15.399 | 0.000 | 0.614 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 480.581 | 85.275 | 0.151 | 480.581 | node-14/thread-5/socket.wait-first-byte | reader.observe 17.719ms; client.parse 14.975ms; client.reach-decode-and-cache 2.116ms; replica.apply-delta 1.887ms; replica.apply-delta 0.096ms |
| 4caf76a59889ff430000000000148b07 | 539.001 | 325.309 | n/a | 79.045 | 58.453 | 19.723 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.470 | 462.807 | 0.859 | 56.470 | node-14/thread-4/replica.pull-at | reader.observe 23.431ms; reader.observe 4.817ms; client.reach-decode-and-cache 3.361ms; reader.observe 2.437ms; client.reach-decode-and-cache 1.933ms |
| 7751f5de1d8a17c50000000000084855 | 536.759 | 311.511 | n/a | 57.750 | 1.634 | 142.034 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.830 | 370.895 | 0.691 | 23.830 | node-14/thread-5/socket.body-read | reader.observe 51.993ms; client.reach-decode-and-cache 6.356ms; reader.observe 4.757ms; client.reach-decode-and-cache 3.246ms; reader.observe 3.094ms |
| 4caf76a59889ff430000000000148b0d | 484.761 | 52.578 | n/a | 7.086 | 0.000 | 0.920 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 424.178 | 59.664 | 0.123 | 424.178 | node-14/thread-4/socket.wait-first-byte | reader.observe 23.431ms; client.parse 11.841ms; client.reach-decode-and-cache 5.803ms; client.reach-decode-and-cache 1.933ms; reader.observe 1.805ms |
| 7751f5de1d8a17c50000000000087cd9 | 481.979 | 232.448 | n/a | 41.151 | 0.000 | 0.564 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 207.816 | 273.599 | 0.568 | 207.816 | node-14/thread-5/replica.pull-at | client.parse 14.975ms; client.reach-decode-and-cache 2.116ms; replica.apply-delta 1.887ms; replica.apply-delta 0.096ms; replica.apply-delta 0.090ms |
| 4caf76a59889ff430000000000148b11 | 479.977 | 198.757 | n/a | 33.888 | 0.000 | 0.619 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 246.713 | 232.645 | 0.485 | 246.713 | node-14/thread-4/socket.wait-first-byte | reader.observe 23.431ms; reader.observe 23.084ms; client.parse 11.841ms; client.reach-decode-and-cache 1.933ms; reader.observe 1.579ms |
| 4caf76a59889ff43000000000014629f | 477.490 | 218.265 | n/a | 30.867 | 0.000 | 0.738 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 227.620 | 249.133 | 0.522 | 227.620 | node-14/thread-4/socket.wait-first-byte | client.reach-decode-and-cache 32.883ms; reader.observe 26.061ms; client.parse 10.820ms; reader.observe 7.076ms; client.reach-decode-and-cache 6.781ms |
| 7751f5de1d8a17c50000000000086c96 | 470.419 | 288.014 | n/a | 29.562 | 3.096 | 59.173 | 70.625 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 19.898 | 320.672 | 0.682 | 19.898 | node-14/thread-5/replica.pull-at | reader.observe 32.854ms; replica.apply-delta 6.223ms; client.reach-decode-and-cache 4.995ms; reader.observe 4.292ms; client.reach-decode-and-cache 4.224ms |
| 4caf76a59889ff430000000000149d6c | 465.590 | 172.677 | n/a | 43.406 | 0.000 | 0.089 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 249.418 | 216.083 | 0.464 | 249.418 | node-14/thread-4/socket.wait-first-byte | reader.observe 20.528ms; client.parse 4.852ms; replica.apply-delta 0.061ms; replica.apply-delta 0.057ms; replica.apply-delta 0.043ms |
| a1f983bc1e365727000000000007bc28 | 462.165 | 304.635 | n/a | 58.812 | 3.683 | 8.184 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.851 | 367.130 | 0.794 | 86.851 | node-14/thread-6/client.reach | reader.observe 17.445ms; reader.observe 6.948ms; client.reach-decode-and-cache 6.806ms; client.reach-decode-and-cache 4.660ms; client.reach-decode-and-cache 3.699ms |
| 4caf76a59889ff43000000000014629d | 444.454 | 219.774 | n/a | 37.680 | 0.000 | 0.615 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 186.385 | 257.454 | 0.579 | 186.385 | node-14/thread-4/replica.pull-at | client.reach-decode-and-cache 32.883ms; reader.observe 26.061ms; client.parse 10.820ms; reader.observe 7.076ms; client.reach-decode-and-cache 6.781ms |
| 4caf76a59889ff43000000000014629e | 443.122 | 250.185 | n/a | 42.838 | 0.000 | 0.582 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 149.516 | 293.023 | 0.661 | 149.516 | node-14/thread-4/replica.pull-at | client.parse 10.820ms; reader.observe 7.076ms; client.reach-decode-and-cache 6.781ms; reader.observe 4.582ms; client.reach-decode-and-cache 4.073ms |
| 4caf76a59889ff430000000000146287 | 438.089 | 307.170 | n/a | 41.790 | 7.841 | 10.196 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.091 | 356.801 | 0.814 | 71.091 | node-14/thread-4/client.reach | reader.observe 8.802ms; reader.observe 6.687ms; client.reach-decode-and-cache 3.797ms; client.reach-decode-and-cache 1.745ms; client.reach-decode-and-cache 1.410ms |

## P1 / L64 / read (4754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 248.689 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 247.257 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 247.352 | 1.000 | 0.002 |
| p99 | 485.725 | n/a | n/a | n/a | 28.058 | n/a | 2.603 | 485.505 | 36.431 | 0.605 | 177.039 | n/a | 0.002 | 0.000 | n/a | n/a | 0.502 | 485.723 | 1.000 | 0.502 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff4300000000001c9417 | 493.116 | 2.155 | n/a | 0.000 | 490.958 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 493.113 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e36572700000000000f872d | 491.982 | 1.301 | n/a | 0.000 | 490.678 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 491.979 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e36572700000000000f872f | 491.368 | 0.042 | n/a | 0.000 | 491.322 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 491.365 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e36572700000000000f872e | 491.364 | 0.035 | n/a | 0.000 | 491.325 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 491.360 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e36572700000000000f8730 | 491.358 | 0.023 | n/a | 0.000 | 491.333 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 491.356 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c653 | 491.314 | 0.767 | n/a | 0.000 | 490.544 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 491.311 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c658 | 491.277 | 0.017 | n/a | 0.000 | 491.258 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 491.275 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000001c942c | 491.272 | 0.283 | n/a | 0.000 | 490.987 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 491.271 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c657 | 491.261 | 0.018 | n/a | 0.000 | 491.243 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 491.261 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c656 | 491.230 | 0.022 | n/a | 0.000 | 491.207 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 491.229 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c655 | 491.204 | 0.022 | n/a | 0.000 | 491.181 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 491.203 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c654 | 491.184 | 0.042 | n/a | 0.000 | 491.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 491.174 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c67d | 491.166 | 1.565 | n/a | 0.000 | 489.599 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 491.164 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c67f | 490.622 | 0.348 | n/a | 0.000 | 490.272 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 490.620 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c67e | 490.618 | 0.287 | n/a | 0.000 | 490.330 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 490.617 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000010c67c | 490.349 | 0.595 | n/a | 0.000 | 489.749 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 490.344 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000001c9450 | 489.913 | 0.047 | n/a | 0.000 | 489.864 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 489.911 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000001c944e | 489.902 | 0.040 | n/a | 0.000 | 489.860 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 489.900 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000001c944a | 489.879 | 0.252 | n/a | 0.000 | 489.625 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 489.877 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000001c944f | 489.873 | 0.044 | n/a | 0.000 | 489.826 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 489.869 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (13163 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 228.501 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 228.390 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 228.500 | 1.000 | 0.001 |
| p99 | 457.867 | n/a | n/a | n/a | 5.762 | n/a | 0.000 | 457.833 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.253 | 457.867 | 1.000 | 0.253 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7751f5de1d8a17c5000000000015e08c | 483.144 | 0.171 | n/a | 0.000 | 482.970 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 483.141 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000015e08b | 483.031 | 0.029 | n/a | 0.000 | 483.001 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 483.029 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000015e08a | 483.014 | 0.087 | n/a | 0.000 | 482.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 483.013 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000015e089 | 482.955 | 0.028 | n/a | 0.000 | 482.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 482.954 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000015e088 | 482.911 | 0.036 | n/a | 0.000 | 482.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 482.909 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000015e087 | 482.865 | 0.041 | n/a | 0.000 | 482.823 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 482.864 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000015e086 | 482.832 | 0.231 | n/a | 0.000 | 482.596 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 482.827 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000144c2a | 481.889 | 0.364 | n/a | 0.000 | 481.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 481.885 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173ab | 481.682 | 0.209 | n/a | 0.000 | 481.470 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 481.679 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000144c2b | 481.629 | 0.052 | n/a | 0.000 | 481.573 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 481.625 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000144c2c | 481.605 | 0.021 | n/a | 0.000 | 481.582 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 481.603 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000144c2e | 481.603 | 0.137 | n/a | 0.000 | 481.464 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 481.601 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000144c2d | 481.596 | 0.018 | n/a | 0.000 | 481.576 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 481.595 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000217400 | 478.506 | 0.012 | n/a | 0.000 | 478.493 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 478.505 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173ff | 478.501 | 0.013 | n/a | 0.000 | 478.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 478.500 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173fe | 478.491 | 0.019 | n/a | 0.000 | 478.472 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 478.490 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173fc | 478.487 | 0.065 | n/a | 0.000 | 478.421 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 478.486 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173f7 | 478.480 | 0.109 | n/a | 0.000 | 478.370 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 478.479 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173fd | 478.473 | 0.020 | n/a | 0.000 | 478.451 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 478.471 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff4300000000002173fb | 478.457 | 0.014 | n/a | 0.000 | 478.442 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 478.456 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (38277 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 160.738 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 159.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 159.643 | 1.000 | 0.001 |
| p99 | 310.416 | n/a | n/a | n/a | 83.848 | n/a | 13.498 | 292.285 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.401 | 292.811 | 1.000 | 9.401 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7751f5de1d8a17c500000000001cbab5 | 3870.635 | 109.145 | n/a | 22.659 | 0.000 | 3433.040 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 305.791 | 131.804 | 0.034 | 305.791 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cba9f | 3786.688 | 73.013 | n/a | 17.715 | 0.000 | 3420.114 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 275.847 | 90.728 | 0.024 | 275.847 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbac8 | 3744.856 | 2200.621 | n/a | 463.160 | 0.000 | 652.557 | 2.411 | 267.020 | n/a | 0.002 | 0.000 | n/a | n/a | 159.085 | 2663.781 | 0.711 | 159.085 | node-14/thread-5/client.reach | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaa0 | 3715.542 | 92.861 | n/a | 20.856 | 0.000 | 3487.672 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 114.153 | 113.717 | 0.031 | 114.153 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbab7 | 3684.949 | 71.185 | n/a | 12.789 | 0.000 | 3467.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 133.718 | 83.975 | 0.023 | 133.718 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaaf | 3639.515 | 42.619 | n/a | 9.095 | 0.000 | 3269.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 318.498 | 51.714 | 0.014 | 318.498 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cba9c | 3635.842 | 42.067 | n/a | 12.394 | 0.000 | 3271.483 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 309.898 | 54.461 | 0.015 | 309.898 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbab2 | 3621.957 | 51.676 | n/a | 12.898 | 0.000 | 3269.707 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 287.677 | 64.573 | 0.018 | 287.677 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaab | 3609.504 | 42.909 | n/a | 9.095 | 0.000 | 3270.061 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 287.439 | 52.004 | 0.014 | 287.439 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaa6 | 3607.553 | 40.963 | n/a | 9.095 | 0.000 | 3270.509 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 286.986 | 50.058 | 0.014 | 286.986 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cba9e | 3604.584 | 43.045 | n/a | 9.095 | 0.000 | 3271.639 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 280.805 | 52.140 | 0.014 | 280.805 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbab0 | 3601.010 | 43.557 | n/a | 9.095 | 0.000 | 3269.659 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 278.699 | 52.652 | 0.015 | 278.699 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaad | 3599.851 | 41.497 | n/a | 9.095 | 0.000 | 3269.698 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 279.560 | 50.592 | 0.014 | 279.560 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaa3 | 3597.122 | 43.062 | n/a | 12.097 | 0.000 | 3270.855 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 271.109 | 55.159 | 0.015 | 271.109 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbab9 | 3588.468 | 46.589 | n/a | 9.095 | 0.000 | 3268.016 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 264.767 | 55.684 | 0.016 | 264.767 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbaa5 | 3581.612 | 39.812 | n/a | 12.232 | 0.000 | 3270.484 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 259.083 | 52.044 | 0.015 | 259.083 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbab8 | 3575.157 | 43.881 | n/a | 9.095 | 0.000 | 3268.393 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 253.788 | 52.976 | 0.015 | 253.788 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cba9b | 3573.967 | 66.174 | n/a | 13.854 | 0.000 | 3271.955 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 221.984 | 80.028 | 0.022 | 221.984 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cba9a | 3570.072 | 36.579 | n/a | 9.095 | 0.000 | 3271.938 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 252.460 | 45.674 | 0.013 | 252.460 | node-14/thread-5/socket.queue-and-write | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |
| 7751f5de1d8a17c500000000001cbac4 | 3559.615 | 2116.698 | n/a | 450.914 | 0.000 | 586.965 | 4.073 | 264.944 | n/a | 0.003 | 0.000 | n/a | n/a | 136.017 | 2567.612 | 0.721 | 136.017 | node-14/thread-5/client.reach | client.parse 151.072ms; reader.observe 126.813ms; client.parse 85.132ms; reader.observe 53.150ms; reader.observe 48.978ms |

## P1 / recovery / read (19563 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 226.971 | n/a | n/a | n/a | 0.034 | n/a | 0.000 | 226.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 226.911 | 1.000 | 0.001 |
| p99 | 335.307 | n/a | n/a | n/a | 15.802 | n/a | 0.000 | 335.201 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.306 | 335.303 | 1.000 | 0.306 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7751f5de1d8a17c5000000000025f976 | 348.959 | 0.365 | n/a | 0.000 | 348.591 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 348.956 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000025f977 | 348.879 | 0.053 | n/a | 0.000 | 348.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 348.868 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000033940d | 346.150 | 4.597 | n/a | 0.000 | 341.549 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 346.146 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000245014 | 345.720 | 0.580 | n/a | 0.000 | 345.131 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 345.711 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000245015 | 345.298 | 0.066 | n/a | 0.000 | 345.225 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 345.292 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000245016 | 345.275 | 0.184 | n/a | 0.000 | 345.087 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 345.271 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000024501d | 345.196 | 0.239 | n/a | 0.000 | 344.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.194 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000024501b | 345.186 | 0.125 | n/a | 0.000 | 345.059 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.184 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000024501c | 345.172 | 0.117 | n/a | 0.000 | 345.053 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.170 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000245017 | 345.136 | 0.051 | n/a | 0.000 | 345.082 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 345.134 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000024501a | 345.114 | 0.024 | n/a | 0.000 | 345.088 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.112 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000245019 | 345.112 | 0.022 | n/a | 0.000 | 345.087 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.110 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a1f983bc1e3657270000000000245018 | 345.111 | 0.026 | n/a | 0.000 | 345.083 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.109 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000028d070 | 344.618 | 0.980 | n/a | 0.000 | 343.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 344.614 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000028d073 | 344.590 | 0.028 | n/a | 0.000 | 344.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.588 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000028d072 | 344.557 | 0.028 | n/a | 0.000 | 344.528 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.555 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 7751f5de1d8a17c5000000000028d071 | 344.522 | 0.043 | n/a | 0.000 | 344.477 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 344.520 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4caf76a59889ff43000000000033940e | 344.491 | 0.511 | n/a | 0.000 | 343.974 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 344.485 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4caf76a59889ff430000000000339412 | 344.390 | 1.219 | n/a | 0.000 | 343.169 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.389 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a1f983bc1e365727000000000027bdc0 | 344.309 | 0.085 | n/a | 0.000 | 344.223 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 344.308 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |

## P4 / p4mix / read (692 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.000 | 0.000 | 0.036 |
| p99 | 0.254 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff43000000000041b25c | 0.484 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.484 | 0.000 | 0.000 | 0.484 | uncovered | none observed |
| 4caf76a59889ff43000000000041495f | 0.415 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.415 | 0.000 | 0.000 | 0.415 | uncovered | none observed |
| 4caf76a59889ff4300000000003fec02 | 0.401 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 | uncovered | none observed |
| 4caf76a59889ff43000000000043defe | 0.334 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | uncovered | none observed |
| 4caf76a59889ff430000000000437407 | 0.302 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.302 | 0.000 | 0.000 | 0.302 | uncovered | none observed |
| 4caf76a59889ff4300000000003bdee8 | 0.257 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | uncovered | none observed |
| 4caf76a59889ff4300000000003b3195 | 0.254 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | uncovered | none observed |
| 4caf76a59889ff430000000000412be3 | 0.244 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | uncovered | none observed |
| 4caf76a59889ff4300000000003f4495 | 0.237 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | uncovered | none observed |
| 4caf76a59889ff4300000000003e23e7 | 0.235 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | uncovered | none observed |
| 4caf76a59889ff4300000000003c2917 | 0.229 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | uncovered | none observed |
| 4caf76a59889ff4300000000003fee71 | 0.223 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | uncovered | none observed |
| 4caf76a59889ff430000000000407cc2 | 0.216 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | uncovered | none observed |
| 4caf76a59889ff4300000000003c5b37 | 0.199 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | uncovered | none observed |
| 4caf76a59889ff43000000000040b3d4 | 0.198 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | uncovered | none observed |
| 4caf76a59889ff43000000000044a2a3 | 0.190 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | uncovered | none observed |
| 4caf76a59889ff430000000000420e19 | 0.184 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | uncovered | none observed |
| 4caf76a59889ff43000000000040563e | 0.179 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | uncovered | none observed |
| 4caf76a59889ff4300000000003e5ac6 | 0.177 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | uncovered | none observed |
| 4caf76a59889ff4300000000003e9248 | 0.175 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | uncovered | none observed |

## P4 / p4h1 / read (1317 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 0.207 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff4300000000004f377c | 50.208 | 50.205 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 50.205 | 1.000 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 4caf76a59889ff43000000000056e9cc | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 4caf76a59889ff4300000000004817a6 | 0.394 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | uncovered | none observed |
| 4caf76a59889ff43000000000047e7e1 | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| 4caf76a59889ff4300000000004df42e | 0.359 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.359 | 0.000 | 0.000 | 0.359 | uncovered | none observed |
| 4caf76a59889ff4300000000004ea263 | 0.343 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 | uncovered | none observed |
| 4caf76a59889ff430000000000495366 | 0.297 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | uncovered | none observed |
| 4caf76a59889ff430000000000468199 | 0.269 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | uncovered | none observed |
| 4caf76a59889ff43000000000052419f | 0.258 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | uncovered | none observed |
| 4caf76a59889ff4300000000004fd5b8 | 0.256 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | uncovered | none observed |
| 4caf76a59889ff430000000000552a2f | 0.250 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | uncovered | none observed |
| 4caf76a59889ff43000000000057fda0 | 0.239 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | uncovered | none observed |
| 4caf76a59889ff43000000000048e8ea | 0.236 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | uncovered | none observed |
| 4caf76a59889ff4300000000004be8a7 | 0.207 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | uncovered | none observed |
| 4caf76a59889ff43000000000057a125 | 0.195 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | uncovered | none observed |
| 4caf76a59889ff4300000000005113a4 | 0.184 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | uncovered | none observed |
| 4caf76a59889ff430000000000592c11 | 0.183 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | uncovered | none observed |
| 4caf76a59889ff4300000000004ff687 | 0.183 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | uncovered | none observed |
| 4caf76a59889ff43000000000050ef2a | 0.179 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | uncovered | none observed |
| 4caf76a59889ff43000000000055c89a | 0.176 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | uncovered | none observed |

## P4 / p4h3 / read (1363 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 0.240 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff43000000000070777c | 0.703 | 0.698 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.698 | 0.994 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 4caf76a59889ff4300000000005bad21 | 0.644 | 0.641 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.641 | 0.996 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 4caf76a59889ff4300000000006a8ab9 | 0.469 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.469 | 0.000 | 0.000 | 0.469 | uncovered | none observed |
| 4caf76a59889ff4300000000005c313d | 0.350 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.350 | 0.000 | 0.000 | 0.350 | uncovered | none observed |
| 4caf76a59889ff430000000000668dde | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | uncovered | none observed |
| 4caf76a59889ff4300000000006ec2b3 | 0.301 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.301 | 0.000 | 0.000 | 0.301 | uncovered | none observed |
| 4caf76a59889ff4300000000006a7487 | 0.292 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | uncovered | none observed |
| 4caf76a59889ff4300000000006a2b28 | 0.286 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 | uncovered | none observed |
| 4caf76a59889ff430000000000665c49 | 0.280 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | uncovered | none observed |
| 4caf76a59889ff4300000000006a35bd | 0.272 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 | uncovered | none observed |
| 4caf76a59889ff4300000000005d5764 | 0.262 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 | uncovered | none observed |
| 4caf76a59889ff4300000000005ecb97 | 0.248 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | uncovered | none observed |
| 4caf76a59889ff4300000000006a1de2 | 0.243 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | uncovered | none observed |
| 4caf76a59889ff4300000000006f67f6 | 0.240 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | uncovered | none observed |
| 4caf76a59889ff4300000000005dba05 | 0.230 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | uncovered | none observed |
| 4caf76a59889ff4300000000006dbf21 | 0.217 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | uncovered | none observed |
| 4caf76a59889ff4300000000005d05d3 | 0.214 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | uncovered | none observed |
| 4caf76a59889ff4300000000005ecbd0 | 0.197 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | uncovered | none observed |
| 4caf76a59889ff43000000000063710d | 0.188 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | uncovered | none observed |
| 4caf76a59889ff430000000000634ba1 | 0.180 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | uncovered | none observed |

## P4 / p4h10 / read (1289 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 0.179 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff430000000000739a52 | 0.379 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.379 | 0.000 | 0.000 | 0.379 | uncovered | none observed |
| 4caf76a59889ff430000000000756b74 | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |
| 4caf76a59889ff4300000000008042cf | 0.377 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.377 | 0.000 | 0.000 | 0.377 | uncovered | none observed |
| 4caf76a59889ff4300000000007d0255 | 0.328 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.328 | 0.000 | 0.000 | 0.328 | uncovered | none observed |
| 4caf76a59889ff430000000000774eb0 | 0.328 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.328 | 0.000 | 0.000 | 0.328 | uncovered | none observed |
| 4caf76a59889ff4300000000007c0af8 | 0.309 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | uncovered | none observed |
| 4caf76a59889ff4300000000007beece | 0.243 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | uncovered | none observed |
| 4caf76a59889ff430000000000734e1e | 0.240 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | uncovered | none observed |
| 4caf76a59889ff4300000000007f31f0 | 0.240 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | uncovered | none observed |
| 4caf76a59889ff43000000000073d739 | 0.199 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | uncovered | none observed |
| 4caf76a59889ff4300000000007a4092 | 0.194 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | uncovered | none observed |
| 4caf76a59889ff4300000000007fa1ca | 0.186 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | uncovered | none observed |
| 4caf76a59889ff43000000000077627b | 0.179 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | uncovered | none observed |
| 4caf76a59889ff43000000000071df2a | 0.178 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | uncovered | none observed |
| 4caf76a59889ff43000000000082edc5 | 0.177 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | uncovered | none observed |
| 4caf76a59889ff43000000000076ecd2 | 0.172 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | uncovered | none observed |
| 4caf76a59889ff4300000000007c6f72 | 0.157 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | uncovered | none observed |
| 4caf76a59889ff4300000000007b89ed | 0.156 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | uncovered | none observed |
| 4caf76a59889ff4300000000007e92ac | 0.148 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | uncovered | none observed |
| 4caf76a59889ff43000000000074fcf3 | 0.146 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | uncovered | none observed |

## P5 / presweep / read (4744 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 250.484 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 249.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 249.906 | 1.000 | 0.002 |
| p99 | 387.469 | n/a | n/a | n/a | 20.798 | n/a | 0.000 | 383.958 | 39.375 | 0.376 | 82.463 | n/a | 0.002 | 0.000 | n/a | n/a | 0.502 | 384.114 | 1.000 | 0.502 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4caf76a59889ff4300000000008b1a19 | 921.371 | 173.468 | n/a | 21.814 | 0.000 | 509.216 | 0.889 | 91.110 | n/a | 0.005 | 0.000 | n/a | n/a | 124.869 | 195.283 | 0.212 | 124.869 | node-14/thread-4/socket.body-read | reader.observe 155.990ms; client.reach-decode-and-cache 46.411ms; reader.observe 20.911ms; reader.observe 13.607ms; reader.observe 12.908ms |
| 4caf76a59889ff4300000000008b1a12 | 904.310 | 58.197 | n/a | 6.989 | 0.000 | 615.972 | 44.891 | 178.244 | n/a | 0.011 | 0.000 | n/a | n/a | 0.006 | 65.185 | 0.072 | 0.006 | node-14/thread-4/socket.body-read | reader.observe 155.990ms; client.reach-decode-and-cache 46.411ms; reader.observe 13.607ms; reader.observe 12.908ms; reader.observe 11.166ms |
| 4caf76a59889ff4300000000008b1a16 | 859.571 | 196.670 | n/a | 28.917 | 0.000 | 447.603 | 0.607 | 82.946 | n/a | 0.004 | 0.000 | n/a | n/a | 102.823 | 225.587 | 0.262 | 102.823 | node-14/thread-4/socket.body-read | reader.observe 155.990ms; client.reach-decode-and-cache 46.411ms; reader.observe 12.908ms; reader.observe 11.166ms; reader.observe 9.025ms |
| 4caf76a59889ff4300000000008b1a1d | 817.705 | 179.801 | n/a | 22.573 | 0.000 | 38.714 | 22.230 | 77.783 | n/a | 0.013 | 0.000 | n/a | n/a | 476.590 | 202.374 | 0.247 | 476.590 | node-14/thread-4/socket.wait-first-byte | reader.observe 155.990ms; client.reach-decode-and-cache 46.411ms; reader.observe 12.908ms; reader.observe 11.166ms; reader.observe 9.025ms |
| a1f983bc1e3657270000000000350480 | 814.840 | 274.725 | n/a | 56.005 | 0.000 | 101.920 | 211.286 | 170.889 | n/a | 0.011 | 0.000 | n/a | n/a | 0.004 | 330.731 | 0.406 | 0.004 | gw-r/thread-240/gateway.response-write | reader.observe 15.616ms; reader.observe 13.003ms; reader.observe 10.926ms; reader.observe 10.916ms; client.reach-decode-and-cache 8.229ms |
| 4caf76a59889ff4300000000008b1a0c | 796.159 | 335.252 | n/a | 76.966 | 0.000 | 54.767 | 105.907 | 91.818 | n/a | 0.002 | 0.000 | n/a | n/a | 131.446 | 412.218 | 0.518 | 131.446 | node-14/thread-4/socket.wait-first-byte | reader.observe 12.908ms; reader.observe 11.166ms; reader.observe 9.025ms; reader.observe 8.888ms; reader.observe 8.608ms |
| a1f983bc1e3657270000000000350495 | 523.856 | 56.138 | n/a | 10.158 | 0.000 | 217.903 | 0.747 | 181.091 | n/a | 0.002 | 0.000 | n/a | n/a | 57.817 | 66.296 | 0.127 | 57.817 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 30.637ms; reader.observe 15.616ms; reader.observe 10.926ms; reader.observe 10.916ms; client.reach-decode-and-cache 8.229ms |
| 7751f5de1d8a17c50000000000378ee9 | 507.285 | 169.184 | n/a | 21.583 | 0.000 | 189.439 | 39.630 | 48.268 | n/a | 0.002 | 0.000 | n/a | n/a | 39.178 | 190.767 | 0.376 | 39.178 | node-14/thread-5/socket.body-read | reader.observe 22.723ms; client.reach-decode-and-cache 18.679ms; reader.observe 17.938ms; reader.observe 15.957ms; reader.observe 14.084ms |
| a1f983bc1e365727000000000035048c | 482.935 | 84.184 | n/a | 12.947 | 0.000 | 84.769 | 4.107 | 171.756 | n/a | 0.003 | 0.000 | n/a | n/a | 125.169 | 97.131 | 0.201 | 125.169 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 30.637ms; reader.observe 15.616ms; reader.observe 10.926ms; client.reach-decode-and-cache 8.229ms; client.reach-decode-and-cache 6.235ms |
| 7751f5de1d8a17c50000000000378eed | 471.441 | 169.146 | n/a | 21.361 | 0.000 | 160.376 | 0.948 | 83.451 | n/a | 0.005 | 0.000 | n/a | n/a | 36.155 | 190.506 | 0.404 | 36.155 | node-14/thread-5/client.reach | client.reach-decode-and-cache 18.679ms; reader.observe 17.938ms; reader.observe 15.957ms; reader.observe 14.084ms; client.reach-decode-and-cache 5.338ms |
| a1f983bc1e365727000000000035048e | 461.198 | 65.586 | n/a | 16.995 | 0.000 | 84.585 | 0.817 | 175.430 | n/a | 0.022 | 0.000 | n/a | n/a | 117.762 | 82.581 | 0.179 | 117.762 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 30.637ms; reader.observe 15.616ms; reader.observe 10.926ms; client.reach-decode-and-cache 8.229ms; client.reach-decode-and-cache 6.235ms |
| a1f983bc1e3657270000000000350481 | 454.475 | 62.558 | n/a | 12.947 | 0.000 | 96.153 | 0.669 | 171.205 | n/a | 0.012 | 0.000 | n/a | n/a | 110.929 | 75.505 | 0.166 | 110.929 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 30.637ms; reader.observe 15.616ms; reader.observe 10.926ms; client.reach-decode-and-cache 8.229ms; reader.observe 5.006ms |
| a1f983bc1e3657270000000000350489 | 446.862 | 63.806 | n/a | 11.246 | 0.000 | 104.013 | 0.549 | 171.412 | n/a | 0.002 | 0.000 | n/a | n/a | 95.834 | 75.052 | 0.168 | 95.834 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 30.637ms; reader.observe 15.616ms; reader.observe 10.926ms; client.reach-decode-and-cache 8.229ms; client.reach-decode-and-cache 6.235ms |
| 4caf76a59889ff4300000000008b1a18 | 444.272 | 78.027 | n/a | 10.377 | 0.000 | 51.394 | 0.237 | 181.401 | n/a | 0.002 | 0.000 | n/a | n/a | 122.834 | 88.404 | 0.199 | 122.834 | gw-r/thread-168/gateway.admission-wait | client.reach-decode-and-cache 46.411ms; reader.observe 12.908ms; reader.observe 11.166ms; reader.observe 9.025ms; reader.observe 8.888ms |
| 4caf76a59889ff4300000000008b1a1f | 442.169 | 92.673 | n/a | 14.643 | 0.000 | 48.883 | 5.189 | 177.841 | n/a | 0.004 | 0.000 | n/a | n/a | 102.936 | 107.316 | 0.243 | 102.936 | gw-r/thread-83/gateway.admission-wait | client.reach-decode-and-cache 46.411ms; reader.observe 11.166ms; reader.observe 9.025ms; reader.observe 8.888ms; reader.observe 8.608ms |
| a1f983bc1e3657270000000000350490 | 431.735 | 63.528 | n/a | 7.746 | 0.000 | 100.878 | 0.376 | 173.452 | n/a | 0.009 | 0.000 | n/a | n/a | 85.746 | 71.274 | 0.165 | 85.746 | node-14/thread-6/socket.wait-first-byte | client.reach-decode-and-cache 30.637ms; reader.observe 15.616ms; reader.observe 10.926ms; client.reach-decode-and-cache 8.229ms; client.reach-decode-and-cache 6.235ms |
| 7751f5de1d8a17c50000000000378efa | 428.789 | 32.461 | n/a | 4.224 | 0.000 | 71.902 | 1.871 | 174.810 | n/a | 0.004 | 0.000 | n/a | n/a | 143.518 | 36.685 | 0.086 | 143.518 | node-14/thread-5/socket.wait-first-byte | client.reach-decode-and-cache 18.679ms; reader.observe 17.938ms; reader.observe 15.957ms; reader.observe 14.084ms; client.reach-decode-and-cache 5.338ms |
| 4caf76a59889ff4300000000008b1a1a | 422.266 | 195.128 | n/a | 27.540 | 0.000 | 33.367 | 0.873 | 82.463 | n/a | 0.009 | 0.000 | n/a | n/a | 82.885 | 222.668 | 0.527 | 82.885 | node-14/thread-4/client.reach | client.reach-decode-and-cache 46.411ms; reader.observe 11.166ms; reader.observe 8.888ms; reader.observe 8.608ms; reader.observe 8.464ms |
| a1f983bc1e3657270000000000350484 | 422.167 | 98.444 | n/a | 17.996 | 0.000 | 70.289 | 1.255 | 168.040 | n/a | 0.003 | 0.000 | n/a | n/a | 66.141 | 116.440 | 0.276 | 66.141 | gw-r/thread-128/gateway.admission-wait | client.reach-decode-and-cache 30.637ms; reader.observe 10.926ms; client.reach-decode-and-cache 8.229ms; client.reach-decode-and-cache 6.235ms; reader.observe 5.006ms |
| 7751f5de1d8a17c50000000000378ef8 | 420.176 | 193.570 | n/a | 32.478 | 0.000 | 105.913 | 9.633 | 44.656 | n/a | 0.002 | 0.000 | n/a | n/a | 33.924 | 226.048 | 0.538 | 33.924 | node-14/thread-5/client.reach | client.reach-decode-and-cache 18.679ms; reader.observe 15.957ms; reader.observe 14.084ms; client.reach-decode-and-cache 5.338ms; reader.observe 4.038ms |

## P5 / sweep / read (129 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 119.375 | n/a | n/a | n/a | 0.710 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 59.943 | 0.997 | 0.012 |
| p99 | 521.636 | n/a | n/a | n/a | 355.126 | n/a | 71.335 | 382.430 | 247.573 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 302.825 | 427.881 | 1.000 | 302.825 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1f983bc1e365727000000000035a40e | 524.967 | 355.126 | n/a | 77.346 | 0.000 | 8.153 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.341 | 432.472 | 0.824 | 84.341 | node-14/thread-6/client.reach | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 31.223ms; reader.observe 30.979ms; client.reach-decode-and-cache 16.763ms |
| a1f983bc1e365727000000000035a410 | 521.636 | 356.546 | n/a | 71.335 | 0.000 | 7.816 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.939 | 427.881 | 0.820 | 85.939 | node-14/thread-6/client.reach | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 31.223ms; reader.observe 30.979ms; client.reach-decode-and-cache 16.763ms |
| a1f983bc1e365727000000000035a40c | 512.260 | 66.638 | n/a | 10.401 | 6.880 | 337.538 | 70.139 | 20.643 | n/a | 0.018 | 0.000 | n/a | n/a | 0.004 | 83.919 | 0.164 | 0.004 | node-14/thread-6/socket.body-read | reader.observe 59.906ms; reader.observe 36.063ms; reader.observe 30.979ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms |
| a1f983bc1e365727000000000035a40d | 481.313 | 311.720 | n/a | 67.518 | 0.000 | 0.304 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 101.771 | 379.239 | 0.788 | 101.771 | node-14/thread-6/client.reach | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 31.223ms; reader.observe 30.979ms; client.reach-decode-and-cache 16.763ms |
| a1f983bc1e365727000000000035a40f | 481.270 | 339.267 | n/a | 67.518 | 0.000 | 2.413 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 72.072 | 406.785 | 0.845 | 72.072 | node-14/thread-6/client.reach | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 31.223ms; reader.observe 30.979ms; client.reach-decode-and-cache 16.763ms |
| a1f983bc1e365727000000000035a408 | 445.241 | 85.787 | n/a | 13.523 | 0.000 | 247.573 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.357 | 99.310 | 0.223 | 98.357 | node-14/thread-6/socket.body-read | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3cf | 405.613 | 0.470 | n/a | 0.000 | 405.139 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 405.610 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3df | 382.938 | 0.504 | n/a | 0.000 | 382.430 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 382.934 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3e0 | 382.380 | 0.052 | n/a | 0.000 | 382.323 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 382.375 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3e2 | 382.125 | 0.038 | n/a | 0.000 | 382.085 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 382.123 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3e3 | 382.119 | 0.043 | n/a | 0.000 | 382.073 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 382.115 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3e1 | 382.106 | 0.049 | n/a | 0.000 | 382.053 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 382.102 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3fe | 372.477 | 0.201 | n/a | 0.000 | 372.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 372.471 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a3ff | 372.201 | 0.070 | n/a | 0.000 | 372.120 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 372.190 | 1.000 | 0.011 | node-14/thread-6/reader.straddle-await-ack | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; reader.observe 13.063ms |
| a1f983bc1e365727000000000035a403 | 357.287 | 43.980 | n/a | 7.889 | 0.000 | 2.592 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 302.825 | 51.869 | 0.145 | 302.825 | node-14/thread-6/socket.wait-first-byte | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; client.reach-decode-and-cache 11.195ms |
| a1f983bc1e365727000000000035a402 | 330.997 | 24.618 | n/a | 0.000 | 0.000 | 1.616 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 304.762 | 24.618 | 0.074 | 304.762 | node-14/thread-6/socket.wait-first-byte | reader.observe 59.906ms; reader.observe 36.063ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; client.reach-decode-and-cache 11.195ms |
| a1f983bc1e365727000000000035a401 | 326.280 | 114.063 | n/a | 9.349 | 0.000 | 4.893 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 197.975 | 123.412 | 0.378 | 197.975 | node-14/thread-6/socket.wait-first-byte | reader.observe 59.906ms; client.reach-decode-and-cache 16.763ms; reader.observe 14.350ms; client.reach-decode-and-cache 11.195ms; client.reach-decode-and-cache 7.896ms |
| 4caf76a59889ff4300000000008bae3f | 298.996 | 1.866 | n/a | 0.000 | 297.116 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 298.982 | 1.000 | 0.014 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.177ms; replica.apply-delta 0.092ms; replica.apply-delta 0.086ms; replica.apply-delta 0.081ms; replica.apply-delta 0.047ms |
| 4caf76a59889ff4300000000008bae54 | 285.869 | 0.466 | n/a | 0.000 | 285.401 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.866 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.177ms; replica.apply-delta 0.092ms; replica.apply-delta 0.086ms; replica.apply-delta 0.081ms; replica.apply-delta 0.047ms |
| 4caf76a59889ff4300000000008bae66 | 280.861 | 0.299 | n/a | 0.000 | 280.561 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.860 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.177ms; replica.apply-delta 0.092ms; replica.apply-delta 0.086ms; replica.apply-delta 0.081ms; replica.apply-delta 0.047ms |

## P3 / outside-phases / read (832 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.212 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 200.565 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 |
| p99 | 204.118 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.990 | 202.098 | 2.266 | n/a | 0.173 | 0.000 | n/a | n/a | 0.640 | 0.000 | 0.000 | 0.640 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000000002 | 389.627 | 3.565 | n/a | 0.000 | 0.000 | 4.172 | 381.026 | 0.119 | n/a | 0.104 | 0.000 | n/a | n/a | 0.640 | 3.565 | 0.009 | 0.640 | gw-r/thread-45/gateway.admitted-work | none observed |
| 8bafba02fb063e850000000000002602 | 240.984 | 1.978 | n/a | 0.000 | 0.000 | 12.394 | 224.489 | 0.044 | n/a | 0.089 | 0.000 | n/a | n/a | 1.990 | 1.978 | 0.008 | 1.990 | gw-r/thread-141/journal/page | none observed |
| 8bafba02fb063e85000000000000191a | 210.081 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 208.515 | 0.025 | n/a | 0.088 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-192/journal/page | none observed |
| 8bafba02fb063e850000000000002603 | 209.727 | 0.000 | n/a | 0.000 | 0.000 | 3.729 | 202.544 | 0.015 | n/a | 3.171 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-87/journal/page | none observed |
| 8bafba02fb063e850000000000000007 | 209.281 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 208.167 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000002626 | 207.156 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 206.106 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-274/journal/page | none observed |
| 8bafba02fb063e85000000000000191b | 205.823 | 0.000 | n/a | 0.000 | 0.000 | 4.751 | 200.762 | 0.007 | n/a | 0.138 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-233/journal/page | none observed |
| 8bafba02fb063e8500000000000018da | 204.612 | 0.000 | n/a | 0.000 | 0.000 | 3.546 | 200.902 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-238/journal/page | none observed |
| 8bafba02fb063e850000000000002695 | 204.118 | 0.000 | n/a | 0.000 | 0.000 | 0.386 | 203.619 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 8bafba02fb063e85000000000000180a | 204.011 | 0.000 | n/a | 0.000 | 0.000 | 3.316 | 200.544 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-153/journal/page | none observed |
| 8bafba02fb063e850000000000002579 | 203.934 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 202.621 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-129/journal/page | none observed |
| 8bafba02fb063e850000000000001951 | 203.631 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 202.098 | 0.018 | n/a | 0.241 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-114/journal/page | none observed |
| 8bafba02fb063e850000000000002580 | 203.438 | 0.000 | n/a | 0.000 | 0.000 | 2.413 | 200.804 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-208/journal/page | none observed |
| 8bafba02fb063e850000000000002586 | 203.396 | 0.000 | n/a | 0.000 | 0.000 | 1.249 | 201.778 | 0.026 | n/a | 0.122 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-227/journal/page | none observed |
| 8bafba02fb063e850000000000001811 | 203.242 | 0.000 | n/a | 0.000 | 0.000 | 2.521 | 200.586 | 0.003 | n/a | 0.046 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-200/journal/page | none observed |
| 8bafba02fb063e850000000000002650 | 203.080 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.820 | 0.021 | n/a | 0.190 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-190/journal/page | none observed |
| 8bafba02fb063e850000000000002596 | 203.047 | 0.000 | n/a | 0.000 | 0.000 | 1.571 | 201.275 | 0.030 | n/a | 0.087 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-116/journal/page | none observed |
| 8bafba02fb063e850000000000002643 | 202.996 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.785 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-205/journal/page | none observed |
| 8bafba02fb063e850000000000000006 | 202.871 | 0.000 | n/a | 0.000 | 0.000 | 1.336 | 201.135 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e850000000000001960 | 202.851 | 0.000 | n/a | 0.000 | 0.000 | 2.086 | 200.615 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-185/journal/page | none observed |

## P3 / outside-phases / internal (2737 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.767 | n/a | n/a | n/a | 6.062 | n/a | 0.000 | 0.000 | 0.297 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.522 | 6.105 | 0.455 | 5.522 |
| p99 | 1002.141 | n/a | n/a | n/a | 46.775 | n/a | 4.974 | 0.000 | 3.277 | 996.938 | 0.057 | n/a | 0.064 | 0.000 | n/a | n/a | 47.534 | 50.359 | 0.883 | 47.534 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d00000000000000a4 | 17321.785 | 0.207 | n/a | 0.000 | 0.000 | 16317.865 | 1001.758 | 0.042 | n/a | 0.588 | 0.000 | n/a | n/a | 1.326 | 0.207 | 0.000 | 1.326 | node-14/thread-2/socket.wait-first-byte | none observed |
| 4bf168af06aa7e1d00000000000000a5 | 5989.956 | 0.150 | n/a | 0.000 | 0.000 | 4983.915 | 1005.447 | 0.081 | n/a | 0.175 | 0.000 | n/a | n/a | 0.188 | 0.150 | 0.000 | 0.188 | node-14/thread-2/socket.wait-first-byte | none observed |
| 4bf168af06aa7e1d0000000000003710 | 1008.238 | 9.244 | n/a | 0.000 | 0.000 | 0.580 | 998.087 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.221 | 9.244 | 0.009 | 0.221 | gw-r/thread-270/journal/page | none observed |
| 4bf168af06aa7e1d000000000000372e | 1007.573 | 5.566 | n/a | 0.000 | 0.000 | 0.373 | 1001.272 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.292 | 5.566 | 0.006 | 0.292 | gw-r/thread-96/journal/page | none observed |
| 4bf168af06aa7e1d0000000000003743 | 1006.796 | 14.879 | n/a | 0.000 | 0.000 | 0.826 | 990.346 | 0.026 | n/a | 0.077 | 0.000 | n/a | n/a | 0.642 | 14.879 | 0.015 | 0.642 | gw-r/thread-150/journal/page | none observed |
| 4bf168af06aa7e1d000000000000370b | 1006.219 | 6.775 | n/a | 0.000 | 0.000 | 0.871 | 998.406 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.123 | 6.775 | 0.007 | 0.123 | gw-r/thread-106/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ffc | 1005.717 | 7.783 | n/a | 0.000 | 0.000 | 0.711 | 996.938 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.240 | 7.783 | 0.008 | 0.240 | gw-r/thread-195/journal/page | none observed |
| 4bf168af06aa7e1d0000000000003713 | 1005.468 | 4.179 | n/a | 0.000 | 0.000 | 0.772 | 1000.334 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.143 | 4.179 | 0.004 | 0.143 | gw-r/thread-133/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000a6 | 1005.441 | 0.257 | n/a | 0.000 | 0.000 | 2.095 | 1001.680 | 0.011 | n/a | 0.190 | 0.000 | n/a | n/a | 1.208 | 0.257 | 0.000 | 1.208 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ffb | 1005.289 | 5.664 | n/a | 0.000 | 0.000 | 0.602 | 998.885 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.104 | 5.664 | 0.006 | 0.104 | gw-r/thread-277/journal/page | none observed |
| 4bf168af06aa7e1d0000000000003736 | 1005.062 | 0.185 | n/a | 0.000 | 0.000 | 0.767 | 1001.084 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 2.954 | 0.185 | 0.000 | 2.954 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d000000000000370c | 1004.239 | 0.390 | n/a | 0.000 | 0.000 | 1.811 | 1000.818 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 1.172 | 0.390 | 0.000 | 1.172 | gw-r/thread-129/journal/page | none observed |
| 4bf168af06aa7e1d0000000000002037 | 1003.940 | 3.207 | n/a | 0.000 | 0.000 | 0.353 | 1000.252 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.083 | 3.207 | 0.003 | 0.083 | gw-r/thread-152/journal/page | none observed |
| 4bf168af06aa7e1d0000000000003748 | 1003.744 | 0.114 | n/a | 0.000 | 0.000 | 0.771 | 1001.680 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 1.102 | 0.114 | 0.000 | 1.102 | gw-r/thread-85/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ff0 | 1003.607 | 3.289 | n/a | 0.000 | 0.000 | 1.799 | 998.399 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.074 | 3.289 | 0.003 | 0.074 | gw-r/thread-152/journal/page | none observed |
| 4bf168af06aa7e1d0000000000002024 | 1003.427 | 0.174 | n/a | 0.000 | 0.000 | 1.096 | 1000.971 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 1.129 | 0.174 | 0.000 | 1.129 | gw-r/thread-170/journal/page | none observed |
| 4bf168af06aa7e1d000000000000201f | 1003.389 | 0.143 | n/a | 0.000 | 0.000 | 0.814 | 1001.265 | 0.004 | n/a | 0.063 | 0.000 | n/a | n/a | 1.100 | 0.143 | 0.000 | 1.100 | gw-r/thread-198/journal/page | none observed |
| 4bf168af06aa7e1d00000000000036de | 1003.295 | 3.759 | n/a | 0.000 | 0.000 | 0.666 | 998.709 | 0.013 | n/a | 0.025 | 0.000 | n/a | n/a | 0.123 | 3.759 | 0.004 | 0.123 | gw-r/thread-136/journal/page | none observed |
| 4bf168af06aa7e1d0000000000003708 | 1003.069 | 0.125 | n/a | 0.000 | 0.000 | 0.550 | 1001.182 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 1.115 | 0.125 | 0.000 | 1.115 | gw-r/thread-253/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000a7 | 1003.015 | 0.155 | n/a | 0.000 | 0.000 | 0.718 | 1000.876 | 0.030 | n/a | 0.134 | 0.000 | n/a | n/a | 1.102 | 0.155 | 0.000 | 1.102 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 414.451 | n/a | n/a | n/a | 6.403 | n/a | 1.322 | 0.000 | 2.640 | 388.105 | 0.017 | n/a | 0.109 | 0.000 | n/a | n/a | 0.146 | 7.626 | 0.018 | 0.146 |
| p99 | 1009.900 | n/a | n/a | n/a | 36.854 | n/a | 29.616 | 0.000 | 36.640 | 1001.041 | 0.120 | n/a | 1.824 | 0.000 | n/a | n/a | 30.703 | 66.470 | 0.456 | 30.703 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d00000000000000be | 1009.900 | 10.039 | n/a | 1.663 | 0.000 | 2.640 | 995.271 | 0.017 | n/a | 0.103 | 0.000 | n/a | n/a | 0.168 | 11.701 | 0.012 | 0.168 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000d2 | 1003.815 | 0.325 | n/a | 0.000 | 0.000 | 1.178 | 1001.041 | 0.023 | n/a | 0.096 | 0.000 | n/a | n/a | 1.153 | 0.325 | 0.000 | 1.153 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000bd | 967.466 | 5.581 | n/a | 1.691 | 0.000 | 0.797 | 959.220 | 0.014 | n/a | 0.049 | 0.000 | n/a | n/a | 0.115 | 7.272 | 0.008 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000b7 | 960.026 | 6.293 | n/a | 0.747 | 0.000 | 3.266 | 949.239 | 0.020 | n/a | 0.195 | 0.000 | n/a | n/a | 0.266 | 7.040 | 0.007 | 0.266 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000b1 | 952.308 | 3.030 | n/a | 2.391 | 0.000 | 1.319 | 945.321 | 0.017 | n/a | 0.130 | 0.000 | n/a | n/a | 0.100 | 5.421 | 0.006 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000b6 | 770.929 | 26.581 | n/a | 1.274 | 0.000 | 18.205 | 724.519 | 0.055 | n/a | 0.098 | 0.000 | n/a | n/a | 0.196 | 27.855 | 0.036 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000ae | 759.416 | 11.711 | n/a | 0.712 | 0.000 | 4.162 | 742.341 | 0.020 | n/a | 0.122 | 0.000 | n/a | n/a | 0.348 | 12.423 | 0.016 | 0.348 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000c4 | 740.602 | 22.394 | n/a | 4.119 | 0.000 | 15.833 | 697.931 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 0.226 | 26.513 | 0.036 | 0.226 | gw-r/thread-41/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000ab | 737.659 | 3.922 | n/a | 1.322 | 0.000 | 3.912 | 728.093 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.308 | 5.243 | 0.007 | 0.308 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000cb | 665.615 | 10.637 | n/a | 1.085 | 0.000 | 0.679 | 652.981 | 0.015 | n/a | 0.082 | 0.000 | n/a | n/a | 0.135 | 11.722 | 0.018 | 0.135 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000c3 | 642.054 | 6.403 | n/a | 3.003 | 0.000 | 4.344 | 628.055 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.131 | 9.406 | 0.015 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000c8 | 628.419 | 3.461 | n/a | 0.796 | 0.000 | 5.076 | 618.863 | 0.014 | n/a | 0.091 | 0.000 | n/a | n/a | 0.118 | 4.258 | 0.007 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000cd | 602.291 | 4.656 | n/a | 0.000 | 0.000 | 0.798 | 596.566 | 0.035 | n/a | 0.097 | 0.000 | n/a | n/a | 0.139 | 4.656 | 0.008 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000b9 | 428.447 | 3.993 | n/a | 0.585 | 0.000 | 4.660 | 418.969 | 0.023 | n/a | 0.112 | 0.000 | n/a | n/a | 0.105 | 4.578 | 0.011 | 0.105 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000aa | 414.451 | 16.579 | n/a | 2.011 | 0.000 | 7.409 | 388.105 | 0.015 | n/a | 0.172 | 0.000 | n/a | n/a | 0.159 | 18.591 | 0.045 | 0.159 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000bb | 397.412 | 10.146 | n/a | 2.574 | 0.000 | 4.486 | 379.938 | 0.028 | n/a | 0.141 | 0.000 | n/a | n/a | 0.099 | 12.720 | 0.032 | 0.099 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000c7 | 365.552 | 2.833 | n/a | 0.000 | 0.000 | 4.307 | 358.085 | 0.028 | n/a | 0.205 | 0.000 | n/a | n/a | 0.094 | 2.833 | 0.008 | 0.094 | gw-r/thread-66/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000ca | 334.293 | 4.592 | n/a | 0.000 | 0.000 | 0.825 | 326.916 | 0.049 | n/a | 1.824 | 0.000 | n/a | n/a | 0.087 | 4.592 | 0.014 | 0.087 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000b4 | 290.152 | 6.919 | n/a | 1.438 | 0.000 | 0.603 | 280.798 | 0.120 | n/a | 0.128 | 0.000 | n/a | n/a | 0.146 | 8.357 | 0.029 | 0.146 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000ac | 264.065 | 9.704 | n/a | 1.857 | 0.000 | 36.640 | 215.303 | 0.029 | n/a | 0.116 | 0.000 | n/a | n/a | 0.415 | 11.561 | 0.044 | 0.415 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 370.962 | n/a | n/a | n/a | 3.701 | n/a | 0.000 | 0.000 | 0.717 | 363.666 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.148 | 4.043 | 0.012 | 0.148 |
| p99 | 1007.502 | n/a | n/a | n/a | 27.256 | n/a | 3.023 | 0.000 | 5.344 | 1004.122 | 0.340 | n/a | 0.212 | 0.000 | n/a | n/a | 48.250 | 28.573 | 0.660 | 48.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d00000000000000e1 | 1007.502 | 0.177 | n/a | 0.000 | 0.000 | 1.927 | 1004.122 | 0.034 | n/a | 0.108 | 0.000 | n/a | n/a | 1.134 | 0.177 | 0.000 | 1.134 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000d5 | 1006.457 | 3.389 | n/a | 0.654 | 0.000 | 0.451 | 1001.762 | 0.020 | n/a | 0.070 | 0.000 | n/a | n/a | 0.112 | 4.043 | 0.004 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d000000000000010a | 1005.415 | 0.138 | n/a | 0.000 | 0.000 | 0.625 | 1003.291 | 0.154 | n/a | 0.091 | 0.000 | n/a | n/a | 1.116 | 0.138 | 0.000 | 1.116 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000db | 1003.855 | 0.248 | n/a | 0.000 | 0.000 | 0.796 | 1001.448 | 0.054 | n/a | 0.144 | 0.000 | n/a | n/a | 1.165 | 0.248 | 0.000 | 1.165 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000105 | 1003.675 | 0.180 | n/a | 0.000 | 0.000 | 1.083 | 1001.029 | 0.019 | n/a | 0.212 | 0.000 | n/a | n/a | 1.153 | 0.180 | 0.000 | 1.153 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000123 | 1003.211 | 0.201 | n/a | 0.000 | 0.000 | 0.962 | 1000.812 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 1.161 | 0.201 | 0.000 | 1.161 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d000000000000013f | 1002.881 | 0.143 | n/a | 0.000 | 0.000 | 0.648 | 1000.913 | 0.015 | n/a | 0.061 | 0.000 | n/a | n/a | 1.102 | 0.143 | 0.000 | 1.102 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000113 | 1002.836 | 0.127 | n/a | 0.000 | 0.000 | 0.607 | 1000.900 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 1.118 | 0.127 | 0.000 | 1.118 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000131 | 1002.821 | 0.149 | n/a | 0.000 | 0.000 | 0.664 | 1000.809 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 1.106 | 0.149 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d000000000000011b | 1001.089 | 3.871 | n/a | 0.000 | 0.000 | 3.376 | 993.671 | 0.012 | n/a | 0.039 | 0.000 | n/a | n/a | 0.120 | 3.871 | 0.004 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d000000000000015c | 984.220 | 2.907 | n/a | 0.000 | 0.000 | 1.865 | 979.264 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.129 | 2.907 | 0.003 | 0.129 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000dd | 977.616 | 4.998 | n/a | 0.592 | 0.000 | 0.575 | 971.209 | 0.016 | n/a | 0.084 | 0.000 | n/a | n/a | 0.143 | 5.589 | 0.006 | 0.143 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000149 | 976.530 | 5.023 | n/a | 0.000 | 0.000 | 0.481 | 970.862 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.114 | 5.023 | 0.005 | 0.114 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d000000000000012d | 968.243 | 4.678 | n/a | 0.000 | 0.000 | 1.349 | 962.026 | 0.058 | n/a | 0.041 | 0.000 | n/a | n/a | 0.090 | 4.678 | 0.005 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000133 | 964.251 | 3.459 | n/a | 0.000 | 0.000 | 0.681 | 959.960 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.084 | 3.459 | 0.004 | 0.084 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000e3 | 949.472 | 3.358 | n/a | 0.000 | 0.000 | 0.814 | 945.059 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.156 | 3.358 | 0.004 | 0.156 | gw-r/thread-66/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000102 | 924.903 | 6.780 | n/a | 0.000 | 0.000 | 2.397 | 915.537 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.146 | 6.780 | 0.007 | 0.146 | gw-r/thread-41/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000d4 | 893.740 | 3.066 | n/a | 0.000 | 0.000 | 2.640 | 887.857 | 0.015 | n/a | 0.085 | 0.000 | n/a | n/a | 0.076 | 3.066 | 0.003 | 0.076 | gw-r/thread-41/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000162 | 870.784 | 4.520 | n/a | 0.000 | 0.000 | 0.596 | 865.556 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.086 | 4.520 | 0.005 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d00000000000000e8 | 867.672 | 3.182 | n/a | 0.000 | 0.000 | 0.510 | 863.742 | 0.018 | n/a | 0.107 | 0.000 | n/a | n/a | 0.112 | 3.182 | 0.004 | 0.112 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 355.479 | n/a | n/a | n/a | 3.207 | n/a | 0.000 | 0.000 | 0.678 | 348.283 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.096 | 3.207 | 0.010 | 0.096 |
| p99 | 1003.873 | n/a | n/a | n/a | 10.384 | n/a | 0.821 | 0.000 | 4.098 | 1001.953 | 0.016 | n/a | 0.111 | 0.000 | n/a | n/a | 48.693 | 10.902 | 0.489 | 48.693 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d000000000000018d | 1009.373 | 0.117 | n/a | 0.000 | 0.000 | 0.619 | 1007.481 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 1.098 | 0.117 | 0.000 | 1.098 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000176 | 1003.873 | 0.143 | n/a | 0.000 | 0.000 | 0.556 | 1001.953 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 1.150 | 0.143 | 0.000 | 1.150 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d000000000000016c | 1003.626 | 0.203 | n/a | 0.000 | 0.000 | 0.964 | 1001.175 | 0.011 | n/a | 0.127 | 0.000 | n/a | n/a | 1.146 | 0.203 | 0.000 | 1.146 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001cb | 1003.468 | 0.285 | n/a | 0.000 | 0.000 | 0.935 | 1001.015 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 1.148 | 0.285 | 0.000 | 1.148 | gw-r/thread-41/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001cd | 1002.736 | 0.111 | n/a | 0.000 | 0.000 | 0.364 | 1001.050 | 0.015 | n/a | 0.087 | 0.000 | n/a | n/a | 1.111 | 0.111 | 0.000 | 1.111 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001af | 1002.525 | 2.539 | n/a | 0.000 | 0.000 | 0.938 | 998.899 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.076 | 2.539 | 0.003 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000193 | 1000.184 | 2.987 | n/a | 0.000 | 0.000 | 1.193 | 995.890 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.075 | 2.987 | 0.003 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d000000000000018f | 1000.104 | 3.374 | n/a | 0.000 | 0.000 | 0.591 | 996.010 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.072 | 3.374 | 0.003 | 0.072 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001ae | 999.234 | 2.299 | n/a | 0.000 | 0.000 | 0.380 | 996.430 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.088 | 2.299 | 0.002 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001f3 | 997.094 | 2.433 | n/a | 0.000 | 0.000 | 0.854 | 993.688 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.068 | 2.433 | 0.002 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d000000000000017d | 995.914 | 7.409 | n/a | 0.000 | 0.000 | 0.642 | 987.746 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 7.409 | 0.007 | 0.077 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000187 | 989.365 | 2.929 | n/a | 0.000 | 0.000 | 0.650 | 985.681 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.069 | 2.929 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001ac | 977.317 | 5.156 | n/a | 0.000 | 0.000 | 1.230 | 970.774 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.116 | 5.156 | 0.005 | 0.116 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001a2 | 973.820 | 1.729 | n/a | 0.000 | 0.000 | 1.781 | 970.188 | 0.011 | n/a | 0.048 | 0.000 | n/a | n/a | 0.063 | 1.729 | 0.002 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000200 | 908.582 | 4.414 | n/a | 0.000 | 0.000 | 0.643 | 903.402 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.094 | 4.414 | 0.005 | 0.094 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001c9 | 850.439 | 4.210 | n/a | 0.000 | 0.000 | 0.935 | 845.063 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.179 | 4.210 | 0.005 | 0.179 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000183 | 825.850 | 2.834 | n/a | 0.000 | 0.000 | 0.674 | 822.203 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.072 | 2.834 | 0.003 | 0.072 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001a5 | 814.314 | 4.204 | n/a | 0.000 | 0.000 | 0.595 | 809.394 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.083 | 4.204 | 0.005 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001fd | 765.230 | 2.375 | n/a | 0.000 | 0.000 | 1.031 | 761.692 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.091 | 2.375 | 0.003 | 0.091 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d00000000000001bd | 730.535 | 3.094 | n/a | 0.000 | 0.000 | 2.377 | 724.896 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.108 | 3.094 | 0.004 | 0.108 | gw-r/thread-62/journal/page | none observed |

## P3 / L4 / internal (1394 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.545 | n/a | n/a | n/a | 3.941 | n/a | 0.000 | 0.000 | 0.278 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.185 | 3.948 | 0.305 | 7.185 |
| p99 | 632.610 | n/a | n/a | n/a | 39.870 | n/a | 2.534 | 0.000 | 3.372 | 627.916 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 48.210 | 41.711 | 0.853 | 48.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d000000000000021a | 1005.627 | 4.688 | n/a | 0.000 | 0.000 | 0.586 | 1000.161 | 0.005 | n/a | 0.094 | 0.000 | n/a | n/a | 0.092 | 4.688 | 0.005 | 0.092 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000207 | 1002.063 | 3.965 | n/a | 0.000 | 0.000 | 0.679 | 997.219 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.151 | 3.965 | 0.004 | 0.151 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d000000000000021b | 1002.022 | 28.564 | n/a | 3.531 | 0.000 | 0.692 | 968.905 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.278 | 32.095 | 0.032 | 0.278 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d000000000000021f | 998.030 | 7.116 | n/a | 0.000 | 0.000 | 0.775 | 989.892 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.198 | 7.116 | 0.007 | 0.198 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000220 | 994.897 | 3.380 | n/a | 0.000 | 0.000 | 1.988 | 989.277 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.184 | 3.380 | 0.003 | 0.184 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d000000000000022c | 993.653 | 2.725 | n/a | 0.000 | 0.000 | 0.814 | 989.925 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.139 | 2.725 | 0.003 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d000000000000021e | 980.381 | 4.123 | n/a | 0.000 | 0.000 | 0.734 | 975.363 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.097 | 4.123 | 0.004 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000210 | 811.951 | 3.469 | n/a | 0.000 | 0.000 | 0.972 | 807.372 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.088 | 3.469 | 0.004 | 0.088 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000221 | 789.679 | 1.952 | n/a | 0.000 | 0.000 | 0.707 | 786.873 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.101 | 1.952 | 0.002 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d000000000000022d | 781.858 | 2.348 | n/a | 0.000 | 0.000 | 0.771 | 778.633 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.074 | 2.348 | 0.003 | 0.074 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000208 | 717.179 | 3.934 | n/a | 0.000 | 0.000 | 1.249 | 711.825 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.120 | 3.934 | 0.005 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000229 | 673.072 | 4.550 | n/a | 0.000 | 0.000 | 0.749 | 667.579 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.098 | 4.550 | 0.007 | 0.098 | gw-r/thread-62/journal/page | none observed |
| 4bf168af06aa7e1d000000000000020b | 644.378 | 5.432 | n/a | 0.000 | 0.000 | 0.707 | 637.984 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.177 | 5.432 | 0.008 | 0.177 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000224 | 632.610 | 3.191 | n/a | 0.000 | 0.000 | 1.206 | 627.916 | 0.005 | n/a | 0.222 | 0.000 | n/a | n/a | 0.070 | 3.191 | 0.005 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000218 | 562.272 | 2.640 | n/a | 0.000 | 0.000 | 2.026 | 557.449 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.105 | 2.640 | 0.005 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d000000000000020c | 500.639 | 2.328 | n/a | 0.000 | 0.000 | 5.713 | 492.450 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.076 | 2.328 | 0.005 | 0.076 | gw-r/thread-41/journal/page | none observed |
| 4bf168af06aa7e1d000000000000022a | 329.001 | 5.443 | n/a | 0.000 | 0.000 | 2.931 | 320.466 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.094 | 5.443 | 0.017 | 0.094 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000209 | 296.595 | 6.956 | n/a | 0.000 | 0.000 | 0.674 | 288.750 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.153 | 6.956 | 0.023 | 0.153 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000225 | 249.113 | 3.153 | n/a | 0.000 | 0.000 | 1.829 | 244.031 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.067 | 3.153 | 0.013 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 4bf168af06aa7e1d0000000000000217 | 242.105 | 2.388 | n/a | 0.000 | 0.000 | 0.394 | 239.180 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 2.388 | 0.010 | 0.095 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (1331 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.376 | n/a | n/a | n/a | 5.427 | n/a | 0.000 | 0.000 | 0.305 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.563 | 5.492 | 0.425 | 6.563 |
| p99 | 435.544 | n/a | n/a | n/a | 46.763 | n/a | 5.921 | 0.000 | 3.796 | 421.098 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 46.836 | 50.610 | 0.891 | 46.836 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d000000000000195a | 1010.862 | 10.446 | n/a | 0.000 | 0.000 | 0.843 | 999.405 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.079 | 10.446 | 0.010 | 0.079 | gw-r/thread-83/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001950 | 1008.790 | 5.603 | n/a | 0.000 | 0.000 | 2.636 | 1000.353 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.171 | 5.603 | 0.006 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001973 | 1003.714 | 4.094 | n/a | 0.000 | 0.000 | 0.721 | 998.704 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.151 | 4.094 | 0.004 | 0.151 | gw-r/thread-76/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001951 | 1000.958 | 5.394 | n/a | 0.000 | 0.000 | 0.403 | 994.945 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.172 | 5.394 | 0.005 | 0.172 | gw-r/thread-83/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001975 | 921.874 | 2.838 | n/a | 0.000 | 0.000 | 0.593 | 918.251 | 0.013 | n/a | 0.052 | 0.000 | n/a | n/a | 0.128 | 2.838 | 0.003 | 0.128 | gw-r/thread-67/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001955 | 817.617 | 4.063 | n/a | 0.000 | 0.000 | 0.491 | 812.883 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.137 | 4.063 | 0.005 | 0.137 | gw-r/thread-86/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001964 | 809.579 | 18.042 | n/a | 0.000 | 0.000 | 1.858 | 789.068 | 0.014 | n/a | 0.102 | 0.000 | n/a | n/a | 0.496 | 18.042 | 0.022 | 0.496 | gw-r/thread-85/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001952 | 748.128 | 8.740 | n/a | 0.000 | 0.000 | 0.760 | 738.191 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.400 | 8.740 | 0.012 | 0.400 | gw-r/thread-47/journal/page | none observed |
| 4bf168af06aa7e1d000000000000196f | 737.326 | 4.145 | n/a | 0.000 | 0.000 | 0.937 | 732.005 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.189 | 4.145 | 0.006 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d000000000000196a | 690.563 | 6.320 | n/a | 0.000 | 0.000 | 1.492 | 682.518 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.186 | 6.320 | 0.009 | 0.186 | gw-r/thread-86/journal/page | none observed |
| 4bf168af06aa7e1d000000000000198d | 633.143 | 5.801 | n/a | 0.000 | 0.000 | 3.327 | 623.872 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.104 | 5.801 | 0.009 | 0.104 | gw-r/thread-73/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001983 | 557.868 | 7.460 | n/a | 0.000 | 0.000 | 1.613 | 548.670 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 7.460 | 0.013 | 0.079 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d000000000000195b | 475.177 | 2.139 | n/a | 0.000 | 0.000 | 0.534 | 472.346 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.099 | 2.139 | 0.005 | 0.099 | gw-r/thread-80/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001977 | 435.544 | 12.234 | n/a | 0.000 | 0.000 | 1.849 | 421.098 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.331 | 12.234 | 0.028 | 0.331 | gw-r/thread-82/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001985 | 367.445 | 2.467 | n/a | 0.000 | 0.000 | 0.502 | 364.332 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.095 | 2.467 | 0.007 | 0.095 | gw-r/thread-77/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001986 | 345.654 | 3.242 | n/a | 0.000 | 0.000 | 2.463 | 339.752 | 0.014 | n/a | 0.071 | 0.000 | n/a | n/a | 0.112 | 3.242 | 0.009 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001989 | 314.175 | 8.819 | n/a | 0.000 | 0.000 | 0.751 | 304.446 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.130 | 8.819 | 0.028 | 0.130 | gw-r/thread-83/journal/page | none observed |
| 4bf168af06aa7e1d000000000000198a | 307.451 | 3.127 | n/a | 0.000 | 0.000 | 0.505 | 303.683 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.089 | 3.127 | 0.010 | 0.089 | gw-r/thread-41/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001981 | 301.813 | 5.820 | n/a | 0.000 | 0.000 | 0.433 | 295.369 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.159 | 5.820 | 0.019 | 0.159 | gw-r/thread-79/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001978 | 286.844 | 2.556 | n/a | 0.000 | 0.000 | 2.976 | 281.182 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.097 | 2.556 | 0.009 | 0.097 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 433.396 | n/a | n/a | n/a | 4.879 | n/a | 0.000 | 0.000 | 0.788 | 422.344 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.153 | 4.879 | 0.016 | 0.153 |
| p99 | 1013.061 | n/a | n/a | n/a | 44.187 | n/a | 7.945 | 0.000 | 26.538 | 1000.908 | 0.236 | n/a | 0.088 | 0.000 | n/a | n/a | 33.887 | 51.417 | 0.820 | 33.887 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001a15 | 1013.061 | 5.779 | n/a | 0.000 | 0.000 | 6.161 | 1000.900 | 0.013 | n/a | 0.074 | 0.000 | n/a | n/a | 0.133 | 5.779 | 0.006 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019fc | 1008.115 | 0.103 | n/a | 0.000 | 0.000 | 1.453 | 1000.658 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 5.852 | 0.103 | 0.000 | 5.852 | gw-r/thread-122/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019f0 | 1003.298 | 0.225 | n/a | 0.000 | 0.000 | 0.990 | 1000.884 | 0.007 | n/a | 0.088 | 0.000 | n/a | n/a | 1.105 | 0.225 | 0.000 | 1.105 | gw-r/thread-78/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019e1 | 1002.712 | 0.113 | n/a | 0.000 | 0.000 | 0.544 | 1000.908 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 1.095 | 0.113 | 0.000 | 1.095 | gw-r/thread-112/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019e7 | 1002.696 | 0.130 | n/a | 0.000 | 0.000 | 0.469 | 1000.899 | 0.018 | n/a | 0.083 | 0.000 | n/a | n/a | 1.098 | 0.130 | 0.000 | 1.098 | gw-r/thread-129/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019d4 | 1002.334 | 4.151 | n/a | 0.000 | 0.000 | 2.158 | 995.751 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.178 | 4.151 | 0.004 | 0.178 | gw-r/thread-73/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019d8 | 996.253 | 3.227 | n/a | 0.000 | 0.000 | 1.706 | 991.007 | 0.012 | n/a | 0.035 | 0.000 | n/a | n/a | 0.265 | 3.227 | 0.003 | 0.265 | gw-r/thread-74/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a16 | 995.498 | 9.162 | n/a | 0.000 | 0.000 | 0.890 | 984.461 | 0.009 | n/a | 0.032 | 0.000 | n/a | n/a | 0.943 | 9.162 | 0.009 | 0.943 | gw-r/thread-79/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001994 | 995.473 | 4.525 | n/a | 0.000 | 0.000 | 0.737 | 990.081 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.093 | 4.525 | 0.005 | 0.093 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019e3 | 990.372 | 11.371 | n/a | 0.000 | 0.000 | 1.366 | 977.432 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.162 | 11.371 | 0.011 | 0.162 | gw-r/thread-87/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019a7 | 987.710 | 8.540 | n/a | 0.000 | 0.000 | 0.758 | 978.236 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.143 | 8.540 | 0.009 | 0.143 | gw-r/thread-128/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019e9 | 985.835 | 2.844 | n/a | 0.000 | 0.000 | 0.604 | 982.280 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.844 | 0.003 | 0.061 | gw-r/thread-88/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001998 | 983.195 | 5.054 | n/a | 0.000 | 0.000 | 0.562 | 977.216 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.316 | 5.054 | 0.005 | 0.316 | gw-r/thread-86/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019d6 | 927.147 | 8.038 | n/a | 0.000 | 0.000 | 1.057 | 917.943 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.076 | 8.038 | 0.009 | 0.076 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019ba | 923.102 | 3.172 | n/a | 0.000 | 0.000 | 0.445 | 919.362 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.083 | 3.172 | 0.003 | 0.083 | gw-r/thread-76/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a04 | 903.068 | 8.749 | n/a | 0.000 | 0.000 | 2.695 | 891.302 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.279 | 8.749 | 0.010 | 0.279 | gw-r/thread-74/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a12 | 861.669 | 4.561 | n/a | 0.000 | 0.000 | 0.624 | 856.305 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.135 | 4.561 | 0.005 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a17 | 854.460 | 20.728 | n/a | 0.000 | 0.000 | 3.723 | 829.596 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.369 | 20.728 | 0.024 | 0.369 | gw-r/thread-80/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019ac | 854.136 | 3.341 | n/a | 0.000 | 0.000 | 1.385 | 849.215 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.145 | 3.341 | 0.004 | 0.145 | gw-r/thread-110/journal/page | none observed |
| 4bf168af06aa7e1d00000000000019eb | 839.165 | 6.261 | n/a | 0.000 | 0.000 | 1.844 | 830.909 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.114 | 6.261 | 0.007 | 0.114 | gw-r/thread-80/journal/page | none observed |

## P3 / L256 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 374.763 | n/a | n/a | n/a | 5.256 | n/a | 0.000 | 0.000 | 0.777 | 366.474 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.158 | 5.256 | 0.014 | 0.158 |
| p99 | 1012.165 | n/a | n/a | n/a | 23.344 | n/a | 6.082 | 0.000 | 6.723 | 1001.594 | 0.117 | n/a | 0.139 | 0.000 | n/a | n/a | 49.233 | 24.323 | 0.876 | 49.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001ab8 | 1012.165 | 14.581 | n/a | 5.926 | 0.000 | 5.309 | 986.129 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.174 | 20.507 | 0.020 | 0.174 | gw-r/thread-106/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a7f | 1006.256 | 3.952 | n/a | 0.000 | 0.000 | 0.500 | 1000.659 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.102 | 3.952 | 0.004 | 1.102 | gw-r/thread-76/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001aab | 1004.439 | 0.148 | n/a | 0.000 | 0.000 | 2.578 | 1000.563 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.106 | 0.148 | 0.000 | 1.106 | gw-r/thread-65/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a85 | 1004.288 | 0.437 | n/a | 0.000 | 0.000 | 0.907 | 1001.594 | 0.011 | n/a | 0.139 | 0.000 | n/a | n/a | 1.200 | 0.437 | 0.000 | 1.200 | gw-r/thread-102/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a77 | 1003.714 | 5.256 | n/a | 0.000 | 0.000 | 1.826 | 996.492 | 0.003 | n/a | 0.029 | 0.000 | n/a | n/a | 0.108 | 5.256 | 0.005 | 0.108 | gw-r/thread-121/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a70 | 1002.826 | 8.521 | n/a | 0.000 | 0.000 | 0.438 | 993.723 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.095 | 8.521 | 0.008 | 0.095 | gw-r/thread-93/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001aa4 | 1002.806 | 0.131 | n/a | 0.000 | 0.000 | 0.971 | 1000.564 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.093 | 0.131 | 0.000 | 1.093 | gw-r/thread-95/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a53 | 1002.382 | 0.106 | n/a | 0.000 | 0.000 | 0.488 | 1000.644 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.105 | 0.106 | 0.000 | 1.105 | gw-r/thread-82/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ab7 | 1001.019 | 2.446 | n/a | 0.000 | 0.000 | 0.655 | 997.792 | 0.011 | n/a | 0.030 | 0.000 | n/a | n/a | 0.086 | 2.446 | 0.002 | 0.086 | gw-r/thread-98/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a78 | 1000.021 | 4.219 | n/a | 0.000 | 0.000 | 0.758 | 994.925 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.083 | 4.219 | 0.004 | 0.083 | gw-r/thread-110/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a7e | 986.715 | 2.861 | n/a | 0.000 | 0.000 | 1.515 | 982.228 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.078 | 2.861 | 0.003 | 0.078 | gw-r/thread-90/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a89 | 981.870 | 7.926 | n/a | 0.000 | 0.000 | 0.829 | 972.826 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.247 | 7.926 | 0.008 | 0.247 | gw-r/thread-85/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a9a | 981.520 | 5.447 | n/a | 0.000 | 0.000 | 0.463 | 975.003 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.573 | 5.447 | 0.006 | 0.573 | gw-r/thread-96/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a9c | 953.354 | 7.008 | n/a | 0.000 | 0.000 | 2.153 | 943.993 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.167 | 7.008 | 0.007 | 0.167 | gw-r/thread-104/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a56 | 950.716 | 3.236 | n/a | 0.000 | 0.000 | 0.416 | 946.832 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.192 | 3.236 | 0.003 | 0.192 | gw-r/thread-105/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a88 | 940.169 | 10.031 | n/a | 0.000 | 0.000 | 1.034 | 928.851 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.214 | 10.031 | 0.011 | 0.214 | gw-r/thread-113/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a42 | 925.868 | 8.310 | n/a | 0.000 | 0.000 | 0.896 | 916.438 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.179 | 8.310 | 0.009 | 0.179 | gw-r/thread-115/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a81 | 923.884 | 3.900 | n/a | 0.000 | 0.000 | 0.629 | 919.139 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.154 | 3.900 | 0.004 | 0.154 | gw-r/thread-126/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a8f | 921.953 | 7.583 | n/a | 0.000 | 0.000 | 1.160 | 913.045 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.111 | 7.583 | 0.008 | 0.111 | gw-r/thread-129/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001a9e | 888.180 | 3.602 | n/a | 0.000 | 0.000 | 0.560 | 883.864 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.110 | 3.602 | 0.004 | 0.110 | gw-r/thread-106/journal/page | none observed |

## P3 / L1024 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 385.733 | n/a | n/a | n/a | 6.193 | n/a | 0.000 | 0.000 | 1.159 | 381.547 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.170 | 6.263 | 0.020 | 0.170 |
| p99 | 1038.366 | n/a | n/a | n/a | 66.720 | n/a | 56.279 | 0.000 | 217.355 | 1001.874 | 0.099 | n/a | 0.238 | 0.000 | n/a | n/a | 48.670 | 119.686 | 0.709 | 48.670 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001ad2 | 1038.366 | 52.364 | n/a | 0.000 | 0.000 | 3.402 | 982.381 | 0.002 | n/a | 0.031 | 0.000 | n/a | n/a | 0.185 | 52.364 | 0.050 | 0.185 | gw-r/thread-163/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ae9 | 1006.493 | 10.851 | n/a | 0.000 | 0.000 | 0.435 | 995.005 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.165 | 10.851 | 0.011 | 0.165 | gw-r/thread-110/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b43 | 1004.706 | 0.209 | n/a | 0.000 | 0.000 | 1.625 | 1001.043 | 0.013 | n/a | 0.238 | 0.000 | n/a | n/a | 1.578 | 0.209 | 0.000 | 1.578 | gw-r/thread-91/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001abc | 1004.102 | 0.153 | n/a | 0.000 | 0.000 | 0.887 | 1001.874 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 1.121 | 0.153 | 0.000 | 1.121 | gw-r/thread-123/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b09 | 1003.260 | 2.610 | n/a | 0.000 | 0.000 | 2.115 | 998.413 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.084 | 2.610 | 0.003 | 0.084 | gw-r/thread-177/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001aef | 1003.201 | 5.292 | n/a | 0.000 | 0.000 | 0.414 | 997.356 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.105 | 5.292 | 0.005 | 0.105 | gw-r/thread-283/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b1e | 1002.929 | 0.132 | n/a | 0.000 | 0.000 | 0.665 | 1000.886 | 0.012 | n/a | 0.061 | 0.000 | n/a | n/a | 1.172 | 0.132 | 0.000 | 1.172 | gw-r/thread-225/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001add | 1002.928 | 0.120 | n/a | 0.000 | 0.000 | 0.796 | 1000.789 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 1.153 | 0.120 | 0.000 | 1.153 | gw-r/thread-121/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b41 | 1002.620 | 0.097 | n/a | 0.000 | 0.000 | 0.510 | 1000.852 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 1.103 | 0.097 | 0.000 | 1.103 | gw-r/thread-270/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b3d | 999.453 | 6.319 | n/a | 0.000 | 0.000 | 0.546 | 992.432 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.116 | 6.319 | 0.006 | 0.116 | gw-r/thread-258/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ae8 | 993.305 | 4.936 | n/a | 0.000 | 0.000 | 1.381 | 986.833 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.112 | 4.936 | 0.005 | 0.112 | gw-r/thread-265/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b31 | 992.711 | 2.375 | n/a | 0.000 | 0.000 | 1.159 | 989.028 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.103 | 2.375 | 0.002 | 0.103 | gw-r/thread-242/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ac0 | 974.791 | 66.720 | n/a | 24.563 | 0.000 | 1.676 | 881.215 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.587 | 91.282 | 0.094 | 0.587 | gw-r/thread-76/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001abe | 974.480 | 4.609 | n/a | 0.740 | 0.000 | 0.526 | 968.443 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.133 | 5.349 | 0.005 | 0.133 | gw-r/thread-73/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ae7 | 939.846 | 3.133 | n/a | 3.367 | 0.000 | 1.418 | 931.771 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.125 | 6.500 | 0.007 | 0.125 | gw-r/thread-97/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ac6 | 932.851 | 16.133 | n/a | 4.690 | 0.000 | 0.898 | 910.887 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.206 | 20.823 | 0.022 | 0.206 | gw-r/thread-43/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b3a | 926.854 | 4.810 | n/a | 0.933 | 0.000 | 0.558 | 920.411 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.104 | 5.743 | 0.006 | 0.104 | gw-r/thread-140/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001adf | 926.490 | 4.751 | n/a | 0.000 | 0.000 | 2.923 | 918.678 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.102 | 4.751 | 0.005 | 0.102 | gw-r/thread-237/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001afd | 900.263 | 2.587 | n/a | 0.000 | 0.000 | 1.340 | 896.221 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.100 | 2.587 | 0.003 | 0.100 | gw-r/thread-135/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001af4 | 899.227 | 5.430 | n/a | 0.000 | 0.000 | 0.621 | 892.971 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.166 | 5.430 | 0.006 | 0.166 | gw-r/thread-113/journal/page | none observed |

## P3 / recovery / internal (144 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.798 | n/a | n/a | n/a | 5.832 | n/a | 0.000 | 0.000 | 1.015 | 314.665 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.187 | 5.832 | 0.018 | 0.187 |
| p99 | 1007.706 | n/a | n/a | n/a | 26.714 | n/a | 4.082 | 0.000 | 7.663 | 1001.379 | 0.163 | n/a | 0.311 | 0.000 | n/a | n/a | 36.068 | 28.312 | 0.668 | 36.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001bfe | 1010.178 | 9.333 | n/a | 0.000 | 0.000 | 0.477 | 999.960 | 0.163 | n/a | 0.018 | 0.000 | n/a | n/a | 0.228 | 9.333 | 0.009 | 0.228 | gw-r/thread-283/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001bc1 | 1007.706 | 0.120 | n/a | 0.000 | 0.000 | 5.361 | 1001.035 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 1.121 | 0.120 | 0.000 | 1.121 | gw-r/thread-191/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c18 | 1007.354 | 0.105 | n/a | 0.000 | 0.000 | 5.359 | 1000.724 | 0.012 | n/a | 0.045 | 0.000 | n/a | n/a | 1.109 | 0.105 | 0.000 | 1.109 | gw-r/thread-225/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c25 | 1005.285 | 0.203 | n/a | 0.000 | 0.000 | 2.522 | 1001.379 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 1.127 | 0.203 | 0.000 | 1.127 | gw-r/thread-78/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b97 | 1005.209 | 0.179 | n/a | 0.000 | 0.000 | 0.841 | 1002.963 | 0.016 | n/a | 0.058 | 0.000 | n/a | n/a | 1.152 | 0.179 | 0.000 | 1.152 | gw-r/thread-110/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b65 | 1005.181 | 0.115 | n/a | 0.000 | 0.000 | 3.017 | 1000.879 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 1.116 | 0.115 | 0.000 | 1.116 | gw-r/thread-80/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001bff | 1003.437 | 0.133 | n/a | 0.000 | 0.000 | 1.287 | 1000.869 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.100 | 0.133 | 0.000 | 1.100 | gw-r/thread-77/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c1d | 1003.138 | 6.622 | n/a | 0.000 | 0.000 | 3.141 | 993.220 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.095 | 6.622 | 0.007 | 0.095 | gw-r/thread-164/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001beb | 1003.075 | 0.205 | n/a | 0.000 | 0.000 | 0.829 | 1000.823 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 1.163 | 0.205 | 0.000 | 1.163 | gw-r/thread-140/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b90 | 1002.192 | 0.092 | n/a | 0.000 | 0.000 | 0.357 | 1000.601 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 1.094 | 0.092 | 0.000 | 1.094 | gw-r/thread-141/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b8f | 1001.618 | 5.470 | n/a | 0.000 | 0.000 | 1.323 | 994.594 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.199 | 5.470 | 0.005 | 0.199 | gw-r/thread-255/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001bea | 1001.231 | 2.683 | n/a | 0.000 | 0.000 | 0.621 | 997.767 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.079 | 2.683 | 0.003 | 0.079 | gw-r/thread-95/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b8e | 1001.129 | 10.628 | n/a | 0.000 | 0.000 | 1.627 | 988.639 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.149 | 10.628 | 0.011 | 0.149 | gw-r/thread-137/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c07 | 980.836 | 11.415 | n/a | 0.000 | 0.000 | 0.731 | 968.503 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.154 | 11.415 | 0.012 | 0.154 | gw-r/thread-105/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b7e | 943.598 | 9.993 | n/a | 0.000 | 0.000 | 3.045 | 930.400 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.111 | 9.993 | 0.011 | 0.111 | gw-r/thread-162/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b4f | 937.287 | 14.840 | n/a | 0.000 | 0.000 | 0.770 | 921.467 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.169 | 14.840 | 0.016 | 0.169 | gw-r/thread-135/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001bb0 | 920.873 | 3.946 | n/a | 0.000 | 0.000 | 2.085 | 914.641 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.167 | 3.946 | 0.004 | 0.167 | gw-r/thread-83/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b53 | 919.577 | 8.144 | n/a | 0.000 | 0.000 | 1.031 | 910.125 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.234 | 8.144 | 0.009 | 0.234 | gw-r/thread-98/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001bbe | 914.985 | 2.584 | n/a | 0.000 | 0.000 | 0.609 | 911.659 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.102 | 2.584 | 0.003 | 0.102 | gw-r/thread-187/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001b4a | 909.949 | 5.697 | n/a | 0.000 | 0.000 | 0.430 | 903.702 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.084 | 5.697 | 0.006 | 0.084 | gw-r/thread-74/journal/page | none observed |

## P3 / p4mix / internal (111 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 313.633 | n/a | n/a | n/a | 4.140 | n/a | 0.000 | 0.000 | 0.547 | 309.512 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.175 | 4.140 | 0.017 | 0.175 |
| p99 | 1003.265 | n/a | n/a | n/a | 17.336 | n/a | 1.114 | 0.000 | 3.303 | 1001.043 | 0.075 | n/a | 0.120 | 0.000 | n/a | n/a | 42.506 | 17.336 | 0.770 | 42.506 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001c84 | 1005.238 | 2.485 | n/a | 0.000 | 0.000 | 0.581 | 1002.023 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.080 | 2.485 | 0.002 | 0.080 | gw-r/thread-75/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c8d | 1003.265 | 0.111 | n/a | 0.000 | 0.000 | 1.426 | 1000.600 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 1.094 | 0.111 | 0.000 | 1.094 | gw-r/thread-118/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c67 | 1003.164 | 0.264 | n/a | 0.000 | 0.000 | 0.620 | 1001.043 | 0.024 | n/a | 0.060 | 0.000 | n/a | n/a | 1.153 | 0.264 | 0.000 | 1.153 | gw-r/thread-235/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c29 | 1003.155 | 0.113 | n/a | 0.000 | 0.000 | 1.421 | 1000.471 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 1.101 | 0.113 | 0.000 | 1.101 | gw-r/thread-140/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c50 | 1002.935 | 0.113 | n/a | 0.000 | 0.000 | 0.932 | 1000.739 | 0.015 | n/a | 0.047 | 0.000 | n/a | n/a | 1.089 | 0.113 | 0.000 | 1.089 | gw-r/thread-218/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c3a | 1002.766 | 0.153 | n/a | 0.000 | 0.000 | 0.681 | 1000.722 | 0.004 | n/a | 0.072 | 0.000 | n/a | n/a | 1.134 | 0.153 | 0.000 | 1.134 | gw-r/thread-282/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c46 | 1002.534 | 0.123 | n/a | 0.000 | 0.000 | 0.474 | 1000.757 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 1.117 | 0.123 | 0.000 | 1.117 | gw-r/thread-135/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cc8 | 1002.469 | 0.102 | n/a | 0.000 | 0.000 | 0.580 | 1000.658 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 1.093 | 0.102 | 0.000 | 1.093 | gw-r/thread-237/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cc1 | 1002.429 | 0.103 | n/a | 0.000 | 0.000 | 0.642 | 1000.521 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 1.119 | 0.103 | 0.000 | 1.119 | gw-r/thread-228/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c33 | 1002.142 | 0.105 | n/a | 0.000 | 0.000 | 0.392 | 1000.506 | 0.012 | n/a | 0.024 | 0.000 | n/a | n/a | 1.102 | 0.105 | 0.000 | 1.102 | gw-r/thread-132/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c85 | 1000.613 | 2.790 | n/a | 0.000 | 0.000 | 0.399 | 997.248 | 0.007 | n/a | 0.021 | 0.000 | n/a | n/a | 0.147 | 2.790 | 0.003 | 0.147 | gw-r/thread-278/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cc0 | 1000.028 | 2.583 | n/a | 0.000 | 0.000 | 0.404 | 996.917 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.083 | 2.583 | 0.003 | 0.083 | gw-r/thread-209/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c28 | 992.896 | 2.778 | n/a | 0.000 | 0.000 | 0.426 | 989.544 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.113 | 2.778 | 0.003 | 0.113 | gw-r/thread-255/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c2b | 989.537 | 6.708 | n/a | 0.000 | 0.000 | 0.426 | 982.121 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.221 | 6.708 | 0.007 | 0.221 | gw-r/thread-269/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c27 | 947.502 | 5.052 | n/a | 0.000 | 0.000 | 0.451 | 941.618 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.336 | 5.052 | 0.005 | 0.336 | gw-r/thread-115/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cbd | 931.711 | 4.341 | n/a | 0.000 | 0.000 | 0.513 | 926.690 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.136 | 4.341 | 0.005 | 0.136 | gw-r/thread-108/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cb0 | 902.621 | 6.147 | n/a | 0.000 | 0.000 | 0.614 | 895.663 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.146 | 6.147 | 0.007 | 0.146 | gw-r/thread-217/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c73 | 852.883 | 5.822 | n/a | 0.000 | 0.000 | 0.785 | 845.934 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.278 | 5.822 | 0.007 | 0.278 | gw-r/thread-123/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cb3 | 850.021 | 5.272 | n/a | 0.000 | 0.000 | 3.918 | 840.697 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.100 | 5.272 | 0.006 | 0.100 | gw-r/thread-218/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001c43 | 848.915 | 2.405 | n/a | 0.000 | 0.000 | 0.494 | 845.872 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.090 | 2.405 | 0.003 | 0.090 | gw-r/thread-114/journal/page | none observed |

## P3 / p4h1 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.432 | n/a | n/a | n/a | 3.614 | n/a | 0.000 | 0.000 | 0.564 | 424.283 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.122 | 3.614 | 0.012 | 0.122 |
| p99 | 1002.867 | n/a | n/a | n/a | 23.909 | n/a | 3.200 | 0.000 | 12.527 | 1000.939 | 0.025 | n/a | 0.736 | 0.000 | n/a | n/a | 45.280 | 23.909 | 0.743 | 45.280 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001d39 | 1002.867 | 0.113 | n/a | 0.000 | 0.000 | 0.710 | 1000.875 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 1.100 | 0.113 | 0.000 | 1.100 | gw-r/thread-192/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ce8 | 1002.455 | 0.143 | n/a | 0.000 | 0.000 | 0.447 | 1000.714 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 1.100 | 0.143 | 0.000 | 1.100 | gw-r/thread-142/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d28 | 1002.362 | 0.119 | n/a | 0.000 | 0.000 | 0.416 | 1000.642 | 0.003 | n/a | 0.039 | 0.000 | n/a | n/a | 1.142 | 0.119 | 0.000 | 1.142 | gw-r/thread-130/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d2f | 1002.259 | 0.098 | n/a | 0.000 | 0.000 | 0.449 | 1000.572 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 1.091 | 0.098 | 0.000 | 1.091 | gw-r/thread-117/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cf1 | 1001.618 | 0.112 | n/a | 0.000 | 0.000 | 0.463 | 1000.939 | 0.012 | n/a | 0.050 | 0.000 | n/a | n/a | 0.042 | 0.112 | 0.000 | 0.042 | gw-r/thread-185/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d38 | 1001.251 | 2.999 | n/a | 0.000 | 0.000 | 0.365 | 997.759 | 0.010 | n/a | 0.030 | 0.000 | n/a | n/a | 0.087 | 2.999 | 0.003 | 0.087 | gw-r/thread-268/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cf9 | 999.510 | 4.548 | n/a | 0.000 | 0.000 | 3.841 | 990.954 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.123 | 4.548 | 0.005 | 0.123 | gw-r/thread-233/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d34 | 999.337 | 2.315 | n/a | 0.000 | 0.000 | 0.353 | 996.509 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.128 | 2.315 | 0.002 | 0.128 | gw-r/thread-139/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ce1 | 993.852 | 4.954 | n/a | 0.000 | 0.000 | 0.489 | 988.168 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.199 | 4.954 | 0.005 | 0.199 | gw-r/thread-44/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cea | 992.772 | 3.028 | n/a | 0.000 | 0.000 | 2.706 | 986.889 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.107 | 3.028 | 0.003 | 0.107 | gw-r/thread-168/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ced | 986.763 | 4.262 | n/a | 0.000 | 0.000 | 0.585 | 981.799 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.091 | 4.262 | 0.004 | 0.091 | gw-r/thread-169/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d59 | 978.167 | 4.206 | n/a | 0.000 | 0.000 | 0.416 | 973.406 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.093 | 4.206 | 0.004 | 0.093 | gw-r/thread-186/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cf4 | 978.091 | 3.664 | n/a | 0.000 | 0.000 | 0.665 | 973.608 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.086 | 3.664 | 0.004 | 0.086 | gw-r/thread-212/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d5c | 967.104 | 2.577 | n/a | 0.000 | 0.000 | 0.479 | 963.937 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.079 | 2.577 | 0.003 | 0.079 | gw-r/thread-108/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d31 | 958.551 | 12.393 | n/a | 0.000 | 0.000 | 0.735 | 945.247 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.122 | 12.393 | 0.013 | 0.122 | gw-r/thread-282/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ce6 | 927.749 | 4.400 | n/a | 0.000 | 0.000 | 0.672 | 922.504 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.127 | 4.400 | 0.005 | 0.127 | gw-r/thread-89/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d37 | 893.861 | 2.747 | n/a | 0.000 | 0.000 | 0.431 | 890.551 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.077 | 2.747 | 0.003 | 0.077 | gw-r/thread-83/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d16 | 892.433 | 8.779 | n/a | 0.000 | 0.000 | 0.781 | 882.588 | 0.011 | n/a | 0.029 | 0.000 | n/a | n/a | 0.246 | 8.779 | 0.010 | 0.246 | gw-r/thread-280/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cdb | 885.037 | 6.885 | n/a | 0.000 | 0.000 | 0.544 | 877.332 | 0.002 | n/a | 0.016 | 0.000 | n/a | n/a | 0.258 | 6.885 | 0.008 | 0.258 | gw-r/thread-107/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001cd5 | 883.128 | 2.592 | n/a | 0.000 | 0.000 | 0.457 | 879.966 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.080 | 2.592 | 0.003 | 0.080 | gw-r/thread-265/journal/page | none observed |

## P3 / grow3 / internal (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 765.048 | n/a | n/a | n/a | 8.550 | n/a | 0.000 | 0.000 | 0.760 | 384.225 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 3.136 | 8.550 | 0.158 | 3.136 |
| p99 | 1198.558 | n/a | n/a | n/a | 642.219 | n/a | 58.710 | 0.000 | 5.669 | 1001.202 | 1.931 | n/a | 0.157 | 0.000 | n/a | n/a | 41.429 | 688.713 | 0.909 | 41.429 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001d6d | 1198.558 | 642.219 | n/a | 46.494 | 0.000 | 3.138 | 491.796 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 14.820 | 688.713 | 0.575 | 14.820 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001d79 | 1175.110 | 585.509 | n/a | 42.523 | 0.000 | 1.353 | 536.094 | 0.013 | n/a | 0.157 | 0.000 | n/a | n/a | 9.459 | 628.032 | 0.534 | 9.459 | gw-r/thread-74/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d77 | 1042.480 | 591.998 | n/a | 49.199 | 0.000 | 5.669 | 384.225 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 11.348 | 641.197 | 0.615 | 11.348 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001d76 | 1003.398 | 0.215 | n/a | 0.000 | 0.000 | 0.760 | 1001.202 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 1.142 | 0.215 | 0.000 | 1.142 | gw-r/thread-91/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d6c | 1002.858 | 0.156 | n/a | 0.000 | 0.000 | 0.990 | 1000.577 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 1.082 | 0.156 | 0.000 | 1.082 | gw-r/thread-129/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d6a | 959.882 | 6.233 | n/a | 0.000 | 0.000 | 0.841 | 952.633 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.087 | 6.233 | 0.006 | 0.087 | gw-r/thread-253/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d74 | 909.766 | 4.152 | n/a | 0.000 | 0.000 | 0.944 | 904.498 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.094 | 4.152 | 0.005 | 0.094 | gw-r/thread-264/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d75 | 816.193 | 9.350 | n/a | 0.000 | 0.000 | 1.438 | 805.133 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.227 | 9.350 | 0.011 | 0.227 | gw-r/thread-265/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d7d | 765.048 | 599.783 | n/a | 54.297 | 0.000 | 4.472 | 96.361 | 1.931 | n/a | 0.004 | 0.000 | n/a | n/a | 8.200 | 654.080 | 0.855 | 8.200 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001d67 | 704.356 | 8.714 | n/a | 0.000 | 0.000 | 0.504 | 694.859 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.253 | 8.714 | 0.012 | 0.253 | gw-r/thread-229/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d70 | 100.022 | 32.202 | n/a | 58.710 | 0.000 | 0.610 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.500 | 90.911 | 0.909 | 8.500 | node-14/thread-2/node.gc | none observed |
| 4bf168af06aa7e1d0000000000001d65 | 97.115 | 3.023 | n/a | 0.000 | 0.000 | 0.531 | 93.449 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.078 | 3.023 | 0.031 | 0.078 | gw-r/thread-241/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001d63 | 45.558 | 3.825 | n/a | 0.000 | 0.000 | 0.303 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.429 | 3.825 | 0.084 | 41.429 | node-14/thread-2/socket.wait-first-byte | none observed |
| 4bf168af06aa7e1d0000000000001d69 | 36.696 | 5.789 | n/a | 0.000 | 0.000 | 0.586 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.320 | 5.789 | 0.158 | 30.320 | node-14/thread-2/socket.wait-first-byte | none observed |
| 4bf168af06aa7e1d0000000000001d7c | 16.039 | 8.550 | n/a | 0.000 | 0.000 | 0.273 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.216 | 8.550 | 0.533 | 7.216 | node-14/thread-2/socket.wait-first-byte | none observed |
| 4bf168af06aa7e1d0000000000001d73 | 12.956 | 9.499 | n/a | 0.000 | 0.000 | 0.321 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.136 | 9.499 | 0.733 | 3.136 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001d78 | 5.108 | 3.640 | n/a | 0.000 | 0.000 | 0.350 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.119 | 3.640 | 0.713 | 1.119 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 379.084 | n/a | n/a | n/a | 4.092 | n/a | 0.000 | 0.000 | 0.683 | 375.379 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.104 | 4.092 | 0.011 | 0.104 |
| p99 | 1607.440 | n/a | n/a | n/a | 615.950 | n/a | 44.748 | 0.000 | 7.220 | 1002.091 | 0.368 | n/a | 0.435 | 0.000 | n/a | n/a | 44.690 | 660.698 | 0.517 | 44.690 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001e23 | 1607.440 | 615.950 | n/a | 44.748 | 0.000 | 1.107 | 929.507 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 16.094 | 660.698 | 0.411 | 16.094 | gw-r/thread-170/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dd0 | 1004.453 | 0.137 | n/a | 0.000 | 0.000 | 1.049 | 1002.091 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 1.114 | 0.137 | 0.000 | 1.114 | gw-r/thread-154/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dfc | 1003.986 | 0.137 | n/a | 0.000 | 0.000 | 1.152 | 1001.271 | 0.012 | n/a | 0.300 | 0.000 | n/a | n/a | 1.114 | 0.137 | 0.000 | 1.114 | gw-r/thread-270/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001db8 | 1002.659 | 0.115 | n/a | 0.000 | 0.000 | 0.537 | 1000.836 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 1.089 | 0.115 | 0.000 | 1.089 | gw-r/thread-120/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001da6 | 1002.024 | 3.290 | n/a | 0.000 | 0.000 | 0.789 | 997.805 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.088 | 3.290 | 0.003 | 0.088 | gw-r/thread-137/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dfb | 1001.414 | 6.581 | n/a | 0.000 | 0.000 | 0.604 | 994.042 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.154 | 6.581 | 0.007 | 0.154 | gw-r/thread-227/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001de4 | 999.118 | 5.675 | n/a | 0.000 | 0.000 | 0.637 | 992.497 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.233 | 5.675 | 0.006 | 0.233 | gw-r/thread-216/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001de8 | 998.881 | 3.044 | n/a | 0.000 | 0.000 | 0.458 | 995.268 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.079 | 3.044 | 0.003 | 0.079 | gw-r/thread-238/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001da7 | 995.359 | 2.784 | n/a | 0.000 | 0.000 | 0.773 | 991.032 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.730 | 2.784 | 0.003 | 0.730 | gw-r/thread-97/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ddc | 994.994 | 4.934 | n/a | 0.000 | 0.000 | 0.610 | 989.287 | 0.013 | n/a | 0.033 | 0.000 | n/a | n/a | 0.117 | 4.934 | 0.005 | 0.117 | gw-r/thread-217/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e10 | 992.607 | 3.569 | n/a | 0.000 | 0.000 | 1.280 | 987.650 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.069 | 3.569 | 0.004 | 0.069 | gw-r/thread-142/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dec | 991.901 | 3.053 | n/a | 0.000 | 0.000 | 0.683 | 988.039 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.076 | 3.053 | 0.003 | 0.076 | gw-r/thread-78/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001de0 | 987.600 | 2.859 | n/a | 0.000 | 0.000 | 2.081 | 982.542 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.062 | 2.859 | 0.003 | 0.062 | gw-r/thread-190/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e22 | 983.375 | 7.495 | n/a | 0.000 | 0.000 | 0.722 | 974.927 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.192 | 7.495 | 0.008 | 0.192 | gw-r/thread-166/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dc6 | 960.607 | 4.537 | n/a | 0.000 | 0.000 | 1.310 | 954.542 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.164 | 4.537 | 0.005 | 0.164 | gw-r/thread-88/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dbb | 949.278 | 3.289 | n/a | 0.000 | 0.000 | 0.474 | 945.406 | 0.002 | n/a | 0.028 | 0.000 | n/a | n/a | 0.079 | 3.289 | 0.003 | 0.079 | gw-r/thread-118/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dad | 937.043 | 4.065 | n/a | 0.000 | 0.000 | 0.796 | 931.971 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.168 | 4.065 | 0.004 | 0.168 | gw-r/thread-46/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001de7 | 902.255 | 2.748 | n/a | 0.000 | 0.000 | 0.683 | 898.708 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.082 | 2.748 | 0.003 | 0.082 | gw-r/thread-209/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dc7 | 887.864 | 29.189 | n/a | 0.000 | 0.000 | 2.944 | 855.235 | 0.021 | n/a | 0.073 | 0.000 | n/a | n/a | 0.401 | 29.189 | 0.033 | 0.401 | gw-r/thread-148/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001dfe | 841.943 | 4.092 | n/a | 0.000 | 0.000 | 0.883 | 836.863 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.073 | 4.092 | 0.005 | 0.073 | gw-r/thread-102/journal/page | none observed |

## P3 / grow10 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 183.917 | n/a | n/a | n/a | 12.972 | n/a | 0.000 | 0.000 | 0.673 | 99.051 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 5.139 | 12.972 | 0.484 | 5.139 |
| p99 | 1626.602 | n/a | n/a | n/a | 752.593 | n/a | 99.916 | 0.000 | 9.667 | 1000.661 | 0.227 | n/a | 0.060 | 0.000 | n/a | n/a | 49.291 | 828.010 | 0.871 | 49.291 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001e25 | 1626.602 | 636.950 | n/a | 50.880 | 0.000 | 1.595 | 922.794 | 0.018 | n/a | 0.035 | 0.000 | n/a | n/a | 14.331 | 687.829 | 0.423 | 14.331 | gw-r/thread-144/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e5f | 1474.858 | 586.830 | n/a | 83.560 | 0.000 | 2.895 | 794.479 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 7.067 | 670.390 | 0.455 | 7.067 | gw-r/thread-260/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e36 | 1462.218 | 623.390 | n/a | 52.851 | 0.000 | 1.881 | 771.247 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 12.809 | 676.240 | 0.462 | 12.809 | gw-r/thread-178/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e3f | 1442.942 | 586.343 | n/a | 80.769 | 0.000 | 1.054 | 757.785 | 0.024 | n/a | 0.039 | 0.000 | n/a | n/a | 16.929 | 667.111 | 0.462 | 16.929 | gw-r/thread-254/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e39 | 1421.472 | 752.593 | n/a | 75.417 | 0.000 | 1.540 | 580.714 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 11.176 | 828.010 | 0.583 | 11.176 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001e48 | 1399.763 | 633.110 | n/a | 57.196 | 0.000 | 0.873 | 699.674 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 8.871 | 690.306 | 0.493 | 8.871 | gw-r/thread-145/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e53 | 1390.784 | 608.544 | n/a | 65.015 | 0.000 | 8.101 | 700.364 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 8.713 | 673.560 | 0.484 | 8.713 | gw-r/thread-283/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e46 | 1194.635 | 510.360 | n/a | 61.703 | 0.000 | 1.867 | 613.174 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 7.492 | 572.063 | 0.479 | 7.492 | gw-r/thread-129/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e2c | 1006.535 | 0.152 | n/a | 0.000 | 0.000 | 0.585 | 1000.602 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 5.139 | 0.152 | 0.000 | 5.139 | gw-r/thread-152/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e4d | 1002.574 | 0.107 | n/a | 0.000 | 0.000 | 0.653 | 1000.661 | 0.015 | n/a | 0.055 | 0.000 | n/a | n/a | 1.082 | 0.107 | 0.000 | 1.082 | gw-r/thread-86/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e31 | 903.823 | 525.705 | n/a | 46.089 | 0.000 | 3.719 | 315.354 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 12.912 | 571.794 | 0.633 | 12.912 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001e2e | 818.484 | 569.906 | n/a | 99.916 | 0.000 | 1.129 | 137.817 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 9.681 | 669.823 | 0.818 | 9.681 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001e27 | 796.897 | 639.705 | n/a | 54.108 | 0.000 | 1.194 | 92.178 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 9.680 | 693.813 | 0.871 | 9.680 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001e4f | 761.452 | 567.315 | n/a | 59.648 | 0.000 | 9.667 | 109.942 | 0.159 | n/a | 0.023 | 0.000 | n/a | n/a | 14.698 | 626.963 | 0.823 | 14.698 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001e51 | 737.766 | 2.922 | n/a | 0.000 | 0.000 | 0.673 | 734.084 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.055 | 2.922 | 0.004 | 0.055 | gw-r/thread-75/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e4e | 661.540 | 493.640 | n/a | 56.155 | 0.000 | 2.900 | 99.051 | 0.227 | n/a | 0.017 | 0.000 | n/a | n/a | 9.551 | 549.795 | 0.831 | 9.551 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001e5e | 511.685 | 6.038 | n/a | 0.000 | 0.000 | 0.742 | 504.776 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.101 | 6.038 | 0.012 | 0.101 | gw-r/thread-118/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e5d | 275.694 | 5.390 | n/a | 0.000 | 0.000 | 0.899 | 269.170 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.168 | 5.390 | 0.020 | 0.168 | gw-r/thread-92/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e52 | 205.669 | 2.831 | n/a | 0.000 | 0.000 | 1.109 | 201.626 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.057 | 2.831 | 0.014 | 0.057 | gw-r/thread-77/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e59 | 183.917 | 10.178 | n/a | 2.265 | 0.000 | 0.661 | 170.650 | 0.016 | n/a | 0.030 | 0.000 | n/a | n/a | 0.116 | 12.443 | 0.068 | 0.116 | gw-r/thread-278/journal/page | none observed |

## P3 / p4h10 / internal (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 469.804 | n/a | n/a | n/a | 4.035 | n/a | 0.000 | 0.000 | 0.679 | 462.029 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.126 | 4.208 | 0.011 | 0.126 |
| p99 | 1007.939 | n/a | n/a | n/a | 23.192 | n/a | 5.754 | 0.000 | 104.388 | 1001.996 | 0.045 | n/a | 0.094 | 0.000 | n/a | n/a | 42.501 | 25.134 | 0.822 | 42.501 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001eac | 1007.939 | 3.415 | n/a | 0.000 | 0.000 | 2.353 | 1001.996 | 0.020 | n/a | 0.060 | 0.000 | n/a | n/a | 0.094 | 3.415 | 0.003 | 0.094 | gw-r/thread-222/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001eeb | 1007.648 | 6.447 | n/a | 0.000 | 0.000 | 0.830 | 1000.154 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.164 | 6.447 | 0.006 | 0.164 | gw-r/thread-191/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ebd | 1005.859 | 2.405 | n/a | 0.000 | 0.000 | 1.719 | 1001.604 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.081 | 2.405 | 0.002 | 0.081 | gw-r/thread-248/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e97 | 1005.346 | 4.751 | n/a | 0.000 | 0.000 | 0.440 | 999.969 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.153 | 4.751 | 0.005 | 0.153 | gw-r/thread-141/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001eb7 | 1004.744 | 3.243 | n/a | 0.000 | 0.000 | 0.590 | 1000.750 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.114 | 3.243 | 0.003 | 0.114 | gw-r/thread-121/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ed7 | 1004.202 | 4.479 | n/a | 1.125 | 0.000 | 0.657 | 997.805 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.094 | 5.604 | 0.006 | 0.094 | gw-r/thread-146/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e79 | 1002.302 | 0.122 | n/a | 0.000 | 0.000 | 0.456 | 1000.557 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 1.118 | 0.122 | 0.000 | 1.118 | gw-r/thread-205/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ea8 | 1000.285 | 3.048 | n/a | 0.000 | 0.000 | 0.522 | 996.515 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.147 | 3.048 | 0.003 | 0.147 | gw-r/thread-100/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e9e | 998.639 | 2.540 | n/a | 0.000 | 0.000 | 0.762 | 995.244 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.050 | 2.540 | 0.003 | 0.050 | gw-r/thread-91/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001eec | 994.685 | 3.850 | n/a | 0.000 | 0.000 | 0.567 | 990.119 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.117 | 3.850 | 0.004 | 0.117 | gw-r/thread-193/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e87 | 994.465 | 2.773 | n/a | 0.000 | 0.000 | 0.487 | 991.098 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.048 | 2.773 | 0.003 | 0.048 | gw-r/thread-246/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ecb | 994.389 | 4.295 | n/a | 0.000 | 0.000 | 1.584 | 988.390 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.077 | 4.295 | 0.004 | 0.077 | gw-r/thread-124/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001eb3 | 990.895 | 3.321 | n/a | 0.000 | 0.000 | 0.650 | 986.776 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.105 | 3.321 | 0.003 | 0.105 | gw-r/thread-164/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e6d | 985.753 | 2.948 | n/a | 0.000 | 0.000 | 0.652 | 982.026 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.080 | 2.948 | 0.003 | 0.080 | gw-r/thread-79/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ea7 | 983.558 | 2.783 | n/a | 0.000 | 0.000 | 0.468 | 980.154 | 0.004 | n/a | 0.064 | 0.000 | n/a | n/a | 0.084 | 2.783 | 0.003 | 0.084 | gw-r/thread-166/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e73 | 963.662 | 4.170 | n/a | 0.000 | 0.000 | 0.482 | 958.863 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.107 | 4.170 | 0.004 | 0.107 | gw-r/thread-151/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e9b | 924.806 | 8.563 | n/a | 0.000 | 0.000 | 0.864 | 915.061 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.246 | 8.563 | 0.009 | 0.246 | gw-r/thread-275/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e96 | 910.160 | 3.293 | n/a | 0.000 | 0.000 | 0.721 | 906.015 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.098 | 3.293 | 0.004 | 0.098 | gw-r/thread-255/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e7b | 882.257 | 5.048 | n/a | 0.000 | 0.000 | 1.628 | 875.268 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.261 | 5.048 | 0.006 | 0.261 | gw-r/thread-219/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001e84 | 873.893 | 2.971 | n/a | 0.000 | 0.000 | 0.522 | 870.223 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.125 | 2.971 | 0.003 | 0.125 | gw-r/thread-189/journal/page | none observed |

## P3 / presweep / internal (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.062 | n/a | n/a | n/a | 5.720 | n/a | 0.000 | 0.000 | 0.931 | 353.422 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.164 | 5.720 | 0.021 | 0.164 |
| p99 | 1009.438 | n/a | n/a | n/a | 25.712 | n/a | 4.770 | 0.000 | 5.260 | 1001.453 | 0.107 | n/a | 0.075 | 0.000 | n/a | n/a | 44.900 | 27.437 | 0.818 | 44.900 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001f29 | 1010.823 | 6.684 | n/a | 0.000 | 0.000 | 2.002 | 1001.453 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.639 | 6.684 | 0.007 | 0.639 | gw-r/thread-117/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f82 | 1009.438 | 0.203 | n/a | 0.000 | 0.000 | 0.985 | 1003.100 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 5.071 | 0.203 | 0.000 | 5.071 | gw-r/thread-84/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f81 | 1008.095 | 13.371 | n/a | 0.000 | 0.000 | 0.408 | 994.125 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.146 | 13.371 | 0.013 | 0.146 | gw-r/thread-278/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f3d | 1004.220 | 0.150 | n/a | 0.000 | 0.000 | 0.743 | 1000.746 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 2.530 | 0.150 | 0.000 | 2.530 | gw-r/thread-191/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f4a | 1004.120 | 2.926 | n/a | 0.000 | 0.000 | 4.798 | 996.213 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.153 | 2.926 | 0.003 | 0.153 | gw-r/thread-200/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f84 | 1000.834 | 9.214 | n/a | 0.000 | 0.000 | 1.459 | 989.990 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.127 | 9.214 | 0.009 | 0.127 | gw-r/thread-264/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f44 | 996.126 | 11.091 | n/a | 0.000 | 0.000 | 1.190 | 983.684 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.120 | 11.091 | 0.011 | 0.120 | gw-r/thread-148/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f09 | 979.999 | 5.100 | n/a | 0.000 | 0.000 | 4.083 | 970.667 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.115 | 5.100 | 0.005 | 0.115 | gw-r/thread-178/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f62 | 979.637 | 4.310 | n/a | 0.000 | 0.000 | 0.862 | 974.236 | 0.029 | n/a | 0.044 | 0.000 | n/a | n/a | 0.156 | 4.310 | 0.004 | 0.156 | gw-r/thread-246/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001ef4 | 974.043 | 2.712 | n/a | 0.000 | 0.000 | 1.733 | 969.466 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.088 | 2.712 | 0.003 | 0.088 | gw-r/thread-215/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f7e | 951.415 | 22.991 | n/a | 0.000 | 0.000 | 0.687 | 927.603 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.100 | 22.991 | 0.024 | 0.100 | gw-r/thread-261/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f64 | 933.126 | 4.868 | n/a | 0.000 | 0.000 | 0.474 | 927.454 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.283 | 4.868 | 0.005 | 0.283 | gw-r/thread-165/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f1c | 893.164 | 6.381 | n/a | 0.000 | 0.000 | 0.662 | 885.818 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.253 | 6.381 | 0.007 | 0.253 | gw-r/thread-141/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f3a | 890.132 | 3.558 | n/a | 0.000 | 0.000 | 1.710 | 884.740 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.073 | 3.558 | 0.004 | 0.073 | gw-r/thread-194/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f50 | 873.394 | 5.113 | n/a | 0.000 | 0.000 | 2.195 | 865.867 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.164 | 5.113 | 0.006 | 0.164 | gw-r/thread-205/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f0b | 841.284 | 2.012 | n/a | 0.000 | 0.000 | 0.589 | 838.563 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.079 | 2.012 | 0.002 | 0.079 | gw-r/thread-172/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f75 | 790.396 | 4.430 | n/a | 0.000 | 0.000 | 0.594 | 785.219 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.113 | 4.430 | 0.006 | 0.113 | gw-r/thread-132/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f68 | 752.497 | 3.180 | n/a | 0.000 | 0.000 | 0.812 | 748.377 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.095 | 3.180 | 0.004 | 0.095 | gw-r/thread-254/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f6f | 737.145 | 3.446 | n/a | 0.000 | 0.000 | 1.815 | 731.740 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.084 | 3.446 | 0.005 | 0.084 | gw-r/thread-264/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f6b | 732.044 | 4.204 | n/a | 0.000 | 0.000 | 0.567 | 727.148 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.090 | 4.204 | 0.006 | 0.090 | gw-r/thread-267/journal/page | none observed |

## P3 / sweep / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.254 | n/a | n/a | n/a | 13.392 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.371 | 13.392 | 0.151 | 0.371 |
| p99 | 973.419 | n/a | n/a | n/a | 52.139 | n/a | 0.000 | 0.000 | 7.483 | 967.237 | 0.013 | n/a | 0.061 | 0.000 | n/a | n/a | 11.823 | 52.139 | 0.811 | 11.823 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bf168af06aa7e1d0000000000001f91 | 973.419 | 4.594 | n/a | 0.000 | 0.000 | 1.449 | 967.237 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.102 | 4.594 | 0.005 | 0.102 | gw-r/thread-142/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f8f | 610.887 | 8.891 | n/a | 0.000 | 0.000 | 7.483 | 594.299 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.168 | 8.891 | 0.015 | 0.168 | gw-r/thread-148/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f8e | 224.994 | 34.046 | n/a | 0.000 | 0.000 | 3.283 | 187.221 | 0.013 | n/a | 0.061 | 0.000 | n/a | n/a | 0.371 | 34.046 | 0.151 | 0.371 | gw-r/thread-146/journal/page | none observed |
| 4bf168af06aa7e1d0000000000001f8c | 64.254 | 52.139 | n/a | 0.000 | 0.000 | 0.292 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.823 | 52.139 | 0.811 | 11.823 | node-14/thread-2/replica.publish | none observed |
| 4bf168af06aa7e1d0000000000001f8d | 39.317 | 31.335 | n/a | 0.000 | 0.000 | 0.375 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.607 | 31.335 | 0.797 | 7.607 | node-14/thread-2/replica.fetch-feed | none observed |
| 4bf168af06aa7e1d0000000000001f8b | 24.926 | 13.392 | n/a | 0.000 | 0.000 | 0.332 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.202 | 13.392 | 0.537 | 11.202 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.823 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 201.323 | 0.019 | n/a | 0.118 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 |
| p99 | 211.476 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.922 | 207.630 | 9.836 | n/a | 0.724 | 0.000 | n/a | n/a | 0.659 | 0.000 | 0.000 | 0.659 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000000011 | 211.476 | 0.000 | n/a | 0.000 | 0.000 | 9.459 | 201.702 | 0.020 | n/a | 0.158 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e85000000000000000e | 209.408 | 0.000 | n/a | 0.000 | 0.000 | 3.998 | 205.171 | 0.023 | n/a | 0.121 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e85000000000000004d | 209.221 | 0.000 | n/a | 0.000 | 0.000 | 1.404 | 207.630 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e850000000000000009 | 207.675 | 0.000 | n/a | 0.000 | 0.000 | 2.558 | 204.269 | 0.039 | n/a | 0.150 | 0.000 | n/a | n/a | 0.659 | 0.000 | 0.000 | 0.659 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000018 | 206.810 | 0.000 | n/a | 0.000 | 0.000 | 3.750 | 202.417 | 0.078 | n/a | 0.209 | 0.000 | n/a | n/a | 0.355 | 0.000 | 0.000 | 0.355 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e850000000000000044 | 206.610 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 205.224 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e850000000000000026 | 206.512 | 0.000 | n/a | 0.000 | 0.000 | 4.667 | 201.441 | 0.020 | n/a | 0.174 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e85000000000000001a | 206.236 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 204.289 | 0.098 | n/a | 0.296 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000042 | 206.098 | 0.000 | n/a | 0.000 | 0.000 | 3.326 | 202.403 | 0.016 | n/a | 0.182 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e850000000000000021 | 206.060 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 204.924 | 0.014 | n/a | 0.116 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 8bafba02fb063e850000000000000013 | 205.922 | 0.000 | n/a | 0.000 | 0.000 | 1.522 | 204.057 | 0.048 | n/a | 0.173 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-66/journal/page | none observed |
| 8bafba02fb063e85000000000000002e | 205.655 | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 204.436 | 0.055 | n/a | 0.114 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e85000000000000003f | 205.390 | 0.000 | n/a | 0.000 | 0.000 | 2.599 | 202.265 | 0.055 | n/a | 0.158 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-48/journal/page | none observed |
| 8bafba02fb063e85000000000000003b | 205.374 | 0.000 | n/a | 0.000 | 0.000 | 4.169 | 200.968 | 0.017 | n/a | 0.119 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e85000000000000004c | 204.992 | 0.000 | n/a | 0.000 | 0.000 | 1.658 | 203.047 | 0.023 | n/a | 0.132 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-66/journal/page | none observed |
| 8bafba02fb063e850000000000000054 | 204.622 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 203.724 | 0.016 | n/a | 0.122 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e850000000000000022 | 204.393 | 0.000 | n/a | 0.000 | 0.000 | 1.503 | 202.343 | 0.048 | n/a | 0.229 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e850000000000000034 | 204.350 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 202.855 | 0.026 | n/a | 0.724 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-66/journal/page | none observed |
| 8bafba02fb063e850000000000000033 | 204.132 | 0.000 | n/a | 0.000 | 0.000 | 2.681 | 201.219 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000014 | 204.039 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 202.597 | 0.049 | n/a | 0.195 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-41/journal/page | none observed |

## P3 / baseline / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 200.930 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 208.178 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.098 | 204.055 | 3.118 | n/a | 0.306 | 0.000 | n/a | n/a | 0.426 | 0.000 | 0.000 | 0.426 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e85000000000000007c | 208.909 | 0.000 | n/a | 0.000 | 0.000 | 3.878 | 202.260 | 2.518 | n/a | 0.134 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e8500000000000000ed | 208.260 | 0.000 | n/a | 0.000 | 0.000 | 3.924 | 204.052 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e85000000000000011e | 208.178 | 0.000 | n/a | 0.000 | 0.000 | 4.098 | 203.782 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-66/journal/page | none observed |
| 8bafba02fb063e850000000000000059 | 207.576 | 0.000 | n/a | 0.000 | 0.000 | 5.529 | 201.656 | 0.040 | n/a | 0.147 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000080 | 206.177 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 205.027 | 0.022 | n/a | 0.114 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e85000000000000007a | 206.136 | 0.000 | n/a | 0.000 | 0.000 | 4.265 | 201.546 | 0.016 | n/a | 0.142 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e85000000000000010c | 206.109 | 0.000 | n/a | 0.000 | 0.000 | 1.944 | 203.906 | 0.005 | n/a | 0.068 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e85000000000000010b | 205.575 | 0.000 | n/a | 0.000 | 0.000 | 3.035 | 202.230 | 0.010 | n/a | 0.121 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e8500000000000000ad | 205.402 | 0.000 | n/a | 0.000 | 0.000 | 4.077 | 201.037 | 0.009 | n/a | 0.095 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e850000000000000060 | 205.359 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 204.487 | 0.020 | n/a | 0.111 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e850000000000000128 | 205.296 | 0.000 | n/a | 0.000 | 0.000 | 3.980 | 201.116 | 0.007 | n/a | 0.077 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e8500000000000000a4 | 205.088 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 204.055 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e8500000000000000c3 | 205.002 | 0.000 | n/a | 0.000 | 0.000 | 3.626 | 201.095 | 0.008 | n/a | 0.105 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000000106 | 204.830 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 203.925 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000114 | 204.679 | 0.000 | n/a | 0.000 | 0.000 | 3.490 | 201.011 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e8500000000000000ef | 204.263 | 0.000 | n/a | 0.000 | 0.000 | 3.301 | 200.767 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e8500000000000000b9 | 204.148 | 0.000 | n/a | 0.000 | 0.000 | 2.855 | 201.053 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e8500000000000000bb | 204.018 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 203.289 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e85000000000000008e | 204.014 | 0.000 | n/a | 0.000 | 0.000 | 2.849 | 200.900 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e85000000000000009c | 203.934 | 0.000 | n/a | 0.000 | 0.000 | 1.246 | 202.412 | 0.011 | n/a | 0.117 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.731 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.804 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 206.318 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.814 | 204.789 | 6.293 | n/a | 0.181 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e8500000000000001f2 | 207.505 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 205.364 | 0.040 | n/a | 0.659 | 0.000 | n/a | n/a | 0.481 | 0.000 | 0.000 | 0.481 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000164 | 207.438 | 0.000 | n/a | 0.000 | 0.000 | 6.110 | 201.075 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e850000000000000174 | 206.318 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 205.202 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e8500000000000001e9 | 206.154 | 0.000 | n/a | 0.000 | 0.000 | 3.814 | 202.114 | 0.009 | n/a | 0.106 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e85000000000000022f | 205.651 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 204.789 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e8500000000000001c4 | 205.639 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 204.259 | 0.032 | n/a | 0.079 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e8500000000000001d6 | 205.298 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 204.488 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e85000000000000023a | 205.051 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 204.111 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 8bafba02fb063e850000000000000169 | 205.040 | 0.000 | n/a | 0.000 | 0.000 | 1.774 | 202.993 | 0.005 | n/a | 0.077 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e85000000000000015b | 204.975 | 0.000 | n/a | 0.000 | 0.000 | 4.244 | 200.556 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e8500000000000001eb | 204.492 | 0.000 | n/a | 0.000 | 0.000 | 3.540 | 200.800 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e8500000000000001f3 | 204.380 | 0.000 | n/a | 0.000 | 0.000 | 2.489 | 201.638 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e85000000000000018b | 204.101 | 0.000 | n/a | 0.000 | 0.000 | 0.952 | 202.919 | 0.007 | n/a | 0.096 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000000212 | 204.057 | 0.000 | n/a | 0.000 | 0.000 | 2.809 | 201.070 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e8500000000000001a7 | 203.987 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 203.024 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000167 | 203.942 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 202.687 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000000177 | 203.865 | 0.000 | n/a | 0.000 | 0.000 | 2.811 | 200.854 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e85000000000000015d | 203.774 | 0.000 | n/a | 0.000 | 0.000 | 0.665 | 202.925 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-66/journal/page | none observed |
| 8bafba02fb063e8500000000000001f7 | 203.289 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 202.146 | 0.029 | n/a | 0.105 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e850000000000000236 | 203.230 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 199.804 | 2.885 | n/a | 0.020 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-41/journal/page | none observed |

## P3 / L4 / read (146 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.313 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 81.165 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 209.765 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.728 | 203.514 | 4.015 | n/a | 0.109 | 0.000 | n/a | n/a | 52.006 | 0.000 | 0.000 | 52.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e85000000000000025c | 211.307 | 0.000 | n/a | 0.000 | 0.000 | 10.380 | 200.752 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e850000000000000261 | 209.765 | 0.000 | n/a | 0.000 | 0.000 | 1.692 | 207.857 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e850000000000000288 | 206.215 | 0.000 | n/a | 0.000 | 0.000 | 4.011 | 202.049 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-62/journal/page | none observed |
| 8bafba02fb063e850000000000000258 | 205.677 | 0.000 | n/a | 0.000 | 0.000 | 4.220 | 201.230 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e850000000000000255 | 205.434 | 0.000 | n/a | 0.000 | 0.000 | 3.957 | 201.139 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e850000000000000298 | 205.426 | 0.000 | n/a | 0.000 | 0.000 | 4.436 | 200.804 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e850000000000000271 | 205.306 | 0.000 | n/a | 0.000 | 0.000 | 4.361 | 200.790 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e850000000000000289 | 205.304 | 0.000 | n/a | 0.000 | 0.000 | 1.632 | 203.514 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e85000000000000028a | 204.708 | 0.000 | n/a | 0.000 | 0.000 | 3.045 | 201.306 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000277 | 204.416 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 203.284 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e85000000000000029a | 204.001 | 0.000 | n/a | 0.000 | 0.000 | 2.671 | 201.113 | 0.034 | n/a | 0.085 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 8bafba02fb063e850000000000000293 | 203.926 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 203.286 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e85000000000000026e | 203.844 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 202.866 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e850000000000000286 | 203.795 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 202.931 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 8bafba02fb063e850000000000000274 | 203.062 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 201.970 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000256 | 202.604 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.281 | 0.008 | n/a | 0.173 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000284 | 202.584 | 0.000 | n/a | 0.000 | 0.000 | 1.343 | 201.059 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000000278 | 202.561 | 0.000 | n/a | 0.000 | 0.000 | 1.133 | 201.182 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e850000000000000276 | 202.507 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 201.304 | 0.017 | n/a | 0.074 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000000265 | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 201.079 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (140 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 102.286 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 101.346 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 |
| p99 | 207.883 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.676 | 203.687 | 5.704 | n/a | 0.171 | 0.000 | n/a | n/a | 49.960 | 0.000 | 0.000 | 49.960 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000000dc0 | 209.216 | 0.000 | n/a | 0.000 | 0.000 | 6.868 | 202.045 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-65/journal/page | none observed |
| 8bafba02fb063e850000000000000da5 | 207.883 | 0.000 | n/a | 0.000 | 0.000 | 5.202 | 202.497 | 0.018 | n/a | 0.053 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-73/journal/page | none observed |
| 8bafba02fb063e850000000000000d94 | 205.224 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 204.575 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-85/journal/page | none observed |
| 8bafba02fb063e850000000000000d99 | 204.283 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 203.687 | 0.016 | n/a | 0.050 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000db3 | 203.711 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 202.789 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-75/journal/page | none observed |
| 8bafba02fb063e850000000000000dd4 | 203.666 | 0.000 | n/a | 0.000 | 0.000 | 2.258 | 201.092 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e850000000000000da0 | 203.285 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 202.486 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-77/journal/page | none observed |
| 8bafba02fb063e850000000000000de7 | 203.127 | 0.000 | n/a | 0.000 | 0.000 | 2.476 | 200.483 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-80/journal/page | none observed |
| 8bafba02fb063e850000000000000dc8 | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 201.676 | 0.008 | n/a | 0.171 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-84/journal/page | none observed |
| 8bafba02fb063e850000000000000d9d | 202.602 | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 200.795 | 0.020 | n/a | 0.922 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-80/journal/page | none observed |
| 8bafba02fb063e850000000000000d9a | 202.474 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 201.794 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-84/journal/page | none observed |
| 8bafba02fb063e850000000000000dc7 | 202.452 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 201.288 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.362 | 0.000 | 0.000 | 0.362 | gw-r/thread-83/journal/page | none observed |
| 8bafba02fb063e850000000000000db2 | 202.207 | 0.000 | n/a | 0.000 | 0.000 | 0.350 | 201.598 | 0.027 | n/a | 0.107 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-73/journal/page | none observed |
| 8bafba02fb063e850000000000000dc1 | 202.093 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 200.877 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.286 | 0.000 | 0.000 | 0.286 | gw-r/thread-82/journal/page | none observed |
| 8bafba02fb063e850000000000000dc2 | 202.074 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.145 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-77/journal/page | none observed |
| 8bafba02fb063e850000000000000ddc | 202.049 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 200.895 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-67/journal/page | none observed |
| 8bafba02fb063e850000000000000d96 | 202.018 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.015 | 0.004 | n/a | 0.077 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e850000000000000dc6 | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 200.975 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e850000000000000da7 | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 200.945 | 0.017 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000dce | 201.947 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 200.910 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-73/journal/page | none observed |

## P3 / L64 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.625 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 200.717 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 208.522 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.138 | 204.310 | 3.860 | n/a | 0.485 | 0.000 | n/a | n/a | 0.568 | 0.000 | 0.000 | 0.568 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000000e27 | 214.316 | 0.000 | n/a | 0.000 | 0.000 | 13.276 | 200.838 | 0.013 | n/a | 0.047 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000e38 | 208.992 | 0.000 | n/a | 0.000 | 0.000 | 5.138 | 203.398 | 0.005 | n/a | 0.243 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-93/journal/page | none observed |
| 8bafba02fb063e850000000000000e5c | 208.522 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 206.841 | 0.369 | n/a | 0.485 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-82/journal/page | none observed |
| 8bafba02fb063e850000000000000eea | 205.423 | 0.000 | n/a | 0.000 | 0.000 | 3.918 | 201.362 | 0.016 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-112/journal/page | none observed |
| 8bafba02fb063e850000000000000e2f | 205.405 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 204.351 | 0.004 | n/a | 0.060 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-77/journal/page | none observed |
| 8bafba02fb063e850000000000000dfb | 205.281 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 204.077 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-83/journal/page | none observed |
| 8bafba02fb063e850000000000000e55 | 205.177 | 0.000 | n/a | 0.000 | 0.000 | 4.454 | 200.511 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-88/journal/page | none observed |
| 8bafba02fb063e850000000000000e3d | 205.136 | 0.000 | n/a | 0.000 | 0.000 | 0.645 | 204.310 | 0.003 | n/a | 0.042 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-102/journal/page | none observed |
| 8bafba02fb063e850000000000000ebe | 204.887 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 203.932 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-98/journal/page | none observed |
| 8bafba02fb063e850000000000000e33 | 204.541 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 200.690 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 3.274 | 0.000 | 0.000 | 3.274 | gw-r/thread-89/journal/page | none observed |
| 8bafba02fb063e850000000000000ee2 | 204.458 | 0.000 | n/a | 0.000 | 0.000 | 3.544 | 200.750 | 0.017 | n/a | 0.044 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-97/journal/page | none observed |
| 8bafba02fb063e850000000000000e2d | 204.405 | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 203.747 | 0.019 | n/a | 0.057 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e850000000000000e79 | 204.365 | 0.000 | n/a | 0.000 | 0.000 | 3.666 | 200.563 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000eb9 | 204.351 | 0.000 | n/a | 0.000 | 0.000 | 0.383 | 203.620 | 0.038 | n/a | 0.184 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-96/journal/page | none observed |
| 8bafba02fb063e850000000000000ed2 | 204.331 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 203.407 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-129/journal/page | none observed |
| 8bafba02fb063e850000000000000e46 | 204.271 | 0.000 | n/a | 0.000 | 0.000 | 3.256 | 200.831 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-119/journal/page | none observed |
| 8bafba02fb063e850000000000000ec1 | 204.253 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 203.415 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-112/journal/page | none observed |
| 8bafba02fb063e850000000000000ebb | 204.143 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 202.781 | 0.018 | n/a | 0.058 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-102/journal/page | none observed |
| 8bafba02fb063e850000000000000e36 | 204.132 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 203.294 | 0.016 | n/a | 0.086 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-75/journal/page | none observed |
| 8bafba02fb063e850000000000000e67 | 204.023 | 0.000 | n/a | 0.000 | 0.000 | 0.392 | 203.303 | 0.020 | n/a | 0.163 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-94/journal/page | none observed |

## P3 / L256 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.497 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 200.664 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 209.461 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.996 | 204.832 | 2.536 | n/a | 0.147 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000000f0a | 216.185 | 0.000 | n/a | 0.000 | 0.000 | 6.996 | 208.837 | 0.017 | n/a | 0.151 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-102/journal/page | none observed |
| 8bafba02fb063e850000000000000f5d | 211.830 | 0.000 | n/a | 0.000 | 0.000 | 10.283 | 201.332 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-102/journal/page | none observed |
| 8bafba02fb063e850000000000000f40 | 209.461 | 0.000 | n/a | 0.000 | 0.000 | 2.706 | 178.186 | 28.465 | n/a | 0.011 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-117/journal/page | none observed |
| 8bafba02fb063e850000000000000ef3 | 207.467 | 0.000 | n/a | 0.000 | 0.000 | 0.446 | 206.783 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-118/journal/page | none observed |
| 8bafba02fb063e850000000000000f2d | 205.741 | 0.000 | n/a | 0.000 | 0.000 | 3.448 | 200.418 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 1.835 | 0.000 | 0.000 | 1.835 | gw-r/thread-128/journal/page | none observed |
| 8bafba02fb063e850000000000000f2a | 205.559 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 204.832 | 0.052 | n/a | 0.082 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000000f7f | 205.555 | 0.000 | n/a | 0.000 | 0.000 | 4.047 | 201.306 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-75/journal/page | none observed |
| 8bafba02fb063e850000000000000fa1 | 205.227 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 204.308 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000000f05 | 205.158 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 204.460 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-82/journal/page | none observed |
| 8bafba02fb063e850000000000000f2f | 204.882 | 3.255 | n/a | 0.000 | 0.000 | 0.707 | 200.731 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.136 | 3.255 | 0.016 | 0.136 | gw-r/thread-93/journal/page | none observed |
| 8bafba02fb063e850000000000000efc | 204.701 | 0.000 | n/a | 0.000 | 0.000 | 3.680 | 200.822 | 0.020 | n/a | 0.057 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-77/journal/page | none observed |
| 8bafba02fb063e850000000000000fb8 | 204.635 | 0.000 | n/a | 0.000 | 0.000 | 3.706 | 200.773 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-105/journal/page | none observed |
| 8bafba02fb063e850000000000000fe5 | 204.400 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 202.454 | 0.006 | n/a | 0.674 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-111/journal/page | none observed |
| 8bafba02fb063e850000000000000f90 | 204.195 | 0.000 | n/a | 0.000 | 0.000 | 1.491 | 202.364 | 0.022 | n/a | 0.094 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-78/journal/page | none observed |
| 8bafba02fb063e850000000000000f46 | 203.924 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 203.227 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-95/journal/page | none observed |
| 8bafba02fb063e850000000000000fb5 | 203.856 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 203.155 | 0.003 | n/a | 0.042 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-82/journal/page | none observed |
| 8bafba02fb063e850000000000000f9e | 203.804 | 0.000 | n/a | 0.000 | 0.000 | 1.796 | 201.814 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e850000000000000f16 | 203.771 | 0.000 | n/a | 0.000 | 0.000 | 1.258 | 202.236 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-121/journal/page | none observed |
| 8bafba02fb063e850000000000000f63 | 203.759 | 0.000 | n/a | 0.000 | 0.000 | 2.860 | 200.673 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-78/journal/page | none observed |
| 8bafba02fb063e850000000000000eee | 203.723 | 0.000 | n/a | 0.000 | 0.000 | 2.742 | 200.756 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-117/journal/page | none observed |

## P3 / L1024 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.546 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 200.666 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 222.615 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 12.022 | 205.926 | 0.999 | n/a | 0.275 | 0.000 | n/a | n/a | 1.869 | 0.000 | 0.000 | 1.869 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000001007 | 335.114 | 0.000 | n/a | 0.000 | 0.000 | 129.837 | 205.120 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-280/journal/page | none observed |
| 8bafba02fb063e850000000000001008 | 228.594 | 0.000 | n/a | 0.000 | 0.000 | 11.367 | 217.066 | 0.021 | n/a | 0.042 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-125/journal/page | none observed |
| 8bafba02fb063e8500000000000010e0 | 222.615 | 0.000 | n/a | 0.000 | 0.000 | 12.022 | 209.714 | 0.014 | n/a | 0.189 | 0.000 | n/a | n/a | 0.675 | 0.000 | 0.000 | 0.675 | gw-r/thread-227/journal/page | none observed |
| 8bafba02fb063e850000000000001006 | 211.228 | 0.000 | n/a | 0.000 | 0.000 | 5.153 | 205.926 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-126/journal/page | none observed |
| 8bafba02fb063e850000000000001099 | 208.620 | 0.000 | n/a | 0.000 | 0.000 | 5.525 | 202.856 | 0.114 | n/a | 0.051 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-214/journal/page | none observed |
| 8bafba02fb063e850000000000001081 | 208.323 | 0.000 | n/a | 0.000 | 0.000 | 7.621 | 200.556 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-169/journal/page | none observed |
| 8bafba02fb063e850000000000001045 | 207.769 | 0.000 | n/a | 0.000 | 0.000 | 6.973 | 200.578 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-85/journal/page | none observed |
| 8bafba02fb063e8500000000000010e2 | 206.918 | 0.000 | n/a | 0.000 | 0.000 | 3.417 | 202.848 | 0.021 | n/a | 0.275 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | gw-r/thread-75/journal/page | none observed |
| 8bafba02fb063e850000000000001061 | 206.886 | 0.000 | n/a | 0.000 | 0.000 | 6.068 | 200.649 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-257/journal/page | none observed |
| 8bafba02fb063e85000000000000107b | 206.556 | 0.000 | n/a | 0.000 | 0.000 | 1.341 | 204.951 | 0.073 | n/a | 0.068 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-86/journal/page | none observed |
| 8bafba02fb063e8500000000000010e4 | 205.839 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 204.609 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-73/journal/page | none observed |
| 8bafba02fb063e850000000000001060 | 205.659 | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 204.868 | 0.021 | n/a | 0.050 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| 8bafba02fb063e850000000000001018 | 205.001 | 0.000 | n/a | 0.000 | 0.000 | 4.201 | 200.619 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-152/journal/page | none observed |
| 8bafba02fb063e850000000000001032 | 204.827 | 0.000 | n/a | 0.000 | 0.000 | 3.809 | 200.844 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-248/journal/page | none observed |
| 8bafba02fb063e850000000000001012 | 204.601 | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 203.629 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-274/journal/page | none observed |
| 8bafba02fb063e85000000000000105b | 204.460 | 0.000 | n/a | 0.000 | 0.000 | 3.650 | 200.662 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-77/journal/page | none observed |
| 8bafba02fb063e850000000000001054 | 204.365 | 0.000 | n/a | 0.000 | 0.000 | 2.584 | 201.554 | 0.004 | n/a | 0.066 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000001064 | 204.219 | 0.000 | n/a | 0.000 | 0.000 | 3.329 | 200.739 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-74/journal/page | none observed |
| 8bafba02fb063e85000000000000101b | 204.203 | 0.000 | n/a | 0.000 | 0.000 | 3.179 | 200.839 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-164/journal/page | none observed |
| 8bafba02fb063e8500000000000010c9 | 204.181 | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 203.526 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-129/journal/page | none observed |

## P3 / recovery / read (307 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.523 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.675 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 209.521 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.918 | 204.156 | 2.065 | n/a | 0.270 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000001239 | 222.194 | 0.000 | n/a | 0.000 | 0.000 | 1.379 | 220.581 | 0.006 | n/a | 0.111 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-246/journal/page | none observed |
| 8bafba02fb063e850000000000001151 | 216.092 | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 214.942 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e8500000000000011c1 | 210.135 | 0.000 | n/a | 0.000 | 0.000 | 4.850 | 205.044 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-234/journal/page | none observed |
| 8bafba02fb063e850000000000001205 | 209.521 | 0.000 | n/a | 0.000 | 0.000 | 8.347 | 200.856 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-146/journal/page | none observed |
| 8bafba02fb063e850000000000001147 | 209.106 | 0.000 | n/a | 0.000 | 0.000 | 8.212 | 200.708 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-254/journal/page | none observed |
| 8bafba02fb063e850000000000001209 | 206.558 | 0.000 | n/a | 0.000 | 0.000 | 3.456 | 202.378 | 0.037 | n/a | 0.308 | 0.000 | n/a | n/a | 0.379 | 0.000 | 0.000 | 0.379 | gw-r/thread-111/journal/page | none observed |
| 8bafba02fb063e8500000000000011e0 | 205.684 | 3.114 | n/a | 0.000 | 0.000 | 0.786 | 201.295 | 0.008 | n/a | 0.328 | 0.000 | n/a | n/a | 0.154 | 3.114 | 0.015 | 0.154 | gw-r/thread-262/journal/page | none observed |
| 8bafba02fb063e850000000000001171 | 205.046 | 0.000 | n/a | 0.000 | 0.000 | 1.928 | 202.826 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-257/journal/page | none observed |
| 8bafba02fb063e850000000000001231 | 205.036 | 0.000 | n/a | 0.000 | 0.000 | 3.997 | 200.849 | 0.005 | n/a | 0.082 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-238/journal/page | none observed |
| 8bafba02fb063e8500000000000010f2 | 205.006 | 0.000 | n/a | 0.000 | 0.000 | 4.114 | 200.714 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-127/journal/page | none observed |
| 8bafba02fb063e85000000000000123d | 204.771 | 0.000 | n/a | 0.000 | 0.000 | 2.613 | 201.825 | 0.031 | n/a | 0.103 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-241/journal/page | none observed |
| 8bafba02fb063e8500000000000011b3 | 204.771 | 0.000 | n/a | 0.000 | 0.000 | 0.451 | 204.156 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-159/journal/page | none observed |
| 8bafba02fb063e85000000000000123a | 204.705 | 0.000 | n/a | 0.000 | 0.000 | 1.341 | 203.186 | 0.004 | n/a | 0.067 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-250/journal/page | none observed |
| 8bafba02fb063e85000000000000121f | 204.658 | 0.000 | n/a | 0.000 | 0.000 | 3.737 | 200.686 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-165/journal/page | none observed |
| 8bafba02fb063e85000000000000114a | 204.615 | 0.000 | n/a | 0.000 | 0.000 | 3.819 | 200.655 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-237/journal/page | none observed |
| 8bafba02fb063e85000000000000115c | 204.559 | 0.000 | n/a | 0.000 | 0.000 | 3.608 | 200.752 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-267/journal/page | none observed |
| 8bafba02fb063e850000000000001128 | 204.556 | 0.000 | n/a | 0.000 | 0.000 | 3.669 | 200.741 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-225/journal/page | none observed |
| 8bafba02fb063e850000000000001160 | 204.422 | 0.000 | n/a | 0.000 | 0.000 | 3.442 | 200.803 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-270/journal/page | none observed |
| 8bafba02fb063e850000000000001115 | 204.316 | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 202.858 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-191/journal/page | none observed |
| 8bafba02fb063e8500000000000011cc | 204.313 | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 200.641 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 3.053 | 0.000 | 0.000 | 3.053 | gw-r/thread-229/journal/page | none observed |

## P3 / p4mix / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.427 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.585 | 200.653 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 212.973 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.179 | 204.532 | 1.650 | n/a | 0.153 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e85000000000000128a | 242.214 | 0.000 | n/a | 0.000 | 0.000 | 0.344 | 241.369 | 0.201 | n/a | 0.103 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-231/journal/page | none observed |
| 8bafba02fb063e8500000000000012ac | 218.230 | 0.000 | n/a | 0.000 | 0.000 | 5.245 | 210.852 | 0.058 | n/a | 1.753 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 | gw-r/thread-245/journal/page | none observed |
| 8bafba02fb063e8500000000000012ad | 212.973 | 0.000 | n/a | 0.000 | 0.000 | 11.462 | 201.239 | 0.021 | n/a | 0.091 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-242/journal/page | none observed |
| 8bafba02fb063e850000000000001343 | 206.096 | 0.000 | n/a | 0.000 | 0.000 | 1.368 | 204.532 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 8bafba02fb063e850000000000001267 | 204.584 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 203.975 | 0.037 | n/a | 0.047 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-113/journal/page | none observed |
| 8bafba02fb063e85000000000000125f | 204.403 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 203.640 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-276/journal/page | none observed |
| 8bafba02fb063e850000000000001295 | 204.076 | 0.000 | n/a | 0.000 | 0.000 | 3.364 | 200.581 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-216/journal/page | none observed |
| 8bafba02fb063e850000000000001303 | 204.046 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 202.861 | 0.016 | n/a | 0.049 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-188/journal/page | none observed |
| 8bafba02fb063e850000000000001315 | 203.553 | 0.000 | n/a | 0.000 | 0.000 | 1.660 | 201.642 | 0.008 | n/a | 0.153 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-232/journal/page | none observed |
| 8bafba02fb063e850000000000001258 | 203.204 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 202.608 | 0.017 | n/a | 0.072 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-181/journal/page | none observed |
| 8bafba02fb063e850000000000001338 | 202.938 | 0.000 | n/a | 0.000 | 0.000 | 2.076 | 200.681 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-235/journal/page | none observed |
| 8bafba02fb063e8500000000000012bf | 202.791 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.768 | 0.009 | n/a | 0.114 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-262/journal/page | none observed |
| 8bafba02fb063e850000000000001248 | 202.709 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 201.537 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-138/journal/page | none observed |
| 8bafba02fb063e850000000000001333 | 202.707 | 0.000 | n/a | 0.000 | 0.000 | 1.993 | 200.578 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-247/journal/page | none observed |
| 8bafba02fb063e85000000000000129e | 202.673 | 0.000 | n/a | 0.000 | 0.000 | 1.464 | 201.026 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-180/journal/page | none observed |
| 8bafba02fb063e850000000000001285 | 202.648 | 0.000 | n/a | 0.000 | 0.000 | 1.534 | 200.923 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-171/journal/page | none observed |
| 8bafba02fb063e850000000000001322 | 202.501 | 0.000 | n/a | 0.000 | 0.000 | 1.905 | 200.440 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-101/journal/page | none observed |
| 8bafba02fb063e85000000000000133e | 202.489 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.574 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-248/journal/page | none observed |
| 8bafba02fb063e85000000000000124e | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 200.874 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-141/journal/page | none observed |
| 8bafba02fb063e8500000000000012af | 202.385 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.502 | 0.020 | n/a | 0.116 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-246/journal/page | none observed |

## P3 / p4h1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.345 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.570 | 200.637 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 |
| p99 | 205.056 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.399 | 203.041 | 2.772 | n/a | 0.228 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000001452 | 205.167 | 0.000 | n/a | 0.000 | 0.000 | 4.399 | 200.609 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-119/journal/page | none observed |
| 8bafba02fb063e850000000000001365 | 205.151 | 0.000 | n/a | 0.000 | 0.000 | 1.305 | 201.651 | 0.019 | n/a | 1.983 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-283/journal/page | none observed |
| 8bafba02fb063e8500000000000013e4 | 205.056 | 0.000 | n/a | 0.000 | 0.000 | 4.023 | 200.838 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e8500000000000013da | 204.866 | 0.000 | n/a | 0.000 | 0.000 | 4.152 | 200.525 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-271/journal/page | none observed |
| 8bafba02fb063e85000000000000142c | 204.835 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 203.871 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-217/journal/page | none observed |
| 8bafba02fb063e8500000000000013a1 | 204.625 | 0.000 | n/a | 0.000 | 0.000 | 3.822 | 200.645 | 0.018 | n/a | 0.060 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-217/journal/page | none observed |
| 8bafba02fb063e850000000000001423 | 204.294 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 203.373 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-177/journal/page | none observed |
| 8bafba02fb063e850000000000001366 | 204.224 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 202.383 | 0.027 | n/a | 0.228 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | gw-r/thread-260/journal/page | none observed |
| 8bafba02fb063e8500000000000013b1 | 204.185 | 0.000 | n/a | 0.000 | 0.000 | 2.016 | 202.027 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-225/journal/page | none observed |
| 8bafba02fb063e850000000000001368 | 204.134 | 0.000 | n/a | 0.000 | 0.000 | 2.388 | 201.527 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-120/journal/page | none observed |
| 8bafba02fb063e8500000000000013c4 | 203.963 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 202.807 | 0.016 | n/a | 0.059 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-239/journal/page | none observed |
| 8bafba02fb063e85000000000000139c | 203.831 | 0.000 | n/a | 0.000 | 0.000 | 1.846 | 201.583 | 0.092 | n/a | 0.165 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-207/journal/page | none observed |
| 8bafba02fb063e8500000000000013e7 | 203.711 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 203.041 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-41/journal/page | none observed |
| 8bafba02fb063e850000000000001388 | 203.452 | 0.000 | n/a | 0.000 | 0.000 | 0.452 | 202.819 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-148/journal/page | none observed |
| 8bafba02fb063e85000000000000143e | 203.096 | 0.000 | n/a | 0.000 | 0.000 | 0.448 | 202.512 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-43/journal/page | none observed |
| 8bafba02fb063e8500000000000013f7 | 203.071 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 202.486 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-94/journal/page | none observed |
| 8bafba02fb063e850000000000001397 | 202.935 | 0.000 | n/a | 0.000 | 0.000 | 1.139 | 201.592 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-177/journal/page | none observed |
| 8bafba02fb063e8500000000000013c2 | 202.901 | 0.000 | n/a | 0.000 | 0.000 | 1.999 | 200.743 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-228/journal/page | none observed |
| 8bafba02fb063e850000000000001371 | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 1.215 | 201.428 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-127/journal/page | none observed |
| 8bafba02fb063e8500000000000013ee | 202.807 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 202.055 | 0.029 | n/a | 0.092 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-133/journal/page | none observed |

## P3 / grow3 / read (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.519 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.712 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 291.585 | n/a | n/a | n/a | 4.559 | n/a | 0.000 | 0.000 | 5.333 | 207.070 | 154.060 | n/a | 0.114 | 0.000 | n/a | n/a | 0.296 | 4.559 | 0.026 | 0.296 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000001478 | 291.585 | 3.214 | n/a | 0.000 | 0.000 | 1.727 | 207.070 | 79.300 | n/a | 0.034 | 0.000 | n/a | n/a | 0.240 | 3.214 | 0.011 | 0.240 | gw-r/thread-134/journal/page | none observed |
| 8bafba02fb063e85000000000000147d | 268.778 | 2.302 | n/a | 0.000 | 0.000 | 0.706 | 151.412 | 114.175 | n/a | 0.028 | 0.000 | n/a | n/a | 0.154 | 2.302 | 0.009 | 0.154 | gw-r/thread-140/journal/page | none observed |
| 8bafba02fb063e850000000000001458 | 206.302 | 0.000 | n/a | 0.000 | 0.000 | 5.333 | 200.762 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-78/journal/page | none observed |
| 8bafba02fb063e850000000000001465 | 204.166 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 203.143 | 0.017 | n/a | 0.090 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-97/journal/page | none observed |
| 8bafba02fb063e850000000000001470 | 203.994 | 0.000 | n/a | 0.000 | 0.000 | 2.332 | 201.335 | 0.010 | n/a | 0.114 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-270/journal/page | none observed |
| 8bafba02fb063e850000000000001469 | 202.686 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 201.710 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-145/journal/page | none observed |
| 8bafba02fb063e850000000000001460 | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 201.551 | 0.022 | n/a | 0.104 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-256/journal/page | none observed |
| 8bafba02fb063e850000000000001471 | 201.973 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 200.970 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-110/journal/page | none observed |
| 8bafba02fb063e85000000000000145d | 201.948 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 200.856 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-137/journal/page | none observed |
| 8bafba02fb063e850000000000001457 | 201.875 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.847 | 0.004 | n/a | 0.059 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-248/journal/page | none observed |
| 8bafba02fb063e850000000000001473 | 201.863 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.880 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-130/journal/page | none observed |
| 8bafba02fb063e85000000000000147a | 201.814 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 200.809 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-107/journal/page | none observed |
| 8bafba02fb063e85000000000000145c | 201.770 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.842 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-280/journal/page | none observed |
| 8bafba02fb063e85000000000000147b | 201.770 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 200.939 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-94/journal/page | none observed |
| 8bafba02fb063e850000000000001477 | 201.709 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 200.869 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-227/journal/page | none observed |
| 8bafba02fb063e850000000000001461 | 201.680 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.668 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-115/journal/page | none observed |
| 8bafba02fb063e850000000000001463 | 201.641 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.712 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-138/journal/page | none observed |
| 8bafba02fb063e850000000000001462 | 201.634 | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.783 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-123/journal/page | none observed |
| 8bafba02fb063e85000000000000146f | 201.612 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 200.846 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-46/journal/page | none observed |
| 8bafba02fb063e85000000000000146d | 201.541 | 0.000 | n/a | 0.000 | 0.000 | 0.538 | 200.823 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-87/journal/page | none observed |

## P3 / p4h3 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.330 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.626 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 |
| p99 | 205.749 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.835 | 204.408 | 5.081 | n/a | 0.165 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e85000000000000154e | 218.592 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 217.799 | 0.014 | n/a | 0.064 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-91/journal/page | none observed |
| 8bafba02fb063e850000000000001538 | 206.183 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 205.412 | 0.021 | n/a | 0.082 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e85000000000000151c | 205.749 | 0.000 | n/a | 0.000 | 0.000 | 4.346 | 201.217 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-243/journal/page | none observed |
| 8bafba02fb063e8500000000000014de | 205.199 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 204.408 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-268/journal/page | none observed |
| 8bafba02fb063e85000000000000156e | 204.568 | 0.000 | n/a | 0.000 | 0.000 | 3.776 | 200.652 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-155/journal/page | none observed |
| 8bafba02fb063e8500000000000014e5 | 204.530 | 0.000 | n/a | 0.000 | 0.000 | 3.835 | 200.512 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-167/journal/page | none observed |
| 8bafba02fb063e8500000000000014c0 | 204.369 | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 202.961 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-132/journal/page | none observed |
| 8bafba02fb063e8500000000000014b2 | 203.905 | 0.000 | n/a | 0.000 | 0.000 | 2.885 | 200.809 | 0.006 | n/a | 0.065 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-267/journal/page | none observed |
| 8bafba02fb063e8500000000000014f1 | 203.497 | 0.000 | n/a | 0.000 | 0.000 | 2.859 | 199.293 | 1.192 | n/a | 0.020 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-103/journal/page | none observed |
| 8bafba02fb063e85000000000000150f | 203.406 | 0.000 | n/a | 0.000 | 0.000 | 1.533 | 201.653 | 0.005 | n/a | 0.077 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-152/journal/page | none observed |
| 8bafba02fb063e8500000000000014d9 | 202.947 | 0.000 | n/a | 0.000 | 0.000 | 1.972 | 200.812 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-99/journal/page | none observed |
| 8bafba02fb063e850000000000001539 | 202.911 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 201.835 | 0.004 | n/a | 0.165 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-115/journal/page | none observed |
| 8bafba02fb063e850000000000001568 | 202.816 | 0.000 | n/a | 0.000 | 0.000 | 1.823 | 200.787 | 0.005 | n/a | 0.067 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-128/journal/page | none observed |
| 8bafba02fb063e8500000000000014d4 | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 202.004 | 0.016 | n/a | 0.053 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-130/journal/page | none observed |
| 8bafba02fb063e8500000000000014f7 | 202.700 | 0.000 | n/a | 0.000 | 0.000 | 1.458 | 201.057 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-80/journal/page | none observed |
| 8bafba02fb063e85000000000000153d | 202.674 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.039 | 0.009 | n/a | 0.095 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | gw-r/thread-280/journal/page | none observed |
| 8bafba02fb063e8500000000000014cf | 202.663 | 0.000 | n/a | 0.000 | 0.000 | 2.017 | 200.502 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-261/journal/page | none observed |
| 8bafba02fb063e850000000000001542 | 202.649 | 0.000 | n/a | 0.000 | 0.000 | 0.432 | 202.084 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-266/journal/page | none observed |
| 8bafba02fb063e85000000000000157c | 202.598 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.197 | 0.007 | n/a | 0.137 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-103/journal/page | none observed |
| 8bafba02fb063e850000000000001584 | 202.493 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.077 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-230/journal/page | none observed |

## P3 / grow10 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.478 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 200.606 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 274.182 | n/a | n/a | n/a | 7.932 | n/a | 0.406 | 0.000 | 6.234 | 203.899 | 108.269 | n/a | 9.233 | 0.000 | n/a | n/a | 52.010 | 7.932 | 0.051 | 52.010 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e85000000000000158c | 274.182 | 2.878 | n/a | 0.406 | 0.000 | 1.548 | 200.948 | 68.215 | n/a | 0.037 | 0.000 | n/a | n/a | 0.150 | 3.283 | 0.012 | 0.150 | gw-r/thread-151/journal/page | none observed |
| 8bafba02fb063e8500000000000015e0 | 251.815 | 5.827 | n/a | 0.000 | 0.000 | 1.217 | 162.148 | 82.478 | n/a | 0.029 | 0.000 | n/a | n/a | 0.116 | 5.827 | 0.023 | 0.116 | gw-r/thread-136/journal/page | none observed |
| 8bafba02fb063e8500000000000015a3 | 229.139 | 2.241 | n/a | 0.000 | 0.000 | 1.337 | 137.462 | 87.931 | n/a | 0.026 | 0.000 | n/a | n/a | 0.142 | 2.241 | 0.010 | 0.142 | gw-r/thread-164/journal/page | none observed |
| 8bafba02fb063e8500000000000015b4 | 205.712 | 0.000 | n/a | 0.000 | 0.000 | 1.526 | 203.899 | 0.024 | n/a | 0.123 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-238/journal/page | none observed |
| 8bafba02fb063e8500000000000015ba | 204.641 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 203.664 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-240/journal/page | none observed |
| 8bafba02fb063e8500000000000015c0 | 204.323 | 0.000 | n/a | 0.000 | 0.000 | 0.371 | 203.802 | 0.019 | n/a | 0.046 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-95/journal/page | none observed |
| 8bafba02fb063e8500000000000015de | 204.281 | 0.000 | n/a | 0.000 | 0.000 | 3.450 | 200.606 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-102/journal/page | none observed |
| 8bafba02fb063e8500000000000015b0 | 204.035 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 203.264 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-247/journal/page | none observed |
| 8bafba02fb063e8500000000000015c2 | 203.775 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 202.966 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-262/journal/page | none observed |
| 8bafba02fb063e85000000000000159f | 203.511 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 202.513 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-190/journal/page | none observed |
| 8bafba02fb063e8500000000000015a1 | 203.203 | 0.000 | n/a | 0.000 | 0.000 | 1.542 | 201.487 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-202/journal/page | none observed |
| 8bafba02fb063e8500000000000015ef | 202.785 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 201.742 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-83/journal/page | none observed |
| 8bafba02fb063e8500000000000015ea | 202.225 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 201.606 | 0.030 | n/a | 0.047 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-127/journal/page | none observed |
| 8bafba02fb063e8500000000000015b5 | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 200.800 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-235/journal/page | none observed |
| 8bafba02fb063e8500000000000015e4 | 202.105 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 201.025 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-261/journal/page | none observed |
| 8bafba02fb063e850000000000001594 | 202.043 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 200.793 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-213/journal/page | none observed |
| 8bafba02fb063e85000000000000159c | 201.964 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 200.766 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-140/journal/page | none observed |
| 8bafba02fb063e850000000000001595 | 201.961 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 201.034 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-232/journal/page | none observed |
| 8bafba02fb063e8500000000000015df | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 200.554 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-211/journal/page | none observed |
| 8bafba02fb063e8500000000000015a2 | 201.916 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 200.735 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-203/journal/page | none observed |

## P3 / p4h10 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.411 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 200.640 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 207.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.014 | 203.855 | 5.661 | n/a | 0.279 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000001613 | 229.401 | 0.000 | n/a | 0.000 | 0.000 | 27.323 | 201.909 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-170/journal/page | none observed |
| 8bafba02fb063e8500000000000016ec | 207.219 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 205.993 | 0.015 | n/a | 0.479 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-197/journal/page | none observed |
| 8bafba02fb063e850000000000001625 | 207.024 | 0.000 | n/a | 0.000 | 0.000 | 2.856 | 203.319 | 0.016 | n/a | 0.292 | 0.000 | n/a | n/a | 0.541 | 0.000 | 0.000 | 0.541 | gw-r/thread-140/journal/page | none observed |
| 8bafba02fb063e850000000000001626 | 205.221 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 203.855 | 0.005 | n/a | 0.093 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-74/journal/page | none observed |
| 8bafba02fb063e850000000000001652 | 204.895 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 204.232 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-181/journal/page | none observed |
| 8bafba02fb063e850000000000001615 | 204.883 | 0.000 | n/a | 0.000 | 0.000 | 3.669 | 201.052 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-171/journal/page | none observed |
| 8bafba02fb063e85000000000000165d | 204.821 | 0.000 | n/a | 0.000 | 0.000 | 3.915 | 200.765 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-131/journal/page | none observed |
| 8bafba02fb063e850000000000001681 | 204.413 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 203.621 | 0.016 | n/a | 0.043 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-126/journal/page | none observed |
| 8bafba02fb063e850000000000001668 | 204.375 | 0.000 | n/a | 0.000 | 0.000 | 2.607 | 201.467 | 0.016 | n/a | 0.086 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-117/journal/page | none observed |
| 8bafba02fb063e850000000000001636 | 203.920 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 199.645 | 3.496 | n/a | 0.029 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-121/journal/page | none observed |
| 8bafba02fb063e850000000000001687 | 203.839 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 202.939 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-122/journal/page | none observed |
| 8bafba02fb063e85000000000000163f | 203.707 | 0.000 | n/a | 0.000 | 0.000 | 2.862 | 200.656 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-237/journal/page | none observed |
| 8bafba02fb063e8500000000000016ac | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 202.395 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-256/journal/page | none observed |
| 8bafba02fb063e850000000000001651 | 203.431 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 202.713 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-137/journal/page | none observed |
| 8bafba02fb063e8500000000000016bb | 203.362 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 202.294 | 0.013 | n/a | 0.056 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-269/journal/page | none observed |
| 8bafba02fb063e850000000000001662 | 203.340 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 202.106 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-276/journal/page | none observed |
| 8bafba02fb063e850000000000001624 | 202.861 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.693 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-225/journal/page | none observed |
| 8bafba02fb063e8500000000000016bc | 202.810 | 0.000 | n/a | 0.000 | 0.000 | 1.958 | 200.663 | 0.016 | n/a | 0.042 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-208/journal/page | none observed |
| 8bafba02fb063e8500000000000016a2 | 202.718 | 0.000 | n/a | 0.000 | 0.000 | 1.412 | 201.134 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-235/journal/page | none observed |
| 8bafba02fb063e8500000000000016b4 | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 202.052 | 0.002 | n/a | 0.041 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-137/journal/page | none observed |

## P3 / presweep / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.652 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 200.733 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 209.545 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.091 | 204.304 | 2.714 | n/a | 0.302 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e8500000000000017e7 | 231.444 | 0.000 | n/a | 0.000 | 0.000 | 29.239 | 202.091 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-154/journal/page | none observed |
| 8bafba02fb063e8500000000000017e8 | 211.316 | 0.000 | n/a | 0.000 | 0.000 | 10.719 | 200.475 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-246/journal/page | none observed |
| 8bafba02fb063e850000000000001777 | 209.545 | 0.000 | n/a | 0.000 | 0.000 | 3.468 | 204.546 | 0.006 | n/a | 1.375 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-195/journal/page | none observed |
| 8bafba02fb063e850000000000001776 | 207.220 | 0.000 | n/a | 0.000 | 0.000 | 3.594 | 203.156 | 0.031 | n/a | 0.195 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-173/journal/page | none observed |
| 8bafba02fb063e850000000000001773 | 205.625 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 204.557 | 0.017 | n/a | 0.156 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-114/journal/page | none observed |
| 8bafba02fb063e85000000000000178f | 205.586 | 0.000 | n/a | 0.000 | 0.000 | 3.186 | 202.081 | 0.083 | n/a | 0.099 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-206/journal/page | none observed |
| 8bafba02fb063e8500000000000017f3 | 205.365 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 204.304 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-269/journal/page | none observed |
| 8bafba02fb063e850000000000001790 | 205.225 | 0.000 | n/a | 0.000 | 0.000 | 2.789 | 202.047 | 0.016 | n/a | 0.243 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-215/journal/page | none observed |
| 8bafba02fb063e850000000000001782 | 205.200 | 0.000 | n/a | 0.000 | 0.000 | 1.067 | 203.897 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-94/journal/page | none observed |
| 8bafba02fb063e850000000000001789 | 205.068 | 0.000 | n/a | 0.000 | 0.000 | 4.094 | 200.751 | 0.005 | n/a | 0.107 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-170/journal/page | none observed |
| 8bafba02fb063e8500000000000017ae | 205.062 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 203.732 | 0.031 | n/a | 0.097 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-245/journal/page | none observed |
| 8bafba02fb063e850000000000001721 | 205.024 | 0.000 | n/a | 0.000 | 0.000 | 1.058 | 203.785 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-242/journal/page | none observed |
| 8bafba02fb063e85000000000000173e | 204.997 | 0.000 | n/a | 0.000 | 0.000 | 0.477 | 204.286 | 0.017 | n/a | 0.052 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-258/journal/page | none observed |
| 8bafba02fb063e850000000000001796 | 204.915 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 204.240 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-214/journal/page | none observed |
| 8bafba02fb063e850000000000001750 | 204.790 | 0.000 | n/a | 0.000 | 0.000 | 3.945 | 200.653 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-133/journal/page | none observed |
| 8bafba02fb063e85000000000000173a | 204.449 | 0.000 | n/a | 0.000 | 0.000 | 2.825 | 201.463 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-271/journal/page | none observed |
| 8bafba02fb063e850000000000001783 | 204.381 | 0.000 | n/a | 0.000 | 0.000 | 1.437 | 202.780 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-79/journal/page | none observed |
| 8bafba02fb063e8500000000000017ac | 204.375 | 0.000 | n/a | 0.000 | 0.000 | 3.493 | 200.653 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-178/journal/page | none observed |
| 8bafba02fb063e8500000000000017e9 | 204.291 | 0.000 | n/a | 0.000 | 0.000 | 2.844 | 201.281 | 0.020 | n/a | 0.052 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 8bafba02fb063e850000000000001720 | 204.109 | 0.000 | n/a | 0.000 | 0.000 | 3.062 | 200.888 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-228/journal/page | none observed |

## P3 / sweep / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.813 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 200.998 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 205.878 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.999 | 204.206 | 0.033 | n/a | 0.125 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8bafba02fb063e850000000000001800 | 205.878 | 0.000 | n/a | 0.000 | 0.000 | 1.221 | 204.206 | 0.033 | n/a | 0.117 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-265/journal/page | none observed |
| 8bafba02fb063e850000000000001805 | 203.680 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 202.766 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-233/journal/page | none observed |
| 8bafba02fb063e850000000000001806 | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 1.999 | 200.672 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-170/journal/page | none observed |
| 8bafba02fb063e850000000000001802 | 202.813 | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 201.300 | 0.009 | n/a | 0.125 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-147/journal/page | none observed |
| 8bafba02fb063e850000000000001807 | 202.184 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 200.998 | 0.014 | n/a | 0.073 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-188/journal/page | none observed |
| 8bafba02fb063e850000000000001803 | 201.511 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 200.715 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-268/journal/page | none observed |
| 8bafba02fb063e850000000000001804 | 153.095 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 152.437 | 0.012 | n/a | 0.015 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-192/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
