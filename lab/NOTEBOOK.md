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
