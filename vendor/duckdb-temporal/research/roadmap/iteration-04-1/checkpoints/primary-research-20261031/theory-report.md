# Signed dependency certificate research

## Conclusion and scope

A finite signed dependency graph has a nonnegative integer stratification exactly when no strongly connected component of the graph containing **all** dependency edges contains a strict edge. A component rank, a semantic level, and a canonical serialization are different objects. They should not be conflated in a future contract.

The strongest useful independent success certificate considered here consists of an exact vertex partition, two rooted reachability trees per block, a strict rank for every cross-block edge, and least levels checked on that certified acyclic quotient. A rejection can be certified much more cheaply by a strict edge and a directed return path. If a rejection must be canonical rather than merely correct, additional evidence or additional verifier work is needed.

These are mathematical results and research options, not a selected interface or implementation. No compiler, runtime, tests, benchmarks, or implementation checks were performed. Item4 remains incomplete and untested; item4.1 is untested. All held actions described in the README remain HOLD, with no substitution or circumvention authorized.

## Primary evidence that matters

Apt, Blair, and Walker define predicate stratification by weak ordering for positive body uses and strict ordering for negative body uses. Their dependency graph is head-to-body; their Lemma 1 characterizes stratifiability by absence of a cycle containing a negative edge and proves sufficiency through SCC decomposition. This is the original semantic starting point, not a statement about any project parser or evaluator. [Towards a Theory of Declarative Knowledge, definitions 3 and 4 and Lemma 1, printed pages 96–98](https://ir.cwi.nl/pub/10404/10404D.pdf).

Tarjan and Zwick develop several linear graph algorithms, address nonrecursive DFS, and describe certification with component in-trees, out-trees, and a topological order. Their paper explicitly permits loops and parallel arcs, uses outgoing adjacency, and abbreviates bounds to O(m) under an n = O(m) assumption that must not erase isolated vertices in this problem. Their SCC output order is reverse topological for the directed arcs, not automatically the desired prerequisite-first order. [Finding Strong Components Using Depth-First Search, sections 1, 3.3, and 6](https://arxiv.org/html/2201.07197v3).

The certifying-algorithms survey distinguishes a solver's answer from the witness checked against the original input. Its shortest-path example also warns that local equalities on zero-cost cycles need stronger well-founded justification. That warning is closely analogous to the least-level pitfall developed independently below. [Certifying Algorithms, sections 1, 2.4, and 5–6](https://www.mpi-inf.mpg.de/~mehlhorn/ftp/CertifyingAlgorithms.pdf).

Alkassar and coauthors separate the mathematical witness implication from correctness of its checker implementation. Thus a paper proof of the witness relation does not establish that an eventual parser, checker program, or compiled binary realizes it. [A Framework for the Verification of Certifying Computations, sections 1–2](https://arxiv.org/pdf/1301.7462).

Chen and coauthors formalize Tarjan in three proof assistants at an abstract level and expressly do not target automatic executable-code generation. Their work is evidence that detailed graph invariants can be formalized, not transferable verification of a new iterative implementation. [Formal Proofs of Tarjan’s Strongly Connected Components Algorithm in Why3, Coq and Isabelle, sections 1–2](https://drops.dagstuhl.de/storage/00lipics/lipics-vol141-itp2019/LIPIcs.ITP.2019.13/LIPIcs.ITP.2019.13.pdf).

## Neutral mathematical input

Let G = (V, E, w) be a finite directed multigraph. V is the full declared set of predicate IDs. Every edge has a declared tail u, head v, and weight w(e) in {0, 1}. Weight zero means a weak dependency; weight one means a strict dependency. Labels such as positive, negative, and future aggregate-strict may be retained as explanations, but only their declared weights enter this theorem.

The direction used throughout this package is:

**prerequisite or producer u → dependent or consumer v**

A level assignment L: V → nonnegative integers is feasible exactly when every original edge e = (u, v) satisfies

`L(v) ≥ L(u) + w(e)`.

For a rule whose head predicate is p and whose body mentions q, this convention creates q → p. A positive use has weight zero; a negative use has weight one. The reverse head-to-body convention in the original stratification paper uses the reversed inequality. Reversing every arc preserves SCC membership and strict-cycle existence, but reverses prerequisite scheduling. The convention must be attached to the graph, not inferred from the word dependency.

This is not signed-graph balance theory: the weights add nonnegatively and do not cancel. Two negative edges on a cycle still make it impossible to assign finite levels.

The graph includes all declared vertices and all edges, including components unreachable from a selected query, entry point, or root. There is no designated root in the mathematical problem. Unknown endpoints, unknown labels, duplicate identity conflicts, and malformed integer values are input-well-formedness questions, not evidence of a strict cycle. A future contract must define those outcomes separately rather than silently interpreting an unknown label as weak.

The dense-integer-ID candidate is compatible with this model, but is not necessary to the theorem. It may make array indexing and operation accounting simpler after range, coverage, and identity checks. Canonical results relative to dense IDs are not automatically invariant under renumbering those IDs.

## Strict cycles and strongly connected components

Compute SCCs on the directed graph containing **both weak and strict edges**. Computing SCCs on only the weak subgraph is unsound for this purpose. A strict edge u → v is internal to an SCC exactly when there is a directed path v → … → u. The edge and that path form a forbidden closed walk; a shortest return path produces a simple cycle, with the one-edge self-loop as a special case.

If a feasible level assignment existed, summing its edge inequalities around that cycle would give `L(u) ≥ L(u) + t`, where t is the number of strict edges and t ≥ 1. This is impossible. Conversely, if no strict edge is internal to an SCC, every internal edge has weight zero. Contracting SCCs yields a DAG. Assigning increasing component ranks along every quotient edge gives a feasible level assignment because every edge weight is at most one. This establishes existence without computing a least assignment.

All vertices in any SCC must have the same feasible level: weak inequalities summed along paths in both directions force equality. Distinct SCCs can nevertheless share a level. Distinct SCCs may also have a one-way path between them; what they cannot have is mutual reachability.

Disconnected graphs require a complete DFS forest or another complete graph method. A proof limited to one query-reachable subgraph establishes only a different, narrower proposition. A hidden strict self-loop in a disconnected component is enough to reject this full-graph problem.

## Least semantic levels

For an accepted graph, let C denote an SCC and let Q be its acyclic quotient. Retain each original cross-component edge and weight, or combine parallel quotient edges using their maximum weight. Define

`h(C) = max({0} ∪ { h(A) + w(e) : e goes from component A to C })`.

Because Q is a finite DAG, this recurrence defines a unique value in prerequisite-first topological order. It is the largest number of strict transitions on any directed quotient path ending at C, counting an empty path as zero. For a predicate v in C, set `L*(v) = h(C)`.

The assignment L* is feasible by the recurrence. Any other nonnegative feasible assignment is constant on SCCs and must dominate every path weight, so it dominates L* pointwise. Consequently L* is the unique pointwise least nonnegative assignment. If there are k nonempty SCCs, every least level lies between zero and k−1; this is a mathematical bound, not permission to use unchecked fixed-width arithmetic. For an empty graph the assignment and schedule are empty, and a maximum level need not be defined.

Least levels are **not** a total component execution schedule. On a positive acyclic chain a → b → c, all least levels are zero, but the three SCCs still have prerequisite dependencies. A future consumer can either process a topologically ordered SCC sequence, or evaluate all same-level positive relations jointly to a fixed point. The graph certificate does not choose or implement either evaluator.

Per-predicate local maximum equations are not enough to prove leastness. With just a positive self-loop a → a, the equation `L(a) = max(0, L(a))` is satisfied by seven, although the least value is zero. The quotient recurrence avoids this circular justification only after exact SCCs and quotient acyclicity have been established. Alternatively, an independent well-founded support order would have to be supplied and checked.

## Different claims require different certificates

### Admissibility alone

A nonnegative level for every vertex, checked against **every original edge**, is a complete success certificate for existence. It does not require trusting or rerunning an SCC algorithm. It does not prove an accompanying component partition is exact, a schedule is valid, the levels are least, or any field is canonical.

### Exact SCC partition and schedule

A stronger research certificate can contain the following mathematical objects:

1. A total assignment of every input vertex to exactly one nonempty block.
2. For each block, one root and a spanning out-tree using original edges, establishing root-to-every-vertex reachability.
3. For the same block and root, a spanning in-tree using original edges, establishing every-vertex-to-root reachability.
4. A permutation rank 0 through k−1 of the blocks, with `rank(A) < rank(B)` for **every** original edge crossing A → B.
5. For acceptance, no original weight-one edge inside a block.
6. If leastness is claimed, block levels satisfying the quotient maximum recurrence, including zero for blocks with no incoming quotient edge.

The in-tree's parent edge for vertex x points x → parent(x); the out-tree's parent edge points parent(x) → x. Calling both merely parent edges without their orientation is unsafe. Depth labels that decrease by exactly one toward the common root prove that purported parent relations are actually trees. Checking only one parent per nonroot, edge counts, and edge membership would permit a disconnected parent cycle.

For any pair x, y in a certified block, an in-tree path x → root followed by an out-tree path root → y proves mutual reachability. Cross-block ranks rule out a cycle among blocks. Thus blocks cannot split a real SCC, while the trees prevent merging distinct SCCs. The partition is therefore exact. This checker does not need to call the producer's SCC routine.

A claimed condensation-edge list is not sufficient by itself: a producer could omit the very edge that makes its rank invalid. All-edge rank checking against the original G bypasses that omission risk. If a complete condensation is itself an output claim, its edge coverage and multiplicity policy need their own checks.

### Rejection validity

A strict input edge u → v plus an ordered input-edge path from v back to u is sufficient. A checker verifies the strict label, edge membership, endpoint continuity, and closure. It need not trust the producer's SCCs or compute any SCC. The return path is empty only when u = v. A nonempty closed walk with at least one strict edge is also sound, but is less compact than a simple cycle and need not be canonical.

This asymmetry is useful: exact SCCs are not a necessary part of a basic rejection certificate, even when the solver found the witness using SCCs.

Refusing an invalid success certificate is not a proof that the graph is unstratifiable. Refusing an invalid rejection cycle is not a proof that it is stratifiable. Certificate-invalid, malformed-input, unable-to-establish, certified-accept, and certified-reject need distinct meanings in a future contract.

## Determinism and canonicity

Deterministic for one input enumeration, invariant under permutations of an edge list, and canonical relative to named predicate IDs are different requirements. None should be silently substituted for another. This report leaves ID ordering, edge identity, kind ordering, duplicate treatment, and output encoding unselected.

Once fixed total orders are declared, a possible canonical **result** policy is:

- Identify an SCC by its least predicate ID; list its members in increasing ID order.
- Among currently prerequisite-free quotient components, repeatedly select the least component key. This defines a unique lexicographically least topological schedule.
- Report the unique least semantic levels separately.
- On rejection, select the least strict edge whose endpoints lie in one SCC, then select a shortest return path from its head to its tail, breaking ties lexicographically by the declared edge-token order.

The witness rule above is not the globally shortest forbidden cycle rule. Its edge preference takes priority over cycle length. Exact duplicate edges require an explicit identity policy: using source-list positions can make the chosen witness change when input is reordered. Duplicate normalization by endpoint and maximum weight preserves feasibility, but may erase provenance or change which original edge is selected for explanation.

An arbitrary valid topological rank proves schedule validity, not the least-ready policy. To certify the latter, a checker can independently reconstruct quotient indegrees from the full graph and validate each choice against the complete current ready set. That is separate from producing or verifying SCCs. Parallel quotient edges must be counted and decremented consistently, or deduplicated consistently.

A valid cycle proves rejection, not selection canonicity. A stronger canonical-rejection certificate can add a full exact SCC certificate so that a scan of all original strict edges verifies the selected edge is the least offending one. For that edge u → v, add integer distances d(x) from each vertex x in its SCC to u. Check:

- `d(u) = 0`; every other distance is a positive integer at most |C|−1.
- For every original edge x → y internal to C, `d(x) ≤ 1 + d(y)`.
- For every x other than u, some original edge x → y satisfies `d(x) = 1 + d(y)`.
- Along the returned path, the selected edge at each step is the least edge among all edges decreasing d by one.

The inequalities lower-bound all path lengths by d, while the strictly decreasing tight-edge chain realizes length d. Thus d is exact. Greedy least decreasing edges select the lexicographically least shortest return path. The chosen strict edge may be internal to a rejected SCC: its own positive weight does not enter this unweighted path-distance calculation.

This is an independently derived specialization of a shortest-path-certificate pattern, not an implementation. It adds O(|C|) numeric fields and requires scanning all relevant original edges. A lighter contract could instead require only valid rejection, with deterministic production audited separately. The coordinator must decide whether the cost of proving canonicity is warranted.

The same distinction applies to tree certificates: canonical component membership, schedule, and levels do not imply byte-identical tree witnesses. Entire-certificate canonicity would require deterministic and, if promised, independently checked tree choices as well.

## Primary source audit cautions

Borovšak and Mihelič present an SCC certificate with forward and backward reachability structures. Two literal claims in that paper must not become requirements here. Its page 1 associates a Θ(n+m) traversal bound with an adjacency matrix; a conventional matrix scan is Θ(n²), and sparse linear bounds require a suitable representation. Its P5 on page 3 states a separation condition forbidding a path in either direction between different components; correct SCC maximality forbids **mutual** reachability, not one-way reachability. The package therefore rederives partition exactness using all-edge strict ranks, rather than adopting those statements or its pseudocode. [Certifying Algorithm for Strongly Connected Components, pages 1 and 3](https://ucilnica.fri.uni-lj.si/pluginfile.php/168375/mod_resource/content/1/erk.pdf).

An official library example supplies another direction warning: Boost's `topological_sort` output iterator receives reverse topological order. A function name is not a direction guarantee. This is a documentation comparison, not a proposed dependency or an import. [Boost Graph topological_sort documentation](https://www.boost.org/doc/libs/latest/libs/graph/doc/html/graph/algorithms/topological_sort/topological_sort.html).

## Future aggregate strictness is an adapter policy

The graph theorem treats a declared aggregate-strict edge exactly like any other weight-one edge. It does not establish that every aggregate in every language must be strict, nor that a chosen language's aggregate dependency extraction is correct.

Ross and Sagiv give aggregate semantics admitting certain monotonic or pseudo-monotonic recursive aggregates under lattice and monotonicity conditions, rather than universally requiring aggregate inputs to be fully computed below a rule. Thus a blanket aggregate-strict policy can be a conservative language choice, not a theorem about all aggregate semantics. Only the publisher abstract was accessible in this research; no more detailed aggregate theorem is asserted here. [Monotonic Aggregation in Deductive Databases](https://www.sciencedirect.com/science/article/pii/S0022000097914537).

Starup and coauthors study how dependency-graph extraction can overapproximate composed Datalog constraints. Their result reinforces a separate trust boundary: checking an explicit graph is not proving that a front end extracted the correct graph. For this package all declared vertices and edges are authoritative; no pruning or project language analysis is performed. [Breaking the Negative Cycle, section 5 and its soundness criterion](https://drops.dagstuhl.de/opus/volltexte/2023/18224/pdf/LIPIcs-ECOOP-2023-31.pdf).

If graph extraction overapproximates dependencies soundly, an accepted overapproximation also accepts its subgraphs, but a rejected overapproximation need not prove the actual program is unstratifiable. A future adapter needs a precise claim about missing edges, spurious edges, predicate identity, and strictness. This revision deliberately does not implement that adapter.

## Algorithm families and proof obligations

The candidate iterative SCC producer is reasonable to investigate, but iterative is not synonymous with correct, stack-safe in every representation, or linear. The producer's proof obligations include the complete outer vertex traversal, visit-once accounting, correct enter and return events, active-component membership, handling of already-completed components, and loop or parallel-edge behavior.

Replacing recursive DFS by a plain vertex stack can change the search semantics: an explicit suspended traversal must remember the unprocessed outgoing edges and the return event that propagates child information. A claimed iterative Tarjan implementation needs invariants for its own state representation; a familiar name or a paper about another variant is not enough. The future checker should avoid importing these low-link invariants and instead use the simpler final-result obligations above.

Other producer research options remain open. A two-pass forward/reverse traversal uses a transpose or incoming adjacency and finishing order; it may be easier to explain but has different storage and traversal costs. Path-based SCC methods have their own root-stack invariants. Repeated reachability from each vertex is mathematically simple but can be superlinear. No family is selected and no implementation cost was measured.

## Logical costs and their limits

Let n be the number of declared vertices, m the number of original edge records, k the number of SCCs, and B the encoded input size. Under a finite adjacency-list or equivalent incidence representation with constant-cost validated indices and bounded-field operations:

- Reading and validating the complete graph requires accounting for n and m, and at least B encoded symbols or bytes. Isolated vertices prevent dropping n from the bound.
- Standard SCC production and quotient-edge scans admit O(n+m) logical operations. Tarjan's original publisher abstract states bounds linear in vertices and edges; no project performance follows from that. [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010).
- Two rooted trees per component use 2(n−k) tree-edge references in total. Partition, depth, edge-membership-by-validated-reference, cross-rank, strict-edge, and quotient-level-recurrence checking admit O(n+m) logical operations and O(n) auxiliary fields, in addition to the input and certificate representation.
- One strict edge plus a simple return path has at most n edges. Validity checking is linear in its certificate length once safe edge references are available; binding those references to the authoritative input still needs a defined input contract.
- Verifying distance labels and selecting the least offending edge with a full SCC certificate admits O(n+m) logical scans. No all-pairs reachability or enumeration of all cycles is needed.
- A min-ready schedule with an ordinary comparison priority queue adds O(k log k) queue operations beyond O(m) edge processing. This is a safe abstract bound, not an optimality claim. Repeatedly rescanning all components for the next minimum can cost O(k²).
- Sorting arbitrary IDs, members, or edges may add comparison costs and O(m log m) or O(n log n) work. Dense bounded IDs can change available sorting methods, but their prerequisites and identity policy must be stated.

These counts are not time, memory footprint, memory limit, throughput, allocation count, stack consumption, or maximum supported graph size on any computer. No such quantities were collected or measured. They omit parsing and serialization constants, ID-byte comparisons, numeric bit complexity, certificate-size rejection, graph construction choices, duplicated adjacency, and allocations unless explicitly included. Arbitrary-precision numeric fields are not unit-cost merely because a mathematical recurrence uses integers.

Important avoidable pitfalls are rescanning adjacency from its beginning on every iterative return, copying a growing path or component list at each step, reconstructing a transpose once per component, checking tree-edge membership by scanning all edges for every parent, repeated whole-graph reachability, repeated fixed-point passes over all edges, and sorting large structures merely to stabilize an output whose required stable fields are much smaller. None of these is claimed to occur in a project implementation.

An adjacency matrix has its own n² source size and scanning obligations; it cannot inherit sparse adjacency-list costs by terminology. Generic hash membership is usually an expected-cost claim unless a stronger adversarial guarantee is established. Fixed-width counters must safely accommodate n, m, rank bounds, certificate lengths, and additions before any complexity claim makes sense for code.

## Contract critique for the coordinator

The unselected candidate correctly separates least levels from schedule and permits an independent checker that does not rerun producer SCC logic. Before code, a reviewed contract still needs to choose:

1. The exact finite-graph well-formedness and identity rules, including empty input, declared isolated vertices, endpoints, integer bounds, duplicate records, and unknown future labels.
2. An explicit direction field or an equally unambiguous fixed producer-to-consumer convention.
3. Whether aggregate-strict is only a reserved declared label or an already-defined language adapter policy.
4. Whether success promises only admissibility or also exact SCCs, a total schedule, least levels, and canonical result fields.
5. Which fields are canonical relative to which total orders, and whether input-order invariance or full certificate byte canonicity is required.
6. Whether rejection promises a valid strict cycle only, or canonical strict-edge and shortest-lex path selection too.
7. Whether malformed input, invalid certificates, valid semantic rejection, and inability to establish a result are distinct outcomes. A resource or size refusal must not be reported as unstratifiable.
8. How checker independence, authoritative input binding, full edge coverage, overflow safety, and bounded malformed-certificate processing will be reviewed later.

The exact assertions in the companion file are suitable requirements for such a review, not a declaration that a future implementation has passed them. The synthetic examples are mathematical counterexamples, not executed tests. No implementation should begin on the authority of this report alone.
