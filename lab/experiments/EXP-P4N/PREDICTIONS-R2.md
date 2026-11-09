# EXP-P4N round 2 predictions (committed before any round 2 measurement)

Predictions 10 to 16 of `PREDICTIONS.md` stand exactly as written (they are the brief's (c') predictions). Round 1 measured `final` at 627 pulls per
CPU-second and `sbe` at 726 to 736 (c=1 and c=4), so the brief's loaded-host figures for `final` (1,477 us) were roughly right and its "quiet host is
1.2x to 1.5x cheaper" was not. The builder's own expectations for round 2, against the measured round 1 row path, written down now:

| # | Quantity | Builder expectation | Falsified if |
| ---: | --- | --- | --- |
| R2-1 | `sdoc` hit path (prefilled, reads only), paired ratio to `final` | 0.38 to 0.50 (brief 10), most likely 0.40 to 0.45 | above 0.55 |
| R2-2 | `sdoc` hit path pulls per CPU-second, c=1, eligible segments | 1,300 to 1,700 (brief 11 says 1,600 to 2,300 on a quieter host than this one) | below 1,320 |
| R2-3 | Hit share, prefilled reads-only | at least 99.5% | below 98% |
| R2-4 | Cold (fill path), paired ratio to `sbe` | 1.03 to 1.10 (miss cost + 30 to 60 us, brief 16) | above 1.15 |
| R2-5 | Writer-on hit share (a commit every 20 pulls, half the reads on 200 hot owners) | 55% to 75% of owner lookups | below 40% |
| R2-6 | P5-prefilled sweep of 10,000 roots, per pull | about the hit path, within 10% of R2-1 | worse than `sbe` |
| R2-7 | `current.db` bytes at 10k | 85 to 100 B per fact (brief 15) | above 120 B per fact |
| R2-8 | P2 guard with fills running | PASS or INCONCLUSIVE (the host may not resolve 1.1x); not FAIL | FAIL |
| R2-9 | P1 long read of current.db | p50 delta within 0.5 ms; fills keep running | commit p50 delta above 0.5 ms |
