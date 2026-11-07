# Item4 source-only peer review: theory → root QA and execution

Review date: 2026-10-31 UTC. **No implementation or runtime approval.** The reviewed materials are new research specifications and proposed unrun fixtures, not executable acceptance evidence.

## Result

**One substantive original-QA fixture error was identified by the root and corrected before this review closed:** N19 incorrectly treated embedded-NUL logical text as admitted. The current QA **revision002** incorporates both row-admission and NUL corrections and is the recommended QA research artifact. No unresolved semantic mismatch was found in current002. Historical001 is coherent only with both mandatory clarifications, not on its own. The execution proposal's synchronous SCC schedule, eager-filter barrier, aggregate component-round model, and all-negative-test charge are internally coherent as a separately versioned new-API contract. Their adoption remains a coordinator decision, not an implication of ordinary stratification theory.

Two specification gates remain before an oracle/implementation can be accepted:

1. Make the independent oracle's finite level bound explicit: count **all graph predicates including fixed `triple/3`**, not only IDB predicates, if levels range over `0..n-1`.
2. Keep successful relation-set/fault-presence comparison under ample limits separate from exact resource-counter/failure and selected multiple-fault-priority checks. A synchronous naive relational oracle does not automatically reproduce the proposed semi-naive component-round/work metric.

These two continuation gates are precision/adoption issues, not observed runtime failures. The original N19 admission claim, unlike those gates, is incorrect and must not be used without its correction.

## Frozen inputs and actual scope

- **Current root QA manifest:** `.agent-logs/goal4-qa-research/revision-002/MANIFEST.json`, SHA256 `f6b7a0f8c5a7a0a3bcaf49e506df9f7b97b14a8b7569ed39da6fe3cbf15bf8cd`. Five listed members / 20,173 bytes verified.
- Historical root QA manifest: `.agent-logs/goal4-qa-research/revision-001/MANIFEST.json`, SHA256 `fa3cc4cbe3e6b4ad367bd52e59339224a2f73755fa0c5e3a80da44e465b8505d`.
- Mandatory root clarification: `.agent-logs/goal4-qa-research/CLARIFICATION-001.json`, SHA256 `daedc51774642824e55710eb19b657bc4df04b650b8dee96e12dd19a34157c6f`.
- Mandatory root NUL correction: `.agent-logs/goal4-qa-research/CLARIFICATION-002-NUL.json`, SHA256 `a10492fe361693fdf862394f92a411fada15f87f4d84ce8308ab2953b6cef616`.
- Execution manifest: `.agent-logs/goal4-negation-execution/revision-001/SHA256-MANIFEST.json`, SHA256 `14dce4c69f27b53bbad62a4e72af052786beda576eb65f322d47a6f0da486b29`.
- Execution report SHA256 `5208865bbc176e04719b5e505fab104cabba9308c1f690b6af04808aa475cfd0`; benchmark/research-plan SHA256 `9664b4fa9ee4020efc1429cabca8285302596495fd25fcd92b243d2f076e144e`.

Read historical root QA's research, fixture matrix, primary-source inventory, scoped published-source readback, and both clarifications. Then verified current002's manifest and all five members, read its change record, and inspected the targeted research/fixture/source-inventory diffs: N19, N26, same-name arity rejection, and the added typed-value source entry match the stated corrections. Read execution report **sections 6–10** and only oracle/evidence-related excerpts from its benchmark plan. File-byte/hash checks cover manifest-listed research files; they do not mean every sentence in every execution inventory or benchmark section was semantically reviewed.

Nonblocking metadata nit: current002 `RESEARCH.md` still says “six source files” although its updated published-source inventory accurately lists seven. This does not change semantics or the verified member hashes; no author file was changed to fix the prose count.

An earlier execution section read was pre-freeze and not used as final approval. The formal read followed verification of the frozen manifest/report hashes. The theory worker's own original research manifest `020584f1e1467b2fff2d9b2e2c289c2cd6971e87409a7f45c146b9217c96a35b` remains unchanged. This review is disjoint from those author records.

## 1. Temporal correction expectations

Root's proposed history is:

- `member(p)`: valid `[0,10)`, recorded `[1,OPEN)`.
- Old `blocked(p)`: valid `[3,7)`, recorded `[2,3)`.
- Corrected `blocked(p)`: valid `[5,9)`, recorded `[3,OPEN)`.

For `safe(p) <- member(p), not blocked(p)`, direct application of the stated half-open inequalities gives:

| valid | recorded | member visible? | blocking version visible? | safe answer contains p? |
|---:|---:|---|---|---|
| 4 | 2 | Yes | Old | **No** |
| 4 | 3 | Yes | Neither: old recorded end excluded; correction starts valid 5 | **Yes** |
| 7 | 2 | Yes | Neither: old valid end excluded; correction not yet recorded | **Yes** |
| 7 | 3 | Yes | Corrected | **No** |
| 4 | 0 | No | Neither | **No** — no external-universe enumeration |

Thus N22–N24 and the research prose's four explicit answers are correct as proposed logical expectations. No output was observed from an engine. Exact native/store point-admission differences, int64 endpoints, and `OPEN_END` behavior remain inherited source contracts; this review does not replace them with timestamp conversions or a new interval convention.

### Mandatory carrier precision

The clarification correctly removes a physical two-pass requirement from the original “first admit, then select” shorthand:

- Each supplied row validates its terms/value/intervals **before that row's visibility test**.
- A valid visible row may be selected/inserted while other rows remain to be loaded.
- **All supplied carrier rows finish loading before rule evaluation and any returned evaluation result.**
- An invalid inactive row still rejects the invocation; visibility-prefiltering the retained carrier would weaken admission.

N26 must be interpreted through that clarification. The unamended fixture wording alone is too easy to misread as forbidding any interleaved selection. No author file was edited to resolve this; the existing addendum is part of the reviewed bundle.

## 2. Independent oracle, binding, and fault semantics

The proposed oracle is genuinely structurally different if implemented as described: independent abstract programs, explicit tagged values, bounded level-assignment enumeration, all positive membership checks, synchronous naive saturation, independent scalar evaluation, then exact negative tests. Production parser/SCC/delta/index/hash helpers must not leak into it.

Positive binding must range over every admitted tagged value actually matched by positive atoms. In particular, a Boolean/string bound from a heterogeneous triple object cannot be silently omitted merely because arithmetic on it would fail. N12–N15, N17–N18/N20–N21, and the research prose preserve this distinction. N19 needs the mandatory correction below.

The eager-fault rule is coherent: complete positive binding → evaluate **all** scalar filters even after false → propagate an actual fault → only if all filters are true perform negative membership → project/deduplicate. A false negative condition, an already-present head, and empty negative relations cannot hide scalar faults. An empty positive join creates no complete binding and therefore no scalar evaluation. A ground negative-only body has one empty-binding candidate only after lower targets complete.

N16's helper boundary is also important. A separately defined positive helper can remove a binding before a later rule's partial arithmetic. Ordinary truth-preserving view inlining does not by itself preserve this fault-observable language.

### Substantive resolved correction: logical NUL text versus physical BLOB zeros

Original N19 included embedded-NUL text among admitted exact-identity cases. The root's mandatory clarification002 reports narrow published-source verification that `engine/src/temporal_value_domain.hpp` (`validate_term_bytes`, source SHA256 `e41516e1c8b761b25935049fbb19e75ebca0789c2b95b6d4cfbd65cea6409a63`) rejects NUL. The addendum also cites existing native/parser source tests; none was run here.

The corrected scope is:

- Logical entity/attribute/string values and program text must satisfy the existing valid-UTF8, NUL-free admission rules.
- NUL is an **admission-rejection control**, including in inactive retained history. It is not an admitted negative-membership key.
- Binary zero bytes within a physical BLOB/key encoding are not logical NUL text and are not excluded by that text rule.
- Exact logical-string identity fixtures must use admitted NUL-free strings. More generally, cases outside the existing admitted value domain belong to rejection tests, not an expanded oracle universe.

This review verified the addendum bytes/hash and its consistency with the other admission rules. The cited code inspection was performed by the root, not independently repeated by this worker. Historical QA records were retained unchanged, so consuming `fa3cc4` without addenda001 **and** 002 is not endorsed. Current revision002 directly incorporates the correction and is the recommended artifact instead.

### Exact finite level bound

Let `n` be the number of **all** relation vertices participating in the tiny program graph, including fixed EDB `triple/3`. Enumerating maps into `0..n-1` is complete for predicate stratification: after SCC condensation, at most `n` components need predecessor-first ranks.

Counterexample to using only `m = IDB count` with levels `0..m-1`: a valid strict negative chain of `m` IDB predicates above EDB can need levels `0,1,...,m`, where EDB occupies level 0. For `m=1`, a head positively bound by one `triple/3` atom while negating another `triple/3` atom already needs level 1; the one-element range `{0}` falsely rejects it. Each later head can likewise be positively bound from `triple/3` while negating the preceding IDB. This counterexample does not depend on admitting a negative-only rule. It is an off-by-one in a finite validator search, not a new semantic restriction.

Root QA currently says “bounded legal integer stratum assignments” without selecting an exact numerical range. Therefore this is a necessary explicit continuation detail, not a demonstrated mistake in an implemented oracle. The original theory report used `n = predicates`, which is consistent when the base vertex is included. A search over IDBs alone is also possible with EDB fixed 0 and IDB levels `0..m`; document whichever representation is chosen. For a chosen finite harness, record at most `n^n` assignment candidates, per-rule substitution bound `|A|^variable_count`, and possible-fact bound `sum_R |A|^arity(R)` before enumeration. These formulae are bounds to instantiate under selected tiny caps, not permission for an unconstrained campaign.

## 3. Execution SCC schedule and round proof

The frozen execution proposal is coherent:

1. Start each IDB SCC empty, with all predecessor relations fixed and completed.
2. Evaluate the base wave against that start state; keep all new outputs pending until wave end. Internal-positive rules have no match before seeds exist.
3. After nonempty delta, evaluate all recursive delta positions against current accumulated/fixed lower sets, deduplicating pending against accumulated and itself.
4. Finish only on a charged no-change wave. A base-empty component finishes in one wave. A nonempty acyclic singleton charges its base plus one explicit empty verification wave, so it takes two under the chosen policy.

This handles the full-lower-input seam and avoids treating consumed lower deltas as empty relations. Positive recursion with fixed lower negative tests remains monotone; negative targets are never frontier-only relations.

**Bound:** in a completed SCC, every wave except its final no-change wave adds at least one new distinct IDB tuple. Charge those changing waves injectively to distinct additions. Charge the one no-change wave to that SCC. Summing gives:

`global component_rounds <= total distinct IDB additions + number of IDB SCCs`.

The bound includes base-empty SCCs and nonempty acyclic SCCs. EDB loading consumes no IDB component-round. The proposed 2000 cap is a separate stricter logical limit, not a runtime bound derived from the theorem. With a cap of 1, an empty component may complete but a nonempty acyclic singleton must fail before its second verification wave; that consequence is deliberate policy, not a mathematical contradiction.

Counting pending facts in one global max-facts total is coherent **if** moving a tuple from pending to accumulated does not charge it again. The frozen report explicitly requires deduplication against both sets. Resetting counts at SCC boundaries or returning a completed lower prefix after later failure would violate the proposal; neither is recommended.

## 4. Negative group work and partial-error distinction

For a complete positive binding whose filters all succeed and return true, precharging `sum(1 + arity(atom))`, then performing/counting every ground negative occurrence, is a coherent new logical work metric. Empty, matched, and absent targets all consume a decision. No first-match counter short-circuit means a matching early negative does not make later occurrences disappear from the logical metric.

This policy is not compelled by stratified truth semantics: a truth-only evaluator could short-circuit total negative membership. Here the all-occurrence policy is an explicit adoption choice that makes costs less dependent on negative atom ordering for a fixed candidate stream. A resource failure before the group returns no successful partial result. The group has no inherited scalar operation left to hide because the eager-filter barrier was already crossed.

The sum is globally accumulated with positive/expression work; repeated overlapping delta candidates pay their own charges before head/pending deduplication. Existing positive APIs/counters remain on their old definitions. The proposal does not equate logical work with collision-chain CPU, allocator/RSS consumption, cancellation latency, or SQL counters, and correctly discloses those limitations.

### What ordinary stratification does not prove

[The classical stratification theorem](https://webdam.di.ens.fr/Alice/pdfs/Chapter-15.pdf) concerns completed relation sets. It does **not** automatically prove:

- which of several unrelated partial scalar faults is selected first;
- equality of positive candidate enumeration or overlapping-delta duplicate counts under different plans;
- equality of work counters or near-limit success/failure under source permutations;
- equality of the naive oracle's own round count with the new semi-naive component-round metric;
- preservation of old API counters when a new schedule is substituted.

Under sufficient limits and deterministic inherited scalar operations, compare successful full relation sets and required fault presence. Check single-error diagnostic classes separately. For exact budget/round failures, use a separately specified small accounting oracle/model of the proposed schedule, not the naive relation oracle's own operational counts. If exact selected-error or count permutation invariance is desired, the settled plan/error priority must establish it explicitly. These points do not invalidate the proposed versioned API; they limit what can be claimed from its semantic proof.

## 5. Integration and acceptance boundary

The corrected reviewed bundle retains the following boundaries:

- Ordinary fixed identifiers with one validated arity each, not dynamic RDF predicate names or same-name arity overloading; negative atoms/filters are not binders; undefined predicates are static errors distinct from defined emptiness.
- Whole-program cycle/safety checks, including unused/data-empty rules.
- One execution-local typed dictionary, existing exact tuple membership, one temporal point, no cross-call lower-relation/result cache.
- Existing continuous FP/trusted-callee and all-retained admission conditions.
- A new owned/versioned signed IR/API rather than changing strict old schema keys or old counters silently.
- Pure native semantic feasibility is not repair or acceptance of the unresolved store/planner trust dependency. SQL anti-joins, a mutable candidate, source execution, and item3 acceptance are **not** authorized or certified by this review.

All implementation, compiler/module/supervisor/native/database tests, benchmarks, EXPLAIN observations, and integration acceptance remain unrun. The closed artifact hashes prove which research bytes were reviewed, not their implementation or performance.
