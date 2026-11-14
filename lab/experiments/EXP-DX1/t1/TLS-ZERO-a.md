# tx2-dxt1-p4-tls-zero-a

Source a8bc259a437829f8d65e9630ab698b30bf202117; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 14.039 | 60.183 | 14.203 / 65.794 | -0.164 / -1.15% | 13.097 (13.097-13.105) | 36.9 / 230.7 |
| candidate / summary | 14.354 | 110.242 | 14.203 / 65.794 | 0.151 / 1.06% | 12.910 (12.910-12.917) | 60.5 / 265.9 |
| baseline / summary | 14.366 | 71.406 | 14.203 / 65.794 | 0.164 / 1.15% | 12.886 (12.878-12.894) | 39.2 / 154.2 |

Controls: tx2-dxt1-p4-tls-zero-a-1-baseline, tx2-dxt1-p4-tls-zero-a-3-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
