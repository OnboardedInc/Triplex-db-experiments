# Version 0.1 readiness

Rewritten on 2026-11-23 (night) by the integration builder from the measurements of that day, after the evening's
merges onto `exp/DX-INT1`; updated on 2026-11-24 after the seven merges of that day (ACT4, JRN1, CARD2, RD4, W3, W4,
S1; no server ran on 2026-11-24, so no measured number below is new): the card's new judging rules applied to the 2026-11-23 numbers where the evidence allows, today's
options in "Proposed defaults", one cause withdrawn (fault 22), and the section "Next server session"; updated again on
2026-11-24 (afternoon) after four more merges (ACT5 settlement beside live saves, XQ3 ID lists, RD5 uncached pinned
reads, XQ6 the exact sweep; Mac toy evidence only): their options in "Proposed defaults", the section "What the 2026-11-24 afternoon merges
put on the branch" with every gate on the final head and the contradictions found, and "Next server session" rewritten
in the owner's order of 2026-11-24 with costs. One row per
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
| **P1 Pinned reads.** At 256 readers: 0 wrong reads; goodput not below the 64-reader level; read p99 ≤ 100 ms; writer commit p99 ≤ 1.25× its zero-reader value. At 1,024: goodput ≥ 0.9 of the 256 level. | **Default reader:** 18 to 20 reads/s at every ladder step at the old pin (87,002), 256 seats p99 13,566 ms; 0 wrong values. **Both pinned options, one core:** 478.80 reads/s at 256 seats (p50 516 ms), 0 wrong. **Tuned reader with shape S saves running, re-read subjects:** old pin 8,879 reads/s, p99 **99.33 ms**; near the head 8,960 reads/s, p99 112.13 ms. **Random subjects, with saves:** 1,216.6 reads/s, p99 323.58 ms (3 permits); 1,585.8, 266.24 ms (6); 1,747.2, 258.05 ms (12). S commit p99 beside readers 52.48 to 64.77 ms against 55.55 alone (up to 1.17×). 1,024 seats (no saves): 1,482 reads/s near the head against 12,375.9 at 256 (collapse). 0 wrong values in every window. | Fresh card (2026-11-21, default reader): 893.2 reads/s at 256 seats, p99 860.16 ms; 1,560.8/s at 64; 509.4/s and p99 2,375.68 ms at 1,024. | Card: `server`, one read core, options off. Tuned arm (`rd1/PINNED-1B.md`): `server`, three read cores, 3 GiB read cache, 3 / 6 / 12 read permits, both pinned options, batches of up to 8 subjects, early filter, 256 seats, 90 s windows, shape S at 23 commits/s. | **Not met.** Met only for re-read subjects at the old pin with saves (99.33 ms); near the head 12 ms over; random subjects 2.6× over; the 1,024-seat stress level collapses. | Owner decision: must the bar hold for subjects not in the reader's memory in 0.1? The model (not refuted) needs about 3,600 reads/s, about 7 reader cores with permits about twice the cores, so a reader machine; no affordable cache holds the working set (0.7 to 1.1 TB). Make the pinned options and the tuned reader defaults (below). The 1,024 collapse is the 3 GiB cache thrashing (1.43 to 1.78 loads per subject). **Next server session step 3:** the full card with `--reader tuned --read-permits 12` (CARD2), which now judges re-read and random subjects on separate rows; forecast re-read L256 8,000 to 11,000/s, p99 75 to 115 ms (even odds), random 1,350 to 1,800/s, p99 250 to 340 ms (missed). **Steps 11 and 16** (RD5, merged on 2026-11-24 afternoon): where an uncached subject's 1.7 ms goes, the read prefetch, read-ahead off and a second reader on its own machine. |
| **P2 Commits.** p50 ≤ 10 ms and p99 ≤ 50 ms with P1's 256 readers running; the pull at the returned position sees the commit; duplicates and lost replies return the original receipt. | **Production-S card** (90 s cells, every commit durable, 0 expired, every field read back exactly): shape S commits p50 / p99 14.91 / 66.56 ms at 50 rows/s, 11.65 / 43.01 at 235, 10.69 / 45.31 at 394, 12.10 / 48.64 at 620; all loaded saves including the quiet account 5.66 / 57.6, 8.96 / 40.96, 9.34 / 44.03, 11.39 / 46.59 ms. Out of card, 300 s at 394: S second-half p99 40.6 ms; R 430 ms (32 GiB) and 713 ms (16 GiB). **With 256 readers:** S commit p50 / p99 7.46 / 52.48 ms (old pin) and 8.06 / 64.77 (near the head). **Saturday's tape:** 394 stored at 394 offered with p99 11,010 ms (`server-32`, per-save); 249.41/s with 5,523 expired (`server`, whole-turn). | Production tape, 300 s at 394: S 23.06 commits/s, p99 42.0 ms whole, 41.5 ms second half, save completion 42.8 ms; R 393.13 rows/s, 157 ms second half, completion 237 ms. Fresh card (Saturday's tape): reference tape p50 / p99 5.57 / 24.58 ms alone, 5.60 / 22.53 ms with readers; 342.90/s stored at 394. | Card: `--tape production-S --profile server-32 --credit-mode rolling6 --window-seconds 90` (build `090c189a8`, renderer `6c4f9e4fe`). Out of card: REAL2 runner, rolling 6, 300 s. With readers: the tuned reader arm above, `server`. | **Not judged in steady state; forecast met** (card rule of 2026-11-24, CARD2: P2 is judged on the second half of cells of 300 s or more; the card's cells were 90 s). Its halves, all loaded saves, second / first half p50 / p99: 5.54 / 57.6 and 5.73 / 57.3 ms at 50/s; 7.94 / 46.1 and 10.11 / 37.6 at 235; 10.11 / 53.0 and 8.96 / 31.2 at 394; 10.56 / 48.1 and 12.29 / 46.6 at 620 (in 90 s cells the second half is not yet steady). **Forecast** for 300 s cells on the no-burst tape (CARD-READER.md section 7): second-half p50 7 to 10 ms at 50/s and 7 to 9 ms at 235 to 620, p99 30 to 50 ms, met at all four loads with about 55% confidence (the 50/s p99 is the risk). Basis: REAL2's 300 s run at 394 on this database, p50 by minute 10.81 / 6.32 / 7.91 / 8.21 / 8.04 ms, whole window 7.99, second-half p99 40.6 ms; 43 to 51% of a 90 s cell's commits read storage cold (the 2026-11-24 analysis). One commit per row (R) and Saturday's tape stay far outside. With 256 readers the 90 s windows gave p99 52 to 65 ms (not steady state either). Receipts and read-back: exact in every cell. | One commit per subject's save is the product's save shape (owner, 2026-11-24). **Next server session step 3** judges P2 on it (300 s cells, no-burst tape); step 4 measures the wide writer, steps 6 and 12 the writers' hints (W3, W4), step 5 the cost by save size. |
| **P3 Ordered feed.** 0 gaps and 0 order violations per subject; resume replays exactly; lag p99 ≤ 250 ms with 256 readers. | Production-S card: 1,260 ordered exact changes. **Lag at P1's 256 readers p99 30.6 ms** (card rule of 2026-11-24: judged at the 256-reader step; by step 48.6 / 35.6 / 34.6 / 41.0 / 30.6 ms at 1 / 4 / 16 / 64 / 256 readers; 700.4 ms at the 1,024-reader stress step; whole tape 288.8 ms as first reported). On this loader-built database the SDK refuses the feed from before the aged head (the loader's non-canonical journal rows) unless the compatibility option is on. | Fresh card: 1,260 exact ordered changes with readers, lag p99 98.30 ms (whole tape). | Card as P2 (one read core); steps re-rendered from the same campaign with CARD2's code (`evidence/DX-CARD2/prodS-card-rerendered-SCORECARD.md.gz`). | **Lag clause met at 1 billion** (30.6 ms at the bar's 256 readers) and on fresh; 0 gaps and 0 order violations at both sizes. **Resume after a crash not measured on a server**, so the priority is met on every clause measured, not yet on all. The 1,024-reader stress step (700.4 ms) is outside the bar; its likely cause, parked pinned reads holding the read gateway's 512 web threads, was reproduced at toy size (W3). | Resume after a crash on a server; **next server session step 14** (the waiting-read bound at the 1,024 step, forecast lag p99 under 250 ms there). Journal routes now have an opt-in bound and cursor (JRN1, below). The loader must write canonical journal rows before it is used again (the SDK refuses its rows below the sealed head). |
| **P4 Current pulls.** Single-client p50 ≤ 5 ms, p99 ≤ 25 ms; ≥ 1,100 pulls/s per core; flat as history grows. | p50 / p99 4.35 / 44.54 ms (production-S card); 4.42 / 46.59 (`server-32` card, Saturday's tape); 4.22 / 47.10, max 33,179 ms (`server` card). | 4.54 / 50.18 ms (fresh card). | Card pulls beside the card's save loads, one read core. | **Not judged in steady state; forecast met.** By the card rule of 2026-11-24 (CARD2), P4 starts after the reader's backlog drains; last night's pulls ran beside the abandoned 1,024-reader reads and the one-core reader's collector pauses (paused 8 to 9% of the pull window in stops of 18 to 142 ms; the p99 predicted from the pauses, 45 / 42 / 48 ms, matches the cards). p50 met. **Forecast** with the tuned reader (three cores, three collector threads, 3 GiB cache in a 9 GiB heap) after the drain: p99 12 to 25 ms (the card builder gives it about even odds). Throughput per core and flatness with depth not measured. | **Next server session step 3** judges it; measure depths 1, 3 and 10. |
| **P5 Publish.** Per account of 100,000 subjects, under one second to the permanent record and every read returning the new answers; live read and commit p99 ≤ 1.5× without Publish. | Not run. | **100,000 subjects** (ACT3 runner `f5f8c09ff`): small release 100 of 100 Publishes inside 1 s in 11 windows, first correct answer p50 31.6 to 45.3 ms, p99 50.9 to 421.4 ms; large release (20 forms, 20 policies) 120 of 120 inside 1 s, p50 32.1 to 67.3, p99 55.2 to 322.8 ms. Live saves at 39.4/s during Publish: p99 1.7 to 2.3× the control (small release); at 3.5 and 23.5/s at or under 1.1×. First release settled in the background: values 14.5 min, notices 19.2 min (no bar). A large release's background settlement cannot finish (frames exceed the writer's bound). | `server`, whole-turn and per-save credits, live saves at 3.5, 23.5 and 39.4/s, two Publishes per window. | **Under one second: met** at 100,000 on fresh. **Live traffic: not met** as measured at 39.4 saves/s; read from the same evidence on 2026-11-24 (ACT4, `actv-lazy/SETTLEMENT-FRAMES.md` section 8), the p99 is set by one to three whole-store stalls per 100 s window that occur in the control windows too (3 of 14 at an index adoption, 7 of 14 8 to 18 s before one; timing only): outside the stall seconds the Publish windows' save p99 is 0.76 and 1.07 times the control with per-save credits, 1.54 and 2.02 times with whole-turn credits. Not measured at 1 billion. | Built on 2026-11-24, default off: settlement frames sized by bytes (H11.6, ACT4) and "at least" reads for receipt holders (H11.4, RD4; owner decision on making it the product's promise). **Next server session steps 9 and 15.** Judge the live ratio over windows holding the same number of index jobs, or outside stall seconds; run at 1 billion. **Step 8** (ACT5): settlement beside live saves, which the head rule made impossible at size. |
| **P6 Quiet account.** Commit, pinned-read and feed p99 loaded / alone ≤ 1.25, or loaded commit p99 ≤ 50 ms; 0 wrong reads; no expiries. | Production-S card: quiet commit p99 alone → loaded 18.94 → 12.16, 14.34 → 20.74, 13.70 → 17.54, 32.26 → 21.25 ms at 50 / 235 / 394 / 620; 0 wrong; 315 commits per side (the card requires 500). Saturday's tape, `server-32` per-save: loaded 43.52, 57.09, 34.81, 47.62 ms. Quiet pinned reads with the one-core reader missed about two thirds of their offers (0 wrong). Beside 256 tuned readers: 22 to 35 ms; 52.22 and 59.13 ms in the random quiet-stream window (6 and 12 permits). | Production tape: quiet p99 22 ms (R) and 24.0 ms (S). Saturday's tape, rolling 6: 43.91 / 54.00 / 61.79 ms at 235 / 394 / 620. | As P2. | **Commit clause met** on the production-shaped tape at every load at 1 billion (card line PARTIAL: 315 commits per side against 500). Not met on Saturday's tape at 235 at 1 billion or at 394 and 620 fresh. Read and feed ratios not measured. | Cells long enough for 500 commits per side (the card now takes `--window-seconds` up to 600; 150 s gives 525 per side, 300 s 1,050); quiet reads with the tuned reader; the 52 to 59 ms window was the first window after the stack started (100% of the quiet saves read storage; replicated three times), which the card now labels. **Next server session step 3.** |
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
| 22 | Console journal on the 1 billion copy: a journal page walked the position index for minutes under the single journal permit. **Cause withdrawn on 2026-11-24:** the statement that the loader's 28 million position rows never pass the feed's filter and cause the walk is unconfirmed; on a loader-aged toy all 1,200 of the loader's saves passed the filter and came back as journals, and the walk reproduced only over position entries that yield no journal (`jrn1/JOURNAL-BOUNDS.md`). Which entries the 1 billion copy's walk went over is unknown until the JRN1 probe runs (next server session step 2) | gateway `journal.clj` `page`, `entity-positions` | Console side: CON1 `fff5ba67a`, `a7083cb4e`. Gateway: opt-in bound and cursor, default off (JRN1 `e4c0a3771`, merged `2a10a7703`) |
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
| Wide saves `TX2_SUBJECT_WIDE` (W2, merged on 2026-11-24 through S1 `68e43248f`, both old conflicts resolved there) | off | off until next server session step 4; then on only if it shows at least 1.5× less serial apply for commits of 60 facts or more (W2's rule) | Toy: the general writer's serial apply is 1.9 to 3.9× the wide writer's at 17 to 20 facts; with it on, all 840 R and 88 S commits of the production gate take the per-subject writer (S1). Gates on this branch: W2's wide gate 4 tests / 221 assertions, the mixed-identity suite, production and aged gates pass with it off and on. | Step 4 (S1's "Wide" arm against step 3). One commit per subject's save is now the product's save shape, which was W2's condition for considering it. |
| Loader position-row reading (`acceptLoaderPositionRows`, `TRIPLEX_DATOMIC_LOADER_POSITION_ROWS`) | off | **stay off** | Only for databases built by the aging loader; the demo turns it on from its connection file. The loader must write canonical rows instead. | — |
| Save shape (product) | — | **decided by the owner on 2026-11-24: one commit per subject's save** (`lab/V0.1.md` on `main`; contract in `v01/SAVE-SHAPE.md`) | 1 billion: S 40.6 ms second-half p99 against R 430 ms; fresh 41.5 against 157 ms; whole form save 43 ms against 237 to 342 ms. | Commits per second fall about 17 times; P2 is judged on S. |
| The card's tape for new runs (S1, the one default that changes) | Saturday's tape | **changed on this branch: `production-S-noburst`** (S1 made it `production-S`; with CARD2's tapes here it is the no-burst variant, as S1 asked); the realistic card keeps its own tape; a recorded campaign without a tape name still reads as Saturday's | The owner's save-shape decision. The default plan output now differs from `9e02cf1d2` only in its first line: "saves/s" becomes "rows/s (offered as one commit per subject's save)" and the save-tape title becomes "the production-shaped tape, shape S (one commit per subject's save, at the same saves as shape R), with the end-of-cell burst removed (…)". Every other plan line, and every plan that names its tape, is byte-identical. | Step 3 runs it. Saturday's tape stays selectable (`--tape saturday`). |

**Options merged on 2026-11-24 (every option default off; the notice-selection fix and the card's judging rules are not options and are in force; Mac toy evidence only, no server has run any of them).** "What a server
must confirm" names the step of the next server session that judges it.

| Option (builder) | Default now | Proposed | Evidence (Mac toy, diagnostic clocks) | What a server must confirm |
| --- | --- | --- | --- | --- |
| Settlement frames sized by bytes `TX2_SETTLE_FRAMES=bytes` (ACT4; page `actv-lazy/SETTLEMENT-FRAMES.md`) | off (frames of 16 / 4 subjects) | on, after step 9 | The 20 forms and 20 policies release settles to the end with both writers killed and resumed: 4,272 changed values and 1,440 notices equal to the oracle and to an independent statement of the form rule; small release byte-identical to the old framing (by SHA-256); 150 forms per subject (every subject split) exact; every frame estimate at or under 8,000 µs. Pages keep `{subject, changes}` only (2.5 KB per subject at 20 forms against 5.5 KB). | Step 9: 100,000 subjects all owing 20 forms settle within the bound: 6.90 million changes and 2.04 million notices, 22,660 value and 50,000 notice frames (±5%), values 20 to 40 min, notices 25 to 45 min, all exact. Settlement beside live saves, which this row once listed as covered by no command, is step 8 since the afternoon merge (ACT5, below): the risk was real and wider (every frame needed the whole database's head unmoved; on the toy 316 of 325 frames were refused with the account saving 39.4/s and none committed while it saved). |
| Notice selection for a release that changes only forms or policies (ACT4 `fa812ca31`) | **fixed, not an option** | — | Before the fix such a release selected no subject outside the held campaign, so its owed notices were never recorded. Releases without forms or policies take the same path as before; the held campaign of 2026-11-23 was not affected. | — |
| Bounded journal pages: `"bounded": true` on `/transactions` and `/entity-transactions`, SDK `boundedJournalPages` / `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`, caps `TX2_JOURNAL_EXAMINE_ENTRIES` (4096), `TX2_JOURNAL_EXAMINE_MS` (100) (JRN1; page `jrn1/JOURNAL-BOUNDS.md`) | off (per request) | SDK option on, after step 2 | Whole feed, pinned pages, entity journals, field history and the SDK adapter equal to the unbounded routes in 5 + 15 + 45 + 48 + 8 cases on a loader-aged toy; with 3,000 non-journal entries ahead the old page examined 3,001 entries, the bounded page at most 256; the SDK's live suite passed with a bound of 2 entries. A reader that does not ask gets byte-identical answers. | Step 2 (probe, read-only): which entries the 1 billion walk goes over (pages stopping on `limit` with 1,000 journals, or on `entries` / `time` with none); every bounded page at most 4,096 entries and about 100 ms. |
| Field-history page `DatomicClient.historyPage` (JRN1) | new method, unused | the console's field history, after step 2 | 48 of 48 cases equal to the unbounded history read filtered and sorted; 20,701 bytes against 42,016 on the toy. | Step 2 probe 4: warm 20 to 120 ms against 250 to 420 ms unbounded; cold 1.5 to 5 s (it still reads every row datom of the entity). |
| `TX2_JOURNAL_PERMITS` (JRN1) | 1 | 2 only once every journal reader sends bounded pages | Proposal only; nothing measured. **No launcher passes it** (`stack/up.sh` does not), so no server command can set it today. | Needs a launcher pass-through, then P3 lag p99 and receipt-lookup p99 with the card's 256 readers at 1 and 2 permits. |
| Card settings `--reader tuned`, `--read-permits N`, `--window-seconds 90..600`, tapes `production-S-noburst` / `production-R-noburst` (CARD2; page `v01/CARD-READER.md`) | default reader, 90 s cells, burst tapes | for the card's server runs: tuned, 12 permits, 300 s, no-burst | The default card's plan output is byte-identical to `9e02cf1d2` in six option sets (two refusals identical except the stack line); toy cards with both readers and both tapes passed, 0 wrong values; launch guard 95 cases; `server-32` + tuned reader caps sum to the 89 GiB guard exactly (transactor 57, writer 6, reader 11, PostgreSQL 5, host 10). | Step 3, with its refuters: transactor peak at or above 56 GiB or any limit event; the random line's SQL time per storage read above 0.7 ms (PostgreSQL's page cache cut from 8 to 5 GiB is unmeasured); re-read L256 below 7,000/s or p99 above 130 ms. |
| The card's judging rules (CARD2) | **on for every card rendered from this branch** (rules, not options) | — | P2 on the second half of cells of 300 s or more ("Not judged" otherwise); P3 lag at the 256-reader step; P4 after the drain; the first window after each stack start labelled; latency from due and from send with timer lateness; earlier figures printed beside. The plan output is unchanged; a re-rendered 90 s card now says "Not judged" on P2. | Step 3 is the first card judged under them. |
| "At least this position" reads: `atLeast` / `atLeastPosition` on unpinned reads, SDK `ReadAtLeast` (RD4; page `rd4/AT-LEAST.md`) | off (per reader) | the product's reader for anyone holding a receipt (owner decision H11.4); the console uses it from 2026-11-24 | Two-peer toy: a receipt reader early 0 of 300; a plain read sent straight after the acknowledgement early 9 of 150; the gateway waited on 6 of 300 at-least requests (0.3 to 19.6 ms); held peer: waits to the receipt or refuses with `AtLeastTimeout`; no request to the transactor. Held Publish toy with `DX_ACT3_AT_LEAST=1`: 8 of 8 inside 1 s, 0 defects. A sync on every unpinned read was priced and not built (9,000 to 12,000 transactor messages a second at the tuned reader's rates). | Step 15: 0 early answers and 0 refusals in 120 Publishes; first-correct p50 within +3 ms of 2026-11-23 per window; waits on 0 to 10% of requests, mean under 5 ms. |
| Publish runner probe from receipts `DX_ACT3_AT_LEAST=1` (RD4) | off | on for the Publish runs | As the row above. | Step 15. |
| General-writer hints `TX2_GENERAL_PREFETCH=1` (W3; page `w3/GENERAL-WRITER-HINTS.md`) | off | stay off until step 6 | Paired log of 395,917 datoms and 220 receipts identical with hints on and off; production exactness gate on fresh and loader-aged toys identical. Reads inside apply per general commit fell about half (2.84 → 1.38 one at a time) while the transactor's total reads rose 6 to 11% and the gateway made about 3 more cold reads per commit: hints buy writer capacity, not single-save latency. The worst-case tape barely uses the general writer, so hints cannot help it (the morning's forecast for it is withdrawn). | Step 6 (S1's "Hints" arm against step 3): general reads inside apply fall 40 to 55% in the first loaded cell; commit p99 at 620/s down 10 to 30%. |
| Waiting-read bound `TX2_READ_WAIT_LIMIT=N` (`DX_READ_WAIT_LIMIT` in `stack/up.sh`) (W3) | off (every read waits) | 128 on the read gateway, after step 14 | Toy with 16 web threads, 1 permit, 64 pinned flood clients: off, every thread busy and the feed poll and health check took 10.5 s; with 4, feed poll p50 13.7 ms / p99 119 ms, health p99 120 ms, current pulls never refused (p50 0.91 s behind the permit queue), 8,723 pinned reads refused and retried by the SDK. | Step 14: at the 1,024-reader step the feed lag p99 under 250 ms with `busyPeak` under 200, pinned goodput within 20% of off. |
| Web-thread counters `TX2_THREAD_COUNTERS=1` (`DX_THREAD_COUNTERS`), `GET /v2/admin/threads` (W3) | off (the route is always present) | on for server measurement runs | A 50 ms sampler of Jetty busy and queued threads and the read permit queue; the route answered in 43 ms on the starved toy with the bound on. | Step 14 uses it. |
| Per-subject writer hints with ordered IDs `TX2_SUBJECT_HINTS=1` (W4, merged on 2026-11-24; page `w4/SUBJECT-WRITER-HINTS.md`) | off (the old `TX2_SUBJECT_PREFETCH` and its guard unchanged) | **off until the server pair** (steps 12 and 13) | Paired log of 394,317 datoms and 400 receipts identical off and on (W4's toy; 76,317 and 400 again on this branch); stale, wrong and failing hints leave every outcome unchanged (6 tests, 41 assertions); production and aged gates exact with hints on every per-subject save. Reads inside apply per first touch 1.19 → 0.58 one at a time, 0.87 → 0.435 eight in flight; with an 80 ms queue EAVT loads fall 79%. The launch guard refuses it without the per-subject writer and beside `TX2_SUBJECT_PREFETCH=1` (cases added on 2026-11-24, both refused, each beside an admitted control). | Steps 12 and 13 (worst-case tape off and on; restart with and without the start-up read). |
| Settlement precondition `TX2_SETTLE_PRECONDITION=progress` (ACT5; page `actv-lazy/SETTLEMENT-LIVE.md`) | off (`head`: every frame needs the whole database's head unmoved since its read) | on, after step 8 | Toy (ten accounts of 8 subjects, the 20 forms and 20 policies release, 9 frames): with the head rule 316 of 325 frames refused and none committed while the account saved 39.4/s; 242 of 251 refused with only the nine other accounts saving 211.5/s; 2 of 11 refused with no saves (the two writers refuse each other). With `progress`: 0 refused, 9 of 9 committed while saving, every change and notice equal to the oracle and the independent form rule, through three kills, a second release mid-settlement, a rival process, pause, restart and pace; 20 creation races, exactly one landed each time. No live save refused under either rule. A release half settled under one rule finishes under the other | Step 8: head arm at least 3,000 refusals in 300 s and at most 1% committed; settle arm 0 refused, 5.93 million changes and 2.00 million notices within 2%, 65 to 110 min beside 235 saves/s, live p99 within 1.3 times the control outside stalls |
| Several publishing accounts in one database: per-account names `HeldSource.namespace`, the settlement queue's round-robin turns and admission lane, per-account pause, pace and status `TX2_SETTLE_CONTROL=1` (ACT5) | off (one publishing account per database; account 0 keeps its names) | on when several accounts settle at once, after step 10 | Toy, three accounts publishing back to back and settling at once with saves in all ten: under `progress` 0 refused, 9 frames each, finished within 55 ms of each other; with the lane, save p99 the lowest of the three settings; 7 of 7 queue tests (round-robin among three accounts, pause, pace, hold, lane); pause held through a restart, pace 300 ms gave at least 300.3 ms between frames | Step 10 (not runnable from this branch): 0 refused, each account within 10% of the others' frames per minute; the ten-account writer time (about 2.5 h at one frame at a time) is the owner's question before choosing |
| ID lists: route `POST /v2/db/{db}/ids` behind `TX2_ID_LISTS=1` (`DX_ID_LISTS` in `stack/up.sh`), its permit pool `TX2_INDEX_QUERY_PERMITS` (default 1), SDK `listIds` and the adapter option `idLists` (XQ3; page `xq3/ID-LISTS.md`) | off (the route answers 404 as before; the adapter scans) | on for the read gateway, after step 2 | Gateway test 16,460 assertions against a brute-force pass; through the store 1,654 checks (750 page sequences, 34,500 IDs equal to the store's own history read); 72 `entityPage` chains byte-equal to the scan; removal on request leaves the list identical and returns no protected value; a burst of 8 counts on one account ran 1 and refused 7 as busy. Toy account of 400,000 IDs: a cold page of 1,000 costs 2 storage reads at the head, 6 at an old pin; a full cold count 62 to 67 reads. Writes nothing per save; no backfill | Step 2: exactly 100,000 subjects at the head and at 87,002; warm walk 0.1 to 0.35 s, cold 0.3 to 1.0 s; the old pin within 2.5 times the head |
| Uncached pinned reads: batch prefetch `TX2_READ_PREFETCH=1` (`DX_READ_PREFETCH`), Datomic's read-ahead off on the reader `DX_READ_AHEAD_OFF=1` (`-Ddatomic.readAheadPool=0`, configuration only), the reader cache size for the random arm, a second reader on a second machine (`DX_REMOTE_READER_HOST`, `rd5/second-reader.sh`, `DX_RD5_SECOND_READER`) (RD5; page `rd5/UNCACHED-READ.md`) | off | prefetch with permits equal to cores after step 11; read-ahead off only if step 11 shows it is the excess load; the second reader after step 16 | Breakdown of 2026-11-23's evidence: 1.52 of the 1.71 ms of reader CPU per random subject is 1.76 segment loads (0.86 ms each); the 14.1 storage round trips of an exchange run one after another inside the permit. Toy: 3 × 30,548 whole `/read` comparisons, 0 differences; read-ahead off cut storage gets per subject 34 to 45% and CPU 30 to 43%; the prefetch halved an exchange's wall time without changing loads. The toy does not reproduce the 1.76 loads per subject | Step 11: `pf3` 1,500 to 1,850 reads/s; `pf3r` 2,100 to 2,600 if read-ahead is the excess, which would bring the P1 bar from about 7 to about 5 reader cores. Step 16: two readers 4,200 to 5,000 reads/s, p99 85 to 115 ms |
| The exact sweep: route `POST /v2/db/{db}/sweep` behind `TX2_SWEEP=1` (`DX_SWEEP` in `stack/up.sh`), its pool `TX2_SWEEP_PERMITS` (default 1), `TX2_SWEEP_PER_ACCOUNT`, `TX2_SWEEP_QUEUE_MS`, `TX2_SWEEP_CURSOR_SECRET`, SDK `sweepPage`, `sweepAll`, `sweepCount` (XQ6; page `xq6/EXACT-SWEEP.md`) | off (the route answers 404 as before) | on for the read gateway after step 2, as the fallback for what the commit-time index refuses and as that index's reference answer | Gate 5,917 checks against a brute force from the store's history read: 459 sweeps, 2,134 pages over 17 question shapes, 3 accounts, 3 positions and 3 valid instants; equal to `read` in 672 comparisons; exact at its position while subjects change, a removal on request, settlement frames and a reader restart land between pages; 15 typed refusals; no protected value in any answer. A sweep's reads skip the read permit (`admission/*own-pool*`); with nothing bound every other read takes and releases its permit exactly as on `23b7df344` (the permit gate below) | Step 2: a count of 100,000 subjects exact and equal at 1, 3 and 6 parts, 120 to 210 s at 1 part, 45 to 80 s at 3; arm B, the re-read readers' loss while a sweep runs on the same reader (the main unknown) |

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
| `exp/DX-W4-subject-hints` `27fee5dc1` | `5d661f4c1` | `TX2_SUBJECT_HINTS` (per-subject writer hints with ordered IDs), its pass-through and `stack/up.sh` refusals, `w4/SUBJECT-WRITER-HINTS.md` |
| `exp/DX-S1-save-shape` `68e43248f` | `0fec06280` | W2's wide writer `TX2_SUBJECT_WIDE` (its two old conflicts resolved on S1), writer options that reach the card and are recorded and checked against the writer's readback, the save-size ladder, the card's new-run default tape (`production-S-noburst` here), `v01/SAVE-SHAPE.md`; S1's own copy of the reach fix (`f1c95ad80`, the same line as `fdabb86e5`) |
| Gate | `b1193d72e`, `982c54a90` | `int3/reach-gate.sh`: every subject pull (`/reach`, `/reach-many`, row and gzip pages, an old cut and the head) answered by this branch's read gateway, by the unmerged baseline's gateway source (`9e02cf1d2`) and by this source with the waiting-read bound on, on one toy, compared exactly; W3's head (`a6146ff4f`) as the negative control |
| Guard | `07144498e` | Launch guard cases for W4's two refusals and S1's wide writer, each beside an admitted control |
| Card | `4c34fd0f8` | `DX_READ_WAIT_LIMIT` and `DX_THREAD_COUNTERS` reach the card's arms and are recorded (`run.ts` dropped them, so W3's "bound on" arm would have run with the bound off) |

**Conflicts and how each was resolved** (both sides kept every time; W4: gateway `main.clj`'s requires; S1: `v01/run.ts`,
`adopted-server.ts`, `mac.ts` and `saves-arm.ts`, where CARD2's reader setting and first-window label sit beside S1's
writer options and ladder, and `defaultCardTape` became `production-S-noburst`): `actv-lazy/join/held-campaign.ts` (ACT4's large
first release is offered, then RD4 hands its receipt to the probe reader); `packages/datomic/src/DatomicStorageAdapter.ts`
(both adapter options); gateway `admission.clj` (JRN1's journal permit setting with W3's read bound, counters and
`execute` / `execute-for`); gateway `storage.clj` (JRN1's field-history page admitted through W3's `execute-for`);
gateway `main.clj` (the namespace requires RD4's `at-least` and W3's `general-prefetch` and `admission`). Merged
without conflict: `ha1/local.ts` (RD4's holder beside ACT4's hook), `stack/up.sh` (RD4's read-hold proxy beside W3's
pass-through), `DatomicClient.ts` and `index.ts` (JRN1, RD4, W3).

## What the 2026-11-24 afternoon merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| `exp/DX-ACT5-settlement-live` `c1579ee50` | `36bbf53ef` | `TX2_SETTLE_PRECONDITION=progress` (a frame guards its writer's own progress row instead of the database head); per-account metadata names `HeldSource.namespace`; the settlement queue's round-robin turns per account, `hold`, per-account pause and pace, the admission lane (`settlementLane`); `TX2_SETTLE_CONTROL=1` with `readSettlement` / `setSettlementControl`; the held runner's live phase (`DX_ACT5_LIVE`, `DX_ACT5_SERVER`, `DX_ACT5_CASES`, `DX_ACT5_ACCOUNTS`); `actv-lazy/SETTLEMENT-LIVE.md` |
| `exp/DX-XQ3-id-lists` `f1f0908df` | `395df900f` | The ID list route `POST /v2/db/{db}/ids` behind `TX2_ID_LISTS=1`, its permit pool `TX2_INDEX_QUERY_PERMITS`; `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS`, `DX_XQ3_ERASURE_DIRECTORY` in `stack/up.sh`; SDK `listIds`, `listIdsPage`, `configStoreIdLists` and the adapter option `idLists`; the core SPI member `StorageAdapter.getEntityPage`; the gate, count and server runners; `xq3/ID-LISTS.md`. Its history carries one commit (`1308d44d8`) with a local socket path, removed in the next commit; not rewritten (the same path is in the tracked `CLAUDE.md`) |
| `exp/DX-RD5-uncached-read` `67bca118e` | `67417e609` | `TX2_READ_PREFETCH` (gateway `uncached.clj`, called from `lean/rows`); `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_REMOTE_READER_HOST` in `stack/up.sh`; `DX_RD5_READ_PREFETCH`, `DX_RD5_READ_AHEAD_OFF`, `DX_RD5_READ_CACHE_MIB`, `DX_RD5_SECOND_READER` in the random arm (`v01/study-server.ts`, `rd1/pinned-ladder.ts`); `rd5/second-reader.sh`; the gate and probes; `rd5/UNCACHED-READ.md` |
| `exp/DX-XQ6-exact-sweep` `909309c63` (added by the orchestrator during the merge; based on XQ3 `f1f0908df`) | `f56199112` | The exact sweep `POST /v2/db/{db}/sweep` behind `TX2_SWEEP=1` (gateway `sweep.clj`: lists IDs with the ID list walk, reads each subject with the pinned read's own code, tests conditions, signed cursor), its pool `TX2_SWEEP_PERMITS`, `TX2_SWEEP_PER_ACCOUNT`, `TX2_SWEEP_QUEUE_MS`, `TX2_SWEEP_CURSOR_SECRET` (and the `DX_SWEEP*` names in `stack/up.sh`); `admission/*own-pool*` (a sweep's reads skip the read permit; unbound, every read is admitted as before); SDK `sweepPage`, `sweepPageWaiting`, `sweepAll`, `sweepCount`; gate, suites, load and server runners; `xq6/EXACT-SWEEP.md` |
| Launch | `1d6072615`, `b0d88c9ae` | `stack/up.sh` refuses a wrong `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS`, `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF` or `DX_REMOTE_READER_HOST` before the first Docker change; `DX_INDEX_QUERY_PERMITS` takes the gateway's range 1 to 64 (fault 2 below); the same for XQ6's five `DX_SWEEP*` settings; the ha1 toy stack passes `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS` and `DX_SWEEP` to its gateways (nothing when unset) |
| Guard | `853b0ee6a`, `6616b5132` | Fifteen launch guard cases for the new options |
| Gate | `4596f184f` | `int3/reach-gate.sh` records the write-options report of this source and the baseline's; `REACH_WRITE_OPTIONS_SAME=1` makes byte identity part of the verdict |
| Fix | `91f02e68b` | `large-release-check.ts`: its writer-admission stub carries what `Archive.write` reads since ACT5 (fault 1 below) |
| Pairs and the permit gate | `b0b8b079e`, `bcab3640f`, `08d81d3b2`, `3b72ff93a`, `6bba00011`, `2aa1ad8fa` | (a) `DX_ACT5_ID_LISTS=1` in the held live phase; (b) `RD5_TREATMENT_ENV`, `RD5_POOL`, `RD5_AT_LEAST` in the RD5 gate; (c) `int4/pair-c.sh` and `pair-c.ts`; (d) `DX_ACT5_SWEEP=1` in the held live phase; `int4/permit-gate.sh` and `.ts` (read permits counted against the baseline's gateway). All default off; nothing changes when unset |
| Image choice | `67cb0eecf`, `329cb48cd`, `3f8c135dd` | The ha1 toy runner runs only on a Datomic image built from the checkout under test (fault 3); `lab/bin/gate-image.sh`: the aged, RD5, RD2 shortcut and XQ6 suite gates start from one image ID, record it and refuse fixed shared tags (fault 4); the aged gate passes `DX_READ_PREFETCH`, `DX_ID_LISTS` and `DX_SWEEP` to its gateway |

**Conflicts:** none in text; each merge applied cleanly. The overlaps were read and kept side by side:
`ha1/local.ts` (ACT5's holder beside ACT4's hook and RD4's holder), `actv-lazy/join/held-campaign.ts` (ACT5's live phase
and exported helpers beside RD4's receipt handoff), gateway `main.clj` (RD5's `uncached` require and its two
write-options entries, shown only when on, beside the hints entries; XQ3's `ids` require and route, absent when off),
`stack/up.sh` (RD5's remote-reader ports and reader options beside XQ3's ID list options). XQ3 and RD5 had each merged
`23b7df344` already. XQ6 merged after XQ3 and RD5 (it is based on XQ3; RD5 was already on the branch when it was added); its `main.clj` route sits beside XQ3's and its `up.sh` options beside XQ3's and this branch's early refusals, without conflict.

**Faults found in the merge (all four fixed on this branch):**

1. **The database-free large-release check stopped at its first frame after the ACT5 merge** ("A settlement frame
   names its progress row"). ACT5's `Archive.write` reads the archive's precondition, frame counts and queue key; the
   check's stub (ACT3) had none of them, so neither the head rule nor a guard applied. ACT5 ran `frames-check.ts` but not
   this check. Fixed in the stub (`91f02e68b`); its counts are identical to the morning's run at `5e1bb75ba`.
2. **`stack/up.sh` admitted `DX_INDEX_QUERY_PERMITS` of 65 to 99, which the gateway refuses at start-up** (the test said
   "1..64" but matched two digits), and XQ3's and RD5's options were checked only in the gateway loop, after PostgreSQL
   and the transactor had started, so a wrong value cost a started stack and the launch guard could not see it. Fixed
   in `1d6072615`; the guard's new cases show each refusal stopping at its own test.

3. **The ha1 toy runner ran on whichever Datomic image was built last, by any builder, from any branch** (found when
   the orchestrator relayed another builder's report). In its diagnostic, `load-*` and `hasync-*` modes `ha1/local.ts`
   took the newest `datomic-build` event in the shared `lab/locks/events.jsonl` whose image still existed. Every
   builder appends such an event when it builds a Datomic image, so a run started after another builder's build ran
   on that builder's image: its `/opt/gateway` (other than the mounted `src/` and codec spec), `/config` and
   `/opt/datomic`. **The exact condition:** any ha1 run in those modes, on any branch, at any time another branch's
   Datomic image had been built after the run's own branch's and was still in the lab VM. Every ha1 case of this
   afternoon's first pass ran on another builder's image (`d6008c8d…`, `73259ca7…`, `4fbfd98a…`, built by other
   builders, and `575f1c5e…`, this builder's production-gate image, built from a staged copy whose inputs differ), so none of them is counted below; all were rerun. **Fixed** in `67cb0eecf` (`ha1/image-choice.ts`): the
   image must be an engine build whose build inputs equal those computed from the checkout under test (sources and
   the verified distribution; the formula reproduces `main`'s pinned `3a010a2b…`), or the private build named by
   `DX_HA1_DATOMIC_RECEIPT` whose sources are the checkout's; otherwise the run refuses and names the build command;
   `image.json` now records the image, how it was chosen and the checkout's inputs. Four tests (a newer build of
   another branch is passed over; refused when only other branches' images exist; refused when the event's image is
   gone or relabelled; a receipt only with this checkout's sources). The reruns used `tx2-dxthin-jre21:98f93dce098bcbcc`
   (`sha256:390e96e8…`), built from this head (sources `3aa2ef59…`). This is a unit test, not a `guard-check.sh` case:
   the launch guard dry-runs `stack/up.sh`, which takes its images by name and never used the build events.

4. **Mac gates that start a Datomic container themselves started it from a fixed shared tag** (found on the
   orchestrator's report that every builder's production gate retags `tx2-datomic:dx-real2-production`). Four ways a
   run takes its Datomic image on the lab VM, audited:
   - **`engine.mjs` (the REAL2 production gate through `prep1/manage.py`, the selftest lane, the toy cards):** builds
     to a tag, reads the image's ID and build-input label back at once (a label other than its own build inputs is
     refused), pins the ID in the staged `slots.json`, re-checks that the tag still names that ID before each step and
     starts containers by the ID. A retag by another builder makes the run refuse ("Datomic local image id differs
     from slots.json"); it cannot run the other image. Holders DX-THIN1, DX-S1, DX-W3 and DX-W4 build to a private tag
     named from the attempt; every other holder shares `tx2-datomic:dx-real2-production` (production mode) or
     `tx2-datomic:dx-prep1-<mode>`, so their concurrent runs refuse each other, which costs retries, not results.
   - **`stack/up.sh` without a receipt** (`xq3`, `xq6`, reach, permit gate, pair (c), the demo toy): takes the runtime
     tag `tx2-datomic:1.0.7745-da00`, resolves it to an ID before its first container, starts every role by that ID and
     records it (`config/java-image.txt`; every case here recorded `21a67288…`, created 2026-11-21). It does not
     compare that ID with a build of its own; the gateway directory is mounted from the checkout. Not changed: the demo
     toy and the console's second toy start this way, and refusing the tag would stop both.
   - **ha1:** fault 3 (fixed; starts by ID).
   - **Scripts that call `docker run <tag>` directly:** `real2/aged-gate.sh` (default `dx-real2-production`),
     `rd5/gate.sh` and `rd1/shortcut-gate/gate.sh` (`1.0.7745-da00`), `xq6/suites.sh` (`dx-real2-production`), and
     outside this merge `w3/gate.sh`, `w4/gate.sh`, `s1/suites.sh`, `s1/ladder.sh`, `v01/production-aged-toy.sh`,
     `age1/readback-gate.mjs` (`dx-jvm1-startup-read`), `xq3/counts.ts`'s seeder, and the older `b5`, `b8`, `b10`,
     `h5`, `h6`, `r1`, `s4` launchers. These ran whatever image the tag named at that second and recorded nothing.
     **The exact condition for a wrong image:** such a script started while the tag named an image built from another
     checkout whose image-supplied bytes differ from the run's own: the baked gateway (when not mounted), the codec
     spec and vectors, `lab/config/datomic` (Dockerfile, classpath), the Datomic distribution or the Java base. Today
     every such script but `age1/readback-gate.mjs` mounts the gateway source, and those other bytes are identical in
     every Datomic image in the lab VM (table above), so no result counted here depends on it.
   **Fixed for the four scripts in this merge** (`329cb48cd`, `lab/bin/gate-image.sh`): the image must be an ID or a
   private per-build tag (`tx2-dx<holder>-jre21|jre25|native|managed:<hex>`; a JRE tag's label must match its name); it is
   resolved to the ID before any Docker change, the container starts by that ID, `image.json` records it and the
   container's own image is checked against it. Fixed shared tags, including each script's old default, are refused
   with a message naming what to pass. `ha1/gate-image.test.ts` (11 cases) and six live refusals are the guard cases;
   the launch guard itself dry-runs `stack/up.sh`, which this does not change. The aged gate also now passes the read
   options to its gateway and records the gateway's own environment (`3f8c135dd`; before it, its "with options" run
   carried them only in the driver).
   **Results on other branches exposed:** none from the engine route (it refuses rather than runs a moved tag); every
   ha1 run on any branch before its own image-choice fix (fault 3; ACT8 added a receipt route in `813264dac`); and
   every run of the direct scripts above whose evidence lacks an image ID, which is all of them before `329cb48cd`, in
   principle. In effect, only where the image's non-mounted bytes differed, which this audit found nowhere among the
   images present today. `age1/readback-gate.mjs` runs the image's baked gateway: its results reflect the gateway that
   last built `dx-jvm1-startup-read` (`a7f9ce70…`, 2026-11-23), not necessarily the branch that ran it.

**Contradictions between the four pages and the merged code** (the pages are left as their builders wrote them):

1. `xq3/ID-LISTS.md` section 2 and section 6 say the console's gates cannot run beside the owner's toy because
   `demo/toy` offers no second toy. The one branch has offered one since `b6611ad3b` (`DEMO_TOY_NAME`, `DEMO_TOY_PORTS`;
   the console's gates ran that way this morning and this afternoon). Switching the console to `configStoreIdLists` is
   therefore a small change with a gate available, not "not small".
2. `xq3/ID-LISTS.md` section 1 gives `TX2_INDEX_QUERY_PERMITS` the range 1 to 64, as the gateway does; the merged
   `stack/up.sh` admitted 65 to 99 (fault 2, fixed).
3. `rd5/UNCACHED-READ.md` says every option is default off. The options are, but `/v2/admin/scan-stats` now always
   carries a `readPrefetch` entry (`{prefetch: false, batches: 0, …}` when off), so that diagnostic answer is not
   byte-identical to `23b7df344` with nothing set. The write-options report is (gate below). Not changed.
4. `actv-lazy/SETTLEMENT-LIVE.md` section 9.2 item 3 asks for JRN1's journal bounds to be merged before the 1 billion
   run. They are on this branch, but the held runner's ledger walks `/transactions` with its own request
   (`held-ledger.ts`, no `"bounded": true`), not through the SDK adapter, so `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1` does not
   bound it: the merge alone does not satisfy that item. The ACT7 preparation should ask for bounded pages there.
5. `actv-lazy/SETTLEMENT-LIVE.md` section 9.1 and `actv-lazy/SETTLEMENT-FRAMES.md` section 9 predict the same release
   (20 forms and 20 policies on 100,000 subjects, byte frames) differently: 5.93 million changed values and 85,000 to
   100,000 notice frames (about one subject per notice frame, from `frames-check.ts`) against 6.90 million changes and
   50,000 notice frames (step 9). The two runs differ in their first release (ACT5 adds the forms to a form-free release
   after R1; ACT4's `DX_ACT4_INITIAL=large` publishes R1 plus the forms from nothing), which may explain the changes; it
   does not explain a factor of about two in notice frames per subject. Steps 8 and 9 will each show which page's
   frame model holds; `exp/DX-ACT7-settlement-1b-prep` is analysing why notice frames hold about 20 notices.
6. The four pages name their own branch head as `COMMIT` for their server commands; on the one branch every command
   uses the one build (step 1). `rd5/UNCACHED-READ.md` and `xq3/ID-LISTS.md` say nothing else would change.
7. `stack/up.sh` accepts `DX_REMOTE_READER_HOST` matching `10.*`, `172.*` or `192.*` with any later octets, which is
   wider than the page's "this machine's private IPv4 address" (`172.16/12`, `192.168/16`). The driver passes the
   address; no wrong behaviour on a correct address. Not changed.
8. **`feed-test/http-route` errors on the base too, and has since 2026-11-09.** XQ6's page reports one error in the
   gateway's `feed-test` suite on its base without its changes. It is also on `23b7df344` (rerun here: 13 tests, 82
   assertions, 0 failures, 1 error, with and without `TX2_SWEEP`). It comes from `f909a94f1` (DX-B2 N3, 2026-11-09),
   which made `main/timed` encode every response body to UTF-8 bytes before the elapsed-time header is taken; the test
   (`feed_test.clj` line 87) still reads `(:body response)` as a string (`ClassCastException: [B cannot be cast to
   String`). A test fault, not a route fault: the wire answer is the same JSON. Not fixed (no gate runs that suite).
9. The REAL2 production gate's "with options" run (asked for by the merge brief) cannot test the read options: `prep1/manage.py` starts its gateway through `engine.mjs`, which passes none of `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_ID_LISTS` or `DX_SWEEP`. It is reported as a second default run; the options are exercised by the held, pair, permit and aged gates.

### Gates on the merged head (2026-11-24 afternoon)

Mac, toy size, one ordinary heavy token per step, no lease, 18:45 to 21:40 UTC. Counts are results; clocks are
diagnostic. Evidence: `DX-INT4/gates/` in the lab evidence store (`queue.log` lists every case with the head it ran at;
each ha1 case's `image.json` names its image and how it was chosen). The non-ha1 cases ran at `2aa1ad8fa`, `9b4ebba26`
or `093d75bc5`; the commits between them change only the pairs' and the RD5 gate's harnesses, each default off. The
ha1 cases ran at `67cb0eecf` (fault 3's fix, which changes only the ha1 runner). The aged gates ran again at `3f8c135dd` (fault 4's fix, which changes only gate scripts), by image ID. **Every ha1 case
of the first pass is void (fault 3) and is not counted; each was rerun on `sha256:390e96e8…`, the Datomic image built
from this head** (`tx2-dxthin-jre21:98f93dce098bcbcc`, sources `3aa2ef59…`, pinned by `DX_HA1_DATOMIC_RECEIPT`).

| Gate (owner) | Image | Result |
| --- | --- | --- |
| Default card's plan output against `23b7df344` | none | Byte-identical in all six option sets that run; the two refused sets differ only in the source path of the stack line |
| Write-options report against the baseline (`int3/reach-gate.sh`, `REACH_WRITE_OPTIONS_SAME=1`, base `23b7df344`; also against `9e02cf1d2`) | `21a67288…` (recorded by `stack/up.sh`) | Byte-identical, nothing set |
| Lab unit tests (`v01`, `rd1`, `w1`, `ha1` launch hooks, `jvm1`, `actv-lazy/join` frames, ranges, bulk, held, observations) | none | 78 of 78 (73 this morning; the 5 new are ACT5's queue tests) |
| ha1 runner tests (`ha1/*.test.ts`) | none | 27 of 27 (16, plus fault 4's 11) |
| All `actv-lazy/join/*.test.ts` | none | 31 of 31 |
| Identity tests (`w2/wide-ids`, `prep1/ordered-ids`) | none | 5 of 5 |
| SDK (`packages/datomic`, unit; `tsc --noEmit`) | none | 462 passed, 53 skipped; type check clean |
| Core (`packages/core`, unit) | none | 863 of 863 |
| Gateway selftest, prefetch off and on | fixed tag (fault 4) | 29 tests, 54,160 assertions, 0 failures, both |
| XQ3's gateway test (`ids_test.clj`) | fixed tag (fault 4) | 16,460 assertions, 0 failures |
| RD5's `prefetch-test.clj` | fixed tag (fault 4) | Pass (2 batches, 18 subjects, 0 failures) |
| XQ6's gateway suites (`xq6/suites.sh`: selftest, commit-order, cache-key, group, feed, recent, pinned, trace, ids), `TX2_SWEEP` unset and set | fixed tag (fault 4) | 72 tests, 71,161 assertions, 0 failures, 1 error in both: `feed-test/http-route`, which errors on `23b7df344` too (13 tests, 82 assertions, 1 error; contradiction 8). Sweep route unset: 404 `NotFound`. |
| Launch guard (`ha1/guard-check.sh`) | none (dry run) | 117 cases, 0 mismatches; 15 new: each of `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS`, `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_REMOTE_READER_HOST`, `DX_SWEEP`, `DX_SWEEP_PERMITS`, `DX_SWEEP_QUEUE_MS`, `DX_SWEEP_CURSOR_SECRET` refused at its own test before the first Docker change, beside admitted controls |
| Fixed shared tags refused (fault 4): `aged-gate.sh`, `rd5/gate.sh`, `rd1/shortcut-gate/gate.sh`, `xq6/suites.sh` with the image unset or set to `tx2-datomic:dx-real2-production` or `dx-prep1-subject-query` | none | All six refused, exit 2, before any Docker change; no gate container created. Admitted controls: the `g-` rows below, started by ID |
| **Read permits after the sweep merge** (`int4/permit-gate.sh`, new): four copies of one toy's read gateway, 2 permits, bound 2, `TX2_SWEEP` unset: `23b7df344`'s source, this source, the source before the sweep merge with the prefetch on, this source with the prefetch on; 40 pinned, 40 current and 40 at-least reads of 8 subjects, then a burst of 24 | `21a67288…` (recorded) | Per phase, every copy took exactly 40 permits, refused 0, left 0 waiting and 2 of 2 permits free; at-least requests 40 in the at-least phase on all four; prefetch batches 40 per phase on both prefetch copies, 0 on this source without it; answers identical to the baseline's. Burst: admitted + refused = 24 on every copy (9 + 15, 16 + 8, 8 + 16, 6 + 18: refusals by the bound vary with timing), 0 waiting and both permits free after. Sweep route 404 on all four |
| `frames-check.ts 256`, `large-release-check.ts 256` (ACT4, ACT3) | none | Pass, pass (counts equal to this morning's; fault 1 fixed) |
| Subject pulls (`int3/reach-gate.sh`), base `9e02cf1d2` and base `23b7df344` | `21a67288…` (recorded) | 22 of 22 identical across this source, the baseline's and this source with the bound; the negative control differs in 22 of 22 |
| XQ3 store gate (`xq3/gate.sh`) | `21a67288…` (recorded) | PASS, 1,654 checks |
| XQ6 gate (`xq6/gate.sh`) | `21a67288…` (recorded) | PASS, 5,917 checks, 0 failures: 472 sweeps, 2,215 pages, 2,513 IDs and 2,939 counted subjects equal to brute force, 15 refusals as expected |
| RD5 gate (`rd5/gate.sh`, ten accounts of 200) | fixed tag `1.0.7745-da00` (`21a67288…`, created 2026-11-21, fault 4) | Pass: 30,548 comparisons over 1,686,030 rows, 0 differences; the four probes 0 wrong, 0 errors (first attempt stopped at a seed save answered "commit outcome unknown"; the seed now resends, `093d75bc5`) |
| **Pair (b): RD5's gate with the waiting-read bound 2, thread counters and at-least reads on both prefetch readers, 16 comparisons in flight** | fixed tag `1.0.7745-da00` (`21a67288…`) | Pass: 30,548 comparisons over 1,686,252 rows, 0 differences; both read windows 0 wrong, 0 errors; 26 at-least reads after live saves, 0 early, 0 wrong echoes; the bound refused 3,646 and 5,969 reads, all retried by the SDK; prefetch 15,200 and 15,705 batches, 0 failures |
| **Pair (c): ID lists and the read prefetch on one read gateway, one permit each, 64 pinned readers, 60 s** | `21a67288…` (recorded) | Pass: 8,480 pinned reads (67,265 rows), all 200, 0 wrong against the reference; 568 steady ID lists at the head and pinned, all exact (3,518 pages answered, 1 page `IndexBusy` by the permit wait, retried); count bursts 32 answered exact, 28 `IndexBusy` (one request per account); nothing refused outside its own bound; prefetch 8,480 batches, 0 failures; 3 seed resends |
| REAL2 production exactness gate: default; with `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_ID_LISTS`, `DX_SWEEP` | private `tx2-dxthin-native:<attempt>` (`575f1c5e…`, built by the gate itself, run by pinned ID) | Pass, both: 2,836 fields exact, 0 expired. **The options do not reach this gate's gateway** (`prep1/manage.py` runs it through `engine.mjs`, which passes none of them), so the second run is a second default run; the read options are exercised by the held, pair, permit and aged rows instead |
| REAL2 production tape on a loader-aged toy (`real2/aged-gate.sh`): default; with `DX_READ_PREFETCH=1 DX_ID_LISTS=1 DX_SWEEP=1` | `3f13d2c1…` by ID (`tx2-datomic:dx-prep1-subject-query`, created 2026-11-20) | Pass, both, run by ID and recorded (`image.json`: the container ran `3f13d2c1…`): 120 aged rows admitted, a tampered aged row refused, 1,927 fields, final cut 1,289, 840 + 88 offers acknowledged, 0 expired. With the options, the running gateway reports `TX2_ID_LISTS=1`, `TX2_READ_PREFETCH=1`, `TX2_SWEEP=1` (`gateway-options.txt`; read-ahead off is not passed, the container fixes its JVM flags). The first pass (at `093d75bc5`, tag by name, options only in the driver) gave the same counts |
| Settlement-frames gate (`DX_ACT4_GATE=1`), strict | `390e96e8…` | Pass: ACT4's counts (4,272 changes, 1,440 notices, independent rule 72 of 72) |
| Held Publish toy, strict: default; large release; large release settled by bytes; the same with `TX2_SETTLE_PRECONDITION=progress`; bytes with at-least reads (pair 1 of this morning); at-least reads | `390e96e8…` | Pass, all six (the runner's own checks: deadline Publishes inside 1 s, 0 read, visibility or at-least defects, settlement equal to the oracle and the independent rule). |
| Held with an injected stale at-least probe (must fail) | `390e96e8…` | Fails as designed: the injected stale read is caught (`1 !== 0` at the at-least check) |
| ACT5's own cases, first set (control; 39.4/s own saves under head and progress; the nine other accounts saving under head and progress; the admission lane; three kills; pause and pace through a restart; stop under head then finish under progress; same release) | `390e96e8…` | All ten cases pass: head refuses frames while saving and commits none while saving; progress 0 refused, settled while saving; every case 474 changes, 160 notices, independent rule 8 of 8; kill: 3 children killed, finished exact; pause: 0 frames while paused, pace kept |
| ACT5's own cases, second set (guard, rival process, second release mid-settlement with the 150-form release, three accounts under head, progress and the admission lane, delivered once) | `390e96e8…` | Pass: progress 0 refused everywhere; three accounts 474 changes and 160 notices each, equal to the independent rule; 20 of 20 creation races one winner; notices delivered once, 0 the second time |
| **Pairs (a) and (d): ID lists and sweeps of the settling account beside settlement with the progress precondition and live saves**, one case per fresh toy | `390e96e8…` | Pass, all three cases. 23.5/s own saves with the nine other accounts: 49 ID-list answers checked at their positions (10,339 IDs equal to the store's history read), 12 sweeps checked. 39.4/s own saves: 64 ID lists, 43 checked at 11 positions (9,073 IDs); 82 sweeps, 13 checked at 12 positions (1,477 IDs), 0 `SweepBusy`. Kill: 60 ID lists, 40 checked at 10 positions (8,440 IDs); 74 sweeps, 12 checked at 11 positions (1,266 IDs). Every case: settlement exact (474 changes, 160 notices, independent rule). Running the three cases on one toy exhausts the toy read gateway's 320 MB heap in the checker's history reads (a harness limit, not a store result) |
| Console gates on a second toy (`DEMO_TOY_NAME=int4`) | `21a67288…` via `stack/up.sh` (gateway mounted) | g12, config 16/16, entities 19/19, query 24/24, journal 7/7, derive 4/4, catalogue 70/70, proof 37/37; 94 at-least requests. The owner's toy on 28580 was not touched |
| Toy cards (`v01/mac.ts`): default; `production-S-noburst` tuned reader, 12 permits | private `tx2-dxthin-managed:<inputs>`, run by pinned ID | Both pass (first attempts of the default refused for room by the memory pool; the run that counts is `n-toy-card-default-t2`) |

**Images that ran from a fixed tag (fault 4) and why they are counted.** The XQ3 gateway test, RD5's prefetch test, the
first selftest and suites runs, the RD5 gate and pair (b) started from `tx2-datomic:dx-real2-production` or
`tx2-datomic:1.0.7745-da00` by name, and their image ID was not recorded. Each of them mounts this head's gateway
source (and, where it uses one, this head's codec spec) over the image's copy. Everything else they take from the image
was compared across every Datomic image in the lab VM (`21a67288…`, `3f13d2c1…`, `da58aea1…` and this head's
`390e96e8…`): the `/opt/datomic` tree hashes to `82738ed5…` in all four, Java is 21.0.13 in all four, and the baked
`codec-spec.json`, `codec-cases.json`, `codec-vectors.json`, `history-range-case.json` and `trace-logback.xml` are
byte-identical in all four (only `trace.jfc`, a recording profile none of these runs uses, differs in `3f13d2c1…`). No
branch has changed `lab/config/datomic`'s Dockerfile or classpath, or those files, since 2026-11-21. So whichever
builder last retagged those names, these runs took the same bytes as this head's own image. 

## Next server session (one driver, in this order; none has run)

Rewritten on 2026-11-24 (afternoon) after the ACT5, XQ3 and RD5 merges, in the order the owner ranked the work that
morning: **A. questions across subjects and the save shape; B. scale** (settlement beside saves, a subject owing 200
forms or more, a release near the 1.3 MB ceiling, 1 billion records); **C. the other priorities**, in priority order.
Build the head of `exp/DX-INT1` that carries this page once; every command below uses that one build (`COMMIT` = that
head; the merged pages name their own branch heads, which this build replaces). Environment, copies and the
scorecard parts as `v01/AGED-SERVER-32.md` and `v01/PRODUCTION-CARD.md`; the held runs as `actv-lazy/PART9.md`. Each
step's predictions and refuters are in its page (linked); the table after the commands gives the headline ones. Cost
is at USD 1.09 per machine hour; every step needs one machine except step 16, which needs two.

**Corrected on 2026-11-24 (S1's findings, merged):** W3's and W4's pages publish card commands that run `part 2` alone
and pass the options as bare environment words. The sequential runner refuses a campaign that does not start with
part 1, and before `9a7fd3682` (S1) and `4c34fd0f8` (this branch) `run.ts` dropped every option it did not name, so
the "on" arms would have run with the option off. Below, every card arm is its own campaign with parts 1 and 2, and
the options reach the arm (`TX2_SUBJECT_WIDE`, `TX2_GENERAL_PREFETCH`, `TX2_SUBJECT_HINTS`, `DX_READ_WAIT_LIMIT`,
`DX_THREAD_COUNTERS`), are recorded in the campaign and, for the writer options, checked against the write gateway's
readback. **The card's new-run default tape is now `production-S-noburst`**, so every command names its tape.

**Old step numbers** (the list of the morning, which the pages of ACT4, JRN1, CARD2, RD4, W3, W4 and S1 do not use, but
earlier notes may): 1 → 1, 2 → 3, 3 → 4, 4 → 14, 5 → 15, 6 → 9, 7 → 2, 8 → 6, 9 → 12, 10 → 13, 11 → 5.

| Step | What | Page | Machines | Duration | Cost (USD) |
| --- | --- | --- | --- | --- | --- |
| **A** | **Questions across subjects and the save shape** | | | | |
| 1 | Build (`v01/build.ts`) and the card's dry run (part 1 to its first offer) | `v01/CARD-READER.md` §7 | 1 | 5 + about 10 min | 0.27 |
| 2 | **Questions across subjects at 1 billion, in one demo bring-up** of the 1 billion working copy with the ID list and sweep routes on: the journal probe first (it wants the read gateway to itself); the **ID lists** (every subject of one deep account, cold and warm, at the head and at 87,002; every ID of the account); the **exact sweep**, arm A (counts of 100,000 subjects at 1, 3 and 6 parts, two lists; reads only) then arm B (the same beside 256 pinned readers and saves at 23/s on account-005, which writes to the working copy, so it runs last); then down | `xq3/ID-LISTS.md` §5; `xq6/EXACT-SWEEP.md` §6; `jrn1/JOURNAL-BOUNDS.md` | 1 | 30 to 60 min (bring-up 3 to 12, journal probe about 3, ID lists 3 to 10, sweep A 10 to 20 and B 10 to 14, down about 1) | 0.55 to 1.09 |
| 3 | **The full card at 1 billion with the tuned reader and 300 s cells** (no-burst shape S, `server-32`, 12 read permits, per-save credits). Its parts 1 and 2 are also S1's "Control" arm | `v01/CARD-READER.md` §7; `v01/SAVE-SHAPE.md` §6.1 | 1 | 2 h 05 min to 2 h 35 min | 2.27 to 2.82 |
| 4 | S1's "Wide" arm: the card's settings with `TX2_SUBJECT_WIDE=1`, parts 1 and 2 | `v01/SAVE-SHAPE.md` §6.1 | 1 | 71 to 85 min | 1.29 to 1.54 |
| 5 | S1's save-size ladder at 1 billion with 256 pinned readers (seven windows, 5 to 1,000 facts), wide writer off | `v01/SAVE-SHAPE.md` §6.2 | 1 | 33 to 36 min (deadline 40) | 0.60 to 0.65 |
| 6 | S1's "Hints" arm (the card's settings with `TX2_GENERAL_PREFETCH=1`, parts 1 and 2), against step 3 as its control (it replaces W3's pair (c)) | `v01/SAVE-SHAPE.md` §6.1; `w3/GENERAL-WRITER-HINTS.md` §4 (c) | 1 | 71 to 85 min | 1.29 to 1.54 |
| 7 | **Not yet runnable from this branch:** the index cost pair (an index by attribute and value, k = 0, 3 and 20 declared values per save, production-S at 394 on the fresh template). Its option `TX2_ATTRIBUTE_INDEX` is on `origin/exp/DX-XQ2-index-cost` (a measurement, not merged) and its launcher refuses any other `HEAD` | `xq2/INDEX-COST.md` (on that branch) | 1 | about 60 to 65 min | about 1.09 to 1.18 |
| **B** | **Scale** | | | | |
| 8 | **Settlement beside live saves, one account, 100,000 subjects, fresh database:** a 300 s control, the 20 forms and 20 policies release settled under today's head rule for 300 s while saving (then stopped), then finished under `progress` while the saves go on (window up to 7,200 s), then the full exactness check | `actv-lazy/SETTLEMENT-LIVE.md` §9.1 | 1 | 3 h to 3 h 30 min | 3.27 to 3.82 |
| 9 | Publish at 100,000 subjects with the large first release settled by bytes, then the four 39.4/s windows | `actv-lazy/SETTLEMENT-FRAMES.md` §9 | 1 | 55 to 85 min (runner limit 120) | 1.00 to 1.54 |
| 10 | **Not yet runnable from this branch:** settlement beside saves at 1 billion with 3 and then 10 accounts publishing within minutes of each other (byte frames, the guard, the admission lane). Six preparation items are missing (adoption of the aged seal by the held runner, the oracle for aged subjects, streaming the check for ten accounts, production-shaped saves in the held runner, a prepared 1 billion copy); being built on `exp/DX-ACT7-settlement-1b-prep` | `actv-lazy/SETTLEMENT-LIVE.md` §9.2 | 1 | page: settlement 90 to 160 min (3 accounts), 5 to 9 h (10), plus a restore of about 30 min each; runner limit 420 min | not costed until runnable |
| — | A subject owing 200 forms or more and a release near the 1.3 MB ceiling: no server command exists yet (`exp/DX-ACT6-release-limits` is being built) | | | | |
| **C** | **The other priorities, in priority order** | | | | |
| 11 | P1: uncached pinned reads, command 1: the random arm with the read prefetch at 3 permits, then the same with Datomic's read-ahead off, then with a 1.5 GiB reader cache (one new copy per configuration) | `rd5/UNCACHED-READ.md` §7 | 1 | about 50 min (ceiling 60) | 0.91 to 1.09 |
| 12 | P2: W4 (a), the worst-case (Saturday's) tape at 1 billion, `server-32`, 90 s, parts 1 and 2, per-subject hints off and on | `w4/SUBJECT-WRITER-HINTS.md` §4 (a) | 1 | about 2 × 50 min | 1.82 |
| 13 | P2: W4 (b), restart at 1 billion with per-subject hints on, with and without the one-time start-up read (the off comparison is 2026-11-23's run) | `w4/SUBJECT-WRITER-HINTS.md` §4 (b) | 1 | about 2 × 25 min | 0.91 |
| 14 | P3: the 1,024-reader step with the waiting-read bound: the production-S card (one-core reader, 90 s), parts 1 and 2, bound off and 128, thread counters on in both | `w3/GENERAL-WRITER-HINTS.md` §4 (b) | 1 | about 2 × 45 min | 1.64 |
| 15 | P5: Publish at 100,000 subjects, all twelve windows, probe reading at least each receipt | `rd4/AT-LEAST.md` §4 | 1 | about 35 min | 0.64 |
| 16 | P1: uncached pinned reads, command 2: a second read gateway on a second machine (prefetch on both readers, then prefetch and read-ahead off on both) | `rd5/UNCACHED-READ.md` §8 | **2** (machine 2: at least 4 cores and 12 GB free, same private network) | about 55 min with set-up (ceiling 60) | 2.00 to 2.18 (two machines; at least 2.18 if each machine is billed by the whole hour) |
| — | If time: S1's "Both" arm (wide and general hints, 71 to 85 min); the ladder's wide arm (about 35 min). Not recommended: W3 (a), the worst-case tape with general-writer hints (predicted no change; that tape takes the per-subject writer, which step 12 covers) | | | | |

**Three totals** (runnable steps only; steps 7 and 10 are not runnable from this branch):

| Session | Steps | Duration | Cost (USD) |
| --- | --- | --- | --- |
| **Shortest that settles the top-ranked questions** (ID lists and the exact sweep at 1 billion; P2 judged on one commit per subject's save in steady state; the wide writer; cost by save size) | 1 to 5 | 4 h 34 min to 5 h 51 min (15 + 30 to 60 + 125 to 155 + 71 to 85 + 33 to 36 min) | 4.98 to 6.38 |
| **Everything runnable today on one machine** | 1 to 6, 8, 9, 11 to 15 | 15 h 05 min to 17 h 46 min (group A 345 to 436 min, B 235 to 295, C 325 to 335) | 16.44 to 19.37 |
| **Everything, with the second machine for step 16** | all runnable steps (1 to 6, 8, 9, 11 to 16) | 16 h 00 min to 18 h 46 min of the first machine, plus 55 to 60 min of the second (905 to 1,066 + 110 to 120 machine minutes) | 18.44 to 21.55 |

Step 6 (S1's "Hints") is the next step in the top-ranked group; with it the top-ranked group is 5 h 45 min to 7 h 16 min
(USD 6.27 to 7.92). Steps 7 and 10, once runnable, add about 65 min (USD 1.18) and several hours (step 10 at ten
accounts alone is 5 to 9 h of settlement).

**Which steps share a database bring-up.** Only step 2: the journal probe, the ID list runner and both sweep arms use
one demo bring-up of the 1 billion working copy (`demo/server-up.sh --reset` with the ID list and sweep settings; the
journal probe ignores the routes; sweep arm B writes, so it runs last). Each page publishes its own bring-up and build
(`pnpm install` and package builds); with step 1's build neither is needed. Every card arm (steps 3, 4, 6, 12, 14) makes a new physical copy per part from the same 1 billion source and
shares only the build; steps 4 and 6 reuse step 3's parts 1 and 2 as their control (a shared measurement, not a shared
bring-up). Steps 8, 9 and 15 each boot a new prepared copy of the fresh template (about 4.4 minutes each; a settled
release changes the copy, so they cannot share one). Step 11 makes one new copy per configuration (three); step 16
reuses step 11's function and makes two more. Step 5 (the ladder) runs its own saves arm on a new copy. One build
(step 1) serves every step.

```bash
# 1. Build once, from the commit that carries this page
COMMIT=<head of exp/DX-INT1 carrying this page>
BUILD=/var/tmp/triplex-v01-int4-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"

# Card parts. $1 part, $2 new scratch copy, $3 campaign directory, $4 fresh|1B, $5 tape, $6 profile, $7 window seconds,
# $8 reader (default|tuned); $EXTRA = options for this arm (may be empty). As v01/PRODUCTION-CARD.md "One part".
part() {
  local source aged=() reader=()
  if [[ $4 == 1B ]]; then source=$AGED_PGDATA_SOURCE; aged=(--aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256")
  else source=$FRESH_PGDATA_SOURCE; fi
  [[ $8 == tuned ]] && reader=(--reader tuned --read-permits 12)
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" $EXTRA \
    "AGE_JAVA=${AGE_JAVA:-}" "AGE_DATOMIC_HOME=${AGE_DATOMIC_HOME:-}" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age "$4" --tape "$5" --profile "$6" "${reader[@]}" --credit-mode rolling6 --window-seconds "$7" \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    "${aged[@]}" --pgdata-source "$source" --pgdata "$2"
}
arm() {  # $1 campaign directory, then part's $4..$8; parts 1 and 2, one new copy each
  local out=$1; shift
  for n in 1 2; do make_copy "$COPY" || return 1; part "$n" "$COPY" "$out" "$@" || return 1; remove_copy "$COPY"; done
}
CARD=(1B production-S-noburst server-32 300 tuned)
EXTRA=; DX_DRY_RUN_FIRST_OFFER=1 part 1 "$DRY_COPY" /var/tmp/v01-int4-card-dry "${CARD[@]}"   # must print "DX-DRY-RUN first offer reached"

# 2. Journal probe (JOURNAL-BOUNDS.md), ID lists (ID-LISTS.md section 5) and the exact sweep (EXACT-SWEEP.md section 6):
#    one demo bring-up of the 1 billion working copy with both question routes on; the sweep's arm B writes, so it is last
sudo env DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6 DX_SWEEP_QUEUE_MS=5000 \
  DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#    prints DEMO READY head=28309866 records=1000251169 t=62888918
node --import tsx lab/experiments/EXP-DX1/jrn1/probe.ts http://127.0.0.1:18495 <db from /var/tmp/triplex-demo/ready.json> \
  28309866 '<account-003 namespace>i9:00050000' '<account-003 namespace>i9:00000000' \
  --attribute :task/field-0 --far 87002 --entity-pages 200 --feed-pages 5 > jrn1-probe-1b.jsonl
sudo node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/server.ts \
  /var/tmp/triplex-demo/ready.json "$OUT/xq3-1b" account-003
sudo node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq6/server.ts \
  /var/tmp/triplex-demo/ready.json "$OUT/xq6-1b" account-003
sudo bash demo/server-down.sh

# 3. The full card: parts 1 to 3 and assembly
OUT=/var/tmp/v01-1b-prodSnb-s32-tuned
for n in 1 2 3; do make_copy "$COPY"; part "$n" "$COPY" "$OUT" "${CARD[@]}"; remove_copy "$COPY"; done
sudo env "PATH=$BUILD/tools/bin:$PATH" "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$OUT"

# 4. S1 "Wide" (its "Control" is step 3's parts 1 and 2)
EXTRA=TX2_SUBJECT_WIDE=1 arm /var/tmp/s1-card-wide "${CARD[@]}"

# 5. S1's save-size ladder: saves_arm exactly as v01/SAVE-SHAPE.md section 6.2, wide off

# 6. S1 "Hints" = W3 (c) at the card's settings; off arm = step 3
EXTRA=TX2_GENERAL_PREFETCH=1 arm /var/tmp/s1-card-hints "${CARD[@]}"

# 7. Not yet runnable from this branch (xq2/INDEX-COST.md on origin/exp/DX-XQ2-index-cost)

# 8. Settlement beside live saves, one account, 100,000 subjects, fresh prepared copy (SETTLEMENT-LIVE.md section 9.1)
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "TX2_SETTLE_FRAMES=bytes" "DX_ACT3_SETTLE=0" "DX_ACT5_LIVE=1" "DX_ACT5_SERVER=1" "DX_HELD_MINUTES=240" \
  "DX_ACT5_CASES=control:progress:bytes:none:23.5:1:::300,head:head:bytes:large:23.5:1:stop::300,settle:progress:bytes:same:23.5:1:::7200" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"

# 9. Publish with the large first release settled by bytes (SETTLEMENT-FRAMES.md section 9); a new prepared copy
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "TX2_SETTLE_FRAMES=bytes" "DX_ACT3_RELEASE=forms=20,policies=20,permille=1000" \
  "DX_ACT3_SETTLE=1" "DX_ACT4_INITIAL=large" "DX_HELD_MINUTES=120" \
  "DX_HELD_WINDOWS=barrier6/39.4/0,barrier6/39.4/1,rolling6/39.4/0,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"

# 10. Not yet runnable from this branch (SETTLEMENT-LIVE.md section 9.2; exp/DX-ACT7-settlement-1b-prep)

# 11. Uncached pinned reads, command 1 (UNCACHED-READ.md section 7): three configurations, one new copy each
rd5_arm() {  # $1 new copy, $2 new campaign directory, $3 deadline ms, $4 permits, $5 prefetch, $6 read-ahead off, $7 cache MiB
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=random \
    "DX_RD3_READ_PERMITS=$4" "DX_RD5_READ_PREFETCH=$5" "DX_RD5_READ_AHEAD_OFF=$6" "DX_RD5_READ_CACHE_MIB=$7" \
    ${DX_REMOTE_READER_HOST:+DX_REMOTE_READER_HOST=$DX_REMOTE_READER_HOST} ${DX_RD5_SECOND_READER:+DX_RD5_SECOND_READER=$DX_RD5_SECOND_READER} \
    DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-saves "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
OUT=/var/tmp/triplex-rd5-1b; mkdir "$OUT" "$OUT/pf3" "$OUT/pf3r" "$OUT/pf3c"   # one parent per configuration
T0=$(date +%s%3N)   # make each copy just before its configuration and remove it after; skip one with under 18 min left
rd5_arm "$COPY_1" "$OUT/pf3/campaign"  $(( T0 + 20 * 60 * 1000 )) 3 1 0 3072   # prefetch, 3 permits
rd5_arm "$COPY_2" "$OUT/pf3r/campaign" $(( T0 + 40 * 60 * 1000 )) 3 1 1 3072   # the same, read-ahead off
rd5_arm "$COPY_3" "$OUT/pf3c/campaign" $(( T0 + 60 * 60 * 1000 )) 3 1 0 1536   # the same as pf3, 1.5 GiB cache

# 12. W4 (a): Saturday's tape, per-subject hints off and on
EXTRA=                    arm /var/tmp/v01-1b-sat-w4-off 1B saturday server-32 90 default
EXTRA=TX2_SUBJECT_HINTS=1 arm /var/tmp/v01-1b-sat-w4-on  1B saturday server-32 90 default

# 13. W4 (b): restart with hints, with and without the one-time start-up read (jvm1/STARTUP-READ.md inputs)
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" TX2_SUBJECT_HINTS=1 \
  bash lab/experiments/EXP-DX1/jvm1/startup-server.sh \
  "$COMMIT" "$OUT_1B_W4" "$SEED_DIR" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$AGED_PGDATA_SOURCE" "$(sudo sha256sum "$AGED_PGDATA_SOURCE/global/pg_control" | cut -d ' ' -f 1)" "$WAL_MOUNT" \
  --credit-mode rolling6 --arms today-cache32,startup-read-cache32 \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-sha256 "$AGE_HANDOFF_SHA256"

# 14. W3 (b): the waiting-read bound at the 1,024-reader step, the one-core reader as on 2026-11-23
for a in off on; do
  limit=; [[ $a == on ]] && limit=DX_READ_WAIT_LIMIT=128
  sudo bash lab/experiments/EXP-DX1/w3/threads-sampler.sh "/var/tmp/v01-1b-rq-$a-threads.jsonl" & sampler=$!
  EXTRA="DX_THREAD_COUNTERS=1 $limit" arm "/var/tmp/v01-1b-rq-$a" 1B production-S server-32 90 default
  wait "$sampler"
done

# 15. Publish, all twelve windows, probe from receipts (AT-LEAST.md section 4); fresh prepared copy as PART9.md
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "DX_ACT3_SETTLE=0" "DX_ACT3_AT_LEAST=1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"

# 16. Uncached pinned reads, command 2 (UNCACHED-READ.md section 8): a second reader on machine 2. Addresses stay in
#     the driver's private notes. On machine 2 (as root), first; it waits up to 10 minutes for machine 1's ports:
second() {  # $1 read-ahead off (0 or 1), $2 new output directory
  RD5_MACHINE1=<machine 1 private IP> RD5_LISTEN=<machine 2 private IP> RD5_IMAGE="$SCALE1_IMAGE" RD5_REPO=<checkout at $COMMIT> \
    RD5_CPUS=0-2 RD5_PERMITS=3 RD5_PREFETCH=1 "RD5_READ_AHEAD_OFF=$1" RD5_HEAP_MIB=6144 RD5_CACHE_MIB=3072 RD5_MEMORY_MIB=9216 \
    "RD5_OUT=$2" bash lab/experiments/EXP-DX1/rd5/second-reader.sh start      # prints DX_RD5_SECOND_READER=...
}
second 0 /var/tmp/triplex-rd5-second/two-pf
# On machine 1, at the same time (rd5_arm of step 11):
OUT=/var/tmp/triplex-rd5-two; mkdir "$OUT" "$OUT/two-pf" "$OUT/two-pfr"
export DX_REMOTE_READER_HOST=<machine 1 private IP> DX_RD5_SECOND_READER=http://<machine 2 private IP>:18492
T0=$(date +%s%3N)
rd5_arm "$COPY_1" "$OUT/two-pf/campaign" $(( T0 + 25 * 60 * 1000 )) 3 1 0 3072
# On machine 2, after that arm has ended: stop, then start the second configuration
RD5_OUT=/var/tmp/triplex-rd5-second/two-pf bash lab/experiments/EXP-DX1/rd5/second-reader.sh stop
second 1 /var/tmp/triplex-rd5-second/two-pfr
# On machine 1 (a new copy; skip if fewer than 20 minutes remain of the hour):
rd5_arm "$COPY_2" "$OUT/two-pfr/campaign" $(( T0 + 60 * 60 * 1000 )) 3 1 1 3072
unset DX_REMOTE_READER_HOST DX_RD5_SECOND_READER
RD5_OUT=/var/tmp/triplex-rd5-second/two-pfr bash lab/experiments/EXP-DX1/rd5/second-reader.sh stop   # on machine 2
```

Headline predictions and what would show them wrong (all written before any run; full tables in the pages):

| Step | Predicted | Wrong if |
| --- | --- | --- |
| 2 | **Sweep** (arm A): a count of account 3's 100,000 subjects exact and the same at 1, 3 and 6 parts, `examined` 100,000; 120 to 210 s at 1 part, 45 to 80 s at 3, 30 to 60 s at 6; 150,000 to 200,000 storage reads; a filtered list of the first 10,000 subjects cold 12 to 21 s, repeated 2 to 6 s. Arm B: re-read pinned readers down 30 to 80% (1 part) and 50 to 85% (3 parts) while a sweep runs, back within 10% after; saves' p99 within 1.25 times the control; 0 errors. **ID lists:** exactly 100,000 subjects of account 3, in order, 100 pages, at the head and at 87,002; 270,000 to 290,000 entries examined per walk; warm walk 0.1 to 0.35 s in all (0.4 to 1.2 µs per entry); cold 0.3 to 1.0 s (first page 5 to 30 ms); 87,002 at 1.0 to 2.5 times the head; every ID of the account 1 to 5 million (`pl:` 270,000 to 290,000, `i9:` 540,000 to 600,000), warm 1 to 6 s; 0 refusals. **Journal probe:** newest 20 by the old route 20 to 32 entries; pages from below the sealed head stop on `limit` with 1,000 journals; entity pages at most 4,096 entries and about 100 ms; field history warm 20 to 120 ms, cold 1.5 to 5 s | **Sweep:** counts differing between the arms or `examined` other than 100,000 (stop); one part above 300 s; 6 parts not 1.3 times faster than 3; readers within 10% of the control while a sweep runs, or not back within 10% after; save p99 above 1.25 times the control; any error. **ID lists:** any subject count other than 100,000 or an ID out of order (stop: nothing built on the route may ship); warm cost above 3 µs per entry or a cold subject walk above 3 s; 87,002 more than 10 times the head; a first cold page above 100 ms. **Journal probe:** pages stopping on `entries` / `time` with no journals; any page over 4,096 entries or 250 ms; warm history over 200 ms |
| 3 | P1 re-read L256 8,000 to 11,000/s, p99 75 to 115 ms (even odds); P1 random 1,350 to 1,800/s, p99 250 to 340 ms (missed); P2 second-half p50 7 to 10 ms, p99 30 to 50 ms (met, about 55%); P3 lag at 256 readers 25 to 60 ms; P4 p99 12 to 25 ms after the drain; P6 judged (1,050 per side), loaded quiet p99 12 to 35 ms; P7 first pull 60 to 100 ms; P8 3,100 to 3,350 facts/s; transactor peak 50 to 55.5 of 57 GiB | re-read L256 under 7,000/s or p99 over 130 ms; random under 1,300/s or p99 over 350 ms; S second-half p50 over 10 ms at 394 with at most 0.9 reads per commit; random-line SQL time per storage read over 0.7 ms; transactor peak at or over 56 GiB or any limit event; any wrong value |
| 4 | Wide: 95 to 100% of shape S commits on the per-subject writer; mean serial apply per commit 0.6 to 1.2 ms against Control's 1.5 to 2.5; commit p99 within 20% of Control; nothing lost or expired | under 95% on the per-subject writer; apply Control ÷ Wide under 1.5 for commits of 60 facts or more (then remove the option); more than one storage read per commit above Control; commit p99 over 20% above Control |
| 5 | Commit p50 5.39 + 0.201 ms per fact (±30%): 8 to 12 ms at 17 facts, 185 to 260 ms at 1,000; p99 at 1,000 facts 280 to 450 ms; pinned read p99 near the head under 140 to 180 ms | p50 off the fit by more than 30% at 17 facts or more; p99 at 1,000 over 1 s or an expiry at 340 or 1,000; pinned read p99 over twice 112 ms; any lost save |
| 6 | General reads inside apply down 40 to 55% in the first loaded cell; commit p50 within 2 ms of step 3; commit p99 at 620/s 10 to 30% below step 3 | reads inside apply down less than 25% or more than 70%; 50/s median up more than 4 ms; any exactness difference |
| 7 | (not runnable here) k3 apply +0.6 to +1.0 ms per commit, k20 +3.4 to +5.6 ms; k3 commit p99 +1 to +4 ms (`xq2/INDEX-COST.md`) | k3 apply more than 1.5 ms or less than 0.3 ms over off; reads per commit more than 0.3 over off; k3 commit p99 more than 5 ms over off |
| 8 | Head arm: at most 1% of offered frames committed while saving, at least 3,000 refused in 300 s. Settle arm: 0 refused; 5.93 million changed values (59.25 per subject) and 2.00 million notices, plus the first release's 39,000 notices; 20,000 to 25,000 value frames and 85,000 to 100,000 notice frames; settles in 65 to 110 min (central 85) beside 235 saves/s, values first (15 to 35 min); live save p50 within +3 ms and p99 within 1.3 times the control outside stall seconds; no save refused, expired or uncertain; exact | head arm more than 5% committed, or fewer than 1,000 refused; any refusal in the settle arm; counts more than 2% away; frames outside the ranges; over 120 or under 45 min; p99 over 1.5 times outside stalls or any refused save; any exactness difference |
| 9 | Settlement completes within the bound: 6.90 million changes, 2.04 million notices, 22,660 / 50,000 frames (±5%), values 20 to 40 min, notices 25 to 45 min, exact; live p99 per-save outside stalls 0.8 to 1.2 × control | any refusal or frame estimate over 8,000 µs; counts more than 2% off; values over 45 min or notices over 50 min; per-save outside-stall ratio over 1.5 |
| 10 | (not runnable here) 0 frames refused; about 121,000 frames per account; every account within 10% of the others' committed frames each minute; 90 to 160 min (3 accounts), 5 to 9 h (10); live p99 within 1.3 times control outside stalls; the quiet account within 1.25 times or under 50 ms | any refusal; an account below half of another's frames in any minute; under 70 min (3) or 3.5 h (10); p99 over 1.5 times in any account |
| 11 | `pf3` 1,500 to 1,850 reads/s (central 1,680), p99 240 to 310 ms, loads per subject 1.5 to 1.9; `pf3r` 2,100 to 2,600 (p99 160 to 210 ms, loads 1.05 to 1.4) if read-ahead is the excess (about 60%), else as `pf3` ± 7%; `pf3c` 1,450 to 1,950; S stores 23.07 to 23.08 commits/s; 0 wrong values, errors and prefetch failures; the 100 ms bar not met in any configuration | `pf3` under 1,450 reads/s or under 2.5 reader cores; `pf3` loads under 1.3; `pf3c` loads above 2.3 or reads/s 10% under `pf3`, or 15% above; `pf3r` loads within 0.15 of `pf3`'s (read-ahead is not the excess); any wrong value, error or prefetch failure (then no option may merge) |
| 12 | Off reproduces 2026-11-23 (394 stored, p99 5 to 12 s). On, 394 cell's first 40 s: reads inside apply per save 0.7 to 1.4 (40 to 65% below off), save p99 0.3 to 3 s; 620 cell stores 470 to 600/s | reads inside apply fall less than 25% with hints on 95% or more of per-subject saves; or fall 40% or more while p99 at 394 stays over 5 s; any receipt or read-back difference |
| 13 | No start-up read: first-60-s save p99 0.5 to 3 s (7.26 s on 2026-11-23 without hints); with the read: 0.2 to 0.5 s; stop to admission unchanged within 5 s | no-read arm's p99 over 4 s with hints on 95% or more of saves; read arm's p99 over 0.6 s; admission moves more than 5 s |
| 14 | Off: `busyPeak` 512 at the 1,024 step, lag p99 0.3 to 2 s. Bound 128: `busyPeak` under 200, lag p99 under 250 ms (expected 40 to 120), pinned goodput within 10% of off | off shows `busyPeak` under 512 with `queuedPeak` 0 while the poll gap is over 100 ms; on still over 250 ms with `busyPeak` under 200; on loses more than 20% of pinned goodput |
| 15 | 0 early answers and 0 refusals in 120 Publishes; 20/20 inside one second per Publish window; first-correct p50 within +3 ms of 2026-11-23; waits on 0 to 10% of requests | any at-least defect or refusal; p50 more than 10 ms above 2026-11-23; waits on more than a quarter of requests |
| 16 | `two-pf` 3,000 to 3,600 reads/s both readers (p99 110 to 160 ms); `two-pfr` 4,200 to 5,000 (p99 85 to 115 ms) if read-ahead is the excess; each reader 2.6 to 2.9 cores; PostgreSQL 0.65 to 0.95 cores; saves 23.07 to 23.08 commits/s; 0 wrong values on both readers | both readers together under 2,600 reads/s with each under 2.4 cores (a shared limit: PostgreSQL's one core first); machine 2's reader more than 15% slower than machine 1's; p99 under 100 ms at both pins (the sizing was pessimistic); any wrong value or error on either reader (stop) |

## Gates on the merged head (2026-11-24 morning, at `4c34fd0f8` and before)

Mac, toy size, one ordinary heavy token per step, no lease, 2026-11-24 13:17 to 15:56 UTC. Clocks are diagnostic.
Evidence: `DX-INT3/` in the lab evidence store (`gates/queue.log` lists every case with its commit). The gates of
2026-11-23 (at `607c46e8b`) are in this page's history (`git show 9e02cf1d2:lab/experiments/EXP-DX1/v01/READINESS.md`).

**The reach fault and which passes ran with it.** W3's commit closed `admission/execute` one form early in
`reach/response`, so from the W3 merge (`287bb0816`) every `/reach` and `/reach-many` answered a Boolean (HTTP 500 on
the wire). The console's gates on a second toy found it at 08:12 local (entities, query, derive and the proof failed);
`fdabb86e5` fixed it before any other gate ran. **Every pass below ran on a head with the fix**: the first queue at
`73a9c8bf3` and `5e1bb75ba`, the second and third at `07144498e` and `4c34fd0f8`. The production and aged gates read
through `/read` and would have passed with the fault. The held Publish runner's probe reads through `/reach-many`
(`sweepRows`) but **falls back to `/read` on any error unless `TX2_SWEEP_STRICT=1`**, so its passes alone do not show
that subject pulls work; the held runs were therefore repeated with `TX2_SWEEP_STRICT=1` (both passed), and
`int3/reach-gate.sh` now compares the pulls directly.

| Gate (owner) | Head | Result |
| --- | --- | --- |
| Lab unit tests (`v01`, `rd1`, `w1`, `ha1`, `jvm1`, `actv-lazy/join` frames, ranges, bulk, held, observations) | `4c34fd0f8` | 73 of 73 (69 of 69 at `73a9c8bf3`) |
| Identity tests (`w2/wide-ids.test.mjs`, `prep1/ordered-ids.test.mjs`) (S1) | `4c34fd0f8` | Pass |
| SDK (`packages/datomic`, unit) | `07144498e` | 458 passed, 53 skipped |
| Gateway selftest (in memory, RD4's at-least tests included) | `07144498e` | 29 tests, 54,160 assertions, 0 failures |
| **Subject pulls against the baseline** (`int3/reach-gate.sh`, new): 22 pulls (8 single, 3 many, row pages, gzip pages; an old cut and the head) | `07144498e` | 22 of 22 identical across this branch, `9e02cf1d2`'s gateway and this branch with `TX2_READ_WAIT_LIMIT=4`; the negative control (W3 `a6146ff4f`) differs in 22 of 22 (HTTP 500) |
| Launch guard (`ha1/guard-check.sh`) with 7 new cases (W4's two refusals, S1's wide writer, controls) | cases at `0fec06280` | 102 cases, 0 mismatches; both W4 refusals stop at their own new test in `stack/up.sh` |
| Default card's plan output against `9e02cf1d2` | `4c34fd0f8` | Byte-identical in every option set that names its tape; with no tape named the first line differs in the tape only (Proposed defaults); refused option sets differ only in a stack line |
| `frames-check.ts 256`, `large-release-check.ts 256` (ACT4, ACT3) | `5e1bb75ba` | Pass, pass |
| Settlement-frames gate (`DX_ACT4_GATE=1`) (ACT4) | `5e1bb75ba` | Pass, ACT4's own counts: frames 10 → 5 (values) and 36 → 29 (notices) on the small release; 4,272 changes and 1,440 notices; 32,040 changes in the split case |
| Held Publish toy: default; large first release settled by bytes; probe from receipts (`DX_ACT3_AT_LEAST=1`); old framing with the large release (ACT3, ACT4, RD4) | `5e1bb75ba` | Pass each: 8 of 8 deadline Publishes inside 1 s, 0 read, visibility or at-least defects; bytes framing 2 value and 6 notice frames, 560 changes and 168 notices equal to the oracle, 474 and 160 equal to the independent rule; 18 at-least requests per Publish window, 0 waits |
| Held, injected stale probe with at-least reads | `5e1bb75ba` | Fails at the end as designed: one at-least defect (basis 11 against receipt 43) |
| **Pair 1: held Publish with `TX2_SETTLE_FRAMES=bytes` and `DX_ACT3_AT_LEAST=1` both on** | `5e1bb75ba`; strict at `4c34fd0f8` | Pass, both: the same frames and counts as bytes alone, 8 of 8 inside 1 s, 0 defects, 18 at-least requests per Publish window |
| Held default with `TX2_SWEEP_STRICT=1` | `4c34fd0f8` | Pass |
| JRN1 gate (`jrn1/gate.sh`, loader-aged toy, probe included) | `73a9c8bf3` | DX-JRN1 GATE PASS |
| RD4 two-peer gate | `73a9c8bf3` | Pass: receipt reads early 0 of 300; a plain read sent first early 6 of 150; deadline refusal; pinned and feed unchanged; same request counts |
| **Pair 2: RD4's gate with `DX_READ_WAIT_LIMIT=4`, `DX_THREAD_COUNTERS=1` and `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`** | `73a9c8bf3` | Pass: receipt reads early 0 of 300 (plain 9 of 150); the read gateway ran with the bound (limit 4, 807 reads admitted, 0 refused), served the feed as bounded pages only (`transactions-bounded` 2 calls), 604 at-least requests, 7 waits, 1 deadline refusal (the designed one) |
| W3 gate, hints: paired log, receipts, final state, suites | `73a9c8bf3` | Pass: 46,877 datoms identical by SHA-256, 132 receipts identical; 235 and 22 assertions |
| W3 gate, waiting-read bound | `73a9c8bf3` | Pass: bound off, feed poll 12.9 s; bound 4, feed poll p50 14.3 / p99 192.7 ms, health p99 179.1 ms, 0 busy answers to current pulls, 6,260 pinned reads refused and retried |
| W4 gate (`w4/gate.sh`) | `07144498e` | Pass: 76,317 datoms identical off and on, 400 receipts and 6,400 live rows identical; suites 235 and 41 assertions |
| S1 suites (`s1/suites.sh`): mixed-identity suite off, wide, wide with both hints; W2's wide gate | `07144498e` | 235 assertions in all three; wide gate 4 tests, 221 assertions, wide and wide with hints |
| REAL2 production exactness gate: default; W3 hints; W4 hints; wide with both hints | `5e1bb75ba` (W3), `07144498e` (others) | Pass, all four: 840 R and 88 S commits acknowledged, 0 expired, 2,836 fields exact; hinted commits 506 (W3), 431 (W4), 928 per-subject and 9 general (S1) |
| REAL2 production tape on a loader-aged toy: default; W3; W4; wide with both hints | `5e1bb75ba`, `07144498e` | Pass, all identical: 120 aged rows, a tampered row refused, 101 writes over aged rows, 1,927 fields, final cut 1,289 |
| Combined check: read study with both pinned options, and off | `4c34fd0f8` | Pass (twice with the options); one earlier run at `5e1bb75ba` failed: the study's first save was refused `ErasureFrontierChanged` by the removal the study starts beside it on purpose (the fence doing its job; a timing race in the study, not reproduced in the two later runs with the options) |
| Combined check: removal with owner head and both pinned options, and plain; fair import with Publish; native append recovery | `5e1bb75ba` | Pass, all |
| Saves arm harness (S1's ladder case included); saves gate | `07144498e`; `5e1bb75ba` | Pass; 0 wrong in 204,113 reads over five pin kinds, every planted wrong value caught in all three planted windows |
| Owner-head toy with step 7; pinned short-cut gate with owner head on and off | `5e1bb75ba` | Pass; 92,880 comparisons over 14,901,208 rows, 0 differences, both |
| Trace file per process start (CARD2) | `73a9c8bf3` | Pass |
| Console gates on a second toy (`DEMO_TOY_NAME=int3`), with reads after own writes | `07144498e` | g12, config 16/16, entities 19/19, query 24/24, journal 7/7, derive 4/4, catalogue 70/70, proof 37/37; 94 at-least requests at the read gateway. The owner's toy on 28580 was not touched |
| Card toys: the new default tape (`production-S-noburst`), and the tuned reader with 12 permits | `4c34fd0f8` | Pass, both: 171 fields of 12 subjects read back exactly in both arms; `adopted.ts` write-options check held; tuned random line 0 wrong |

**Not run on the Mac:** every server launcher past its Linux guard; the JRN1 probe at 1 billion; the SDK's live suite
(JRN1 ran it on its branch). Environment refusals, each rerun and passed: the lab pool (other builders' stacks) refused
the card toys twice; the ha1 diagnostic slot refused the read and held cases for about 30 minutes; one production gate
image build failed in containerd ("failed to commit: rename … ingest") and passed when rerun.
