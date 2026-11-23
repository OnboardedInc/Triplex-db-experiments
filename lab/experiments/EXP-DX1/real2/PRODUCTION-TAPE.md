# A production-shaped save tape for the full-size runners

**North star P2.** Saturday's tapes are unlike production on the one property that decided their results: how often a save goes to a person nobody has saved since the start. This tape replays the production write pattern on Saturday's rolling-6 runner, so the next server run measures the save-speed bar under traffic that looks like real form saves. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Why the two tapes in use mislead

| Tape | First-minute saves that go to a person not yet saved in the run | What it does to the store |
| --- | ---: | --- |
| Saturday's rolling tape at 394/s | about 73% (17,100 distinct people in 23,411 neighbour saves) | every save pays a cold storage read until memory holds all 19,000 people |
| The restart tape | 89% of saves go to a small busy set | almost every save is warm |
| Production (a private study of form saves) | about 45 to 50% in the first minute, 28% over five minutes | in between |

With the 32 GiB cache, the only slow saves left on Saturday's runs were a person's first save since the start. So the share of such saves sets the whole-window tail, and neither tape has the production share.

## The shape

One save process feeds both commit shapes. All parameters are dimensionless shares, gaps and sizes, in [`production-shape.json`](production-shape.json) (SHA-256 `beeb9793…743b8`). Absolute rates come from the fixed loads.

| Parameter | Value | Source |
| --- | --- | --- |
| Gap between saves inside a session | cumulative 3.3% under 1 s, 46% under 10 s, 80% under 60 s, 88% under 2 min, 96% under 5 min, all under 15 min | the study's gap shares under 15 min, renormalised |
| Gap before a session's first save | 18% 15 min to 1 h, 21% 1 h to 1 day, 17% 1 to 7 days, 14% 7 to 90 days, 30% first ever | the study's shares over 15 min, as shares of session starts |
| Saves per session | 33% one save; median 3, p75 8, p90 20, p99 85, mean 7.6 | the study |
| Form rows per save | 25% one row; median 5, p75 22, p90 62, p99 84, mean 17 | the study groups a person's rows within 300 ms into one save; about 17 rows per save |
| Second field per row | 20% of rows | Saturday's tape (keeps facts per row at 1.2) |
| Rows of one save | 1 ms apart (shape R) | the study: rows of one save land within milliseconds |
| Simulated history before the window | 2 h | sessions are in progress when the window opens |
| People per rate band in each account | 30,000 | each rate gets its own people, as on Saturday |

**How a session gets its person.** A session whose start gap is 15 to 60 minutes reuses a person whose last simulated save was that long ago. Longer gaps and first-ever saves take a person not used before in that account and band. Every save carries its declared gap, and the tape report checks each declared gap against the tape wherever the earlier save is inside the window.

**The two commit shapes.**

- **R (row-shaped):** every form row is its own commit, at the fixed loads. A save of 40 rows is 40 commits to the same person, 1 ms apart. The runner, like the product, commits one person's changes one at a time, so those 40 commits run in series.
- **S (save-shaped):** one commit per save, carrying all of that save's facts. It is the same saves as R, so the commits per second are the row rate divided by about 17.

| Fixed load (rows/s, all accounts) | Quiet account | Neighbour rows/s | Neighbour saves = S commits/s | Facts per S commit (mean, p50, p90, p99) |
| ---: | ---: | ---: | ---: | --- |
| 235 | 3.5 | 231.5 | 13.4 | 20.8, 6, 75, 103 |
| 394 | 3.5 | 390.5 | 23.1 | 20.3, 6, 72, 103 |
| 620 | 3.5 | 616.5 | 35.3 | 21.0, 6, 75, 103 |

The S rates are not rounded from 394/17: they are the saves the R tape contains, so facts per second are identical in both shapes (469/s at 394).

**What stays Saturday's.** Rolling 6 credits, three transactor cores, the 16 GiB profile (24 GiB heap) or the 32 GiB profile (48 GiB heap, 60 GiB container), the fresh full-size cut, five-minute windows, a solo cell before each loaded cell, and the quiet account's stream. Each solo cell is byte-identical to Saturday's solo cell at that rate, and the quiet account's offers inside each loaded cell are the same as in its solo cell. Only the nine neighbour accounts change.

**Which fields a save writes.** Row r of a save writes `:task/field-r` on the person's first task, and a second field `:task/field-(100+r)` for 20% of rows. Fields 0 to 12 or 13 exist on the fresh cut with seeded values, so the first 13 or 14 rows of a save replace seeded values. Rows beyond that write fields the cut does not have; their first write has no predecessor. The runner reads every seeded field of every person on the tape before the first offer and checks each against the seed formula.

## The tape report beside every run

Every production arm writes `tape-report.json` into its result directory before its first offer, and the collector binds it to the plan's tape digests. Below is the report of the gated tapes (neighbour accounts, the same in R and S) against the study.

| Statistic | Study | R/S at 235 | R/S at 394 | S at 620 | Tolerance in the gate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Saves within 10 s of the person's previous save | 40.0% | 39.6% | 38.7% | 39.0% | ± 3 points |
| within 60 s | 69.1% | 68.9% | 69.0% | 68.3% | ± 3 |
| within 5 min | 83.0% | 82.3% | 81.9% | 82.2% | ± 3 |
| within 1 h | 89.3% | 89.0% | 88.7% | 88.9% | ± 3 |
| over 7 days or older | 1.8% | 1.9% | 2.0% | 1.8% | ± 1 |
| first ever | 3.9% | 4.2% | 4.3% | 4.0% | ± 1.5 |
| Saves per session: mean, p50, p90; single-save share | 7.6, 3, 20; 33% | 7.65, 3, 20; 33% | 7.67, 3, 20; 33% | 7.60, 3, 20; 33% | ± 0.6, exact, ± 3; ± 3 points |
| Session length p50, p90 | 44 s, 18.5 min | 43 s, 18.8 min | 45 s, 18.8 min | 47 s, 18.6 min | not gated |
| Distinct people per save in a minute (median minute) | 0.48 | 0.47 | 0.48 | 0.47 | ± 0.06 |
| Saves that are the person's first since the start, whole window | 28% (21–39%) | 26.4% | 26.6% | 27.3% | ± 7 points |
| First-minute saves to people saved in the 2 min before the start | 54% (16–83%) | 50.2% | 52.5% | 57.0% | ± 12 |
| Five-minute saves to people saved in the 2 min before the start | 38% (21–55%) | 37.3% | 36.3% | 38.2% | ± 8 |
| First saves since the start whose person saved in the prior 30 s / 2 min / 10 min / 60 min | 14 / 27 / 44 / 59% | 13 / 28 / 45 / 59% | 14 / 28 / 46 / 58% | 13 / 30 / 48 / 60% | not gated |
| Rows per save, mean | about 17 | 17.3 | 16.9 | 17.5 | ± 1.5 |
| Facts per commit, R / S | | 1.20 / 20.8 | 1.20 / 20.3 | — / 21.0 | R ± 0.03 |
| Distinct neighbour people, first minute / whole window | | 324 / 1,060 | 613 / 1,845 | 956 / 2,889 | |

At 394, Saturday's tape sent its first minute to 17,100 distinct neighbour people. This tape sends it to 613, and the whole five minutes to 1,845.

## What the tape does not represent

- **Only form saves.** The study saw form saves. Updates from integrations and the API, and imports of new people, are not in it: production keeps no per-change log for them. If those reach the store as saves, more saves go to cold people than this tape sends, and the start-of-run cost is understated.
- **One deep-account behaviour for all nine neighbours.** The largest account dominates the study. Smaller accounts have longer gaps and more first-ever saves.
- **No prefill bursts.** The system sometimes saves one form for hundreds of people in a minute, each a first save. The tape has none.
- **No time of day.** Rates are flat over the window; production has busy hours and quiet nights.
- **Rows beyond the 13th or 14th of a save write fields the cut does not have.** Their first write has no predecessor to retire, so they cost a little less than a real field change.
- **The fixed loads stay as they were.** At 394 rows/s the R tape carries 23 saves/s. That is above the study's busy minute for ten deep accounts and below a coincident prefill minute. The tape changes who is saved, not how much.

## The server command (the hour set)

**Which arms, and why.** Two separate stacks on the fresh cut, 16 GiB profile, about 50 minutes:

1. `1-prodR-S`: shape R at 235 then 394 rows/s, each a 300 s solo cell then a 300 s loaded cell. This is Saturday's three-core 16 GiB rolling 6 order (its 394 cell also followed a 235 cell), so the 394 cell compares directly with Saturday's three rolling 6 runs (second-half p99 2.8 to 5.1 s, 1.35 reads per save).
2. `1-prodS-394-S`: shape S at the save-shaped equivalent of 394 (23.1 commits/s), solo then loaded. The same saves and facts as the R 394 cell, so the pair prices R against S directly.

The 16 GiB profile is the informative one: Saturday's tape needed 32 GiB to keep reads down, and the question is whether production locality removes that need. The 32 GiB arms and S at 235 and 620 are in the full set below.

```bash
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-REAL2-production -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh production "$REAL2_OUT" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"
```

- **First launch refused (173f9d463).** `stack/up.sh`'s prepared-copy slot allowlist did not name the production arms and refused without a message, before the seeded-field read. Repaired in `4ee421c87`: the allowlist, `prep1/tail-pg.sh` and `prep1/rolling-counters.py` accept `prod(r|s)(-394)(-cache32)`, and every `up.sh` refusal now prints its line and command. `ha1/guard-check.sh` (brought from the one branch) reproduces the refusal at `173f9d463` and admits all five production arms at the repair to `up.sh`'s first Docker call; Saturday's cache32 launch at `97aced1b1` is the control. The lab VM has eight CPUs, so the harness folds the server's nine-CPU placement onto 0–7 and does not exercise the twelve-core placement check.
- **Still unexercised between the allowlist and the first offer** (Linux only): the rest of `up.sh` after its first image inspection (containers, the prepared copy via `copy-pgdata.sh`, transactor and gateway start, the startup readbacks); `tail-pg.sh settings`; the counter observer's start (`rolling-counters.py`, slot check fixed but not run); and in the producer, the write-options check, the read of every person's seeded fields from the real cut, and the counters-ready handshake.
- Check out the latest commit whose subject starts "Publish the production tape" on `exp/DX-REAL2-production-tape`; the launcher refuses any other `HEAD` or a dirty tree. The environment is the same as Saturday's fresh cache32 job (`queue/cache32/prepare.sh`): a clean, built checkout, the Java 21 and Java 25 Datomic images, the stopped fresh template as `$SCALE1_PGDATA`, the second NVMe mounted as `$SCALE1_WAL_MOUNT`, and a new absolute `$REAL2_OUT`. No containers may be running.
- **Time.** The mode caps the whole command at 3,560 s. Arm limits: 1,740 s for `1-prodR-S` (Saturday's two-rate allowance: 20 minutes of cells and 9 of copy, start, checks and drains) and 1,500 s for `1-prodS-394-S` (10 minutes of cells and the same overhead). Expected: about 29 and 19 minutes plus about a minute of planning, about 50 minutes in all; at most 55 minutes if both arms use their whole limits.
- **Refusals before offers** cost only the copy: a seeded field that differs from the seed formula, a person missing from the predecessor read, or a launch-profile mismatch.
- **Collect** each arm's directory as Saturday's cache32 run was collected. Each arm's `summary.json` has, per loaded cell, the whole and half-window busy rates and p99s and the quiet p99 as before, plus three new entries: `saveCompletion` (first offer of a form save to the ACK of its last row, whole and second half), `sqlReadsPerCommit` (first 60 s, from 150 s, whole) and `applyMsBySize` (late warm serial apply by commit size, for the S forecast). Each arm keeps its `tape-report.json`, bound to the plan's tape digests.

**The full set** (`server.sh production-full`, same arguments, cap 9,900 s, about 140 minutes): `1-prodR-S` and `1-prodR-cache32-S` at 235 and 394; `1-prodS-S` and `1-prodS-cache32-S` at the equivalents of 235, 394 and 620. The 32 GiB arms need at least 89 GiB `MemTotal`, as Saturday's did.

## Predictions, written before any run

**What the model says.** Two things change from Saturday. First, far fewer distinct people: 1,845 neighbour people in five minutes at 394 instead of 19,000, so the cache needs about a tenth of the people. Second, under R, the rows of a save commit in series. A discrete-event model of the rolling-6 sender on these tapes, with 5 ms per commit round trip and no storage reads at all, gives per-commit busy p50 89 ms and p99 366 ms at 394 (on Saturday's tape the same model gives 5 and 10 ms). With 6 ms and a slower apply it gives 123 and 520 ms. The p99 row is the last row of a large save waiting for the rows ahead of it. So R has a latency floor of several hundred milliseconds that no cache removes, and S does not: the same model gives S at 394 a p99 of 25 to 44 ms.

Busy p99s are per commit, offer to durable ACK, as on Saturday. Reads are PostgreSQL segment reads per commit, in the loaded window's first 60 s and after 150 s. Central value, then range.

| Arm, cell | Stored/s | Whole busy p99 | Second-half busy p99 | Save completion p99 | Quiet loaded p99 | Reads/commit, first 60 s | Reads/commit, late | Transactor cores, late |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R 16 GiB, 235 | 231.5, no expiries | 500 ms (300–1,500) | 450 (300–900) | 450 (300–1,000) | 38 ms (25–55) | 0.08 (0.03–0.4) | 0.03 (0–0.15) | 0.6 (0.3–1.2) |
| R 16 GiB, 394 | 390.5, no expiries | 700 ms (400–3,000) | 600 (350–2,000) | 600 (350–2,000) | 45 ms (30–70) | 0.08 (0.03–0.4) | 0.05 (0.005–0.3) | 1.0 (0.5–1.9) |
| S 16 GiB, 394 | 23.1, no expiries | 50 ms (25–200) | 40 (20–120) | 40 (20–120) | 35 ms (25–60) | 1.0 (0.5–6) | 0.4 (0.05–2.5) | 0.4 (0.15–0.9) |
| R 32 GiB, 235 / 394 | 231.5 / 390.5 | 450 / 600 ms | 420 / 500 | 420 / 500 | 35 / 45 ms | 0.08 / 0.08 | 0.01 / 0.01 (0–0.05) | 0.5 / 0.8 |
| S 16 GiB, 235 / 620 | 13.4 / 35.3 | 40 / 60 ms | 30 / 45 | 30 / 45 | 32 / 38 ms | 1.0 / 1.0 | 0.3 / 0.5 | 0.3 / 0.6 |
| S 32 GiB, 235 / 394 / 620 | 13.4 / 23.1 / 35.3 | 35 / 45 / 55 ms | 28 / 35 / 40 | 28 / 35 / 40 | 32 / 34 / 36 ms | 1.0 each | 0.05 / 0.05 / 0.06 | 0.25 / 0.35 / 0.5 |

Solo cells repeat Saturday's: quiet solo p99 about 31, 22 and 15 ms at 235, 394 and 620 (Saturday's measured range).

**Shape S, apply time against commit size.** Late, outside index jobs, serial apply per commit ≈ 0.3 ms + 0.06 ms per fact (intercept 0.15 to 1.0 ms, slope 0.02 to 0.15 ms per fact), so about 1.5 ms for a 20-fact commit and about 6.5 ms for a 103-fact commit. A person's first commit since the start adds about 1 ms per storage read. Saturday's 32 GiB late apply was 0.30 ms per 1.2-fact save.

**How each prediction is reasoned.**

- **Reads, first minute.** Saturday's 32 GiB first 30 s read 1.48 segments per save with 0.73 new people per save, about two reads per new person. The R 394 tape has 0.037 new people per commit in its first 30 s, so about 0.08 reads per commit. Under S each commit is a whole save with 0.5 to 0.6 new people, so about 1 read per commit. The high ends (0.4 and 6) are for the case where each seeded field a person touches costs its own read.
- **Reads, late, 16 GiB.** Saturday's 16 GiB read about 1.0 per save late with 19,000 people in play; 32 GiB read 0.04. Production touches about a tenth of the people, so 16 GiB should hold them and late reads should fall toward the 32 GiB level, plus re-reads after each index job.
- **Busy p99.** R: the serial-row floor above, plus index-job stalls and allocation stalls of 150 to 300 ms that Saturday saw at 16 GiB with a 24 GiB heap; no first-minute backlog, because the first minute is mostly warm. S: 23 commits/s leaves the credits mostly free, so p99 is one large commit plus an occasional stall.
- **Quiet account.** Saturday's 394 quiet loaded p99 was 54 ms at 16 GiB and 43 to 62 ms at 32 GiB, with all five neighbour credits busy. R keeps two to five neighbours in flight; S rarely more than one or two.

**What would show the model wrong.**

1. **R 235 second-half busy p99 under 150 ms.** Then rows of a save do not wait on each other as modelled, and the R latency floor does not exist (Saturday's tape had 32 ms here).
2. **R 394 late reads above 0.3 per commit (about 5 per save), or R 394 second-half p99 above 2 s with reads that high.** Then 16 GiB is still too small at production locality, and the cache-size requirement stands.
3. **R 394 first-60 s reads above 0.4 per commit, or S above 6 per commit.** Then cold cost scales with the fields a save touches, not the people, and wide forms are the cold-start problem.
4. **S 394 second-half p99 above 120 ms, or an apply slope above 0.15 ms per fact.** Then large commits cost more than linearly and S is not the cheap shape it appears.
5. **Quiet p99 above 70 ms under R at 394.** Then serial row chains crowd the quiet account more than Saturday's tape did.
6. **Any save lost, any acknowledged row not in the journal, or any expiry.** Exactness or capacity broke; the run counts for nothing until explained.

## What each shape costs, if the predictions hold

| | R (each row a commit) | S (each save a commit) |
| --- | --- | --- |
| Commits per second at the 394 load | 390.5 | 23.1 |
| Facts per second | 469 | 469 |
| A form save is durable after | its last row: p99 about 0.6 s at 394, from the serial chain | one commit: p99 about 40 ms |
| Transactor work | about 1 core late at 394 | about 0.4 core |
| Product meaning | each row is visible and durable on its own; a save can be half applied if the client stops | a save is all or nothing; one larger commit per click |

## Gates on the Mac (correctness only; times diagnostic)

- **Shape gate** (`real2/shape-gate.ts`, offline): all five server cells (R and S at 235 and 394, S at 620) meet every tolerance in the table above, each tape is identical when generated twice, and the plans of all nine existing campaign settings (rolling three-rate, cache32, rolling 6 alone, fresh-first, scale, ceiling, tail, fair, comparison) are byte-identical to PREP1 `d6e62fbe7`'s. Saturday's solo cells are byte-identical too.
- **Exactness gate** (`prep1/manage.py <out> production 10 1 1 0 1`, one ordinary heavy token, the lab VM): the server producer's own `phase()` (sender, rolling 6 credits, journal check of every receipt) ran an R cell and an S cell on a toy scope seeded like the cut's task-0 fields, with the subject writer, numeric owner and ordered IDs. Every offer was acknowledged (840 R commits; 88 S commits of up to 82 facts), every receipt matched the journal, and all 2,781 fields of the 128 touched people read back equal to the last acknowledged write computed from the tape alone, with no extra or doubled values.
- **Runner and collector fixture:** the producer's mock preflight and the collector's fixture mode accept every production arm of both sets, and Saturday's cache32 fixture still collects.
- **Not covered:** `server.sh` itself (Linux only); the predecessor read against the real cut (it runs on the server before the first offer and stops the arm if a seeded field differs).

Evidence: `evidence/DX-REAL2/mac-gate-2026-11-23.tar.gz` (private, SHA-256 `11c287d7…69ec4`): both live gate runs (the second at `4d8ea7e27`), the shape gate output and the fixture summaries and tape reports of all six arms.

## Where this lives

The runner is PREP1's rolling runner, because Saturday's rolling-6 arms, the 32 GiB profile and the solo-then-loaded cells exist only there; this branch starts from PREP1 `d6e62fbe7` so the product code is the one Saturday measured and only the tape differs. The generator (`w1/field/production.ts`) and the shape file are new files and carry over to the one branch unchanged; the v0.1 scorecard's save loads (`v01/server-workload.ts` on the one branch) do not use them yet.
