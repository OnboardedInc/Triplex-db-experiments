# Triplex query executor language and conformance

3 November 2026. Goal 10 source research and sixteen curated hand-only controls. No adapter subset, implementation, compiler lowering or executable action is selected.

## Findings for the next adapter contract

Triplex QueryExecutor consumes a validated structured query AST, rather than arbitrary Datalog text. Positive patterns and binary rule calls establish bindings. OR retains an incoming binding when an alternative exists without exporting branch variables. NOT tests the absence of one complete inner conjunction and permits local existential witnesses. Optional results come from a separate scalar optionalProjection structure. Tuple dispatch is also part of the contract: an unfamiliar operator-looking three-slot tuple can be a triple pattern, while certain identifier-led tuples are rule calls.

Aggregate input multiplicity needs its own mapping. COUNT is distinct over public source values; SUM/AVG/MIN/MAX consume joined inputs before final result DISTINCT. Empty ungrouped aggregation produces one row with count zero and other aggregates null. Rules are restricted binary definitions with a base requirement, constrained self-recursion and a shared effective depth policy. A larger native rule language cannot replace the upstream admission rules.

The QueryExecutor service requires execute, executePage, explain and explainPage. The inspected interface has no per-operator support negotiation. runtimeConformance supplies a runtime layer to the shared Triples cases; it neither provisions fresh storage nor includes every separate engine/compiler/integration test. The source corpus asserts important joins, rules, aggregate and error cases, but its presence does not establish a candidate adapter's runtime behavior.

Two independently counterchecked source combinations need a future comparison oracle before compatibility is claimed:

- optionalProjection with a positive rowBinding omitted from find: KV projects before hydration, while SQL resolves a correlated expression from compiler bindings.
- repeated finite base-rule definitions before outer aggregation: the inspected normalization retains those definitions, KV deduplicates endpoint pairs, and SQL combines base members with UNION ALL before outer aggregates.

These are conditional source-derived comparison obligations, not reproduced backend differences, confirmed defects or selected common expected results. The ordinary optional and rule examples inspected do not settle those combinations.

## Published product mapping

The unchanged DuckDB prototype accepts a six-field string-program request and returns a complete typed answer relation with native execution counters. Native negative atoms require every variable to be positively bound; aggregates consume completed full-tuple sets; output is canonically sorted. Its restricted aggregate grammar, three-column triple relation, lack of result-null representation and resource bounds require explicit translation. No Triplex QueryExecutor, optional wrapper, fourth transaction-ID binding, arbitrary query order/page service or conformance result is established by the existing native passes.

The [product map](PRODUCT-MAP.md) separates source facts from possible future helper lowering. A helper keyed by correlated outer variables may model existential negation, but it is an unselected design inference, not implemented code. Existing typed-value, cursor/receipt, lifecycle/explain, write-precondition and scope/generation packets retain their separate obligations.

## Evidence

- [Language, phase and error analysis](QUERY-SEMANTICS.md).
- [Required service, shared corpus and additional source assertions](QUERY-CONFORMANCE.md).
- [Sixteen curated hand controls](HAND-CONTROLS.md), all UNEXECUTED; H13-H14 retain unresolved comparison oracles.
- [Unchanged published product mapping](PRODUCT-MAP.md).
- [Named source revisions, blob identities and anchors](PRIMARY-SOURCES.json).
- [Independent source review and qualifications](REVIEW.md).
- [Timed remote reconciliation](REMOTE-RECONCILIATION.json).

Triplex remains pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0. Product mapping uses published PR 8 source at 0e8823973f5e1b886b7ef96e8dc5a899f467f241. Connector-returned blob IDs identify named project sources; they do not authenticate a loaded build or describe a computer environment. This packet neither adopts nor claims novelty over unpublished local work.

## Current remote state

The progress Page (private application reference omitted) was read at sequence 95, updated at 10:37 UTC. The latest temporal-datalog main checkpoint was b38e0a15. At 11:41 UTC, PRs 7, 8 and 9 remained open, draft and unmerged at a7ddd790, 0e882397 and dbb7d27a respectively. PR 9 remained stacked on PR 8, with metadata reporting 29 commits, 189 changed files, 46,339 additions and zero deletions. This pass did not independently reverify that full source tree. Its exact head returned empty combined-status and PR-triggered workflow lists; no required-CI pass is attested.

Published records still leave the original owner's live execution and pending calls unobservable. This source/metadata pass obtained no live process or original-workspace visibility. Goals 1-2 retain bounded acceptance; goal 3 and original goal 4 remain incomplete and held. Independent 4.1 and goal 5 retain bounded results, not full acceptance. Goals 6-10 remain unaccepted; persisted50/comparison84 remain UNRUN.

PR 9's seven earlier bounded runtime passes and separate build remain distinct from its three later NONPASS attempts. The logical-budget action stopped in preflight, compiler-owned IR serialization stopped before its unit, and schema2 rollback stopped in STORE_UNIT without result/evidence. Known outer terminal outcomes do not establish goal 7 command, rollback, health, close or other database-level outcomes. The stopped test database was not opened, read, queried, hashed, copied or adopted.

## Next gate and stopping condition

A future adapter selection must define the admitted AST and error entry points, typed/public result mapping, existential and optional scope, multiplicity/empty aggregates, rule restrictions, wrapper stage order, temporal transaction identity and resource bounds. Resolve H13-H14 as separate comparisons rather than choosing one implementation's incidental behavior as an oracle. Keep shared conformance, separate engine assertions and new adapter-specific controls distinct.

This focused pass stops after independent source review and verified remote preservation. No subject import, compilation, fixture/model evaluation, database/conformance/package action, runtime retry/reset, computer snapshot, Codex task, merge, deployment or deletion occurred. No stopped action is enabled or repaired, and no held goal is released.
