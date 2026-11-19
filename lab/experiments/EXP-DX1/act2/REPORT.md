The benchmark created the same two answer IDs twice for person 6011.
Datomic stored all six requested assertions in each save. The independent oracle correctly rejected the repeated answers.
Each traffic window now reserves its own identity. A retry within that window recovers the original save.
On local Datomic, both guard designs matched every person at 1,000 and 10,000 subjects with one through five evaluators.
The historical publisher missed 201 guards at the second release for 1,000 people and 5,503 for 10,000.
The 1,000-person preflight took three minutes locally. The correct cost of activating 100,000 people still needs a server measurement.

**The rejection**

The stopped R1 arm and its diagnostic clone used `f37731a7c`. At position 4,338,757 the seed had 165 visible facts. At 4,346,080 there were 175. Frozen event 2299 wrote `ans:t2299-0` and `ans:t2299-1` at both 4,341,356 and 4,344,665. The archived mapper matches all 12 stored assertions and their valid times. The replay reproduces `W0.E_CARDINALITY` byte for byte. [Original evidence manifest](../bm1/SHA256SUMS)
One subject and two minimum-size saves reproduce the error. The first repair regression also caught the second save being treated as a retry. BM1 had given two named phases distinct entity prefixes. The fix uses each window’s durable transaction position for its command, answers and decisions. [Regression](identity.test.ts)

**Local Datomic results**

| Target people | Seed facts including eight neighbors | Historical missing guards, R1 / R2 | Individual missing, R1 / R2 | Page missing, R1 / R2 |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 140,609 | 800 / 201 | 0 / 0 | 0 / 0 |
| 10,000 | 1,625,474 | 8,500 / 5,503 | 0 / 0 | 0 / 0 |

All 23 named publication schedules ran. The table holds separately for each evaluator count. They shared pinned inputs per release, and each publisher and evaluator count had a fresh outbox namespace. Across both releases and rungs, the matrix checked 330,000 stored target states. Every historical item and pending delivery matched. All eight neighbors retained empty outboxes, including the neighbors on the target’s first page.
Each rung regenerated the full native rows for 104 live saves before, during and after publication. A fresh run through the server’s two-evaluator activation entry point independently checked another 2,000 and 20,000 fenced states across R1 and R2. These are correctness checks. [Evidence checksums](SHA256SUMS)

**Prepared server command**

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/scale1/bench.ts launch 5 act2-$(date -u +%Y%m%d%H%M%S) activation --account-layout pooled`
This cold run seeds ten 100,000-person accounts in one scope and activates account 002 with two evaluators while all ten accounts have traffic. Budget a day plus archival. The observed 349-second seed at 10,000 projects to 9.7 hours for seeding alone at constant throughput. The execution ceiling is 24 hours. [Scale assumptions](../scale1/PROFILE.md)

**Evidence audit**

- `openW0Window` checks the stored marker at its original transaction and valid time. `checkWindows` compares requested and saved assertions, retry receipts and all 1,000 reopened worlds with independently reconstructed facts and Python evaluations. `guardSeed` binds the new directory, source, slot, nonce and two distinct saves, with a 600-second parent deadline.
- BM1 and SCALE1 run that gate on the allocated server before seeding. A failure records the stage and reason in `STATUS.json`. SCALE1 records the probe’s separate database footprint and checks each evaluator’s Linux CPU mask before it evaluates.
- `seedAccounts` checks ordered receipt contents, counts and membership. `matrix.ts` reopens the seed by volume, scope, membership and original first and last transaction IDs. `deepEvaluations` checks roster order. The matrix matches every evaluation and stored state to Python at the actual cut, including the precise historical omissions.
- `audit-live.mjs` reconstructs full post-save reads from fixture fields and acknowledged stamp changes, compares native row identities with each recorded read digest and checks fresh release markers, page claims and states via `DeepActivation.verify`. Both gate sources and slot-owner receipts are bound. [Targets](../../../TARGETS.md)

The evidence root is `evidence/DX-ACT2/`. See `6011-writer-comparison.json`, `staged/preflight/native/`, `staged/{one,ten-matrix}/matrix/` and `results.json`. The native rungs ran at `096b46a59` and `d8c71790c`. After merging SCALE1 `f819d10a3`, the gate and build hashes still matched both runs. The gateway was killed during the first concurrent attempt. A later audit failed while serializing an empty R1 mutation list. Fresh serial attempts completed and released their reservations.
All 174 W0 tests and the five selector/worker tests passed. Focused TypeScript passed. The broad bench typecheck retained 32 baseline diagnostics. No acceptance pin, frozen v3 trace or verdict rule changed.
