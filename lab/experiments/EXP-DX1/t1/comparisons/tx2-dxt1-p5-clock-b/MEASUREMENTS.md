# tx2-dxt1-p5-clock-b

Source d3375228c4ee974a6dbdfb1dfbea3652a11a07b9; one session, common host/VM sampling, 10,000 subjects, frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict). Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 16.823 | 120.509 | 16.280 / 134.644 | 0.543 / 3.34% | 9.661 (9.661-9.661) | 59.6 / 254.2 |
| server / summary | 16.689 | 157.420 | 16.280 / 134.644 | 0.409 / 2.51% | 11.383 (11.383-11.383) | 63.1 / 278.3 |
| server / summary | 17.012 | 407.484 | 16.280 / 134.644 | 0.733 / 4.50% | 11.398 (11.398-11.406) | 48.5 / 282.9 |
| baseline / summary | 15.737 | 148.779 | 16.280 / 134.644 | -0.543 / -3.34% | 11.684 (11.599-11.716) | 47.8 / 215.9 |

Controls: tx2-dxt1-p5-clock-b-1-baseline, tx2-dxt1-p5-clock-b-4-baseline. Each arm: 3530 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | server submissions | ordered submissions | clock replays | ticket wait total ms |
| --- | ---: | ---: | ---: | ---: |
| baseline | 0 | 3658 | 9 | 256.641 |
| server | 3649 | 0 | 0 | 0.000 |
| server | 3649 | 0 | 0 | 0.000 |
| baseline | 0 | 3654 | 5 | 581.138 |

| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |
| --- | --- | ---: | ---: | --- |
| baseline | 14.655 / 73.001 | 8.063 | 33396.1 | 9.661 / 71.4 |
| server | 12.031 / 42.527 | 7.679 | 34788.0 | 11.383 / 54.0 |
| server | 14.847 / 44.804 | 7.583 | 35389.2 | 11.398 / 43.3 |
| baseline | 12.479 / 41.086 | 8.127 | 32776.4 | 11.599 / 46.1 |
