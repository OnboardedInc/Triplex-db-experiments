# Trace report

Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.

Run tx2-dxt1-night-20261117-023035297-pair1-off-after; source e2f92c31501493be86b072e3ff7afd8295157908; subjects 10000. No collection completeness or semantic verdict is asserted.

## Commit clock definitions

Verdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.

Timer lateness p50/p99: 0.002/3.073 ms; post-ACK p50/p99: 0.336/1.692 ms.

| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 7.892 | 8.286 | 7.661 | reported |
| All-primary p99 ms | 39.869 | 40.275 | 39.768 | <=50 |
| L256 5-10 p50Ms | 8.575 | 8.895 | 8.575 | <=10 |
| L256 5-10 p99Ms | 33.687 | 33.956 | 33.686 | <=50 |
| L256 11-25 p50Ms | 16.191 | 16.895 | 16.191 | <=10 |
| L256 11-25 p99Ms | 17.802 | 18.827 | 17.797 | <=50 |
| L256 26-50 p50Ms | 11.071 | 11.647 | 9.407 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 17.183 | 18.996 | 17.182 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 6.687 | 6.943 | 6.527 | <=10 |
| Burst 11-25 p50 ms | 8.511 | 9.087 | 8.319 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 33.687 | 33.956 | 33.686 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 86.474 | 86.858 | 85.311 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |

## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 79.078/79.078 | 76.060 | unavailable | unavailable | 0.752/0.121 |
| 5-10 | 250-1000 | 49 | 12.040/60.496 | 11.595 | unavailable | unavailable | 0.066/0.012 |
| 5-10 | 0-50 | 1255 | 6.354/26.519 | 6.080 | unavailable | unavailable | 0.023/0.011 |
| 11-25 | 250-1000 | 30 | 18.697/36.835 | 18.155 | unavailable | unavailable | 0.061/0.012 |
| 26-50 | 100-250 | 6 | 14.080/27.860 | 13.042 | unavailable | unavailable | 0.051/0.012 |
| 5-10 | 100-250 | 20 | 9.518/33.201 | 9.290 | unavailable | unavailable | 0.040/0.012 |
| 26-50 | 250-1000 | 7 | 22.598/45.948 | 21.442 | unavailable | unavailable | 0.076/0.020 |
| 11-25 | 100-250 | 11 | 13.403/33.234 | 12.801 | unavailable | unavailable | 0.051/0.015 |
| 11-25 | 0-50 | 578 | 8.449/36.519 | 7.923 | unavailable | unavailable | 0.029/0.012 |
| 5-10 | 50-100 | 67 | 6.754/14.265 | 6.499 | unavailable | unavailable | 0.030/0.011 |
| 26-50 | overlap | 133 | 13.607/43.901 | 12.729 | unavailable | unavailable | 0.034/0.012 |
| 11-25 | 50-100 | 42 | 9.235/19.684 | 8.527 | unavailable | unavailable | 0.043/0.012 |
| 5-10 | overlap | 674 | 7.723/40.793 | 7.473 | unavailable | unavailable | 0.019/0.010 |
| 11-25 | overlap | 325 | 9.570/46.171 | 9.135 | unavailable | unavailable | 0.024/0.010 |
| 26-50 | 0-50 | 208 | 11.961/26.505 | 10.875 | unavailable | unavailable | 0.040/0.012 |
| 26-50 | 50-100 | 14 | 12.725/16.066 | 11.367 | unavailable | unavailable | 0.041/0.011 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 889 | 9 | 557.716 |
| burst | 2531 | 2 | 124.429 |
