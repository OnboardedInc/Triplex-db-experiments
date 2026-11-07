# Pinned Triplex value contract

**Source revision:** `bjacobso/triplex@e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`  
**Research date:** 3 November 2026 (UTC)  
**Method:** read-only primary-source inspection and hand derivation. All referenced controls are **hand-only and unexecuted**.

This report distinguishes the tagged storage domain, Datalog input terms, binding/comparison identity, returned projections and result ordering. It does not select an adapter, capability subset or execution strategy. It establishes no loaded-build identity, runtime conformance, universal compatibility result or defect finding. Exact repository/path/ref/blob/line-range records are in `TRIPLEX-SOURCES.json`.

## 1. Storage values and constructors

Triplex defines seven tagged storage families:

| Tag | Payload representation in the inspected schema | Additional fields |
| --- | --- | --- |
| string | Schema.String | None |
| number | Schema.Number | None |
| boolean | Schema.Boolean | None |
| datetime | Schema.Number | None |
| ref | EntityId, a branded nonempty string | None |
| json | Schema.Unknown | None |
| blob | Schema.String content identity | mimeType: string; size: number; optional filename: string |

The input and typed triple/response schemas use the `TripleValue` union. The SQL packing and row-to-triple functions retain physical tags and represent blob metadata separately from its content identity. This is a representation statement, not a proof that every possible schema payload round-trips losslessly through every codec. In particular, `Schema.Unknown` alone is not a JSON-serializability check.

The helper constructors return objects directly. `datetime(numberOrDate)` uses the number unchanged or calls `Date.getTime()`. They do not themselves invoke a schema decoder, finite check, integer check or range check.

Sources:
- [Value.ts L4-79](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Value.ts#L4-L79)
- [Branded.ts L12-19](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Branded.ts#L12-L19)
- [Triple.ts L8-17, L43-74](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Triple.ts#L8-L74)
- [SQL queries.ts L3-47](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/queries.ts#L3-L47)
- [TriplesLive.ts L77-111](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L77-L111)

## 2. Public Datalog terms are a different domain

The public Constant schema admits:
- String literals that do not start with the reserved `?` prefix.
- Numbers.
- Booleans.
- One typed-constant shape: `{ type: "ref", value: string }`.

It does not admit arbitrary typed string/number/datetime/json/blob objects. A typed ref's Datalog schema uses Schema.String, whereas the storage RefValue schema uses the nonempty branded EntityId.

Pattern entity, attribute and transaction positions accept string literals or variables. Typed refs belong in the value position. A typed ref in an identity position is outside the validated shape.

The helper `isTypedConstant` only checks for a nonnull object with a `type` property. It is a broad internal guard, not a substitute for the public schema decoder. `assertDatalogQuery` schema-decodes before semantic validation; conclusions about rejected input apply to validated entrypoints, not arbitrary internal calls that bypass them.

The public Context type maps variable names to Constant or null. That broad type does not by itself state which storage tags survive binding; the conversion and projection implementations establish the flattening below.

Sources:
- [schema.ts L13-22, L39-95, L121-122](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L13-L122)
- [validation.ts L37-47, L333-358](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L37-L358)
- [types.ts L54-75](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/types.ts#L54-L75)

## 3. Flattened scalar identity

The inspected query implementations deliberately flatten storage values into public scalar families:

| Stored tag(s) | Public scalar |
| --- | --- |
| string, ref, blob | The string payload/content identity |
| json | Plain JSON.stringify(payload), hence serialized text for serializable payloads |
| number, datetime | The numeric payload |
| boolean | The boolean payload |

SQL uses text-family guards over string/ref/blob/json and numeric-family guards over number/datetime. KV produces matching primitive bindings and expands untyped scans across compatible stored encodings.

### Patterns and joins

- An untyped string value-pattern can match equal stored string, ref, blob and serialized JSON text.
- An untyped numeric value-pattern can match equal number and datetime payloads.
- A typed-ref **pattern** checks the physical ref tag and the payload.
- Repeated value variables compare flattened identity, so string/ref and number/datetime distinctions are not retained in such joins.
- A text-family value can also join a string identity position. A ref tag is not required for that join.
- Numeric7, text "7" and boolean true remain distinct families. No generic text-to-number coercion follows from flattening.

The source conformance cases explicitly assert untyped string/ref matching, typed-ref exactness, JSON/blob joins and numeric/text separation. These assertions were read, not run.

Sources:
- [KV pattern.ts L21-94, L187-259](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/pattern.ts#L21-L259)
- [SQL compiler.ts L268-340](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L268-L340)
- [testkit L572-717, L1689-1724](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L572-L717)

### Raw equality predicates differ from typed-ref patterns

A typed ref in a raw equality predicate is unwrapped to its string payload. Thus an explicitly typed ref **pattern** is tag-exact, while `["=", "?value", {type:"ref", value:"x"}]` compares the flattened text scalar.

Raw `!=` is the complement of raw typed equality. An incompatible family can therefore satisfy raw inequality: text "7" is unequal to numeric7. This must not be conflated with wrapper-filter negative equality, which has separate compatible-family/null behavior.

Raw ordered predicates require numeric operands. SQL guards the number/datetime storage family; KV checks that resolved operands are numbers. Validation's set of "numericBindings" means that a variable is value-position eligible, not that every fact matching that value variable is known numeric. A value variable may pass preflight and then have its string/boolean rows excluded by numeric runtime guards.

Sources:
- [compiler.ts L320-407, L624-631](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L320-L407)
- [KV predicate.ts L24-77](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/predicate.ts#L24-L77)
- [validation.ts L60-80, L207-218](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L60-L218)
- [testkit L721-846](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L721-L846)

## 4. JSON and blob eligibility and caveats

JSON and blob are stored families that participate in Datalog through flattened text. Typed JSON/blob objects are not public Datalog constants.

JSON comparison in these paths is comparison of serialized text, not structural object equality. Both SQL packValue and KV flattening call plain `JSON.stringify`. Property insertion order can therefore remain relevant. Compiler comments about "canonical" projection refer to canonical public **scalar families**, not the separate CanonicalJson content encoder.

The KV compatible-string scan helper attempts `JSON.parse` on the candidate string and adds the resulting JSON encoding without a scalar-only check. Its catch comment mentions JSON scalars, but the actual code and the pinned conformance example include object JSON. The final binding check still requires exact flattened text equality.

Blob Datalog bindings expose the content identity, not mimeType, size or filename. The pinned join example uses equal blob content identities with different MIME types and expects a join.

`Schema.Unknown` is not proof that a payload can be JSON-stringified. No universal behavior for functions, undefined, cyclic objects, BigInt or class instances is established by this review. Likewise, this report does not elevate the blob schema's plain string/number fields into validation of hash format, MIME syntax or a nonnegative size.

Sources:
- [Value.ts L36-46](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Value.ts#L36-L46)
- [SQL queries.ts L31-45](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/queries.ts#L31-L45)
- [KV pattern.ts L28-43, L73-94, L209-223](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/pattern.ts#L28-L223)
- [testkit L572-631, L669-717](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L572-L717)

## 5. Returned projections and result null

Datalog value projections lose storage tags according to the scalar-family map. SQL carries hidden family/type columns through projection and wrappers, then decodes from those columns. It does not need to guess whether numeric-looking text such as "007" is a number. Projected typed-ref constants are unwrapped to strings as well.

Missing optional projection fields produce **result null**. KV explicitly supplies null for a missing field; SQL optional scalar subqueries yield missing type/value information that the row decoder returns as null. This is not a new null TripleValue tag. A tagged JSON payload may itself be null, but the ordinary JSON flattening path produces serialized text "null", not result null.

Result null also occurs for empty non-count aggregates. The pinned conformance source expects empty ungrouped count0 and null sum/avg/min/max. Therefore "optional result null" is a correct example, not an exhaustive account of all result-null origins.

Sources:
- [compiler.ts L848-923, L1172-1240](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L848-L1240)
- [SQL row decoder L48-129](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L48-L129)
- [KV executor.ts L403-458, L461-505](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L403-L505)
- [testkit L402-445, L533-568, L1218-1267](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L402-L568)

## 6. DISTINCT, grouping, count and aggregate multiplicity

SQL DISTINCT and GROUP BY use canonical scalar-family projection columns. KV value bindings are already flattened; actualization deduplicates serialized projected rows, and grouping uses serialized vectors of flattened group keys.

### Exact five-fact source expectation

The pinned testkit case supplies five distinct entities whose values are:

1. number7
2. datetime7
3. stringT
4. refT
5. blobT

Here T is the same nonnumeric text content identity for the three text-family facts.

The source asserts:
- Value-only projection: exactly two rows, numeric7 and textT.
- Group by value plus count of entity: numeric group count2 and text group count3.
- Page size1: first page numeric7, totalCount2 and a cursor; second page textT, totalCount2 and no further cursor.

Those group counts are counts of **distinct source entity scalars within each group**. They are not a general count of physical facts or physical storage tags. Distinct entity names in this example make them equal to its fact counts.

### Count is distinct over the source variable

SQL uses `COUNT(DISTINCT ...)` over a family-prefixed scalar identity. KV uses a set of keys containing the primitive type and value. Thus count of a value variable is not automatically witness or fact multiplicity.

Other aggregates must not be assumed to deduplicate their measures. KV projects aggregate inputs without result-level DISTINCT; sum/avg filter numeric input values and consume their multiplicity. SQL emits SUM/AVG/MIN/MAX over the numeric expression. The pinned two-witness amount10 example expects **sum20 but count(?amount)1**. Empty ungrouped input expects count0 and null non-count aggregates.

Sources:
- [compiler.ts L825-875, L1131-1168, L1243-1262, L1352-1364](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L825-L1364)
- [KV executor.ts L403-443, L527-609, L716-730](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L403-L730)
- [Five-fact source case L450-529](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L450-L529)
- [Duplicate and empty aggregate source case L1218-1267](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1218-L1267)
- [Wrapper count L409-427](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/wrapper.ts#L409-L427)

## 7. Finite numbers, exact integers and temporal entrypoints

These boundaries must be assessed separately:

| Entrypoint | What the inspected source establishes | What it does not establish |
| --- | --- | --- |
| Value helper constructors | Direct object construction; datetime uses number or Date.getTime() | A finite/integer/range admission rule |
| NumberValue, DateTimeValue, Datalog Constant schemas | They delegate numeric decoding to Schema.Number | This review did not inspect Effect 4.0.3's implementation, so schema acceptance/rejection of NaN/Infinity is unresolved |
| CanonicalJson content encoding | Explicitly rejects nonfinite numeric values | Universal TripleValue or Datalog admission |
| resolveTemporalBasis | Explicitly checks current time, recordedAt and validAt for finite and nonnegative values | An integer requirement, or the behavior of every validFrom/validTo/datetime-value path |
| Pagination cursor decoding | Explicit finite numeric ordering-key checks; finite/nonnegative temporal basis; safe nonnegative recordedPosition | A universal numeric-value storage rule |
| SQL projected-number decoding | Converts numeric/bigint/nonblank numeric strings; the string branch rejects NaN conversion | A general finite guard; it is not written as Number.isFinite |

The temporal resolver's explicit arithmetic condition admits 0.5 as a finite nonnegative number; no integer check is present there. That source fact does not authorize assuming all temporal fields or all service boundaries have the same domain.

Triplex's numeric helper/schema/type surface is JavaScript-number-based. It supplies no exact signed-int64 decimal-string wire contract. By hand, the integer 9,007,199,254,740,993 lies between representable binary64 integers and cannot survive conversion to a JavaScript Number as itself. A safe-integer bound is a possible conservative future policy, not a selected policy and not the only mathematical exact-representability criterion.

Sources:
- [Value.ts L18-30, L59-79](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Value.ts#L18-L79)
- [schema.ts L69-77](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L69-L77)
- [Pinned Effect catalog version L17-40](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/pnpm-workspace.yaml#L17-L40)
- [CanonicalJson.ts L69-79](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/content/CanonicalJson.ts#L69-L79)
- [Temporal.ts L25-45](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Temporal.ts#L25-L45)
- [Pagination.ts L176-189](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts#L176-L189)
- [SQL projected-number conversion L48-56](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L48-L56)
- [ECMAScript Number representation and rounding](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type), a supplemental standard rather than Triplex repository evidence.

## 8. Result ordering and Unicode scope

The KV comparator orders flattened families as number, boolean, text, null. A requested descending direction reverses values **within** a family, not the family ranks. Numbers compare numerically, booleans by numeric false/true order, and text uses JavaScript `<`.

The SQL compiler and wrapper emit category ASC and numeric/boolean/text ORDER BY components. The inspected functions do not add an explicit text collation. The pinned source suite establishes intended ASCII/numeric-looking-text examples, including "10" before "2"; it does not prove arbitrary Unicode collation parity across SQL dialects or deployments.

For the product map's Unicode hand control:
- U+E000 has UTF-16 code unit E000 and UTF-8 bytes EE 80 80.
- U+10000 has UTF-16 code units D800 DC00 and UTF-8 bytes F0 90 80 80.
- JavaScript UTF-16 comparison places U+10000 before U+E000 because D800 < E000.
- Native unsigned byte comparison of UTF-8 places U+E000 before U+10000 because EE < F0.
- Both are non-NUL Unicode scalar strings and occupy only three/four UTF-8 bytes. The product's scalar-text, NUL and 512-byte constraints do not exclude them.

This is an encoding/comparator derivation, not an executed SQL, JavaScript, Python or native comparison. It does not claim a universal Triplex Unicode order.

Sources:
- [KV executor.ts L631-675](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L631-L675)
- [SQL compiler.ts L1070-1089](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1070-L1089)
- [SQL wrapper.ts L176-245](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/wrapper.ts#L176-L245)
- [ASCII/mixed-family source case L1579-1685](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1579-L1685)
- [Product compare_values L1489-1511]([PRIVATE_REFERENCE_REMOVED])
- [Product text admission L25-53]([PRIVATE_REFERENCE_REMOVED])
- [Product persisted text guards L47-49]([PRIVATE_REFERENCE_REMOVED])
- [ECMAScript String representation](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type) and [string comparison](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islessthan), supplemental standards for the hand derivation.

## 9. Canonical hand controls and source limits

The packet has one canonical control list: [HAND-CONTROLS.md](HAND-CONTROLS.md), T01-T08 and M01-M06, **fourteen hand-only, unexecuted controls**. Its T07 includes separate five-fact collapse/group/count and two-witness sum/count distinctions. The findings and derivations above provide their source basis; this report does not add a second control inventory.

### Limits and next source gate

No product source, runtime subject, dependency, database, conformance fixture or model was imported, compiled or executed. Repository text is evidence of the pinned source contract, not authentication of any running build. Source conformance assertions are not pass results.

Remaining limits include dependency-level Schema.Number admission, unsupported JSON payload behavior, arbitrary SQL Unicode collation, precision/rounding outside the stated hand examples and any future mapping's declared capability subset. A future implementation needs an explicit bidirectional storage/query mapping and stable unsupported-input behavior before executable semantic validation. This report selects none of those choices and releases no hold.

