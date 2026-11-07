# NEW item 4.1 draft v1 — independent contract review

## Disposition

**No blocking contract defect found in the exact reviewed five-file draft.** The selected witness relation, object grammar, canonicality rules, independent-checker boundary, and declared analytic organizations are mutually consistent under the stated no-concurrent-mutation precondition.

The candidate is ready for the **coordinator's contract-selection gate**. This review is not implementation approval or permission to execute anything. Code correctness, all empirical stages, and runtime availability/completion remain unestablished and **UNRUN**. Item 4 remains incomplete/untested; item 4.1 remains untested; all prior HOLD boundaries remain unchanged.

## Exact source scope

Read only these new frozen files under `.agent-logs/goal4_1-contract-draft/revision-001/`:

- `contract.md` — normative candidate, C01–C14.
- `proof-and-cost.md` — P01–P11.
- `review-notes.md`.
- `README.md`.
- `FREEZE.md`.

The linked `activity-log.md` and `source-only-manifest.md` were not opened because they were outside this review's five-file allowlist. No directory scan, older/private source, held payload, old native candidate/harness/controller/command/archive, admission/environment artifact, installed binary, or computer inventory was read. Source access consisted only of the coordinator-authorized literal read-only reads. The frozen research review and frozen draft were not edited.

## 1. Exact object shapes, types, caps and failure meanings

**C01–C06, C14: coherent.** The protocol is an in-memory object API, not a deferred JSON/parser contract. Exact built-in `dict`/`list`/`str` and exact `int` rules exclude subclass/iterator/coercion behavior, including booleans in every integer slot. Fixed finite literal lengths precede character comparisons; dictionary cardinalities precede key traversal; keys are validated before field retrieval. Unrecognized nested objects need no recursive descent or diagnostic formatting. Concurrent argument mutation and object construction before the call are explicitly outside the boundary; this is not misrepresented as an in-process security sandbox.

The graph has four keys, all vertices are exactly `0..n-1`, and all raw records have exactly three entries. The explicit `n<=4096` and raw-occurrence `m<=65536` caps are protocol policy, not measured resource or completion guarantees. The raw length is checked before normalization, so an over-cap duplicate flood remains invalid. An empty graph admits no edge and has exactly the empty accepted-family arrays.

The common certificate shape has eight keys; adding only `levels` gives nine, and adding only `strict_edge`, `return_path`, and `target_distances` gives eleven. Extra, missing, wrong-family, malformed, or oversized evidence is invalid evidence. The cumulative component-member cap is checked before member traversal; total membership is exactly n. Remaining lengths derive only from admitted n, checked k, or the validated selected component size s.

Graph invalidity takes precedence over certificate interpretation. A bad certificate does not become the opposite graph verdict. Exceptional runtime failures propagate without a valid-verdict return; they are not translated into semantic rejection. The four ordinary checker return strings and the absence of a separate unavailable return are a coherent selected design, not a total-runtime guarantee.

## 2. Scalar-before-cross-slot safety

**C02, C07, C09, C11: the requested ordering is explicit and sufficient as a source-review obligation.**

1. Admit graph types/lengths/ranges and every raw record before interpreting a certificate.
2. Validate the complete partition coverage/order and derive `component_of` from it.
3. Check all four parent/depth array lengths and every root/nonroot scalar type/range before any equation reads another vertex's depth. Then validate canonical references and endpoint/component relationships before depth arithmetic.
4. Validate schedule IDs/permutation before building or consulting its inverse rank. C02's range-before-index rule applies to every ID.
5. Validate every level scalar before predecessor-plus-weight arithmetic.
6. Validate every selected-component distance scalar before any triangle/tight-edge arithmetic; validate every path/reference ID before edge retrieval.

This closes the dangerous one-slot-at-a-time pattern in which a valid child reference might expose an unvalidated parent depth, predecessor level, or neighbor distance. The same obligation remains mandatory in any future implementation; prose alone has not checked code.

## 3. Authoritative input and normalized identities

**C03–C05: sound and unambiguous.** The whole graph is authoritative, including isolated and disconnected vertices and every occurrence. Each function validates independently and creates its own sorted edge table. A certificate provides no edge table, graph digest, producer assignment, or quotient list to substitute for the input.

Only identical `(producer, consumer, kind-code)` triples collapse. Parallel positive/negative/aggregate kinds survive and have stable edge IDs in explicit `(u,v,0/1/2)` order. Raw occurrence positions never become IDs. Complete raw-edge checks and normalized-edge algorithms are separately identified, so normalization equivalence does not excuse skipping raw admission or mandatory raw scans. All chosen semantic/canonical values can remain invariant under admitted raw permutation and exact-duplicate changes.

## 4. Exact SCCs and complete graph quantification

**C07 and P03: sound and complete.** Canonical component/member order and least-member roots establish public identities, not connectivity by themselves. Actual internal parent edges with both orientations and strictly decreasing bounded depth establish root-to-all and all-to-root reachability. They prohibit false merges. A permutation rank increasing on every original raw cross-block edge prohibits mutual reachability across blocks and therefore false splits. Singleton trees correctly use null parents and integer-zero depths, even when self-loops exist.

The combination establishes exact SCCs without a producer SCC call. It permits one-way paths between different components. It does not import the excluded stronger/no-path claim from the short source paper. The full rank scan remains mandatory for rejected-family certificates and is not short-circuited by a local obstruction.

## 5. Schedule and least levels

**C08–C09 and P04–P05: correct and distinct.** The least-ready Kahn rule is the unique lexicographically least topological sequence of canonical component IDs. Canonical cross-edge IDs contribute consistently to both indegree initialization and successor decrements; exact raw duplicates do not. The selected comparison heap and outgoing successor incidence make its cost/direction explicit. This corrects the research table's earlier reverse-adjacency wording ambiguity.

An arbitrary rank-valid order does not pass the canonical schedule check. The checker derives its own ready process rather than calling the producer's builder. Rejected graphs also have a valid acyclic SCC quotient, so requiring a canonical global schedule in that family is mathematically consistent, albeit stronger than a local rejection proof requires.

On acceptance, every raw internal edge must be positive. The complete incoming maximum on the certified acyclic quotient uniquely forces pointwise least nonnegative levels. Raw duplicate contributions do not change that maximum. All levels are bounded by `k-1`; empty k has no maximum. Circular vertex equations or level-based scheduling are explicitly disallowed as substitutes.

## 6. Canonical rejection and one shortest/lex return path

**C10–C11 and P06: sound.** The first selection is the least normalized strict internal edge, not a globally shortest cycle. Exact SCC evidence plus a full E scan makes this minimum independently checkable across every component.

For selected `u->v`, the target is u and the return starts at v. Distances are aligned to the canonical selected-component member order. The target alone has zero; every other label is positive and bounded. All-original-internal-edge triangle inequalities make each label no greater than any return-path length, while one tight outgoing edge per non-target realizes its label by strict descent. Consequently every distance, including off-path labels, is uniquely exact. Minimum tight canonical edge IDs then give the lexicographically least sequence among shortest returns. A shortest return cannot leave the true SCC and later return, so the component restriction misses no shortcut.

The strict self-loop case correctly has an empty return even if its SCC has other vertices; those other distances remain checked. Exactly one path is supplied, with length forced to the starting distance. No all-cycles, all-shortest-paths, or per-strict-edge reachability enumeration is needed.

## 7. Canonical values versus arbitrary valid tree evidence

**C12–C13: consistent.** Components, schedule, accepted levels, and rejected selected edge/path/distances are canonical value claims. Auxiliary parents/depths need only satisfy the tree relation and need not be shortest or match the producer's BFS. Hence alternative valid trees are admitted without weakening semantic canonicity.

The selected producer nevertheless chooses deterministic BFS trees using stable E incidence, so its entire returned values can be structurally equal for normalization-equivalent inputs. This does not imply that all checker-accepted witnesses are equal. Fresh output containers, no caller mutation, no mutable sharing across caller graph or separate calls, and the exclusion of identity from determinism are compatible. Internal scalar sharing is immaterial.

No raw count or telemetry is embedded, eliminating a duplicate-invariance contradiction. No serialized byte representation is promised. ID-dependent lexical policies are explicitly not claimed invariant under arbitrary graph renaming.

## 8. Iterative producer and checker independence

**C13 and P07: the selected source organization has the needed abstract invariants.** A complete forward DFS forest with suspended cursors/completion events produces finishing order. For every true cross-SCC edge A->B, the maximum finishing position of A exceeds B's. Processing decreasing order in the transpose therefore cannot absorb a different unassigned predecessor SCC; all of the current SCC is reachable. Mark-on-insertion and monotonic cursors give one discovery/processing assignment and bounded incidence passes. Isolated vertices are covered.

Canonical public IDs replace traversal IDs before later fields are constructed. Tree and distance BFS use the correct reversed-edge orientations and mark-on-enqueue. The selected algorithm is iterative two-pass rather than lowlink-based, as allowed by the candidate scope; no lowlink correctness is silently assumed.

The checker is prohibited from any SCC solver and from producer admission, normalization, graph-building, schedule, tree, level, distance, or witness helpers. It derives its conclusions from the final witness obligations and independently bound graph data. Sharing only immutable protocol literals and standard primitives is coherent, although it does not prove future code independent/correct. Actual source review will still be required.

## 9. Proof/cost consistency and limits

**P08–P10: no arithmetic or asymptotic contradiction found.** Distinct n/m/d/k and raw-versus-canonical scan counts are retained. Each mandatory scan is counted at its own stage; SCC linear passes do not hide normalization sorting or heap costs. The successful-path conservative bound `O(n + m log(m+1) + k log(k+1))` and storage `O(n+m+d)` follow for the stated organization/access model. The fixed-count dictionary keys do not require an unbounded hash-table complexity premise; graph normalization is comparison-sort based.

Accepted scalar/null array slots equal `5n+2k<=7n`. Rejected slots equal `5n+k+s+p+1<=7n+k<=8n`, since `p<=s-1` and `s<=n`; rejection is impossible for n=0. Parents number `2(n-k)`. All valid reference/depth/level/distance bounds and possible temporary `+1` values are accounted for. Enormous preconstructed malformed objects and caller allocation costs are explicitly not claimed physically free.

Future source audit must ensure the selected incidence/cursor organizations are actually followed: no O(n) array reset per component, no restarted row scans, no separate edge search per parent, and no repeated reachability for strict edges. These are implementation watchpoints, **not defects in this prose contract**, which admits the bounded organizations and states the corresponding obligations.

The four P11 illustrations are logically consistent with the selected contract by paper reasoning. No module, checker, oracle, fixture, mutation, counter, test, compiler, runtime, benchmark, or empirical acceptance check was produced or run.

## Blocking issues, residual evidence and gate

- Blocking contract defects found: **none**.
- New required user questions/approval requests raised by this review: **none**.
- Required next decision: coordinator may select or decline this exact candidate after considering the independent review. This reviewer does not cross that gate or infer code authority.
- Missing evidence: all actual implementation correctness, independent-oracle agreement, alternative-valid-tree acceptance, hostile-object/malformed-certificate behavior, mutation coverage, and runtime/performance evidence remain UNRUN/unestablished.
- Pending calls at review completion: **none**. No external state was written; only this new review directory was authored.

No result here releases item 3/item 4 holds, reconstructs stopped work, substitutes for held native syntax, or completes item 4.
