# tx2-dxt1-p5-publication-a

Source f9af2506c70dcb8d0320436b5dee5dadd9f024d9; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 13.654 | 49.704 | 14.009 / 65.028 | -0.355 / -2.53% | 10.202 (10.194-10.217) | 53.0 / 210.4 |
| insert / summary | 13.630 | 59.544 | 14.009 / 65.028 | -0.379 / -2.71% | 10.186 (10.186-10.186) | 59.7 / 179.7 |
| insert / summary | 14.284 | 73.370 | 14.009 / 65.028 | 0.275 / 1.96% | 10.155 (10.155-10.155) | 62.4 / 301.7 |
| baseline / summary | 14.364 | 80.353 | 14.009 / 65.028 | 0.355 / 2.53% | 10.155 (10.155-10.155) | 74.9 / 275.5 |

Controls: tx2-dxt1-p5-publication-a-1-baseline, tx2-dxt1-p5-publication-a-4-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
