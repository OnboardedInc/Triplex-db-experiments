# EXP-P2X2 report — CX-P2X2

North star: P2. Authority: lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md (1, 1.1, 2, 2.1, 4.1). Diagnostic experiment; no PAIR-0, production promotion, or P1 acceptance is claimed.

## Result and decision

**D1: native closed under the preregistered rule.** F3 pooled p50 = **7.68 ms > 6 ms**; F5 fresh p50 = **33.00 ms > 20 ms**. F5 resolve = **5.52 ms/commit**, which does **not** cross 7 ms. The rule is OR: either of the first two observations closes the native path. `receipts/preregistered.json` was written before the slot and measurements.

Disposition required by R39 4.5 / Q96c: lane X P2 goes through P2B; P2X remains A1 for P3/correctness comparisons; do not pursue its statement-cut round. Proposed TARGETS/scorecard wording for the orchestrator: “XTDB 2.2.0 does not meet P2 natively on this host; observed floor 33.0 ms Triplex service p50 (7.68 ms pooled bare pipeline); mechanism: the serial indexer.” TARGETS and the scorecard were left unchanged because this builder is scoped to experiment artifacts; the independent reviewer/orchestrator must apply that disposition.

Mechanism qualification: fresh engine execute mean is 9.51 ms, await 6.26 ms (65.9%), source append estimate 3.25 ms, resolve 5.52 ms per Triplex commit. The measured resolve is already below the 7 ms threshold. Serial engine await is the largest engine segment, but point reads and sequential client statement round trips also materially contribute to the 33 ms service floor. This is not evidence that resolve alone has an irreducible floor above 7 ms. One warm F3 segment reached 5.78 ms p50; the pooled 1,000-command statistic is 7.68 ms, and the independent F5 threshold still closes D1.

The requested experiment program is **partial**: F6 at 10k scoped history was NOT RUN after two retained, slow setup attempts. F7 has no qualified full trace after calibration failures and heap pressure; F8/F9 were NOT RUN. F4 was optional and NOT RUN. Strict `waitedMs = 0` telemetry is absent in this historical build, so that gate remains unverified.

## Sources, slot and workload

- Branch: `exp/P2X2-commit-floor`; base/main build `9a7996e2a242690edbc86417283d8c7348950adb`.
- P2X package source: `fb6681a4c5b54bfef63ad5ee670047946a24617c`, separate detached worktree under durable evidence. RT01: `1283f9fb3fe3a90448785f28d420c92a622a1991`, also separate. No package source was edited or rebased.
- Exclusive `xtdb-s1`, holder `CX-P2X2`, image pinned by slots.json, CPUs 4–5, 3.5 GiB, heap 2 GiB/direct 1 GiB, no follower, `server.numThreads: 300`. The configuration directory override preserved exact YAML bytes without changing shared config. Residents stayed running; their CPU/memory and host load are in every before/after snapshot.
- Frozen seed `EXP-P2X2-v1`, 10,000 eligible subjects, generator copied byte-for-byte from P2X. `trace-freeze.json` binds the 600-second trace digest, offer count, resends and lost ACKs. F2/F3 were ABAB, 500 commands per segment, pooled to 1,000 per arm; fresh F6 was main/RT01/main/RT01.
- The prepared candidate API owns per-subject FIFO, up to eight same-subject commands per engine transaction, at most 16 concurrent subject groups. The offer driver has no writer semaphore. Stamp source is P2X’s engine-decided packed system-time position; this does not implement RT01 round B or p9-stamp-ms.
- The unexecuted F8 helper uses X05’s four-query, 40-entity worker pull, four workers and total in-flight cap 16, with 64 or 256 logical closed-loop readers. Its R16-shaped read domain is immutable and separate from Triplex writes: this helper would measure contention only; no reader evidence was acquired, and it cannot certify full P1 shared-world/split-read/maintenance acceptance.

## Arm completion

| Arm | Status |
| --- | --- |
| F1 | 1,000 commands; independent full-row accounting supplement |
| F2/F3 | ABAB, 1,000 commands each; independent full-row accounting supplement |
| F4 | NOT RUN, optional |
| F5 | Fresh and completed 10k-history point, 150 each |
| F6 | Fresh main/RT01 ABAB complete; aged pair NOT RUN |
| F7 | Five-second smoke complete; four full attempts unqualified/interrupted |
| F8 | NOT RUN, including its prepared smoke |
| F9 | NOT RUN |

## Latencies

Milliseconds; closed-loop F5/F6 drop exactly 15 of 150 service samples. Closed-loop wall commits/s includes post-ACK receipt/content checks. Trace ACK latency includes scheduled-offer queueing and lost-ACK retry resolution; errors/refusals are reported separately, not counted as goodput.

| Arm | n | p50 | p90 | p99 | max | wall commits/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| F1 (1 fact) | 1000 | 8.02 | 13.89 | 21.58 | 78.91 | 109.30 |
| F2 (10 facts) | 1000 | 14.10 | 22.91 | 41.93 | 72.40 | 63.04 |
| F3 (10 facts) | 1000 | 7.68 | 11.56 | 21.81 | 102.89 | 119.57 |
| F5 P2X fresh | 135 | 33.00 | 42.17 | 63.26 | 67.52 | 16.79 |
| F5 P2X history-10k | 135 | 60.13 | 81.96 | 115.71 | 122.82 | 1.75 |
| F6 p2x2 fresh | 135 | 35.42 | 40.67 | 51.50 | 52.64 | 17.06 |
| F6 p2x2 fresh | 135 | 56.91 | 118.00 | 197.20 | 284.30 | 8.28 |
| F6 rt01 fresh | 135 | 37.55 | 45.96 | 80.16 | 196.58 | 14.48 |
| F6 rt01 fresh | 135 | 53.12 | 65.49 | 80.87 | 86.76 | 10.24 |

## Engine and client breakdown

Engine means come from before/after count and sum differences, not lifetime averages or sliding quantiles. Source append is execute minus await when their counts match. `node_tx_submit` has count zero on pgwire; it is unavailable, not a measured zero-cost append. Full pgwire latency, compactor and JVM series remain in raw snapshots.

| Arm/attempt | execute mean | await mean | append estimate | resolve/command | submit p50 | source-cut p50 | claim p50 | receipt p50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| F1-2026-11-09T04-01-29-830Z-bb9e6b | 4.39 | 2.52 | 1.87 | 0.10 | — | — | — | — |
| F2-2026-11-09T04-01-43-739Z-b4f81f | 7.81 | 5.19 | 2.62 | 3.27 | — | — | — | — |
| F2-2026-11-09T04-02-06-853Z-2c0c89 | 5.52 | 3.79 | 1.73 | 2.13 | — | — | — | — |
| F3-2026-11-09T04-01-57-427Z-e2a7a1 | 6.69 | 4.25 | 2.44 | 2.65 | — | — | — | — |
| F3-2026-11-09T04-02-17-445Z-8a4c01 | 4.30 | 2.16 | 2.14 | 1.82 | — | — | — | — |
| F5-p2x-fresh-2026-11-09T04-03-38-727Z-257ad2 | 9.51 | 6.26 | 3.25 | 5.52 | 23.22 | 3.08 | 2.69 | 2.94 |
| F5-p2x-history-10k-2026-11-09T04-26-59-722Z-6c69e7 | 29.02 | 26.24 | 2.78 | 24.67 | 44.32 | 5.22 | 3.84 | 4.01 |
| F6-p2x2-fresh-2026-11-09T04-03-52-447Z-3f32b5 | 11.28 | 8.28 | 3.00 | 8.12 | 26.45 | 2.89 | 2.57 | 2.87 |
| F6-p2x2-fresh-2026-11-09T04-04-20-097Z-07b4db | 25.51 | 22.31 | 3.20 | 20.67 | 40.99 | 4.29 | 3.86 | 4.30 |
| F6-rt01-fresh-2026-11-09T04-04-05-408Z-df5fa7 | 13.84 | 10.73 | 3.12 | 10.34 | 27.91 | 2.94 | 2.67 | 3.17 |
| F6-rt01-fresh-2026-11-09T04-04-42-451Z-b0b63c | 20.85 | 17.32 | 3.53 | 16.65 | 39.29 | 3.75 | 3.36 | 3.81 |

### Resource observations

VM CPU is computed from per-vCPU /proc/stat differences; heap is the sum of JVM heap-pool gauges. Values span each recorded before/after pair, including observation overhead. Resident CPU percentages are the instantaneous Docker samples.

| Attempt | host load1 before/after | VM CPU % | pinned CPU % | heap MiB before/after | resident X CPU % before/after | resident Q CPU % before/after |
| --- | --- | ---: | ---: | --- | --- | --- |
| F1-2026-11-09T04-01-29-830Z-bb9e6b | 9.82/12.57 | 12.79 | 24.72 | 1,336.64/944.56 | 1.07/1.23 | 0.00/0.00 |
| F2-2026-11-09T04-01-43-739Z-b4f81f | 12.57/12.41 | 16.71 | 40.26 | 949.56/1,291.55 | 0.96/1.17 | 0.00/0.00 |
| F2-2026-11-09T04-02-06-853Z-2c0c89 | 11.79/11.33 | 11.44 | 27.43 | 1,068.96/1,421.80 | 0.97/0.99 | 0.00/0.00 |
| F3-2026-11-09T04-01-57-427Z-e2a7a1 | 12.21/12.04 | 17.39 | 40.13 | 1,297.55/1,059.96 | 1.13/2.75 | 0.00/33.86 |
| F3-2026-11-09T04-02-17-445Z-8a4c01 | 10.74/11.64 | 16.36 | 39.16 | 1,432.80/1,211.90 | 0.67/1.13 | 0.00/2.34 |
| F5-p2x-fresh-2026-11-09T04-03-38-727Z-257ad2 | 7.24/6.95 | 17.06 | 42.12 | 1,431.14/1,110.12 | 0.65/0.70 | 21.11/7.51 |
| F5-p2x-history-10k-2026-11-09T04-26-59-722Z-6c69e7 | 10.38/8.13 | 28.07 | 68.66 | 919.98/1,088.65 | 0.81/1.05 | 148.63/48.97 |
| F6-p2x2-fresh-2026-11-09T04-03-52-447Z-3f32b5 | 7.04/6.72 | 18.00 | 45.21 | 1,115.12/1,346.38 | 0.72/1.26 | 0.00/0.00 |
| F6-p2x2-fresh-2026-11-09T04-04-20-097Z-07b4db | 6.60/7.47 | 32.20 | 56.79 | 1,372.26/1,145.15 | 0.70/183.18 | 0.00/33.28 |
| F6-rt01-fresh-2026-11-09T04-04-05-408Z-df5fa7 | 6.72/6.60 | 18.76 | 47.60 | 1,349.38/1,367.26 | 1.99/0.82 | 0.00/0.00 |
| F6-rt01-fresh-2026-11-09T04-04-42-451Z-b0b63c | 7.91/8.26 | 45.33 | 61.38 | 1,151.15/1,324.21 | 137.99/141.89 | 0.00/0.00 |

The timing arrays retain initialization and warm-up observations; service quantiles alone drop 15 warm-ups. The three point reads are normal commit-path reads. Extra post-ACK checks are verification load and are outside the timed service/ACK endpoint.

## Trace accounting and gates

G-OFF: original five bench tests and P2X subject-stamp 13/13 passed before the slot (the ten live cases used fresh UUID scopes on resident port 5470); the final bench suite and live composition smoke are retained. G1 ON `G1-xtdb-20261109T035632Z-48b59d` and OFF `G1-xtdb-20261109T035857Z-203df3`: 88/88 each, fresh slot, exact P2X packages. Historical harness adaptation was limited to config binding, pinned pnpm store and a single outer heavy admission; package/test/oracle source stayed at fb6681a4. These are the historical build’s G1 gates, not current-contract promotion.

All measured pre-arm compactor gauges were checked for zero. Disk snapshots and setup forecasts retained at least 5 GiB host free. Exact requested-cut contents and zero explicit client await queries were observed; the engine’s no-extra-wait counter is unavailable, so G-RYOW is not promoted to PASS.

## Predictions

1. **FALSIFIED** as the joint prediction: F1 8.02 ms is in 8–16; pooled F2 14.10 ms vs 15–25; pipeline improvement 6.42 ms vs 2–5. Pooled F3 is above the 6 ms low falsifier; its warm second segment is below.
2. **MET** for F2: both segments have await share above 50% and append estimate below 5 ms (see engine table). Optional F4 comparison **NOT RUN**.
3. **FALSIFIED** for the joint range prediction: fresh/aged service p50 are 33.00/60.13 ms, within predicted ranges; the fresh sum of point-read p50s is 8.70 ms, below 9–17. Submit p50/fresh service p50 is about 70.4%.
4. **NOT RUN**: no completed main/RT01 10k scoped-history pair. Fresh results do not answer this prediction.
5. **NOT RUN as a qualified full trace**. Partial attempts missed latency/progress badly, but harness failures and cumulative heap pressure prevent using them as the requested clean comparison. No MET verdict is inferred from those failures.
6. **NOT RUN**: full 64/256-reader windows and their ratio were not executed. The prepared read domain also has the P1 limitations stated above.
7. **NOT RUN as a complete correctness claim**: strict wait telemetry and the missing F6 aged pair prevent full certification; observed per-arm contents, accounting, idempotency and replay results are reported above.

## First failures, deviations and retention

- First bare smoke: missing R16 tables; fixed by explicit schema/data initialization. Original failure retained.
- Custom wire read-back omitted portal Describe and lost SELECT column names. Original F1–F3 G-ACCT receipts failed closed. A separate postgres.js audit (`bare-independent-audit-*`) read every original claim, ledger/feed/current row and checked all values plus IDs, counts, positions and socket-write shape; all five segments qualified there. Original failed receipts were not rewritten. The encoder now emits Parse/Bind/Describe/Execute/Sync and has a regression test.
- Historical G1 attempts interrupted for old config binding / nested admission remain unqualified raw attempts. Only the final named ON/OFF receipts are used.
- A0 preload attempts retained 2,448 and 7,040 committed claims, respectively; both exited 143 after an owned process stop. An interrupted final staged group is not certified as accounted; terminal engine observations are in separate abort-audit receipts. New namespaces were used for the second setup. Neither partial scope is called a 10k history.
- P2X history completed 10,000 public commits, eight per engine transaction: 10,000 claims and 240,000 assertion/journal rows. F5 adds 150 afterward; later trace comparisons share the same continuously growing scope and therefore are not identical-history matched pairs.
- F4 was optional and skipped. Existing TX2_CONFIG_DIR could potentially support an InMemory overlay; no claim of engine incapability is made.
- No package, acceptance-contract, TARGETS or scorecard files were changed. Existing pinned paths in this main-based worktree were not modified; historical evidence-worktree gate adaptations are listed below with old/new hashes. No merge, push or publication was performed. No subagents were launched.

## PASS / verdict audit

| Place | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `analysis.mjs` decision/report D1 | Exact threshold comparisons; empty/missing values cannot select D2 | Named attempt samples, warm-up rule, immutable preregistration | Raw samples/manifests, source objects, exact build and slot |
| `bare.mjs` gates | Original accounting failed on decode; never used alone | Unique attempt command namespaces | Live slot before/after hashes and owner |
| `audit-bare.mjs` qualified | Every expected stored row/value, IDs, counts, final state, write shape | Fresh independent read of original immutable namespaces on same uninterrupted container | Original receipt digests and container ID, new before/after binding |
| `service.mjs` gates | Returned transaction/position and ten exact facts; unique receipts in final helper | Unique commands, 150 observed responses; 15 dropped only from statistics | Chosen source/build/dependency preimages and live slot |
| `candidate-live.mjs` qualified | Real group of eight, parallel subjects, original duplicate/lost receipt, exact facts, zero CAS | New scope and fresh responses | Exact runtime build, before/after owner/config/source |
| `preload.mjs` account | Distinct public tx IDs and exact claim count; row counts retained; not full semantic acceptance | New scope and attempt IDs; partial attempts remain unqualified | Build manifest and actual slot snapshots |
| `trace-run.mjs` gates | Independent claims; exact-cut facts/types; original receipt bytes; full subject multiset sample from history/offers; actual hidden-submit conflict counters | Frozen schedule, per-attempt IDs, current ACKs and deliberate resends/lost ACKs | Build/generator digests, history/prior-trace artifact checksums, slot/config and source preimages |
| `observe.mjs` binding | Owner, endpoint, image, cap, config bytes and source identity checked; mismatches cannot qualify | Live inspections and separate before/after observations | Same container/start/config/source across attempt |
| Durable cleanup script | Owned holder checked; successful daemon listings prove container/volume absence and running resident identity | Fresh before/down/after observations | Exact container, volume, lock and reservation |
| Historical G1 verifier | 88 actual outcomes, no skips/fails; source/build/raw hashes | New G1 scopes in this slot turn | Historical oracle/runner and exact rebuilt P2X exports |

The final committed helper additionally rejects stale/incomplete bindings, generator drift and missing replay samples; its eleven offline tests pass. Those failure-path guards were added after measurements and have not received a fresh engine run. Executed helper preimages remain content-addressed in durable source-objects. Builder verification is not an independent promotion review. G-RYOW remains explicitly unverified; no truthy string is treated as a PASS.

## Evidence, cleanup and remaining work

Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/`. Large raw samples/source archives stay outside git; the committed SHA256SUMS and index describe selected payloads. Source archives pin all three revisions; runtime Effect/postgres dependency manifests, build manifests, executed harness source objects, engine metrics, JVM/VM CPU/host snapshots, first failures and raw gate outputs are retained.

Cleanup completed at 2026-11-09T05:04:44.766Z (about 72 minutes after engine start). `cleanup.json` records the exact owned container ID, successful engine.mjs down/remove-volume exit, successful empty daemon container/volume listings, absent lock/reservation, and identical running resident IDs. The slot is free. Source/build worktrees, archives, raw observations and first failures remain retained for review.

Open: independent review; a clean, qualified full F7 and F8/F9 turn; orchestrator TARGETS/scorecard disposition; F6 aged main/RT01 comparison; strict no-extra-wait telemetry; full shared-world P1 acceptance; p9-stamp-ms and RT01 round B were not implemented.


## Unqualified trace attempts

The immediate verification evolved from a full journal/subject read to a bounded native fact pull (`scope_key`, returned `tx_id`, entity and recorded-position cut), with full-subject reads only in the replay sample. That bounded check is an independent storage visibility probe, not a certified public SDK pull. All comparison attempts below remain unqualified; no censored latency quantile is used for a prediction.

| Attempt | retained WAL offers | retained WAL ACKs | retained WAL errors | recovered committed claims |
| --- | ---: | ---: | ---: | ---: |
| F7-0-2026-11-09T04-30-57-834Z-194c1b | unknown | unknown | unknown | 695 |
| F7-0-2026-11-09T04-37-43-822Z-e1b682 | 3745 | 980 | unknown | 973 |
| F7-0-2026-11-09T04-44-07-851Z-b81089 | 4036 | 1521 | 2486 | 1510 |
| F7-0-2026-11-09T04-57-10-169Z-90edcb | 3744 | 89 | 288 | 157 |

Failure reasons: the first attempt fetched a full journal after every ACK; the next still read every accumulated assertion for every ACK; the third hit an out-of-scope variable in its error handler during drain, which disposed the runtime and generated subsequent interruption/disposed errors. The final attempt fixed that handler (regression-tested), but by then the cumulative slot state had severe heap pressure and could not complete in the remaining reserved turn. It was explicitly stopped. Reconstructed claims are observations, not a zero-unaccounted or correctness PASS. The first attempt lacks a complete offer/ACK WAL; later attempts retain one.

The final heap observation records 2,121,294,648 bytes in G1 Old Gen against a 2,147,483,648-byte heap cap (about 98.8% in old generation alone). The container was still healthy and not cgroup-OOM-killed. This cumulative state is not used as evidence for a clean P2 floor or a clean reader comparison. Full F7, F8 and F9 must be rerun in a clean qualification turn if still wanted; D1 does not depend on these attempts.

## Historical harness hash changes

Main-based existing source/contract files were unchanged. These two historical evidence-worktree files were adapted; their full diff is in `historical-gate.patch`. They are listed conservatively whether or not a historical contract pins them. No contract was changed or re-pinned.

| Path at fb6681a4 evidence worktree | original SHA256 | adapted SHA256 |
| --- | --- | --- |
| lab/bin/engine.mjs | 80df499ed39cdf08dd1807d012d7451b2ee27b0aa564554fd52c52d70ffe6c0b | 2df11647e5eeaa256261d9abb9f403acd7d20b7e86d8b55682afc35fb0c75346 |
| lab/bin/gate.mjs | 0c7418e94d092eee679497dfc1142e85a2c245095165c21ef490220a1ae89f8f | e416ec031c1e8984403025682c911240245371a090f0c1f887f33b511b4f4bdc |
