# DX-SCALE1 handoff

The current decision screen measures ten full-size deep accounts together, then partitions the same logical rows and tapes across two Datomic databases on the same server. Each topology gets the same ten writer clients, reader seats and feed observer. [Scale review](REVIEW.md) · [Write-path review](WRITE-REVIEW.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
2026-11-20T10:24:01.794Z · The matched pilot is published. The pooled 162,456,470-fact seed is active on the audited source. Its native ceiling is 2026-11-21T04:24:01.788Z.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows all active stages and their ceilings.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Arm | Maximum |
| ---: | --- | ---: |
| Done | Verified 100,000-person image, then identical zero-reader and 64-reader tapes | Both reported at 3:08 a.m. ET |
| Done | Verified grouped pilot with ten 10,000-person accounts and matched quiet windows | Published at 5:21 a.m. ET |
| 1 | `arm-d7-wfix-pool-seed` verifies ten 100,000-person accounts in one database | 18 h |
| 2 | Pooled current and prepared grouped writers in separate restores of that image | 5 h per arm |
| 3 | Split seed with the same logical data in two databases on the same box | 18 h |
| 4 | Split current and prepared grouped writers in separate restores of that image | 5 h per arm |

The placement plan is forecast at 35–39 hours from the pilot launch (USD 38.15–42.51). Campaign admission ends by November 21 at 7:09 p.m. ET, with five minutes reserved for controller cleanup. Its pooled and split restores retain the same logical data, tape and resource placement. The 620/s headroom target requires a separate measured arm if the four placement cells hold. [Forecasts](PREDICTIONS.md) · [Placement plan](decision/held-placement.json)

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The existing Q106f tiered-storage ruling remains an input while the owner clarifies production placement.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.
