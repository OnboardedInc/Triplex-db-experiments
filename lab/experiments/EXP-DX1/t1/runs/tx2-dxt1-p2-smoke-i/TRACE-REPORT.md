# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (350.770 ms, trace `8433dfdd253f7c2a00000000000000b4`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (101.543 ms, trace `8433dfdd253f7c2a00000000000000c3`); `gw-w/thread-69/peer.transact-await (includes order/network/storage)` (163.561 ms, trace `8433dfdd253f7c2a0000000000000148`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (150.413 ms, trace `8433dfdd253f7c2a0000000000000147`); `gw-w/thread-68/peer.transact-await (includes order/network/storage)` (141.732 ms, trace `8433dfdd253f7c2a0000000000000146`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-i`; source `b93872958321dadbd615ed359d84950571e7f982`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, native-logs, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 2867827.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 97 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1508.967 | 195.978 | 275.833 | 39 |
| baseline | 0 | 1974.740 | 42.024 | 1.360 | 44 |
| L1 | 1 | 1955.673 | 217.774 | 51.267 | 30 |
| L4 | 4 | 1973.299 | 279.125 | 230.915 | 44 |
| L16 | 16 | 1921.929 | 203.636 | 213.046 | 44 |
| L64 | 16 | 1939.592 | 306.443 | 228.960 | 44 |
| L256 | 16 | 1708.363 | 194.685 | 173.371 | 58 |
| L1024 | 16 | 1933.354 | 256.452 | 316.459 | 16 |
| recovery | 16 | 1976.379 | 192.533 | 260.331 | 49 |
| p4mix | 1 | 1769.275 | 35.260 | 18.648 | 38 |
| p4h1 | 1 | 1025.892 | 17.165 | 14.380 | 16 |
| grow3 | 0 | 452.609 | 18.852 | 0.392 | 36 |
| p4h3 | 1 | 2303.972 | 121.154 | 45.394 | 122 |
| grow10 | 0 | 1098.843 | 297.281 | 27.927 | 25 |
| p4h10 | 1 | 1786.964 | 47.203 | 25.608 | 58 |
| presweep | 16 | 1441.933 | 146.153 | 225.251 | 44 |
| sweep | 16 | 198.618 | 44.655 | 70.125 | 122 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000b4 | driver.queue.scheduler-late | 0.141 | none | 0 / 32 |
| 8433dfdd253f7c2a00000000000000b4 | driver.queue.scheduler-dispatch | 0.079 | none | 0 / 32 |

Observed active steps while trace 8433dfdd253f7c2a00000000000000b4 waited: []

| 8433dfdd253f7c2a00000000000000c3 | driver.queue.scheduler-dispatch | 1.889 | none | 0 / 32 |
| 8433dfdd253f7c2a00000000000000c3 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 8433dfdd253f7c2a00000000000000c3 waited: []

| 8433dfdd253f7c2a0000000000000148 | driver.queue.scheduler-dispatch | 0.010 | none | 9 / 32 |
| 8433dfdd253f7c2a0000000000000148 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 8433dfdd253f7c2a0000000000000148 waited: []

| 8433dfdd253f7c2a0000000000000147 | driver.queue.scheduler-dispatch | 0.011 | none | 8 / 32 |
| 8433dfdd253f7c2a0000000000000147 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace 8433dfdd253f7c2a0000000000000147 waited: []

| 8433dfdd253f7c2a0000000000000146 | driver.queue.scheduler-dispatch | 0.010 | none | 7 / 32 |
| 8433dfdd253f7c2a0000000000000146 | driver.queue.scheduler-late | 0.000 | none | 7 / 32 |

Observed active steps while trace 8433dfdd253f7c2a0000000000000146 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.134 | 0.627 | 0.000 | 0.772 | 6.999 | 0.013 | 0.000 | 0.089 | 1.479 | 5.529 | 0.088 | 0.000 | 0.639 | 13.914 | n/a | n/a | 0.075 | 7.930 | 0.256 | 0.075 |
| p99 | 62.084 | 4.170 | 0.000 | 4.002 | 25.230 | 0.520 | 0.000 | 0.918 | 4.408 | 9.686 | 0.210 | 0.000 | 2.730 | 24.512 | n/a | n/a | 0.354 | 25.839 | 0.416 | 0.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000094 | 62.084 | 25.230 | 0.520 | 0.000 | 0.089 | 4.408 | 6.405 | 0.210 | 0.000 | 0.636 | 24.512 | n/a | n/a | 0.074 | 25.839 | 0.416 | 0.074 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 2.495ms |
| 8433dfdd253f7c2a0000000000000092 | 44.132 | 10.353 | 0.011 | 0.000 | 0.911 | 1.452 | 9.686 | 0.088 | 0.000 | 2.730 | 18.546 | n/a | n/a | 0.354 | 11.276 | 0.256 | 0.354 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000096 | 29.134 | 6.999 | 0.013 | 0.000 | 0.918 | 1.479 | 4.909 | 0.123 | 0.000 | 0.639 | 13.914 | n/a | n/a | 0.139 | 7.930 | 0.272 | 0.139 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000098 | 26.438 | 5.432 | 0.266 | 0.000 | 0.074 | 2.153 | 5.529 | 0.070 | 0.000 | 1.029 | 11.811 | n/a | n/a | 0.075 | 5.772 | 0.218 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.134 | 1.294 | 0.000 | 2.221 | 6.999 | 0.013 | 0.000 | 0.918 | 1.479 | 4.909 | 0.123 | 0.000 | 0.639 | 13.914 | n/a | n/a | 0.139 | 7.930 | 0.272 | 0.139 |
| p99 | 29.134 | 1.294 | 0.000 | 2.221 | 6.999 | 0.013 | 0.000 | 0.918 | 1.479 | 4.909 | 0.123 | 0.000 | 0.639 | 13.914 | n/a | n/a | 0.139 | 7.930 | 0.272 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000096 | 29.134 | 6.999 | 0.013 | 0.000 | 0.918 | 1.479 | 4.909 | 0.123 | 0.000 | 0.639 | 13.914 | n/a | n/a | 0.139 | 7.930 | 0.272 | 0.139 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.573 | 0.573 | 0.000 | 1.000 | 5.452 | 0.009 | 0.000 | 0.125 | 1.311 | 2.021 | 0.069 | 0.000 | 1.618 | 12.644 | n/a | n/a | 0.079 | 6.019 | 0.206 | 0.079 |
| p99 | 46.003 | 1.619 | 0.000 | 2.684 | 6.239 | 0.430 | 0.000 | 0.761 | 2.548 | 7.730 | 0.125 | 0.000 | 6.649 | 22.153 | n/a | n/a | 0.161 | 6.694 | 0.266 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000a0 | 46.003 | 6.239 | 0.382 | 0.000 | 0.074 | 2.548 | 7.730 | 0.069 | 0.000 | 6.649 | 22.153 | n/a | n/a | 0.161 | 6.694 | 0.146 | 0.161 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000009c | 24.362 | 5.565 | 0.430 | 0.000 | 0.125 | 1.917 | 2.990 | 0.079 | 0.000 | 2.034 | 11.138 | n/a | n/a | 0.084 | 6.120 | 0.251 | 0.084 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000009e | 23.573 | 4.087 | 0.004 | 0.000 | 0.761 | 1.309 | 2.021 | 0.125 | 0.000 | 1.618 | 13.579 | n/a | n/a | 0.069 | 4.853 | 0.206 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000009a | 22.587 | 5.452 | 0.009 | 0.000 | 0.558 | 1.311 | 1.674 | 0.044 | 0.000 | 0.818 | 12.644 | n/a | n/a | 0.079 | 6.019 | 0.266 | 0.079 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.587 | 0.573 | 0.000 | 1.736 | 4.087 | 0.004 | 0.000 | 0.558 | 1.309 | 1.674 | 0.044 | 0.000 | 0.818 | 12.644 | n/a | n/a | 0.069 | 4.853 | 0.206 | 0.069 |
| p99 | 23.573 | 1.619 | 0.000 | 2.684 | 5.452 | 0.009 | 0.000 | 0.761 | 1.311 | 2.021 | 0.125 | 0.000 | 1.618 | 13.579 | n/a | n/a | 0.079 | 6.019 | 0.266 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a000000000000009e | 23.573 | 4.087 | 0.004 | 0.000 | 0.761 | 1.309 | 2.021 | 0.125 | 0.000 | 1.618 | 13.579 | n/a | n/a | 0.069 | 4.853 | 0.206 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000009a | 22.587 | 5.452 | 0.009 | 0.000 | 0.558 | 1.311 | 1.674 | 0.044 | 0.000 | 0.818 | 12.644 | n/a | n/a | 0.079 | 6.019 | 0.266 | 0.079 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.169 | 1.650 | 0.000 | 1.709 | 5.816 | 0.278 | 0.000 | 0.169 | 1.296 | 2.848 | 0.105 | 0.000 | 0.708 | 17.999 | n/a | n/a | 0.107 | 6.262 | 0.215 | 0.107 |
| p99 | 42.052 | 1.710 | 0.000 | 2.536 | 5.990 | 0.289 | 0.646 | 9.999 | 1.935 | 3.651 | 0.113 | 0.000 | 2.781 | 27.584 | n/a | n/a | 0.150 | 16.644 | 0.460 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000a4 | 42.052 | 5.503 | 0.289 | 0.000 | 0.089 | 1.935 | 3.651 | 0.113 | 0.000 | 2.781 | 27.584 | n/a | n/a | 0.107 | 5.881 | 0.140 | 0.107 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000a2 | 36.169 | 5.990 | 0.009 | 0.646 | 9.999 | 1.296 | 2.199 | 0.105 | 0.000 | 0.614 | 15.161 | n/a | n/a | 0.150 | 16.644 | 0.460 | 0.150 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000a7 | 29.164 | 5.816 | 0.278 | 0.000 | 0.169 | 1.228 | 2.848 | 0.059 | 0.000 | 0.708 | 17.999 | n/a | n/a | 0.062 | 6.262 | 0.215 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.359 | 0.240 | 0.000 | 0.568 | 9.444 | 0.013 | 0.000 | 0.121 | 1.216 | 3.222 | 0.083 | 0.000 | 1.612 | 24.368 | n/a | n/a | 0.055 | 9.740 | 0.195 | 0.055 |
| p99 | 93.406 | 3.426 | 0.025 | 5.771 | 13.491 | 1.995 | 0.901 | 0.247 | 4.480 | 10.522 | 0.210 | 0.000 | 7.547 | 60.851 | n/a | n/a | 0.063 | 16.447 | 0.253 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000ad | 93.406 | 9.444 | 0.176 | 0.000 | 0.121 | 4.480 | 10.522 | 0.210 | 0.000 | 7.547 | 60.851 | n/a | n/a | 0.055 | 9.740 | 0.104 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 0.553ms |
| 8433dfdd253f7c2a00000000000000b0 | 78.697 | 13.491 | 1.995 | 0.901 | 0.059 | 2.403 | 3.222 | 0.083 | 0.000 | 4.759 | 51.743 | n/a | n/a | 0.041 | 16.447 | 0.209 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000a9 | 48.359 | 11.120 | 0.013 | 0.879 | 0.208 | 1.216 | 9.988 | 0.148 | 0.000 | 0.356 | 24.368 | n/a | n/a | 0.063 | 12.221 | 0.253 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000ab | 30.040 | 5.609 | 0.005 | 0.000 | 0.247 | 0.973 | 1.608 | 0.041 | 0.000 | 1.612 | 19.890 | n/a | n/a | 0.055 | 5.861 | 0.195 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.541 | 0.734 | 0.000 | 0.710 | 4.323 | 0.010 | 0.000 | 0.062 | 2.284 | 3.403 | 0.170 | 0.000 | 3.265 | 24.416 | n/a | n/a | 0.048 | 4.969 | 0.030 | 0.048 |
| p99 | 366.594 | 1.330 | 0.000 | 1.857 | 9.232 | 0.411 | 0.712 | 0.636 | 4.407 | 46.516 | 3.269 | 0.000 | 8.303 | 350.770 | n/a | n/a | 0.087 | 10.030 | 0.186 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000b4 | 366.594 | 4.087 | 0.006 | 0.000 | 0.219 | 0.787 | 2.314 | 0.059 | 0.000 | 8.303 | 350.770 | n/a | n/a | 0.048 | 4.313 | 0.012 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000b6 | 162.998 | 4.323 | 0.010 | 0.000 | 0.636 | 2.683 | 46.516 | 3.269 | 0.000 | 6.307 | 99.167 | n/a | n/a | 0.087 | 4.969 | 0.030 | 0.087 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.273ms |
| 8433dfdd253f7c2a00000000000000b9 | 69.541 | 9.232 | 0.411 | 0.333 | 0.054 | 4.407 | 27.155 | 0.208 | 0.000 | 3.265 | 24.416 | n/a | n/a | 0.061 | 10.030 | 0.144 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000b2 | 37.525 | 6.060 | 0.156 | 0.712 | 0.062 | 2.284 | 3.403 | 0.170 | 0.000 | 1.169 | 23.468 | n/a | n/a | 0.042 | 6.990 | 0.186 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 162.998 | 1.009 | 0.000 | 1.591 | 4.087 | 0.006 | 0.000 | 0.219 | 0.787 | 2.314 | 0.059 | 0.000 | 6.307 | 99.167 | n/a | n/a | 0.048 | 4.313 | 0.012 | 0.048 |
| p99 | 366.594 | 1.330 | 0.000 | 1.857 | 4.323 | 0.010 | 0.000 | 0.636 | 2.683 | 46.516 | 3.269 | 0.000 | 8.303 | 350.770 | n/a | n/a | 0.087 | 4.969 | 0.030 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000b4 | 366.594 | 4.087 | 0.006 | 0.000 | 0.219 | 0.787 | 2.314 | 0.059 | 0.000 | 8.303 | 350.770 | n/a | n/a | 0.048 | 4.313 | 0.012 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000b6 | 162.998 | 4.323 | 0.010 | 0.000 | 0.636 | 2.683 | 46.516 | 3.269 | 0.000 | 6.307 | 99.167 | n/a | n/a | 0.087 | 4.969 | 0.030 | 0.087 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.273ms |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.329 | 0.751 | 0.000 | 1.505 | 5.883 | 0.008 | 0.000 | 0.477 | 2.591 | 17.601 | 0.085 | 0.000 | 1.276 | 67.849 | n/a | n/a | 0.047 | 7.131 | 0.075 | 0.047 |
| p99 | 346.585 | 2.848 | 0.050 | 4.973 | 22.372 | 1.040 | 0.928 | 1.893 | 38.468 | 172.933 | 2.491 | 0.000 | 2.991 | 101.543 | n/a | n/a | 3.852 | 26.123 | 0.156 | 3.852 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000c3 | 346.585 | 22.372 | 1.040 | 0.818 | 1.893 | 38.468 | 172.933 | 0.677 | 0.000 | 2.991 | 101.543 | n/a | n/a | 3.852 | 26.123 | 0.075 | 3.852 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.worker-message 1.288ms |
| 8433dfdd253f7c2a00000000000000be | 118.314 | 5.883 | 0.250 | 0.928 | 0.071 | 2.591 | 30.744 | 2.491 | 0.000 | 2.908 | 72.401 | n/a | n/a | 0.047 | 7.131 | 0.060 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000bb | 100.329 | 9.419 | 0.007 | 0.000 | 0.477 | 3.569 | 17.601 | 0.074 | 0.000 | 1.276 | 67.849 | n/a | n/a | 0.057 | 9.903 | 0.099 | 0.057 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000c1 | 29.026 | 3.454 | 0.008 | 0.000 | 1.069 | 0.972 | 5.483 | 0.085 | 0.000 | 0.583 | 17.333 | n/a | n/a | 0.040 | 4.531 | 0.156 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.848 | n/a | n/a | n/a | 7.440 | 0.319 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 8.828 | 0.998 | 0.018 |
| p99 | 152.255 | n/a | n/a | n/a | 41.519 | 36.018 | 2.431 | 0.000 | 1.028 | 91.012 | 0.017 | 0.000 | 0.302 | 0.000 | n/a | n/a | 0.038 | 60.194 | 1.000 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000bc | 152.255 | 41.519 | 16.244 | 2.431 | 0.000 | 0.716 | 91.012 | 0.012 | 0.000 | 0.302 | 0.000 | n/a | n/a | 0.018 | 60.194 | 0.395 | 0.018 | gw-w/thread-45/gateway.admitted-work | driver.worker-message 3.343ms |
| 8433dfdd253f7c2a0000000000000107 | 77.518 | 26.622 | 9.779 | 0.000 | 0.000 | 1.028 | 40.037 | 0.017 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.014 | 36.401 | 0.470 | 0.014 | gw-w/thread-48/gateway.admitted-work | none observed |
| 8433dfdd253f7c2a00000000000000da | 50.570 | 11.568 | 3.022 | 0.000 | 0.000 | 0.923 | 35.008 | 0.017 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.014 | 14.590 | 0.289 | 0.014 | gw-w/thread-45/gateway.admitted-work | none observed |
| 8433dfdd253f7c2a000000000000011a | 40.047 | 6.548 | 33.486 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 40.034 | 1.000 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| 8433dfdd253f7c2a0000000000000093 | 38.233 | 2.177 | 36.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 38.195 | 0.999 | 0.038 | node-14/thread-0/rpc.replica.observe | none observed |
| 8433dfdd253f7c2a00000000000000c6 | 23.292 | 14.332 | 8.935 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 23.267 | 0.999 | 0.025 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000c2 | 14.757 | 14.425 | 0.319 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 14.744 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000fb | 14.601 | 13.209 | 0.130 | 1.233 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 14.572 | 0.998 | 0.029 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000ee | 13.168 | 12.902 | 0.248 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 13.149 | 0.999 | 0.018 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000b7 | 11.387 | 11.150 | 0.220 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 11.370 | 0.998 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000b8 | 8.848 | 8.653 | 0.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.828 | 0.998 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000aa | 8.663 | 0.541 | 8.102 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.643 | 0.998 | 0.020 | node-14/thread-0/rpc.replica.observe | none observed |
| 8433dfdd253f7c2a000000000000012e | 7.868 | 7.760 | 0.085 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 7.845 | 0.997 | 0.023 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a0000000000000131 | 7.707 | 0.300 | 7.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 7.677 | 0.996 | 0.030 | node-14/thread-0/rpc.replica.observe | none observed |
| 8433dfdd253f7c2a00000000000000a3 | 7.697 | 6.752 | 0.928 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 7.680 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a0000000000000105 | 7.553 | 7.440 | 0.098 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.538 | 0.998 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a0000000000000097 | 7.499 | 7.338 | 0.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 7.481 | 0.998 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a0000000000000138 | 7.306 | 7.101 | 0.192 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.293 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 8433dfdd253f7c2a00000000000000cd | 7.305 | 0.962 | 6.318 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 7.281 | 0.997 | 0.024 | node-14/thread-0/rpc.replica.observe | none observed |
| 8433dfdd253f7c2a0000000000000101 | 6.983 | 6.888 | 0.076 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.964 | 0.997 | 0.019 | node-14/thread-2/replica.pull-at | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.026 | 0.751 | 0.050 | 1.505 | 3.454 | 0.008 | 0.000 | 1.069 | 0.972 | 5.483 | 0.085 | 0.000 | 0.583 | 17.333 | n/a | n/a | 0.040 | 4.531 | 0.156 | 0.040 |
| p99 | 29.026 | 0.751 | 0.050 | 1.505 | 3.454 | 0.008 | 0.000 | 1.069 | 0.972 | 5.483 | 0.085 | 0.000 | 0.583 | 17.333 | n/a | n/a | 0.040 | 4.531 | 0.156 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000c1 | 29.026 | 3.454 | 0.008 | 0.000 | 1.069 | 0.972 | 5.483 | 0.085 | 0.000 | 0.583 | 17.333 | n/a | n/a | 0.040 | 4.531 | 0.156 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.313 | 0.992 | 0.000 | 1.874 | 7.310 | 0.017 | 0.000 | 0.384 | 2.728 | 7.455 | 0.083 | 0.000 | 1.397 | 48.675 | n/a | n/a | 0.073 | 8.380 | 0.125 | 0.073 |
| p99 | 124.681 | 2.025 | 0.000 | 2.546 | 10.846 | 0.482 | 0.351 | 1.223 | 5.743 | 24.614 | 0.155 | 0.000 | 3.564 | 106.781 | n/a | n/a | 0.088 | 11.771 | 0.166 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000ca | 124.681 | 7.310 | 0.017 | 0.000 | 0.426 | 1.419 | 7.204 | 0.053 | 0.000 | 1.397 | 106.781 | n/a | n/a | 0.073 | 7.753 | 0.062 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000c7 | 101.196 | 10.846 | 0.482 | 0.351 | 0.092 | 5.743 | 24.614 | 0.083 | 0.000 | 3.564 | 55.361 | n/a | n/a | 0.059 | 11.771 | 0.116 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000ce | 67.313 | 10.499 | 0.307 | 0.323 | 0.070 | 3.434 | 21.438 | 0.155 | 0.000 | 2.233 | 28.808 | n/a | n/a | 0.047 | 11.199 | 0.166 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000c5 | 66.647 | 7.142 | 0.015 | 0.000 | 1.223 | 2.728 | 5.607 | 0.095 | 0.000 | 1.074 | 48.675 | n/a | n/a | 0.088 | 8.380 | 0.126 | 0.088 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.849ms |
| 8433dfdd253f7c2a00000000000000cc | 48.230 | 5.631 | 0.010 | 0.000 | 0.384 | 1.192 | 7.455 | 0.054 | 0.000 | 0.671 | 32.759 | n/a | n/a | 0.075 | 6.024 | 0.125 | 0.075 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 66.647 | 1.011 | 0.000 | 1.984 | 7.142 | 0.015 | 0.000 | 0.426 | 1.419 | 7.204 | 0.054 | 0.000 | 1.074 | 48.675 | n/a | n/a | 0.075 | 7.753 | 0.125 | 0.075 |
| p99 | 124.681 | 2.025 | 0.000 | 2.546 | 7.310 | 0.017 | 0.000 | 1.223 | 2.728 | 7.455 | 0.095 | 0.000 | 1.397 | 106.781 | n/a | n/a | 0.088 | 8.380 | 0.126 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000ca | 124.681 | 7.310 | 0.017 | 0.000 | 0.426 | 1.419 | 7.204 | 0.053 | 0.000 | 1.397 | 106.781 | n/a | n/a | 0.073 | 7.753 | 0.062 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000c5 | 66.647 | 7.142 | 0.015 | 0.000 | 1.223 | 2.728 | 5.607 | 0.095 | 0.000 | 1.074 | 48.675 | n/a | n/a | 0.088 | 8.380 | 0.126 | 0.088 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.849ms |
| 8433dfdd253f7c2a00000000000000cc | 48.230 | 5.631 | 0.010 | 0.000 | 0.384 | 1.192 | 7.455 | 0.054 | 0.000 | 0.671 | 32.759 | n/a | n/a | 0.075 | 6.024 | 0.125 | 0.075 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.933 | 0.382 | 0.000 | 0.410 | 6.384 | 0.695 | 0.000 | 0.063 | 2.078 | 21.379 | 0.086 | 0.000 | 1.029 | 42.765 | n/a | n/a | 0.049 | 7.399 | 0.055 | 0.049 |
| p99 | 134.175 | 0.901 | 0.010 | 0.734 | 6.919 | 2.120 | 0.253 | 0.067 | 2.387 | 42.742 | 0.151 | 0.000 | 3.467 | 80.418 | n/a | n/a | 0.056 | 9.103 | 0.115 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000d0 | 134.175 | 6.384 | 0.695 | 0.253 | 0.067 | 2.387 | 42.742 | 0.151 | 0.000 | 1.029 | 80.418 | n/a | n/a | 0.049 | 7.399 | 0.055 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000d3 | 78.933 | 6.919 | 2.120 | 0.000 | 0.063 | 2.078 | 21.379 | 0.086 | 0.000 | 3.467 | 42.765 | n/a | n/a | 0.056 | 9.103 | 0.115 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.529 | 0.309 | 0.000 | 1.981 | 4.427 | 0.006 | 0.000 | 0.108 | 3.127 | 5.039 | 0.053 | 0.000 | 1.101 | 19.729 | n/a | n/a | 0.043 | 4.995 | 0.082 | 0.043 |
| p99 | 108.020 | 1.168 | 3.073 | 3.710 | 8.163 | 0.364 | 4.152 | 0.354 | 5.707 | 28.760 | 0.191 | 40.254 | 4.167 | 65.742 | n/a | n/a | 0.057 | 8.949 | 0.164 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000d5 | 108.020 | 4.427 | 0.181 | 4.152 | 0.067 | 3.127 | 28.760 | 0.191 | 0.000 | 1.328 | 65.742 | n/a | n/a | 0.043 | 8.827 | 0.082 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000d7 | 64.322 | 4.635 | 0.006 | 0.000 | 0.354 | 0.858 | 5.039 | 0.045 | 40.254 | 0.850 | 12.226 | n/a | n/a | 0.056 | 4.995 | 0.078 | 0.056 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 8433dfdd253f7c2a00000000000000dc | 54.529 | 8.163 | 0.364 | 0.314 | 0.108 | 5.707 | 18.916 | 0.071 | 0.000 | 1.101 | 19.729 | n/a | n/a | 0.057 | 8.949 | 0.164 | 0.057 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000d9 | 38.348 | 4.114 | 0.005 | 0.000 | 0.125 | 4.543 | 2.120 | 0.053 | 0.000 | 4.167 | 23.179 | n/a | n/a | 0.042 | 4.244 | 0.111 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.348 | 1.168 | 0.000 | 1.981 | 4.114 | 0.005 | 0.000 | 0.125 | 4.543 | 2.120 | 0.053 | 0.000 | 4.167 | 23.179 | n/a | n/a | 0.042 | 4.244 | 0.111 | 0.042 |
| p99 | 38.348 | 1.168 | 0.000 | 1.981 | 4.114 | 0.005 | 0.000 | 0.125 | 4.543 | 2.120 | 0.053 | 0.000 | 4.167 | 23.179 | n/a | n/a | 0.042 | 4.244 | 0.111 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000d9 | 38.348 | 4.114 | 0.005 | 0.000 | 0.125 | 4.543 | 2.120 | 0.053 | 0.000 | 4.167 | 23.179 | n/a | n/a | 0.042 | 4.244 | 0.111 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.704 | 0.000 | 0.000 | 0.431 | 7.903 | 0.234 | 0.274 | 0.139 | 2.683 | 11.386 | 0.134 | 0.000 | 1.542 | 14.470 | n/a | n/a | 0.059 | 8.946 | 0.258 | 0.059 |
| p99 | 62.879 | 0.000 | 0.000 | 0.734 | 10.197 | 0.286 | 0.431 | 1.038 | 3.799 | 14.543 | 2.371 | 22.778 | 2.072 | 16.189 | n/a | n/a | 0.079 | 10.979 | 0.344 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000df | 62.879 | 4.363 | 0.234 | 0.274 | 0.139 | 2.683 | 14.543 | 0.134 | 22.778 | 1.464 | 16.189 | n/a | n/a | 0.079 | 5.010 | 0.080 | 0.079 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 8433dfdd253f7c2a00000000000000de | 34.704 | 7.903 | 0.005 | 0.000 | 1.038 | 3.799 | 11.386 | 2.371 | 0.000 | 2.072 | 6.072 | n/a | n/a | 0.059 | 8.946 | 0.258 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000e1 | 31.947 | 10.197 | 0.286 | 0.431 | 0.064 | 2.112 | 2.694 | 0.106 | 0.000 | 1.542 | 14.470 | n/a | n/a | 0.044 | 10.979 | 0.344 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.704 | 0.000 | 0.000 | 0.278 | 7.903 | 0.005 | 0.000 | 1.038 | 3.799 | 11.386 | 2.371 | 0.000 | 2.072 | 6.072 | n/a | n/a | 0.059 | 8.946 | 0.258 | 0.059 |
| p99 | 34.704 | 0.000 | 0.000 | 0.278 | 7.903 | 0.005 | 0.000 | 1.038 | 3.799 | 11.386 | 2.371 | 0.000 | 2.072 | 6.072 | n/a | n/a | 0.059 | 8.946 | 0.258 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000de | 34.704 | 7.903 | 0.005 | 0.000 | 1.038 | 3.799 | 11.386 | 2.371 | 0.000 | 2.072 | 6.072 | n/a | n/a | 0.059 | 8.946 | 0.258 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.455 | 0.425 | 0.000 | 0.997 | 5.182 | 0.013 | 0.000 | 0.150 | 1.210 | 4.431 | 0.082 | 0.000 | 0.639 | 19.765 | n/a | n/a | 0.047 | 6.208 | 0.165 | 0.047 |
| p99 | 65.745 | 5.051 | 3.469 | 6.060 | 11.614 | 1.501 | 0.402 | 1.125 | 4.615 | 24.487 | 0.277 | 0.000 | 3.629 | 37.128 | n/a | n/a | 0.084 | 12.424 | 0.273 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000e6 | 65.745 | 11.614 | 0.326 | 0.402 | 0.082 | 2.438 | 24.487 | 0.076 | 0.000 | 0.526 | 25.732 | n/a | n/a | 0.062 | 12.424 | 0.189 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000fa | 54.814 | 10.315 | 0.013 | 0.000 | 1.125 | 1.210 | 4.431 | 0.046 | 0.000 | 0.463 | 37.128 | n/a | n/a | 0.084 | 11.453 | 0.209 | 0.084 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000129 | 41.269 | 6.087 | 0.298 | 0.336 | 0.074 | 4.615 | 12.372 | 0.128 | 0.000 | 0.685 | 16.624 | n/a | n/a | 0.049 | 6.795 | 0.165 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000012b | 39.320 | 5.539 | 0.243 | 0.276 | 0.150 | 2.438 | 8.674 | 0.277 | 0.000 | 1.876 | 19.765 | n/a | n/a | 0.081 | 6.208 | 0.158 | 0.081 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000e4 | 37.564 | 9.322 | 0.005 | 0.000 | 0.926 | 1.118 | 4.869 | 0.136 | 0.000 | 0.639 | 20.506 | n/a | n/a | 0.043 | 10.252 | 0.273 | 0.043 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000f6 | 36.455 | 3.760 | 0.273 | 0.341 | 0.079 | 1.827 | 6.559 | 0.152 | 0.000 | 0.630 | 22.793 | n/a | n/a | 0.041 | 4.453 | 0.122 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000f8 | 34.206 | 3.453 | 0.006 | 0.000 | 0.340 | 0.876 | 1.856 | 0.082 | 0.000 | 3.629 | 23.917 | n/a | n/a | 0.047 | 3.799 | 0.111 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000fc | 33.204 | 5.182 | 1.501 | 0.269 | 0.080 | 2.343 | 2.940 | 0.087 | 0.000 | 2.955 | 17.802 | n/a | n/a | 0.045 | 7.031 | 0.212 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000127 | 23.267 | 3.645 | 0.005 | 0.000 | 0.178 | 1.207 | 1.833 | 0.079 | 0.000 | 1.885 | 14.391 | n/a | n/a | 0.042 | 3.828 | 0.165 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000fe | 23.150 | 3.036 | 0.005 | 0.000 | 0.403 | 0.942 | 1.720 | 0.077 | 0.000 | 0.622 | 16.295 | n/a | n/a | 0.049 | 3.444 | 0.149 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.194 | 0.000 | 0.000 | 0.660 | 5.136 | 0.303 | 0.276 | 0.068 | 1.691 | 2.209 | 0.041 | 0.000 | 0.455 | 15.002 | n/a | n/a | 0.045 | 5.857 | 0.060 | 0.045 |
| p99 | 97.161 | 0.998 | 0.000 | 0.804 | 5.867 | 0.540 | 0.329 | 0.089 | 1.915 | 34.207 | 0.171 | 0.000 | 0.824 | 54.128 | n/a | n/a | 0.059 | 6.751 | 0.258 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000e8 | 97.161 | 5.136 | 0.303 | 0.329 | 0.089 | 1.915 | 34.207 | 0.171 | 0.000 | 0.824 | 54.128 | n/a | n/a | 0.059 | 5.857 | 0.060 | 0.059 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000ea | 26.194 | 5.867 | 0.540 | 0.276 | 0.068 | 1.691 | 2.209 | 0.041 | 0.000 | 0.455 | 15.002 | n/a | n/a | 0.045 | 6.751 | 0.258 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 58.811 | 0.598 | 0.000 | 1.878 | 6.918 | 0.014 | 0.000 | 0.195 | 2.266 | 2.308 | 0.067 | 0.000 | 2.172 | 44.440 | n/a | n/a | 0.061 | 7.120 | 0.094 | 0.061 |
| p99 | 109.040 | 1.367 | 0.000 | 3.531 | 6.929 | 0.215 | 0.710 | 0.344 | 19.407 | 4.749 | 5.835 | 0.000 | 8.277 | 72.649 | n/a | n/a | 0.062 | 7.963 | 0.153 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000ef | 109.040 | 6.929 | 0.215 | 0.710 | 0.110 | 19.407 | 1.748 | 5.835 | 0.000 | 1.390 | 72.649 | n/a | n/a | 0.048 | 7.963 | 0.073 | 0.048 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000f0 | 58.811 | 5.175 | 0.014 | 0.000 | 0.344 | 1.788 | 4.749 | 0.067 | 0.000 | 2.172 | 44.440 | n/a | n/a | 0.062 | 5.533 | 0.094 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000ed | 46.573 | 6.918 | 0.006 | 0.000 | 0.195 | 2.266 | 2.308 | 0.044 | 0.000 | 8.277 | 26.496 | n/a | n/a | 0.061 | 7.120 | 0.153 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 58.811 | 1.367 | 0.000 | 1.878 | 5.175 | 0.014 | 0.000 | 0.344 | 1.788 | 4.749 | 0.067 | 0.000 | 2.172 | 44.440 | n/a | n/a | 0.062 | 5.533 | 0.094 | 0.062 |
| p99 | 58.811 | 1.367 | 0.000 | 1.878 | 5.175 | 0.014 | 0.000 | 0.344 | 1.788 | 4.749 | 0.067 | 0.000 | 2.172 | 44.440 | n/a | n/a | 0.062 | 5.533 | 0.094 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a00000000000000f0 | 58.811 | 5.175 | 0.014 | 0.000 | 0.344 | 1.788 | 4.749 | 0.067 | 0.000 | 2.172 | 44.440 | n/a | n/a | 0.062 | 5.533 | 0.094 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.150 | 0.236 | 0.000 | 1.607 | 3.036 | 0.005 | 0.000 | 0.178 | 0.942 | 1.720 | 0.077 | 0.000 | 0.622 | 14.391 | n/a | n/a | 0.042 | 3.444 | 0.149 | 0.042 |
| p99 | 23.267 | 0.677 | 0.000 | 1.613 | 3.645 | 0.005 | 0.000 | 0.403 | 1.207 | 1.833 | 0.079 | 0.000 | 1.885 | 16.295 | n/a | n/a | 0.049 | 3.828 | 0.165 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000127 | 23.267 | 3.645 | 0.005 | 0.000 | 0.178 | 1.207 | 1.833 | 0.079 | 0.000 | 1.885 | 14.391 | n/a | n/a | 0.042 | 3.828 | 0.165 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a00000000000000fe | 23.150 | 3.036 | 0.005 | 0.000 | 0.403 | 0.942 | 1.720 | 0.077 | 0.000 | 0.622 | 16.295 | n/a | n/a | 0.049 | 3.444 | 0.149 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.322 | 0.638 | 0.000 | 1.653 | 4.032 | 0.006 | 0.000 | 0.445 | 1.175 | 3.482 | 0.048 | 0.000 | 0.703 | 18.146 | n/a | n/a | 0.054 | 5.058 | 0.153 | 0.054 |
| p99 | 71.458 | 1.667 | 0.013 | 2.055 | 8.040 | 1.498 | 0.800 | 1.683 | 2.703 | 16.744 | 0.741 | 0.000 | 4.802 | 59.908 | n/a | n/a | 0.115 | 10.508 | 0.282 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000100 | 71.458 | 4.057 | 0.006 | 0.000 | 0.996 | 0.801 | 5.208 | 0.035 | 0.000 | 0.390 | 59.908 | n/a | n/a | 0.058 | 5.058 | 0.071 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000102 | 47.215 | 8.040 | 1.498 | 0.800 | 0.170 | 2.703 | 8.521 | 0.092 | 0.000 | 0.796 | 24.497 | n/a | n/a | 0.100 | 10.508 | 0.223 | 0.100 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000010f | 46.578 | 5.270 | 0.226 | 0.294 | 0.089 | 2.320 | 16.744 | 0.741 | 0.000 | 0.799 | 20.049 | n/a | n/a | 0.045 | 5.879 | 0.126 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000103 | 43.863 | 5.837 | 0.010 | 0.000 | 0.883 | 0.999 | 2.299 | 0.091 | 0.000 | 1.206 | 32.479 | n/a | n/a | 0.058 | 6.731 | 0.153 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000111 | 40.852 | 4.373 | 0.005 | 0.000 | 1.005 | 2.438 | 3.482 | 0.048 | 0.000 | 0.462 | 29.000 | n/a | n/a | 0.039 | 5.384 | 0.132 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000113 | 39.322 | 3.924 | 0.194 | 0.254 | 0.113 | 2.384 | 13.469 | 0.109 | 0.000 | 0.649 | 18.146 | n/a | n/a | 0.080 | 4.485 | 0.114 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000106 | 23.083 | 3.670 | 0.008 | 0.000 | 1.203 | 1.175 | 2.524 | 0.126 | 0.000 | 0.703 | 13.558 | n/a | n/a | 0.115 | 4.881 | 0.211 | 0.115 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000010d | 21.137 | 4.032 | 0.006 | 0.000 | 0.445 | 2.538 | 3.494 | 0.037 | 0.000 | 0.479 | 10.060 | n/a | n/a | 0.046 | 4.484 | 0.212 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000010b | 19.770 | 3.886 | 0.006 | 0.000 | 1.683 | 1.020 | 1.118 | 0.039 | 0.000 | 1.012 | 10.970 | n/a | n/a | 0.035 | 5.575 | 0.282 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 0.593ms |
| 8433dfdd253f7c2a0000000000000109 | 18.883 | 3.273 | 0.006 | 0.000 | 0.252 | 0.879 | 1.104 | 0.044 | 0.000 | 4.802 | 8.468 | n/a | n/a | 0.054 | 3.531 | 0.187 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.883 | 0.638 | 0.000 | 1.725 | 3.273 | 0.006 | 0.000 | 0.252 | 0.879 | 1.104 | 0.037 | 0.000 | 0.479 | 8.468 | n/a | n/a | 0.046 | 3.531 | 0.187 | 0.046 |
| p99 | 21.137 | 1.667 | 0.000 | 2.055 | 4.032 | 0.006 | 0.000 | 0.445 | 2.538 | 3.494 | 0.044 | 0.000 | 4.802 | 10.060 | n/a | n/a | 0.054 | 4.484 | 0.212 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a000000000000010d | 21.137 | 4.032 | 0.006 | 0.000 | 0.445 | 2.538 | 3.494 | 0.037 | 0.000 | 0.479 | 10.060 | n/a | n/a | 0.046 | 4.484 | 0.212 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000109 | 18.883 | 3.273 | 0.006 | 0.000 | 0.252 | 0.879 | 1.104 | 0.044 | 0.000 | 4.802 | 8.468 | n/a | n/a | 0.054 | 3.531 | 0.187 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.312 | 0.000 | 0.000 | 0.340 | 6.227 | 1.305 | 0.497 | 0.076 | 1.999 | 8.983 | 0.058 | 0.000 | 1.822 | 26.707 | n/a | n/a | 0.041 | 10.530 | 0.324 | 0.041 |
| p99 | 110.171 | 1.238 | 0.000 | 1.823 | 8.651 | 29.916 | 0.809 | 13.317 | 2.157 | 34.399 | 0.060 | 10.524 | 8.352 | 33.999 | n/a | n/a | 0.045 | 47.254 | 0.429 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000118 | 110.171 | 4.021 | 29.916 | 0.000 | 13.317 | 0.981 | 8.983 | 0.043 | 10.524 | 8.352 | 33.999 | n/a | n/a | 0.036 | 47.254 | 0.429 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | client.encode 5.092ms |
| 8433dfdd253f7c2a000000000000011b | 72.312 | 6.227 | 0.212 | 0.809 | 0.038 | 1.999 | 34.399 | 0.060 | 0.000 | 1.822 | 26.707 | n/a | n/a | 0.041 | 7.285 | 0.101 | 0.041 | gw-w/thread-47/gateway.admitted-work | none observed |
| 8433dfdd253f7c2a0000000000000124 | 32.452 | 8.651 | 1.305 | 0.497 | 0.076 | 2.157 | 8.678 | 0.058 | 0.000 | 1.441 | 9.542 | n/a | n/a | 0.045 | 10.530 | 0.324 | 0.045 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.211 | 1.569 | 0.000 | 1.839 | 5.638 | 0.010 | 0.000 | 0.158 | 1.451 | 7.797 | 0.127 | 0.000 | 0.464 | 17.404 | n/a | n/a | 0.062 | 8.354 | 0.219 | 0.062 |
| p99 | 59.584 | 2.787 | 1.042 | 5.374 | 8.402 | 0.852 | 0.525 | 11.926 | 2.669 | 11.061 | 0.243 | 0.000 | 4.083 | 45.783 | n/a | n/a | 0.085 | 16.467 | 0.389 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a000000000000012d | 59.584 | 4.157 | 0.006 | 0.000 | 0.576 | 0.796 | 7.797 | 0.042 | 0.000 | 0.369 | 45.783 | n/a | n/a | 0.058 | 4.739 | 0.080 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000130 | 42.306 | 4.531 | 0.010 | 0.000 | 11.926 | 1.451 | 1.573 | 0.041 | 0.000 | 4.083 | 18.629 | n/a | n/a | 0.062 | 16.467 | 0.389 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.231ms; driver.expected-state.bind-receipt 1.638ms |
| 8433dfdd253f7c2a0000000000000135 | 38.211 | 7.348 | 0.420 | 0.525 | 0.061 | 2.669 | 8.327 | 0.130 | 0.000 | 1.566 | 17.112 | n/a | n/a | 0.052 | 8.354 | 0.219 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000133 | 34.310 | 5.638 | 0.852 | 0.263 | 0.072 | 1.855 | 11.061 | 0.127 | 0.000 | 0.425 | 13.955 | n/a | n/a | 0.063 | 6.825 | 0.199 | 0.063 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000012f | 30.970 | 8.402 | 0.006 | 0.000 | 0.158 | 1.257 | 2.950 | 0.243 | 0.000 | 0.464 | 17.404 | n/a | n/a | 0.085 | 8.567 | 0.277 | 0.085 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.306 | 2.063 | 0.000 | 1.839 | 4.531 | 0.010 | 0.000 | 11.926 | 1.451 | 1.573 | 0.041 | 0.000 | 4.083 | 18.629 | n/a | n/a | 0.062 | 16.467 | 0.389 | 0.062 |
| p99 | 42.306 | 2.063 | 0.000 | 1.839 | 4.531 | 0.010 | 0.000 | 11.926 | 1.451 | 1.573 | 0.041 | 0.000 | 4.083 | 18.629 | n/a | n/a | 0.062 | 16.467 | 0.389 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000130 | 42.306 | 4.531 | 0.010 | 0.000 | 11.926 | 1.451 | 1.573 | 0.041 | 0.000 | 4.083 | 18.629 | n/a | n/a | 0.062 | 16.467 | 0.389 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.231ms; driver.expected-state.bind-receipt 1.638ms |

## P5 / presweep / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.954 | 0.265 | 0.000 | 0.449 | 3.916 | 0.010 | 0.000 | 0.114 | 1.183 | 1.665 | 0.065 | 0.000 | 0.968 | 13.246 | n/a | n/a | 0.062 | 4.469 | 0.188 | 0.062 |
| p99 | 43.949 | 1.624 | 0.000 | 2.389 | 6.365 | 0.262 | 1.283 | 1.013 | 9.611 | 4.890 | 0.086 | 0.000 | 1.438 | 20.330 | n/a | n/a | 0.075 | 8.023 | 0.307 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000139 | 43.949 | 6.365 | 0.262 | 1.283 | 0.114 | 9.611 | 4.890 | 0.065 | 0.000 | 0.968 | 20.330 | n/a | n/a | 0.062 | 8.023 | 0.183 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000013d | 23.797 | 3.916 | 0.245 | 0.253 | 0.054 | 0.902 | 2.118 | 0.071 | 0.000 | 1.140 | 15.055 | n/a | n/a | 0.041 | 4.469 | 0.188 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a0000000000000137 | 21.954 | 3.422 | 0.006 | 0.000 | 0.833 | 1.183 | 1.665 | 0.086 | 0.000 | 1.438 | 13.246 | n/a | n/a | 0.075 | 4.262 | 0.194 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000013b | 19.676 | 5.025 | 0.010 | 0.000 | 1.013 | 1.218 | 1.318 | 0.047 | 0.000 | 0.486 | 10.496 | n/a | n/a | 0.063 | 6.047 | 0.307 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.676 | 1.151 | 0.000 | 1.632 | 3.422 | 0.006 | 0.000 | 0.833 | 1.183 | 1.318 | 0.047 | 0.000 | 0.486 | 10.496 | n/a | n/a | 0.063 | 4.262 | 0.194 | 0.063 |
| p99 | 21.954 | 1.624 | 0.000 | 2.389 | 5.025 | 0.010 | 0.000 | 1.013 | 1.218 | 1.665 | 0.086 | 0.000 | 1.438 | 13.246 | n/a | n/a | 0.075 | 6.047 | 0.307 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000137 | 21.954 | 3.422 | 0.006 | 0.000 | 0.833 | 1.183 | 1.665 | 0.086 | 0.000 | 1.438 | 13.246 | n/a | n/a | 0.075 | 4.262 | 0.194 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8433dfdd253f7c2a000000000000013b | 19.676 | 5.025 | 0.010 | 0.000 | 1.013 | 1.218 | 1.318 | 0.047 | 0.000 | 0.486 | 10.496 | n/a | n/a | 0.063 | 6.047 | 0.307 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 151.225 | 0.638 | 0.518 | 2.633 | 7.946 | 6.147 | 0.000 | 0.013 | 4.550 | 1.241 | 17.998 | 0.000 | 1.275 | 108.351 | n/a | n/a | 0.034 | 16.092 | 0.111 | 0.034 |
| p99 | 221.032 | 1.714 | 2.894 | 6.026 | 12.909 | 22.162 | 0.000 | 0.056 | 13.954 | 4.239 | 27.611 | 0.000 | 7.578 | 163.561 | n/a | n/a | 0.077 | 29.493 | 0.160 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8433dfdd253f7c2a0000000000000148 | 221.032 | 7.321 | 22.162 | 0.000 | 0.010 | 9.180 | 1.241 | 16.422 | 0.000 | 1.058 | 163.561 | n/a | n/a | 0.077 | 29.493 | 0.133 | 0.077 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 5.719ms; driver.publication 4.344ms; driver.publication 3.359ms; driver.publication 2.407ms; driver.publication 2.271ms |
| 8433dfdd253f7c2a0000000000000147 | 209.317 | 8.581 | 19.606 | 0.000 | 0.011 | 7.557 | 1.210 | 20.680 | 0.000 | 1.214 | 150.413 | n/a | n/a | 0.044 | 28.199 | 0.135 | 0.044 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 5.719ms; driver.publication 4.344ms; driver.publication 3.359ms; driver.publication 2.407ms; driver.publication 2.271ms |
| 8433dfdd253f7c2a0000000000000146 | 197.540 | 7.300 | 14.667 | 0.000 | 0.011 | 9.897 | 1.357 | 21.666 | 0.000 | 0.877 | 141.732 | n/a | n/a | 0.034 | 21.978 | 0.111 | 0.034 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 5.719ms; driver.publication 4.344ms; driver.publication 3.359ms; driver.publication 2.407ms; driver.publication 2.271ms |
| 8433dfdd253f7c2a0000000000000145 | 176.006 | 11.546 | 12.754 | 0.000 | 0.015 | 13.954 | 0.938 | 17.012 | 0.000 | 3.579 | 116.177 | n/a | n/a | 0.033 | 24.315 | 0.138 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 4.344ms; driver.publication 3.359ms; driver.publication 2.407ms; driver.publication 2.271ms; driver.publication 2.230ms |
| 8433dfdd253f7c2a0000000000000144 | 169.471 | 8.665 | 9.672 | 0.000 | 0.017 | 4.550 | 3.428 | 27.611 | 0.000 | 1.275 | 114.222 | n/a | n/a | 0.031 | 18.354 | 0.108 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 4.344ms; driver.publication 3.359ms; driver.publication 2.271ms; driver.publication 2.230ms; driver.publication 1.743ms |
| 8433dfdd253f7c2a0000000000000143 | 151.225 | 7.946 | 6.147 | 0.000 | 0.020 | 5.279 | 0.993 | 21.993 | 0.000 | 0.460 | 108.351 | n/a | n/a | 0.036 | 14.113 | 0.093 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 4.344ms; driver.publication 3.359ms; driver.publication 2.271ms; driver.publication 2.230ms |
| 8433dfdd253f7c2a0000000000000142 | 136.703 | 9.324 | 4.085 | 0.000 | 0.011 | 2.697 | 4.239 | 18.496 | 0.000 | 5.437 | 92.385 | n/a | n/a | 0.028 | 13.420 | 0.098 | 0.028 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 3.359ms; driver.publication 2.271ms; driver.publication 2.230ms |
| 8433dfdd253f7c2a0000000000000141 | 100.328 | 12.909 | 3.169 | 0.000 | 0.013 | 2.518 | 1.971 | 17.998 | 0.000 | 5.402 | 56.297 | n/a | n/a | 0.050 | 16.092 | 0.160 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.271ms; driver.publication 2.230ms |
| 8433dfdd253f7c2a0000000000000140 | 82.625 | 6.873 | 3.024 | 0.000 | 0.021 | 2.033 | 1.240 | 16.944 | 0.000 | 1.621 | 50.839 | n/a | n/a | 0.029 | 9.918 | 0.120 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.230ms |
| 8433dfdd253f7c2a000000000000013f | 71.487 | 6.129 | 0.018 | 0.000 | 0.056 | 4.458 | 1.398 | 0.070 | 0.000 | 7.578 | 51.738 | n/a | n/a | 0.040 | 6.203 | 0.087 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.022 | 0.926 | 0.001 |
| p99 | 291.583 | n/a | n/a | n/a | 35.429 | n/a | 6.858 | 291.558 | 38.795 | 6.915 | 0.015 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.016 | 291.581 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28294f975ebe0cd70000000000000dc0 | 291.637 | 0.065 | n/a | 0.000 | 291.566 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 291.631 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000000dc1 | 291.601 | 0.031 | n/a | 0.000 | 291.568 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.599 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000000dc2 | 291.583 | 0.023 | n/a | 0.000 | 291.558 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.581 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000000094d | 291.478 | 0.554 | n/a | 0.000 | 290.919 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.473 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000000dca | 291.232 | 0.030 | n/a | 0.000 | 291.196 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 291.226 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000000094f | 291.206 | 0.025 | n/a | 0.000 | 291.178 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.203 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000000094e | 291.199 | 0.056 | n/a | 0.000 | 291.138 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.194 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000000dbf | 291.140 | 0.333 | n/a | 0.000 | 290.800 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 291.133 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e0000000000000951 | 289.771 | 0.021 | n/a | 0.000 | 289.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 289.767 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e0000000000000950 | 289.766 | 0.038 | n/a | 0.000 | 289.725 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 289.763 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000003d1 | 283.147 | 0.046 | n/a | 0.000 | 283.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.145 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000003d0 | 283.097 | 0.038 | n/a | 0.000 | 283.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.094 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000003cf | 283.047 | 0.042 | n/a | 0.000 | 283.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.044 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000003ce | 282.957 | 0.129 | n/a | 0.000 | 282.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 282.952 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000003dc | 282.888 | 0.049 | n/a | 0.000 | 282.836 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.885 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b159345916041270000000000009d30 | 278.697 | 0.083 | n/a | 0.000 | 278.613 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.696 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b159345916041270000000000009d2f | 278.632 | 0.048 | n/a | 0.000 | 278.581 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.629 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000003cd | 278.579 | 0.341 | n/a | 0.000 | 278.235 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.576 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000009bfb | 278.230 | 0.038 | n/a | 0.000 | 278.190 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.228 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000009bfa | 278.206 | 0.156 | n/a | 0.000 | 278.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.204 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.929 | 0.001 |
| p99 | 294.449 | n/a | n/a | n/a | 6.972 | n/a | 0.000 | 294.287 | 1.469 | 2.160 | 0.035 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.022 | 294.447 | 1.000 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b15934591604127000000000001d8cc | 294.449 | 0.161 | n/a | 0.000 | 294.287 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 294.447 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 1b15934591604127000000000000c778 | 261.067 | 0.131 | n/a | 0.000 | 260.933 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 261.064 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 1b15934591604127000000000001188a | 6.976 | 6.972 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 6.972 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000000c7a6 | 6.553 | 2.854 | n/a | 0.000 | 0.000 | 1.469 | 2.160 | 0.035 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.006 | 2.854 | 0.435 | 0.006 | node-14/thread-3/reader.execute | none observed |
| 1b159345916041270000000000011896 | 6.415 | 6.413 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.413 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000166bb | 1.789 | 1.787 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.787 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 1b15934591604127000000000001d2c8 | 1.270 | 1.269 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.269 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000014abe | 0.730 | 0.729 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.729 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000001b8d4 | 0.724 | 0.722 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.722 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000014038 | 0.585 | 0.583 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.583 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000011910 | 0.566 | 0.565 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.565 | 0.997 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 1b15934591604127000000000001cecc | 0.564 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.563 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000014a98 | 0.448 | 0.446 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.446 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000018ce8 | 0.431 | 0.429 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.429 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000012623 | 0.409 | 0.407 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.407 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000147fd | 0.397 | 0.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.395 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000000d594 | 0.369 | 0.367 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.367 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000014722 | 0.362 | 0.360 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.360 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000014749 | 0.359 | 0.358 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.358 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000000c7b8 | 0.354 | 0.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.352 | 0.993 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.936 | 0.001 |
| p99 | 279.968 | n/a | n/a | n/a | 5.725 | n/a | 0.000 | 279.932 | 2.709 | 1.014 | 0.008 | 0.000 | 0.027 | 0.000 | n/a | n/a | 2.164 | 279.967 | 1.000 | 2.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b71510718f8b7c0e000000000000cdf4 | 280.375 | 0.152 | n/a | 0.000 | 280.221 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.373 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000000c8d2 | 280.182 | 0.142 | n/a | 0.000 | 280.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 280.177 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| 1b15934591604127000000000001e91c | 279.968 | 0.035 | n/a | 0.000 | 279.932 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.967 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 1b15934591604127000000000001e91b | 279.300 | 0.099 | n/a | 0.000 | 279.198 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.298 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 28294f975ebe0cd7000000000000bd43 | 162.577 | 0.471 | n/a | 0.000 | 162.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 162.564 | 1.000 | 0.013 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 1b15934591604127000000000001d8cf | 161.203 | 0.073 | n/a | 0.000 | 161.128 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 161.201 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b71510718f8b7c0e000000000000c0c7 | 159.826 | 0.275 | n/a | 0.000 | 159.544 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 159.820 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 28294f975ebe0cd7000000000000bd4c | 21.014 | 14.042 | n/a | 1.822 | 0.000 | 2.709 | 1.528 | 0.008 | 0.000 | 0.898 | 0.000 | n/a | n/a | 0.006 | 15.865 | 0.755 | 0.006 | node-14/thread-5/reader.execute | replica.apply-delta 0.024ms |
| b71510718f8b7c0e000000000000c101 | 11.529 | 2.872 | n/a | 2.798 | 0.000 | 4.293 | 1.512 | 0.020 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.003 | 5.670 | 0.492 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 1b15934591604127000000000001d921 | 10.592 | 5.725 | n/a | 0.000 | 0.000 | 3.813 | 1.014 | 0.009 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.004 | 5.725 | 0.541 | 0.004 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.039ms |
| 28294f975ebe0cd7000000000000de04 | 6.135 | 6.133 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.133 | 1.000 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000eae1 | 5.082 | 5.078 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 5.078 | 0.999 | 0.004 | node-14/thread-5/reader.execute | none observed |
| 1b15934591604127000000000002cf5e | 4.241 | 4.240 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.240 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000cacc | 3.448 | 3.447 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.447 | 1.000 | 0.001 | node-14/thread-5/reader.execute | none observed |
| b71510718f8b7c0e000000000000c11d | 3.390 | 3.387 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.387 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000de33 | 3.343 | 0.114 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.229 | 0.114 | 0.034 | 3.229 | uncovered | none observed |
| b71510718f8b7c0e000000000000cc66 | 3.263 | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.248 | 0.016 | 0.005 | 3.248 | uncovered | none observed |
| b71510718f8b7c0e000000000000da43 | 3.119 | 2.836 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.282 | 2.836 | 0.909 | 0.282 | node-14/thread-4/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000debc | 2.822 | 2.821 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.821 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| b71510718f8b7c0e000000000000edb6 | 2.637 | 2.636 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.636 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L16 / read (219 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.026 | 0.945 | 0.001 |
| p99 | 616.230 | n/a | n/a | n/a | 5.646 | n/a | 0.000 | 616.208 | 2.328 | 0.782 | 0.008 | 0.000 | 0.027 | 0.000 | n/a | n/a | 3.492 | 616.229 | 1.000 | 3.492 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28294f975ebe0cd7000000000001f51d | 616.283 | 0.016 | n/a | 0.000 | 616.266 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.282 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.061ms |
| 28294f975ebe0cd7000000000001f51c | 616.259 | 0.019 | n/a | 0.000 | 616.238 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.258 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.061ms |
| 28294f975ebe0cd7000000000001f51b | 616.230 | 0.022 | n/a | 0.000 | 616.208 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.229 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.061ms |
| 28294f975ebe0cd7000000000001f51a | 616.209 | 0.050 | n/a | 0.000 | 616.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.208 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.061ms |
| 1b15934591604127000000000003675e | 616.155 | 0.075 | n/a | 0.000 | 616.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.155 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 1b15934591604127000000000003675a | 616.144 | 0.188 | n/a | 0.000 | 615.955 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.143 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 1b15934591604127000000000003675d | 616.115 | 0.021 | n/a | 0.000 | 616.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.114 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 1b15934591604127000000000003675c | 616.085 | 0.020 | n/a | 0.000 | 616.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.085 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 1b15934591604127000000000003675b | 616.059 | 0.024 | n/a | 0.000 | 616.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 616.058 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 1b159345916041270000000000036759 | 616.023 | 0.176 | n/a | 0.000 | 615.844 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 616.020 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 28294f975ebe0cd7000000000001f519 | 615.989 | 0.289 | n/a | 0.000 | 615.696 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 615.984 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.061ms |
| b71510718f8b7c0e00000000000208c1 | 615.942 | 0.080 | n/a | 0.000 | 615.862 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 615.941 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| b71510718f8b7c0e00000000000208c0 | 615.898 | 0.052 | n/a | 0.000 | 615.844 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 615.896 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| b71510718f8b7c0e00000000000208c8 | 615.847 | 0.019 | n/a | 0.000 | 615.828 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 615.846 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| b71510718f8b7c0e00000000000208c7 | 615.826 | 0.032 | n/a | 0.000 | 615.793 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 615.825 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| b71510718f8b7c0e00000000000208bf | 615.814 | 0.200 | n/a | 0.000 | 615.611 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 615.811 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 28294f975ebe0cd7000000000001f52e | 46.098 | 0.124 | n/a | 0.000 | 45.970 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 46.094 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 28294f975ebe0cd7000000000001f544 | 44.876 | 0.027 | n/a | 0.000 | 44.848 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 44.875 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b71510718f8b7c0e00000000000208d6 | 43.517 | 0.136 | n/a | 0.000 | 43.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 43.513 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 1b159345916041270000000000036769 | 43.484 | 0.141 | n/a | 0.000 | 43.339 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 43.479 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.054ms |

## P1 / L64 / read (169 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.058 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.052 | 0.972 | 0.002 |
| p99 | 348.662 | n/a | n/a | n/a | 17.512 | n/a | 2.413 | 348.587 | 1.153 | 25.927 | 0.081 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.633 | 348.657 | 1.000 | 0.633 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b15934591604127000000000003f792 | 348.697 | 0.040 | n/a | 0.000 | 348.654 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 348.694 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000003f791 | 348.662 | 0.071 | n/a | 0.000 | 348.587 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 348.657 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000003f790 | 348.550 | 0.041 | n/a | 0.000 | 348.506 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 348.547 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000003f78f | 348.521 | 0.065 | n/a | 0.000 | 348.453 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 348.518 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000003f78d | 348.494 | 0.614 | n/a | 0.000 | 347.875 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 348.490 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000003f78e | 348.471 | 0.166 | n/a | 0.000 | 348.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 348.467 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000297ad | 347.229 | 0.048 | n/a | 0.000 | 347.179 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 347.227 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000297ac | 347.204 | 0.115 | n/a | 0.000 | 347.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 347.203 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000297aa | 347.192 | 0.263 | n/a | 0.000 | 346.927 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 347.190 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000297ab | 347.106 | 0.038 | n/a | 0.000 | 347.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 347.105 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000297a9 | 346.948 | 0.254 | n/a | 0.000 | 346.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 346.942 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000027a4a | 346.053 | 0.534 | n/a | 0.000 | 345.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 346.049 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000027a4b | 345.723 | 0.059 | n/a | 0.000 | 345.661 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 345.720 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000027a4c | 345.703 | 0.022 | n/a | 0.000 | 345.679 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.701 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000027a54 | 345.069 | 0.052 | n/a | 0.000 | 345.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 345.065 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd70000000000027a55 | 345.036 | 0.020 | n/a | 0.000 | 345.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 345.034 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000002d675 | 319.066 | 0.063 | n/a | 0.000 | 319.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 319.062 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000002d674 | 318.981 | 0.074 | n/a | 0.000 | 318.904 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 318.979 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000002d673 | 318.865 | 0.091 | n/a | 0.000 | 318.769 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 318.860 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000002d672 | 318.655 | 0.246 | n/a | 0.000 | 318.401 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 318.647 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L256 / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.059 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.056 | 0.965 | 0.002 |
| p99 | 376.996 | n/a | n/a | n/a | 60.287 | n/a | 6.583 | 376.975 | 78.085 | 27.378 | 68.164 | 57.027 | 0.062 | 0.000 | n/a | n/a | 0.055 | 376.995 | 1.000 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28294f975ebe0cd700000000000348a8 | 377.024 | 0.048 | n/a | 0.000 | 376.975 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.023 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd700000000000348a7 | 376.996 | 0.014 | n/a | 0.000 | 376.981 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 376.995 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd700000000000348a6 | 376.983 | 0.021 | n/a | 0.000 | 376.961 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 376.982 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd700000000000348a5 | 376.929 | 0.066 | n/a | 0.000 | 376.861 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 376.927 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000357e8 | 375.033 | 0.028 | n/a | 0.000 | 375.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 375.032 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000357e7 | 375.006 | 0.067 | n/a | 0.000 | 374.937 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 375.004 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000357f9 | 374.804 | 0.020 | n/a | 0.000 | 374.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 374.802 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000357f8 | 374.799 | 0.026 | n/a | 0.000 | 374.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 374.798 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd700000000000348a4 | 374.223 | 0.156 | n/a | 0.000 | 374.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 374.220 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e00000000000357e6 | 374.133 | 0.128 | n/a | 0.000 | 374.001 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 374.130 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000004c2e7 | 373.928 | 0.304 | n/a | 0.000 | 373.622 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 373.925 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000004c306 | 373.031 | 0.251 | n/a | 0.000 | 372.778 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 373.029 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000004c307 | 372.934 | 0.179 | n/a | 0.000 | 372.752 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 372.932 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000004c321 | 372.546 | 0.113 | n/a | 0.000 | 372.432 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 372.545 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000004c322 | 372.542 | 0.036 | n/a | 0.000 | 372.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 372.541 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000004c320 | 372.475 | 0.057 | n/a | 0.000 | 372.417 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 372.474 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000002e6fb | 315.319 | 0.099 | n/a | 0.000 | 315.215 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 315.314 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000002e718 | 314.409 | 0.062 | n/a | 0.000 | 314.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 314.407 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000002e717 | 314.350 | 0.060 | n/a | 0.000 | 314.284 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 314.344 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000002e71d | 314.164 | 0.045 | n/a | 0.000 | 314.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 314.161 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (300 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.026 | 0.948 | 0.001 |
| p99 | 4.262 | n/a | n/a | n/a | 3.801 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 3.801 | 0.999 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b15934591604127000000000004d429 | 18.183 | 6.395 | n/a | 0.000 | 0.000 | 2.472 | 9.274 | 0.010 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.003 | 6.395 | 0.352 | 0.003 | gw-r/thread-54/gateway.admitted-work | none observed |
| b71510718f8b7c0e0000000000036b13 | 12.311 | 3.801 | n/a | 0.000 | 0.000 | 7.844 | 0.641 | 0.007 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.003 | 3.801 | 0.309 | 0.003 | node-14/thread-4/socket.wait-first-byte | none observed |
| 28294f975ebe0cd70000000000035940 | 5.878 | 1.890 | n/a | 0.000 | 0.000 | 2.975 | 0.977 | 0.009 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.003 | 1.890 | 0.322 | 0.003 | node-14/thread-5/socket.wait-first-byte | none observed |
| 1b1593459160412700000000000567a5 | 4.262 | 4.259 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.259 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000567d9 | 3.830 | 3.826 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.826 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000567da | 3.811 | 3.785 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 3.785 | 0.993 | 0.026 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000567db | 3.798 | 3.771 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.771 | 0.993 | 0.028 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000567dc | 3.753 | 3.724 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 3.724 | 0.992 | 0.029 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000055bac | 3.671 | 3.656 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.656 | 0.996 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000055bad | 3.664 | 3.637 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.637 | 0.993 | 0.027 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000567dd | 3.437 | 3.405 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 3.405 | 0.991 | 0.032 | node-14/thread-3/replica.pull-at | none observed |
| 28294f975ebe0cd70000000000035a72 | 3.368 | 3.359 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 3.359 | 0.997 | 0.010 | node-14/thread-5/replica.pull-at | none observed |
| 1b159345916041270000000000056802 | 3.328 | 3.325 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.325 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000056803 | 3.301 | 3.282 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.282 | 0.994 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000056804 | 3.278 | 3.258 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.258 | 0.994 | 0.020 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000515ad | 3.228 | 3.226 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.226 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000056805 | 3.214 | 3.187 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.187 | 0.992 | 0.027 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000051460 | 3.172 | 3.170 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.170 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000051461 | 3.166 | 3.156 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 3.156 | 0.997 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000056806 | 3.164 | 3.137 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.137 | 0.992 | 0.027 | node-14/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.025 | 0.950 | 0.001 |
| p99 | 313.568 | n/a | n/a | n/a | 5.310 | n/a | 0.000 | 313.403 | 1.351 | 2.266 | 0.009 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.022 | 313.567 | 1.000 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 28294f975ebe0cd70000000000052018 | 313.640 | 0.306 | n/a | 0.000 | 313.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.639 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 28294f975ebe0cd7000000000005201a | 313.627 | 0.111 | n/a | 0.000 | 313.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.626 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 28294f975ebe0cd70000000000052019 | 313.568 | 0.047 | n/a | 0.000 | 313.520 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.567 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 28294f975ebe0cd70000000000052017 | 313.428 | 0.024 | n/a | 0.000 | 313.403 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.427 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 28294f975ebe0cd70000000000052016 | 313.342 | 0.130 | n/a | 0.000 | 313.208 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 313.338 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 1b15934591604127000000000006b475 | 312.807 | 0.073 | n/a | 0.000 | 312.732 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.805 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 1b15934591604127000000000006b474 | 312.784 | 0.053 | n/a | 0.000 | 312.729 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.782 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 1b15934591604127000000000006b473 | 312.759 | 0.080 | n/a | 0.000 | 312.677 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.757 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 1b15934591604127000000000006b472 | 312.731 | 0.185 | n/a | 0.000 | 312.543 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 312.728 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 1b15934591604127000000000006b487 | 312.025 | 0.060 | n/a | 0.000 | 311.959 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 312.019 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| 1b15934591604127000000000006b488 | 311.999 | 0.024 | n/a | 0.000 | 311.974 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.998 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.056ms |
| b71510718f8b7c0e00000000000525a2 | 311.613 | 0.189 | n/a | 0.000 | 311.419 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 311.608 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b71510718f8b7c0e00000000000525d2 | 309.371 | 0.069 | n/a | 0.000 | 309.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.369 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b71510718f8b7c0e00000000000525f1 | 308.282 | 0.066 | n/a | 0.000 | 308.214 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.280 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b71510718f8b7c0e00000000000525f2 | 308.237 | 0.026 | n/a | 0.000 | 308.209 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.235 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b71510718f8b7c0e00000000000525f3 | 308.223 | 0.203 | n/a | 0.000 | 307.998 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 308.201 | 1.000 | 0.022 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 1b15934591604127000000000006c9b3 | 288.044 | 0.016 | n/a | 0.000 | 288.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.044 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000006c9b2 | 288.022 | 0.026 | n/a | 0.000 | 287.995 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 288.021 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000006c9b1 | 288.001 | 0.026 | n/a | 0.000 | 287.974 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 288.000 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b15934591604127000000000006c9b0 | 287.984 | 0.040 | n/a | 0.000 | 287.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.983 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.943 | 0.001 |
| p99 | 2.158 | n/a | n/a | n/a | 2.155 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 2.155 | 0.999 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b15934591604127000000000006ef2e | 42.763 | 25.899 | n/a | 1.432 | 0.000 | 1.406 | 13.972 | 0.028 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.003 | 27.330 | 0.639 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 1b159345916041270000000000079c25 | 2.158 | 2.155 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.155 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 1b15934591604127000000000006ef28 | 2.021 | 2.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.015 | 0.997 | 0.006 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.042ms |
| 1b1593459160412700000000000715d5 | 1.480 | 1.451 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 1.451 | 0.980 | 0.029 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000006f2db | 0.986 | 0.986 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.986 | 1.000 | 0.000 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000007d4f6 | 0.831 | 0.829 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.829 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000007a323 | 0.659 | 0.657 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.657 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000070671 | 0.624 | 0.623 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.623 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000885eb | 0.511 | 0.509 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.509 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000846e9 | 0.499 | 0.498 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.498 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000006efc1 | 0.487 | 0.486 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.486 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000897df | 0.483 | 0.465 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.465 | 0.962 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000007a391 | 0.482 | 0.480 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.480 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000008195e | 0.482 | 0.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.481 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000078fee | 0.453 | 0.452 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.452 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000008858e | 0.449 | 0.447 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.447 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000006f6cc | 0.435 | 0.433 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.433 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b159345916041270000000000088a0a | 0.414 | 0.409 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.409 | 0.989 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000006f801 | 0.404 | 0.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.402 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000008f673 | 0.402 | 0.400 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.400 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (172 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.933 | 0.001 |
| p99 | 1.162 | n/a | n/a | n/a | 1.155 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.155 | 0.999 | 0.007 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b15934591604127000000000008f883 | 12.555 | 3.510 | n/a | 0.000 | 0.000 | 1.484 | 7.481 | 0.049 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.003 | 3.510 | 0.280 | 0.003 | gw-r/thread-73/gateway.admitted-work | none observed |
| 1b1593459160412700000000000983c1 | 1.162 | 1.155 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.155 | 0.994 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009906e | 0.852 | 0.850 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.850 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000a23f0 | 0.700 | 0.699 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.699 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009b7ca | 0.675 | 0.674 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.674 | 0.999 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 1b1593459160412700000000000a94e3 | 0.631 | 0.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.629 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000a217e | 0.588 | 0.587 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.587 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009822b | 0.505 | 0.503 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.503 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b05e2 | 0.499 | 0.498 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.498 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b39d1 | 0.481 | 0.480 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.480 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000a0d4a | 0.435 | 0.435 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.435 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009b312 | 0.430 | 0.429 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.429 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009cd3a | 0.427 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.425 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009224f | 0.408 | 0.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.406 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009ac68 | 0.399 | 0.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.397 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000983d2 | 0.396 | 0.392 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.392 | 0.992 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009d27b | 0.394 | 0.393 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.393 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009f0d2 | 0.392 | 0.390 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.390 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000009876a | 0.387 | 0.385 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.385 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000999e5 | 0.386 | 0.385 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.385 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (141 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.926 | 0.001 |
| p99 | 6.040 | n/a | n/a | n/a | 3.989 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.479 | 3.989 | 0.999 | 0.479 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b1593459160412700000000000b529c | 12.754 | 2.911 | n/a | 0.000 | 0.000 | 1.339 | 8.438 | 0.015 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.003 | 2.911 | 0.228 | 0.003 | gw-r/thread-52/gateway.admitted-work | none observed |
| 1b1593459160412700000000000b8065 | 6.040 | 6.035 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 6.035 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8062 | 3.991 | 3.989 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.989 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8098 | 2.414 | 2.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.406 | 0.997 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b7bff | 2.205 | 2.203 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.203 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 1b1593459160412700000000000b8097 | 1.951 | 1.347 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.604 | 1.347 | 0.690 | 0.604 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b809c | 1.507 | 1.501 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 1.501 | 0.996 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000c2bed | 1.421 | 1.420 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.420 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8469 | 1.139 | 1.136 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.136 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8096 | 0.959 | 0.958 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.958 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b7c07 | 0.874 | 0.872 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.872 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000c477d | 0.781 | 0.775 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.775 | 0.992 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8099 | 0.730 | 0.251 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.479 | 0.251 | 0.344 | 0.479 | uncovered | none observed |
| 1b1593459160412700000000000b82dc | 0.681 | 0.676 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.676 | 0.993 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8316 | 0.607 | 0.599 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.599 | 0.987 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000c3a20 | 0.603 | 0.601 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.601 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000b8026 | 0.601 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 0.552 | 0.920 | 0.048 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000be80a | 0.592 | 0.590 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.590 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000c485a | 0.568 | 0.565 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.565 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000c4790 | 0.565 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.563 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.940 | 0.001 |
| p99 | 6.083 | n/a | n/a | n/a | 3.390 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.390 | 0.999 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b1593459160412700000000000d33fd | 24.149 | 3.390 | n/a | 0.000 | 0.000 | 1.224 | 11.130 | 0.007 | 8.376 | 0.018 | 0.000 | n/a | n/a | 0.003 | 3.390 | 0.140 | 0.003 | gw-r/thread-48/gateway.admitted-work | none observed |
| 1b1593459160412700000000000e5f26 | 6.083 | 6.080 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.080 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000d3b1c | 1.273 | 1.272 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.272 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000f1c5c | 1.042 | 1.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 1.024 | 0.983 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e5f3f | 0.865 | 0.857 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.857 | 0.991 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e6074 | 0.735 | 0.733 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.733 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000f1f37 | 0.698 | 0.697 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.697 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e69b7 | 0.687 | 0.646 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 0.646 | 0.940 | 0.041 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000de9a1 | 0.671 | 0.669 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.669 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e5f3b | 0.606 | 0.602 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.602 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e5f67 | 0.590 | 0.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.586 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000ec3de | 0.580 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.579 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e5f42 | 0.571 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.568 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e2368 | 0.560 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.558 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e1cd7 | 0.534 | 0.533 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.533 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e5f59 | 0.533 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.531 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e6195 | 0.532 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.529 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e6a51 | 0.487 | 0.486 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.486 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e5f74 | 0.479 | 0.476 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.476 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1b1593459160412700000000000e6185 | 0.472 | 0.471 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.471 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (187 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.047 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.044 | 0.970 | 0.002 |
| p99 | 269.403 | n/a | n/a | n/a | 12.368 | n/a | 4.096 | 269.328 | 4.105 | 5.581 | 0.010 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.031 | 269.399 | 1.000 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b71510718f8b7c0e000000000005adad | 269.452 | 0.057 | n/a | 0.000 | 269.392 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.449 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000005adac | 269.403 | 0.164 | n/a | 0.000 | 269.235 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.399 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000005b742 | 269.392 | 0.142 | n/a | 0.000 | 269.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.388 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000005b744 | 269.357 | 0.032 | n/a | 0.000 | 269.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.355 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000005b743 | 269.356 | 0.038 | n/a | 0.000 | 269.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.354 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000005b745 | 269.348 | 0.018 | n/a | 0.000 | 269.328 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.346 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000005b746 | 269.137 | 0.038 | n/a | 0.000 | 269.090 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 269.128 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000005adbb | 268.939 | 0.199 | n/a | 0.000 | 268.738 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.937 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000005adba | 268.836 | 0.087 | n/a | 0.000 | 268.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.833 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e000000000005adb9 | 268.776 | 0.055 | n/a | 0.000 | 268.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 268.769 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f9f38 | 267.177 | 0.159 | n/a | 0.000 | 267.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 267.175 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f9f56 | 265.801 | 0.042 | n/a | 0.000 | 265.757 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.799 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f9f57 | 265.795 | 0.050 | n/a | 0.000 | 265.743 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.794 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f9f63 | 265.274 | 0.055 | n/a | 0.000 | 265.217 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.272 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f9f64 | 265.250 | 0.025 | n/a | 0.000 | 265.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.248 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f9f65 | 265.240 | 0.018 | n/a | 0.000 | 265.220 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.238 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b71510718f8b7c0e0000000000055918 | 51.950 | 28.937 | n/a | 12.462 | 0.000 | 4.105 | 6.423 | 0.010 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.004 | 41.399 | 0.797 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 28294f975ebe0cd7000000000005586d | 39.538 | 0.151 | n/a | 0.000 | 39.383 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 39.535 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 28294f975ebe0cd7000000000005586e | 39.473 | 0.043 | n/a | 0.000 | 39.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 39.471 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1b1593459160412700000000000f3a71 | 39.244 | 0.119 | n/a | 0.000 | 39.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 39.241 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P5 / sweep / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.391 | n/a | n/a | n/a | 2.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 2.053 | 0.993 | 0.012 |
| p99 | 25.021 | n/a | n/a | n/a | 9.581 | n/a | 0.000 | 0.000 | 6.915 | 10.735 | 0.016 | 0.000 | 0.030 | 0.000 | n/a | n/a | 5.042 | 9.581 | 1.000 | 5.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b71510718f8b7c0e0000000000060d2c | 25.021 | 7.322 | n/a | 0.000 | 0.000 | 6.915 | 10.735 | 0.014 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.005 | 7.322 | 0.293 | 0.005 | gw-r/thread-50/gateway.admitted-work | none observed |
| 8a87d9c268b7a0eb00000000000002e3 | 9.597 | 9.581 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 9.581 | 0.998 | 0.016 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000002e4 | 7.646 | 7.590 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 7.590 | 0.993 | 0.056 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000002e5 | 7.395 | 7.365 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 7.365 | 0.996 | 0.030 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000002e6 | 7.304 | 7.278 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.278 | 0.996 | 0.026 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001ea | 7.287 | 5.600 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.687 | 5.600 | 0.768 | 1.687 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000002e7 | 7.264 | 7.238 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.238 | 0.996 | 0.026 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001ec | 7.207 | 5.410 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.797 | 5.410 | 0.751 | 1.797 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001eb | 7.205 | 5.500 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.705 | 5.500 | 0.763 | 1.705 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001ed | 7.091 | 5.282 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.809 | 5.282 | 0.745 | 1.809 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000002e8 | 6.973 | 6.932 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 6.932 | 0.994 | 0.041 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001ee | 6.970 | 5.162 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.808 | 5.162 | 0.741 | 1.808 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001ef | 6.921 | 5.071 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.850 | 5.071 | 0.733 | 1.850 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001f0 | 6.769 | 4.938 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.832 | 4.938 | 0.729 | 1.832 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001e3 | 6.225 | 6.179 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 6.179 | 0.993 | 0.046 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001e4 | 6.128 | 6.073 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 6.073 | 0.991 | 0.055 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000000e3 | 6.091 | 6.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 6.052 | 0.993 | 0.040 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001e5 | 6.061 | 5.995 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.066 | 5.995 | 0.989 | 0.066 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001e6 | 5.947 | 5.878 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 5.878 | 0.988 | 0.069 | node-14/thread-6/replica.pull-at | none observed |
| 8a87d9c268b7a0eb00000000000001e7 | 5.894 | 5.808 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.086 | 5.808 | 0.985 | 0.086 | node-14/thread-6/replica.pull-at | none observed |

## P1 / baseline / read (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.022 | 0.932 | 0.002 |
| p99 | 0.129 | n/a | n/a | n/a | 0.126 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.126 | 0.977 | 0.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b71510718f8b7c0e000000000000c0ad | 0.129 | 0.126 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.126 | 0.977 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 28294f975ebe0cd7000000000000bd3f | 0.106 | 0.101 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.101 | 0.947 | 0.006 | node-14/thread-5/reader.execute | none observed |
| 1b15934591604127000000000000c761 | 0.071 | 0.069 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.069 | 0.969 | 0.002 | node-14/thread-3/reader.execute | none observed |
| b71510718f8b7c0e000000000000c0af | 0.051 | 0.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.049 | 0.971 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000bd40 | 0.036 | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.032 | 0.885 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 1b15934591604127000000000000c762 | 0.032 | 0.030 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.030 | 0.932 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b71510718f8b7c0e000000000000c0ae | 0.031 | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.026 | 0.836 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| 1b15934591604127000000000000c766 | 0.023 | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.022 | 0.927 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000000c763 | 0.022 | 0.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.021 | 0.956 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b71510718f8b7c0e000000000000c0b0 | 0.021 | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.020 | 0.943 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| b71510718f8b7c0e000000000000c0b1 | 0.017 | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.015 | 0.900 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000bd41 | 0.015 | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.014 | 0.889 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 28294f975ebe0cd7000000000000bd42 | 0.013 | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.891 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 1b15934591604127000000000000c764 | 0.013 | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.944 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1b15934591604127000000000000c765 | 0.011 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.932 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P1 / outside-phases / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.108 | n/a | n/a | n/a | 0.104 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.104 | 0.957 | 0.003 |
| p99 | 0.518 | n/a | n/a | n/a | 0.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.506 | 0.993 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b71510718f8b7c0e0000000000061737 | 0.518 | 0.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.506 | 0.978 | 0.011 | node-14/thread-4/replica.pull-at | none observed |
| b71510718f8b7c0e0000000000061736 | 0.391 | 0.388 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.388 | 0.993 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| b71510718f8b7c0e0000000000061739 | 0.353 | 0.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.350 | 0.992 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| b71510718f8b7c0e0000000000061738 | 0.108 | 0.104 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.104 | 0.957 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| 28294f975ebe0cd70000000000062404 | 0.049 | 0.046 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.046 | 0.945 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 28294f975ebe0cd70000000000062405 | 0.041 | 0.039 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.039 | 0.952 | 0.002 | node-14/thread-5/replica.pull-at | none observed |

## P3 / outside-phases / read (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.013 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.924 | 200.832 | 0.015 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.092 | 0.047 | 0.000 | 0.092 |
| p99 | 203.954 | n/a | n/a | n/a | 0.711 | n/a | 0.000 | 0.000 | 2.800 | 201.406 | 0.961 | 8.376 | 0.182 | 0.000 | n/a | n/a | 0.256 | 0.711 | 0.009 | 0.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d00000000000000a6 | 203.954 | 0.035 | n/a | 0.000 | 0.000 | 2.414 | 192.918 | 0.012 | 8.376 | 0.122 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d000000000000007c | 203.903 | 0.034 | n/a | 0.000 | 0.000 | 2.800 | 200.871 | 0.020 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d0000000000000005 | 203.349 | 0.075 | n/a | 0.000 | 0.000 | 1.509 | 201.406 | 0.024 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.153 | 0.075 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000006 | 203.338 | 0.318 | n/a | 0.000 | 0.000 | 1.510 | 201.158 | 0.014 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.175 | 0.318 | 0.002 | 0.175 | gw-r/thread-53/journal/page | none observed |
| 9b9a75b4776c068d000000000000005c | 203.025 | 0.053 | n/a | 0.000 | 0.000 | 1.328 | 201.353 | 0.021 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.139 | 0.053 | 0.000 | 0.139 | gw-r/thread-51/journal/page | none observed |
| 9b9a75b4776c068d00000000000000ca | 202.912 | 0.055 | n/a | 0.000 | 0.000 | 1.799 | 200.808 | 0.013 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.138 | 0.055 | 0.000 | 0.138 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d000000000000005b | 202.720 | 0.039 | n/a | 0.000 | 0.000 | 1.124 | 201.307 | 0.022 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.085 | 0.039 | 0.000 | 0.085 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d00000000000000cc | 202.670 | 0.053 | n/a | 0.000 | 0.000 | 0.986 | 201.244 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.256 | 0.053 | 0.000 | 0.256 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d00000000000000cd | 202.444 | 0.047 | n/a | 0.000 | 0.000 | 0.841 | 201.318 | 0.010 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.092 | 0.047 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d000000000000005e | 202.400 | 0.041 | n/a | 0.000 | 0.000 | 0.999 | 201.097 | 0.024 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.119 | 0.041 | 0.000 | 0.119 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d000000000000007a | 202.386 | 0.052 | n/a | 0.000 | 0.000 | 1.021 | 201.058 | 0.015 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.121 | 0.052 | 0.000 | 0.121 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d0000000000000079 | 202.365 | 0.036 | n/a | 0.000 | 0.000 | 0.972 | 201.116 | 0.053 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d0000000000000075 | 202.230 | 0.065 | n/a | 0.000 | 0.000 | 0.825 | 201.006 | 0.020 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.193 | 0.065 | 0.000 | 0.193 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d0000000000000007 | 202.174 | 0.049 | n/a | 0.000 | 0.000 | 0.960 | 200.851 | 0.012 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.190 | 0.049 | 0.000 | 0.190 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d00000000000000a4 | 202.132 | 0.043 | n/a | 0.000 | 0.000 | 0.957 | 200.956 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.075 | 0.043 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d00000000000000a2 | 202.114 | 0.044 | n/a | 0.000 | 0.000 | 0.701 | 201.140 | 0.026 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.084 | 0.044 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000076 | 202.113 | 0.061 | n/a | 0.000 | 0.000 | 0.914 | 200.899 | 0.012 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.127 | 0.061 | 0.000 | 0.127 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d000000000000009b | 202.013 | 0.040 | n/a | 0.000 | 0.000 | 0.878 | 200.910 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d000000000000009f | 201.902 | 0.034 | n/a | 0.000 | 0.000 | 0.712 | 200.919 | 0.015 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.101 | 0.034 | 0.000 | 0.101 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d00000000000000cb | 201.812 | 0.041 | n/a | 0.000 | 0.000 | 0.758 | 200.832 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-53/journal/page | none observed |

## P3 / outside-phases / internal (19 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 555.049 | n/a | n/a | n/a | 2.448 | n/a | 0.000 | 0.000 | 0.783 | 551.910 | 0.019 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.127 | 2.448 | 0.008 | 0.127 |
| p99 | 1005.843 | n/a | n/a | n/a | 85.680 | n/a | 3.526 | 0.000 | 3.947 | 1002.001 | 1.076 | 8.376 | 0.654 | 0.000 | n/a | n/a | 2.571 | 89.206 | 0.801 | 2.571 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000017 | 1005.843 | 0.230 | n/a | 0.000 | 0.000 | 1.635 | 1002.001 | 0.033 | 0.000 | 0.654 | 0.000 | n/a | n/a | 1.290 | 0.230 | 0.000 | 1.290 | gw-r/thread-52/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000053 | 1004.366 | 0.234 | n/a | 0.000 | 0.000 | 1.208 | 1001.479 | 0.045 | 0.000 | 0.198 | 0.000 | n/a | n/a | 1.203 | 0.234 | 0.000 | 1.203 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b000000000000009c | 1003.839 | 0.148 | n/a | 0.000 | 0.000 | 0.743 | 1001.635 | 0.017 | 0.000 | 0.172 | 0.000 | n/a | n/a | 1.125 | 0.148 | 0.000 | 1.125 | gw-r/thread-69/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000019 | 1003.180 | 0.231 | n/a | 0.000 | 0.000 | 0.755 | 1000.870 | 0.019 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.168 | 0.231 | 0.000 | 1.168 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000018 | 1002.721 | 0.196 | n/a | 0.000 | 0.000 | 0.905 | 1001.265 | 0.014 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.215 | 0.196 | 0.000 | 0.215 | gw-r/thread-53/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000083 | 994.165 | 2.448 | n/a | 0.000 | 0.000 | 0.761 | 990.817 | 0.011 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.062 | 2.448 | 0.002 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000051 | 629.320 | 3.733 | n/a | 0.000 | 0.000 | 1.646 | 623.438 | 0.197 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.206 | 3.733 | 0.006 | 0.206 | gw-r/thread-76/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000080 | 611.181 | 3.809 | n/a | 0.000 | 0.000 | 0.676 | 606.561 | 0.012 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.058 | 3.809 | 0.006 | 0.058 | gw-r/thread-73/journal/page | none observed |
| 0f6087bbf2256f2b000000000000005e | 607.656 | 11.042 | n/a | 1.233 | 0.000 | 0.701 | 594.214 | 0.209 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.158 | 12.276 | 0.020 | 0.158 | gw-r/thread-50/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000062 | 555.049 | 2.152 | n/a | 0.000 | 0.000 | 0.768 | 551.910 | 0.027 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.095 | 2.152 | 0.004 | 0.095 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000081 | 316.512 | 2.490 | n/a | 0.000 | 0.000 | 0.651 | 313.206 | 0.012 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.066 | 2.490 | 0.008 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000084 | 282.968 | 4.553 | n/a | 0.000 | 0.000 | 0.783 | 269.036 | 0.012 | 8.376 | 0.067 | 0.000 | n/a | n/a | 0.139 | 4.553 | 0.016 | 0.139 | gw-r/thread-50/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000063 | 222.156 | 2.762 | n/a | 0.000 | 0.000 | 1.598 | 217.592 | 0.028 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.069 | 2.762 | 0.012 | 0.069 | gw-r/thread-74/journal/page | none observed |
| 0f6087bbf2256f2b000000000000005c | 111.380 | 85.680 | n/a | 3.526 | 0.000 | 0.894 | 18.686 | 0.009 | 0.000 | 0.014 | 0.000 | n/a | n/a | 2.571 | 89.206 | 0.801 | 2.571 | node-14/thread-2/replica.fetch-feed | none observed |
| 0f6087bbf2256f2b0000000000000061 | 92.370 | 4.133 | n/a | 0.000 | 0.000 | 0.751 | 86.233 | 1.076 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.127 | 4.133 | 0.045 | 0.127 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b000000000000005d | 74.216 | 3.179 | n/a | 0.000 | 0.000 | 1.253 | 69.590 | 0.014 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.074 | 3.179 | 0.043 | 0.074 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b000000000000009b | 12.208 | 1.994 | n/a | 0.000 | 0.000 | 0.769 | 9.305 | 0.019 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.074 | 1.994 | 0.163 | 0.074 | gw-r/thread-69/gateway.admitted-work | none observed |
| 0f6087bbf2256f2b000000000000009a | 11.845 | 2.038 | n/a | 0.000 | 0.000 | 3.947 | 5.738 | 0.029 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.069 | 2.038 | 0.172 | 0.069 | gw-r/thread-55/gateway.admitted-work | none observed |
| 0f6087bbf2256f2b000000000000007f | 5.488 | 2.297 | n/a | 0.000 | 0.000 | 0.925 | 2.166 | 0.022 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.055 | 2.297 | 0.419 | 0.055 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 252.869 | n/a | n/a | n/a | 3.466 | n/a | 0.000 | 0.000 | 0.899 | 244.699 | 0.017 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.237 | 3.466 | 0.007 | 0.237 |
| p99 | 702.250 | n/a | n/a | n/a | 36.550 | n/a | 0.624 | 0.000 | 7.792 | 697.019 | 0.097 | 15.549 | 0.148 | 0.000 | n/a | n/a | 0.309 | 37.173 | 0.161 | 0.309 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000001d | 702.250 | 3.907 | n/a | 0.000 | 0.000 | 0.899 | 697.019 | 0.021 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.279 | 3.907 | 0.006 | 0.279 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b000000000000001b | 505.949 | 3.466 | n/a | 0.000 | 0.000 | 7.792 | 478.659 | 0.097 | 15.549 | 0.148 | 0.000 | n/a | n/a | 0.237 | 3.466 | 0.007 | 0.237 | gw-r/thread-69/journal/page | none observed |
| 0f6087bbf2256f2b000000000000001f | 252.869 | 2.473 | n/a | 0.000 | 0.000 | 5.392 | 244.699 | 0.017 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.151 | 2.473 | 0.010 | 0.151 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b000000000000001a | 230.943 | 36.550 | n/a | 0.624 | 0.000 | 0.884 | 192.468 | 0.014 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.309 | 37.173 | 0.161 | 0.309 | gw-r/thread-52/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 249.909 | n/a | n/a | n/a | 2.829 | n/a | 0.000 | 0.000 | 1.166 | 242.798 | 0.018 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.111 | 2.829 | 0.004 | 0.111 |
| p99 | 933.719 | n/a | n/a | n/a | 5.901 | n/a | 0.000 | 0.000 | 1.323 | 928.443 | 0.026 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.204 | 5.901 | 0.036 | 0.204 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000023 | 933.719 | 3.783 | n/a | 0.000 | 0.000 | 1.173 | 928.443 | 0.022 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.156 | 3.783 | 0.004 | 0.156 | gw-r/thread-71/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000020 | 748.386 | 2.556 | n/a | 0.000 | 0.000 | 1.323 | 744.171 | 0.026 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.109 | 2.556 | 0.003 | 0.109 | gw-r/thread-71/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000022 | 249.909 | 5.901 | n/a | 0.000 | 0.000 | 0.876 | 242.798 | 0.018 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.204 | 5.901 | 0.024 | 0.204 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000024 | 77.765 | 2.829 | n/a | 0.000 | 0.000 | 1.166 | 73.527 | 0.018 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.111 | 2.829 | 0.036 | 0.111 | gw-r/thread-69/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 759.066 | n/a | n/a | n/a | 4.106 | n/a | 0.000 | 0.000 | 1.251 | 753.639 | 0.031 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.097 | 4.106 | 0.005 | 0.097 |
| p99 | 991.103 | n/a | n/a | n/a | 5.101 | n/a | 0.000 | 0.000 | 1.332 | 986.475 | 0.043 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.104 | 5.101 | 0.021 | 0.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000029 | 991.103 | 2.966 | n/a | 0.000 | 0.000 | 1.332 | 986.475 | 0.043 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.097 | 2.966 | 0.003 | 0.097 | gw-r/thread-69/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000028 | 759.066 | 4.106 | n/a | 0.000 | 0.000 | 1.070 | 753.639 | 0.031 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.097 | 4.106 | 0.005 | 0.097 | gw-r/thread-71/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000026 | 237.273 | 5.101 | n/a | 0.000 | 0.000 | 1.251 | 230.607 | 0.029 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.104 | 5.101 | 0.021 | 0.104 | gw-r/thread-71/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.193 | n/a | n/a | n/a | 5.509 | n/a | 0.000 | 0.000 | 1.198 | 411.035 | 0.016 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.264 | 5.509 | 0.011 | 0.264 |
| p99 | 981.735 | n/a | n/a | n/a | 16.354 | n/a | 0.000 | 0.000 | 4.313 | 963.916 | 0.077 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.332 | 16.354 | 0.063 | 0.332 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000002f | 981.735 | 16.354 | n/a | 0.000 | 0.000 | 1.013 | 963.916 | 0.077 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.264 | 16.354 | 0.017 | 0.264 | gw-r/thread-54/journal/page | none observed |
| 0f6087bbf2256f2b000000000000002d | 495.901 | 5.509 | n/a | 0.000 | 0.000 | 2.742 | 487.105 | 0.044 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.332 | 5.509 | 0.011 | 0.332 | gw-r/thread-50/journal/page | none observed |
| 0f6087bbf2256f2b000000000000002b | 419.193 | 3.611 | n/a | 0.000 | 0.000 | 4.313 | 411.035 | 0.014 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.100 | 3.611 | 0.009 | 0.100 | gw-r/thread-69/journal/page | none observed |
| 0f6087bbf2256f2b000000000000002a | 151.721 | 9.531 | n/a | 0.000 | 0.000 | 1.198 | 140.568 | 0.016 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.270 | 9.531 | 0.063 | 0.270 | gw-r/thread-52/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 410.534 | n/a | n/a | n/a | 2.599 | n/a | 0.000 | 0.000 | 1.137 | 406.515 | 0.015 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.162 | 2.599 | 0.006 | 0.162 |
| p99 | 959.568 | n/a | n/a | n/a | 12.832 | n/a | 0.000 | 0.000 | 1.464 | 953.727 | 0.016 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.243 | 12.832 | 0.052 | 0.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000030 | 959.568 | 3.971 | n/a | 0.000 | 0.000 | 1.464 | 953.727 | 0.015 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.243 | 3.971 | 0.004 | 0.243 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000035 | 592.612 | 12.832 | n/a | 0.000 | 0.000 | 1.306 | 578.124 | 0.012 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.223 | 12.832 | 0.022 | 0.223 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000031 | 410.534 | 2.599 | n/a | 0.000 | 0.000 | 1.137 | 406.515 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.162 | 2.599 | 0.006 | 0.162 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000033 | 42.181 | 2.208 | n/a | 0.000 | 0.000 | 0.739 | 39.031 | 0.015 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.094 | 2.208 | 0.052 | 0.094 | gw-r/thread-53/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 316.777 | n/a | n/a | n/a | 5.178 | n/a | 0.000 | 0.000 | 0.878 | 310.262 | 0.025 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.285 | 5.178 | 0.009 | 0.285 |
| p99 | 980.036 | n/a | n/a | n/a | 12.328 | n/a | 3.085 | 0.000 | 1.541 | 969.073 | 4.345 | 0.000 | 0.156 | 0.000 | n/a | n/a | 4.064 | 15.413 | 0.024 | 4.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000003b | 980.036 | 5.178 | n/a | 0.000 | 0.000 | 1.541 | 969.073 | 0.025 | 0.000 | 0.156 | 0.000 | n/a | n/a | 4.064 | 5.178 | 0.005 | 4.064 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000036 | 727.247 | 12.328 | n/a | 3.085 | 0.000 | 0.649 | 710.789 | 0.020 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.285 | 15.413 | 0.021 | 0.285 | gw-r/thread-71/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000038 | 316.777 | 2.864 | n/a | 0.000 | 0.000 | 1.456 | 310.262 | 1.991 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.101 | 2.864 | 0.009 | 0.101 | gw-r/thread-71/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000039 | 259.203 | 6.175 | n/a | 0.000 | 0.000 | 0.878 | 247.329 | 4.345 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.364 | 6.175 | 0.024 | 0.364 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 197.724 | n/a | n/a | n/a | 4.769 | n/a | 0.000 | 0.000 | 1.165 | 193.432 | 0.020 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.221 | 4.769 | 0.015 | 0.221 |
| p99 | 722.807 | n/a | n/a | n/a | 10.793 | n/a | 0.000 | 0.000 | 73.814 | 619.418 | 4.224 | 17.775 | 0.127 | 0.000 | n/a | n/a | 0.872 | 10.793 | 0.361 | 0.872 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000003e | 722.807 | 10.793 | n/a | 0.000 | 0.000 | 73.814 | 619.418 | 0.020 | 17.775 | 0.115 | 0.000 | n/a | n/a | 0.872 | 10.793 | 0.015 | 0.872 | gw-r/thread-48/journal/page | none observed |
| 0f6087bbf2256f2b000000000000003f | 585.414 | 3.446 | n/a | 0.000 | 0.000 | 1.165 | 576.323 | 4.224 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.145 | 3.446 | 0.006 | 0.145 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000040 | 197.724 | 2.998 | n/a | 0.000 | 0.000 | 0.983 | 193.432 | 0.020 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.163 | 2.998 | 0.015 | 0.163 | gw-r/thread-74/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000042 | 192.655 | 6.441 | n/a | 0.000 | 0.000 | 3.078 | 182.727 | 0.060 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.224 | 6.441 | 0.033 | 0.224 | gw-r/thread-76/journal/page | none observed |
| 0f6087bbf2256f2b000000000000003c | 13.215 | 4.769 | n/a | 0.000 | 0.000 | 0.811 | 7.386 | 0.014 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.221 | 4.769 | 0.361 | 0.221 | gw-r/thread-55/gateway.admitted-work | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 950.062 | n/a | n/a | n/a | 3.890 | n/a | 0.000 | 0.000 | 1.162 | 944.711 | 0.040 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.212 | 3.890 | 0.004 | 0.212 |
| p99 | 1003.932 | n/a | n/a | n/a | 5.389 | n/a | 0.000 | 0.000 | 2.041 | 1001.137 | 2.340 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.344 | 5.389 | 0.097 | 1.344 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000044 | 1003.932 | 0.143 | n/a | 0.000 | 0.000 | 1.162 | 1001.137 | 0.017 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.344 | 0.143 | 0.000 | 1.344 | gw-r/thread-73/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000046 | 950.062 | 3.890 | n/a | 0.000 | 0.000 | 1.095 | 944.711 | 0.040 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.212 | 3.890 | 0.004 | 0.212 | gw-r/thread-52/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000045 | 55.283 | 5.389 | n/a | 0.000 | 0.000 | 2.041 | 45.343 | 2.340 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.126 | 5.389 | 0.097 | 0.126 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 252.459 | n/a | n/a | n/a | 3.174 | n/a | 0.000 | 0.000 | 0.773 | 248.534 | 0.049 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.156 | 3.174 | 0.012 | 0.156 |
| p99 | 1003.756 | n/a | n/a | n/a | 4.473 | n/a | 0.000 | 0.000 | 1.082 | 1001.260 | 3.103 | 13.409 | 0.133 | 0.000 | n/a | n/a | 1.128 | 4.473 | 0.070 | 1.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000047 | 1003.756 | 0.159 | n/a | 0.000 | 0.000 | 1.082 | 1001.260 | 0.015 | 0.000 | 0.112 | 0.000 | n/a | n/a | 1.128 | 0.159 | 0.000 | 1.128 | gw-r/thread-53/journal/page | none observed |
| 0f6087bbf2256f2b000000000000004b | 425.470 | 3.500 | n/a | 0.000 | 0.000 | 0.689 | 420.698 | 0.280 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.212 | 3.500 | 0.008 | 0.212 | gw-r/thread-54/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000049 | 252.459 | 3.033 | n/a | 0.000 | 0.000 | 0.641 | 248.534 | 0.040 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.079 | 3.033 | 0.012 | 0.079 | gw-r/thread-75/journal/page | none observed |
| 0f6087bbf2256f2b000000000000004d | 248.338 | 4.473 | n/a | 0.000 | 0.000 | 0.773 | 242.763 | 0.049 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.156 | 4.473 | 0.018 | 0.156 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000048 | 45.205 | 3.174 | n/a | 0.000 | 0.000 | 0.973 | 24.380 | 3.103 | 13.409 | 0.057 | 0.000 | n/a | n/a | 0.110 | 3.174 | 0.070 | 0.110 | gw-r/thread--1/jdk.GCPhasePause | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 979.798 | n/a | n/a | n/a | 3.805 | n/a | 0.000 | 0.000 | 0.721 | 974.845 | 0.185 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.149 | 3.805 | 0.004 | 0.149 |
| p99 | 1001.395 | n/a | n/a | n/a | 6.651 | n/a | 0.000 | 0.000 | 1.026 | 996.951 | 0.750 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.168 | 6.651 | 0.017 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000004e | 1001.395 | 3.114 | n/a | 0.000 | 0.000 | 1.026 | 996.951 | 0.028 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.106 | 3.114 | 0.003 | 0.106 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b000000000000004f | 979.798 | 3.805 | n/a | 0.000 | 0.000 | 0.721 | 974.845 | 0.185 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.149 | 3.805 | 0.004 | 0.149 | gw-r/thread-76/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000050 | 393.586 | 6.651 | n/a | 0.000 | 0.000 | 0.688 | 385.207 | 0.750 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.168 | 6.651 | 0.017 | 0.168 | gw-r/thread-55/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 729.484 | n/a | n/a | n/a | 6.161 | n/a | 0.000 | 0.000 | 1.504 | 719.781 | 0.017 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.248 | 6.161 | 0.009 | 0.248 |
| p99 | 921.347 | n/a | n/a | n/a | 6.543 | n/a | 0.000 | 0.000 | 2.778 | 912.510 | 0.024 | 0.000 | 0.914 | 0.000 | n/a | n/a | 0.250 | 6.543 | 0.061 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000055 | 921.347 | 6.161 | n/a | 0.000 | 0.000 | 1.504 | 912.510 | 0.008 | 0.000 | 0.914 | 0.000 | n/a | n/a | 0.250 | 6.161 | 0.007 | 0.250 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000056 | 729.484 | 6.543 | n/a | 0.000 | 0.000 | 2.778 | 719.781 | 0.024 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.248 | 6.543 | 0.009 | 0.248 | gw-r/thread-48/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000054 | 41.989 | 2.566 | n/a | 0.000 | 0.000 | 1.207 | 38.004 | 0.017 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.106 | 2.566 | 0.061 | 0.106 | gw-r/thread-73/journal/page | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.083 | n/a | n/a | n/a | 6.122 | n/a | 0.000 | 0.000 | 1.146 | 348.928 | 0.018 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.333 | 6.122 | 0.138 | 0.333 |
| p99 | 1000.122 | n/a | n/a | n/a | 132.539 | n/a | 5.558 | 0.000 | 1.486 | 798.776 | 0.102 | 57.645 | 0.111 | 0.000 | n/a | n/a | 4.353 | 138.097 | 0.152 | 4.353 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000005a | 1000.122 | 132.539 | n/a | 5.558 | 0.000 | 1.146 | 798.776 | 0.012 | 57.645 | 0.094 | 0.000 | n/a | n/a | 4.353 | 138.097 | 0.138 | 4.353 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000058 | 357.083 | 6.122 | n/a | 0.000 | 0.000 | 1.486 | 348.928 | 0.102 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.333 | 6.122 | 0.017 | 0.333 | gw-r/thread-48/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000059 | 27.476 | 4.183 | n/a | 0.000 | 0.000 | 0.960 | 22.079 | 0.018 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.171 | 4.183 | 0.152 | 0.171 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 239.841 | n/a | n/a | n/a | 3.849 | n/a | 0.000 | 0.000 | 0.796 | 236.873 | 0.020 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.089 | 3.849 | 0.021 | 0.089 |
| p99 | 722.934 | n/a | n/a | n/a | 90.188 | n/a | 3.603 | 0.000 | 1.763 | 600.804 | 3.554 | 24.974 | 1.249 | 0.000 | n/a | n/a | 2.440 | 93.791 | 0.130 | 2.440 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000075 | 722.934 | 90.188 | n/a | 3.603 | 0.000 | 0.796 | 600.804 | 0.012 | 24.974 | 0.116 | 0.000 | n/a | n/a | 2.440 | 93.791 | 0.130 | 2.440 | gw-r/thread-76/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000074 | 514.848 | 3.598 | n/a | 0.000 | 0.000 | 1.763 | 509.254 | 0.012 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.100 | 3.598 | 0.007 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000072 | 475.722 | 3.849 | n/a | 0.000 | 0.000 | 1.312 | 470.319 | 0.021 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.085 | 3.849 | 0.008 | 0.085 | gw-r/thread-70/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000069 | 305.659 | 5.303 | n/a | 0.000 | 0.000 | 1.192 | 283.345 | 0.020 | 15.592 | 0.131 | 0.000 | n/a | n/a | 0.077 | 5.303 | 0.017 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000066 | 247.006 | 5.180 | n/a | 0.000 | 0.000 | 0.793 | 240.121 | 0.496 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.245 | 5.180 | 0.021 | 0.245 | gw-r/thread-73/journal/page | none observed |
| 0f6087bbf2256f2b000000000000006b | 239.841 | 2.073 | n/a | 0.000 | 0.000 | 0.584 | 236.873 | 0.157 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.087 | 2.073 | 0.009 | 0.087 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000070 | 200.127 | 5.270 | n/a | 0.000 | 0.000 | 0.914 | 193.630 | 0.019 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.162 | 5.270 | 0.026 | 0.162 | gw-r/thread-50/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000067 | 174.647 | 4.825 | n/a | 0.000 | 0.000 | 1.348 | 164.685 | 3.554 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.166 | 4.825 | 0.028 | 0.166 | gw-r/thread-73/journal/page | none observed |
| 0f6087bbf2256f2b000000000000006f | 51.648 | 1.661 | n/a | 0.000 | 0.000 | 0.794 | 49.032 | 0.017 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.089 | 1.661 | 0.032 | 0.089 | gw-r/thread-69/journal/page | none observed |
| 0f6087bbf2256f2b000000000000006c | 21.597 | 2.465 | n/a | 0.000 | 0.000 | 0.736 | 17.032 | 0.051 | 0.000 | 1.249 | 0.000 | n/a | n/a | 0.063 | 2.465 | 0.114 | 0.063 | gw-r/thread-52/journal/page | none observed |

## P3 / grow10 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 123.835 | n/a | n/a | n/a | 82.008 | n/a | 4.051 | 0.000 | 1.074 | 26.606 | 0.014 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.311 | 86.119 | 0.648 | 1.311 |
| p99 | 637.863 | n/a | n/a | n/a | 110.704 | n/a | 9.864 | 0.000 | 1.905 | 537.515 | 1.636 | 10.770 | 0.134 | 0.000 | n/a | n/a | 3.209 | 120.567 | 0.891 | 3.209 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000007b | 637.863 | 82.008 | n/a | 4.111 | 0.000 | 1.905 | 537.515 | 0.051 | 10.770 | 0.134 | 0.000 | n/a | n/a | 1.370 | 86.119 | 0.135 | 1.370 | gw-r/thread-74/journal/page | none observed |
| 0f6087bbf2256f2b000000000000007e | 144.917 | 88.354 | n/a | 5.622 | 0.000 | 1.074 | 48.290 | 0.014 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.501 | 93.975 | 0.648 | 1.501 | node-14/thread-2/replica.fetch-feed | none observed |
| 0f6087bbf2256f2b000000000000007d | 141.833 | 82.854 | n/a | 3.708 | 0.000 | 0.940 | 51.305 | 1.636 | 0.000 | 0.081 | 0.000 | n/a | n/a | 1.311 | 86.561 | 0.610 | 1.311 | node-14/thread-2/replica.fetch-feed | none observed |
| 0f6087bbf2256f2b0000000000000076 | 138.862 | 110.704 | n/a | 9.864 | 0.000 | 1.340 | 15.222 | 0.056 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.660 | 120.567 | 0.868 | 1.660 | node-14/thread-2/replica.fetch-feed | none observed |
| 0f6087bbf2256f2b0000000000000077 | 123.835 | 104.087 | n/a | 6.302 | 0.000 | 1.296 | 8.913 | 0.013 | 0.000 | 0.015 | 0.000 | n/a | n/a | 3.209 | 110.389 | 0.891 | 3.209 | node-14/thread-2/replica.fetch-feed | none observed |
| 0f6087bbf2256f2b000000000000007c | 111.697 | 71.013 | n/a | 4.051 | 0.000 | 1.375 | 33.204 | 0.741 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.258 | 75.064 | 0.672 | 1.258 | node-14/thread-2/replica.fetch-feed | none observed |
| 0f6087bbf2256f2b000000000000007a | 32.654 | 5.035 | n/a | 0.000 | 0.000 | 0.842 | 26.606 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.124 | 5.035 | 0.154 | 0.124 | gw-r/thread-55/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000078 | 6.671 | 4.627 | n/a | 0.000 | 0.000 | 0.701 | 1.243 | 0.011 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.075 | 4.627 | 0.694 | 0.075 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.607 | n/a | n/a | n/a | 2.348 | n/a | 0.000 | 0.000 | 0.670 | 415.791 | 0.013 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.062 | 2.348 | 0.008 | 0.062 |
| p99 | 1003.312 | n/a | n/a | n/a | 9.682 | n/a | 1.271 | 0.000 | 2.443 | 1000.251 | 0.128 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.125 | 10.953 | 0.153 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000008b | 1003.312 | 2.348 | n/a | 0.000 | 0.000 | 0.569 | 1000.251 | 0.012 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.057 | 2.348 | 0.002 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 0f6087bbf2256f2b000000000000008c | 568.251 | 2.480 | n/a | 0.000 | 0.000 | 2.443 | 563.073 | 0.128 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.062 | 2.480 | 0.004 | 0.062 | gw-r/thread-72/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000086 | 427.607 | 9.682 | n/a | 1.271 | 0.000 | 0.667 | 415.791 | 0.013 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.125 | 10.953 | 0.026 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000089 | 278.428 | 2.337 | n/a | 0.000 | 0.000 | 0.683 | 275.243 | 0.016 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.057 | 2.337 | 0.008 | 0.057 | gw-r/thread-76/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000087 | 13.999 | 2.138 | n/a | 0.000 | 0.000 | 0.670 | 11.062 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.096 | 2.138 | 0.153 | 0.096 | gw-r/thread-74/journal/page | none observed |

## P3 / presweep / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 432.836 | n/a | n/a | n/a | 5.095 | n/a | 0.000 | 0.000 | 1.154 | 426.499 | 0.021 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.105 | 5.095 | 0.007 | 0.105 |
| p99 | 712.870 | n/a | n/a | n/a | 9.902 | n/a | 0.000 | 0.000 | 3.429 | 706.192 | 0.196 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.229 | 9.902 | 0.035 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b000000000000008f | 712.870 | 5.257 | n/a | 0.000 | 0.000 | 1.154 | 706.192 | 0.021 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.105 | 5.257 | 0.007 | 0.105 | gw-r/thread-75/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000092 | 604.344 | 1.840 | n/a | 0.000 | 0.000 | 1.426 | 600.716 | 0.196 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.079 | 1.840 | 0.003 | 0.079 | gw-r/thread-75/journal/page | none observed |
| 0f6087bbf2256f2b000000000000008e | 432.836 | 5.095 | n/a | 0.000 | 0.000 | 0.861 | 426.499 | 0.038 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.229 | 5.095 | 0.012 | 0.229 | gw-r/thread-72/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000090 | 280.104 | 9.902 | n/a | 0.000 | 0.000 | 3.429 | 266.468 | 0.014 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.217 | 9.902 | 0.035 | 0.217 | gw-r/thread-54/journal/page | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.667 | n/a | n/a | n/a | 2.812 | n/a | 0.000 | 0.000 | 1.296 | 8.823 | 0.015 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.076 | 2.812 | 0.206 | 0.076 |
| p99 | 42.850 | n/a | n/a | n/a | 8.811 | n/a | 0.000 | 0.000 | 4.151 | 32.297 | 0.618 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.270 | 8.811 | 0.673 | 0.270 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0f6087bbf2256f2b0000000000000095 | 42.850 | 8.811 | n/a | 0.000 | 0.000 | 1.296 | 32.297 | 0.071 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.270 | 8.811 | 0.206 | 0.270 | gw-r/thread-52/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000099 | 22.053 | 2.812 | n/a | 0.000 | 0.000 | 4.151 | 14.858 | 0.013 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.083 | 2.812 | 0.128 | 0.083 | gw-r/thread-73/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000098 | 15.549 | 5.739 | n/a | 0.000 | 0.000 | 0.764 | 8.823 | 0.012 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.173 | 5.739 | 0.369 | 0.173 | gw-r/thread-51/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000097 | 12.667 | 1.889 | n/a | 0.000 | 0.000 | 0.742 | 9.898 | 0.012 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.076 | 1.889 | 0.149 | 0.076 | gw-r/thread-72/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000093 | 10.013 | 1.725 | n/a | 0.000 | 0.000 | 1.960 | 5.528 | 0.618 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.065 | 1.725 | 0.172 | 0.065 | gw-r/thread-74/journal/page | none observed |
| 0f6087bbf2256f2b0000000000000094 | 8.686 | 5.842 | n/a | 0.000 | 0.000 | 1.423 | 1.330 | 0.015 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.056 | 5.842 | 0.673 | 0.056 | node-14/thread-2/http POST /v2/db/{db}/transactions | none observed |
| 0f6087bbf2256f2b0000000000000096 | 8.419 | 2.364 | n/a | 0.000 | 0.000 | 0.974 | 4.861 | 0.020 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.063 | 2.364 | 0.281 | 0.063 | gw-r/thread-76/gateway.admitted-work | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.774 | n/a | n/a | n/a | 0.051 | n/a | 0.000 | 0.000 | 1.106 | 201.213 | 0.017 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.106 | 0.051 | 0.000 | 0.106 |
| p99 | 203.506 | n/a | n/a | n/a | 0.127 | n/a | 0.000 | 0.000 | 2.458 | 201.449 | 0.025 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.336 | 0.127 | 0.001 | 0.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d000000000000000b | 203.506 | 0.038 | n/a | 0.000 | 0.000 | 1.996 | 201.198 | 0.015 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.083 | 0.038 | 0.000 | 0.083 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d000000000000000e | 203.009 | 0.051 | n/a | 0.000 | 0.000 | 1.330 | 201.315 | 0.017 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.119 | 0.051 | 0.000 | 0.119 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000008 | 202.990 | 0.072 | n/a | 0.000 | 0.000 | 1.635 | 201.006 | 0.014 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.125 | 0.072 | 0.000 | 0.125 | gw-r/thread-54/journal/page | none observed |
| 9b9a75b4776c068d000000000000000d | 202.932 | 0.043 | n/a | 0.000 | 0.000 | 1.106 | 201.449 | 0.017 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.081 | 0.043 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 9b9a75b4776c068d0000000000000011 | 202.774 | 0.049 | n/a | 0.000 | 0.000 | 1.087 | 201.345 | 0.021 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.106 | 0.049 | 0.000 | 0.106 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d000000000000000f | 202.720 | 0.053 | n/a | 0.000 | 0.000 | 1.039 | 201.342 | 0.019 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.086 | 0.053 | 0.000 | 0.086 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d000000000000000a | 202.403 | 0.063 | n/a | 0.000 | 0.000 | 0.787 | 201.213 | 0.021 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.129 | 0.063 | 0.000 | 0.129 | gw-r/thread-53/journal/page | none observed |
| 9b9a75b4776c068d0000000000000009 | 131.234 | 0.127 | n/a | 0.000 | 0.000 | 2.458 | 128.201 | 0.025 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.336 | 0.127 | 0.001 | 0.336 | gw-r/thread-55/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.899 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.760 | 200.927 | 0.020 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.075 | 0.047 | 0.000 | 0.075 |
| p99 | 202.726 | n/a | n/a | n/a | 0.081 | n/a | 0.000 | 0.000 | 1.220 | 201.236 | 3.623 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.125 | 0.081 | 0.001 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d0000000000000015 | 202.726 | 0.081 | n/a | 0.000 | 0.000 | 1.153 | 201.236 | 0.013 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.125 | 0.081 | 0.000 | 0.125 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d0000000000000013 | 202.160 | 0.047 | n/a | 0.000 | 0.000 | 0.760 | 201.045 | 0.022 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.109 | 0.047 | 0.000 | 0.109 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d0000000000000014 | 201.899 | 0.044 | n/a | 0.000 | 0.000 | 0.698 | 200.927 | 0.020 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.075 | 0.044 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000016 | 78.565 | 0.054 | n/a | 0.000 | 0.000 | 1.220 | 73.526 | 3.623 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.069 | 0.054 | 0.001 | 0.069 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.529 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 1.216 | 201.043 | 0.018 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.119 | 0.068 | 0.000 | 0.119 |
| p99 | 203.409 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 1.458 | 201.566 | 9.683 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.125 | 0.073 | 0.001 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d0000000000000020 | 203.409 | 0.068 | n/a | 0.000 | 0.000 | 1.458 | 201.566 | 0.018 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.119 | 0.068 | 0.000 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 9b9a75b4776c068d0000000000000021 | 202.529 | 0.049 | n/a | 0.000 | 0.000 | 1.216 | 201.043 | 0.015 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.084 | 0.049 | 0.000 | 0.084 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d0000000000000022 | 114.159 | 0.073 | n/a | 0.000 | 0.000 | 0.917 | 103.316 | 9.683 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.125 | 0.073 | 0.001 | 0.125 | gw-r/thread-53/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 205.042 | n/a | n/a | n/a | 0.065 | n/a | 0.000 | 0.000 | 1.441 | 202.732 | 0.022 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.118 | 0.065 | 0.000 | 0.118 |
| p99 | 228.257 | n/a | n/a | n/a | 0.139 | n/a | 0.000 | 0.000 | 4.954 | 219.675 | 0.395 | 0.000 | 2.853 | 0.000 | n/a | n/a | 0.242 | 0.139 | 0.001 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d000000000000002d | 228.257 | 0.139 | n/a | 0.000 | 0.000 | 4.954 | 219.675 | 0.395 | 0.000 | 2.853 | 0.000 | n/a | n/a | 0.242 | 0.139 | 0.001 | 0.242 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d0000000000000023 | 209.577 | 0.118 | n/a | 0.000 | 0.000 | 1.441 | 207.731 | 0.025 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.118 | 0.118 | 0.001 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d000000000000002b | 206.904 | 0.046 | n/a | 0.000 | 0.000 | 1.897 | 204.692 | 0.019 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.082 | 0.046 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d0000000000000027 | 206.206 | 0.065 | n/a | 0.000 | 0.000 | 1.011 | 204.756 | 0.020 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.130 | 0.065 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d000000000000002c | 205.042 | 0.078 | n/a | 0.000 | 0.000 | 1.482 | 202.732 | 0.062 | 0.000 | 0.547 | 0.000 | n/a | n/a | 0.141 | 0.078 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000029 | 203.470 | 0.049 | n/a | 0.000 | 0.000 | 2.086 | 201.071 | 0.014 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.091 | 0.049 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000025 | 202.945 | 0.039 | n/a | 0.000 | 0.000 | 0.929 | 201.650 | 0.022 | 0.000 | 0.206 | 0.000 | n/a | n/a | 0.098 | 0.039 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000024 | 202.732 | 0.043 | n/a | 0.000 | 0.000 | 0.850 | 201.567 | 0.024 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.076 | 0.043 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 9b9a75b4776c068d0000000000000028 | 81.269 | 0.076 | n/a | 0.000 | 0.000 | 1.331 | 79.626 | 0.016 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.118 | 0.076 | 0.001 | 0.118 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.533 | n/a | n/a | n/a | 0.062 | n/a | 0.000 | 0.000 | 1.201 | 190.953 | 0.031 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.111 | 0.062 | 0.000 | 0.111 |
| p99 | 219.114 | n/a | n/a | n/a | 0.371 | n/a | 0.000 | 0.000 | 10.287 | 207.536 | 7.505 | 74.802 | 0.453 | 0.000 | n/a | n/a | 0.397 | 0.371 | 0.002 | 0.397 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d000000000000002e | 219.114 | 0.371 | n/a | 0.000 | 0.000 | 10.287 | 207.536 | 0.070 | 0.000 | 0.453 | 0.000 | n/a | n/a | 0.397 | 0.371 | 0.002 | 0.397 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000031 | 203.626 | 0.042 | n/a | 0.000 | 0.000 | 1.421 | 127.023 | 0.031 | 74.802 | 0.195 | 0.000 | n/a | n/a | 0.111 | 0.042 | 0.000 | 0.111 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d0000000000000035 | 202.601 | 0.049 | n/a | 0.000 | 0.000 | 1.124 | 201.079 | 0.019 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.136 | 0.049 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000032 | 202.568 | 0.041 | n/a | 0.000 | 0.000 | 0.982 | 201.299 | 0.017 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d0000000000000036 | 202.559 | 0.065 | n/a | 0.000 | 0.000 | 1.201 | 201.022 | 0.021 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.135 | 0.065 | 0.000 | 0.135 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d0000000000000033 | 202.533 | 0.050 | n/a | 0.000 | 0.000 | 1.078 | 201.158 | 0.034 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.081 | 0.050 | 0.000 | 0.081 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d0000000000000038 | 192.906 | 0.087 | n/a | 0.000 | 0.000 | 1.452 | 190.953 | 0.218 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.145 | 0.087 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000039 | 185.050 | 0.125 | n/a | 0.000 | 0.000 | 3.162 | 174.188 | 7.125 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.268 | 0.125 | 0.001 | 0.268 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d0000000000000037 | 125.071 | 0.063 | n/a | 0.000 | 0.000 | 0.601 | 124.220 | 0.023 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.077 | 0.063 | 0.001 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000034 | 54.422 | 0.062 | n/a | 0.000 | 0.000 | 1.802 | 44.848 | 7.505 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.078 | 0.062 | 0.001 | 0.078 | gw-r/thread-75/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.277 | n/a | n/a | n/a | 0.063 | n/a | 0.000 | 0.000 | 0.937 | 201.083 | 0.023 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.090 | 0.063 | 0.000 | 0.090 |
| p99 | 207.050 | n/a | n/a | n/a | 0.129 | n/a | 0.000 | 0.000 | 1.841 | 204.796 | 2.893 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.348 | 0.129 | 0.002 | 0.348 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d000000000000003a | 207.050 | 0.074 | n/a | 0.000 | 0.000 | 1.841 | 204.796 | 0.021 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.161 | 0.074 | 0.000 | 0.161 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d000000000000003d | 203.065 | 0.063 | n/a | 0.000 | 0.000 | 1.235 | 201.386 | 0.025 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.199 | 0.063 | 0.000 | 0.199 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000040 | 202.998 | 0.054 | n/a | 0.000 | 0.000 | 1.120 | 201.505 | 0.026 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.087 | 0.054 | 0.000 | 0.087 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d000000000000003f | 202.427 | 0.086 | n/a | 0.000 | 0.000 | 0.937 | 201.130 | 0.023 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.091 | 0.086 | 0.000 | 0.091 | gw-r/thread-73/journal/page | none observed |
| 9b9a75b4776c068d0000000000000042 | 202.373 | 0.045 | n/a | 0.000 | 0.000 | 0.884 | 201.132 | 0.024 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.109 | 0.045 | 0.000 | 0.109 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d000000000000003c | 202.277 | 0.071 | n/a | 0.000 | 0.000 | 0.924 | 201.052 | 0.017 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.090 | 0.071 | 0.000 | 0.090 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d0000000000000041 | 202.194 | 0.038 | n/a | 0.000 | 0.000 | 0.858 | 201.083 | 0.014 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.077 | 0.038 | 0.000 | 0.077 | gw-r/thread-73/journal/page | none observed |
| 9b9a75b4776c068d000000000000003b | 202.132 | 0.039 | n/a | 0.000 | 0.000 | 0.839 | 201.048 | 0.016 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d000000000000003e | 142.735 | 0.065 | n/a | 0.000 | 0.000 | 1.156 | 141.297 | 0.026 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.087 | 0.065 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d0000000000000043 | 53.345 | 0.129 | n/a | 0.000 | 0.000 | 1.105 | 48.812 | 2.893 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.348 | 0.129 | 0.002 | 0.348 | gw-r/thread-73/journal/page | none observed |

## P3 / recovery / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.844 | n/a | n/a | n/a | 0.051 | n/a | 0.000 | 0.000 | 1.001 | 201.488 | 0.024 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.102 | 0.051 | 0.000 | 0.102 |
| p99 | 216.324 | n/a | n/a | n/a | 0.122 | n/a | 0.000 | 0.000 | 14.302 | 204.061 | 0.095 | 0.000 | 0.220 | 0.000 | n/a | n/a | 0.152 | 0.122 | 0.001 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d0000000000000049 | 216.324 | 0.043 | n/a | 0.000 | 0.000 | 14.302 | 201.644 | 0.024 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.112 | 0.043 | 0.000 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 9b9a75b4776c068d0000000000000044 | 205.890 | 0.078 | n/a | 0.000 | 0.000 | 1.529 | 204.061 | 0.014 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.102 | 0.078 | 0.000 | 0.102 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d0000000000000047 | 203.637 | 0.091 | n/a | 0.000 | 0.000 | 1.429 | 201.697 | 0.049 | 0.000 | 0.220 | 0.000 | n/a | n/a | 0.152 | 0.091 | 0.000 | 0.152 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d0000000000000045 | 202.875 | 0.051 | n/a | 0.000 | 0.000 | 1.001 | 201.488 | 0.095 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.087 | 0.051 | 0.000 | 0.087 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d000000000000004d | 202.844 | 0.049 | n/a | 0.000 | 0.000 | 0.774 | 201.727 | 0.027 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.102 | 0.049 | 0.000 | 0.102 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d000000000000004b | 202.641 | 0.035 | n/a | 0.000 | 0.000 | 0.953 | 201.424 | 0.016 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d0000000000000046 | 202.582 | 0.042 | n/a | 0.000 | 0.000 | 0.853 | 201.425 | 0.031 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.084 | 0.042 | 0.000 | 0.084 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d000000000000004c | 186.395 | 0.070 | n/a | 0.000 | 0.000 | 3.187 | 182.938 | 0.014 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.108 | 0.070 | 0.000 | 0.108 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d0000000000000048 | 121.553 | 0.122 | n/a | 0.000 | 0.000 | 0.896 | 120.334 | 0.012 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.123 | 0.122 | 0.001 | 0.123 | gw-r/thread-70/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.583 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 1.122 | 201.180 | 0.025 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 |
| p99 | 204.070 | n/a | n/a | n/a | 0.071 | n/a | 0.000 | 0.000 | 2.523 | 201.741 | 2.901 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.164 | 0.071 | 0.001 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d000000000000004f | 204.070 | 0.058 | n/a | 0.000 | 0.000 | 2.523 | 201.180 | 0.032 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.164 | 0.058 | 0.000 | 0.164 | gw-r/thread-69/journal/page | none observed |
| 9b9a75b4776c068d0000000000000050 | 202.910 | 0.059 | n/a | 0.000 | 0.000 | 1.122 | 201.481 | 0.020 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.000 | 0.094 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d0000000000000057 | 202.844 | 0.052 | n/a | 0.000 | 0.000 | 1.217 | 201.301 | 0.025 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.115 | 0.052 | 0.000 | 0.115 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d0000000000000051 | 202.807 | 0.036 | n/a | 0.000 | 0.000 | 0.738 | 201.741 | 0.038 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000059 | 202.788 | 0.036 | n/a | 0.000 | 0.000 | 1.349 | 201.173 | 0.033 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.086 | 0.036 | 0.000 | 0.086 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d0000000000000056 | 202.583 | 0.037 | n/a | 0.000 | 0.000 | 0.960 | 201.317 | 0.025 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.092 | 0.037 | 0.000 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d0000000000000052 | 202.496 | 0.040 | n/a | 0.000 | 0.000 | 1.137 | 201.115 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d0000000000000054 | 202.308 | 0.052 | n/a | 0.000 | 0.000 | 1.082 | 200.951 | 0.014 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.102 | 0.052 | 0.000 | 0.102 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d0000000000000055 | 202.255 | 0.036 | n/a | 0.000 | 0.000 | 0.685 | 201.257 | 0.032 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d0000000000000053 | 104.973 | 0.071 | n/a | 0.000 | 0.000 | 1.336 | 100.442 | 2.901 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.132 | 0.071 | 0.001 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000058 | 72.095 | 0.065 | n/a | 0.000 | 0.000 | 0.675 | 71.139 | 0.022 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.124 | 0.065 | 0.001 | 0.124 | gw-r/thread-55/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.702 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.983 | 201.293 | 0.022 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.111 | 0.039 | 0.000 | 0.111 |
| p99 | 206.823 | n/a | n/a | n/a | 0.078 | n/a | 0.000 | 0.000 | 5.148 | 201.712 | 14.638 | 0.000 | 3.823 | 0.000 | n/a | n/a | 0.206 | 0.078 | 0.001 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d0000000000000068 | 206.823 | 0.071 | n/a | 0.000 | 0.000 | 5.148 | 201.328 | 0.014 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.128 | 0.071 | 0.000 | 0.128 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d0000000000000061 | 203.280 | 0.069 | n/a | 0.000 | 0.000 | 1.448 | 201.380 | 0.016 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.206 | 0.069 | 0.000 | 0.206 | gw-r/thread-73/journal/page | none observed |
| 9b9a75b4776c068d000000000000006a | 202.959 | 0.066 | n/a | 0.000 | 0.000 | 1.324 | 201.293 | 0.027 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.134 | 0.066 | 0.000 | 0.134 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d0000000000000069 | 202.853 | 0.038 | n/a | 0.000 | 0.000 | 0.884 | 201.712 | 0.018 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d0000000000000063 | 202.800 | 0.037 | n/a | 0.000 | 0.000 | 1.167 | 201.315 | 0.036 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.111 | 0.037 | 0.000 | 0.111 | gw-r/thread-73/journal/page | none observed |
| 9b9a75b4776c068d0000000000000060 | 202.702 | 0.039 | n/a | 0.000 | 0.000 | 0.961 | 201.432 | 0.024 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.082 | 0.039 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d000000000000005f | 202.519 | 0.039 | n/a | 0.000 | 0.000 | 0.983 | 201.243 | 0.023 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-73/journal/page | none observed |
| 9b9a75b4776c068d0000000000000064 | 202.262 | 0.052 | n/a | 0.000 | 0.000 | 0.851 | 201.064 | 0.022 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.136 | 0.052 | 0.000 | 0.136 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d0000000000000065 | 202.240 | 0.037 | n/a | 0.000 | 0.000 | 0.892 | 201.085 | 0.017 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.085 | 0.037 | 0.000 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000066 | 201.957 | 0.035 | n/a | 0.000 | 0.000 | 0.701 | 201.011 | 0.014 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d0000000000000062 | 148.999 | 0.078 | n/a | 0.000 | 0.000 | 1.004 | 129.340 | 14.638 | 0.000 | 3.823 | 0.000 | n/a | n/a | 0.117 | 0.078 | 0.001 | 0.117 | gw-r/thread-52/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.981 | n/a | n/a | n/a | 0.064 | n/a | 0.000 | 0.000 | 1.098 | 200.997 | 0.032 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.100 | 0.064 | 0.000 | 0.100 |
| p99 | 203.825 | n/a | n/a | n/a | 0.555 | n/a | 0.000 | 0.000 | 19.120 | 202.124 | 154.648 | 0.000 | 0.268 | 0.000 | n/a | n/a | 0.142 | 0.555 | 0.003 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d000000000000006f | 203.825 | 0.064 | n/a | 0.000 | 0.000 | 1.208 | 202.124 | 0.032 | 0.000 | 0.268 | 0.000 | n/a | n/a | 0.129 | 0.064 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d000000000000006c | 203.616 | 0.050 | n/a | 0.000 | 0.000 | 1.098 | 202.120 | 0.023 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.094 | 0.050 | 0.000 | 0.094 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d0000000000000071 | 202.894 | 0.038 | n/a | 0.000 | 0.000 | 0.701 | 201.929 | 0.024 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.069 | 0.038 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d0000000000000070 | 201.981 | 0.043 | n/a | 0.000 | 0.000 | 0.713 | 200.997 | 0.015 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-69/journal/page | none observed |
| 9b9a75b4776c068d0000000000000072 | 182.753 | 0.555 | n/a | 0.000 | 0.000 | 19.120 | 8.263 | 154.648 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.100 | 0.555 | 0.003 | 0.100 | gw-r/thread-69/gateway.admission-wait | none observed |
| 9b9a75b4776c068d000000000000006d | 130.221 | 0.116 | n/a | 0.000 | 0.000 | 0.855 | 125.604 | 3.411 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.142 | 0.116 | 0.001 | 0.142 | gw-r/thread-54/journal/page | none observed |
| 9b9a75b4776c068d000000000000006b | 55.968 | 0.079 | n/a | 0.000 | 0.000 | 1.415 | 38.225 | 16.043 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.112 | 0.079 | 0.001 | 0.112 | gw-r/thread-75/journal/page | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.762 | n/a | n/a | n/a | 0.056 | n/a | 0.000 | 0.000 | 0.807 | 200.751 | 0.020 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.095 | 0.056 | 0.000 | 0.095 |
| p99 | 203.603 | n/a | n/a | n/a | 0.294 | n/a | 0.000 | 0.000 | 2.617 | 201.269 | 21.896 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.265 | 0.294 | 0.005 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d0000000000000080 | 203.603 | 0.043 | n/a | 0.000 | 0.000 | 2.316 | 201.011 | 0.013 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.095 | 0.043 | 0.000 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d000000000000008d | 202.831 | 0.039 | n/a | 0.000 | 0.000 | 1.864 | 200.751 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.076 | 0.039 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 9b9a75b4776c068d0000000000000087 | 202.393 | 0.066 | n/a | 0.000 | 0.000 | 0.749 | 201.269 | 0.025 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.116 | 0.066 | 0.000 | 0.116 | gw-r/thread-50/journal/page | none observed |
| 9b9a75b4776c068d0000000000000088 | 202.366 | 0.044 | n/a | 0.000 | 0.000 | 0.721 | 201.259 | 0.022 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.174 | 0.044 | 0.000 | 0.174 | gw-r/thread-53/journal/page | none observed |
| 9b9a75b4776c068d000000000000008b | 202.041 | 0.056 | n/a | 0.000 | 0.000 | 0.862 | 200.930 | 0.013 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.077 | 0.056 | 0.000 | 0.077 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d000000000000008a | 201.925 | 0.040 | n/a | 0.000 | 0.000 | 0.707 | 200.958 | 0.027 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.076 | 0.040 | 0.000 | 0.076 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d0000000000000082 | 201.762 | 0.034 | n/a | 0.000 | 0.000 | 0.643 | 200.898 | 0.013 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d0000000000000086 | 190.006 | 0.089 | n/a | 0.000 | 0.000 | 0.605 | 179.517 | 9.489 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.203 | 0.089 | 0.000 | 0.203 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d000000000000007f | 174.811 | 0.119 | n/a | 0.000 | 0.000 | 0.807 | 173.601 | 0.020 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.175 | 0.119 | 0.001 | 0.175 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d000000000000007e | 143.642 | 0.149 | n/a | 0.000 | 0.000 | 2.617 | 140.421 | 0.024 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.249 | 0.149 | 0.001 | 0.249 | gw-r/thread-51/journal/page | none observed |
| 9b9a75b4776c068d0000000000000081 | 76.633 | 0.074 | n/a | 0.000 | 0.000 | 0.936 | 53.559 | 21.896 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.086 | 0.074 | 0.001 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 9b9a75b4776c068d000000000000008c | 65.150 | 0.294 | n/a | 0.000 | 0.000 | 0.947 | 63.593 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.265 | 0.294 | 0.005 | 0.265 | gw-r/thread-70/journal/page | none observed |

## P3 / grow10 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.319 | n/a | n/a | n/a | 0.451 | n/a | 0.000 | 0.000 | 0.834 | 73.081 | 0.018 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.088 | 0.451 | 0.003 | 0.088 |
| p99 | 202.260 | n/a | n/a | n/a | 0.819 | n/a | 0.000 | 0.000 | 2.340 | 201.080 | 120.172 | 0.000 | 0.281 | 0.000 | n/a | n/a | 0.166 | 0.819 | 0.013 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d0000000000000095 | 202.260 | 0.038 | n/a | 0.000 | 0.000 | 0.894 | 201.056 | 0.030 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-71/journal/page | none observed |
| 9b9a75b4776c068d0000000000000094 | 202.120 | 0.036 | n/a | 0.000 | 0.000 | 0.802 | 201.080 | 0.013 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.089 | 0.036 | 0.000 | 0.089 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d000000000000008e | 202.036 | 0.052 | n/a | 0.000 | 0.000 | 0.903 | 200.875 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.086 | 0.052 | 0.000 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d000000000000008f | 184.498 | 0.586 | n/a | 0.000 | 0.000 | 0.828 | 62.763 | 120.172 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.083 | 0.586 | 0.003 | 0.083 | gw-r/thread-53/gateway.admission-wait | none observed |
| 9b9a75b4776c068d0000000000000096 | 101.890 | 0.468 | n/a | 0.000 | 0.000 | 0.770 | 77.409 | 23.068 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.089 | 0.468 | 0.005 | 0.089 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d0000000000000098 | 86.319 | 0.806 | n/a | 0.000 | 0.000 | 1.169 | 84.057 | 0.018 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.166 | 0.806 | 0.009 | 0.166 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d0000000000000099 | 74.559 | 0.593 | n/a | 0.000 | 0.000 | 0.678 | 73.081 | 0.018 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.083 | 0.593 | 0.008 | 0.083 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d0000000000000093 | 66.041 | 0.085 | n/a | 0.000 | 0.000 | 0.948 | 64.812 | 0.023 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.100 | 0.085 | 0.001 | 0.100 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d0000000000000091 | 64.832 | 0.819 | n/a | 0.000 | 0.000 | 2.340 | 61.214 | 0.015 | 0.000 | 0.281 | 0.000 | n/a | n/a | 0.163 | 0.819 | 0.013 | 0.163 | gw-r/thread-55/journal/page | none observed |
| 9b9a75b4776c068d0000000000000097 | 61.642 | 0.451 | n/a | 0.000 | 0.000 | 0.834 | 60.184 | 0.011 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.088 | 0.451 | 0.007 | 0.088 | gw-r/thread-71/journal/page | none observed |

## P3 / p4h10 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.861 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 0.867 | 200.877 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.092 | 0.052 | 0.000 | 0.092 |
| p99 | 209.495 | n/a | n/a | n/a | 0.198 | n/a | 0.000 | 0.000 | 6.696 | 202.220 | 2.236 | 0.000 | 0.286 | 0.000 | n/a | n/a | 0.161 | 0.198 | 0.001 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d00000000000000af | 209.495 | 0.058 | n/a | 0.000 | 0.000 | 6.696 | 202.220 | 0.074 | 0.000 | 0.286 | 0.000 | n/a | n/a | 0.161 | 0.058 | 0.000 | 0.161 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d00000000000000ae | 202.497 | 0.198 | n/a | 0.000 | 0.000 | 0.887 | 201.192 | 0.024 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.092 | 0.198 | 0.001 | 0.092 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d00000000000000ab | 202.423 | 0.046 | n/a | 0.000 | 0.000 | 1.094 | 201.041 | 0.012 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.120 | 0.046 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b0 | 202.327 | 0.074 | n/a | 0.000 | 0.000 | 1.106 | 200.896 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.159 | 0.074 | 0.000 | 0.159 | gw-r/thread-72/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b2 | 202.009 | 0.031 | n/a | 0.000 | 0.000 | 0.787 | 200.930 | 0.056 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d00000000000000a8 | 201.861 | 0.049 | n/a | 0.000 | 0.000 | 0.784 | 200.786 | 0.012 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.135 | 0.049 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b3 | 201.830 | 0.039 | n/a | 0.000 | 0.000 | 0.727 | 200.877 | 0.013 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.074 | 0.039 | 0.000 | 0.074 | gw-r/thread-69/journal/page | none observed |
| 9b9a75b4776c068d00000000000000ad | 201.677 | 0.046 | n/a | 0.000 | 0.000 | 0.732 | 200.716 | 0.013 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.082 | 0.046 | 0.000 | 0.082 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d00000000000000a9 | 195.677 | 0.079 | n/a | 0.000 | 0.000 | 0.757 | 192.773 | 1.957 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.077 | 0.079 | 0.000 | 0.077 | gw-r/thread-74/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b4 | 114.693 | 0.052 | n/a | 0.000 | 0.000 | 1.011 | 113.489 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.081 | 0.052 | 0.000 | 0.081 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b1 | 88.568 | 0.125 | n/a | 0.000 | 0.000 | 0.867 | 85.145 | 2.236 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.155 | 0.125 | 0.001 | 0.155 | gw-r/thread-76/journal/page | none observed |

## P3 / presweep / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.016 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 0.790 | 200.997 | 0.016 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.095 | 0.048 | 0.000 | 0.095 |
| p99 | 208.598 | n/a | n/a | n/a | 0.095 | n/a | 0.000 | 0.000 | 6.473 | 205.180 | 0.020 | 0.000 | 0.281 | 0.000 | n/a | n/a | 0.199 | 0.095 | 0.000 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 9b9a75b4776c068d00000000000000b6 | 208.598 | 0.043 | n/a | 0.000 | 0.000 | 6.473 | 201.849 | 0.020 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.095 | 0.043 | 0.000 | 0.095 | gw-r/thread-69/journal/page | none observed |
| 9b9a75b4776c068d00000000000000be | 207.783 | 0.083 | n/a | 0.000 | 0.000 | 2.096 | 205.180 | 0.018 | 0.000 | 0.281 | 0.000 | n/a | n/a | 0.124 | 0.083 | 0.000 | 0.124 | gw-r/thread-54/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b8 | 204.225 | 0.051 | n/a | 0.000 | 0.000 | 2.888 | 201.036 | 0.015 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.137 | 0.051 | 0.000 | 0.137 | gw-r/thread-73/journal/page | none observed |
| 9b9a75b4776c068d00000000000000ba | 202.768 | 0.043 | n/a | 0.000 | 0.000 | 0.922 | 201.472 | 0.020 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.155 | 0.043 | 0.000 | 0.155 | gw-r/thread-70/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b9 | 202.016 | 0.043 | n/a | 0.000 | 0.000 | 0.787 | 200.997 | 0.016 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.077 | 0.043 | 0.000 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 9b9a75b4776c068d00000000000000bf | 201.964 | 0.048 | n/a | 0.000 | 0.000 | 0.790 | 200.920 | 0.016 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.088 | 0.048 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 9b9a75b4776c068d00000000000000b5 | 201.915 | 0.095 | n/a | 0.000 | 0.000 | 0.647 | 200.864 | 0.016 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.199 | 0.095 | 0.000 | 0.199 | gw-r/thread-76/journal/page | none observed |
| 9b9a75b4776c068d00000000000000bc | 201.484 | 0.045 | n/a | 0.000 | 0.000 | 0.508 | 200.746 | 0.019 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-75/journal/page | none observed |
| 9b9a75b4776c068d00000000000000c0 | 146.433 | 0.069 | n/a | 0.000 | 0.000 | 0.784 | 145.401 | 0.015 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.091 | 0.069 | 0.000 | 0.091 | gw-r/thread-53/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
