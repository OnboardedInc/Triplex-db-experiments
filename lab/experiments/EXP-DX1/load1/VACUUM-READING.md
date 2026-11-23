# Saturday's fresh full-size runs and the never-vacuumed seed

**Autovacuum was running through every measured Saturday save run on bench 3, but there it cost almost nothing, and it explains none of the tails.** The 29 MB/s of WAL found in the failover pair comes from `wal_log_hints=on`. Only the failover pair (`hasync1/pair.ts`) sets it. Bench 3 ran with `wal_log_hints` off, and the seed has no page checksums. So the same vacuum pass wrote about 0.27 MB/s of WAL there, not 29 MB/s. PostgreSQL's single core never passed 68% busy in any loaded cell, and the commit stage (the log append to durable storage) stayed at a p99 of 1.6 to 3.3 ms. I read every run's per-second PostgreSQL counters (`counters.ndjson`: `pg_stat_wal`, `pg_stat_io` by backend type, the PostgreSQL cgroup's CPU), the checkpoint lines in `postgres.log`, the seed's `pg_controldata`, and the native trace of each Datomic log append. The readers are [`vacuum_reading.py`](vacuum_reading.py) and [`vacuum_lsn.py`](vacuum_lsn.py). The full output is kept privately at `evidence/DX-LOAD2/vacuum/`.

## 1. Was autovacuum running, with which settings, and how much WAL?

**Settings.** All Saturday stacks on bench 3 used the same seed: system identifier 7710454239949164583, cleanly shut down at 04:13:45 UTC on November 21, with NextXID 754. The removal stage's `pg-before.txt` records its control data: `Data page checksum version: 0` and `wal_log_hints setting: off`. None of the stacks sets `wal_log_hints` (`pg-settings.json` of every PREP1 arm, the held-copy launch profile of the fair import), so it stayed off. Nor do they set `autovacuum`, so it stayed on with the defaults. The other settings were `full_page_writes=on`, `synchronous_commit=on`, `fsync=on`, `shared_buffers=2GB`, `max_wal_size=1GB`, `checkpoint_timeout=5min`, PostgreSQL on one core, and WAL on its own NVMe.

**Autovacuum was running, but `pg_stat_io` and `pg_stat_wal` cannot show it.** An autovacuum worker reports its I/O and WAL statistics only when it finishes a table. A pass over the 126 GB table therefore stays invisible until it ends. The WAL position cannot hide it. In 64 checkpoint intervals across 13 arms, the redo LSN advanced faster than `pg_stat_wal` reported, by **0.18 to 0.36 MB/s (median 0.27)**. The gap is the same in the quiet-only cells (3.5 saves/s) and in the 620/s cells, so it does not come from the saves. That is the WAL of a cost-limited vacuum pass writing small visibility records and no full-page images. At roughly 70 bytes per heap page it is about 4,000 pages/s, or about 32 MB/s of heap scanned. That matches the 29 MB/s pace in the failover pair, where every page also became an 8 KB full-page image. At that pace the pass takes about 65 minutes. Each PREP1 arm ran about 35 minutes from PostgreSQL's start on a fresh copy, so the pass was still running in every measured window. The visible autovacuum activity was small: about 82,000 pages read in the first 30 s after start, and one burst of about 22,000 pages in a single second in some 620/s cells. Both are other tables finishing.

| Cells (all PREP1 runs: rolling 6 ×3, rolling 8, rolling 12, barrier 6, five cores, cache32 ×3 at 3 and 5 cores) | WAL reported, MB/s | Datomic's own log appends, MB/s | Vacuum WAL not yet reported, MB/s | PostgreSQL cores, mean / highest second | Commit stage (log append) p50 / p99 ms |
| --- | ---: | ---: | ---: | ---: | --- |
| Quiet account alone (3.5/s) | 0.01 | 0.01 | about 0.27 | 0.05 / 0.18 | 0.35–0.50 / 0.66–3.2 |
| 235/s loaded | 1.36–1.38 | 0.93 | about 0.27 | 0.20–0.21 / 0.51 | 0.34–0.37 / 1.6–1.8 |
| 394/s, 16 GiB, three cores | 3.39–3.41 | 1.54–1.55 | about 0.27 | 0.35–0.36 / 0.64 | 0.40–0.43 / 2.98–3.10 |
| 394/s, 16 GiB, five cores; 32 GiB arms | 2.58–2.61 | 1.55 | about 0.27 | 0.27–0.29 / 0.66 | 0.35–0.39 / 1.56–2.43 |
| 620/s, 16 GiB | 4.07–4.51 | 1.72–1.91 | about 0.27 | 0.40–0.42 / 0.64 | 0.41–0.44 / 2.38–3.17 |
| 620/s, 32 GiB | 5.33–5.40 | 2.42–2.43 | about 0.27 | 0.41–0.42 / 0.68 | 0.37–0.44 / 2.24–3.27 |

**Who wrote the WAL.** The saves' own log appends are 40 to 57% of all WAL, including the hidden vacuum WAL, in loaded cells. Datomic's index jobs write most of the rest as new index segments, plus WAL record overhead. The vacuum's 0.27 MB/s is 5 to 16% of the WAL in loaded cells, and nearly all of it in quiet-only cells. Full-page images ran at 0.5 to 3.5 per second (4 to 28 KB/s) in loaded cells.

**Fair import, removal stage, reads ladder.** These ran on the same seed with the same settings. Their stack records no PostgreSQL counters (the PostgreSQL console log is empty and there are no `pg_stat` samples), so for them the vacuum is inferred, not observed, and their WAL rate is unknown. Their commit stage, by minute from the native trace, was p50 0.35 to 0.72 ms and p99 0.8 to 4.5 ms throughout: fair import 32 minutes, removal 7, reads ladder 7. The first minutes were no worse than later ones (`held-stack-log-append-by-minute.txt`).

## 2. Does it explain any of the tails?

**No.** The same attribution as for index jobs and allocation stalls, over every loaded cell:

| Test | Result |
| --- | --- |
| Slowest 1% of busy saves during which PostgreSQL's core was 90% busy or more | **0%** in all 32 loaded cells, in each of three windows (first minute, whole, second half). PostgreSQL never reached 0.9 cores in any second of any run; the highest second was 0.68. |
| The slowest saves' own commit stage | mean 0.35–1.06 ms, at most 41.7 ms, inside latencies of 0.25 to 30 s. Under 0.1% of their time. |
| Commit stage around checkpoints | Checkpoints run spread over 270 s (`checkpoint_completion_target=0.9`), so a save is almost always inside one; the commit-stage p99 stays at 1.6–3.3 ms; the worst single append in any loaded cell was 8.7–41.7 ms. |
| Vacuum overlap | The pass ran evenly through every window (0.18–0.36 MB/s in every checkpoint interval). Tails differ by a factor of 100 between first minutes and second halves, and between 16 and 32 GiB, while the vacuum does not change. A constant cannot explain them. |
| The first cold minute | WAL is lower in the first minute (0.74 against 1.53 MB/s at 235; 3.0 against 3.5 at 394), and full-page images stay at a few per second. The hint bits that reads set on the never-vacuumed table are not WAL-logged here. They dirty pages, which the checkpointer writes later. The commit-stage p99 in the first minute (1.1–2.9 ms) is no worse than later (1.6–3.4 ms). |

The first minute's backlog is the cold object cache. PostgreSQL served 2,160 to 3,590 page reads per second in the first minute against 95 to 930 later. Its own time per disk read was 0.078 to 0.11 ms, against 0.045 to 0.13 later. The serial writer, meanwhile, spent 81 to 96% of the minute applying ([HEAP-READING.md](HEAP-READING.md), section 4).

## 3. Does the "0.35 ms per SQL read" include time added by the vacuum?

**At most a small part, and only in the first minute.** Datomic's own clock per SQL read (`sql-ms ÷ sql`) was 0.21 to 0.35 ms in first minutes and 0.17 to 0.29 ms in second halves. PostgreSQL's own time per disk read (`pg_stat_io` read_time ÷ reads) was 0.05 to 0.13 ms in every window. Most of a SQL read is the round trip and decoding, not the disk. The vacuum reads and writes the data NVMe at about 32 MB/s and could add queueing to the disk part. Even if all of PostgreSQL's disk time were vacuum contention, which it is not, that would be at most 0.1 ms of the 0.21 to 0.35 ms. The cold object cache sets the count of reads per save (1.0 to 1.6 in the first minute); the vacuum does not.

## 4. What the test set-up should do, and what would move

**Freeze the seed once before sealing it.** Run `VACUUM (FREEZE, ANALYZE)` and a checkpoint before the clean stop. A database in service has already had its first pass, and every fresh run should start from that state and not depend on a background pass that ends mid-run. A real bulk import does hit this pass, so model it separately: one bulk-import scenario with autovacuum on and the import's own freeze, measured as a different case. Leave `autovacuum` on in the runs themselves, because a 30-minute case adds far fewer rows than its insert threshold, as the failover repair notes.

**Expected movement on a frozen seed:**

| Published number | Expected change | Why |
| --- | --- | --- |
| Bench 3 save runs at 235, 394 and 620/s (fresh; rolling 6, 8, 12, barrier 6, five cores, cache32) | Within run-to-run noise. Steady second-half p99, stored/s and quiet p99 unchanged. First-minute p99 0 to 10% lower at most. Reads per save unchanged. Total WAL about 0.27 MB/s lower. | Without `wal_log_hints`, the pass cost about 0.27 MB/s of WAL, at most 0.05 of a core and 32 MB/s on the data disk. No tail coincides with it. |
| Fair import, removal stage, reads ladder | Same: within noise. | Same seed and settings; the commit stage looked the same as the PREP1 runs. |
| Failover pair (`wal_log_hints=on`) | Large: standby catch-up and the first protected save. | Already fixed there (`autovacuum=off`, attach before the transactor starts). |
| Any future fresh run with a standby or `wal_log_hints` | Large if the seed is not frozen: about 29 MB/s of WAL for about an hour. | Every page becomes a full-page image, and a synchronous standby must apply it. |

### One short run that settles it (a preparation step only; no code change)

**Rolling 6 on a frozen copy of the same template, compared with Saturday's three rolling 6 runs.** The PREP1 rolling mode takes any cleanly stopped PostgreSQL directory as `--pg-data`. It verifies the seed by reading Datomic facts back (`seed-readback.json`) and records, but does not pin, the copy's control-file hash. Freezing changes no facts.

1. **Preparation, about 30 to 50 minutes on the server.** It needs 126 GB on the data disk plus about 20 GB for WAL. Copy the template, freeze it, stop it cleanly:

```sh
root=/var/tmp/triplex-bm1/bench3            # or the evening machine's equivalent
cp -a "$root/verified-seed/cluster" "$root/frozen-seed/cluster"
docker run --rm --name frozen-seed --cpus 4 --network none \
  -v "$root/frozen-seed/cluster:/var/lib/postgresql/data" postgres:17-alpine \
  -c autovacuum=off -c maintenance_work_mem=2GB -c max_wal_size=16GB -c fsync=on &
until docker exec frozen-seed pg_isready -U postgres -q; do sleep 2; done
docker exec frozen-seed psql -U postgres -d datomic -Xc 'VACUUM (FREEZE, ANALYZE, VERBOSE);'
docker exec frozen-seed psql -U postgres -d datomic -XAtc "select relname, n_dead_tup, last_vacuum, age(relfrozenxid) from pg_stat_user_tables join pg_class on relid=oid"
docker exec frozen-seed psql -U postgres -Xc 'CHECKPOINT;'
docker stop -t 120 frozen-seed
```

Use the same image the template was built with, and keep the directory owned by the PostgreSQL user. Check that `pg_controldata` reports `shut down`.

2. **The run.** This is Saturday's rolling 6 command with only the data directory changed. It runs the 235, 394 and 620 cells, about 35 minutes:

```sh
cd "$root/rolling-build/repository"   # clean checkout at c8f903ce1, as bench3-rolling.sh
DX_PREP1_ROLLING_ARM=rolling6 node lab/bin/heavy.mjs --label DX-PREP1-rolling-frozen -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh rolling "$root/rolling-frozen" c8f903ce1142772751328b88d972cc527ca46dfc \
    "$root/seed-metadata/arm-d7-wfix-pool-seed" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    --pg-data "$root/frozen-seed/cluster" --wal-mount /mnt/triplex-bench3-wal
```

**Predictions, written before any run.** Saturday's three rolling 6 runs are given in brackets.

| Measure | Frozen copy, forecast |
| --- | --- |
| WAL not reported by `pg_stat_wal`, MB/s per checkpoint interval | under 0.03 (0.18–0.36) |
| 394/s: stored/s, second-half busy p99 | 394; 2,400–5,800 ms (2,824 / 4,618 / 5,067) |
| 394/s first minute: busy p99, SQL reads per save | 5,500–8,500 ms (6,354 / 7,355 / 8,116); 1.5–1.65 (1.54–1.61) |
| 620/s: stored/s, expired | 430–460; 35,000–43,000 (439.6–454; 36,164–41,979) |
| 235/s: second-half p99, quiet p99 | 30–42 ms (31.8 / 32.1 / 41.0); 40–55 ms |
| Commit-stage p99, loaded cells | 1.5–3.3 ms (1.6–3.3) |
| Datomic ms per SQL read, first minute | 0.27–0.33 (0.30–0.32) |

**What would show this wrong.**

1. Second-half busy p99 at 394 under 1,500 ms.
2. Stored/s at 620 above 500.
3. First-minute busy p99 at 394 under 4,000 ms.

Any of these would mean the running vacuum did slow the bench-3 save runs. Then every fresh full-size result from Saturday is biased against the system, and the frozen seed becomes the baseline for all of them. If the hidden WAL stays near 0.27 MB/s, the freeze did not take, and the run says nothing.

## What the evidence cannot establish

1. **The vacuum is inferred, not observed, for every run.** The worker reports only at the end of the table, and no run lasted that long. The inference is steady WAL that `pg_stat_wal` does not show, equal in quiet-only and loaded cells, and matching the failover pair's pace. It rests on that, not on a progress view. A run that samples `pg_stat_progress_vacuum` would confirm it directly.
2. **The fair import, removal and reads-ladder stacks recorded no PostgreSQL counters.** Their WAL rate and PostgreSQL CPU are unknown; only their commit stage is visible.
3. **Data-disk contention from the vacuum's reads and writes** (about 32 MB/s each) is not measured. `pg_stat_io` read times bound it from above for PostgreSQL's own reads.
