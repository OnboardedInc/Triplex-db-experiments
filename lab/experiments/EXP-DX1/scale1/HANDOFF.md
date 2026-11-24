# DX-SCALE1 handoff

Server 2 accrued about USD 49.51 through 2026-11-21 15:55 UTC, at USD 1.09/hour from November 19 at 18:30 UTC. The owner fixed the v0.1 budget at USD 200 across both servers. The campaign uses one database. [Run order and timings](V01-CAMPAIGN.md) · [Forecasts](PREDICTIONS.md)

<!-- state -->
**State at 02:55 UTC on 2026-11-24 (Server 2 deleted).** The last arm (random subjects with 6 and 12 read permits) finished at 02:51 UTC. **Server 2 was deleted at 02:53:08 UTC (reason "queue empty"); Latitude returns 404 for it. Final cost USD 113.78 (104.38 h).** All four rentals are now deleted, for USD 247.62 in total.

Runs finished tonight (seven), each published with its predictions and its evidence on the Mac (checked by SHA-256 on both sides):

| Run | Build | Result | Page |
| --- | --- | --- | --- |
| Server-32 card at 1B | `0d9693de0` | 394 offered: 394.00/s stored, 0 expired; 620 offered: 302.61/s | [V01-AGED-S32.md](V01-AGED-S32.md) |
| Pinned-read fix pair and tuned arm | `dc34aa18d`, `64c70e549` | See the page | [RD2-PROBE.md](RD2-PROBE.md) |
| Production-S card at 1B | renderer `6c4f9e4fe` | 2.86 / 13.43 / 23.08 / 36.02 commits/s, 0 expired, p99 under 50 ms; exact re-assembly matched | [V01-AGED-PROD-S.md](V01-AGED-PROD-S.md) |
| Console proof | `ebe31628f` | 3 checks failed | [CONSOLE-1B.md](CONSOLE-1B.md) |
| Fixed owner head pair | `85fc3a4bd` | Both arms stored every save; the treatment summary refused at `summarize.py:125` | [OWNER-HEAD-1B.md](OWNER-HEAD-1B.md) |
| Pinned readers with saves | `e02bf4edf` | 10 windows, 0 wrong values, 23.08 commits/s beside 256 readers; random subjects at 1.5 to 2.0 loads per subject, inside the model; both tape windows limited by the driver | [RD2-PROBE.md](RD2-PROBE.md) |
| Random arm, 6 then 12 read permits | `d94dff145` | `p6` 1,477 to 1,586 reads/s; `p12` 6 to 13% more; no sizing falsifier fired; 0 wrong values; p99 258 to 305 ms, over the 100 ms bar; `p12` ran under its own parent directory because the published command shares `ladders/` | [RD2-PROBE.md](RD2-PROBE.md) |

**What survives the deletion.** The 1B sealed cluster and the fresh full-size template are in Latitude object storage (bucket `triplex-bench-databases`, `aged-1b/` and `fresh-a/`, verified by SHA-256). Every run's compact evidence is in the private evidence folder under `DX-SCALE1/`, `DX-DEMO1/` and `DX-CON1/`. The two server-only item 1 originals were copied to the Mac earlier.

**What is lost with the deletion, and was never copied anywhere:**
- The 1B native backup (110 GB).
- The restored copy of the 1B database (111 GB).
- The original seed `seed.pgdump` (131.8 GB). The fresh template in object storage regenerates its physical input.
- The raw window files of each arm (operations logs, GC logs). Only the compact archives came back.
- The images and builds.

The temporary key that let Server 2 copy to bench 4 was removed from bench 4 at 02:20 UTC; bench 4 now refuses it. The key was then deleted on Server 2.

**State at 20:25 UTC on 2026-11-23.** Done on Server 2 today: the 1B seal (readback repaired, bundle `faab1bc5…`), both databases uploaded to object storage (`aged-1b/`, `fresh-a/`), the aged scorecard at `6770c37ba` with all four parts assembled, the demo proving slot (17 calls, 18 checks passed) and the pinned-read probe. Next: failover as role A, the server-32 card at `0d9693de0`, the owner head pair at `3d4320155`, the demo proof rerun. Server 2 has accrued about USD 106.7 (97.9 h at USD 1.09/hour); it is deleted by 04:30 UTC on 2026-11-24 at the latest. [Aged card](V01-AGED.md) · [Demo](DEMO-1B.md) · [Probe](RD2-PROBE.md)

Opus driver took over Server 2 on 2026-11-23 at 15:15 UTC. **The 1B load finished by itself at 2026-11-22 03:18 UTC: 1,000,002,769 indexed records, native t 62,876,498, 27 cycles, PGDATA 176,382,197,760 bytes.** The server then sat idle for about 36 hours. Server 2 has accrued about USD 101.3 (92.9 h at USD 1.09/hour); the project is about USD 23 over its USD 200 budget. The owner kept the server until 01:30 UTC on 2026-11-24 for the aged scorecard and then the 32 GiB cache arm; the driver deletes it. [Final load table](AGE1-LOAD.md#extended-continuation-progress)

**Failover (P9) runs first, from 16:59 UTC on 2026-11-23: Server 2 is role A, bench 4 is role B (INT1 `8ab832093`, about 206 min).** The orchestrator ruled that failover runs while a builder repairs the AGE1 restore readback on the Mac. After failover, the driver runs the repaired readback on the retained restored copy, writes the seal and bundle, and runs the four scorecard arms. Nothing else runs on Server 2 while role A runs.

Copies to bench 4 before failover, each checked by per-file SHA-256, mode and owner lists on both sides:

| Copy | Files | Bytes | stoppedInventory treeSha | Transfer |
| --- | ---: | ---: | --- | ---: |
| Held 1B cluster at t 62,888,918 (1,000,251,169 records) | 1,644 | 176,078,992,377 | `723f693f566891f9941d858b09fef21c6080d0b32165a99cda3559871cd07770` | 166 s |
| Fresh SCALE1 template, cut 87,002, with `sealed-pgdata.json` | 1,452 | 125,923,989,950 | `fc501b6a14066d711222dbe202febbc9d911d3b4121c862f550fac0d92a7b24a` | 107 s |

Role A staging: bench 4's INT1 images loaded (4 of 4 IDs match), build extracted, seed staged from the untouched fresh template (seedSha256 `291bf0b02ae4171c9033ea3d27a95d52cb976e74c6e4480269a72dfa17a8fc6f`, equal to bench 4's). The exact load-cut safety copy and about 170 GiB of old builds and arm seeds were deleted for space, with approval. The two server-only compressed item 1 originals were first copied to the Mac evidence folder (SHA-256 `816e5a59810ab9b9a8fcd8c26a16d22aa0e74bc68ce1a734d2bdf513bf822629` and `7311a451481990a8aa5b303b4ed3953af29b3a19cdfecdaa3c1ec92f41a4d454`).

**Blocked at 16:44 UTC on 2026-11-23: `measure-loaded` failed at the restore readback, so no aged bundle exists and the aged scorecard cannot start.** The readback peer cannot connect to the restored database because no transactor runs on the separate restore storage. Backup (110 GB, 13 min 36 s), full verify (6,018,339 segments, none missing) and restore (33 min 51 s) all passed. [Fault, measurements and options](V01-AGED.md#seal-result-stopped-at-the-restore-readback-no-aged-bundle)

Server 2 cost about USD 102.8 by 16:50 UTC (94.3 h at USD 1.09/hour); the project total is about USD 224.6. The driver deletes the server by 04:30 UTC on 2026-11-24 at the latest. A second server (bench 4) now runs the 32 GiB cache arm and the failover run with this one. Server 2 has pushed the fresh template to bench 4 and fetched bench 4's failover build and images (not loaded).

**Why `measure-loaded` runs:** the scorecard's `--aged-bundle` must be a `triplex-age1-scorecard/1` file, and the only writer of that file, `age1/scorecard.mjs` `writeScorecard`, requires the seal's `seal.log` and `restore-readback.log` events from `server.mjs measure-loaded`. That command runs a 120-second matched save window, cold reads, the native backup, full verify and restore, then seals. So the scorecard cannot start without the native backup and restore; nothing was skipped.

Before measuring, the exact 1B load cut was copied to the root NVMe as a stopped safety copy and its full inventory (files, modes, tree SHA-256) is checked against the held cluster. Measurement then runs in place on the held cluster on the spare NVMe (`age-v01-bulk-c`, controller `28e5e59ee`, AGE1 `d90b3728f`, budgets: directory 400 GB, backup 200 GB on spare, restore 200 GB on root).

Predictions written before launch: safety copy 20–30 min with identical inventory (the copy took about 2.5 min; the inventory comparison was running at publication). `measure-loaded` 2.0–3.5 h: the 120 s windows offer 420 quiet and 6,000 busy saves, all acknowledged; native backup 100–150 GB (preflight 125 GB), backup 0.5–1.0 h, full verify 0.3–0.6 h, restore 0.5–1.0 h; seal cut above 1,000,002,769 records and t 62,876,498 with matching restore readback. Wrong if the backup exceeds 200 GB, verify reports missing or unreadable segments, the readback differs, or the run passes 4 h.

Next: the four scorecard arms at `8cc32d380` in the tool's enforced order 1→4 (headline without P1 readers, headline loaded, default server, grouped), each on a fresh scratch copy of the sealed cluster on the root NVMe with WAL on the spare NVMe, as the fresh card did; then the 32 GiB cache arm when its 1B document is published.
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
