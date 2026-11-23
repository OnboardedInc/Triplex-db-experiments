# Rolling durable credits on the fresh full-size database

**North star P2.** Scheduled offer to durable ACK, per-person order and immediate pinned readback. Report quiet-account latency separately, with P1's storage and reader costs visible in the counters. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The default fair policy is still the six-credit barrier. Rolling releases a specific ticket after its own durable ACK has been validated and its predecessor fields have been updated. An ambiguous result quarantines the subject and closes the window. Other already-submitted requests may settle. The existing operation and command routes resolve the original identity. Both policies use the same per-person ownership and basis fences, SDK command, ordered IDs, gateway and synchronous PostgreSQL settings.

The first credit is reserved for account 0. While an eligible quiet save waits, the scheduler issues no later neighbour ahead of it. Its submission can sit behind at most 5/7/11/15 already-submitted neighbours at widths 6/8/12/16. The reservation is not lent out. A prior outstanding quiet save or the same person's own predecessor can still hold that account's next save. The count is a submission bound. It is not a millisecond bound on a storage stall or a transactor safepoint.

## Server command

Check out the published campaign commit from [the report](REPORT.md) in a clean, built checkout. Run from the repository root on the assigned physical server with Node 22, tsx, the pinned Datomic Java 21 and Java 25 images and PostgreSQL 17 available. Use a stopped, self-contained PostgreSQL 17 template with the WAL inside it, and mount the second NVMe as ext4 before running. `SCALE1_IMAGE` is the sealed metadata directory, `SCALE1_PGDATA` the stopped template, `SCALE1_WAL_MOUNT` the second filesystem's mount point and `OUT` a new absolute evidence directory. The launcher proves that PostgreSQL's Docker data and WAL paths resolve to different NVMe devices. It clones the held data read-only, checks clean shutdown and control bytes, verifies the copied WAL files before linking and checks the live database cut, loader claim and exact selected fields. It removes each disposable copy after its arm.

```bash
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-rolling -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh rolling "$OUT" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"
```

The default command runs barrier 6, rolling 6 and rolling 12. These are six five-minute cells per arm, 90 minutes of offers in total. The campaign cap is 150 minutes including setup, three independent copies, drains, verification and teardown. Budget 112–135 minutes with local images and NVMe copies. The optional single-arm launch setting `DX_PREP1_ROLLING_ARM` accepts `barrier6`, `rolling6`, `rolling8`, `rolling12` and `rolling16`. A five-arm campaign would already spend 150 minutes on offers. Follow-ups use their own output directory and the same sealed inputs.

All arms reopen 162,456,470 facts at position 87,002 and retain all one million people in the same database. Each quiet window has 1,050 offers at 3.5/s. Its paired loaded window repeats exactly those offers alongside nine neighbours, each spanning 1,900 people. There is one writer peer and one reader peer. The reader checks the seed and drains the exact journal after each window. This campaign has no additional background reader load and adds no warm-up. It compares writer admission on the same profile, not the full P1 scorecard workload.

Launch reads its settings from INT1's `server` profile. The transactor uses Java 25 ZGC, 3 cores, 24 GiB heap, 16 GiB object cache and a 256 MiB / 1 GiB memory index. The gateways use Java 21 G1 on 4/1 cores with 4/3 GiB heaps. PostgreSQL uses one core, an 8 GiB cap, 2 GB shared buffers, its own WAL NVMe, `max_wal_size=1GB`, `min_wal_size=80MB`, `checkpoint_timeout=5min`, `checkpoint_completion_target=0.9` and `fdatasync`. Synchronous commit, fsync and full-page writes are on. The sender uses core 9 and the counter collector uses core 10.

## Forecast before launch

Rates are ACKs observed during the named wall window. Latency is scheduled-offer to durable ACK for the offered cohort, including ACKs in drain and a separate expiry denominator. Latencies in the table are milliseconds. Second-half offer cohorts start at 150 seconds. The collector emits the first half as well. Every forecast quiet-alone cell is 3.5/s with p50 7 ms in the full and second-half views. The quiet columns give the forecast p99 alone and beside the neighbours.

| Treatment | Offered/s | Stored/s whole / second | Loaded p50 / p99 whole | Loaded p50 / p99 second half | Quiet p99 alone → loaded |
| --- | ---: | ---: | ---: | ---: | ---: |
| Barrier 6 | 235 | 235 / 235 | 24 / 1,600 | 12 / 110 | 18 → 75 |
| Barrier 6 | 394 | 351 / 367 | 16,500 / 30,020 | 23,200 / 30,020 | 15 → 73 |
| Barrier 6 | 620 | 340 / 355 | 29,910 / 30,040 | 29,950 / 30,040 | 17 → 84 |
| Rolling 6 | 235 | 235 / 235 | 11 / 95 | 10 / 64 | 18 → 36 |
| Rolling 6 | 394 | 381 / 388 | 4,500 / 10,400 | 7,000 / 10,400 | 15 → 36 |
| Rolling 6 | 620 | 388 / 402 | 29,920 / 30,035 | 29,960 / 30,035 | 17 → 43 |
| Rolling 8 | 235 | 235 / 235 | 10 / 78 | 10 / 60 | 18 → 37 |
| Rolling 8 | 394 | 391 / 394 | 150 / 1,900 | 16 / 350 | 15 → 39 |
| Rolling 8 | 620 | 415 / 427 | 29,900 / 30,035 | 29,950 / 30,035 | 17 → 46 |
| Rolling 12 | 235 | 235 / 235 | 10 / 67 | 10 / 55 | 18 → 38 |
| Rolling 12 | 394 | 394 / 394 | 18 / 105 | 16 / 80 | 15 → 43 |
| Rolling 12 | 620 | 447 / 462 | 29,850 / 30,030 | 29,950 / 30,030 | 17 → 53 |
| Rolling 16 | 235 | 235 / 235 | 10 / 70 | 10 / 55 | 18 → 39 |
| Rolling 16 | 394 | 394 / 394 | 20 / 125 | 17 / 90 | 15 → 49 |
| Rolling 16 | 620 | 460 / 475 | 29,800 / 30,035 | 29,940 / 30,035 | 17 → 66 |

No improvement over the matched barrier at 394 with rolling 12 and a continuously occupied rolling window would disprove the throughput hypothesis. At second-half <388/s or any expiry at 394, the peak forecast missed. The expected quiet ratios still exceed 1.25×. A larger ratio than the matched barrier, or a quiet save overtaken by an unreserved neighbour while eligible, would defeat the isolation rationale. Any changed receipt, stale predecessor, missing definitive ACK on reopen, early ACK or invalid order invalidates the run.

Native apply at 1.86 ms/save and 1.19 SQL reads/save gives about 537/s from apply alone. At 447/s that is roughly 83% of a serial apply thread's time before log handoff and reads/indexing competing for storage. Near that point expect serial native work or PostgreSQL service to bound added depth, and queued neighbours to raise quiet tails. Separately check sender CPU, gateway prep, cgroup throttling, per-save apply and SQL counters, and index and checkpoint activity before assigning the next limit. [Fresh scorecard diagnosis](SCORECARD-FRESH-READING.md)

## Evidence

Each arm writes full per-offer stage clocks, native blocks and credit grants/releases. Barrier holds and per-credit holds are reported separately. One timed sampler retains role cgroup CPU and throttling, sender process CPU and `pg_stat_wal`, `pg_stat_checkpointer`, `pg_stat_io` once per second. PostgreSQL checkpoint start, reason and completion come from Docker's timestamped PostgreSQL log. The Datomic update log retains index-build events. The native observer records adoption boundaries and the vendor metric callback's memory-index and alarm buckets at their emitted cadence. Absent alarms are distinguishable from an absent metric. Linux monotonic and wall pairs make that timeline joinable to SQL and JVM events. [PostgreSQL statistics](https://www.postgresql.org/docs/17/monitoring-stats.html) · [Datomic metrics](https://docs.datomic.com/operation/monitoring.html)
