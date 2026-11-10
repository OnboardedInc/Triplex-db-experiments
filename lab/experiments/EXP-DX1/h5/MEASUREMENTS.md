# DX-H5 derived measurements

Diagnostic only. Existing gate statuses are copied; this analyzer grants no verdict.

## tx2-dxh5-seed10000a

N=10000; receipt status RUNNING; outer exit 1; sweep wall — s; — subjects/s; ACK-metric prefix null/10000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |               — |                       — |                   — |                  — |                   — |
| Build world and canonical sort |               — |                       — |                   — |                  — |                   — |
| Evaluate kernel                |               — |                       — |                   — |                  — |                   — |
| Index page rows                |               — |                       — |                   — |                  — |                   — |
| Encode worker result           |               — |                       — |                   — |                  — |                   — |
| Controller JSON decode         |               — |                       — |                   — |                  — |                   — |
| Build outbox                   |               — |                       — |                   — |                  — |                   — |
| Publish commit                 |               — |                       — |                   — |                  — |                   — |
| Independent verification       |               — |                       — |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     |     — |                  — |                   — |
| index    |     — |                  — |                   — |
| decode   |     — |                  — |                   — |
| evaluate |     — |                  — |                   — |
| hash     |     — |                  — |                   — |

Gate statuses: {}

## tx2-dxh5-seed1000b

N=1000; receipt status G0-PASS; outer exit 0; sweep wall — s; — subjects/s; ACK-metric prefix null/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |               — |                       — |                   — |                  — |                   — |
| Build world and canonical sort |               — |                       — |                   — |                  — |                   — |
| Evaluate kernel                |               — |                       — |                   — |                  — |                   — |
| Index page rows                |               — |                       — |                   — |                  — |                   — |
| Encode worker result           |               — |                       — |                   — |                  — |                   — |
| Controller JSON decode         |               — |                       — |                   — |                  — |                   — |
| Build outbox                   |               — |                       — |                   — |                  — |                   — |
| Publish commit                 |               — |                       — |                   — |                  — |                   — |
| Independent verification       |               — |                       — |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 4.658 |          95015.746 |               4.631 |
| index    | 0.050 |        8810634.867 |               0.050 |
| decode   | 4.263 |         103826.695 |               4.238 |
| evaluate | 0.140 |        3158733.557 |               0.139 |
| hash     | 0.250 |        1773296.791 |               0.248 |

Gate statuses: {"G0":"PASS"}

## tx2-dxh5-w1a

N=1000; receipt status RUNNING; outer exit 1; sweep wall — s; — subjects/s; ACK-metric prefix null/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |               — |                       — |                   — |                  — |                   — |
| Build world and canonical sort |               — |                       — |                   — |                  — |                   — |
| Evaluate kernel                |               — |                       — |                   — |                  — |                   — |
| Index page rows                |               — |                       — |                   — |                  — |                   — |
| Encode worker result           |               — |                       — |                   — |                  — |                   — |
| Controller JSON decode         |               — |                       — |                   — |                  — |                   — |
| Build outbox                   |               — |                       — |                   — |                  — |                   — |
| Publish commit                 |               — |                       — |                   — |                  — |                   — |
| Independent verification       |               — |                       — |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 4.824 |          91740.120 |               4.796 |
| index    | 0.042 |       10575835.783 |               0.042 |
| decode   | 4.223 |         104801.950 |               4.198 |
| evaluate | 0.127 |        3478425.239 |               0.126 |
| hash     | 0.267 |        1654864.378 |               0.266 |

Gate statuses: {"G0":"PASS"}

## tx2-dxh5-w1b

N=1000; receipt status PARTIAL; outer exit 0; sweep wall 58.593 s; 17.067 subjects/s; ACK-metric prefix 1000/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |          20.969 |                   0.358 |               6.768 |          65388.371 |               6.729 |
| Build world and canonical sort |          11.977 |                   0.204 |               5.490 |          80606.367 |               5.459 |
| Evaluate kernel                |           0.595 |                   0.010 |               0.270 |        1637463.186 |               0.269 |
| Index page rows                |           0.142 |                   0.002 |               0.064 |        6882631.955 |               0.064 |
| Encode worker result           |           1.003 |                   0.017 |               0.409 |        1082062.968 |               0.407 |
| Controller JSON decode         |           0.334 |                   0.006 |                   — |                  — |                   — |
| Build outbox                   |           5.081 |                   0.087 |                   — |                  — |                   — |
| Publish commit                 |           1.931 |                   0.033 |                   — |                  — |                   — |
| Independent verification       |          14.390 |                   0.246 |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

| Matched live metric | Baseline p50 ms | Baseline p99 ms | Sweep p50 ms | Sweep p99 ms | p99 ratio |
| ------------------- | --------------: | --------------: | -----------: | -----------: | --------: |
| read                |          69.117 |         280.783 |       71.480 |      296.394 |     1.056 |
| commit              |          83.960 |         191.483 |       79.002 |      272.846 |     1.425 |
| commitService       |          42.601 |         148.141 |       36.072 |      132.834 |     0.897 |

Full sweep prefix covered: true. Sequential evolving-store windows remain diagnostic.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 4.757 |          93037.047 |               4.729 |
| index    | 0.034 |       13090987.074 |               0.034 |
| decode   | 4.102 |         107901.405 |               4.078 |
| evaluate | 0.131 |        3368320.509 |               0.131 |
| hash     | 0.256 |        1731950.331 |               0.254 |

Gate statuses: {"G0":"PASS","G1":"PASS","G2":"PASS","G3":"PASS","G5":"PASS","G7":"PASS","G9":"PASS","G4":"PARTIAL","G6":"NOT-RUN"}

## tx2-dxh5-w4a

N=1000; receipt status RUNNING; outer exit 1; sweep wall — s; — subjects/s; ACK-metric prefix null/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |               — |                       — |                   — |                  — |                   — |
| Build world and canonical sort |               — |                       — |                   — |                  — |                   — |
| Evaluate kernel                |               — |                       — |                   — |                  — |                   — |
| Index page rows                |               — |                       — |                   — |                  — |                   — |
| Encode worker result           |               — |                       — |                   — |                  — |                   — |
| Controller JSON decode         |               — |                       — |                   — |                  — |                   — |
| Build outbox                   |               — |                       — |                   — |                  — |                   — |
| Publish commit                 |               — |                       — |                   — |                  — |                   — |
| Independent verification       |               — |                       — |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 5.043 |          87760.085 |               5.014 |
| index    | 0.052 |        8440458.481 |               0.052 |
| decode   | 4.149 |         106668.997 |               4.125 |
| evaluate | 0.127 |        3480422.149 |               0.126 |
| hash     | 0.305 |        1449124.599 |               0.304 |

Gate statuses: {"G0":"PASS"}

## tx2-dxh5-w4b

N=1000; receipt status PARTIAL; outer exit 0; sweep wall 30.659 s; 32.617 subjects/s; ACK-metric prefix 1000/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |          23.030 |                   0.751 |               6.694 |          66116.788 |               6.655 |
| Build world and canonical sort |          16.756 |                   0.547 |               5.533 |          79986.387 |               5.501 |
| Evaluate kernel                |           0.981 |                   0.032 |               0.328 |        1350900.006 |               0.326 |
| Index page rows                |           0.209 |                   0.007 |               0.083 |        5302743.829 |               0.083 |
| Encode worker result           |           1.489 |                   0.049 |               0.461 |         960229.726 |               0.458 |
| Controller JSON decode         |           0.352 |                   0.011 |                   — |                  — |                   — |
| Build outbox                   |           5.301 |                   0.173 |                   — |                  — |                   — |
| Publish commit                 |           2.313 |                   0.075 |                   — |                  — |                   — |
| Independent verification       |          17.315 |                   0.565 |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

| Matched live metric | Baseline p50 ms | Baseline p99 ms | Sweep p50 ms | Sweep p99 ms | p99 ratio |
| ------------------- | --------------: | --------------: | -----------: | -----------: | --------: |
| read                |          62.667 |         308.347 |       80.952 |      340.863 |     1.105 |
| commit              |          87.208 |         182.842 |       88.933 |      330.871 |     1.810 |
| commitService       |          48.183 |         107.995 |       36.584 |      314.851 |     2.915 |

Full sweep prefix covered: true. Sequential evolving-store windows remain diagnostic.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 4.766 |          92851.496 |               4.739 |
| index    | 0.033 |       13444120.417 |               0.033 |
| decode   | 4.137 |         106988.520 |               4.113 |
| evaluate | 0.138 |        3199102.218 |               0.138 |
| hash     | 0.263 |        1681677.243 |               0.262 |

Gate statuses: {"G0":"PASS","G1":"PASS","G2":"PASS","G3":"PASS","G5":"PASS","G7":"PASS","G9":"PASS","G4":"PARTIAL","G6":"NOT-RUN"}

## tx2-dxh5-w8a

N=1000; receipt status RUNNING; outer exit 1; sweep wall — s; — subjects/s; ACK-metric prefix null/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |               — |                       — |                   — |                  — |                   — |
| Build world and canonical sort |               — |                       — |                   — |                  — |                   — |
| Evaluate kernel                |               — |                       — |                   — |                  — |                   — |
| Index page rows                |               — |                       — |                   — |                  — |                   — |
| Encode worker result           |               — |                       — |                   — |                  — |                   — |
| Controller JSON decode         |               — |                       — |                   — |                  — |                   — |
| Build outbox                   |               — |                       — |                   — |                  — |                   — |
| Publish commit                 |               — |                       — |                   — |                  — |                   — |
| Independent verification       |               — |                       — |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 4.970 |          89048.636 |               4.941 |
| index    | 0.036 |       12297285.282 |               0.036 |
| decode   | 4.047 |         109350.674 |               4.024 |
| evaluate | 0.136 |        3257618.361 |               0.135 |
| hash     | 0.267 |        1658206.411 |               0.265 |

Gate statuses: {"G0":"PASS"}

## tx2-dxh5-w8b

N=1000; receipt status PARTIAL; outer exit 0; sweep wall 31.792 s; 31.455 subjects/s; ACK-metric prefix 1000/1000. A RUNNING receipt with a nonzero outer exit is an interrupted attempt, not a live or successful trial.

| Stage                          | Summed demand s | Demand s / sweep wall s | Worker thread CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| ------------------------------ | --------------: | ----------------------: | ------------------: | -----------------: | ------------------: |
| Read and wire decode           |          30.844 |                   0.970 |               6.516 |          67917.052 |               6.478 |
| Build world and canonical sort |          20.664 |                   0.650 |               5.416 |          81719.834 |               5.384 |
| Evaluate kernel                |           1.499 |                   0.047 |               0.339 |        1305769.299 |               0.337 |
| Index page rows                |           0.296 |                   0.009 |               0.079 |        5607224.306 |               0.078 |
| Encode worker result           |           1.725 |                   0.054 |               0.460 |         962526.941 |               0.457 |
| Controller JSON decode         |           0.354 |                   0.011 |                   — |                  — |                   — |
| Build outbox                   |           5.369 |                   0.169 |                   — |                  — |                   — |
| Publish commit                 |           2.072 |                   0.065 |                   — |                  — |                   — |
| Independent verification       |          16.522 |                   0.520 |                   — |                  — |                   — |

Stage sums overlap across workers. Read includes wire/adaptor decode. Nested callback/publication timers are omitted. Main-thread interval CPU is not attributed exclusively while live work overlaps.

| Matched live metric | Baseline p50 ms | Baseline p99 ms | Sweep p50 ms | Sweep p99 ms | p99 ratio |
| ------------------- | --------------: | --------------: | -----------: | -----------: | --------: |
| read                |          71.150 |         314.653 |       82.897 |      353.946 |     1.125 |
| commit              |          83.649 |         227.183 |       86.754 |      328.922 |     1.448 |
| commitService       |          45.111 |         193.439 |       34.509 |       80.176 |     0.414 |

Full sweep prefix covered: true. Sequential evolving-store windows remain diagnostic.

No-live preview CPU calibration:

| Stage    | CPU s | Input rows / CPU s | CPUs at 440k rows/s |
| -------- | ----: | -----------------: | ------------------: |
| read     | 4.655 |          95068.507 |               4.628 |
| index    | 0.038 |       11680927.998 |               0.038 |
| decode   | 3.963 |         111666.514 |               3.940 |
| evaluate | 0.138 |        3197299.504 |               0.138 |
| hash     | 0.257 |        1719835.543 |               0.256 |

Gate statuses: {"G0":"PASS","G1":"PASS","G2":"PASS","G3":"PASS","G5":"PASS","G7":"PASS","G9":"PASS","G4":"PARTIAL","G6":"NOT-RUN"}
