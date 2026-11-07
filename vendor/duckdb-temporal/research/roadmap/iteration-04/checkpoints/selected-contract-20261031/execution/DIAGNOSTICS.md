# Exact diagnostic mapping for the NEW entrypoints

PRE-CODE specification only. Applies to td_query_stratified_v1 / td_plan_ir_v2; old API helper behavior/formatting/IR1 remain unchanged.

## 1. Minimal transport and logical byte cap

For native td::Error/std::exception domain failures, the NEW callback uses the existing-style envelope with an ACCURATE tracked phase:
TD_E_EXEC phase=P: NATIVE_MESSAGE

P is request, compile, input, exec or encode. Existing coded NATIVE_MESSAGE prefixes remain verbatim; new six semantic codes live in that message. The outer TD_E_EXEC is an envelope, not a replacement of the stable inner domain code. No parsing/rewriting of inherited e.what() strings or new global exception hierarchy is required just to remap every shared helper. Direct C++ APIs throw the native message without the DuckDB callback envelope.

The new callback tracks the stage before program compilation, supplied-row loading, run and result/IR encoding. It must not label a compiler failure phase=exec. DuckDB may add its own host exception wrapper; that outer cosmetic wording is not a native guarantee.

ApiError retains its actual DuckDB API error category; std::bad_alloc maps to RESOURCE_OUT_OF_MEMORY with a fixed best-effort diagnostic. Reporting is fallible, not a no-allocation/RSS guarantee.

New diagnostic logical encoded-byte cap16384. Check it before append/copy, without echoing arbitrary literals/source. Overflow uses fixed native message:
TD_E_DIAGNOSTIC_LIMIT: diagnostic text exceeds 16384 bytes
An oversized external/API detail can be replaced with a bounded fixed message while retaining its real non-success category. Do not truncate a machine field or change failure to success.

## 2. Parse/admission remains inherited unless the feature is new

Fatal structural/token errors are reported as encountered. No error-recovery parser, canonical whole-program error collection or new shared-helper enum taxonomy is introduced.

| Existing source seam | Preserved native code/message category |
|---|---|
| Core constructor116–123 | source empty/over65536, source NUL and numeric hard-range failures retain existing messages; new max_component_rounds parameter uses its accurate new name |
| syntax129–132, identifier145–152 | TD_E_PROGRAM_SYNTAX with byte location, existing quote/identifier/literal syntax details; ! placement uses this same syntax category |
| relation160–171, atom386–395 | existing arity/rule-name conflict and predicate-count messages |
| parse399–416 | existing rule-count, readonly triple-head and16-body-atom messages; signed occurrences count toward that one bound |
| expression_limit299–315, parse_filter358–384 | existing TD_E_EXPR_LIMIT structural node/filter/height/nesting errors |
| TypedDomain / Value constructors | existing TD_E_VALUE_TEXT / TD_E_VALUE_TAG / TD_E_VALUE_PAYLOAD for actual typed literal/fact values |
| raw carrier/add_triple | existing NULL/row-offset/100000-raw-row/strict interval text; invalid inactive history is still invalid |

Program remains1..65536 RAW BYTES/NUL-free. No blanket source-UTF8 or ignored-comment-byte validation is added; typed string literals/e/a/string values remain validated NUL-free UTF8. Syntax-invalid bytes outside ignored positions still fail through existing parsing/value validation. SQL host conversion may fail before native callback, outside this native code-prefix contract.

Whole-rule semantic validation occurs only AFTER successful bounded parse. New mode defers the inherited per-rule head/filter checks to that post-parse selection; old parser branch keeps its original behavior.

## 3. Exact six semantic classes and tie policy

Priority:
1 TD_E_NEG_UNBOUND
2 TD_E_HEAD_UNBOUND
3 TD_E_EXPR_UNBOUND
4 TD_E_PROGRAM_ANSWER
5 TD_E_PROGRAM_UNDEFINED
6 TD_E_NEG_CYCLE

Within class choose lowest source rule ordinal, then signed-body relational ordinal or filter ordinal where applicable, then variable ID. Missing answer has no rule witness. Undefined includes both signs. Variable IDs retain dense first-source-occurrence IDs; no diagnostic-only name copies or normalized rule strings.

Exact native-message templates (integers rendered as canonical decimal):
- TD_E_NEG_UNBOUND rule=R body=B var=V: negative variable has no positive relational binding
- TD_E_HEAD_UNBOUND rule=R var=V: head variable has no positive relational binding
- TD_E_EXPR_UNBOUND rule=R filter=F var=V: filter variable has no positive relational binding
- TD_E_PROGRAM_ANSWER: program must define answer/1..8
- TD_E_PROGRAM_UNDEFINED rule=R body=B relation=P: body predicate has no definition
- TD_E_NEG_CYCLE rule=R body=B edge_body=P edge_head=H member_count=N: negative dependency occurs inside a predicate SCC

For NEG_CYCLE choose first source negative occurrence whose edge is internal to an SCC. Print only this bounded structural witness and count, not a full member/signature/cycle-path list. Static graph analysis still uses both signs and all disconnected rules.

Example answer(?x):-!p(?x). selects NEG_UNBOUND before HEAD_UNBOUND/PROGRAM_UNDEFINED. A defined empty relation is valid only after completion; undefined is never fabricated as empty. Two negative edges, false data/filter or answer irrelevance do not excuse a negative cycle.

Repeated identical invalid source/request yields stable category/context. Reordering a multiply-invalid source can change source IDs/chosen witness. Source-span, runtime multiple-fault and near-budget permutation invariance is NOT promised.

## 4. Runtime/resource mapping: reuse existing categories, add only new checks

| Check / logical admission | Native message/category |
|---|---|
| distinct visible+all-IDB max_facts, pending reservation before insertion | max_facts exceeded; no partial result returned |
| positive candidate unit exceeds remaining global work | max_work exceeded; no partial result returned |
| inherited filter AST/string-comparison work exceeds global work | TD_E_EXPR_LIMIT: max_work exceeded during filter evaluation; no partial result returned |
| new full negative group exceeds remaining global work BEFORE any lookup | TD_E_NEG_LIMIT: max_work exceeded before negative group; no partial result returned |
| new aggregate round allowance before base/recursive/final verification | TD_E_COMPONENT_ROUND_LIMIT: max_component_rounds exceeded; no partial result returned |
| existing dictionary admission | typed dictionary resource limit exceeded |
| existing per-invocation row-output admission | output exceeds 16MiB; no partial result returned |
| callback tuple cap | batch output exceeds 100000 tuples |
| callback cell/byte cap, including NEW72*callback-row-count precharge | batch output resource limit exceeded |
| new IR2 row byte cap | TD_E_IR_LIMIT: IR2 exceeds 4194304 encoded bytes |
| new IR2 callback byte cap | TD_E_IR_BATCH_LIMIT: IR2 callback exceeds 33554432 encoded bytes |
| add after run / repeated run | existing one-shot state messages |
| new impossible completion/stratum/binding/wave state | TD_E_PLAN_INVARIANT: fixed detail naming the violated invariant |

Inherited plain-text rows above retain the source helper messages; do not revise old helpers merely to normalize prose or add granular enums. Stable new error categories are the explicitly new prefixes. Old APIs never receive the new semantic selection, envelope-phase policy or resource categories.

Arithmetic/domain prefixes retain meaning: TD_E_EXPR_TYPE, TD_E_EXPR_DIV_ZERO, TD_E_EXPR_OVERFLOW, TD_E_EXPR_UNDERFLOW, TD_E_EXPR_FLOAT_ENV and TD_E_VALUE_*; none becomes absence. There is no new Boolean truthiness, type coercion or control repair.

Operational priority matters:
- filter AST precharge can fail before its arithmetic fault is attempted;
- all filters run, including after false, BEFORE any negative group;
- if filters all pass, precharge the entire negative group, then perform/count all occurrences without short circuit;
- final verification is charged before discovering no eligible/new tuples;
- raw input cap is separate from visible/IDB fact cap;
- no partial success/lower-prefix answer, alternate route or implicit session repair follows a failure.

## 5. Independent proof and no consumer-input claim

Use independent naive stratified sets/fault-presence with AMPLE budgets. Use a separate accounting specification/oracle for exact selected wave/work/cap failures; naive rounds/matches are not billing. Static diagnostics need explicit single-class and class-priority collision fixtures.

IR2 is compiler output only in this scope. Rejecting arbitrary caller-IR versions/keys/stack metadata is a future consumer obligation, not an implemented decoder or executable roundtrip.
