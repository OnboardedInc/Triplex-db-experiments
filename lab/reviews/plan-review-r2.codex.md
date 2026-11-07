The response still leaves critical protocol gaps. B1 is permissible in scope, but its commit and recovery semantics are incomplete. B2 can return incorrect historical answers. B4 has not defined query semantics. Those must be resolved before dependent implementation.

1. **Severity: critical — B1 has no precise durable commit decision or group-commit semantics.**

   **Disputed:** “`LOGGED` … → `APPLIED` … → `VERIFIED` … → `PUBLISHED`,” with preconditions checked “against the published state.” ([Response B1](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:35))

   Is `LOGGED` an irrevocable commit decision or merely a recoverable intent? After a crash following its fsync, can the command disappear, or must recovery finish it? Command retries, claims and position allocation depend on that answer.

   Group commit creates another hole. Two commands can both pass the same `EntityState` or `TripleLive` precondition against the published prefix, although only one should succeed. The current implementation evaluates commands against staged state and preserves nested savepoints and pending claims. ([QLever transaction state](/Users/sam/projects/triplex-db-2/packages/qlever/src/QleverStorageAdapter.ts:279), [pending claims](/Users/sam/projects/triplex-db-2/packages/qlever/src/QleverStorageAdapter.ts:429))

   **Change:** Specify the authoritative durable decision, its linearization point, durable outcomes and crash transitions. Validate successive group members against a staged prefix containing earlier accepted members. Consult unresolved durable claims before admitting duplicates. Test competing preconditions, duplicate commands within a group, failed children, lost ACKs and crashes after every durable transition.

   **Scope answer:** A durable log does not inherently violate the handoff. “Native” is defined by authored query language and preserved contracts, not exclusive engine ownership of durable bytes. ([Handoff](/Users/sam/projects/triplex-db-2/handoffs/claude-native/README.md:31)) Name and qualify the complete `QLever + log` profile. Claimed native reads, including fallbacks, must execute through its declared SPARQL path.

2. **Severity: critical — B1’s fence must cover existing native reads that mutate QLever.**

   **Disputed:** “the writer is the only mutator.” ([Response B1](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:45))

   That is false of the current code. Native recursive reads materialize working graphs through direct `client.update` calls; cleanup issues another update. Their uncertainty handling currently polls markers on the existing server. ([Materialization](/Users/sam/projects/triplex-db-2/packages/qlever/src/native/BasisRelations.ts:137), [cleanup](/Users/sam/projects/triplex-db-2/packages/qlever/src/native/BasisRelations.ts:197))

   A failed scratch update can poison the same mutable delta as an application write. An adapter-only fence leaves the original failure alive.

   “At least two access patterns” is also insufficient as a general consistency certificate. The source mutates six permutations sequentially; cancellation after SPO can leave POS and SPO updated while later permutations remain untouched. ([Permutation order](/Users/sam/projects/triplex-db-2/references/qlever/src/index/Permutation.h:44), [mutation loop](/Users/sam/projects/triplex-db-2/references/qlever/src/index/DeltaTriples.cpp:200))

   **Change:** Inventory and broker every modifying route: application commits, recursive scratch, cleanup, boundary refresh, rebuild and administrative mutation. Require exclusive mutation credentials, closed-epoch proof and recovery after writer death. Verification must establish complete expected effects and required absences, with access-path coverage tied to actual plans. Two successful queries cannot substitute for that proof.

3. **Severity: major — B1’s rebuild and compaction path is a new subsystem, not free functionality.**

   **Disputed:** “Bulk load and compaction come for free: a fresh index is built from the log segments.” ([Response B1](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:48))

   An operation log is not an RDF snapshot. Concatenating insertion records resurrects deleted current triples; SPARQL operations are not index-builder input; N-Triples does not preserve named graphs. The pinned builder accepts RDF dataset formats, including N-Quads. ([IndexBuilderMain.cpp](/Users/sam/projects/triplex-db-2/references/qlever/src/index/IndexBuilderMain.cpp:72))

   Rebuild publication also has its own crash window. The pinned source explicitly warns that failure during index-directory moves can require filesystem repair before restart. ([Qlever.cpp](/Users/sam/projects/triplex-db-2/references/qlever/src/libqlever/Qlever.cpp:783))

   **Change:** Define deterministic log replay, graph-preserving export, format/codec versions, checkpoint manifests, segment retention and crash-safe generation selection. Rebuild from a declared durable prefix and compare complete logical contents against independent expectations. Reforecast disk with log, checkpoints, export scratch, old/new indexes and retained failures. “Second durable copy” materially changes the previous capacity estimate.

4. **Severity: critical — B2’s projection selector ignores `recordedAt`; A6 remains incomplete.**

   **Disputed:** Use the current graph when the basis is “latest” or its P matches, and V falls inside the publication window. ([Response B2](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:63))

   Counterexample:

   - P1 records `"old"` at R=1000.
   - P2 corrects it to `"new"` at R=2000.
   - A read requests `recordedAt: 1000` and a V inside the current window.

   The existing native basis resolver captures current P2 **while retaining R=1000**. B2’s P/V check admits the current graph and returns `"new"`. ([Basis resolver](/Users/sam/projects/triplex-db-2/packages/core/src/native/NativeQuery.ts:71)) Existing native relations correctly apply separate P and R predicates. ([Sources.ts](/Users/sam/projects/triplex-db-2/packages/xtdb/src/native/Sources.ts:53))

   A6’s physical-boundary XTDB mapping has the same limitation: selecting the engine snapshot for P does not implement an independent R selector.

   **Change:** Define eligibility over the complete resolved basis, scope, schema/mapping generation and projection completeness. Initially, explicit R should use the exact logical path unless equivalence is proven. Add old-R/current-P controls, including corrections and future retirement metadata.

   **C3 answer:** I accept exact ledger fallback for interior XTDB cuts. I have no evidence that they are common, and no cited contract requires a separate latency guarantee for them. The remaining objection concerns correctness of ordinary R-selected reads, not mandatory optimization of rare interior cuts.

5. **Severity: critical — B1 and B2 disagree about when publication occurs.**

   **Disputed:** B1 orders `VERIFIED` before `PUBLISHED`; B2 puts the publication marker inside the original update, before read-back verification. ([B1](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:38), [B2](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:59))

   **Snapshot answer:** The healthy single-query premise has strong source support. `QueryExecutionContext` captures a stable read-only delta snapshot, and normal index scans retain that snapshot. ([Context](/Users/sam/projects/triplex-db-2/references/qlever/src/engine/QueryExecutionContext.h:252), [IndexScan](/Users/sam/projects/triplex-db-2/references/qlever/src/engine/IndexScan.cpp:81))

   But QLever publishes that snapshot inside `modify`, after persistence and before your later verification. ([DeltaTriples.cpp](/Users/sam/projects/triplex-db-2/references/qlever/src/index/DeltaTriples.cpp:528)) Readers can therefore observe a marker described as PUBLISHED while the application state machine still considers it APPLIED.

   Visibility before ACK is not itself wrong. An undefined relationship between visibility, durable commitment and verification is wrong.

   **Change:** Choose one protocol. Either the durable log decision is irrevocable and the native snapshot swap is publication, with verification explicitly post-publication; or prevent serving the candidate generation until verification completes. Define recovery for every externally observable generation. Test concurrent readers, empty results, cache reuse, restart and index replacement.

6. **Severity: critical — B2 lacks a bounded strategy for large temporal boundaries.**

   **Disputed:** “one SPARQL update operation per commit group”; boundary maintenance is another such group. ([Response B2](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:59))

   A boundary expiring a million facts is not equivalent to a small ordinary commit. The engine fully materializes the WHERE result and constructs insertion/deletion collections before applying changes. ([ExecuteUpdate.cpp](/Users/sam/projects/triplex-db-2/references/qlever/src/engine/ExecuteUpdate.cpp:13)) Delta memory is outside the normal query allocator, and publication copies retained delta structures. ([R2 measurements](/Users/sam/projects/triplex-db-2/lab/research/R2-qlever-capabilities.md:83))

   Splitting the operation without another publication mechanism exposes intermediate graph contents under an inaccurate marker. Leaving it monolithic can repeatedly exhaust memory and fence the lane.

   **Change:** Define preconstruction bounds and a qualified oversized-boundary path: staged generations with explicit dataset selection, a controlled unavailable projection plus exact fallback, or another proven mechanism. Include discovery, staging, publication, cancellation and recovery costs. Demonstrate writer progress while maintenance overlaps. A rebuild trigger is not a hard delta bound.

7. **Severity: major — B3’s production topology is acceptable, but its visibility claim is false.**

   **Disputed:** One scope per engine means default queries “see only the projection’s domain triples and rows.” ([Response B3](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:76))

   A disjoint namespace does not hide triples from `SELECT ?s ?p ?o`. QLever’s default graph still unions ledger, metadata, scratch and any staged-generation graphs. ([R2 graph semantics](/Users/sam/projects/triplex-db-2/lab/research/R2-qlever-capabilities.md:35))

   **Scope answer:** I find no public guarantee requiring multiple production scopes on one physical engine. `DatabaseScope` defines logical identity, not physical placement. ([DatabaseScope.ts](/Users/sam/projects/triplex-db-2/packages/core/src/runtime/DatabaseScope.ts:8)) Existing factories nevertheless accept runtime scopes independently of their endpoint, so a one-scope profile needs an enforced binding. ([QLever factory](/Users/sam/projects/triplex-db-2/packages/qlever/src/index.ts:41))

   **Change:** Persist and validate endpoint-to-scope ownership. Refuse a mismatched scope before accessing unqualified projection storage. Specify concrete raw datasets and distinguish domain-predicate queries from unrestricted inspection. Any staged-generation solution must prevent bare domain queries from unioning old and new generations. Retain shared-profile collision tests.

8. **Severity: critical — B4 defines routing, but still does not define conflict semantics.**

   **Disputed:** Enforcement means conflicts “cannot be written”; conflicted query attributes become “unknown” and use the lossless relation. ([Response B4](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:89))

   Enforcement is optional per transaction. It rejects newly introduced or worsened violations and can leave existing violations intact. ([TriplesLive](/Users/sam/projects/triplex-db-2/packages/core/src/store/TriplesLive.ts:348), [newlyViolated](/Users/sam/projects/triplex-db-2/packages/core/src/Constraint.ts:376))

   There are already distinct policies to preserve: graph cardinality counts assertions, while the existing entity decoder deduplicates equal values before testing scalar ambiguity. ([Constraint count](/Users/sam/projects/triplex-db-2/packages/core/src/Constraint.ts:193), [EntityCodec](/Users/sam/projects/triplex-db-2/packages/http/src/EntityCodec.ts:203))

   A lossless relation does not determine whether filtering a conflicting `{Alice, Bob}` scalar returns an entity, throws, or produces an explicit unknown. Joins, aggregates and negation need equally precise answers.

   **Change:** Freeze outcomes per API and operator, including equal duplicates and pre-existing conflicts under enforcement. Specify error scope and unknown propagation. Documenting a scalar convenience limitation is acceptable; using that convenience shape to certify ORM/raw equivalence is not. Provide a canonical conflict-aware native relation.

9. **Severity: critical — A12’s entity-level fallback cannot preserve whole-query completeness.**

   **Disputed:** Invalid or untyped projection data stays ledger-only; “the entity is marked partial so repository reads route to the ledger.” ([Decision A12](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:22))

   Consider `find({where: {name: "Alice"}})`. If Alice’s projected name is absent because her entity is partial, scalar filtering removes her **before** hydration can choose fallback. The same defect affects joins, counts and negative queries.

   R9’s proposed set-read guard checks expired row windows but omits shape validity and other completeness conditions. ([R9](/Users/sam/projects/triplex-db-2/lab/research/R9-core-plumbing.md:347))

   **Change:** Establish eligibility for the complete query dependency set before filtering. Use query-wide fallback when completeness cannot be established, or prove a disjoint, complete union of projection and exact branches before ordering, aggregation and pagination. Test partial entities that should match, should affect negation, and sit beyond the first page.

10. **Severity: critical — A10 must reject R9’s “passes44 therefore safe” journal shortcut.**

    **Disputed:** The native journal awaits R9 and a capability decision; R9 recommends a slim journal because all44 still pass. ([A10](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:20), [R9 recommendation](/Users/sam/projects/triplex-db-2/lab/research/R9-core-plumbing.md:18))

    R9 also explicitly states that slimming removes `:_tx/change` and `:_tx/changed-entity` from ordinary queryable facts. ([R9 tier table](/Users/sam/projects/triplex-db-2/lab/research/R9-core-plumbing.md:215)) Those facts are publicly documented, including their availability to application audit queries. ([Operational contract](/Users/sam/projects/triplex-db-2/docs/operational-primitives.md:39))

    Deriving `Triples.transaction()` results does not preserve that surface. R9 additionally identifies changed array ordering, negative-zero behavior and unjournaled-system-write distinctions.

    **Change:** Preserve the queryable logical journal contract, including identities and metadata needed to reconstruct it, or explicitly identify a breaking profile that cannot claim unchanged functionality. Add direct audit-query compatibility tests beyond44. Keep legacy behavior and stronger new targets separately specified.

11. **Severity: major — B5 still places independent expectations too late.**

    **Disputed:** Tiny falsifiers are step3; the independent oracle and mutation controls are step4. ([Response B5](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:108))

    The dangerous gap is who determines the tiny tests’ answers. These cases already contain competing contracts: raw lifetime versus snapshot metadata, assertion cardinality versus distinct-value decoding, and legacy journal versus exact ledger values.

    **Change:** Before step3, freeze independently reviewed golden vectors or the minimal oracle covering those cases. The larger oracle framework can follow. Require the first vertical slice to exercise projection selection, exact fallback and set-query completeness through packaged public entrypoints.

    **C2 answer:** An early repository skeleton is fine. I withdraw any objection based solely on its existence. The objection applies when production behavior determines expected answers.

12. **Severity: critical — A3/C1 permit self-selected performance passes and unenforced resource limits.**

    **Disputed:** Each hypothesis declares its regression budgets; implementation will be “one acceptance file, a receipt binder and a compare script … not … a scheduler or queue.” ([A3](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:13), [C1](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:124))

    A candidate’s predicted cost cannot also determine its acceptance allowance. Repeated “+100% write bytes” promotions can exhaust capacity while individually passing. The existing benchmark contract already requires promotion rules to be frozen before candidates and changed budgets to create a new profile. ([Benchmark contract](/Users/sam/projects/triplex-db-2/qualification/benchmark-contract.json:60))

    Resource forecasts also race unless reservation is atomic: two workers can each observe sufficient free capacity and jointly exceed it.

    **Change:** Separate hypothesis predictions from profile-wide acceptance budgets. Compare cumulative integrated cost against frozen controls. Enforce atomic resource reservations, ownership and release after proven cleanup.

    **C1 answer:** No homebase controller is required. Small scripts and a local lease file—or a strictly serialized sole admission authority—can suffice. But evaluation files alone cannot enforce admission, physical cleanup or B1’s runtime fence.

13. **Severity: major — A4 binds hashes without guaranteeing reconstructable evidence.**

    **Disputed:** Source identity may be a “`git stash create` tree or diff hash”; raw results are hashed. ([Decision A4](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:14))

    Those source methods do not automatically include untracked files. A hash also does not retain its preimage. Deleted ignored outputs can leave an impressive receipt that nobody can inspect or reproduce.

    **Change:** Retain indexed source/input preimages, including executed untracked inputs, actual runner/controller bytes, build manifests and raw outcomes. Include the log format/replayer and broker in B1’s identity. Keep credentials and dependency caches outside retained evidence. Hash retention and byte retention are separate requirements.

14. **Severity: critical — The final done predicate still needs one integrated acceptance profile.**

    **Disputed:** A1 promises a matrix, while B5 ends with “XTQL parity, scale ladder, load.” ([A1](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:11), [B5](/Users/sam/projects/triplex-db-2/lab/reviews/plan-review-r1.response.md:120))

    That permits a collage: correctness on one mapping, load on another, recovery on a small obsolete layout and package tests with optional features disabled. R9 confirms existing44 drivers use `Capabilities.none`; those passes cannot establish optional functionality. ([R9](/Users/sam/projects/triplex-db-2/lab/research/R9-core-plumbing.md:408))

    **Change:** Define completion as a conjunction over identified integrated source/build/profile versions for XTQL, SQL and SPARQL. Include:

    - All ten obligations, with capabilities enabled where claimed.
    - Sparse and representative entity populations, representative query families, topology/skew and retained history.
    - Target-scale256-client acceptance,512/1024 stress and post-stress recovery.
    - Complete application cost: log, broker, verification, scratch, fallbacks, maintenance and clients.
    - Packaged SDK consumers, migrations, both history contracts, deletion/cascades, cancellation/drain and support invalidation.
    - Explicit compatibility rules determining which earlier receipts remain applicable after each change.

    The existing benchmark contract already enumerates useful query families, history depths and graph topologies; retain that breadth when adapting it. ([Benchmark dimensions](/Users/sam/projects/triplex-db-2/qualification/benchmark-contract.json:5))

Before implementation starts, PLAN v1 must contain:

- The reviewed acceptance matrix, independent golden expectations and integrated done predicate.
- A complete QLever durable-decision, fencing, replay and publication protocol covering **every** mutator.
- Full R/P/V projection eligibility and query-wide completeness rules.
- Frozen conflict, journal, raw-dataset and scope-ownership contracts.
- Bounded large-boundary/rebuild strategies, atomic admission, cumulative performance budgets and retained evidence preimages.

**The plan is not ready now. Once those changes land, yes: it is ready to execute as a gated experimental program. Safety hypotheses must remain hypotheses; failed falsifiers must block their dependent implementation and promotion.**