# Independent final native integration evidence

30 October 2026. **This is a test handoff, not item-2 acceptance.** No production source, Git, PR, accepted-artifact, or production engine/build writes were made by this lane. All builds/tests ran under this isolated directory, after the native reviewer and storage owner released their heavy-work windows. No timed performance campaign ran.

## Exact candidate and reproducibility

Two independent executions of the unchanged current `engine/build.sh`, against byte-exact copied current inputs, produced identical `.so` files and identical extension files:

| Artifact | SHA-256 | Bytes |
|---|---|---:|
| `build-normal-a/temporal_datalog.duckdb_extension` | `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4` | 202678 |
| `build-normal-b/temporal_datalog.duckdb_extension` | same | 202678 |
| Prior immutable FIRST artifact | same | 202678 |
| `build-sanitized/temporal_datalog.duckdb_extension` | `6616e521fcd94095daf4a2d42136f45a0a187240b6a54b4f231804acf995d6bb` | See `artifact-integrity-final.json` |

All footers are exactly `C_STRUCT_UNSTABLE / 0.3.0 / v2.0.0 / linux_amd64`. Genuine DuckDB reports `v2.0.0 / d54cbbe3df`. The exact licensed v2 header SHA is `73026a28e5b55952afb6e2e9ce80fd4f76614afedce329da895ccaf85a4a8be6`; upstream commit is `d54cbbe3df17e8e5ce68312f483b4155836112aa`. There is no fake host version or fallback evaluator.

`input-source-manifest.json` records all 30 source/fixture/vendor inputs, their exact hashes, and the local checkout status. The six current native implementation files match both checkpoint-first and checkpoint-final; final expression-test source hashes also match the checkpoint. The binding and build inputs were copied without edits. The coordinator reported remote draft PR7 head `f9b61f11d481445cf06620368523d9a6180c8f89`; this lane verifies source bytes, not a separate remote read-back. The local checkout HEAD remains its older base with owner changes, and is not mislabeled as that remote head.

Normal flags are the unchanged build script's C++17/O3/NDEBUG/shared/PIC/hidden-visibility flags, warnings-as-errors, `-fno-fast-math -frounding-math -ffp-contract=off -mfpmath=sse -msse2`, and `-Wl,-z,defs`. The separate sanitizer build replaces O3/NDEBUG with `-O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined`, preserving the strict FP/warning/link flags and footer/vendor pin. `sanitized-readelf-needed.txt` confirms ASan and UBSan runtime dependencies. Compiler: GCC 14.2.0; Python: 3.12.14; Linux x86-64/glibc 2.41. `runtime-inputs.json` hashes the actual prebuilt Python binding and matching sanitizer/C++ libraries.

## Normal artifact: all requested checks passed

`results-normal/campaign.json` and per-stage stdout/stderr retain exact commands, exits, and terminal reports.

| Check | Terminal result |
|---|---|
| Existing genuine-binding legacy suite | **22/22 PASS** |
| Existing genuine-binding typed suite, including 100001-row input-cap test | **57/57 PASS**, zero failures/errors/skips |
| Existing genuine-binding expression suite | **14/14 PASS** |
| Independent aligned declarative/SQL/native matrix | **262/262 native PASS**, **262/262 subsequent healthy-call recoveries** |
| Explicit filter-precharge boundaries | **9/9 PASS**, **9/9 recoveries** |

The 262 matrix includes 245 host set-fixpoint checks and 486 SQL-oracle mode checks (706 actual candidate queries; 14 static-only checks). The 17 textual parser negatives run against the real native parser, not a copied parser. Two accepted large structural cases deliberately remain **SQL NOT_RUN** (`nodes_256_per_rule_accept`, `program_nodes_4096_accept`); both passed the real native path. The corpus has 104 successful native outcomes and 158 expected faults, including type, overflow, division-by-zero, underflow, unbound, expression-limit, syntax, and interval failures. See `normal-outcome-summary.json`.

The minimized nine retain exact AST precharge/string boundaries and budget/fault collisions: 3-node comparison budgets2/3; five-node division budgets4/5; false then division budgets7/8; 65-byte equal strings budgets5/6; and dormant division behind an actual empty join. Expected errors are canonical current-contract markers, not the historical stale max_work expectations. The old stale run remains unchanged in its separate FIRST evidence closure.

## Actual-binding ASan/UBSan: covered stages pass; original large Python transport remains incomplete

Every instrumented subprocess used the existing proven runtime recipe unchanged:

```
LD_PRELOAD="$(g++ -print-file-name=libasan.so):$(g++ -print-file-name=libstdc++.so)"
ASAN_OPTIONS=detect_leaks=0:halt_on_error=1
UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1
```

No error suppressions, link-order bypasses, reduced quarantine/redzones, smaller test input, or host security/resource-limit changes were used. **LeakSanitizer is not claimed.** DuckDB/Python are prebuilt, not wholly sanitizer-instrumented.

1. `results-sanitized-runtime-01/`: legacy22 passed. The typed57 child then received **SIGKILL (-9)** at `LargeInputTests.test_input_row_cap_includes_duplicate_rows`, after 56 logged successful methods. There is no terminal typed report and no ASan/UBSan diagnostic. Remaining stages in this first campaign were **NOT_RUN**. This original attempt remains **FAIL/incomplete**, not57 PASS.
2. `results-sanitized-large-isolated-02/`: the unchanged large method alone also received **SIGKILL (shell137)** in a fresh process with the same artifact/options. Its report remains RUNNING because the process was killed. The raw exit/logs, not that unfinished report, determine its incomplete status.
3. `results-sanitized-covered56-03/`: distinct selection-only wrapper executes the exact other56 original test methods/fixtures. **22 legacy +56 typed +14 expression groups PASS**, zero failures/errors/skips. The independent **262/262 +262 recoveries** and **9/9 +9 recoveries PASS**, with no sanitizer diagnostics. The campaign explicitly labels the large Python case blocked; it is not a full57 sanitizer pass. Normal and instrumented 262 results have identical typed rows, f64 bits, native statistics, or error classes (`normal-sanitized-equivalence262.json`).

### Localization and separate cap-boundary transport

Fresh primary inspection was made before altering test selection or attributing the kill. GCC's pinned ASan source identifies quarantine as memory overhead and warns that lowering it increases false-negative risk; its default initialization uses a 256MiB global quarantine on the ordinary non-low-memory configuration. We deliberately did not reduce it. [GCC14.2 flag definitions](https://github.com/gcc-mirror/gcc/blob/releases/gcc-14.2.0/libsanitizer/asan/asan_flags.inc), [GCC14.2 defaults](https://github.com/gcc-mirror/gcc/blob/releases/gcc-14.2.0/libsanitizer/asan/asan_flags.cpp).

Upstream documents allocation-dependent real-memory overhead and very large mapped virtual address space. This supports investigating real RSS rather than imposing an address-space cap; it does not prove why this process was killed. [ASan limitations](https://clang.llvm.org/docs/AddressSanitizer.html#limitations). DuckDB's versioned Python conversion documentation distinguishes parameter conversion from result fetching; its struct documentation supports the alternative explicitly typed SQL producer. [DuckDB2 Python conversion](https://duckdb.org/docs/2.0/clients/python/conversion), [DuckDB2 structs](https://duckdb.org/docs/2.0/sql/data_types/struct).

`results-bind-only-no-extension-04/` reproduces **SIGKILL at the Python↔DuckDB `execute()` of the exact original bind-only SELECT**, before fetch. Neither extension was loaded, autoload/install were disabled, and both callback names were confirmed absent. Peak child RSS was **1539692KiB** (sampled1495768KiB). This demonstrates that the observed kill does not require the extension callback. Memory/resource pressure is consistent with the observation, **not a proven OOM cause**: cgroup kill counters are unavailable. It does not prove an independent DuckDB client bug.

`results-sql-native-cap-05/` is a **distinct transport test**, not a replacement PASS for the original Python method. Under the same instrumented artifact/options, SQL `range → list(STRUCT)` creates the exact duplicate typed fact shape. Shape checks confirm lengths100000/100001, one distinct fact, and exact first/last carriers. The original program, temporal cuts1/1, and limits100000/1000/5000000 are preserved:

- **100000 duplicates:** actual native callback succeeds with typed i64 row1.
- **100001 duplicates:** actual native callback rejects with `InvalidInputException`, `TD_E_EXEC phase=exec: input exceeds 100000 temporal rows` (not binder/conversion/OOM evidence).
- Healthy actual callback recovery passes after each case; no sanitizer diagnostic. Peak child RSS **248132KiB**.

The source guard at `temporal_datalog.cpp:272` checks list length before iterating/decoding the facts. The SQL-native result therefore supplies instrumented callback cap-boundary evidence while retaining the original Python-transport verification gap.

## Preservation and limits

All30 original/copied inputs and all selected artifacts remain byte-exact after testing. The prior research47-file freeze, original15-file preparation, corrected40-file harness, and FIRST34-file evidence closure all reverified unchanged (`prior-evidence-preservation.json`). An initial input-manifest root-normalization setup error is retained in `setup-attempt-01.txt`; it did not identify a source mismatch or require source changes.

Not run here: browser/UI, persistence/FP-control mutation suites, direct-core sanitizer/differential campaigns owned by other lanes, LeakSanitizer, whole DuckDB/Python process instrumentation, and timed old/new benchmarks. Invocation-level failure evidence is not SQL-stream atomicity certification. Work counters are compared to independent simple declared boundaries, not asserted universally equivalent between host/SQL/native planners.

All processes from this lane have terminated; no pending build/test operation remains. A future source/artifact change requires a new exact-hash run. Coordinator owns publication/acceptance; no merge, deployment, or item-2 acceptance is implied.
