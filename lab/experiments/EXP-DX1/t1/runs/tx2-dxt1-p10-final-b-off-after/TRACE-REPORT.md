# Trace report

Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.

Run tx2-dxt1-p10-final-b-off-after; source f846bcd77f7858836861a5efb1d3c6fc15d2d22a; subjects 10000. No collection completeness or semantic verdict is asserted.

## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.282 ms; post-ACK p50/p99: 0.345/1.687 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 9.826 | 9.392 | 9.175 | reported |
| All-primary p99 ms | 40.533 | 39.894 | 39.618 | <=50 |
| L256 5-10 p50Ms | 10.239 | 9.791 | 9.791 | <=10 |
| L256 5-10 p99Ms | 20.018 | 19.714 | 19.711 | <=50 |
| L256 11-25 p50Ms | 15.551 | 14.847 | 14.847 | <=10 |
| L256 11-25 p99Ms | 24.583 | 23.928 | 23.927 | <=50 |
| L256 26-50 p50Ms | 14.655 | 12.671 | 12.671 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 17.914 | 17.334 | 17.327 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.383 | 8.095 | 7.839 | <=10 |
| Burst 11-25 p50 ms | 10.495 | 9.919 | 9.791 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 24.583 | 23.928 | 23.927 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 58.921 | 58.482 | 56.806 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |

## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 62.502/62.502 | 56.743 | unavailable | unavailable | 0.617/0.167 |
| 5-10 | 250-1000 | 48 | 13.237/50.506 | 12.686 | unavailable | unavailable | 0.052/0.013 |
| 5-10 | 50-100 | 67 | 8.037/18.936 | 7.671 | unavailable | unavailable | 0.034/0.011 |
| 11-25 | 250-1000 | 30 | 18.535/33.934 | 17.844 | unavailable | unavailable | 0.069/0.012 |
| 26-50 | 100-250 | 3 | 18.882/27.686 | 18.273 | unavailable | unavailable | 0.071/0.013 |
| 5-10 | 100-250 | 18 | 11.924/77.005 | 11.691 | unavailable | unavailable | 0.046/0.011 |
| 26-50 | 250-1000 | 9 | 20.139/51.882 | 19.281 | unavailable | unavailable | 0.074/0.013 |
| 5-10 | overlap | 770 | 9.609/38.167 | 9.325 | unavailable | unavailable | 0.021/0.010 |
| 26-50 | 0-50 | 199 | 13.262/53.902 | 12.365 | unavailable | unavailable | 0.044/0.012 |
| 11-25 | 100-250 | 11 | 11.512/18.500 | 11.172 | unavailable | unavailable | 0.056/0.013 |
| 11-25 | overlap | 355 | 11.652/45.320 | 11.107 | unavailable | unavailable | 0.026/0.011 |
| 5-10 | 0-50 | 1162 | 7.550/30.603 | 7.252 | unavailable | unavailable | 0.025/0.011 |
| 11-25 | 0-50 | 555 | 9.578/33.658 | 9.052 | unavailable | unavailable | 0.031/0.012 |
| 26-50 | overlap | 143 | 15.749/43.858 | 14.924 | unavailable | unavailable | 0.039/0.011 |
| 11-25 | 50-100 | 35 | 10.596/23.935 | 10.073 | unavailable | unavailable | 0.048/0.011 |
| 26-50 | 50-100 | 14 | 15.047/25.356 | 14.028 | unavailable | unavailable | 0.046/0.012 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 888 | 10 | 553.277 |
| burst | 2532 | 3 | 179.731 |
