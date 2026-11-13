# tx2-dxt1-p2-cost-d

Source b93872958321dadbd615ed359d84950571e7f982; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend off-arm quantiles; no pooled-percentile claim.

| arm / level | p50 ms | p99 ms | off p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- | --- |
| off / off | 16.660 | 149.504 | 16.793 / 241.107 | -0.133 / -0.79% | 15.944 (15.811-16.147) |
| summary / summary | 18.130 | 149.226 | 16.793 / 241.107 | 1.337 / 7.96% | 15.780 (15.709-15.780) |
| summary / summary | 17.853 | 305.829 | 16.793 / 241.107 | 1.060 / 6.31% | 15.623 (15.561-15.709) |
| off / off | 16.926 | 332.710 | 16.793 / 241.107 | 0.133 / 0.79% | 15.529 (15.522-15.582) |

Controls: tx2-dxt1-p2-cost-d-1-off, tx2-dxt1-p2-cost-d-4-off. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
