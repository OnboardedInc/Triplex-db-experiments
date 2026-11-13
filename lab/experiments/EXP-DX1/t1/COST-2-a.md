# tx2-dxt1-p2-cost-a

Source d7c89645926a6a867c856f24dca2d4caba04c075; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend off-arm quantiles; no pooled-percentile claim.

| arm / level | p50 ms | p99 ms | off p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- | --- |
| off / off | 15.778 | 110.413 | 15.884 / 123.125 | -0.105 / -0.66% | 12.437 (12.437-12.437) |
| summary / summary | 16.902 | 119.746 | 15.884 / 123.125 | 1.018 / 6.41% | 12.429 (12.421-12.437) |
| summary / summary | 16.368 | 371.969 | 15.884 / 123.125 | 0.484 / 3.05% | 12.405 (12.358-12.421) |
| off / off | 15.989 | 135.837 | 15.884 / 123.125 | 0.105 / 0.66% | 12.343 (12.327-12.358) |

Controls: tx2-dxt1-p2-cost-a-1-off, tx2-dxt1-p2-cost-a-4-off. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
