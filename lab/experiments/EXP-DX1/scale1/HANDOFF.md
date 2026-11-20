# DX-SCALE1 handoff

The current decision screen measures ten full-size deep accounts together, then partitions the same logical rows and tapes across two Datomic databases on the same server. Each topology gets the same ten writer clients, reader seats and feed observer. [Review response](REVIEW.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
The original staggered writer stopped at 03:37 UTC on a missed phase start and released its stack. Its checksummed summary is collected and its first raw archive is retained for diagnostics. The first decision seed exited during CPU admission before it started a database or issued traffic. The retry admits native CPU roles from the setup mask, then pins the sender to its assigned core and proceeds to the W1 bounded prerequisite.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows all active stages and their ceilings.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Arm | Maximum |
| ---: | --- | ---: |
| 1 | Existing staggered 10k write-capacity arm | Existing ceiling |
| 2 | 10k per account pooled receipt-verified seed, then W1 bounded writer | 3 h each |
| 3 | 100k per account pooled receipt-verified seed | 18 h |
| 4 | Full pooled layout, individual then W1 prepared, from the same restored image | 5 h each |
| 5 | Identical rows across two physical databases, then individual and prepared from the same split image | 18 h seed and 5 h per execution |

The queue caps additional service time at 38 hours, about USD 41.42 at the booked rate. Expected time is 22–30 hours. A clean pooled result through 394/s still requires a separately named 620/s headroom test before an affirmative placement decision. The former long reader arms, 100-database open experiment and standalone activation are deferred.

Each native arm has a separate unit, source, slot, nonce and verified cleanup. Before a timed arm, the runner checks the latest public W1 ref, the actual gateway flags and a six-save native preflight, including a pinned two-account read. An admitted pooled and split pair holds routing, reader tape, ten sender clients, CPU placement, heap caps and restore/open sequence fixed. The reader pair reproduces the same 60 seconds of scheduled tape within each 90-second cell, giving 600 seconds of observation in total per treatment. Cold data, pre/post field cuts and feed rows are checked independently of that reader sampling.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. The queue retries evidence packaging against the same attempt. A checker failure carries its own status and does not restart measured work.
