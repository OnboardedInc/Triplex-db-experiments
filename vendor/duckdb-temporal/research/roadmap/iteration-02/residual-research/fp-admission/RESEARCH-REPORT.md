# Residual FP-admission cost: fresh control-mode observation

Research checkpoint: 2026-10-30 UTC. This worker is research-only. The application, public guards, candidate source, engine binary, performance samples, caps, storage roots and transaction boundaries were not changed. Item 2 remains held; this is a decision input, not an acceptance claim.

## 1. Recommendation

**Select a narrowly scoped candidate: replace only the implementation of each fresh control observation with glibc 2.41's public `fegetmode`, using a fresh, call-local, owned 8-byte ctypes structure and direct unsigned integer fields. Preserve `read_controls() -> Controls`, both predicates, error translation and every current guard location. Fail closed if the exact binding/layout/read fails. Do not combine this with guard elimination, scratch pooling, PyDLL/GIL changes, or per-cell codec changes.**

This is a stronger first candidate than trying to remove readiness checks. The newly retrieved public mode reader captures the complete CW and MXCSR required by current admission using two control-register stores, instead of the existing environment reader's save/restore sequence. The implementation is fresh for each invocation; only the immutable ABI/library/function binding can remain cached. No prior successful observation becomes permission for a later public call. [Pinned glibc mode implementation](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86_64/fpu/fegetmode.c), [public API contract](https://sourceware.org/glibc/manual/2.41/html_node/Control-Functions.html).

**Compatibility limit:** control-mode observation is not a promise to preserve every x87 condition-code bit. Intel lists C0/C1/C2/C3 as undefined for FNSTCW, although all observed status values remained identical in this research. If the project requires an architectural guarantee covering those bits, choose the existing `fegetenv` with decoding-only improvement instead. No empirical result removes that caveat. [Intel SDM 2A, 3-389](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-2a-manual.pdf#page=491).

## 2. Exact source and scope

Text inspected from the immutable 267-file `candidate-snapshot-ffc524` export:

- `storage/fp_environment.py`: SHA-256 `facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c`.
- `storage/typed_store.py`: SHA-256 `25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc`.
- `storage/store.py`: SHA-256 `10fe4928a74ac0230b07d4ea8871399651fcb82a54c43ffa94c47dfb350c6552`.
- Export manifest SHA-256 `eb52a0acd82a49d82e03c633793b8337e9c9c94cbab73a580227d3ec78e81b04`.

The target is CPython 3.12.14, Linux x86-64, little-endian LP64, glibc 2.41. The logical `td_query_v2` language/API is not DuckDB's unstable C-API-v2 ABI. Nothing here alters the exact DuckDB 2.0.0/d54cbbe3df engine pin or extension provenance.

The prior coordinator-verified macro campaign is context only: batching improved the hardened candidate but did not recover the accepted-item-1 baseline, and fixed guard counts remain six per `query`, seven per `query_json`. This worker did not run another DB/native-engine campaign or collect microtimings. Reducing a fixed read cost might help empty/tiny controls but cannot, without actual macro evidence, explain or eliminate per-cell/native/serialization residuals.

## 3. New public API proof

### API, layout and feature guards

glibc 2.41 declares `fegetmode(femode_t *)` under `__GLIBC_USE(IEC_60559_BFP_EXT_C23)`. Its public x86 header defines an unsigned-short CW, a reserved unsigned short, and an unsigned-int MXCSR. The admitted ABI therefore has size 8, alignment 4, and offsets 0/4. The declaration/definition gate is enabled by GNU or requested IEC-60559 extensions, or C23 exposure; `_GNU_SOURCE` was explicitly used for the header proof. ctypes does not need a C preprocessor macro at runtime, but the layout proof must use an exposed public declaration. [fenv declaration](https://github.com/bminor/glibc/blob/glibc-2.41/math/fenv.h#L131-L141), [x86 public type](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86/fpu/bits/fenv.h#L94-L106), [feature gate](https://github.com/bminor/glibc/blob/glibc-2.41/bits/libc-header-start.h#L45-L77).

`header_abi_static.c` passed `cc -std=c11 -Wall -Wextra -Werror -fsyntax-only`: both mode and existing environment sizes/alignments/offsets, exact glibc, LP64, byte width, endianness, and the mode function-pointer declaration were statically asserted against installed public headers. No executable was linked or run for this proof. The installed `bits/fenv.h` SHA-256 exactly matches the freshly retrieved glibc-2.41 source receipt.

### Symbol and machine-level observation

glibc's public version map puts `fegetmode` in GLIBC_2.25. Installed libm exports `fegetmode@@GLIBC_2.25`; `readelf` also finds the existing `fegetenv@@GLIBC_2.2.5`. The observed installed binary SHA-256 is `6d567d53e895273ca14a1f9dc164fc6c8d39aed2f60aa46a733c2784228915f3`. These are read-only installed-binary receipts, not a broader portability guarantee. [glibc symbol map](https://github.com/bminor/glibc/blob/glibc-2.41/math/Versions#L218-L220).

Fresh source and read-only disassembly agree: mode observation writes CW at offset 0 and MXCSR at offset 4; no control-loading instruction occurs. Existing environment observation uses FNSTENV, FLDENV and STMXCSR at offset 28. The previous worker's failed deeper source retrieval is not a reason to reject this path: the current official-source GitHub connector retrieved it successfully. [mode source](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86_64/fpu/fegetmode.c), [CW macro](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86/fpu_control.h), [environment source](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86_64/fpu/fegetenv.c).

The instructions store into caller-provided memory, not into host control registers. Intel documents FNSTCW's no-wait behavior and STMXCSR's absence of SIMD FP exceptions. Memory/protection/unsupported-instruction faults remain hardware possibilities for invalid targets/pointers; Python exception wrapping is not a signal/crash sandbox. Validated call-local storage and target admission matter. The C0/C1/C2/C3 qualification above must remain. [Intel CW instruction](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-2a-manual.pdf#page=491), [Intel MXCSR instruction](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-2b-manual.pdf#page=649).

### Completeness for existing admission

Both returned unsigned words contain all currently checked bits: six x87 exception masks, x87 rounding, six MXCSR masks, MXCSR rounding, DAZ and FTZ. The current predicates intentionally ignore sticky exception flags, x87 precision-control bits and other unrelated bits; changing observer must not silently expand/reduce those predicates. MXCSR's sticky bits still appear in the raw word, even though they are not mode-admission failures. There is no need to read x87 status merely to reproduce these predicates.

GNU documents zero success/nonzero failure, not unconditional success on arbitrary systems. Although this exact implementation returns zero, keep the return check. No nonzero/exception/missing-symbol case should select a permissive default or blindly try a different layout. [GNU API contract](https://sourceware.org/glibc/manual/2.41/html_node/Control-Functions.html).

## 4. Storage, decoding, lifetime and callback proof

The minimal owned representation is an exact private ctypes `Structure` with fields `c_ushort` CW, `c_ushort` reserved, `c_uint` MXCSR. At binding admission, verify size, alignment and both member offsets in addition to all extant target checks. Use no packing override, bitfield, address guessing, Python-object memory access, executable stub, or optional production helper. Allocate a new instance on every observation; keep it local until fields have become exact Python integers and `Controls` has been built.

CPython's typed field descriptors read fixed unsigned C fields into Python integers. A primitive field read does not need a temporary nested structure. For a 32-byte environment fallback, an anonymous integer-field overlay avoids the nested-view allocation; its offsets/alignment need explicit proof. These are representation optimizations, not relaxation of public admission. [Pinned field getters](https://github.com/python/cpython/blob/v3.12.14/Modules/_ctypes/cfield.c), [typed CData dispatch](https://github.com/python/cpython/blob/v3.12.14/Modules/_ctypes/_ctypes.c#L3087-L3098), [documented anonymous fields](https://github.com/python/cpython/blob/v3.12.14/Doc/library/ctypes.rst).

`ctypes.byref(local)` retains the owner while supplying its pointer, and the local frame also owns it through the call and decoding. The cached binding retains the loaded library/function lifetime. CDLL releases/reacquires the GIL around libffi; that does not move the native call to another OS thread. Other threads cannot overwrite a fresh unpublished local buffer. A Python signal/GC callback can still run around interpreter boundaries, and no two-instruction CW/MXCSR read is an atomic snapshot against hostile same-thread mode mutation. Keep the continuous-supported-controls premise; do not turn this optimization into a callback-freedom claim. [Pinned byref owner reference and foreign call](https://github.com/python/cpython/blob/v3.12.14/Modules/_ctypes/callproc.c#L1740-L1782), [GIL handling](https://github.com/python/cpython/blob/v3.12.14/Modules/_ctypes/callproc.c#L915-L965), [signal semantics](https://github.com/python/cpython/blob/v3.12.14/Doc/library/signal.rst).

The current `bytes(saved.data)` creates a ctypes array view and copies its buffer; **it is not a 32-element Python integer iteration** on this pinned implementation. The existing two `unpack_from` calls each construct a result tuple. A cached `Struct('<H26xI').unpack_from(saved)` avoids the view/copy and uses one result tuple; `Struct('<H2xI')` likewise decodes an 8-byte mode buffer. Direct scalar fields avoid that intermediate unpack tuple altogether, while preserving the final `Controls` object. None is allocation-free. [Pinned bytes buffer path](https://github.com/python/cpython/blob/v3.12.14/Objects/bytesobject.c#L2688-L2705), [struct unpack implementation](https://github.com/python/cpython/blob/v3.12.14/Modules/_struct.c#L1647-L1685), [buffer API contract](https://github.com/python/cpython/blob/v3.12.14/Doc/library/struct.rst).

### Reuse is not automatically safe

A reused byte buffer is not itself a cached permission, **if every observation overwrites it freshly**. Nevertheless, a global or thread-local scratch buffer can be overwritten by same-thread reentry after the outer native read but before its decode. A recursive lock does not prevent that; a nonrecursive lock can deadlock. Synthetic evidence here demonstrates both outer-result corruption with shared scratch and independence with fresh local scratch.

An explicitly passed query-local scratch owner could theoretically serve multiple sequential checks, but it requires an in-use lease, nested-call independence, pointer nonescape, guaranteed exception cleanup, and proof no public callback receives its owner. That extra protocol is unnecessary for an 8-byte fresh buffer and is not recommended now. Even local object allocation/decref can trigger GC/finalizers elsewhere; reducing allocations does not establish universal callback-freedom. [Pinned decref warning](https://github.com/python/cpython/blob/v3.12.14/Doc/c-api/refcounting.rst), [GC allocation/callback behavior](https://github.com/python/cpython/blob/v3.12.14/Doc/library/gc.rst).

## 5. Why six/seven guards are not six/seven interchangeable checks

Source-only call graph for default `query`:

| Read | Current source boundary | Reason not to remove it casually |
|---|---|---|
| 1 | `query` entry `_ready`, line 655 | Rejects unsupported/closed entry before caller getters; establishes error priority. |
| 2 | `_ready` after `_prepare_query`, line 659 | All six getters can run arbitrary code, close via RLock, change FP modes or raise; must reject before budget/BEGIN. |
| 3 | `_check_budget -> physical_bytes`, lines 660/618 | `physical_bytes` is independently public and also used after COMMIT/close; unguarding the method weakens other entries. |
| 4 | `_query`, line 646 | Precedes native query after BEGIN/position reads; also serves evaluated commands after staging/carrier callbacks. |
| 5 | `_native_result_wire` entry, line 185 | Comes after complete execute/fetch and before result protocols/float packing; preserves FP-error priority for malformed output. |
| 6 | `_native_result_wire` exit, line 211 | Detects state changes during eager conversion before publishing; existing final-guard and GC-reentry tests depend on it. |

`query_json` adds its own `_ready` at line 672 before dynamically dispatching `self.query`; that is the seventh read. The entry pair looks adjacent for an ordinary base instance, but removing the outer one permits an overriding `query` to run without `query_json`'s guard. Bypassing `self.query` by unconditional base dispatch silently changes Python subclass/monkeypatch behavior. A split private same-core implementation could potentially share only this wrapper entry check, with a proven compatibility fallback for overridden dispatch. That is a separate API/error-order design change, not yet proven or selected.

Likewise, bypassing public `physical_bytes` internally would require auditing every inherited budget path, close/idempotence/postcommit error semantics and override behavior. Removing the post-getter check is directly contradicted by existing close/mode-changing getter tests. Treat `_query` as nonlocal: it is also used by `transact` after caller-controlled assertions/carrier staging. No guard-removal patch is recommended by this research.

Pinned DuckDB result source explicitly permits GIL release while fetching chunks and transitive Python-reference teardown during result destruction. Thus, a native boundary is not proven callback-free simply because the eventual nested data is exact builtins. Preserve the complete execute/fetch boundary and trusted-callee premise; do not claim automatic safe cleanup after an arbitrary corrupted native callee. [duckdb-python v2.0.0 result implementation](https://github.com/duckdb/duckdb-python/blob/v2.0.0/src/pyresult.cpp#L24-L35), [fetch boundary](https://github.com/duckdb/duckdb-python/blob/v2.0.0/src/pyresult.cpp#L129-L156).

## 6. Relation to database optimization theory

X100 supports amortizing interpreter/function overhead over bounded vectors; it does not prove that observing mutable process/thread state is stable for a whole public command. Current batch conversion already makes the observed read count independent of float-cell count. The next isolated question is cost per mandatory fresh read, not permission hoisting across callbacks. [Original CWI X100 paper](https://ir.cwi.nl/pub/16497/16497B.pdf).

PostgreSQL distinguishes side-effect-freedom from statement stability: even a read-only function needs volatile treatment when its answer may change during a query. This is a useful analogy, not an imported SQL contract for the Python store. Its expression rules also show why error ordering must be stated rather than assumed. LLVM similarly does not make call-count observability disappear merely by calling something speculatable. **Inference:** guard deduplication needs an explicit effect/callback/error-order proof, not only equal values on the happy path. [PostgreSQL volatility](https://www.postgresql.org/docs/18/xfunc-volatility.html), [expression rules](https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-EXPRESS-EVAL), [LLVM speculation semantics](https://llvm.org/docs/LangRef.html#speculatable).

## 7. Alternatives, priority and rejection conditions

| Alternative | Evidence/benefit hypothesis | Decision |
|---|---|---|
| Fresh local `fegetmode` + scalar fields | Complete required words, smaller public record, no save/restore, independently checked ABI; no timing claim | **Preferred narrow candidate**, subject to condition-code contract decision. |
| Keep `fegetenv`, one-shot buffer `Struct('<H26xI')` | No new native API or layout; removes view/copy/one unpack tuple | Conservative fallback candidate if mode contract is unacceptable. |
| Keep `fegetenv`, anonymous typed overlay | Avoids view/copy/unpack tuples; unchanged native observation | Also viable; more ctypes layout machinery than combined unpack. |
| Fresh local `fegetmode` + combined buffer unpack | Same mode/native proof; one intermediate tuple | Valid alternative, not discarded; scalar fields are simpler for this exact layout. |
| Call-local scratch reuse | Can retain fresh native reads | Defer: lease/reentry/lifetime complexity, unmeasured benefit. |
| PyDLL / PYFUNCTYPE retaining GIL | Could avoid GIL switching for a tiny read | Defer as an independent experiment: documented Python-error-flag checking and scheduling change, not needed for this proof. |
| Wrapper/common-core entry deduplication | At most a narrowly provable 7→6 path without changing public guards | Defer pending override/error-order proof and compatibility tests. |
| `fegetround` alone or exception getters alone | Missing split-unit rounding/masks/DAZ/FTZ information | Reject as a complete replacement. Exact glibc `fegetround` checks only x87. |
| Raw instruction stub/private Python float memory/new optional helper | Outside allowed architecture, or new native dependency | Reject here, irrespective of possible speed. |
| Global/thread-local permission cache, host repair, weakened public masks | Violates stated safety/continuity contract | Reject. |

PyDLL is not assumed unsafe merely because it is different: its documented behavior is CDLL-like with retained GIL and Python error checking. Those differences deserve an explicit independent decision, not a bundled optimization. [Pinned ctypes documentation](https://github.com/python/cpython/blob/v3.12.14/Doc/library/ctypes.rst), [pinned x87-only rounding reader](https://github.com/bminor/glibc/blob/glibc-2.41/sysdeps/x86_64/fpu/fegetround.c).

## 8. Failure and compatibility obligations

1. Unknown OS/architecture/libc/endian/LP64/type size/IEEE representation or bad mode size/alignment/offset: reject before binding. Do not widen the target just because another libc exports the same name.
2. Missing `libm.so.6`, absent public `fegetmode`, binding/type failure: same domain error family with explicit validated-mode ABI text; do not guess a symbol or silently return defaults.
3. Nonzero native read or raised Python exception: fail closed; never treat zero-initialized output as supported. Preserve existing exception chaining and review constructor/MemoryError wrapping order rather than inadvertently broadening catches.
4. Supported flags with arbitrary sticky values remain supported. `require_masked` must remain mask-only for initial public float admission; it must not become the stricter store predicate. Cached immutable Value identity remains integer-only later.
5. `read_controls` must preserve the exact `Controls` field names/order and observation independence. Retain existing `read_controls` instrumentation/public guard tests; don't optimize `require_*` by bypassing it without a separate compatibility decision.
6. A nonzero read must not trigger automatic restore/repair. A failed mode read must not blindly fall back to environment reading. If a future explicit fallback is desired, it needs its own admitted known ABI and documented binding-only selection; this proposal chooses fail-closed simplicity.
7. Native calls write only to owned live storage; no pointer or scratch state escapes. No claims of catching native SIGFPE/segfault in Python, protecting hostile finalizers, or making the whole command callback-free.

## 9. Research verification completed, not application acceptance

All plans preceded their runs; all raw records are retained.

- Public installed-header static proof: PASS; no linked executable.
- Existing binary/header symbol/instruction receipts: PASS, recorded in `verification-01/header-symbol-instructions.log`.
- Synthetic representation cases: **135,232 PASS**. Every CW pattern, every MXCSR low word, bit edges and deterministic full-width pairs match scalar mode fields, combined mode unpack, existing two-unpack environment decode, combined environment unpack, anonymous environment overlay and independent integer byte decoding. Inputs are synthetic memory only, never host registers.
- Current-default observations: **128 env→mode→env triples / 384 fresh reads PASS**, all controls equal, canaries/reserved untouched. Observed CW `0x037f`, MXCSR `0x1fa0`; the precision sticky flag was admitted, not cleared.
- Synthetic nested observation: fresh local storage preserves outer words; a shared scratch buffer is overwritten by inner words. This is a deterministic reentry mechanism demonstration, not a claim to have tested arbitrary hostile native callbacks.
- Coordinator-authorized nondefault parity: **79/79 fresh isolated children PASS**, no retries or dropped signals/exits. Matrix: 64 split x87/SSE rounding × DAZ/FTZ configurations, 12 individual unmask bits, three sticky combinations. Required control words, sticky bits, observed full status, raw bytes, canaries, reserved fields and saved-state restore checks all passed. All setter calls were confined to the unchanged existing test helper copied inside this directory. No candidate/DB/engine/store import or float codec use occurred in these children.
- Controlling process before/after full environment raw bytes and both controls were identical. No host repair ran in that process.

The original default-run summary captured an open redirected stdout log as empty; an additive postrun manifest documents and independently corrects that one file-hash receipt. The original record is preserved. There was no rerun or outcome change.

### Required next checks after the coordinator saves its decision

Only then implement the narrow reader change. Extend the existing inspectable helper's public-header mode-layout assertions and binding-failure tests (the current tests still assert `_FenvStorage` size 32). Keep its independent public-fegetenv read oracle. Run the full existing mask/round/DAZ/FTZ/sticky/public-Value/public-store/batch/GC/getter-close/malformed-native/transaction rollback/postcommit-receipt suite, including lost-ack semantics. Add fresh-per-call and recursive-observer tests, missing-symbol/failed-read/zero-output/corrupt-offset negative cases. Reader replacement alone must leave six/seven guard counts unchanged across F0/F1/F16/F256/F1024.

Then rerun the **predeclared same-contract persisted complete-return-statement** performance comparison with unchanged native binary, physical fixture, operations/caps/roots, ordered pairing and negative controls. Preserve the existing previous-result-disposal timing boundary rather than secretly changing it. Only macro evidence can establish recovery against both hardened and accepted-item-1 controls. If recovery remains blocked, renew primary-source research; do not accept this mechanism result as a substitute.

## 10. Evidence and publication

Primary entry points: `SOURCE-RECEIPTS.json`, `WEB-SOURCE-RECEIPTS.json`, `SOURCE-AND-PARITY-VERIFICATION.json`, final `SOURCE-CLOSURE.json`, both predeclared test plans, original scripts, `verification-01/`, `nondefault-verification-01/`, and `RETRIEVAL-AND-LIMITS.md`. Source receipts are exact connector-text hashes; web-only pages/PDFs have version/URL receipts and no invented byte hashes.

Publish only the curated handoff/archive and short notes through the coordinator into private research-reference. Exclude the private third-party source cache and compiled helper binary. Include generated raw cases/child records losslessly in the research archive; source URLs/hashes permit source refetching. No application source, branch, PR, Page, merge or deployment was changed by this worker.
