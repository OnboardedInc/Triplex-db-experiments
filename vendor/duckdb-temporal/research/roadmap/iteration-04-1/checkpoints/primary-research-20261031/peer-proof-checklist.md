# Independent proof obligations before source/contract review

Status: analytic checklist written at the pre-source boundary. At its creation, the allowlisted research and exact new contract had not yet been delivered through a permitted channel. The subsequent narrow literal-read clarification and completed research review are recorded in `activity.md` and `research-review.md`. This checklist is not contract/code approval. Empirical checks: UNRUN.

## A. Strict-cycle equivalence and global quantification

Let each normalized directed edge `u -> v` have weight zero for positive and one for negative/aggregate. Feasibility means a nonnegative integer assignment satisfying `s(v) >= s(u) + weight` on every edge.

Summing around a directed cycle proves that a cycle containing a strict edge is infeasible. Conversely, if no strict edge is internal to a true SCC, every internal edge is positive. The SCC quotient is a DAG, so assigning weighted longest-path levels to its components gives a feasible assignment. A strict edge is internal to an SCC exactly when it has a return path, producing the forbidden cycle; a strict self-loop has the empty return path.

All components and all edges must be covered. Testing only a query-reachable component or only a selected dependency subgraph is insufficient. A disconnected strict self-loop is a minimal counterexample to query-local acceptance.

## B. Exact SCC certificate, not merely internally connected blocks

A partition must cover each declared vertex exactly once. For every block, check one rooted spanning out-tree and one rooted spanning in-tree using actual internal edges; singleton blocks need empty trees. Acyclic parent relations plus complete membership/root coverage, or bounded strictly descending depths with exact parent edges, establish the tree obligations.

The trees prove that every asserted block is strongly connected. They do not prove maximality. Check a strict component rank increase on **every** original normalized cross-block edge. A path crossing blocks then strictly increases rank and cannot return, so different blocks cannot be mutually reachable. Together these facts prove exact SCCs without invoking the producer's SCC routine.

Counterexample to trees alone: two singleton blocks with positive edges both ways. Counterexample to witness-only cross-edge checks: a supplied acyclic cross-edge subset can omit the return edge of that same graph.

Primary verification: [Tarjan–Zwick, 2022, §3.3](https://arxiv.org/html/2201.07197v3) independently describes internal in/out-tree verification together with a component topological order to establish exact SCCs. This is support for the mathematical certificate principle, not for a particular new API or checker implementation.

## C. Least quotient levels versus circular vertex equations

On the acyclic exact quotient, define `L(C) = max({0} union {L(D) + weight(e) : e goes D -> C})`. Evaluate only after all predecessors. This produces a feasible assignment. Induction in topological order shows every other feasible nonnegative assignment is pointwise at least `L`. All feasible assignments are constant within a positive SCC, so the lift to vertices is the pointwise least vertex assignment. Levels are at most the number of components minus one.

Circular per-vertex equalities are not an independent leastness proof: a positive self-loop permits every nonnegative value in `s(v) = max(0, s(v))`. A checker must establish the DAG recurrence (or another independently proved leastness criterion), not merely re-evaluate cyclic equations or inequalities.

## D. Canonical least-ready order

When the contract supplies a total canonical component key, repeatedly choose the least key among all currently zero-indegree components and remove it. Induction on the first differing choice proves the result is the lexicographically least topological order. Merely sorting the final components by level or trusting producer traversal order is not equivalent. A checker must test that the reported next component is least among **all** currently ready components, with indegree accounting matched to the chosen quotient-edge representation.

## E. One canonical rejection witness

First choose the least normalized strict edge whose endpoints lie in the same exact SCC, under the contract's explicit total edge order. Only then choose one shortest return path from its consumer to its producer; among shortest paths choose the lexicographically least **edge-identity sequence**. Minimizing the whole cycle before selecting the strict edge is a different rule.

For target `u`, a valid distance proof on the selected component has `d(u)=0`, positive bounded integer distance at every other vertex, `d(x) <= 1+d(y)` on every internal edge `x -> y`, and at least one tight outgoing edge from each non-target vertex. The all-edge inequalities bound each label by every return-path length. Tight-edge descent reaches the target in exactly the label's number of steps. Thus the labels are exact shortest distances. Repeatedly selecting the least tight outgoing edge gives the unique shortest/lex path for the specified total edge order. A tight edge exists at every step and decreases distance, so the path terminates without enumeration of all shortest paths.

For a strict self-loop, the return path is empty. Rejecting that case for having no return edges is wrong. Path length alone, a merely valid path, or unverified distances cannot certify shortest/lex canonicity.

## F. Identity, normalization, and result layers

Deduplicate by the whole typed identity `(producer, consumer, kind)`, not endpoint pair alone. Parallel positive/negative/aggregate kinds are semantically distinct input edges and can affect canonical diagnostics. Endpoint-pair maximum weight may suffice for quotient level computation, but it cannot replace typed identity for witness selection.

Raw order and duplicate occurrences may not alter the canonical semantic projection. They can alter raw-request counts. Valid auxiliary spanning trees need not be canonical; accepting another valid tree must not imply that the canonical semantic result differs. The exact contract must explicitly locate component labels, ranks/order, distances, trees, and raw telemetry in the appropriate layer.

Malformed or invalid certificate means the checker has failed to establish the alleged semantic decision. It must not be returned as a semantic graph rejection. The empty graph, missing/duplicate members, stale IDs, non-tree parent cycles, incomplete cross-edge scans, inflated least levels, nonleast ready orders, and nonleast/longer rejection paths need explicit outcomes.

## G. Cost and oracle limitations

Use distinct quantities: declared vertices, raw occurrences, normalized typed edges, components, and quotient arcs. A linear SCC pass does not make the full canonical protocol linear: comparison sorting and minimum-ready selection have their own costs. Caps are protocol limits, not measured capacity or performance evidence. Certificate payload validation and type/length bounds need their own accounting; successful-input bounds alone do not establish malformed-input resource safety.

An independent small oracle can use transitive closure for exact SCCs, independent least-level enumeration or path-based evaluation, enumeration of all topological orders to select the least, and enumeration of simple return paths to select the shortest/lex one. Reusing the producer SCC/scheduler/path routine is not such an oracle.

For three independent kinds on each ordered pair, full normalized graph coverage has eight per-pair subsets, not four exclusive choices. For `n` vertices it has `2^(3*n*n)` cases; `n=2` gives 4096 and `n=3` gives 134217728. An exclusive `none/positive/negative/aggregate` generator misses parallel-kind cases. Bounded exhaustive coverage is not a proof for all permitted graph sizes, and no such run has been performed here.

Metamorphic assertions must name the projection preserved: adding a duplicate preserves normalized semantic core but changes raw counts; adding a positive internal edge preserves feasibility but may shorten a canonical rejection path; vertex renaming preserves feasibility/strata under transport but need not transport an ID-ordered canonical schedule or witness unchanged.

## Pending review boundary

No source-compliance verdict, implementation approval, runtime claim, or test result is established. Await exact allowlisted research contents, then exact new contract filenames/content. No old stopped source or held execution is needed or permitted.
