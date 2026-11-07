# triplex-db-2 dev-loop plan (v0, pre-review)

Status: draft v0, 2026-11-07. Written before the research wave (R1 to R6) returned and before the
adversarial review. Later versions record what changed and why in the changelog at the bottom.

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

1. All ten goals in `wiki/goals.md` pass for `xtdb-native` and for `qlever-native` with fresh
   evidence from this checkout's own engines.
2. Scale target is 10m distinct application entities with 100m representative active domain facts,
   in sparse and representative profiles, with history and write amplification reported
   separately.
3. Load acceptance uses 256 logical clients with steady writes, then 512 and 1024 client stress under
   a frozen overload policy.
4. The Triplex entity API (the "ORM") and the raw native escape hatch both pass the entity suite on
   both lanes.

An engine limit is not completion. When an engine blocks a goal, the loop opens the engine-repair
track for that engine (we hold the pinned source of both engines in `references/`).

## 2. Architecture thesis

### 2.1 Thesis T1: ledger plus idiomatic entity projection, written in one atomic step

The current adapters store every assertion as an EAV-style ledger row (XTDB `tx_assertions`) or a
reified RDF subject with about 15 to 20 field triples (QLever). Native queries read that ledger
through helper fragments. That keeps exactness, but a raw query has to pivot EAV rows, and the QLever
layout multiplies 100m facts into roughly 1.5 to 2 billion triples.

T1 keeps the ledger as the canonical record and adds a second physical layer in each engine's own
idiom, derived from the Triplex `EntityType` schema and written in the same atomic step:

```
                        Triplex TypeScript API
        +------------------------------------------------------+
        |  Entity repositories (typed from EntityType schema)  |
        |  get / find / where / include, temporal basis        |
        |  transact (commands, receipts, CAS, journal)         |
        |  raw escape hatch: xtql`` sql`` sparql`` + contract  |
        +---------------------------+--------------------------+
                                    |
             current-basis reads    |    exact temporal reads, history,
             and raw queries        |    receipts, journal, claims
                    v               |               v
   +--------------------------------+-------------------------------+
   |  ENTITY PROJECTION (idiomatic)  |   ASSERTION LEDGER (canonical) |
   |                                 |                                |
   |  XTDB: one table per EntityType |  XTDB: tx_assertions, tx_meta, |
   |   _id = entity id               |   claims, journal (existing)   |
   |   one column per attribute      |                                |
   |   native valid time = business  |  QLever: compact reified       |
   |   time (entity timeline rewrite)|   assertion graph (to shrink   |
   |                                 |   from ~15-20 triples/fact)    |
   |  QLever: "current" graph        |                                |
   |   <e> rdf:type <Type>           |                                |
   |   <e> <attr> "typed literal"    |                                |
   |   maintained at write time and  |                                |
   |   at valid-time boundaries      |                                |
   +---------------------------------+--------------------------------+
            written together: XTDB same transaction;
            QLever same update request plus outcome reconciliation
```

**Why T1 over the alternatives:**

| Option | Raw queries make sense | Exact bitemporal semantics | Write cost | Role in the loop |
| --- | --- | --- | --- | --- |
| A0: ledger only (status quo) | no, EAV pivots and reified joins | yes | 1x | control baseline for every comparison |
| A1: projection only, history derived from engine history | yes | at risk: per-assertion identity and recorded-time cut are not native in XTDB rows; QLever has no native history | about 1x | research spike only |
| T1: ledger plus projection | yes | yes, ledger stays canonical | about 2x writes, counted | primary hypothesis |

**XTDB projection mechanism (first version).** On every transact that touches entity `E`, the writer
recomputes `E`'s piecewise-constant valid-time timeline for the affected attributes from the ledger
and rewrites `E`'s rows in its type table (`DELETE ... FOR ALL VALID_TIME WHERE _id = E`, then
`INSERT` one row per valid-time segment with explicit `_valid_from` and `_valid_to`), inside the same
XTDB transaction as the ledger rows. This is chosen first because it is deterministic, has one code
path for cardinality-one and cardinality-many, and leaves XTDB's own system-time history intact, so a
raw `FOR SYSTEM_TIME AS OF` query still shows earlier beliefs. Its cost grows with the size of one
entity's history, which the scale ladder measures. Incremental `FOR PORTION OF VALID_TIME` updates are
the named successor hypothesis if the rewrite cost shows up as a bottleneck.

**Recorded time.** Triplex `recordedAt` is a logical clock and is not XTDB system time. The
projection uses XTDB system time only as "when the engine stored it" until research and an experiment
prove an exact mapping (for example client-set, strictly increasing system time per commit position).
Exact recorded-time reads keep going through the ledger until that proof exists.

**QLever projection mechanism (first version).** A `current` named graph per database scope holds
plain triples for facts that are live at the newest recorded position and valid at the graph's
declared valid instant. A temporal-boundary maintainer applies due insertions and deletions when
validity starts or ends, and every read reports the graph's freshness (position P and valid instant
T). Reads at any other basis go to the ledger graph.

### 2.2 Thesis T2: fix semantic gaps at the cheapest correct layer

Ranked order for every semantic counterexample, cheapest first:

1. Authoring-side rewrite in our native helpers, with the equivalence conditions written down (for
   example correlated `NOT EXISTS` into `MINUS` only for shapes where the two are equivalent).
2. A schema-derived maintained key whose order the pinned engine provably respects (for example a
   fixed-width hexadecimal codepoint key for orderable text). The key proves its own order; it does
   not make arbitrary SPARQL `STR` ordering compliant.
3. Engine configuration (index locale, collation settings).
4. Engine repair: a patched image built from the pinned source, named and versioned as its own
   foundation.
5. TypeScript-side evaluation over a bounded candidate set, counted in the cost, and never by
   re-sorting a returned page to fake an order.

The handoff bans manufacturing passes: no casefolding, no page re-sorting, no oracle rewrites.

### 2.3 Thesis T3: scale is climbed rung by rung, never extrapolated

Rungs are 10k, 100k, 1m and 10m entities (about 10 active facts per entity at the representative
profile, so 100m facts at the top rung). A rung opens only after the previous rung passes its
correctness subsample. Each rung reports bytes per entity, ingest rate, query-mix latency (p50, p95,
p99), write amplification, rebuild or compaction time, and peak memory.

## 3. Lanes and tracks

Sam limited active work to two core lanes. Tracks are parallel experiment threads inside a lane.

| Track | Lane X (XTDB) | Lane Q (QLever) |
| --- | --- | --- |
| 1 Baseline | own engine, unchanged44, native142 with separate XTQL and SQL tallies | own engine, unchanged44, native142 |
| 2 Language | XTQL coverage for every native task that only has SQL today | semantic blockers: mixed-case string order, correlated NOT EXISTS |
| 3 Projection and ORM | table-per-type projection, entity repository on XTQL | current graph, compact ledger, entity repository on SPARQL |
| 4 Writes | atomic claims, ASSERT-style CAS, unknown outcomes, writer liveness | update atomicity, outcome reconciliation, delta growth and rebuild |
| 5 Scale and load | ladder to 10m entities, 256 to 1024 clients | ladder to 10m entities, 256 to 1024 clients |
| 6 History | presence, corrections, retirement metadata, cascades (goal 9) | same |

**Shared work stays thin.** Two shared pieces serve both lanes: the entity repository types and the
schema-to-physical naming rules, and the fixture generator with its independent oracle.

**The oracle is the in-memory KV runtime.** Triplex's KV backend is a supported reference
implementation. The entity suite applies the same command stream to the KV runtime and to a lane
engine, then compares reads at the same bases. Authored native queries never share code with the
oracle, which keeps the expected answers independent.

## 4. The evolutionary loop

### 4.1 One generation

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

1. **Read state.** `lab/STATE.md` (running agents, slots, pending decisions), `lab/SCORECARD.md`
   (fitness per lane and goal), and the tail of `lab/NOTEBOOK.md`.
2. **Select.** For each lane, pick the lowest-scoring goal that has a feasible next experiment, and
   keep two or three rival hypotheses alive for that bottleneck.
3. **Brief and dispatch.** Each experiment gets `lab/experiments/EXP-NNN-slug/BRIEF.md` with a
   commander's intent, a point of view on technique, boundaries, gates and a resource slot.
4. **Build and run.** Coding agents work in their own git worktree on branch `exp/NNN-slug` and run
   the gates through `lab/bin`.
5. **Verify.** A different agent reruns the gates on the branch. An author never certifies its own
   promotion.
6. **Select.** Promote to `main` only when the target gate improves and no lane gate regresses
   against the last `main` receipt. Losers stay in the notebook with the reason.
7. **Next generation.** Mutate winners, combine partial winners, retire hypotheses that failed twice
   for the same reason.

### 4.2 Agent roles

| Role | Model and effort | Job |
| --- | --- | --- |
| Research | Sonnet, xhigh | go wide, gather primary sources and probe engines, write `lab/research/*.md` |
| Coding | Opus, high | one experiment per agent, in its own worktree, from a commander's-intent brief |
| Verifier | Opus, high | rerun gates on a branch, try to break the claim, write a verdict |
| Adversarial plan or design review | Codex `gpt-6.1-sol`, xhigh | multi-round critique of plans and promotions |

### 4.3 Brief template (every coding brief)

1. **Commander's intent.** The end state, why it matters to the mission, and what success lets the
   next generation do.
2. **Point of view.** The technique to pursue and why the orchestrator believes it, the alternatives
   already rejected, and what not to do.
3. **Boundaries.** Files and packages in scope, the branch name, and the engine slot.
4. **Gates.** The exact `lab/bin` commands that define done, with the receipt paths to produce.
5. **Report.** `REPORT.md` with result class, evidence, surprises, and the reasoning to keep in code
   comments.

### 4.4 Gates and receipts

Every gate writes a JSON receipt to `lab/runs/<gate>/<run-id>.json` (small, committed) and keeps raw
output under `runs/` (ignored by git, kept on disk).

| Gate | What it proves | Needs engine |
| --- | --- | --- |
| G0 | typecheck and pure unit tests for core, xtdb, qlever | no |
| G1 | unchanged44 shared conformance, current and reopen | yes |
| G2 | native142 (71 tasks, current and reopen); lane X tallies XTQL and SQL separately | yes |
| G3 | entity suite: repository and raw queries against the KV oracle | yes |
| G4 | semantic counterexamples with their original expected answers | yes |
| G5 | write semantics: duplicate command, CAS conflict, unknown outcome, crash and reopen | yes |
| G6 | scale rung (10k, 100k, 1m, 10m) | yes, dedicated window |
| G7 | load: 64, 256, then 512 and 1024 clients with steady writes | yes, dedicated window |

**Receipt fields:** gate, lane, git SHA and dirty flag, engine image digest, engine config hash,
fixture id and seed, start and end time, pass and fail counts, first failures (kept, never
overwritten), timings, and resource observations (peak container memory and CPU, volume bytes).

### 4.5 Notebook and code comments

`lab/NOTEBOOK.md` is append-only. Each entry records the experiment id, lane and track, hypothesis,
mechanism and its pinned source inspiration, result class (PROGRESSED, NO-CHANGE, REGRESSED, FAILED,
INCONCLUSIVE), receipts, decision, and notes for the next generation.

Code comments carry the reasoning in a fixed form so a reader can trace every mechanism:

```ts
// [EXP-012] Why: entity timeline rewrite keeps one code path for card-one and card-many.
// Inspired by: references/xtdb @ c6c1962 core/src/main/clojure/xtdb/sql/plan.clj:L (DML for portion).
// Rejected: incremental FOR PORTION OF updates (EXP-019: 3x slower on 50-version entities).
```

## 5. Resource envelope

Sam's Mac has 12 CPUs, 36 GiB RAM and about 93 GB free disk. His default Docker VM runs the Onboarded
stack and is off limits.

| Resource | Envelope | Rule |
| --- | --- | --- |
| Docker VM | colima profile `triplex2`: 6 CPU, 12 GiB, 60 GiB disk | always `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`; restore `docker context use colima` after any colima command |
| Resident dev engines | `tx2-xtdb-dev` (about 3 GiB), `tx2-qlever-dev` (about 2 GiB) | correctness work shares them through disjoint database scopes |
| Heavy slots | 3 slots, about 3.5 GiB each, own ports and named volumes | performance and destructive tests only |
| Scale window | one at a time; stops other slots | rungs 1m and 10m, load tests |
| Disk | VM disk 60 GiB hard; stop new heavy runs at 50 GiB used; repo plus references under 5 GB | measured with `docker system df -v` per receipt |
| Agents | at most 10 concurrent; at most 4 concurrent heavy local test or typecheck runs | `lab/bin/heavy` lock |

The VM can grow (for example to 20 GiB RAM) when a rung measures the need. That change is recorded
in the notebook with the measurement that justified it.

## 6. First generation (gen-1)

| Id | Lane, track | Experiment | Depends on |
| --- | --- | --- | --- |
| EXP-000 | shared | loop harness: `lab/bin` (engine up/down, slots, gate runner, receipts, scorecard) | none |
| EXP-001 | X1 | baseline: G0, G1, G2 on our XTDB with XTQL and SQL tallies | EXP-000 |
| EXP-002 | Q1 | baseline: G0, G1, G2 on our QLever | EXP-000 |
| EXP-003 | shared | fixture generator and KV-oracle entity suite (G3 skeleton) | EXP-000 |
| EXP-004 | X3 | XTDB table-per-type projection with entity timeline rewrite | EXP-001 |
| EXP-005 | Q3 | QLever current graph projection and compact ledger | EXP-002 |
| EXP-006 | Q2 | correlated NOT EXISTS: rewrite hypotheses against the original counterexamples | EXP-002 |
| EXP-007 | Q2 | mixed-case string order: maintained order key versus engine repair | EXP-002 |
| EXP-008 | X2 | XTQL implementations for SQL-only native tasks | EXP-001 |
| EXP-009 | X5, Q5 | scale rungs 10k and 100k for A0 baselines | EXP-001, EXP-002 |

## 7. Resume protocol

Context compaction will happen. `lab/STATE.md` is updated at every dispatch and every completion with
the running agents, their branches and slots, pending decisions and the next three actions. After any
compaction the orchestrator reads `lab/STATE.md`, `lab/SCORECARD.md` and the notebook tail before
acting.

## Changelog

- v0, 2026-11-07: first draft, before research and review.
