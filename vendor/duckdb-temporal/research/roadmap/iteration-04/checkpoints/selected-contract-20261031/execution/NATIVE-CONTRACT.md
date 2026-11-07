# Exact additive native contract proposal — item 4

Date: 2026-10-31 UTC. PRE-CODE PROPOSAL ONLY. No app source edit, compilation, runtime/database/test/benchmark, Git or Page action is authorized or represented here. Existing pure native positive contracts remain unchanged; item3 SQL/store catalog/attachment authority remains unresolved and unaccepted. This document proposes a standalone argument-only native boundary, NOT persisted-store or SQL-planner acceptance.

Target: DuckDB2.0.0 / exact source d54cbbe3df17e8e5ce68312f483b4155836112aa, genuine unstable CAPIv2 and supported Linux x86-64 strict-FP target. No stable-v1 substitute, promised stabilization or production claim.

Version taxonomy is deliberately separate: language td.typed/0.4; owned schema td.program_ir/2; new function td_query_stratified_v1 and compiler td_plan_ir_v2; proposed FUTURE extension artifact0.5.0; actual DuckDB host2.0.0 and unstable C API family2. Existing0.4.0 artifact/build remains untouched. No0.5.0 binary exists or was built in this phase.

## 1. Exact public names and signature

New SQL scalar:

td_query_stratified_v1(
  program VARCHAR,
  facts STRUCT(
    e VARCHAR, a VARCHAR,
    v STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE),
    valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT
  )[],
  valid_at BIGINT, known_at BIGINT,
  max_facts BIGINT, max_component_rounds BIGINT, max_work BIGINT
) -> STRUCT(
  rows STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)[][],
  component_rounds BIGINT,
  derived_facts BIGINT,
  work BIGINT,
  positive_attempts BIGINT,
  expression_work BIGINT,
  negative_work BIGINT,
  negative_checks BIGINT,
  input_rows BIGINT,
  visible_edb_facts BIGINT
).

All seven parameters are required positional-only parameters, no overloads/default SQL arguments. All named fields above are exact order/name/type proposals. No generic rounds field, native-plan authority token or per-component trace array is returned.

New compiler scalar: td_plan_ir_v2(program VARCHAR) -> VARCHAR.
IR schema td.program_ir/2, language td.typed/0.4; complete shape in IR2-CONTRACT.md. No public function executes caller-supplied IR or accepts an IR instead of program text.

New C++ surface (declarations only, not implementation):
- StratifiedLimits {uint64_t max_facts=100000, max_component_rounds=1000, max_work=5000000};
- StratifiedTypedResult: owned vector<vector<Value>> rows; uint64_t fields with the exact nine metric names listed above;
- StratifiedTypedEngine(const std::string &program,int64_t valid_at,int64_t known_at,StratifiedLimits);
- void add_triple(const std::string &e,const std::string &a,const Value &v,int64_t valid_from,int64_t valid_to,int64_t tx_from,int64_t tx_to), with the same owned typed-value contract as TypedEngine;
- StratifiedTypedResult run(), one-shot; no add after run, no copy construction/assignment;
- ProgramIRV2 compile_program_ir_v2(const std::string &program);
- std::string program_ir_json_v2(const ProgramIRV2 &program).

Do not change td_query, td_query_v2, td_plan_ir_v1, Limits, TypedResult, ProgramIR or their public JSON/counter contracts. The new language through a new API has its own component-round metric even for positive-only source. Old positive invocations remain on the original run/evaluate/accounting paths.

### Binding properties and ownership

Both NEW SQL registrations explicitly use:
STABILITY_VOLATILE; NULL_HANDLING_SPECIAL; FALLIBILITY_FALLIBLE; COLLATION_HANDLING_IGNORE.
Do not alter legacy register_query's properties in this item. FP admission is execution-state dependent even for constant facts/program, so no fold/cached-plan exemption is allowed.

Use the real v2 vector/arena/error APIs. Normalize nested carrier representations before retaining primitive views; refresh borrowed views after any possible resize/reserve; no view, pointer or arena handle survives a resize/callback. Catch all native exceptions at the callback boundary; API failures retain DuckDB's API error category. Allocation failures return RESOURCE_OUT_OF_MEMORY, never success/empty relation.

Source52 references: temporal_datalog.cpp:75–108 (Reader preparation),130–146 (arena ownership),149–181 (typed carrier),245–299 (old query),302–327 (IR callback),343–397 (registrations),401–414 (extension entrypoint).

## 2. Exact values, NULLs, time and admission

Logical values are ONLY four tags: NUL-free validated UTF-8 scalar strings, Boolean, signed int64, finite canonical binary64. STRUCT/list above are SQL carriers, NOT new nested logical values. f64 negative zero is normalized to positive zero; finite subnormals remain distinct; NaN/infinity rejected; no cross-tag coercion or JSON-float roundtrip.

program is nonnull,1..65536 RAW BYTES and NUL-free, retaining the inherited byte parser. Identifiers remain ASCII,1..128 bytes. Typed string literals/e/a/payload text are validated NUL-free UTF-8 as inherited. There is NO new blanket whole-source UTF-8 validation pass: ignored comment bytes gain no new admission rule. Existing string escape/decimal/Boolean syntax remains unchanged. The source byte limit must not accidentally reuse the16384-byte term cap. SQL VARCHAR construction may separately enforce host encoding constraints before callback, but this contract does not introduce another native pass.

facts MUST be a nonnull list; [] is the empty EDB carrier. A NULL fact, NULL fact field or NULL tag fails. Exactly one selected payload must be nonnull and the three inactive payloads NULL. Every e/a/string value is validated including INACTIVE history. Tuple/field/tag/interval errors do not become absence.

Raw input_rows counts every supplied temporal row, including duplicates/inactive rows, with hard cap100000. visible_edb_facts counts distinct selected exact triple/3 tuples, NOT raw rows. max_facts bounds visible_edb_facts plus all distinct IDB facts (including ground source facts and pending additions), not retained-history row count.

For each row, validate terms/value and nonempty intervals first, then it may be selected into the execution-local EDB when:
vf<=valid_at<vt AND tf<=known_at<tt.
Visibility construction may interleave with row admission; ALL supplied rows must finish before run/evaluation. No required physical two-pass implementation, and no visibility WHERE may prefilter away invalid inactive history.

valid_at/known_at are arbitrary signed BIGINT clocks at this pure boundary, compared without arithmetic; intervals are strict vf<vt and tf<tt. No implicit wall-clock conversion, last-write-wins, timestamp math or store clock-position rule is added. Later store integration must separately preserve its0<=known_at<=snapshot_position rule and full-retained/same-transaction snapshot. This scalar has no database or transaction lookup.

Fresh supported FP checks apply before typed parsing/admission/state changes, after borrowed host operations that could invalidate assumptions, at run entry, serialization/decode/return boundaries. Compatible controls and trusted callees must persist continuously; observing valid controls once is not permission, repairing controls is forbidden, and equality-only negatives do not relax this premise. Compilation never evaluates partial filters.

Sources: temporal_core.cpp:116–127,173–297,442–455; temporal_value_domain.hpp:25–54,111–188; temporal_float.hpp:23–65; temporal_datalog.cpp:264–289; typed_store.py:56–62,654–686.

## 3. Signed grammar: exactly one new body prefix

New grammar adds ONLY a body relational prefix ! :

program := rule+
rule := atom [":-" body_item ("," body_item)*] "."
body_item := atom | "!" atom | filter
atom := identifier "(" term ("," term)* ")"

term/filter retain the accepted typed literal/variable/bracket-expression grammar. A body has at most16 RELATIONAL atoms counting both signs together, plus at most16 filters. Ground facts are ordinary head-only rules.

No reserved identifier "not". not(...), eq(...), add(...), div(...), true(...), false(...) remain ordinary relation names. !not(...) negates the ordinary relation not. There is NO "not p(...)" keyword alias. !atom and ! atom are both allowed with the inherited whitespace/comment skipping. Prefix !!, negated heads, ![filter], negated conjunction, Boolean expression NOT, wildcard/local existential, assignment, computed relational arguments/heads, functions and aggregates remain unsupported.

Inside a bracket, != remains the existing adjacent two-character comparison operator. The body-level ! is parsed only at the start of a relational body item; != outside a bracket is not a negative atom. ?_ remains an ordinary named variable: repeated ?_ positions are equal and a negative-only ?_ is unsafe.

Binding is whole-rule positive relational binding:
Bind(r) = variables occurring as direct terms in POSITIVE body atoms.
HeadVars, every filter dependency and NegativeVars must all be subsets of Bind(r). Source comma order never establishes a guard/binding priority. Filters and negatives never bind variables. Ground heads with only constant negative/filter terms have one empty positive binding.

Undefined body predicates remain errors for both signs. A defined predicate with an empty selected relation is different: membership is false after its component is explicitly complete. triple/3 remains the only EDB and cannot appear in ANY rule head.

Source52: temporal_core.cpp:133–183,212–235,317–435; temporal_expression.hpp:18–25. The only source-level new token is ! at a body-item boundary; no lexing of identifier names is repurposed.

## 4. Exact deterministic static plan

1. Parse the ENTIRE program under structural caps. No reachability, data emptiness, false-filter folding or answer relevance exempts a rule.
2. Perform the fixed semantic validation priority in section8 before execution or IR output. Negative and filter dependencies are checked from the positive binding set only.
3. Keep relation0 triple/3. Remaining relation IDs follow first parser occurrence, as do rule-local variable IDs. Rule IDs/body relational ordinals/filter ordinals follow source order.
4. Construct body→head edges for every relational atom and sign, including disconnected rules, EDB dependencies, self-edges and duplicated occurrences. Graph analysis may deduplicate identical signed edges; execution occurrences are not removed.
5. Compute SCCs over BOTH SIGNS. A negative edge internal to an SCC is invalid, even if the SCC is unreachable, has no current tuples, has two negative edges, or contains a false filter. No well-founded/stable-model interpretation is attempted.
6. Collapse to a signed DAG. EDB component0 contains relation0 and is complete after full input admission; it contributes zero component-rounds.
7. Assign IDB component IDs1..m by dependency-first topological order. When several components are ready, compare their member lists sorted by (ASCII relation name,arity) and choose the lexicographically least list. No hash-map iteration controls scheduling.
8. Use minimal weighted strata: stratum(C)=max(stratum(pred)+weight(edge)), default0; positive weight0, negative weight1. EDB stratum0. Every same-stratum positive predecessor still FINISHES before a consumer. Component ID/topological rank and stratum are distinct.
9. Run ALL IDB SCCs, including those unrelated to answer, to preserve program-wide reachable scalar faults and resource semantics. At most128 total relation vertices includes EDB, so at most127 IDB SCCs.
10. Execution checks that every predecessor is complete and every negative target is strictly lower stratum/complete. Failure is an internal invariant error, never interpreted as an empty/absent relation or rerouted to another engine.

Plan determinism is for the same source/arguments. Alpha/body/rule permutation can change structural IDs, physical candidate work or which of several runtime faults appears; no permutation-invariant runtime counter/first-fault promise is made. Error-free exact result sets with ample budgets still must match an independent stratified oracle under permitted reordering.

## 5. Exact component waves and positive candidates

Every IDB SCC starts empty, including ground facts; DO NOT globally seed all program facts before component scheduling.

BASE ROUND:
- Check/increment global component_rounds BEFORE evaluating this component's base round.
- Freeze the current component's start-of-round accumulated sets (initially empty).
- Visit all its rules in source-rule order ONCE. Positive atoms use full completed predecessor sets or the current empty component sets; no lower delta is required.
- A rule with no positive body has one empty binding. Thus a ground fact, a ground filter-only rule and a ground/constant-only-negative rule all have the correct one candidate after lower completion.
- Full positive candidate -> ALL filters in source order, including those after false -> if all filters true, full negative group -> if all negatives absent, project head -> global seen/pending dedup/fact admission.
- Pending outputs are NOT visible to another rule in that wave. Merge at wave end.

RECURSIVE / VERIFICATION ROUND after any nonempty delta:
- Check/increment the SAME global component_rounds before the wave.
- Visit current-component rules in source order. Only rules containing current-SCC positive body atoms have variants now; base-only rules are never repeated.
- Visit each such positive signed-body position in increasing source ordinal whose relation delta is nonempty. Exactly that occurrence uses prior delta. Other current-SCC positive atoms use the full accumulated start-of-wave sets; predecessor positive atoms use their FULL completed sets, not old delta.
- Cover EVERY eligible position, including nonlinear repeated recursive predicates. Overlapping variants may repeat a complete binding; it pays filters/negative work again before head dedup.
- Negative atoms are never delta positions. They use only fixed full completed lower sets.
- After all variants, atomically merge deduplicated pending facts; no same-wave consumption.
- Stop only after the charged no-change wave. Even if no recursive rule is eligible, the verification after a nonempty acyclic base wave is charged.

Thus empty component=1 round; nonempty acyclic singleton=2. A completed empty recursive lower component remains a valid immutable empty input to upper negatives. Nonempty waves add at least one distinct IDB fact, so without the explicit round cap total rounds<=derived_facts+IDB_component_count (<=derived_facts+127). All comparisons/additions are checked.

### Positive join policy for exact audit counts

Reuse the published greedy positive-only enumeration category:
- Maintain bindings and used flags ONLY for positive atom occurrences (with a mapping to signed-body source ordinals).
- At each depth estimate unchosen candidates using full relation size or designated delta size, narrowed by an available constant/bound-variable per-column candidate index.
- Choose smallest estimate; tie lowest signed-body source ordinal. Inspect columns in term order; keep the first equally sized index, replacing only for strictly smaller candidates. A zero estimate ends that branch.
- For a designated delta occurrence, discard row IDs before its delta boundary BEFORE charging a positive attempt.
- Charge one positive_attempt BEFORE unification/constant checks of each remaining candidate row, even if those checks reject it.
- Existing lower indexes may be built lazily without changing their frozen logical rows. Negatives use Relation.seen directly and build no extra index.
- Retain EDB row order from first visible occurrence and merge pending relations by relation ID. Do not add sorting of pending tuple sets solely for incidental counter/first-fault determinism; existing unordered-set iteration is not promoted into a cross-platform order guarantee. Static component/rule/variant order is specified; successful final output remains sorted by the inherited typed value order. No general cross-platform candidate visitation or multiple-fault order promise is made.

Index building, estimates, sorting and hash collision CPU are not magically included in one match-attempt unit. The exact accounting oracle must model this selected physical enumeration if testing exact counters; its truth-only naive rounds/matches are not the billing oracle.

Sources: temporal_core.cpp:75–99,479–550,552–602. Old evaluate/run keep their old schedule; this section applies only to the new API.

## 6. Exact global counters and budget edges

Successful result identities:
- input_rows = number of supplied temporal history rows,0..100000.
- visible_edb_facts = number of distinct selected typed triple tuples.
- derived_facts = number of distinct IDB tuples across ALL components, including ground source facts, not just answer.
- visible_edb_facts+derived_facts<=max_facts.
- component_rounds = sum of all charged IDB base/recursive/no-change waves.
- work = positive_attempts + expression_work + negative_work.
- negative_checks is audit count only and is NOT added to work again.

max_facts1..100000, max_component_rounds1..2000, max_work1..50000000, all mandatory SQL BIGINTs checked before conversion to uint64. Values outside these ranges reject. No per-stratum reset.

Positive attempts: one unit as section5/source charge(), using checked remaining-work admission before the operation.

Expression work: for each filter on each complete positive binding, precharge its ENTIRE postfix node count before evaluation; a same-tag string comparison adds ceil((left_UTF8_bytes+right_UTF8_bytes)/64). Charge even filters after false; no truthiness/type coercion. All inherited type/divide-zero/int-overflow/float-overflow/underflow behavior remains. A filter fault aborts before ANY negative group for that candidate. False without fault skips that candidate's negative group only after all filters finish.

Negative group: after every filter is true, compute G=sum(1+arity(atom)) over ALL negative occurrences in that rule. Check G<=max_work-work with checked subtraction BEFORE any membership test. If admitted, increment negative_work by G and work by G. Then perform every exact full-key test in negative signed-body source order, increment negative_checks once per occurrence including defined-empty, matched, absent and repeated identical atoms. Do not stop at the first match. Reject the candidate if ANY membership was present only after the group completes. No second +negative_checks charge.

A complete binding produced by multiple semi-naive variants pays separately on every occurrence, even if its head is already known/pending. Constants/variable IDs form a full inline Tuple; negative checks do not create dictionary values or arithmetic temporaries.

Fact admission: for a projected tuple already in current accumulated or pending, add zero. For a genuinely new tuple, check remaining global max_facts BEFORE inserting into pending, then reserve exactly one pending fact. At merge, transfer that reservation to accumulated without charging a second fact. Earlier completed components remain counted even if a future implementation frees physical memory. This prevents current source's insert-then-check ordering from being copied as a pre-allocation guarantee.

All counters fit uint64 and returned nonnegative BIGINT under the selected caps. Negative_checks<=negative_work; no counter wrap/saturated-success behavior. Parse/input/graph/index construction and hashing/sorting/allocator CPU remain separately structurally bounded, NOT full wall-time/RSS/cancellation accounting.

### Analytically specified tiny accounting fixtures (UNRUN)

For answer('ok') :- !triple('x','blocked',true). and EMPTY input:
component_rounds2, derived_facts1, work4, positive_attempts0, expression_work0, negative_work4, negative_checks1, input_rows0, visible_edb_facts0.
max_component_rounds1 rejects before final verification;2 permits if other limits fit. max_work3 rejects BEFORE the sole arity3 membership;4 permits. max_facts1 permits.

With exactly that one visible blocking triple:
component_rounds1, derived_facts0, work4, positive_attempts0, expression_work0, negative_work4, negative_checks1, input_rows1, visible_edb_facts1.

For answer('ok') :- [1=1]. on empty input:
component_rounds2, derived_facts1, work3, expression_work3, all positive/negative counts0. [1=2] instead yields empty result/one round/work3. A filter [1/0=1] is exported by the compiler but fails at evaluation; it has five AST nodes, so a work cap below5 can reject its AST precharge before division is attempted. These are distinct accounting-vs-fault obligations, not observed results.

## 7. Structural, output, IR and diagnostic caps

Unchanged inherited numeric ceilings in the NEW contract:
- source65536 bytes; term16384 bytes; identifier128 ASCII bytes;
-128 rules;128 relations INCLUDING triple/3;64 variables/rule; arity1..8;
-16 combined positive+negative relational atoms/rule;16 filters/rule;
-256 filter nodes/rule;4096/program; AST height32 including comparison; source syntax nesting32;
-100000 raw temporal rows/invocation;100000 distinct visible EDB+all IDB fact ceiling;
- dictionary<=300000 Values and16MiB admission units (one16-byte Entry/value plus owned UTF-8 bytes), same supported pinned layout;
- max_component_rounds ceiling2000; max_work ceiling50000000;
- logical output row admission<=16MiB per invocation, using exact inherited row model24+40*arity plus emitted string UTF-8 bytes. Verify pinned row model [24,64,104,144,184,224,264,304,344], not an allocator/RSS guarantee;
- callback batch<=100000 answer tuples,<=800000 cells,<=32MiB logical encoded output bytes;
- IR2<=4MiB serialized UTF-8/program;<=32MiB summed serialized UTF-8/callback. Source admission and IR serialization are independent limits; IR1 unchanged.

New result has nine fixed BIGINT fields (72 logical bytes/invocation). Coordinator-selected extension for NEW callback32MiB accounting: batch_encoded_units = sum(40 per typed cell + emitted UTF-8 string bytes) +72*callback_row_count. Precharge72*count with checked arithmetic before new output reserves/construction where possible, then apply the inherited cell/string accounting while writing rows. This retains the32MiB ceiling and tuple/cell ceilings but is a named new-API accounting extension, NOT a silent change to old encode_result or a claim about real arena/struct overhead. Per-invocation16MiB row-admission units remain unchanged. Selection is source-only contract scope, not permission to implement or a passed check.

Logical serialization checks remaining bytes BEFORE appending/copying encoded bytes, including escaped expansion. Do not claim this bounds std::string capacity, allocator growth, DuckDB arena capacity, database materialization or process RSS. Host input-list construction occurs before callback admission and is outside native resource caps; caller budgets remain necessary.

Diagnostic text logical cap=16384 UTF-8 bytes for new structured diagnostic formatting. Static witness IDs/short fixed messages fit that cap; do not echo arbitrary large literal/program text. An unexpected oversized diagnostic falls back to a fixed TD_E_DIAGNOSTIC_LIMIT message, never truncates a machine field or returns success. Legacy formatting untouched.

## 8. Stable diagnostics: exact new-API policy

Same parsed invalid program produces the same semantic code and structural context. Do not promise the same chosen error under permutations of a multiply-invalid source, nor a permutation-invariant first runtime fault/budget count.

Phase labels: request, compile, input, exec, encode. Successful output contains no diagnostic object; errors go through native exception/DuckDB error channels.

Source/structural admission errors (NULL/invalid limits/size/syntax/arity/readonly-EDB-head/invalid text) are fatal when encountered; no error-recovery parser is added merely to gather all malformed-token errors. Existing scalar expression/value codes retain their meanings through new phase-aware formatting.

AFTER successful bounded parse, select semantic classes in this exact order:
1. TD_E_NEG_UNBOUND
2. TD_E_HEAD_UNBOUND
3. TD_E_EXPR_UNBOUND
4. TD_E_PROGRAM_ANSWER
5. TD_E_PROGRAM_UNDEFINED
6. TD_E_NEG_CYCLE

Within class choose lowest source rule index, then relational body ordinal OR filter ordinal as applicable, then variable ID. For undefined predicates this is first offending signed body occurrence. Missing answer has no rule witness. For a negative cycle choose first negative body occurrence internal to an SCC; show rule/body IDs, its edge_body/edge_head IDs and member_count. Do not print a full member/signature/cycle-path list merely for diagnostics: it is unnecessary and can consume the diagnostic byte cap. No copied variable-name table or canonical whole-rule string is required solely for diagnostics.

Examples of exact native semantic messages (the new SQL callback prepends the tracked TD_E_EXEC phase=compile envelope as specified in DIAGNOSTICS.md):
TD_E_NEG_UNBOUND rule=0 body=0 var=0: negative variable has no positive relational binding
TD_E_HEAD_UNBOUND rule=0 var=0: head variable has no positive relational binding
TD_E_EXPR_UNBOUND rule=0 filter=0 var=0: filter variable has no positive relational binding
TD_E_PROGRAM_ANSWER: program must define answer/1..8
TD_E_PROGRAM_UNDEFINED rule=0 body=1 relation=2: body predicate has no definition

A code is the stable machine category; DuckDB may add its own outer exception rendering. Do not wrap all new diagnostics inside a misleading phase=exec when parsing failed. Native API failures preserve their real API category and allocation failures map to OOM.

Exact resource mapping is in DIAGNOSTICS.md. Preserve shared parser/structural/dictionary/positive-work/expression-work/output error spellings where those helpers are reused; do not refactor them solely to manufacture a granular universal TD_E_LIMIT enum. Only new component-round, full negative-group, IR2 encoded-byte and plan-invariant checks require new categories. Existing specific arithmetic/value/FP errors (TD_E_EXPR_TYPE, TD_E_EXPR_DIV_ZERO, TD_E_EXPR_OVERFLOW, TD_E_EXPR_UNDERFLOW, TD_E_EXPR_FLOAT_ENV, TD_E_VALUE_*) are not redefined as absence. Resource counters/failure precedence are separately tested, not copied from the naive truth oracle.

Internal failures: TD_E_PLAN_INVARIANT for uncompleted/future negative target, missing supposedly bound ID, inconsistent graph/strata or improper wave state. Preserve existing one-shot state messages for add-after-run/repeated run. Neither falls back to positive evaluation, lower-prefix output, SQL, or fabricated empty relation.

## 9. Minimal implementation seams, without cloning the engine

A viable future engineering direction is a compile-time semantics policy: Core<Domain,Semantics=PositiveV1>. Existing Engine/TypedEngine/compile_program_ir_v1 explicitly instantiate PositiveV1; new StratifiedTypedEngine/compile_program_ir_v2 instantiate StratifiedV1.

SHARE existing term/literal lexing, UTF-8/tag/float validation, Value/TypedDomain dictionaries, inline Tuple/Relation identity, per-column positive indexes and scalar filter evaluator. The new policy adds signed body parsing/metadata, post-parse safety/dependency checks, canonical SCC plan, its own metric state and stratum runner. New owned IR structs/exporters are separate versioned types.

Concrete adapter hazards: Core currently returns Domain::ResultType and TypedDomain::sort accepts TypedResult (temporal_typed_core.hpp:36–41; temporal_value_domain.hpp:96–100,200–204). A semantics policy therefore needs an explicit new-result adapter or shared rows-only sort helper while preserving the old public result/signature; changing Domain::ResultType globally is not acceptable. The join also needs a positive-position accessor over signed source body storage, not an implicit cast/reinterpretation of SignedAtom as the old Atom. Ground-rule handling must test the full signed/filter rule form, never positive_body.empty() alone.

Do NOT run new sorting/stratification/base-wave/negative billing through legacy run/evaluate; do NOT redefine an old Rule.body as including negatives in code shared with a legacy unguarded loop. Either use distinct policy Rule/Plan storage or a guarded positive-only projection with an explicit signed-position map. Default old compile-time branch must retain existing error/counter/order behavior.

No need to duplicate the entire parser/dictionary/join engine or adopt a private DuckDB C++ operator. But a policy refactor alone is NOT proof of legacy exactness: later authorized differential tests must establish byte-identical IR1, unchanged legacy rows/errors/counters, batching and FP semantics. Old load/build behavior is not claimed verified here.

Likely future source seams (not edited):
- additive temporal_stratified_core.hpp / temporal_plan_ir_v2.hpp for new public types;
- temporal_core.cpp: new compile-time policy branch, signed validator/plan, new runner, owned IR2 export; original policy paths preserved;
- temporal_datalog.cpp: distinct new callbacks, ten-field result encoding and explicit new registration properties; old registration/callback behavior untouched;
- no storage/planner_v1.py or typed_store.py change in this pure-core checkpoint. No schema migration, SQL route, browser UI, native table source, optimizer hook, private authority probe or deployment.

## 10. Authority, verification and stopping boundary

The argument-only core reads only supplied program/facts/clocks/limits. It opens no connection, executes no SQL, reads no table/catalog/file/network, caches no cross-call state and grants no attachment/session permission. Calling it on an admitted full-history snapshot can be a later integration strategy, not an authority bypass.

Do not catch unresolved item3 trust rejection and invoke this API; do not skip attachment checks, weaken fail-closed catalog policy or reinterpret item3 completion from core progress. Public persisted-store/planned-query integration remains BLOCKED until its own exact authority/snapshot contract is accepted. No change to those paths is proposed in this checkpoint.

Later authorized gates must separately establish:
- full static rejection and signed compiler agreement, including not/eq/add/div/!= compatibility;
- independent level-assignment oracle with fixed triple included in vertex count, naive synchronous sets and eager faulting tagged bindings;
- independently specified accounting oracle for exact selected round/work/cap failures;
- ample-budget result reordering versus separate bounded-resource/multiple-fault behavior;
- empty lower recursion, ground/negative-only seeds, all delta positions and ALL disconnected IDB SCCs;
- exact typed/time/NUL/subnormal/zero/batch/owned-byte behavior and continuous FP lifecycle;
- byte-identical old IR1 and unchanged old query contracts/counters;
- explicit no-partial per-invocation/callback result and healthy recovery, without claiming prior externally streamed SQL chunks can be retracted.

Current phase stops at selected/reviewed specification and a frozen manifest. No build, implementation, DB call or test is implied by saving this proposal.

