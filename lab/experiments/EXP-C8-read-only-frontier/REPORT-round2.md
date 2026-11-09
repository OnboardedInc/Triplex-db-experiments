# EXP-C8 round 2 (CX-C8-R2)

North star: P1, exact pinned reads that never block writers. This round fixes resource refusal and wire accounting correctness; it does not claim throughput acceptance. Goals and targets follow the main checkout's `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure follows `lab/PROTOCOL.md`. Main-checkout lab files were read only.

**Result: requested C8 fixes implemented; all independent reproducers and final requested checks pass. Ready for separate adversarial re-review, not self-promoted.**

## Implementation

- F1 / Q77a: a confirmation round that adds reached nodes beyond `maxRounds` now refuses even if a cycle empties the frontier. An exact-limit chain still permits its empty confirmation read.
- F2 / Q77a: `ruleClosure` checks the independently supplied round budget and counts distinct relation endpoints (including the base relation) against `maxVisited`. Datalog `maxDepth` still bounds the semantic result. All refusals carry `RecursionBudgetExceeded` and return no partial result.
- F3 / Q77b: DAG counting uses iterative postorder dynamic programming; cyclic enumeration uses an explicit stack and branch-local visited membership. Both counting passes enforce `maxPathSteps`; deep DAGs and deep cyclic paths do not consume the JavaScript call stack.
- F4 / Q77c: multipart is conservatively counted as a write, including multipart that appears to contain a query. Unclassified HTTP operations, bodies and upgrades are also writes. Explicit query, command, health and watch-cancellation forms retain their classifications.
- F5 / Q77c: per-connection prepared SQL and portal mappings survive tally resets. Every Execute counts the SQL bound to its portal; unknown Bind/Execute/Close/COPY operations count as opaque writes. Closing a statement/portal invalidates that name in the corresponding map (an already bound portal remains valid when its statement is closed). Prepared write text is additionally conservatively flagged as a potential write, without counting a commit: this preserves the independent reproducer's preparation positive control. Thus `writes` deliberately overcounts prepared write traffic; `statements` and `commits` reflect actual Query/Execute operations. A zero remains meaningful. Unknown bytes after a parser failure cannot become clean traffic in a later window.
- Q76b: XTDB initialization no longer creates `tx_query_relations`. Existing data/schema is not deleted.
- Q76d: WL20 supports on XTQL, SQL and SPARQL read distinct support edges at the task basis and call `countSimplePaths`, including paths longer than three and cycles. A read requests at most 100,000 rows (99,999 admitted edges plus an overflow witness); overflow refuses rather than accepting truncated data. Reachability and counting retain the common recursion/path budgets. The complete native read plus host computation stays in the measured task.

## Validation

Product implementation commit: `0ed655a`; the follow-up test-only commit is `f049bbf`. Four package typechecks passed (core, XTDB, QLever, qualification). Changed-file lint passed with zero errors; one existing no-constant-condition warning remains in the unchanged XTDB retry loop. The light QLever seeded closure passed (both strategies); the live QLever counter check passed, including the one-update positive control and cleanup. The C8 QLever read-boundary integration passed with `C8_READERS=1`, `C8_LOAD_MS=2000` (112.28 seconds overall on the shared resident). The integration asserts zero read-window writes/commits/unparsed operations, at least one completed recursive read, and a write positive control. Its writer windows are a small functional exercise, not load acceptance. Vitest console summaries omit per-test console objects in these logs; no exact fresh statement count or writer percentile is claimed. The C8 test leaves its uniquely scoped fixture/writer facts as its existing test contract does; its counter-control triple is cleaned up. No other scope is intentionally modified.

Raw outputs are retained under `round2/` and `lab/verify/C8/`. The unchanged reviewer adversarial suite passed **15/15**, turning all six failing probes covering F1-F5 green. The first offline run passed core **848/848**, XTDB **25 passed / 84 skipped**, QLever **27 passed / 21 skipped**, and node tests **18/18**. Qualification initially had **85 passed / 1 failed / 50 skipped**: its old minimum multi-call count expected 20 XTQL tasks, while Q76d makes three WL20 tasks single-read and leaves 17. This was a stale test assumption, not a wrong query answer. `f049bbf` changes that assertion to require nonzero multi-call coverage; all per-call language and cut assertions remain, and the new WL20 tests explicitly check the one-call path. The first failure remains in `lab/verify/C8/offline-qualification.log` and `round2/offline-driver.log`; the focused package rerun is recorded separately in `round2/qualification-rerun.log`. The qualification rerun passed **86 tests / 50 skipped** (exit 0). Final offline total: **1,004 passed / 155 skipped**, with zero remaining failures across the final runs. The reviewer files `adversarial.test.ts`, `light-live.test.ts`, `vitest.config.ts` and `run-offline.mjs` were copied byte-for-byte using `git show 74e5627:<path>`. Product regressions add long-path/cycle WL20 wiring on all three surfaces and deep cyclic counting; existing fake-pgwire fixtures now bind the named statement they intend to execute, and assert Execute-based statement counts plus conservative preparation write flags.

## Limits

No XTDB live gate, engine lifecycle, exclusive slot, main-checkout edit, merge or push. Full G1/G2 and quiet-engine performance acceptance remain for the separate reviewer/orchestrator. No application contract outside C8 was intentionally changed. The reviewer's `READ-PATHS.md` distinction remains: storage and operation-resolution reads retain writable client references, but no mutating application read was found; this round does not claim that every read entry has a facade. Full root build/docs/package/other-backend gates are not substituted for the requested offline and light resident checks.


Reproduction commands from this worktree (heavy wrapper is the authoritative main-checkout script; no main-checkout source is modified):

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R2-adversarial -- node node_modules/vitest/vitest.mjs run --config lab/verify/C8/vitest.config.ts lab/verify/C8/adversarial.test.ts
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R2-offline -- node lab/verify/C8/run-offline.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R2-light-checks -- node lab/experiments/EXP-C8-read-only-frontier/round2/run-checks.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R2-source-binding -- node lab/experiments/EXP-C8-read-only-frontier/round2/capture-source.mjs
```

The checking script retains exact arguments, cwd, environment overrides and exit statuses in `round2/checks.json`. No dependency install, pnpm invocation or Docker command was needed. Host free space exceeded 32 GiB before admission. Queue-wait messages are retained; shared heavy slots were respected.


Qualification-only rerun after the test assertion correction (does not rerun live checks):

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R2-qualification-rerun -- node node_modules/vitest/vitest.mjs run --root packages/qualification --maxWorkers=1 --no-file-parallelism
```


| Final check | Result | Evidence |
| --- | --- | --- |
| Independent reviewer probes, unchanged from 74e5627 | 15 passed, exit 0 | `round2/adversarial.log` |
| Core offline | 848 passed | `../../verify/C8/offline-core.log` |
| XTDB offline | 25 passed, 84 skipped | `../../verify/C8/offline-xtdb.log` |
| QLever offline | 27 passed, 21 skipped | `../../verify/C8/offline-qlever.log` |
| Qualification offline after test-only correction | 86 passed, 50 skipped | `round2/qualification-rerun.log` |
| Qualification node tests | 18 passed | `../../verify/C8/offline-node.log` |
| Package typechecks | 4 passed | `round2/checks.json` and `typecheck-*.log` |
| Changed-file lint | Exit 0, one existing warning | `round2/lint.log` |
| Seeded light QLever closures | 1 passed | `round2/qlever-light.log` |
| Live QLever counter with positive control | 1 passed | `round2/counter-live.log` |
| C8 read-boundary integration, QLever only | 1 passed, XTDB skipped | `round2/c8-live.log` |
| Source binding | 11 committed files; 4 unchanged reviewer files | `round2/source-manifest.json`, `round2/source-binding-final.log` |

The initial source binding names `0ed655a` and is preserved as `source-manifest-attempt1.json`; final binding names `f049bbf`, including its test-only correction. Core/backend code did not change after the passing typechecks, live checks and adversarial run. No reviewer probe was removed or relaxed. The offline driver's exit 1 and its original results JSON remain as first-failure evidence, alongside the exit-0 qualification rerun.

Open items: separate reviewer rerun and promotion decision; fresh full XTDB gates/transaction-overlay behavior on a quiet authorized engine; full QLever G2; root build/docs/pack checks and other-backend integration suites were not run. No release, broad load, P1 throughput, or sustained writer-progress acceptance is claimed.
