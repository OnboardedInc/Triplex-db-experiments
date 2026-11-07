# New item4 fixture and proof matrix

Prepared 2026-10-31 UTC. **Specifications only: no fixture implementation, compilation, test, or benchmark was run.** Rules below are mathematical notation; they do not settle a concrete negation token. Named input relations are illustrative views defined over the existing `triple/3`, not new base-relation declarations. Use the accepted typed literals and exact time conventions when translating them.

The oracle must be structurally independent as described in REPORT.md: tiny level-assignment enumeration, substitutions over supported tagged values, synchronous naive saturation, simple exact tuple comparison, and an explicit eager-filter fault layer. Do not remove relational bindings merely because a scalar operation on their values would fault. Neither shared SCC code nor a second call into the production evaluator is an independent oracle.

## A. Signed graph and whole-program diagnostics

| ID | Case | Required result / failure reason |
|---|---|---|
| G01 | Positive self-recursion `p(x) <- p(x)`, no seed | Valid positive SCC; empty result. Do not reject all cycles. |
| G02 | Mutual positive recursion with a finite seed in one relation | Valid; both relations saturate to the expected least fixed point. |
| G03 | `p(x) <- domain(x), not p(x)` | Reject negative self-dependency, even though `x` is positively bound. |
| G04 | `p(x) <- q(x)`; `q(x) <- domain(x), not p(x)` | Reject mixed positive/negative cycle. |
| G05 | `p(x) <- domain(x), not q(x)`; `q(x) <- domain(x), not p(x)` | Reject two-negative-edge cycle; do not import stable-model/even-cycle reasoning. |
| G06 | A relation pair has both positive and negative edges, plus a return path | Reject; edge deduplication must not erase the negative sign. |
| G07 | Positive mutually recursive component consumes an independent lower negative relation | Valid; the negative target is immutable input to that component. |
| G08 | Two independent branches have alternative valid topological orders | Same successful relation sets; tie-break does not change meaning. |
| G09 | Negative cycle occurs only in an unused relation, behind a false filter, or on empty input | Still reject the whole program. Data/query pruning cannot waive stratification. |
| G10 | `p(x) <- domain(x), p(x), not p(x)` | Reject syntactically despite contradictory body; do not add local/ground stratification. |
| G11 | Undefined positive versus undefined negative relation | Existing static undefined-relation error for both signs; never treat the negative target as empty. |
| G12 | A referenced relation's definition appears later textually | Resolve whole-program definitions before undefined/strata analysis; same outcome after rule permutation. |
| G13 | Relation identifier is the same but arity differs | Preserve current identifier/arity resolution and diagnostics; no accidental cross-arity edge. |
| G14 | RDF predicate position in `triple/3` is a variable | Ordinary term binding; Datalog graph still depends on the fixed `triple/3` relation. |
| G15 | Relation is named `eq`, `add`, or `div` | Existing ordinary relation semantics remain; do not reinterpret as a scalar builtin. |

## B. Range restriction and source order

| ID | Case | Required result / failure reason |
|---|---|---|
| B01 | `out(x) <- person(x), not denied(x)` and the body permutation with negation first | Both safe; same results. Membership waits until `x` is bound by positive input. |
| B02 | `out(x) <- not denied(x)` | Reject unbound head/negative variable according to documented static error precedence. |
| B03 | `out(x) <- [x = 7], not denied(x)` | Reject; scalar equality is not assignment. |
| B04 | `out(x) <- person(x), not assignment(x,y)` | Reject unbound negative `y`, even though it is not projected. |
| B05 | `out(x) <- person(x), [false_ground_comparison], not pair(x,y)` | Still reject `y`; a false scalar filter does not waive static safety. |
| B06 | Query supplies a constant for the head of B02 | Still reject the rule; query binding does not make it range restricted. |
| B07 | `out(x) <- person(x), not pair(x,x)` | Safe; check repeated positions with one exact bound value. |
| B08 | Negative atom contains constants and positively bound variables | Safe; all tuple positions are ground at the test. |
| B09 | A ground head and ground negative-only body | If final grammar admits it, exactly one empty-binding candidate and one Boolean membership decision; otherwise explicit unsupported syntax, not implicit domain enumeration. |
| B10 | Anonymous/unbound local variable inside a negative atom | Reject under smallest contract; introduce no hidden existential semantics. |
| B11 | `has_assignment(p) <- assignment(p,j)`; `unassigned(p) <- person(p), not has_assignment(p)` | Safe helper projection; answers people with no matching assignment. |
| B12 | Both person and job are positive domains and `not assignment(p,j)` | Missing pairs, not the same query as B11. Independent expected results must distinguish them. |

## C. Empty relations and completion

| ID | Case | Required result / failure reason |
|---|---|---|
| E01 | Defined lower relation empty; nonempty positive candidates | Every filter-passing candidate survives that one negative test. |
| E02 | Positive body relation empty | No complete bindings; no result even when the negative target is also empty. |
| E03 | All positive candidates match lower negative relation | Empty output, but the current eager scalar obligations still apply. |
| E04 | Defined unseeded positive-recursive lower relation is empty | Finish its fixed point; then use completed emptiness, not undefined-relation policy. |
| E05 | Lower recursive relation needs several rounds before a blocking tuple appears | Upper negative result must not be emitted from temporary earlier absence. |
| E06 | Several rules define the same negative target, one producing a late tuple | Wait for **all** defining rules and their positive recursion to complete. |
| E07 | Duplicate facts, duplicate derivations, or duplicate negative atoms | Set-valued result unchanged; physical counters may differ only under a documented contract. |

## D. Scalar fault compatibility — mandatory separate layer

Use actual existing bracket arithmetic and accepted numeric types. The descriptions below intentionally do not reproduce any prior project failure material.

| ID | Case | Required result / failure reason |
|---|---|---|
| F01 | Complete positive binding; a negative atom would remove it; a scalar filter divides by zero | Existing scalar failure remains observable. An early anti-join must not hide it. |
| F02 | Complete positive binding; one scalar filter is false; another scalar filter faults | Existing fault still observed because all filters are evaluated. Test both source orders where existing fault priority permits comparison. |
| F03 | Empty positive join; scalar filter would fault if evaluated | No scalar evaluation and no fault for nonexistent positive candidates, matching current seam. |
| F04 | Ground-only body; ground false filter and a faulting filter, plus a negative atom | Preserve one empty-binding candidate and all-filter fault behavior if grammar admits this form. |
| F05 | Complete candidate would project an already-existing head tuple; its filter faults | Do not move head deduplication before the existing filter barrier. |
| F06 | Negative target empty; filter faults | Empty-relation fast path cannot bypass the fault. |
| F07 | Two or more distinct runtime faults can arise in different candidates/rules | Preserve/document existing exact priority; do not assert rule-permutation-invariant selected errors without proof. Error presence and successful-set invariance are separate obligations. |
| F08 | A supported heterogeneous triple-object value binds a variable that arithmetic later cannot accept | Preserve the inherited scalar type error, including when a negative atom would discard the binding. The oracle must not exclude it as an allegedly ill-typed substitution. |

## E. Positive recursion with fixed negative input

| ID | Case | Required result / failure reason |
|---|---|---|
| R01 | Recursive relation uses fixed lower negative relation in each recursive rule | Saturate only allowed derivations; fixed lower negatives do not generate delta changes. |
| R02 | Nonlinear recursive body has two occurrences of a recursive relation | Cover new facts at either occurrence; a delta plan that checks only one side must fail this fixture. |
| R03 | Three recursive occurrences / mutual recursion with separate seeds | Cover every newly enabled binding, not only a handpicked delta position. |
| R04 | Recursive component has no seeds | Complete empty result; no infinite loop based only on repeated duplicate attempts. |
| R05 | Several rounds produce only duplicate heads before convergence | Correct complete fixed point; no bogus “new fact” from duplicate derivation. |
| R06 | Seed `a`, edges `a→b→c`, `blocked(b)`, output is `reachable(x), not blocked(x)` | Keep reachable `c` after endpoint exclusion. Pushing the exclusion into the traversal is a different query and must not replace this one. |
| R07 | One rule computes reachability avoiding blocked intermediates; another applies only endpoint exclusion | Independently expected outputs differ on R06's graph; both programs remain individually stratifiable. |

## F. Exact membership identity

Reuse existing accepted source-level value support, but derive expected membership independently; do not call the production tuple-key equality in the oracle.

| ID | Case | Required result / failure reason |
|---|---|---|
| I01 | BOOL versus BIGINT versus DOUBLE versus string representations with similar display values | No new cross-type cast or equality in negation. |
| I02 | Supported DOUBLE signed zero, NaNs/payloads, infinities, and exact bit boundaries | Use the exact existing identity policy. In particular do not silently substitute DuckDB SQL numeric equality. |
| I03 | Strings differing by binary content, embedded zero if supported, case, or Unicode normalization | Existing binary string policy, no normalization/collation introduced. |
| I04 | Supported STRUCT fields/typed contents with similar display text | Preserve exact existing structured identity and field/schema policy. |
| I05 | Repeated negative variable positions and constants in the same atom | Every position uses the same binding and exact identity; no accidental per-position wildcard. |
| I06 | Negatively consumed relation stores tuples with several different positive proofs | Membership depends on tuple existence, not proof count or insertion order. |
| I07 | Constants and derived values cross several strata | Reuse the same typed dictionary and exact existing tuple membership throughout; per-stratum re-interning must not miscompare IDs. |

## G. Historical corrections and fixed snapshot

Define expected logical snapshots first using the existing accepted interval/recorded conventions; do not invent new half-open boundaries or a correction representation here.

| ID | Case | Required result / failure reason |
|---|---|---|
| T01 | At recorded20 learn an assignment valid since10; query valid15 at recorded15 and25 | Unassigned before knowledge, not unassigned after knowledge, with positive person still present. |
| T02 | At recorded30 correct that assignment's valid end to12; query valid15 at recorded35 | Unassigned can become true again; not monotone across recorded snapshots. |
| T03 | Rerun earlier recorded snapshots after T02 | Earlier answers remain unchanged. |
| T04 | Query at accepted exact valid/recorded interval endpoints | Match existing item1 boundary rules bit-for-bit. |
| T05 | Future-recorded blocking fact exists physically but is excluded at requested recorded coordinate | It must not suppress the answer in that earlier snapshot. |
| T06 | Blocking relation is itself positively derived through multiple lower rounds | Derive it from the same `S(valid,recorded)`, complete it, then negate. |
| T07 | A writer changes history between loading one relation and another | Evaluation consumes one pinned snapshot; no mixed old-positive/new-negative view. This is future integration/runtime testing, not exercised here. |
| T08 | Same `(valid,recorded)` coordinates but changed underlying history/program | Do not reuse an unversioned cached result. A no-cache recomputation is sufficient for item4. |
| T09 | Recompute after lower blocker insertion, removal, and correction | Retract or restore upper results correctly; positive-only incremental accumulation is insufficient. |

## H. Determinism, oracle separation, and budget failures

| ID | Case | Required result / failure reason |
|---|---|---|
| O01 | Exhaustive tiny domains and small signed programs | SCC validator agrees with independent level-assignment existence, including all cycle sign patterns. |
| O02 | Exhaustive tiny EDB sets for accepted programs | Production output sets equal naive stratified oracle with ample budgets. |
| O03 | Rule/body permutations; several independent SCC orders | Successful output sets unchanged. Use semantic diagnostic signatures rather than moved source offsets. |
| O04 | Production exact-key helper deliberately not used by oracle | Independence is documented; expected edge cases are hand-checked against existing value contract. |
| O05 | Snapshot selector and negation given independently expected logical input sets | Negation can be isolated without sharing a faulty history selector. Also run separate end-to-end history fixtures later. |
| L01 | Limits at 0, exact required count, and one below for graph/snapshot/candidate/probe/fact/byte/output phases | Stable bounded failure or complete success as specified; no partial result accepted as a fixed point. |
| L02 | Negative index construction itself exceeds a byte/work budget | Fail before uncontrolled allocation; index work is not exempt. |
| L03 | Very deep graph / many atoms / many relation identifiers | Bound validation work and avoid unchecked recursive host-stack growth. |
| L04 | Duplicate-heavy positive candidates and large variable-sized keys | Charge attempted work and key bytes, not only unique output tuples. |
| L05 | Checked-counter addition/multiplication near implementation limits | No wraparound bypass or impossible preallocation from a mathematical domain bound. |
| L06 | Cancellation or failure partway through a stratum | No exposed successful partial upper result or stale completed marker. |
| L07 | Each stratum individually fits a budget but the combined evaluation exceeds it | Enforce one global aggregate allowance; do not reset counters to hide total work or storage. |

## Acceptance record to require later

For each future run, record the exact source/engine build, input/program identity, snapshot pair and source revision, selected native plan, limits, expected oracle result/error, observed result/error, complete versus partial execution, and pass/fail/unrun status. Performance measurements additionally need data distributions, key widths, negative match rate, recursive shape, index construction and memory, warm/cold boundaries, and separate parse/load/evaluation/output timings. No performance claim is established by this research matrix.
