# tx2-dxt1-p5-defer-b

Source 3ff6db5ae859a18b9afcf85c58ee7cd70c829800; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 14.686 | 68.695 | 14.569 / 71.413 | 0.116 / 0.80% | 9.802 (9.802-9.802) | 39.5 / 179.3 |
| deferred / summary | 12.958 | 353.113 | 14.569 / 71.413 | -1.611 / -11.05% | 9.794 (9.762-9.794) | 64.2 / 326.5 |
| deferred / summary | 13.135 | 65.018 | 14.569 / 71.413 | -1.434 / -9.84% | 9.755 (9.755-9.755) | 44.3 / 208.1 |
| baseline / summary | 14.453 | 74.131 | 14.569 / 71.413 | -0.116 / -0.80% | 9.755 (9.755-9.755) | 52.4 / 342.2 |

Controls: tx2-dxt1-p5-defer-b-1-baseline, tx2-dxt1-p5-defer-b-4-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
