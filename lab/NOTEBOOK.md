# Experiment notebook (append-only)

Each entry: id, lane/track, date, hypothesis, mechanism + pinned inspiration, result class
(PROGRESSED | NO-CHANGE | REGRESSED | FAILED | INCONCLUSIVE), receipts, decision, notes for next generation.
First failures are never edited away; corrections are new entries that reference the old one.

## GEN-0 2026-11-07 Setup
- Imported handoff archive (sha256 d19428bd...) into a fresh repo; commit f1939df.
- Dedicated colima VM `triplex2` created. Side effect found: `colima start` switched the global docker
  context to the new VM; restored to `colima`. Rule recorded in STATE.md.
- Reference repos cloned at pinned SHAs (references/MANIFEST.json).
- Result: PROGRESSED (environment). No engine or gate has run yet.

## GEN-0 2026-11-07 Research wave R1-R6 (Sonnet xhigh): learnings that change direction
Reports: lab/research/R1..R6. Probe outputs: lab/research/R5-probe, lab/research/R4-test-outputs,
~/Claude/Projects/triplex-db-2/R1-xtdb-probes, ~/Claude/Projects/triplex-db-2/R2-qlever-probe.
Result: PROGRESSED (knowledge). Nothing promoted; no lane gate has run.

### XTDB 2.2.0 (R1, R3, R6)
- Only `_id` is indexed. `_id` lookup ~5 ms to 3M rows; every other predicate is a column scan at about
  0.27 s per million rows (2-CPU probe). Consequence: the current EAV ledger (`tx_assertions`, `_id` =
  assertion id) turns every entity or attribute lookup into a full ledger scan; at 100m facts that is tens of
  seconds per query. A ledger-only (A0) design cannot meet the scale goal. Hot read paths must resolve
  through `_id`: projection tables keyed by entity id, plus maintained value/ref index tables keyed by value.
- Client-set system time works (`BEGIN READ WRITE WITH (SYSTEM_TIME = ...)`, µs, strictly increasing) but one
  aborted tx moves the head to wall-clock and later explicit past times fail (upstream #6209). Decision: never
  set system time. New hypothesis H-X-CUT: an exact recorded-cut mapping exists without setting it, because
  every row written in one tx shares that tx's `_system_from`, and system time strictly increases per tx; so
  position P maps to the `_system_from` of the commit-position row version written in P's tx. Must be proven.
- Versioning is per document; `PATCH`/`UPDATE ... FOR PORTION OF VALID_TIME` exist; `INSERT` replaces the doc
  for its period; adjacent identical slices never coalesce. Two rival projection writers:
  X3a attribute-scoped segment patch (cost ∝ affected slices) vs X3b full entity timeline rewrite (simplest,
  but O(history) new rows per write, so O(n^2) storage over an entity's life under system-time retention).
- Mixed-type columns reach Node as JSON and lost precision above 2^53: every projection column must have one
  declared type (int64 → BIGINT always). `:ns/attr` is physically `ns$attr`. URI columns break SELECT.
- XTQL: documented operators work; `union-all` parses but cannot be planned; `SUM() OVER`/`RANK()` hit the
  known AbstractMethodError; engine `SUM` over BIGINT wraps silently (`LongVector.kt:30-33 @ c6c1962`).
- Ingest ~10k rows/s with 50-row parameterised statements, 40 statements per tx; >100 rows/statement slows
  sharply; big literal VALUES statements ran the JVM out of heap. Node `postgres` COPY `.writable()` hung.
- XTQL coverage today: 11 of 71 tasks are XTQL (all `state_at`); 57 SQL-only; 20 of 23 operations have no XTQL.
  XTDB native lib has no task-wide fixed P (QLever's has). Reachability "reads" are write transactions.

### QLever 0.6.0 (R2, R5, R3)
- Update cost is O(total delta) per request (whole delta file rewritten, six permutations deep-copied, cache
  cleared): 0.7 s at empty delta, 1.5 s at 1M delta. No rollback: multi-op failures and timed-out single ops
  leak partial state. `rebuild-index` exists and runs online (12M triples in 4.8 s on 2 CPUs). Design rule:
  one operation per request, bounded delta (rebuild near 1M delta triples), roll-forward recovery.
- The real reified layout is ~30 triples and ~724 B per fact (R2 measured) and `54A + 27E + 63` triples per
  tx including the journal (R4): 3 to 5.7 billion triples at 100m facts, beyond the 60 GiB VM. Compact
  assertion nodes (~7 triples) plus a plain current graph (~1.2 triples) is ~0.8 billion triples, ~17 GB.
  The layout change is mandatory for the scale goal, not an optimization.
- Default graph is the union of all graphs. Plain attribute-predicate triples must live only in the current
  graph, so raw union queries never see historical values; ledger nodes use a separate field namespace.
- Typed literals are lossy: integers wrap outside ±2^59 on UPDATE, doubles keep 49 mantissa bits, dateTime is
  ms with whole-hour zones, invalid typed literals silently become strings. Projection uses native types
  only inside exact ranges; exact lexical forms stay in the ledger.
- String order: one ICU en_US comparator everywhere, no runtime codepoint option. FIX FOUND (R5): a
  maintained order key of 6 lowercase hex digits per codepoint sorts in codepoint order under the pinned
  engine (exhaustive 4,368 strings + 47,988 base-36 + random + ranges + post-index delta + pagination;
  base-62 negative control fails as expected). Cost +1 triple, ~58 B per text assertion.
- Correlated NOT EXISTS: the EXISTS group is planned as its own uncorrelated query; an outer variable used
  only in an inner FILTER is UNDEF (upstream #2138, open). FIX FOUND (R5): helper re-binds each correlated
  variable inside the group by re-emitting the fact fragment, plus a static check rejecting inner
  FILTER/BIND on unbound variables. Verified flat, nested, latest-revision for NOT EXISTS/EXISTS/MINUS/OPTIONAL.
- Planner memory grows geometrically with FILTER NOT EXISTS count and is not capped by `-m`;
  `query-planning-budget=1` made it flat. Cancellation is WebSocket only; ORDER BY not interruptible.
- No RDF-star in 0.6.0.

### Harness (R4)
- Live tests skip unless `XTDB_INTEGRATION=1` / `QLEVER_INTEGRATION=1`, then use `XTDB_URL` / `QLEVER_URL`.
- Native142 runner `packages/qualification/workloads/runner.ts` has a homebase admission block (lines 61-110);
  QLever entry scripts hard-code :17019; `verify-xtdb-entry.ts` hard-codes :15442. Must be replaced.
- Pure tests: core 733 pass; xtdb 20 pass/84 skip; qlever 25 pass/21 skip; testkit KV44 46 pass; typecheck 31/31.
  Broken here: qualification vitest (picks node:test files, duckdb dist missing); test_engine_cases.mjs
  (missing qualification/adapter/scale-fixture.mjs).
- Adapters receive no schema (only `entityType` string, `schema_version: 1`). ConfigStore releases are
  ordinary assertions in the same backend. The journal is written as `_Transaction` assertions (doubles rows).

### Decisions taken by the orchestrator (R3 asked for Sam; Sam delegated)
- D1 RDF IRIs: `urn:triplex:` default, configurable base.
- D2 RDF layer: plain current graph (head graph) with declared freshness is PRIMARY; per-assertion named
  graph (R3's preference) is the RIVAL hypothesis H-Q3b, because the union default graph would expose
  historical plain triples to raw queries and 100m named graphs are an unmeasured cost.
- D3 name collisions: release-compile check, no key regex change. D4 repository lives in a new core subpath.
- D5 absent optional = missing property; cardinality-many = array always.
