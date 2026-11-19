# DX-ACT1 · Release activation
Yes. Activation as measured could overwrite a newer decision. Three schedules reproduced it before the fix.
At transaction 20 a person's pay notice still said 1,600 cents. After reopening the publisher, a delayed result from 15 replaced it with 1,500 and issued a second notice.
The benchmark also admitted a first item after a newer empty decision, and an earlier valid time at the same transaction.
The W0 product rule advances the guard correctly. The benchmark skipped the durable write, and both benchmark checkers discarded the same part of the independent answer.
On 1,000 W0 subjects the guard fix saved all 1,000 decisions and wrote 219 bytes of asserted values per person. Rewriting the whole state took 533 bytes.
Two local trials project 111–140 seconds for the old 73.78-second run, or 18.4–23.4 minutes for ten such accounts in series. The server figure is unmeasured.
Changing only the EAD document lead time skipped rule evaluation for 675 of 1,000 people. All 1,000 still received a durable decision.

North star P5. The first experiment used real W0 evaluation records, a reopened in-process composition and the independent Python evaluate/publish operations. Run `node --import tsx --test lab/experiments/EXP-DX1/act1/guard.test.ts` at the initial experiment commit to reproduce all three failures.
The historical run did not inject these schedules. Its 100,000 comparisons cannot establish durable guard correctness. [Benchmark report](../bm1/REPORT.md) · [W0 §8.8](../../../world/W0/SPEC.md) · [Targets](../../../TARGETS.md)

## Price of a correct activation

The 1k R1→R2 fixture changed items for 116 people. A fresh reader process found 884 stale guards under the historical filter and zero full-state differences with either fix. Guard-only commits touch only the guard fact. SQLite WAL used full sync and 32-subject frames, one in flight, with no background traffic.
| Per roster subject | Historical | Full state | Guard fact |
| --- | ---: | ---: | ---: |
| Asserted value bytes / database growth bytes after checkpoint | 141 / 1,130 | 533 / 7,172 | 219 / 4,174 |
| State rows read / state page reads / claim reads | 1.10 / .016 / .004 | 2.00 / .032 / .032 | 2.10 / .032 / .032 |
| Process CPU ms / durable commit ms / publication wall ms (second trial) | .154 / .086 / .113 | .800 / .674 / .749 | .470 / .383 / .439 |
| Asserted bytes per guard-only advance (884 subjects) | 0 | 444 | 89 |
Each arm also read the head once per state page. The fixed arms checked 1,000 complete entity sets. Physical index reads and engine-only CPU were not instrumented.
Projection adds 50.79 s of evaluation to 22.99 s scaled by each local publication wall ratio. The two trials give 115–204 s for full state and 111–140 s for the guard. The model assumes the local slowdown transfers to the bench and ten accounts run serially. Local and bench item-change shares were 11.6% and 9.8%.
The managed Datomic slot returned HTTP 404 on claim lookup and CAS preparation; it was released with its volume retained. The local costs and cross-process checks use the public SQLite adapter.

Audit. guard.test.ts compares fresh scoped raw facts, receipts and receiver sequences to bare Python W0 after every reopen and both sides of a dropped ACK. price.ts binds its fresh database names, release pair, source/build/input digests and the entire independently folded roster to a separate process's durable readback; it preserves historical mismatches.

## Narrow release

The 0→90-day edit changed tasks or obligations for 239 subjects and changed work-item payloads for zero. Among 1,000 subjects, 325 owned a reachable EAD and 51 had no document link. The fixed-cut index stores a validated R1 result and reachable EAD membership for every subject on the independent seeded roster.
Only a compiled R1→R2 document differing solely in the unscoped DOCEXP EAD lead-days constant qualifies. The selector regenerates release-dependent work versions for exclusions. Other edits (including standard R2), changed cut/valid time/erasure frontier, missing index or unproved page evaluate in full. A source validation error is surfaced.
Each 256-ordinal page binds scope, generation, prior/new release, both clocks, source and index digests. Output lands before the cursor advances. Restart validates ordered IDs, both roster hashes and committed pages; an unclaimed page is recomputed. Duplicate IDs, swapped pages and foreign checkpoints are rejected.
Across two local comparisons full evaluation took 0.62/1.37 s, selection 0.45/0.60 s and index construction 0.77/1.43 s, including page checks in both paths. Recovering the build cost would take five/two comparable releases at the same cut, assuming zero intervening maintenance. Cold build plus selection was slower in both.
Audit. selector.test.ts checks all output bytes and all reopened terminal outboxes against the independent Python release pair and recomputes eligibility from source edges. The checkpoint is specific to one attempt, cut, release and roster. Preview coverage alone provides no P5 verdict.
Audit. The guarded replica driver uses the bare evaluate/publish oracle on every source world, compares complete public outputs and stored states at pinned positions, and writes an exclusive sweep record bound to its attempt, source/build, slot, roster, release, trace and live reader count.


## Bench handoff

On a prepared BM1 checkout of this commit, run `node --experimental-strip-types lab/experiments/EXP-DX1/act1/bench.ts --execute`. The default `--plan` is portable.
The three-hour controller runs native restart/race schedules first on each fresh retained-seed clone. It compares the same EAD edit in full and with the selector, then runs the standard three-edit release in full. All three use the guard, 256 live readers and matching frozen writer offsets. The selector must match the full path's roster, world, output and terminal-state digest.
Expect the guard to exceed the old 100 s bar on the standard release. Expect the EAD edit to save evaluation work once its index exists. The script records both cold and reused-index time and recomputes absolute read/commit p99, ratios and counts from raw traffic. The 1.5× interference ratios are unmeasured.
Each stage releases its isolated clone after verified P5 readback. BM1's separate whole-history audit and the throttled compaction case are outside this three-hour comparison. Coverage does not change the acceptance contract's full-evaluation rule.
Audit. bench-proof.ts binds the independent checks, R1 and activation cuts, ordered roster, source/build manifest and trace to the fresh slot and nonce. The controller checks the matched arms and scoped cleanup. Archive root is `evidence/DX-ACT1/`. [Evidence manifest](SHA256SUMS)
