# Item6 — resource/algorithm primary research

2026-11-01 UTC · **PRELIMINARY RESEARCH ONLY; NOT A SELECTED CONTRACT, IMPLEMENTATION OR ACTION PLAN**

## Bottom line

Item6 needs **three different contracts**, not one memory-limit/deadline setting:

1. **Admission/ownership:** which input, dictionary/index, binding, scratch, persistent-delta and emitted-string owners consume which logical quota, before they are constructed/copied.
2. **Work/cancellation:** which bounded primitive events consume monotonically increasing work and where cancellation/deadline is observed. A result-size bound or live-byte cap does not bound candidate work or elapsed latency.
3. **Publication/health:** which operation is the final success commit, what errors expose, and whether this connection/store remains usable or must be marked restart-required. Already observed output cannot be recalled.

The exact typed set/temporal semantics must remain unchanged when quotas reject work. Resource rejection is not malformed input, an empty successful result, approximate sum/dedup, or partial success. No machine observation or physical-capacity promise follows from the logical model below.

**Labels:** F=fact from a cited primary source; D=hand derivation under explicit assumptions; H=unselected design hypothesis/proof obligation. Detailed mathematics and counterexamples are in `DERIVED-BOUNDS.md`; source identities/read limits are in `PRIMARY-SOURCES.md` and `PUBLIC-READ-GAPS.md`.

## 1. Join bounds: output is not work or intermediate admission

**F.** AGM bounds final set-natural-join cardinality using a fractional edge cover; it does not guarantee that an arbitrary evaluation plan has that intermediate size. The exact inequality is stated in D1. [AGM, 2013 author PDF, Lemma2/§4](https://www.cs.upc.edu/~atserias/papers/joins/queries-revised.pdf).

**F.** NPRR Theorem3.2 separates evaluation from query/data preprocessing; Remark3.3 makes removal of data-preprocessing cost conditional on specific indexes. Its result is an algorithm/model theorem, not a property automatically inherited by binary join plans or a private extension. [NPRR, PODS2012, Theorem3.2/Remark3.3](https://pages.cs.wisc.edu/~chrisre/papers/paper49.Ngo.pdf).

**D.** Equal-size triangle relations can have empty final join while a chosen first binary join has N² rows. Even with no materialized intermediate, a nested loop can inspect N² rejected pairs. Projection/set dedup can make a tiny final result conceal many witnesses. Thus a final-row/AGM admission bound cannot replace separate caps on input copies, plan intermediates, candidate/probe work, index construction and output bytes.

**H.** The later item6 contract needs a bounded query/rule description and declared evaluation cost model. It may use conservative cardinality admission or incremental reservations; no AGM optimizer/particular join algorithm is selected here. Approximate selectivity estimates cannot serve as proven upper bounds. Variable-length comparisons/hashes and index construction must be charged unless already paid by an explicitly owned index; treating an interned handle as constant-cost does not erase its construction cost.

## 2. Recursion/temporal growth: finite output needs explicit hypotheses

**F.** The cited paper distinguishes Boolean Datalog from weighted extensions and makes convergence/semi-naive generalization conditional; it is not an arbitrary arithmetic termination guarantee. [Abo Khamis et al., v5, §§2.4,3,6](https://arxiv.org/pdf/2105.14435v5).

**F.** PostgreSQL's recursive evaluation uses a working/intermediate table and `UNION` duplicate elimination. Its cycle discussion shows that a changing depth/path field can prevent duplicate-row elimination from terminating recursion; a parent LIMIT is not reliable when another operator demands all input. These are SQL implementation facts, not this store's selected semantics. [PostgreSQL18-labelled WITH documentation, §7.8.2](https://www.postgresql.org/docs/current/queries-with.html).

**D.** With a fixed finite canonical typed domain of size≤D, fixed predicate arities and monotone insert-once fact identity, at most `G=sum_p D^arity(p)` different facts can be inserted. That bounds successful novel facts/nonempty insertion rounds, **not failed candidates, repeated joins, derivations or retained provenance**. For a separately declared bounded temporal window with E fixed endpoints and only endpoint-preserving operations, fact/cell states are at most `G(E−1)`. Fresh terms, computed endpoints, accumulating numeric annotations or an unbounded path field invalidate those assumptions.

**H.** Raw records, distinct facts, interval fragments, candidate bindings, frontier copies, novel insertions and emitted rows need different counters. A fixed-point equality check or set cap alone is not cancellation/admission. The active domain/endpoints must include existing store state and rule constants, not merely this request's visible rows.

## 3. Admission before construction; logical bytes are not allocator/RSS

**F.** The successfully read official DataFusion MemoryPool page describes participation/reservation before allocation, but explicitly omits some streaming/operator memory from accounting. Its displayed version was55.2.0; the explicit version URL failed, so no immutable version-page or unseen implementation claim is made. A host pool is not automatic coverage of arbitrary private objects. [Successfully read MemoryPool page](https://docs.rs/datafusion/latest/datafusion/execution/memory_pool/trait.MemoryPool.html).

**F.** PostgreSQL describes `work_mem` per operation and potentially per worker, not as a query-wide cap. Summing simultaneously live operators can exceed one such allowance. [PostgreSQL18 resource consumption, Memory](https://www.postgresql.org/docs/18/runtime-config-resource.html).

**F.** DuckDB2.0 documentation confines `memory_limit` to its buffer manager and identifies vectors, results and complex aggregate state outside it. This generic documentation is not exact-pin v2 registration/allocation proof. It defeats the inference “a host memory setting accounts for every private dictionary/vector.” [DuckDB2.0, Resource Management](https://duckdb.org/docs/2.0/configuration/pragmas).

**D/H.** An accounting model must distinguish:

| Domain | Charge that must be explicit in a later model |
|---|---|
|Raw input|Raw occurrence count, value/byte lengths and metadata before constructing an owned input list; duplicate rows still cost admission/validation/work.|
|Dictionary|Unique owned byte payloads, entry metadata, lookup/bucket capacity, reference handles and temporary new/old tables during growth. Typed canonical identity, not untyped/coerced equality.|
|Indexes|All selected per-fact/per-fragment entries, prefix/key copies, capacity and build/sort scratch; not merely final fact cardinality.|
|Bindings/frontiers|Each live buffer's capacity/tuple width, optional interval/witness state, old/current/next frontiers and rejected-candidate construction.|
|Strings/results|Owned emitted bytes including escaping/framing, staging, concatenation/copy scratch, and bytes held until documented host transfer/copy.|
|Persistent update|Baseline store owners plus new delta/shadow/undo owners until commit or rollback; no implicit reset of old store charges per request.|
|Failure path|Bounded error representation and rollback bookkeeping; a normal error result is not guaranteed if an unreviewed host helper must allocate after exhaustion.|

Use declared logical weights/capacities, not guessed sizeof, character counts, allocator blocks or process memory. A shared payload may be charged once to its owner, but every owning reference/container/index still has a cost. Release only at genuine ownership end/transfer, not merely because a counter is decremented. Logical high-water is a mathematical maximum of held admissions/reservations, including pending construction if that model is chosen; it is not committed payload, a profiler reading or proof that physical allocation succeeded. Allocator rounding/retention and other host owners are separate from those logical charges.

Checking after constructing a whole list/copy is too late. At a borrowed-object/host-chunk boundary, private code can govern its **new** lists/copies, not retroactively prevent the host/caller's already constructed input. The earliest admissible producer/parser/API boundary and borrowed-versus-owned charge scope must therefore be selected explicitly. Unknown-output-size growth can be incrementally reserved before each append; a huge worst-case output estimate need not be allocated up front.

## 4. Work units, overflow and cancellation

**D.** Live bytes can fall while cumulative work grows indefinitely. Work quota must not be refunded on owner release. Overflow-safe reservation uses `n≤C−live` before addition; multiplication must be checked before forming a product. `DERIVED-BOUNDS.md` proves the invariant and handles over-cap sentinels without wrapping a maximum-width cap.

**F.** SQLite progress callbacks use an approximate VM-instruction interval; a nonzero callback interrupts, and the callback must not modify the same connection. SQLite interrupt operates when an opportunity occurs and can lose a race to an almost completed operation. These illustrate cooperative granularity, not APIs/semantics to substitute for DuckDB v2. [Progress handler](https://www.sqlite.org/c3ref/progress_handler.html), [interrupt](https://www.sqlite.org/c3ref/interrupt.html).

**H.** A bounded primitive model must cover expensive phases, not just an outer row loop:

| Phase | Needed work/poll boundary; otherwise hidden gap |
|---|---|
|Input/UTF8/interning|Each bounded byte/slot visit; a whole long string hash/compare is not constant work.|
|Join/index probes|Candidate/probe and key-byte work, including rejected pairs/collisions; successful result count is insufficient.|
|Sort/dedup|Comparisons and compared bytes plus scratch; an opaque library call needs a separately bounded uninterruptible region.|
|Recursion/temporal|Frontier/candidate/edge/interval advancement, including no-new-fact rounds and coalescing work.|
|Copy/serialization|Bounded chunk/encoded-byte work; precharging a huge copy does not create mid-copy cancellation points.|
|Cleanup/commit|Bounded owned bookkeeping and a defined final safe point; cleanup/host calls are not proven constant-time by a logical counter.|

Polling every k bounded primitives gives a **work-distance** bound to the next check. Detection/reporting also has check/cleanup cost. Wall-time latency additionally needs per-primitive, total opaque-region, check and cleanup time bounds; none are observed or assumed here. Smaller k adds polling overhead, larger k increases cancellation overshoot. A host deadline setting alone is not a proof about private loop checks. DuckDB2.0 advertises `max_execution_time`, but exact d54… source coverage/private-loop semantics belong to lane A and are unverified here. [Generic2.0 documentation](https://duckdb.org/docs/2.0/configuration/pragmas).

## 5. Atomic publication and healthy-or-restart-required outcome

**D/H.** Private construction/reduction/recursive updates should have a specified commit point: before it, resource/cancel/deadline failure exposes no successful result rows and discards/rolls back private staging. Persistent in-place mutation requires admitted undo information **before** mutation; shadow/copy-on-write construction requires both old and new owners charged concurrently. A final cancellation check needs an explicit race policy at commit; an asynchronous request arriving after publication cannot erase a result already accepted.

The requirement **no partial success** is distinct from **no partial observation**. Once a host/client has consumed chunks, later error cannot un-observe them. Full project staging can move project-computation failures before first publication, but a later host conversion/stream failure is still possible. The contract must choose an owned-result completion boundary or require consumers to discard all rows on terminal error. Empty success/EOF must not be used as an error signal. This is a publication proof obligation, not an adapter implementation or a claim about an existing callback.

**F.** SQLite specifies rollback for certain interrupted writes in explicit transactions; DuckDB's internal-error documentation describes an undefined/restricted instance requiring a new session. Neither implies all project quota failures poison the store, nor that all caught host errors leave it healthy. [SQLite interrupt contract](https://www.sqlite.org/c3ref/interrupt.html), [DuckDB2.0 internal-error contract](https://duckdb.org/docs/2.0/dev/internal_errors).

**H.** A later outcome should explicitly distinguish: controlled failure with proven cleanup/rollback and reusable request/store state; versus host fatal/undefined state or unverified rollback/ownership requiring a restart-required marker. The marker is not permission to perform a restart/delete/retry. Zero logical live bytes alone cannot prove host health or absence of an omitted owner. Exact v2 error/cancellation/ownership behavior remains a separate source obligation; public-read failure is not evidence those APIs are absent.

## Closure boundary

This lane supplies conditional logical bounds and primary-source constraints only. Numeric quotas/weights, work units, cancellation precedence, deadline/commit semantics, temporal domain restrictions, publication boundary and exact v2 integration are **not selected** here. `OPEN-QUESTIONS.md` lists those contract choices, not a test/execution plan. No implementation should begin until all three research lanes and independent peer review close under the coordinator's direction.

All item6 empirical stages are UNRUN. No project/native/host/compiler/module/parser/feed/test/benchmark or machine/resource/clock probe occurred. No configuration/profiling/diagnostic commands, raw diagnostics or computer details are retained. No old/held/paused payload was read, reconstructed or used; no external Git/Page write, deletion, Codex or subagent. Native/graph14 STOPs, Semantic8 tree-read pause and all old HOLDs remain unchanged.
