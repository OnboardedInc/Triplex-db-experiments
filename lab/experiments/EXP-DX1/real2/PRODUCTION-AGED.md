# The production tape on the one-billion-record database

**North star P2.** At one billion records the 32 GiB cache no longer covers Saturday's tape: 0.95 late storage reads per save at 394 offered, a second-half busy p99 of 7.2 s, and 57,563 expiries at 620 ([reading](https://github.com/OnboardedInc/Triplex-db-experiments/blob/6fce0af28/lab/experiments/EXP-DX1/bm1/AGED-CACHE-READING.md)). Saturday's tape sends nearly every save to a person not seen before. This run asks whether the cache covers production-shaped traffic at one billion, which decides between more memory and the writer change (the covering owner head). [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [The tape](PRODUCTION-TAPE.md)

## Command and duration

```bash
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-REAL2-production-aged -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh production-aged "$REAL2_AGED_OUT" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$AGED_PGDATA_SOURCE" --wal-mount "$SCALE1_WAL_MOUNT" \
  --aged-bundle "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256"
```

- Check out the latest commit whose subject starts "Publish the production tape on the one-billion cut" on `exp/DX-REAL2-production-tape`. The arguments and environment are those of PREP1's repaired `cache32-aged` run (`1bbaf54cd`, `prep1/AGED-CACHE.md`): the stopped, held one-billion PostgreSQL 17 directory as `$AGED_PGDATA_SOURCE` (never a scratch copy; the database keeps its original name), AGE1's handoff pair, the second NVMe as `$SCALE1_WAL_MOUNT`, at least 89 GiB `MemTotal`, about 210 GB free on the Docker volume filesystem, no containers running.
- **Cap 3,560 s for the whole command.** Arms in order, each a 300 s solo cell then a 300 s loaded cell at 394, each on its own copy of the 176 GB cluster:
  1. `1-prodR-394-cache32-S`: shape R, 32 GiB profile (Saturday's three-core cache32: 48 GiB heap, 60 GiB container). Limit 1,380 s.
  2. `1-prodS-394-cache32-S`: shape S (23.1 commits/s), 32 GiB profile. Limit 1,380 s.
  3. `1-prodR-394-S`: shape R, 16 GiB profile (24 GiB heap, 30 GiB container). Runs only if at least 1,230 s of the hour remain when arm 2 ends; otherwise `1-prodR-394-S.skipped.json` records the seconds left.
- **Expected:** about 19 minutes per arm (the copy and start of the 176 GB cluster took about 9 minutes inside Saturday's aged cache32 arm, plus 10 minutes of cells and the drain), so arms 1 and 2 end near 39 minutes and arm 3 most likely does not fit; about 40 minutes with two arms, up to 59 with three.
- **Admission.** As `cache32-aged`: the handoff digest and content, the column-by-column proof that the newest transaction is AGE1's last save, the loader claim at 87,002 and the 40 membership rows, and every seeded field (all 13 or 14 of each person's first task, not only fields 0 and 1) checked against the seed formula or, for rows AGE1 replaced, against AGE1's replay tape row by row. A refusal costs one copy.
- **After the windows** the collector and the checkpoint reader take the aged head (seed cut plus AGE1's saves, 28,309,866 on the sealed cut) instead of asserting the fresh 87,002.

The tapes are the fresh run's 394 tapes byte for byte (`R-r394-*`, `S-r394-*`): the same people, saves and facts, and Saturday's quiet stream. Only the database differs.

## Which writer takes the commits (found by the aged gate)

The gateway's per-person writer (the subject save with ordered IDs, which all of Saturday's saves used) accepts a commit only if it writes one to three facts and each replaces a current value. Every other commit takes the general writer: still exact, durable and in the journal with its submitted identity, but not the per-person path. On these tapes that is about half of shape R's rows (the rows past a person's 13 or 14 seeded fields, and every second field, on their first write; 49% of R commits at 394, 45% from 150 s) and about two thirds of shape S's commits (any save of more than three facts; 68% at 394). The aged gate saw the same split (R 384 of 840, S 52 of 88 on the per-person writer). Each loaded cell's summary now reports `writerPath` (commits per writer) and `sqlReadsPerCommit.from150sSubjectPath` and `from150sGeneralPath`, so reads and latency can be read per writer. Two consequences: shape S as built measures today's general writer for most saves, so a per-person writer for wide saves is part of what S would need; and the covering owner head (a per-person-writer change) would reach only the per-person share of these commits.

## Predictions, written before the run

Reads are PostgreSQL segment reads per commit (shape R: per form row; shape S: per form save). Central value, then range.

| Arm at 394 | Stored/s | Reads/commit, first 60 s | Reads/commit, from 150 s | Whole busy p99 | Second-half busy p99 | Save completion p99 | Quiet loaded p99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R, 32 GiB | 390.5, no expiries (385–390.5) | 0.12 (0.05–0.6) | 0.05 (0.01–0.3) | 800 ms (450–3,000) | 650 ms (400–2,000) | 650 ms (400–2,000) | 50 ms (35–90) |
| S, 32 GiB | 23.1, no expiries | 1.3 (0.6–8) | 0.5 (0.1–3) | 80 ms (30–400) | 50 ms (25–200) | 50 ms (25–200) | 40 ms (25–70) |
| R, 16 GiB (if run) | 390.5 (330–390.5) | 0.12 (0.05–0.6) | 0.1 (0.02–0.6) | 1,000 ms (500–5,000) | 800 ms (400–3,000) | 800 ms (400–3,000) | 55 ms (35–100) |

Quiet solo p99 about 30 ms (20–45), as at one billion with Saturday's tape (29.2 ms). Shape S, apply per commit late: about 0.5 ms + 0.06 ms per fact (Saturday's tape at one billion: 1.30 ms per 1.2-fact save outside index jobs).

**Reasoning.**

- **Reads per new person.** With Saturday's tape at one billion, the first 60 s read 1.95 segments per save while 0.73 of saves went to a new person: about 2.7 reads per new person, against about 2 at 430 million. The production tape at 394 has 0.037 new people per R commit in its first 30 s and 0.49 per S commit in its first minute, so about 0.1 and 1.3 reads per commit, plus a cold PostgreSQL page cache after the copy.
- **Late reads.** Saturday's tape keeps about 19,000 neighbour people in play and every save misses (0.95 per save) at 32 GiB. The production tape keeps 1,845 in five minutes, a tenth. If the misses come from how many people are in play, 32 GiB holds them and late reads fall to first touches (0.011 new people per R commit, 0.2 per S commit) plus re-reads after index jobs. 16 GiB holds half as much and should still hold 1,845 people.
- **Latency.** Shape R keeps its serial-row floor (a large save's last row waits for the rows ahead of it): p99 several hundred ms with no reads at all, a little higher than fresh because apply costs about 1 ms more at one billion. Shape S stays near one commit's time.

## What each result would mean

- **Memory alone carries production-shaped traffic at one billion** if the 32 GiB R arm stores 390.5/s with no expiries, reads at most 0.1 per commit from 150 s (at most about 1.7 per form save), and keeps second-half busy and save-completion p99 under 1 s, and the S arm reads at most 1 per commit from 150 s with second-half p99 under 150 ms. If the 16 GiB R arm also stays under 0.2 reads per commit and 1 s, even the 16 GiB profile carries it, and the one-billion cache problem is a property of Saturday's tape, not of the database.
- **The writer change is needed regardless** if the 32 GiB R arm still reads 0.3 or more per commit from 150 s (about 5 per form save, Saturday's level per save), or the S arm 3 or more per commit, while the transactor cgroup has room (Saturday's tape left about 7 GiB). Then a person's save costs storage reads even when only about 2,000 people are active: the cost comes from each aged owner's history, which the covering owner head cuts, and not from how many people are in play, which memory would cover.
- **In between** (0.1 to 0.3 per R commit late): 32 GiB carries it without margin; the owner head buys the margin.
- **Read by writer.** Judge the owner head on `from150sSubjectPath`, the reads of the commits it would change. If high reads sit mainly on the general writer, the owner head alone does not fix them.

**Falsifiers of the model itself.** R first-60 s reads above 0.6 per commit, or S above 8: cold cost scales with the fields a save touches. R second-half p99 under 300 ms: the serial-row floor is lower than modelled. Any lost save, acknowledged row missing from the journal, or expiry at 32 GiB: the run does not count until explained.

## Gates on the Mac (correctness only; times diagnostic)

- **Aged live gate** (`real2/aged-gate.sh`, one ordinary heavy token, PREP1's `prep1/aged-live/container.sh`): a SCALE1-shaped toy with every first-task field of each person is seeded through this branch's gateway; AGE1's own adoption and save code at its load pin `5cda4ab20` ages it in its own JVM; a fresh stack from this branch reopens it. Then the arm's aged admission reads all seeded fields of every person on the tape, accepts AGE1's rows by the aged arm's rule and refuses a tampered AGE1 row; the producer's own `phase()` runs a shape R and a shape S cell whose people include AGE1's edited people; and every touched field reads back equal to the admitted predecessor or the last acknowledged write. **Passed** at `da9b332e5` (the Publish commit adds only documents; diagnostic times): AGE1 replayed 300 saves over the seed cut 61 (head 361); the admission read 69 people's seeded fields and accepted 120 AGE1 rows and refused a tampered one; R: 840 of 840 commits acknowledged, 384 on the per-person writer and all of those ordered; S: 88 of 88, 52 on the per-person writer, up to 82 facts per commit; 101 writes replaced an AGE1 row; all 1,927 fields read back exact at cut 1,289.
- **Guard harness** (`ha1/guard-check.sh`): all three aged arms, and the fresh arms, reach `stack/up.sh`'s first Docker call with the rolling path's exports and launch profiles.
- **Fixtures:** the producer's mock preflight and the collector's fixture mode accept all three aged arms; the shape gate still passes and every existing campaign's plan is byte-identical.
- **Not exercised on the Mac:** `server.sh` itself (Linux only), the copy of the 176 GB cluster, the live-head proof against the real AGE1 journal (proven on the server by PREP1's repaired run, which this mode shares), and the read of real aged predecessors at full size.

Evidence (private): `evidence/DX-REAL2/aged-gates-2026-11-23.tar.gz`, SHA-256 `c3712469…b3f8`: the three aged live gate runs (the first stopped at the ordered-writer assertion that found the writer split, the second reported it, the third passed), the guard harness log and the aged arms' fixtures.
