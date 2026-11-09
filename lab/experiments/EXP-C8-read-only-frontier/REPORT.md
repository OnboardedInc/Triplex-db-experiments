# EXP-C8 read paths never write, both lanes: report (saved by the orchestrator, 2026-11-08 02:24Z; the agent's hand-back is the source)

**Bottom line (P1 floor):** every read entry point on both lanes now runs on a read-only client view that refuses submit/update before
anything is sent, five read-path mutators are removed, and a wire-level write counter that fails closed on anything it cannot classify
records 0 writes and 0 commits in every gate run (QLever G2 502 statements, XTDB XTQL G2 482, XTDB SQL G2 362, subset reruns 66). QLever
gates pass; XTDB gates fail only on timeouts from the overloaded shared xtdb-dev (200-260% of its 2-CPU cap, shared with W01, V-X02, V-D01).
Branch `exp/C8-read-only-frontier` d9b2dc8 (code 620145c, d508c28, 0147c88, 6727da4; receipts d9b2dc8) on top of EXP-X02 bf1ad4d, which is
under V-X02. Raw timing: /Users/sam/Claude/Projects/triplex-db-2/EXP-C8/.

## What changed
- `packages/core/src/native/FrontierClosure.ts` (exported from `@triplex-build/triplex/runtime`): frontierClosure with a visited set;
  typed `RecursionBudgetExceeded` per budget (rounds, visited, edges, roundRows, pairs, pathSteps), never a partial answer; reachFrom,
  closurePairs; ruleClosure (semi-naive, keeps Datalog maxDepth and the recursive call's tail constraint); countSimplePaths; memoryEdges.
- `ReadOnlyClient.ts` per lane handed to every read entry point (query executor, native queries, temporal queries, maintained query()).
- Default strategy "single-read": each edge relation read once (bounded), frontier rounds in memory; `strategy: "rounds"` remains. Reason:
  on the current ledger one round costs as much as reading the whole edge relation (XTDB 2.0-3.7 s per round shape on 536k-row
  tx_assertions; QLever 150-1,900 ms per round).
- Native definitions take optional `seeds`; XTQL closures have `selectWithReachability`.
- Removed mutators: XTDB `materializeNativeReachability` (scratch tables, per-round INSERT...SELECT + ASSERT + marker + COMMIT SYNC, ERASE);
  XTDB Datalog `materializeRules`/`compileRuleRound` (now inlined as one JSON-array parameter); XTDB `makeXtdbMaintainedQueries().query()`
  writes (query() is read-only; writing is the new `publish()`); QLever `materializeQleverNativeRelations` (scratch-graph INSERT, marker,
  DELETE); QLever `materializeQleverRules` (derived graphs never cleaned up). EXP-X02's interim XTQL depth unrolling deleted.

## Gate receipts
| Gate | Receipt | Result |
| --- | --- | --- |
| G1 QLever (f1, planner budget 1 before and after) | G1-qlever-20261107T230659Z-119525 | PASS 88/88 |
| G2 QLever (planner 1) | G2-qlever-20261107T234008Z-471d0f | FAIL 140/142: 2 timeouts in non-recursive WL12; all closure workloads pass |
| G2 QLever WL12 rerun | G2-qlever-20261108T000030Z-11fa64 | PASS_SUBSET 8/8 |
| G1 XTDB | G1-xtdb-20261108T000559Z-55f61b | FAIL 86/88: 2 timeouts in non-recursive cases; all rule and transaction cases pass |
| G2 XTDB XTQL | G2-xtdb-20261108T002737Z-fdf72d | FAIL 127/142: 15 timeouts in non-recursive WL12/WL18; WL11, 13, 14, 15, 20 pass |
| G2 XTDB SQL | G2-xtdb-20261108T005622Z-d76802 | FAIL 81/112 executed: timeouts and WL18-20 ingest failures; WL11 6/6, WL13 8/8, WL14 5/6, WL15 2/6 |
| G2 XTDB SQL rerun WL14, 15, 20 | G2-xtdb-20261108T020051Z-04bfa8 | FAIL 0/20, all timeouts (plain-SQL answers 20-23 s) |

## Evidence for the floor
- Write counter `packages/qualification/src/engine-write-counter.ts`: XTDB parses pgwire Q/P and counts DML, DDL, `BEGIN READ WRITE`,
  `COMMIT`; QLever counts HTTP update requests; `gate.mjs` fails G2 on any read-path write. Not inside G1 (G1 shares one client for writes
  and reads); G1's coverage is the read-only views plus `packages/qualification/test/c8-reads-never-write.test.ts` (both lanes: G1's rule
  queries, cursor pages with counts, maintained query(), native closures in both strategies, an 8 s load run with 4 recursive readers and a
  writer on a separate runtime; 0 writes; a positive control registers 1 commit).
- Differential `packages/core/test/native/frontier-closure.test.ts`, 20 tests: over 1,000 origin queries against `event_oracles.reachable`
  (Python, unchanged) on every packet cut of WL11/13/14/15/20 plus 300 random graphs; simple-path counts against `support_rows`;
  ruleClosure against the old depth-tagged naive rounds including tail constraints.
- An Opus reviewer read the diff; fixed: XTDB transaction-overlay identity (staged writes were invisible inside the same transaction), lost
  tail constraints in recursive rules (both lanes), an off-by-one rounds budget.

## Timing (shared engines, both loaded, 3 repeats)
- XTDB SQL: wl15 native total before 5.2-10.3 s, rounds 11.9-18.4 s, single-read 2.6-3.2 s; tree (340 edges) 8.6-13.0 / 15.9-20.0 /
  2.9-6.0 s; Datalog wl15 / tree before 10-25 / 22-26 s, rounds 7-13 / 6-12 s, single-read 4.2-7.7 / 4.4-6.3 s. Before: 5-7 write
  transactions per call.
- QLever: tree native before 3.2-4.9 s, rounds 3.8-5.6 s, single-read 1.1-1.7 s; Datalog wl15 / tree before 13-20 / 25-30 s (one timeout),
  rounds 2-4.5 / 3.8-5.2 s, single-read 6.2-8.5 / 6.5-7.3 s. Before: 2 updates per native call, each emptying the result cache.
- P1 side observation (noisy): XTDB writer p99 2.5 s alone, 3.4 s with readers; QLever writer 4.4 s p50 alone, one 20 s commit with 4
  readers (updates appear to queue behind queries; EXP-P2Q's area).

## Open questions (ruled Q76, pending)
1. Single-read refuses above 1M edge rows (XTDB) or 100k (QLever maxRelationRows); cheaper per-round reads need XTDB entity-keyed projection
   tables or a QLever IRI ledger (R10 6.4). 2. QLever inlines the closure as VALUES literals at about 0.23 ms per literal, so the effective
   limit is tens of thousands of pairs. 3. QLever property paths do not apply (no plain-IRI current graph). 4. `XtdbStorageAdapter.initialize`
   still creates the now unused `tx_query_relations`. 5. A recursive rule whose tail is the attribute variable is refused typed; core's SQL
   `compileRecursiveCTE` (packages/core/src/datalog/compiler.ts) ignores tail constraints altogether. 6. WL20 supports still sum path lengths
   1-3; countSimplePaths is built and tested but not wired in. 7. Who calls `publish()` for maintained queries? 8. Clean XTDB G1/G2 receipts
   need a quiet engine.
