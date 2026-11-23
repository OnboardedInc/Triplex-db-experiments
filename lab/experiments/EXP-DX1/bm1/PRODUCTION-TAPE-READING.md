# Production-shaped save tape on bench 4, November 23

## One billion records, REAL2 `32ca969bb` (`production-aged`): memory carries production-shaped traffic

**At one billion records, 32 GiB stored 393 form rows/s at 394 offered. Late reads were 0.054 per commit, second-half p99 430 ms and save completion 342 ms. One commit per save ran at 23 commits/s with a 41 ms second-half p99.** The earlier reading's rule ("memory carries it if R 32 GiB stores 390.5 with ≤ 0.1 reads/commit from 150 s and second-half p99 under 1 s, and S ≤ 1 read/commit with p99 under 150 ms") **is met on every term.** Even the 16 GiB R arm met the R terms. All three arms ran, from 21:24:23 to 22:16:23 UTC, each on its own copy of the verified held cluster. The stack-level dry run was ADMITTED, and the aged live-head and predecessor checks passed before the first offer. There were 0 expiries and 0 missing ACKs anywhere, and no autovacuum ran (0 of 206 samples).

| At 394, per commit | R 32 GiB forecast | R 32 GiB | S 32 GiB forecast | S 32 GiB | R 16 GiB forecast | R 16 GiB |
| --- | --- | ---: | --- | ---: | --- | ---: |
| Stored/s (incl. 3.5/s quiet) | 390.5 (385–390.5) | 393.12 | 23.1 commits/s | 26.56 (23.06 busy) | 390.5 (330–390.5) | 393.07 |
| Reads/commit, first 60 s | 0.10 (0.05–0.4) | 0.111 | 1.5 (0.6–8) | 1.53 | 0.10 (0.05–0.4) | 0.111 |
| Reads/commit, from 150 s | 0.05 (0.02–0.25) | **0.054** | 0.8 (0.2–3) | **0.70** | 0.08 (0.02–0.4) | 0.055 |
| … per-person writer / general writer | | 0.078 / 0.024 | | 0.65 / 0.73 | | 0.079 / 0.024 |
| Whole busy p99 | 300 ms (180–2,000) | 295 ms | 80 ms (30–400) | 39.5 ms | 350 ms (200–3,000) | 502 ms |
| Second-half busy p99 | 250 ms (160–1,500) | 430 ms | 50 ms (25–200) | 40.6 ms | 300 ms (170–2,000) | 713 ms |
| Save completion p99 (second half) | 350 ms (240–2,000) | 312 (342) ms | 50 ms (25–200) | 40 (42) ms | 400 ms (250–2,500) | 453 (597) ms |
| Quiet loaded / solo p99 | 30 ms (20–70) / 30 | 22.9 / 28.9 ms | 30 ms (20–60) / 30 | 25.1 / 28.0 ms | 30 ms (20–80) / 30 | 19.8 / 29.6 ms |
| Commits by writer, per-person / general | | 59,425 / 57,725 | | 2,245 / 4,683 | | 59,425 / 57,725 |
| General-identity commits (over 256 assertions) | | 0 | about 1.2% | 85 of 6,928 (1.2%) | | 0 |

- **Falsifiers.** None of the model's falsifiers fired. R first-minute reads were 0.11 (limit 0.6), and S first-minute reads 1.53 (limit 8). R's second-half p99 was 430 ms, above the 300 ms floor line. There was no loss or expiry.
- **The writer-change rule did not trigger.** R reads 0.054 per commit (threshold 0.3), and S reads 0.70 (threshold 3).
- **Where the S reads sit.** S's late reads are split evenly between the per-person path (0.65) and the general path (0.73). Two thirds of S commits take the general writer, so judging the owner head on the per-person path alone would miss most of S's reads.
- **S apply cost.** Warm apply per commit rises with size, from 0.59 ms at 1.4 facts to 2.74 ms at 18.7 facts: about 0.12 ms per fact, under the 0.15 ms falsifier.
- **Comparison with Saturday's tape on the same cut.** This morning's `cache32-aged` arm read 0.95 per save late and had a 7.2 s second-half p99 at 394. The production tape at the same cache and cut reads 0.054 per commit (about 0.9 per form save of 17 rows) with a 430 ms p99. The difference is the tape's locality, not the store.
- **WAL.** About 1.2 GB per R arm and 0.3 GB for S, over roughly 11 minutes each.

Evidence: `evidence/DX-BM1/bench4/bench4-production-aged2/` on the Mac (all three arms, `tape-report.json`, `postgres.log`, `pg-sampler.log`).

## Repaired launch at REAL2 `832a7e0c6`: R measured, S stopped at its first loaded commit

**With production locality, one commit per form row stored 393 rows/s at 394 offered, with a 163 ms whole-window p99 and a 238 ms save-completion p99.** Saturday's tape at the same rate and cache took seconds. The run began at 19:40:17 UTC and stopped at 20:16:39 UTC. Its stack-level dry run was ADMITTED, and every check before the first offer passed: `up.sh`, `tail-pg.sh` settings, the counter observer, write options, the read of every person's seeded fields (`seed-readback.json`) and the counters-ready handshake. Arm `1-prodR-S` completed all four cells with 0 expiries and 0 missing ACKs.

| `1-prodR-S` (16 GiB, rolling 6), per commit | Forecast 235 | Measured 235 | Forecast 394 | Measured 394 |
| --- | --- | ---: | --- | ---: |
| Stored/s | 231.5, no expiries | 233.76, 0 expired | 390.5, no expiries | 393.13, 0 expired |
| Whole busy p99 | 500 ms (300–1,500) | **213 ms** | 700 ms (400–3,000) | **163 ms** |
| Second-half busy p99 | 450 (300–900) | **128 ms** | 600 (350–2,000) | **157 ms** |
| Save completion p99 (whole / second half) | 450 (300–1,000) | 245 / 204 ms | 600 (350–2,000) | 237 / 239 ms |
| Quiet loaded p99 | 38 ms (25–55) | 15.9 ms | 45 ms (30–70) | 22.1 ms |
| Reads/commit first 60 s / from 150 s | 0.08 (0.03–0.4) / 0.03 (0–0.15) | 0.113 / 0.036 | 0.08 (0.03–0.4) / 0.05 (0.005–0.3) | 0.066 / 0.034 |
| Warm mean apply, 1–2-fact commits | | 0.27 ms | | 0.30 ms |

Quiet solo p99 was 29.7 ms (235) and 12.0 ms (394). A form save averaged 17 rows.

**Falsifier 1 fired:** the R 235 second-half busy p99 was under 150 ms (128 ms). The rows of one save do not wait on each other as long as the model's serial chain assumes. The R latency floor is lower than forecast, and the 394 cell (157 ms) sits just above the line. Falsifiers 2, 3 and 5 did not fire: late reads were 0.034 per commit, first-minute reads 0.066 per commit, and quiet p99 22 ms. **So Saturday's seconds-long tails at 394 with 16 GiB came from that tape's locality (almost every save to a new person), not from the store.**

**By writer path (raw rows split by `subjectSave`), busy accounts:**

| Cell | Path | Commits (per s) | p99 whole / second half | SQL reads per commit, first 60 s / from 150 s |
| --- | --- | ---: | ---: | ---: |
| 235 | per-person ordered writer | 35,576 (118.6) | 137.7 / 101.7 ms | 0.173 / 0.041 |
| 235 | general writer | 33,874 (112.9) | 249.0 / 183.8 ms | 0.077 / 0.024 |
| 394 | per-person ordered writer | 59,425 (198.1) | 121.1 / 127.1 ms | 0.118 / 0.047 |
| 394 | general writer | 57,725 (192.4) | 188.2 / 170.1 ms | 0.029 / 0.015 |

About half of R's commits take the general writer, as the builder found. Those commits carry the higher tail, while the ordered-writer commits carry most of the storage reads.

**Autovacuum ran through the measured windows.** On this never-vacuumed copy an autovacuum worker scanned `datomic_kvs` (relation 16389) in 127 of 131 samples, from 19:44 to 20:06 UTC. It reached 5.08 of 14.98 million heap blocks, and WAL grew 1,318 MB in that time (about 1.0 MB/s). Every R cell above was measured beside that vacuum. The S arm's copy started a new vacuum (33 of 37 samples). This stack does not set `wal_log_hints`, so the vacuum's WAL rate is far below the failover pair's 29 MB/s.

## Arm `1-prodS-394-S`: stopped at its first loaded commit

The S arm's solo cell (`S-r394-alone.json`) completed. The first commit of its loaded cell then threw at `packages/datomic/src/orderedSaveIdentity.ts` line 47: `RangeError: Ordered save assertion ordinal must be between 0 and 255`. The call came from `lab/experiments/EXP-DX1/w1/group/workload.ts` line 86 (`assertionId`, from `journal` at line 117 and `command` at line 152), via `prep1/server-produce.ts` line 351 (`grant`). A one-commit-per-save shape builds commits with more than 256 assertions, and the ordered save identity cannot number them. **The REAL2 builder must fix this:** either split wide saves or widen the ordinal. No S figures exist. The arm's stack and both of the run's anonymous volumes were removed.

Evidence: `evidence/DX-BM1/bench4/bench4-production-r/` on the Mac (summary and raw archives, with `tape-report.json`, `postgres.log`, `pg-sampler.log` and the R cells' raw rows).

## First launch at REAL2 `173f9d463`: refused before the first offer, at the stack's slot allowlist

**No offer was made.** `prep1/server.sh production` started at 19:17:10 UTC. The build passed (Java 21 and 25 images, unchanged IDs) and the seed adoption passed (`seed.json`, `plan.json`, `SEAL.sha256`). The first arm, `1-prodR-S`, then stopped at 19:18:08 UTC when its stack refused the slot name. The run's own `start.log` was empty because the check is a silent bash test. A stack-level dry run under `SHELLOPTS=xtrace` found the line:

`lab/experiments/EXP-DX1/stack/up.sh` line 258 at `173f9d463` allows only `^tx2-dxprep1-[a-f0-9]{8}-1-(ceiling|scale-(base|cache|wal-zgc)|barrier6|rolling(6|8|12|16)|rolling6(-tx5)?(-cache32)?|fresh(-zgc)?(6|12))-s$` for a prepared PostgreSQL copy. `tx2-dxprep1-…-1-prodr-s` is not in that list. `server.sh` (lines 447 and 113) already accepts `prod(R|S|S-394)(-cache32)?`.

**The REAL2 builder must add `prod(r|s|s-394)(-cache32)?` to that allowlist.** No container, copy or WAL directory remains; the arm's empty WAL directory was removed by its own cleanup. The read of each person's seeded fields, which the document flagged as never run on a server, was not reached.

The predictions stay as written in [PREDICTIONS.md](PREDICTIONS.md) for the repaired launch.
