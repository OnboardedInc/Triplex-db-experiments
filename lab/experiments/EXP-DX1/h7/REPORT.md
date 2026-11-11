# DX-H7 — diagnostic improvement; target NOT met

- North star: P1/P4; scope and bars: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md. 10k subjects, 3 reader threads, 30 s per level, lean layout; engine CPUs 0–3, driver 4–7 / 8 GiB.
- Measured reader implementation: `bab74570`; original followups through `8bf28097` only adjust mutable-input guarding and harness/lease cleanup. No second reader measurement.
- Raw command output: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H7/raw.log` (all attempts retained).
- Lock wait ≈112 min defeated the first-40-minute profile budget. First `before` doubled readers through auto-start + explicit start; invalid, retained. Tables use `before-corrected`.
- Before worker-0 profile: sampled milliseconds (31.5 s including stop/drain); D=packages/datomic/src counterpart, B=lab/bench, Effect=dependency. No Triplex-core function ranks in these tables.

| Rank | Self function @ file | ms | Total function @ file | ms |
|---:|---|---:|---|---:|
| 1 | (garbage collector) @ V8/native | 3343.6 | (root) @ V8/native | 31503.0 |
| 2 | get @ D/ByteCache.js | 3227.5 | processTicksAndRejections @ node:internal/process/task_queues | 24408.4 |
| 3 | (idle) @ V8/native | 2742.7 | runMicrotasks @ V8/native | 22324.3 |
| 4 | observe @ B/lib/observe.ts | 2282.4 | fetchReachEntities @ D/DatomicClient.js | 14394.8 |
| 5 | remember @ D/DatomicStorageAdapter.js | 1961.8 | decodeEntity @ D/reach.js | 6925.7 |
| 6 | reachResponse @ D/reach.js | 1817.5 | (anonymous) @ D/reach.js | 6594.5 |
| 7 | freeze @ D/reach.js | 1571.5 | readOnce @ B/reader-worker.ts | 5792.0 |
| 8 | hash2 @ B/lib/rng.ts | 1107.1 | evaluate @ Effect/internal/effect.js | 3611.5 |
| 9 | estimateRowBytes @ D/RowCache.js | 1058.2 | observe @ B/lib/observe.ts | 3576.1 |
| 10 | delete @ D/ByteCache.js | 995.0 | runLoop @ Effect/internal/effect.js | 3498.3 |
| 11 | fetchReachEntities @ D/DatomicClient.js | 982.5 |  |  |
| 12 | (anonymous) @ D/DatomicClient.js | 680.5 |  |  |
| 13 | (anonymous) @ D/reach.js | 669.3 |  |  |
| 14 | reachPull @ B/lib/composition.ts | 614.5 |  |  |
| 15 | writev @ V8/native | 586.2 |  |  |
| 16 | (anonymous) @ D/rowText.js | 577.5 |  |  |
| 17 | readOnce @ B/reader-worker.ts | 529.0 |  |  |
| 18 | (anonymous) @ D/DatomicClient.js | 261.9 |  |  |
| 19 | post @ node:inspector | 249.1 |  |  |
| 20 | runMicrotasks @ V8/native | 244.7 |  |  |

- Cache churn dominated: decodeEntity 6.93 s total, GC 3.34 s self, ByteCache.get 3.23 s self; observe 3.58 s total.
- Changed: intern exact database-prefixed reach keys (32 MiB cap); uniform-subject thread affinity (hot picks unchanged); 640 MiB entity / 32 MiB row caches per reader; WeakMap hashes only for deeply immutable actual fact objects. Every fact still contributes; every read still compares stamp + digest to Model.expected at requested R/V.

| Arm | Readers | verified pulls/s | p99 ms | reader ELU (3 threads) | reader / process CPU ms/pull | requests/pull |
|---|---:|---:|---:|---|---|---:|
| before-corrected | 64 | 3709 | 53.6 | 0.986, 0.955, 0.955 | 0.771 / 0.840 | 1.3492 |
| before-corrected | 256 | 3848 | 188.7 | 0.992, 0.987, 0.985 | 0.757 / 0.842 | 1.3213 |
| after | 64 | 4899 | 40.1 | 0.975, 0.938, 0.926 | 0.561 / 0.619 | 1.0039 |
| after | 256 | 4834 | 138.6 | 0.938, 0.923, 0.923 | 0.568 / 0.630 | 1.0058 |

Counters below use the same central telemetry intervals; hits/misses count initial reference revision checks. Bytes are decoded UTF-8 row/column text, excluding wire JSON punctuation.

| Arm / readers | inline / ref entities per pull | repair req/pull | hit / miss / eviction per s | decoded rows / text bytes per pull |
|---|---|---:|---|---|
| before-corrected/64 | 0.262 / 99.06 | 0.3492 | 352125 / 16006 / 15998 | 17.53 / 2239 |
| before-corrected/256 | 0.652 / 90.35 | 0.3213 | 334155 / 15287 / 16769 | 17.09 / 2180 |
| after/64 | 0.255 / 99.50 | 0.0039 | 490212 / 73 / 0 | 6.88 / 885 |
| after/256 | 0.244 / 90.81 | 0.0059 | 439651 / 107 / 0 | 5.99 / 766 |

- The seed persists across arms, including acknowledged writes from the invalid first arm; sequential steady-trace replays accumulate history. This is a short diagnostic, not a matched full NS comparison.
- Zero errors/violations: corrected before 350,516 reads; after 444,197 (warmup and drain included). Both arms use steady ns-v2 writes; no straddles/bursts/lost-ACK injection, maintenance, or full NS acceptance.
- Budget: 640+32+32 MiB per reader = 2,112 MiB configured total. Observed entity peaks 294–297 MiB/reader with zero evictions; selected capacity leaves headroom over the measured partition working sets.
- Memory target NOT met in this recovery attempt: reader process peak 3.82 GiB plus retained retry coordinator 0.44 GiB ≈4.26 GiB. Final harness removes that one-off coordinator; no fresh memory claim.
- After profile: decodeEntity still 4.25 s total; ~0.25 inline entities and 6–7 decoded rows/pull persist with zero eviction. Current/historical revision alternation still re-decodes bodies; traversal, key lookups, Effect and GC also remain. Next hypothesis: bounded, content-checked multi-revision decode reuse (not implemented).
- Result: CPU improves ≈25–26%; throughput improves ≈26–32%, but 0.4 ms/pull, 6,000 pulls/s and 256-reader p99 ≤100 ms are NOT achieved. Workers remain saturated.
- Validation: package build succeeded; observation equivalence 2/2; cache/reach-repair unit tests 6/6. Full lean integration suites UNVERIFIED: first attempt ended at lease cutoff (exit 124); fresh gates-only job canceled before admission after the 00:00 UTC cutoff (exit 128) to honor the three-hour budget. No semantic PASS.
- Commands: `node lab/bin/heavy.mjs --label DX-H7-measure -- bash lab/experiments/EXP-DX1/h7/run.sh`; `node lab/experiments/EXP-DX1/h7/summarize.mjs <raw.log>`; `node --experimental-strip-types --test lab/experiments/EXP-DX1/h7/observe.test.ts`.
- Gates: `DX_H7_PREFIX=tx2-dxh7-gates1 DX_H7_GATES_ONLY=1 node lab/bin/heavy.mjs --label DX-H7-gates -- bash lab/experiments/EXP-DX1/h7/run.sh`; work.sh runs reach, reach-repair, cache-budget and layout-differential with DATOMIC_INTEGRATION=1 / TRIPLEX_DATOMIC_LAYOUT=lean (300 differential scenarios).
- Cleanup: q1 containers/network/volumes removed, no seed retained. Gates-only attempt created no containers; final Docker checks found no DX-H7 containers, networks or volumes. No full NS/L1024 run, independent review or promotion claimed.

## Gates
- Continuation evidence is raw output under `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H7/`: `gates2.log`, `recovery3.log`, `stamps-unit.log`, `stamps-build.log`.
- Reader gates use isolated reader source `8bf28097` with shared installed dependencies, so preparing the writer cannot change the source under test.
- Lean gates2: 9/10 tests passed: reach (200 scenarios, 6,600 comparisons / 30,500 answer comparisons, 5,120 concurrent cold pulls), reach-repair, cache-budget and typed layout parity. No semantic mismatch was reported.
- The serial 300-case differential timed out at 900 s; its failure is retained. Recovery passed all 300 cases: 95,028 comparisons and 5,664 matching native/row closures. All required reader checks now pass across gates2 + recovery3.
- Recovery used the existing RNG-preserving starts 0/100/200, 100 cases each, in parallel; raw boundary states chain exactly and draws end at 36,300. No reader change was reverted on the timing-only failure.
- Commands: `DX_H7_PREFIX=tx2-dxh7-gates2 DX_H7_GATES_ONLY=1 node lab/bin/heavy.mjs --label DX-H7-gates -- bash lab/experiments/EXP-DX1/h7/run.sh` (with `DX_H7_GATES_SOURCE_ROOT=/private/tmp/dxh7-reader-gates`); recovery adds `DX_H7_WORK=lab/experiments/EXP-DX1/h7/retry-work.sh`, prefix `tx2-dxh7-gates3` and label `DX-H7-recovery`.

## Writer stamps
- Implementation: `0f00f4af`. A bounded predecessor cache survives row-LRU eviction; missing/oversized entries retain `/begin`, and conflicts invalidate both caches before the existing snapshot retry. Gateway preconditions and every-read model verification are unchanged.
- ID-only stamps are insufficient for the current SDK: `getById` also supplies values, temporal fields and provenance for exact retraction changes. Store lossless V8 assertion tuples, with immutable fact IDs and compact, isolated scope prefixes; entries over 4 KiB decline.
- Budget: 256 MiB tuples plus at most 64 KiB scope names. NS retains stamp, address and both history-status attributes; reader workers disable this cache. Driver records the budget and includes 449 MiB writer caches in its aggregate 4 GiB cache guard.
- The 100k-subject unit retains all 400,000 predecessor rows with zero evictions, about 155 MiB accounted bytes plus 230 scope bytes. This is capacity evidence, not a 100k engine timing run.
- Updates come from acknowledged receipts, snapshot/row reads and validated by-reference reach hits; own retirements remove old IDs. Capture predecessors before yielding, so concurrent eviction cannot turn admission into a false application conflict.
- Engine-free coverage: 16 tests passed (one gateway test skipped); package build/declaration/type checks passed. Tests cover exact fields, signed-zero time, bounded eviction, scope isolation/reset, one-request staging, missing fallback, typed conflicts/retry, runtime forwarding and reference-read restoration.
- Lean `concurrent-commits`, `commit-observation`, `adapter` and `cache-budget` passed in recovery3, including 3,200 concurrent commands and 500 one-winner races. Layout fixture creation and existing lean query-capability assertions now use the same layout selection.
- The new real gateway case reached the expected typed 409, but its success-only `onRequest` counter incorrectly expected to see that failure; fixed to count actual request invocations and inspect the typed HTTP cause. The corrected recheck was canceled before admission (exit 128) at the two-hour cutoff; its full real-gateway case remains UNVERIFIED.
- The requested 10k before/after measurement did NOT run: writer measurement was gated behind that test. Dense/sparse before and after medians and the 1.00-calls/commit scale target remain UNVERIFIED; no synthetic timing is substituted.
- Writer commands: `DX_H7_WORK=lab/experiments/EXP-DX1/h7/writer-work.sh DX_H7_WRITER_GATES=both` through `run.sh`/`heavy.mjs`; `writer-measure.mjs` adapts B6 to 10k subjects, 500 dense then 60 sparse commits, with operation-bound HTTP counts and per-receipt content checks. `DX_H7_RECHECK_ONLY=1 DX_H7_WRITER_GATES=1` selects the short corrected test recheck.
- Cleanup: all DX-H7 containers, networks and volumes are gone; no seed retained. Temporary reader worktree and generated setup/source copies removed; raw failures/results retained. No new reader timing, full NS, or 100k engine benchmark was run.
