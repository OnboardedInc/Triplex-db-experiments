# Published DuckDB source mapping

All observations below are static source observations at PR 8 head 0e8823973f5e1b886b7ef96e8dc5a899f467f241. They do not describe a new executed database or close any recovery/lifecycle acceptance gate.

## Store ownership

[typed_store.py]([PRIVATE_REFERENCE_REMOVED]), returned blob 100a4cbb7867f1454a304635ed6ba618d0ef04ce:

- The class constructor owns a connection, performs schema/bootstrap checks and closes the connection on setup failure (592–624). The schema signature helper has its own reference-DDL connection; a future adapter must not collapse all source paths into a one-connection claim.
- close (640–652) is guarded by the declared floating-point contract while the store is open, returns immediately after a prior close, marks the store closed after the connection close returns, and then performs its existing storage budget check. A post-close error is therefore not proof that the connection remained open.
- The inherited context manager calls close, but this is not an Effect acquisition/release layer or a declaration about ownership of a shared host connection. An adapter must explicitly decide whether it owns the underlying connection and who alone performs final release.

[store.py]([PRIVATE_REFERENCE_REMOVED]), returned blob 479d6a9133acddfd32a6c93a723f8c77155db4e4, contains that context manager. These source paths do not establish interruption cleanup, release exactly once, cross-thread ownership, crash recovery or the state of any stopped attempt.

## The existing plan explanation is not Triplex explain or provenance

[planner_v1.py]([PRIVATE_REFERENCE_REMOVED]), returned blob 4bfaa1c6cc8c7829acfb37750aa2376951c3e8ed:

- PlanExplanation (38–60) exposes snapshot/known/valid cuts, selected route, fallback reason/scope, conservative proof bounds, observed counts, generated SQL, parameter types and materialization. The schema is td.plan/1.
- explain_planned (738–740) calls the same _run planner as an actual planned read, with explain_only=True.
- _run (698–735) validates the caller fields, begins a real read transaction, checks the owned catalog/session, reads the current position, selects the plan and commits. The explain branch skips the main result execution, not the preceding planning reads.
- _select_plan (599–652) obtains retained/visible statistics, may invoke td_plan_ir_v1 using SQL, obtains SQL pattern counts and constructs the route/proof explanation. These are real source-level call sites, not observed executions in this research pass.
- The explanation contains no Triplex structural-query preflight, QueryPlan/QueryMetrics service contract, scoped page cursor, or complete source-fact explanation. The numerical proof bounds are conservative planner-admission facts, not semantic provenance.

It would be misleading to alias this method to all of Triplex's explain requirements merely because both names contain explain. Conversely, these differences alone are not an observed defect in the deliberately separate DuckDB prototype.

## Boundaries already preserved

The native typed result and text Datalog language remain distinct from Triplex's tagged values and structural query language. Existing per-call trust, FP, all-retained-input validation and resource limits must survive any future adapter path. Capabilities.none would disable Triplex's optional wrappers; it would not create the base StorageAdapter/QueryExecutor implementations or prove lifecycle/recovery. No public adapter, capability matrix, provenance service or runtime conformance is introduced here.

