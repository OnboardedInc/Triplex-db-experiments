# Item 5 — aggregate semantics research and conservative alternatives

Revision 001 • Research synthesis dated 2026-10-31 UTC

## Status and scope

This is a **source-only research report, not a selected contract, implementation, execution packet, or acceptance result**. Roadmap item 5 concerns count, min, max, and checked sum with explicit grouping, duplicate/set behavior, empty results, output tags, and overflow policy. Initial aggregates may consume only completed lower-stratum relations, with recursive aggregate cycles rejected.

Dependencies 1–4 are not assumed satisfied: items 3 and 4 remain unaccepted. Item 4's incomplete/untested status, held syntax, and stopped checkpoints are unchanged. This report does not reactivate or incorporate them. All compiler, native, database, test, and benchmark execution is **UNRUN**.

The user's instruction to avoid collecting, saving, or transmitting computer-environment snapshots/details is a continuing boundary. This revision contains project semantics, primary-source citations, synthetic examples, and analytic arguments only. There is no computer inventory, external publication, Codex task, Git-object mutation, or remote repository mutation.

## Findings that materially affect a future contract

1. A set of **source tuples** is not a set of **distinct measure values**. Two distinct facts with measure 7 may legitimately yield count 2 and sum 14. Repeated proofs of the same fact must not turn that into count 3. An independent SQL route must deduplicate the chosen contribution tuples, not automatically apply DISTINCT to the measure.
2. An exact aggregate result represented as an ordinary output fact is generally nonmonotone under input growth. Count can increase numerically while its old output tuple must disappear. Min/max lattice theories do not make arbitrary append-only scalar-result rules safe.
3. Empty observed groups, an explicitly global empty group, and externally anchored empty groups are different constructions. SQL's global empty group is not universal Datalog practice.
4. With the current four value tags and no logical NULL, empty min/max require an explicit absence/error/status design. An arbitrary numeric or string sentinel is not a transparent compatibility choice.
5. “Checked sum” is incomplete without specifying whether overflow means an out-of-range **prefix** or an out-of-range **final mathematical total**. Those differ for mixed-sign inputs.
6. Ordinary floating SQL SUM and compensated FSUM are not interchangeable bitwise oracles for a deterministic set language.
7. The narrow alternative of aggregating one already-materialized relation provides a useful fact-count bound. An input-history-row cap alone does not bound a join's distinct witnesses.
8. Adding aggregate dependency kinds or binders to existing inspect-only IR2 would be a versioned semantic change, even if its public execution surface remains closed.

## 1. Primary evidence, with limits on what it establishes

### 1.1 Classical aggregate stratification and the empty-global fork

Mumick, Pirahesh, and Ramakrishnan distinguish set and multiset predicates, make grouping dependencies explicit, and give aggregate-stratified programs a layer-by-layer semantics. Their grouping construction uses an observed-key set. Crucially, §3.2's footnote contrasts its empty, zero-key result with SQL's single global empty group. That is direct evidence that “no keys” alone does not settle empty behavior. Their wider recursion and optimization results are not authority to admit recursive aggregates here. [The Magic of Duplicates and Aggregates, §§3.1–3.3, pp. 270–272](https://www.vldb.org/conf/1990/P264.PDF)

Pelov, Denecker, and Bruynooghe define a conservative predicate-level stratification: positive body predicates may be at the head's level; predicates under negation or an aggregate must be strictly lower. With lower levels fixed, each remaining stratum has a monotone immediate-consequence operator. The paper also studies richer three-valued/stable semantics, but those are distinct choices, not consequences of the simple stratified fragment. [Well-founded and Stable Semantics of Logic Programs with Aggregates, §5.2](https://arxiv.org/pdf/cs/0509024)

Ross and Sagiv's journal abstract discusses monotonic/pseudo-monotonic aggregates over complete-lattice domains rather than requiring all aggregate inputs already determined. Only its publisher abstract was accessible in this pass; no full-paper theorem is asserted from that access. It is evidence of a broader research direction, not a proof that current scalar values form a suitable recursive-aggregate lattice. [Monotonic Aggregation in Deductive Databases, JCSS 54(1), 1997](https://www.sciencedirect.com/science/article/pii/S0022000097914537)

### 1.2 Set identity is more than a measure

Mohapatra and Genesereth explicitly construct sets containing a measure plus discriminating variables. Their example has two tuples with the same numeric measure but different discriminators; count and sum retain both contributions. Existentially removing the discriminator gives different results. This cleanly separates duplicate proofs, distinct contributor tuples, and distinct measures. Their first-class set language is not proposed for adoption. [Aggregation in Datalog Under Set Semantics, §2, Examples 2–3](https://web.stanford.edu/~abhijeet/papers/aggregates.pdf)

ASP-Core-2 supplies another precise comparison: aggregate input is a set of tuples; count uses tuple cardinality while sum uses each tuple's first integer component. It also defines special empty extrema and separate local/global variable safety. Its infinities, term ordering, noninteger treatment, and answer-set semantics are **not compatible defaults** for this project's finite four-tag domain. [ASP-Core-2 Input Language Format, §§3 and 5](https://arxiv.org/pdf/1911.04326)

### 1.3 Implemented-system scoping and completion

Soufflé documents aggregates over stable relations. Its aggregate reference describes a failed/unsatisfied containing body for a minimum over no matches, rejects exporting a local aggregate witness, and rejects nested aggregates. These illustrate a viable null-free partial-result design and why an arg-min witness is not merely another aggregate result variable. [Soufflé tutorial, Aggregation](https://souffle-lang.github.io/tutorial), [Soufflé aggregate reference](https://souffle-lang.github.io/aggregates)

PostgreSQL distinguishes row aggregation from DISTINCT-expression aggregation and distinguishes aggregate evaluation levels in correlated queries. It also warns that a surrounding CASE does not necessarily shield an aggregate's input expression from errors. These are reasons to specify contribution projection, binding scope, and error order explicitly rather than infer them from surface placement. [PostgreSQL 18, §4.2.7 and §4.2.14](https://www.postgresql.org/docs/18/sql-expressions.html)

### 1.4 SQL is a comparison route, not an automatic specification

PostgreSQL explicitly emits a global group without GROUP BY and an empty grouping-set row even on empty input. Its general aggregates return NULL on empty input except count, and sum widens integer return types. Those choices cannot silently enter a four-tag, null-free language. [PostgreSQL 18, §7.2.4](https://www.postgresql.org/docs/18/queries-table-expressions.html), [§9.21](https://www.postgresql.org/docs/18/functions-aggregate.html)

DuckDB 2.0 documents empty-group NULLs except count, DISTINCT over argument values, and order sensitivity for floating SUM and Kahan FSUM. This documents comparison hazards; it is not evidence that the exact project pin has executed any proposed route. [DuckDB 2.0 aggregate reference](https://duckdb.org/docs/2.0/sql/functions/aggregates)

SQLite's integer SUM can fail on an overflowing intermediate computation; introducing floating input changes its result/overflow behavior. Its documentation also describes imprecision and possible nonfinite floating results. Such implicit changes of arithmetic domain would violate this project's strict-tag premise. [SQLite built-in aggregates, SUM/TOTAL](https://www.sqlite.org/lang_aggfunc.html)

### 1.5 Optimization has premises

Sudarshan and Ramakrishnan study min/max relevance optimizations while explicitly assuming aggregate stratification. Ramakrishnan, Ross, Srivastava, and Sudarshan separately distinguish insertion, deletion, replacement, and monotonic replacement; their incremental bounds assume appropriate arithmetic and valid updates. Neither paper proves that bounded checked machine-integer addition or rounded floating addition is an associative reduction. [Aggregation and Relevance, §2](https://www.vldb.org/conf/1991/P501.PDF), [Efficient Incremental Evaluation, §2](https://www.cse.iitb.ac.in/~sudarsha/Pubs-dir/aggregate-eval-jicslp94.pdf)

Berkeley's reproducible-summation work offers an order-independent accumulator and explicitly separates reproducibility concerns from ordinary floating evaluation order. It is a possible future implementation direction, not a license to call any compensated sum exact or to import its reported performance into this project. [Efficient Reproducible Floating Point Summation and BLAS, UCB/EECS-2016-121](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2016/EECS-2016-121.html)

## 2. Published project evidence — static facts only

Only the five specifically authorized published project files were inspected, read-only, at commit 691ccf65eb0bee686c1919bfa893d1027db30162. No local held source or stopped artifact was read.

- The value header declares string, Boolean, i64, and f64, with no implicit cross-tag conversion. Its comparator is tag rank followed by per-tag ordering. The core rejects nonfinite f64 payloads and canonicalizes zero. A comparator intended for deterministic result ordering does **not** by itself select mixed-tag aggregate semantics. [Value header]([PRIVATE_REFERENCE_REMOVED]), [core, lines 1529–1588]([PRIVATE_REFERENCE_REMOVED])
- The parser uses rule-local ?variables, 1–8-arity relations, relational atoms, and comparison filters. Its signed validation grounds heads/negatives/filters through positive relational occurrences. Existing filters do not become assignment binders merely because equality appears in them. [Core, lines 174–212 and 415–555]([PRIVATE_REFERENCE_REMOVED])
- Visible input becomes a set of logical triples after the half-open valid/transaction cut. Head candidates are deduplicated in accumulated and pending sets. The positive engine can revisit a logical candidate through multiple delta variants, which is exactly why counting evaluation visits would be wrong. [Core, lines 655–670 and 730–807]([PRIVATE_REFERENCE_REMOVED])
- The candidate signed planner computes predicate SCCs over all rules, rejects an internal negative edge, assigns strata, and checks predecessor completion. Negative evaluation separately checks strict lower-stratum completion. These are useful extension seams, not accepted runtime evidence. [Core, lines 556–650, 701–728, 865–920]([PRIVATE_REFERENCE_REMOVED])
- IR2 owns its values and rule-local IDs; its dependency model has only a negative Boolean, and its body/filter structures have no aggregate scope or contribution descriptor. It is inspect-only, not a caller-IR execution interface. [IR2 header]([PRIVATE_REFERENCE_REMOVED])
- The stratified result declares nine existing metrics. The iteration note explicitly labels the source candidate unbuilt and unaccepted and distinguishes language, artifact, IR, SQL, and C API identifiers. No acceptance state changes follow from reading it. [Stratified header]([PRIVATE_REFERENCE_REMOVED]), [Iteration 04 status]([PRIVATE_REFERENCE_REMOVED])

## 3. Candidate families — no branch selected

| Family | Contribution source | Main benefit | Additional obligations |
|---|---|---|---|
| N1: one completed relation | Exactly one already-materialized lower-stratum relation; each full source tuple contributes once | Clear set identity; contribution count bounded by source facts; simple scope and SQL route | Explicit source fact cap, key list, measure column, empty mode, output tags, arithmetic policy |
| N2: projected contributors | One completed relation with explicit contributor projection | Convenient distinct-item/distinct-measure counts | Projection deduplication; identity/measure functional consistency; separate limits and accounting |
| N3: aggregate subquery | Join/negation/filter body with explicit local scope and contribution projection | Expressive correlated summaries | Witness cardinality, local binders, nested dependency extraction, error timing, projection semantics, dedicated admission |
| N4: anchored groups | A separately completed group-domain relation plus contributors | Zero counts for known keys without data | Group-domain identity; missing versus empty; no phantom outer-join count; status/partial extrema |
| N5: recursive aggregates | Lattice, stable, well-founded, or other richer recursion semantics | More recursive algorithms | A separate language/theory/termination/numeric proof and acceptance campaign; excluded from the requested initial boundary |

N1 is the smallest branch to audit, not a selection. Users can first derive a lower relation using existing positive joins/filters/stratified negation, let that relation complete and deduplicate, then aggregate it. This avoids designing a second join-body language inside the aggregate.

### 3.1 N1 contribution semantics in precise mathematical notation

Let R be the finite completed relation after the temporal cut and all of its defining rules. Let K be an explicitly ordered list of source columns and m one explicitly chosen measure column for min/max/sum. For an observed key g:

- C(g) = { r in R | projection_K(r) = g }.
- count(g) = cardinality of C(g).
- min/max inspect the m field of every r in C(g).
- sum adds the m field of every r in C(g), under a separately chosen numeric contract.

C(g) is a **set of full records**, even though multiple records can contain the same measure. No proof multiplicity or hidden bag relation is introduced.

For R = {("a","i1",7), ("a","i2",7)}, grouping by column 1 and measuring column 3 gives count 2 and mathematical sum 14. Adding another proof of ("a","i1",7) changes nothing. If a user first derives P(g,v) by dropping the item column, P contains only ("a",7), so count 1 and sum 7 are deliberate consequences of a different source relation.

This also handles joins transparently. A completed Joined(g,item,value) loses witness columns and deduplicates them. Joined(g,item,value,witness) retains distinct witnesses as distinct source facts. The aggregate does not guess which was intended.

An identity projection that omits a varying measure is dangerous: if the same proposed identity maps to both 7 and 8, it does not determine a scalar contribution. Either include the measure in the contribution tuple, require/prove a functional dependency, or reject ambiguity. N1 avoids this extra identity problem.

### 3.2 What “completed lower” must mean

A relation can be empty and complete. It is not complete merely because its current delta is empty before its base/verification work, because no answer has yet requested it, or because it is earlier in textual source order. It is complete only when its producing component's prescribed completion condition has been established for this invocation and history cut.

A positive recursive lower relation is not forbidden just because it is recursive. For example, compute Reach to its positive fixed point, complete it, then aggregate Reach in a strictly higher stratum. What is forbidden is a cycle in which the aggregate result can influence the relation being aggregated.

N1 would make the aggregate an explicit stage producing fixed result facts from R. It must not attach a scalar accumulator to repeated semi-naive rule visits and treat those visits as new contributions.

## 4. Grouping, binding, and grammar choices

The following are semantic shapes, not approved syntax or executable programs.

### 4.1 Group variables and local variables

A dedicated aggregate declaration can make these roles explicit:

- source relation and source arity;
- ordered group-key column list;
- zero or one measure column per aggregate operator;
- result variable/field;
- grouping-domain mode;
- expected tag/numeric policy where needed.

The source tuple supplies all key and measure bindings. Only group keys and aggregate results may escape the aggregate stage. Non-key source variables are local; they are not witnesses returned by min/max. A count need not invent a measure expression.

If syntax instead uses a source atom with variables, every group variable and measure variable must occur in that atom; an outer correlation must have an independent positive binder; negative occurrences and old comparison filters do not bind it. Aggregate results must not occur in their own source/key expressions. An aggregate binder is a new scoped capability, not a change to existing filter equality.

A minimum age does not bind a person's name. To retrieve all tied names, first compute the minimum in one relation, then positively join People(name,age) to that completed minimum relation. “Choose an arbitrary witness” would be a new nondeterministic arg-min feature.

### 4.2 Minimal grammar alternatives

| Shape | Advantage | Risk to resolve |
|---|---|---|
| Dedicated aggregate-defined relation | Clear stage boundary, key list, exclusive source and producer | New declaration grammar; define whether target may have any other producer |
| New body item over one named relation | Fits rule composition; can return a scalar binder | Interaction with head safety, positive recursion in outer rule, repeated correlation work |
| General braced aggregate body | Familiar from other logic languages | Much larger scope and contribution language; not equivalent to N1 |

For an initial dedicated form, one conservative option is one exclusive aggregate producer per target relation. Multiple ordinary rules can still populate the lower source relation, where set union handles duplicate derivations. Otherwise specify whether two aggregate definitions of the same target mean set union of independently aggregated outputs or one combined group; silently merging them is not sound.

Do not reserve words such as count/min/max globally if they are currently legal predicate identifiers. Use contextual syntax or a new language entry point. Do not silently introduce anonymous-variable behavior that the old parser did not have. If zero keys are allowed, this is an internal empty key tuple, not permission for public zero-arity relations; a global scalar result can remain arity 1. Preserve the current 1–8 head-arity rule unless separately changed.

### 4.3 Three group domains

1. **Observed keys:** G = projection_K(R). If R is empty, G is empty and no group/result rows exist.
2. **Explicit global:** G = {unit}, independent of R. This creates a real empty group when R is empty. The contract must say so; an empty key vector must not accidentally select this mode.
3. **Anchored keys:** G comes from a separate completed relation. An anchor can exist with C(g) empty. This is a separate extension, not ordinary observed grouping.

A useful conservative grammar choice is to require a distinct global marker rather than interpret a missing key list. Whether observed grouping by an empty list is allowed or rejected remains OPEN.

## 5. Empty results without adding NULL

| Aggregate / group condition | Conservative alternatives | Important consequence |
|---|---|---|
| count over a present empty group | i64 0 | Its group must actually exist; observed absent keys still have no row |
| sum over a present empty group | Typed zero; no result; or a declared error | Generic per-group type inference cannot infer an empty sum's tag |
| min/max over a present empty group | No result relation tuple; whole-invocation error; or explicit status protocol | No unannounced NULL, NaN, infinity, or ordinary-value sentinel |
| No observed group | No tuple | Do not manufacture absent keys from unrelated values |

Separate relations are a particularly simple **alternative**: Group(g) records existing anchors, Count(g,n) is total on them, and Min(g,v) exists only when a measure exists. This retains four value tags and avoids a fabricated scalar. It is not a selected API.

If one output row combines count, min, max, and sum, partial extrema create a further decision: omit the whole row, reject the request, split outputs, or use a specified status carrier. Omission would lose an otherwise meaningful zero count. A Boolean status plus an ignored placeholder is possible but is a real protocol with validation rules, not a hidden NULL. Adding an option/NULL logical tag would require a separately versioned domain change.

Neither smallest/largest i64 nor finite f64 nor a convenient string is transparently “empty”: each is an ordinary representable value or has unsuitable ordering behavior. Any chosen sentinel must be explicit and distinguishable to consumers.

## 6. Output tags and mixed-type policy

The existing carrier can transport different tags in different rows. That does not select a numeric promotion policy.

| Operator | Conservative type alternatives | Required rejection/edge cases |
|---|---|---|
| count full tuples | i64 result, with checked range | No conversion of measures; count source facts of any validated tag |
| min/max | Homogeneous group, result same tag; or explicit total tagged order | Define Boolean and string order; reject mixed group if homogeneous; never infer arithmetic order from presentation sort |
| checked sum | i64-only initially; or separate explicitly typed i64/f64 forms | Reject Boolean/string measures; reject i64/f64 mixing unless a separately approved explicit conversion exists |
| empty typed sum | Statically declared result tag | Do not infer i64 versus f64 from an absent first row |

Homogeneous **per group** permits a string-valued group and an i64-valued group in one result relation. Homogeneous **per relation/invocation** is a different, more restrictive rule. Explicit operator-tag declarations make empty behavior and output typing easier to inspect, but are new grammar.

The current result comparator could support total-tag-order min/max as another coherent option. Its result for {i64(2), f64(1.0)} would follow tag rank rather than numeric magnitude. If adopted, that must be named and documented, not described as ordinary numeric min/max.

Splitting a mixed group into separate tag groups changes the requested grouping keys. Filtering out nonnumeric contributors silently changes the source set. Neither is a substitute for an explicit mixed-type error policy.

For strings, bytewise UTF-8 order, locale collation, case folding, and Unicode normalization are distinct. A SQL oracle must preserve the selected one. For f64, finite payload checks and canonical zero must happen consistently with source value equality.

## 7. Checked integer sum — independent analytic derivations

Let L = −2^63 and U = 2^63−1.

### I1: checked i64 prefix fold

Every addition must remain in [L,U]. For values [U,1,−1], that order fails, while [U,−1,1] succeeds with U. Therefore this policy is not permutation-invariant on a set unless an order is part of the contract, or all permutations are required safe. A hash table's incidental iteration order is not a contract.

A canonical full-tuple ordering makes behavior deterministic, but the result/error then depends on a specified fold order. Different source projections can alter ordering. Parallel partial reductions cannot be assumed equivalent.

### I2: exact total, final i64 range check

Compute the mathematical total S, then emit i64(S) iff L ≤ S ≤ U; otherwise fail atomically. This gives permutation invariance and accepts [U,1,−1] as U. It does not imply a wider public value tag.

If each group has at most N ≤ 2^64−1 i64 contributors, exact signed-128 state suffices for every prefix:

- N·L ≥ −(2^64−1)·2^63 = −2^127 + 2^63;
- N·U ≤ (2^64−1)·(2^63−1) < 2^127.

Thus every prefix is inside signed-128 range. This is an algebraic bound, **not an execution or availability claim**. A future implementation still needs proven wide arithmetic, the contributor cap, and admission/accounting for its intermediate state. An input-row cap does not establish N for an arbitrary aggregate join body.

### I3: restricted-domain prefix policy

Restrict sum to nonnegative i64 contributors (or separately to nonpositive ones), and check i64 additions. With one sign, an out-of-range total cannot be rescued by cancellation, so prefix failure agrees with final-range failure. This is a smaller language and needs explicit validation; it must not be inferred from observed data or used as a general signed-sum promise.

### Excluded silent alternatives

Wrapping, saturating, converting to f64 after overflow, returning a stringified big integer, or accepting a host's widened scalar output each changes the value contract. None follows from “checked sum.”

Count similarly needs a specified public integer tag and range check. It may be provably bounded below i64 max under a future selected fact cap; the proof must use the relevant source/contributor bound, not a convenient input-history bound.

## 8. Floating sum — separate decision, not an incidental overload

- **F0:** defer f64 sum, while still supporting f64 count/min/max. This is a legitimate narrow alternative if the roadmap's checked-sum requirement is explicitly typed i64.
- **F1:** deterministic full-source-tuple ordered fold, checking every intermediate value for finiteness and canonicalizing zero. Reproducible under the specified evaluation semantics, but not exact, generally not associative, and sensitive to cancellation and the chosen order.
- **F2:** exact binary total followed by one specified binary64 rounding and final finite-range check. Order independent; requires a separately reviewed accumulator/rounding proof and an independent exact oracle.
- **F3:** a specified reproducible/binned algorithm. Reproducibility and approximation/error guarantees must be stated separately; do not call it exact just because its order is stable.

For finite f64 values [10^16,1,−10^16], a conventional left fold in that order can give 0, while the exact total is 1. For [Fmax,Fmax,−Fmax], an intermediate-finite policy can fail although the exact final total is Fmax. These are mathematical comparison examples, not observed project outputs.

Binary64 inputs are multiples of 2^−1074. This permits an exact-integer accumulation model with an explicit count-dependent bit bound; implementing it is outside this revision. Underflow, subnormal outputs, zero sign, rounding, and final versus intermediate nonfiniteness all need explicit policy. The lexical-literal underflow rule must not accidentally become the aggregate-result rule.

A SQL SUM/FSUM route is a useful diagnostic comparison for F1/F3 but not automatically a bitwise exact oracle for F2. A selected contract must say whether equality is exact bits, an independently proved exact result, or a stated error relation; “close enough” cannot be an unstated acceptance rule.

## 9. Dependency graph, barriers, and diagnostics

A conservative new graph can distinguish ordinary-positive, negative, and aggregate-source dependencies. Every predicate referenced inside an aggregate is a strict dependency on the aggregate result producer, regardless of whether that source occurrence was positive or negative inside a future subquery.

Proposed check, not implemented:

1. Include every rule/declaration, including answer-unreachable ones.
2. Form predicate SCCs using all dependencies, ignoring signs only for SCC construction.
3. Reject any negative or aggregate edge internal to an SCC.
4. Topologically schedule SCCs; ordinary edges permit the same stratum, strict edges require a greater stratum.
5. Require actual source completion as well as a strictly lower stratum before aggregation. Fail an invariant violation rather than aggregate a partial relation.

N1 has one aggregate-source edge per declaration. If richer bodies are later admitted, dependency extraction must traverse all inner literals, not only the measure's variable origin or the first source atom. Factoring a negated inner query into its own lower relation may introduce another stage; that is conservative, but should be visible rather than hidden in old IR.

A useful diagnostic should retain source rule/declaration ordinal, aggregate occurrence, source and destination predicate identities, and a readable cycle witness. Select the offending source occurrence deterministically rather than exposing incidental SCC discovery IDs. Keep negative-cycle and aggregate-cycle explanations distinct even when one cycle contains both. Diagnostic byte admission and failure phase need their own selected policy.

Allowed shape: Edge → Reach, with positive recursion within Reach; Reach →aggregate ReachCount → Answer.

Rejected shape: R →aggregate A →positive R. Also reject direct self-counting, cycles mixing negation and aggregates, and unreachable aggregate cycles. Do not exempt min/max or nonnegative count merely because a threshold-oriented recursive semantics might exist elsewhere.

## 10. Why scalar-output aggregates need the completion barrier

This is an independent elementary argument under ordinary set-of-output-facts semantics.

For R = {a}, exact count emits Count(1). For R' = {a,b}, it emits Count(2), not Count(1). Since Count(1) disappears, this mapping is nonmonotone under set inclusion, despite the numeric count increasing. Likewise adding a smaller value can replace a min fact; adding a larger value can replace a max fact; a signed sum can move in either direction.

A predicate such as count(C) ≥ k can be monotone under insertion, and max(C) ≥ k can be monotone for a fixed nonempty domain treatment. These are truth-valued threshold queries, not the exact scalar graph. Min(C) ≤ k has a similar threshold property. Sum(C) ≥ k additionally needs nonnegative contributions and well-defined arithmetic. Such observations do not remove this roadmap's ban on aggregate cycles.

Once a lower relation is complete and immutable for the invocation, its aggregate result is fixed. Higher positive rules can then use ordinary set union without retracting tentative scalar facts. This is the soundness advantage of the conservative boundary, conditional on the correctness of completion, grouping, types, arithmetic, and limits.

## 11. Owned IR and compatibility obligations

The present dependency Boolean cannot explain an aggregate edge, and the present rule variable count cannot express local versus exported aggregate roles by itself. Conservative alternatives are:

- a new owned aggregate-aware IR version with explicit dependency kinds, source relation identity, key-column order, full-tuple contribution mode, measure column, operator, grouping mode, result binder/tag, and numeric/empty policy identifiers; or
- a separate inspect-only aggregate-plan document whose relation identities and version coupling are explicit.

Do not stuff aggregation into a filter opcode, call an aggregate a negative atom, reinterpret old enum numbers, or silently append new fields to canonical IR2 while keeping its schema identifier. Continue owning strings/values/IDs; do not retain parser slices or caller-owned state. An inspectable IR does not create a caller-supplied executable-IR endpoint.

Compatibility verification would eventually need unchanged old accepted/rejected syntax, error classes, API signatures, result layout, metric meanings, IR1 and IR2 canonical bytes, and old callback behavior. A legal old predicate named count must remain legal in old entry points. Old functions should not acquire aggregate semantics implicitly.

New aggregate counters and logical admission units are a separate choice. Potential dimensions include source tuples visited, groups constructed, result facts, reducer operations, contributor deduplication, and serialized aggregate metadata. These are not additions to old counters by assumption. Any new budget must include result-value admission, key storage, accumulator state, failure paths, and output/IR encoding before copying or publishing a result.

## 12. Performance and soundness tradeoffs — analytical, not measured

- For one completed relation with n tuples and k groups, hash grouping can use expected O(n) lookup work plus comparison/hash byte costs and O(k) reducer state. Worst-case guarantees require a stated hash model or a sorting/tree alternative. String comparisons are not constant-cost independently of string length.
- Full-tuple source set identity can reuse the completed relation's uniqueness guarantee; a second contribution-set dedup pass is not semantically necessary for N1. Projection/subquery families need their own dedup semantics and costs.
- Sorting gives deterministic traversal/diagnostics and can support an ordered-fold contract, at O(n log n) comparisons. It does not make floating addition exact or prefix overflow permutation-invariant.
- Several aggregates may share a group scan only if their type validation, empty behavior, error ordering, accounting, and numeric contracts are preserved. Shared execution is an optimization, not a reason to merge their definitions.
- Recomputing from a completed lower relation on every invocation is simpler than maintaining aggregate deltas across corrected history. Insert/delete/replacement maintenance must track set membership/support correctly; removing one proof is not necessarily removing a fact, and deleting a current extremum needs replacement information.
- Invocation-local reuse of a fixed aggregate descriptor/key result is a possible optimization for repeated correlated uses. Cross-invocation or cross-history reuse would require a new invalidation/state contract and is not implied here.
- Generic join-body aggregates can have many more witnesses than input rows or final projected facts. N1 relocates join derivation and its deduplication to an explicitly limited lower relation; it does not make that lower computation free.
- Algebraic aggregate-pushdown, distributed partial sums, and reordering may be valid for mathematical monoids yet invalid for checked prefixes, rounded f64 folds, error precedence, or selected logical counters. Each requires a proof against the chosen contract.

## 13. Decisions still OPEN before any implementation

1. N1 only, or any separately specified projection/subquery/anchor extension?
2. Dedicated aggregate stage or new scoped body binder? Exclusive aggregate producer?
3. Explicit observed/global mode and zero-key syntax?
4. Empty sum/min/max policy and multi-aggregate output behavior?
5. Homogeneous per-group, per-relation, explicit-tag, or total-tag-order min/max?
6. i64-only sum versus a separately specified f64 form?
7. Exact-final versus ordered-prefix overflow; contributor bound and accumulator representation?
8. Error validation/precedence and all-or-nothing result policy?
9. New language/API/IR identifiers and independent metrics/limits?
10. Independent semantic oracle and pinned SQL-route mapping for every admitted branch?

No choice is made by this revision. The accompanying oracle-obligation document turns these branches into explicit conditional expectations. Acceptance remains blocked by unaccepted dependencies and by the absence of any authorized empirical execution.
