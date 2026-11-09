# RT01 round 6 evidence

**Keyed marker CAS implemented. Offline passes. Live not run: G03 VM-probe window.** Native plan/scan confirmation and the previous G6 regression remain open.

Raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/` — 83 regular files, 1,772,154 bytes. [RESULT.json](RESULT.json) holds the checked outcome. [DURABLE-INDEX.json](DURABLE-INDEX.json) binds the external `ARTIFACTS.json`; [DURABLE-SHA256SUMS](DURABLE-SHA256SUMS) binds every retained regular file. The prior live2 evidence is a separate immutable input, SHA-verified by the analyzer.

| Evidence | Relative durable path |
| --- | --- |
| Final 25/25 product phases, 1,112 passing tests, unchanged sources | `offline/attempt1/execution.json` and package logs |
| Focused earlier XTDB run, 95 passed | `focused1.txt` |
| 510/510 read matrix, 80/80 pending matrix, four publication proofs and journal-clock A0/compact | `reproductions/attempt1/execution.json`, `matrix/`, `pending/`, `pending-proof/`, clock files |
| Original normalization-check failure, successful matrix invocation, original analyzer preimage | `extras1/` |
| Corrected, source-bound SQL/plan model; 8 cases, exact SQL and projection visits | `plan2/execution.json`, `plan2/plan.json`, `plan.stderr` |
| Actual occupied-window decision and exact G03 pool/status/disk | `admission1/decision.json`, `status.stdout`, disk logs |
| Executed admission preimage, before future argument/label/policy refinements | `admission1/admit-live-source.mjs` |
| Immutable-main full pin inventory and diffs | `pins1/inventory.json` and adjacent diffs |
| Targeted lint, semantic/source closure | `lint.txt`, `seal.stdout`, `seal.stderr` |

`guard-plan.ts` measures actual evaluated SQLite model values, not XTDB historical I/O. Its source explicitly states the distinction and retains live2's one-current-marker observation. Statement counts remain 6 A0 / 5 compact for its ten-fact input. The stamp lookup is keyed and position-bound inside the same scoped CAS; total modeled work retains the position aggregate.

The admission stopped without engine up, resource inspection/deletion, fstrim or context changes. The s1 engine row was free; two CX-G03-V VM helper reservations triggered the dispatch's G03 stop condition. No new live G2/A/A/B/10k result is inferred from prepared files. See [RUNBOOK.md](RUNBOOK.md) for the next authorized window and its unexecuted native-plan/G2/G6/finally-cleanup controller.

`seal.mjs` verifies actual outcomes and current executed inputs; `retain.mjs` inventories and reads back raw output after the controllers have closed their streams. [REPORT round 6](../REPORT.md) lists the full content/freshness/binding audit and limits. No acceptance/oracle edit, merge or push.

```sh
cd /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6
shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/rt01/lab/experiments/EXP-RT01/round6/DURABLE-SHA256SUMS
```
