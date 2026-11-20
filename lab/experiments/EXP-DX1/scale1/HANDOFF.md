# DX-SCALE1 handoff

The November 20 owner decision sets one Datomic database for all accounts. The current study measures ten full-size deep accounts in that database with the current writer and the audited prepared grouped writer. Both policies use the same ten writer clients, reader seats and feed observer. [Scale review](REVIEW.md) · [Write-path review](WRITE-REVIEW.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
The pooled 162,456,470-fact seed continues on the audited source with its existing 2026-11-21T04:24:01.788Z ceiling. The detached plan contains the published pilot and active pooled seed. The two-database seed and the earlier short timing arms were removed before start.
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
| 2 | Current writer, 12 matched five-minute pairs at each of 35, 50, 235 and 394 saves/s | 11.5 h |
| 3 | Prepared grouped writer, same image and tapes | 11.5 h |

The one-database plan is forecast at 34–38 hours from the pilot launch (USD 37.06–41.42). Campaign admission ends by November 21 at 7:09 p.m. ET, followed by controller cleanup. Both writers start from the same immutable seed with 64 reader seats on two worker cores. The 620/s headroom target requires a separately rated arm. [Forecasts](PREDICTIONS.md) · [One-database plan](decision/held-placement.json)

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The full-size arms keep absolute GC and safepoint logs for all three JVMs and per-save stage evidence. The single-account and pilot archives lack matched JVM pause logs, leaving their slow-save attribution unresolved.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.
