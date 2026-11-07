# Synthetic graph counterexamples

These are new mathematical fixtures, not copied project inputs and not executed tests. Every expected result follows from the companion assertions. Nothing here describes a stopped payload, native syntax action, compiler, runtime, or computer state. Item4 remains incomplete and untested; item4.1 is untested.

## Notation and illustrative ordering

`u →[0] v` is a weak producer-to-consumer dependency. `u →[1] v` is strict. An edge described as aggregate-strict is a hypothetical declared weight-one edge, not a claim about any language's aggregate semantics. V is explicit: no vertex may be omitted just because it has no incident edge or is unreachable from another vertex.

When a canonicity example needs an order, use `a < b < c < d < e` and then the usual lexicographic order on endpoint tuples, with explicitly named stable edge keys breaking any remaining tie. This is an illustration of the report's optional canonical rule, not the project's selected encoding or identity contract.

## F01 Empty graph

- V = empty; E = empty.
- Result: accepted as a graph. Partition, schedule, and level assignment are empty.
- A maximum level is not asserted. A consumer must not read a nonexistent maximum or invent an isolated predicate.

## F02 Declared isolated predicate

- V = {a}; E = empty.
- Exact SCCs: {a}. Least level: a = 0. Schedule: a.
- Catches edge-endpoint-only vertex discovery, missing singleton handling, and failure to cover declared vertices.

## F03 Positive self recursion

- V = {a}; E = {a →[0] a}.
- Accepted. Exact SCC: {a}; least level zero. Both rooted tree witnesses are empty.
- A singleton is strongly connected using zero-length paths. The self-loop is not grounds for rejection when its weight is zero.

## F04 Strict self recursion

- V = {a}; E = {a →[1] a}.
- Rejected. The strict edge itself is the complete cycle; its return path is empty.
- Catches a checker demanding a nonempty return path or overlooking strict singleton SCCs.

## F05 Levels do not order positive components

- V = {a,b,c}; E = {a →[0] b, b →[0] c}.
- Exact SCCs are three singletons. All least levels are zero. The only prerequisite-first schedule is a, b, c.
- Sorting components only by semantic level is insufficient. A single-pass evaluator cannot infer b-before-c from their equal levels alone.

## F06 Positive mutual recursion

- V = {a,b}; E = {a →[0] b, b →[0] a}.
- Accepted. Exact SCC: {a,b}; both levels zero.
- With root a, a valid out-tree is a → b and a valid in-tree is b → a; b has depth one in each.
- Catches conflating any directed cycle with an illegal strict cycle.

## F07 A strict edge closed by a positive return

- V = {a,b}; E = {a →[1] b, b →[0] a}.
- Rejected. SCC: {a,b}. Witness: strict a → b, then return b → a.
- Computing SCCs on the weight-zero subgraph gives two singletons and misses the actual obstruction.

## F08 Two negatives do not cancel

- V = {a,b}; E = {a →[1] b, b →[1] a}.
- Rejected because summing inequalities requires L(a) ≥ L(a)+2.
- A parity or signed-balance check that accepts an even number of negative edges is wrong for stratification.

## F09 Unreachable rejection and isolated coverage

- V = {r,s,x,y,z}.
- E = {r →[0] s, x →[0] y, y →[1] x}.
- Rejected globally because {x,y} contains a strict edge. The component z must still appear in any full SCC certificate.
- Traversing only from r would examine an accepted subgraph but fail the specified whole-graph proposition.

## F10 Parallel positive and strict dependencies

- V = {a,b}; E contains both a →[0] b and a →[1] b.
- Accepted, with least levels a = 0 and b = 1.
- Deduplicating by retaining the weak record gives the wrong least level. Taking the maximum weight preserves graph feasibility; preserving explanation identity is a separate question.

## F11 The maximum incoming requirement

- V = {a,b,c,d,e}.
- E = {a →[0] b, b →[1] c, a →[1] d, d →[0] e, e →[1] c}.
- Exact SCCs are singletons. Least levels: a = 0, b = 0, d = 1, e = 1, c = 2.
- Under the illustrative least-ready component order, the schedule is a, b, d, e, c.
- Using a minimum over incoming candidates, keeping only the first incoming edge, or processing c before e gives an incorrect result.

## F12 Local equality does not certify leastness

- V = {a}; E = {a →[0] a}.
- Claimed value seven satisfies both the edge inequality and the per-vertex equation `L(a) = max(0,L(a))`.
- It is feasible but not least. The exact quotient has one vertex and no cross edge, forcing h = 0.
- This distinguishes feasibility checking from a leastness claim and catches circular zero-weight justification.

## F13 A forged split of one SCC

- Use F06, but claim blocks {a} and {b} and levels zero.
- Level inequalities pass. Empty per-singleton tree witnesses also pass their internal reachability conditions.
- All-edge cross-rank checking requires rank(a)<rank(b) and rank(b)<rank(a), so rejects the forged partition.
- The example shows why strong-connectivity evidence without maximality evidence is insufficient.

## F14 A forged merge of two SCCs

- V = {a,b}; E = {a →[0] b}; claim one block {a,b}.
- No strict internal edge exists, and there is no cross-block rank constraint under the forged partition.
- A root-to-all out-tree can exist with root a, but no all-to-root in-tree does. The merged block is not strongly connected.
- The example shows why rank and strict-edge checks without both reachability directions are insufficient.

## F15 Parent counts without rootedness

- V = {a,b,c}; E = {b →[0] c, c →[0] b}; claim a single block with root a.
- In each purported tree, assign c as b's parent and b as c's parent; a has no parent.
- There are exactly |C|−1 parent edges, each is a real graph edge, and each nonroot has one parent. Yet a is disconnected from the b,c cycle.
- Strictly decreasing nonnegative parent depths are impossible, so the complete tree check rejects the certificate.

## F16 Scheduling in the wrong direction

- V = {a,b}; E = {a →[1] b}.
- Correct least levels: a = 0, b = 1. Correct schedule: a, b.
- The returned sequence b, a is reverse topological and is not prerequisite-first for this package's direction.
- Reversing all arcs leaves the SCC partition unchanged, so an SCC-only check would not expose a scheduling-direction mistake.

## F17 Valid schedule not canonical schedule

- V = {a,b,c}; E = {a →[0] c, b →[0] c}.
- Both a,b,c and b,a,c satisfy every cross-component rank inequality.
- Under the illustrative least-ready order a<b<c, only a,b,c is canonical.
- A rank-validity check cannot certify the tie-breaking policy.

## F18 Valid rejection not shortest return

- V = {a,b,c}; E = {a →[1] b, b →[0] a, b →[0] c, c →[0] a}.
- The only strict edge is a → b. Both a,b,a and a,b,c,a are valid rejection cycles.
- The shortest return is b → a, so only the two-edge cycle satisfies the optional shortest-return rule.
- Witness validity and witness canonicity have different verification obligations.

## F19 Equal length return paths

- V = {a,b,c,d}; E = {a →[1] b, b →[0] c, b →[0] d, c →[0] a, d →[0] a}.
- Distances to a: d(a)=0, d(c)=1, d(d)=1, d(b)=2.
- Under the illustrative order, b → c → a is lexicographically earlier than b → d → a, and both are shortest.
- A canonical checker must consider all distance-decreasing outgoing alternatives, not merely confirm that the chosen path is shortest.

## F20 Edge preference is not global cycle minimality

- V = {a,b,c,d}; E = {a →[1] b, b →[0] c, c →[0] a, d →[1] d}.
- Both {a,b,c} and {d} are offending SCCs.
- An endpoint-ordered least-strict-edge policy chooses a → b and the three-edge cycle a,b,c,a. The globally shortest forbidden cycle is the one-edge loop at d.
- A report saying merely canonical minimum cycle would be ambiguous. The optional policy in this package does not promise global shortestness.

## F21 Edge order and stable identity

- V = {a,b}; E contains distinct named records eA: a →[1] b, eB: a →[1] b, and r: b →[0] a.
- Reordering eA and eB leaves the endpoint-and-weight graph unchanged.
- If the declared tie-break is stable edge key eA<eB, eA must be selected under either enumeration. If the tie-break is input position, the selected named record can change.
- If exact duplicate records have no distinguished logical identity, their identical token sequence may instead be normalized. A future contract must say which meaning applies; the theorem alone does not choose it.

## F22 Declared aggregate strictness only

- V = {a,b}; E = {a →[1 aggregate-strict] b, b →[0] a}.
- Rejected relative to the declared weight map, exactly like F07.
- This does not prove that a source language must classify a particular aggregate use as strict. The fixture exercises only the explicit graph theorem.

## F23 Malformed endpoint is not a strict cycle

- Declared V = {a}; purported E = {a →[0] b}.
- This is not a well-formed graph over V. No strict cycle has been supplied.
- A future input contract must refuse or otherwise explicitly handle the undeclared endpoint. Reporting unstratifiable would conflate malformed input with a proved graph property.

## F24 A forged distance assignment

- Use F19, but claim d(b)=1 with d(a)=0, d(c)=1, d(d)=1.
- Every edge triangle inequality still holds, but b has no outgoing edge to a distance-zero vertex.
- The tight-edge justification condition fails. Distances cannot be accepted from inequalities alone.

## F25 A forged oversized return distance

- Use F18, but claim d(b)=2 and d(c)=1 while d(a)=0.
- The path b → c → a realizes the claim, but the real edge b → a violates `d(b)≤1+d(a)`.
- A chosen realizing path alone does not certify shortestness; all original internal edges must satisfy the inequalities.

## F26 Incomplete condensation edge list

- Use F07, but the producer supplies two singleton blocks and a claimed quotient list containing only a →[1] b.
- Its supplied quotient list is acyclic, and a topological sort of that list succeeds.
- The omitted original b →[0] a edge breaks the proposed cross-block rank order. Scanning the authoritative original E rejects the certificate.
- Verifying a producer-supplied graph against itself is not checking full original-edge coverage.

## F27 Positive edge between unequal SCC levels

- V = {a,b,c}; E = {a →[1] b, b →[0] c}.
- Least levels: a=0, b=1, c=1.
- Weight zero means nondecrease, not equal levels globally. Equality is forced within an SCC, not across every positive dependency.

## F28 Long strict chain

- V = {v0,…,vt}; E = {vi →[1] v(i+1) for 0≤i<t}.
- Exact SCCs are singletons. Least level of vi is i. The maximum level is t=k−1.
- The family attains the bound and highlights that complete input traversal and safe counter ranges depend on declared graph size. It is not a measured stress test or supported-size claim.
