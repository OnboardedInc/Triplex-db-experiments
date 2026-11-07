# R3: ORM prior art for Triplex over XTDB 2.2 and QLever 0.6

Research report, 2026-11-07. Scope is physical naming and API shape for a typed entity layer plus a raw native escape hatch. No repo source was modified. Four companion files sit in `lab/research/R3-artifacts/`: the compile-checked API sketch (`api-sketch.ts`, `usage.ts`, `tsconfig.json`, section 5) and the naming-function script (`physical-names.mjs`, section 4).

**Evidence tags used below.**

- `[repo path:line]` read from this repository.
- `[clone path:line]` read from a pinned clone under `references/` (SHAs in `references/MANIFEST.json`).
- `[web URL]` fetched from the web on 2026-11-07.
- `[ran]` executed in a scratch directory (nothing was run against XTDB or QLever).
- `[unverified]` a design claim that needs a live probe. Section 7 lists the probes.

---

## 1. Answer first

### 1.1 Recommendation

Keep the assertion store as the single source of truth, and add two derived, basis-closed read surfaces whose names come from the schema. Do not make per-entity-type tables or per-entity-type graphs the source of truth.

1. **The canonical layer stays as it is.** XTDB keeps `tx_assertions`. QLever keeps assertion nodes in the per-scope graph. Triplex allows overlapping assertions for one entity and attribute and keeps two independent clocks per assertion. XTDB rows cannot hold that (XTDB enforces non-overlapping rectangles per `_id`) and the native-lane handoff forbids mapping `recordedAt` to XTDB system time without a proven cut mapping.
2. **Physical names come from schema keys, never from TypeScript aliases.** `:person/first-name` becomes XTDB column `person$first_name` (XTDB's own documented normal form) and RDF `person:first-name` (one prefix per attribute namespace). `Person` becomes XTDB relation `person` and RDF class `type:Person`.
3. **XTDB gets three generated relations, all expanded by the SDK as subqueries.** `entity(Person)` is one row per entity at the basis. `values(attr)` is one row per value. `facts()` already exists. XTDB 2.2 has no `CREATE VIEW` in its grammar, so these cannot be stored views.
4. **RDF gets real IRIs and real datatypes for the plain triple.** Entity ids become percent-encoded IRIs, refs become IRIs, values carry XSD datatypes. The plain triple lives in a per-assertion named graph whose IRI is the existing assertion IRI. Validity, recording and retraction stay as triples on the assertion node in the scope graph. A `visible(?a)` fragment joins the two.
5. **Raw escape hatches become tagged templates that compile to the builders that already exist.** `(ctx, params) => string` stays the execution contract. Plain interpolated JS values are always bound. Only SDK-made fragments are spliced as text.
6. **The typed repository sits on the public `Triples` service first.** That works on every backend today. Native pushdown comes later.
7. **Two core changes are required for precise types.** `Attribute.use` and the entity handles currently widen `required` and `cardinality`, and `Attribute.ref` forgets its target.

### 1.2 The layers

```
                         TypeScript
     Person.find / get / include            native.sql / xtql / sparql tags
                 |                                      |
                 v                                      v
      Repository over Triples service      (ctx, params) => string   [exists]
                 |                                      |
                 +------------ one closed basis --------+
                                   |
     +-----------------------------+-----------------------------+
     |  Layer 2: derived names, basis-closed, never stored        |
     |    XTDB  entity(Person)   values(attr)                     |
     |    RDF   GRAPH ?a { s p o }  +  visible(?a)                |
     +-----------------------------+-----------------------------+
     |  Layer 1: canonical assertions (source of truth)           |
     |    XTDB  tx_assertions  (+ tx_meta, tx_claims, ...)        |
     |    RDF   assertion nodes in <urn:triplex:scope:...>        |
     +------------------------------------------------------------+
```

### 1.3 Decisions that need Sam

| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | Default RDF IRI scheme | `urn:triplex:` by default (matches the IRIs already written), `http` base as a configurable option for linked-data publication. |
| D2 | First RDF layer: per-assertion named graph, or a published "head" graph of plain triples | Per-assertion named graph first because it is exact at any basis. Head graph later, only if probe P3 shows the named-graph cost is acceptable and a staleness mechanism exists. |
| D3 | Stop hyphen/underscore collisions by banning `_` in new keys, or by a release-compile check | Release-compile check. No change to the key regex. |
| D4 | Where the repository lives | A new core subpath so `packages/http` can reuse the descriptor and codec code it already has. |
| D5 | Absent optional attributes | Property missing (never `null`); cardinality-many always an array. `null` appears only as a write instruction. |

---

## 2. What the repo already does

### 2.1 Facts this report builds on

| Topic | Fact | Where |
|-------|------|-------|
| Attribute identity | Keys match `^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$`. | [repo packages/core/src/config/Attribute.ts:13] |
| Entity type identity | Names match `^[A-Z][A-Za-z0-9]*$`. | [repo packages/core/src/config/EntityType.ts:12] |
| Usage flags | `Use` carries `required: boolean` and `cardinality: "one" \| "many"` as wide types, and `use()` returns `Use<D>`. | [repo Attribute.ts:46-52, 134-140] |
| Handles | `AttributeHandle` repeats the wide types. | [repo EntityType.ts:24-40] |
| Refs | `Attribute.ref` returns `Definition<K, EntityId>`, so the target type exists only in the runtime `TypeExpr`. | [repo Attribute.ts:121-131] |
| Aliases | "TypeScript aliases are ergonomic handles only and do not become global attribute identity." | [repo ARCHITECTURE.md, ontology DSL paragraph] |
| Stored value kinds | `string, number, integer, boolean, datetime, ref, json, blob`. `int64` is a decimal string; `date` is a string; `instant` is `datetime` epoch ms. | [repo packages/core/src/Value.ts:5-14, 77-142; packages/http/src/ConfigApi.ts:66-105] |
| Writes | `assert` carries `validFrom`, `validTo`, `entityType`. `retract` is by triple id. `transact` takes `TransactionMeta` with `commandId`, `configSnapshot`, `enforce`, `preconditions`. | [repo packages/core/src/Triple.ts:100-145; store/Triples.ts:68-90, 221-233] |
| Reads | `entity`, `entities` (batched, order preserving), `entityPage` (exact-cut cursor), `match`, `history`, Datalog `query`. | [repo store/Triples.ts:236-254, 288] |
| Basis | `{ recordedAt?, validAt? }`; an omitted `validAt` resolves to now; an omitted `recordedAt` means latest. Native reads add an exact `recordedPosition`. | [repo packages/core/src/Temporal.ts:20-61; native/NativeQuery.ts:21-34, 74-93] |
| XTDB physical | One shared table `tx_assertions` created as `(_id, scope_key, <20 assertion columns>, value_identity)`, plus `tx_meta`, `tx_claims`, `tx_attempts`, `tx_query_*`. `_id` is `JSON.stringify([scope, id])`. All reads use `FOR ALL VALID_TIME` and Triplex's own time columns. | [repo packages/xtdb/src/XtdbStorageAdapter.ts:163, 216-227, 627-640; codecs.ts:10-31] |
| QLever physical | Graph per scope `<urn:triplex:scope:b64url>`. Assertion node `<urn:triplex:assertion:b64url>`. Every column is a predicate `<urn:triplex:field:COLUMN>` with a plain lexical literal, plus `_order`, `_exact`, `_native` numeric shadows. | [repo packages/qlever/src/rdf.ts:45-51, 202-259] |
| QLever entity and attribute | Entity ids and attribute keys are string literals in `field:entity_id` and `field:attribute`. There is no `rdf:type` and no entity IRI. | [repo packages/qlever/src/native/NativeContext.ts:34-39, 105] |
| Native contract | `NativeQueryContract { name, parameters: TypeExpr, row: TypeExpr }`. The row type is "a runtime type, deliberately not an unchecked generic asserted by a caller." | [repo packages/core/src/native/NativeQuery.ts:14-19] |
| Native builders | XTDB: `select` (XTQL) and `selectSql` take `(ctx, params) => string`. `ctx` offers `bind`, `attribute`, `identifier`, `facts`, `recordedFacts`, `history`. | [repo packages/xtdb/src/native/NativeQueries.ts:20, 164-190; Sources.ts:5-17] |
| Native builders, QLever | `select` takes `(ctx, params) => string`. `ctx` offers `fact`, `recordedFact`, `entity`, `iri`, `literal`, `integerOrder`, `numberOrder`. | [repo packages/qlever/src/native/NativeContext.ts:67-160; NativeQueries.ts:206] |
| Native safety | XTDB parameters are bound (`$n`; XTQL goes through `XTQL('(fn [p1 ...] ...)', $1, ...)`). SQL passes a lexical read-only guard. QLever has no bind protocol, so the context serializes literals and validates IRIs. | [repo Sources.ts:44-60, 118-126; ReadOnlySql.ts:6-113; NativeContext.ts:121-129] |
| Mapping ids | `XTDB_NATIVE_MAPPING_ID = "triplex-xtdb/assertion-native-basis/1"`, `QLEVER_NATIVE_MAPPING_ID = ".../assertion-lexical/v1"`, recorded in every trace. | [repo xtdb NativeQueries.ts:28; qlever NativeContext.ts:66] |
| Release compile precedent | `ConfigApi` compiles an immutable release into `EntityDescriptor` and `AttributeDescriptor`, derives a default collection name, accepts an override map, and fails on duplicates. | [repo packages/http/src/ConfigApi.ts:24-25, 120, 192-246, 296-334] |
| Existing untyped entity API | `EntityStore` (get, list, create, replace, delete) over `Triples.entityPage`, `entity`, `transact`. | [repo packages/http/src/EntityStore.ts:62-247] |
| Guardrail | "Do not map logical recordedAt to native system time without proving the cut mapping." | [repo handoffs/claude-native/START-HERE.md item 3; docs/xtdb.md] |
| Triple volume | One string assertion with no meta already writes 141 triples in one SPARQL update, because the journal envelope is stored as ordinary assertions. | [repo lab/research/R4-test-outputs/qlever-triple-count.out.txt (another agent's output, uncommitted)] |

### 2.2 Why raw queries do not yet read like XTQL, SQL or SPARQL

1. **XTDB.** No relation or column carries a domain name. The attribute is a string value (`':person/name'`), and the value sits in one of five typed columns chosen by `value_type`. `_id` is a JSON array. `scope_key` must be filtered or the query crosses tenants. A plain `SELECT` on `tx_assertions` returns every assertion ever made for every tenant, retracted ones included, because retraction sets Triplex columns on the row and is not an XTDB delete.
2. **QLever.** A SPARQL author cannot traverse a relationship, because ids and refs are string literals and there is no entity IRI. Predicates are column names such as `field:value_string`. Every value is a plain string literal, so QLever's typed-literal handling is bypassed.
3. **Native API.** Authoring means returning strings from a builder function. There is no tagged template, no relation helper for "a Person", and no way to derive a row type from the schema.

---

## 3. Prior art, source by source

### 3.1 LDkit (schema to SPARQL)

[LDkit](https://github.com/karelklima/ldkit) at `09fc801`.

**Mechanism.** A plain object schema maps property names to predicate IRIs, with flags. `@type` is the RDF class, `@optional`, `@array`, `@inverse`, `@schema` (nested), `@multilang`, `@enum` [clone references/ldkit/library/schema/schema.ts:8-27]. The TypeScript document type is computed from the schema type: optional becomes `T | null`, array becomes `T[]` [clone library/schema/interface.ts:51-57, 81-87]. A `Lens` offers `find`, `findByIri`, `count`, `insert`, `update`, `delete`, and `query(constructQuery)` [clone library/lens/lens.ts:205, 246, 327, 361, 400, 472, 509]. A read is one CONSTRUCT whose result graph is decoded into objects [clone library/lens/query_builder.ts:257-263], with every root node typed `ldkit:Resource` so the decoder finds it [clone library/decoder.ts:56-65]. Namespaces are typed constants (`createNamespace({ iri, prefix, terms } as const)`) [clone docs/features/working-with-arrays.md, "Initializing and Defining Models"].

**Excerpt** [clone library/lens/lens.ts, doc comment of `createLens`].

```ts
const PersonSchema = {
  "@type": dbo.Person,
  name: rdfs.label,
  birthDate: { "@id": dbo.birthDate, "@type": xsd.date },
} as const;
const Persons = createLens(PersonSchema, options);
const persons = await Persons.find({ take: 10 });   // person.birthDate is a Date
```

**Naming.** LDkit never names anything. The caller supplies full predicate IRIs from existing vocabularies (schema.org, DBpedia). Nothing in it derives a name.

**Raw escape hatch.** `Lens.query(sparqlConstruct)` returns schema-decoded entities for hand-written CONSTRUCT text [clone lens.ts:205-216]. `find({ where })` also accepts a raw SPARQL string or quads and splices it into the query [clone lens.ts:248; query_builder.ts getQuery].

**What fits Triplex.**

- The schema-to-document type derivation is the model for `Doc<Model>`.
- A hand-written query that returns rows decoded by a declared schema is the model for the raw escape hatch with a declared contract. Triplex already has this in `NativeQueryContract`.
- `@inverse` is the model for reverse `include`.
- `null` means "delete this optional value" on update [clone library/lens/update_helper.ts:79-80]. That suits `patch({ nickname: null })`, since `TripleValue` has no null.
- A single CONSTRUCT per page, decoded client-side, avoids one query per entity.

**What does not fit.**

| Issue | Evidence |
|-------|----------|
| No time of any kind. One optional `defaultGraph`. | [clone library/options.ts:13-22] |
| The `sparql` tag inserts a plain string as raw SPARQL text. A caller who interpolates user input into it has an injection hole. | [clone library/sparql/sparql_tag.ts:72-74] |
| Number typing guesses from the JS value (`Number.isInteger` picks `xsd:integer`, else `xsd:decimal`), so `1.0` becomes `xsd:integer`. | [clone sparql_tag.ts:77] |
| One OPTIONAL per optional property multiplies result rows; LDkit moved them into UNION branches to stop it (issue 175). A FILTER inside OPTIONAL is silently ignored (issue 170). | [clone query_builder.ts:125-135, 169-175] |
| When one value is expected and several exist, the decoder returns the first and says nothing. | [clone decoder.ts:195-199] |
| The query engine posts a raw string. There is no parameter protocol. | [clone library/engine/query_engine.ts:61-77] |
| Absent optional is `null` and absent array is `[]`. | [clone decoder.ts:124-134] |

**Borrow.** Document type derivation, declared-schema decoding of hand-written queries, inverse navigation, null-as-retract. Refuse the raw-string tag and the silent first-value choice.

### 3.2 Drizzle ORM (typed tables, `sql` tag, relational queries)

[Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) at `eab8bed`.

**Mechanism.**

- A table object is the physical name. `pgTable(name, columns)` stores `name` as the table name and a column's name is its key unless given [clone references/drizzle-orm/drizzle-orm/src/pg-core/table.ts:71-137]. An optional `casing` option maps keys to `snake_case` or `camelCase` [clone drizzle-orm/src/casing.ts:1-60].
- Interpolating `${users.name}` inside a `sql` template renders `"users"."name"`. The three interpolation kinds are separate: a plain value becomes a bound `Param`, a column or `sql.identifier` becomes a quoted identifier, and `sql.raw(text)` is spliced unchecked [clone drizzle-orm/src/sql/sql.ts:433, 478-495, 511, 551].
- `sql<T>` takes an unchecked type argument `T`. `mapWith(decoder)` attaches a per-fragment decoder [clone sql.ts:349-355]. `db.execute<TRow>` is also an unchecked type argument [clone pg-core/db.ts:615].
- `db.query.users.findMany({ with: { posts: { limit: 5 } } })` is typed from `relations()`. It compiles to one statement using `LEFT JOIN LATERAL` and `json_agg` per nested relation [clone pg-core/dialect.ts:1313-1380], so there is no N+1.

**Excerpt** [clone drizzle-orm/src/sql/sql.ts:478, pg-core/db.ts:615].

```ts
export function sql<T>(strings: TemplateStringsArray, ...params: any[]): SQL<T>;
execute<TRow extends Record<string, unknown> = Record<string, unknown>>(query: SQLWrapper | string): ...
```

**What fits Triplex.**

- The param / identifier / raw split is the right shape for the three tags, and it makes a safe default because the unsafe path is named explicitly.
- Because the ORM object and the physical name are the same thing, raw SQL over ORM tables "makes sense". The same principle applies if Triplex generates physical names deterministically from keys and shows them in traces.
- One statement for nested loading maps to XTDB's `NEST_MANY` and `NEST_ONE` [clone references/xtdb/docs/src/content/docs/reference/main/sql/queries.md:319-360].
- The typed `with` config is the model for `include`.

**What does not fit.**

- Drizzle assumes one physical table per entity with one column per attribute. Triplex has shared global attributes, per-type usage flags, many-valued attributes with per-value validity, and two clocks. A table per type cannot be exact (section 4.2.5).
- `sql<T>` and `execute<TRow>` trust the caller. Triplex's contract decodes at runtime.
- Relations are foreign-key columns. Triplex relations are `ref` attribute values with many assertions over time.
- There is no time dimension and no release-pinned schema. `drizzle-kit` migrations do not apply because the schema is an immutable release.

**Borrow.** Fragment kinds, a deterministic key-to-name function with an override map (Drizzle `casing`; the repo's `collections` override in `ConfigApi`), a `toSQL()` equivalent (Triplex traces already record the final query and parameters), single-statement nested loading.

### 3.3 Datascript and Datomic (entity API, pull, database values)

[Datascript](https://github.com/tonsky/datascript) at `34915cf`, and [Datomic](https://docs.datomic.com) documentation.

**Mechanism.**

- A schema map gives each attribute `:db/cardinality`, `:db/valueType :db.type/ref`, `:db/unique`, `:db/isComponent` [clone references/datascript/README.md:233-234].
- The entity API reads lazily. A cardinality-many attribute returns a set. A cardinality-one ref returns another entity. `:_attr` navigates backwards [clone src/datascript/impl/entity.cljc:20-27, 175-187]. Datomic's page says the same, and adds that entities are not meant as a mapping layer and are unsuitable for existence tests [web https://docs.datomic.com/reference/entities.html].
- `pull` takes a pattern. Map specs expand refs, `_` reverses, `:limit` bounds many-valued results (default 1000), `:default` fills gaps, and missing attributes are omitted from the result. Recursion returns only the id when it meets an entity it already saw [web https://docs.datomic.com/query/query-pull.html].
- Time is a database value. `d/as-of`, `d/since`, `d/history` and `d/filter` each take a db value and return a db value that every query and pull accepts unchanged [web https://docs.datomic.com/reference/filters.html]. Datascript has `filter` [clone src/datascript/core.cljc:247-263] and no history [clone README.md:278].

**Excerpt** [web https://docs.datomic.com/reference/filters.html; clone src/datascript/impl/entity.cljc:20-27].

```clojure
(def as-of-2014 (d/as-of db #inst "2014-01-01"))
(d/pull as-of-2014 '[*] [:item/id "DLC-042"])

(defn- entity-attr [db a datoms]
  (if (db/multival? db a)
    (if (db/ref? db a) (reduce #(conj %1 (entity db (:v %2))) #{} datoms)
                       (reduce #(conj %1 (:v %2)) #{} datoms))
    (if (db/ref? db a) (entity db (:v (first datoms))) (:v (first datoms)))))
```

**What fits Triplex.**

- A repository that closes over a basis (`repo.at({ recordedAt, validAt })`) is the same idea as a db value. It prevents a later call from drifting to "now".
- `include` with a nested shape is `pull`'s map spec. Missing attributes omitted (not `null`) is the document rule recommended in D5.
- Cardinality-many as an unordered set, reverse navigation, and cycle-safe expansion (id only on revisit) carry over directly.
- Triplex already has a batched `entities` call, which is what Datomic's peer cache gives the entity API for free.

**What does not fit.**

- Datomic has one time axis. Business time is an ordinary attribute there. Triplex needs `validFrom` and `validTo` on the assertion.
- Per-attribute lazy loading is cheap only where the cache is local. Against XTDB or QLever each lazy hop is a network call, so a lazy entity object would make N+1 the default.
- For a cardinality-one attribute with several datoms Datascript silently returns the first [clone entity.cljc:25-27]. Triplex does not enforce cardinality unless the host passes `enforce`, so the same silent choice would hide a violation.

**Borrow.** Basis-closed views, pull-style `include`, reverse navigation by name, `:limit` on many-valued includes, id-only recursion guard.

### 3.4 XTDB 2 data modeling

[XTDB](https://github.com/xtdb/xtdb) v2.2.0 at `c6c1962`, and its docs.

**Mechanism.**

- Tables are schemaless. Every row needs `_id`. Four temporal columns exist on every table: `_system_from`, `_system_to`, `_valid_from`, `_valid_to`. A row is one version of a record [clone references/xtdb/docs/src/content/docs/concepts/key-concepts.md:25-70].
- XTDB maintains a built-in `WITHOUT OVERLAPS` constraint so bitemporal rectangles of one `_id` never overlap [clone key-concepts.md, "Temporal Columns" section].
- Types are not declared. A column's type is the join of every type ever written, and a missing value and `NULL` are the same thing [clone docs/.../about/types-in-xtdb.md, "Schema evolution"].
- Naming. XTDB stores names in a normal form. The documented example is that `:foo.bar/baz-quux` in XTQL is `foo$bar$baz_quux` in SQL [clone docs/.../guides/clojure-sql-cookbook.md:55]. The implementation: replace `-` with `_`, treat `.`, `/`, `$` as segment separators joined by `$`, lowercase [clone api/src/main/kotlin/xtdb/util/NormalForm.kt:8-12]. A regular SQL identifier may contain `$` after its first character [clone core/src/main/antlr/xtdb/antlr/SqlLexer.g4:407]. A delimited identifier cannot contain `/` [clone SqlLexer.g4:409-412], so a raw `:person/name` could never be a SQL column even if quoted.
- Nesting. `NEST_MANY(subquery)` and `NEST_ONE(subquery)` return tree-shaped results in one statement [clone reference/main/sql/queries.md:319-360]. Aggregates take `FILTER (WHERE ...)`, and `ARRAY_AGG(x ORDER BY y)` exists from 2.2 [clone reference/main/stdlib/aggregates.md:14, 58-59].
- SQL can call XTQL, and a query basis is `SNAPSHOT_TOKEN` plus `CLOCK_TIME` [clone reference/main/sql/queries.md:388-412].
- The grammar has `CREATE TABLE` and DML, and no `CREATE VIEW` [clone core/src/main/antlr/xtdb/antlr/Sql.g4:21-62].
- Node. The driver examples use `postgres` (pgwire) with `fetch_types: false` and a custom int8 parser, and `sql(tableName)` for identifiers [clone references/xtdb-driver-examples/node/test/basic.test.mjs:1-40].

**Excerpt** [clone api/src/main/kotlin/xtdb/util/NormalForm.kt:8-12].

```kotlin
internal fun normalForm0(s: String): String = s
    .replace('-', '_')
    .replace(Regex("^xt/"), "_")
    .split('.', '/', '$')
    .joinToString(separator = "$")
    .lowercase()
```

**What fits Triplex.**

- The documented name mapping gives a deterministic, XTDB-endorsed way to put `:ns/name` into a SQL-visible column.
- `NEST_MANY` and `NEST_ONE` give single-statement `include` on XTDB.
- `FILTER` plus `ARRAY_AGG` give a pivot from assertions to a wide row without a stored table.

**What does not fit.**

- `WITHOUT OVERLAPS` plus one row per `_id` version cannot store two live card-one assertions for the same entity and attribute, which Triplex permits when `enforce` is not passed.
- A wide row version covers all columns for one valid-time interval, while Triplex intervals differ per attribute. Fragmenting is possible but loses assertion identity.
- Triplex valid time is a double with fractional milliseconds (the native-entry test uses `validFrom: 10.25`), while XTDB valid time is a timestamp [repo packages/xtdb/experiments/native-entry.ts, "typed-xtql-fractional-cut"].
- XTDB system time is assigned by XTDB. Triplex recorded time and commit position are assigned by the Triplex boundary. The handoff forbids equating them without proof.
- Because missing and `NULL` are the same in XTDB, raw SQL cannot tell an absent attribute from an explicit null. Triplex has no null value, so this is acceptable, but the contract must say so.

**Take.** Use XTDB's documented naming and nesting. Do not use XTDB's native temporal columns for Triplex time.

### 3.5 Bitemporal and provenance data on RDF

The question is how to attach valid time, recorded time and assertion identity to a fact and still leave a plain triple that ordinary SPARQL can match.

**Options compared.**

| Option | Plain triple exists? | Assertion identity | Time on the fact | Works on QLever 0.6 | Leak risk for a naive query |
|--------|----------------------|--------------------|------------------|---------------------|------------------------------|
| A. RDF 1.2 triple terms: `?r rdf:reifies <<( s p o )>>` plus annotations | Only if also asserted separately | The reifier | Annotation triples on the reifier | No. The pinned grammar has no triple-term or reifier rule `[clone references/qlever/src/parser/sparqlParser/generated/SparqlAutomatic.g4]` (grep for `reifiedTriple`, `tripleTerm`, `annotation` found nothing) | The separate plain triple is visible forever |
| B. Statement node (Wikidata style): `wd:Q p:P31 wds:... ; wds: ps:P31 value ; pq:... ; rank` plus a truthy `wdt:` triple | Truthy triple only, for the best-ranked value | The statement node | Qualifiers, ranks | Yes (ordinary triples) | `wdt:` shows the best value at a publish time, so it goes stale |
| C. Named graph per assertion: the plain triple inside `GRAPH <assertion-iri>`, metadata about the IRI in another graph | Yes, inside its own graph | The graph IRI | Metadata triples about the graph IRI | Yes (QLever supports quads and `GRAPH ?g`) `[clone references/qlever/README.md:17]` | A bare `{ ?s p ?o }` without `GRAPH` reads the union of all graphs |
| D. Singleton property: a unique predicate per assertion | No, the predicate differs for every fact | The predicate | Triples on the predicate | Yes, but see below | Not applicable |
| E. Timestamp-labelled quads (Temporal RDF) | Yes, with a label | Implicit | The label | Needs a 4th component | Needs a filter |

**Evidence.**

- RDF 1.2 Concepts is a W3C Candidate Recommendation Snapshot dated 2026-04-07. A triple term is a triple used as a term. The reifier is the subject of `rdf:reifies`, and the annotated triple is not asserted unless the same triple also appears on its own in the graph [web https://www.w3.org/TR/rdf12-concepts/]. Turtle's annotation syntax `:s :p :o {| :recorded "2021-07-07"^^xsd:date |}` both reifies and asserts [web https://www.w3.org/TR/rdf12-turtle/]. SPARQL 1.2 is a Working Draft dated 2026-11-01 and matches with `<<( ?s ?p ?o )>>` and `rdf:reifies` [web https://www.w3.org/TR/sparql12-query/].
- Wikidata keeps a statement node per statement with a rank, qualifiers (`pq:`) and references. It also publishes a `wdt:` shortcut triple that drops the qualifiers and exposes only the best non-deprecated rank [web https://www.mediawiki.org/wiki/Wikibase/Indexing/RDF_Dump_Format].
- Hernandez, Hogan and Kroetzsch compared standard reification, n-ary relations, singleton properties and named graphs on five engines. Singleton properties were the most compact representation, but four of the five engines struggled with the large number of distinct predicates they create, and one engine struggled with a large number of named graphs. There was no clear winner among standard reification, n-ary and named graphs [web https://iccl.inf.tu-dresden.de/w/images/5/52/Hernandez-Hogan-Kroetzsch-RDF-reification-evaluation-SSWS2015.pdf, Section 6, text extracted with `pdftotext`].
- Gutierrez, Hurtado and Vaisman argue for labelling triples with time (valid and transaction) instead of keeping a snapshot per version [web https://link.springer.com/content/pdf/10.1007/11431053_7.pdf, summarized from search results; the full text was not read].
- Fernandez, Umbrich, Polleres and Knuth classify archive storage as independent copies, change-based, timestamp-based and hybrid [web https://www.semantic-web-journal.net/node/1814]. OSTRICH stores snapshots plus delta chains with add and delete indexes and answers triple patterns at, between and across versions, but it is not a SPARQL engine [web https://ruben.verborgh.org/publications/taelman_jws_2019/]. Triplex's model is the timestamp-based family, so no engine can answer "what is true at T" from a bare pattern. Either a filter or a materialized snapshot is always required.
- TerminusDB mints instance IRIs from `@base` plus a key strategy (`Lexical`, `Hash`, `ValueHash`, `Random`, `UuidV7`) and class and property IRIs from `@schema` [web https://terminusdb.com/docs/schema-reference-guide]. Its commit layers are immutable deltas. The sources I could fetch for TerminusDB's commit layers and for Stardog's versioning were secondary or community posts, so treat those two as weak evidence.

**Conclusion for Triplex.**

- Reject D (singleton property). It is the option with documented engine trouble, and it breaks the requirement that the plain predicate is matchable.
- Option A is the future target but QLever 0.6 cannot read it. Design C so migration to A is mechanical: the graph IRI becomes the reifier IRI.
- Option B alone leaves no plain triple for non-best values, and its truthy triple is a published cut. Keep B's idea only as the optional "head" graph (D2).
- Option C is exact at any basis because nothing is published. The cost is one graph per assertion and a join from graph IRI to assertion node, both to be measured (P3).

### 3.6 Type-safe query builders and safe parameter binding in TypeScript

| Library | What it protects | How values are bound | Gaps for Triplex |
|---------|------------------|----------------------|------------------|
| [sparqljs](https://github.com/RubenVerborgh/SPARQL.js) at `91cbd01` | Generates text from a JSON AST. Literals are escaped (`"`, `\`, control chars) [clone references/sparqljs/lib/SparqlGenerator.js:279-299, 357-361]. | Inlined into the text. SPARQL has no bind protocol. | `encodeIRI` returns `<` + iri + `>` without checking the characters [clone SparqlGenerator.js:363-371], so an IRI term containing `>` injects. The README says the project is deprecated in favour of Traqula, which parses and generates SPARQL 1.1 and 1.2 [clone README.md:7-11]. |
| [@tpluscode/sparql-builder](https://github.com/tpluscode/sparql-builder) with [rdf-string](https://github.com/tpluscode/rdf-string) | A template tag that serializes each interpolated value by the syntax rules of the target format, and its README example renders a JS string as a literal [web https://github.com/tpluscode/rdf-string/blob/master/README.md]. | Inlined, serialized per RDF/JS term. | The README documents no raw escape hatch and says nothing on numbers, booleans or `Date`. I did not read its source. |
| [RDF/JS data model](https://rdf.js.org/data-model-spec/) | Term types (`NamedNode`, `BlankNode`, `Literal` with `datatype`, `Variable`, `DefaultGraph`, `Quad`) and `equals()`. | Not applicable. | It supplies the right currency for values entering a SPARQL builder. It does not serialize. |
| [Kysely](https://kysely.dev) | The `sql` tag sends `${}` values as parameters. `sql.ref`, `sql.table`, `sql.id` add identifiers. `sql.lit` and `sql.raw` splice text and are documented as unchecked [web https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html]. | Bound parameters. | `sql<T>` takes an unchecked type argument. |
| LDkit `sparql` tag | See 3.1. | Strings are raw text. | Injection-prone default. |
| Drizzle `sql` tag | See 3.2. | Values become `Param`. | `sql<T>` unchecked. |

**Excerpt** [clone references/sparqljs/lib/SparqlGenerator.js:363-371]. The IRI branch of the generator, which does no character check.

```js
Generator.prototype.encodeIRI = function (iri) {
  var prefixMatch = this._prefixRegex.exec(iri);
  if (prefixMatch) { /* ...prefixed form... */ }
  return '<' + iri + '>';
};
```

**Rule for Triplex.** The binding strategy follows the engine.

- XTDB SQL and XTQL: values go through `$n` parameters, as `ctx.bind` already does.
- SPARQL: the engine takes text, so the only safe values are RDF/JS-shaped terms serialized by Triplex code (the existing `ctx.literal`, `ctx.iri`, `ctx.entity`). A plain JS value is converted using the **declared parameter type** from the contract, not by guessing from the JS value (LDkit's mistake).
- Splicing is possible only through a `Fragment` object. `raw()` exists and is greppable.
- The existing guards are lexical (`readOnlyNativeSql`, `selectFragment`). A parse with Traqula (or sparqljs while it lasts) that asserts query type is a stronger SPARQL check.

---

## 4. Recommended physical naming

### 4.1 Rules for both engines

1. **Names derive from schema keys.** Attribute keys and entity type names are the inputs. TypeScript aliases never are, because renaming an alias must not rename stored data.
2. **One pure function per engine computes all names from a release.** `PhysicalSchema.compile(release)` follows the `ConfigApi` pattern: an override map, default derivation, and a hard failure on any collision that names both inputs.
3. **The same attribute has the same physical name everywhere.** `:common/created-by` is `common$created_by` in every entity relation that uses it. Requiredness and cardinality are properties of the usage, not of the name.
4. **Time and visibility are never part of a stored name.** They come from the basis-closed fragments (`facts()`, `entity()`, `values()`, `visible()`).
5. **Layouts are versioned.** A new layout gets a new mapping id in the trace (for example `triplex-xtdb/entity-shaped/2`), so old traces stay interpretable.
6. **Reserved names are never produced.** Anything beginning with `_`, `xt`, `tx_`, `pg_`, or equal to `information_schema`. The same check runs for RDF prefix labels (4.3.2).

### 4.2 XTDB

#### 4.2.1 Layer 1: canonical (unchanged)

Keep `tx_assertions` as it is. What changes is documentation of the contract raw authors may rely on.

| Column | Meaning |
|--------|---------|
| `id` | Assertion id (`TripleId`). The XTDB `_id` is `["scope","id"]` as JSON and is not part of the contract. |
| `scope_key` | Tenant. Every raw query must filter it, and `facts()` does. |
| `entity_id`, `entity_type` | Entity id string and the type tag on the assertion. |
| `attribute` | The verbatim key `':person/name'`, so the TypeScript key equals the stored value and is greppable. |
| `value_type` plus `value_string/number/boolean/datetime/json` | Typed carrier. Normally one carrier is non-null (`int64` is a decimal string in `value_string`; a blob uses `value_string` and `value_json`). |
| `valid_from`, `valid_to`, `recorded_at`, `recorded_position`, `retracted_at`, `retracted_position`, `tx_id`, `retract_tx_id` | Triplex time and journal coordinates. They are Triplex's, not XTDB's temporal columns. Every insert pins XTDB's native `_valid_from` to the epoch so a replaced row replaces its whole native lifetime `[repo XtdbStorageAdapter.ts:31-40]`. |

#### 4.2.2 Layer 2: three generated relations

| Fragment | Shape | Use |
|----------|-------|-----|
| `facts()` (exists) | One row per assertion visible at the basis, with the Layer 1 columns minus `scope_key`. | Anything about assertion identity or intervals. |
| `entity(Person)` (new) | One row per entity that has a `Person` assertion visible at the basis. Columns: `_id` plus one column per attribute the type uses. | Reading and filtering whole entities. |
| `values(Person.attributes.skills)` (new) | One row per visible value of one attribute. Columns: `_id`, `value`, `assertion`, `valid_from`, `valid_to`, `recorded_position`. | Joins on refs, many-valued attributes, interval questions for one attribute. |

All three are subquery sources, so the SDK renders them in place. The trace records the expanded text, which is how a reader who knows only SQL sees what ran.

#### 4.2.3 Name derivation

| Input | Output | Rule | Checked in `[ran]` |
|-------|--------|------|--------------------|
| `:person/name` | `person$name` | Strip `:`, apply XTDB normal form | yes |
| `:person/first-name` | `person$first_name` | `-` becomes `_` | yes |
| `:placement/worker` | `placement$worker` | same | yes |
| `:common/created-by` | `common$created_by` | same | yes |
| `Person` | `person` | PascalCase to snake_case, acronym aware | yes |
| `ProjectMember` | `project_member` | XTDB's own normal form alone would give `projectmember`, so Triplex snake-cases first | yes |
| `HTTPRoute` | `http_route` | acronym run splits before the last capital | yes |
| `W2Form` | `w2_form` | digit then capital splits | yes |
| entity id | `_id`, unchanged | The raw `EntityId` string | n/a |

**Collisions the compile must reject.** Both were reproduced in `[ran]` (`lab/research/R3-artifacts/physical-names.mjs`).

- Hyphen and underscore are equivalent under XTDB normal form, and the Triplex key regex allows both. `:person/first-name` and `:person/first_name` both become `person$first_name`. `:a-b/c` and `:a_b/c` both become `a_b$c`.
- Two entity type names can snake-case to one name: `ABTest` and `AbTest` both become `ab_test`.

**Relation names that are SQL reserved words.** `Order` becomes `order`. Generated text always quotes relation aliases, and raw authors choose their own alias (`FROM ${entity(Order)} o`).

#### 4.2.4 Cardinality, refs and value types

| Case | In `entity()` | In `values()` |
|------|---------------|---------------|
| Cardinality one, absent | `NULL`. XTDB treats a missing column and `NULL` as the same. | no row |
| Cardinality one, one live value | the value | one row |
| Cardinality one, more than one live value (a constraint violation Triplex permits without `enforce`) | `MAX(...) FILTER` picks a winner. The typed repository reports a `CardinalityViolation` when it decodes from facts. Raw users can request counts with `entity(Person, { counts: true })`, which adds `<col>__n`. | one row per value |
| Cardinality many | an array from `ARRAY_AGG(value ORDER BY value) FILTER (WHERE attribute = ...)`, empty array when none | one row per value |
| Ref | the target entity id string. Join with `ON t._id = p.person$employer`. | `value` is the target id |

| Triplex type | Carrier | Column type in `entity()` |
|--------------|---------|---------------------------|
| `text`, `date`, `enumOf`, `ref` | `value_string` | `VARCHAR`. A `date` stays `'YYYY-MM-DD'` text. |
| `number`, `integer` | `value_number` | `DOUBLE PRECISION` |
| `int64` | `value_string` (decimal) | `CAST(... AS BIGINT)`. The Node driver returns int8 as a string or bigint depending on its parser, and `hydrateNativeValue` already handles both [repo NativeQuery.ts:98-112]. |
| `boolean` | `value_boolean` (0 or 1) | `BOOLEAN` via `= 1` |
| `instant` | `value_datetime` (epoch ms, may be fractional) | `DOUBLE PRECISION` epoch ms. A `TIMESTAMP` view is offered only after probe P1 settles precision. |
| `json` | `value_json` | `VARCHAR` JSON text |
| `blob` | `value_string` plus `value_json` | not in `entity()`. Use `facts()`. |

**Illustrative expansion** of `entity(Person)` for `name` (one, required) and `skills` (many), SQL form. `[unverified]` against XTDB 2.2; probe P1 and P2 check it against the existing `facts()` oracle.

```sql
(SELECT f.entity_id AS _id,
        MAX(f.value_string) FILTER (WHERE f.attribute = $7)                  AS person$name,
        ARRAY_AGG(f.value_string ORDER BY f.value_string)
              FILTER (WHERE f.attribute = $8)                                AS person$skill
 FROM   (<facts() expansion, binds $1..$6>) f
 GROUP  BY f.entity_id
 HAVING COUNT(*) FILTER (WHERE f.entity_type = $9) > 0)
```

#### 4.2.5 Physical per-type tables: not as a source of truth

A table per entity type is what XTDB's own docs suggest and what raw XTQL authors expect (`(from :person [name])`). It is exact only when all of these hold, and none is proven:

1. Card-one is enforced for every attribute in the type, because `WITHOUT OVERLAPS` allows one value per `_id` per rectangle.
2. Triplex valid-time doubles map losslessly to XTDB valid time.
3. Triplex recorded position and time map to a XTDB system-time cut (the handoff forbids assuming this).
4. Retracting one attribute's assertion can be written as a valid-time rewrite that keeps assertion identity.

Offer it later as an optional maintained projection with a stated freshness position, never as the store that reads are checked against.

### 4.3 RDF (QLever)

#### 4.3.1 IRI scheme

| Thing | Default IRI | Notes |
|-------|-------------|-------|
| Attribute `:person/first-name` | `urn:triplex:attr:person:first-name` | prefix label `person:` bound to `urn:triplex:attr:person:`, so SPARQL reads `person:first-name`. Hyphen, underscore and digits are legal in a SPARQL prefixed-name local part, so no escaping is ever needed. A `/` would need `\/`, which is why the namespace and name are split at the prefix. |
| Entity type `Person` | `urn:triplex:type:Person` | prefix `type:` |
| Entity id `person:maria` | `urn:triplex:entity:person:maria` | prefix `entity:` and the encoding in 4.3.3 |
| Assertion | `urn:triplex:assertion:<b64url(id)>` | exists, `[repo rdf.ts:47]` |
| Scope graph | `urn:triplex:scope:<b64url(scope)>` | exists, `[repo rdf.ts:46]` |
| Engine fields | `urn:triplex:field:<column>` | exists. Treat as the private engine channel, `[repo rdf.ts:50]`. |
| Optional http scheme | `{base}attr/person/first-name`, `{base}type/Person`, `{base}entity/person:maria` | for publishing linked data. Same functions, different base. |

**Prefix labels are presentation.** The IRIs are the contract. The generated prologue binds `type`, `entity`, `assertion`, `field`, `rdf`, `xsd` for fixed kinds. If an attribute namespace equals one of those (for example `:entity/name`), its label becomes `entity_`. A derived prologue is a convenience; results never depend on a label.

#### 4.3.2 Typed literals

| Triplex type | RDF object | Exactness |
|--------------|------------|-----------|
| `text`, `enumOf` | plain `xsd:string` literal | exact |
| `date` | `"2026-01-01"^^xsd:date` | exact |
| `instant` | `"2026-01-01T00:00:00Z"^^xsd:dateTime` | exact to the lexical form. Sub-millisecond fractions are in the lexical form; QLever's inline `dateTime` precision is `[unverified]` (P5). |
| `boolean` | `xsd:boolean` | exact |
| `number` | `xsd:double` | QLever keeps doubles in 60 bits, so a double whose low four mantissa bits are non-zero is not exact natively. The repo already measures this: `numericShadowIsExact` is true only when `(low32 & 15) === 0` `[repo rdf.ts:83-89]`. Exact comparison uses the existing `_order` channel. |
| `integer` | `xsd:integer` | exact for safe integers |
| `int64` | `"9223372036854775807"^^xsd:long` | exact in the lexical form. QLever parses `xsd:long` as an integer datatype `[clone references/qlever/src/parser/RdfParser.h:165-177]` and encodes natively only within about ±2^59 (the repo's limit, `[repo rdf.ts:249]`). Behaviour beyond that is P5. |
| `ref` | the target entity IRI | exact |
| `json` | `"..."^^rdf:JSON` (the datatype JSON-LD 1.1 defines) with the canonical JSON text already produced by `canonicalJson` | exact |
| `blob` | not published as a plain triple | use the assertion node |

#### 4.3.3 Entity IRI encoding

Entity ids are arbitrary strings, so the encoding must be injective and canonical. The rule, verified in `[ran]` (`physical-names.mjs`: round trip on 14 representative ids, injectivity over all 7,380 strings up to length 4 over a 9-symbol alphabet including `%`, `/`, `.`, `-`, `:`, space and a non-ASCII letter, rejection of the empty string and of lone surrogates):

1. Reject empty ids and ids that are not well-formed Unicode (the repo already requires this for QLever text [repo rdf.ts:38-44]).
2. Encode the id as UTF-8 and keep only `A-Z a-z 0-9 _ :`, plus `-` when not first and `.` when neither first nor last. Encode every other byte as `%` plus two **uppercase** hex digits. Never encode a kept character.
3. The decoder accepts only canonical forms (uppercase hex, no encoded safe characters), so one id has exactly one IRI.

| Id | IRI segment |
|----|-------------|
| `worker:maria` | `worker:maria` |
| `case:01J9XYZABC` | `case:01J9XYZABC` |
| `a/b c` | `a%2Fb%20c` |
| `100%` | `100%25` |
| `é/ü` | `%C3%A9%2F%C3%BC` |
| `-lead` | `%2Dlead` |
| `trail.` | `trail%2E` |
| `.` and `..` | `%2E` and `%2E%2E` |
| `x~y` | `x%7Ey` |
| `emoji:😀` | `emoji:%F0%9F%98%80` |

The kept set is chosen so the segment is also a legal local part in a prefixed name (`entity:worker:maria`) without backslash escapes, and the result is never a dot segment. `encodeURIComponent` is not usable here because it leaves `~ ! ' ( ) *` unencoded, which breaks the prefixed-name rule for `~` and quoting for `'`.

#### 4.3.4 The plain triple, the class, and the assertion node

Per assertion, additive to what is written today:

```trig
# scope graph <urn:triplex:scope:dGVzdA>   (existing field triples, plus one new)
<urn:triplex:assertion:QUJD>
    field:entity        entity:person:maria ;          # NEW, IRI-valued, joins to the plain triple
    field:entity_id     "person:maria" ;               # existing, literal
    field:attribute     ":person/name" ;               # existing
    field:value_type    "string" ;  field:value_string "Maria" ;
    field:valid_from    "1767225600000" ;  field:recorded_position "42" ;
    ... .                                              # existing columns and numeric shadows

# assertion graph <urn:triplex:assertion:QUJD>   (NEW, two triples)
GRAPH <urn:triplex:assertion:QUJD> {
    entity:person:maria  person:name  "Maria" ;
                         a            type:Person .    # only when the assertion has an entity type
}
```

- **Assertion identity** is the graph IRI. It is also the subject of the engine fields, so a join on `?a` links the plain triple to its validity, recording and retraction.
- **Reserved namespaces** (`:_tx/`, `:triplex/`, `_triplex/` entities) are not published as plain triples by default, since the journal envelope is stored as ordinary assertions (141 triples for one user assertion in R4's count).
- **Added volume** is three triples and one graph per published assertion, against roughly two dozen triples per assertion today (counted from `rowFields`, not measured on an index). The one-graph-per-assertion cost at 100 million assertions is unmeasured (P3).

**A SPARQL author's view.**

```sparql
PREFIX person:  <urn:triplex:attr:person:>
PREFIX company: <urn:triplex:attr:company:>

SELECT ?name ?company WHERE {
  GRAPH ?a1 { ?p person:name     ?name }  ${visible("?a1")}
  GRAPH ?a2 { ?p person:employer ?c    }   ${visible("?a2")}
  GRAPH ?a3 { ?c company:name    ?company } ${visible("?a3")}
}
```

`visible("?a")` expands to the existing basis filter block that `NativeContext.visible()` already writes (recorded position cut, valid interval, retraction), applied to the assertion node in the scope graph [repo NativeContext.ts:76-90]. A SPARQL reader sees plain triples in graphs and an obvious filter. The trace shows the expanded text.

`CONSTRUCT { ?s ?p ?o } WHERE { GRAPH ?a { ?s ?p ?o } visible(?a) }` exports a plain RDF dataset at any basis. That export is the interoperability path and is exact.

#### 4.3.5 What is deliberately not done

- **No bare-pattern read.** A bare `{ ?p person:name ?n }` (outside `GRAPH`, no `FROM`) in QLever reads across graphs: outside `GRAPH` clauses the active default graphs are used, and unconstrained means all graphs `[clone references/qlever/src/engine/QueryPlanner.h:31-36, 776-778; src/parser/DatasetClauses.h:44-48]` (read, not run, P4). It returns every assertion ever made, for every tenant.
- **No `FROM <scope>` injection.** With `FROM` and no `FROM NAMED` the dataset's named-graph set is empty under SPARQL 1.1 section 13.2 (QLever's `DatasetClauses.h:44-48` mirrors the default-graph half of that rule; the named-graph half is part of P4), so the assertion graphs would vanish. Isolation comes from the join to the scope graph inside `visible()`. A bare `GRAPH ?a { ... }` still reads other tenants' plain triples, so physical tenant isolation (one QLever index per tenant) or a host-level boundary stays necessary. Authorization is host-owned in Triplex already `[repo docs/agents.md, anti-pattern table]`.
- **No published "head" graph yet.** It needs a staleness mechanism that follows write commits and valid-time boundaries (`nextTemporalBoundary`). Decide after P3 (D2).

### 4.4 One entity end to end

```ts
const Company = EntityType.make("Company", {
  attributes: { name: Attribute.use(Attribute.text(":company/name"), { required: true }) },
});
const Person = EntityType.make("Person", {
  attributes: {
    name:     Attribute.use(Attribute.text(":person/name"), { required: true }),
    age:      Attribute.use(Attribute.integer(":person/age")),
    skills:   Attribute.use(Attribute.text(":person/skill"), { cardinality: "many" }),
    employer: Attribute.use(Attribute.ref(":person/employer", Company)),
  },
});
```

Facts: `person:maria` named "Maria", age 34, skills "rust" and "sql", employer `company:acme` valid from 2026-03-01. `company:acme` named "Acme".

| Engine | What a raw reader sees |
|--------|------------------------|
| XTDB Layer 1 | Five rows in `tx_assertions` for `person:maria` and one for `company:acme`, for example `(entity_id='person:maria', attribute=':person/skill', value_string='rust', valid_from=...)`. |
| XTDB Layer 2 | `entity(Person)` row `(_id='person:maria', person$name='Maria', person$age=34, person$skill=['rust','sql'], person$employer=null)` at `validAt = 2026-02-01`, and the same row with `person$employer='company:acme'` at `validAt = 2026-04-01`. |
| RDF Layer 1 | Assertion nodes under `<urn:triplex:scope:...>`. |
| RDF Layer 2 | `GRAPH <assertion-of-name> { entity:person:maria person:name "Maria" ; a type:Person }`, and likewise one graph for each skill, the age, and the employer (`person:employer entity:company:acme`). |

### 4.5 Compile-time checks (release publish)

`PhysicalSchema.compile(release)` fails, naming both inputs, on:

1. Two attribute keys with equal XTDB normal form.
2. Two entity types with equal snake-case relation name, or an override that equals a reserved name.
3. Two attribute namespaces whose RDF prefix labels collide after reserved-label renaming (informational only; IRIs never collide).
4. An attribute used by an entity type under two aliases (already rejected by `EntityType.make` [repo EntityType.ts:88-92]).
5. A key or entity-type name that would produce an empty or reserved identifier.

---

## 5. TypeScript API sketch

### 5.1 What exists and what changes

**Reuse as is.**

- `Triples` (transact, entity, entities, entityPage, match, history, Datalog) is the engine-neutral read and write surface.
- `TemporalBasis`, `TransactOp`, `TransactionMeta`, `ReadError`.
- `NativeQueryContract`, `NativeReadOptions`, `NativeReadResult`, the engine `run()` pipelines with budgets, cancellation, trace and declared-row decoding.
- The XTDB and QLever contexts (`facts`, `bind`, `attribute`; `fact`, `iri`, `literal`, `entity`).
- `ConfigApi`'s release-to-descriptor compile and `EntityCodec` (extract to core).

**Change in core.** Required for precise types. The sketch defines `Handle` and `Model` itself as stand-ins for these two changes, so core must produce types of that shape before `Doc`, `Include` and `Input` can be derived from a real `EntityType`.

1. Keep literal usage flags: `Attribute.use` returns a type carrying `required: true | false` and `cardinality: "one" | "many"`, and `EntityType` handles carry them.
2. `Attribute.ref` records the target entity type name in its type.

**New.**

- `PhysicalSchema.compile` (section 4.5).
- `Repository` and `Writer` (below).
- The tagged-template layer and `contract` helper (below).
- `entity()`, `values()`, `col()` fragments in the XTDB context, and `visible()`, `shape()` helpers in the QLever context.
- A QLever write path that adds the assertion graph and `field:entity` (after probes P3 to P6).

### 5.2 The sketch

Type-checked with `tsc` 6.0.2 against `packages/core/dist` declarations, including `@ts-expect-error` checks in `usage.ts`. Files: `lab/research/R3-artifacts/api-sketch.ts`, `usage.ts`, `tsconfig.json`. Run from the repo root: `node_modules/.bin/tsc -p lab/research/R3-artifacts/tsconfig.json`.

```ts
import type { Effect } from "effect";
import type { EntityId, TemporalBasis, TransactOp, TransactionMeta, TransactionResult } from "@triplex-build/triplex";
import type { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import type { NativeQueryContract, NativeReadOptions, NativeQueryTrace, ReadError } from "@triplex-build/triplex/runtime";

// 1. Models keep literal usage flags (CORE-CHANGE)
export type Cardinality = "one" | "many";
export interface Handle<
  D extends Attribute.AnyDefinition = Attribute.AnyDefinition,
  Req extends boolean = boolean,
  Card extends Cardinality = Cardinality,
  RefTo extends string = never, // CORE-CHANGE: Attribute.ref records the target entity type name
> {
  readonly key: D["key"];
  readonly definition: D;
  readonly required: Req;
  readonly cardinality: Card;
  readonly refTarget?: RefTo;
}
export interface Model<N extends string = string, H extends Readonly<Record<string, Handle<any, boolean, Cardinality, any>>> = Readonly<Record<string, Handle<any, boolean, Cardinality, any>>>> {
  readonly entityType: N;
  readonly attributes: H;
}
export type AnyModel = Model<string, Readonly<Record<string, Handle<any, boolean, Cardinality, any>>>>;
export type Models = Readonly<Record<string, AnyModel>>; // resolves include targets by entity type name

// 2. Documents: absent optional = property missing; many = always an array
type ValueOfHandle<H> = H extends Handle<infer D, any, infer C, any>
  ? C extends "many" ? ReadonlyArray<Attribute.ValueOf<D>> : Attribute.ValueOf<D>
  : never;
type AlwaysPresent<A> = {
  [P in keyof A]: A[P] extends Handle<any, true, "one", any> ? P : A[P] extends Handle<any, boolean, "many", any> ? P : never;
}[keyof A];
type MaybeAbsent<A> = Exclude<keyof A, AlwaysPresent<A>>;
export type Doc<M extends AnyModel> = {
  readonly $id: EntityId;
  readonly $type: M["entityType"];
} & { readonly [P in AlwaysPresent<M["attributes"]>]: ValueOfHandle<M["attributes"][P]> }
  & { readonly [P in MaybeAbsent<M["attributes"]>]?: ValueOfHandle<M["attributes"][P]> };

type RefTargetName<H> = H extends Handle<any, any, any, infer T> ? ([T] extends [never] ? never : T) : never;
export type Include<M extends AnyModel> = {
  readonly [P in keyof M["attributes"] as [RefTargetName<M["attributes"][P]>] extends [never] ? never : P]?:
    true | { readonly limit?: number };
};
export type Expanded<M extends AnyModel, All extends Models, I> = Omit<Doc<M>, keyof I & string> & {
  readonly [P in keyof I & keyof M["attributes"]]: RefTargetName<M["attributes"][P]> extends keyof All
    ? M["attributes"][P] extends Handle<any, any, "many", any>
      ? ReadonlyArray<Doc<All[RefTargetName<M["attributes"][P]>]>>
      : Doc<All[RefTargetName<M["attributes"][P]>]> | undefined
    : never;
};

// 3. Reads: a repository is a view with a closed basis
export interface Basis {
  readonly recordedAt?: number;
  readonly recordedPosition: number; // exact commit cut shared by every page and include
  readonly validAt: number;
}
export type Predicate<V> =
  | V
  | { readonly in: ReadonlyArray<V> }
  | { readonly exists: boolean }
  | (V extends number ? { readonly gt?: V; readonly gte?: V; readonly lt?: V; readonly lte?: V } : never)
  | (V extends string ? { readonly startsWith: string } : never);
export type Where<M extends AnyModel> = {
  readonly [P in keyof M["attributes"]]?: Predicate<Attribute.ValueOf<M["attributes"][P]["definition"]>>;
};
export interface FindArgs<M extends AnyModel, I extends Include<M>> {
  readonly where?: Where<M>;
  readonly include?: I;
  readonly orderBy?: keyof M["attributes"] | "$id";
  readonly limit?: number;   // default 100, max 1000, as Triples.query
  readonly cursor?: string;  // opaque; binds scope, basis and commit position
}
export interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor?: string;
  readonly basis: Basis;
}
export interface Assertion<V = unknown> {
  readonly id: string; readonly attribute: string; readonly value: V;
  readonly validFrom: number; readonly validTo?: number;
  readonly recordedAt: number; readonly retractedAt?: number; readonly txId?: string;
}
export interface Repository<M extends AnyModel, All extends Models> {
  readonly model: M;
  readonly at: (basis: TemporalBasis) => Repository<M, All>; // closed view; cannot drift to "now"
  readonly get: <const I extends Include<M> = {}>(id: EntityId | string, opts?: { include?: I }) =>
    Effect.Effect<Expanded<M, All, I> | undefined, ReadError>;
  readonly getMany: (ids: ReadonlyArray<EntityId | string>) => Effect.Effect<ReadonlyArray<Doc<M> | undefined>, ReadError>; // Triples.entities
  readonly find: <const I extends Include<M> = {}>(args?: FindArgs<M, I>) => Effect.Effect<Page<Expanded<M, All, I>>, ReadError>;
  readonly count: (where?: Where<M>) => Effect.Effect<number, ReadError>;
  readonly timeline: <K extends keyof M["attributes"]>(id: EntityId | string, attribute: K) => // the only interval-aware read
    Effect.Effect<ReadonlyArray<Assertion<Attribute.ValueOf<M["attributes"][K]["definition"]>>>, ReadError>;
}

// 4. Writes build ops; one application command is one transact
export interface ValidTime { readonly validFrom?: number; readonly validTo?: number }
export interface WritePlan {
  readonly ops: ReadonlyArray<TransactOp>;
  readonly preconditions: NonNullable<TransactionMeta["preconditions"]>;
}
type MustSupply<A> = { [P in keyof A]: A[P] extends Handle<any, true, Cardinality, any> ? P : never }[keyof A];
export type Input<M extends AnyModel> = {
  readonly [P in MustSupply<M["attributes"]>]: ValueOfHandle<M["attributes"][P]>;
} & { readonly [P in Exclude<keyof M["attributes"], MustSupply<M["attributes"]>>]?: ValueOfHandle<M["attributes"][P]> };
/** undefined leaves an attribute alone. null retracts the live assertions of an optional single-valued attribute. */
export type Patch<M extends AnyModel> = {
  readonly [P in keyof M["attributes"]]?: ValueOfHandle<M["attributes"][P]> | (M["attributes"][P] extends Handle<any, false, "one", any> ? null : never);
};
export interface Writer<M extends AnyModel> {
  readonly create: (id: EntityId | string, input: Input<M>, time?: ValidTime) => WritePlan; // pure
  readonly patch: (id: EntityId | string, patch: Patch<M>, time?: ValidTime) => Effect.Effect<WritePlan, ReadError>; // reads live fact ids, adds EntityState precondition
  readonly addValue: <K extends keyof M["attributes"]>(id: EntityId | string, key: K, value: Attribute.ValueOf<M["attributes"][K]["definition"]>, time?: ValidTime) => WritePlan;
  readonly removeValue: <K extends keyof M["attributes"]>(id: EntityId | string, key: K, value: Attribute.ValueOf<M["attributes"][K]["definition"]>) => Effect.Effect<WritePlan, ReadError>;
}
/** Merges plans, pins configSnapshot, derives `enforce` from the same release, calls Triples.transact once. */
export declare const commit: (
  plans: ReadonlyArray<WritePlan>,
  meta: { readonly actor: string; readonly commandId: string; readonly correlationId?: string; readonly causationId?: string },
) => Effect.Effect<TransactionResult, ReadError>;

// 5. Native escape hatches on top of the existing contract and builders
export interface Codec<T> { readonly type: TypeExpr.TypeExpr; readonly optional: boolean; readonly _T?: T }
export interface TypedContract<P, R> extends NativeQueryContract { readonly _P?: P; readonly _R?: R }
type CodecValue<C> = C extends Codec<infer T> ? T : never;
type OptionalKeys<S> = { [K in keyof S]: S[K] extends { readonly optional: true } ? K : never }[keyof S];
type FromCodecs<S> = { readonly [K in Exclude<keyof S, OptionalKeys<S>>]: CodecValue<S[K]> } & { readonly [K in OptionalKeys<S>]?: CodecValue<S[K]> };
export declare const T: {
  readonly text: Codec<string>;
  readonly number: Codec<number>;
  readonly int64: Codec<{ readonly type: "integer"; readonly value: string }>;
  readonly boolean: Codec<boolean>;
  readonly instant: Codec<number>;
  readonly entityId: Codec<EntityId>;
  readonly optional: <A>(c: Codec<A>) => Codec<A> & { readonly optional: true };
  readonly attr: <H extends Handle>(h: H) => Codec<ValueOfHandle<H>>; // row type derived from the schema handle
};
export declare const contract: <const PS extends Readonly<Record<string, Codec<any>>>, const RS extends Readonly<Record<string, Codec<any>>>>(spec: {
  readonly name: string; readonly params: PS; readonly row: RS;
}) => TypedContract<FromCodecs<PS>, FromCodecs<RS>>;

export type Lang = "xtql" | "xtdb-sql" | "sparql";
/** Text can be spliced only through a Fragment. Plain JS values are always bound. */
export interface Fragment<L extends Lang> { readonly _tag: "Fragment"; readonly lang: L; readonly render: (ctx: unknown) => string }
export type Part<L extends Lang> = Fragment<L> | string | number | bigint | boolean | Date | { readonly type: "integer"; readonly value: string } | null;
export interface NativeResult<R> { readonly rows: ReadonlyArray<R>; readonly basis: Basis & { readonly scope: string }; readonly trace: NativeQueryTrace }
export type Tag<L extends Lang, R> = (strings: TemplateStringsArray, ...parts: ReadonlyArray<Part<L>>) => Effect.Effect<NativeResult<R>, ReadError>;
export interface FragmentsFor<L extends Lang> {
  readonly facts: () => Fragment<L>;           // exists: ctx.facts()
  readonly recordedFacts: () => Fragment<L>;   // exists: ctx.recordedFacts()
  readonly history: () => Fragment<L>;         // exists: ctx.history()
  readonly entity: (m: AnyModel, opts?: { readonly counts?: boolean }) => Fragment<L>; // new: wide relation, one row per entity
  readonly values: (h: Handle) => Fragment<L>;     // new: narrow relation, one row per value
  readonly col: (h: Handle) => Fragment<L>;        // physical column (XTDB) or predicate IRI (SPARQL)
  readonly raw: (trustedText: string) => Fragment<L>; // explicit opt-out
}
export interface NativeEngine<L extends Lang> extends FragmentsFor<L> {
  readonly query: <P, R>(c: TypedContract<P, R>, input: P, opts?: NativeReadOptions) => Tag<L, R>;
}
export interface Native {
  readonly xtql: NativeEngine<"xtql">;
  readonly sql: NativeEngine<"xtdb-sql">;
  readonly sparql: NativeEngine<"sparql">;
}
```

### 5.3 Using it

```ts
// Reads. One closed basis serves the page and every include.
const asOf = people.at({ recordedAt: decisionReceipt.instant, validAt: Date.parse("2026-02-15") });
const page = yield* asOf.find({
  where: { name: { startsWith: "Ma" }, age: { gte: 18 } },
  include: { employer: true },
  limit: 50,
});
page.items[0]?.employer?.name;         // string | undefined, typed from the Company model
page.basis.recordedPosition;           // reuse for the next page and for raw queries

// Writes. One command, one transact.
const plan = yield* writer.patch(maria, { age: 35, employer: null }, { validFrom: Date.parse("2026-06-01") });
yield* commit([plan, ...otherPlans], { actor: "hr-app", commandId: `promote/${requestId}` });

// Raw SQL with a declared contract. Row type comes from the handles.
const ByName = contract({
  name: "people/by-name@1",
  params: { name: T.text },
  row: { id: T.entityId, name: T.attr(Person.attributes.name), age: T.optional(T.attr(Person.attributes.age)) },
});
const { rows, trace } = yield* native.sql.query(ByName, { name: "Maria" })`
  SELECT p._id AS id, p.${native.sql.col(Person.attributes.name)} AS name,
         p.${native.sql.col(Person.attributes.age)} AS age
  FROM   ${native.sql.entity(Person)} p
  WHERE  p.${native.sql.col(Person.attributes.name)} = ${"Maria"}`;   // bound as $n, never spliced
```

How the tag compiles: `strings` and `parts` become a `(ctx, params) => string` builder. A `Fragment` part calls `render(ctx)`. A JS value part calls `ctx.bind(v)`, which already returns `$n` for SQL and `triplex_param_n` for XTQL. For SPARQL a value part is serialized with `ctx.literal` using the datatype of the matching contract parameter. The result goes through the unchanged `run()` in `packages/xtdb/src/native/NativeQueries.ts:36` and its QLever twin.

### 5.4 How each part maps to the engines

| API | Engine-neutral first implementation | Native pushdown later |
|-----|-------------------------------------|------------------------|
| `get`, `getMany` | `Triples.entity`, `Triples.entities` (batched, order and missing entries preserved), membership check on `entityType` like `EntityStore` | none needed |
| `find` | Datalog query for ids (`find: ["?e"]`, one clause per `where` entry, ordered by `?e` for a stable cursor), then `Triples.entities` for bodies | XTDB: one SQL over `entity(Model)`. QLever: one SELECT with `shape()` |
| `include` | One `Triples.entities` call per include level, over the distinct ref ids of the parent page, same basis | XTDB: `NEST_ONE`/`NEST_MANY`. QLever: a CONSTRUCT per page decoded client-side (LDkit style) with UNION branches to avoid row multiplication |
| reverse include | A Datalog query with the ref attribute and `?target in ids`, batched | XTDB: `values(attr)` join. QLever: `GRAPH ?a { ?x attr ?t }` with `VALUES ?t` |
| `at(basis)` | Resolve once, hold `recordedPosition` | same |
| `timeline` | `Triples.history` filtered by attribute | `facts()` / `history()` |
| writes | `TransactOp` builders and one `Triples.transact` | none |

### 5.5 Suggested build order

1. **Core.** Literal-preserving `use` and handles, ref target name, `PhysicalSchema.compile` with the collision checks and the vectors from `physical-names.mjs`. No engine needed.
2. **Repository and Writer over `Triples`.** Works on KV, SQLite, PostgreSQL, XTDB and QLever backends already.
3. **Tag layer over the existing native builders.** `contract`, `Fragment`, `col`, `values`, `entity` for XTDB. Use a new mapping id. Leave Layer 1 untouched.
4. **QLever plain-triple layer.** Only after probes P3 to P6.
5. **Optional:** head graph for RDF, projection tables for XTDB. Each needs its own freshness and exactness evidence.

---

## 6. Pitfalls

| # | Pitfall | Where it bites | Mitigation |
|---|---------|----------------|------------|
| 1 | **N+1.** A lazy entity object (Datomic, Datascript) or one query per ref. | `include`, reverse include, `getMany` loops. | Level-batched `Triples.entities` first. XTDB `NEST_*`. QLever single CONSTRUCT. Cap include depth and use an id-only recursion guard as in Datomic pull. |
| 2 | **Row multiplication.** One OPTIONAL per optional property multiplies rows (LDkit issue 175). A FILTER inside OPTIONAL does not remove rows (issue 170). | Any generated SPARQL with several optional or many-valued attributes. | UNION branches or per-attribute subqueries. Test generated queries with two many-valued attributes. |
| 3 | **Cardinality-many.** Sets have no order. A per-value validity interval means one value can be valid while another is not. Joining two many-valued attributes multiplies rows. Empty versus absent. | `Doc` arrays, `entity()` arrays, `where` on a many-valued attribute (any value matches). | Always an array, sorted by canonical value. `values()` for joins. `timeline()` for intervals. |
| 4 | **Cardinality-one violations are hidden.** Datascript and LDkit take the first value. A pivot with `MAX` picks one. | Reads when `enforce` was not passed on a past write. | The typed layer decodes from facts and reports `CardinalityViolation`. Raw `entity(…, { counts: true })` exposes counts. |
| 5 | **Null versus absent.** XTDB treats missing and `NULL` as one. SPARQL has unbound variables. LDkit uses `null` and `[]`. Datomic pull omits. Triplex has no null value. | Row contracts, patch semantics, JSON `null` inside a `json` attribute. | Documents omit absent properties. The row contract marks optional columns explicitly (`T.optional`). `null` is only a `patch` instruction. |
| 6 | **Temporal leakage into raw queries.** A plain `SELECT` on `tx_assertions` returns every assertion, retracted ones included, for all tenants. A bare SPARQL pattern reads every graph. A published head graph can be stale. | Anyone who bypasses fragments. | Fragments are the documented path. Optionally refuse text that names Layer 1 identifiers (`tx_assertions`, `urn:triplex:field:`) unless it comes through `raw()`. Every result carries its resolved basis. |
| 7 | **IRI encoding of arbitrary ids.** `encodeURIComponent` mismatch, double encoding, case of hex digits, leading or trailing dot, `~`, lone surrogates, very long ids, dot segments. | Entity IRIs, `ctx.entity()`. | The single canonical encoder and decoder in 4.3.3. Length cap. Never build entity IRIs by string concatenation. |
| 8 | **Name collisions.** `-` and `_` are one character under XTDB normal form. `ABTest` and `AbTest` snake-case alike. Relation names such as `order` are SQL reserved words. | Release publish, generated SQL. | `PhysicalSchema.compile` fails with both inputs named. Always quote generated aliases. |
| 9 | **Numeric precision.** QLever inlines doubles with 60 bits. Integers beyond about ±2^59 are not native. `-0` and fractional milliseconds need exact channels. Node returns int8 as string or bigint. XTDB columns widen to unions. | Plain triples, `number` and `int64` attributes, instants. | Keep the `_order` and lexical channels as the exact path. State which plain-triple datatypes are exact (4.3.2). Decode `int64` through `hydrateNativeValue`. |
| 10 | **Injection.** LDkit's tag splices strings. `sparqljs.encodeIRI` does not validate. `sql.raw` style helpers splice anything. QLever has no bind protocol. | Raw tags, IRI construction. | Values are bound or serialized by Triplex code, IRIs pass the existing absolute-IRI regex, `raw()` is explicit. Parse generated SPARQL to assert it is a query. |
| 11 | **Tenant isolation.** XTDB: every tenant shares `tx_assertions`, isolated by `scope_key`. QLever: isolation is the scope graph. A bare `GRAPH ?a` reads other tenants' plain triples. | Direct psql or SPARQL console use. | Host-level boundary and, for QLever, one index per tenant when isolation matters. `FROM` injection does not work (4.3.5). |
| 12 | **Aliases versus keys.** Renaming a TypeScript alias is harmless. Renaming an attribute key is a data migration. Reusing one key in two entity types shares data on purpose. | Refactors. | Physical names derive from keys only. Document that key renames need a migration. |
| 13 | **Equating clocks.** Mapping Triplex recorded time to XTDB system time, or Triplex valid time to XTDB valid time, is not exact today. | Any native-temporal "optimization". | Keep Layer 1 on Triplex columns. Treat native-temporal projections as separate, gated work (4.2.5). |
| 14 | **Pagination and includes at different bases.** Included rows read at "now" while the page is at an old cut. | `find` with `include`. | One `Basis` with `recordedPosition` flows through every read. A page carries it, a cursor binds it. |
| 15 | **Row budgets.** `maxRows` caps native reads. Include fan-out can exceed it. | Large includes through native paths. | Per-include limits (`{ limit }`) and the existing "no partial answer" failure. |

---

## 7. Open questions and probes

Each probe has a falsifier. None was run in this study because no engine was started.

| Id | Question | Method | Falsifies the design if |
|----|----------|--------|--------------------------|
| P1 | Does XTDB 2.2 accept `person$name` as an unquoted SQL identifier and as an XTQL symbol through pgwire (postgres.js), with and without quotes? Does a `TIMESTAMP` view of fractional epoch ms keep the value? | Create a table with `RECORDS {_id: 1, person$name: 'x'}`; select it in SQL and in `XTQL(...)`. | Either spelling is rejected, or the Node driver rewrites `$`. |
| P2 | Does the `entity()` expansion in 4.2.4 return the same rows as the `facts()` oracle at several bases (before and after a correction, at a half-open boundary), and what does it cost at 1M assertions compared with `facts()`? Does `MAX ... FILTER` work on text and double columns? | Run both on the native-entry fixture, compare row sets. | Any row differs, or latency is more than a small multiple of `facts()`. |
| P3 | What does one named graph per assertion cost in QLever 0.6 (index build time, memory, `GRAPH ?a` joined to the scope graph) at 1M and 100M assertions? Is `INSERT { GRAPH ?g { ... } } WHERE { VALUES (?g ?s ?p ?o) { ... } }` accepted? | Synthetic load against the existing writer. | The update form is rejected, or build and query cost grow worse than linearly. |
| P4 | Is the implicit default graph the union of all graphs, and does `GRAPH ?g` bind the default graph as well? | Two small graphs, then a bare pattern and a `GRAPH ?g` pattern. | The source reading in 4.3.5 is wrong. |
| P5 | What does QLever 0.6 return for `xsd:long` beyond ±2^59, for doubles with non-zero low mantissa bits, for `-0`, and for `dateTime` with fractional milliseconds? | Insert and select the literals. | The plain-triple objects lose information the lexical channel would keep. |
| P6 | Do percent-encoded, colon-containing, IRIs of 1 to 2 KB work in SPARQL text, in prefixed form, and as vocabulary entries? | Insert and select with `entity:` prefix. | A legal encoded IRI fails to parse or compare. |
| P7 | How often do real catalogs collide under XTDB normal form? | Run `PhysicalSchema.compile` over `docs/snippets`, `examples/`, and Onboarded schemas. | Collisions are common enough to justify banning `_` in new keys (D3). |
| P8 | Do arrays, int8 and numeric from pgwire decode through `hydrateNativeValue` and the `List` case of `decodeNativeRows`? | Select `ARRAY_AGG` and `BIGINT` through postgres.js with the existing client options. | Arrays arrive as the PostgreSQL text form (the driver example needs a `parsePgArray` helper). |

---

## 8. Sources

**Repository.** Files cited inline by path and line. Another agent's output at `lab/research/R4-test-outputs/` is cited for the triple count and is uncommitted.

**Pinned clones** (`references/MANIFEST.json`): LDkit `09fc801`, Drizzle ORM `eab8bed`, Datascript `34915cf`, XTDB `c6c1962` (v2.2.0), QLever `6c5861a` (v0.6.0), sparqljs `91cbd01`, xtdb-driver-examples `e8c4c3f`.

**Web.**

- [Datomic: entities](https://docs.datomic.com/reference/entities.html), [pull](https://docs.datomic.com/query/query-pull.html), [filters (as-of, since, history, filter)](https://docs.datomic.com/reference/filters.html)
- [XTDB docs](https://docs.xtdb.com/): [Time in XTDB](https://docs.xtdb.com/about/time-in-xtdb.html), [SQL transactions](https://docs.xtdb.com/reference/main/sql/txs.html), [XTQL introduction](https://docs.xtdb.com/xtql/tutorials/introducing-xtql.html)
- [RDF 1.2 Concepts](https://www.w3.org/TR/rdf12-concepts/), [Turtle 1.2](https://www.w3.org/TR/rdf12-turtle/), [SPARQL 1.2 Query](https://www.w3.org/TR/sparql12-query/)
- [Wikibase RDF dump format](https://www.mediawiki.org/wiki/Wikibase/Indexing/RDF_Dump_Format)
- Hernandez, Hogan, Kroetzsch, [Reifying RDF: What Works Well With Wikidata?](https://iccl.inf.tu-dresden.de/w/images/5/52/Hernandez-Hogan-Kroetzsch-RDF-reification-evaluation-SSWS2015.pdf), SSWS 2015
- Gutierrez, Hurtado, Vaisman, [Temporal RDF](https://link.springer.com/content/pdf/10.1007/11431053_7.pdf), ESWC 2005 (and Introducing Time into RDF, TKDE 2007)
- Fernandez, Umbrich, Polleres, Knuth, [Evaluating Query and Storage Strategies for RDF Archives](https://www.semantic-web-journal.net/node/1814)
- Taelman et al., [Triple Storage for Random-Access Versioned Querying of RDF Archives (OSTRICH)](https://ruben.verborgh.org/publications/taelman_jws_2019/)
- [TerminusDB schema reference](https://terminusdb.com/docs/schema-reference-guide)
- [RDF/JS data model](https://rdf.js.org/data-model-spec/), [rdf-string](https://github.com/tpluscode/rdf-string), [Kysely `sql` API](https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html), [Traqula](https://github.com/comunica/traqula)

**Evidence gaps.** Stardog's versioning docs were not retrievable, only community posts. The TKDE version of Temporal RDF and the full text of the Gutierrez paper were not read. The rdf-string README says nothing about numbers, booleans or dates. No engine was started, so every `[unverified]` claim stands until its probe runs.
