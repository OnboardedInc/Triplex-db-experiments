# Native value expansion contract

Value contract `td.values/2`. The four-tag SQL entry points and stored
definitions retain their existing contract. The 0.26 `NativeEntityStore`
uses the eight-tag contract through schema writes, history, typed evaluation
and scalable SQL reads under mandatory audited ownership.

## Value identity

| Tag | Schema field | Canonical value and operator contract |
| --- | --- | --- |
| 1 `str` | `text`, existing `ref(Type)` | UTF-8 bytes. Existing byte order and reference behavior. |
| 2 `bool` | `boolean` | Existing boolean identity. |
| 3 `i64` | `int64` | Existing signed int64 identity, order and checked arithmetic. |
| 4 `f64` | `float64` | Existing finite binary64 identity, order and checked arithmetic. |
| 5 `ref` | `ref_value(Type)` | Entity ID bytes. Equality is within tag 5. Schema writes enforce the declared target at the command knowledge cut. |
| 6 `datetime` | `datetime` | Finite binary64 UTC Unix epoch milliseconds. Preserve fractional and negative values and canonicalize negative zero. Support same-tag ordering and extrema. |
| 7 `json` | `json` | Valid, bounded UTF-8 JSON source bytes. Equality and grouping use the exact bytes, including whitespace and object-key order. |
| 8 `blob` | `blob` | Opaque ID bytes for equality and grouping. The assertion carries a MIME type, safe nonnegative byte size and optional filename. |

Every scalar compares for equality by tag and canonical value. Ordered
expressions and extrema accept text, int64, float64 and datetime within their
respective tags. Deterministic tuple ordering still orders all tags and uses
byte order for opaque values. `count` accepts all eight kinds. `sum_i64` and
numeric arithmetic keep their existing measure and operand rules.

Datetime uses `v_f` with the existing 16-hex-digit binary64 payload convention.
The native API accepts and returns an epoch-millisecond Number for this tag.
The exact literal constructor takes the bit string. Native valid-time ticks and
commit positions remain separate int64 quantities. Any future `TIMESTAMPTZ`
conversion needs an explicit range and exactness check.

Keep `ref(Type)` as a string field with target constraints. `ref_value(Type)`
uses the same target validation with a distinct value tag. In queries, the
explicit bound expression `[ref_id(?r) = ?entity]` projects a reference's ID
to text for an entity join. Wrong operand types follow the existing eager
expression-error contract. Implement that exact equijoin in scalable SQL with
the matching type proof over positive-body matches before filtering. Zero
positive-body matches produce no operand errors. Existing string joins and
equality keep their meaning. The legacy tag 5 carrier can participate in typed
queries without asserting that a Triplex write passed native reference
constraints.

JSON's native value is serialized text. Validate its UTF-8, JSON syntax and
depth once before storage and preserve its exact bytes in point, history and
query results. Keep structural canonicalization and path evaluation out of
this profile. A blob query returns its typed ID. Native entity writes and
assertion reads carry the complete descriptor, so point and history reads can
show the metadata at the selected cut. Reject conflicting descriptors for the
same attribute and blob ID in one record. Across commands, descriptor changes
follow normal interval and history rules. The size field describes an external
object. The runtime stores the descriptor and ID only.

## Version and storage boundaries

- Keep the original schema header and immutable `(name, version)` key. DSL
  definitions using tags 5–8 compile to `td.schema/2`. Every definition using
  only the old vocabulary, including `ref(Type)`, emits exactly its existing
  `td.schema/1` bytes. Any field type change requires a new user-schema version.
- Reuse the current assertion slots. Tags 5, 7 and 8 occupy `v_s`, and tag 6
  occupies `v_f`. Use the existing JSON string payload encoding for tags 5–7.
  For native tag 8, hash the canonical descriptor in `payload` with the field
  order ID, MIME type, size, optional filename. Verify `v_s` and `extra_json`
  against it. Retain the legacy tag 8 ID-only payload shape for compatibility
  rows. Native history checks the creator and original schema binding, and
  interval fragments carry the exact descriptor.
- Keep old prepared record bytes and all request, assertion, schema and receipt
  hashes. New values use the same canonical preparation and command sequence
  with their new typed payloads. Replay uses the original immutable definition.
  Replay and failed registration leave the catalog unchanged.
- The first successful datetime or distinct-reference definition advances
  format 5 or 6 to format 8. The first JSON or blob definition advances
  format 5, 6 or 8 to format 9. Registering a narrower definition preserves
  the current format. The transaction rewrites only schema and format metadata.
  Failure rolls back schema registration and the format change together.
  The 0.25 opener rejects format 9. Current Triplex initialization still requires
  format 5 and exact interop values. Keep its public codecs and legacy stored
  bytes intact. Explicit compatibility migration is a separate contract from
  making the existing carriers queryable in the native engine. Read-only
  expanded queries over existing compatibility rows require no format transition.

## Execution and qualification

Expose named v2 typed SQL entry points and keep the old entry points' types,
wire shape and unsupported-value behavior. The latest Node API selects v2
through its existing methods. Its value union adds the new tags and preserves
the four original value shapes. Old four-tag data, answers, ordering, assertion
IDs and command identity remain identical. The expanded path uses the same
C++ value domain and canonical SQL slots for input, comparison, projection,
grouping, output and historical reads. Bind JSON and blob IDs as bytes and use
tagged datetime bits through the JSON result codec. The legacy string API
remains separate. Scalable execution rejects an unsupported operator or
over-budget active carrier with an explicit error.

Charge variable-width values before DISTINCT, indexing and result allocation.
Keep existing caps on old types. The retained carrier audit admits up to 1 MiB
of UTF-8 bytes for entity IDs, attributes and text values. Native schema writes
cap the complete encoded record at 64 KiB, with a separate 128-byte limit for
schema-owned reference IDs. Native JSON writes admit up to 16 KiB and
64 nesting levels. Both persisted query routes admit relevant active JSON up
to 4 KiB and blob IDs up to 512 bytes. A larger retained JSON value remains
available through point and history reads. An affected Datalog query rejects
with `TD_E_QUERY_PROFILE`. Legacy JSON preserves its original source bytes
and uses the same strict grammar and byte gate on affected native queries.
Logical bounds and physical DuckDB memory and spill settings are separate.

Start with an isolated real DuckDB case using the pinned runtime and Node port.
Each slice must prove old schema/record/hash/replay byte identity, failed first
activation rollback, old and new history across correction and reopen, native
and SQL answer equality, mixed-tag rejection, logical limits and healthy reuse.
Datetime fixtures include fractional and negative epoch milliseconds, exact
float bits and cross-tag equality. Reference fixtures include legacy strings,
tag 5 joins, target validation and old cuts. JSON/blob fixtures include
equivalent-looking JSON with different bytes, tag 8 rejection by `sum_i64` and
extrema, descriptor conflicts and descriptor-preserving patch fragments. Measure
retained mixed-type data after those gates with the existing 1m/10m reader
protocol. All eight types pass functional qualification on macOS ARM64.
Track mixed-type scale separately in the [scale benchmark](SCALE-BENCHMARK.md).
