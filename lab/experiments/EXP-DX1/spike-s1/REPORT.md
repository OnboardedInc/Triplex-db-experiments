# DX-S1: standalone Datomic / PostgreSQL engine floors

Diagnostic spike under PROTOCOL 0b. These are engine/harness measurements, not Triplex acceptance. No Triplex package was imported, called or modified. No downloads were performed. The scope is the 10k-subject fixture, not year-one scale.

## Summary

| Question | Headline | R51 §5 prediction | TARGETS bar it bears on |
| --- | --- | --- | --- |
| Q1 | q1-mix-40: 5.106 / 8.957 / 14.441 / 35.671 (n=1,000) ms | 40 datoms p50 3–6 ms, p99 <25 ms; 260 datoms p50 5–12 ms | P2 p50 ≤10 ms / p99 ≤50 ms with 256 readers |
| Q2 | q2-b: 6,302.039 pulls/thread-CPU-s; q2-c: 25,595.323 pulls/thread-CPU-s | id cache 0.3–0.7 ms CPU; entity cache <0.15 ms CPU | P4 ≥1,100 pulls/core/s; p50 ≤5 / p99 ≤25 ms |
| Q3 | q3-current-1: 0.081 / 0.409 / 2.822 / 9.646 (n=10,000) ms; q3-current-10: 0.084 / 0.392 / 0.883 / 7.957 (n=10,000) ms | current reads use indexes; no numeric history prediction | P4 depth-10 p99 and bytes ≤1.1× depth 1 |
| Q4 | q4-samedb-alone: 7.434 / 25.937 / 622.371 / 893.184 (n=3,283) ms; q4-samedb-separate: 5.050 / 17.755 / 169.207 / 314.392 (n=3,283) ms; q4-samedb-shared: 5.804 / 12.825 / 80.250 / 365.217 (n=3,283) ms | separate-reader writer p99 ≤1.25× baseline | P1 writer p99 ≤1.25× at 256 readers |
| Q5 | q5-lag: -0.015 / 0.459 / 3.563 / 10.895 (n=2,000) ms | visibility p50 <5 ms / p99 <30 ms after ACK | P3 affected-subject durable feed lag p99 ≤250 ms |
| Q6 | q6-tx: 0 missing / 532 ACKs; q6-pg: 0 missing / 510 ACKs | no section-5 durability prediction | P2 no lost acknowledged commits |

## Common conditions and reproduction

Local images: `tx2-datomic:1.0.7745-da00` (Pro 1.0.7745, JRE 21) and `postgres:17-alpine`; immutable image IDs and configuration are retained in `images.json`. Every Docker command used `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`. All created container/network/volume names begin `tx2-dxs1-`. No host ports were published.

Postgres: CPU 0, memory cap 1 GiB, named volume `tx2-dxs1-pg-data`; transactor: CPU 1, cap 2 GiB, heap `-Xms1g -Xmx1g`; peers: cap 2 GiB, heap `-Xms1g -Xmx1g`, CPU 2 except where stated. Network `tx2-dxs1-net`. PostgreSQL defaults confirmed: `fsync=on`, `synchronous_commit=on`, `full_page_writes=on`, `wal_sync_method=fdatasync` (`setup.log`). The distribution's DDL required removal of obsolete `OIDS=FALSE` for PG17 and replacing unavailable Alpine `en_US.UTF-8` with UTF8/C; the table's four columns and primary key are unchanged. The role is the local throwaway `datomic` role, not a production permission test.

From this worktree:

```sh
bash lab/experiments/EXP-DX1/spike-s1/setup.sh
node lab/bin/heavy.mjs --label DX-S1-init -- bash lab/experiments/EXP-DX1/spike-s1/peer.sh init 2 init dxs1-write
node lab/bin/heavy.mjs --label DX-S1-seed -- bash lab/experiments/EXP-DX1/spike-s1/peer.sh seed 3 seed dxs1-world
node lab/bin/heavy.mjs --label DX-S1-Q1 -- bash lab/experiments/EXP-DX1/spike-s1/measure.sh q1-closed bash lab/experiments/EXP-DX1/spike-s1/peer.sh q1closed 2 q1-closed dxs1-write
bash lab/experiments/EXP-DX1/spike-s1/run-remaining.sh
# Actual recovery from the documented wrapper error continued with:
bash lab/experiments/EXP-DX1/spike-s1/resume-lock-first.sh
# Additional longer-warmup comparison and same-db isolation:
bash lab/experiments/EXP-DX1/spike-s1/measure.sh q1-pair node lab/bin/heavy.mjs --label DX-S1-pair -- bash lab/experiments/EXP-DX1/spike-s1/pair.sh
bash lab/experiments/EXP-DX1/spike-s1/q4-same-db.sh
```

`peer.sh NAME CPU COMMAND DB ARGS...` expands to:

```sh
docker run --rm --name tx2-dxs1-$NAME --network tx2-dxs1-net --cpuset-cpus "$CPU" -m 2g \
  -v "$SRC:/spike:ro" -v "$OUT:/evidence" -e DATOMIC_EXT_CLASSPATH=/spike \
  -e DATOMIC_JAVA_OPTS='-Xms1g -Xmx1g' -w /opt/datomic \
  --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m spike.main "$@"
```

`SRC` is this script directory; `OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1`. Each `measure` call in the initial driver invoked `node lab/bin/heavy.mjs --label DX-S1-$label -- bash "$SRC/measure.sh" "$label" COMMAND...`; that script acquires the shared `locks/measure` directory, traps release and records `docker stats --no-stream` before/after. Later windows have an 870-second command guard. After a long shared-lock wait, `resume-lock-first.sh` reversed admission to `bash measure.sh LABEL node lab/bin/heavy.mjs --label DX-S1-LABEL -- COMMAND...`, so this spike does not hold a heavy token while waiting for the timing lock. The pair and same-db isolation use that order too. The final `run-remaining.sh` uses lock-first admission and same-database Q4 as the default; the earlier cross-database controls are retained diagnostics. The initial Q1 window used the same lock without the guard. Setup and seeding ran outside the lock, before our timed windows.

Percentiles are nearest rank. All latency tables list p50 / p90 / p99 / max in milliseconds, with sample count. Single-thread CPU uses `ThreadMXBean.getCurrentThreadCpuTime`; whole-container CPU is the cgroup `usage_usec` delta. Container CPU includes helper threads, GC and CSV output; per-operation thread CPU covers transaction construction or pull traversal plus buffer construction. CPU-normalized throughput is a diagnostic distinct from the TARGETS quota-based per-core metric.


## Q1. Commit floor

| Run | Latency ms | Peer container CPU s | Mean tx-report datoms |
| --- | --- | --- | --- |
| q1-mix-12 | 6.252 / 11.595 / 20.429 / 32.552 (n=1,000) | 3.118 | 13.0 |
| q1-mix-40 | 5.106 / 8.957 / 14.441 / 35.671 (n=1,000) | 2.100 | 41.0 |
| q1-mix-100 | 3.980 / 8.285 / 20.046 / 59.883 (n=1,000) | 1.853 | 101.0 |
| q1-mix-260 | 4.466 / 9.137 / 23.982 / 60.983 (n=1,000) | 1.936 | 261.0 |
| q1-mix-600 | 8.449 / 15.766 / 42.255 / 108.980 (n=1,000) | 3.478 | 601.0 |
| q1-rows-40 | 1.809 / 5.684 / 16.487 / 75.889 (n=1,000) | 0.764 | 41.0 |
| q1-fn-40 | 1.622 / 3.160 / 5.907 / 38.880 (n=1,000) | 0.637 | 41.0 |
| q1-open-260-15 | 6.677 / 17.006 / 52.613 / 149.646 (n=880) | 4.934 | — |
| q1-open-260-55 | 7.207 / 23.286 / 268.158 / 489.175 (n=3,283) | 13.381 | — |
| q1-open-40-15 | 4.500 / 7.920 / 14.385 / 83.680 (n=880) | 3.156 | — |
| q1-open-40-15-r3 | 7.641 / 15.053 / 42.942 / 94.276 (n=880) | 5.549 | — |
| q1-open-40-55 | 3.692 / 8.677 / 23.274 / 94.394 (n=3,283) | 7.542 | — |
| q1-pair-plain-before | 3.593 / 10.078 / 41.843 / 81.552 (n=1,000) | 1.596 | 41.0 |
| q1-pair-fn | 3.062 / 6.351 / 9.753 / 35.660 (n=1,000) | 1.292 | 41.0 |
| q1-pair-plain-after | 2.261 / 4.736 / 8.445 / 21.660 (n=1,000) | 0.907 | 41.0 |
| q1-pg-sample | 5.236 / 8.051 / 10.736 / 10.736 (n=50) | 0.216 | 41.0 |

Closed-loop: 200 warmup then 1,000 samples per size (12, 40, 100, 260, 600), then row-only 40 and tx-function 40. About each ten submitted datoms: one 26-character unique ID, six scalar longs/40-byte strings, two refs to the existing anchor, one 300-byte row string, with fresh entities for cardinality-one scalars. Report datoms include Datomic's txInstant. Each timed operation includes constructing the transaction and `@(d/transact conn tx)`.

The row-only run adds 40 fresh 300-byte strings on an existing entity. The transaction function reads anchor `:f/n`, checks equality to 0 and returns the same mixed 40-datom payload. This compares complete client-visible execution, not transaction-function CPU alone. `pair.sh` starts a fresh JVM, performs 3,000 extra mixed 40-datom warmups, then measures plain/function/plain (200 further warmups and 1,000 samples each); those bracketed rows are the stronger function comparison. The earlier size sweep ran in ascending size order and is confounded by JVM warmup, accumulating data/indexing and changing shared-VM conditions. Unlike the mixed run, row-only has no entity allocations or uniqueness checks, so its difference cannot be attributed to uniqueness alone.

Open-loop exact invocations (each inside its own heavy + measurement wrapper):

```sh
peer.sh q1-open-40-15 2 open dxs1-write q1-open-40-15 40 15 60
peer.sh q1-open-40-55 2 open dxs1-write q1-open-40-55 40 55 60
peer.sh q1-open-260-15 2 open dxs1-write q1-open-260-15 260 15 60
peer.sh q1-open-260-55 2 open dxs1-write q1-open-260-55 260 55 60
```

The original 40/15 attempt completed its timing but its closing stats command failed after an in-place wrapper edit; its output is retained. An R2 queue-only duplicate was stopped; R3 repeats `peer.sh q1-open-40-15-r3 2 open dxs1-write q1-open-40-15-r3 40 15 60` with the complete wrapper. Both original and R3 numbers remain in the table. No timed output was discarded. Each has 200 sequential warmup commits, seed 5151 exponential arrivals, a 256-slot in-flight semaphore and 16 completion waiters. Scheduling continues independently of individual futures. Scheduled-arrival-to-ACK includes scheduler lateness and queueing. Every completed/error offer is retained in CSV; the summaries include errors and scheduler lateness.

Postgres short sample: `measure q1-pg-sample bash "$SRC/pg-sample.sh"`; it enables `log_min_duration_statement=0` only around a fresh peer's 200 warmups + 50 timed 40-datom commits, then restores the setting. This instrumented run is separate from the uninstrumented floors. `q1-pg-statements.log` retains every logged statement, not a claim that their summed duration decomposes peer latency. Transactor logs and extracted metrics are retained separately.


Transactor 40-datom process timings during SQL sample (includes warmup)

| Exposed timing | p50 / p90 / p99 / max ms (n) | Mean ms |
| --- | --- | --- |
| msec | 2.330 / 3.380 / 6.120 / 12.300 (n=250) | 2.522 |
| apply-msec | 0.360 / 0.548 / 1.130 / 1.880 (n=250) | 0.404 |
| tx-fn-ms | 0.000 / 0.000 / 0.000 / 0.000 (n=250) | 0.000 |
| ucheck-tx-ms | 0.010 / 0.020 / 0.050 / 0.090 (n=250) | 0.011 |
| res-tx-ms | 0.020 / 0.040 / 0.080 / 0.210 (n=250) | 0.028 |

Postgres logged statement duration sample

| Exposed timing | p50 / p90 / p99 / max ms (n) | Mean ms |
| --- | --- | --- |
| execute:SELECT | 0.017 / 0.086 / 0.360 / 0.461 (n=378) | 0.038 |
| execute:UPDATE | 0.066 / 0.145 / 0.248 / 0.314 (n=263) | 0.082 |
| statement:SET | 0.064 / 0.120 / 0.120 / 0.120 (n=2) | 0.092 |
| execute:INSERT | 0.089 / 0.191 / 0.516 / 2.008 (n=294) | 0.116 |

The engine also exposed all five requested interval families: TransactionMsec, TransactionDatoms, MemoryIndexMB, StoragePutMsec and LogWriteMsec. Their original lo/hi/sum/count intervals are in `transactor-metric-intervals.csv`; raw process-monitor lines are in the transactor logs. Those intervals cross individual subrun boundaries and contain no p50/p90/p99, so no quantiles were invented from them. Statement durations, transaction apply/process durations and log-write metrics overlap; they cannot be added to reconstruct end-to-end latency.

## Q2. Subject pull floor

| Variant | Wall ms | Thread CPU µs (same percentile order) | Mean CPU µs | Pulls/thread-CPU-s | Rows mean | Entities mean | Bytes mean | Container CPU s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| q2-a | 0.124 / 0.555 / 1.559 / 10.728 (n=20,000) | 122.625 / 538.416 / 1,180.166 / 3,707.792 (n=20,000) | 225.406 | 4,436.437 | 449.196 | 94.909 | 112,749.196 | 5.088 |
| q2-b | 0.085 / 0.397 / 1.063 / 9.374 (n=20,000) | 83.833 / 386.125 / 750.791 / 1,643.916 (n=20,000) | 158.679 | 6,302.039 | 449.196 | 94.909 | 112,749.196 | 3.678 |
| q2-c | 0.028 / 0.079 / 0.166 / 3.935 (n=20,000) | 27.709 / 77.417 / 151.666 / 594.334 (n=20,000) | 39.070 | 25,595.323 | 449.196 | 94.909 | 112,749.196 | 0.966 |

| 4 threads, CPUs 2,3 | Pulls | Wall s | Container CPU s | Pulls/wall-s | Pulls/container-CPU-s |
| --- | --- | --- | --- | --- | --- |
| q2-parallel-b | 522088 | 60.001 | 105.342 | 8,701.362 | 4,956.120 |
| q2-parallel-c | 1337875 | 60.001 | 85.390 | 22,297.683 | 15,667.805 |

Cold JVM first full pass: 5.282 s wall, 2.753 s thread CPU, 5.283 s container CPU; per-pull 0.138 / 0.794 / 7.813 / 46.192 (n=10,000) ms.

Commands: `peer.sh cold 2 cold dxs1-world`; `peer.sh verify 2 verify dxs1-world`; `peer.sh q2a 2 read dxs1-world a q2-a` (similarly b/c); `peer.sh q2pb 2,3 parallel dxs1-world b q2-parallel-b 4 60` (similarly c). All were wrapped separately as shown in `run-remaining.sh`.

World: requirement counts `[2,5,8,11,14,17,20,23,25,27,33,52,71,90,109,128,147,153,270,387]`, deliberately spread across the specified account ranges rather than reproducing world.ts's hash values. Account assignment `floor(i/20) mod 20` yields exactly 500 subjects/account and independent 40/35/25 own-row shares. Each subject has 12 reachable own entities and 28/40/50 own rows. Shared account/release/policy contribute 12 rows; each requirement contributes four own rows plus its incoming release reference (five total), following world.ts's counting. This is a standalone shaped fixture, not the exact frozen W0 generator: fixed 12 own entities and document graph instead of world.ts's 9/13/17 entities and mixed 3/4/6-hop graphs. It is not a year-one or full TARGETS benchmark.

Rows use the requested fixed-width header, valid-from 1700000000000, no valid-to, reference target text and exactly 250 ASCII JSON bytes. The instant is 1700000000001. Every row is active; range parsing/checking is exercised, but mixed expired/future rows are not. Output is comma-separated JSON in one owned byte buffer, plus its final right-sized copy. Warmup is one complete 10k-subject pass before every timed warm run; each single-thread variant then samples 20k subjects uniformly with seed 4242. The cold run is a fresh JVM before any cache construction/full-pass warmup: connection/schema setup precedes the timer; it is cold peer segments, not cold PostgreSQL/OS caches.

(a) lookup `d/entid` for each entity, then `d/datoms :eavt`; (b) prebuilt concurrent ID-to-eid map, then datoms; (c) prebuilt concurrent entity map holding joined JSON bytes, offsets/lengths, validity arrays and ref arrays. Variant (c) uses `System.arraycopy` without reparsing row text. Cache construction is outside timing; no writes occur during these runs. The 4-thread runs warm sequentially, then run 60 seconds on two allowed CPUs; summaries count whole-peer CPU. All variants use the same output allocation and seen-set traversal.

Equivalence observation: `{"equivalent_subjects": 10000, "basis": 123162}`. Full output bytes, row/entity counts and expected byte lengths were compared for every subject at one current basis; this is not an independent Triplex domain oracle.

## Q3. History

| Run | Wall ms | Mean CPU µs | Mean bytes | Mean rows |
| --- | --- | --- | --- | --- |
| q3-current-1 | 0.081 / 0.409 / 2.822 / 9.646 (n=10,000) | 161.215 | 96,633.063 | 384.988 |
| q3-asof-1 | 0.079 / 0.390 / 0.957 / 2.181 (n=10,000) | 157.647 | 96,633.063 | 384.988 |
| q3-current-3 | 0.081 / 0.396 / 1.022 / 27.663 (n=10,000) | 161.480 | 96,633.063 | 384.988 |
| q3-asof-3 | 0.083 / 0.401 / 1.044 / 6.812 (n=10,000) | 163.872 | 96,633.063 | 384.988 |
| q3-current-10 | 0.084 / 0.392 / 0.883 / 7.957 (n=10,000) | 160.047 | 96,633.063 | 384.988 |
| q3-asof-10 | 0.085 / 0.404 / 1.011 / 4.730 (n=10,000) | 166.486 | 96,633.063 | 384.988 |
| q3-current-indexed | 0.073 / 0.365 / 0.862 / 7.961 (n=10,000) | 145.204 | 96,633.063 | 384.988 |
| q3-asof-indexed | 0.094 / 0.467 / 1.653 / 13.857 (n=10,000) | 189.675 | 96,633.063 | 384.988 |

Depth 10 / depth 1: p99 wall 0.313×; mean thread CPU 0.993×; mean output bytes 1.000×. Output bytes are not physical index bytes read. The large wall-p99 improvement alongside nearly flat mean CPU is consistent with warmup/noise; it is not evidence that retaining history accelerates reads.

As-of/current at 1: mean thread CPU 0.978×, p99 wall 0.339×.

As-of/current at 3: mean thread CPU 1.015×, p99 wall 1.022×.

As-of/current at 10: mean thread CPU 1.040×, p99 wall 1.144×.

As-of/current at indexed: mean thread CPU 1.306×, p99 wall 1.917×.

Command: `peer.sh history 2 history dxs1-world` inside one measurement window. Capture t0 before corrections; 10 rounds retract/re-add one row on placement and one on i9 for the same first 1,000 subjects (4 submitted datoms/subject/round), preserving ref targets. Rounds 1/3/10: warm all 1,000 subjects then 10k uniformly sampled pulls against current and as-of-t0, ID cache only. Cache contains IDs only, so it is reusable at t0. Request indexing and wait via `d/sync-index conn target`, then repeat current/as-of. Index wait and target are in the driver log. Same sample seed is used at each depth. This tests ten corrections of two rows, not broad retained-history scale, and does not measure storage bytes read.


## Q4. Reader/writer isolation

| Condition | Writer ms | Reader pulls/wall-s | Reader CPU s | Transactor CPU s |
| --- | --- | --- | --- | --- |
| q4-alone | 6.430 / 11.333 / 23.513 / 121.034 (n=3,283) | — | — | 10.091 |
| q4-separate | 5.278 / 10.219 / 66.569 / 243.357 (n=3,283) | 4,746.887 | 58.783 | 10.279 |
| q4-shared | 7.114 / 14.543 / 39.049 / 150.465 (n=3,283) | 3,852.876 | 49.940 | 7.747 |
| q4-samedb-alone | 7.434 / 25.937 / 622.371 / 893.184 (n=3,283) | — | — | 14.399 |
| q4-samedb-separate | 5.050 / 17.755 / 169.207 / 314.392 (n=3,283) | 3,827.484 | 59.440 | 12.405 |
| q4-samedb-shared | 5.804 / 12.825 / 80.250 / 365.217 (n=3,283) | 3,853.887 | 51.701 | 8.652 |

q4-separate / corresponding alone writer p99: 2.831×.

q4-shared / corresponding alone writer p99: 1.661×.

q4-samedb-separate / corresponding alone writer p99: 0.272×.

q4-samedb-shared / corresponding alone writer p99: 0.129×.

Primary same-database commands: `q4-same-db.sh`, which separately measures `isolation-same-db.sh q4-samedb-alone none`, `isolation-same-db.sh q4-samedb-separate 3`, and `isolation-same-db.sh q4-samedb-shared 2`. W and R both connect to `dxs1-world`; R ingests W's transactions but continues pulling its captured immutable db. Earlier cross-database controls use W=`dxs1-write`, R=`dxs1-world`; commands: `isolation.sh q4-alone none`, `isolation.sh q4-separate 3`, `isolation.sh q4-shared 2`, each separately measured. Writer is CPU 2; reader CPU is 3 or 2. Reader warms the full fixture and builds the ID cache before announcing readiness. Writer warms 200 commits then signals the reader and schedules a 60-second Poisson 55/s window, 40 datoms. Reader runs 8 threads against one pinned immutable db until the writer drains; its interval starts up to 100 ms before the scheduled writer interval. Reader file polling and eight-thread scheduling overhead are included. The transactor cgroup delta is sampled around the writer's go/done files (host polling up to 100 ms); it excludes most startup/warmup. The very large same-database baseline tail and lower tail with the separate reader make its ratio a poor causal isolation estimate; this single sequence does not establish the R51 isolation prediction. JVM/storage/maintenance causes were not isolated. This is eight reader threads, not P1's 256 readers, and writes add new unrelated entities rather than modifying the pulled subjects; this is process/CPU interference diagnostic only.


## Q5. Cross-peer visibility


Seen-minus-ACK: -0.015 / 0.459 / 3.563 / 10.895 (n=2,000) ms; negative samples 1055; ACKs 2000, seen markers 2000, unmatched ACK/seen 0/0.

Reader basis before/after without sync: 3132729 → 3144968. Already-seen `(deref (d/sync conn t) 1000 :timeout)`: 0.000 / 0.005 / 0.033 / 3.073 (n=2,000) ms.

Command: `feed.sh` inside `measure q5`. Reader CPU 3 registers `d/tx-report-queue` and announces ready; writer CPU 2 warms 200 unrelated 40-datom commits, then commits 2,000 unique single-marker transactions on a fixed 20/s schedule. ACK/seen timestamps use `java.time.Instant/now` epoch seconds plus nanoseconds on the same VM clock; no timestamp precision is discarded during the Python join. Reader stamps each dequeued report before extracting its markers. Both files flush every line. The reader never calls sync before the feed has received all 2,000 markers and the advancing `(d/db conn)` basis has been captured. Only then it warms 200 already-seen-t syncs and measures 2,000. Raw marker files and `q5-joined.csv` retain the join. This measures peer notification, not a durable affected-subject feed checkpoint, resume semantics or the full P3 lag definition. Clock adjustment was not independently monitored.


## Q6. Durability sanity

| Abruptly stopped component | ACKs checked | Missing | Readback basis |
| --- | --- | --- | --- |
| q6-tx | 532 | 0 | 3146032 |
| q6-pg | 510 | 0 | 3147054 |

Command: `durability.sh` inside `measure q6`. One closed-loop writer asserts unique markers and flushes its ACK line after each completed future. After at least 500 ACK lines, issue `docker kill -s KILL tx2-dxs1-tx` (first round), then later `docker kill -s KILL tx2-dxs1-pg` (second). Stop the writer container to freeze the final ACK set, restart only the killed component, wait ten seconds (plus pg_isready for PostgreSQL), reconnect from a fresh peer and resolve every ACK marker by its unique lookup ref. The count checked is the actual retained file's count, including ACKs racing with the stop. First-error writer logs are retained. This is one process-stop round/component on a live VM, not VM/host power-loss, multi-round reliability evidence, exact fsync-path verification or a formal durability acceptance.


## Concurrent VM conditions

Before/after snapshots for each window follow. These are observations of other running work, not a claim of an otherwise idle VM. Other resources were left alone.


### q1-closed-window

```text
Mon Nov  9 20:25:02 UTC 2026
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
a2b810136556   tx2-dxh1-a1-pg   0.01%     38.93MiB / 512MiB   7.60%     9.95kB / 8.27kB   4.1kB / 47.8MB    6
03c359640b71   tx2-dxb1-dev     1.12%     513.1MiB / 3GiB     16.70%    752B / 242B       4.1kB / 115kB     108
943630e10a15   tx2-xtdb-s1      158.30%   685.3MiB / 3.5GiB   19.12%    499MB / 1.71GB    76.9MB / 2.03GB   54
1acfc78a670c   tx2-dxs1-tx      0.41%     977.7MiB / 2GiB     47.74%    258MB / 267MB     84.5MB / 2.33MB   78
5856becf11c3   tx2-dxs1-pg      0.13%     109.9MiB / 1GiB     10.74%    140MB / 130MB     40.5MB / 150MB    13
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.25%    367kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:26:00 UTC 2026
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
6b2fc724c3f1   tx2-dxh1-a2-tx   0.13%     201.3MiB / 1.465GiB   13.42%    11.3kB / 11.4kB   0B / 156kB        21
ee30e9abd070   tx2-dxh1-a2-pg   0.03%     42.59MiB / 512MiB     8.32%     21kB / 18.5kB     8.19kB / 47.4MB   10
03c359640b71   tx2-dxb1-dev     0.68%     513.9MiB / 3GiB       16.73%    934B / 284B       4.1kB / 492kB     94
943630e10a15   tx2-xtdb-s1      2.04%     734MiB / 3.5GiB       20.48%    508MB / 1.92GB    76.9MB / 2.03GB   52
1acfc78a670c   tx2-dxs1-tx      0.51%     1.111GiB / 2GiB       55.57%    486MB / 529MB     84.5MB / 16.1MB   111
5856becf11c3   tx2-dxs1-pg      0.33%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 484MB    14
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB     45.25%    367kB / 2.07MB    181MB / 519MB     13
```


### q1-open-260-15-window

```text
Mon Nov  9 20:30:48 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.11%     320MiB / 1.465GiB     21.33%    33.7kB / 28.5kB   0B / 336kB        41
9f895aa919e1   tx2-dxh1-a4-gw-w   0.67%     316.8MiB / 1.465GiB   21.12%    33.1kB / 28.5kB   0B / 328kB        41
96081c156dec   tx2-dxh1-a4-tx     0.49%     274.4MiB / 1.465GiB   18.29%    71.8kB / 85.7kB   0B / 401kB        53
c450f000238b   tx2-dxh1-a4-pg     0.08%     53.92MiB / 512MiB     10.53%    80.7kB / 70.6kB   0B / 49.2MB       15
03c359640b71   tx2-dxb1-dev       0.89%     507.4MiB / 3GiB       16.52%    682B / 242B       0B / 115kB        111
943630e10a15   tx2-xtdb-s1        1.01%     760.8MiB / 3.5GiB     21.23%    552MB / 5.05GB    77MB / 2.1GB      44
1acfc78a670c   tx2-dxs1-tx        0.44%     1.114GiB / 2GiB       55.68%    516MB / 565MB     84.5MB / 22.6MB   110
5856becf11c3   tx2-dxs1-pg        0.20%     161MiB / 1GiB         15.72%    308MB / 277MB     40.5MB / 617MB    14
a809fb6cb3ba   tx2-qlever-dev     27.70%    1.591GiB / 3.5GiB     45.46%    368kB / 2.07MB    181MB / 519MB     16
Mon Nov  9 20:31:57 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.27%     320.1MiB / 1.465GiB   21.34%    35.6kB / 31.2kB   0B / 401kB        41
9f895aa919e1   tx2-dxh1-a4-gw-w   0.20%     316.8MiB / 1.465GiB   21.12%    35kB / 31.2kB     0B / 385kB        41
96081c156dec   tx2-dxh1-a4-tx     2.73%     274.8MiB / 1.465GiB   18.32%    79.8kB / 96.5kB   0B / 483kB        53
c450f000238b   tx2-dxh1-a4-pg     2.56%     54.04MiB / 512MiB     10.55%    88kB / 73.2kB     0B / 49.6MB       15
03c359640b71   tx2-dxb1-dev       163.00%   694.2MiB / 3GiB       22.60%    3.99MB / 5.72MB   1.8MB / 1.69MB    429
943630e10a15   tx2-xtdb-s1        19.91%    760.9MiB / 3.5GiB     21.23%    552MB / 5.05GB    77MB / 2.1GB      44
1acfc78a670c   tx2-dxs1-tx        1.68%     1.116GiB / 2GiB       55.78%    557MB / 614MB     84.5MB / 24.8MB   109
5856becf11c3   tx2-dxs1-pg        10.51%    170.4MiB / 1GiB       16.64%    336MB / 301MB     40.5MB / 676MB    14
a809fb6cb3ba   tx2-qlever-dev     36.72%    1.579GiB / 3.5GiB     45.10%    368kB / 2.07MB    181MB / 519MB     16
```


### q1-open-260-55-window

```text
Mon Nov  9 20:32:02 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   1.26%     320.1MiB / 1.465GiB   21.34%    35.7kB / 31.4kB   0B / 401kB        41
9f895aa919e1   tx2-dxh1-a4-gw-w   0.09%     316.8MiB / 1.465GiB   21.12%    35kB / 31.2kB     0B / 385kB        41
96081c156dec   tx2-dxh1-a4-tx     0.68%     274.8MiB / 1.465GiB   18.32%    80kB / 96.6kB     0B / 483kB        53
c450f000238b   tx2-dxh1-a4-pg     0.15%     54.07MiB / 512MiB     10.56%    88kB / 73.2kB     0B / 49.8MB       15
03c359640b71   tx2-dxb1-dev       105.57%   695.9MiB / 3GiB       22.65%    4.16MB / 5.95MB   1.8MB / 1.69MB    442
943630e10a15   tx2-xtdb-s1        0.95%     760.9MiB / 3.5GiB     21.23%    552MB / 5.05GB    77MB / 2.1GB      44
1acfc78a670c   tx2-dxs1-tx        0.23%     1.116GiB / 2GiB       55.78%    557MB / 614MB     84.5MB / 24.9MB   109
5856becf11c3   tx2-dxs1-pg        0.32%     170.4MiB / 1GiB       16.64%    336MB / 301MB     40.5MB / 676MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.583GiB / 3.5GiB     45.23%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:33:16 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.32%     320.2MiB / 1.465GiB   21.34%    37.6kB / 34.3kB   0B / 479kB       41
9f895aa919e1   tx2-dxh1-a4-gw-w   0.04%     316.9MiB / 1.465GiB   21.13%    36.8kB / 34kB     0B / 451kB       41
96081c156dec   tx2-dxh1-a4-tx     0.26%     275.2MiB / 1.465GiB   18.34%    88.7kB / 108kB    0B / 569kB       53
c450f000238b   tx2-dxh1-a4-pg     0.13%     54.27MiB / 512MiB     10.60%    96kB / 76.1kB     0B / 55.9MB      15
03c359640b71   tx2-dxb1-dev       81.27%    884.4MiB / 3GiB       28.79%    17.4MB / 25MB     1.8MB / 23.8MB   1321
943630e10a15   tx2-xtdb-s1        1.61%     761.1MiB / 3.5GiB     21.24%    552MB / 5.05GB    77MB / 2.1GB     44
1acfc78a670c   tx2-dxs1-tx        0.15%     1.119GiB / 2GiB       55.93%    689MB / 769MB     84.5MB / 31MB    116
5856becf11c3   tx2-dxs1-pg        0.23%     195.8MiB / 1GiB       19.12%    421MB / 375MB     40.5MB / 835MB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.05%    368kB / 2.07MB    181MB / 519MB    13
```


### q1-open-40-15-r3-window

```text
Mon Nov  9 20:47:33 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.10%     513.9MiB / 1.465GiB   34.26%    2.05MB / 12.7MB   0B / 958kB        54
9f895aa919e1   tx2-dxh1-a4-gw-w   0.25%     611.5MiB / 1.465GiB   40.77%    27.2MB / 30.3MB   0B / 942kB        88
96081c156dec   tx2-dxh1-a4-tx     0.48%     328.3MiB / 1.465GiB   21.89%    14.6MB / 17.5MB   0B / 1.25MB       104
c450f000238b   tx2-dxh1-a4-pg     0.10%     60.98MiB / 512MiB     11.91%    9.15MB / 8.51MB   0B / 67.4MB       16
03c359640b71   tx2-dxb1-dev       32.02%    610.1MiB / 3GiB       19.86%    213kB / 213kB     0B / 393kB        272
943630e10a15   tx2-xtdb-s1        43.21%    769.6MiB / 3.5GiB     21.47%    552MB / 5.05GB    77MB / 2.14GB     46
1acfc78a670c   tx2-dxs1-tx        0.27%     1.117GiB / 2GiB       55.84%    689MB / 769MB     84.7MB / 31.5MB   85
5856becf11c3   tx2-dxs1-pg        0.02%     195.8MiB / 1GiB       19.12%    421MB / 375MB     40.5MB / 877MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:48:43 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.05%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.04MB      48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.39%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.04MB      80
96081c156dec   tx2-dxh1-a4-tx     0.35%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.47MB      76
c450f000238b   tx2-dxh1-a4-pg     0.06%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.6MB      16
03c359640b71   tx2-dxb1-dev       76.15%    773.1MiB / 3GiB       25.17%    6.56MB / 13.6MB   0B / 2.6MB       685
943630e10a15   tx2-xtdb-s1        0.66%     763MiB / 3.5GiB       21.29%    552MB / 5.05GB    77MB / 2.14GB    44
1acfc78a670c   tx2-dxs1-tx        0.20%     1.119GiB / 2GiB       55.94%    697MB / 779MB     84.7MB / 33MB    110
5856becf11c3   tx2-dxs1-pg        0.05%     197.5MiB / 1GiB       19.29%    427MB / 380MB     40.5MB / 909MB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.06%    368kB / 2.07MB    181MB / 519MB    13
```


### q1-open-40-15-window

```text
Mon Nov  9 20:28:27 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.12%     319.7MiB / 1.465GiB   21.31%    30.1kB / 23kB     0B / 184kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.04%     316.6MiB / 1.465GiB   21.10%    29.4kB / 23kB     0B / 205kB        42
96081c156dec   tx2-dxh1-a4-tx     0.17%     273.7MiB / 1.465GiB   18.25%    55.3kB / 63.3kB   0B / 238kB        65
c450f000238b   tx2-dxh1-a4-pg     0.01%     53.88MiB / 512MiB     10.52%    65.3kB / 65kB     0B / 48.4MB       15
03c359640b71   tx2-dxb1-dev       110.07%   608.9MiB / 3GiB       19.82%    651kB / 892kB     0B / 328kB        221
943630e10a15   tx2-xtdb-s1        0.57%     795.3MiB / 3.5GiB     22.19%    551MB / 5.05GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.11%     1.11GiB / 2GiB        55.50%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.09%     154.2MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 499MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```


### q1-open-40-55-window

```text
Mon Nov  9 20:29:36 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.28%     319.9MiB / 1.465GiB   21.33%    32kB / 25.8kB     0B / 274kB        41
9f895aa919e1   tx2-dxh1-a4-gw-w   0.04%     316.7MiB / 1.465GiB   21.11%    31.3kB / 25.6kB   0B / 270kB        41
96081c156dec   tx2-dxh1-a4-tx     0.20%     274MiB / 1.465GiB     18.27%    63.4kB / 74.2kB   0B / 328kB        53
c450f000238b   tx2-dxh1-a4-pg     0.01%     53.91MiB / 512MiB     10.53%    72.7kB / 67.7kB   0B / 48.8MB       15
03c359640b71   tx2-dxb1-dev       71.31%    906.8MiB / 3GiB       29.52%    17.2MB / 24.7MB   0B / 1.09MB       1311
943630e10a15   tx2-xtdb-s1        0.69%     795.4MiB / 3.5GiB     22.19%    551MB / 5.05GB    77MB / 2.09GB     50
1acfc78a670c   tx2-dxs1-tx        0.15%     1.111GiB / 2GiB       55.54%    493MB / 537MB     84.5MB / 17.8MB   96
5856becf11c3   tx2-dxs1-pg        0.11%     155.5MiB / 1GiB       15.19%    293MB / 264MB     40.5MB / 533MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.576GiB / 3.5GiB     45.04%    367kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:30:46 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.15%     320MiB / 1.465GiB     21.33%    33.7kB / 28.5kB   0B / 336kB        41
9f895aa919e1   tx2-dxh1-a4-gw-w   0.04%     316.8MiB / 1.465GiB   21.12%    33kB / 28.3kB     0B / 328kB        41
96081c156dec   tx2-dxh1-a4-tx     0.15%     274.4MiB / 1.465GiB   18.29%    71.4kB / 85.1kB   0B / 401kB        53
c450f000238b   tx2-dxh1-a4-pg     0.00%     53.92MiB / 512MiB     10.53%    80.1kB / 70.4kB   0B / 49.2MB       15
03c359640b71   tx2-dxb1-dev       102.24%   477.7MiB / 3GiB       15.55%    682B / 242B       0B / 115kB        65
943630e10a15   tx2-xtdb-s1        0.58%     760.8MiB / 3.5GiB     21.23%    552MB / 5.05GB    77MB / 2.1GB      44
1acfc78a670c   tx2-dxs1-tx        0.11%     1.114GiB / 2GiB       55.68%    516MB / 565MB     84.5MB / 22.6MB   110
5856becf11c3   tx2-dxs1-pg        0.09%     161MiB / 1GiB         15.72%    308MB / 277MB     40.5MB / 617MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.05%    368kB / 2.07MB    181MB / 519MB     13
```


### q1-pair-window

```text
Mon Nov  9 21:01:32 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   1.34%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.8MB   0B / 1.81MB      48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.14%     611.5MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.74MB      79
96081c156dec   tx2-dxh1-a4-tx     0.28%     327.3MiB / 1.465GiB   21.82%    14.7MB / 17.7MB   0B / 2.44MB      76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61.52MiB / 512MiB     12.01%    9.24MB / 8.55MB   0B / 92.5MB      16
03c359640b71   tx2-dxb1-dev       0.69%     939.7MiB / 3GiB       30.59%    17.5MB / 25.8MB   0B / 67.6MB      1391
943630e10a15   tx2-xtdb-s1        1.58%     766.1MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.17GB    46
1acfc78a670c   tx2-dxs1-tx        0.68%     294.2MiB / 2GiB       14.36%    970kB / 793kB     12.3kB / 238kB   53
5856becf11c3   tx2-dxs1-pg        0.13%     55.14MiB / 1GiB       5.39%     121kB / 517kB     28.7kB / 393kB   8
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.576GiB / 3.5GiB     45.02%    369kB / 2.07MB    181MB / 519MB    13
Mon Nov  9 21:02:12 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.66%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 1.85MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.11%     611.5MiB / 1.465GiB   40.77%    27.2MB / 30.3MB   0B / 1.78MB       79
96081c156dec   tx2-dxh1-a4-tx     0.77%     327.3MiB / 1.465GiB   21.82%    14.7MB / 17.7MB   0B / 2.49MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61.52MiB / 512MiB     12.01%    9.25MB / 8.55MB   0B / 92.8MB       16
03c359640b71   tx2-dxb1-dev       4.14%     939.7MiB / 3GiB       30.59%    17.5MB / 25.8MB   0B / 67.9MB       1391
943630e10a15   tx2-xtdb-s1        1.89%     765.9MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.17GB     44
1acfc78a670c   tx2-dxs1-tx        0.39%     709.3MiB / 2GiB       34.63%    45.2MB / 53.2MB   12.3kB / 9.34MB   88
5856becf11c3   tx2-dxs1-pg        0.05%     74.93MiB / 1GiB       7.32%     29.2MB / 25.7MB   28.7kB / 393kB    12
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.576GiB / 3.5GiB     45.02%    369kB / 2.07MB    181MB / 519MB     13
```


### q1-pg-sample-window

```text
Mon Nov  9 20:48:45 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.05%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.04MB      48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.04%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.04MB      80
96081c156dec   tx2-dxh1-a4-tx     0.31%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.47MB      76
c450f000238b   tx2-dxh1-a4-pg     0.55%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.6MB      16
03c359640b71   tx2-dxb1-dev       84.01%    781.9MiB / 3GiB       25.45%    7.01MB / 14.3MB   0B / 2.6MB       724
943630e10a15   tx2-xtdb-s1        0.84%     763MiB / 3.5GiB       21.29%    552MB / 5.05GB    77MB / 2.14GB    44
1acfc78a670c   tx2-dxs1-tx        0.11%     1.119GiB / 2GiB       55.94%    697MB / 779MB     84.7MB / 33MB    110
5856becf11c3   tx2-dxs1-pg        0.02%     197.5MiB / 1GiB       19.29%    427MB / 380MB     40.5MB / 909MB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.06%    368kB / 2.07MB    181MB / 519MB    13
Mon Nov  9 20:48:56 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.07MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.06%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.07MB       80
96081c156dec   tx2-dxh1-a4-tx     0.11%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.51MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.6MB       16
03c359640b71   tx2-dxb1-dev       86.61%    839.8MiB / 3GiB       27.34%    9.59MB / 18.2MB   0B / 3.88MB       865
943630e10a15   tx2-xtdb-s1        0.59%     763MiB / 3.5GiB       21.29%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.10%     1.119GiB / 2GiB       55.95%    698MB / 781MB     84.7MB / 33.4MB   110
5856becf11c3   tx2-dxs1-pg        0.01%     198.8MiB / 1GiB       19.42%    428MB / 382MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.07%    368kB / 2.07MB    181MB / 519MB     13
```


### q2-a-window

```text
Mon Nov  9 20:49:33 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.05%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.11MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.18%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.12MB       79
96081c156dec   tx2-dxh1-a4-tx     0.39%     326.9MiB / 1.465GiB   21.80%    14.6MB / 17.5MB   0B / 1.6MB        76
c450f000238b   tx2-dxh1-a4-pg     0.08%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.7MB       16
03c359640b71   tx2-dxb1-dev       65.95%    942.6MiB / 3GiB       30.68%    18.1MB / 30.8MB   0B / 22.2MB       1443
943630e10a15   tx2-xtdb-s1        0.84%     764.8MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.14GB     46
1acfc78a670c   tx2-dxs1-tx        0.32%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.5MB   99
5856becf11c3   tx2-dxs1-pg        0.05%     198.9MiB / 1GiB       19.42%    428MB / 390MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.07%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:49:52 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.15MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.10%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.15MB       79
96081c156dec   tx2-dxh1-a4-tx     0.33%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.64MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.7MB       16
03c359640b71   tx2-dxb1-dev       1.69%     978.1MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 34.6MB       1603
943630e10a15   tx2-xtdb-s1        1.27%     764.8MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.14GB     46
1acfc78a670c   tx2-dxs1-tx        0.86%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.5MB   99
5856becf11c3   tx2-dxs1-pg        0.00%     198.8MiB / 1GiB       19.42%    428MB / 394MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     15.71%    1.583GiB / 3.5GiB     45.22%    368kB / 2.07MB    181MB / 519MB     16
```


### q2-b-window

```text
Mon Nov  9 20:49:54 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.19%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.15MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.11%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.15MB       79
96081c156dec   tx2-dxh1-a4-tx     0.25%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.64MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.7MB       16
03c359640b71   tx2-dxb1-dev       0.61%     978.1MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 34.6MB       1602
943630e10a15   tx2-xtdb-s1        1.75%     765.1MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.14GB     46
1acfc78a670c   tx2-dxs1-tx        0.73%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.5MB   97
5856becf11c3   tx2-dxs1-pg        0.00%     198.8MiB / 1GiB       19.42%    428MB / 394MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:50:09 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.13%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.16MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.34%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.16MB       79
96081c156dec   tx2-dxh1-a4-tx     0.53%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.68MB       76
c450f000238b   tx2-dxh1-a4-pg     0.02%     60.98MiB / 512MiB     11.91%    9.17MB / 8.52MB   0B / 70.8MB       16
03c359640b71   tx2-dxb1-dev       0.37%     979MiB / 3GiB         31.87%    20.5MB / 34.3MB   0B / 35.2MB       1608
943630e10a15   tx2-xtdb-s1        1.05%     764.6MiB / 3.5GiB     21.33%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.26%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.6MB   93
5856becf11c3   tx2-dxs1-pg        0.02%     198.8MiB / 1GiB       19.42%    428MB / 399MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     33.79%    1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
```


### q2-c-window

```text
Mon Nov  9 20:50:11 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.54%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.16MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.18%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.16MB       79
96081c156dec   tx2-dxh1-a4-tx     0.27%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.68MB       76
c450f000238b   tx2-dxh1-a4-pg     0.05%     60.98MiB / 512MiB     11.91%    9.17MB / 8.52MB   0B / 70.8MB       16
03c359640b71   tx2-dxb1-dev       1.07%     979MiB / 3GiB         31.87%    20.5MB / 34.3MB   0B / 35.2MB       1608
943630e10a15   tx2-xtdb-s1        1.29%     764.6MiB / 3.5GiB     21.33%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.29%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.6MB   93
5856becf11c3   tx2-dxs1-pg        0.00%     198.8MiB / 1GiB       19.42%    428MB / 399MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:50:23 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.12%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.18MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.25%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.18MB       79
96081c156dec   tx2-dxh1-a4-tx     0.48%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.71MB       76
c450f000238b   tx2-dxh1-a4-pg     0.14%     60.98MiB / 512MiB     11.91%    9.17MB / 8.52MB   0B / 70.8MB       16
03c359640b71   tx2-dxb1-dev       0.43%     979MiB / 3GiB         31.87%    20.5MB / 34.3MB   0B / 35.4MB       1608
943630e10a15   tx2-xtdb-s1        1.55%     764.9MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.42%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.6MB   93
5856becf11c3   tx2-dxs1-pg        0.13%     198.8MiB / 1GiB       19.42%    428MB / 403MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
```


### q2-cold-window

```text
Mon Nov  9 20:48:59 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.05%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.07MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.12%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.07MB       80
96081c156dec   tx2-dxh1-a4-tx     0.17%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.51MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.6MB       16
03c359640b71   tx2-dxb1-dev       70.56%    846MiB / 3GiB         27.54%    10.1MB / 19MB     0B / 3.88MB       895
943630e10a15   tx2-xtdb-s1        0.76%     763MiB / 3.5GiB       21.29%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.19%     1.119GiB / 2GiB       55.95%    698MB / 781MB     84.7MB / 33.4MB   110
5856becf11c3   tx2-dxs1-pg        0.02%     198.9MiB / 1GiB       19.42%    428MB / 382MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.07%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:49:12 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.12%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.09MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.05%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.09MB       80
96081c156dec   tx2-dxh1-a4-tx     0.17%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.55MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.6MB       16
03c359640b71   tx2-dxb1-dev       68.17%    867.7MiB / 3GiB       28.25%    13.1MB / 23.4MB   0B / 5.61MB       1101
943630e10a15   tx2-xtdb-s1        0.83%     763MiB / 3.5GiB       21.29%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.12%     1.119GiB / 2GiB       55.95%    698MB / 781MB     84.7MB / 33.5MB   110
5856becf11c3   tx2-dxs1-pg        0.02%     198.9MiB / 1GiB       19.42%    428MB / 386MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.07%    368kB / 2.07MB    181MB / 519MB     13
```


### q2-parallel-b-window

```text
Mon Nov  9 20:50:25 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.21%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.18MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.62%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.18MB       79
96081c156dec   tx2-dxh1-a4-tx     0.16%     327MiB / 1.465GiB     21.80%    14.6MB / 17.5MB   0B / 1.71MB       76
c450f000238b   tx2-dxh1-a4-pg     1.44%     60.98MiB / 512MiB     11.91%    9.17MB / 8.52MB   0B / 70.8MB       16
03c359640b71   tx2-dxb1-dev       0.33%     979MiB / 3GiB         31.87%    20.5MB / 34.3MB   0B / 35.4MB       1608
943630e10a15   tx2-xtdb-s1        2.52%     764.6MiB / 3.5GiB     21.33%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.23%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.6MB   93
5856becf11c3   tx2-dxs1-pg        0.03%     198.8MiB / 1GiB       19.42%    428MB / 403MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     36.43%    1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:51:33 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.16%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.24MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.56%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.24MB       79
96081c156dec   tx2-dxh1-a4-tx     0.70%     327MiB / 1.465GiB     21.80%    14.6MB / 17.6MB   0B / 1.78MB       76
c450f000238b   tx2-dxh1-a4-pg     0.08%     61MiB / 512MiB        11.91%    9.17MB / 8.52MB   0B / 71MB         16
03c359640b71   tx2-dxb1-dev       0.55%     978.2MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 35.9MB       1576
943630e10a15   tx2-xtdb-s1        1.64%     764.7MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.56%     1.118GiB / 2GiB       55.89%    698MB / 781MB     84.7MB / 33.7MB   88
5856becf11c3   tx2-dxs1-pg        0.13%     198.8MiB / 1GiB       19.42%    428MB / 407MB     40.5MB / 916MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.88%    368kB / 2.07MB    181MB / 519MB     13
```


### q2-parallel-c-window

```text
Mon Nov  9 20:51:35 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.15%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.24MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.10%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.24MB       79
96081c156dec   tx2-dxh1-a4-tx     0.25%     327MiB / 1.465GiB     21.80%    14.6MB / 17.6MB   0B / 1.78MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61MiB / 512MiB        11.91%    9.17MB / 8.52MB   0B / 71MB         16
03c359640b71   tx2-dxb1-dev       0.38%     978.2MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 35.9MB       1576
943630e10a15   tx2-xtdb-s1        2.64%     764.7MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.24%     1.118GiB / 2GiB       55.89%    698MB / 781MB     84.7MB / 33.7MB   88
5856becf11c3   tx2-dxs1-pg        0.97%     198.8MiB / 1GiB       19.42%    428MB / 407MB     40.5MB / 916MB    14
a809fb6cb3ba   tx2-qlever-dev     22.94%    1.586GiB / 3.5GiB     45.30%    368kB / 2.07MB    181MB / 519MB     16
Mon Nov  9 20:52:43 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.18%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.29MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.33%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.29MB       79
96081c156dec   tx2-dxh1-a4-tx     0.25%     327.1MiB / 1.465GiB   21.81%    14.6MB / 17.6MB   0B / 1.84MB       76
c450f000238b   tx2-dxh1-a4-pg     0.16%     61.48MiB / 512MiB     12.01%    9.18MB / 8.53MB   0B / 91.3MB       16
03c359640b71   tx2-dxb1-dev       0.51%     978.2MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 36.4MB       1576
943630e10a15   tx2-xtdb-s1        1.63%     765.1MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.64%     1.118GiB / 2GiB       55.89%    698MB / 781MB     84.7MB / 33.7MB   87
5856becf11c3   tx2-dxs1-pg        0.21%     198.8MiB / 1GiB       19.42%    429MB / 412MB     40.5MB / 916MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.589GiB / 3.5GiB     45.40%    368kB / 2.07MB    181MB / 519MB     13
```


### q2-verify-window

```text
Mon Nov  9 20:49:14 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.12%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.09MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.05%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.09MB       80
96081c156dec   tx2-dxh1-a4-tx     0.45%     326.9MiB / 1.465GiB   21.80%    14.6MB / 17.5MB   0B / 1.55MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.6MB       16
03c359640b71   tx2-dxb1-dev       82.16%    875.7MiB / 3GiB       28.51%    13.6MB / 24.2MB   0B / 5.61MB       1137
943630e10a15   tx2-xtdb-s1        1.46%     763MiB / 3.5GiB       21.29%    552MB / 5.05GB    77MB / 2.14GB     44
1acfc78a670c   tx2-dxs1-tx        0.21%     1.119GiB / 2GiB       55.95%    698MB / 781MB     84.7MB / 33.5MB   110
5856becf11c3   tx2-dxs1-pg        0.01%     198.9MiB / 1GiB       19.42%    428MB / 386MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     44.19%    1.577GiB / 3.5GiB     45.07%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:49:31 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.24%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.11MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.07%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.12MB       79
96081c156dec   tx2-dxh1-a4-tx     0.12%     326.9MiB / 1.465GiB   21.80%    14.6MB / 17.5MB   0B / 1.6MB        76
c450f000238b   tx2-dxh1-a4-pg     0.00%     60.98MiB / 512MiB     11.91%    9.16MB / 8.52MB   0B / 70.7MB       16
03c359640b71   tx2-dxb1-dev       69.48%    935.4MiB / 3GiB       30.45%    17.6MB / 30MB     0B / 22.2MB       1409
943630e10a15   tx2-xtdb-s1        34.31%    764.8MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.14GB     46
1acfc78a670c   tx2-dxs1-tx        0.11%     1.119GiB / 2GiB       55.93%    698MB / 781MB     84.7MB / 33.5MB   99
5856becf11c3   tx2-dxs1-pg        0.00%     198.9MiB / 1GiB       19.42%    428MB / 390MB     40.5MB / 915MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.07%    368kB / 2.07MB    181MB / 519MB     13
```


### q3-window

```text
Mon Nov  9 20:58:45 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.7MB   0B / 1.63MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.12%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.57MB       79
96081c156dec   tx2-dxh1-a4-tx     0.20%     327.2MiB / 1.465GiB   21.81%    14.6MB / 17.6MB   0B / 2.22MB       76
c450f000238b   tx2-dxh1-a4-pg     0.05%     61.48MiB / 512MiB     12.01%    9.22MB / 8.54MB   0B / 92.1MB       16
03c359640b71   tx2-dxb1-dev       0.94%     939.4MiB / 3GiB       30.58%    17.5MB / 25.8MB   0B / 66.3MB       1391
943630e10a15   tx2-xtdb-s1        1.43%     765.3MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.16GB     44
1acfc78a670c   tx2-dxs1-tx        0.33%     1.131GiB / 2GiB       56.57%    771MB / 872MB     84.7MB / 51.3MB   100
5856becf11c3   tx2-dxs1-pg        0.22%     211.7MiB / 1GiB       20.67%    479MB / 464MB     40.5MB / 1.21GB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.582GiB / 3.5GiB     45.20%    369kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:59:16 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.59%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.8MB   0B / 1.65MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.14%     611.5MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.6MB        79
96081c156dec   tx2-dxh1-a4-tx     0.32%     327.2MiB / 1.465GiB   21.82%    14.7MB / 17.6MB   0B / 2.25MB       76
c450f000238b   tx2-dxh1-a4-pg     0.03%     61.48MiB / 512MiB     12.01%    9.23MB / 8.54MB   0B / 92.2MB       16
03c359640b71   tx2-dxb1-dev       0.92%     939.5MiB / 3GiB       30.58%    17.5MB / 25.8MB   0B / 66.5MB       1391
943630e10a15   tx2-xtdb-s1        1.42%     765.7MiB / 3.5GiB     21.36%    552MB / 5.05GB    77MB / 2.16GB     44
1acfc78a670c   tx2-dxs1-tx        0.33%     1.142GiB / 2GiB       57.09%    798MB / 899MB     84.7MB / 51.5MB   118
5856becf11c3   tx2-dxs1-pg        0.25%     211.8MiB / 1GiB       20.69%    494MB / 480MB     40.5MB / 1.23GB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.561GiB / 3.5GiB     44.61%    369kB / 2.07MB    181MB / 519MB     13
```


### q4-alone-window

```text
Mon Nov  9 20:52:45 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.3MiB / 1.465GiB   34.62%    2.06MB / 12.7MB   0B / 1.29MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.14%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.29MB       79
96081c156dec   tx2-dxh1-a4-tx     0.23%     327.1MiB / 1.465GiB   21.81%    14.6MB / 17.6MB   0B / 1.84MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61.48MiB / 512MiB     12.01%    9.18MB / 8.53MB   0B / 91.3MB       16
03c359640b71   tx2-dxb1-dev       0.45%     978.2MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 36.4MB       1576
943630e10a15   tx2-xtdb-s1        1.78%     764.8MiB / 3.5GiB     21.34%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.32%     1.118GiB / 2GiB       55.89%    698MB / 781MB     84.7MB / 33.7MB   87
5856becf11c3   tx2-dxs1-pg        0.03%     198.8MiB / 1GiB       19.42%    429MB / 412MB     40.5MB / 916MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.589GiB / 3.5GiB     45.40%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:53:55 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.13%     519.9MiB / 1.465GiB   34.66%    2.06MB / 12.7MB   0B / 1.35MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.14%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.34MB       79
96081c156dec   tx2-dxh1-a4-tx     0.18%     327.2MiB / 1.465GiB   21.81%    14.6MB / 17.6MB   0B / 1.91MB       76
c450f000238b   tx2-dxh1-a4-pg     0.08%     61.48MiB / 512MiB     12.01%    9.19MB / 8.53MB   0B / 91.4MB       16
03c359640b71   tx2-dxb1-dev       0.52%     978.2MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 36.9MB       1576
943630e10a15   tx2-xtdb-s1        1.53%     765MiB / 3.5GiB       21.34%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.24%     1.12GiB / 2GiB        55.99%    722MB / 810MB     84.7MB / 38.5MB   109
5856becf11c3   tx2-dxs1-pg        1.67%     205.5MiB / 1GiB       20.07%    445MB / 425MB     40.5MB / 997MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.583GiB / 3.5GiB     45.23%    368kB / 2.07MB    181MB / 519MB     13
```


### q4-samedb-alone-window

```text
Mon Nov  9 21:02:18 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.42%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 1.85MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.41%     611.5MiB / 1.465GiB   40.77%    27.2MB / 30.3MB   0B / 1.78MB       79
96081c156dec   tx2-dxh1-a4-tx     0.95%     327.4MiB / 1.465GiB   21.83%    14.7MB / 17.7MB   0B / 2.49MB       76
c450f000238b   tx2-dxh1-a4-pg     0.17%     61.52MiB / 512MiB     12.01%    9.25MB / 8.55MB   0B / 92.8MB       16
03c359640b71   tx2-dxb1-dev       2.50%     941.7MiB / 3GiB       30.65%    17.6MB / 25.9MB   69.6kB / 67.9MB   1417
943630e10a15   tx2-xtdb-s1        2.38%     765.9MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.17GB     44
1acfc78a670c   tx2-dxs1-tx        0.75%     709.3MiB / 2GiB       34.63%    45.2MB / 53.2MB   12.3kB / 9.34MB   88
5856becf11c3   tx2-dxs1-pg        0.14%     74.93MiB / 1GiB       7.32%     29.2MB / 25.7MB   28.7kB / 393kB    12
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.576GiB / 3.5GiB     45.02%    369kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 21:03:32 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   1.42%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 1.9MB        48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.13%     611.6MiB / 1.465GiB   40.77%    27.2MB / 30.3MB   0B / 1.86MB       79
96081c156dec   tx2-dxh1-a4-tx     1.35%     329.5MiB / 1.465GiB   21.97%    14.7MB / 17.7MB   0B / 2.57MB       76
c450f000238b   tx2-dxh1-a4-pg     0.01%     61.52MiB / 512MiB     12.01%    9.26MB / 8.56MB   0B / 92.9MB       16
03c359640b71   tx2-dxb1-dev       0.65%     941.3MiB / 3GiB       30.64%    17.6MB / 25.9MB   69.6kB / 69.2MB   1397
943630e10a15   tx2-xtdb-s1        2.64%     765.9MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.17GB     44
1acfc78a670c   tx2-dxs1-tx        0.84%     752.2MiB / 2GiB       36.73%    67.1MB / 78.8MB   12.3kB / 14MB     92
5856becf11c3   tx2-dxs1-pg        0.22%     83.79MiB / 1GiB       8.18%     42.6MB / 37.5MB   28.7kB / 2.47MB   12
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.576GiB / 3.5GiB     45.02%    369kB / 2.07MB    181MB / 519MB     13
```


### q4-samedb-separate-window

```text
Mon Nov  9 21:03:34 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.20%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 1.9MB        48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.47%     611.6MiB / 1.465GiB   40.77%    27.2MB / 30.3MB   0B / 1.86MB       79
96081c156dec   tx2-dxh1-a4-tx     0.36%     329.6MiB / 1.465GiB   21.97%    14.7MB / 17.7MB   0B / 2.57MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61.52MiB / 512MiB     12.01%    9.26MB / 8.56MB   0B / 93MB         16
03c359640b71   tx2-dxb1-dev       0.92%     941.5MiB / 3GiB       30.65%    17.6MB / 25.9MB   69.6kB / 69.2MB   1397
943630e10a15   tx2-xtdb-s1        1.47%     765.9MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.18GB     44
1acfc78a670c   tx2-dxs1-tx        0.36%     752.2MiB / 2GiB       36.73%    67.1MB / 78.8MB   12.3kB / 14MB     92
5856becf11c3   tx2-dxs1-pg        0.03%     83.79MiB / 1GiB       8.18%     42.6MB / 37.5MB   28.7kB / 2.47MB   12
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.576GiB / 3.5GiB     45.02%    369kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 21:05:01 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 1.97MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.11%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 1.95MB       79
96081c156dec   tx2-dxh1-a4-tx     0.38%     326.3MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.69MB       76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61.52MiB / 512MiB     12.01%    9.27MB / 8.56MB   0B / 93.1MB       16
03c359640b71   tx2-dxb1-dev       1.28%     941.3MiB / 3GiB       30.64%    17.6MB / 25.9MB   69.6kB / 69.7MB   1397
943630e10a15   tx2-xtdb-s1        1.39%     765.9MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.18GB     44
1acfc78a670c   tx2-dxs1-tx        0.37%     1006MiB / 2GiB        49.12%    89.9MB / 119MB    12.3kB / 18.8MB   93
5856becf11c3   tx2-dxs1-pg        0.20%     95.09MiB / 1GiB       9.29%     58.3MB / 56.3MB   28.7kB / 8.11MB   12
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.569GiB / 3.5GiB     44.84%    369kB / 2.07MB    181MB / 519MB     13
```


### q4-samedb-shared-window

```text
Mon Nov  9 21:05:03 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 1.97MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.08%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 1.95MB       79
96081c156dec   tx2-dxh1-a4-tx     0.18%     326.3MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.69MB       76
c450f000238b   tx2-dxh1-a4-pg     0.03%     61.52MiB / 512MiB     12.01%    9.27MB / 8.56MB   0B / 93.1MB       16
03c359640b71   tx2-dxb1-dev       0.61%     941.3MiB / 3GiB       30.64%    17.6MB / 25.9MB   69.6kB / 69.7MB   1397
943630e10a15   tx2-xtdb-s1        4.09%     765.9MiB / 3.5GiB     21.37%    552MB / 5.05GB    77MB / 2.18GB     44
1acfc78a670c   tx2-dxs1-tx        1.50%     1006MiB / 2GiB        49.12%    89.9MB / 119MB    12.3kB / 18.8MB   93
5856becf11c3   tx2-dxs1-pg        0.43%     95.09MiB / 1GiB       9.29%     58.3MB / 56.3MB   28.7kB / 8.37MB   12
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.569GiB / 3.5GiB     44.84%    369kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 21:06:27 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.42%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 2.03MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.12%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 2.04MB       79
96081c156dec   tx2-dxh1-a4-tx     0.26%     326.4MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.79MB       76
c450f000238b   tx2-dxh1-a4-pg     0.02%     61.52MiB / 512MiB     12.01%    9.27MB / 8.56MB   0B / 93.3MB       16
03c359640b71   tx2-dxb1-dev       0.82%     941.4MiB / 3GiB       30.64%    17.6MB / 25.9MB   69.6kB / 70.3MB   1397
943630e10a15   tx2-xtdb-s1        1.54%     766MiB / 3.5GiB       21.37%    552MB / 5.05GB    77MB / 2.18GB     44
1acfc78a670c   tx2-dxs1-tx        0.31%     1.093GiB / 2GiB       54.67%    113MB / 159MB     12.3kB / 23.5MB   102
5856becf11c3   tx2-dxs1-pg        0.28%     105.8MiB / 1GiB       10.33%    74.5MB / 76MB     28.7kB / 25.9MB   13
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.569GiB / 3.5GiB     44.84%    369kB / 2.07MB    181MB / 519MB     13
```


### q4-separate-window

```text
Mon Nov  9 20:53:57 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.70%     519.9MiB / 1.465GiB   34.66%    2.06MB / 12.7MB   0B / 1.35MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.07%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.34MB       79
96081c156dec   tx2-dxh1-a4-tx     0.21%     327.2MiB / 1.465GiB   21.81%    14.6MB / 17.6MB   0B / 1.91MB       76
c450f000238b   tx2-dxh1-a4-pg     0.02%     61.48MiB / 512MiB     12.01%    9.19MB / 8.53MB   0B / 91.4MB       16
03c359640b71   tx2-dxb1-dev       0.52%     978.2MiB / 3GiB       31.84%    20.5MB / 34.3MB   0B / 36.9MB       1576
943630e10a15   tx2-xtdb-s1        2.66%     765MiB / 3.5GiB       21.34%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.20%     1.12GiB / 2GiB        55.99%    722MB / 810MB     84.7MB / 38.5MB   109
5856becf11c3   tx2-dxs1-pg        0.28%     205.5MiB / 1GiB       20.07%    445MB / 425MB     40.5MB / 997MB    14
a809fb6cb3ba   tx2-qlever-dev     37.56%    1.583GiB / 3.5GiB     45.23%    368kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:55:17 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.19%     519.9MiB / 1.465GiB   34.66%    2.06MB / 12.7MB   0B / 1.44MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.04%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.41MB       79
96081c156dec   tx2-dxh1-a4-tx     0.38%     325.7MiB / 1.465GiB   21.72%    14.6MB / 17.6MB   0B / 2MB          76
c450f000238b   tx2-dxh1-a4-pg     0.01%     61.48MiB / 512MiB     12.01%    9.2MB / 8.53MB    0B / 91.6MB       16
03c359640b71   tx2-dxb1-dev       99.96%    608.6MiB / 3GiB       19.81%    628kB / 841kB     0B / 217kB        238
943630e10a15   tx2-xtdb-s1        0.70%     765.3MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.15%     1.121GiB / 2GiB       56.07%    745MB / 838MB     84.7MB / 43.3MB   120
5856becf11c3   tx2-dxs1-pg        0.11%     211.3MiB / 1GiB       20.64%    461MB / 443MB     40.5MB / 1.08GB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.588GiB / 3.5GiB     45.37%    369kB / 2.07MB    181MB / 519MB     13
```


### q4-shared-window

```text
Mon Nov  9 20:55:19 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.05%     519.9MiB / 1.465GiB   34.66%    2.06MB / 12.7MB   0B / 1.44MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.06%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.41MB       79
96081c156dec   tx2-dxh1-a4-tx     0.08%     325.7MiB / 1.465GiB   21.72%    14.6MB / 17.6MB   0B / 2MB          76
c450f000238b   tx2-dxh1-a4-pg     0.01%     61.48MiB / 512MiB     12.01%    9.2MB / 8.53MB    0B / 91.6MB       16
03c359640b71   tx2-dxb1-dev       91.08%    613.8MiB / 3GiB       19.98%    863kB / 1.23MB    0B / 217kB        250
943630e10a15   tx2-xtdb-s1        0.67%     765.3MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.15GB     44
1acfc78a670c   tx2-dxs1-tx        0.16%     1.121GiB / 2GiB       56.07%    745MB / 838MB     84.7MB / 43.3MB   120
5856becf11c3   tx2-dxs1-pg        0.09%     211.3MiB / 1GiB       20.64%    461MB / 443MB     40.5MB / 1.08GB   14
a809fb6cb3ba   tx2-qlever-dev     25.95%    1.596GiB / 3.5GiB     45.61%    369kB / 2.07MB    181MB / 519MB     16
Mon Nov  9 20:56:41 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.17%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.7MB   0B / 1.53MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.06%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.48MB       79
96081c156dec   tx2-dxh1-a4-tx     0.13%     325.7MiB / 1.465GiB   21.72%    14.6MB / 17.6MB   0B / 2.09MB       76
c450f000238b   tx2-dxh1-a4-pg     0.01%     61.48MiB / 512MiB     12.01%    9.21MB / 8.54MB   0B / 91.8MB       16
03c359640b71   tx2-dxb1-dev       83.46%    896.1MiB / 3GiB       29.17%    14.9MB / 21.8MB   0B / 49.9MB       1225
943630e10a15   tx2-xtdb-s1        0.89%     765.3MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.16GB     44
1acfc78a670c   tx2-dxs1-tx        0.11%     1.131GiB / 2GiB       56.53%    766MB / 863MB     84.7MB / 48.1MB   103
5856becf11c3   tx2-dxs1-pg        0.13%     211.6MiB / 1GiB       20.66%    474MB / 458MB     40.5MB / 1.15GB   14
a809fb6cb3ba   tx2-qlever-dev     41.00%    1.596GiB / 3.5GiB     45.61%    369kB / 2.07MB    181MB / 519MB     16
```


### q5-window

```text
Mon Nov  9 20:56:43 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.06%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.7MB   0B / 1.53MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.22%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.48MB       79
96081c156dec   tx2-dxh1-a4-tx     0.50%     325.7MiB / 1.465GiB   21.72%    14.6MB / 17.6MB   0B / 2.09MB       76
c450f000238b   tx2-dxh1-a4-pg     0.06%     61.48MiB / 512MiB     12.01%    9.21MB / 8.54MB   0B / 91.8MB       16
03c359640b71   tx2-dxb1-dev       68.51%    903.6MiB / 3GiB       29.41%    15.3MB / 22.4MB   0B / 49.9MB       1254
943630e10a15   tx2-xtdb-s1        1.72%     765.3MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.16GB     44
1acfc78a670c   tx2-dxs1-tx        0.33%     1.13GiB / 2GiB        56.52%    766MB / 863MB     84.7MB / 48.1MB   102
5856becf11c3   tx2-dxs1-pg        0.21%     211.6MiB / 1GiB       20.66%    474MB / 458MB     40.5MB / 1.15GB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.582GiB / 3.5GiB     45.19%    369kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 20:58:43 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.13%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.7MB   0B / 1.63MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.58%     611.4MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.57MB       79
96081c156dec   tx2-dxh1-a4-tx     9.34%     327.2MiB / 1.465GiB   21.81%    14.6MB / 17.6MB   0B / 2.22MB       76
c450f000238b   tx2-dxh1-a4-pg     0.17%     61.48MiB / 512MiB     12.01%    9.22MB / 8.54MB   0B / 92.1MB       16
03c359640b71   tx2-dxb1-dev       1.25%     939.4MiB / 3GiB       30.58%    17.5MB / 25.8MB   0B / 66.3MB       1391
943630e10a15   tx2-xtdb-s1        1.26%     765.3MiB / 3.5GiB     21.35%    552MB / 5.05GB    77MB / 2.16GB     44
1acfc78a670c   tx2-dxs1-tx        0.57%     1.131GiB / 2GiB       56.57%    771MB / 872MB     84.7MB / 51.3MB   100
5856becf11c3   tx2-dxs1-pg        0.39%     211.7MiB / 1GiB       20.67%    479MB / 464MB     40.5MB / 1.21GB   14
a809fb6cb3ba   tx2-qlever-dev     10.44%    1.582GiB / 3.5GiB     45.20%    369kB / 2.07MB    181MB / 519MB     13
```


### q6-window

```text
Mon Nov  9 20:59:19 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.8MB   0B / 1.65MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.38%     611.5MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.6MB        79
96081c156dec   tx2-dxh1-a4-tx     0.82%     327.2MiB / 1.465GiB   21.82%    14.7MB / 17.6MB   0B / 2.25MB       76
c450f000238b   tx2-dxh1-a4-pg     0.19%     61.48MiB / 512MiB     12.01%    9.23MB / 8.54MB   0B / 92.2MB       16
03c359640b71   tx2-dxb1-dev       0.51%     939.5MiB / 3GiB       30.58%    17.5MB / 25.8MB   0B / 66.5MB       1391
943630e10a15   tx2-xtdb-s1        1.43%     765.4MiB / 3.5GiB     21.36%    552MB / 5.05GB    77MB / 2.16GB     44
1acfc78a670c   tx2-dxs1-tx        0.48%     1.142GiB / 2GiB       57.09%    798MB / 899MB     84.7MB / 51.5MB   118
5856becf11c3   tx2-dxs1-pg        0.37%     211.8MiB / 1GiB       20.69%    494MB / 480MB     40.5MB / 1.23GB   14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.561GiB / 3.5GiB     44.61%    369kB / 2.07MB    181MB / 519MB     13
Mon Nov  9 21:00:18 UTC 2026
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.15%     519.9MiB / 1.465GiB   34.66%    2.07MB / 12.8MB   0B / 1.78MB      48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.10%     611.5MiB / 1.465GiB   40.76%    27.2MB / 30.3MB   0B / 1.7MB       79
96081c156dec   tx2-dxh1-a4-tx     0.14%     327.3MiB / 1.465GiB   21.82%    14.7MB / 17.6MB   0B / 2.4MB       76
c450f000238b   tx2-dxh1-a4-pg     0.19%     61.52MiB / 512MiB     12.02%    9.23MB / 8.55MB   0B / 92.4MB      16
03c359640b71   tx2-dxb1-dev       0.45%     939.9MiB / 3GiB       30.59%    17.5MB / 25.8MB   0B / 67.1MB      1391
943630e10a15   tx2-xtdb-s1        1.20%     765.6MiB / 3.5GiB     21.36%    552MB / 5.05GB    77MB / 2.17GB    44
1acfc78a670c   tx2-dxs1-tx        0.56%     294.3MiB / 2GiB       14.37%    966kB / 784kB     12.3kB / 209kB   71
5856becf11c3   tx2-dxs1-pg        0.13%     55.09MiB / 1GiB       5.38%     112kB / 514kB     28.7kB / 393kB   8
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.587GiB / 3.5GiB     45.35%    369kB / 2.07MB    181MB / 519MB    13
```


## Limits, checks and cleanup

No Triplex public path, TypeScript/HTTP overhead, idempotency, lost-ACK resolution, tenant isolation, erasure, 256-reader trace, W0 correctness, 100k sweep or year-one storage scale was measured. No target bar is closed by this spike. Q5 did not instrument peer CPU; Q6 reports marker counts rather than latency/CPU distributions. Read-cache construction/invalidation and evolving-basis correctness are outside these static cache measurements. Cold storage caches were not cleared. Output-byte flatness is not storage-read-byte flatness. The fixture differs from the exact lab graph as detailed in Q2. Percentiles are single windows, without repeated trials or confidence intervals. Shared VM work and shared storage can affect them.

Setup compilation failures are retained as `init.log`, `init-2.log`, `seed.log`, `seed-2.log`; none yielded a reported timing. Later successful attempts use distinct logs. Editing the running shell wrappers caused a closing parse error and the first remaining driver to stop after its four open-loop windows (`remaining.log`). The original completed measurements are retained; `resume-lock-first.sh` runs the missing windows and the labelled R3 repeat. A duplicate queued driver was stopped before it ran any peer. Final scripts are syntax-checked; no running script was subsequently edited. Only standalone files under this spike directory were changed; no acceptance contract or pinned existing source was edited. There are no PASS-producing acceptance paths or new receipts in this spike: reports are explicitly diagnostic, and the variant equality assertion checks content at a single captured basis from this seeded attempt. It is not independent verification.

All `tx2-dxs1-*` containers, network and volume are removed with `cleanup.sh` after copying engine logs/configs to evidence. Final Docker inventories are retained to verify absence. Existing containers were neither stopped nor removed by this work. Bulky raw evidence remains outside Git; `SHA256SUMS` and `EVIDENCE.md` index the durable directory.


## What was not done or could not be verified

- No Triplex package or public TypeScript/HTTP path was exercised; these measurements cannot close P1–P5 acceptance.
- No 256/1,024-reader matched hot-set trace, 100k-subject activation, year-one scale, W0 oracle or end-to-end projection work was measured.
- No cache invalidation/evolving-basis equivalence, mixed inactive valid-time rows, physical storage-read byte flatness, or exact frozen world.ts graph was checked.
- No repeated-trial confidence intervals or guaranteed quiet VM were available; other-container snapshots are reported for every window.
- Q5 measured peer notification, not durable affected-subject checkpoints/resume; it did not instrument CPU or independently track wall-clock adjustments.
- Q6 was one stop/recovery round per component, without VM/host power-loss or storage-controller fsync verification; it does not measure multi-round reliability.
- No tenant isolation, erasure, lost-ACK/idempotency contract, package check or independent acceptance review was run. No acceptance files were changed and no PASS was claimed.
