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
