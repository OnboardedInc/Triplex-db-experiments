# Typed values for temporal Datalog iteration 1

Research date 30 October 2026 UTC

## Decision

Add an explicitly versioned four-way value domain: string, boolean, signed int64 and finite IEEE 754 binary64. Equality is **tag plus canonical value**, with no implicit conversions. Integer `1`, string `"1"`, boolean `true` and float `1.0` are four different logical values. Canonicalize float negative zero to positive zero; reject NaN and infinities. Keep entity and attribute inputs as string identifiers, but carry a tagged value in **every internal and returned tuple position**, not only a base fact's value column.

Keep the existing `td_query` string API and grammar unchanged. Add a named `td_query_v2` using a typed STRUCT carrier, a separately identified JSON v2 format, and schema version 2. Migrate old rows by adding the string tag, never by parsing their text. Reference, date, timestamp, null, JSON, blob, decimal, unsigned and arbitrary-precision integer values are explicitly unsupported in this iteration. Future adapters may define other scalar families; they must not retroactively weaken this version's distinctions.

This memo is a design recommendation and pre-implementation research record, not an implementation, compatibility certificate or performance result. The roadmap's iteration 1 requirement was read from the current roadmap Page (private application reference omitted), sequence 2. Only the candidate source was inspected; no implementation, Page or Git object was changed.

## Evidence and current seams

The inspected candidate is `/tmp/temporal-datalog-20261030`. The initial preserved source is on [research-reference PR 7]([PRIVATE_REFERENCE_REMOVED]), initially pinned at `c24108a183a236c45eb570458a168fe1ef1cbaac`; that initial commit is **not** assumed identical to the newer local candidate. Relevant local observations:

- `engine/src/temporal_core.cpp:26–88` stores `uint32_t` dictionary IDs in small inline tuples, hashes IDs, and indexes columns by ID. This is the right hot-path abstraction to preserve.
- `temporal_core.cpp:98–100,143–155` has one string interner. `term()` at 170–205 accepts only variables or quoted strings. `add_triple()` at 255–263 interns all three base columns as strings. Equality and repeated-variable matching at 318–323 already compare IDs.
- `temporal_core.hpp:16–30` exposes string-only ingestion and results. `temporal_core.cpp:367–379` copies dictionary strings into results and sorts them lexically. Typed output, sorting and budgets must change together.
- `engine/src/temporal_datalog.cpp:17–28,51–64,112–129` binds seven-field facts with `v VARCHAR`, reads raw typed vectors, and emits `VARCHAR[][]`. This cannot preserve a type tag merely by changing the parser.
- `storage/schema.sql:4–8` constrains the version row with `CHECK(version = 1)`. An `UPDATE ... SET version = 2` alone **must fail**. The facts table has only `v VARCHAR`; full history and transaction metadata are retained separately.
- `storage/store.py:114–139` already rejects Python bool for temporal int64 by using `type(value) is int`. `Fact.v` is still `str`. Bootstrap executes v1 DDL before reading the version at 185–190; migration detection must precede version-specific DDL.
- `site/dist/engine.js:16,24,28,34–40` parses only string constants, admits string EAV, limits clocks to JS safe integers, uses primitive `!==` for unification, `JSON.stringify(row)` for keys, and an explicit UTF-8 comparator for results. All these are typed-value seams. Reusing fresh wrapper objects with `!==` would compare object identity, not values.
- `bench/bench.py:52–73` and its oracle normalizer assume strings, use Python native set/sort, and hash JSON output. Merely allowing Python numeric values would collapse boolean/int/float distinctions and invalidate the oracle.

The file hashes at the end identify the inspected bytes. Recheck them against the implementation handoff before editing.

## What the primary sources establish

**Datalog and the domain.** Positive Datalog operates over ground atoms, with range-restricted rules and finite active domains; its least-fixed-point and minimal-model readings agree. The original presentation does not require this project's four tags. Defining those tags is part of defining this engine, not discovering a universal Datalog coercion rule. [Green et al., sections 2.1–2.2](https://columbiadb.github.io/files/papers/datalog.pdf).

Soufflé distinguishes primitive domains and provides explicit conversions; its type documentation also illustrates why conflating type aliases with genuinely distinct domains can permit unintended bindings. Its mixed-type ADTs are a useful analogy, not a requirement to adopt Soufflé's grammar or static relation declarations. [Soufflé types](https://souffle-lang.github.io/types).

**Lexical form is not value identity.** A datatype can separate the accepted spellings of a value from its value space and canonical representation. [W3C datatype framework](https://www.w3.org/TR/xmlschema11-2/#datatype). RDF additionally distinguishes literal term equality from equality of denoted values. This prototype is **not** adopting RDF literal equality: accepted `1.0` and `1e0` should be one float value, although string `"1.0"` and string `"1e0"` remain distinct. [RDF literal equality](https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal).

**SQL is not the desired equality oracle.** DuckDB uses combination casting in comparisons and nested constructors, including boolean-to-integer conversion; wide integer-to-floating casts may lose precision. [DuckDB 2.0 typecasting](https://duckdb.org/docs/2.0/sql/data_types/typecasting). DuckDB also treats NaN as equal to NaN and above ordinary floats, unlike ordinary JS numeric equality. [DuckDB numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric). Consequently SQL baselines need explicit tag-preserving predicates, not bare mixed-family comparisons.

**Runtime differences matter.** JS Number is binary64, including both signed zeros and subnormals; BigInt is a different type. [ECMAScript 2026 numeric values](https://tc39.es/ecma262/2026/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type). Safe-integer checking specifically excludes magnitudes beyond `2^53 - 1`. [ECMAScript safe integer definition](https://tc39.es/ecma262/2026/multipage/numbers-and-dates.html#sec-number.issafeinteger). Python bool is an integer subtype, and native mixed-numeric comparisons do not enforce this proposed tagged domain. [Python numeric types](https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float-complex).

## Exact semantic contract

Assign stable public tag numbers `1=str`, `2=bool`, `3=i64`, `4=f64`; reject 0 and all unrecognized numbers. Do not reuse an assigned number or derive tag numbers from DuckDB's enum. A later format version can introduce new tags.

| Question | String | Boolean | Int64 | Finite float64 |
| --- | --- | --- | --- | --- |
| Accepted logical payload | Valid UTF-8 scalar text | Exactly false or true | `[-9223372036854775808, 9223372036854775807]` | Any finite binary64, including subnormals |
| Same-tag equality | Exact UTF-8 bytes | Same truth value | Same signed integer | Same finite numeric value after zero normalization |
| Same-tag result order | UTF-8 byte lexicographic | false before true | Signed ascending | Numeric ascending |
| Canonical intern payload | String bytes | 0 or 1 | Exact 64-bit integer | Binary64 bits, with either zero mapped to positive-zero bits |
| Automatic conversion | None | None | None | None |

Every off-diagonal equality comparison is false. Unification uses this equality, so a cross-tag mismatch is a nonmatch, not an exception. Incompatible explicit comparison operators belong to iteration 2, where the language can define errors separately. This iteration does not add arithmetic, casts, functions, ordered predicates or type declarations.

For deterministic **presentation ordering**, compare tag number first, then the same-tag order above; compare rows lexicographically. Thus tag order is string, boolean, int64, float64. This administrative total order is not a claim that the engine already supports a numeric `<` predicate across tags. Never sort by insertion-assigned dictionary ID, decimal spelling, locale collation, JS's default string sort, or subtraction of signed integers.

Strings are case-sensitive and receive no Unicode normalization. Precomposed `é` differs from `e` plus a combining accent. Reject lone JS surrogate code units and invalid UTF-8 at admission. For the new API, use NUL-free strings consistently with persisted storage; preserve the old API's existing behavior rather than silently broadening or narrowing it. Current direct-core/native and browser string admission are not identical to the storage wrapper on NUL, so document the v2 rule explicitly.

### Entity and attribute scope

External base facts keep `e VARCHAR` and `a VARCHAR`. They are string identifiers, not polymorphic values or inferred reference objects. The logical `triple/3` relation presents both as `str` values. The base `v` is tagged.

All derived tuple cells remain polymorphic tagged values. For example, a rule may move an int64 `v` into the first position of a derived relation or a literal head. If it later occupies the entity position of `triple(?x,...)`, it cannot match the string entity `"1"`. `triple(1,'age',?v)` is a valid but nonmatching pattern against text entities; `triple('1','age',?v)` can match. Do not add an inconsistent rule that treats the first column of every derived relation as a string.

Legacy edge values such as string `"node-b"` still join with entity string `"node-b"`. There is no separate reference tag yet. The strings `"2026-10-30"`, `"null"`, `"true"`, `"ref:x"` and `"9223372036854775807"` stay strings. Explicit reference/date/timestamp/null objects and literals must fail with an unsupported-type error rather than being stringified or interpreted as absent data. Bitemporal coordinates remain signed integer ticks and logical knowledge positions; admitting typed values does not change their units or turn them into datetime values.

### Why finite floats and normalized zero

With no NaNs and a single zero, same-tag float equality is reflexive, symmetric and transitive, and its canonical bit key agrees with it. This is essential for deduplication, indexed joins and fixed-point progress. An epsilon comparison is not an equivalence relation: with tolerance 1, 0 is close to 0.75 and 0.75 to 1.5, but 0 is not close to 1.5. It therefore cannot be an interning or hash-set equality rule.

Reject nonfinite values at every admission path, not only at the text parser. Canonicalize `-0.0` once, before hashing, storing or emitting. This intentionally discards signed-zero distinctions that matter for operations such as reciprocals; no such arithmetic is supported here. Floating-point representation and signed-zero hazards are discussed in [Goldberg's original paper](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html). Do not enable fast-math assumptions that can remove finiteness checks or subnormal behavior.

## Correctness invariants

Write the logical domain as `D = Str ⊔ Bool ⊔ I64 ⊔ (finiteF64 / {−0 ≡ +0})`. The disjoint union means identical-looking payloads in different summands are never equal. Let `N` validate a tagged input and normalize its zero; `N` must be idempotent. All ingress paths, parsed constants and output serialization must agree on this same normalization.

Require the following invariants independently of the container implementation:

1. **Injective interning.** For admitted values `x` and `y`, `intern(x) = intern(y)` if and only if `N(x) = N(y)` including the tag. Equal normalized values must share an ID; unequal ones must not. ID equality then implements typed unification, tuple deduplication and column-index lookup without coercion.
2. **Finite active domain.** Iteration 1 introduces no value-generating expression. For one query, the active set `A` consists only of normalized input values and finitely many program constants. There are at most `Σr |A|^arity(r)` possible logical tuples across the fixed relation schema. Positive consequence generation is monotone, so mathematical saturation is finite; configured budgets may still reject the query before saturation. Typed storage does not authorize unrestricted arithmetic or remove resource bounds.
3. **Injective legacy embedding.** Define `ι(s) = Str(s)`, componentwise on tuples and string constants. This embedding preserves and reflects equality. Because every old literal and input is embedded unchanged, rule matching commutes with it: `ι(TP(I)) = Tι(P)(ι(I))`. Therefore the least fixed point, and its answer projection, commute with the embedding.
4. **Every-cut migration equivalence.** Migration leaves all valid and knowledge boundaries unchanged, so visible legacy facts at any pair of point-query cuts are exactly their embedded old visible facts. Combined with invariant 3, v2 answers equal embedded v1 answers at **every** cut, not just the latest snapshot. Retained assertion identities and receipts must separately remain exact; logical EAV deduplication does not justify dropping history rows.
5. **Semantic order.** The result comparator decodes dictionary values and uses tag/payload order. It returns equality exactly for equal normalized values and is independent of assigned IDs, input order or hash iteration. All-string results retain the old UTF-8 lexical order under `ι`.

These are project-specific proof obligations built on the positive fixed-point semantics cited above. They do not prove a particular migration script or parser correct; the acceptance fixtures must exercise the implementation against them.

## Versioned literals and transport

### Text grammar version 2

Keep both existing quoted-string forms and escaping rules. Add lowercase booleans and decimal number tokens:

```text
term    ::= variable | quoted_string | "true" | "false" | integer | float
integer ::= "-"? ("0" | [1-9][0-9]*)
float   ::= "-"? (digits "." [0-9]+ exponent? | digits exponent)
digits  ::= "0" | [1-9][0-9]*
exponent ::= [eE] [+-]? [0-9]+
```

The absence/presence of a fraction or exponent selects int64/float64. `1` is int64; `1.0`, `1e0` and `1.00` are the same float. Quoted versions stay strings. Accept integer `-0` as canonical integer zero; float `-0.0` becomes positive float zero.

Require complete token consumption and a valid delimiter, so `1x`, `truex`, `1.0.0`, `1e`, `1e+` and `1e0junk` fail. Reject leading plus, leading zeros except zero itself, `.5`, `1.`, hex/binary/octal syntax, numeric separators, NaN and Infinity. Requiring a digit after a decimal point avoids confusion with a rule's final period. Booleans are reserved only in term context; do not accidentally ban an existing predicate named `true`.

Use a short bounded numeric-token length, e.g. 128 bytes, checked before conversion; retain overall program limits. Parse integers with checked decimal accumulation or an exact range-checking conversion. Special-case the signed minimum correctly—negating its magnitude in signed int64 overflows. Never parse int64 via double first.

Define decimal float parsing as nearest binary64, ties to even, then finiteness check and zero normalization. Ordinary representational rounding, such as decimal `0.1`, is deliberate for f64, not a decimal-exact promise. Reject overflow and nonzero decimal literals that underflow all the way to zero, with a clear range error; accept correctly represented subnormals. The parser must distinguish a lexically zero significand from nonzero underflow. Verify C++ conversion behavior on the exact compiler/library; reject a case if correct parsing cannot be established rather than quietly differing from JS.

No embedded grammar-version directive is necessary initially: `td_query` selects v1 and `td_query_v2` selects grammar v2. Saved queries and JSON envelopes should still record `program_version: 2` explicitly. Future syntax changes must not reinterpret old source silently.

### JSON version 2

Use a top-level format/version field and a single explicit tagged object per value:

```json
{
  "format": "temporal-datalog",
  "version": 2,
  "program_version": 2,
  "facts": [
    {"e":"p","a":"count","v":{"t":"i64","v":"9223372036854775807"},
     "valid_from":"0","valid_to":"9223372036854775807",
     "tx_from":"1","tx_to":"9223372036854775807"}
  ]
}
```

The value shapes are `{t:"str",v:"1"}`, `{t:"bool",v:true}`, `{t:"i64",v:"1"}` and `{t:"f64",v:1.0}`. Enforce tag-specific payload types and exact recognized fields. Raw untagged scalar values are not v2 values. All i64 payloads use decimal strings satisfying the integer grammar above, including small integers; all full-range i64 time coordinates use decimal strings too. Small bounded work/round counters can remain JSON numbers when their schema guarantees safe range.

In JS, decode i64 from its validated decimal string directly into BigInt and range-check it. Never use `BigInt(Number(text))`, `parseInt` followed by BigInt, `|0`, or `BigInt.asIntN(64, value)` as validation—the latter wraps. If a convenience `Int(number)` constructor exists, require `Number.isSafeInteger` before conversion. A Number outside that range has already lost the information needed to recover the intended input.

Float payloads intentionally use JSON numbers because they are binary64 values, not exact integers. JSON may print float `1.0` as `1`, but the tag preserves its float identity. Validate finiteness **before** serialization: standard JSON serialization turns nonfinite Numbers into null and ordinarily throws on BigInt. [ECMAScript JSON serialization](https://tc39.es/ecma262/2026/multipage/structured-data.html#sec-serializejsonproperty). RFC 8259 permits receiver precision limits and identifies the usual interoperable integer range, so a bare JSON integer cannot carry this project's full int64 contract. [RFC 8259 section 6](https://www.rfc-editor.org/rfc/rfc8259#section-6).

The lossless promise is the accepted typed value, not preservation of its original float spelling or signed zero. Export floats with a proven round-trip representation; do not truncate to six decimal digits. Use normalized f64 bits in canonical checksum/interner framing, independently of human-facing decimal formatting. If an archival binary/hex format is introduced later, version it rather than accepting ambiguous alternative payload forms now.

Keep BigInt inside the browser worker/evaluator as appropriate, but encode decimal strings at JSON, download, fixture and display boundaries. UI rendering must display the type tag or a typed literal, not just a shared `String(value)`. Legacy saved JSON v1 has string values and safe-number clocks; importing it assigns only string tags, with its existing safe-integer validation intact. If a legacy JSON string falls outside the explicitly narrower v2 admission contract, fail the import clearly instead of changing or dropping it; the unchanged v1 API remains its compatibility path.

## Stable DuckDB C ABI carrier

Recommended v2 logical types:

```text
TDValue = STRUCT(tag UTINYINT, s VARCHAR, b BOOLEAN, i BIGINT, f DOUBLE)
TDFact  = STRUCT(e VARCHAR, a VARCHAR, v TDValue,
                 valid_from BIGINT, valid_to BIGINT, tx_from BIGINT, tx_to BIGINT)
td_query_v2(program VARCHAR, facts TDFact[],
            valid_at BIGINT, known_at BIGINT,
            max_facts BIGINT, max_rounds BIGINT, max_work BIGINT)
  -> STRUCT(rows TDValue[][], rounds BIGINT, derived_facts BIGINT, work BIGINT)
```

The outer fact and value structs, tag, e/a, coordinates and selected payload must be nonnull. Exactly one payload is nonnull and it must match the tag; all inactive payloads must be null. Thus SQL nulls are transport discriminators, **not** a logical null value. Require an explicit empty typed list for no facts; do not silently treat a null v2 fact list as empty. Preserve the old API's behavior separately.

Read selected payloads directly as `bool`, `int64_t`, `double` and `duckdb_string_t`. DuckDB documents those vector representations and independent parent/child validity masks. Check validity before reading a selected payload; the data in a null slot may be uninitialized. [C vector interface](https://duckdb.org/docs/2.0/clients/c/vector). Do not use the generic `duckdb_value_*` family as a strict decoder because it automatically casts and may return defaults for failed casts/nulls. [C types and value access](https://duckdb.org/docs/2.0/clients/c/types).

The strict decoder guarantees the **post-binding carrier**, not recovery of a caller's original untyped SQL literal. SQL may already have coerced a value while constructing a heterogeneous list or explicit cast; no callback can recover that lost intent. Supported producers should construct each typed payload deliberately and test that path.

Use `duckdb_create_struct_type`, list types and existing vector APIs from the pinned v1.2.0 extension ABI. No need to adopt C API v2: DuckDB 2.0's current documentation explicitly marks it unstable and distinguishes its headers. [C API overview](https://duckdb.org/docs/2.0/clients/c/overview). Preserve exact ABI metadata and test real LOAD/evaluation on each claimed runtime.

A native DuckDB UNION is an alternative sum type with tag-aware order, but its convenience casts can choose an alternative based on implicit cast rules. [DuckDB UNION types](https://duckdb.org/docs/2.0/sql/data_types/union). The explicit STRUCT keeps the carrier validation visible and avoids depending on UNION's internal child/tag layout in the C binding. Do not stringify the wide struct, concatenate a tag prefix to payload text, or let a heterogeneous bare SQL list find a common numeric parent type.

For output, write the tag, selected payload and inactive null masks on **every cell**. Obtain writable validity masks before changing them. Reacquire data and validity pointers after any reserve/resize that can reallocate. Test list offsets, multiple scalar rows and chunk boundaries, not only one list at offset zero. Keep error handling all-or-nothing and avoid introducing SQL execution inside the native callback.

## Interning and fixed-point implications

The lowest-disruption design is separate admission maps for string bytes, int64 values and normalized f64 bits, plus cached/lazy boolean IDs, all drawing IDs from one query-local global ID allocator. Store a shared tagged dictionary entry for each ID. Two maps may contain identical 64-bit payload patterns but must yield different IDs across tags. Continue to store IDs in every tuple, binding, column index, seen set and delta relation.

This keeps tag and payload checks out of the join inner loop. Current `TupleHash` and relation indexes can remain ID-based after validation; the essential invariant is `same ID iff same tag and canonical value`. Soufflé similarly uses dictionary ordinals for symbols and records, demonstrating the design pattern without proving this implementation's performance. [Soufflé symbol and record tables](https://souffle-lang.github.io/implementation).

Important implementation details:

1. Hash actual scalar payloads, not display text. Read float bits with C++17-safe copying rather than aliasing a double through a `uint64_t*`. Require an 8-byte IEC 559 double or fail the build/platform admission.
2. Do not hash raw structs: padding, inactive fields and host endianness are not value identity. If using one hash map instead of separate maps, hash the tag first, followed by canonical payload.
3. Preserve the lifetime safety of owned strings. An existing `unordered_map` key pointer remains stable across rehash, but a pointer into a moving vector does not. A returned result must not retain pointers to an engine that has been destroyed.
4. Count **all distinct typed values** against the dictionary-count limit; count metadata/numeric storage as well as string bytes against memory/resource accounting. Budget checks should precede allocations where practical. The old string-byte budget alone does not bound a numeric dictionary.
5. Consider returning an owned typed dictionary plus ID rows to avoid copying a repeated string into each result cell. Keep that optimization separate from semantic correctness if it complicates initial ownership. Sorting can compare dictionary values through IDs.
6. Do not persist IDs or `std::hash` outputs as stable identities. For checksums, version an unambiguous frame: tag byte, length-prefixed UTF-8 for strings, one truth byte, signed-int64 eight-byte representation, or normalized binary64 eight-byte representation, with fixed byte order. Frame tuple arity and row boundaries too. Canonical hash framing and semantic sort order are different concerns.
7. Preserve query-local dictionaries; global interning would create cross-query lifetime, synchronization and resource-accounting obligations outside this iteration.

**Reasoned consequence, not a benchmark:** the new typed active domain is still finite because this iteration only copies input values or uses finite program constants; it invents no arithmetic results or function terms. Replacing constants with canonical tagged IDs therefore preserves the positive immediate-consequence structure. Semi-naive evaluation still needs at least one delta atom and set difference against known facts. [Foundations of Databases chapter 13](https://webdam.di.ens.fr/Alice/pdfs/Chapter-13.pdf). The optimization remains sound only if every deduplication, unification and index path uses the same canonical equality.

## Persistence and migration

Prefer a shadow-table migration over incremental weakening of the old schema. Store tag and typed payload columns physically so later SQL-first planning can filter typed data without parsing strings:

```text
v_tag UTINYINT NOT NULL
v_s VARCHAR NULL
v_b BOOLEAN NULL
v_i BIGINT NULL
v_f DOUBLE NULL
```

Create the v2 table with a CHECK that enumerates the four valid shapes, requires exactly the selected payload, and requires `isfinite(v_f)` for floats. Normalize zero in the writer/native admission. Retain all current interval, metadata, primary-key and commit-reference constraints. Because inactive fields must be null, complete typed structs have one canonical SQL representation.

Suggested explicit migration procedure:

1. Acquire exclusive application migration ownership; reject concurrent operations. Inspect the existing schema/version before running v2 or v1 bootstrap DDL. Reject unknown versions, malformed metadata or unexpected schemas rather than guessing.
2. Identify an admitted consistent backup/recovery route and account for its disk cost. Start a transaction. Preserve the old code and migration fixtures so rollback is testable.
3. Create a v2 shadow facts table with complete constraints. Copy `v` unchanged into `v_s` and assign `v_tag=1`; leave other payloads null. Copy each fact ID, e/a, valid boundaries, transaction boundaries, inserted/retracted metadata exactly. Do not collapse duplicate assertions merely because their EAV values match.
4. Verify counts, all-field equality of legacy projections, IDs, all historical snapshot results, clock position, command receipts and referential integrity. Verify legacy strings including `"true"`, `"01"`, `"1e0"`, ISO-looking dates and int64-looking text remain strings.
5. Atomically switch tables and replace the version metadata table/constraint. The old `CHECK(version=1)` cannot be updated in place. Do not depend on `ALTER TABLE DROP CONSTRAINT` to remove it: current DuckDB does not support that operation; it also cannot add arbitrary CHECK constraints by ALTER. [ALTER TABLE limits](https://duckdb.org/docs/2.0/sql/statements/alter_table).
6. Commit only after all checks. On any error, roll back. Reopen with v2 code and verify the stored version and exact data again. Reapplying the migration to an already-v2 database must be a verified no-op, not a second conversion.

DuckDB documents transactional ALTER behavior and rollback, but a specific migration still needs fault-injection and reopen tests on the pinned runtime. [Transactional DDL](https://duckdb.org/docs/2.0/sql/statements/alter_table#syntax), [transaction management](https://duckdb.org/docs/2.0/sql/statements/transactions). Logical row preservation is not a crash/restore certification.

Keep schema, program grammar and JSON format versions conceptually separate even if all are 2 initially. Old code should safely refuse v2 storage. A v2 store should return typed results, including string-tag wrappers for migrated rows. Never present typed rows to a legacy query by silently filtering them out or stringifying them. The unchanged `td_query` remains available for callers that explicitly supply its legacy string-only list.

Migration temporarily duplicates data and grows WAL; current observed 16 MiB store admission must account for that rather than failing halfway because only the old file size was considered. No current prototype cap should be lifted merely to make the migration pass.

## Acceptance and adversarial test matrix

Run independent expected-value fixtures through the parser/core, real DuckDB C binding, persisted Python store, JSON codec and browser's **declared subset**. Compare typed canonical rows, not just printed text. A shared canonical fixture format is fine; do not share the evaluator or numeric validator between the native implementation and independent oracle.

| Area | Required cases and expected outcome |
| --- | --- |
| Four-way identity | Store `str("1")`, `bool(true)`, `i64(1)`, `f64(1.0)` at the same e/a. Answer has four rows; repeated insertion derives no additional logical tuple. Four-way equality/unification matrix has only same-tag matches. |
| Joins and propagation | Repeated variables, constants in heads, mutual/nonlinear recursion and typed v moved into every derived tuple position retain tags. An int binding cannot join text entity `"1"`; a string edge target still can. |
| Literal normalization | `1.0`, `1.00`, `1e0` collapse only within f64; int `1` remains separate. Both signs of float zero collapse; int zero remains separate. String spellings never collapse. |
| Int64 boundaries | Minimum/maximum and their adjacent in-range values round-trip exactly. `2^53-1`, `2^53`, `2^53+1`, negative counterparts and adjacent max values remain distinguishable. One below minimum/above maximum fails before partial output. |
| Float boundaries | Smallest positive/negative subnormal, minimum normal, maximum finite, neighbors around 1, 0.1, near-safe-range floats and large exactly integral f64 values. NaN, either infinity, overflow and nonzero underflow-to-zero fail. |
| Parse rejection | Bad exponents, numeric suffixes, leading plus/zeros, `.5`, `1.`, hex, separators, unsupported type constructors, huge numeric tokens, malformed UTF-8 and invalid escape sequences. Error identifies the relevant input/byte, not a rounded substitute. |
| Carrier validity | Null list/fact/value/tag/selected payload, nonnull inactive payload, unknown tag, malformed shape, numeric e/a and nonfinite f payload fail. Validate admitted rows even if temporally invisible, matching the documented all-row validation contract. |
| JSON and JS | i64 payload Number is rejected, decimal string accepted, bare BigInt serialization not relied upon. Max int64 survives JSON and worker round-trips exactly. Float 1 stays f64 after stringify. Wrong payload types and unsupported tags fail without stringify fallback. |
| Python | `True` cannot pass as int64; `1.0` cannot pass as int64; string `"false"` cannot pass as boolean. Typed oracle set keys distinguish bool/int/float; Python native equality cannot serve as canonical equality. |
| Deterministic order | Randomize input/rule/dictionary insertion order. Compare exact result order across engines. Include negative ints, 2 versus 10, float exponents, astral characters versus U+E000, and precomposed/decomposed Unicode. |
| Temporal behavior | Full signed-i64 clocks/endpoints in typed JSON, half-open boundaries, retraction, old knowledge cuts, corrected assertions, reopen, rollback and receipt identity. Values and clocks must use distinct validation paths. |
| Migration | Empty v1, mixed legacy spellings, retracted history, duplicate EAV assertions with distinct IDs, fail-before/fail-during/fail-after-switch injection, rollback/retry, idempotent reopen, old-code refusal, unknown/corrupt version refusal. |
| C ABI ownership | Multi-input scalar batches, a second list at nonzero offset, empty lists, chunk/vector boundaries, output growth, string lifetimes and null-mask writes. No stale data pointers after reserve; no partial results on errors. |
| Bounds | Existing program/row/fact/work/round/string caps still fire. Add typed dictionary and total output allocation checks; a numeric-only workload must not bypass budgets. |

For a pure SQL oracle, compare matching tags and the **selected same-typed payload**. Explicit tag guards plus a CASE on matching tag avoid mixed scalar coercion. Ordering should use tag first and correctly typed payload columns with explicit null ordering. Full STRUCT DISTINCT is only a secondary check after shape canonicalization, not a substitute for independent semantics.

Useful metamorphic properties: input permutation invariance; duplicate-fact idempotence; adding an unrelated tag cannot create a cross-tag join; every typed export/import preserves canonical value; canonical equality implies the same intern/hash key; row sorting is antisymmetric/transitive and compares equal exactly when typed rows are equal; migration preserves all legacy snapshot projections. Resource failures should leave the persisted clock, receipts and facts unchanged, except already-documented lost-ack cases after a committed budget observation.

## Measured exploratory probes and limits

These probes test existing language/SQL transport behavior, not proposed implementation correctness:

- `probes/duckdb-tagged-struct.json`, supplied by the parent investigator, records DuckDB 2.0.0 preserving explicit tag/selected-payload structs containing max int64, subnormal and negative zero, with four tag-distinct rows retained. Its exact SQL reproduces both `1 = true` and `1 = '1.1'` as true. This researcher inspected the result and the parent's `probes/duckdb_boundary_probes.py`; the parent ran it against a disposable in-memory database.
- `probes/duckdb-migration-ddl.json`, from the same parent probe, records a constrained shadow-table copy/drop/rename and version-table rebuild. ROLLBACK restored the original schema/row/version; COMMIT preserved its string tag, fact ID, intervals and receipt. It also establishes that ADD COLUMN with `UTINYINT DEFAULT 1 NOT NULL` works on this pinned runtime. The minimal fixture is not the complete production/prototype migration or a reopen/crash test.
- `probes/python-language-semantics.json` records Python 3.12.14: `{True,1,1.0}` has size 1; explicit tagged equivalents have size 3; float conversion of max int64 collides with the out-of-range next integer. The nontransitive epsilon example is reproduced.
- `probes/js-language-semantics.json` records Node 24.22.1: bare JSON max-int64 parses as a Number whose exact integer is `9223372036854775808`, not the intended maximum; tagged decimal-string round-trip is exact; raw BigInt JSON stringify throws; nonfinite Numbers stringify as null.
- A deterministic 1,024-value finite binary64 corpus (`probes/float-json-corpus.json`, seed 20261030, including edge values) had zero Python-JSON-to-JS bit mismatches. JS JSON round-trip changed only negative zero, exactly the proposed normalization. This finite sample is evidence, not proof for all binary64 values or for the C++ decimal parser.

The standalone probe sources are `probes/language-semantics.py` and `probes/language-semantics.mjs`; their exact run order, runtime versions and scope are recorded in `probes/README-language-semantics.md`. Both were rerun successfully after saving their sources.

No native implementation, migration or browser implementation test was run here. No full verification/benchmark suite was rerun, and no performance improvement is claimed.

## Performance experiment before accepting the change

Measure v2 all-string versus the unchanged v1 path, then boolean-heavy, low-cardinality repeated integers, high-cardinality int64, float/subnormal and mixed-type workloads. Include typed selective joins, recursion, mostly-invisible history and large outputs within the existing admitted limits. Record dictionary cardinality/bytes, tuple count/cells, input list construction, native ingestion, evaluation, output conversion, end-to-end latency and peak memory separately.

The STRUCT adds nullable child vectors and larger result carriers; keeping ID-based joins does **not** make that boundary cost free. Compare SQL/native paths with identical snapshot and output charges. Prefer native typed columns over parsing numeric strings in the kernel. Avoid an epsilon lookup or conversions inside every candidate match. Any claimed speedup needs repeated paired measurements against the same data, compiler/runtime, limits and exact typed checksum; exclude correctness canonicalization from timed regions only when the measurement label says so.

## Handoff gate

Before iteration 1 is considered implemented, the owner should approve/record the concrete contract above, verify current candidate hashes, add the typed core and v2 boundaries without breaking v1, and pass the adversarial matrix with independently computed expectations. Only then evaluate performance regressions. No untested reference/date/null or Triplex-family behavior should be advertised to close the roadmap item.

## Inspected source hashes

```text
470bb3c29392637e57ae61b3faaea6557874a79834b3b748510e2fd8594dad24  engine/src/temporal_core.cpp
870f946e1128fc109c1e3242cc0695fc01a5894eba67864dd14bd374b24c6658  engine/src/temporal_core.hpp
8367119bf605e1e0499bc2e206dd06d6582ef3b2f8d4b34bbb00d0bf997176a4  engine/src/temporal_datalog.cpp
67e06664208b554ad3ed9b56268ca2967711f651123e951ecce8602634e843a6  storage/schema.sql
de9a29a9c8128f99d3fddaa198482ed804a1b7edaf1479a5faf0dbcb3e16d13f  storage/store.py
512f272bd3f5dff7940df4f7314c170293ac9fd9a501ed002f18ac9f3eccc2a1  site/dist/engine.js
```

All external technical sources linked above are primary specifications, project documentation or original research. They were browsed fresh on the research date; no third-party tutorial or search-result snippet is used as technical authority. The Foundations of Databases chapter 12 URL timed out; this memo relies on successfully retrieved chapter 13 and Green et al. for the relevant theory instead. One optional lookup of `https://pubs.opengroup.org/onlinepubs/9799919799/functions/strtod.html` returned HTTP 403 through the web tool; it was not bypassed or used as evidence. No access restriction blocked the research deliverable.
