# DX-SCALE1 handoff

Server 2 accrued about USD 35.07 through 2026-11-21 02:40 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
2026-11-21T02:40:25.810Z · Collected arm-d7-wfix-pool-seed with service result success, 1 physical-scope report(s) and verified cleanup. arm-d7-v01-present started at 2026-11-21T02:40:03.543Z with execution ceiling 2026-11-21T05:40:03.543Z.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows active stages and their ceilings.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Item | Allocation |
| ---: | --- | ---: |
| 1 | Finish verifying and seal the existing full pooled seed | Existing 18 h native ceiling |
| 2 | Present writer at 35, 50, 235 and 394 saves/s with matched quiet windows | 3 h maximum |
| 3 | PREP1 adopted ordered per-person ceiling at 620 and 900/s; same-seed writer and gateway-count controls when available | 60 minutes plus build and archive verification for the ceiling |
| 4 | v0.1 fresh scorecard on adopted source 790d9e96e | 235 minutes |
| 5 | AGE1 calibration, then age to 1 billion native records if it fits | 9.9 h maximum |
| 6 | v0.1 scorecard on the sealed 1B database and hashed SQL dump | 235 minutes |

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The trimmed present-writer arm keeps absolute GC and safepoint logs for all three JVMs and per-save stage evidence. The single-account and pilot archives lack matched JVM pause logs, leaving their slow-save attribution unresolved.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.
