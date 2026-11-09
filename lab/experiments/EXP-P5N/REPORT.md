# EXP-P5N

## Round 1 (builder text; saved to the branch by the orchestrator because the subagent could not create REPORT.md)

## Results

| Item | Result |
| --- | --- |
| 10k activation wall | Baseline (instrumented): W1 126.8 s, W4 59.2 s. After the five CPU fixes: W1 66.7 s. After the restructure: **W1 35.2 s, W2 21.5 s, W4 13.1 s, W8 10.3 s** (764 to 969 subjects/s at W4 to W8). |
| Journal triples (option C) | 196 rows per page exactly (30,628 total = 4 x 157 + 3 x 10,000). Journal row work is 0.44 to 0.83 ms of a 8.5 to 13.8 ms writer commit (5 to 6%). It is 0.2% (W1) to 1.3% (W8) of activation wall. Dropping the journal would not move P5. |
| Gates | G-FP, G-WORLD, G2, G5, G-JNL and G-REC all pass at 10k (details below). |
| Sweep ratio | **INVALID-INCONCLUSIVE.** The run was stopped after 6 rounds (5 pairs, 1 A/A). |
| 100k | Not seeded and not run. |

## What changed (commits in order)

| Step | Change | Commit |
| --- | --- | --- |
| 1 | Writer commit split, harness split, main-thread utilization, per-page timeline | `0f0c78ea` |
| 2 D1 | Sort keys computed once per fact, with an order-equality test | `713651a1` |
| 2 D2 | `worldSha256` per subject; full world only for sampled subjects | `a873ce43` |
| 2 D4 | One batched outbox read per page | `8666a008` |
| 2 D7 | Journal probe only for `_tx/` frontier ids | `de4cd0b8` |
| 2 D8 | No DELETE-by-id probes for assertion rows; retirements keep them | `2d5755d7` |
| 3 D3, D5, D6 | In-worker SQLite reads on the owner's gate; bounded queue with one publisher; worker cap 16 | `fdc751cd`, `cfc71fd7` |

Later commits add the gates, the recovery arm and harness fixes. The tests are `lab/bench/test/p5n.test.ts` plus a one-line update to a qlever test (see Checks).

## Predictions against measurements

| Step | Prediction (low, center, high) | Measured | Verdict |
| --- | --- | --- | --- |
| 1 | COMMIT plus fsync per page at W1: 5, 8, 12 ms | mean 5.7, p50 4.7 ms | hit (low end) |
| 1 | Journal row work per page: 4, 6, 9 ms | 1.11 ms mean | **miss, 3.6x under** |
| 1 | Readback plus map append: 3, 5, 7 ms | 4.6 ms | hit |
| 1 | Unattributed main-thread time at W1: at least 10 s | 30.2 s | hit (inflated by load) |
| 2 | 10k W1 wall after the five fixes: 35, 45, 55 s | 66.7 s (load 14) | **miss, above** |
| 2 | 10k W4 wall after the five fixes: 12, 15, 18 s | not run | not run |
| 2 | Decode CPU at most 0.6 ms per subject | 0.55 ms (D1 alone 0.62) | hit |
| 2 | Outbox read at W4 at most 0.5 s | 0.07 s (measured on step 3 code) | hit |
| 2 | Commit per page at W1: 15, 20, 26 ms | 32.6 ms at load 14; 21.4 ms on step 3 code | hit on step 3 code |
| 3 | 10k W4 wall: 6, 7.5, 9 s | **13.1 s** (12.9 s with the fingerprint gates) | **miss, 1.45x above high** |
| 3 | 10k W6 wall: 4.5, 5.5, 7 s | not run (W8 10.3 s) | not run |
| 3 | Sweep-core CPU: 1.8, 2.1, 2.5 ms per subject | 2.60 (W1), 2.94 (W4), 3.71 (W8), including the SQLite thread and 0.3 ms of world hashing | **above** (below the 3.0 stop threshold at W4) |
| 4 | 100k W4 projection: 55, 65, 80 s | 131 s linear, about 157 s with growth | **miss** |
| 4 | 100k W3 projection: 70, 85, 100 s | not run (between W2 and W4, so above 131 s) | not run |
| 5 | Activation commit hold p99 at most 30 ms | writer total p99 29.5 ms at the baseline; final code not measured | not run |
| 5 | Commit and read p99 ratios | see sweep ratio | inconclusive |
| 5 | Feed lag p99 at most 250 ms | no feed consumer | not run |
| all | Journal rows per first-activation page exactly 196 | 196 per full page, 52 on the last; the activation commit writes 1 fact and 5 journal rows | hit |

## Divergences

1. **CPU is no longer the limit.** W4 uses about 1.8 cores (10k x 2.9 ms over 13.1 s). The publisher is busy 4.7 s and idle 7.7 s of 12.8 s. Each page spends about 245 ms in the read. SQLite page transaction p50 is 105, 148, 192 and 275 ms at W1, W2, W4 and W8 at constant CPU per subject.
2. **The serial publish chain is the floor.** One page costs about 44 ms on the publisher:
   - core `transact` 18 to 25 ms
   - readback plus map append 3 to 4 ms
   - claim lookup and outbox read, small
   - SQLite writer 8.5 to 13.8 ms (counted inside the 44 ms)

   That is 6.9 s at 10k and about 69 s at 100k, 69% of the bar before any read cost. At W8 the publisher is busy 6.9 s of 9.9 s.
3. **Scaling is weak.** Speedups are 1.6x (W1 to W2), 1.6x (W2 to W4) and 1.3x (W4 to W8).
4. **P1 risk.** In-worker readers hold a read transaction almost continuously.
   - WAL max rose to 60 to 81 MB, against 7 to 31 MB before. The bar is 64 MiB.
   - In `s3-ckpt` (W4, 18 s, load 10), RESTART returned `readers-busy` 3 times and none completed during the sweep.
   - The G-P1 bar of one RESTART every 10 s is not met, and the writes are ten times larger at 100k.
5. **Option C is cheap.** Journal rows are 60% of the rows in a commit but 5 to 6% of writer commit time. The brief's wall share (1 to 2%) was right; its row-work estimate (6 ms per page) was 5x too high.
6. **Noise.** Baseline W4 was 59 s against 33.9 s in P5B round 3 on the same code path, at load 15 against about 11.

## 100k decision

| Workers | 1k wall | 10k wall | 100k, linear | 100k, with +20% on the slope |
| --- | --- | --- | --- | --- |
| W1 | 3.4 s | 35.2 s | about 353 s | about 424 s |
| W4 | 1.3 s | 13.1 s | 131 s | about 157 s |
| W8 | 1.3 s | 10.3 s | 100 s | about 120 s |

Both the 85 s seed rule and the 120 s stop rule fail at W4.

**Remaining terms, ranked:**
1. The serial publish chain, about 44 ms per page, mostly core `transact` and harness verification.
2. SQLite read contention across workers.
3. Sweep-core CPU, about 2.6 to 3.0 ms per subject.
4. WAL growth and checkpoint starvation.

## Gates

| Gate | Result |
| --- | --- |
| G-FP | Equal to O-DOMAIN at the seed basis before activation (39.8 s) and after the W4 activation (35.4 s), and after the recovery run (51.2 s). Receipts `s3-fp-w4`, `rec`. |
| G-WORLD | 1,000 of 1,000 sampled worlds from the in-worker route equal the owner-route worlds as canonical bytes; each `worldSha256` equals its own world's hash. |
| G2 and G5 | G2 reconcile equal to O-DOMAIN on 1,000 sampled subjects (1 in 10). G5 deliveries equal on all 157 pages (7,831 deliveries), in publication order. |
| G-JNL | Checked on 18 pages: `transactionByCommand` resolves; core `match` returns exactly 2n `:_tx/change` and n `:_tx/changed-entity` rows; raw journal rows are 4 + 3n; changed-entity set equals the page's outbox entities. The store's own SQL counts rise by exactly the rows written (50,634, of which 20,001 domain rows). |
| G-JNL, reverse lookup | The reverse match from a changed entity to its transaction is checked in a small-store test (`p5n.test.ts`), because it scans the journal on a 10k store. |
| G-REC | Real SIGKILL of the sweep controller at three points: page 20 after read, page 75 after commit before cursor, page 107 after cursor. Resumed with 157 publications, 2 retries answered from the stored claim, deliveries equal the independent reference, ledger counts exact. |
| Sweep ratio | INVALID-INCONCLUSIVE, per `p5n-aa.mjs` under brief 3.4. |

**Sweep ratio detail.** The window failed on:
- fewer than 12 rounds
- A/A pooled commit p99 ratio 0.41 (rule 0.85 to 1.18)
- s_d not computable with one A/A round
- base writer utilization median 0.67, max 0.82 (rule at most 0.5), with load up to 20

Pooled sweep over base was 10.8x for commit p99 and 1.60x for read p99. Per-round commit p99 ranged 0.36x to 30.5x. These are not a verdict. I stopped at round 6 rather than spend about 50 more minutes on a window that had already failed.

## Rule 9a PASS audit

| Location | Content | Freshness | Binding or limit |
| --- | --- | --- | --- |
| G-FP | Digests compared to `oracle.json` | Read from this arm's clone | Seed receipt and map hash. Uses the owner route, not the in-worker route. |
| G-WORLD | Canonical bytes of in-worker world equal the owner-route world | Built after the sweep in this attempt | **Sampled, 1 in 10.** The other 9,000 worlds are covered only by self-consistent hashes and the oracle sample. Not full-content. |
| G2 | Kernel output equals O-DOMAIN `reconcile` | Oracle calls after the timed sweep | Oracle receives the sweep's own world. With G-WORLD it checks the kernel on a world proven equal to the owner route. Sampled. |
| G5 | `publish` fold equals deliveries | Per page | Fold follows the pipelined publication order. |
| G-JNL | Journal rows counted through core API and raw read | After the sweep | **Sampled, 18 of 157 pages.** Totals over all pages come from the SQL counts. |
| G-REC | Outputs per subject equal the reference run, and deliveries equal an independent oracle fold | Per child process | **The owner stayed up.** Controller kills only. |
| Receipts | `B1-COMPLETE-DIAGNOSTIC` means the script finished with stable source hashes; no performance PASS issued | | |
| `p5n-aa.mjs` | INVALID unless every window rule passes | Recomputed from saved raw samples | |

## Pins moved

None. No changed path is under `lab/acceptance` or referenced by it, and `build_contract.py --verify` passes with a byte-identical second regeneration.

## What did not run

- 100k seed, activation, G0 and the VM duet.
- W6 and W3 at 10k.
- A second repeat of each baseline arm (one W1 and one W4 only).
- W4 on the step 2 code.
- Feed consumer (P3), controller on, and the activation commit hold histogram on the final code.
- The full 12 rounds for the sweep ratio.
- A real SIGKILL of the store owner. The post-seed position map lives in that process, so `openMappedHost` cannot reopen a killed owner.
- Datalog over the journal. Core's `transactionsForEntity` returns nothing on the mapped host because its query executor is a detached replica. I did not check this against the base commit.
- The evaluator tests.

## Checks

- **qlever package:** 294 passed, 29 skipped, typecheck clean. One existing test asserted the old 4-worker cap; I changed it to the new 0..15 bound.
- **Bench suite:** 211 of 212 passed. The one failure, `p5-freshness` "gate must refuse abort covering the final count", is timing-sensitive under load and passes alone (11/11).
- **Targeted tests:** `host-map`, `position-map`, `p5`, `p5-round2` and `p5n` all pass.
- **Typecheck:** `tsc` on `lab/bench` has no new errors.

## Open questions

1. Is a quieter window available for the sweep ratio, or should the base arm's offered rate drop so writer utilization stays at or below 50%?
2. The serial publish chain is the next target. It needs a profile of core `transact` and harness verification before choosing between D12 (shared group fsync) and moving verification off the publisher.
3. WAL growth and RESTART starvation under continuous in-worker readers need a decision. The options are gate tuning, or splitting a page into several read transactions at the same P, which needs a ruling.
