# tx2-dxt1-p5-clock-a

Source d3375228c4ee974a6dbdfb1dfbea3652a11a07b9; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.

| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- | --- |
| baseline / summary | 13.558 | 82.178 | 13.703 / 77.109 | -0.145 / -1.05% | 9.739 (9.739-9.739) | 50.2 / 297.9 |
| server / summary | 14.173 | 75.517 | 13.703 / 77.109 | 0.471 / 3.44% | 9.723 (9.716-9.739) | 52.0 / 280.9 |
| server / summary | 14.066 | 195.325 | 13.703 / 77.109 | 0.364 / 2.65% | 9.700 (9.700-9.700) | 45.2 / 176.8 |
| baseline / summary | 13.847 | 72.040 | 13.703 / 77.109 | 0.145 / 1.05% | 9.700 (9.669-9.700) | 43.4 / 209.8 |

Controls: tx2-dxt1-p5-clock-a-1-baseline, tx2-dxt1-p5-clock-a-4-baseline. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.

| arm | server submissions | ordered submissions | clock replays | ticket wait total ms |
| --- | ---: | ---: | ---: | ---: |
| baseline | 0 | 3547 | 10 | 221.166 |
| server | 3536 | 0 | 0 | 0.000 |
| server | 3536 | 0 | 0 | 0.000 |
| baseline | 0 | 3543 | 6 | 105.885 |
