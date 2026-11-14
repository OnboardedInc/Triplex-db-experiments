# tx2-dxt1-p4-core-zero-a

Source 04dd61f7ae9431b4ea3053f191c001a944c8a7d8; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 15.419 | 87.537 | 15.372 / 92.309 | 0.048 / 0.31% | 12.739 (12.669-12.747) | 58.5 / 278.0 |
| candidate / summary | 14.373 | 80.272 | 15.372 / 92.309 | -0.999 / -6.50% | 12.606 (12.583-12.669) | 48.3 / 352.6 |
| baseline / summary | 15.324 | 97.081 | 15.372 / 92.309 | -0.048 / -0.31% | 12.419 (12.403-12.466) | 48.0 / 198.3 |

Controls: tx2-dxt1-p4-core-zero-a-1-baseline, tx2-dxt1-p4-core-zero-a-3-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
