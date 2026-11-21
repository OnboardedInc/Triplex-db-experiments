# Run the v0.1 server scorecard

Use the commit in the Build section for the next cards on `exp/DX-V01-next-card`. The launch pin is INT1 `57580241dc4020f9ab7590839c72c00356fcedee`.

The queued 1B comparison still runs `8cc32d380dc56559477535e18130dbd0f3bff555` on `exp/DX-V01-scorecard`. Follow its pinned [one-copy handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/0af801036141177bc48ad1883b4b12d3dd5ef961/lab/experiments/EXP-DX1/v01/SERVER.md).

The latest SCALE1 handoff records that AGE1 stopped at the time guard after calibrating at about 5,284 records/s. Run fresh first. The 1B command requires a later verified one-billion-record seal. [SCALE1 handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/58e4b1ca3865315e6b671fc4cbf07687d113c6f8/lab/experiments/EXP-DX1/scale1/HANDOFF.md)

## Campaign and forecast

| Order | Purpose | Writer | JVM | PostgreSQL WAL |
| --- | --- | --- | --- | --- |
| 1 | Headline, no P1 readers | Ordered per-person | Transactor Java 25 ZGC, both gateways Java 21 G1 | Second NVMe |
| 2 | Headline, loaded, all available rows | Ordered per-person | Same as arm 1 | Second NVMe |
| 3 | Default server comparison, P2 and P6 | Ordered per-person | Java 21 G1 on all roles | Data NVMe |
| 4 | Grouped comparison, P2 and P6 | Grouped | Java 21 G1 on all roles | Data device |

The shared INT1 server profile gives the transactor three cores, a 24 GiB heap and 16 GiB object cache. It gives the writer four cores and the reader one core. PostgreSQL uses an 8 GiB cap and 2 GiB in shared buffers. Synchronous commit, fsync and full page writes stay on.

The full forecast is **384 minutes and USD 6.98 per age** at USD 1.09/hour. That includes 15 minutes for cleanup, 105 for adoption and the P1–P4 pair, 53 for the headline quiet pairs, 10 for P7, 25 for P8 and up to 88 each for the two comparisons. Fresh and 1B use the same measurement allocation. Build, aging and file-copy time are separate.

Select `--window-seconds 90` for the previous offer and read tapes and the **300-minute, USD 5.45** allocation. This next-card runner adds counters in either form. An exact reproduction of the earlier harness uses the pinned earlier commit. Each comparison keeps the same six-minute prelude and omits the P1 reader ladder.

At 300 seconds, the loaded cells offer 50, 235, 394 and 620 saves/s. Each has a matched quiet-only cell, with 1,050 quiet offers on each side. The 90-second option has 315 on each side. The nine busy accounts use deterministic bands of 1,900 people each. Each quiet read uses the same seed cut, with quiet probes in both halves of the longer cells. The field tape edits one or two fields on a single task per person. The P2 size bands and P6 Publish and import overlap remain separate.

The default credit selection inherits the current integration barrier with six credits. `--credit-mode barrier` requests it explicitly. `--credit-mode rolling:N` validates the requested credits and stops before launching until DX-PREP1 publishes the writer selector. Match the writer mode, seed cut, credit count and tape in both cards before comparing.

To retain five-minute windows under 300 minutes, drop the grouped comparison arm first. That removes up to 88 minutes and yields a **296-minute, USD 5.38** proposed allocation. The fresh card already establishes the slower grouped baseline. Dropping that arm also leaves the paired mixed-ID history check open for the shortened campaign. Dropping 620 alone saves 30 minutes across the three treatments and leaves 354 minutes. Keep 620 if the immediate question is where rolling saturates. The supplied full command includes all four arms.

## Counters and retention

Keep the whole scorecard output through collection. Each rated cell stores its offer and receipt archive plus `telemetry.json`. This includes one-second and boundary snapshots of each role's Linux cgroup CPU, throttling and pressure, sender-process CPU, and PostgreSQL 17's `pg_stat_wal`, `pg_stat_checkpointer` and `pg_stat_io`. The PostgreSQL query opens one local stats connection per snapshot and records its actual time within the host sample bracket. Reported elapsed and per-role CPU use the same host-clock boundaries as saves. Counter deltas can be delayed by PostgreSQL stats publication.

Archive each Datomic index start, completion and adoption, the vendor memory-index interval high and observed alarms, and PostgreSQL checkpoint starts and finishes with the original reason and timings. A missing native source or unreadable clock is reported as a gap. Each tick indexes the native events that arrived by that clock boundary and records the timestamp of the last observed memory bucket. Native metrics keep their actual cadence, including `AlarmBackPressure` counts and the separate warning or error events. Each cell links a summary and its archive. Keep `SCORECARD-v0.1.md`, `campaign/`, `sequence/` when staging sequentially and the arm logs. Compress the archive after assembly and keep the checksums.

## Proposed twelve-core profile

The integration builder owns these settings. Propose three transactor cores (0, 7, 8), two PostgreSQL cores (1, 5), two writer-gateway cores (2, 3), three read-gateway cores (4, 6, 10), one sender core (9) and one reader-driver core (11). Confirm each CPU ID maps to a distinct physical core. Give each JVM an active processor count matching its assignment. Keep the transactor and storage durability settings fixed.

P1 prediction with that profile on fresh is **approximately 290–450 ms p99 at 256 concurrent readers**, against 860 ms measured on one gateway core and the 100 ms bar. Ideal three-way scaling gives 287 ms. Index access, scheduler contention and a single reader-driver core may leave a higher tail. The two-core writer gateway could also raise preparation p99. Compare writer p99 and completed saves/s alongside P1, and use the counters to detect a bottleneck moving to the client or PostgreSQL. Expect a wider P1 tail at 1B if more reads miss the cache. [Fresh analysis](https://github.com/OnboardedInc/Triplex-db-experiments/blob/e7a97790816bc333b4fd305f2927853034537fcc/lab/experiments/EXP-DX1/prep1/SCORECARD-FRESH-READING.md)

## Predictions written before the run

These are engineering estimates from the earlier benchmark. In the five-minute cells, expect the warm half at 235 to have substantially lower sender wait than the first half. At 394, the previous headline carried 302.4/s in the first half and 383.4/s in the second. Check whether a later checkpoint or index run reopens that gap. The full-size anchors are 345.80/s and 365.13/s with ZGC and separate WAL at 394 and 620, against 361.51/s and 351.19/s on default G1. The tuned headline quiet p99s were 65.99 → 221.10 ms at 394 and 25.18 → 57.67 ms at 620. The smaller combined run stored all 57,240 offers and had a quiet ratio of 1.36× at 235 and 4.28× at 394. The small run is a lower-pressure reference. The two headline changes are one combined treatment. [Full-size observations](https://github.com/OnboardedInc/Triplex-db-experiments/blob/64a76c50d/lab/experiments/EXP-DX1/scale1/SCALE-TUNE.md) · [Smaller combined run](https://github.com/OnboardedInc/Triplex-db-experiments/blob/31f33faf8/lab/experiments/EXP-DX1/bm1/APPEND-TAIL-READING.md)

| Row | Fresh prediction | 1B prediction |
| --- | --- | --- |
| P1 pinned reads | Zero wrong pinned values. Read p99 rises at the top of the ladder on the one-core reader. The writer's 3.5/s reference should still make progress. | Same exactness. Higher tail latency and earlier goodput flattening if the larger persisted index displaces hot pages. |
| P2 commits | Both ordered arms near 50/s at 50 and roughly 220–235/s at 235. At 394 expect 325–365/s headline and 340–380/s default, with expiries. At 620 expect 330–380/s headline and 320–365/s default. Grouped is expected to reach roughly its earlier 147–182/s ceiling at 235 and above. | Low rates should be close to fresh. At 394 and 620 predict flat to 15% lower delivery for the same configuration and wider tails if larger indexes add SQL reads per save. That bound is an estimate, with no aged calibration behind it. |
| P3 ordered feed | Expect exact order, positions and changes for acknowledged saves. Queueing and polling may widen the loaded tail. Crash resume remains outside the run. | Same exactness. The larger journal can make a cold open slower. Resuming near the same logical head should limit steady-state change after the peer is warm. |
| P4 current pulls | Expect exact projected fields and faster warm reads than first pulls. The full multi-hop latency bar remains open. | Warm current fields should stay closer to fresh than first pulls. More persisted pages can increase the first index fetch. |
| P5 Publish | NOT RUN. The separate Server 1 Publish campaign is the source for under-load evidence. | NOT RUN. The held 1B cluster receives no Publish window here. [Publish campaign](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530b88a6e9f7c9ca0593628bdbd7689707c87408/lab/experiments/EXP-DX1/bm1/HANDOFF.md#joined-publish-at-100000) |
| P6 quiet account | Expect the light 50/s cell to have the least inflation. Expect most 235–620/s headline ratios to exceed 1.25×. At 394 the full-size prior is about 3.35× headline versus 2.77× default. At 620 the prior is 2.29× versus 4.53×. Grouped likely has the longest busy tails. | Expect higher solo and loaded p99 with a colder index. A higher solo denominator may lower the ratio without improving the loaded p99. The 1.25× bar remains unlikely at the busy rates. |
| P7 idle cost | First pulls should be slower than warmed current pulls. The empty and populated JVM census will give a footprint difference at this one population. | Expect slower cold first pulls and more occupied pages at the same cap. The two snapshots leave the activity-matched memory slope open. |
| P8 paced import | Expect exact imported bytes and more live lag during the overlap. The fixed pace can reveal whether the 3,000 facts/s target is plausible. | Expect less spare capacity and a higher live tail from larger indexes and cache competition. Exact receipts and replay should agree. |
| P9 loss and move | NOT RUN. The next live test needs two hosts. | NOT RUN. The scheduled two-server procedure will provide this evidence. [Failover procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md) |
| Journal, receipts and mixed IDs | Expect exact feed-to-receipt matches for stored saves, both retired IDs refused, and matching historical values across writers. | Expect the same results after the AGE1 identity confirms the restored cut. This row is independent of the latency estimate. |
| Erasure and acknowledged-write loss | Both remain unmeasured by this campaign. | Both remain unmeasured by this campaign. |

## Build

Use a clean checkout of `exp/DX-V01-next-card` at the runner commit on the dedicated bare-metal Ubuntu host.

```bash
COMMIT=NEXT_CARD_RUNNER
BUILD=/var/tmp/triplex-v01-next-card-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

## Prepare the copies

- Both ages need `SCALE1_IMAGE` with the published directory name and `image.json` and `transfer.json`. Use the recorded `SCALE1_TRANSFER_SHA256` and the transfer's `summaryFiles["image.json"]` as `SCALE1_IMAGE_SHA256`. The original seal covers 1,000,000 people, 162,456,470 business facts and logical cut 87,002.
- Set `FRESH_PGDATA_SOURCE` or `AGED_PGDATA_SOURCE` to the held stopped PG17 directory. The 1B source must match `AGE_HANDOFF_JSON` and `AGE_HANDOFF_SHA256` at the exact AGE1 sealed cut. Supply `AGE_JAVA` and `AGE_DATOMIC_HOME`, the Datomic 1.0.7745 distribution root, for the fresh-peer check.
- Stage four independent file-level copies per age, in the order above. Preserve ownership and permissions. Each path must directly contain `PG_VERSION` and a private internal `pg_wal`. The first three copies must be on the same data NVMe. Put grouped on the same data NVMe when space allows and record a different placement if necessary. The scorecard records each copy's device.
- Each fresh copy needs about **115 GB**, or **460 GB for four**, plus the held source. Size each 1B copy from the stopped cluster's actual allocation with `du -sB1 "$AGED_PGDATA_SOURCE"`. Leave **16 GiB free on each copy filesystem** after staging and 5 GiB on the evidence filesystem.
- Use `SCORECARD_WAL_DIRECTORY` on the second NVMe. Give it room for one copied `pg_wal` at a time and 16 GiB of additional working space. The command creates and cleans one private child for each headline arm. The source stays stopped and unmounted. After cleanup discard the four consumed scratch directories and use fresh copies for any retry.

## Fresh

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age fresh --window-seconds 300 --writer per-person-ordered --jvm j21-g1 --tx-jvm j25-zgc \
  --wal-directory "$SCORECARD_WAL_DIRECTORY" \
  --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" --pgdata-source "$FRESH_PGDATA_SOURCE" \
  --pgdata "$FRESH_PGDATA_ZERO" --pgdata "$FRESH_PGDATA_LOADED" \
  --pgdata "$FRESH_PGDATA_DEFAULT" --pgdata "$FRESH_PGDATA_GROUPED" \
  --out /var/tmp/triplex-v01-fresh
```

## 1 billion, four prepared copies

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age 1B --window-seconds 300 --writer per-person-ordered --jvm j21-g1 --tx-jvm j25-zgc \
  --wal-directory "$SCORECARD_WAL_DIRECTORY" \
  --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
  --pgdata-source "$AGED_PGDATA_SOURCE" \
  --pgdata "$AGED_PGDATA_ZERO" --pgdata "$AGED_PGDATA_LOADED" \
  --pgdata "$AGED_PGDATA_DEFAULT" --pgdata "$AGED_PGDATA_GROUPED" \
  --out /var/tmp/triplex-v01-1B
```

Use absolute paths and new output directories. Omitting the PGDATA and WAL flags selects the existing logical-dump path. That path also needs the original `seed.pgdump` and, for 1B, `--aged-dump` and `--aged-dump-sha256`.

## 1 billion, one prepared copy at a time

Measure all four arms in order using the same `SCORECARD_OUT`, source, build receipt, SCALE1 seal and AGE1 bundle. `SCORECARD_OUT` must be new for arm 1. The four-copy command remains available when all copies fit. Sequential assembly invokes the same renderer over the same four arm directories, with the same tapes, launch checks and selected active budget. The earlier fresh runner at `3a71c17674ccff6a435f8829cd3da8933feb34b1` remains valid for the all-at-once procedure.

```bash
SCORECARD_OUT=/var/tmp/triplex-v01-1B
scorecard_arm() {
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json"     "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME"     "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$SCORECARD_OUT" --arm "$1"     --age 1B --window-seconds 300 --writer per-person-ordered --jvm j21-g1 --tx-jvm j25-zgc     --wal-directory "$SCORECARD_WAL_DIRECTORY"     --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256"     --transfer-sha256 "$SCALE1_TRANSFER_SHA256"     --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256"     --pgdata-source "$AGED_PGDATA_SOURCE" --pgdata "$2"
}
```

Using the driver's existing copy procedure, make a fresh scratch copy of `AGED_PGDATA_SOURCE` immediately before each line. Set `AGED_PGDATA_COPY` to that copy's absolute path. After an arm exits successfully and reports completion, remove its scratch with the driver's usual cleanup before preparing the next copy. The same scratch path can be recreated for each arm. Keep the whole output directory.

1. `scorecard_arm 1 "$AGED_PGDATA_COPY"`
2. `scorecard_arm 2 "$AGED_PGDATA_COPY"`
3. `scorecard_arm 3 "$AGED_PGDATA_COPY"`
4. `scorecard_arm 4 "$AGED_PGDATA_COPY"`

When all four are complete, assemble from the same built checkout.

```bash
sudo "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$SCORECARD_OUT" --assemble
```

Keep the stopped held source plus one separate data copy. Arms 1 and 2 also need the prepared WAL directory on the other NVMe, with room for the copied WAL files and 16 GiB of working space. Arms 1–3 place their scratch copies on the same data NVMe across invocations. Leave at least 16 GiB free on the copy filesystem after preparing each copy and 5 GiB on the evidence filesystem. Peak data allocation is **about 580 GB for a 290 GB aged directory**, plus WAL, margins and existing host usage.

Copy time per arm is **aged source bytes ÷ measured copy bytes/s**. Four fresh copies took 17m 25s. With 124,827,727,539 bytes per fresh copy, that averages about 478 MB/s. At that rate, 290 GB would take about 10m 7s per arm, or about 40m 28s total. Use the driver's measured aged size and copy rate for scheduling. Time between invocations for staging and removal is outside the 300-minute campaign clock.

The controller reports completion only after cleanup. An early refusal before the start record can be retried. A failure after the arm is claimed requires a new campaign directory. Keep `sequence/`, the `arm-*.log` files and `campaign/`. Assembly refuses a missing or repeated arm, a mismatched pinned source or cut, and any changed renderer evidence.

## Early check and evidence

The first arm verifies distinct actual NVMe devices before taking a writable copy. Before sending any offers it checks the live PostgreSQL mount, SQL durability readback, actual JVM flags and versions, cgroup placement and memory, transactor cache, and the restored scope. A refused launch prints an early stop message and retains `campaign.log`. The remaining arms repeat the applicable checks on their own copies.

Keep the whole output directory. It contains `SCORECARD-v0.1.md`, `campaign.log`, the launch and JVM readbacks, PGDATA identity, WAL placement, rate tapes, receipts and cleanup inventory. The 1B output also includes the AGE1 live identity checks. P5 and P9 remain linked to their separate campaigns.
