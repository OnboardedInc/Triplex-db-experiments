# Proposed owned IR2 contract — pre-code only

2026-10-31 UTC. PROPOSAL, not selected/implemented/executed. Existing td_plan_ir_v1 / td.program_ir/1 / td.typed/0.3 and its exact JSON contract remain unchanged.

## Entry and ownership

New SQL scalar: td_plan_ir_v2(program VARCHAR) -> VARCHAR. New C++ functions: ProgramIRV2 compile_program_ir_v2(const std::string &program); std::string program_ir_json_v2(const ProgramIRV2 &program). Neither compiler function calls add_triple, run, statement execution or any filter evaluator. No public API accepts caller-supplied IR for execution.

The result owns every string, literal and node. It contains no dictionary IDs for literals, process pointers, DuckDB handles, borrowed views, executable callee handles, snapshot contents or cached FP/catalog authority. Fresh FP admission applies to compilation and serialization even for constant inputs; new SQL registration is VOLATILE, fallible, special-NULL, collation-ignore.

## Exact top-level keys and versions

Object keys, in serialization order:
schema, language, relations, rules, answer_relation, dependencies, components, budget_model.

Encoding is COMPACT JSON: no discretionary whitespace outside strings and no pretty indentation. Nested object keys use the exact order written in their shape definitions; arrays use the specified source/ID/schedule order. Use inherited correct JSON string escaping for quotes/backslashes/control bytes and canonical lowercase f64 hex/int64 decimal strings. The4MiB logical cap remains independently enforced; no assertion that every valid source fits or that this cap is reachable has been proved.

schema = "td.program_ir/2"; language = "td.typed/0.4". This is the proposed language-version label, not a claim about an already built extension. No facts array: ground facts remain source rules and are seeded only once during the component base wave.

relations is a dense-ID array of:
{id: uint, name: identifier, arity: 1..8, edb: bool, component: uint, stratum: uint}.
Relation0 is exactly triple/3 and edb=true. All others are IDB, edb=false. Relation IDs retain parser first-occurrence order (triple fixed first); same name must have one arity. <=128 relations total, hence <=127 IDB SCCs.

rules is the full source-order array:
{id: source_rule_index, variable_count: 0..64, head: Atom, body: [SignedAtom...], filters: [Filter...]}.
Every variable ID is rule-local, dense and assigned at first source occurrence exactly as the inherited parser does. No names need be copied solely for diagnostics.

Atom = {relation: relation_id, terms: [Term...]}.
SignedAtom = {negative: bool, relation: relation_id, terms: [Term...]}.
Term = exactly {var: variable_id} OR exactly {const: Literal}.
body preserves RELATIONAL atom source order with polarity; filters separately preserve filter source order. Comma interleaving does not make filters guards, binders or relational atoms. Evaluator positive_positions and negative_positions are derived signed-body indices; negative entries are never positive join candidates/delta positions.

Literal remains exactly one of:
- {t:"str",v: validated NUL-free UTF-8 scalar text};
- {t:"bool",v: JSON Boolean};
- {t:"i64",v: canonical signed decimal STRING in int64 range};
- {t:"f64",v: sixteen lowercase hex digits of canonical finite IEEE binary64 bits}.
No JSON float payload, nonfinite float, negative-zero bit spelling, implicit cross-tag cast, nested logical STRUCT/list/map, or Unicode normalization is introduced.

## Complete portable postfix filters

Filter = {nodes:[Node...], dependencies:[variable_id...]}.
dependencies is sorted, unique and equals exactly the variable IDs reconstructed from variable nodes.

Node has one of exactly these shapes:
- {op:"literal",value:Literal};
- {op:"variable",var:variable_id};
- {op:"negate"};
- {op:"add"} / {op:"subtract"} / {op:"multiply"} / {op:"divide"};
- {op:"equal"} / {op:"not_equal"} / {op:"less"} / {op:"less_equal"} / {op:"greater"} / {op:"greater_equal"}.

No C++ enum numbers or private dictionary operands cross this boundary. Literal Values are decoded/copied from the parse dictionary. Filters remain unevaluated; compile must not fold type errors, zero division, overflow, underflow, or false filters.

Invariants:
1. Exactly one comparison node, and it is last/root; no comparison in an arithmetic subtree.
2. Literal/variable pushes one operand. Negate consumes one and pushes one; arithmetic consumes two and pushes one. Root comparison requires exactly two remaining operands and consumes the expression as one Boolean filter result.
3. No stack underflow; max live operand stack<=32; reconstructed AST height<=32 INCLUDING comparison. Leaf height1; unary height child+1; binary height1+max(children).
4. <=16 filters/rule; summed nodes<=256/rule and<=4096/program. A comparison contributes one node and variables/literals each contribute one.
5. Every variable node is within variable_count and in the whole-rule positive relational binding set. All negative/head variables have the same positive-binder requirement.
6. Source syntax parenthesis/unary nesting<=32 is checked by the native parser before export; discarded parentheses cannot be reconstructed from postfix nodes. This metadata-only IR is not an executable roundtrip proof of arbitrary JSON or source syntax.

## Signed graph, components and redundant data checks

dependencies contains unique {body:relation_id,head:relation_id,negative:bool} edges, derived from EVERY body occurrence. Sort by (body ID,head ID,negative false before true). Duplicate body occurrences remain separate in rules and still count as separate work occurrences.

SCCs use BOTH signs. Reject every negative edge internal to an SCC. EDB component0 contains [0], complete before IDB execution. IDB component IDs1..m are deterministic dependency-first topological schedule order; ties compare sorted member (ASCII name,arity) lists. Component member relation IDs are sorted by that same signature, not incidental hash order.

components entries:
{id:uint, relations:[relation_id...], stratum:uint, predecessors:[component_id...], rules:[source_rule_index...]}.
Predecessors are sorted unique IDs; rules are source-order indices. Stratum is the minimal weighted-DAG level: positive predecessor weight0, negative weight1, max over incoming edges (default0); EDB level0. Same-stratum positive predecessors still complete first. Components, relation.component/stratum and dependencies are mutually checked/derived, not independently trusted hints.

No mixed-rule SQL/native plan, private attachment authority, input-table reference or optimizer hook appears in this IR.

## Bounded encoding and decoding

New per-program IR2 UTF-8 output cap = 4,194,304 bytes (4MiB); cumulative serialized IR bytes per scalar callback batch<=33,554,432 (32MiB). A bounded serializer checks remaining logical bytes BEFORE each append/copy into encoded output, including escaped expansion; overflow/resource failure returns no partial IR. These logical caps do not bound std::string capacity, allocator growth, DuckDB arena capacity or process RSS. Old IR1 has no added cap or behavior change.

Structural hard bounds cap node count4096, signed relational occurrences2048, rule count128, term arity8, relation count128, variable count64, source bytes65536 and decoded text bytes16384/term. The 4MiB cap is independently enforced; no unmeasured claim that every structurally valid program necessarily fits it is required.

FUTURE consumer obligations (not an implemented decoder and not part of the initial caller-input surface): reject duplicate/unknown/missing keys, wrong scalar kinds, unknown version/opcode, out-of-range IDs, non-dense IDs, noncanonical literals, unsafe binders, mismatched dependency sets, invalid postfix stack/height, and inconsistent component/stratum/graph metadata. A future consumer must never invoke an old decoder as fallback. Such validation still grants no execution or database/catalog/FP permission. Initial IR2 is compiler output only; no public/caller IR consumption or executable roundtrip claim is included.

budget_model is exactly the object specified in BUDGET-MODEL.json. Coordinator selected the explicitly new72-byte metric charge as source-only contract scope. It includes exact hard caps, pinned row admission model, work/round model names and IR per-row/batch byte caps. The batch byte-unit extension is a new-API contract only; old APIs/IR1 unchanged. No observed counters masquerade as estimates/proofs. Any later selected change to this versioned model requires consistent schema/document review before implementation.

Program admission remains the inherited NUL-free byte parser, not a new blanket whole-source UTF-8 pass. Typed literal/name payloads exported by IR2 are validated UTF-8 or ASCII; ignored comment bytes are not exported. Thus bounded encoded IR is UTF-8 without changing admission of skipped source comments.

## Inspected published-source seams

- engine/src/temporal_plan_ir.hpp:10–58: existing owned constants/structural variables and immutable IR1 shape.
- engine/src/temporal_core.cpp:608–654: IR1 compiler parses only; filter_count currently opaque; redundant facts mirror is not a second seeding stream.
- engine/src/temporal_core.cpp:658–763: current JSON escaping, canonical int64 strings/f64 bit hex, strict version1 keys.
- engine/src/temporal_expression.hpp:12–25,126–151: fixed private postfix nodes/limits, existing eager runtime evaluation.
- engine/src/temporal_datalog.cpp:302–327,374–397: owned arena copy, compile callback, volatile FP-dependent registration.
- storage/planner_v1.py:197–218,236–269: strict IR1 decoder MUST stay incompatible with IR2 rather than silently ignore signs/filters.

All paths refer only to approved read-only candidate-002 source at published head52b1e81f1d71590bdefb376e62924c9f717d4344.

