# Trace report

Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.

Run tx2-dxt1-p10-final-a-off-after; source dce01797d3015f243262c70bdc6605186a090e06; subjects 10000. No collection completeness or semantic verdict is asserted.

## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/4.380 ms; post-ACK p50/p99: 0.358/1.757 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.079 | 9.634 | 9.377 | reported |
| All-primary p99 ms | 39.345 | 38.931 | 38.072 | <=50 |
| L256 5-10 p50Ms | 12.159 | 11.967 | 11.839 | <=10 |
| L256 5-10 p99Ms | 17.359 | 17.074 | 17.071 | <=50 |
| L256 11-25 p50Ms | 16.767 | 16.127 | 16.127 | <=10 |
| L256 11-25 p99Ms | 21.312 | 20.824 | 20.822 | <=50 |
| L256 26-50 p50Ms | 19.455 | 18.687 | 18.687 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 32.189 | 31.603 | 31.600 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.639 | 8.319 | 7.999 | <=10 |
| Burst 11-25 p50 ms | 11.007 | 10.559 | 10.367 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 32.189 | 31.603 | 31.600 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 68.404 | 67.899 | 59.645 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |

## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 44.671/44.671 | 38.544 | unavailable | unavailable | 0.661/0.254 |
| 5-10 | 250-1000 | 50 | 13.082/39.965 | 12.781 | unavailable | unavailable | 0.052/0.011 |
| 5-10 | 0-50 | 1166 | 7.717/28.956 | 7.409 | unavailable | unavailable | 0.026/0.011 |
| 11-25 | 250-1000 | 30 | 18.400/49.993 | 18.022 | unavailable | unavailable | 0.061/0.012 |
| 26-50 | 100-250 | 6 | 23.799/35.395 | 23.153 | unavailable | unavailable | 0.085/0.011 |
| 5-10 | 100-250 | 19 | 13.003/32.422 | 12.686 | unavailable | unavailable | 0.046/0.011 |
| 26-50 | 250-1000 | 7 | 31.123/51.605 | 30.163 | unavailable | unavailable | 0.079/0.018 |
| 11-25 | 100-250 | 10 | 11.604/26.452 | 11.191 | unavailable | unavailable | 0.050/0.015 |
| 11-25 | 0-50 | 531 | 9.865/32.522 | 9.323 | unavailable | unavailable | 0.032/0.011 |
| 11-25 | overlap | 379 | 11.962/38.676 | 11.461 | unavailable | unavailable | 0.027/0.010 |
| 5-10 | 50-100 | 59 | 7.922/21.411 | 7.590 | unavailable | unavailable | 0.035/0.011 |
| 26-50 | overlap | 143 | 15.481/39.929 | 14.710 | unavailable | unavailable | 0.039/0.011 |
| 11-25 | 50-100 | 36 | 11.532/27.138 | 10.920 | unavailable | unavailable | 0.042/0.011 |
| 5-10 | overlap | 771 | 9.760/39.170 | 9.426 | unavailable | unavailable | 0.022/0.010 |
| 26-50 | 0-50 | 197 | 14.247/30.094 | 13.048 | unavailable | unavailable | 0.044/0.012 |
| 26-50 | 50-100 | 15 | 14.730/21.909 | 13.809 | unavailable | unavailable | 0.047/0.011 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 889 | 7 | 407.087 |
| burst | 2531 | 3 | 165.174 |
