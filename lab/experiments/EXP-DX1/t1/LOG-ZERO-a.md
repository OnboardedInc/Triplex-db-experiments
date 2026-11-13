# tx2-dxt1-p4-log-zero-a

Source ef7473361c138176ead9c0222b2ccc53e33dde11; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 14.625 | 61.525 | 15.063 / 75.685 | -0.437 / -2.90% | 11.922 (11.922-11.922) | 38.2 / 204.1 |
| candidate / summary | 14.740 | 69.772 | 15.063 / 75.685 | -0.323 / -2.14% | 11.899 (11.899-11.907) | 42.8 / 173.6 |
| candidate / summary | 15.012 | 101.330 | 15.063 / 75.685 | -0.051 / -0.34% | 11.868 (11.813-11.899) | 50.7 / 191.3 |
| baseline / summary | 15.500 | 89.844 | 15.063 / 75.685 | 0.437 / 2.90% | 11.766 (11.766-11.797) | 60.4 / 252.9 |

Controls: tx2-dxt1-p4-log-zero-a-1-baseline, tx2-dxt1-p4-log-zero-a-4-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
