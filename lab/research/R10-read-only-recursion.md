# R10: Read-only recursion for native reads (contract C8)

Date: 2026-11-07. Scope: how to answer the recursive native tasks on XTDB 2.2.0 (`c6c1962`) and QLever 0.6.0 (`6c5861a`)
without writing to either engine, with exact results at a temporal basis and bounded cost.

How to read the evidence tags. **[S]** pinned engine source or repo file, cited as `path:line`. **[P]** a probe I ran, with raw
output under `/Users/sam/Claude/Projects/triplex-db-2/R10-recursion-probes/` (section 7 lists files). **[W]** a web page I opened.
**[W-]** a web result I saw only as a search snippet, or a paper I am citing from memory without re-opening it. **[I]** my inference.
Each section ends with a confidence line.

---

## 0. Skim layer

### 0.1 Answer in one paragraph

Recursive native reads can be made read-only on both engines and keep today's answers. Every recursive task needs one
**single-source (or few-source) reachability** over edges live at one basis, and the fixture needs nothing larger than 5 edges.
Two mechanisms are exact: a **TypeScript frontier loop** (semi-naive evaluation, one read per round, frontier bound as one
parameter) on both engines, and **SPARQL property paths** over the QLever current graph as a faster path for eligible bases.
Both matched the workload packet on all 17 recursive fixture cases and matched synthetic oracles at 5 bases [P].

### 0.2 Findings that change the plan

1. **The fixture is tiny, so it proves semantics only.** Six operations and 14 cases use closure, plus 3 `reachability_supports`
   cases. The largest cut has 5 live recursive edges, 4 reached nodes and 3 rounds. Workloads 12, 16 and 18 are not graph recursion
   in the native code. (section 1)
2. **Today's closures are all-pairs, not single-source, so they cannot scale.** Both lanes materialize the closure of the whole edge
   attribute and fail above 100,000 pairs. A 111,111-node tree has 543,210 closure pairs. The XTDB replay of the current SQL failed
   on it after 2.6 s, and each write round costs 205 to 290 ms even on a graph of 1,122 edge rows because of `COMMIT SYNC`. (sections 1.5, 3.6) [P]
3. **QLever property paths are exact and cheap when the edges are plain IRI triples.** Bound-start `<s> p+ ?o` took 4 to 15 ms for
   reach up to 11k and 50 to 200 ms for reach 111k, on predicates of 123k and 1.1M edges. They need IRI objects equal to the subject
   IRIs, cannot filter edges by time, and QLever skips a zero-length match for a constant absent from the graph, unlike the W3C
   text. (section 2) [S][P]
4. **QLever `PathSearch` gives exact-basis reachability and exact simple-path counts in one read.** Its edge relation is any
   `SELECT`, so ledger temporal filters apply. Reach sets matched the oracle, and 71,074 simple paths from a root with 2,715
   multi-path nodes matched an independent count in 1.66 s. It is a magic service with a constant cost estimate, output proportional
   to path length sums, and it under-approximates when `maxDepth` is combined with `numPathsPerTarget`. Treat it as a rival, not the
   default. (section 2.7) [P]
5. **Frontier cost on QLever depends on how entity ids are encoded.** `VALUES` of plain string literals costs 0.23 to 0.25 ms of
   planning per literal (the cause is my inference: ICU vocabulary lookup); the same ids as IRIs cost under 0.01 ms. Ledger frontier to
   reach 8,616 nodes took 3.2 s with literal ids and 0.28 s with IRI ids. (section 3.3) [P]
6. **On XTDB the ledger frontier is a column scan per round, and only `_id`-keyed tables give point-lookup rounds.** A round on the
   333,445-row ledger took 235 to 330 ms (linear in rows). On an entity-keyed table with an array column it took 3 to 7 ms for
   a frontier of 10, 22 ms for 100 and about 100 ms for 1,000. (section 3.4) [P]
7. **XTDB 2.2.0 bug that returns wrong rows silently.** `col = ANY($1)` followed by `AND <another predicate>` returns zero rows
   or a wrong count; with the other predicate first it is correct. Use `col IN (SELECT x FROM UNNEST($1) AS u(x))`. (section 3.4) [P]
8. **XTQL frontier works, with two limits.** A `rel` parameter join costs 17 to 76 ms per round against 3 to 13 ms for the SQL
   form and scans the whole table; an `_id` OR-chain pushes the `_id` down (4 ms for 10 ids) but fails to compile at 100 scalar
   parameters, so the frontier must travel as one structured parameter. (section 3.5) [P]
9. **Supports can be exact without more engine calls.** The frontier already fetches every out-edge of every reached node, so
   simple-path counts are computed locally on that subgraph. This matched the oracle on the fixtures. (section 3.7) [P]
10. **C8 has a scope gap.** The Datalog `rules` path in both lanes and `makeXtdbMaintainedQueries` also write scratch state from a
    read call. C8 names only native reads. (section 6.9)

### 0.3 Recommendation in one table

| | Lane Q (QLever + log) | Lane X (XTDB) |
| --- | --- | --- |
| Tier 1, projection-eligible basis (C1) | One property-path read over the current graph, bound start, explicit zero length, `timeout`, `LIMIT` | Frontier loop over entity-keyed projection tables, native `FOR VALID_TIME AS OF` |
| Tier 2, every other basis | Frontier loop over ledger relations, entity ids as IRIs | Frontier loop over the ledger (small scopes) or over a write-path edge index (scale) |
| Rival to measure | `PathSearch` over a ledger edge subquery | none |
| Shared code | one TS helper `frontierClosure` with budgets and typed errors, one differential test against the oracle | same helper |
| Not allowed | `?s p+ ?o` with both ends unbound, `p*` with a constant start, any scratch graph or table | `= ANY($1)` with a following predicate, `WITH RECURSIVE` |

---

## 1. Q1: Inventory of recursive native tasks

### 1.1 What each task computes

Recursion shape: every task needs **positive-length reachability from a given origin** over edges live at one basis `(P, R, V)`.
The oracle's `reachable` is a visited-set traversal that excludes the origin unless a cycle returns to it
(`qualification/workloads/event_oracles.py:176-189`). Tasks 11 and 14 add the origin explicitly.

| WL | Operation (cases) | Answer | Recursion shape | Where today |
| --- | --- | --- | --- | --- |
| 11 | `inherited_access` (3) | boolean: exists a grant `(p, r)` with `p in {user} + member_of+(user)` and `r in {resource} + parent+(resource)` | two single-source closures plus a join on grants | XTDB `xtdb-workloads.ts:399-412`; QLever `qlever-recursion.ts:137-150`; oracle `event_oracles.py:191-205` |
| 13 | `container_items` (4) | leaf descendants (no outgoing `contains`) of a container | one single-source closure plus anti-join | `xtdb-workloads.ts:423-433`; `qlever-recursion.ts:151-161`; oracle `:225-237` |
| 14 | `recalled_customers` (3) | customers of shipments of lots in `{origin} + input_of+(origin)`, only if origin is contaminated | one single-source reflexive closure plus join | `xtdb-workloads.ts:434-444`; `qlever-recursion.ts:162-172`; oracle `:240-262` |
| 15 | `dependency_closure` (1) | `depends_on+(X)` | one closure, cycle Y<->Z and diamond | `xtdb-workloads.ts:445-458`; `qlever-recursion.ts:173-188`; oracle `:264-278` |
| 15 | `vulnerable_deployments` (2) | applications in an environment with a vulnerable node in `{app} + depends_on+(app)` | multi-source: reverse closure from vulnerable nodes is cheaper than one forward closure per application | same |
| 20 | `reachability_closure` (1) | `edge+(A)` | one closure | `xtdb-workloads.ts:563-573`; `qlever-recursion.ts:189-199` |
| 20 | `reachability_supports` (3) | `(reachable, number of simple paths A to D)` | **not recursive today**: path counts for lengths 1 to 3 are summed ("not general path counting") | `xtdb-workloads.ts:574-604`; `qlever-workloads.ts:579-606`; oracle `:339-361` counts simple paths |

Not recursion in the native code, although the names suggest it:

- **12 `access_with_deny`**: two correlated `NOT EXISTS` joins, no closure (`xtdb-workloads.ts:413-422`). The packet lists `recursive_allow` in `requires`, but the oracle reads pre-expanded edges (`event_oracles.py:208-222`).
- **16 `output_lineage`**: one-hop input joins plus a metadata join (`xtdb-workloads.ts:459-479`). No multi-hop lineage exists in the packet.
- **18 `uptime_duration`**: interval endpoint segmentation. It sits in `qlever-recursion.ts:200-317` only because that file holds "property-path and interval tasks".

### 1.2 Graph sizes in the fixture, per case

Computed from `qualification/workloads/temporal-workloads.json` with `q/fixture_sizes.py` [P].

| WL / case | Cut (P, V) | Live recursive edges | Origin | Reach | Frontier rounds |
| --- | --- | --- | --- | --- | --- |
| 11 inherited-allow | (2, 49) | 3 (2 member, 1 parent) | user | 2 plus resource side 1 | 3 plus 2 |
| 11 expired-membership | (2, 50) | 2 | user | 0 | 1 plus 2 |
| 11 unknown-user | (2, 10) | 3 | nobody | 0 | 1 plus 2 |
| 13 nested-items | (2, 5) | 5 | pallet | 4 | 3 |
| 13 move-boundary | (2, 10) | 5 | pallet | 3 | 3 |
| 13 move-not-yet-known | (1, 10) | 5 | pallet | 4 | 3 |
| 13 destination | (2, 10) | 5 | other | 1 | 2 |
| 14 affected-customer | (1, 20) | 1 | A | 1 | 2 |
| 14 corrected-genealogy | (2, 20) | 1 | A | 0 | 1 |
| 14 before-shipment | (1, 9) | 1 | A | 1 | 2 |
| 15 diamond-cycle / vulnerability-end / dependency-set | (1, 10) or (1, 20) | 5 | X | 3 | 3 |
| 20 two-supports | (1, 0) | 4 | A | 3 | 3 |
| 20 one-support | (2, 0) | 3 | A | 3 | 3 |
| 20 last-support-removed / remaining-closure | (3, 0) | 2 | A | 2 | 2 |

Rounds are depth plus one, because the last round returns no new node. The largest closure the current approach materializes is
9 pairs (13 nested-items). Nothing in the packet exercises a bound, so section 3.6 and section 6 rely on synthetic graphs.

### 1.3 Bounds in use today

| Bound | XTDB `selectSqlWithReachability` | QLever `selectWithRelations` | Datalog `rules` (both lanes) |
| --- | --- | --- | --- |
| rows in the answer | `maxRows` 1,000 (`NativeQueries.ts:48`) | 1,000 (`NativeQueries.ts:107`) | 100,000 |
| closure size | `maxRecursiveRows` 100,000 **pairs** of the all-pairs closure (`Reachability.ts:42,135`) | `maxRelationRows` 100,000 pairs, edges and closure both checked (`BasisRelations.ts:101-109,271-282`) | `maxRows` 100,000 |
| rounds / depth | `maxRounds` 100 (`Reachability.ts:43`) | none (one native `p+`) | `maxDepth` default 100 per rule (`recursion.ts:51-52`) |
| wall time | 30,000 ms (`NativeQueries.ts:49`) | 30,000 ms, `maxResponseBytes` 16 MiB (`NativeQueries.ts:106-108`) | by caller |
| task call | `maxRecursiveRows 100_000, maxRounds 100` (`xtdb-workloads.ts:207-213`) | `maxRows 1000, maxRelationRows 100_000, timeoutMs 30_000` (`qlever-recursion.ts:133`) | |

### 1.4 What mutates today

- **XTDB**: `CREATE TABLE tx_native_relations` and `tx_native_relation_attempts`, then per round `INSERT ... SELECT`, `ASSERT`, an attempts
  marker insert, `COMMIT SYNC`, and finally `ERASE` (`packages/xtdb/src/native/Reachability.ts:159-166,181-205,139-155`).
- **QLever**: `INSERT` of edges into `<urn:triplex:native:...:runId>`, a completion marker, then `DELETE` plus a receipt insert
  (`packages/qlever/src/native/BasisRelations.ts:266-270,205`).
- **Same class, outside C8's wording**: Datalog rule rounds insert into `tx_query_relations` (`packages/xtdb/src/query/recursion.ts:111-118`) and into
  `urn:triplex:derived:` nodes in a relation graph (`packages/qlever/src/recursion.ts:105-116`); `makeXtdbMaintainedQueries` creates
  `tx_query_generations` and `tx_query_members` inside a `query` call (`packages/xtdb/src/MaintainedQueries.ts:46-58`, exported at `index.ts:84`).

### 1.5 Measured cost of the current XTDB method

Replayed the exact SQL of `Reachability.ts` against my tables on a 1.5 GiB XTDB 2.2.0 container [P `x/p4.out`]:

| Graph | Result | Time |
| --- | --- | --- |
| 1,111-node subtree, 1,122 edge rows (1,005 live at the basis) | closure 2,673 pairs; seed 408 ms, rounds 291, 282, 205 ms | 1.21 s plus 27 ms cleanup |
| 111,111-node tree, 123k edges | `ASSERT` limit failure (closure would be 543,210 pairs for the tree edges) | 2.56 s, 65 ms cleanup |

**Confidence: High** for the inventory (read from source and the packet) and for the cost replay (one run each, same SQL text).

---

## 2. Q2: QLever 0.6.0 property paths

### 2.1 What the engine does

```
  SPARQL text                    QueryPlanner                         Operation
  -----------                    ------------                         ---------
  ?s (p|q/r)+ ?o   ---parse--->  seedFromTransitive                   TransitivePathBase
                                 QueryPlanner.cpp:1045-1062           (subtree = any plan for the inner path)
                                   child = plan of inner path           |
                                   TransPath{left,right,min,max}        v
                                 visitTransitivePath :3241-3270       TransitivePathBinSearch (default)
                                                                      or TransitivePathHashMap
                                                                        edges = subtree_->getResult(false)
                                                                        one DFS per start node
```

- **The inner path may be any property path**: alternatives, sequences, inverse and negated paths all become a child graph pattern
  that is planned like a query (`QueryPlanner.cpp:971-1000,1045-1062`) [S]. Probe: `(dep|deployed_in)+`, `(dep/dep)+` and `(^dep)+` all worked [P `q/out/p1.out`].
- **The edge relation is fully materialized** before the search because the search needs random access
  (`TransitivePathImpl.h:180-183`) [S]. The default `use-binsearch-transitive-path` is true (`RuntimeParameters.h:101`), so the edges are
  sorted spans of 8-byte ids, about 16 B per edge [I]. Cost per query is therefore O(edges of the inner path), even for one start node.
- **One DFS per start node** (`TransitivePathImpl.h:211-280`, `TransitivePathGraphSearch.h:76-130`) [S]. A visited set gives cycle safety.
  The result is a set of reached nodes: no duplicate rows for several paths to one node [P: `X dep+ ?y` returned 3 rows on a diamond with 2 paths to Z].
- **Direction** (`TransitivePathBase.cpp:185-197`): a bound left variable starts left to right; a bound or constant right side
  starts right to left over reversed edges; otherwise left to right. `?x dep+ <Z>` returned `{W, X, Y, Z}` [P].
- **Bounded paths** `p{n,m}` are supported and run a distance-aware DFS (`TransitivePathGraphSearch.h:135-195`). Probe: `{1,2}` and `{2,2}` returned the right sets [P].

### 2.2 Endpoint cases, memory, time

| Shape | Behavior | Cost note |
| --- | --- | --- |
| `<s> p+ ?o` | one DFS from `s` | measured 4 to 15 ms, section 2.4 |
| `?x p+ <t>` | one DFS from `t` over reversed edges | same order |
| `<s> p+ <t>` | DFS with early exit at the target (`searchForTarget`) | same order |
| `?s p+ ?o` | DFS from every subject; planner cost estimate is 10,000 times the edge count to avoid it (`TransitivePathBase.cpp:377-405`) | giant-SCC ring (20k nodes, 60k edges): `COUNT(*)` ran until the `timeout` (2,009 ms and 5,004 ms for 2 s and 5 s) [P]; `LIMIT 10` returned in 11 ms because the result is lazy |
| `p*` or `p?` with a constant start | QLever joins the constant against all subjects and objects of the active graphs (`TransitivePathBase.cpp:54-72`, `joinWithIndexScan`) | a constant **absent from the graph returns no row**; the W3C algorithm returns the constant itself [P S3, W]. Use `BIND UNION p+` for explicit zero length |
| `?s p* ?o` | all subjects and objects scanned (`makeEmptyPathSide`, `:169-178`) | avoid |

Memory: the visited set, stack and reached set use the query allocator (`TransitivePathGraphSearch.h:79-100`), so the `-m` limit applies.
A forced materialization over the ring graph failed with `Tried to allocate 536.9 MB, but only 160.7 MB were available` after 13.5 s and
the server answered the next query in 5 ms [P `q/out/p4b_memory_limit_adhoc.txt`]. Streaming aggregation over 2,000 ring sources
(37.7M pairs) completed in 14.5 s without error. The failure is typed and non-fatal, but it arrives late.

### 2.3 Cancellation

- `checkCancellation` runs on every DFS pop (`TransitivePathGraphSearch.h:102,154`) and for every edge while building the hash map
  (`TransitivePathHashMap.cpp:80,90`) [S]. The default BinSearch variant has no build loop.
- Probe: the 2 s and 5 s `timeout` runs ended at 2,009 ms and 5,004 ms with `Operation timed out. Last operation: GroupBy (implicit)`, and a
  health query afterwards took 2.3 ms [P]. This is better than the sort-bound case R2 measured (`R2:406-409`), where the sort ignored the timeout.
- R2 found no HTTP cancel in 0.6.0 (WebSocket `cancel` frame only). I did not test a WebSocket cancel on a running path query.

### 2.4 Measured latency (123k-edge and 1.11M-edge predicates, cache cleared per run, 1 CPU container) [P `q/out/p2.out`]

| Predicate | Start (reach) | Median ms of 5 |
| --- | --- | --- |
| `contains`, 123k edges | leaf (0) | 5.5 |
| | level 4 (10) | 4.6 |
| | level 3 (110) | 4.5 |
| | level 2 (1,121) | 4.6 |
| | level 1 (11,442) | 12.3 |
| | root (111,110) | 131 (range 51 to 205) |
| `contains_big`, 1,111,110 edges | level 5 (10) | 12.0 |
| | level 4 (110) | 15.1 |
| | level 3 (1,110) | 19.7 (spikes to 72) |
| | level 2 (11,110) | 13.0 |
| | level 1 (111,110) | 77 |

Reading the numbers: reach dominates above 10k nodes; the predicate size adds roughly 8 to 12 ms per million edges for small reach.
At 100M edges the per-query edge materialization would be about 1.6 GB [I], which exceeds a typical `-m`, so Tier 1 needs a
predicate-size guard and a typed fallback to Tier 2.

### 2.5 Can plain triples in a current graph serve current-basis reachability?

Yes, on these conditions. Each is a requirement on the QLever projection, not a property of the engine.

1. **Ref values must be IRIs equal to the entity subject IRIs.** R2 section 4.2 already says `ref` projects to an IRI. The reified ledger cannot be
   traversed this way because its `entity_id` and `value_string` are plain literals joined through an assertion node
   (`packages/qlever/src/rdf.ts`, `native/NativeContext.ts:94-107`).
2. **The base must satisfy C1**: the current publication's `P`, `V` inside `[validInstant, nextBoundary)`, marker not `MAINTAINING`. The current graph
   holds only edges live at `validInstant`, so there is no edge filter to apply and none is possible inside a property path.
3. **C1's completeness test becomes dynamic.** The set of entities a traversal touches is unknown before it runs. Rule: if the attribute's
   partial or conflicted entity set is empty, the path read is exact; if not, check its intersection with the reached nodes in a second read, or
   take Tier 2. A conflicted cardinality-one entity has no plain triple (C5.4), so a path would stop at it silently.
4. **One query is one snapshot** in QLever, so no marker re-check is needed for a single property-path read. A frontier loop over the current graph
   would need a marker check per round; it is not recommended (section 3.3).
5. **Write the start as a constant and the zero-length case as `BIND ... UNION p+`.** Never emit `p*` with a constant start or any variable-variable path.

### 2.6 What property paths cannot do

| Need | Why not | Use instead |
| --- | --- | --- |
| Edge validity at an arbitrary `V`, `R` or interior `P` | a path element is an IRI or a path of IRIs; no `FILTER` inside | Tier 2 |
| Edges that are reified entities (kind = grant, subject, target) | no join inside a path | one hop of ordinary patterns before or after the path |
| Counting derivations | set semantics by design | local count (section 3.7) or `PathSearch` |
| Conflict-aware traversal of a cardinality-one attribute | conflicted entity has no plain triple | check or Tier 2 |
| Anything on the ledger graph | literal ids | Tier 2 |

### 2.7 `PathSearch`, the other native recursion in 0.6.0

`SERVICE <https://qlever.cs.uni-freiburg.de/pathSearch/>` evaluates `allPaths` over **any `SELECT` as the edge relation**
(`PathSearch.h:18,134-175`, `PathQuery.cpp:addParameter`, `QueryPlanner.cpp:3273-3300`) [S]. This is the only way inside QLever to
traverse edges that carry temporal filters. Source and target may be literals; I used `"t1/111"` [P].

| Property | Evidence |
| --- | --- |
| Semantics: all simple paths; one output row per (path, edge) | `PathSearch.cpp:332-400` [S]; counts below [P] |
| Exact reach at a basis through a ledger edge subquery | 3 starts at P=1000, V=200: reach 105, 830, 8,616 equal the oracle; 87 to 237 ms [P `q/out/p3.out`] |
| Exact simple-path counts | root of the diamond DAG, P=1200: 71,074 paths, 2,715 nodes with several paths, per-end counts equal an independent DP, 346,541 rows, 1.66 s [P `q/out/p9.out`] |
| Fixture supports | WL20: reachable flag and path counts 2, 1, 0 match `expected_rows` [P `q/out/p1.out`] |
| Cost estimate is the constant 1000 (`PathSearch.cpp:getCostEstimate`) | the planner cannot reason about it [S] |
| Whole result materialized; row count is the sum of path lengths | cyclic ring, `numPathsPerTarget 1`, no `maxDepth`: memory error at `-m 700M`; with `maxDepth 4` it returned 120 of 18,867 reachable nodes because the first DFS arrival blocks shorter alternatives [P `q/out/p8.out`] |
| Cooperative cancellation | `checkCancellation()` per stack pop (`PathSearch.cpp:359`) [S] |

Verdict: exact and fast on hierarchy-shaped graphs (no `maxDepth` with `numPathsPerTarget 1`; bound the work with `timeout` and memory),
unsafe as a general default on cyclic graphs. Evaluate it as a rival to the frontier loop for QLever Tier 2 and for supports counting.

**Confidence: High** for engine behavior stated with source lines and probes; **Medium** for the 100M-edge extrapolation and the 16 B per
edge figure (inference from the id width, not measured).

---

## 3. Q3: Frontier iteration

### 3.1 The algorithm

```
  seeds S, basis b = (P, R, V), edge attribute set A, direction (forward or reverse)

  reached = {}   expanded = {}   frontier = S   edges = {}
  while frontier not empty:
      if rounds == maxRounds:  fail RecursionBudgetExceeded(rounds)
      for chunk in split(frontier, batch):               # one read per chunk, frontier is ONE parameter
          rows = read( SELECT DISTINCT src, dst  FROM edges_live_at(b, A)  WHERE src IN chunk )
          edges += rows;  reached += dst(rows)
      expanded += frontier
      if |reached| > maxVisited or |edges| > maxEdges:  fail RecursionBudgetExceeded(visited|edges)
      frontier = reached - expanded                       # cycles end here
  return reached, edges, per-round stats
```

This is semi-naive evaluation: each round joins only the new nodes (the delta) with the edge relation, and `expanded` plays the role of the full relation.

### 3.2 Round counts

| Graph | Rounds |
| --- | --- |
| Fixture | 1 to 3 (section 1.2) |
| Layered tree, fanout 10, depth 5 (111,111 nodes), root start | 6 |
| Same tree, level-3 start (110 reached) | 3 |
| Random 3-out-regular graph with 20,000 nodes (giant SCC) | about log base 3 of N, roughly 10 [I] |
| Hierarchies in permission and containment domains | typically 3 to 8 [I] |

Cycles terminate because only `reached - expanded` is re-queried: WL15 `dependency-set` (cycle Y<->Z plus diamond) ran rounds `[(1,2), (2,2), (1,1)]` as (frontier, edges returned) and stopped
because Z's edge back to Y points at an already expanded node [P]. A start whose out-degree is zero costs one round.

### 3.3 QLever: `VALUES` rounds

**Parameter shape**: one `VALUES ?s { ... }` block in the POST body. Request bodies up to 1 GB are accepted (R2 section 6.3) and 100,000 IRIs (2.09 MB) worked in a single query [P].

Per-round cost, IRIs, current graph (T2 predicate, 1.11M edges, cache cleared) [P `q/out/p2.out` section 4]:

| Frontier entries | Median ms | Rows returned |
| --- | --- | --- |
| 1 | 4.9 | 10 |
| 10 | 7.5 | 100 |
| 100 | 16.8 | 1,000 |
| 1,000 | 52.9 | 10,000 |
| 10,000 | 188 | 100,000 |
| 50,000 | 715 | 500,000 |
| 100,000 | 1,490 | 1,000,000 |

Approximately 6 ms fixed plus 15 µs per frontier entry (including ten result rows each). No size failed.

**Literal ids are the trap.** Planning a `VALUES` of plain string literals costs 0.23 to 0.25 ms per literal; the same count as IRIs is about 100 times cheaper [P `q/out/p6.out`]:

| k | literals, planning ms | IRIs, planning ms |
| --- | --- | --- |
| 10 | 4 to 5 | 0 |
| 100 | 23 to 36 | 0 |
| 1,000 | 224 to 316 | 1 to 7 |
| 5,000 | about 1,150 (wall) | 7 to 10 (wall 51 to 59) |

The server log shows 245 to 270 ms of planning against 31 ms of execution for the 1,000-literal ledger chunk, and `FILTER(?s IN (...))` over an
`entity_id` scan avoids the lookup (28 ms for 1,000 literals) but scans the predicate, which is O(ledger). My explanation is the ICU
vocabulary comparator used for each literal lookup [I]. The effect on a real ledger frontier:

| Basis | Entity ids as literals | Entity ids as IRIs |
| --- | --- | --- |
| P=1000, V=200, reach 8,616, 5 rounds | 3,202 ms | **282 ms** |
| root start, reach about 69k (literal run P=1200, reach 68,250; IRI run P=1000, reach 69,224) | 21,337 ms | **2,020 ms** |
| small rounds (frontier 1 to 100) | 7 to 40 ms | 5 to 12 ms |

**Requirement for the compact ledger (EXP-Q01) and the current graph: entity ids are IRIs.** This also lets one id space serve the current graph and the ledger.

Frontier over the **current graph** (no temporal filter) for comparison: reach 11,442 in 175 ms, reach 1,121 in 41 ms, reach 111,110 in 2.79 s (the last
round is 100 chunks of 1,000 leaves, 1.76 s). That is 9 to 21 times slower than one property path for the same answer (12 ms, 4.6 ms and 131 ms), which is the argument for Tier 1.

### 3.4 XTDB: SQL rounds

**Parameter shape**: one `text[]` parameter, typed OID 1009. Array parameters are decoded by the server (`PgTypes.kt:157`, `readBinaryTextArray`). A single parameter of 111,000 ids (1.2 MB)
ran in 409 ms [P `x/p5.out`].

**Engine bug (silent wrong result).** In XTDB 2.2.0, `entity_id = ANY(<array>)` combined by `AND` with another predicate **placed after it** returns zero
rows or a wrong count. Probe on 333,445 rows [P `x/p3.out`]:

| Query | Result | Correct |
| --- | --- | --- |
| `WHERE entity_id = ANY($1)` | 48 | yes |
| `WHERE entity_id = ANY($1) AND attribute = 'contains'` | **0** | no, expected 40 |
| `WHERE attribute = 'contains' AND entity_id = ANY($1)` | 40 | yes |
| `WHERE entity_id = ANY($1) AND recorded_position <= $2` | **0 rows** | no |
| `WHERE entity_id = ANY(ARRAY['t1/0','t1/1']) AND attribute = 'contains'` (literal array) | **0** | no |
| `WHERE _id = ANY($1) AND name LIKE 'node%'` on an `_id` | **0**, expected 4 | no |
| `WHERE entity_id IN (SELECT x FROM UNNEST($1) AS u(x)) AND ...` | correct in every case | yes |

The quantified comparison compiles to an `apply-mark-join` (`sql.clj:2210-2232`, `visitQuantifiedComparisonExpr`) [S]; I did not isolate the cause. Rule for
the XTDB lane and for R7 and R12: **use `IN (SELECT x FROM UNNEST($1) AS u(x))`, never `= ANY`.** It returned correct rows in every probe.

Per-round cost on the **ledger table** (333,445 rows: 111,223 edge rows plus 222,222 noise rows; basis P=1000, V=200), median of 3 [P `x/p2.out`, `x/p4.out`]:

| Frontier k | `IN (SELECT UNNEST)` | `JOIN UNNEST` | literal `IN (...)` | XTQL `rel` |
| --- | --- | --- | --- | --- |
| 1 | 15 ms | 503 ms | 74 ms | 615 ms |
| 10 | 37 ms | 294 ms | 92 ms | 280 ms |
| 98 | 266 ms | 323 ms | 405 ms | 287 ms |
| 956 | 331 ms | 330 ms | 318 ms | 341 ms |

`EXPLAIN ANALYZE`: the `IN` form is a semi-join that prunes pages for small k (k=100: 249 of 1,024 pages pruned); the join forms read all 333,445 rows
(`x/p2.out` "SCAN" lines). A bare `COUNT(*)` scan took 235 ms. The cost is linear in ledger rows at about 0.7 to 1.0 µs per row on this container, so a
100M-row ledger would cost roughly 70 to 100 s per round [I, linear extrapolation, one table shape]. This matches R1's 0.27 s per million rows for a
single column (`R1:355-445`).

Per-round cost on an **entity-keyed table** (`_id` = entity id, `kids text[]`, 111,111 rows), median of 3 [P `x/p2.out`]:

| Frontier k | `IN (SELECT UNNEST)` | `_id = ANY` alone | literal `IN` | `JOIN UNNEST` | XTQL `rel` |
| --- | --- | --- | --- | --- | --- |
| 1 | 7 ms | 3 ms | 2 ms | 137 ms | 173 ms |
| 10 | 5 ms | 7 ms | 4 ms | 122 ms | 119 ms |
| 100 | 22 ms | 24 ms | 24 ms | 72 ms | 120 ms |
| 1,000 | 102 ms | 109 ms | 95 ms | 92 ms | 122 ms |
| 9,265 | 142 ms | 284 ms | not run | 139 ms | not run |

Whole-task cost, exact against the oracle in every row [P `x/p4.out`]:

| Method | Reach | Rounds | Total |
| --- | --- | --- | --- |
| Ledger, `IN` form, P=1000 V=200 | 101 | 3 | 344 ms |
| Ledger, `IN` form, P=1000 V=200 | 829 | 4 | 625 ms |
| Ledger, `IN` form, P=1200 V=200 | 824 | 4 | 490 ms |
| Ledger, `IN` form, P=600 V=100 | 175 | 4 | 240 ms |
| Ledger, `IN` form, P=300 V=0 | 64 | 5 | 209 ms |
| Ledger, `JOIN` form, same bases | 64 to 829 | 3 to 5 | 0.96 to 1.64 s |
| Entity table, no temporal filter | 1,110 | 4 | 134 ms |
| Entity table, no temporal filter | 11,187 | 5 | 849 ms |
| Entity table, root, batch 1,000 | 111,110 | 6 | 5.48 s (the last round is 100 calls for leaves) |

With native valid time on a versioned entity table (20,000 entities, 200 second versions from 2020, `FOR VALID_TIME AS OF`), the SQL frontier was exact at
`V = 2019-06-01` and `V = 2021-06-01` for reach 1,110 / 10,006 and 1,090 / 9,845, with rounds of 4 to 110 ms [P `x/p6.out`].

**Batch size**: use large batches on XTDB. A 100,000-leaf round costs 47 ms per 1,000 ids (4.7 s total) but a single 111,000-id parameter took 409 ms, so batches of 10,000 to 50,000 fit.

### 3.5 XTQL rounds

- The frontier must be **one structured parameter**. The repo wraps XTQL as `(fn [triplex_param_1 ... triplex_param_n] ...)` (`Sources.ts:120-126`), and a 100-parameter OR-chain failed
  with `Syntax error compiling reify*` [P `x/p6.out`]. The cause is probably Clojure's limit of 20 positional `fn` parameters [I]; the threshold was not probed.
- `rel` with a transit-typed parameter (OID 16384) works: `(unify (rel fr [{:x x}]) (from :t {:bind [{:_id x} kids] :for-valid-time (at t)}))`. Cost on the 20,000-entity table: 17.5 ms at k=100
  and 76 ms at k=1,000 against 7.7 and 12.6 ms for the SQL `IN` form; on the 111,111-row table: 120 ms flat. The join form scans the whole table
  (`EXPLAIN ANALYZE`: 111,111 rows read), so the XTQL round grows with table size, an estimated 10 s at 10M entities [I].
- An `_id` OR-chain of 10 parameters pushed the `_id` into the scan (4 ms; `pagesUsed 10`, `rowsRead 3161`), consistent with `scan.clj:167-180`, which narrows the scan only for `(== _id v)` and
  `(or (== _id v) ...)` [S]. Batches of at most about 19 ids would need many calls.
- Point lookups in XTQL cost the same as SQL (2 ms) [P].

Consequence: a scalable XTQL frontier needs an engine-side improvement (IID pushdown for `rel` joins or a structured `in`), or R12 finds a form I did not try. Until then,
XTQL frontier rounds are exact but scale with table size. `union-all` and window functions stay unusable (R1).

### 3.6 Why not run the closure inside the engine on XTDB

`WITH RECURSIVE` is rejected at `sql.clj:264-265`, and my grep over `core/src/main` finds no fixpoint, transitive or recursive operator in `xtql.clj`, the logical plan or the grammar except the `RECURSIVE` token
(`Sql.g4:695`) [S]. The current scratch method works but costs one `COMMIT SYNC` per round: 205 to 408 ms per round (seed included) on a graph of 1,122 edge rows [P], against 5 to 10 ms for an equivalent frontier round on an entity-keyed table.

### 3.7 Supports and derivation counts, exactly

Definition used by the oracle: the number of **simple paths** (node sequences without a repeated node) from origin to target (`event_oracles.py:339-361`). Equal duplicate assertions are
one edge, not several (C5.1; the oracle's edge set deduplicates), so each round selects `DISTINCT (src, dst)`.

Procedure: run the frontier closure from the origin; it has already fetched every out-edge of every reachable node, so the **reachable subgraph is in TypeScript memory**.

1. Count simple paths with a DFS on that subgraph under a step budget `maxPathSteps`. This is the oracle's algorithm and is exact for any graph, cyclic or not.
2. If the subgraph is acyclic (detectable locally), count with a memoized DP in O(V+E) using BigInt, with no step budget needed.
3. The layered walk count `W[l+1][v] = sum W[l][u]` is exact only for a DAG; if the frontier is still non-empty after `|reached|` rounds, a cycle exists and walk counts diverge, so use step 1.

Verified: the three WL20 cases returned `(True, 2)`, `(True, 1)`, `(False, 0)` on the ledger frontier, equal to `expected_rows` [P `q/out/p1.out`]. QLever `PathSearch` gave the same counts
and the 71,074-path root count equal to an independent DP (section 2.7).

### 3.8 Consistency across rounds

- Every round carries the full basis in its predicates (position, retraction position, valid interval, optional recorded time). The ledger is append-only: a retraction writes
  `retracted_position` on the original row and is masked by `retracted_position <= P` (`Sources.ts:56-90`). A write with a position above `P` cannot change any round's answer.
  So the rounds are equivalent to one read at the basis even when writers commit between rounds.
- The basis must be fixed **once per task**, not per call. R6 finding 1 says the XTDB native task library re-reads `tx_meta` in every call (`NativeQueries.ts:68-86`); the helper must take the
  position once and pass it to every round.
- Recorded timestamps are not monotonic in commit order (NOTEBOOK, Codex round 3), so explicit `R` stays on the exact path and the filters stay `recorded_at <= R` plus `recorded_position <= P`.

**Confidence: High** for exactness (17 of 17 fixture cases on two methods, 5 synthetic bases per method, valid time on XTDB at 2 instants) and for the QLever and XTDB per-round timings on this
container. **Medium** for scale extrapolations. **Low** for XTQL at scale (one table shape, 20k and 111k rows).

---

## 4. Q4: Other read-only options

### 4.1 XTQL features that could express bounded recursion

None for unbounded recursion (section 3.6). Two bounded forms exist.

- **Fixed-hop unroll with a fixpoint certificate.** One SQL statement `UNION`s k self-joins. Let `R_k` be the nodes reached within k hops. If `R_(k+1) = R_k`, then `R_k` is the closure; otherwise
  continue from the frontier. This is the frontier loop with k hops per round, with a rule for the next frontier: `hop-k endpoints - expanded`. It cuts rounds by a factor k but each hop is a join of the edge
  relation with itself, which on XTDB reads the ledger k times (the join forms above read all rows), so it helps only on QLever IRI relations or small tables.
- **Fixed shallow depth** is what `reachability_supports` does today (lengths 1 to 3). It is acceptable only where the depth is a domain constant.

XTQL `unify` can express k self-joins; `union-all` cannot be planned (R1 Q4), so the hops would be separate statements.

### 4.2 Pre-maintained structures written by the write path

| Structure | What it buys | Cost | Verdict |
| --- | --- | --- | --- |
| **Edge index table keyed by source** (XTDB: `_id` = scope + attribute + source, array of edge structs with temporal columns) | makes Tier 2 on XTDB a point lookup per round, exact at any basis | one read-modify-write per touched (source, attribute) per commit; array replace not append (`array_append` unknown, `\|\|` failed at commit, R7 `arrfn.out`); hot sources need bucketing; CAS through the index (plan Track 4) | required for XTDB Tier 2 beyond about 1M ledger rows per scope |
| **Reverse edge table keyed by target** | reverse closure (vulnerable to ancestors, WL15) | same as above | needed only for reverse-direction tasks |
| **Closure table** (all pairs, with intervals) | one lookup per task | size O(sum of reach) (543,210 pairs for the 111k tree edges alone); update cost O(ancestors(u) x descendants(v)) per edge change; deletion needs support counts or DRed [W-: Gupta, Mumick, Subrahmanian, SIGMOD 1993]; each pair carries the intersection of bitemporal intervals along its derivations, which multiplies rows by history and corrections (WL14, WL20 retractions) | not recommended by default; consider for one measured hot path |
| **QLever materialized view** (`MaterializedViewQuery`, `QueryPlanner.cpp` magic IRI) | server-side stored query result | built through an admin write, so it belongs to the broker (C3), not to reads | out of scope; mention only |
| **Repo `MaintainedQueries`** (`complete-generation-rebuild`) | cached Datalog generations | rebuilds the whole generation on source change; the code states incremental recursive maintenance is unqualified (`MaintainedQueries.ts:40-43`) | write-path object that currently runs inside a query call; see section 6.9 |

The ledger rows stay the source of truth in every case, so a maintained structure is a cache that the write path updates in the same engine transaction (XTDB) or the same update operation (QLever, C2).

**Confidence: Medium.** The cost model is analytical; only the array-append limitation and the `_id`-scan behavior are measured.

---

## 5. Q5: Prior art and the cost models it uses

| Source | What it says | What we take | Read |
| --- | --- | --- | --- |
| W3C SPARQL 1.1 Query, sections 9.4 and 18.4 | `ALP(x, path)` keeps a visited set `V`; results are sets, no duplicates; `*` with both variables ranges over all nodes of the graph | set semantics; cycles end through the visited set; our `expanded` set is `V` | [W] https://www.w3.org/TR/sparql11-query/ |
| Arenas, Conca, Pérez, WWW 2012, "Counting beyond a Yottabyte" | counting-based path semantics is #P-hard, which is why the final standard uses set semantics for `*` and `+` | do not ask a property path for path counts; count locally or enumerate with `PathSearch` | [W-] https://marceloarenas.cl/publications/www12a.pdf (search snippet) |
| Losemann and Martens, PODS 2012 | evaluation of `p{m,n}` with counting is very expensive | bounded depth must be a budget, not a semantic feature | [W-] second-hand via the W3C mail above |
| QLever source, `TransitivePath*`, `PathSearch` | DFS per start, edge relation materialized, cost estimates 1000 for bound and 10,000 x edges for var-var | cost model: O(edges of predicate) + O(reach) per bound-start query | [S] section 2 |
| Bancilhon and Ramakrishnan, SIGMOD 1986, "An amateur's introduction to recursive query processing strategies" | naive evaluation re-derives everything each round; semi-naive joins only the delta | frontier loop is semi-naive, with total work O(output) plus per-round overhead | [W-] recalled |
| Soufflé and surveys, e.g. arXiv 1812.03975 | rules read the delta and write a new relation; the loop stops when the new relation is empty; recursion is a fixpoint of phases | the same phases as section 3.1 | [W-] https://arxiv.org/pdf/1812.03975 (search snippet) |
| DataScript `solve-rule`, `references/datascript @ 34915cf` `src/datascript/query.cljc:645-700` | top-down unfolding of rule branches with call-argument guards (`-differ?`) that cut a branch when the same arguments repeat, and empty-relation pruning | shows the alternative: re-evaluating the prefix per branch, exponential on diamonds; we avoid it | [S] |
| Datomic query reference, rules | rules are lists of clauses; the page does not describe recursive evaluation or limits | no cost model to borrow | [W] https://docs.datomic.com/query/query-data-reference.html |
| DBSP, Budiu et al., VLDB 2023 | incremental view maintenance with recursion as a feedback loop around `distinct`; cost proportional to the change | the model for a maintained closure (section 4.2) and for WL20's "maintained view equals recomputation" | [W-] https://arxiv.org/abs/2203.16684 |
| Materialize `WITH MUTUALLY RECURSIVE` | iterates to a fixpoint; `ERROR AT RECURSION LIMIT n` fails instead of returning a partial result | our `maxRounds` with a typed error and no partial answer | [W] https://materialize.com/docs/sql/select/recursive-ctes/ |
| PostgreSQL `WITH RECURSIVE` (page fetch failed) | working-table iteration; `UNION` removes duplicates and so terminates on cycles; `UNION ALL` does not | our `expanded` set is `UNION` semantics | [W-] recalled, not re-opened |
| FedX bound joins, Schwarte et al., ISWC 2011 | ship batches of bindings to a remote endpoint in one subquery; RDF4J's block size defaults to 15 and falls back to the naive form if the `VALUES` form fails | batching the frontier is standard; our batch is larger because QLever and XTDB accept megabyte bodies | [W-] https://doi.org/10.1007/978-3-642-25073-6_38; RDF4J FedXConfig javadoc [W] |
| Franklin, Jónsson, Kossmann, SIGMOD 1996 | data shipping, query shipping, and hybrid shipping; neither pure policy wins everywhere | the frontier loop is hybrid shipping: bindings go to the server, edges come back, the fixpoint runs at the client; a property path is query shipping | [W-] https://db.in.tum.de/research/publications/conferences/sigmod96.pdf (search snippet) |

Cost model summary for our case, with R rounds, F_r the frontier at round r, c the fixed per-round overhead and u the per-entry cost:

```
  frontier loop      T = sum over r of ( c + u * F_r )  + transfer(edges)       (measured c = 5 to 10 ms on QLever IRIs and XTDB _id tables, u = 15 to 100 us)
  property path      T = c' + a * |E_p| + b * reach                              (measured c' = 4 ms, a = 8 to 12 ms per 1M edges, b = 1 to 2 us)
  ledger scan round  T = c + s * |ledger|                                        (XTDB, s = 0.7 to 1.0 us per row)
```

**Confidence: Medium.** I opened the W3C page, Materialize docs and the Datomic page; the other rows rest on search snippets or memory, marked [W-].

---

## 6. Recommended C8 design

### 6.1 Decision flow per native recursive read

```
   native read with recursion, basis b = (P, R, V) taken ONCE for the task
                    |
         C1 eligible for the projection?  (scope, mapping, R, P, V window, completeness)
            |                                   |
           yes                                  no
            |                                   |
   Lane Q: property path over               exact ledger path in the same native language:
           the current graph                Lane Q: frontier over ledger relations (IRI ids)
   Lane X: frontier over                    Lane X: frontier over ledger (<= ~1M rows/scope)
           entity-keyed tables                       or over the write-path edge index
                    \                               /
                     +--- same helper, same budgets, same typed errors, same oracle ---+
```

### 6.2 Shared helper `frontierClosure` (new, one implementation for both lanes)

Inputs: `seeds`, `direction`, `edges(batch) -> rows of (src, dst)` supplied by the lane, `budgets`. Outputs: `reached`, `edges`, per-round stats `{frontier, rows, calls, ms}`.

| Budget | Default | Typed error | Reason |
| --- | --- | --- | --- |
| `maxRounds` | 64 | `RecursionBudgetExceeded{kind: rounds}` | hierarchies are 3 to 8 deep; today 100 |
| `maxVisited` (distinct reached nodes) | 100,000 | `{kind: visited}` | same constant as today's `maxRecursiveRows`, now counting nodes, not pairs |
| `maxEdges` (extracted subgraph, needed for supports) | 1,000,000 | `{kind: edges}` | bounds client memory |
| `maxBatch` | QLever 1,000 IRIs; XTDB 10,000 ids | none | measured knees (sections 3.3, 3.4) |
| `maxRoundRows` | 1,000,000 | `{kind: roundRows}` | `LIMIT maxRoundRows + 1` detects overflow without a partial answer |
| `timeoutMs` | 30,000 for the task | existing timeout error | one `AbortSignal` for all rounds; the remaining time is passed to each read |
| `maxPathSteps` (supports only) | 10,000,000 | `{kind: pathSteps}` | bounds the local DFS |

All budget failures return no partial answer, like today. The answer and the statistics are returned together so receipts can bind rounds, rows and bytes per round
(`NativeQueryStep` already carries phase, language, query, parameters, elapsedMs).

### 6.3 Lane Q (QLever)

**Tier 1, property path.** Tasks 11, 13, 14, 15 (closure and vulnerable) and 20 (closure) on a C1-eligible basis, with cardinality-one attributes checked per section 2.5.

- Shape: `GRAPH <current> { { BIND(<s> AS ?n) } UNION { <s> <attr>+ ?n } ... }`; multiple edge attributes as `(<a>|<b>)+`; depth cap through `{1,n}`; always `LIMIT maxRows+1` and the `timeout` parameter.
- Forbidden: a path whose two ends are both unbound and not bound by a join or `VALUES` (the multi-source WL15 form `?app deployed_in <env> . ?app dep+ ?d` is allowed because the join binds the start; it passed [P]), `*` or `?` with a constant start, any path over the ledger graph.
- Guard: before the query, read the predicate's edge count (cached `COUNT`); above `maxPredicateEdges` (initially 5,000,000, about 80 MB of edge ids) take Tier 2, and map a memory error from the engine to the same fallback.
- Cost expectation per task: 4 to 15 ms for reach up to 11k; 50 to 200 ms for reach 111k; +8 to 12 ms per million edges of the predicate [P].
- Exactness: set semantics with a visited set (W3C `ALP`), cycles safe, no duplicates [P: diamond gives 3 rows], explicit zero length, snapshot isolation of one query, and a differential test against Tier 2 and the oracle.

**Tier 2, frontier over ledger relations.**

- Preconditions in the compact ledger (EXP-Q01) and C7: **entity id and ref value are IRIs**; `entity_id` lookup is by `VALUES` of IRIs.
- Round query: `VALUES ?s {...}` joined to the assertion nodes by entity, the attribute filter, and the four temporal filters (`recorded_position`, `retracted_position`, `valid_from`, `valid_to`) with the optional recorded-time pair when `R` is present.
- Cost expectation per round: 5 to 12 ms for frontier up to 100; 60 ms at 845; 196 ms at 7,669; about 25 µs per entry on large rounds. Per task: reach 100: 20 to 50 ms; reach 8.6k: 0.28 s; reach 69k: 2.0 s [P].
- Rival, not default: `PathSearch` over the same subquery (reach 830: 130 ms; reach 8.6k: 215 to 237 ms; root 69k: 1.6 s, exact counts). Adopt only if the EXP shows a cycle-safe guard.

**Tasks that need supports** (20 `reachability_supports`): Tier 2 frontier plus the local count of section 3.7, or `PathSearch` when the rival is accepted.

### 6.4 Lane X (XTDB)

**Tier 1, entity-keyed projection tables** (plan section 3.2: `_id` = entity id, native valid time).

- Forward round: `SELECT e._id, c FROM <type> FOR VALID_TIME AS OF <V> e, UNNEST(e.<attr>) AS u(c) WHERE e._id IN (SELECT x FROM UNNEST($1) AS u2(x))` with the frontier as one `text[]` parameter. The system-time cut, when the task has one, follows H-X-CUT.
- Reverse round (WL15 vulnerable deployments): a reverse-reference table keyed by target, as already hypothesized in plan section 3.2 point 1.
- Cost expectation per round: 3 to 7 ms for frontier up to 10; 22 ms at 100; about 100 ms at 1,000; 140 ms at 9,265. Per task: reach 110: about 45 ms; 1,110: 90 to 135 ms; 11k: 0.75 to 0.85 s; 111k: 5.5 s with 1,000-id batches and, by the batch measurements, about 1 to 1.5 s with 10,000-id batches [I].
- The valid-time behavior was exact at two instants on 20,000 versioned entities [P].

**Tier 2, exact path.**

- Small scopes (at most about 1M ledger rows): the frontier over `tx_assertions` with the `IN (SELECT UNNEST)` form and `facts()` predicates. Per round 15 to 330 ms; per task 0.2 to 0.6 s at 333k rows [P].
- Larger scopes: **requires the write-path edge index** of section 4.2. Without it a round costs one ledger scan, 70 to 100 s per round at 100M rows [I]. The helper should refuse early with `RecursionUnsupportedAtScale` when the scope's ledger row count exceeds `maxLedgerScanRows` and no index exists, instead of waiting for the timeout.

**XTQL.** Rounds use one transit `rel` parameter (section 3.5). Per round 17 to 76 ms on a 20k-entity table and about 120 ms on 111k entities; the cost scales with table size until an `_id` pushdown form exists. The XTQL tally for recursion tasks should be reported separately and flagged as scale-limited.

### 6.5 Exactness argument

1. **Definition.** For a basis `b` and attribute set `A`, `E_b` is the set of distinct `(u, v)` such that some assertion on an attribute in `A` is live at `b` with ref value `v` on entity `u`. The task answer is a function of `R+(S)`, the positive-length reachability of the seeds over `E_b`, plus joins that read the same `b`.
2. **Invariant.** After round r, `reached` contains every node at hop distance 1..r from `S`, and `expanded` contains every node at distance 0..r-1. The next frontier is `reached - expanded`.
3. **Termination and completeness.** Nodes are finite, `expanded` grows by at least one node per round unless the frontier is empty, so the loop ends in at most `|R+(S)|+1` rounds. When the frontier is empty, every reached node has been expanded, so `reached = R+(S)`. Budgets stop the loop with an error; they never truncate it.
4. **Basis stability.** Each round's predicates contain `b`; the ledger is append-only and a retraction is a column with its own position (section 3.8), so concurrent commits cannot change `E_b`.
5. **Duplicates.** Every round selects `DISTINCT (src, dst)`, so equal duplicate assertions are one edge (C5.1) and the answer does not depend on assertion multiplicity.
6. **Zero length.** The origin is added explicitly in the tasks that need it (11, 14), never through `*`.
7. **Conflicts (C5).** For a cardinality-one attribute (for example `parent`), each round also checks that no frontier node has two distinct live targets; if one does, the read fails with `ConflictingValuesError` naming the entity and attribute. Cardinality-many attributes (`member_of`, `contains`, `depends_on`) have no conflict by definition.
8. **Tier agreement.** Tier 1 and Tier 2 compute the same `R+(S)` by different mechanisms; a differential test in the gate proves it on the fixture and on generated graphs (section 6.7).

### 6.6 Expected cost, per round and per task

| Lane / tier | Per round | Per task (reach) | Scales with | Evidence |
| --- | --- | --- | --- | --- |
| Q Tier 1 property path | none (one query) | 4 to 15 ms (up to 11k); 50 to 200 ms (111k) | predicate edges (8 to 12 ms per million) and reach | section 2.4 [P] |
| Q Tier 2 frontier, IRI ledger | 5 to 12 ms (F up to 100); about 25 µs per entry above 1k | 20 to 50 ms (100); 0.28 s (8.6k); 2.0 s (69k) | frontier size | section 3.3 [P] |
| Q Tier 2 frontier, literal ledger | 0.25 ms per entry | 3.2 s (8.6k); 21 s (68k) | frontier size | section 3.3 [P]; do not build |
| X Tier 1 entity tables, SQL | 3 to 7 ms (F up to 10); 22 ms (100); about 100 ms (1k) | 45 ms (110); 90 to 135 ms (1.1k); 0.8 s (11k); 5.5 s (111k, 1k batches) | frontier size | section 3.4 [P] |
| X Tier 1 entity tables, XTQL | 17 to 76 ms (20k entities); about 120 ms (111k) | not measured end to end | table size | section 3.5 [P] |
| X Tier 2 ledger scan | 15 to 330 ms at 333k rows | 0.2 to 0.6 s (reach 64 to 829) | ledger rows (0.7 to 1.0 µs per row) | section 3.4 [P]; scale [I] |
| Current XTDB scratch method | 205 to 410 ms per round, any size | 1.2 s at 1,122 edge rows; fails above 100k pairs | write commits | section 1.5 [P] |

### 6.7 Qualification, as additions to G2 to G4

1. **G2 re-run** for the 14 closure cases and 3 supports cases on both lanes with Tier 1 and Tier 2 forced separately; each must equal `expected_rows`.
2. **Read-only proof (new check).** Before and after every recursive task, compare an engine state fingerprint: QLever `?cmd=stats` plus a count of triples per graph; XTDB the latest `tx_meta` position and the table list from `information_schema`. A negative control replaces the helper with the old materializer and must fail the check.
3. **Differential and mutation controls (G3/G4).** 100 generated graphs per lane (cycles, diamonds, retractions after `P`, edges expiring before and after `V`, corrections) at random bases; Tier 1, Tier 2 and the Python oracle must agree. Mutation controls: drop one edge, ignore `retracted_position`, treat a `valid_to` as inclusive, forget the visited set. Each mutation must fail a case.
4. **Semantic counterexamples with original expected answers** (G4): absent-constant zero length; cycle returning the origin; diamond duplicates; late retraction (an edge retired at `P' > P` still shows at `P`); a correction that removes an edge retroactively (WL14).
5. **Writer between rounds.** Commit a new edge between two rounds of a running traversal; the result must equal the answer at the original `P` (the XTDB library lacks this test today, R6 finding 1).
6. **Scale rung (G6).** The generator in `q/gen.py` (layered tree, fanout 10, depth 5 and 6, diamonds, giant SCC ring) as a fixed synthetic recursion population; report p50 and p99 per tier.
7. **Cancellation.** Abort mid-traversal and assert the engines run no leftover work: QLever `timeout` ends the query within about 10 ms of the deadline [P]; XTDB cancellation per R1 and `native-cancellation-and-connection-reuse`.

### 6.8 Changes this design asks of other contracts

| Where | Change | Why |
| --- | --- | --- |
| C7 / projection spec (EXP-R01, EXP-Q01) | ref-typed attributes emit IRI objects equal to the entity subject IRI; ledger `entity_id` and `value_*` for refs are IRIs | property paths and 100x cheaper `VALUES` planning |
| C1 | completeness for traversals is evaluated against the reached set, not only the query's literal attributes | the touched entities are unknown before the traversal |
| C8 | add: one basis per task; budgets and typed errors of section 6.2; Tier 1 forbids variable-variable paths | exactness and bounded cost |
| Plan Track 3, XTDB | edge index table (forward, and reverse where a task needs it) is part of the projection if Tier 2 must scale | the ledger scan per round is linear in rows |
| R7, R12 | never use `= ANY(array)` followed by another predicate; note the `fn` arity limit for XTQL | engine bug and compile error |

### 6.9 Scope gaps to decide

- **Datalog `rules` path** in both lanes (`xtdb/src/query/recursion.ts`, `qlever/src/recursion.ts`) writes scratch relations from a read. C8 says "native reads". Either extend C8 to cover it with the same helper
  (the rules are binary and `maxDepth`-bounded, so they map onto `frontierClosure`) or record it as a named exemption.
- **`makeXtdbMaintainedQueries`** writes `tx_query_generations` inside `query()`. It is a write-path cache wearing a read API; decide whether it stays outside the read contract.

### 6.10 What I would not do

- Keep a second scratch-based fallback "just in case"; it brings back the mutator class C8 removes.
- Make `PathSearch` the default before it has a cycle guard.
- Put the closure in a maintained table before a measured hot path asks for it.

---

## 7. Probe record, limits, open items

### 7.1 What ran

| Item | Setting |
| --- | --- |
| Container | `tx2-probe-r10`, `--memory 1536m --cpus 1`, removed after each use; QLever on `127.0.0.1:7063` mapped (scripts ran inside the container), XTDB on `127.0.0.1:5465`; `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` |
| QLever | image `adfreiburg/qlever:0.6.0@sha256:37d5ede1...`, `qlever-server -j 4 -m 700M -c 64M -e 32M --no-patterns --no-access-check`; index of 1,960,940 quads built with `-m 128M -s {"num-triples-per-batch":200000}` because the default 10M batch was OOM-killed at 1.5 GiB |
| XTDB | `ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a42650...`, `-Xmx560m -XX:MaxDirectMemorySize=512m`, local log and storage |
| Data | layered trees, diamonds, ring graph, ledger-shaped assertions, workload fixtures (`q/gen.py`, `x/gen.mjs`, seed 20261107) |
| Nothing else touched | no `/Users/sam/projects/triplex-db`, no ports 15442 or 17019, no repo source edits, no personal data in web requests, no authenticated `gh` |

### 7.2 Files (all under `/Users/sam/Claude/Projects/triplex-db-2/R10-recursion-probes/`)

| File | Content |
| --- | --- |
| `q/p1_semantics_fixtures.py`, `q/out/p1.out` | path semantics (16 checks) and 17 fixture cases, property path vs frontier vs expected rows |
| `q/p2_perf.py`, `q/out/p2.out` | property path vs frontier timings, `VALUES` size sweep |
| `q/p3_pathsearch.py`, `q/p8_pathsearch_more.py`, `q/p9_pathcount_root.py`, `q/out/p3.out`, `p8.out`, `p9.out` | `PathSearch` exactness, counts, cycles |
| `q/p4_limits.py`, `q/out/p4.out`, `q/out/p4b_memory_limit_adhoc.txt` | timeouts, memory limit, health after failure |
| `q/p5_ledger_shapes.py`, `q/p6_values_cost.py`, `q/p7_ledger_iri.py`, `q/out/p5.out`, `p6.out`, `p7.out` | ledger query shapes, literal vs IRI `VALUES`, IRI ledger BFS |
| `q/fixture_sizes.py`, `q/out/fixture_sizes.out` | graph sizes per fixture case |
| `x/p1_load.mjs` | XTDB tables `r10_a` (333,445 rows), `r10_ent`, `r10_rev`, `r10_small` |
| `x/p2_rounds.mjs`, `x/p2.out` | round forms; **its `= ANY` BFS rows are invalid because of the bug** |
| `x/p3_any_bug.mjs`, `x/p3.out` | the `ANY` bug and XTQL baselines |
| `x/p4_bfs_scratch.mjs`, `x/p4.out` | exact BFS with correct forms; scratch-method replay |
| `x/p5_param_sizes.mjs`, `x/p5.out` | single-array parameter sizes |
| `x/p6_xtql_validtime.mjs`, `x/p6.out` | native valid time and XTQL forms |

### 7.3 Limits of the evidence

- One CPU and 1.5 GiB. Absolute numbers will improve on the 2 to 3 CPU slots; ratios and linearity are the claim.
- Synthetic graphs: layered trees with 10% diamonds, a random giant SCC. No power-law hubs (a team with 100k members) and no real skew.
- Largest ledger 333k rows on XTDB and 1M ledger triples on QLever; the 10M and 100M figures are extrapolations marked [I].
- XTDB valid time was probed; the system-time cut (H-X-CUT) was not.
- `PathSearch` was exact on every case I ran, but only on hierarchy-shaped and small cyclic data.
- XTDB compaction state of my tables was not controlled; page pruning might differ after compaction (R1 notes blooms only on compacted levels).
- I did not test a WebSocket cancel of a running QLever path query, bounded recursion with `{n,m}` at scale, or reverse-direction rounds on XTDB.

### 7.4 Open items for the orchestrator

1. Decide whether Tier 1 (property path) ships in the first QLever slice or after the frontier loop passes G2 alone. The frontier is the single exact implementation; Tier 1 is roughly a 10x to 25x speed-up on eligible bases (section 3.3).
2. Confirm that entity ids and refs are IRIs in the compact ledger (affects EXP-Q01 and R8's write cost).
3. Decide the XTDB Tier 2 policy: scan budget with early refusal, or the write-path edge index (an R7 question).
4. Decide the scope of C8 for the Datalog `rules` path and `MaintainedQueries` (section 6.9).
5. Pass the `ANY` bug and the XTQL parameter limit to R7 and R12; consider an upstream issue.
