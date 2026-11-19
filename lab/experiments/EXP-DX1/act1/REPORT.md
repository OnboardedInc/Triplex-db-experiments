# DX-ACT1 · Release activation
Yes. Activation as measured could overwrite a newer decision. Three schedules reproduced it before the fix.
At transaction 20 a person's pay notice still said 1,600 cents. After reopening the publisher, a delayed result from 15 replaced it with 1,500 and issued a second notice.
The benchmark also admitted a first item after a newer empty decision, and an earlier valid time at the same transaction.
The W0 product rule advances the guard correctly. The benchmark skipped the durable write, and both benchmark checkers discarded the same part of the independent answer.
On 1,000 W0 subjects the guard fix saved all 1,000 decisions and wrote 219 bytes of asserted values per person. Rewriting the whole state took 533 bytes.
Applying the local publication slowdown to the old bench split projects 111 seconds per 100,000, or 18.4 minutes for ten such accounts in series. The server figure is unmeasured.
The narrow-release comparison is pending.

North star P5. The first experiment used real W0 evaluation records, a reopened in-process composition and the independent Python evaluate/publish operations. Run `node --import tsx --test lab/experiments/EXP-DX1/act1/guard.test.ts` at the initial experiment commit to reproduce all three failures.
The historical run did not inject these schedules. Its 100,000 comparisons cannot establish durable guard correctness. [Benchmark report](../bm1/REPORT.md) · [W0 §8.8](../../../world/W0/SPEC.md) · [Targets](../../../TARGETS.md)

## Price of a correct activation

The 1k R1→R2 fixture changed items for 116 people. A fresh reader process found 884 stale guards under the historical filter and zero full-state differences with either fix. Guard-only commits touch only the guard fact. SQLite WAL used full sync and 32-subject frames, one in flight, with no background traffic.
| Per roster subject | Historical | Full state | Guard fact |
| --- | ---: | ---: | ---: |
| Asserted value bytes / database growth bytes after checkpoint | 141 / 1,130 | 533 / 7,172 | 219 / 4,174 |
| State rows read / state page reads / claim reads | 1.10 / .016 / .004 | 2.00 / .032 / .032 | 2.10 / .032 / .032 |
| Process CPU ms / durable commit ms / publication wall ms | .203 / .322 / .388 | .902 / .984 / 1.078 | .663 / .915 / 1.012 |
Each arm also read the head once per state page. The fixed arms checked 1,000 complete entity sets. Physical index reads and engine-only CPU were not instrumented.
Projection = 50.79 s evaluation + 22.99 s × local publication wall ratio: 114.6 s full state, 110.7 s guard. Ten serial accounts project to 19.1 or 18.4 min. This assumes the local slowdown transfers to the bench and scales linearly; local/bench item-change shares were 11.6%/9.8%.
The managed Datomic slot returned HTTP 404 on claim lookup and CAS preparation; it was released with its volume retained. The local costs and cross-process checks use the public SQLite adapter.

Audit. guard.test.ts compares fresh scoped raw facts, receipts and receiver sequences to bare Python W0 after every reopen and both sides of a dropped ACK. price.ts binds its fresh database names, release pair, source/build/input digests and the entire independently folded roster to a separate process's durable readback; it preserves historical mismatches.
