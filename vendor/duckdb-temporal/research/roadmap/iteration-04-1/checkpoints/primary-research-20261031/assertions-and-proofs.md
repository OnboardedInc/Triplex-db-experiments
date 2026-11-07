# Independent assertions and proof sketches

All statements below are independently derived for the finite explicit graph model in the report. They are not imported project contracts, executed checks, mechanized proofs, or claims about existing code. V contains every declared vertex; E contains every original edge; w maps E to {0,1}; all levels are nonnegative integers; edges point producer to consumer. No selected implementation contract is implied.

## A1 Strict cycle equivalence

The following are equivalent:

1. Some weight-one edge u → v has endpoints in the same SCC of (V,E).
2. Some directed simple cycle contains a weight-one edge.
3. Some directed closed walk has strictly positive total weight.

Proof sketch: 1 gives a return path v → u; shorten it to a simple path, or use the empty path for a strict self-loop. This gives 2. Statement 2 implies 3 because all weights are nonnegative. If 3 holds, some strict edge on the walk has a return walk between its endpoints, proving 1. SCCs must use all edges, not only weak edges.

## A2 Stratification existence equivalence

A total L: V → nonnegative integers satisfying `L(v) ≥ L(u)+w(e)` for every e = u → v exists if and only if A1 is false.

Proof sketch: summing along a positive-weight closed walk contradicts finiteness of L. Conversely, if A1 is false, each SCC has only weight-zero internal edges. Its quotient Q is acyclic. In any topological permutation rank 0 through k−1 of Q, assign L(v) equal to its component rank. An internal edge has difference zero and weight zero. Any cross edge increases rank by at least one, enough for either allowed weight.

This construction proves existence only; its levels need not be least.

## A3 Feasible levels are constant on SCCs

For feasible L, any vertices x and y in one SCC have L(x)=L(y).

Proof sketch: sum edge inequalities along x → y and y → x. Nonnegative weights give L(y)≥L(x) and L(x)≥L(y). Equality follows. In particular, no strict edge can occur on either such path.

## A4 Least levels and the quotient recurrence

For a graph satisfying A2, there is exactly one function h on SCCs satisfying

`h(C) = max({0} ∪ {h(A)+w(e) : e crosses A → C})`.

The predicate assignment L*(v)=h(component(v)) is the pointwise least feasible nonnegative assignment. Also h(C) is the maximum total weight of a quotient path ending at C, including the empty path.

Proof sketch: induction on any topological order of Q gives existence and uniqueness of the recurrence. Partition paths into the empty path or their final incoming edge to obtain the path interpretation. The recurrence makes L* feasible. Repeated edge inequalities show every feasible L dominates the weight of every path ending at its component, so L≥L*. The definition is independent of which valid topological order was used.

## A5 Numeric bound and empty graph

If k>0, `0 ≤ h(C) ≤ k−1` for every C. A quotient path has at most k−1 edges and each contributes at most one. If V is empty and E is well formed, E is empty, the partition and schedule are empty, and the unique level assignment is empty. No maximum of an empty set is asserted.

The bound assumes weights exactly zero or one. A future generalization to larger nonnegative integer weights requires a different bound.

## A6 Exact SCC certificate relation

A proposed partition of V into k blocks is certified as the exact SCC partition if all of the following hold:

- Every original vertex appears in exactly one nonempty block; no foreign vertex appears.
- Each block C has one root r in C.
- Each x in C other than r has an out-parent edge p → x in E with p in C.
- Each x in C other than r has an in-parent edge x → q in E with q in C.
- In each parent relation, root depth is zero, nonroot depths are in 1 through |C|−1, and parent depth is exactly child depth minus one.
- Every root has no parent in either relation; no nonroot has a missing or second parent.
- Blocks have a permutation rank 0 through k−1.
- Every original cross-block edge u → v satisfies `rank(block(u)) < rank(block(v))`.

Soundness sketch: following parent links strictly decreases nonnegative depth, so every vertex reaches the declared root in each parent relation. Reversing the out-parent traversal gives a root-to-vertex directed path; the in-parent traversal is already vertex-to-root. Thus every block is strongly connected. Any path moving between blocks strictly increases rank at each crossing, so cannot return to a previous block. Distinct blocks cannot be mutually reachable. Hence no true SCC is split, no distinct SCCs are merged, and the partition is exact.

Completeness sketch: the actual SCC partition has an acyclic quotient and hence a topological permutation. Within each SCC, traverse from a root on original edges to obtain an out-tree, and traverse the reversed induced edges to obtain an in-tree. Their depth assignments satisfy the conditions. A singleton's two trees are empty and its depth is zero.

This mathematical certificate can be checked without reproducing the producer's SCC algorithm. That is not a claim that an unimplemented checker is verified or operationally independent.

## A7 Full acceptance certificate soundness

If A6 holds and every original internal edge has weight zero, the graph is stratifiable by A2. If component levels additionally satisfy A4's recurrence on every original cross edge, those levels are exactly the least ones.

Checking recurrence means comparing h(C) to the maximum of zero and all supplied predecessor-level-plus-weight values. Checking only edge lower bounds establishes feasibility, not leastness. Checking that equation before SCC quotienting is insufficient because a weight-zero cycle permits circular self-support at an inflated level.

## A8 Levels alone certify only admissibility

A total nonnegative vertex level map satisfying every original edge inequality certifies stratifiability, irrespective of any producer partition. It certifies no exact SCC claim by itself.

Counterexample to a stronger interpretation: a ↔ b with both edges weak permits L(a)=L(b)=0. The forged partition {a},{b} has those valid levels but is not an SCC partition. Conversely, the graph a → b with a weak edge permits a forged merged block {a,b} with level zero. Neither partition is detected by edge-level inequalities alone.

## A9 Basic rejection certificate relation

Let e = u → v be an original strict edge. Let P be a finite ordered sequence of original edges beginning at v, continuing endpoint-to-tail, and ending at u. P is empty only if u=v. Then e followed by P certifies that no feasible level assignment exists.

Proof sketch: summing inequalities along P and e yields `L(u) ≥ L(u)+1+sum(weights of P)`, impossible. This proof does not need simple paths, shortest paths, canonicity, SCC labels, or a selected query root.

Every nonstratifiable finite graph has such a certificate, by A1. It can use a simple return path and hence at most n total cycle edges.

## A10 A canonical rejection rule that can be independently checked

Assume declared total orders on vertices and edge tokens. A possible rule is: choose the least strict original edge e=u→v internal to an SCC; then choose the shortest return path v→u; among shortest paths choose the lexicographically least edge-token sequence.

This is a definition of one research option, not a selected contract and not a globally shortest-cycle requirement.

A6 plus a full original-edge scan certifies the selected strict edge is least under this rule. Let C be its component. The following distance conditions certify all shortest return distances to u:

1. d(u)=0 and, for x≠u, d(x) is an integer in 1 through |C|−1.
2. Every original internal edge x→y obeys `d(x) ≤ 1+d(y)`.
3. Every x≠u has an original internal edge x→y with `d(x)=1+d(y)`.

Proof sketch: any path of length t from x to u gives d(x)≤t by summing condition 2. Following tight edges in condition 3 strictly reduces d until zero, which is permitted only at u, and gives a path of length d(x). Thus d(x) is precisely the shortest length.

At each returned-path vertex x, require the selected edge to be the least edge among all internal x→y with d(y)=d(x)−1. A shortest path must use such an edge, and every such edge can begin a shortest path. Induction on remaining distance proves lexicographic minimality. The empty return for a strict self-loop is unique.

## A11 Schedule correctness and canonical scheduling are separate

A rank satisfying A6 certifies a valid prerequisite-first component schedule. It does not certify any tie-breaking rule.

Given a fixed component-key order, repeatedly taking the least zero-indegree unprocessed component defines a unique lexicographically least topological schedule. Induction proves uniqueness and leastness: any topological continuation must begin at a current zero-indegree component; a larger first choice is lexicographically larger regardless of the suffix. Removing the chosen component yields the same subproblem.

An independent verifier can check this rule using the certified partition, original cross edges, and its own ready-set calculation, without invoking a producer SCC routine. A rank check alone cannot substitute for this calculation.

## A12 Complete graph quantification

If G is the disjoint union of graphs G1 and G2, G is stratifiable exactly when both are. An unreachable component is not exempt. Adding an isolated vertex preserves the yes or no answer but changes the exact partition, schedule, and total-map coverage obligations.

Proof sketch: restrictions of a feasible map are feasible on both subgraphs. Conversely, take the union of two feasible maps. A strict self-loop in either subgraph prevents feasibility for the union.

## A13 Duplicate edge dominance

For feasibility and least levels only, parallel edges between the same ordered pair can be replaced by one edge with their maximum weight. The conjunction `L(v)≥L(u)+w1` and `L(v)≥L(u)+w2` is equivalent to the inequality using max(w1,w2). Reachability is unchanged if at least one edge remains.

This does not prove that canonical original-edge selection, edge occurrence identity, explanations, or provenance are preserved. Retaining only a weak parallel edge when a strict one exists is unsound.

## A14 Graph extension monotonicity

For fixed vertex identities and edge weights, adding edges or changing a weight from zero to one cannot turn an unstratifiable graph into a stratifiable one. If both old and extended graphs are stratifiable, each old least level is no larger than its extended least level.

Proof sketch: every feasible map for the stronger constraint set also satisfies the weaker one. Leastness then yields the inequality. This is a graph-constraint statement, not permission to omit any declared edge.

## A15 The extraction and execution limits

For any explicit graph, successful certificate checking proves only the graph proposition stated above. To infer a source-program result one additionally needs a sound relation between source dependencies and the explicit graph. To infer an evaluator result one additionally needs the evaluator's own semantic and termination conditions. Neither follows from SCC or level mathematics.

A graph theory proof also does not prove parsing, integer safety, certificate validation code, compiled execution, measured performance, or source completeness. Those remain untested and outside this revision.

A checker refusing a success certificate proves neither graph rejection nor failure of stratification; the certificate may simply be invalid. Likewise, refusing a purported rejection cycle proves neither acceptance nor existence of levels. A valid yes witness or valid no witness establishes its own graph proposition; invalid evidence must remain distinct from the opposite semantic result.

## A16 Bounded abstract verification size

With validated constant-cost graph indices and direct input-edge references, the A6 certificate needs O(n) parent references, depths, and membership fields; rank and level fields need O(k). Scanning those fields and every original edge once a bounded number of times uses O(n+m) logical operations. A10's full distance evidence adds O(n) fields and O(m) scans in the worst case.

These are field and operation counts under the stated model. Encoded byte size, number width, sorting, graph construction, safe malformed-input refusal, and physical resource usage require separate accounting. No measured cost is asserted.
