# Final source-only companion review — QA revision 002

2026-10-31 UTC. **No blocking contract contradiction found in the exact frozen execution packet reviewed below, together with the identified root candidate.** Recommend closing this pre-code companion-review gate. This is not implementation acceptance, execution permission, a completed oracle campaign, or store/item3 acceptance. All proposed app/compiler/oracle/native/DB/test/benchmark cases remain **UNRUN**.

QA001 and the execution owner's files were not changed. This addendum supersedes draft-only/error-name proposals in QA002 DRAFT-FINDINGS.md and resolves the still-open companion/result questions in historical QA001; it does not rewrite that frozen history.

## 1. Exact reviewed identities

Owner directory: `.agent-logs/goal4-contract-execution/revision-001/`.

Owner freeze observation: `2026-10-31T17:44:20.271717+00:00` in FROZEN-READY.json. All **eight** manifest-listed files were read as text and independently rehashed/size-checked against the frozen manifest; every identity matched. This is file-identity evidence only, not an app/test pass.

| File | Bytes | SHA256 |
|---|---:|---|
| SHA256-MANIFEST.json, self-excluded by owner | 1512 | `4615f510898a14ffd3cc1145e826113b42cf41d0b4891e0e10922a73b405deb5` |
| NATIVE-CONTRACT.md | 31269 | `1160eb56cabf5468c1115931d95395be3350f45e8448f45f417cf49e4d55822e` |
| IR2-CONTRACT.md | 9890 | `c680654909a0b480889feb193e4d30395ea525ef1466fca070f1744b09314bd6` |
| BUDGET-MODEL.json | 1741 | `45a0cf56a1656cd8cc6cd45985226e6c5e90f49792f736630ff385c6e8c18d73` |
| DIAGNOSTICS.md | 8690 | `1465cc039786db2bb5699f7f275b4afafa15daad6bbd2b04c11baed1f2a29aae` |

The other four frozen files are FROZEN-READY.json, SOURCE-INVENTORY.json, SOURCE-MAP.md and progress.jsonl. Complete hashes/actual lengths are in OWNER-FROZEN-READBACK.json. Source inventory/map statements are owner-provided provenance; this reviewer did not broaden the original engine-only app-source read scope to the extra store/FP files named there, or independently repeat the coordinator's whole-tree/remote verification.

Root candidate contradiction check: `.agent-logs/goal4-contract-coordinator/proposal-001/CONTRACT.md`, 11028 bytes, SHA256 `1230df6e474341cabcf277fae4b170796b5a6927b0010edf760e88fb9c92d3c6`. That candidate is an observed proposal, **not claimed frozen**. A change to it or the owner packet requires a scoped delta review before this recommendation is reused.

Readback shell chunks include `00a325`, `fe5102`, `8b99f9`, `00e16a`, `e084d5`; a truncated combined display was closed with a targeted reread of the native accounting/output section. No compiler/module/app was invoked.

## 2. Earlier material findings are resolved

| Earlier draft issue | Frozen disposition |
|---|---|
| New blanket UTF8/comments admission pass | Removed. Source retains inherited 1..65536 raw bytes and global NUL rejection; ASCII identifiers and typed literal/e/a/payload validation remain. Host VARCHAR conversion may independently reject before callback. |
| Mandatory pending tuple sort for incidental order | Removed. Keep specified static component/rule/variant order, not a cross-platform unordered tuple visit/first-fault promise. Final successful rows still use inherited typed sort. |
| Full SCC name/signature diagnostics can exceed 16 KiB | Removed. NEG_CYCLE now exports only first internal negative occurrence's rule/body, edge-body/head IDs and member_count, preserving the category under bounded normal witnesses. |
| Missing exact result/budget/error mapping | Closed by frozen ten-field signature, fixed budget object and DIAGNOSTICS.md. New work/IR/round categories are explicitly distinguished from inherited leaf messages. |

No implementation is claimed to have fixed these issues: these are corrected specifications, and their later checks remain UNRUN.

## 3. Exact public result and accounting reconcile

The new query has seven required positional arguments:

`td_query_stratified_v1(program, facts, valid_at, known_at, max_facts, max_component_rounds, max_work)`.

Program is VARCHAR, facts is the exact existing typed temporal STRUCT-list, clocks/limits are BIGINT. Facts NULL is not empty; `[]` is empty. The final parameter is **max_component_rounds**, not QA001's provisional max_rounds label. Old API parameters/types remain unchanged.

Exact ordered result fields: `rows`, `component_rounds`, `derived_facts`, `work`, `positive_attempts`, `expression_work`, `negative_work`, `negative_checks`, `input_rows`, `visible_edb_facts`. Rows use existing typed cell[][]; all nine metrics are BIGINT. No generic rounds field, authority token, per-component trace or caller-IR execution overload exists.

Confirmed identities and ordering obligations:

- `work = positive_attempts + expression_work + negative_work`; negative_checks is audit only.
- input_rows counts raw supplied history, including duplicates/inactive rows; visible_edb_facts counts selected distinct exact triples; derived_facts counts all IDB, not merely answer. Visible EDB plus all IDB/pending consumes one global fact cap.
- All input admission finishes before run; half-open int64 comparisons and one selected cut/dictionary feed every component. No native claim certifies externally supplied history completeness or store authority.
- Every IDB SCC starts empty and pays a base round; later waves cover every eligible internal-positive delta occurrence. Pending is not same-wave input. Completed predecessor positives are full sets, not exhausted deltas. Ground conditional rules have one empty binding and are not unconditional seeds.
- Terminal no-change verification is charged, including zero-eligible acyclic verification. Empty component costs 1; nonempty acyclic costs 2. All disconnected defined components run; global rounds/work/facts/dictionary budgets never reset.
- Complete positive binding -> all filters even after false -> if all true, precharge every negative occurrence as one group -> probe all occurrences, no first-match short circuit -> only then head projection/dedup/fact reservation. Repeated delta variants are separately billed before dedup.
- The existing positive candidate/index policy and new signed-position map are described without pretending naive full-set oracle work equals physical billing. Source-order static ties do not promote unordered tuple iteration to a portability/fault-order guarantee.

The QA001 small hand-derived semantic/accounting examples remain useful after renaming the new rounds parameter. None depends on a promoted cross-platform tuple order. The final field names allow direct reconciliation; failed calls return no valid result struct or provisional counters.

## 4. Exact budget and output-unit check

The 45-key `td.stratified_budget/1` object matches the native/IR2 hard bounds and model names: 128 relations including triple/3, at most 127 IDB SCCs, 128 rules, 16 combined signed relational occurrences/rule, separate filter/node caps, 100000 raw inputs and distinct visible+IDB fact ceiling, global component-round/work limits, inherited dictionary and owned output admission, and explicit IR/diagnostic/batch caps. BUDGET-MODEL.json text is 1741 bytes; its exact compact ASCII object is **1511 bytes**.

Root's selected new query callback byte model is:

`72*callback_row_count + 40*emitted_cells + emitted_string_UTF8_bytes <= 33554432`.

Checked precharge of the nine fixed metrics is new-API logical accounting, not real arena/RSS bytes. It does not change old encode_result or the per-invocation inherited `24+40*arity` row model plus string bytes. The IR compiler counts serialized JSON bytes under its separate 4 MiB/program and 32 MiB/callback caps; it does not emit or bill a fictitious nine-metric query struct.

Useful hand unit witnesses, not runs: one unary `'ok'` answer costs 66 native row units versus 114 new callback units; an empty answer still costs 72 new callback units. Zero callback rows cost zero metric units. Boundary tests must cover checked multiplication/global batch sums under a later authorized scope, without inventing host-reachable cardinalities or a capacity claim.

All source/input/graph/index/allocator/hash CPU and host list materialization are not magically included in work or logical-byte metrics. These limits do not prove RSS, adversarial hash time, cancellation or wall time.

## 5. Final error-phase and legacy boundary

The final choice is deliberately **not** a universal new TD_E_LIMIT taxonomy. New callbacks add the accurate stage envelope:

`TD_E_EXEC phase=P: NATIVE_MESSAGE`

where P is request/compile/input/exec/encode. Stable semantic/resource categories live in NATIVE_MESSAGE; direct C++ APIs throw that native message without the callback envelope. Tests should inspect the native category/context and accurate stage, not demand byte identity of DuckDB's additional outer exception rendering.

Phases describe the actual checked operation, not one global phase per helper message: source parsing/static plan is compile; supplied-row loading is input; run is exec; callback result/IR serialization is encode; request validation is request. A visible-EDB max_facts failure during loading differs in phase from a pending-IDB failure during run despite the same leaf message. A filter's structural AST limit is compile; its work precharge failure is exec. Do not guess fault priority across several independently invalid inputs/batch rows or move every caught failure to exec.

Inherited source/arity/NULL/interval/dictionary/positive-work/expression-work/output and one-shot leaf messages stay unchanged where shared. Arithmetic/value/FP codes retain their meanings. New checks use these exact additions:

| Failure | Native category/message |
|---|---|
| Negative group cannot precharge | `TD_E_NEG_LIMIT: max_work exceeded before negative group; no partial result returned` |
| Global next component wave exceeds allowance | `TD_E_COMPONENT_ROUND_LIMIT: max_component_rounds exceeded; no partial result returned` |
| IR2 row exceeds 4194304 encoded bytes | `TD_E_IR_LIMIT: IR2 exceeds 4194304 encoded bytes` |
| IR2 callback exceeds 33554432 encoded bytes | `TD_E_IR_BATCH_LIMIT: IR2 callback exceeds 33554432 encoded bytes` |
| Impossible completion/binding/stratum/wave state | `TD_E_PLAN_INVARIANT` with fixed violated-invariant detail |

The six static semantic classes/source-order priority are unchanged from QA001's semantic-lane proposal. Final NEG_CYCLE uses only bounded edge/count context, not QA001's earlier optional full-member witness. Same parsed invalid source is stable; multiply-invalid permutations need not preserve selected witnesses/codes.

Fresh unsupported FP remains failure with no repair/cached permission. ApiError retains its actual DuckDB category, allocation failure maps to OOM, and an oversized API detail may be replaced by bounded fixed text without changing that non-success category. Diagnostic formatting remains fallible, not an allocation-free guarantee.

Most importantly, do **not** globally "repair" old callback phase formatting or shared helper messages while adding these new envelopes. Old APIs/IR1/registration properties/counters remain on their original policy. A compile-time policy adapter and new result/rows-sort adapter are implementation hazards identified in the packet, not evidence of preserved behavior; differential checks are still required later.

No partial successful graph result may escape a failed invocation/callback, including a later failing batch row after earlier rows were encoded. This does not revoke prior delivered SQL chunks, roll back prior user commits, add cancellation guarantees or bypass a held catalog guard. A fresh healthy subsequent call must be observed later, not inferred from catching an exception.

## 6. Compact IR2 bound review closes conditionally

The exact frozen IR2 now requires compact JSON, exact shapes/order, no facts duplication or copied source/comments, and fixed budget metadata. Against these preconditions, the coordinator's separate candidate bound **2,510,848 bytes** is supported by independent shape counting, leaving **1,683,456 bytes** below 4,194,304. The exact fixed budget is 1511 ASCII bytes, below its 8192 allowance; exact top-level framing is 152 bytes, below 1024.

Details and all cardinality/ownership/string-expansion preconditions are in SIZE-BOUND-REVIEW.md and FINAL-SIZE-COUNT.json. This is a conditional mathematical bound on conforming compiler-produced compact output, **not a runtime serializer test**, memory bound, maximum observed output or blanket guarantee for manually constructed arbitrary C++ objects/future schemas. The independently checked byte cap remains mandatory.

Consequently do not invent a structurally admitted source claimed to exceed 4 MiB. Later bounded-sink unit checks and real callback aggregate tests remain separate authorized options. Any additional exported field, whitespace, duplicated literal representation, relaxed cap or changed schema requires revisiting the proof.

## 7. Scope closure

The initial generated semantic oracle stays tiny/filter-free over independent signed abstract ASTs, tagged identities and level assignments including fixed triple; no production parser/SCC/hash/delta/IR truth is reused. Filter/barrier faults use hand-derived cases plus unchanged item2 regression. No new arbitrary binary64 arithmetic oracle is claimed.

Source-only companion review can close on these hashes. Coordinator selection, durable checkpoint readback, isolated source ownership, compilation/loading/runtime/capacity review, benchmarks and actual acceptance remain separate gates. Item3/store/planned SQL authority stays incomplete/blocked; native progress does not waive it. No Git/Page publication or app mutation was performed by this reviewer.
