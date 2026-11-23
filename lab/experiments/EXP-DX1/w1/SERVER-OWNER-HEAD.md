# Owner head on the rented server: command and predictions

North star P2 and P4. This run compares today's writer with the covering owner root (`TX2_SUBJECT_OWNER_HEAD=1`) on the same full-size copy, the same tape and the same 16 GiB object cache. No server is ordered for it; the command is ready for the next rental. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Option and gates](OWNER-HEAD.md)

## What the run can and cannot show

- **At today's size, a bigger cache already removes these reads.** On 2026-11-21 a 32 GiB object cache cut SQL reads per save from about 1.0 (outside index jobs) and 1.6 (inside) to 0.04, and stored 394/s and 620/s with no expiries (`bm1/ROLLING-READING.md`, cache32). This run does not claim the owner head is needed at 430 million records.
- **The owner head is for growth.** The part 9 model forecasts 2.73 ms apply at 8 billion records for today's writer (a ceiling near 366 saves/s) and 1.21 ms with the owner head. A cache cannot keep up with a database that keeps growing; the owner head makes a save read the person's own small range instead of old rows scattered through history.
- **So the run keeps the 16 GiB cache on purpose.** At full size that cache covers about half of today's working set, which stands in for a larger database. Every number below speaks to the owner head at 16 GiB, not to the cache. A 32 GiB arm would read about 0.04 per save on both writers and could not separate them.

## Command

Use the paired runner from the append-retirement study with the owner-head option. It restores or copies the same prepared full-size copy for each arm, plays the same tape at 394 and 620 offered for 300 s each (fresh) or at 50 and 235 for 120 s (1 billion), and samples native reads every 64 saves. The treatment arm keeps the directory name `append`.

```sh
# Fresh full-size copy (430 million native records), today's writer then the owner head.
DX_W1_RETIREMENT_PAIR=1 DX_W1_PAIR_OPTION=owner-head PREP1_LOOKUP_EVERY=64 \
  bash lab/experiments/EXP-DX1/v01/study-server.sh \
  "$(git rev-parse HEAD)" "$OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" "$TRANSFER_PIN" \
  fresh per-person-ordered j21-g1 "" "" "" "" j25-zgc "$WAL_DIR" j21-g1 rolling6

# 1 billion records, 50 and 235 offered.
DX_W1_RETIREMENT_PAIR=1 DX_W1_PAIR_OPTION=owner-head PREP1_LOOKUP_EVERY=64 \
  bash lab/experiments/EXP-DX1/v01/study-server.sh \
  "$(git rev-parse HEAD)" "$AGED_OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" "$TRANSFER_PIN" \
  1B per-person-ordered j21-g1 "$AGED_BUNDLE" "$AGED_PIN" "$AGED_DUMP" "$AGED_DUMP_PIN" \
  j25-zgc "$WAL_DIR" j21-g1 rolling6
```

- **Prepared copies:** where the server holds only the stopped directory, run one invocation per arm with `DX_RD1_PGDATA_SOURCE`, `DX_RD1_LADDER=reference` then `DX_RD1_LADDER=append`, and a fresh `DX_RD1_PGDATA` copy each time, as for the retirement pair (`int1/V0.1-STATE.md`).
- **Before committing hours:** pass both lines through `ha1/launch-dry-run.sh --to-first-offer` on the exact commit; the stack and runner files changed since the retirement pair was admitted.
- **Scope open writes records:** with the option on, opening a scope installs the owner-head schema and two functions (five entities) and reinstalls the reference function, whose text includes the fence. A launcher that counts the records a scope open writes on a held copy must include them.
- **First touch:** the owner head migrates a person on their first eligible save. The fresh tape touches each person once or twice in 300 s, so most measured saves are first touches. The 620 window follows the 394 window on the same copy, so its people are partly migrated.
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

## What would show this wrong

- **The owner head does not remove the reads at full size** if its late SQL reads per save outside index jobs are 0.8 or more (less than a 20% cut from the reference's about 1.0), or its AEVT loads stay above 0.3 per save. Then the reads are not where the toy said, and the next step is the per-attribute trace, not adoption.
- **The owner head does not add capacity** if it stores fewer than 470/s at 620 offered while its reads per save fall below 0.6. Then something other than reads limits the writer at 16 GiB (cores, queueing, commit), and the growth argument rests on the model alone.
- **The option costs reads** if the quiet-account current read p50 is above 1.15× the reference in either fresh window.

Any one of these falsifies the prediction. A treatment arm that stores everything but reads 0.04 per save would mean the cache covered the set after all; check the arm's cache setting before reading anything else.
