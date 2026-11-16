# Trace report

Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.

Run tx2-dxt1-p10-final-b-off-before; source f846bcd77f7858836861a5efb1d3c6fc15d2d22a; subjects 10000. No collection completeness or semantic verdict is asserted.

## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.500 ms; post-ACK p50/p99: 0.340/1.778 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 9.872 | 9.447 | 9.232 | reported |
| All-primary p99 ms | 43.999 | 43.104 | 41.822 | <=50 |
| L256 5-10 p50Ms | 12.223 | 11.967 | 11.903 | <=10 |
| L256 5-10 p99Ms | 15.837 | 15.439 | 15.435 | <=50 |
| L256 11-25 p50Ms | 17.407 | 16.895 | 16.895 | <=10 |
| L256 11-25 p99Ms | 19.091 | 18.374 | 18.367 | <=50 |
| L256 26-50 p50Ms | 15.103 | 13.439 | 12.415 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 23.148 | 22.434 | 22.431 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.447 | 8.127 | 7.999 | <=10 |
| Burst 11-25 p50 ms | 10.495 | 9.919 | 9.727 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 23.148 | 22.434 | 22.431 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 63.325 | 61.371 | 59.829 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |

## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 48.547/48.547 | 45.665 | unavailable | unavailable | 0.650/0.194 |
| 5-10 | 250-1000 | 49 | 13.914/55.001 | 13.668 | unavailable | unavailable | 0.060/0.012 |
| 5-10 | 50-100 | 68 | 8.288/17.103 | 7.953 | unavailable | unavailable | 0.030/0.011 |
| 11-25 | 250-1000 | 29 | 19.103/34.555 | 18.322 | unavailable | unavailable | 0.066/0.012 |
| 26-50 | 100-250 | 4 | 23.122/58.740 | 22.407 | unavailable | unavailable | 0.072/0.016 |
| 5-10 | 100-250 | 17 | 13.435/64.838 | 13.132 | unavailable | unavailable | 0.048/0.012 |
| 26-50 | 250-1000 | 8 | 23.762/51.935 | 22.972 | unavailable | unavailable | 0.082/0.013 |
| 26-50 | overlap | 145 | 16.036/60.905 | 14.955 | unavailable | unavailable | 0.038/0.012 |
| 11-25 | 100-250 | 12 | 12.721/23.655 | 12.287 | unavailable | unavailable | 0.052/0.011 |
| 11-25 | overlap | 362 | 11.963/42.357 | 11.406 | unavailable | unavailable | 0.025/0.011 |
| 5-10 | 0-50 | 1150 | 7.614/21.211 | 7.319 | unavailable | unavailable | 0.025/0.011 |
| 11-25 | 0-50 | 550 | 9.610/33.896 | 9.079 | unavailable | unavailable | 0.030/0.012 |
| 11-25 | 50-100 | 33 | 10.577/18.400 | 9.945 | unavailable | unavailable | 0.042/0.011 |
| 5-10 | overlap | 781 | 9.639/48.237 | 9.343 | unavailable | unavailable | 0.021/0.010 |
| 26-50 | 0-50 | 197 | 13.620/44.177 | 12.659 | unavailable | unavailable | 0.043/0.012 |
| 26-50 | 50-100 | 14 | 13.721/28.339 | 12.483 | unavailable | unavailable | 0.050/0.012 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 888 | 8 | 468.490 |
| burst | 2532 | 14 | 967.510 |
