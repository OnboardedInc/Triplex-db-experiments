# The tuned reader as a card setting, server-32 caps, the random-subject line, and cell length

Built on 2026-11-24 on `exp/DX-CARD2-reader-setting` from `origin/exp/DX-INT1` `9e02cf1d2`. No server was rented, so
nothing here has run on bare metal. Mac times are diagnostic. Everything added is off by default: the default card's
plan output is byte for byte the same as at `9e02cf1d2` (seven option sets compared, below).

## 1. The setting

`lab/bin/scorecard.mjs … --reader tuned [--read-permits N]` (`v01/card-reader.ts`, carried as `run.ts` →
`adopted-server.ts` through `DX_V01_READER` and `DX_V01_READ_PERMITS`, as the profile and tape already are).

| Part | What the card does with `--reader tuned` | As the tuned arms of 2026-11-23 ran it |
| --- | --- | --- |
| Reader launch | `launchProfile(profile, { readTuned: true, readCacheMiB: 3072 })`: cores 5, 6, 11; 6 GiB heap; 3 GiB object cache; 1 GiB direct; `ActiveProcessorCount=3`. The writer moves to cores 2, 3, 4 | Same (`study-server.ts` `pinnedTunedPolicy`) |
| Read options | `DX_PINNED_SHORTCUT=1`, `DX_PINNED_CUT_LOOKUP=1`, `DX_RD1_READ_FILTER=1` | Same |
| Request trace | `DX_RD1_READ_PROFILE=1`: the ordinary request trace is off for `/read` (a read is traced only when it carries a sample header), and the reader writes its GC log and Datomic metrics minutes | Same |
| Read permits | `--read-permits N` passes `TX2_READ_PERMITS=N`; without it, one per core (3) | `DX_RD3_READ_PERMITS` 6 and 12 |
| Driver | Pinned to cores 9 and 10 while offers run, unpinned while each stack starts (`stack/up.sh` admits only CPUs in its caller's affinity) | Same |
| Checks before the first offer | The reader's own write options report both pinned options; its container carries exactly the requested permits and the four switches (`reader-check.json` per stage) | The same checks in `study-server.ts` |
| P1 ladder | The card's own ladder (1, 4, 16, 64, 256, 1,024 seats, 60 s each, at the seed cut, every value checked) with client batches of up to 8 subjects per exchange; each step records exchanges and the mean batch | Batches of 8 |
| Random-subject line | After the ladder, one 60 s step: 256 seats, each read an account and subject drawn uniformly from all 10 × 100,000, at the seed cut, every value checked against the seed's; every 16th exchange carries a read-profile header; storage loads per subject and the cache share from the reader's trace (section 3) | `ref-random-seed-cut` (`rd1/pinned-ladder.ts` `pinnedWindow`, the same function) |
| Memory | Each role's cgroup `memory.peak` per stage (`role-memory.json`), on the card | Window-end `memory.current` |

The random line adds one 60 s step to both sides of the P1–P4 pair (the zero-reader side keeps the same save tape),
so the pair takes 14 minutes and the budget 2 minutes more. The realistic card refuses the setting (its ladder reads
the REAL1 roster, which the random line does not cover).

**Mac toy (Saturday's people, compact stack):** `v01/mac.ts` with `DX_V01_READER=tuned` puts both pinned options on
both toy gateways and the early filter and the permits on the reader (`thin1/slot.ts`), and runs the card's P1 code
with batches and a 4-seat random line. The toy gateway writes no reader trace, so the toy card shows "not recorded" for
the loads.

## 2. Caps for `server-32` with the tuned reader

### Peaks found per role and run (1 billion, 2026-11-23)

| Run (evidence) | Launch | Transactor | Writer | Reader | PostgreSQL |
| --- | --- | --- | --- | --- | --- |
| PREP1 cache32 arm, worst-case tape at 394 and 620 saves/s, 1,380 one-second cgroup samples (`DX-BM1/bench4/bench4-cache32-aged-r`, `counters.ndjson`) | tx 60 GiB cap, 48 GiB ZGC heap, 32 GiB cache, 8 GiB direct; one-core reader 5 GiB | **53.11 GiB** (48.07 file: the ZGC heap, fully committed; 4.83 anon: everything else); 0 limit events | 4.35 GiB (4.33 anon) of 6 | 3.25 GiB of 5 | 8.00 GiB of 8 (7.83 page cache; 17,445 reclaim events at the cap) |
| `server-32` card, Saturday's tape (`s32-card`); heap from the JVM's own one-second samples, no cgroup memory recorded | as above | heap committed 46.34 GiB (headline) and 44.43 GiB (barrier 6) of 48 | heap 0.6 GiB of 4 | heap 3.0 of 3 | — |
| `server-32` card, production-S (`prodS-card`) | as above | heap committed 46.53 and 45.13 GiB of 48 | heap 0.6 of 4 | heap 3.0 of 3 | — |
| Pinned arm with saves, 3 permits (`pinned-saves-1b-e02`), `memory.current` at each of 10 window ends | `server`, tuned reader 9 GiB | 24,626 MiB (24 GiB ZGC heap committed to 23,490 MiB, so 1,136 MiB beyond it) | 3,164 MiB | **6,697 MiB** (6,144 MiB heap, fully committed) | 8,191 MiB |
| Random arm, 6 permits (`random-1b-d94` p6) | as above | 8,293 MiB | 2,296 MiB | 6,570 MiB | 8,191 MiB |
| Random arm, 12 permits (`random-1b-d94` p12) | as above | 8,254 MiB | 2,349 MiB | 6,590 MiB | 8,191 MiB |
| Tuned ladder, no saves (`pinned-tuned-1b`), JVM samples | as above | — | — | heap 6.0 of 6 | — |

### Caps chosen (`jvm1/launch.mjs`, only when `readTuned` and the 32 GiB transactor are both selected)

| Role | Before (each measured alone) | Now together | Peak against the new cap |
| --- | ---: | ---: | --- |
| Transactor | 60 GiB | **57 GiB** (heap 48, cache 32, direct 8 unchanged) | 53.11 GiB: 3.89 GiB (7%) left |
| Writer | 6 GiB | 6 GiB | 4.35 GiB |
| Reader | 9 GiB | **8 GiB** (heap 6, cache 3, direct 1 unchanged) | 6.70 GiB at window ends; heap + direct cap + the largest non-heap seen (563 MiB) = 7.73 GiB |
| PostgreSQL | 8 GiB | 8 GiB | at its cap by page cache, which serves the random reads |
| Sum + 10 GiB host | 93 GiB | **89 GiB** = the guard exactly | — |

**Why these.** The transactor's 32 GiB cache sets P2 at 1 billion, so its heap stays; its non-heap use was 4.83 GiB at
the hardest load measured, so 57 GiB holds it with 3.89 GiB to spare. The reader's heap was fully committed in every
arm and its non-heap use was 383 to 563 MiB, so 8 GiB holds it. The writer (4.35 GiB of 6) and PostgreSQL (its page
cache) were not cut, and the 10 GiB host reserve stays because the driver's own peak was never measured. The `server`
profile's tuned reader keeps its measured 9 GiB, and `server-32` without the tuned reader keeps its measured 60 GiB.

**Tests:** `jvm1/server32.test.mjs` (5 tests): the combination's containers, flags, cores and caches; caps plus host
equal to the guard; `server-32` with a 3 GiB cache on the one-core reader still refused (93 GiB); the reader arms'
own launch unchanged. `v01/card-reader.test.ts`: both profiles with the setting fit the guard.

**What would show the caps wrong:** on the card, a transactor `memory.peak` of 56 GiB or more, or any limit or
out-of-memory event in `memory.events` for the transactor or the reader. Then the next step is a 128 GB machine
profile, not a smaller transactor heap.

## 3. The random-subject line and its numbers

The card's P1 row now says which case it judges: **re-read subjects** (seat *s* reads subject 7919·*k* mod 100,000 of
account *s* mod 10; each subject returns about ten rounds later, so most reads find it in the reader's cache). A new
row, **P1 random subjects**, judges the random line on its own against the same read bar (p99 ≤ 100 ms, zero wrong
reads): MET or MISSED on a server, PARTIAL on the toy.

Storage loads per subject and the cache share are given two ways, as the 2026-11-23 arms gave them
(`randomLineLoads`): the sampled exchanges' `reads.sql` over subjects per exchange, and the reader's metrics minutes
(StorageGet count and ObjectCache hits over requests, each minute weighted by its seconds inside the line) over the
reads in those seconds. On `ref-random-seed-cut` (3 permits) this gives 1.853 and 2.000 loads per subject and a cache
share of 0.7779, the arm's own figures (the arm's 77.7% was the two minutes unweighted).

## 4. Cell length for the quiet-account gate

`--window-seconds` now takes 90 or 300 as before, or any multiple of 30 from 90 to 600. The quiet account offers 3.5
saves/s in every cell at every load, so each side offers 3.5 × seconds quiet commits whatever the neighbours do.

| Cell length | Quiet commits offered per side, at 50, 235, 394 and 620 alike | P6 gate (500 per side) | P6 + barrier 6 time over 90 s cells |
| ---: | ---: | --- | ---: |
| 90 s | 315 | PARTIAL | — |
| 120 s | 420 | PARTIAL | +8 min |
| **150 s** | **525** | judged (25 spare for missing receipts) | +16 min |
| 300 s | 1,050 | judged | +40 min |

**150 s meets the gate at every load**, provided at most 25 quiet commits per side lack a receipt; any expired quiet
commit fails the gate by its own rule. The production-shaped tape, shape S, builds at 150 s for all four rates with
every offer inside the cell (`v01/card-reader.test.ts`). Quiet reads in cells other than 90 s read from 15 s to 15 s
before the end, as the 300 s cells always did.

## 5. Plan output and time budget

`node lab/bin/scorecard.mjs --plan --age 1B --tape production-S --profile server-32 --reader tuned --read-permits 12`
(full output: `card2-plan-1B-prodS-s32-tuned-p12.txt` beside this file):

> Budget 282 minutes including cleanup, up to USD 5.12 per age. Headline zero/readers use barrier6. Barrier6 repeats P2 and P6 on the identical stack. The P1–P4 pair uses 14 minutes of matched offers. Profile server-32 (transactor 57 GiB cap, 32 GiB object cache; role caps 79 GiB) with read gateway JVM j21-g1, write gateway JVM j21-g1, headline transactor j25-zgc, and WAL on PGDATA. P2 and P6 offered rates 50, 235, 394, 620 rows/s (offered as one commit per subject's save) for 300 seconds per cell. Save tape: the production-shaped tape, shape S (one commit per subject's save, at the same saves as shape R). Credit selection barrier6. Without prepared PGDATA, this command uses logical dumps. Build and AGE1 provisioning are separate. Reader: tuned (cores 5, 6 and 11, 6 GiB heap, 3 GiB read cache, 12 read permits, both pinned read options with the early filter, request trace off for /read; P1 ladder in client batches of up to 8 subjects, then a random-subject line of 256 seats for 60 s at the seed cut; the driver on cores 9 and 10 while offers run).

Against the same command without `--reader tuned` the stages differ only in: transactor 61,440 → 58,368 MiB; writer
cores 2,3,4,5 → 2,3,4 (`ActiveProcessorCount` and `ParallelGCThreads` 4 → 3); reader core 6 → 5,6,11, 5,120 → 8,192
MiB, heap 3,072 → 6,144 MiB, direct 3,072 → 1,024 MiB, cache 1,536 → 3,072 MiB, 1 → 3 processors; client readers
"10,11" → "10". The budget is 282 minutes with the plan's default 300 s cells; **with the server command's settings
below (`--credit-mode rolling6 --window-seconds 150`) it is 242 minutes (USD 4.40)**. The budget is the campaign's
ceiling; the forecast duration is below.

**Default plan byte for byte:** `--plan` with no options, and with `--age 1B --tape production-S --profile server-32`
(with and without `--window-seconds 90 --credit-mode rolling6`, and with `--reader default`), `--age fresh`,
`--age 1B --profile server --window-seconds 90` and `--age realistic --window-seconds 300`, match `9e02cf1d2`'s output
exactly; two refused option sets refuse with the same message (only the stack line differs).

## 6. Server command: the full card with the tuned reader on the 1 billion database

Run as root on a 12-core, 96 GB server (89 GiB `MemTotal` or more), nothing else running, from a clean build of the
commit that publishes this file. Environment exactly as `v01/AGED-SERVER-32.md` (`AGE_HANDOFF_JSON`,
`AGE_HANDOFF_SHA256`, `AGED_PGDATA_SOURCE`, `AGE_JAVA`, `AGE_DATOMIC_HOME`, `SCALE1_IMAGE`, `SCALE1_IMAGE_SHA256`,
`SCALE1_TRANSFER_SHA256`, `SCORECARD_WAL_DIRECTORY`). Each part on its own new scratch copy of the held cluster.

```bash
COMMIT=<the commit that publishes this file>   # exp/DX-CARD2-reader-setting
BUILD=/var/tmp/triplex-v01-card2-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
part() {  # $1 = part number, $2 = new scratch copy of AGED_PGDATA_SOURCE, $3 = campaign directory
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age 1B --tape production-S --profile server-32 --reader tuned --read-permits 12 \
    --credit-mode rolling6 --window-seconds 150 \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
    --pgdata-source "$AGED_PGDATA_SOURCE" --pgdata "$2"
}
# Dry run first (about 10 minutes with its copy): part 1 in its own new campaign on its own copy. It must print
#   DX-DRY-RUN first offer reached: scorecard arm 1 headline/zero
# after the stack start, the reader check (reader-check.json) and the aged fresh-peer check.
DX_DRY_RUN_FIRST_OFFER=1 part 1 "$DRY_COPY" /var/tmp/v01-card2-dry
# Timed run:
OUT=/var/tmp/v01-1b-prodS-s32-tuned   # new
part 1 "$COPY_1" "$OUT"   #  8–10 min after its copy: start and checks 4–6, P1 zero side 7 min (now with the 60 s random step)
part 2 "$COPY_2" "$OUT"   # 35–42 min: P1 ladder and random line, P7, the eight 150 s P2/P6 cells, P8, mixed identities
part 3 "$COPY_3" "$OUT"   # 29–35 min: barrier 6 control, the eight 150 s cells
sudo env "PATH=$BUILD/tools/bin:$PATH" "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$OUT"
```

**Duration: 85 to 105 minutes** from the build to the card (build 5, three copies of 2–3, parts as above, assembly
1–2), against last night's production-S card at 90 s cells, whose parts took 7.3, 25.4 and 20.3 minutes. Ceiling 242
minutes of active time. A part refused before its first offer is set aside; make a new copy and run the same part
again with the same `OUT`.

### Predictions per priority, written before any run

Forecast from the 2026-11-23 measurements at 1 billion: the production-S card (one-core reader, 90 s cells), the tuned
ladder without saves (3 permits), the pinned arm with saves and the random arm (3, 6 and 12 permits). The card's P1 pair
runs the matched reference tape (the quiet account's 3.5 saves/s), so the arm windows to compare are the `ref-` ones.

| Priority | Card line predicted | Basis |
| --- | --- | --- |
| **P1 re-read** (seed cut 87,002, batches of 8, 12 permits) | L1 400–800/s; L64 3,000–5,000/s, p99 50–90 ms; **L256 8,000–11,000/s (central 9,000), p50 20–30 ms, p99 80–120 ms (central 100)**; L1024 1,000–1,800/s, p99 0.9–1.5 s, 0 errors; 0 wrong values; mean batch 7.5–8 at 64 seats and above. **Verdict on re-read subjects: even odds** (met only if p99 ≤ 100 ms). The 1,024-seat stress clause (goodput ≥ 0.9 × L256) missed: the 3 GiB cache thrashes. Whole-tape writer p99 ratio 0.9–1.25 | Tuned ladder, old pin: 3,690/s at 64, 10,598.8/s p99 83.46 ms at 256, 1,213/s at 1,024; `ref-seed-cut` with the quiet stream 8,368.4/s, p99 107.52 ms; production-S card ratio 0.976 |
| **P1 random subjects** (256 seats, 12 permits) | **1,350–1,800/s (central 1,560), p50 140–190 ms, p99 250–340 ms (central 290): MISSED**; loads per subject 1.5–1.9 sampled, 1.6–2.1 by the reader's metrics; cache share 0.77–0.84; handler CPU 10–16 ms per exchange; 0 wrong | `ref-random-seed-cut`: 1,085.5 (3), 1,477.1 (6), 1,563.6/s (12 permits), p99 342.01, 288.77, 292.86 ms; loads 1.54–1.85 |
| **P2** (shape S, rolling 6, 150 s cells) | Every commit durable, 0 expired. S commit p50 / p99: 50/s 12–18 / 45–80 ms; 235/s 9–14 / 35–55; 394/s 9–13 / 38–55; 620/s 10–15 / 40–60. **Not met** (p50 over 10 ms) | Production-S card: 14.91 / 66.56, 11.65 / 43.01, 10.69 / 45.31, 12.10 / 48.64 ms; out of card 300 s at 394: second-half p99 40.6 ms |
| **P3** (feed lag, P1 loaded side) | dispatch-to-observation p99 80–250 ms (central 150): met if under 250 | 288.8 ms with the one-core reader under the ladder; 98.30 ms fresh |
| **P4** | Current pulls p50 3.5–5 ms, p99 25–50 ms: p99 likely not met | 4.35 / 44.54 ms (each pull a different, cold subject) |
| **P5, P9** | NOT RUN | not in the card |
| **P6** (150 s cells) | 525 quiet commits per side, so the gate is judged: **MET at all four loads**, loaded quiet commit p99 12–35 ms; quiet pinned reads p99 5–40 ms with under 1% missed offers (the one-core reader missed about 5,100 per cell at p99 about 3.1 s) | Production-S card: 18.94 → 12.16, 14.34 → 20.74, 13.70 → 17.54, 32.26 → 21.25 ms |
| **P7** | First pull p99 60–100 ms (met); added reader RSS per roster subject higher than 267.8 B (the 6 GiB heap): 300–700 B | 86.0 ms; 53.0 / 375.0 / 267.8 B |
| **P8** | 3,150–3,350 facts/s; save p99 15–30 ms, read p99 4–10 ms | 3,266 facts/s, 19.98 / 6.27 ms |
| Mixed identities | MET | MET |
| Role memory (`role-memory.json`) | Transactor 50–55.5 GiB of 57; writer 3–5 of 6; reader 6.5–7.6 of 8; PostgreSQL 8.0 of 8 (page cache at its cap) | Section 2 |

### What would show the card setting differs from the arms

1. **Re-read:** L256 below 7,000 reads/s, or p99 above 130 ms, or a mean batch below 7 at 256 seats. Then the card's
   ladder (its 64-seat warm-up, its 60 s steps, the 32 GiB transactor beside it, or the driver on two cores) costs the
   reader capacity the arm did not pay; look at the step's exchanges and the reader's GC log.
2. **Random line:** below 1,300 reads/s or p99 above 350 ms, or loads per subject outside 1.4–2.1, or a cache share
   outside 0.75–0.85. Then the card's random line is not the arm's measurement (12 permits: 1,563.6/s, 292.86 ms).
3. **Saves:** shape S commit p99 at 394 above 57 ms (1.25 × the production-S card's 45.31), or any expiry. Then the
   writer's move from four cores to three, or the reader's three cores, cost the saves.
4. **Memory:** a transactor peak of 56 GiB or more, or any limit or out-of-memory event for the transactor or reader.
5. **Exactness:** any wrong value or read error in either P1 line or in the quiet reads.

## 7. Gates (Mac, toy size, timings diagnostic)

| Gate | Result |
| --- | --- |
| Lab unit tests (`v01/*.test.ts`, `rd1/*.test.ts`, `w1/migrated-reads.test.ts`, `ha1/launch-hooks.test.ts`, `jvm1/server32.test.mjs`) | 55 of 55 (50 before, plus `card-reader.test.ts` 4 and the server-32 combination test) |
| Type check of the changed card files | No new error; the six reported errors are the ones `9e02cf1d2` already had (`adopted-card.ts` 2, `adopted-server.ts` 2, `run.ts` 1, `sequential.ts` 1) |
| Default plan output | Byte for byte as `9e02cf1d2` (section 5) |
| Card toy, production-S, `--reader tuned --read-permits 12` | see below |
| Card toy, production-S, default reader | see below |

## 8. What is not verified

- **No server has run any of it.** The card's tuned path on bare metal (the reader check, the driver's core
  placement, `role-memory.json` from `memory.peak`, the random line's reader records from the real `gw-r.jsonl`) has
  run only as Mac toys and unit tests; the dry run of part 1 is its admission check.
- **12 permits for re-read subjects** were never measured (the arms ran re-read windows with 3 permits only).
- **The 57 GiB transactor container** has never run; the 53.11 GiB peak came from a 60 GiB container.
- **150 s cells** have never run on a server; their tapes are checked on the Mac.
- **The reader's 8 GiB container** rests on window-end samples, not a true peak; the card records the peak.
- **The toy reader has no trace,** so the card's loads-per-subject and cache-share fields were exercised on the Mac
  only through the unit test of the arithmetic and RD3's synthetic trace for the parser.
- **The driver's own memory** on the server (inside the 10 GiB host reserve) is not measured.
