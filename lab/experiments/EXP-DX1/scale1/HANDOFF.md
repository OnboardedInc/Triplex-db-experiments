# DX-SCALE1 handoff

Server 2 accrued about USD 40.76 through 2026-11-21 07:53 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
The AGE1 ladder finished every window at 07:46 UTC. It held at 477,456,017 records after the pinned index ID filter refused qualification. Raw matching events show 59, 44 and 30 automatic index adoptions. The best diagnostic rate was 18,081.59 records/s. The checked 65.09 MB archive is on the Mac. The moved working volume is held on the spare device under the same registered name. All 1,495 stopped PostgreSQL files matched. The fresh tuned scorecard built and is queued behind the remaining two verified data copies. Its 300-minute native clock starts after staging. No full load is queued. [Rates, capacity and archived evidence](AGE1-LADDER.md)
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows active stages and their ceilings.

```sh
ssh -i "$DX_BENCH_KEY" -o IdentitiesOnly=yes "$BENCH_SERVER" 'sudo -n systemctl list-units --all "triplex-scale1-*"'
```

| Order | Item | Allocation |
| ---: | --- | ---: |
| 1 | AGE1 bulk ladder on the calibrated cut | 25 min setup cutoff, 60 min total (USD 1.09) |
| 2 | Tuned ordered v0.1 fresh scorecard | Up to 300 min after staging (USD 5.45) |
| 3 | AGE1 1B continuation | Only with a qualifying ladder arm at or above 9,900 records/s. Up to 16 loading hours including the ladder (USD 17.44) |
| 4 | Tuned ordered v0.1 aged scorecard | Requires a verified 1B seal |

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The trimmed present-writer arm keeps absolute GC and safepoint logs for all three JVMs and per-save stage evidence. The single-account and pilot archives lack matched JVM pause logs, leaving their slow-save attribution unresolved.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.
