# Revision-index diagnostic

# tx2-dxt1-p6-rev0-a

Source b9b9c9f64441014c5fa84dc0bc6164736ca858fc; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / full | 11.818 | 50.014 | 11.614 / 47.810 | 0.204 / 1.76% | 4.765 (4.765-4.765) | 11.6 / 121.5 |
| candidate / full | 11.782 | 45.084 | 11.614 / 47.810 | 0.168 / 1.45% | 4.765 (4.765-4.765) | 11.7 / 105.6 |
| baseline / full | 11.410 | 45.606 | 11.614 / 47.810 | -0.204 / -1.76% | 4.765 (4.765-4.765) | 10.7 / 68.2 |

Controls: tx2-dxt1-p6-rev0-a-1-baseline, tx2-dxt1-p6-rev0-a-3-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

# tx2-dxt1-p6-rev256-a

Source b9b9c9f64441014c5fa84dc0bc6164736ca858fc; one session, common host/VM sampling, 10,000 subjects, frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict). Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / full | 13.414 | 61.720 | 13.339 / 59.757 | 0.075 / 0.56% | 4.765 (4.741-4.765) | 11.6 / 100.5 |
| candidate / full | 12.980 | 62.660 | 13.339 / 59.757 | -0.359 / -2.69% | 4.741 (4.741-4.741) | 11.0 / 98.0 |
| baseline / full | 13.264 | 57.793 | 13.339 / 59.757 | -0.075 / -0.56% | 4.741 (4.741-4.741) | 10.4 / 91.1 |

Controls: tx2-dxt1-p6-rev256-a-1-baseline, tx2-dxt1-p6-rev256-a-3-baseline. Each arm: 3530 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |
| --- | --- | ---: | ---: | --- |
| baseline | 11.391 / 41.043 | 6.111 | 43180.1 | 4.741 / 10.5 |
| candidate | 10.815 / 39.608 | 6.207 | 43057.0 | 4.741 / 10.6 |
| baseline | 11.007 / 96.466 | 6.175 | 42398.4 | 4.741 / 11.3 |


AEVT is not retained as the default: zero-reader commit/peer medians do not improve beyond drift; loaded peer-wait p50 improvement is 0.120 ms against 0.294-ms peer bookend drift. Aggregate native EAVT/AEVT visit p50 remains 20/10 in all arms; it does not identify per-helper call counts or prove that revision checks dominate this path. Loaded all-primary commit p50 fell 0.359 ms beyond 0.150-ms drift, but a distinct peer/read-path gain is not established. Native exactness checks cover both variants.
