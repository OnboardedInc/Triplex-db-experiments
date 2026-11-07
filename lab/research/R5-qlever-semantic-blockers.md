# R5. QLever 0.6.0 semantic blockers, root causes and ranked fixes

Date 2026-11-07. Pinned engine is QLever `v0.6.0`, commit `6c5861a6526d7d7ae77735d09339ee0825f0c001` (cited below as `@6c5861a`). Source read from `references/qlever` (clean checkout, `git describe` = `v0.6.0`). Probes ran against `adfreiburg/qlever:0.6.0@sha256:37d5ede1…49a78ec`, whose index metadata records `git-hash 6c5861a` and `has-icu-support true`.

## 1. Answer first

| Blocker | Root cause | Top-ranked fix | Proof state |
| --- | --- | --- | --- |
| **String order** (`ORDER BY STR(...)`, ranges, pages) | The pinned engine has exactly one string comparator, ICU collation at IDENTICAL strength for locale `en_US`. Stored words, `STR()` results and constants all go through it. No runtime setting switches it to codepoint order. | **Schema-derived maintained order key.** One extra lowercase hex string per orderable text assertion, 6 hex digits per Unicode codepoint, compared with `<`, `>`, `ORDER BY` on the key instead of on the text. | Proved under the pinned image on 4,368 exhaustive strings, 47,988 base-36 strings, 400 random Unicode keys, 136 range checks, a 150-key post-index `INSERT DATA` delta, and pagination. Not yet wired into the SDK. |
| **Correlated `NOT EXISTS`** (flat and nested) | QLever plans the `EXISTS` argument as a separate, uncorrelated query and joins it to the outer rows only on variables that the argument itself binds. An outer variable that appears only inside an inner `FILTER` is UNDEF there, so the inner filter rejects every row, so the inner result is empty, so `NOT EXISTS` is true for every outer row. | **Authoring helper that re-binds every correlated variable inside the group** (copy of the outer fact fragment), plus a static check that rejects an inner `FILTER`/`BIND` that uses a variable the group does not bind. | Reproduced both failures, then verified the rewrite on the exact control and on a triple-shaped latest-revision case, for `NOT EXISTS`, positive `EXISTS`, `MINUS`, and `OPTIONAL`+`!BOUND`. |

Both blockers have a fix that needs no engine change. Neither fix makes arbitrary SPARQL `STR` or arbitrary `FILTER NOT EXISTS` compliant. Each makes the authored Triplex shapes correct, and each needs a guard so a hand-written query cannot silently bypass it.

## 2. Evidence that existed and evidence that is missing

- **Read.** `wiki/problems/qlever-native-string-order.md`, `native-correlation.md`, `qlever-wrapper-string-range.md`, `qlever-planner-memory.md`, `native-number-parameters.md`, `wiki/status.md`, `wiki/research/qlever-string-comparison-mechanisms-v1.md`, `handoffs/claude-native/*`, `qualification/extensions/string-order-v1/*`, `qualification/native-controls/qlever-collation-tiny-v1/*`, `qualification/reviews/qlever-public-string-v6-terminal-independent.json`, `qualification/qlever-live/native-feature-matrix.json` and `native-latest-wave1.json`, `packages/qlever/experiments/native-query-shapes.ts`, and the QLever SDK sources under `packages/qlever/src`.
- **Missing from this checkout.** The wiki cites `qlever-native-str-order-semantics-v1.json`, `qlever-native-str-order-source-locators-v1.json`, `qlever-wrapper-string-range-numeric-guard-v1.json`, `qlever-native-shape-edges-independent-v1.json`, `qlever-public-string-extension-v6-author-terminal.json` and the `.devloop` terminals (`qlever-native-page-sample-v1/0001`). None of them are present. I recovered the exact queries from the source that produced them (`native-query-shapes.ts:141-146`, the tiny-control fixture and oracle) and the v6 numbers from the independent terminal review. I did not invent any missing hash or result.
- **Wrapper numeric guard.** The impossible `?v1_type IN ("number","integer") && ?v1_type = "string"` conjunction is a separate Datalog compiler defect (`qlever-wrapper-string-range.md`). Nothing below touches it. An order key fixes collation, not that guard.

## 3. Blocker A, string order

### 3.1 Counterexamples, exact

**A1. Tiny native control (9 triples).** Source `qualification/native-controls/qlever-collation-tiny-v1/{fixture.nt,oracle.json}`, status `SOURCE_ONLY_UNEXECUTED` until this report.

| Entity suffix | Label codepoints | Codepoint rank (oracle) | ICU rank (observed) |
| --- | --- | --- | --- |
| `ascii-A` | U+0041 | 1 | 2 |
| `ascii-E` | U+0045 | 2 | 4 |
| `ascii-c` | U+0063 | 3 | 3 |
| `nfd-e-acute` | U+0065 U+0301 | 4 | 5 |
| `ascii-z` | U+007A | 5 | 7 |
| `nfc-e-acute` | U+00E9 | 6 | 6 |
| `private-use` | U+E000 | 7 | 9 |
| `astral-10000` | U+10000 | 8 | 8 |
| `emoji` | U+1F600 | 9 | 1 |

- **Query.** `SELECT ?e ?l WHERE { ?e <urn:triplex-sort:label> ?l } ORDER BY STR(?l) STR(?e)`.
- **Expected.** `ascii-A, ascii-E, ascii-c, nfd-e-acute, ascii-z, nfc-e-acute, private-use, astral-10000, emoji`.
- **Observed (probe T1a).** `emoji, ascii-A, ascii-c, ascii-E, nfd-e-acute, nfc-e-acute, ascii-z, astral-10000, private-use`.
- **Ranges (T1c to T1e).** `STR(?l) > "E"` returned `ascii-z, astral-10000, nfc-e-acute, nfd-e-acute, private-use` and omitted `ascii-c` and `emoji`. `STR(?l) < "c"` returned `ascii-A, emoji` and omitted `ascii-E`. The oracle requires `> "E"` = `c, nfd, z, nfc, private-use, astral, emoji` and `< "c"` = `A, E`.
- **Oracle source.** `oracle.json`, independently authored before execution. It cites SPARQL 1.1 `STR`, `ORDER BY` and operator mapping (simple literals compare by Unicode codepoint). The oracle contains no engine output and no casefold.

**A2. Public extension `qlever-public-string-extension-v6/0001` (the failure of record).**

- **Data.** Scope 1 has four entities `string-order:ascii:00..03` with labels `A, E, c, z`. Scope 2 has seven entities `string-order:unicode:00..06` with labels `E, c, e+U+0301, é, U+E000, U+10000, U+1F600`. A later command retracts the `c` assertion and asserts `"0"` for that entity.
- **Native query.** `ctx.fact("?entity", Label, "?label")` with `ORDER BY STR(?label) STR(?entity)`, pages `LIMIT 2 OFFSET 0 and 2` at a captured `recordedPosition`.
- **Expected.** ASCII ascending `A, E, c, z`. Original-cut continuation after the correction `c, z`. Unicode ascending `unicode:00..06` in codepoint order. `STR(?label) > U+E000` returns `unicode:05, unicode:06`. Source `qualification/extensions/string-order-v1/oracle.json` (SHA `8f4da85e…`) and `policy.json`. The ASCII policy `A<E<c<z` is the root-approved narrow policy. The native Unicode cases are normative SPARQL codepoint semantics.
- **Observed.** Native ASCII ascending `A, c, E, z`. Continuation `E, z`. Native 9 of 11 logical checks fail. Datalog 7 of 9 fail (partly the wrapper guard). Exact Unicode membership, cursors, bases and history pass. Source `qualification/reviews/qlever-public-string-v6-terminal-independent.json`.

**A3. Original page-sample discrepancy.** Rows 231 and 232 of `qlever-native-page-sample-v1/0001` share a graph key and their subject strings first differ as `c` then `E`, under `ORDER BY STR(?g), STR(?s), STR(?p), ?kind, STR(?o), ?datatype, ?language`. The terminal file is absent, but probe T1h reproduces the class on IRIs. `ORDER BY STR(?s)` over `urn:triplex:s:{A1,E1,c1,z1,cE,cc,ce}` returned `A1, c1, cc, ce, cE, E1, z1`. Codepoint order is `A1, E1, cE, cc, ce, c1, z1`.

**Why the lowercase-only probe passed.** ICU primary order for digits and `a` to `z` equals ASCII order. The two orders diverge as soon as case mixes (ICU `A < c < E`, codepoint `A < E < c`) or punctuation appears (ICU puts `_` and `~` before digits, codepoint puts them after).

### 3.2 Root cause, with citations

```
ORDER BY STR(?label)
  |  non-variable key becomes ExpressionOrderKey
  |  SparqlQleverVisitor.cpp:1600-1612
  v
STR(?label) builds a NEW literal (LocalVocabEntry), not a stored vocabulary id
  |  StringExpressions.cpp:30-37 (ToLiteral), 59-66 (StrImpl)
  v
OrderBy::computeResult -> compareIds<CompareByType>(a, b, LT)
  |  OrderBy.cpp:105-118
  v
compareIdsImpl: if either side is a LocalVocabIndex, defer to ValueId ordering
  |  ValueIdComparators.h:512-515
  v
 local vs local                          local vs stored VocabIndex
 LocalVocabEntry::compareThreeWay        compareVocabAndLocalVocab: position of the
   -> context->compareWords(.., TOTAL)   word in the vocabulary, found by binary
 LocalVocabEntry.cpp:11-25               search with the SAME comparator
 LocalVocabContextImpl.cpp:15-18         ValueId.h:532-543, LocalVocabEntry.cpp:30-52
  \                                       /
   v                                     v
 TripleComponentComparator::compare(.., TOTAL)       StringSortComparator.h:308-332
   1. first character class: '"' literal, '<' IRI
   2. ICU compare of the INNER text, strength IDENTICAL, locale en_US
      LocaleManager.h:327 (TOTAL collator = IDENTICAL), 174-183 (compare)
   3. only if ICU says equal: byte compare, then language tag/datatype

Stored words: the vocabulary is sorted with the same comparator at index build
  IndexImpl.cpp:712 (isLessInTotalWithExternalFlag, StringSortComparator.h:281)
  so a stored literal's id order IS the ICU order.
```

- **Stored versus computed values agree with each other.** That is why `ORDER BY ?l`, `ORDER BY STR(?l)`, local `VALUES` strings (T1f) and stored+local `UNION` (T1g) all give the same ICU order. The fault is the comparator, not a stored-versus-computed mismatch.
- **Range filters use the same comparator.** `FILTER(?l > "E")` takes a binary-search fast path when the column is sorted (`RelationalExpressions.cpp:80-100, 143-152`). The constant becomes a vocabulary position through `getRangeFromVocab`, which uses ICU level QUARTERNARY for the equal range (`RelationalExpressionHelpers.h:121-131`). `STR(?l) > "E"` compares two `LocalVocabEntry` values through `compareThreeWay` (`RelationalExpressionHelpers.h:179`). Both end at ICU, which explains `>E=[z]` and `<c=[A]` (T1c, T1e) and the earlier wrapper observations.
- **ICU is selected at build time, not at run time.** `LocaleManager` is a type alias for `LocaleManagerICU` or `LocaleManagerNoICU` (`LocaleManager.h:429-434`), chosen by the CMake option `QLEVER_NO_UNICODE` (`CMakeLists.txt:325-332`). The index records `has-icu-support` and refuses a mismatched binary (`IndexImpl.cpp:1325, 1430-1442`). The only run-time knob is `locale {language, country, ignore-punctuation}` (`IndexImpl.cpp:1618-1648`).
- **Upstream treats this as intended.** PR #3320 and #3333 (open) call the ICU `TOTAL` order the semantic order that SPARQL requires. PR #3725 (merged after 0.6.0) fixes cross-type order (unbound < blank < IRI < literal), not string collation. I found no issue asking for codepoint collation. Treat a codepoint fix as ours to build, not a bug upstream will fix.

### 3.3 Probe output (container `tx2-probe-r5`, image above, removed afterwards)

Full scripts and outputs are in `lab/research/R5-probe/`. Key lines of `probe1.out` and `probe2.out`:

```
T1a ORDER BY STR(?l) actual : emoji, ascii-A, ascii-c, ascii-E, nfd-e-acute, nfc-e-acute, ascii-z, astral-10000, private-use   -> FAIL vs oracle
T1h ORDER BY STR(?s) IRIs   : A1, c1, cc, ce, cE, E1, z1            (codepoint: A1 E1 cE cc ce c1 z1)
T2f raw text ORDER BY ?t == codepoint order?  False                 (400 random strings, baseline ICU)
T2a hex keys, all strings over [0-9a-f] length 1..3, n=4368, ORDER BY == sorted()  True
T2b same with ORDER BY STR(?h)  True      T2c DESC  True
T2d 400 random-Unicode keys (6 hex digits per codepoint) ORDER BY == codepoint order of the text  True
T2g range filters on keys, 136 checks (4 operators x 17 bounds x {?k, STR(?k)})  all match  True
T2h pagination LIMIT 37 concatenation == codepoint order  True
T3b/T3c 150 keys added by INSERT DATA after index build (local vocabulary) ORDER BY == codepoint order  True
T3d range filters over stored + delta keys, 20 checks  True
base36 [0-9a-z], all strings length 1..3, n=47988, ORDER BY == bytewise  True
base62 [0-9a-zA-Z], all strings length 1..2, n=3906  False (3795 positions differ)   <- negative control
locale en/US_POSIX : ASCII-only subset (103 strings) exact = True ; tiny fixture FAIL ; 399/400 random positions differ
locale ""/"" and "und": ASCII exact = False
```

## 4. Blocker B, correlated `NOT EXISTS`

### 4.1 Counterexamples, exact

**B1 and B2. The two raw controls** (`packages/qlever/experiments/native-query-shapes.ts:141-146`, independent review named in `native-feature-matrix.json`, id `raw-outer-filter-correlated-not-exists`).

Flat:

```sparql
SELECT ?revision WHERE {
  VALUES (?revision ?order) { ("one" "01") ("two" "02") }
  FILTER NOT EXISTS {
    VALUES ?laterOrder { "01" "02" }
    FILTER(?laterOrder > ?order)
  }
}
```

Nested: same, with the outer `VALUES` wrapped in `{ SELECT ?revision ?order WHERE { ... } }` and the inner `VALUES` wrapped in `{ SELECT ?laterOrder WHERE { ... } }`.

- **Expected `["two"]`.** SPARQL 1.1 evaluates `NOT EXISTS` by substituting the outer solution into the pattern. For `("one","01")` the inner pattern has `?laterOrder = "02" > "01"`, so a solution exists and the row is removed. For `("two","02")` nothing is greater, so it stays. QLever issue #2138 states that Jena and Blazegraph return the spec result for its own (simpler) example of the same pattern.
- **Observed `["one","two"]`** for both (probe N1, N2). The retained review recorded the same.
- **Origin of the controls.** The native packet case `05/revision-wins-arrival` returned `created+paid+shipped` instead of `shipped` (`native-latest-wave1.json`). The controls reduce that to two rows.
- **Not part of these controls.** The shipped native recipes use `NOT EXISTS` where the correlation variable is bound inside the group (`qlever-workloads.ts:452, 502`) and positive grouping for "latest" (`qlever-workloads.ts:401`). Those pass because they avoid this defect, not because the engine is right.

### 4.2 Root cause, with citations

```
outer rows (?revision ?order)            EXISTS argument = { VALUES ?laterOrder ..  FILTER(?laterOrder > ?order) }
        |                                            |
        |   parsed in a FRESH context: outer variables are not visible
        |   SparqlQleverVisitor.cpp:2862-2905 (visitExists), 1101-1118 (GroupGraphPattern)
        |                                            |
        |   planned by its OWN QueryPlanner, once, with no outer columns
        |   ExistsJoin.cpp:239-290 (QueryPlanner qp{..} at 255)
        |                                            v
        |                                  inner FILTER runs on the inner rows only:
        |                                  ?order is not a column  ->  ?order evaluates to UNDEF
        |                                  LiteralExpression.h:195-199 "not part of the input ... always UNDEF"
        |                                  ?laterOrder > UNDEF -> UNDEF -> row dropped
        |                                            |
        |                                  inner result = EMPTY
        v                                            v
 ExistsJoin: join columns = variables present in BOTH trees  (ExistsJoin.cpp:28, getJoinColumns)
   shared columns = {}  ->  "noJoinNecessary" path: exists = !inner.empty() = false  (ExistsJoin.cpp:112-143)
   exists = false for every outer row  ->  NOT EXISTS = true for every outer row  ->  one, two
```

- **The parser hides outer variables on purpose.** The `EXISTS` group is parsed after the visible-variable list is cleared, and only variables bound inside it are selected (`SparqlQleverVisitor.cpp:2869-2893`, `ExistsExpression.h:89-98`).
- **Unbound filter variables are UNDEF, and a filter on UNDEF drops the row.** The planner applies every remaining filter at the end of a group even when its variables are uncovered (`QueryPlanner.cpp:290-293`), and the expression reads the missing column as UNDEF (`LiteralExpression.h:195-199`).
- **The join is on shared bound variables only.** An inner filter cannot create a join column, so a filter-only correlation never reaches the join. This is the same cause as the "frame" the previous agent could not isolate. It is not a nested-subquery bug (B2 fails identically) and not a `VALUES` bug (S1 fails on plain triples).
- **`MINUS` and `OPTIONAL` do not escape it.** Each group is optimized on its own (`QueryPlanner.cpp:3099, 3136`), a `MINUS` with no shared variable "behaves as if it isn't there" (`QueryPlanner.cpp:2952-2956`), and an `OPTIONAL` group's filters see only its own variables. Probes N6 and N8 confirm both fail the control.
- **Upstream status.** Issue #2138, "treatment of EXISTS varies from 1.1 spec and other SPARQL engines", is open with label `discussion`. It describes this exact implementation (the argument is run as a separate query rather than by substitution), and its author suggests it may not be worth changing because EXISTS is being redefined for SPARQL 1.2. A commenter (2026-07-03) reports rewriting to `MINUS`. Issue #1882 was fixed by PR #1885 (a different `EXISTS` case) and #1997 was closed after its reporter revised the claim. Post-0.6.0 commits whose titles mention `EXISTS` (#3190, #3619, #3620, #3440, #3602) are about planning cost and filter placement. I read their titles (and the description of #3190), not their diffs. I did confirm that master still builds the argument with its own `QueryPlanner` (`ExistsJoin.cpp:272` on master) and still parses it "in a fresh query context". No release or master change I found fixes this.

### 4.3 Probe matrix (`probe1.out`, `probe3.out`)

All rows use the same VALUES control unless marked S (triple-shaped data, six revision rows over objects A, B, C).

| Id | Shape | Expected | Observed | Reading |
| --- | --- | --- | --- | --- |
| N1 | flat `NOT EXISTS`, filter-only correlation | two | one, two | defect |
| N2 | nested sub-select version | two | one, two | defect |
| N3 | `NOT EXISTS { VALUES .. }` no filter, no shared variable | empty | empty | matches the "separate query" model |
| N4 / N4b | positive `EXISTS`, filter-only correlation | one | empty | same defect, other polarity |
| N5 | `NOT EXISTS` with outer `VALUES` re-bound inside | two | two | fixed |
| N4c | positive `EXISTS` with re-bind | one | one | fixed |
| N6 | `MINUS` with filter-only correlation | two | one, two | not a fix |
| N7 | `MINUS` with re-bind | two | two | fixed |
| N8 | `OPTIONAL` + `!BOUND`, filter-only | two | one, two | not a fix |
| N9 | `OPTIONAL` + `!BOUND` with re-bind | two | two | fixed |
| N10 | `MAX` aggregate joined back | two | two | fixed |
| S1 | latest revision per object, flat `NOT EXISTS`, `?ord` only in the inner filter | r2, r3, r4, r5 | r1 to r6 | defect on plain triples |
| S2 | same, `?r <ord> ?ord .` repeated inside | r2, r3, r4, r5 | r2, r3, r4, r5 | fixed |
| S3 | `MINUS` with re-bind | r2, r3, r4, r5 | r2, r3, r4, r5 | fixed |
| S4 | `MAX` per object joined back (`?ord = ?mx`) | r2, r3, r4, r5 | r2, r3, r4, r5 | fixed |
| S5 | `OPTIONAL` + `!BOUND` with re-bind | r2, r3, r4, r5 | r2, r3, r4, r5 | fixed |
| S6 | `OPTIONAL { MAX subselect }` + `FILTER(!BOUND(?mx) \|\| ?ord >= ?mx)` | r2, r3, r4, r5 | r2, r3, r4, r5 | fixed, handles empty groups |
| S7 / S8 | extra inner bound `?ord2 < "05"`, with / without re-bind | r2 to r6 / r1 to r6 | r2 to r6 / r1 to r6 | re-bind fixes, filter-only breaks |

## 5. Ranked fix hypotheses

Ranking weighs how completely the fix removes the failing behavior, then cost, then risk. "Proof" is the cheapest experiment that could falsify the hypothesis.

### 5.1 String order

| Rank | Hypothesis | Mechanism | Effect on the blocker | Write / storage / rebuild / freshness | Risk | How to prove |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **S1. Schema-derived maintained order key** | Writer emits a second literal per orderable text assertion: lowercase hex, 6 digits per codepoint, in a new channel. Reads order, range and page on the key. | Fixes every authored Triplex ordering, range and page on keyed attributes, ASCII and full Unicode, with the pinned image. Does not fix ad-hoc `ORDER BY STR(?x)` on unkeyed values. | Write: +1 triple per text assertion, computed in TypeScript in the same `INSERT DATA`. Storage: measured +57.7 B per assertion (24-codepoint text, 200k assertions, +11.5 MB), split 35 B vocabulary and 22 B permutation entries. Rebuild: none for new data. Backfill: one streamed pass over existing string assertions. Freshness: none, the assertion is immutable, retirement adds `retracted_*` triples and never touches the key. | Medium. Every consumer must use the key (Datalog `scalar()`, native `ctx.fact`), or ordering silently falls back to ICU. Encoder changes need a new predicate name. | Section 5.3 tests, then the v6 extension against a candidate. |
| 2 | **S2. Byte-collation build (`QLEVER_NO_UNICODE=ON`) plus full reindex** | Upstream compile flag in 0.6.0. `LocaleManagerNoICU::compare` is `a.compare(b)` on the inner text (`LocaleManager.h:384-389`), which is unsigned byte order, equal to codepoint order for valid UTF-8. | Likely makes every `STR`, `ORDER BY` and range filter codepoint-correct, including hand-written SPARQL. The only candidate besides S3 that does. Not yet shown, because no NoICU binary exists. | Reindex of all data, new image, `has-icu-support=false` index incompatible with the current one (`IndexImpl.cpp:1430-1442`). Storage: none extra. Freshness: none. | High. Upstream warns Unicode features degrade (`CMakeLists.txt:325`). `LCASE`, `UCASE`, normalization and text-index tokenization become ASCII-only. Corner case still to test, strings containing `"` or `\` (the comparator parses the stored literal with `findLiteralEnd`). | The existing tiny-control proposal, run on a NoICU image (build in 5.5). |
| 3 | **S3. Patch a runtime or build-time bytewise vocabulary comparator that keeps ICU functions** | Add a collation mode that reuses NoICU `compare`, `getSortKey`, `getPrefixSortKey` while `getLowercaseUtf8` and `normalizeUtf8` keep ICU. Estimated 150 to 300 lines including the mismatch guard and tests. | Same order effect as S2 without losing Unicode functions. | Same reindex as S2. Carries a private fork. | High. Touches vocabulary, local vocabulary, prefix ranges, text index, and the index-compatibility guard. Upstream is moving the other way (#2910 drops sort-key logic). | Same tiny control, then the full v6 extension. |
| 4 | **S4. Index locale `en`/`US_POSIX`** | Settings JSON only (`"country":"US_POSIX"`). ICU's POSIX tailoring orders ASCII by codepoint. | Fixes ASCII mixed case and ASCII ranges. Does **not** fix the Unicode cases. Probe: ASCII subset exact, tiny fixture still fails, 399 of 400 random positions differ (emoji sorts first, U+10000 and U+E000 last). | Full reindex. No code. | Medium. QLever logs that non-default locales are "untested". Fails the normative native Unicode oracle. Useful only if the product policy is ASCII-only. | Already run (probe2). |
| 5 | **S5. TypeScript evaluation over a bounded candidate set** | Fetch the whole candidate set of one query, sort and filter in TypeScript, page in TypeScript. | Correct only if the entire candidate set is fetched. | Transfer and sort are O(N) per page unless cached per cut. Unusable at the 10m-entity target. | High. Violates the handoff if applied to returned pages (post-`LIMIT` sorting). Legitimate only for small, explicitly bounded sets and then must be charged as such. | Not recommended. Keep as an escape hatch for sets under a stated cap. |

Considered and rejected. SPARQL builtins cannot derive a codepoint key in-query. The grammar has `ENCODE_FOR_URI`, `UCASE`, `LCASE` and hashes, but no codepoint or byte-to-number function (`SparqlAutomatic.g4:534-589`). `ENCODE_FOR_URI` leaves ASCII letters unchanged, so mixed case persists.

### 5.2 Correlated `NOT EXISTS`

| Rank | Hypothesis | Mechanism | Effect | Costs | Risk | How to prove |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **C1. Re-bind helper plus static check** (`NOT EXISTS`) | A helper such as `ctx.notExists(outerFacts, innerPattern)` re-emits, inside the group, the same `ctx.fact` fragment that bound each correlated variable. A check rejects any inner `FILTER`, `BIND` or aggregate that uses a variable the group does not bind. | Restores spec results for every authored shape (N5, S2, S7, N4c). | Write: none. Plan: one extra scan or join per `EXISTS`. Storage, rebuild, freshness: none. | Low to medium. The repeated fragment must carry the same graph and temporal cut. Planning cost grows with each `EXISTS` (section 6). | Run the N-series and S-series on the real native context, plus randomized differential tests against a reference evaluator (section 5.4). |
| 2 | **C2. Same re-bind, lowered to `MINUS`** | `FILTER NOT EXISTS { B . P }` becomes `MINUS { B . P }`. | Same results (N7, S3). Can avoid the boolean column. | As C1. | Medium. Needs the extra conditions in 5.4. Earlier translated-path `MINUS` arms still hit the family12 planner OOM (`qlever-planner-memory.md`, arm B), so `MINUS` is not a memory cure. | As C1, plus check against OOM at the 2 GiB cap. |
| 3 | **C3. Positive grouping (`MAX`/`MIN` join-back)** | Rewrite "no later row" as "my key equals or exceeds the group extremum" (S4, S6). | Correct for extremum shapes. Already used in the shipped 142 native tasks. | None. | Low, but covers only extremum correlations, not arbitrary inner filters. Comparator must be the exact-key channel (hex), never raw text. | Already passing. Add S6's empty-group form. |
| 4 | **C4. `OPTIONAL` + `!BOUND` with re-bind** | As C1 with an anti-join through `OPTIONAL`. | Correct only with re-bind (N9, S5). | As C1. | Medium. Needs an always-bound sentinel variable that is absent from the outer group. | As C1. |
| 5 | **C5. Patch QLever** | Teach `visitExists`/`ExistsJoin` to carry correlated variables, or add a semi-join with a residual predicate evaluated on joined rows. | Fixes raw SPARQL, which no authoring rule can. | Estimated 400 to 800 lines of C++ plus tests. Fork. Rebuild image. | High. Upstream flags the semantics as unsettled (#2138). | Run N and S series, the QLever test suite for EXISTS, and the W3C EXISTS tests under `references/rdf-tests`. |
| 6 | **C6. TypeScript evaluation of the correlated predicate** | Fetch candidates, evaluate the correlation in TypeScript. | Correct when bounded. | O(N) transfer per query. | High at scale. Not recommended. | Not recommended. |

### 5.3 Why hex order keys sort in codepoint order under QLever's comparator

**Claim.** For strings over an alphabet Σ of digits and lowercase letters, `TripleComponentComparator::compare(TOTAL)` equals unsigned lexicographic order with a proper prefix first. Fixed width per codepoint then makes key order equal codepoint order.

**Why, step by step.**

1. **Datatype class.** Both keys are plain literals starting with `"`, so step 1 of the comparator ties (`StringSortComparator.h:311-314`).
2. **Primary weights.** In the ICU root collation that `en_US` uses, every character of `[0-9a-z]` has its own primary weight, digits sort before letters, and letters sort alphabetically. None are variable, ignorable or part of a contraction. So the primary key is the concatenation of per-character weights.
3. **Prefixes.** A shorter string's sort key ends at the level separator, which is below every primary weight, so a proper prefix sorts first. That equals bytewise order.
4. **No lower-level effect.** Without accents or uppercase there is nothing at secondary or tertiary level, and the IDENTICAL level (NFD codepoint compare) and the byte tie-break only act when ICU already says equal, which cannot happen for different strings.
5. **Option defaults.** Numeric collation and alternate-shifted handling are off for `en_US` with `ignore-punctuation=false` (`IndexImpl.cpp:1618-1648`). The recorded locale in the probe index is `{language:"en", country:"US", ignore-punctuation:false}`.
6. **Fixed width.** 6 hex digits cover U+0000 to U+10FFFF. With equal width per codepoint, comparing keys position by position compares codepoints, and a prefix of the codepoint sequence is a prefix of the key. The code points are taken as Unicode scalar values, as `wellFormed()` in `rdf.ts` already requires.

**What the probe adds.** Empirical proof under the pinned binary for the alphabet and for both vocabulary and local-vocabulary words (T2, T3, base-36 test). The negative control (base-62 with uppercase) fails, which shows the test can fail.

**The repository already relies on this property.** `numericOrderKey` and `integerOrderKey` are fixed-width lowercase hex (`rdf.ts:65-76`) and the compiler compares them with SPARQL `<`, `>` (`compiler.ts:373-377`, `NativeContext.ts:87-89`). A break in the property would already have broken the temporal cut filters, so the 142 packets corroborate it indirectly. The probe is the first direct test.

**How ranges and pages use the key.**

- **Native fact.** Add `physicalType("text")` an `order` channel (`NativeContext.ts:51-52` has none, and line 103 throws if one is requested) and have `rowFields` write it (`rdf.ts:220-231`).
- **Order.** `ORDER BY ?labelKey ?entityKey`, then `LIMIT`/`OFFSET` at the captured cut, as in the existing page recipe. Entity tie-breakers need their own key if codepoint tie-break order matters.
- **Range.** `FILTER(?labelKey >= "<enc(lo)>" && ?labelKey < "<enc(hi)>")`, with `enc` the same TypeScript function. A "starts with p" range is `[enc(p), enc(p) + "g")`, because `g` sorts above every hex digit.
- **Keyset.** `FILTER(?labelKey > :last || (?labelKey = :last && ?entityKey > :lastEntity))`.
- **Datalog.** `scalar()` returns `order: text` for strings (`compiler.ts:103`) and `rowFields` stores `scalarOrder = scalarLexical` (`rdf.ts:220-225`). Switching the string branch to the key is two lines plus the persisted-scalar admission check (`PersistedScalarSource.ts`), but existing persisted `scalar_order` values for strings would need a backfill, so a new predicate name is safer.

**Cost notes.**

- Storage was measured on a synthetic 200k-assertion corpus with two triples each. The Triplex layout writes about 30 to 35 triples per assertion (my count of `rowFields`, not a measured index), so the relative cost against a full Triplex index is smaller than in the probe. Measure it on the real layout before quoting a percentage.
- A base-36 key (4 characters per codepoint) did not save storage. 59.3 B versus 57.7 B per assertion, because the vocabulary compresses hex well. Keep hex.
- Long text costs 6 key characters per codepoint in the vocabulary. A cap would break exactness, so none is proposed.

### 5.4 Exact equivalence conditions for the authoring rewrites

Let `O` be the outer group, μ one of its solutions, and `P` the group inside `NOT EXISTS { P }`.

- **QLever 0.6.0 semantic.** Keep μ iff no row of `P`, evaluated alone, is compatible with μ on the variables `P` itself binds. Filters inside `P` see only those variables.
- **Spec semantic.** Keep μ iff `P` with μ substituted has no solution.

**C1. `FILTER NOT EXISTS { P }` equals `FILTER NOT EXISTS { B . P }` under both semantics** when all hold.

1. Every outer variable `x` that occurs free in `P` (in a `FILTER`, `BIND`, aggregate, nested group or sub-select) is bound inside `B`, at the same group level as the expression that uses it.
2. `B` is a copy of the conjunct of `O` that bound `x`, built from the same fact helper so it carries the same graph, cut, valid-time and retirement filters. μ therefore satisfies `B`.
3. Variables of `B` that are not outer variables are renamed apart.
4. Each correlated variable is bound in every outer solution. If it can be UNDEF (from `OPTIONAL`, or an error in `BIND`), the spec treats the variable as free while QLever's join treats UNDEF as a wildcard, and the rewrite is not guaranteed.
5. When `P` has `OPTIONAL`, `UNION` or `MINUS` inside, `B` must appear in every branch or group that uses `x`.

Duplicates do not matter, because `EXISTS` is a boolean.

**C2. `NOT EXISTS` equals `MINUS`** when the C1 conditions hold, the set of variables shared between `B . P` and `O` is non-empty, and every shared variable is definitely bound in every outer solution. Without a shared variable `MINUS` removes nothing (N6, `QueryPlanner.cpp:2952`). The multiplicity of surviving outer rows is unchanged.

**C4. `NOT EXISTS` equals `OPTIONAL { B . P } FILTER(!BOUND(?sentinel))`** when C1 holds and `?sentinel` is a variable of `P` that is always bound when `P` matches and does not occur in `O`.

**C3. "No later row" equals "my key reaches the group maximum"** when the order is the exact key channel (a strict total preorder), the group key is identical in outer and inner, and either the outer row belongs to the inner relation (use `=`) or the aggregate is joined with `OPTIONAL` and tested as `!BOUND(?mx) || ?key >= ?mx` (S6). Ties stay (both tied maxima survive), which matches strict `>` in `NOT EXISTS`.

### 5.5 Patching and building QLever, feasibility

- **No source patch is needed for S2.** `cmake -DQLEVER_NO_UNICODE=ON` on the unmodified tag. The Dockerfile has no argument for it, so a copy of the Dockerfile with that flag added to the `cmake` line is needed (the copy would live outside `references/`).
- **Inputs.** `ubuntu:24.04`, GCC 13, CMake from Kitware, C++20, about 168k lines in 232 `.cpp` files, and a dozen CMake `FetchContent` git dependencies (abseil, s2geometry, antlr4, range-v3, re2, spatialjoin, opentelemetry, and others, `CMakeLists.txt:251-644`). The build needs network access at build time. The `COPY .git` step works with the grafted clone.
- **Upstream timing.** The v0.6.0 `linux/arm64` Docker job (full build plus tests) ran 41.6 minutes on a GitHub-hosted `ubuntu-24.04-arm` runner (job `31690035620`, 10:19:23 to 11:01:02 UTC). I did not verify that runner's CPU and memory.
- **Estimate for our VM** (unmeasured). The Colima `triplex2` VM has 6 CPUs and 12 GiB, shared with other probe containers. Building only `qlever-index` and `qlever-server` with `RUN_TESTS=false` under `--cpus 3 --memory 6g` and `ninja -j3` plausibly takes 45 to 120 minutes and a few GiB of RAM per compile job. The Dockerfile comment says arm64 CI builds crashed from the OOM killer before mitigations (`mold`, deferred test discovery). `CHEAPER_COMPILATION=ON` exists but trades runtime speed, so it should not be used for a binary whose performance is measured.
- **Run the build as a controlled container, not `docker build`,** so memory and CPU caps hold, because BuildKit does not take a per-build memory cap.
- **Patch sizes.** S3 about 150 to 300 lines (`LocaleManager.h`, `IndexImpl.cpp` guard and settings, `CMakeLists.txt`, tests). C5 about 400 to 800 lines (`SparqlQleverVisitor.cpp` `visitExists`, `ExistsJoin.cpp`, new residual-predicate semi-join, tests). Both mean owning a fork of a project with 404 commits on master since 0.6.0.

## 6. Cross-links that matter for the planner-memory problem

- QLever issue #3190 (merged 2026-10-24, after 0.6.0) reports that planning time and memory grew roughly fourfold with each `FILTER EXISTS` or `FILTER NOT EXISTS` in a group, and that a four-clause query on an eight-triple index needed 5 GB, which is the same signature as the family12 OOM at 2 GiB. Issue #3573 (open) reports factor-10 growth per nesting level. Issue #2667 (open) reports memory and timeouts from many `FILTER EXISTS`. This is a hypothesis for `qlever-planner-memory.md` and is untested here. It suggests C1/C2 add an `EXISTS` per correlated check, so every re-bind should be counted against the 2 GiB planner budget.

## 7. Recommended first experiment per blocker

**String order. Experiment E-S1, about 1 day.**

1. Add `stringOrderKey(text)` in `packages/qlever/src/rdf.ts` (6 hex digits per `codePointAt`, well-formed check already present) and a property test against `Array.from` codepoint comparison, including empty strings, astral codepoints and NFD/NFC pairs.
2. Add a new predicate (for example `value_text_order_v1`) in `rowFields` for string-family assertions, and an `order` channel for `text` in `NativeContext.physicalType`.
3. Re-run the v6 string extension (`qualification/extensions/string-order-v1`) with native queries that order, range and page on the key. Pass criteria are the frozen oracle arrays unchanged: ASCII `A,E,c,z`, continuation `c,z`, Unicode codepoint order, `> U+E000` range.
4. Keep `probe1.py` T2/T3 as an admission gate that runs once per engine image, so an image change that alters ICU data is caught before use.
5. Report storage per assertion on the real Triplex layout, and the backfill rate on an existing scope.

**Correlated `NOT EXISTS`. Experiment E-C1, about half a day.**

1. In the native context, add `ctx.notExists(...)` that re-emits the `ctx.fact` fragments for the listed correlated variables inside the group, and a pure check that rejects an inner `FILTER`/`BIND` using an unbound variable (sparqljs is already in `references/`).
2. Run the matrix in section 4.3 as unit tests against the pinned image, then re-run the two raw controls through the helper (expected `two`) and keep the raw controls as failing documentation of the engine.
3. Run the family12 query shape with the helper at the 2 GiB cap and record planner memory, so the extra `EXISTS` is costed before adoption.

## 8. Limits of this report

- **Probe scope.** One 5,205-triple index plus one 200k-triple storage sample. Hex-key order was verified for strings of 1 to 3 characters exhaustively and up to 30 characters randomly, not for arbitrary lengths. The ICU argument in 5.3 covers arbitrary length, and the probe gate in E-S1 guards a future image change.
- **Not measured.** NoICU behavior (no binary), build time and RAM, storage on the real 30 to 35 triple layout, backfill throughput, the planner-memory effect of re-bind.
- **Upstream claims** about SPARQL 1.2 changing `EXISTS` come from the cited issue thread, not from the 1.2 draft, which I did not read.
- **Probe hygiene.** One throwaway container `tx2-probe-r5` on `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`, `--cpus 2 --memory 3g`, no bind mounts (the scratch directory is not mounted into the VM, so data lived in the container filesystem), removed with `docker rm -f -v`. No repository source was modified. `/Users/sam/projects/triplex-db` and ports 15442 and 17019 were not touched. No personal data was sent in any web request (only public GitHub issue reads through `gh`).

## 9. Files

- This report. `lab/research/R5-qlever-semantic-blockers.md`
- Probe scripts and raw outputs. `lab/research/R5-probe/` (`gen.py`, `lib.py`, `probe1.py` to `probe4.py`, `probe1.out` to `probe4.out`, `README.txt`)
