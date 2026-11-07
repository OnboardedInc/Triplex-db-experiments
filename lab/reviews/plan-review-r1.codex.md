1. **Severity: critical — The gates do not establish the done condition.**

   **Disputed:** §5.4, G0–G7, versus §1’s promise that “All ten goals … pass.” ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:259))

   Several obligations have no explicit acceptance test:

   | Goal | Missing acceptance requirement |
   |---|---|
   | 3 | Useful plans, costing, admission **before** expensive construction, scalable recursion |
   | 6 | Observed native cancellation, deadline enforcement, physical drain, bounded ownership and cleanup |
   | 7 | Schema/data migration and evolution |
   | 8 | Bounded reuse, invalidation, alternate-support maintenance and transactional publication |
   | 9 | Presence, deletion, cascades and the five retained retirement-metadata failures |
   | 10 | Packaged public consumer, scope isolation, cursor compatibility, capabilities and lifecycle |

   These are explicit requirements in the [goal ledger](/Users/sam/projects/triplex-db-2/wiki/goals.md:9). R6 already documents their missing implementations and evidence, including **nothing proven for native goal 8**. ([R6](/Users/sam/projects/triplex-db-2/lab/research/R6-xtdb-gap-analysis.md:394))

   G6 merely names scale rungs; reporting latency and bytes supplies no failure condition. G3’s undefined “entity suite” cannot silently stand in for every missing obligation.

   **Change:** Define a versioned goal-to-gate matrix before implementation. Each obligation needs named cases, expected answers/errors, required entrypoint, applicable scale and concurrency profile, and a machine-checkable closure rule. Missing, skipped and unsupported cases keep the corresponding goal open.

2. **Severity: critical — G7 permits correct stale reads and negligible writer progress to look successful.**

   **Disputed:** “load: 64, 256, then 512 and 1024 clients with steady writes.” ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:268))

   “Steady writes” has no rate, visibility requirement, fairness rule or observation window. A dishonest implementation could acknowledge a trickle of writes, serve a permanently old projection, reject most demand, and report excellent latency for the remaining correct reads. The ledger explicitly records an earlier native256 diagnostic with **no visible command inside its window**. ([Goals](/Users/sam/projects/triplex-db-2/wiki/goals.md:34))

   G6 and G7 are also independent labels: nothing requires the accepted load run to use the 10m-entity dataset, representative queries, retained history or active maintenance.

   **Change:** Calibrate and freeze the writer floor, arrival model, query mix, fairness and overload policy before comparison. Record attempted/admitted/rejected/completed requests, outstanding work, correctness-qualified read goodput, write visibility and freshness. Distinguish 1024 logical clients from connections and in-flight engine work. Require target-scale load acceptance, maintenance overlap and recovery after stress. No invented production SLA is needed; explicit experimental acceptance criteria are.

3. **Severity: major — The selection rule encourages both stalling and easy-goal farming.**

   **Disputed:** “pick the lowest-scoring goal that has a feasible next experiment” and promote when “the target gate improves and no lane gate regresses.” ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:219))

   The [scorecard](/Users/sam/projects/triplex-db-2/lab/SCORECARD.md:3) contains OPEN/PARTIAL/PASS labels, without a scoring function or tie-break. “Feasible” lets the orchestrator repeatedly avoid cancellation, migration, support maintenance or engine repair.

   “No regression” is also underspecified. If it includes every performance metric, mandatory projections can be rejected because they increase write cost. If it means only existing binary passes, serious resource and freshness regressions can pass. Comparing against one old `main` receipt adds environmental noise and incompatible fixture/rung comparisons.

   **Change:** Separate hard semantic invariants from performance tradeoffs. Use matched, repeated comparisons and predefined regression budgets. Schedule against a dependency graph with explicit progress obligations for blocked goals, bounded implementation WIP, and stagnation escalation. Verify the combined candidate after integration; separate branch passes do not certify their composition.

4. **Severity: critical — The receipts can certify code that never executed.**

   **Disputed:** Receipt identity consists of “git SHA and dirty flag,” image/config hashes, fixture identity and counts. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:270))

   A dirty flag does not identify dirty source. A source SHA does not identify the built JavaScript. The qualification loader explicitly imports backend **`dist` exports**. A branch can therefore typecheck new source while executing stale artifacts. ([Loader](/Users/sam/projects/triplex-db-2/packages/qualification/src/index.ts:127))

   Counts are insufficient too. R6 identifies 11 XTQL-only tasks, three hybrid tasks and 57 SQL-only tasks. Porting only the 57 leaves hybrid SQL dependencies. Separate language tallies can remain green while neither language independently executes the complete packet. ([R6](/Users/sam/projects/triplex-db-2/lab/research/R6-xtdb-gap-analysis.md:119))

   **Change:** Bind receipts to retained source preimages, lockfile/toolchain, build inputs and output hashes, actual imported entrypoints, gate/oracle versions, schema/mapping identities, raw-result hashes and fixture contents. Fail closed on skips, missing identities and wrong endpoints. Require 142 named executions **per claimed language**, with all read substeps identified. Gate/oracle modifications need separate review.

5. **Severity: major — KV is useful differential coverage, but insufficient as the entity oracle.**

   **Disputed:** “The oracle is the in-memory KV runtime”; G3 also recomputes the projection from its ledger. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:190))

   Both sides share core transaction, temporal, constraint and decoding behavior. Agreement can reproduce one core bug twice. Reusing the projection’s own reducer for recomputation adds another circular check.

   This is concrete: the configured fixture returns correct membership while leaking future retirement metadata; 44/142 were never intended to catch it. The stronger snapshot target and ordinary lifetime contract are explicitly distinct. ([R6](/Users/sam/projects/triplex-db-2/lab/research/R6-xtdb-gap-analysis.md:233))

   **Change:** Keep KV as a regression participant. Add an independently implemented event-replay oracle that imports no production visibility, constraint, projection or hydration code. Cover complete assertion metadata, both history contracts, values, receipts and failures. Mutation controls must demonstrate that wrong boundaries, dropped supports, future metadata and rounded values make the suite fail.

6. **Severity: critical — H-X-CUT is false for the existing transaction contract.**

   **Disputed:** “commit position P maps exactly to the `_system_from` of the `tx_meta` row version written in P’s transaction.” ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:117))

   One XTDB transaction can contain multiple Triplex positions. Nested callbacks merge their allocated positions into the parent, while persistence writes only the final position into one `tx_meta` row. ([Nested transactions](/Users/sam/projects/triplex-db-2/packages/xtdb/src/XtdbStorageAdapter.ts:343), [position allocation](/Users/sam/projects/triplex-db-2/packages/xtdb/src/XtdbStorageAdapter.ts:486), [metadata persistence](/Users/sam/projects/triplex-db-2/packages/xtdb/src/XtdbStorageAdapter.ts:246))

   Counterexample: two Triplex transacts inside one outer transaction produce P1 and P2. Both share one engine system time; `AS OF` that time sees their combined physical result. No timestamp distinguishes P1. R6 already states this limitation. ([R6 §3.4](/Users/sam/projects/triplex-db-2/lab/research/R6-xtdb-gap-analysis.md:355))

   **Change:** Narrow the hypothesis to physical commit boundaries. Preserve logical position filtering or an explicitly versioned logical representation for intermediate cuts. Test nested positions, same-R commits, corrections and reopen first. Preserve microseconds through the wire: the researched driver’s `Date` decoding truncates them. ([R1](/Users/sam/projects/triplex-db-2/lab/research/R1-xtdb-capabilities.md:196))

7. **Severity: critical — QLever roll-forward recovery assumes a trustworthy ledger that the engine can corrupt.**

   **Disputed:** “ledger triples applied idempotently; read-back verification; … a reconciler re-applies positions above the watermark.” ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:149))

   R2 reproduced a **single timed-out operation** leaving different permutations with different contents. A later successful update published the inconsistent state. One operation per request does not prevent this. ([R2 §1.8](/Users/sam/projects/triplex-db-2/lab/research/R2-qlever-capabilities.md:166))

   The source mutates permutations sequentially, checking cancellation between them, before marking the complete triple set. ([DeltaTriples.cpp](/Users/sam/projects/triplex-db-2/references/qlever/src/index/DeltaTriples.cpp:200)) An idempotent retry can consequently encounter partially mutated structures. A read-back through one access path cannot establish consistency. A watermark neither repairs those structures nor reconstructs an intent lost with the client.

   **Change:** Specify a fenced writer and durable intent/outcome state machine. Fence all updates and rebuilds after uncertainty until recovery establishes trustworthy state. Retain replayable command bytes before mutation. Fault-inject between permutations, persistence, snapshot publication and watermark changes; verify multiple access paths after restart. Define and prove the ACK durability model.

8. **Severity: critical — T1 promises atomic publication while QLever implements separately advancing views.**

   **Disputed:** T1 is “written in one atomic step,” but QLever publishes a ledger watermark and lets “the projection follow[] its own watermark.” ([T1](/Users/sam/projects/triplex-db-2/lab/PLAN.md:53), [protocol](/Users/sam/projects/triplex-db-2/lab/PLAN.md:149))

   After ledger publication and before projection completion, identical requested bases can return different answers. During an in-place projection update, readers can also observe data inconsistent with its advertised watermark.

   Reporting the graph’s P/V exposes staleness; it does not fulfill a requested basis. A single current graph cannot preserve a P1 cursor after the graph advances to P2. Valid-time boundaries introduce changes even without new commands.

   **Change:** Define one read-publication contract across ledger, projection, schema and indexes. Either publish immutable projection generations with a coherent selector, prove another atomic mechanism, or route affected reads through an exact fallback. Specify ACK/read-your-writes behavior and price fallback traffic. Test delayed maintenance, boundary crossings without writes, crashes during publication and cursor continuation after advancement.

9. **Severity: major — The union-default-graph argument does not select the winning RDF topology.**

   **Disputed:** Per-assertion graphs are disadvantaged because “the union default graph would expose historical values to raw queries.” ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:146))

   That is true of an **unqualified dataset**, not a disproof of the representation. R3 supplies an assertion-graph query with explicit visibility and an exact basis export. ([R3](/Users/sam/projects/triplex-db-2/lab/research/R3-orm-prior-art.md:500))

   The chosen topology still has scope leakage: unioning multiple scopes’ current graphs exposes their combined domain triples. Reused entity IRIs can create cross-scope joins. Likewise, XTDB `_id = entity id` needs scope-qualified physical identity or scope-separated tables; the existing ledger uses composite identities.

   **Change:** Define the documented raw-query dataset and scope contract first. Compare current graphs and assertion graphs under that same contract. Require explicit graph selection where needed and collision tests using identical entity IDs in two scopes. Measure named-graph cost; R2’s graph-metadata limits are an actual physical concern. ([R2](/Users/sam/projects/triplex-db-2/lab/research/R2-qlever-capabilities.md:55))

10. **Severity: critical — The seven-triple ledger has no losslessness argument.**

    **Disputed:** “Assertion nodes shrink … to about 7,” with journal entries derived from assertion creation/retraction. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:136))

    The proposed field list does not account for the complete typed value domain, per-assertion `createdBy`, optional entity type, retraction transaction/position, schema metadata or the full causal transaction envelope. Transaction actor cannot replace per-assertion creator: they are separate public fields. ([Triple contracts](/Users/sam/projects/triplex-db-2/packages/core/src/Triple.ts:8), [transaction contracts](/Users/sam/projects/triplex-db-2/packages/core/src/store/Triples.ts:91))

    The current core reads journals as `_Transaction` assertions. “R9 confirms core can accept a native journal” is an integration dependency affecting public behavior, not merely a storage optimization. ([Journal reads](/Users/sam/projects/triplex-db-2/packages/core/src/store/TriplesLive.ts:634))

    **Change:** Produce a field-by-field encode/decode specification covering every public assertion, history, transaction and receipt API. Test empty commands, duplicate-valued assertions, assert/retract combinations and complete causal metadata. Recalculate storage and write amplification from the integrated representation after compatibility passes.

11. **Severity: major — `_id`-first solves point lookup, not the required query workload.**

    **Disputed:** “Every hot read resolves through `_id`,” using value-keyed attribute indexes and target-keyed reverse-reference indexes. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:106))

    Equality on a known key can benefit. Ranges, sorting and unknown-value discovery do not acquire an ordered index merely because the key is stored in `_id`. R1 establishes point-lookup performance and non-key scans; it does not establish this broader design. ([R1 Q7](/Users/sam/projects/triplex-db-2/lab/research/R1-xtdb-capabilities.md:437))

    Nonunique keys also create a missing physical-design decision: a boolean value or popular reference can have millions of postings. One document becomes huge and expensive to rewrite; splitting postings requires a bounded discovery strategy. Ordinary raw predicates will not automatically use application-maintained index tables.

    **Change:** Make R7 falsify concrete posting layouts using skewed values, high-degree references, ranges, ordered pages and historical reads. Measure retrieval, update amplification, contention and raw-query cost. Keep `_id`-first as a hypothesis until those tests pass.

12. **Severity: major — Content-addressing the projection spec does not solve schema evolution.**

    **Disputed:** A content-addressed projection spec and “exactly one declared type” per column. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:55), [types](/Users/sam/projects/triplex-db-2/lab/PLAN.md:123))

    The adapter currently receives no active schema, while ConfigStore releases are facts stored through that adapter. R4 identifies this plumbing gap explicitly. ([R4](/Users/sam/projects/triplex-db-2/lab/research/R4-codebase-harness-map.md:76))

    Missing decisions include release selection per write/read, simultaneous old/new clients, backfill publication, historical mappings and valid low-level writes without entity-type labels. XTDB column types widen across historical writes; a later incompatible value can change wire decoding and round int64 values. ([R1](/Users/sam/projects/triplex-db-2/lab/research/R1-xtdb-capabilities.md:210))

    **Change:** Define release-aware physical mapping, versioned storage where necessary, resumable backfill, publication barriers and old-cursor behavior. Test evolution with concurrent clients and reopen. Do not reject otherwise valid Triplex writes merely to preserve a projection optimization.

13. **Severity: major — NULL-plus-marker can turn conflicts into false absence.**

    **Disputed:** Card-one conflicts write NULL, while the repository throws a typed error. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:127))

    A raw predicate, join or aggregate can silently omit that entity. `NOT EXISTS` can report absence even though conflicting assertions exist. Merely storing a marker does not make those results equivalent to the repository error.

    Also, existing cardinality enforcement counts assertions, including duplicate-valued assertions; it does not count distinct projected values. ([Constraint.ts](/Users/sam/projects/triplex-db-2/packages/core/src/Constraint.ts:193)) RDF deduplication creates another support problem: retracting one of two identical assertions must retain the shared plain triple.

    **Change:** Define conflict semantics for filtering, joins, aggregates and negation on both lanes. Supply a lossless value/assertion relation and explicit conflict-aware query contracts. Test equal and unequal duplicates, overlapping intervals, partial repair and retirement of one remaining support.

14. **Severity: major — Helper repairs cannot close the full raw-query and exact-value obligations.**

    **Disputed:** “Native helpers reject or rewrite” broken XTDB shapes, and QLever’s order/correlation helpers are described as semantic fixes. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:131))

    The researched repairs have narrower boundaries:

    - QLever order keys do not repair raw `ORDER BY STR`.
    - Correlation rebinding requires definitely bound variables, renamed internal variables and correct placement in branches.
    - Exact lexical storage and order keys do not implement exact arithmetic or full-support aggregates.
    - Rejecting an entire valid query shape cannot close a goal requiring its supported behavior.

    These limitations are explicit in [R5’s equivalence conditions](/Users/sam/projects/triplex-db-2/lab/research/R5-qlever-semantic-blockers.md:252) and [R2’s numeric findings](/Users/sam/projects/triplex-db-2/lab/research/R2-qlever-capabilities.md:304).

    **Change:** Publish an operator-by-type capability matrix for repository queries, supported native fragments and unrestricted raw escape hatches. Keep original raw counterexamples visible. Required functionality outside helper equivalence conditions needs another implementation or an engine repair. Bounded TypeScript evaluation must include its complete candidate set and cost.

15. **Severity: critical — The resource envelope is internally inconsistent and maintenance is not bounded.**

    **Disputed:** Two resident engines consume about 5 GiB, plus three heavy slots of about 3.5 GiB, inside a 12 GiB VM. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:303))

    That is **15.5 GiB before OS and observer overhead** if the slots are additional. If residents occupy those slots, the plan must say so and admission must enforce it.

    The 17 GB QLever estimate is steady-state extrapolation from 400k facts. R2 forecasts 34–51 GB during rebuild retention, before the other foundation, history, complete metadata, images and receipts. ([R2](/Users/sam/projects/triplex-db-2/lab/research/R2-qlever-capabilities.md:441)) Rebuilds require overlapping old/new index storage. ([QLever documentation](https://docs.qlever.dev/rebuild-index/))

    Finally, triggering rebuild at 1M delta triples does not cap delta growth while writes continue during a multi-minute rebuild.

    **Change:** Enforce aggregate CPU/memory/disk reservations, counting each resident once. Forecast peak allocation before admission. Include delta growth during rebuild, replay peaks, retained indexes and host-side clients/builds. Add backpressure when that forecast exceeds capacity. Qualify a changed envelope explicitly; “the VM can grow” supplies no capacity evidence.

16. **Severity: major — Generation 1 builds abstractions before resolving its architecture’s falsifiers.**

    **Disputed:** EXP-003 starts repository/projection types immediately; EXP-005 and EXP-007 build projections; EXP-008’s oracle suite follows the repository types. ([Plan](/Users/sam/projects/triplex-db-2/lab/PLAN.md:317))

    This lets production design determine the tests that later certify it. EXP-007 combines ledger replacement, projection maintenance and recovery in one experiment, obscuring failure attribution. Meanwhile, tiny tests can already challenge the central assumptions.

    **Change:** Reorder generation 1:

    1. Freeze acceptance contracts, independent expectations, execution identities and resource admission.
    2. Establish fresh baselines while running tiny falsifiers: nested positions, eight-type round trips, historical metadata, duplicate supports and QLever mutation failures.
    3. Qualify compact-ledger round-trip compatibility and the write/publication protocol separately.
    4. Complete one packaged vertical slice per lane: write, repository read, authored native read, history, receipt, cursor and reopen.
    5. Expand language coverage and climb the scale/load ladder using those established contracts.

    Keep rivals focused on the measured bottleneck. Ten agents spread across six tracks will otherwise produce substantial unintegrated work.

The three changes that matter most:

1. **Replace gate labels with a complete, independently checked acceptance contract for all ten goals, including target-scale load and writer freshness.**
2. **Resolve logical-cut representation and QLever write/publication safety before committing to either projection architecture.**
3. **Make selection, evidence identity and resource admission enforceable, then organize generation 1 around small falsifying experiments and complete vertical slices.**