# NEW item 4.1 — independent bounded research review

## Verdict

**No blocking mathematical defect found within the reviewed research scope.** This is a bounded analytic review of the newly allowlisted sources, not code approval, formal verification, execution evidence, or selection of an implementation contract. All empirical checks remain **UNRUN**. Item 4 remains incomplete/untested; item 4.1 remains untested. All supplied HOLD boundaries remain unchanged.

## Exact reviewed project sources

Theory revision 001: `README.md`, `FREEZE.md`, `report.md`, `assertions-and-proof-sketch.md`, `synthetic-counterexamples.md`, `bibliography.md`, all under `.agent-logs/goal4_1-certificate-theory/revision-001/`.

Verification revision 001: `README.md`, `verification-alternatives.md`, `test-specification.md`, `cost-and-portability.md`, `source-manifest.md`, all under `.agent-logs/goal4_1-certificate-verification/revision-001/`.

Only these exact new project paths were read. Literal source reads were permitted by the coordinator's narrow clarification; no project/runtime/control CLI was invoked. A truncated combined verification display was followed by individual complete reads of its three core files. No older local/private source, held payload, old native candidate, harness, controller, command, archive, admission/environment artifact, installed binary, or computer inventory was read or reused.

## Independent proof audit

| Obligation | Source location | Result |
|---|---|---|
| Strict edge internal to an SCC iff a forbidden strict simple cycle exists | Theory A1–A3; verification §1 | Sound. Return-path shortening handles non-self edges; a strict self-loop uses an empty return path. Nonnegative strict weights do not cancel. |
| Complete vertex/edge/all-components quantification | Theory A12, F02/F09; verification oracle and F11/F16 | Explicit and sufficient. No query-root exception is imported. |
| Exact SCCs from both tree directions plus every cross-edge rank | Theory A6–A7, F13–F15/F26; verification §4 | Sound and complete. Parent depths exclude disconnected cycles; both real-edge tree directions exclude false merges; strict rank increase on every original cross edge excludes false splits. No producer lowlink state is needed. |
| Least levels rather than mere feasibility | Theory A4–A8, F05/F12; verification §4 and F25/F26 | Sound. DAG recurrence gives unique pointwise least nonnegative levels; cyclic vertex equalities do not. Schedule remains a separate claim. |
| Canonical least-ready schedule | Theory A11/F17; verification §6 | Correct induction and explicit distinction from arbitrary valid ranks. Parallel quotient-edge counting must agree between initial indegrees and removals. |
| Least offending strict edge, then one shortest/lex return path | Theory A9–A10/F18–F21/F24–F25; verification §§5–6 | Sound. Selection order is not a global shortest-cycle rule. All-edge triangle inequalities plus positive tight-edge descent prove exact distances; least tight outgoing edges prove lexicographic minimality without path enumeration. |
| Malformed graph/certificate is not semantic rejection | Theory A15 and report; verification §§2,7 and malformed families | Explicitly correct. Full graph validation precedes a semantic verdict; refusing evidence proves neither opposite graph answer. |
| Typed identity, parallel kinds, duplicates, and canonical layers | Theory A13 and canonicality discussion; verification §§4,6–7 | Correctly identified as contract choices. Pairwise maximum weight preserves feasibility/least levels but not explanation identities. Canonical semantic fields, arbitrary valid tree witnesses, and raw occurrence telemetry must be separated in the future contract. |
| Cost model and oracle limits | Theory A16/report; verification cost and test files | Appropriately conditional. Includes isolated vertices and raw occurrences; sorting/heap/membership/byte costs are not hidden. Tiny closure is independent of lowlinks but does not automatically certify canonical ancillary fields. Three independent kinds require eight pair states for full normalized coverage. No run or measured limit is claimed. |

The 28 theory fixtures were individually checked by reasoning against their stated graphs. The verification fixture/metamorphic/mutation proposals were checked for logical consistency. No fixture, enumeration, oracle, mutation, or counter was executed. The source notes correctly limit equivariance: ID-dependent canonical witnesses/orders can change on renaming; raw duplicate counts can change even when the normalized semantic result does not; a redundant positive shortcut can change shortest rejection paths without changing feasible levels.

## Fresh public primary checks

1. [Tarjan–Zwick 2022 v3, §3.3](https://arxiv.org/html/2201.07197v3): confirmed the exact-SCC certificate principle, using internal in/out trees together with a component order to exclude mutual reachability across blocks. Its stated handling of loops/parallel arcs and its `n = O(m)` abbreviation were read in §1. This supports the reviewed mathematics, not an eventual implementation.
2. [Apt–Blair–Walker, printed pp. 96–98](https://ir.cwi.nl/pub/10404/10404D.pdf): confirmed the original head-to-body convention, weak/strict level distinction, negative-cycle equivalence, and simultaneous positive/negative labels on one endpoint pair. The new research explicitly reverses direction for prerequisite-first scheduling; no orientation claim is silently transferred.

No verbatim quotation is needed. Other bibliography entries and prior acquisition/process narratives were reviewed as documented evidence and limitations, not independently recrawled or independently audited execution histories. The two explicitly excluded textual claims in the short SCC-certificate paper were **not** used as premises; no new proof depends on rehabilitating them.

## Low-severity errata and cautions

### R1 — successor-adjacency wording

Verification `cost-and-portability.md`, analytic alternatives table, labels least-ready Kahn storage “with reverse adjacency.” Under the file's producer-to-consumer convention, removing a component must enumerate its **outgoing successor** cross edges to decrement indegrees. If the author means a reverse view of a predecessor-indexed representation, that storage convention should be stated. The row's asymptotic bound and the later count/decrement argument remain correct with outgoing quotient adjacency. Correct in a new revision only; do not alter the frozen source.

### R2 — apparent timeline bracket reversal

Verification `source-manifest.md`, acquisition timeline, writes interval phrases of the form “Before [earlier time]; after [later time].” These appear reversed for an ordinary bracketed work interval. If a chronological interval is intended, state “after [earlier]; before [later]” or use unambiguous start/end headings in a new revision. This is a provenance-text ambiguity, not a mathematical defect and not evidence that any empirical check ran.

### R3 — residual contract decisions are not research approvals

The sources deliberately leave exact builtin types, dense ID bounds, normalization, enum ordering, canonical output projection, arbitrary tree-witness acceptance, certificate structure/size limits, and checker outcomes open. The forthcoming contract must select them explicitly. Merely citing these research packages does not close these interface obligations or authorize implementation.

## Clean handoff boundary

The bounded research review is complete. Its frozen records are this file, `independent-proof-checklist.md`, and `RESEARCH-FREEZE.md`. The activity file may be extended for the separately pending contract review.

- Pending public/local calls at this boundary: none.
- Pending approval requests from this lane: none.
- Pending required input: exact new contract draft filenames/content and coordinator review scope.
- Contract/code approval: not given. Implementation, imports, test/CLI/runtime/compiler/benchmark/control execution, external writes, Codex, computer inspection, and subagents: not performed or implicitly authorized.
