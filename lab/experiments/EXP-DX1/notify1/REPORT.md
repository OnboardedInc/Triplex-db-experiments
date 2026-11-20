The native Publish check found six people whose work changed and two whose work stayed the same. The recipient was still stopped.
After dispatch resumed, the recipient's 19 effects matched the independent oracle in order.
At 1,000 people the first floor change drained in 145 ms with a roster scan and 439 ms with the smaller set.
At 10,000 people it took 1.59 and 3.87 seconds. Replaying the source history to build the smaller set delayed nearby saves.
The smaller set used one recipient transaction at 10,000 people. The roster scan used ten.
The sender proved 19 of 20 cases at each size. Crossing a scheduled time boundary required the roster scan.
The separate gateway lowered read p99 in both repeats. It sent 212–262 notices per second. The shared gateway sent 222–277.
All four arms met both latency limits against the closing control. None met both against the opening control.

| Review finding | Decision | Fix | Regression test |
| --- | --- | --- | --- |
| 8. Omitted shared floor notice | Accepted | `707f53fe1`, `858fda585`, `7e9a60193`, `dd54f3982` | Both affected people and an unchanged neighbour, on both sides of Publish. A missing posting requires a census. |
| 9. Quiet-window admission | Accepted | `9bdf31958` | Recipe-only, a missing entry, late rows and an elapsed deadline are rejected. |
| 1. Exact reads alone leave durability unproved | Accepted jointly | `9bdf31958` | Read stored outputs, guards and debt independently at the same cut. |
| 11. Expired staged proof | Accepted for archived prototype | `ca4304eb5` | The active notice path needs no release preparation. [Closed stage](../actv-staged/REPORT.md) |

**Shared facts and whole-roster cost**

The ordered selector binds the original event and its predecessor to native edits, release and both clocks. It uses the exclusive maximum of the two floors to seek pay postings and visits both sides of a changed location link. It evaluates candidate work before and after, including retirements. A joined leaf is accepted only if its postings agree with committed source edges. A recent erasure can force replay from the sealed work via the census. The exact member list commits with cursor progress. Warm selectors retain the committed edge index in memory. A cold selector must rebuild it from the native feed.

| People | Floor notices | Drain ms, census / ordered | Recipient changes and transactions, census / ordered | Neighbour save p99 ms, control / census / ordered |
| --- | ---: | ---: | ---: | ---: |
| 1,000 | 38 | 145 / 439 | 81 in 1 / 82 in 1 | 56 / 47 / 379 |
| 10,000 | 370 | 1,588 / 3,871 | 799 in 10 / 746 in 1 | 34 / 285 / 3,477 |

The declared mix was 16 direct pay edits, a local floor edit, a backdated state floor edit, a jurisdiction move and a save crossing a scheduled boundary. Each neighbouring-save sample had 16 offers. Each floor save wrote six source records. Dispatch wrote zero. At 10k, ordered selection and dispatch evaluated 1,110 worlds. The drain spent 3.72 seconds before or outside the normal evaluation and recipient service timers, where cold source replay is the extra step. [Part 5 evidence](PART5-SHA256SUMS)

**Sending and live latency**

Each 10k active compact arm delivered 6,336 notices with 1,523–1,996 completed reads and 713–935 completed saves. The offer period was 32 ms. The 1.5× limit gave different results across the controls because matching write p99s were 52–57 ms at the opening and 224–263 ms at the closing. The separate sender's read p99 was 9.69–11.67 ms and the shared sender's was 12.54–13.57 ms. [Exact ratios and budgets](RATE.md)

The separate sender uses its own JVM against the same transactor. The native slot was ready in 3 minutes 5 seconds. The joined check got a heavy-job permit 8 minutes 51 seconds later. The cost and gateway jobs entered at 23:16 and 23:25 local. Each gateway arm checks exact ordered effects and requires the source to advance only for live saves. [Rate runner](rate-arm.ts)

The forecast assumes 350–550 checks per second on deep inputs, based on 471 per second with four foreground readers on the earlier Mac test. At 16.5% notice density that implies about 58–91 notices per second. At the earlier deep fixture's 79.9% it implies about 280–440 per second. Pinned reads and gateway service bound this rate. The 14 ms cadence caps a worker at 1,143 checks per second before work. The earlier receiver commit share was 18%. The forecast assumes the release has reached the front of the queue and both p99 ratios stay within 1.5×.

**Joined Publish**

At DX-ACT1 `22c590093`, apply [the joined patch](join-range.patch) from `b469212d6` with `journal.ts`, `ranges.ts`, `dispatcher.ts`, `census.ts`, `store.ts` and `receiver.ts` from `cad4a60e3`. Native source position 12 held the racing save and position 13 held Publish. The selected posting root was at position 11. The recipient stayed at zero while both source records were inspected. A later check matched all 19 ordered effects against Python.

Keep the recipient stopped while taking the one-second cut under live saves. Reopen the exact source scope in a fresh process, bind the command, original assertion, release pair, clocks and census, and decode the activation marker, physical changed values and retirements, guards, and every owed ID, version, payload and sequence from the cut. Compare to the full independent oracle, including unchanged people. Check the recipient position stayed fixed and a normal current-route read sees the winning release. A recipe alone, a late record or a missing entry must fail. [Cut verifier](deadline.ts)

**Server command and evidence**

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/notify1/bench.ts launch notify-part4-001 isolated 16 14` runs the 1,000-person preflight, shared-floor costs at 1,000 and 100,000, then the 100,000-person deep paired workload on the same server. The plan was checked locally. [Runner](bench.ts)

The joined gate binds the two source revisions, native slot and original transaction bytes. The cost runner checks the complete oracle result and reopens the recipient receipts by ID. The compact fixture verifier narrows only after it matches both world bytes and the original six-record frame with no intervening save. The rate reducer checks fresh run, slot, original receipts, matching offers, oracle effects and both completed sample counts. The acceptance pins and frozen inputs were unchanged. [Part 5 evidence](PART5-SHA256SUMS) · [Part 4 evidence](PART4-SHA256SUMS)
