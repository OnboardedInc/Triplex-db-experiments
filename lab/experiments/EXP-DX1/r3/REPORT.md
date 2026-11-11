# DX-R3 part 2 — local reads and bounded verification
North star: P1 pinned concurrency, P3 ordered following, P4 current reads, P5 coexistence; lab/SCOPE.md, NORTH-STAR.md, TARGETS.md.
Merged lane/d-native at 02072856; implementation 4090cc57, proof optimization 9671a55a; report committed last. No acceptance promotion.
Result: latency/locality/memory improved; throughput targets remain missed. Full matched pair was queued but never admitted.

## T1–T6 (fresh 10k diagnostic, three reader threads, CPUs 4–7; engine CPUs 0–3)
| Target | Measured after fixes |
| --- | --- |
| T1 | 64: 42,086/s; 256: 36,108/s (<40k); 1024: 31,862/s. Ratios 256/64=.858; 1024/256=.882 (<.9). NOT MET. |
| T2 | At 256 read p50/p99=.767/4.895 ms (p99 target 25 ms met diagnostically). |
| T3 | Local shares L1/L4/L16=1; L64=.999946; L256=.998614; L1024=.997419. |
| T4 | Whole-process CPU upper bound/local pull=.100279 ms at 256; .113986 at 1024 (<.15). Includes writer/feed/collection. |
| T5 | RYOW wait p50/p99=2.559/35.071 ms; 158/3,415 watermark-timeout fallbacks; all 3,415 correct. Still waits. |
| T6 | Copy 53,594,592 B + accounted history 118,268,410 B; true exit peak 3,887,108,096 B=3.620 GiB (<4). |
The generic driver marks 256/1024 client-saturated (worker ELU .926/.970); these are diagnostic results, not NS acceptance.
All 8,337,364 after-fix reads passed stamp+whole-world digest; zero violations/errors. Worker totals plus RYOW match retained observations.

## Same-hold before/after (p2d; inline feed and FIFO in both arms; 30 s levels, 2 s settle)
Before=mixed pending/future split target, 64 MiB window,640 MiB fallback cache/thread; after=offered/earliest, 192 MiB,16 MiB.
| Readers | Before correct/s / p99 ms / local | After correct/s / p99 ms / local |
| --- | --- | --- |
| 1 | 21,338 / .138 / 1 | 21,447 / .137 / 1 |
| 4 | 54,321 / .157 / 1 | 54,523 / .156 / 1 |
| 16 | 54,867 / .341 / .999993 | 54,385 / .341 / 1 |
| 64 | 32,557 / 1.167 / 1 | 42,086 / 1.191 / .999946 |
| 256 | 17,051 / 1.823 / .999267 | 36,108 / 4.895 / .998614 |
| 1024 | 20,359 / 36.095 / .942907 | 31,862 / 5.919 / .997419 |
Before: 7,154,215 reads, zero errors/violations; peak 4,586,971,136 B. Both preserve the frozen writer trace and 10% split attempts.
After routes(local/fallback): L1=600513/0; L4=1526668/0; L16=1522764/0; L64=1178333/64; L256=1009684/1401; L1024=889842/2303.
The earlier legacy/per-loop vs inline/fair p2b control improved256 p99 95.743→1.783 ms and local .940381→.999602, but only13,208→17,337/s.

## What limited256, and design as built (12 lines)
- A fresh lower-bound diagnostic found 231.247/256 reader-equivalents held waiting for future ACKs, mean 134.929 ms/straddle.
- Uniform selection across the next 250 ms created client think-time, excluded from service latency but holding closed-loop slots.
- Prefer unacknowledged offered commands; otherwise the earliest upcoming frozen command. Both reads/basis checks remain; no extra writes.
- Mean straddle waits at 256 fell from about 138 to 23 ms; actual after-fix straddles 91,291, all correct.
- Remaining limit is reader CPU: thread CPU 2.60 cores at 256 and 2.76 at 1024; process cost/pull rises with concurrency; no detailed CPU profile claimed.
- One main-process follower uses Replica.source inline complete replacements; original journal rows already carry the required clock, so no gateway change needed.
- TimedSource validates same-journal record clocks; unknown/ambiguous clocks decline. Legacy transport is only a control/recorded replay here.
- Immutable body/summary SharedArrayBuffers are shared; workers apply index deltas, with no hot-path entity-body decoding.
- Default retention remains 20k positions / 64 MiB; this benchmark explicitly uses 192 MiB to cover its capped 2,000-receipt cohort.
- Exact R/position/VT/closure eligibility; ahead reads wait nominal 10 ms (actual reported), then gateway fallback with unchanged basis.
- FIFO worker-wide yields also cover sweeps; completed request timers are cleared; all facts contribute via per-version summaries and pinned lazy worlds.
- Lossless disk spill, bounded dictionaries, byte verdicts and exact expected-state memoization keep every read checked after all ACKs; checkpoints replace atomically.
After worker fallback reasons: watermark timeout only outside the first raw-oracle captures; no expired-window fallbacks in the final diagnostic.

## Proof, memory and P4 meaning
Fresh merged-inline differential: 200,000 pairs, zero differences; 2,118 writes; 199,834 local / 166 fallback; 762.194 s.
Includes 398 floor reads and 201 commit straddles; scope dxr3-diff-1794391950173; driver exit 0, OOM=false (p2-differential-f.log.gz).
Recorded-input gate: all 1,000 worlds at bootstrap/end/floor, 2,000 commits and 10,000 optimized observations equal; historical only.
RSS bytes by diagnostic phase: warmup2481508352,L1=1716543488,L4=2418745344,L16=2435768320,L64=2479357952,L256=3032420352,L1024=3885797376.
Full 45 s ladder/P4/sweep pair memory: NOT MEASURED. Full pair was cancelled before admission when two 900 s arms no longer fit the four-hour budget.
P4 weighted phases were not run. Existing quota arithmetic counts local verified pulls and divides best P1 goodput by 4 engine cores, even with zero pull RPCs.
That is composition normalization, not engine query capacity; report local pulls/client CPU core and CPU/pull, with replication/backend costs separately. No bar changed.
Unchanged P4 quota arithmetic here gives 13,630.842 local-inclusive pulls/s/core (best L4); mixed L1 p50/p99=.020/.137 ms measures packed/lazy views; eager JS row materialization is deferred, not timed per hot pull.

PASS audit: Replica/TimedSource validate complete fresh source cuts/clocks; RecentReads checks exact retained bytes, prefix/floor and VT/closure before local admission.
Prepared summaries/lazy worlds bind every fact to selected versions; canonical differential compares actual bytes. Spill/byte verdicts retain all original fields and call unchanged judgeRead.
ExpectationCache partitions only at model R/V boundaries and invalidates on late ACKs; >150k equivalence cases pass. Split selection uses only actual supplied trace candidates/real ACKs.
Phase checkpoints explicitly say PENDING; final verdicts require current-scope all-ACK comparisons; exit zero alone never qualifies. Acceptance/pins unchanged; no edited pinned paths found.
Checks: 19 node tests, 22 replica vitest tests,three TypeScript configurations; focused lint 0 warnings/errors (driver has 5 pre-existing warnings); abrupt-stop checkpoint recovery tested.
Commands from repo root (all heavy runs wrapped): `DX_R3_ARMS="b c" node lab/bin/heavy.mjs --label DX-R3-p2-compare-d -- bash lab/experiments/EXP-DX1/r3/run.sh compare p2d`.
Proof: `node lab/bin/heavy.mjs --label DX-R3-p2-differential-f -- bash lab/experiments/EXP-DX1/r3/run.sh differential p2f`.
Gates: `node --experimental-strip-types --test lab/experiments/EXP-DX1/r3/*.test.ts`; pnpm with `--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store` exec tsc/vitest/oxlint.
Queued/cancelled full command: `DX_READ_PATH=replica DX_DRIVER_MEMORY=12g DX_DRIVER_HEAP_MB=8192 bash lab/experiments/EXP-DX1/h4/run.sh pair tx2-dxr3-p2full --rung 10k --seed-batch-facts 2000 --replica-history-mib 192` (heavy-wrapped, DX_STACK_EVIDENCE set to DX-R3).
Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/ — compressed raw output; first failures/cancelled unadmitted attempts retained. No source captures/manifests added.
Owned containers/volumes/networks are gone and the measurement lock released. No full external oracle, root full check, 100k qualification, independent review, publication, push or main merge; full pair/throughput remain open.
