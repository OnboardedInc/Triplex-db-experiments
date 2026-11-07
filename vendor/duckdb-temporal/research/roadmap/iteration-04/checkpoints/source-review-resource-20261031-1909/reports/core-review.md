# Independent native-core review — frozen source002

2026-10-31 UTC. **No blocking source defect or selected-contract contradiction found in the exact scope below.** The independent SOURCE-ONLY core-review gate may close on these identities. This is not compilation, runtime/correctness acceptance, legacy differential proof, capacity approval, store integration or production evidence. All compiler/preprocessor/linker/build/native/module/DB/oracle/test/benchmark stages remain **UNRUN**.

## Exact scope and identities

Selected contract: coordinator-confirmed private main `6d7f2a89ad1ba9ac0f83fd2d3bb5fa0a58e39022`; local selected-contract staging files were read and independently hashed. Contract/semantic/QA companion read identities are in `contract-read-identities.sha256`.

Owner manifest `.agent-logs/goal4-native-core/revision-001/SOURCE-FREEZE-002.json`: **1785 bytes**, SHA256 `9d3e4bd64d42c46acdfe1fb86495d52f855257742b5ccd70d97f75b0c06f8ed5`. All three manifest entries were independently size/hash-verified. Core was read only from the immutable `frozen-source-002/engine/src/` copies after explicit release; no transient candidate core was used.

| Frozen file | Bytes | SHA256 |
|---|---:|---|
| temporal_core.cpp | 86377 | `cbd8cf1ec8ba6a7ae103a9f257b049299e45f7ccd1e1d168e77d0c94c69dd035` |
| temporal_stratified_core.hpp | 1459 | `84c104e344032e3d5c0cfe119a1a68ca9abb5fa22a8b13c3d2697f68b0fe63a9` |
| temporal_plan_ir_v2.hpp | 2407 | `1c322e1f14a6dd56c403efb50db8448278adce0d48c63319adfc203da17f9ef7` |

The six explicit helper/public dependency headers were read from immutable source52 and independently compared byte-for-byte/hash against current candidate counterparts after the owner confirmed they were unchanged: temporal_core.hpp, temporal_typed_core.hpp, temporal_plan_ir.hpp, temporal_value_domain.hpp, temporal_expression.hpp, temporal_float.hpp. Each matches. Owner receipt `DEPENDENCY-IDENTITIES-001.json` SHA256 `204dcad55367f7ff3c100506666a3ff7866e9f9117f7193d3acd1ed27298f9b8` agrees with independently observed hashes. This is the explicit dependency boundary, **not a whole-tree freeze**. Baseline full core SHA256 is `c583da8f2d885b28396e74771697601b6ba1a33828690ebdd62a95b33653be84`.

All core line references below refer to immutable core002. Supporting dependency references explicitly name their unchanged source52 file. No app source edits, Git/Page mutations, later item3 probes/controllers/stopped backups/old85 staging, or denied session paths were used.

## Source findings

### 1. Signed parser and semantic selection

- Lines 79–85 keep positives in original `Rule.body`, negatives in separate storage, and a signed source-order map. Old unguarded positive joins never receive a negative atom.
- Lines 162–425 retain inherited ASCII names/comment skipping/term/numeric/filter grammar. Body-only `!` is confined to lines 442–456, counts both signs under one 16-occurrence cap and delegates atom lexing unchanged. Ordinary names including not/NOT/eq/add/div/true/false/_ and repeated named `?_` receive no reinterpretation; bracket `!=` retains the adjacent-token check at 395–397. No whole-source UTF8/comment pass was added.
- Lines 459–488 defer only new-policy semantic validation until structural parse succeeds. Whole-rule positive binders are reconstructed at 495–499. Separate global passes 509–555 select NEG_UNBOUND, HEAD_UNBOUND, EXPR_UNBOUND, missing answer and undefined target; smallest structural variable IDs are selected at 501–504. Rule/body/filter loops preserve the specified source ties. Negative-cycle selection follows only afterward in graph construction 600–610.

### 2. Both-sign graph and completed-component protocol

- Lines 559–571 derive unique signed body-to-head edges from every occurrence, including parallel positive/negative constraints. Iterative Kosaraju 572–599 sees both signs;600–610 reject the first source-negative edge internal to an SCC with bounded structural IDs/count, not an unbounded name list.
- Lines 612–649 sort component members by name/arity, pin triple component 0, choose ready IDB components by canonical signature lists, derive source-order rule partitions and compute minimal positive 0/negative 1 levels. All relations/rules participate, not just answer dependencies.
- Lines 865–923 execute every IDB component. Full predecessor completion is checked at 878–879 and an IDB must be empty at base entry 880–881. Every component pays a base wave; base evaluates every defining rule against full predecessor/empty internal sets at 894. Subsequent variants 896–902 cover every eligible internal positive position only; predecessor positives remain full sets and negatives never become delta positions.
- Pending sets are invisible until the relation-ID merge 908–918. A terminal no-change wave is charged before eligibility/results are known at 884–886; empty completion is explicit at 920. Nonempty acyclic base output therefore receives its required verification wave even when no recursive variant exists. Base-only rules are not re-evaluated.

### 3. Filter barrier, exact negative membership and global accounting

- The shared eager filter loop 680–694 evaluates all filters even after false. Complete binding 740–741 reaches the full negative group only when all filters passed and before any head projection/dedup.
- Lines 706–728 precharge every negative occurrence as one group, check remaining global work before membership, construct complete inline Tuple keys with the same dictionary IDs, call the existing relation `seen` set, and probe/count every occurrence without first-match short circuit. Empty/repeated/matched/absent occurrences all use the same path. Completion and strictly lower stratum are checked at 714–717. No negative per-column/second index is introduced.
- The unmodified positive candidate enumeration 759–807 keeps inherited strict-smaller greedy/index ties, skips pre-delta rows before charging and charges before unification. Positive-only order is a monotone projection of signed source order, so its ties and variant order satisfy signed-ordinal order.
- New pending fact admission 746–751 checks the remaining global allowance before insertion, after barrier and seen/pending dedup. Merge transfers pending reservations once at 916–919; it does not add an extra fact to the successful result accounting. Existing visible EDB admission 655–670 validates every supplied row (including inactive) before exact half-open clock selection. Input rows, EDB, IDB, work and rounds never reset per component.
- New work counters are charged at 672–686/707–724 and reconciled before success at 936–937. Negative checks are audit-only. The small group sum cannot overflow: combined signed occurrence cap 16 and arity cap 8 imply at most 144 units/group. All successful total counters remain at or below selected global caps. These are logical units, not wall-time/RSS bounds.

### 4. Owned IR2 export and independent validation

- Both new public headers match the selected C++ signatures/result metrics; old public headers are byte-identical source52. New header2 PlanAtom members explicitly initialize safely, without changing old PlanAtom.
- Lines 1390–1431 instantiate the typed signed parser but never add/run/evaluate filters. Literals are decoded into owned Values; signed source relational order and filter order are copied. No dictionary operands/borrowed handles/facts mirror escape.
- Lines 1115–1150 map all 13 opcodes explicitly to named portable forms. Independent owned-filter validation 1151–1192 reconstructs stack shape/live height, exact final comparison/root, operand shapes, positive binding and sorted exact dependencies without evaluation/folding. Per-rule/program limits are independently checked at 1232–1256.
- Lines 1194–1326 reconstruct safety, definitions, unique signed dependencies, exact disjoint component/rule partitions, predecessor/level metadata, both-sign reachability/SCC equality and canonical ready-component ties. This is not a caller-JSON decoder or supplied-IR execution API.
- IR2Writer at 1328–1387 checks remaining logical encoded bytes before each append/character, including escaping. The compact serializer at 1434–1519 has the exact eight ordered top-level keys, canonical int64 strings/finite canonical lowercase f64 bit hex, no facts stream, no discretionary whitespace and no returned partial output on failure.
- Independent static extraction confirms all **45 budget keys, their order and fixed values** match selected BUDGET-MODEL.json. The two values taken from the owned layout are independently constrained to 16 and the exact nine row units by 1199–1204. This is a source-literal comparison, not executing the serializer or proving an allocator bound.

### 5. Failure poisoning and strict-FP premise

- New public entered add/run wrappers 1611–1625 catch **all** escaping exceptions from their calls, perform a Boolean poison store and rethrow. Therefore unsupported entry FP, input/domain/interval/resource failure, bad_alloc or an unexpected exception cannot later turn a previously loaded prefix into success on that instance. The already-failed guard may throw outside the try but the instance is already poisoned. No reset API exists.
- Constructor failure creates no usable instance; caller argument construction before entry is outside the entered-call guarantee. Successful run still consumes `has_run`; a subsequent entered one-shot failure also poisons the new instance. Old wrappers 1590–1605 are unchanged.
- Fresh guard sites exist at typed construction 142, add 661, new run 867/938, compiler 1391/1430 and serializer 1435/1518. The unchanged FP helper only observes controls and does not repair them. These checks continue to rely on continuously compatible controls/trusted callees, not cached permission. Poison cleanup itself performs no FP evaluation/control repair. Later actual continuous-FP/failure/recovery tests remain required.

## Actual legacy comparison, not policy-refactor inference

`legacy-fragment-comparisons.tsv` records 11 direct text/hash-identical ranges covering all 14 owner-claimed unchanged function/type bodies. They include entire inherited lexing/term/arithmetic-parser/filter/atom machinery, Tuple/Hash/Rule/Relation, legacy safety/answer/undefined checks, full join enumeration, old run preseed/wave loop, materialization after round assignment, entire IR1 compiler, IR1 JSON helpers/serializer, Value implementations and old public wrappers.

The whole-core text diff was also reviewed. Remaining touched old seams retain their old selected-policy statements: the original max_rounds validation is the false branch; negative syntax/global validation are new-policy branches only; original increment-before-failure positive charge remains the old branch; expression metric additions are new-policy-only; old pending insert-then-check remains the false branch; old run delegates only its unchanged materialization suffix with `rounds` passed as the new helper argument. No old run path calls the SCC scheduler. Source identity supports preservation but **does not prove byte-identical emitted IR1/old rows/errors/counters at runtime**; independent later regressions remain mandatory.

One static comparison helper attempt had a shell variable-shadowing error. Its invalid table is explicitly retained as `legacy-fragment-comparisons-attempt-invalid.tsv` and is not evidence. Corrected comparisons above all match; the progress log records both outcomes. No candidate/compiler/test execution occurred in either attempt.

## Closure and remaining gates

The core source-only gate can close on freeze002 plus the six exact unchanged dependencies. Any core/header/dependency/selected-contract change requires scoped re-review; no recommendation applies to transient/new bytes. Binding/C API callbacks, extension registration and whole-candidate QA are separate review ownership and are not certified by this core report.

Compiler/linker/module/runtime/independent semantic or accounting oracle/old API regression/FP recovery/callback failure/recovery/capacity/benchmark evidence is **UNRUN** here. This report grants no execution permission. Item3 catalog/attachment authority and store/planner dispatch remain held; argument-only native progress does not establish store-integrated item4 acceptance.
