# FP cost: admission, callback and error-boundary research

30 October 2026. **Research only. No production implementation decision is selected here.** All writes/prototypes are under this new admission research directory. Earlier frozen evidence and production source remain unchanged.

## Executive finding

A private, non-escaping conversion of an already-materialized native result can amortize FP checks without a cross-call success cache: freshly check full controls after execute/fetch, perform the same carrier/domain/canonicalization checks for every exact built-in cell, and check full controls again before publishing the complete output. A fresh pre-execute check belongs after request callbacks/argument evaluation. Independent public Value, codec, connection, readiness, migration and close guards must remain independent even when called reentrantly. This recommendation is **conditional on the explicit proof/test obligations below**, not authority to implement.

The safest initial scope is the query result-to-wire loop. It currently constructs and discards a Value for every result cell. History returns Value objects and history_json also converts timestamps; batching those paths has different identity/callback obligations and should not be folded into this first change merely for consistency.

A second, separable alternative is decoding the same public fegetenv output directly from our own aligned ctypes buffer with one integer `Struct('<H26xI').unpack_from`, retaining every fresh read and target check. It is not an object-memory trick or a new native dependency.

## 1. Reconciled current behavior and observed motivation

The actual inspected typed_store.py and fp_environment.py are still SHA256 `abe7424366b9d528fa1378c8e9d5f12e7f4e80d93a1c433712a76d916760c555` and `facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c`. Source hashes, not a presumed local Git label, identify the inspected source.

Current `_query` executes the fixed real-native SQL and then applies `Value.from_carrier(cell).to_json()` to every result cell. An f64 cell causes a masks-only preflight before initial struct packing, finite/zero normalization and cached identity construction, followed by a full preflight in public to_json. Query has fixed readiness/observed-size checks; query_json adds its own readiness guard around query. Thus float256 produces512 per-cell fenv reads plus2/3 fixed reads. This matches the separate SQL owner's profile:514/515 actual reads per public call; mixed64 has16 f64 cells and34/35 reads.

The coordinator's matched persisted-control evidence reports float256 query/query_json median paired ratios1.2729/1.2632 with95% intervals[1.1439,1.3261]/[1.1782,1.3424], while mixed64 is inconclusive and all480 outcomes pass. Native SQL42-pair screens have no declared signal. These are separate studies, not measurements by this lane and not proof that every microsecond of the persisted difference is an fenv call. Their source evidence is `performance/persisted-control/analysis/summary.json` and `profile-candidate/summary.json`; this lane records their hashes only, without rewriting them.

## 2. Fresh primary-source facts

### CPython's public struct API is not intrinsically trap-free

In CPython3.12.14, `_struct.c`'s big-endian double packer obtains a double and compares an error sentinel before Pack8. Its double unpack wrapper also performs a floating sentinel comparison. On the admitted IEEE path, Pack8 copies the double representation; the wrapper distinction remains decisive for subnormals/signaling NaNs with exceptions unmasked. Initial public Value admission must therefore retain masks preflight. Do not replace it with a claim that all struct operations are pure bit copies. [CPython `_struct.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/_struct.c), [CPython floatobject.c](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/floatobject.c).

### ctypes overhead and GIL semantics

CPython's foreign-call path prepares libffi argument/result machinery and releases/reacquires the GIL for ordinary CDLL calls. PyDLL has different Python-error/GIL semantics and is documented for Python C API calls; switching to it is not selected here. Reducing repeated foreign calls is a plausible mechanism, but GIL retention is not a proof that controls cannot change. [CPython callproc.c](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/_ctypes/callproc.c), [ctypes documentation](https://docs.python.org/3.12/library/ctypes.html).

### The selected public fenv API/ABI remains exact and read-only

GNU documents fenv_t representation as implementation-defined. The selected glibc2.41 header has the x87 control word at0 and MXCSR at28 in the validated32-byte layout. glibc's fegetenv internally saves/restores x87 state and reads MXCSR. Neither the batch proposal nor owned-buffer decoder repairs controls, substitutes a helper or assumes portability. Sticky status may change; control compatibility may not. [GNU control API](https://sourceware.org/glibc/manual/latest/html_node/Control-Functions.html), [glibc2.41 fenv header](https://raw.githubusercontent.com/bminor/glibc/glibc-2.41/sysdeps/x86/fpu/bits/fenv.h), [glibc2.41 fegetenv](https://raw.githubusercontent.com/bminor/glibc/glibc-2.41/sysdeps/x86_64/fpu/fegetenv.c).

### Fetch is itself an external/materialization boundary

DuckDB-Python2.0.0's Fetchone releases the GIL while fetching the next chunk, then builds a Python tuple and converts column values. Its release notes explicitly describe streaming execute/fetch behavior. A guard before execute is not a reusable guarantee after fetch. Place a fresh full guard after both have returned, before touching result floats. Available source proves this boundary; missing deeper converter-source retrieval is not replaced by a guess that arbitrary Python objects are safe. [Pinned Fetchone source](https://raw.githubusercontent.com/duckdb/duckdb-python/v2.0.0/src/pyresult.cpp), [official2.0.0 release notes](https://github.com/duckdb/duckdb-python/releases/tag/v2.0.0).

### Ordinary callbacks are real; GIL/exact containers do not abolish them

CPython documents that deallocation can invoke arbitrary Python code. GC may run as allocations cross thresholds, and Python signal handlers run at later interpreter boundaries. Exact native scalar/container checks remove user-supplied iterator/encode/equality dispatch from the conversion path, but cannot eliminate unrelated GC/finalizer/signal activity. The existing supported-host contract already requires compatible controls through the lifecycle and excludes hostile midcall changes/finalizers. Do not silently replace that narrow exclusion with “all callbacks are unsupported.” Ordinary callbacks that preserve the environment remain admissible and may reenter independently guarded public methods. [Reference-counting warning](https://docs.python.org/3.12/c-api/refcounting.html), [GC documentation](https://docs.python.org/3.12/library/gc.html), [signal documentation](https://docs.python.org/3.12/library/signal.html).

The public source already admits str subclasses via legacy._text's isinstance test and may invoke overridden encode. Query subclasses/descriptors can execute code during field access. CPython base Unicode copying and generic str conversion are different operations; generic str(obj) can call an override. Do not tighten public subclass acceptance or normalize a program with generic str as an incidental speed fix. The batch-theory lane separately researched explicit base str.__str__; pinned-host compatibility remains a test obligation. [CPython Unicode implementation](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/unicodeobject.c).

### ABI preservation is an assumption, not a cleanup guarantee

The AMD64 SysV ABI classifies MXCSR control bits and the x87 control word as callee-saved; status bits are caller-saved. Conforming trusted native calls should preserve controls while setting ordinary sticky flags. A fresh post-fetch guard defensively detects a bad return, but does not retroactively make previous materialization or subsequent cleanup safe if a nonconforming callee corrupted controls. [x86-64 psABI source](https://gitlab.com/x86-psABIs/x86-64-ABI/-/raw/master/x86-64-ABI/low-level-sys-info.tex).

## 3. Exact guard-placement proposal

| Boundary | Required behavior |
|---|---|
| Independent public Value f64 admission |Fresh masks-only check before the first floating sentinel/bit extraction; same finite/zero/cached identity rules |
| Independent public from_json/to_json |Fresh full guard at their current f64 boundaries; no inherited batch permission |
| Public store/migration/open/close/readiness/caps |Keep current guards and locks; retain closed-close idempotence and missing-engine persistence |
| Request extraction / ordinary admitted callbacks |Finish the same accepted argument evaluation before the fresh pre-execute guard; do not cache success across descriptors/encoding hooks |
| Execute/fetch |Fresh full check immediately before DB work, and another immediately after execute/fetch has completely returned |
| Private fetched-row loop |Only exact built-in rows/cells/keys/payloads, same per-cell validation/canonicalization; no external callbacks, lazy iterator, exposed context or escaping permission |
| Publication of converted rows |Fresh full check after the local loop, then return the fully built wire result atomically |
| Nested/reentrant public calls |Always their own fresh guard; no global/thread-local/contextvar “already checked” state |
| Later caller JSON encoding/float repr |Still caller's lifecycle obligation; returning a dict cannot protect a later encoder |

The pre-execute proposal must preserve accepted request semantics and exceptions. Taking a generic str snapshot, silently rejecting public Query subclasses, or changing descriptor evaluation counts is not an authorized consequence. Build the intended argument list, then guard; any exact-program snapshot needs its own pinned-host parity proof/decision.

## 4. Shared admission logic: avoid a fast-path semantic fork

A selected implementation should have one carrier-shape extractor and one payload/domain/canonicalization routine, not an independent hand-written “native data is valid” decoder.

- Carrier shape: exact selected field names/tag, tag exactly int rather than bool, precisely one selected nonnull payload, all inactive payloads null.
- Payload domain: existing string/NUL/UTF-8/512-byte admission, exactly bool, exact signed i64 range, exactly float with exponent-bit finite check. Keep all tags disjoint and forbid implicit coercion.
- f64 canonicalization: copy binary64 bits after the appropriate guard; reject infinities/NaNs including signaling encodings; only magnitude-zero becomes canonical positive zero. Preserve subnormal bits. Public Value caches canonical integer bits once; eq/hash/sort remain integer-only.
- Wire construction: same tag names; i64 as decimal string; f64 as the canonical exact float payload. Temporal axes remain decimal strings on public JSON boundaries.

Public constructors use the shared payload routine with the guarded bit reader. Public from_carrier uses the shared shape extractor and public constructor. The private fetched-row path first establishes exact-native provenance, then uses the same shape/payload routines with only the raw byte-copy reader inside the freshly guarded local loop; it can build the wire dict directly without allocating/discarding a Value. Passing a private reader function inside a normal call is not a cached success flag. Nothing records “good FP” across calls or changes how public methods behave reentrantly.

The same provenance requirement applies to the fetched envelope before indexing/copying a purported result dict: establish the pinned host's exact tuple/dict/list layers and string-key structure, rather than first calling arbitrary mapping/iteration hooks. The standalone prototype starts at the rows list, so outer-envelope integration is an explicit unrun obligation.

**Private provenance checks precede callback-capable operations.** An exact dict can still contain custom key objects; verify key types are exactly str before set comparison/lookup. Reject list/dict/str/float subclasses before iteration, encoding or coercion. Public compatibility behavior stays on the ordinary guarded path; private rejection is a trusted-result defense, not a new public restriction.

The current prototype models shared payload admission, and parity checks compare it with unchanged production admission. It does not yet refactor production into a shared carrier extractor. That is an explicit implementation/test obligation if selected, not a completed code change.

## 5. Safety argument and its limits

Under the unchanged bounded host contract: (a) the target/ABI/read succeeds, (b) controls are compatible at fresh entry and remain compatible through the lifecycle, (c) known external/request callbacks are not crossed on an old check, (d) the private loop uses only verified exact built-ins and shared per-cell admission, and (e) output stays local until every cell and the final guard succeed. Then every floating sentinel/normalization runs under the same valid controls that independent per-cell preflight would observe, and a late invalid cell cannot publish partial output.

No claim rests on the GIL preventing all reentry. Ordinary GC/public-callback/nested calls remain active and independently guarded. The46-child experiment includes an ordinary GC callback reentering Value admission, to_json and another batch; all four nested/public fenv reads still occur. A public str-subclass callback also temporarily tests bad-control public admission/codec rejection and restores state before returning. No ambient permission bypasses those guards.

A malicious signal/finalizer that leaves exceptions unmasked between the batch check and a struct sentinel can still trap before the final check. This is already outside the current explicit hostile-midcall/lifecycle contract, not newly certified behavior. Disabling GC is not a substitute: it changes host semantics and does not suppress refcount finalizers or signals.

### Cleanup/error atomicity must not be overstated

Normal carrier/domain errors under supported controls retain existing SQL rollback/receipt semantics. The local prototype demonstrates a fault in the256th cell returns no output and leaves input unchanged. It does **not** demonstrate safe database rollback after an external call returns bad controls. Current inherited exception paths attempt ROLLBACK; no new code should silently repair the host or claim that ROLLBACK is safe in the very state the guard rejects. Preserve the trusted-callee/control-lifecycle precondition; if root wants recovery for corrupted-return state, it needs an explicit tainted/deferred-cleanup/receipt-aware policy and genuine transaction tests before selection. A failed close still does not undo prior commits. A postcommit check cannot be described as rollback; BudgetExceeded(committed_position) behavior stays unchanged.

## 6. Alternatives assessed

| Alternative | Assessment |
|---|---|
| Query-only private guarded batch + direct wire construction |Conditional recommendation. Largest mechanistic reduction; shared validation and exact-input/reentry proof required. No production change authorized |
| Same fegetenv, owned-buffer integer decode |Separable conservative candidate. `struct.unpack_from` accepts a buffer; our aligned storage is owned public API output, not Python object memory. One decode retains32-byte/0/28 ABI and fresh reads. Prototype readonly/failclosed cases pass. [struct buffer API](https://docs.python.org/3.12/library/struct.html) |
| Keep Value objects but skip only public to_json guard internally |May remove one call/cell but retains temporary objects/constructor costs; requires shared guarded internal wire method. Smaller change but weaker expected benefit; not timed separately here |
| Hoist all guards to one public entry / global or thread-local success cache |Reject. Crosses request/native/callback boundaries; stale success survives changed controls. Violates independent public guard contract |
| Cache canonical Value identity bits |Already selected/implemented and must remain; it removes float-dependent equality/hash/order, but alone does not protect unsafe conversion/persistence |
| Drop per-cell validation because native is trusted |Reject. Skips domain/shape/caps defense and risks divergent canonical zero/i64 wire semantics |
| Replace fegetenv with fegetround only |Reject. Does not verify DAZ/FTZ or all masks |
| Switch CDLL to PyDLL/private flags |Not selected. Documentation's intended Python-C-API semantics differ; no reentry proof or need to change foreign-call contract |
| New native evaluator/helper, machine-code stub, Python object memory extraction |Reject. Violates selected independence/safety boundary and makes no-engine persistence depend on new code |
| fegetmode/new fenv layout |Potential separate research direction only. Not selected/probed; changed public API/layout validation is unnecessary for this bounded fix and source retrieval was incomplete |
| Extend same batch to history/migration/assertion inputs |Defer. Public Value identities, timestamp callbacks, public subclass compatibility and lifecycle/receipt boundaries differ; no blanket scope expansion |

## 7. Actual prototype evidence

-43 explicit valid/invalid carrier/domain cases match current rows or exception class.
-200 deterministic random bit draws produced**199 finite cases** (one nonfinite draw skipped). Initial report literal incorrectly said200 finite; raw results/source are preserved and `probe-interpretation.json` records the correction. No timing data was overwritten.
-14 direct shared-payload/public Value cache checks pass; late cell/shape faults do not return partial output; input is not mutated; callback-capable float/key/container subclasses are rejected before hooks.
-Fresh fenv reads in the conversion-only loop: float256 **512→2**; mixed64 **32→2**; empty **0→2**. The new empty batch checks are deliberate safety cost.
-46 isolated children pass with restored controls:16 rounding×denormal modes, independent x87/SSE rounding and every exception mask, sticky flags, bad external-return detection, pre-execute request callback, cross-call invalidation, public callback reentry and ordinary GC/nested entry.
-Helper source SHA256 `99e769a597fc51ce2fdfecbabb05fe50bf10ff836c703f57d87902b209612e9c`; compiled own-path test-only helper SHA256 `6c78b77d812008249eff8798a5f540036227914e78e0d7c5b337b2650abd603c`. No helper is proposed for production.

A small single-process nine-block alternating-order pure-conversion screen produced prototype/current medians0.4023 for float256 and0.7305 for mixed64. Owned-buffer reader/current reader median ratio0.7895. These are exploratory mechanism observations with no CI, not persisted/API/native speedup, not accepted-item1 comparison, and not a causal decomposition of the matched public study. Temporary Value removal, shape validation, function-call/allocation changes and guard reduction are combined in that prototype.

## 8. Required gate before implementation/acceptance

Root must select and durably preserve a precise query-only boundary/cleanup policy first. `TEST-SPEC.md` specifies the required public compatibility, real-native transaction/rollback/no-engine/close/migration/caps/confinement, reentry, source hash and matched persisted timing gates. These prototypes are not a substitute for those tests on the selected implementation. No production writes, Git/PR mutations or acceptance claim were made by this lane.
