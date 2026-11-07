# Independent source/ABI review — frozen reader-only candidate 01

**Outcome: no must-fix defect identified in the reviewed reader-only change.** Source/ABI checks and independent synthetic ownership/failure/predicate models pass. This is not hardware/store acceptance, a performance result, item 2 acceptance, or production-readiness certification.

Reviewed 2026-10-31 UTC. Frozen source was supplied by the coordinator before candidate text access; only an independently hash-gated, read-only owned reader copy was imported. No live writer files were read. No application file, Git/PR/Page, accepted source, native artifact, benchmark, or database was changed.

## Exact reviewed source

Frozen export: `/tmp/temporal-roadmap-research/iteration-02/residual-reader-implementation/candidate-01/source`.

| Artifact | SHA-256 |
|---|---|
| Frozen 268-entry export manifest | `f90aeb568221184c8a858bb6f639659df77ba9dad67994dd22e91b3b3b9e1130` |
| `storage/fp_environment.py` | `92169be543692ff30a1824fa0add9cdb7e3139c864bdef8fdc5d1b0ec9710164` |
| `storage/tests/fp_environment_helper.cpp` | `599228e22d387b9de5f7c1f63ed636fe381d839680811220fea9b998daf3c3cc` |
| `storage/tests/test_fp_environment.py` | `938ef2f31b817dd5e617eb76acef13cacc8b2b5eec1fd02e73566ebc27473d1f` |
| `storage/tests/test_fegetmode_reader.py` | `c2f9974ab8a2dfff6acbf0afa30d839866f66cea5b7b55ba090d705420d62c83` |

The old immutable export has 267 entries and manifest SHA-256 `eb52a0acd82a49d82e03c633793b8337e9c9c94cbab73a580227d3ec78e81b04`. Every old and new manifest entry was verified. Exactly three old writer-owned members changed and the fourth writer-owned test file was added. All **264 non-owned old members** remain exact, including typed store `25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc` and legacy store `10fe4928a74ac0230b07d4ea8871399651fcb82a54c43ffa94c47dfb350c6552`. Thus guard positions, API/subtype/hook dispatch, native/browser/schema paths, transaction/cleanup boundaries, roots and budgets were not rewritten by this candidate.

## Independent checks actually completed

- **Public header proofs, syntax-only:** both the independent review probe and frozen helper compile with `g++ -std=c++17 -Wall -Wextra -Wpedantic -Werror -fsyntax-only`. Nothing was linked or executed. Public `femode_t` unsigned field types, size 8, alignment 4 and offsets CW/reserved/MXCSR 0/2/4 agree with production ctypes storage. The separate `fenv_t` oracle remains size 32/CW 0/MXCSR 28.
- **Fresh primary-source retrieval:** eight pinned glibc 2.41 / CPython 3.12.14 files were independently fetched and hashed. GNU manual 2.41 and the Intel instruction reference were read through the web tool. Two initial GitHub web-cache misses remain recorded; the pinned files were subsequently obtained through the public GitHub connector. Full third-party caches are excluded from the publication package.
- **Installed ABI, read only:** installed public header SHA-256 `66736e50e7e29aca7293e465d7fbe0d3042d4b714987d6e86f8bcbcb4a95e823` matches pinned glibc source. Installed libm SHA-256 `6d567d53e895273ca14a1f9dc164fc6c8d39aed2f60aa46a733c2784228915f3` exports `fegetmode@@GLIBC_2.25`. Read-only disassembly stores CW at 0 and MXCSR at 4 and returns zero, without control-loading instructions.
- **Production semantic preservation:** `FloatEnvironmentError`, `Controls`, `_failure`, `require_supported` and `require_masked` are exact AST matches to the old immutable baseline. All eleven original non-storage target checks and the binding-cache decorator are exact AST matches. Only the old storage size/alignment terms become the five explicit mode size/alignment/offset terms; no Python-version admission gate was added or removed.
- **Old tests retained:** after enumerated private-storage ABI assertion updates, five added ABI-reporting helper exports, the private class-name update and one additive physical-child outcome log, all nine old top-level test functions/classes are exact AST matches. The old 56-child schedule and every old physical-behavior assertion are retained, including restore-before-cleanup and no-engine/lost-ack behavior. All original C++ helper function bodies remain byte-exact, including its public `fegetenv` oracle. These old physical children were **not rerun in this review lane**.
- **Independent owned-copy models:** 13 groups pass with zero failures/errors. They cover all original target gates, real alternate bad layouts, every field offset, exact alignment, absent library/symbol, both prototype-assignment failures, library/function lifetime, raw-zero versus admission, fresh calls, nonzero/raised/partial-output failure, error identity/chaining, constructor `MemoryError` priority, both field-decoding failures, 64 retained separate owners, recursive fake callback reentry, eight overlapping fake-thread reads, and **262,144 projected mask/rounding/DAZ/FTZ combinations** (524,288 projected predicate evaluations). All output words are synthetic memory, never host controls. Actual native library loading was blocked throughout this process; no DB or engine was imported.

## Source review conclusions

`_FemodeStorage` uses native unsigned short/short/int fields without packing. Binding validates exact target/layout before loading the named public library and declares `POINTER(_FemodeStorage)` / `c_int`. The cached tuple retains library and function; it contains no observed FP permission. Every `read_controls()` allocates a fresh unpublished local owner and makes a fresh call, then returns scalar Python integers in the unchanged `Controls` order. The local frame plus `byref` ownership keep storage live through decoding. No shared scratch, lock/GIL-model change, PyDLL, private Python memory, executable stub, native production helper, repair, or fallback was introduced.

Nonzero returns reject without publishing partial output. Python binding/read exceptions retain the domain-error family and cause chaining; direct domain errors retain their identity. Owned-storage construction remains outside the read wrapper, preserving its `MemoryError` priority. A purported successful unwritten output correctly remains raw `Controls(0, 0)`, while both guards reject it. Mask-only float admission was not silently strengthened into full store readiness. Sticky and unrelated bits remain raw observations, not new admission conditions.

New tests accurately separate the independent public-header oracle, synthetic controls, isolated hardware setters and explicitly authorized native guard-count checks. Their native path has an explicit extension digest gate and otherwise reports unrun. No acceptance-critical old assertion was weakened or removed. The existing whole-status equality assertions remain empirical regression tests, not architectural guarantees.

## Important limits and remaining gates

- Intel specifies FNSTCW's x87 C0/C1/C2/C3 condition bits as undefined. Observed whole-status parity does **not** establish whole-fenv architectural preservation. The source correctly states control-word observation/no application repair, not the stronger contract.
- CW and MXCSR are read by separate stores; there is no atomic snapshot against hostile same-thread control mutation. Unchanged CDLL GIL release does not move a call to another OS thread, but does not establish callback freedom. Synthetic recursion/thread models establish only owned-buffer isolation.
- Continuous supported controls, trusted callees, caller codecs and cleanup obligations remain. Python exception handling is not protection against native signals or arbitrary corrupted-callee/finalizer behavior.
- No physical FP setter, default/native observer read, 56-child suite, actual store, DB engine, aggregate verifier, sanitizer, browser, profile or performance campaign was executed here. The independent acceptance lane and coordinator own those checks. Source-preserved six/seven guard positions are not independently recertified runtime counts by this reviewer.
- The exact native artifact remains outside this change. Residual latency recovery needs the coordinator's new strict, predeclared macro comparisons against both controls with the same binary/fixtures/endpoint. This review supplies no speed claim and does not open roadmap item 3.

## Primary references

- [glibc 2.41 public mode implementation](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86_64/fpu/fegetmode.c), [public x86 fenv/mode types](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86/fpu/bits/fenv.h), [public declaration](https://github.com/bminor/glibc/blob/glibc-2.41/math/fenv.h), [CW instruction macro](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86/fpu_control.h), [version map](https://github.com/bminor/glibc/blob/glibc-2.41/math/Versions).
- [GNU 2.41 control-function contract](https://sourceware.org/glibc/manual/2.41/html_node/Control-Functions.html): mode save, zero success/nonzero failure.
- [CPython 3.12.14 scalar field getters](https://github.com/python/cpython/blob/v3.12.14/Modules/_ctypes/cfield.c), [byref owner and foreign-call lifetime/GIL implementation](https://github.com/python/cpython/blob/v3.12.14/Modules/_ctypes/callproc.c), [ctypes documentation](https://github.com/python/cpython/blob/v3.12.14/Doc/library/ctypes.rst).
- [Intel SDM 2A, FSTCW/FNSTCW, printed 3-389](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-2a-manual.pdf#page=491).

Reproduction and raw evidence: `REVIEW-PLAN.md`, `review_source_closure.py`, `audit_existing_assertions.py`, `test_reader_models.py`, source/copy closures, model result/log, assertion audit/result log, public-source receipts and `INSTALLED-ABI-READONLY.txt`. Root owns durable publication and final acceptance.
