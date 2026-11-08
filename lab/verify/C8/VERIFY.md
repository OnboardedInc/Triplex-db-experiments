# EXP-C8 adversarial verification

**Verdict: FIX-FIRST.** Five P2 findings reproduce in the C8 additions: two budget defects, a path-count stack overflow, and two counter blind spots. No live application read mutation was demonstrated. Existing offline suites pass, and the permitted light QLever closures return correct answers with zero counted writes.

Reviewer: CX-VC8, Codex gpt-6.1-sol. Reviewed head: `d9b2dc8a568bda85cc78e77f0d53537b2820ad87`, branch `verify/C8`. Scope: `git diff bf1ad4d d9b2dc8`, attributing implementation findings to C8's commits `620145c`, `d508c28`, `0147c88`, `6727da4`, and `d9b2dc8`. The comparison also contains unrelated merged lab/entity work; that work and EXP-X02 are not requalified here.

North star: P1, exact pinned reads that do not block writers. This review checks the read-mutation floor and exact, bounded recursion; it does not establish P1 throughput or writer-latency acceptance. Goals and targets follow the absolute main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`, with procedure from `lab/PROTOCOL.md` and the C8 verification brief. Main-checkout documents and historical raw artifacts were read only. Inputs are copied and hashed in `input-manifest.json` / `inputs/`.

## Six requested checks

| # | Check | Result and evidence |
| --- | --- | --- |
| 1 | Every read entry and writable captures/fallbacks | **PARTIAL: no mutation found; facade claim is broader than implementation.** Native, Datalog, counts, temporal, and maintained-query reads receive facades. Storage reads and operation-resolution reads retain original writable clients. Full inventory: `READ-PATHS.md`. Seven storage read methods per lane issue 15 SELECT calls and zero writes in the offline write-trapping probe. Guards refuse submit/update, including nested XTDB views; overlay still delegates through a facade. No mutating fallback/retry is reachable from the inspected application read implementations. |
| 2 | Fail-closed counter and recomputed historical zeros | **FAIL, F4/F5.** Multi-statement SQL, COPY, BEGIN without READ ONLY, LOAD/CLEAR, and SPARQL updates by GET/form count as writes. Unknown multipart and prepared writes executed after reset escape accounting. Raw G2 counter artifacts match receipt hashes and all six report zero writes; see the table below and `receipt-audit.json`. G1 has no isolated read-counter window. |
| 3 | Independent graph semantics and every budget boundary | **FAIL, F1–F3.** All 512 directed three-node graphs pass independent relation-composition/path-enumeration comparisons: 2,048 origins, 8,192 path counts, 4,608 bounded rule comparisons; depth bounds 1/2/3 also pass. Fanout 80, duplicates, missing seeds, exact/one-past visited, edges, roundRows, pairs, pathSteps and ordinary chain rounds pass. Cyclic terminal rounds and explicit rule budgets bypass refusal; a 12,000-edge DAG causes an untyped stack overflow. |
| 4 | Datalog maxDepth, call-tail constraint, refused shape, transaction overlay | **PASS OFFLINE / LIVE XTDB UNVERIFIED.** Both lane evaluators match the independent rule relation at depths 1/2 with free/head/next tails. Attribute-tail shape refuses: QLever `DatalogValidationError`, XTDB public executor `ReadError`, no partial result. XTDB base-client identity survives nested views, and the staged source is injected into the executor's rule/domain reads. This is a wiring/SQL-source test; it does not execute staged rows on XTDB. Historical G1 reports passing transaction cases; no fresh live XTDB transaction acceptance is claimed. |
| 5 | Removed mutators/callers/exports and schema residue | **PASS, with documented residue.** No remaining callable/exported implementation of the five removed mutators; old XTQL reach module is deleted. `tx_query_relations` is still created by `XtdbStorageAdapter.ts:637` and named in historical recovery/experiment schemas and comments, but no production recursive evaluator uses it. Maintained `publish()` remains an explicit write API. See `READ-PATHS.md`. |
| 6 | Unit/offline reruns and permitted live checks | **PASS for the runs below.** 998 existing tests passed; 155 integration/opt-in tests skipped. Reviewer adversarial suite: 9 passed, 6 failed, mapping to five findings. One light QLever test passed, exercising both strategies with eight statements and zero writes. No XTDB gate, full live gate, load test, engine slot acquisition, or container lifecycle operation was run. |

## Findings

All locations refer to reviewed source at `d9b2dc8`, not newer main. These are independent of the known overloaded-XTDB gate failures.

### F1 — P2: a terminal cycle can exceed maxRounds and still return success

Location: `packages/core/src/native/FrontierClosure.ts:166`, with termination at lines 215–223.

Reproduction: `frontierClosure({ seeds: ["a"], edges: memoryEdges([["a","b"],["b","a"]]), budgets: { maxRounds: 1 } })` succeeds, returning reached `{a,b}`, `complete: true`, and two rounds. The second round adds `a`, whose positive-length distance from the seed is two. That is not the documented free confirmation round “which finds nothing new.” The guard only runs at the next loop entry; this cycle empties the frontier before that entry.

Proposed fix: permit a confirmation read only if it does not extend the reached answer beyond the round limit; check the completed round before returning success. Preserve the exact-limit chain case and throw `RecursionBudgetExceeded("rounds", ...)` without a partial answer for this cycle. Reproducer test: `BUG: refuses a cycle that adds a reached seed beyond maxRounds` in `adversarial.test.ts`.

### F2 — P2: ruleClosure silently ignores accepted maxRounds and maxVisited budgets

Location: `packages/core/src/native/FrontierClosure.ts:314` and `:337`.

Reproduction: base `[["c","z"]]`, reverse predecessor edges `[["c","b"],["b","a"]]`, free tail, semantic `maxDepth: 10`, `maxPairs: 20`, explicit `budgets.maxRounds: 1`. The helper successfully derives the second extension `(a,z)` instead of refusing. A separate explicit `maxVisited: 1` over predecessors `[["c","b"],["c","a"]]` also succeeds. `resolveFrontierBudgets` validates both fields, but `ruleClosure` never checks them; only maxBatch/maxRoundRows/maxEdges are consumed. maxDepth is a semantic bound and does not implement the independently supplied resource limit.

Proposed fix: enforce the advertised budgets with typed refusals, keeping maxDepth semantics separate. Alternatively, define a narrower documented rule-budget type and reject unsupported budget fields instead of silently accepting them. Reproducer tests: `BUG: ruleClosure honors explicitly supplied maxRounds` and `BUG: ruleClosure honors explicitly supplied maxVisited`.

### F3 — P2: path counting overflows the JS stack on an admitted DAG

Location: `packages/core/src/native/FrontierClosure.ts:472-481`; cyclic DFS at `:493` has the same recursive-stack design.

Reproduction: construct 12,000 edges `i -> i+1`, seed every node, and run frontierClosure with default budgets. The closure is complete, with one hop round, 12,000 visited nodes and edges, well within all defaults. `countSimplePaths(closure, "0", "12000")` should return `1n`; it throws ordinary `RangeError: Maximum call stack size exceeded`. The iterative cycle check is safe, but the subsequent DAG memoization recursively calls `paths` once per node. This is an exported C8 helper defect; the report already notes that general support counting is not wired into WL20, so this is not evidence of a current WL20 regression.

Proposed fix: use iterative postorder/topological dynamic programming for DAGs and an explicit stack for bounded cyclic path enumeration. Keep path-step refusal typed. Reproducer test: `BUG: path counts on a 12000-node DAG within default frontier budgets do not overflow the JS stack`.

### F4 — P2: unclassified multipart traffic is forwarded with a clean zero-write tally

Location: `packages/qualification/src/engine-write-counter.ts:427-443`, consumed at `:474-476`.

Reproduction against a local fake upstream: POST `multipart/form-data; boundary=x` with field `cmd=clear-delta-triples`. The classifier recognizes neither a query/update nor a command; multipart is nevertheless exempted from the unknown-body write rule. The request is forwarded, while its complete tally is `{connections:1, statements:0, writes:0, commits:0, commands:0, unparsed:0}`. This violates the required rule that every unclassifiable request counts as a write or fails. No destructive multipart request was sent to real QLever, and this reproduction does not establish that QLever would accept the operation.

Proposed fix: parse supported multipart fields completely, or reject/count any multipart operation that is not positively classified. Apply a final unknown-operation fail-closed branch. Retain explicit read/session allowlists. Reproducer test: `QLever GET/form LOAD and CLEAR updates count; unknown multipart must count or fail`.

### F5 — P2: pgwire write executions disappear across counter reset

Location: `packages/qualification/src/engine-write-counter.ts:273-276`, with tally reset at `:66`.

Reproduction against a local fake pgwire upstream: send a valid-framed startup and named Parse `write_stmt = DELETE FROM t`; the proxy correctly counts one write. Call `counter.reset()`, then send Bind to `write_stmt`, Execute and Sync. All bytes reach the upstream, but the new window reports zero statements/writes/unparsed traffic. The parser handles only Q/P/F; it does not retain statement/portal classifications or account for Execute. The prepared name is not a read that was positively classified in the new window. A reused prepared COMMIT likewise cannot be accurately counted by Parse-only accounting.

Proposed fix: retain per-connection prepared statement and portal classifications across tally resets and count actual Execute operations; unknown bindings/executions must fail closed. Alternatively, delimit windows with fresh connections and explicitly refuse any execution lacking a current-window classified Parse. The present XtdbClient sets `prepare: false`, so this finding does not by itself invalidate the observed historical numbers for that driver. Reproducer test: `BUG: pgwire execute of an existing prepared write after reset cannot silently count zero`.

## Historical receipt audit

`audit-receipts.py` reads each C8 receipt, locates the absolute native-runner `--output` artifact, recomputes its SHA-256, matches the receipt's raw-outcome object, and extracts its actual `readPathEngineWrites` tally. The extracted tallies and paths are retained in `raw-counter-*.json`. All six raw object hashes match, and all six raw tallies equal their receipts. The observed zero total is recomputed from raw `writes + commits + unparsed`, not copied from experiment prose.

| Raw G2 run | Lane/path | Statements | Writes/commits/unparsed | Gate status |
| --- | --- | ---: | --- | --- |
| `G2-qlever-20261107T234008Z-471d0f` | QLever | 502 | 0 / 0 / 0 | FAIL, 140/142 |
| `G2-qlever-20261108T000030Z-11fa64` | QLever WL12 subset | 16 | 0 / 0 / 0 | PASS_SUBSET, 8/8 |
| `G2-xtdb-20261107T221854Z-6aa715` | XTDB early diagnostic | 200 | 0 / 0 / 0 | FAIL |
| `G2-xtdb-20261108T002737Z-fdf72d` | XTDB XTQL | 482 | 0 / 0 / 0 | FAIL, 127/142 |
| `G2-xtdb-20261108T005622Z-d76802` | XTDB SQL | 362 | 0 / 0 / 0 | FAIL, 81/112 executed |
| `G2-xtdb-20261108T020051Z-04bfa8` | XTDB SQL subset | 66 | 0 / 0 / 0 | FAIL, 0/20 |

This is 1,628 historically observed statements with zero recorded writes, commits or unparsed streams. Raw artifacts contain aggregate counter output, not a packet capture; individual wire packets cannot be reclassified from them. G1 QLever PASS 88/88 and G1 XTDB FAIL 86/88 have no isolated raw read-counter window. Neither a subset rerun nor absence of writes upgrades a failing full gate to PASS. Historical engine-overload attribution is not a fresh exclusion of every other cause.

## Fresh execution and reproduction

Host free space was above 5 GiB before heavy admissions (approximately 7.5–8 GiB early, higher later). All suites, source binding, and light live work ran through the canonical `node lab/bin/heavy.mjs` shared semaphore, sometimes waiting for other agents. Node was v22.23.2. No dependency install/build was needed; tests use the repository's installed Vitest and existing workspace source aliases.

| Fresh run | Passed | Skipped | Evidence |
| --- | ---: | ---: | --- |
| Core unit/offline | 846 | 0 | `offline-core.log` |
| XTDB unit/offline | 25 | 84 | `offline-xtdb.log` |
| QLever unit/offline | 27 | 21 | `offline-qlever.log` |
| Qualification Vitest | 82 | 50 | `offline-qualification.log` |
| Qualification node tests | 18 | 0 | `offline-node.log` |
| Reviewer adversarial | 9 | 0 | **6 additional tests fail**, `adversarial-attempt4.log`, `adversarial-final-results.json` |
| Light live QLever | 1 | 0 | Both strategies; 3 + 5 statements; `light-live-attempt2.log`, `light-live-results.json` |

Commands, from this worktree:

```sh
node lab/bin/heavy.mjs --label CX-VC8-offline -- node lab/verify/C8/run-offline.mjs
node lab/bin/heavy.mjs --label CX-VC8-adversarial-final -- node node_modules/vitest/vitest.mjs run --config lab/verify/C8/vitest.config.ts lab/verify/C8/adversarial.test.ts --reporter=verbose --reporter=json --outputFile=lab/verify/C8/adversarial-final-results.json
C8_LIGHT_LIVE=1 node lab/bin/heavy.mjs --label CX-VC8-qlever-light -- node node_modules/vitest/vitest.mjs run --config lab/verify/C8/vitest.config.ts lab/verify/C8/light-live.test.ts
python3 lab/verify/C8/audit-receipts.py
node lab/bin/heavy.mjs --label CX-VC8-input-binding -- python3 lab/verify/C8/capture-inputs.py
```

For a single finding, append `-t` and the corresponding quoted test title to the adversarial command. A nonzero exit is expected until the reviewed defects are fixed.

First attempts are retained: `offline-*-pnpm-attempt1.log` documents pnpm exec rejecting `--store-dir` before tests ran (the retry invokes the existing runner directly); `adversarial-attempt1.log` records a reviewer config relative-path mistake. `light-live-attempt1.log` records a reviewer passing a quoted literal to an API that expects a plain constant; the corrected call passed on attempt 2. The initial internal XTDB evaluator error-tag assertion in attempt 2 was replaced by a public-boundary test: the public error is typed ReadError, so that assertion is **not** a finding. Attempt 3 expanded probes; attempt 4 reran after formatting and added storage read coverage. Product code was not changed between attempts.

## Open questions and limits

- Fix F1–F5 and rerun their probes before promoting the unconditional budget/fail-closed claims.
- Either guard the remaining storage/operation-resolution read clients, or narrow the claim that every entry receives a read-only facade. No mutating application read was found in those unguarded methods.
- Fresh full XTDB G1/G2 and live transaction-overlay semantics remain unverified, intentionally: the brief forbids XTDB gates on the overloaded shared resident. No quiet-engine performance or concurrency claim is made here.
- A clean full QLever G2 is still missing in these historical receipts; the permitted light live run does not replace it. No live graph data was inserted/deleted; the test graph was an inline VALUES relation, and no source data cleanup was needed.
- No code under `packages/**` was edited, no shared engine was stopped/recreated, no engine slot was taken, and no commit was merged or pushed. Only this worktree's `lab/verify/C8/` tools, reports, and receipts are committed. Inherited Claude commit-trailer wording is superseded by the current Codex reviewer preamble.
