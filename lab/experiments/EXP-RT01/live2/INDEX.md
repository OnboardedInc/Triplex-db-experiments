# RT01 live round 2 evidence

**Bootstrap fixed. G2 completed. G6 failed its first fresh ten-fact A0 point; later points were not run.** Independent live review and performance qualification remain open.

Raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/` (839 files, 70,393,302 bytes). Raw output and baseline source/build copies are outside Git. [RESULT.json](RESULT.json) records the checked result. [DURABLE-INDEX.json](DURABLE-INDEX.json) binds the full external `ARTIFACTS.json`; [DURABLE-SHA256SUMS](DURABLE-SHA256SUMS) lists every retained regular file. Dependency symlinks are not copied dependency caches.

| Evidence | Relative durable path |
| --- | --- |
| Whole offline product run, including original testkit timeout | `offline/attempt1/execution.json`, package logs beside it |
| All 96 testkit tests with explicit budget, stable source | `offline/testkit-budget1/execution.json`, `tests.txt` |
| Initial mock failure and captured live-error provenance | `offline-initial-xtdb.txt`; committed `packages/xtdb/test/fixtures/bootstrap-live-error.json` points to prior immutable raw trace |
| Diagnostic ordered six failures, original driver bytes, complete walk | `diagnostic1/outcomes.json`, `progress.jsonl`, `g2-source.ts` |
| Formal G2 builds, exact source/build maps and full trace | `g2-attempt1/execution.json`, `outcomes.json`, `progress.jsonl`, `routes-*.json`, `determinism.json` |
| Isolated pre-RT01 source/build | `baseline/source.tar`, `baseline/identity.json`, `baseline/packages/` |
| Frozen noise rule, before B | `g6-attempt1/AA-RULE-BEFORE-B.json` |
| First failing 150/150 ABAB point; scan probes and counts | `g6-attempt1/point-0-a0-10.json` |
| G6 source bindings, failure, actual wire/client events and SQL dictionary | `g6-attempt1/execution.json`, `events.jsonl`, `statements.json` |
| Failed offline proxy development and bound corrected unit test | `wire-test*.txt`, `wire-initial.mjs`, `wire-test-initial.mjs`, `wire-unit-bound.txt` |
| Exact engine ownership/identity/logs and verified cleanup | `owner-start.json`, `engine-{start,end}.json`, `engine.log`, `engine-down.txt`, `cleanup.json`, trim/context/absence stdout/stderr |
| Immutable-main pin inventory, no new RT01 pin path | `pins1/inventory.json` and diffs |
| Content/source closure and terminal summary | `seal-stdout.txt`, `seal-stderr.txt` |

Reproduction tools are committed alongside this index. The live tools deliberately refuse existing output directories; they are not instructions to reuse the completed window or retry the failed G6. `seal.mjs` checks semantic evidence and current sources. `retain.mjs` runs after the seal/controller has exited, inventories its completed stdout, and reads back every retained file/hash; this avoids indexing an output stream before its terminal summary is written.

To check retained bytes:

```sh
cd /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2
shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/rt01/lab/experiments/EXP-RT01/live2/DURABLE-SHA256SUMS
```

The [report's live round 2 section](../REPORT.md) contains the full PASS/verdict/receipt audit, exact measured limits and unfinished work. No contract, oracle, merge or push was performed.
