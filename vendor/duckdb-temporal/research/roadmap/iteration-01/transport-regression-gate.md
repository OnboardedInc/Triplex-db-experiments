# Actual-v2 transport attribution: renewed research gate

## Decision

**Do not call the initial process-isolated losses a proven DuckDB C API v2 regression.**
They remain valid recorded observations, but the large effect does not reproduce
under tighter temporal pairing. No implementation change was made in this gate.
T's wider typed-result conversion remains a separate, material cost.

The original balanced archive is unchanged:
`sql-typed-contract-real-acceptance-benchmark-1906.tar.gz`, SHA-256
`f3da62e6362e18264e93e2befdb7826e06967f5f156b61151dc4e1f78d985b1c`.
It retains all initial losses; this report adds attribution evidence rather than
rewriting those samples.

## Frozen scope and fresh sources

All tests use the exact A `62c9f24e…`, B `69916109…`, T `5b661f38…` artifacts
and host `e7cda112…` already preserved in the source-pinned comparison manifest.
A/B share the byte-identical frozen core. T has a different typed core and is
never used to attribute an ABI effect. Both v2 artifacts previously reproduced
bit-for-bit with unchanged pre/post source hashes.

Nineteen fresh primary files, including both MIT licenses, are preserved with
verified Git blob and SHA-256 identities in
`primary/source-provenance-combined.json`. DuckDB is pinned to
`d54cbbe3df17e8e5ce68312f483b4155836112aa`; duckdb-python release 2.0.0 resolves
to `83c719961098611e769dc4bab0bda2bf149a2d1e`. Python source evidence is the
upstream release source, not an independently reproduced Python wheel build.
The wheel itself stays pinned by its actual library hash.

## What changed in the inference

The initial 54-process comparison observed B/A warm-median losses of 23–29%
on unique strings and 33–36% on recursive closure. The additional isolated
execute/fetch campaign already showed direction drift. More importantly, two
runs of the **same standalone frozen-core binary** drifted substantially:
unique total median 0.273 → 0.176 ms; recursive 1.651 → 1.282 ms. Pinning two
further child runs to CPU 0 did not eliminate the drift: unique 0.275 → 0.203
ms; recursive 1.649 → 1.408 ms. This does not identify whether frequency,
scheduler, allocator/layout or another factor caused it; it demonstrates that
cross-process conditions were not stable enough for an unqualified attribution.

The independent source reviewer verified that each exact artifact's API table
is LOCAL and not dynamically exported. **Both headers name it `duckdb_ext_api`;**
the safe distinction is module-local storage, not different variable names.
The loader chooses separate v1/v2 entrypoints. A separate untimed campaign
passed both load orders, both close-first choices, recovery after expected
limit errors, and surviving-instance queries. Its 136 calls, eight expected
rejections and sixteen survivor calls are retained in
`paired-serial-pinned/dual-instance-smoke.*`. This supports only these exact
serial artifact/host controls—not arbitrary builds or concurrent LOAD safety.

That gate enabled four fresh processes, two independent replications × both
LOAD orders. Each process pins itself to CPU 0, then alternates A/B or B/A
within each pair. Three cases × three diagnostic paths × 21 pairs × four
processes produced **756 complete pairs / 1,512 measured samples**. All ordered
answers, checksums and exact counters agree.

| Direct full-query path | Median paired B/A range across four processes |
| --- | ---: |
| 512 unique short values | 0.971–0.998× |
| 64-edge full recursive closure | 0.968–1.025× |
| Repeated 512-byte values, control | 0.960–0.984× |

Pre-materialized input and pre-materialized output controls are also retained.
They remove different work and change vector provenance; they are **not**
subtracted from direct totals or substituted for the admitted full path.
The paired result does not erase the initial observations or prove a universal
speedup. It means the large initial B/A loss is **not causally established**.

## Payloads rule out an arena explanation

`payload-lengths.json` records exact UTF-8 lengths:

| Case | Value / output string lengths | Output cells | Output bytes | Long cells > 12 bytes |
| --- | ---: | ---: | ---: | ---: |
| Unique short strings | 7 | 512 | 3,584 | 0 |
| Recursive node IDs | 5 | 4,160 | 20,800 | 0 |
| Long-string control | 512 | 64 | 32,768 | 64 |

B's current `put_text` takes its inline memcpy branch for **every** output
cell in both initially regressed cases. It does not call the long-string arena
there. Hoisting arena acquisition may be worth a separate long-string candidate,
but cannot explain those short-string observations. The pinned v1 assignment
path validates VARCHAR UTF-8, then uses StringVector/StringHeap; the heap's
inline branch also avoids allocating each short payload. Sources:
[v1 string assignment](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v1/data_chunk-c.cpp),
[StringHeap](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/types/string_heap.hpp),
[v2 arena](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_arena.cpp).

## Execution versus complete fetch

The split campaign used eighteen isolated processes and 1,134 fully validated
samples. It times execute-to-first-row and subsequent complete fetch separately.
The release Python binding settles execution until rows are ready. Because
these queries return one outer row containing the complete nested scalar result,
the scalar callback must have completed before that row is ready. Fetch still
includes chunk drain/flatten, recursive DuckDB Value extraction, Python object
conversion and cleanup: it is **not labeled pure Python CPU**. Source:
[Python execute](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/pyconnection.cpp),
[result settling](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/engine/result.cpp).

Fetch flattens fetched chunks, extracts nested Values, then recursively builds
Python lists/dicts. T's five-field value STRUCT therefore creates more client
work than a legacy string cell. In ordinary split runs, recursive T fetch was
5.17–7.42 ms. Even fetching a pre-materialized native result, without running
the callback, cost 4.81–5.66 ms. Sources:
[Python result extraction](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/pyresult.cpp),
[Value conversion](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp).

A separate no-output profiler campaign used twelve pinned processes / eighty-four
complete query profiles. It reported these ranges across its two replications:

| Case / arm | Callback-bearing PROJECTION ms | Complete fetch ms |
| --- | ---: | ---: |
| Unique / A | 0.268–0.464 | 0.296–0.495 |
| Unique / B | 0.256–0.388 | 0.347–0.485 |
| Recursive / A | 1.524–1.578 | 1.370–1.373 |
| Recursive / B | 1.951–1.996 | 2.146–2.208 |
| Recursive / T | 1.728–2.324 | 4.533–7.845 |

The isolated B recursive projection difference is retained, not hidden by the
paired result. These are profiler-reported operator times in a different
campaign, not instrumented admission/output phases. For unique values the
native callback is not the dominant full-query cost. Recursive native solve and
legacy fetch are both material; T's complete fetch is particularly large.

The standalone exact-core client separately measured constructor/parse,
admission, run-plus-decode/sort, and engine destruction, validating every answer
and counter. Parse was about 4–8 µs. Unique admission was about 57–88 µs and
run/decode/sort 103–160 µs. Recursive admission was about 11–15 µs, while
run/decode/sort was 1.13–1.49 ms. These standalone measurements exclude SQL,
vector decoding/output and Python, so **do not subtract them** from a different
campaign's projection time to invent an output cost. `perf` is unavailable;
there is no hardware-counter or sampled-stack claim.

## Source-supported optimization ideas, not edits or speedup claims

1. **Keep representation-safe readers.** V1 flattens scalar input; v2 does not.
   B's container normalization plus selection-aware leaves are deliberate.
   A dictionary view may mutate a shared child, so retain preparation-before-
   persistent-view acquisition. Do not cache borrowed views across callbacks.
   [v1 scalar](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v1/scalar_function-c.cpp),
   [v2 scalar](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_scalar.cpp),
   [v2 vector views](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_vector.cpp).
2. **Remove only proven redundant STRUCT child sizing in a separate candidate.**
   The pinned generic setter reserves then sets logical size; STRUCT size
   propagates to children. The reviewer's 8,193-row invariant probe confirms it.
   Parent LIST row count does **not** set its element count: retain tuple/value
   list element sizing. Acquire data, masks and arena only after reserves.
   [STRUCT propagation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/common/vector/struct_vector.cpp).
3. **Bulk mask filling needs exact guards.** Materializing a writable mask is
   real first-use work, but its cost has not explained a stable B loss. Preserve
   bits outside the written range, restore reused slots, clear every inactive
   typed payload, and use the nested-parent NULL operation where required.
4. **Long-string arena hoisting is a different control.** Acquire once only
   after the last resize, keep ownership/lifetime valid, and benchmark >12-byte
   output separately. It is not a fix for the 5/7-byte cases.
5. **Do not prioritize parse caching from these profiles.** Neither current
   artifact installs immutable program bind caching; both create fresh per-call
   engine state. The observed core parse time is small. Any cache must own syntax
   and constants without retaining invocation-local intern IDs or mutable state.
6. **Treat T host conversion and repeated string validation separately.** A
   versioned host projection may reduce Python boxing while retaining explicit
   tags, exact int64 and the unchanged raw SQL API; another worker owns that
   experiment. Typed value validation may be repeated in several layers, but
   removing scans requires a proven Value invariant and all-row validation,
   including invisible facts. Neither issue is an ABI-only change.

## Preservation and stopping condition

No further profiling is needed merely to repeat this result. The renewed gate
has produced a useful negative answer: a large ABI-caused regression is not
established; short-output arena allocation is ruled out; native-versus-fetch
costs and safe next controls are identified. No implementation source, tested
extension binary, Git reference, PR or Page was changed. Item 1 completion belongs to the coordinator's wider
functional/resource/lifetime evidence, not this performance diagnostic.

Raw split diagnostics, all 756 paired observations, all profiler JSON, exact
core samples, source-review controls and the nineteen primary files remain
under this directory. Compact machine summary: `FOLLOWUP-STATUS.json`.
