# Typed values performance and storage investigation

Research for roadmap iteration 1, 30 October 2026. This is an engineering decision memo for the implementation owner, not a statement that typed values have shipped.

## Recommendation

Preserve the current 32 bit tuple IDs and query local interner. Add a versioned, strict tagged value domain behind those IDs. Prefer an explicit tagged `STRUCT` at a new SQL function boundary, and typed payload columns in persistent storage. Keep the existing string shaped `td_query` interface and migrate every existing value to the string tag without interpreting its contents.

The initial domain should be exactly string, boolean, signed int64, and finite binary64. Make integer `1`, floating `1.0`, boolean `true`, and string `"1"` four different values. Normalize floating negative zero to positive zero before interning, hashing, persistence, and return. Reject null values, references, dates, timestamps, decimal, binary, containers, NaN, and infinities rather than guessing a conversion. Existing temporal metadata remains a separate concept; deferring timestamp *values* does not remove the store's TIMESTAMPTZ metadata.

For the initial implementation, an owning `std::variant` dictionary key is a reasonable clarity first choice. A split dictionary with compact tagged reverse entries is an actionable alternative if its ownership and memory accounting remain simple. Do not put variants or full tagged objects into every tuple, hash set, index, and intermediate binding. The isolated experiment below supports investigating compact dictionaries, but does not establish a native query speedup or a universal memory saving.

## Scope and provenance

I inspected the existing candidate at `/tmp/temporal-datalog-20261030`, including the C++ core and stable C binding, vendored headers, Python schema/store/tests, browser engine/UI/worker/tests, and benchmark harness/evidence. No prototype source, Page, Git object, user computer, or Codex task was changed. New files are restricted to this memo and the adjacent `performance-probes` directory. The parent owns durable preservation and implementation coordination.

The roadmap explicitly requests tagged values through literals, interning, joins, hashing, ordering, persistence, and returned results, plus lossless large integers and legacy string migration. It does not require reference/date/timestamp/null support in this iteration. Roadmap (private application reference omitted).

Observed source hashes at inspection:

| File | SHA256 |
| --- | --- |
| `engine/src/temporal_core.cpp` | `470bb3c29392637e57ae61b3faaea6557874a79834b3b748510e2fd8594dad24` |
| `engine/src/temporal_core.hpp` | `870f946e1128fc109c1e3242cc0695fc01a5894eba67864dd14bd374b24c6658` |
| `engine/src/temporal_datalog.cpp` | `8367119bf605e1e0499bc2e206dd06d6582ef3b2f8d4b34bbb00d0bf997176a4` |
| `storage/schema.sql` | `67e06664208b554ad3ed9b56268ca2967711f651123e951ecce8602634e843a6` |
| `storage/store.py` | `de9a29a9c8128f99d3fddaa198482ed804a1b7edaf1479a5faf0dbcb3e16d13f` |
| `site/dist/engine.js` | `512f272bd3f5dff7940df4f7314c170293ac9fd9a501ed002f18ac9f3eccc2a1` |

The existing native binary loaded for the read only semantic probes was SHA256 `62c9f24e3f8951771ff0f7ceae7dd255843885b203c818bb53e3c232baa45662`. DuckDB 1.4.3 and 2.0.0 were already locally available; no dependency was installed or downloaded.

## What the current implementation makes cheap and expensive

The current core already has the right hot representation for strict typed unification: `Id = uint32_t`, eight inline ID slots per tuple, ID keyed column indexes, ID equality in repeated variable joins, and tuple hash/set operations over IDs. Only the dictionary and conversion boundaries need know the payload type. Replacing these IDs with 16 byte values would quadruple the tuple value slots from 32 to 128 bytes at arity eight, before arity/alignment and container overhead. The measured owning variant on this GCC/libstdc++ build is 40 bytes; placing eight such variants inline would be still larger.

The present interner stores one owned string in `unordered_map<string,Id>` and reverse pointers to its keys. The current string pointer design is sound under insertion and rehash when keys are not erased: the standard distinguishes reference/pointer stability from iterator invalidation. The typed equivalent must preserve that ownership property, not point into a growing `vector<Value>` or temporary parser token. [C++ unordered container requirements](https://eel.is/c++draft/unord.req.general).

The existing `engine/PERFORMANCE.md` reports a diagnostic 25,256 fact round02 profile with approximately 0.010 ms parse, 11.205 ms EDB load, and 1.943 ms solve. It explicitly labels this native only, not end to end; its sampled attribution is qualitative. This supports investigating conversion and interning without inventing a solve bottleneck. The final benchmark also already includes SQL `list(struct_pack(...))` construction and result fetch. Those costs must remain visible.

There is independent precedent for narrow dictionary IDs in relational operators. RDF 3X translates literals to IDs, operates on ID triples, and decodes at the output boundary; it also observes that dictionary decoding is nontrivial for large results. This is a representation precedent, not evidence that this prototype will inherit RDF 3X's performance. [Neumann and Weikum, RDF 3X](https://www.vldb.org/pvldb/vol1/1453927.pdf). Soufflé likewise stores symbol ordinals in relations and looks up text when needed. [Soufflé symbol and record tables](https://souffle-lang.github.io/implementation).

## A semantic contract that keeps the interner correct

### Equality and hashing

Use semantic equality `same tag AND same normalized active payload`. No automatic bool/int, int/float, or string/number unification. Apply exactly that relation to literals, incoming facts, dictionary lookup, EDB/IDB deduplication, repeated variables, recursion, output deduplication, and oracle keys.

For finite floats, use exact binary64 value equality, not an epsilon. Epsilon equality is generally nontransitive and is unsuitable as the equivalence relation for a hash set. Under the recommended zero policy, the two zero bit patterns must normalize to the same stored bits. All other finite binary64 values can use their exact bit pattern as an intern key, obtained with `memcpy` in C++17. Assert binary64 assumptions in production code. Never hash a whole tagged struct with `memcmp` or include inactive union bytes/padding.

The invariant is one way: equal values must hash equally; unequal values may collide and must still undergo equality checks. Hash the tag plus normalized payload, or keep separate typed maps with a shared ID allocator. Ordinary hash values and assigned IDs are not durable serialized identities. These requirements follow the standard's key equivalence/hash contract. [C++ unordered container requirements](https://eel.is/c++draft/unord.req.general).

If maps are separate, use a common value ID namespace. String entity/attribute terms and string values must enter the same semantic string domain so that `triple(?x,'edge',?x)` still works. A value ID of zero in a string table cannot accidentally compare equal to zero in an integer table. A typed reverse table supplies the tag and payload for each globally unique local ID.

### Numeric boundaries

Int64 spans `-9223372036854775808` through `9223372036854775807`; do not first parse through `double`. Preserve a distinct float tag for values such as `1.0` even when they print as `1`. Do not use `std::to_string(double)` as an identity encoding: its usual fixed precision is not injective over binary64 values.

Specify lexical grammar and conversion separately. Use full token consumption and checked conversion; integer overflow, trailing junk, nonfinite float overflow, and unsupported syntax are errors. `std::from_chars` provides explicit error and consumed range results and locale independent numeric parsing. Its leading sign and floating format rules still require a language grammar around it. Decide and test underflow policy explicitly; a defensible initial choice is to reject nonzero decimal literals that underflow to zero while retaining representable subnormals. Do not reject every subnormal merely because a different conversion routine reports an underflow condition. [C++ numeric input conversion](https://eel.is/c++draft/charconv.from.chars).

The saved GCC 14.2 C++17 probe confirms that `5e-324` parses to the smallest subnormal, both int64 endpoints parse exactly, overflow/underflow return an out of range error while leaving the destination unchanged, and `NaN`/`Infinity` can parse successfully but are nonfinite. Thus testing only `isfinite(destination)` after conversion is insufficient: check the error and complete consumption first. `1junk` consumes only its first character, and the two distinct doubles `0.10000001` and `0.10000002` both become `0.100000` under this target's `std::to_string`. Evidence: `performance-probes/numeric_probe.cpp` and `numeric-probe.jsonl`.

No cross type coercion is needed for iteration 1. That avoids the difficult boundary where converting INT64_MAX to binary64 produces `2^63`. If iteration 2 later adds casts or mixed numeric operations, it needs checked, separately specified semantics; a cast back to int64 must never be attempted until the double is within the valid half open integer range.

DuckDB itself permits NaN and infinity, and its NaN equality differs from ordinary C++/JavaScript numeric equality. The project must actively reject those values at every ingress rather than inherit DuckDB's larger domain. `isfinite` is available in SQL and `std::isfinite` in the native path. [DuckDB numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric), [numeric functions](https://duckdb.org/docs/2.0/sql/functions/numeric).

### Ordering

Define an explicit tag rank, for example string, boolean, int64, float64, then order within a tag by UTF8 byte sequence, false before true, signed integer value, or finite numeric float value. Compare tuples lexicographically with this comparator. Type rank is a deterministic presentation order, not a claim that strings are mathematically less than numbers.

Never sort by insertion ID, raw serialized text, integer subtraction that can overflow, or untransformed float bits. Canonical numeric text is not generally order preserving (`10` versus `2`, negative signs, and exponents). ID assignment changes with input order. Normalize zero before ordering so comparator equivalence agrees with equality. Strings should preserve the existing exact UTF8 behavior; do not silently introduce locale collation or Unicode normalization.

Keep this result ordering separate from the question of whether cross type *comparison expressions* are legal. A deterministic display sort does not authorize an expression such as string less than integer.

## Representation choices and tradeoffs

| Choice | Benefit | Cost and correctness risk | Recommendation |
| --- | --- | --- | --- |
| Full `variant<string,bool,int64,double>` in every tuple | Direct typed access | Wide tuples and copied strings multiply through rows, seen sets, pending sets, and bindings | Do not replace hot tuple IDs |
| Variant dictionary key with ID tuples and reverse pointers | Simple tagged ownership; strict type distinction is easy to audit | Wide dictionary nodes; formatting only at output; float normalization still required | Reasonable clarity first implementation |
| Split typed maps plus a tag/payload reverse table | Strings retain the existing owned key path; numeric equality/hash avoids formatting; reverse entries measured 16 bytes | Multiple maps and dispatch; more reverse table bytes than pointer only designs; not automatically lower memory | Consider if implementation remains small; benchmark actual query path |
| Canonical tagged string dictionary key | Reuses string hashing/ID machinery; can be fully correct with injective encoding | Formatting/temporary copies on every input; numeric operations require decoding; textual ordering is wrong; legacy prefix collisions if strings are not themselves tagged | Valid bounded alternative, not a free performance optimization |
| DuckDB `UNION` | Native tagged SQL type and tag first ordering | Struct based physical representation, API/client conversion caveats, member casts and schema evolution | Useful SQL option, but not necessary for the initial stable C boundary |
| Tag plus separate typed SQL columns or explicit `STRUCT` | Native numeric predicates, explicit schema, familiar stable C vector access | Multiple child vectors and nullable inactive payload columns | Preferred initial boundary/storage design |
| Persist every value in a hand managed ID dictionary | Cross fact dictionary IDs and possible reuse | More transactional tables/FKs, allocation/version coordination, output joins, and migration complexity; duplicates DuckDB compression work | Defer unless end to end evidence justifies it |

For canonical strings, tag **all** values, including strings: a user string `"i:1"` must not collide with integer `1`. A robust key can use a string tag plus unmodified string bytes, a bool tag plus 0/1, decimal int64, and normalized float bits in fixed hexadecimal. A shortest round trip float representation is another possible encoding, but its canonicalization must be pinned. Display strings are not a value model.

Global persistent dictionaries introduce synchronization and recoding concerns beyond this feature. Gubner, Leis, and Boncz analyze both narrow hot hash records and the maintenance difficulties of global dictionaries, and propose bounded query wide string sharing instead. The relevant inference here is to preserve local IDs and keep payloads cold, not to implement their specialized storage or borrow their speedup numbers. [Optimistically Compressed Hash Tables and Strings in the USSR](https://ir.cwi.nl/pub/30820/30820.pdf).

## Controlled dictionary experiment

The adjacent original C++17 probe compares canonical tagged string keys, owning variant keys, and split maps with 16 byte tagged reverse entries. All three retain `uint32_t` tuple IDs and agree on complete emitted keys and ID sequences. Keys use `s:` plus raw string bytes, `b:0/1`, exact int64 decimal, and `f:` plus 16 normalized binary64 hex digits. This is an experiment on those concrete implementations, not all possible canonical encodings.

The balanced version removes avoidable numeric formatting temporaries using stack buffers and `to_chars`, and adds short strings/small integers to the original long string/large integer workloads. Each process runs 60,000 inputs per case, two unmeasured warmups, and 21 measured repetitions; candidate order rotates cyclically. The same binary ran in two separate processes. Input generation and full validation occur outside timing. Each timed run constructs one dictionary, interns every input once, emits one canonical string per distinct value once, and destroys the dictionary once. Output vector destruction, DuckDB list construction, native parsing/joins, SQL execution, and client fetch are not measured. There is no precomputed typed key cache hidden outside the canonical string candidate's timed path.

Allocation counters count cumulative calls and requested bytes for `new`, not current or peak memory. They add no allocation header and use identical instrumentation for every candidate. They do not count allocator fragmentation, stack/inline storage, or all process memory. Environment: GCC 14.2, C++17 `-O3 -DNDEBUG`, Linux x86 64, AMD EPYC 9V74 shared host; full settings and hashes are retained.

Balanced total median milliseconds, first process / independent process replication:

| Case | Distinct values | Canonical string | Variant key | Split tag and payload |
| --- | ---: | ---: | ---: | ---: |
| Repeated long strings | 6,000 | 8.690 / 7.852 | 5.799 / 4.831 | 5.058 / 4.326 |
| Repeated short strings | 6,000 | 3.681 / 3.683 | 2.334 / 2.361 | 2.227 / 2.244 |
| Repeated mixed values with large integers | 18,006 | 12.271 / 10.166 | 8.590 / 6.945 | 7.484 / 6.908 |
| Repeated mixed values with small integers | 18,005 | 5.432 / 6.134 | 3.853 / 4.293 | 3.331 / 3.651 |
| Mostly unique mixed values | 53,999 | 33.285 / 32.778 | 30.359 / 34.878 | 26.008 / 25.371 |

Interpretation:

- This narrow experiment supports avoiding repeated text encoding on the intern path and retaining compact hot IDs. It does not justify a native versus SQL speedup claim.
- Variant versus canonical string total latency **reverses** between processes for mostly unique mixed input. Output formatting and teardown matter; build only numbers would overstate the benefit of typed keys.
- Split maps perform favorably in these runs, but their extra maps/reverse storage do not guarantee a memory saving. On the short string case, cumulative requested bytes are about 1.189 MB for split, 1.106 MB for variant, and 1.058 MB for canonical strings. On repeated large mixed values they are 3.830 MB, 3.683 MB, and 5.304 MB respectively. These are requested allocation totals, not peak footprints.
- These are synthetic values and one standard library/allocator/compiler combination. The fixed hexadecimal float key is intentionally exact, but not a benchmark of every shortest decimal encoding. Existing string only core performance was not measured against a changed engine here.

All 630 balanced measured records passed exact ID/output checks. Separate address/undefined sanitizer execution passed 15 small measured cases with empty stderr. LeakSanitizer failed with the runtime's explicit ptrace incompatibility; it is **not verified**. The original unbalanced experiment is retained as historical diagnostic evidence and is not silently substituted for the balanced results.

Primary methodology support: benchmark tools distinguish warmup, repetitions, memory instrumentation, and observable outputs; performance research emphasizes uncertainty in effect sizes and multiple nondeterminism sources. Here, full raw repetitions and an independent process run are preserved rather than implying certainty from one median. [Google Benchmark guide](https://google.github.io/benchmark/user_guide.html), [Kalibera and Jones](https://arxiv.org/abs/2007.10899).

### Artifacts and reproduction

Use `performance-probes/dictionary_probe_balanced.cpp`, `dictionary-balanced-results.jsonl`, `dictionary-balanced-replication.jsonl`, `dictionary-balanced-summary.json`, `dictionary-environment.json`, sanitizer logs, and `SHA256SUMS`. The source is a standalone diagnostic, not an implementation patch. Durable storage needs the sources, JSON/JSONL, memo, manifest, and relevant logs; the local sanitizer binaries are not necessary deliverables.

```sh
cd /tmp/temporal-roadmap-research/iteration-01/performance-probes
g++ -std=c++17 -O3 -DNDEBUG -Wall -Wextra -Werror \
  dictionary_probe_balanced.cpp -o dictionary_probe_balanced
./dictionary_probe_balanced 60000 21
```

## SQL boundary and stable ABI

### Explicit tagged STRUCT

A recommended logical value shape is:

```sql
STRUCT(tag UTINYINT, s VARCHAR, b BOOLEAN, i BIGINT, f DOUBLE)
```

Use a fixed versioned tag mapping and exactly one nonnull active payload; every inactive payload is NULL. The value struct itself and its tag are nonnull. Version the value contract with a new function/result envelope and persistent schema metadata, rather than interpreting existing strings as encoded values. A suitable new function name might be `td_query_typed_v1`; the exact name is an implementation decision. Keep legacy `td_query`'s input, parser contract, return shape, NULL list handling, and counters intact.

The outer fact can retain string `e/a` and use the typed struct for `v`; general rule terms and returned positions still need the same typed domain. References are not introduced merely because string IDs look like entities. A returned relation must retain tags for *every* position, including literals and strings copied from `e/a`.

The vendored v1.4.3 `duckdb_extension.h` places type construction, `duckdb_struct_vector_get_child`, list sizing/reservation, vector validity access, and scalar registration in its stable v1.2.0 prefix. `duckdb_create_union_value` and newer binding/selection functions are in unstable only sections. An explicit struct/list return therefore needs no new C ABI, unstable flag, C++ DuckDB link, or v2 API. The official extension template distinguishes stable and unstable extension C functionality, while current DuckDB 2.0 documentation still labels the revamped v2 API unstable. [Official C extension template](https://github.com/duckdb/extension-template-c), [DuckDB C API overview](https://duckdb.org/docs/2.0/clients/c/overview), [pinned extension header](https://github.com/duckdb/duckdb/blob/v1.4.3/src/include/duckdb_extension.h).

Read child vectors through documented struct/list access. Validate the parent, tag, active child, and every inactive child's validity. Output must set active validity and clear inactive validity for every cell, including reused chunk slots. Reserve nested lists before taking data/validity pointers, and reacquire pointers after reserves that may resize buffers. Do not read inactive payload memory. The documented C vector API explicitly separates struct validity from child validity and requires refreshed pointers after list reservation. [DuckDB C vectors](https://duckdb.org/docs/2.0/clients/c/vector).

Changing the SQL signature is an application API migration, even if the binary ABI stays at C_STRUCT v1.2.0. A new typed function avoids overloading empty lists/NULL ambiguously and prevents silently changing existing Python/browser consumers.

### Why UNION is not automatically a smaller or safer boundary

DuckDB `UNION` is a tagged sum type with tag first comparison, but it is physically implemented with struct child vectors, not a packed C union. SQL member casting and ordering are defined; implicit casts can select a member, so callers still need explicit types. The documented C struct accessor is a firmer public contract for an actual struct than for reaching through a union's internal layout. The source does expose physical struct entries, but that does not require this project to adopt an extra representation dependency. [DuckDB union type](https://duckdb.org/docs/2.0/sql/data_types/union), [execution format](https://duckdb.org/docs/1.5/internals/vector).

Real in memory probes on **both** local DuckDB versions show that fetching union values into Python returns the bare payload (`'1'`, `True`, `1`, `1.0`) without the discriminator. An explicit struct fetch retains `{'tag':2,...,'i':9223372036854775807,...}`. Python types can distinguish some of those payloads, but ordinary Python equality and sets conflate `True`, `1`, and `1.0`; explicit tags must remain part of results and oracle keys. See `duckdb-semantic-1.4.3.json` and `duckdb-semantic-2.0.0.json`.

### Do not inherit SQL comparison casting

DuckDB's combination casting is more permissive than ordinary implicit function argument casting and applies to comparisons, set operations, and nested constructors. Therefore a SQL route must compare tag plus the matching typed payload, or canonical validated structs of the exact same declared shape; it must not rely on bare mixed scalar equality or an inferred heterogeneous list. [DuckDB typecasting](https://duckdb.org/docs/2.0/sql/data_types/typecasting).

The saved probes confirm the following on 1.4.3 and 2.0.0:

```text
true = 1                                           -> true
1 = '1'                                            -> true
[true, 1::BIGINT]                                   -> BIGINT[] [1,1]
9007199254740993::BIGINT = 9007199254740992::DOUBLE   -> true
9223372036854775807::BIGINT = 9223372036854775808::DOUBLE -> true
```

The existing string `td_query` correctly rejects facts with native BIGINT, BOOLEAN, DOUBLE, or DATE value fields at binding unless the caller explicitly converts them to the declared string shape. Preserve that behavior. A typed boundary can validate the canonical typed values it receives, not recover a type or precision the caller already discarded with an explicit SQL cast.

## Columnar execution and the remaining materialization cost

DuckDB normally processes fixed size vector batches, commonly 2,048 tuples, and can retain dictionary/constant encodings internally. Its string descriptor is 16 bytes on this target, with at most 12 inline string bytes. Structs have child vectors; lists add offset/length entries. Those are materially different from boxed C++ per row values. [DuckDB execution format](https://duckdb.org/docs/1.5/internals/vector).

The pinned 1.4.3 C scalar wrapper flattens input before invoking the callback. Its vector implementation recursively flattens struct/list children. The present extension then traverses each materialized fact list, copies `e/a/v` into `std::string`, interns them, solves, copies output strings into `Result`, and copies them again into DuckDB output. With one aggregate list, the callback may have one scalar row containing tens of thousands of facts; being passed a DataChunk does not make the private Datalog evaluator a streaming vectorized fact operator. [Pinned C scalar wrapper](https://github.com/duckdb/duckdb/blob/v1.4.3/src/main/capi/scalar_function-c.cpp), [pinned vector implementation](https://github.com/duckdb/duckdb/blob/v1.4.3/src/common/types/vector.cpp).

An explicit typed struct can reduce numeric text parsing, hashing, and heap strings, but adds tag and payload vectors. A useful uncompressed descriptor model on this target is 80 bytes per old seven field fact versus 98 bytes per fact with a five child tagged `v`, excluding validity masks, nested/list bookkeeping, string heaps, allocator overhead, and any compression/constant sharing. This is an explanatory width estimate, not measured resident memory. Sparse inactive columns may compress well in persistent storage, but that is not a guarantee that flattened callback input is equally small.

Do not expect typed values alone to fix native scan/join losses. Keep SQL materialization, snapshot predicates, output serialization, and client fetch charged to the appropriate path. SQL first planning belongs to the later iteration. Merely changing a scalar into a table function that still takes a materialized LIST does not remove input materialization, and introducing callback reentrant SQL/IO would violate the current engine boundary.

Potential later cleanup is an output path that sorts/returns IDs and emits typed payloads while the engine dictionary is alive, avoiding a second owned string copy. Do not return dangling references or make that optimization a prerequisite to correct typing. Similarly, zero copy input string views need proven lifetime across parser temporaries and vector ownership; the existing owned key interner is safer initially.

## Persistent type design and migration

Prefer physical columns `v_tag`, `v_s`, `v_b`, `v_i`, `v_f` or a validated equivalent struct, leaving entity/attribute strings and all temporal/commit fields unchanged. Separate columns are straightforward for parameterized inserts, scalar comparisons, and later SQL predicate planning. Add constraints that the tag is known, the active payload is nonnull, every inactive payload is NULL, and floating payloads are finite. Write the constraints with explicit `IS NULL`/`IS NOT NULL` logic; an UNKNOWN SQL CHECK result must not admit a malformed value.

Correct physical types matter for query processing; storing numeric values as text imposes parse and string processing costs. DuckDB's storage already has type specific compression, including integer, string dictionary/FSST, and floating encodings, so hand building a persistent dictionary is not automatically a space win. Measure real persisted/checkpointed bytes separately from in memory query timings. [DuckDB schema guidance](https://duckdb.org/docs/2.0/guides/performance/schema), [storage format and compression](https://duckdb.org/docs/2.0/internals/storage).

Migration needs a real version dispatch before applying version specific DDL:

1. Read and validate the existing schema/version without first running new `CREATE TABLE IF NOT EXISTS` statements and assuming they alter old tables.
2. In one migration transaction, construct the version 2 table/constraints and copy every old row with string tag and original `v` bytes. Copy `fact_id`, entity/attribute, both intervals, logical commit positions, inserted/retracted timestamps, and receipt/clock tables unchanged.
3. Do not migrate by replaying `Fact` assertions through `transact`; that would create new fact IDs/commands, advance the logical clock, and destroy historical meaning.
4. Compare complete history and representative historical query answers before and after the swap. Test a failed migration followed by reopen and retry. Advance metadata atomically only after the new table is valid.
5. Keep schema migration version separate from the typed value model version. The current `td_schema_version` constraint literally requires `version = 1`, so `UPDATE ... SET version=2` cannot be the whole migration.
6. Retain the current single writer ownership and physical budget. Shadow copy/WAL space must fit the declared envelope or fail clearly; do not silently enlarge resource caps.

DuckDB documents transactional ALTER changes, but adding CHECK/FK constraints with ALTER and dropping constraints is not generally supported. A shadow table migration with the target constraints is safer than assuming a generic constraint replacement API exists. Compatibility of the native binary with DuckDB 1.4.3 does not imply a DuckDB 2.0 default storage file can be opened by 1.4.3. [DuckDB ALTER TABLE](https://duckdb.org/docs/2.0/sql/statements/alter_table), [storage version compatibility](https://duckdb.org/docs/2.0/internals/storage).

Legacy fixtures must include `"1"`, `"01"`, `"1.0"`, `"true"`, `"NaN"`, `"i:1"`, empty string, large integer looking strings, date looking strings, escapes, and Unicode. These remain strings, including numeric looking strings outside int64 range. Unsupported real value tags must fail rather than become such strings accidentally.

## Browser and JSON round trips

The browser needs explicit typed value envelopes, not inference from JSON primitive values. A workable transport convention uses a type tag plus a decimal **string** for every int64, a JSON boolean for bool, a JSON string for string, and a finite JSON number with an explicit float tag for binary64. Parse integer strings directly with `BigInt`, check int64 bounds, and keep their payload as strings at JSON boundaries. This preserves the independent oracle while avoiding a lossy custom JSON parser.

JavaScript Number cannot distinguish every integer beyond `2^53-1`; the specification explicitly describes adjacent large integers sharing a Number value. A raw JSON number is already rounded by the time a validator sees it. A declared safe integer subset could reject such numbers, but it must never claim full int64 support. [ECMAScript Number safe integer definition](https://tc39.es/ecma262/2026/multipage/numbers-and-dates.html#sec-number.max_safe_integer).

The saved Node 24.22.1 probe confirms `JSON.parse('9223372036854775807')` prints `9223372036854776000`, while a tagged decimal string round trips exactly through BigInt. `JSON.stringify({type:'float64',value:1.0})` emits payload `1` but the explicit float tag preserves its type. Negative zero serializes as `0`, matching the recommended normalization. Bare BigInt serialization throws, and NaN/infinity would stringify as null; reject nonfinite values before serialization. [ECMAScript JSON serialization](https://tc39.es/ecma262/2026/multipage/structured-data.html#sec-serializejsonproperty). Evidence: `javascript-semantic.json`.

Do not use object identity, JS `===` over untagged numbers, or raw BigInt in `JSON.stringify(row)` for tuple keys. Canonical tuple keys must include tag and normalized payload. Keep the browser's naive fixpoint evaluation strategy independent; share fixtures and semantic contracts, not the native join implementation.

## Concrete implementation touchpoints

Line references are to the inspected source hashes, not promises about a later working tree.

| Location | Necessary change or hotspot |
| --- | --- |
| `temporal_core.hpp:16-20,29-31` | Result rows and ingestion currently expose strings only; add typed API without breaking legacy ownership/lifetime |
| `temporal_core.cpp:26-67` | Keep compact tuple IDs and existing tuple hash; no full values in hot tuples |
| `temporal_core.cpp:107-112,159-171` | String interner/reverse key pointers and string byte accounting become typed interner/value accounting |
| `temporal_core.cpp:184-221` | Parser terms currently permit only quoted strings; add checked typed literals with tags, leaving quoted text unchanged |
| `temporal_core.cpp:255-263` | Validate typed fields, including invalid inactive facts before snapshot exclusion as the full input contract requires; intern active typed triples |
| `temporal_core.cpp:272-325` | Existing ID binding and indexed probes should stay type agnostic; strict distinction must already be encoded in IDs |
| `temporal_core.cpp:367-379` | Typed decode/output byte counts and explicit semantic tuple ordering replace string only output sort |
| `temporal_datalog.cpp:21-28,52-64` | Cache typed child data/validity pointers outside the fact loop; avoid forcing every numeric payload through `string_at` |
| `temporal_datalog.cpp:68-89,112-128` | New typed result/fact logical types, correct nested reservations/validity, finite payload validation, and separate typed function registration |
| `storage/schema.sql:4-8,23-37` | Version constraint and text value column need atomic migration plus typed invariant checks |
| `storage/store.py:34-52,77-83,114-139` | Fact model, typed wire schema, history shape, exact Python type validation; bool is a subclass of int, so retain exact type checks |
| `storage/store.py:185-195,242-257,320-325` | Version dispatch, typed query/list assembly, parameterized typed inserts, migration transaction |
| `site/dist/engine.js:16,22-25,34-40` | Literal parse, fact validation, symbol/key budgets, strict tagged equality, tuple keys, output ordering |
| `site/dist/app.js:43-45` | Current form coerces every value with String; JSON editor and result rendering need explicit type controls and lossless envelopes |
| `site/dist/query-worker.js:1-2` | Worker transport must round trip typed envelopes without bare BigInt JSON serialization |
| `bench/bench.py:28-87,117-190,354-371` | String only schema, Fact, canonicalizer, oracle sets, SQL joins, checksum and fetch conversion need a versioned typed path |
| Native/storage/browser tests | Add shared fixtures but retain independent evaluation; existing correctness counts are not new typed coverage |

Numeric values must consume dictionary/output resource budget too. Counting only string bytes would let all numeric data bypass newly relevant byte limits. Keep distinct value count bounds and account fixed tag/payload costs; do not describe this as complete whole process memory accounting. Full allocator/cancellation work remains iteration 6.

## Measurement and testing gates before calling iteration 1 done

1. **Value laws:** generated equality reflexivity/symmetry/transitivity, equal implies equal hash, comparator transitivity/equivalence, literal versus fact interning, and collision handling. Include zero normalization and many finite float bit patterns.
2. **Numeric boundaries:** both int64 endpoints and overflows; `2^53-1`, `2^53`, `2^53+1`; bool/string/int/float printed alike; subnormals, largest finite float, overflow and underflow, alternate decimal spellings of the same binary value, negative zero, NaN/infinity rejection, and close floats that default decimal formatting would collapse.
3. **Relational semantics:** repeated variable matches across typed entity/value positions, typed literal heads, duplicate assertions/derivations, joins, mutual and nonlinear recursion, shuffled physical input, empty results, and both temporal boundaries. Unsupported payloads cannot hide in an inactive fact row on the full native input path.
4. **ABI and clients:** the same new artifact must LOAD/evaluate on both promised runtimes. Test constant and nonconstant typed inputs, empty and NULL lists under the declared contract, all payload kinds, malformed tags/validity, and more than 2,048 scalar invocations to cross callback chunks. Verify every cell's inactive validity after reuse. Existing v1 tests must remain intact.
5. **Round trip:** native SQL struct to Python to JSON to browser worker and back, preserving tag and payload exactly. Expected keys must be tagged; do not let Python `set` or JS Number coalesce values before comparison. Use explicit finite bit expectations where exact float identity matters.
6. **Migration:** disposable v1 histories with assertions, corrections, retractions and receipts; migrate/reopen twice; compare complete history and historical snapshots; inject failure before metadata commit and verify rollback/retry. Keep unsupported versions and partial schemas fail closed. A successful migration test is not crash recovery certification.
7. **Regression and cost attribution:** rerun the 14 legacy workloads with unchanged answers/counters, then typed cases varying type proportions, string length, duplicate ratio, cardinality, input history versus active fraction, output arity, and output volume. Include the SQL list and complete fetch. Measure parse, list construction, interning, solve, typed output, and serialization separately only as labeled diagnostics.
8. **Memory and acceptance:** measure process peak memory in separate candidate processes, not the cumulative high water of a process that ran all candidates. Keep settings/hashes/raw samples and an independent process replication. Profile separately from timings. Do not call the feature faster on the basis of these dictionary probes or one near tie. Correctness is mandatory; a measured cost increase can be reported honestly rather than hidden by dropping materialization/output work. [DuckDB profiling](https://duckdb.org/docs/2.0/dev/profiling).

## Verification limits and remaining decisions

- No typed evaluator, new native signature, persistent migration, or browser UI was implemented in this research task; their tests are proposed gates, not passed tests.
- The implementation owner still needs to choose the exact literal grammar, new function naming, output envelope, tag numbers/rank, and underflow policy and write that contract before coding.
- LeakSanitizer is blocked by the runtime's ptrace incompatibility. Address and undefined behavior checks passed only with leak detection explicitly disabled. No access restriction was bypassed.
- The exact public v2.0.0 C scalar source path returned a GitHub 404. Source level flattening evidence is therefore pinned to 1.4.3; 2.0.0 observations here are real runtime probes, not an assertion that an unseen source file is identical.
- The current storage wrapper restricts databases to its prototype storage root. I did not alter that restriction or run migration tests outside its approved path; migration remains implementation work for the owner.
- The current model's caps and single owner/process contract remain in force. Typed values alone do not establish vectorized Datalog, SQL planning, untrusted service isolation, a Triplex adapter, or production scale.
