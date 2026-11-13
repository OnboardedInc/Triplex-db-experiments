# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.scheduler-late` (650.610 ms, trace `72eca93608e3b9f70000000000000096`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (254.426 ms, trace `72eca93608e3b9f700000000000000c1`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (245.685 ms, trace `72eca93608e3b9f70000000000000114`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (183.097 ms, trace `72eca93608e3b9f700000000000000c7`); `node-14/thread-0/client.commit-send-queue` (125.100 ms, trace `72eca93608e3b9f7000000000000010d`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-h`; source `4d7774cef1c9ec68c2ad94c7fd575fde888d5999`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 95/95 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 95/95. Raw trace bytes: 833198.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 124 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1990.805 | 266.467 | 354.697 | 50 |
| baseline | 0 | 1960.506 | 70.075 | 0.678 | 44 |
| L1 | 1 | 1963.395 | 209.346 | 45.001 | 44 |
| L4 | 4 | 1863.186 | 302.208 | 236.733 | 30 |
| L16 | 16 | 1938.993 | 298.473 | 264.010 | 44 |
| L64 | 16 | 1964.444 | 227.060 | 210.918 | 44 |
| L256 | 16 | 1837.929 | 280.598 | 211.645 | 44 |
| L1024 | 16 | 1931.179 | 281.318 | 308.804 | 16 |
| recovery | 16 | 1821.517 | 256.206 | 243.285 | 66 |
| p4mix | 1 | 1934.245 | 66.427 | 20.722 | 30 |
| p4h1 | 1 | 2508.160 | 108.275 | 48.037 | 80 |
| grow3 | 0 | 2232.453 | 524.504 | 1.832 | 128 |
| p4h3 | 1 | 2492.824 | 163.597 | 35.123 | 80 |
| grow10 | 0 | 1046.497 | 273.989 | 17.542 | 30 |
| p4h10 | 1 | 2695.014 | 94.215 | 23.424 | 71 |
| presweep | 16 | 1942.815 | 261.623 | 335.295 | 25 |
| sweep | 16 | 198.252 | 55.613 | 45.940 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 72eca93608e3b9f70000000000000096 | driver.queue.scheduler-late | 650.610 | none | 0 / 32 |
| 72eca93608e3b9f70000000000000096 | driver.queue.scheduler-dispatch | 0.188 | none | 0 / 32 |

Observed active steps while trace 72eca93608e3b9f70000000000000096 waited: []

| 72eca93608e3b9f700000000000000c1 | driver.queue.scheduler-late | 0.423 | none | 0 / 32 |
| 72eca93608e3b9f700000000000000c1 | driver.queue.scheduler-dispatch | 0.114 | none | 0 / 32 |

Observed active steps while trace 72eca93608e3b9f700000000000000c1 waited: []

| 72eca93608e3b9f70000000000000114 | driver.queue.scheduler-late | 0.283 | none | 0 / 32 |
| 72eca93608e3b9f70000000000000114 | driver.queue.scheduler-dispatch | 0.103 | none | 0 / 32 |

Observed active steps while trace 72eca93608e3b9f70000000000000114 waited: []

| 72eca93608e3b9f700000000000000c7 | driver.queue.scheduler-late | 0.572 | none | 0 / 32 |
| 72eca93608e3b9f700000000000000c7 | driver.queue.scheduler-dispatch | 0.085 | none | 0 / 32 |

Observed active steps while trace 72eca93608e3b9f700000000000000c7 waited: []

| 72eca93608e3b9f7000000000000010d | driver.queue.scheduler-late | 2.121 | none | 0 / 32 |
| 72eca93608e3b9f7000000000000010d | driver.queue.scheduler-dispatch | 0.066 | none | 0 / 32 |

Observed active steps while trace 72eca93608e3b9f7000000000000010d waited: []

## P2 / outside-phases / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.750 | 0.722 | 0.000 | 0.850 | 6.743 | 0.213 | 0.000 | 0.132 | 1.961 | 5.647 | 0.082 | n/a | 1.755 | 25.686 | n/a | n/a | 0.088 | 7.786 | 0.165 | 0.088 |
| p99 | 723.183 | 3.831 | 0.301 | 9.891 | 26.730 | 2.805 | 0.576 | 650.798 | 28.779 | 35.421 | 0.226 | n/a | 6.046 | 48.429 | n/a | n/a | 0.448 | 677.563 | 0.937 | 0.448 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000096 | 723.183 | 26.730 | 0.035 | 0.000 | 650.798 | 1.860 | 5.403 | 0.226 | n/a | 3.941 | 33.742 | n/a | n/a | 0.448 | 677.563 | 0.937 | 0.448 | node-14/thread-0/driver.queue.scheduler-late | driver.worker-message 0.594ms |
| 72eca93608e3b9f70000000000000143 | 96.484 | 9.148 | 0.328 | 0.438 | 0.132 | 1.961 | 35.421 | 0.132 | n/a | 0.407 | 48.429 | n/a | n/a | 0.088 | 10.046 | 0.104 | 0.088 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000145 | 89.990 | 9.135 | 0.387 | 0.576 | 0.133 | 28.779 | 13.870 | 0.073 | n/a | 0.444 | 36.515 | n/a | n/a | 0.078 | 10.231 | 0.114 | 0.078 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000146 | 67.134 | 6.743 | 0.012 | 0.000 | 1.030 | 2.307 | 15.344 | 0.083 | n/a | 0.304 | 41.190 | n/a | n/a | 0.121 | 7.786 | 0.116 | 0.121 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000eb | 64.596 | 9.227 | 2.805 | 0.491 | 0.119 | 2.521 | 27.406 | 0.074 | n/a | 2.246 | 19.599 | n/a | n/a | 0.107 | 12.643 | 0.196 | 0.107 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000ed | 51.988 | 10.574 | 0.286 | 0.000 | 0.076 | 3.001 | 13.130 | 0.082 | n/a | 0.817 | 23.967 | n/a | n/a | 0.055 | 10.936 | 0.210 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000120 | 46.750 | 8.286 | 0.362 | 0.448 | 0.114 | 3.926 | 4.648 | 0.209 | n/a | 1.755 | 26.890 | n/a | n/a | 0.113 | 9.210 | 0.197 | 0.113 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000011b | 42.645 | 6.313 | 0.008 | 0.000 | 0.726 | 1.025 | 1.484 | 0.044 | n/a | 6.046 | 26.862 | n/a | n/a | 0.137 | 7.047 | 0.165 | 0.137 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000011e | 40.317 | 4.270 | 0.213 | 0.000 | 0.103 | 1.952 | 5.647 | 0.161 | n/a | 2.239 | 25.686 | n/a | n/a | 0.048 | 4.585 | 0.114 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000148 | 34.412 | 4.220 | 0.007 | 0.000 | 0.650 | 1.389 | 5.035 | 0.073 | n/a | 0.883 | 22.105 | n/a | n/a | 0.051 | 4.877 | 0.142 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000011a | 33.346 | 5.512 | 0.406 | 0.000 | 0.085 | 3.029 | 12.744 | 0.153 | n/a | 2.277 | 9.078 | n/a | n/a | 0.061 | 6.004 | 0.180 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000140 | 27.550 | 5.873 | 0.011 | 0.000 | 0.385 | 1.832 | 5.157 | 0.079 | n/a | 2.774 | 11.313 | n/a | n/a | 0.126 | 6.269 | 0.228 | 0.126 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.090 | n/a | n/a | n/a | 13.585 | 1.497 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 14.059 | 0.998 | 0.024 |
| p99 | 235.022 | n/a | n/a | n/a | 146.436 | 33.221 | 32.472 | 0.000 | 2.104 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.075 | 183.142 | 0.999 | 50.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000c2 | 235.022 | 146.436 | 4.234 | 32.472 | 0.000 | 1.806 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.075 | 183.142 | 0.779 | 50.075 | node-14/thread-3/worker.gateway-observer.observe | driver.worker-message 1.306ms; driver.worker-message 0.730ms |
| 72eca93608e3b9f70000000000000115 | 70.610 | 22.636 | 33.221 | 1.848 | 0.000 | 1.861 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.044 | 57.705 | 0.817 | 11.044 | node-14/thread-0/rpc.gateway-observer.observe | client.encode 3.907ms |
| 72eca93608e3b9f70000000000000097 | 55.930 | 52.426 | 1.497 | 1.896 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.110 | 55.820 | 0.998 | 0.110 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f70000000000000128 | 54.765 | 31.342 | 1.178 | 2.799 | 0.000 | 2.104 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.344 | 35.318 | 0.645 | 17.344 | node-14/thread-3/socket.wait-first-byte | none observed |
| 72eca93608e3b9f700000000000000cc | 41.086 | 15.144 | 1.676 | 0.000 | 0.000 | 0.818 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.448 | 16.820 | 0.409 | 23.448 | node-14/thread-3/socket.wait-first-byte | none observed |
| 72eca93608e3b9f7000000000000012c | 35.059 | 34.924 | 0.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 35.035 | 0.999 | 0.024 | node-14/thread-2/replica.pull-at | driver.publication 1.477ms |
| 72eca93608e3b9f700000000000000f9 | 20.077 | 16.235 | 2.237 | 1.585 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 20.057 | 0.999 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f700000000000000f2 | 15.794 | 15.623 | 0.147 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 15.770 | 0.998 | 0.024 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f700000000000000dd | 14.811 | 14.296 | 0.477 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 14.773 | 0.997 | 0.038 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f700000000000000cf | 14.158 | 2.361 | 11.783 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 14.145 | 0.999 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| 72eca93608e3b9f70000000000000122 | 14.090 | 13.885 | 0.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 14.059 | 0.998 | 0.031 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f7000000000000011c | 13.925 | 0.502 | 13.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 13.911 | 0.999 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| 72eca93608e3b9f7000000000000014b | 13.895 | 13.585 | 0.267 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.043 | 13.852 | 0.997 | 0.043 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f7000000000000010c | 13.223 | 6.637 | 6.564 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 13.201 | 0.998 | 0.021 | node-14/thread-0/rpc.replica.observe | client.parse 2.052ms |
| 72eca93608e3b9f700000000000000e6 | 12.559 | 12.444 | 0.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 12.545 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f700000000000000ef | 12.115 | 11.939 | 0.161 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 12.100 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f700000000000000db | 10.017 | 0.835 | 9.164 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 9.999 | 0.998 | 0.018 | node-14/thread-0/rpc.replica.observe | none observed |
| 72eca93608e3b9f70000000000000138 | 9.372 | 9.205 | 0.131 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.035 | 9.337 | 0.996 | 0.035 | node-14/thread-2/replica.pull-at | none observed |
| 72eca93608e3b9f700000000000000a5 | 8.638 | 0.612 | 8.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.625 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| 72eca93608e3b9f700000000000000ab | 8.300 | 0.789 | 7.488 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 8.277 | 0.997 | 0.023 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.324 | 1.282 | 0.000 | 1.378 | 11.105 | 0.009 | 0.000 | 0.174 | 3.239 | 6.904 | 0.151 | n/a | 1.953 | 14.533 | n/a | n/a | 0.070 | 12.484 | 0.295 | 0.070 |
| p99 | 101.772 | 1.321 | 0.161 | 22.173 | 29.741 | 1.535 | 0.000 | 1.308 | 6.042 | 28.742 | 0.649 | n/a | 2.573 | 36.758 | n/a | n/a | 0.159 | 31.397 | 0.572 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f7000000000000009b | 101.772 | 29.741 | 1.535 | 0.000 | 0.121 | 3.435 | 28.742 | 0.649 | n/a | 0.721 | 36.758 | n/a | n/a | 0.070 | 31.397 | 0.309 | 0.070 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000098 | 56.096 | 6.923 | 0.009 | 0.000 | 0.850 | 3.239 | 6.933 | 0.101 | n/a | 2.573 | 35.406 | n/a | n/a | 0.063 | 7.781 | 0.139 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000009c | 51.324 | 28.020 | 0.009 | 0.000 | 1.308 | 1.549 | 5.157 | 0.287 | n/a | 1.953 | 12.882 | n/a | n/a | 0.159 | 29.337 | 0.572 | 0.159 | node-14/thread-0/driver.publication | none observed |
| 72eca93608e3b9f7000000000000009f | 42.284 | 11.105 | 1.205 | 0.000 | 0.174 | 6.042 | 6.904 | 0.151 | n/a | 2.028 | 14.533 | n/a | n/a | 0.142 | 12.484 | 0.295 | 0.142 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.324 | 1.124 | 0.000 | 3.749 | 6.923 | 0.009 | 0.000 | 0.850 | 1.549 | 5.157 | 0.101 | n/a | 1.953 | 12.882 | n/a | n/a | 0.063 | 7.781 | 0.139 | 0.063 |
| p99 | 56.096 | 1.294 | 0.161 | 22.173 | 28.020 | 0.009 | 0.000 | 1.308 | 3.239 | 6.933 | 0.287 | n/a | 2.573 | 35.406 | n/a | n/a | 0.159 | 29.337 | 0.572 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000098 | 56.096 | 6.923 | 0.009 | 0.000 | 0.850 | 3.239 | 6.933 | 0.101 | n/a | 2.573 | 35.406 | n/a | n/a | 0.063 | 7.781 | 0.139 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000009c | 51.324 | 28.020 | 0.009 | 0.000 | 1.308 | 1.549 | 5.157 | 0.287 | n/a | 1.953 | 12.882 | n/a | n/a | 0.159 | 29.337 | 0.572 | 0.159 | node-14/thread-0/driver.publication | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.153 | 0.732 | 0.000 | 1.089 | 6.551 | 0.014 | 0.000 | 0.124 | 3.726 | 2.123 | 0.066 | n/a | 0.425 | 11.188 | n/a | n/a | 0.087 | 7.290 | 0.270 | 0.087 |
| p99 | 39.469 | 1.347 | 0.000 | 1.979 | 12.319 | 0.374 | 0.000 | 1.039 | 4.829 | 5.640 | 0.129 | n/a | 0.707 | 18.284 | n/a | n/a | 0.292 | 12.702 | 0.367 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000a7 | 39.469 | 10.647 | 0.374 | 0.000 | 0.124 | 4.829 | 4.602 | 0.066 | n/a | 0.425 | 18.284 | n/a | n/a | 0.119 | 11.145 | 0.282 | 0.119 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000a3 | 34.586 | 12.319 | 0.266 | 0.000 | 0.117 | 4.289 | 5.640 | 0.084 | n/a | 0.391 | 11.188 | n/a | n/a | 0.292 | 12.702 | 0.367 | 0.292 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000a4 | 27.153 | 6.551 | 0.014 | 0.000 | 0.726 | 1.016 | 2.123 | 0.129 | n/a | 0.499 | 16.009 | n/a | n/a | 0.087 | 7.290 | 0.268 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000a1 | 21.487 | 4.746 | 0.007 | 0.000 | 1.039 | 3.726 | 1.288 | 0.055 | n/a | 0.707 | 9.870 | n/a | n/a | 0.049 | 5.792 | 0.270 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.487 | 1.347 | 0.000 | 1.864 | 4.746 | 0.007 | 0.000 | 1.039 | 3.726 | 1.288 | 0.055 | n/a | 0.707 | 9.870 | n/a | n/a | 0.049 | 5.792 | 0.270 | 0.049 |
| p99 | 21.487 | 1.347 | 0.000 | 1.864 | 4.746 | 0.007 | 0.000 | 1.039 | 3.726 | 1.288 | 0.055 | n/a | 0.707 | 9.870 | n/a | n/a | 0.049 | 5.792 | 0.270 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000a1 | 21.487 | 4.746 | 0.007 | 0.000 | 1.039 | 3.726 | 1.288 | 0.055 | n/a | 0.707 | 9.870 | n/a | n/a | 0.049 | 5.792 | 0.270 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.043 | 0.861 | 0.000 | 0.626 | 9.142 | 0.012 | 0.000 | 0.112 | 3.459 | 5.623 | 0.078 | n/a | 0.810 | 12.999 | n/a | n/a | 0.045 | 9.903 | 0.232 | 0.045 |
| p99 | 137.465 | 3.716 | 0.000 | 8.106 | 13.257 | 1.234 | 0.000 | 0.754 | 4.181 | 20.045 | 0.532 | n/a | 4.449 | 93.436 | n/a | n/a | 0.219 | 14.603 | 0.295 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000b0 | 137.465 | 13.257 | 1.234 | 0.000 | 0.112 | 4.181 | 20.045 | 0.532 | n/a | 4.449 | 93.436 | n/a | n/a | 0.219 | 14.603 | 0.106 | 0.219 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.worker-message 2.761ms |
| 72eca93608e3b9f700000000000000ad | 56.856 | 12.427 | 0.012 | 0.000 | 0.754 | 3.459 | 5.623 | 0.218 | n/a | 1.021 | 33.299 | n/a | n/a | 0.045 | 13.192 | 0.232 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000a9 | 34.043 | 9.142 | 0.007 | 0.000 | 0.754 | 1.104 | 9.461 | 0.078 | n/a | 0.400 | 12.999 | n/a | n/a | 0.098 | 9.903 | 0.291 | 0.098 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000aa | 29.168 | 7.693 | 0.834 | 0.000 | 0.086 | 3.534 | 4.673 | 0.077 | n/a | 0.810 | 11.416 | n/a | n/a | 0.045 | 8.613 | 0.295 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.780ms; driver.expected-state.bind-receipt 1.038ms |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.646 | 0.523 | 0.000 | 0.698 | 6.799 | 0.458 | 0.000 | 0.082 | 4.428 | 4.665 | 0.125 | n/a | 6.603 | 22.024 | n/a | n/a | 0.053 | 7.533 | 0.122 | 0.053 |
| p99 | 77.020 | 1.331 | 0.000 | 2.762 | 8.610 | 0.656 | 0.000 | 0.490 | 13.804 | 7.344 | 0.181 | n/a | 10.707 | 53.760 | n/a | n/a | 0.057 | 9.151 | 0.146 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000b2 | 77.020 | 8.610 | 0.458 | 0.000 | 0.082 | 4.428 | 4.665 | 0.125 | n/a | 4.852 | 53.760 | n/a | n/a | 0.039 | 9.151 | 0.119 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000b7 | 61.646 | 6.799 | 0.656 | 0.000 | 0.078 | 13.804 | 7.344 | 0.181 | n/a | 10.707 | 22.024 | n/a | n/a | 0.053 | 7.533 | 0.122 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000b5 | 38.372 | 5.106 | 0.006 | 0.000 | 0.490 | 2.926 | 2.233 | 0.058 | n/a | 6.603 | 20.894 | n/a | n/a | 0.057 | 5.603 | 0.146 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.372 | 1.331 | 0.000 | 2.762 | 5.106 | 0.006 | 0.000 | 0.490 | 2.926 | 2.233 | 0.058 | n/a | 6.603 | 20.894 | n/a | n/a | 0.057 | 5.603 | 0.146 | 0.057 |
| p99 | 38.372 | 1.331 | 0.000 | 2.762 | 5.106 | 0.006 | 0.000 | 0.490 | 2.926 | 2.233 | 0.058 | n/a | 6.603 | 20.894 | n/a | n/a | 0.057 | 5.603 | 0.146 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000b5 | 38.372 | 5.106 | 0.006 | 0.000 | 0.490 | 2.926 | 2.233 | 0.058 | n/a | 6.603 | 20.894 | n/a | n/a | 0.057 | 5.603 | 0.146 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.443 | 1.303 | 0.000 | 1.616 | 10.623 | 0.021 | 0.000 | 0.130 | 2.590 | 4.008 | 0.078 | n/a | 3.414 | 14.627 | n/a | n/a | 0.054 | 11.741 | 0.263 | 0.054 |
| p99 | 83.649 | 4.242 | 2.380 | 8.489 | 16.136 | 0.435 | 4.388 | 1.090 | 7.210 | 5.244 | 0.119 | n/a | 7.551 | 48.826 | n/a | n/a | 0.585 | 21.634 | 0.318 | 0.585 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000bd | 83.649 | 16.136 | 0.021 | 4.388 | 1.090 | 1.171 | 5.022 | 0.094 | n/a | 6.317 | 48.826 | n/a | n/a | 0.585 | 21.634 | 0.259 | 0.585 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000b8 | 49.331 | 12.637 | 0.012 | 0.000 | 0.952 | 2.590 | 1.531 | 0.078 | n/a | 7.551 | 23.888 | n/a | n/a | 0.091 | 13.601 | 0.276 | 0.091 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000bb | 39.443 | 10.015 | 0.241 | 0.000 | 0.130 | 7.210 | 5.244 | 0.119 | n/a | 3.414 | 13.016 | n/a | n/a | 0.054 | 10.386 | 0.263 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.601ms |
| 72eca93608e3b9f700000000000000c0 | 36.968 | 10.623 | 0.435 | 0.601 | 0.083 | 6.159 | 4.008 | 0.069 | n/a | 0.317 | 14.627 | n/a | n/a | 0.046 | 11.741 | 0.318 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.331 | 1.303 | 0.088 | 7.156 | 12.637 | 0.012 | 0.000 | 0.952 | 2.590 | 1.531 | 0.078 | n/a | 7.551 | 23.888 | n/a | n/a | 0.091 | 13.601 | 0.276 | 0.091 |
| p99 | 49.331 | 1.303 | 0.088 | 7.156 | 12.637 | 0.012 | 0.000 | 0.952 | 2.590 | 1.531 | 0.078 | n/a | 7.551 | 23.888 | n/a | n/a | 0.091 | 13.601 | 0.276 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000b8 | 49.331 | 12.637 | 0.012 | 0.000 | 0.952 | 2.590 | 1.531 | 0.078 | n/a | 7.551 | 23.888 | n/a | n/a | 0.091 | 13.601 | 0.276 | 0.091 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 162.969 | 0.595 | 0.000 | 0.747 | 6.471 | 0.019 | 0.000 | 0.131 | 2.578 | 25.556 | 0.099 | n/a | 0.585 | 56.724 | n/a | n/a | 0.053 | 7.608 | 0.041 | 0.053 |
| p99 | 327.052 | 1.879 | 0.000 | 2.908 | 11.336 | 0.492 | 0.629 | 0.658 | 5.334 | 94.749 | 0.301 | n/a | 4.816 | 254.426 | n/a | n/a | 0.086 | 11.959 | 0.129 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000c1 | 327.052 | 5.759 | 0.008 | 0.000 | 0.537 | 1.479 | 64.321 | 0.085 | n/a | 0.385 | 254.426 | n/a | n/a | 0.053 | 6.304 | 0.019 | 0.053 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000c7 | 210.792 | 8.036 | 0.019 | 0.000 | 0.658 | 5.334 | 8.684 | 0.099 | n/a | 4.816 | 183.097 | n/a | n/a | 0.048 | 8.713 | 0.041 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000ca | 162.969 | 6.471 | 0.442 | 0.629 | 0.065 | 2.578 | 94.749 | 0.301 | n/a | 0.941 | 56.724 | n/a | n/a | 0.070 | 7.608 | 0.047 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000c5 | 92.596 | 11.336 | 0.492 | 0.000 | 0.131 | 2.746 | 25.556 | 0.247 | n/a | 0.585 | 51.417 | n/a | n/a | 0.086 | 11.959 | 0.129 | 0.086 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 210.792 | 0.595 | 0.000 | 2.318 | 5.759 | 0.008 | 0.000 | 0.537 | 1.479 | 8.684 | 0.085 | n/a | 0.385 | 183.097 | n/a | n/a | 0.048 | 6.304 | 0.019 | 0.048 |
| p99 | 327.052 | 1.879 | 0.000 | 2.908 | 8.036 | 0.019 | 0.000 | 0.658 | 5.334 | 64.321 | 0.099 | n/a | 4.816 | 254.426 | n/a | n/a | 0.053 | 8.713 | 0.041 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000c1 | 327.052 | 5.759 | 0.008 | 0.000 | 0.537 | 1.479 | 64.321 | 0.085 | n/a | 0.385 | 254.426 | n/a | n/a | 0.053 | 6.304 | 0.019 | 0.053 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000c7 | 210.792 | 8.036 | 0.019 | 0.000 | 0.658 | 5.334 | 8.684 | 0.099 | n/a | 4.816 | 183.097 | n/a | n/a | 0.048 | 8.713 | 0.041 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.050 | 0.762 | 0.000 | 1.692 | 8.745 | 0.030 | 0.000 | 0.106 | 1.683 | 11.070 | 0.078 | n/a | 0.876 | 31.760 | n/a | n/a | 0.047 | 9.240 | 0.180 | 0.047 |
| p99 | 122.039 | 2.352 | 5.940 | 6.592 | 27.799 | 2.728 | 0.594 | 0.739 | 2.924 | 16.088 | 5.401 | n/a | 2.113 | 97.867 | n/a | n/a | 0.206 | 30.590 | 0.369 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000cb | 122.039 | 8.745 | 0.030 | 0.000 | 0.465 | 1.683 | 12.339 | 0.078 | n/a | 0.685 | 97.867 | n/a | n/a | 0.147 | 9.240 | 0.076 | 0.147 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000d1 | 83.001 | 27.799 | 2.728 | 0.000 | 0.063 | 2.924 | 16.088 | 0.186 | n/a | 1.413 | 31.760 | n/a | n/a | 0.040 | 30.590 | 0.369 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.724ms |
| 72eca93608e3b9f700000000000000d4 | 71.050 | 10.846 | 1.213 | 0.594 | 0.106 | 2.444 | 11.070 | 5.401 | n/a | 0.876 | 38.451 | n/a | n/a | 0.047 | 12.760 | 0.180 | 0.047 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000ce | 19.216 | 3.596 | 0.016 | 0.000 | 0.739 | 1.067 | 1.592 | 0.040 | n/a | 2.113 | 9.848 | n/a | n/a | 0.206 | 4.352 | 0.226 | 0.206 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.216 | 0.762 | 0.000 | 1.692 | 3.596 | 0.016 | 0.000 | 0.465 | 1.067 | 1.592 | 0.040 | n/a | 0.685 | 9.848 | n/a | n/a | 0.147 | 4.352 | 0.076 | 0.147 |
| p99 | 122.039 | 2.352 | 0.000 | 3.445 | 8.745 | 0.030 | 0.000 | 0.739 | 1.683 | 12.339 | 0.078 | n/a | 2.113 | 97.867 | n/a | n/a | 0.206 | 9.240 | 0.226 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000cb | 122.039 | 8.745 | 0.030 | 0.000 | 0.465 | 1.683 | 12.339 | 0.078 | n/a | 0.685 | 97.867 | n/a | n/a | 0.147 | 9.240 | 0.076 | 0.147 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000ce | 19.216 | 3.596 | 0.016 | 0.000 | 0.739 | 1.067 | 1.592 | 0.040 | n/a | 2.113 | 9.848 | n/a | n/a | 0.206 | 4.352 | 0.226 | 0.206 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.859 | 0.000 | 0.000 | 0.373 | 7.483 | 0.334 | 0.000 | 0.092 | 2.223 | 20.405 | 0.377 | n/a | 0.500 | 17.566 | n/a | n/a | 0.055 | 7.959 | 0.045 | 0.055 |
| p99 | 178.634 | 0.472 | 0.000 | 0.382 | 9.701 | 3.477 | 0.000 | 0.142 | 2.687 | 34.988 | 0.549 | n/a | 0.886 | 131.974 | n/a | n/a | 0.055 | 13.269 | 0.242 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000d9 | 178.634 | 7.483 | 0.334 | 0.000 | 0.142 | 2.223 | 34.988 | 0.549 | n/a | 0.886 | 131.974 | n/a | n/a | 0.055 | 7.959 | 0.045 | 0.055 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000d6 | 54.859 | 9.701 | 3.477 | 0.000 | 0.092 | 2.687 | 20.405 | 0.377 | n/a | 0.500 | 17.566 | n/a | n/a | 0.055 | 13.269 | 0.242 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.931 | 1.300 | 0.000 | 0.726 | 6.984 | 0.014 | 0.000 | 0.223 | 3.850 | 32.352 | 0.200 | n/a | 1.159 | 32.464 | n/a | n/a | 0.089 | 8.120 | 0.114 | 0.089 |
| p99 | 195.644 | 2.431 | 0.000 | 2.999 | 14.589 | 0.911 | 0.000 | 1.716 | 11.070 | 38.458 | 0.409 | n/a | 4.606 | 139.590 | n/a | n/a | 0.118 | 16.318 | 0.238 | 0.118 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000df | 195.644 | 11.973 | 0.323 | 0.000 | 0.078 | 3.850 | 38.458 | 0.409 | n/a | 0.910 | 139.590 | n/a | n/a | 0.053 | 12.374 | 0.063 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.worker-message 2.867ms; driver.worker-message 0.782ms |
| 72eca93608e3b9f700000000000000e0 | 117.706 | 14.589 | 0.013 | 0.000 | 1.716 | 11.070 | 33.883 | 0.361 | n/a | 2.146 | 53.840 | n/a | n/a | 0.089 | 16.318 | 0.139 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000e2 | 67.931 | 5.762 | 0.911 | 0.000 | 0.071 | 3.840 | 32.352 | 0.200 | n/a | 0.552 | 24.124 | n/a | n/a | 0.118 | 6.744 | 0.099 | 0.118 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000da | 59.386 | 6.562 | 0.014 | 0.000 | 0.223 | 9.274 | 6.043 | 0.155 | n/a | 4.606 | 32.464 | n/a | n/a | 0.045 | 6.799 | 0.114 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000dc | 34.093 | 6.984 | 0.008 | 0.000 | 1.128 | 1.890 | 1.858 | 0.043 | n/a | 1.159 | 20.920 | n/a | n/a | 0.104 | 8.120 | 0.238 | 0.104 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.093 | 1.300 | 0.000 | 0.510 | 6.984 | 0.008 | 0.000 | 1.128 | 1.890 | 1.858 | 0.043 | n/a | 1.159 | 20.920 | n/a | n/a | 0.089 | 8.120 | 0.139 | 0.089 |
| p99 | 117.706 | 1.682 | 0.000 | 2.999 | 14.589 | 0.013 | 0.000 | 1.716 | 11.070 | 33.883 | 0.361 | n/a | 2.146 | 53.840 | n/a | n/a | 0.104 | 16.318 | 0.238 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000e0 | 117.706 | 14.589 | 0.013 | 0.000 | 1.716 | 11.070 | 33.883 | 0.361 | n/a | 2.146 | 53.840 | n/a | n/a | 0.089 | 16.318 | 0.139 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000dc | 34.093 | 6.984 | 0.008 | 0.000 | 1.128 | 1.890 | 1.858 | 0.043 | n/a | 1.159 | 20.920 | n/a | n/a | 0.104 | 8.120 | 0.238 | 0.104 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.459 | 0.979 | 0.000 | 0.860 | 8.501 | 1.919 | 0.000 | 0.116 | 2.120 | 6.563 | 0.094 | n/a | 0.487 | 31.154 | n/a | n/a | 0.059 | 11.469 | 0.221 | 0.059 |
| p99 | 55.271 | 2.063 | 2.475 | 5.030 | 10.137 | 3.605 | 0.000 | 1.322 | 2.273 | 8.668 | 0.127 | n/a | 1.262 | 33.224 | n/a | n/a | 0.199 | 12.213 | 0.256 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000e8 | 55.271 | 8.501 | 3.605 | 0.000 | 0.107 | 2.120 | 6.159 | 0.094 | n/a | 1.262 | 33.224 | n/a | n/a | 0.199 | 12.213 | 0.221 | 0.199 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000e4 | 51.459 | 6.930 | 1.919 | 0.000 | 0.116 | 2.273 | 8.668 | 0.071 | n/a | 0.268 | 31.154 | n/a | n/a | 0.059 | 8.965 | 0.174 | 0.059 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000e5 | 44.870 | 10.137 | 0.011 | 0.000 | 1.322 | 1.241 | 6.563 | 0.127 | n/a | 0.487 | 24.930 | n/a | n/a | 0.054 | 11.469 | 0.256 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.348 | 0.567 | 0.000 | 2.889 | 8.627 | 0.013 | 0.000 | 0.588 | 1.829 | 6.022 | 0.104 | n/a | 0.393 | 25.979 | n/a | n/a | 0.051 | 9.786 | 0.204 | 0.051 |
| p99 | 113.239 | 2.360 | 2.789 | 4.902 | 11.283 | 0.512 | 0.639 | 1.429 | 2.829 | 18.310 | 0.191 | n/a | 1.438 | 91.016 | n/a | n/a | 0.266 | 12.534 | 0.324 | 0.266 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000ee | 113.239 | 5.786 | 0.006 | 0.000 | 0.588 | 1.516 | 13.924 | 0.075 | n/a | 0.278 | 91.016 | n/a | n/a | 0.051 | 6.379 | 0.056 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000fb | 67.648 | 11.283 | 0.512 | 0.554 | 0.186 | 2.483 | 15.644 | 0.162 | n/a | 0.444 | 36.115 | n/a | n/a | 0.266 | 12.534 | 0.185 | 0.266 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000f5 | 49.134 | 5.089 | 0.313 | 0.000 | 0.161 | 2.829 | 18.310 | 0.104 | n/a | 0.393 | 21.833 | n/a | n/a | 0.102 | 5.563 | 0.113 | 0.102 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000f1 | 45.348 | 8.627 | 0.013 | 0.000 | 1.429 | 1.207 | 3.471 | 0.141 | n/a | 1.438 | 28.838 | n/a | n/a | 0.182 | 10.070 | 0.222 | 0.182 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000f6 | 42.000 | 7.774 | 0.005 | 0.000 | 0.773 | 1.041 | 6.022 | 0.069 | n/a | 0.288 | 25.979 | n/a | n/a | 0.049 | 8.552 | 0.204 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000f8 | 41.883 | 9.010 | 0.007 | 0.000 | 0.770 | 1.829 | 5.783 | 0.082 | n/a | 0.330 | 24.028 | n/a | n/a | 0.046 | 9.786 | 0.234 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000f3 | 33.229 | 9.743 | 0.300 | 0.639 | 0.070 | 2.319 | 2.382 | 0.191 | n/a | 0.519 | 17.023 | n/a | n/a | 0.045 | 10.751 | 0.324 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.348 | 2.050 | 0.000 | 4.001 | 8.627 | 0.013 | 0.000 | 1.429 | 1.207 | 3.471 | 0.141 | n/a | 1.438 | 28.838 | n/a | n/a | 0.182 | 10.070 | 0.222 | 0.182 |
| p99 | 45.348 | 2.050 | 0.000 | 4.001 | 8.627 | 0.013 | 0.000 | 1.429 | 1.207 | 3.471 | 0.141 | n/a | 1.438 | 28.838 | n/a | n/a | 0.182 | 10.070 | 0.222 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f700000000000000f1 | 45.348 | 8.627 | 0.013 | 0.000 | 1.429 | 1.207 | 3.471 | 0.141 | n/a | 1.438 | 28.838 | n/a | n/a | 0.182 | 10.070 | 0.222 | 0.182 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 53.195 | 1.613 | 0.000 | 3.341 | 7.637 | 0.013 | 0.000 | 0.386 | 3.292 | 2.957 | 0.111 | n/a | 3.633 | 25.950 | n/a | n/a | 0.082 | 8.737 | 0.179 | 0.082 |
| p99 | 317.578 | 6.974 | 0.000 | 7.352 | 13.934 | 125.100 | 3.716 | 2.187 | 102.251 | 13.985 | 0.524 | n/a | 8.853 | 245.685 | n/a | n/a | 0.156 | 132.714 | 0.648 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000114 | 317.578 | 13.934 | 0.013 | 3.716 | 0.386 | 48.364 | 3.675 | 0.524 | n/a | 1.149 | 245.685 | n/a | n/a | 0.131 | 18.049 | 0.057 | 0.131 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000010d | 204.959 | 5.428 | 125.100 | 0.000 | 2.187 | 27.364 | 13.985 | 0.115 | n/a | 4.770 | 25.950 | n/a | n/a | 0.061 | 132.714 | 0.648 | 0.061 | node-14/thread-0/client.commit-send-queue | client.encode 7.737ms |
| 72eca93608e3b9f70000000000000103 | 171.816 | 5.945 | 0.436 | 0.000 | 0.181 | 102.251 | 4.587 | 0.112 | n/a | 3.633 | 54.603 | n/a | n/a | 0.069 | 6.561 | 0.038 | 0.069 | node-14/thread-9/socket.wait-first-byte | driver.publication 2.756ms; driver.expected-state.bind-receipt 1.500ms |
| 72eca93608e3b9f70000000000000106 | 134.977 | 7.637 | 0.013 | 0.000 | 0.272 | 4.312 | 5.929 | 0.111 | n/a | 1.019 | 115.602 | n/a | n/a | 0.082 | 7.923 | 0.059 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000104 | 110.552 | 8.507 | 0.010 | 0.000 | 0.391 | 61.723 | 2.860 | 0.044 | n/a | 0.243 | 36.619 | n/a | n/a | 0.156 | 8.908 | 0.081 | 0.156 | node-14/thread-0/socket.wait-first-byte | none observed |
| 72eca93608e3b9f70000000000000112 | 53.195 | 11.074 | 0.705 | 0.623 | 0.177 | 2.123 | 3.360 | 0.170 | n/a | 1.107 | 33.709 | n/a | n/a | 0.148 | 12.578 | 0.236 | 0.148 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000ff | 46.979 | 8.158 | 0.015 | 0.000 | 0.564 | 2.916 | 2.609 | 0.052 | n/a | 8.853 | 23.766 | n/a | n/a | 0.048 | 8.737 | 0.186 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f700000000000000fd | 37.601 | 8.373 | 0.020 | 0.000 | 1.381 | 2.349 | 1.596 | 0.059 | n/a | 4.151 | 19.573 | n/a | n/a | 0.099 | 9.774 | 0.260 | 0.099 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000109 | 33.705 | 6.542 | 0.007 | 0.000 | 0.248 | 0.813 | 1.908 | 0.052 | n/a | 4.039 | 20.005 | n/a | n/a | 0.090 | 6.797 | 0.202 | 0.090 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000010a | 31.926 | 5.260 | 0.006 | 0.000 | 0.437 | 3.292 | 2.957 | 0.113 | n/a | 8.247 | 11.553 | n/a | n/a | 0.061 | 5.703 | 0.179 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.330ms |

## P2 / grow3 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.601 | 1.680 | 0.000 | 3.815 | 6.542 | 0.020 | 0.000 | 1.381 | 2.349 | 1.908 | 0.059 | n/a | 4.151 | 20.005 | n/a | n/a | 0.090 | 9.774 | 0.260 | 0.090 |
| p99 | 204.959 | 2.008 | 0.000 | 4.131 | 8.373 | 125.100 | 0.000 | 2.187 | 27.364 | 13.985 | 0.115 | n/a | 4.770 | 25.950 | n/a | n/a | 0.099 | 132.714 | 0.648 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f7000000000000010d | 204.959 | 5.428 | 125.100 | 0.000 | 2.187 | 27.364 | 13.985 | 0.115 | n/a | 4.770 | 25.950 | n/a | n/a | 0.061 | 132.714 | 0.648 | 0.061 | node-14/thread-0/client.commit-send-queue | client.encode 7.737ms |
| 72eca93608e3b9f700000000000000fd | 37.601 | 8.373 | 0.020 | 0.000 | 1.381 | 2.349 | 1.596 | 0.059 | n/a | 4.151 | 19.573 | n/a | n/a | 0.099 | 9.774 | 0.260 | 0.099 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000109 | 33.705 | 6.542 | 0.007 | 0.000 | 0.248 | 0.813 | 1.908 | 0.052 | n/a | 4.039 | 20.005 | n/a | n/a | 0.090 | 6.797 | 0.202 | 0.090 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.868 | 1.051 | 0.000 | 2.021 | 7.008 | 0.018 | 0.000 | 0.284 | 2.300 | 9.506 | 0.139 | n/a | 1.186 | 33.310 | n/a | n/a | 0.082 | 9.914 | 0.132 | 0.082 |
| p99 | 190.589 | 4.431 | 2.023 | 5.445 | 10.985 | 1.103 | 0.751 | 30.675 | 7.751 | 17.305 | 0.201 | n/a | 3.919 | 165.901 | n/a | n/a | 0.147 | 35.401 | 0.546 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000126 | 190.589 | 6.749 | 0.258 | 0.358 | 0.112 | 5.165 | 10.627 | 0.139 | n/a | 1.186 | 165.901 | n/a | n/a | 0.095 | 7.476 | 0.039 | 0.095 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000121 | 115.077 | 9.232 | 0.018 | 0.000 | 0.665 | 1.528 | 8.090 | 0.084 | n/a | 1.822 | 93.552 | n/a | n/a | 0.087 | 9.914 | 0.086 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000127 | 105.449 | 10.835 | 0.017 | 0.000 | 0.572 | 2.300 | 9.506 | 0.093 | n/a | 3.919 | 78.126 | n/a | n/a | 0.082 | 11.424 | 0.108 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000012b | 64.868 | 4.719 | 0.008 | 0.000 | 30.675 | 7.751 | 5.515 | 0.065 | n/a | 2.099 | 13.975 | n/a | n/a | 0.063 | 35.401 | 0.546 | 0.063 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.783ms; driver.publication 1.257ms |
| 72eca93608e3b9f70000000000000124 | 62.554 | 7.008 | 0.373 | 0.751 | 0.106 | 4.366 | 15.956 | 0.164 | n/a | 0.465 | 33.310 | n/a | n/a | 0.055 | 8.238 | 0.132 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000012a | 49.724 | 10.985 | 0.009 | 0.000 | 0.284 | 1.498 | 4.413 | 0.201 | n/a | 1.108 | 31.079 | n/a | n/a | 0.147 | 11.278 | 0.227 | 0.147 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000012f | 48.392 | 5.780 | 1.103 | 0.489 | 0.111 | 2.092 | 17.305 | 0.162 | n/a | 0.522 | 20.765 | n/a | n/a | 0.063 | 7.482 | 0.155 | 0.063 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.868 | 1.051 | 0.000 | 2.021 | 4.719 | 0.008 | 0.000 | 0.665 | 1.528 | 5.515 | 0.065 | n/a | 1.822 | 13.975 | n/a | n/a | 0.063 | 9.914 | 0.086 | 0.063 |
| p99 | 115.077 | 1.672 | 2.023 | 4.830 | 9.232 | 0.018 | 0.000 | 30.675 | 7.751 | 8.090 | 0.084 | n/a | 2.099 | 93.552 | n/a | n/a | 0.087 | 35.401 | 0.546 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000121 | 115.077 | 9.232 | 0.018 | 0.000 | 0.665 | 1.528 | 8.090 | 0.084 | n/a | 1.822 | 93.552 | n/a | n/a | 0.087 | 9.914 | 0.086 | 0.087 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000012b | 64.868 | 4.719 | 0.008 | 0.000 | 30.675 | 7.751 | 5.515 | 0.065 | n/a | 2.099 | 13.975 | n/a | n/a | 0.063 | 35.401 | 0.546 | 0.063 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.783ms; driver.publication 1.257ms |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.368 | 1.102 | 0.000 | 1.686 | 7.716 | 0.265 | 0.389 | 0.097 | 4.324 | 12.555 | 0.074 | n/a | 0.913 | 14.368 | n/a | n/a | 0.091 | 10.451 | 0.188 | 0.091 |
| p99 | 55.523 | 1.620 | 0.000 | 2.772 | 7.871 | 2.853 | 0.472 | 2.724 | 5.946 | 15.395 | 7.298 | n/a | 4.498 | 31.258 | n/a | n/a | 0.535 | 11.211 | 0.237 | 0.535 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000137 | 55.523 | 7.716 | 0.010 | 0.000 | 2.724 | 1.845 | 3.223 | 7.298 | n/a | 0.913 | 31.258 | n/a | n/a | 0.535 | 10.451 | 0.188 | 0.535 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000013c | 47.368 | 7.871 | 2.853 | 0.389 | 0.097 | 5.946 | 15.395 | 0.061 | n/a | 0.327 | 14.368 | n/a | n/a | 0.061 | 11.211 | 0.237 | 0.061 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000134 | 40.720 | 6.823 | 0.265 | 0.472 | 0.074 | 4.324 | 12.555 | 0.074 | n/a | 4.498 | 11.544 | n/a | n/a | 0.091 | 7.634 | 0.187 | 0.091 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 2.777ms |

## P2 / grow10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.523 | 1.102 | 0.000 | 2.772 | 7.716 | 0.010 | 0.000 | 2.724 | 1.845 | 3.223 | 7.298 | n/a | 0.913 | 31.258 | n/a | n/a | 0.535 | 10.451 | 0.188 | 0.535 |
| p99 | 55.523 | 1.102 | 0.000 | 2.772 | 7.716 | 0.010 | 0.000 | 2.724 | 1.845 | 3.223 | 7.298 | n/a | 0.913 | 31.258 | n/a | n/a | 0.535 | 10.451 | 0.188 | 0.535 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000137 | 55.523 | 7.716 | 0.010 | 0.000 | 2.724 | 1.845 | 3.223 | 7.298 | n/a | 0.913 | 31.258 | n/a | n/a | 0.535 | 10.451 | 0.188 | 0.535 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.550 | 0.779 | 0.000 | 2.707 | 5.873 | 0.011 | 0.000 | 0.385 | 1.832 | 5.157 | 0.079 | n/a | 2.774 | 11.313 | n/a | n/a | 0.126 | 6.269 | 0.228 | 0.126 |
| p99 | 27.550 | 0.779 | 0.000 | 2.707 | 5.873 | 0.011 | 0.000 | 0.385 | 1.832 | 5.157 | 0.079 | n/a | 2.774 | 11.313 | n/a | n/a | 0.126 | 6.269 | 0.228 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000140 | 27.550 | 5.873 | 0.011 | 0.000 | 0.385 | 1.832 | 5.157 | 0.079 | n/a | 2.774 | 11.313 | n/a | n/a | 0.126 | 6.269 | 0.228 | 0.126 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.392 | 0.799 | 0.000 | 3.250 | 6.006 | 0.016 | 0.000 | 0.834 | 2.198 | 8.339 | 0.120 | n/a | 0.618 | 21.152 | n/a | n/a | 0.076 | 6.997 | 0.173 | 0.076 |
| p99 | 100.783 | 2.422 | 2.941 | 5.126 | 8.642 | 0.342 | 0.545 | 6.400 | 3.133 | 11.288 | 0.176 | n/a | 1.050 | 82.780 | n/a | n/a | 0.089 | 15.055 | 0.408 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f7000000000000014a | 100.783 | 6.006 | 0.016 | 0.000 | 0.974 | 1.559 | 8.191 | 0.126 | n/a | 1.050 | 82.780 | n/a | n/a | 0.080 | 6.997 | 0.069 | 0.080 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000150 | 51.148 | 8.021 | 0.008 | 0.000 | 0.834 | 1.347 | 5.478 | 0.139 | n/a | 0.618 | 34.627 | n/a | n/a | 0.076 | 8.863 | 0.173 | 0.076 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000155 | 42.981 | 4.208 | 0.206 | 0.390 | 0.084 | 2.198 | 8.339 | 0.120 | n/a | 0.668 | 26.724 | n/a | n/a | 0.042 | 4.889 | 0.114 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f7000000000000014f | 41.392 | 4.765 | 0.273 | 0.441 | 0.125 | 2.512 | 11.288 | 0.106 | n/a | 0.668 | 21.152 | n/a | n/a | 0.061 | 5.604 | 0.135 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000156 | 39.390 | 6.492 | 0.007 | 0.000 | 1.021 | 3.133 | 9.181 | 0.056 | n/a | 0.314 | 19.096 | n/a | n/a | 0.089 | 7.521 | 0.191 | 0.089 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000152 | 36.930 | 8.642 | 0.013 | 0.000 | 6.400 | 1.277 | 1.833 | 0.078 | n/a | 0.428 | 18.179 | n/a | n/a | 0.080 | 15.055 | 0.408 | 0.080 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.829ms |
| 72eca93608e3b9f7000000000000014d | 36.611 | 5.757 | 0.342 | 0.545 | 0.083 | 2.916 | 9.056 | 0.176 | n/a | 0.569 | 17.117 | n/a | n/a | 0.050 | 6.727 | 0.184 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.148 | 1.528 | 0.000 | 4.593 | 8.021 | 0.013 | 0.000 | 0.974 | 1.347 | 5.478 | 0.126 | n/a | 0.618 | 34.627 | n/a | n/a | 0.080 | 8.863 | 0.173 | 0.080 |
| p99 | 100.783 | 2.422 | 2.941 | 5.126 | 8.642 | 0.016 | 0.000 | 6.400 | 1.559 | 8.191 | 0.139 | n/a | 1.050 | 82.780 | n/a | n/a | 0.080 | 15.055 | 0.408 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f7000000000000014a | 100.783 | 6.006 | 0.016 | 0.000 | 0.974 | 1.559 | 8.191 | 0.126 | n/a | 1.050 | 82.780 | n/a | n/a | 0.080 | 6.997 | 0.069 | 0.080 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000150 | 51.148 | 8.021 | 0.008 | 0.000 | 0.834 | 1.347 | 5.478 | 0.139 | n/a | 0.618 | 34.627 | n/a | n/a | 0.076 | 8.863 | 0.173 | 0.076 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 72eca93608e3b9f70000000000000152 | 36.930 | 8.642 | 0.013 | 0.000 | 6.400 | 1.277 | 1.833 | 0.078 | n/a | 0.428 | 18.179 | n/a | n/a | 0.080 | 15.055 | 0.408 | 0.080 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.829ms |

## P5 / presweep / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.706 | 0.000 | 0.000 | 0.584 | 10.498 | 0.396 | 0.433 | 0.289 | 2.229 | 12.625 | 0.080 | n/a | 0.354 | 19.031 | n/a | n/a | 0.127 | 11.997 | 0.257 | 0.127 |
| p99 | 69.479 | 0.303 | 0.081 | 0.656 | 12.911 | 0.777 | 4.750 | 0.894 | 2.666 | 16.846 | 0.490 | n/a | 0.610 | 30.043 | n/a | n/a | 0.133 | 18.952 | 0.273 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000159 | 69.479 | 12.911 | 0.396 | 4.750 | 0.894 | 2.666 | 16.846 | 0.490 | n/a | 0.354 | 30.043 | n/a | n/a | 0.127 | 18.952 | 0.273 | 0.127 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.worker-message 0.511ms |
| 72eca93608e3b9f7000000000000015b | 46.706 | 10.498 | 0.777 | 0.433 | 0.289 | 2.229 | 12.625 | 0.080 | n/a | 0.610 | 19.031 | n/a | n/a | 0.133 | 11.997 | 0.257 | 0.133 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 137.184 | 0.927 | 0.000 | 2.262 | 9.720 | 9.457 | 0.000 | 0.011 | 7.698 | 1.687 | 14.786 | n/a | 0.468 | 92.258 | n/a | n/a | 0.039 | 18.067 | 0.154 | 0.039 |
| p99 | 192.460 | 1.734 | 4.197 | 14.306 | 21.082 | 21.855 | 0.000 | 0.135 | 23.613 | 5.514 | 22.712 | n/a | 2.041 | 132.169 | n/a | n/a | 0.116 | 33.310 | 0.237 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 72eca93608e3b9f70000000000000165 | 192.460 | 9.720 | 21.855 | 0.000 | 0.014 | 22.123 | 1.607 | 4.688 | n/a | 0.168 | 132.169 | n/a | n/a | 0.116 | 31.589 | 0.164 | 0.116 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 13.926ms; driver.publication 7.171ms; driver.publication 5.705ms; driver.publication 4.234ms; driver.publication 3.647ms |
| 72eca93608e3b9f70000000000000164 | 188.399 | 9.365 | 19.562 | 0.000 | 0.011 | 23.613 | 2.326 | 5.663 | n/a | 0.272 | 127.544 | n/a | n/a | 0.043 | 28.938 | 0.154 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 13.926ms; driver.publication 7.171ms; driver.publication 5.705ms; driver.publication 4.234ms; driver.publication 3.647ms |
| 72eca93608e3b9f70000000000000163 | 185.270 | 10.863 | 18.586 | 0.000 | 0.005 | 19.882 | 1.970 | 17.918 | n/a | 0.468 | 115.554 | n/a | n/a | 0.022 | 29.455 | 0.159 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 13.926ms; driver.publication 7.171ms; driver.publication 5.705ms; driver.publication 4.234ms; driver.publication 1.617ms |
| 72eca93608e3b9f70000000000000162 | 176.467 | 21.082 | 12.222 | 0.000 | 0.006 | 18.282 | 1.650 | 14.786 | n/a | 0.711 | 107.695 | n/a | n/a | 0.032 | 33.310 | 0.189 | 0.032 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 7.171ms; driver.publication 5.705ms; driver.publication 4.234ms; driver.publication 1.617ms; driver.publication 1.540ms |
| 72eca93608e3b9f70000000000000161 | 161.333 | 12.618 | 9.608 | 0.000 | 0.009 | 7.698 | 3.804 | 22.486 | n/a | 2.041 | 103.040 | n/a | n/a | 0.030 | 22.234 | 0.138 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 7.171ms; driver.publication 4.234ms; driver.publication 1.617ms; driver.publication 1.540ms; driver.publication 1.467ms |
| 72eca93608e3b9f70000000000000160 | 137.184 | 7.389 | 9.457 | 0.000 | 0.010 | 6.363 | 1.548 | 19.491 | n/a | 0.631 | 92.258 | n/a | n/a | 0.038 | 16.856 | 0.123 | 0.038 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 7.171ms; driver.publication 4.234ms; driver.publication 1.617ms; driver.publication 1.467ms |
| 72eca93608e3b9f7000000000000015f | 120.212 | 7.310 | 8.209 | 0.000 | 0.023 | 3.900 | 1.886 | 22.712 | n/a | 0.968 | 75.165 | n/a | n/a | 0.039 | 15.542 | 0.129 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 7.171ms; driver.publication 4.234ms; driver.publication 1.467ms |
| 72eca93608e3b9f7000000000000015e | 107.104 | 10.164 | 3.752 | 0.000 | 0.071 | 5.392 | 5.514 | 21.806 | n/a | 0.518 | 59.816 | n/a | n/a | 0.072 | 13.987 | 0.131 | 0.072 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication 7.171ms; driver.publication 1.467ms |
| 72eca93608e3b9f7000000000000015d | 76.382 | 14.401 | 3.579 | 0.000 | 0.087 | 1.749 | 1.173 | 12.979 | n/a | 0.106 | 42.248 | n/a | n/a | 0.060 | 18.067 | 0.237 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.467ms |
| 72eca93608e3b9f7000000000000015c | 59.898 | 9.546 | 0.025 | 0.000 | 0.135 | 10.645 | 1.687 | 10.365 | n/a | 0.337 | 27.109 | n/a | n/a | 0.050 | 9.706 | 0.162 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (143 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.117 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 305.018 | n/a | n/a | n/a | 81.860 | n/a | 10.307 | 304.987 | 3.097 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.702 | 305.016 | 1.000 | 11.702 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 595aef47058675cf000000000000430d | 305.089 | 0.029 | n/a | 0.000 | 305.059 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 305.088 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000000430c | 305.018 | 0.029 | n/a | 0.000 | 304.987 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.016 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000000430b | 305.000 | 0.059 | n/a | 0.000 | 304.940 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.999 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 595aef47058675cf0000000000004315 | 304.982 | 0.030 | n/a | 0.000 | 304.951 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.981 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000000430a | 304.901 | 0.191 | n/a | 0.000 | 304.707 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.898 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000000041f | 304.658 | 0.460 | n/a | 0.000 | 304.188 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 304.648 | 1.000 | 0.010 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.087ms |
| 595aef47058675cf0000000000000420 | 304.432 | 0.140 | n/a | 0.000 | 304.285 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 304.425 | 1.000 | 0.006 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.087ms |
| 595aef47058675cf000000000000043c | 303.559 | 0.094 | n/a | 0.000 | 303.462 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.556 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.087ms |
| 595aef47058675cf000000000000043b | 303.454 | 0.115 | n/a | 0.000 | 303.334 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 303.449 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.087ms |
| 595aef47058675cf0000000000000445 | 302.309 | 0.194 | n/a | 0.000 | 302.085 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 302.279 | 1.000 | 0.031 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.087ms |
| c22959f8ee19343e000000000000036a | 302.213 | 0.039 | n/a | 0.000 | 302.172 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.211 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.116ms |
| c22959f8ee19343e0000000000000369 | 302.187 | 0.110 | n/a | 0.000 | 302.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.184 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.116ms |
| c22959f8ee19343e0000000000000368 | 302.086 | 0.052 | n/a | 0.000 | 302.030 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.083 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.116ms |
| c22959f8ee19343e0000000000000367 | 302.030 | 0.065 | n/a | 0.000 | 301.962 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.027 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.116ms |
| c22959f8ee19343e0000000000000366 | 301.993 | 0.198 | n/a | 0.000 | 301.783 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 301.982 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.116ms |
| a72f015fb79551dc0000000000000909 | 301.836 | 0.019 | n/a | 0.000 | 301.815 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.834 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a72f015fb79551dc0000000000000908 | 301.831 | 0.021 | n/a | 0.000 | 301.808 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.829 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a72f015fb79551dc0000000000000907 | 301.824 | 0.027 | n/a | 0.000 | 301.794 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.822 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a72f015fb79551dc0000000000000906 | 301.795 | 0.144 | n/a | 0.000 | 301.648 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 301.792 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| a72f015fb79551dc0000000000000905 | 301.592 | 0.487 | n/a | 0.000 | 301.101 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 301.588 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |

## P1 / L1 / read (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.052 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 306.291 | n/a | n/a | n/a | 10.934 | n/a | 0.000 | 306.019 | 0.966 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.462 | 306.287 | 1.000 | 8.462 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc000000000000bdf9 | 306.291 | 0.269 | n/a | 0.000 | 306.019 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 306.287 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a72f015fb79551dc000000000000b022 | 282.852 | 0.188 | n/a | 0.000 | 282.654 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 282.843 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a72f015fb79551dc000000000000718f | 13.581 | 4.153 | n/a | 0.000 | 0.000 | 0.966 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.462 | 4.153 | 0.306 | 8.462 | node-14/thread-4/socket.wait-first-byte | none observed |
| a72f015fb79551dc000000000000c56f | 10.952 | 10.934 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 10.934 | 0.998 | 0.018 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000c56c | 9.137 | 9.124 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 9.124 | 0.999 | 0.013 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000000c5bc | 6.035 | 6.003 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.003 | 0.995 | 0.032 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000000cb41 | 5.728 | 5.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 5.714 | 0.998 | 0.014 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000000b025 | 5.358 | 5.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 5.352 | 0.999 | 0.006 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.046ms |
| a72f015fb79551dc000000000000cc23 | 4.528 | 4.523 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 4.523 | 0.999 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000c56d | 4.027 | 3.836 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.191 | 3.836 | 0.953 | 0.191 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000cbb9 | 3.272 | 3.252 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.252 | 0.994 | 0.021 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000c59f | 3.233 | 2.655 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.578 | 2.655 | 0.821 | 0.578 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000cb33 | 2.918 | 2.914 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.914 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000c59d | 2.424 | 2.359 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.065 | 2.359 | 0.973 | 0.065 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000cb69 | 2.414 | 2.410 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.410 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000cb6f | 2.279 | 2.275 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.275 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000cf0e | 2.148 | 2.143 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.143 | 0.998 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000000a852 | 2.140 | 2.136 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.136 | 0.998 | 0.004 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000000a2a2 | 2.108 | 0.528 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.581 | 0.528 | 0.250 | 1.581 | uncovered | none observed |
| a72f015fb79551dc000000000000cbfb | 1.835 | 1.831 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.831 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L4 / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.038 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 287.815 | n/a | n/a | n/a | 6.360 | n/a | 0.000 | 287.160 | 1.516 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.575 | 287.811 | 1.000 | 3.575 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 595aef47058675cf000000000000d877 | 288.316 | 0.391 | n/a | 0.000 | 287.921 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 288.313 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| c22959f8ee19343e000000000000cff3 | 287.815 | 0.650 | n/a | 0.000 | 287.160 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 287.811 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| a72f015fb79551dc00000000000168eb | 287.740 | 0.658 | n/a | 0.000 | 287.077 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 287.736 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| a72f015fb79551dc00000000000168ec | 287.208 | 0.095 | n/a | 0.000 | 287.105 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 287.201 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 595aef47058675cf000000000000d87c | 262.092 | 0.142 | n/a | 0.000 | 261.944 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 262.085 | 1.000 | 0.007 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.037ms; replica.apply-delta 0.030ms |
| c22959f8ee19343e000000000000d004 | 259.151 | 0.130 | n/a | 0.000 | 259.018 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 259.148 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.065ms; replica.apply-delta 0.054ms |
| a72f015fb79551dc0000000000016917 | 258.630 | 0.032 | n/a | 0.000 | 258.596 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 258.629 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.080ms; replica.apply-delta 0.047ms |
| a72f015fb79551dc0000000000016916 | 258.575 | 0.150 | n/a | 0.000 | 258.417 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 258.567 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.080ms; replica.apply-delta 0.047ms |
| 595aef47058675cf00000000000066b4 | 22.472 | 14.605 | n/a | 4.358 | 0.000 | 0.835 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.674 | 18.963 | 0.844 | 2.674 | node-14/thread-6/reader.execute | none observed |
| c22959f8ee19343e00000000000059af | 14.657 | 5.175 | n/a | 0.000 | 0.000 | 1.516 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.967 | 5.175 | 0.353 | 7.967 | node-14/thread-5/socket.wait-first-byte | none observed |
| a72f015fb79551dc000000000000d172 | 11.534 | 4.739 | n/a | 0.000 | 0.000 | 3.356 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.439 | 4.739 | 0.411 | 3.439 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc0000000000013206 | 6.362 | 6.360 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.360 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 595aef47058675cf00000000000067cc | 6.198 | 6.194 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 6.194 | 0.999 | 0.004 | node-14/thread-6/replica.pull-at | none observed |
| c22959f8ee19343e0000000000005b30 | 6.084 | 6.075 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 6.075 | 0.998 | 0.010 | node-14/thread-5/replica.pull-at | none observed |
| c22959f8ee19343e0000000000006c03 | 5.134 | 5.130 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 5.130 | 0.999 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| a72f015fb79551dc00000000000168dc | 4.679 | 4.657 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.657 | 0.995 | 0.022 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000168db | 4.676 | 4.673 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.673 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 595aef47058675cf000000000000d85a | 4.566 | 4.561 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 4.561 | 0.999 | 0.005 | node-14/thread-6/replica.pull-at | none observed |
| c22959f8ee19343e000000000000cfdb | 4.366 | 4.356 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 4.356 | 0.998 | 0.010 | node-14/thread-5/replica.pull-at | none observed |
| 595aef47058675cf000000000000a831 | 3.575 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.575 | 0.000 | 0.000 | 3.575 | uncovered | none observed |

## P1 / L16 / read (130 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.243 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 578.593 | n/a | n/a | n/a | 56.408 | n/a | 4.183 | 578.516 | 0.727 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.613 | 578.590 | 1.000 | 6.613 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c22959f8ee19343e0000000000013585 | 579.302 | 0.750 | n/a | 0.000 | 578.547 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 579.298 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| c22959f8ee19343e0000000000013599 | 578.593 | 0.534 | n/a | 0.000 | 578.055 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 578.590 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| c22959f8ee19343e000000000001359a | 578.570 | 0.053 | n/a | 0.000 | 578.516 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 578.569 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| c22959f8ee19343e00000000000135a3 | 578.333 | 0.067 | n/a | 0.000 | 578.265 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 578.332 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| c22959f8ee19343e00000000000135a4 | 578.301 | 0.027 | n/a | 0.000 | 578.271 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 578.299 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| a72f015fb79551dc000000000001d4fb | 576.450 | 0.235 | n/a | 0.000 | 576.211 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 576.446 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.109ms |
| a72f015fb79551dc000000000001d512 | 576.340 | 0.028 | n/a | 0.000 | 576.311 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 576.339 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.109ms |
| a72f015fb79551dc000000000001d511 | 576.322 | 0.042 | n/a | 0.000 | 576.274 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 576.316 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.109ms |
| a72f015fb79551dc000000000001d510 | 576.306 | 0.028 | n/a | 0.000 | 576.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 576.305 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.109ms |
| 595aef47058675cf0000000000014f9d | 576.286 | 0.118 | n/a | 0.000 | 576.166 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 576.284 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.077ms |
| a72f015fb79551dc000000000001d50f | 576.282 | 0.066 | n/a | 0.000 | 576.215 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 576.281 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.109ms |
| a72f015fb79551dc000000000001d50e | 576.230 | 0.049 | n/a | 0.000 | 576.179 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 576.228 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.109ms |
| 595aef47058675cf0000000000014fb8 | 575.467 | 0.363 | n/a | 0.000 | 575.102 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 575.465 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.077ms |
| 595aef47058675cf0000000000014fb9 | 575.271 | 0.229 | n/a | 0.000 | 575.037 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 575.266 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.077ms |
| 595aef47058675cf0000000000014fd3 | 574.578 | 0.027 | n/a | 0.000 | 574.550 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 574.577 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.077ms |
| 595aef47058675cf0000000000014fd4 | 574.568 | 0.084 | n/a | 0.000 | 574.482 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 574.566 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.077ms |
| a72f015fb79551dc000000000001b2c4 | 326.712 | 0.511 | n/a | 0.000 | 326.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 326.708 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| a72f015fb79551dc000000000001b2c5 | 326.012 | 0.104 | n/a | 0.000 | 325.895 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 325.999 | 1.000 | 0.013 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| c22959f8ee19343e0000000000011775 | 325.950 | 0.158 | n/a | 0.000 | 325.786 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 325.944 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| a72f015fb79551dc000000000001b2c7 | 325.917 | 0.039 | n/a | 0.000 | 325.873 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 325.911 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.030ms |

## P1 / L64 / read (133 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.201 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 0.000 | 0.000 | 0.020 |
| p99 | 460.031 | n/a | n/a | n/a | 5.153 | n/a | 0.000 | 459.832 | 0.723 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.937 | 460.028 | 1.000 | 38.937 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc000000000001e41c | 460.085 | 0.075 | n/a | 0.000 | 460.008 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 460.083 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a72f015fb79551dc000000000001e41b | 460.031 | 0.196 | n/a | 0.000 | 459.832 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 460.028 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a72f015fb79551dc000000000001e444 | 459.070 | 0.056 | n/a | 0.000 | 459.012 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 459.068 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a72f015fb79551dc000000000001e446 | 459.045 | 0.014 | n/a | 0.000 | 459.030 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 459.044 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| a72f015fb79551dc000000000001e445 | 459.040 | 0.020 | n/a | 0.000 | 459.019 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 459.039 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| c22959f8ee19343e0000000000014500 | 458.687 | 0.219 | n/a | 0.000 | 458.459 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 458.678 | 1.000 | 0.009 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| c22959f8ee19343e0000000000014501 | 458.560 | 0.031 | n/a | 0.000 | 458.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 458.556 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 595aef47058675cf0000000000015e39 | 457.721 | 0.167 | n/a | 0.000 | 457.550 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 457.718 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.083ms |
| 595aef47058675cf0000000000015e3a | 457.700 | 0.035 | n/a | 0.000 | 457.663 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 457.698 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.083ms |
| a72f015fb79551dc000000000001e461 | 456.503 | 0.027 | n/a | 0.000 | 456.475 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.501 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 595aef47058675cf0000000000015e50 | 456.432 | 0.033 | n/a | 0.000 | 456.397 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.430 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.083ms |
| c22959f8ee19343e0000000000014528 | 456.416 | 0.032 | n/a | 0.000 | 456.381 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.413 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| c22959f8ee19343e0000000000014529 | 456.385 | 0.021 | n/a | 0.000 | 456.363 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.383 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| 595aef47058675cf0000000000015e5a | 456.145 | 0.072 | n/a | 0.000 | 456.071 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.143 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.083ms |
| 595aef47058675cf0000000000015e59 | 456.112 | 0.023 | n/a | 0.000 | 456.087 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 456.110 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.083ms |
| c22959f8ee19343e0000000000014535 | 455.619 | 0.036 | n/a | 0.000 | 455.578 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 455.614 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.054ms |
| a72f015fb79551dc000000000001d545 | 48.172 | 6.777 | n/a | 0.000 | 0.000 | 1.704 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.691 | 6.777 | 0.141 | 39.691 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.042ms |
| c22959f8ee19343e00000000000135b5 | 42.971 | 3.382 | n/a | 0.000 | 0.000 | 0.652 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.937 | 3.382 | 0.079 | 38.937 | node-14/thread-5/socket.wait-first-byte | replica.apply-delta 0.177ms |
| 595aef47058675cf0000000000015009 | 42.010 | 4.566 | n/a | 0.000 | 0.000 | 0.723 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.721 | 4.566 | 0.109 | 36.721 | node-14/thread-6/socket.wait-first-byte | replica.apply-delta 0.043ms |
| 595aef47058675cf0000000000019ed6 | 5.161 | 5.153 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 5.153 | 0.998 | 0.008 | node-14/thread-6/reader.execute | none observed |

## P1 / L256 / read (143 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.206 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 |
| p99 | 370.865 | n/a | n/a | n/a | 56.160 | n/a | 7.564 | 370.319 | 0.970 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.167 | 370.858 | 1.000 | 33.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c22959f8ee19343e00000000000192e7 | 370.966 | 0.057 | n/a | 0.000 | 370.906 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 370.963 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| c22959f8ee19343e00000000000192e6 | 370.865 | 0.540 | n/a | 0.000 | 370.319 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 370.858 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 595aef47058675cf000000000001a659 | 369.731 | 0.018 | n/a | 0.000 | 369.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.730 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.076ms |
| 595aef47058675cf000000000001a658 | 369.727 | 0.051 | n/a | 0.000 | 369.676 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.726 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.076ms |
| 595aef47058675cf000000000001a657 | 369.683 | 0.043 | n/a | 0.000 | 369.639 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.682 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.076ms |
| 595aef47058675cf000000000001a656 | 369.591 | 0.230 | n/a | 0.000 | 369.359 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.589 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.076ms |
| c22959f8ee19343e00000000000192fe | 369.486 | 0.032 | n/a | 0.000 | 369.452 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.484 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| a72f015fb79551dc00000000000232ec | 369.409 | 0.597 | n/a | 0.000 | 368.808 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 369.405 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| a72f015fb79551dc00000000000232f6 | 369.302 | 0.361 | n/a | 0.000 | 368.932 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 369.293 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| a72f015fb79551dc00000000000232f7 | 369.297 | 0.099 | n/a | 0.000 | 369.196 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.295 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 595aef47058675cf000000000001a655 | 369.260 | 0.236 | n/a | 0.000 | 369.021 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 369.256 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.076ms |
| c22959f8ee19343e0000000000019307 | 369.111 | 0.020 | n/a | 0.000 | 369.089 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.109 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c22959f8ee19343e0000000000019306 | 369.110 | 0.057 | n/a | 0.000 | 369.050 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 369.107 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| a72f015fb79551dc00000000000232eb | 368.093 | 0.094 | n/a | 0.000 | 367.996 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 368.091 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| a72f015fb79551dc00000000000232ea | 368.076 | 0.557 | n/a | 0.000 | 367.516 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 368.073 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| a72f015fb79551dc00000000000232e9 | 367.533 | 0.266 | n/a | 0.000 | 367.263 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 367.529 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 595aef47058675cf000000000001a668 | 170.021 | 0.289 | n/a | 0.000 | 169.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 170.016 | 1.000 | 0.005 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.082ms |
| c22959f8ee19343e0000000000019315 | 169.660 | 0.097 | n/a | 0.000 | 169.558 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 169.655 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 595aef47058675cf000000000001a672 | 168.651 | 0.038 | n/a | 0.000 | 168.612 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 168.650 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.082ms |
| c22959f8ee19343e0000000000019324 | 168.283 | 0.058 | n/a | 0.000 | 168.222 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 168.280 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |

## P1 / L1024 / read (167 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.083 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 0.000 | 0.000 | 0.027 |
| p99 | 307.998 | n/a | n/a | n/a | 67.227 | n/a | 10.445 | 307.916 | 5.939 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 127.784 | 307.996 | 1.000 | 127.784 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 595aef47058675cf000000000002b56f | 308.017 | 0.517 | n/a | 0.000 | 307.496 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 308.013 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| a72f015fb79551dc0000000000033b2a | 307.998 | 0.078 | n/a | 0.000 | 307.918 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.996 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.069ms |
| a72f015fb79551dc0000000000033b2b | 307.996 | 0.094 | n/a | 0.000 | 307.899 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.994 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.069ms |
| a72f015fb79551dc0000000000033b28 | 307.976 | 0.256 | n/a | 0.000 | 307.713 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 307.969 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.069ms |
| a72f015fb79551dc0000000000033b29 | 307.962 | 0.042 | n/a | 0.000 | 307.916 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.958 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.069ms |
| a72f015fb79551dc0000000000033b2c | 307.927 | 0.022 | n/a | 0.000 | 307.903 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.925 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.069ms |
| c22959f8ee19343e0000000000029831 | 307.862 | 0.940 | n/a | 0.000 | 306.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 307.857 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.163ms |
| 595aef47058675cf000000000002b56e | 307.708 | 0.687 | n/a | 0.000 | 307.017 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.704 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 595aef47058675cf000000000002b56d | 307.282 | 0.270 | n/a | 0.000 | 306.984 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 307.254 | 1.000 | 0.029 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| c22959f8ee19343e0000000000029846 | 306.934 | 0.040 | n/a | 0.000 | 306.893 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.933 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.163ms |
| c22959f8ee19343e0000000000029845 | 306.888 | 0.198 | n/a | 0.000 | 306.685 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 306.882 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.163ms |
| 595aef47058675cf000000000002b582 | 306.862 | 0.104 | n/a | 0.000 | 306.756 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 306.859 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 595aef47058675cf000000000002b583 | 306.824 | 0.293 | n/a | 0.000 | 306.529 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.822 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| c22959f8ee19343e0000000000029844 | 306.750 | 0.536 | n/a | 0.000 | 306.208 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 306.744 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.163ms |
| a72f015fb79551dc0000000000033b4b | 305.699 | 0.151 | n/a | 0.000 | 305.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.698 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.069ms |
| c22959f8ee19343e000000000002985e | 304.046 | 0.089 | n/a | 0.000 | 303.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.044 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.163ms |
| a72f015fb79551dc000000000002a1c7 | 210.824 | 49.207 | n/a | 8.745 | 0.000 | 67.945 | 48.455 | 36.445 | n/a | 0.021 | 0.000 | n/a | n/a | 0.007 | 57.952 | 0.275 | 0.007 | node-14/thread-4/socket.wait-first-byte | reader.observe 18.786ms; reader.observe 16.601ms; reader.observe 1.516ms; reader.observe 1.160ms; replica.apply-delta 0.038ms |
| c22959f8ee19343e000000000001f87a | 169.600 | 40.271 | n/a | 1.562 | 0.000 | 1.710 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 126.058 | 41.833 | 0.247 | 126.058 | node-14/thread-5/socket.wait-first-byte | reader.observe 28.196ms; reader.observe 10.615ms; reader.observe 9.684ms; reader.observe 2.513ms; replica.apply-delta 0.037ms |
| c22959f8ee19343e000000000001f878 | 169.537 | 20.398 | n/a | 0.000 | 0.000 | 3.530 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 145.609 | 20.398 | 0.120 | 145.609 | node-14/thread-5/socket.wait-first-byte | reader.observe 28.196ms; reader.observe 10.615ms; reader.observe 9.684ms; reader.observe 1.047ms; replica.apply-delta 0.037ms |
| a72f015fb79551dc000000000002a1c6 | 164.525 | 42.888 | n/a | 10.445 | 0.000 | 3.443 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 107.750 | 53.333 | 0.324 | 107.750 | node-14/thread-4/socket.wait-first-byte | reader.observe 16.601ms; reader.observe 1.516ms; reader.observe 1.160ms; replica.apply-delta 0.038ms |

## P1 / recovery / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.095 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 0.000 | 0.000 | 0.025 |
| p99 | 281.149 | n/a | n/a | n/a | 9.667 | n/a | 0.000 | 281.004 | 0.745 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.331 | 281.143 | 1.000 | 9.331 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c22959f8ee19343e000000000002a080 | 281.149 | 0.139 | n/a | 0.000 | 281.004 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 281.143 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c22959f8ee19343e000000000002a081 | 281.149 | 0.026 | n/a | 0.000 | 281.121 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.147 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000002bdbf | 280.989 | 0.112 | n/a | 0.000 | 280.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 280.984 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a72f015fb79551dc0000000000034501 | 280.915 | 0.135 | n/a | 0.000 | 280.774 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 280.909 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c22959f8ee19343e000000000002a087 | 280.631 | 0.060 | n/a | 0.000 | 280.568 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.628 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000002bdd4 | 280.568 | 0.015 | n/a | 0.000 | 280.552 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.567 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c22959f8ee19343e000000000002a088 | 280.567 | 0.023 | n/a | 0.000 | 280.541 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.564 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000002bdd3 | 280.554 | 0.013 | n/a | 0.000 | 280.540 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.553 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| c22959f8ee19343e000000000002a089 | 280.554 | 0.021 | n/a | 0.000 | 280.531 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.552 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000002bdd2 | 280.543 | 0.017 | n/a | 0.000 | 280.526 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.542 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000002bdd1 | 280.525 | 0.025 | n/a | 0.000 | 280.499 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.524 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| a72f015fb79551dc000000000003451c | 279.979 | 0.051 | n/a | 0.000 | 279.925 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.976 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a72f015fb79551dc0000000000034520 | 279.964 | 0.020 | n/a | 0.000 | 279.942 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.963 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a72f015fb79551dc000000000003451d | 279.957 | 0.022 | n/a | 0.000 | 279.932 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.955 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a72f015fb79551dc000000000003451e | 279.950 | 0.021 | n/a | 0.000 | 279.927 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.948 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| a72f015fb79551dc000000000003451f | 279.947 | 0.021 | n/a | 0.000 | 279.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.945 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 595aef47058675cf000000000002b58f | 16.499 | 3.001 | n/a | 0.000 | 0.000 | 0.538 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.960 | 3.001 | 0.182 | 12.960 | node-14/thread-6/socket.wait-first-byte | replica.apply-delta 0.052ms |
| a72f015fb79551dc0000000000033bc6 | 11.250 | 4.256 | n/a | 0.000 | 0.000 | 1.038 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.957 | 4.256 | 0.378 | 5.957 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.042ms |
| c22959f8ee19343e000000000002cab3 | 10.617 | 10.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 10.611 | 0.999 | 0.006 | node-14/thread-5/reader.execute | none observed |
| c22959f8ee19343e0000000000029a6c | 10.083 | 6.323 | n/a | 0.000 | 0.000 | 0.745 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.015 | 6.323 | 0.627 | 3.015 | node-14/thread-5/reader.execute | none observed |

## P4 / p4mix / read (125 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 11.866 | n/a | n/a | n/a | 11.863 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.364 | 11.863 | 0.999 | 0.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc000000000003d245 | 29.689 | 14.678 | n/a | 2.974 | 0.000 | 1.166 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.871 | 17.652 | 0.595 | 10.871 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc0000000000045953 | 11.866 | 11.863 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 11.863 | 1.000 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000003d26b | 4.133 | 4.130 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.130 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.059ms |
| a72f015fb79551dc0000000000053fca | 2.390 | 2.386 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.386 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000003f827 | 2.231 | 2.229 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.229 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000533c1 | 1.623 | 1.621 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.621 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000003d6ea | 1.623 | 1.618 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.618 | 0.997 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000045977 | 1.622 | 1.619 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.619 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000051924 | 1.607 | 1.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.604 | 0.998 | 0.003 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc0000000000044e78 | 1.498 | 1.494 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.494 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000003d3e0 | 1.372 | 1.369 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.369 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000052a8d | 1.355 | 1.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.352 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000052aa2 | 1.313 | 1.310 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.310 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000041ff6 | 1.301 | 1.300 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.300 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000004fb04 | 1.295 | 1.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.288 | 0.994 | 0.007 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000047545 | 1.285 | 0.921 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.364 | 0.921 | 0.717 | 0.364 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000004ff30 | 1.213 | 1.210 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.210 | 0.997 | 0.003 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc0000000000040f95 | 1.210 | 1.208 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.208 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000043911 | 1.122 | 1.119 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.119 | 0.997 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000003d5bf | 1.096 | 1.095 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.095 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P4 / p4h1 / read (108 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 5.968 | n/a | n/a | n/a | 3.942 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.427 | 3.942 | 0.999 | 1.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc000000000005666b | 12.154 | 2.490 | n/a | 0.000 | 0.000 | 0.857 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.807 | 2.490 | 0.205 | 8.807 | node-14/thread-4/socket.wait-first-byte | none observed |
| a72f015fb79551dc000000000005fe7c | 5.968 | 5.964 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.964 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005f271 | 3.946 | 3.942 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.942 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005fe5c | 2.943 | 2.938 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.938 | 0.998 | 0.006 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005fea0 | 2.006 | 2.001 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.001 | 0.998 | 0.004 | node-14/thread-4/reader.observe | none observed |
| a72f015fb79551dc000000000006ac50 | 1.793 | 1.777 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 1.777 | 0.991 | 0.015 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.030ms |
| a72f015fb79551dc000000000005f406 | 1.729 | 1.726 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.726 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005fa79 | 1.667 | 0.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.051 | 0.616 | 0.370 | 1.051 | uncovered | none observed |
| a72f015fb79551dc000000000005fb86 | 1.636 | 1.632 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.632 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005f242 | 1.541 | 1.537 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.537 | 0.997 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000068657 | 1.484 | 1.479 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.479 | 0.996 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005f8c1 | 1.467 | 1.465 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.465 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000006829e | 1.427 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.427 | 0.000 | 0.000 | 1.427 | uncovered | none observed |
| a72f015fb79551dc000000000006cbd2 | 1.409 | 1.370 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 1.370 | 0.973 | 0.039 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000005bf10 | 1.390 | 1.380 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 1.380 | 0.993 | 0.010 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000005fbe0 | 1.339 | 1.329 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 1.329 | 0.992 | 0.011 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000006b52f | 1.301 | 1.299 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.299 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000063401 | 1.278 | 1.276 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.276 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000005fd96 | 1.247 | 1.245 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.245 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000066435 | 1.244 | 1.242 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.242 | 0.998 | 0.002 | node-14/thread-4/reader.execute | none observed |

## P4 / p4h3 / read (111 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 21.159 | n/a | n/a | n/a | 7.435 | n/a | 0.000 | 0.000 | 1.044 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.117 | 7.435 | 0.999 | 9.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc0000000000071369 | 21.855 | 11.694 | n/a | 0.000 | 0.000 | 1.044 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.117 | 11.694 | 0.535 | 9.117 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.082ms |
| a72f015fb79551dc000000000006d281 | 21.159 | 3.494 | n/a | 0.000 | 0.000 | 1.338 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.328 | 3.494 | 0.165 | 16.328 | node-14/thread-4/socket.wait-first-byte | none observed |
| a72f015fb79551dc0000000000076771 | 7.438 | 7.435 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 7.435 | 1.000 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000007678f | 4.665 | 4.643 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.643 | 0.995 | 0.022 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc0000000000071f9f | 1.583 | 1.582 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.582 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000071973 | 1.568 | 1.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.566 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000072536 | 1.558 | 1.556 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.556 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000795e3 | 1.410 | 1.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 1.402 | 0.994 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000006d2ba | 1.298 | 1.293 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.293 | 0.996 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000007f204 | 1.237 | 1.232 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.232 | 0.996 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000006d237 | 1.116 | 1.059 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 1.059 | 0.949 | 0.057 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000767f3 | 1.113 | 1.112 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.112 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000077957 | 0.950 | 0.946 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.946 | 0.996 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000006d23a | 0.944 | 0.939 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.939 | 0.995 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000079680 | 0.931 | 0.930 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.930 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000007d2dc | 0.920 | 0.917 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.917 | 0.997 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000006d777 | 0.899 | 0.897 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.897 | 0.998 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000007f58f | 0.891 | 0.889 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.889 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000007df8f | 0.888 | 0.879 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.879 | 0.990 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000007db41 | 0.878 | 0.840 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.038 | 0.840 | 0.957 | 0.038 | node-14/thread-4/replica.pull-at | none observed |

## P4 / p4h10 / read (112 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 4.385 | n/a | n/a | n/a | 2.827 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.863 | 2.827 | 0.999 | 0.863 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc000000000008493a | 9.368 | 1.996 | n/a | 0.000 | 0.000 | 0.882 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.490 | 1.996 | 0.213 | 6.490 | node-14/thread-4/socket.wait-first-byte | none observed |
| a72f015fb79551dc000000000008d0df | 4.385 | 4.383 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.383 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000008d07f | 2.828 | 2.827 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.827 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000092721 | 1.769 | 1.766 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.766 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000008da6b | 1.572 | 1.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.568 | 0.997 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000087a38 | 1.571 | 1.548 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 1.548 | 0.986 | 0.022 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000008d0c7 | 1.357 | 1.354 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.354 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000087697 | 1.356 | 1.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 1.350 | 0.995 | 0.006 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc0000000000095511 | 1.222 | 1.219 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.219 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.060ms |
| a72f015fb79551dc00000000000902c6 | 1.055 | 1.054 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.054 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000950b6 | 0.995 | 0.993 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.993 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000850a2 | 0.908 | 0.904 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.904 | 0.996 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000008bdf7 | 0.896 | 0.894 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.894 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000093203 | 0.863 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.863 | 0.000 | 0.000 | 0.863 | uncovered | none observed |
| a72f015fb79551dc00000000000920b0 | 0.850 | 0.847 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.847 | 0.996 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000099af4 | 0.843 | 0.834 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.834 | 0.990 | 0.009 | node-14/thread-4/reader.execute | none observed |
| a72f015fb79551dc000000000008b4b3 | 0.814 | 0.811 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.811 | 0.997 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000008b65a | 0.795 | 0.792 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.792 | 0.996 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc0000000000092a09 | 0.794 | 0.791 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.791 | 0.996 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000008902c | 0.793 | 0.764 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.029 | 0.764 | 0.963 | 0.029 | node-14/thread-4/replica.pull-at | none observed |

## P5 / presweep / read (164 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.136 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.000 | 0.000 | 0.030 |
| p99 | 38.167 | n/a | n/a | n/a | 23.494 | n/a | 4.088 | 0.000 | 1.617 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.979 | 29.473 | 1.000 | 6.979 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c22959f8ee19343e0000000000032746 | 41.124 | 23.494 | n/a | 8.928 | 0.000 | 1.617 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.085 | 32.422 | 0.788 | 7.085 | node-14/thread-5/reader.execute | none observed |
| 595aef47058675cf0000000000034778 | 38.167 | 25.385 | n/a | 4.088 | 0.000 | 1.716 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.979 | 29.473 | 0.772 | 6.979 | node-14/thread-6/reader.execute | none observed |
| a72f015fb79551dc000000000009a432 | 10.373 | 3.642 | n/a | 0.000 | 0.000 | 1.149 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.582 | 3.642 | 0.351 | 5.582 | node-14/thread-4/socket.wait-first-byte | none observed |
| 595aef47058675cf0000000000034baf | 8.921 | 8.918 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 8.918 | 1.000 | 0.003 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf0000000000034bb0 | 8.909 | 8.897 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.897 | 0.999 | 0.012 | node-14/thread-6/replica.pull-at | none observed |
| c22959f8ee19343e0000000000032717 | 6.681 | 3.492 | n/a | 3.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 6.675 | 0.999 | 0.006 | node-14/thread-5/replica.pull-at | none observed |
| c22959f8ee19343e0000000000032718 | 6.666 | 3.469 | n/a | 3.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 6.652 | 0.998 | 0.013 | node-14/thread-5/replica.pull-at | none observed |
| c22959f8ee19343e0000000000032719 | 6.359 | 3.160 | n/a | 3.183 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.343 | 0.997 | 0.016 | node-14/thread-5/node.gc | none observed |
| 595aef47058675cf0000000000037876 | 6.253 | 6.246 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 6.246 | 0.999 | 0.007 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf0000000000037877 | 6.236 | 6.204 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.204 | 0.995 | 0.032 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf0000000000037842 | 6.226 | 6.223 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.223 | 1.000 | 0.003 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf00000000000378a0 | 6.067 | 6.062 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 6.062 | 0.999 | 0.005 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf0000000000034781 | 5.621 | 5.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 5.616 | 0.999 | 0.005 | node-14/thread-6/reader.execute | none observed |
| 595aef47058675cf0000000000034782 | 5.549 | 5.532 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.532 | 0.997 | 0.017 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf0000000000034783 | 5.127 | 5.108 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.108 | 0.996 | 0.019 | node-14/thread-6/replica.pull-at | none observed |
| 595aef47058675cf0000000000034c6a | 5.055 | 5.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.053 | 1.000 | 0.002 | node-14/thread-6/replica.pull-at | none observed |
| c22959f8ee19343e0000000000032712 | 4.818 | 4.813 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 4.813 | 0.999 | 0.005 | node-14/thread-5/replica.pull-at | none observed |
| a72f015fb79551dc000000000009de92 | 4.652 | 4.650 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.650 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc000000000009de93 | 4.636 | 4.621 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.621 | 0.997 | 0.015 | node-14/thread-4/replica.pull-at | none observed |
| a72f015fb79551dc00000000000a1f8a | 4.398 | 4.396 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.396 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |

## P5 / sweep / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 4.486 | n/a | n/a | n/a | 3.222 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 3.898 | 0.996 | 0.030 |
| p99 | 93.886 | n/a | n/a | n/a | 45.334 | n/a | 2.918 | 93.123 | 4.668 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.520 | 93.863 | 1.000 | 30.520 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a72f015fb79551dc00000000000a3ba2 | 93.886 | 0.740 | n/a | 0.000 | 93.123 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 93.863 | 1.000 | 0.023 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.078ms; replica.apply-delta 0.071ms; replica.apply-delta 0.061ms; replica.apply-delta 0.047ms; replica.apply-delta 0.046ms |
| a72f015fb79551dc00000000000a3ba3 | 93.488 | 0.367 | n/a | 0.000 | 92.990 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.131 | 93.357 | 0.999 | 0.131 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.078ms; replica.apply-delta 0.071ms; replica.apply-delta 0.061ms; replica.apply-delta 0.047ms; replica.apply-delta 0.046ms |
| a72f015fb79551dc00000000000a3ba4 | 93.454 | 0.321 | n/a | 0.000 | 92.963 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.170 | 93.284 | 0.998 | 0.170 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.078ms; replica.apply-delta 0.071ms; replica.apply-delta 0.061ms; replica.apply-delta 0.047ms; replica.apply-delta 0.046ms |
| a72f015fb79551dc00000000000a3ba5 | 93.438 | 0.317 | n/a | 0.000 | 92.943 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.178 | 93.260 | 0.998 | 0.178 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.078ms; replica.apply-delta 0.071ms; replica.apply-delta 0.061ms; replica.apply-delta 0.047ms; replica.apply-delta 0.046ms |
| a72f015fb79551dc00000000000a3ba6 | 93.423 | 0.328 | n/a | 0.000 | 92.926 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.169 | 93.253 | 0.998 | 0.169 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.078ms; replica.apply-delta 0.071ms; replica.apply-delta 0.061ms; replica.apply-delta 0.047ms; replica.apply-delta 0.046ms |
| a72f015fb79551dc00000000000a3ba7 | 93.401 | 0.327 | n/a | 0.000 | 92.900 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.174 | 93.228 | 0.998 | 0.174 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.078ms; replica.apply-delta 0.071ms; replica.apply-delta 0.061ms; replica.apply-delta 0.047ms; replica.apply-delta 0.046ms |
| 595aef47058675cf000000000003d784 | 91.268 | 0.837 | n/a | 0.000 | 90.425 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 91.261 | 1.000 | 0.007 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.392ms; replica.apply-delta 0.103ms; replica.apply-delta 0.073ms; replica.apply-delta 0.073ms; replica.apply-delta 0.047ms |
| c22959f8ee19343e000000000003b77e | 91.228 | 4.110 | n/a | 0.000 | 87.111 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 91.221 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.147ms; replica.apply-delta 0.090ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.044ms |
| 595aef47058675cf000000000003d785 | 90.610 | 0.372 | n/a | 0.000 | 90.184 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 90.556 | 0.999 | 0.054 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.392ms; replica.apply-delta 0.103ms; replica.apply-delta 0.073ms; replica.apply-delta 0.073ms; replica.apply-delta 0.047ms |
| 595aef47058675cf000000000003d798 | 89.211 | 0.341 | n/a | 0.000 | 88.798 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.072 | 89.139 | 0.999 | 0.072 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.392ms; replica.apply-delta 0.103ms; replica.apply-delta 0.073ms; replica.apply-delta 0.073ms; replica.apply-delta 0.047ms |
| 595aef47058675cf000000000003d799 | 89.149 | 0.317 | n/a | 0.000 | 88.756 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 89.073 | 0.999 | 0.076 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.392ms; replica.apply-delta 0.103ms; replica.apply-delta 0.073ms; replica.apply-delta 0.073ms; replica.apply-delta 0.047ms |
| 595aef47058675cf000000000003d7a0 | 87.672 | 0.358 | n/a | 0.000 | 87.229 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.085 | 87.587 | 0.999 | 0.085 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.392ms; replica.apply-delta 0.103ms; replica.apply-delta 0.073ms; replica.apply-delta 0.073ms; replica.apply-delta 0.047ms |
| c22959f8ee19343e000000000003b77f | 87.430 | 0.333 | n/a | 0.000 | 86.990 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.107 | 87.323 | 0.999 | 0.107 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.147ms; replica.apply-delta 0.090ms; replica.apply-delta 0.051ms; replica.apply-delta 0.049ms; replica.apply-delta 0.044ms |
| c22959f8ee19343e000000000003b7a4 | 86.229 | 0.318 | n/a | 0.000 | 85.795 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.116 | 86.113 | 0.999 | 0.116 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.147ms; replica.apply-delta 0.090ms; replica.apply-delta 0.049ms; replica.apply-delta 0.044ms; replica.apply-delta 0.041ms |
| c22959f8ee19343e000000000003b7bc | 85.503 | 0.325 | n/a | 0.000 | 85.050 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.127 | 85.375 | 0.999 | 0.127 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.147ms; replica.apply-delta 0.090ms; replica.apply-delta 0.049ms; replica.apply-delta 0.044ms; replica.apply-delta 0.041ms |
| c22959f8ee19343e000000000003b7bd | 85.464 | 0.300 | n/a | 0.000 | 85.032 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.133 | 85.332 | 0.998 | 0.133 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.147ms; replica.apply-delta 0.090ms; replica.apply-delta 0.049ms; replica.apply-delta 0.044ms; replica.apply-delta 0.041ms |
| 595aef47058675cf000000000003d5c8 | 82.740 | 45.334 | n/a | 2.217 | 0.000 | 4.668 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.520 | 47.552 | 0.575 | 30.520 | node-14/thread-6/reader.execute | none observed |
| a72f015fb79551dc00000000000a3660 | 19.609 | 12.110 | n/a | 0.000 | 0.000 | 0.879 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.620 | 12.110 | 0.618 | 6.620 | node-14/thread-4/reader.execute | none observed |
| 055de840db621c130000000000000153 | 9.568 | 8.555 | n/a | 1.002 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 9.557 | 0.999 | 0.011 | node-14/thread-7/replica.pull-at | none observed |
| 055de840db621c130000000000000154 | 9.551 | 8.525 | n/a | 1.002 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 9.527 | 0.997 | 0.024 | node-14/thread-7/replica.pull-at | none observed |

## P1 / baseline / read (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 |
| p99 | 0.057 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 595aef47058675cf00000000000066a9 | 0.057 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 | uncovered | none observed |
| 595aef47058675cf00000000000066aa | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |

## P3 / outside-phases / read (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.393 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.330 | 201.495 | 0.030 | n/a | 0.156 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 |
| p99 | 206.818 | n/a | n/a | n/a | 0.668 | n/a | 0.000 | 0.000 | 5.197 | 202.790 | 13.135 | n/a | 0.305 | 0.000 | n/a | n/a | 0.465 | 0.668 | 0.005 | 0.465 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc00000000000000b7 | 206.818 | 0.000 | n/a | 0.000 | 0.000 | 5.197 | 201.142 | 0.020 | n/a | 0.262 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000007 | 206.182 | 0.000 | n/a | 0.000 | 0.000 | 2.797 | 202.671 | 0.117 | n/a | 0.301 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000009 | 206.137 | 0.000 | n/a | 0.000 | 0.000 | 3.346 | 202.092 | 0.059 | n/a | 0.175 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000090 | 205.862 | 0.000 | n/a | 0.000 | 0.000 | 2.582 | 202.750 | 0.062 | n/a | 0.303 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000008f | 205.508 | 0.000 | n/a | 0.000 | 0.000 | 2.337 | 202.612 | 0.059 | n/a | 0.282 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc0000000000000005 | 204.819 | 0.000 | n/a | 0.000 | 0.000 | 2.204 | 201.913 | 0.095 | n/a | 0.278 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000060 | 204.813 | 0.000 | n/a | 0.000 | 0.000 | 1.575 | 202.790 | 0.091 | n/a | 0.202 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc000000000000008b | 204.772 | 0.000 | n/a | 0.000 | 0.000 | 1.752 | 202.640 | 0.012 | n/a | 0.170 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc0000000000000006 | 204.729 | 0.000 | n/a | 0.000 | 0.000 | 1.504 | 202.577 | 0.159 | n/a | 0.193 | 0.000 | n/a | n/a | 0.296 | 0.000 | 0.000 | 0.296 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc00000000000000b2 | 204.661 | 0.000 | n/a | 0.000 | 0.000 | 2.459 | 201.796 | 0.022 | n/a | 0.132 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000008 | 204.550 | 0.000 | n/a | 0.000 | 0.000 | 2.093 | 201.712 | 0.170 | n/a | 0.223 | 0.000 | n/a | n/a | 0.353 | 0.000 | 0.000 | 0.353 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000063 | 204.462 | 0.000 | n/a | 0.000 | 0.000 | 2.956 | 200.998 | 0.018 | n/a | 0.269 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc000000000000005c | 204.305 | 0.000 | n/a | 0.000 | 0.000 | 1.800 | 202.102 | 0.069 | n/a | 0.130 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc00000000000000e0 | 204.144 | 0.000 | n/a | 0.000 | 0.000 | 1.330 | 202.459 | 0.009 | n/a | 0.156 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-69/journal/page | none observed |
| e394acdbda0a5cdc0000000000000092 | 204.134 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 202.682 | 0.021 | n/a | 0.227 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc00000000000000b8 | 204.088 | 0.000 | n/a | 0.000 | 0.000 | 1.531 | 202.188 | 0.019 | n/a | 0.148 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc000000000000005f | 204.084 | 0.000 | n/a | 0.000 | 0.000 | 1.965 | 201.790 | 0.067 | n/a | 0.139 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc00000000000000b3 | 204.059 | 0.000 | n/a | 0.000 | 0.000 | 1.099 | 202.602 | 0.014 | n/a | 0.127 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc000000000000008e | 203.625 | 0.000 | n/a | 0.000 | 0.000 | 1.580 | 201.668 | 0.055 | n/a | 0.158 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc00000000000000b5 | 203.499 | 0.000 | n/a | 0.000 | 0.000 | 1.635 | 201.439 | 0.019 | n/a | 0.147 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | gw-r/thread-49/journal/page | none observed |

## P3 / outside-phases / internal (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 623.850 | n/a | n/a | n/a | 4.099 | n/a | 0.000 | 0.000 | 1.380 | 609.392 | 0.024 | n/a | 0.123 | 0.000 | n/a | n/a | 0.344 | 4.099 | 0.013 | 0.344 |
| p99 | 1008.451 | n/a | n/a | n/a | 111.127 | n/a | 4.830 | 0.000 | 4.174 | 1003.280 | 4.291 | n/a | 0.871 | 0.000 | n/a | n/a | 27.905 | 115.957 | 0.824 | 27.905 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000017 | 1008.451 | 0.473 | n/a | 0.000 | 0.000 | 3.022 | 1002.295 | 0.040 | n/a | 0.871 | 0.000 | n/a | n/a | 1.749 | 0.473 | 0.000 | 1.749 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c839000000000000001a | 1007.641 | 0.317 | n/a | 0.000 | 0.000 | 2.664 | 1002.764 | 0.024 | n/a | 0.247 | 0.000 | n/a | n/a | 1.625 | 0.317 | 0.000 | 1.625 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c8390000000000000019 | 1007.065 | 0.303 | n/a | 0.000 | 0.000 | 1.794 | 1003.280 | 0.058 | n/a | 0.328 | 0.000 | n/a | n/a | 1.301 | 0.303 | 0.000 | 1.301 | gw-r/thread-47/journal/page | none observed |
| 7c065109c219c839000000000000001b | 1006.981 | 0.491 | n/a | 0.000 | 0.000 | 1.885 | 1003.092 | 0.062 | n/a | 0.246 | 0.000 | n/a | n/a | 1.205 | 0.491 | 0.000 | 1.205 | gw-r/thread-47/journal/page | none observed |
| 7c065109c219c8390000000000000018 | 1006.144 | 0.237 | n/a | 0.000 | 0.000 | 1.952 | 1002.380 | 0.083 | n/a | 0.235 | 0.000 | n/a | n/a | 1.257 | 0.237 | 0.000 | 1.257 | gw-r/thread-50/journal/page | none observed |
| 7c065109c219c8390000000000000077 | 1005.628 | 0.558 | n/a | 0.000 | 0.000 | 2.267 | 1001.352 | 0.036 | n/a | 0.145 | 0.000 | n/a | n/a | 1.271 | 0.558 | 0.001 | 1.271 | gw-r/thread-75/journal/page | none observed |
| 7c065109c219c8390000000000000053 | 1001.366 | 3.081 | n/a | 0.000 | 0.000 | 1.463 | 996.364 | 0.105 | n/a | 0.210 | 0.000 | n/a | n/a | 0.143 | 3.081 | 0.003 | 0.143 | gw-r/thread-68/journal/page | none observed |
| 7c065109c219c8390000000000000092 | 996.598 | 6.883 | n/a | 0.000 | 0.000 | 1.331 | 987.960 | 0.137 | n/a | 0.138 | 0.000 | n/a | n/a | 0.150 | 6.883 | 0.007 | 0.150 | gw-r/thread-70/journal/page | none observed |
| 7c065109c219c8390000000000000054 | 987.930 | 4.289 | n/a | 0.000 | 0.000 | 1.240 | 981.859 | 0.015 | n/a | 0.221 | 0.000 | n/a | n/a | 0.305 | 4.289 | 0.004 | 0.305 | gw-r/thread-71/journal/page | none observed |
| 7c065109c219c8390000000000000055 | 636.432 | 4.792 | n/a | 0.000 | 0.000 | 1.320 | 629.962 | 0.074 | n/a | 0.176 | 0.000 | n/a | n/a | 0.109 | 4.792 | 0.008 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c8390000000000000074 | 635.113 | 10.971 | n/a | 2.268 | 0.000 | 1.380 | 620.070 | 0.051 | n/a | 0.103 | 0.000 | n/a | n/a | 0.271 | 13.239 | 0.021 | 0.271 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000079 | 623.850 | 8.182 | n/a | 0.000 | 0.000 | 1.670 | 609.392 | 4.291 | n/a | 0.102 | 0.000 | n/a | n/a | 0.213 | 8.182 | 0.013 | 0.213 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c839000000000000001c | 562.312 | 45.363 | n/a | 1.896 | 0.000 | 1.791 | 512.309 | 0.057 | n/a | 0.550 | 0.000 | n/a | n/a | 0.344 | 47.260 | 0.084 | 0.344 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c8390000000000000090 | 473.896 | 6.046 | n/a | 0.000 | 0.000 | 0.608 | 466.777 | 0.022 | n/a | 0.123 | 0.000 | n/a | n/a | 0.320 | 6.046 | 0.013 | 0.320 | gw-r/thread-75/journal/page | none observed |
| 7c065109c219c8390000000000000075 | 238.603 | 4.099 | n/a | 0.000 | 0.000 | 1.105 | 233.204 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.097 | 4.099 | 0.017 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000094 | 200.565 | 4.287 | n/a | 0.000 | 0.000 | 0.915 | 195.044 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.228 | 4.287 | 0.021 | 0.228 | gw-r/thread-73/journal/page | none observed |
| 7c065109c219c8390000000000000096 | 163.827 | 3.969 | n/a | 0.000 | 0.000 | 4.174 | 155.466 | 0.024 | n/a | 0.099 | 0.000 | n/a | n/a | 0.095 | 3.969 | 0.024 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c8390000000000000072 | 140.681 | 111.127 | n/a | 4.830 | 0.000 | 0.759 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.965 | 115.957 | 0.824 | 23.965 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c839000000000000008f | 99.911 | 3.691 | n/a | 0.000 | 0.000 | 1.345 | 93.850 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.969 | 3.691 | 0.037 | 0.969 | gw-r/thread-50/journal/page | none observed |
| 7c065109c219c8390000000000000093 | 37.666 | 9.142 | n/a | 0.000 | 0.000 | 0.618 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.905 | 9.142 | 0.243 | 27.905 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 449.253 | n/a | n/a | n/a | 5.733 | n/a | 0.000 | 0.000 | 1.519 | 440.943 | 0.017 | n/a | 0.152 | 0.000 | n/a | n/a | 0.238 | 5.733 | 0.015 | 0.238 |
| p99 | 564.148 | n/a | n/a | n/a | 11.571 | n/a | 0.000 | 0.000 | 2.138 | 550.484 | 0.027 | n/a | 0.234 | 0.000 | n/a | n/a | 0.385 | 11.571 | 0.021 | 0.385 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000021 | 564.148 | 11.571 | n/a | 0.000 | 0.000 | 1.521 | 550.484 | 0.019 | n/a | 0.180 | 0.000 | n/a | n/a | 0.373 | 11.571 | 0.021 | 0.373 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c839000000000000001e | 522.203 | 3.248 | n/a | 0.000 | 0.000 | 2.138 | 516.181 | 0.017 | n/a | 0.234 | 0.000 | n/a | n/a | 0.385 | 3.248 | 0.006 | 0.385 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c839000000000000001f | 449.253 | 7.060 | n/a | 0.000 | 0.000 | 0.925 | 440.943 | 0.027 | n/a | 0.134 | 0.000 | n/a | n/a | 0.164 | 7.060 | 0.016 | 0.164 | gw-r/thread-50/journal/page | none observed |
| 7c065109c219c8390000000000000022 | 383.982 | 5.733 | n/a | 0.000 | 0.000 | 1.519 | 376.324 | 0.017 | n/a | 0.152 | 0.000 | n/a | n/a | 0.238 | 5.733 | 0.015 | 0.238 | gw-r/thread-68/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 216.714 | n/a | n/a | n/a | 7.546 | n/a | 0.000 | 0.000 | 1.120 | 207.356 | 0.025 | n/a | 0.126 | 0.000 | n/a | n/a | 0.202 | 7.546 | 0.008 | 0.202 |
| p99 | 912.745 | n/a | n/a | n/a | 8.919 | n/a | 1.048 | 0.000 | 1.403 | 903.505 | 0.045 | n/a | 0.182 | 0.000 | n/a | n/a | 0.788 | 9.968 | 0.109 | 0.788 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000028 | 912.745 | 7.546 | n/a | 0.000 | 0.000 | 1.341 | 903.505 | 0.025 | n/a | 0.126 | 0.000 | n/a | n/a | 0.202 | 7.546 | 0.008 | 0.202 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000024 | 773.893 | 2.399 | n/a | 0.000 | 0.000 | 1.403 | 769.736 | 0.029 | n/a | 0.182 | 0.000 | n/a | n/a | 0.144 | 2.399 | 0.003 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c8390000000000000025 | 216.714 | 7.891 | n/a | 0.000 | 0.000 | 1.027 | 207.356 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.320 | 7.891 | 0.036 | 0.320 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000027 | 91.312 | 8.919 | n/a | 1.048 | 0.000 | 1.120 | 79.218 | 0.045 | n/a | 0.173 | 0.000 | n/a | n/a | 0.788 | 9.968 | 0.109 | 0.788 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 457.339 | n/a | n/a | n/a | 7.218 | n/a | 0.000 | 0.000 | 0.785 | 447.887 | 0.052 | n/a | 0.161 | 0.000 | n/a | n/a | 0.388 | 7.218 | 0.014 | 0.388 |
| p99 | 985.653 | n/a | n/a | n/a | 10.427 | n/a | 0.000 | 0.000 | 1.487 | 973.596 | 0.167 | n/a | 0.450 | 0.000 | n/a | n/a | 2.833 | 10.427 | 0.492 | 2.833 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000002a | 985.653 | 10.427 | n/a | 0.000 | 0.000 | 0.785 | 973.596 | 0.052 | n/a | 0.404 | 0.000 | n/a | n/a | 0.388 | 10.427 | 0.011 | 0.388 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c839000000000000002e | 656.070 | 8.972 | n/a | 0.000 | 0.000 | 1.487 | 644.836 | 0.167 | n/a | 0.161 | 0.000 | n/a | n/a | 0.447 | 8.972 | 0.014 | 0.447 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c839000000000000002d | 457.339 | 7.218 | n/a | 0.000 | 0.000 | 1.378 | 447.887 | 0.140 | n/a | 0.450 | 0.000 | n/a | n/a | 0.266 | 7.218 | 0.016 | 0.266 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c839000000000000002b | 6.872 | 3.379 | n/a | 0.000 | 0.000 | 0.659 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.833 | 3.379 | 0.492 | 2.833 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 881.511 | n/a | n/a | n/a | 4.906 | n/a | 0.000 | 0.000 | 1.474 | 874.705 | 0.040 | n/a | 0.200 | 0.000 | n/a | n/a | 0.213 | 4.906 | 0.010 | 0.213 |
| p99 | 934.815 | n/a | n/a | n/a | 9.575 | n/a | 0.000 | 0.000 | 2.601 | 922.087 | 0.113 | n/a | 0.210 | 0.000 | n/a | n/a | 0.302 | 9.575 | 0.027 | 0.302 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000030 | 934.815 | 9.575 | n/a | 0.000 | 0.000 | 2.601 | 922.087 | 0.040 | n/a | 0.210 | 0.000 | n/a | n/a | 0.302 | 9.575 | 0.010 | 0.302 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c8390000000000000031 | 881.511 | 4.906 | n/a | 0.000 | 0.000 | 1.474 | 874.705 | 0.014 | n/a | 0.200 | 0.000 | n/a | n/a | 0.213 | 4.906 | 0.006 | 0.213 | gw-r/thread-50/journal/page | none observed |
| 7c065109c219c8390000000000000032 | 95.369 | 2.609 | n/a | 0.000 | 0.000 | 0.852 | 91.524 | 0.113 | n/a | 0.163 | 0.000 | n/a | n/a | 0.108 | 2.609 | 0.027 | 0.108 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 425.125 | n/a | n/a | n/a | 3.177 | n/a | 0.000 | 0.000 | 1.213 | 420.086 | 0.069 | n/a | 0.120 | 0.000 | n/a | n/a | 0.180 | 3.177 | 0.007 | 0.180 |
| p99 | 819.656 | n/a | n/a | n/a | 8.248 | n/a | 0.000 | 0.000 | 1.675 | 810.594 | 1.324 | n/a | 0.300 | 0.000 | n/a | n/a | 0.403 | 8.248 | 0.014 | 0.403 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000035 | 819.656 | 5.712 | n/a | 0.000 | 0.000 | 1.323 | 810.594 | 1.324 | n/a | 0.300 | 0.000 | n/a | n/a | 0.403 | 5.712 | 0.007 | 0.403 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c8390000000000000037 | 573.634 | 8.248 | n/a | 0.000 | 0.000 | 1.213 | 563.812 | 0.026 | n/a | 0.137 | 0.000 | n/a | n/a | 0.198 | 8.248 | 0.014 | 0.198 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c8390000000000000038 | 425.125 | 3.177 | n/a | 0.000 | 0.000 | 0.905 | 420.086 | 0.662 | n/a | 0.114 | 0.000 | n/a | n/a | 0.180 | 3.177 | 0.007 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 7c065109c219c8390000000000000034 | 161.119 | 2.249 | n/a | 0.000 | 0.000 | 1.675 | 156.909 | 0.069 | n/a | 0.120 | 0.000 | n/a | n/a | 0.098 | 2.249 | 0.014 | 0.098 | gw-r/thread-50/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 521.393 | n/a | n/a | n/a | 3.574 | n/a | 0.000 | 0.000 | 1.263 | 500.826 | 0.056 | n/a | 0.170 | 0.000 | n/a | n/a | 0.139 | 3.574 | 0.008 | 0.139 |
| p99 | 813.647 | n/a | n/a | n/a | 11.914 | n/a | 0.000 | 0.000 | 4.222 | 808.737 | 0.143 | n/a | 0.204 | 0.000 | n/a | n/a | 4.085 | 11.914 | 0.023 | 4.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000003f | 813.647 | 3.574 | n/a | 0.000 | 0.000 | 0.973 | 808.737 | 0.043 | n/a | 0.180 | 0.000 | n/a | n/a | 0.139 | 3.574 | 0.004 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c839000000000000003c | 535.930 | 5.838 | n/a | 0.000 | 0.000 | 1.344 | 528.186 | 0.056 | n/a | 0.170 | 0.000 | n/a | n/a | 0.335 | 5.838 | 0.011 | 0.335 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c839000000000000003a | 521.393 | 11.914 | n/a | 0.000 | 0.000 | 4.222 | 500.826 | 0.143 | n/a | 0.204 | 0.000 | n/a | n/a | 4.085 | 11.914 | 0.023 | 4.085 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c839000000000000003d | 269.647 | 2.281 | n/a | 0.000 | 0.000 | 1.263 | 265.799 | 0.069 | n/a | 0.133 | 0.000 | n/a | n/a | 0.103 | 2.281 | 0.008 | 0.103 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.870 | n/a | n/a | n/a | 5.041 | n/a | 0.000 | 0.000 | 1.253 | 354.082 | 0.047 | n/a | 0.187 | 0.000 | n/a | n/a | 0.242 | 5.041 | 0.013 | 0.242 |
| p99 | 1012.294 | n/a | n/a | n/a | 9.201 | n/a | 0.000 | 0.000 | 3.638 | 1001.477 | 0.099 | n/a | 0.253 | 0.000 | n/a | n/a | 1.155 | 9.201 | 0.032 | 1.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000045 | 1012.294 | 9.201 | n/a | 0.000 | 0.000 | 1.253 | 1001.477 | 0.057 | n/a | 0.187 | 0.000 | n/a | n/a | 0.120 | 9.201 | 0.009 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c8390000000000000040 | 385.771 | 4.852 | n/a | 0.000 | 0.000 | 0.786 | 379.555 | 0.047 | n/a | 0.158 | 0.000 | n/a | n/a | 0.373 | 4.852 | 0.013 | 0.373 | gw-r/thread-68/journal/page | none observed |
| 7c065109c219c8390000000000000043 | 366.870 | 8.566 | n/a | 0.000 | 0.000 | 3.638 | 354.082 | 0.099 | n/a | 0.243 | 0.000 | n/a | n/a | 0.242 | 8.566 | 0.023 | 0.242 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c8390000000000000042 | 158.998 | 5.041 | n/a | 0.000 | 0.000 | 1.766 | 150.760 | 0.023 | n/a | 0.253 | 0.000 | n/a | n/a | 1.155 | 5.041 | 0.032 | 1.155 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 948.298 | n/a | n/a | n/a | 0.384 | n/a | 0.000 | 0.000 | 1.294 | 925.525 | 0.058 | n/a | 0.111 | 0.000 | n/a | n/a | 0.146 | 0.384 | 0.000 | 0.146 |
| p99 | 1005.423 | n/a | n/a | n/a | 6.893 | n/a | 0.000 | 0.000 | 15.566 | 1001.935 | 0.068 | n/a | 0.175 | 0.000 | n/a | n/a | 1.568 | 6.893 | 0.007 | 1.568 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000047 | 1005.423 | 0.384 | n/a | 0.000 | 0.000 | 1.294 | 1001.935 | 0.068 | n/a | 0.175 | 0.000 | n/a | n/a | 1.568 | 0.384 | 0.000 | 1.568 | gw-r/thread-71/journal/page | none observed |
| 7c065109c219c8390000000000000046 | 948.298 | 6.893 | n/a | 0.000 | 0.000 | 15.566 | 925.525 | 0.058 | n/a | 0.111 | 0.000 | n/a | n/a | 0.146 | 6.893 | 0.007 | 0.146 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.104 | n/a | n/a | n/a | 7.559 | n/a | 0.000 | 0.000 | 1.278 | 415.134 | 0.033 | n/a | 0.103 | 0.000 | n/a | n/a | 0.171 | 7.559 | 0.018 | 0.171 |
| p99 | 879.697 | n/a | n/a | n/a | 12.217 | n/a | 0.000 | 0.000 | 5.202 | 861.700 | 0.059 | n/a | 0.454 | 0.000 | n/a | n/a | 32.198 | 12.217 | 0.186 | 32.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000004e | 879.697 | 12.217 | n/a | 0.000 | 0.000 | 5.202 | 861.700 | 0.040 | n/a | 0.196 | 0.000 | n/a | n/a | 0.342 | 12.217 | 0.014 | 0.342 | gw-r/thread-74/journal/page | none observed |
| 7c065109c219c839000000000000004d | 537.207 | 9.569 | n/a | 0.000 | 0.000 | 1.325 | 525.695 | 0.033 | n/a | 0.454 | 0.000 | n/a | n/a | 0.131 | 9.569 | 0.018 | 0.131 | gw-r/thread-70/journal/page | none observed |
| 7c065109c219c839000000000000004a | 421.104 | 4.780 | n/a | 0.000 | 0.000 | 0.905 | 415.134 | 0.017 | n/a | 0.097 | 0.000 | n/a | n/a | 0.171 | 4.780 | 0.011 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000048 | 152.068 | 3.423 | n/a | 0.000 | 0.000 | 1.278 | 147.097 | 0.059 | n/a | 0.103 | 0.000 | n/a | n/a | 0.108 | 3.423 | 0.023 | 0.108 | gw-r/thread-70/journal/page | none observed |
| 7c065109c219c8390000000000000049 | 40.531 | 7.559 | n/a | 0.000 | 0.000 | 0.773 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.198 | 7.559 | 0.186 | 32.198 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 748.764 | n/a | n/a | n/a | 6.238 | n/a | 0.000 | 0.000 | 2.632 | 732.950 | 0.299 | n/a | 0.151 | 0.000 | n/a | n/a | 0.197 | 6.238 | 0.008 | 0.197 |
| p99 | 964.880 | n/a | n/a | n/a | 9.604 | n/a | 0.000 | 0.000 | 8.929 | 960.668 | 0.414 | n/a | 0.156 | 0.000 | n/a | n/a | 0.680 | 9.604 | 0.036 | 0.680 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000004f | 964.880 | 2.538 | n/a | 0.000 | 0.000 | 1.369 | 960.668 | 0.017 | n/a | 0.156 | 0.000 | n/a | n/a | 0.133 | 2.538 | 0.003 | 0.133 | gw-r/thread-70/journal/page | none observed |
| 7c065109c219c8390000000000000052 | 748.764 | 6.238 | n/a | 0.000 | 0.000 | 8.929 | 732.950 | 0.299 | n/a | 0.151 | 0.000 | n/a | n/a | 0.197 | 6.238 | 0.008 | 0.197 | gw-r/thread-69/journal/page | none observed |
| 7c065109c219c8390000000000000050 | 263.861 | 9.604 | n/a | 0.000 | 0.000 | 2.632 | 250.406 | 0.414 | n/a | 0.124 | 0.000 | n/a | n/a | 0.680 | 9.604 | 0.036 | 0.680 | gw-r/thread-75/journal/page | none observed |

## P3 / p4h1 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 328.479 | n/a | n/a | n/a | 5.252 | n/a | 0.000 | 0.000 | 1.048 | 320.158 | 0.025 | n/a | 0.108 | 0.000 | n/a | n/a | 0.221 | 5.252 | 0.020 | 0.221 |
| p99 | 997.036 | n/a | n/a | n/a | 15.587 | n/a | 1.585 | 0.000 | 4.324 | 991.489 | 0.553 | n/a | 0.242 | 0.000 | n/a | n/a | 31.077 | 17.172 | 0.129 | 31.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000005a | 997.036 | 3.966 | n/a | 0.000 | 0.000 | 1.048 | 991.489 | 0.102 | n/a | 0.242 | 0.000 | n/a | n/a | 0.188 | 3.966 | 0.004 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 7c065109c219c839000000000000005c | 594.777 | 15.587 | n/a | 1.585 | 0.000 | 2.128 | 574.586 | 0.553 | n/a | 0.165 | 0.000 | n/a | n/a | 0.173 | 17.172 | 0.029 | 0.173 | gw-r/thread-74/journal/page | none observed |
| 7c065109c219c8390000000000000060 | 385.517 | 4.414 | n/a | 0.000 | 0.000 | 1.760 | 378.915 | 0.016 | n/a | 0.096 | 0.000 | n/a | n/a | 0.316 | 4.414 | 0.011 | 0.316 | gw-r/thread-72/journal/page | none observed |
| 7c065109c219c8390000000000000057 | 328.479 | 3.819 | n/a | 0.000 | 0.000 | 0.944 | 320.158 | 0.020 | n/a | 0.108 | 0.000 | n/a | n/a | 3.429 | 3.819 | 0.012 | 3.429 | gw-r/thread-47/journal/page | none observed |
| 7c065109c219c839000000000000005f | 285.993 | 5.603 | n/a | 0.000 | 0.000 | 0.822 | 279.215 | 0.025 | n/a | 0.107 | 0.000 | n/a | n/a | 0.221 | 5.603 | 0.020 | 0.221 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c839000000000000005b | 142.058 | 7.398 | n/a | 0.000 | 0.000 | 1.013 | 133.326 | 0.026 | n/a | 0.183 | 0.000 | n/a | n/a | 0.111 | 7.398 | 0.052 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c8390000000000000059 | 40.653 | 5.252 | n/a | 0.000 | 0.000 | 4.324 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.077 | 5.252 | 0.129 | 31.077 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 173.156 | n/a | n/a | n/a | 3.799 | n/a | 0.000 | 0.000 | 1.271 | 164.585 | 0.031 | n/a | 0.119 | 0.000 | n/a | n/a | 0.243 | 3.799 | 0.033 | 0.243 |
| p99 | 966.202 | n/a | n/a | n/a | 133.510 | n/a | 10.568 | 0.000 | 2.290 | 816.581 | 0.579 | n/a | 0.314 | 0.000 | n/a | n/a | 29.640 | 144.077 | 0.149 | 29.640 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c8390000000000000070 | 966.202 | 133.510 | n/a | 10.568 | 0.000 | 1.472 | 816.581 | 0.071 | n/a | 0.193 | 0.000 | n/a | n/a | 3.809 | 144.077 | 0.149 | 3.809 | gw-r/thread-74/journal/page | none observed |
| 7c065109c219c8390000000000000063 | 506.068 | 4.458 | n/a | 0.000 | 0.000 | 0.885 | 499.779 | 0.579 | n/a | 0.119 | 0.000 | n/a | n/a | 0.250 | 4.458 | 0.009 | 0.250 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c8390000000000000067 | 305.202 | 3.100 | n/a | 0.000 | 0.000 | 0.797 | 300.751 | 0.366 | n/a | 0.099 | 0.000 | n/a | n/a | 0.090 | 3.100 | 0.010 | 0.090 | gw-r/thread-71/journal/page | none observed |
| 7c065109c219c839000000000000006d | 216.526 | 3.799 | n/a | 0.000 | 0.000 | 1.361 | 211.029 | 0.074 | n/a | 0.115 | 0.000 | n/a | n/a | 0.147 | 3.799 | 0.018 | 0.147 | gw-r/thread-73/journal/page | none observed |
| 7c065109c219c8390000000000000061 | 173.156 | 5.762 | n/a | 0.000 | 0.000 | 2.290 | 164.585 | 0.031 | n/a | 0.314 | 0.000 | n/a | n/a | 0.173 | 5.762 | 0.033 | 0.173 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c8390000000000000068 | 161.280 | 1.943 | n/a | 0.000 | 0.000 | 1.271 | 157.801 | 0.030 | n/a | 0.152 | 0.000 | n/a | n/a | 0.083 | 1.943 | 0.012 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c839000000000000006e | 160.955 | 6.846 | n/a | 0.000 | 0.000 | 1.417 | 152.185 | 0.030 | n/a | 0.234 | 0.000 | n/a | n/a | 0.243 | 6.846 | 0.043 | 0.243 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c839000000000000006a | 33.087 | 2.994 | n/a | 0.000 | 0.000 | 0.453 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.640 | 2.994 | 0.090 | 29.640 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c8390000000000000065 | 32.497 | 3.140 | n/a | 0.000 | 0.000 | 0.721 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.636 | 3.140 | 0.097 | 28.636 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 387.354 | n/a | n/a | n/a | 7.923 | n/a | 0.000 | 0.000 | 1.145 | 359.438 | 0.034 | n/a | 0.105 | 0.000 | n/a | n/a | 0.250 | 7.923 | 0.050 | 0.250 |
| p99 | 1005.591 | n/a | n/a | n/a | 140.917 | n/a | 7.223 | 0.000 | 1.528 | 1002.358 | 0.222 | n/a | 0.201 | 0.000 | n/a | n/a | 9.917 | 148.140 | 0.645 | 9.917 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000007c | 1005.591 | 0.521 | n/a | 0.000 | 0.000 | 1.286 | 1002.358 | 0.047 | n/a | 0.156 | 0.000 | n/a | n/a | 1.222 | 0.521 | 0.001 | 1.222 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c8390000000000000085 | 813.829 | 140.917 | n/a | 7.223 | 0.000 | 1.394 | 661.200 | 0.085 | n/a | 0.201 | 0.000 | n/a | n/a | 2.810 | 148.140 | 0.182 | 2.810 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000084 | 394.788 | 5.464 | n/a | 0.000 | 0.000 | 1.436 | 387.387 | 0.222 | n/a | 0.105 | 0.000 | n/a | n/a | 0.174 | 5.464 | 0.014 | 0.174 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c8390000000000000080 | 393.139 | 32.146 | n/a | 0.000 | 0.000 | 1.145 | 359.438 | 0.067 | n/a | 0.182 | 0.000 | n/a | n/a | 0.162 | 32.146 | 0.082 | 0.162 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c839000000000000007b | 387.354 | 8.010 | n/a | 0.000 | 0.000 | 0.775 | 378.200 | 0.034 | n/a | 0.085 | 0.000 | n/a | n/a | 0.250 | 8.010 | 0.021 | 0.250 | gw-r/thread-43/journal/page | none observed |
| 7c065109c219c839000000000000007d | 159.928 | 7.923 | n/a | 0.000 | 0.000 | 1.528 | 150.095 | 0.028 | n/a | 0.140 | 0.000 | n/a | n/a | 0.214 | 7.923 | 0.050 | 0.214 | gw-r/thread-73/journal/page | none observed |
| 7c065109c219c839000000000000007f | 19.167 | 8.351 | n/a | 0.000 | 0.000 | 0.899 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.917 | 8.351 | 0.436 | 9.917 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c8390000000000000082 | 7.045 | 4.546 | n/a | 0.000 | 0.000 | 0.604 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.895 | 4.546 | 0.645 | 1.895 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / grow10 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 155.245 | n/a | n/a | n/a | 116.757 | n/a | 6.304 | 0.000 | 1.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.654 | 124.928 | 0.624 | 3.654 |
| p99 | 425.608 | n/a | n/a | n/a | 177.412 | n/a | 8.225 | 0.000 | 2.078 | 311.020 | 0.334 | n/a | 0.219 | 0.000 | n/a | n/a | 34.629 | 185.432 | 0.873 | 34.629 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000008b | 425.608 | 116.757 | n/a | 8.225 | 0.000 | 2.078 | 294.693 | 0.044 | n/a | 0.158 | 0.000 | n/a | n/a | 3.654 | 124.981 | 0.294 | 3.654 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c8390000000000000089 | 319.578 | 6.611 | n/a | 0.000 | 0.000 | 1.268 | 311.020 | 0.334 | n/a | 0.219 | 0.000 | n/a | n/a | 0.126 | 6.611 | 0.021 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c839000000000000008c | 296.956 | 177.412 | n/a | 8.020 | 0.000 | 1.564 | 108.353 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 1.537 | 185.432 | 0.624 | 1.537 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c8390000000000000087 | 161.559 | 120.300 | n/a | 4.628 | 0.000 | 2.001 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.629 | 124.928 | 0.773 | 34.629 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c839000000000000008e | 155.245 | 129.163 | n/a | 6.304 | 0.000 | 1.381 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.398 | 135.467 | 0.873 | 18.398 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c8390000000000000086 | 147.878 | 120.176 | n/a | 6.668 | 0.000 | 1.128 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.906 | 126.844 | 0.858 | 19.906 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c839000000000000008d | 139.908 | 113.784 | n/a | 7.892 | 0.000 | 0.935 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.297 | 121.676 | 0.870 | 17.297 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c8390000000000000088 | 6.347 | 2.710 | n/a | 0.000 | 0.000 | 0.541 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.096 | 2.710 | 0.427 | 3.096 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 461.818 | n/a | n/a | n/a | 4.369 | n/a | 0.000 | 0.000 | 0.895 | 455.916 | 0.017 | n/a | 0.105 | 0.000 | n/a | n/a | 0.150 | 4.369 | 0.009 | 0.150 |
| p99 | 1004.330 | n/a | n/a | n/a | 10.253 | n/a | 0.000 | 0.000 | 1.655 | 999.505 | 0.318 | n/a | 0.180 | 0.000 | n/a | n/a | 17.584 | 10.253 | 0.348 | 17.584 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c839000000000000009a | 1004.330 | 3.634 | n/a | 0.000 | 0.000 | 0.953 | 999.505 | 0.022 | n/a | 0.110 | 0.000 | n/a | n/a | 0.106 | 3.634 | 0.004 | 0.106 | gw-r/thread-68/journal/page | none observed |
| 7c065109c219c8390000000000000099 | 548.261 | 3.507 | n/a | 0.000 | 0.000 | 0.809 | 543.422 | 0.318 | n/a | 0.121 | 0.000 | n/a | n/a | 0.085 | 3.507 | 0.006 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 7c065109c219c839000000000000009b | 514.626 | 5.202 | n/a | 0.000 | 0.000 | 0.895 | 508.167 | 0.012 | n/a | 0.180 | 0.000 | n/a | n/a | 0.170 | 5.202 | 0.010 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 7c065109c219c839000000000000009e | 461.818 | 4.369 | n/a | 0.000 | 0.000 | 1.195 | 455.916 | 0.021 | n/a | 0.105 | 0.000 | n/a | n/a | 0.211 | 4.369 | 0.009 | 0.211 | gw-r/thread-74/journal/page | none observed |
| 7c065109c219c83900000000000000a0 | 64.437 | 8.479 | n/a | 0.000 | 0.000 | 0.849 | 54.870 | 0.017 | n/a | 0.073 | 0.000 | n/a | n/a | 0.150 | 8.479 | 0.132 | 0.150 | gw-r/thread-50/journal/page | none observed |
| 7c065109c219c839000000000000009c | 29.491 | 10.253 | n/a | 0.000 | 0.000 | 1.655 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.584 | 10.253 | 0.348 | 17.584 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 954.639 | n/a | n/a | n/a | 6.444 | n/a | 0.000 | 0.000 | 1.170 | 946.043 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.083 | 6.444 | 0.008 | 0.083 |
| p99 | 984.729 | n/a | n/a | n/a | 7.192 | n/a | 0.000 | 0.000 | 3.488 | 974.909 | 1.762 | n/a | 0.230 | 0.000 | n/a | n/a | 0.142 | 7.192 | 0.049 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c83900000000000000a3 | 984.729 | 4.257 | n/a | 0.000 | 0.000 | 3.488 | 974.909 | 1.762 | n/a | 0.230 | 0.000 | n/a | n/a | 0.083 | 4.257 | 0.004 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 7c065109c219c83900000000000000a1 | 954.639 | 7.192 | n/a | 0.000 | 0.000 | 1.170 | 946.043 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.142 | 7.192 | 0.008 | 0.142 | gw-r/thread-69/journal/page | none observed |
| 7c065109c219c83900000000000000a4 | 130.917 | 6.444 | n/a | 0.000 | 0.000 | 0.957 | 123.357 | 0.014 | n/a | 0.072 | 0.000 | n/a | n/a | 0.073 | 6.444 | 0.049 | 0.073 | gw-r/thread-70/journal/page | none observed |

## P3 / sweep / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.968 | n/a | n/a | n/a | 2.852 | n/a | 0.000 | 0.000 | 0.447 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.595 | 2.852 | 0.222 | 3.595 |
| p99 | 1004.635 | n/a | n/a | n/a | 9.533 | n/a | 0.000 | 0.000 | 6.470 | 1001.556 | 0.006 | n/a | 0.179 | 0.000 | n/a | n/a | 29.759 | 9.533 | 0.690 | 29.759 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c065109c219c83900000000000000ad | 1004.635 | 0.190 | n/a | 0.000 | 0.000 | 1.329 | 1001.556 | 0.006 | n/a | 0.179 | 0.000 | n/a | n/a | 1.375 | 0.190 | 0.000 | 1.375 | gw-r/thread-45/journal/page | none observed |
| 7c065109c219c83900000000000000a6 | 33.028 | 2.852 | n/a | 0.000 | 0.000 | 0.417 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.759 | 2.852 | 0.086 | 29.759 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c83900000000000000a7 | 28.579 | 9.533 | n/a | 0.000 | 0.000 | 0.400 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.646 | 9.533 | 0.334 | 18.646 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c83900000000000000a9 | 24.448 | 5.428 | n/a | 0.000 | 0.000 | 0.447 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.573 | 5.428 | 0.222 | 18.573 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c83900000000000000ab | 16.968 | 3.315 | n/a | 0.000 | 0.000 | 0.631 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.021 | 3.315 | 0.195 | 13.021 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c83900000000000000a5 | 11.552 | 2.044 | n/a | 0.000 | 0.000 | 6.470 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.037 | 2.044 | 0.177 | 3.037 | node-14/thread-2/socket.queue-and-write | none observed |
| 7c065109c219c83900000000000000aa | 9.569 | 6.607 | n/a | 0.000 | 0.000 | 0.429 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.533 | 6.607 | 0.690 | 2.533 | node-14/thread-2/replica.fetch-feed | none observed |
| 7c065109c219c83900000000000000a8 | 5.913 | 1.860 | n/a | 0.000 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.595 | 1.860 | 0.314 | 3.595 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7c065109c219c83900000000000000ac | 4.650 | 2.683 | n/a | 0.000 | 0.000 | 0.446 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.521 | 2.683 | 0.577 | 1.521 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.560 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 201.304 | 0.034 | n/a | 0.214 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 |
| p99 | 206.951 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.606 | 202.803 | 9.546 | n/a | 0.285 | 0.000 | n/a | n/a | 2.490 | 0.000 | 0.000 | 2.490 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc000000000000000d | 206.951 | 0.000 | n/a | 0.000 | 0.000 | 3.419 | 202.803 | 0.116 | n/a | 0.285 | 0.000 | n/a | n/a | 0.329 | 0.000 | 0.000 | 0.329 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc000000000000000e | 205.783 | 0.000 | n/a | 0.000 | 0.000 | 4.606 | 200.763 | 0.023 | n/a | 0.123 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc000000000000000a | 205.636 | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 201.491 | 0.034 | n/a | 0.251 | 0.000 | n/a | n/a | 2.490 | 0.000 | 0.000 | 2.490 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc000000000000000f | 204.014 | 0.000 | n/a | 0.000 | 0.000 | 1.708 | 201.878 | 0.085 | n/a | 0.214 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000000b | 203.560 | 0.000 | n/a | 0.000 | 0.000 | 1.732 | 201.304 | 0.013 | n/a | 0.185 | 0.000 | n/a | n/a | 0.327 | 0.000 | 0.000 | 0.327 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc0000000000000010 | 202.885 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.411 | 0.028 | n/a | 0.259 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc0000000000000011 | 101.330 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 90.194 | 9.546 | n/a | 0.119 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000000c | 63.463 | 0.000 | n/a | 0.000 | 0.000 | 1.318 | 61.643 | 0.113 | n/a | 0.261 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.350 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.557 | 201.412 | 0.024 | n/a | 0.234 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 |
| p99 | 204.359 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.877 | 201.981 | 0.066 | n/a | 2.753 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc000000000000001c | 204.359 | 0.000 | n/a | 0.000 | 0.000 | 1.727 | 201.981 | 0.024 | n/a | 0.361 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc000000000000001e | 204.297 | 0.000 | n/a | 0.000 | 0.000 | 1.877 | 201.924 | 0.066 | n/a | 0.258 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc000000000000001b | 203.870 | 0.000 | n/a | 0.000 | 0.000 | 1.506 | 201.792 | 0.053 | n/a | 0.248 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc0000000000000021 | 203.383 | 0.000 | n/a | 0.000 | 0.000 | 1.557 | 201.412 | 0.022 | n/a | 0.234 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc000000000000001f | 203.350 | 0.000 | n/a | 0.000 | 0.000 | 1.329 | 201.518 | 0.022 | n/a | 0.191 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000022 | 192.130 | 0.000 | n/a | 0.000 | 0.000 | 1.824 | 189.920 | 0.026 | n/a | 0.091 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc0000000000000020 | 110.824 | 0.000 | n/a | 0.000 | 0.000 | 1.791 | 106.083 | 0.027 | n/a | 2.753 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc000000000000001d | 56.820 | 0.000 | n/a | 0.000 | 0.000 | 1.341 | 55.007 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-68/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.373 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.426 | 202.185 | 0.058 | n/a | 0.224 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 |
| p99 | 218.938 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.573 | 216.935 | 6.333 | n/a | 0.468 | 0.000 | n/a | n/a | 0.646 | 0.000 | 0.000 | 0.646 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc0000000000000023 | 218.938 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 216.935 | 0.056 | n/a | 0.210 | 0.000 | n/a | n/a | 0.316 | 0.000 | 0.000 | 0.316 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc000000000000002d | 206.891 | 0.000 | n/a | 0.000 | 0.000 | 1.447 | 204.873 | 0.171 | n/a | 0.209 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc0000000000000029 | 206.802 | 0.000 | n/a | 0.000 | 0.000 | 1.398 | 204.897 | 0.069 | n/a | 0.233 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc000000000000002c | 205.797 | 0.000 | n/a | 0.000 | 0.000 | 2.008 | 203.246 | 0.019 | n/a | 0.229 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000027 | 205.373 | 0.000 | n/a | 0.000 | 0.000 | 2.573 | 202.185 | 0.058 | n/a | 0.303 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc0000000000000026 | 203.743 | 0.000 | n/a | 0.000 | 0.000 | 1.426 | 201.880 | 0.027 | n/a | 0.222 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc000000000000002b | 203.327 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.759 | 0.152 | n/a | 0.193 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc0000000000000024 | 203.267 | 0.000 | n/a | 0.000 | 0.000 | 1.149 | 201.634 | 0.044 | n/a | 0.224 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc0000000000000028 | 77.514 | 0.000 | n/a | 0.000 | 0.000 | 1.854 | 68.214 | 6.333 | n/a | 0.468 | 0.000 | n/a | n/a | 0.646 | 0.000 | 0.000 | 0.646 | gw-r/thread-68/journal/page | none observed |

## P3 / L256 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.386 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.498 | 201.564 | 0.108 | n/a | 0.250 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 |
| p99 | 209.623 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.421 | 207.199 | 27.421 | n/a | 0.490 | 0.000 | n/a | n/a | 0.450 | 0.000 | 0.000 | 0.450 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc000000000000002f | 209.623 | 0.000 | n/a | 0.000 | 0.000 | 1.884 | 207.199 | 0.073 | n/a | 0.252 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc0000000000000035 | 206.235 | 0.000 | n/a | 0.000 | 0.000 | 2.700 | 202.660 | 0.146 | n/a | 0.490 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc0000000000000034 | 204.912 | 0.000 | n/a | 0.000 | 0.000 | 1.747 | 202.512 | 0.072 | n/a | 0.378 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000036 | 204.884 | 0.000 | n/a | 0.000 | 0.000 | 1.587 | 202.721 | 0.030 | n/a | 0.250 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000032 | 203.851 | 0.000 | n/a | 0.000 | 0.000 | 1.396 | 201.744 | 0.060 | n/a | 0.252 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc0000000000000037 | 203.386 | 0.000 | n/a | 0.000 | 0.000 | 1.262 | 201.564 | 0.108 | n/a | 0.158 | 0.000 | n/a | n/a | 0.293 | 0.000 | 0.000 | 0.293 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc0000000000000031 | 158.184 | 0.000 | n/a | 0.000 | 0.000 | 7.421 | 149.988 | 0.047 | n/a | 0.278 | 0.000 | n/a | n/a | 0.450 | 0.000 | 0.000 | 0.450 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc0000000000000030 | 145.181 | 0.000 | n/a | 0.000 | 0.000 | 1.498 | 123.189 | 20.003 | n/a | 0.156 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000002e | 135.032 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 119.443 | 14.353 | n/a | 0.123 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc0000000000000033 | 127.907 | 0.000 | n/a | 0.000 | 0.000 | 1.369 | 118.494 | 7.535 | n/a | 0.155 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000038 | 98.271 | 0.000 | n/a | 0.000 | 0.000 | 1.339 | 69.117 | 27.421 | n/a | 0.144 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.952 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.402 | 201.794 | 0.045 | n/a | 0.202 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 |
| p99 | 217.887 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 14.791 | 205.213 | 0.093 | n/a | 0.329 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc0000000000000039 | 217.887 | 0.000 | n/a | 0.000 | 0.000 | 14.791 | 202.593 | 0.093 | n/a | 0.171 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-69/journal/page | none observed |
| e394acdbda0a5cdc000000000000003e | 207.031 | 0.000 | n/a | 0.000 | 0.000 | 1.402 | 205.213 | 0.045 | n/a | 0.186 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000003a | 205.639 | 0.000 | n/a | 0.000 | 0.000 | 2.876 | 202.169 | 0.073 | n/a | 0.306 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc0000000000000042 | 203.970 | 0.000 | n/a | 0.000 | 0.000 | 1.525 | 201.875 | 0.035 | n/a | 0.240 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000003f | 203.952 | 0.000 | n/a | 0.000 | 0.000 | 1.825 | 201.768 | 0.022 | n/a | 0.186 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc000000000000003b | 203.537 | 0.000 | n/a | 0.000 | 0.000 | 1.329 | 201.733 | 0.074 | n/a | 0.124 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc0000000000000040 | 203.513 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 201.794 | 0.086 | n/a | 0.329 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| e394acdbda0a5cdc000000000000003c | 203.355 | 0.000 | n/a | 0.000 | 0.000 | 1.256 | 201.632 | 0.030 | n/a | 0.244 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc0000000000000041 | 203.115 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 201.662 | 0.021 | n/a | 0.202 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |

## P3 / recovery / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.764 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.482 | 201.285 | 0.088 | n/a | 0.169 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 |
| p99 | 204.914 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.997 | 202.667 | 14.432 | n/a | 0.207 | 0.000 | n/a | n/a | 0.523 | 0.000 | 0.000 | 0.523 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc0000000000000045 | 204.914 | 0.000 | n/a | 0.000 | 0.000 | 1.686 | 202.406 | 0.122 | n/a | 0.177 | 0.000 | n/a | n/a | 0.523 | 0.000 | 0.000 | 0.523 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc000000000000004c | 204.546 | 0.000 | n/a | 0.000 | 0.000 | 2.952 | 201.285 | 0.021 | n/a | 0.125 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc0000000000000047 | 204.013 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 202.667 | 0.031 | n/a | 0.203 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-74/journal/page | none observed |
| e394acdbda0a5cdc0000000000000048 | 203.926 | 0.000 | n/a | 0.000 | 0.000 | 1.482 | 202.024 | 0.032 | n/a | 0.169 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc000000000000004a | 203.764 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 201.959 | 0.088 | n/a | 0.207 | 0.000 | n/a | n/a | 0.333 | 0.000 | 0.000 | 0.333 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc000000000000004b | 202.360 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.172 | 0.022 | n/a | 0.140 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000046 | 189.352 | 0.000 | n/a | 0.000 | 0.000 | 1.217 | 173.843 | 13.928 | n/a | 0.046 | 0.000 | n/a | n/a | 0.318 | 0.000 | 0.000 | 0.318 | gw-r/thread-74/journal/page | none observed |
| e394acdbda0a5cdc000000000000004d | 188.240 | 0.000 | n/a | 0.000 | 0.000 | 2.997 | 181.794 | 3.100 | n/a | 0.045 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000049 | 72.081 | 0.000 | n/a | 0.000 | 0.000 | 1.664 | 55.418 | 14.432 | n/a | 0.177 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | gw-r/thread-73/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.382 | 201.153 | 0.019 | n/a | 0.124 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 |
| p99 | 205.540 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.766 | 203.223 | 0.063 | n/a | 0.261 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc000000000000004e | 205.540 | 0.000 | n/a | 0.000 | 0.000 | 1.766 | 203.223 | 0.041 | n/a | 0.261 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-72/journal/page | none observed |
| e394acdbda0a5cdc0000000000000055 | 203.551 | 0.000 | n/a | 0.000 | 0.000 | 1.382 | 201.730 | 0.041 | n/a | 0.181 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc0000000000000050 | 203.423 | 0.000 | n/a | 0.000 | 0.000 | 1.511 | 201.458 | 0.015 | n/a | 0.124 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 | gw-r/thread-72/journal/page | none observed |
| e394acdbda0a5cdc0000000000000056 | 203.175 | 0.000 | n/a | 0.000 | 0.000 | 1.482 | 201.199 | 0.032 | n/a | 0.149 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc0000000000000051 | 203.174 | 0.000 | n/a | 0.000 | 0.000 | 1.684 | 201.114 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc0000000000000057 | 203.072 | 0.000 | n/a | 0.000 | 0.000 | 1.620 | 201.153 | 0.016 | n/a | 0.116 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc000000000000004f | 203.024 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 201.504 | 0.063 | n/a | 0.154 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc0000000000000053 | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 200.895 | 0.019 | n/a | 0.126 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc0000000000000052 | 66.313 | 0.000 | n/a | 0.000 | 0.000 | 1.065 | 64.953 | 0.015 | n/a | 0.123 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-72/journal/page | none observed |
| e394acdbda0a5cdc0000000000000058 | 65.247 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 64.025 | 0.020 | n/a | 0.078 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-68/journal/page | none observed |

## P3 / p4h1 / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.576 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.379 | 201.270 | 0.028 | n/a | 0.137 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 |
| p99 | 212.886 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.926 | 202.183 | 14.259 | n/a | 0.333 | 0.000 | n/a | n/a | 0.500 | 0.000 | 0.000 | 0.500 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc0000000000000069 | 212.886 | 0.000 | n/a | 0.000 | 0.000 | 10.926 | 201.400 | 0.019 | n/a | 0.122 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc000000000000006b | 205.017 | 0.000 | n/a | 0.000 | 0.000 | 3.240 | 201.423 | 0.020 | n/a | 0.196 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc000000000000006a | 204.706 | 0.000 | n/a | 0.000 | 0.000 | 1.879 | 202.183 | 0.033 | n/a | 0.333 | 0.000 | n/a | n/a | 0.279 | 0.000 | 0.000 | 0.279 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc000000000000006f | 204.540 | 0.000 | n/a | 0.000 | 0.000 | 2.085 | 201.610 | 0.063 | n/a | 0.281 | 0.000 | n/a | n/a | 0.500 | 0.000 | 0.000 | 0.500 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc0000000000000066 | 203.931 | 0.000 | n/a | 0.000 | 0.000 | 1.852 | 201.685 | 0.027 | n/a | 0.173 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc000000000000006c | 203.874 | 0.000 | n/a | 0.000 | 0.000 | 1.379 | 202.029 | 0.022 | n/a | 0.279 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc0000000000000070 | 203.237 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 202.047 | 0.039 | n/a | 0.206 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-72/journal/page | none observed |
| e394acdbda0a5cdc0000000000000074 | 203.181 | 0.000 | n/a | 0.000 | 0.000 | 1.435 | 201.384 | 0.016 | n/a | 0.120 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc0000000000000064 | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 201.270 | 0.021 | n/a | 0.140 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000072 | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 201.221 | 0.019 | n/a | 0.137 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-72/journal/page | none observed |
| e394acdbda0a5cdc0000000000000065 | 182.949 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 167.447 | 14.259 | n/a | 0.044 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc000000000000006e | 133.448 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 132.522 | 0.028 | n/a | 0.156 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000071 | 118.698 | 0.000 | n/a | 0.000 | 0.000 | 1.330 | 117.003 | 0.052 | n/a | 0.130 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc000000000000006d | 103.623 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 97.881 | 4.349 | n/a | 0.135 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000067 | 95.187 | 0.000 | n/a | 0.000 | 0.000 | 1.565 | 84.203 | 8.953 | n/a | 0.111 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc0000000000000073 | 64.102 | 0.000 | n/a | 0.000 | 0.000 | 1.684 | 52.665 | 9.453 | n/a | 0.080 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-75/journal/page | none observed |

## P3 / grow3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.172 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 162.020 | 0.031 | n/a | 0.137 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 |
| p99 | 372.424 | n/a | n/a | n/a | 0.612 | n/a | 0.000 | 0.000 | 1.598 | 201.629 | 247.470 | n/a | 0.229 | 0.000 | n/a | n/a | 0.366 | 0.612 | 0.002 | 0.366 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc0000000000000084 | 372.424 | 0.612 | n/a | 0.000 | 0.000 | 1.400 | 122.568 | 247.470 | n/a | 0.195 | 0.000 | n/a | n/a | 0.179 | 0.612 | 0.002 | 0.179 | gw-r/thread-45/gateway.admission-wait | none observed |
| e394acdbda0a5cdc0000000000000083 | 203.433 | 0.000 | n/a | 0.000 | 0.000 | 1.598 | 201.431 | 0.050 | n/a | 0.137 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc0000000000000082 | 203.297 | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 201.629 | 0.013 | n/a | 0.172 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc0000000000000078 | 203.082 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.467 | 0.045 | n/a | 0.229 | 0.000 | n/a | n/a | 0.300 | 0.000 | 0.000 | 0.300 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc0000000000000077 | 202.865 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.526 | 0.066 | n/a | 0.125 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc000000000000007f | 202.792 | 0.000 | n/a | 0.000 | 0.000 | 0.930 | 201.433 | 0.021 | n/a | 0.154 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc000000000000007b | 202.172 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 201.207 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-45/journal/page | none observed |
| e394acdbda0a5cdc0000000000000076 | 163.428 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 162.020 | 0.031 | n/a | 0.151 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-72/journal/page | none observed |
| e394acdbda0a5cdc0000000000000075 | 158.667 | 0.000 | n/a | 0.000 | 0.000 | 1.350 | 155.709 | 1.186 | n/a | 0.108 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-69/journal/page | none observed |
| e394acdbda0a5cdc000000000000007d | 155.280 | 0.000 | n/a | 0.000 | 0.000 | 1.289 | 153.656 | 0.018 | n/a | 0.149 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-43/journal/page | none observed |
| e394acdbda0a5cdc0000000000000081 | 143.235 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 141.523 | 0.030 | n/a | 0.121 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc000000000000007c | 77.350 | 0.000 | n/a | 0.000 | 0.000 | 1.015 | 75.835 | 0.058 | n/a | 0.077 | 0.000 | n/a | n/a | 0.366 | 0.000 | 0.000 | 0.366 | gw-r/thread-43/journal/page | none observed |

## P3 / p4h3 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.486 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.175 | 0.021 | n/a | 0.128 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 |
| p99 | 205.900 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.990 | 202.420 | 6.033 | n/a | 0.438 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc0000000000000095 | 205.900 | 0.000 | n/a | 0.000 | 0.000 | 2.990 | 202.195 | 0.023 | n/a | 0.438 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc000000000000009b | 205.025 | 0.000 | n/a | 0.000 | 0.000 | 1.986 | 202.420 | 0.068 | n/a | 0.325 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc0000000000000097 | 203.512 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 201.924 | 0.085 | n/a | 0.267 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc000000000000009e | 203.382 | 0.000 | n/a | 0.000 | 0.000 | 1.255 | 201.707 | 0.104 | n/a | 0.157 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc00000000000000a3 | 203.285 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.751 | 0.019 | n/a | 0.186 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc000000000000009a | 203.001 | 0.000 | n/a | 0.000 | 0.000 | 1.450 | 201.128 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc0000000000000093 | 202.886 | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 201.418 | 0.018 | n/a | 0.232 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc0000000000000099 | 202.486 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.175 | 0.022 | n/a | 0.146 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc00000000000000a1 | 202.413 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 201.320 | 0.021 | n/a | 0.128 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc0000000000000098 | 202.223 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.035 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc00000000000000a2 | 170.246 | 0.000 | n/a | 0.000 | 0.000 | 1.510 | 168.484 | 0.013 | n/a | 0.081 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc0000000000000094 | 165.906 | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 164.534 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc0000000000000096 | 164.485 | 0.000 | n/a | 0.000 | 0.000 | 1.259 | 159.175 | 3.696 | n/a | 0.058 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc000000000000009f | 128.656 | 0.000 | n/a | 0.000 | 0.000 | 1.541 | 120.743 | 6.033 | n/a | 0.100 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-72/journal/page | none observed |

## P3 / grow10 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 138.223 | n/a | n/a | n/a | 0.508 | n/a | 0.000 | 0.000 | 1.357 | 111.678 | 0.026 | n/a | 0.136 | 0.000 | n/a | n/a | 0.240 | 0.508 | 0.004 | 0.240 |
| p99 | 220.047 | n/a | n/a | n/a | 1.185 | n/a | 0.000 | 0.000 | 2.456 | 201.906 | 168.691 | n/a | 0.228 | 0.000 | n/a | n/a | 0.420 | 1.185 | 0.010 | 0.420 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc00000000000000a5 | 220.047 | 0.951 | n/a | 0.000 | 0.000 | 1.131 | 48.774 | 168.691 | n/a | 0.177 | 0.000 | n/a | n/a | 0.323 | 0.951 | 0.004 | 0.323 | gw-r/thread-73/gateway.admission-wait | none observed |
| e394acdbda0a5cdc00000000000000a9 | 204.489 | 0.000 | n/a | 0.000 | 0.000 | 2.050 | 201.906 | 0.058 | n/a | 0.211 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc00000000000000ab | 203.515 | 0.000 | n/a | 0.000 | 0.000 | 1.357 | 201.494 | 0.031 | n/a | 0.228 | 0.000 | n/a | n/a | 0.405 | 0.000 | 0.000 | 0.405 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc00000000000000a4 | 202.824 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 201.463 | 0.020 | n/a | 0.132 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc00000000000000aa | 191.656 | 0.000 | n/a | 0.000 | 0.000 | 1.517 | 189.651 | 0.022 | n/a | 0.149 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc00000000000000ad | 138.223 | 1.010 | n/a | 0.000 | 0.000 | 1.004 | 135.850 | 0.026 | n/a | 0.135 | 0.000 | n/a | n/a | 0.197 | 1.010 | 0.007 | 0.197 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc00000000000000a7 | 114.629 | 1.185 | n/a | 0.000 | 0.000 | 1.194 | 111.678 | 0.015 | n/a | 0.136 | 0.000 | n/a | n/a | 0.420 | 1.185 | 0.010 | 0.420 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc00000000000000af | 99.010 | 0.589 | n/a | 0.000 | 0.000 | 2.456 | 95.676 | 0.026 | n/a | 0.116 | 0.000 | n/a | n/a | 0.146 | 0.589 | 0.006 | 0.146 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc00000000000000ac | 83.762 | 0.793 | n/a | 0.000 | 0.000 | 1.485 | 64.812 | 16.247 | n/a | 0.185 | 0.000 | n/a | n/a | 0.240 | 0.793 | 0.009 | 0.240 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc00000000000000b0 | 82.832 | 0.508 | n/a | 0.000 | 0.000 | 1.804 | 80.290 | 0.016 | n/a | 0.093 | 0.000 | n/a | n/a | 0.120 | 0.508 | 0.006 | 0.120 | gw-r/thread-75/journal/page | none observed |

## P3 / p4h10 / read (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.436 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.099 | 0.020 | n/a | 0.133 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 |
| p99 | 203.625 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 201.575 | 6.814 | n/a | 0.242 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc00000000000000c1 | 203.625 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 201.403 | 0.021 | n/a | 0.242 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c6 | 203.183 | 0.000 | n/a | 0.000 | 0.000 | 1.266 | 201.575 | 0.040 | n/a | 0.141 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc00000000000000ca | 202.814 | 0.000 | n/a | 0.000 | 0.000 | 1.325 | 201.099 | 0.017 | n/a | 0.153 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-69/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c3 | 202.601 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.502 | 0.017 | n/a | 0.133 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c9 | 202.522 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 201.105 | 0.030 | n/a | 0.220 | 0.000 | n/a | n/a | 0.265 | 0.000 | 0.000 | 0.265 | gw-r/thread-50/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c0 | 202.518 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.275 | 0.020 | n/a | 0.127 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c2 | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.158 | 0.023 | n/a | 0.109 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc00000000000000bd | 202.436 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.041 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c5 | 202.334 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 201.280 | 0.018 | n/a | 0.134 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc00000000000000be | 202.043 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 200.953 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c4 | 109.428 | 0.000 | n/a | 0.000 | 0.000 | 1.458 | 106.157 | 1.440 | n/a | 0.164 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-71/journal/page | none observed |
| e394acdbda0a5cdc00000000000000bf | 94.769 | 0.000 | n/a | 0.000 | 0.000 | 1.327 | 93.010 | 0.055 | n/a | 0.116 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc00000000000000c7 | 62.729 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 54.843 | 6.814 | n/a | 0.153 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-68/journal/page | none observed |
| e394acdbda0a5cdc00000000000000cc | 52.255 | 0.000 | n/a | 0.000 | 0.000 | 1.564 | 50.420 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-69/journal/page | none observed |

## P3 / presweep / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.933 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 201.461 | 0.024 | n/a | 0.137 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 |
| p99 | 205.709 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.912 | 202.638 | 3.742 | n/a | 0.214 | 0.000 | n/a | n/a | 0.756 | 0.000 | 0.000 | 0.756 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc00000000000000ce | 205.709 | 0.000 | n/a | 0.000 | 0.000 | 3.595 | 201.693 | 0.025 | n/a | 0.184 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc00000000000000cf | 205.032 | 0.000 | n/a | 0.000 | 0.000 | 2.052 | 202.638 | 0.016 | n/a | 0.160 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d3 | 204.061 | 0.000 | n/a | 0.000 | 0.000 | 1.347 | 202.241 | 0.056 | n/a | 0.214 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc00000000000000cd | 203.319 | 0.000 | n/a | 0.000 | 0.000 | 1.233 | 201.812 | 0.011 | n/a | 0.137 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-75/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d2 | 203.166 | 0.000 | n/a | 0.000 | 0.000 | 1.175 | 201.591 | 0.035 | n/a | 0.189 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-69/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d4 | 202.933 | 0.000 | n/a | 0.000 | 0.000 | 1.114 | 201.461 | 0.027 | n/a | 0.140 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d0 | 202.775 | 0.000 | n/a | 0.000 | 0.000 | 1.429 | 201.002 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-49/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d5 | 202.546 | 0.000 | n/a | 0.000 | 0.000 | 1.218 | 200.976 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d7 | 125.290 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 123.711 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.282 | 0.000 | 0.000 | 0.282 | gw-r/thread-73/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d6 | 74.060 | 0.000 | n/a | 0.000 | 0.000 | 2.187 | 70.995 | 0.024 | n/a | 0.098 | 0.000 | n/a | n/a | 0.756 | 0.000 | 0.000 | 0.756 | gw-r/thread-70/journal/page | none observed |
| e394acdbda0a5cdc00000000000000d1 | 55.813 | 0.000 | n/a | 0.000 | 0.000 | 4.912 | 46.800 | 3.742 | n/a | 0.097 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-47/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.651 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.268 | 201.070 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 |
| p99 | 203.651 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.268 | 201.070 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e394acdbda0a5cdc00000000000000df | 203.651 | 0.000 | n/a | 0.000 | 0.000 | 2.268 | 201.070 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-75/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
