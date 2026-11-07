# Ten-goal task graph

The complete objective is all ten goals and the final fair twenty-workload
comparison. Only Goals 2, 4 and 5 are closed. This compact graph complements the
full [acceptance ledger](TEN-GOAL-LEDGER.md); a next slice is not a replacement
for the remaining requirements. Exact active source/builds and engine
ownership are in [TAKEOVER-STATE.md](TAKEOVER-STATE.md).

Implementation is paused after the old goal was cleared. The user requested
new source research followed by a plan. The [revised plan](NATIVE-TEMPORAL-STORE-PLAN-20261106.md)
preserves this completion graph and advances direct baselines, diagnostics and
entity-scale evidence. It does not itself resume implementation.

## Acceptance dependencies

| Goal | Current acceptance | Next concrete slice | Remaining completion requirements |
| --- | --- | --- | --- |
| 1. Types and schema | All eight types, uniqueness and managed presence qualified. | Raw presence5, SDK5 and profiler3 pass in isolation; coverage4 passes on its new pair. Boundary3 passes; growth fails in revalidate at128MB after260ACKs. Diagnose and eliminate measured42% no-policy cost before full integration. | Dense uniqueness cost, immutable schema/reference-policy evolution and complete coverage acceptance. |
| 2. Expressions | Closed on the qualified bounded grammar. | Preserve through every integration. | Exact eager faults, arithmetic boundaries, historical meaning and reuse remain regression gates. |
| 3. SQL-first planning | Bounded scans/unions/joins/negation/complete-source aggregates qualified. | Useful positive linear recursive SQL versus C++ round control, including a small frontier in a large domain. | Broader derived/multi-rule lowering, recursion/SCC completion, fresh costing and preconstruction admission under skew, attachments and concurrency. |
| 4. Negation | Closed: completed strata/corrections, writer full435, both matched broad27/27, both original B0 broad27/27 and original anti16/16. | Preserve one automatic native writer in the default build; public7 smoke passes. | Future source/artifact changes must preserve these semantics, scale and regression gates. |
| 5. Completed aggregates | Closed on the completed-source contract. | Preserve through every integration. | Full tuple support, eager faults, groups, overflow and correction cuts remain regression gates. |
| 6. Cancellation/resources | Public controls/diagnostics and isolated ordinary40k pass; two scoped callback-owner lifetime gates pass. | [Settle per-instance ownership](SHARED-NATIVE-BUDGET-DESIGN.md) across partial LOAD/old handles, then shared requested-capacity reservations. | Compiler/import/sort coverage, request/instance ownership, cleanup/denial/cancellation, engine memory/spill and host attribution at scale. |
| 7. Recovery/evolution | Native schema-bound commands, batches, replay, upgrades and crash cases qualified. | Integrate first-class assertion/retraction transactions and their journal/receipt contract. | Cross-API receipts, migration/reopen/recovery, actual checkpoint/appender spill and filesystem-full failures, broader contention. |
| 8. Maintenance/reuse | Isolated projection/DAG correctness proofs; two write-cost candidates rejected. | Common mutation hook and transactional publication at exact cuts, preserving every write route. | Reader-visible refresh, bounded caches/generation lifetimes, support deletion/recursion, registered and unregistered maintenance/storage costs. |
| 9. History/intervals | Point, interval, multi-cut, correlated lookup and managed presence qualified. | Raw presence5/SDK5/profile3 and coverage4 pass in isolation; finish integration/boundaries/cost, then interval-local deletion and bounded reverse cascade. | Endpoint/correction oracles, old schema/cut meaning, replay/reopen/scale, and query proof lineage beyond stored correction provenance. |
| 10. Triplex | Unchanged 44-case suite plus selected native dependency/reservation delegation. | C++ contract parity for the remaining public schema/query/fact/graph operations. | Full delegation, typed/list/cardinality/reference boundaries and recovery; 44 conformance cases alone do not prove it. |
| Final comparison | All twenty families have functional oracles; final timed comparison open. | Prepare equivalent histories and allowed precomputation while implementing remaining goals. | Run all twenty after ten-goal acceptance: correct event replay, tuned DuckDB and temporal store; include maintenance, storage, cold/warm latency, throughput and resources. |

The native writer and reader-wide SDK ownership are promoted at source1d6378e2 with435 checks and exact default-build installation. Resource ownership supports
larger recursion, maintained generations and cascades. Existing presence
supports reference coverage; final-state transaction semantics and common
mutation handling support both references and derived maintenance. Keep old
schema hashes and receipts authoritative throughout. The final comparison
depends on the complete semantic and operational acceptance, not just query
throughput.

## Current work ownership

| Owner | Bounded assignment | Stop/acceptance boundary |
| --- | --- | --- |
| Root | Architecture, source/receipt review, integration, ledger and draft PR25. | Do not promote from indirect evidence; retain failures and qualified baseline. |
| orchestration_operations | Typed canonical policy VIEW sourced1e5e30d; evidence216e5d9b. | First5 PASS; cost source0989 frozen/unrun. New incremental-source report complete; implementation paused. |
| native_read_strategy | Typed derived-policy storage source88f43c8b; local evidence51d4b514. | First7 PASS after retained wrapper-only key repair; cost unrun. Temporal/event-source report complete; implementation paused. Caps0b reserved. |
| acceptance_and_benchmarks | Fusion source1a1e261f; additional admission QA sourcec7fcbb6c. | First4 plus separate first admission1 PASS; cost unrun under fixed budgets. Query-indexing source report complete; implementation paused. |

One worker owns the engine/build window at a time. Other workers may author
independent source and review small evidence. Each database is freshly owned;
archives and failed experiments are preserved. There is one application
strategy, with automatic native planning/admission, and no public strict/fast
mode. Native diagnostics do not create an alternative application backend.

The [research synthesis](RESEARCH-SYNTHESIS.md) supplies the evidence and
constraints for the next slices. The
[concurrent experiment log](CONCURRENT-INGESTION-COHORT.md) records promoted,
rejected and still-unqualified approaches separately.
