# Item5 started: grouped aggregates over completed strata

31 October 2026. Contributor explicitly directed moving from item4 to item5. **Item4 remains incomplete and empirically untested; all existing stopped saves and explicitly held dependent actions remain unchanged.** No acceptance is inferred from this move. Follow [the project-data-only policy](../../../PROJECT-DATA-POLICY.md): no computer-environment snapshots/details in future evidence or requests.

## Exact roadmap scope

Research and specify `count`, `min`, `max` and checked `sum`, with explicit grouping, set-versus-duplicate contributions, empty-group behavior, output types and overflow. Initially aggregate only completed lower-stratum relations and reject recursive aggregate cycles. Monotone/lattice or arbitrary recursive aggregates are outside this item.

Done requires independent-oracle and SQL-route agreement for duplicate derivations, empty/mixed-type groups, corrected history and overflow. Dependencies are1–4; the unresolved3/4 boundaries remain real prerequisites, not silently accepted or bypassed. The current phase is **heavy primary research before selecting a contract or writing item5 implementation**.

## Active independent research

Three explicitly routed Sol6.1max workers cover:
1. Aggregate algebra, set/group semantics, stratification, safety, empty results and versioned IR/API alternatives.
2. Checked integer and finite-float aggregation, determinism, overflow/type policy, primary SQL behavior and independent-oracle obligations.
3. Exact public unstable-v2 capabilities, hash/sort/vector aggregation, ownership/cost models and future measurement design.

Only project-declared API/source pins, project code and primary sources are inputs; no computer inspection, compiler, native/database execution, tests or benchmarks are released by this research. No item5 contract, code or timing result is accepted yet.

## Preserved starting points

- [Published item4 source/QA WIP at691ccf65]([PRIVATE_REFERENCE_REMOVED]): source-only, not an empirically verified kernel.
- [Independent database/API analysis at29838bbd]([PRIVATE_REFERENCE_REMOVED]): analytical findings, not measured speedups or permission to release held work.
- The unfinished item4 prefix-seek proposal was stopped cleanly at this user-directed transition: only a published-source copy and partial source-review notes exist; no diff or proposed implementation was created or applied.

The coordinator retains source/PR ownership and will reconcile each independently permitted new checkpoint with current remote state. This note contains project decisions only, not a computer snapshot.
