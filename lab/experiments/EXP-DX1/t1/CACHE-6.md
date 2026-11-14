# Cache comparison, part 6

Only transactor cache differs: 1 GiB versus 1280 MiB; heap 3 GiB, index maximum 1 GiB, fixed retained placement. Binary full recorders: Node, gateway and transactor JFR, no CPU sampling or native file logging. All figures are diagnostic, not acceptance promotion.

# tx2-dxt1-p6-cache0-b

Source 9ac79685c6286ce7a20f3d06be5556d314817f42; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / full | 11.488 | 43.077 | 11.477 / 43.245 | 0.011 / 0.10% | 4.851 (4.851-4.851) | 10.6 / 162.6 |
| candidate / full | 11.494 | 43.859 | 11.477 / 43.245 | 0.017 / 0.15% | 4.851 (4.851-4.851) | 12.6 / 85.5 |
| candidate / full | 11.260 | 49.365 | 11.477 / 43.245 | -0.217 / -1.89% | 4.835 (4.835-4.843) | 11.1 / 99.3 |
| baseline / full | 11.466 | 43.413 | 11.477 / 43.245 | -0.011 / -0.10% | 4.835 (4.835-4.835) | 11.4 / 90.9 |

Controls: tx2-dxt1-p6-cache0-b-1-baseline, tx2-dxt1-p6-cache0-b-4-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

# tx2-dxt1-p6-cache256-b

Source 9ac79685c6286ce7a20f3d06be5556d314817f42; one session, common host/VM sampling, 10,000 subjects, frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict). Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / full | 13.298 | 58.115 | 13.199 / 55.668 | 0.099 / 0.75% | 4.827 (4.819-4.835) | 11.0 / 61.5 |
| candidate / full | 12.854 | 52.115 | 13.199 / 55.668 | -0.344 / -2.61% | 4.812 (4.812-4.812) | 11.2 / 87.0 |
| candidate / full | 12.945 | 47.102 | 13.199 / 55.668 | -0.254 / -1.92% | 4.812 (4.812-4.812) | 10.4 / 98.7 |
| baseline / full | 13.100 | 53.221 | 13.199 / 55.668 | -0.099 / -0.75% | 4.804 (4.804-4.804) | 10.6 / 106.4 |

Controls: tx2-dxt1-p6-cache256-b-1-baseline, tx2-dxt1-p6-cache256-b-4-baseline. Each arm: 3530 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |
| --- | --- | ---: | ---: | --- |
| baseline | 11.263 / 28.567 | 6.399 | 42154.4 | 4.827 / 10.2 |
| candidate | 11.071 / 29.475 | 6.207 | 43573.2 | 4.812 / 12.0 |
| candidate | 10.623 / 44.363 | 6.207 | 43109.1 | 4.812 / 11.0 |
| baseline | 11.583 / 116.268 | 6.175 | 43166.0 | 4.804 / 10.8 |


Native cold SQL reads, baseline/candidate/candidate/baseline: zero 340/278/273/359 of 3,420; loaded 436/385/342/435 of 3,530. Zero median reduction is not repeatable across both candidates. Loaded all-primary p50 reduction 0.299 ms exceeds 0.198-ms drift; L256 small-band mean-arm p50 reduction 0.576 ms exceeds 0.320-ms drift, both candidates below both controls. Keep 1280 MiB for the loaded benefit; no zero-reader or tail gain is claimed.
