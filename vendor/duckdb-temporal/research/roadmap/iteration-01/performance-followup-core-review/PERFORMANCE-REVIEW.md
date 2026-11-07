# Actual-v2 boundary review: source evidence, negative results and next controls

Research checkpoint: 30 October 2026, approximately 19:24 UTC. Read-only review of the coordinator-owned implementation. **No implementation, original/frozen source, Git object/ref/PR, Page or Site was changed.** Probes and notes are confined to this directory. No Codex, dependency installation or user-computer action was used.

## Finding

There is currently **no established large causal ABI regression to fix**. The initial balanced campaign retained real 23–29% unique-string and 33–36% recursive-closure B/A losses. The benchmark owner subsequently observed large process/host drift even for an unchanged standalone frozen-core binary. Its tightly alternated, pinned-CPU two-instance campaign reports 756 serial pairs / 1,512 samples: within-process median B/A 0.971–0.998 for unique strings, 0.968–1.025 for closure, and 0.960–0.984 for the long-string control. Those results do not erase the isolated losses or establish universal equivalence; they prevent assigning those losses to a particular v2 mechanism without further evidence.

The benchmark/profile owner is `/root/orchestrate_triple_store/typed_sql_acceptance`; this review did not duplicate its timed experiments. Its latest operator profiles also remain mixed: isolated recursive projection timing can favor A while serial full-path pairing is near a tie. T's much larger typed/Python fetch cost must remain separately labeled.

Evidence:
- `test-prep/sql-typed-contract/evidence/balanced-fullpath-1900/BENCHMARK-RESULTS.md`.
- `test-prep/sql-typed-contract/evidence/transport-regression-gate-1907/{frozen-core,split-execute-fetch,paired-serial-pinned}`.
- The benchmark owner's operator-profile campaign, separate from this review's untimed probes.

## Pins and fresh research

All upstream reads target DuckDB commit `d54cbbe3df17e8e5ce68312f483b4155836112aa` / v2.0.0. `source-provenance.json` records 25 freshly retrieved primary files verified against their returned Git blob IDs and independent SHA-256 values, plus three retained 404s. Browser raw/GitHub reads returned cache misses; the GitHub connector successfully retrieved the exact primary sources. Old memos were not used as substitutes for fresh inspection.

Controls inspected:

| Item | SHA-256 |
| --- | --- |
| Root v2 binding | `3897a07f7acf7f181c3bbff6c7ac1bd0700afd703a7c8baf55e573b96427c31d` |
| Frozen v1 binding | `8367119bf605e1e0499bc2e206dd06d6582ef3b2f8d4b34bbb00d0bf997176a4` |
| Frozen core used by both A/B | `470bb3c29392637e57ae61b3faaea6557874a79834b3b748510e2fd8594dad24` |
| A stable artifact | `62c9f24e3f8951771ff0f7ceae7dd255843885b203c818bb53e3c232baa45662` |
| B API-only artifact | `69916109931921a0499ddcdedcfb34e4a48635ad6953713b8b18d7bde52e0b4f` |
| T typed artifact | `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d` |
| DuckDB host library | `e7cda112749d860a36cb1524ff465cefecdb0acc5c4e2ff4510ecc1b6f6c061a` |

`control-snapshots/manifest.json` preserves exact local binding snapshots. The frozen-core hash agrees with the preserved benchmark provenance and normal/sanitizer core reports.

## What the source does and does not support

### 1. Neither per-cell Value construction nor successful error-object allocation explains B

The v2 callback wrapper passes borrowed input/result state and stack-owned callback/error context. B's fact readers use cached raw views; its emitter writes transparent bytes directly, not `vector_get_value`/`vector_set_value` per cell. V1 explicitly flattens input before invoking its C callback; v2 does not. These are real path differences, not proof of their net timing. [V2 scalar implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_scalar.cpp), [v1 scalar implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v1/scalar_function-c.cpp).

`WithErrorHandler` returns directly on success and allocates a detailed error object only on failure. Root's fresh-null owned slots therefore do **not** imply one heap error allocation for every successful accessor. Removing correct error handling is not a justified optimization. [Pinned error bridge](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/capi_v2/capi_v2_internal.hpp#L795-L837).

### 2. Long-string arenas cannot explain the short-output losses

Root's `put_text` uses no arena API for strings of at most 12 bytes. The regressed datasets emit 7-byte unique values or 5-byte node IDs. Its per-long-string `get_arena` + `arena_allocate` calls are consequently absent from those output loops.

For long strings, v2 obtains the vector's string heap allocator and reserves arena-owned bytes. A callback-local cached arena or one bounded slab per emission could reduce calls, but must be acquired after resizing and never retained across storage changes/callbacks. This is a long-string experiment, not a proposed explanation of the short-string losses. [Arena implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_arena.cpp), [arena contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/arena/arena.yaml).

A performs UTF-8 checking in `duckdb_vector_assign_string_element_len` before its unsafe assignment; B writes already-admitted bytes directly. That difference is a plausible contributor to B's long-string improvements, **not an isolated measured attribution**. [Stable C vector/string path](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v1/data_chunk-c.cpp#L167-L193).

Do not remove inline zero padding speculatively: DuckDB's own short-string constructor zeroes the inline region so short prefixes compare consistently. [String representation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/types/string_type.hpp#L40-L68).

### 3. Some sizing is redundant; repeated sizing is not necessarily repeated allocation

V2 `vector_set_size` reserves if needed, then sets logical size. `Vector::Reserve` returns when existing capacity suffices. Thus an accessor count alone cannot be interpreted as an allocation/copy count. [V2 sizing](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp#L410-L421), [capacity guard](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/types/vector.cpp#L315-L329).

`VectorStructBuffer::SetVectorSize` propagates size to every child. The four explicit root-result child sizes after sizing the parent STRUCT, and five payload-child sizes after sizing TDValue STRUCT, repeat logical sizing already performed. Removing only those repeats is a well-isolated candidate. **LIST element counts are independent:** keep explicit sizes for tuple and value element vectors. [STRUCT propagation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp#L64-L69), [LIST child-size model](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/list_vector.cpp#L295-L336).

The untimed `size-mask-probe.json` confirms parent-to-child/grandchild propagation at 8,193 rows, repeated child sizing without a data-pointer change at existing capacity, and shrink propagation to 17 rows. It is not a performance measurement or production callback conformance test.

### 4. Validity adds real work, but no causal timing has been established

Root materializes writable masks and restores every emitted row/cell, unlike A's initially all-valid output path. First writable access materializes a mask; setting all bits still leaves a nonnull mask. The untimed direct probe confirms this while preserving valid rows. This can affect allocation, bit writes and later null checks; its magnitude is unmeasured. [Mask implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/types/validity_mask.hpp#L272-L312), [mutable-mask contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L636-L650).

A safe experiment replaces per-cell all-valid writes with word/range initialization while retaining existing bits outside the written range and correctly resetting reused slots. Typed inactive payloads must still be NULL. A NULL STRUCT/ARRAY parent needs descendant NULLs, so use `vector_set_null` rather than clearing only its parent bit. The direct probe verified nested-null propagation. Do not omit masks on an assumption that every output buffer is fresh.

### 5. Fixed API setup and separate T-only costs

For one nonempty scalar result, source-level counting gives roughly 101 successful public calls in B and 144 in T, excluding conditional flattening and two extra calls per long output string. This is an illustrative static count, **not a trace, allocation count or cost model**. Most are per invocation rather than per short output cell. Root's two-pass input preparation protects against dictionary-child flattening invalidating earlier views; any reduction must complete all mutations before capturing borrowed views.

T additionally constructs five payload Readers in an initially empty vector and sizes/sets five payload children. A fixed array/reserve and redundant-size removal are small separable controls, not an ABI explanation.

The accepted typed core also validates an incoming string four times on the visible path: `Value::str`, Core admission, `intern_value`, then `intern_string`; e/a are checked at admission and interning. Output decoding revalidates already-admitted string keys. These are source-supported **T-only** work candidates. A later core experiment may rely on the private owning Value invariant and validated interner entry points to avoid rescans, but must retain all-row malformed-value/interval validation, limits, owned results and immutable-cache boundaries. This is not implemented or timed here, and no join/kernel change is justified by these observations.

## Exact serial two-instance safety control

Both generated header generations name their API table `duckdb_ext_api`; they are not distinguished by variable name. However, `readelf -sW` shows that symbol is LOCAL in each exact A/B artifact and absent from dynamic exports. The loader dispatches the separate `_init_c_api` and `_init_c_api_v2` entrypoints according to ABI. [V1 generated entrypoint](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension.h#L2360-L2414), [v2 generated entrypoint](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L3450-L3507), [loader dispatch](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/extension/extension_load.cpp#L830-L889).

`dual-instance-smoke.json` passes both LOAD orders × both close-first choices: 136 paired/recovery calls, eight expected max_work failures, and 16 successful survivor calls after closing the other database. It includes inline/long/Unicode strings, closure, ground answers and exact counter comparisons. This supports D's **serial paired diagnostic on these exact artifacts and host**. It is not arbitrary-build, shared-database, cross-host or concurrent-callback certification. No timings were collected in this smoke.

## Minimal experiment ratchet

Keep B/core/host fixed and make one change per separately identified artifact; retain original B and all negative results.

1. **Reproducibility first:** use D's paired protocol plus independent processes, complete ordered answers/counters and randomized order. Preserve isolated and paired views instead of selecting a favorable graph.
2. **R: remove only redundant STRUCT child sizing.** Retain LIST element sizes and acquire pointers after all remaining reserves. Test empty outputs, nonzero offsets, mixed arities, 2,051 scalar rows and children above 2,048.
3. **M: range-based mask initialization.** Keep null semantics and boundary bits; test grow/reuse and malformed batches followed by successful queries. Do not conflate with R.
4. **I: reduce redundant metadata/view calls only after safe alias preparation.** Cache immutable representation metadata; perform all potentially invalidating dictionary/OTHER normalization first, then acquire all borrowed views. Test encoded nested aliases and fallbacks.
5. **A: callback-local arena/slab control for long strings only.** Charge complete bytes before allocation; copy into vector-owned storage; reborrow after any resize. Include 12/13-byte boundaries and large output.
6. **T-only:** independently test trusted internal Value/text-validation reuse, then C's same-statement compact-host projection. Keep the wider raw signature, exact tags/i64/f64 semantics, source validation and full fetch in the measured path.

Every arm needs genuine LOAD, selected typed/legacy/SQL tests, resource/late-error recovery and sanitizer coverage before adoption. None is a demonstrated speedup or necessary emergency fix from the present evidence.

## Reproduction and limits

```sh
PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2 \
  python3 -B dual_instance_smoke.py
PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2 \
  python3 -B size_mask_probe.py
```

Both probes use the existing exact host and disposable in-memory state. Direct size/mask checks requested one thread and 32 MB managed memory, left zero instances, and do not test spill/quota enforcement. `source-provenance.json`, raw JSON/stdout/stderr, and control snapshots retain identities and results. Three source-path 404s are retained rather than silently substituted. No timed optimization candidate, full accounting/cancellation improvement, new cache, deployment or production-readiness result is claimed.
