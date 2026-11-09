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

## GEN-0 2026-11-07 Research R9 (core plumbing) + Codex plan review round 1
### R9 learnings (lab/research/R9-core-plumbing.md)
- Projection hook = the adapter's `persist(state, ...)` (XTDB `XtdbStorageAdapter.ts:188-331`, called `:405-406`;
  QLever `QleverStorageAdapter.ts:187-278`, called `:343-344`). `state.rows` carries every row of the tx incl.
  retraction columns, claims, position, sourceK. Spec enters via `XtdbRuntimeOptions` / `QleverRuntimeOptions`.
  Zero edits needed to TriplesLive, StorageAdapter, Runtime.define, KV, testkit. A post-commit StoreCapability is
  the wrong place (not atomic). Planner needs post-tx live facts of touched entities: pure `planProjection` in core
  plus one batched read before `persist`.
- Journal: every TransactionChange field is a ledger column, so `changes[]` can be served from the ledger; but
  adapters never see TransactionMeta, so a small envelope per tx must still be stored, and `_Transaction` facts are
  public (docs promise them to Datalog; shared cases 29 and 39 read them). "Slim journal" (drop `:_tx/change` and
  `:_tx/changed-entity`, keep envelope) keeps all 44 cases; XTDB rows `2A+E+2+m` → `A+2+m`; QLever -52% triples
  at the dense profile.
- Reuse: extract `ConfigApi.compile` and `EntityCodec` from packages/http into core for the repository.
### Orchestrator decisions on R9's open questions
- Journal tier: slim journal, as an optional adapter `journal?` member (precedent: `validateConstraints?`), gen-2
  track, gated by cases 29, 30, 31, 32, 34, 36, 39 staying byte-identical. Fully native journal rejected (breaks 29/39).
- Derived `changes[]` order: must reproduce today's order exactly; if the ledger lacks a per-tx row sequence, add one.
- Projection planner failure policy: never reject a valid Triplex write for the projection's sake (review r1 #12).
  Commit the ledger, mark affected entities projection-stale in the same engine tx, route their reads to the
  ledger, repair asynchronously, count and surface planner errors.
### Codex review round 1 (lab/reviews/plan-review-r1.codex.md): 16 findings, 8 critical
- Accepted 13 as stated, 3 with a different remedy (lab/reviews/plan-review-r1.response.md). Biggest corrections:
  gates did not establish the done condition (now lab/acceptance, EXP-A01); receipts could certify unexecuted
  builds (now bound to dist hashes, fail closed); H-X-CUT is false for nested multi-position XTDB transactions
  (narrowed to physical commit boundaries, interior cuts → ledger); QLever can corrupt its own state on a timed-out
  single operation, so a QLever-only ledger is untrustworthy (new hypothesis H-Q-LOG: durable log of record outside
  QLever, QLever as rebuildable index, fenced single writer); T1's "one atomic step" was false for QLever's
  separately advancing views (new B2: one update operation per commit group carrying ledger, projection and
  publication marker); 12 + 3.5x3 GiB residents/slots exceeded the 12 GiB VM (one pool now).
- Result: PROGRESSED (plan). Round 2 running.

## GEN-0 2026-11-07 Codex plan review round 2 → PLAN v1
- Round 2 (lab/reviews/plan-review-r2.codex.md): 14 findings, 10 critical; verdict "not ready" until PLAN v1 holds
  the acceptance matrix with golden vectors and an integrated done predicate; a complete QLever durable-decision,
  fencing, replay and publication protocol covering every mutator; full R/P/V eligibility with query-wide
  completeness; frozen conflict, journal, raw-dataset and scope contracts; bounded maintenance, atomic admission,
  cumulative budgets and retained preimages.
- Most important correction: my projection selector ignored recorded time R (a read at R=1000 with current P2 would
  return the corrected value). C1 now covers the whole basis; explicit R takes the exact path until proven.
- Second: QLever publishes the snapshot inside `modify`, before client verification, so "verify then publish" was
  impossible. C2 makes the log fsync the irrevocable decision and verification post-publication with a fence.
- Third: native recursive reads mutate engines (scratch graphs/tables) in both lanes. C8: native reads never mutate;
  recursion becomes read-only frontier iteration. This removes a mutator class instead of fencing it.
- Fourth: R9's slim journal removes documented queryable facts (`:_tx/change`, `:_tx/changed-entity`). C6 keeps the
  logical journal queryable; physical slimming only with synthesized, byte-identical facts. Rejected as default.
- Codex accepted: the log of record does not violate the handoff (name the profile "QLever 0.6.0 + log of record");
  ledger fallback for interior XTDB cuts; one scope per engine as a production contract if ownership is enforced;
  an early repository skeleton (objection withdrawn).
- Result: PROGRESSED (plan v1 written). Round 3 confirmation running. EXP-R01 entity core dispatched (worktree).

## Hourly learnings pass 2026-11-07 (cron ae766d26)
- No experiment finished since the round-2 entry. EXP-000 has started `lab/bin` (engine.mjs, lib.mjs, tests);
  lab/acceptance/ is still empty (EXP-A01 running). Research probes tx2-probe-r7 and tx2-probe-r8 hold 10 GiB of the
  11 GiB pool, so the harness's dev engines cannot start until they finish. Learning: research probes compete with
  the harness for the same pool; future research probes are capped at 1.5 GiB and must check the pool first.
- New research launched from PLAN v1's open questions (Sonnet xhigh):
  - R10 read-only recursion (contract C8): inventory of recursive tasks, QLever property paths over a current graph,
    TS-driven frontier iteration with VALUES / array parameters, prior art.
  - R12 XTQL cookbook: XTQL formulations for all 23 native operations, verified row-identical to SQL on a probe;
    hard gaps become engine-repair candidates. Unblocks the X2 parity track (57 SQL-only + 3 hybrid tasks).
  - R13 log of record (contracts C2 to C4): prior art (XTDB 1.x tx-log/doc-store, Datomic, Kafka Streams changelogs),
    Node durable append, what fsync means inside the colima VZ VM on macOS, N-Quads checkpoints, fencing.
- Deferred: load-harness research (G7) until the acceptance contract's load-contract.json exists.

## GEN-0 2026-11-07 Codex round 3 → PLAN v1.1 (ready to execute, gated)
- Verdict: ready to execute as a gated experimental program once five changes land; all five applied in v1.1.
- Learning worth keeping: Triplex recorded timestamps are NOT monotonic in commit order (each runtime supplies its own
  clock, `TriplesLive.ts:308`). Any optimization keyed on "R after the newest commit's recorded time" is wrong
  (P1 at R=2000, P2 at R=1000, read at R=1500 must exclude P1). Explicit R always takes the exact path for now.
- Learning: a maintenance window that deletes facts in chunks exposes states that match no logical basis; qualified raw
  reads must refuse during MAINTAINING; chunks must be computed at apply time inside the broker.
- Learning: "durably committed" and "published" are different outcomes; a lost-ACK retry must not return success before
  publication (CommitPending / Repairing instead).
- Learning: receipt carry-forward keyed only on imported files can transfer an 8 GiB load result into a 2 GiB profile;
  carry-forward now needs every bound identity unchanged, and final acceptance is always fresh.
- EXP-R01 narrowed (skeleton, spec compiler, codec move); planner/repository behavior moved to EXP-R02 behind reviewed
  acceptance and golden vectors. Message sent to the running R01 agent.
- Result: PROGRESSED. Plan phase complete; Codex round 4 diff check running in the background (non-blocking).

## EXP-A01 acceptance contract (Opus high) — PROGRESSED (0.1.0-draft)
- 88 obligations across G1-G10, R, S, L; all apply to all three surfaces (xtdb-xtql, xtdb-sql, qlever-sparql);
  19 engine-scoped, 69 per lane; 3 policy-pending (G9 presence, deletion, cascade); 10 derived.
- Only 6 obligations can close with oracles that exist today. O-REPLAY (independent Python event replay) is the
  critical path for 33 case sets; O-SHAPE, O-ERR, O-OBS, O-SPEC still to author.
- Surprises: the inherited rate16 writer floor is 0.2 commands/s total ("6/6 writers" = six commands); unchanged44
  is Datalog-shaped and cannot stand in for native obligations; QLever has no conformance driver in this checkout;
  xtdb-xtql needs 60 new XTQL packet recipes.
- Orchestrator rulings (lab/acceptance/RULINGS.md): raw unrestricted exactness NOT required (handoff: raw SPARQL is
  narrower; declared mapping + retained unsupported cases), but repository and supported fragments must be exact over
  the full domain; a fixed load bar IS part of done (256 logical clients, 256 req/s offered, 25.6 commands/s,
  goodput ≥ 0.99, p99 ≤ 1 s point / ≤ 5 s analytic, visibility p99 ≤ 2 s; stress retention ≥ 0.9, recovery ≤ 60 s);
  sum overflow follows core (`compiler.ts:572`: exact DECIMAL sum, error only on final out-of-range).
- Next: Codex acceptance review (running), EXP-O01 oracle and EXP-G01 golden vectors dispatched in parallel as two
  independent derivations to cross-check each other.

## Process note 2026-11-07 13:42: memory pool contention
- Research probes tx2-probe-r7 and tx2-probe-r8 reserve 5 GiB caps each but use about 3.1 and 1.1 GiB. Because the pool
  counts caps, the harness's dev engines (5.5 GiB) and R12's probe could not be admitted for roughly an hour.
- Fix applied: asked R8 to recreate with a 2.5 GiB cap and R7 to wrap up within ~25 minutes.
- Rule for future briefs: research probes request the smallest cap that fits their measurement (default 1.5 GiB), name the
  measurement that needs more, and release within a stated time box. The harness reserves dev engines first; research
  probes queue behind them.

## EXP-R01 entity core skeleton (Opus high) — PROGRESSED, verification pending
- Branch exp/R01-entity-core: `./entity` subpath with types for Repository/Writer/plan IR (stubs), a fully tested projection
  spec compiler (names, one declared type per engine, exactness rules, collision rejection, content id), and the http codec
  move (parity 4/4 against the original). core 733 → 799 tests; testkit 46 unchanged.
- Learnings: a Struct cannot distinguish card-one List from card-many, so specs compile from attribute usages; http's default
  collection naming would break multi-word types, so ConfigApi.compile was split with hooks; the public TemporalBasis cannot pin
  a commit position, so EXP-R02 must decide how a repository proves one cut across a page and its includes (open question).
- Unverified engine claim carried forward: XTDB DOUBLE preserving -0 (EXP-F02 decides).

## Codex acceptance review r1 → NOT READY TO FREEZE (16 findings, 9 critical)
- Valid catches: rulings not compiled into obligations (CLI and equal-duplicate conflict still required); load JSON still encodes
  the rate16 floor; Q11 halved per-language load (reversed); recovery allowed losing an fsynced unACKed command; C1-C8 lacked
  discriminating cases; O-REPLAY assumed non-decreasing instants (same clock bug as PLAN C1; O01 corrected mid-build); -0.0
  arithmetic stated wrongly; core rejects integer AVG (Q8b revised); carry-forward weakened the fresh-final rule; scale counts
  allowed trivial history; goal 8 could pass with zero reuse; typed errors could replace required cursor continuation; C8 frontier
  control conflicted with the hybrid-language rule.
- Decision: accept all 16; EXP-A01's author revises to 0.2.0.

## R7 XTDB indexing and ingest (Sonnet xhigh) — PROGRESSED (knowledge), H-X-ID revised
Report lab/research/R7-xtdb-indexing-ingest.md; probes ~/Claude/Projects/triplex-db-2/R7-xtdb-index-probes (3 CPU / 5 GiB, ≤3M rows).
- Bloom pruning DOES work after compaction: string equality 25 ms (3 of 4096 pages) vs ~0.9-1.0 s on uncompacted L0 files.
  R1's "no pruning" was an L0 artifact. Consequence: equality on non-_id projection columns is acceptable for compacted data;
  freshly written (L0) data is scanned, so equality cost grows with recent write volume. Once, after a restart, queries kept
  planning over L0 until a second restart (cause not isolated; watch for it).
- UUID `_id` is the raw 16-byte IID (not hashed); string/keyword/int `_id`s are hashed. Prefix-sharing UUIDs: `_id IN` of 1000 in
  5.5 ms vs 330 ms for hashed keys; numeric/time min/max pruning works only when `_id` order correlates with the column (rank in
  the high bits). `_id` ranges are never pruned; `CAST(... AS UUID)` in a predicate scans; pass typed uuid params.
- Index shapes: unique-value table with `_id` = value key + ASSERT: 11 ms vs 1.2 s for the same check on a non-_id column.
  Postings: array doc 5 ms at 3000 postings; a 1M-id array doc reads in 536 ms but each update costs 542 ms and 14 MB (no
  server-side append), so popular values need paged postings (1k-10k ids per page, head doc holds the first page; read 1M in
  395-457 ms, append 28-49 ms). Removal needs the stored page number (otherwise a 1.2-2.3 s scan).
- Range/order: bucket docs (width 1000) 3 ms for a 1k range, 50 ms for 100k, 2.4 ms for ORDER BY ... LIMIT 100, 33 ms to move an
  entity; plain scan of the projection table 0.85-3.5 s (range) and 1.8-2.0 s (ordered page).
- Ingest: parameterised INSERT via `postgres` 5-9k rows/s (20-23k with 2-4 connections); COPY arrow-stream through a raw-wire
  client 73-171k rows/s on one connection, 247k on two; COPY transit-json 51-146k. COPY works inside BEGIN READ WRITE with ASSERT and
  METADATA; a failed ASSERT aborts the COPY. Distinct-text literal VALUES statements exhaust the heap; params and COPY do not.
- History by `_id` 2-13 ms with 10 versions; table-wide COUNT(*) over 500k ids x 10 versions 4.8 s (reads all versions).
- Disk: about 6x live data before GC; with `blocksToKeep: 2` and `garbageLifetime: PT1S` buffers fell 37.7 → 13.1 GB within 10 s of a
  block boundary; L0 files and the Local log are never collected (steady state about 2.4x live). R7's probes filled the VM disk to
  95% before GC ran: disk admission must forecast pre-GC peaks at about 6x live, not 2.4x.
- Correctness hazard: upstream XTDB #6151, join pushdown under LIMIT/aggregate can return wrong rows.
### Orchestrator decisions from R7
- H-X-ID revised to "`_id`-first plus compaction-aware blooms": projection tables keep `_id` = the Triplex entity id STRING (raw
  queries stay sensible: `WHERE _id = 'worker:maria'`); include/batch fetches pay ~0.33 s per 1000 hashed ids, acceptable at page
  sizes of 100. The ledger (internal, never raw-facing) moves to entity-clustered UUID `_id`s (high bits = hash(scope, entity), low
  bits = per-entity sequence) so per-entity history and batch reads cluster; to be measured against the current ledger.
- Index tables are opt-in per attribute in the projection spec: unique attributes get a unique-value table (also the uniqueness
  check); refs get paged reverse-posting tables; attributes declared range/ordered get bucket tables; everything else relies on
  compacted bloom pruning. Paged postings store each entity's page number so removal is a point update.
- Bulk ingest uses a raw-wire COPY (arrow-stream preferred, transit-json fallback) client inside BEGIN READ WRITE with ASSERT and
  METADATA; ordinary commits keep parameterised statements with identical text (never distinct literal VALUES).
- XTDB config for every slot: `blocksToKeep: 2`, short `garbageLifetime`; disk forecasts use 6x live data before GC.
- Native helpers and the capability matrix must route around #6151 (no join pushdown under LIMIT/aggregate without proof).

## R13 log of record (Sonnet xhigh) — PROGRESSED (knowledge); PLAN v1.2
Report lab/research/R13-log-of-record.md; scripts and raw outputs ~/Claude/Projects/triplex-db-2/R13-log-durability
(wal.mjs with CRC32C framing and scanner, durable-log.mjs group-commit writer, gen-switch-sim.mjs crash-state model).
- Decisive: on macOS, Node 22 `fs.fsync` is `F_FULLFSYNC` (libuv 1.51; 2.9 ms measured); `O_DSYNC` is 0.02 ms and NOT durable.
  Inside the colima VM, Lima hard-codes cached disk mode with `Fsync` synchronization, which Apple documents as not flushing the
  drive cache: guest fsync 0.13-1.2 ms is below the 2.9 ms floor of a real flush. A VM-resident log cannot claim power-loss
  durability. virtiofs is no stronger. So the QLever broker and its log live on the macOS host.
- Framing tested at every truncation point (72,204) and single-bit flips; pure quad deltas make replay idempotent (agrees with R8).
- QLever 0.6.0 has NO N-Quads export (corrects R2 §7.1); checkpoints fold the log instead. Generation switch model-checked
  (520 states, 0 violations, 5/5 broken variants caught).
- Fencing: QLever's token only authenticates and is printed at INFO in the server log; flock is not coherent between host and VM
  on virtiofs (tested). Three layers: host kernel lock, EPOCH_BEGIN frame, (epoch, position) guard inside every update.
- Group commit on the host: 33k commits/s at 256 clients, p99 23 ms; fsync is a few percent of a QLever update (0.2-1.7 s), so the
  QLever update, not the log, bounds lane-Q write throughput.
- Applied to PLAN v1.2 C2/C3 one to one, plus five F05 falsifiers. Durability statement recorded in C2.

## R12 XTQL cookbook (Sonnet xhigh) — PROGRESSED (major): 23/23 operations, 71/71 tasks in XTQL
Report lab/research/R12-xtql-cookbook.md (957 lines); every statement, parameter list and row set in
~/Claude/Projects/triplex-db-2/R12-xtql-cookbook/raw/.
- All 71 tasks answer with XTQL statements whose rows equal both the packet's expected rows and the SQL library's rows; 142/142 with
  a fresh pool ("reopen" here = new pool, not engine restart). The unmodified SQL library scores 71/71 on the reconstructed fixtures
  (fixture-loader check). Operators now exercised: unify/join, aggregate, exists?, q, cast, unnest, limit, count-distinct, row-count,
  greatest, least.
- The packet fixtures are weak discriminators: a mutation run left 2 of 3 well-formed mutants alive (the `revoke` clause in 12, step
  order in 17); 38 hand-built controls (workloads 05, 08, 09, 12, 17, 18, 20 with a 6-hop cyclic graph) kill all four mutants tried.
  Lesson: native qualification needs discriminating controls beyond the 142 packet, with independent expected answers.
- Hard gaps: (1) recursion has no pure-XTQL form; depth-D unrolling plus a second XTQL fixpoint-check call is read-only and passes
  all 14 recursive tasks, but statement size grows with D^2 (D=8: 56 KB, 191 parameters, 0.6-1.7 s on 21 rows), so it is not the
  scalable answer (wait for R10); (2) `union-all` fails at planning (`No implementation of method: :plan-query ... UnionAll`), the
  logical operator exists, the repair looks small (engine-repair candidate; no operation needs it today); (3) `sum` over BIGINT wraps
  in BOTH languages (three values of 2^62 give -4611686018427387904); the 32-bit-halves recombination workaround makes XTQL raise
  `data exception - overflow error` on the 3 true-overflow cases and match the other 4 exactly, while SQL wrapped on 3 of 7.
  Smaller: `(cast x :i64)` needs `#xt/type :i64`; literals/params in a join bind spec fail; `(aggregate {:k constant})` fails.
- Fixed cut: `NativeReadOptions.basis.recordedPosition` already pins a task-wide cut (a writer between calls was invisible to the
  pinned call); snapshot tokens and `BEGIN READ ONLY WITH (...)` work but `NativeQueries.run` never passes them.
- int64: parameters bind as BigInt (oid 20) and compare exactly at 2^63-1; results arrive as strings and hydrate through contracts.
- R6's open XTQL questions answered: `with` overrides a bound column (the retirement mask works in XTQL), `INSERT ... SELECT` from
  XTQL plans, text-to-BIGINT cast works.
### Orchestrator rulings
- Language accounting counts EVERY substep, including basis acquisition. The XTQL path must acquire its source cut in XTQL
  (`tx_meta` read in XTQL); the SQL path keeps its SQL cut read. Only then can a task count as XTQL-only.
- SUM over BIGINT: both languages must stop wrapping (Q8a: exact total, typed overflow only when the final total is outside int64).
  The SQL path's silent wrap is a lane-X SQL correctness defect, not just an XTQL concern.
- Recursion: R12's unrolled XTQL is accepted only as an interim pure-XTQL, read-only implementation with an explicit max depth and
  a typed error when the fixpoint check fails (never a truncated closure). The scalable design waits for R10 (EXP-X03).

## R8 QLever write lifecycle (Sonnet xhigh) — PROGRESSED (knowledge); confirms H-Q-LOG, sets lane-Q write ceiling
Report lab/research/R8-qlever-write-lifecycle.md; probes ~/Claude/Projects/triplex-db-2/R8-qlever-write-probes. Indexes of 8M, 49M,
98.6M triples in projection+compact layout, 3 CPUs.
- Idempotent re-apply: re-sending the identical update converged all six permutations in every case (insert, delete, after restart,
  after rebuild). Restart clears a single failed op's junk; `rebuild-index` bakes partial permutations in until the update is
  re-sent. HTTP 429 can mean the update fully committed and is durable; a client disconnect does not cancel an update. Rule:
  reconcile by re-sending until 200; never treat 429 or a read-back as proof of anything.
- Rebuild under load: served queries and updates; 92/92 acknowledged updates survived. 99M triples rebuilt in 28 s idle, 51 s loaded;
  point-read p50 45 → 76 ms, throughput -37%, update p50 x2.6, cold page cache after the swap x4 p50. With `-j 1` queries stall for
  the whole rebuild: always `-j` ≥ 2 (recommended 4). Extrapolated 820M triples: 4-5 min idle, 7-9 min loaded (low confidence).
- Group commit: fixed cost per request 2 ms at empty delta, 115 ms at 500k, 203 ms at 1M; marginal 0.025-0.03 ms per triple; 50k-triple
  batches best at every delta ≥ 100k (29-38k triples/s). R2's 0.9 s fixed cost was 4-5x too high.
- Snapshots: one SPARQL request is one snapshot (4,076 reads, 0 torn); two requests are two snapshots (5.9% of pairs saw data above the
  watermark). So marker and data must be read in the same request (C1/C4 already require this). Put FILTER outside the GRAPH block.
  Watermark filter costs 0.94-1.08x for selective reads, 2.6x for a count over every assertion.
- Durability: QLever writes the delta with write, close, rename and NO fsync; 10/10 SIGKILL runs lost nothing (page cache); a zero-length
  or truncated `idx.update-triples` prevents start-up; a flipped byte is accepted silently. Confirms the log of record (C2) outside QLever.
- Knobs: `-j 4 -m 3G -c 512M -e 128M -s 10s`, `query-planning-budget=1`, rebuild at 750k-1M delta, writer backpressure at 2M. Delta
  memory 1.3 GB per million triples while updating (0.75 GB after restart), NOT counted by `-m` (verified).
- Sustained write rate ≈ 1,000 triples/s ≈ 125 facts/s ≈ 25 tx/s on 3 CPUs, bounded by rebuild capacity. Against the Q2 load bar
  (25.6 commands/s at 256 clients) the QLever lane is at the edge before any optimization: fewer triples per fact, larger groups, 6 CPUs
  and faster rebuild scheduling are the levers. The bar stays; this is now the lane-Q performance bottleneck to experiment on.
- Bug: upstream #3172 reproduces on 0.6.0: a BIND/IRI()-constructed term in an update makes every later `rebuild-index` fail (HTTP 400).
  Rule: update templates use only literal terms and variables bound from plain patterns. New F05 falsifier: C2.3's guarded
  DELETE/INSERT WHERE followed by `rebuild-index` must still succeed.

## EXP-000 loop harness (Opus high) — PROGRESSED; on main (through baf4edf)
- `lab/bin/engine.mjs` (slots, atomic pool ledger, cleanup-proven release), `gate.mjs` (G0/G1/G2, bound receipts, preimages under
  runs/objects, PASS_SUBSET for subsets, runKind default diagnostic), `heavy.mjs`, `scorecard.mjs` (main-committed receipts only),
  `status.mjs` (first validity checker), 15 harness unit tests; homebase coupling replaced; two pure-test breakages fixed.
- First fresh receipts: G0 PASS xtdb (911) and qlever (916); G2 xtdb FULL PASS 142/142 (`G2-xtdb-20261107T185821Z-210ae9`), language
  tally counting answer queries only: xtql 22, sql 116, hybrid 4 (counting every substep: xtql 0, because every call acquires its cut
  in SQL; EXP-X02 fixes this per the ruling in the R12 entry).
- Failures kept: G1 xtdb full FAIL although all 88 executions passed (a concurrent gate rebuilt the shared dist mid-run; harness now
  enforces one gate per worktree); G1 qlever 0/88 (dev QLever OOM-killed at its 2.5 GiB cap on the first case; EXP-002 applies R8's
  flags and the planner profile); G2 qlever wrote no receipt (harness bug, fixed).
- Not yet enforceable: V7 (no oracle ACCEPTED, no pinned file hashes), V9 (raw results hashed after the runner's own asserts), V13/V16
  (status.mjs only); mutation runs record but do not apply patches. "Reopen" for the 44 means a second fresh runtime opening.
- Side effect found and reverted: the orchestrator's early `pnpm config set store-dir --location project` had rewritten
  pnpm-workspace.yaml (comments lost, absolute storeDir added); restored from git. Agents keep passing --store-dir explicitly.

## EXP-001 XTDB baseline (Opus high) — PROGRESSED, all PASS (A0 controls)
- G0 PASS (911, 130 expected skips) `G0-xtdb-20261107T190435Z-3bbfe6`; G1 FULL PASS 88/88 `G1-xtdb-20261107T190528Z-50077c`; G2 FULL
  PASS 142/142 `G2-xtdb-20261107T190622Z-f59e9c`; native-entry 13/13 and verify-xtdb-entry 6/6 (lab/runs/ENTRY/*exp001*).
- Homebase reproduced: 28 XTQL and 164 SQL answer traces. Language table (71 tasks): answer queries 11 XTQL / 58 SQL / 2 hybrid;
  strict (every substep) 0 / 58 / 13 (192 SQL source-cut substeps, 598 SQL reachability substeps).
- Timings: G0 32 s, G1 47 s (XTDB 1.5 GiB), G2 29 s. Cheap enough for every candidate to rerun full G1+G2.
- Surprises: a task's language can depend on data (19/label-not-known makes 0 XTQL calls when its loop is empty); G2 claims
  PKT.full142 for xtdb-xtql although only 11 tasks are XTQL: the harness must filter obligation claims per language.
## O01 replay oracle built (branch exp/O01-replay-oracle 03d86f3): self-checks O-HAM 18/18, O-CFG8 20/20, O-EVT 23/23, units 91/91;
   corrections applied (clock model, nested positions, outcome authority, signed zero, AVG, constraints). Needs independent review
   and rulings listed in its RULES.md. Two homebase review fixtures are absent from this checkout.
## G01 golden vectors: 49 vectors, 17 ambiguities (AMB-01 most important: tiny-v4 checks expect null retirement on ordinary
   match vs the raw-lifetime contract). Not yet reviewed or committed.
## SCOPE CHANGE from Sam (2026-11-07): new north star (lab/NORTH-STAR.md, five ranked priorities); pasted suggestions saved verbatim
   (lab/research/SAM-pasted-targets-2026-11-07.md). Sam: do not rule out QLever; build both to the fullest and work around
   impossibilities; keep the ten-goal plan but re-tune performance targets and requirements. Orchestrator restated its
   understanding to Sam and is waiting for confirmation before rewriting PLAN/TARGETS/contract targets.

## R10 read-only recursion (Sonnet xhigh) — PROGRESSED (knowledge); C8 design chosen
Report lab/research/R10-read-only-recursion.md; probes ~/Claude/Projects/triplex-db-2/R10-recursion-probes (1 CPU, synthetic graphs).
- Design: shared TS `frontierClosure` (semi-naive, one read per round, frontier as ONE structured parameter, expanded-set cycle guard,
  budgets with typed errors: rounds 64, visited 100k, edges 1M, task 30 s). Lane Q Tier 1 = one property-path read over the current
  graph for C1-eligible bases (bound start; `BIND UNION p+` for zero length; never `p*` with a constant start; never both ends unbound);
  Tier 2 = frontier over the ledger. Lane X Tier 1 = frontier over entity-keyed `_id` tables with native `FOR VALID_TIME AS OF`;
  Tier 2 = frontier over the raw ledger (small scopes only; at scale needs a write-path edge index). Supports counted on the extracted
  subgraph (simple paths, as the oracle).
- Evidence: all 17 recursive fixture cases (workloads 11, 13, 14, 15, 20) pass both ways; today's closure is all-pairs (a 111k-node tree
  breaks the 100k-pair limit; each XTDB scratch round 205-410 ms). Property path 4-15 ms to reach 11k, ~130 ms to 111k, but needs IRI refs
  and cannot filter edges by time; QLever returns no row for `p*` from a constant absent from the graph (differs from W3C).
- QLever ledger ids must be IRIs: VALUES of literals costs ~0.25 ms planning per literal (frontier to 8.6k: 3.2 s literal vs 0.28 s IRI).
  Affects EXP-Q01 compact ledger. QLever `PathSearch` over a ledger edge subquery gives exact reach and simple-path counts in one read
  (71,074 paths in 1.66 s) but needs a cycle guard: rival, not default.
- XTDB ledger frontier = a column scan per round (235-330 ms at 333k rows, linear); entity-keyed tables 3-7 ms for frontier 10, ~100 ms
  for 1,000. XTQL `rel` join 17-120 ms per round (scans); `_id` OR-chain fails to compile at ~100 scalar params.
- NEW XTDB 2.2.0 WRONG-RESULT BUG: `col = ANY($1) AND <other predicate>` silently returns zero or wrong rows; use
  `IN (SELECT x FROM UNNEST($1) AS u(x))`. Forwarded to EXP-X02 and R14.
### Orchestrator decisions on R10's questions
1. QLever Tier 1 (property paths) ships after the frontier loop passes G2, as an optimization that must match the frontier results
   differentially; the frontier loop is the exact default.
2. IRI entity ids and refs in the QLever compact ledger: yes (10x frontier cost difference; matches the R3/R01 naming).
3. XTDB Tier 2 at scale: a write-path edge index (forward and reverse ref tables, paged per R7); an early-refusal scan budget is the
   interim guard.
4. C8 covers every read API: the Datalog `rules` path and `makeXtdbMaintainedQueries` must stop writing scratch state from read calls.

## R14 XTDB 2.2.0 correctness hazards (Sonnet xhigh) — PROGRESSED (knowledge)
Report lab/research/R14-xtdb-correctness-hazards.md (22 hazards). Top five, all reproduced on our dev engine:
1. SUM over BIGINT wraps silently (workloads 06, 07, 08 sum BIGINT directly); guard `CAST(.. AS DECIMAL(32,0))` is exact and free.
2. Correlated NOT EXISTS / EXISTS / IN / NOT IN drop or null rows when an inner predicate is unknown (#6313, fix unreleased); hit by
   workloads 09, 12, 13, `Reachability.ts:196` and the constraint ref check; guard `(p) IS TRUE`, no measured cost.
3. Mark join with > 100,000 build rows answers false for every row (#6345, unreleased); hits projected or OR-ed IN/EXISTS, i.e. our
   Datalog `or` and the constraint check; guard: raise XTDB_JOIN_SPILL_THRESHOLD or rewrite as UNION. Matters at year-one scale.
4. Join pushdown under LIMIT or a window (#6151); TemporalQueries.ts span/island window CTEs unverified.
5. `col = ANY(x) AND p` misparses (`Sql.g4:753-756`); no builder uses ANY but R7 recommended it (R7 lines 134, 144, 234 are wrong advice).
- Next tier: NULL-key outer joins (#6339), INTERSECT/EXCEPT miss NULLs (#6340), DISTINCT/GROUP BY over lists with NULL (#6341);
  our fixtures have no NULL cases that would catch them.
- Answers R7's open question: after a restart a node plans over L0 until the next transaction (#6174); results stay correct.
- The Datalog compiler inlines position/valid-time bounds as literals (`compiler.ts:230-234`); each distinct literal adds JVM classes
  (#5928), a likely contributor to earlier memory exhaustion. Prefer parameters.
- No exposure: PATCH, UPDATE, FOR PORTION OF, FOR SYSTEM_TIME, default valid time. 19 empty r14_* tables remain in the dev catalog
  (no DROP TABLE in 2.2.0).

## R15 presence, deletion, cascade (Sonnet xhigh) — PROGRESSED (knowledge)
Report lab/research/R15-presence-deletion-cascade.md. Options A (retraction only) ⊂ B (valid-time deletion on derived presence)
⊂ C (explicit opt-in presence carrier plus B). Recommendation C, staged (B planner first, carrier second).
- Findings: reference enforcement loads every live row of the source and target types on each enforced command: this cannot sit on
  the P2 commit path at 10m entities without a touch-set check (now a P2 work item). REST DELETE/PUT may raise
  TransactionConflictError for an entity with a live but expired fact (EntityState compares all live rows; observed set is
  valid-time filtered): needs a test. No transact operation ends valid time; clipping needs new assertion ids.
- Provisional orchestrator ruling (flagged to Sam as product decisions): Option C staged; "delete" ends valid time from now while
  REST DELETE keeps its recorded-retraction contract; undeclared reference action defaults to restrict; cascade is any-parent on
  card-one references only; explicit presence opt-in per EntityType (+1 fact per entity). PII erasure (crypto-shredding) is IN scope
  as a requirement (Sam's paste), unlike R15's "deferred" stance.

## SCOPE v2 (Sam, 2026-11-07) — documents rewritten
- North star = Sam's five ranked priorities (lab/NORTH-STAR.md). Scope = lab/SCOPE.md (Sam confirmed the restatement). Measurements,
  requirements and 20 real-world golden scenarios = lab/TARGETS.md. PLAN v2 and SCORECARD v2 rewritten around them.
- Numeric requirement corrected by Sam: "no silent precision loss", not native int64 (lab/research/SAM-pasted-numbers-2026-11-07.md).
- Anti-leak: repo-root CLAUDE.md points every agent at lab/SCOPE.md; superseded banners added to AGENTS.md, wiki/goals.md,
  wiki/status.md, handoffs/claude-native/README.md and START-HERE.md, qualification/devloop/PLAN.md, qualification/PLAN.md;
  RULINGS Q2/Q4/Q11 and the int64 rulings marked superseded. All future briefs carry North star and Scope lines.

## GEN-2 dispatch 2026-11-07 (scope v2)
EXP-N01 (NS benchmark driver), EXP-W01 (20 golden scenarios), EXP-A01 retarget to contract 0.3.0, EXP-R01 fixes F1-F8 under the
corrected numeric rule, V-O01 oracle acceptance with the G01 cross-check, R16 and R17 north-star fit research per engine. EXP-X02 and
EXP-002 got scope notes (X02 also got R14's hazard guards and the DECIMAL(32,0) sum finding).

## Hourly learnings pass (cron ae766d26) after the gen-2 dispatch
- North star reread. No experiment finished since the gen-2 dispatch entry; notebook current.
- Contention ahead: pool 9/11 GiB (dev XTDB 3, dev QLever 2.5, xtdb-s2 3.5 held by R16), so EXP-N01 (the fitness function, priority
  order 1) could not get an exclusive slot. R16 time-boxed to ~30 minutes on s2; R17 falls back to dev QLever. Rule reinforced:
  measurement work for the fitness function outranks research probes for slots.
- New research: R18 engine-independent prior art for P1/P3/P4/P5 (pinned-version serving, current vs history split, change feed to
  dependency index, read-your-own-write with derived layers, sweep scheduling, bounded subgraph pulls), ending in ranked falsifiable
  experiment proposals.

## EXP-R01 fixes F1-F8 (commit 4e073a8) — PROGRESSED; re-verification requested
- Exactness now follows the corrected numeric rule: DoubleRoundTrip, numeric classes, InexactValueError, inexactPolicy in the spec id,
  CalendarDate, Finite, XTDB valid-time grid fixed. core 826 tests. Decimal value kind deferred to EXP-R02 (needs a TypeExpr primitive).

## EXP-R01 PROMOTED to main (merge db249d8), first promotion of the loop
- Verifier round 2 PROMOTE: all gates rerun (typecheck 31/31, core 826, http 12, testkit 46, lint 0, 18/18 negative type tests); the new
  double rule matched an independent model of QLever (truncate 4 low bits, exact %.13g) on 200,016 doubles with 0 mismatches.
- Post-merge G0 on main: PASS 1004/1004, 130 expected skips (`G0-xtdb-20261107T193849Z-307c45`).
- Follow-ups carried to EXP-R02 / EXP-F02: (1) `approximateNumbers: "reject"` does not reach floats inside JSON (List/Struct) values,
  and CanonicalJson turns -0 into 0 inside JSON; (2) XTDB card-many DOUBLE still marks -0 exact although list parameters travel as JSON
  (`JSON.stringify(-0)` is "0"): add NoNegativeZero for lists unless EXP-F02 proves the round trip; (3) the rdfBase overlap check is
  slightly over-broad (refuses `urn:triplex:scopes:`).

## 2026-11-07 ~20:45Z: V-O01 FIX-FIRST, contract 0.3.1, Q21 rulings
- **Learning: an oracle built against an earlier contract draft drifts silently.** O-REPLAY was built on 0.1.0-draft; 0.2.0 added the
  section 4 tables and Q13-Q15, and the oracle broke six of them (family order, -0/+0 identity, mixed-family comparison, strict integer
  text, missing rem/toNumber/toInt64, error tags). Rule for the loop: every contract version bump re-runs the oracle's section 4 probe
  before the oracle can close anything; the oracle's file hashes are pinned in the contract once accepted.
- **Learning: the 13 vector/oracle disagreements were all oracle bugs** (assertionTxId missing, reserved namespaces, entityPage limit).
  The independent-two-author design worked: the G01 author and the O01 author made different mistakes, and the comparator caught all 8
  planted errors. Keep the two independent.
- **Ruling Q21 (all 17 AMB items).** The product-shaping ones tie to the north star: AMB-09 (duplicates are one value; SUM 10) is P2
  idempotency under the 10% duplicate trace; AMB-04 and AMB-12 follow Sam's "hard error, never silent conversion".
- Contract 0.3.1 (Q16-Q20 compiled) committed 9c01194; EXP-O02 dispatched to make the oracle conform (no packages/ reads; the brief
  states the four implementation facts it needs).

## 2026-11-07 ~21:10Z: Codex plan-v2 review NOT READY; all 14 findings accepted (675db6b)
- **Learning: naming a basis proves nothing about pinning.** If readers and writers touch disjoint subjects, a reader that silently
  reads latest state passes every check. The fix is to make the workload discriminate: a shared hot set, split subgraph reads with a
  forced commit between steps, and a requested basis recorded by the driver, not echoed by the engine (TARGETS 1.1 P1).
- **Learning: a closed-loop commit probe hides queueing.** P2 is now open loop from the scheduled offer to the published ACK on the
  trace's own commands, per size band, with every offered command accounted for.
- **Learning: a sweep that only fetches is not release activation.** P5 now needs W0 evaluation, exact coverage, outbox publication and
  post-capture mutations; this created EXP-D01 (W0 kernel plus the independent O-DOMAIN oracle), which GS also needs because O-REPLAY
  models database state, not domain rules.
- **Learning: erasure and bit-for-bit history conflict unless the boundary is defined.** Ruled Q24: reads after the erasure publishes
  see a typed ErasedValue marker at every basis; reproduction holds modulo erasure (provisional, flagged for Sam).
- **Process fix:** PLAN 6.1 said "lowest-ranked unmet priority", which reverses Sam's order; now "highest-priority unmet". Generation 2
  reordered: freeze semantics, tiny commit/feed/fault controls on both sources, A0, W0, layer swaps one at a time, then the broad suite.
- **Composition identity** is per layer (source, current, history, analytics) with watermark routing and ACK after the current index
  reaches the commit (Q28); bundled "all read layers move together" comparisons could not tell layers apart.
- Next: A01 compiles 0.3.2; N01 and W01 got the new semantics; Codex round 2 on 0.3.2 when it lands; EXP-D01 when a slot frees.

## 2026-11-07 ~21:30Z: R16 (XTDB fit) and R18 (prior art) landed; EXP-P2X and EXP-D01a dispatched
- **XTDB P1 learning: the read path and the indexer share one JVM's CPU.** At 4+ closed-loop readers on a 2-CPU node, commit service
  time went from about 17 ms to 90-112 ms. Pinned reads stayed exact and nothing locked, so "never block writers" fails by CPU, not
  by locks. Direction: readers on a follower node (or nodes) that tails the same log; the leader handles writes and the synchronous
  current index. pgwire's `server.numThreads` (42) caps connections, so 256 readers need it raised, followers or a pooler. Note R18:
  `AWAIT_TOKEN` is cleared by `DISCARD ALL`, so pooled clients must send it per read-only transaction.
- **XTDB P2 learning: correct, but the floor is a commit round trip (about 15 ms single-row on a loaded host).** CAS adds about 5 ms.
  Today's adapter also asserts `MAX(position)` over the scope's tx_meta on every commit, which serializes all commits in a scope
  (R18 finding 5). EXP-P2X tests per-subject CAS with order and gap-freedom from XTDB's log (tx id plus a high-water mark).
- **XTDB P3 learning: no supported change stream; build it in Triplex.** METADATA plus a feed row in the same tx, one tailer on
  `xt.source_log_msgs` (2 ms empty poll, O(window)), checkpoint = msg_id. Never fan out by many pollers on `xt.txs` (32 pollers stalled
  commits for seconds).
- **XTDB P4 learning: single-subject current pulls already sit near the bar and stay flat with history, but multi-query pulls do not**
  (4 queries for 40 entities cost 35-40 ms p50). R18's strongest design idea fits here: a per-subject world document keyed by `_id`
  (XTDB indexes only `_id`) with a validity interval (stamped with the positions where its dependencies last changed), so one `_id`
  read serves the current basis and recent as-of bases. Watch R18's source finding: a currently valid fact with a finite `valid_to`
  (an expiry date) is filed as historical (OutWriter.kt:146), so expiry-heavy subjects could fall off the current path; an explicit
  current table avoids that. These go into EXP-X04's brief.
- **One dependency index, three jobs (R18).** A recorded read set per subject evaluation plus a reverse index drives the P3 re-run
  trigger, world-document invalidation (P4, P1) and the P5 blast radius. W0's spec now lists read sets per rule so this index has an
  exact expected answer (EXP-D01a).
- **XTDB P5 learning: a snapshot token pins nothing** (GC is time-bounded at 24 h and ignores open snapshots), so long sweeps cost
  writers and compaction nothing; 100k in about 91 s under live load is close to the 100 s bar, and published lane results
  (ScyllaDB 2-3.5x OLTP p99 under analytics) say the 1.5x live bar likely needs AIMD-paced sweeps or a follower (R18 X4).
- **Requirements on XTDB:** `ATTACH DATABASE` per tenant costs about 6 MiB RSS and 0.6 threads, so 1,000 small tenants do not fit one
  node: tenancy needs a pooled design for small tenants (open, needs research). `ERASE` is logical (marker stays in the log files), so
  crypto-shredding is the reliable erasure route (matches Q24). Numbers: BIGINT overflow raises, but SUM, ABS(min) and DOUBLE casts are
  silent and DECIMAL MIN/MAX fail; add to the XTDB hazard list.
- **Decision for Sam (from R18), not assumed:** whether Datomic-style `noHistory` is acceptable for high-churn attributes (for example
  a signal's receive counter). Default stays "keep history for everything", because audit at a past point in time is a must-have.

## 2026-11-07 ~21:45Z: contract 0.3.2 committed; Codex round 2 started; R19 dispatched
- Contract 0.3.2 (01fb285): 136 obligations (new: three erasure, three composition, one evaluator counterexample), 42 thresholds,
  29 mutants, 27 evaluator counterexamples. The generator caught all 14 planted regressions (GS.01 widened, decimal equality allowed,
  EP-RAW-WIRE restored, p50 flatness, engineOfLane keys, empty calibration set, the old 256 requests/s bar, among others).
- Q29 accepts the contract author's five proposals, including `single-execution` as the default mode for every obligation.
- R19 (Sonnet xhigh) researches the three questions R16 left open on XTDB: what read nodes need (log and object store, per-node
  indexing CPU, token travel, memory inside our 11 GiB pool), where the ~15 ms commit floor comes from and which knobs move it, and a
  storage-isolated tenancy design for 1 large plus 1,000 small tenants on both engines.

## 2026-11-07 ~22:05Z: EXP-F02 partly falsified; EXP-002 QLever baseline merged; EXP-F02b dispatched
- **F02 learning: "exact" in the spec is only as good as the encoding actually used.** Five silent changes where ProjectionSpec claimed
  exactness: JSON loses -0 everywhere (ledger included: `packValue` uses JSON.stringify and CanonicalJson normalizes -0); XTDB card-many
  DOUBLE as one JSON parameter turns -0 into 0 (array-cast writes keep it); instant -0 becomes 0; XTDB TIMESTAMPTZ via driver defaults
  turns year 0001 into 2001 and drops microseconds (text reads are exact); QLever `_native` shadows flagged exact but exported through
  `%.13g` (`numericShadowIsExact` repeated the F1 bug). Ruled Q30: reject at qualified write routes, pin the proven encodings in
  ProjectionSpec, fix the QLever predicate at the root. EXP-F02b fixes; the falsifier (lab/falsifiers/wire) is now on main as a
  regression tool and should run on every promotion that touches codecs.
- **EXP-002 learning: QLever's planner budget, not the memory cap, decided G1.** Default budget 1500 OOM-killed the engine at 2.5 GiB
  during planning (0/88); budget 1 passed 88/88 with the f1 profile at a 347 MiB peak (native queries about 23% slower than budget 100).
  The dev config now runs `-j 4 -c 512M -e 128M -s 10s`, planner budget 1, no unbounded logs.
- **EXP-002 learning, P2 on QLever: update latency grows with the delta.** 7 ms median on a fresh engine, 494 ms and then 1.3 s as the
  delta grew, max 59 s. A QLever source of truth or current index must bound the delta (online `rebuild-index` on a schedule or a delta
  size trigger) and amortize the fixed per-update cost (group commit), or P2 fails by orders of magnitude. This is the core of EXP-P2Q.
- **EXP-002 learning, C8 on QLever: reads still write.** 14 of 71 G2 tasks write scratch graphs through `BasisRelations` (about 62
  updates per run) and `recursion.ts` writes on the Datalog path. Under P1 those writes compete with real commits on QLever's FIFO
  pool (R18) and grow the delta; C8's read-only frontier loop is a P1 and P2 fix on QLever, not only a correctness item.
- G4 counterexamples confirmed on QLever (identical current and reopen): ICU string order where codepoint order is expected, and
  decorrelated correlated NOT EXISTS; EXP-Q03 (order keys, EXISTS re-binding) is the fix track.

## 2026-11-07 ~22:30Z: Codex round 2 on plan v2.1 and contract 0.3.2: 7 closed, 7 partial, 6 new, NOT READY
- **Learning: a fix described in prose is not a fix until the generated contract enforces it.** Codex checked the compiled
  obligations, not TARGETS, and found loopholes the prose hid: P2 could pass by rejecting most commands with typed errors (Q31a now
  requires every oracle-valid command to publish, with a bounded queue); the forced P1 mutations would have made faster readers
  generate more writes, so candidates would no longer see the same trace (Q31b: split reads straddle existing trace commands).
- **Learning: "ACK only after the current index catches up" turns an index outage into a commit outage.** Q31e reverses Q28: the source
  ACKs after its own publication and read-your-own-write is kept by routing the pull to an eligible reader. This keeps P2 alive through
  GS.04b and makes the current index a fast path, not a correctness dependency.
- **Learning: a watermark proves reachability, not reconstructability.** A current-only index past basis B cannot answer at B unless B
  lies inside the validity interval of every attribute read (Q31d); erasure adds a second frontier independent of the requested basis
  (Q31f), or an old-basis read could return an erased value from a lagging index.
- **Learning: non-dense positions need coordinates, not just "use the log offset".** One engine transaction can hold several Triplex
  transacts, so positions are (stream, epoch, offset, ordinal) with a fully resolved prefix as the watermark (Q31c); four falsifiers
  (nested cuts, abort gap, crash between append and resolution, resume at an abort gap) gate any comparative claim. Sent to EXP-P2X.
- **Learning: the orchestrator can author W0, but coverage must be frozen and reviewed independently** (Q31i), or 100k no-op
  evaluations satisfy P5. Floors sent to EXP-D01a; V-D01 reviews before W0's hashes are pinned.
- Contract 0.3.3 (Q29, Q31) is with A01. Codex round 3 after 0.3.3 compiles.

## 2026-11-07 ~22:45Z: hourly learnings pass (NORTH-STAR reread first)
Where each priority stands, from evidence so far (research probes and baselines; no NS receipts exist yet):

| Priority | XTDB | QLever | Next experiment |
| --- | --- | --- | --- |
| P1 pinned reads, never block writers | exact, lock-free; fails by shared CPU at 4+ readers on one node (R16) | FIFO pool, no priority (R18); reads still write scratch graphs (EXP-002) | R19 (read nodes) then a follower layer swap; C8 read-only frontier on QLever |
| P2 per-subject commits | correct; p50 16-24 ms on a loaded host; scope-wide counter serializes a scope | 7 ms fresh, grows with delta to seconds (EXP-002) | EXP-P2X (running); EXP-P2Q after R17 |
| P3 change feed | none native; same-tx feed row plus one log tailer, lag p99 about 120 ms | log of record is the feed (design) | EXP-P2X includes it; CF01-Q with P2Q |
| P4 current values | flat with history for one subject; multi-query pulls 35-40 ms | named graphs share delta and rebuild (R18) | EXP-X04 world document with validity interval |
| P5 release sweep | token pins nothing; 100k in about 91 s under load | not measured | EXP-D01 (W0) then S5 |

- **Learnings are current** through Codex round 2, contract 0.3.3, EXP-F02, EXP-002, R16 and R18.
- **Research queue (no agent slot free; all 10 busy):** R20, order-preserving encodings for arbitrary-precision decimal strings and
  their QLever lexical order keys (HBase OrderedBytes, CockroachDB's decimal key encoding, the FoundationDB tuple layer, PostgreSQL
  numeric), because Q18/Q22 need a proven encoding for precision above 15 before the decimal kind can be built. R17 already covers the
  QLever delta lifecycle and group commit (its probe outputs include latency at delta sizes 0 to 1M), so that is not queued twice.
- **Watch item:** EXP-X02 has waited on its own live-check rerun for over an hour; its worktree shows a G2 run at 20:12Z and the
  workload process alive, so it is progressing, not stuck.

## 2026-11-07 ~23:00Z: R19 landed; EXP-X05 (read-only follower) dispatched
- **P1 learning: XTDB read nodes need no Kafka and no object store on our pinned image.** A second container on the same named
  volume with `readOnlyDatabases: true` follows the writer through the replica log (inotify) and shared storage, never claims
  leadership, never compacts, and applies already-resolved rows only (ReadOnlyLocalLog.kt, LogProcessor.kt:280, Database.kt:279,328;
  upstream read_only_node_test.clj, same JVM only). This corrects R16 ("horizontal reads need Kafka") and saves 1.5-2.5 GiB of pool.
  Risks to test: cross-container inotify; a half-written last record throws and kills the follower (no catch); a second read-write
  process would corrupt the log silently (no file locks), so the harness must refuse it. EXP-X05 is the top-priority experiment now.
- **P1 learning, token protocol:** a snapshot token on a lagging follower raises `0B000` (does not wait); an await token waits up to a
  hard-coded 60 s; a default basis silently reads whatever the follower has. Every follower read sends AWAIT_TOKEN and SNAPSHOT_TOKEN
  together. Tokens are node-wide across attached databases, so one lagging tenant database can fail a pinned read on another.
- **P1 learning, connections:** `server.numThreads` is one virtual thread per connection plus an equal queue: connections 43-84 hang,
  the 85th is refused. Raise it (about 300 for 256 readers) and cap in-flight queries in the client; no pgbouncer (session-state tokens).
- **P2 learning: the ~15 ms commit floor is mostly not fsync.** Two sequential durable appends (source log, replica log) at 0.4-0.9 ms
  each explain 1-2 ms; group commit is fixed at 10 messages per fsync. Levers are pipelining BEGIN, statements and COMMIT in one write,
  fewer statements per command, CPU pinning for the writer, and LOG on its own filesystem (p99). COMMIT ASYNC does not help the ACK
  (no outcome). These go to EXP-P2X's follow-up (R19 E2) after its A0 comparison.
- **Tenancy learning: silo-per-tenant has an idle cost.** Each attached database's leader appends a heartbeat every idle 100 ms
  (hard-coded): about 10 fsyncs a second and 27 MB a day of never-trimmed log per database, so 1,000 attached databases would need about
  10,000 fsyncs a second against a ceiling near 1,700. Every query resolves all attached databases. XTDB 2.2.0 has no per-database
  authorization and no encryption. Provisional design: large tenant siloed; small tenants pooled in about 10 cell databases with a
  constant table set, tenant-prefixed ids and per-tenant envelope encryption. QLever: large tenant in its own index; small tenants in
  1-10 cell indexes, one named graph each, one log of record per tenant (a server per tenant would need 31 GB idle).
- **Decisions for Sam (from R19), provisional rulings in force:** (1) pooled cells with per-tenant encryption count as storage-layer
  isolation for small tenants (R19 found no standard that accepts crypto isolation alone, so this is Sam's call); (2) assume 10% of small
  tenants (100) are active in any 15-minute window until Sam gives a number.
- 23:10Z: contract 0.3.3 committed (89376e1; Q29-Q32 compiled, 142 obligations, 35 regression checks all caught). Codex round 3
  started on it. R20 (order-preserving decimal encodings, both lanes, with a property test) dispatched from the research queue.

## 2026-11-07 ~23:25Z: EXP-O02 conforms (0 DISAGREE on 49 vectors); V-O02 dispatched; Q33
- **Learning: conformance broke the old converter, which is expected and dangerous.** The original V-O01 converter now reports 17
  DISAGREE plus 5 CONVERTER-ERROR, all from output shapes the contract required (4.7 error ids, AMB-02 field names, `find` returning
  documents). The author patched a copy (P1 to P9) and got 0 DISAGREE. A patch that maps names can also hide a real disagreement, so
  V-O02 reviews each patch and plants new wrong expectations in exactly the patched areas before anything is accepted.
- **Learning: lane-specific numeric outcomes were missing from 10 golden items** (G1-I64-01, Q8F-02, G1-I64-02 min-exact, seven G5-SUM
  fixtures): they assume every lane commits values beyond ±2^59. A QLever-lane oracle run found them; the contract records QLever's
  outcome as rejection at write (Q33i, cross-checked with Q31j).
- **Ruling Q33a refines Sam's numeric rule for JSON numbers:** accepted only if it reads back as written (0.1 yes; 9007199254740993 no).
  Q33d makes every cross-family ordered comparison a typed preflight error instead of `false`.
- Oracle follow-up EXP-O03 (after V-O02): decimal `divide`, Q30 wire guards, Q31c coordinates, Q33 rulings.

## 2026-11-07 ~23:35Z: Codex round 3: 11 closed, 2 partial, 5 new, NOT READY (converging: 14 -> 13 -> 7 open)
- **Learning: any self-declared exemption is forgeable.** Q32e let a receipt say `positionsDense: true` and skip the falsifiers; Q34a
  replaces it with an allowlist of A0 allocator source hashes checked by the evaluator. Rule for the loop: exemptions are granted by
  evidence the evaluator checks, never by a field the candidate fills in.
- **Learning: a value-level guard and the journal share one encoding path.** The journal stores each change as a JSON-valued assertion
  (transactionMetadata.ts:20, :55), so the Q30a "reject -0 in JSON" guard would have rejected the journal of a valid number -0 assertion.
  Q34c separates user JSON validation from lossless typed journal encoding; EXP-F02b was told before it shipped the guard.
- **Learning: gates attached to closure do not protect comparisons.** Screening receipts could still crown a winner without the position
  and W0 prerequisites; Q34d checks prerequisites when any comparative or promotion claim is admitted.
- Contract 0.3.4 (Q33, Q34; regenerate twice, byte-identical) waits for a free agent slot (all 10 busy); Codex round 4 after it.

## 2026-11-07 ~23:50Z: R20 landed: TDK1 decimal order key; Q35; A01 compiling 0.3.4
- **Learning: QLever's ICU string order is safe inside `[0-9a-z]`.** ICU equals codepoint order there (R5's probe: 47,988 strings on
  the pinned image; R20's system-ICU check: 0 disagreements over 300k random pairs), and breaks on punctuation and mixed case (1,099 of
  4,465 ASCII pairs differ). A key alphabet of digits plus lowercase letters needs no hex wrapping, so one key string works byte for
  byte on XTDB (no collation on 2.2.0: unsigned UTF-8 byte order) and on QLever. A negative control with a `~` terminator passed
  codepoint order and failed ICU on 44 of 100k pairs, which is the bug this rule prevents.
- **Learning: a value-determined key beats a declaration-determined one.** Fixed-width keys (offset scaled integers) change on every
  widening and silently misorder values across attributes of different scale (5 at (3,0) sorted after 0.50 at (3,2)); TDK1 depends on
  the value only, so widening is always metadata-only and cross-scale comparison is exact. Ruled Q35: one decimal representation (TDK1
  key authoritative plus derived text), amending Q18's scaled-integer storage for the decimal kind; money as integer cents stays
  available through the integer kind.
- R20's property suite (0 failures; 5/5 mutant encoders caught) becomes the decimal kind's unit tests; its engine-side gates V3 to V7
  become contract obligations in 0.3.4.

## 2026-11-08 ~00:05Z: W0 drafted (11 rules, 45 cases); Q36
- **Learning: the coverage floors caught my own parameter error.** TARGETS said "Zipf s = 1.0 over 2,000 locations, so the largest
  location holds hundreds of workers"; the W0 author computed that s = 1.0 puts about 12,100 workers (12% of 100k) at one location.
  Q36g sets s = 0.5 (largest about 1,100, mean 50). Stating the intent next to the parameter is what made the mismatch visible.
- **Learning: work item identity must not include the release hash,** or every activation republishes all open work under new ids and
  floods the outbox in exactly the P5 window. Q36a: id over (subject, rule, kind, key); version over (release, inputs, payload); delivery
  key (id, version); unchanged payloads publish nothing.
- Sequence from here: D01a revises per Q36; V-D01 independent review and hash pin; then a TypeScript kernel and the O-DOMAIN oracle
  written by two different agents from SPEC.md alone, and their disagreements count as spec bugs.

## 2026-11-08 ~00:20Z: V-O02 FIX-FIRST (answers correct; patch hides nothing); EXP-O03 started
- **Learning: re-judging without the converter is the check that clears a patched converter.** The verifier re-judged the 47 items
  whose verdict the patch changed directly from oracle output, golden vectors and obligations.json (47/47), and planted 22 new errors in
  the patched areas (22/22 caught; the original converter catches only 9/22). Keep `judge_changed.py` as the standard tool when a
  converter changes.
- **Learning: an oracle's own tests should read the current contract,** and they did: merged with 0.3.3 they failed 8 of 222 (missing
  4.7 rows for the new decimal and wire errors). That is the drift alarm working. F1 fixes it in two files.
- **Learning: confident wrong answers on rules no vector uses are still dangerous** (11 on 0.3.3 rules, for example -0 inside JSON
  committing). They go to EXP-O03 as "implement exactly or refuse with X-NOT-MODELED", so dependent obligations fail closed.
- W01's scenario expectations came from the non-conforming O-REPLAY 0.1; W01 switches to the O02 branch now and records oracle hashes
  per expectation so the final regeneration after the pin is mechanical.
- 00:35Z: W0 revised per Q36 (a10cd1e): work item id over (subject, rule, kind, key), version over (release, inputs, payload), outbox
  publishes only a new id or a changed payload (the author resolved a conflict between Q36a's two clauses; accepted as Q36a-clarified).
  At s = 0.5 the largest location holds about 1,125 placements and all four coverage floors still hold (R2 changes 62.3%; lowest rule
  firing 7.9%; 3+ work items 1.97% / 2.98%). V-D01 dispatched; it measures the floors on its own generated population with an
  evaluator kept outside the repo so the later implementers stay independent.

## 2026-11-08 ~00:55Z: R17 (QLever fit) landed; contract 0.3.4; O-TDK1 in repo; EXP-P2Q and EXP-C8 dispatched; Codex round 4
- **QLever P1 learning: the semantics are native, the bars are missed by CPU.** One request is one snapshot (0 wrong answers in 26,413
  stored pulls); on 2 CPUs reads saturate at 4 readers (65 pulls/s) and the writer is CPU-starved, not locked (15 ms alone, 114 ms with 4
  readers, 826 ms with 64). Same lesson as XTDB (R16): readers belong on their own process and cores.
- **QLever P2 learning: the ACK must not wait for QLever.** ACK p50 from the host is 11 / 34 / 129 ms at delta 0 / 100k / 500k; a host
  log fsync is about 3 ms. Q31e already allows ACK at the source's publication, so EXP-P2Q makes the host log plus broker the source of
  truth, publishes to QLever asynchronously with group commit, and serves read-your-own-write through an overlay of unpublished frames.
- **QLever P3 learning: the host log is the feed and met every bar** (0 gaps, exact resume after kill -9), but a tailer sees a frame about
  3 ms before fsync returns, so consumers read only up to a durable watermark.
- **QLever P4/P5 learning: QLever is fast at set-at-a-time work, slow at per-subject round trips.** Pulls p50 23-33 ms and 35-45 per core,
  flat from 7M to 74M triples; bundle rows reach 1.2 ms; batched VALUES sweeps reach 815-825 pulls/s per core; one streamed export of the
  whole current graph (33 s) stays pinned through 677 updates and a rebuild. Sweeps in the live process raise live p99 1.7x to 3x, so run
  them on a separate read-only process. R17's role call: QLever for read replicas, history and the analytical copy; never the source of
  truth or the feed.
- **Three QLever engine facts that change client code:** no TCP_NODELAY (keep-alive adds about 40 ms per call; open a connection per
  request); every update empties the whole result cache; the planner does not push a temporal FILTER or VALUES into the ledger scan
  (8.5M-row scans; filter in the kernel).
- **Erasure on QLever:** delete plus rebuild-index keeps the deleted literal in the vocabulary (rebuild merges old and new words), plus
  `previous.*` and logs. Crypto-shredding (ciphertext PII) or a full reindex from the log is required (matches Q24).
- **Precision on QLever:** 8 silent changes; a 6-kind write validator gave 0 wrong round trips in 6,241 accepted values (feeds F02b).
- Contract 0.3.4 committed (60e4c57): 147 obligations, regenerates byte-identically; Q37 accepted the contract author's proposals; the
  TDK1 reference and 2,017 ordered vectors are in lab/oracles/decimal/ (reproducible from seed 20261108).
- EXP-C8 dispatched: removes every write from read paths on both lanes (XTDB scratch tables cost a COMMIT SYNC per recursion round).

## 2026-11-08 ~01:15Z: Codex round 4: 2 closed, 3 still open, 3 new, NOT READY; Q38
- **Learning: a source-hash allowlist does not prove behavior.** Codex changed `withTransaction`'s exported binding outside the five
  hashed blocks; the allowlist still said "dense". Q38a removes every density exemption: all compositions, A0 included, run the four
  cheap position falsifiers. Rule for the loop: prove behavior by tests that run, not by hashes of the code that is supposed to behave.
- **Learning: my own generator rounded silently.** `Decimal(n).scaleb(-s)` rounds to Python's 28-digit default context; 518 of 2,000
  vectors lost digits, and because input and expected key were computed from the same rounded value they still agreed. The same bug sat
  in R20's adjacent-values suite. Fixed with exact construction plus a Fraction assertion; 526 vectors now exceed 28 digits; the suite
  still has 0 failures with true adjacency. Rule: every Decimal built from integers in an oracle asserts equality with a Fraction.
- **Learning: a content hash is not a delivery identity.** R1 then R2 then R1 returns the original (release, inputs, payload), so an
  (id, version) key would let a receiver suppress the return to the earlier payload. Q38f: a durable per-id publication sequence is the
  delivery identity, persisted atomically with the outbox record.
- **Learning: claim admission must read evidence, not flags.** `admit_claim` returned QUALIFIED for A0 with a null O-REPLAY pin because it
  trusted supplied case names and a Boolean. Q38b derives every prerequisite from receipts and enforces Q37b.
- Process fix (Q38c): I appended Q37 to RULINGS after the contract was generated, so `--verify` failed. From now on every RULINGS change
  is compiled and verified before commit, or listed as recorded-not-compiled.
- Contract 0.3.5 (Q37, Q38) waits for a free agent slot (all 10 busy).

## 2026-11-08 ~01:30Z: EXP-X02 PROGRESSED; A01 compiling 0.3.5
- **XTQL parity learning: both languages give the same exact answers; XTQL is slower under load.** Pure XTQL 142/142 (diagnostic) and
  pure SQL 142/142 (candidate) on G2; the XTQL candidate run timed out on 8 and 16 tasks while the shared dev XTDB sat at 200% CPU (no
  wrong or impure answer). XTQL recursion by depth unrolling took 22.5 s at depth 6 against 0.6 s in SQL, which EXP-C8's frontier loop
  replaces. Re-run the XTQL candidate on an exclusive slot before judging it.
- **New XTDB hazard (Q39a): DECIMAL to BIGINT rounds through a double** (1e18 + 4 reads back as 1e18). Exact engine-side sums read the
  DECIMAL result as text. Also fixed in X02: R12's split-sum recombination overflowed on totals that fit in int64.
- X02's live checks are the pattern to copy: hand-derived controls in both languages (100/100), 21/21 mutants killed, and a writer
  between calls that must stay invisible at the pinned cut.
- Queued for the next free slot: V-X02 independent verification (promotion gate), including the XTQL candidate rerun on an exclusive slot.

## 2026-11-08 ~01:40Z: hourly learnings pass (NORTH-STAR reread first)
- **Learnings are current** through EXP-X02, Codex round 4, R17, R19, R20, V-O02 and the W0 draft. No report is unprocessed.
- **What the evidence says about direction, by priority:**
  - P1: on both engines reads never lock writers but starve them of CPU on a shared node (R16, R17). Separate read processes are the
    lever: EXP-X05 (XTDB read-only follower, no Kafka needed per R19) is running; QLever read replicas fed from the host log follow P2Q.
  - P2: XTDB is correct with a ~15 ms floor mostly outside fsync (R19); EXP-P2X tests per-subject CAS. QLever's ACK must not wait for
    QLever (R17); EXP-P2Q tests ACK at the host log's durable frame.
  - P3: both lanes get their feed from a log Triplex controls (XTDB same-tx feed row plus one tailer; QLever host log), with durable
    watermarks and keyed effects.
  - P4: per-subject world documents (R18 X1) on XTDB; bundle rows on QLever. Not started (PLAN 8 order 5).
  - P5: W0 under independent review (V-D01); sweeps on a separate read-only process on both engines.
- **New research direction (queued, R21):** both pinned engines may be behind fixes that change the plan. R17 found QLever upstream
  #3607 (merged 2026-10-06: snapshot creation proportional to the update; authors report 700 ms to 60 ms per update at 500k delta) and
  open #3267/#3612, none in 0.6.0; QLever also lacks TCP_NODELAY and clears the whole cache per update. XTDB 2.2.0 lacks per-database
  authorization, encryption and a change stream, and hard-codes the 100 ms idle heartbeat (R19). R21 surveys what QLever master and XTDB
  releases after 2.2.0 change for P1 to P5 and the requirements, what an upgrade would cost (new image digests, re-qualification), and
  whether EXP-P2Q's overlay design is still needed on a newer QLever. Queued first for the next free slot, ahead of V-X02, because it can
  change the design of experiments already running.
- No research agent was started this pass: all 10 slots are busy.

## 2026-11-08 ~01:55Z: V-D01 FIX-FIRST on W0; Q40; W0-1.1.0 in progress
- **Learning: a spec can be deterministic and still unrepresentative.** A second implementer matched all 45 W0 cases byte for byte and
  all four coverage floors held on a measured 100k population, yet generated worlds hold 6 to 31 facts (p50 17) over one reference hop,
  while P4's frozen pull mix is 50 to 2,000 facts over 3 to 6 hops. A 100k sweep over those worlds reads 1.6M facts instead of 25M-50M,
  so P5 could pass on a toy. Q40a adds rule-neutral ballast drawn from P4's buckets; Q40b moves the wage floor to a second hop so the
  dependency index must follow two references.
- **Learning: idempotent publication also needs an order.** Even with Q38f's publication sequence, a late older-basis evaluation (an
  in-flight reconcile on the old release, GS.10) would publish after a newer one and leave the receiver stale. Q40d: per subject, only
  newer-basis evaluations publish.
- **Learning: misreading mutants are a cheap way to find missing cases.** Six plausible misreadings passed all 45 cases; each changes up
  to 2% of population outputs. Q40e adds a case for each.
- **Learning: recurring notices need a retirement record** (Q40h), or a second FNC notice is never delivered.
- **Learning: a release that touches every subject cannot test blast-radius selection.** Q40i adds R3 (one rule, narrow read set).
- 02:10Z: contract 0.3.5 committed (15a07b6): 149 obligations, 74 planted regressions caught, `--verify` byte-identical; 124 obligations
  fail closed on null oracle pins (O-REPLAY, O-TDK1) until those oracles are accepted. The Q38c check worked the first time it mattered:
  Q40 landed in RULINGS.md mid-compile and the generator refused until it was listed as recorded-not-compiled. Rulings the contract has
  not compiled yet now live in lab/acceptance/RULINGS-PENDING.md (Q41). R21 (engine-upgrade survey) and Codex round 5 started.

## 2026-11-08 ~02:30Z: Codex round 5: 6 closed, 2 partial, 3 new (converging: 14, 13, 7, 6, 5 open)
- **Learning: a structural receipt check is a bypass waiting for the pins.** Codex fabricated a receipt with all eight position case names,
  all-zero object hashes and a different binary; the reference `receipt_valid` accepted it, and with simulated accepted oracle pins the claim
  qualified. Today's null pins make it DIAGNOSTIC, so nothing was wrongly claimed, but this must be closed before any oracle is pinned:
  EXP-E01 builds a lab evaluator that opens objects, binds binaries to source through a manifest, checks freshness and requires the claim's
  own measurement receipts and a matched control (Q42a).
- **Learning: sender ordering is not receiver ordering.** Unique (id, seq) deliveries arriving reversed (seq 2, then a delayed seq 1) leave
  a deduplicating receiver on the older payload. Q42b: receivers never regress a projection and process every-transition effects in order
  with gap recovery; W0 gains a `receive` operation so the expected receiver state is oracle-computed.
- **Learning: every piece of outbox state is one atomic unit** (basis guard, retirement, sequence, latest payload, outbox records), or a
  crash between them reopens the stale-publication window (Q42c).
- 02:45Z: EXP-O03 landed: O-REPLAY 0.3.0 gives 0 confident wrong answers on V-O02's 0.3.3 probe (11 before), refuses only erasure,
  268/268 tests, converter results unchanged item by item. Learning: an oracle racing a moving contract needs a final alignment pass to
  the contract version it will be pinned against; 0.3.4 renamed two decimal error ids after O03 started. Alignment to 0.3.5 (Q43) runs
  now; then the independent re-check (resume the V-O02 verifier), then the pin.
- 02:55Z goal check-in: N01, W01, P2X, P2Q, C8, D01a and O03 are all writing files (progressing); F02b waits on its own G1 run.
  **Incident:** the shared QLever dev resident was OOM-killed at its 2.5 GiB cap at 20:57Z (during a 2.4 s update after a 145-tuple
  VALUES query) and stayed down about 47 minutes because no agent owns restarting a shared resident. The orchestrator restarted it
  (holder EXP-000). Learning: shared residents need an owner who watches them; I check them at every check-in. Several agents loading
  one 2.5 GiB QLever at once is the likely cause; measurements belong on exclusive slots.
  **Stall:** EXP-X05 had stopped with no background work, waiting for 5.1 GiB of pool while 2.0 GiB is free; told it to finish
  engine-free work, wait in a background loop, and fall back to a provisional smaller run after 90 minutes.

## 2026-11-08 ~03:10Z: R21 engine-upgrade survey: stay pinned on both engines
- **QLever:** no release after 0.6.0 (404 commits on master). #3607 (part 2 of 4 of the update-cost umbrella) is merged; parts 3/4 are
  unused or open, so the quoted "700 ms to 60 ms at 500k delta" exists in no merged state. Even fully merged, update p50 at 500k delta
  stays near 25-60 ms, above P2's bars, so EXP-P2Q's ACK-at-host-log design stays. Two cheap levers on 0.6.0 today: `--persist-updates`
  off (the host log already replays; persisting rewrites the whole delta per update, about 45 of 129 ms at 500k) and
  `--rebuild-keep-previous-index-dirs none` (no pre-erasure `previous.*` copies). Unchanged on master: whole-cache clear per update, no
  TCP_NODELAY, vocabulary never drops words on rebuild, 60-bit integers. Master cannot load 0.6.0 indexes without `qlever-upgrade-index`.
- **XTDB:** no release after 2.2.0; 2.2.1 milestone closed (fixes #6345 mark join, #6174 slow plans after restart, #6358 erased rows
  leaking through system-time windows). Still open: #6313, #6151, the token issues; no change stream (#2454); no per-database auth or
  encryption; the idle heartbeat, read-only log reader, LocalLog and numThreads are byte-identical to 2.2.0, so R16/R19 hazards stand.
- **Decisions:** stay pinned on both; QLever side-by-side E1 (0.6.0 vs #3607 vs master, persistence on/off) queued as EXP-Q07 when an
  exclusive QLever slot frees; XTDB re-qualification on 2.2.1 the day it is tagged (a rehearsal on nightly-20261106 can run earlier).
  P2's p50 bar stays at 10 ms (only Sam can loosen a bar). Filing the DECIMAL-cast and `= ANY` findings upstream would publish lab
  findings, so that is Sam's call, flagged in STATE.
- 03:20Z: O-REPLAY 0.3.1 (8cc2c26) aligned to contract 0.3.5: 300/300 tests, 0 wrong answers on the probe, converter results unchanged,
  and a new reverse check fails if the oracle keeps an error id the contract dropped. The V-O02 verifier is re-checking it (V-O03) with
  the probe extended to 0.3.5's rules; on ACCEPT the oracle merges and its hashes are pinned in contract 0.3.6, which unblocks the
  obligations it can close (claims still also need EXP-E01's evaluator).
- 03:35Z: W0-1.1.0 built (50d92ef): 82 cases; R3 is the narrow release (4.3% of subjects change, all through OT); worlds now average
  about 447 facts over 3-6 hops (a 100k sweep reads about 44.7M facts, up from 1.6M), so P5 tests something close to Onboarded's real pull
  size. Floor 4 (3+ work items) is thinner (about 1.65% expected) and the re-review measures it on the real population. V-D01 re-review
  running; then the pin and the two independent implementations (TS kernel, O-DOMAIN).

## 2026-11-08 ~22:10Z: EXP-F02b (XTDB proven); infrastructure pressure
- **F02b result:** XTDB falsifier 0 silent changes (from 25 silent plus 3 spec gaps); the journal keeps number -0 by writing `-0` as JSON
  text, which JSON.parse reads back exactly, so canonical identity and the journal's shape stay unchanged. QLever rerun owed.
- **Infrastructure learning: the shared dev residents are the bottleneck and the measurement noise.** The QLever dev resident was
  OOM-killed three times (20:47Z, 20:56Z, 22:02Z): its persisted delta grew under every agent's writes and reloaded on each restart, so a
  plain restart died again 17 minutes later. Fixed by raising it to 3.5 GiB (-m 2000M) and recreating it fresh (5c684bd). The XTDB dev
  resident runs at 200% CPU under scenario load, so a G1 that took 11 s took 482 s and timed out. The host itself is saturated: 36 GiB with
  about 14 GiB compressed and load average 12-13 on 12 cores (Sam's default colima VM also runs), so the triplex2 VM cannot grow.
- **Policy until pressure drops:** no new agent dispatches beyond replacing finished ones on light, engine-free work; heavy local commands
  go through lab/bin/heavy.mjs (4 tokens); gate reruns one at a time; latency measurements are judged only relatively (same slot, same
  window), never against absolute bars. The dev QLever resident needs a periodic fresh restart or rebuild while agents share it.
- 22:25Z: W0-1.1.0 re-review: the reviewer's independent evaluator matches all 82 cases and the floors hold on 44.5M facts; only small
  fixes remain (two case-file defects, two unpinned receive dedup rules, the fingerprint recipe, SPEC contradictions). Learning: static
  read sets cannot narrow a release by subject, only by rule (R3's OT pair is in every placement's dependencies, so the index reaches all
  100,000 while 4,291 change); Q44b makes R3 a jurisdiction-scoped release so P5 exercises subject selection through the reverse index.
  Learning: a JSON round trip in a case generator normalized `1.65e3` to `1650.0`, so the exponent test tested nothing; validate.py now
  asserts raw token text. W0-1.1.1 in progress; a delta check then the pin.

## 2026-11-08 ~22:40Z: MILESTONE: O-REPLAY accepted and merged (scoped pin)
- After O01 (built), V-O01 (FIX-FIRST), O02 (conformance), V-O02 (FIX-FIRST), O03 (deltas and alignment), V-O03 ACCEPTED O-REPLAY 0.3.1
  at 8cc2c26: 300/300 tests, 0 differences against the previous version's answers on all 87 golden runs per lane, 22/22 planted errors
  and 8/8 mutants caught, and a fresh 119-probe check of contract 0.3.5 written by the verifier (116 match; the 3 wrong answers are one
  rule, DR-JSON-CONVERT, now excluded from the pin). It may close 106 of the 119 obligations that use it; 11 erasure obligations stay
  blocked through its X-NOT-MODELED refusal until EXP-O04 models erasure.
- Learning: two independent authors (G01 vectors, O01 oracle) plus an independent verifier converged in three rounds; each round's
  verifier probe was written from the contract, not from the oracle, which is what found DR-JSON-CONVERT after the author reported zero
  wrong answers on its own probe set. A coverage test only guards the tables it lists (`decimalRouting` was missing).
- Next: contract 0.3.6 pins the oracle (A01); W01 regenerates scenario expectations from the pinned oracle; EXP-O04 (F2 plus erasure
  modeling) queued for the oracle author; claims still also need EXP-E01's evaluator.
- 22:50Z: EXP-F02b: zero silent value changes on both engines (38 before, 0 after over 1,762 records). The fresh QLever resident ran the
  ledger section in 21 s against 919 s on the old one, which confirms the growing persisted delta was the dev resident's problem. Next:
  G1 qlever with the f1 profile, then an independent verifier (V-F02b) before merge; G1 xtdb in a quiet window.

## 2026-11-08 ~23:00Z: EXP-N01 merged (driver built, no A0 numbers); exclusive slots are the bottleneck
- **The pool cannot hold both dev residents plus the follower experiment plus an A0 run.** xtdb-dev 3.0 + qlever-dev 3.5 leave 4.5 GiB
  for exclusive work; X05 needs a 3.5 GiB writer plus a follower, and N01's A0 needs a 3.5 GiB slot. So exclusive slots run one at a
  time, in north-star order: EXP-P2X (s1, now) -> EXP-X05 (s2 plus a follower capped at about 1 GiB) -> EXP-N01 A0 on XTDB (zero-readers
  run, then the ladder with --baseline) -> V-X02's XTQL rerun. QLever exclusive work (EXP-P2Q measurement, A0 QLever, EXP-Q07) needs
  one of the dev residents paused or the XTDB queue drained.
- **Seeding learning:** transact-based seeding cannot reach the 10k rung on QLever's current adapter (about 30 facts/s); A0 seeding goes
  through a bulk path (QLever index build from a log file; XTDB batched inserts), and the measured window starts after seeding.
- **Contention learning:** XTDB commits in one runtime collide on the scope-wide position CAS under the driver's concurrency, the same root
  cause EXP-P2X attacks; until P2X lands, A0 uses `public-queued`.
- 23:15Z: contract 0.3.6 committed (2c3bac6): Q40-Q45 compiled, nothing recorded-not-compiled, O-REPLAY BUILT-ACCEPTED at 8cc2c26 with a
  per-oracle exclusion list; the generator's own pin-scope computation matches V-O03 exactly (119 uses, 106 closable, 13 blocked) and now
  fails if they diverge; 151 obligations; 101/101 applicable regressions caught. Claim admission (Q42a) now has fixtures for all-zero
  hashes, stale binaries, stale receipts, too few fault repetitions, missing measurement or control, a control from another window, unknown
  ids, an empty store, null pins, excluded and refused obligations. Codex round 6 started; EXP-O04 (F2 plus erasure) started.

## 2026-11-08 ~23:30Z: Codex round 6: 3 closed, 2 partial, 2 new (open count 14, 13, 7, 6, 5, 4)
- **Learning: hashing evidence proves it exists, not what it says.** With the real accepted pins, Codex qualified a claim whose verifier
  object was `{"notAVerifierRecord":true}` and whose case objects recorded oracle exit 2 / X-NOT-MODELED labelled PASS. Q47a: admission
  validates record schemas and recomputes every verdict from retained raw results.
- **Learning: `None == None` is a matched control.** A claim with no trace hash and no window matched a control with none. Q47b: nonempty
  validated workload identity on both sides, and the A0 control comes from a frozen registry, never from the claimant.
- **Learning: an oracle scope list cannot replace running the oracle.** A decimal (5,2) to (6,3) redeclaration reached through CS-MIGRATION
  was refused by O-REPLAY yet classified closable, because refusal matching knew only CS-DECIMAL case names. Q47c: re-judge per case, and
  propagate unsupported-rule dependencies through indirect selections.
- **Self-inflicted:** my Q46 append to RULINGS-PENDING.md broke `--verify` (0.3.6 forbids pending rows). Restored by holding pending rulings
  in the review response file until 0.3.7 implements Q47d (pending rows allowed, no authority, recorded).
- Contract 0.3.7 (Q46, Q47) waits for a free slot; EXP-E01 has Q47a-c now.

## 2026-11-08 ~23:40Z: hourly learnings pass (NORTH-STAR reread first)
- **Learnings are current** through Codex round 6, contract 0.3.6, V-O03, the W0 re-review, EXP-N01, EXP-F02b and R21.
- **Residents:** both dev residents healthy (qlever-dev 607 MiB of 3.5 GiB since the fresh restart; xtdb-dev 2.63 of 3.0 GiB at 204% CPU
  under scenario load). xtdb-s1 (EXP-P2X) sits at 3.30 of 3.5 GiB, close to its cap. Host load average 12.3 / 14.4 / 13.7 on 12 cores.
- **Where evidence points, by priority:** unchanged from the 01:40Z pass; the newest learning is about measurement itself. Every
  measurement this session ran on a saturated host (load 12-14, 14 GiB compressed), so absolute latencies moved 2x to 3x between runs (R17)
  and a gate went from 11 s to 482 s. Relative A/B judgments on one slot and window are the only valid ones, and even those need a
  protocol that cancels drift.
- **Research queued (no slot free; all 10 busy), R22: noise-robust benchmarking on a shared, saturated host.** Interleaved A/B and ABBA
  run orders, paired statistics and bootstrap confidence intervals for p50/p99 differences, how many repetitions a 1.25x bar needs to be
  decided at a stated confidence, CPU isolation available inside colima (docker --cpuset-cpus, cgroup v2 cpu.max, nice/taskset), detecting
  and rejecting windows with host interference (steal time, load average, memory pressure), and prior art (for example the "Producing
  wrong data without doing anything obviously wrong" line of work, Google's benchmarking practice, JMH and hyperfine methodology). It
  feeds EXP-N01's A0 and every A0-versus-candidate verdict (P2X, P2Q, X05).
- 23:55Z: W0-1.1.1 (ada2e90): scoped R3 reaches 9.56% of subjects through the reverse two-hop dependency index and changes 0.41% of them,
  so P5 can now test the difference between "re-run what the index reaches" and "re-run everything"; a sweep may skip the other ~90%.
  V-D01 delta check running (resumed); on ACCEPT: merge W0, pin it, then two independent implementers (TS kernel, O-DOMAIN) reproduce the
  fingerprint.

## 2026-11-09 ~00:10Z: MILESTONE: W0-1.1.1 accepted and merged
- Three review rounds (FIX-FIRST on 1.0.0: worlds too small, outbox order undefined; FIX-FIRST on 1.1.0: two case defects, unpinned
  receive dedup, fingerprint recipe; ACCEPT on 1.1.1). The reviewer's own evaluator, written from SPEC alone, matches all 87 cases byte for
  byte; floors hold on 44.5M generated facts; scoped R3 reaches 9,497 subjects and changes 418, with 0 changed-but-not-reached.
- Learning: misreading mutants and validator mutations were the cheapest review tools: each round's survivors became the next round's
  cases, and the validator now checks raw tokens and recomputes delivery ids and versions.
- EXP-D01c (O-DOMAIN, independent Python from SPEC only) started; the W0 pin closes when it reproduces the fingerprint. The TypeScript
  kernel (EXP-D01b) follows at the next free slot, written by a different agent and checked against O-DOMAIN.
- 00:30Z: EXP-O04: F2 fixed (probe_035 119/119) and erasure modeled (8 of 11 erasure obligations closable on the oracle side; answers on the
  49 vectors unchanged). Ruled Q49: an erasure commit is an ordinary journal transaction that lists identities, never values (so the
  whole-journal comparison works modulo erasure), plus a separate ledger for restore replay; erased values match no value predicate and
  sort last (provisional under the Q24 erasure flag for Sam); JSON numbers convert to decimal as written. The author implements Q49, then
  the V-O03 verifier re-checks before the pin moves.
- 00:40Z: EXP-F02b closed out: 0 silent value changes on both engines; G1 qlever f1 84/88 with timeouts only (478 s against 62 s on main's
  passing run). Learning: with 10 agents on a saturated host there is no quiet window by chance, so gate reruns (F02b G1 xtdb and G1 qlever
  f1, X02's XTQL candidate G2) wait for a scheduled gate window: the orchestrator pauses new dispatches when several agents finish and runs
  the owed gates one at a time through heavy.mjs.

## 2026-11-07 22:50Z (real clock): EXP-P2Q: QLever's ACK no longer depends on its delta (the biggest P2 move so far)
- Same resident, same windows: candidate ACK 4-8 ms p50 against A0's 0.96-7.4 s; on the open-loop trace A0 acknowledged 2 of 114
  commands within the 30 s client timeout while the candidate committed 114/114 at 6.7 ms p50. Offline, with the 50x burst: 4.7 / 25.0 ms
  p50/p99 over 3,414 commands. Inside the P2 bars in every run, judged relatively per Q47b until controlled runs exist.
- Learning: making the host log the source of truth and QLever a replica turns QLever's worst property (update cost growing with the
  delta) into a replication lag, which the overlay and routing absorb; the feed comes for free from the log (0 gaps, 0 duplicates, keyed
  effects survive 100 crashes while the unkeyed control shows 129 duplicates).
- Learning: A0 writes about 750 triples per 10-fact command, 8x R17's 94; the journal encoding inflates QLever's delta on every lane.
- New design direction (Q50a): a broker-side current-entity index, both as the unreachable-replica fallback and as a P4 current layer on
  the host; EXP-Q05 measures it.

## 2026-11-07 22:55Z (real clock, `date -u`): clock correction for this notebook
- The entry headers from "2026-11-07 ~20:45Z" through "2026-11-09 ~00:10Z" carry estimated times that ran ahead of the real clock; the
  real time of this entry is 2026-11-07 22:55Z. Their order is correct; git commit timestamps are the authoritative times. The same
  estimated dates appear in a few REPORT.md headers (saved by the orchestrator) and in STATE's infrastructure policy line.
- From now on every header takes its time from `date -u`.

## 2026-11-07 22:59Z: EXP-P2X and EXP-O04 (Q49) landed; the host log wins the feed on both lanes
- **EXP-P2X (XTDB, subject-stamp commit path):** cross-subject conflicts 0 against A0's 3,376-3,657 CAS rejections; service time 6.5-7.8x
  lower at ~20k commits (A0 grows with history because its asserts scan `scope_key`). Feed exact (0 gaps, order violations, duplicates
  across 5k preload, three traces, 400 crash injections) but lag p99 2.9 s steady, because the consumer's durable write waits in the same
  serial indexer as the writers. The burst overloads both arms on a 2-CPU node; the hot subject (20% of commands) turns optimistic CAS into
  a retry storm that a per-subject queue removes (CAS rejections 4,982 -> 0, committed 569 -> 2,987).
- **Learning: put the change feed and the ACK on a host log for both lanes.** P2Q's broker gave QLever feed lag p99 12.8-24.5 ms and an ACK
  that ignores the engine; XTDB's own feed cannot beat its indexer queue. Q51b: EXP-P2B puts XTDB behind the same broker, with
  subject-stamp as the XTDB-native comparison arm.
- **Learning: both lanes write far too much per command.** XTDB A0 27.6 KB of source log per 10-fact commit (candidate 95.4 KB); QLever A0
  about 750 triples per 10-fact command. One cross-lane experiment (EXP-J01) owns bytes per commit (Q51d); the 100k rung waits on it.
- **Learning: per-subject queues belong in the runtime, not the driver** (Q51a), with a bound and a typed `Overloaded`.
- **EXP-O04 Q49:** O-REPLAY 0.4.1 (a9c1327) models erasure as an ordinary journal transaction; 342/342 tests; conformance unchanged item by
  item on both lanes; all 11 erasure obligations closable on the oracle side. Residual RULING-NEEDED items ruled as Q52 (held).
- Dispatched: V-P2Q (new verifier) and the V-O04 re-check (resumed verifier). Running: 10 of 10.

## 2026-11-07 23:03Z: MILESTONE: O-DOMAIN reproduced W0-1.1.1 exactly on its first run
- An independent implementation written from SPEC.md alone matched 87/87 golden cases and all six 100k fingerprint values (basis.tx
  4,338,757; 44,537,987 facts; worlds, R1, R2, R3 hashes), and its measured floors equal V-D01's scratch evaluator to the last digit. That
  is three implementations (author, V-D01's scratch evaluator, O-DOMAIN) agreeing on 44.5M facts. 99.5 s and 23 MiB streamed.
- Learning: the three-round W0 review paid for itself here; the SPEC is precise enough that a cold reader reproduced every byte. The 10
  readings O-DOMAIN had to choose (A01-A10) touch no case or fingerprint value, which also says the golden cases do not pin validation order
  or payload escaping: Q53b adds one case per reading in W0-1.1.2.
- Dispatched V-D01c (mutation-based review: can the cases fail O-DOMAIN?). Running: 10 of 10.

## 2026-11-07 23:11Z: contract 0.3.7 committed; Codex round 7; EXP-D01b dispatched
- Contract 0.3.7 (ca42e06): Q46-Q49 compiled, 153 obligations (two new erasure obligations), evidence schemas (build-manifest/1,
  verifier-record/1, case-result/1) opened and re-judged at admission, workload identity required on both arms, A0 taken only from the
  registry (null, so every comparison is DIAGNOSTIC), indirect refusals followed through reachedThrough, pending rulings listed with no
  authority. 136/136 deliberate regressions caught; --verify byte-identical. Pin scope now 121 uses, 103 may close, 18 blocked (three
  migration/widening obligations newly blocked by the decimal-redeclaration reach).
- Q50-Q54 are rows in RULINGS-PENDING.md; 0.3.8 compiles them (Q52e narrows in-flight erasure reads to per commit).
- Learning: making pending rulings legal rows (Q47d) removed the recurring "--verify broke because I recorded a ruling" failure; rulings
  can now be recorded the moment they are made, and the contract proves they carry no authority.
- Dispatched EXP-D01b (TypeScript W0 kernel, independent of O-DOMAIN) and told E01 to adopt 0.3.7's schemas. Codex round 7 running.

## 2026-11-07 23:18Z: Codex round 7: NOT READY, 5 open (open count 14, 13, 7, 6, 5, 4, 5)
- Closed: indirect refusals (R6-6), pending-ruling authority (R6-7); domain blocking confirmed (26 O-DOMAIN obligations stay DIAGNOSTIC).
- Still partial: invented evidence (well-formed records with invented cases and self-consistent expected objects pass) and control
  provenance (a manifest label makes a candidate binary the control). Learning: every round has found a new way to forge a document, so
  Q55a stops accepting documents: a qualified verdict comes only from a run the evaluator executes itself (own build, cases from pinned
  manifests, expected answers from the pinned oracle). Experiment receipts become diagnostic evidence.
- New, from the broker composition: (5) the transition table ties ACK to the replica's marker, so it would reject a correct broker ACK;
  (6) repository read-your-own-write says nothing about native queries; (7) P2Q's feed lag starts at the ACK, not at source publication.
  Ruled Q55b-d. Q55c (native queries report their basis, honor a basis token, otherwise read the replica's position) is flagged for Sam.
- The count went up by one because a new composition entered the evidence, which is the review doing its job, not a regression.

## 2026-11-07 23:26Z: V-O04b: O-REPLAY 0.4.1 is right on everything Q49 decides; seven undecided shapes ruled (Q56)
- 74/74 decided probes match, 0 unexpected differences over 1,443 differential cases. The failure was on the refusal side: seven
  erasure shapes nobody ruled on got confident answers. All seven are ruled as the oracle answers (Q56), so 0.4.1 pins byte for byte.
- Learning (Q56c): the rule that settles erasure edge cases is "an answer after erasure never depends on the erased value". Erasing one of
  two equal supports of a card-one value therefore makes the read a conflict, because returning the value would reveal what was erased.
- Learning: the verifier's DERIVED-NOTE probes (answers it derived but no ruling decides) are the fastest way to find gaps in rulings;
  keep that probe class in every oracle verification.

## 2026-11-07 23:29Z: hourly learnings pass (NORTH-STAR reread first)
- **Learnings are current** through EXP-P2Q, EXP-P2X, EXP-O04 (0.4.1), EXP-D01c, contract 0.3.7, Codex round 7 and V-O04b. Headers drifted
  ahead of the real clock a second time (entries said 23:40Z to 00:05Z the next day at a real 23:27Z); reset to commit times, and this
  header is written by `date -u` in the same command.
- **Residents:** pool 11.0 of 11.0 GiB (xtdb-dev 2.65 of 3.0 GiB at 153% CPU for EXP-W01; qlever-dev 946 MiB of 3.5 GiB; EXP-X05 now holds
  xtdb-s2 plus its 1 GiB read-only follower). Host load 9.3 / 10.6 / 10.8 on 12 cores, the lowest this session. EXP-N01's A0 poller waits
  for X05 to release s2.
- **Where evidence points, by priority:**
  - P1: X05 (follower) and C8 (reads never write) are running; no new evidence this hour.
  - P2 and P3: the host log of record is the design that works. On QLever it removed the engine from the ACK path (4-8 ms p50) and the
    feed path (12.8-24.5 ms p99, ACK-based; Q55d requires a recompute from source publication). XTDB's own feed cannot beat its serial
    indexer (2.9 s p99). Next: EXP-P2B, XTDB behind the same broker, after V-P2Q.
  - Write amplification is a cross-lane problem (XTDB 27.6 KB per 10-fact commit, QLever about 750 triples), so EXP-J01 owns it for both.
  - P5: three implementations of W0 agree on 44.5M facts; the TypeScript kernel (D01b) now measures per-subject cost for the sweep.
  - Floor: each Codex round has found a new way to forge an evidence document, so Q55a makes qualification a run the evaluator executes.
- **Research dispatched (Sonnet xhigh):** R22 noise-robust benchmarking on this host (run order, paired bootstrap for p50/p99 ratios,
  isolation inside colima, window rejection); R23 log-of-record compositions (prior art for engine-as-replica with read-your-writes, basis
  tokens on native surfaces against Q55c, the host log's substrate: hand-rolled file against SQLite WAL or LMDB, XTDB 2.2.0 as a replica,
  overlay-merge pitfalls). R23 feeds the EXP-P2B brief and the Q55c question for Sam. A bytes-per-commit code audit becomes EXP-J01's first
  phase instead of a separate research.
- **Running (10):** W01, X05, C8 (background run), E01, V-P2Q, V-D01c, D01b, V-O04c, R22, R23.

## 2026-11-07 23:31Z: MILESTONE: O-REPLAY 0.4.1 accepted (erasure modeled); pin moves in contract 0.3.8
- V-O04c: 85/85 probes match, 15/15 planted wrong rulings caught. The 11 erasure obligations can close on the oracle side once 0.3.8 pins it.
- Learning: the oracle pin and the oracle files must move in one commit; merging the oracle first breaks --verify (Q45a), so 0.3.8 is
  built on its own branch that merges the oracle, compiles Q50-Q56 and moves the pin together.

## 2026-11-07 23:49Z: MILESTONE: three independent W0 implementations agree; the kernel prices the P5 sweep
- EXP-D01b (TypeScript kernel, from SPEC.md alone): 87/87 cases and 6/6 fingerprint values on the first run; merged (02424ff).
- **P5 learning: the sweep's CPU is cheap, and most of it is validation.** About 158 µs per subject (6,300 subjects per second per
  core), 15.8 s of one core for 100k subjects, inside P5's 100 s bar, but 80% of it re-validates facts (96% ballast) that the store
  already validated at write time. A trusted typed entry point for facts read from Triplex would cut the per-subject cost to roughly 30
  µs; that is a P5 design choice to measure, not a W0 change.
- **P5 learning: the kernel must not share a core with the pull path.** At the reconciler reference (1,100 pulls per second per core)
  the combined sweep is about 106 s and misses the bar; pipelined on its own core it fits.
- **P5 learning: hand the kernel typed facts, not JSON** (the JSON path costs 3.2x), and scope releases through the dependency index:
  R3's 9,497 reached subjects cost 1.49 s against 15.9 s for all 100k.
- The brief's cost predictions were falsified (p50 85 µs against < 50 µs), which is the point of writing them down.
- Five more SPEC readings (A11-A15) join W0-1.1.2 with A01-A10 (Q53b, Q57).

## 2026-11-07 23:52Z: goal check-in: background work audit
- Stopped 12 orphaned watcher loops: five from EXP-N01's NS runs (last log lines 20:21Z-21:07Z, no driver alive) and seven from EXP-W01's
  earlier GS runs (logs last written 21:40Z and 22:09Z; W01 has since moved to newer runs and is on GS.10 now).
- Progressing: W01 (GS.10 gate under heavy.mjs), V-D01c (mutation campaign, 34 min), V-P2Q (check 6 live A0 suite retry), X05 (follower
  full-run windows), C8 (background run), E01 (Q55a), A01 (0.3.8 on contract/0.3.8), J01 (audit), R22 and R23 (research). N01's
  wait-slot poller stays: it is read-only and starts N01's A0 queue position once X05 releases xtdb-s2; the orchestrator dispatches the
  A0 run itself because N01 has completed.
- Goal status: not complete. The contract is NOT READY for qualified comparisons (Codex round 7, Q55); A0 is not frozen on either lane;
  P2/P3 have one strong candidate per lane (P2Q broker; P2X subject-stamp, P2B next), P5 has its kernel and cost, P1 and P4 wait on X05, C8
  and the current-index work (Q05, Q50a).

## 2026-11-08 00:02Z: V-P2Q REJECT; R22 and R23 landed; contract 0.3.8 merged; E01 implements "qualification is a run"
- **V-P2Q rejects the QLever broker at d7c6086.** Repository pulls were exact on 3,190 adversarial reads, the ACK path, feed and position
  falsifiers hold, A0 is unchanged; but in-transaction Datalog answers from a replica behind the basis (C1), reads trust a cached replica
  marker after an unnoticed regression (C2), and two brokers in one process lose ACKed frames (C3). Learning: the composition is sound where
  every read goes through the routed repository path; every side path (executor, dependency state, native queries) needs the same basis
  check, so Q58d forbids merging outside entity pulls and Q58a puts native queries behind a facade with explicit tokens.
- **P3 recomputed from source publication (Q55d):** offline p99 13.7 ms, dev 24.9 ms, every position accounted: the P2Q feed result survives
  the stricter measurement.
- **QLever write amplification is 653 triples per 10-fact command** (24 rows at about 27 triples), the row encoding and journal, not the
  broker; EXP-J01 owns it.
- **R23 learnings:** every mature log-plus-replica system has two token kinds ("at least", "exactly at") and threads the session's token
  automatically; Q58a adopts that (flagged for Sam). SQLite with fullfsync matches the hand-rolled log's commit cost (3.0 / 6.0 ms against
  3.0 / 6.9 ms) and survived 30 SIGKILLs over 8,959 commits, but its macOS default is not durable and it misses mid-WAL corruption, so the
  marker cross-checks stay (Q58c). XTDB fits behind the broker with an ASSERT-guarded marker row (Q58b).
- **R22 learnings:** on this host only simultaneous pairing shares the noise (5 s window medians of two concurrent processes correlate
  0.985; 60 s apart in one process 0.08); the `--cpus 2` quota throttled the busiest slot in 77% of its periods; VM steal is always 0; a p99
  claim needs about 25,000 commands per arm, so P2/P3 rounds need bursts. Adopted as PAIR-0 (Q60, provisional).
- **Contract 0.3.8 merged (445bc45):** O-REPLAY 0.4.1 pinned with the oracle in one commit; 117 obligations closable, 6 blocked; qualification
  is a run. **E01:** claim.mjs `qualify` builds both sides itself and ignores supplied records; no path to QUALIFIED until an executing gate
  exists (and none should exist).
- Disk: 14 GiB free on the host data volume (97%). Removing nine finished worktrees freed little because pnpm hard-links node_modules;
  their runs and untracked files are archived in /Users/sam/Claude/Projects/triplex-db-2/worktree-archive/.

## 2026-11-08 00:12Z: V-D01c: O-DOMAIN's rules are right; the golden cases are too weak to judge a kernel
- O-DOMAIN follows SPEC everywhere, reproduces the fingerprint and shares no code with anyone; it fails only on robustness (F1 array dates,
  F2 4,300+ digit integers, F3 deep nesting), which are fixed before the pin.
- **Learning: 20 of 70 single-point mutants survive the 87 golden cases, the unit tests and the fingerprint** (19 real gaps), and 13 more are
  caught only by O-DOMAIN's own unit tests, which do not judge the TypeScript kernel. The golden set never puts a fact or an activation at
  basis.tx, never publishes for two subjects, never has an incomplete record or a local floor below the state floor. Mutation testing of an
  oracle is the cheapest way to find what a test set cannot see; it becomes part of every oracle verification.
- W0-1.1.2 folds in V-D01c's 40 proposed cases (P01-P40) with the Q53 and Q57 readings; both implementations must then pass them.

## 2026-11-08 00:18Z: W01 and X05 landed; P1's direction moves to broker-fed replicas
- **EXP-W01:** all 20 golden scenarios exist with goldens from the pinned oracle and a GS gate (merged 4989c7a). On XTDB at 10k, 6 of 8
  run scenarios pass their database checks; GS.12 found a real typed-error bug (an int64 overflow returns WriteError instead of
  InvalidTripleError); every bar is missed by orders of magnitude (commit p99 285-400 s) because A0 serializes every writer in a scope on
  its scope-wide position CAS, the same finding as P2X.
- **EXP-X05:** the read-only follower on the writer's volume takes reads off the writer (writer CPU 42-89% against 110-151%) and never
  answered wrongly in 570,821 rows, but XTDB 2.2.0's ReadOnlyLocalLog reads half-written records and dies for good, 9 times in 30 minutes.
- **Learning (Q63b): read scaling should come from the broker, not from XTDB's shared log.** The broker composition already gives each
  replica its own applier and marker; a second XTDB replica is a second applier, with no shared-log reader and no Kafka. P1, P2 and P3 then
  rest on one mechanism on both lanes.
- **Learning (Q63d): parameterise every XTDB statement;** literal multi-row INSERTs exhausted a 2 GiB heap (X05), as per-cell expressions did
  in P2X.
- Dispatched V-X02 (the XTQL native lane, waiting since bf1ad4d) and W0-1.1.2 (readings A01-A15 plus V-D01c's 40 cases).

## 2026-11-08 00:28Z: hourly learnings pass (NORTH-STAR reread first)
- **Learnings are current** through contract 0.3.9, the O-DOMAIN fix round, V-D01c, V-P2Q, X05, W01, R22, R23, E01 and D01b (entries
  23:26Z to 00:18Z). Headers now come from `date -u` in the same command; two more heredoc substitutions were caught and restored, so
  notebook text is written through quoted heredocs with a placeholder for the time.
- **Residents and host:** xtdb-dev 2.25 of 3.0 GiB at 202% CPU (V-X02 and others share it); qlever-dev 930 MiB of 3.5 GiB; xtdb-s1 1.26 GiB
  for EXP-N01's diagnostic A0. Pool 10.0 of 11 GiB. Host load 8.4 / 8.2 / 9.8, the lowest yet. Host disk 13 GiB free (97%).
- **Where evidence points, by priority:**
  - P1: XTDB's shared-volume follower is out (X05); read scaling goes through broker-fed replicas (Q63b), first measured in EXP-P2B.
  - P2 and P3: the broker design holds on every routed read and on the feed (lag from source publication p99 13.7-24.9 ms) but failed on its
    side paths (V-P2Q); fix round running, then P2B, then the SQLite substrate (Q58c).
  - **P4: no experiment yet.** What exists is indirect: `_id` point reads cost 3-5 ms on XTDB while scope scans grow with history; GS.04b needs
    a separate current index; the broker's recent_rows could become a current store. **R24 dispatched** to design EXP-P4.
  - **P5:** the kernel prices the sweep (15.8 s of one core per 100k; validation 80%), but the read side of the sweep and its effect on live
    traffic are unmeasured; R24 also designs EXP-P5 (a dedicated broker-fed replica for sweeps is the leading idea).
  - Measurement: PAIR-0 (Q60) is being built (EXP-M01); until it lands every comparison stays relative and DIAGNOSTIC.
- **Research dispatched (Sonnet xhigh): R24** current-value path and sweep design (XTDB 2.2.0 current versus as-of internals, QLever options,
  prior art from Datomic, XTDB 1.x, KTables, CQRS projections and materialized views, the smallest Triplex change for an exact current read at
  basis B, sweep isolation and admission control).
- **Running (10):** C8, J01, P2Q fix round, E01, M01, V-X02, W0-1.1.2, V-D01c delta check, O-REPLAY 0.4.2, R24 (N01's A0 run in background).

## 2026-11-08 00:54Z: Codex round 8: NOT READY, 10 open (14, 13, 7, 6, 5, 4, 5, 10)
- Closed: the source/replica ACK split (R7-5). No receipt-shaped input reaches QUALIFIED in claim.mjs (admit always DIAGNOSTIC, qualify always
  GATE-NOT-RUN), so the document-forgery line of attack is finished.
- New critical findings come from the new machinery: (6) a candidate's build runs unsandboxed and could edit the oracle or the A0 control;
  (7) PAIR-0 admission checks only labels, so a RED window with a SLOWER verdict, or no numbers at all, qualified in the reference model.
  The broker fix round's before/after marker check misses a replica reset that completes inside one query (R7-6).
- Learning: each new mechanism is first written as labels and checked as labels; the attack that always works is "supply the label without
  the substance". Q67f makes PAIR-0 recompute decisions from retained data, Q67e isolates builds, Q67c fences replicas by incarnation.
- Owners: EXP-E01 (Q67b, e, i, j), A01 0.3.10 (Q63-Q67 compile), the P2Q author after V-P2Q's verdict (Q67c, d, h), EXP-M01 (artifact format
  for Q67f, g), EXP-G03 (executing gate, isolation).

## 2026-11-08 01:07Z: R24 landed: P4 and P5 have designs; XTDB may already split current from history
- **XTDB 2.2.0 physically separates current from historical files and prunes by recency, but Triplex forfeits it:** every adapter read says
  `FOR ALL VALID_TIME` and finds facts through non-`_id` predicates. A read-path change (X1) is the cheapest P4 experiment there is.
- **P4 design (Q68a):** one current structure with a retention horizon H and watermark W, served only when H <= B <= W; first copy in the
  broker (in the same frame), smaller engine copies for list and native queries. QLever's per-round floor of 3.4-6.5 ms means a host store or
  a one-scan bundle is the only way under 5 ms there.
- **P5 design:** pinned basis by holding H, cursor pages from a worker that also runs the kernel, admission on live queue delay, publication in
  64-record frames (Q68c). Estimated 25-35 s for 100k subjects on the host-store design, against the 100 s bar.
- Dispatched EXP-P4 (read-path arms first; write-path arms after EXP-J01 merges). EXP-P5 waits for the O-DOMAIN pin, P2B and the SQLite store.

## 2026-11-08 01:26Z: W0-1.1.2 accepted; kernel update dispatched; XTDB A0 falls behind the trace with zero readers
- **W0-1.1.2 accepted at fedfcda** after the orchestrator diff check (lab/verify/D01/V-D01e/VERIFY.md): only SHA256SUMS, SPEC.md,
  validate.py and the new input-sha256.json changed; every case, release and fingerprint input is byte-identical; validate.py prints 136
  cases OK from a clean archive; SHA256SUMS 146/146. It merges with the W0 pin move in contract 0.3.10.
- **Kernel update dispatched as a fresh agent** because the D01b author's worktree was gone and it could not be resumed. The brief
  (EXP-D01b-w0-kernel/BRIEF-1.1.2.md) makes the harness compare output hashes against the frozen expected-sha256.json, so a bug in the
  kernel's own JSON writer can no longer cancel out, and asks for three planted faults to prove it.
- **N01 interim, XTDB A0 at zero readers:** after the 50x burst at 120 s the writer queue reached about 3,500 commands, and the feed
  checkpoint moved only about 12 positions in four minutes. This matches P2X's A0 arm (0.35 commits/s on the same trace shape, service time
  growing with history), so it reads as the A0 result for XTDB's default write path rather than a driver fault. Learning: on this node the
  XTDB A0 baseline cannot keep up with the TARGETS 2.1 writer trace even before any reader is added, so the NS P2 bar for XTDB rests on the
  broker composition (P2B) and the per-subject queue, not on the engine's own write path.
- **M01 parked cleanly** (poller, coordinator and its colima ssh agent stopped; nothing left in the VM). It resumes in the Q69a window.
- N01, C8 and J01 ended their turns while their own runs continue; orchestrator waiters resume each agent when its process exits.

## 2026-11-08 01:32Z: hourly learnings pass (NORTH-STAR reread first); catch-up on seven reports
- **Gap found and closed:** seven results landed as reports between 00:40Z and 01:20Z without a notebook entry. Their learnings:
  - **P2Q fix round (f711193, P2 and P3):** all three criticals fixed. In-transaction Datalog now waits for the replica's real marker and
    fails typed instead of answering 0 rows (C1); no answer uses a cached marker, and the applier fences and replays after a replica rewind
    (C2); a second broker on the same log is refused in-process and across processes by flock (C3). 300 random outage reads equal an
    independent log replay. Open (Codex R7-6): a replica reset that completes inside one query still passes the before/after marker check,
    and the errors use `ReadError` tags rather than the contract's `BasisNotAvailable`/`ReplicaUnavailable` (Codex R8-9). R8 already measured
    that one QLever SPARQL request is one snapshot (4,076 reads, 0 torn), so the marker must travel inside the answering request, as R23
    designed; incarnation fencing (Q67c) covers multi-request Datalog.
  - **O-REPLAY 0.4.2 FIX-FIRST, then 0.4.3:** 0.4.2 listed every subset of in-flight erasures (2^n) instead of the n + 1 prefixes in
    publication order, and a cursor continuation of an in-flight read exited 2 (V-O04d F5, F6). 0.4.3 (45bfa59) answers per prefix with
    per-prefix cursors; V-O04e is re-checking it. Learning: "all-or-none per commit" has to be stated as an order, or an oracle quietly
    widens the acceptable set.
  - **EXP-M01 PAIR-0 built offline (1e3c2b5):** a known 2x effect is found at the 8-round look; A/A false positives are 7-9%, matching
    R22. The live A/A duet cannot run because two 3.5 GiB XTDB slots never fit beside both dev residents (Q69a measurement window). Two risks
    for the live run: XTDB seeds at about 120 facts/s while screening bursts offer 750, and the calibration-drift rule excluded 3 of 8 rounds
    at host load 17-21.
  - **E01 on contract 0.3.9:** the JS evaluator and the Python reference agree on 59/59 admissions and 10,712 executor calls; the lab is
    stricter where they differ. Honest nulls remain (no fault injector, no PAIR-0 runner), so every fault and NS/GS claim fails closed.
  - **W0-1.1.2:** no meaning changed (C01-C87 and R1-R3 byte-identical, fingerprint unchanged), 32 of 32 targeted mutants killed. V-D01e's
    two small fixes were accepted at fedfcda.
- **Host:** load 19.5 / 18.5 / 18.1 (the highest yet; eight active agents plus N01's, C8's and J01's runs). Pool: xtdb-dev 2.5 of 3.0 GiB,
  qlever-dev 0.97 of 3.5, xtdb-s1 1.9 of 3.5. **Disk fell to 9.2 GiB free**; removing 3.4 GiB of old scratch archives brought it to 10 GiB.
  The rest of /private/tmp (6 GiB of m4c-* and m9-* folders) belongs to other projects and is left alone. Rule: below 5 GiB free, no new
  heavy run starts.
- **Where evidence points, by priority:**
  - **P1:** read scaling goes through broker-fed replicas (Q63b). C8 is measuring the reads-never-write floor on both lanes.
  - **P2:** XTDB's own write path cannot keep up with the writer trace even at zero readers (N01, matching P2X's 0.35 commits/s), so the
    XTDB P2 bar rests on the broker (P2B) plus a queue per subject. The broker's host store is SQLite (Q58c), and nobody has yet settled
    how SQLite serves many pinned readers beside one durable writer in Node (R24 open question 2). **R25 dispatched** for that.
  - **P3:** broker feed lag from source publication p99 13.7-24.9 ms; XTDB's native feed p99 2.9 s. The broker stays the feed source.
  - **P4:** EXP-P4 is running the read-path arms (X1 current-only reads, X2 `tx_current`, H1 broker store, Q1 QLever `cur` graph).
  - **P5:** designed (R24 section 7); waits for the O-DOMAIN pin, P2B and the SQLite store, so R25 is on its path too.
  - **Loop speed:** every A0 or PAIR-0 run on XTDB re-seeds at about 120 facts/s (38 minutes for N01's seed), and PAIR-0 needs 8 to 24
    rounds. Seeding once and cloning the stopped engine's storage would cut that to minutes if a clone is faithful. **R26 dispatched** for that.

## 2026-11-08 01:36Z: O-DOMAIN accepted and passes all 136 W0-1.1.2 cases; O-REPLAY 0.4.3 needs one more narrow fix; 0.3.10 dispatched
- **V-D01c ACCEPT O-DOMAIN 5d1fd1a:** 6,833 of 7,127 differential entries identical, and all 294 differences are inputs where 276a280
  crashed; fingerprint, 400 block digests and every floor unchanged; 71 of 71 kill-matrix rows identical. Orchestrator cross-check against
  W0-1.1.2: 133/136 through O-DOMAIN's own case runner, and the other three are `inputBase64` cases its loader cannot read, which match when
  fed as decoded bytes. Learning: a new case form in the golden set needs every implementation's harness to read it, or a correct
  implementation reports a failure; the contract's O-DOMAIN runner entry has to say how byte cases are fed.
- **V-O04e FIX-FIRST on O-REPLAY 0.4.3, narrow:** the 2^n and cursor-exit bugs are fixed, but two cursor-continuation edge cases still
  let a page sequence mix prefixes (F7: a continuation of a plain read consults its own readStart; F8: a literal token carries no prefix).
  Both existed in 0.4.2. Ruled as pending Q70a, Q70b; the author is on 0.4.4. Learning, the same as Codex's pattern: the rule "one prefix
  across pages" was implemented for the path the case used, and the two other ways to continue a page were left on the old rule.
- **Contract 0.3.10 dispatched (A01):** W0-1.1.2 and O-DOMAIN pins, Q57 and Q63-Q69 compiled, Q70 and the unbuilt parts of Q67c/d/h stay
  pending. The O-REPLAY pin stays at 0.4.1; 0.4.4 goes into 0.3.11 after its re-check.
- **Research dispatched (Sonnet xhigh):** R25 (many pinned readers beside one durable writer in the broker's SQLite file: settles R23's
  exclusive lock against R24's reader workers, with host measurements) and R26 (seed once, clone faithfully, from source and docs).
- **Process errors caught:** (1) the scratch cleanup removed a tree V-O04e was still using for a re-check; scratch archives under review now
  stay until their verifier reports. (2) A STATE table rewrite cut through to the next blank line and dropped the queue; restored from
  3f1b214 as a numbered list with a blank line before it.

## 2026-11-08 01:42Z: E01 closes Codex round 8 in claim.mjs; the broker fails on certification, not on answers; O-REPLAY 0.4.5
- **EXP-E01 at 2796455 (floor for every claim):** each build is its own instance with an execution identity over the whole post-build
  checkout, so identical dist bytes can no longer alias the A0 control; oracle copies are read-only and re-hashed before every call;
  children die with their process group; comparators decide case results. 112/112 tests, reference replay 59/59. It says what is still
  open: a process that leaves its group, check-to-use gaps, no filesystem or network isolation. So offline stays non-QUALIFIED until
  EXP-G03. V-E01 (fresh Opus) is checking it adversarially. Questions ruled Q71 (install-metadata exclusions, toolchain, comparator in the
  reference).
- **V-P2Q round 2 (P2, P3): REJECT this head, not the design.** Every pull answer was exact (4,540 fuzz reads, outages included), and
  1,017 ACKed commits survived random kills. The two blockers are certification failures, not wrong pulls: (N1) when the flock helper
  dies, a second writer opens the stream; (N2) Datalog returned 0 rows labelled basis 2048 after a zero-downtime rewind between its two
  marker probes, and the fuzz hit it unprompted 4 times in 153. Learning: a before/after probe around a separate request certifies nothing
  about that request's snapshot. The marker has to travel inside the answering request, or an incarnation id has to prove nothing reset in
  between (Q67c, now Q72b on every surface). Also measured: an outage pull replays the whole log synchronously (544 ms at 30k commands, and
  it blocks commits), so the Q58c store is required before the broker can be a default.
- **O-REPLAY 0.4.4 (00703e6)** fixed F7 and F8; its author found the F7 hole still reachable through a literal token from a plain read.
  Ruled Q70c-e (any issuing read; latest of equal tokens; prefixes without the token left out); 0.4.5 is in progress, then one re-check.
- **Contract 0.3.10** also compiles Q71b, Q71c and Q72f (one error id for a basis beyond the latest published position).

## 2026-11-08 01:44Z: XTDB A0 at 10k with zero readers: the write path saturates and single reads take seconds; 10k ladder stopped
- **Receipt NS-xtdb-20261108T001701Z-6f67e0 (MEASURED, exclusive s1, smoke profile, `public-queued`):** seed 384,785 assertions in 38 min
  (about 400 falling to 170 facts/s as the scope grew). P2: 112 of 15,617 trace commands published in about 40 min; the rest missed the
  30 s deadline; the 5-10 fact band p50 22 s, p99 45 s; the queue held about 6,700 at steady state and never drained after a burst. P3: 0
  order violations, 0 duplicate effects, all three crash points resumed exactly; lag p99 41.6 s; 11 gaps not yet classified. 0 correctness
  violations; read-your-own-write pulls p50 44 s, p99 122 s.
- **Probes on the idle seeded scope:** one entities round trip 1.3-2.3 s; a 4-hop pull 5.4 s, a 7-hop pull 15-16 s; `transactions(after
  0, limit 1)` 13.5 s; a 1-fact transact 3 s. These grow with scope size, which fits R24's finding that A0 reads scan all valid time through
  non-`_id` predicates, and P2X's finding that A0's receipt and scope reads grow with history while its candidate stays near 5 ms.
- **Decision:** the 10k reader ladder was stopped before it ran. P1 is measured as writer latency with readers against the zero-reader run,
  and with the writer already saturated that comparison shows nothing about readers. s1 goes to V-X02. N01 proposes the largest rung where
  the zero-reader writer keeps up, and the A0 ladder runs there after V-X02 (using R26's clone procedure if it holds).
- **Learning for the north star:** on this node the A0 XTDB lane misses P2 and P3 by two orders of magnitude before any reader is added,
  so every P1, P2 and P4 gain for XTDB has to come from the read-path change (EXP-P4 X1), the keyed scope candidate (P2X) and the broker
  (P2B), not from tuning the engine.
- **O-REPLAY 0.4.5 (acf9fce)** closes Q70a-e (375/375 unit tests, probe_q52 43 MATCH, 2 OBSERVED); V-O04f is re-checking it.

## 2026-11-08 01:54Z: goal check-in: background work audit
- **All progressing.** Every active agent wrote within the last two minutes (V-X02, W01b, P4, R25, R26, A01, V-E01, P2Q fix round 2,
  V-O04f). C8 (XTDB SQL G2) and J01 (XTDB G1 with the option off) are idle by design while their runs advance; both runs wrote output
  in the last five minutes (C8's G2 is past workload 16). N01 finished and is merged; M01 is parked with nothing running.
- **Stopped:** one leftover `tail -F` of C8's finished QLever G2 run (running 2 h 04 min, no reader left). Nothing else was stuck.
- **Pool:** xtdb-dev 2.3 of 3.0 GiB, qlever-dev 1.0 of 3.5, xtdb-s2 1.1 of 3.5 (EXP-P4's slot smoke). With s2 taken, s1 cannot also fit
  in the 11 GiB pool, so V-X02's exclusive XTQL rerun waits for P4 to release s2; engine.mjs's reservations arbitrate this.
- **Host:** load 15.9 / 26.2 / 22.4 (the 5-minute peak is the highest yet); disk 9.2 GiB free (rule: no new heavy run below 5 GiB).

## 2026-11-08 01:57Z: R26 landed (clones are faithful if settled); disk is the binding constraint; O-REPLAY gets one more round (0.4.6)
- **R26 (measurement speed for all five):** XTDB 2.2.0 keeps no persistent node identity (node id random per process; the leader term is
  re-claimed from the copy's own log), and blocks and tries copy byte-identically, so query cost matches. A clone is faithful when the
  slot is stopped cleanly and settled first (finish-block, compactor idle), `log/` and `buffers/` are copied from one moment, and image and
  config bytes match. QLever's `/data` copies faithfully too, but saves only 1-4 minutes because its bulk index build already takes about
  one. Estimated saving: a 10k XTDB run's 38-minute seed becomes 2-4 minutes; a PAIR-0 duet's 76-106 minutes becomes 5-8.
  Ruled Q74: screening may clone, acceptance seeds fresh, settled is the canonical freeze state, and no clone-seeded receipt counts until
  validation E1 (fresh against clone under PAIR-0 hold margins) passes. EXP-K01 is briefed to build the tooling and validate at 500 subjects.
- **Disk:** removing six dangling anonymous volumes from the first bring-up freed 4.7 GB inside the VM but nothing on the host (the VM
  disk is sparse and does not shrink). Host free is 8.7 GiB, a 10k XTDB volume is 3.41 GiB, and a golden plus two duet clones is about
  10 GiB, so at the 10k rung only one clone fits at a time (Q74f). Small rungs are unaffected.
- **V-O04f on O-REPLAY 0.4.5:** implements Q70a-e exactly (49 MATCH, 0 WRONG), and found two shapes no ruling covered: a literal token
  issued by two reads with different views (F9) and journal pages continued by `after = next` (F10). Neither reaches a required case
  today. Ruled Q70f (refuse an ambiguous token, typed) and Q70g (journal pages continue the issuing read); 0.4.6 is in progress, and the
  pin waits for it so the contract pins one version without known gaps.
- **Learning:** every continuation mechanism in the oracle (cursorFrom, literal token, journal `after`) needed the same rule stated
  separately; the verifier found each one only by enumerating ways to continue a page. Future read surfaces with cursors get the
  enumeration up front.

## 2026-11-08 02:04Z: MILESTONE: contract 0.3.10 merged; both domain artifacts pinned; the W0 kernel is on main
- **Contract 0.3.10 (64ab545):** W0-1.1.2 (146 file hashes) and O-DOMAIN 5d1fd1a are pinned with the fingerprint; Q57, Q63-Q69, Q71 and
  Q72f are compiled. 65 of 157 obligations are closable (61 before); 0 are blocked by the W0 pin or an unpinned O-DOMAIN (26 each before).
  The orchestrator merged main into the branch, regenerated byte-identically and reran the regressions: 284/284 caught, Q47d PASS.
- **What now blocks most:** unpinned O-OBS (62 obligations) and O-HAND (20), which also hold 22 of the 26 domain obligations (NS.P3,
  NS.P5, GS.01-GS.20); other unpinned oracles 20; O-TDK1 unaccepted 6. Every claim is also blocked evaluator-side until EXP-G03, pinned
  case manifests, a buildSpec, the frozen trace and the A0 registry exist. Learning: the next contract lever is O-OBS (an observation
  oracle for receipts), not more rulings.
- **W0 kernel merged (a199182):** the TypeScript kernel and its byte-only harness are on main.
- **Contract author's inconsistencies, handled:** an R1 digest typo in V-D01e corrected; Q67i's "CMP-EXACT" does not exist (CMP-EXACT-VALUE
  compares typed values, and no comparator is plain byte equality), to be ruled with the next comparator change; claim.mjs:894 still builds
  a workload slot (Q67g moved slot into placement), so E01 adapts after V-E01; V-D01c's delta check and V-O04f ran from messages, not
  briefs of their own (Q59c), so every re-check now gets a saved brief.
- **O-REPLAY 0.4.6 (565bc26)** refuses an ambiguous literal token or journal `after` (typed X-NOT-MODELED at run.py:657) and continues
  journal pages from their issuing read; 377/377 unit tests. Its author found one older journal gap (in-flight scope taken from cut.scope),
  ruled Q70j; 0.4.7 fixes it, then one re-check against Q70a-j.
- **EXP-K01 dispatched:** clone tooling per R26 and Q74, validated live at 500 subjects (the rung N01 proposed for the A0 P1 ladder).

## 2026-11-08 02:15Z: V-E01 FIX-FIRST: the evaluator trusted bytes the candidate could still reach
- **What held:** every round-8 fix does what it claims (9 of 9 mutations break their guard; reference replay 59/59).
- **What failed:** isolation (check 3). Two routes need no process escape: a build can rewrite claim.mjs so the next honest run returns
  top-level QUALIFIED with exit 0 (F1), and an unpinned COMPILED oracle is read lazily, after candidate code ran, through a git that honours
  `git replace` (F2, which also exposed a conflict: Q59e makes claims on unpinned oracles DIAGNOSTIC, but the code and the reference
  accept COMPILED ones). Smaller: the identity records the evaluator's own node while children run the first node on PATH (v24 ran,
  identity said v22); one HOME for every child; deleted evidence is not detected; row comparators cannot reach inside an O-REPLAY answer, so
  those cases can never pass (fail closed).
- **Learning:** "hash at start and end" protects one run, not the next; trust has to be anchored to git blobs read before any candidate
  code runs, with replace refs disabled. And the identity must record what children actually execute, not what the evaluator runs on.
- Ruled Q75a-j; E01 fix round 2 also adopts contract 0.3.10's field names; V-E01 does the delta check. Contract items (pinned runners,
  comparators inside O-REPLAY answers, promotion in admit_claim) go into 0.3.11.

## 2026-11-08 02:20Z: V-O04g: 0.4.7 passes every Q70 row; the fourth continuation route found, so one general rule replaces the patches
- Every Q70a-k row passes (61 MATCH, 0 WRONG), V-O04f's F9 and F10 are closed, read scope is right, four refusal sites. Still mixing:
  `transactionsForEntity` pages continued by `beforePosition` (F11) and a string `after` (F12); `after: 1.0` crashes (F13, pre-existing).
- **Learning:** four rounds (F7-F8, F9-F10, Q70j, F11-F12) each found one more way to continue a page, because each ruling named a route.
  Q70l states one rule over a table of paged kinds and adds a self-check that fails when any kind with a `next*` output is missing from it;
  Q70m types continuation values. A rule that names cases invites the next case; a rule over an enumerated table with a completeness check
  does not. This applies to every future paged surface in the lanes too (pull cursors, feed pages).
- 0.4.8 in progress; V-O04h has a saved brief.

## 2026-11-08 02:24Z: MILESTONE (P1 floor): read paths never write, on both lanes
- **EXP-C8 (d9b2dc8):** every read entry point runs on a read-only client view; five read-path mutators are gone (XTDB scratch tables and
  per-round COMMIT SYNC for native reachability, Datalog relation tables, maintained-query writes on query(); QLever scratch graphs and
  never-cleaned derived graphs). A wire-level write counter that fails closed counts 0 writes and 0 commits across every gate run (1,412
  statements), and a positive control registers its commit. QLever G1 88/88 and its G2 closure workloads pass; XTDB failures are all
  timeouts on the overloaded shared engine.
- **Faster as well as read-only:** the single-read default reads each edge relation once and runs the frontier in memory: XTDB native wl15
  2.6-3.2 s against 5.2-10.3 s before (5-7 write transactions per call before); QLever tree native 1.1-1.7 s against 3.2-4.9 s. Learning:
  on the current ledger one recursion round costs as much as reading the whole edge relation, so per-round reads only pay once there is an
  id-keyed current copy (P4's structure); C8's closure scale limits (1M / 100k edge rows) wait for that (Q76a).
- **P1 side observation:** QLever updates appear to queue behind queries (writer 4.4 s p50 alone, one 20 s commit with 4 readers). That is
  the replica behind the broker, which is why P1 on QLever goes through broker-fed replicas (Q63b).
- V-C8 (fresh Opus) dispatched; C8 merges after V-X02, since it carries X02. Ruled Q76 (closure scale, dead schema, tail constraints,
  WL20 supports, maintained-query publication from the feed, clean receipts on an exclusive slot).

## 2026-11-08 02:29Z: hourly learnings pass (NORTH-STAR reread first)
- **Learnings are current** through C8, V-O04g, V-E01, R26, N01 and contract 0.3.10 (entries 01:36Z to 02:24Z). O-REPLAY 0.4.8 (3c52a1d)
  landed during this pass: one continuation table (run.py:64) with a self-check shown to fail when a paged kind is missing; V-O04h checks it.
- **Host:** load { 9.60 11.65 14.04 }; disk 6.9Gi free (scratch cleanup of finished verifiers' copies, 2.6 GB, followed; V-O04h's trees kept); containers: tx2-xtdb-s2 1.129GiB / 3.5GiB;tx2-qlever-dev 1.057GiB / 3.5GiB;tx2-xtdb-dev 2.292GiB / 3GiB;
- **Where evidence points, by priority:**
  - **P1:** the floor is reached on both lanes (C8: read paths never write, 0 writes in 1,412 gate statements). What is left is
    throughput and isolation: QLever's writer queues behind reads (R17, C8), so P1 on QLever runs through broker-fed replicas (Q63b);
    on XTDB the default reads scan all valid time (N01: 1.3-2.3 s per entity round trip at 770k rows), which EXP-P4's X1 arm tests.
  - **P2:** XTDB's default write path saturates at 10k with zero readers (112 of 15,617 commands); P2X's per-subject candidate and the
    broker are the paths. The QLever broker's answers are exact; its certification is in fix round 2 (one-snapshot marker, lock helper).
  - **P3:** the default feed page reads the whole journal (13.5-21.2 s); P2X's feed row plus tailer and the broker's log replace it.
  - **P4:** EXP-P4 running (X1, X2, H1, Q1); C8 adds that closures need an id-keyed current copy to get cheaper (Q76a).
  - **P5:** domain side is complete and pinned (W0-1.1.2, O-DOMAIN, the TS kernel); EXP-P5 waits for P2B and the SQLite store (R25).
  - **Measurement:** EXP-K01 builds seed-once cloning; PAIR-0's live A/A waits for the Q69a window.
  - **Floor for claims:** contract 0.3.10 closes 65 of 157; the biggest blocker is O-OBS (62); every claim also waits for EXP-G03.
- **Research (Sonnet xhigh), queued because all ten slots are in use:** R27 (engine-side evidence sources per O-OBS protocol on both
  engines, and a source-kind taxonomy O-OBS can enforce) and R28 (isolating candidate builds and runs for EXP-G03, after V-E01 showed
  start/end hashing is not isolation). Not needed: QLever update-versus-query interference is already covered by R17 and R8.
- **Running (10):** V-X02, W01b, P4, R25, P2Q fix round 2, K01, E01 fix round 2, V-O04h, V-C8, J01 (its G1 reruns). Next free slots, in
  order: EXP-O05 (O-OBS), R27, R28.

## 2026-11-08 21:12Z: PROTOCOL v1: new agent roles, a third lane (Datomic), and the weekly-limit pause handled without losing work
- **What happened:** all ten Claude agents stopped mid-work on the Claude weekly limit (about 03:30Z to 11:00Z on 2026-11-08). The window
  has reset (0% used at 21:04Z).
- **Sam's instruction (2026-11-08):** Codex gpt-6.1-sol at medium builds code, Codex at high reviews adversarially, Opus 5.5 at high plans
  and thinks, nothing above high, a Datomic lane joins XTDB and QLever, and work pauses gracefully at 65% usage. Written into
  lab/PROTOCOL.md (replaces PLAN 6.2), SCOPE.md (three lanes) and the memory.
- **Tooling:** lab/bin/agent.mjs is the only way Codex is launched: it forces model, effort (builder medium, reviewer high) and the
  workspace-write sandbox with the shared ledgers writable, prepends lab/agents/CODEX-PREAMBLE.md (the lab rules) to every prompt, and
  records launches, sessions and exits in lab/agents/ledger.jsonl. Needed because ~/.codex/config.toml defaults to effort max with
  full disk access. A smoke run confirmed Docker, git, the pnpm store and the QLever resident are reachable from the sandbox.
- **In-flight work kept:** the paused agents were not resumed, since their effort may exceed high; their uncommitted work went into WIP
  commits on seven branches, and lab/agents/handoffs/ holds each one's last state. Codex agents continue from those.
- **Running now (10):** R29 (Opus high) designs lane D; nine Codex agents continue lanes X and Q (broker round 2, P4, E01 round 2, W01b,
  J01, O-OBS) and three reviews (V-C8, V-O04h, V-X02).

## 2026-11-08 21:16Z: EXP-J01 done (CX-J01, Codex builder): compact encoding saves 12% (XTDB) and 33% (QLever); the 3x target is not met
- Report on exp/J01-bytes-per-commit 5cc42fb (lab/experiments/EXP-J01-bytes-per-commit/REPORT.md). The attribution of every XTDB
  source-log byte for a 10-fact command closes with 0 unexplained (A0 30,061 bytes; compact 26,397, 1.14x); QLever inserted triples drop
  32.6% (1.48x). Full G1 still fails (overload), XTDB compact-on is unverified; not promoted, and it needs an independent review first.
- **Learning for P2:** the journal and its identity guards are 47.9% of an XTDB commit's bytes, and change-row JSON plus canonical value
  identity is the biggest single block; even dropping both saves 5,736 bytes, not 3x. Per-commit write cost is set by the journal design,
  so the P2 lever is structural (the broker's log as the journal, P2B; per-subject keys, P2X), not a denser encoding of the same rows.

## 2026-11-08 21:19Z: EXP-P4 (CX-P4): a host-side current store (H1) is about 1,000x faster than the engine path and exact; X1 gains nothing on fresh history
- Report on exp/P4-current-path 6f061a8 (lab/experiments/EXP-P4-current-path/REPORT.md, MEASUREMENTS.md). 10k XTDB, 200-subject gate block,
  1,000 matched subjects for history growth; s2 released afterwards (volume retained).
- **H1** (in-process entity-indexed retained rows, applied from receipts and the feed, served only when H <= B <= W, with fallback):
  100,097 oracle-checked pulls, 0 wrong; weighted p50 / p99 ms depth 1 0.675 / 10.5, depth 10 0.943 / 18.4; about 10,000 pulls/s per core.
  Depth-10/depth-1 p99 ratio 1.181x against the 1.1 flatness bar (A0 2.500x, X1 2.344x). Not durable, no erasure yet.
- **A0 / X1** (current-only temporal bounds): depth 1 p50 627 / 590 ms, depth 10 1,425 / 1,376 ms; X1 is no real gain on fresh history
  (kept only for the aged-history test). **X2 and Q1** not run (wait for J01's merge). Sample counts below 100k for the engine arms.
- **Learning for P4:** the fast path to current values is a host-side current store fed by the same frames as the log (R24's H1), not a
  read-path tweak on the engine; it becomes durable on R25's SQLite design and needs erasure (Q58e) and a flatness fix. Engine copies (X2,
  Q1) are still worth measuring for native queries.
- Next: Codex reviewer for J01 now (P2 outranks P4, and X2/Q1 wait for it), then a reviewer for P4.

## 2026-11-08 21:25Z: O-OBS built (CX-O05, Codex builder): 14 protocols, fail-closed, 14/14 planted mutants caught
- exp/O05-observation-oracle 6852fc1: lab/acceptance/oracle/observe.py with 96 fixtures, 8 CLI tests, 14/14 mutants detected; no engine
  evidence used. Twelve contract ambiguities (CA01-CA12, lab/acceptance/oracle/README.md there); the deepest is CA01: the contract names no
  serialized source kinds and no authenticated collector format, so hashes bind content but cannot attest that evidence came from the
  engine. That is R27's question (engine-side evidence sources), which goes next. Codex reviewer CX-VO05 dispatched.

## 2026-11-08 21:27Z: hourly learnings pass (NORTH-STAR reread first; research is Opus high under lab/PROTOCOL.md)
- **Catch-up:** V-O04h (FIX-FIRST on O-REPLAY 0.4.8: the completeness check matched code patterns instead of executing kinds, F14; the page
  selector coerced or crashed, F15; ruled Q70n, Q70o; 0.4.9 building) and V-C8 (FIX-FIRST: two budget bypasses, a stack overflow in path
  counting, two write-counter blind spots; no read path that writes was found; ruled Q77; fix round building). Learning from both: the
  Codex reviewers keep finding the same class as the Opus ones did, a guarantee checked on the shapes the author thought of; Q70n's
  "check by execution, not by pattern" is the general cure and applies to the write counter too (Q77c: classify positively, count every
  unknown).
- **Host:** load 8.3 / 11.2 / 13.4; disk 33 GiB free (up from 9); only the two dev residents are running; Claude usage 1% of the week.
- **Where evidence points, by priority:**
  - **P1:** read paths never write (C8, fix round for budgets and counter); P1 throughput on QLever goes through broker-fed replicas.
  - **P2:** encoding tweaks are worth 12-33% (J01), not 3x; the journal and its guards are half of each XTDB commit, so the levers are the
    broker log as the journal (P2B) and per-subject keys (P2X). Broker fix round 2 is building.
  - **P3:** the broker log and P2X's feed row replace the full-journal feed scan.
  - **P4:** H1, a host-side current store, is about 1,000x faster than the engine path and exact on 100,097 checked pulls; it needs R25's
    durable SQLite design, erasure and a flatness fix (1.18x against 1.1). X2 and Q1 wait for J01's review.
  - **P5:** the domain side is pinned; P5 waits for P2B and the SQLite store.
  - **Lane D:** R29 (Opus high) is designing it.
  - **Floor:** O-OBS built and under review (62 obligations); E01 round 2 building; O-REPLAY 0.4.9 building.
- **Research:** all ten slots are busy, so R27 (evidence sources for O-OBS, now sharper: CA01 says the contract has no authenticated
  collector format), R28 (isolation for EXP-G03) and the R25 finish wait, in that order, as Opus high planners. No new question beyond those
  three this hour.

## 2026-11-08 21:33Z: lane D designed (R29, Opus high); bring-up EXP-DA00 dispatched to a Codex builder
- Saved as lab/research/R29-datomic-lane-design.md with briefs lab/experiments/EXP-DA00..02/BRIEF.md; ruled Q78a-e.
- Datomic Pro 1.0.7745 on dev storage; one container per slot with the transactor and a Clojure gateway peer pinned to separate CPUs,
  which is lane D's P1 hypothesis (on XTDB, readers and the indexer share one JVM and 4 readers raised commit service time about 5x, R16);
  values tagged so longs and entity ids never lose precision; one database per scope; fact entities with valid time as attributes.
- **Unknowns, not assumptions:** no published on-prem Datomic latency exists, so every P1-P5 cost is an estimate until EXP-DA03's NS smoke;
  R18's claim that Datomic does not separate current from history conflicts with an internals guide, and DA03 settles it. No Datomic source
  exists, so lane D has workarounds only. Pool: the 2.75 GiB resident is parkable, so lane D resident work and lane X/Q exclusive slots do
  not overlap (Q78b). Two calls are Sam's (Q78e: tenancy on shared dev storage; dev storage for final acceptance).

## 2026-11-08 21:41Z: O-OBS review FIX-FIRST (trust has to come from the evaluator); K01 refused its own golden safely; R25 and R30 dispatched
- **V-O05 (Codex reviewer):** 177 independent cases found 23 acceptance discrepancies; the blocker is that an invented log carrying its own
  hashes earns PASS everywhere, and the evidence chooses its own threshold. Learning, again: an oracle that judges only what it is handed
  cannot tell real evidence from a well-formed invention; the case context and collector objects must be the evaluator's own (Q80a), which is
  R27's design question. Round 2 waits for R27; exact integer ratios (Q80c) go in with it.
- **K01 (Codex builder):** the 500-subject seed took 90.9 s (26,635 assertions); golden creation refused because `docker stop -t 60` never
  logged `Node stopped.`, and finish-block with compactor jobs 0 left 61,709 rows in the live index of the open read view (zero only after a
  restart). Both R26 assumptions failed on the real image, and the gate failed closed as designed. R30 (Opus high) reads XTDB source for a
  provable freeze protocol. Also: probing a nonexistent block id hangs; enumerate published files instead.
- **R25 finish** (Opus high) completes the SQLite pinned-readers design from the retained measurements and now must also serve H1's
  current_rows.

## 2026-11-08 21:50Z: review round results (Codex reviewers): O-REPLAY 0.4.9 ACCEPTED; X02 stops silent rounding; three narrow FIX-FIRSTs
- **O-REPLAY 0.4.9 ACCEPTED** (V-O04i): the completeness check now runs every registered kind, so every planted paged kind fails it;
  1,793 seeded cases unchanged. Contract 0.3.11 (Codex builder) pins it, compiles Q70, Q74-Q77, Q79, Q81 and registers lane D's surface,
  blocked until EXP-DA00 lands a pinned image.
- **X02 fix round (6cd68dc):** exact Datalog arithmetic on XTDB now refuses typed instead of rounding 1000000000000000004 to
  1000000000000000000 (Sam's "no silent precision loss" rule), SQL guards are token-aware, overflow is a typed failure, and an unset switch
  restores historical routing; G0 949 passed. Reviewer delta check running; C8 round 3 merges it, since C8 carries X02.
- **Narrow FIX-FIRSTs:** E01 (a case input deleted or rewritten after its last use is not detected; Q81a), C8 (an unclassified GET and pgwire
  traffic after a parser exception still tally zero; Q81b), J01 (the default-off option changes the XTDB client's array-parameter contract;
  compact-on G1 missing; Q81c). Each has a Codex builder on it.
- **Learning:** each delta re-check finds a smaller residue on the same theme (the write counter: multipart, then GET; evaluator inputs:
  before use, then after last use). The rounds converge; the fix that ends them is a positive allowlist with "everything else counts" rather
  than a growing list of recognised bad cases.

## 2026-11-08 21:56Z: R27 landed (Opus high): every O-OBS protocol has a real source; O-OBS round 2 dispatched
- Saved as lab/research/R27-obs-evidence-sources.md; ruled Q82a-e. Engine-internal or read-back sources cover 10 of 14 protocols on XTDB,
  9 on QLever, 7 on Datomic; 4 gaps have named instruments. Six source kinds with Triplex-reported evidence rejected; the four P1/P2
  safety protocols need two agreeing kinds; evidence arrives as obs-bundle/1 from an observer sidecar engine.mjs starts.
- **Corrections to earlier research:** QLever 0.6.0 has a Prometheus /metrics endpoint (query and update counters, delta_triples,
  rebuild_in_progress) and a per-query metrics-log.jsonl with client-settable query ids (R24 said no counters beyond CPU); XTDB's EXPLAIN
  ANALYZE works and returns scan_rows_read / pages / files as JSON (R16's probe printed [object Object], and p4.mjs:29 repeats that bug);
  XTDB's source-log offset moves on flushes and compaction, so only node.tx.latestCompletedTxId counts mutations.
- **Learning:** "no counter exists" twice turned out to be a decoding bug or a disabled flag in our own harness; engine-capability
  claims get a probe before they shape a design.

## 2026-11-08 21:59Z: R30 (Opus high): both K01 blockers explained from source; freeze protocol ruled Q83; K01 round 2 dispatched
- The missing `Node stopped.` is a logging race: Log4j's own shutdown hook stops logging while XTDB's hook is still closing, so every
  line after `Stopping node...` is lost; both stops were clean (exit 143 in 1.5 s and 5.8 s; an unclean close would halt(1) after 10 s).
- The "rows in the live index" were in LiveIndex.sharedSnap, a cached snapshot that finish-block does not refresh and queries reuse until
  the basis moves (upstream #6174, fixed after 2.2.0). It also means K01's pre-stop fingerprint could never match a clone, and a clone would
  plan over uncompacted L0 files; a second finish-block records the post-compaction catalog.
- Decisions taken by the orchestrator (lab configuration, not product calls): the log4j flag on slots only (Q83a) and the canonical
  freeze state (Q83b). Learning: two "engine misbehaves" observations were a logging-library default and a known upstream bug; the K01
  gate's refusal to make an unproven golden was right both times.

## 2026-11-08 22:04Z: MILESTONE: lane D (Datomic) is up: tx2-datomic-dev READY, G0 green on all three lanes
- EXP-DA00 (Codex builder) at exp/DA00-datomic-bringup 702643f: verified Datomic Pro 1.0.7745 download, a locally built image with the
  transactor and the Clojure gateway on pinned CPUs, engine.mjs lane D lifecycle (dev parkable), the tagged value codec; 22 lab tests and 34
  gateway assertions pass; data survived park and restart. Review pending; EXP-DA01 (adapter, G1) builds on it now.
- Pool consequence (Q78b): with the 2.75 GiB lane D resident up, no 3.5 GiB exclusive slot fits, so K01's live check, the W01b GS rerun,
  J01's compact-on G1 and the X02/C8 exclusive reruns wait for a scale window in which the orchestrator parks tx2-datomic-dev.

## 2026-11-08 22:13Z: C8 ACCEPTED; contract 0.3.11 built; X02 guard over-refuses; DA01 unblocked; agent.mjs resume fixed
- **C8 round 3 ACCEPTED** (CX-VC8-3: 34 probes, 1,024 offline): reads never write, budgets enforced, the counter fails closed on every
  unclassified request. It merges right after X02 is accepted, since it carries X02.
- **X02 delta (CX-VX02-2):** F2-F4 hold, but the token-aware guard now refuses six supported parenthesized subquery forms that XTDB answers
  correctly (F1-R2). Learning: a fix that closes a bypass by refusing more needs a list of supported shapes that must still pass, next to
  the shapes that must fail; X02 round 3 keeps both.
- **Contract 0.3.11 built** (36d7434: O-REPLAY 0.4.9 pinned; 50 newly compiled rulings, 338/338 regressions caught; lane D's 153
  obligations registered and blocked on its image pin). Under independent Codex review before merge.
- **J01 delta:** default-off is now byte-identical to main (F1, F3 pass); the compact-on qualification recipe still lacks an executable
  launch envelope (F2), which only matters before compact-on is used. J01 merges default-off after C8 and X02.
- **DA01** was correctly blocked (its gateway routes need the resident recreated, which my prompt forbade); authorized and resumed. That
  exposed a tool bug: `codex exec resume` takes no -s or --add-dir, so agent.mjs now passes sandbox and writable roots as config keys.
- R28 (Opus high) designs build and run isolation for EXP-G03.

## 2026-11-08 22:21Z: E01 merged; R25 landed (SQLite design, Q84); broker SQLite store and observer sidecar dispatched
- **E01 merged into main (f060f7e)** after four review rounds; 128/128 on main. First run after the merge failed 32 tests because my test
  run during the uncommitted merge correctly saw claim.mjs differ from git and poisoned the checkout; the marker sits in the shared .git, so
  it blocked every later run until `claim.mjs restore-evaluator`. The guard works; its scope (all worktrees) is a follow-up.
- **R25 (Opus high) finished from the retained measurements:** drop EXCLUSIVE locking; one writer thread plus a separate checkpointer
  thread plus four readonly reader threads; a broker.lock file replaces the perl flock helper; marker-first read transactions with one unit of
  work each; long work pins H instead of holding a read transaction; H1's rows in the same file. Numbers: 0 acked commits lost in 80 writer
  SIGKILLs; 0 SQLITE_BUSY in about 300,000 commits; readers add 0.2-0.8 ms to a 3.0-3.3 ms commit; four reader threads ~20k reads/s; H1
  3-hop pulls 0.10 ms p50 with rows examined flat across history depth; a 20,000-subject pinned sweep in 2.09 s with 0 mismatches.
  Learning: checkpoint placement decides WAL growth (on the writer thread PASSIVE never finished under readers; WAL reached 714 MB).
- Dispatched: EXP-SQL01 (broker SQLite file per Q84, on the broker branch), EXP-OBS01 (observer sidecar per R27), and three reviewers
  (O-OBS round 2, broker round 3, X02 round 3).

## 2026-11-08 22:27Z: hourly learnings pass (NORTH-STAR reread first; research is Opus high)
- **Learnings current** through E01's merge, R25, R27, R30, contract 0.3.11's review (FIX-FIRST: comparators on real O-REPLAY rows, Unicode,
  lane D composition fields, the Q76c matrix record) and K01 round 2 (G3 blocked by fast compaction; ruled Q83d).
- **Host:** load 7.0 / 7.1 / 8.0; disk 25 GiB free; engines: the three dev residents (XTDB, QLever, Datomic); Claude usage 2% of the week.
- **Where evidence points, by priority:**
  - **P1:** reads never write (C8 accepted; merges after X02's last check). Lane D's process split is the next P1 hypothesis to measure.
  - **P2:** the broker is one review from a default-off merge; EXP-SQL01 moves it onto the R25 SQLite file (0 acked commits lost in 80
    kills; readers add 0.2-0.8 ms to a 3 ms commit). Engine-side encoding tweaks are capped at 12-33% (J01).
  - **P3:** the broker log is the feed; P3 timing now comes from the log's own record.
  - **P4:** H1 lives in the same SQLite file (0.10 ms p50 3-hop pulls, rows examined flat across depth); SQL01 builds it.
  - **P5:** R25's pinned sweep (20,000 subjects in 2.09 s at a pinned basis, 0 mismatches) puts 100k near 10.5 s of one reader thread
    against the 100 s bar, before kernel evaluation (15.8 s of one core); EXP-P5 can start once SQL01 lands.
  - **Lane D:** bring-up done and under review; the adapter (DA01) is building.
  - **Floor:** E01 on main; O-OBS round 2 and the observer sidecar in flight; contract 0.3.11 fix round in flight.
- **Research:** no new question this hour; R28 (isolation for EXP-G03) is running. All ten slots are busy.
- **Learning:** the review loop converges fastest when the ruling is general (one continuation table; one allowlist with everything else
  counted; one trusted context) and slowest when each round names a case.

## 2026-11-08 22:32Z: R28 landed (Opus high): candidate code runs only in hardened containers; two VM security findings go to Sam; EXP-G03 dispatched
- Saved as lab/research/R28-g03-isolation.md; ruled Q86a-g. Containers in the triplex2 VM with no Mac bind mounts, own PID namespaces
  (setsid cannot escape; the kernel kills the namespace), one internal network per arm behind a trusted relay, execution-identity/2.
- **New finding, oracle laundering (L1):** the candidate's checkout contains the pinned oracle files and python3 is on its PATH, so a
  candidate could run the oracle and pass every case without an engine; the container design removes both.
- **Security findings outside the lab's code (Q86g, for Sam):** colima mounts $HOME writable into the triplex2 VM by default, so every
  Docker socket holder can write anywhere in Sam's home; the VM can reach every Mac 127.0.0.1 service, including ports 15442 and 17019.
  Fixing either changes the VM's security settings and restarts it, so it is Sam's call, not the orchestrator's.
- Also: lane D's gateway is candidate code baked into the engine container (DA00), so G03 moves it to its own container; lane D
  durable-readback evidence waits for SQL storage. Builders can move refs/heads/main, so the evaluator uses its own clone (Q86e).
- V-DA00 FIX-FIRST (Q85: create resets a position under concurrency, public scope names rejected, non-hermetic builds, codec mismatch)
  goes into DA01's next round, since DA01 carries and edits that code.

## 2026-11-08 22:35Z: three reviews in; P2Q and O-OBS go back for fixes, X02 round 3 goes to review
- **V-P2Q round 4 FIX-FIRST (P1, P2):** the two earlier regressions pass, and a 60-seed routing fuzz has zero stale accepts. But with
  the exported standard client, a socket closed mid-response arrives as TypeError "terminated" with a nested UND_ERR_SOCKET cause, so
  native SPARQL and Datalog both lose replica-unreachable and the basis fields. **Learning:** classify failures from structured nested causes,
  never from the outer message alone, and test with real HTTP sockets on every exported client, not just the one the runtime factory uses.
- **V-O05 round 2 FIX-FIRST:** all 177 round-1 inputs now refuse and the 14 positive bundles pass, but signed observations with the wrong
  contents still pass: fact comparison runs only for QT4s; a context can pick the reuse threshold for an incremental obligation; clock
  uncertainty applies to only two timing gates. **Learning:** authentication proves which bytes were observed, not that they are correct;
  every transition needs a content check against the evaluator's expectation.
- **X02 round 3 (Q79e grammar) done:** 1,818 generated queries match XTDB, 1,818 unsafe mutations are rejected, G0 is 967/967. Reviewer
  round 4 is checking variations outside the generated set.

## 2026-11-08 23:01Z: contract 0.3.11 merge undone (evaluator suite broke); seven rounds dispatched
- **Contract 0.3.11 passed its review (V-A01 round 2 ACCEPT: 344/344 mutations, 63 tests), but merging it broke 8 of 108 evaluator
  tests on main.** The contract's review never ran claim.mjs's suite, which reads the contract. I undid the unpushed merge (main back at
  5d34fdc; only main contained it). **Q87:** every contract merge now needs the evaluator suite to pass on the branch merged with main.
  **Learning:** a reviewer's ACCEPT covers what it tested; the merge gate has to cover everything that reads the merged file.
- **V-X02 round 4 FIX-FIRST:** dollar-bearing identifiers let unsafe operands and second statements past the guard; 36 supported queries
  are falsely refused; nested block comments are refused although the pinned lexer allows them. **Q79f:** the guard follows the pinned
  lexer, and refuses wherever it and the lexer disagree.
- **V-P2Q round 5 FIX-FIRST:** the cause walk fixed truncation (42/42 HTTP cases) but now matches the word "connection" in decode errors.
  Classification goes by error codes and typed errors only, never message text.
- **V-K01 FIX-FIRST (offline):** a failed re-verify kept an old PASS; T1 ignored a failed stop proof; settle read the initial gauge. All
  three are a stale earlier value standing in for a fresh reading; the builder is told to look for that pattern everywhere.
- **O-OBS round 3 is back with all nine counterexamples rejected,** so it goes to review. OBS01 and G03 delivered partial work: both need
  slot time. OBS01 releases s1 to K01 after copying its evidence out; G03 does all its no-slot work and scripts the slot run.
- **The scale window opens after CX-DA01 finishes with tx2-datomic-dev.** It covers K01 live, G03's slot run, W01b's GS rerun, J01's
  compact-on G1, and the X02 and C8 exclusive reruns.

## 2026-11-08 23:22Z: the 30-of-40 read was real: one basis gave two answers depending on route (SQL01 F1)
- **V-SQL01 FIX-FIRST.** A deterministic schedule reproduces it: 40 assertions at T1/P1, 10 retracted at T2/P2, read at
  {recordedAt T1, recordedPosition P2} during an outage. H1 returns 30 because it retires rows by position only; the source returns 40.
  Not a torn SQLite transaction; a cache whose eligibility check knows less of the basis than the query does. **Learning:** every derived
  store (H1, current values, replicas) needs a route-equivalence test that asks each basis shape on every route and compares answers.
- **F2:** the builder put a waiting RESTART checkpoint on the ACK path, against R25's design (separate checkpointer thread), and a pinned
  reader delayed a commit to 164 ms against 24-29 ms. This is P1's "never block writers" claim, so it goes back too.
- Durability held: 50 abrupt process stops kept all 163 ACKs; retried commits applied once; the feed had no gaps or repeats.
- Contract 0.3.11 round 3: 108/108 evaluator tests with fixture changes; in delta review. G03 round 2: 33 fixtures need migration to the
  contained model. O-OBS round 4: 786 of 786 reviewer cases; in review. P2Q round 5, X02 round 4 and K01 round 3 are in review.

## 2026-11-08 23:25Z: K01 gets a three-frontier settle rule (Q83e); P2Q's classifier converges by edge cases
- **V-K01 round 2 FIX-FIRST (offline):** four new gaps: cleanup can delete a golden from an earlier run; the final owner read and the
  publication are not atomic; a changed copy-proof binding keeps PASS; a failed inspect still yields a stop proof. **The reviewer also
  answered the watermark question from pinned XTDB source:** a block always records its cut F, and XTDB always appends a later
  maintenance message (TriesAdded, compactor output), so a settled node has F < M forever. Q83d's demand for F = M could never be met
  live. **Q83e:** record F, M and T separately, and accept F < M only when every message in (F, M] is maintenance.
- **V-P2Q round 6 FIX-FIRST:** EHOSTDOWN and ENETDOWN are missing. This is the third round in a row whose finding is one more edge of the
  same classifier. **Learning:** when reviews keep finding members of a set, derive the set from the source (Node errno docs, the
  installed undici errors module) and add a test that fails when the source gains a member. Round 6 is told to do exactly that.

## 2026-11-08 23:32Z: hourly pass: O-OBS accepted; contract 0.3.12 started; two Opus researchers launched
- **Usage 3% weekly.** All running agents serve a priority or the correctness floor under them.
- **V-O05 round 4 ACCEPT:** O-OBS at 23e2273 is safe to pin for screening (786 retained and 133 new cases; one shared context guard covers
  every protocol). Four review rounds; each round's finding was a missing comparison, not a wrong one. Live collection is still unverified.
- **Contract 0.3.12 (CX-A01-0312)** compiles Q72, Q79e-f, Q80, Q82-Q87 and pins O-OBS; G03's isolation pins wait for 0.3.13.
- **Research launched from this hour's learnings:**
  - **R31, route equivalence (P1, P4):** SQL01 F1 showed a derived store answering a basis it could not answer exactly. R31 lists every
    read route in all three lanes, what basis shapes each answers exactly, and specifies one route-equivalence harness for all lanes.
  - **R32, lane D durable storage:** lane D runs on Datomic dev storage, and Q86f bars its durable evidence until SQL storage. R32 sizes
    SQL storage in the pool, sets out the tenant-isolation options for Sam's Q78e, covers excision for PII erasure, and drafts the migration brief.

## 2026-11-08 23:44Z: R32: Datomic dev storage can lose acknowledged commits; lane D moves to Postgres before DA03
- **Finding (jar strings, H2 2.1.214 source):** dev storage is Datomic's SQL code on an H2 file inside the transactor with H2 defaults.
  H2's 500 ms write delay acknowledges a commit while it is only in heap, so an abrupt transactor stop can lose about 0.5 s of ACKed
  transactions. The peer role also has full rights on the storage table. **Q88a:** dev storage evidence is development only.
- **Q88b:** EXP-DA04 (Postgres SQL storage, peers SELECT-only) runs before DA03, inside the existing 2.75 GiB resident budget; D0 measures
  the dev-storage loss as a control. **Q88c:** crypto-shredding first, excision second, keys in their own schema.
- **For Sam (Q78e):** tenant isolation on Datomic cannot use schemas or row security, because one transactor owns one table; tiered,
  silo-all and pool-all are the options.
- SQL01 round 2 (4863a8e) fixed F1 and F2; 50 abrupt stops kept all 163 ACKs; review round 2 is checking route equivalence.

## 2026-11-08 23:49Z: R31: record time is stamped before the commit is decided, so a recordedAt pin is not reproducible
- **Biggest finding (D-C1):** transact stamps record time before it allocates a position (TriplesLive.ts:309 before :326), and every lane
  stores that client stamp. A commit staged at 1000 can land after one stamped 1001, so a read at recordedAt 1001 can change after it was
  served. recordedAt is the only pin the public API offers, so this is the P1 floor. **Q89a:** stamp at decision, monotone in position,
  plus a record-time watermark; R33 (Opus) designs it, since it moves the core receipt instant.
- **The F1 class is wider than H1:** any store that retires rows by position cannot answer a record-time basis (H1's pull predicate too,
  R24's planned current store, Datomic's :f/live). **Q89b:** they refuse such a basis until Q89a lands; **Q89c:** refusals are typed errors.
- **Datomic:** multi-request Datalog re-syncs to the newest db between requests, mixing cuts (Q89d, DA01's next round). Datomic does keep
  current and history apart at the index level, so R18 line 97 was wrong (Q89e).
- **Q89f:** EXP-RQ01 builds the route-equivalence harness in packages/testkit (CX-RQ01) as a gate for every read-route change.
- **For Sam (Q89g):** whether the public TemporalBasis gets a position or snapshot token. R33 will lay out the TypeScript shapes.
- P2Q round 6: catalog derived from Node and undici sources plus an upgrade guard (763 controls); review round 7 running.

## 2026-11-09 00:03Z: SQL01 accepted default-off; contract 0.3.12 built; P2Q down to one typed-refusal finding
- **V-SQL01 round 2 ACCEPT (default-off):** 38,808 route pairs matched between H1 and the source; commits completed while reader and
  maintenance barriers were held (F2 fixed); 50 abrupt stops kept all 161 ACKs. Still open: the original assertion-only 30/40 (F1 is the
  likely cause but not proven) and true power loss. **Merge order:** SQL01 sits on an older P2Q base, so it merges after P2Q is accepted,
  in one integration round with the P2Q head.
- **Contract 0.3.12 built (f5e7a41):** 432/432 mutations, evaluator 108/108; in review.
- **V-P2Q round 7 FIX-FIRST:** the derived transport catalog and upgrade guard pass; a transactional read silently replaced a future
  position 6144 with 2048 and returned []. That is exactly what Q89c forbids, found the first round after the ruling.

## 2026-11-09 00:16Z: all three XTDB-lane branches integrated; a QLever closure is 3x slower than when C8 was accepted
- **INT-XCJ:** X02, C8 and J01 (default-off) are merged on int/X02-C8-J01 (ec1a815); evaluator 108/108; J01's three live tests need the
  same expected-skip handling as C8's. Two workload pins changed (XTDB and QLever workload files); contract 0.3.12 re-pins them.
- **C8's QLever "reads never write" control timed out twice**, localized to the Datalog ancestor closure from c8:a: 10.3 s with no load,
  over 30.5 s with eight readers. It passed in C8's own review. Leading guess: qlever-dev has accumulated other lanes' test graphs for 25 hours
  and the closure is not graph-scoped. If so, it is a P1 read-cost bug that shows only on a resident with realistic data volume. CX-C8-R4
  investigates. **Learning:** shared residents drift in size; live controls need the resident's triple count in every receipt.
- **Contract 0.3.12 FIX-FIRST:** O-OBS's registry hashed its review report instead of the original brief (Q59c). Everything else passed.
- **K01 round 5:** 209 offline tests pass, plus a PASS audit listing every observation-to-PASS path; review round 4 audits that list.

## 2026-11-09 00:20Z: R33 designs record time at decision; the oracle half starts first, from a separate builder
- **R33 (Opus high, 882 lines, source only):** one integer-microsecond stamp per transaction, max(previous + 1, clock) in decision order,
  public value stamp/1000 so no type changes; omitted validFrom uses a new stagedAt. A read at T above the latest decided stamp waits 2 s
  then fails typed; at or below it can never change, which closes D-C1. Per lane: broker in commitGroup, both A0s on the client under their
  CAS, P2X from the engine stamp after probe p9, Datomic on the peer under :db/cas. Ruled Q90a-g.
- **Order:** O-REPLAY 0.5.0 (CX-O06) starts now and reads only R33 section 4.3, so the oracle stays independent of the product change.
  RT01's core rounds start from main after RQ01 merges; each lane branch takes its part after it merges main; contract 0.4.0 compiles it all.
- **For Sam (Q89g):** how a caller names one exact commit in the public API: (A) no new field, (B) a raw position, (C) an opaque
  scope-checked snapshot token. R33 recommends C. After Q90a, recordedAt: receipt.instant already pins one commit exactly.

## 2026-11-09 00:28Z: hourly pass: usage 4%; progress by priority; R34 launched for P5
- **Where each priority stands:**
  - **P1 (pinned reads):** record time at decision designed (R33, Q90), its oracle half building (O06), and the route-equivalence harness in
    round 2 (RQ01). The C8 QLever closure slowdown is under investigation (C8-R4).
  - **P2 (commits):** the QLever broker (P2Q) is in review round 8; the SQLite log store (SQL01) is accepted default-off and waits for P2Q.
    Lane D moves to Postgres (DA04) because dev storage can lose acknowledged commits (Q88a).
  - **P3 (feed):** SQL01's feed has no gaps or repeats across 50 abrupt stops; no P3 qualification yet, since no executing gate exists
    (G03 is migrating fixtures).
  - **P4 (current values):** waits for Q89b refusals and RT01; DA03 reads through :f/live (Q89e).
  - **P5 (release activation):** least advanced; queued behind SQL01 for months of plan time. **R34 (Opus high) writes a three-lane EXP-P5
    brief now:** sweep reads at one pinned basis without long read transactions, which lane can start first from main, and a measurement
    design that binds data volume (the C8 lesson) and runs on a dedicated slot.
- **Rate of learning:** the review loop keeps finding "evidence accepted that should not be" (K01 four rounds, O-OBS four, P2Q seven).
  Each round narrows the gap, but the same class recurs; the PASS-audit step K01 round 5 introduced should become standard in builder briefs.

## 2026-11-09 00:30Z: the C8 QLever timeout is the QLever lane reading from its update delta, not an integration regression
- **CX-C8-R4:** queries are graph-scoped and byte-identical on both branches; the earlier review passed with one reader, the integration
  ran eight. On qlever-dev the built base index holds 1 triple; all ~1.8M triples arrived by SPARQL UPDATE. A scoped base SELECT returning
  5 rows takes 4 to 6 s, OPTIONAL joins about 700 to 860 ms each, and planner estimates are far from the real cardinalities. The in-memory
  closure itself takes 0.5 ms. **So every QLever-lane read so far has run against the update delta.**
- **Why it matters:** if delta-backed reads cost seconds at 1.8M triples, the lane cannot meet P1, P4 or P5 at 100M facts without folding
  updates into a built index. **R35 (Opus high)** reads QLever 0.6.0's delta storage and rebuild options and checks whether the lane's design
  assumed a rebuild loop from the log of record that was never built or measured.
- **Learning:** a review's load profile is part of what it proves. C8's one-reader PASS said nothing about eight readers. Reviews now name
  the load they ran, and integration runs the default profile.
- **Decision:** the integration merges with this recorded as a known QLever-lane read-cost item, since C8's code is unchanged by it.

## 2026-11-09 00:42Z: R35: the QLever lane has never read from a built index; QLever has a rebuild, the lane never used it
- **Mechanism (QLever 0.6.0 source):** a scan decompresses each block it touches, merges every delta triple in that block, then filters
  and de-duplicates the whole block before narrowing to its range. qlever-dev has one base block, so about 895k delta triples sit in one SPO
  block and every scan pays for all of them: 160 to 530 ms for 1 to 3 rows. The planner cannot see the delta (estimates 1 row for a full
  scan). Delta-only ids compare by ICU collation, not as integers. OPTIONAL itself costs nothing; its child scan is the cost.
- **QLever has online rebuild-index (and an automatic strategy); the lane never ran it.** qlever-start.sh boots a 1-triple index, the
  delta policy was recreate with --fresh (dropping data), R13's rebuild-from-log was never run, P2Q's rebuildAtDeltaTriples is unrun.
  The research assumed a built base with a bounded delta and R17's numbers came from a 69M-triple built base.
- **Rulings Q91a-d:** QLever performance evidence counts only with a built base and a bounded delta, with both sizes in every receipt;
  no more --fresh resets; EXP-QG1 builds blue/green generations from the broker log with reader leases and Q89i checks across swaps; the
  first rebuild runs on a copy on an exclusive slot (bug #3172 can fail a rebuild, and reviews read qlever-dev live).
- **Learning:** an assumption shared by five research documents was never built. The research index should mark each assumption as
  built, measured or assumed; that is now part of every planner brief.

## 2026-11-09 00:48Z: R34 gives P5 a three-lane plan; the 100k population is 11x larger than assumed
- **Basis on every lane:** {recordedPosition: P_act, validAt: V_act}, with P_act from the activation receipt and V_act from a deterministic
  clock anchored at W0's valid time; no sweep names recordedAt, so Q89b never forces a slow route. One read unit per 64-subject page,
  nothing spans pages (R25's long-transaction lesson). Ruled Q92a-k.
- **Key finding:** W0's 100k population is 44.5M facts (basis.tx 4,338,757), 11x R24's estimate. In the A0 encodings that is about 2.85B
  QLever quads or about 130 GB of XTDB log (estimates), so at 10k and 100k only the broker's host store (about 4 to 5 GB) fits the slot
  disks; engine-fed arms are 1k baselines (Q92d). That states an engine limit plainly; it rules out no engine.
- **Order:** lane X native starts now from main (CX-P5A, offline A0 at 1k and 10k; the 1k slot run joins the scale window); lane Q after
  P2Q and SQL01 merge; lane D after DA01 and DA04.

## 2026-11-09 00:50Z: the 30-of-40 defect appeared again, on lane D
- **V-DA01 FIX-FIRST:** an indirect selection of :f/live (Datomic's current-only attribute) bypassed the historical-basis guard and
  returned 30 rows where the earlier snapshot holds 40, the same shape as SQL01's F1 on lane Q. Two lanes, two teams of agents, same defect:
  a current-only store reached by a historical basis. R31 predicted it (D-D2). Conformance passed 88/88 and the full suite, so G1 does
  not catch this class. **Learning:** route choice belongs in one place per lane, and RQ01 must become the gate for every lane's
  read routes (Q89f) as soon as it merges; DA01 round 4 adds an RQ01-style all-shapes-all-paths test meanwhile.

## 2026-11-09 00:56Z: K01's review loop is not converging; R36 asks whether a content fingerprint can replace process evidence
- **V-K01 round 5 FIX-FIRST,** four more findings (inherited stderr blocks valid checks; failed owner reads become fallback provenance;
  missing plan fields accepted; a timer overwrites failure with exit zero). Six rounds, each three or four findings, all one class:
  process evidence accepted when failed, partial or stale. The structural fix in round 6 narrowed it but did not end it.
- **Hypothesis:** the trust base is too large. If a clone is accepted only when a content fingerprint read through the engine matches the
  golden's pinned digest (R34's G0 pattern), process evidence can only diagnose, never grant PASS, and needs far less validation.
  **R36 (Opus high)** tests that: what process evidence protects that a fingerprint does not, the minimal check set, and keep, simplify or
  drop K01 (re-seed per run, costed from R34's population sizes). K01 waits for R36 instead of another fix round.
- **Learning:** when a review loop's findings stay the same size across rounds, change the design, not the code.

## 2026-11-09 01:08Z: R36: K01 simplified: only a content fingerprint grants admission (Q93)
- **Diagnosis:** about 27 process booleans could each grant a golden or clone its PASS, so every review found new ways one could be
  wrong. Five rounds found 3, 4, 3, 3 and 4 issues; tests grew from 41 to 262; no live golden exists yet.
- **Rule (Q93a):** for seed reuse on every lane, only G0 grants admission: a content digest read through the engine by the measuring
  process, on its endpoint, before warm-up, against a digest pinned before the freeze. Everything else refuses or diagnoses. **Q93b:**
  the golden is published after two clean starts reproduce D and the layout digest L. Q83d and Q83e are retired; Q74d replaced.
- **Effect (R36 estimate):** of 17 review findings, 7 go away with deleted code, 7 become harmless, 3 are ordinary bugs; 1,200 to 1,400 of
  K01's 1,957 added lines are deleted. G0 is shared with EXP-P5's fingerprint sweep.
- **Why not re-seed every run:** XTDB at 10k costs about 38 to 53 minutes per arm against 6 to 20 with clones.
- **Learning:** when a grant can come from many places, make one check grant and let the rest only refuse. Apply this wherever a gate
  has more than a handful of PASS-producing paths (G03's evaluator and O-OBS are the next candidates to check).

## 2026-11-09 01:20Z: O-REPLAY 0.5.0 accepted after three independent review rounds
- 403 tests, zero failures; 22 probes; 341 legacy verdicts unchanged per lane; every surviving wrong variant (staging-time stamps,
  ties, non-monotone stamps, journal instants, answers above the watermark, Q70E/H/I/K/L) is caught. Built from R33 section 4.3 alone, so the
  oracle never saw the product change it will judge. It waits to be pinned with RT01 in contract 0.4.0.
