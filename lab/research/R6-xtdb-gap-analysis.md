# R6: xtdb-native gap analysis (XTQL primary, SQL alternative)

Date: 2026-11-07. Scope: the `xtdb-native` lane only, meaning trusted authored XTQL
(`makeXtdbNativeQueries(...).select`) and SQL (`.selectSql`, `.selectSqlWithReachability`) reads
that share Triplex writes, history and receipts. Broad XTDB capability research is left to another agent.

How this was produced: read-only. I read source, wiki, retained review JSON and the pinned XTDB source.
I did not start containers, run tests, touch `/Users/sam/projects/triplex-db`, use ports 15442/17019,
or edit repo source. I did not spawn subagents (brief said not to), so the Sam-style background
reviewer was not run on this file.

Paths are relative to `/Users/sam/projects/triplex-db-2` unless they start with `references/xtdb`.
XTDB citations are `path:line @ c6c1962` (tag v2.2.0, sha c6c19623d90c658c15400fb46dc056f3735ed57b).

---

## 0. Skim layer

**The XTQL coverage gap.** Of 71 logical tasks, 14 touch XTQL at all and 11 are XTQL-only. All 11 are the
single `state_at` point lookup (workloads 01, 02, 03, 19). Three more tasks (03 `price_at_purchase`, 19 `training_example`)
use XTQL only for the final point read and SQL for the driver query. The other 57 tasks are SQL only, and 14 of those use
the SQL-only reachability helper. In the independent review, native142 traces are 28 XTQL, 164 SQL and 18 untraced
entries with no language (the review labels them `datalog-or-working-state`; by my count they are the host-normalization notes of tasks 07, 10 and 20 supports, 3+3+3 cases times 2 modes) (`qualification/reviews/xtdb-final-combined-independent.json`). Operation names: of 23 distinct
operations in the oracle, 1 has an XTQL implementation (`state_at`), 2 are hybrid, 20 have none (the SQL-only `state_at` of workload 05 is counted under `state_at`).
XTQL features never exercised: `unify`, `join`, `left-join`, `aggregate`, `order-by`, `limit`, `offset`,
`union-all`, `unnest`, `exists?`/`q`/`pull`, `cast`, `:for-system-time`, any recursion (the engine has none).

**Five findings that change the plan.**

1. **No task-wide fixed P in the XTDB native task library.** Every native call re-reads `tx_meta` and takes its own P
   (`packages/core/src/native/NativeQuery.ts:80`; `packages/qualification/src/native/xtdb-workloads.ts:112-115`).
   QLever's library pins one P per task and has a writer-between-calls test; XTDB's has neither. 16 of 71 tasks make two or more calls.
2. **Engine `SUM` over BIGINT wraps silently** (`references/xtdb/core/src/main/kotlin/xtdb/arrow/LongVector.kt:30-33 @ c6c1962`),
   while scalar `+` and `*` are overflow-checked. No native142 value exceeds 11 digits, so nothing tests this.
3. **The retirement-metadata target is already implemented in the native helper, in both languages, but only the SQL path is tested.**
   `Sources.ts:58-97` masks future retirement metadata in SQL and XTQL. The five tiny-v4 failures are on ordinary
   (Datalog and raw) reads. Candidate A's current source uses `selectSql` only.
4. **Reachability reads are write transactions.** `CREATE TABLE`, `INSERT`, `ASSERT`, marker rows and `ERASE` run inside what the
   API calls a read (`packages/xtdb/src/native/Reachability.ts:159-166, 194-205, 139-155`). Cancellation, crash recovery and read-only roles
   are untested for this path, and no XTQL equivalent exists.
5. **Almost none of the cited evidence is in this checkout.** `.devloop/` is absent, so no terminal receipts for native142 v7, unchanged44 v5,
   f64 parameter probes or load events exist here. Of the reviews you named, five are present (section 1). The inherited passes are
   other-machine results and need fresh receipts here before anything is claimed.

**Top 5 next experiments** (full ranking in section 5): (1) native snapshot-assertion helper in XTQL and SQL against the tiny-v4
failing cases; (2) task-wide fixed P plus writer-between-calls test for XTDB native; (3) XTQL parity packet, wave A (non-recursive tasks);
(4) writer-liveness baseline on this VM through the native XTQL path, repeated; (5) port the QLever shape controls (correlated NOT EXISTS,
string order, ties, empties) to XTDB in both languages.

---

## 1. Evidence inventory: what is and is not in this checkout

The handoff says its numbers "bind their as-run sources and finite authored tasks; fresh independent installations need new receipts"
(`handoffs/claude-native/README.md`, "Evidence worth keeping"). Everything below that passed passed on another machine.

| Item named in the brief or wiki | In this checkout | What it supports |
| --- | --- | --- |
| `qualification/reviews/xtdb-final-combined-independent.json` | present | unchanged44 v5, translated142 v3, native142 v7: pins, trace language counts. Review only; raw terminals absent. |
| `qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json` | present | 47/52 pass, 5 fail (retirement-metadata target). |
| `qualification/reviews/xtdb-writer-rate16-control-v1-independent.json` | present | native 16 RPS control: 480 correct, 479 inside 30 s, 6/6 writers inside window. |
| `qualification/reviews/xtdb-handoff-observed-focused-v2-independent.json` | present | identity lookups 20 to 10 per ID, seven scenarios. Its underlying manifests and selected build are absent. |
| `qualification/reviews/xtdb-driver-stages-observed-v1-independent.json` and `-trace-independent.json` | present | the 20 repeated lookups per writer, per-phase wall spans. |
| `qualification/capacity/configured-entities-v1/xtdb-tiny-v4/` | only `expected.json`, `oracle.json` | `manifest.json` and `contract.json` named in the review are absent. The v4 contract text is present as `TINY-XTDB-CONTRACT-v4.md`. |
| `.devloop/jobs/*` (native packet v7, foundation44 v5, f64 v1/v2, load events) | **absent (whole directory)** | No raw terminal, output or event file for any XTDB job. |
| Reviews `xtdb-signed-zero-v2`, `xtdb-selected-foundation44-v1`, `xtdb-native-v6-duckdb`, `xtdb-driver-identity-pairs`, `xtdb-writer-dispatch-{8,16,32}`, `xtdb-load-256-open-*`, `xtdb-isolated-builder-v2` | absent | Only the `.mjs` scripts for signed-zero, point-query-shape and writer-visibility exist. |
| `.artifacts/claude-native-handoff/source-eb14905.tar.gz` | absent | README says it is available; it is not. |
| `.artifacts/assertion-snapshot-ab-v1/`, `assertion-snapshot-ab-offline-preparation-v1/` | present | Candidate A/B source (A uses `selectSql`, `src/nativeHelper.ts:21`). Unbuilt, unexecuted. |
| `packages/xtdb/experiments/query/integer-extrema-1793974552733.json`, `integer-casts-1793972584315.json` | present | Real engine probes: BIGINT MIN/MAX exact; cast-after-filter pass; DECIMAL aggregate fails (`No method in multimethod 'set-value-code' ... :decimal`). |
| `qualification/evidence/xtdb/*`, `qualification/evidence/scale-*prefix-verification*` | present | Early Datalog-era public loads: 100,000 sparse entities loaded and verified (`status: PASS`, `lastDurablePosition: 200`); representative and larger stages `BLOCKED_CAPACITY`, zero entities acknowledged. No native read at that scale. |
| Handoff candidate source (one-row identity handoff) | **not in `packages/`** | `grep -i handoff packages/xtdb/src` is empty; `TransactionContext.ts` has no handoff field. The candidate is an external private build. |

Largest executed XTDB state in any retained artifact: 100,000 entities with 1 fact each. Target is 10m entities and 100m representative facts, so the proven scale is
1/1000 on facts and the proven shape is the sparse one.

---

## 2. Native task library map

### 2.1 How a native read executes

```
 caller builder (ctx, params) -> string        authored in XTQL (select) or SQL (selectSql)
        |
 NativeQueries.run()  packages/xtdb/src/native/NativeQueries.ts:36-162
        |
   1. SET AWAIT_TOKEN (only if this client has submitted)        XtdbClient.ts:184-186
   2. SELECT position FROM tx_meta ... WHERE scope_key=$1        -> P   (one per call)
        |                                                       NativeQueries.ts:68-86
   3. optional: materializeNativeReachability  (writes!)         Reachability.ts
        |
   4. SET AWAIT_TOKEN again, then the answer:
        SQL :  readOnlyNativeSql(body)             (lexical guard, ReadOnlySql.ts)
        XTQL:  XTQL ('(fn [triplex_param_1 ..] <body>)', $1, ..)   Sources.ts:120-126
        wrapped as  SELECT * FROM ( ... ) triplex_native_answer LIMIT maxRows+1
        |
   5. decodeNativeRows against the declared TypeExpr row contract
```

Facts that follow from this:

- Both languages go through pgwire and the same SQL front door. XTQL is a `queryExpressionBody` alternative
  (`references/xtdb/core/src/main/antlr/xtdb/antlr/Sql.g4:704 @ c6c1962`), planned by `visitXtqlQuery` into the same logical plan
  (`core/src/main/clojure/xtdb/sql.clj:2872-2890 @ c6c1962`). The two languages share operators and differ in the front end.
- A native read costs at least 2 statements plus 2 `SET AWAIT_TOKEN` once the client has written. The observed reader pool in the
  instrumented diagnostic shows 482 basis selects, 482 answers and 984 token settings for 480 reads plus 2 pre-window validations
  (`qualification/reviews/xtdb-driver-stages-observed-v1-trace-independent.json`, pool 2).
- The XTQL builder is not passed through `readOnlyNativeSql`. The XTQL string is single-quote escaped, then parsed as EDN (`sql.clj:2879`),
  and XTQL has no write form. Table scope is still the author's job: only `ctx.facts()`, `ctx.recordedFacts()` and `ctx.history()` add the scope, cut and
  retirement masking (`Sources.ts:53-98`). Hand-written `(from :tx_assertions ...)` has no scope guard.
- All Triplex time coordinates are ordinary columns. `valid_from`/`valid_to`/`recorded_at` are binary64 and `_valid_from` is pinned to 1970 on every insert
  (`packages/xtdb/src/XtdbStorageAdapter.ts:38`); every read says `FOR ALL VALID_TIME` / `:for-valid-time :all-time` (`Sources.ts:81, 97`).

### 2.2 Per-workload table (`packages/qualification/src/native/xtdb-workloads.ts`, 71 cases = 20 workloads)

"XTQL" means the call goes through `native.select`; "SQL" through `selectSql`; "Reach" through `selectSqlWithReachability`.
Line numbers are the dispatch branch in the file. Case counts come from `qualification/workloads/temporal-workloads.json`.

| WL | Operation (cases) | Language per call | Reach | Triplex semantics exercised |
| --- | --- | --- | --- | --- |
| 01 (l.239) | `state_at` (4) | XTQL x1 | no | R/V point state, event ordering, late knowledge |
| 02 (l.239) | `state_at` (3) | XTQL x1 | no | corrections: old versus new R cut |
| 03 (l.242) | `state_at` (2) | XTQL x1 | no | R/V point state |
| 03 (l.242) | `price_at_purchase` (1) | SQL `purchase-times` then XTQL per matching purchase | no | per-example V from data; int64 timestamp carrier; interval join done as host loop |
| 04 (l.266) | `coverage_at_claim` (3) | SQL `claim-coordinate` then SQL `coverage-exists` at derived V | no | interval join at claim time; corrections; boolean existence |
| 04 (l.266) | `relation_exists` (1) | SQL x1 | no | existence at fixed cut |
| 05 (l.293) | `accepted_event_count` (1) | SQL x1 (`COUNT(DISTINCT)`) | no | idempotency of duplicate events |
| 05 (l.293) | `state_at` (3) | SQL x1 (MAX-revision CTE, `DISTINCT`) | no | authoritative revision; reordered events. The only `state_at` that is SQL. |
| 06 (l.314) | `account_balance` (4) | SQL x1 (3-way join, `SUM` BIGINT) | no | exact signed int64 sum; business reversal; empty sum as `COALESCE(...,0)` |
| 07 (l.324) | `inventory_balance` (3) | SQL x1 (`GROUP BY ledger`) plus host BigInt subtraction | no | separate ledger reducers; host normalization recorded in trace |
| 08 (l.340) | `customer_net_revenue` (3) | SQL x1 (two CTEs, two sums) | no | join fan-out control; complete-source aggregate |
| 09 (l.350) | `paid_without_entitlement` (3) | SQL x1 (`NOT EXISTS`) | no | positive join plus stratified negation |
| 10 (l.360) | `workflow_status` (4) | SQL x1 to x3 (`MIN`, `MAX`) plus host classification | no | absence via source watermark; knowledge cut; 3 of 4 cases add a host-normalization note |
| 11 (l.399) | `inherited_access` (3) | SQL x1 over two reachability relations | **yes** (member, resource) | recursive membership and resource ancestry; edges taken from `ctx.facts()` at the cut |
| 12 (l.413) | `access_with_deny` (4) | SQL x1 (two correlated `NOT EXISTS`) | no | deny over allow; correction removes block. The authored task reads `support`/`principal` rows with no recursion, although the oracle lists `recursive_allow` in `requires`; I did not check whether the fixture pre-expands inheritance. |
| 13 (l.423) | `container_items` (4) | SQL x1 over closure plus `NOT EXISTS` | **yes** (contains) | recursive containment; temporal move; set answers |
| 14 (l.434) | `recalled_customers` (3) | SQL x1 over closure plus `EXISTS` | **yes** (production) | recursive genealogy; shipment join; correction |
| 15 (l.445) | `dependency_closure` (1), `vulnerable_deployments` (2) | SQL x1 | **yes** (dependency) | recursion with cycle termination; set answers |
| 16 (l.459) | `output_lineage` (3) | SQL x3 (`input_a`, `input_b`, metadata join) | no | versioned lineage; additive metadata; knowledge time |
| 17 (l.480) | `conversion_funnel` (2), `session_conversion` (1) | SQL x1 (three-step self-join) | no | ordered event join; `>= from AND < to` window boundaries; distinct sessions |
| 18 (l.521) | `uptime_duration` (5) | SQL x1 over `recordedFacts()` | no | interval union with gaps and duplicates; half-open clipping; binary64 endpoints. Uses the window-free workaround (3.3). |
| 19 (l.536) | `training_example` (2) | SQL `prediction-label-cut`, then XTQL per prediction | no | per-example two-time join; no future leakage; label cut via `positionToLogical` |
| 19 (l.239) | `state_at` (2) | XTQL x1 | no | R/V point state |
| 20 (l.563) | `reachability_closure` (1) | SQL x1 | **yes** (support) | recursive reachability |
| 20 (l.574) | `reachability_supports` (3) | SQL x3 (path lengths 1 to 3), host sum | no | alternate-support counting on a frozen four-node DAG, bounded by length 3 |

Task counts: 11 XTQL-only, 3 hybrid, 43 SQL-only without reachability, 14 SQL with reachability. 11 + 3 + 43 + 14 = 71.
Reachability tasks are 11 (3), 13 (4), 14 (3), 15 (3), 20 closure (1).
Cross-check: 14 tasks that use XTQL, times 2 modes (current, reopen), gives the 28 XTQL traces in the review. This assumes one XTQL call per hybrid task; the
review count of 28 is consistent with that.

### 2.3 Operations with no XTQL implementation

Twenty of 23 operation names: `coverage_at_claim`, `relation_exists`, `accepted_event_count`, `account_balance`, `inventory_balance`,
`customer_net_revenue`, `paid_without_entitlement`, `workflow_status`, `inherited_access`, `access_with_deny`, `container_items`, `recalled_customers`,
`dependency_closure`, `vulnerable_deployments`, `output_lineage`, `conversion_funnel`, `session_conversion`, `uptime_duration`,
`reachability_supports`, `reachability_closure`.
Also SQL-only: workload 05's `state_at`. Hybrid: `price_at_purchase`, `training_example` (XTQL does only the last lookup).

Why some are structurally harder in XTQL:

- **Recursion (11, 13, 14, 15, 20 closure).** `selectSqlWithReachability` is SQL-only. The edges builder is lexically checked SQL and inserted with
  `INSERT ... SELECT` (`Reachability.ts:171-183`). XTQL needs either an edges builder in XTQL (can an XTQL query sit inside `INSERT ... SELECT * FROM (XTQL(...))`?
  Grammar allows it as a subquery body, `Sql.g4:704, 737`; not probed) or SQL edges plus an XTQL read of `tx_native_relations`.
- **Interval union (18).** XTQL has no window operator at all, so the workaround would be `unify` plus `(not (exists? ...))`, with the same quadratic shape.
- **Everything else** has direct XTQL forms (`aggregate`, `unify`/`join`, `exists?`) in `references/xtdb/core/src/main/clojure/xtdb/xtql.clj:324-614 @ c6c1962`.
  Whether text-to-BIGINT `cast` behaves the same from XTQL is unverified (`expression.clj:158-163` shows `cast` is a shared form).

### 2.4 XTQL feature coverage

| XTQL feature (xtql.clj line) | Used in native142 / load / entry | Status |
| --- | --- | --- |
| `from` with `:for-valid-time :all-time` and `:bind` (401, 372-399) | every XTQL call, via `Sources.ts:97` | covered |
| `where`, `with`, `without`, `return` (414-439) | `facts()`, `stateAt`, load reads | covered |
| `rel` (590) | native-entry safe-parameter check; f64 literal controls | covered (literals only) |
| `unify`, `join`, `left-join` (324, 453, 475) | never | **gap** |
| `aggregate` (490) | never | **gap** |
| `order-by`, `limit`, `offset` (531-545) | never (paging is SQL `ORDER BY/LIMIT/OFFSET`) | **gap** |
| `unnest`, `union-all` (603, 614) | never | gap |
| `exists?`, `q`, `pull`, `pull*` (141-159) | never | **gap** (negation) |
| `:for-system-time` (233-270) | never (and must not be mapped to R) | not applicable until the cut mapping is proven |
| Parameters through `(fn [..] ..)` | yes; negative zero repaired by driver typing (`XtdbClient.ts:147-165`) | covered for the repaired cases |

### 2.5 `packages/xtdb/experiments/native-entry.ts` (13 checks)

| Check | Language | What it proves |
| --- | --- | --- |
| `triplex-shared-schema-write` (l.145) | write only | schema-handle write of int64 max with valid interval `[10.25,10.75)` |
| `{current,reopened}/typed-xtql-fractional-cut` (l.201) | **XTQL** | exact int64 max via schema attribute handle at fractional V 10.5 |
| `{..}/half-open-boundary` (l.215) | **XTQL** | V 10.1 and V 10.75 return no row |
| `{..}/safe-native-parameters` (l.230) | **XTQL** (`rel`) | quote, `$$` and `;` inside a bound text parameter |
| `{..}/future-retraction-metadata-mask` (l.247) | **SQL** (`history()`) | future `retracted_at`/`retract_tx_id` read as null at an old cut |
| `triplex-correction-preserves-original-history` (l.278) | write only | retract plus assert keeps two history rows |
| `native-read-only-refusal` (l.303) | SQL | four multi-statement forms incl. CR, LF, CRLF comment endings are refused |
| `native-fixed-cut-page-continuation` (l.328) | SQL | `ORDER BY/LIMIT/OFFSET` pages with first page's returned basis |
| `native-cancellation-and-connection-reuse` (l.374) | SQL (`pg_sleep`) | abort at 100 ms then healthy reuse; `physicalReclamationQualified:false` |

So 6 checks are XTQL, 5 SQL, 2 write-only. XTQL history masking, XTQL paging, XTQL cancellation and XTQL refusal are untested.
The load runner's native read is also XTQL (`packages/qualification/load/runner.ts:346-348`), one `(-> facts (where ..) (return {:name value_string}))` shape at two bases.

### 2.6 Library-level gaps found while mapping

| Finding | Where | Consequence |
| --- | --- | --- |
| Each call takes its own P. `basisOf` returns only `{recordedAt, validAt}`. | `xtdb-workloads.ts:112-115`; `NativeQuery.ts:80` | 16 multi-call tasks (03 price, 04 coverage_at_claim x3, 10 x4, 16 x3, 19 training x2, 20 supports x3) can mix cuts under a concurrent writer. QLever's `qlever-workloads.ts:188-251` captures one `taskUpperPosition`, and `packages/qualification/experiments/qlever-task-basis.ts` tests a writer between calls. |
| `valueOf` has no `datetime` branch and throws `Unexpected native value family`. | `xtdb-workloads.ts:116-131` | Eight-type native decode is only str, bool, integer (plus ref in edges). Oracle conventions list `str`, `bool`, `i64` only. |
| XTQL point contract declares `text`, `numeric`, `flag` as `TypeExpr.any`. | `xtdb-workloads.ts:233` | Typed hydration of exact int64 through the contract is not what native142 exercises for XTQL. |
| Integers are text in `value_string`; aggregates need `CAST(CASE WHEN value_type='integer' THEN value_string END AS BIGINT)`. | `xtdb-workloads.ts:108-111` | Every int64 aggregate depends on this guard; XTQL equivalent unproven. |
| Host-side arithmetic and classification in 07, 10, 20 supports, 03, 04, 19. | trace `normalization` entries (18 per packet) | Counts as application cost; not engine semantics. |
| Interval union is O(B^2) points plus an anti-join (B = distinct boundaries). | `xtdb-workloads.ts:532` | Fine for 5 intervals; not a scale design. |

---

## 3. Precise explanations

### 3.1 The five failing "historical retirement-metadata" checks (configured-entity tiny v4)

**Fixture.** Eight configured subjects in one fresh scope, public ConfigStore schema v1 then v2, sparse seed (24 facts), dense expansion (96 facts),
seven ACKs at recorded instants 1000.25 to 1006.25, five domain commands, two schema commits. Valid interval `[10.125, 30.5)`.
(`qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md`.)

**Result.** 52 checks: 47 pass, 5 fail, status `CONFIRMED_FAILED_NEW_SHARED_RETIREMENT_METADATA_TARGET`
(`qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json`).

The five failing names:

1. `sparse-old-cut-after-all-writes:retirement-metadata-target`
2. `dense-old:retirement-metadata-target`
3. `corrected:retirement-metadata-target`
4. `absent:retirement-metadata-target`
5. `dense-recorded-R-with-returned-source-P:retirement-metadata-target`

**What fails and why.**

- At an old recorded-time cut R, the ordinary API returns the right set of assertions (membership, values, identities and lineage all pass).
  But each returned row carries its **complete** lifetime, including `retractedAt` and `retractTxId` of a retraction that happened **after** R.
  Eleven such future-retirement rows appear across ten typed snapshots (100 lifetime versions retained separately).
- The new target says an as-of snapshot must show those two fields as `null` until the retirement was known at the cut.
  Counterexample file in the review: assertion `00A35M0J000000000000000001`, R = 1001.25, returned P = 7, retired at 1005.25 by `_tx/01B681NY000000000000000001`; target expects `retractedAt: null, retractTxId: null`.
- Cause in code: `XtdbStorageAdapter.queryRows` selects the stored columns and filters by `recorded_*` and `retracted_*` predicates
  (`XtdbStorageAdapter.ts:111-186`, `cutConditions` l.42-70); it never masks the columns it returns. Ordinary `Triples.history` is documented to retain the full lifetime (`TINY-XTDB-CONTRACT-v4.md`, citing `store/Triples.ts` 249-255); this is distinct from the native `ctx.history()` relation.
- It is classified as failure of a **new** target, not a regression: the older raw-lifetime contract is preserved as compatibility evidence.
  The 44/142 packets were never meant to cover this. The strict combined gate stays FAIL and stages above 8 entities (1,000 to 10,000,000) stay blocked.

**Why this matters for xtdb-native.**

- The native source relation already does the masking. SQL: `CASE WHEN <knownRetraction> THEN retracted_at ELSE NULL END` for all three retirement columns
  (`Sources.ts:58-81`). XTQL: `(with {:retracted_at (if <known> retracted_at nil) ...})` (`Sources.ts:83-97`). `knownRetraction` requires
  `retracted_position <= P` and, when R is given, `retracted_at <= R`.
- Only the SQL form has a retained check (native-entry `future-retraction-metadata-mask`). The XTQL form has none, and the XTQL `with` overwrites a column that `:bind`
  already produced. Treat that as a hypothesis until a run shows XTQL returns nulls at the five cuts.
- The fixture was never read through the native path. Reading the five failing cuts via `ctx.history()` or `ctx.facts()` in both languages is the cheapest way to see
  whether native already meets the target (experiment 1).
- Candidate A (native-backed distinct-result helper, SQL today) and candidate B (adapter primitive) are frozen, unbuilt and unexecuted
  (`.artifacts/assertion-snapshot-ab-v1/`, `qualification/capacity/historical-assertion-metadata-v2/README.md`).
  Only the finite-nine event oracle has independent acceptance. Presence and type-version are explicit application facts; codec `schemaVersion = Some(1)` is a different thing.
- Other things that did not fail: Required rejection with no residue (public position stays 3, no receipt), seven ACKs and journals, five command claims, seven operation receipts, both ConfigStore releases.
  Growth observations (+2,583,961 logical bytes, 0 block delta) are snapshots, not bytes per entity.

### 3.2 Writer liveness and the 20 identity lookups per writer

**What was measured** (`xtdb-driver-stages-observed-v1/0001`; 256 logical clients, 16 reads/s, 16 dispatch slots, six ten-entity corrections over 30 s;
`qualification/reviews/xtdb-driver-stages-observed-v1-trace-independent.json`):

- Each writer issues **22 SELECTs before `BEGIN`**: 20 identity lookups, 1 basis read, 1 command-claim read. With a `SET AWAIT_TOKEN` before each, that is 44 driver statements.
- Over six writers: 120 identity statements form 60 pairs with equal SQL hash and equal typed parameters, each returning exactly one row.
- Public write start to first `BEGIN`: 2.60 to 3.90 s per command. `COMMIT SYNC` callback: 126 to 203 ms. Post-commit to ACK: 13 to 22 ms.
- About 94% of aggregate ACK wall time (0.939) is before `BEGIN`; 91% (0.913) is inside the identity lookups' driver spans
  (`qualification/load-waves/xtdb-identity-read-hypotheses-v1/plan.json`).
  These are driver wall spans. They include network, server and observer time; no engine CPU or index timestamp exists.

**Where the 20 come from** (10 retractions per command, 2 reads each):

```
 TriplesLive.transact, op "retract"            packages/core/src/store/TriplesLive.ts:433
   |-- adapter.getById(id)  -> queryRows({}, undefined, false, id)       read #1  (reserved-write check, change capture)
   `-- adapter.retract(id)  -> queryRows({}, undefined, false, id)       read #2  (stage retracted_* on the row)
                                                XtdbStorageAdapter.ts:529-545
 x10 retractions  =  20 SELECTs, each: scope_key=? AND id=? AND <cut/retraction predicates>
```

Each lookup is a column-predicate scan (`scope_key = ? AND id = ? ...`), not a primary-key lookup, even though the row's `_id` is `JSON.stringify([scopeKey, row.id])`
(`XtdbStorageAdapter.ts:219`). In the pinned engine only an `_id` equality (or OR chain of them) is converted to an IID selector that narrows trie paths
(`references/xtdb/core/src/main/clojure/xtdb/operator/scan.clj:127-180, 333-340 @ c6c1962`); other columns can only use page metadata and bloom predicates.

**Rate history (all inherited, none rerun):**

| Window | Reads correct | Inside 30 s | Writers inside window | Verdict |
| --- | ---: | ---: | --- | --- |
| Original XTDB Triplex (Datalog) 16 RPS | 480 | 407 | 1/6 | strict FAIL (writer floor) |
| Native 256-open diagnostic (5 s window) | 640 | 147 | 0 inside 5 s; ACK at 9.38 s | disqualified |
| Native frozen 128 RPS, dispatch 8/16/32 | 647 / 992 / 974 | 571 / 781 / 765 | 3/6, 2/6, 2/6 | failed liveness |
| Native 16 RPS control (`xtdb-writer-rate16-control-v1`) | 480 | 479 | **6/6** | one diagnostic pass; ACK 1.8 to 2.5 s (`sdkCallMs`) |
| Instrumented Datalog diagnostic 16 RPS | 480 | 479 | 6/6 | one diagnostic pass; ACK 2.8 to 4.1 s |

The native control and the instrumented Datalog run share counts but differ in cohort and instrumentation, so neither is a matched comparison.
512 and 1024 stress (299 and 334 correct, zero writers in 5 s) are timing-valid but not liveness evidence.

**Handoff candidate** (`xtdb-handoff-observed-focused-v2`): keep `getById`'s read, hand the single row to the immediately following `retract` if scope, sourceK, id and pending-row snapshot are
unchanged; cap one row and 64 KiB; any doubt falls back. Seven scenarios, current and reopen: control 2 callbacks per ID, candidate 1; total driver queries 726 to 694;
safe and unsafe CAS rejections (`P0004`) and rollbacks match; all 15 pools and 301/285 leases closed. Not integrated, not run on full142, no performance claim, and the source is not in this checkout.
Two further alternatives in the plan: lookup by `_id` (hypothesis B) and a bulk staging SPI.

**What is not established:** whether `_id` lookup removes the cost, whether write latency is dominated by round trips (about 85 ms per driver statement: roughly 3.8 s over 44 pre-BEGIN statements, at that load) or by scan work,
sustainable writer rate at any read rate above 16, and anything at table sizes above about 1,000 subjects. Single-scope CAS (`ASSERT ... tx_meta position = sourceK`,
`XtdbStorageAdapter.ts:195-197`) serializes all writers of one scope, so 6 writers at 5 s spacing says nothing about contention.

### 3.3 The XTDB 2.2 window-function `AbstractMethodError` and the workaround

**What happened.** Native packet v1 ran all 142 cases and workload 18 (machine uptime interval union) hit an `AbstractMethodError` for an aggregate window query
(`wiki/research.md` "Cross-lane pinned-version finding"; comment at `xtdb-workloads.ts:527-531`). A second bug in the same area was avoided: a "LongVector union/join" issue
with integer-typed endpoints (`xtdb-workloads.ts:529-531`). The final recipe is in packet v7 and passes after close and reopen.

**Cause in the pinned source** (what I can confirm; I did not reproduce the error here):

- The SQL grammar admits many window forms: rank, `ROW_NUMBER`, aggregate-as-window, `NTILE`, `LEAD/LAG`, first/last value, `NTH_VALUE`
  (`Sql.g4:433-447 @ c6c1962`).
- The planner's expression visitor implements only `visitRowNumberWindowFunction` (`sql.clj:2114`) and `visitLeadOrLagWindowFunction` (`sql.clj:2119`).
  No `visitAggregateWindowFunction`, `visitRankWindowFunction`, `visitNtileWindowFunction`, `visitFirstOrLastValueWindowFunction` or `visitNthValueWindowFunction`
  exists anywhere under `core/src/main`. The visitor is a Clojure `reify` of `SqlVisitor`, so a missing method is an `AbstractMethodError` at call time, not a planner message.
  `visitWindowFunctionExpr` (`sql.clj:2098-2107`) dispatches into it.
- Further limits: window frames throw `UnsupportedOperationException` (`sql.clj:2160`) and only one window function per query is accepted (`sql.clj:2391`).
- Do not confuse with `sql.clj:3685`, which also mentions `AbstractMethodError` but concerns the DML static-ops gate (#5856).
- Recursive CTEs are rejected outright (`sql.clj:264-265`), and CTE column aliases are unsupported (`sql.clj:275`). XTQL has no recursion or window operator.

**Workaround** (`xtdb-workloads.ts:532`): over `recordedFacts()`, clip each fact's `[valid_from, valid_to)` to the query window as DOUBLE PRECISION, take the distinct
`(lo, hi)` pairs, collect all boundaries, build elementary segments between adjacent boundaries (`NOT EXISTS` a boundary strictly between), and sum `hi - lo` for segments covered by some clipped interval.
No window operator and no host interval relation.

**Limits to record:**

- Work grows roughly with B^2 for segment pairs and B^3 for the anti-join test in the worst case, where B is the number of distinct clip boundaries. Not a design for large per-machine histories.
- `ROW_NUMBER` and `LAG/LEAD` do work in this engine, but a union of intervals needs a running maximum, which needs an aggregate window. An island-start formulation (`NOT EXISTS` an earlier interval that reaches this start)
  is O(n^2) in intervals but avoids B^3; untested.
- The wiki says the workaround is "a hypothesis for other paths, requiring their own rerun". For XTDB native it passed native142 v7 only on fixtures of at most 5 intervals.
- No XTQL version exists.

### 3.4 Recorded time versus XTDB system time

```
 Triplex coordinate               where it lives                        XTDB coordinate it is NOT
 --------------------------------------------------------------------------------------------------
 recordedAt  R   (binary64)       column tx_assertions.recorded_at      _system_from / _system_to
 recordedPosition P (integer)     column recorded_position, tx_meta     tx id / system time
 validFrom/validTo V (binary64)   columns valid_from, valid_to          _valid_from / _valid_to (pinned to 1970)
 retractedAt / retractedPosition  columns retracted_at / _position      system-time version of the row
```

Caveats, each with its basis:

1. **Different clocks.** Triplex R comes from the Triplex runtime clock (tests use `deterministic.startTime`, e.g. 1000.25; `native-entry.ts:131-137`). XTDB system time is assigned at
   transaction resolution from the log message timestamp, bumped by 1 microsecond so it is strictly greater than the previous transaction
   (`references/xtdb/core/src/main/kotlin/xtdb/indexer/TxResolver.kt:209-235 @ c6c1962`). A caller can propose a system time but it must be later than the latest
   completed transaction (`TxResolver.kt:219-232`). R and system time can never be compared by value.
2. **One XTDB transaction can hold several Triplex positions.** `nextCommitPosition()` increments inside the callback (`XtdbStorageAdapter.ts:486-495`, nested savepoints at l.343-385) and `persist`
   submits one `BEGIN READ WRITE ... COMMIT SYNC` with a single `tx_meta` row. System time therefore cannot distinguish intermediate logical positions.
3. **Retraction rewrites the row.** A retract re-INSERTs the whole row at the same `_id` with `_valid_from` 1970, so XTDB keeps the earlier version at an earlier system time. That makes
   `FOR ALL SYSTEM_TIME` a possible source for "the row as it was before retraction" (the stronger snapshot target), but nothing maps R or P to a system time.
   The frozen menu makes this "C" and gates it (`historical-assertion-metadata-v1/MENU.md`). The README states the same: no CLOCK_TIME conversion or latest-token shortcut is eligible.
4. **Native never sets a snapshot or clock.** The client can emit `SETTING SNAPSHOT_TOKEN`/`CLOCK_TIME` (`XtdbClient.ts:188-191`; grammar `Sql.g4:86-93`), but `NativeQueries.run` passes no basis.
   Cut stability is by predicate on P instead, which is correct because rows are append-plus-retraction-metadata: any row visible at the P read is visible later, and later retractions are filtered by `retracted_position <= P`.
5. **Freshness is per client.** `latestAwaitToken` is closure state in each `makeXtdbClient` (`XtdbClient.ts:132, 184-186`). A second client (the native provider's own pool, or a separate reader Runtime) has no token until it submits,
   so its reads may not include a just-ACKed commit. Correctness is unaffected because the returned basis reports the P actually used; freshness is. The load notes already show three separate pools
   (`wiki/problems/load-liveness.md`).
6. **Fixture convention, not a mapping.** The packet maps fixture `known_at` to `recordedAt = 1000 + known_at` (`xtdb-workloads.ts:112-115`) because its loader uses a deterministic clock. That is a harness choice.
7. **Native valid time is unusable for Triplex V.** Every insert pins `_valid_from` to 1970, so XTDB's `FOR VALID_TIME`, `PERIOD` and `FOR PORTION OF VALID_TIME` features cannot answer Triplex questions; workload 18 emulates interval algebra by hand.
8. **Defaults.** An omitted R means no `recorded_at` filter (latest by P). An omitted V is the client's `Date.now()` (`Temporal.ts` `resolveTemporalBasis`). Public `TemporalBasis` takes R and V only; exact P is internal or explicit in the native contract
   (`handoffs/claude-native/README.md`).

---

## 4. The ten goals for xtdb-native

"Proven" means a retained inherited result, not a result in this checkout. Evidence paths are given. "Missing" lists specific gaps.

### Goal 1. Eight exact value types, schemas, cardinality, uniqueness, references

- **Proven (inherited).** Foundation unchanged44 v5 (`xtdb-final-combined-independent.json`; zero native traces in that packet). Native: exact int64 max through XTQL with a schema attribute handle,
  current and reopen (native-entry l.201-214, wiki status claims 13 checks pass). Negative-zero parameter repair, 24 + 10 checks (`wiki/problems/native-number-parameters.md`; review file absent).
  BIGINT extrema and cast-after-filter probes (`packages/xtdb/experiments/query/integer-*.json`, present).
- **Missing.** Native decode of `number`, `datetime`, `json`, `blob` (the library throws on datetime, `xtdb-workloads.ts:116-131`; oracle values are str, bool, i64 only). Stored `-0.0`, NaN and infinity rejection, surrogate rejection,
  JSON key-order and blob metadata via a native contract. Constraints (cardinality, uniqueness, references) are write-side and never read natively. Contracts are hand-written `TypeExpr`, not derived from `Attribute`/`EntityType`.
- **Smallest next experiment.** Eight-type round trip: one assertion per type, including `-0.0`, +-2^63 edges, a lone surrogate (must be refused), a JSON object with unsorted keys, a blob. Read each with XTQL and SQL under declared row contracts,
  current and reopen, compare to an independent oracle. One scope, under 100 rows, minutes.

### Goal 2. Expressions, arithmetic boundaries, specified error semantics

- **Proven (inherited).** Native142 arithmetic (exact sums, comparisons, `CASE`-guarded casts) in SQL; cast guards (`integer-casts-1793972584315.json`).
- **Missing.** Overflow behavior: engine `SUM` over BIGINT adds with an unchecked `+` (`LongVector.kt:30-33`) while `+` and `*` use `Math/addExact` (`expression.clj:880-883, 925`), so a sum past 2^63 wraps silently;
  Triplex requires rejection. Native errors surface as `ReadError("XTDB native query failed: PostgresError...")`; no mapping to a specified error taxonomy. Division, remainder, NaN, out-of-range cast through native.
  XTQL expressions used in the library: `=`, `<=`, `>`, `and`, `or`, `not`, `nil?`, `if`, `coalesce`. DECIMAL aggregates fail in the engine (`integer-extrema` evidence).
- **Smallest next experiment.** Boundary probe in both languages: `SUM` of three values near 2^62, `+`/`*` overflow, `CAST('9223372036854775808' AS BIGINT)`, `ABS(min)`, text-to-i64 cast from XTQL, DECIMAL. Record whether each wraps, errors or returns wrong values, and what error text the host sees.

### Goal 3. Plans, costing, preconstruction admission, recursion

- **Proven (inherited).** 14 of 71 tasks use server-side relation rounds with budgets of 100,000 rows and 100 rounds (`xtdb-workloads.ts:208-213`, `Reachability.ts:35-43`). Fake-client unit tests for lost-round-ACK reconciliation and row-guard failure (`packages/xtdb/test/native-reachability.test.ts`).
- **Missing.** Any plan or cost capture (`EXPLAIN`, `explain-analyze?` exists at `scan.clj:313`). Admission is after the fact: `LIMIT maxRows+1` and an `ASSERT` row-count guard follow the `INSERT`.
  Each recursion round is a transaction with an attempt-marker row, so latency and log growth scale with rounds. Recursion only on 4-node graphs. No XTQL reachability. Recursive CTEs and window frames are engine-unsupported (3.3).
- **Smallest next experiment.** On a 100k-edge chain of depth 50, time `selectSqlWithReachability` end to end, count XTDB transactions per read, and capture `EXPLAIN ANALYZE` for the round `INSERT ... SELECT`. Add a probe for `INSERT ... SELECT * FROM (XTQL(...))`.

### Goal 4. Completed absence and negation at coherent cuts

- **Proven (inherited).** `NOT EXISTS` tasks 09, 12, 13 and the watermark-based absence task 10 pass in SQL on the fixed fixtures. Single-call paging at a returned basis (native-entry l.328-373).
- **Missing.** XTQL negation (`(not (exists? ...))`) never run. No task-wide P (2.6), so multi-call absence tasks can mix cuts. The QLever correlated `NOT EXISTS` counterexamples (`wiki/problems/native-correlation.md`) have not been run against XTDB.
- **Smallest next experiment.** Experiments 2 and 5 in section 5: pin P per task and test a real writer between calls; port the flat and nested correlated `NOT EXISTS` controls to XTDB in SQL and XTQL.

### Goal 5. Aggregates, typed groups, empties, exact overflow

- **Proven (inherited).** SQL `SUM/COUNT/MIN/MAX/GROUP BY` in 06, 07, 08, 10, 17, 20; empty sum via `COALESCE`; BIGINT extrema exact.
- **Missing.** XTQL `aggregate`. Overflow (Goal 2). Typed group identity beyond string keys. Set versus pair versus witness distinctions only on the four-node DAG. No aggregate at scale.
- **Smallest next experiment.** XTQL `aggregate` versions of 06, 07, 08 plus grouped-empty, tie-winner and empty-max controls (QLever's three passing and two failing shape controls, `native-correlation.md`), both languages.

### Goal 6. Cancellation, deadlines, resource ownership, cleanup

- **Proven (inherited).** One SQL abort at 100 ms on a `pg_sleep(2.0)` then healthy reuse with `maxConnections: 1`; `physicalReclamationQualified:false` (native-entry l.374-417). The client holds the connection until the driver query settles
  (`XtdbClient.ts:207-217`). Pre-cancelled requests issue no statement (`native-query.test.ts`). Native16 control: no read errors, 6/6 writers.
- **Missing.** Any engine-side drain observation (see `wiki/problems/cancellation-observation-levels.md`: settled Effect, transport cancel, drained work and idle engine are four different claims). XTQL cancellation. Cancellation during a reachability round, where scratch rows
  stay behind and `NativeWorkingOutcomeUnknown` retains them. 128 RPS dispatch arms failed availability and writer liveness and stay failures. Native 256-open had no visible writer inside 5 s.
- **Smallest next experiment.** Experiment 9: abort a genuinely long XTQL and SQL scan, then read XTDB metrics/logs for the statement, and reuse the connection; repeat mid-reachability and count leftover `tx_native_relations` rows.

### Goal 7. Atomic writes, receipts, migration, recovery

- **Proven (inherited, shared).** Safe and unsafe CAS rejection (`P0004`) with rollback, claims, receipts (handoff review). Tiny v4: seven ACKs, five claims, seven operation receipts, Required rejection with no residue, two ConfigStore releases.
  `resolveXtdbOperation` for unknown outcomes. Clean stopped backup/restore script only (`packages/xtdb/experiments/recovery.mjs`, no retained result here).
- **Missing.** Abrupt crash or lost-ACK proof ("normal deterministic CAS competition is not crash/lost-ACK fault proof", handoff review). Engine restart with native reads at old cuts. Migration of existing data. For native: scratch-table residue after a crash mid-round.
- **Smallest next experiment.** Experiment 10: kill the XTDB container mid-`COMMIT SYNC` and mid-reachability, restart, resolve the operation, re-read old cuts natively, inventory leftover scratch.

### Goal 8. Bounded reuse, transactional publication, maintained supports

- **Proven.** Nothing for native. Reachability scratch is erased after every read (`Reachability.ts:139-155`), so there is no reuse. `MaintainedQueries.ts` is a shared-package feature with no native consumer.
- **Missing.** Cached closure keyed by scope, P, R, V and relation definition hash; cost of rebuild versus reuse; incremental alternate-support counting beyond the length-3 bound.
- **Smallest next experiment.** Fold into experiment 7 (scale ramp): record transactions and wall time per reachability read at 100k edges. If one read costs tens of seconds, prototype reuse at the same P.

### Goal 9. Bitemporal intervals, presence, corrections, lineage, deletion, cascades

- **Proven (inherited).** Tiny v4 passes membership, lineage, history, corrections, presence/type-version facts, receipts on ordinary reads (47/52). Native: fractional-V half-open boundaries in XTQL, retirement masking in SQL, interval union (18), lineage (16), per-example two-time join (19).
- **Missing.** The five target failures (3.1). XTQL retirement masking. Native reads of the configured fixture. Deletion and cascades (presence=false is an application convention with no cascade; `presence-reference-deletion-requirements-v1`). Same-timestamp distinct commits through native.
  A mapping from R or P to system time (3.4).
- **Smallest next experiment.** Experiment 1.

### Goal 10. Public TypeScript and schema integration, scope, cursors, lifecycle, capabilities, consumers

- **Proven (inherited).** 13 native-entry checks; `public-native-consumer-v2` (13-tarball clean consumer, typed native reads current and reopen; terminal absent here). Basis reports scope, P, V, R.
- **Missing.** Contracts derived from schemas. Capability advertisement (runtime uses `Capabilities.none`). A cursor API (paging is hand-authored `OFFSET` on a first-page basis, O(offset) at scale). Scope isolation relies on authors using `ctx.facts()`.
  Lifecycle: `openNative` builds a separate client with the default 20-connection pool. String ordering extension: pinned XTDB compares UTF-8 as unsigned bytes for `<` and `ORDER BY` (`expression.clj:803-806`, `expression/comparator.clj:62-66 @ c6c1962`), which is codepoint order, so a pass is expected but nobody has run it
  (`wiki/research.md` says DuckDB/XTDB still need the ASCII extension run).
- **Smallest next experiment.** Experiment 1 for the public helper, plus a mixed-case `ORDER BY`/range/page check (inside experiment 5).

---

## 5. Ranking: top 10 next experiments

Scoring: goal impact 1 to 5 (how many goals it moves, and whether it closes a known failure) times feasibility 1 to 5 on a 6 CPU / 12 GiB VM. Feasibility assumes the repo's XTDB container
(`compose.xtdb.yaml`: 4 CPU, 8 GiB, JVM `-Xmx3g`, direct memory 2g, 512 MiB cache) leaves 2 CPU and about 4 GiB for Node and the OS. Effort figures are my estimates.
Ties go to the cheaper experiment.

**Prerequisite E0 (unranked).** Rebuild the pinned source on this VM and produce fresh receipts for unchanged44, native142 and the 13 native-entry checks, with your own ports, volume and caps. Nothing below is comparable to the inherited numbers without it. About 1 hour of compute after setup.

| Rank | Experiment | Goals | Impact | Feasibility | Score | Effort |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | Native snapshot-assertion in XTQL and SQL on the tiny-v4 failing cuts | 9, 10 | 4 | 5 | 20 | 0.5 to 1 day |
| 2 | Task-wide fixed P plus writer-between-calls test for XTDB native | 4, 9, 10 | 4 | 5 | 20 | 0.5 day |
| 3 | XTQL parity packet, wave A (non-recursive tasks) | 1, 2, 4, 5, 9, 10 | 5 | 4 | 20 | 2 to 3 days |
| 4 | Writer-liveness baseline on this VM through native XTQL reads | 6, 7, 10 | 4 | 4 | 16 | 0.5 to 1 day |
| 5 | Port QLever shape controls to XTDB (both languages) | 2, 4, 5, 10 | 4 | 4 | 16 | 1 day |
| 6 | Numeric and type boundary probe, eight-type round trip | 1, 2, 5 | 3 | 5 | 15 | 0.5 day |
| 7 | Scale ramp with bytes per fact and nine query families | 3, 8, 10, capacity | 5 | 3 | 15 | 2 to 4 days |
| 8 | `_id`-keyed lookup versus column predicate | 6, 7 | 4 | 3 | 12 | 1 day |
| 9 | Native cancellation drain, SQL and XTQL, mid-scan and mid-reachability | 6 | 3 | 3 | 9 | 1 day |
| 10 | Crash and lost-ACK recovery for native reads and reachability scratch | 7 | 3 | 3 | 9 | 1 to 2 days |

Runner-up (11th): XTQL reachability plus a scalable window-free interval union. It is folded into 3 (wave B) and 7.

### Details

**1. Native snapshot-assertion, XTQL and SQL.**
- Setup: the frozen four-commit, five-version microfixture and the same-R two-commit control from `historical-assertion-metadata-v1/reproducers.json`, one subject per fresh scope; plus the five failing tiny-v4 cuts read through `ctx.history()` and `ctx.facts()` in both languages.
- Method: independent oracle replays events; capture P once; pause between capture and read, commit a second writer, resume at the captured P.
- Pass: retirement fields null before the retirement is known at (R, P); equal to oracle after; raw ordinary reads unchanged; XTQL and SQL agree row for row.
- Why first: it is the only known failing gate, the engine mechanism already exists, and it settles the XTQL `with`-overrides-bound-column question.

**2. Task-wide fixed P.**
- Setup: copy the shape of `packages/qualification/experiments/qlever-task-basis.ts` to XTDB; thread one `recordedPosition` through every call of a logical task in `xtdb-workloads.ts` (explicit earlier cuts such as 19's `positionToLogical` stay earlier and may not exceed the task P).
- Pass: first task keeps its first P across a real committed writer; next task sees the writer; native142 unchanged. Today's code will fail the first clause on tasks 04, 10, 16, 19, 20.

**3. XTQL parity packet, wave A.**
- Author XTQL for 04 relation_exists and coverage, 05, 06, 07, 08, 09, 10, 12, 16, 17, 18 using `unify`, `join`, `aggregate`, `(not (exists? ...))`, `cast`. Keep the existing independent oracle and pins; new job identity (for example `xtdb-native-xtql-packet-v1`), separate from native142 so SQL results are not relabeled.
- Pass: 71 cases (current and reopen) match the oracle with a recorded trace language of XTQL for every call of these tasks.
- Wave B: reachability (11, 13, 14, 15, 20) after the `INSERT ... SELECT (XTQL ...)` probe.

**4. Writer-liveness baseline.**
- Repeat the rate16 control (256 logical clients, 16 reads/s, dispatch 16, six ten-entity corrections, 30 s) three times with the native XTQL point read, pin XTDB to 4 cores and the runner to the other 2, record co-runners.
- Then step the read rate (32, 64) and optionally run the handoff candidate if it is built privately. Report per-window ACK and visibility; do not claim a winner from one cohort.

**5. QLever shape controls on XTDB.**
- Flat and nested correlated `NOT EXISTS` with two revision rows and a later-order relation (expected only `two`); empty max group stays absent; grouped empty `SUM` gives no row; tied int64-max winners; mixed-case `ORDER BY`/range/page; all in SQL and XTQL.

**6. Boundary probe.** See Goal 1 and Goal 2 experiments; one scope, minutes.

**7. Scale ramp.**
- Load representative entities (10 facts each) at 10k, 100k, 1M entities through public writes. At each stage record data, log and buffer bytes after compaction, bytes per fact, and run point, selective filter, join, anti-join, aggregate, historical, interval, recursion and pagination families.
- Include `EXPLAIN ANALYZE` on the XTQL point read.
- First act: measure bytes per fact. The retained capacity model uses 8,414.8 B per fact from a tiny sample and rejects the 100k x 10 stage at a projected 58.2 GB peak against a 12 GiB owned cap
  (`qualification/ledger.json` `scaleGates[0]`; `qualification/evidence/xtdb/scale-2026-11-06T14-51-11-520Z-7f81e897-scale.json`) and 10m x 10 at 5.05 TB
  (`...a01f788f-scale.json`, `plannedWorstOverlapBytes`). The real figure is unknown, and the VM disk size has not been given to me.

**8. `_id` lookup.**
- On the experiment-7 100k fixture, compare identity lookup by `scope_key = ? AND id = ?` against `_id = '["scope","id"]'`, with `EXPLAIN ANALYZE`, for single and OR-chain forms (`scan.clj:167-180`). Check that results are equal under pending overlays and nested savepoints before using it in `retract`.

**9. Cancellation drain.** Needs a scan long enough to be abortable (use the 1M-entity fixture or a self cross-join). Observe XTDB `/metrics` and logs, and verify no leftover reachability rows after abort.

**10. Recovery.** Kill the container during `COMMIT SYNC`, then during a reachability round. After restart: resolve the operation id, re-read old cuts natively, list `tx_native_relations` and `tx_native_relation_attempts` residue.

### Not on the list on purpose

- Rust, new indexes or maintained views: nothing here shows a measured TypeScript bottleneck.
- QLever work, Datalog translator work and shared SDK work: other owners.
- Full 10m / 100m load: blocked until experiment 7 measures bytes per fact and the VM disk is known.

---

## 6. Pinned-source facts that bear on the gaps (`references/xtdb`, v2.2.0, c6c1962)

| Fact | Citation | Bears on |
| --- | --- | --- |
| XTQL is a SQL query-body alternative `XTQL ( 'edn' [, params] )` | `core/src/main/antlr/xtdb/antlr/Sql.g4:704` | both languages share pgwire; XTQL composes with `UNION`, CTEs, subqueries |
| XTQL string is EDN-read and compiled to the same logical plan as SQL | `core/src/main/clojure/xtdb/sql.clj:2872-2890` | shared operators, separate front ends; qualify separately |
| XTQL operators: `from`, `unify` (`from where with join left-join rel unnest`), tails `where with without return aggregate order-by limit offset unnest`, `rel`, `union-all`; expressions `exists? q pull pull*`; no recursion | `core/src/main/clojure/xtdb/xtql.clj:286-614, 141-159` | what the coverage gap could be filled with |
| Recursive CTEs rejected; CTE column aliases unsupported | `core/src/main/clojure/xtdb/sql.clj:264-265, 275` | reachability needs host-driven rounds |
| Only `ROW_NUMBER` and `LEAD/LAG` window visitors exist; aggregate and rank windows missing; frames unsupported; one window function per query | `sql.clj:2098-2160, 2389-2392`; `Sql.g4:433-447` | the `AbstractMethodError` and workload 18 workaround |
| `_id` equality or OR-chain becomes an IID selector; other columns use metadata and bloom predicates | `core/src/main/clojure/xtdb/operator/scan.clj:127-180, 333-340` | identity lookup cost; point reads at scale |
| System time is log timestamp, forced strictly increasing by 1 microsecond; explicit system time must be later than the last transaction | `core/src/main/kotlin/xtdb/indexer/TxResolver.kt:209-235` | R and P cannot map to system time by value |
| `SETTING SNAPSHOT_TOKEN / SNAPSHOT_TIME / CLOCK_TIME / DEFAULT SYSTEM_TIME` exist | `Sql.g4:86-93` | the unproven "candidate C" |
| BIGINT `+` and `*` use `Math/addExact` | `core/src/main/clojure/xtdb/expression.clj:880-883, 925` | scalar overflow is checked |
| BIGINT `SUM` accumulates with unchecked `getLong + v` | `core/src/main/kotlin/xtdb/arrow/LongVector.kt:30-33` | silent wrap versus Triplex overflow rejection |
| UTF-8 `<`, `<=`, `>`, `>=` and `ORDER BY` use `compare-nio-buffers-unsigned` | `expression.clj:803-806`; `expression/comparator.clj:62-66` | codepoint order expected for string range, order and paging |
| `ORDER BY` sorts a materialized relation by index with a comparator chain | `core/src/main/clojure/xtdb/operator/order_by.clj:55-68` | `OFFSET` paging cost grows with offset (I did not trace spill behavior) |

---

## 7. Open questions and things I did not verify

- I did not run anything. Every behavioral statement about the engine is from source or from retained review JSON, not from a fresh execution. The engine claims most worth a quick probe: XTQL `with` overriding a bound column;
  XTQL `cast` text to i64; `INSERT ... SELECT` from an XTQL subquery; whether `LongVector` `SUM` wrap reproduces through SQL and XTQL; whether `AbstractMethodError` is exactly the shape of the original failure.
- The 28 XTQL traces equal 14 tasks times 2 modes only if every hybrid task makes one XTQL call. I derived this from the code and fixtures; the raw trace is not in this checkout.
- Effort and feasibility scores are estimates. The VM disk size, whether QLever shares the VM, and whether Docker is available on it are unknown to me. Disk is the first-order limit for anything above 100k entities.
- `native142 v7` could have changed between the README's "native-packet-v7" and the source in `packages/`; the review binds 133 declared source files and I did not recompute hashes.
- The 20-lookup cost per writer was measured at about 1,000 subjects. I have no data on how it behaves at 1M or 10M subjects, which is why experiments 7 and 8 come before any optimization claim.
