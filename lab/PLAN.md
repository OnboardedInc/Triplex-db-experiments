# triplex-db-2 dev-loop plan (v1.1)

Status: v1.1, 2026-11-07. Ready to execute as a gated experimental program (Codex round 3 verdict, conditional on
the five v1.1 changes in the changelog). Folds in research R1 to R6 and R9 (`lab/research/`) and two rounds of
adversarial review by Codex (`lab/reviews/plan-review-r1.codex.md`, `plan-review-r2.codex.md`, and
the orchestrator's response `plan-review-r1.response.md`). R7 (XTDB indexing and ingest) and R8
(QLever write lifecycle) are still running; their results refine section 4 and are recorded in the
notebook. The changelog at the bottom records what changed and why.

## 1. Mission and done condition

**Mission.** Build an efficient triple store where Triplex is the TypeScript interface, used almost
like an ORM, over two engines whose native query languages we maintain:

| Surface | Engine (pinned) | Native language |
| --- | --- | --- |
| X-XTQL | XTDB 2.2.0, image digest `a6a42650...` | XTQL (primary) |
| X-SQL | XTDB 2.2.0, same foundation | XTDB SQL (named alternative) |
| Q-SPARQL | QLever 0.6.0, image digest `37d5ede1...`, plus the durable log of record (section 4.2) | SPARQL |

**Raw queries must make sense.** A developer who knows only XTQL, SQL or SPARQL, and has never read
Triplex source, can query the stored domain data and get answers that match what the Triplex entity
API returns at the same basis, within the documented raw-dataset contract (C7).

**Integrated done predicate.** The goal is complete only when one identified integrated profile per
surface (source tree, build manifest, engine image and configuration, projection-spec and log-format
versions) satisfies all of the following at once. A collage of receipts from different profiles does
not count.

1. Every obligation in `lab/acceptance/obligations.json` is closed by fresh receipts from that profile,
   with optional capabilities enabled wherever the obligation claims them.
2. Populations: sparse and representative entity profiles, the query families, history depths and
   graph topologies (including skew) of `qualification/benchmark-contract.json`, and retained history.
3. Scale: 10m distinct application entities with 100m representative active domain facts.
4. Load: 256-logical-client acceptance on the target-scale dataset with steady writes and maintenance
   overlapping, then 512 and 1024 client stress under a frozen overload policy, then recovery after
   stress.
5. Complete application cost is counted: the log, the mutation broker, verification, scratch work,
   fallbacks, maintenance and clients, with history and write amplification reported separately.
6. Packaged SDK consumers, migrations, both history contracts (ordinary raw assertion lifetime and the
   as-of snapshot-assertion target), deletion and cascades, cancellation and drain, and support
   invalidation all pass.
7. Receipt applicability: a receipt applies only to the exact profile identity it binds. It carries
   forward to a later profile only when every bound identity is unchanged (imported source and dist files,
   engine image and configuration, resource caps, fixture contents, enabled capabilities, gate and oracle
   versions, acceptance-rule version), checked by an explicit applicability check. The final acceptance of
   the selected integrated profile is always a fresh run; nothing carries into it.

An engine limit is not completion. When an engine blocks an obligation, the loop opens the
engine-repair track for that engine; we hold the pinned source of both engines in `references/`.

## 2. What research and review changed

| Finding | Source | Consequence |
| --- | --- | --- |
| XTDB indexes only `_id`; other predicates are column scans at about 0.27 s per million rows. | R1 | The EAV ledger cannot serve entity or attribute lookups at scale. Hot reads resolve through `_id`. |
| QLever's reified layout is about 30 triples per fact, `54A + 27E + 63` per transaction with the journal. | R2, R4 | 3 to 5.7 billion triples at 100m facts. The compact ledger and plain current graph are required. |
| QLever updates cost O(total delta) and have no rollback; a timed-out operation can leave permutations inconsistent. | R2, review r1 #7 | QLever cannot be the only durable copy. A log of record plus a fenced mutation broker (C2, C3). |
| One XTDB transaction can hold several Triplex positions (nested transacts). | review r1 #6 | Engine system time maps only physical commit boundaries; interior cuts take the exact path. |
| A basis carries recorded time R separately from position P. | review r2 #4 | Projection eligibility is over the whole basis (C1). Explicit R takes the exact path until proven. |
| QLever publishes a snapshot inside `modify`, before any client verification. | review r2 #5 | The log decision is the commit; the snapshot swap is publication; verification is post-publication (C2). |
| Native recursive reads write scratch graphs and tables in both lanes. | review r2 #2, R6 | Native reads must never mutate engine state (C8). |
| Journal facts `:_tx/change` and `:_tx/changed-entity` are a documented, queryable contract. | review r2 #10 | The journal stays logically queryable; any physical slimming must synthesize those facts (C6). |
| QLever string order is ICU; a 6-hex-digit codepoint key sorts correctly under the pinned engine. | R5 | Proven fix for ordered text access; raw `ORDER BY STR` remains a documented engine limit. |
| QLever EXISTS is planned uncorrelated; re-binding correlated variables fixes the counterexamples. | R5 | Proven authoring fix within stated equivalence conditions. |
| XTQL covers 11 of 71 native tasks; 3 more are hybrid; 57 are SQL only. | R6 | XTQL parity is the largest body of work in lane X. |

## 3. Architecture

### 3.1 T1: ledger plus idiomatic entity projection

The ledger stays the canonical record: exact values, both clocks, assertion identity, retractions,
receipts, journal and claims. Each engine adds a projection in its own idiom, derived from a
release-bound projection spec (EntityTypes and attributes mapped to physical names and declared types).
One engine-neutral planner (`planProjection`, EXP-R01) computes projection changes for both lanes so
their semantics cannot drift. The hook point is each adapter's `persist()` (R9), which already receives
every row of the transaction.

```
                          Triplex TypeScript API
   +------------------------------------------------------------------+
   | Repository<Model>: at(basis) get getMany find timeline            |
   | Writer -> WritePlan -> commit(plans, {actor, commandId})          |
   | native.xtql`` native.sql`` native.sparql`` + declared contract    |
   +-----------------+--------------------------------+---------------+
                     | eligibility check (C1)          |
        eligible     v                                 v   not eligible
   +----------------------------------+  +-------------------------------+
   | ENTITY PROJECTION                |  | EXACT LEDGER PATH             |
   | XTDB: table per type, _id =      |  | same native language, closed  |
   |  entity id, ns$attr columns,     |  | basis relations over the      |
   |  native valid time; index tables |  | ledger (facts, history,       |
   |  keyed by value (hypothesis)     |  | values)                       |
   | QLever: current graph of plain   |  |                               |
   |  typed triples + publication     |  |                               |
   |  marker                          |  |                               |
   +----------------------------------+  +-------------------------------+
        XTDB: ledger + projection in one engine transaction.
        QLever: log decision, then one update operation per commit group (C2).
```

### 3.2 Lane X physical design

1. **`_id`-first is a hypothesis (H-X-ID).** Projection tables use `_id` = entity id. Value lookups go
   through maintained index tables keyed by value, reverse references through tables keyed by target id.
   R7 is falsifying these shapes under skew, ~1M-posting values, ranges, ordered pages and history.
   Raw predicates that ignore the index tables pay a column scan, and that cost is documented.
2. **Projection writer rivals.** X3a patches only affected attribute segments (`PATCH` and `UPDATE ... FOR
   PORTION OF VALID_TIME`). X3b rewrites the entity's timeline. Both consume the shared plan.
3. **Recorded cuts (H-X-CUT, narrowed).** A basis whose position is the last position of its XTDB
   transaction, with no explicit R, may read `FOR SYSTEM_TIME AS OF` that transaction's system time.
   Interior positions of nested transactions and explicit R take the exact path. Timestamps decode as
   strings so microseconds survive.
4. **Types.** One declared physical type per column; int64 is BIGINT; values the column cannot hold
   exactly stay ledger-only and mark the entity partial (C1). Valid writes are never rejected for the
   projection's sake.
5. **Engine bugs to route around.** `SUM` over BIGINT wraps silently; XTQL `union-all` cannot be planned;
   window functions fail. The capability matrix records each; helpers reject or rewrite shapes, and a goal
   that needs the behavior gets another implementation or an engine repair.

### 3.3 Lane Q physical design

1. **Compact ledger (H-Q-COMPACT).** Assertion nodes shrink from about 30 triples toward about 7, under a
   field-by-field encode/decode specification that covers every public field (per-assertion `createdBy`,
   `entityType`, retraction transaction and position, schema version, full causal envelope, the typed
   value domain). Sparse encoding only where the spec proves a lossless default. Storage numbers are
   recomputed after compatibility passes.
2. **Current graph (H-Q-CURRENT)** of plain typed triples, with native literal types only inside the
   engine's exact ranges, plus a publication marker. Rival H-Q3b (plain triples in per-assertion named
   graphs) is compared under the same raw-dataset contract (C7).
3. **Order keys and correlation helpers** from R5, within their stated equivalence conditions.
4. **Writes go through the log of record and the mutation broker** (C2, C3).

## 4. Frozen contracts

These contracts are fixed before dependent implementation. Each is a design commitment; where its
safety depends on unproven engine behavior, the linked falsifier must pass first, and a failed falsifier
blocks the dependent work.

### C1. Projection eligibility (both lanes)

A read uses the projection only when every condition holds for the whole query; otherwise the whole
query takes the exact ledger path in the same native language, and the fallback rate is reported.

| Condition | XTDB | QLever |
| --- | --- | --- |
| Scope | the engine's ownership record matches the reader's scope (C7) | same |
| Mapping | the projection's spec generation equals the release the reader requires | same |
| Recorded time | R absent. Any explicit R takes the exact path (recorded timestamps are not monotonic in commit order: separate runtimes supply their own clocks, `TriplesLive.ts:308`); an explicit-R shortcut needs its own equivalence proof and falsifier | same |
| Position | latest, or a physical commit boundary (H-X-CUT) | the current publication's P only |
| Valid time | any V, read natively, for entities whose coordinates are exact | V inside the marker's `[validInstant, nextBoundary)` and the marker not in MAINTAINING |
| Completeness | no partial, stale or conflicted entity touches an attribute the query references (filter, order, include, aggregate, negation) | same |

Completeness is query-wide. If the per-type partial set intersects the query's referenced attributes,
the query routes to the exact path before any filtering, ordering, aggregation or pagination. A disjoint
union of projection and exact branches is a later optimization that needs its own proof.

### C2. QLever durable commit protocol (H-Q-LOG)

1. **Commit decision.** The broker appends a COMMIT record for a commit group to an append-only log and
   fsyncs it. That fsync is the linearization point and the irrevocable decision: after it, recovery must
   make the group visible; a committed command can never disappear.
2. **Group validation before the decision.** Members are validated in order against a staged state equal
   to the published state plus the earlier accepted members of the same group, including `EntityState`
   and `TripleLive` preconditions, command claims, and unresolved durable claims from the log. A member
   that fails is rejected alone. Nested savepoints and pending claims keep today's semantics.
3. **Apply.** The broker applies the group as one SPARQL update operation carrying ledger insertions,
   current-graph changes and the publication marker. The broker never cancels or times out its own
   updates; it watches progress instead, because partial permutation states arise from cancellation.
4. **Publication.** QLever's snapshot swap at the end of the operation is publication. Readers may see
   the group from that moment. The caller's ACK is sent after publication.
5. **Verification is post-publication.** The broker checks the complete expected effects and required
   absences of the group. A failure means the published state is known-bad: the broker fences (C3).
6. **Uncertainty.** Any non-success response, lost connection, process death or verification failure
   fences the lane. Recovery restarts QLever, confirms the persisted delta matches a log prefix through
   the complete expected effect sets, re-applies committed groups idempotently, or rebuilds from the
   newest checkpoint plus log replay. Native reads return a typed "repairing" error while fenced.
7. **Lost ACK.** Durably committed and published are different states. A retry with the same command id
   finds the durable claim in the log; it returns the original success receipt only after the broker has
   established that the group is published. Before that, it returns a typed `CommitPending` outcome (committed,
   not yet visible) or the lane's `Repairing` error, never an ordinary success. F05 includes the exact case
   "crash after COMMIT fsync, before apply, then retry".
8. **Replay and checkpoints.** The log is not an RDF snapshot. Replay is deterministic over a versioned
   record format; checkpoints are graph-preserving N-Quads exports with a manifest (log prefix, format
   versions, hashes); a fresh index is built from a checkpoint plus the log suffix; segment retention keeps
   everything after the newest verified checkpoint. Rebuild publication uses crash-safe generation selection
   (a new index directory, switched only after its manifest verifies), because the pinned source warns that
   a failure during directory moves can need repair.
9. **Profile name.** The qualified profile is "QLever 0.6.0 + log of record". Its native reads, including
   every fallback, execute through declared SPARQL.

Falsifiers that gate C2: F05 (fault injection between permutations, persistence, publication and
verification), plus crash tests after every durable transition, competing preconditions in one group,
duplicate commands within a group, failed children and lost ACKs.

### C3. QLever mutation broker and fence

1. **One mutator.** Every route that modifies QLever goes through the broker: application commits,
   boundary maintenance, rebuild and checkpointing, administration. Native reads do not mutate (C8).
2. **Credentials.** QLever runs with an update access token held only by the broker. No other process can
   mutate the engine.
3. **Epochs.** The broker holds a lease with an epoch number in the log. A new broker must close the
   previous epoch (prove the old one is dead and its last group's outcome resolved) before it mutates.
4. **Fence.** While fenced, no update and no rebuild starts until recovery has established a trustworthy
   state from complete expected effects. Two successful queries are not that proof.

### C4. Publication marker and temporal-boundary maintenance (QLever)

1. The marker records `(P, validInstant, nextBoundary, state)`, with state `PUBLISHED` or `MAINTAINING`.
2. Ordinary boundaries are commit groups that advance `validInstant` and `nextBoundary`.
3. **Bounded operations.** Every update operation has a preconstruction bound on its size (the bound comes
   from R8's group-commit curve). A boundary larger than the bound sets the marker to `MAINTAINING` with its
   target boundary, source generation and mapping, applies the boundary in bounded chunks between application
   commit groups, and returns the marker to `PUBLISHED` when done.
4. **Chunks are never stale.** The broker computes each chunk inside its critical section immediately before
   applying it, from the then-published state, for entities whose boundary falls in the target window and that
   no intervening commit already brought to the target instant. Application commits during `MAINTAINING`
   project touched entities at the target instant and record them as done. Progress is in the log, so a crash
   resumes by recomputing the remaining chunks. Falsifiers: concurrent writes to entities in pending chunks, and
   crash/resume mid-maintenance.
5. **Reads during `MAINTAINING`.** The in-progress current graph may match no logical basis (two facts with the
   same expiry, one deleted and one not). C1 sends repository reads to the exact path, and the qualified raw
   escape hatch (`native.sparql` through Triplex) refuses normal results with a typed `Maintaining` error or runs
   against the exact ledger relations. Direct SPARQL to the engine that bypasses Triplex is bare inspection: it can
   read the marker and is explicitly unqualified during maintenance.
6. Delta growth is bounded by rebuild scheduling plus backpressure: when the forecast delta at rebuild
   completion exceeds the cap, the broker slows admission of commit groups. A rebuild trigger alone is not
   a bound.

### C5. Conflict semantics (both lanes)

1. **Equal duplicates are not conflicts.** Several live assertions with the same value form one value with
   several supports, as the existing `EntityCodec` decodes them (`packages/http/src/EntityCodec.ts:203`).
   Write-time cardinality enforcement keeps counting assertions (`Constraint.ts:193`); that rule is unchanged.
2. **A conflict** is a cardinality-one attribute with two or more distinct live values at the basis. It can
   exist with enforcement off, and also with enforcement on when it predates the enforcing write (enforcement
   rejects only new or worsened violations).
3. **Repository outcomes.** `get` and `getMany` fail with `ConflictingValuesError` listing every conflicted
   entity and attribute. `find`, counts, ordering, includes and negation fail with the same error when a
   referenced attribute is conflicted for any candidate entity; attributes the query does not reference do
   not affect it. There is no three-valued "unknown".
4. **Raw convenience shape.** XTDB scalar column NULL plus the attribute in `_triplex_conflicts`; QLever no
   plain triple plus a conflict marker triple. This shape is documented as not equivalent for conflicted
   attributes and never certifies ORM equivalence.
5. **Canonical conflict-aware native relation.** The ledger-derived `values(attribute)` relation in each
   lane's native context lists every live value with its assertion ids and supports.

### C6. Journal contract

The logical journal stays as documented: `_Transaction` facts, including `:_tx/change` and
`:_tx/changed-entity`, remain queryable through Datalog and `match`, and `transactions()`,
`transactionsForEntity` and `transactionByCommand` keep their outputs, order and `-0` behavior. Physical
slimming is allowed only if the adapter synthesizes those facts on read with byte-identical results, tested by
direct audit queries beyond the shared 44. A profile that drops them is a separately named breaking profile and
cannot claim unchanged functionality. Until then the journal is stored as today and its cost is counted.

### C7. Raw dataset and scope ownership

1. **Production profile: one Triplex database scope per engine.** At initialization the engine stores an
   ownership record (XTDB: `triplex_engine_owner`; QLever: a meta triple). The adapter refuses a mismatched
   scope before touching unqualified projection storage.
2. **Domain queries.** In QLever, domain predicates (`urn:triplex:attr:*`) and domain classes (`rdf:type
   urn:triplex:type:*`) appear only in the current graph, so domain-pattern queries over the default union
   graph match only current state. Unrestricted inspection such as `SELECT ?s ?p ?o` also sees ledger and meta
   triples; that is documented. No staging graph ever holds domain predicates. In XTDB, domain tables carry plain
   type names; ledger and metadata tables are `tx_*` and `triplex_*`.
3. **Shared-engine profile (tests, multi-tenant dev).** Projection storage is scope-qualified, raw queries must
   select their scope, and collision tests with identical entity ids in two scopes must show no leakage.

### C8. Native reads never mutate

Recursive and reachability native reads stop materializing scratch graphs or tables. They evaluate read-only:
iterative frontier expansion in TypeScript, one native query per round with the frontier bound as parameters,
under `maxRounds` and `maxRecursiveRows`. This removes a mutator class from both lanes. The affected native tasks
are re-qualified under G2.

## 5. Hypotheses and falsifiers

| Hypothesis | Falsifier | Blocks |
| --- | --- | --- |
| H-X-CUT: physical commit boundary maps to engine system time | EXP-F01 | XTDB recorded-cut reads on the projection |
| H-X-ID: `_id`-keyed projection and index tables serve the query families at 10m | R7, then scale rungs | XTDB index tables; XTDB scale claims |
| H-Q-LOG: log decision plus broker gives atomic, recoverable writes | EXP-F05 and the C2 crash tests | every QLever write path change |
| H-Q-COMPACT: about 7 triples per assertion, lossless | encode/decode spec round trip (EXP-Q01) | QLever storage and scale claims |
| H-Q-CURRENT vs H-Q3b | same raw-dataset contract, measured cost | QLever projection choice |
| Wire exactness per type | EXP-F02 | native column and literal types |
| Duplicate supports and conflicts behave per C5 | EXP-F04 against golden vectors | planner support counting |
| Retirement metadata contract | EXP-F03 against golden vectors | goal 9 history work |

## 6. Lanes and tracks

Two core lanes, as Sam set. Tracks are experiment threads inside a lane.

| Track | Lane X (XTDB) | Lane Q (QLever + log) |
| --- | --- | --- |
| 1 Baseline | own engine; unchanged44; native142 with XTQL and SQL tallies | own engine; unchanged44; native142 |
| 2 Language | XTQL parity (57 SQL-only, 3 hybrid); task-wide fixed cut; C8 recursion | order keys; correlation helpers; planner budget; exactness channels; C8 recursion |
| 3 Projection and ORM | table per type, X3a vs X3b, index tables, H-X-CUT, XTQL repository compiler | compact ledger, current graph, H-Q3b rival, SPARQL repository compiler |
| 4 Writes | CAS through index tables; unknown outcomes; writer liveness | log, broker, fence, publication, maintenance (C2 to C4) |
| 5 Scale and load | ladder to 10m; 256 to 1024 clients | same |
| 6 History | both history contracts, presence, corrections, deletion, cascades | same |

**Shared work stays thin:** the entity core (EXP-R01: projection spec, planner, repository, writer), the
independent oracle and golden vectors, and the fixture generator.

## 7. The evolutionary loop

### 7.1 One generation

```
   +-------------+     +-------------+     +----------------+     +-------------+
   | 1 read      | --> | 2 select    | --> | 3 brief and    | --> | 4 agents    |
   | STATE,      |     | by dep graph|     | dispatch       |     | build and   |
   | SCORECARD,  |     | + progress  |     | (<=10 agents,  |     | run gates   |
   | NOTEBOOK,   |     | obligations,|     |  atomic pool)  |     | in own      |
   | acceptance  |     | 2-3 rivals  |     |                |     | worktrees   |
   +-------------+     +-------------+     +----------------+     +------+------+
         ^                                                               |
   +-----+-------+     +-------------+     +----------------+            |
   | 7 next      | <-- | 6 select:   | <-- | 5 independent  | <----------+
   | generation  |     | promote on  |     | verifier on    |
   |             |     | frozen      |     | the integrated |
   |             |     | budgets     |     | candidate      |
   +-------------+     +-------------+     +----------------+
```

1. **Read state:** `lab/STATE.md`, `lab/SCORECARD.md`, the notebook tail, and obligation status computed from
   `lab/acceptance/obligations.json` and receipts.
2. **Select by dependency graph.** Every OPEN obligation has an experiment within three generations; an
   obligation with no progress for two generations escalates (new research, engine repair, or a design
   change); at most two unintegrated branches per lane; two or three rivals per measured bottleneck.
3. **Brief and dispatch** with the template in 7.3.
4. **Build and run** in the agent's own worktree on `exp/<id>-<slug>`, gates through `lab/bin`.
5. **Verify** on the integrated candidate (main plus the branch), by an agent that did not write it.
6. **Promote** only when hard semantic invariants hold (binary, never traded) and the integrated candidate's
   cumulative cost stays inside the frozen profile budgets (7.4). Losers stay in the notebook with the reason.
7. **Next generation:** mutate winners, combine partial winners, retire hypotheses that failed twice for the
   same reason. A failed falsifier blocks its dependents until a new design passes it.

**Hourly learnings pass.** A session cron (job `ae766d26`, hourly at :07) updates the notebook from finished
experiments and launches Sonnet research where the learnings raise a question the next generation needs answered.

### 7.2 Agent roles

| Role | Model and effort | Job |
| --- | --- | --- |
| Research | Sonnet, xhigh | go wide on the web and in pinned source, probe engines, write `lab/research/*.md` |
| Coding | Opus, high | one experiment per agent from a commander's-intent brief |
| Verifier | Opus, high | rerun gates on the integrated candidate, try to break the claim |
| Adversarial review | Codex `gpt-6.1-sol`, xhigh | plans, contracts, gate or oracle changes, major promotions |

### 7.3 Brief template

1. **Commander's intent:** the end state, why it matters, what success lets the next generation do.
2. **Point of view:** the technique to pursue and why, the rejected alternatives with reasons, what not to do.
3. **Boundaries:** files and packages in scope, branch, engine slot.
4. **Gates:** the `lab/bin` commands that define done, and the receipts to produce.
5. **Report:** `REPORT.md` with result class, evidence, surprises, and the reasoning kept in code comments.

### 7.4 Budgets and comparisons

1. **Hard invariants** (exact values, cuts, identity, history, receipts, journal contract, conflicts per C5)
   are binary and never traded for performance.
2. **Profile budgets are frozen before candidates** in `lab/acceptance/budgets.json` (write bytes per fact,
   ingest rate, latency per query family per rung, memory and disk peaks). A hypothesis's predicted cost is
   recorded separately and never sets its own allowance. Changing a budget creates a new profile version.
3. **Cumulative cost.** Each promotion compares the integrated candidate against frozen controls (the A0
   baseline at the same rung), so a series of individually small regressions cannot exhaust capacity.
4. **Matched comparisons:** same slot configuration, fixture, co-runner set, three runs, and a conservative
   separation beyond the observed spread; no formal confidence claim.

### 7.5 Gates, receipts and retained evidence

| Gate | What it runs | Needs engine |
| --- | --- | --- |
| G0 | typecheck and pure unit tests for core, xtdb, qlever, qualification | no |
| G1 | unchanged44 shared conformance, current and reopen | yes |
| G2 | native142 (71 tasks, current and reopen); X tallies XTQL and SQL separately | yes |
| G3 | entity suite: repository and raw queries against the independent oracle, plus mutation controls | yes |
| G4 | semantic counterexamples with original expected answers | yes |
| G5 | write semantics: duplicates, CAS conflicts, unknown outcomes, crash and reopen, C2 crash matrix | yes |
| G6 | scale rung (10k, 100k, 1m, 10m) | yes, scale window |
| G7 | load per the frozen load contract | yes, scale window |

Gates are runners. Whether an obligation is closed is decided by `lab/acceptance/` (EXP-A01).

**Receipts bind what executed.** Source tree identity including uncommitted and untracked executed inputs,
lockfile, Node and pnpm versions, hashes of the built `dist` files imported (the gate builds first), gate and
oracle file hashes, spec and log-format versions, fixture contents, raw-result hashes, the endpoint actually
contacted, engine image and configuration, counts, first failures, timings, co-runners, and resource peaks.

**Gates fail closed** on skips, zero executed cases, missing identities or wrong endpoints. Lane X counts a task
for a language only when every read substep ran in that language.

**Retained evidence.** Hashes are not enough. A content-addressed object store under `runs/objects/` keeps the
bytes of runner scripts, executed inputs not in git, build manifests and raw outcomes; receipts list them. No
credentials or dependency caches are retained.

**Gate and oracle changes** need verifier review recorded in the commit, and Codex review when they change what
an obligation accepts.

### 7.6 Notebook and code comments

`lab/NOTEBOOK.md` is append-only: experiment id, lane and track, hypothesis, mechanism with pinned source
inspiration, result class (PROGRESSED, NO-CHANGE, REGRESSED, FAILED, INCONCLUSIVE), receipts, decision, notes for
the next generation. Code comments carry the reasoning in a fixed form:

```ts
// [EXP-012] Why: segment patch touches only affected slices; rewrite cost grew O(history).
// Inspired by: references/xtdb @ c6c1962 <path>:<line> (FOR PORTION OF VALID_TIME DML).
// Rejected: full timeline rewrite X3b (EXP-019: 3x bytes per write at 50 versions).
```

## 8. Resources and admission

| Resource | Envelope | Rule |
| --- | --- | --- |
| Docker VM | colima profile `triplex2`: 6 CPU, 12 GiB, 60 GiB disk | always `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`; after any colima command run `docker context use colima` |
| Reservation pool | 11 GiB memory of the VM's 12 GiB, plus CPU and disk forecasts | one ledger updated atomically under one lock; residents, slots and research probes all count; release only after proven cleanup |
| Residents | `tx2-xtdb-dev` (3 GiB), `tx2-qlever-dev` (2.5 GiB) | correctness work shares them through disjoint scopes (shared-engine profile, C7) |
| Heavy slots | `s1` to `s3`, 3.5 GiB caps each | admitted only while the pool has room; a scale window stops the residents |
| Peak forecast | QLever rebuild overlap, delta growth during rebuild, log, checkpoints and export scratch; XTDB pre-GC growth (about 5.5x seen); replay peaks; host clients | runs that do not fit are refused or queued |
| Agents | at most 10 concurrent; at most 4 concurrent heavy local commands | `lab/bin/heavy` |

**Capacity risk recorded now.** At the 10m rung, QLever's compact ledger plus current graph plus the journal
plus the log and a rebuild overlap may exceed 60 GiB. Scale rungs run one engine at a time. Any VM change needs
its own capacity qualification. Sam's default Docker VM is never touched.

## 9. Generation 1

| Step | Id | Experiment | Depends on |
| --- | --- | --- | --- |
| 1 | EXP-A01 | acceptance contract: obligations, load contract, capability matrix, budgets skeleton | none (running) |
| 1 | EXP-000 | harness: engines, atomic pool, fail-closed bound receipts, retained evidence, homebase coupling replaced | none (running) |
| 2 | EXP-G01 | golden vectors for competing contracts (raw lifetime vs snapshot metadata, assertion cardinality vs distinct-value decoding, journal vs exact ledger), derived by hand from documentation and independently reviewed | EXP-A01 |
| 2 | EXP-001, EXP-002 | fresh baselines: unchanged44 and native142 on XTDB (XTQL and SQL tallies) and QLever | EXP-000 |
| 2 | EXP-R01 | entity core skeleton: interface types for repository, writer and plan IR (stubs that fail clearly), the projection spec compiler (names, declared types, exactness flags, collision checks), and the behavior-preserving codec move from packages/http | none |
| 4 | EXP-R02 | planner semantics, repository and writer behavior on KV, tested against reviewed golden vectors | EXP-A01 and EXP-G01 reviewed |
| 3 | EXP-F01, EXP-F02 | XTDB cut mapping; wire exactness for every value type on both engines | EXP-000 |
| 3 | EXP-F03, EXP-F04 | retirement metadata; duplicate supports and conflicts | EXP-000, EXP-G01 |
| 3 | EXP-F05 | QLever fault injection and the C2 crash matrix on a tiny dataset | EXP-000, R8 |
| 4 | EXP-O01 | full independent Python event-replay oracle and mutation controls | EXP-A01, EXP-G01 |
| 5 | EXP-Q01, EXP-Q02 | compact-ledger round trip; log, broker, fence and publication | EXP-F05 |
| 5 | EXP-Q03 | QLever order keys and correlation helpers | EXP-002 |
| 6 | EXP-V01, EXP-V02 | one packaged vertical slice per lane through public entrypoints: write, repository read with projection selection, exact fallback, set-query completeness, authored native read, history, receipt, cursor, reopen | steps 3 to 5 |
| 7 | later | XTQL parity, C8 recursion, scale ladder, load | step 6 |

## 10. Resume protocol

`lab/STATE.md` is updated at every dispatch and every completion with running agents, branches, slots, pending
decisions and the next actions. After any context compaction the orchestrator reads `lab/STATE.md`,
`lab/SCORECARD.md`, the notebook tail and this plan before acting.

## Changelog

- v0, 2026-11-07: first draft, before research and review.
- v1-pre, 2026-11-07: folded in R1 to R6. The projection became mandatory for scale on both lanes.
- v1-rc, 2026-11-07: Codex round 1 (16 findings, 8 critical). Receipts bind executed builds and fail closed;
  acceptance contract moved into `lab/acceptance/`; one resource pool; generation 1 reordered around falsifiers.
- v1, 2026-11-07: Codex round 2 (14 findings, 10 critical). Added the integrated done predicate (section 1),
  frozen contracts C1 to C8 (eligibility over the whole basis with query-wide completeness; QLever log decision,
  group validation, publication and post-publication verification; a mutation broker with credentials, epochs and
  fence; bounded boundary maintenance; conflict semantics per API; the journal contract kept queryable; one scope
  per engine with enforced ownership; native reads never mutate), the hypotheses-and-falsifiers table with
  blocking, frozen profile budgets with cumulative comparison, retained evidence preimages, and golden vectors
  before the falsifiers that need them. R9's slim journal was rejected as a default because it removes documented
  queryable facts.
- v1.1, 2026-11-07: Codex round 3 (`lab/reviews/plan-review-r3.codex.md`) found five remaining gaps and said the plan
  is ready to execute once they land. Applied one to one: (1) C1 requires R absent, because recorded timestamps are
  not monotonic in commit order; (2) C4 binds maintenance chunks to their target, computes them just before applying,
  and refuses qualified raw results during `MAINTAINING`; (3) receipts carry forward only when every bound identity
  is unchanged, and final acceptance is always fresh; (4) C2 retries return success only after publication, otherwise
  `CommitPending` or `Repairing`; (5) EXP-R01 is narrowed to the skeleton and spec compiler, and the planner,
  repository and writer behavior moved to EXP-R02 behind reviewed acceptance and golden vectors.
