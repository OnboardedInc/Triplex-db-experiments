# EXP-P4N round 1 predictions (committed before any round 1 measurement)

Copied verbatim from BRIEF.md section 5.2 (planner: Opus 5.5, 2026-11-09). Round 1 builds steps 0 to 4 only (harness, quiet baseline,
(a), (e)); predictions 10 to 16 belong to (c'), which this round does not build, so they stay unmeasured. Committed before the harness
or any pull was run.

| # | Quantity | Prediction | Falsified if |
| ---: | --- | --- | --- |
| 1 | `final` in a GREEN window, c=1 | 800 to 1,000 pulls per CPU-second | above 1,100 or below 700 |
| 2 | Reference probe, quiet against round 3 load | 1.2x to 1.5x cheaper | under 1.1x |
| 3 | (a) text bytes per pull | 0.55 to 0.60 of `final` (about 46 to 50 KB) | above 0.65 |
| 4 | (a) reader statement, standalone | 0.72 to 0.80 of `final` | above 0.85 |
| 5 | (a) paired CPU ratio to `final`, in situ | 0.78 to 0.85 | above 0.90 |
| 6 | (e) GC sizing, paired against `s-a` | 0.90 to 0.97; other-thread CPU 191 to 100 to 150 us | above 0.99 |
| 7 | (e) port reuse, paired against `s-a` | 0.97 to 0.99 | above 1.0 |
| 8 | `s-ae` paired ratio to `final` | 0.66 to 0.78 (980 to 1,150 us loaded) | above 0.82 |
| 9 | `s-ae` in a GREEN window | 1,050 to 1,350 pulls per CPU-second | below 1,000 |
| 10 | `s-doc` hit path, paired ratio to `final` | 0.38 to 0.50 (560 to 740 us loaded) | above 0.55 |
| 11 | `s-doc` hit path in a GREEN window | 1,600 to 2,300 pulls per CPU-second; reader under 200 us, main 330 to 420 us | below 1,320 |
| 12 | `s-doc` p50 / p99 at c=1 | 0.4 to 0.7 ms / 2 to 4 ms | p99 above 6 ms |
| 13 | Commit p50 delta with fills running | -0.1 to +0.15 ms | above +0.5 ms |
| 14 | Commit p99 ratio with fills running | bootstrap interval contains 1.0 | lower bound above 1 + A/A band |
| 15 | `current.db` at 10k | 85 to 100 B per fact (380 to 450 MB); prefill 5 to 15 s | above 120 B per fact |
| 16 | Miss cost (row path plus fill) | `s-ae` cost + 30 to 60 us | + more than 120 us |

Round 1 additions (builder, same date, also committed before measuring):

| # | Quantity | Prediction | Falsified if |
| ---: | --- | --- | --- |
| R1 | P2 guard: commit p99 ratio, new path on vs off | about 1.0 (the new path is read-side only); resolution on this host is probably worse than 1.1x | bootstrap lower bound above 1 + A/A band |
