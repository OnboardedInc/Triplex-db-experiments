# Trace-constrained stratified negation: performance research

Revision 001 · 2026-10-31 · **SOURCE-ONLY; ALL EMPIRICAL EXECUTION UNRUN**

## Bottom line

The published candidate already implements a useful database optimization: every fully bound negative tuple is tested against the target relation's existing exact `seen` set. All negative occurrences share that authoritative set; a second negative index is not needed for the current access pattern. The remaining opportunity under the selected contract is principally **making the same ordered operations cheaper**, not suppressing them.

The most concrete trace-preserving source-level opportunity found here is outside the negative operator: seek past an old-row prefix in an **already selected** positive delta-index list. Those old rows currently return before charging or binding anything. The same charged suffix can be visited in the same order without a cache, second negative index, new join order, or weaker validation. This is a hypothesis and a source-level equivalence argument, not an implementation or speed result.

Large gains from predicate pushdown, disjoint delta variants, negative-result caching, magic sets, worklist scheduling, composite-index planning, or worst-case-optimal joins are plausible database research directions. They are **not transparent changes to today's selected operational contract**. Some preserve ordinary set answers; some could retain numerical counter values under a deliberately changed accounting definition. That does not authorize them or preserve the current actual-probe audit and selected failure prefix.

Finally, `work = P + E + N` is an exact **logical admission model**, not an allocator census, CPU-operation count, wall-time promise, or hash-robustness guarantee.

## 1. Scope and evidence boundary

This is new independent primary-source research. It does not retry, rephrase, repackage, or depend on held syntax, checkpoint/controller, metadata, or backup work. No source or contract was changed. No compiler, preprocessor, linker, runtime, database, test, benchmark, project import, Codex task, user computer, Git operation, Page, PR, or publication was used. Only new research files in this revision directory are written.

Local implementation references below use these abbreviations:

- **Core:** `temporal-roadmap-item04-20261031/candidate-001/engine/src/temporal_core.cpp`.
- **Expression:** the same `src/temporal_expression.hpp`.
- **Result/API:** the same `src/temporal_stratified_core.hpp`.
- **IR:** the same `src/temporal_plan_ir_v2.hpp`.
- **Iteration:** `temporal-roadmap-item04-20261031/candidate-001/engine/ITERATION-04.md`.

Those five files are the complete local implementation allowlist inspected here. Their source fingerprints and the research inventory are in `MANIFEST.md`. The complete dictionary and host carrier implementations are outside that allowlist. Exact typed interning, retained inactive-carrier validation, and host diagnostic/FP obligations are therefore **contract premises**, not claims of a new independent audit of those excluded implementations. The allowed Core does independently show validation before temporal visibility filtering (659–671), tag-sensitive `Value` equality (1554–1564), canonical finite float construction (1529–1532), and the native failure-poisoning wrapper (1611–1625).

External evidence is limited to original research papers and official implementation/standard documentation. Paper results motivate questions; no published speedup, optimality bound, or vector size is transferred to this candidate.

## 2. The observable object is more than the answer set

Ordinary relational equivalence asks whether two implementations return the same set. Here a sufficient, deliberately conservative criterion is stronger: preserve the reached ordered prefix of component/wave selection, positive candidate attempts, eager scalar evaluation, negative precharge and actual exact probes, head admission, and merges, together with errors and FP boundaries. The current contract also exports nine metrics, not just rows (Result/API 12–22; Core 924–938).

Not every internal ordering detail is a separately exported trace. It still matters when it determines which fallible operation or budget boundary is reached first. Equality of final successful rows and counters alone is insufficient to establish equality at smaller selected budgets.

### Implementation obligations relevant to optimization

1. **Whole-program validation and completion.** Signed safety checks are separate whole-program passes, including answer-unreachable rules; the SCC plan contains all relations and rules (Core 509–650). Each IDB component completes before its consumers; negative targets must be completed in a strictly lower stratum (713–717, 865–923). EDB component zero is marked complete without an IDB wave.
2. **Synchronous waves.** Every IDB component has a base wave. Later waves consider every eligible internal positive body occurrence separately, with that occurrence restricted to delta and every other positive occurrence using the full relation (730–732, 889–903). Newly pending tuples are unavailable until the wave's merge. Changed waves continue until a final no-change verification wave; the selected round limit can fail before it. `component_rounds` is a global sum across components despite the limit's name; its check occurs before each wave (883–886). A nonrecursive component whose base adds rows therefore still consumes its final verification wave; an empty base can finish immediately.
3. **Positive attempts are a physical-plan-sensitive logical metric.** Greedy selection uses the smallest available single-column candidate list and source-occurrence ties, with lazy indexes. Each candidate row is charged before term matching, including rejected constants/repeated variables; old rows excluded by the chosen delta restriction return before that charge (759–805).
4. **Scalar evaluation is complete-candidate and eager.** Only a complete positive relational candidate reaches filters. All filters run in source-filter order even after false, unless an error terminates evaluation. Head deduplication is later, so it cannot suppress a scalar fault (680–698, 736–750).
5. **One negative group, then every occurrence.** Only candidates passing all filters reach the group. Its entire `sum(1 + arity)` is admitted before any membership test. Every negative occurrence—including a repeat or an empty target—is then checked against the exact `seen` set; one successful membership does not short-circuit later occurrences (701–728).
6. **Typed and failure behavior remain binding.** Integer checked arithmetic, per-node finite binary64 results, division-by-zero and specified underflow/overflow/type errors, string comparison charges, admission order, no partial result, and poisoning after an entered failed add/run all remain relevant (Expression 29–150; Core 652–750, 1611–1625). Host envelope and fresh-FP obligations are described by Iteration 81–138; this research neither weakens them nor audits excluded host code.

Seminaive fixed-point theory explains why delta evaluation avoids old deductions, and stratification supplies monotone fixed points once negative inputs are fixed. Those are set-semantics foundations, not a proof that a different seminaive schedule preserves this operational trace. See [Arntzenius and Krishnaswami, POPL 2020, §§2 and 4](https://www.cl.cam.ac.uk/~nk480/seminaive-datafun.pdf). Official [Soufflé rules documentation](https://souffle-lang.github.io/rules) likewise requires stratifiable negation and positive grounding, but does not impose this candidate's counters or eager fault discipline.

## 3. Transparent cost derivation

### 3.1 Notation and exact successful-run identities

For rule `r`, let:

- `p_r` be its number of positive occurrences and `m_r` its negative occurrences; their sum is at most 16.
- `a_rj` be the arity of negative occurrence `j`, between 1 and 8.
- `M_r` be the number of complete positive relational candidates reached over all scheduled evaluations, counting repeated delta-variant witnesses.
- `K_r <= M_r` be those candidates for which all filters return true.
- `L_r` be the total postfix-node count of the rule's filters, at most 256.
- `S_r(c)` be the sum of `ceil((left_utf8_bytes + right_utf8_bytes)/64)` for string comparisons reached on candidate `c`.
- `P`, `E`, `N`, and `C` denote `positive_attempts`, `expression_work`, `negative_work`, and `negative_checks`.

For a successful invocation:

```text
E = sum_r sum_(c in M_r) [L_r + S_r(c)]
N = sum_r K_r * q_r,       q_r = sum_(j=1..m_r) (1 + a_rj)
C = sum_r K_r * m_r
work = P + E + N
2*C <= N <= 9*C
```

The string surcharge is reached at the comparison, whereas the complete filter node count is charged **before** evaluating its nodes (Expression 97–99, 126–150). Thus these are successful-run identities, not a license to charge a failing prefix as though it completed. With the published maximum `max_work = 50,000,000`, a successful run has at most 25,000,000 negative checks; that is a logical count, not a practical execution-time bound. A group has at most 144 negative units. A rule with no negatives contributes zero `N` and `C`, even though the helper still has nonzero physical overhead.

At a fixed complete-candidate stream, negative hit rate does not reduce `N` or `C`: all occurrences are probed. It can change pending heads and therefore later recursive streams, so this statement is **not** a claim that whole-run costs are selectivity-independent. Head duplication also does not avoid the preceding filters or negative group.

Failure ordering is significant:

- An exhausted positive unit reports the positive work-limit error before term matching (672–678).
- Insufficient filter-node or string-comparison units report `TD_E_EXPR_LIMIT` at that reached charge, potentially before an arithmetic error (682–690; Expression 97, 128).
- Insufficient whole negative-group units report `TD_E_NEG_LIMIT` before any of its probes or per-occurrence checks (707–717).
- Fact reservation and component-round failures occur at their own later/earlier positions, not at a common end-of-query budget check.

### 3.2 Why current delta variants can duplicate useful work

Consider a successful relational witness in a later wave that uses current delta rows at `k >= 1` internal positive **occurrences**. The current union of one-delta/all-other-full variants enumerates that witness `k` times, at most the rule's number of internal positive occurrences. Consequently, its complete-candidate filters and, if they pass, negative probes also repeat `k` times. This is an occurrence/witness statement, not an assertion that positive prefix-attempt cost `P` scales by exactly `k`; greedy prefix sharing differs by variant.

A conventional disjoint partition can instead designate the first current-delta occurrence, restricting preceding internal occurrences to their old sets and leaving later ones full. Each new witness then belongs to exactly one variant. That can reduce duplicate candidate evaluation while preserving the monotone set fixed point. It violates today's explicit all-other-full schedule and changes `M_r`, ordinarily `E/N/C`, and selected work-budget outcomes. It belongs to a deliberately revised contract, not a transparent cleanup. General incremental fixed-point formulations in [DBSP, PVLDB 2023, §§5–6](https://www.vldb.org/pvldb/vol16/p1601-budiu.pdf) are useful future design foundations; they do not preserve this source's billing by themselves.

### 3.3 Expected hash cost versus worst case

All negative arguments are bound. The key consists of up to eight dictionary IDs; no per-probe string copy or dictionary insertion appears in this path (Core 718–726). Hashing/equality are over these inline tuples (35–69). For adequately dispersed hashing and controlled load, a successful or unsuccessful exact lookup is expected constant time for fixed arity. The key-construction/membership portion is then expected `O(sum_probes arity) = O(N)`. This does not include the unbilled per-call helper overhead when a rule has no negatives (`m_r=0`, hence `N=0`).

That expectation has assumptions. The [C++ unordered-container requirements](https://eel.is/c++draft/unord.req) permit linear worst-case lookup in container size. A useful explicit model is:

```text
T_negative = O(sum_probes a_probe * (1 + b_probe))
```

where `b_probe` represents the examined candidate/bucket-chain work of that implementation, not an exported counter. Under a well-dispersed bucket model with load `lambda`, its expectation is `O(1 + lambda)`; in the worst case it can grow with target cardinality `n`. A loose bound is therefore `O(sum_probes a_probe * (1 + n_target))`, or `O(N * (1 + F))` with total facts `F <= 100,000`. Neither this loose operation bound nor the logical cap establishes wall time.

The simple deterministic `TupleHash` combiner is visible in source. This research supplies **no collision-resistance proof, measured distribution, vulnerability finding, exploit construction, or claim that a replacement is faster**. Reserving buckets or reducing load factor can help some ordinary workloads but does not repair arbitrary hash concentration or give worst-case constant lookup. Stronger mixing costs CPU too and needs evidence on benign actual key distributions.

### 3.4 Costs not billed as `P + E + N`

- Lazy positive-index construction scans the relation on its first lookup for a column, and later inserts update that column's row-ID postings (98–123). Across used columns, posting construction/maintenance is expected `O(A*F)` map/vector work for maximum arity `A=8`, assuming expected map operations. It is not separately charged.
- At every reached join prefix the greedy selector examines remaining atoms and bound columns. If `V` is the number of `evaluate` calls and `D` its reached join-prefix decisions, `D <= V + P`; map-lookup count is at most `O(A*B*(V+P))`, with `B=16`, before collision and initial-build costs. A root with an empty candidate list can consume selection work but zero `P`.
- A selected delta-index list can contain old row IDs. Their skip cost is uncharged. Let `S` be the total skipped IDs; current enumeration costs `O(S)` in addition to charged candidates.
- Each component wave constructs `Pending` containers and performs relation/rule bookkeeping. `V` itself is bounded by the source's finite rules/body/wave limits, but it is not an exported work component.
- Head/pending deduplication, duplicate insertion lookups, tuple allocation/copying, rehashes, dictionary/input processing, sorting/decoding/output admission, FP guards, and host vector/arena operations all have costs outside those three units.

Memory is similarly distinct. Accumulated and pending logical fact reservations are bounded by `max_facts`, but tuples exist in row storage and exact sets, with extra per-column postings, maps, buckets, dictionary storage, and output representations. `max_facts`, logical dictionary bytes, 16 MiB native output admission, and 32 MiB callback admission are not RSS limits. Blindly reserving the maximum in every relation can allocate for many more buckets than actual facts across the whole invocation.

## 4. Safe/conditional/revision matrix

**A** means a source-derived trace-preserving possibility, not approved code or measured correctness. **B** means ordinary logical equivalence may be feasible but full error equivalence is unresolved. **C** requires an intentional contract/mechanism/accounting revision. **D** can change even ordinary typed/fallible semantics. No entry authorizes implementation.

| Technique | Ordinary set result under stated conditions | Current trace, counters, and selected budgets | Classification / disposition |
|---|---|---|---|
| Seek past the old prefix of an already selected positive delta-index vector | Same | Same charged suffix, order, filters, probes, and failures; no new allocation needed | **A**, strongest narrow candidate; proof below. Do not change estimates or the chosen atom. |
| Faithful stratified-local arity specialization / scalar dispatch simplification | Same if every check remains | Can keep identical keys, hash values, probe calls, charges, and order | **A** in principle; preserve exact operation semantics. Do not edit legacy hash/visit paths or add a cache. |
| Replace `std::function` recursion or dynamically allocated scratch with a faithful state machine/stack scratch | Same on non-allocation-failing paths | Can retain logical visits, but allocation/failure timing and cleanup may change | **B**; not certified to preserve all errors. |
| Reserve/tune load factor of `Relation::seen` only | Same exact membership | Successful logical counts/order can remain; new/earlier allocation failures are possible | **B**; `seen` is not iterated here. No blanket reserve, legacy edit, or permission implied. |
| Reserve positive column lookup maps only, leaving each posting vector unchanged | Same | Cardinalities and row order can remain, but allocation ordering changes | **B**; distinguish this from changing the access path. |
| Replace the single authoritative exact `seen` container with a denser/robuster representation | Possible with identical exact key equality and one actual probe per occurrence | Potentially same logical events; allocator, failure, hash-scope, and mechanism-pinning review still needed | **B/C**, future representation review, not a second index or an approved substitution today. |
| Change shared `TupleHash`, reserve `Pending`, sort pending tuples, or replace pending set iteration | Usually same successful set fixed point | Can alter next-wave row/candidate order and which fault/limit is reached first; not necessarily successful endpoint counts | **C** for any changed selected prefix. Do not call it automatically safe because final rows are sorted. |
| Composite positive indexes, intersect postings, new greedy estimates, join reordering, WCOJ/trie joins | Often same set under total pure predicates | Usually changes attempted candidate stream `P`, scalar/probe order, and budget outcomes | **C**; requires a consciously revised positive-work model or stronger explicit equivalence evidence for a restricted case. |
| Disjoint nonlinear seminaive variants / dedup complete candidates | Same monotone fixed point | Removes currently repeated filter/probe occurrences; changes scheduling/billing | **C**. |
| Early head seen/pending deduplication | Same set only if suppressed scalar evaluations cannot fault | Can hide required eager faults and omit `E/N/C` | **C/D**. |
| Filter pushdown, reordering, false short-circuit, constant folding | Same set only for appropriate total pure filters | Can add or hide faults, change error phase/order, omit charges, or evaluate before complete relational binding | **C/D**; even a mathematical tautology is not a budget-neutral fold. |
| Negative pushdown or stop after first negative hit | Same set when binders and completed targets suffice | Omits required occurrence probes and may suppress scalar faults; changes actual-check audit | **C**, sometimes **D** for incomplete/fallible inputs. |
| Repeated-negative dedup, negative-result cache, empty-target shortcut, Bloom-filter shortcut, second negative index | Can preserve set results with a sound design | Could retain numerical `N/C` only under a deliberately different logical-occurrence accounting; skips today's required exact `seen` probes / violates explicit no-cache/no-second-index mechanism | **C**, not mathematical impossibility. A Bloom positive is not proof of presence and is **D** if used as one. |
| Batch/parallel execution of candidates, filters, rules, or components | Can preserve sets in suitable pure programs | May expose a later fault before an earlier budget failure, reorder reservation, or weaken completion/wave discipline | **C** unless a restricted, non-speculative transformation preserves the full reached prefix. |
| Worklist/immediate propagation; omit final no-change/base waves | Often same positive fixed point | Changes global component rounds, pending visibility, and selected round/work failures | **C**. |
| Magic sets / answer-reachability pruning / omit unused SCCs | May preserve answer rows | Changes derived facts and rounds; can omit mandatory faults, work and fact-limit failures | **C/D** under this whole-program contract. |
| Incremental cross-call arrangements / reuse a prior temporal cut | Possible only with correct change and retraction semantics | Violates invocation-local ownership/no cross-call state; must retain validation and fresh authority/FP boundaries | **C**, not an authorized continuation of this evaluator. |
| Numeric coercion, fingerprint-only equality, relaxed FP/reassociation/FMA/FTZ, skip invisible or inactive-field validation | Not generally equivalent | Changes typed keys, per-node faults, admission, or guards | **D**; not a performance-only change. |

### 4.1 Proof sketch for the delta-index prefix seek

`lookup` initially appends row IDs in increasing order; `Relation::add` only appends larger row IDs to an already built posting vector (Core 109–122). More precisely, on a successful add, the previous `rows.size()` becomes the new row ID, the tuple is appended, and that ID is appended to each built column's matching posting vector. Duplicate adds append nothing. There are no row removals. An interrupted add poisons the invocation rather than permitting continued evaluation of a partially admitted state. A synchronous evaluation does not merge rows while it joins. Thus a selected posting vector is strictly ascending throughout a valid evaluation.

When the chosen atom is the designated delta atom, current `match(row_id)` immediately returns for `row_id < delta_begin` **before** charge, tuple access, binding, filter, probe, or allocation (783–785). The ineligible elements are exactly a prefix. Integer binary search for the first eligible row ID, followed by unchanged suffix iteration, therefore removes only those side-effect-free returns. With `o` old elements, `k` eligible elements and total list length `L=o+k`, eligibility-location plus enumeration overhead changes from `O(o+k)` to `O(log L+k)`. Equivalently, with `n` denoting total length, it is `O(n)` versus `O(log n+k)`. This excludes the unchanged greedy selector, positive matching, and recursive descendant work; it is not an `O(log n+k)` theorem for the whole query. `P/E/N/C` and their reached prefix remain the same.

Conditions are important: retain current greedy estimates, strict-less-than ties, lazy index availability, and chosen list; do not use the suffix size to replan; do not reorder the suffix or skip any charged mismatch. If the current estimator does not select an index, this particular optimization has no opportunity. It is not a claim of a large common-case gain, and changing the shared legacy path is outside scope.

**Documentation-only future pseudocode; not applied to application source, compiled, or executed:**

```text
if (chosen_index) {
    if constexpr (Stratified) {          // new signed path only
        auto it = chosen_index->begin();
        const auto end = chosen_index->end();
        if (chosen == delta_atom)
            it = lower_bound(it, end, r.delta_begin);
        for (; it != end; ++it)
            match(*it);                  // existing match body, unchanged
    } else {
        for (auto row_id : *chosen_index) match(row_id);  // existing legacy body unchanged
    }
} else {
    [existing non-indexed scan body unchanged]
}
```

The current type is `const vector<size_t>*`, so iterators are random access and both stored row IDs and `delta_begin` are `size_t`; no narrowing or dictionary-ID conversion is involved. A standard integer binary search requires no heap allocation or FP work. The vector remains stable while it is iterated: index construction is complete for that column, relation rows do not change until the later merge, and lookups do not append tuples. No iterator from a different vector or invalidated unordered-map iterator is used. On non-delta selected atoms the range remains the complete vector. On delta atoms with no eligible elements the new loop performs no `match`, just as every original call would have returned before its charge. This is a source-derived proof obligation checklist, **not** syntax/native verification or authorization to make the change.

### 4.2 Representation versus mechanism

The standard explicitly allows rehashing to change unordered iteration order, and defines reserve in terms of rehash ([C++ unordered-container requirements](https://eel.is/c++draft/unord.req)). In this source `Relation::seen` is queried/inserted but not iterated; `Pending` **is** iterated into `rows` (Core 908–917). This is why seen-only bucket tuning and pending tuning have different trace risks. Full allocation-error equivalence remains unproved in either case.

Official [Swiss-table design notes](https://abseil.io/about/design/swisstables) describe dense hash metadata and SIMD candidate filtering **inside one lookup**, followed by exact equality. That motivates a future single-authoritative-container layout hypothesis, not a cache or permission to adopt a dependency. Its metadata is not a proof that an arbitrary existing hash function has suitable distribution, or that its allocator/failure behavior matches this candidate.

For partially bound positive joins, [Subotić et al., PVLDB 2018](https://psubotic.github.io/papers/p141-subotic.pdf) select lexicographic indexes covering primitive equality searches. Official [Soufflé relation documentation](https://souffle-lang.github.io/relations) describes multiple relation representations and workload-sensitive choices. Here negative keys are fully bound, so that work chiefly informs future positive access paths or an authoritative-container redesign, not a reason to add today's prohibited second negative index.

## 5. Future research directions that explicitly need a revised contract

### Arrangements and anti-joins

Official [Differential Dataflow arrangement source](https://docs.rs/differential-dataflow/latest/src/differential_dataflow/operators/arrange/arrangement.rs.html) shares an indexed representation among readers and requires readers to use completed logical times. This supports two conceptual lessons: build once/share when legal, and establish completeness before interpreting absence. The present evaluator already shares a completed lower relation's `seen` set within the invocation. A maintained cross-invocation arrangement would additionally need temporal history-cut identity, invalidation/retractions, admission and lifetime rules; none is authorized here.

Its official [anti-join API](https://docs.rs/differential-dataflow/latest/differential_dataflow/collection/struct.Collection.html#method.antijoin) also makes multiplicity conditions explicit: general difference weights do not automatically yield set absence. A future differential design must preserve zero/one membership, not treat an arbitrary bag-weight operator as a drop-in replacement.

### Vectorization and compilation

[MonetDB/X100, CIDR 2005](https://ir.cwi.nl/pub/16497/16497B.pdf) motivates cache-sized vector primitives that amortize interpretation; [Neumann, PVLDB 2011](https://www.vldb.org/pvldb/vol4/p539-neumann.pdf) motivates local, predictable compiled dataflow. Those are architectural motivations only. Candidate-major eager faults and budget admission constrain a straightforward operator-major batch: evaluating filter 1 for many candidates before filter 2 of the first can change the selected failure. SIMD inside an exact integer-key membership implementation is different from speculative cross-candidate scalar evaluation. No JIT, compiler, new dependency, or batch implementation is proposed for execution now.

### Multiway joins

[Ngo, Porat, Ré and Rudra, PODS 2012](https://cs.stanford.edu/~chrismre/papers/paper49.Ngo.pdf) and [Veldhuizen, ICDT 2014](https://openproceedings.org/2014/conf/icdt/Veldhuizen14.pdf) establish worst-case-optimal join approaches, the latter up to a logarithmic factor under its stated index model. These motivate cyclic/multiway workload comparisons, not a theorem about the current greedy nested joins. Their advantage comes from changing which combinations are examined—the very quantity that current `P` and selected work budgets expose. They are a future positive-planning/accounting design, not a trace-safe anti-join micro-optimization.

## 6. Separately authorized future measurement specification — NOT RUN

This section specifies questions and evidence **only if the existing separately governed candidate/capacity/campaign authorization is later granted**. It is not a new gate, permission route, test artifact, execution packet, or request to reopen held work. No commands, runnable fixtures, project imports, or instrumentation have been created.

### Questions and workload dimensions

| Question | Source-only workload specification | Evidence sought after separate authorization |
|---|---|---|
| Are probes or upstream candidates dominant? | Fixed nonrecursive upper candidate stream; vary completed lower-target size, arity 1/3/8, and ordinary hit/miss mixture; include empty targets | All nine metrics; phase costs; actual probe count agrees with `C`; no inference of cheapness from `N` alone. |
| How expensive is repeated full-group probing? | Repeat the same negative occurrence versus distinct targets; respect at most 16 total relational occurrences and positive grounding | At fixed `K`, verify `C=K*m` and `N=K*sum(1+a)` including repeats/hits/empty sets. |
| Does the prefix seek have a real opportunity? | Ordinary recursive data where an index is selected by the unchanged estimator and its vector has a substantial old-row prefix plus a suffix | Unchanged ordered charged suffix/metrics/errors; skipped-ID count and seek overhead; no conclusion if no such list is selected. |
| Are greedy/index and hash costs hidden by billing? | Benign varied key cardinality/skew and relation widths; no collision exploit construction | Authorized diagnostic observations of bucket/probe/equality lengths, index construction, postings, allocations/rehashes; report instrumentation overhead separately. |
| How much nonlinear delta overlap occurs? | Linear versus mutually/nonlinearly recursive components with multiple internal positive occurrences | Per-witness delta-position multiplicity distribution; same current schedule, not a disjoint-variant implementation. |
| How do eager scalars interact with negation? | No filters, all true, early false/later false, early false/later fault, a fault on a candidate rejected by negation, duplicate heads; string length sums around 64-byte charging boundaries | Exact reached scalar charges and selected diagnostic; negative group reached only after every scalar returns true. |
| Are mandatory completion costs visible? | Empty/nonrecursive/recursive IDB components, multiple strata, answer-unused lower components containing ordinary faults, final no-change waves | Global round totals, derived facts, selected error; no reachability pruning. |
| Are typed/validation/FP obligations retained? | Tag-distinct equal-looking values; canonical signed zero and finite/subnormal float cases; invalid invisible temporal rows and retained inactive-carrier cases from the existing contract | Same typed rows or exact applicable failure/phase; same fresh-FP checks and failure poisoning; no repair or widened authority. |

All generated sizes must remain within **joint** input/fact/dictionary/work/output limits; a lower relation near the fact cap cannot be combined with arbitrary extra IDB/EDB sizes as though each relation had its own cap. No source program text or test input is generated by this document.

### Equivalence evidence before interpreting performance

For any later authorized alternative, compare sorted typed rows and all nine metrics on successful cases. For errors, compare the applicable phase/native diagnostic, selected work/fact/round boundary, absence of partial result, and poisoned-instance behavior. Sweep selected limits immediately below, at, and above known symbolic charge boundaries—especially a filter-node precharge, string surcharge, whole negative-group precharge, fact reservation, and final verification wave. Do not redefine a skipped probe as an actual `negative_check` merely to make numbers match.

A separately authorized diagnostic trace could record component/wave, rule and delta occurrence, chosen positive position and row, reached scalar/charge, negative occurrence/key/exact membership call, head reservation and merge. Such instrumentation would itself need review; it is **not present** here. Source reading alone does not determine a particular unordered pending iteration order for an unbuilt binary.

### Measurement interpretation

Use fresh engine instances for independent invocations; the API is single-run and poisoned on failure. Repeated warm runs may warm CPU caches but must not introduce semantic cross-call caching. Distinguish input/compile, index construction, evaluation, materialization/host encoding and FP-guard costs where authorized observations permit. Keep minimally instrumented end-to-end latency observations separate from diagnostic builds and report distributions and workload definitions, not a single borrowed speedup.

For a trace-preserving candidate, a lower `P/E/N/C` is a warning, not a success criterion. For a future deliberately revised contract, report both the revised logical model and physical observations explicitly; do not compare unlike work units as though they were invariant. No current result establishes that the candidate compiles, passes a test, has acceptable throughput/latency, or completes store-integrated item 4.

## 7. Conclusions with confidence labels

- **Direct source fact:** Current negative membership reuses exact `Relation::seen`; all occurrences run after successful eager scalar evaluation and a full-group precharge.
- **Derived identity:** On successful runs, `N=sum K_r*sum(1+a)`, `C=sum K_r*m_r`, and `2C<=N<=9C`.
- **Derived conditional complexity:** Expected `O(N)` negative processing assumes adequate hash distribution/load and fixed arity; standard-permitted worst-case lookup and non-billed costs prevent a wall-time interpretation of `work`.
- **Source-level equivalence argument:** Seeking the old prefix of an already selected delta posting vector preserves its entire charged suffix and needs no new allocation. Performance benefit is unknown.
- **Unresolved representation hypothesis:** Seen-only bucket/layout/hash robustness work might retain the logical trace but is not certified to preserve allocation errors, source-mechanism pins, or legacy isolation. No dependency/source change is authorized.
- **Future contract research:** Disjoint seminaive variants, pushdown/caching/reordering/arrangements/WCOJ can be worth investigating only as explicitly distinguished semantics/accounting choices, not hidden substitutions.
- **Verification state:** Every empirical stage is **UNRUN**. No physical timing, memory, throughput, syntax, linkage, native correctness, host binding, or store-integration claim follows from this report.
