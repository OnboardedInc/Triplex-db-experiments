# DuckDB Python upgrade and pytz removal

Research checked 3 November 2026. Scope: identify the newest official Python binding that removes the public TIMESTAMPTZ conversion dependency on pytz, assess the current unstable C API v2 extension, and prepare the migration sequence. **Source and metadata research only. No dependency acquisition, install, import, build, native load, database action, or runtime acceptance occurred.**

Preserve the [project-data-only policy](../PROJECT-DATA-POLICY.md), existing stopped acquisition boundaries, and the [current runtime guide](../DUCKDB-RUNTIME-REUSE.md). This research does not authorize reviving a stopped operation or using another route around it.

## Answer

The project already pins **DuckDB 2.0.0**, which is still the latest stable Python and engine release. Reinstalling the newest stable wheel will not remove pytz: the tagged binding still calls pytz when converting TIMESTAMPTZ and TIMESTAMPTZ_NS values into aware Python datetimes.

There is now an official packaged development option: **duckdb 2.1.0.dev2610310630**, uploaded to PyPI on 1 November. It contains the pytz removal and corresponds to the current inspected main branch. It is a **pre-release**, not DuckDB 2.1.0 stable. Choosing it requires a matched extension rebuild and a new admitted runtime closure.

Sources: [stable Python documentation](https://duckdb.org/docs/2.0/clients/python/overview), [stable release](https://github.com/duckdb/duckdb-python/releases/tag/v2.0.0), [tagged conversion source](https://github.com/duckdb/duckdb-python/blob/v2.0.0/src/native/python_objects.cpp#L663-L670), [official development package](https://pypi.org/project/duckdb/2.1.0.dev2610310630/).

## Exact candidate identities

### Latest published development candidate

- Package: `duckdb==2.1.0.dev2610310630`.
- Python source: `6691773300d10c40f35289c8688a097afa17255c`.
- Engine submodule: `71f47d410f6acceabd4c0d1329ed0f7b2f315f93`.
- Python source declares the next release as 2.1.0; the published version has a development suffix.
- Published Linux x86-64 cp312/abi3 wheel SHA256: `5bf6028b9da59f856e2a5d7b92a4c10fbd156f3b8b062cf44c4207875524f0b2`.
- Published Linux x86-64 cp311/cp311 wheel SHA256: `dc90c3d7e16d3f1535b1d356d5c951f4d6c42828b5f8829b8da4ab622b38f2a9`.
- Both filenames have the `manylinux_2_27_x86_64.manylinux_2_28_x86_64` platform suffix. These are published artifact identities, not an inventory or selection of a computer.
- PyPI shows Trusted Publishing provenance for that source commit. The provenance statement was read as metadata; no wheel was downloaded or independently verified locally.

[PyPI artifact metadata](https://pypi.org/project/duckdb/2.1.0.dev2610310630/), [exact Python tree](https://github.com/duckdb/duckdb-python/tree/6691773300d10c40f35289c8688a097afa17255c), [engine submodule](https://github.com/duckdb/duckdb-python/tree/6691773300d10c40f35289c8688a097afa17255c/external/duckdb), [version configuration](https://github.com/duckdb/duckdb-python/blob/6691773300d10c40f35289c8688a097afa17255c/pyproject.toml#L109-L113).

Upstream release CI reports successful PyPI publication, the cp311 Linux wheel build/test, and Linux abi3 tests for Python 3.12 through 3.15. Its separate S3 upload failed. Those are upstream results, not project checks or a reason to use an alternate acquisition route. [Publishing run](https://github.com/duckdb/duckdb-python/actions/runs/41262306384).

### Older 2.0 maintenance development candidate

PyPI also publishes `2.0.1.dev2610291258`, uploaded 30 October, from Python commit `791d75b50b6b1d49363365b7a63a81eb9c4893e0` and engine `fbd180f3a40ca04d7165aa589771b8ea8110d693`. Its conversion source includes the same zoneinfo implementation. It is not the newest package or a stable release. Its v2 headers also differ from the current project, so it does **not** avoid the extension rebuild.

The published cp312/abi3 Linux x86-64 wheel hash is `a00fa87c560c97723db57e409dd4cfc24605f34e5ab8608393ff6a729990f265`. [Package and provenance](https://pypi.org/project/duckdb/2.0.1.dev2610291258/), [conversion source](https://github.com/duckdb/duckdb-python/blob/791d75b50b6b1d49363365b7a63a81eb9c4893e0/src/native/python_objects.cpp), [engine submodule](https://github.com/duckdb/duckdb-python/tree/791d75b50b6b1d49363365b7a63a81eb9c4893e0/external/duckdb).

## Why the extension must be rebuilt

The project's current extension source enables unstable C API v2. Its existing build script writes a `C_STRUCT_UNSTABLE` footer for host `v2.0.0`. This is an exact-host artifact, not a forward-compatible stable C extension.

Read-only comparisons of the official generated source files establish:

- Release engine `d54cbbe3df17e8e5ce68312f483b4155836112aa`: v2 extension header has 620 function-pointer fields.
- Latest development engine `71f47d410f6acceabd4c0d1329ed0f7b2f315f93`: 641 fields. Twenty-one statistics callback/accessor fields were added, with the first ordering difference at zero-based slot 522.
- The current `temporal_datalog.cpp` refers to 28 function names present in both headers. In particular, its used `duckdb_v2_context_get_factory` moves from slot 530 to 551.
- The older packaged 2.0.1 development engine also has 641 fields and this same slot move.
- An earlier minimal pytz-removal commit, Python `6c0bca9368f77bc7f52b744cb4638b42be92a4ba` from 23 October, uses engine `d9c3e9ae111956d62f2a73e81f2a448ce23c55dd`. That engine's two generated v2 headers are identical as fetched UTF-8 text to the release headers. This narrower observation must not be applied to the newest package.

Method: compare complete fetched generated-header text and extract function pointer names in declaration order with `\(\*(duckdb_v2_[a-zA-Z0-9_]+)\)`. Count and zero-based positions are source observations, not loaded-layout attestation. Shared function names or identical headers alone do not establish binary safety, behavioral equivalence, or a passing build.

Do not relabel the old footer, enable metadata-mismatch loading, or reuse the old extension binary under the new engine. Obtain the candidate engine's own headers, rebuild the actual extension source, and produce metadata for that exact admitted engine identity. The v2 API-family macros remain a separate concept from the host's package version.

Sources: [release extension header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h), [candidate extension header](https://github.com/duckdb/duckdb/blob/71f47d410f6acceabd4c0d1329ed0f7b2f315f93/src/include/duckdb_extension_v2.h), [candidate direct API header](https://github.com/duckdb/duckdb/blob/71f47d410f6acceabd4c0d1329ed0f7b2f315f93/src/include/duckdb_v2.h), [API versioning contract](https://github.com/duckdb/duckdb/blob/71f47d410f6acceabd4c0d1329ed0f7b2f315f93/api_spec/VERSIONING.md), [extension loader](https://github.com/duckdb/duckdb/blob/71f47d410f6acceabd4c0d1329ed0f7b2f315f93/src/main/extension/extension_load.cpp), [project source]([PRIVATE_REFERENCE_REMOVED]).

## What pytz removal does and does not solve

The new binding uses standard-library `zoneinfo.ZoneInfo(session_timezone)`, then converts a UTC aware datetime into that zone. No pytz shim or Python-only wrapper edit can replace the native release conversion path.

Zoneinfo still needs IANA timezone data. It uses system-provided data or the first-party tzdata package; without either, timezone construction fails. Even the upstream UTC conversion calls ZoneInfo, so UTC does not automatically remove this resource requirement. A no-new-package outcome is plausible if the selected runtime already has usable, admitted timezone data, but it is unverified here. Use a bounded functional test for required names; do not enumerate or snapshot the system timezone database.

The aware datetime representation changes from pytz to ZoneInfo: `.zone` is replaced by `.key`; `localize` and `normalize` are not ZoneInfo methods. Upstream tests explicitly cover DST folds, out-of-range fallback, missing data, and nested timestamps. During a repeated local hour, two ZoneInfo datetimes sharing the same zone can compare equal in local wall time while denoting different UTC instants. Compare transaction instants in UTC or integer units rather than relying on local-zone equality. The current typed-store export already normalizes receipts/history timestamps through `astimezone(timezone.utc).isoformat()`; this does not establish that every public return path is covered.

[Removal commit](https://github.com/duckdb/duckdb-python/commit/6c0bca9368f77bc7f52b744cb4638b42be92a4ba), [candidate conversion source](https://github.com/duckdb/duckdb-python/blob/6691773300d10c40f35289c8688a097afa17255c/src/native/python_objects.cpp), [upstream timestamp tests](https://github.com/duckdb/duckdb-python/blob/6691773300d10c40f35289c8688a097afa17255c/tests/fast/types/test_timestamp_tz.py), [Python timezone data contract](https://docs.python.org/3/library/zoneinfo.html#data-sources).

## Proposed migration sequence

1. Resolve the acquisition/executor permission boundary before any download. The stopped DuckDB operation C and stopped pytz acquisition remain frozen. A new package name, version, destination, downloader, or network route is not permission to continue or replace either stopped action.
2. Once independently admitted, select the exact official pre-release wheel and verify its hash/provenance through the authorized acquisition workflow. Do not use an unpinned moving main branch, extras, dependency auto-installation, or a source build as an implicit fallback.
3. Define and review the candidate runtime's complete import/resource closure, including the required zoneinfo data. Preserve the existing immutable baseline. Do not modify it in place or present a separate location as a way around a stop.
4. Rebuild the project's real extension against the candidate engine's matched v2 headers and exact-host metadata. Retain predicate-only FP checks, original source semantics, disabled automatic extension acquisition/loading, and private connection ownership.
5. Perform a newly reviewed bounded check of an aware TIMESTAMPTZ scalar, UTC instant equality, nulls, and required timezone handling without importing pytz. Separately establish extension loading and a known native query. Do not weaken the original public API to strings or epoch integers just to make the test pass.
6. Run the actual public transaction/receipt/history/reopen acceptance contract, then the relevant goal3.1 and goal5 native/SQL/oracle comparisons under the new pins. Capture only project results. Existing source reviews and upstream CI are not project runtime passes.
7. Adopt the candidate only after those checks pass. Keep every failed, unrun, uncertain, and earlier-version result accurately labeled. Stop at a denied or nonpass action rather than repairing a consumed subject.

## Current status and next action

Research and exact package selection are complete. Setup is **blocked and unrun**: no new acquisition/execution has been selected or admitted, and prior stops are unchanged. No fresh destination or database subject has been allocated. Existing v2.0.0 result claims remain bounded to their original runtime.

The next useful step is an exact acquisition and runtime-admission decision for the official 2.1.0 development wheel, followed by the matched extension rebuild and public API acceptance checks. If the executor cannot admit acquisition, report that specific limitation; do not change downloader, interpreter, executor, destination, or data representation to evade it.
