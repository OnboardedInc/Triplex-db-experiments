# EXP-P4 current-value path: CX-P4 continuation

North star: P4, measured against `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` §1.1 P4. This is a builder report for independent review, not a promotion or completed P4 acceptance.

## Result

Preserved all WIP through `d872663`. The gate split and interleaved closed-loop windows were already implemented in `e20af40`; the 10k XTDB measurement finished after the pause (2026-11-08 02:15–12:15 UTC). H1 is the strongest candidate in these diagnostics. X1 alone does not solve current-path scanning. Neither meets every P4 requirement. X2 and Q1 are **not built**, pending the brief's explicit EXP-J01 merge prerequisite: `git log main --grep=J01` contains dispatch/brief commits, not its implementation merge. No write-path changes were made in this continuation.

This round hardens the experiment's acceptance machinery:

- O-REPLAY now checks each stage before its timing, including its own verdict and receipt consistency. A rejected stage stops before timing.
- A semantic FAIL or missing oracle exits nonzero. `--skip-oracle` stops before timing and reports NO-ORACLE.
- Offline positive and negative controls enforce process exits, verdicts and actual oracle mismatches; stale-retraction rejection must prevent that stage's timing.
- Compressed gate observations preserve per-arm, per-subject/basis digest counts plus driver-recorded bases, including rejected stages. `pulls.jsonl.gz` additionally records each observed gate digest, route and basis id, joined to the bases in `gate-observations.json.gz`. Each stage keeps its own compressed oracle cases.
- The final receipt explicitly reports each arm's checked-pull denominator against the required 100,000. A diagnostic PASS alone does not establish that minimum or P4 performance acceptance.

Eligibility fault injection still occurs after the timed stages and is checked by the final oracle. The new per-stage preflight checks the 80/15/5 sampled answers, not every eligibility fault before timing. No timing is promoted on the strength of the preflight alone.

## Arm verdicts and evidence

The following engine results are inherited, source-hashed receipts; they were **not rerun** by CX-P4. Full bucket, hop, depth, scan-counter and CPU tables are in [MEASUREMENTS.md](MEASUREMENTS.md), generated from [receipts/xtdb-fresh-10k.json](receipts/xtdb-fresh-10k.json). Source hashes/configuration are in that receipt. Raw files remain under `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/xtdb-fresh-10k/`: `p4-report.json`, `pulls.jsonl.gz`, `p4.log`, and `oracle/case-{0,1,2}.json.gz`. The historical raw pull file contains timing/flatness samples; the newly added gate-observation format cannot retroactively supply historical observations.

| Arm | Built | Oracle-checked pulls | Wrong pulls | Verdict |
| --- | --- | ---: | ---: | --- |
| A0 XTDB | Existing public adapter/BFS baseline | 4,097 | 0 | Correct sampled answers; scan-heavy, fails latency/throughput/flatness; insufficient 100k denominator |
| X1 | Default temporal bounds for current reads; history path unchanged | 4,000 | 0 | Correct sampled answers; insufficient denominator; no meaningful fresh-history scan reduction; retain as candidate for aged test only |
| X2 | No `tx_current` entity-document write/read option yet | 0 | — | NOT RUN; wait for J01 merge and coordinate write-path integration |
| H1 | In-process entity-indexed retained rows, receipt/feed application, horizon/watermark eligibility and fallback | 100,097 | 0 | Sample-count floor met on XTDB; promising read cost, but flatness fails; not durable, no erasure support or automatic one-hour retention policy; no promotion |
| Q1 | No guarded-update `cur` graph maintenance yet | 0 | — | NOT RUN; wait for J01 merge; QLever current-path performance and correctness remain unverified |

Gate sample: 200 subjects in a contiguous block, 1,000 matched subjects for history growth. H1's 100,097 pulls cover 6,201 distinct subject/basis keys; repeated samples are not distinct worlds. Engine gates cover a smaller subset and must not inherit H1's denominator. The common command stream and sampled world state are checked by independent Python O-REPLAY v0.4.1: 124,601 entity queries, 93 recorded commands out of 1,282 positions (other positions declared internal), zero receipt-consistency violations, zero cross-arm digest mismatches or pull errors. This does not certify unrecorded subjects or the entire production command contract.

### Weighted single-client latency (p50 / p99 ms)

| Stage | A0 | X1 | H1 |
| --- | --- | --- | --- |
| Depth 1 | 626.687 / 4521.983 | 589.823 / 4587.519 | 0.675 / 10.495 |
| Depth 3 | 811.007 / 2998.271 | 716.799 / 3129.343 | 0.583 / 12.031 |
| Depth 10 | 1425.407 / 9043.967 | 1376.255 / 9895.935 | 0.943 / 18.431 |
| Depth 10 + expired | 1318.911 / 5210.111 | 1236.991 / 4915.199 | 0.811 / 12.223 |

Matched-sample depth-10/depth-1 p99 ratios: A0 **2.500x**, X1 **2.344x**, H1 **1.181x** (bar ≤1.1). H1 examined canonical member bytes/pull rise from 16,499.45 to 17,255.45 (**1.046x**); these are logical string-length counters, not physical storage I/O bytes. A0/X1 scan rows rise from 496,570 to 4,568,007 per pull, and pages from 908.77 to 8,573.23. These counters are not direct byte measurements. All XTDB stages report compaction settled, but the host was heavily loaded; absolute latency bars require calibrated PAIR-0 confirmation.

Best closed-loop pulls/s per quota core (2-core engine quota), depth 1 / depth 10: A0 0.850 / 0.411; X1 0.911 / 0.342; H1 10,054 / 10,350. H1 runs on the host: its host process consumed about 0.976 / 0.950 cores, so dividing by the idle engine quota must not be read as engine-native capacity. Windows alternate arms in three rotated rounds at each client level. There is no fixed writer trace during these timing windows, so these numbers do not settle live writer interference or end-to-end P1/P2.

### H1 eligibility and apply checks

The inherited 60 s consumer cut made seven reads; all fell back above W, caught up in 8,393 ms and then served current. Above-W, watermark-regression and below-H tests selected the expected routes; 68 below-H reads fell back, 14 at/above H served current. The steady-follower test sampled only two reads and both fell back; this is too sparse and engine-bound to establish the predicted steady fallback share. The table was not poisoned and had no instant-order violations. Retention purge happened after timing, so the measured table retained superseded rows throughout history growth.

Apply counters include seed batches of about 400 facts, not matched 10-fact ACK-overhead probes: 3,129.8 ms total across 1,282 applied transactions, max 188.5 ms. These cannot settle the predicted ≤0.5 ms median incremental broker ACK overhead.

### H1 synthetic scale diagnostics

Historical [receipts/h1-scale-10k.json](receipts/h1-scale-10k.json) and [receipts/h1-scale-100k.json](receipts/h1-scale-100k.json); raw roots `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/h1-scale-10k/` and `h1-scale-100k/`, file `h1-scale.json`. These build synthetic receipts directly and have **no independent oracle gate** or engine; treat them as size/cost probes only.

| Subjects | Stage | Mix p50 / p99 ms | Matched p99 ms | Logical examined bytes/pull | Pulls/host CPU-s | RSS MiB |
| --- | --- | --- | --- | ---: | ---: | ---: |
| 10k | d1 | 0.028 / 0.455 | 0.499 | 18,121 | 17,455 | 437 |
| 10k | d3 | 0.030 / 0.457 | 0.277 | 18,289 | 6,627 | 441 |
| 10k | d10 | 0.033 / 0.489 | 0.767 | 18,877 | 15,284 | 558 |
| 10k | d10x | 0.036 / 0.631 | 0.783 | 19,409 | 13,940 | 694 |
| 100k | d1 | 0.056 / 2.191 | 2.607 | 18,456 | 8,320 | 1,473 |
| 100k | d3 | 0.050 / 1.887 | 0.747 | 18,624 | 9,091 | 1,431 |
| 100k | d10 | 0.057 / 2.319 | 4.255 | 19,212 | 8,484 | 1,430 |
| 100k | d10x | 0.053 / 2.015 | 2.959 | 19,754 | 8,339 | 1,415 |

100k seed: 3,848,930 live rows; estimated logical table bytes 395,659,922. No persisted disk footprint was measured. Matched p99 grows 1.632x at 100k; flatness remains unresolved despite low absolute latency.

## R24 predictions

| # | Verdict | Reason |
| --- | --- | --- |
| 1 | NOT RUN | No 100k engine-backed A0 4-hop measurement |
| 2 | Partly MET; aged NOT RUN | Fresh mix p50 improvement 5.9% at d1, 3.4% at d10; identical scan counters. No fresh database past-system-time qualification |
| 3 | NOT RUN | X2 not built |
| 4 | NOT RUN | Q1 and optional Q2 not built |
| 5 | FALSIFIED as a conjunction | H1 meets 2 ms p50 and throughput diagnostics; p99 exceeds 10 ms in the loaded run. Logical examined-byte ratio 1.046x passes the prediction, latency flatness misses P4 |
| 6 | NOT MET in full | H1 meets 100k count with zero mismatches; engines do not. Below-H routing passes; historical valid-time bases can correctly use H1 while retained, so not every 5% valid-time read must fall back |
| 7 | NOT RUN | No matched write-overhead probe for any arm |
| 8 | NOT ESTABLISHED | Two steady-follower samples with 100% fallback; synchronous writer 0%. No one-hour automatic retention policy/frozen writer trace |
| 9 | Partly MET; disk NOT RUN | 3.85M seed rows and peak sampled RSS about 1,473 MiB at 100k; synthetic/in-memory, no disk measurement |

## Recommendation and next work

XTDB: keep H1 as a candidate and measure a bounded retention horizon that preserves exact-cut fallback while excluding old retired rows from current scans. Recheck logical bytes and p99 under PAIR-0 before claiming flatness. X1 is inexpensive but fresh-history evidence does not support it as the main solution; test the aged regime on a genuinely fresh exclusive database before deciding its value. Do not claim current reads avoid history: X1 scans history, and H1 retains post-horizon retired rows.

QLever: no selection from this round. Build Q1 after J01 integration, run the same oracle/eligibility gate and measure against A0 and H1 on one reserved slot. No broker files were changed.

Still open: independent review, X2/Q1, ≥100k checked engine pulls each, aged history, engine-backed 100k best-arm run, physical byte measurements, durable H1 recovery/erasure and default retention, fixed writer interference, write overhead, year-one scale and final acceptance. Sample coverage and fast microbenchmarks do not close those obligations.

## Fresh validation and resource handoff

Fresh CX-P4 results are recorded below after execution. The full repository check and package rebuild were not run for these harness-only edits; historical package-build hashes were not refreshed. The exclusive `tx2-xtdb-s2` reservation held by `EXP-P4` was released via `engine.mjs down` after confirming the inherited run had finished. Its volume `tx2-xtdb-s2-data` was retained; neither shared resident was stopped or recreated. Status receipt: `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/cx-p4-slot-release.txt`.

Fresh checks completed 2026-11-08 UTC (both heavy-wrapped commands exited 0):

- `node lab/bin/heavy.mjs --label CX-P4-final-gates -- bash lab/experiments/EXP-P4-current-path/offline-checks.sh /Users/sam/Claude/Projects/triplex-db-2/EXP-P4/cx-p4-final-gates`.
- `node lab/bin/heavy.mjs --label CX-P4-unit-receipt -- node --test lab/bench/test/current-table.test.ts`: **5/5 passed**. Durable output: `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/cx-p4-unit.tap`.
- `bash -n lab/experiments/EXP-P4-current-path/offline-checks.sh` and `git diff --check` passed.

Final offline receipts: [positive control](receipts/cx-p4-offline-pass.json), [dropped retractions](receipts/cx-p4-offline-mutant-drop-retracts.json), [ineligible serving](receipts/cx-p4-offline-mutant-serve-ineligible.json). Raw root `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/cx-p4-final-gates/` has one directory per control, each containing `p4-report.json`, `p4.log`, `pulls.jsonl.gz`, `gate-observations.json.gz` and stage/final oracle cases. Shell assertion output is `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/cx-p4-final-gates.log`. Earlier fresh attempts at `cx-p4-gates/` are retained separately.

Positive control: source A0 and H1 have zero oracle mismatches; the smaller split denominator is explicit. Dropped-retraction control: oracle rejects stale H1 answers at depth 3 and no depth-3 timing is emitted. Ineligible-serving control: oracle rejects 24 H1 answers after horizon purge; both mutants exit 1 as required. The shell also verifies that saved raw gate records carry routes. These are offline diagnostics with 400 subjects and shortened consumer cuts (4 s positive, 2 s mutant), not a fresh 60 s engine cut or engine performance run. Final engine measurements remain inherited evidence only. Independent adversarial review has not been performed by this builder.
