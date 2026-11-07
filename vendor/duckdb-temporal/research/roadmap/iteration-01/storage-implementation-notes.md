# Iteration 1 typed persistence implementation checkpoint

2026-10-30 19:11 UTC. Storage worker's implementation and runtime verification are complete for this assigned slice. This does **not** close the whole roadmap item: the coordinator reports that balanced transport performance still requires investigation. No deployment, production-readiness, crash-recovery, full resource-accounting or cancellation claim is made.

## Stable owned source files

All paths below are relative to `/workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/implementation`. The worker will not change these files again without coordination.

| File | SHA-256 |
| --- | --- |
| `storage/typed_store.py` | `7135d22e2da65717b51c4a511c3b5c6642e9c28b966ec92aca1756aa06782de6` |
| `storage/schema_v2.sql` | `6c23294e685d7f17a69ccaf6de813f96235e6301cd57ac6ed8f21c8137d91135` |
| `storage/tests/test_typed_store.py` | `54ede493644526557c6a450f436fa66ca71484717b73ce859eaa77f9fd324d42` |
| `storage/tests/migration_adapter.py` | `bb51bd48819f1f902fdcaec2fc773f6119609256dc3672df6d0f601af840e51f` |

The coordinator owns the separate one-line live-quota correction in legacy `storage/store.py`, all native binding/build changes, harness fixture-root changes and all Git/PR/durable publication. This worker made no changes to the original prototype, frozen baseline, legacy source, Git objects/refs/PRs, Page, Site, user computer or Codex tasks during this implementation role.

## Public Python API and source-carrier policy

```python
from typed_store import Value, TypedFact, TypedTemporalStore, Query, migrate_to_v2

migrate_to_v2(existing_schema_1_path)  # explicit; validated schema 2 is a no-op
with TypedTemporalStore(approved_storage_path) as store:
    receipt = store.transact("example/one", assertions=[
        TypedFact("alice", "score", Value.int64(9223372036854775807), 0, 10)
    ])
    answer = store.query(Query("answer(?v) :- triple('alice','score',?v).", 0))
    # answer.native['rows'] contains tagged JSON cells, not untyped Python scalars.
```

- `Value(tag, payload)` is frozen and validates stable tags 1/2/3/4. Convenience constructors are `Value.string`, `.boolean`, `.int64`, `.float64`.
- String values and e/a use NUL-free valid UTF-8 scalar text, exact bytes, no normalization, and the existing 512-byte admission cap. Python bool is never accepted as int64; direct float64 construction requires an actual finite Python float. Float negative zero normalizes to positive zero; subnormals remain legal.
- `Value.from_json` / `.to_json` implement exactly `{t,v}`. Every i64 payload is a canonical decimal string. `parse_i64_json` rejects JSON numbers/bools, leading plus/zeroes, `-0`, whitespace, non-ASCII digits and range overflow. `TypedFact.from_json` / `.to_json` use canonical strings for both valid coordinates. Explicit f64 JSON tags accept numeric payload `1` because JSON may omit `.0`; this does not coerce the value into the i64 logical family.
- `TypedFact(e,a,v,valid_from=0,valid_to=OPEN_END)` requires an explicit Value and a nonempty signed-i64 half-open interval.
- `TypedTemporalStore` reuses legacy Query, Commit, receipt, correction and snapshot/transaction semantics. New nonexistent paths bootstrap schema 2. Existing schema 1 raises `MigrationRequired` until explicitly migrated. Existing empty/unknown/malformed databases do not silently bootstrap.
- `history()` returns Value objects and ordinary Python clock/datetime metadata. `history_json()` emits tagged values, canonical decimal clocks and offset-qualified UTC timestamp strings. `query()` returns tagged JSON cells in `SnapshotResult.native['rows']`; `query_json()` additionally emits canonical strings for snapshot/known/valid coordinates.
- Native queries call the real `td_query_v2` using the agreed `STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)` and seven-field typed fact carrier. The whole retained history is materialized, including inactive rows; no hidden SQL/Python evaluator or temporally filtered validation bypass was added.
- Persistence and migration can operate without a built extension; query() then raises the explicit `NativeUnavailable` boundary. An absent feature is not a successful empty answer. A built artifact is loaded only from the fixed trusted sibling engine path. Arbitrary extension paths/SQL are not accepted.

## Schema, migration and safety

Schema 2 uses `v_tag/v_s/v_b/v_i/v_f` with known-tag, selected-nonnull, inactive-null and finite-f64 constraints. Direct SQL tests establish real `duckdb.ConstraintException` rejection, not an incidental binder/conversion failure. String NUL/byte constraints are also persisted.

Version dispatch inspects target catalog/version metadata **before any target bootstrap DDL**. Declared v1/v2 tables, column types/defaults and constraints must match the known schema signatures; weakened/partial/unexpected catalogs fail closed. Reference-schema DDL used to derive expected signatures executes only in separate disposable in-memory databases, never as target inspection.

`migrate_to_v2(path, fault_hook=None)` executes one real transactional shadow-table copy and metadata swap. It copies every retained assertion/duplicate, fact ID, e/a, original string bytes, both interval axes, timestamps, clock and receipt unchanged. It does not replay commands, parse old text or deduplicate history. It verifies shadow projection/full metadata and enforces unchanged admission/observed-byte caps. Reopening/re-migrating valid schema 2 is a validated logical no-op.

The actual hooks are `after_shadow_create`, `after_history_copy`, `before_metadata_publish`, `before_commit`, and post-commit `after_commit_before_return`. The first four roll back exact logical v1 state on exception; the last represents lost acknowledgement of a fully committed migration and is not falsely called rollback.

Production paths retain the real `storage` ROOT confinement and WAL/spill symlink guards. The transparent adapter opens **exactly the passed path**, invokes actual APIs and only maps structured domain errors. It neither copies/redirects databases nor monkeypatches ROOT. The coordinator added an explicit acceptance-harness fixture root confined beneath the adapter's actual STORAGE root, allowing the real unmodified legacy class's v1-positive/schema-2-negative controls. The original external test fixture root is not a production path override.

The same intended 1MB temporary quota is reapplied via live SET immediately after connect and before operations, following the pinned Python known issue. Existing 512-history-row, 256-command, 32-operation, 512-text-byte and observed 16MiB database/WAL/spill limits remain. These are not whole-process RSS, private-native allocator, CPU, hostile-input sandbox or cancellation guarantees. Single writer/process ownership remains required; separate objects/processes are not coordinated by the per-object lock.

## Actual verification and retained negative evidence

Pinned genuine artifact used by all worker runtime checks:

`implementation/engine/build/temporal_datalog.duckdb_extension`

SHA-256 `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d`.

The coordinator confirmed real actual-C-API-v2 LOAD and C_STRUCT_UNSTABLE v2.0.0 metadata. This worker independently checked the binary SHA before and after its run. No compatibility promise for older runtimes is inferred.

### Worker units

From `implementation/storage`, with the already installed exact DuckDB 2.0.0 wheel and no downloads:

```sh
PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2 \
PYTHONDONTWRITEBYTECODE=1 python -B -m unittest discover -s tests -p test_typed_store.py -v
```

Final result: **exit 0; 19 tests, 18 passed, 1 skipped**. The sole skip is the missing-artifact absence arm, inapplicable because the genuine artifact now exists. Both genuine-native tests ran and passed: four-way type identity/historical cuts/full-i64 output, and rollback of a transaction whose real native evaluation fails.

Other passed coverage includes full metadata/ID/duplicate preservation for four fixture histories, **400 independent expected SQL storage snapshots** (explicitly not mislabeled native evaluation), all four migration rollback hooks and retry, post-commit lost acknowledgement/idempotent reopen, unknown/malformed/weak-schema refusal without logical mutation, typed reopen/extrema/subnormal/zero/timestamps, duplicate/stale multi-operation rollback, all original admission caps including exactly 32 retractions, path/symlink rejection, direct persisted constraints, strict value/JSON/carrier validation, and an actual live-quota enforcement test under bounded spill pressure.

The quota test uses the real store connection helper/live SET, then lowers managed RAM to 8MB **only in the disposable test connection** before allocating at most 2,097,152 UBIGINT values. It requires the quota-specific offload diagnostic (and commit wrapper when applicable), observes no spill beyond the intended 1MB, exposes no partial answer and verifies zero remaining spill after close. A reported current_setting alone cannot pass it. This is not item-6 full resource acceptance.

Retained logs under this notes directory:

| Log | Result | SHA-256 |
| --- | --- | --- |
| `storage-value-unit.log` | Initial 4 Value-only tests passed | `17d11a9cf47d229b5d7894ab18b2ac04d2e242fc690429fee25f2a1c1e411171` |
| `storage-typed-unit-initial.log` | Initial full run failed its **test teardown**: it summed eight independent databases against one store's 16MiB limit | `034494bba0f948ac62bbd993fb518dbfd30bfbae724df73c1c62d02635b61ead` |
| `storage-typed-unit-final.log` | First corrected full run: 19 tests, exit 0, one inapplicable skip | `976d4124fa57a95feea6b60c3b45995ce670e0dc3ba86f17e645aa1b7f99106e` |
| `storage-typed-unit-verified.log` | Final strengthened quota-error-point spill sample; 19 tests, exit 0, one inapplicable skip | `333ce7735b99522c0d229d73b5d67580ee22d634008110d65292c299e0b2a915` |

The initial failure was not erased or reclassified. Only the test's aggregate-vs-per-store assertion was corrected, and an additional real native-failure rollback test was added before the final run. The final rerun additionally samples spill immediately after the expected quota error, not only after successful batches. No production cap was enlarged.

### Coordinator's genuine migration acceptance (independently read back)

- `test-prep/storage-contract/native-migration-initial.json`: **PASS, 26 PASS / 0 FAIL / 0 UNRUN**.
- Raw log: `/tmp/temporal-roadmap-research/iteration-01/storage-native-migration-initial.log`.
- Actual adapter: `implementation/storage/tests/migration_adapter.py`.
- Actual disposable run: `implementation/storage/acceptance-fixtures/acceptance-01a81bca8372`.
- This worker did not clean or redirect those coordinator-owned fixtures.

These include real typed native snapshots through the transparent adapter, historical migration/rollback/retry, physical IDs/clock/receipts/timestamps, strict constraints, caps and the genuine retained legacy open boundary. The report was observed PASS, not inferred from fixture generation.

## Remaining scope and handoff

The four owned files are stable and ready for the coordinator's serialized source snapshot/draft-PR checkpoint. The worker has no pending unit process. The coordinator remains responsible for durable preservation, integration evidence, native/browser/SQL/regression/performance aggregation and roadmap status. The full item 1 is **not declared complete** by this storage slice; renewed transport/performance work and other coordinator gates remain external to this handoff.
