# tx2-dxt1-p2-cost-b

Source 8f8e995899327e659c1973b85a0fd51b2de1850d; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend off-arm quantiles; no pooled-percentile claim.

| arm / level | p50 ms | p99 ms | off p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- | --- |
| off / off | 15.659 | 507.258 | 16.361 / 314.425 | -0.703 / -4.29% | 12.376 (12.376-12.376) |
| summary / summary | 16.584 | 105.691 | 16.361 / 314.425 | 0.223 / 1.36% | 12.368 (12.368-12.376) |
| summary / summary | 16.730 | 190.027 | 16.361 / 314.425 | 0.369 / 2.25% | 12.306 (12.267-12.368) |
| off / off | 17.064 | 121.593 | 16.361 / 314.425 | 0.703 / 4.29% | 12.149 (12.134-12.259) |

Controls: tx2-dxt1-p2-cost-b-1-off, tx2-dxt1-p2-cost-b-4-off. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
