# triplex-db-2 dev-loop plan (v1-rc, between review rounds)

Status: v1-rc, 2026-11-07. Folds in research wave R1 to R6 (`lab/research/`) and the accepted
decisions from Codex review round 1 (`lab/reviews/plan-review-r1.response.md`). Review round 2 and
follow-up research R7 (XTDB indexing and ingest), R8 (QLever write lifecycle) and R9 (core
plumbing) are running. The changelog at the bottom records what changed between versions and why.

## 1. Mission and done condition

**Mission.** Build an efficient triple store where Triplex is the TypeScript interface, used almost
like an ORM, over two engines whose native query languages we maintain:

| Lane | Engine (pinned) | Native language | Named alternative |
| --- | --- | --- | --- |
| X | XTDB 2.2.0, image digest `a6a42650...` | XTQL (primary) | XTDB SQL |
| Q | QLever 0.6.0, image digest `37d5ede1...` | SPARQL | none |

**Raw queries must make sense.** A developer who knows only XTQL, SQL or SPARQL, and has never read
Triplex source, can query the stored data and get answers that match what the Triplex entity API
returns at the same basis.

**Done condition.** The goal is complete when both lanes reach the scope, scale and ambition in the
handoff context (`handoffs/claude-native/README.md`, `wiki/goals.md`):

1. All ten goals in `wiki/goals.md` pass for `xtdb-native` (XTQL and SQL counted separately) and
   for `qlever-native`, with fresh evidence from this checkout's own engines.
2. Scale target is 10m distinct application entities with 100m representative active domain facts,
   in sparse and representative profiles, with history and write amplification reported separately.
3. Load acceptance uses 256 logical clients with steady writes, then 512 and 1024 client stress under
   a frozen overload policy.
4. The Triplex entity API (the "ORM") and the raw native escape hatch both pass the entity suite on
   both lanes.

An engine limit is not completion. When an engine blocks a goal, the loop opens the engine-repair
track for that engine; we hold the pinned source of both engines in `references/`.

## 2. What the research changed

The first research wave turned the projection from a nice-to-have into a requirement on both lanes.

| Finding | Source | Consequence |
| --- | --- | --- |
| XTDB 2.2 indexes only `_id`. Other predicates are column scans at about 0.27 s per million rows. | R1 Q7 | The EAV ledger (`_id` = assertion id) turns entity and attribute lookups into full ledger scans. At 100m facts that is tens of seconds per query. Hot reads must resolve through `_id`. |
| QLever's real reified layout is about 30 triples and 724 B per fact; with the journal, `54A + 27E + 63` triples per transaction. | R2, R4 | 3 to 5.7 billion triples at 100m facts, beyond the 60 GiB VM. A compact ledger (about 7 triples) plus a plain current graph (about 1.2) is about 0.8 billion triples and 17 GB. |
| QLever updates cost O(total delta) per request and have no rollback. | R2 Q1 | Writes need one operation per request, a bounded delta with online `rebuild-index`, and roll-forward recovery. |
| XTDB client-set system time is fragile: one abort moves the head to wall-clock. | R1 Q1 | Never set system time. Map commit positions to the system time the engine assigned (hypothesis H-X-CUT below). |
| QLever string order is ICU; a 6-hex-digit-per-codepoint key sorts in codepoint order under the pinned engine, proven exhaustively. | R5 | The string-order blocker has a measured fix: +1 triple and about 58 B per text assertion. |
| QLever EXISTS is planned uncorrelated; re-binding correlated variables inside the group fixes the counterexamples. | R5 | The correlation blocker has a verified authoring fix; planner memory per EXISTS must be costed. |
| XTQL covers 11 of 71 native tasks today, all `state_at`. 57 tasks are SQL only. | R6 | XTQL parity is the largest single body of work in lane X. |
| The XTDB native library has no task-wide fixed cut; XTDB snapshot tokens and fixed-basis read-only transactions work. | R6, R1 Q5 | Multi-call native tasks can pin one cut natively. |

## 3. Architecture thesis

### 3.1 T1: ledger plus idiomatic entity projection, written in one atomic step

The ledger stays the canonical record: exact values, both clocks, assertion identity, retractions,
receipts, journal and claims. Each engine adds a projection in its own idiom, derived from a
content-addressed **projection spec** (EntityTypes and attributes mapped to physical names and
types), and written in the same atomic step as the ledger.

```
                          Triplex TypeScript API
   +------------------------------------------------------------------+
   | Repository<Model> (typed from EntityType): at(basis) get getMany |
   | find({where, include, limit, cursor}) timeline                   |
   | Writer -> WritePlan -> commit(plans, {actor, commandId})          |
   | native.xtql`` native.sql`` native.sparql`` + declared contract    |
   +--------------------------------+---------------------------------+
                                    |
         current-basis reads, raw   |   exact temporal reads, history,
         queries, index lookups     |   receipts, journal, claims
                     v              |              v
   +--------------------------------+---------------------------------+
   |        ENTITY PROJECTION         |       ASSERTION LEDGER          |
   |                                  |                                 |
   | XTDB                             | XTDB                            |
   |  table per EntityType            |  tx_assertions, tx_meta,        |
   |   _id = entity id                |  tx_claims, tx_attempts         |
   |   ns$attr column per attribute,  |  (existing), plus an entity-    |
   |   one declared type each         |  keyed access path so history   |
   |   native valid time = business   |  reads avoid a ledger scan      |
   |   time                           |                                 |
   |  index tables keyed by value:    | QLever                          |
   |   unique attrs, attr-value,      |  compact assertion nodes        |
   |   reverse refs                   |  (target about 7 triples),      |
   |                                  |  field predicates in their own  |
   | QLever                           |  namespace, order keys for text |
   |  current graph per scope         |  and numbers                    |
   |   <e> rdf:type <Type>            |                                 |
   |   <e> <attr> typed literal       |                                 |
   |   native types only where exact  |                                 |
   +----------------------------------+---------------------------------+
     XTDB: one transaction for ledger, projection and index tables.
     QLever: roll-forward protocol (ledger, verify, watermark, projection).
```

**Why T1:**

| Option | Raw queries make sense | Exact semantics | Meets 100m-fact scale | Role |
| --- | --- | --- | --- | --- |
| A0: ledger only (status quo) | no: EAV pivots, reified joins | yes | no (scans in XTDB; 3 to 5.7B triples in QLever) | control baseline |
| A1: projection only | yes | no: loses assertion identity and exact recorded cuts | maybe | rejected after research |
| T1: ledger plus projection | yes | yes | target | primary |

### 3.2 Lane X physical design

1. **Every hot read resolves through `_id`.** Projection tables use `_id` = entity id. Lookups by
   value go through maintained index tables whose `_id` is a canonical value key: unique-attribute
   tables (also used for uniqueness enforcement in place of a 1.8 s column-scan `ASSERT`),
   attribute-value tables, and reverse-reference tables (`_id` = target entity id). R7 measures the
   shapes before this is fixed.
2. **Projection writer, two rivals.** X3a patches only the affected attribute segments
   (`PATCH`/`UPDATE ... FOR PORTION OF VALID_TIME`, values computed from the ledger), so cost grows
   with the slices touched. X3b rewrites the entity's whole valid-time timeline, which is simplest
   but adds O(history) row versions per write. The scale ladder decides.
3. **Correctness oracle for the projection.** The projection must equal a pure function of the
   ledger at the newest position. The entity suite recomputes it from the ledger and compares.
4. **Hypothesis H-X-CUT (exact recorded cut without setting system time).** Every row written in
   one XTDB transaction shares that transaction's `_system_from`, and system time strictly increases
   per transaction. So commit position P maps exactly to the `_system_from` of the `tx_meta` row
   version written in P's transaction, and a Triplex read at recorded cut P can run as
   `FOR SYSTEM_TIME AS OF` that instant. This must be proven, including after aborts, restarts and
   same-millisecond commits, before any read depends on it.
5. **Types.** Each projection column has exactly one declared type; int64 is always BIGINT;
   mixed-type columns are forbidden because they reach Node as JSON and lose integer precision.
   Valid-time coordinates that cannot be represented exactly in microseconds route that entity's
   reads to the ledger.
6. **Card-one conflicts.** When the ledger holds two live, overlapping values for a cardinality-one
   attribute (possible when enforcement is off), the projection writes NULL and records the attribute
   in a `_triplex_conflicts` column; the repository surfaces a typed conflict error. Raw queries see
   the NULL and the marker, never an arbitrary pick.
7. **Engine bugs to route around.** `SUM` over BIGINT wraps silently; XTQL `union-all` cannot be
   planned; window functions hit `AbstractMethodError`. Native helpers reject or rewrite these shapes.

### 3.3 Lane Q physical design

1. **Compact ledger.** Assertion nodes shrink from about 30 triples to about 7: entity, attribute,
   value (exact lexical form), valid-from key, optional valid-to key, transaction node, plus a text
   order key where the attribute is orderable. Recorded time, actor and command live once on the
   transaction node. The journal is derived from assertion nodes (created or retracted per position)
   instead of stored change JSON, if R9 confirms core can accept a native journal.
2. **Current graph.** Plain triples (`rdf:type`, attribute predicates, typed literals only inside the
   engine's exact ranges) for facts live at the newest position and valid at the graph's declared
   valid instant. Plain attribute-predicate triples exist nowhere else, so raw queries over QLever's
   union default graph never see historical values. A boundary maintainer applies due changes when
   validity starts or ends; every read reports the graph's position and valid instant.
3. **Rival H-Q3b.** Plain triples inside per-assertion named graphs (R3's preference, exact at any
   basis). Kept as a measured rival because 100m named graphs are an unmeasured cost and the union
   default graph would expose historical values to raw queries.
4. **Roll-forward write protocol.** One operation per request; ledger triples applied idempotently;
   read-back verification; a position watermark published only after verification; readers bound
   every ledger read by the watermark; a reconciler re-applies positions above the watermark after a
   crash; the projection follows its own watermark. Delta is bounded by online `rebuild-index`
   (first trigger near 1M delta triples). R8 measures each step.
5. **Semantic fixes.** Text order keys (R5, proven). `ctx.notExists`/`ctx.exists` helpers that
   re-bind correlated variables plus a static check (R5, verified). `query-planning-budget` set low
   after costing it on the native packet.

### 3.4 T2: fix semantic gaps at the cheapest correct layer

Ranked order for every counterexample, cheapest first: authoring rewrite in our helpers with written
equivalence conditions; a maintained key whose order the pinned engine provably respects; engine
configuration; engine repair as a separately named patched image; TypeScript evaluation over a
bounded set, counted, never by re-sorting a returned page. No casefolding, no page re-sorting, no
oracle rewrites.

### 3.5 T3: scale is climbed rung by rung

Rungs are 10k, 100k, 1m and 10m entities, about 10 active facts per entity in the representative
profile. A rung opens only after the previous rung passes its correctness subsample. Each rung
reports bytes per entity, ingest rate, query-mix latency (p50, p95, p99), write amplification,
rebuild or compaction time and peak memory. Disk is the first limit above 100k entities, so every
rung starts with a disk forecast.

## 4. Lanes and tracks

Sam limited active work to two core lanes. Tracks are experiment threads inside a lane.

| Track | Lane X (XTDB) | Lane Q (QLever) |
| --- | --- | --- |
| 1 Baseline | own engine; unchanged44; native142 with separate XTQL and SQL tallies; harness fixes | own engine; unchanged44; native142; harness fixes |
| 2 Language | XTQL parity for 57 SQL-only tasks; task-wide fixed cut via snapshot tokens; XTQL helper coverage (unify, aggregate, order, exists, unnest) | order keys; correlated EXISTS helpers; planner budget; numeric and datetime exactness channels |
| 3 Projection and ORM | table per type; X3a vs X3b; index tables; H-X-CUT; XTQL repository compiler | compact ledger; current graph; H-Q3b rival; SPARQL repository compiler |
| 4 Writes | CAS through index tables; unknown outcomes; writer liveness | roll-forward protocol; delta bound and rebuild; unknown outcomes |
| 5 Scale and load | ladder to 10m; 256 to 1024 clients | ladder to 10m; 256 to 1024 clients |
| 6 History | presence, corrections, retirement metadata, cascades (goal 9) | same |

**Shared work stays thin.** The repository types and descriptors (engine independent, a new core
subpath), the projection spec compiler (names, types, collision checks), and the fixture generator.

**The oracle is the in-memory KV runtime.** Triplex's KV backend is a supported reference
implementation. The entity suite applies one command stream to the KV runtime and to a lane engine,
then compares reads at the same bases. Native task oracles stay the independent ones already in
`qualification/workloads` (`event_oracles.py`).

## 5. The evolutionary loop

### 5.1 One generation

```
   +-------------+     +-------------+     +----------------+     +-------------+
   | 1 read      | --> | 2 select    | --> | 3 brief and    | --> | 4 agents    |
   | STATE,      |     | bottleneck  |     | dispatch       |     | build and   |
   | SCORECARD,  |     | per lane,   |     | (<=10 agents,  |     | run gates   |
   | NOTEBOOK    |     | 2-3 rival   |     |  <=3 engine    |     | in own      |
   +-------------+     | hypotheses  |     |  slots)        |     | worktrees   |
         ^             +-------------+     +----------------+     +------+------+
         |                                                               |
   +-----+-------+     +-------------+     +----------------+            |
   | 7 next      | <-- | 6 select:   | <-- | 5 independent  | <----------+
   | generation: |     | promote,    |     | verifier       |
   | mutate      |     | mutate or   |     | reruns gates   |
   | winners,    |     | abandon;    |     | on the branch  |
   | retire      |     | NOTEBOOK +  |     | (never the     |
   | losers      |     | SCORECARD   |     |  author)       |
   +-------------+     +-------------+     +----------------+
```

1. **Read state.** `lab/STATE.md`, `lab/SCORECARD.md`, and the tail of `lab/NOTEBOOK.md`.
2. **Select.** Per lane, pick the lowest-scoring goal that has a feasible next experiment; keep two or
   three rival hypotheses alive for that bottleneck.
3. **Brief and dispatch.** Each experiment gets `lab/experiments/EXP-NNN-slug/BRIEF.md`.
4. **Build and run.** Coding agents work in their own git worktree on `exp/NNN-slug` and run gates
   through `lab/bin`.
5. **Verify.** A different agent reruns the gates on the branch and tries to break the claim.
6. **Select.** Promote to `main` only when the target gate improves and no lane gate regresses
   against the last `main` receipt. Losers stay in the notebook with the reason.
7. **Next generation.** Mutate winners, combine partial winners, retire hypotheses that failed twice
   for the same reason.

**Hourly learnings pass.** A session cron (job `ae766d26`, hourly at :07) makes the orchestrator
update the notebook from finished experiments and launch Sonnet research where the learnings expose
a question that the next generation needs answered.

### 5.2 Agent roles

| Role | Model and effort | Job |
| --- | --- | --- |
| Research | Sonnet, xhigh | go wide on the web and in pinned source, probe engines, write `lab/research/*.md` |
| Coding | Opus, high | one experiment per agent, in its own worktree, from a commander's-intent brief |
| Verifier | Opus, high | rerun gates on a branch, try to break the claim, write a verdict |
| Adversarial review | Codex `gpt-6.1-sol`, xhigh | multi-round critique of plans and major promotions |

### 5.3 Brief template

1. **Commander's intent.** The end state, why it matters to the mission, and what success lets the
   next generation do.
2. **Point of view.** The technique to pursue and why the orchestrator believes it, the rejected
   alternatives with reasons, and what not to do.
3. **Boundaries.** Files and packages in scope, the branch, the engine slot.
4. **Gates.** The `lab/bin` commands that define done and the receipts to produce.
5. **Report.** `REPORT.md` with result class, evidence, surprises, and the reasoning kept in code
   comments.

### 5.4 Gates and receipts

Every gate writes a JSON receipt to `lab/runs/<gate>/<run-id>.json` (small, committed) and keeps raw
output under `runs/` (ignored by git, kept on disk).

| Gate | What it proves | Needs engine |
| --- | --- | --- |
| G0 | typecheck and pure unit tests for core, xtdb, qlever, qualification | no |
| G1 | unchanged44 shared conformance, current and reopen | yes |
| G2 | native142 (71 tasks, current and reopen); lane X tallies XTQL and SQL separately | yes |
| G3 | entity suite: repository and raw queries against the KV oracle; projection equals its ledger function | yes |
| G4 | semantic counterexamples with original expected answers | yes |
| G5 | write semantics: duplicate command, CAS conflict, unknown outcome, crash and reopen | yes |
| G6 | scale rung (10k, 100k, 1m, 10m) | yes, scale window |
| G7 | load: 64, 256, then 512 and 1024 clients with steady writes | yes, scale window |

**Receipts bind what actually executed** (review r1 finding 4). Each receipt records the source tree
hash including uncommitted changes, the lockfile hash, Node and pnpm versions, hashes of the built
`dist` files the gate imported (the gate builds first), gate script and oracle file hashes,
schema and projection-spec ids, fixture content hashes, raw-result hashes, the endpoint actually
contacted (it must equal the slot's), engine image digest and config hash, start and end time,
pass, fail and skip counts, first failures (kept, never overwritten), timings, co-running
containers, and peak container memory, CPU and volume bytes.

**Gates fail closed.** A gate fails on any skip, zero executed cases, a missing identity or a wrong
endpoint. Lane X claims need 142 named executions per language with every read substep's language
recorded; a hybrid task counts for neither language until it is pure. A change to a gate script or
an oracle needs a verifier review recorded in the commit.

**The goal-to-gate matrix is `lab/acceptance/`** (EXP-A01): every obligation in the ten goals, the
ORM and raw-query requirement, scale and load has named cases, an independent oracle, a public
entrypoint, a profile and a binary closure rule over receipts. Gates G0 to G7 are the runners; the
acceptance files decide whether a goal is closed.

### 5.5 Notebook and code comments

`lab/NOTEBOOK.md` is append-only. Each entry records the experiment id, lane and track, hypothesis,
mechanism with pinned source inspiration, result class (PROGRESSED, NO-CHANGE, REGRESSED, FAILED,
INCONCLUSIVE), receipts, decision, and notes for the next generation. Code comments carry the
reasoning in a fixed form:

```ts
// [EXP-012] Why: segment patch touches only affected slices; rewrite cost grew O(history).
// Inspired by: references/xtdb @ c6c1962 <path>:<line> (FOR PORTION OF VALID_TIME DML).
// Rejected: full timeline rewrite X3b (EXP-019: 3x bytes per write at 50 versions).
```

## 6. Harness facts and fixes (from R4)

1. Live tests skip unless `XTDB_INTEGRATION=1` or `QLEVER_INTEGRATION=1`, then read `XTDB_URL` and
   `QLEVER_URL`. A green default run says nothing about an engine.
2. `packages/qualification/workloads/runner.ts` lines 61 to 110 require a homebase controller or
   containers named `triplex-*-local`; QLever entry scripts hard-code port 17019 and
   `verify-xtdb-entry.ts` hard-codes 15442. EXP-000 replaces these with `lab/bin` slot environment.
3. Two things are broken in this checkout: qualification vitest picks up `node:test` files and needs
   a missing duckdb `dist`; `test_engine_cases.mjs` needs a missing `qualification/adapter/scale-fixture.mjs`.
4. Reusable homebase pieces: `io.mjs`, `evidence.mjs`, `preimages.mjs`, the 142-identity check idea
   in `compare.mjs`, and `runner.ts` itself. The rest of the homebase controller is not reused.

## 7. Resource envelope

| Resource | Envelope | Rule |
| --- | --- | --- |
| Docker VM | colima profile `triplex2`: 6 CPU, 12 GiB, 60 GiB disk | always `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`; after any colima command run `docker context use colima` |
| Reservation pool | 11 GiB of the VM's 12 GiB, shared by residents, slots and research probes | admission sums the memory caps of every running `tx2-*` container; residents count once |
| Resident dev engines | `tx2-xtdb-dev` (3 GiB), `tx2-qlever-dev` (2.5 GiB), inside the pool | correctness work shares them through disjoint database scopes |
| Heavy slots | `s1` to `s3`, 3.5 GiB caps each, admitted only while the pool has room | performance, destructive and crash tests; a scale window stops the residents |
| Peak forecast | admission forecasts peak memory and disk per run: QLever rebuild overlap (`previous.*`), delta growth during rebuild, XTDB pre-GC growth (about 5.5x seen), replay peaks, host clients | runs that do not fit are refused or queued (backpressure) |
| Scale window | one at a time; stops other slots | rungs 1m and 10m, load tests |
| Disk | VM 60 GiB hard; stop new heavy runs at 50 GiB used; repo plus references under 5 GB | measured per receipt |
| Agents | at most 10 concurrent; at most 4 concurrent heavy local test or typecheck runs | `lab/bin/heavy` lock |

The VM can grow (Sam's Mac has 36 GiB RAM and about 93 GB free disk) when a rung measures the need;
the change and its justification go in the notebook. Sam's default Docker VM is never touched.

## 8. First generation (gen-1), reordered after review round 1

Falsifiers and contracts come before abstractions (review r1 finding 16).

| Step | Id | Experiment | Depends on |
| --- | --- | --- | --- |
| 1 | EXP-A01 | acceptance contract: goal-to-gate matrix, load contract, capability matrix skeleton | none |
| 2 | EXP-000 | loop harness: `lab/bin` engines, slots, pool admission, fail-closed bound receipts, scorecard; homebase coupling replaced | none |
| 2 | EXP-001, EXP-002 | fresh baselines: unchanged44 and native142 on our XTDB (XTQL and SQL tallies) and QLever | EXP-000 |
| 3 | EXP-F01 to F05 | tiny falsifiers in parallel: XTDB nested positions and H-X-CUT edges; eight-type wire round trips on both engines; historical retirement metadata; duplicate supports; QLever fault injection between permutations, persistence and publication | EXP-000 |
| 4 | EXP-O01 | independent Python event-replay oracle plus mutation controls | EXP-A01 |
| 5 | EXP-Q01, EXP-Q02 | QLever compact-ledger round-trip compatibility; QLever write and publication protocol (H-Q-LOG) | EXP-F05, R8 |
| 6 | EXP-V01, EXP-V02 | one packaged vertical slice per lane: write, repository read, authored native read, history, receipt, cursor, reopen | steps 3 to 5 |
| 7 | later | XTQL parity, scale ladder, load | step 6 |

The QLever semantic fixes (text order keys, correlated EXISTS helpers) are small and already
proven on a probe, so they run as soon as the QLever baseline exists.

## 9. Risks the review should attack

1. The projection doubles write volume on both engines. QLever's O(delta) update cost may make the
   current graph too expensive to maintain at 256 clients with steady writes.
2. H-X-CUT may fail on an edge (aborted transactions, restarts, compaction), leaving recorded-time
   reads on the slow ledger.
3. Index tables in XTDB turn every write into several documents in the single writer, which may cap
   write throughput below the load target.
4. The KV oracle shares Triplex core code with the system under test, so a core bug can pass the
   entity suite on both sides.
5. The 60 GiB VM disk and 12 GiB RAM may not hold the 10m-entity rung for either engine.
6. Scope: 57 XTQL task ports, two projections, two write protocols, two scale ladders and a load
   harness is a lot of work; the loop may spread thin across tracks.

## 10. Resume protocol

`lab/STATE.md` is updated at every dispatch and every completion with running agents, branches and
slots, pending decisions and the next three actions. After any context compaction the orchestrator
reads `lab/STATE.md`, `lab/SCORECARD.md` and the notebook tail before acting.

## Changelog

- v0, 2026-11-07: first draft, before research and review.
- v1-pre, 2026-11-07: folded in R1 to R6. The projection became mandatory for scale on both lanes;
  added the `_id`-first XTDB design with index tables, H-X-CUT, card-one conflict policy, the QLever
  compact ledger, current graph, roll-forward write protocol, and the two proven QLever semantic
  fixes; XTQL parity scoped at 57 tasks; harness breakages listed; decisions D1 to D5 taken.
- v1-rc, 2026-11-07: Codex review round 1 (`lab/reviews/plan-review-r1.codex.md`, 16 findings,
  decisions in `lab/reviews/plan-review-r1.response.md`). Receipts now bind executed builds and fail
  closed; the acceptance contract moved into `lab/acceptance/`; the resource pool counts residents
  once and forecasts peaks; gen-1 reordered around falsifiers. Sections 3.2 to 3.3 (H-X-CUT, QLever
  write and publication, scope, conflicts, compact ledger) are superseded by the response file's
  section B until round 2 settles them in v1.
