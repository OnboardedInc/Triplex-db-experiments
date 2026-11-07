# Item 4 selected-contract candidate v1

2026-10-31. **Pre-code contract candidate, not an implementation, test result, production claim or execution permission.** Final adoption requires exact frozen author packets, independent companion-review closure and verified durable checkpoint readback. No application source is changed by this document.

## 1. Scope and version identity

Build a new pure argument-only typed stratified-negation evaluator and owned compiler inspection API against actual unstable DuckDB C API v2 on exact DuckDB2.0.0/source `d54cbbe3df17e8e5ce68312f483b4155836112aa`, Linux x86-64/glibc and the inherited strict-FP premise. Proposed new artifact version is0.5.0; none has been built. Language `td.typed/0.4`, JSON schema `td.program_ir/2`, SQL function version suffixes, artifact version and DuckDB C API version are distinct.

Use the already-published source `52b1e81f1d71590bdefb376e62924c9f717d4344` as immutable baseline. Its280 source files were rehashed exact at17:43:18 UTC (14,821,011 bytes, manifest SHA256 `5e30c8b2dfaaac103c647a42440fb7d6c39d83846cc107913452b4e62db2c384`). The manifest's earlier-parent field is583dd3e1; full prior remote verification established that these bytes match source52. This is not a new artifact-build claim.

No source from later local-only item3 corrections, private authority probes, controllers or stopped saves is part of this baseline or contract. Do not copy, reconstruct or publish that stopped material. No old85-file tree operation is retried or used as a prerequisite.

## 2. Additive public surface

`td_query_stratified_v1(program, facts, valid_at, known_at, max_facts, max_component_rounds, max_work)` has seven required positional-only arguments. Program is VARCHAR; facts use the exact existing typed temporal STRUCT-list; clocks/limits are BIGINT. Its result has these exact ordered fields:

1. `rows`: existing typed cell STRUCT[][];
2. `component_rounds`: BIGINT;
3. `derived_facts`: BIGINT;
4. `work`: BIGINT;
5. `positive_attempts`: BIGINT;
6. `expression_work`: BIGINT;
7. `negative_work`: BIGINT;
8. `negative_checks`: BIGINT;
9. `input_rows`: BIGINT;
10. `visible_edb_facts`: BIGINT.

`td_plan_ir_v2(program VARCHAR) -> VARCHAR` compiles source into owned inspect-only IR2. No function consumes caller IR for execution. Both new registrations are explicitly volatile, special-NULL, fallible and collation-ignore using genuine v2 vector/arena/error APIs.

Keep old `td_query`, `td_query_v2`, `td_plan_ir_v1`, old C++ public types, strict IR1 decoder, exact IR1 bytes and old counters/grammar unchanged. New native C++ types/functions are separate; shared private parser/dictionary/join/filter machinery may use a compile-time signed policy, not a cloned evaluator or an unguarded old loop over negative atoms.

## 3. Signed language and validation

The only new body-level syntax is `!atom(...)`. Preserve ordinary predicate names `not`, `NOT`, `eq`, `add`, `div`, `true`, `false`, `_`; preserve bracket comparison `!=`. `?_` is one ordinary repeated named variable, never a wildcard. Keep existing whitespace/comments, ASCII identifier rules, typed literal/escape/arithmetic grammar and source-byte/NUL admission. Do not introduce a blanket UTF8 pass over skipped comments.

All head/filter/negative variables must occur directly in a positive relational body atom of the SAME rule, regardless of source order. Ground conditional rules have one empty binding. Undefined targets are errors, not empty relations. `triple/3` is the only fixed EDB and cannot be defined in a head. Count both signs together under16 body atoms, with separate inherited filter/node caps.

After successful bounded structural parsing, choose whole-program semantic classes in this exact order: `TD_E_NEG_UNBOUND`, `TD_E_HEAD_UNBOUND`, `TD_E_EXPR_UNBOUND`, `TD_E_PROGRAM_ANSWER`, `TD_E_PROGRAM_UNDEFINED`, `TD_E_NEG_CYCLE`. Within class use lowest source rule, relational-body/filter ordinal as applicable, then structural variable ID. Keep malformed structural-parse failures separate. No multiply-invalid permutation-invariant first-error promise is made.

## 4. Graph, completion and fault protocol

Build body-to-head signed dependencies over ALL predicates/rules. SCC decomposition uses both signs; reject any negative edge within an SCC. Component0 is fixed triple/3. IDB components have dependency-first topological IDs; ready-component ties compare sorted existing relation-name/arity lists. Minimal strata use positive weight0/negative1. Equal numeric stratum never excuses an unfinished positive predecessor.

Admit all supplied temporal rows before evaluation, including malformed-inactive rejection; row validation/visibility selection may interleave. Select once with exact half-open int64 valid/recorded tests. One EDB/dictionary/cut is shared across all components. This argument API cannot certify that an external caller supplied a complete database history.

Each IDB component starts empty. Its base wave visits all defining source rules once against full completed predecessors/empty internal sets. Subsequent synchronous waves cover every eligible INTERNAL positive delta position; other positive inputs are full sets and negatives are full completed lower sets. Merge pending tuples only at wave end. Charge the terminal no-change wave, including the base wave of an empty component. Base-only rules are not repeated. Execute ALL IDB components, including answer-unreachable reachable faults.

Complete positive binding → every scalar filter in source filter order (false does not guard later filters) → only if all true, full negative group → only if every tuple absent, head dedup/admission. Repeated semi-naive variants still pay this barrier. Negatives reuse the existing full-key relation set and shared typed dictionary, not another index or per-column approximation. Do not sort pending tuple sets merely for incidental counter/first-fault determinism.

## 5. Accounting and output units

All limits/counters are global across components. `work = positive_attempts + expression_work + negative_work`; `negative_checks` is not another summand. Positive attempts retain the eligible candidate-row visit model; expressions retain postfix-node/string-comparison billing. After all filters pass, precharge `sum(1+arity)` for EVERY negative occurrence using checked remaining-work arithmetic, then probe/count every occurrence without short circuit. A matched first negative cannot reduce charge or suppress a later check.

Raw `input_rows` differs from unique `visible_edb_facts`. The fact budget covers visible EDB plus all distinct IDB/pending tuples across all components, with no double charge on merge. `derived_facts` counts all IDB, not only answer. Empty components cost1 wave, nonempty acyclic components2; total uncapped waves are at most derived_facts plus IDB-component count. These are algorithmic units, not memory/time/cancellation bounds.

Inherited hard caps remain explicit, with new combined signs and global component rounds:100000 raw rows/facts ceiling,2000 component rounds,50000000 work,128 relations including triple,128 rules,64 variables,arity1..8,65536 source bytes,16384 term bytes,16 filters,256 filter nodes/rule,4096/program,height/nesting32. Preserve dictionary admission300000 values/16MiB units and native output16MiB row units. New callback batch caps100000 output tuples/800000 cells/32MiB logical units include `72*callback_row_count +40*emitted_cells +emitted_string_UTF8_bytes`. The72 charges nine fixed BIGINT fields; old callbacks keep their old accounting. None of these are complete allocator/arena/RSS bounds.

## 6. Owned IR2

IR2 has exact ordered keys `schema,language,relations,rules,answer_relation,dependencies,components,budget_model`. No redundant facts stream. Signed relational occurrences and filters preserve their respective source orders. Literals own validated payloads; int64 uses canonical decimal strings and f64 canonical finite-bit hex. Full postfix filters use13 fixed named opcodes, structural variable IDs and owned literal Values, not enum ABI values/dictionary IDs/borrowed handles.

Independently reconstruct stack shape, one final comparison, dependencies, positive safety, node/height caps, signed graph and full disjoint component/rule partitions. Compilation never executes/folds filters. Future strict-consumer rules are documentation, not an implemented decoder or executable-IR interface.

Encode compact JSON with checked logical byte budgets before append/copy (including escaping):4MiB per program and32MiB per callback. These do not bound spare string capacity or host allocations. Diagnostic text is bounded and cycle witnesses must retain the selected semantic code without requiring an unbounded full-name SCC list. Exact error mapping remains in the final reviewed companion, not a retroactive rewrite of every legacy helper.

## 7. Evidence and gates

Primary research/independent review is already saved in main `ecc8e134b8c130e80b7368ad3e98a2ea89a2cd83`. This contract will adopt exact frozen execution/IR/budget/error, semantic and QA packets by hash; draft reviews remain distinguishable from final selection. The optional compact-IR size derivation is conditional until independently reviewed against exact shapes and fixed budget bytes.

Initial generated semantic oracle scope is tiny filter-free independent abstract ASTs, explicit tagged identity, legal predicate-level enumeration including triple, and naive synchronous full-set saturation. Do not reuse production parser/SCC/delta/hash/IR truth. Filter/barrier faults use hand-derived fixtures plus unchanged item2 regressions; do not claim a new arbitrary binary64 arithmetic oracle. Exact accounting uses a separate ledger, not naive-oracle round counts.

Acceptance needs actual isolated source/artifact identities and scoped execution evidence, independent semantic/temporal/accounting/static/owned-IR checks, old API/IR1/counter regression, continuous-FP and failed-invocation/callback recovery. Every proposed case is presently UNRUN. No-partial scope is one graph invocation/failed callback, not revocation of previously delivered host streaming chunks.

Only after final peer closure and durable contract readback may the coordinator allocate disjoint isolated NEW source ownership. Native compilation/loading/runtime/benchmarks remain separately gated on the frozen candidate, current capacity and narrow campaign review. No source/build overwrites the protected baseline artifacts.

## 8. Held integration boundary

No store/schema/SQL-planner/browser/deployment change is in this native-only milestone. Do not catch a held catalog-authority rejection and force native execution, weaken attachment policy, activate SQL anti-joins or infer an optimizer hook/private authority lease. Item3 remains incomplete/blocked and its stopped save remains stopped. Native-only item4 progress is not complete store-integrated item4 acceptance; the roadmap dependency remains explicit.
