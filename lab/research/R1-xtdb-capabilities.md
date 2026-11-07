# R1: What XTDB 2.2.0 supports for an engine-idiomatic entity projection

**Scope.** Seven capability questions for adding one XTDB table per Triplex EntityType (one column per attribute, native `_valid_from/_valid_to` carrying business valid time, written in the same XTDB transaction as the `tx_assertions` ledger).

**Engine under test.** `ghcr.io/xtdb/xtdb:2.2.0` (digest `sha256:a6a426505b95...`). Source pinned at `references/xtdb` (tag v2.2.0, sha `c6c19623d90c658c15400fb46dc056f3735ed57b`), cited below as `path:line @ c6c1962`. Docs cited below are the copies in that same tree (`docs/src/content/docs/...`).

**Client under test.** npm `postgres` 3.4.9 (the driver in `packages/xtdb/package.json`), driven the way `packages/xtdb/src/XtdbClient.ts` drives it (`prepare: false`, `pool.typed(value, oid)` for every parameter, `SET AWAIT_TOKEN`, `COMMIT SYNC`).

**Run date.** 2026-11-07. Latest release on the GitHub releases page that day is v2.2.0, so "fixed in a later release" means "not released yet" everywhere below.

**Where the probes live.** Scripts and raw outputs are saved at `/Users/sam/Claude/Projects/triplex-db-2/R1-xtdb-probes/` (index in its `README.md`). Appendix B holds the load-bearing raw output inline.

**Reading the confidence labels.**

| Label | Meaning |
| --- | --- |
| High | Read in source at the pinned sha and reproduced against the 2.2.0 image |
| Medium | One of the two (source or probe), or probed on one data shape only |
| Low | Inference from docs or issues, no local reproduction |

**Timing caveat.** All timings come from a 2-CPU, 3 GB container in a Colima VM that other research containers shared at the same time. Treat them as orders of magnitude and compare ratios, not absolutes.

---

## Summary

| # | Question | Verdict in one line | Confidence |
| --- | --- | --- | --- |
| 1 | Client-set system time | Settable over pgwire, microsecond resolution, must be strictly later than the latest tx, and any abort, DDL or wall-clock tx moves that head, so exact `recordedAt` mapping is fragile | High |
| 2 | Valid-time DML | Full SQL surface including `PATCH`, `UPDATE/DELETE ... FOR PORTION OF VALID_TIME`, `ERASE`. `INSERT` replaces the whole document for its period. XTQL tx ops exist only in JVM clients | High |
| 3 | Columns and types | `:ns/attr` becomes column `ns$attr` (lowercased, lossy). Sets only via transit. Mixed-type columns go over the wire as JSON. `URI` columns cannot be selected. 8,001 columns in one row worked | High (wire), Medium (limits) |
| 4 | XTQL surface | All documented operators work through `XTQL (...)`. `union-all` parses but cannot be planned. Aggregate window functions fail with `AbstractMethodError`, open upstream, no fix released | High |
| 5 | Temporal reads and snapshots | Complete bitemporal read surface, plus snapshot tokens, await tokens and read-only transactions with fixed basis | High |
| 6 | Transactions and preconditions | Atomic across tables. `ASSERT` gives compare-and-set, failure code `P0004`, recorded in `xt.txs`. `METADATA` gives a queryable idempotency key | High |
| 7 | Performance at scale | About 10k rows/s ingest with small parameterised batches, `_id` lookup about 5 ms to 3M rows, any non-`_id` predicate is a column scan (about 0.27 s per million rows), no secondary indexes, about 200 bytes per row on disk for a 10-column row | Medium-High |

---

## Q1. Can a client set a transaction's system time over pgwire in 2.2.0?

**Verdict.** Yes. Four spellings work. The value must be strictly later than the latest completed transaction's system time, the resolution is one microsecond, and a violation aborts the transaction and moves the "latest completed" head forward. Mapping Triplex `recordedAt` onto native system time is possible only if nothing else ever writes to that database and every abort is accounted for.

**Evidence.**

*Syntax that worked (all probed, all committed on a fresh node):*

```sql
BEGIN READ WRITE WITH (SYSTEM_TIME = TIMESTAMP '2020-01-01T00:00:00Z');   -- grammar: Sql.g4:884-899
BEGIN READ WRITE, SYSTEM_TIME = TIMESTAMP '2020-01-03T00:00:00Z';
BEGIN; SET TRANSACTION READ WRITE, SYSTEM_TIME = TIMESTAMP '2020-01-02T00:00:00Z';
BEGIN READ WRITE WITH (SYSTEM_TIME = '2020-01-06T00:00:00Z');             -- plain string literal
```

- Grammar: `core/src/main/antlr/xtdb/antlr/Sql.g4:898` (`'SYSTEM_TIME' '='? txOptionValue # SystemTimeTxOption`).
- Docs: `docs/src/content/docs/reference/main/sql/txs.md:222-226`. Strictly later, each backfill tx gets its own time, a non-advancing time aborts the tx, and the abort is recorded in `xt.txs`.
- The JVM API spelling is `:system-time` (`docs/src/content/docs/reference/main/xtql/txs.md`, "Transaction options"). Not usable from Node.

*Constraint rules in source:*

- `core/src/main/kotlin/xtdb/indexer/TxResolver.kt:211-213`. With no explicit time the tx takes the log message timestamp, bumped to latest-completed plus 1 microsecond if that is not later. So even default system times are strictly increasing and no two transactions share one.
- `TxResolver.kt:215-229`. An explicit time that is equal to or earlier than the latest completed tx aborts with `invalid-system-time` / "specified system-time must be later than current tx". The comment cites issue #6086 (equal times make a read basis ambiguous).
- `TxResolver.kt:231`. The aborted transaction is recorded with the default (smoothed) time, so it still advances the head.
- `TxResolver.kt:235-246`. The effective system time also becomes the tx's `currentTime`, which is the default `_valid_from` and `CURRENT_TIMESTAMP`.
- Release note for v2.2.0-beta3 fixes #6086: before that, equal times were accepted. In the 2.2.0 image they are rejected (probe below).

*Probes:*

| Probe | Result |
| --- | --- |
| Times `2020-01-01T00:00:00Z`, `...00.000001Z`, `...00.000002123Z` in sequence | All committed. The nanosecond literal was truncated to `...00.000002Z` (stored `system_time` `2020-01-01T00:00:00.000002Z`), not rejected |
| Offset literal `2020-01-05T01:00:00+02:00` | Stored as `2020-01-04T23:00Z` |
| Equal to latest | `COMMIT SYNC` fails, SQLSTATE `08P01`, message `specified system-time must be later than current tx` |
| Earlier than latest | Same error |
| `ASYNC = true` plus a bad time | `COMMIT` returns normally. The abort appears later in `xt.txs` |
| Far future (`2099-01-01T00:00:00Z`) | Accepted. The next default-time transactions took `2099-01-01T00:00:00.000001Z`, `...000002Z` (head + 1 microsecond) |
| Rows written at a far-future system time | Invisible to default queries, because default valid time is `now` and the default `_valid_from` equals that future system time. `SELECT _id FROM t1` returned 8 of 11 rows. `xt.txs` also hid its own future-dated rows until `FOR ALL VALID_TIME` |
| Three consecutive bad times at the head `2099-...000002Z` | Each abort took the next microsecond (`...000003Z`, `...000004Z`, `...000005Z`), so a retry must advance past the abort, not past the time it asked for |
| **Past-dated backfill, then one bad time** | The abort took wall-clock now (`2026-11-07T14:39:14.336Z`). Every later explicit past time (2019, then `2020-01-01T00:00:00.000001Z`, `...000002123Z`, `2020-01-02`) was rejected, including ones that would have been valid before the abort |

Raw output: Appendix B1.

*Anything else that moves the head:* upstream issue #6209 (open) lists DDL-only transactions (`CREATE TABLE`, `GRANT`, `REVOKE`), aborted transactions, empty transactions and `ATTACH/DETACH DATABASE`. Its text says "In 2.2 a DDL or abort during a `SYSTEM_TIME` backfill still moves the clock past the next step." The proposed fix PR #6212 was closed unmerged on 2026-10-19. No release contains a fix.

**Confidence.** High. Source, docs, upstream issue and probes agree.

**Implication for the entity-projection design.**

```
   Triplex clock (ms, ties allowed)         Native system time (us, strictly increasing)
   -----------------------------------      ---------------------------------------------
   recordedAt  = 1700000000123              head = max over ALL txs incl. aborts and DDL
   recordedAt  = 1700000000123  (tie!)      next explicit time must be > head
   CAS conflict -> abort                     abort takes head+1us or wall-clock now
```

- A one-to-one mapping `recordedAt -> system_time` breaks on ties. A ledger position can be mapped to a strictly increasing value (for example epoch microseconds plus a position offset), but every `triplex-cas-conflict` abort advances the head to wall-clock now or past it. After that, an explicit time derived from a logical clock that is behind wall-clock fails permanently.
- Safe shapes, in order of fit:
  1. **Engine-assigned system time** (no `SYSTEM_TIME` option). Keep `recorded_position` and `recorded_at` as Triplex ledger columns. Record the engine time per commit by writing `METADATA = {op_id: ...}` and reading `xt.txs.system_time` by `user_metadata->>'op_id'` (probe in Q6). Translate Triplex `recordedAt/position` read bases to a snapshot token or a `FOR SYSTEM_TIME AS OF` value through the ledger.
  2. **Client-set system time** only if Triplex becomes the sole writer of that database, never runs DDL or grants after start, and re-reads `max(system_time)` from `xt.txs` after every abort before choosing the next value.
- Native `_system_from/_system_to` on projection rows then mean "engine time of the projection write". They will not equal Triplex `recordedAt` unless option 2 is accepted.

---

## Q2. Valid-time DML: INSERT, UPDATE, DELETE, ERASE, PATCH

**Verdict.** Every operation exists in SQL over pgwire, including `PATCH`. XTQL transaction operations (`put-docs`, `patch-docs`, `delete-docs`, `erase-docs`) exist only in JVM clients. `INSERT` is a put that replaces the whole document for its valid period. Merging semantics need `PATCH`.

**Evidence.**

| Operation | Semantics observed in 2.2.0 | Source or docs |
| --- | --- | --- |
| `INSERT INTO t (_id, _valid_from, _valid_to, ...)` | Both valid-time columns optional. Default is now (the tx system time) to end of time. Replaces the whole document for that period | `sql/txs.md:28`, probes p2 steps 1-2 |
| `INSERT` where `_valid_from >= _valid_to` | Statement fails at statement time, SQLSTATE `08P01`, "Invalid valid times". Equal bounds also fail | probe p2 steps 12-13 |
| Two `INSERT`s for one `_id` in one tx | Second wins, and only one version exists (same system time) | probe p2 step 15 |
| `UPDATE t FOR PORTION OF VALID_TIME FROM a [TO b] SET ...` | Changes only the `SET` columns inside `[a, b)`, splits slices at `a` and `b`. No effect when no document exists in the portion (no gap fill) | `sql/txs.md:30-47`, probes p2 step 3, p2b |
| `UPDATE` without a portion clause | Now to end of time (documented XTDB deviation from SQL:2011) | `sql/txs.md:46` |
| `UPDATE SET _id/_valid_from` | Rejected at planning, "Cannot UPDATE _id column" | probe p2 steps 10-11 |
| `UPDATE` that would write an identical document | Skipped, no new version (v2.2.0 breaking-change list). `INSERT` of an identical document still creates a new system version | probe p10 section 1 |
| `DELETE FROM t FOR PORTION OF VALID_TIME FROM a TO b` | Removes that slice. `FOR ALL VALID_TIME` removes all valid time. Default is now to end of time | `sql/txs.md:69-84`, probe p2 step 4, p2b |
| `PATCH INTO t [FOR [PORTION OF] VALID_TIME FROM a [TO b]] RECORDS {...}` | Key-level merge: present keys override, **absent or null keys are preserved**. Fills gaps inside the portion with a document holding only the patched keys. Several `PATCH`es in one tx collapse to one version | `Sql.g4:31,823`, `sql/txs.md:50-67`, probes p2 steps 5-7, p2b, p12 |
| `ERASE FROM t WHERE ...` | Removes every version in all valid time and all system time. `FOR ALL SYSTEM_TIME FOR ALL VALID_TIME` then returns zero rows | `sql/txs.md:86-97`, probe p2 step 17 |

*Overlapping insert, exact behaviour (probe p2 steps 1-2).* Start with `p1` valid `[2024-01-01, 2024-06-01)` holding `name='Ann', email='ann@x'`. Then `INSERT ... (_id, _valid_from, _valid_to, name) VALUES ('p1', 2024-03-01, 2024-04-01, 'Bea')`:

```
valid time:  01-01      03-01      04-01      06-01
             |  Ann+email |  Bea (email = NULL)  |  Ann+email  |
             ^ original    ^ replaced by INSERT   ^ original, re-split
```

The inserted document replaced the stored one for its period. The `email` of that slice became `NULL`.

*Retraction of one attribute for a valid period (probe p12).*

- `UPDATE ent FOR PORTION OF VALID_TIME FROM 04-01 TO 05-01 SET email = NULL WHERE _id='e1'` set `email` to `NULL` only inside that period and split the row at both ends.
- `PATCH ... RECORDS {_id:'e1', email: null}` over `[05-01, 06-01)` **did not retract**. It preserved the stored value and split the row at `06-01`.
- **Slices are not coalesced.** After that no-op `PATCH`, two adjacent rows with identical column values remained (`[05-01,06-01)` and `[06-01,07-01)`). Row count grows with every distinct boundary.

*Parameter typing in DML.* An untyped parameter fails with "Missing types for args - client must specify types for all non-null params in DML statements". The repo's `XtdbClient.ts` already avoids this by calling `pool.typed(value, oid)` for every parameter. A json-typed (OID 114) or jsonb-typed (3802) parameter is **stored as text**, not as a struct (probe p9). A transit-typed parameter (OID 16384, JSON-quoted transit text) is stored as a real struct, set, keyword, uuid or instant (probe p9b). A statement carries at most 32,767 parameters ("Value out of range for short: 54000" for 54,000).

*XTQL as DML.* `docs/src/content/docs/reference/main/xtql/txs.md` documents `put-docs`, `patch-docs` (with `:valid-from` / `:valid-to`), `delete-docs`, `erase-docs` as EDN for `xt/execute-tx` in Clojure. `Sql.g4:704` shows XTQL only as a query expression, so there is no XTQL DML over pgwire.

**Confidence.** High.

**Implication for the entity-projection design.**

- Writing an assertion of attribute A over `[a, b)` maps to `PATCH INTO person FOR VALID_TIME FROM a TO b RECORDS {_id: e, person$name: v}`. It merges into existing slices and splits the row at `a` and `b` automatically.
- Retracting A over `[a, b)` maps to `UPDATE person FOR PORTION OF VALID_TIME FROM a TO b SET person$name = NULL WHERE _id = e`. `PATCH` with `null` cannot retract.
- Creating an entity with a full document maps to `INSERT`, and a later `INSERT` for the same period overwrites every column, so it must not be used for partial attribute updates.
- A Triplex entity with per-attribute intervals produces one row per distinct boundary, and rows are never merged back. Row count per entity equals the number of distinct interval endpoints across all its attributes plus one.
- Triplex valid times are non-negative epoch milliseconds (possibly fractional). Native timestamps accepted `-290000-01-01` to `+294000-01-01` (probe p10), so the domain fits at microsecond resolution (Q3 covers conversion).

---

## Q3. Columns, names and types

**Verdict.** An attribute key `:person/name` becomes column `person$name`, reachable from XTQL as `person/name` and from SQL as `person$name`. The normalisation is lossy (case-folding, `-` to `_`). Wire types are well behaved for monomorphic columns and surprising for unions, sets, structs and `URI`. Tables get sparse columns on first write with no DDL.

**Evidence: naming.**

- `api/src/main/kotlin/xtdb/util/NormalForm.kt:9-14`. `normalForm0` replaces `-` with `_`, maps a leading `xt/` to `_`, splits on `.` `/` `$`, joins with `$`, lowercases. For symbols with a namespace, `NormalForm.kt:33` yields `ns$name`.
- `NormalForm.kt:45-46`. Table keyword `:ns/tbl` becomes schema `ns`, table `tbl` (default schema `public`, `-` becomes `_`, lowercase).
- Probe results:

| Spelling | Result |
| --- | --- |
| SQL `INSERT INTO nsy (_id, person$name)` unquoted | Works, column `person$name` |
| SQL `"first-name"`, `"person.age"`, `"Mixed Case"`, `"with space"`, `"uni☃"` | Work, stored verbatim (delimited identifiers are case-preserving) |
| SQL `"person/name"` or `"a/b"` | Lexer error (`token recognition error at: '"person/'`). `/` cannot appear in a SQL identifier |
| XTQL `(from :nsy [_id person/name])` | Reads column `person$name`. `person.name2` reads `person$name2` |
| XTQL `person/age` against a SQL-created `"person.age"` | NULL, because XTQL normalises to `person$age` |
| XTQL `[firstName]` | Reads `firstname`. `[first-name]` reads `first_name` |
| `acme.person` in SQL and `:acme/person` in XTQL | Same table (schema `acme`) |
| `INSERT INTO PersonRecord` | Table `personrecord` |
| XTQL `[xt/valid-from xt/system-from]` | Resolve to `_valid_from`, `_system_from` |

- Collisions are silent. `first-name` and `first_name` are the same XTQL column. `FirstName` and `firstname` are the same XTQL column. Two SQL delimited names that differ only in case coexist as separate columns (`"Name"` and `name` both existed in probe p3d), yet XTQL can only reach the lowercase one, and `SELECT *` shows both.
- Unquoted SQL identifiers that are reserved: in a 41-word probe only `order`, `group`, `default`, `from`, `to` were rejected unquoted. `name`, `date`, `text`, `year`, `user`, `position`, `first`, `last`, `period`, `row`, `rank`, `day`, `time`, `timestamp`, `uuid`, `value`, `key`, `version` were accepted. Upstream #6014 (broader reserved list in rc1) is fixed in the 2.2.0 image.
- Unknown names: since 2.2 SQL errors on an unknown table or column ("Table not found", "Column not found"). XTQL returns `NULL` for an unknown column and zero rows for an unknown table. `CREATE [OR ALTER] TABLE t (_id, name, email)` (v2.2+, `docs/.../sql/schema.md`) pre-declares columns of type `:nothing` so SQL `SELECT` works before the first write (probe p2b).
- Introspection: `information_schema.columns` returns `data_type` (Postgres name) and `xt_type` (XTDB type notation).

**Evidence: types as seen by the `postgres` 3.4.9 driver** (probe p3c, one query per column; OIDs from `PgType.kt`):

| XTDB type | OID | JS value from `postgres` | Notes |
| --- | --- | --- | --- |
| BIGINT (`:i64`) | 20 | string | `9223372036854775807` round-trips as a string |
| INT, SMALLINT | 23, 21 | number | |
| DOUBLE | 701 | number | |
| REAL | 700 | number | |
| DECIMAL(p,s) | 1700 | string | `12.34` and `12345678901234567890.123456789` exact |
| BOOLEAN | 16 | boolean | |
| TEXT | 25 | string | Unicode round-trips |
| UUID | 2950 | string | |
| DATE | 1082 | `Date` (UTC midnight) | |
| TIMESTAMP (no zone) | 1114 | `Date` parsed in the **local** zone | Shifted by 5 hours on this machine. Avoid |
| TIMESTAMP WITH TIME ZONE | 1184 | `Date` | Millisecond precision in JS. `...123456Z` arrives as `.123Z`. Use `CAST(x AS VARCHAR)` for microseconds |
| TIME | 1083 | string | |
| DURATION | 11112 (custom) | string `PT1H30M` | `PgType.kt:524-527` |
| INTERVAL | 1186 | string `P14M` | |
| KEYWORD | 11111 (custom) | string without colon (`person/name`) | `PgType.kt:764-767` |
| VARBINARY | 17 | `Buffer` | |
| list of BIGINT | 1016 | array of strings | |
| list of TEXT | 1009 | array of strings | |
| list of DOUBLE, mixed list, empty list | 114 (JSON) | parsed JSON | `PgType.kt:995-1010` |
| struct | 114 (JSON) | object | `PgType.kt:942` |
| set | 114 (JSON) | array | `PgType.kt:989-990`. Set identity is lost on read |
| **URI** | n/a | **`SELECT` fails**: `unknown type: java.net.URI` | `api/src/main/kotlin/xtdb/JsonSerde.kt:77`. `SELECT *` on a table with a URI column fails whole |
| NULL-only column | 25 | `null` | |

- **Unions.** A column's type is the join of every value ever written and only widens (`docs/.../about/types-in-xtdb.md`). A union (for example `#{:i64 :utf8}` or `#{:f64 :i64}`) is sent as OID 114 JSON. In the probe, `c_i64 = 9007199254740993` read back as `9007199254740992` after another row put text in the same column, because the value travelled as a JSON number. A double column that received one integer literal became `#{:f64 :i64}`. The repo client's rule (safe integer is OID 20, else OID 701) therefore creates unions whenever a float attribute holds a whole number. A projection must send floats with an explicit float type every time.
- **Cardinality-many.** Use lists. Membership works as `'a' = ANY(tags)`, `UNNEST(tags)` in SQL, and `(unnest {:tag tags})` in XTQL (probe p4). `$1` text[] parameters work with `= ANY($1)` and `IN (SELECT x FROM UNNEST($1) AS u(x))` (probe p9b). XTQL `contains?` is the PERIOD predicate and does not test collection membership. `ARRAY_POSITION` does not exist. Sets (`[:set :utf8]`) can be written only through a transit-typed parameter or transit `COPY`, since SQL has no set literal, and they read back as JSON arrays.
- **Nested structs.** SQL literal `{a: 1, b: {c: 'x'}}` or `RECORD(...)` works. From Node, parameters need the transit OID 16384 (quoted JSON transit text `["^ ","~:a",1]`). OID 114/3802 parameters become text.
- **Heterogeneous rows and later columns.** Tables are sparse and schemaless. A column appears on first write, `NULL` and "missing" are the same value, and `what-is-xtdb.md:38` says tables are "always 'sparse' ... and 'wide'". Upstream #5714 (compaction failure "cannot promote DUV leg" after column presence and type changes across generations) is closed with fix commits dated to 2026-09-22, which is before the 2.2.0 tag. Inclusion in the 2.2.0 image was not verified.
- **Column count.** No limit was hit. A single document with 8,001 columns inserted in 228 ms and `SELECT *` returned all 8,001 columns in 217 ms (probe p9). Upstream PR #6200 (draft, not in 2.2.0) reports that building the metadata page index costs time proportional to columns times pages, so very wide tables get slower to open.
- **Fractional-ms valid time.** `postgres` serialises a `Date` parameter with millisecond precision (`toISOString`). Microseconds need a text parameter plus `CAST($1 AS TIMESTAMP WITH TIME ZONE)`, or `TIMESTAMP '1970-01-01T00:00:00Z' + DURATION 'PT1700000000.123456S'` (probe p10: `2023-11-14T22:13:20.123456Z`). Float-multiply on `INTERVAL` is not supported ("* not applicable to types f64 and interval").

**Confidence.** High for everything probed. Medium for column-count behaviour beyond 8,001 and for the 2.2.0 status of #5714.

**Implication for the entity-projection design.**

- Choose physical column names deliberately. `person$name` (namespace kept) cannot collide across entity types and matches both `person/name` in XTQL and `person$name` in SQL. A bare local name (`name`) reads best in raw XTQL (`(from :person [name email])`) but collides across namespaces.
- Because normalisation lowercases and folds `-` to `_`, two Triplex attributes that differ only in case or `-` versus `_` would share one column. The projection needs a collision check at schema deploy time.
- Pin every attribute to one XTDB type at the write boundary (float attribute: always float8, integer attribute: always int8 or always decimal) to keep columns monomorphic.
- Use text-typed ISO strings or `CAST` for timestamps that need microseconds. Avoid TIMESTAMP without zone, URI and sets.
- Pre-declare columns with `CREATE OR ALTER TABLE person (...)` so SQL users never hit "Column not found" on an attribute nobody has written yet.

---

## Q4. XTQL surface in 2.2.0

**Verdict.** The documented XTQL operators all work through `XTQL ('...', $n)`, including joins, aggregates, subqueries and parameters. `union-all` parses but cannot be planned. SQL window functions beyond `ROW_NUMBER`, `LEAD`, `LAG` fail with `AbstractMethodError`, which reproduces the repo's finding. No release after 2.2.0 exists, so no fix is available.

**Evidence.**

*Operator inventory (parser: `core/src/main/clojure/xtdb/xtql.clj`, probe p4).*

| Operator or form | Status | Note |
| --- | --- | --- |
| `from` (vector bind, map with `:bind`, `:for-valid-time`, `:for-system-time`) | Works | `xtql.clj:357-399`. `{:email "x"}` binds a constant. `*` projects all columns |
| `where`, `with`, `without`, `return` | Work | |
| `unify` with `from`, `join`, `left-join`, `where`, `with`, `rel`, `unnest` | Works | Self left-join on manager returned correct nulls |
| `join`, `left-join` with args vector | Works | |
| `aggregate` (`row-count`, `sum`, `max`, `array-agg`, group vars) | Works | |
| `order-by`, `limit`, `offset` | Work | Row order is undefined without `order-by` (hash order observed) |
| `rel` (literal) | Works | |
| `rel` with parameter | Works with a transit-typed (16384) parameter. A JSON-typed (114) parameter fails: "Table param must be of type struct list" | |
| `unnest` (tail and unify) | Works | |
| `exists?`, `q`, `pull`, `pull*` | Work | `xtql.clj:141`. Subquery args are passed as `[(fn [i] ...) outer-col]` |
| `not-exists?` | Not an operator | Use `(not (exists? ...))` (works) |
| `union-all` | **Parses, fails at planning**: "No implementation of method: :plan-query of protocol ... xtdb.xtql.UnionAll" | `xtql.clj:611-616`. Not in the docs |
| `fn` with parameters, bound by `XTQL ('(fn [d] ...)', $1)` | Works | |
| `contains?` on a list | Not collection membership (PERIOD predicate) | use `unnest` |

*SQL embedding (`Sql.g4:704`, probe p13).* `XTQL` is a `queryExpressionBody`, so these forms work: top-level `XTQL ('...', $1)`, dollar-quoted `XTQL($$ ... $$)`, derived table `FROM (XTQL('...')) AS x`, `WITH t AS (XTQL('...'))`, `UNION ALL` with a SQL select, join of a derived XTQL table to a SQL table, and `ORDER BY/LIMIT` after it. A bare `FROM XTQL(...)` without parentheses is a parse error in 2.2.0 even though the docs diagram shows it.

*Missing-name behaviour.* XTQL: unknown column returns `NULL`, unknown table returns an empty relation. SQL: both error (Q3).

*Known bugs and gaps.*

- **Aggregate and ranking window functions.** `SELECT SUM(salary) OVER (PARTITION BY dept)`, `AVG(salary) OVER ()` and `RANK() OVER (...)` fail with SQLSTATE `XX000` and the message `Method xtdb/sql/ExprPlanVisitor.visitAggregateWindowFunction(...) is abstract` (and `visitRankWindowFunction`). Server log shows `java.lang.AbstractMethodError`. Cause: the grammar accepts `windowFunctionType` alternatives (`Sql.g4:435-447`), but the visitor in `core/src/main/clojure/xtdb/sql.clj:2098-2160` implements only `ROW_NUMBER` (`:2114`) and `LEAD/LAG` (`:2119`). Window frames throw `UnsupportedOperationException` (`sql.clj:2159`). `ROW_NUMBER` and `LAG` returned correct results.
- `WITH RECURSIVE` fails: "Recursive CTEs are not supported yet" (SQLSTATE `0A000`).
- Upstream tracking: #5953 (aggregate functions as window functions), #5959 (RANK, DENSE_RANK, NTILE), #5960 (FIRST_VALUE, LAST_VALUE, NTH_VALUE), #5961 (named windows), #5962, #5964, #5809 (frames), #5801. All open on 2026-11-07. #5953 states that adding only the missing visitor method "would just move the failure". No fix is merged.
- Added in 2.2.0 (from release notes): `LEAD`, `LAG`, `PERCENTILE_CONT/DISC`, aggregate `FILTER`, `array_agg(x ORDER BY y)`, `ILIKE`.

**Confidence.** High.

**Implication for the entity-projection design.**

- Raw user XTQL such as `(from :person [name email])` works with the projection, subject to the naming rules in Q3.
- A user who writes `SUM(x) OVER (...)` against projection tables gets the same `AbstractMethodError`. The projection cannot fix it, so docs for native queries should say so.
- The existing workaround (endpoint segmentation without window operators) stays valid.

---

## Q5. Temporal reads, snapshots and basis tokens

**Verdict.** The read surface is complete and behaves as documented: valid-time and system-time filters in SQL and XTQL, per-query and per-transaction basis, snapshot tokens for repeatable cuts, await tokens for read-your-writes.

**Evidence.**

*Syntax.* `FOR VALID_TIME AS OF t | FROM a TO b | BETWEEN a AND b | ALL`, the same for `SYSTEM_TIME`, `FOR ALL VALID_TIME`, and `FOR VALID_TIME ONLY FROM a TO b` (v2.2+, clamps returned bounds to the window, `queries.md:186-205`). XTQL: `:for-valid-time` / `:for-system-time` with `(at t)`, `(in a b)`, `(from t)`, `(to t)` or `:all-time` (`xtql.clj:233-262`). The `#inst` reader literal inside XTQL text has millisecond precision. Use a typed `timestamptz` parameter or SQL for microseconds.

*Defaults.* System time is "as best known" (latest processed tx on the node). Valid time is "as of now" where now is `CLOCK_TIME` if set, else the node clock (`queries.md` precedence list). A row whose `_valid_from` is in the future is invisible by default (Q1 probe).

*Probe p5 (three transactions: A inserted 2024-01-01 onwards, update from 2024-06-01 to B, retroactive X over March):*

| Query | Result | Reading |
| --- | --- | --- |
| default | `B` | now |
| `FOR VALID_TIME AS OF 2024-03-15` | `X` | corrected history |
| `FOR SYSTEM_TIME AS OF t2 ... FOR VALID_TIME AS OF 2024-03-15` | `A` | what we believed before the retroactive correction |
| `FOR SYSTEM_TIME AS OF t3 ... FOR VALID_TIME AS OF 2024-03-15` | `X` | after it |
| `FOR SYSTEM_TIME AS OF 2000-01-01 FOR ALL VALID_TIME` | empty | before first tx |
| `FOR ALL SYSTEM_TIME FOR ALL VALID_TIME` | 6 rows with exact `_system_from/_system_to` | full history |
| `SETTING SNAPSHOT_TIME = t2` | rows as of t2 | approximate cut |
| `SETTING SNAPSHOT_TOKEN = tok1` | only the first tx's row | exact cut |

*Basis and tokens.*

- `SHOW SNAPSHOT_TOKEN`, `SHOW AWAIT_TOKEN`, `SHOW CLOCK_TIME` exist. Tokens are short base64 protobuf strings (`ChYKBHh0ZGISDgoMCJn0vNcGEJCGkakB`, `Cg0KBHh0ZGISBQoDnv0D`).
- `SETTING SNAPSHOT_TOKEN = '...', CLOCK_TIME = TIMESTAMP '...' <query>` is a per-query basis. The repo client already emits exactly this.
- `BEGIN READ ONLY WITH (SNAPSHOT_TOKEN = ..., CLOCK_TIME = ..., AWAIT_TOKEN = ...)` fixes the basis for several statements. Probe: inside `BEGIN READ ONLY`, a second `COUNT(*)` after another connection committed a write returned the same count (6), and the next statement outside the transaction saw the write. `queries.md:7-14` and `txs-in-xtdb.md:85` say the basis is fixed at the first query (a 2.2 change).
- Read-your-writes on one connection is automatic. Across connections, `SET AWAIT_TOKEN = '<token>'` where the token came from `SHOW AWAIT_TOKEN` after commit. In the probe the second connection already saw the write without it, which the docs say is likely but not guaranteed (`txs-in-xtdb.md:40-66`).
- `SNAPSHOT_TIME` is only an approximation if the node is behind (`txs-in-xtdb.md:136-141`). For audit-grade repeatability store the token and the clock time.
- Transaction ids are log positions, not dense counters (`xt.txs._id` values `0, 1555, 3110, ...` on the local log).

**Confidence.** High.

**Implication for the entity-projection design.**

- A Triplex read basis `{recordedAt, validAt}` can be answered natively as `FOR SYSTEM_TIME AS OF <engine time of the commit at that position> FOR VALID_TIME AS OF <validAt>`, but only if the position-to-engine-time mapping is stored (Q1 option 1).
- A fixed-cut repeatable page (cursor) maps to a stored `SNAPSHOT_TOKEN` plus `CLOCK_TIME`. Tokens are engine-specific, so Triplex's own `recorded_position` remains the portable cut.
- Always pass `validAt` explicitly, because the engine default is wall-clock now.

---

## Q6. Transactions, preconditions and failure reporting

**Verdict.** A transaction is atomic across any number of tables. `ASSERT` provides compare-and-set. A failed `ASSERT` surfaces at `COMMIT SYNC` as SQLSTATE `P0004` with the supplied message and is recorded in `xt.txs`. `METADATA` gives a queryable idempotency key.

**Evidence (probe p6).**

- **Atomicity.** `INSERT INTO ent_a ...; INSERT INTO ent_b ...; ASSERT (SELECT MAX(pos) FROM meta WHERE _id='s1') = 5, 'triplex-cas-conflict'` failed with `P0004 triplex-cas-conflict`, and neither `ent_a` nor `ent_b` existed afterwards (even the table creation rolled back). The same statements with the assertion true committed all three tables.
- **Race.** Two connections ran `ASSERT ... = 1` then bumped the position concurrently. One committed. The other failed with `P0004 triplex-cas-conflict`. `meta` and `ent_a` showed only the winner's writes.
- **Recording.** `xt.txs` holds one row per transaction with columns `_id, committed, error, system_time, user_metadata`. A failed assertion appears as `committed = false` with error text `[:conflict :xtdb/assert-failed "triplex-cas-conflict" {:tx-op-idx 0, :sql "ASSERT ..."}]`. A parameterised assertion adds `:arg-idx`.
- **Other failures.** Invalid valid times, planning errors, a type error (`v + 'x'`) and `1 / 0` fail at the statement, SQLSTATE `08P01`, before `COMMIT`, and `xt.txs` also recorded an aborted row for the type error and the division by zero. After any error the connection needs `ROLLBACK` (the repo client does this). `invalid-system-time` fails at `COMMIT SYNC` with `08P01` (Q1).
- **Not interactive.** A `SELECT` inside a write transaction fails with "Queries are unsupported in a DML transaction" (`txs-in-xtdb.md:13-22`). Statements inside a transaction see earlier statements' writes.
- **Repo client classification.** `XtdbClient.ts` treats `P0004` as a definitive rejection and other `COMMIT` errors as indeterminate. The probes agree with that split.
- **Idempotency options.**
  1. `ASSERT NOT EXISTS (SELECT 1 FROM tx_attempts WHERE operation_id = $1)` (the repo's pattern).
  2. `BEGIN READ WRITE WITH (METADATA = {op_id: 'op-123'})` stores `user_metadata`. `SELECT _id, committed FROM xt.txs WHERE user_metadata->>'op_id' = 'op-123'` found it. This is an engine-side receipt that needs no extra table.
  3. Deterministic `_id` plus `INSERT` is idempotent in result but not in history (an identical `INSERT` makes a new system version).
  4. `COMMIT ASYNC` returns before indexing. `SHOW AWAIT_TOKEN` then a read on the same connection waits for it (probe).
- **Cost of preconditions** (probe p11, 3,000,000-row table):

| Transaction | p50 | Note |
| --- | --- | --- |
| single-row `INSERT` tx on a tiny table | 3.2 ms | autocommit insert 2.2 ms |
| `ASSERT NOT EXISTS` by `_id` on 3M rows, plus `INSERT` | 16.7 ms | `_id` lookup |
| CAS `ASSERT (SELECT COALESCE(MAX(pos),0) FROM meta2 ...) = N` plus `INSERT` | 19.9 ms | tiny table |
| **`ASSERT NOT EXISTS` by `email` (non-`_id`) on 3M rows, plus `INSERT`** | **1.79 s** | a scan inside the single serialised writer |

Writes are serialised through one leader per database (`txs-in-xtdb.md:24-31`, `dev/doc/high-level-tour.adoc`), so a slow assertion delays every other writer.

**Confidence.** High.

**Implication for the entity-projection design.**

- The projection write and the ledger write belong in one `BEGIN READ WRITE ... COMMIT SYNC`, guarded by the existing CAS `ASSERT` on `tx_meta`. No new mechanism is needed.
- Any projection-level uniqueness check on a non-`_id` column would scan the table inside the writer. Give such columns their own table keyed by the value (`_id = email`), so the check becomes an `_id` lookup.
- Use `METADATA` to attach the Triplex `operationId` and `position` to each commit so `xt.txs` doubles as the position-to-engine-time map.

---

## Q7. Performance at scale

**Verdict.** Ingest is fast with small parameterised batches. `_id` lookups stay flat as the table grows. Every non-`_id` predicate is a column scan whose cost grows linearly with table size. There are no secondary indexes in 2.2.0. A 10-million-row projection table will answer non-`_id` filters in seconds, not milliseconds.

**Evidence: storage model.**

```
 client --pgwire--> leader (single writer per database) --> log (Local file or Kafka)
                                  |
                                  v live index (memory) --every 102,400 rows or 15 min--> L0 block file (Arrow)
                                                                                              |
   compactor: L0 -> L1 (coalesce toward ~100 MB) -> L2 (4-way split by IID bit prefix) -> L3 ...
   per-page (about 1,024 rows) metadata: numeric/date min/max, bloom on string/binary (compacted levels only)
```

- Events (put, delete, erase) are sorted by IID (16-byte hash of `_id`) then system time descending, in Arrow files (`dev/doc/high-level-tour.adoc:108-112`, `dev/GLOSSARY.md`, "LSM tree" and "IID").
- Block size and flush: `rowsPerBlock: 102400`, `flushDuration: PT15M` since 2.2 (`docs/.../ops/config.md:269-273`).
- Page metadata: numeric, date-time, time and duration min/max; bloom filters on UTF-8 and binary columns. `MetadataFlavour.kt:77` marks DECIMAL as unsupported for metadata. A table with DECIMAL columns still flushed to an L0 block in the probe, and compaction of DECIMAL columns was not tested (open question 10). L0 blocks are written without blooms except for `_iid` (`LiveTable.kt:198`, `ColumnMetadata.kt:141`). Only compaction output computes blooms for all string columns (`Compactor.kt:91`).
- **No secondary indexes.** `docs/.../concepts/key-concepts.md:109-114` ("no concept of uniqueness beyond the ID"). Upstream #3663 ("Maintaining user-specified secondary indices") is open, labelled `spec-reqd`, blocked by #5733, and describes a future `CREATE INDEX` with hash-keyed LSM indexes for equality only. It states that today "a predicate on a non-key column typically leads to scanning" and that page metadata is "under-selective".
- **Versioning granularity.** `dev/doc/query_and_access_patterns.adoc:162-164` lists "frequent updates to only a couple of attributes of an entity" and marks the document-level approach "pain". Each update writes a whole new document version (confirmed by `FOR ALL SYSTEM_TIME` history in Q2).
- Caches (`query.clj:577-587`): plan cache 4,096 entries, DML cache 256 entries.

**Evidence: measurements** (probe p7, one `bulk` table, 10 columns: `_id`, name, unique email, age, score, bool, timestamp, city with 1,000 distinct values, text[] of 2):

*Ingest, parameterised multi-row `INSERT ... VALUES` (typed parameters like the repo client), 20,000 rows each:*

| Rows per statement | Statements per tx | Rows/s |
| --- | --- | --- |
| 10 | 100 | 7,428 |
| 25 | 40 | 9,385 |
| 50 | 20 | 7,263 |
| 100 | 10 or 40 | 4,791 or 6,367 |
| 250 | 20 | 2,869 |
| 500 | 2 | 1,513 |
| 1,000 | 1 | 690 |
| 3,000 (27,000 params) | 1 | about 160 (19 s) |

Throughput falls sharply above about 100 rows per statement. A sustained load of 1,000,000 rows at 50 rows per statement and 40 statements per transaction ran at **9,968 rows/s** (100 s), and a further 2,000,000 rows at 9,771 rows/s (205 s), with `COMMIT SYNC` per 2,000-row transaction.

*Heap behaviour.* Literal multi-row `VALUES` (every statement a distinct SQL text) ran out of Java heap (`XX000 Java heap space`) in two sustained loads: 5,000 rows per statement after 40,000 rows on the default 768 MiB heap (25% of the 3 GiB container), and 1,000 rows per statement, 10 statements per transaction, under a 1.5 GiB heap before 100,000 rows. Single 4,000-row literal statements on a fresh node succeeded in 690 ms. Same-text parameterised statements loaded 3,000,000 rows in the 1.5 GiB heap with 1 GiB direct memory (container peak about 1.8 GiB). Mechanism not isolated. The caches above are a plausible cause (unverified).

*Read latency, warm* (median of three runs, ms):

| Query | 1M rows | 3M rows | Scaling |
| --- | --- | --- | --- |
| point `_id = ?` | 4-6 | 6 | flat |
| `_id IN (100 ids)` | 32-48 | 28-29 | flat |
| `email = ?` (unique, non-id) | 278-295 | 827-879 | linear |
| `city = ?` (1,000 rows match) | 241-247 | 793-813 | linear |
| `age = 30` | 219-230 | 770-806 | linear |
| 1-day `created` range | 233-238 | 814-842 | linear |
| `'t3' = ANY(tags)` (array scan) | 2,415-2,474 | 7,201-7,583 | linear |
| `COUNT(*)` | 209-214 | 683-693 | linear |
| `GROUP BY city` | 374-385 | 1,225-1,236 | linear |
| `ORDER BY created DESC LIMIT 10` | 470-477 | 1,665-1,667 | linear |
| `SELECT * LIMIT 100` | 5 | 6 | flat |
| XTQL `{:email "..."}` | 241-271 | 810-834 | linear |

After a node restart (cold caches) at 3M rows the first run was slower (point lookup 419 ms, unique email 1,997 ms, array scan 10.1 s) and later runs matched the warm numbers. Extrapolating the linear scans to 10M rows gives about 2.8 s for a non-`_id` equality, 2.3 s for `COUNT(*)` and 25 s for an array-membership filter on this 2-CPU VM. The unique-email lookup cost about as much as a single-column scan even after compaction produced L1 and L2 files with bloom metadata, so bloom pruning was not visible on sequentially inserted emails. That conclusion rests on one data shape.

*Disk, after 3.2M rows:*

| Item | Size | Per row |
| --- | --- | --- |
| L0 data (31 files) | 462 MB | about 146 B |
| L2 data (4 files, covering about 3.0M rows) | 455 MB | about 150 B |
| L2 metadata (blooms and min/max) | 156 MB | about 52 B |
| Local log file | 881 MB | about 280 B |
| Whole `buffers` dir before garbage collection | 3.7 GB | about 1.1 KB |

Live steady-state size is about 200 B per row of data plus metadata for this 10-column shape. The `buffers` directory was about 5.5 times larger than live data because compaction writes cumulative intermediate L1 files (sizes 7 MB, 23 MB, 39 MB, ... 118 MB for one growing file) that stay until garbage collection (`garbageLifetime: PT24H`, `blocksToKeep: 10`, `ops/config.md:297-300`). Plan disk for that transient.

*Bulk ingest options in 2.2.0.*

- Multi-row `INSERT` with same-text parameterised statements, 25-100 rows each, many statements per transaction (above).
- `COPY t FROM STDIN WITH (FORMAT 'transit-json' | 'transit-msgpack' | 'arrow-file' | 'arrow-stream')` (`core/src/main/clojure/xtdb/pgwire.clj:1335-1363, 1459-1527`; the docs list only the two transit formats). Raw-wire probe (Appendix B7): `COPY 2` succeeded for transit-json documents keyed `xt/id`; `_valid_from`/`_valid_to` or `xt/valid-from`/`xt/valid-to` keys set per-document valid time; `~#set` values are stored as sets; a document without `xt/id` fails with "missing '_id'". **The Node `postgres` driver's `.writable()` hung with XTDB** (the stream never finished; the server saw only a client EOF), so Node COPY needs a raw protocol client or a different driver. COPY inside `BEGIN READ WRITE` buffers into the transaction (`pgwire.clj:1486-1496`); combined with `ASSERT` was not tested.
- Published figures: v2.2.0 release notes report single-put transactions 15.2k to 27.8k per second (in-process) and single-row pgwire `INSERT` 861 to 674 microseconds. A maintainer message of 2025-12-01 (Clojurians log) reports about 200k rows/s loading TPC-H through Arrow `COPY` over pgwire and names 1,000 rows per transaction as the usual batch size. No official TPC-H or AuctionMark result tables are published; the repo only ships harnesses (`modules/bench`, nightly workflows). The benchmark cluster runs 10 GB pods with `-Xmx3000m -XX:MaxDirectMemorySize=5000m` (`modules/bench/cloud/helm/values.yaml:80,125-130`).

*Memory knobs.* JVM flags through `JDK_JAVA_OPTIONS` (`-Xmx`, `-XX:MaxDirectMemorySize`). The image sets none, so heap defaults to 25% of the container limit and direct memory to the heap size. `memoryCache.maxSizeBytes` or `maxSizeRatio` (default 0.5 of max direct memory), `diskCache` only for remote storage, `indexer.rowsPerBlock`, `indexer.flushDuration`, `compactor.threads` (default `min(availableProcessors / 2, 1)`, effectively 1), `garbageCollector.*` (`ops/config.md:84-101,239-300`). The repo's `compose.xtdb.yaml` sets `-Xmx3g -XX:MaxDirectMemorySize=2g` on an 8 GB container with `memoryCache.maxSizeBytes: 536870912`. Upstream #4756 ("Document minimum memory config") is open.

**Confidence.** Medium-High. Numbers come from one 2-CPU VM, one table shape and shared load. Ratios and linearity are solid. Absolute times are not.

**Implication for the entity-projection design.**

- Raw XTQL on a projection table with a predicate on any column except `_id` costs a column scan. At 10M rows that is seconds. Hot lookups (by email, by external key) need a derived table keyed by the lookup value.
- Plan on about 200 bytes per row per version for a 10-column entity, multiplied by the number of valid-time slices and system-time versions. A 30-attribute entity pays for the whole row on every attribute change.
- Size the container explicitly (`-Xmx`, `MaxDirectMemorySize`) and load with small same-text parameterised statements.

---

## Top 5 design-relevant facts

1. **Versioning is per document, and valid-time slices never merge.** An attribute change rewrites the entire row for each affected slice, `INSERT` replaces instead of merging, and `PATCH` with `null` cannot retract. Use `PATCH ... FOR PORTION OF VALID_TIME` for asserts and `UPDATE ... FOR PORTION ... SET col = NULL` for retractions, and expect row counts equal to distinct interval endpoints per entity. (Q2, Q7)
2. **Native system time is a single strictly increasing microsecond clock shared by every transaction, including aborts and DDL.** Client-set values are possible, but one CAS-conflict abort moves the head to wall-clock now and breaks any logical clock that is behind it. Treat engine time as engine-assigned and store a position-to-time map via `METADATA`. (Q1)
3. **Only `_id` is indexed.** `_id` lookups stay near 5 ms to 3M rows. Every other predicate is a column scan at about 0.27 s per million rows, and an `ASSERT` on a non-`_id` column took 1.8 s at 3M rows inside the single writer. (Q6, Q7)
4. **Names and wire types need deliberate handling.** `:ns/attr` is physically `ns$attr`; XTQL lowercases and folds `-` to `_`; SQL cannot write `/`; unions go to the client as JSON (integer precision loss in JS); `URI` cannot be selected; sets need transit; json-typed parameters are stored as text; a missing SQL column is an error unless pre-declared with `CREATE OR ALTER TABLE`. (Q3)
5. **The write path should be small same-text parameterised batches in one `BEGIN READ WRITE`, guarded by the existing CAS `ASSERT` (SQLSTATE `P0004`).** About 10k rows/s, atomic across the ledger and projection tables, with an explicit JVM heap. Large literal `VALUES` statements ran the node out of heap. (Q6, Q7)

---

## Open questions needing experiments

1. **10M-row run.** Load 10M projection rows and measure non-`_id` predicate latency, compaction lag, steady-state disk after garbage collection, and cold-cache behaviour. Everything above is extrapolated from 1M and 3M.
2. **Bloom pruning on shuffled data.** Repeat the unique-string lookup with randomly ordered inserts, after full compaction, and read `EXPLAIN ANALYZE` pruning output to see whether any pages are skipped.
3. **Update amplification for wide entities.** For a 30 to 100 column entity, apply N single-attribute `PATCH`es across M valid slices and measure rows, bytes and compaction cost per version.
4. **Slice growth under Triplex-shaped intervals.** Generate per-attribute intervals with realistic overlap and count rows per entity. Test whether a periodic rewrite (delete and reinsert) can coalesce identical adjacent slices.
5. **Node `COPY`.** Find why `postgres`'s `.writable()` hangs against XTDB, or write a small raw-wire COPY client. Test `COPY` plus `ASSERT` in one transaction and per-document valid time at volume.
6. **Writer contention.** Measure commit throughput and tail latency with many concurrent connections doing CAS `ASSERT` on one `tx_meta` row, including how many aborts occur and how each abort moves the system-time head.
7. **Snapshot token lifetime.** Check that a `SNAPSHOT_TOKEN` still resolves the same cut after a node restart, after compaction, and on a second node.
8. **Heap root cause.** Determine whether distinct literal statements (plan and DML caches) cause the observed `Java heap space`, and the heap needed for the repo's 200-row, 23-column parameterised batches.
9. **Valid-time conversion.** Verify that Triplex fractional-millisecond `valid_from/valid_to` map to microsecond timestamps without ordering changes, including very large or negative values and `NaN`.
10. **Decimal and union columns through compaction.** Insert DECIMAL and mixed-type columns across several blocks, force compaction, and re-read (relevant to #5714 and to `MetadataFlavour.kt:77`).
11. **XTQL `union-all`.** Confirm whether any planner path supports it or whether it must be removed from user-facing guidance.

---

## Appendix A. Probe index

| Script | Question | Purpose |
| --- | --- | --- |
| `p1.mjs`, `p1b.mjs`, `p1c.mjs` | Q1 | `SYSTEM_TIME` syntax, equality, microseconds, abort behaviour, far-future time |
| `p2.mjs`, `p2b.mjs`, `p10.mjs`, `p12.mjs` | Q2 | valid-time DML, retraction patterns, identical re-insert, timestamp bounds |
| `p3a.mjs`, `p3b.mjs`, `p3c.mjs`, `p3d.mjs`, `p3e.mjs` | Q3 | types and OIDs, identifier handling |
| `p8c.mjs`, `rawcopy.mjs`, `p9.mjs`, `p9b.mjs` | Q2, Q3, Q7 | COPY, transit parameters, wide rows, array parameters |
| `p4.mjs`, `p13.mjs` | Q4 | XTQL operators, window functions, embedding forms |
| `p5.mjs` | Q5 | temporal reads and basis |
| `p6.mjs` | Q6 | `ASSERT`, atomicity, `METADATA`, error codes |
| `p7a.mjs`-`p7d.mjs`, `p7c2.mjs`, `gen.mjs`, `p11.mjs`, `p11b.mjs` | Q7 | ingest shapes, 1M and 3M loads, query timing, transaction latency |

Container setup: `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock docker run -d --name tx2-probe-r1 --cpus 2 --memory 3g -p 127.0.0.1:5461:5432 ghcr.io/xtdb/xtdb:2.2.0` (recreated between groups so system time starts clean; scale runs added `-e JDK_JAVA_OPTIONS="-Xmx1536m -XX:MaxDirectMemorySize=1g"`). The container is removed. No repo source was modified.

---

## Appendix B. Raw output excerpts

### B1. System time (p1b, p1, p1c)

Accepted sequence on a fresh node (`SELECT _id, committed, CAST(system_time AS VARCHAR) ... FROM xt.txs`):

```
{"_id":"0","committed":true,"st":"2020-01-01T00:00Z[UTC]"}
{"_id":"1555","committed":true,"st":"2020-01-01T00:00:00.000001Z[UTC]"}
{"_id":"3110","committed":true,"st":"2020-01-01T00:00:00.000002Z[UTC]"}      <- literal ...000002123Z truncated
{"_id":"4665","committed":true,"st":"2020-01-02T00:00Z[UTC]"}                <- SET TRANSACTION form
{"_id":"6220","committed":true,"st":"2020-01-03T00:00Z[UTC]"}                <- BEGIN READ WRITE, SYSTEM_TIME = ...
{"_id":"7775","committed":true,"st":"2020-01-04T00:00Z[UTC]"}
{"_id":"9802","committed":true,"st":"2020-01-04T23:00Z[UTC]"}                <- +02:00 literal
{"_id":"11357","committed":true,"st":"2020-01-06T00:00Z[UTC]"}               <- plain string literal
```

Default-time transactions after a 2099 explicit time (`FOR ALL SYSTEM_TIME FOR ALL VALID_TIME`):

```
k  sf=2099-01-01T00:00Z[UTC]           (explicit)
l  sf=2099-01-01T00:00:00.000001Z[UTC] (default tx, head + 1us)
l2 sf=2099-01-01T00:00:00.000002Z[UTC]
```

Equal time rejected, and the abort moves the head (first run, head at `2020-01-01`):

```
TX B equal system time ... COMMIT SYNC
   ERROR code=08P01 severity=ERROR msg=specified system-time must be later than current tx
{"_id":"1555","committed":false,"system_time":"2026-11-07T14:39:14.336Z",
 "error":"[\"~#xt/error\",[\"~:incorrect\",\"~:invalid-system-time\",\"specified system-time must be later than current tx\",
          [\"^ \",\"~:latest-completed-tx\",[... \"~:tx-id\",0,\"~:system-time\",[\"~#time/instant\",\"2020-01-01T00:00:00Z\"]]], ...]]"}
TX D +1 microsecond (2020-01-01T00:00:00.000001Z) -> ERROR ... must be later than current tx     <- would have been valid before the abort
```

Consecutive aborts at head `2099-01-01T00:00:00.000002Z`:

```
17559 committed=false st=2099-01-01T00:00:00.000003Z[UTC]  invalid-system-time
19114 committed=false st=2099-01-01T00:00:00.000004Z[UTC]  invalid-system-time
20669 committed=false st=2099-01-01T00:00:00.000005Z[UTC]  invalid-system-time
22224 committed=false st=2099-01-01T00:00:00.000006Z[UTC]  invalid-system-time   (ASYNC = true; COMMIT returned without error)
```

### B2. Valid-time DML (p2 final history, `FOR ALL SYSTEM_TIME FOR ALL VALID_TIME`, entity `p1`)

```
Ann ann@x   sf=...00.186995  st=...00.482631  vf=2024-01-01 vt=2024-02-01
Ann ann@x   sf=...00.186995  st=...00.350356  vf=2024-02-01 vt=2024-03-01
Ann ann@x   sf=...00.186995  st=...00.298852  vf=2024-03-01 vt=2024-04-01      <- original, closed by the INSERT below
Bea NULL    sf=...00.298852  st=...00.350356  vf=2024-03-01 vt=2024-04-01      <- INSERT of {name:'Bea'} replaced the document
...
```

PATCH fills a gap (p2b): row `x` valid `[01-01, 03-01)` with `a=1`; `PATCH ... FROM 02-01 TO 05-01 RECORDS {_id:'x', b:2}` gave

```
{"a":"1","b":null,"vf":"2024-01-01","vt":"2024-02-01"}
{"a":"1","b":"2", "vf":"2024-02-01","vt":"2024-03-01"}
{"a":null,"b":"2","vf":"2024-03-01","vt":"2024-05-01"}     <- inserted where no document existed
```

Retraction (p12): `UPDATE ... FROM 04-01 TO 05-01 SET email = NULL` then `PATCH ... {email: null}` over `[05-01,06-01)`:

```
Ann NULL      01-01 -> 03-01
Ann ann@x     03-01 -> 04-01
Ann NULL      04-01 -> 05-01        <- UPDATE ... SET email = NULL retracted
Ann ann@x     05-01 -> 06-01        <- PATCH with null preserved the value
Ann ann@x     06-01 -> 07-01        <- identical neighbour, not coalesced
```

### B3. Types and OIDs (p3c, one query per column)

```
c_i64max   oid=20    string "9223372036854775807"
c_dec_big  oid=1700  string "12345678901234567890.123456789"
c_ts       oid=1114  Date(2024-01-01T05:00:00.123Z)     <- local-zone parse of a zone-less timestamp
c_tstz     oid=1184  Date(2024-01-01T00:00:00.123Z)     <- source value ...00.123456Z
c_dur      oid=11112 string "PT1H30M"
c_kw       oid=11111 string "person/name"
c_arr_i    oid=1016  ["1","2","3"]
c_arr_t    oid=1009  ["a","b"]
c_struct   oid=114   {"a":1,"b":{"c":"x"}}
c_i64      oid=114   number 9007199254740992            <- written as 9007199254740993, column became #{:utf8 :i64}
SELECT c_uri FROM ty   ->  ERROR code=08P01 msg=unknown type: java.net.URI
```

### B4. Window functions (p4, and server log)

```
SELECT _id, SUM(salary) OVER (PARTITION BY dept) AS s FROM emp
  ERROR code=XX000 msg=Method xtdb/sql/ExprPlanVisitor.visitAggregateWindowFunction(Lxtdb/antlr/Sql$AggregateWindowFunctionContext;)Ljava/lang/Object; is abstract
SELECT _id, RANK() OVER (...)      ERROR code=XX000 ... visitRankWindowFunction ... is abstract
SELECT _id, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary)   -> rows 1,2,1,2 (works)
WITH RECURSIVE r AS (...) SELECT * FROM r   ERROR code=0A000 msg=Recursive CTEs are not supported yet
(server log) java.lang.AbstractMethodError: Method xtdb/sql/ExprPlanVisitor.visitAggregateWindowFunction(...) is abstract
```

### B5. Temporal reads (p5)

```
valid as of 2024-03-15                      -> X
system as of t2 + valid as of 2024-03-15    -> A        (belief before the retroactive correction)
system as of t3 + valid as of 2024-03-15    -> X
SETTING SNAPSHOT_TOKEN = 'ChYKBHh0ZGISDgoMCJn0vNcGEJCGkakB' (token after tx1) -> A only
BEGIN READ ONLY WITH (SNAPSHOT_TOKEN = '<tok1>', CLOCK_TIME = TIMESTAMP '2024-03-15T00:00:00Z'); SELECT name FROM tp -> A
```

### B6. ASSERT and transactions (p6)

```
ASSERT (SELECT MAX(pos) FROM meta WHERE _id = 's1') = 5, 'triplex-cas-conflict'
   ERROR code=P0004 severity=ERROR msg=triplex-cas-conflict
xt.txs: committed=false error=" #xt/error [:conflict :xtdb/assert-failed \"triplex-cas-conflict\" {:tx-key #xt/tx-key {:tx-id 75276, ...}, :tx-op-idx 2, :sql \"ASSERT ...\"}]"
race: [ 'raceA: P0004 triplex-cas-conflict', 'raceB: committed' ]
BEGIN READ WRITE WITH (METADATA = {op_id: 'op-123', who: 'triplex'})  ->  user_metadata {"op_id" "op-123", "who" "triplex"}
SELECT _id, committed FROM xt.txs WHERE user_metadata->>'op_id' = 'op-123'  ->  {"_id":"87870","committed":true}
SELECT inside write tx -> ERROR: Queries are unsupported in a DML transaction
```

### B7. COPY over raw pgwire (rawcopy.mjs)

```
COPY cp1 FROM STDIN WITH (FORMAT 'transit-json')   -> CopyInResponse (G), after CopyDone: C:COPY 2  Z
  docs keyed "~:xt/id"; "~:tags" ["~#set",["a","b"]]; "~:when" "~t2024-03-01T00:00:00.000000Z"
  stored: tags xt_type [:? :set :utf8] (wire: JSON array); kind [:? :keyword]; u [:? :uuid]; when [:? :instant]
COPY cp2 ... "~:_valid_from"/"~:_valid_to" or "~:xt/valid-from"/"~:xt/valid-to" -> both gave valid 2024-01-01 -> 2024-06-01
COPY with key "~:_id" instead of "~:xt/id"   -> ERROR 08P01 missing '_id'
COPY via postgres.js sql.unsafe(...).writable() -> stream never finished (hang); server log shows only client EOF
```

### B8. Names (p3e, p3d)

```
INSERT INTO nsy (_id, person$name) ...                OK
INSERT INTO nsy (_id, "a/b") ...                      ERROR line 1:22 token recognition error at: '"a/'
XTQL (from :nsy [_id person/name])                    -> column "person$name"
XTQL (from :nsy [_id person/age])                     -> person$age = null   (SQL column was created as "person.age")
XTQL (from :nsx [firstName])                          -> column "firstname"
XTQL (from :nsx [first-name])                         -> column "first_name"
INSERT INTO acme.person (_id, name) ...; XTQL (from :acme/person [_id name]) -> same table
```

### B9. Read latency, 3M rows warm (p7d_C) and cold (p7d_D), ms for three runs

```
                               warm (3.0M rows)    cold (after container restart)
point _id                      68, 6, 6            419, 12, 10
unique non-id eq (email)       1300, 827, 879      1997, 1200, 970
array membership ANY(tags)     8112, 7201, 7583    10102, 9644, 9751
count(*)                       722, 693, 683       881, 714, 686
```

---

## Appendix C. Sources

**Pinned source tree** (`references/xtdb`, tag v2.2.0, sha c6c1962):
`core/src/main/kotlin/xtdb/indexer/TxResolver.kt`, `core/src/main/antlr/xtdb/antlr/Sql.g4`, `core/src/main/clojure/xtdb/sql.clj`, `core/src/main/clojure/xtdb/xtql.clj`, `core/src/main/clojure/xtdb/pgwire.clj`, `core/src/main/clojure/xtdb/query.clj`, `core/src/main/kotlin/xtdb/pgwire/PgType.kt`, `core/src/main/kotlin/xtdb/pgwire/PgTypes.kt`, `core/src/main/kotlin/xtdb/metadata/ColumnMetadata.kt`, `core/src/main/kotlin/xtdb/arrow/metadata/MetadataFlavour.kt`, `core/src/main/kotlin/xtdb/indexer/LiveTable.kt`, `core/src/main/kotlin/xtdb/compactor/Compactor.kt`, `api/src/main/kotlin/xtdb/util/NormalForm.kt`, `api/src/main/kotlin/xtdb/JsonSerde.kt`, `dev/doc/high-level-tour.adoc`, `dev/doc/query_and_access_patterns.adoc`, `dev/GLOSSARY.md`, `modules/bench/cloud/helm/values.yaml`, `docs/src/content/docs/reference/main/sql/{txs,queries,schema}.md`, `docs/src/content/docs/reference/main/xtql/{queries,txs}.md`, `docs/src/content/docs/about/{txs-in-xtdb,time-in-xtdb,types-in-xtdb}.md`, `docs/src/content/docs/ops/config.md`, `docs/src/content/docs/concepts/key-concepts.md`.

**Web** (fetched 2026-11-07, unauthenticated reads):

- https://github.com/xtdb/xtdb/releases and https://github.com/xtdb/xtdb/releases/tag/v2.2.0 and `.../v2.2.0-beta3` (release notes, throughput figures, #6086 fix)
- https://github.com/xtdb/xtdb/issues/5953 (aggregate window functions), https://github.com/xtdb/xtdb/issues/3663 (secondary indices), https://github.com/xtdb/xtdb/pull/6200 (wide-table metadata index), https://github.com/xtdb/xtdb/issues/6209 and https://github.com/xtdb/xtdb/pull/6212 (system-time head and DDL/aborts), https://github.com/xtdb/xtdb/issues/6014 (reserved words), https://github.com/xtdb/xtdb/issues/5714 (compaction across schema changes)
- GitHub issue search results for window functions, system time, COPY, secondary index (titles and state only)
- https://clojurians-log.clojureverse.org/xtdb/2025-11-29 (informal maintainer figures for Arrow `COPY` and batch size)
- https://docs.xtdb.com/about/time-in-xtdb.html (general statement that users do not control system time; superseded by the 2.2 docs in the pinned tree and the probes above)

**Disclosure.** One early read-only call used `gh api repos/xtdb/xtdb/tags`, which sends the logged-in GitHub token to api.github.com. All later GitHub reads were unauthenticated. No names, emails or other personal details were placed in any request.
