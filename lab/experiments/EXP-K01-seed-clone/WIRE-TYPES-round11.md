# XTDB 2.2.0 wire expectations

North star: exact seed contents before reuse supporting P1–P5; authority lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md. Source root: `/Users/sam/projects/triplex-db-2/references/xtdb`, clean commit `c6c19623d90c658c15400fb46dc056f3735ed57b`. Paths/lines below refer to that revision. This is source-derived behavior except the four monomorphic numeric frames and mixed-integer catalog spelling captured in evidence/live-round10/wire.log. No live round-11 run has occurred.

## Catalog grammar and per-value transport

`core/src/main/clojure/xtdb/information_schema.clj:348-358` returns `xt_type` as `pr-str(st/render-type(vec-type))`. Its ordinary data_type/udt type goes through PgType unification (:334-340), so it is insufficient as a storage-type witness. `api/src/main/clojure/xtdb/serde/types.clj` defines the output:

| Native vector kind | Exact catalog shape | Assigning source lines |
| --- | --- | --- |
| Scalar | `:i16`, `:i32`, `:i64`, `:f32`, `:f64`, `:utf8`, `:bool`, `:varbinary`, `:uuid` | :97-111,146-149; render Scalar :256-258 |
| Decimal | `[:decimal precision scale bitwidth]` | :113-115 |
| Nullable primitive | `[:? :i64]` | Maybe :279-284 |
| Nullable parameterized primitive | `[:? :decimal precision scale bitwidth]` | Maybe flattens the base vector, :279-284 |
| Mixed/Poly | `#{:i32 :i64}`, `#{:f32 :f64}`; set ordering unspecified | Poly :286-288 |
| Nullable mixed/Poly | `#{:null :i32 :i64}`; ordering unspecified | Poly :286-288 and `api/src/main/kotlin/xtdb/arrow/VectorType.kt:141-162,298-306` |
| Null only / undefined | `:null` / `:nothing` | :249-254 |
| UTC microsecond timestamp | `:instant`, nullable `[:? :instant]` | :119-126,279-284 |
| Other timestamps | `[:timestamp-local unit]` / `[:timestamp-tz unit "zone"]` | :119-126 |
| Lists / structs | `[:list element-type]` / `[:struct {"column" type}]` | :260-277 |

`:union` is the input ArrowType tag (:139-141,182), **not the output of render-type for a Poly column**. Nullable Mono is not a two-leg Poly catalog spelling: VectorType.fromLegs maps one non-NULL leg plus Null to Maybe (:298-306).

`core/src/main/kotlin/xtdb/pgwire/PgType.kt:1023-1025` derives one pgwire type per result column from all non-NULL native legs. Same-type legs retain that type; multiple integer types become Int8, float types become Float8, mixed families become Default (:1013-1019). `core/src/main/clojure/xtdb/pgwire.clj:1173-1180` serializes each non-NULL row with that column type, not an original row-leg OID. SQL NULL is a null field, with no payload. Pure Null uses OID 25 (`PgType.kt:171-184`). Therefore G0 continues to refuse all mixed columns with non-NULL data; the new union parser only checks probe expectations, never admits a union.

## Supported G0 native monotypes

All following references are `core/src/main/kotlin/xtdb/pgwire/PgType.kt`; the table records G0's existing conservative subset, not every engine type. Nullable forms use the same OID, because Null is removed before unification (:1024). D hashes native monotype, OID and exact raw bytes.

| Native tag | Result-column OID | Type selection / OID / text writer source |
| --- | --- | --- |
| `:i16` | 21 | :951-955 / :226-229 / :242 |
| `:i32` | 23 | :951-955 / :206-209 / :222-223 |
| `:i64` | 20 | :951-955 / :186-189 / :203 |
| `:f32` | 700 | :958-960 / :245-248 / :261 |
| `:f64` | 701 | :958-960 / :264-267 / :280 |
| `:bool` | 16 | :971 / :284-286 / :308-309 |
| `:utf8` | 25 | :964-966 / :312-315 / :325-328 |
| `:varbinary` | 17 | :967-969 / :582-585 / :600-604 (hex text) |
| `:uuid` | 2950 | :980-981 / :737-740 / :760-761 |
| `[:decimal p s bits]` | 1700 | :972 / :349-352 / :364-365; native metadata is not in the wire placeholder (:351) |

**Corrections:** the engine's `Int8` type name means PostgreSQL BIGINT / native I64, not native I8. Native I8 is rendered by serde but rejected by PgType's bit-width switch (:951-955); G0 no longer accepts a fabricated I8/OID-21 witness. OID 1042 (bpchar) is not defined in this PgType implementation and is removed from the raw scalar whitelist. VarChar 1043 is defined (:331-347), so the generic raw-byte frame can retain it, but a native SELECT * UTF8 column still requires OID 25; a cast's type cannot establish original storage.

## Explicit refusals, not alternate names

Native temporal/structured types are not mistaken for ordinary text. `:instant` maps to 1184 (:403-406), local timestamps to 1114 (:368-371), dates to 1082 (:442-445), times to 1083 (:469-472), interval to 1186 (:497-500), duration to 11112 (:524-527). Their catalog parameters may carry unit/zone distinctions; G0 currently refuses these native types rather than claiming byte-level fidelity through an unqualified text rendering. Triplex's stored numeric/string date channels remain their own ordinary I64/UTF8 columns.

Structs/maps go to Default (:942,949), list special cases to array OIDs (:995-1005), with result fallback selected by pgwire.clj:1172-1180; native JSON/JSON-LD OID 114 writers are :828-863. G0 refuses their potentially lossy transport, including numeric NaN text whose payload is hidden by float serialization (:261,280). Pure Null rows remain NULL; a non-NULL cell with a `:null`/`:nothing` witness refuses. No unsupported kind is silently relabeled to a supported one.

Source hashes and numbered excerpts are retained in evidence/round11/upstream-source.json. Fixtures from the actual live output are `lab/bench/test/fixtures/g0-live-round10.json`; their provenance hash is checked against the immutable original wire.log. They reconstruct only the four reversibly encoded typed scalar witnesses, not a network packet capture. The mixed-integer fixture is the exact assertion actual string; no mixed raw frame was captured. Other shape/OID fixtures are explicitly source-derived.
