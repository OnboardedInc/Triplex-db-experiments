# Exact-pin internal bridge: static build/ABI feasibility

UTC: 2026-10-31. Scope: read-only metadata and official source research only. This is a feasibility option, not a selected contract, implementation, successful build, successful LOAD, or Goal 3 acceptance.

## Result

**Source-plausible and supported by the existing wheel's dynamic exports, but not yet proven buildable/loadable.** A separate C++ translation unit can include the real pinned `duckdb/main/capi_v2/capi_v2_internal.hpp`, recover the actual executing `ClientContext&` through DuckDB's private `capiv2::Convert(context_handle)->context`, and call `DatabaseManager::Get(context).GetDatabases(context, optional_idx(4))`. The public generated v2 entrypoint can remain genuine. This deliberately takes on a **private C++ ABI dependency**; the C_STRUCT_UNSTABLE footer does not validate that ABI.

Static inspection was sufficient to reject one shortcut: **do not simply add private calls to the current unchanged build.** It has only `-Ivendor -Isrc`, links no DuckDB provider, and requires `-Wl,-z,defs`. The new out-of-line calls require both a full exact-pin header closure and an explicit symbol-provider strategy.

## Observed evidence

| Layer | Observation | Limit |
|---|---|---|
| Immutable source | 23 complete official source responses at d54cbbe3df17e8e5ce68312f483b4155836112aa; all recomputed Git blob SHA1 values equal returned hashes | Only bounded excerpts are saved; no complete source/header closure was materialized |
| Host identity | `_duckdb.abi3.so` SHA256 `e7cda112749d860a36cb1524ff465cefecdb0acc5c4e2ff4510ecc1b6f6c061a`; ELF64 x86-64; embedded exact short pin `d54cbbe3df` and `v2.0.0` | Strings are corroboration, not a running version check or full-build provenance |
| Required exports | `DatabaseManager::Get(ClientContext&)` and `GetDatabases(ClientContext&, optional_idx)` are actual FUNC GLOBAL DEFAULT dynamic symbols | Export does not establish loader scope, calling/layout compatibility, or correctness |
| Other exports | `AttachedDatabase::IsSystem/IsTemporary`, optional-index and pointer/vector safety helpers, Identifier equality, and new-ABI InvalidInputException constructors exist | A future compiled object's complete undefined-symbol set must still be checked |
| Loader source | Pinned dynamic provider uses `dlopen(path, RTLD_NOW | RTLD_LOCAL)` at extension_load_dynamic.cpp:72 | Actual current process import flags/link-map state were not observed |
| Wheel dependencies | libdl, libpthread, libstdc++, libm, libgcc_s, libc, ld-linux; no SONAME/RPATH/RUNPATH or FLAGS entries observed | Metadata only; actual loaded dependency paths were not observed |
| C++ ABI | Host exports `std::__cxx11::basic_string` signatures; requires up to GLIBCXX_3.4.22 and CXXABI_1.3.11 | New ABI use is observed; every relevant build flag/layout is not recoverable from these names |
| Static runtime candidate | /lib/x86_64-linux-gnu/libstdc++.so.6 resolves to libstdc++.so.6.0.33, SHA256 `972bb2a18b71140dab0240f8a1f68ab3fb1d56bcd4c4f824a91b70888faf5a00`; has markers through GLIBCXX_3.4.33/CXXABI_1.3.15 | This is a filesystem candidate, not proof that a process loaded it |
| Host toolchain markers | .comment contains GCC 15.2.1, clang/LLD 21.1.8, and GCC 8.5.0 strings | Mixed markers do not identify which compiler/flags built the manager or wrapper |
| Python coupling | Wheel has undefined PyErr_SetString/PyExc_RuntimeError/PyGILState_Ensure/PyModuleDef_Init/PyUnicode_FromString; supplied interpreter exports matching names | Linking the wheel is not linking a freestanding libduckdb; no import was attempted |

Exact required symbols:

- `_ZN6duckdb15DatabaseManager3GetERNS_13ClientContextE` at 0x39a0b80.
- `_ZN6duckdb15DatabaseManager12GetDatabasesERNS_13ClientContextENS_12optional_idxE` at 0x39b1260.
- `_ZNK6duckdb16AttachedDatabase8IsSystemEv` at 0x399b110.
- `_ZNK6duckdb16AttachedDatabase11IsTemporaryEv` at 0x399b120.

The interpreter SHA256 was rechecked as `fa67443527ed9647f760d807e2a38f26340757123e643c4639cf273ed15d5ea7`.

## Header and ABI boundaries

- Private capi_v2_internal.hpp directly includes **23 C++ headers total** (duckdb.hpp plus 22 duckdb/... headers), duckdb_v2.h, and two standard headers. duckdb.hpp itself includes five high-level C++ headers. Current app vendor has none of the three private bridge headers. Pinned CMake supplies src/include and a larger third-party include set; the minimum recursive subset for this TU remains unmeasured.
- Use a separate internal TU. Keep generated `duckdb_extension_v2.h` function-redirection macros in the public entrypoint TU, not in the private TU. Pass a genuine v2 handle across the local helper boundary, then use DuckDB's real private conversion definition. Do not mirror wrapper layouts or reinterpret the handle as a connection/ClientContext.
- The private TU's exact source include path must precede historical vendor includes. The repository still has a historical 1.4.3 `vendor/duckdb.h` (SHA256 bf840147...), distinct from exact-pin 2.0.0 duckdb.h (SHA256 8dbc9c71...). Do not let it shadow an exact-pin dependency if that dependency is included.
- GetDatabases returns `duckdb::vector<duckdb::shared_ptr<AttachedDatabase>>`: the pinned vector derives from std::vector and pinned shared_ptr contains std::shared_ptr. optional_idx contains std::optional<idx_t>. Those values cross the DSO boundary and are destroyed in the caller. Return types are not encoded in this method's mangled name, so a matching symbol is **not** proof that its return layout agrees.
- GetName and Identifier raw-string accessors are inline; absence of GetName from dynamic exports is not itself a blocker. Using them introduces object-layout/std::string ABI reliance. Use libstdc++ new string ABI consistently (`_GLIBCXX_USE_CXX11_ABI=1`), never `_GLIBCXX_DEBUG` containers or a different standard library. Exact compiler macros/flags and any inline/ODR interactions remain proof gates. No need to instantiate CV2CallbackContext, derive from DuckDB types, or use dynamic_cast merely to read the existing wrapper's context.

## Finite options (not selections)

1. **Isolated exact-wheel dependency build.** A separate private TU plus the genuine public-v2 TU; link directly against the already pinned wheel while preserving `-z defs`. The required methods are exported, so this is the strongest bounded next experiment. With no wheel SONAME, an explicit-path link may encode a path-specific DT_NEEDED; inspect the actual result. It is tied to this Python embedding, wheel hash, runtime, and path. Require same-provider/no-duplicate-host readback before trusting any passed context. Do not load another DuckDB library beside it.
2. **Host-provided unresolved private symbols.** Conventional unresolved C++ references would require a deliberately admitted undefined-symbol allowlist and proven global provider visibility, unlike today's `-z defs` build. The wheel's exports and RTLD_LOCAL source do not establish that visibility. Do not treat this as a harmless flag edit, silently remove `-z defs`, or change process dlopen flags to make a test pass. This option is weaker for the present embedding.
3. **Separately authorized exact-pin host rebuild with a narrow bridge compiled in the host.** This can avoid passing private C++ return containers across an extension boundary, but it creates a different host artifact and changes the existing-wheel premise. It requires new build/provenance/runtime review, not reuse of the current host SHA or accepted artifact claims. Not attempted or selected.

No static result here supports calling a guessed mangled member through an invented public opaque-handle layout.

## Minimal proof gates for a later authorized experiment

All gates below are **UNRUN**; none is implied by the receipts.

1. **Freeze and isolate.** Approve one option and attestation semantics first. Create a new candidate-only output directory; hash exact host, interpreter, pinned source revision, public headers, helper and build command. Never write implementation/engine/build. Do not run the existing build script: it materializes headers and creates build/log directories in its source tree.
2. **Header/compile gate.** Materialize a verified exact-pin header/dependency closure outside protected trees. Compile only a minimal internal TU that takes the callback's real v2 context, uses the real private Convert, and calls the bounded GetDatabases method. Record dependency output, compiler identity, C++ standard, macros, and all diagnostics. Keep source includes ahead of historical vendor headers. This isolates header/ABI issues before adding app behavior.
3. **Link gate.** Combine the helper with a minimal genuine-v2 probe entrypoint; preserve C_STRUCT_UNSTABLE/v2.0.0 metadata and one exported `*_init_c_api_v2` entrypoint. For option 1, link the exact wheel deliberately, retain `-z defs`, then read back NEEDED/RPATH/RUNPATH, defined/undefined symbols and GLIBCXX/CXXABI requirements. Reject accidental libduckdb duplicates, unexpected paths, unresolved-private-symbol surprises, or public-v1 fallback.
4. **Embedding/provider gate.** In a separate bounded process using the pinned interpreter, import only the pinned wheel and LOAD only the isolated probe. Verify actual wheel/library path/hash and loaded provider identity. Establish that the helper's manager-method address and v2 host API resolve to the same pinned DSO and no second DuckDB image is present. A successful ELF link or entrypoint lookup is insufficient.
5. **Executing-context/ownership gate.** Invoke the probe as a VOLATILE scalar through the real exec callback. Prove the wrapper uses the invoking connection's context; do not attest only the registration-time context. Catch all exceptions at the C boundary, release returned shared_ptr/vector ownership before callback return, retain no ClientContext/AttachedDatabase pointer, and fail closed on errors.
6. **Bounded catalog gate.** Independently test baseline expected database plus system/temp, one extra visible attachment, and one extra hidden-memory attachment. The source formula is `min(D,2)+2` for cap 4: it saturates rather than listing all names. Test repeated calls after attach/detach, several attachments, and distinct connections. Verify system/temp classification and expected baseline identity rather than inferring completeness from SQL metadata or vector size alone. Current source is a mutex-protected current manager-map snapshot plus the invoking context's temp reference, **not a transaction-snapshot or concurrency exclusion guarantee**. Any race/lease requirements belong in the separately reviewed contract.
7. **Compatibility/regression gate.** Only after the minimal bridge passes should app integration, hardened input/error handling, and goal-specific checks run in a new candidate. These do not retroactively accept Goal 3, alter goals 1–2, or establish production readiness.

## Receipt index

- `SOURCE-RECEIPTS.json`: 23 immutable file URLs, byte lengths, SHA256 and recomputed/returned Git blob SHA1; all match.
- `SOURCE-EXCERPTS.json`: bounded line-numbered relevant declarations, definitions, containers and loader excerpts.
- `host-elf-static.txt`: file/hash/ELF/NEEDED/export/version metadata.
- `cpp-dependencies-static.txt`: binding visibility, compiler markers, helper exports, Python coupling, static runtime candidate and wheel tags.
- `host-pin-static.txt`: embedded pin/version, absent dynamic flags, available sections, runtime marker endpoint.
- `build-static.txt`: unchanged app/candidate build hashes/commands and public header hashes.
- `progress.jsonl`: own operational log.

No compile, link, import, DuckDB/app/extension execution, DB open, benchmark, app/source/native-build edit, Git/Page/PR write, deletion, escalation, or environment change was performed. The unrelated safety block remained untouched; no supplemental backup/preparation/witness/raw content was inspected.

