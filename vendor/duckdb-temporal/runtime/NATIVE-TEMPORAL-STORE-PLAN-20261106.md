# Native temporal store: research-led execution plan

Proposed 6 November 2026, after three parallel implementation-source research
lanes. Implementation is paused for this planning pass. This document updates
the development approach and ordering; it preserves the useful work and the
ten-goal completion contract. It does not start a new implementation goal.

## 1. Keep the foundation; improve the feedback loop

Continue in the existing temporal-store workspace and integration branch, with
[draft PR25]([PRIVATE_REFERENCE_REMOVED]). C++ and DuckDB remain
authoritative. Keep TypeScript as the host through semantic completion; consider
Rust afterward only if complete-call measurements justify the change. The app
has one automatic native ownership/planning strategy. Experimental branches
compare implementations, not public strict/fast modes.

The qualified integration source is `1d6378e2`; current checkpoint `5691739c`
adds evidence. Its matching default build passes the [435-check full run](evidence/native-writer-integrated-full-20261106.json)
and [installed-default public smoke](evidence/native-writer-default-build-20261106.json).
Goals **2, 4 and 5 are closed**. The eight value types are implemented and
qualified; schema/reference completion remains part of Goal1. All twenty workload
families have functional oracles, but the final timed comparison is open.

The existing ten-million-fact, sixteen-reader results remain valuable. They
do not establish ten million distinct entities, a direct-DuckDB speed ratio,
whole-process memory containment, or Linux qualification. Current platform
verification is macOS ARM64.

The main changes to the old plan are:

- Establish tuned direct DuckDB controls early and keep them in every relevant
  experiment, rather than waiting for the final twenty-workload exercise.
- Make complete-call attribution and representative entity-shaped data part of
  the normal development loop.
- Use two or three alternatives on the same dominant problem, with a shared
  oracle and comparison contract. Select a winner only when the complete cost
  is acceptable; retaining the baseline is a valid outcome.
- Consult actual implementation code repeatedly through a pinned local corpus.
  Research is a tool for choosing experiments, not a new set of prerequisites.
- Advance unfinished capabilities alongside optimization. At each checkpoint,
  explicitly choose a completion slice or justify another performance cycle.

## 2. Research completed before this plan

Three background lanes cloned **14 shallow working checkouts**, pinned commits
and preserved notices, without building dependencies. The existing pinned DuckDB
source archive is the fifteenth source. The new checkouts occupy about **2.19GiB**
including Git metadata. Code is outside product repositories and is for repeated
inspection; implementations and tests in our runtime remain independently authored.
Actual licenses differ across the corpus; manifests retain those distinctions.

Corpus: `[LOCAL_PATH_0035]`.
The [catalog]([LOCAL_PATH_0036])
pins every source, local path and lane manifest. The four reports map inspected
code to bounded experiments, with exact upstream commit links and local lines:

| Source group | Transferable techniques to test | Current position and remaining gap |
| --- | --- | --- |
| [Oxigraph, QLever, Jena TDB2, FoundationDB and Record Layer]([LOCAL_PATH_0037]) | Bound-pattern access, compact IDs, ordered/lazy scans, covering entries, filter-before-fetch, transactional old/new index changes. | We already have typed SQL lowering and native indexed probes. Persistent selective/covering access and their maintenance costs need actual-plan evidence; a composite DuckDB index declaration is insufficient. |
| [Kurrent/EventStoreDB, Marten, XTDB and MeTeoR]([LOCAL_PATH_0038]) | Separate log from read models; completed-prefix checkpoints; selective point versus interval resolution; endpoint-aware interval algebra. | Durable receipts, two temporal cuts and managed presence exist. Bounded history proof, selective interval reuse and correct maintained publication remain incomplete. |
| [Soufflé, Cozo, Differential, Timely and Feldera/DBSP]([LOCAL_PATH_0039]) | Binding-signature indexes, selective semi-naive rounds, shared arrangements, signed support changes, completion frontiers and maintenance/spill accounting. | Query-local indexes, adaptive atom selection and SCC delta evaluation already exist. Durable cross-command incremental results are still prototypes, not an accepted capability. |
| [Pinned DuckDB implementation and direct controls]([LOCAL_PATH_0040]) | Prepared-plan lifetime/rebinding, statement preprocessing boundaries, actual physical plans and statement/operator profiling. | Expanded-command profiling works. Complete-path phase attribution and tuned external controls are missing. |

This is a focused first code pass, not exhaustive mastery or a performance result
for those systems. The reports name precise next source visits. The earlier
[synthesis](RESEARCH-SYNTHESIS.md) and final issue26–29 reports remain inputs.
For every future experiment, record the source mechanism, its preconditions,
our corresponding code, what is missing, and the outcome. Equivalent techniques
already present in our code are not claimed as newly adopted from these projects.

## 3. Establish the comparison and diagnostic foundation first

### Three distinct comparison contracts

Publish separate results for:

1. **Tuned direct-SQL query floor:** the same question over equivalent already
   resolved data, with identical result semantics and full result consumption.
   State exactly which history, validation and maintenance work is excluded.
2. **Temporal-equivalent direct SQL:** equivalent valid/knowledge cuts,
   corrections, typing, applicable constraints, replay/receipts and maintained
   layouts. Charge ingestion, validation, commit, rebuild and storage.
3. **Public temporal-store call:** the complete request through C++/DuckDB and
   TypeScript to typed output or durable acknowledgement.

Direct SQL will be independently tuned and reviewed, not merely the store's
generated SQL renamed as a control. The minimum first slice is **one tuned
entity lookup and one correction/ACK**, using existing verified fixtures and
capabilities. Extend promptly to a selective relationship join, missing-match
anti-join, aggregate and wide result as each informs an active wave. A complete
trace framework or all three external engines must not delay the frozen write
comparison or become a new prerequisite for implementation progress.

Use the same pinned engine, data/history recipe, answers, snapshots, output
materialization, thread/CPU allocation, memory/spill limits and update stream.
The mixed-load default comparison uses one process/shared database instance
with independently owned connections on each side; other topologies are labeled
separately. Include engine, SDK/libuv and native-writer threads in the resource
accounting. Map the authored logical K to each committed fixture state rather
than equating DuckDB transaction IDs with application knowledge positions.
Charge indexes and precomputation on every side. Report fresh-process and warm
behavior; a fresh process alone does not establish a cold OS cache.

At 1/4/16 clients, report offered load, completed throughput, queue waiting,
service latency, public p50/p95/p99, effective execution overlap, writer ACKs,
errors, memory/spill and storage growth. Match aggregate resources rather than
giving every direct connection an independent budget. Include both fixed-client
and controlled-arrival load where necessary to expose saturation and queueing.
Longer runs need enough completed samples for the stated tails; short screens
remain engineering screens. Repeats and alternating order are planned in advance.

### One trace across the complete call

Link request submission, reader/writer queueing, native input/SQL generation,
parse/bind/optimize, operator execution, validation, commit, fetch/copy and typed
decode. Distinguish first row from full consumption and commit from ACK delivery.
Report overlapping or unavailable spans honestly. Capture every expanded statement
through the real public call; use EXPLAIN/JSON profiles in diagnostic runs and
unprofiled timing for performance claims. Measure diagnostic overhead itself.

This allows separate decisions for small-write planning and large-result
copying. The observed 79→112ms write regression and roughly22ms optimizer span
justify native plan-shape experiments. They do not establish a reason to replace
TypeScript. Likewise, a wide-result host cost does not identify Rust as a win
without an equivalent transfer/materialization experiment.

### Early established-engine comparisons

Add a bounded comparable-query pilot for Oxigraph, QLever and Jena TDB2, expanding
from small selective questions to joins and missing-match cases. Use the existing
authored workload definitions and typed oracles. State RDF/SPARQL set/bag,
datatype, blank-node, path and temporal differences explicitly. A materialized
snapshot is a query-floor comparison, with extraction/loading/index time charged
separately. Unsupported history or update semantics remain explicit; they are
not silently supplied for free. Match total resources and report client/server
or JVM costs where present. These pilots inform the next experiments and do not
block completion of the native store. FDB/Record Layer, event stores and dataflow
engines primarily supply implementation techniques; this plan does not replace
DuckDB or launch a full deployment/benchmark project for each one.

## 4. The development loop

1. **Choose one problem from measurements and the acceptance ledger.** Name the
   application question, dominant stage, current baseline, semantic gap and
   expected mechanism. If evidence is missing, the first slice is diagnosis.
2. **Write a small experiment contract.** Freeze the shared fixture, independent
   oracle, public call, cut/update trace, artifacts, resource profile, comparison
   controls, numeric budgets and stop condition before candidate timing. Include
   read, write, startup, rebuild, memory and storage costs relevant to the change.
3. **Assign two or three competing approaches.** Workers own disjoint worktrees,
   code and fresh databases. Give each an objective, code references, artifact
   output and stopping point. Share immutable dependencies and source corpus.
   Use fewer workers when there are fewer credible hypotheses. Preparation or
   independent review may be complementary; optimization arms compare the same
   workload rather than unrelated successes.
4. **Reach a small real-engine proof early.** Exercise public entry points,
   independent typed/temporal oracles, deliberate adverse conditions and the
   relevant rollback/replay/cancellation/reopen behavior. Create the data and
   overlap needed for the test. Unit/models support this; they do not replace it.
5. **Measure exclusively, then decide.** Builds and performance windows are
   scheduled on the shared machine. Source reading/review may proceed in parallel;
   competing builds, heavy hashes and benchmarks do not. Require actual operator
   and row/block evidence for an access-path claim. Keep every first failure;
   repair identified technical causes explicitly, and do not repeat failed
   measurements merely to obtain a pass or change budgets after seeing a result.
6. **Promote, reject or combine with a new hypothesis.** Correctness and lifecycle
   gates are mandatory. A read win that moves excessive work to writes/startup
   is not automatically useful. If none passes, retain the baseline and the
   findings. Combining ideas requires another measured candidate, not adding
   isolated wins arithmetically. Keep one production strategy.
7. **Integrate a small reviewed slice and checkpoint it.** Rebuild its actual
   paired artifacts, run the appropriate integrated suite and broad regressions
   on the exact source, then update the existing draft PR, task graph, experiment
   log and restart handoff. PR descriptions start with Situation, Complication,
   Resolution. Full-suite counts are from real registered/executed runs, never
   sums of unrelated focused checks. No merge or deployment is part of this plan.

I remain responsible for architecture, selection, integration and acceptance.
The current runtime supports three workers plus me. Fifteen remains the user's
ceiling if capacity expands, not a staffing target. Research swarms are bounded;
implementation workers rotate with the current problem. Independent source and
oracle review is part of acceptance, including review of my integration choices.

### Make the loop cheaper to operate

Consolidate the repeated staging, build, focused-run and evidence steps into a
small maintained harness with one manifest schema and reliable fixture factories.
Reuse the existing exact dependency closure and compiled artifacts when source
identity permits. Verify changed inputs during iteration and the complete exact
snapshot at promotion; do not regenerate bespoke wrappers for every spike.
The recent wrapper-key mistakes are tooling failures to eliminate. Keep raw
evidence once with compact summaries and pointers, rather than duplicating large
captures or databases through every worktree. Declare per-wave disk and compute
budgets; reuse sources and immutable base fixtures. Existing data and failed
experiments remain preserved; deletion requires separately authorized scope.

## 5. Initial experiment sequence

The first implementation tranche after this plan is accepted establishes the
minimum direct control and the trace needed by the current wave, then finishes
existing spikes. Additional controls and source visits prepare the next wave
without blocking these already bounded tests. It does not reopen the closed
semantics or start all new ideas at once.

| Wave / shared problem | Competing approaches and evidence | Acceptance boundary |
| --- | --- | --- |
| Existing small-write overhead | Finish the frozen comparisons of proof fusion, typed canonical policy VIEW, and rebuildable typed policy storage. Their first functional gates pass4/5/7 respectively; fusion has an additional one-method admission gate. Cost screens are unrun. | Keep original zero-policy p50≤1.05×2f in both orders, p95≤1.15×2f and IR5 policy-phase medians≤1.10× qualified229/a562 controls. These denominators are separate from the new direct-SQL floor. Preserve error order, replay/receipt/history bytes and ordinary resource caps. No automatic promotion of the fastest failing option. |
| Historical revalidation memory | First identify the exact inner audit that fails at128MB after260ACKs/K261. It also fails without coverage. Depending on that cause, compare a bounded ordered proof, bounded per-audit prefix reuse, and a rebuildable transactional prefix projection only if justified. | Same canonical history, old/latest answers and proof publication; no cap raise or omitted invariant. Presence is latest full PUT reset plus union of subsequent PATCH intervals; fact correction and original-validator provenance remain separate. Diagnose the existing failure separately from added policy-planning cost. |
| Small answer amid unrelated data | Compare plan-only legal pruning, a verified engine access path/ordered layout, and a narrow covering projection. Use actual supported predicates; an index that cannot scan the predicate is rejected cheaply. | Exact eager errors/admission/cuts remain observable. Charge dictionary/index build, update maintenance, storage and reopen; demonstrate fewer physical candidates and a complete-call gain. |
| Small recursive frontier in a large domain | Compare a useful C++-generated linear recursive SQL slice with one bounded C++ indexed-round mechanism, choosing composite binding indexes or demand restriction from the measured stage. Add a third arm only for a distinct credible mechanism. | Compare the identical declared legal query subset. Include disconnected noise, high-degree cases, cycles and duplicates; preserve remaining native SCC, eager-error and counter controls. Require resource/cancellation and small-frontier usefulness. No general-SCC implementation prerequisite for testing a useful linear slice. |
| Repeated answers after small changes | On one update trace, compare full recomputation, bounded affected-region recomputation and transactional maintained supports. Start with nonrecursive/acyclic joins and aggregates. | Exact alternate-support deletion, negative/zero transitions, late valid-time corrections, same-K publication, rollback/replay/crash/rebuild, plus write/storage/maintenance debt. Simple support counts are insufficient for cyclic recursive deletion. |

Only one main optimization wave is active at a time. Diagnostic and fixture work
can prepare the next wave. Deeper C++ hooks or a DuckDB fork are considered only
when repeated measurements demonstrate an extension boundary that prevents a
valuable result. Prepared reuse, compact persisted IDs and native vector transfer
are candidate mechanisms, not commitments to large rewrites before evidence.
Persisted compact IDs must retain all eight type/byte distinctions and canonical
hash/receipt identity, with migration, old-writer freshness and rebuild gates.

## 6. Scale means entities, relationships and history

Keep the existing fact-scale fixtures and add separately named entity-scale
recipes. Progress through100k,1m and **10m distinct entities**, alongside fact
and history counts. Report retained identities, current live entities, facts,
edges, presence events, correction depth, commands and output rows independently.
Distinct entities means stable application entity identities, not RDF object
terms, blank nodes or assertion wrappers created by a comparison encoding.

Use both a fixed-fact density sweep and ordinary small entities with varied
attributes and relationships. Ten million ordinary entities may imply many more
than ten million facts; estimate disk and ingestion cost from smaller stages
before allocating the largest fixture. Separate bulk fixture construction from
normal application ingestion throughput, and charge equivalent history/receipts
in the temporal comparison. A count of empty identities alone is not the
application-shaped ten-million-entity result.

Workloads include a few entity lookups, selective1–3-hop relationships,
members missing a matching condition, skewed popularity, fan-in/fan-out,
cycles, sparse disconnected noise and repeated local corrections. Vary one major
dimension at a time instead of multiplying every combination. Larger cases follow
passing correctness/resource gates and a declared storage budget. Every conclusion
names the actual entity/fact/history population and resource profile.

## 7. Complete the remaining goals through these slices

The [ledger](TEN-GOAL-LEDGER.md) and [dependency graph](TASK-GRAPH.md) remain the
completion authority. This sequence supplies better evidence for finishing them:

| Goal | Work still required |
| --- | --- |
| 1. Types/schema | Preserve all eight types; finish immutable schema/reference coverage, boundaries, dense-history cost and integrated acceptance. |
| 2. Expressions | Closed; preserve exact grammar, typed errors and historical meaning. |
| 3. Native SQL planning | Broader relational lowering, useful selective recursion/SCCs, measured costing and preconstruction admission. |
| 4. Negation | Closed; preserve completed strata, corrections and concurrent ownership. Maintained anti-joins need their own delta acceptance. |
| 5. Completed aggregates | Closed; preserve support, eager errors and numeric behavior. Maintained aggregates are additional work under Goal8. |
| 6. Resources/cancellation | Shared request/instance ownership, remaining native allocation surfaces, engine/host distinction, spill/denial/cancellation and lifetime cleanup. |
| 7. Transactions/recovery | First-class assertion/retraction transactions, preserved versioned receipt contracts across APIs, format evolution, uncertain ACK/reopen and actual failure/recovery cases. |
| 8. Maintenance/reuse | Common mutation seam, exact reader-visible publication, maintained supports and bounded generations/caches, with complete lifecycle costs. |
| 9. History/intervals | Integrate presence/coverage, interval-local correction/deletion and bounded reverse cascade, historical schema meaning and proof lineage. |
| 10. Triplex | Finish native delegation of the remaining public contracts; preserve all conformance behavior through real entry points. |

Resource ownership and the common transaction seam support recursion and
maintenance. Presence supports reference/deletion rules. Maintained projections
stay rebuildable from canonical facts/history and publish only at a proved cut;
event-log position, dataflow completion and durable database commit are distinct.
Historical queries may not silently read compacted current-only state.

Publication identity includes the relevant database incarnation, input generation,
schema/program/compiler/codec identity and valid/knowledge scope, not K alone.
Imports, schema changes and a query's valid-time boundary can invalidate reuse
without a new ordinary command. Define physical assertion support, logical tuple
membership and rule-grounding multiplicity separately before writing maintenance
oracles. Preserve every existing versioned wire/hash/ID contract; delayed replay
returns its original full receipt before current constraints. This is not a
receipt-shape unification project.

Retained maintenance first requires explicit ownership and charging for overlapping
old/new generations, deltas, rebuild, rollback and output lifetimes. Spill and
fuel budgets do not establish native byte or whole-process containment.

## 8. Milestones and reporting

1. **Interpretable baseline:** early tuned direct DuckDB comparisons, linked
   complete-call traces, explicit concurrency waiting and actual population
   counts; targeted established-triple-store pilots begin.
2. **Measured native improvements:** finish the three existing cost alternatives,
   resolve the diagnosed audit boundary, and promote only accepted candidates.
3. **Application-shaped scale:** selective reads and ongoing corrections across
   increasing distinct-entity populations, reaching10m entities with1/4/16
   clients and matched direct controls.
4. **Semantic and operational completion:** close the seven open goals through
   reviewed native slices, preserving the three closed goals. Qualify actual
   Linux ARM64/x86_64 execution when suitable runners exist; until then retain
   the macOS-only verification claim. This is platform qualification of the
   same strategy, not another application implementation.
5. **Final fair twenty-workload qualification:** correct event replay, tuned
   temporal-equivalent DuckDB and the store with equivalent histories/answers/
   precomputation. Include cold/fresh and warm behavior, concurrency, full result
   conversion, build/rebuild/maintenance, storage, recovery and resource costs.
   Report unsupported cases and remaining gaps rather than collapsing different
   semantic contracts into one ranking.

At each checkpoint report the capability completed, direct-control ratio where
comparable, absolute application latency/throughput, resource and maintenance
costs, failed hypotheses, changed decisions and next uncertainty. Keep the
research-to-experiment record compact and consult the source corpus when choosing
the next mechanism. Implementation remains paused after this proposal.
