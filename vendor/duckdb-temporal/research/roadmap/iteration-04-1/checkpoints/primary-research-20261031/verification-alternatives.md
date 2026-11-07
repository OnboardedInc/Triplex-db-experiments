# Item 4.1 — independent certificate-verification alternatives

**Status:** frozen source-only research; not a chosen contract or implementation. All empirical verification is **UNRUN**. Research opened 2026-10-31 21:32:28 UTC; public-source acquisition closed 2026-10-31 21:36:41 UTC. See `source-manifest.md` for provenance and acquisition limitations.

## Scope and non-claims

This is a new, neutral signed-directed-graph problem. It is not a native-language syntax checker, evaluator, compiler substitute, migration, or execution of earlier work. No private project source, stopped payload, former candidate, harness, command, archive, inventory, or compiler artifact was consulted. No code, test, compiler, benchmark, or control probe was run. No computer-environment information was collected. No external state was changed.

The supplied scope is an explicit finite directed graph, with positive edges and strict negative/aggregate edges; every declared component matters, including components unreachable from any distinguished output. Semantic rejection must occur exactly when a strict edge has both endpoints in the same strongly connected component (SCC). This research offers verification and cost alternatives only. Item 4 remains incomplete/untested; item 4.1 remains untested. The stopped backup/checkpoint work and dependent native-syntax action remain HOLD.

“Signed” here describes dependency-edge categories. No cryptographic signing or authenticity mechanism is assumed.

## 1. Mathematical core, independent of serialization and orientation

Let `V` be the explicit vertex set, `E` the edge occurrences, and `w(e)` be 0 for positive and 1 for strict negative/aggregate edges. For connectivity, forget only edge labels, not vertices or edges. Duplicate edge occurrences and self-loops do not require exceptional graph theory.

Two orientation alternatives must not be mixed:

| Arrow convention | Level constraint for edge `u -> v` | Dependency-first block order |
|---|---|---|
| prerequisite/producer -> dependent/consumer | `L(v) >= L(u) + w(e)` | source before target |
| dependent/consumer -> prerequisite/producer | `L(u) >= L(v) + w(e)` | target before source |

Every example below uses the first convention **only as a declared mathematical notation**, not as a selection of the eventual wire contract. Reversing all arrows gives the dual formulation.

The classical signed-dependency characterization states that stratification excludes a directed cycle containing a negative edge. The original definition also permits the same ordered pair to have both positive and negative dependency information. This is a reason not to let duplicate normalization erase strictness. [Apt, Blair and Walker, Definition 4 and Lemma 1, pp. 97–98](https://ir.cwi.nl/pub/10404/10404D.pdf).

For this requested graph abstraction, treating aggregate edges as strict is a supplied policy, not a theorem that all real aggregation systems require stratification. The checker cannot infer missing aggregate dependencies or validate a language frontend from a graph alone.

### Fresh proof obligations for the proposed graph abstraction

1. A strict edge `u -> v` is in an SCC iff a path `v ->* u` exists. The forward direction follows from mutual reachability. The reverse direction uses that edge plus the return path. For a strict self-loop the return path has length zero.
2. Summing feasible level inequalities around such a cycle gives `L(u) >= L(u) + 1`, an impossibility.
3. Conversely, if no strict edge is internal to an SCC, every internal edge has weight zero. Collapse SCCs. The condensation is a DAG, and a level can be assigned by the maximum total strict-edge weight along a path ending at each component.
4. The maximum level is at most `k-1`, where `k` is the number of SCCs, because a DAG path has at most `k-1` edges. Thus, for nonempty graphs, a valid level certificate exists with all entries in `0..n-1`.

These arguments concern the finite supplied graph only. They establish neither native syntax validity nor evaluation correctness.

## 2. Keep four logically different outcomes distinct

Candidate interfaces should distinguish:

- **Malformed graph:** graph representation violates the chosen input rules.
- **Verified feasible graph:** a correct success certificate establishes the edge constraints.
- **Verified infeasible graph:** a correct strict-cycle certificate establishes the forbidden condition.
- **Invalid certificate / verification unavailable:** a result or witness is malformed, false, unsupported, or resource-refused.

An invalid certificate does **not** prove that the graph is infeasible. A resource refusal is not semantic rejection. A valid infeasibility witness does not excuse malformed input elsewhere: whole-input validation still precedes interpretation of the result.

The certifying-computation framework separates the mathematical witness implication from the implementation that decides it; neither one alone establishes the other. Its assurance is instance-specific and depends on the input precondition. [Alkassar et al., §§1–2](https://arxiv.org/html/1301.7462v1).

## 3. Alternative A: total level certificate, no SCC re-execution

### Candidate success witness

Supply exactly one bounded nonnegative integer `L(v)` for every declared vertex, with no missing or foreign vertices. For nonempty graphs a candidate bound is `L(v) < n`; an empty graph needs a separate empty-map rule if permitted. Check every original edge against the selected orientation's inequality.

### What the checker would establish

- Feasibility of the complete graph, including isolated and unreachable components.
- Absence of strict edges in any SCC, by the cycle-sum argument.
- No need to call, duplicate, or trust the producer's SCC routine.

### What it would not establish

- That an accompanying SCC partition is exact.
- That the levels are the least possible levels.
- That two incomparable vertices/components are in a canonical order.
- That level order alone is a dependency-first schedule.

For example, with two isolated vertices, levels `(1,1)` can satisfy all bounded inequalities while the least levels are `(0,0)`. With one positive edge `a -> b`, both least levels are zero, but dependency-first block order must still place `a` before `b`. A positive SCC is one recursive block, not a claim that its members can be linearly evaluated once.

This is the smallest success checker among these alternatives. It may be sufficient when only a verified yes/no feasibility result and some valid stratification are required. It is insufficient if the advertised output includes canonical SCCs, a particular schedule, or least strata.

## 4. Alternative B: exact SCC certificate plus optional schedule/least levels

Tarjan and Zwick explicitly describe certifying exact SCCs through spanning in/out trees and a component topological order. Their paper permits parallel arcs and loops and separately treats non-recursive DFS. These are theoretical algorithm properties, not performance measurements for a future implementation. [Tarjan and Zwick, §§1, 3.3 and 6](https://arxiv.org/html/2201.07197v3).

The following is a fresh checker specification sketch, not a copied implementation.

### Candidate witness fields

- A total component label `c(v)` for every original vertex.
- Exactly `k` nonempty components and one root per component.
- Two parent-edge references per non-root vertex: an out-tree parent edge `parent -> vertex`, and an in-tree parent edge `vertex -> parent`, all inside the claimed component.
- A bounded decreasing parent rank in each tree, or another independently checked tree-reachability mechanism.
- A permutation rank `t(C)` for the components.
- Optional claimed least component levels and canonical schedule fields.

### Checks independent of producer SCC state

1. **Coverage:** every original vertex occurs exactly once; no foreign vertex, empty component, missing root, duplicate component label, or unused label is admitted under a dense-label variant.
2. **Original edges:** each parent reference names an actual original edge with the required endpoints and direction. Original occurrence indices make membership checking constant-time once parsing is complete; tuple-based references need an explicit lookup-cost policy.
3. **Tree termination:** roots have rank zero and no parent; every non-root has exactly one parent in the same component and strictly smaller bounded rank. This excludes cycles and forces each parent chain to terminate at that component's root. Exact BFS distances are unnecessary for this purpose.
4. **Mutual reachability:** the out-tree gives root-to-vertex paths; the in-tree gives vertex-to-root paths. Hence all vertices of a claimed component are mutually reachable using real graph edges.
5. **Maximality:** verify `t(C)` is a permutation, and inspect **every original cross-component edge**. For the producer-to-consumer convention require `t(c(u)) < t(c(v))`; reverse for the opposite orientation. Strictly increasing cross-component ranks preclude a cycle of different claimed components.
6. **Strictness:** inspect every strict original edge and compare the verified component labels. Any internal strict edge establishes the requested forbidden condition; none means feasibility.

Checks 4 and 5 together prove exact SCCs: trees prevent merging unrelated vertices, while the checked component order prevents splitting a true SCC. Neither check by itself is enough. No traversal discovery times, lowlinks, stack-membership flags, producer component emission order, or digest are trusted.

The parent-rank bounds are important for hostile witnesses. Without validated original-edge references, a producer can invent connectivity. Without rank/root checks, cyclic parent pointers can masquerade as trees. Without the all-edge boundary scan, two halves of a true SCC can masquerade as separate components.

### Optional least-level verification

On a verified condensation DAG, with the first arrow convention, require for every component `D`:

`L(D) = max( {0} union {L(C) + w(e) : e crosses C -> D} )`.

Every internal edge must be positive on successful instances. This recurrence is uniquely determined in topological order; induction proves both feasibility and minimality. Checking only inequalities proves neither equality to this recurrence nor minimality. Checking a recurrence on arbitrary vertex cycles without first handling SCCs can admit shifted zero-weight cyclic solutions.

Parallel cross-component occurrences may either all be scanned or be deduplicated with maximum weight for this recurrence. Keeping one arbitrary label is unsound. Preserving separate negative/aggregate categories may matter to explanations even though both have weight one here.

### Optional block-schedule verification

A claimed block schedule needs a permutation/coverage check and an all-cross-edge order check. Those establish a valid topological block order, not the *canonical* one. Equal strata can contain positive precedence edges, so sorting only by level is insufficient.

For a deterministic schedule, possible policies include stable sorted DFS or a least-key available-component Kahn process. These are different canonicality contracts. A checker for a specified least-key process must verify the process, not merely that the final order happens to be topological.

## 5. Alternative C: short infeasibility witness

Choose an original strict edge `e: u -> v`, then list a directed original-edge path from `v` back to `u`. The checker validates the edge's strict category, all path endpoints and directions, and membership of every referenced original edge. For a strict self-loop, the empty return path is valid.

A simple return path with at most `n-1` edges exists whenever `u != v`; adding the strict edge gives a cycle with at most `n` edges. A candidate certificate limit can therefore be semantic and input-size based, not dependent on machine observations. A longer or malformed witness may be invalid as a certificate without changing the graph's actual verdict.

This is an independent local reason for infeasibility; no SCC producer state is required. It does not by itself prove that the selected edge or path is the canonical one. Parsing and validating the entire graph still matters even when a short witness is presented.

## 6. Canonicality is a separate, potentially more expensive claim

There are at least three different determinism goals:

1. Same encoded input yields the same output.
2. Reordering vertex/edge records without changing their identities yields the same semantic output.
3. Arbitrarily renaming the graph yields isomorphism-invariant canonical names.

The first two are practical policies for this tool; the third is a different graph-canonicalization problem and must not be silently promised. Relabeling metamorphic tests should compare outputs through the inverse relabeling, not expect identical bytes.

### Candidate successful-output policies

- Component identity: smallest original vertex ID or sorted member-ID tuple, under an explicitly specified ID comparator.
- Member order: sorted IDs, not producer stack-pop order.
- Least levels: uniquely defined by the condensation recurrence, independent of SCC numbering.
- Schedule: least-key available SCC, where the key is the agreed component identity.

These are alternatives. Dense integer IDs simplify comparison but still require a decision about whether the dense numbering is input authority or derived from external names.

### Candidate canonical failure policy

One possible policy is: smallest strict edge whose endpoints share an SCC; then shortest return path; then lexicographically smallest path among shortest paths. This does not require enumerating cycles. A verified SCC certificate permits the first selection by one ordered edge scan, and deterministic BFS with correctly sorted adjacency can produce/check the path policy.

By contrast, checking only a supplied path proves validity, not that no earlier strict edge has a return path or that no shorter/lexicographically earlier path exists. Rerunning reachability for every candidate strict edge can turn a linear graph check into `O(s(n+m))`, where `s` is the number of strict occurrences. No such cost should be hidden under “canonical witness.”

The shortest-path tie rule must name its comparison unit: vertex-ID sequence or edge-tuple sequence, including treatment of parallel edges with different kinds. Stable occurrence indices are not invariant under input-edge permutation unless occurrence identity is separately part of the contract.

### Canonical serialization is not semantic canonicalization

If JSON is chosen, JCS is only a serialization option. It preserves array order, uses UTF-16 code-unit ordering for object properties, does not normalize Unicode, excludes duplicate object names, and restricts numeric interoperability. It does not sort graph-edge arrays or decide duplicate-edge semantics. [RFC 8785, §§3.1, 3.2.3](https://www.rfc-editor.org/rfc/rfc8785.html).

Thus a graph-specific normalization step would still need a declared order for vertices, edge tuples, labels, SCC members, and witnesses. Bytewise, scalar-value, locale-aware and UTF-16 string sorting are not interchangeable. ASCII-only IDs, exact Unicode IDs, or normalized Unicode IDs are different contracts; no choice is made here.

## 7. Whole-input validation issues to resolve before implementation

Candidate strict validation should address: schema/version tags; top-level and field types; exactly represented integer IDs/ranks; missing/foreign endpoints; repeated vertex IDs; duplicate object keys; unknown edge kinds; truncated input; trailing payload; impossible counts; malformed Unicode; and size/depth limits. Decide empty graph and empty-ID policies explicitly.

Duplicate **object keys** are a parsing ambiguity. Duplicate **edge occurrences** can be a valid multigraph feature. They are not the same issue. RFC 8259 documents divergent behavior for repeated names and permits implementations to limit numeric ranges, nesting and text sizes. [RFC 8259, §§4, 6, 9](https://www.rfc-editor.org/rfc/rfc8259.html).

Do not short-circuit whole-input validation after finding a witness in one component. Do not admit implicit vertices by accidentally interning an undeclared endpoint if `V` is the authority. Do not treat unknown edge kinds as positive by default. Decide whether negative and aggregate remain distinct in explanatory output even though the feasibility weight is identical.

## 8. Primary-source cautions

The short Borovšak–Mihelič paper is useful corroboration for forward/backward-tree certificates, but its fetched text describes P5 using absence of paths between different SCCs, which is too strong: distinct SCCs may have one-way reachability. Its adjacency-matrix/linear-time sentence is also not a basis for an adjacency-matrix bound. These statements are not imported into this proposal; the exact-SCC criterion above uses absence of **mutual** reachability across components. The public PDF extraction was inspected; one public-PDF screenshot request failed, so no assertion depends on visual confirmation of that page. [Borovšak and Mihelič, §§2.2, 4](https://ucilnica.fri.uni-lj.si/pluginfile.php/168375/mod_resource/content/1/erk.pdf).

## 9. Decisions deliberately left open

Orientation; IDs and comparator; serialization; duplicate-edge policy; diagnostic-category names; success-certificate strength; least versus merely feasible levels; canonical schedule versus any schedule; locally valid versus canonical failure witness; resource limits; source language; checker trust boundary; and any empirical acceptance criterion remain unselected. The companion files specify how these choices could be verified, not which one is approved.
