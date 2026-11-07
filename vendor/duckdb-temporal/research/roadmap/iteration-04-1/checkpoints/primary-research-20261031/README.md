# Independent item 4.1 — graph certificate primary research

2026-10-31. **Research only; implementation and empirical verification UNRUN.** Two parallel GPT-6.1-Sol max heavy primary-research lanes and a separate GPT-6.1-Sol max independent review are closed.

Contributor requested a clean item4.1 restart alongside item5. The approved first slice is a genuinely independent **explicit signed-dependency graph certificate checker**, not a renamed compilation or execution of the earlier native candidate. Item4 remains incomplete/untested. This collection does not reopen any stopped save or dependent held action, select an implementation contract, or claim production readiness.

Read [additive errata](ERRATA.md) and [the independent review](peer-review.md) with the frozen authored reports. The research has no blocking theoretical defect within its stated finite graph model; that is not a machine-checked proof or code acceptance.

## Useful conclusions

- A strict edge whose endpoints are in one SCC is equivalent to a forbidden strict cycle. Include **every** original vertex, edge kind and component, not only a selected answer's reachable subgraph.
- A total level map checked against every edge can prove stratification feasibility. It does **not** prove exact SCCs, least levels or an execution schedule.
- Exact SCCs can be independently certified by internal in/out trees plus a topological rank checked against **all** cross-component edges. The checker need not rerun the producer's SCC algorithm.
- Least semantic levels follow the weighted recurrence on the proven acyclic SCC quotient. Per-vertex equalities alone admit inflated levels on zero-weight cycles. A positive DAG can have all levels zero while still requiring producer-first scheduling.
- Invalid/malformed evidence is **INVALID_CERTIFICATE**, not proof of the opposite semantic graph verdict. A valid strict edge plus return path proves rejection; canonical rejection additionally needs explicit selection/distance/lexicographic obligations.
- Select the least normalized strict internal edge in one pass, then perform one shortest/lexicographic return-path construction. Repeating reachability for every strict edge can multiply work unnecessarily.
- Canonical graph-array order is separate from JSON object-key order. Parallel kinds, exact duplicates, raw-occurrence admission and canonical semantic fields versus auxiliary witness/telemetry fields need explicit contracts.
- On normalized bounded indices, core graph/certificate checks can use O(n+m) logical work, while input normalization, sorting and least-ready scheduling have separate costs. These are analytic bounds, not measured performance or computer-capacity guarantees.

## Research contents

- [Theory report](theory-report.md), [16 assertions/proof sketches](assertions-and-proofs.md), [28 synthetic counterexamples](theory-counterexamples.md), [theory sources](theory-sources.md).
- [Verification alternatives](verification-alternatives.md), [31 synthetic fixture families and oracle/mutation obligations](oracle-test-specifications.md), [analytic cost and source-language alternatives](cost-and-portability.md), [verification primary bibliography](verification-sources.md).
- [Independent review](peer-review.md), [proof checklist](peer-proof-checklist.md), [additive errata](ERRATA.md), [document-content inventory](FILES.json).

The verification bibliography is explicitly extracted from the new authored source record; operational acquisition notes are not included. Other reports are substantively unchanged, with line endings and terminal newlines normalized. The review's references to companion local drafts/process records are context, not published implementation or execution authority.

## Honest boundary

No implementation, import, parser, CLI, native host integration, test, closure enumeration, mutation, compiler, database, benchmark or performance-measurement stage has run. All synthetic expectations are hand-derived specifications. The three-state n=3 oracle domain has 19,683 theoretical graphs, not 19,683 passed tests; parallel-kind coverage requires additional domains.

This explicit-graph tool would not extract dependencies from Datalog, evaluate negation/aggregates, establish a temporal history cut, prove runtime lower-relation completion, or certify the earlier native engine. The separate new source-only contract is being drafted; it is not selected by these reports. Item5 remains separately active. Items6–10 remain queued.

Only fresh public primary theory, new synthetic graph examples and analytic project results are included. No old candidate, held payload, prior controller/command, computer-environment snapshot/details or copied paper/PDF payload is included or reconstructed. The user's [project-data-only policy]([PRIVATE_REFERENCE_REMOVED]) remains binding.
