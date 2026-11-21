# DX-SCALE1 handoff

Server 2 accrued about USD 39.13 through 2026-11-21 06:24 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
AGE1 calibrated at 5,283.82 records/s from 429,778,659 native records. It verified 2,000,000 records over 100,000 saves, then stopped on the 1B time guard. This is below the fallback band. The exact checkpoint, complete terminal archive and stopped working volume are retained. The tuned scorecard has no aged input. Two additional fresh copies are being prepared while the tuned scorecard source is pending. Run that fresh card next.
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows active stages and their ceilings.

```sh
ssh -i "$DX_BENCH_KEY" -o IdentitiesOnly=yes "$BENCH_SERVER" 'sudo -n systemctl list-units --all "triplex-scale1-*"'
```

| Order | Item | Allocation |
| ---: | --- | ---: |
| 1 | AGE1 calibration and 1B rung from a private copied template | 9.9 h native maximum, with bounded setup and a stopped physical handoff |
| 2 | Tuned ordered v0.1 scorecard on the 1B database | Wait for the published source. Requires a verified 1B seal |
| 3 | Tuned ordered v0.1 scorecard on the fresh database | After the aged card, or first if AGE1 stops below 1B |

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The trimmed present-writer arm keeps absolute GC and safepoint logs for all three JVMs and per-save stage evidence. The single-account and pilot archives lack matched JVM pause logs, leaving their slow-save attribution unresolved.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.
