# The version 0.1 card on the production-shaped tape

North star P2 and P6, measured on traffic shaped like production. The card's loaded cells can now offer the production-shaped tape (REAL2, [PRODUCTION-TAPE](../real2/PRODUCTION-TAPE.md)) in either commit shape, instead of Saturday's tape, where nearly every save went to a subject not seen before. Everything else in the card is unchanged. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [One branch](../int1/V0.1-STATE.md)

## What the setting changes

| Item | `--tape saturday` (default, earlier cards) | `--tape production-R` | `--tape production-S` |
| --- | --- | --- | --- |
| Neighbour saves in the loaded cells (accounts 1 to 9) | One- or two-field replacements, nearly every save a subject not seen before | REAL2's tape: one commit per form row at the cell's row rate (50, 235, 394, 620 rows/s, quiet saves included) | The same saves and rows as R, one commit per subject's save (about 3, 14, 23 and 36 commits/s) |
| Quiet account (account 0), the solo cells, the P1–P4 pair, P7, P8 | Card's own | Unchanged | Unchanged |
| Subjects | Bands of 1,900 subjects per account | REAL2's bands of 30,000 per account: 235, 394 and 620 use REAL2's bands 0 to 2, so those cells are REAL2's own tapes; 50 shares band 0 with 235 | Same |
| Commits | One replacement each | One or two fields: a replacement, or the first write of a field | 1 to about 130 facts, replacements and first writes; over 256 assertions the general identity, whole |
| Writer | The per-subject ordered writer | Per-subject writer for commits of one to three facts that each replace a value; the general writer for every other commit, both with the ordered identity | Same rule |
| Card header | — | "Save tape: the production-shaped tape, shape R" | "… shape S" |
| Card input (`input.json`) | No `tape` key (earlier inputs stay byte-identical) | `tape`: the name, the parameter file's digest, and every loaded cell's tape and tape-report digests, bound before the first offer | Same |

**Added checks on every production commit:**

- **Predecessors cover every field the tape writes.** Before each loaded cell, every task-0 field of every production subject is read at the cell's first cut. Each seeded field has exactly one current row: the seed's own value at or before the seed cut, AGE1's write between the seed cut and the aged head (checked byte for byte against AGE1's replay tape with PREP1's `agedFieldRow`), or this campaign's earlier cell after it. Any other task field must have been written by an earlier cell of this campaign. Every other slot the tape writes is a first write.
- **Identity and journal.** Each commit's journal row must match its receipt (command, transaction, position, clock, digest). Ordered commits must carry exactly 4 + facts + retired values journal IDs from their block; wide commits and first writes are included. A commit over 256 assertions carries no ordered token and must not reach the per-subject writer. The writer path must follow the rule: a commit of one to three facts that each replace a value goes to the per-subject writer, and every other commit goes to the general writer.
- **Exact read-back.** After each loaded cell, every task field of every production subject is read at the terminal cut. It must equal the last acknowledged (or recovered) write per field: the same row ID, value and position, with no extra field.

**What the card now reports per loaded cell** (table "Production-shaped neighbour saves", beside P2 and P6):

- Offered and stored in window, per commit and per row (and saves).
- Commit p50/p99, whole window and second half.
- Save completion p50/p99: from a save's first row offered to its last row acknowledged.
- Storage reads per commit in the first 60 s and from 150 s. The write gateway reports each commit's SQL reads (`TX2_SUBJECT_PROFILE=1`, through `DX_V01_COMMIT_READS=1`, set only for a production tape).
- The per-writer split: commits/s, p99 and late reads, for the per-subject ordered writer and for the general writer.
- General-identity commits.
- The read-back and predecessor counts.

P2 counts commits. P6 is unchanged.

## Mac toy-size checks (timings diagnostic)

All at `090c189a8`, each under one ordinary heavy token. Evidence: `evidence/DX-THIN1/part17-evidence.tar.gz`, SHA-256 `ba762ea31763a2400d66a9605046160d73aae6c86c1af560b39d3958415bc6be`.

| Check | Result |
| --- | --- |
| **Toy card, shape R** (`DX_V01_TAPE=production-R v01/mac.ts --fixture … per-person-ordered rolling6`: clean checkout, package build, managed image, both the rolling 6 and the barrier 6 arms, about 6 min) | The card names the tape in its header and writes the production table. In the toy's loaded quiet cell, 108 neighbour commits (22 saves of 18 subjects, folded onto the toy's eight subjects per account) and the quiet saves were all durable: 85 on the per-subject writer and 23 on the general writer. Every commit passed the identity, journal and writer-rule checks. The read-back matched 257 fields of 18 subjects. The predecessor check covered 234 seed rows |
| **Toy card, shape S** (same, about 6 min) | The same 22 saves as 22 commits of 1 to 15 facts, all durable (3 per-subject, 19 general), with the same checks. The read-back matched 257 fields |
| **Card production cells on a loader-aged toy** (`v01/production-aged-toy.sh`: 50 subjects per account with every task-0 field, aged by AGE1's own code at its load pin, about 4 min) | Shape R: 540 commits on 23 subjects, all durable. 217 on the per-subject writer, 323 on the general writer. The predecessor check covered 242 seed rows and 69 of AGE1's rows, checked against its replay tape. It refused a tampered AGE1 row and an extra field older than the campaign. The read-back matched 695 fields. Shape S over the rows R left: 37 commits of 1 to 71 facts, all durable (14 per-subject, 23 general); predecessors 103 seed, 8 AGE1 and 584 earlier-cell rows; read-back 695 fields. Two 130-fact commits went out on the general identity, both durable and exact (136 fields read back) |
| Unit tests | `v01/production-card.test.ts` (2): the 394 cells offer exactly REAL2's measured neighbour tape in both shapes, the quiet stream is the card's, R offers rows = rate × seconds, S the same rows in fewer commits; the metrics. `adopted-card`, `sequential`, `server-workload`, `render` and `owner-groups` tests pass |

The first loader-aged attempt stopped on my own check: it required exactly the seeded fields before shape S, but shape R had just written first fields. A field past the seeded ones is now accepted only if this campaign wrote it after the aged head. Toy latencies are not meaningful: the toy folds many tape subjects onto a few, so commits of one subject queue behind each other.

## Commands

Run as root on the machine named, nothing else running, from a clean build of the build commit. The card is the same three sequential parts as `v01/AGED-SERVER-32.md`: 1 headline zero, 2 headline loaded, 3 barrier 6 control, then assemble. Each part runs on its own new scratch copy of the held cluster.

### Build once (about 5 minutes)

```bash
COMMIT=<the commit that publishes this file>
BUILD=/var/tmp/triplex-v01-production-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

### One part

```bash
# Environment as v01/AGED-SERVER-32.md: SCALE1_IMAGE, SCALE1_IMAGE_SHA256, SCALE1_TRANSFER_SHA256, SCORECARD_WAL_DIRECTORY;
# for 1 billion also AGE_HANDOFF_JSON, AGE_HANDOFF_SHA256, AGE_JAVA, AGE_DATOMIC_HOME.
# $1 part, $2 new scratch copy, $3 campaign directory, $4 fresh|1B, $5 production-R|production-S, $6 server|server-32
part() {
  local source aged=()
  if [[ $4 == 1B ]]; then source=$AGED_PGDATA_SOURCE; aged=(--aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256")
  else source=$FRESH_PGDATA_SOURCE; fi
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=${AGE_JAVA:-}" "AGE_DATOMIC_HOME=${AGE_DATOMIC_HOME:-}" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age "$4" --tape "$5" --profile "$6" --credit-mode rolling6 --window-seconds 90 \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    "${aged[@]}" --pgdata-source "$source" --pgdata "$2"
}
card() {  # $1 campaign directory, $2 fresh|1B, $3 tape, $4 profile; makes and removes one scratch copy per part
  for n in 1 2 3; do
    make_copy "$COPY" || return 1          # the same copy procedure as the scorecard parts (owner, modes, internal pg_wal)
    part "$n" "$COPY" "$1" "$2" "$3" "$4" || return 1
    remove_copy "$COPY"
  done
  sudo env "PATH=$BUILD/tools/bin:$PATH" "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$1"
}
```

`make_copy` and `remove_copy` stand for the copy steps the drivers already use for the scorecard parts. A part refused before its first offer is set aside (`Arm N refused before the first offer; its records are in …/set-aside/…`); make a new copy and run the same part again with the same campaign.

### Dry run of every part to its first offer (about 25 minutes per tape and age)

`ha1/first-offer-dry-run.sh` with one line per part, as in `v01/AGED-SERVER-32.md`, each part in its own new campaign directory and on its own copy, with `--tape production-R` or `production-S`. A part prints `DX-DRY-RUN first offer reached: scorecard arm N …` after the stack start, the aged fresh-peer check (1 billion) and the tape binding (about 10 s for shape R, 1 s for S, before the stack starts).

### Timed runs

| Card | Command | Duration |
| --- | --- | --- |
| Fresh, shape R, `server` | `card /var/tmp/v01-fresh-prodR fresh production-R server` | 70–85 min (the fresh card's four parts took 78 min 35 s at 90 s cells; this card has three parts plus three copies of about 2 min) |
| Fresh, shape S, `server` | `card /var/tmp/v01-fresh-prodS fresh production-S server` | 65–80 min (S offers about a sixteenth as many commits) |
| 1 billion, shape R, `server` | `card /var/tmp/v01-1b-prodR 1B production-R server` | 70–90 min (parts 12–16, 30–36 and 20–26 min as the 1 billion card; three copies of about 3 min) |
| 1 billion, shape S, `server` | `card /var/tmp/v01-1b-prodS 1B production-S server` | 65–85 min |
| Either age and shape, `server-32` | Same with `server-32` as the last argument | Same; needs 89 GiB of MemTotal |

Order if time is short: 1 billion R at `server`, then 1 billion S, then fresh R and S (fresh R at 394 has already been measured by REAL2's own runner). The 50 and 235 cells come before 394 and 620 in each part, as in every card.

## Predictions, written before any run

Per-subject rolling 6 credits, 90 s cells. The 394 cells use exactly the neighbour tape REAL2 measured, but for 90 s instead of 300 s, after the card's earlier cells on the same stack. Sources:

- REAL2's fresh R run at 394 rows/s: 393.13/s stored, busy p99 157 ms in the second half and 163 ms whole, save completion p99 237 ms, quiet 22 ms, 0.034 late reads per commit, per-subject writer p99 121 ms, general writer 188 ms. At 235: second-half p99 128 ms.
- The 1 billion card at 16 GiB with Saturday's tape: 249/s at 394.
- The 32 GiB cache arm at 1 billion: 384.5/s at 394, 0.95 late reads per save.

### Fresh, `server` (16 GiB)

| Offered rows/s | Shape R: stored rows/s · expired | R commit p99, whole / second half | R save completion p99 | R late reads per commit | Shape S: stored commits/s | S commit p99 (= save completion) | S late reads per commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 50 | 50 · 0 | 15–60 / 15–50 ms | 30–150 ms | 0.01–0.1 | about 3 | 30–150 ms | 0.1–1.0 |
| 235 | 235 · 0 | 80–250 / 60–200 ms | 120–400 ms | 0.01–0.08 | about 14 | 40–200 ms | 0.2–1.5 |
| 394 | 388–394 · 0–200 | 150–500 / 120–350 ms | 200–700 ms | 0.02–0.1 | about 23 | 50–300 ms | 0.2–1.5 |
| 620 | 520–620 · 0–5,000 | 0.4–6 s / 0.3–4 s | 0.6–8 s | 0.02–0.15 | about 36 | 80–600 ms | 0.3–2.0 |

- **Writer split, shape R, at 394:** 45–55% of commits on the per-subject writer (REAL2: 198 of 390/s), with its p99 below the general writer's. Shape S: 25–40% of commits on the per-subject writer (REAL2's gate: 52 of 88).
- **General-identity commits, shape S:** 0.5–3% of commits. Shape R: none.
- **Quiet account (P6):** loaded commit p99 18–45 ms at 235 and 394 in both shapes; the P6 bar (loaded p99 ≤ 50 ms or ≤ 1.25× alone) met at 50, 235 and 394 for shape S and at 50 and 235 for shape R, likely missed at 620 for R.

### 1 billion, `server` (16 GiB)

| Offered rows/s | Shape R: stored rows/s · expired | R commit p99, whole | R save completion p99 | R late reads per commit | Shape S: stored commits/s | S commit p99 | S late reads per commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 50 | 50 · 0 | 20–120 ms | 40–250 ms | 0.05–0.4 | about 3 | 60–400 ms | 0.5–4 |
| 235 | 230–235 · 0–500 | 0.15–1.5 s | 0.3–2 s | 0.05–0.4 | about 14 | 0.1–1 s | 0.5–4 |
| 394 | 330–394 · 0–6,000 | 0.4–8 s | 0.6–10 s | 0.05–0.5 | 20–23 | 0.2–3 s | 0.5–5 |
| 620 | 300–520 · 5,000–30,000 | 5–30 s | 6–30 s | 0.05–0.6 | 25–36 | 0.5–15 s | 0.5–5 |

- **Why better than Saturday's tape at 1 billion but worse than fresh.** The tape keeps returning to the same subjects, so most commits find their subject's rows in the cache. But the production bands are spread over 30,000 subjects per account, and nearly all of them are seed rows that AGE1 never touched: old, cold index segments behind 28 million saves. A subject's first save in the window reads them.
- **`server-32` at 1 billion:** shape R stores 394 at 394 with second-half p99 under 1 s; 620 stores 450–620.

### What would show these wrong

1. **Production locality does not carry over to 1 billion:** shape R at 394 stores under 300 rows/s at `server`, or its late reads per commit are 0.8 or more. Then a production-like tape still misses the cache at this size, and the cache size and the owner head stay the levers.
2. **The fresh card disagrees with REAL2's runner:** fresh shape R at 394 has a second-half commit p99 above 500 ms, or stores under 385 rows/s. Then the card's earlier cells or its 90 s window change the result, and REAL2's 300 s cells are not the card's baseline.
3. **One wide commit costs more than a chain of narrow ones:** the shape S commit p99 at 394 is above the shape R save-completion p99 in the same age and profile.
4. **The writer rule is wrong:** the card refuses a cell because a commit's writer path differs from the rule (a refusal, not a measurement; it would show the gateway's routing differs from what REAL2 described).
5. **The quiet account is not protected on this tape:** quiet loaded p99 above 50 ms and above 1.25× alone at 235 in either shape.

## What is not proven

- **No full-size card has run with either production tape.** The server path (tape binding before the first offer, the predecessor check at 100,000 subjects per account, the read-back at full size, `DX_V01_COMMIT_READS` on the write gateway) has run only as unit tests and the Mac toys. The first check of the server path is the dry run.
- **On the Mac the write gateway does not report storage reads**, so the toy cards show reads per commit as "—".
- **The 50/s cell shares band 0 with 235,** so the 235 cell meets subjects the 50 cell already edited.
- **The quiet account keeps Saturday's tape,** so P6 measures the card's quiet subject beside production-shaped neighbours, not a production-shaped quiet account.
- **The per-subject rule is the card's check, not a product requirement.** It holds on the toys; a gateway that routed some qualifying commit differently would stop a cell.
- **At 1 billion the 50 and 235 cells meet AGE1's edited subjects rarely:** AGE1 edited 2,000 subjects per account, and the production bands hold 30,000. The AGE1 byte check runs on those it meets.
