# Frozen planner lookup dependencies — independent source inspection

The published source checkpoint is `52b1e81f1d71590bdefb376e62924c9f717d4344`. This inventory is source-only and does not select a changed contract, apply a repair or claim a new application result. It is independent of any stopped evidence-backup preparation and contains no old failure payloads or witness reproduction.

## Real entrypoint order

`planner_v1._run` acquires the store lock, checks readiness, snapshots/validates request fields, rechecks readiness, checks physical size, and starts one explicit transaction. It then calls `_trust`, the inherited unqualified `_position`, input-stat admission, native-owned IR extraction, pattern counting/proof, and exactly one SQL or whole-native route. Result materialization/validation precedes the readiness check and COMMIT. Errors use rollback and propagate, not evaluator retry.

Therefore the new authority bootstrap must precede every DB-dependent trust/context/schema/clock/stat/IR query after BEGIN. Physical size and pre-BEGIN request processing do not run SQL. The existing `_trust` performs database and session queries BEFORE its shadow check; retaining that order would leave the bootstrap dependencies unresolved.

## Actual dependencies a revised lookup-authority proof must cover

| Region | Existing name form | Why it matters |
| --- | --- | --- |
| Old trust inspectors | `main.duckdb_*()` | Schema-only, not an explicit catalog authority. |
| Old trust session | unqualified `current_database/current_schema/current_setting` | Callable binding must already be established, not used to establish itself. |
| Old shadow count | unqualified `count(*)` | Aggregate name is a callable dependency too. |
| Exact version/signature | unqualified inspectors, `DESCRIBE name`, base tables | Checks are inherited and may touch unqualified table lookup/default-catalog fallback; same-TX does not change resolution. |
| Clock | unqualified `FROM td_clock` | Planner comment claims `_trust` closes its namespace; that needs a complete engine-level proof or an explicit narrow adjustment. |
| Input/pattern/final SQL | `main.temporal_facts`, `main.encode/strpos/chr/octet_length/isfinite`, plus unqualified aggregates | `main` is schema-only; allowed context, absence of reachable override entries, and base schema all matter. |
| Generated casts | unqualified `UTINYINT/BLOB/BOOLEAN/BIGINT/DOUBLE/VARCHAR` | Exact base-column signatures alone do not prove cast target resolution. Type-entry authority must be covered independently. |
| Native IR | `main.td_plan_ir_v1(?::VARCHAR)` | Helper signature/internal identity and VARCHAR type authority precede its call. |
| Whole-native fallback | inherited `td_query_v2`, `COALESCE/list/struct_pack`, unqualified `FROM temporal_facts`, nested type names | A finite contract must cover native fallback SQL too, not only the final generated SQL route. |
| Reference signature | `_expected_signature` disposable memory connection | Separate reference context is not the owned connection and must not be confused with validating its lookup authority. |

No user relation/variable/literal becomes a generated SQL identifier: fixed aliases/CTEs are program-derived numeric IDs and literal values are bound parameters. This reduces identifier surface but does not remove engine catalog/type lookup for fixed names.

## Decision boundary

Absolute rejection of every extra attachment is different from demonstrating that evaluation resolves only owned/trusted objects. Any explicit replacement of the former with the latter needs a reviewed revised contract, pinned binder evidence including default-table and type resolution, residual concurrency/trusted-native assumptions, permitted pre-fix durability, and fresh independent regression fixtures. Visible metadata alone is not full attachment inventory. This note supplies no authority to implement or to claim acceptance.

## Root independent exact-pin source cross-check

[Catalog resolution](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L1131-L1220) enables default lookup only when catalog and schema are both omitted. If an ordinary table has already resolved and a matching attached-catalog default table also resolves, the engine throws an ambiguity error instead of silently selecting the latter. Non-table default-schema fallback also exists for implicit-search catalogs, but only after ordinary lookup finds no entry. The revised proof must cover this condition for every inherited unqualified fixed name; it cannot use a blanket search-path-only argument.

[Type binding](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/expression/bind_type_expression.cpp#L25-L66) consults reachable type entries and then falls back to the dedicated system namespace. [Type metadata](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/table/system/duckdb_types.cpp#L61-L87) exposes a physical Boolean internal flag and scans TYPE_ENTRY separately from callables. A callable-only guard does not cover this namespace. Type metadata also inherits the all-schema enumeration's deliberate HIDDEN omission; it is not complete attachment inventory. These are source-level proof obligations, not a runtime wrong-row claim or an approved guard patch.

## Finite review checklist for any lookup-authority variant

1. Bootstrap itself depends only on protected system entries and structural typed operations; no overridable aggregate, context scalar, user cast target or ordinary inspector is evaluated first.
2. Reachable callable and TYPE_ENTRY overrides, including temporary objects, are rejected before fixed-name evaluation; native helper identity remains genuine. A physical Boolean flag is not the same thing as a parsed user-resolvable Boolean cast.
3. Protected current database/schema/search path/settings attest the owned path and explicit permitted lookup candidates. Additional implicit-search/default-table rules are accounted for rather than omitted.
4. Every table/type/function dependency in both SQL and whole-native fallback is covered. Default-table ambiguity must be reported as an error, not described as guaranteed hidden-state noninterference or absence.
5. Catalog metadata and evaluation share the actual transaction view; document any attach/detach or independent mutator behavior that is not snapshot-isolated. The per-store Python lock is not a cross-connection/cross-process ownership proof.
6. Preserve no-repair/no-retry/error propagation, same-TX complete fetch/private result validation/COMMIT order, all retained-row/cap proofs and supported-FP premise. Rejecting an unsupported catalog never triggers a second evaluator.
7. Keep absolute attachment-absence attestation distinct. Any bridge uses a real exact-host internal capability, not a claimed public-v2 hook; any contract revision is explicit, reviewed and durably selected before app code. Source-only proof and synthetic controls never stand in for genuine fixtures or performance.

### Type-dependency conclusion narrowed after default-generation proof

The planner research lane subsequently traced the pin's lazy default generator and ordinary conflict/drop backstops. All fixed type names in this planner/native SQL are builtins in [default_types.cpp](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/default/default_types.cpp#L390-L543). Every main schema, including temp.main, installs the generator; creation materializes the recognized internal default before ordinary CREATE can occupy that name, and ordinary DROP cannot remove internal entries. Under the exact-pin/trusted-host/allowed-path premise, this closes the fixed builtin-type lookup dependency against ordinary SQL creation. It is NOT an established type-shadow vulnerability and does not make a fourth user-type reject arm a mandatory minimal repair. Such an arm would instead be an explicit conservative state policy. The earlier dependency inventory remains accurate about lookup paths, but must be read with this protection proof. No runtime type case was executed or claimed.
