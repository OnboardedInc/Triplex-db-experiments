# tx2-dxt1-p4-core-256-a

Source 04dd61f7ae9431b4ea3053f191c001a944c8a7d8; one session, common host/VM sampling, 10,000 subjects, frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict). Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 21.245 | 405.655 | 20.508 / 266.258 | 0.737 / 3.59% | 11.469 (11.344-12.302) | 48.0 / 217.2 |
| candidate / summary | 16.992 | 124.508 | 20.508 / 266.258 | -3.516 / -17.14% | 11.510 (11.447-11.517) | 45.4 / 250.7 |
| baseline / summary | 19.771 | 126.861 | 20.508 / 266.258 | -0.737 / -3.59% | 12.444 (12.335-12.460) | 61.2 / 302.6 |

Controls: tx2-dxt1-p4-core-256-a-1-baseline, tx2-dxt1-p4-core-256-a-3-baseline. Each arm: 3530 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |
| --- | --- | ---: | ---: | --- |
| baseline | 16.383 / 68.908 | 8.895 | 32113.3 | 11.399 / 58.6 |
| candidate | 14.783 / 55.087 | 8.511 | 33252.1 | 11.517 / 47.3 |
| baseline | 16.639 / 49.468 | 7.359 | 36485.9 | 12.397 / 55.5 |
