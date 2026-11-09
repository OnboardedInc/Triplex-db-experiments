# Scope of triplex-db-2 (authoritative; Sam confirmed 2026-11-07; lane D added by Sam 2026-11-08)

Read this first. It overrides every older statement of goals, scope or targets in this repository, including the
inherited homebase files (`wiki/goals.md`, `wiki/status.md`, `handoffs/claude-native/*`, `qualification/devloop/*`,
the devloop sections of `AGENTS.md`) and earlier versions of `lab/PLAN.md` and `lab/acceptance/`.

## 1. What stays

1. **The ten-goal plan is the backbone of scope.** All ten goals must be met on both lanes: exact types, schemas and
   constraints; expressions and errors; plans, costing and recursion; negation at coherent cuts; aggregates;
   cancellation and resources; atomic writes, receipts and recovery; reuse and maintained supports; bitemporal history,
   presence, deletion and cascades; public TypeScript integration.
2. **Three lanes:** XTDB (XTQL primary, SQL as the named alternative), QLever (SPARQL), and, from 2026-11-08, Datomic (Datomic
   Datalog query and pull). Sam, 2026-11-08: "switch to orchestrating the two you are doing AND a Datomic-based version as well".
   Lane D is held to the same five priorities, ten goals, requirements, contract and golden scenarios as the other two.
3. **Triplex works like an ORM on top,** and raw native queries still make sense.
4. **The loop machinery stays:** the evolutionary loop, frozen correctness contracts, independent oracles, bound
   receipts and independent verifiers.

## 2. What changed: performance targets and requirements

1. **Sam's five priorities, in his order, are the hill-climb fitness** (`lab/NORTH-STAR.md`, fixed):
   P1 many concurrent reads, each pinned to an exact point in time, that never block writers;
   P2 small, atomic, idempotent commits per subject, with low latency;
   P3 an ordered, resumable change feed;
   P4 a fast path to current values, kept separate from history;
   P5 release activation re-evaluating up to 100k subjects without hurting live traffic.
2. **Their measurements, the fixed writer trace and provisional bars are in `lab/TARGETS.md`.** They replace the old
   performance targets: the generic load bar (256 requests/s offered, 25.6 commands/s, latency bars), "10m entities and
   100m facts" as the main performance target, and the old 256/512/1024-client load and stress profile with its frozen
   overload policy. Concurrency of 256 readers (1,024 under stress) with a fixed writer trace running stays, as part of P1.
   Year-one scale (10m entities, 100m active facts, 150M to 500M retained facts a year) is the size the priorities are
   measured at, not a target in itself.
3. **Sam's must-haves are requirements both engines must try to meet, not knockout gates.** Per-subject atomic idempotent
   commit with lost-ACK resolution; snapshot reads at a named point in time; an ordered change feed reporting entity,
   attribute and the valid-time range affected; no silent precision loss (Sam's corrected numeric rule below, which replaces
   "exact int64 and decimal"); real erasure or crypto-shredding of PII; tenant isolation at the storage layer; an atomic path
   to the outbox and work items. Each maps onto one of the ten goals with its own tests (`lab/TARGETS.md` section 3).
4. **Numbers: no silent precision loss** (`lab/research/SAM-pasted-numbers-2026-11-07.md`). Exact storage and round trip for
   every value kind the world definition uses; order-preserving comparison for any attribute used in a range rule; a hard
   error, never silent conversion, for any value the engine cannot hold; integer range of at least 2^53; arithmetic over many
   rows only where a projection needs it. Arithmetic runs in the TypeScript kernel per subject; money is scaled integers or
   order-preserving decimal strings; never floats for business values. Full signed 64-bit range is not required.
5. **20 real-world golden scenarios** on top of the normal performance tests put the system under the expected load; they are
   part of the done condition (`lab/TARGETS.md` section 6, `lab/PLAN.md` section 5).

## 3. How the databases are treated

1. **All three are candidates for every layer, including source of truth.** None is ruled out; each is built to the fullest
   extent possible.
2. **Where something is impossible natively, say so plainly and build a workaround.** Example: QLever's exact int64 and
   decimal gap is handled with exact lexical channels and by routing exact arithmetic elsewhere, not by dropping QLever.
3. **The suggested shape is a hypothesis adjusted per database by evidence:** one append-only source of truth plus current,
   history and analytical indexes fed from the change feed, with the best engine picked per layer.

## 4. What is out

1. Only Sam's pasted text is in scope (`lab/research/SAM-pasted-targets-2026-11-07.md`); his full analysis file is not used.
2. No performance work trades away correctness: exact values, exact cuts and atomic commits stay the floor.
3. Homebase-only scope does not apply here: the DuckDB lane and the three Datalog query paths belong to another team; the
   homebase queue, controller, VM, ports and resource grants are not ours.

## 5. Rules for every agent and every document

1. Every brief carries a **North star** line naming the priority (P1 to P5) it moves and how that is measured, or a stated
   correctness reason.
2. Briefs cite `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md` for goals and targets. Inherited files are read only
   for facts about code and evidence, never for goals or targets.
3. When an older document disagrees with this file, this file wins, and the older document gets a superseded note.
