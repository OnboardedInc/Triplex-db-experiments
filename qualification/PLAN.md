# Triplex temporal backends: XTDB versus QLever

> **triplex-db-2 scope note (2026-11-07):** goals, scope and performance targets for this checkout are defined only in
> [`lab/SCOPE.md`](../lab/SCOPE.md), [`lab/NORTH-STAR.md`](../lab/NORTH-STAR.md) and [`lab/TARGETS.md`](../lab/TARGETS.md). Where this
> file states goals, targets, scale, load profiles, lanes, queues, resource grants or devloop procedure, it is superseded
> history from the homebase. Read it only for facts about code and evidence.

Build two competing implementations of the same complete ten-goal system in this
independent checkout: **public Triplex-on-XTDB and public Triplex-on-QLever**.
Triplex supplies the schema/type model, facts, relationships, Datalog and mutation
contracts for both. The original Triplex and DuckDB projects remain read-only
references; DuckDB is not executed, cloned or modified. Event replay supplies the
independent correctness oracle. Native SQL/XTQL/SPARQL probes are diagnostics.
A prototype, conformance pass or capacity-limited milestone does not complete either backend.

## Architecture and initial proof

- Retain Triplex's TypeSchema/configuration, facts, commands and structured Datalog.
  Each backend provides its own StorageAdapter and QueryExecutor through Runtime.define.
  Begin with Capabilities.none; advertise optional providers only after qualification.
- Preserve assertion identity with assertion-keyed records, explicit Triplex valid
  and recorded fields, retraction positions, command claims, causal journal and
  transactional per-scope commit positions. Each backend owns storage and query
  execution wherever its capabilities fit. XTDB native temporal optimizations and
  QLever RDF representations require equality with the public semantics.
- Evaluate callback transactions at one stable basis with a pending-write overlay;
  prove source-position and command-absence guards in each backend's atomic write.
  XTDB uses submitted non-interactive writes; QLever's persistent update, atomicity,
  concurrent-writer and recovery mapping require independent evidence. Replay
  conflicts from a fresh basis. Reconcile uncertain outcomes before retrying. Distinguish
  submission, successful processing and reader visibility.
- Compile the same validated Triplex Datalog to native XTDB SQL or QLever SPARQL.
  Rules declare queries;
  facts commit through Triplex mutation APIs. Prototype missing native recursion
  with backend-resident fixed-point rounds, never whole-database host evaluation.
- Preserve base Triplex behavior. Add exact integers, expressions, broader completed
  derived relations and interval APIs through explicit compatible contracts rather
  than another schema/query language. Record unsupported cases until implemented.

## Orchestrated development loop

Root owns contracts, integration, shared qualification and the evidence ledger.
Three child slots rotate across backend storage/mutations, query compilation,
and independent oracle/test/profiling work. At a bottleneck test two or three
implementation hypotheses simultaneously;
use three hypotheses when verification infrastructure already exists.

For each bottleneck: retain a minimal reproducible failing public call, predeclare
two or three experiments with one changed variable and fixed resource/promotion
criteria, run bounded correctness experiments on isolated backend scopes, then
qualify paired performance exclusively under equal server quotas. Preserve every
failure and original configuration.
Promote only after focused and unchanged integrated gates pass, then reassign agents.
Shared-container recovery/failure trials require exclusive scheduling. Reuse one
backend-parameterized conformance, workload and scale harness, preserving identical
fixtures, expected answers, query ASTs, time mappings and normalization for both.

Acquire `scripts/triplex-lease.py --backend xtdb|qlever` around qualification,
recovery and native probes. Other agents wait for the lease owner's explicit
release before probing that backend. Fair performance requires the `all` lease;
acquiring it never stops or reconfigures a service automatically. These advisory
cross-process locks schedule qualification work; they do not fence application
writers or establish database transaction atomicity. The already-running XTDB
gate may finish under its existing exclusive scheduling agreement.

Progress through coherent public slices: transaction/visibility bridge; typed facts
and schemas; expression/query/negation/aggregation semantics; history and intervals;
cancellation/recovery/evolution; maintained derived relations; full capabilities and
comparative qualification. Test the relevant goals together rather than declaring
them complete from isolated code or models.

## Gates and comparison

- Small fixtures: upstream 44-case runtimeConformance, twenty workload families and
  all 71 independent event-oracle cases, plus precision, duplicate identity, pending
  reads, conflicts, lost acknowledgements, stable cross-connection cursors, restart,
  historical schema, alternate support and actual backend cancellation tests.
- Scale: 100,000, one million and ten million **distinct entities**. At each stage
  separately load sparse one-fact and representative ten-fact profiles, with history
  depth, relationships/graph shape, presence/version events and command widths reported.
  Ten million representative entities means roughly 100 million active domain facts.
- Retain independent milestones of ten million retained facts, million-fact query
  inputs and sixteen readers during ingestion. Exercise 1/4/16 clients, cold/warm,
  read-only and sustained ingestion, and all required query families.
- Compare **only public Triplex-on-XTDB and public Triplex-on-QLever** under shared
  semantics. Independent correct event replay is the oracle; tuned native backend
  probes are controls. Separate query-only
  work from complete operations maintaining equivalent history, receipts and derived
  state. Charge loading, maintenance, storage and rebuilds.
- Preserve raw observations and source/artifact hashes. Qualified P50/P90/P95/P99
  populations require 10,000 observations and three independent runs; smaller pilots
  are diagnostic. Include queueing/network/visibility/decoding and errors. Measure
  server/JVM and adapter memory separately.

## Fixed local envelope and completion

Use local resources only. Development may run XTDB at four CPUs/8GiB and QLever
at four CPUs/4GiB together. Fair performance runs serialize the backends with
exactly four CPUs/8GiB each; the other backend must be stopped with its data retained.
XTDB's 3GiB heap/2GiB direct settings are partial JVM budgets. Adapter total budget
is 2GiB. Owned disk is at most **12GiB across both backends together** while preserving
12GiB host free space. Count all dependencies, images,
logs, retained fixtures, compaction, backup/restore overlap and scratch. Inspect host
and guest/volume free space before loading. No deletions, global configuration
changes, remote capacity or automatic budget increases.

Calibrate controls under the fixed profile, then freeze numeric SLOs before
optimization candidates. Each new scale establishes its controls first. A resource,
topology or SLO-formula change creates a new named profile and retains prior failures.
If projected capacity exceeds the envelope, mark the stage BLOCKED_CAPACITY and
continue bounded optimization; the full target remains unachieved.

Completion requires all ten goals, relevant failure cases, agreed scale gates and
the twenty-workload comparison demonstrated through each backend's real public
Triplex APIs on the qualified builds. Fundamental incompatibilities require explicit evidence and a
documented decision; they cannot silently narrow acceptance.
