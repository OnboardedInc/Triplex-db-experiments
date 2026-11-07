# Choices and review blockers — source-only draft

**No implementation gate has been crossed. All empirical stages UNRUN.**

## Concrete selected candidate choices

| Question | Candidate choice and reason |
|---|---|
| Source language | Project-declared Python 3.11 standard library; readable bounded-index code without an external graph dependency. No installed-version observation or availability promise. |
| Interface | Two pure functions on exact built-in Python objects. No undeveloped text parser/serializer and no CLI or old native adapter. |
| Graph authority | Dense declared vertices, mandatory producer-to-consumer direction, all components/edges included. Unknown kinds/endpoints are malformed, not semantic rejection. |
| Caps | Retain n≤4096 and raw edge occurrences≤65536 as explicit admission policy. Check raw length before normalization; do not justify either limit from computer capacity. |
| Duplicates | Canonical sorted endpoint/kind triples; identical triples collapse, mixed positive/negative/aggregate kinds remain distinct. Canonical references never denote raw occurrence positions. |
| Producer SCC family | Deterministic iterative two-pass forward/transpose traversal. The finishing-order and suspended-frame invariants are explicit; reverse-incidence entry cost is acknowledged. No lowlink proof is imported. |
| Exact components | Canonical member/least-member order; implicit least-member roots; two depth-checked real-edge trees plus all-original-cross-edge schedule ranks. Both verdicts carry full evidence. |
| Schedule | Separate canonical least-ready min-component-ID Kahn schedule, with canonical-edge multiplicity used consistently. Positive same-level precedence is preserved. |
| Accepted levels | Unique least weighted quotient-path levels, checked by exact incoming maximum, not inequalities or circular vertex-local support. |
| Rejected witness | Least normalized strict internal edge, then one shortest return with canonical-edge-ID lexical tie rule. Full component distance/tight-edge evidence independently verifies that stronger claim. |
| Auxiliary tree freedom | Producer uses deterministic per-component BFS trees; checker accepts any trees satisfying the common relation. No entire-valid-certificate uniqueness or serialized-byte claim. |
| Checker independence | No SCC solver and no producer helper call. Separate executable admission/normalization/graph/witness logic; only immutable protocol literals and standard primitives may be shared. |
| Failure taxonomy | Malformed graph first → `INVALID_INPUT`. Bad evidence → `INVALID_CERTIFICATE`, never the opposite graph verdict. Exceptional runtime failures propagate without semantic status. |
| Counters | Separate mathematical work quantities, not certificate fields or measured telemetry. This avoids duplicate-invariance contradictions. |

## Items for the independent reviewer

These are requested review points, not ambiguities delegated to a later implementer:

1. Confirm that C02's exact-built-in object grammar and no-concurrent-mutation precondition precisely define the caller boundary. A future JSON/bytes adapter is intentionally out of scope, not silently supplied by a default decoder.
2. Check field/key counts, empty-graph rules, all integer/boolean cases, cumulative member caps, implicit-root orientations, and reference-before-index ordering. Review how malformed certificates are refused without traversing arbitrary nested data.
3. Verify exact-SCC soundness and completeness of the tree/rank relation, including one-way paths between distinct components, cyclic parent forgeries, and omitted isolated/unreachable vertices.
4. Verify canonical schedule multiplicity and least-ready proof independently from level leastness. Confirm the level recurrence is checked only after an exact acyclic quotient has been established.
5. Verify least strict-edge selection uses normalized tuple order, not occurrence position; verify target is the selected edge's tail and path starts at its head; verify every relevant original edge participates in distance inequalities and every non-target has a tight successor.
6. Verify lexicographic order is by complete canonical edge-ID sequence and not vertex sequence, cycle rotation, global cycle length, or whichever path a producer happened to find.
7. Confirm which fields are canonical and which only prove reachability. Canonical `target_distances` are uniquely forced by the relation; auxiliary tree depths need not be BFS distances under the checker relation.
8. Review mathematical operation counts separately from implementation correctness and runtime resources. Confirm normalization, raw duplicate reads, isolated-vertex work, heap operations, and the separate original-edge scans are not hidden.
9. Confirm the intentionally stronger rejected-family contract (full SCCs, canonical schedule, canonical edge/path evidence) is desired despite a much cheaper local strict-cycle witness being sufficient for yes/no infeasibility.
10. Confirm the retained n/raw caps are acceptable **project protocol policy**, and confirm C05's four-return-status plus propagated-exception taxonomy is acceptable. This is a design choice for review, not a measured capacity or total-runtime guarantee.

## Actual blockers and evidence still missing

- **Gate pending:** independent contract review and coordinator selection/authorization. Nothing in this package authorizes implementing or testing it. Any agreed correction must be a new revision rather than an edit to the frozen draft.
- **No empirical evidence:** no module, checker, independent oracle, fixture run, mutation run, benchmark, compiler/runtime result, or performance observation exists in this lane. All such stages are UNRUN; source-level mathematical arguments do not stand in for them.
- **No native/extraction/evaluation claim:** no graph-from-Datalog adapter, history/negation/aggregate evaluator, native link/load/compile action, host-v2 action, or runtime completion proof is supplied.
- **HOLD unchanged:** old item3/item4 stopped saves and the explicitly dependent old native syntax remain stopped. No new path, command, label, module, or source-language choice is permission to recreate, transfer, repackage, route around, or substitute for that work.
- **No external write:** this lane only authors the new local text revision. It does not publish, commit, push, open a PR, or save an external copy. No Codex task or subordinate agent is launched by this lane.

The draft is ready for review once its index/manifest/freeze record are written. There is no pending required user question or approval request within this source-only lane; the implementation gate remains with the coordinator.
