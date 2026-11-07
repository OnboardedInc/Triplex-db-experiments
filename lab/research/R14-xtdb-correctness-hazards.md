# R14: XTDB 2.2.0 correctness hazards and which Triplex query shapes they reach

Pinned engine: `ghcr.io/xtdb/xtdb:2.2.0`, source tag `v2.2.0`, sha `c6c19623d90c658c15400fb46dc056f3735ed57b` (cited below as `path:line @ c6c1962`).
Upstream state was read on 2026-11-07 with unauthenticated GitHub API calls and release notes. No release exists after 2.2.0 (the only other release that day is 2.1.1, a rollback patch), so every "fixed on main" item below is unreleased.

Evidence tags used throughout: **[P]** reproduced by me on the healthy `dev` XTDB 2.2.0 (probe files listed at the end), **[S]** read in the 2.2.0 source, **[I]** stated in the upstream issue or PR, **[R]** stated in the release notes, **[T]** read in our code.

---

## 1. Verdict

Wrong answers that look plausible are present in 2.2.0 and reach our query shapes. Five matter most, ranked by (silence x plausibility x how directly we hit it):

1. **`SUM` over BIGINT wraps silently.** Three workloads in `xtdb-workloads.ts` (06, 07, 08) sum BIGINT directly. `+`, `*` and negate raise an overflow error, so only the aggregate and `ABS(MIN)` are silent. Guard: sum `DECIMAL(32,0)` (exact in 2.2.0, no measurable cost). [P][S][T]
2. **A correlated `NOT EXISTS (SELECT 1 ...)`, `EXISTS`, `IN` or `NOT IN` drops or nulls rows when any inner row's predicate is unknown** (upstream #6313, open, fix PR #6337 not merged). Our workloads 09, 12 and 13, the reachability round, and the constraint reference check all have this shape. Guard: write the correlated predicate as `(p) IS TRUE`. Cost measured at zero. [P][I][T]
3. **A mark join whose build side passes 100,000 rows answers `false` for every row** (upstream #6345, fixed on main 2026-11-04 by PR #6351, not released). It hits `EXISTS` or `IN` that is projected or sits under `OR`, which is exactly how our Datalog `or` clause and the constraint reference check compile. [P][I][T]
4. **A join's pushdown reaches a scan beneath `LIMIT`, `ORDER BY ... LIMIT` or a window** (upstream #6151, open). I reproduced the issue's example and a second case it only lists as "check": `ROW_NUMBER()` returned `_id 5` where the correct answer is empty. Aggregates did not reproduce in four shapes. [P][I]
5. **`col = ANY(x) AND p` parses the `AND p` into the operand of `ANY`** and returns zero or wrong rows (new finding from R10, no upstream issue found). Cause is the grammar at `Sql.g4:753-756 @ c6c1962`. No builder of ours uses `ANY`, but R7 and R10 recommend it. [P][S]

Next tier, all NULL-equality bugs, all reproduced: outer joins match NULL keys (#6339), `INTERSECT` and `EXCEPT` never match rows holding NULL (#6340), `DISTINCT` and `GROUP BY` treat lists and structs holding NULL as unequal to their copies (#6341). Our builders reach them only through hand-written native SQL.

Two findings that are not wrong answers but change earlier research:

- **R7 open question 4 is answered.** Queries kept planning over uncompacted L0 files after a restart because a node reads the trie catalog current at its last transaction, not after compaction (upstream #6174, results stay correct, fixed on main by PR #6328 on 2026-11-01, so it is present in 2.2.0). A new transaction, or a second restart, refreshes it. [I]
- **R1's `Java heap space` on distinct-text literal `VALUES` has a close upstream relative** (#5928, open): every distinct literal inside a scan predicate compiles about six new JVM classes, growing metaspace. Our Datalog compiler inlines `recorded_position`, `recorded_at` and `valid_from` bounds as literals (`packages/core/src/datalog/compiler.ts:230-234`), so each new commit position or `validAt` adds classes. That is an operational risk, not a wrong answer. [I][T]

---

## 2. Method and limits

1. Searched `xtdb/xtdb` issues and PRs with about 35 unauthenticated search calls (wrong or incorrect results, silently, overflow, NULL, ORDER BY, pushdown, DISTINCT, valid time, time zone, cast, collation, compaction, snapshot token, label sweeps over `sql`, `logical-plan`, `expression engine`, `join-planning`, `types`, `xtql`), then read the full 2.2.0 milestone (220 closed issues) and every open issue created in 2026 (232).
2. Read about 40 issue bodies in full. Comment threads were not read except where the issue said a comment held the repro.
3. "Fixed in" for closed issues is inferred from the close date against the release dates (2.1.0 2025-12-01, 2.2.0-beta1 2026-04-30, rc0 2026-07-21, rc1 2026-08-06, beta2 2026-09-17, beta3 2026-09-28, rc2 2026-10-20, 2.2.0 2026-10-21). The local clone is shallow (one commit), so I could not ask git which tag contains a fix. Anything closed on or after 2026-10-22 is not in 2.2.0.
4. I ran 11 probes on the `dev` engine with a private `r14_` table prefix, never touching other tables. XTDB 2.2.0 has no `DROP TABLE`, so I removed my data with `ERASE FROM`; 19 empty `r14_*` tables remain registered in the catalog until that engine is recreated. All counts were verified to be 0.
5. I did not test: restart and compaction visibility (needs a dedicated engine), `FOR SYSTEM_TIME` windows, PATCH or `FOR PORTION OF` (our builders never use them), pgwire binary type mapping beyond what R1 covered.

---

## 3. Hazard table

Class codes: **W** wrong rows or values with no error, **S** silent wrap or truncation, **N** nondeterministic, **O** operational (memory, restart, ops), **E** raises an error (listed because it is order-dependent or surprising).
"2.2.0" column: **Y[P]** reproduced on 2.2.0, **Y[S]** present by source or release timing, **N** not present.

| ID | Upstream | Class | Versions affected | Fixed | Minimal trigger | 2.2.0 | Our exposure | Guard |
|---|---|---|---|---|---|---|---|---|
| H01 | none (engine behaviour), `LongVector.kt:30-33` | S | all 2.x | no | `SELECT SUM(v)` over BIGINT where the true sum exceeds 2^63-1 | Y[P][S] | Direct: workloads 06, 07, 08 | Sum `CAST(.. AS DECIMAL(32,0))` |
| H02 | #6313 | W | NOT EXISTS with `SELECT 1`: since 2.2.0-rc2. Other forms: since 2.0.0-beta1 | PR #6337 open | `NOT EXISTS (SELECT 1 FROM z WHERE z.k = x.y)` when any `z.k` or `x.y` is NULL | Y[P] | Workloads 09, 12, 13; reachability round; constraint ref check; Datalog `not` (type-tag guarded) | `(p) IS TRUE`; or `EXCEPT`/`NOT IN` over an inner join |
| H03 | #6345 | W | since 2.1.0 | main 2026-11-04 (PR #6351) | Projected or `OR`-ed `IN`/`EXISTS` whose subquery has more than 100,000 rows | Y[P] | Datalog `or`; constraint ref check | Raise `XTDB_JOIN_SPILL_THRESHOLD`; or UNION rewrite; or row-count guard |
| H04 | #6151 | W | all 2.x with IID or bloom pushdown | open | `JOIN (SELECT .. ORDER BY v LIMIT 1) ON sub._id = a.k`, or a `ROW_NUMBER()` subquery | Y[P] | Window CTEs in TemporalQueries; any native join over a limited subquery | Reject the shape; differential check |
| H05 | none found; `Sql.g4:753-756`, `sql.clj:2210-2232` | W | 2.2.0 and main | no | `k = ANY($1) AND a = 'x'` | Y[P][S] | None in builders; recommended in R7 and R10 | Forbid `ANY`/`SOME`/`ALL` with a non-subquery operand; use `IN (SELECT x FROM UNNEST($1) AS u(x))` |
| H06 | #6339 | W | since 2.1.0-beta5 (`a8d48432f`, 2025-08-12) | PR #6343 open | `l LEFT JOIN r ON l.k = r.k` with NULL keys on both sides | Y[P] | One `LEFT JOIN` in ConstraintValidation (non-null keys); native SQL | `AND l.k IS NOT NULL` in the ON clause |
| H07 | #6340 | W | since 2.1.0-beta5 (`c549c0d3f`) | PR #6343 open | `INTERSECT` or `EXCEPT` over rows containing NULL | Y[P] | None in builders (no `INTERSECT`/`EXCEPT`) | `EXISTS`/`NOT EXISTS` with `IS NOT DISTINCT FROM` |
| H08 | #6341 | W | never worked | PR #6344 open | `DISTINCT`/`GROUP BY` over a list or struct containing NULL | Y[P] | Only if a native query groups on array or struct columns | Type check in the contract; sentinel-key rewrite |
| H09 | #6013 | W | 2.2.0-rc1 to main | open | Untyped (OID 0) or text parameter compared to a numeric column: `n = $1` is 0 rows, `n <> $1` is all rows | Y[P] | `XtdbClient.ts:148-165` types every value, so only a numeric bound as a JS string | Keep explicit OIDs; unit-test the mapping |
| H10 | #6174 | O | all 2.x until main | main 2026-11-01 (PR #6328) | Restart, or compaction with no later transaction | Y[I] | Explains R7 open question 4; slows reads, results stay correct | Submit one transaction after restart before measuring |
| H11 | #5928 | O | 2.1.0 to main | open | Distinct inline literal in a scan predicate | Y[I] | Datalog compiler inlines basis numbers (`compiler.ts:230-234`) | Bind as parameters; cap metaspace; watch class count |
| H12 | #5806 | S | 2.1.x to main | open | A single `Utf8` or `VarBinary` vector over 2 GiB (the window operator materialises all input) | Y[I] | Large window inputs only; `maxRows` bounds answers, not inputs | Bound window inputs; avoid windows over unbounded relations |
| H13 | `Math/abs`, `temporal.clj:1890-1892` | S | all 2.x | no | `ABS(-9223372036854775808)` returns the same value | Y[P][S] | None in builders | Do not use `ABS` on BIGINT without a range guard |
| H14 | #6329 | W | all 2.x | open | `SUM(decimal)` over an all-NULL group returns 0 instead of NULL; `SUM(duration)` with a NULL throws | Y[I] (not probed) | Datalog integer `SUM` uses DECIMAL(32,0) (`compiler.ts:1394-1395`) | Count non-NULL inputs beside the sum |
| H15 | #6196 | W | main (not reproduced on 2.2.0) | open | Subquery alias that equals a planner-generated name such as `_needle` | N[P] on the issue's example | None (our aliases do not start with `_`) | Reject aliases starting with `_` |
| H16 | #6242 | W | all 2.x | open | Default "now" comes from a different clock than transaction system time | Y[I] | None: every read uses `FOR ALL VALID_TIME` | Keep `FOR ALL VALID_TIME`; never rely on default valid time |
| H17 | #6209 | E | all 2.x | open | DDL-only, rejected or empty transactions advance system time, blocking a later `SYSTEM_TIME` backfill | Y[I] | None: we never write `SYSTEM_TIME` | Do not introduce explicit system times without this in mind |
| H18 | #6144, #6139, #5844 | W/O | all 2.x with recovery or restore | open | Storage and log from different histories at the same epoch; disk cache serves pre-restore bytes | Y[I] | Only during R13 recovery or restore flows | Wipe disk cache on restore; verify storage and log pairing |
| H19 | #6232, #6039, #5198 | W | all 2.x | open | Await token only advances on writes; prepared-statement describe depends on execution count | Y[I] | Low: `XtdbClient.ts:184` re-applies its own write token only | Pass explicit snapshot tokens across processes |
| H20 | #6358 | W | all 2.x | main 2026-11-05 | `FOR SYSTEM_TIME FROM a TO b` ending before an `ERASE` returns erased rows until compaction | Y[I] | None: we `ERASE` working relations but never query `FOR SYSTEM_TIME` windows | Do not add system-time windows over erased tables |
| H21 | #6257 | W | all 2.x | main 2026-10-22 | `SUBSTRING(SUBSTRING(s FROM 3) FROM 1 FOR 6)` ignores the outer `FOR` length | Y[I] | None (no `SUBSTRING`) | Do not nest `SUBSTRING` |
| H22 | #6046, #5999, #6015, #4469 | E | various | open | Parse or type errors that depend on spelling or join order | Y[I] | Low | None needed beyond error handling |

Fixed before 2.2.0, relevant if we ever roll back to 2.1.x: see section 6.

---

## 4. Details for the top hazards

### H01. `SUM` over BIGINT wraps silently

- **Source.** `LongVector.increment` does `getLong(idx) + v` with no overflow check (`core/src/main/kotlin/xtdb/arrow/LongVector.kt:30-33 @ c6c1962`). Scalar `+`, `*` and unary minus use `Math/addExact` style paths and raise `data exception - overflow error`. `ABS` uses `Math/abs`, which returns `Long.MIN_VALUE` for `Long.MIN_VALUE` (`core/src/main/clojure/xtdb/expression/temporal.clj:1890-1892 @ c6c1962`).
- **Probe** `p3-overflow.out` [P]:

  | Expression | Result on 2.2.0 | Correct |
  |---|---|---|
  | `SUM(v)`, three rows of 2^62 | `-4611686018427387904` | 13835058055282163712 |
  | `SUM(v)`, `Long.MAX` plus 1 | `-9223372036854775808` | 9223372036854775808 |
  | The workload's `SUM(CAST(CASE WHEN value_type='integer' THEN value_string END AS BIGINT))` | `-4611686018427387904` | 13835058055282163712 |
  | `SUM(CAST(.. AS DECIMAL(32,0)))` | `13835058055282163712` | correct |
  | `SUM(CAST(.. AS DOUBLE PRECISION))` | `13835058055282164000` | rounded, no wrap |
  | `9223372036854775807 + 1`, `2^62 * 4`, `v + v`, `-(MIN)` | error `overflow error` | error is correct |
  | `CAST('9223372036854775808' AS BIGINT)` | error `For input string` | error is correct |
  | `ABS(-9223372036854775808)` | `-9223372036854775808` | should error |
  | `DECIMAL(32,0)` beyond 32 digits | error `invalid writeObject` | error is correct |

- **Exposure [T].** `xtdb-workloads.ts:320` (06 `account_balance`), `:330` (07 `inventory_balance`), `:346` (08 `customer_net_revenue`) all use `SUM(${integerChannel(..)})`, and `integerChannel` casts to BIGINT (`:108-111`). The Datalog compiler already avoids this: `compiler.ts:1394-1395` casts integer sums to `DECIMAL(32,0)`; only `min` and `max` cast to BIGINT (`:1392`), which is safe.
- **Guard (static).** Reject any `SUM(` or `AVG(` whose argument text contains `AS BIGINT`; give the helper a second form, `integerSumChannel`, that casts to `DECIMAL(32,0)`, and use it for sums. Cost: none measured (same plan, one cast).
- **Guard (runtime, for hand-written SQL).** Select `COUNT(*)`, `MIN`, `MAX` beside the sum and compute `count * max(|min|, |max|)` client side with `BigInt`. If that bound is at least 2^63, recompute with the `DECIMAL` form or refuse. Cost: three extra aggregates in the same scan.
- **Note.** `#6329` (open) makes `SUM(DECIMAL)` return 0 for an all-NULL group. Our `COALESCE(SUM(..), 0)` pattern hides that difference; do not rely on `NULL` meaning "no rows" in the DECIMAL form.

### H02. Correlated subquery predicate that can be unknown (#6313)

- **Mechanism [I][S].** `pull-apply-mark-join-select->mark-join-cond` (`core/src/main/clojure/xtdb/logical_plan.clj:1007-1024 @ c6c1962`) moves the subquery's `WHERE` predicate into the mark join's three-valued mark. A mark is true when some inner row is true, NULL when none is true but some are unknown, false otherwise. A row the `WHERE` should have filtered out therefore turns the mark NULL, and the later rewrite to an anti-join drops the outer row. Commit `1183fc40c` (resolves #6012, in 2.2.0) is what lets the idiomatic `SELECT 1` spelling reach the rule.
- **Both sides matter.** One NULL on the inner side, or a NULL in the outer correlated column, is enough.
- **Probe** `p2-null.out`, `p5-notexists-guards.out` [P]:

  | Query (x.y = 1, NULL, 3; z.k = 3, NULL) | 2.2.0 returns | Correct |
  |---|---|---|
  | `WHERE NOT EXISTS (SELECT 1 FROM z WHERE z.k = x.y)` | no rows | ids 1, 2 |
  | same with `AND z.k IS NOT NULL` inside | id 1 | ids 1, 2 |
  | projected `EXISTS (SELECT 1 ... )` | NULL, NULL, true | false, false, true |
  | `WHERE id = 99 OR NOT EXISTS (...)` | no rows | ids 1, 2 |
  | `WHERE x.y NOT IN (SELECT z.k FROM z WHERE z.k = x.y)` | no rows | ids 1, 2 |
  | positive `WHERE EXISTS (...)` | id 3 | id 3 (correct) |
  | Triplex-shaped (workload 09/12) over a sparse assertion table where one `subject` fact has a NULL `value_string` | no rows | `u1` |

- **Guards tested [P].** All return the correct rows:
  - `NOT EXISTS (SELECT 1 FROM z WHERE (z.k = x.y) IS TRUE)`, `COALESCE(z.k = x.y, FALSE)`, a `NOT IN (SELECT x2._id FROM x x2 JOIN z ON z.k = x2.y)` over an uncorrelated inner join, and `EXCEPT` of ids.
  - Not safe: correlated `COUNT(*) = 0` and the `LEFT JOIN ... IS NULL` anti-pattern both give the wrong answer, because of H06.
  - The `IS TRUE` form also fixes the projected, `OR` and `NOT IN` variants (probe G7, G8, G9, T1g).
- **Cost [P]** (`p6-guard-cost.out`, 30,000 x 30,000 rows, median of 3): plain `NOT EXISTS` 13.2 s, `IS TRUE` form 13.9 s, `COALESCE` form 14.1 s, `NOT IN` over inner join 3.2 s, `EXCEPT` 0.17 s. The plan changes from an equi-key anti-join to a `true?` theta condition, with no measurable time change at this size. The anti-join itself is slow (upstream #4671, #6353 are the open performance issues), so the `EXCEPT` form is also the fastest.
- **Exposure [T].**

  | Site | Shape | Can the correlated column be NULL? |
  |---|---|---|
  | `xtdb-workloads.ts:356` (09 `paid_without_entitlement`) | `NOT EXISTS (SELECT 1 FROM f subject JOIN f entitled ...)` correlated on `subscription.value_string` | Yes: `value_string` is NULL for any non-string row of that attribute |
  | `xtdb-workloads.ts:419` (12 `access_with_deny`) | two `NOT EXISTS`, correlated on `subject.value_string`, `target.value_string`, `principal.value_string` | Yes, same reason |
  | `xtdb-workloads.ts:430` (13 `container_items`) | `NOT EXISTS (SELECT 1 FROM f child WHERE child.entity_id = c.target ...)` | `c.target` could be NULL if an edge row has no target |
  | `xtdb-workloads.ts:532` (18) | `NOT EXISTS (SELECT 1 FROM points middle WHERE middle.boundary > l.boundary ...)` | No: boundaries are cast non-NULL doubles |
  | `Reachability.ts:196` | recursion round: `NOT EXISTS (SELECT 1 FROM tx_native_relations seen WHERE ... seen.source = c.source AND seen.target = c.target)` | Yes if an authored `edges` query can return a NULL endpoint. A dropped candidate silently under-reaches |
  | `ConstraintValidation.ts:168` | `c.value_type <> 'ref' OR NOT EXISTS (SELECT 1 FROM visible target WHERE ... target.entity_id = c.value_string ...)` | Low (guarded by the ref test), but see H03 |
  | Datalog `not` (`compiler.ts:954`) | `NOT EXISTS (SELECT 1 FROM (...) t1 WHERE t1.entity_id = t0.entity_id AND ... type-tagged value comparisons)` | Unknown only if a typed row has NULL in its own value column; the type-tag guards make this unlikely |

  The pending-overlay (`overlay.ts:23`) uses `id NOT IN (<params>)`; ids are never NULL there.

### H03. Mark join over 100,000 build rows (#6345)

- **Mechanism [I][S].** `*disk-join-threshold-rows*` is 100,000 unless `XTDB_JOIN_SPILL_THRESHOLD` is set (`core/src/main/clojure/xtdb/operator/join.clj:305-307 @ c6c1962`). Past it, `BuildSide` spills and shuffles to disk (`core/src/main/kotlin/xtdb/operator/join/BuildSide.kt:35-38, 55-67 @ c6c1962`), emptying the in-memory relation that `MarkJoinCursor` reads. Every probe row is marked against nothing. A spilled anti-join with a NULL on the build side is also wrong.
- **Probe** `p4-spill-param-alias.out`, build side 100,500 rows [P]:

  | Query | Result | Correct |
  |---|---|---|
  | projected `s.k IN (SELECT v FROM big)` | false, false, false | true, true, false |
  | projected `EXISTS (SELECT 1 FROM big b WHERE b.v = s.k)` | false x 3 | true, true, false |
  | `WHERE s._id = 99999999 OR EXISTS (...)` | only 99999999 | all three |
  | `WHERE EXISTS (...)` (semi-join) | 5, 50 | correct |
  | `WHERE NOT EXISTS (...)` (anti-join, no NULL) | 99999999 | correct |
  | same projected `IN` with a 1,000-row subquery | true, true, false | correct |

- **Exposure [T].** `compiler.ts:984` compiles a Datalog `or` alternative to `(EXISTS (SELECT 1 FROM triples ...))` inside an `OR`; the build side is every assertion of the scope that matches the alternative, which passes 100,000 for any large scope. `ConstraintValidation.ts:168` puts `NOT EXISTS` under `OR`; a false mark makes `NOT EXISTS` true, so valid reference claims are reported as violations (fails closed, rejects legitimate writes). Native SQL that projects `EXISTS` or `IN` is exposed the same way. The wrapper in `NativeQueries.ts:114` does not help: it limits rows after the fact.
- **Guards.**
  1. Set `XTDB_JOIN_SPILL_THRESHOLD` to a large value (for example 50,000,000) in the engine container environment. Cost: memory. A build side of that many rows stays on heap, so this needs the heap sizing already planned in R7.
  2. Rewrite `A OR EXISTS(B)` as `UNION` of two queries where each `EXISTS` is a plain semi-join. Semi-join and anti-join in `WHERE` read the build side correctly [P].
  3. Runtime: count the subquery relation first and refuse above 100,000 (one extra scan).

### H04. Join pushdown beneath `LIMIT`, `ORDER BY LIMIT` or a window (#6151)

- **Mechanism [I][S].** `JoinCursor` adds `:pushdown-blooms` and `:pushdown-iids` to the opts of its probe cursor (`join.clj:410-436 @ c6c1962`); `build-pushdowns` fills them (`join.clj:175-190`); only inner join, the flipped left-outer join and semi-join set `pushdown-blooms?` (`join.clj:451-460, 468-484, 497-505`). `unary-expr` and `binary-expr` hand the opts to the child unchanged and `with-col-mapping` only renames keys (`core/src/main/clojure/xtdb/logical_plan.clj:127-153`). The scan reads `pushdown-iids` for `_iid` or `_id` (`core/src/main/clojure/xtdb/operator/scan.clj:333-336`) and blooms at `scan.clj:182-183, 373-377`. Nothing between the join and the scan withdraws them.
- **Probe** `p1-6151.out`, r14_b has `_id` 1 to 10 with `v = _id`, r14_a has k = 10 [P]:

  | Query | Result | Correct |
  |---|---|---|
  | issue repro: `a JOIN (SELECT _id, v FROM b ORDER BY v LIMIT 1) b1 ON b1._id = a.k` | `_id 10` | empty |
  | same, FROM order reversed | empty | empty (build side changes with row counts, so the bug depends on table sizes) |
  | `ROW_NUMBER() OVER (ORDER BY v)` subquery, `WHERE rn = 1`, joined on `_id` | `_id 5` (k values were 10 and 5) | empty |
  | `MAX(_id) AS _id`, `MIN(_id) AS _id`, `MAX(v)`, `MIN(v)` joined on the aggregate | correct | correct |
  | grouped `COUNT` joined on the count | correct | correct |
  | `ORDER BY .. LIMIT 1 OFFSET 2`, `IN (.. LIMIT 1)`, correlated `EXISTS .. LIMIT 1` | correct | correct |
  | join on a non-`_id` column with `LIMIT` (bloom only, one page) | correct | correct (needs several pages to show) |

  So 2.2.0 is wrong for `LIMIT`/`TOP` and for windows, and I could not make aggregates fail in four shapes (the issue lists them as unverified `check:` items).
- **Exposure [T].** The Triplex wrapper `SELECT * FROM (...) triplex_native_answer LIMIT n` (`NativeQueries.ts:114`) puts the `LIMIT` above everything, so it is not the trigger. The trigger is a join whose probe side holds a limit or window:
  - `TemporalQueries.ts:123-131` builds `spans` with `LEAD(cut) OVER (ORDER BY cut)`, then `FROM spans s CROSS JOIN LATERAL (...)`; `:199-207` builds `marked` with `LAG(...) OVER (PARTITION BY ...)` and a self-join `islands` on `span_from` ranges and `IS NOT DISTINCT FROM`. These joins are not equi-key joins on a column the scan owns, so pushdown probably does not apply, but I did not prove that. Unverified.
  - `MaintainedQueries.ts:189` uses `ROW_NUMBER()` inside an `INSERT .. SELECT` with no join above it.
  - Workload 05 (`xtdb-workloads.ts:310`) joins `r.revision = (SELECT MAX(revision) ...)`, an aggregate beneath a join; it did not reproduce in analogous shapes (probe A6, A10).
- **Guard.** Static: reject `JOIN (SELECT ... LIMIT` and any join against a subquery or CTE that contains `LIMIT`, `OFFSET`, `ROW_NUMBER`, `RANK`, `LAG` or `LEAD`; use a `MATERIALIZED` CTE only after a probe shows it blocks the pushdown (the issue says materialised CTEs are also a risk, so this is not safe by default). Runtime: for `TemporalQueries`, run the span query against a table that has more rows than one page and compare with the same query evaluated through the portable oracle once per release candidate. Not tested.

### H05. `col = ANY(x) AND p` swallows `p` (R10 finding, new)

- **Minimal trigger [P]** (`p7-any-2000.out`, `p8-any-variants.out`, `p9-any-parse.out`; 2,000-row table, live index only, no compaction needed):

  | Predicate (`k` in 4 values = 160 rows; `a = 'contains'` = 400 rows; both = 40) | Count | Correct |
  |---|---|---|
  | `k = ANY($1)` | 160 | 160 |
  | `k = ANY($1) AND a = 'contains'` | **0** | 40 |
  | `a = 'contains' AND k = ANY($1)` | 40 | 40 |
  | `k = ANY(ARRAY['e0','e1','e2','e11']) AND a = 'contains'` | **0** | 40 |
  | `k = ANY($1) AND n > 10`, `AND TRUE`, `AND k IS NOT NULL`, `AND n = n` | **0** | nonzero |
  | `k = ANY($1) OR a = 'x'` | **0** | 160 |
  | `k = SOME($1) AND a = 'contains'` | **0** | 40 |
  | `k <> ALL($1) AND a = 'contains'` | **2000** | 360 |
  | `k = ANY(($1)) AND a = 'contains'` (operand parenthesised) | **0** | 40 |
  | `(k = ANY($1)) AND (a = 'contains')` (whole comparison parenthesised) | 40 | 40 |
  | `k = ANY (SELECT x FROM UNNEST($1) AS u(x)) AND a = 'contains'` | 40 | 40 |
  | `k IN (SELECT x FROM UNNEST($1) AS u(x)) AND a = 'contains'` | 40 | 40 |
  | `k IN ($1, $2) AND a`, 9-item literal `IN` list `AND a` | 40, 80 | correct |
  | `_id = ANY($1::int8[]) AND a` | **0** | nonzero |
  | two-table join with `t.k = ANY($1) AND t2.a = ...` | **0** | nonzero |

- **Cause [S].** The grammar is `quantifiedComparisonPredicatePart3 : subquery | expr` (`core/src/main/antlr/xtdb/antlr/Sql.g4:753-756 @ c6c1962`, used at `:267` and `:750`). The operand after `ANY`, `SOME` or `ALL` is an unparenthesised full `expr`, so it consumes the trailing `AND ...` or `OR ...`: `k = ANY($1) AND a = 'x'` parses as `k = ANY(($1) AND a = 'x')`. The planner then resolves `a` through the operand's subquery scope (`visitQuantifiedComparisonExpr`, `core/src/main/clojure/xtdb/sql.clj:2210-2232`), which is why `EXPLAIN` shows `apply-mark-join {r14_t.1/a ?_sq_a_2, r14_t.1/k ?_sq_2_needle}` for the failing order and a plain `semi-join` with the predicate pushed into the scan for the working order. The same file on `main` (908 lines, fetched 2026-11-07) still has the rule unchanged.
- **Upstream.** I found no issue. Closest: #6203 (open, performance: `= ANY($1)` should be a scalar predicate), #5810 (closed, `ANY(col)` scope fix that introduced the operand scope), #6024 (closed, grammar ambiguity audit; its body never mentions quantified comparisons, so this decision is not among its seven), #6313 (same apply-mark-join family). Worth filing.
- **Exposure [T].** No builder uses `ANY`, `SOME` or `ALL` (grep over `packages/xtdb/src`, `packages/xtdb/test`, `packages/qualification/src`, `packages/core/src/datalog`). Documentation does: `R7-xtdb-indexing-ingest.md:134,144` recommends "prefer one `= ANY($1)` over many point lookups" and `:234` uses `'x' = ANY(eids)`; R10 already switched to `IN (SELECT .. UNNEST)`. R7 timings for `= ANY` alone stay valid (the bare form is correct); the recommendation needs a warning.
- **Guard.** Static, in `readOnlyNativeSql`: reject `\b(ANY|SOME|ALL)\s*\(` unless the next token is `SELECT`; write batch membership as `col IN (SELECT x FROM UNNEST($n) AS u(x))` (correct in every probe, and R10 measured it within the same cost class). If `ANY` is unavoidable, parenthesise the whole comparison. Cost: a regex.

### H06 to H08. NULL-equality family (#6339, #6340, #6341)

- **H06 outer-join NULL keys [P][I].** `->cmp-factory` builds every equi comparator with `{:nil-keys-equal? with-nil-row?}` (`join.clj:321-326 @ c6c1962`; `expression/map.clj:41-42` picks `:null-eq` or `:==`). Left-outer built on the right (`join.clj:468-484`), full-outer (`:486-495`) and single (`:528-537`) pass `:with-nil-row? true`, so `NULL = NULL` joins. A left join that the planner builds on its left input compares correctly, so the answer depends on table sizes. Probe: `l LEFT JOIN r ON l.k = r.k` returned `{l1,r10},{l2,r11}` where `{l1}` has no match; `FULL OUTER JOIN` lost both unmatched rows; the scalar-subquery `single-join` case was correct; inner join was correct. Regression since 2.1.0-beta5.
  Guard tested: `ON l.k = r.k AND l.k IS NOT NULL` for `LEFT JOIN`, and `AND l.k IS NOT NULL AND r.k IS NOT NULL` for `FULL OUTER JOIN`, return the correct rows. `LEFT JOIN ... WHERE z.id IS NULL` is not a safe anti-join substitute.
- **H07 set operations [P][I].** `set.clj:141,161 @ c6c1962` call `join/->cmp-factory` without NULL-safe keys. Probe: `INTERSECT` returned no rows where `{v NULL, w 1}` should match; `EXCEPT` kept the row it should remove. `UNION` and scalar `DISTINCT` were correct. Guard tested: `EXISTS`/`NOT EXISTS` with `IS NOT DISTINCT FROM` on every column, and a `COALESCE(CAST(v AS TEXT), '<null>')` sentinel with `NOT IN`.
- **H08 nested NULLs [P][I].** `null_eq` is NULL-safe only at the top level and delegates to `==` for lists and structs. Probe: `DISTINCT v` over two identical `[8, NULL]` lists returned two rows; `GROUP BY` split them into two groups of 1; struct with a NULL field behaved the same. No Triplex builder groups on array or struct columns.
- **Exposure.** Datalog and native builders use `DISTINCT`, `UNION`, `GROUP BY` and `COUNT(DISTINCT)` over scalars only (all correct for NULL). `LEFT JOIN` appears once (`ConstraintValidation.ts:147`) and keys are never NULL there. No `INTERSECT`/`EXCEPT`. These are therefore authoring hazards for hand-written native SQL, which the lexical envelope does not constrain.

---

## 5. Guards: what to add, in order

All guards target `packages/xtdb/src/native/ReadOnlySql.ts` (the lexical envelope) and the `integerChannel` helpers in `xtdb-workloads.ts:108-111`. I changed none of them.

| # | Guard | Kind | Hazard | Cost | Verified |
|---|---|---|---|---|---|
| G1 | Sums use `CAST(.. AS DECIMAL(32,0))`; reject `SUM(`/`AVG(` containing `AS BIGINT` | static | H01 | none | [P] |
| G2 | Reject `\b(ANY\|SOME\|ALL)\s*\(` unless followed by `SELECT` | static | H05 | regex | [P] |
| G3 | Write correlated `EXISTS`/`NOT EXISTS`/`IN`/`NOT IN` predicates as `(p) IS TRUE`; reachability edge queries add `source IS NOT NULL AND target IS NOT NULL` | rewrite | H02 | none measured | [P] |
| G4 | Reject `INTERSECT`/`EXCEPT`; use `EXISTS` with `IS NOT DISTINCT FROM` | static | H07 | one regex; the rewrite is a theta semi-join | [P] |
| G5 | Reject `LEFT`/`RIGHT`/`FULL` joins unless each key has `IS NOT NULL` in the ON clause | static | H06 | regex | [P] (rewrite only) |
| G6 | Set `XTDB_JOIN_SPILL_THRESHOLD` high on the engine container, or rewrite `OR EXISTS` as `UNION`, or count the build relation first | config / rewrite / runtime | H03 | memory, or an extra scan | threshold semantics [S], not tested at a higher value |
| G7 | Reject `JOIN (SELECT .. LIMIT`, and joins against a subquery or CTE containing `LIMIT`, `OFFSET`, `ROW_NUMBER`, `RANK`, `LAG`, `LEAD` | static | H04 | regex; false positives possible | shapes [P] |
| G8 | Reject subquery aliases that start with `_` (`\bAS\s+"?_`) | static | H15 | regex | not needed on 2.2.0 |
| G9 | Spell `NULLS FIRST`/`NULLS LAST` on every `ORDER BY` | rewrite | #6172 | none | [P] default is correct on 2.2.0; 2.1.x differs |
| G10 | Bind `recordedPosition`, `recordedAt`, `validAt` as parameters in the Datalog compiler instead of inline numbers; or cap metaspace and alert on loaded classes | code / config | H11 | none | [I] |
| G11 | Run `SUM` bound check (`count * max(|min|,|max|) < 2^63`) for hand-written integer aggregates | runtime | H01 | three extra aggregates | designed, not run |
| G12 | After any restore or out-of-sync-log recovery, delete the disk cache and check storage and log pairing | ops | H18 | restart time | [I] |

A differential gate is the strongest net for the whole list: run each qualification query on 2.2.0 and on the independent oracle (the existing qualification design already does this) and add NULL-bearing rows to the fixtures. Today's workloads would not catch H02, H06 or H07 because no fixture puts a NULL in a correlated or join column.

---

## 6. Hazards fixed before 2.2.0 (matters for rollback to 2.1.x)

2.1.1 is 2.1.0 plus the ability to read 2.2 transactions; it carries none of the fixes below.

| Issue | What was wrong | Closed | In 2.2.0 |
|---|---|---|---|
| #6172 | `ORDER BY x DESC` put NULLs on the wrong side, including top-N and paginated queries | 2026-10-14 | yes [R][P]: `DESC` gives NULLs first, `ASC` last, `DESC NULLS LAST LIMIT 2` correct |
| #5987 | `_id = <cast expression>` returned zero rows silently | 2026-09-01 | yes [R]. R7's "CAST pitfall" is now only a pruning loss |
| #5109 | more than eight `MATERIALIZED` CTEs ran in the wrong order | 2025-12-18 | yes [R] |
| #5168 | `POSITION` over `SUBSTRING` ignored the substring | 2026-01-20 | yes [R] |
| #5957 | ordered-set aggregates (`PERCENTILE_*`) dropped trailing groups | 2026-08-26 | yes [R] |
| #6231 | concurrent Arrow result streams corrupted each other | 2026-10-20 | yes [R] (Flight SQL and ADBC only) |
| #5669 | `LEFT JOIN` to a table that was never created dropped left rows after a block flush | 2026-06-03 | yes [R] |
| #4897 | `8 = ALL (SELECT ..)` returned TRUE where Postgres returns FALSE | 2025-11-12 | yes (closed before the 2.1.0 release) |
| #5948, #5954 | empty-list columns not comparable; zero-leg types answering false | 2026-08/09 | yes |
| #6086 | two transactions could share one system time | 2026-09-18 | yes |
| #5854 | a query could read more than one snapshot | 2026-09-16 | yes |
| #4255, #4353 | L0 files dropped under pushdown blooms; TPC-H Q9 differed after a block flush | 2025-04 | yes (pre-2.0) |
| #4650, #4649, #4448 | DML without `FOR PORTION OF` and PATCH valid-time gaps | 2025-07 to 2025-09 | yes. We use none of PATCH, UPDATE or DELETE |
| #4803 | UPDATE ignored with more than 8 arguments | 2025-09-23 | yes. Same "nine items" family as #5109 and #6203 |
| 2.2.0 breaking changes | operators now bind in Postgres precedence (`a = b IS TRUE`, `a = b LIKE c`); a transaction's snapshot and `current_timestamp` are fixed at its first query; unknown tables and columns now error | 2.2.0 | yes [R]. Queries written for 2.1 can change meaning |

Also noted and not relevant to us: Postgres external source type bugs (#6033 to #6038), Kafka and replica-log fixes, S3 pool exhaustion.

---

## 7. What I did not find

- No fixed, open or closed upstream issue for FOR VALID_TIME / FOR SYSTEM_TIME `AS OF` returning wrong rows in 2.2.0 other than #6242 (clock mismatch), #6358 (erase leak), #5572 (DML reads the clamped `_valid_from`), and #6209 (system-time ordering). None of our builders reaches them (section 3).
- No wrong-answer report for string collation or `LIKE`. `COLLATE` is still unimplemented (#4020, open); `ILIKE` is available. Our compiler rewrites `LIKE .. COLLATE NOCASE` to `ILIKE` (`query/compiler.ts:81-82`).
- No report that `OFFSET` or `LIMIT` alone return the wrong rows. They go wrong only through H04.
- Timestamp and time-zone hazards in the issue list (#4469 `UTC` and `Z` are distinct zones, #6008 mixed units fork a column into a union, #6015 `MIN`/`MAX` refused over a union timestamp column) raise errors or fork types, and our `valid_from`, `recorded_at` columns are DOUBLE, so I rate them low.

---

## 8. Open questions

1. Does `TemporalQueries` pass through H04 at scale? Needs a probe with a table over one page and the real `spans`/`marked` CTE text.
2. Does `XTDB_JOIN_SPILL_THRESHOLD` raise the spill threshold at runtime as the source reads (`join.clj:305-307`)? Source says yes; not run.
3. How common is a NULL in the correlated column of workloads 09, 12 and 13 on real Triplex data? The type-per-attribute discipline suggests rare; fixtures never test it.
4. Does the unreleased fix PR #6337 change the plan shape for the `IS TRUE` form? Re-run G1 to G9 on the next engine upgrade.
5. Upstream filing for H05 has not been made.

---

## 9. Artifacts

All in `/Users/sam/Claude/Projects/triplex-db-2/R14-xtdb-hazards/`:

| File | Purpose |
|---|---|
| `p1-6151.mjs/.out` | H04 pushdown shapes |
| `p2-null.mjs/.out` | H02, H06, H07, H08 reproductions |
| `p3-overflow.mjs/.out` | H01 overflow matrix |
| `p4-spill-param-alias.mjs/.out` | H03 spill, H09 untyped parameters, H15 alias collision |
| `p5-notexists-guards.mjs/.out` | H02 guard candidates |
| `p6-guard-cost.mjs/.out` | guard cost at 30,000 x 30,000 rows |
| `p7-any.mjs`, `p7-any-2000.out`, `p8-any-variants.*`, `p9-any-parse.*`, `p10-misc.*` | H05 isolation, ORDER BY null placement, `ANY (SELECT ..)` form |
| `p11-guards-null.mjs/.out` | H06 and H07 guard candidates |
| `lib.mjs`, `probe-lib.mjs`, `cleanup.mjs` | connection, `r14_`-only `ERASE`, verification |
| `entry.ts`, `build.mjs`, `dump-sql.mjs` | bundle of the repo's `compileXtdb` and a dump of its generated SQL |
| `search/`, `issues/`, `milestone/`, `releases.json`, `releases-2x.txt` | raw upstream data (GitHub API JSON) |
| `Sql.main.g4` | `Sql.g4` from `main`, fetched 2026-11-07, for the H05 comparison |

Environment: `dev` XTDB 2.2.0 (`SELECT version()` returned `PostgreSQL 16 (XTDB 2.2.0)`), port 5470. I did not touch `/Users/sam/projects/triplex-db`, ports 15442 or 17019, or any non-`r14_` table. No repo source was modified.
