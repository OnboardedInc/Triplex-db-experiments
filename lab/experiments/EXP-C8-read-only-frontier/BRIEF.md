# EXP-C8 reads never write: the read-only frontier loop on both lanes (contract C8)

**North star:** P1 first (reads that never block writers): today a read that recurses writes scratch state, so on XTDB each frontier
round is a COMMIT SYNC (205 to 410 ms per round, R10) and on QLever 14 of 71 G2 tasks write scratch graphs (about 62 updates per run,
EXP-002), and every QLever update empties the whole result cache (R17). Reads that write compete with the commits P2 measures and grow
QLever's delta. Measured as: zero writes issued by any read path (counted at the engine), P1 writer latency with recursive reads running,
and exact answers against the oracle. Correctness floor: C8 ("reads never mutate").
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md 1.1; contract C8 (lab/PLAN.md section 4, ACCEPTANCE.md). Evidence:
lab/research/R10-read-only-recursion.md (sections 0.2, 0.3, 3, 6.9), lab/research/R14-xtdb-correctness-hazards.md, EXP-002 report,
lab/research/R17-qlever-northstar-fit.md finding 2.

## Commander's intent
No read call in either lane writes anything, and recursive reads stay exact and bounded. When this lands, the scratch-graph and
scratch-table mutators are gone from BasisRelations, both `recursion.ts` files and the maintained-query path, replaced by one shared
TypeScript `frontierClosure` helper with budgets and typed errors, and G1/G2 still pass on both lanes.

## Point of view (R10's recommendation)
1. **One helper, `frontierClosure`,** in shared TypeScript: iterative frontier expansion with a visited set, explicit budgets
   (`maxRelationRows` 100,000 pairs, rounds, time) and typed resource errors; simple-path supports computed locally from the fetched
   subgraph (R10 finding 9). One differential test against the oracle's `reachable`.
2. **QLever:** tier 1 (projection-eligible basis) is one property-path read over the current graph with a bound start, explicit zero
   length, `timeout` and `LIMIT`; tier 2 is the frontier loop over ledger relations with entity ids as IRIs (R10 finding 5: literal ids
   cost 0.23 ms of planning each, IRIs under 0.01 ms). Never `?s p+ ?o` with both ends unbound, never `p*` with a constant start.
3. **XTDB:** frontier loop over entity-keyed projection tables (`_id` point lookups, 3 to 7 ms per round for a frontier of 10), native
   `FOR VALID_TIME AS OF`; the ledger frontier only for small scopes. Use `col IN (SELECT x FROM UNNEST($1) AS u(x))`, never
   `col = ANY($1) AND p` (R14 silent wrong rows) and never `WITH RECURSIVE`.
4. **Close C8's scope gap:** the Datalog `rules` path in both lanes and `makeXtdbMaintainedQueries` also stop writing (R10 finding 10).
5. **Prove "never writes"** with a counter at the engine boundary (XTDB: transactions committed during a read; QLever: update requests
   received) that must stay at zero across G1, G2 and a recursive-read load run; add it as a test.

## Boundaries
- Worktree branch `exp/C8-read-only-frontier`. Files: `packages/qlever/src/native/BasisRelations.ts`, `packages/qlever/src/recursion.ts`,
  `packages/xtdb/src/query/recursion.ts`, `packages/xtdb/src/MaintainedQueries.ts`, a new shared helper (packages/core/src/datalog or a
  new small module; not packages/core/src/entity), tests. Stay out of `packages/xtdb/src/XtdbStorageAdapter.ts` (EXP-P2X),
  `packages/qlever/src/broker/**` and the QLever adapter's read routing (EXP-P2Q), and packages/core/src/entity.
- Engines: the shared dev residents with names unique to EXP-C8; never down or recreate them. Never ports 15442/17019; Docker only via
  DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock.

## Gates
1. Zero engine writes from any read path (the counter test) on both lanes.
2. `node lab/bin/gate.mjs G1` and `G2` pass on both lanes (QLever with the dev profile and planner budget recorded).
3. Differential test of `frontierClosure` against the oracle's reachability on the R10 fixtures plus random graphs.
4. Recursive-read timing per round on both lanes, before and after.

## Report
Commit hash; the list of mutators removed; gate receipts; before/after per-round timings; the write-counter results; open questions.
