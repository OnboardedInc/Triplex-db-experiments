# DX-SCALE1 handoff

Server 2 accrued about USD 38.82 through 2026-11-21 06:07 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
AGE1 is running first from a private checksum-bound copy of the stopped fresh template. The default scorecard retry was canceled before it claimed a copy or produced cells. The completed first zero-reader arm is archived. Free space before AGE1 was 375.74 GB on root and 703.31 GB on the secondary drive. We retained the template and one untouched scorecard copy and released three disposable copies to meet the 579.57 GB secondary reservation. The executable-mode repair reached a running transactor. The first Datomic peer received a stale discovery endpoint, so no calibration segment ran. Recovery reopens the same private working volume only after proving the failed discovery and absence of load, then verifies a fresh peer at the exact source cut. The first readiness probe lacked the AGE1 codec path and recorded zero native admissions. That path is now explicit. The native cap remains 9.9 hours. Wait for the tuned scorecard pin. Run aged before fresh if the 1B seal exists.
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
