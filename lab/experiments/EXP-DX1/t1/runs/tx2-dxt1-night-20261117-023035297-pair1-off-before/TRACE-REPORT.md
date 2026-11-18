# Trace report

Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.

Run tx2-dxt1-night-20261117-023035297-pair1-off-before; source e2f92c31501493be86b072e3ff7afd8295157908; subjects 10000. No collection completeness or semantic verdict is asserted.

## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.002/3.074 ms; post-ACK p50/p99: 0.320/1.711 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 7.881 | 8.304 | 7.689 | reported |
| All-primary p99 ms | 34.562 | 34.885 | 33.456 | <=50 |
| L256 5-10 p50Ms | 9.919 | 10.175 | 9.855 | <=10 |
| L256 5-10 p99Ms | 14.382 | 14.620 | 14.378 | <=50 |
| L256 11-25 p50Ms | 14.463 | 14.975 | 14.463 | <=10 |
| L256 11-25 p99Ms | 22.549 | 22.933 | 22.544 | <=50 |
| L256 26-50 p50Ms | 11.839 | 12.415 | 11.775 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 14.299 | 15.092 | 14.296 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 6.687 | 7.007 | 6.527 | <=10 |
| Burst 11-25 p50 ms | 8.575 | 9.087 | 8.383 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 22.549 | 22.933 | 22.544 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 51.333 | 51.915 | 51.332 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |

## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 76.363/76.363 | 72.246 | unavailable | unavailable | 0.704/0.132 |
| 5-10 | 250-1000 | 49 | 11.212/32.135 | 10.909 | unavailable | unavailable | 0.050/0.013 |
| 5-10 | overlap | 678 | 7.912/38.787 | 7.606 | unavailable | unavailable | 0.019/0.010 |
| 11-25 | 250-1000 | 30 | 15.746/31.993 | 15.387 | unavailable | unavailable | 0.059/0.013 |
| 26-50 | 100-250 | 6 | 17.618/31.208 | 16.528 | unavailable | unavailable | 0.054/0.016 |
| 5-10 | 100-250 | 18 | 10.044/19.580 | 9.817 | unavailable | unavailable | 0.049/0.012 |
| 26-50 | 250-1000 | 7 | 22.844/41.096 | 21.902 | unavailable | unavailable | 0.089/0.013 |
| 11-25 | 100-250 | 11 | 14.943/53.532 | 14.554 | unavailable | unavailable | 0.045/0.012 |
| 11-25 | 0-50 | 574 | 8.337/29.572 | 7.775 | unavailable | unavailable | 0.028/0.011 |
| 5-10 | 0-50 | 1251 | 6.269/23.062 | 5.986 | unavailable | unavailable | 0.023/0.011 |
| 5-10 | 50-100 | 69 | 7.228/34.884 | 7.010 | unavailable | unavailable | 0.033/0.012 |
| 26-50 | overlap | 134 | 13.068/46.224 | 12.094 | unavailable | unavailable | 0.034/0.011 |
| 11-25 | 50-100 | 41 | 9.267/30.576 | 8.736 | unavailable | unavailable | 0.041/0.011 |
| 11-25 | overlap | 330 | 9.869/43.811 | 9.321 | unavailable | unavailable | 0.022/0.010 |
| 26-50 | 0-50 | 205 | 12.016/35.682 | 11.057 | unavailable | unavailable | 0.039/0.012 |
| 26-50 | 50-100 | 16 | 11.808/16.142 | 10.971 | unavailable | unavailable | 0.039/0.011 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 889 | 3 | 176.807 |
| burst | 2531 | 1 | 125.968 |
