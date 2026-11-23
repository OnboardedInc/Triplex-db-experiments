# Owner head on the rented server: command and predictions

North star P2 and P4. This run compares today's writer with the covering owner root (`TX2_SUBJECT_OWNER_HEAD=1`) on the same full-size copy, the same tape and the same 16 GiB object cache. No server is ordered for it; the command is ready for the next rental. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Option and gates](OWNER-HEAD.md)

## What the run can and cannot show

- **At today's size, a bigger cache already removes these reads.** On 2026-11-21 a 32 GiB object cache cut SQL reads per save from about 1.0 (outside index jobs) and 1.6 (inside) to 0.04, and stored 394/s and 620/s with no expiries (`bm1/ROLLING-READING.md`, cache32). This run does not claim the owner head is needed at 430 million records.
- **The owner head is for growth.** The part 9 model forecasts 2.73 ms apply at 8 billion records for today's writer (a ceiling near 366 saves/s) and 1.21 ms with the owner head. A cache cannot keep up with a database that keeps growing; the owner head makes a save read the person's own small range instead of old rows scattered through history.
- **So the run keeps the 16 GiB cache on purpose.** At full size that cache covers about half of today's working set, which stands in for a larger database. Every number below speaks to the owner head at 16 GiB, not to the cache. A 32 GiB arm would read about 0.04 per save on both writers and could not separate them.

## Commands

Both lines use the paired runner from the append-retirement study with `DX_W1_PAIR_OPTION=owner-head`. The reference arm is today's per-person writer; the treatment arm (directory name `append`) is the same build with `TX2_SUBJECT_OWNER_HEAD=1`. Both arms play the same tape and sample native reads every 64 saves. Run from the launch commit; check both lines first with `ha1/launch-dry-run.sh --to-first-offer` on that commit.

**Line 1, fresh full-size copy (430 million native records): 394 then 620 offered, 300 s each, on the machine that holds the fresh template.** One invocation per arm, each on a new copy of the held directory, reference first:

```sh
export DX_W1_RETIREMENT_PAIR=1 DX_W1_PAIR_OPTION=owner-head PREP1_LOOKUP_EVERY=64
pair_arm() {  # $1 is reference or append; RUN_COMMIT is the launch commit
  sudo cp -a --reflink=never "$PGDATA_SOURCE" "$PGDATA_COPY" || return 1
  DX_RD1_PGDATA_SOURCE="$PGDATA_SOURCE" DX_RD1_LADDER="$1" DX_RD1_PGDATA="$PGDATA_COPY" \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$RUN_COMMIT" "$OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" \
    "$TRANSFER_PIN" fresh per-person-ordered j21-g1 "" "" "" "" j25-zgc "$WAL_DIR" j21-g1 rolling6 || return 1
  sudo rm -rf --one-file-system "$PGDATA_COPY"
}
pair_arm reference && pair_arm append
```

- **Expected duration: 45–60 minutes, ceiling 75.** Per arm: copy about 4.4 min, start to verified seed about 2 min, two 300 s windows with drain (up to 1 min each), two 30 s settled read samples, summary and cleanup about 3 min: 21–28 min. The second arm needs the first arm's seal.
- **Disk:** the held directory (126 GB) plus one copy (126 GB) plus 16 GiB margin on the data NVMe; WAL on the other NVMe.

**Line 2, 1 billion records: 50 then 235 offered, 120 s each, on the machine that holds the 1 billion database.**

```sh
DX_W1_RETIREMENT_PAIR=1 DX_W1_PAIR_OPTION=owner-head PREP1_LOOKUP_EVERY=64 \
  bash lab/experiments/EXP-DX1/v01/study-server.sh "$RUN_COMMIT" "$AGED_OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" \
  "$TRANSFER_PIN" 1B per-person-ordered j21-g1 "$AGED_BUNDLE" "$AGED_PIN" "$AGED_DUMP" "$AGED_DUMP_PIN" \
  j25-zgc "$WAL_DIR" j21-g1 rolling6
```

- **It needs the 1 billion aged bundle** (`AGED_BUNDLE`, `AGED_PIN`, `AGED_DUMP`, `AGED_DUMP_PIN`) that the sealing step writes. That seal was blocked at its readback this morning; this line cannot start until the repaired seal exists.
- **The prepared-copy path is fresh-only in this runner,** so each arm restores the aged dump into its own slot. The runner caps a restore at 42 minutes; the native restore of this database took about 33 minutes this morning, so a slow restore stops the arm before its first offer.
- **Expected duration: 1 h 40 min to 2 h, ceiling 2 h 20 min.** Per arm: restore 33–42 min, two 120 s windows with drain, two 30 s settled read samples, summary and cleanup: 45–55 min.
- **Disk:** two restored copies are never live at once; each arm's slot is cleaned before the next.

**What both lines add for the open read question.** In each window of each arm, a separate reader client on the read gateway samples 5 people per second whose saves that window's tape has just made: a current read, then a pinned read at a snapshot cut taken at or after the person's newest row. It runs through the loaded window, and again for 30 s after the window settles. A person counts only once their newest row is after the window's first cut, so in the treatment arm every sampled person has been migrated. The reads are outside the save path's clock and client. Each arm's `retirement-diagnostic.json` reports p50 and p99 per phase. `retirement-comparison.json` reports treatment over reference as `migratedReadRatios`, next to the quiet-account read (`pinnedRead`).

- **Toy gate:** the sampler ran inside the owner-head recovery probe (`owner14-03`, source `83932413e`) on people the probe's own tape had just saved. It made 15 attempts in each credit mode, all migrated, with no errors and no skipped pinned reads, then passed the layout gate (160 assertions) and recovery (56 durable and 6 refused in each mode). The loaded phase and the per-arm comparison inside the full-size runner have not run anywhere; they type-check and load, and run only on bare metal.
- **First cut:** the 620 window's first cut is the 394 window's terminal. Its sampled people are those saved during the 620 window.
- **Load:** the sampler adds up to 10 requests per second to the read gateway in both arms.

- **Scope open writes records:** with the option on, opening a scope installs the owner-head schema and two functions (five entities) and reinstalls the reference function, whose text includes the fence. A launcher that counts the records a scope open writes on a held copy must include them.
- **First touch:** the owner head migrates a person on their first eligible save. The fresh tape touches each person once or twice in 300 s, so most measured saves are first touches.
- **Readback:** the runner refuses the treatment arm unless the write gateway reports `subjectOwnerHead` and every acknowledged save carries the root's byte count. `summarize.py` reads `DX_W1_PAIR_OPTION` and checks the same.

## Predictions, written before any run

Late means after the first 150 s. Ranges are for the treatment arm unless marked. Today's writer is the reference arm of the same run.

| Measure | Fresh, 394 offered | Fresh, 620 offered | 1 billion, 50 | 1 billion, 235 |
| --- | --- | --- | --- | --- |
| Stored/s, reference | 390–394 | 435–470 | 49–50 | 228–235 |
| Stored/s, owner head | 392–394 | 480–580 | 49–50 | 232–235 |
| SQL reads per save outside index jobs, reference → owner head | 0.9–1.2 → 0.30–0.60 | 1.0–1.3 → 0.35–0.65 | 1.0–1.8 → 0.30–0.70 | 1.4–2.1 → 0.40–0.90 |
| SQL reads per save inside index jobs, reference → owner head | 1.4–1.8 → 0.50–0.90 | 1.4–1.8 → 0.55–0.95 | — | — |
| AEVT segment loads per save, owner head | under 0.15 | under 0.15 | under 0.20 | under 0.20 |
| Mean apply outside / inside index jobs, owner head | 0.85–1.15 / 1.7–2.4 ms | 0.9–1.25 / 1.8–2.5 ms | 0.9–1.4 ms | 1.0–1.5 ms |
| Records per acknowledged save | 25–26 against 23 | 25–26 against 23 | 25–26 against 23 | 25–26 against 23 |
| Quiet-account current read p50, owner head against reference | 0.95–1.10× | 0.95–1.15× | not read | not read |

- **Reads of a migrated person.** This runner does not time a migrated person's reads. From the Mac paired probe and the read-range census, a migrated person's current read p50 should be within 0.95–1.10× of a legacy person's and the pinned read within 1.00–1.15×. A separate read study on a migrated copy is needed to measure them at full size.
- **Index jobs.** Records per save rise about 13% (26 against 23) and string bytes 13–27%, so index jobs should start 10–20% more often. Their own fetches should fall with the serial reads.
- **Folds.** Saves on this tape edit one to three fields of a person, so folds should be under 1% of saves.

### Reads of migrated people (new rows)

Sample size per window and arm: about 1,450 current and pinned reads while loaded (fresh) or 550 (1 billion), and about 150 of each settled. Ratios are owner head over today's writer, for the same people and the same tape.

| Read | Fresh 394 | Fresh 620 | 1 billion 50 | 1 billion 235 |
| --- | --- | --- | --- | --- |
| Current p50, loaded | 0.95–1.15× | 0.95–1.20× | 0.95–1.15× | 0.95–1.15× |
| Pinned p50, loaded | 1.00–1.20× | 1.00–1.25× | 1.00–1.20× | 1.00–1.20× |
| Current p50, settled | 0.95–1.10× | 0.95–1.10× | 0.95–1.10× | 0.95–1.10× |
| Pinned p50, settled | 1.00–1.15× | 1.00–1.15× | 1.00–1.15× | 1.00–1.15× |
| Current and pinned p99, loaded | 0.7–1.5× | 0.6–1.6× | 0.7–1.5× | 0.7–1.5× |

- **Why near 1.** A just-saved person's rows are in the newest index segments for both writers. The owner head adds about 3 datoms to the current range and one root per save to the pinned range (one or two saves per person on these tapes), plus 15–25 µs of processing. On the Mac the same-process probe measured +1.6% to +6.3% current and +2.5% to +5.4% pinned.
- **Loaded p99 can favour either arm.** The owner head's writer reads less, so the write gateway and storage are less busy; that can make the treatment's tail shorter.

## What would show this wrong

- **The owner head does not remove the reads at full size** if its late SQL reads per save outside index jobs are 0.8 or more (less than a 20% cut from the reference's about 1.0), or its AEVT loads stay above 0.3 per save. Then the reads are not where the toy said, and the next step is the per-attribute trace, not adoption.
- **The owner head does not add capacity** if it stores fewer than 470/s at 620 offered while its reads per save fall below 0.6. Then something other than reads limits the writer at 16 GiB (cores, queueing, commit), and the growth argument rests on the model alone.
- **The option costs reads** if the quiet-account current read p50 is above 1.15× the reference in either fresh window.
- **Migrated people's reads cost more than the bar** if the settled current p50 ratio is above 1.10, or the settled pinned p50 ratio is above 1.15, in any window. Then the Mac SQL gate's +12% to +50% was the real cost, not noise, and the trade must be priced before adoption.
- **The read sample is too thin to judge** (UNJUDGED, not a pass) if either arm has fewer than 100 settled or 300 loaded samples of either read in a window, or any sampler errors.

Any one of these falsifies the prediction. A treatment arm that stores everything but reads 0.04 per save would mean the cache covered the set after all; check the arm's cache setting before reading anything else.
