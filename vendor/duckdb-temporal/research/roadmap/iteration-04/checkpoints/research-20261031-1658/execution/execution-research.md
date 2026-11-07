# Item 4: physical execution and exact-negation research

Status: **research only; no implementation, build, database call, runtime test, benchmark or EXPLAIN was run.** Prepared 2026-10-31 UTC. Engine pin is DuckDB **2.0.0**, exact commit **d54cbbe3df17e8e5ce68312f483b4155836112aa**. GitHub's v2.0.0 tag was independently read and resolves to that commit. The selected API remains the genuine **unstable C API v2**; this is not a stable-v1 substitute and makes no stability-date or production-readiness claim.

Item 3 remains **INCOMPLETE / BLOCKED / UNACCEPTED**. Starting new item-4 research does not waive dependencies 1–2 or the settled rule-plan-3 dependency. No item-3 experimental probe, hidden C++ attachment-authority assumption, compiled artifact, or protected build directory was used. This record is a new execution/representation study, not a reconstructed prior checkpoint.

## 1. Recommendation and authorization boundary

**Recommended bounded direction (design inference, not implemented):** extend the argument-only native evaluator with a versioned signed logical plan, explicit lower-stratum completion, positive-SCC-local semi-naive evaluation, and full-key anti-membership against its existing exact tuple sets. Keep whole-program routing: no new native/SQL per-stratum hybrid. The already-published SQL plan's trust gate is not an implementation foundation for new negation.

The native route has a strong modular seam: all safe negative variables are bound by positive relational atoms, so each negative atom can be substituted into a complete tuple. Its truth is one membership test in a **completed, frozen lower relation**. Existing dictionary IDs preserve tag and exact value identity; existing Relation.seen already contains the exact full-tuple hash set. Neither a new wildcard/existential index nor a new coercive SQL comparison is necessary.

Use a **separate additive signed compile/query API and owned IR version**, with final names/version numbers left to the contract gate. Preserve the bounded accepted legacy positive-query contracts for td_query/td_query_v2, and leave the published td_plan_ir_v1 / td.program_ir/1 contract unchanged. Existence of that item-3 IR is **not** item-3 acceptance. Do not reinterpret td.program_ir/1 or silently admit signed programs through a legacy parser. Shared internal parser/evaluator code is possible, but feature selection and output schemas must be explicit. Positive programs through the old entrypoints continue on their original execution/accounting contract; a new signed schedule is not evidence that its rounds equal old whole-program waves.

This establishes architectural feasibility only. It does not accept item 4, repair item 3, authorize a build, or establish an API/metric contract. The coordinator must first settle grammar/IR versioning, fault observability, round/work accounting, and the rule-plan-3 gate.

For any planned-read entrypoint, preserve fresh fail-closed trust checks before route selection, including forced-native selection. A guard rejection must remain a rejection: do not catch it and enter the native route, skip catalog/attachment validation for negation, weaken attachment rejection, auto-repair the session, or treat an earlier successful check as cached authority. An argument-only evaluator can be researched independently of SQL catalog lookup; that does not authorize activating a new store/planner path around the unresolved gate.

## 2. Evidence classes

- **Inspected upstream source:** exact-ref raw files through the GitHub read connector; source byte sizes and SHA256 digests are in upstream-source-inventory.json. Selected code ranges and complete API-name inventory were examined, not every line of every file.
- **Inspected published project source:** narrow reads of the coordinator-approved candidate-002 source corresponding to PR 7 head 52b1e81f1d71590bdefb376e62924c9f717d4344; exact selected-file digests are in published-source-inventory.json. No project code was imported or executed.
- **Official documentation:** versioned DuckDB /docs/2.0 pages, retrieved 2026-10-31.
- **Primary papers:** Neumann/Kemper 2015 for decorrelation; Kuiper/Groß/Boncz/Mühleisen 2025 for external hash-join memory design; Subotić/Jordan/Chang/Fekete/Scholz 2018 for Datalog primitive-search/negative-emptiness indexing. Their findings are not timings for this prototype.
- **Inference / hypothesis:** explicitly marked below. All proposed plans, fixtures, costs, memory estimates, diagnostics and performance comparisons are **UNRUN**.

## 3. Exact SQL semantics: ANTI, NOT EXISTS and NOT IN

DuckDB 2.0 documents ANTI as left rows with no right match, with cardinality no greater than its left input. A duplicate left row is still a left row: ANTI does not itself turn a bag into a set. Right multiplicity does not change existence. Datalog must therefore retain set materialization/deduplication at EDB, rule heads/unions, and the final answer. [2.0 joins](https://duckdb.org/docs/2.0/sql/query_syntax/from)

NOT EXISTS asks whether its subquery produces zero rows and returns a Boolean. The SELECT projection is irrelevant; all identity tests belong inside the correlated predicate. This is a natural semantic spelling for a negative atom after all its variables are bound. It is not equivalent to treating a missing/undefined predicate as an empty relation. Undefined predicates remain static program errors. [2.0 subqueries](https://duckdb.org/docs/2.0/sql/expressions/subqueries)

NOT IN is not a safe generic lowering. SQL NULL contamination can make a nonmember's IN result NULL, so NOT IN is also NULL rather than true; WHERE then removes it. Lists have different containment rules from tuple/subquery IN, making a spelling-based shortcut especially dangerous. Subquery IN also expects one projected column. Do not implement multi-column negative atoms by ad hoc NOT IN row/struct conversions or by changing the RHS to a list. [2.0 IN](https://duckdb.org/docs/2.0/sql/expressions/in)

For ordinary "=" conditions, a NULL on either side is not an equal key; a NULL left key can therefore survive an anti join. For "IS NOT DISTINCT FROM", NULL is a matchable value. DuckDB's hash table explicitly marks null-safe comparisons and does not filter their NULL keys. Thus the shorthand that ANTI ignores right NULLs is about ordinary matching conditions, not a license to ignore the actual ON semantics. [2.0 NULLs](https://duckdb.org/docs/2.0/sql/data_types/nulls), [exact hash-table null handling](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/join_hashtable.cpp#L735-L757)

**Tiny semantic controls to specify, not run:**

| Left key | Right keys | ordinary ANTI / NOT EXISTS equality | NOT IN subquery |
|---|---|---|---|
| nonnull a | empty | retain | retain |
| nonnull a | a, a | remove | remove |
| nonnull a | b, NULL | retain | NULL; filtered away |
| NULL | nonnull b | retain under ordinary equality | normally NULL; filtered away |
| NULL | NULL | ordinary equality retains; null-safe equality removes | NULL; filtered away |

The actual Datalog domain has no logical SQL-NULL value, so the NULL rows above are **translation controls**, not admitted Datalog facts. All physical carrier validation still runs on retained input, including inactive history.

## 4. Typed representations: preserve the real contract

### 4.1 Published wide tagged carrier (inspected)

storage/planner_v1.py uses five fixed columns per term: UTINYINT tag, BLOB string identity, BOOLEAN, BIGINT, DOUBLE. Exactly one payload is selected and three inactive payloads are SQL NULL. _equal compares **all five slots with IS NOT DISTINCT FROM**. Strings use encode(...) to BLOB identity rather than VARCHAR collation. The snapshot normalizes signed zero; decoding validates exact slot types, one selected payload, finite canonical floats and set uniqueness, then restores native tag/value output order.

Therefore this existing representation is **not NULL-free**, even though the logical domain is. Replacing _equal with five ordinary "=" conjuncts is incorrect: inactive-slot NULLs make equal terms fail to match. A new ANTI or NOT EXISTS lowering must reuse all-slot null-safe tagged identity unless a separately proved carrier replaces it.

Combination casting in comparisons and set operations can cross numeric/Boolean boundaries in ordinary SQL. Tag separation and fixed corresponding physical types are essential: str "1", bool true, i64 1 and f64 1.0 must remain four distinct values. Preserve int64 extrema and values beyond 2^53 without converting them through DOUBLE. [2.0 typecasting](https://duckdb.org/docs/2.0/sql/data_types/typecasting)

### 4.2 NULL-free tagged BLOB key (new design option; NOT implemented)

An alternative equality carrier could be one nonnull BLOB per term, with a mandatory tag byte and canonical payload:
- string: tag plus exact validated UTF-8 bytes, no normalization;
- Boolean: tag plus a fixed one-byte false/true code;
- int64: tag plus exactly eight bytes in one documented endian/two's-complement encoding;
- finite float64: tag plus exactly eight canonical IEEE bits, with negative zero normalized to positive zero and NaN/infinity rejected.

The tag prevents cross-type collisions. Tuple columns delimit terms, so this does not require concatenating arbitrary variable-length strings into an ambiguous tuple key. If a whole tuple is ever one BLOB, add explicit lengths or another injective framing; a delimiter alone is insufficient. Numeric payloads naturally contain zero bytes, which are valid BLOB bytes and are not user text NULs.

With validated nonnull keys on both sides, ordinary BLOB "=" can express exact equality without inactive-slot NULL logic. C API v2 has explicit BLOB value constructors/getters, vectors, arenas and chunk/collection surfaces. However, **there is no already-inspected implementation of this encoder or SQL lowering in the project**. A cast/format/JSON roundtrip is not an exact binary64 bit encoder. No proposed helper should decode a float to JSON text and parse it again. BLOB is arbitrary opaque binary data; type-specific validation remains the caller/native boundary's responsibility. [2.0 BLOB](https://duckdb.org/docs/2.0/sql/data_types/blob), [exact v2 header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L264-L290)

**Important limit:** a naive canonical payload is an equality encoding, not automatically an ordering encoding. Big-endian two's-complement bytes do not give signed numeric order, nor do raw float bits. Preserve native tag/value result ordering separately; do not use ORDER BY encoded_blob as a replacement.

At the present bounded native seam this alternative adds unnecessary conversion and proof burden: dictionary IDs already provide nonnull typed keys. Treat BLOB-key SQL as a later measured research comparator, not the recommended first implementation.

### 4.3 Native exact identity (inspected)

TypedDomain has distinct string, int64 and canonical-f64-bit maps plus two Boolean IDs. ValueIds are execution-local uint32 IDs. Tuple is an inline array of at most eight IDs with an explicit arity; equality includes arity and every ID. Relation.seen is unordered_set<Tuple, TupleHash>. Strings remain owned UTF-8 byte identity, floats are canonical finite bit identities, and no negative lookup should intern arithmetic temporaries or create recursive values.

For a ground negative atom, substitute each variable's existing ID or literal ID in relation-column order. Repeated variables, e.g. p(?x,?x), and constants require no special existential scan. Reject unbound variables statically; do not invent wildcard IDs or treat ?_ as anonymous. The published language treats ?_ as an ordinary named variable.

For “people without active assignment,” first derive a unary has_assignment(person) set positively from the selected assignment pairs, finish it, then anti-test that unary tuple for each selected person. A job variable occurring only inside not assignment(person,job) is not a permitted existential shortcut. The helper's distinct tuples are real IDB facts and count toward the global fact/memory budgets.

## 5. What d54's optimizer/executor actually provides

### 5.1 Hash anti execution (inspected, not measured)

- The hash table accepts "=" and "IS NOT DISTINCT FROM" as equality keys. At least one equality key is required for that physical hash-table path.
- For SEMI/ANTI/MARK with no non-equality predicate and no residual predicate, insert_duplicate_keys is false. This avoids storing duplicate full build keys for existence-only pure equality cases.
- NextAntiJoin scans key matches, then slices left output rows whose found_match is false. It does not project right payloads into the answer.
- physical_hash_join.cpp has dedicated empty-build handling; the logical semi/anti pushdown source simplifies an empty-right ANTI to its left input with output layout preserved. An empty left remains empty.
- The physical hash join contains adaptive reservation and external-processing decisions. That is an upstream capability, not proof that this project's scalar-native allocations can spill or that every possible anti plan succeeds under a cap.

Sources: [hash-table initialization](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/join_hashtable.cpp#L55-L100), [anti selection](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/join_hashtable.cpp#L1857-L1899), [empty-relation optimizer](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/pushdown/pushdown_semi_anti_join.cpp), [physical memory decision](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/operator/join/physical_hash_join.cpp#L1976-L2009).

### 5.2 NOT EXISTS decorrelation: do not promise one plan shape

The exact binder initially handles correlated EXISTS via a dependent MARK form. The MARK filter optimizer can turn NOT(marker) into ANTI when conditions are null-safe and conversion is permitted. But filter_pushdown.cpp explicitly preserves certain duplicate-eliminated correlated MARK joins to avoid losing correlation in nested RHS shapes. Some plans can therefore retain MARK/DELIM machinery rather than becoming a single simple hash ANTI.

Explicit ANTI and NOT EXISTS are legitimate research variants with the **same proved identity predicate**, not a blanket performance equivalence. Capture EXPLAIN when execution is authorized, and report actual JOIN type, MARK/DELIM presence, equality vs residual predicate, estimated/actual cardinalities, materialization and scans. A nested/retained MARK form is not automatically a correctness failure.

Sources: [correlated EXISTS binder](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/query_node/plan_subquery.cpp#L512-L525), [MARK-to-ANTI conditions](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/pushdown/pushdown_mark_join.cpp#L70-L98), [conversion restrictions](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/filter_pushdown.cpp#L45-L64).

Neumann/Kemper's primary paper explains how duplicate-eliminated outer-binding domains can eliminate correlated nested evaluation and discusses anti-join unnesting. Its algebra carefully treats NULL equality and preserves the surrounding SQL multiset semantics. It does not promise that every concrete d54 query will use the same physical operator or that Datalog set dedup can be omitted. [Unnesting Arbitrary Queries, 2015](https://15799.courses.cs.cmu.edu/spring2025/papers/11-unnesting/neumann-btw2015.pdf), sections 3–4.

### 5.3 Pushdown distinctions that matter

- Ordinary left-side filter pushdown through ANTI is present in pushdown_semi_anti_join.cpp.
- Build-derived runtime join filters are a **different mechanism**. Exact join_filter_pushdown_optimizer.cpp explicitly returns false for ANTI and RIGHT_ANTI, noting that inverted conditions would be needed.
- Thus do not forecast anti-join Bloom/minmax pruning of the probe scan from the right build relation. Removing keys definitely absent from the right would remove precisely rows an anti join needs.
- Positive-side constant/typed equality restriction and temporal snapshot predicates can still be pushed/optimized if semantic and trust contracts permit.
- Scalar-native internals are opaque to DuckDB's rule join optimizer; retaining one native scalar call does not magically expose its positive/negative atoms as optimizer joins.

[Exact runtime-filter exclusion](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/join_filter_pushdown_optimizer.cpp#L128-L143)

**Do not move a final exclusion into recursive traversal.** On edges a→b→c with b blocked, computing reachability and then excluding blocked endpoints can still return c. Pruning blocked nodes during recursive expansion loses c. These are different rule programs, even though both can be stratified. The fixed-negation recursive example below is an explicit rule meaning, not a rewrite of every “reachable but not blocked” query.

### 5.4 Genuine C API v2 capabilities and gaps at this pin

The generated exact header states that no v2 function has stabilized, requires DUCKDB_V2_API_ALLOW_UNSTABLE, and ties unstable extensions to the exact DuckDB version. Its entrypoint supplies an extension registration handle and a context; the current project scalar callbacks consume their SQL arguments and do not open a connection or execute SQL internally. Do not change that execution model merely because a general host API exists. [Exact header version gate](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L52-L81), [official 2.0 C overview](https://duckdb.org/docs/2.0/clients/c/overview)

| Surface inspected in exact header | Relevant opportunity | Boundary / missing proof |
|---|---|---|
| Scalar bind/init/exec callbacks; vector views, validity, mutable data, child vectors and arenas | Continue owned typed scalar query/compiler results using the genuine v2 binding | An opaque scalar's internal rule graph is not visible to DuckDB's join optimizer; borrowed views/arena lifetimes cannot become cross-call dictionary or snapshot authority |
| Table-function bind/global-local init/exec/progress; bind_set_cardinality; max_threads | A later explicit streaming table source can report cardinality and controlled output batches | A cardinality hint is not a resource cap; a source callback is not a custom logical/physical rule operator or a proof of seminaive scheduling |
| Table-function projection pushdown and filter-pushdown callback/get/accept functions | Restrict columns/accepted predicates of that registered source when semantics permit | Applies to the table function's scan contract, not arbitrary whole-program anti rewrites; rejecting/accepting a filter must preserve its fault and identity semantics |
| Column-data collections append/scan; statement_add_collection | Potential explicit owned in-memory relational input to a SQL statement without naming a persistent source | Lifetime, memory admission, snapshot contents and complete-set provenance still need proof; not an already implemented hybrid or hidden catalog-authority grant |
| parse_sql, statement_bind/execute, prepared_statement_create/execute/reuses_plan; result step/fetch/drain | Host-side prepared, parameterized whole-program SQL and owned result handling if its trust gate is accepted | Plan caching is not a snapshot, complete lower-stratum cache, fresh catalog authority or FP permission; no reentrant SQL-in-scalar plan is proposed |
| connection_interrupt/progress and query_metrics tree APIs | Future host cancellation request/profiling observation | The inspected header exposes connection interruption, not an internal per-probe cancellation guarantee for the private native loop; metrics availability/configuration is not yet measured |
| context/config access and attach-construction surfaces | General supported-host setup capabilities | No public general catalog/attachment enumeration authority, optimizer registration hook, or authority lease was identified in this header. Attach construction/config reads do not prove absence of hidden attachments or solve the item-3 guard |

Relevant ranges: [table functions/cardinality/threading](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L638-L710), [prepare and scan pushdown](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L1056-L1111), [metrics and bound collection](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L1460-L1498).

The whole API-name inventory was searched for catalog, optimizer, logical_operator, physical_operator, context/connection retrieval and interrupt surfaces; absence here is a statement about this inspected public generated header, not proof that DuckDB's private C++ internals lack such capabilities. No invented optimizer hook or private-callee authority is needed by the recommended argument-only native stratum design.

## 6. Native stratum orchestration design

This is a proposed algorithmic boundary, not current behavior:

1. Parse and statically validate the **entire** program, including unreachable rules and rules whose data later happens to be empty. Build signed predicate dependencies. With body-to-head edges use positive s(head) >= s(body), negative s(head) > s(body); document orientation to avoid transposition errors.
2. Reject an SCC containing a negative dependency. A negative self-edge is invalid. Undefined predicates and arity mismatches remain static errors, not empty closed-world relations.
3. Confirm every negative variable belongs to the whole-rule positive relational binding set. Neither negative atoms nor expression filters are binders.
4. Form the SCC condensation order and strata. Preserve positive recursion inside an SCC; every negative reference must target a completed lower stratum at the same snapshot.
5. Load and validate all temporal input once; select the EDB set at the fixed valid_at/known_at. Own one dictionary and tuple identity domain throughout that invocation.
6. Process strata/SCCs in dependency order. Explicitly mark completion even when a lower relation is **empty**. Nonemptiness, a last nonempty delta, and a clock value are not completion proofs.
7. Under the concrete new-API accounting proposal in section 9, start the current IDB SCC empty and evaluate one synchronous base wave. Its ground/base rules read completed lower positive/negative relations; new ground/base outputs enter pending and are merged only at wave end, not exposed as same-wave input. A rule with no positive body but all-ground negation has one empty-binding candidate after its lower targets complete. Internal-positive rules have no current-SCC match until an SCC seed has been accumulated.
8. Apply subsequent semi-naive variants only to positive atoms whose current-SCC relation has a delta, covering every such position. Negative relations are fixed full sets, never deltas; lower positive relations are also full fixed inputs. Base-only rules are not repeated after their one complete initial evaluation. Rules whose positive body contains only lower-SCC relations must receive that base evaluation even if all lower delta_begin values have already been consumed.
9. Freeze completed lower state while computing the SCC fixed point. An accepted absence must never later become false in that invocation.
10. Produce the exact sorted set answer only after all required work completes. Any admission, type, resource, FP or internal invariant failure returns no partial relation.

**Why the current loop cannot simply add a negative if-statement:** published Core.run globally seeds ground rules, loops all rule bodies against global delta_begin, and grows all relations monotonically. Negation is not globally monotone, and higher-stratum base rules could be skipped after lower deltas are consumed. Explicit stratum state and base scheduling are required.

**Positive recursive SCC with fixed negation example:** a reachability SCC may grow reach(x,z) from reach(x,y), edge(y,z), not blocked(z), after blocked has completely finished in a lower stratum. This transformation is monotone in reach while blocked is fixed. It is not recursion through negation and provides no well-founded/stable-model semantics.

No cross-SCC memory reclamation is initially recommended. Later-reference analysis could free an unused frozen relation, but retained/derived fact accounting and reproducibility must remain correct even after physical release; this is extra proof burden without a current need.

## 7. Preserve item-2 expression faults and FP continuity

The published expression syntax is body-only bracket comparisons over literals/variables/arithmetic, not assignments or computed relational terms. All filters run on each complete **positive relational candidate**, even after a false filter, before head dedup. A ground filter-only rule has one empty-binding candidate; an actually empty positive join has none.

**Recommended order, agreed with the theory research worker:** complete positive binding -> evaluate every inherited filter and propagate any actual fault -> apply grounded frozen-lower anti-membership -> project/dedup. A negative match must not hide division-by-zero/type/overflow/underflow faults that item 2 would expose. Source comma order is not a short-circuit error guard. Moving ANTI ahead of these filters, eliminating a rule because a ground negative is false, or deduplicating positive candidates before fault checks is not automatically equivalent. SQL still excludes filters under the selected item-3 route; a filterful negation program remains whole-native if the required entrypoint and trust conditions are otherwise accepted.

The concrete new-API accounting proposal in section 9 precharges every negative test per complete positive candidate **whose filters all returned true**, then performs every test rather than letting the first matching negative short-circuit logical counters. A candidate with any false filter still evaluates every filter for faults, but needs no membership test afterward. Adopting this proposed policy is a contract decision, not an already-implemented detail. Negative membership itself is total on admitted IDs, but resource exhaustion is observable.

Preserve the continuous supported-FP/trusted-callee premise across caller field reads, parse/IR serialization, parameter materialization, execution, result draining, decode, JSON codec and return boundary. An imported module, prepared plan, cached IR or lower-stratum cache is never an FP permission. Byte-key equality can reduce arithmetic involvement; it does not relax the inherited FP lifecycle or repair already-lost bits.

Sources: published engine/ITERATION-02.md lines 12–20; temporal_core.cpp parse_filter/parse/evaluate/filters_match; temporal_expression.hpp; storage/planner_v1.py _run/_decode_sql_rows.

## 8. Snapshot validity, corrections and caching

Keep the exact half-open predicate:
valid_from <= valid_at < valid_to AND tx_from <= known_at < tx_to.
Compare integer bounds directly; do not subtract, increment a sentinel, convert to timestamps, infer wall-clock recency, or select a latest value. Overlapping distinct facts remain distinct; duplicate visible typed triples become one fact.

Negation is absence **at that same two-clock cut**, not absence in all retained history. A late-recorded correction can change a newer known_at answer about an old valid_at; an older known_at answer must retain its historical result. Closing old tx intervals and inserting replacements must remain one writer transaction. The negated relation is computed from the visible EDB, not from the latest source table independently of positive evaluation.

The published store query opens one transaction, captures logical position and runs the native scalar on the same connection. Its NATIVE_SQL aggregates **ALL retained temporal_facts without a visibility WHERE** and passes the full history carrier and valid_at/known_at to native. Exact Core.add_triple validates each row's terms/value/intervals before that row's visibility test and may build the visible EDB while loading; all supplied rows finish loading before Core.run. Thus this is full-retained admission before any returned evaluation result, not necessarily a separate validation pass before constructing any visible tuple. Do not prefilter that carrier to visible rows to save work: invalid inactive history must still be rejected. Only after complete admission succeeds does negative evaluation use the selected visible EDB set. Planned reads also perform trust/admission/IR/count/execution under one transaction and drain before commit. A new native stratum schedule should stay **within that one scalar invocation and its internally selected EDB**, not open a second connection for each stratum. A SQL whole-program CTE plan would likewise need one owned transaction/cut and equivalent all-retained admission.

DuckDB 2.0 documents snapshot isolation and repeatable reads; multiple statements in auto-commit are not a single snapshot transaction. Its general MVCC concurrency support does not broaden this prototype's threads=1/owned-session/trusted-caller/concurrent-load limits. [2.0 transactions](https://duckdb.org/docs/2.0/sql/statements/transactions), [2.0 concurrency](https://duckdb.org/docs/2.0/connect/concurrency)

**Cache recommendation:** execution-local frozen sets only; no cross-call result/lower-stratum cache for the first bounded implementation. valid_at/known_at alone is not a universally sufficient cache key: database identity, schema/typed codec version, program, read-transaction incarnation, own uncommitted writes, rollback/reused logical positions and supported policy must be accounted for. A parse-only owned logical-plan cache is a different possibility, but it cannot cache snapshot contents, freshness, resource admission or FP authority. No cache is currently proved here.

A MATERIALIZED CTE can establish statement-local reuse, while inlining can repeat its definition. It is not a cross-query cache or attachment authority. For future SQL research, compare controlled materialization vs optimizer-chosen plans with pure filter-free relations, rather than assuming a CTE spelling guarantees the desired physical barrier. [2.0 WITH](https://duckdb.org/docs/2.0/sql/query_syntax/with)

## 9. Costs, memory, caps and failure behavior

### Native hypotheses, not measurements

For M complete positive candidates and K negative atoms of arity <=8:
- additional average hash anti-membership cost is O(M*K*arity), reusing existing seen sets;
- no additional full lower-relation build/index is required for these all-bound atoms;
- transient grounded Tuple keys can remain inline/stack-local; no new value is generated;
- duplicate positive derivations may still incur filters and negative probes before head dedup, consistent with the inherited seam;
- worst-case unordered hashing can degrade with collisions; deterministic TupleHash is not an adversarial-complexity sandbox.

The inline Tuple appears to need its 32-byte ID array plus count/padding, but exact sizeof/allocator/set-node/bucket behavior was **not measured**. Native relation memory includes both rows and seen tuple copies, plus lazily built positive per-column indexes and dictionary state. Existing dictionary/output admission units are not a complete allocator census. Do not advertise a hard RSS or cancellation bound from those units.

Subotić et al. describe negative atoms as indexed primitive searches tested for an empty result before projection/set insertion. Their broader index-selection problem supports partial-key searches, whereas this bounded range-restricted design grounds every negative position and can reuse one full-key seen set. Do not import their wildcard syntax, a general auto-indexing subsystem, reported speedups, or negative-loop hoisting into this project's fault-observable language. In particular, a logically valid early negative test in a truth-only evaluator need not preserve the inherited scalar fault barrier. [Automatic Index Selection for Large-Scale Datalog Computation, PVLDB 2018, section 3.1](https://psubotic.github.io/papers/p141-subotic.pdf)

Charge every negative lookup, including an empty relation and an unsuccessful probe; otherwise abundant absence checks could disappear from work accounting. A proposed logical probe charge does not itself bound the underlying hash-chain CPU. Keep actual logical counters separate from cost estimates and wall time. Preserve filter-free positive APIs/counters on old programs; any new rounds/work interpretation requires an additive/versioned contract.

**Concrete global accounting proposal for the new signed API (not selected or implemented):** keep max_facts one invocation-wide total of distinct EDB plus every distinct IDB fact, including completed lower components and current pending tuples. Duplicate head attempts do not add facts; pending is deduplicated against both accumulated and pending sets. Never reset this count or max_work/max_rounds at an SCC boundary. All failures abort the entire invocation without returning a completed lower prefix.

Define the new round metric as **component_rounds**, not the unchanged legacy rounds metric:
1. The selected EDB is already complete and consumes no IDB component-round.
2. Each IDB SCC starts empty and always pays one synchronous **base round**. Evaluate its rules once against completed predecessors and the empty current-SCC start state; ground/base outputs become pending. All-negative ground rules get one empty binding. Merge pending at the end of the round.
3. After a nonempty delta, pay a new synchronous **recursive round**. Evaluate only rules with current-SCC positive body atoms, covering every delta position; other current-SCC atoms use full accumulated sets and predecessors use fixed full sets. Base-only rules are not repeated. Merge deduplicated new pending facts at round end.
4. The final **no-change verification round is charged**, including a zero-eligible-rule verification round for a nonrecursive singleton after its nonempty base output. A component whose base is empty finishes in one round; a nonempty acyclic singleton takes two under this deliberately uniform policy. Do not silently elide those charged rounds as an optimization.
5. Increment/check one global component_rounds against the new API's max_rounds allowance **before** each base/recursive/verification round. Return per-component round counts only as additive detail whose sum equals the global count. The existing allowed max_rounds range can remain 1..2000, but its new-API meaning must be explicitly documented.

If a successful wave adds facts, it adds at least one distinct current-component IDB tuple. Therefore, without the explicit round cap, the global count is at most the number of distinct IDB additions plus the number of IDB SCCs. With the existing <=100000 total fact cap and <=128 relations this is already finite; the explicit <=2000 component-round allowance is the tighter operational limit. This is a logical termination/accounting bound, not a time guarantee. Old positive APIs retain their original global-wave schedule and counter definitions.

Define new work as **W = W_positive + W_expression + W_negative**:
- W_positive preserves the original unit per positive candidate tuple before unification/constant checks.
- W_expression preserves the original complete-filter AST precharge and UTF-8 comparison-byte units; every filter still runs even after false.
- For each complete positive binding whose filters all return true, calculate the negative group charge **sum(1 + arity(atom))**. Check it against remaining global max_work by checked subtraction before performing the group. Then perform/count every negative membership test, including empty, matching and absent cases, before deciding whether the binding survives; do not short-circuit that group's logical tests. Count negative_membership_tests separately, one per atom. IDs make the key width bounded; this charge is a defined logical unit, not a measured cycle or string-byte hash cost.
- Every repeated candidate produced by overlapping semi-naive variants pays its own inherited filter and negative charges before head/pending dedup. A repeated grounded negative within a rule also counts as its own occurrence unless the contract separately forbids it.

Keep the new max_work range 1..50000000 and perform checked counter arithmetic. Input/parse/graph/index-allocation costs remain separately structurally bounded and are **not** magically included in this work metric. Returning per-phase components makes reconciliation explicit; their sum must equal the new work total. This does not certify full allocator accounting, adversarial hash CPU, cancellation latency or wall time, and it must not be reported as the legacy work counter for a SQL plan.

**Structural-cap recommendation:** count positive and negative relational atoms together under the existing 16-body-atom bound, rather than silently allowing 16 of each or unbounded negative lists. Keep the 128-rule/128-relation/64-variable/arity-8/program-byte bounds and separate inherited 16-filter/AST caps unless an explicit new contract changes them. The signed dependency multigraph then has at most 2048 body occurrences before edge dedup; canonical diagnostic sorting is additional bounded work. The strict new IR budget model must describe its actual limits, not claim automatic compatibility with the old filter-free decoder.

### SQL hypotheses, not measurements

ANTI cannot increase its left rows, but the **positive candidate join before it can still explode**. Use positive candidate bounds for admission; do not assume negation selective enough to fit. Count/materialize lower sets and all positive/negative relations within the global IDB/fact/resource model. Right duplicates may be physically optimized for pure-equality anti joins, but input validation, scan/decode and EDB set construction still cost work.

A whole-program SQL plan can exploit vectorized scans, hash joins, predicate restrictions and shared CTEs, while multiple materializations/hash tables and DISTINCT stages may increase peak memory. A native one-shot call pays host list materialization and cannot spill its private STL state. Which wins at <=512 retained storage rows is an empirical question; SQL compilation and wide five-slot key processing may dominate small cases.

Upstream external hash joins use buffer-pool/spillable intermediate layouts and dynamic memory control. That paper is support for a memory-mechanism hypothesis, not a result for this prototype, and the source itself distinguishes nonspillable allocations. DuckDB docs also warn that combinations of blocking operators can still OOM. Never remove native caps or widen the store cap because DuckDB supports external processing. [Saving Private Hash Join, VLDB 2025](https://www.vldb.org/pvldb/vol18/p2748-kuiper.pdf), [2.0 workload limitations](https://duckdb.org/docs/2.0/guides/performance/how_to_tune_workloads)

Retain the existing distinction:
- storage: bounded retained history (512 rows), original commit/storage limits and all-row validation;
- direct native: <=100000 temporal inputs, <=100000 distinct active+IDB facts globally, bounded rounds/work/dictionary/output;
- SQL planner: existing <=512 visible input and <=65536 candidate/IDB proof allowances, <=16384 output allowance, plus native semantic-budget proof;
- binding callback batch: aggregate tuple/cell/byte caps, not merely per-program caps.

Do not silently redefine max_facts per stratum, reset max_work every SCC, return completed lower answers after a higher failure, count negated input only when it matches, or relabel native counters as SQL execution counters.

## 10. Diagnostics and review gates

Proposed codes below are **names for coordinator consideration**, not implemented API:
- TD_E_NEG_UNBOUND: a variable in a negative atom is absent from the complete positive relational binding set;
- TD_E_NEG_CYCLE: a signed dependency SCC contains a negative edge;
- incompatible signed-plan schema/version: owned decoder rejection, not a positive-parser fallback;
- incomplete/future negative relation at execution: internal plan invariant failure, no partial answer;
- inherited undefined predicate, arity, syntax/literal, expression, input/temporal and budget errors retain their meanings.

A diagnostic contract should choose canonical predicate names and a canonical negative-edge witness/SCC independent of incidental source IDs; retain source spans separately for useful location information. For unbound-variable errors sort names and identify the canonical rule/negative atom. Static checks must run even behind empty relations or irrelevant answers. Exact code/priority/witness ordering belongs in the settled contract and independent oracle fixtures.

Before implementation, require:
1. settled signed grammar, whole-rule binding rule and stable invalid-program diagnostics;
2. versioned owned IR (polarity, SCC/stratum metadata or enough validated facts to recompute it); no reinterpretation of strict td.program_ir/1 keys;
3. explicit eager-filter/anti order, positive-SCC base/delta schedule, ground-negative and empty-lower handling;
4. global cap/round/probe accounting and old positive counter compatibility;
5. unchanged exact typed/BLOB/temporal/DOUBLE-bit and continuous FP premise;
6. unchanged item-3 trust rejection; dependencies not declared accepted by native feasibility;
7. independent stratified oracle, including empty/skew/duplicate/cross-type/history/reordering cases, and authorized real-runtime checks on a new confined candidate only.

See benchmark-and-explain-plan.md for unrun concrete cases and evidence fields.

## 11. Retrieval issues and renewal outcome

- A guessed exact-ref src/optimizer/pushdown/pushdown_join.cpp returned 404. Reading the exact-ref directory located pushdown_semi_anti_join.cpp and pushdown_mark_join.cpp; the actual files were then fetched and inspected. No inferred missing code was substituted.
- Direct web opens of exact GitHub/raw source URLs missed the web cache. The authenticated GitHub read connector returned the approved public exact-ref UTF-8 files. This was source research, not a restricted-target bypass.
- The original paper link for Unnesting Arbitrary Queries returned 403; proceedings/author-university mirrors timed out. The same primary paper was available as an academic-course PDF and its relevant sections were inspected. The original access errors were not called successful.
- The Wisconsin primary report catalog was available; its PDF had no extracted text in the web tool. No substantive algorithm claim above depends on unread PDF text.
- No runtime, native compiler, project verifier, application, database, benchmark, cleanup, artifact overwrite, Git, PR or Page mutation was attempted.

