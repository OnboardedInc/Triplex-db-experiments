# DX-SCALE1 handoff

Server 2 accrued about USD 45.15 through 2026-11-21 11:55 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
The extended continuation is writing or maintaining as `triplex-scale1-v01-age-bulk-d`. Running at the last checked cut of **538,928,597 records**, native t 39,822,789. At the last completed cycle’s maintained rate of 10,033.06/s, the unfilled portion is 12.77 loading hours (USD 13.91). The policy is two completed cycles below 6,500 records/s, up to 26 paid loading hours from the original ladder, with the 400 GB cap and unchanged six-core profile. The prior hold archive, seed archive, stopped fresh template and two pristine fresh copies are retained. [Maintained load readings](AGE1-LOAD.md#extended-continuation-progress) · [Fresh scorecard](V01-FRESH.md)
<!-- end state -->

With the dedicated destination in `BENCH_SERVER`, this command shows active stages and their ceilings.

```sh
ssh -i "$DX_BENCH_KEY" -o IdentitiesOnly=yes "$BENCH_SERVER" 'sudo -n systemctl list-units --all "triplex-scale1-*"'
```

| Order | Item | Allocation |
| ---: | --- | ---: |
| 1 | AGE1 bulk ladder on the calibrated cut | 25 min setup cutoff, 60 min total (USD 1.09) |
| 2 | Tuned ordered v0.1 fresh scorecard | Up to 300 min after staging (USD 5.45) |
| 3 | AGE1 1B continuation | Exact held cut verified; two consecutive maintained cycles below 6,500 records/s stop, up to 26 paid loading hours (USD 28.34 cumulative) |
| 4 | Tuned ordered v0.1 aged scorecard | Requires a verified 1B seal |

`arm-d7-wfix-pilot-bounded` verified the options on its startup scope. On the restored scope the writer path received a response without the nonce. It recorded zero timed cells and cleaned up. The retry derives both roles from fresh replies at the original cut and verifies the active options through the same SDK clients that carry the measured writes. The pilot seed is reused from its original accepted transfer.

Each audited timed arm reads its actual writer gateway configuration at the restored database cut and binds the options, installed function, source, slot, nonce and clock into the result. The native gate also checks retrievable receipts, full feed changes and pinned field lifetimes. The single-account and matched pilot results are published. The trimmed present-writer arm keeps absolute GC and safepoint logs for all three JVMs and per-save stage evidence. The single-account and pilot archives lack matched JVM pause logs, leaving their slow-save attribution unresolved.

The first zero-reader and bounded-reader attempts stopped during observer startup because their inherited SDK environment named the retired `fresh-texts` flag. Each recorded zero timed cells. Both replacements use the verified `arm-d7-single-seed` image. The retry relay initially refused the reformatted Mac transfer manifest and then retried using the original server byte digest checked against the same collected content. The corrected launcher passes the stack's selected paths to the observer processes.

`arm-d7-single-zero-b` sealed two checked cells and the writer ledger for the five-minute plateau. Its feed waiter expired after four minutes. `arm-d7-single-read-b` was stopped during restore, before any offers, because it would reach the same waiter. Its stop hook initially lacked the explicit bare-metal environment. Recovery used the original source and exact slot and verified an empty stack. Both original records are retained. The replacement watcher budgets time from the end of the offered window.

Use `control.ts collect TAG` after a terminal arm. Compact transfer files bind the exact source and attempt. Raw writer and observer files, original seed ledgers and images stay on the server. Packaging can retry against the same first attempt.


## Before server disposal

| Hold | Copy to durable storage before deletion |
| --- | --- |
| AGE1 continuation at 514,741,853 records | The stopped PostgreSQL cluster in the held calibrated directory on the spare device. Preserve ownership and modes across all 1,511 files, along with internal WAL. Logical file bytes total 165,736,813,591. Verify tree SHA-256 `bb5e3d401234199b80e971fe200d0c2461a041b9e5b3a0e5df713a8c3968ef37` and the control digest against the stopped inventory. The continuation archive on the Mac already holds the matching application checkpoint and population, corrected qualification, maintenance logs and source identities. [Hold and archive hashes](evidence/age-v01-bulk-b.sha256) |
| Original sealed million-person seed | Copy `seed.pgdump` (131,838,300,610 bytes, SHA-256 `79337afadd5f4eaa7c0276b8aafd8ff63eb3b06a35c565eaa4c1c7de13ee981a`) with its original `image.json` and `transfer.json`. Their SHA-256s are `77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b` and `1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154`. |
| Stopped fixture-compatible fresh PostgreSQL | The fresh template manifest and one untouched copy are the physical input for another matched fresh card. Each copy is about 125.92 GB. The logical seed can regenerate this input. |
| Earlier originals held only on the server | Preserve the two compressed item 1 originals, 281,755,605 and 406,529,633 bytes, and the first reader-ladder failure tree (72.14 GB raw). The currently checked Mac item 1 folders contain summaries. [Original archive inventory](evidence/original-archives-server-only.sha256) |

The fresh scorecard, ladder, maintained continuation, full stopped inventory receipt and small custody records are already in the Mac evidence folder. The two database holds alone require about 297.58 GB before destination overhead. The Mac had about 13 GiB free at collection. Their database files remain on Server 2, and no deletion has been scheduled. The orchestrator owns server disposal.
