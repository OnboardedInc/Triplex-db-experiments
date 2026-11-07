# Item 4.1 — independent-oracle, fixture, metamorphic and mutation alternatives

**All cases and procedures below are proposed and UNRUN.** Expected results are mathematical predictions for synthetic graphs, not observations of a program. No corpus, oracle, harness, test controller, executable, or benchmark was implemented or invoked. No final schema, language, resource threshold or acceptance gate is selected.

## 1. Independent tiny-graph oracle

Use a deliberately different formulation from a DFS/SCC producer:

1. Validate the whole explicit graph using the eventual declared input rules. Do not silently invent vertices.
2. Build a Boolean reachability relation on all declared vertices. Set the diagonal true for zero-length paths and set every original directed edge true regardless of kind.
3. Compute transitive closure using Boolean Warshall with the intermediate-vertex loop outermost. Alternatively use a fresh BFS/DFS from every vertex; do not call the producer's SCC routine.
4. Predict semantic infeasibility iff some original strict edge `u -> v` has `R[v,u] = true`.
5. If exact SCCs are advertised, compare the producer's equivalence relation against `R[u,v] and R[v,u]` for every vertex pair. Compare relations, not arbitrary component numbers.
6. If least levels or a canonical schedule are advertised, check those independently as separate claims on the oracle-derived component DAG. A yes/no oracle does not automatically verify the additional fields.

The two closure families have explicit official reference descriptions: all-source DFS and Boolean Warshall are materially different from lowlink SCC computation. [Princeton TransitiveClosure](https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/TransitiveClosure.html), [Princeton WarshallTC](https://algs4.cs.princeton.edu/42digraph/WarshallTC.java.html).

This oracle's intended use is small graphs. Matrix allocation/operation counts are input-derived policy issues, not grounds to inspect a machine. Sharing the producer's parser, edge-sign normalizer, graph builder and SCC routine would leave major common-mode faults intact even if a test driver has a different name. Prefer independently stated fixture graphs and at least one independent normalization/validation path after the contract is selected.

### Exhaustive-domain alternatives, with no execution claim

For `n` named vertices, include ordered pairs with self-pairs:

- One of absent/positive/strict on each pair: `3^(n^2)` simple labelled graphs; at `n=3`, 19,683 possibilities; at `n=4`, 43,046,721.
- Independent positive-present and strict-present bits per pair, allowing both: `4^(n^2)` possibilities; at `n=3`, 262,144; at `n=4`, 4,294,967,296.
- Independent positive/negative/aggregate-present bits: `8^(n^2)` possibilities; at `n=3`, 134,217,728.

These are analytic cardinalities, not generated or counted corpora. A first two-state/three-state domain cannot by itself exercise loss of strictness when positive and strict edges share endpoints; parallel-kind fixtures must supplement it. Exact duplicate multiplicity and record-order permutations are additional dimensions. No exhaustive bound or run budget is selected here.

## 2. Synthetic semantic and output fixtures

Notation for this table only: `a +> b` is a positive prerequisite-to-dependent edge; `a -> b` is strict negative; `a A> b` is strict aggregate. All listed vertices are explicit. “Feasible” and “infeasible” assume a well-formed representation. The reverse-arrow convention has the corresponding reversed level/order expectations.

| ID | Synthetic graph | Predicted result and purpose |
|---|---|---|
| F00 | `V={}`, no edges | Empty feasible graph and empty output **if** the eventual contract permits it. Otherwise input-policy failure, not a strict cycle. |
| F01 | `V={a}`, no edges | Feasible; one singleton SCC; least level 0. |
| F02 | `a +> a` | Feasible positive recursion; singleton SCC; level 0. Catches “reject any cycle.” |
| F03 | `a -> a` | Infeasible; strict self-edge with empty return path. |
| F04 | `a A> a` | Infeasible; aggregate must be strict under the supplied scope. |
| F05 | `a +> b`, `b +> a` | Feasible; one SCC; both levels 0; one recursive block. |
| F06 | `a -> b`, `b +> a` | Infeasible; strict edge plus one-edge return path. |
| F07 | `a -> b`, `b +> c`, `c +> a` | Infeasible; three-vertex return path. Catches checking only self-loops and direct reciprocal pairs. |
| F08 | `V={a,b,c}`, `a -> b` | Feasible; least levels `a=0,b=1,c=0`; tests isolated-vertex coverage and direction. |
| F09 | `a +> b`, `b -> c` | Feasible; least levels `a=0,b=0,c=1`; positive precedence is not strict level increase. |
| F10 | Positive cycle on `{a,b}`, positive cycle on `{c,d}`, strict `b -> c` | Feasible; exactly two SCCs, with first block level 0 and second block level 1. |
| F11 | `V={root,x}`, no root edges, `x -> x` | Infeasible even if `x` is unreachable from `root` or omitted from a supposed output set. |
| F12 | Benign component plus a disconnected undeclared endpoint/unknown kind | Whole graph malformed under an explicit-vertex/closed-kind policy. Never semantic success based on the benign component alone. |
| F13 | Both `a +> b` and `a -> b` | Feasible with `b>=a+1`; add `b +> a` and it becomes infeasible. Catches sign overwrite on duplicate endpoints. |
| F14 | Exact duplicate copies of an edge, then permutations of copies | Semantic verdict/least levels unchanged; schedule multiplicity accounting must remain consistent. |
| F15 | Two or more independent DAG branches | Multiple valid schedules exist. A canonicality claim needs a declared tie policy, not an arbitrary expected order. |
| F16 | Benign first component, positive SCC later in vertex order, strict self-loop last | Infeasible; tests traversal forest rather than a single-root traversal. |
| F17 | Positive SCC `{a,b}` then one-way `c +> a` | Feasible, exact SCCs `{a,b}` and `{c}`. Catches incorrectly merging with previously completed SCCs. |
| F18 | `a +> b`, `a +> c`, `c +> b`, processed with `b` before `c` | Three singleton SCCs; feasible. Distinguishes an edge to a completed vertex from an edge to the active DFS stack. |
| F19 | Positive chain of `n` vertices | Feasible; all least levels 0; block order follows the chain. Candidate depth stress without selecting an empirical size. |
| F20 | F19 plus strict last-to-first edge | Infeasible; a single SCC contains the strict edge. Tests long return path and late failure. |
| F21 | Many edge occurrences on two endpoints | Input-processing counts grow with occurrence count `m`, even when distinct-edge count stays small. |
| F22 | Wide hub/star and a tree-parent certificate referring repeatedly to hub edges | Tests lookup organization; repeated linear searches can defeat a linear checker claim. |
| F23 | Layered positive DAG with many possible paths | Feasible; rejects any need to enumerate paths or cycles. |
| F24 | Dense small graph with each kind and mixed-kind endpoint pairs | Tests all-pairs oracle, duplicates, sign handling and dense operation accounting. |
| F25 | Two isolated vertices, claimed levels `(1,1)` | A bounded feasibility checker may accept this witness; a least-level checker must not accept it as least. Graph itself remains feasible. |
| F26 | `a +> b`, claimed levels `(0,0)` and schedule `[b,a]` | Levels are least, but advertised dependency-first schedule is invalid. |
| F27 | One-way `a +> b`, certificate claims one SCC | Must reject that certificate; graph remains feasible. Catches inventing mutual reachability. |
| F28 | `a +> b`, `b +> a`, certificate claims two SCCs | Must reject the split certificate; graph remains feasible. Catches missing boundary-order checks. |
| F29 | Two disconnected strict cycles with different smallest IDs | Any valid strict-cycle witness proves infeasibility; only the declared canonical policy determines which witness is canonical. |
| F30 | Two return paths with different lengths and equal-length lexical ties | Separately test local witness validity, shortestness, and tie-breaking. Do not collapse the three claims. |

No artificial “entry vertex” may change feasibility under the supplied all-components requirement. If an entry annotation is permitted for another purpose, vary it while holding the graph fixed and require the same semantic verdict.

## 3. Malformed-input and hostile-certificate families

Predicted parser/validation results depend on choices still open; the important invariant is never to misclassify them as a proved strict cycle or a verified feasible graph.

### Graph representation

- Missing fields, wrong top-level type, wrong edge-record arity, nulls in place of records, unknown schema/version.
- Unknown edge kinds, incorrect case or unexpected enum spelling, and omitted kind fields. Do not default unknown kinds to positive.
- Repeated vertex declarations, negative/out-of-range endpoints, undeclared endpoint IDs, or dense-ID gaps if a dense authority is chosen.
- Nonintegral numbers, booleans in integer fields, unsafe integer magnitudes, non-finite tokens accepted by a permissive decoder, and overflow-sized counts.
- Duplicate JSON object keys, truncated records, trailing non-whitespace payload, deeply nested values, excessively long IDs or integer tokens.
- Unicode identity tests: composed U+00E9 versus U+0065/U+0301; BMP U+E000 versus supplementary U+1F600 for comparator differences; malformed surrogate sequences under a Unicode-validity policy.
- Exact duplicate edges versus same endpoints with positive/negative/aggregate kinds. They must not be confused with duplicate JSON object names.

### Success witness

- Omitted isolated/unreachable vertex, foreign vertex, repeated assignment, mismatched count, empty claimed SCC, duplicate root, missing root.
- Invalid parent-edge index; a real edge with wrong direction; a parent outside the component; invented edge; omitted parent for a non-root.
- Parent-pointer cycle, nondecreasing rank, negative rank, enormous rank token, second rank-zero vertex, or root with a parent.
- Cross-component cycle hidden by a forged topological rank; repeated/missing rank in a purported permutation.
- Feasible but shifted levels presented as least; invalid strict inequality replaced by equality; correct levels attached to reversed orientation.
- Correct partition and levels with a noncanonical member order, component ID, schedule tie, or serialization, if canonicality is claimed.

### Failure witness

- Positive edge mislabelled strict, unknown strict kind, nonexistent edge reference, reversed path edge, disconnected path fragment, wrong final endpoint.
- Missing strict edge with a merely positive cycle; return path that ignores an intermediate edge; truncation after a valid prefix.
- A strict self-loop incorrectly required to supply a nonempty return path.
- A valid but longer/noncanonical witness: accept as a local infeasibility proof when only local validity is promised; fail the stronger claim only when shortest/canonical output is required.
- Path/certificate length beyond an input-derived cap: verification unavailable or invalid witness under the selected protocol, not automatic semantic infeasibility.

## 4. Metamorphic relations, with exact scope

Metamorphic testing derives follow-on inputs with known relations among results rather than assuming every output is already known. The original technique is applicable without a conventional single-case oracle. [Chen, Cheung and Yiu, HKUST-CS98-01; author-deposited version](https://arxiv.org/abs/2002.12543v1).

The following graph-specific relations are fresh derivations for this scope, not quotations or claimed experiments:

| Transformation | Required relation | Output caveat |
|---|---|---|
| Permute vertex/edge records | Same feasibility and same mapped least levels | Identical bytes only if input-order-independent canonicalization is promised. |
| Bijectively rename vertices | Same feasibility and isomorphic SCC relation | Compare through inverse renaming; lexical canonical IDs/witness choice may change. |
| Add isolated vertices | Same old verdict; new vertices least level 0 | Canonical global schedule may interleave new singleton blocks. |
| Disjoint union | Infeasible iff at least one summand is infeasible | Least levels stay componentwise; canonical chosen failing component may change. |
| Duplicate an existing occurrence | Same feasibility, SCC relation and least levels | Multiplicity/provenance fields may change; indegree accounting must not break. |
| Swap negative and aggregate labels | Same feasibility and least levels when both are strict | Diagnostic kind must reflect the actual input label. |
| Change strict to positive | Cannot turn a feasible graph infeasible | May turn infeasible into feasible; least levels may decrease. |
| Change positive to strict | Cannot turn an infeasible graph feasible | May introduce a forbidden cycle or increase least levels. |
| Remove edges | Cannot turn a feasible graph infeasible | SCCs may split, levels may decrease, and chosen witness may disappear. |
| Add edges | Cannot repair infeasibility | Even a positive added edge can close a cycle containing an existing strict edge. |
| Reverse every edge | Same feasibility and same SCC vertex sets | Least levels and dependency-first order generally change; do not assert equality. |
| Subdivide an edge with a fresh vertex and weights `(w,0)` | Same feasibility; old-vertex least levels unchanged | Map witnesses through the subdivision; exact witness bytes need not match. |
| Add a positive shortcut along an already existing path | Same feasibility and old least levels | It is a redundant non-strict constraint, but can change shortest witnesses. |
| Move a malformed record to an unreachable/last component | Still whole-input invalid | Detects semantic short-circuit before full validation. |

An especially useful negative control is “adding a positive edge always preserves feasibility”: this is **false**. Starting with strict `a -> b`, adding positive `b +> a` makes the graph infeasible. Tests must not bless invalid metamorphic relations.

## 5. Differential testing without majority-vote correctness

Candidate independent paths are: iterative SCC producer versus Boolean-matrix closure; a two-pass SCC implementation versus an in/out-tree checker; and total-level feasibility checking versus strict-cycle witness checking. Algorithmic diversity is useful, but agreement between two equally faulty implementations is not proof. The small closure theorem provides a reference for tiny inputs; on larger inputs, accepted certificates provide instance-specific evidence within the checker's trust boundary.

Differential testing compares systems on corresponding inputs and treats discrepancies as bug candidates, rather than presuming an existing implementation is always the oracle. [McKeeman, “Differential Testing for Software,” 1998](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf).

A later discrepancy record should preserve only the synthetic graph, contract version, outputs/witnesses, expected mathematical relation, and source revision needed to reproduce it. No computer-environment snapshot is needed. A reducer should preserve input well-formedness and the discrepancy predicate; shrinking into malformed input answers a different question. No reducer was implemented or run here.

## 6. Mutation targets and intended discriminating evidence

These are proposed mutations of a future implementation/checker, not actual edits. “Killed by” means a predicted distinguishing fixture, not an observed mutation score.

| Hypothetical mutation | Predicted discriminating evidence |
|---|---|
| Traverse only the first root or declared output closure | F11, F16 and whole-input coverage checks. |
| Reject every directed cycle | F02, F05 must remain feasible. |
| Make every edge strict | F02, F05, F09 and least-level assertions. |
| Treat aggregate as positive | F04. |
| Overwrite strictness with the last positive parallel edge | F13 in both record orders. |
| Check only self-loops or reciprocal pairs | F07 and long-cycle F20. |
| Use visited instead of active-stack membership in a Tarjan-style update | Exact SCC relation on F17/F18, not just yes/no. |
| Omit tree-edge membership validation | Forged parent edges and F27. |
| Omit parent rank/root termination checks | Cyclic parent pointers and multiple-root certificate mutations. |
| Omit cross-component original-edge checks | F28 split-SCC witness. |
| Verify only level inequalities but advertise least levels | F25. |
| Sort only by levels but advertise dependency-first order | F26. |
| Count duplicate indegrees but decrement only unique edges, or vice versa | F14/F21; schedule must cover every component exactly once. |
| Accept a valid prefix before parsing the rest | F12 and malformed-record relocation. |
| Interpret certificate failure as graph infeasibility | Correct feasible graphs with deliberately corrupted witnesses. |
| Require a nonempty return path for strict self-loop | F03/F04. |
| Check path connectivity but not the distinguished edge's strict kind | Positive-cycle fake rejection witness. |
| Use locale/order-sensitive or inconsistent string sorting | ID permutations plus explicit comparator/Unicode fixtures, if that comparator is chosen. |
| Use safe-inequality checks only after lossy integer conversion | Distinct unsafe-magnitude ID/rank tokens under an exact-identity contract. |
| Clear sign distinctions during endpoint-pair deduplication | Mixed-kind parallel edges and negative/aggregate-swap tests. |
| Skip all but reachable input for memory/cost reasons | Late disconnected bad graph and bad-certificate records. |

Mutation testing is fault-based assessment, not a correctness proof or a guarantee that surviving mutants are real bugs. Equivalent mutants and an unchosen contract can make a mutation genuinely nondiscriminating; classify those cases rather than inventing a passing score. [Jia and Harman, 2011](https://xplorestaging.ieee.org/document/5487526).

## 7. Future evidence package, still UNRUN

A later authorized test round could freeze: exact input/output policy; enumerated domain and synthetic seeds; fixture graphs and mathematical expectations; independent oracle source; checker source; result classification; actual assertion and mutation outcomes; and input-derived operation counters. Each failed or unavailable check should remain visible. Finite test agreement, even exhaustive for a tiny domain, must not be reported as a proof for arbitrary inputs.

There is no current pass count, coverage result, mutation score, timing, execution log, compiled artifact, installed-tool observation, or acceptance finding. This research does not unblock held native compilation or complete item 4.
