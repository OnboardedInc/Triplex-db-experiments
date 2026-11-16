# Trace report

Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.

Run tx2-dxt1-p10-final-a-off-before; source dce01797d3015f243262c70bdc6605186a090e06; subjects 10000. No collection completeness or semantic verdict is asserted.

## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.807 ms; post-ACK p50/p99: 0.354/1.910 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.133 | 9.684 | 9.446 | reported |
| All-primary p99 ms | 40.009 | 39.323 | 39.056 | <=50 |
| L256 5-10 p50Ms | 12.287 | 11.583 | 11.583 | <=10 |
| L256 5-10 p99Ms | 17.344 | 17.050 | 17.047 | <=50 |
| L256 11-25 p50Ms | 14.463 | 13.951 | 13.951 | <=10 |
| L256 11-25 p99Ms | 19.821 | 19.306 | 19.303 | <=50 |
| L256 26-50 p50Ms | 14.399 | 13.759 | 13.759 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 16.623 | 15.726 | 15.723 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.575 | 8.255 | 8.095 | <=10 |
| Burst 11-25 p50 ms | 11.135 | 10.495 | 10.303 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 19.821 | 19.306 | 19.303 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 66.823 | 65.018 | 65.016 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |

## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 62.491/62.491 | 60.224 | unavailable | unavailable | 0.922/0.154 |
| 5-10 | 250-1000 | 50 | 14.473/61.392 | 13.981 | unavailable | unavailable | 0.052/0.014 |
| 5-10 | 0-50 | 1135 | 7.697/28.760 | 7.379 | unavailable | unavailable | 0.025/0.011 |
| 11-25 | 250-1000 | 28 | 21.747/94.017 | 21.294 | unavailable | unavailable | 0.071/0.012 |
| 26-50 | 100-250 | 6 | 18.368/71.307 | 17.599 | unavailable | unavailable | 0.068/0.013 |
| 5-10 | 100-250 | 19 | 14.271/33.677 | 13.975 | unavailable | unavailable | 0.045/0.011 |
| 26-50 | 250-1000 | 6 | 26.626/67.249 | 25.406 | unavailable | unavailable | 0.091/0.013 |
| 26-50 | overlap | 149 | 15.312/47.889 | 14.279 | unavailable | unavailable | 0.041/0.011 |
| 11-25 | 100-250 | 10 | 11.404/25.410 | 10.819 | unavailable | unavailable | 0.052/0.011 |
| 11-25 | overlap | 373 | 12.211/41.281 | 11.669 | unavailable | unavailable | 0.028/0.011 |
| 11-25 | 0-50 | 536 | 9.972/30.952 | 9.469 | unavailable | unavailable | 0.031/0.012 |
| 5-10 | 50-100 | 63 | 8.417/40.522 | 8.014 | unavailable | unavailable | 0.038/0.012 |
| 11-25 | 50-100 | 39 | 11.512/24.936 | 10.638 | unavailable | unavailable | 0.044/0.012 |
| 5-10 | overlap | 798 | 9.698/41.865 | 9.425 | unavailable | unavailable | 0.023/0.010 |
| 26-50 | 0-50 | 193 | 13.553/37.889 | 12.490 | unavailable | unavailable | 0.045/0.012 |
| 26-50 | 50-100 | 14 | 14.450/39.992 | 13.115 | unavailable | unavailable | 0.053/0.012 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 889 | 5 | 335.695 |
| burst | 2531 | 11 | 773.752 |
