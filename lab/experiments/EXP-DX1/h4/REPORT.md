# DX-H4 — trustworthy north-star verdicts

**PARTIAL: implementation and the 2,000-subject paired run are complete; the requested 10k paired run was not admitted and was withdrawn to honor the approximate three-hour task window.**

North star: P1–P4 measurement integrity under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md` section 1.1. Fast-forward diagnostic smoke measurements under PROTOCOL 0b; no acceptance, scorecard or contract promotion.

## Changes and verification

1. Maintenance events retain gateway timestamps but use fresh request/response bounds on the same monotonic epoch as the level window. Both bounds must be inside that level and the job must complete. The recorded OM2 fixture reproduces the original five misses; incomplete, crossed-window and wrongly bound jobs still refuse.
2. Every Datomic history depth requests indexing before reads begin. A completed response within 60 seconds, complete growth on the whole sample, and at least 10,000 correct pulls at each depth are all required. Mean/p50 ratios are reported beside p99; the 1.1 p99 bar is unchanged. Missing prerequisites remain in `history.invalid`.
3. `attempt.sh pair` runs a zero-reader arm and a ladder on two fresh stacks, with the same arguments, seed, trace and exported configuration. The raw baseline writes and report are copied unchanged into the ladder input. Identity, harness source, completed writes, correctness and full trace-window coverage are checked before using a denominator. Baseline history reads are explicitly unjudged.
4. Every offered command retains scheduled/start/finish times; commits additionally retain transact call/return, publication-witness start/durable time and ACK time where observed. Optional per-commit response diagnostics are copied when present. No cumulative client counter is presented as a per-commit observation. P2 reports segment medians/p99s, including all post-ACK completion work. No time is subtracted from a bar.
5. Feed consumption and RYOW pulls run on a side worker; probe HTTP/encoding/receipt work runs on a separate probe worker against the write gateway. Per-subject admission, command intent/model updates and ACK publication stay coordinated on the main writer. Every original feed/replay/crash and expected-world check remains. Feed-before-ACK intent checks are deferred rather than skipped; unresolved checks or RYOW pulls invalidate finalization. Publication fsync stays on each committing thread.
6. CPU plan: Postgres 0, transactor 0–1, write gateway 1, read gateway 2–3, driver 4–7; engine throughput denominator four CPUs. Three reader workers initially. Driver 8g; transactor heap 3g / container 4g; gateways heap 2g / containers 3g; Postgres 2g. Requested G1, cache, index and Postgres settings are in `run.sh` and retained effective stack evidence.

Focused tests: 10/10; native feed tests: 5/5, including delayed intent validation. The sandboxed host feed attempt was blocked by macOS boot-clock sysctl access; its native rerun passed. Ten package builds succeeded from the local cache after an offline frozen install. Broad bench TypeScript still reports errors in unrelated diagnostics; no diagnostic names a changed driver/worker/helper file. Full root check, package release, independent review and acceptance were not run.

## 2,000 subjects

Attempt `tx2-dxh4-s6`. Saved status `DONE`; oracle `PASS`; client invalid `False`. These are diagnostic observations; DONE is not a claim that the bars pass.

Evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-s6-ladder`; zero-reader evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-s6-zero`.

Correctness: `{"reads":960817,"correct":960817,"violations":0,"errors":0,"violationKinds":{},"violationSample":[],"rule":"a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested (receipt instant R, valid time V); errors and wrong answers are never goodput"}`.

Invalid reasons: `[]`. History invalid: `[]`.

Matched baseline: `{"traceDigest":"2dfde977f66613f0","offeredUntilTraceS":600.0009116210938,"source":"/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-s6-ladder/input/ns-writes.jsonl","sha256":"e6ff57dfde911fd30a0f69e4b6b482eb0cbbfbbdc38c3c00f0cedf4fdd0746bf"}`.

Burst main-thread ELU: `0.314` (target < 0.5).

| Priority | Phase | Bar | Value | Required | Saved predicate | Miss amount | Qualification |
|---|---|---|---|---|---|---|---|
| P1 | L256 | NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | MET |  |  |
| P1 | L256 | NS-P1-GOODPUT-256-VS-64 | 1.077 | >= 1.0 | MET |  |  |
| P1 | L256 | NS-P1-READ-P99-256-MS | 659.455 | <= 100 | MISS | 559.455 beyond threshold |  |
| P1 | L256 | NS-P1-WRITER-P99-RATIO-256 | 2.603 | <= 1.25 | MISS | 1.353 beyond threshold | matched zero-reader run, same trace-time window |
| P1 | L256 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 341.316 | <= 2000 | MET |  |  |
| P1 | L1024 | NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | MET |  |  |
| P1 | L256 | NS-P1-GOODPUT-1024-VS-256 | 1.658 | >= 0.9 | MET |  |  |
| P1 | L1024 | NS-P1-WRITER-P99-RATIO-1024 | 1.188 | <= 2.0 | MET |  | matched zero-reader run, same trace-time window |
| P1 | recovery | NS-P1-RECOVERY-MS | unavailable | <= 60000 | MISS |  |  |
| P1 | every ladder window | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.611 | >= 0.5 | MET |  |  |
| P1 | every ladder window | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 8917 | > 0 and all correct | MET |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | every ladder window | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNJUDGED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | every ladder window | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | L256 | NS-P2 5-10 band p50 ms (L256) | 25.471 | <= 10 | MISS | 15.471 beyond threshold |  |
| P2 | L256 | NS-P2 5-10 band p99 ms (L256) | 274.431 | <= 50 | MISS | 224.431 beyond threshold |  |
| P2 | L256 | NS-P2 11-25 band p50 ms (L256) | 31.615 | <= 10 | MISS | 21.615 beyond threshold |  |
| P2 | L256 | NS-P2 11-25 band p99 ms (L256) | 268.287 | <= 50 | MISS | 218.287 beyond threshold |  |
| P2 | L256 | NS-P2 26-50 band p99 ms (L256, provisional) | 331.602 | <= 100 | MISS | 231.602 beyond threshold |  |
| P2 | whole trace | NS-P2 every offered command accounted | 0 | = 0 | MET |  |  |
| P2 | whole trace | NS-P2 every oracle-valid trace command published | 3873/3873 | all | MET |  |  |
| P2 | whole trace | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | whole trace | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | whole trace | NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | MET |  |  |
| P2 | whole trace | NS-P2 queue drains within 60 s after each burst | [0.4160195312499866] | every burst <= 60 s | MET |  |  |
| P2 | whole trace | NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | MET |  |  |
| P2 | whole trace | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | whole trace | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | whole trace | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | whole trace | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | whole trace | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | whole trace | NS-P3 resume from checkpoint replays exactly | True | = true | MET |  |  |
| P3 | whole trace | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | L256 | NS-P3 lag p99 ms at L256 | 520.191 | <= 250 | MISS | 270.191 beyond threshold |  |
| P3 | whole trace | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | whole trace | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | p4mix | NS-P4 weighted-mix pull p50 ms | 0.421 | <= 5 | MET |  |  |
| P4 | p4mix | NS-P4 weighted-mix pull p99 ms | 2.127 | <= 25 | MET |  |  |
| P4 | p4mix | NS-P4 largest bucket p99 ms (provisional) | 2.287 | <= 50 | MET |  |  |
| P4 | p4mix | NS-P4 pulls/s per engine core (CPU quota) | 902.772 | >= 1100 | MISS | 197.228 beyond threshold |  |
| P4 | p4h10 / p4h1 | NS-P4 history flatness p99 depth10 / depth1 | 0.963 | <= 1.1 | MET |  | requires complete growth to depths 3 and 10 on the full sample |
| P4 | p4h10 / p4h1 | NS-P4 history flatness bytes read depth10 / depth1 | unavailable | <= 1.1 | UNJUDGED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | sweep / presweep | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | False | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | sweep / presweep | NS-P5 wall s for 100k subjects incl. evaluation and publication | unavailable | <= 100 | MISS |  | fetch-only diagnostic: 173 s extrapolated |
| P5 | sweep / presweep | NS-P5 exact coverage | True | = true | MET |  |  |
| P5 | sweep / presweep | NS-P5 post-capture mutations do not leak into the sweep | 10/10 | all at basis | MET |  | requires committed positions past capture; observed: [4335,4342,4340,4339,4334,4337,4341,4336,4344,4343] |
| P5 | sweep / presweep | NS-P5 live read p99 during sweep / presweep | 1.044 | <= 1.5 | MET |  |  |
| P5 | sweep / presweep | NS-P5 writer commit p99 during sweep / presweep | 1.079 | <= 1.5 | MET |  |  |
| P5 | sweep / presweep | NS-P5 throttled variant overlapping compaction | unavailable | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |

Full per-phase goodput, read/commit p50/p99, feed lag, every reader ELU, engine CPU per container and per-commit breakdown: [tx2-dxh4-s6-TABLES.md](tx2-dxh4-s6-TABLES.md).

Burst median driver-owned work: `3.119 ms`; before transact `1.119 ms`; after transact to ACK `0.010 ms`; after ACK to scheduler completion `0.076 ms`; publication witness `1.319 ms`. The driver-owned median is a per-command sum, not a sum of the separately reported segment medians.

## 10k rung

No completed ladder report is available for this attempt. No bars or oracle result are inferred.

## Integrity, blockers and limits

The full observation-to-verdict list is [AUDIT.md](AUDIT.md). Hash changes and pin matches are in [HASH-CHANGES.json](HASH-CHANGES.json); the contract is unchanged. Evidence bytes are indexed by [SHA256SUMS](SHA256SUMS).

P4 engine bytes read remain unmeasured; no bytes-flatness pass is claimed. The NS P5 path remains fetch-only; W0 release evaluation, outbox publication and throttled maintenance overlap belong to the separate P5 harness. The 2,000-subject run caps nominal L1024 at 256 actual readers and cannot establish a 1,024-reader result. Smoke/development overrides cannot close acceptance obligations. Optional per-commit diagnostics may be absent on this source revision. No store optimization, package source edit, forbidden port, default Docker context change, download, merge or push was performed.

Before completion, owned container/network/volume inventories must be empty. Each completed wrapper retains these exact inventories and releases the lock only after checking them. Queued cancelled attempts created no engine resources.


## Status by requested step

| Step | Status | Fresh evidence |
|---|---|---|
| 1 — maintenance windows | Complete | Recorded OM2 regression; all six completed small-ladder events count once. |
| 2 — indexed history | Complete at 2,000 subjects | Completed bound jobs before depths 1/3/10; 46,763 / 45,757 / 43,309 correct measured pulls; no invalid history prerequisites. Ratios mean 1.0918, p50 1.1207, p99 0.9635; p99 alone decides the unchanged bar. |
| 3 — matched zero-reader baseline | Complete at 2,000 subjects | Fresh stacks, identical 600-second trace horizon, copied raw baseline, matched window denominators; writer ratios/recovery now use it. 10k pair not run. |
| 4 — per-commit breakdown | Complete at 2,000 subjects | All 3,873 original committed background commands have all timing boundaries. Optional SDK response diagnostics absent on this build. Burst median driver-owned time 3.119 ms; SDK/store transact span median 17.535 ms. |
| 5 — writer side work / CPU plan | Complete at 2,000 subjects | Feed/RYOW and probe workers; main burst ELU 0.3143, below 0.5. No saturation; L256 reader ELUs 0.8573 / 0.8346 / 0.8407, read gateway 183.0% CPU. Four reader threads were not required by the 256-reader condition. |
| 6 — both paired scales | Partial | Complete 2,000-subject pair and every bar above. 10k baseline/ladder not admitted; no 1,024-reader result. |

The final 10k availability table is [tx2-dxh4-r1-TABLES.md](tx2-dxh4-r1-TABLES.md): all 48 predicates explicitly NOT RUN. No small-run number is relabelled as a 10k result.

## Blockers with source locations

- **Shared admission/time box:** `lab/experiments/EXP-DX1/h3/attempt.sh:66` waits for the exclusive VM lock; `lab/bin/heavy-lock.mjs:60` reports the four-token admission queue. The small ladder waited from about 07:06 to 07:47 UTC. The 10k request waited for a heavy token and then the measurement lock from about 07:58 to 08:34 UTC, behind DX-B6/DX-H5 windows. Two 900-second trace arms plus startup could no longer fit the remaining approximate three-hour task window, so the unadmitted attempt was terminated with exit 143. No 10k container was started. `cancellation.json` and final owned-resource inventories record the outcome.
- **P4 engine bytes:** `lab/bench/driver.ts:1277` leaves engine bytes-read flatness unjudged. Client bytes are not substituted.
- **P5 domain work:** `lab/bench/lib/evaluate.ts:33` and `:34` retain the evaluator/outbox seams; `lab/bench/driver.ts:1301` keeps wall time unavailable for the fetch-only diagnostic. The separate W0 driver was not edited.
- **SDK internal split:** this source build exposes no bound per-commit response diagnostic payload. The transact span contains SDK and engine work; it is not labelled pure store time. Only outside-transact scheduling/completion and the publication witness are attributed separately.
- **Small recovery qualification:** the development `--level-s 30` override caps its recovery phase at 30 seconds. No successful recovery window was observed; this does not establish a measured recovery time greater than the full 60-second obligation. The saved predicate remains false, and the shortened smoke phase cannot close acceptance.

## First failure, source binding and what was not verified

`tx2-dxh4-s5-zero` retained 26 stale RYOW observations (3,908 correct of 3,934; zero read errors) after the first worker move selected the read gateway. This was a routing mistake in the harness move. The original auxiliary path used the write gateway; the corrected side worker preserves it explicitly. Its fresh s6 baseline has 3,873/3,873 correct reads; the s6 ladder has 960,817/960,817 correct reads and O-REPLAY PASS. The failed baseline was not reused or rewritten. The initial s5 ladder was stopped, copied out and cleaned. Early s1–s4 candidates were cancelled while queued before creating resources.

The measured runtime source is `6215c669`; later commits contain reporting artifacts. Final checks compare every measured bench-source hash with the current files. Both completed s6 wrappers retain empty owned container/network/volume inventories, and a final scoped inventory verifies no `tx2-dxh4-*` resource remains. No other holder's lock or resources were modified.

Not verified: the 10k paired run, full 1,024-reader stress, year-one scale, engine bytes read, W0 activation/outbox, internal per-commit SDK timings, independent review, full root `pnpm check`, or release acceptance. The real loaded P1/P2 latency, P3 lag and quota throughput misses remain misses; no check was weakened or scorecard promoted.

A future granted measurement window can run the unchanged recipe with a fresh attempt prefix:

```sh
node lab/bin/heavy.mjs --label DX-H4-10k-pair2 -- bash lab/experiments/EXP-DX1/h4/run.sh pair tx2-dxh4-r2 --rung 10k
```

## Final receipts and changed hashes

Final focused tests pass 10/10. Broad bench TypeScript exits 2 on existing unrelated diagnostics, with zero diagnostics naming changed driver/worker/helper files. Every source in the measured small report matches the final runtime bytes. `cleanup-final.json` records empty scoped Docker inventories; `tx2-dxh4-r1-zero/cancellation.json` records pre-admission withdrawal. These and all raw outputs are bound by [SHA256SUMS](SHA256SUMS). The contract diff from the task base is empty.

All changed existing source paths are listed below; new paths and acceptance references are included in [HASH-CHANGES.json](HASH-CHANGES.json). No contract pin was edited.

| Existing path | Old SHA256 | New SHA256 |
|---|---|---|
| `lab/bench/driver.ts` | `29f7315d718de22c8542612fa50271e3f768bb4a66fd087084c203264f210d0a` | `9c42a93c4934d4700180b0a34b1e4ba621546a6f8f390c1b70ab817abe5d0154` |
| `lab/bench/lib/datomic-publication.ts` | `836667faae59ef7200ae1650e328de8e0975c5baec64ad1c40d43481d677fa47` | `7e1c123f4ce3f3a2bbad47e33cc40928a6a4a0613d458fd176ae5136c59f2e34` |
| `lab/bench/lib/feed.ts` | `c32cc216f74de6b1ddcedcb98bc2c1af221f9fd041e41527fef26d553364ae83` | `e83f66ad67a6c455d01a56ff39635f98668fdf1cfa0b5a5bf456549e7e4941c2` |
| `lab/experiments/EXP-DX1/h3/attempt.sh` | `abb3bf27947138262b23c2108acd283fb74e920ff2d5819688492035046e81a0` | `180133a0089c529bf517b37b73069b0871e817c8495689151df190a9a4e71806` |
| `lab/experiments/EXP-DX1/stack/run-in-vm.sh` | `423aefe424ef40bafea0e6645a789d24a36ac6da9ab12850c7cf56b31ba6d7a1` | `fb619eda75e7b8a80787e03f14f4fb70854b87f4459cd41cbb1e5cb199417b0d` |
