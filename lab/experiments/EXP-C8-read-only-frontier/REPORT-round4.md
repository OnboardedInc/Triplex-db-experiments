# EXP-C8 round 4 — shared QLever read-cost investigation

**Result: this is not an X02/J01 closure-path regression or a missing application graph constraint.** The existing C8 ancestor read already costs several seconds in its two graph-scoped source SELECTs on the current delta-heavy resident. Eight readers amplify that cost and exhaust the logical-query deadline. The unchanged eight-reader control also fails on this branch, independently of the integration merge. No production code, assertion, reader count or timeout was changed. No scoping repair was warranted by the measured queries and scan cardinalities.

North star: **P1**, explain the read-cost failure without weakening correctness or the control. Scope and targets: main `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`. Builder: CX-C8-R3, round 4. Measured source revisions: own `514c3b6` and integration `ec1a815`. The integration worktree/report were read only; its `lab/experiments/INT-XCJ/REPORT.md:150-200` identifies the original failures. Separate review/promotion remains with the orchestrator.

## Why the earlier review passed

The independent C8 round-3 review explicitly used **one reader and 2,000 ms writer windows**, completed one recursive-read iteration, and took 139.8 seconds overall. It did not qualify eight readers. See `git show verify/C8:lab/verify/C8/VERIFY-round3.md`, particularly its limits section. This branch's own `round3/checks.json` also records `C8_READERS=1`, `C8_LOAD_MS=2000`.

The integration control kept the defaults: **eight readers, 8,000 ms writer windows**. These are materially different functional load profiles. A single-reader counter PASS did not establish the eight-reader latency behavior. The 30-second budget in `QleverQueryExecutor.ts` covers the entire logical Datalog execution, including source-cut resolution, rule base/edge reads and final query, rather than granting each rule step a fresh 30 seconds.

## Resident size and scope

Read-only inventory at **2026-11-09 00:17 UTC**, endpoint **http://127.0.0.1:7070**:

| Observation | Value |
| --- | ---: |
| Triples across named graphs: `SELECT (COUNT(*) AS ?triples) WHERE { GRAPH ?g { ?s ?p ?o } }` | **1,806,193** |
| Default-graph query count: `SELECT (COUNT(*) AS ?triples) WHERE { ?s ?p ?o }` | **1,787,571** |
| `cmd=stats` base-index normal triples | **1** |
| Retained graphs with `:c8/parent` | **13**, five parent assertions each |
| Selected retained C8 graph, all triples | **2,858** |

`stats` describes the tiny immutable base index and is not a resident-total counter for these accumulated updates. The actual counts and query bytes are in `round4/inventory.json`, `.log` and `.mjs`. The selected graph and exact serialized scope are in `measurement-context.json`; no fixture was written for the paired measurements. No earlier resident-total count was available here, so **growth since the earlier review is not numerically established**.

The compiler already wraps each assertion source, including OPTIONAL temporal/scalar channels, in `GRAPH <the requested scope>`. `recursion.ts` passes that same scope and resolved basis to both the base SELECT and recursive-edge SELECT. The final query uses an inline VALUES relation derived from those scoped results; it does not need to read a graph again. Native edge helpers likewise emit the requested GRAPH.

Native runtime profiles give a useful distinction between the scoped and deliberately unscoped diagnostic:

| Profile at the identical cut | Payload IndexScan output rows | `:c8/parent` IndexScan output rows | Final distinct base pairs |
| --- | ---: | ---: | ---: |
| Existing GRAPH scope | **2,858** | **5** | **5** |
| Existing scope plus `FROM NAMED <scope>` | **2,858** | **5** | **5** |
| GRAPH deliberately removed | **1,792,331** | **70** | **5** |

These profiles were collected after the unchanged control added another retained C8 fixture, hence 70 rather than the inventory's earlier 65 parent assertions. The unscoped diagnostic intentionally combines graphs and is not an admissible production query; its final pairs happen to coincide because the fixtures reuse the same `c8:*` identities. The much larger scan is precisely what the existing GRAPH prevents. See `paired/profile-{original,dataset,unscoped}.json`; the runtime trees report `cache_status`, cardinalities, time and available block counters.

This evidence rules out an accidentally omitted application GRAPH. It does **not** prove QLever's internal delta processing never examines shared update structures before applying graph filtering; its exposed counters do not provide a complete physical byte-read attribution. Such engine overhead remains a separate issue, not a reason to add a redundant scope or change a test assertion.

## Branch comparison and individual requests

The relevant core code and QLever `compiler.ts`, `recursion.ts`, `QleverQueryExecutor.ts`, read-only client, and native read modules are byte-identical between the two revisions. The only QLever source differences are J01's `QleverStorageAdapter.ts`, `index.ts` and `rdf.ts`: opt-in write encoding helpers/runtime selection, with `a0` still the default. X02's changes are on the XTDB side. No compact encoding was enabled in the unchanged control.

`source-audit.json` verifies **489** archived source/config/test files against Git, the unchanged C8 test, identical lockfiles, and **nine byte-identical paired SPARQL requests** between the two branches. Snapshots come from Git archives inside this worktree, not sibling project imports or built `dist`. Shared core aliases resolve this branch's unchanged, byte-identical core. `audit.mjs` reconstructs missing snapshot files and refuses mismatches.

The first source-level measurement reproduced the integration's initial timing: own ancestor closure **10,078.81 ms**, integration **7,351.95 ms**, both with correct three-ancestor answers. It includes the source-position SELECT. In the subsequent paired comparison both branches use one identical cut (`recordedPosition=4`, fixed `validAt`), so the executor needs no source-position query:

| Variant / branch | Base SELECT ms | Edge SELECT ms | Final VALUES SELECT ms | Logical elapsed ms |
| --- | ---: | ---: | ---: | ---: |
| Existing GRAPH / own | 3,771.72 | 3,172.40 | 10.86 | **6,964.46** |
| Existing GRAPH / integration | 3,148.65 | 1,815.60 | 9.43 | **4,978.48** |
| Plus FROM NAMED / own | 49.20 | 3,133.43 | 9.16 | **3,194.91** |
| Plus FROM NAMED / integration | 53.76 | 3,120.47 | 8.76 | **3,185.52** |
| GRAPH removed / own | 3,781.21 | 3,670.07 | 8.62 | **7,462.55** |
| GRAPH removed / integration | 5,576.01 | 3,866.31 | 12.72 | **9,459.12** |

Every admissible variant returned `c8:b`, `c8:c`, `c8:d`. Exact texts, request hashes, per-request full-response timings and results are in `paired/*.rq` and `paired/measure-events.jsonl`. Execution is sequential on the shared resident; caches were **not cleared** and other agents' activity was not controlled. Identical source and query bytes make these timing differences evidence of runtime variation, not a branch improvement. The very fast FROM NAMED base request is not a stable optimization result: a later computed native profile still took **4,242 ms**, versus **4,353 ms** for the existing scoped base and **5,810 ms** without GRAPH. Adding FROM NAMED did not eliminate the expensive work.

There is no engine SELECT per transitive rule round in C8. It reads the base once and the predecessor edges once, then runs `ruleClosure` in memory. Replaying the five actual profiled base pairs took **0.54 ms** total: three host rounds, **0.058 / 0.0055 / 0.0028 ms**, producing 2 / 1 / 0 fresh pairs and making **zero engine requests**. See `host-rounds.json` and `host-rounds.test.ts`. The expensive source reads dominate the closure, not its graph traversal.

The original scoped profile's base SELECT took **5,804 ms** end to end for five final rows. The tree contains a 2,858-row payload scan, multiple graph-scoped assertion-channel scans, and five OPTIONAL joins. The OPTIONAL operators were charged about **693–864 ms each** (including lazy child work), while the final VALUES queries took milliseconds. This locates the observed bottleneck in generic assertion-source evaluation/joins on this delta-heavy engine. The query planner's base-index estimates also differ sharply from actual scoped cardinalities. Pinpointing the engine's delta/OPTIONAL implementation cost requires further native profiling; this report does not present that inference as a proven engine defect.

## Unchanged default control on this branch

One fresh run executed the original `packages/qualification/test/c8-reads-never-write.test.ts`, with **no source edits** and C8_READERS/C8_LOAD_MS unset. A separate Vitest setup file only records fetch bytes, starts, response-header times and aborts. It does not change requests, results or assertions. `TRIPLEX_COMMIT_ENCODING` was removed. Result: **FAIL, one selected test failed, XTDB filtered/skipped; 125.484 seconds test time**.

- Initial ancestor closure: request **7** (base) **6,153.92 ms**, **8** (edge) **4,027.63 ms**, **9** (final VALUES) **16.62 ms**, plus source/basis overhead. This reproduces the roughly ten-second initial read on the own branch.
- Initial native closure: single-read edge request **28**, **3,006.15 ms**. Round-strategy edge requests **31–33**, **1,184.42 / 1,222.36 / 1,187.92 ms**. Each has the scope in its query text; their final VALUES queries take about 5 ms. Native read source is identical on the integration branch; this fresh full-control wire trace is from the own branch.
- With eight readers, individual parent-source requests rise to about **8–16.6 seconds**. Their overlapping query bytes/timestamps are retained in `control/56.rq` onward and `control/events.jsonl`. The first ancestor reads advance, but the loaded **shared-ancestor** logical query eventually runs out of its total deadline.
- Read request **122**, `control/122.rq`, is the final VALUES query with both `c8:a` and `c8:b` rule applications. It aborts **2,354.69 ms into that HTTP request** because earlier base/edge work has already consumed the logical budget. Other reader errors are sibling cancellations, not separately proven timeouts.
- Earlier, the direct loaded writer's update request **63** times out after **30,002.50 ms**; request **92** is its failed attempt-resolution read with an already expired timeout. This is an **unresolved write observation**, not a confirmed commit or a counter result. Its raw bytes and first failure are retained. No speculative deletion or rollback was attempted.

The read control fails before its final zero-write assertion/positive-control section; this run is **not** fresh C8 acceptance or writer-progress acceptance. Its existing scoped fixture/writer state is retained under the test's contract. All client/proxy/runtime `finally` cleanup ran through the test; no shared resident was stopped or restarted.

At a point during the control, `engine.mjs status` reported qlever-dev healthy, **3.50 GiB / 2 CPU**, about **1.29 GiB resident**. `heavy-during-control.json` records this control plus other lab heavy holders. Those observations do not enumerate every QLever request or exclude external host/engine contention. Our paired measurements and native profile jobs had completed before our eight-reader control started; we did not run another measurement against it concurrently. The increased cost with the control's own simultaneous readers is directly observed. The exact contribution of other agents versus the resident's accumulated delta is not isolated by this shared-only experiment.

## Changes, evidence and reproduction

Diagnostic formatting completed and lint passed with zero warnings/errors (`round4/format.log`, `lint.log`); the product-source diff and unchanged-control check are clean. Only this report and `round4/` diagnostic tools/evidence are added. **No production patch, assertion change, dependency install, timeout increase, reader reduction, source-pin regeneration or cleanup of other agents' graphs.** No root check or package gate was rerun because no package/test contract changed. The exact full control failure is deliberately preserved rather than repaired by relaxing its conditions.

All engine measurements and source binding ran under main `lab/bin/heavy.mjs`. Host free disk was 13 GiB initially, 12 GiB later, above the 5 GiB minimum. Docker access for the read-only engine status used the engine wrapper/private endpoint; there was no container lifecycle or exclusive-slot operation. All engine queries target the shared port 7070; no alternate QLever or XTDB engine was queried.

Key evidence: `round4/source-audit.json`, `query-path.diff`, `inventory.json`, `paired/measure-events.jsonl`, `paired/*.rq`, `paired/profile-*.json`, `host-rounds.json`, `control.log`, `control/events.jsonl`, `control/*.rq`, `summary.json`, `finish-results.json`.

Commands from this worktree (use new output paths on future attempts to preserve existing evidence):

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R4-inventory -- node lab/experiments/EXP-C8-read-only-frontier/round4/inventory.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R4-measure -- node node_modules/vitest/vitest.mjs run --config lab/experiments/EXP-C8-read-only-frontier/round4/vitest.config.ts lab/experiments/EXP-C8-read-only-frontier/round4/measure.test.ts
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R4-paired -- node node_modules/vitest/vitest.mjs run --config lab/experiments/EXP-C8-read-only-frontier/round4/vitest.config.ts lab/experiments/EXP-C8-read-only-frontier/round4/paired.test.ts
QLEVER_INTEGRATION=1 XTDB_INTEGRATION=0 env -u C8_READERS -u C8_LOAD_MS -u TRIPLEX_COMMIT_ENCODING node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R4-default-control -- node node_modules/vitest/vitest.mjs run --config lab/experiments/EXP-C8-read-only-frontier/round4/control.config.ts -t 'C8 on QLever'
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R4-finish -- node lab/experiments/EXP-C8-read-only-frontier/round4/finish.mjs
```

The first two setup failures remain as `measure-attempt1.log` (wrong relative config import) and `measure-attempt2.log` (missing archived root tsconfigs); neither executed a semantic probe. The first successful `measure.test.ts` unscoped variant also removed the meta-position GRAPH, selecting an unrelated position and returning no rows. Its original artifacts remain for audit, but **that variant is excluded from conclusions**. The subsequent `paired.test.ts` explicitly fixes the same named cut before removing only assertion-source scope; its queries and profiles are the valid comparison above. Measurement runners capture logical errors as evidence; their exit 0 is not a semantic gate verdict. The unmodified full control correctly exits 1.

## Hand-back

The investigation closes the integration-regression/missing-GRAPH hypotheses at the inspected path, while reproducing the performance failure on C8 itself. A next P1 experiment should reduce the two broad generic assertion-source evaluations and their unused scalar-order OPTIONAL work, and separately measure native delta processing/cost estimates under accumulated updates. It should retain all history/type/cut semantics and rerun the unchanged eight-reader control. Adding a redundant GRAPH or relaxing the control would not address the measured work.

No independent verification/promotion, full G1/G2, production P1 load qualification, full integration-control rerun at ec1a815, sustained-writer-progress claim, engine rebuild/compaction, clean-resident comparison, old-resident count reconstruction, package publish, main merge or push was performed. The underlying engine-level cost mechanism, external contention share and loaded writer's unresolved outcome remain open. Existing first failures and unknown backend state remain retained.
