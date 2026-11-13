# tx2-dxt1-p2-cost-c

Source f9f51d85bab0e75977e71edd735d1cb80ffeeb58; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend off-arm quantiles; no pooled-percentile claim.

| arm / level | p50 ms | p99 ms | off p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- | --- |
| off / off | 15.749 | 229.499 | 16.238 / 199.438 | -0.489 / -3.01% | 16.238 (16.160-16.277) |
| summary / summary | 16.710 | 162.424 | 16.238 / 199.438 | 0.472 / 2.91% | 16.050 (16.019-16.128) |
| summary / summary | 17.287 | 136.264 | 16.238 / 199.438 | 1.049 / 6.46% | 15.964 (15.886-15.988) |
| off / off | 16.727 | 169.377 | 16.238 / 199.438 | 0.489 / 3.01% | 15.761 (15.738-15.800) |

Controls: tx2-dxt1-p2-cost-c-1-off, tx2-dxt1-p2-cost-c-4-off. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
