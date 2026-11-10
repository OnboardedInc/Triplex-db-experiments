# DX-H3 — in-VM north-star benchmark

North star: P1–P5 under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. PROTOCOL 0b spike. These are diagnostic smoke observations; no acceptance contract, scorecard or promotion changed.

## Result

Medium: **ERROR**, 17 phases and 48 printed bars; 484 engine cgroup samples. Oracle: `PASS`. Client saturation flag: `False`. Source-bound raw report: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/tx2-dxh3-m5/driver/ns-report.json`.

10k: **ERROR**, 17 phases and 48 printed bars; 2339 engine cgroup samples. Oracle: `FAIL`. Client saturation flag: `False`. Source-bound raw report: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/tx2-dxh3-r4/driver/ns-report.json`.

DONE means reporting completed, not that the bars pass. MET below means only that the stored local predicate was true. A failed feed, incomplete history, missing oracle/head or client saturation prevents acceptance regardless of individual predicates.

| Run | Seeded subjects | Reads | Correct | Model violations | Read errors | Feed checkpoint | Feed unreached | Oracle reads / mismatches | Saturated phases |
|---|---|---|---|---|---|---|---|---|---|
| Medium | 2000 | 419965 | 419786 | 85 | 94 | 488 | 2525 | [24,0] | [] |
| 10k | 10000 | 64277 | 63738 | 280 | 259 | 1036 | 1709 | [24,0] | [] |

## Implementation and step status

1. VM runner implemented and exercised: `stack/run-in-vm.sh PREFIX [--cpus LIST] [--memory SIZE] -- COMMAND`. Local Node 22.23.2 Linux arm64, same absolute worktree/evidence mounts, stack Docker network, direct write/read gateway URLs. `up.sh --no-publish` exposes no gateway port; the runner refuses published gateways. No workload request crosses Lima SSH forwarding.
2. Engine sampling uses the exact inspected container IDs to resolve host cgroup paths. Read-only `cpu.stat/usage_usec` deltas and `memory.current` retain each container and the sum. The client has no Docker socket or Docker CLI. Datomic maintenance uses request-index/sync-index jobs; driver log collection says not collected in VM mode. The host retains actual Docker stdout logs after the run.
3. Both SQLite databases and every driver output live on `<prefix>-driver`, mounted at `/driver` and the lexical worktree path `runs/DX-H3-vm`. This satisfies the output-path check while using VM disk fsync. All output files are copied to durable evidence even on command failure. A failed copy retains the volume/container.
4. Publication witnesses validate tagged final position, safe integer delta, `final = submitted + delta` and response operation ID. The observer publishes the final position before the caller ACK. Driver model/ACK/RYOW/lost-ACK/oracle maps name commits with `receipt.position`. The shifted-response unit test passes.
5. Functional f3 and f5 reached DONE. The final medium and real-size profiles are above. Every actual error, incomplete phase, missing prerequisite and bar miss remains a finding; no package source was edited.

Additional harness fixes were necessary: wait up to five seconds for the actual publication witness when a feed response wins the HTTP race; bound individual stalled polls and consecutive failed polls at the existing 120-second catch-up budget; retain nested source errors; retain seed ancestry for every member of a recorded history batch and late-growth receipts; reject oracle cases with unknown retractions; report an unavailable final source head as null and invalidate the run rather than discard its measurements; refuse history flatness without complete depth growth; require real post-capture mutation receipts, not unchanged worlds alone.

## Exact commands and resources

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label DX-H3-build -- node_modules/.bin/turbo run build \
  --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... \
  --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... \
  --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/triplex-qlever...
git archive --format=tar exp/O01-replay-oracle lab/oracles/replay > /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle.tar
tar -xf /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle.tar -C /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle
node lab/bin/heavy.mjs --label DX-H3-functional5 -- bash lab/experiments/EXP-DX1/h3/attempt.sh functional tx2-dxh3-f5 --subjects 400 --level-s 10 --max-readers 16 --sweep-max 400 --history-sample 50
node lab/bin/heavy.mjs --label DX-H3-medium5 -- bash lab/experiments/EXP-DX1/h3/attempt.sh medium tx2-dxh3-m5 --subjects 2000 --level-s 20 --max-readers 256 --sweep-max 2000 --history-sample 200
node lab/bin/heavy.mjs --label DX-H3-real4 -- bash lab/experiments/EXP-DX1/h3/attempt.sh real tx2-dxh3-r4 --rung 10k
```

The wrapper supplies `--lane datomic --composition reach --profile smoke --reader-threads 2 --oracle-root .../DX-H3/oracle --output runs/DX-H3-vm/ns-report.json`. Functional history sample 50 is capped at 40 by the driver. Medium nominal L1024 is capped to 256 actual readers; real size uses all 1024.

| Role | CPUs | Real container / heap |
|---|---|---|
| Postgres | 0 | 2 GiB / vendor default |
| Transactor | 0,1 | 5 GiB / Xmx4g |
| Write gateway | 2 | 2500 MiB / Xmx2g |
| Read gateway | 3,4 | 3500 MiB / Xmx3g |
| Driver | 6,7 | 5 GiB |

Real transactor configuration is object-cache-max=1g, memory-index-threshold=256m, memory-index-max=1g. `s3/REPORT.md` was absent on this branch, so the task configuration was used. Engine quota denominator is five distinct VM CPUs. The client has two assigned CPUs; os.cpus/hostCores=8 describes VM visibility, not client allocation. Functional engines use CPU 6, transactor Xmx1g, gateways Xmx768m. Medium uses the same CPU assignment as real with stack defaults (transactor Xmx2g, gateways Xmx1g).

The real run held the measurement lock for its entire duration, including startup, offline verification, copy-out and cleanup, as authorized by the task. Its hold exceeded 15 minutes under the explicit real-run exception. Medium holds remained below 15 minutes. Disk >=5 GiB and estimated VM free memory >=8 GiB are checked from actual Docker MemUsage sums against 20 GiB, both before waiting and again after lock acquisition. r1 refused before creating any container when memory was below the floor. The successful real admission is retained in `stats-admitted.jsonl`.

The local Node image has no Python. A fresh-UUID file bridge invokes the exact extracted O-REPLAY Python on the host only after measurement. It binds input SHA-256, output SHA-256 and actual exit status, copies exact bytes, and leaves world comparisons unchanged. The archive embeds commit `03d86f3346cccd6794487b77293fb56077dd020e`; all 12 Python source hashes match the medium expected output. This is not host load generation. See `ORACLE-PROVENANCE.json`.

## Medium: every bar


| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 49 | = 0 | MISS | 49.000 from threshold |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 0.14409615608471277 | >= 1.0 | MISS | 0.856 below threshold |  |
| P1 | NS-P1-READ-P99-256-MS | 3915.775 | <= 100 | MISS | 3815.775 above threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | 923.3465931232951 | <= 1.25 | MISS | 922.097 above threshold | UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1 |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 34153.187744140625 | <= 2000 | MISS | 32153.188 above threshold |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 11 | = 0 | MISS | 11.000 from threshold |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 0.10076982184100851 | >= 0.9 | MISS | 0.799 below threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | 946.9214005215982 | <= 2.0 | MISS | 944.921 above threshold | UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1 |
| P1 | NS-P1-RECOVERY-MS | null | <= 60000 | MISS |  | no matched zero-reader run: the writer part of the 256-level bar cannot be judged, so recovery cannot be shown |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.610187394859356 | >= 0.5 | MET |  |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 1867 | > 0 and all correct | MISS |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNVERIFIED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | 573.439 | <= 10 | MISS | 563.439 above threshold |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | 30932.991 | <= 50 | MISS | 30882.991 above threshold |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | 598.015 | <= 10 | MISS | 588.015 above threshold |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | 27525.119 | <= 50 | MISS | 27475.119 above threshold |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | 31116.721 | <= 100 | MISS | 31016.721 above threshold |  |
| P2 | NS-P2 every offered command accounted | 1298 | = 0 | MISS | 1298.000 from threshold |  |
| P2 | NS-P2 every oracle-valid trace command published | "2372/3637" | all | MISS |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 20 | <= 2.19 commands | MISS | 17.810 above threshold |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [41.24309497070311] | every burst <= 60 s | MET |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 0.9835581787521079 | = 1.0 | MISS | 0.016 from threshold |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | NS-P3 resume from checkpoint replays exactly | false | = true | MISS |  |  |
| P3 | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | NS-P3 lag p99 ms at L256 | 21.878 | <= 250 | MET |  |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 18.943 | <= 5 | MISS | 13.943 above threshold |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 78.335 | <= 25 | MISS | 53.335 above threshold |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 92.159 | <= 50 | MISS | 42.159 above threshold |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 1081.7368150072725 | >= 1100 | MISS | 18.263 below threshold |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 0.7380917582344578 | <= 1.1 | MET |  |  |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 2842 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  |  |
| P5 | NS-P5 live read p99 during sweep / presweep | 1.2200001342774258 | <= 1.5 | MET |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | 15.122824405809181 | <= 1.5 | MISS | 13.623 above threshold |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |


Full latency bands, reader ladder, writer pending at every phase, P3 counters, P4 mix/buckets/history/throughput, fetch-only sweep, every correctness counter, oracle result, invalidity and scan snapshots: [MEDIUM-TABLES.md](MEDIUM-TABLES.md).

## 10k: every bar


| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 4 | = 0 | MISS | 4.000 from threshold |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 1.3936089517886199 | >= 1.0 | MET |  |  |
| P1 | NS-P1-READ-P99-256-MS | 3375.103 | <= 100 | MISS | 3275.103 above threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | null | <= 1.25 | MISS |  | UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1 |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | null | <= 2000 | UNVERIFIED |  |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 4 | = 0 | MISS | 4.000 from threshold |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 0.5263338564780095 | >= 0.9 | MISS | 0.374 below threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | null | <= 2.0 | MISS |  | UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1 |
| P1 | NS-P1-RECOVERY-MS | null | <= 60000 | MISS |  | no matched zero-reader run: the writer part of the 256-level bar cannot be judged, so recovery cannot be shown |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.0008014961261020571 | >= 0.5 | MISS | 0.499 below threshold |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 44 | > 0 and all correct | MET |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNVERIFIED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,0,0,0] | every window >= 1 | MISS |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | null | <= 10 | UNVERIFIED |  |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | null | <= 50 | UNVERIFIED |  |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | null | <= 10 | UNVERIFIED |  |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | null | <= 50 | UNVERIFIED |  |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | null | <= 100 | UNVERIFIED |  |  |
| P2 | NS-P2 every offered command accounted | 13707 | = 0 | MISS | 13707.000 from threshold |  |
| P2 | NS-P2 every oracle-valid trace command published | "905/13059" | all | MISS |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 3163 | <= 2.19 commands | MISS | 3160.810 above threshold |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [407.3291376953125,316.3665207519532,173.41752294921866] | every burst <= 60 s | MISS |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 0.7138121546961326 | = 1.0 | MISS | 0.286 from threshold |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 0 |
| P3 | NS-P3 resume from checkpoint replays exactly | false | = true | MISS |  |  |
| P3 | NS-P3 crash injection at three points | 0 | = 3 | MISS | 3.000 from threshold |  |
| P3 | NS-P3 lag p99 ms at L256 | null | <= 250 | UNVERIFIED |  |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | null | = 1.0 | UNVERIFIED |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 14.783 | <= 5 | MISS | 9.783 above threshold |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 77.311 | <= 25 | MISS | 52.311 above threshold |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 91.647 | <= 50 | MISS | 41.647 above threshold |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 17.39076284238438 | >= 1100 | MISS | 1082.609 below threshold |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 1.1843165489667429 | <= 1.1 | MISS | 0.084 above threshold | requires complete growth to depths 3 and 10 on the full sample |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 3049 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  | requires committed positions past capture; observed: [2481,2480,2482,2477,2479,2483,2484,2487,2478,2486] |
| P5 | NS-P5 live read p99 during sweep / presweep | 0.813725378732347 | <= 1.5 | MET |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | 54.51727955171972 | <= 1.5 | MISS | 53.017 above threshold |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |


Full latency bands, reader ladder, writer pending at every phase, P3 counters, P4 mix/buckets/history/throughput, fetch-only sweep, every correctness counter, oracle result, invalidity and scan snapshots: [REAL-TABLES.md](REAL-TABLES.md).

## Measured failures and limits

**Medium:**
- `feedFailure`: Error: Feed polling repeatedly failed for 142450 ms at checkpoint 488. Last error: ReadError: Datomic read failed
- `invalidReasons`: ["Feed consumer failed: Error: Feed polling repeatedly failed for 142450 ms at checkpoint 488. Last error: ReadError: Datomic read failed"]
- Client: {"saturatedPhases":[],"invalid":false,"processCpu":{"userCores":0.8567311097170615,"kernelCores":0.03835605742116428,"hostCores":8},"readerThreads":2,"rule":"INVALID when a reader worker or the main thread has mean event-loop utilization > 0.9 in a measured window"}
- Actual history growth: [{"targetDepth":3,"reachedDepth":3,"subjects":200,"commands":4,"assertions":800,"failures":0,"wallS":22.280534912109374},{"targetDepth":10,"reachedDepth":10,"subjects":200,"commands":14,"assertions":2800,"failures":0,"wallS":29.426723876953126}]
- P5 sweep completion and mutation receipts: {"completed":true,"pulled":2000,"subjects":2000,"exactCoverage":true,"mutationPositions":[2880,2882,2884,2875,2877,2876,2878,2879,2883,2886],"mutationsCommittedAfterCapture":null}

**10k:**
- `feedFailure`: Error: Feed polling repeatedly failed for 145596 ms at checkpoint 1036. Last error: ReadError: Datomic read failed
- `invalidReasons`: ["Feed consumer failed: Error: Feed polling repeatedly failed for 145596 ms at checkpoint 1036. Last error: ReadError: Datomic read failed","Required history depths 3 and 10 were not reached on the complete sample"]
- `finalizationErrors`: ["Required history depths 3 and 10 were not reached on the complete sample"]
- Client: {"saturatedPhases":[],"invalid":false,"processCpu":{"userCores":0.2543200126032113,"kernelCores":0.012919231348131336,"hostCores":8},"readerThreads":2,"rule":"INVALID when a reader worker or the main thread has mean event-loop utilization > 0.9 in a measured window"}
- Actual history growth: [{"targetDepth":3,"reachedDepth":3,"subjects":1000,"commands":20,"assertions":4000,"failures":0,"wallS":55.09096459960937},{"targetDepth":10,"reachedDepth":4,"subjects":1000,"commands":15,"assertions":3000,"failures":13,"wallS":884.1178540039062,"incomplete":true,"pendingAtDeadline":null}]
- P5 sweep completion and mutation receipts: {"completed":true,"pulled":10000,"subjects":10000,"exactCoverage":true,"mutationPositions":[2481,2480,2482,2477,2479,2483,2484,2487,2478,2486],"mutationsCommittedAfterCapture":true}

The real retained error cause is DatomicTransportError caused by `Gateway deadline exceeded` at `packages/datomic/src/DatomicClient.ts:200`; SPI wrapping occurs at `packages/datomic/src/DatomicStorageAdapter.ts:71-74` and `readErrors.ts:12`. The feed fast path explicitly declines irregular scopes (`packages/datomic/gateway/src/triplex/gateway/journal.clj:11-12`), and counters record actual portable scans. These observations do not establish which internal engine activity caused each latency tail. No package rewrite or raised transport limit was used to turn a failed read into a pass.

P1 writer ratios are UNMATCHED comparisons with the in-run zero-reader phase (different trace segment), not a causal reader/writer isolation result; no matched external zero-reader run was made. P4 engine bytes read are unmeasured. P5 is fetch-only: the release evaluator, outbox publication and throttled compaction variant remain absent (`driver.ts`, P5 bars). A history phase label never establishes actual depth; the actual growth records and qualification flag govern the comparison. An unchanged world does not establish mutation isolation without post-capture receipts.

### Real oracle receipt-capture gap and post-run fix

The real oracle result remains FAIL: receipt consistency R-RCP-4, first divergent command 1351 (journal position 1352). The captured case has eight missing assertion identities, all blobs, despite zero sampled-world mismatches. The former driver matcher compared JSON object serialization, while SDK/row decoding can reorder blob keys. The delivered matcher now reuses the canonical fact-member representation used by the world model and seed path. A reordered-blob fixture binds the actual supplied ID, and different/missing content still refuses. This is a post-run code fix, tested 22/22 in Linux; **the 10k run was not repeated after it**. Original receipt bytes sufficient to reconstruct those eight IDs were not retained, so no IDs were guessed and the failed report was not rewritten as PASS. A fresh native run must verify the fix.

## Retained attempts, checks and cleanup

f1 retained a Bash-3 empty-array startup failure; f2 retained the publication race; f3 reached DONE but Python was absent; f4 exercised the 30-second poll failure report; f5 reached DONE with the final 120-second budget but exposed missing oracle seed ancestry. m1 and m4 completed phases but were stopped within their leases after reporting stalled on source failures; their original RUNNING files remain unqualified. m2/m3 and r3 were cancelled while queued, before resource ownership, to bind corrected source in fresh attempts. r1 refused memory admission. r2 completed 1024 readers but its write gateway stopped answering admin probes and history growth failed six times; it was stopped before the unguarded old finalizer could discard the measured data. No old report was retroactively relabelled as a fresh run. Fresh final medium/real attempts are the ones reported above.

Validation: offline builds 10/10; Linux arm64 driver imports and native node:sqlite; TypeScript stripping; focused Linux delivery tests 22/22 (including post-capture receipt and canonical blob-ID binding regressions). The broad bench TypeScript check still fails in unchanged audit-traffic.ts, hs01-seed.ts, round2.ts and other diagnostics; no diagnostic names a changed driver/feed/oracle/completion file. Full root pnpm check, package pack checks, production acceptance, independent review, power-loss durability, 100k W0 activation and a matched baseline were not performed.

Mac clock tests were refused by sandbox sysctl; overlay-backed durable-store tests correctly refused that filesystem. Their disk-volume Linux retries passed; failures remain in evidence. Native addon inventory includes macOS build tooling, FoundationDB, DuckDB and better-sqlite3, but the exercised Datomic driver imports none of those addons. Host feed storage uses Node SQLite on a Docker disk volume.

All owned containers, networks and volumes are removed before releasing owned leases. Final empty inventories and SHA256SUMS are indexed by [EVIDENCE.md](EVIDENCE.md). Bulky raw output remains only under the durable evidence path. No packages, w0-public.ts, Datomic runtime construction, acceptance files, main checkout, unrelated container, forbidden port or global Docker context was changed. No merge or push was made.

## Observation-to-verdict audit

- Publication observer: exact tagged position bytes, safe submitted/delta/final arithmetic and returned operation ID precede the witness; a fresh scope and sidecar bind this attempt. Unit fixtures reject mismatches and observe a shifted result once before ACK.
- Feed: bound producer record/key/domain/digest checks remain; the witness wait never manufactures a time. Stalls and repeated errors retain their actual error and cannot advance the checkpoint. Fresh disk-volume tests verify delayed, absent, stalled and repeatedly failed cases.
- Head/history/mutation completion: invalid or failed source heads remain null with an error; no ACK floor is substituted as a head. Requested history depths must be reached on the full sample. Post-capture isolation requires actual committed positions past capture. Positive and refusing fixtures validate those distinctions.
- Driver: frozen trace and exact expected-world checks retain wrong answers, errors and unaccounted commands; only correct reads are goodput. Cgroup samples bind current exact container IDs. Smoke completion and numeric predicates do not imply acceptance.
- Oracle: missing parent assertions reject the case; recorded seed, trace and history inputs include every retained history member and late receipt. Actual frozen Python exit and exact per-entity sampled-world equality decide its status. Missing final source position leaves the oracle NOT-RUN rather than inventing a head.
- Receipt alignment: canonical blob fields and entity/attribute content bind only IDs present in the supplied receipt; missing or different content stays missing. The actual real oracle FAIL remains unchanged after the fix. Bridge/integrity: fresh UUID and input/output SHA-256 bind the actual offline invocation and returned bytes. ORACLE-PROVENANCE compares the extracted files with the actual expected-output source hashes. SHA256SUMS validates retained bytes only, not semantics.
- Stack/cleanup: health source hash and Postgres fsync/synchronous_commit/full_page_writes readbacks compare actual content; exact IDs/cpusets/memory and source/build hashes are retained. Only empty current owned-resource inventories release the lease; absence of an uncreated volume is not a cleanup failure.
- Report renderers: copied stored bar values/verdicts are displayed unchanged, with explicit global invalidity and prerequisites. Derived threshold distances are arithmetic only; missing values remain unavailable. No output is promoted to a scorecard PASS.

`lab/acceptance/` is unchanged. [HASH-CHANGES.json](HASH-CHANGES.json) contains old/new SHA-256 for changed existing files and identifies pin matches; no re-pinning occurred. Runtime source/build hashes are observations of this attempt; historical/aborted attempts are not adopted as fresh semantic evidence.
