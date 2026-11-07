# Native schema catalog v1

The extension now compiles a bounded schema DSL in C++, persists versioned
catalog data, and enforces complete entity records through atomic native
commands. SQL and the thin TypeScript binding call the same implementation.
Tests add an entity type,
close/reopen the database and use the new type without changing the extension
binary/hash. This is the first native schema slice of the architecture target.

## Define a schema

```text
schema crm version 1 {
  entity Person {
    "person/name": text required;
    "person/age": int64;
    "person/tags": text many;
    "person/manager": ref(Person);
  }
}
```

Supported scalar types are `text`, `boolean`, `int64` and `float64`.
`ref(EntityType)` refines a string ID with a native target constraint; it keeps
the string tag. The current v2 API also accepts `datetime` and
`ref_value(EntityType)`, `json` and `blob`. Attributes are optional and
cardinality-one by default.
`required` requires at least one value; `many` permits multiple distinct values;
`one` states the default explicitly. Duplicate equal values have set identity
and do not violate cardinality-one. Undeclared attributes are rejected. Types
and modifiers outside this profile fail explicitly; global uniqueness and
other graph constraints remain future work.

The C++ compiler sorts entity and attribute definitions into canonical JSON.
Equivalent declaration order/spacing and explicit default `one` produce the
same descriptor/hash. Registering an existing name/version is idempotent only
for the same descriptor. Changed definitions require a new version. Existing
versions remain available with their original interpretation.

Definitions are rows in `td_catalog_v1.schemas`, containing authored DSL,
canonical IR and its SHA-256. The `entities` and `attributes` views expose that
runtime data. These user-schema versions are separate from the physical
physical assertion catalog. New entity definitions require registration, not
compilation of a new extension.

## Native references

`ref(Person)` accepts a nonempty, well-formed NUL-free UTF-8 entity ID of at
most 128 bytes. The target type must be declared in the same schema definition;
forward and self type declarations are allowed. Required/one/many and duplicate
set rules apply as for other fields. Reference IDs use ordinary quoted text in
the record DSL and `{tag: 'str', value: targetId}` through TypeScript.

Pure `validateRecord` checks the declaration, scalar type, ID shape and record
rules. An atomic native entity command additionally requires an already declared
native target of the named schema/type, or permits a first-write self-link of
that type. Wrong-type, foreign-schema and missing targets reject before changes
to assertions, receipts, owners or clock. Targets created earlier in the same
caller SQL transaction are visible; rollback removes the whole transaction.
Forward instance references need a prior declaration, which can be an empty
record when its schema permits one.

This profile references stable entity identity. Identity persists across record
replacement and is independent of current property values or the target's valid
interval; it does not assert temporal overlap or a target's required properties
at the source's valid time. There is no native entity deletion/cascade operation.
Historical reads validate the source's original schema version and require the
target's first durable native declaration at or before the source command.
Creating a target later cannot repair an invalid earlier link. A later schema
version can change a reference's target type while old history retains its
original meaning. Global uniqueness, temporal foreign keys and cascades remain
separate future work.

`td_schema_references_v1(dsl, ir)` produces reference metadata from the checked
C++ definition. `td_catalog_v1.schema_references` exposes it as rows; the
`attributes` view also has nullable `reference_type`. `entity_identities` derives
first declaration positions from matching immutable schemas, owner/type bindings
and durable native command headers. No new physical assertion carrier or
compiled code per user entity type is needed. Scalar-only canonical descriptors
and prepared record encodings retain their previous bytes, preserving replay
identity. References join directly with entity IDs in Datalog. The transitional
Triplex projection still exposes these native string IDs as strings; full
Triplex schema/reference delegation remains future work.

## Expanded values

Use `datetime` for a finite binary64 epoch-millisecond value and
`ref_value(Person)` for a reference distinct from a text ID. Native record
literals are `datetime("bff4000000000000")` and `ref("alice")`.
TypeScript fields accept `{tag: 'datetime', value: -1.25}` and
`{tag: 'ref', value: 'alice'}`. Negative zero is canonicalized. The same
target rules apply to both reference field kinds. Use `[ref_id(?r) = ?e]`
to join a distinct reference with an entity ID.

Use `json("…")` with serialized JSON source, or the TypeScript field
`{tag: 'json', value: '{"ready":true}'}`. Queries preserve and compare the
exact source bytes. Native writes validate up to 16 KiB and 64 levels of
nesting. Persisted Datalog admits up to 4 KiB per relevant active JSON value.

Use `blob("id","image/png",1024,"photo.png")`, or the TypeScript field
`{tag: 'blob', value: 'id', mimeType: 'image/png', size: 1024, filename: 'photo.png'}`.
IDs occupy 1 to 512 bytes. MIME type is required, size is a nonnegative safe
integer, and filename is optional. Datalog uses `blob("id")` and returns the
typed ID. Native point and history reads return the full descriptor at the
selected cut. The store retains the descriptor and ID.

`NativeEntityStore` and `NativeSchemaCatalog` use the v2 entry points by default.
The first datetime or distinct-reference definition advances format 5 or 6 to
format 8. The first JSON or blob definition advances format 5, 6 or 8 to
format 9. Activation occurs in the registration transaction and preserves
canonical assertions, old schema bytes and receipts. The 0.25 binary fences
format 9. The four-tag entry points retain their original shape and reject
relevant expanded values.

The direct SQL v2 entry points include `td_define_schema_v2`,
`td_put_entity_v2`, `td_patch_entity_v2`, `td_entity_history_v2`,
`td_entity_at_v2`, `td_query_store_values_v2` and `td_query_store_scalable_v2`.
Both generations share the same audited ownership contract. See the
[expanded value contract](NATIVE-VALUE-EXPANSION.md) for wire and storage details.

## Global temporal uniqueness

Declare `unique` on a native attribute to prevent equal typed values from
belonging to two entities at the same knowledge and valid cut. The domain is
the schema name, entity type, attribute name and value tag. `unique` composes
with the existing cardinality and required modifiers.

```text
schema crm version 2 {
  entity Person { "person/email": text required unique; }
}
```

A new unique schema definition activates at one native knowledge position.
Registration validates overlap in the new domain and commits the definition,
activation record and clock together. Replay preserves the original schema
receipt and position. Earlier history remains queryable, including collisions
resolved before activation. Existing schema versions in that same typed
domain follow the constraint from activation onward. Later versions inherit
the domain even if the attribute omits the modifier.

The guard checks surviving intervals and new intervals, including carried
fragments. Half-open boundaries permit adjacent ownership. A batch can swap
owners at one position when its complete proposed state satisfies the
constraint. A conflict rejects the entire native command.

The first unique definition activates store format ten and schema IR3.
Older schema bytes and entity receipts remain stable. Reopen and explicit
revalidation check activation receipts and the retained postactivation
history. A predecessor engine rejects format ten. Dense-history audit cost
and temporal reference coverage have separate acceptance gates.

## SQL interface

Use the pinned macOS ARM64 engine and matched extension pair. For a fresh,
single-connection catalog, initialize, enroll and audit before native commands.
The native Node factories perform these steps on open and enroll every reader.

```sql
BEGIN;
PRAGMA td_initialize;
PRAGMA td_migrate_native_catalog_v2;
COMMIT;

LOAD './build/owner_probe/temporal_owner_probe.duckdb_extension';
SELECT system.main.td_owner_probe_enroll();
SELECT system.main.td_owner_probe_activate(0);

PRAGMA td_define_schema('schema crm version 1 {
  entity Person { "person/name": text required; "person/age": int64; }
}');

SELECT td_validate_entity_v1(
  dsl, ir, 'Person', '{"person/name"="Alice";"person/age"=i64(21);}'
)
FROM td_catalog_v1.schemas
WHERE name='crm' AND version=1;
```

`td_schema_ir_v1(dsl)` compiles a definition without persistence.
`td_schema_check_v1(dsl, ir)` verifies that catalog IR matches the native
compiler's interpretation. `td_validate_entity_v1(dsl, ir, entity, record)`
checks that descriptor before structurally validating the record; target
existence is enforced by entity commands. NULL or mismatched catalog
data fails explicitly. Registration expands to one parameter-free, safely quoted
INSERT/upsert statement, so it is atomic and participates in an existing SQL
transaction. There is no SQL execution inside a scalar callback.

Record literals use double-quoted strings, `true`/`false`, signed integer
literals or `i64(...)`, and exact float bits such as
`f64("0000000000000001")`. Standard JSON string escapes, Unicode scalars and
surrogate pairs are supported. NUL, invalid Unicode, nonfinite floats and
out-of-range integers are rejected. Integer and float tags never coerce into
one another.

## Thin TypeScript interface

```typescript
import { NativeSchemaCatalog } from './build/adapter/native-schema.js';

const catalog = await NativeSchemaCatalog.open({ database: 'example.duckdb' });
try {
  await catalog.define(`schema crm version 1 {
    entity Person { "person/name": text required; "person/age": int64; }
  }`);
  await catalog.validate('crm', 1, 'Person', [
    { attribute: 'person/name', value: { tag: 'str', value: 'Alice' } },
    { attribute: 'person/age', value: { tag: 'i64', value: 21n } },
  ]);
} finally {
  await catalog.close();
}
```

The binding serializes primitive values, queues operations and owns lifecycle.
It does not implement schema/type/cardinality rules. Native semantic errors are
exposed as `NativeSchemaError` with the engine's `TD_E_SCHEMA_*` or `TD_E_VALUE_*`
code. `get(name, version)` returns persisted source/IR/hash after the native
descriptor check; missing definitions return null. Validation requires an
explicit schema version and rejects a missing definition. `validateRecord`
accepts record DSL directly for the same native path.

## Native entity commands

```sql
PRAGMA td_put_entity(
  'crm', 1, 'Person', 'alice', 'command-1',
  '{"person/name"="Alice";"person/age"=i64(21);}',
  0, 9223372036854775807
);
PRAGMA td_entity_receipt('command-1');
PRAGMA td_entity_at('alice', 1, 0); -- knowledge position, valid tick
PRAGMA td_entity_history('alice');
```

```typescript
import { NativeEntityStore } from './build/adapter/native-entity.js';

const store = await NativeEntityStore.open({ database: 'example.duckdb' });
try {
  await store.defineSchema(`schema crm version 1 {
    entity Person { "person/name": text required; "person/age": int64; }
  }`);
  const receipt = await store.put({
    schema: 'crm', version: 1, type: 'Person', entityId: 'alice',
    commandId: 'command-1', validFrom: 0n, validTo: 9223372036854775807n,
    fields: [
      { attribute: 'person/name', value: { tag: 'str', value: 'Alice' } },
      { attribute: 'person/age', value: { tag: 'i64', value: 21n } },
    ],
  });
  const rows = await store.at('alice', { knownAt: receipt.position, validAt: 0n });
  const history = await store.history('alice');
} finally {
  await store.close();
}
```

`put` is **complete-record replacement**. C++ validates the supplied record,
closes all live native assertions for the entity at a new global commit
position, then appends the new values with the supplied valid interval. It
supersedes old knowledge for the entire entity, including outside that new valid
interval. Use `patch` for interval-local replacement. Both recorded
and valid intervals are half-open; `9223372036854775807` is the infinity sentinel
and cannot be a point-query cut. Negative valid ticks and exact int64 values are
preserved natively; data outside Triplex's numeric/time profile is marked
noninteroperable and its compatibility initialization rejects it.

### Interval-local corrections

`patch` and `patchRecord` accept the same request fields as `put` and `putRecord`.
They replace the complete record inside the supplied half-open valid interval.
At the new knowledge position, values outside that interval keep their prior
meaning. Earlier knowledge cuts retain the complete original answer.

```typescript
await store.defineSchema('schema account version 1 {entity Row {value:int64 many;}}');
await store.putRecord({schema:'account',version:1,type:'Row',entityId:'a',
  commandId:'a-initial',record:'{value=1;}',validFrom:0n,validTo:30n});
await store.patchRecord({schema:'account',version:1,type:'Row',entityId:'a',
  commandId:'a-correction',record:'{value=2;}',validFrom:10n,validTo:20n});
```

The latest answer is value 1 on `[0,10)`, value 2 on `[10,20)`, and value 1 on
`[20,30)`. The patch closes intersecting assertions at its new knowledge position
and creates nonempty left/right fragments plus the replacement record. Disjoint
assertions retain their IDs. A patch fills prior gaps within its interval.
An empty record clears that interval when the declared schema allows it.

Carried fragments retain their source values and original validation schema,
including reference declaration meaning. Their physical creator is the new
patch command. Persisted provenance links each fragment to its source and its
original validator. Repeated corrections flatten the validator reference while
retaining the immediate source link. History still returns fifteen columns,
with schema/version/hash describing each fact's validation origin.

Patch receipts include replacement and fragment assertion IDs and intersecting
retractions. Their command kind and deterministic IDs differ from whole-record
puts. Reordering or duplicating equal input values preserves replay identity.
Replaying an acknowledged patch returns its original receipt after later writes.
Retained limits charge every new fragment. At most 4096 assertions may be affected,
and the resulting live entity and complete new assertion set must each fit 4096.
All validation, provenance, receipts, usage and clock changes share one transaction.

SQL callers use `td_patch_entity` or `td_patch_entity_with_limits`, with the same
eight or ten arguments as their put counterparts. `NativeEntityStore.open`
performs the one-time native catalog revision-two migration. Direct SQL clients
run `td_initialize`, then `td_migrate_native_catalog_v2` once when the revision
table is empty. Repeating the migration rejects explicitly.

The interval migration preserves physical format 5. The first committed patch
changes format 5 to format 6 atomically. Format 8 supports the same provenance
and stays at format 8 after a patch. A failed first patch leaves format 5 intact.

An entity ID retains schema-name/type ownership. New versions under that same
name/type are allowed. Each historical assertion retains the exact schema
version/hash used for validation. Native history verifies the descriptor,
physical creator, fragment validation origin, declared attribute tag and scalar carrier.
These checks do not make direct SQL access an authorization boundary.

Command identity hashes the canonical record set, schema identity and valid
interval. Reordering fields or repeating equal values returns the original
receipt, even after later replacements. A changed request under the same ID
fails. Receipts contain asserted/retracted IDs, commit position and schema/request
identities. Missing receipts return null in TypeScript and no SQL rows. IDs from
another API are rejected. Native commands refuse to retract/adopt legacy or
foreign live assertions; schema/type migration needs an explicit future API.

The native query pragma emits one safely quoted, bounded statement expansion.
DuckDB 2.0.0 executes its temporary plans, admission checks, receipt/header,
history, usage and clock mutations atomically. It also participates in an
explicit caller transaction. The wrapper owns no duplicate command semantics
and performs no automatic retry. After an uncertain outcome, reconcile the
receipt before considering a whole-command retry. An explicit transaction with
an execution failure must be rolled back by its owner. Semantic errors carry
the native code through `NativeCommandError`.

### Atomic entity batches

`NativeEntityStore.batch({ schema, version, commandId, members })` applies
one to 32 distinct entities at a single knowledge position. Each member
supplies `operation` (`put` or `patch`), `type`, `entityId`,
`validFrom`, `validTo` and `fields`. Use `batchRecords` to supply a native
`record` in each member. A typed reference can resolve to another
member of the same batch, including a forward or cyclic declaration.

The receipt contains the command and schema identity, request hash, position,
and each member's operation, identity and assertion/retraction IDs. Members
are canonicalized in byte order by entity ID. An equivalent replay returns the
same receipt after later writes, with no new knowledge position. Read it with
`batchReceipt(commandId)`. An unknown ID returns null. Reusing a command ID for
a different request or command kind fails.

SQL callers use `td_batch_entities_initial(schema, version, command_id, members_json)`
for the first batch, then `td_batch_entities` with the same arguments.
The JSON array uses the `batchRecords` member shape with canonical signed
decimal strings for the two valid-time ticks. The `_with_limits` variants
append the retained fact and byte caps. `td_batch_receipt(command_id)`
retrieves the native receipt. Initialization, all member mutations and the
receipt commit together with catalog revision three. A first batch moves
earlier formats to nine and preserves format ten on stores with uniqueness.
Earlier native binaries reject the new revision.

Admission caps each record at 64 KiB and the member JSON at 96 KiB. A command
may submit and affect up to 4,096 assertions each and generate up to 8,192
new assertions including carried fragments. The resulting live assertion
cap is 4,096 per entity. A failed validation or execution rolls back the
whole command, including any format transition. Reconcile the receipt
after an uncertain commit before retrying the same command.

## Persisted Datalog

The native store also exposes the existing C++ stratified Datalog engine over
persisted data, without passing a fact list through TypeScript or Python:

```typescript
const result = await store.query(
  "answer(?e,?age) :- triple(?e,'person/age',?age),[?age >= 18].",
  { validAt: 0n },
);
// result.position, result.rows, result.route, result.reason, result.counters
```

```sql
PRAGMA td_query_store(
  'answer(?e,?age) :- triple(?e,''person/age'',?age),[?age >= 18].',
  0, -1, 100000, 1000, 5000000, 1000
);
-- program, valid tick, knowledge position, facts, rounds, work, deadline ms
```

Omitting `knownAt` selects the current committed position; SQL uses `-1` for
that choice. Explicit knowledge cuts must be in 0..current position. The SQL
statement reads one coherent knowledge/valid cut. C++ compiles the complete
program, derives relevant attribute scope and generates the persisted query.
DuckDB checks all retained carriers (including inactive history) and original
native schema bindings before building a distinct active EAV set. That set
enters the C++ evaluator directly. Results encode int64 as decimal strings and
float64 as exact bits before the thin TypeScript codec constructs public values.

Recursion, typed expressions, stratified negation and completed-stratum
aggregates use the existing native semantics. Programs outside the proved SQL
profile use the native evaluator and actual native counters. `forceNative: true`
(SQL: `td_query_store_native`, same seven arguments) selects that evaluator with
reason `forced_native`. With `forceNative: false`, `td_query_store` tries proved
SQL first, reporting `bounded_native_store` for programs outside its SQL profile.

Omitting `forceNative` asks the C++ cost helper `td_prefer_native_v1` about the
current retained-row ledger. Below 16384 retained rows the wrapper dispatches
`td_query_store_preferred_native` (same arguments, reason `preferred_native`);
otherwise it tries `td_query_store`. Every query still performs its own full
admission and cut selection. This cost hint includes history and unrelated
attributes, can be stale under another writer and is not a resource proof or a
universal performance guarantee. No schema or query semantics move into TypeScript.

The C++ planner now lowers a whole program consisting of one ordinary answer
rule over one triple atom, with no filters, negation, aggregates or other rules.
It preserves typed constants, repeated-variable equality, set projection and
native output order. SQL compares UTF-8 strings as BLOBs and carries all five
typed slots; int64 and float64 never compare through a shared numeric coercion.

Fresh database statistics must prove conservative native fact, round, work,
dictionary and output bounds before this route executes. Otherwise the same
statement falls back to the native evaluator, reporting
`single_atom_budget_unproved`. Successful SQL reports `route: 'sql'`, reason
`proved_single_atom` and `counters: null`; it does not invent native counters.
Whole-program safety and retained/schema checks still execute when projection
would produce an empty answer.

One ordinary answer rule over two to four positive triple atoms is also eligible
for SQL. Fresh key multiplicities bound semantic bindings and indexed native
work, including rejected candidates, for every atom subset. A same-entity
specialization groups independent attributes once. Logical intermediate
row/cell/carrier limits and the native limits must all hold, and SQL join inputs
are gated behind proof admission. Success reports `proved_edb_join` with null
counters; failed proof uses native with `edb_join_budget_unproved`. Typed
constants, shared/repeated variables, set projection and native output ordering
are preserved. See [the proof and executed scope](NATIVE-JOIN-PROOF.md).
Direct count and one single-atom source projection followed by complete-source
count now use SQL when fresh native and intermediate bounds are proved. Source
DISTINCT covers the whole tuple; grouping retains all typed slots. Empty global
count is zero and empty grouped count has no rows. SQL reports `proved_count`;
failed proof uses native `count_budget_unproved`. See [the exact profile,
proof and executed evidence](NATIVE-COUNT-PROOF.md). Other derived-relation joins,
filters and larger aggregate programs use native evaluation; the reference API has a wider
proved SQL profile.

The complete-source shape also admits `min`, `max` and `sum_i64` when fresh
projected measure-domain, native-budget and intermediate bounds are proved.
Extrema require a globally homogeneous non-boolean measure tag; otherwise even
valid mixed-tag groups use native. Sums accumulate exact HUGEINT and prove final
int64 range, allowing cancelling prefixes. Empty global extrema emit no rows;
empty global sum is zero. SQL reports `proved_aggregate`; unproved domains,
ranges or budgets use native `aggregate_budget_unproved`, retaining canonical
type/range/error priority. See [the exact proof](NATIVE-AGGREGATE-PROOF.md).

The persisted v2 fact input profile admits six tags and 512-byte scalar text,
separately from the 16 KiB native literal/entity-record text limit. A query
touching wider stored strings or other value
families rejects explicitly; an unrelated supported attribute can still be
queried. Native limits are at most 100000 facts, 2000 rounds and 50000000 work
units. Defaults are 100000/1000/5000000. `deadlineMs` is 1..60000, default 1000,
and bounds the native evaluator's cooperative polling; it is not a wall-clock
bound on SQL preparation, retained validation, output conversion or private
allocations. Errors return no partial answer and the owned connection remains
usable. The existing result transport retains its row/cell/16 MiB limits.

### Computed numeric projections

Expanded persisted queries accept bracketed arithmetic in a rule head when
a positive relation body binds every input. For example, a refund
contributes its signed amount to a completed aggregate.

```text
net(?event,[0-?amount]) :- triple(?event,'refund/amount',?amount).
answer(sum_i64(?delta)) :- net(?event,?delta).
```

The native evaluator uses checked int64 or finite binary64 arithmetic and
charges the existing expression work budget. Body filters retain their eager
fault order. Projections run on candidates that satisfy the body, before
the resulting tuple is deduplicated. Compute a head value in a separate
rule from an aggregate. Projections may consume completed recursion.
A projection that feeds its own recursive component is rejected.

Computed heads select the bounded native execution route. The scalable
entry point rejects programs that require this projection. Existing program
and inspection contracts retain their legacy output bytes.

### Interval answers

`NativeEntityStore.queryIntervals(program, { validFrom, validTo, knownAt? })`
returns one knowledge position and half-open answer intervals. Each interval
contains a typed answer tuple. Equal tuples coalesce across adjacent segments,
even when different assertions support them. Gaps, the requested window and
the original meaning at an earlier knowledge cut are preserved.

The native pragma `td_query_store_intervals_v1` compiles a single statement
with the audited owner and the selected clock position. It selects visible
history, cuts at relevant endpoints, evaluates each segment with the native
Datalog evaluator, and coalesces the complete typed result in DuckDB. Both
positive and negative input atoms contribute scope. Results are ordered by
start, end and exact tuple wire.

`maxSegments` defaults to 32 and allows up to 64. The interval request also
supports native per-segment fact, round and work limits, and a whole-query
`timeoutMs` and `signal`. The default controlled call uses a five-second
timeout from invocation under SDK query contract v2. The implementation caps retained input
at 100,000 rows and 16 MiB of logical carrier data, caps segment expansion
before building per-cut fact lists, and caps total declared work at 50
million. Native vectors have their existing output caps. A conservative
32 MiB wire expansion check runs before JSON encoding, followed by the exact
16 MiB wire check before coalescing.
These limits cover a bounded interval query at one selected knowledge
position. Larger histories have a separate qualification gate.

### Multiple point cuts

`NativeEntityStore.queryCuts(program, { cuts })` accepts 1–16
`{ validAt, knownAt? }` pairs and returns one `{ validAt, position, rows }`
group per pair. Groups retain the caller's order and duplicate coordinates.
An empty answer still returns its coordinates and an empty row list.
Every omitted knowledge cut resolves against the same committed clock.

The native pragma `td_query_store_cuts_v1` compiles one audited DuckDB
snapshot for the whole request. It admits the history relevant to any
cut, builds each active set, and evaluates the same bounded native program
against each set. Explicit knowledge cuts after the snapshot clock fail
the request. The TypeScript adapter sends the coordinates in one command
and decodes the typed groups.

Per-cut fact, round and work limits and a whole-query `timeoutMs` or
`signal` are available. Default timeout is five seconds from invocation,
including admission and reader acquisition, under SDK query contract v2.
Total declared work is capped at 50 million. Retained
history and point expansion have row and logical byte caps. Output has
100,000 rows, the same conservative pre-encoding check and a 16 MiB wire cap.
Cuts are supplied by the caller.

### Correlated temporal attribute lookup

`NativeEntityStore.queryLookupAt(driver, { attribute, validAt, knownAt? })`
runs an admitted positive EAV driver at the outer cut. Its first three
columns are a text entity ID, an int64 valid tick and an int64 knowledge
position. The remaining columns form the payload. The result appends the
selected attribute value to each payload and returns the typed set of
matching tuples. Missing attributes produce no tuple. All driver rows
must carry valid coordinates and the lookup knowledge position must be
between zero and the outer cut.

The compiler shares the scalable typed driver proof and applies both
half-open interval predicates in DuckDB. The driver, retained attribute
history, and ownership guard use one snapshot. `maxInputFacts` counts the
combined driver source and feature history rows. `maxCandidates` caps a
conservative fanout bound before materializing candidate pairs.
The controlled native command has a five-second default timeout from
invocation, including admission and reader acquisition, and accepts `signal`.

### Cancellation and whole-query timeout

The local TypeScript API additionally accepts `signal: AbortSignal` and
`timeoutMs: 1..60000`. SDK query contract v2 starts the timeout at public
invocation, covering the heavy-query FIFO, preceding writes and reader
acquisition. The native owned control scope begins only after the reader
lease is owned. This intentionally allows earlier deadlines under backlog
than the prior SDK contract. The timeout also covers source
serialization, cost preference, SQL preparation/validation/execution, native
evaluation, result fetching and typed decoding. The independent `deadlineMs`
still bounds native evaluation, including its native output encoding. Omitting
both new options preserves the original query path; a signal alone adds no
outer deadline.

```typescript
const result = await store.query(program, {
  validAt: 0n,
  signal: request.signal,
  timeoutMs: 5000,
});
```

Cancellation signals both DuckDB connection interruption and the existing C++
invocation's atomic flag. Native evaluation polls that flag and its independent
deadline. The driver also polls native monotonic status between result chunks
and periodically during conversion, so a delayed JavaScript timer cannot cause
an expired result to be accepted. The scope awaits terminal execution/result
cleanup, removes listeners/timers and retires the token before allowing reuse.
Aborting a queued request does not interrupt the previous request. Errors use
`TD_E_CANCELED` or `TD_E_DEADLINE` without partial answers.

These are cooperative controls, not hard process/physical-memory containment or
an exact adversarial wall-time guarantee. Query input/output/resource limits
still apply. The raw seven-argument SQL entry points retain their evaluator-only
deadline contract. The internal `td_query_store_controlled` adds control token
and route arguments; the owned driver manages their lifetime.

A small Node-API 8 C++ addon calls only the extension's control C ABI. It shares
the actual loaded registry, holds one pinned loader reference for process
lifetime and retains no facts, results or catalog context. The factory verifies
both binary hashes and the bridge pins the extension path/hash; it rejects
changing that image within the process. The registry admits at most 1024 live
invocations and tokens are retired explicitly. Build the addon with Node-API
headers from the selected Node installation; `build_native.py` locates them
beside that installation and records the addon hash. This does not add a Python
runtime path or schema/query semantics to TypeScript.

The current controlled path calls C++ `td_query_store_sql_v1` with program,
valid/known cut, facts/rounds/work/deadline limits and route. It returns read SQL
with one BIGINT control parameter. TypeScript transports that template and binds
the current token; it does not compile the program or alter its meaning. The
existing 32-entry/256 KiB prepared-source LRU reuses this structural SQL while
every execution validates the token, data, cut, schema meaning and budgets.
Bindings/results are cleared between calls; facts and authorization context
are not cached.

C++ returns NULL if expanded SQL exceeds the 262144-byte plan wire admission;
the driver then uses the original controlled pragma. A valid program therefore
is not rejected just because its expanded SQL cannot use the reusable transport.
Compiler output batches are bounded at 32 MiB. The fallback pragma embeds a
distinct token and bypasses the LRU; DuckDB 2.0.0 rejects bound parameters for
that pragma. The versioned 0.14 comparison is
`evidence/native-control-benchmark.json`; the current comparison is
`evidence/native-control-template-benchmark.json`.

### Cleanup failures

Result closure, binding clearing and statement destruction are attempted
independently. Their failures preserve the primary operation error and every
cleanup error in an AggregateError. Any uncertain cleanup, including eviction
destruction or control/listener release, fences the port before it can accept
another operation. Cancellation cannot hide that cleanup failure, and no success
is recorded before cleanup finishes.

Closing attempts deferred failed releases, every cached statement, the
connection and the instance even when an earlier release throws. Failed handles
remain available for explicit close-only cleanup; a failed close can be attempted
again without making the old client usable. Native entity/schema clients remain
closed after their first close request. There is no automatic business-command
retry. A write whose acknowledgement failed may have committed; reconcile its
durable receipt from an appropriately owned session before deciding what to do.

The factory creates a fresh owned instance, accepts a database path rather than
a supplied connection, and disables external access before public use. Raw SQL
entry points require an equally owned session without attachments. The visible
catalog-count check is diagnostic: DuckDB 2.0.0 filters `HIDDEN` attachments from
SQL catalog listings, including `PRAGMA database_list`. General host-supplied
connection admission is therefore not certified by that check.

## Profile and remaining integration

Definitions admit at most 16384 input bytes, 32 entities, 64 attributes per entity
and 1024 total attributes. Identifiers admit 64 bytes and attribute keys 128.
Versions are integers in 1..2147483647. Records admit 65536 input bytes and 4096
values, with the native 16384-byte text limit. These are per-call logical limits,
not complete native-allocation accounting or a catalog-wide storage quota.

Native replacements admit at most 4096 input values and 4096 old live assertions;
the common retained ledger enforces one million assertions / 256 MiB of logical
payload. Receipt/history output uses the native port's existing bounded result
transport. The SQL transport admits up to 256 KiB, accommodating SQL quoting of
a 64 KiB record. These bounds do not cover all metadata or private allocations.

Existing Triplex assertions/appends are not automatically bound to these user
schemas yet. Full graph constraints, temporal references, schema-aware query planning,
interval-local patches, native legacy-data adoption and the remaining ten-goal
boundaries are still open. Required/cardinality checks apply to each supplied
complete record, not an entire temporal history.

## Verification

The executed schema tests cover native canonicalization/version immutability,
constraints/set identity, scalar/Unicode boundaries, SQL rollback/literal quoting,
same-binary reopen/new entity types, SQL/TypeScript parity and catalog descriptor
mismatch after reopen. Ten additional entity-command tests cover exact scalar
sets, versioned history/reopen and independent reference/native Datalog parity,
SQL/TypeScript entry points, literal quoting, validation/admission, replay and
ownership, 4096-value replacements under the fixed 128 MiB runtime, late DML
rollback in run/stream paths, corrupted history rejection and two-connection
conflicts with receipt reconciliation. The final method uses three owned
writer processes killed inside assertion insertion, after command execution
before commit, and after commit. An unused sequence plus a test-only CHECK
publishes entry into the INSERT after header/retraction statements; a second
connection observes it while the command is pending. Bounded built-in regex
work creates the interruption window, with no production hook. Reopen checks
complete receipt/history/clock/usage and temporary-plan cleanup, reconciles the
outcome before a healthy next command, and requires the mid-INSERT case to have
preserved the complete old state. This tests the existing C++ expansion and
DuckDB recovery, not simulated acknowledgement. Source-bound results are in
`evidence/verification.json`.

Ten persisted-query tests add exact typed and temporal reads, recursion,
negation/aggregates/expressions, eager faults, budgets/deadline and healthy reuse,
inactive corruption/schema binding rejection, relevant profile admission and
SQL/TypeScript parity after reopen, 45 SQL/native scan identities, fresh budget
proof/fallback, empty-answer corruption rejection, prepared-query reuse through
data updates/rollback/schema evolution/eviction, and a late-row schema-fact fault.
`benchmark-store-query.mjs` checks every
answer on 64, 4096 and 20000 retained facts, measuring complete query/output
latency with two warmups and five samples. Source-bound samples are in
`evidence/native-store-query-benchmark.json`; this is not a SQL-first speedup
claim.

`benchmark-scan.mjs` compares proved SQL and forced native on the exact same
program, data and binary, alternating two warmup pairs and five measured pairs
at 64, 4096, 20000 and 40000 facts. It verifies every returned value and records
all samples in `evidence/native-scan-benchmark.json`. The SQL route gives modest
gains on the measured large projections; the forced native route is faster on
the small cases. Explicit `forceNative` exposes that choice. These results do not claim
SQL is faster for every eligible program.

Six EAV-join methods add 22 SQL/native identities, budget/fallback and
600^4 Cartesian gating, temporal/schema evolution, and fresh C++ cost preference
across the retained-row threshold. `benchmark-join.mjs` rotates forced native,
proved SQL and automatic preference on the same binary/program/data, with two
warmup rounds and five measured rounds at 500/2000/10000 three-attribute entities.
It verifies every output row and includes retained validation, proof statistics
and exact output conversion; ingestion/open are excluded. Source-bound samples
are in `evidence/native-join-benchmark.json`, including SQL regressions on small
joins. The cost preference is an empirical starting point, not an optimal plan.

Four count methods add eleven program identities, independent expected counts,
typed/set/empty/temporal equivalence, native budget boundaries and preprojection
gating for a wide constant. `benchmark-count.mjs` alternates native and SQL at
512/4096/20000/40000 facts after native fixture close/reopen, checking every
answer. At 40000 facts filtered count measures 51.66ms native and 47.87ms SQL;
small queries favor native and grouped counts are approximately tied. Complete
samples and source/build pins are in `evidence/native-count-benchmark.json`.

Five reference methods add native forward/self declarations, structural UTF-8
ID/type/cardinality checks, atomic same-schema/type target admission, set/replay
identity, transaction-local target declaration/rollback, runtime introspection,
same-binary reopen/type evolution and SQL/native graph joins. History integrity
tests remove or change target bindings/first declarations and substitute a
not-yet-created target, checking both scoped history and all-retained Datalog
validation for inactive links. `benchmark-reference.mjs` records actual native
reference commands followed by closed/reopened persisted graph queries on 64/512
sources. Every output row is checked; current-path measurements and source/build
identities are in `evidence/native-reference-benchmark.json`.

Seven query-control methods check the actual shared Node/C++ registry, pinned
artifact identity, the live-token cap and retirement, native/SQL parity and
fresh data, listener cleanup, real SQL timeout/cancellation and healthy reuse,
native cancellation with independent deadlines, queued-abort isolation,
parameterized template reuse across fresh/retired tokens, data updates,
rollback and schema evolution, and large-template fallback.
`benchmark-control.mjs` rotates ordinary/controlled native and proved-SQL full
projections over 512/4096/20000 facts written through native schema commands and
closed/reopened before querying. Every value is checked; open/ingestion are
excluded. These measurements expose control overhead rather than claiming a
speedup. Older benchmark packets retain their versioned source/build identities.

Six cleanup methods inject faults into real SDK result, binding, statement,
connection and instance methods, plus listener/control release. They cover
pre/post binding clearing, primary fetch errors, cancellation during uncertain
close, eviction failure, independent close attempts and close-only retry.
These exercise failure paths through actual DuckDB resources; they do not claim
those failures arose naturally or that every possible native cleanup fault has
been reproduced.

The existing 32-entry / 256 KiB prepared-statement LRU now admits the read-only
native query pragmas as well as SELECTs. It rebinds/executes against current data
and clears parameters/results after each call. No new host compiler, fact cache
or result cache is added. Native schema-fact validation consults the compiled
descriptor directly instead of repeatedly joining JSON attribute descriptors.

## Native performance check

Within a vector callback, C++ reuses one immutable compiled definition for
adjacent records with the same DSL. Input aliases are normalized before borrowing
string views from the C API. Those views avoid copying DSL/descriptor bytes, and
the same immutable input cell can reuse its structural comparison. Changing the
DSL forces descriptor comparison again, even with an unchanged descriptor cell.
Every record and every fact/entity/attribute/tag is independently validated. No
record values, record/fact outcomes, live catalog handles or permissions enter
the template. Views and the template are released when the callback ends.
Tests cover changing DSL with a fixed descriptor, changed descriptors, NULL and
wrong fact tags after row 2050, multiple schema definitions, and healthy reuse.

`python benchmark_schema.py` builds the same native source with this reuse off
and on, then alternates real DuckDB validation queries. It checks all 512 output
rows and a last-row fault on every attempt. Build modes, identical source hashes,
artifact identities and raw samples are retained in
`evidence/native-schema-benchmark.json`. These callback measurements exclude
connection opening and do not claim a total write/query throughput improvement.

`python benchmark_schema_views.py` separately builds identical source with only
the borrowed-input optimization disabled/enabled; both variants retain compiled
DSL reuse. It alternates two warmup and five measured pairs on 32768 facts with
2 or 64 attributes. The callback case checks every Boolean; persisted native
and SQL count cases check the complete result/route/position after native file
fixtures close/reopen. Ingestion and open are excluded; retained history/schema
validation, fresh proof/execution and exact output are included.

| Attributes | Case | Before ms | After ms |
| --- | --- | --- | --- |
| 2 | Schema-fact callback | 6.30 | 4.96 |
| 2 | Persisted native count | 47.08 | 45.35 |
| 2 | Persisted SQL count | 51.08 | 48.67 |
| 64 | Schema-fact callback | 11.91 | 5.82 |
| 64 | Persisted native count | 53.20 | 47.48 |
| 64 | Persisted SQL count | 55.60 | 49.19 |

The wide-schema full-query gain is about 12–13%; the callback gain is about 2x.
These selected comparisons do not establish universal performance. Raw samples,
build modes and matching source hashes are in
`evidence/native-schema-view-benchmark.json`. The earlier count/control packets
retain their own source/build versions.

`node build/adapter/benchmark-entity.mjs` measures the complete native `put`
path at 1, 64 and 4096 values, including serialization, validation, DuckDB's
transaction and owned receipt. Full point/history/receipt checks run outside
timing. It uses two warmups and five measured attempts, with source/build hashes
and raw samples in `evidence/native-entity-benchmark.json`. These are current-path
timings, not a comparison with the differently scoped Triplex appender benchmark.


Six aggregate methods verify complete-source extrema and exact integer sums,
empty inputs, original schema/cut meaning, canonical errors and exact budget
boundaries. The paired benchmark uses native schema-bound files after reopen,
two warmup/five measured alternating pairs, and complete exact output checks.
At 40000 facts global min/max/sum measures 56.12/57.41/57.51ms native versus
51.66/52.10/52.11ms SQL. Small cases favor native; the 20000-fact cases are
approximately tied or slightly slower in SQL. See NATIVE-AGGREGATE-PROOF.md and
evidence/native-aggregate-benchmark.json for all six shapes and source pins.

## Scalable SQL and concurrent readers

Extension 0.19 adds `NativeEntityStore.queryScalable(program, options)` and the
matching `td_query_store_scalable` query pragma. C++ uses the existing compiler
and typed relational plans for supported scans, two-to-four-atom EAV joins and
complete-source count/min/max/sum. Recursive and other unsupported programs
reject with `TD_E_QUERY_SCALE_UNSUPPORTED`. This API always returns SQL results.

```typescript
const store = await NativeEntityStore.open({
  database: 'facts.duckdb',
  readers: 16,
  threads: 4,
  memoryLimit: '1GB',
  maxTempDirectorySize: '2GB',
  retainedLimits: {maxFacts: 20_000_000, maxBytes: 4_294_967_296},
});
const result = await store.queryScalable(
  "source(?e,?v) :- triple(?e,'amount',?v). answer(sum_i64(?v)) :- source(?e,?v).",
  {
    validAt: 0n,
    maxInputFacts: 10_000_000,
    maxIntermediateRows: 10_000_000,
    maxIntermediateBytes: 4_294_967_296,
    timeoutMs: 60_000,
  },
);
await store.close();
```

The example declares an experimental resource profile. Measured runs establish
its accepted latency, concurrency and capacity envelope.

The SQL pragma accepts `program, valid_at, known_at, max_input_facts,
max_intermediate_rows, max_intermediate_bytes, max_output_rows,
max_output_bytes, control`. Use `-1` for latest committed knowledge and `0` for
an uncontrolled invocation. `td_query_store_scalable_sql_v1` accepts the first
eight arguments and produces reusable SQL with a fresh control token at `$1`.
The existing control registry owns cancellation and template-token lifetimes.

| Query option | Default | Maximum |
| --- | --- | --- |
| `maxInputFacts` | 10000000 | 1000000000 |
| `maxIntermediateRows` | 10000000 | 1000000000 |
| `maxIntermediateBytes` | 536870912 | 1099511627776 |
| `maxOutputRows` | 100000 | 100000 |
| `maxOutputBytes` | 16777216 | 16777216 |

Input admission counts relevant physical active assertions before DISTINCT.
It checks modeled carrier bytes before constructing the active relation.
Further gates bound join subsets and aggregate projection/group stages before
their execution. Output bounds can conservatively count candidate rows before
DISTINCT, so a small distinct answer can exceed a declared candidate bound.
Budget failures report `TD_E_QUERY_SCALE_LIMIT`. Aggregate type and final-sum
errors preserve the native codes, including valid heterogeneous extrema groups
whose individual groups each have one supported measure tag.

These are logical per-stage bounds. The full retained-integrity audit, allocator
overhead, prepared plans and simultaneous queries have additional costs.
DuckDB's memory and temporary-storage configuration is shared by the instance.
Every persisted query uses the native execution-time ownership guard. Full
retained-carrier and original schema/history validation runs during activation
and explicit revalidation.

`open({readers})` accepts zero through 32 reader connections. The default zero
retains the original serialized execution. Positive values create connections
inside the writer's owned DuckDB instance. Each read waits for writes already
submitted to that store, then acquires its own reader. Later writes can overlap
it. Each query obtains one coherent valid/knowledge cut through the native plan.
Prepared statements, results, controls and cleanup belong to the leased reader.
SDK query contract v2 starts cancellation and timeout ownership at public
invocation. The native control token is created only after lease acquisition;
a queued abort or deadline owns no token and cannot interrupt another call.

The five heavy methods `query`, `queryScalable`, `queryIntervals`, `queryCuts`
and `queryLookupAt` share a FIFO with capacity equal to the configured
reader count. A slot remains owned through
prior-write waits, execution, decoding and native cleanup. The captured
prior-write barrier is from the original invocation. Light entity point,
presence, history and receipt reads retain their existing pool behavior;
writer operations do not enter the heavy FIFO. This is scheduling policy,
not a native-memory budget. There is no public admission mode or toggle.

`maxQueuedReads` defaults to 1024 and accepts zero through 100000. Pooled mode
admits at most the reader count plus this additional allowance, including reads
waiting for preceding writes. Excess calls reject with `TD_E_QUERY_BUSY` before
allocating a queued invocation. Serialized mode keeps its existing admission.

`threads` accepts one through 64 and defaults to one. `memoryLimit` and
`maxTempDirectorySize` accept integer byte quantities with B, KB/KiB, MB/MiB,
GB/GiB or TB/TiB units. Memory is bounded to 1 MiB through 1 TiB. Temporary
storage accepts zero through 1 TiB. Their defaults remain 128 MB and 64 MB.
`readerStats()` exposes pool capacity, availability, active leases and waiters.
Its waiter count covers connection leases. Reads waiting for the writer barrier
also consume admission capacity.
`resourceStats()` exposes DuckDB memory and temporary-storage byte counters.

Closing the store rejects new work, drains admitted work, and attempts every
reader and writer cleanup. A failed reader leaves circulation. Uncertain
cleanup preserves the existing close-only retry behavior.

A native error beginning with DuckDB's pinned `FATAL Error:` prefix fences the
whole shared instance and interrupts its active readers. Later calls return
`RESTART_REQUIRED` with the original fatal error as cause. Close all handles,
reopen and reconcile durable command receipts before retrying a write whose
acknowledgement failed. Recoverable memory errors retain ordinary cleanup and
healthy-reuse handling.

## Explicit retained storage budgets

`open({retainedLimits: {maxFacts, maxBytes}})` selects explicit native command
admission through `td_put_entity_with_limits`. This pragma takes the original
eight command arguments followed by the two budgets. The limits apply to the
complete retained assertion count and modeled retained payload after the command.
Their supported ranges are one through one billion assertions and one byte
through 1 TiB. DuckDB's physical memory limit has its own configuration.

Omitting the option retains the original one-million-assertion and 256 MiB
admission. Commands still use the same schema validation, atomic replacement,
history and receipt identity. A replay returns its original receipt even if
the newly supplied positive storage budget is below current usage. A new command
that exceeds its budget rejects atomically. Per-command record limits remain
part of the existing contract. No physical catalog migration is required.

## Audited native ownership

`NativeEntityStore.open()` requires a companion verified against the exact core
extension and packaged DuckDB 2.0.0 library. Missing, partial, malformed or
mismatched artifacts fail startup. The current integration is verified only on
macOS ARM64. An unsupported platform fails startup until its native pair is
ported and qualified. The removed `integrity` option is rejected explicitly.
Owned stores reserve database functions for the installed engine and extension.
Opening rejects user-defined SQL functions and macros before initialization.
Trusted helper calls resolve explicitly in `system.main`. Activation also checks
that native catalog views match the definitions embedded in the extension.

After all reader connections exist, activation enrolls them and runs the same
retained-carrier and historical-binding audit. Native
callbacks publish the audited state only after successful transaction and query
completion. Opening an unknown connection or closing an enrolled connection
invalidates that state. Every persisted query and native mutation checks the
current audited generation during execution, including cached prepared queries
and empty results. The host also checks before dispatching admitted work.

`queryScalable` reports an owned route reason that reflects its applicable
uniqueness proof. Bounded native evaluation and SQL lowering share the same
ownership requirement. `forceNative` remains a physical-plan diagnostic under
that requirement. Native schema commands, record replacement, receipt lookup
and point/history reads use trusted internal dispatch and native guards.
Raw port SQL and raw transactions invalidate ownership before dispatch.
The host must keep the underlying handles and internal dispatch authority private.
External or raw SQL work requires all owned reads and writes to drain first.
Revalidate after that work completes, before admitting further owned reads.
The C++ companion cannot inspect the complete raw SQL statement envelope through
the pinned public client-context interface.

`await store.revalidate()` drains previously admitted work, blocks new work,
reenrolls the current connections and performs the full audit. It is required
after external or legacy mutations. Failed or interrupted activation leaves
store operations fenced. The current open and revalidation interfaces have no
public cancellation option. Query cancellation retains its existing scope.

Audit scope covers retained carriers, schema/history bindings, managed view
definitions and exact retained row/byte totals. Guards require binary collation,
ascending default order and NULLS LAST during binding and execution. Managed
configuration is locked after startup. Receipt completeness, global clock
consistency and physical allocation containment retain separate acceptance work.
The planner preserves active-fact set semantics through audited
uniqueness or DISTINCT.

Build the core with `python build_native.py`. The core enables current-cut
uniqueness, all-cut uniqueness, injective projection and streaming source
execution by default. Build the companion with the pinned source and selected
engine library before opening the store.

```sh
python build_owner_probe.py --source-dir /path/to/pinned-duckdb-source --engine-library /path/to/libduckdb.dylib
python verify.py
```

`python verify.py` requires the paired companion. The owner build checks
source revision, generated catalog, shared integrity helper, core extension and
engine identities before compiling. Runtime loading checks the core, companion
and selected engine pair again.
