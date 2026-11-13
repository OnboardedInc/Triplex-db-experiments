# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (280.751 ms, trace `ca10090f2601caff00000000000000b5`); `node-14/thread-0/client.persist-and-resolve` (143.099 ms, trace `ca10090f2601caff000000000000014a`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (106.437 ms, trace `ca10090f2601caff00000000000000bb`); `node-14/thread-0/client.persist-and-resolve` (133.346 ms, trace `ca10090f2601caff0000000000000149`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (98.017 ms, trace `ca10090f2601caff00000000000000cd`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-smoke-h`; source `f6893eca95524bb4ecd715f442e8bcb23b8169c4`; subjects 1000; tracing summary.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 2352886.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.683 | 6.871 | 1.844 | 0.000 | 0.046 | 2.497 | 5.586 | 0.106 | 0.000 | 1.316 | 19.209 | n/a | n/a | 0.021 | 8.753 | 0.184 | 0.021 |
| p99 | 57.127 | 15.840 | n/a | 0.000 | 1.004 | 4.277 | 14.760 | 0.190 | 0.000 | 7.726 | 27.547 | n/a | n/a | 0.276 | 16.911 | 0.296 | 0.276 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff0000000000000094 | 57.127 | 15.840 | 1.025 | 0.000 | 0.046 | 4.277 | 14.760 | 0.190 | 0.000 | 1.316 | 19.652 | n/a | n/a | 0.021 | 16.911 | 0.296 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.557ms |
| ca10090f2601caff0000000000000092 | 53.417 | 8.298 | n/a | 0.000 | 0.632 | 2.497 | 6.336 | 0.106 | 0.000 | 7.726 | 27.547 | n/a | n/a | 0.276 | 8.930 | 0.167 | 0.276 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000098 | 39.683 | 6.871 | 1.844 | 0.000 | 0.039 | 3.329 | 3.698 | 0.132 | 0.000 | 4.542 | 19.209 | n/a | n/a | 0.020 | 8.753 | 0.221 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000096 | 31.675 | 4.829 | n/a | 0.000 | 1.004 | 1.266 | 5.586 | 0.057 | 0.000 | 0.531 | 18.372 | n/a | n/a | 0.029 | 5.833 | 0.184 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.675 | 4.829 | n/a | 0.000 | 1.004 | 1.266 | 5.586 | 0.057 | 0.000 | 0.531 | 18.372 | n/a | n/a | 0.029 | 5.833 | 0.184 | 0.029 |
| p99 | 31.675 | 4.829 | n/a | 0.000 | 1.004 | 1.266 | 5.586 | 0.057 | 0.000 | 0.531 | 18.372 | n/a | n/a | 0.029 | 5.833 | 0.184 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff0000000000000096 | 31.675 | 4.829 | n/a | 0.000 | 1.004 | 1.266 | 5.586 | 0.057 | 0.000 | 0.531 | 18.372 | n/a | n/a | 0.029 | 5.833 | 0.184 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.464 | 5.356 | 0.929 | 0.000 | 0.104 | 2.389 | 2.427 | 0.060 | 0.000 | 0.806 | 10.208 | n/a | n/a | 0.030 | 5.752 | 0.255 | 0.030 |
| p99 | 44.625 | 9.293 | n/a | 1.434 | 0.789 | 2.987 | 7.014 | 0.100 | 0.000 | 1.097 | 33.996 | n/a | n/a | 0.068 | 10.325 | 0.341 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000009a | 44.625 | 3.883 | n/a | 0.728 | 0.789 | 1.615 | 2.427 | 0.060 | 0.000 | 1.097 | 33.996 | n/a | n/a | 0.030 | 5.399 | 0.121 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000a0 | 40.451 | 9.293 | 0.929 | 0.000 | 0.104 | 2.987 | 7.014 | 0.100 | 0.000 | 0.581 | 19.376 | n/a | n/a | 0.068 | 10.325 | 0.255 | 0.068 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000009e | 22.464 | 6.019 | n/a | 1.434 | 0.214 | 2.389 | 1.297 | 0.041 | 0.000 | 0.806 | 10.208 | n/a | n/a | 0.056 | 7.667 | 0.341 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000009c | 19.693 | 5.356 | 0.350 | 0.000 | 0.045 | 2.646 | 2.619 | 0.070 | 0.000 | 0.881 | 7.702 | n/a | n/a | 0.025 | 5.752 | 0.292 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.464 | 3.883 | n/a | 0.728 | 0.214 | 1.615 | 1.297 | 0.041 | 0.000 | 0.806 | 10.208 | n/a | n/a | 0.030 | 5.399 | 0.121 | 0.030 |
| p99 | 44.625 | 6.019 | n/a | 1.434 | 0.789 | 2.389 | 2.427 | 0.060 | 0.000 | 1.097 | 33.996 | n/a | n/a | 0.056 | 7.667 | 0.341 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000009a | 44.625 | 3.883 | n/a | 0.728 | 0.789 | 1.615 | 2.427 | 0.060 | 0.000 | 1.097 | 33.996 | n/a | n/a | 0.030 | 5.399 | 0.121 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000009e | 22.464 | 6.019 | n/a | 1.434 | 0.214 | 2.389 | 1.297 | 0.041 | 0.000 | 0.806 | 10.208 | n/a | n/a | 0.056 | 7.667 | 0.341 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.503 | 6.274 | 0.247 | 0.000 | 0.083 | 1.863 | 3.387 | 0.071 | 0.000 | 0.595 | 14.169 | n/a | n/a | 0.023 | 6.603 | 0.217 | 0.023 |
| p99 | 30.459 | 6.442 | n/a | 1.219 | 0.257 | 3.892 | 5.739 | 0.082 | 0.000 | 0.718 | 16.143 | n/a | n/a | 0.033 | 7.919 | 0.331 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000a4 | 30.459 | 6.274 | 0.247 | 0.000 | 0.083 | 3.892 | 3.316 | 0.071 | 0.000 | 0.402 | 16.143 | n/a | n/a | 0.033 | 6.603 | 0.217 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000a7 | 24.503 | 4.097 | 0.246 | 0.000 | 0.043 | 1.863 | 3.387 | 0.082 | 0.000 | 0.595 | 14.169 | n/a | n/a | 0.021 | 4.386 | 0.179 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000a2 | 23.952 | 6.442 | n/a | 1.219 | 0.257 | 0.911 | 5.739 | 0.052 | 0.000 | 0.718 | 8.590 | n/a | n/a | 0.023 | 7.919 | 0.331 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.861 | 8.306 | 0.386 | 0.000 | 0.049 | 2.286 | 2.653 | 0.065 | 0.000 | 0.840 | 20.046 | n/a | n/a | 0.023 | 8.737 | 0.228 | 0.023 |
| p99 | 75.609 | 9.293 | n/a | 1.841 | 1.142 | 3.663 | 10.794 | 0.168 | 0.000 | 8.797 | 50.581 | n/a | n/a | 0.051 | 11.241 | 0.249 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000ad | 75.609 | 8.306 | 0.381 | 0.000 | 0.049 | 3.663 | 7.759 | 0.168 | 0.000 | 4.651 | 50.581 | n/a | n/a | 0.051 | 8.737 | 0.116 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000a9 | 48.619 | 9.293 | n/a | 1.841 | 0.107 | 1.466 | 10.794 | 0.127 | 0.000 | 0.637 | 24.305 | n/a | n/a | 0.049 | 11.241 | 0.231 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000b0 | 43.861 | 8.761 | 0.386 | 0.820 | 0.031 | 2.286 | 2.653 | 0.065 | 0.000 | 8.797 | 20.046 | n/a | n/a | 0.016 | 9.999 | 0.228 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000ab | 23.525 | 4.706 | n/a | 0.000 | 1.142 | 2.922 | 2.625 | 0.042 | 0.000 | 0.840 | 11.225 | n/a | n/a | 0.023 | 5.847 | 0.249 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.270 | 4.649 | 0.468 | 0.000 | 0.077 | 2.635 | 3.538 | 0.134 | 0.000 | 2.323 | 34.956 | n/a | n/a | 0.028 | 5.745 | 0.049 | 0.028 |
| p99 | 307.789 | 7.336 | n/a | 0.472 | 1.096 | 5.074 | 45.582 | 10.325 | 0.000 | 3.601 | 280.751 | n/a | n/a | 0.033 | 8.338 | 0.184 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000b5 | 307.789 | 4.649 | n/a | 0.000 | 1.096 | 5.074 | 3.538 | 10.325 | 0.000 | 2.323 | 280.751 | n/a | n/a | 0.033 | 5.745 | 0.019 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000b6 | 113.886 | 4.585 | n/a | 0.000 | 1.030 | 2.635 | 45.582 | 0.134 | 0.000 | 3.305 | 56.587 | n/a | n/a | 0.028 | 5.614 | 0.049 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.473ms |
| ca10090f2601caff00000000000000b9 | 80.270 | 6.637 | 0.426 | 0.389 | 0.077 | 4.266 | 31.626 | 0.279 | 0.000 | 1.580 | 34.956 | n/a | n/a | 0.033 | 7.530 | 0.094 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000b2 | 45.253 | 7.336 | 0.468 | 0.472 | 0.062 | 2.399 | 3.319 | 0.063 | 0.000 | 3.601 | 27.510 | n/a | n/a | 0.022 | 8.338 | 0.184 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 113.886 | 4.585 | n/a | 0.000 | 1.030 | 2.635 | 3.538 | 0.134 | 0.000 | 2.323 | 56.587 | n/a | n/a | 0.028 | 5.614 | 0.019 | 0.028 |
| p99 | 307.789 | 4.649 | n/a | 0.000 | 1.096 | 5.074 | 45.582 | 10.325 | 0.000 | 3.305 | 280.751 | n/a | n/a | 0.033 | 5.745 | 0.049 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000b5 | 307.789 | 4.649 | n/a | 0.000 | 1.096 | 5.074 | 3.538 | 10.325 | 0.000 | 2.323 | 280.751 | n/a | n/a | 0.033 | 5.745 | 0.019 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000b6 | 113.886 | 4.585 | n/a | 0.000 | 1.030 | 2.635 | 45.582 | 0.134 | 0.000 | 3.305 | 56.587 | n/a | n/a | 0.028 | 5.614 | 0.049 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.473ms |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 59.778 | 4.235 | 0.310 | 0.000 | 0.042 | 1.546 | 16.726 | 0.079 | 0.000 | 0.645 | 34.721 | n/a | n/a | 0.023 | 5.372 | 0.058 | 0.023 |
| p99 | 149.447 | 7.780 | n/a | 0.389 | 1.137 | 4.937 | 31.537 | 0.188 | 0.000 | 2.015 | 106.437 | n/a | n/a | 0.029 | 8.673 | 0.126 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000bb | 149.447 | 7.780 | n/a | 0.000 | 0.892 | 2.054 | 31.537 | 0.079 | 0.000 | 0.645 | 106.437 | n/a | n/a | 0.023 | 8.673 | 0.058 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000bd | 125.898 | 4.028 | 0.310 | 0.389 | 0.042 | 4.937 | 28.682 | 0.188 | 0.000 | 2.015 | 85.286 | n/a | n/a | 0.023 | 4.769 | 0.038 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000c2 | 59.778 | 5.557 | 0.272 | 0.268 | 0.026 | 1.546 | 16.726 | 0.097 | 0.000 | 0.545 | 34.721 | n/a | n/a | 0.019 | 6.124 | 0.102 | 0.019 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000c0 | 42.727 | 4.235 | n/a | 0.000 | 1.137 | 0.969 | 1.732 | 0.039 | 0.000 | 1.410 | 33.175 | n/a | n/a | 0.029 | 5.372 | 0.126 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.727 | 4.235 | n/a | 0.000 | 1.137 | 0.969 | 1.732 | 0.039 | 0.000 | 1.410 | 33.175 | n/a | n/a | 0.029 | 5.372 | 0.126 | 0.029 |
| p99 | 42.727 | 4.235 | n/a | 0.000 | 1.137 | 0.969 | 1.732 | 0.039 | 0.000 | 1.410 | 33.175 | n/a | n/a | 0.029 | 5.372 | 0.126 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000c0 | 42.727 | 4.235 | n/a | 0.000 | 1.137 | 0.969 | 1.732 | 0.039 | 0.000 | 1.410 | 33.175 | n/a | n/a | 0.029 | 5.372 | 0.126 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 59.419 | 6.170 | n/a | 0.000 | 0.128 | 1.731 | 12.339 | 0.143 | 0.000 | 0.974 | 26.459 | n/a | n/a | 0.023 | 6.578 | 0.127 | 0.023 |
| p99 | 135.974 | 9.690 | n/a | 0.357 | 1.093 | 2.469 | 26.125 | 0.177 | 0.000 | 1.207 | 98.017 | n/a | n/a | 0.047 | 10.560 | 0.206 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000cd | 135.974 | 7.199 | 0.909 | 0.357 | 0.032 | 2.469 | 26.125 | 0.143 | 0.000 | 0.706 | 98.017 | n/a | n/a | 0.016 | 8.498 | 0.062 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000c4 | 86.343 | 5.485 | n/a | 0.000 | 1.093 | 1.513 | 12.339 | 0.143 | 0.000 | 0.974 | 64.750 | n/a | n/a | 0.047 | 6.578 | 0.076 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000c6 | 59.419 | 9.690 | 0.520 | 0.316 | 0.034 | 2.409 | 19.108 | 0.177 | 0.000 | 0.682 | 26.459 | n/a | n/a | 0.023 | 10.560 | 0.178 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000c9 | 30.590 | 6.170 | n/a | 0.000 | 0.128 | 1.731 | 4.806 | 0.110 | 0.000 | 1.207 | 16.399 | n/a | n/a | 0.040 | 6.298 | 0.206 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000cb | 24.908 | 3.021 | n/a | 0.000 | 0.147 | 0.872 | 8.666 | 0.050 | 0.000 | 1.161 | 10.972 | n/a | n/a | 0.020 | 3.168 | 0.127 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.590 | 5.485 | n/a | 0.000 | 0.147 | 1.513 | 8.666 | 0.110 | 0.000 | 1.161 | 16.399 | n/a | n/a | 0.040 | 6.298 | 0.127 | 0.040 |
| p99 | 86.343 | 6.170 | n/a | 0.000 | 1.093 | 1.731 | 12.339 | 0.143 | 0.000 | 1.207 | 64.750 | n/a | n/a | 0.047 | 6.578 | 0.206 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000c4 | 86.343 | 5.485 | n/a | 0.000 | 1.093 | 1.513 | 12.339 | 0.143 | 0.000 | 0.974 | 64.750 | n/a | n/a | 0.047 | 6.578 | 0.076 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000c9 | 30.590 | 6.170 | n/a | 0.000 | 0.128 | 1.731 | 4.806 | 0.110 | 0.000 | 1.207 | 16.399 | n/a | n/a | 0.040 | 6.298 | 0.206 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000cb | 24.908 | 3.021 | n/a | 0.000 | 0.147 | 0.872 | 8.666 | 0.050 | 0.000 | 1.161 | 10.972 | n/a | n/a | 0.020 | 3.168 | 0.127 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.573 | 4.935 | 0.245 | 0.000 | 0.031 | 2.002 | 13.942 | 0.069 | 0.000 | 1.287 | 19.197 | n/a | n/a | 0.016 | 5.415 | 0.051 | 0.016 |
| p99 | 106.290 | 5.255 | 0.444 | 0.493 | 0.036 | 5.288 | 23.481 | 0.107 | 14.233 | 3.352 | 54.424 | n/a | n/a | 0.028 | 6.024 | 0.141 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000d2 | 106.290 | 4.935 | 0.444 | 0.000 | 0.036 | 5.288 | 23.481 | 0.069 | 14.233 | 3.352 | 54.424 | n/a | n/a | 0.028 | 5.415 | 0.051 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000cf | 42.573 | 5.255 | 0.245 | 0.493 | 0.031 | 2.002 | 13.942 | 0.107 | 0.000 | 1.287 | 19.197 | n/a | n/a | 0.016 | 6.024 | 0.141 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 2.221ms |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 50.755 | 5.701 | 4.581 | 0.000 | 0.043 | 1.441 | 7.462 | 0.058 | 0.000 | 0.565 | 19.294 | n/a | n/a | 0.020 | 6.234 | 0.134 | 0.020 |
| p99 | 64.817 | 7.330 | n/a | 0.439 | 0.832 | 6.888 | 14.066 | 0.177 | 0.000 | 3.781 | 49.508 | n/a | n/a | 0.023 | 11.215 | 0.221 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000d6 | 64.817 | 5.701 | n/a | 0.000 | 0.534 | 1.180 | 7.462 | 0.040 | 0.000 | 0.370 | 49.508 | n/a | n/a | 0.023 | 6.234 | 0.096 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000d4 | 60.329 | 7.330 | 0.269 | 0.439 | 0.043 | 6.888 | 13.565 | 0.177 | 0.000 | 0.565 | 31.031 | n/a | n/a | 0.021 | 8.080 | 0.134 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000db | 50.755 | 6.310 | 4.581 | 0.295 | 0.029 | 2.251 | 14.066 | 0.131 | 0.000 | 3.781 | 19.294 | n/a | n/a | 0.018 | 11.215 | 0.221 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000d9 | 26.213 | 3.890 | n/a | 0.000 | 0.832 | 1.441 | 2.882 | 0.058 | 0.000 | 1.181 | 15.909 | n/a | n/a | 0.020 | 4.721 | 0.180 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.203 | 7.087 | 4.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 12.191 | 0.998 | 0.014 |
| p99 | 240.459 | 36.904 | 60.993 | 4.166 | 0.000 | 1.457 | 81.841 | 0.015 | 113.362 | 0.268 | 0.000 | n/a | n/a | 39.547 | 70.793 | 1.000 | 39.547 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000f2 | 240.459 | 36.904 | 20.017 | 1.299 | 0.000 | 0.809 | 68.001 | 0.012 | 113.362 | 0.038 | 0.000 | n/a | n/a | 0.018 | 58.220 | 0.242 | 0.018 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| ca10090f2601caff00000000000000d7 | 134.372 | 30.789 | 18.853 | 1.139 | 0.000 | 1.457 | 81.841 | 0.015 | 0.000 | 0.268 | 0.000 | n/a | n/a | 0.010 | 50.781 | 0.378 | 0.010 | gw-w/thread-48/gateway.admitted-work | none observed |
| ca10090f2601caff000000000000011c | 70.814 | 9.801 | 60.993 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 70.793 | 1.000 | 0.021 | node-14/thread-0/rpc.replica.observe | none observed |
| ca10090f2601caff00000000000000fd | 57.740 | 13.738 | 4.089 | 0.000 | 0.000 | 0.365 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 39.547 | 17.827 | 0.309 | 39.547 | node-14/thread-0/socket.wait-first-byte | none observed |
| ca10090f2601caff00000000000000bc | 25.336 | 19.035 | 2.121 | 4.166 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 25.322 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff0000000000000093 | 24.144 | 1.097 | 23.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 24.111 | 0.999 | 0.033 | node-14/thread-0/rpc.replica.observe | none observed |
| ca10090f2601caff00000000000000aa | 19.962 | 19.579 | 0.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 19.946 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff0000000000000132 | 16.452 | 0.281 | 16.163 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 16.444 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | driver.publication 1.209ms |
| ca10090f2601caff0000000000000114 | 14.604 | 14.307 | 0.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 14.556 | 0.997 | 0.047 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff00000000000000b8 | 13.561 | 11.079 | 2.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 13.548 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff00000000000000b7 | 12.203 | 12.077 | 0.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 12.191 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff0000000000000104 | 11.297 | 10.923 | 0.363 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 11.286 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff00000000000000ac | 9.914 | 0.886 | 9.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 9.895 | 0.998 | 0.019 | node-14/thread-0/rpc.replica.observe | none observed |
| ca10090f2601caff00000000000000c1 | 9.088 | 0.759 | 8.251 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.078 | 9.010 | 0.991 | 0.078 | node-14/thread-0/rpc.replica.observe | none observed |
| ca10090f2601caff00000000000000da | 8.948 | 6.044 | 2.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.936 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff000000000000013a | 8.165 | 7.087 | 1.068 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 8.155 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff000000000000010a | 6.877 | 0.424 | 6.441 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 6.865 | 0.998 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |
| ca10090f2601caff00000000000000c5 | 6.655 | 4.286 | 2.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 6.625 | 0.996 | 0.030 | node-14/thread-2/replica.pull-at | none observed |
| ca10090f2601caff000000000000010c | 5.939 | 0.500 | 5.426 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 5.925 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| ca10090f2601caff00000000000000e4 | 5.751 | 0.882 | 4.857 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 5.739 | 0.998 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.213 | 3.890 | n/a | 0.000 | 0.832 | 1.441 | 2.882 | 0.058 | 0.000 | 1.181 | 15.909 | n/a | n/a | 0.020 | 4.721 | 0.180 | 0.020 |
| p99 | 26.213 | 3.890 | n/a | 0.000 | 0.832 | 1.441 | 2.882 | 0.058 | 0.000 | 1.181 | 15.909 | n/a | n/a | 0.020 | 4.721 | 0.180 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000d9 | 26.213 | 3.890 | n/a | 0.000 | 0.832 | 1.441 | 2.882 | 0.058 | 0.000 | 1.181 | 15.909 | n/a | n/a | 0.020 | 4.721 | 0.180 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.752 | 5.094 | 0.254 | 0.256 | 0.046 | 2.211 | 14.098 | 0.108 | 0.000 | 1.359 | 10.484 | n/a | n/a | 0.018 | 5.634 | 0.189 | 0.018 |
| p99 | 42.229 | 6.932 | n/a | 0.274 | 1.055 | 7.902 | 18.709 | 0.324 | 0.000 | 2.690 | 12.814 | n/a | n/a | 0.022 | 7.987 | 0.236 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000dd | 42.229 | 6.932 | n/a | 0.000 | 1.055 | 7.902 | 18.709 | 0.108 | 0.000 | 1.359 | 6.142 | n/a | n/a | 0.022 | 7.987 | 0.189 | 0.022 | gw-w/thread-51/gateway.admitted-work | none observed |
| ca10090f2601caff00000000000000de | 33.752 | 5.021 | 0.251 | 0.274 | 0.046 | 2.211 | 14.098 | 0.324 | 0.000 | 1.028 | 10.484 | n/a | n/a | 0.016 | 5.591 | 0.166 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000e0 | 23.915 | 5.094 | 0.254 | 0.256 | 0.031 | 0.981 | 1.709 | 0.068 | 0.000 | 2.690 | 12.814 | n/a | n/a | 0.018 | 5.634 | 0.236 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.229 | 6.932 | n/a | 0.000 | 1.055 | 7.902 | 18.709 | 0.108 | 0.000 | 1.359 | 6.142 | n/a | n/a | 0.022 | 7.987 | 0.189 | 0.022 |
| p99 | 42.229 | 6.932 | n/a | 0.000 | 1.055 | 7.902 | 18.709 | 0.108 | 0.000 | 1.359 | 6.142 | n/a | n/a | 0.022 | 7.987 | 0.189 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000dd | 42.229 | 6.932 | n/a | 0.000 | 1.055 | 7.902 | 18.709 | 0.108 | 0.000 | 1.359 | 6.142 | n/a | n/a | 0.022 | 7.987 | 0.189 | 0.022 | gw-w/thread-51/gateway.admitted-work | none observed |

## P2 / outside-phases / commit (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.957 | 3.833 | n/a | 0.000 | 0.098 | 1.697 | 1.967 | 0.050 | 0.000 | 1.472 | 19.918 | n/a | n/a | 0.022 | 4.612 | 0.158 | 0.022 |
| p99 | 50.958 | 11.220 | n/a | 0.373 | 1.046 | 6.374 | 16.069 | 0.083 | 0.000 | 4.102 | 29.227 | n/a | n/a | 0.031 | 11.318 | 0.268 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000012b | 50.958 | 4.086 | 0.288 | 0.312 | 0.042 | 6.374 | 8.599 | 0.050 | 0.000 | 2.159 | 29.027 | n/a | n/a | 0.022 | 4.728 | 0.093 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000e5 | 50.732 | 5.513 | 0.290 | 0.373 | 0.048 | 2.563 | 16.069 | 0.083 | 0.000 | 1.054 | 24.710 | n/a | n/a | 0.031 | 6.223 | 0.123 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000fc | 45.362 | 6.747 | n/a | 0.000 | 0.413 | 3.814 | 1.704 | 0.042 | 0.000 | 3.394 | 29.227 | n/a | n/a | 0.022 | 7.159 | 0.158 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000e3 | 42.183 | 11.220 | n/a | 0.000 | 0.098 | 5.199 | 2.605 | 0.081 | 0.000 | 1.472 | 21.479 | n/a | n/a | 0.029 | 11.318 | 0.268 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000012d | 31.957 | 3.809 | 0.425 | 0.280 | 0.042 | 1.697 | 5.241 | 0.063 | 0.000 | 0.464 | 19.918 | n/a | n/a | 0.018 | 4.556 | 0.143 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000fa | 25.678 | 2.897 | n/a | 0.000 | 0.359 | 0.721 | 1.194 | 0.039 | 0.000 | 0.773 | 19.677 | n/a | n/a | 0.017 | 3.256 | 0.127 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000ff | 19.691 | 3.578 | 0.198 | 0.000 | 0.043 | 1.555 | 1.745 | 0.048 | 0.000 | 2.200 | 10.308 | n/a | n/a | 0.017 | 3.819 | 0.194 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000101 | 19.052 | 2.580 | n/a | 0.000 | 1.046 | 1.395 | 1.967 | 0.083 | 0.000 | 4.102 | 7.857 | n/a | n/a | 0.023 | 3.625 | 0.190 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000129 | 18.191 | 3.833 | n/a | 0.000 | 0.779 | 0.838 | 1.307 | 0.038 | 0.000 | 0.550 | 10.821 | n/a | n/a | 0.025 | 4.612 | 0.254 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.773 | 3.841 | 0.238 | 0.359 | 0.034 | 1.283 | 3.598 | 0.094 | 0.000 | 0.511 | 21.752 | n/a | n/a | 0.022 | 5.032 | 0.049 | 0.022 |
| p99 | 122.179 | 5.374 | 0.695 | 0.428 | 0.069 | 2.790 | 22.942 | 0.135 | 0.000 | 0.986 | 89.773 | n/a | n/a | 0.029 | 6.005 | 0.154 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000e7 | 122.179 | 5.374 | 0.238 | 0.359 | 0.034 | 2.790 | 22.942 | 0.135 | 0.000 | 0.511 | 89.773 | n/a | n/a | 0.022 | 6.005 | 0.049 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000e9 | 32.773 | 3.841 | 0.695 | 0.428 | 0.069 | 1.283 | 3.598 | 0.094 | 0.000 | 0.986 | 21.752 | n/a | n/a | 0.029 | 5.032 | 0.154 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.843 | 4.529 | 0.488 | 0.000 | 0.047 | 1.970 | 1.462 | 0.044 | 0.000 | 2.299 | 15.468 | n/a | n/a | 0.027 | 5.163 | 0.113 | 0.027 |
| p99 | 75.406 | 72.996 | n/a | 1.514 | 0.809 | 4.078 | 6.928 | 5.027 | 0.000 | 4.582 | 33.636 | n/a | n/a | 0.087 | 75.319 | 0.999 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000ef | 75.406 | 72.996 | n/a | 1.514 | 0.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 75.319 | 0.999 | 0.087 | node-14/thread-0/client.persist-and-resolve | client.encode 2.748ms; driver.publication 1.155ms |
| ca10090f2601caff00000000000000ee | 49.787 | 4.529 | 0.303 | 0.000 | 0.062 | 3.373 | 3.769 | 5.027 | 0.000 | 4.582 | 28.107 | n/a | n/a | 0.034 | 4.894 | 0.098 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000ec | 46.843 | 5.257 | n/a | 0.000 | 0.041 | 4.078 | 1.462 | 0.044 | 0.000 | 2.299 | 33.636 | n/a | n/a | 0.027 | 5.298 | 0.113 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff00000000000000f7 | 34.042 | 4.304 | 0.488 | 0.324 | 0.047 | 1.970 | 6.928 | 0.131 | 0.000 | 4.364 | 15.468 | n/a | n/a | 0.018 | 5.163 | 0.152 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.406 | 72.996 | n/a | 1.514 | 0.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 75.319 | 0.999 | 0.087 |
| p99 | 75.406 | 72.996 | n/a | 1.514 | 0.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 75.319 | 0.999 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff00000000000000ef | 75.406 | 72.996 | n/a | 1.514 | 0.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 75.319 | 0.999 | 0.087 | node-14/thread-0/client.persist-and-resolve | client.encode 2.748ms; driver.publication 1.155ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.191 | 2.580 | n/a | 0.000 | 0.779 | 0.838 | 1.307 | 0.038 | 0.000 | 0.550 | 7.857 | n/a | n/a | 0.023 | 3.625 | 0.190 | 0.023 |
| p99 | 19.052 | 3.833 | n/a | 0.000 | 1.046 | 1.395 | 1.967 | 0.083 | 0.000 | 4.102 | 10.821 | n/a | n/a | 0.025 | 4.612 | 0.254 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff0000000000000101 | 19.052 | 2.580 | n/a | 0.000 | 1.046 | 1.395 | 1.967 | 0.083 | 0.000 | 4.102 | 7.857 | n/a | n/a | 0.023 | 3.625 | 0.190 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000129 | 18.191 | 3.833 | n/a | 0.000 | 0.779 | 0.838 | 1.307 | 0.038 | 0.000 | 0.550 | 10.821 | n/a | n/a | 0.025 | 4.612 | 0.254 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.337 | 3.706 | n/a | 0.000 | 0.606 | 1.461 | 4.182 | 0.040 | 0.000 | 0.574 | 14.187 | n/a | n/a | 0.020 | 4.478 | 0.174 | 0.020 |
| p99 | 57.132 | 8.928 | n/a | 0.450 | 0.982 | 3.475 | 10.518 | 0.104 | 0.000 | 2.700 | 38.587 | n/a | n/a | 0.049 | 9.782 | 0.256 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff0000000000000113 | 57.132 | 8.928 | n/a | 0.000 | 0.854 | 1.758 | 4.182 | 0.073 | 0.000 | 2.700 | 38.587 | n/a | n/a | 0.049 | 9.782 | 0.171 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000103 | 48.812 | 3.164 | n/a | 0.000 | 0.982 | 1.461 | 5.349 | 0.036 | 0.000 | 0.392 | 37.403 | n/a | n/a | 0.024 | 4.146 | 0.085 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000105 | 39.376 | 3.861 | 0.212 | 0.450 | 0.031 | 2.070 | 10.518 | 0.104 | 0.000 | 0.830 | 21.283 | n/a | n/a | 0.017 | 4.554 | 0.116 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000111 | 35.862 | 4.159 | 0.288 | 0.000 | 0.031 | 1.674 | 10.273 | 0.053 | 0.000 | 0.522 | 18.817 | n/a | n/a | 0.044 | 4.478 | 0.125 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000115 | 28.510 | 4.202 | 0.333 | 0.374 | 0.043 | 1.696 | 5.617 | 0.063 | 0.000 | 1.975 | 14.187 | n/a | n/a | 0.020 | 4.952 | 0.174 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000010d | 26.337 | 3.706 | n/a | 0.000 | 0.906 | 0.914 | 1.405 | 0.063 | 0.000 | 0.433 | 18.888 | n/a | n/a | 0.022 | 4.612 | 0.175 | 0.022 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000107 | 21.249 | 3.535 | n/a | 0.000 | 0.657 | 3.475 | 4.354 | 0.040 | 0.000 | 0.574 | 8.595 | n/a | n/a | 0.020 | 4.192 | 0.197 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000010f | 18.438 | 3.717 | n/a | 0.000 | 0.904 | 0.843 | 1.007 | 0.039 | 0.000 | 0.795 | 11.114 | n/a | n/a | 0.019 | 4.621 | 0.251 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000109 | 17.865 | 3.109 | n/a | 0.000 | 0.145 | 0.841 | 1.758 | 0.038 | 0.000 | 0.784 | 11.171 | n/a | n/a | 0.018 | 3.254 | 0.182 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000010b | 15.136 | 3.268 | n/a | 0.000 | 0.606 | 0.927 | 3.822 | 0.040 | 0.000 | 0.428 | 6.024 | n/a | n/a | 0.021 | 3.874 | 0.256 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.136 | 3.268 | n/a | 0.000 | 0.606 | 0.843 | 1.007 | 0.039 | 0.000 | 0.428 | 6.024 | n/a | n/a | 0.019 | 3.874 | 0.251 | 0.019 |
| p99 | 18.438 | 3.717 | n/a | 0.000 | 0.904 | 0.927 | 3.822 | 0.040 | 0.000 | 0.795 | 11.114 | n/a | n/a | 0.021 | 4.621 | 0.256 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000010f | 18.438 | 3.717 | n/a | 0.000 | 0.904 | 0.843 | 1.007 | 0.039 | 0.000 | 0.795 | 11.114 | n/a | n/a | 0.019 | 4.621 | 0.251 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000010b | 15.136 | 3.268 | n/a | 0.000 | 0.606 | 0.927 | 3.822 | 0.040 | 0.000 | 0.428 | 6.024 | n/a | n/a | 0.021 | 3.874 | 0.256 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.483 | 4.085 | 9.173 | 0.356 | 0.043 | 1.741 | 6.281 | 0.061 | 0.000 | 2.580 | 20.735 | n/a | n/a | 0.019 | 13.650 | 0.272 | 0.019 |
| p99 | 56.424 | 6.404 | n/a | 0.361 | 22.640 | 10.857 | 17.520 | 0.116 | 0.000 | 7.627 | 22.502 | n/a | n/a | 0.021 | 29.044 | 0.515 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000011b | 56.424 | 6.404 | n/a | 0.000 | 22.640 | 0.908 | 2.158 | 0.061 | 0.000 | 1.730 | 22.502 | n/a | n/a | 0.021 | 29.044 | 0.515 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.encode 3.965ms |
| ca10090f2601caff000000000000011d | 52.483 | 4.004 | 0.317 | 0.361 | 0.043 | 1.741 | 17.520 | 0.116 | 0.000 | 7.627 | 20.735 | n/a | n/a | 0.019 | 4.725 | 0.090 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000125 | 50.171 | 4.085 | 9.173 | 0.356 | 0.035 | 10.857 | 6.281 | 0.052 | 0.000 | 2.580 | 16.734 | n/a | n/a | 0.019 | 13.650 | 0.272 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.834 | 5.052 | n/a | 0.000 | 0.658 | 1.180 | 7.641 | 0.052 | 0.000 | 0.476 | 19.311 | n/a | n/a | 0.018 | 6.457 | 0.138 | 0.018 |
| p99 | 69.872 | 6.821 | n/a | 0.481 | 11.313 | 1.772 | 9.383 | 0.096 | 0.000 | 0.962 | 53.202 | n/a | n/a | 0.024 | 14.004 | 0.508 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000012f | 69.872 | 5.799 | n/a | 0.000 | 0.658 | 1.180 | 8.545 | 0.038 | 0.000 | 0.427 | 53.202 | n/a | n/a | 0.023 | 6.457 | 0.092 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000135 | 46.508 | 5.052 | 0.258 | 0.481 | 0.035 | 1.772 | 9.383 | 0.050 | 0.000 | 0.476 | 28.985 | n/a | n/a | 0.018 | 5.826 | 0.125 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000137 | 30.834 | 3.713 | 0.237 | 0.275 | 0.036 | 1.633 | 7.641 | 0.096 | 0.000 | 0.962 | 16.218 | n/a | n/a | 0.024 | 4.261 | 0.138 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000131 | 30.414 | 6.821 | n/a | 0.000 | 0.863 | 1.159 | 1.752 | 0.052 | 0.000 | 0.438 | 19.311 | n/a | n/a | 0.018 | 7.684 | 0.253 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000133 | 27.591 | 2.691 | n/a | 0.000 | 11.313 | 1.065 | 1.777 | 0.073 | 0.000 | 0.529 | 10.135 | n/a | n/a | 0.008 | 14.004 | 0.508 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.049ms |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.591 | 2.691 | n/a | 0.000 | 11.313 | 1.065 | 1.777 | 0.073 | 0.000 | 0.529 | 10.135 | n/a | n/a | 0.008 | 14.004 | 0.508 | 0.008 |
| p99 | 27.591 | 2.691 | n/a | 0.000 | 11.313 | 1.065 | 1.777 | 0.073 | 0.000 | 0.529 | 10.135 | n/a | n/a | 0.008 | 14.004 | 0.508 | 0.008 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff0000000000000133 | 27.591 | 2.691 | n/a | 0.000 | 11.313 | 1.065 | 1.777 | 0.073 | 0.000 | 0.529 | 10.135 | n/a | n/a | 0.008 | 14.004 | 0.508 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.049ms |

## P5 / presweep / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.821 | 4.725 | 0.835 | 0.000 | 0.029 | 1.305 | 1.617 | 0.087 | 0.000 | 1.729 | 10.974 | n/a | n/a | 0.023 | 4.999 | 0.214 | 0.023 |
| p99 | 37.298 | 8.850 | n/a | 0.256 | 0.484 | 2.408 | 7.526 | 0.129 | 0.000 | 3.401 | 15.932 | n/a | n/a | 0.029 | 9.340 | 0.250 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000013b | 37.298 | 8.850 | 0.206 | 0.256 | 0.027 | 2.408 | 7.526 | 0.087 | 0.000 | 3.401 | 14.512 | n/a | n/a | 0.024 | 9.340 | 0.250 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000013f | 26.119 | 4.725 | 0.835 | 0.000 | 0.029 | 1.305 | 1.451 | 0.089 | 0.000 | 1.729 | 15.932 | n/a | n/a | 0.023 | 5.589 | 0.214 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff000000000000013d | 20.821 | 4.859 | n/a | 0.000 | 0.140 | 1.406 | 2.150 | 0.129 | 0.000 | 1.348 | 10.760 | n/a | n/a | 0.029 | 4.999 | 0.240 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000139 | 18.909 | 2.999 | n/a | 0.000 | 0.484 | 0.302 | 1.617 | 0.048 | 0.000 | 2.466 | 10.974 | n/a | n/a | 0.019 | 3.483 | 0.184 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.909 | 2.999 | n/a | 0.000 | 0.140 | 0.302 | 1.617 | 0.048 | 0.000 | 1.348 | 10.760 | n/a | n/a | 0.019 | 3.483 | 0.184 | 0.019 |
| p99 | 20.821 | 4.859 | n/a | 0.000 | 0.484 | 1.406 | 2.150 | 0.129 | 0.000 | 2.466 | 10.974 | n/a | n/a | 0.029 | 4.999 | 0.240 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000013d | 20.821 | 4.859 | n/a | 0.000 | 0.140 | 1.406 | 2.150 | 0.129 | 0.000 | 1.348 | 10.760 | n/a | n/a | 0.029 | 4.999 | 0.240 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| ca10090f2601caff0000000000000139 | 18.909 | 2.999 | n/a | 0.000 | 0.484 | 0.302 | 1.617 | 0.048 | 0.000 | 2.466 | 10.974 | n/a | n/a | 0.019 | 3.483 | 0.184 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 107.258 | 106.119 | n/a | 1.119 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 107.247 | 1.000 | 0.012 |
| p99 | 150.985 | 149.810 | n/a | 1.119 | 0.048 | 4.160 | 1.490 | 0.089 | 0.000 | 2.583 | 29.024 | n/a | n/a | 0.046 | 150.940 | 1.000 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ca10090f2601caff000000000000014a | 150.985 | 149.810 | n/a | 1.119 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 150.940 | 1.000 | 0.046 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.283ms; driver.publication 2.038ms; driver.publication 1.706ms; driver.publication 1.655ms |
| ca10090f2601caff0000000000000149 | 140.923 | 139.786 | n/a | 1.119 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 140.913 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.283ms; driver.publication 2.038ms; driver.publication 1.706ms; driver.publication 1.655ms |
| ca10090f2601caff0000000000000148 | 130.032 | 128.892 | n/a | 1.119 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 130.021 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.283ms; driver.publication 2.038ms; driver.publication 1.706ms; driver.publication 1.655ms |
| ca10090f2601caff0000000000000147 | 125.488 | 124.348 | n/a | 1.119 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 125.476 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.283ms; driver.publication 2.038ms; driver.publication 1.706ms; driver.publication 1.655ms |
| ca10090f2601caff0000000000000146 | 118.906 | 117.756 | n/a | 1.119 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 118.894 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.283ms; driver.publication 2.038ms; driver.publication 1.706ms; driver.publication 1.655ms |
| ca10090f2601caff0000000000000145 | 107.258 | 106.119 | n/a | 1.119 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 107.247 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.038ms; driver.publication 1.706ms; driver.publication 1.655ms; driver.publication 1.016ms |
| ca10090f2601caff0000000000000144 | 103.354 | 102.197 | n/a | 1.119 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 103.331 | 1.000 | 0.023 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 2.038ms; driver.publication 1.655ms; driver.publication 1.016ms |
| ca10090f2601caff0000000000000143 | 90.728 | 89.589 | n/a | 1.119 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 90.716 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 1.655ms; driver.publication 1.016ms |
| ca10090f2601caff0000000000000142 | 50.559 | 49.411 | n/a | 1.119 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 50.542 | 1.000 | 0.017 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.416ms; driver.publication 1.016ms |
| ca10090f2601caff0000000000000141 | 45.633 | 8.206 | n/a | 0.000 | 0.048 | 4.160 | 1.490 | 0.089 | 0.000 | 2.583 | 29.024 | n/a | n/a | 0.032 | 8.254 | 0.181 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (211 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 302.499 | 46.414 | n/a | 8.869 | 302.463 | 8.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 41.510 | 302.496 | 1.000 | 41.510 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9fcaa72127bcdb10000000000000b04 | 302.525 | 0.017 | n/a | 0.000 | 302.506 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.523 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000000b03 | 302.519 | 0.021 | n/a | 0.000 | 302.497 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 302.517 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000000b02 | 302.499 | 0.032 | n/a | 0.000 | 302.463 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.496 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000000b01 | 302.459 | 0.059 | n/a | 0.000 | 302.397 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 302.456 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000000b00 | 301.380 | 0.291 | n/a | 0.000 | 301.085 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 301.375 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000005a9 | 301.309 | 0.366 | n/a | 0.000 | 300.939 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 301.304 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000005ae | 301.226 | 0.021 | n/a | 0.000 | 301.203 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.224 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000005ad | 301.208 | 0.018 | n/a | 0.000 | 301.188 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.207 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000005ac | 301.199 | 0.020 | n/a | 0.000 | 301.177 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.197 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000005ab | 301.186 | 0.023 | n/a | 0.000 | 301.160 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 301.183 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000005aa | 301.181 | 0.048 | n/a | 0.000 | 301.130 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 301.178 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000006cd | 300.293 | 0.361 | n/a | 0.000 | 299.927 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 300.288 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000006d0 | 300.164 | 0.022 | n/a | 0.000 | 300.139 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.162 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000006cf | 300.132 | 0.021 | n/a | 0.000 | 300.109 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.130 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000006ce | 300.130 | 0.052 | n/a | 0.000 | 300.075 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 300.126 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000006d3 | 300.064 | 0.029 | n/a | 0.000 | 300.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.062 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000009997 | 282.246 | 0.017 | n/a | 0.000 | 282.228 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.245 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000009996 | 282.235 | 0.017 | n/a | 0.000 | 282.218 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.234 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000009994 | 282.231 | 0.103 | n/a | 0.000 | 282.127 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.230 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000009995 | 282.231 | 0.029 | n/a | 0.000 | 282.201 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.230 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 296.341 | 2.662 | n/a | 0.000 | 296.172 | 0.416 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.896 | 296.339 | 1.000 | 1.896 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5cfaa781c3347b2000000000001ffd3 | 296.341 | 0.167 | n/a | 0.000 | 296.172 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 296.339 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| e5cfaa781c3347b2000000000000d900 | 243.033 | 0.204 | n/a | 0.000 | 242.826 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 243.030 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| e5cfaa781c3347b2000000000000d92e | 4.974 | 2.662 | n/a | 0.000 | 0.000 | 0.416 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.896 | 2.662 | 0.535 | 1.896 | node-14/thread-3/reader.execute | replica.apply-delta 0.070ms |
| e5cfaa781c3347b2000000000001474c | 0.580 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.578 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000011afc | 0.570 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.568 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b2000000000001e1d9 | 0.533 | 0.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.531 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b2000000000001a88a | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| e5cfaa781c3347b2000000000000ecc4 | 0.410 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.410 | 0.000 | 0.000 | 0.410 | uncovered | none observed |
| e5cfaa781c3347b2000000000000ecd9 | 0.390 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | uncovered | none observed |
| e5cfaa781c3347b2000000000001e13b | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| e5cfaa781c3347b2000000000000d976 | 0.373 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.373 | 0.000 | 0.000 | 0.373 | uncovered | none observed |
| e5cfaa781c3347b20000000000014731 | 0.372 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.372 | 0.000 | 0.000 | 0.372 | uncovered | none observed |
| e5cfaa781c3347b200000000000135c2 | 0.367 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | uncovered | none observed |
| e5cfaa781c3347b200000000000135b3 | 0.350 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.350 | 0.000 | 0.000 | 0.350 | uncovered | none observed |
| e5cfaa781c3347b2000000000000e8ae | 0.334 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.334 | 0.000 | 0.000 | 0.334 | uncovered | none observed |
| e5cfaa781c3347b2000000000000d940 | 0.325 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.325 | 0.000 | 0.000 | 0.325 | uncovered | none observed |
| e5cfaa781c3347b20000000000012e3b | 0.323 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.323 | 0.000 | 0.000 | 0.323 | uncovered | none observed |
| e5cfaa781c3347b20000000000013d3b | 0.320 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | uncovered | none observed |
| e5cfaa781c3347b2000000000000d951 | 0.314 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | uncovered | none observed |
| e5cfaa781c3347b20000000000019f59 | 0.311 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.311 | 0.000 | 0.000 | 0.311 | uncovered | none observed |

## P1 / L4 / read (212 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 273.677 | 12.266 | n/a | 0.000 | 273.514 | 0.484 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.744 | 273.674 | 1.000 | 2.744 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 110ebd71d9bf73ed000000000000cf0b | 274.312 | 0.137 | n/a | 0.000 | 274.172 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.309 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000210c6 | 273.767 | 0.053 | n/a | 0.000 | 273.712 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.766 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000210c5 | 273.677 | 0.160 | n/a | 0.000 | 273.514 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.674 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000000c1ef | 272.738 | 0.112 | n/a | 0.000 | 272.623 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.735 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000000b873 | 157.367 | 0.444 | n/a | 0.000 | 156.915 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 157.359 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e5cfaa781c3347b2000000000001ffd6 | 157.079 | 0.098 | n/a | 0.000 | 156.977 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 157.075 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 110ebd71d9bf73ed000000000000c282 | 156.289 | 0.198 | n/a | 0.000 | 156.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 156.286 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| c9fcaa72127bcdb1000000000000b87c | 39.165 | 34.262 | n/a | 1.669 | 0.000 | 0.489 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.744 | 35.932 | 0.917 | 2.744 | node-14/thread-5/reader.execute | none observed |
| e5cfaa781c3347b20000000000020091 | 17.117 | 12.824 | n/a | 0.000 | 0.000 | 0.484 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.809 | 12.824 | 0.749 | 3.809 | node-14/thread-3/reader.execute | none observed |
| 110ebd71d9bf73ed000000000000c2bc | 16.085 | 12.266 | n/a | 0.000 | 0.000 | 1.835 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.984 | 12.266 | 0.763 | 1.984 | node-14/thread-4/reader.execute | none observed |
| e5cfaa781c3347b2000000000003023b | 4.104 | 4.101 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.101 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 110ebd71d9bf73ed000000000000ce25 | 2.897 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.897 | 0.000 | 0.000 | 2.897 | uncovered | none observed |
| e5cfaa781c3347b20000000000021299 | 2.110 | 2.109 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.109 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| c9fcaa72127bcdb100000000000100b0 | 1.233 | 1.231 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.231 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| e5cfaa781c3347b2000000000002009f | 1.171 | 1.164 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 1.164 | 0.994 | 0.007 | node-14/thread-3/reader.execute | none observed |
| 110ebd71d9bf73ed0000000000017d61 | 1.146 | 1.143 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.143 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 110ebd71d9bf73ed000000000001857d | 1.137 | 1.136 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.136 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 110ebd71d9bf73ed000000000000c2b2 | 1.131 | 1.130 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.130 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| c9fcaa72127bcdb1000000000001317f | 1.102 | 1.101 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.101 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 110ebd71d9bf73ed000000000000f05a | 0.952 | 0.951 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.951 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L16 / read (252 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.029 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 557.160 | 3.603 | n/a | 0.000 | 557.099 | 0.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.649 | 557.159 | 1.000 | 2.649 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9fcaa72127bcdb10000000000021119 | 557.194 | 0.250 | n/a | 0.000 | 556.941 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 557.191 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| c9fcaa72127bcdb1000000000002111a | 557.171 | 0.073 | n/a | 0.000 | 557.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 557.170 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| c9fcaa72127bcdb1000000000002111b | 557.160 | 0.060 | n/a | 0.000 | 557.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 557.159 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| c9fcaa72127bcdb1000000000002111d | 557.138 | 0.014 | n/a | 0.000 | 557.124 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 557.138 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| c9fcaa72127bcdb1000000000002111c | 557.135 | 0.025 | n/a | 0.000 | 557.109 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 557.134 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| e5cfaa781c3347b20000000000039a31 | 556.816 | 0.098 | n/a | 0.000 | 556.717 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.815 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 110ebd71d9bf73ed00000000000207e8 | 556.810 | 0.187 | n/a | 0.000 | 556.621 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 556.808 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 110ebd71d9bf73ed00000000000207e9 | 556.802 | 0.035 | n/a | 0.000 | 556.766 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.801 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| e5cfaa781c3347b20000000000039a30 | 556.792 | 0.016 | n/a | 0.000 | 556.775 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.792 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000039a2f | 556.774 | 0.021 | n/a | 0.000 | 556.753 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.773 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000039a32 | 556.756 | 0.018 | n/a | 0.000 | 556.737 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 556.754 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000039a2e | 556.714 | 0.125 | n/a | 0.000 | 556.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 556.712 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000039a4b | 556.412 | 0.027 | n/a | 0.000 | 556.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.411 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| 110ebd71d9bf73ed0000000000020806 | 556.377 | 0.012 | n/a | 0.000 | 556.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.376 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 110ebd71d9bf73ed0000000000020804 | 556.372 | 0.027 | n/a | 0.000 | 556.344 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.371 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| 110ebd71d9bf73ed0000000000020805 | 556.368 | 0.013 | n/a | 0.000 | 556.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 556.368 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| e5cfaa781c3347b20000000000039a8a | 52.790 | 0.023 | n/a | 0.000 | 52.766 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 52.788 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e5cfaa781c3347b20000000000039a8b | 52.784 | 0.013 | n/a | 0.000 | 52.769 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 52.783 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e5cfaa781c3347b20000000000039a89 | 52.779 | 0.023 | n/a | 0.000 | 52.756 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 52.779 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e5cfaa781c3347b20000000000039a88 | 52.768 | 0.016 | n/a | 0.000 | 52.751 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 52.767 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.032ms |

## P1 / L64 / read (185 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.054 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 399.354 | 10.760 | n/a | 0.000 | 399.071 | 0.833 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 20.067 | 399.350 | 1.000 | 20.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 110ebd71d9bf73ed0000000000027e0b | 399.655 | 0.060 | n/a | 0.000 | 399.590 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 399.650 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000027e0a | 399.354 | 0.280 | n/a | 0.000 | 399.071 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 399.350 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b2000000000004178e | 397.209 | 0.386 | n/a | 0.000 | 396.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 397.206 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b2000000000004178f | 397.178 | 0.057 | n/a | 0.000 | 397.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 397.176 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000027e35 | 397.114 | 0.165 | n/a | 0.000 | 396.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 397.109 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000027e3e | 396.444 | 0.073 | n/a | 0.000 | 396.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 396.439 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed0000000000027e3f | 396.369 | 0.026 | n/a | 0.000 | 396.341 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 396.366 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000417a3 | 396.095 | 0.088 | n/a | 0.000 | 396.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 396.092 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000417c3 | 393.467 | 0.123 | n/a | 0.000 | 393.339 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 393.462 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000417c4 | 393.374 | 0.038 | n/a | 0.000 | 393.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 393.371 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000417c8 | 393.017 | 0.086 | n/a | 0.000 | 392.927 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 393.013 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000029274 | 385.329 | 0.654 | n/a | 0.000 | 384.658 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 385.312 | 1.000 | 0.017 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000029284 | 383.301 | 0.146 | n/a | 0.000 | 383.150 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 383.297 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000002929a | 382.145 | 0.038 | n/a | 0.000 | 382.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 382.143 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000002929b | 382.122 | 0.020 | n/a | 0.000 | 382.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 382.119 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000002929f | 381.957 | 0.032 | n/a | 0.000 | 381.922 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 381.955 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000043b6d | 297.471 | 0.343 | n/a | 0.000 | 297.126 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.469 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000043b6e | 297.443 | 0.112 | n/a | 0.000 | 297.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.442 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000043b6f | 297.412 | 0.044 | n/a | 0.000 | 297.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.411 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| e5cfaa781c3347b20000000000043b7b | 296.137 | 0.033 | n/a | 0.000 | 296.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 296.134 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |

## P1 / L256 / read (190 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.037 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 334.830 | 8.109 | n/a | 0.000 | 334.799 | 0.762 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 28.522 | 334.829 | 1.000 | 28.522 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 110ebd71d9bf73ed000000000002fa15 | 334.846 | 0.018 | n/a | 0.000 | 334.827 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.845 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 110ebd71d9bf73ed000000000002fa14 | 334.830 | 0.030 | n/a | 0.000 | 334.799 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.829 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 110ebd71d9bf73ed000000000002fa13 | 334.779 | 0.028 | n/a | 0.000 | 334.750 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.778 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 110ebd71d9bf73ed000000000002fa12 | 334.750 | 0.038 | n/a | 0.000 | 334.711 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.750 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 110ebd71d9bf73ed000000000002fa11 | 334.676 | 0.153 | n/a | 0.000 | 334.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 334.673 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| c9fcaa72127bcdb10000000000031173 | 334.617 | 0.030 | n/a | 0.000 | 334.585 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.615 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| c9fcaa72127bcdb10000000000031172 | 334.583 | 0.023 | n/a | 0.000 | 334.558 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.582 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| c9fcaa72127bcdb10000000000031171 | 334.541 | 0.031 | n/a | 0.000 | 334.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.540 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| c9fcaa72127bcdb10000000000031180 | 334.506 | 0.022 | n/a | 0.000 | 334.483 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.505 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| c9fcaa72127bcdb10000000000031170 | 334.470 | 0.156 | n/a | 0.000 | 334.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 334.468 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| e5cfaa781c3347b2000000000004943c | 333.350 | 0.019 | n/a | 0.000 | 333.329 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.348 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| e5cfaa781c3347b2000000000004943b | 333.327 | 0.020 | n/a | 0.000 | 333.306 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.326 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| e5cfaa781c3347b2000000000004943a | 333.295 | 0.032 | n/a | 0.000 | 333.261 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 333.293 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| e5cfaa781c3347b20000000000049443 | 333.216 | 0.019 | n/a | 0.000 | 333.196 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.215 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| e5cfaa781c3347b20000000000049439 | 333.194 | 0.147 | n/a | 0.000 | 333.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 333.183 | 1.000 | 0.010 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| e5cfaa781c3347b20000000000049448 | 289.560 | 0.078 | n/a | 0.000 | 289.476 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 289.554 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000003af38 | 281.827 | 0.025 | n/a | 0.000 | 281.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.826 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000003af37 | 281.803 | 0.016 | n/a | 0.000 | 281.786 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.802 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000003af36 | 281.785 | 0.021 | n/a | 0.000 | 281.763 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.784 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000003af35 | 281.752 | 0.064 | n/a | 0.000 | 281.687 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.751 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (281 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 65.231 | 15.452 | n/a | 0.000 | 0.000 | 0.341 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 45.327 | 18.225 | 1.000 | 45.327 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 110ebd71d9bf73ed000000000003a473 | 105.915 | 52.894 | n/a | 6.865 | 0.000 | 0.829 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 45.327 | 59.759 | 0.564 | 45.327 | node-14/thread-4/socket.wait-first-byte | none observed |
| c9fcaa72127bcdb1000000000003c497 | 70.101 | 21.030 | n/a | 0.000 | 0.000 | 1.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 47.999 | 21.030 | 0.300 | 47.999 | node-14/thread-5/socket.wait-first-byte | none observed |
| e5cfaa781c3347b20000000000054d6e | 65.231 | 15.452 | n/a | 2.773 | 0.000 | 0.341 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 46.665 | 18.225 | 0.279 | 46.665 | node-14/thread-3/socket.wait-first-byte | none observed |
| c9fcaa72127bcdb10000000000040176 | 8.886 | 8.863 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 8.863 | 0.997 | 0.023 | node-14/thread-5/replica.pull-at | none observed |
| c9fcaa72127bcdb10000000000040175 | 8.874 | 8.870 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 8.870 | 1.000 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| c9fcaa72127bcdb10000000000040177 | 8.815 | 8.790 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.790 | 0.997 | 0.026 | node-14/thread-5/replica.pull-at | none observed |
| c9fcaa72127bcdb1000000000003fb62 | 6.152 | 6.151 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 6.151 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| c9fcaa72127bcdb100000000000451e4 | 4.411 | 4.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 4.402 | 0.998 | 0.009 | node-14/thread-5/replica.pull-at | none observed |
| c9fcaa72127bcdb1000000000004285a | 4.216 | 4.212 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.212 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| c9fcaa72127bcdb1000000000004285b | 4.198 | 4.185 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.185 | 0.997 | 0.013 | node-14/thread-5/replica.pull-at | none observed |
| e5cfaa781c3347b2000000000005634e | 4.035 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.035 | 0.000 | 0.000 | 4.035 | uncovered | none observed |
| c9fcaa72127bcdb1000000000004f25b | 3.976 | 3.973 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.973 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000057e34 | 3.657 | 3.651 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 3.651 | 0.998 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000057e35 | 3.652 | 3.624 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.624 | 0.992 | 0.028 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000057e36 | 3.631 | 3.601 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 3.601 | 0.992 | 0.030 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000057e37 | 3.609 | 3.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 3.577 | 0.991 | 0.032 | node-14/thread-3/replica.pull-at | none observed |
| 110ebd71d9bf73ed000000000004cfde | 3.547 | 3.546 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.546 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 110ebd71d9bf73ed00000000000422ab | 3.392 | 3.380 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 3.380 | 0.996 | 0.012 | node-14/thread-4/replica.pull-at | none observed |
| 110ebd71d9bf73ed00000000000422aa | 3.389 | 3.387 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.387 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 110ebd71d9bf73ed00000000000422ac | 3.378 | 3.365 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.365 | 0.996 | 0.013 | node-14/thread-4/replica.pull-at | none observed |

## P1 / recovery / read (220 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.038 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 312.805 | 5.085 | n/a | 0.000 | 312.395 | 0.689 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.978 | 312.804 | 1.000 | 2.978 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9fcaa72127bcdb1000000000005a925 | 312.958 | 0.090 | n/a | 0.000 | 312.867 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.957 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005a924 | 312.909 | 0.166 | n/a | 0.000 | 312.741 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.907 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005a923 | 312.805 | 0.414 | n/a | 0.000 | 312.391 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.804 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005a922 | 312.433 | 0.037 | n/a | 0.000 | 312.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.432 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000073763 | 312.365 | 0.042 | n/a | 0.000 | 312.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.364 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000073762 | 312.345 | 0.015 | n/a | 0.000 | 312.329 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.344 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000073761 | 312.334 | 0.016 | n/a | 0.000 | 312.317 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.333 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000073760 | 312.326 | 0.020 | n/a | 0.000 | 312.305 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.325 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005a921 | 312.321 | 0.207 | n/a | 0.000 | 312.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 312.317 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b2000000000007375f | 312.298 | 0.026 | n/a | 0.000 | 312.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 312.296 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b2000000000007375e | 312.260 | 0.141 | n/a | 0.000 | 312.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 312.255 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed000000000005759f | 312.252 | 0.028 | n/a | 0.000 | 312.222 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.250 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000575a0 | 312.250 | 0.020 | n/a | 0.000 | 312.229 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.249 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000575a1 | 312.237 | 0.018 | n/a | 0.000 | 312.217 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.235 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed000000000005759e | 312.220 | 0.116 | n/a | 0.000 | 312.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 312.216 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000575a8 | 311.683 | 0.052 | n/a | 0.000 | 311.629 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 311.681 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005b595 | 268.397 | 0.138 | n/a | 0.000 | 268.256 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.394 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005b594 | 268.392 | 0.064 | n/a | 0.000 | 268.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.389 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005b596 | 268.328 | 0.055 | n/a | 0.000 | 268.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.326 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005b597 | 268.294 | 0.025 | n/a | 0.000 | 268.267 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.292 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (152 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 1.468 | 1.200 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.468 | 1.200 | 0.998 | 0.468 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5cfaa781c3347b200000000000764a0 | 6.677 | 1.200 | n/a | 0.000 | 0.000 | 0.321 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.156 | 1.200 | 0.180 | 5.156 | node-14/thread-3/socket.wait-first-byte | none observed |
| e5cfaa781c3347b20000000000076879 | 1.468 | 1.467 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.467 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000096dda | 1.054 | 1.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.053 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000084fa5 | 0.935 | 0.930 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.930 | 0.995 | 0.005 | node-14/thread-3/reader.execute | none observed |
| e5cfaa781c3347b20000000000083e6a | 0.859 | 0.857 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.857 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000078a29 | 0.756 | 0.753 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.753 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b2000000000008b58c | 0.694 | 0.691 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.691 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b2000000000008158b | 0.677 | 0.675 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.675 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000927fa | 0.568 | 0.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.566 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000077d71 | 0.509 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.507 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| e5cfaa781c3347b20000000000096c78 | 0.468 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.468 | 0.000 | 0.000 | 0.468 | uncovered | none observed |
| e5cfaa781c3347b2000000000007b997 | 0.452 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.452 | 0.000 | 0.000 | 0.452 | uncovered | none observed |
| e5cfaa781c3347b2000000000009070f | 0.452 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.452 | 0.000 | 0.000 | 0.452 | uncovered | none observed |
| e5cfaa781c3347b20000000000091111 | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| e5cfaa781c3347b20000000000084e13 | 0.420 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | uncovered | none observed |
| e5cfaa781c3347b2000000000008415c | 0.418 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.418 | 0.000 | 0.000 | 0.418 | uncovered | none observed |
| e5cfaa781c3347b20000000000081f46 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| e5cfaa781c3347b200000000000902de | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |
| e5cfaa781c3347b20000000000080c4f | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| e5cfaa781c3347b200000000000805f4 | 0.361 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.361 | 0.000 | 0.000 | 0.361 | uncovered | none observed |

## P4 / p4h1 / read (174 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.994 | 0.992 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.486 | 0.992 | 0.998 | 0.486 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5cfaa781c3347b2000000000009710f | 11.360 | 2.715 | n/a | 0.000 | 0.000 | 0.659 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.986 | 2.715 | 0.239 | 7.986 | node-14/thread-3/socket.wait-first-byte | none observed |
| e5cfaa781c3347b2000000000009eef0 | 0.994 | 0.992 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.992 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b20000000000099a1b | 0.722 | 0.719 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.719 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000b30ee | 0.697 | 0.695 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.695 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000bc8c5 | 0.668 | 0.666 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.666 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000ba1d8 | 0.608 | 0.606 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.606 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000a21cf | 0.580 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.578 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000a927c | 0.567 | 0.565 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.565 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000a6571 | 0.509 | 0.505 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.505 | 0.992 | 0.004 | node-14/thread-3/reader.execute | none observed |
| e5cfaa781c3347b200000000000bb86f | 0.486 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.486 | 0.000 | 0.000 | 0.486 | uncovered | none observed |
| e5cfaa781c3347b200000000000aaa77 | 0.475 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.475 | 0.000 | 0.000 | 0.475 | uncovered | none observed |
| e5cfaa781c3347b200000000000991f5 | 0.473 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.473 | 0.000 | 0.000 | 0.473 | uncovered | none observed |
| e5cfaa781c3347b200000000000a92cf | 0.447 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.447 | 0.000 | 0.000 | 0.447 | uncovered | none observed |
| e5cfaa781c3347b2000000000009943d | 0.433 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.433 | 0.000 | 0.000 | 0.433 | uncovered | none observed |
| e5cfaa781c3347b200000000000ba1ef | 0.407 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.407 | 0.000 | 0.000 | 0.407 | uncovered | none observed |
| e5cfaa781c3347b200000000000b479b | 0.404 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.404 | 0.000 | 0.000 | 0.404 | uncovered | none observed |
| e5cfaa781c3347b200000000000aa6c0 | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| e5cfaa781c3347b200000000000a3ee6 | 0.394 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | uncovered | none observed |
| e5cfaa781c3347b200000000000aa91f | 0.367 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | uncovered | none observed |
| e5cfaa781c3347b200000000000a3f49 | 0.361 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.361 | 0.000 | 0.000 | 0.361 | uncovered | none observed |

## P4 / p4h3 / read (150 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.965 | 0.961 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.499 | 0.961 | 0.997 | 0.499 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5cfaa781c3347b200000000000bd1c9 | 10.272 | 2.565 | n/a | 0.000 | 0.000 | 0.581 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.126 | 2.565 | 0.250 | 7.126 | node-14/thread-3/socket.wait-first-byte | none observed |
| e5cfaa781c3347b200000000000d8661 | 0.965 | 0.961 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.961 | 0.996 | 0.004 | node-14/thread-3/reader.execute | none observed |
| e5cfaa781c3347b200000000000d4f17 | 0.949 | 0.947 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.947 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000ddafc | 0.665 | 0.663 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.663 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000dd649 | 0.633 | 0.631 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.631 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000d81bd | 0.598 | 0.595 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.595 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000c12c7 | 0.592 | 0.590 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.590 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000d8405 | 0.590 | 0.588 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.588 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000dede9 | 0.578 | 0.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.577 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000d7c08 | 0.525 | 0.523 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.523 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000d853d | 0.499 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.499 | 0.000 | 0.000 | 0.499 | uncovered | none observed |
| e5cfaa781c3347b200000000000cc53e | 0.485 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | uncovered | none observed |
| e5cfaa781c3347b200000000000d8688 | 0.482 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.482 | 0.000 | 0.000 | 0.482 | uncovered | none observed |
| e5cfaa781c3347b200000000000d8692 | 0.475 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.475 | 0.000 | 0.000 | 0.475 | uncovered | none observed |
| e5cfaa781c3347b200000000000d8033 | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| e5cfaa781c3347b200000000000dfa21 | 0.460 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.460 | 0.000 | 0.000 | 0.460 | uncovered | none observed |
| e5cfaa781c3347b200000000000c4f3a | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| e5cfaa781c3347b200000000000ddb07 | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| e5cfaa781c3347b200000000000d9548 | 0.420 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | uncovered | none observed |
| e5cfaa781c3347b200000000000ddb15 | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |

## P4 / p4h10 / read (135 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 1.011 | 1.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.467 | 1.010 | 0.999 | 0.467 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5cfaa781c3347b200000000000dfa70 | 12.885 | 1.947 | n/a | 0.000 | 0.000 | 0.567 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 10.372 | 1.947 | 0.151 | 10.372 | node-14/thread-3/socket.wait-first-byte | none observed |
| e5cfaa781c3347b200000000000ecd95 | 1.011 | 1.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.010 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000dfae7 | 0.664 | 0.663 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.663 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000e7475 | 0.580 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.578 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000f7cb0 | 0.531 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.529 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000f71bf | 0.523 | 0.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.521 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e5cfaa781c3347b200000000000f71b6 | 0.467 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.467 | 0.000 | 0.000 | 0.467 | uncovered | none observed |
| e5cfaa781c3347b200000000000fc7b4 | 0.436 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.436 | 0.000 | 0.000 | 0.436 | uncovered | none observed |
| e5cfaa781c3347b200000000000f297b | 0.420 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | uncovered | none observed |
| e5cfaa781c3347b200000000000ef819 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| e5cfaa781c3347b200000000000f9a55 | 0.403 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.403 | 0.000 | 0.000 | 0.403 | uncovered | none observed |
| e5cfaa781c3347b200000000000e6a81 | 0.390 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.390 | 0.000 | 0.000 | 0.390 | uncovered | none observed |
| e5cfaa781c3347b200000000000ea7d1 | 0.388 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.388 | 0.000 | 0.000 | 0.388 | uncovered | none observed |
| e5cfaa781c3347b200000000000f7e39 | 0.386 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.386 | 0.000 | 0.000 | 0.386 | uncovered | none observed |
| e5cfaa781c3347b200000000000f92a8 | 0.381 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.381 | 0.000 | 0.000 | 0.381 | uncovered | none observed |
| e5cfaa781c3347b200000000000dfa29 | 0.377 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.377 | 0.000 | 0.000 | 0.377 | uncovered | none observed |
| e5cfaa781c3347b200000000000f7df1 | 0.375 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | uncovered | none observed |
| e5cfaa781c3347b200000000000f0fd5 | 0.368 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.368 | 0.000 | 0.000 | 0.368 | uncovered | none observed |
| e5cfaa781c3347b200000000000f7e51 | 0.365 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 | uncovered | none observed |
| e5cfaa781c3347b200000000000eb308 | 0.359 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.359 | 0.000 | 0.000 | 0.359 | uncovered | none observed |

## P5 / presweep / read (215 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.049 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 271.656 | 11.439 | n/a | 3.789 | 271.631 | 0.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.255 | 271.655 | 1.000 | 4.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 110ebd71d9bf73ed00000000000603d4 | 271.672 | 0.039 | n/a | 0.000 | 271.631 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.671 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000603d3 | 271.665 | 0.040 | n/a | 0.000 | 271.623 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.663 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000603d5 | 271.656 | 0.019 | n/a | 0.000 | 271.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.655 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000603d6 | 271.653 | 0.017 | n/a | 0.000 | 271.635 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.652 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 110ebd71d9bf73ed00000000000603c7 | 271.061 | 0.098 | n/a | 0.000 | 270.959 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.057 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000105b47 | 270.819 | 0.071 | n/a | 0.000 | 270.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.818 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000105b46 | 270.715 | 0.133 | n/a | 0.000 | 270.580 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.713 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000105b45 | 270.568 | 0.032 | n/a | 0.000 | 270.534 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.567 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000105b44 | 270.521 | 0.030 | n/a | 0.000 | 270.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.520 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000062f4c | 270.495 | 0.014 | n/a | 0.000 | 270.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.494 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000062f4b | 270.485 | 0.015 | n/a | 0.000 | 270.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.484 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000105b43 | 270.478 | 0.043 | n/a | 0.000 | 270.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.477 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000062f4a | 270.474 | 0.016 | n/a | 0.000 | 270.457 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.473 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b20000000000105b3b | 270.467 | 0.210 | n/a | 0.000 | 270.253 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.463 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000062f49 | 270.446 | 0.023 | n/a | 0.000 | 270.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.445 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb10000000000062f48 | 270.402 | 0.112 | n/a | 0.000 | 270.288 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.400 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005db1b | 58.080 | 0.041 | n/a | 0.000 | 58.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 58.079 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c9fcaa72127bcdb1000000000005db1a | 58.052 | 0.158 | n/a | 0.000 | 57.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 58.048 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000ffe52 | 57.958 | 0.026 | n/a | 0.000 | 57.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 57.958 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e5cfaa781c3347b200000000000ffe51 | 57.953 | 0.038 | n/a | 0.000 | 57.915 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 57.952 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P5 / sweep / read (86 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.218 | 2.488 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.203 | 0.994 | 0.016 |
| p99 | 80.306 | 63.538 | n/a | 8.707 | 0.000 | 2.677 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.490 | 72.246 | 1.000 | 29.490 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e5cfaa781c3347b2000000000010c8b4 | 80.306 | 63.538 | n/a | 8.707 | 0.000 | 2.677 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.383 | 72.246 | 0.900 | 5.383 | node-14/thread-3/reader.execute | none observed |
| c9fcaa72127bcdb1000000000006a408 | 39.085 | 8.622 | n/a | 0.000 | 0.000 | 0.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.490 | 8.622 | 0.221 | 29.490 | node-14/thread-5/socket.wait-first-byte | none observed |
| 110ebd71d9bf73ed0000000000067178 | 19.940 | 13.130 | n/a | 2.432 | 0.000 | 1.145 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.232 | 15.563 | 0.780 | 3.232 | node-14/thread-4/reader.execute | none observed |
| 110ebd71d9bf73ed00000000000678db | 10.908 | 10.894 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 10.894 | 0.999 | 0.015 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| 110ebd71d9bf73ed00000000000678da | 10.906 | 10.904 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 10.904 | 1.000 | 0.003 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| 110ebd71d9bf73ed00000000000678dc | 10.906 | 10.890 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 10.890 | 0.999 | 0.015 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| 110ebd71d9bf73ed00000000000678dd | 10.904 | 10.888 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 10.888 | 0.998 | 0.016 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| 110ebd71d9bf73ed00000000000678de | 10.902 | 10.884 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 10.884 | 0.998 | 0.018 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| e5cfaa781c3347b2000000000010cc8b | 9.790 | 9.787 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 9.787 | 1.000 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.062ms; replica.apply-delta 0.026ms |
| e5cfaa781c3347b2000000000010cc8c | 9.787 | 9.775 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 9.775 | 0.999 | 0.012 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.062ms; replica.apply-delta 0.026ms |
| e5cfaa781c3347b2000000000010cc8d | 9.785 | 9.772 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 9.772 | 0.999 | 0.012 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.062ms; replica.apply-delta 0.026ms |
| e5cfaa781c3347b2000000000010cc8e | 9.783 | 9.770 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 9.770 | 0.999 | 0.013 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.062ms; replica.apply-delta 0.026ms |
| e5cfaa781c3347b2000000000010cc8f | 9.781 | 9.767 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 9.767 | 0.999 | 0.014 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.062ms; replica.apply-delta 0.026ms |
| e5cfaa781c3347b2000000000010cc93 | 9.688 | 9.673 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 9.673 | 0.998 | 0.015 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.062ms; replica.apply-delta 0.026ms |
| c9fcaa72127bcdb1000000000006a918 | 9.365 | 9.361 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 9.361 | 1.000 | 0.004 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.032ms; replica.apply-delta 0.021ms |
| c9fcaa72127bcdb1000000000006a919 | 9.363 | 9.351 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 9.351 | 0.999 | 0.012 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.032ms; replica.apply-delta 0.021ms |
| c9fcaa72127bcdb1000000000006a91a | 9.361 | 9.347 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 9.347 | 0.999 | 0.013 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.032ms; replica.apply-delta 0.021ms |
| c9fcaa72127bcdb1000000000006a91b | 9.358 | 9.344 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 9.344 | 0.998 | 0.014 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.032ms; replica.apply-delta 0.021ms |
| c9fcaa72127bcdb1000000000006a91d | 9.281 | 9.266 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 9.266 | 0.998 | 0.015 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.032ms; replica.apply-delta 0.021ms |
| bbeca4aa24d97c840000000000000183 | 6.588 | 6.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.569 | 0.997 | 0.019 | node-14/thread-6/replica.pull-at | none observed |

## P1 / outside-phases / read (12 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.208 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 |
| p99 | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c9fcaa72127bcdb1000000000006a9ed | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | uncovered | none observed |
| c9fcaa72127bcdb1000000000006a9ee | 0.322 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 | uncovered | none observed |
| 110ebd71d9bf73ed0000000000067af7 | 0.310 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 | uncovered | none observed |
| 110ebd71d9bf73ed0000000000067af8 | 0.238 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | uncovered | none observed |
| 110ebd71d9bf73ed0000000000067af9 | 0.225 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | uncovered | none observed |
| e5cfaa781c3347b2000000000010ce22 | 0.210 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | uncovered | none observed |
| 110ebd71d9bf73ed0000000000067afa | 0.208 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | uncovered | none observed |
| e5cfaa781c3347b2000000000010ce23 | 0.201 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | uncovered | none observed |
| 110ebd71d9bf73ed0000000000067afb | 0.181 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | uncovered | none observed |
| c9fcaa72127bcdb1000000000006a9ef | 0.100 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | uncovered | none observed |
| c9fcaa72127bcdb1000000000006a9f0 | 0.087 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | uncovered | none observed |
| c9fcaa72127bcdb1000000000006a9f1 | 0.055 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 0.000 | 0.000 | 0.055 | uncovered | none observed |

## P1 / baseline / read (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.095 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 |
| p99 | 0.095 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 110ebd71d9bf73ed000000000000c26c | 0.095 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | uncovered | none observed |

## P3 / outside-phases / read (35 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.965 | 0.000 | n/a | 0.000 | 0.000 | 3.886 | 197.786 | 0.019 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 |
| p99 | 203.781 | 4.774 | n/a | 0.000 | 0.000 | 6.724 | 198.484 | 3.842 | 23.447 | 0.791 | 0.000 | n/a | n/a | 0.630 | 4.774 | 0.064 | 0.630 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000007 | 203.781 | 0.000 | n/a | 0.000 | 0.000 | 5.145 | 198.265 | 0.022 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc000000000000000a6 | 203.031 | 0.000 | n/a | 0.000 | 0.000 | 4.110 | 198.092 | 0.026 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.630 | 0.000 | 0.000 | 0.630 | gw-r/thread-52/journal/page | none observed |
| 6f43bf909ea70fc0000000000000009e | 202.930 | 0.000 | n/a | 0.000 | 0.000 | 4.176 | 198.429 | 0.024 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc00000000000000079 | 202.824 | 0.000 | n/a | 0.000 | 0.000 | 3.977 | 198.484 | 0.034 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-52/journal/page | none observed |
| 6f43bf909ea70fc00000000000000005 | 202.734 | 0.000 | n/a | 0.000 | 0.000 | 3.911 | 198.336 | 0.019 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc000000000000000ce | 202.679 | 0.000 | n/a | 0.000 | 0.000 | 3.886 | 198.341 | 0.042 | 0.000 | 0.262 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc0000000000000007c | 202.618 | 0.000 | n/a | 0.000 | 0.000 | 3.843 | 198.419 | 0.056 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc00000000000000006 | 202.527 | 0.000 | n/a | 0.000 | 0.000 | 3.886 | 198.264 | 0.019 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc0000000000000005e | 202.441 | 0.000 | n/a | 0.000 | 0.000 | 3.980 | 198.149 | 0.017 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc00000000000000061 | 202.382 | 0.000 | n/a | 0.000 | 0.000 | 3.895 | 198.228 | 0.017 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc00000000000000052 | 202.245 | 0.000 | n/a | 0.000 | 0.000 | 3.864 | 198.088 | 0.023 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-70/journal/page | none observed |
| 6f43bf909ea70fc000000000000000cf | 202.208 | 0.000 | n/a | 0.000 | 0.000 | 3.841 | 198.075 | 0.027 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000cc | 202.196 | 0.000 | n/a | 0.000 | 0.000 | 3.875 | 198.084 | 0.015 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc000000000000000cd | 202.164 | 0.000 | n/a | 0.000 | 0.000 | 3.928 | 197.872 | 0.022 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000a4 | 202.071 | 0.000 | n/a | 0.000 | 0.000 | 3.839 | 198.021 | 0.015 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 6f43bf909ea70fc000000000000000a3 | 202.046 | 0.000 | n/a | 0.000 | 0.000 | 3.974 | 197.765 | 0.016 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000a5 | 201.992 | 0.000 | n/a | 0.000 | 0.000 | 3.821 | 197.904 | 0.021 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000a1 | 201.965 | 0.000 | n/a | 0.000 | 0.000 | 3.860 | 197.786 | 0.057 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc0000000000000009f | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 3.900 | 197.841 | 0.013 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc0000000000000007d | 201.857 | 0.000 | n/a | 0.000 | 0.000 | 3.881 | 197.728 | 0.017 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-70/journal/page | none observed |

## P3 / outside-phases / internal (18 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 566.594 | 2.780 | n/a | 0.000 | 0.000 | 3.987 | 560.267 | 0.025 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.178 | 2.780 | 0.006 | 0.178 |
| p99 | 1011.595 | 82.481 | n/a | 4.071 | 0.000 | 10.527 | 998.739 | 3.353 | 15.368 | 0.168 | 0.000 | n/a | n/a | 19.016 | 86.552 | 0.875 | 19.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000017 | 1011.595 | 0.170 | n/a | 0.000 | 0.000 | 10.527 | 984.076 | 0.047 | 15.368 | 0.148 | 0.000 | n/a | n/a | 1.258 | 0.170 | 0.000 | 1.258 | gw-r/thread-53/journal/page | none observed |
| a1b9960c916c04a50000000000000019 | 1004.243 | 0.222 | n/a | 0.000 | 0.000 | 4.008 | 998.739 | 0.011 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.175 | 0.222 | 0.000 | 1.175 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a50000000000000052 | 1004.053 | 0.229 | n/a | 0.000 | 0.000 | 3.989 | 998.568 | 0.020 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.126 | 0.229 | 0.000 | 1.126 | gw-r/thread-49/journal/page | none observed |
| a1b9960c916c04a50000000000000099 | 1003.852 | 0.238 | n/a | 0.000 | 0.000 | 3.994 | 998.376 | 0.019 | 0.000 | 0.095 | 0.000 | n/a | n/a | 1.130 | 0.238 | 0.000 | 1.130 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000018 | 1003.814 | 0.132 | n/a | 0.000 | 0.000 | 3.780 | 998.179 | 0.022 | 0.000 | 0.168 | 0.000 | n/a | n/a | 1.532 | 0.132 | 0.000 | 1.532 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a5000000000000004d | 992.334 | 6.161 | n/a | 0.000 | 0.000 | 5.579 | 980.289 | 0.028 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.183 | 6.161 | 0.006 | 0.183 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000081 | 977.142 | 3.430 | n/a | 0.000 | 0.000 | 3.984 | 969.553 | 0.033 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.062 | 3.430 | 0.004 | 0.062 | gw-r/thread-70/journal/page | none observed |
| a1b9960c916c04a5000000000000005d | 618.514 | 13.710 | n/a | 0.000 | 0.000 | 3.987 | 586.771 | 0.035 | 13.638 | 0.133 | 0.000 | n/a | n/a | 0.241 | 13.710 | 0.022 | 0.241 | gw-r/thread-47/journal/page | none observed |
| a1b9960c916c04a50000000000000050 | 604.839 | 2.429 | n/a | 0.000 | 0.000 | 3.868 | 598.287 | 0.034 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.101 | 2.429 | 0.004 | 0.101 | gw-r/thread-69/journal/page | none observed |
| a1b9960c916c04a50000000000000061 | 566.594 | 2.004 | n/a | 0.000 | 0.000 | 3.858 | 560.267 | 0.155 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.178 | 2.004 | 0.004 | 0.178 | gw-r/thread-52/journal/page | none observed |
| a1b9960c916c04a5000000000000007e | 470.402 | 2.832 | n/a | 0.000 | 0.000 | 4.529 | 462.868 | 0.025 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.072 | 2.832 | 0.006 | 0.072 | gw-r/thread-49/journal/page | none observed |
| a1b9960c916c04a5000000000000007f | 334.153 | 2.344 | n/a | 0.000 | 0.000 | 3.875 | 327.724 | 0.037 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.061 | 2.344 | 0.007 | 0.061 | gw-r/thread-53/journal/page | none observed |
| a1b9960c916c04a50000000000000082 | 295.742 | 4.063 | n/a | 0.000 | 0.000 | 3.996 | 287.538 | 0.012 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.063 | 4.063 | 0.014 | 0.063 | gw-r/thread-53/journal/page | none observed |
| a1b9960c916c04a50000000000000063 | 202.724 | 5.247 | n/a | 0.000 | 0.000 | 4.031 | 189.845 | 3.353 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.152 | 5.247 | 0.026 | 0.152 | gw-r/thread-70/journal/page | none observed |
| a1b9960c916c04a5000000000000005b | 106.766 | 82.481 | n/a | 4.071 | 0.000 | 1.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.016 | 86.552 | 0.811 | 19.016 | node-14/thread-2/replica.fetch-feed | none observed |
| a1b9960c916c04a5000000000000007d | 94.673 | 79.371 | n/a | 3.510 | 0.000 | 0.732 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 11.060 | 82.881 | 0.875 | 11.060 | node-14/thread-2/replica.fetch-feed | none observed |
| a1b9960c916c04a5000000000000005c | 91.047 | 2.780 | n/a | 0.000 | 0.000 | 3.841 | 84.302 | 0.020 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.066 | 2.780 | 0.031 | 0.066 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000060 | 77.913 | 4.687 | n/a | 0.000 | 0.000 | 4.657 | 67.899 | 0.472 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.141 | 4.687 | 0.060 | 0.141 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 273.443 | 5.683 | n/a | 0.000 | 0.000 | 4.003 | 262.605 | 0.025 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.284 | 5.683 | 0.017 | 0.284 |
| p99 | 706.043 | 20.061 | n/a | 0.813 | 0.000 | 16.922 | 699.542 | 0.027 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.843 | 20.873 | 0.076 | 0.843 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000001d | 706.043 | 2.354 | n/a | 0.000 | 0.000 | 3.875 | 699.542 | 0.021 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.164 | 2.354 | 0.003 | 0.164 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a5000000000000001b | 499.952 | 8.330 | n/a | 0.000 | 0.000 | 16.922 | 474.277 | 0.027 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.284 | 8.330 | 0.017 | 0.284 | gw-r/thread-49/journal/page | none observed |
| a1b9960c916c04a5000000000000001a | 273.443 | 20.061 | n/a | 0.813 | 0.000 | 4.259 | 247.339 | 0.026 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.843 | 20.873 | 0.076 | 0.843 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a5000000000000001e | 272.847 | 5.683 | n/a | 0.000 | 0.000 | 4.003 | 262.605 | 0.025 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.384 | 5.683 | 0.021 | 0.384 | gw-r/thread-49/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 227.706 | 3.632 | n/a | 0.000 | 0.000 | 3.902 | 218.152 | 0.014 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.162 | 3.632 | 0.005 | 0.162 |
| p99 | 933.472 | 5.193 | n/a | 0.000 | 0.000 | 4.062 | 924.922 | 0.051 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.203 | 5.193 | 0.037 | 0.203 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000023 | 933.472 | 4.279 | n/a | 0.000 | 0.000 | 3.902 | 924.922 | 0.051 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.162 | 4.279 | 0.005 | 0.162 | gw-r/thread-70/journal/page | none observed |
| a1b9960c916c04a50000000000000020 | 751.983 | 3.632 | n/a | 0.000 | 0.000 | 3.980 | 744.149 | 0.014 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.136 | 3.632 | 0.005 | 0.136 | gw-r/thread-49/journal/page | none observed |
| a1b9960c916c04a50000000000000021 | 227.706 | 5.193 | n/a | 0.000 | 0.000 | 4.062 | 218.152 | 0.018 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.203 | 5.193 | 0.023 | 0.203 | gw-r/thread-68/journal/page | none observed |
| a1b9960c916c04a50000000000000024 | 82.235 | 3.068 | n/a | 0.000 | 0.000 | 3.879 | 75.024 | 0.013 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.177 | 3.068 | 0.037 | 0.177 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 775.568 | 3.472 | n/a | 0.000 | 0.000 | 3.839 | 769.029 | 0.027 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.089 | 3.472 | 0.003 | 0.089 |
| p99 | 996.888 | 6.543 | n/a | 0.000 | 0.000 | 4.889 | 989.354 | 0.056 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.162 | 6.543 | 0.030 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000029 | 996.888 | 3.472 | n/a | 0.000 | 0.000 | 3.794 | 989.354 | 0.027 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.089 | 3.472 | 0.003 | 0.089 | gw-r/thread-70/journal/page | none observed |
| a1b9960c916c04a50000000000000027 | 775.568 | 2.428 | n/a | 0.000 | 0.000 | 3.839 | 769.029 | 0.056 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.080 | 2.428 | 0.003 | 0.080 | gw-r/thread-49/journal/page | none observed |
| a1b9960c916c04a50000000000000026 | 217.682 | 6.543 | n/a | 0.000 | 0.000 | 4.889 | 205.955 | 0.027 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.162 | 6.543 | 0.030 | 0.162 | gw-r/thread-70/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 402.965 | 5.292 | n/a | 0.000 | 0.000 | 3.919 | 393.269 | 0.021 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.099 | 5.292 | 0.011 | 0.099 |
| p99 | 982.328 | 16.184 | n/a | 0.000 | 0.000 | 4.646 | 966.614 | 0.028 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.367 | 16.184 | 0.101 | 0.367 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000002f | 982.328 | 10.935 | n/a | 0.000 | 0.000 | 4.646 | 966.614 | 0.012 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.087 | 10.935 | 0.011 | 0.087 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a5000000000000002d | 476.879 | 2.769 | n/a | 0.000 | 0.000 | 4.070 | 469.815 | 0.021 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.099 | 2.769 | 0.006 | 0.099 | gw-r/thread-47/journal/page | none observed |
| a1b9960c916c04a5000000000000002c | 402.965 | 5.292 | n/a | 0.000 | 0.000 | 3.914 | 393.269 | 0.028 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.367 | 5.292 | 0.013 | 0.367 | gw-r/thread-70/journal/page | none observed |
| a1b9960c916c04a5000000000000002a | 160.745 | 16.184 | n/a | 0.000 | 0.000 | 3.919 | 140.306 | 0.023 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.183 | 16.184 | 0.101 | 0.183 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 340.616 | 3.360 | n/a | 0.000 | 0.000 | 3.843 | 332.948 | 0.019 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.223 | 3.360 | 0.005 | 0.223 |
| p99 | 988.179 | 5.969 | n/a | 0.000 | 0.000 | 3.886 | 981.358 | 0.047 | 0.000 | 0.109 | 0.000 | n/a | n/a | 47.600 | 5.969 | 0.110 | 47.600 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000030 | 988.179 | 2.710 | n/a | 0.000 | 0.000 | 3.886 | 981.358 | 0.022 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.095 | 2.710 | 0.003 | 0.095 | gw-r/thread-47/journal/page | none observed |
| a1b9960c916c04a50000000000000035 | 645.899 | 3.360 | n/a | 0.000 | 0.000 | 3.882 | 637.597 | 0.047 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.942 | 3.360 | 0.005 | 0.942 | gw-r/thread-47/journal/page | none observed |
| a1b9960c916c04a50000000000000031 | 340.616 | 3.503 | n/a | 0.000 | 0.000 | 3.843 | 332.948 | 0.019 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.223 | 3.503 | 0.010 | 0.223 | gw-r/thread-70/journal/page | none observed |
| a1b9960c916c04a50000000000000033 | 54.183 | 5.969 | n/a | 0.000 | 0.000 | 0.614 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 47.600 | 5.969 | 0.110 | 47.600 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 285.916 | 3.525 | n/a | 0.000 | 0.000 | 3.894 | 278.148 | 0.025 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.105 | 3.525 | 0.010 | 0.105 |
| p99 | 761.642 | 16.285 | n/a | 4.166 | 0.000 | 4.713 | 734.576 | 2.474 | 16.952 | 0.231 | 0.000 | n/a | n/a | 0.186 | 20.451 | 0.027 | 0.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000036 | 761.642 | 16.285 | n/a | 4.166 | 0.000 | 3.885 | 734.576 | 2.474 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.186 | 20.451 | 0.027 | 0.186 | gw-r/thread-69/journal/page | none observed |
| a1b9960c916c04a5000000000000003a | 687.467 | 6.218 | n/a | 0.000 | 0.000 | 4.026 | 660.130 | 0.029 | 16.952 | 0.000 | 0.000 | n/a | n/a | 0.112 | 6.218 | 0.009 | 0.112 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000038 | 285.916 | 3.525 | n/a | 0.000 | 0.000 | 3.894 | 278.148 | 0.025 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.094 | 3.525 | 0.012 | 0.094 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a50000000000000039 | 249.901 | 2.473 | n/a | 0.000 | 0.000 | 4.713 | 242.504 | 0.017 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.105 | 2.473 | 0.010 | 0.105 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 303.095 | 3.071 | n/a | 0.000 | 0.000 | 4.028 | 296.465 | 0.024 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.130 | 3.071 | 0.008 | 0.130 |
| p99 | 683.940 | 3.939 | n/a | 0.000 | 0.000 | 4.073 | 676.619 | 2.027 | 10.145 | 0.118 | 0.000 | n/a | n/a | 0.151 | 3.939 | 0.015 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000003e | 683.940 | 2.931 | n/a | 0.000 | 0.000 | 4.073 | 676.619 | 0.071 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.132 | 2.931 | 0.004 | 0.132 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a5000000000000003f | 527.964 | 3.071 | n/a | 0.000 | 0.000 | 3.887 | 520.771 | 0.016 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.128 | 3.071 | 0.006 | 0.128 | gw-r/thread-68/journal/page | none observed |
| a1b9960c916c04a5000000000000003c | 303.095 | 2.368 | n/a | 0.000 | 0.000 | 4.050 | 296.465 | 0.024 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.106 | 2.368 | 0.008 | 0.106 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a50000000000000042 | 283.762 | 3.200 | n/a | 0.000 | 0.000 | 4.028 | 264.128 | 2.027 | 10.145 | 0.083 | 0.000 | n/a | n/a | 0.151 | 3.200 | 0.011 | 0.151 | gw-r/thread-68/journal/page | none observed |
| a1b9960c916c04a50000000000000040 | 266.480 | 3.939 | n/a | 0.000 | 0.000 | 3.977 | 258.294 | 0.023 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.130 | 3.939 | 0.015 | 0.130 | gw-r/thread-69/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 912.681 | 2.157 | n/a | 0.000 | 0.000 | 4.066 | 900.566 | 0.018 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.101 | 2.157 | 0.002 | 0.101 |
| p99 | 1009.132 | 6.790 | n/a | 0.000 | 0.000 | 5.176 | 998.206 | 0.042 | 0.000 | 0.106 | 0.000 | n/a | n/a | 4.554 | 6.790 | 0.007 | 4.554 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000045 | 1009.132 | 2.157 | n/a | 0.000 | 0.000 | 4.066 | 998.206 | 0.042 | 0.000 | 0.106 | 0.000 | n/a | n/a | 4.554 | 2.157 | 0.002 | 4.554 | gw-r/thread-47/journal/page | none observed |
| a1b9960c916c04a50000000000000044 | 912.681 | 6.790 | n/a | 0.000 | 0.000 | 5.176 | 900.566 | 0.018 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.101 | 6.790 | 0.007 | 0.101 | gw-r/thread-47/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.818 | 3.577 | n/a | 0.000 | 0.000 | 3.940 | 319.391 | 0.040 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.159 | 3.577 | 0.009 | 0.159 |
| p99 | 955.131 | 5.697 | n/a | 0.000 | 0.000 | 5.263 | 944.563 | 4.046 | 0.000 | 0.159 | 0.000 | n/a | n/a | 47.246 | 5.697 | 0.070 | 47.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000047 | 955.131 | 5.443 | n/a | 0.000 | 0.000 | 3.940 | 944.563 | 0.022 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.080 | 5.443 | 0.006 | 1.080 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a5000000000000004a | 397.345 | 2.313 | n/a | 0.000 | 0.000 | 3.859 | 386.905 | 4.046 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.103 | 2.313 | 0.006 | 0.103 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000048 | 326.818 | 3.063 | n/a | 0.000 | 0.000 | 4.075 | 319.391 | 0.040 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.128 | 3.063 | 0.009 | 0.128 | gw-r/thread-53/journal/page | none observed |
| a1b9960c916c04a5000000000000004c | 253.757 | 5.697 | n/a | 0.000 | 0.000 | 5.263 | 242.427 | 0.052 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.159 | 5.697 | 0.022 | 0.159 | gw-r/thread-52/journal/page | none observed |
| a1b9960c916c04a50000000000000046 | 51.257 | 3.577 | n/a | 0.000 | 0.000 | 0.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 47.246 | 3.577 | 0.070 | 47.246 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 414.600 | 2.206 | n/a | 0.000 | 0.000 | 3.825 | 402.390 | 0.009 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.091 | 2.206 | 0.002 | 0.091 |
| p99 | 988.254 | 8.079 | n/a | 0.000 | 0.000 | 3.850 | 982.104 | 0.022 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.174 | 8.079 | 0.019 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000004e | 988.254 | 2.206 | n/a | 0.000 | 0.000 | 3.825 | 982.104 | 0.009 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.091 | 2.206 | 0.002 | 0.091 | gw-r/thread-47/journal/page | none observed |
| a1b9960c916c04a5000000000000004f | 414.600 | 8.079 | n/a | 0.000 | 0.000 | 3.850 | 402.390 | 0.022 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.174 | 8.079 | 0.019 | 0.174 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 718.796 | 2.223 | n/a | 0.000 | 0.000 | 3.922 | 709.136 | 0.020 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.089 | 2.223 | 0.008 | 0.089 |
| p99 | 902.483 | 5.537 | n/a | 0.000 | 0.000 | 3.957 | 896.162 | 2.608 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.150 | 5.537 | 0.028 | 0.150 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000054 | 902.483 | 2.223 | n/a | 0.000 | 0.000 | 3.922 | 896.162 | 0.020 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.082 | 2.223 | 0.002 | 0.082 | gw-r/thread-67/journal/page | none observed |
| a1b9960c916c04a50000000000000055 | 718.796 | 5.537 | n/a | 0.000 | 0.000 | 3.890 | 709.136 | 0.014 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.150 | 5.537 | 0.008 | 0.150 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000053 | 79.311 | 2.216 | n/a | 0.000 | 0.000 | 3.957 | 70.390 | 2.608 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.089 | 2.216 | 0.028 | 0.089 | gw-r/thread-54/journal/page | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 302.755 | 3.093 | n/a | 0.000 | 0.000 | 3.868 | 295.375 | 0.020 | 16.160 | 0.096 | 0.000 | n/a | n/a | 0.098 | 3.093 | 0.017 | 0.098 |
| p99 | 936.383 | 103.927 | n/a | 8.911 | 0.000 | 3.884 | 800.139 | 0.211 | 17.081 | 0.106 | 0.000 | n/a | n/a | 3.426 | 112.839 | 0.121 | 3.426 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000005a | 936.383 | 103.927 | n/a | 8.911 | 0.000 | 3.703 | 800.139 | 0.020 | 16.160 | 0.096 | 0.000 | n/a | n/a | 3.426 | 112.839 | 0.121 | 3.426 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a50000000000000056 | 302.755 | 3.093 | n/a | 0.000 | 0.000 | 3.884 | 295.375 | 0.211 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.086 | 3.093 | 0.010 | 0.086 | gw-r/thread-67/journal/page | none observed |
| a1b9960c916c04a50000000000000058 | 136.564 | 2.369 | n/a | 0.000 | 0.000 | 3.868 | 113.125 | 0.008 | 17.081 | 0.015 | 0.000 | n/a | n/a | 0.098 | 2.369 | 0.017 | 0.098 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 243.794 | 3.180 | n/a | 0.000 | 0.000 | 3.885 | 237.427 | 0.021 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.118 | 3.180 | 0.015 | 0.118 |
| p99 | 637.640 | 76.501 | n/a | 4.123 | 0.000 | 4.589 | 536.902 | 0.152 | 13.449 | 0.112 | 0.000 | n/a | n/a | 48.563 | 80.624 | 0.126 | 48.563 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000074 | 637.640 | 76.501 | n/a | 4.123 | 0.000 | 3.919 | 536.902 | 0.009 | 13.449 | 0.031 | 0.000 | n/a | n/a | 2.705 | 80.624 | 0.126 | 2.705 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a50000000000000071 | 521.528 | 8.541 | n/a | 0.000 | 0.000 | 4.137 | 508.539 | 0.046 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.159 | 8.541 | 0.016 | 0.159 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a50000000000000073 | 477.516 | 5.313 | n/a | 0.000 | 0.000 | 4.087 | 467.889 | 0.034 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.081 | 5.313 | 0.011 | 0.081 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a50000000000000067 | 311.870 | 4.765 | n/a | 0.000 | 0.000 | 3.853 | 302.926 | 0.038 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.182 | 4.765 | 0.015 | 0.182 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a50000000000000069 | 264.846 | 3.180 | n/a | 0.000 | 0.000 | 4.589 | 256.735 | 0.152 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.118 | 3.180 | 0.012 | 0.118 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a50000000000000065 | 243.794 | 2.314 | n/a | 0.000 | 0.000 | 3.885 | 237.427 | 0.021 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.067 | 2.314 | 0.009 | 0.067 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a5000000000000006f | 180.015 | 2.487 | n/a | 0.000 | 0.000 | 4.015 | 173.291 | 0.021 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.109 | 2.487 | 0.014 | 0.109 | gw-r/thread-52/journal/page | none observed |
| a1b9960c916c04a50000000000000066 | 163.976 | 3.445 | n/a | 0.000 | 0.000 | 3.866 | 156.462 | 0.022 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.071 | 3.445 | 0.021 | 0.071 | gw-r/thread-53/journal/page | none observed |
| a1b9960c916c04a5000000000000006d | 50.464 | 1.627 | n/a | 0.000 | 0.000 | 0.273 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 48.563 | 1.627 | 0.032 | 48.563 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a5000000000000006b | 22.820 | 2.237 | n/a | 0.000 | 0.000 | 0.473 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 20.111 | 2.237 | 0.098 | 20.111 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 159.386 | 98.847 | n/a | 3.458 | 0.000 | 1.166 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.834 | 104.371 | 0.671 | 21.834 |
| p99 | 760.423 | 129.190 | n/a | 7.889 | 0.000 | 6.683 | 643.998 | 1.680 | 0.000 | 0.099 | 0.000 | n/a | n/a | 44.083 | 135.661 | 0.851 | 44.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000007a | 760.423 | 102.103 | n/a | 3.458 | 0.000 | 6.683 | 643.998 | 1.680 | 0.000 | 0.099 | 0.000 | n/a | n/a | 2.403 | 105.561 | 0.139 | 2.403 | gw-r/thread-54/journal/page | none observed |
| a1b9960c916c04a5000000000000007b | 199.551 | 98.847 | n/a | 5.524 | 0.000 | 4.626 | 87.341 | 0.836 | 0.000 | 0.067 | 0.000 | n/a | n/a | 2.309 | 104.371 | 0.523 | 2.309 | node-14/thread-2/replica.fetch-feed | none observed |
| a1b9960c916c04a50000000000000075 | 173.932 | 129.190 | n/a | 4.671 | 0.000 | 0.990 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 39.080 | 133.861 | 0.770 | 39.080 | node-14/thread-2/replica.fetch-feed | none observed |
| a1b9960c916c04a50000000000000076 | 159.386 | 127.772 | n/a | 7.889 | 0.000 | 1.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.834 | 135.661 | 0.851 | 21.834 | node-14/thread-2/replica.fetch-feed | none observed |
| a1b9960c916c04a5000000000000007c | 139.664 | 91.103 | n/a | 3.312 | 0.000 | 1.166 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 44.083 | 94.415 | 0.676 | 44.083 | node-14/thread-2/replica.fetch-feed | none observed |
| a1b9960c916c04a50000000000000079 | 36.657 | 5.055 | n/a | 0.000 | 0.000 | 0.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 31.197 | 5.055 | 0.138 | 31.197 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000077 | 10.966 | 7.355 | n/a | 0.000 | 0.000 | 0.383 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.227 | 7.355 | 0.671 | 3.227 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.469 | 2.295 | n/a | 0.000 | 0.000 | 3.961 | 409.389 | 0.117 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.054 | 2.295 | 0.008 | 0.054 |
| p99 | 982.494 | 13.859 | n/a | 0.774 | 0.000 | 4.188 | 975.937 | 0.163 | 0.000 | 0.086 | 0.000 | n/a | n/a | 1.134 | 14.634 | 0.596 | 1.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000089 | 982.494 | 2.331 | n/a | 0.000 | 0.000 | 3.961 | 975.937 | 0.144 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.054 | 2.331 | 0.002 | 0.054 | gw-r/thread-67/journal/page | none observed |
| a1b9960c916c04a5000000000000008a | 570.502 | 2.141 | n/a | 0.000 | 0.000 | 4.188 | 563.897 | 0.163 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.052 | 2.141 | 0.004 | 0.052 | gw-r/thread-69/journal/page | none observed |
| a1b9960c916c04a50000000000000083 | 428.469 | 13.859 | n/a | 0.774 | 0.000 | 4.101 | 409.389 | 0.017 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.257 | 14.634 | 0.034 | 0.257 | gw-r/thread-69/journal/page | none observed |
| a1b9960c916c04a50000000000000087 | 294.150 | 2.295 | n/a | 0.000 | 0.000 | 3.883 | 287.718 | 0.117 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.052 | 2.295 | 0.008 | 0.052 | gw-r/thread-53/journal/page | none observed |
| a1b9960c916c04a50000000000000085 | 3.483 | 2.075 | n/a | 0.000 | 0.000 | 0.275 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.134 | 2.075 | 0.596 | 1.134 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / presweep / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 424.945 | 2.500 | n/a | 0.000 | 0.000 | 4.035 | 418.360 | 0.025 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.100 | 2.500 | 0.006 | 0.100 |
| p99 | 722.725 | 16.301 | n/a | 0.000 | 0.000 | 10.333 | 715.949 | 0.029 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.135 | 16.301 | 0.028 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a5000000000000008d | 722.725 | 2.500 | n/a | 0.000 | 0.000 | 4.035 | 715.949 | 0.025 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.090 | 2.500 | 0.003 | 0.090 | gw-r/thread-50/journal/page | none observed |
| a1b9960c916c04a50000000000000090 | 582.584 | 16.301 | n/a | 0.000 | 0.000 | 10.333 | 555.696 | 0.026 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.123 | 16.301 | 0.028 | 0.123 | gw-r/thread-52/journal/page | none observed |
| a1b9960c916c04a5000000000000008c | 424.945 | 2.413 | n/a | 0.000 | 0.000 | 3.963 | 418.360 | 0.029 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.100 | 2.413 | 0.006 | 0.100 | gw-r/thread-51/journal/page | none observed |
| a1b9960c916c04a5000000000000008e | 274.095 | 4.000 | n/a | 0.000 | 0.000 | 7.367 | 262.505 | 0.016 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.135 | 4.000 | 0.015 | 0.135 | gw-r/thread-52/journal/page | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.942 | 2.554 | n/a | 0.000 | 0.000 | 0.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.981 | 2.554 | 0.244 | 7.981 |
| p99 | 19.317 | 5.774 | n/a | 0.000 | 0.000 | 0.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 13.148 | 5.774 | 0.452 | 13.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a1b9960c916c04a50000000000000096 | 19.317 | 5.774 | n/a | 0.000 | 0.000 | 0.394 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 13.148 | 5.774 | 0.299 | 13.148 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000092 | 17.729 | 5.152 | n/a | 0.000 | 0.000 | 0.390 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.188 | 5.152 | 0.291 | 12.188 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000093 | 12.223 | 2.554 | n/a | 0.000 | 0.000 | 0.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.307 | 2.554 | 0.209 | 9.307 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000098 | 11.033 | 2.697 | n/a | 0.000 | 0.000 | 0.310 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 8.026 | 2.697 | 0.244 | 8.026 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000095 | 9.942 | 1.667 | n/a | 0.000 | 0.000 | 0.294 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.981 | 1.667 | 0.168 | 7.981 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000097 | 9.562 | 1.730 | n/a | 0.000 | 0.000 | 0.396 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.436 | 1.730 | 0.181 | 7.436 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000091 | 5.823 | 2.635 | n/a | 0.000 | 0.000 | 0.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.709 | 2.635 | 0.452 | 2.709 | node-14/thread-2/socket.wait-first-byte | none observed |
| a1b9960c916c04a50000000000000094 | 5.700 | 1.886 | n/a | 0.000 | 0.000 | 0.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.489 | 1.886 | 0.331 | 3.489 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.323 | 0.000 | n/a | 0.000 | 0.000 | 3.985 | 199.055 | 0.023 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 206.071 | 0.000 | n/a | 0.000 | 0.000 | 4.221 | 201.527 | 1.702 | 0.000 | 0.257 | 0.000 | n/a | n/a | 0.377 | 0.000 | 0.000 | 0.377 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc0000000000000000a | 206.071 | 0.000 | n/a | 0.000 | 0.000 | 4.128 | 201.527 | 0.026 | 0.000 | 0.242 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000008 | 205.635 | 0.000 | n/a | 0.000 | 0.000 | 3.985 | 201.382 | 0.015 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000011 | 204.057 | 0.000 | n/a | 0.000 | 0.000 | 4.171 | 199.607 | 0.022 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc0000000000000000b | 203.760 | 0.000 | n/a | 0.000 | 0.000 | 3.989 | 199.055 | 0.083 | 0.000 | 0.257 | 0.000 | n/a | n/a | 0.377 | 0.000 | 0.000 | 0.377 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc0000000000000000f | 203.323 | 0.000 | n/a | 0.000 | 0.000 | 3.756 | 199.192 | 0.023 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc0000000000000000d | 202.796 | 0.000 | n/a | 0.000 | 0.000 | 3.858 | 198.562 | 0.023 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc0000000000000000e | 202.705 | 0.000 | n/a | 0.000 | 0.000 | 3.838 | 198.518 | 0.020 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000009 | 164.470 | 0.000 | n/a | 0.000 | 0.000 | 4.221 | 158.125 | 1.702 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | gw-r/thread-49/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 3.872 | 197.770 | 0.019 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 |
| p99 | 203.599 | 0.000 | n/a | 0.000 | 0.000 | 4.089 | 198.403 | 0.029 | 0.000 | 0.203 | 0.000 | n/a | n/a | 1.093 | 0.000 | 0.000 | 1.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000015 | 203.599 | 0.000 | n/a | 0.000 | 0.000 | 3.872 | 198.403 | 0.027 | 0.000 | 0.203 | 0.000 | n/a | n/a | 1.093 | 0.000 | 0.000 | 1.093 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc00000000000000013 | 202.732 | 0.000 | n/a | 0.000 | 0.000 | 4.089 | 198.238 | 0.019 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc00000000000000014 | 202.120 | 0.000 | n/a | 0.000 | 0.000 | 3.971 | 197.770 | 0.029 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000016 | 80.152 | 0.000 | n/a | 0.000 | 0.000 | 3.803 | 76.202 | 0.010 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-54/journal/page | none observed |

## P3 / L16 / read (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.814 | 0.000 | n/a | 0.000 | 0.000 | 3.873 | 198.998 | 0.058 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 204.746 | 0.630 | n/a | 0.000 | 0.000 | 6.369 | 200.447 | 6.846 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.173 | 0.630 | 0.003 | 0.173 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000021 | 204.746 | 0.000 | n/a | 0.000 | 0.000 | 3.857 | 200.447 | 0.058 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-70/journal/page | none observed |
| 6f43bf909ea70fc00000000000000022 | 203.814 | 0.630 | n/a | 0.000 | 0.000 | 3.873 | 198.998 | 0.024 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.113 | 0.630 | 0.003 | 0.113 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000023 | 203.282 | 0.000 | n/a | 0.000 | 0.000 | 6.369 | 189.865 | 6.846 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.641 | 0.000 | n/a | 0.000 | 0.000 | 3.928 | 199.379 | 0.064 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 |
| p99 | 217.916 | 0.000 | n/a | 0.000 | 0.000 | 5.260 | 213.172 | 7.287 | 0.000 | 0.382 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000024 | 217.916 | 0.000 | n/a | 0.000 | 0.000 | 4.073 | 213.172 | 0.065 | 0.000 | 0.382 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000028 | 207.280 | 0.000 | n/a | 0.000 | 0.000 | 3.940 | 202.875 | 0.064 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000025 | 206.911 | 0.000 | n/a | 0.000 | 0.000 | 5.260 | 201.341 | 0.024 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc0000000000000002d | 204.326 | 0.000 | n/a | 0.000 | 0.000 | 3.849 | 199.894 | 0.160 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-52/journal/page | none observed |
| 6f43bf909ea70fc0000000000000002c | 203.641 | 0.000 | n/a | 0.000 | 0.000 | 3.874 | 199.379 | 0.062 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000026 | 203.123 | 0.000 | n/a | 0.000 | 0.000 | 3.928 | 198.730 | 0.066 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc0000000000000002a | 202.560 | 0.000 | n/a | 0.000 | 0.000 | 4.021 | 198.196 | 0.025 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc0000000000000002e | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 3.862 | 198.109 | 0.018 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000029 | 74.473 | 0.000 | n/a | 0.000 | 0.000 | 3.872 | 63.155 | 7.287 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-68/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.790 | 0.000 | n/a | 0.000 | 0.000 | 3.940 | 198.385 | 0.023 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 |
| p99 | 207.629 | 0.000 | n/a | 0.000 | 0.000 | 4.623 | 202.065 | 8.606 | 10.145 | 0.185 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc0000000000000003b | 207.629 | 0.000 | n/a | 0.000 | 0.000 | 4.623 | 192.559 | 0.024 | 10.145 | 0.134 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000030 | 206.372 | 0.000 | n/a | 0.000 | 0.000 | 3.902 | 202.065 | 0.026 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000036 | 203.705 | 0.000 | n/a | 0.000 | 0.000 | 3.832 | 199.548 | 0.022 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc00000000000000032 | 203.257 | 0.000 | n/a | 0.000 | 0.000 | 4.003 | 198.842 | 0.023 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc00000000000000034 | 203.144 | 0.000 | n/a | 0.000 | 0.000 | 4.020 | 198.695 | 0.033 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000039 | 202.790 | 0.000 | n/a | 0.000 | 0.000 | 3.940 | 198.543 | 0.018 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc00000000000000033 | 202.622 | 0.000 | n/a | 0.000 | 0.000 | 4.172 | 198.203 | 0.016 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-70/journal/page | none observed |
| 6f43bf909ea70fc00000000000000037 | 202.563 | 0.000 | n/a | 0.000 | 0.000 | 3.828 | 198.385 | 0.019 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000038 | 74.634 | 0.000 | n/a | 0.000 | 0.000 | 4.249 | 68.695 | 1.312 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc00000000000000031 | 72.189 | 0.000 | n/a | 0.000 | 0.000 | 3.751 | 59.671 | 8.606 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.392 | 0.000 | n/a | 0.000 | 0.000 | 3.980 | 198.306 | 0.028 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 205.554 | 0.000 | n/a | 0.000 | 0.000 | 6.952 | 199.651 | 0.047 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000045 | 205.554 | 0.000 | n/a | 0.000 | 0.000 | 6.952 | 198.306 | 0.022 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000044 | 203.781 | 0.000 | n/a | 0.000 | 0.000 | 3.850 | 199.651 | 0.025 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc00000000000000040 | 203.542 | 0.000 | n/a | 0.000 | 0.000 | 3.980 | 199.193 | 0.045 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc00000000000000042 | 203.395 | 0.000 | n/a | 0.000 | 0.000 | 4.197 | 198.835 | 0.037 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc0000000000000003d | 203.392 | 0.000 | n/a | 0.000 | 0.000 | 3.856 | 199.269 | 0.047 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc0000000000000003f | 202.650 | 0.000 | n/a | 0.000 | 0.000 | 4.012 | 198.241 | 0.028 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000043 | 202.528 | 0.000 | n/a | 0.000 | 0.000 | 4.035 | 198.127 | 0.018 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc0000000000000003e | 202.373 | 0.000 | n/a | 0.000 | 0.000 | 3.876 | 198.215 | 0.033 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc00000000000000046 | 152.872 | 0.000 | n/a | 0.000 | 0.000 | 3.859 | 148.761 | 0.020 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-67/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.584 | 0.000 | n/a | 0.000 | 0.000 | 3.842 | 198.461 | 0.029 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 208.732 | 0.000 | n/a | 0.000 | 0.000 | 4.508 | 204.547 | 12.010 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc0000000000000004c | 208.732 | 0.000 | n/a | 0.000 | 0.000 | 3.801 | 204.547 | 0.062 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000050 | 203.439 | 0.000 | n/a | 0.000 | 0.000 | 4.508 | 198.518 | 0.044 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc0000000000000004e | 203.413 | 0.000 | n/a | 0.000 | 0.000 | 3.980 | 199.094 | 0.015 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000047 | 203.158 | 0.000 | n/a | 0.000 | 0.000 | 3.913 | 198.893 | 0.029 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc0000000000000004a | 202.668 | 0.000 | n/a | 0.000 | 0.000 | 3.842 | 198.461 | 0.056 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc00000000000000049 | 202.584 | 0.000 | n/a | 0.000 | 0.000 | 3.837 | 198.493 | 0.019 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000048 | 202.348 | 0.000 | n/a | 0.000 | 0.000 | 3.856 | 198.229 | 0.019 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc0000000000000004f | 153.597 | 0.000 | n/a | 0.000 | 0.000 | 3.814 | 149.571 | 0.028 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-52/journal/page | none observed |
| 6f43bf909ea70fc0000000000000004d | 97.355 | 0.000 | n/a | 0.000 | 0.000 | 3.839 | 81.320 | 12.010 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc0000000000000004b | 57.964 | 0.000 | n/a | 0.000 | 0.000 | 3.850 | 49.598 | 4.305 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-53/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.987 | 0.000 | n/a | 0.000 | 0.000 | 3.829 | 197.915 | 0.021 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 203.008 | 0.000 | n/a | 0.000 | 0.000 | 4.075 | 198.854 | 0.063 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000055 | 203.008 | 0.000 | n/a | 0.000 | 0.000 | 3.834 | 198.854 | 0.029 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc00000000000000059 | 202.767 | 0.000 | n/a | 0.000 | 0.000 | 3.815 | 198.607 | 0.063 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc00000000000000053 | 202.455 | 0.000 | n/a | 0.000 | 0.000 | 3.824 | 198.343 | 0.029 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc0000000000000005c | 202.298 | 0.000 | n/a | 0.000 | 0.000 | 3.827 | 198.167 | 0.044 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000057 | 202.053 | 0.000 | n/a | 0.000 | 0.000 | 3.840 | 197.950 | 0.029 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc00000000000000058 | 201.987 | 0.000 | n/a | 0.000 | 0.000 | 3.838 | 197.915 | 0.016 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000054 | 201.956 | 0.000 | n/a | 0.000 | 0.000 | 3.821 | 197.913 | 0.016 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc0000000000000005a | 201.865 | 0.000 | n/a | 0.000 | 0.000 | 3.829 | 197.811 | 0.018 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc0000000000000005b | 95.407 | 0.000 | n/a | 0.000 | 0.000 | 3.865 | 91.282 | 0.021 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-50/journal/page | none observed |
| 6f43bf909ea70fc00000000000000056 | 95.337 | 0.000 | n/a | 0.000 | 0.000 | 4.075 | 90.954 | 0.019 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h1 / read (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 3.846 | 198.176 | 0.017 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 202.974 | 0.000 | n/a | 0.000 | 0.000 | 3.992 | 198.890 | 0.026 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000068 | 202.974 | 0.000 | n/a | 0.000 | 0.000 | 3.812 | 198.890 | 0.022 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc00000000000000067 | 202.799 | 0.000 | n/a | 0.000 | 0.000 | 3.807 | 198.644 | 0.020 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000064 | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 3.856 | 198.529 | 0.025 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc0000000000000006c | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 3.992 | 198.356 | 0.017 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000069 | 202.542 | 0.000 | n/a | 0.000 | 0.000 | 3.980 | 198.176 | 0.017 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000062 | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 3.839 | 198.397 | 0.026 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc0000000000000006d | 202.064 | 0.000 | n/a | 0.000 | 0.000 | 3.868 | 197.926 | 0.014 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc00000000000000063 | 201.971 | 0.000 | n/a | 0.000 | 0.000 | 3.832 | 197.911 | 0.017 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc0000000000000006b | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 3.848 | 197.778 | 0.023 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc00000000000000066 | 201.663 | 0.000 | n/a | 0.000 | 0.000 | 3.846 | 197.570 | 0.017 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc00000000000000065 | 180.025 | 0.000 | n/a | 0.000 | 0.000 | 3.845 | 175.923 | 0.017 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-67/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.865 | 0.000 | n/a | 0.000 | 0.000 | 3.897 | 197.702 | 0.019 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 216.318 | 0.510 | n/a | 0.000 | 0.000 | 14.837 | 201.134 | 126.169 | 0.008 | 0.137 | 0.000 | n/a | n/a | 0.174 | 0.510 | 0.003 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000072 | 216.318 | 0.000 | n/a | 0.000 | 0.000 | 14.837 | 201.134 | 0.054 | 0.008 | 0.129 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000073 | 202.346 | 0.000 | n/a | 0.000 | 0.000 | 3.816 | 198.223 | 0.030 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000074 | 201.988 | 0.000 | n/a | 0.000 | 0.000 | 3.870 | 197.878 | 0.017 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc0000000000000006f | 201.865 | 0.000 | n/a | 0.000 | 0.000 | 3.913 | 197.702 | 0.019 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000075 | 156.821 | 0.510 | n/a | 0.000 | 0.000 | 3.712 | 26.208 | 126.169 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.129 | 0.510 | 0.003 | 0.129 | gw-r/thread-51/gateway.admission-wait | none observed |
| 6f43bf909ea70fc00000000000000071 | 111.848 | 0.000 | n/a | 0.000 | 0.000 | 3.897 | 107.711 | 0.016 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc00000000000000070 | 71.830 | 0.000 | n/a | 0.000 | 0.000 | 3.902 | 67.650 | 0.018 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.803 | 0.000 | n/a | 0.000 | 0.000 | 3.847 | 197.719 | 0.040 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 |
| p99 | 203.947 | 0.000 | n/a | 0.000 | 0.000 | 4.968 | 198.848 | 7.384 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc0000000000000008b | 203.947 | 0.000 | n/a | 0.000 | 0.000 | 4.849 | 198.696 | 0.084 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-70/journal/page | none observed |
| 6f43bf909ea70fc0000000000000008e | 202.973 | 0.000 | n/a | 0.000 | 0.000 | 3.822 | 198.848 | 0.093 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc0000000000000008d | 202.427 | 0.000 | n/a | 0.000 | 0.000 | 4.030 | 198.101 | 0.018 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-70/journal/page | none observed |
| 6f43bf909ea70fc00000000000000090 | 202.262 | 0.000 | n/a | 0.000 | 0.000 | 3.903 | 198.090 | 0.023 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc0000000000000008a | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 3.839 | 198.095 | 0.025 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000085 | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 3.818 | 198.041 | 0.040 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000083 | 201.803 | 0.000 | n/a | 0.000 | 0.000 | 3.847 | 197.719 | 0.018 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000080 | 201.635 | 0.000 | n/a | 0.000 | 0.000 | 3.822 | 197.596 | 0.013 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc00000000000000089 | 175.524 | 0.000 | n/a | 0.000 | 0.000 | 3.851 | 168.236 | 3.267 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc00000000000000082 | 160.316 | 0.000 | n/a | 0.000 | 0.000 | 3.938 | 156.063 | 0.087 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-67/journal/page | none observed |
| 6f43bf909ea70fc00000000000000084 | 80.978 | 0.000 | n/a | 0.000 | 0.000 | 3.838 | 74.900 | 2.089 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc0000000000000008c | 62.199 | 0.000 | n/a | 0.000 | 0.000 | 4.968 | 49.480 | 7.384 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-54/journal/page | none observed |

## P3 / grow10 / read (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 154.840 | 0.000 | n/a | 0.000 | 0.000 | 4.080 | 149.550 | 0.016 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 |
| p99 | 202.497 | 0.883 | n/a | 0.000 | 0.000 | 4.748 | 198.157 | 0.031 | 10.534 | 0.116 | 0.000 | n/a | n/a | 0.700 | 0.883 | 0.009 | 0.700 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc00000000000000091 | 202.497 | 0.000 | n/a | 0.000 | 0.000 | 4.080 | 198.132 | 0.016 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000098 | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 3.865 | 198.157 | 0.015 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc00000000000000097 | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 3.891 | 197.501 | 0.016 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc00000000000000099 | 189.259 | 0.000 | n/a | 0.000 | 0.000 | 3.926 | 184.508 | 0.031 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.700 | 0.000 | 0.000 | 0.700 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc0000000000000009a | 154.840 | 0.815 | n/a | 0.000 | 0.000 | 4.176 | 149.550 | 0.019 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.206 | 0.815 | 0.005 | 0.206 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc00000000000000094 | 132.716 | 0.000 | n/a | 0.000 | 0.000 | 4.748 | 127.260 | 0.023 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.595 | 0.000 | 0.000 | 0.595 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc00000000000000096 | 101.609 | 0.000 | n/a | 0.000 | 0.000 | 3.957 | 97.394 | 0.013 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc0000000000000009b | 97.015 | 0.883 | n/a | 0.000 | 0.000 | 4.256 | 80.973 | 0.021 | 10.534 | 0.116 | 0.000 | n/a | n/a | 0.231 | 0.883 | 0.009 | 0.231 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc00000000000000093 | 95.295 | 0.845 | n/a | 0.000 | 0.000 | 4.409 | 89.644 | 0.016 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.300 | 0.845 | 0.009 | 0.300 | gw-r/thread-67/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 3.854 | 197.768 | 0.016 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 202.936 | 0.000 | n/a | 0.000 | 0.000 | 4.114 | 198.650 | 6.040 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc000000000000000af | 202.936 | 0.000 | n/a | 0.000 | 0.000 | 4.114 | 198.583 | 0.033 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b2 | 202.838 | 0.000 | n/a | 0.000 | 0.000 | 3.808 | 198.650 | 0.057 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000ad | 202.362 | 0.000 | n/a | 0.000 | 0.000 | 3.919 | 198.152 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b0 | 202.110 | 0.000 | n/a | 0.000 | 0.000 | 3.866 | 197.975 | 0.016 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b1 | 202.018 | 0.000 | n/a | 0.000 | 0.000 | 3.832 | 197.948 | 0.015 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b5 | 201.974 | 0.000 | n/a | 0.000 | 0.000 | 3.927 | 197.768 | 0.022 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 6f43bf909ea70fc000000000000000aa | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 3.840 | 197.890 | 0.017 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b4 | 201.721 | 0.000 | n/a | 0.000 | 0.000 | 3.854 | 197.628 | 0.015 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000ab | 191.332 | 0.000 | n/a | 0.000 | 0.000 | 3.803 | 184.405 | 2.741 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.303 | 0.000 | 0.000 | 0.303 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b6 | 123.177 | 0.000 | n/a | 0.000 | 0.000 | 3.887 | 119.091 | 0.015 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b3 | 91.657 | 0.000 | n/a | 0.000 | 0.000 | 4.004 | 87.420 | 0.013 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-69/journal/page | none observed |
| 6f43bf909ea70fc000000000000000a9 | 66.451 | 0.000 | n/a | 0.000 | 0.000 | 3.850 | 56.391 | 6.040 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 6f43bf909ea70fc000000000000000ae | 64.843 | 0.000 | n/a | 0.000 | 0.000 | 3.848 | 60.793 | 0.016 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-67/journal/page | none observed |

## P3 / presweep / read (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.415 | 0.000 | n/a | 0.000 | 0.000 | 3.931 | 198.125 | 0.029 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 |
| p99 | 204.646 | 0.000 | n/a | 0.000 | 0.000 | 4.040 | 200.481 | 3.299 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.360 | 0.000 | 0.000 | 0.360 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc000000000000000b7 | 204.646 | 0.000 | n/a | 0.000 | 0.000 | 3.825 | 200.481 | 0.027 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-53/journal/page | none observed |
| 6f43bf909ea70fc000000000000000bf | 202.914 | 0.000 | n/a | 0.000 | 0.000 | 3.931 | 198.596 | 0.022 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-70/journal/page | none observed |
| 6f43bf909ea70fc000000000000000c0 | 202.524 | 0.000 | n/a | 0.000 | 0.000 | 3.839 | 198.384 | 0.029 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-68/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b9 | 202.499 | 0.000 | n/a | 0.000 | 0.000 | 4.040 | 198.028 | 0.037 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc000000000000000ba | 202.415 | 0.000 | n/a | 0.000 | 0.000 | 3.971 | 198.125 | 0.027 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-52/journal/page | none observed |
| 6f43bf909ea70fc000000000000000b8 | 202.402 | 0.000 | n/a | 0.000 | 0.000 | 3.991 | 196.917 | 1.192 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-54/journal/page | none observed |
| 6f43bf909ea70fc000000000000000bb | 202.396 | 0.000 | n/a | 0.000 | 0.000 | 3.843 | 198.181 | 0.057 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc000000000000000bd | 202.133 | 0.000 | n/a | 0.000 | 0.000 | 3.861 | 198.013 | 0.019 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 6f43bf909ea70fc000000000000000c1 | 117.083 | 0.000 | n/a | 0.000 | 0.000 | 4.028 | 109.333 | 3.299 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.360 | 0.000 | 0.000 | 0.360 | gw-r/thread-70/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 4.004 | 197.917 | 0.021 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 |
| p99 | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 4.004 | 197.917 | 0.021 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6f43bf909ea70fc000000000000000cb | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 4.004 | 197.917 | 0.021 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-67/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
