# Version 0.1 readiness

Rewritten on 2026-11-23 (night) by the integration builder from the measurements of that day, after the evening's
merges onto `exp/DX-INT1`. One row per priority: the bar, the latest measured value at 1 billion records and on the
fresh database (430 million records, ten deep accounts of 100,000 subjects), the settings it was measured with, the
verdict and the next step. Mac clocks are never used here; every number below is from a rented bare-metal server
(12 cores, 96 GB, two NVMe drives). Bars are from `lab/TARGETS.md` on `main`; the owner's rulings from `lab/V0.1.md`.
The earlier merge-trial tables of this page are in its history (`git show 61a794c1d:lab/experiments/EXP-DX1/v01/READINESS.md`).

**The 1 billion database:** AGE1's sealed cut, t 62,888,918, head 28,309,866, 1,000,251,169 records. Its 28.2 million
aged saves fall on 2,000 subjects per account (about 1,400 saves each); every other subject is a seed subject.
**Tapes:** "Saturday's tape" sends nearly every save to a subject not seen before; the "production-shaped tape"
follows the production write study (39 / 69 / 82% of saves within 10 s / 60 s / 5 min of the same subject's previous
save) in two commit shapes: R, one commit per form row, and S, one commit per subject's save.
**Profiles:** `server` = transactor 3 cores, 24 GiB heap, 16 GiB object cache; one read-gateway core with a 1.5 GiB
cache. `server-32` = the same with a 48 GiB Java 25 ZGC heap and a 32 GiB object cache. **Credits:** "whole-turn" is
barrier 6 (the default); "per-save" is rolling 6.

## The nine priorities

| Priority and bar | 1 billion records | Fresh (430 million) | Settings | Verdict | Next step |
| --- | --- | --- | --- | --- | --- |
| **P1 Pinned reads.** At 256 readers: 0 wrong reads; goodput not below the 64-reader level; read p99 ≤ 100 ms; writer commit p99 ≤ 1.25× its zero-reader value. At 1,024: goodput ≥ 0.9 of the 256 level. | **Default reader:** 18 to 20 reads/s at every ladder step at the old pin (87,002), 256 seats p99 13,566 ms; 0 wrong values. **Both pinned options, one core:** 478.80 reads/s at 256 seats (p50 516 ms), 0 wrong. **Tuned reader with shape S saves running, re-read subjects:** old pin 8,879 reads/s, p99 **99.33 ms**; near the head 8,960 reads/s, p99 112.13 ms. **Random subjects, with saves:** 1,216.6 reads/s, p99 323.58 ms (3 permits); 1,585.8, 266.24 ms (6); 1,747.2, 258.05 ms (12). S commit p99 beside readers 52.48 to 64.77 ms against 55.55 alone (up to 1.17×). 1,024 seats (no saves): 1,482 reads/s near the head against 12,375.9 at 256 (collapse). 0 wrong values in every window. | Fresh card (2026-11-21, default reader): 893.2 reads/s at 256 seats, p99 860.16 ms; 1,560.8/s at 64; 509.4/s and p99 2,375.68 ms at 1,024. | Card: `server`, one read core, options off. Tuned arm (`rd1/PINNED-1B.md`): `server`, three read cores, 3 GiB read cache, 3 / 6 / 12 read permits, both pinned options, batches of up to 8 subjects, early filter, 256 seats, 90 s windows, shape S at 23 commits/s. | **Not met.** Met only for re-read subjects at the old pin with saves (99.33 ms); near the head 12 ms over; random subjects 2.6× over; the 1,024-seat stress level collapses. | Owner decision: must the bar hold for subjects not in the reader's memory in 0.1? The model (not refuted) needs about 3,600 reads/s, about 7 reader cores with permits about twice the cores, so a reader machine; no affordable cache holds the working set (0.7 to 1.1 TB). Make the pinned options and the tuned reader defaults (below). The 1,024 collapse is the 3 GiB cache thrashing (1.43 to 1.78 loads per subject). |
| **P2 Commits.** p50 ≤ 10 ms and p99 ≤ 50 ms with P1's 256 readers running; the pull at the returned position sees the commit; duplicates and lost replies return the original receipt. | **Production-S card** (90 s cells, every commit durable, 0 expired, every field read back exactly): shape S commits p50 / p99 14.91 / 66.56 ms at 50 rows/s, 11.65 / 43.01 at 235, 10.69 / 45.31 at 394, 12.10 / 48.64 at 620; all loaded saves including the quiet account 5.66 / 57.6, 8.96 / 40.96, 9.34 / 44.03, 11.39 / 46.59 ms. Out of card, 300 s at 394: S second-half p99 40.6 ms; R 430 ms (32 GiB) and 713 ms (16 GiB). **With 256 readers:** S commit p50 / p99 7.46 / 52.48 ms (old pin) and 8.06 / 64.77 (near the head). **Saturday's tape:** 394 stored at 394 offered with p99 11,010 ms (`server-32`, per-save); 249.41/s with 5,523 expired (`server`, whole-turn). | Production tape, 300 s at 394: S 23.06 commits/s, p99 42.0 ms whole, 41.5 ms second half, save completion 42.8 ms; R 393.13 rows/s, 157 ms second half, completion 237 ms. Fresh card (Saturday's tape): reference tape p50 / p99 5.57 / 24.58 ms alone, 5.60 / 22.53 ms with readers; 342.90/s stored at 394. | Card: `--tape production-S --profile server-32 --credit-mode rolling6 --window-seconds 90` (build `090c189a8`, renderer `6c4f9e4fe`). Out of card: REAL2 runner, rolling 6, 300 s. With readers: the tuned reader arm above, `server`. | **Not met.** p99 is inside 50 ms at 235 to 620 for one commit per save without readers, but p50 is 0.7 to 4.9 ms over 10 ms, p99 is 66.56 ms at 50/s, and with 256 readers p99 is 52 to 65 ms. One commit per row (R) and Saturday's tape are far outside. Receipts and read-back: exact in every cell. | Owner decision: one commit per subject's save as the product's save shape (it is the only shape near the bar). Then: the p50 (10.7 to 14.9 ms on S commits) and the 50/s cell's tail. |
| **P3 Ordered feed.** 0 gaps and 0 order violations per subject; resume replays exactly; lag p99 ≤ 250 ms with 256 readers. | Production-S card: 1,260 ordered exact changes; dispatch-to-observation p99 288.8 ms. On this loader-built database the SDK refuses the feed from before the aged head (non-canonical journal rows; H11). | Fresh card: 1,260 exact ordered changes with readers, lag p99 98.30 ms. | Card as P2 (one read core). | **Not met at 1 billion** (288.8 against 250 ms); lag met on fresh. Resume after a crash not measured on a server. | Find the 1 billion lag (the card ran the one-core reader); bound the gateway's journal routes with a cursor (H11.3); the loader must write canonical journal rows before it is used again. |
| **P4 Current pulls.** Single-client p50 ≤ 5 ms, p99 ≤ 25 ms; ≥ 1,100 pulls/s per core; flat as history grows. | p50 / p99 4.35 / 44.54 ms (production-S card); 4.42 / 46.59 (`server-32` card, Saturday's tape); 4.22 / 47.10, max 33,179 ms (`server` card). | 4.54 / 50.18 ms (fresh card). | Card pulls beside the card's save loads, one read core. | **Not met.** p50 met; p99 about 45 to 50 ms against 25. Throughput per core and flatness with depth not measured. | Attribute the p99 (pulls run beside saves on one read core); measure depths 1, 3 and 10. |
| **P5 Publish.** Per account of 100,000 subjects, under one second to the permanent record and every read returning the new answers; live read and commit p99 ≤ 1.5× without Publish. | Not run. | **100,000 subjects** (ACT3 runner `f5f8c09ff`): small release 100 of 100 Publishes inside 1 s in 11 windows, first correct answer p50 31.6 to 45.3 ms, p99 50.9 to 421.4 ms; large release (20 forms, 20 policies) 120 of 120 inside 1 s, p50 32.1 to 67.3, p99 55.2 to 322.8 ms. Live saves at 39.4/s during Publish: p99 1.7 to 2.3× the control (small release); at 3.5 and 23.5/s at or under 1.1×. First release settled in the background: values 14.5 min, notices 19.2 min (no bar). A large release's background settlement cannot finish (frames exceed the writer's bound). | `server`, whole-turn and per-save credits, live saves at 3.5, 23.5 and 39.4/s, two Publishes per window. | **Under one second: met** at 100,000 on fresh. **Live traffic: not met** at 39.4 saves/s. Not measured at 1 billion. | Diagnose the slowdown at 39.4/s (H11.5); size settlement frames by bytes (H11.6); owner decision on "at least" reads for receipt holders (H11.4); run at 1 billion. |
| **P6 Quiet account.** Commit, pinned-read and feed p99 loaded / alone ≤ 1.25, or loaded commit p99 ≤ 50 ms; 0 wrong reads; no expiries. | Production-S card: quiet commit p99 alone → loaded 18.94 → 12.16, 14.34 → 20.74, 13.70 → 17.54, 32.26 → 21.25 ms at 50 / 235 / 394 / 620; 0 wrong; 315 commits per side (the card requires 500). Saturday's tape, `server-32` per-save: loaded 43.52, 57.09, 34.81, 47.62 ms. Quiet pinned reads with the one-core reader missed about two thirds of their offers (0 wrong). Beside 256 tuned readers: 22 to 35 ms; 52.22 and 59.13 ms in the random quiet-stream window (6 and 12 permits). | Production tape: quiet p99 22 ms (R) and 24.0 ms (S). Saturday's tape, rolling 6: 43.91 / 54.00 / 61.79 ms at 235 / 394 / 620. | As P2. | **Commit clause met** on the production-shaped tape at every load at 1 billion (card line PARTIAL: 315 commits per side against 500). Not met on Saturday's tape at 235 at 1 billion or at 394 and 620 fresh. Read and feed ratios not measured. | Cells long enough for 500 commits per side; quiet reads with the tuned reader; the 52 to 59 ms window. |
| **P7 Cost follows activity.** ≤ 64 B per never-touched subject outside PostgreSQL; idle scope cost per role; cold first read p99 ≤ 100 ms. | First pull p99 86.0 ms. Added resident bytes per roster subject 53.0 B transactor, 375.0 B write gateway, 267.8 B read gateway (production-S card). | First pull p99 66.56 ms; 16.9 / 55.4 / 70.3 B (fresh card). | Card restore-to-empty footprint, not a population slope. | **Cold read met** at both sizes. **Bytes per subject not met** as measured (about 700 B at 1 billion, 143 B fresh), and the measure is a boot-to-boot footprint, not the bar's slope. | Two matched population rungs at fixed activity. |
| **P8 Import beside live traffic.** Other accounts' read and commit p99 ≤ 1.5× baseline; ≥ 3,000 facts/s. | Card paced import 3,266 facts/s with save p99 19.98 ms and read p99 6.27 ms (production-S card); 3,250 facts/s (`server` card). Ratio not measured at 1 billion. | Live-first import, 48 GiB heap, 32 GiB cache, memory index 512m: 3,671 facts/s (3,454 second half), busy p99 36.4 ms = 3.05× its 12.9 ms baseline, quiet 32.5 ms, worst read ratio 1.46×. With the 256m index: 3,321 facts/s, 45.1 ms (4.6×). 16 GiB / 24 GiB heap: 3,059 facts/s, 103.7 ms. | `load1/fair-server.sh --import-policy yield`, 32-fact frames, rolling 6. | **Rate met; ratio not met** (3.05×). Busy p99 is inside 50 ms, so an absolute 50 ms clause (asked of the owner) would be met. | Owner decision on the 50 ms clause for busy accounts; the deep (16 million facts) and wide (4.5 million subjects) imports are not measured. |
| **P9 Machine loss and moves.** 0 acknowledged saves lost; saves resume ≤ 60 s; pinned reads continue; a planned move pauses one account ≤ 30 s. | Not run. | Two machines, 235 saves/s: **policy B** 0 of 2,830 lost, first protected save after 603.4 s (local copy 131 s, SHA-256 452 s), reads continued (first 16.5 ms, longest gap 47 ms, 0 of 30,172 missed). **Policy A** 0 of 4,885 lost, 19.5 s. **Planned move** 0 of 4,146 lost, 14.1 s. | HASYNC1 pair `b03e806fd`, direct WAL path, autovacuum off. | **Policy B (version 0.1):** zero loss and reads met; 60 s not met, accepted by the owner. Planned move met. | Skip the re-hash of an already verified seed (about 2.5 min instead of 603 s); fix the second-failure check (it reads the fenced disk through the killed transactor on port 4334); policy C for 1.0. |

Sources: `lab/experiments/EXP-DX1/STATUS.md` on `lane/d-native`, entries of 2026-11-23; the result pages now on this
branch: `scale1/V01-AGED.md`, `V01-AGED-S32.md`, `V01-AGED-PROD-S.md`, `RD2-PROBE.md`, `OWNER-HEAD-1B.md`,
`bm1/PUBLISH100K-READING.md`, `STARTUP-AGED-READING.md`, `OWNER-HEAD-READING.md`, `PRODUCTION-TAPE-READING.md`,
`AGED-CACHE-READING.md`, `FAILOVER-READING.md`, `IMPORT-YIELD-READING.md`, `rd1/PINNED-1B.md`,
`actv-lazy/LARGE-RELEASE.md`, `actv-lazy/PUBLISH-STOP.md`.

## Launch faults found on servers on 2026-11-23

Faults 1 to 15 were recorded in part 15 of [V0.1-STATE](../int1/V0.1-STATE.md#launch-faults-found-on-servers-on-2026-11-23)
before 16:00; they are repeated here in short with the evening's faults after them.

| # | What faulted | Where | Fixed |
| --- | --- | --- | --- |
| 1 | The 1 billion seal's readback could not connect (a restore does not copy the transactor's location row) | `age1/server.mjs measure-loaded` | AGE1 `bb9ec7324` (`resume-readback`) |
| 2 | The resume crashed after writing the seal (`.trim()` on null) | `age1/resume-host.mjs` line 20 | `4e64e0d97` |
| 3 | The 32 GiB cache arm at 1 billion refused the aging loader's journal position rows | `prep1/ceiling-seed.ts` | PREP1 `1bbaf54cd` |
| 4 | The start-up read's copy of the same check | `jvm1/startup-aged.ts` | JVM1 `968285954`, `8805f75c9` |
| 5 | The scorecard's fresh-peer aged check could not resolve the transactor's container name | `age1/scorecard.mjs` via `v01/adopted-server.ts` | `71cfed6cb` |
| 6 | A refused scorecard part consumed its campaign directory | `v01/sequential.ts` | `71cfed6cb` |
| 7 | Card part 2 refused at the residency listing (`docker top`, Docker 29.1.3) | `thin1/native-metrics.ts` | On the branch (the change of `92f8e6c30`); the card's pin predated it |
| 8 | Failover case 1: the staged seed kept mode 0400 on `global/pg_control` | the second machine's staging | Environment; the driver |
| 9 | Failover case 2: the standby started about 21 GB behind and could not catch up through the tunnel | `hasync1/pair.ts` line 337 | HASYNC1 `b03e806fd` |
| 10 | The start-up read runner and the import path had no first-offer hook; `startup-server.sh` dropped the dry-run variables | `jvm1/startup-server.ts`, `.sh`; `load1/fair-campaign.ts` | `b620c565e`, `c01b20c69` (the driver's runs used JVM1 `968285954`, which predates them) |
| 11 | The collector asserted the fresh head 87,002 after the aged cache arm's windows | `prep1/server-collect.py` line 281 | REAL2 (`seed_head`); test `607c46e8b` |
| 12 | The production launch refused at the prepared-copy allowlist with nothing printed | `stack/up.sh` | REAL2 `4ee421c87` |
| 13 | Shape S refused at its first commit of more than 256 assertions | `packages/datomic/src/orderedSaveIdentity.ts` line 47 | REAL2 `092a76916`, `32ca969bb` (the general identity for such a commit) |
| 14 | The owner-head pair at 1 billion needed a logical dump that does not exist | `v01/study-server.ts` | `1f4dad810` |
| 15 | The pinned probe's 12 GiB reader-cache pass refused at peer start | `rd1/pinned-probe-server.sh` | Not fixed (a probe setting no launcher uses) |
| 16 | Owner-head pair on fresh: the summary refused other event kinds in the lookups file | `w1/serial/summarize.py` line 149 | W1 `3cf8e4843` |
| 17 | Owner-head pair: the read sampler took a new cut after reading, so a save of the same subject in between failed a correct store (14 errors, windows unjudged) | `w1/migrated-reads.ts` | W1 `3cf8e4843` (pins at the saved position; 0 errors in both later pairs) |
| 18 | Owner-head pair at 1 billion: the summary required the reference function in the owner-head arm | `w1/serial/summarize.py` line 125 | W1 `6cae9ba1b` (the server run of the fresh pair met it too; both summarised on the Mac) |
| 19 | Production-S card assembly: rows whose due time rounds to the cell's end | `v01/windows.ts` line 16 | CARD1 `d79d3686c`, `8663ff19e`, `6c4f9e4fe`; exact re-assembly on the server matched |
| 20 | Publish at 100,000, per-save window: a probe answered at a basis before an acknowledged Publish (the read gateway's peer trails the write gateway) | `actv-lazy/join/held-campaign.ts` line 417 | Runner: ACT3 `766ff8167`, `9848a7a7f`, `cb282d6b2` (recorded as a visibility failure, later windows run). Store: not changed (owner decision) |
| 21 | Console proof at 1 billion: the first release on an empty store could not reference `Subject` | `examples/demo-mcp` releases | CON1 `333db33db` |
| 22 | Console journal on the 1 billion copy: a journal page walked the loader's 28 million position rows under the single journal permit | gateway `journal.clj` `page`, `entity-positions` | Console side: CON1 `fff5ba67a`, `a7083cb4e`. Gateway bound: not fixed (H11.3) |
| 23 | Pinned arm with saves: `savesWindows` used before initialization | `v01/study-server.ts:305` | RD1 `e02bf4edf` (`v01/saves-arm.ts`, a Mac harness, a dry run into the window driver) |
| 24 | Random arm: two configurations under one parent shared `ladders/` | `rd1/prepared.ts:85` | `a1d2473f8` (the document; the refusal names the cause) |
| 25 | Failover second-failure check read the fenced disk through the transactor the first fault had killed | `hasync1` old-disk check | Not fixed |
| 26 | The aged cache arm's collector was patched by hand on the server | `prep1/server-collect.py` | Already in the repository (fault 11) |
| 27 | Shape R cannot be assembled on the production tape (rows scheduled up to 67 ms past each cell's end) | `w1/field/production.ts` | Not fixed (changing the tape changes REAL2's measured R tapes; H11.9) |

## Proposed defaults (for the owner; nothing is switched on this branch)

| Option | Default now | Proposed | Evidence | What changes if adopted |
| --- | --- | --- | --- | --- |
| Launch profile `server-32` | `server` | `server-32` | 430 million, Saturday's tape, three runs: 394.00 and 620.00/s with no expiries (16 GiB: 394 with seconds-long p99, 438 to 486/s at 620). 1 billion, Saturday's tape: 331.03/s at 394 whole-turn, 394.00 per-save (16 GiB: 249.41). 1 billion production R at 394: p99 430 against 713 ms. Import: busy p99 45.1 against 103.7 ms, no allocation stalls. | One line in `jvm1/launch.mjs`. Not combinable with the tuned reader today (4 GiB over the role caps; proposal 57 GiB transactor container and 8 GiB reader). Re-run both cards. |
| Credits | whole-turn (barrier 6) | per-save (rolling 6) | `server-32` card at 1 billion: +19% stored at 394 (394.00 against 331.03), +27% at 620 (302.61 against 238.61), quiet loaded p99 halved or better in every cell. | Re-run both cards. |
| Pinned read options `TX2_PINNED_CUT_LOOKUP`, `TX2_PINNED_SHORTCUT` | off | on | 1 billion, old pin, one core: 19.37 → 467.92 reads/s at one seat, 20.20 → 478.80 at 256; 0 wrong values in 12 steps; toy: 14,176 comparisons over 10,653,258 rows, 0 differences, owner head on and off. | Every read route; re-run P1 and the console proof. |
| Tuned reader (three cores, 3 GiB cache, batches of up to 8, early filter) and read permits | one core, 1.5 GiB, 3 permits when tuned | tuned, 6 or 12 permits | 256 seats, re-read subjects: 8,879 to 12,375.9 reads/s, p99 72 to 112 ms. Random subjects with saves: 3 → 6 → 12 permits gives 1,216.6 → 1,585.8 → 1,747.2 reads/s, p99 323.58 → 266.24 → 258.05 ms; S commit p99 beside them 55.81 → 55.55 → 62.98 ms. | Core plan (all 12 cores are assigned today); 12 permits costs the saves 7 ms at p99. |
| One-time start-up read | off | on | 1 billion, Saturday's tape, restart at 394/s: save p99 in the first 30 s 7.26 s → 0.385 s; stop to admission 22.2 → 41.8 s (bar 60 s); 394.0 stored in both arms. Limit: it helps only subjects saved just before the restart (production study: about 39% of saves in the five minutes after a restart with a two-minute tail). | Restart time; not measured at 430 million. |
| Live-first import (`--import-policy yield`) and memory index 512m under import | `fair`, 256m | `yield`, 512m | Fresh: busy p99 103.7 ms (`yield`, 16 GiB) against 286 ms (no rule); with the 48 GiB heap and 32 GiB cache 45.1 ms, and 36.4 ms with 512m (6 index adoptions per 300 s instead of 11). | The log replayed at restart grows (forecast 370 MB against 200 MB, not measured). |
| Covering owner head `TX2_SUBJECT_OWNER_HEAD` | off | **stay off** | 1 billion: late reads per save −15% at 235/s, apply −21 to −37%. Fresh at 620/s: stored 574.3 / 506.4 per s against the reference's 620.0 / 605.0, 8,801 refused or expired, apply 1.52 against 1.16 ms. | — |
| Wide saves `TX2_SUBJECT_WIDE` | off (not on this branch) | **stay off** | Toy only: the general writer's serial apply is 1.25 to 3.5× the widened writer's. Not merged tonight (two conflicts). The builder: off unless one commit per save is chosen and a server pair shows at least 1.5×. | — |
| Loader position-row reading (`acceptLoaderPositionRows`, `TRIPLEX_DATOMIC_LOADER_POSITION_ROWS`) | off | **stay off** | Only for databases built by the aging loader; the demo turns it on from its connection file. The loader must write canonical rows instead. | — |
| Save shape (product) | — | one commit per subject's save | 1 billion: S 40.6 ms second-half p99 against R 430 ms; fresh 41.5 against 157 ms; whole form save 43 ms against 237 to 342 ms. | Commits per second fall about 17 times; P2 is judged on S. |

## What the night's merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| `exp/DX-CON1-console` `e6405e403` | `bc097008a` | Triplex Console (`examples/console`, React on shadcn/ui), the 22-tool catalogue and MCP server (`examples/demo-mcp`), `demo/**` |
| `exp/DX-CARD1-prodS-assemble` `78ad445a6` | `48c14a875` | Card rows placed by tape offset, `--renderer`, `--platform-tape`, the card `v01/SCORECARD-1B-production-S.md` |
| `exp/DX-W1-ownerhead-fix` `6cae9ba1b` | `f794423d8` | Owner-head pair: summarizer and sampler fixes, `w1/serial/compare.ts`, `w1/OWNER-HEAD-1B-READING.md` |
| `exp/DX-RD1-readers` `d94dff145` | `f1451e083` | Tuned pinned reader arm, saves arm (`v01/saves-arm.ts`), random-subject windows, `DX_RD3_READ_PERMITS` |
| `exp/DX-ACT3-large-release` `f5f8c09ff` | `385798988` | Release size for the Publish runner (`DX_ACT3_RELEASE`), the repaired probe, `DX_HELD_WINDOWS`, `actv-lazy/LARGE-RELEASE.md`, `PUBLISH-STOP.md` |
| `exp/DX-JVM1-startup-aged-fix` `968285954` | already on the branch | The start-up read's 1 billion runner |
| Drivers' result pages (documents only) | `c614de614` | SCALE1 `ec4d96cb0` and BM1 `769d8ef72` pages listed under the table above |
| Fixes | `a1d2473f8`, `607c46e8b` | The random arm's command block and the `ladders/` refusal; a test of the collector's aged head |

**Not merged:** `exp/DX-W2-wide-saves` `4ccbbf518` (`TX2_SUBJECT_WIDE`). It does not merge cleanly: `erase1/local.mjs`
(the pinned-option environment lines against the wide-saves line, one hunk) and `scale1/decision/writes.ts` (the
production commit path against the wide identity token, one hunk). By the rule for this merge it is left out.

## Gates on the merged head

Mac, `607c46e8b` (the code of this page's commit), one ordinary heavy token per step, no lease, 2026-11-24 03:09 to
04:05 UTC. Clocks are diagnostic. Evidence: `DX-INT2/` in the lab evidence store (`gates/queue.log` lists every case).

| Gate (owner) | Result |
| --- | --- |
| Type check of every TypeScript file the merges changed | No error from the merges. Builder-owned type-only errors (no runtime effect; Node strips types) in `rd1/saves-gate/gate.ts` (3, RD3), `v01/adopted-card.ts` line 354 (2, CARD1), `rd1/shortcut-gate/gate.ts` (2) and `v01/run.ts` (1), which were on the branch before |
| Lab unit tests (`v01/*.test.ts`, `rd1/*.test.ts`, `w1/migrated-reads.test.ts`, `ha1/launch-hooks.test.ts`, `jvm1/server32.test.mjs`) | 50 of 50 |
| `w1/serial/summarize_test.py` (W1), `prep1/server_collect_test.py`, `prep1/rolling_latency_test.py` | Pass |
| `packages/w0` kernel (ACT3) | 174 of 174; type check clean |
| `actv-lazy/join/large-release-check.ts 256` (ACT3) | Kernel equals oracle in all 8 release pairs (answers, changed values, notices) |
| SDK (`packages/datomic`) | 446 passed, 53 skipped |
| Console (CON1): `examples/console` type check and production build; `examples/demo-mcp` type check | Pass |
| Saves arm harness (`rd1/saves-gate/harness.ts`, RD3) | Pass: all ten windows sealed, isolated faults, deadlines, dry run stops inside the window driver |
| Saves gate (`rd1/saves-gate/gate.sh`, RD3) | Pass: 0 wrong in 222,598 reads over five pin kinds with shape S saves; every planted wrong value caught in all three planted windows |
| Pinned short-cut gate, owner head on and off (RD1) | Pass, both: 92,880 comparisons over 14,901,208 rows, 0 differences |
| Owner-head toy with step 7 (W1) | Pass: 40 re-saved samples, 0 errors; the old cut check fails 40 of 40 correct answers, as designed |
| Held Publish toy, default release (ACT3) | Pass: 86 changed values and 8 notices equal to the oracle; 8 deadline Publishes inside 1 s; 0 visibility failures |
| Held Publish toy, 20 forms and 20 policies | Pass: 8 deadline Publishes inside 1 s; records 17,658 to 17,663 bytes, 4 changes |
| Held Publish toy, injected stale probe | Fails at the end as designed: one visibility failure recorded (`txHalf` false, `validTimeHalf` true), every window still measured |
| Combined check: read study with both pinned options on, and off | Pass, both: 21 saves, 176 logical reads in 22 batches, 4 frames, 27 positions replayed |
| Combined check: removal with owner head and both pinned options on, and plain | Pass, both: 13 of 13 routes, 24 rolling saves, replay 11 → 36 |
| Combined check: fair import, quiet account and Publish | Pass: 8 frames, Publish at 15, 46 positions replayed |
| Combined check: native append recovery | Pass: 56 durable, 6 refused appends absent after restart |
| Production tape exactness gate (REAL2) | Pass: 840 R and 88 S commits, 2 wide S commits (394 assertions) on the general identity, 2,836 fields read back |
| Production tape on a loader-aged toy (REAL2) | Pass: 120 aged rows admitted, a tampered aged row refused, 1,927 fields read back |
| Launch guard (`ha1/guard-check.sh`) | Pass: 93 cases, 0 mismatches |
| Card toy, production-S (CARD1; clean checkout, package build, image, rolling 6 and barrier 6) | Pass: card written; 257 fields of 18 subjects read back exactly in both arms |

**Not run on the Mac:**
- The console's gates (`demo/toy/gates.sh`) and the DEMO1 toy proof: `demo/toy/up.sh` always serves on 28580 and
  stops the page server there, and both use the one toy working copy (`tx2-dxdemo1-toy-work`), which the owner's
  console is using. They passed twice on 2026-11-23 at `2fa24d78a`; the branch has only front-end changes and the
  console's own proof (37 of 37 at 1 billion through the tunnel) since.
- Every server launcher past its Linux guard (`study-server.ts`, `startup-server.sh`, the scorecard's server path):
  bare-metal only; their hooks are covered by `ha1/launch-hooks.test.ts` and the guard cases.
