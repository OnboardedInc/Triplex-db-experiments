# Owner head on the rented server: command and predictions

North star P2 and P4. This run compares today's writer with the covering owner root (`TX2_SUBJECT_OWNER_HEAD=1`) on the same full-size copy, the same tape and the same 16 GiB object cache. Line 2 (1 billion records, from the held cluster) is meant for the 1 billion machine after its server-32 scorecard; line 1 (fresh) is ready for a machine that holds the fresh template. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Option and gates](OWNER-HEAD.md)

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

**Line 2, 1 billion records: 50 then 235 offered, 120 s each, from the held stopped 1 billion cluster.** Same prepared-copy path as the 1 billion scorecard (`v01/AGED-SERVER-32.md`): one invocation per arm, each on a new physical scratch copy of the held cluster, the aged bundle's fresh-peer check on the stack's own network, and no dump. The reference arm (today's writer) must finish and seal before the treatment arm (owner head) starts; the runner refuses the treatment arm otherwise. Both arms use the `server` profile (16 GiB transactor cache), rolling 6 credits, native lookups sampled every 64 saves and the migrated-person read sampler. Full section below: [The 1 billion pair](#the-1-billion-pair-line-2).

**What both lines add for the open read question.** In each window of each arm, a separate reader client on the read gateway samples 5 people per second whose saves that window's tape has just made: a current read, then a pinned read at a snapshot cut taken at or after the person's newest row. It runs through the loaded window, and again for 30 s after the window settles. A person counts only once their newest row is after the window's first cut, so in the treatment arm every sampled person has been migrated. The reads are outside the save path's clock and client. Each arm's `retirement-diagnostic.json` reports p50 and p99 per phase. `retirement-comparison.json` reports treatment over reference as `migratedReadRatios`, next to the quiet-account read (`pinnedRead`).

- **Toy gate:** the sampler ran inside the owner-head recovery probe (`owner14-03`, source `83932413e`) on people the probe's own tape had just saved. It made 15 attempts in each credit mode, all migrated, with no errors and no skipped pinned reads, then passed the layout gate (160 assertions) and recovery (56 durable and 6 refused in each mode). The loaded phase and the per-arm comparison inside the full-size runner have not run anywhere; they type-check and load, and run only on bare metal.
- **First cut:** the 620 window's first cut is the 394 window's terminal. Its sampled people are those saved during the 620 window.
- **Load:** the sampler adds up to 10 requests per second to the read gateway in both arms.

- **Scope open writes records:** with the option on, opening a scope installs the owner-head schema and two functions (five entities) and reinstalls the reference function, whose text includes the fence. A launcher that counts the records a scope open writes on a held copy must include them.
- **First touch:** the owner head migrates a person on their first eligible save. The fresh tape touches each person once or twice in 300 s, so most measured saves are first touches.
- **Readback:** the runner refuses the treatment arm unless the write gateway reports `subjectOwnerHead` and every acknowledged save carries the root's byte count. `summarize.py` reads `DX_W1_PAIR_OPTION` and checks the same.

## Predictions for line 1 (fresh), written before any run

Late means after the first 150 s. Ranges are for the treatment arm unless marked. Today's writer is the reference arm of the same run.

| Measure | Fresh, 394 offered | Fresh, 620 offered |
| --- | --- | --- |
| Stored/s, reference | 390–394 | 435–470 |
| Stored/s, owner head | 392–394 | 480–580 |
| SQL reads per save outside index jobs, reference → owner head | 0.9–1.2 → 0.30–0.60 | 1.0–1.3 → 0.35–0.65 |
| SQL reads per save inside index jobs, reference → owner head | 1.4–1.8 → 0.50–0.90 | 1.4–1.8 → 0.55–0.95 |
| AEVT segment loads per save, owner head | under 0.15 | under 0.15 |
| Mean apply outside / inside index jobs, owner head | 0.85–1.15 / 1.7–2.4 ms | 0.9–1.25 / 1.8–2.5 ms |
| Records per acknowledged save | 25–26 against 23 | 25–26 against 23 |
| Quiet-account current read p50, owner head against reference | 0.95–1.10× | 0.95–1.15× |

- **Reads of a migrated person.** This runner does not time a migrated person's reads. From the Mac paired probe and the read-range census, a migrated person's current read p50 should be within 0.95–1.10× of a legacy person's and the pinned read within 1.00–1.15×. A separate read study on a migrated copy is needed to measure them at full size.
- **Index jobs.** Records per save rise about 13% (26 against 23) and string bytes 13–27%, so index jobs should start 10–20% more often. Their own fetches should fall with the serial reads.
- **Folds.** Saves on this tape edit one to three fields of a person, so folds should be under 1% of saves.

### Reads of migrated people (new rows)

Sample size per window and arm: about 1,450 current and pinned reads while loaded (fresh) or 550 (1 billion), and about 150 of each settled. Ratios are owner head over today's writer, for the same people and the same tape.

| Read | Fresh 394 | Fresh 620 |
| --- | --- | --- |
| Current p50, loaded | 0.95–1.15× | 0.95–1.20× |
| Pinned p50, loaded | 1.00–1.20× | 1.00–1.25× |
| Current p50, settled | 0.95–1.10× | 0.95–1.10× |
| Pinned p50, settled | 1.00–1.15× | 1.00–1.15× |
| Current and pinned p99, loaded | 0.7–1.5× | 0.6–1.6× |

- **Why near 1.** A just-saved person's rows are in the newest index segments for both writers. The owner head adds about 3 datoms to the current range and one root per save to the pinned range (one or two saves per person on these tapes), plus 15–25 µs of processing. On the Mac the same-process probe measured +1.6% to +6.3% current and +2.5% to +5.4% pinned.
- **Loaded p99 can favour either arm.** The owner head's writer reads less, so the write gateway and storage are less busy; that can make the treatment's tail shorter.

## What would show the line 1 predictions wrong

- **The owner head does not remove the reads at full size** if its late SQL reads per save outside index jobs are 0.8 or more (less than a 20% cut from the reference's about 1.0), or its AEVT loads stay above 0.3 per save. Then the reads are not where the toy said, and the next step is the per-attribute trace, not adoption.
- **The owner head does not add capacity** if it stores fewer than 470/s at 620 offered while its reads per save fall below 0.6. Then something other than reads limits the writer at 16 GiB (cores, queueing, commit), and the growth argument rests on the model alone.
- **The option costs reads** if the quiet-account current read p50 is above 1.15× the reference in either fresh window.
- **Migrated people's reads cost more than the bar** if the settled current p50 ratio is above 1.10, or the settled pinned p50 ratio is above 1.15, in any window. Then the Mac SQL gate's +12% to +50% was the real cost, not noise, and the trade must be priced before adoption.
- **The read sample is too thin to judge** (UNJUDGED, not a pass) if either arm has fewer than 100 settled or 300 loaded samples of either read in a window, or any sampler errors.

Any one of these falsifies the prediction. A treatment arm that stores everything but reads 0.04 per save would mean the cache covered the set after all; check the arm's cache setting before reading anything else.

## The 1 billion pair (line 2)

North star P2 and P4 at the size we will run. This afternoon's 1 billion card stored 249 saves/s at 394 offered and 239 at 620 with the same 16 GiB cache (`scale1/V01-AGED.md` on `exp/DX-SCALE1-deep-accounts`, part 2), against 343 and 329 fresh. This pair asks whether the owner head cuts the writer's reads per save on that database, for people the aging loader edited and for people it never touched.

### What changed from the dump path

| Item | Before (`db616801b`) | Now |
| --- | --- | --- |
| Source of each arm | Restore the aged dump into the slot (33–42 min, capped at 42) | A new physical copy of the held stopped 1 billion cluster (`DX_RD1_PGDATA_SOURCE`, `DX_RD1_PGDATA`), as the scorecard's `--pgdata-source`. The runner refuses a dump as well as a copy |
| Aged admission | Fresh peer on the host (failed this afternoon with AMQ219007 until a hosts-file watcher) | The same `age1/scorecard.mjs` check, run in a throwaway container on the stack's network from the read gateway's image (`verifyAged`; `aged-live-check.json` records the network and image) |
| Pair order | One invocation ran both arms | One invocation per arm. The treatment arm opens only after the reference arm's seal (`ladders/reference-complete.json`) on the same held cluster's system identifier |
| Evidence seal | Fixed to 394 and 620 | 50 and 235 on the 1 billion copy (`rd1/prepared.ts`) |
| Per-group reads | None | Each window puts every tape person in one group from the predecessor rows it read at its first cut: `loader` (a row after the seed cut and at or before the aged head), `seed` (only seed rows) or `earlier-window` (a row from the 50/s window). `retirement-diagnostic.json` gives saves, SQL reads, AEVT and EAVT loads per acknowledged save per group in each half; `retirement-comparison.json` gives late-half reads per save per group, reference then treatment (`ownerGroupReads`) |
| Dry run | Not possible for the treatment arm | `DX_DRY_RUN_FIRST_OFFER=1` admits either arm alone in a new campaign; it never offers or seals |

Kept as before: today's writer first, the owner head second; the migrated-person read sampler and its UNJUDGED rule; `PREP1_LOOKUP_EVERY=64`; the `server` profile's 16 GiB transactor cache in both arms; 50 then 235 offered, 120 s each.

### Commands

Run on the 1 billion machine as root, nothing else running. **If the server-32 scorecard is queued on the same machine, run this after its `--assemble`.** The build below retags the shared image names, and a scorecard part started after it would refuse its build receipt.

**Build once (about 5 minutes).**

```bash
COMMIT=<the commit that publishes this section>
BUILD=/var/tmp/triplex-owner-head-1b-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

**Environment.** The same values as the scorecard (`v01/AGED-SERVER-32.md`).

```bash
export AGE_HANDOFF_JSON=<aged-scorecard.json>   AGE_HANDOFF_SHA256=faab1bc5bca8e6303285101003e5a42fc82c8e99fe2eadacaf125259b575bbf2
export AGED_PGDATA_SOURCE=<the stopped held 1B cluster>   AGE_JAVA=<java 21>   AGE_DATOMIC_HOME=<datomic-pro-1.0.7745>
export SCALE1_IMAGE=<metadata directory>   SCALE1_IMAGE_SHA256=<...>   SCALE1_TRANSFER_SHA256=<...>
export WAL_DIR=<on the other NVMe>
pair_arm() {  # $1 = reference or append, $2 = new scratch copy of AGED_PGDATA_SOURCE, $3 = campaign directory, $4 = deadline in ms
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" \
    DX_W1_RETIREMENT_PAIR=1 DX_W1_PAIR_OPTION=owner-head PREP1_LOOKUP_EVERY=64 DX_W1_SERIAL_APPLY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" "DX_RD1_LADDER=$1" "DX_RD1_PGDATA=$2" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$3" "$4" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
```

Each arm needs its own new scratch copy of the held cluster, made the same way as for the scorecard parts (owner, modes and internal `pg_wal` kept; the source stays stopped). Remove a copy only after its arm prints its summary, or after it was refused. The two empty arguments are the dump and its pin: a prepared arm refuses a dump.

**Dry run of both arms to their first offer (about 20 minutes).** Each arm runs in its own new campaign, starts its stack on its own copy, runs every check including the aged fresh-peer check, prints `DX-DRY-RUN first offer reached: retirement reference …` or `… retirement append …`, stops before any save and removes its stack. The treatment arm's dry run does not need the reference arm.

```bash
cat > /var/tmp/oh1b-dry.queue <<'EOF'
reference mkdir "$LOGS/ref" && pair_arm reference "$DRY_COPY_1" "$LOGS/ref/campaign" "$DRY_DEADLINE"
append mkdir "$LOGS/trt" && pair_arm append "$DRY_COPY_2" "$LOGS/trt/campaign" "$DRY_DEADLINE"
EOF
export DRY_COPY_1=<scratch copy> DRY_COPY_2=<scratch copy> DRY_DEADLINE=$(( $(date +%s%3N) + 90 * 60 * 1000 ))
export -f pair_arm; export BUILD COMMIT AGE_HANDOFF_JSON AGE_HANDOFF_SHA256 AGED_PGDATA_SOURCE AGE_JAVA AGE_DATOMIC_HOME \
  SCALE1_IMAGE SCALE1_IMAGE_SHA256 SCALE1_TRANSFER_SHA256 WAL_DIR
bash lab/experiments/EXP-DX1/ha1/first-offer-dry-run.sh /var/tmp/oh1b-dry.queue "$AGED_PGDATA_SOURCE" /var/tmp/oh1b-dry-logs
```

The tool prints `ADMITTED reference (…v01/study-server.ts:…)` and `ADMITTED append (…)`, or `REFUSED NAME FILE:LINE MESSAGE`, and exits 0 only when both are admitted. Make new scratch copies for the timed run; the dry run started PostgreSQL on its copies.

**Timed run (about 35 minutes; ceiling 55).**

```bash
OUT=/var/tmp/triplex-owner-head-1b; mkdir "$OUT"     # new
DEADLINE=$(( $(date +%s%3N) + 75 * 60 * 1000 ))
pair_arm reference "$COPY_1" "$OUT/pair" "$DEADLINE"   # 14–20 min
# remove COPY_1, make COPY_2
pair_arm append "$COPY_2" "$OUT/pair" "$DEADLINE"      # 14–20 min; writes OUT/pair/retirement-comparison.json
```

- **Per arm:** stack start on the copy and the aged fresh-peer check 4–6 min (the scorecard's parts took this); preload and the 50/s window with drain and the 30 s settled read sample 3–4 min; the same for 235/s 3–5 min; summary and cleanup 1–2 min. The copy itself takes about 3 min between arms (a 176 GB copy took about 3 min this afternoon).
- **Disk:** the held cluster plus one scratch copy on the data NVMe; WAL on the other. Two copies are never live at once.
- **If an arm stops before its first save,** the runner prints `The reference arm stopped before its first save; its records are in OUT/set-aside/reference-…` (or `append`). Make a new scratch copy and run the same `pair_arm` line again with the same `OUT/pair`. A sealed reference arm stays and is not repeated. An arm that stops after its first save keeps its records; the pair then needs a new `OUT` from the reference arm.

### Toy-size gate on a loader-aged database (Mac, timings diagnostic)

One ordinary heavy token, one lab container, about 6 minutes. Scripts are in `w1/aged-owner-head/` (`container.sh`, `gate.mjs`, `owner_census.clj`); the aging step reuses `prep1/aged-live/aged_live.clj`. Evidence: `evidence/DX-THIN1/aged-owner-head-02.tar.gz`, SHA-256 `8d15e04f229167867d7e4a4536cd57ea50ea57eef655a83c70f4322ea25f9aea` (both attempts). The first attempt (`-01`) stopped on my own check, not the product: it inferred folds from gaps in Datomic `t`, and new entities also advance `t`. The second attempt reads folds natively.

1. **Seed and age.** PostgreSQL, a transactor and this branch's write gateway took the aged-live gate's SCALE1-shaped toy (ten accounts, 50 people, three first-task fields, loader command at cut 61). The stack was stopped, and AGE1's own code at its load pin `5cda4ab20` (its transactor functions and a separate peer JVM running `adopt/subject!` and 300 saves of `tape/command`) aged it to head 361.
2. **Copy, as the server does.** PostgreSQL was stopped and its directory copied. The copy ran today's writer (legacy); the original ran the owner head (covered).
3. **People.** Four people AGE1 edited (current field rows after the seed cut, from accounts 1–4) and two it never adopted.
4. **The same 60 saves in both arms, interleaved across the six people, ten per person:** replace field 0, replace field 1, add field 3, add field 4, then replace fields 0, 1, 2, 3, 4 and 0. In the covered arm, before every save, the predecessor rows read through the gateway and the full request were byte-equal to the legacy arm's.
5. **Covering saves and folds.** All 48 replacements (32 on AGE1-edited people, 16 on the others) went to the covering writer (`:triplex.owner/v-…`) with root sizes of 355 to 1,340 bytes. The 12 add-only saves went to the reference writer, as in the legacy arm. A native census after the covered arm found exactly 12 folds, two per person: one just before each person's first add-only save (a root of two texts) and one just before the fifth distinct field (the fold at four). Each person ended with a root of two texts and two masked IDs. Positions and record times of all 60 saves matched the legacy arm.
6. **Every read route equal to the legacy arm.** For each of the six people: current read; pinned read at every one of 362 positions from cut 60 to head 421; history; read by ID and by ID with history for every row ID in the history (25 IDs for AGE1-edited people, 13 for the others); reach at the head and pinned at 74 positions; and the feed of all 360 transactions after the seed cut. The legacy and covered answers were deep-equal.
7. **Admission and reads without the option.** A gateway started without the option on the covered database answered every route above exactly as the legacy arm, and refused a save on an AGE1-edited person and on an untouched person with `OwnerLayoutRequired`; the head did not move.

**Not covered by this gate:** the reference function's own native fence against a stale payload for a person with a root (the layout gate `owner14-02` checks it, on people without AGE1 history); concurrent saves on one person; AGE1's larger population, much longer histories (about 1,400 saves per active person at 1 billion if AGE1 kept 2,000 active people per account) and indexed segments at size.

### Predictions for the 1 billion pair, written before the run

Late means the second 60 s of each 120 s window. Reference is today's writer; treatment is the owner head. Sources: the 1 billion card's part 2 at 16 GiB (fair turns, 90 s cells: 50.00 and 235.00 stored, 235/s all-save p99 3.8 s, a ceiling near 245–250 saves/s), the fresh pair's predictions above, and the Mac toy gate.

| Measure | 50 offered | 235 offered |
| --- | --- | --- |
| Stored/s, reference | 49.5–50, no expiries | 220–235 (expiries 0–1,500) |
| Stored/s, owner head | 49.5–50, no expiries | 230–235 (expiries 0–300) |
| Late SQL reads per save, reference → owner head | 1.0–2.0 → 0.30–0.80 | 1.2–2.5 → 0.40–1.0 |
| Late AEVT segment loads per save, owner head | under 0.20 | under 0.25 |
| Late mean apply, reference → owner head | 1.2–2.5 → 0.9–1.6 ms | 1.4–3.0 → 1.0–1.8 ms |
| Records per acknowledged save, reference → owner head | 23 → 25–26 | 23 → 25–26 |
| Saves on loader-edited people (whole window) | 80–130 of 6,000 (102 if AGE1 kept 2,000 active people per account) | 400–650 of 28,200 (513) |
| Late reads per save on loader-edited people ÷ on seed people, reference | 0.8–1.5 | 0.8–1.5 |
| Owner-head cut (treatment ÷ reference reads per save), loader group minus seed group | within ±0.20 | within ±0.15 |
| Treatment saves acknowledged without owner-head bytes, either group | 0 (the runner refuses the arm otherwise) | 0 |

- **Who is loader-edited.** AGE1 edited fields 0–2 of a fixed sample in each account (`floor(j × 99,998 / per-account)`, plus one probe person). AGE1's rung document gives 2,000 active people per account; at that count the serial tape touches 47 such people at 50/s and 132 at 235/s. The runner reports the actual counts (`ownerGroupPeople`); the groups come from the rows, not from this formula.
- **Folds and other writers.** The tape replaces one to three of fields 0–2, so no person reaches four root texts in 120 s: no fold at four is expected in either window, and no other writer runs. The toy gate covers both.
- **Migrated-person reads.** The bars and ratios in the table above (fresh) apply. The 1 billion card's reader returned errors for about two thirds of the quiet account's planned reads; if the sampler sees errors, the read comparison is UNJUDGED (60% likely), and the write-side rows above still stand.

### What would show the 1 billion predictions wrong

1. **The owner head does not cut reads at 1 billion:** late treatment reads per save at 235 above 0.8 × the reference's, or treatment AEVT loads above 0.3 per save.
2. **Loader-edited people behave differently under the owner head:** the late treatment ÷ reference ratio for the loader group differs from the seed group's by more than 0.25 at 235 with at least 150 late loader saves, or any treatment save on a loader-edited person is refused, conflicts or lacks owner-head bytes.
3. **The owner head does not add headroom near the ceiling:** treatment stores under 230/s at 235 while its late reads per save fall below 0.6; something other than reads limits the writer at 1 billion.
4. **The cache already covers the set:** reference late reads per save under 0.3 at 50; then 16 GiB is not standing in for a larger database at this tape, and the pair cannot separate the writers.
5. **The launch path fails:** either arm refused before its first save at the copy admission, the aged fresh-peer check or the treatment arm's seal check.

### What this does not prove

- The per-group split rests on AGE1's sample being about 2% of people; at 50/s the late loader group has about 50 saves, enough for a mean but not a p99.
- Folds at four, the add-only fold, the other writers' fence and `OwnerLayoutRequired` on loader-edited people are shown only at toy size on the Mac. The 1 billion tape does not reach them.
- The 120 s windows start cold on a fresh copy; they say nothing about the owner head after hours of saves, when most people have roots.
- The full runner (`study-server.ts`) refuses anything but bare-metal Linux, so the prepared 1 billion path has run on the Mac only as unit tests (`rd1/prepared.test.ts`, `v01/owner-groups.test.ts`, `w1/serial/summarize_test.py`) and a type check. The first run of the real path is the server dry run.
