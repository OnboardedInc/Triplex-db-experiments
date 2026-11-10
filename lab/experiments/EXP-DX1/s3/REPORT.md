# DX-S3: burst-tail configuration spike

Completed diagnostic V0–V3; V4 was not admitted before the timebox cutoff. North star: P2 scheduled-offer-to-durable-ACK commit latency at 55 commands/s, with a diagnostic 32-reader arm. This is the PROTOCOL 0b spike, not a contract, receipt, independent review or scorecard qualification.

The completed initial V0 attempt strongly suggests a gateway-GC cause for the largest observed pauses: its 422.53 ms commit overlaps a 370.62 ms full collection in the write gateway. That commit has 406.04 ms in the gateway, 24.77 ms waiting for `d/transact`, and 4.97 ms in native transaction apply (8.49 ms for native processing). The V1 worst reader-arm commit is 1,088.62 ms end to end but 12.30 ms in native apply. These are specific joined observations, not an assignment of a minute's maximum to unrelated commands.

V1 has no overlapping checkpoints in its bursts, yet its worst no-reader p50/p99 is 15.80/67.11 ms and its reader p50/p99 is 21.62/687.51 ms. Postgres placement and sizing alone do not meet the requested bars. V2 worst no-reader p50/p99 is 16.99/67.84 ms and its reader result is 15.31/145.31 ms. V3 is 21.09/178.40 ms without readers and 25.03/215.18 ms with them. No completed full-mix configuration meets both bars; this does not establish an intrinsic 18k-datoms/s apply ceiling.

## What changed

Only `s3/**` and optional flags in `../stack/up.sh` changed. No `packages/**`, `lab/bench/**` or `lab/acceptance/**` source changed. Packages were built from base `8ff41660` using the offline-installed workspace dependencies. No merge, push, release or deployment was performed.

The launcher adds memory caps, JVM option strings, transactor memory-index/object-cache properties and Postgres settings, retaining previous defaults. In particular, the old transactor `JAVA_OPTS` remains `-Xms256m -Xmx2g`, while the old gateway `JAVA_OPTS` remains unchanged and the new `DATOMIC_JAVA_OPTS` is empty unless explicitly supplied. The added Postgres command is equivalent to the image's previous default command when no settings are supplied.

Local launcher inspection found that `bin/transactor` reads `JAVA_OPTS` but `bin/run` ignores it and reads `DATOMIC_JAVA_OPTS`. Thus V0's transactor actually has a 256 MiB initial / 2 GiB maximum G1 heap, while both gateways have 1 GiB initial/maximum heaps. Both V0 gateway GC logs report Serial GC, including the two-CPU read gateway. V1's gateways also use Serial GC. The image is Java 21.0.13 but has no `jcmd`; process arguments and GC startup records establish the effective heap and collector.

V2 onward sets the transactor object cache to 256 MiB and supplies `-Ddatomic.objectCacheMax=268435456` to both peers. Without the peer property, the default object cache grows to approximately half the heap. Local image class strings identify the property name, and V2's native `:cache/create` lines read back exactly 268,435,456 bytes on both peers.

## Procedure and interpretation

Each new configuration uses a fresh prefix, network, Postgres volume and scope, the unchanged public Triples/Datomic packages, the DX-B3 seed world of 2,000 subjects, and 200 hot writer subjects. Each of three writer cycles warms with 3,000 commits, times 1,000 serial commits and offers the same 3,291-command Poisson schedule over 60 seconds at a nominal 55/s. Commands preserve subject order with at most 32 in flight and no scope admission queue. Scheduled delay, subject ordering and cap waits remain in burst latency. All offered commands must finish; no deadline censoring or drop is used.

There is a 120-second idle pause between writer cycles, in addition to their serial blocks and any lock/CPU-check waits; actual timestamps are retained. Four worker threads with eight readers each reproduce DX-B3's reader recipe, including 5,000 warm-up pulls per worker. This is not the TARGETS 256-reader P1 qualification, nor a matched-rate reader experiment. The inherited reader recipe fixes valid time at worker setup.

V0 initially ran one serial block and all three bursts plus readers. A second V0 attempt began the fully repeated protocol but was interrupted between windows by the private Docker outage. Its two serial blocks and two bursts are retained separately. The optional extra matched-growth V0 rerun was not run: retained infrastructure/harness failures and global lock/CPU-check waits consumed its budget. This decision was recorded before any such rerun, not selected by its percentile. Initial V0 and V1 reader worlds have different accumulated command counts and are not a controlled relative-isolation comparison.

V2 and V3 request an index after every serial block and before readers. One hundred commits run alongside each request, using a separate stream and distant sequence range; the main shape sequence is restored. `completed:true` comes from `sync-index` at the freshly captured requested t. Native begin/end records determine whether indexing overlaps a burst or the probe commits.

Every timed window holds the shared measurement lock. The current runner retains a bounded lease, renews before timing when twelve minutes are spent, starts reader warm-up on a fresh lease, and has a 14.5-minute expiry. Early V0 used individual window leases. V1's largest actual hold was 850,476 ms (14m10.476s); its reader timing used a renewed lease. Whole-VM stats are recorded before every timed window; foreign CPU above 50% causes 30-second retries up to five minutes, then a disturbed flag. This records preflight interference, not a guarantee about the rest of the window.

Postgres durability remains on. V0 SHOW reads `fsync=on`, `synchronous_commit=on`, `full_page_writes=on`, shared buffers 128 MiB, WAL buffers 4 MiB, max WAL 1 GiB and checkpoint timeout 300 s. V1 onward requests shared buffers 512 MiB, WAL buffers 64 MiB, max WAL 8 GiB and checkpoint timeout 1,800 s. Each attempt retains its actual SHOW output and Docker readback.

## Clock and native binding

Host and VM UTC clocks are not identical. The initial startup probe bounds VM-ahead offset at 49.49–85.02 ms, but several later minute-long windows cannot fit any one constant alignment under the containment model. Clock drift and delayed native log/accounting timestamps have not been independently separated. The first constant-offset validator rejected V2 rather than publishing those counts. The final analysis uses each command's native execution interval contained within its client service interval, allowing two milliseconds for timestamp rounding, to bound its local offset. A nearest fast command (at most 20 ms-wide bounds, within one second of monotonic start time) supplies a nominal estimate clipped to those bounds; without one, the command's own midpoint is used. Model lower/upper overlaps span the full per-command bounds, not just that nominal estimate. Raw per-command alignments and source hashes are retained. **These bounds are conditional on containment of the logged native-processing interval inside the client service call; that assumption was not independently verified. No independent clock probes were captured throughout the measured bursts. Thus exact per-command causal attribution is incomplete, even where model-based overlaps are reported.** The retained runner now adds VM `date` output to its one-second cgroup probe for a future rerun; this added probe was syntax checked but was not part of the completed measurements, and the current analyzer does not yet consume it. Duration percentiles use monotonic clocks and are unaffected by this wall-clock correction.

Later runners record native t directly from each transact response. The first runner did not save it. For that attempt only, the analyzer accepts an inferred binding when the entire window has exactly N native transactions, unique ordered receipt positions/native t values, and the full ordered N-element datom-count sequence matches. All 14,164 timed commands in the first complete attempt match, with zero datom mismatches. `derived-native-bindings.json` records this derivation; raw observations are unchanged. Seven binding tests cover complete, missing/extra/stale native records, one wrong datom count, duplicate positions and replacement of a direct t binding; three more tests cover clock-bound overlaps and reject a large predecessor that ended before the offer.

Containment is a calibration constraint, not independent proof that the clocks agree. Transaction identity, datom counts, source/container bindings, request scope and recomputed latency formulas are checked separately. Long commands can have wide offset bounds, so their event classification can remain ambiguous. Overlap tables show nominal counts plus model lower–upper bounds; they use scheduled-offer-to-ACK intervals, with service-only counts also retained. Categories are nonexclusive. A large predecessor is counted only if its native interval overlaps the offer-to-ACK interval. Long checkpoint overlap alone does not establish causation. Minute maxima are contextual only.

The retained native logs do not expose a continuous memory-index-byte gauge. The analyzer retains native index-input log lines and reconstructs a clearly labelled transaction-datom proxy from native transactions and published `update/new-index` cuts (the JSON proxy's historical field name says “adopted”; it is not a direct resident-memory measurement). It is not a byte measurement. Per-second CPU data is actual cgroup `usage_usec` deltas from asynchronous one-second probes.

## Interruptions and retained failures

The private Docker socket became unreachable while the second V0 waited for the measurement lock. Its benchmark process was identified by exact command and parent, then stopped with SIGTERM (exit 143); it was not labelled a semantic failure or completion. Cleanup was unavailable during the outage, which is recorded in `cleanup-first-outage.json`. After the endpoint returned, `recover.py` copied native logs and GC files and removed that exact owned stack; fresh inventories then returned no containers, networks or volumes for it. No VM or unrelated container was restarted or stopped.

The first build invocation used pnpm's unsupported `--store-dir ... exec` syntax and failed before building; the corrected `--config.store-dir=... exec turbo run build --filter=@triplex-build/triplex-datomic...` succeeded for core, testkit and Datomic. Installation used the required offline/frozen/store-dir invocation. A first parser filter accidentally excluded the primary reader command file when finding predecessors; `analysis-first-parser.json` is retained and superseded. The corrected parser inspects record shape, and all final tables use its current source hash.

## Verdict/content/freshness/binding audit

No code emits a scorecard or semantic PASS. Places that check observations or generate a diagnostic verdict are:

1. `up.sh`: actual SHOW values must keep all three durability settings on, and fresh health responses must match the staged gateway-source digest. The new prefix rejects existing resources and final metadata binds exact container/image IDs, caps, CPUs and URLs.
2. `bench.mjs`: a fresh database query witnesses the disabled JSON index; each returned receipt must contain the placement stamp; serial HTTP counts are checked; reader fault/decline counters must remain zero. These are narrow runtime checks, not an oracle of every fact value. Request samples bind headers, datom counts, t and receipt positions from this attempt.
3. `analyze.py`: copied runner bytes and the gateway manifest must match pre-execution hashes; source/stack container ID sets must match. Direct t or the complete ordered native sequence binds native content to each window. Its calibration assumes native log timing is contained in the client interval; that is a methodological gap, not an independently verified clock gate. It separately checks interval ordering, recomputed monotonic latency/service formulas, unique positions/sequences, matching request scope/position/datoms, complete finite gateway/transact samples and native datom counts. Per-command containment bounds must exist; this check is not an independent clock-synchronization measurement. Missing native/GC logs produce unavailable analysis, never inferred absence. Certain/nominal/possible counts must be ordered.
4. `report_tables.py`: rejects stale analyzer output and requires 3,291 unique accounted-for commands, matching native counts, all samples, a completed reader stage and four successful reader captures before comparing the observed p50/p99 with 10/50. A speed result is diagnostic; a V4 result is explicitly a changed-input result.
5. `run.py`/`recover.py`: capture logs before prefix-scoped removal and retain actual fresh inventory text, including errors. The interrupted cleanup failure was not interpreted as an empty inventory. Recovery is restricted to the one recorded owned prefix.
6. `seal.py`: after writers finish, fresh Docker inventories must be empty; unchanged package/benchmark source/build bytes must match their retained preimages; each evidence file is reread against its SHA256 manifest. This establishes retained byte integrity and cleanup, not semantic or performance acceptance.

No acceptance file or pinned package source was edited. The unpinned launcher is the only changed tracked file outside `s3/**`. Package packing, root-wide pnpm check, fresh power-loss tests, a semantic oracle rerun, 256-reader isolation, year-one scale and independent acceptance were not performed. Configuration measurements do not replace those gates.

The first V2 attempt also failed at index probe 2: the admin request using the writer client rejected with ECONNRESET while the probe commits were being awaited, and Node treated the still-unhandled promise as fatal. No verdict is assigned to that probe or later windows. Startup retry counts predate the measurement; retained logs do not prove the network reset's cause. The harness now attaches rejection handlers immediately, uses a fresh 70-second admin client for the 60-second request, saves probe observations in `finally`, and has fatal handlers that save metadata and release only its own lease. The original vacated empty lock was removed only after checking its inode times against this attempt's last timed-start, the child's reported exit, and fresh empty owned-stack cleanup. A new V2 prefix retains the same configuration and package builds.

V4's fresh stack was prepared with the V2 configuration and the source override `facts: 5 + selected.seq % 6` before `buildTraceCommand`. It never obtained the first measurement lease by 03:27 UTC, so the runner exited with an explicit timebox error and zero timed offers. Its setup, attempted command, source, error and cleanup are retained. There is no measured V4 percentile or lean-encoding conclusion. No additional expensive trial was started after that cutoff.

## A versus B, and the recommendation

A is supported for the largest observed pauses: write-gateway full GC contributes hundreds of milliseconds, and V2 eliminates overlapping index jobs/checkpoints but still has GC-associated tails and misses the end-to-end bars. B as an intrinsic 18k-datoms/s **apply** ceiling is not supported by these measurements: V2 native apply p99 is 7.85–14.20 ms at roughly 0.38–0.45 transactor cores on average, while native processing outside apply and peer/client waits remain, and the controlled V4 volume probe is unmeasured.

V2 has zero native index jobs even possibly overlapping all four burst windows, and no overlapping Postgres checkpoint or >20 ms statement. Its worst 603.52 ms reader-arm command has only 3.22 ms in native apply and 11.90 ms in native processing, with a gateway pause overlap. Its 215.24 ms worst first-burst command has 8.33 ms apply but 162 ms native processing and no match to the six requested categories; it remains unclassified. These are distinct paths to latency, not one universal cause.

ZGC really took effect on all three JVMs (young/old generational records are retained), but did not meet the bars. V3 burst native apply p99 is 16.0–24.1 ms; native **processing** p99 reaches 114 ms, and much of that tail has no requested-category overlap. The early limited inspection found zero allocation-stall summaries, but the final full-log scan found four logged transactor allocation stalls (maximum 164.744 ms), no write-gateway stalls, and 447 timed read-gateway allocation-stall events (451 matching lines, including four minor-collection start/end records) (maximum 315.526 ms). Transactor examples occur during the first index probe; read-gateway examples occur during warm-up and the reader burst. These are per-thread allocator stalls, not stop-the-world pauses, and are outside the six requested categories. Their presence is a further configuration/heap/collector concern; it does not by itself prove that each overlapping writer delay was caused by the read peer. The full scan is `zgc-allocation-stall-scan.json` in the sealed evidence. One mid-burst snapshot recorded write gateway 21.0%, read gateway 66.1%, transactor 56.6% and Postgres 4.9% CPU; that single snapshot does not establish sustained saturation. Profiling the processing outside apply and the peer/transport leg is still necessary.

In V2's mixed trace, 5–10 / 11–25 / 26–50 fact bands have 5,858 / 3,001 / 1,014 commands, mean 207.44 / 385.17 / 723.34 datoms, and p50 14.62 / 18.87 / 26.68 ms. This supports a whole-path volume sensitivity experiment, but does not isolate transactor apply or validate a replacement encoding. Do not read the unrun V4 as support for a larger package redesign.

Use **V2 as the controlled baseline for the next full diagnostic benchmark**, not as a qualified P2 configuration: among the fully repeated V1–V3 profiles it has the lowest reader p50 and p99, and it separates indexing from the burst. The initial V0 reader world is younger and is not a controlled relative comparison. No tested profile is ready to claim the requested P2 result. The exact fresh-stack command is:

```sh
DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/full \
node lab/bin/heavy.mjs --label DX-S3-full -- \
  bash lab/experiments/EXP-DX1/stack/up.sh tx2-dxs3-full-next \
  --cpus-pg 0 \
  --cpus-tx 1,2 \
  --cpus-gw-write 3 \
  --cpus-gw-read 4 \
  --port-write 8503 \
  --port-read 8504 \
  --pg-memory 2g \
  --tx-memory 5g \
  --gw-memory 3g \
  --memory-index-threshold 768m \
  --memory-index-max 1536m \
  --object-cache-max 256m \
  --tx-java-opts '-Xms256m -Xmx4g -Xlog:gc*,safepoint:file=/tmp/dxs3-gc.log:time,uptime,level,tags:filecount=20,filesize=20m' \
  --gw-java-opts '-Xms256m -Xmx2500m -Ddatomic.objectCacheMax=268435456 -Xlog:gc*,safepoint:file=/tmp/dxs3-gc.log:time,uptime,level,tags:filecount=20,filesize=20m' \
  --pg-settings '-c log_checkpoints=on -c log_min_duration_statement=20 -c fsync=on -c synchronous_commit=on -c full_page_writes=on -c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'
```

First rerun the attribution with independent clock bounds; the current overlap counts are conditional diagnostic associations, not verified causal fractions. The full benchmark must still take the measurement lock for its timed windows. Outstanding work is the unmeasured lean-volume arm, the unclassified processing/peer delays, a direct memory-index-byte time series, and the normal independent correctness/scale/256-reader gates.

## Measured tables and per-command evidence

Configuration comparison: no-reader cells are the worst p50 and worst p99 across the three bursts (these can be different repetitions). Counts sum the three no-reader bursts; the reader arm has 3,291 offers. These are diagnostic sampled-bar comparisons.

| Variant | No readers, worst p50 / p99 ms | 32 readers, p50 / p99 ms | >50 ms, no readers / readers | 10 / 50 result |
| --- | ---: | ---: | ---: | --- |
| V0 | 14.37 / 76.77 | 16.10 / 100.29 | 191 / 173 | miss |
| V1 | 15.80 / 67.11 | 21.62 / 687.51 | 164 / 540 | miss |
| V2 | 16.99 / 67.84 | 15.31 / 145.31 | 156 / 121 | miss |
| V3 | 21.09 / 178.40 | 25.03 / 215.18 | 554 / 542 | miss |
| V4 | not admitted | not admitted | — | unmeasured; timebox |

Every measured block follows. Serial percentiles use service time, as DX-B3 did; burst percentiles start at the scheduled offer.

| Variant | Block | N | p50 / p90 / p99 / max ms | >50 ms |
| --- | --- | ---: | ---: | ---: |
| V0 | step5-serial | 1000 | 8.95 / 16.31 / 31.15 / 51.83 | 1 |
| V0 | burst-1 | 3291 | 14.37 / 29.89 / 76.77 / 422.53 | 71 |
| V0 | burst-2 | 3291 | 14.22 / 26.59 / 55.57 / 106.01 | 52 |
| V0 | burst-3 | 3291 | 13.64 / 27.59 / 62.81 / 108.67 | 68 |
| V0 | with-readers | 3291 | 16.10 / 35.75 / 100.29 / 430.06 | 173 |
| V1 | serial-1 | 1000 | 7.60 / 13.67 / 31.30 / 42.75 | 0 |
| V1 | serial-2 | 1000 | 10.95 / 19.79 / 36.62 / 82.77 | 1 |
| V1 | serial-3 | 1000 | 9.08 / 16.74 / 32.00 / 66.97 | 2 |
| V1 | burst-1 | 3291 | 13.62 / 26.37 / 67.11 / 324.73 | 67 |
| V1 | burst-2 | 3291 | 13.35 / 25.49 / 46.88 / 72.70 | 18 |
| V1 | burst-3 | 3291 | 15.80 / 31.51 / 65.11 / 88.17 | 79 |
| V1 | with-readers | 3291 | 21.62 / 76.78 / 687.51 / 1088.62 | 540 |
| V2 | serial-1 | 1000 | 12.83 / 21.72 / 34.59 / 422.89 | 3 |
| V2 | serial-2 | 1000 | 14.80 / 24.89 / 51.57 / 91.25 | 10 |
| V2 | serial-3 | 1000 | 14.86 / 25.10 / 37.11 / 659.82 | 1 |
| V2 | burst-1 | 3291 | 16.99 / 29.88 / 67.84 / 215.24 | 69 |
| V2 | burst-2 | 3291 | 16.85 / 29.72 / 50.37 / 102.92 | 35 |
| V2 | burst-3 | 3291 | 16.48 / 29.84 / 56.29 / 89.07 | 52 |
| V2 | with-readers | 3291 | 15.31 / 29.06 / 145.31 / 603.52 | 121 |
| V3 | serial-1 | 1000 | 13.58 / 22.86 / 31.49 / 85.45 | 3 |
| V3 | serial-2 | 1000 | 15.91 / 26.34 / 50.67 / 104.56 | 11 |
| V3 | serial-3 | 1000 | 16.91 / 27.57 / 47.60 / 64.95 | 8 |
| V3 | burst-1 | 3291 | 21.09 / 49.89 / 178.40 / 402.32 | 328 |
| V3 | burst-2 | 3291 | 16.43 / 31.09 / 107.86 / 290.66 | 130 |
| V3 | burst-3 | 3291 | 16.55 / 32.32 / 76.79 / 188.07 | 96 |
| V3 | with-readers | 3291 | 25.03 / 67.52 / 215.18 / 386.54 | 542 |

**Conditional alignment model:** attribution counts are nonexclusive and use the scheduled-offer-to-ACK interval. Each cell is nominal count (share of slow commands), followed by model lower–upper counts under the containment-derived alignment bounds, not independent clock measurements. “None” means no listed category matches. Long checkpoint overlap is not a causal assignment. Service-interval counts and all-command exposure denominators are in each analysis JSON.

| Variant | Overlapping category | No readers | 32 readers |
| --- | --- | ---: | ---: |
| V0 | Transactor GC/safepoint >10 ms | 73 (38.2%; 43–78) | 73 (42.2%; 43–82) |
| V0 | Gateway GC/safepoint >10 ms | 80 (41.9%; 17–90) | 146 (84.4%; 125–160) |
| V0 | Transactor index job | 48 (25.1%; 48–48) | 44 (25.4%; 44–44) |
| V0 | Postgres checkpoint | 108 (56.5%; 108–108) | 173 (100.0%; 173–173) |
| V0 | Postgres statement >20 ms | 3 (1.6%; 1–5) | 0 (0.0%; 0–0) |
| V0 | Previous native transaction >500 datoms, overlapping offer interval | 26 (13.6%; 25–29) | 43 (24.9%; 42–43) |
| V0 | None | 15 (7.9%; 14–46) | 0 (0.0%; 0–0) |
| V1 | Transactor GC/safepoint >10 ms | 78 (47.6%; 53–84) | 249 (46.1%; 133–278) |
| V1 | Gateway GC/safepoint >10 ms | 68 (41.5%; 29–71) | 461 (85.4%; 405–483) |
| V1 | Transactor index job | 37 (22.6%; 35–38) | 390 (72.2%; 388–390) |
| V1 | Postgres checkpoint | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V1 | Postgres statement >20 ms | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V1 | Previous native transaction >500 datoms, overlapping offer interval | 23 (14.0%; 22–23) | 69 (12.8%; 69–70) |
| V1 | None | 17 (10.4%; 13–66) | 16 (3.0%; 12–32) |
| V2 | Transactor GC/safepoint >10 ms | 58 (37.2%; 40–59) | 34 (28.1%; 22–35) |
| V2 | Gateway GC/safepoint >10 ms | 53 (34.0%; 22–55) | 104 (86.0%; 91–113) |
| V2 | Transactor index job | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V2 | Postgres checkpoint | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V2 | Postgres statement >20 ms | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V2 | Previous native transaction >500 datoms, overlapping offer interval | 20 (12.8%; 19–20) | 19 (15.7%; 19–19) |
| V2 | None | 53 (34.0%; 52–87) | 11 (9.1%; 4–21) |
| V3 | Transactor GC/safepoint >10 ms | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V3 | Gateway GC/safepoint >10 ms | 1 (0.2%; 0–1) | 168 (31.0%; 127–208) |
| V3 | Transactor index job | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V3 | Postgres checkpoint | 0 (0.0%; 0–0) | 0 (0.0%; 0–0) |
| V3 | Postgres statement >20 ms | 1 (0.2%; 0–1) | 0 (0.0%; 0–0) |
| V3 | Previous native transaction >500 datoms, overlapping offer interval | 87 (15.7%; 79–88) | 87 (16.1%; 84–91) |
| V3 | None | 465 (83.9%; 464–475) | 308 (56.8%; 273–345) |

CPU samples are cgroup usage deltas per wall second, in cores, from nonblocking one-second probes. Native apply values are joined by native transaction t.

| Variant | Burst | Transactor CPU mean / peak cores | Native apply p50 / p99 ms | Index jobs possibly overlapping / starting in possible burst envelope | Local nominal host→VM offsets, min–max ms |
| --- | --- | ---: | ---: | ---: | ---: |
| V0 | burst-1 | 0.548 / 1.565 | 2.33 / 19.60 | 2 / 2 | 47.51–59.63 |
| V0 | burst-2 | 0.529 / 1.491 | 2.23 / 17.60 | 2 / 2 | 43.31–53.53 |
| V0 | burst-3 | 0.538 / 1.489 | 2.54 / 19.20 | 2 / 2 | 39.65–49.46 |
| V0 | with-readers | 0.665 / 1.754 | 4.01 / 28.80 | 2 / 2 | 37.80–48.67 |
| V1 | burst-1 | 0.534 / 1.517 | 2.51 / 20.50 | 2 / 2 | 43.67–55.10 |
| V1 | burst-2 | 0.558 / 1.607 | 2.30 / 15.40 | 2 / 2 | 44.00–57.21 |
| V1 | burst-3 | 0.707 / 1.817 | 4.21 / 20.90 | 2 / 2 | 44.36–56.47 |
| V1 | with-readers | 0.977 / 2.036 | 6.07 / 29.10 | 2 / 2 | 44.63–290.93 |
| V2 | burst-1 | 0.446 / 0.952 | 2.84 / 7.86 | 0 / 0 | -13.83–101.81 |
| V2 | burst-2 | 0.380 / 0.654 | 2.58 / 7.85 | 0 / 0 | 80.15–95.67 |
| V2 | burst-3 | 0.391 / 0.738 | 2.73 / 10.20 | 0 / 0 | 74.00–93.38 |
| V2 | with-readers | 0.385 / 0.860 | 2.61 / 14.20 | 0 / 0 | -1.92–106.31 |
| V3 | burst-1 | 0.779 / 1.702 | 5.29 / 21.60 | 0 / 0 | -17.13–97.28 |
| V3 | burst-2 | 0.515 / 1.146 | 3.83 / 16.80 | 0 / 0 | 78.81–94.05 |
| V3 | burst-3 | 0.519 / 1.662 | 3.87 / 16.00 | 0 / 0 | 71.69–90.26 |
| V3 | with-readers | 0.812 / 1.711 | 5.58 / 24.10 | 0 / 0 | 75.88–92.08 |

Explicit indexing probes: 100 serial commits are launched alongside each request. Completion is the fresh `sync-index` response; native overlap is checked separately.

| Variant | Probe | completed | p50 / p90 / p99 / max ms | >50 ms | Commits overlapping native index job |
| --- | --- | --- | ---: | ---: | ---: |
| V2 | index-1 | True | 25.09 / 47.21 / 58.90 / 58.90 | 8 | 99 / 100 |
| V2 | index-2 | True | 22.38 / 32.77 / 63.17 / 63.17 | 3 | 100 / 100 |
| V2 | index-3 | True | 22.78 / 37.66 / 43.62 / 43.62 | 0 | 100 / 100 |
| V2 | index-readers | True | 18.75 / 33.92 / 51.48 / 51.48 | 1 | 99 / 100 |
| V3 | index-1 | True | 33.85 / 60.44 / 140.56 / 140.56 | 21 | 98 / 100 |
| V3 | index-2 | True | 28.76 / 46.33 / 79.50 / 79.50 | 8 | 98 / 100 |
| V3 | index-3 | True | 28.98 / 53.10 / 73.76 / 73.76 | 12 | 100 / 100 |
| V3 | index-readers | True | 28.77 / 51.32 / 81.82 / 81.82 | 10 | 99 / 100 |

Primary attempt index:

| Variant | Stack prefix | Command and analysis directory |
| --- | --- | --- |
| V0 | `tx2-dxs3-v0-1794271129` | `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/bench-1794271149246-d98e56dd-8da0-4dce-9042-c35261b7971e` |
| V1 | `tx2-dxs3-v1-1794274626` | `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/bench-1794274648845-d4a95474-6b89-4902-a519-81378c98ad27` |
| V2 | `tx2-dxs3-v2-1794277448` | `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/bench-1794277474016-2ec7d270-796a-4a0f-b0bd-f909b2cf398b` |
| V3 | `tx2-dxs3-v3-1794279196` | `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/bench-1794279219772-73f5444f-d828-42c7-ac08-6afb0c473796` |

## Source and retention

The unpinned launcher SHA256 changed from `16239303b42979720d7aa43d18e04da9ac4d91415c8b2115cf5589c696bb81e7` to `b6113ce051803c4969855af39fe3a154015c2618cbfbe1736f82c015237d139a`. No acceptance pin was edited. Source/build preimages, saved runners, image/container identities, clocks, raw commands, native logs, GC logs, SHOW output, first failures and partial attempts remain under `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/`. The committed [SHA256SUMS](SHA256SUMS) lists their retained bytes; [EVIDENCE.md](EVIDENCE.md) supplies the index and final integrity/cleanup result.

Post-seal documentation note: the delivered report includes the full allocation-stall scan interpretation above. The sealed `source-final` directory preserves the report text at seal time, before this interpretation was added. No measured source, raw data, configuration, percentile or artifact in the sealed evidence was changed. The committed report is the authoritative final narrative.
