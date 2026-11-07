# Item 4 pre-code decision notes — draft, not selected

2026-10-31. New item4 work only. Source baseline is published `52b1e81f1d71590bdefb376e62924c9f717d4344`; independently reviewed primary research is main `ecc8e134b8c130e80b7368ad3e98a2ea89a2cd83`. No implementation, compiler, database execution, oracle or benchmark has run in this phase. The stopped item3 saves and their material are excluded.

## Direction converging across independent lanes

- Add a distinct typed `td_query_stratified_v1` and inspect-only compiler `td_plan_ir_v2`; do not silently extend `td_query`, `td_query_v2`, `td_plan_ir_v1`, `td.program_ir/1`, the IR1 decoder, or their counter semantics.
- `!atom(...)` is the sole new negative body syntax. Ordinary predicates `not`, `NOT`, `eq`, `add`, `div` and the expression comparison `!=` are not keywords or modified. `?_` is one ordinary repeated rule-local variable, not a wildcard.
- Validate the whole program. All head, expression and negative variables must occur in a positive relational body atom; constants-only negative rules with ground heads may be valid. A negative atom is a grounded exact-key absence check, not a generator or NULL-valued predicate.
- All inherited scalar filters on a complete positive binding execute before any negative check and before head dedup. A false filter does not suppress later filter faults. Negative membership must not suppress expression faults.
- Build body-to-head dependencies with both signs. Reject a negative edge inside an SCC. Complete prerequisite SCCs, including empty SCCs and same-stratum positive prerequisites, before evaluating a dependent component. The exact deterministic schedule and diagnostic phase order await lane closure.
- One snapshot cut, one execution-local typed dictionary and the existing complete-key relation set. No per-component value IDs, endpoint exclusion pushed through traversal, cross-call cache or unsafe magic rewrite.
- New accounting is globally aggregated, never reset at a stratum. Proposed component waves include base seeding and final no-change waves; exact base/delta rules and output counters await execution-lane closure. Negative groups are precharged in full before probing every occurrence without short circuit.
- The logical value domain remains NUL-free UTF8 string, Boolean, int64 and finite canonical float64. STRUCT is the carrier, not a fifth/nested logical domain. All retained input rows must be admitted before evaluation/result; visibility filtering cannot hide invalid history.

## Root source-review obligations

The published core parser/evaluator is one templated implementation, not a collection of independent parsers. Prefer a compile-time signed policy/new wrapper that leaves legacy paths unchanged, rather than copying the evaluator. The source's `Rule.body` currently consists solely of positive atoms; a signed IR must preserve source atom polarity/order while positive join planning sees only positive atoms. The current IR exports `filter_count`, not expression ASTs, and must not be called an executable/roundtrippable expression IR.

New public callbacks should explicitly use genuine pinned unstable-v2 registration and execution, special NULL handling, fallibility, ignored collation, and volatile stability because FP admission is execution-state dependent. Preserve continuous supported-FP/trusted-callee requirements and do not repair the process environment or cache permission. Keep native/batch output caps and add an explicit bounded IR2 serialization contract. Static compilation and host list materialization are not covered by the abstract evaluation work counter.

## Integration and execution boundary

The first independently useful implementation scope is a pure argument-only native signed evaluator/owned IR. It does not activate a store or SQL planner route and cannot weaken or bypass the unresolved item3 catalog-authority contract. Full item4 acceptance remains conditional on its documented dependencies; a native-only milestone is not whole-item acceptance. Any later implementation candidate, compiler and runtime campaign requires a frozen reviewed contract, durable source/evidence checkpoints, isolated paths, current capacity admission, and separately scoped execution gates. These notes are not such a gate.

## QA distinctions

An independent finite full-set semantic oracle is separate from exact counter/admission fixtures. Its predicate-level bound includes fixed `triple/3`; it may not reuse native SCC/delta logic or claim to prove exact counters. Successful sets and isolated fault classes should be stable under semantics-preserving reorderings with generous budgets. Do not promise identical budget thresholds, incidental counters, source locations or first-error choice across multiply invalid programs or rule/filter permutations. Every proposed case remains UNRUN.

## Awaited closure

Three read-only lanes are settling the exact public signatures, owned schema, limits, SCC wave protocol, error priority and independent acceptance matrix. The coordinator will select one concrete contract, have it reviewed, preserve that contract, and only then allocate source ownership. No source write ownership has been delegated.
