# Item4.1 bounded explicit-graph certificate contract — draft v1

**Source-only candidate for independent review. Not an implementation authorization. All empirical stages UNRUN.**

The words MUST, MUST NOT, and MAY describe this proposed contract, not permission to perform later work. Revision 001 is to be frozen after authoring; corrections belong in a new revision. This is a new semantic graph/certificate tool only. It does not extract dependencies from Datalog, evaluate rules/negation/history/aggregates, link/load/compile old native code or host v2, prove runtime producer completion, or replace held syntax work. Item4 remains incomplete/untested; item4.1 remains untested. The old item3/item4 stopped saves and explicitly dependent old native syntax action remain HOLD, with no recreation, renaming, transfer, repackaging, routing around, or substitute action authorized.

## C01. Delivery model and authority

The candidate is a clean-room pure Python module using only the standard library. **Python 3.11 is the project-declared source requirement**, not an observed installed version or availability claim. This revision contains prose and mathematical specifications only; it supplies no module, executable pseudocode, test implementation, command, execution controller, or installation step.

The eventual module would expose exactly two public functions:

1. `analyze(graph)` — return a stratifiable or unstratifiable certificate for an admitted graph; return the exact string `INVALID_INPUT` for malformed graph input.
2. `check_certificate(graph, untrusted_certificate)` — return exactly one of `VALID_STRATIFIABLE`, `VALID_UNSTRATIFIABLE`, `INVALID_CERTIFICATE`, or `INVALID_INPUT`, as specified below.

There is no CLI, file API, JSON/bytes decoder or encoder, network API, source-language adapter, or implicit graph extraction in v1. No statement about duplicate JSON object names, encoded bytes, authentication, cryptographic signing, or canonical serialization follows from this in-memory API. Adding a wire adapter would require its own reviewed input/size/ambiguity contract.

Both functions MUST be free of project-native imports, environment inspection, filesystem/network/subprocess effects, random choices, clocks, recursion-limit changes, and caller-object mutation. Ordinary standard-library queue/heap operations and built-in comparison sorting are permitted by the candidate source design, not invoked by this revision.

## C02. Primitive validation and call preconditions

- A dictionary means **exactly** a built-in Python `dict`, not a subclass or arbitrary mapping. An array means **exactly** a built-in `list`, not a tuple, subclass, iterator, generator, or arbitrary sequence. A string means **exactly** built-in `str`.
- Every integer field, without exception, MUST have `type(value) is int`; booleans, integer subclasses, floats, numeric strings, nulls, and coerced values are invalid. The prescribed range MUST be checked before arithmetic or indexed access.
- A dictionary MUST contain exactly its specified keys. Its key count is checked before any entry traversal. Every key is checked to be an exact string from the finite allowed set before any field is retrieved. Unknown/missing keys and wrong schema literals are invalid. No unknown field or kind is ignored or given a default.
- For a finite literal key/string comparison, check the exact string type and admissible literal length before inspecting/comparing its characters. There is no unbounded string normalization, case folding, numeric conversion, or diagnostic formatting step.
- Arrays MUST have their prescribed lengths checked before their elements are traversed. Shape validation is nonrecursive and follows only the fixed schema below. Unrecognized objects MUST NOT be formatted, coerced, iterated, or otherwise consulted through user-defined methods to produce a diagnostic.
- The caller MUST NOT mutate either argument during a call. Concurrency, hostile mutation during validation, and the earlier construction of Python objects are outside this in-memory call contract. Exact built-in containers do not make an in-process API a security sandbox.
- Aliasing in supplied objects does not establish identity or provenance. Shared edge-record lists still count once for every raw array occurrence. An alias is admissible only if all value/shape rules independently hold; recursive references cannot satisfy the scalar/member/record grammar and MUST be refused without recursive descent.
- Successful `analyze` output contains fresh dictionaries/lists with no mutable object shared with the caller's graph or a different call. Immutable scalar sharing is immaterial. Checker inputs remain unmodified. Returned object identity is not part of determinism.

## C03. Authoritative graph object

The graph has exactly four keys:

| Key | Exact value/type and rule |
|---|---|
| `schema` | String `item4.1-graph-v1`. |
| `direction` | String `producer_to_consumer`. This is mandatory and is not a selectable second orientation. |
| `n` | Exact integer in 0 through 4096 inclusive. The vertex set is precisely 0 through n−1; no other vertex declarations exist. |
| `edges` | Array of m raw edge records, with 0 ≤ m ≤ 65536. Each record is an exact array of length three: producer vertex u, consumer vertex v, kind. |

Both endpoints are exact integers in 0 through n−1. With n=0, `edges` MUST be empty. Each kind is an exact, case-sensitive string from this table:

| Kind string | Kind code, for ordering | Weight |
|---|---:|---:|
| `positive` | 0 | 0 |
| `negative` | 1 | 1 |
| `aggregate` | 2 | 1 |

`aggregate` means only **declared strict graph dependency**. It is not a theorem or adapter policy for a real aggregation language. All n vertices, all edge occurrences and all disconnected/unreachable components are authoritative. There is no root/query/entry point, pruning annotation, or inferred endpoint.

The raw `edges` length MUST be checked against 65536 **before sorting, deduplication, or graph-semantic work**. A duplicate flood above that bound is `INVALID_INPUT` even if only one distinct triple remains. These two numeric caps are explicit project protocol choices retained from the coordinator candidate, not measured support limits, physical resource limits, or assurances that a call will complete on a particular computer.

The entire graph MUST pass validation before either function can return a semantic result or interpret a supplied certificate. Validation MAY fail fast on a definite graph error; no unchecked suffix may coexist with a valid semantic return. In `check_certificate`, malformed graph input takes precedence over every certificate error and returns `INVALID_INPUT`.

## C04. Normalization, canonical edge identity and graph binding

Convert each admitted raw record to the logical triple (u,v,kind code). Sort all m triples lexicographically by u first, then v, then kind code. Collapse adjacent **identical triples only**. The resulting sorted array E has d entries and is indexed 0 through d−1. Its index is the **canonical edge ID**.

- Equal endpoint pairs with different kinds remain different canonical edges. In particular, positive and strict parallel edges, and negative and aggregate parallel edges, are all retained.
- A raw occurrence position is never an edge ID. No source-occurrence provenance survives exact-duplicate normalization. A canonical edge reference denotes the actual normalized triple, which MUST occur at least once in the fully validated raw graph.
- d ≤ m and d ≤ 3n² are mathematical consequences, not reasons to skip the independent raw cap.
- Every checker constructs and binds its own E to the supplied graph. The certificate supplies neither an edge table nor a quotient list nor a digest to trust instead.
- “Every original edge” in subsequent checks means **every validated raw occurrence**, including duplicates. It may be visited in sorted rather than original order. Normalized-edge work is explicitly distinguished from those all-original-edge scans.
- A certificate is instance-specific evidence for the graph passed to the checker, not an authenticated statement about some external program or earlier graph. Reuse on another graph succeeds only if all obligations against that graph independently hold.

Two admitted graph objects are normalization-equivalent exactly when they have the same n and E. Permuting raw edges and inserting/deleting exact duplicates preserve that relation, provided the resulting raw count remains within the cap.

## C05. Semantic proposition and output families

A stratification is a total nonnegative integer function L on all n vertices such that, for every original edge u→v of weight w,

**L(v) ≥ L(u) + w.**

The graph is stratifiable exactly when no strict edge has its endpoints inside the same SCC of the directed graph containing **all kinds** of edge. No negative-edge cancellation or positive-only SCC computation is allowed.

`analyze` returns either the exact string `INVALID_INPUT` or one of the certificate dictionaries defined in C06–C11. Certificates have verdict string `STRATIFIABLE` or `UNSTRATIFIABLE`; there is no third semantic certificate, partial certificate, or “best effort” opposite verdict.

For an admitted graph, `check_certificate` returns:

| Return string | Meaning |
|---|---|
| `VALID_STRATIFIABLE` | Every common and stratifiable-family obligation holds against the graph, including canonical semantic fields. |
| `VALID_UNSTRATIFIABLE` | Every common and unstratifiable-family obligation holds against the graph, including canonical semantic fields. |
| `INVALID_CERTIFICATE` | Any certificate type, schema, length, range, witness, canonicality, or verdict-family obligation fails. This establishes neither graph verdict. |
| `INVALID_INPUT` | The graph fails C02–C04 admission. No certificate is interpreted. |

In particular, an invalid success certificate MUST NOT be converted to `VALID_UNSTRATIFIABLE`; an invalid failure certificate MUST NOT be converted to `VALID_STRATIFIABLE`. The checker does not solve the graph afresh to rescue a bad certificate or downgrade a false canonicality claim into a valid local witness.

These are ordinary-return meanings, not a guarantee of runtime completion. Allocation failure, interruption, or an implementation/runtime fault is **not** a semantic graph result and MUST NOT be caught and translated into one of the two valid-verdict statuses. Such failures propagate without a certificate/valid-verdict return. This draft introduces no `VERIFICATION_UNAVAILABLE` return string and no broad exception-to-invalidity handler. The input-derived bounds and abstract algorithm termination arguments do not prove successful producer execution.

## C06. Exact certificate dictionary shapes

Every certificate has these eight common keys and no implicit fields:

| Common key | Type/shape |
|---|---|
| `schema` | Exact string `item4.1-certificate-v1`. |
| `verdict` | Exact string `STRATIFIABLE` or `UNSTRATIFIABLE`. |
| `components` | Array of k nonempty member arrays, as in C07. |
| `schedule` | Array of k component IDs, as in C08. |
| `out_parent` | Array of n canonical edge IDs or `None`, as in C07. |
| `out_depth` | Array of n exact integers, as in C07. |
| `in_parent` | Array of n canonical edge IDs or `None`, as in C07. |
| `in_depth` | Array of n exact integers, as in C07. |

For `STRATIFIABLE`, the only additional key is `levels`, an array of k exact integers. Thus the accepted-family dictionary has **exactly nine keys**.

For `UNSTRATIFIABLE`, the only additional keys are `strict_edge`, `return_path`, and `target_distances`, defined in C10–C11. Thus the rejected-family dictionary has **exactly eleven keys**. A `levels` field is forbidden in that family. Failure-specific keys are forbidden in the accepted family. Counters, raw counts, messages, annotations, producer discovery state, optional extras, and alternative encodings are forbidden in both families.

All arrays must be exact lists. All integer positions obey C02; `None` is permitted only in parent arrays at component roots. Lengths, finite literal strings, and bounded integers define the complete object grammar; arbitrary nested extension values are never traversed.

## C07. Canonical partition and exact SCC evidence — both verdicts

Let k be `len(components)`. For n=0, k MUST be zero. For n>0, 1 ≤ k ≤ n.

Before traversing member values, check each member array is an exact nonempty list with length at most n, and check the cumulative member lengths never exceed n. Their total MUST equal n. Then check:

1. Every member is an exact vertex integer in range. Members within each component are strictly increasing.
2. Every vertex occurs exactly once globally. No omissions, repetitions, foreign vertices, or empty blocks are allowed.
3. Components are ordered by their least member, strictly increasing. Component ID j is its array position 0 through k−1. Define its root r(j) to be that least member; no separately claimed root is accepted.
4. Derive `component_of[v]` from that checked partition. Never use a producer-only assignment as authoritative.

For each component C of size s and root r:

- At r, both parents MUST be `None` and both depths MUST be exactly integer zero.
- At every other vertex x, each parent MUST be an exact canonical edge ID in 0 through d−1, and its corresponding depth MUST be an exact integer in 1 through s−1.
- The out-parent of x MUST name an actual edge p→x with p in C. Its depth equation is `out_depth[x] = out_depth[p] + 1`.
- The in-parent of x MUST name an actual edge x→q with q in C. Its depth equation is `in_depth[x] = in_depth[q] + 1`.
- Parent endpoints and depths are read only after validating the reference and endpoint/component range. Both trees use the **same implicit root**. No other vertex may have depth zero or a missing parent.

There are exactly 2(n−k) non-null parent references. A singleton has two empty trees represented by its two null parent slots and two zero depths, regardless of self-loops. Tree edges may have any kind at this common-evidence stage.

Validate all four parent/depth array lengths and all their root/nonroot scalar types/ranges against the checked partition **before** using another vertex's depth in a parent equation. Then validate referenced edges/endpoints and compare the depth equations. A malicious parent may not cause arithmetic on a still-unvalidated depth value.

Following either parent relation strictly reduces bounded nonnegative depth and reaches its component root. The out-tree gives root-to-vertex paths; the in-tree gives vertex-to-root paths. Merely checking parent counts or real-edge membership is insufficient.

Validate `schedule` as a permutation of 0 through k−1 and let `rank[j]` be its inverse position. Then scan **every original raw edge occurrence**. Whenever it crosses C→D with C≠D, require `rank[C] < rank[D]` irrespective of edge kind. This scan is mandatory even if a supplied witness in one component already proves rejection. No supplied condensation can replace it.

The trees establish strong connectivity of every block; strictly increasing ranks on all boundary edges prevent splitting a true SCC. Together they establish the exact SCC partition. They do not need the producer's SCC routine.

## C08. Canonical producer-first schedule — both verdicts

In addition to C07's rank scan, `schedule` MUST equal the **lexicographically least topological schedule of canonical component IDs**. It is separate from semantic levels.

The defining process is the least-ready Kahn process on the verified partition:

1. Derive all cross-component edges directly from E. Count one indegree contribution for **each canonical cross edge ID**. Do not additionally deduplicate by component pair or endpoint pair.
2. Initially the ready set is exactly the components of indegree zero.
3. Repeatedly select the least ready component ID, append it, and remove exactly that component. For each of its canonical outgoing cross edges, decrement the target's remaining indegree once. Add a target to ready exactly on its transition to zero.
4. The supplied schedule must equal that entire sequence, with exactly k removals, no repeated/missing component, and no unprocessed suffix. The empty partition has the empty sequence.

Canonical duplicate multiplicity must agree between indegree initialization and removal. Different kinds on the same pair remain separate contributions; identical raw duplicates contribute only once after normalization. A rank-valid but non-least-ready schedule is `INVALID_CERTIFICATE`.

Removal uses **outgoing successor incidence grouped by the source component**. Incoming counts identify readiness, but a reverse-only adjacency scan is not a substitute for enumerating the removed component's outgoing edges. Original forward adjacency is tail→head; original reverse adjacency is head→tail and is used for transpose/in-tree/target-distance work, not silently as the scheduling direction.

An eventual checker MUST derive the ready process using its own graph and partition data. It MUST NOT call the producer's schedule builder. A comparison min-heap is the selected source-level organization; it adds a separately acknowledged k log(k+1) term.

## C09. Stratifiable-family obligations and least levels

The accepted family MUST satisfy C06–C08 and both of these additional conditions:

1. For **every original edge**, an internal edge has kind `positive`. Any internal `negative` or `aggregate` invalidates the certificate.
2. `levels[j]` is an exact integer in 0 through k−1 when k>0, and the array is empty when k=0. For every component D it equals

**h(D) = max({0} ∪ { h(C) + weight(e) : original e crosses C→D }).**

The checker MUST compare against the maximum over all original incoming cross edges, including duplicates and every retained kind, not merely check lower bounds or an existence-of-support equation. A component with no cross predecessor is forced to zero. Internal edges are excluded from the maximum because C07 has certified the SCC quotient and condition 1 has separately checked their weight.

These are the unique pointwise least nonnegative semantic levels. The induced vertex level of v is `levels[component_of[v]]`; no redundant vertex-level field is supplied. The maximum level is deliberately not a separate field and is not defined on the empty graph.

All level entries MUST have their scalar types/ranges validated before any predecessor-plus-weight addition is performed.

A positive DAG can have every level zero while its components still require producer-first precedence. The schedule MUST NOT be inferred by sorting levels or treated as a language evaluator.

## C10. Rejected-family strict-edge selection

The rejected family MUST satisfy C06–C08. It supplies:

- `strict_edge`: one exact canonical edge ID in 0 through d−1.
- `return_path`: an exact array of canonical edge IDs, subject to C11.
- `target_distances`: an exact array of bounded integers, subject to C11.

Scan E and find the least canonical edge ID whose kind is `negative` or `aggregate` and whose endpoints lie in the **same certified SCC**. Such an edge MUST exist, and `strict_edge` MUST equal its ID. Let it be u→v and let C be that SCC, of size s. The full partition/rank evidence concerns all components, not only C.

The selected edge has priority over return-path length. This is not a globally shortest forbidden cycle, not a minimum rotation of a cycle, and not a minimum vertex-sequence rule. A longer cycle containing an earlier offending edge is preferred over a shorter cycle containing a later offending edge.

## C11. Rejected-family shortest/lexicographic return evidence

`target_distances` has exactly s entries aligned with the increasing member list of C. No entry is supplied for any vertex outside C. The target is u, the **tail** of the selected strict edge. Let dC(x) denote the entry for x, not the canonical-edge count d.

Require all of the following:

1. dC(u) is exactly integer zero. For every x≠u in C, dC(x) is an exact integer in 1 through s−1.
2. For **every original edge** x→y internal to C, require `dC(x) ≤ 1 + dC(y)`. This distance is unweighted edge count; positive and strict kinds are treated alike here.
3. For every x≠u in C, at least one canonical internal outgoing edge x→y satisfies `dC(x) = 1 + dC(y)`. Compute `least_tight[x]` as the least canonical edge ID with that property. Existence is checked from the full graph, not from the supplied path alone.
4. `return_path` has exactly dC(v) entries and hence at most s−1. Its entries are exact canonical edge IDs in range. Starting at v, each successive entry MUST equal `least_tight[current_vertex]`, have that vertex as its tail, and advance to its head. The final vertex MUST be u. For u=v, the array MUST be empty; the other distance obligations still cover all of C.

The triangle inequalities lower-bound every path length by the claimed distance, and decreasing tight edges realize that length. Thus the distances are exact, including for vertices not used by the chosen return path. Every shortest return step is tight. Greedy least edge-ID choice therefore produces the lexicographically least canonical-edge-ID sequence among shortest return paths v→u. Its distance strictly decreases, so it is simple. Together with u→v it gives one forbidden simple cycle, with a one-edge strict self-loop when u=v.

No path between v and u can leave their true SCC and later return without including every intervening vertex in that SCC. Consequently restricting the distance checks to certified C does not overlook a shorter path through an outside component.

All s distance entries MUST have their scalar types/ranges validated before any triangle or tight-edge arithmetic; validate each path ID before retrieving its edge.

The certificate contains **one** selected strict edge and **one** return path, not a cycle enumeration, alternate-path list, or per-strict-edge reachability search.

## C12. Canonical fields versus auxiliary witness freedom

The checker validates canonicity of exactly these value fields:

- Both families: `components`, `schedule`, their implicit roots/component IDs, and the fixed schema/verdict family.
- Accepted family: `levels`.
- Rejected family: `strict_edge`, `return_path`, and the uniquely determined `target_distances` aligned to the selected component.

`out_parent`, `out_depth`, `in_parent`, and `in_depth` are **auxiliary witnesses**. The checker verifies all C07 relations but MUST NOT require one particular BFS, shortest tree, edge tie rule, or identical tree representation. Different valid trees/depths can certify the same canonical result. The checker therefore does not assert that every field of every valid certificate is unique.

The selected producer itself MUST make deterministic tree choices and, for any two admitted normalization-equivalent graphs, return structurally equal certificate values, including those auxiliary arrays. C13 fixes one such production policy. This promise is about the producer, not an extra tree-canonicality condition on all accepted untrusted witnesses.

No raw-occurrence count, attempted-validation counter, timing, resource report, or telemetry is embedded in a certificate. Raw counts can change under duplicate insertion without changing the normalized graph. The mathematical counters in `proof-and-cost.md` are separate review quantities and are not output fields. There is no promised byte serialization or unique certificate byte string.

Canonicality is relative to the authoritative dense vertex numbering and the kind-code order, not invariant under arbitrary vertex renaming or graph isomorphism. Such renaming preserves the underlying feasibility/SCC relation and appropriately mapped least levels, but may change the selected lexical schedule and rejection witness.

## C13. Selected producer organization and independence boundary

The candidate producer is a deterministic **iterative two-pass forward/transpose SCC algorithm**, with a complete traversal forest. It is selected over an iterative lowlink variant to keep suspended-traversal obligations explicit and to avoid introducing unnecessary lowlink invariants into this new contract. Its additional reverse-incidence storage is acknowledged rather than hidden.

Production policy:

1. Validate and normalize C02–C04 independently of checker code. Build forward and reverse incidence arrays of canonical edge IDs in increasing ID order.
2. First pass: start unexplored vertices in increasing vertex order. Use explicit suspended DFS frames containing a vertex and its next unprocessed outgoing incidence. Mark at discovery, advance the current frame's cursor before descent, and append each vertex to finishing order only on frame completion. No recursive calls or restarts from the beginning of an adjacency row.
3. Second pass: process vertices in decreasing first-pass finishing order. Search the transpose with an explicit work stack, marking on insertion, using increasing canonical incoming-edge ID scans. Assign each newly reached vertex once. Skip already assigned vertices. Every vertex belongs to a component, including isolated vertices.
4. Discard traversal-emission IDs as public identities. Build increasing member lists and component order by the canonical C07 rules. All subsequent fields use those public IDs.
5. Build out- and in-tree witnesses by FIFO breadth-first traversal from each component's least member, restricting discovery to that component, scanning its canonical outgoing/incoming IDs in increasing order, and marking vertices when enqueued. A first-discovery edge is the parent; depth is one plus its already discovered parent's depth. For an in-tree, the original edge is child→parent despite reversed traversal. These deterministic trees are not a checker-accepted uniqueness requirement.
6. Construct the C08 schedule. Decide feasibility from the full original-edge strict-internal scan. On success compute the C09 quotient levels in schedule order. On failure select C10's edge, perform one reverse unweighted breadth-first search inside C to target u, and derive C11's least-tight path. No cycle enumeration or all-pairs closure is part of the producer.

The checker MUST NOT call `analyze`, the producer SCC helper, any alternative SCC solver, its tree-builder, its schedule builder, or its level/distance/witness builder. It MUST NOT trust producer traversal state, component output order, quotient edges, or a graph digest. Its partition conclusion comes solely from checked coverage, two trees, and the full-original-edge rank scan. Its canonicity conclusions come from its separately derived ready set, recurrence maximum, offending-edge minimum, and distance/tight-edge checks.

Only immutable protocol constants/literals and standard-library/built-in primitives may be shared between producer and checker; **no project executable validation, normalization, graph-building, scheduling, or witness helper is shared** in this draft. Each function validates its own caller graph and constructs its own canonical edge table. This intentional separation reduces common-mode faults but is not proof that either future implementation is correct. No prior private/native source is an implementation input.

## C14. Bounded validation and review gate

The graph's fixed shape, n/m caps, exact built-in types, and finite literal keys bound admitted graph cardinalities. A certificate's component-member total is exactly n; each common vertex array has n entries; the schedule and accepted levels have k; rejected distances have s≤n and its path has at most s−1. Top-level dictionaries have exactly 9 or 11 fields. An oversized/malformed certificate is `INVALID_CERTIFICATE`, never a semantic verdict.

The checker MUST check these lengths/ranges before allocating from claimed sizes or indexing by claimed values. It MUST NOT recurse through arbitrary payloads, construct an n² reachability matrix, enumerate paths/cycles, search all edges separately for every parent reference, or run reachability separately for every strict edge. Direct checked canonical IDs provide parent/path edge membership.

All proposed valid numeric fields and intermediate additions are bounded by input-derived quantities described in `proof-and-cost.md`; source review must account for those values and empty cases. There is no measured time, memory-byte, allocation, stack, throughput, or supported-computer guarantee. Exceptional runtime failures remain nonsemantic under C05.

This revision's only next gate is **independent contract review followed by explicit coordinator selection/authorization**. No implementation, empirical oracle/test/mutation run, compiler/runtime action, performance experiment, native syntax stage, external publication, or repository operation is authorized by this contract draft. All empirical stages remain UNRUN. No selected graph proof or future source-language result releases any HOLD or completes item4.
