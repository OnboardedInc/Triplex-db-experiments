# DX-SCALE1 handoff

Server 2 accrued about USD 33.23 through 2026-11-21 00:59 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
The pooled seed's full loader ledger has 1,000,000 people, 162,456,470 facts and 87,001 acknowledged frames. The verifier checked every durable claim and had replayed 75,500 of 87,002 feed positions by November 21 at 00:57 UTC. The immutable image and transfer follow the replay. The current seed ceiling is 2026-11-21T04:24:01.788Z. The superseded two-writer relay is stopped. The active seed and its original controller were left running. The detached v0.1 present-writer relay is waiting for the verified seed transfer. It is pinned to 46deaaedb with a three-hour native ceiling.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows active stages and their ceilings.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Item | Allocation |
| ---: | --- | ---: |
| 1 | Finish verifying and seal the existing full pooled seed | Existing 18 h native ceiling |
| 2 | Present writer at 35, 50, 235 and 394 saves/s with matched quiet windows | 3 h maximum |
| 3 | PREP1 grouped and per-person writers with 1, 2 and 4 write gateways | Six hours of nominal arm ceilings after compatible fast restores |
| 4 | v0.1 fresh scorecard on adopted source 790d9e96e | 235 minutes |
| 5 | AGE1 calibration, then age to 1 billion native records if it fits | 9.9 h maximum |
| 6 | v0.1 scorecard on the sealed 1B database and hashed SQL dump | 235 minutes |

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The trimmed present-writer arm keeps absolute GC and safepoint logs for all three JVMs and per-save stage evidence. The single-account and pilot archives lack matched JVM pause logs, leaving their slow-save attribution unresolved.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.
