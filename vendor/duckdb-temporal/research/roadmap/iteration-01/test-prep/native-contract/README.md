# Native typed value acceptance test preparation

**Status: test/specification preparation only. No real v2 extension has been loaded or evaluated. These are unexecuted native acceptance expectations, not evidence that iteration 1 passes.**

This isolated harness targets the selected contract in `../API-v2-decisions.md`, not a speculative change to the existing extension. It imports no project implementation or existing evaluator. It does not install dependencies, build an extension, edit the frozen baseline, open a persisted user database, or write Git objects. Integration uses a disposable in-memory DuckDB database.

The root-owned clean baseline remains immutable at `../../frozen-baseline`, identified by source manifest `590c7b3d7ed751ae7dc4c5f3b32b5e225051bbb9262bc1b13277a3dbc37040fb` and 218 source files. It is not selected implicitly as a test binary. The original `/tmp/temporal-datalog-20261030` and PR 7 are not modified.

## Files

- `native_acceptance.py`: future native DuckDB 2.0.0 integration harness.
- `selftest_harness.py`: eight stdlib-only checks of fixture decoding, output comparison and unavailable-path control flow. This is not an evaluator.
- `contract-fixtures.json`: isolated copy of the orchestrator's declarative 20-answer/15-rejection corpus. SHA-256 `247e80d77a51f3a6287f40b078c5b090690992a64b15101779e64a006a796edf`.
- `spec-check.json`: dependency-free fixture/codec self-check result; zero native tests.
- `test-inventory.json`: selected integration-test names, collected without DuckDB import/LOAD.
- `unavailable-check.json`: actual no-extension path returns UNAVAILABLE with zero native tests and exit code 2.
- `verification.json`: preparation checks and the explicit native-unrun boundary.
- `SHA256SUMS`: complete file identity manifest, excluding itself.

The accepted research memo is `/tmp/temporal-roadmap-research/iteration-01/typed-values-research.md`, SHA-256 `bb4de766bcbd0cf17b08c23f4b95accbe8824b1ee5196bd4548c7919bcad6588`. The orchestrator subsequently tightened **JSON** i64/clock strings to canonical decimal notation. This harness follows that later selected contract: JSON `-0`, `+1`, and leading-zero forms are rejected; textual Datalog `-0` is accepted and normalizes to integer zero.

## Dependency free preparation checks

From this directory, run:

```sh
python3 -B -c "from pathlib import Path; [compile(p.read_text(), str(p), 'exec') for p in (Path('native_acceptance.py'), Path('selftest_harness.py'))]"
python3 -B selftest_harness.py
python3 -B native_acceptance.py --check-spec --report spec-check.json
python3 -B native_acceptance.py --list-tests --report test-inventory.json
```

`--check-spec` and `--list-tests` never import DuckDB, load native code, parse/evaluate a Datalog program, or execute integration tests. They validate source shapes and explicit expected-row canonical order. The eight native grammar-rejection programs remain **unexecuted** in this mode. Seven source JSON/clock rejection fixtures are checked by the harness's own fixture decoder only; that is **not a test of a future application adapter**.

`selftest_harness.py` includes a mocked missing-v2 catalog response solely to verify fail-closed availability control flow. The mock has no evaluator or native function implementation, does no real LOAD, and must never be presented as native test evidence.

Run without `-O` or `PYTHONOPTIMIZE`: assertions are part of acceptance, and optimized execution fails closed. `-B` prevents bytecode output. Preparation checks passed on CPython 3.12.14; no dependency was installed.

## Run only after a real v2 implementation is available

Use a trusted, explicit artifact. Loading an unsigned native extension executes its machine code with the process's privileges. The harness enables unsigned extensions solely because this private prototype is unsigned.

Supply an already-available **DuckDB 2.0.0** Python module, for example through its existing pinned installation directory:

```sh
PYTHONPATH=/absolute/path/to/existing/duckdb2 \
  python3 -B native_acceptance.py \
  --extension /absolute/path/to/trusted/temporal_datalog.duckdb_extension \
  --report native-run.json
```

Or select the binary explicitly through the existing environment convention:

```sh
TD_TEST_EXTENSION=/absolute/path/to/trusted/temporal_datalog.duckdb_extension \
PYTHONPATH=/absolute/path/to/existing/duckdb2 \
  python3 -B native_acceptance.py --report native-run.json
```

Do not substitute a shim, fake SQL macro, baseline string engine, or test-only implementation for the real extension. The baseline has no `td_query_v2`; an unavailable result is expected until implementation.

The default suite selects **56 integration tests**, including 20 explicit answer cases, eight native grammar rejections, carrier/bounds/batch checks and five v1 compatibility tests. Additional assertions/subtests are not separate certification counts. One larger 100,001-row input-cap test is opt-in:

```sh
PYTHONPATH=/absolute/path/to/existing/duckdb2 \
  python3 -B native_acceptance.py --large-cases \
  --extension /absolute/path/to/trusted/temporal_datalog.duckdb_extension \
  --report native-run-large.json
```

With `--large-cases`, 57 tests are selected. This is deliberately separate from default preparation because binding the larger typed list needs an admitted memory/time budget. Do not claim that cap was exercised when the option was omitted. If binding itself runs out of memory, the test errors rather than counting that as the native input guard passing.

Reports can be written only to an explicitly requested `.json` basename beside the harness. Console results use these statuses:

- `SPEC_CHECK_ONLY`, exit 0: fixture/codec preparation succeeded, **zero native tests**.
- `UNAVAILABLE`, exit 2: missing explicit binary, missing file/module, wrong DuckDB version, or loaded binary without `td_query_v2`; **zero native tests**, never a skip or fake pass.
- `FAIL`, exit 1: native LOAD/preflight failure or failed/error/skipped integration checks.
- `PASS`, exit 0: every selected real integration test ran and passed. Omitted opt-in tests, production adapter validation, full project verification, migration, SQL-oracle comparisons and performance remain separate gates.

A real integration report records binary and fixture hashes, runtime and platform. The current preparation artifacts record no native pass. V1 checks run only when v2 is present; an unavailable v2 deliberately does not produce a partially green native suite.

## Exact boundary under test

```text
TDValue = STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)
TDFact = STRUCT(e VARCHAR,a VARCHAR,v TDValue,
                valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)
td_query_v2(program VARCHAR,facts TDFact[],valid_at BIGINT,known_at BIGINT,
            max_facts BIGINT,max_rounds BIGINT,max_work BIGINT)
  -> STRUCT(rows TDValue[][],rounds BIGINT,derived_facts BIGINT,work BIGINT)
```

Stable tags are 1=str, 2=bool, 3=i64, 4=f64. Base e/a remain text; derived cells are tagged in every position. The v2 fact list, fact/value structs, tag, selected payload and ordinary required fields cannot be null. Inactive payloads must be null. F64 is finite, subnormals survive, and negative zero becomes positive zero. Result order is tag rank followed by semantic payload order, lexicographically by tuple—not dictionary ID or printed value.

Source JSON is decoded into Python exact int64 values **before** explicit SQL casts. The Python fixture decoder rejects Number/bool as i64, noncanonical clock strings, unsupported tags, bad Unicode/NUL and incorrect payload types. It intentionally is only a test-input decoder, not production application code.

**Pre-binding information loss:** DuckDB may intentionally convert source types while binding an explicit SQL cast or constructing a common-typed list. The native callback can validate only the resulting typed carrier. No test asserts that it can recover a float/bool/string source whose type or precision was already erased by SQL. For each malformed-but-representable carrier rejection, the harness first executes a binding-only SELECT with the same carrier and scalar types. A SQL binder/parser/catalog/conversion/OOM/IO/permission error cannot count as the intended callback validation. Invalid source JSON fixture checks stay outside the native suite.

The output comparator does not normalize away implementation mistakes: it verifies exact returned field names, selected/inactive null masks, scalar types, full-range int64, finite f64 and **positive-zero bits**. It compares typed rows in their returned order and never sorts them before comparison. Float equality uses exact binary64 bits after the implementation is expected to have normalized zero. Python's `True == 1 == 1.0` cannot collapse the tags.

## Coverage and limits

Default coverage includes:

- The 20 explicit answer expectations and eight grammar rejections, including rounding-sensitive valid/knowledge cuts, signed-i64 endpoints, numeric entity nonmatch, UTF-8 versus UTF-16 order and separate int/float zero.
- Typed values propagated through all eight derived tuple positions, boolean false/true order, parsed subnormals/min-normal/max-finite, and the exact 128-byte numeric-token boundary.
- Null list/fact/value/tag/selected payload; null required scalar/fact fields; unknown tags; every inactive payload; NaN/infinity; hidden malformed rows; invalid intervals; NUL strings.
- Current fact/work/round admission/evaluation guards and program/string-byte limits. Guard tests distinguish callback rejection from SQL binding/allocation failure; key resource failures must mention their intended limit.
- A 2,051-row varying-list batch (empty, one element, two elements), exercising nonzero child offsets and ordinary chunk boundaries. A second batch varies tuple arity and payload kinds. Long strings test output ownership/growth. A mixed valid/invalid scalar batch tests connection recovery after error; it does not certify streaming-result or whole-SQL-statement atomicity.
- Existing v1 registration, quoted/string outputs, unsupported new literals, unchanged NULL-list behavior, and explicit old/new temporal-cut expectations under the string embedding.

Not covered or not yet run:

- No real v2 LOAD/evaluation; no current binary tested; no engine build or dependency installation.
- No production Python/JSON/browser adapter validation, persisted migration/crash/reopen tests, SQL-first route, performance measurement, allocator/cancellation certification or cross-process/concurrency claim.
- The full existing baseline suite remains required after implementation in its authorized writable tree. This harness is supplemental, not a replacement.
- Typed dictionary/output memory-accounting thresholds are not exhaustively tested here. Keep current ceilings; add exact tests once the owner documents the new accounting units. `--large-cases` covers only the input-row ceiling.
- JSON f64 is an already-parsed binary64 Number. Raw JSON numeric-token underflow text cannot be reconstructed after ordinary JSON parsing; the nonzero-underflow rejection fixture specifically tests the Datalog text parser.

## Remaining owner checkpoints

The selected API shape, tag order, strict v2 NULL-list policy, NUL-free text and canonical JSON i64 rules are fixed by the orchestrator's current decision document. If implementation changes one deliberately, update the decision and independent fixtures rather than loosening tests to accept an accidental behavior.

Before release, confirm typed dictionary/output accounting units and thresholds, preserve/document limit error identifiers (the focused guard tests use `max_facts`, `max_work`, `max_rounds` or equivalent `fact/work/round limit` wording), and supply the real binary/hash. Production Python API/migration names belong to the separate store implementation checkpoint; this native harness does not assume them.
