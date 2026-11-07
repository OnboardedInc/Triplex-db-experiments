# Item4 exact signed semantic contract proposal

2026-10-31 UTC. **Pre-code/source-only proposal and review. No implementation, compiler/module/native/database execution, test, benchmark, Git or Page write.** Published source52 was inspected only at the coordinator-approved immutable mirror and exact named files. This document does not accept item3 or activate store/SQL integration.

## Decisions

- Add **body-only `!atom(...)`**, not a `not` keyword. Preserve ordinary `not(...)`, `NOT(...)`, `eq(...)`, `add(...)`, `div(...)`, and bracket `!=` behavior.
- `?_` remains an **ordinary named variable**, with repeated occurrences denoting the same rule-local variable. No anonymous/wildcard variable is added.
- Require positive relational binding for every head, filter, and negative variable over the **whole rule**, independent of comma order.
- Validate the whole program, then complete every IDB SCC in a both-sign dependency order. Evaluate **all** program SCCs, including answer-unreachable ones, to preserve reachable partial-expression faults.
- On every complete positive candidate: evaluate all filters until an actual fault aborts, with false never short-circuiting; only all-true candidates reach all negative membership checks; only survivors reach head deduplication.
- Compile and query through additive names/versioned structures. IR2 owns full postfix filters but is **compiler output only**, never executable caller-supplied IR. Old APIs/IR1/counters stay unchanged.

## 1. Source observations and fresh research

Direct source52 inspection confirms: ASCII identifiers including underscore; `?` followed by that identifier is looked up in one per-rule map with no anonymous-variable branch (`temporal_core.cpp:133–183`); one arity per predicate name (`160–171`); filters separate from relational terms (`358–437`); all filters on complete candidates before head/pending dedup (`460–499`); all rules execute (`552–579`). Source hashes/locations are in `SOURCE-READBACK.json`.

Fresh primary reading confirms the semantic restriction, not a universal syntax. Krötzsch's 2025 invited paper gives non-strict positive/strict negative levels, completed lower negative inputs, and safety based on ordinary body atoms before concrete built-in checks. It also explains that dialect syntax and underscore conventions differ. Its ordinary relational theorems do not establish this project's partial-fault or resource protocol. [Modern Datalog, definitions31–32 and §7](https://drops.dagstuhl.de/storage/01oasics/oasics-vol138-rw2024%2Brw2025/html/OASIcs.RW.2024-2025.7/OASIcs.RW.2024-2025.7.html)

DATALOG-TEXT explicitly gives bare `_` an anonymous meaning, while W3C SPARQL's grammar permits `_` within a `?` variable name. These are useful contrasts, **not authority to replace the existing parser**: this project already treats `?_` as ordinary. [DATALOG-TEXT terms](https://datalog-specs.info/vnd_datalog_text/grammar_atoms.html), [SPARQL1.1 grammar productions143/165/166](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#rVARNAME)

## 2. Exact grammar delta

The following EBNF describes only the new combinator and existing structure; `typed_term_0_3` and `bracket_filter_0_3` mean the **exact published item2 parser**, not a replacement numeric/string grammar:

```text
program       := rule+
rule          := atom [ ":-" body ] "."
body          := body_item ( "," body_item )*
body_item     := atom | "!" atom | bracket_filter_0_3
atom          := identifier "(" typed_term_0_3 ( "," typed_term_0_3 )* ")"
identifier    := [A-Za-z_] [A-Za-z0-9_]*       # at most128 identifier bytes
variable      := "?" identifier
```

Whitespace/comments keep published `skip()` behavior: ASCII space/newline/tab/CR, `%` or `#` to end of line. Existing punctuation spacing remains as implemented, including `need('-')` after a consumed colon; this EBNF does not newly require an adjacent `:-`. `!` may be followed by existing skipped whitespace/comments before its atom. Bracket `!=` still requires adjacent `!` and `=` inside the existing comparison parser.

Exactly one `!` may prefix a body relational atom. Reject `!!p(...)`, negative heads, `![...]`, `!(p(...),q(...))`, empty argument lists, dynamic relation names, computed relational arguments, and negated arbitrary expressions as program syntax. Do not add `not p(...)`, `NOT p(...)`, existential/local negative variables, aggregate negation, or universal negation.

Keep the structural bounds: program1..65536 bytes, <=128 source rules, <=128 predicate names including triple, one arity1..8 per name, <=64 variables/rule, and <=16 **total signed relational body occurrences/rule** (not16 of each sign). Filters have their separate inherited <=16/rule, <=256 total nodes/rule, <=4096/program, AST height32 including comparison, and parser parenthesis/unary nesting32. Negation does not add a second allowance or a recursive term constructor.

Facts remain ground head-only source rules. A **ground head with only ground negative/filter body items is allowed** after referenced predicates are defined and completed. It has exactly one empty binding, not an implicit active-domain enumeration. A negative-only rule with any variable fails safety. A defined empty lower predicate makes a ground negative test true; a body name lacking a permitted definition is an error.

The logical domain is unchanged: string, Boolean, int64, finite float64; canonical signed-zero identity; NUL-free validated UTF8 logical strings; no cross-tag cast and no nested logical STRUCT/list/map. STRUCT is the external carrier/schema. Program NUL rejection is explicit in the current constructor; quoted typed text is validated when interned. Do not infer a new whole-program UTF8 pass over ignored comments or broaden ASCII identifiers to another language's Unicode grammar.

## 3. Variables, safety, and structural ordinals

Retain rule-local dense variable IDs assigned at first source occurrence, including the head and interleaved expression terms. A name is reused through the same rule's map. Variable names need not be copied into IR or diagnostics merely to improve messages.

Let `P(r)` be variable IDs occurring as direct terms in **positive** relational body atoms. Require:

`negative_vars(r) ⊆ P(r)`; `head_vars(r) ⊆ P(r)`; `filter_dependencies(r) ⊆ P(r)`.

Filters and negative atoms never add members to `P(r)`. Query arguments do not waive rule safety. Variable occurrences in other rules do not bind this rule. `?_` obeys precisely these checks: it may be projected/bound/repeated, but a negation-only `?_` is unsafe. A quoted `'_'` is a string literal, not a wildcard. Bare `_` is an identifier where identifiers are allowed, not a new bare variable term.

For source diagnostics use zero-based ordinals:

- `rule_index`: source rule array index.
- `body_atom_index`: relational atom occurrence index in source order, counting both signs but not bracket filters.
- `filter_index`: bracket-filter source index.
- `variable_id`: existing per-rule first-occurrence structural ID.

No canonicalized whole-rule representation, variable-name copies, or alpha-renaming framework is needed for these diagnostics.

## 4. Whole-program validation and exact static priority

Old entrypoints preserve their current parsing, safety and message precedence. The following applies to the **new additive API/compiler only**.

First complete lexical/literal/structural parsing under the existing caps, including one arity per relation name, read-only `triple/3` head restriction, literal admission and syntax/cap failures. A first encountered malformed token/literal/structural limit may abort parsing; no promise is made to find a later semantic error before that failure. No scalar filter is evaluated or constant-folded during parsing/compilation.

After successful structural parse, inspect **all rules** and select the first nonempty class in this fixed order:

| Priority | New API code | Condition | Within-class selection |
|---:|---|---|---|
| 1 | `TD_E_NEG_UNBOUND` | A negative variable is outside positive binders | Lowest rule index, body-atom index, variable ID |
| 2 | `TD_E_HEAD_UNBOUND` | A head variable is outside positive binders | Lowest rule index, variable ID |
| 3 | `TD_E_EXPR_UNBOUND` | A filter dependency is outside positive binders | Lowest rule index, filter index, variable ID |
| 4 | `TD_E_PROGRAM_ANSWER` | No defining `answer/1..8` source rule | One fixed message |
| 5 | `TD_E_PROGRAM_UNDEFINED` | Any signed body target has no definition, except fixed EDB `triple/3` | Lowest source rule and body-atom index |
| 6 | `TD_E_NEG_CYCLE` | A negative edge is internal to an SCC of the both-sign graph | Lowest source negative atom satisfying that condition |

Messages include the code and applicable ordinals; undefined/cycle diagnostics may use already-owned relation names/arity. A cycle path is not required. Optional SCC members, if shown, are sorted by existing relation signature. These are stable same-program messages, not a promise to select the same occurrence after source permutations of a multiply-invalid program.

The dedicated head code does not depend on whether filters exist. Old positive APIs retain their existing `unsafe rule` / expression-unbound behavior. New typed binding error transport must preserve the chosen code in its diagnostic text instead of disguising negation safety as generic parse failure; low-level native API, allocation and inherited FP/input errors retain their own categories.

**Deliberate priority consequences:**

- `answer(?x) :- !p(?x).` selects **NEG_UNBOUND**, even if the head is also unsafe and `p` is undefined.
- Ground `answer('x') :- !p('x').` selects **PROGRAM_UNDEFINED**.
- A range-safe program with a negative cycle but no answer selects **PROGRAM_ANSWER** first.
- An unreachable negative cycle is rejected once earlier classes are absent; an empty database or contradictory filter cannot waive it.

After static validation, successful input admission must finish before execution. If malformed rows, limits, or FP failures compete, the actual inherited binding/row traversal determines which encountered failure is returned; no universal malformed-input or resource permutation priority is promised.

## 5. Signed graph, minimal strata, and deterministic component schedule

For every signed body atom `B` in a rule headed `H`, include `B → H` with weight0 for positive and1 for negative. Retain both signs if both occur. Include fixed `triple/3` as a graph vertex. All definitions of one predicate share that vertex; same-name arity overloading remains rejected.

Compute SCCs using **both signs**. Reject each negative edge whose endpoints lie in the same SCC. In an accepted program all internal SCC edges are positive. Condense to a DAG using both signs. Negative cycles are rejected even if they have two negative edges, consist of ground tuples that might admit a finer semantics, are unused, or are contradicted by other body items.

EDB component0 contains only `triple/3` and is completed after successful carrier loading. Schedule IDB components by predecessor-first topological order. Among simultaneously ready components compare their sorted member lists of `(ASCII relation-name bytes, arity)` lexicographically. These names/arity already exist; no new variable-name retention is necessary. Number IDB components1..m in that schedule.

Assign minimal numeric level on the condensed DAG:

`level(C) = max(level(B) + weight(B→C))`, default0; EDB level0.

Positive input permits equal numeric levels, negative input requires a strict increase. **A positive predecessor SCC at the same numeric level must nevertheless complete before its consumer begins.** Numeric stratum equality is not permission to read an unfinished predecessor or a consumed delta as its full relation.

Within a component, process defining rules in source order. Base and recursive waves are synchronous: outputs remain pending until wave end. Recursive variants cover every current-component positive delta position in relational source order; all other positive inputs use accumulated/full sets. Negative targets always use their completed full sets. Base-only rules receive one complete evaluation against full lower inputs, even if lower delta cursors are exhausted.

The schedule defines SCC/rule/variant order. Existing positive join choice may use the smallest current indexed candidate list with source-position tie-break. Unordered pending/candidate storage is **not** promoted into a public first-fault ordering or cross-platform cost guarantee; no new canonical sorting subsystem is required merely for that promise. Full successful answers retain the existing logical sorted-set output.

Evaluate **all IDB SCCs**, not only answer-reachable ones: the published core evaluates all rules, and pruning an unqueried component could hide a reachable scalar fault. Return the answer only after every required SCC has completed successfully.

## 6. Candidate/fault/negative protocol and completion state

For each rule invocation/variant:

1. Enumerate a complete binding satisfying **all positive relational atoms**. If that join is empty, no binding and no filter evaluation occur. Zero positive atoms with no variables produce one empty binding.
2. Evaluate filters in filter source order, under existing checked arithmetic/FP semantics and existing AST/byte precharges. False records a false conjunction but does not skip later filters. An actual fault aborts immediately; the contract does not require continuing after an error.
3. If any filter was false and none faulted, discard the binding without negative probes. If all were true, precharge the full negative group `sum(1 + arity(atom))` against remaining global work, then perform/count **every** negative membership decision, including repeated/empty/matched/absent targets.
4. Only when all negative tuples are absent may the head be projected and deduplicated against accumulated and pending facts.

A matching negative, a constant false ground negative, an already-present head, or an empty negative relation cannot bypass step2. Positive helpers can intentionally restrict later candidates; inlining them is not automatically fault-preserving.

Completion is explicit state, not inferred from relation nonemptiness, delta size or numeric level. Set it only after the component's successful final no-change wave, including an empty base wave. Before each negative decision, its target must be completed and every variable bound; otherwise fail closed as an internal negative-state failure, never interpret that condition as absence. This is not a static-program diagnostic, expected valid-program result, or invitation to trust external IR hints.

The finite fact-domain argument remains valid: heads/atoms contain constants or copied bound values; arithmetic temporaries cannot extend the relation dictionary. Fixed lower negatives and successful fixed scalar tests leave the current-SCC consequence operator monotone over a finite active domain. This proves successful saturation, not selected fault precedence or a practical wall-time bound.

## 7. Temporal and input-admission boundary

Keep the existing direct integer test:

`valid_from <= valid_at < valid_to` and `tx_from <= known_at < tx_to`.

Validate every **supplied** carrier row's entity/attribute/value/intervals before its own visibility selection. Validation/selection may interleave; visible facts may be inserted as rows load. On successful admission, **all supplied rows finish loading before any rule execution or returned result**. Malformed inactive history still rejects. Neither a physical two-pass loader nor visibility-prefiltering is required/allowed as a semantic substitute.

The direct API can validate only its supplied carrier; it cannot prove that an external caller supplied an entire database history. Future authorized store integration must preserve the current all-retained carrier query and one owned transaction/cut. The existing store uses no visibility WHERE in `NATIVE_SQL`; that is a separate integration obligation, not a reason to activate the held path now.

All components share one selected EDB set and one execution-local typed dictionary. Negative membership never rereads a newer table or different `(valid_at,known_at)` pair. No cross-call lower-relation/result cache, interval-valued complement, new time convention, or callback-cancellation capability is introduced. Native full-int64 point handling remains distinct from existing store point-admission rules.

## 8. Additive API and owned IR2 assessment

The execution lane's exact proposal is semantically compatible:

`td_query_stratified_v1(program, facts, valid_at, known_at, max_facts, max_component_rounds, max_work)`

uses the existing typed temporal carrier and returns rows plus `component_rounds`, `derived_facts`, `work`, `positive_attempts`, `expression_work`, `negative_work`, `negative_checks`, `input_rows`, `visible_edb_facts`. `work = positive_attempts + expression_work + negative_work`; negative_checks is detail, not a second charge. Counters are global across components; old `rounds`/work semantics are untouched. Ground/base seeds occur once through rules, not a second facts stream. A separate accounting ledger must verify exact cap/error events.

`td_plan_ir_v2(VARCHAR) -> VARCHAR` exports owned `td.program_ir/2`, language `td.typed/0.4`. The reviewed draft has signed relational source-order atoms, source-order filter arrays, exact owned typed literal forms, 13 named postfix opcodes, reconstructed dependencies, bounded stack/height/nodes, and checked derived graph/component metadata. No redundant `facts` array is needed. Per-program4MiB/per-callback32MiB encoded-byte limits are explicit new logical output limits, not RSS promises.

Compilation and serialization never evaluate/fold filters and never call `add_triple`, `run`, SQL execution or an expression evaluator. Full postfix export does **not** turn IR into executable input. No new caller-IR execution API or decoder is in scope; future-consumer validation rules are documentation, not an implemented runtime component. No private enum values, dictionary IDs for literals, borrowed views, native/engine handles, snapshot contents or authority leases cross the owned boundary.

New registration should be explicitly VOLATILE, fallible, special-NULL and collation-ignore under actual C API v2, maintaining fresh FP admission and continuous supported controls. This recommendation changes no old registration or claimed engine ABI stability.

`td_query`, `td_query_v2`, `td_plan_ir_v1`, old `td.program_ir/1`/`td.typed/0.3`, strict old decoder keys and old counters stay unchanged. Do not send IR2 to the old decoder, add polarity fields to schema1, add SQL anti-joins, modify store/planner dispatch, bypass guards, or treat pure native acceptance as item3 authority repair. SQL/store integration remains explicitly held.

## 9. Reordering claims and independent acceptance

Ordinary stratification establishes completed relation-set independence from legal stratification. The inherited partial-error/resource extension needs separate evidence. Under ample limits and supported deterministic scalar operations, compare successful full answer sets and required fault presence under rule/body permutations. Do **not** promise selected first fault, exact work, near-cap outcome, source span, or multiply-invalid diagnostic occurrence remains invariant.

The independent tiny oracle must not share the production parser/SCC/index/delta/filter evaluator. Enumerate supported tagged bindings including those that later cause scalar type faults. Preserve the eager-filter barrier before negation and head deduplication. Enumerate legal levels over **all P predicates including fixed triple=0**, levels0..P−1; a loose P^P bound or P^(P−1) with triple fixed is finite. Zero variables means D^0=1 empty substitution. Use independent naive synchronous saturation, and a separately specified event ledger for new counters and cap failures.

Mandatory cases are specified in `ACCEPTANCE-OBLIGATIONS.md`: safe/unsafe repeated `?_`, keyword nonreservation, negative-only ground rules, same-level positive predecessors, all defining rules completed, positive/nonlinear recursion with fixed negatives, every negative-cycle pattern, all-filter fault controls, unreachable runtime faults, temporal corrections and inactive invalid rows, exact admission domain, old API/IR compatibility, owned IR postfix/serialization properties and aggregate limits. All remain **UNRUN**.
