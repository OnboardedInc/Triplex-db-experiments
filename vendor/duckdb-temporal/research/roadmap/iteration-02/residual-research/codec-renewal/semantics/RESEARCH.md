# Renewed codec semantics review — C1/C2

**2026-10-31 UTC · source-only research · not application acceptance**

## Recommendation

**Permit a bounded codec + C2 source trial, not item-2 acceptance. After comparing the bounded alternatives, prefer C1-P: keep the entire public `_carrier_payload` function verbatim and add a private after-key helper containing the identical eight-line payload-shape tail, enforced by an AST-identity regression test.** Fresh evidence found no ordinary protocol/error-order gap in the originally proposed C1-S shared-tail extraction either. Both preserve private exact dict + exact-string keys + complete keyset admission before the same tail, and hoist only private expected keysets in C2. C1-P avoids C1-S's added public frame/dispatch/recursion risk at the cost of explicitly maintained small shape-logic duplication; domain admission remains shared.

Two plausible nearby edits are **not** equivalent and must not enter this trial:

1. **Do not cache the selected payload once.** The original leaf looks up the selected slot before checking unused NULLs and again when returning. An ordinary public key equality callback during an unused-slot lookup can replace the selected payload. A fresh negative control returns `changed` from the baseline and `original` from the capture-once variant.
2. **Do not put keyset equality before exact-key-type screening privately.** An exact dict can contain user keys. A fresh negative control invokes hash/equality when the comparison is moved first; the current screen invokes neither.

No numerical speedup, complete recovery of the accepted-item1 performance gap, production-readiness, or V2 C API stabilization date follows from this research. Item 2 remains held on the coordinator's acceptance evidence.

## Exact pins and evidence boundary

| Component | Pin / provenance |
|---|---|
| Current `storage/typed_store.py` | SHA-256 `25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc`; directly rehashed and AST-parsed as data |
| Current `storage/fp_environment.py` | SHA-256 `92169be543692ff30a1824fa0add9cdb7e3139c864bdef8fdc5d1b0ec9710164`; directly rehashed only |
| CPython 3.12.14 | Annotated tag `4b65faa0b452113bf130086fb1519be6d9cd9b06` resolves to commit `2abcf904b8dac8c999d2b3aac76681abb333798a`; freshly resolved via official GitHub GET |
| duckdb-python 2.0.0 | Commit `83c719961098611e769dc4bab0bda2bf149a2d1e`; fresh gitlink GET resolves `external/duckdb` to the native pin below |
| DuckDB native source | Commit `d54cbbe3df17e8e5ce68312f483b4155836112aa` |
| Current parent-supplied source / native artifact context | Draft PR 7 source `AE50094cd242c4d46950f8a9a99d1ecdca03b7f8`; native SHA-256 `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`; not executed or independently rebuilt here |

The old codec-theory report's FP hash `facfc51…` is **not** the current FP pin. Its old models and prior performance/profile evidence are historical inputs, not fresh experiments from this lane. The unchanged typed-store pin permits direct source alignment, but not substituting old guard evidence for current real-store verification.

This lane performed no application import/compile/execution, DuckDB/native/DB work, hardware FP inspection or mutation, float-payload experiment, timing, profiling, source/Git/PR/Page edit, or Codex launch. Only this owned directory was written. Models are independent manually written stdlib code; application ASTs are compared as data, never compiled or executed.

## Fresh primary-source findings

There are **27 curated fresh pinned GitHub file-range GET receipts plus 3 metadata GET receipts** in `FRESH-PRIMARY-SOURCE-RECEIPTS.json`. Nineteen range responses were matched byte-for-byte to old same-blob source after independently recomputing that old source's Git blob ID; this is fresh retrieval confirmation, not relabeling old cached reads. Fresh full `sys.rst`, the complete small tuple-builder header, and the complete DuckDB Python license were independently Git-blob checked in memory. Only URLs, ranges, IDs, hashes, license references, and first-party summaries are retained, not vendor source caches. Two navigation ranges are explicitly marked as not mechanism proof.

### Keyset comparisons and hostile protocols

At the pinned CPython revision, dict-view equality/inequality checks lengths and then iterates the **input view**, probing the expected container. Both set kinds are accepted. Thus a private expected set → frozenset replacement preserves the traversal direction; it does not introduce expected-set iteration order into that path. Generic dict lookup can invoke rich comparison on stored custom keys and restart after mutation. Exact dict alone is therefore insufficient for a no-key-hook claim. These observations support retaining the preceding exact-string screen, not relaxing public acceptance. [Dict implementation](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/dictobject.c#L4613-L4695)

Pinned set membership uses cached built-in string hashes when available; otherwise it can invoke hashing and rich comparison. Both set and frozenset share this machinery. The private metadata contains only exact strings and must be used only after the current screen. Immutable **contents** do not make the module binding immutable or create a checked capability. [Set lookup/membership](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/setobject.c#L56-L103), [set-kind predicates](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Include/setobject.h)

A comparison result need not be bool: CPython truth-tests other results and decrements their references. Consequently ordinary equality may run `__bool__`/`__len__`, and a temporary result's finalizer may run before the next lookup. The fresh model explicitly tests these additional synchronous paths. [Rich comparison](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Objects/object.c#L800-L899)

### Ownership and publication

Pinned DuckDB Python `Fetchone` constructs a new tuple and recursively converts each column. Its `TupleBuilder` uses `PyTuple_New`, fills slots, and transfers the tuple. Named STRUCT conversion builds a Python dict; LIST conversion builds a list and recursively appends its children. This supports ordinary local ownership of a newly materialized envelope, **not** an assumption that malformed or replaced driver output can skip validation. [Fetchone](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/pyresult.cpp#L139-L169), [tuple builder](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/include/duckdb_python/pyutil.hpp#L103-L132), [STRUCT/LIST materialization](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp#L482-L506)

Current source builds new result-row and cell containers, shallow-copies the root, and replaces its rows only after eager conversion. Valid output payload types are immutable. Even if a toy input repeats the same raw cell/row objects, separately built output cells need not alias them or each other. Do not replace this with in-place raw mutation, reused mutable output dicts, lazy iterators, or published prefixes.

Ordinary ownership is not exclusive reachability against frame inspection, GC introspection, malicious driver aliases, signal handlers, tracing hooks, or corrupted native memory. C1 does not make a mutable graph atomic. The existing trusted-callee / continuously-supported-controls premise remains required.

### GC, finalizers, frames, and failures

Pinned CPython schedules collection based on GC allocation counts; collection has user callbacks. Deallocation can also run arbitrary Python. Reducing temporary sets/views changes allocation/refcount traffic and may change callback scheduling; exact containers do not establish whole-operation callback freedom. [GC trigger](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Modules/gcmodule.c#L2290-L2319), [GC callbacks contract](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/library/gc.rst#L265-L298), [reference-counting warning](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/c-api/refcounting.rst#L111-L146)

C1-S shared extraction adds one public helper frame; privately it replaces the current helper call. It therefore cannot promise identical tracebacks, trace/profile events, stack-sensitive hooks, or near-recursion-limit outcomes. **Preferred C1-P leaves public code and public call depth unchanged**, avoiding that added exposure. Neither variant promises identical whole-process GC scheduling. These are disclosed boundaries, not a reason to invent impossible arbitrary-introspection equivalence. Ordinary results, protocol sequence, and error family/text remain the tested target. [Pinned frame/recursion/tracing docs](https://github.com/python/cpython/blob/2abcf904b8dac8c999d2b3aac76681abb333798a/Doc/library/sys.rst#L1550-L1638)

No exception normalization, `finally` exit guard, host repair, or cleanup masking is proposed. Current failures can occur before the successful-conversion exit guard; retaining their ordering is required. Real cleanup/rollback and actual unsupported-control denial remain the coordinator's tests, not a property established by these toy models.

## Bounded alternative and preferred source-trial specification

**C1-P versus C1-S:** C1-P keeps the entire existing public function verbatim and duplicates only its eight-line after-gate shape tail in one private helper. The private runtime path and removed gate work are the same as C1-S; `_canonical_payload` remains the one shared domain implementation. C1-P's concrete cost is future source drift risk, not a new runtime mechanism. An actual-suite AST regression must compare the public body after its first gate with the private helper body, ignoring only function name, signature/annotations, and docstring—not expression/control-flow changes. Future drift must fail tests and require deliberate joint review. No concrete semantic reason to reject this limited duplication was found. Its unchanged public function and avoidance of a new public helper call make it preferable here.

1. Keep **all** of `_carrier_payload` verbatim, including the fresh public five-key set/view expression, tail, and error text.
2. Add a private after-key helper whose body AST equals the current public tail: tag lookup; exact int/tag-membership test; selected-field selection; selected nonnull access; unused NULL generator in current order; final selected-field lookup; original pair return. Keep both selected accesses. Do not replace identity tests with truthiness or merge/reorder lookups.
3. Document the private helper's exact-dict/exact-string/prior-key-admission precondition. It is not a public permission bypass or checked capability. Add no token, boolean, ambient permission/cache, extra guard, or public call site. (If C1-S is selected instead, its shared leaf must document that public admission can still involve custom keys; exact-string keys are only the private caller's stronger premise.)
4. Privately retain `_native_keys` immediately before the helper call, with its exact dict check, complete exact-string screen, then five-field comparison. Missing/extra/wrong keys must still fail here before tag/payload processing.
5. Introduce only two private immutable metadata sets: root `{rows, rounds, derived_facts, work}` and carrier `{tag, s, b, i, f}`. If the expected-parameter annotation changes, make it describe these immutable values; do not widen admission behavior. Keep public constructors/JSON/carrier key gates untouched.
6. Preserve selected-payload exact type checking and `_canonical_payload(..., _copy_float_bits)` unchanged. No new ASCII shortcut, alternate finite/zero classifier, generator/null-check rewrite, payload tuple change, buffer reuse, or unvalidated native trust.
7. Preserve entry/exit fresh full guards, independent public guards, six-field Query snapshot/readiness ordering, late `known_at=None` resolution, budgets, lock/transaction/rollback ordering, output containers, and no-prefix publication. Nothing here authorizes new timing or guard changes.
8. Source review should find one intended private helper call site under C1-P (the public wrapper plus private converter under C1-S), with no escape of temporary checked state.

Mechanism only: C1 removes the second per-cell expected set/view/equality traversal; C2 removes remaining temporary private expected-set construction using two import-time metadata objects. These changes do **not** remove initial admission, generators, domain/payload/finite/zero work, payload pair returns, output containers, or FP reads. Allocation-event counts and latency are not measured here.

## Fresh isolated evidence (not real-store acceptance)

`verify_current_ast.py` parses the frozen application source as data and verifies four exact AST alignments: manual original carrier, unchanged public gate, unchanged after-key tail, unchanged private admission. `CURRENT-AST-RECEIPT.json` also records current source hashes and relevant function-body AST hashes.

`protocol_model.py` is independently hand-written and exercises original C1-S versus baseline. The preferred C1-P private body is structurally the same aligned after-key tail, while its public body is the baseline left untouched; this is source reasoning, not a claim that a new application trial ran. Four separate runs under hash seeds 0, 1, 42, and 123456789 are terminal **PASS**, exit 0, empty stderr. Each run contains the same fixture suite; repeat runs are not counted as additional unique cases:

| Fresh fixture family | Per-run result |
|---|---:|
| Public all 120 insertion orders × equality result modes × hash/eq/truth/finalizer stages × mutation/raising actions × selected trigger positions | 93,600 parity cases; 28,080 actions actually triggered |
| Mixed exact-string + custom or str-subtype keys, all root/carrier orders/positions, set and frozenset expected containers | 2,784 private rejections with no key hooks |
| Short-circuit malformed shape/tag/null precedence and opaque payload protocol bombs | 24 checks |
| Repeated raw cell/row input, newly built output-container isolation | 9 toy assertions |
| Sensitivity checks | Capture-selected-once and compare-before-screen rejected |

Parity compares ordinary return value, exception class/text, protocol event order, and whether a mutation fired. It covers Boolean/integer comparison results, `NotImplemented`, truth objects with `__bool__`, truth objects with `__len__`, and immediate truth-result finalizers. Finalizer exceptions are not used as ordinary propagated-error fixtures; no unraisable output occurred.

The first model attempt failed during **fixture construction** because a deliberately wrong hash collided with an un-replaced exact key. That own-model fixture was corrected; `MODEL-ATTEMPT-01-FIXTURE.stderr.txt` retains the failure. It is not an application or C1/C2 failure. Initial corrected results predate the two added sensitivity checks; the final four hash-seed results include them.

These results are fresh stdlib correctness evidence. They neither rerun nor supersede the historical codec-theory 7,680 order/tag/null model, malformed/root model, mixed-key model, finite-bit fixtures, real FP/GC tests, native regressions, or fresh-process paired public studies.

## Required coordinator verification before any acceptance decision

- Review exact diff/call graph and tail AST identity before tests. Under C1-P, require the complete public `_carrier_payload` source to stay verbatim; enforce tail identity in the actual suite. No guard movement.
- Port the fresh ordinary truth-result/finalizer/mutation/raising fixtures and both sensitivity controls to the actual public codec test apparatus. Preserve exact error family/text and both selected lookups.
- Retain all 120 carrier orders, 24 root orders, fresh equal/noninterned strings, missing/extra/unknown/case-changed keys; private exact-container/key/payload subtype bombs must still fail without invoking their protocols.
- Retain all current malformed tag/null/domain/text/int64/finite/signed-zero/subnormal and public subtype tests. This lane intentionally performed no new float or hardware-control test.
- Verify late malformed output after a large valid prefix produces no public SnapshotResult/JSON prefix and no evaluated-command commit; test rollback/recoverability with the genuine store.
- Run actual current-reader GC/public reentry and independent public guard denial tests; a toy no-FP model is not a fresh-control proof.
- Keep original accepted-item1 and reader controls, provenance/exits/tagged public-result checks, empty/tiny controls, and paired fresh-process query/query_json acceptance method. C1-P adds no public helper call. If C1-S is chosen instead, measure/disclose its separate public `from_carrier` helper-frame cost rather than hiding it behind private gains.

The pinned V2 header still warns that its API is unstable and specific-version-tied. The preceding recommendation does not change that status. [Pinned V2 warning](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L14)

**Bottom line:** prefer C1-P + C2 as the bounded next source trial: public function verbatim, a tiny private tail clone tied by an actual-suite AST invariant, unchanged private admission/domain/guards. Original C1-S remains semantically plausible with disclosed public-frame costs. Exact lookup/screen ordering is mandatory for either. No application/performance acceptance comes from this lane.
