# Integrated DuckDB temporal store

This is the Mac integration of the published native v0.6 kernel and completed
aggregate SQL compiler, plus an owned public persisted store. It is a bounded
experimental implementation, with the ten-goal work still in progress.

For a takeover with no conversation context, start with the
[complete Mac handoff](../handoffs/mac-zero-context-takeover-20261105.md).
The product target is millions of retained facts/events, fast large-data queries
and many concurrent readers. Write throughput is secondary. The store uses one
audited native-ownership strategy for persisted reads and native writes. The
matched C++ companion is required at startup. This integration is verified on
macOS ARM64 with the pinned DuckDB 2.0.0 engine. Linux qualification is pending.

The 0.24 ten-million-fact run passes sixteen-reader sustained ingestion gates
with 1671 exact reads and 233 acknowledged writes over three minutes. The 0.25
build passes a separate million-fact scalar screen. The 0.26 build qualifies
eight value types, including JSON and blob descriptors. Its revised all-cut
proof passes the sustained million-fact eight-type gate with sixteen readers
during ingestion. Broader workload and resource-accounting acceptance
remains open. See the
[takeover state](TAKEOVER-STATE.md) and [scale benchmark protocol](SCALE-BENCHMARK.md).

The architecture target is **native C++ semantics, a schema DSL that compiles
into runtime catalog data, and thin TypeScript/SQL APIs**. The adapter is a
bridge while that engine is built. Adding an entity type should require a schema
registration, with the installed extension unchanged. The native DSL → catalog →
atomic entity-command → temporal-history path now works for the eight-tag
profile, including same-binary reopen and matching SQL/TypeScript behavior.
See [the architecture target](DESIGN.md#required-architecture-target)
and [native schema guide](NATIVE-SCHEMA.md).

The Triplex runtime now connects directly to DuckDB's native Node binding
(`@duckdb/node-api` 2.0.0-r.1, engine 2.0.0). It does not start a Python worker.
The C++ extension supplies the version-5 catalog through `PRAGMA td_initialize`
and implements the typed Datalog kernel. Triplex's TypeScript layer still owns
parts of command orchestration and schema semantics. The native schema v1 profile
supports four scalar types, required fields and one/many cardinality. Existing
Triplex writes do not automatically enforce those definitions yet.

The schema-bound native API is `NativeEntityStore` in
`build/adapter/native-entity.js`, backed by `PRAGMA td_put_entity_v2`,
`td_entity_receipt`, `td_entity_history_v2` and `td_entity_at_v2`. C++ owns command
validation, canonical replay identity, schema-version binding and temporal cuts;
TypeScript encodes values, decodes results and owns the connection lifecycle.
See the [native guide](NATIVE-SCHEMA.md#native-entity-commands) for both APIs and
the explicit full-record replacement semantics. The 0.27 API also supports
[atomic entity batches](NATIVE-SCHEMA.md#atomic-entity-batches) with exact
receipts and interval-local patches at a shared knowledge position.

The native DSL also supports `ref(EntityType)` fields with atomic same-schema/type
target admission and historical first-declaration checks. `ref(Type)` fields
retain string IDs. `ref_value(Type)` stores distinct references with explicit
`ref_id` joins. The `datetime` type preserves finite epoch-millisecond bits.
See the
[reference profile](NATIVE-SCHEMA.md#native-references) for stable-identity semantics,
same-transaction creation, schema evolution and temporal/cascade boundaries.

`NativeEntityStore.query(program, { validAt, knownAt? })` and
`PRAGMA td_query_store` now execute persisted Datalog through the C++ engine,
without a Python request path or a host-side fact list. The current native route
supports recursion, expressions, stratified negation and aggregates, reports
its route/counters, and checks the audited ownership generation on every call.
Startup and explicit revalidation check retained carriers and historical schema
bindings before publishing that generation.
See [persisted Datalog](NATIVE-SCHEMA.md#persisted-datalog) for exact profile,
budget and connection-ownership boundaries. C++ now proves and lowers simple
single-atom scans/projections, bounded two-to-four-atom EAV joins and direct or
single-projection complete-source counts, extrema and exact integer sums to SQL, with fresh resource admission
and native fallback. See [count scope and evidence](NATIVE-COUNT-PROOF.md).
The [extrema/sum profile](NATIVE-AGGREGATE-PROOF.md) proves projected measure
domains and final int64 sums; unproved domains/ranges retain native errors.
Other derived-relation joins, filters and larger aggregate programs use native evaluation. SQL results
have no native counters. Omitted `forceNative` uses a C++ cost preference;
`true` selects native and `false` tries proved SQL first.

Optional `signal` and `timeoutMs` cover an owned query scope, signaling both
DuckDB interruption and native C++ polling and awaiting cleanup before reuse.
The existing `deadlineMs` remains an independent native evaluator limit. See
[cancellation contracts](NATIVE-SCHEMA.md#cancellation-and-whole-query-timeout).
The native build also produces a hashed Node-API control addon using headers
from the selected Node installation; schema and query semantics remain in C++.
C++ now compiles reusable parameterized read templates for controlled calls,
binding a fresh token on each execution with pragma fallback for oversized SQL.
Cleanup faults preserve errors and fence reuse while independent releases and
explicit close-only cleanup remain available.

The Triplex compatibility factory is:

```typescript
import { makeDuckDBRuntime } from './build/adapter/index.js';
const runtime = await makeDuckDBRuntime({ database: 'example.duckdb' });
// Provide runtime.layer({ scope, capabilities }) to the pinned Triplex API.
```

Native reads consume result chunks, enforce row/cell/byte admission, and close
results before connection reuse. SQL integer types remain exact `bigint` at the
transport boundary. Both the connection and instance are closed explicitly.
Up to 32 prepared SELECTs / 256 KiB SQL text are retained, with fresh bindings
and result ownership on every call. This is not total native heap accounting.
Python remains the scalar reference/test API and a build helper; it is not on
the production Triplex request path.

Writes use native typed data chunks and DuckDB's appender instead of expanding
each batch into a large VALUES statement. Chunks contain at most 2048 rows and
split toward an 8 MiB logical payload target. Appends, usage accounting, receipts
and the clock share one transaction. A later chunk failure invalidates that
transaction even if the caller catches the error. Tests include abrupt native
writer exits after the first chunk, before commit and after commit. Appender
flush is synchronous; these limits do not imply hard cancellation latency or
physical memory containment.

## Native store setup

Use Python 3.12 or newer for the build helpers and install requirements.txt in a
virtual environment. Build the core and its companion against the exact pinned
DuckDB source and SDK library, then compile and verify the adapter.

```sh
python build_native.py
python build_owner_probe.py --source-dir /path/to/pinned-duckdb-source --engine-library /path/to/libduckdb.dylib
python verify.py
```

```typescript
import { NativeEntityStore } from './build/adapter/native-entity.js';

const store = await NativeEntityStore.open({ database: 'facts.duckdb', readers: 4 });
try {
  await store.defineSchema('schema demo version 1 {entity Person {age:int64;}}');
  await store.putRecord({
    schema: 'demo', version: 1, type: 'Person', entityId: 'alice', commandId: 'first',
    record: '{age=21;}', validFrom: 0n, validTo: 9223372036854775807n,
  });
  console.log(await store.query("answer(?e,?v) :- triple(?e,'age',?v).", { validAt: 0n }));
} finally {
  await store.close();
}
```

## Python correctness reference

The Python API remains an independent reference for tests and comparisons.
It retains its own bounded storage contract.

```python
from temporal_store import Assertion, Store, Value

with Store('example.duckdb') as store:
    store.transact('command-1', [Assertion('a1', 'alice', 'age', Value('i64', '21'))])
    result = store.query("answer(?e,?v) :- triple(?e,'age',?v).")
    print(result.rows, result.result.plan.route)
```

Values use explicit tags: `str`, `bool`, canonical decimal `i64`, and finite
binary64 hexadecimal bits `f64`. Integer ticks represent valid time; recorded
time uses atomic commit positions. `known_at` is a commit position, not a wall
clock. Retractions close recorded intervals; corrections retract an old
assertion ID and assert a new one in a single command. The same command ID and
payload return the same receipt, including after reopen. A changed payload
under that ID fails. `history()` exposes both intervals and provenance.

The storage profile admits up to one million retained assertions / 256 MiB of
logical payload, with 4096 operations per command. The largest executed fixture
contains 20,000 assertions; the upper storage ceiling is an admission limit,
not a claimed million-row benchmark. It uses one serialized connection. Filters, recursion and negation
use the native evaluator; proved acyclic joins and aggregates use parameterized
SQL. Results expose the selected route and fallback reason. DuckDB validates
retained typed carriers and computes transaction-local snapshot/atom statistics
for the budget proof. Selected SQL scans the same persisted relation and cut;
native fallback receives only the validated active set, capped at 100,000 tuples
and subject to existing fact/work/output budgets. No query loads the entire
retained history in Python. `history_page(after_id=..., limit=...)` supports
bounded history traversal; eager `history()` is limited to 100,000 rows. Pages
are individual transaction reads and do not yet supply a cross-page snapshot
cursor. Broader scale/performance validation remains in progress.

`query(..., timeout_ms=5000, cancellation=token)` supports a `Cancellation`
token that another thread can cancel. Native callbacks poll invocation-owned
atomic cancellation/deadline state; SQL uses DuckDB interruption. The public
call returns only after termination and transaction cleanup. Logical budgets
and DuckDB's buffer cap do not provide complete native-allocation containment.

The bounded immutable IR cache retains at most 32 compiler templates and 1 MiB
of program/IR wire bytes. Facts, cuts, budget proofs, parameters and results are
fresh per invocation. `materialize('age', valid_at=...)` creates a restricted
latest-knowledge EAV projection. It maintains assertion supports across atomic
commands, preserves duplicates correctly under retraction and recomputes after
an external committed position change. Up to eight projections are admitted;
general derived joins/recursive maintenance still use fresh evaluation.

`timeline(program, valid_from=..., valid_to=..., known_at=...)` returns coalesced
answer intervals at one pinned knowledge cut and the visible assertion records.
It never joins across gaps. Assertion records carry both intervals, command
identity and correction provenance; answer intervals do not claim proof lineage.
Schema migrations v1→v2→v3→v4→v5 preserve receipts and history and add payload
hashes, persisted typed carriers and atomic retained-usage accounting. Version 5
uses one assertion, command and clock authority for both APIs. Native opening
accepts an empty database or formats 5, 6, 8 and 9. The Python migration path
handles older supported versions through format 5.

Native v2 queries read all eight value carriers from admitted Triplex and
native history. JSON compares by exact source bytes within the query budget.
Blob query results carry the typed ID, and native point and history reads
carry the assertion's full descriptor. The first JSON or blob schema
registration activates format 9 atomically.
Exact integers and integer-time bounds outside the
Triplex representation are preserved and rejected at Triplex initialization,
not rounded. Fractional Triplex validity is preserved separately and projected
onto the integer query domain with ceiling bounds. Cross-API transaction
journals/receipts do not yet have identical semantics.

## Pinned Triplex runtime

An opt-in mutation experiment is available from
`build/adapter/native-compat-runtime.js` as `makeNativeCompatibilityRuntime`.
It delegates physical append/retract conversion and retained admission to C++
inside the existing caller transaction. The public runtime continues to use its
current backend. The experiment supports format 5, up to 128 rows and 32 KiB per
native JSON envelope, with larger public batches split within one transaction.
It preserves all seven public value carriers and invalidates audited ownership
before raw dispatch. Six focused methods pass, including all 44 unchanged
Triplex cases through the opt-in factory. Its first paired benchmark records
slower writes at every tested size, including 391–465 ms for 1024 rows versus
12–17 ms through the typed appender. It remains an experimental transport.
See [the functional receipt](evidence/native-compatibility-spike-20261105.json)
and [the write comparison](evidence/native-compat-write-screen-20261105.json).

The actual pinned Triplex `e24dcdbf` core/testkit/SQL packages, shared Effect
4.0.3, and adapter have built and run. **All 44 unmodified runtimeConformance
cases pass with Capabilities.none**, plus eleven native adapter lifecycle,
interruption, typed conversion, streaming admission, prepared reuse, native batch
rollback and abrupt-restart
checks. There are 26 Python regression methods, including cross-language
history/clock/representation checks and legacy Triplex migration rollback.
Seven native schema cases also verify catalog versions, native constraints,
SQL/TypeScript parity, corruption detection and same-binary entity creation.
Ten native entity methods include observed process loss inside assertion
insertion, before commit and after commit, with receipt/history/usage recovery
and a healthy next command. See [native verification](NATIVE-SCHEMA.md#verification).
This does not advertise optional
snapshot/emission providers or production acceptance.

`python benchmark_schema_views.py` builds identical C++ source with borrowed
schema metadata off/on. At 32768 facts and 64 attributes, complete persisted
counts improve about 12–13% in this paired comparison; the schema-fact callback
with full Boolean output improves about 2x. Both variants still validate every
fact. Samples and artifact/source identities are in
`evidence/native-schema-view-benchmark.json`.

From a clean build directory, `python build_triplex.py` retrieves exact upstream
source and uses the committed npm integrity lock and official tsdown build.
It preserves an existing different dependency link instead of overwriting it.
The build script passed with the verified pinned source checkout and a fresh
`npm ci --offline` install from the packages acquired through the official
registry for this task. A separate network-empty clean-room reproduction is
not claimed. `--deps-dir` and `--source-dir` explicitly reuse owned build inputs.

```sh
node build/adapter/conformance.js
node --test build/adapter/test-adapter.js
python verify.py
```

`python benchmark_native.py` compiles the previous and current C++ kernels and
runs alternating checked workloads. `adapter/benchmark-transport.mjs` compares
the native transport to the retained Python reference (requires
`TRIPLESTORE_PYTHON` for that comparison only). Source-bound raw samples are
under `evidence/`. `python benchmark.py` measures complete Python public paths;
its timings include storage validation and marshaling, unlike the C++ harness.
`node build/adapter/benchmark-write.mjs` alternates SQL VALUES and native appender
paths on the same source, charging the complete public write transaction and
checking every returned value. Trace counts are partial diagnostics when
`trace_complete` is false.

The public factory is `makeDuckDBRuntime({python, database?})` from
`build/adapter/index.js`. Supply a validated DatabaseScope and Capabilities.none
to the runtime layer. One scoped worker owns one DuckDB connection. The adapter
uses Triplex's SQLite compiler strategy with an explicit DuckDB LIMIT/OFFSET
implementation; the physical backend is always reported as DuckDB. The complete
44-case runtime tests establish the tested compatibility. The native Python
store and pinned Triplex store have separate declared schemas/value contracts;
their database files are not interchangeable. The Triplex public number type
is binary64; the Python store additionally preserves exact signed int64 values.

The v2 extension is built locally for DuckDB 2.0.0; it is unsigned trusted code.
The public store accepts no arbitrary SQL, attached databases or caller-selected
extension. The Mac consumer uses the actual native IR2 value-layout contract;
other platform contracts need their own regression evidence. Linux source
support in the build is not a Linux integration test.

See DESIGN.md, SOURCE-PROVENANCE.json and WORKING-NOTES.md. Historical component
results remain separate from new integrated test results. This checkpoint is
not acceptance of all ten goals. See evidence/verification.json for exact source
hashes and executed results, and evidence/full-path-benchmark.json for all paired
timings and limitations.
