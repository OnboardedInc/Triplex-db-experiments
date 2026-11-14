# tx2-dxt1-p4-log-256-c

Source 804d28ce1dd59e769bf7341f864b66ae07073c6b; one session, common host/VM sampling, 10,000 subjects, frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict). Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 20.833 | 135.904 | 21.444 / 160.364 | -0.611 / -2.85% | 13.674 (13.471-13.689) | 47.8 / 196.3 |
| candidate / summary | 20.714 | 189.978 | 21.444 / 160.364 | -0.730 / -3.41% | 13.314 (13.306-13.400) | 48.5 / 192.4 |
| baseline / summary | 22.055 | 184.823 | 21.444 / 160.364 | 0.611 / 2.85% | 13.347 (13.152-13.386) | 57.8 / 254.5 |

Controls: tx2-dxt1-p4-log-256-c-1-baseline, tx2-dxt1-p4-log-256-c-3-baseline. Each arm: 3530 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |
| --- | --- | ---: | ---: | --- |
| baseline | 13.567 / 111.606 | 8.255 | 34402.2 | 13.611 / 43.2 |
| candidate | 12.415 / 52.176 | 7.775 | 36123.9 | 13.314 / 55.5 |
| baseline | 15.359 / 62.701 | 7.935 | 34985.1 | 13.160 / 58.0 |
