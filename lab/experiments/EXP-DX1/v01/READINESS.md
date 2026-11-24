# Version 0.1 readiness

Rewritten on 2026-11-23 (night) by the integration builder from the measurements of that day, after the evening's
merges onto `exp/DX-INT1`; updated on 2026-11-24 after the five merges of that day (no server ran on 2026-11-24, so no
number below is new): the card's new judging rules applied to the 2026-11-23 numbers where the evidence allows, today's
options in "Proposed defaults", one cause withdrawn (fault 22), and the section "Next server session". One row per
priority: the bar, the latest measured value at 1 billion records and on the
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
| **P1 Pinned reads.** At 256 readers: 0 wrong reads; goodput not below the 64-reader level; read p99 ≤ 100 ms; writer commit p99 ≤ 1.25× its zero-reader value. At 1,024: goodput ≥ 0.9 of the 256 level. | **Default reader:** 18 to 20 reads/s at every ladder step at the old pin (87,002), 256 seats p99 13,566 ms; 0 wrong values. **Both pinned options, one core:** 478.80 reads/s at 256 seats (p50 516 ms), 0 wrong. **Tuned reader with shape S saves running, re-read subjects:** old pin 8,879 reads/s, p99 **99.33 ms**; near the head 8,960 reads/s, p99 112.13 ms. **Random subjects, with saves:** 1,216.6 reads/s, p99 323.58 ms (3 permits); 1,585.8, 266.24 ms (6); 1,747.2, 258.05 ms (12). S commit p99 beside readers 52.48 to 64.77 ms against 55.55 alone (up to 1.17×). 1,024 seats (no saves): 1,482 reads/s near the head against 12,375.9 at 256 (collapse). 0 wrong values in every window. | Fresh card (2026-11-21, default reader): 893.2 reads/s at 256 seats, p99 860.16 ms; 1,560.8/s at 64; 509.4/s and p99 2,375.68 ms at 1,024. | Card: `server`, one read core, options off. Tuned arm (`rd1/PINNED-1B.md`): `server`, three read cores, 3 GiB read cache, 3 / 6 / 12 read permits, both pinned options, batches of up to 8 subjects, early filter, 256 seats, 90 s windows, shape S at 23 commits/s. | **Not met.** Met only for re-read subjects at the old pin with saves (99.33 ms); near the head 12 ms over; random subjects 2.6× over; the 1,024-seat stress level collapses. | Owner decision: must the bar hold for subjects not in the reader's memory in 0.1? The model (not refuted) needs about 3,600 reads/s, about 7 reader cores with permits about twice the cores, so a reader machine; no affordable cache holds the working set (0.7 to 1.1 TB). Make the pinned options and the tuned reader defaults (below). The 1,024 collapse is the 3 GiB cache thrashing (1.43 to 1.78 loads per subject). **Next server session step 2:** the full card with `--reader tuned --read-permits 12` (CARD2), which now judges re-read and random subjects on separate rows; forecast re-read L256 8,000 to 11,000/s, p99 75 to 115 ms (even odds), random 1,350 to 1,800/s, p99 250 to 340 ms (missed). |
| **P2 Commits.** p50 ≤ 10 ms and p99 ≤ 50 ms with P1's 256 readers running; the pull at the returned position sees the commit; duplicates and lost replies return the original receipt. | **Production-S card** (90 s cells, every commit durable, 0 expired, every field read back exactly): shape S commits p50 / p99 14.91 / 66.56 ms at 50 rows/s, 11.65 / 43.01 at 235, 10.69 / 45.31 at 394, 12.10 / 48.64 at 620; all loaded saves including the quiet account 5.66 / 57.6, 8.96 / 40.96, 9.34 / 44.03, 11.39 / 46.59 ms. Out of card, 300 s at 394: S second-half p99 40.6 ms; R 430 ms (32 GiB) and 713 ms (16 GiB). **With 256 readers:** S commit p50 / p99 7.46 / 52.48 ms (old pin) and 8.06 / 64.77 (near the head). **Saturday's tape:** 394 stored at 394 offered with p99 11,010 ms (`server-32`, per-save); 249.41/s with 5,523 expired (`server`, whole-turn). | Production tape, 300 s at 394: S 23.06 commits/s, p99 42.0 ms whole, 41.5 ms second half, save completion 42.8 ms; R 393.13 rows/s, 157 ms second half, completion 237 ms. Fresh card (Saturday's tape): reference tape p50 / p99 5.57 / 24.58 ms alone, 5.60 / 22.53 ms with readers; 342.90/s stored at 394. | Card: `--tape production-S --profile server-32 --credit-mode rolling6 --window-seconds 90` (build `090c189a8`, renderer `6c4f9e4fe`). Out of card: REAL2 runner, rolling 6, 300 s. With readers: the tuned reader arm above, `server`. | **Not judged in steady state; forecast met** (card rule of 2026-11-24, CARD2: P2 is judged on the second half of cells of 300 s or more; the card's cells were 90 s). Its halves, all loaded saves, second / first half p50 / p99: 5.54 / 57.6 and 5.73 / 57.3 ms at 50/s; 7.94 / 46.1 and 10.11 / 37.6 at 235; 10.11 / 53.0 and 8.96 / 31.2 at 394; 10.56 / 48.1 and 12.29 / 46.6 at 620 (in 90 s cells the second half is not yet steady). **Forecast** for 300 s cells on the no-burst tape (CARD-READER.md section 7): second-half p50 7 to 10 ms at 50/s and 7 to 9 ms at 235 to 620, p99 30 to 50 ms, met at all four loads with about 55% confidence (the 50/s p99 is the risk). Basis: REAL2's 300 s run at 394 on this database, p50 by minute 10.81 / 6.32 / 7.91 / 8.21 / 8.04 ms, whole window 7.99, second-half p99 40.6 ms; 43 to 51% of a 90 s cell's commits read storage cold (the 2026-11-24 analysis). One commit per row (R) and Saturday's tape stay far outside. With 256 readers the 90 s windows gave p99 52 to 65 ms (not steady state either). Receipts and read-back: exact in every cell. | Owner decision: one commit per subject's save as the product's save shape (it is the only shape near the bar). **Next server session step 2** judges it (300 s cells, no-burst tape); steps 3 and 4 measure the general writer's hints (W3). |
| **P3 Ordered feed.** 0 gaps and 0 order violations per subject; resume replays exactly; lag p99 ≤ 250 ms with 256 readers. | Production-S card: 1,260 ordered exact changes. **Lag at P1's 256 readers p99 30.6 ms** (card rule of 2026-11-24: judged at the 256-reader step; by step 48.6 / 35.6 / 34.6 / 41.0 / 30.6 ms at 1 / 4 / 16 / 64 / 256 readers; 700.4 ms at the 1,024-reader stress step; whole tape 288.8 ms as first reported). On this loader-built database the SDK refuses the feed from before the aged head (the loader's non-canonical journal rows) unless the compatibility option is on. | Fresh card: 1,260 exact ordered changes with readers, lag p99 98.30 ms (whole tape). | Card as P2 (one read core); steps re-rendered from the same campaign with CARD2's code (`evidence/DX-CARD2/prodS-card-rerendered-SCORECARD.md.gz`). | **Lag clause met at 1 billion** (30.6 ms at the bar's 256 readers) and on fresh; 0 gaps and 0 order violations at both sizes. **Resume after a crash not measured on a server**, so the priority is met on every clause measured, not yet on all. The 1,024-reader stress step (700.4 ms) is outside the bar; its likely cause, parked pinned reads holding the read gateway's 512 web threads, was reproduced at toy size (W3). | Resume after a crash on a server; **next server session step 3** (the waiting-read bound at the 1,024 step, forecast lag p99 under 250 ms there). Journal routes now have an opt-in bound and cursor (JRN1, below). The loader must write canonical journal rows before it is used again (the SDK refuses its rows below the sealed head). |
| **P4 Current pulls.** Single-client p50 ≤ 5 ms, p99 ≤ 25 ms; ≥ 1,100 pulls/s per core; flat as history grows. | p50 / p99 4.35 / 44.54 ms (production-S card); 4.42 / 46.59 (`server-32` card, Saturday's tape); 4.22 / 47.10, max 33,179 ms (`server` card). | 4.54 / 50.18 ms (fresh card). | Card pulls beside the card's save loads, one read core. | **Not judged in steady state; forecast met.** By the card rule of 2026-11-24 (CARD2), P4 starts after the reader's backlog drains; last night's pulls ran beside the abandoned 1,024-reader reads and the one-core reader's collector pauses (paused 8 to 9% of the pull window in stops of 18 to 142 ms; the p99 predicted from the pauses, 45 / 42 / 48 ms, matches the cards). p50 met. **Forecast** with the tuned reader (three cores, three collector threads, 3 GiB cache in a 9 GiB heap) after the drain: p99 12 to 25 ms (the card builder gives it about even odds). Throughput per core and flatness with depth not measured. | **Next server session step 2** judges it; measure depths 1, 3 and 10. |
| **P5 Publish.** Per account of 100,000 subjects, under one second to the permanent record and every read returning the new answers; live read and commit p99 ≤ 1.5× without Publish. | Not run. | **100,000 subjects** (ACT3 runner `f5f8c09ff`): small release 100 of 100 Publishes inside 1 s in 11 windows, first correct answer p50 31.6 to 45.3 ms, p99 50.9 to 421.4 ms; large release (20 forms, 20 policies) 120 of 120 inside 1 s, p50 32.1 to 67.3, p99 55.2 to 322.8 ms. Live saves at 39.4/s during Publish: p99 1.7 to 2.3× the control (small release); at 3.5 and 23.5/s at or under 1.1×. First release settled in the background: values 14.5 min, notices 19.2 min (no bar). A large release's background settlement cannot finish (frames exceed the writer's bound). | `server`, whole-turn and per-save credits, live saves at 3.5, 23.5 and 39.4/s, two Publishes per window. | **Under one second: met** at 100,000 on fresh. **Live traffic: not met** as measured at 39.4 saves/s; read from the same evidence on 2026-11-24 (ACT4, `actv-lazy/SETTLEMENT-FRAMES.md` section 8), the p99 is set by one to three whole-store stalls per 100 s window that occur in the control windows too (3 of 14 at an index adoption, 7 of 14 8 to 18 s before one; timing only): outside the stall seconds the Publish windows' save p99 is 0.76 and 1.07 times the control with per-save credits, 1.54 and 2.02 times with whole-turn credits. Not measured at 1 billion. | Built on 2026-11-24, default off: settlement frames sized by bytes (H11.6, ACT4) and "at least" reads for receipt holders (H11.4, RD4; owner decision on making it the product's promise). **Next server session steps 5 and 6.** Judge the live ratio over windows holding the same number of index jobs, or outside stall seconds; run at 1 billion. |
| **P6 Quiet account.** Commit, pinned-read and feed p99 loaded / alone ≤ 1.25, or loaded commit p99 ≤ 50 ms; 0 wrong reads; no expiries. | Production-S card: quiet commit p99 alone → loaded 18.94 → 12.16, 14.34 → 20.74, 13.70 → 17.54, 32.26 → 21.25 ms at 50 / 235 / 394 / 620; 0 wrong; 315 commits per side (the card requires 500). Saturday's tape, `server-32` per-save: loaded 43.52, 57.09, 34.81, 47.62 ms. Quiet pinned reads with the one-core reader missed about two thirds of their offers (0 wrong). Beside 256 tuned readers: 22 to 35 ms; 52.22 and 59.13 ms in the random quiet-stream window (6 and 12 permits). | Production tape: quiet p99 22 ms (R) and 24.0 ms (S). Saturday's tape, rolling 6: 43.91 / 54.00 / 61.79 ms at 235 / 394 / 620. | As P2. | **Commit clause met** on the production-shaped tape at every load at 1 billion (card line PARTIAL: 315 commits per side against 500). Not met on Saturday's tape at 235 at 1 billion or at 394 and 620 fresh. Read and feed ratios not measured. | Cells long enough for 500 commits per side (the card now takes `--window-seconds` up to 600; 150 s gives 525 per side, 300 s 1,050); quiet reads with the tuned reader; the 52 to 59 ms window was the first window after the stack started (100% of the quiet saves read storage; replicated three times), which the card now labels. **Next server session step 2.** |
| **P7 Cost follows activity.** ≤ 64 B per never-touched subject outside PostgreSQL; idle scope cost per role; cold first read p99 ≤ 100 ms. | First pull p99 86.0 ms. Added resident bytes per roster subject 53.0 B transactor, 375.0 B write gateway, 267.8 B read gateway (production-S card). | First pull p99 66.56 ms; 16.9 / 55.4 / 70.3 B (fresh card). | Card restore-to-empty footprint, not a population slope. | **Cold read met** at both sizes. **Bytes per subject not met** as measured (about 700 B at 1 billion, 143 B fresh), and the measure is a boot-to-boot footprint, not the bar's slope. | Two matched population rungs at fixed activity. |
| **P8 Import beside live traffic.** Other accounts' read and commit p99 ≤ 1.5× baseline; ≥ 3,000 facts/s. | Card paced import 3,266 facts/s with save p99 19.98 ms and read p99 6.27 ms (production-S card); 3,250 facts/s (`server` card). Ratio not measured at 1 billion. | Live-first import, 48 GiB heap, 32 GiB cache, memory index 512m: 3,671 facts/s (3,454 second half), busy p99 36.4 ms = 3.05× its 12.9 ms baseline, quiet 32.5 ms, worst read ratio 1.46×. With the 256m index: 3,321 facts/s, 45.1 ms (4.6×). 16 GiB / 24 GiB heap: 3,059 facts/s, 103.7 ms. | `load1/fair-server.sh --import-policy yield`, 32-fact frames, rolling 6. | **Rate met; ratio not met** (3.05×). Busy p99 is inside 50 ms, so an absolute 50 ms clause (asked of the owner) would be met. | Owner decision on the 50 ms clause for busy accounts; the deep (16 million facts) and wide (4.5 million subjects) imports are not measured. |
| **P9 Machine loss and moves.** 0 acknowledged saves lost; saves resume ≤ 60 s; pinned reads continue; a planned move pauses one account ≤ 30 s. | Not run. | Two machines, 235 saves/s: **policy B** 0 of 2,830 lost, first protected save after 603.4 s (local copy 131 s, SHA-256 452 s), reads continued (first 16.5 ms, longest gap 47 ms, 0 of 30,172 missed). **Policy A** 0 of 4,885 lost, 19.5 s. **Planned move** 0 of 4,146 lost, 14.1 s. | HASYNC1 pair `b03e806fd`, direct WAL path, autovacuum off. | **Policy B (version 0.1):** zero loss and reads met; 60 s not met, accepted by the owner. Planned move met. | Skip the re-hash of an already verified seed (about 2.5 min instead of 603 s); fix the second-failure check (it reads the fenced disk through the killed transactor on port 4334); policy C for 1.0. |

Sources: `lab/experiments/EXP-DX1/STATUS.md` on `lane/d-native`, entries of 2026-11-23; the result pages now on this
branch: `scale1/V01-AGED.md`, `V01-AGED-S32.md`, `V01-AGED-PROD-S.md`, `RD2-PROBE.md`, `OWNER-HEAD-1B.md`,
`bm1/PUBLISH100K-READING.md`, `STARTUP-AGED-READING.md`, `OWNER-HEAD-READING.md`, `PRODUCTION-TAPE-READING.md`,
`AGED-CACHE-READING.md`, `FAILOVER-READING.md`, `IMPORT-YIELD-READING.md`, `rd1/PINNED-1B.md`,
`actv-lazy/LARGE-RELEASE.md`, `actv-lazy/PUBLISH-STOP.md`. Added on 2026-11-24 (Mac work and readings of the same
evidence, no new server number): `v01/CARD-READER.md`, `actv-lazy/SETTLEMENT-FRAMES.md`, `jrn1/JOURNAL-BOUNDS.md`,
`rd4/AT-LEAST.md`, `w3/GENERAL-WRITER-HINTS.md`, and the private analysis `research/2026-11-24-undiagnosed-misses/`.

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
| 22 | Console journal on the 1 billion copy: a journal page walked the position index for minutes under the single journal permit. **Cause withdrawn on 2026-11-24:** the statement that the loader's 28 million position rows never pass the feed's filter and cause the walk is unconfirmed; on a loader-aged toy all 1,200 of the loader's saves passed the filter and came back as journals, and the walk reproduced only over position entries that yield no journal (`jrn1/JOURNAL-BOUNDS.md`). Which entries the 1 billion copy's walk went over is unknown until the JRN1 probe runs (next server session step 7) | gateway `journal.clj` `page`, `entity-positions` | Console side: CON1 `fff5ba67a`, `a7083cb4e`. Gateway: opt-in bound and cursor, default off (JRN1 `e4c0a3771`, merged `2a10a7703`) |
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

**Options merged on 2026-11-24 (every option default off; the notice-selection fix and the card's judging rules are not options and are in force; Mac toy evidence only, no server has run any of them).** "What a server
must confirm" names the step of the next server session that judges it.

| Option (builder) | Default now | Proposed | Evidence (Mac toy, diagnostic clocks) | What a server must confirm |
| --- | --- | --- | --- | --- |
| Settlement frames sized by bytes `TX2_SETTLE_FRAMES=bytes` (ACT4; page `actv-lazy/SETTLEMENT-FRAMES.md`) | off (frames of 16 / 4 subjects) | on, after step 6 | The 20 forms and 20 policies release settles to the end with both writers killed and resumed: 4,272 changed values and 1,440 notices equal to the oracle and to an independent statement of the form rule; small release byte-identical to the old framing (by SHA-256); 150 forms per subject (every subject split) exact; every frame estimate at or under 8,000 µs. Pages keep `{subject, changes}` only (2.5 KB per subject at 20 forms against 5.5 KB). | Step 6: 100,000 subjects all owing 20 forms settle within the bound: 6.90 million changes and 2.04 million notices, 22,660 value and 50,000 notice frames (±5%), values 20 to 40 min, notices 25 to 45 min, all exact. **Not covered by any command:** settlement beside live saves in the same account (every frame needs the account's head unmoved; most frames would probably be refused and retried). |
| Notice selection for a release that changes only forms or policies (ACT4 `fa812ca31`) | **fixed, not an option** | — | Before the fix such a release selected no subject outside the held campaign, so its owed notices were never recorded. Releases without forms or policies take the same path as before; the held campaign of 2026-11-23 was not affected. | — |
| Bounded journal pages: `"bounded": true` on `/transactions` and `/entity-transactions`, SDK `boundedJournalPages` / `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`, caps `TX2_JOURNAL_EXAMINE_ENTRIES` (4096), `TX2_JOURNAL_EXAMINE_MS` (100) (JRN1; page `jrn1/JOURNAL-BOUNDS.md`) | off (per request) | SDK option on, after step 7 | Whole feed, pinned pages, entity journals, field history and the SDK adapter equal to the unbounded routes in 5 + 15 + 45 + 48 + 8 cases on a loader-aged toy; with 3,000 non-journal entries ahead the old page examined 3,001 entries, the bounded page at most 256; the SDK's live suite passed with a bound of 2 entries. A reader that does not ask gets byte-identical answers. | Step 7 (probe, read-only): which entries the 1 billion walk goes over (pages stopping on `limit` with 1,000 journals, or on `entries` / `time` with none); every bounded page at most 4,096 entries and about 100 ms. |
| Field-history page `DatomicClient.historyPage` (JRN1) | new method, unused | the console's field history, after step 7 | 48 of 48 cases equal to the unbounded history read filtered and sorted; 20,701 bytes against 42,016 on the toy. | Step 7 probe 4: warm 20 to 120 ms against 250 to 420 ms unbounded; cold 1.5 to 5 s (it still reads every row datom of the entity). |
| `TX2_JOURNAL_PERMITS` (JRN1) | 1 | 2 only once every journal reader sends bounded pages | Proposal only; nothing measured. **No launcher passes it** (`stack/up.sh` does not), so no server command can set it today. | Needs a launcher pass-through, then P3 lag p99 and receipt-lookup p99 with the card's 256 readers at 1 and 2 permits. |
| Card settings `--reader tuned`, `--read-permits N`, `--window-seconds 90..600`, tapes `production-S-noburst` / `production-R-noburst` (CARD2; page `v01/CARD-READER.md`) | default reader, 90 s cells, burst tapes | for the card's server runs: tuned, 12 permits, 300 s, no-burst | The default card's plan output is byte-identical to `9e02cf1d2` in six option sets (two refusals identical except the stack line); toy cards with both readers and both tapes passed, 0 wrong values; launch guard 95 cases; `server-32` + tuned reader caps sum to the 89 GiB guard exactly (transactor 57, writer 6, reader 11, PostgreSQL 5, host 10). | Step 2, with its refuters: transactor peak at or above 56 GiB or any limit event; the random line's SQL time per storage read above 0.7 ms (PostgreSQL's page cache cut from 8 to 5 GiB is unmeasured); re-read L256 below 7,000/s or p99 above 130 ms. |
| The card's judging rules (CARD2) | **on for every card rendered from this branch** (rules, not options) | — | P2 on the second half of cells of 300 s or more ("Not judged" otherwise); P3 lag at the 256-reader step; P4 after the drain; the first window after each stack start labelled; latency from due and from send with timer lateness; earlier figures printed beside. The plan output is unchanged; a re-rendered 90 s card now says "Not judged" on P2. | Step 2 is the first card judged under them. |
| "At least this position" reads: `atLeast` / `atLeastPosition` on unpinned reads, SDK `ReadAtLeast` (RD4; page `rd4/AT-LEAST.md`) | off (per reader) | the product's reader for anyone holding a receipt (owner decision H11.4); the console uses it from 2026-11-24 | Two-peer toy: a receipt reader early 0 of 300; a plain read sent straight after the acknowledgement early 9 of 150; the gateway waited on 6 of 300 at-least requests (0.3 to 19.6 ms); held peer: waits to the receipt or refuses with `AtLeastTimeout`; no request to the transactor. Held Publish toy with `DX_ACT3_AT_LEAST=1`: 8 of 8 inside 1 s, 0 defects. A sync on every unpinned read was priced and not built (9,000 to 12,000 transactor messages a second at the tuned reader's rates). | Step 5: 0 early answers and 0 refusals in 120 Publishes; first-correct p50 within +3 ms of 2026-11-23 per window; waits on 0 to 10% of requests, mean under 5 ms. |
| Publish runner probe from receipts `DX_ACT3_AT_LEAST=1` (RD4) | off | on for the Publish runs | As the row above. | Step 5. |
| General-writer hints `TX2_GENERAL_PREFETCH=1` (W3; page `w3/GENERAL-WRITER-HINTS.md`) | off | stay off until step 4 | Paired log of 395,917 datoms and 220 receipts identical with hints on and off; production exactness gate on fresh and loader-aged toys identical. Reads inside apply per general commit fell about half (2.84 → 1.38 one at a time) while the transactor's total reads rose 6 to 11% and the gateway made about 3 more cold reads per commit: hints buy writer capacity, not single-save latency. The worst-case tape barely uses the general writer, so hints cannot help it (the morning's forecast for it is withdrawn). | Step 4: general reads inside apply fall 40 to 55% in the first loaded cell; 50/s median within ±2 ms; commit p99 at 394 and 620/s down 10 to 30%. |
| Waiting-read bound `TX2_READ_WAIT_LIMIT=N` (`DX_READ_WAIT_LIMIT` in `stack/up.sh`) (W3) | off (every read waits) | 128 on the read gateway, after step 3 | Toy with 16 web threads, 1 permit, 64 pinned flood clients: off, every thread busy and the feed poll and health check took 10.5 s; with 4, feed poll p50 13.7 ms / p99 119 ms, health p99 120 ms, current pulls never refused (p50 0.91 s behind the permit queue), 8,723 pinned reads refused and retried by the SDK. | Step 3: at the 1,024-reader step the feed lag p99 under 250 ms with `busyPeak` under 200, pinned goodput within 20% of off. |
| Web-thread counters `TX2_THREAD_COUNTERS=1` (`DX_THREAD_COUNTERS`), `GET /v2/admin/threads` (W3) | off (the route is always present) | on for server measurement runs | A 50 ms sampler of Jetty busy and queued threads and the read permit queue; the route answered in 43 ms on the starved toy with the bound on. | Step 3 uses it. |

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

## What the 2026-11-24 merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| `exp/DX-ACT4-settlement-frames` `b623914a4` | `cd55cfe61` | `TX2_SETTLE_FRAMES=bytes`, `DX_ACT4_INITIAL=large`, `DX_HELD_MINUTES`, the notice-selection fix `fa812ca31`, `actv-lazy/SETTLEMENT-FRAMES.md` |
| `exp/DX-JRN1-journal-bounds` `adf744f6b` | `2a10a7703` | `"bounded": true` journal pages and cursors, `boundedJournalPages`, `historyPage`, `TX2_JOURNAL_PERMITS`, the 1 billion probe, `jrn1/JOURNAL-BOUNDS.md` |
| `exp/DX-CARD2-reader-setting` `a9d8c1fce` | `cb59b276a` | `--reader tuned`, `--read-permits`, `--window-seconds`, the `-noburst` tapes, the card's judging rules, the trace file per process start, `v01/CARD-READER.md` |
| `exp/DX-RD4-at-least-read` `dd96da3b2` | `84cc1e26d` | `atLeast` reads on the gateway, `ReadAtLeast` in the SDK, `DX_ACT3_AT_LEAST`, `rd4/AT-LEAST.md` |
| `exp/DX-W3-writer-hints` `a6146ff4f` | `287bb0816` | `TX2_GENERAL_PREFETCH`, `TX2_READ_WAIT_LIMIT`, `TX2_THREAD_COUNTERS`, `/v2/admin/threads`, the SDK's `ReadBusy` retry, `w3/GENERAL-WRITER-HINTS.md` |
| Fix | `fdabb86e5` | Gateway `reach.clj`: W3's change closed `admission/execute` one form early, so every `/reach` and `/reach-many` answered a boolean (HTTP 500) whatever the settings; found by the console's gates |
| Console | `b6611ad3b` | The console reads after its own writes: every acknowledged commit raises a `ReadAtLeast` floor that every unpinned read on the read gateway asks for (2 s wait); `DEMO_TOY_NAME` / `DEMO_TOY_PORTS` run a second toy beside the owner's |
| Gate | `73a9c8bf3` | `rd4/gate.ts` records the read gateway's journal, at-least and read-queue counters at the end |

**Conflicts and how each was resolved** (both sides kept every time): `actv-lazy/join/held-campaign.ts` (ACT4's large
first release is offered, then RD4 hands its receipt to the probe reader); `packages/datomic/src/DatomicStorageAdapter.ts`
(both adapter options); gateway `admission.clj` (JRN1's journal permit setting with W3's read bound, counters and
`execute` / `execute-for`); gateway `storage.clj` (JRN1's field-history page admitted through W3's `execute-for`);
gateway `main.clj` (the namespace requires RD4's `at-least` and W3's `general-prefetch` and `admission`). Merged
without conflict: `ha1/local.ts` (RD4's holder beside ACT4's hook), `stack/up.sh` (RD4's read-hold proxy beside W3's
pass-through), `DatomicClient.ts` and `index.ts` (JRN1, RD4, W3).

## Next server session (one driver, in this order; none has run)

Build the head of `exp/DX-INT1` that carries this page once; every command below uses that one build (`COMMIT` = that
head). Environment, copies and the scorecard parts as `v01/AGED-SERVER-32.md` and `v01/PRODUCTION-CARD.md`; the held
runs as `actv-lazy/PART9.md`. Each step's predictions and refuters are in its page (linked); the line under each step
gives the headline ones.

| Step | What | Page | Duration |
| --- | --- | --- | --- |
| 1 | Build (`v01/build.ts`) and the card's dry run (part 1 to its first offer) | `v01/CARD-READER.md` §7 | 5 + about 10 min |
| 2 | **The full card at 1 billion with the tuned reader and 300 s cells** (no-burst shape S, `server-32`, 12 read permits, per-save credits) | `v01/CARD-READER.md` §7 | 2 h 05 min to 2 h 35 min (the page's 2 h 10 to 2 h 40 includes the build) |
| 3 | The 1,024-reader step with the waiting-read bound: production-S card part 2 at 1 billion, bound off and 128, thread counters on in both | `w3/GENERAL-WRITER-HINTS.md` §4 (b) | about 2 × 35 min |
| 4 | General-writer hints: production-S card part 2 at 1 billion, hints off and on | `w3/GENERAL-WRITER-HINTS.md` §4 (c) | about 2 × 45 min |
| 5 | Publish at 100,000 subjects, all twelve windows, probe reading at least each receipt | `rd4/AT-LEAST.md` §4 | about 35 min |
| 6 | Publish at 100,000 subjects with the large first release settled by bytes, then the four 39.4/s windows | `actv-lazy/SETTLEMENT-FRAMES.md` §9 | 55 to 85 min (runner limit 120) |
| 7 | Journal probe on the 1 billion working copy (read-only): demo stack up, probe, demo stack down | `jrn1/JOURNAL-BOUNDS.md` | bring-up 3 to 12 min (`demo/PROVE-CONSOLE.md`), probe about 3, down about 1 |
| — | Not recommended: W3 (a), the worst-case tape with hints off and on (predicted no change; the tape takes the per-subject writer) | `w3/GENERAL-WRITER-HINTS.md` §4 (a) | about 2 × 45 min |

**Total for steps 1 to 7: about 6 h 37 min to 7 h 46 min** of server time (5 + 10 + 125 to 155 + 70 + 90 + 35 + 55 to
85 + 7 to 16 min), about USD 7 to 9 at USD 1.09 an hour; 1 h 30 min more with W3 (a).

```bash
# 1. Build once, from the commit that carries this page
COMMIT=<head of exp/DX-INT1 carrying this page>
BUILD=/var/tmp/triplex-v01-int3-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"

# 2. The full card, tuned reader, 300 s cells (CARD-READER.md section 7; its part() and copies)
cardpart() {  # $1 part, $2 new scratch copy of AGED_PGDATA_SOURCE, $3 campaign directory
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age 1B --tape production-S-noburst --profile server-32 --reader tuned --read-permits 12 \
    --credit-mode rolling6 --window-seconds 300 \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
    --pgdata-source "$AGED_PGDATA_SOURCE" --pgdata "$2"
}
DX_DRY_RUN_FIRST_OFFER=1 cardpart 1 "$DRY_COPY" /var/tmp/v01-int3-card-dry   # must print "DX-DRY-RUN first offer reached"
OUT=/var/tmp/v01-1b-prodSnb-s32-tuned
cardpart 1 "$COPY_1" "$OUT"; cardpart 2 "$COPY_2" "$OUT"; cardpart 3 "$COPY_3" "$OUT"
sudo env "PATH=$BUILD/tools/bin:$PATH" "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$OUT"

# 3 and 4. W3: part() exactly as v01/PRODUCTION-CARD.md with "$EXTRA" after "sudo env" (GENERAL-WRITER-HINTS.md section 4)
for arm in off on; do
  make_copy "$COPY"
  limit=; [[ $arm == on ]] && limit=DX_READ_WAIT_LIMIT=128
  sudo bash lab/experiments/EXP-DX1/w3/threads-sampler.sh "/var/tmp/v01-1b-rq-$arm-threads.jsonl" & sampler=$!
  EXTRA="DX_THREAD_COUNTERS=1 $limit" part 2 "$COPY" "/var/tmp/v01-1b-rq-$arm" 1B production-S server-32
  wait "$sampler"; remove_copy "$COPY"
done
make_copy "$COPY"; EXTRA=                        part 2 "$COPY" /var/tmp/v01-1b-prodS-hints-off 1B production-S server-32; remove_copy "$COPY"
make_copy "$COPY"; EXTRA=TX2_GENERAL_PREFETCH=1  part 2 "$COPY" /var/tmp/v01-1b-prodS-hints-on  1B production-S server-32; remove_copy "$COPY"

# 5. Publish, all twelve windows, probe from receipts (AT-LEAST.md section 4); fresh prepared copy as PART9.md
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "DX_ACT3_SETTLE=0" "DX_ACT3_AT_LEAST=1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"

# 6. Publish with the large first release settled by bytes (SETTLEMENT-FRAMES.md section 9); a new prepared copy
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "TX2_SETTLE_FRAMES=bytes" "DX_ACT3_RELEASE=forms=20,policies=20,permille=1000" \
  "DX_ACT3_SETTLE=1" "DX_ACT4_INITIAL=large" "DX_HELD_MINUTES=120" \
  "DX_HELD_WINDOWS=barrier6/39.4/0,barrier6/39.4/1,rolling6/39.4/0,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"

# 7. Journal probe (JOURNAL-BOUNDS.md): the demo stack on the 1 billion working copy, nobody else on its read gateway
sudo DEMO_ORIGINAL=<the held 1 billion cluster> DEMO_HANDOFF=<its aged-scorecard.json> bash demo/server-up.sh
node --import tsx lab/experiments/EXP-DX1/jrn1/probe.ts http://127.0.0.1:18495 <db from /var/tmp/triplex-demo/ready.json> \
  28309866 '<account-003 namespace>i9:00050000' '<account-003 namespace>i9:00000000' \
  --attribute :task/field-0 --far 87002 --entity-pages 200 --feed-pages 5 > jrn1-probe-1b.jsonl
sudo bash demo/server-down.sh
```

Headline predictions and what would show them wrong (all written before any run; full tables in the pages):

| Step | Predicted | Wrong if |
| --- | --- | --- |
| 2 | P1 re-read L256 8,000 to 11,000/s, p99 75 to 115 ms (even odds); P1 random 1,350 to 1,800/s, p99 250 to 340 ms (missed); P2 second-half p50 7 to 10 ms, p99 30 to 50 ms (met, about 55%); P3 lag at 256 readers 25 to 60 ms; P4 p99 12 to 25 ms after the drain; P6 judged (1,050 per side), loaded quiet p99 12 to 35 ms; P7 first pull 60 to 100 ms; P8 3,100 to 3,350 facts/s; transactor peak 50 to 55.5 of 57 GiB | re-read L256 under 7,000/s or p99 over 130 ms; random under 1,300/s or p99 over 350 ms; S second-half p50 over 10 ms at 394 with at most 0.9 reads per commit; random-line SQL time per storage read over 0.7 ms; transactor peak at or over 56 GiB or any limit event; any wrong value |
| 3 | Off: `busyPeak` 512 at the 1,024 step, lag p99 0.3 to 2 s. Bound 128: `busyPeak` under 200, lag p99 under 250 ms (expected 40 to 120), pinned goodput within 10% of off | off shows `busyPeak` under 512 with `queuedPeak` 0 while the poll gap is over 100 ms; on still over 250 ms with `busyPeak` under 200; on loses more than 20% of pinned goodput |
| 4 | General reads inside apply down 40 to 55% in the first loaded cell; 50/s median within ±2 ms; commit p99 at 394 and 620/s down 10 to 30% | reads inside apply down less than 25% or more than 70%; 50/s median up more than 4 ms; any exactness difference |
| 5 | 0 early answers and 0 refusals in 120 Publishes; 20/20 inside one second per Publish window; first-correct p50 within +3 ms of 2026-11-23; waits on 0 to 10% of requests | any at-least defect or refusal; p50 more than 10 ms above 2026-11-23; waits on more than a quarter of requests |
| 6 | Settlement completes within the bound: 6.90 million changes, 2.04 million notices, 22,660 / 50,000 frames (±5%), values 20 to 40 min, notices 25 to 45 min, exact; live p99 per-save outside stalls 0.8 to 1.2 × control | any refusal or frame estimate over 8,000 µs; counts more than 2% off; values over 45 min or notices over 50 min; per-save outside-stall ratio over 1.5 |
| 7 | Newest 20: old route 20 to 32 entries; pages from below the sealed head stop on `limit` with 1,000 journals; entity pages at most 4,096 entries and about 100 ms; field history warm 20 to 120 ms, cold 1.5 to 5 s | pages stopping on `entries` / `time` with no journals (then the copy has runs of position entries without journals); any page over 4,096 entries or 250 ms; warm history over 200 ms |

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
