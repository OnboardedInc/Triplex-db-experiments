# R12: XTQL cookbook for the xtdb-native lane (XTDB 2.2.0)

Date: 2026-11-07. Scope: the XTQL path of the `xtdb-native` lane (`makeXtdbNativeQueries(...).select`), one XTQL formulation for each of the 23 operations in `packages/qualification/src/native/xtdb-workloads.ts`, checked against the shipped SQL builders on a live XTDB 2.2.0 node.

Paths are relative to `/Users/sam/projects/triplex-db-2` unless absolute. XTDB citations are `path:line @ c6c1962` under `references/xtdb` (tag v2.2.0, sha c6c19623d90c658c15400fb46dc056f3735ed57b). Probe scripts and raw outputs are in `/Users/sam/Claude/Projects/triplex-db-2/R12-xtql-cookbook/` (section 9). No repo source was modified.

---

## 0. Skim layer

**Coverage.**

- 23 of 23 operations have an XTQL formulation that returns the same rows as the shipped SQL builder.
- 71 of 71 logical tasks pass with XTQL for every answer statement, in two modes: current (fresh load) and reopened (a fresh connection pool over the same data). That is 142 of 142 executions. Every row set equals both the packet's `expected_rows` and the row set the shipped SQL library returns for the same case.
- R6 counted 11 XTQL-only tasks, 3 hybrid and 57 SQL-only, with 20 of 23 operations lacking XTQL. Now all 71 tasks are XTQL-only and 0 operations lack XTQL.
- 38 extra shape controls on hand-built fixtures (workloads 05, 08, 09, 12, 17, 18, and a 6-hop cyclic graph for 20) show the SQL and XTQL builders agree where the packet fixtures do not reach.
- The shipped SQL library scores 71 of 71 on the same fixtures, which validates the fixture loader (section 1).

**What changes the plan.**

1. No operation is inexpressible in XTQL 2.2.0. The 20 missing operations need only `unify`/`join`, `aggregate`, `exists?`, `cast`, `unnest`, `limit`, `q` and ordinary expressions.
2. Reachability is the one partial result. The six operations that use `selectSqlWithReachability` today (`inherited_access`, `container_items`, `recalled_customers`, `dependency_closure`, `vulnerable_deployments`, `reachability_closure`; workloads 11, 13, 14, 15 and 20's closure; 14 tasks) have no recursion in XTQL. The cookbook unrolls the walk to depth D and certifies the depth with a second XTQL call. It is read-only and uses no scratch state. A task makes 2 to 5 calls, so the position pin in 7.1 is what keeps them on one cut. The statement grows with D squared (D=8: 56 KB, 191 parameters, 0.6 to 1.7 s on a 21-row fixture).
3. XTQL can be safer than the shipped SQL on int64 sums. `SUM` over BIGINT wraps silently in both languages (three values of 2^62 sum to -4611686018427387904). The cookbook sums 32-bit halves and recombines with overflow-checked `+` and `*`. In 7 boundary cases through the real builders, SQL returned a wrapped value in 3 and XTQL raised `data exception - overflow error` in those same 3 and matched SQL in the other 4.
4. A task-wide fixed cut works for XTQL today through `NativeReadOptions.basis.recordedPosition`. Pinning the position gave 71 of 71, and a writer that committed between two calls was invisible to the pinned call. Engine snapshot tokens also work, but `NativeQueries.run` never passes them.
5. R6's open XTQL questions have answers (section 6.3). XTQL `with` does override a bound column, so the retirement-metadata mask works in XTQL. `INSERT ... SELECT` from an XTQL subquery plans. Text-to-BIGINT `cast` works from XTQL when the type is written `#xt/type :i64`.

**Hard gaps (engine-repair candidates).**

- `union-all` parses and cannot be planned. The logical operator exists, so the repair is small (section 6, G1).
- No recursion, so reachability can only be bounded in pure XTQL (G2).
- `sum` over BIGINT wraps (G3).
- Smaller ones with workarounds: the documented `(cast x :i64)` fails, literals and parameters in a `join` bind spec fail, and `(aggregate {:k constant})` fails (G4 to G6).

---

## 1. Method and environment

**Engine.** One container, `tx2-probe-r12`, image `ghcr.io/xtdb/xtdb:2.2.0` (`sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`), `--memory 1536m --cpus 1`, `JDK_JAVA_OPTIONS="-Xmx900m -XX:MaxDirectMemorySize=400m"`, port 127.0.0.1:5464, started through the explicit colima docker socket. No `dev` XTDB existed (`node lab/bin/engine.mjs status` listed every slot as stopped), and the pool held 10 GiB (probes r7 and r8), so the container waited until the running caps summed to 9.5 GiB or less (`start-probe.sh`, log in `raw/start-probe.log`). Peak observed memory 747 MiB of 1.5 GiB, no OOM kill, no restarts (`raw/container-stats.txt`). The container is removed at the end of the run. All tables carry the prefix `r12_`.

**Harness.** The probe runs the repo's own modules unchanged, bundled with the repo's esbuild (`build.mjs`): `makeXtdbClient`, `makeXtdbNativeQueries`, `makeNativeContext` (so `ctx.facts()` is the real `Sources.ts` XTQL branch), `xtqlStatement`, and the SQL task library `evaluateXtdbNativeWorkload`.

- **Fixture.** `fixture.mjs` rebuilds `tx_assertions` rows for each of the 20 packet workloads by porting the runner's own projection (`runner.ts:208-335`, `755-815`, using `qualification/workloads/engine_cases.mjs` `nativeWrite`). The columns are exactly `assertionColumns` (`packages/xtdb/src/codecs.ts:9-30`) plus `_id`, `scope_key` and `value_identity`. Knowledge group L gets `recorded_at = 1000 + L` and one `recorded_position` per group; facts removed by a later group get `retracted_at/position` filled. Values are written with the production client's parameter typing (`XtdbClient.ts:147-165`).
- **Fixture validation.** The unmodified SQL library scored 71 of 71 against the packet's `expected_rows` on these rows, including the 14 reachability tasks that write scratch tables (`raw/baseline-sql.log`). Rows differ from a real Triplex transact only in `id` spelling, `tx_id`, `created_by` and `value_identity`, which no builder reads.
- **XTQL evaluator.** `xtql-workloads.ts` copies the control flow, parameter names, result column names and host normalisation of the SQL library and replaces each SQL builder with an XTQL builder, called through `native.select`. `reach-xtql.ts` adds the reachability driver.
- **Pass rule.** For each case, canonical row sets (the runner's `canonicalRows`: typed cells, de-duplicated, sorted) of XTQL, SQL and `expected_rows` must be equal. Row order is never compared because XTQL order is undefined without `order-by`.
- **Discrimination.** Section 8 reports mutants and the extra controls.

**Language tally.** Every one of the 71 XTQL task runs has `trace.language = "xtql"` on every answer statement. Each native call also issues a SQL `SELECT position FROM tx_meta` first (phase `source-cut`, `NativeQueries.ts:68-73`), for XTQL and SQL calls alike. If the gate counts that step as a SQL substep, no task can count as XTQL-only, so the counting rule needs a decision (EXP-000 brief says "every read substep"; the `source-cut` step is a basis read, not an answer read).

---

## 2. The 23 operations

Task counts are logical tasks in `qualification/workloads/temporal-workloads.json` (71 in total, each run in current and reopened mode). "Identical" means XTQL rows equal SQL rows equal expected rows for every case, in both modes.

| Operation | Tasks | XTQL operators needed | Identical to SQL | Notes |
| --- | --- | --- | --- | --- |
| `state_at` | 14 (wl 01:4, 02:3, 03:2, 05:3, 19:2) | `from`, `where`, `with`, `without`, `return`, `coalesce` (via `ctx.facts()`); wl 05 adds `unify`, `join`, `q`, `aggregate` (`max`), `cast` | yes, 14/14 | 11 tasks were already XTQL (shipped builder `xtdb-workloads.ts:235`, unchanged). The 3 workload-05 tasks need a different shape (highest revision wins). |
| `price_at_purchase` | 1 (wl 03) | `unify`, `join`, `with`, `cast`, `aggregate` (distinct), `return` | yes, 1/1 | Driver query is XTQL now; the per-purchase point read was already XTQL. 3 calls for 2 purchases. |
| `coverage_at_claim` | 3 (wl 04) | `unify`, `join`, `with`, `cast`, `aggregate` (distinct), `limit`, `return` | yes, 3/3 | Two calls (claim coordinate, then existence at the derived valid time). |
| `relation_exists` | 1 (wl 04) | `where`, `limit`, `return` | yes, 1/1 | Same existence query as `coverage_at_claim`'s second call. |
| `accepted_event_count` | 1 (wl 05) | `where`, `aggregate` (`count-distinct`) | yes, 1/1 | Aggregate with no grouping returns one row on empty input (count 0), like SQL. |
| `account_balance` | 4 (wl 06) | `unify`, `join`, `with`, `cast`, `/`, `*`, `+`, `-`, `aggregate` (`sum`), `coalesce`, `return` | yes, 4/4 | Overflow-safe sum (section 7.3). Empty sum returns "0" like the SQL `COALESCE`. |
| `inventory_balance` | 3 (wl 07) | as `account_balance` plus a grouping variable in `aggregate` | yes, 3/3 | Host subtraction of the two ledger totals is unchanged. |
| `customer_net_revenue` | 3 (wl 08) | `unify`, `join` of two aggregate sub-pipelines, `with`, `cast`, `sum`, `coalesce`, checked arithmetic | yes, 3/3 | Two single-row aggregates are cross-joined (no shared variable), then subtracted. Fan-out control passes (section 8). |
| `paid_without_entitlement` | 3 (wl 09) | `unify`, `join`, `where`, `not`, `exists?` with an argument list, `aggregate` (distinct) | yes, 3/3 | SQL `NOT EXISTS` becomes `(not (exists? [(fn [s] ...) sv]))`. |
| `workflow_status` | 4 (wl 10) | `unify`, `join`, `with`, `cast`, `aggregate` (distinct, `min`, `max`), `return` | yes, 4/4 | 2 to 3 calls; the host classification step is unchanged. |
| `inherited_access` | 3 (wl 11) | `unify`, `join`, `where`, `or`, `exists?` (unrolled walk), `limit`, `aggregate` | yes, 3/3 (depth-bounded) | Two closures (member, resource). Section 5. |
| `access_with_deny` | 4 (wl 12) | `unify`, `join`, `where`, `not`, `exists?` x2 with two arguments each, `aggregate` | yes, 4/4 | Revoke and block clauses are covered only by the extra controls (section 8). |
| `container_items` | 4 (wl 13) | as `inherited_access` plus `not exists?` for the leaf test | yes, 4/4 (depth-bounded) | Section 5. |
| `recalled_customers` | 3 (wl 14) | `unify`, `join`, `where`, `or`, `exists?`, `aggregate` | yes, 3/3 (depth-bounded) | Section 5. |
| `vulnerable_deployments` | 2 (wl 15) | as `inherited_access`; closure source is a variable | yes, 2/2 (depth-bounded) | Completeness check runs per environment (section 5). |
| `dependency_closure` | 1 (wl 15) | as `inherited_access` | yes, 1/1 (depth-bounded) | Section 5. |
| `output_lineage` | 3 (wl 16) | `unify`, `join`, `aggregate` (distinct), `return` | yes, 3/3 | Three calls (`input_a`, `input_b`, metadata), as in SQL. |
| `conversion_funnel` | 2 (wl 17) | `unify`, `join` x9, `with`, `cast`, `where`, `aggregate` (distinct) | yes, 2/2 | Statement is 13.9 KB with 54 parameters. |
| `session_conversion` | 1 (wl 17) | same query plus a session predicate | yes, 1/1 | Equal-timestamp control passes at both step pairs. |
| `uptime_duration` | 5 (wl 18) | `unify`, `join`, `with`, `cast` (`:f64`), `greatest`, `least`, `coalesce`, `nil?`, `or`, `unnest` of a list literal, `not`, `exists?` x2, `aggregate` (distinct, `sum`) | yes, 5/5 | No window operator. `unnest` of `[lo hi]` replaces SQL `UNION`. Fractional endpoints pass (section 8). |
| `training_example` | 2 (wl 19) | `unify`, `join`, `with`, `cast`, `aggregate` (distinct), `return` (`(= fraud 1)`), then `state_at` | yes, 2/2 | Driver query is XTQL now; the per-prediction read was already XTQL. |
| `reachability_supports` | 3 (wl 20) | `unify`, `join` (1 to 3 edge views), `return`, `aggregate` (distinct, `row-count`) | yes, 3/3 | Three calls (path length 1 to 3), host sum unchanged. |
| `reachability_closure` | 1 (wl 20) | as `inherited_access` | yes, 1/1 (depth-bounded) | Section 5. |

Operators every query also uses through `ctx.facts()`: `from` with `:for-valid-time :all-time` and a full `:bind`, `where`, `with`, `without` (`Sources.ts:97`). The ones the library never used before are `unify`, `join`, `aggregate`, `exists?`, `q`, `limit`, `unnest`, `cast`, `count-distinct`, `row-count`, `greatest`, `least`.

---

## 3. Conventions every recipe uses

### 3.1 Statement shape

`NativeQueries.run` wraps the builder text as `SELECT * FROM (XTQL ('(fn [triplex_param_1 ...] <body>)', $1, ...)) triplex_native_answer LIMIT n` (`Sources.ts:120-126`, `NativeQueries.ts:114`). The XTQL string is read as EDN with the engine's data readers (`sql.clj:2872-2890`), which is why `#xt/type :i64` works inside it (`api/src/main/resources/data_readers.clj:23`). Builders bind every value through `ctx.bind(...)` and every attribute through `ctx.attribute(...)`, so no value is ever spliced into the text.

### 3.2 The basis relation as a join view

`FACTS` below stands for `ctx.facts()`, the pipeline `(-> (from :tx_assertions {:for-valid-time :all-time :bind [scope_key id entity_id ... tx_id]}) (where <scope, position, recorded_at, retraction, valid-time predicates>) (with {:retracted_at ... :retracted_position ... :retract_tx_id ...}) (without :scope_key))` from `Sources.ts:83-97`. Each `FACTS` use adds 4 parameters (scope, position, recorded_at, valid time; 3 when the cut has no recorded_at), which is why `conversion_funnel`, with nine views, carries 54 parameters.

The unit of every recipe is one attribute-filtered view joined into a `unify`:

```clojure
(join (-> FACTS (where (= attribute @field) <extra predicates>) <with ...>) [{:entity_id e} {:value_string v}])
```

- `@field` is `ctx.attribute(a("field"))`. `$name` is `ctx.bind(input.name)`.
- Two views unify when their bind specs reuse a variable name (`e` above), which is the XTQL form of `a.entity_id = b.entity_id`.
- Predicates that mention a parameter or a constant go in the view's `where`, never in the bind spec (G5).

### 3.3 Idioms

| Need | XTQL form | Why |
| --- | --- | --- |
| int64 from the text carrier | `(cast (if (= value_type "integer") value_string nil) #xt/type :i64)` | Same guard as `integerChannel()` (`xtdb-workloads.ts:108-111`). An unguarded cast of a non-integer row raises `For input string: "..."` (G7). |
| `SELECT DISTINCT` | `(aggregate col1 col2)` with no aggregate function | Grouping with no aggregates returns the distinct rows (probe `xtql-aggregate-grouping-only`). |
| Aggregate over zero rows | `(aggregate {:s (sum n) :c (count n) :r (row-count)})` | Returns one row `{s: null, c: 0, r: 0}` like SQL without `GROUP BY` (probe `xtql-aggregate-empty`). |
| `NOT EXISTS` / `EXISTS` correlated on outer variables | `(not (exists? [(fn [p q] <query>) outer1 outer2]))` | Outer variables are not visible inside a subquery. Only the arguments and the top-level `triplex_param_n` names are (`xtql.clj:286-309`, docs `reference/main/xtql/queries.md` "Subqueries"; probe `xtql-outer-param-in-nested-subquery`). |
| scalar subquery | `(= rev (q (-> ... (aggregate {:m (max rev)}))))` | One column, one row. |
| boolean answer as a row | `(return {:allowed true}) (aggregate allowed)` | `(aggregate {:allowed true})` fails (G6). |
| text of an int64 | `(cast x #xt/type :utf8)` | `codegen-cast [:num :utf8]` (`expression.clj:292`). |
| exact int64 sum | split into 32-bit halves, see 7.3 | G3. |

---

## 4. Recipes, one per operation

Each recipe gives the XTQL text with `FACTS`, `@attribute` and `$parameter` shorthand (rendered from the real builders by `render.mjs`; the exact statements are in `raw/xtql-run-full.json`), the SQL builder it replaces, and the probe evidence. Evidence columns are: cases identical, XTQL calls per case, longest statement in characters, most parameters in a statement, slowest call in ms (single node, not a benchmark).

### 4.1 `state_at`

**Tasks.** 14 tasks. **Replaces** `xtdb-workloads.ts:225-237` (XTQL, unchanged) and, for workload 05, `293-313` (SQL).

Point read (workloads 01, 02, 03, 19), as shipped:

```clojure
(-> FACTS
  (where (= entity_id $entity) (= attribute $attribute))
  (return {:type value_type :text (coalesce value_string value_json) :numeric (coalesce value_number value_datetime) :flag value_boolean}))
```

Workload 05 is not a point read. The authoritative row is the one with the highest `revision`, and ties return every status at that revision. The SQL used a `revisions` CTE and `r.revision = (SELECT MAX(revision) FROM revisions)`. The XTQL form repeats the two views inside a scalar subquery:

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @webhook_object) (= value_string $object))) [{:entity_id ev}])
    (join
      (-> FACTS
        (where (= attribute @revision))
        (with {:rev (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id ev} {:rev rev}])
    (join
      (-> FACTS
        (where (= attribute @status))) [{:entity_id ev} {:value_string status}])
    (where (= rev (q (->
      (unify
        (join
          (-> FACTS
            (where (= attribute @webhook_object) (= value_string $object))) [{:entity_id ev}])
        (join
          (-> FACTS
            (where (= attribute @revision))
            (with {:rev (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id ev} {:rev rev}]))
      (aggregate {:m (max rev)}))))))
  (aggregate status))
```

**Evidence (`state_at`).** 14 of 14 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 7469 chars with 27 parameters. Slowest call 89 ms. First case `01/paid-after-shipment-known` returned `[{"tag":"str","value":"paid"}]`. Tie control (two events at the same top revision) returns both statuses in SQL and XTQL; an unknown object returns no row.

### 4.2 `price_at_purchase`

**Tasks.** 1 task. **Replaces** `xtdb-workloads.ts:243-264`.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @product) (= value_string $product))) [{:entity_id purchase}])
    (join
      (-> FACTS
        (where (= attribute @purchased_at))
        (with {:t (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id purchase} {:t t}]))
  (aggregate purchase t)
  (return {:purchase purchase :at t}))
```

Followed by the unchanged `state_at` point read at each purchase's valid time (host loop, as in SQL).

**Evidence (`price_at_purchase`).** 1 of 1 cases identical in current and reopened mode. XTQL calls per case: 3. Longest statement 3062 chars with 11 parameters. Slowest call 86 ms. First case `03/two-purchases` returned `[{"tag":"str","value":"buy49"},{"tag":"i64","value":"100"}]`.

### 4.3 `coverage_at_claim` and `relation_exists`

**Tasks.** 3 and 1 tasks. **Replaces** `xtdb-workloads.ts:266-292`.

Claim coordinate (`coverage_at_claim` only):

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @coverage_customer) (= entity_id $claim))) [{:entity_id e} {:value_string coverage}])
    (join
      (-> FACTS
        (where (= attribute @claim_at))
        (with {:t (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e} {:t t}]))
  (aggregate coverage t)
  (return {:coverage coverage :at t}))
```

Existence at the derived valid time (both operations):

```clojure
(-> FACTS
  (where (= entity_id $coverage) (= attribute @covers/$policy) (= value_boolean 1))
  (limit 1)
  (return {:covered true}))
```

**Evidence (`coverage_at_claim`).** 3 of 3 cases identical in current and reopened mode. XTQL calls per case: 2. Longest statement 3070 chars with 11 parameters. Slowest call 11 ms. First case `04/claim29-original` returned `[{"tag":"bool","value":true}]`.

**Evidence (`relation_exists`).** 1 of 1 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 1528 chars with 6 parameters. Slowest call 8 ms. First case `04/corrected-end` returned `[{"tag":"bool","value":false}]`.

### 4.4 `accepted_event_count`

**Tasks.** 1 task. **Replaces** `xtdb-workloads.ts:296-303`.

```clojure
(-> FACTS
  (where (= attribute @webhook_object) (= value_string $object))
  (aggregate {:count (count-distinct entity_id)}))
```

**Evidence (`accepted_event_count`).** 1 of 1 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 1524 chars with 6 parameters. Slowest call 25 ms. First case `05/duplicate-counts-once` returned `[{"tag":"i64","value":"3"}]`. Control: 4 events for object o1, 0 for an unknown object, SQL and XTQL equal.

### 4.5 `account_balance`

**Tasks.** 4 tasks. **Replaces** `xtdb-workloads.ts:315-322`.

The sum is split into halves so it cannot wrap (7.3). The result is the exact decimal text, like the SQL `CAST(... AS TEXT)`.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @account) (= value_string $account))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @currency) (= value_string $currency))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @amount))
        (with {:n (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})
        (with {:hi (/ n 4294967296)})
        (with {:lo (- n (* hi 4294967296))})) [{:entity_id e} {:hi hi} {:lo lo}]))
  (aggregate {:shi (sum hi) :slo (sum lo)})
  (return {:total (cast (+ (* (coalesce shi 0) 4294967296) (coalesce slo 0)) #xt/type :utf8)}))
```

**Evidence (`account_balance`).** 4 of 4 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 4668 chars with 17 parameters. Slowest call 11 ms. First case `06/balance800` returned `[{"tag":"i64","value":"800"}]`.

### 4.6 `inventory_balance`

**Tasks.** 3 tasks. **Replaces** `xtdb-workloads.ts:325-339`.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @sku) (= value_string $sku))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @ledger))) [{:entity_id e} {:value_string ledger}])
    (join
      (-> FACTS
        (where (= attribute @delta))
        (with {:n (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})
        (with {:hi (/ n 4294967296)})
        (with {:lo (- n (* hi 4294967296))})) [{:entity_id e} {:hi hi} {:lo lo}]))
  (aggregate ledger {:shi (sum hi) :slo (sum lo)})
  (return {:ledger ledger :total (cast (+ (* (coalesce shi 0) 4294967296) (coalesce slo 0)) #xt/type :utf8)}))
```

**Evidence (`inventory_balance`).** 3 of 3 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 4653 chars with 16 parameters. Slowest call 18 ms. First case `07/available7` returned `[{"tag":"i64","value":"10"},{"tag":"i64","value":"3"},{"tag":"i64","value":"7"}]`.

### 4.7 `customer_net_revenue`

**Tasks.** 3 tasks. **Replaces** `xtdb-workloads.ts:341-349`.

Captures and refunds are two aggregate sub-pipelines. Each returns exactly one row, so joining them with no shared variable is a cross join of two single rows. The refund side keeps the SQL join through the capture's own amount facts, so the fan-out is identical (control: a capture with two amount facts, two refunds on one capture, and a refund in another currency).

```clojure
(->
  (unify
    (join
      (->
        (unify
          (join
            (-> FACTS
              (where (= attribute @customer) (= value_string $customer))) [{:entity_id capture}])
          (join
            (-> FACTS
              (where (= attribute @currency) (= value_string $currency))) [{:entity_id capture}])
          (join
            (-> FACTS
              (where (= attribute @amount))
              (with {:n (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})
              (with {:hi (/ n 4294967296)})
              (with {:lo (- n (* hi 4294967296))})) [{:entity_id capture} {:hi hi} {:lo lo}]))
        (aggregate {:chi (sum hi) :clo (sum lo)})) [chi clo])
    (join
      (->
        (unify
          (join
            (-> FACTS
              (where (= attribute @customer) (= value_string $customer))) [{:entity_id capture}])
          (join
            (-> FACTS
              (where (= attribute @currency) (= value_string $currency))) [{:entity_id capture}])
          (join
            (-> FACTS
              (where (= attribute @amount))) [{:entity_id capture}])
          (join
            (-> FACTS
              (where (= attribute @capture))) [{:entity_id refund} {:value_string capture}])
          (join
            (-> FACTS
              (where (= attribute @currency) (= value_string $currency))) [{:entity_id refund}])
          (join
            (-> FACTS
              (where (= attribute @amount))
              (with {:n (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})
              (with {:hi (/ n 4294967296)})
              (with {:lo (- n (* hi 4294967296))})) [{:entity_id refund} {:hi rh} {:lo rl}]))
        (aggregate {:rhi (sum rh) :rlo (sum rl)})) [rhi rlo]))
  (return {:total (cast (- (+ (* (coalesce chi 0) 4294967296) (coalesce clo 0)) (+ (* (coalesce rhi 0) 4294967296) (coalesce rlo 0))) #xt/type :utf8)}))
```

**Evidence (`customer_net_revenue`).** 3 of 3 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 13671 chars with 50 parameters. Slowest call 126 ms. First case `08/net700` returned `[{"tag":"i64","value":"700"}]`.

### 4.8 `paid_without_entitlement`

**Tasks.** 3 tasks. **Replaces** `xtdb-workloads.ts:351-359`.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @paid) (= value_boolean 1))) [{:entity_id p}])
    (join
      (-> FACTS
        (where (= attribute @subscription))) [{:entity_id p} {:value_string sv}])
    (where (not (exists? [(fn [s]
      (unify
        (join
          (-> FACTS
            (where (= attribute @subject) (= value_string s))) [{:entity_id x}])
        (join
          (-> FACTS
            (where (= attribute @entitled) (= value_boolean 1))) [{:entity_id x}]))) sv]))))
  (aggregate sv)
  (return {:subscription sv}))
```

**Evidence (`paid_without_entitlement`).** 3 of 3 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 5824 chars with 20 parameters. Slowest call 47 ms. First case `09/unprovisioned` returned `[{"tag":"str","value":"S"}]`. Control: `entitled=false` row and duplicate payments return s2 and s4 only.

### 4.9 `workflow_status`

**Tasks.** 4 tasks. **Replaces** `xtdb-workloads.ts:361-398`.

Three queries, used as in SQL (start, then first completion, then source watermark). Minimum and maximum return text so the host reads an exact int64.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @subject) (= value_string $workflow))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @deadline))
        (with {:d (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e} {:d d}])
    (join
      (-> FACTS
        (where (= attribute @source))) [{:entity_id e} {:value_string feed}]))
  (aggregate d feed)
  (return {:deadline d :feed feed}))
```

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @subject) (= value_string $workflow))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @source) (= value_string $feed))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @completed_at))
        (with {:t (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e} {:t t}]))
  (aggregate {:m (min t)})
  (return {:first (cast m #xt/type :utf8)}))
```

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @subject) (= value_string $feed))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @through))
        (with {:t (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e} {:t t}]))
  (aggregate {:m (max t)})
  (return {:through (cast m #xt/type :utf8)}))
```

**Evidence (`workflow_status`).** 4 of 4 cases identical in current and reopened mode. XTQL calls per case: 2 to 3. Longest statement 4522 chars with 17 parameters. Slowest call 10 ms. First case `10/incomplete-source` returned `[{"tag":"str","value":"pending_knowledge"}]`.

### 4.10 `access_with_deny`

**Tasks.** 4 tasks. **Replaces** `xtdb-workloads.ts:414-422`.

Two correlated `not exists?`, each with two arguments. `kind = 'support'` rows are allowed unless a `block` matches the same (subject, target) or a `revoke` matches (principal, target).

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @kind) (= value_string "support"))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @subject) (= value_string $user))) [{:entity_id e} {:value_string su}])
    (join
      (-> FACTS
        (where (= attribute @target) (= value_string $resource))) [{:entity_id e} {:value_string ta}])
    (join
      (-> FACTS
        (where (= attribute @principal))) [{:entity_id e} {:value_string pr}])
    (where (not (exists? [(fn [su2 ta2]
      (unify
        (join
          (-> FACTS
            (where (= attribute @kind) (= value_string "block"))) [{:entity_id k}])
        (join
          (-> FACTS
            (where (= attribute @subject) (= value_string su2))) [{:entity_id k}])
        (join
          (-> FACTS
            (where (= attribute @target) (= value_string ta2))) [{:entity_id k}]))) su ta])) (not (exists? [(fn [pr2 ta2]
      (unify
        (join
          (-> FACTS
            (where (= attribute @kind) (= value_string "revoke"))) [{:entity_id k}])
        (join
          (-> FACTS
            (where (= attribute @subject) (= value_string pr2))) [{:entity_id k}])
        (join
          (-> FACTS
            (where (= attribute @target) (= value_string ta2))) [{:entity_id k}]))) pr ta]))))
  (return {:allowed true})
  (aggregate allowed))
```

**Evidence (`access_with_deny`).** 4 of 4 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 14572 chars with 52 parameters. Slowest call 156 ms. First case `12/deny-two-allows` returned `[{"tag":"bool","value":false}]`. The packet fixtures do not exercise the `revoke` clause (a mutant that disables it survives them), so 8 extra controls cover allow, block, revoke, other-resource revoke, other-user block, two supports with one revoked, no principal, unknown user. All 8 agree.

### 4.11 `output_lineage`

**Tasks.** 3 tasks. **Replaces** `xtdb-workloads.ts:459-479`.

`input_a` and `input_b` use the same text with the field name changed.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @output) (= value_string $output))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @input_a))) [{:entity_id e} {:value_string inp}])
    (join
      (-> FACTS
        (where (= attribute @code_version))) [{:entity_id e} {:value_string version}]))
  (aggregate inp version)
  (return {:input inp :version version}))
```

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @output) (= value_string $output))) [{:entity_id e}])
    (join
      (-> FACTS
        (where (= attribute @subject))) [{:entity_id e} {:value_string sv}])
    (join
      (-> FACTS
        (where (= attribute @code_version))) [{:entity_id e} {:value_string version}])
    (join
      (-> FACTS
        (where (= attribute @subject))) [{:entity_id m} {:value_string sv}])
    (join
      (-> FACTS
        (where (= attribute @input))) [{:entity_id m} {:value_string inp}]))
  (aggregate inp version)
  (return {:input inp :version version}))
```

**Evidence (`output_lineage`).** 3 of 3 cases identical in current and reopened mode. XTQL calls per case: 3. Longest statement 7265 chars with 26 parameters. Slowest call 23 ms. First case `16/original-lineage` returned `[{"tag":"str","value":"A"},{"tag":"i64","value":"7"}]`.

### 4.12 `conversion_funnel` and `session_conversion`

**Tasks.** 2 and 1 tasks. **Replaces** `xtdb-workloads.ts:480-520`.

Three steps, each a (session, step, at) triple with the window predicate `from <= at < to` inside the `at` view. The shared variable `sess` ties the three steps to one session. `session_conversion` adds `(= sess $session)`.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @session))) [{:entity_id e0} {:value_string sess}])
    (join
      (-> FACTS
        (where (= attribute @step) (= value_string "view"))) [{:entity_id e0}])
    (join
      (-> FACTS
        (where (= attribute @at) (>= (cast (if (= value_type "integer") value_string nil) #xt/type :i64) $from) (< (cast (if (= value_type "integer") value_string nil) #xt/type :i64) $to))
        (with {:t0 (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e0} {:t0 t0}])
    (join
      (-> FACTS
        (where (= attribute @session))) [{:entity_id e1} {:value_string sess}])
    (join
      (-> FACTS
        (where (= attribute @step) (= value_string "checkout"))) [{:entity_id e1}])
    (join
      (-> FACTS
        (where (= attribute @at) (>= (cast (if (= value_type "integer") value_string nil) #xt/type :i64) $from) (< (cast (if (= value_type "integer") value_string nil) #xt/type :i64) $to))
        (with {:t1 (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e1} {:t1 t1}])
    (join
      (-> FACTS
        (where (= attribute @session))) [{:entity_id e2} {:value_string sess}])
    (join
      (-> FACTS
        (where (= attribute @step) (= value_string "payment"))) [{:entity_id e2}])
    (join
      (-> FACTS
        (where (= attribute @at) (>= (cast (if (= value_type "integer") value_string nil) #xt/type :i64) $from) (< (cast (if (= value_type "integer") value_string nil) #xt/type :i64) $to))
        (with {:t2 (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e2} {:t2 t2}])
    (where (< t0 t1) (< t1 t2) (= sess $session)))
  (aggregate sess)
  (return {:session sess}))
```

**Evidence (`conversion_funnel`).** 2 of 2 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 13937 chars with 54 parameters. Slowest call 161 ms. First case `17/ordered-not-reordered` returned `[{"tag":"str","value":"S"}]`.

**Evidence (`session_conversion`).** 1 of 1 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 13985 chars with 55 parameters. Slowest call 151 ms. First case `17/equal-steps-fail` returned `[{"tag":"bool","value":false}]`. Controls: strict order at both pairs (equal view/checkout and equal checkout/payment both fail), reversed order, steps spread over two sessions, window edges. All 9 agree. Mutants that relax either `<` to `<=` survive the packet fixtures and are caught by the controls.

### 4.13 `uptime_duration`

**Tasks.** 5 tasks. **Replaces** `xtdb-workloads.ts:522-534`.

Same algorithm as the SQL workaround for the missing window functions. Clip each interval to the window as f64, collect distinct boundaries, take each pair of adjacent boundaries as an elementary segment, and sum the lengths of segments some interval covers. `unnest` over the list `[lo hi]` produces the boundary set where SQL used `UNION`.

```clojure
(->
  (unify
    (join
      (->
        (-> RECORDED
          (where (= attribute @machine) (= value_string $machine) (< valid_from $to) (or (nil? valid_to) (> valid_to $from)))
          (with {:lo (cast (greatest valid_from $from) #xt/type :f64) :hi (cast (least (coalesce valid_to $to) $to) #xt/type :f64)})
          (aggregate lo hi))
        (with {:bs [lo hi]})
        (unnest {:b bs})
        (aggregate b)) [{:b l}])
    (join
      (->
        (-> RECORDED
          (where (= attribute @machine) (= value_string $machine) (< valid_from $to) (or (nil? valid_to) (> valid_to $from)))
          (with {:lo (cast (greatest valid_from $from) #xt/type :f64) :hi (cast (least (coalesce valid_to $to) $to) #xt/type :f64)})
          (aggregate lo hi))
        (with {:bs [lo hi]})
        (unnest {:b bs})
        (aggregate b)) [{:b r}])
    (where (< l r) (not (exists? [(fn [l2 r2]
      (->
        (->
          (-> RECORDED
            (where (= attribute @machine) (= value_string $machine) (< valid_from $to) (or (nil? valid_to) (> valid_to $from)))
            (with {:lo (cast (greatest valid_from $from) #xt/type :f64) :hi (cast (least (coalesce valid_to $to) $to) #xt/type :f64)})
            (aggregate lo hi))
          (with {:bs [lo hi]})
          (unnest {:b bs})
          (aggregate b))
        (where (> b l2) (< b r2)))) l r])) (exists? [(fn [l3 r3]
      (->
        (-> RECORDED
          (where (= attribute @machine) (= value_string $machine) (< valid_from $to) (or (nil? valid_to) (> valid_to $from)))
          (with {:lo (cast (greatest valid_from $from) #xt/type :f64) :hi (cast (least (coalesce valid_to $to) $to) #xt/type :f64)})
          (aggregate lo hi))
        (where (<= lo l3) (>= hi r3)))) l r])))
  (aggregate {:duration (sum (- r l))})
  (return {:duration (coalesce duration 0)}))
```

**Evidence (`uptime_duration`).** 5 of 5 cases identical in current and reopened mode. XTQL calls per case: 1. Longest statement 7064 chars with 30 parameters. Slowest call 211 ms. First case `18/union10` returned `[{"tag":"i64","value":"10"}]`. Control with fractional binary64 endpoints mixed with integer ones, a duplicate, an adjacent pair, a gap and an open end (7 windows) agrees with SQL and with the stated durations. Cost grows with the number of boundaries squared, as in SQL.

### 4.14 `training_example`

**Tasks.** 2 tasks. **Replaces** `xtdb-workloads.ts:537-562`.

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @customer) (= entity_id $prediction))) [{:entity_id e} {:value_string cust}])
    (join
      (-> FACTS
        (where (= attribute @predicted_at))
        (with {:t (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e} {:t t}])
    (join
      (-> FACTS
        (where (= attribute @feature_known_at))
        (with {:k (cast (if (= value_type "integer") value_string nil) #xt/type :i64)})) [{:entity_id e} {:k k}])
    (join
      (-> FACTS
        (where (= attribute @fraud))) [{:entity_id e} {:value_boolean fraud}]))
  (aggregate cust t k fraud)
  (return {:customer cust :at t :known k :label (= fraud 1)}))
```

Followed by the unchanged `state_at` per prediction at the prediction's valid time and the logical cut mapped through `positionToLogical`.

**Evidence (`training_example`).** 2 of 2 cases identical in current and reopened mode. XTQL calls per case: 1 to 2. Longest statement 6016 chars with 21 parameters. Slowest call 76 ms. First case `19/historical-training-example` returned `[{"tag":"str","value":"P"},{"tag":"i64","value":"10"},{"tag":"bool","value":true}]`.

### 4.15 `reachability_supports`

**Tasks.** 3 tasks. **Replaces** `xtdb-workloads.ts:574-608`.

Three calls, one per path length (1 to 3), as in SQL. Edge k binds `{:entity_id n<k>} {:value_string n<k+1>}`, so consecutive edges unify through the shared variable. The first edge filters `entity_id = $from`, the last `value_string = $to`. Distinct intermediate nodes, then a row count. Length 1 has no intermediate node, so it aggregates a constant column first.

Length 2:

```clojure
(->
  (->
    (unify
      (join
        (-> FACTS
          (where (= attribute @_support) (= entity_id $from))) [{:entity_id n0} {:value_string n1}])
      (join
        (-> FACTS
          (where (= attribute @_support) (= value_string $to))) [{:entity_id n1} {:value_string n2}]))
    (aggregate n1))
  (aggregate {:count (row-count)}))
```

Length 1 differs only in its tail: `(return {:w true}) (aggregate w)` instead of `(aggregate n1)`.

**Evidence (`reachability_supports`).** 3 of 3 cases identical in current and reopened mode. XTQL calls per case: 3. Longest statement 4477 chars with 17 parameters. Slowest call 48 ms. First case `20/two-supports` returned `[{"tag":"bool","value":true},{"tag":"i64","value":"2"}]`.

### 4.16 The six reachability operations

`inherited_access`, `container_items`, `recalled_customers`, `vulnerable_deployments`, `dependency_closure` and `reachability_closure` are in section 5 because they share one design.

---

## 5. Reachability in pure XTQL (six operations, 14 tasks)

### 5.1 Design

XTQL has no recursion (R6, `xtql.clj` has no fixpoint form), and `union-all` cannot be planned (G1). So "x reaches t" is written as an OR over walk lengths:

```
REACH(src, t, D) = (or (exists? [(fn [s t] chain_1) src t]) ... (exists? [(fn [s t] chain_D) src t]))
chain_d(s, t)    = d self-joins of the edge view: first edge entity_id = s, last edge value_string = t
```

Edges are the facts of the reference attribute (`_member`, `_resource`, `_contains`, `_production`, `_dependency`) with `value_type = "ref"`, the same edge definition the SQL helper uses (`xtdb-workloads.ts:205`). Candidates for `t` come from the edge or fact views, then `REACH` filters them. `reach-xtql.ts` builds the five final queries and the six completeness queries.

Example, `reachability_closure` at D=2:

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @_support) (= value_type "ref"))) [{:value_string t}])
    (where (or (exists? [(fn [s t]
      (unify
        (join
          (-> FACTS
            (where (= attribute @_support) (= value_type "ref") (= entity_id s) (= value_string t))) [{:entity_id n0} {:value_string n1}]))) $from t]) (exists? [(fn [s t]
      (unify
        (join
          (-> FACTS
            (where (= attribute @_support) (= value_type "ref") (= entity_id s))) [{:entity_id n0} {:value_string n1}])
        (join
          (-> FACTS
            (where (= attribute @_support) (= value_type "ref") (= value_string t))) [{:entity_id n1} {:value_string n2}]))) $from t]))))
  (aggregate t)
  (return {:target t}))
```

### 5.2 Certifying the depth

A depth-D query is complete when no node at hop D+1 lies outside the hop-at-most-D set. That is the breadth-first fixpoint test, and it also holds on cycles. Each closure has an XTQL completeness query that returns a row iff the test fails:

```clojure
(->
  (unify
    (join
      (-> FACTS
        (where (= attribute @_support) (= value_type "ref") (= entity_id $from))) [{:entity_id n0} {:value_string n1}])
    (join
      (-> FACTS
        (where (= attribute @_support) (= value_type "ref"))) [{:entity_id n1} {:value_string n2}])
    (join
      (-> FACTS
        (where (= attribute @_support) (= value_type "ref"))) [{:entity_id n2} {:value_string n3}])
    (where (not (or (exists? [(fn [s t]
      (unify
        (join
          (-> FACTS
            (where (= attribute @_support) (= value_type "ref") (= entity_id s) (= value_string t))) [{:entity_id n0} {:value_string n1}]))) $from n3]) (exists? [(fn [s t]
      (unify
        (join
          (-> FACTS
            (where (= attribute @_support) (= value_type "ref") (= entity_id s))) [{:entity_id n0} {:value_string n1}])
        (join
          (-> FACTS
            (where (= attribute @_support) (= value_type "ref") (= value_string t))) [{:entity_id n1} {:value_string n2}]))) $from n3])))))
  (limit 1)
  (return {:incomplete true}))
```

The driver (`reach` in `reach-xtql.ts`) tries D = 1, 2, ... up to 8 and runs the final query at the first D whose completeness query returns no row. If D=8 is not enough it raises a range error and returns no partial result, the same budget rule as `maxRounds` in `selectSqlWithReachability`. For `vulnerable_deployments` the closure source is a variable (every application in the environment), so the completeness query joins the environment view first.

### 5.3 Evidence

- All 14 reachability tasks pass (`inherited_access` 3, `container_items` 4, `recalled_customers` 3, `vulnerable_deployments` 2, `dependency_closure` 1, `reachability_closure` 1), in both modes and with the task position pinned. Calls per task are 2 to 5 (completeness queries plus the final query).
- `dependency_closure` on a graph with a diamond and a cycle terminates and matches SQL.
- The packet fixtures settle at D=1 or D=2. A deeper control (a chain of 6 hops, a back edge from the last node to the third, and a side branch) returns the same closure as the SQL scratch-table helper and the stated sets for 5 start nodes, including the cycle members.
- Cost of the depth-D final query for `container_items` on the workload 13 fixture (21 rows), 3 repetitions each, wall time of the whole native call including the `tx_meta` read:

| D | statement chars | parameters | ms (min to max) |
| ---: | ---: | ---: | --- |
| 1 | 4493 | 16 | 76 to 166 |
| 2 | 7471 | 26 | 43 to 119 |
| 3 | 11896 | 41 | 70 to 914 |
| 4 | 17768 | 61 | 112 to 472 |
| 5 | 25087 | 86 | 156 to 1020 |
| 6 | 33932 | 116 | 225 to 813 |
| 8 | 56165 | 191 | 567 to 1700 |

Statement size grows with D squared because chain_d has d edge views and each view repeats the `FACTS` expansion. Planning time dominates, not data volume. The maximum 100,000-row budget of the SQL helper has no counterpart here, because there is no scratch relation.

### 5.4 Alternatives checked

**A. Server-resident rounds with XTQL bodies (tested, works).** The scratch-table design of `Reachability.ts` keeps its shell (`CREATE TABLE`, `INSERT`, count query) in SQL, but the two data-reading subqueries become XTQL derived tables: the seed (`INSERT ... SELECT ... FROM (SELECT DISTINCT source, target FROM (XTQL (<edges>)) e)`) and each round (`INSERT ... SELECT ... FROM (XTQL (<unify of two scratch views plus a not-exists? against the scratch table>)) c`). The final read is `(from :tx_native_relations {...})`. On the workload 15 fixture: the seed wrote 5 rows, round 1 brought the table to 9 rows, round 2 added nothing, and closure(X) read back through XTQL (["W", "Y", "Z"]) equals the same read through SQL and the packet's expected rows for `15/dependency-set`, taken at the same cut. This keeps the unbounded-depth property and the 100,000-row budget, but it keeps the write-in-read behaviour R6 flagged (finding 4), and its trace still shows SQL statements for the shell, so it would count as hybrid. Script: `rounds.mjs`, output `raw/rounds.json`.

**B. Client-driven breadth-first search (not built).** Probe `xtql-array-param-json` shows `(unnest {:k $p})` over a JSON-typed array parameter works with the production client's parameter typing (a JS array is sent as oid 114), so each round could pass its frontier as a parameter. This is host-side recursion, which `Reachability.ts:29-34` says the helper avoids on purpose, so it needs a policy decision before anyone builds it.

### 5.5 Recommendation

- Fixtures and graphs of depth up to about 5: use the unrolled form (read-only, no scratch state to clean up, one cut when the position is pinned).
- Deeper or wider graphs: either rounds with XTQL bodies (A) and a decision that the SQL shell does not make the task hybrid, or the engine repair in G2.

---

## 6. Gaps list

Every error text below was captured from the live node (`raw/gaps.json`, `raw/int64.json`).

### 6.1 Operations XTQL 2.2.0 cannot express or plan

| # | Gap | Exact error | Best XTQL workaround | Verdict |
| --- | --- | --- | --- | --- |
| G1 | `union-all` | `No implementation of method: :plan-query of protocol: #'xtdb.xtql.plan/PlanQuery found for class: xtdb.xtql.UnionAll` | Fixed small unions of one row: `(with {:bs [lo hi]}) (unnest {:b bs})` (used in `uptime_duration`). Membership unions: `(or (exists? ...) ...)` (used for reachability). General union of two relations: none in pure XTQL. SQL `SELECT ... FROM (XTQL ...) UNION ALL SELECT ... FROM (XTQL ...)` works (probe `sql-union-all-of-xtql`) but is SQL. | **Engine-repair candidate, small.** `xtql.clj:611-617` parses `union-all`, `logical_plan.clj:289` and `operator/set.clj:19,70` already have `:union-all`, and `sql.clj:2778` uses it. `xtql/plan.clj` has no `PlanQuery` implementation for `UnionAll`. |
| G2 | Recursion / transitive closure | none (no XTQL form). SQL: `Recursive CTEs are not supported yet` (`sql.clj:264-265`) | Depth-unrolled `exists?` walk plus an XTQL completeness check (section 5). Exact for any graph whose depth fits the statement budget; cost grows with D squared. | **Engine-repair candidate, large.** Bounded only. Rounds with XTQL bodies (5.4 A) are unbounded but hybrid. |
| G3 | `sum` over BIGINT wraps silently | no error. Three values of 2^62: SQL and XTQL both return `-4611686018427387904` | Sum 32-bit halves and recombine with checked `+`/`*` (7.3). | **Engine-repair candidate, small.** `LongVector.kt:30-33` (`increment` uses unchecked `+`) via `agg/Sum.kt`. The scalar `+`, `-`, `*` are checked (`expression.clj:877, 895, 919`). |
| G4 | `(cast x :i64)` as documented | `PostgresError: class clojure.lang.Keyword cannot be cast to class xtdb.arrow.VectorType` | `(cast x #xt/type :i64)` (also `:utf8`, `:f64`). | Docs mismatch, not a capability gap. `expression.clj:158-163` passes the raw keyword to `codegen-cast` (`expression.clj:225-233`). |
| G5 | Literal or parameter in a `join` bind spec | `TODO what should literals in out specs do outside of scan` | Put the predicate in the joined view's `where`. | `plan.clj:588-589`. Not a capability gap. |
| G6 | `(aggregate {:k constant})` | `internal error conforming query plan` | `(return {:k true}) (aggregate k)`. | `plan.clj:840` allows only logic variables as grouping columns. |
| G7 | Cast of a non-numeric string | `For input string: "not-a-number"`; out of range text: `For input string: "9223372036854775808"` | Guard with `value_type`, as the SQL library does. | Same behaviour as SQL. `expression.clj:1885-1893` (`Long/parseLong`). |
| G8 | Window functions | `Method xtdb/sql/ExprPlanVisitor.visitAggregateWindowFunction(Lxtdb/antlr/Sql$AggregateWindowFunctionContext;)Ljava/lang/Object; is abstract`; `Method xtdb/sql/ExprPlanVisitor.visitRankWindowFunction(Lxtdb/antlr/Sql$RankWindowFunctionContext;)Ljava/lang/Object; is abstract`; `ROW_NUMBER` works | XTQL has no window operator. Workload 18 needs none (section 4.13). | Engine-repair candidate if a task ever needs `SUM() OVER` or `RANK()`. |

**Bottom line.** No operation lacks an XTQL answer. The only operations with no exact, unbounded pure-XTQL formulation are the six reachability operations (G2), and the only construct with no pure-XTQL workaround at all is a general union of two relations (G1), which no operation needs today.

### 6.2 Smaller behaviours to know

- **Row order is undefined** without `order-by` (probe `xtql-exists-correlated` returned `b, é, B` for an unordered read of the rows `B, a, b, é`). `order-by` accepts only a column, and `limit`/`offset` accept only an integer literal or a parameter (`plan.clj:797-798, 870-890`).
- **String order is by UTF-8 bytes**: `B a b é` sorts as `B, a, b, é` (probe `xtql-string-order-unsigned`).
- **int8 results arrive as JavaScript strings** with the default `postgres` driver (probe `xtql-bigint-result-type`). `hydrateNativeValue` accepts strings and bigints for int64 columns (`NativeQuery.ts:98-148`), so contracts work. Doubles arrive as numbers.
- **A bigint parameter above 2^53 compares exactly** (probe `xtql-bigint-param-compare`, value 2^63-1).
- **Top-level `triplex_param_n` names are visible inside nested subqueries**, but outer variables are not (3.3).
- **A variable from the outer `unify` cannot be used in a joined view's `where`.** The engine reports `Not all variables in expression are in scope` (`plan.clj:250-255`). Bind the same variable name in the bind spec instead.

### 6.3 R6's open questions, answered

| R6 question | Answer | Evidence |
| --- | --- | --- |
| Does XTQL `with` override a column that `:bind` already produced, so retirement metadata is masked? | Yes. At R=1002, P=2 `history()` returns `retracted_at`, `retracted_position`, `retract_tx_id` as null for a row retracted at position 3. At R=1004, P=3 it returns 1003, 3, `tx-3`. | probes `xtql-history-mask-old-cut`, `xtql-history-mask-new-cut` |
| Does `INSERT ... SELECT` from an XTQL subquery plan? | Yes, for the seed and for rounds with a correlated `not exists?` against the table being inserted into. | probe `insert-select-from-xtql`, `rounds.mjs` |
| Does text-to-BIGINT `cast` behave the same from XTQL? | Yes, with `#xt/type :i64`. Null casts to null. | probes `xtql-cast-guarded-mixed`, `xtql-cast-null` |
| Does the `SUM` wrap reproduce through SQL and XTQL? | Yes, both. | probes `sql-sum-bigint-wrap`, `xtql-sum-bigint-wrap` |
| Is the window failure an `AbstractMethodError` of the shape the library saw? | The message is `Method xtdb/sql/ExprPlanVisitor.visitAggregateWindowFunction(...) is abstract` (and `visitRankWindowFunction`). The server log tail did not retain the Java class name in its last 80 lines. | probes `sql-window-sum-over`, `sql-window-rank`, `raw/xtdb-container-tail.log` |
| Can XTQL read a table SQL wrote? | Yes. | probe `xtql-read-scratch-table` |

---

## 7. Fixed cut, int64 handling and the SUM wrap

### 7.1 Holding one cut across several XTQL calls

**What is wrong today.** `basisOf` in `xtdb-workloads.ts:112-115` returns only `{recordedAt, validAt}`, so `resolveNativeReadBasis` (`NativeQuery.ts:71-86`) takes the current position from `tx_meta` on every call. A task with several calls (R6 counts 16 of 71) can mix positions if a writer commits between them.

**Recipe 1, Triplex position pin (works today, no engine feature needed).**

1. Take the position from the first call's result: `result.basis.recordedPosition` (`NativeReadResult`).
2. Pass it as `options.basis.recordedPosition` on every later call of the same logical task (`NativeReadOptions`, `NativeQuery.ts:26-27`). The value must not exceed the current position or the call fails with `The requested native source position is unavailable` (`NativeQuery.ts:80-84`).
3. Keep explicit earlier cuts (for example workload 19's `positionToLogical` mapping) as they are. They set `recordedAt`, the pinned position stays the upper bound.

```ts
let taskPosition: number | undefined;
const basisOf = (at) => ({
  recordedAt: 1000 + Number(at["cut"].known_at),
  validAt: tick(at["cut"].valid_at ?? 0),
  ...(taskPosition === undefined ? {} : { recordedPosition: taskPosition }),
});
// after each execute(): taskPosition ??= result.basis.recordedPosition
```

This is sound because `tx_assertions` only gains rows and retraction metadata with larger positions, and `facts()` filters on `recorded_position <= P` and `retracted_position <= P` (`Sources.ts:55-96`), so a later commit cannot change what position P shows. Call 1 still picks its own position, so a stricter version reads P first and passes it to call 1 as well.

**Evidence.** `fixedcut.mjs` (`raw/fixedcut.json`), workload 01 query `state_at` at R=1003:

| Step | Rows | P used |
| --- | --- | --- |
| before the writer, unpinned | `paid` | 2 |
| writer commits position 3 (adds `cancelled`), unpinned | `cancelled`, `paid` | 3 |
| same query pinned to P0=2 | `paid` | 2 |

The whole 71-case suite also passes with the position pinned to each workload's last position (`raw/xtql-run-fixed.json`, 71 of 71).

**Recipe 2, engine snapshot (works, not wired).** `XtdbClient.query` accepts `basis: {snapshotToken, clockTime, awaitToken}` and emits `SETTING SNAPSHOT_TOKEN = '...', CLOCK_TIME = ...` (`XtdbClient.ts:184-191`), but `NativeQueries.run` passes `undefined` for the basis (`NativeQueries.ts:68, 117`). Both forms were checked on this node:

| Form | Result |
| --- | --- |
| no token, after a writer | `cancelled`, `paid` |
| `SETTING SNAPSHOT_TOKEN = <token taken before the writer>` | `paid` only |
| `BEGIN READ ONLY WITH (SNAPSHOT_TOKEN = ..., CLOCK_TIME = ...)`, a query, a concurrent write, the same query | `paid` both times |
| after `COMMIT`, a new read | `cancelled`, `paid`, `returned` |

The multi-statement form needs one reserved connection per logical task (a `session` API on the client). Triplex's own position stays the portable cut because snapshot tokens are engine-specific. `latestAwaitToken` is per client (`XtdbClient.ts:132, 184`), so a second client may not see a just-acknowledged commit even though its returned basis stays correct.

### 7.2 int64 parameters and results

- **Parameters.** `nativeParameter` turns the Triplex integer object into a `BigInt` (`Sources.ts:19-27`), and the client sends it as oid 20 (`XtdbClient.ts:156`). A safe-integer JS number is also oid 20; any other number is oid 701 (float8). A bound 2^63-1 compared exactly against the cast column (probe `xtql-bigint-param-compare`).
- **Storage.** int64 values live as decimal text in `value_string` with `value_type = 'integer'`. Every arithmetic or comparison use goes through the guarded cast in 3.3.
- **Results.** The default driver returns int8 as a JavaScript string, never a number, so values above 2^53 survive. Contracts declare `TypeExpr.int64`, and `hydrateNativeValue` converts strings and bigints exactly (and refuses a non-safe JS number).
- **Totals as text.** The cookbook returns sums as text (`cast ... #xt/type :utf8`), like the SQL library, so no total passes through a JS number.
- **Doubles.** Uptime clips as `f64`; `duration` arrives as a JS number and is accepted when it is a safe integer.

### 7.3 Avoiding the SUM wrap in XTQL

Write each value n as `hi * 2^32 + lo` with `hi = (/ n 4294967296)` (integer division truncates toward zero, `expression.clj:1014-1017`) and `lo = (- n (* hi 4294967296))`. Then `-2^31 <= hi <= 2^31` and `|lo| < 2^32`, so `(sum hi)` and `(sum lo)` cannot wrap for fewer than 2^31 addends. The total is `(+ (* (coalesce shi 0) 4294967296) (coalesce slo 0))`. `+` and `*` on BIGINT use `Math/addExact` and `Math/multiplyExact` (`expression.clj:877-883, 919-925`), so a total outside int64 raises an error instead of wrapping.

```clojure
(with {:n <guarded int64>})
(with {:hi (/ n 4294967296)})
(with {:lo (- n (* hi 4294967296))})
(aggregate {:shi (sum hi) :slo (sum lo)})
(return {:total (cast (+ (* (coalesce shi 0) 4294967296) (coalesce slo 0)) #xt/type :utf8)})
```

Library-shaped results (`int64.mjs`, `raw/int64.json`), account balance with the real builders:

| Case | Mathematical sum | Shipped SQL | XTQL |
| --- | ---: | ---: | --- |
| three-2^62 | 13835058055282163712 | -4611686018427387904 | ERROR data exception - overflow error |
| int64max-plus-1 | 9223372036854775808 | -9223372036854775808 | ERROR data exception - overflow error |
| int64max-plus-min | -1 | -1 | -1 |
| min-plus-minus1 | -9223372036854775809 | 9223372036854775807 | ERROR data exception - overflow error |
| exact-int64max | 9223372036854775807 | 9223372036854775807 | 9223372036854775807 |
| exact-int64min | -9223372036854775808 | -9223372036854775808 | -9223372036854775808 |
| mixed-wrap-cancels | 5 | 5 | 5 |

The raw error is `data exception - overflow error`. Returning `shi` and `slo` separately and adding them as BigInt on the host is also exact (probe `xtql-sum-split-hi-lo-host` gives 13835058055282163712 for the three 2^62 values and flags that it does not fit int64).

---

## 8. How well the checks discriminate

- **Mutants on the packet fixtures** (`mutation.mjs`, `raw/mutation.json`). Of 3 well-formed deliberate bugs, 1 was caught (wrong attribute filter in `account_balance`, 3 of 4 cases differ) and 2 survived: relaxing a step order in `session_conversion`, and disabling the `revoke` clause in `access_with_deny`. A fourth, syntactically invalid mutant raised errors in all 3 `paid_without_entitlement` cases. So the packet fixtures alone prove less than 71 of 71 suggests.
- **Extra controls** (`controls.mjs`, `raw/controls.json`). 38 hand-built scenarios across workloads 05, 08, 09, 12, 17, 18 and 20. In all 38 the shipped SQL builder and the XTQL builder return the same rows, and in all 38 that row set equals the value stated in the script. The same controls catch all 4 mutants tried against them (two `<` to `<=` changes in 17, and disabling `revoke` or `block` in 12).
- **Not covered by any extra control**: workloads 01, 02, 03, 04, 07, 10, 11, 13, 14, 15, 16 and 19 rely on the packet cases alone (06 also has the int64 boundary run), and no value type other than string, boolean and int64 was exercised.

---

## 9. Evidence index and how to rerun

Directory `/Users/sam/Claude/Projects/triplex-db-2/R12-xtql-cookbook/`:

| File | What it holds |
| --- | --- |
| `start-probe.sh`, `raw/start-probe.log` | the conditional container start and the memory-cap waits |
| `build.mjs`, `entry.ts` | bundles the repo's TypeScript with no repo edit |
| `fixture.mjs`, `lib.mjs` | fixture rows from the packet, client with the `r12_` table prefix, canonical row sets |
| `baseline.mjs`, `raw/baseline-sql.{log,json}` | shipped SQL library on the fixtures, 71 of 71 |
| `xtql-workloads.ts`, `reach-xtql.ts` | every XTQL builder and the reachability driver (source of truth for the query text) |
| `run-xtql.mjs`, `raw/xtql-run-full.json`, `raw/xtql-run-reopen.json`, `raw/xtql-run-fixed.json` | the three 71-case runs, with every statement, parameter list, trace and the three row sets per case |
| `render.mjs`, `raw/shorthand.{json,txt}` | the shorthand text in section 4 |
| `gaps.mjs`, `raw/gaps.json` | 40 engine probes (errors, SUM wrap, params, history mask, INSERT from XTQL) |
| `fixedcut.mjs`, `raw/fixedcut.json` | pinned position and snapshot-token probes |
| `int64.mjs`, `raw/int64.json` | boundary sums through the real builders |
| `rounds.mjs`, `raw/rounds.json` | server-resident rounds with XTQL bodies |
| `depth-scaling.mjs`, `raw/depth-scaling.json` | statement size and time against D |
| `mutation.mjs`, `controls.mjs`, `raw/mutation.json`, `raw/controls.json` | discrimination checks |
| `q.mjs`, `dbg.mjs` | one-off query runner and failing-statement printer |

Rerun (container up on 5464, run from the repo root so the repo's `postgres` package resolves):

```
cd /Users/sam/projects/triplex-db-2
R=/Users/sam/Claude/Projects/triplex-db-2/R12-xtql-cookbook
node $R/build.mjs entry.ts xtql-workloads.ts reach-xtql.ts
node $R/baseline.mjs
node $R/run-xtql.mjs --reach            # current
node $R/run-xtql.mjs --reach --reopen   # fresh pool over the same data
node $R/run-xtql.mjs --reach --fixed    # position pinned
node $R/gaps.mjs; node $R/fixedcut.mjs; node $R/int64.mjs; node $R/controls.mjs
```

XTDB sources read: `core/src/main/clojure/xtdb/xtql.clj` (parse: `from` 357-401, `unify` 321-327, `join` 442-463, `where` 404-415, `with` 417-426, `aggregate` 487-491, `order-by`/`limit`/`offset` 493-548, `rel` 550-591, `unnest` 593-609, `union-all` 611-617, subquery expressions 141-159), `xtql/plan.clj` (`plan-from` 412-434, `Where`/`With`/`Return` 533-570, `plan-join` 583-594, `Unify` 740-792, `Aggregate` 816-868, `Limit`/`Offset` 870-890), `expression.clj` (cast 158-163, 225-262, 292, 1885-1897; arithmetic 877-925, 1014-1044), `sql.clj` 2872-2890.

---

## 10. Not verified

- **One node, one engine build, tiny data.** The largest fixture has 36 rows. No scale, latency or memory claim is made, and the statement-size growth in 5.3 is measured on 21 rows.
- **"Reopened" means a fresh connection pool**, not an engine restart. A restart-then-read check was not run.
- **Fixtures are reconstructed**, not written through Triplex `transact`. The unmodified SQL library passes 71 of 71 on them, but columns the builders never read (`id`, `tx_id`, `created_by`) differ from a real run.
- **Value families.** Only string, boolean and integer columns were exercised, matching the packet. No `number`, `datetime`, `json` or `blob` read through XTQL.
- **The reachability driver caps at D=8.** Correctness was checked on fixtures that settle at D=1 or D=2 and on one synthetic 6-hop graph. Graphs near the cap and the cost beyond D=8 are the extrapolation in 5.3.
- **The gate's counting rule** for the SQL `source-cut` step (section 1) is a decision, not a measurement.
- **The window-function Java class name** was not retained in the container log tail (6.3).
- **No reviewer pass.** The brief forbade subagents, so the Sam-writing-style background review required for first drafts was not run on this file. The author checked it against the seven passes by hand.
