# Goal10 real DuckDB connection profile, 4 November 2026

Observed at 03:34 UTC on dot's cloud computer. This project-only diagnostic used the existing read-only 69-file DuckDB 2.0.0 closure and current coordinated lease. No acquisition, package copy, custom extension LOAD, Codex, user-computer access, environment snapshot or old database was involved.

## Actual result

The distinct `goal10-connection-option-regression-001` action exited **0** initially, without a yielded session. Canonical stdout exactly equalled its exclusive result file, separate stderr was empty, close was acknowledged, fresh footprints were exact and all selected project sources, 69 dependency files, manifest and FP guard/helper remained unchanged. The post-action observer read/hash-checked files only and did not import or execute DuckDB.

Its negative control passed `temp_directory` together with `enable_external_access=false` and captured exactly DuckDB `PermissionException`: `Permission Error: Modifying the temp_directory has been disabled by configuration`.

The positive profile initializes its fresh private temp directory at connection, with automatic extension installation/loading disabled, then immediately executes and fully fetches `SET enable_external_access=false` before the first query. It returned the complete typed row: DuckDB v2.0.0, external access false, signed-int64 minimum/maximum, DOUBLE 1.5, Boolean false, synthetic Unicode text and NULL. It closed once and retained the owned row after close.

Action SHA256: `374f5e4dc3b54627a0bca15591e98ae92523f36a41c15959969b1978c8e8461c`. Evidence SHA256: `bc5ec75378042cdaf5324a9574b805460bcec5193b4229e05281fc548d2b69b5`.

## Preserved boundary

The earlier `goal10-sql-schema-driver-001` action remains NONPASS: initial exit 4 at connect, before subject SQL, with no saved exception. This regression confirms a configuration failure mechanism, not retroactive proof of that discarded original exception. Neither consumed subject is replayable.

No schema, constraint, transaction, TypeScript acknowledged port, StorageAdapter, Effect layer, Datalog executor, persistence/restart or runtimeConformance result follows from this minimal connection test. Goal10 remains incomplete and [PR22]([PRIVATE_REFERENCE_REMOVED]) remains draft.

## Next step

Select a genuinely new bounded schema/constraint/transaction integration action using the now-proven ordered connection profile and existing immutable dependency closure. Preserve the actual first terminal outcome and complete synthetic evidence. Then implement the concrete host bridge and run the pinned Triplex/Effect conformance route.
