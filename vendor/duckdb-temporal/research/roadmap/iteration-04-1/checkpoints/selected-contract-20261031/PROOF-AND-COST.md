# Proof obligations, deterministic choices, and analytic costs

**Companion to draft v1; source-only reasoning, not verified code. Every empirical stage is UNRUN.** The statements below justify the proposed witness relation and organize later source review. They do not prove that an unimplemented producer/checker terminates at runtime or returns the promised values.

## P01. Research basis and selected changes

Only the eleven permitted fresh theory/verification research files listed in `source-only-manifest.md` were consulted. The theory package's A1–A16 and the verification package's certificate alternatives establish the relevant mathematical distinctions. This draft makes concrete choices where those research packages intentionally left them open:

- Fixed producer→consumer orientation and explicit declared dense vertex set.
- Exact-built-in object API rather than an undeveloped text/JSON format.
- Identical-triple deduplication, retaining kind distinctions, with stable sorted edge IDs.
- Full exact-SCC evidence and separately canonical schedule in **both** verdict families.
- Unique least quotient levels on accepted graphs.
- Least offending normalized strict edge followed by shortest/edge-ID-lexicographic return path on rejected graphs, with distance/tight-edge evidence.
- Deterministic iterative two-pass production rather than a lowlink-based implementation; no SCC algorithm in the checker.
- Noncanonical auxiliary trees accepted by the checker; deterministic BFS trees chosen by the producer.
- The supplied n/raw-edge caps retained as project admission policy only.

This is a coordinator-candidate refinement for peer review, not a claim that research itself approved this contract. No paper pseudocode, source implementation, or old project code was imported. The research packages' cautions about the 2016 paper's no-path-between-components wording and adjacency-matrix bound are retained: neither defective statement is a premise here. No Kahn-publication detail unavailable in the research is attributed to that paper; the least-ready proof below is independent.

## P02. Faithful normalization

An exact duplicate triple repeats the same edge inequality and reachability fact. Removing only identical triples therefore preserves every path-existence relation, strict-internal-edge existence, and least-level constraint. Different kinds are retained; a weak parallel edge cannot overwrite a strict one. Each canonical edge is backed by an admitted raw occurrence.

Lexicographic sorting by (u,v,kind code), followed by identical-triple collapse, is a function of the normalized graph rather than input enumeration. Consequently all canonical edge references remain stable under raw edge permutation and exact-duplicate changes within the admission cap. Kind order is numerical 0/1/2, not alphabetical string order or source position.

The mandatory raw-occurrence cap and raw scans remain meaningful even when d is tiny: normalization does not erase work already needed to admit m occurrences. The producer certificate excludes m and every work counter, so this cost distinction does not contradict normalized-graph determinism.

## P03. Exact SCC certificate theorem

Given C07's complete partition, parent reference membership, root/depth conditions, and full-original-edge rank scan:

1. In either parent relation, the strictly decreasing nonnegative depth cannot follow a cycle or stop at a nonroot. It reaches the component's unique depth-zero root. The out relation reverses to a real root→vertex path; the in relation is a real vertex→root path.
2. Any two vertices inside one block are mutually reachable through that root, so two different true SCCs cannot be falsely merged.
3. Along any path moving between blocks, every block crossing strictly increases checked schedule rank. Two different blocks therefore cannot have paths in both directions, so one true SCC cannot be falsely split.
4. Coverage includes every declared isolated/disconnected vertex and forbids extra vertices. Hence the blocks are exactly the true SCCs of all admitted edges.

The proof uses no lowlink, discovery time, stack state, producer emission order, or producer-created quotient. An edge omitted from a claimed quotient cannot escape the original-edge scan because no such quotient is accepted as an authority.

Completeness of this witness relation is mathematical: every true finite SCC has an out-tree and in-tree from its least member, with bounded tree depths; its true quotient is acyclic and has a topological permutation. This does not establish correctness of any future code that builds or checks those objects.

## P04. Semantic decision and leastness theorem

If a strict edge u→v is internal to an SCC, a return path v→u exists. Summing the nonnegative edge inequalities around the resulting closed walk requires L(u) ≥ L(u)+t with t≥1. No stratification exists. Conversely, when no strict edge is internal, all internal weights are zero, and the exact SCC quotient is a DAG. Increasing quotient ranks already give some feasible assignment.

For least levels, use the stronger quotient recurrence in C09, not arbitrary feasible ranks and not a per-vertex equation on a zero-weight cycle. Induction on a topological order gives a unique recurrence solution. Its value at a component is the greatest total weight of a quotient path ending there, including an empty path of weight zero. Any feasible vertex assignment is constant on an SCC and dominates every such path weight. Thus the reported assignment is pointwise least and nonnegative.

For k>0, a quotient path has at most k−1 edges, each of weight at most one, so all least levels lie in 0 through k−1. For k=0, the level array is empty; no maximum is asserted. A positive acyclic chain has equal zero levels despite required component precedence, demonstrating why C08 and C09 are independent output claims.

## P05. Least-ready scheduling theorem

Any topological continuation must start with a currently zero-indegree component. Selecting the least such component produces the smallest possible first component ID, independently of its suffix. Remove it and apply the same argument inductively. This yields the unique lexicographically least component-ID topological schedule.

Counting each canonical cross edge once in both indegree initialization and decrement preserves exactly which unprocessed predecessors remain. Multi-kind and multi-endpoint parallel edges between two components are harmless when the same multiplicity policy is used on both sides. A valid rank order alone does not prove the least-ready policy; the checker independently derives that process.

## P06. Canonical rejection theorem

The exact SCC certificate lets a full canonical-edge scan identify the least internal strict edge without a reachability search per strict edge. For selected u→v in C, C11's target-distance conditions prove the shortest distance from every x in C to u:

- Summing `dC(x) ≤ 1+dC(y)` down any x→u path gives dC(x) no greater than that path's length.
- A tight successor at each non-target reduces distance by one and remains in C. The only zero-distance vertex is u, so this constructs a path of length dC(x).
- These bounds coincide. Any shortest path's first edge must be tight, and every tight edge can begin a shortest path.
- Choosing the least canonical edge ID among tight edges and applying the same argument to the suffix gives the lexicographically least shortest sequence.

Every vertex on any v→u return path also belongs to C, so no shorter route through a different true SCC exists. The selected strict edge plus the return path proves semantic infeasibility independently of the canonicality claims. C10–C11 deliberately require those stronger claims anyway: a valid but later edge or longer/larger path is `INVALID_CERTIFICATE`, not a rescued weaker certificate.

For a strict self-loop, v=u and the return is empty. If its SCC has additional vertices, their distance evidence is still required. The selected-edge-first policy is not global forbidden-cycle-length minimization and does not compare cycle rotations.

## P07. Producer invariants for later source review

These are obligations for the candidate algorithm organization, not assertions that code currently satisfies them.

### Admission and graph construction

- n and the raw array length are admitted before allocating from them. Every raw record is validated before graph-semantic decisions.
- Each normalized edge ID denotes exactly one sorted distinct raw triple. Forward/reverse incidence arrays each contain every canonical ID exactly once, at its original tail/head respectively, in increasing ID order within a row.
- No identity field depends on a source occurrence position. Sorting and duplicate collapse neither erase a different kind nor create an undeclared endpoint.

### First forward DFS pass

- Every vertex transitions from unexplored to discovered once and is completed once. Outer starts range over all vertices in increasing order, not a chosen root closure.
- Each live frame owns one discovered uncompleted vertex, its suspended next-incidence cursor, and its eventual completion event. A cursor only advances; returning from a child does not restart an adjacency row.
- Each outgoing canonical edge is examined once in this pass. A discovered/completed target is not rediscovered. A finishing entry is appended only after its row and descendants are complete.
- The explicit frame stack has at most n vertices; this is a logical entry count, not a measured stack/memory claim.

For distinct true SCCs A→B, A's greatest first-pass finishing position exceeds B's. If A is reached first, its traversal reaches and completes B before A's completion; if B is reached first, it cannot reach A without making them one SCC, and finishes first. This standard finishing-order property justifies the next pass; it is not a transfer of correctness from another implementation.

### Second transpose pass

- Start vertices in decreasing first-pass finishing order. A vertex is assigned once, on insertion into the explicit work stack, and each assigned vertex is eventually processed once.
- For the next unassigned SCC C, transpose edges to another true SCC can lead only to a previously assigned original predecessor, by the finishing-order property. The search cannot absorb a different unassigned SCC.
- All of C is reachable from the chosen start in the transpose. Each search therefore assigns exactly one SCC, and the complete start sequence covers all n vertices.
- Each incoming canonical edge is examined once across this pass. No transpose is rebuilt per component.

### Canonicalization, trees and final fields

- Traversal component IDs remain private. Increasing vertex scans produce sorted members and least-member component order before any public ID is used.
- Each root-restricted tree BFS marks on enqueue. A nonroot gets exactly one first-discovery parent, inside its component, with depth one greater than the parent. Forward traversal stores parent→child; reverse traversal stores original child→parent.
- Each component is processed once in the least-ready heap process, and each canonical cross edge increments and decrements indegree once. No duplicate ready insertion or indegree underflow is permitted.
- Accepted quotient levels are finalized in producer-first schedule order from a zero baseline and all incoming constraints. They are never derived from vertex-local circular equations.
- A rejected distance BFS has exactly one target, uses reverse original incidence inside C, and counts every kind as one step. The chosen path follows decreasing distance and least canonical tight edges; it is not found by enumerating cycles or retrying reachability for successive strict edges.

The checker has different invariants: complete coverage before references, validated references before indexing, checked parent-depth descent, all-original-edge increasing ranks, its own canonical-ready set, and either the complete incoming maximum or complete target-distance/tight-edge relations. It has no SCC traversal invariant because it executes no SCC algorithm.

## P08. Input-derived quantities and counter definitions

These are **mathematical/source-review quantities only**. No counter implementation or empirical observation exists. They are not certificate fields, public telemetry, or evidence that a call ran. A future instrumented observation would need separate authorization and an implementation-specific record; this draft starts no such work.

- n: admitted declared vertices, including isolated vertices.
- m: admitted raw edge occurrences, including exact duplicates.
- d: distinct normalized endpoint/kind triples.
- k: certified exact SCCs.
- m_cross, d_cross: raw and canonical cross-component edge counts, respectively.
- m_strict: raw negative/aggregate occurrences.
- For rejected graphs, s is selected-component size, p is supplied return-path length, and m_C/d_C count raw/canonical edges internal to that component.

All these definitions are graph/contract quantities, not computer properties. A logical visit means one examination of the indicated record/incidence/slot at that stated stage; it is not a Python instruction, allocation, byte, memory access, elapsed duration, or physical stack operation. The same edge can contribute one visit in several distinct stages; those counts MUST NOT be reported as a single scan.

## P09. Proposed successful-path logical counts

The table applies to an admitted graph and an otherwise valid complete certificate/production path. A definite malformed-input/certificate refusal may inspect a bounded prefix and has no fabricated complete-pass count.

| Stage | Logical work quantities |
|---|---|
| Each function's separate graph admission | m raw-record examinations, 2m endpoint range checks, m kind checks, plus finite scalar/shape checks. Dense vertices have no n input records; n remains in array initialization and later coverage. |
| Each function's separate normalization | m sorted raw triples; max(m−1,0) adjacent duplicate comparisons; d emitted canonical triples. Sorting comparisons/temporary storage are extra and bounded separately, not silently linear. |
| Forward/reverse incidence construction where needed | d placements in each direction, 2d total, plus O(n) row setup. |
| Producer first/second SCC passes | n discoveries/completions and d incidence examinations per pass; n first-pass frame insertions/removals; n second-pass vertex assignments. |
| Producer two-tree construction | n vertex discoveries per direction; d incidence examinations per direction, including ignored cross edges; 2(n−k) non-null parent selections. |
| Checker partition/trees | n member values, 2n parent slots, 2n depth slots, and exactly 2(n−k) checked non-null references and depth equations, plus k component headers/roots. |
| Mandatory original-edge rank/strictness classification | m original records classified; m_cross boundary-rank inequalities; m_strict strict-edge component tests. Rejected family still checks the full rank scan. |
| Each separately built canonical schedule | d normalized edge classifications; d_cross indegree increments and d_cross decrements; exactly k heap insertions and k removals, no more than k live heap entries. |
| Accepted checker recurrence | k zero baselines; m_cross predecessor-plus-weight candidate additions and maximum comparisons; k equality checks against claimed levels. This is separate from rank/strictness classification unless source review documents an explicitly fused pass. |
| Rejected canonical offending-edge selection | d normalized edge examinations, with kind/internal classification and a least-ID choice. No per-candidate reachability. |
| Rejected producer distance BFS | s vertex discoveries and at most d reverse-incidence examinations, cross edges ignored for discovery. |
| Rejected checker distance evidence | s distance slots; m_C triangle inequalities; d normalized-edge examinations to identify d_C internal edges and least tight choices; s−1 required non-target tight-successor existence checks. |
| Rejected returned path | p=dC(v) checked edge references/steps; p≤s−1. The distinguished strict edge is additional, giving at most s cycle edges. |

Different fields' canonicity is checked separately: tree relation counts do not imply canonical schedule; rank counts do not imply least levels; path-continuity counts do not imply shortestness or lexicographic minimality. The counts above intentionally retain n, m, d and sorting/heap costs instead of abbreviating all work as O(m).

## P10. Cost and size commitments, not measurements

For validated bounded integer fields, constant-cost indexed incidence access, and a comparison-sort/heap model, both selected function organizations admit the conservative successful-path bound

**O(n + m log(m+1) + k log(k+1)) logical work**,

including their own normalization and canonical schedule. The certificate has O(n) slots; its scanning is included. Graph/SCC/certificate checks after sorting and apart from heap comparisons use a bounded number of O(n+m+d) passes. Comparison sorting uses O(m log(m+1)) comparisons and may use O(m) temporary references. No hash-table expected-cost assumption is needed.

Each function may retain its own sorted raw list with m occurrences, the d-edge canonical table, O(n+d) incidence/partition/queue/heap data, and O(n) certificate state. Live logical storage is **O(n+m+d)**, hence O(n+m). Producer and checker calls are separately accounted; this is not a promise of a shared cache or simultaneous-memory byte total. The checker needs no n² matrix and no SCC traversal state. Physical Python container/object overhead, allocation behavior, encoded byte sizes, timing, throughput, and empirical stack behavior are not measured or predicted here.

Ignoring dictionary literal keys and container headers, count scalar-or-null array slots as follows:

- Accepted family: n members + k schedule IDs + 4n parent/depth slots + k levels = **5n+2k**, at most 7n.
- Rejected family: n members + k schedule IDs + 4n parent/depth slots + s distances + p path IDs + one strict-edge ID = **5n+k+s+p+1**, at most 7n+k and hence 8n when n>0. The rejected family is impossible at n=0.
- The component nesting adds k member-list headers, not k additional unbounded data arrays. All top-level field counts and schema literals are fixed. Numeric/reference bit counts are bounded in terms of n and d, for example O(n log(n+2)+n log(d+2)); this is not a serialized-byte claim because v1 supplies no serializer.

Range/empty-case source-review obligations include:

- n≤4096, m/d≤65536, and d+1≤65537; IDs are validated before indexing. Per-component indegrees never exceed d and must not become negative.
- Component IDs, roots/members, depths and nonempty-graph levels are at most n−1. Tree and distance additions can reach a temporary s≤n, and a checked predecessor level plus weight can reach a temporary k≤n even when a claimed recurrence is false.
- Empty n/k cases are handled by empty arrays; no operation needs to invent an empty maximum, root, level, or usable edge ID. A path bound s−1 is considered only after a valid nonempty selected component exists.
- Cumulative member lengths are compared with n before member traversal or allocation; other certificate lengths are checked before traversal. Dict key counts are checked before examining keys. Unknown nested payloads are rejected at their prescribed outer type/shape, not recursively explored.
- Exact built-in integers still permit preconstructed enormous malformed objects. No decimal formatting/coercion of such values is needed; range/shape rejection happens before indexing/arithmetic. This does not justify treating arbitrary malformed integer/string representation costs or already-created caller objects as physically free.

Project admission caps do not prove that enough resources exist, that source has no bug, or that any runtime will return. C05 keeps exceptional failures nonsemantic. A mathematical certificate implication and an abstract finite-work bound are not code verification or a benchmark.

## P11. Paper illustrations — not executed fixtures

1. **Mixed parallel kinds and stable IDs.** Let n=2 with positive 0→1, negative 0→1 (possibly repeated), and positive 1→0. The normalized IDs are respectively 0, 1, 2 under the declared tuple order. There is one component [0,1], schedule [0], selected strict edge 1, return path [2], and distances to target 0 of [0,1]. A valid out-tree can use edge 0 or edge 1; both satisfy the rejected-family auxiliary relation, but the selected producer's first-discovery rule chooses edge 0. This demonstrates deterministic producer output without unique accepted tree bytes/values.
2. **Levels are not precedence.** For positive 0→1→2, components are [0], [1], [2]; canonical schedule is [0,1,2], and levels are [0,0,0]. All parent slots are null and all depths zero. Reversing the schedule fails despite unchanged feasible levels.
3. **Whole-graph scope.** An isolated vertex 0 and aggregate strict self-loop at vertex 1 require both singleton components in the certificate and semantic rejection. A malformed additional raw record cannot be excused by that valid local obstruction.
4. **Empty graph.** n=0 with no raw edges has an accepted-family certificate with empty components, schedule, parent/depth and level arrays. It has no rejected-family certificate and no claimed maximum level.

These are fresh mathematical illustrations of the chosen protocol, not observations, test source, test counts, or permission to execute anything.
