# Renewed codec cost research: current FP reader, closed profiles, minimal key-work removal

**UTC: 2026-10-31. Status: research recommendation only, not implementation, correctness acceptance, or performance acceptance.**

## Decision in one paragraph

The smallest **useful low-observable-risk combined candidate** is **C1p+C2**, following a final static tradeoff requested by the coordinator: preserve public `_carrier_payload` entirely verbatim, add a private identical after-key tag/selection/null tail, call that private leaf only after `_native_keys`, and hoist only private root/carrier expected-key metadata into immutable frozensets. Bind the duplicated shape tail to the public tail with an AST-equivalence regression invariant; keep `_canonical_payload` shared for all domain/FP/finite/+0 rules. This removes the same private work as the earlier shared-leaf C1s+C2, but adds no public helper frame. The alternative C1s shares the shape tail and adds a public frame; C2 alone is smaller but removes less work. Root must select and save the exact variant before any writer. No FP gate, reader, native artifact, generator/null sequence, domain logic, or eager result boundary is changed by this recommendation. No numerical speedup, recovery probability, or operation-cycle estimate follows.

## Scope, pins, and what was actually done

Only source text/AST, fresh primary-source reads, and existing closed JSON reports were inspected. `collect_cost_evidence.py` imports Python standard-library modules only; it does not import application modules or run database/native/FP/profile/timing operations. No application-source/Git/Page edits were made. Files created are confined to this research directory.

Locally rehashed inputs:

| Input | SHA256 / immutable source pin |
|---|---|
| Current `storage/typed_store.py` | `25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc` |
| Current `storage/fp_environment.py` | `92169be543692ff30a1824fa0add9cdb7e3139c864bdef8fdc5d1b0ec9710164` |
| Old ffc FP file, **historical comparison only** | `facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c` |
| Closed reader study manifest | `5a8277b3fdb12a4fd4f79ebad4e49504db1671aabc4a083d5af0b0bf46ca87b2` |
| CPython3.12.14 source | `2abcf904b8dac8c999d2b3aac76681abb333798a` |
| DuckDB2.0.0 engine source | `d54cbbe3df17e8e5ce68312f483b4155836112aa` |
| duckdb-python2.0.0 source | `83c719961098611e769dc4bab0bda2bf149a2d1e` |
| Candidate/current native artifact, supplied study pin | `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4` |
| Accepted-item1 artifact, supplied study pin | `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d` |

The seventeen fresh GitHub reads have exact commit, path, Git blob SHA, UTF8 content SHA256, byte length, relevant symbols/lines, and short curated conclusions in `PRIMARY-SOURCE-RECEIPTS.json`. No wholesale vendor source cache is exported. Four first-party web/paper readings are curated separately. Their URL hashes are explicitly **not document-byte hashes**. Source pins describe inspected code; they do not newly attest that a binary was built byte-for-byte from it. The existing study's runtime provenance is separate evidence.

The pinned [CPython version header](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Include/patchlevel.h#L19-L26) identifies3.12.14. Mutable `/3.12/` documentation currently showing another patch version was not used as an exact implementation pin.

## 1. Reconcile the old FP pin before assigning residual cost

The prior codec report's `facfc…` FP pin is stale for the current candidate context. Its `read_controls` used32-byte aligned `fenv_t` storage, public `fegetenv`, a bytes conversion, and two `struct.unpack_from` calls. Current `92169…` uses fresh call-local8-byte public `femode_t` ctypes fields, public `fegetmode`, and direct unsigned field access. It still returns the same `Controls` API. The current source also narrows its documented preservation guarantee: this is not an atomic whole-fenv snapshot and not preservation of undefined x87 condition bits.

Source-AST equality independently confirms `Controls`, `require_supported`, and `require_masked` are unchanged between those two pinned local FP files. This is predicate/API evidence, **not a new real-FP correctness run**. Every public/current guard remains independent; the immutable ABI-binding cache does not cache controls. Reusing the old FP implementation in a codec trial would confound two changes and invalidate the intended current-baseline A comparison.

Closed profiles confirm the mechanism: both ffc-current-reader and reader-only make6 `read_controls` calls per successful `query` and7 per `query_json`, for all seven shapes including empty/no-float/tiny. The old reader makes12/14 `unpack_from` calls respectively; current reader makes zero. The accepted-item1 profile has zero control-reader calls. There is no float-count-proportional FP-read stream left for C1/C2 to remove.

## 2. Existing profile counts: what was independently checked

All42 existing per-control profile JSON files were read:3 variants ×14 controls. Each reports5 profiled public calls with exact result flags. All three actual exit sidecars are integer0/not-timeout, process status isPASS, each has98 existing observations (28 warm,70 profiled), and all294 existing result records were reread with their expected control/row/F counts. Runtime metadata has CPython3.12.14, CPU8 affinity, GC enabled, and actual DuckDB threads1 before/after. Root's broader independent provenance/native-result verification is not replaced by this count audit.

For both ffc-current-reader and current reader-only, with C total output cells and F f64 cells, **actual profile totals divided by five public calls** are exactly:

| Function / diagnostic | Per successful public call |
|---|---:|
| `_native_result_wire` |1|
| `_native_keys` |C+1|
| `_carrier_payload` |C|
| `_canonical_payload` |C|
| `_copy_float_bits` |F|
| Public `_float_bits` / `require_masked` inside this private conversion |0|
| Key-screen `<genexpr>` cProfile activations |6C+5|
| Payload-null `<genexpr>` cProfile activations |4C|
| `read_controls` |6/query;7/query_json|

The genexpr entries are **activation/resumption/exhaustion counts, not generator-object creation counts**. The source creates one key-screen generator per root/cell gate and one payload generator per cell. Those generators remain in C1/C2. This distinction matters: wide's61465 key-screen and40960 payload activations across5 calls do not mean that many allocated generators.

| Shape | Rows R | All cells C | f64 cells F | Current `_native_keys` / public call | Current `_copy_float_bits` / public call | C1p/C1s+C2 removed source-level set constructions / public call |
|---|---:|---:|---:|---:|---:|---:|
|empty|0|0|0|1|0|1|
|tiny_float1|1|1|1|2|1|3|
|tiny_no_float1|1|1|0|2|0|3|
|no_float64|64|64|0|65|0|129|
|mixed64|64|128|16|129|16|257|
|float256|256|512|256|513|256|1025|
|wide_float256|256|2048|1024|2049|1024|4097|

Thus wide is256 rows ×8 cells =2048 cells, including1024 strings and1024 floats. It is not1024 total cells. The proposed key optimization scales with C, not just F. The no-float controls remain relevant rather than negative controls for all codec overhead.

`PROFILE-COUNT-RECEIPT.json` retains exact report/input hashes and every count. No profile seconds were used for comparisons or fitted costs. In the pinned [profiler documentation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/library/profile.rst#L38-L45), Python explicitly distinguishes profiling from benchmarking and warns about unequal Python/C instrumentation. Cumulative contexts overlap; an untraced native call can be charged to its Python caller. Neither displayed self time nor sums/differences of cumulative time establish exclusive Python/native/FP costs or macro ratios.

## 3. Fresh CPython evidence refines the removal claim

The constant key sets are not free, but they are also not five new string hashes each time. At this exact compiler pin, a greater-than-two constant set display is compiled through a frozenset constant followed by runtime `BUILD_SET`/`SET_UPDATE`. [Compiler](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Python/compile.c#L4280-L4311), [bytecodes](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Python/bytecodes.c#L1524-L1544).

The runtime set merge may copy entries/use cached hashes. Hoisting private immutable metadata removes ephemeral mutable-set construction/update/destruction, not a measured number of fresh hash computations, allocator calls, bytes, or CPU cycles. [Set implementation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/setobject.c#L558-L625).

`dict.keys()` constructs a view; equal-sized view comparisons iterate that view and test membership in the set-like other operand. On valid exact five-key private cells, C1 removes one repeated comparison and its view/equality iterator, as well as that public gate's set construction. C2 removes the remaining private expected-set construction per cell and one per result root. The remaining private gate still performs its exact-key-type screen, key view comparison, and membership work. [Dictionary implementation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/dictobject.c#L4616-L4668), [keys view constructor](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/dictobject.c#L5118-L5120).

Combined static removal is **2C+1 mutable-set constructions and C repeated carrier-key comparisons/views/associated equality iteration**, after module setup. It does not remove both generators, both returned leaf/domain tuples, payload dictionary lookups, tag/type/domain checks, per-string validation, F pack/bit/finite/zero paths, wire cell dictionaries, rows, or the shallow root copy. These are source-level constructions/control-flow facts, not an allocator-event trace.

PEP709 is not a reason to dismiss the retained generators: [PEP709](https://peps.python.org/pep-0709/) excludes generator expressions; the exact [symbol-table condition](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Python/symtable.c#L1051-L1066) agrees. Changing those generators would be a separate candidate with its own key-iteration/short-circuit/exception ordering proof, not an incidental cleanup.

## 4. Engine vectorization does not erase the Python output boundary

[DuckDB's execution-format documentation](https://duckdb.org/docs/2.0/internals/vector) describes vectors, default2048 **SQL tuples**, unified views, nested lists and struct child vectors. Current `NATIVE_SQL` aggregates input facts and asks `td_query_v2` for one SQL result envelope containing nested lists of rows/cells. Therefore wide's2048 nested cells are not2048 SQL output tuples, and the default vector size is not an explanation for the observed wide latency.

Fresh exact [duckdb-python `FetchNext`/`Fetchone`](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/pyresult.cpp#L90-L167) shows chunk flattening, SQL-row tuple construction, `GetValue`, then `PythonObject::FromValue`. Fresh [nested conversion](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp#L482-L505) creates named structs as dicts; [list conversion](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp#L752-L759) recursively creates lists. By the time `_native_result_wire` starts, Python carriers, null fields, outer lists/dict and scalar objects already exist. C1/C2 does not avoid this boxing/materialization.

Local native `encode_result` source182-231 first counts output cells/bytes, reserves nested vectors, then writes list offsets, validity masks, tags and selected payloads. Those native allocation/resource/encoding contracts remain untouched. Exact [engine vector dispatch](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/types/vector.cpp#L354-L372) and [unified-format conversion](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/types/vector.cpp#L454-L495) reinforce that these are distinct representation boundaries, not redundant Python validation.

**Theory, narrowly applied.** MonetDB/X100 explains why per-item interpretation and full intermediate materialization can impede CPU efficiency, advocating cache-sized vector processing. The useful inference here is to remove genuinely unnecessary per-cell work before pursuing broader egress changes; its large-workload throughput results provide no speed estimate for these bounded embedded calls. [Primary CIDR paper, Section4](https://www.cidrdb.org/cidr2005/papers/P19.pdf).

The author-hosted column-store survey discusses delayed tuple reconstruction, the need to reconstruct at row-output boundaries, and cases where positional bookkeeping makes naive late materialization lose. Here the full eager output is required, so C1/C2 is duplicate-admission-work removal, **not late materialization**. Moving to Arrow/native egress requires a separate lifetime/ownership/null/bit/counter/API design, and may merely move materialization downstream when callers still demand dicts. [Abadi et al., Sections4.1/4.4](https://www.cs.umd.edu/~abadi/papers/abadi-column-stores.pdf).

The pinned [CAPIv2 header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L10-L74) explicitly warns of a version-tied unstable interface and no stabilized V2 surface. No stabilization date, production-readiness, or portability claim is made.

## 5. Cost model: conceptual, deliberately not fitted

Think of the preserved statement interval as containing:

1. Lock/readiness and six-field request preparation, budget/filesystem work, transactions and snapshot lookup.
2. SQL/native query work, native nested output encoding, DuckDB fetch and recursive Python materialization.
3. Fixed current FP observations at6/query or7/query_json.
4. Root/row/cell shape validation; remaining per-cell key/payload/domain checks, string encoding, and F guarded-premise bit copies.
5. Wire object construction, snapshot/JSON wrapper construction, and possibly destruction of the previous `result` when assignment rebinds it before the stop clock.
6. Scheduling, allocation/GC and lifetime interactions.

This is a **boundary inventory**, not independently additive measured terms. C1/C2 changes only a narrow subpart of item4 plus one root metadata construction. No fitted linear coefficient, Amdahl fraction, operation budget, GFLOPs, seconds-per-cell or forecast ratio is justified. C/R/F co-vary in the original shapes and native/output work also varies; subtracting empty latency from wide would not isolate per-cell Python cost.

Consequences:

- Empty: only one root set construction is removed. Native/readiness/budget/fetch/current FP costs remain; do not expect or promise an empty-case fix.
- Tiny: three source-level set constructions and one duplicate comparison disappear, amid unchanged fixed work. No significance or magnitude follows.
- Large/wide/no-float: many repeated key operations are removed, but materialization, strings/floats and required wire objects remain. C1/C2 is plausible, not sufficient evidence that the accepted-item1 performance hold will clear.
- Public codecs: this private-path improvement does not imply a standalone `Value.from_carrier` improvement.

## 6. Alternatives and public-call risk

| Choice | Mechanism and evidence | Scope decision |
|---|---|---|
|C1p private identical after-key leaf; public function fully verbatim|Same private repeated-gate removal; no added public call/frame. Small explicit shape-tail duplication, while domain admission remains shared.|Preferred low-observable-risk alternative with AST-equivalence regression invariant, subject to root selection and semantic lane.|
|C1s shared unchanged after-key leaf|Same private work removal; no duplicated shape body, but public construction gains a helper frame.|Alternative when single shared shape implementation outweighs the extra public frame.|
|C2 private immutable expected frozensets|Removes remaining private expected-set construction; existing view comparison accepts set/frozenset.|Recommend; public gate literal remains verbatim.|
|C2 alone|Even smaller code/observable delta; less per-cell work removed.|Fallback only if separately selected, not a silently substituted trial.|
|Rewrite `any` generators or unroll null checks|Could remove generator machinery but alters iteration/short-circuit/error sequencing; profile activation counts are not cost shares.|Defer; independently register a later candidate only after renewed research if blocked.|
|Exact-builtin ASCII path|Pinned Unicode implementation makes `isascii` a flag check, while UTF8 encoding can still allocate bytes. Potential benefit applies to strings, including half the wide cells.|Defer: current legacy text ordering is type -> NUL -> UTF8 encode/byte cap, public str subtypes can override protocols, and unicode/surrogate/error semantics need separate proof. [Unicode source](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/unicodeobject.c#L5296-L5306).|
|Native/Arrow egress, byte classifier, memory buffers|Could change representation/marshalling more broadly, but adds ownership/lifetime/API/FP/null/resource complexity and may not help tiny calls.|Defer outside this patch; no Arrow zero-copy or native-speed guarantee.|

**C1p versus C1s maintenance/observability tradeoff.** Public `Value.from_carrier` currently calls `_carrier_payload` then `cls(tag,payload)`. Under C1p, `_carrier_payload` is preserved entirely verbatim, so this public call graph, gate/body ordering and interpreter-frame depth remain unchanged. The private new helper has the identical after-gate tail; add an AST-equivalence regression test comparing its statements (apart from its docstring) to the public tail after the exact key gate. Bind tag validation, selected-field computation, short-circuit/null generator, diagnostic messages and return order, not just returned valid values. Require the existing public function source to remain byte-for-byte unchanged. This deliberate shape-tail duplication is a small maintenance invariant; it is not a second domain/finite/+0 implementation and not a proof of hostile-callback atomicity. New definitions/constants can still shift source line numbers; no exact filename/line-number/bytecode-identity claim follows.

Under C1s, the shape tail is shared, avoiding that duplication, but the public wrapper inserts an extra helper call/frame between gate and tail. The private path in both variants replaces one call with another rather than adding extra call depth, so the private source-level work-removal counts are identical. Exact [Python call dispatch](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Python/bytecodes.c#L2761-L2786) still pushes an interpreter frame, even for specialized exact arguments. Thus C1s public frame/trace/profile/traceback shape changes and possible public-call latency regression must be acknowledged; general function inlining is not assumed. Exhausted recursion/allocation conditions are not a claim of identical exception timing.

Allocation removal may move GC-trigger points; [pinned GC documentation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/library/gc.rst#L104-L116) ties collection to allocation/deallocation thresholds. Do not infer arbitrary mutable-graph atomicity, no finalizers/callbacks, or immunity to hostile mid-call state changes. This lane deliberately does not duplicate the separate semantic/key/GC protocol model.

For floats, keep `struct.pack`/integer-bit/finite/+0 handling unchanged: the [pack wrapper](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Modules/_struct.c#L1054-L1062) compares an error sentinel before the platform-aware [Pack8 representation copy](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/floatobject.c#L2389-L2405). Removing guards is not authorized by fewer metadata allocations.

## 7. Evidence contract for any future authorized candidate

**No trial was run or authorized by this lane.** Reuse the original macro contract, not a favorable alternative endpoint.

### Baselines and candidate

- New A: **current AE500-context application** (locally verified typed_store25e9a4f + FP92169be) versus the selected codec candidate, both with exact normal artifact480456. Do not use old ffc/facfc as A baseline. Candidate only changes selected C1/C2 code; current FP, native/binding/legacy/schema/browser/query boundaries stay unchanged.
- New B: accepted-item1 +5b661 versus that **same immutable codec candidate** +480456. It remains a broader version/contract comparison, not an exclusive codec/native causal decomposition. Complete actual A terminal verification before B; preserve both separately.
- Save the exact selected decision before a source writer. Then freeze source/artifact/runtime hashes and pass current real-store/FP/adversarial/full correctness gates and actual full-result untimed preflight before timing. This report is none of those gates.

### Preserve method and every result

Same physical320-fact/10-commit DB template, SHA9a22f33e305134cb05f52cb4829039e14869073c76075042f9c7146208621183, same history checksum2fe50bd9fa8cd1a29fea8633241b602f6635f3235fd15f4f179489d76e31d642; no regeneration or cap/ROOT patch. Same14 controls,7 shapes ×query/query_json, same full tagged rows/f64 bits/canonical integers/booleans/strings/native counters/snapshot metadata.

Same42 process pairs per comparison,2 rounds ×21, balanced first-load order21/21 overall; randomized14-control order shared within each pair. CPU8, threads1, CPython3.12.14, current default supported FP state, GC enabled, original caps. Per child2 warm +3 measured sweeps; median3 technical observations gives one process/control value, then42 paired ratios. Same declared seeded20000 pair-unit percentile resamples and round/load-order strata. Record all warm/measured/failed/partial outcomes, actual exits, stdout/stderr, provenance, setup and RSS diagnostics. No automatic retry, trimming, min selection, post-hoc order/seed/shape dropping, or result-dependent candidate selection.

Keep literally `t0 = perf_counter_ns(); result = fn(request); elapsed = perf_counter_ns() - t0` with existing lifetime/assignment behavior. Do not preclear `result`, suppress GC, move internal validation/JSON/fetch/guards out, or label this exclusive native/body/CPU time. External benchmark normalization/checksum validation stays after stop. For C1s only, a later independently scoped public `Value.from_carrier` check may expose the added-frame risk, but cannot replace or be pooled into this original macro study; if new performance claims about that public surface are desired, register them separately before observing results.

### Interpret and stop honestly

Existing closed reader B still reports float256 ratios1.087837/1.083298 and wide1.116249/1.119155, with all four intervals above1; mixed64-query_json1.053491 is another investigation signal. no_float64-query1.038835 has an interval above1 despite not meeting the5% triage screen. These are preserved historical outcomes, not codec-candidate predictions. Empty/tiny estimates or intervals spanning1 are not equivalence.

Keep the declared median>1.05/lowerCI>1/both-round-medians>1 screen as investigation triage only. It is not a release SLO, family-wise guarantee, universal no-regression test, or equivalence proof. Report all14 controls and positive estimates below-screen as well as favorable cases. A favorable A does not erase an adverse B, and no profile/micro result substitutes for either. If the goal requires a quantitative no-regression margin, root/owner must state it before results, not infer it from a non-significant interval. Item2 remains performance-held until the coordinator's declared completion criteria are actually met; items3-10 are not advanced by this research.

If C1/C2 is insufficient, preserve the failed/partial/unfavorable evidence and return to fresh primary research before another separately selected candidate. Do not quietly broaden this patch into a generator/ASCII/native-egress rewrite.

## Deliverable map

- `PRIMARY-SOURCE-RECEIPTS.json`:17 fresh immutable source URLs/blob/content hashes and focused source conclusions; no vendor source copy.
- `WEB-PRIMARY-CURATION.json`:4 official/author/publisher primary readings, scope notes, precise URL-hash labeling.
- `LOCAL-SOURCE-RECEIPT.json`: current/old local file hashes, FP API/predicate AST equality, relevant codec source constructs.
- `PROFILE-COUNT-RECEIPT.json`:42 actual existing profile count records,3 exit/process closures,294 existing result records checked; no profile seconds used.
- `STATIC-SHAPE-COST-COUNTS.json`: source-level removals/retained constructions, explicitly not allocator/time counts.
- `collect_cost_evidence.py`: reproducible standard-library-only reader/AST audit, no app execution.
- `DECISION.json`: structured C1p/C1s tradeoff recommendation and limits for coordinator selection, not acceptance.
- `EXPORT-MANIFEST.json`: UTF8 source-only handoff hashes. Mutable worker progress is outside the immutable content list.
