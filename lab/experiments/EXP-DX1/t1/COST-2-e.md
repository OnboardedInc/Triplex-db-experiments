# tx2-dxt1-p2-cost-e

Source 4ad48894a9a6a214f5e2866fec5fb8ac31d2d831; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend off-arm quantiles; no pooled-percentile claim.

| arm / level | p50 ms | p99 ms | off p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- | --- |
| off / off | 15.887 | 182.064 | 16.363 / 151.004 | -0.476 / -2.91% | 16.419 (16.396-16.442) |
| summary / summary | 17.221 | 145.759 | 16.363 / 151.004 | 0.858 / 5.24% | 16.341 (16.271-16.364) |
| summary / summary | 16.477 | 146.202 | 16.363 / 151.004 | 0.114 / 0.69% | 16.161 (16.130-16.247) |
| off / off | 16.840 | 119.944 | 16.363 / 151.004 | 0.476 / 2.91% | 16.075 (16.067-16.122) |

Controls: tx2-dxt1-p2-cost-e-1-off, tx2-dxt1-p2-cost-e-4-off. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
