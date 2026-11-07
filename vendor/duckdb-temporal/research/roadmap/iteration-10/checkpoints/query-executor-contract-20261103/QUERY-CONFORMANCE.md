# Triplex QueryExecutor and conformance source review

3 November 2026. Triplex revision `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`.

## Evidence status and scope

This is read-only primary-source analysis. No repository subject code, test, package, database, model, adapter, or stopped material was executed or inspected as runtime evidence. The curated hand controls remain unexecuted. Source declarations, implementation branches, and written test assertions are distinguished throughout. No passed test, reproduced defect, compatibility result, performance result, or novelty over unpublished local work is claimed.

This lane concerns the required query service, admission behavior, and the difference between shared runtime conformance and separate upstream query tests. Typed-value identity, cursor envelopes/receipts, lifecycle/explain, preconditions/constraints, and database scope/generation retain their separate packets.

## Main findings

1. QueryExecutor is a required four-method service. Its interface does not negotiate a smaller operator subset.
2. runtimeConformance supplies a runtime layer to the shared Triples cases. It does not run every separate KV, compiler, schema, validation, or integration test.
3. Shared cases cover considerably more than triple matching: joins, correlated NOT, pattern-alternative OR, constrained binary recursion, aggregates, declarative clause order, optional values, selected wrapper filters, and typed admission failures.
4. The separate upstream tests add assertions, but their strength varies: direct in-memory KV result assertions, SQL-fragment assertions, schema/admission assertions, direct compiled-SQL integration, and KV/SQLite differential comparisons are different evidence categories.
5. Two combinations require a future source/behavior comparison: optionalProjection with rowBinding omitted from find, and repeated same-name base definitions feeding multiplicity-sensitive aggregation. Neither is a reproduced defect.

## 1. Required service and language surface

Runtime.define requires both StorageAdapter and QueryExecutor layers. QueryExecutorService requires execute, executePage, explain, and explainPage. The first two accept a resolved temporal basis; executePage also accepts an already-decoded PaginationValue ordering tuple. Public result values are string, number, boolean, or null. All four methods expose ReadError or DatalogQueryError. Core metrics are distinct from optional SQL-specific fields, so non-SQL implementations do not need to manufacture SQL. The execute comment explicitly requires shared runtime/semantic preflight before backend strategy selection. [QX] [RUNTIME]

There is no per-operator capability bitmap, optional execute method, or dedicated unsupported-query error in these declarations. This does not prove implementation compliance. It means a reduced language is not negotiated by this interface. A future rejection/resource policy must be explicit rather than treated as established conformance.

The schema declares three-/four-slot patterns; predicates `> >= < <= = !=`; NOT; OR; binary rule applications and definitions; count/sum/avg/min/max; HAVING; ordering; limit/offset; optionalProjection; and wrapped-query staging. Wrapper operators are `= != > >= < <= like not-like ilike not-ilike is-null is-not-null`. Semantic validation narrows schema-shaped input. [SCHEMA-CLAUSES] [SCHEMA-QUERY]

## 2. What the shared harness actually includes

makeTriplesConformanceSuite iterates triplesConformanceCases. runtimeConformance constructs the supplied runtime layer and provides it to that suite. It does not invoke all separate test files, provision a database, or clear storage. The documentation calls for fresh storage and explicitly says passing is not full compliance. [HARNESS] [DOC-LIMITS]

Relevant shared assertions, excluding the separately owned value/cursor/lifecycle detail:

- Ref joins include value-to-value joins and a multi-hop graph fixture preserving both matching paths. [SHARED-JOINS]
- NOT includes correlated pattern exclusion. OR includes pattern alternatives with constants. The declarative-order case puts a numeric predicate before its positive binder and puts a NOT-local predicate before the NOT-local binding pattern. [SHARED-LOGIC] [SHARED-ORDER]
- Recursive cases use an acyclic chain to assert ancestor closure, independent aliases for repeated applications of the same rule, string identity endpoints, and repeated-variable equality in rule bodies/applications. [SHARED-RULES]
- A separate three-edge recursive fixture asserts two-page traversal with total count three. It does not establish arbitrary recursive combinations. [SHARED-RULE-PAGE]
- Aggregates cover grouping, all five operations, HAVING >=, and ordering by aggregate. Two members with equal score ten contribute twenty to sum. A duplicate-value fixture asserts sum twenty and count one. Empty ungrouped aggregation returns one row with count zero and null for sum/avg/min/max. [SHARED-AGG]
- Optional-value wrapper fixtures assert selected operators: !=, not-like, >=, =, and is-null. Their negative-filter assertions exclude null/incompatible scalar families. This is not a complete twelve-operator matrix. [SHARED-WRAPPER]
- Shared typed-error assertions cover malformed shape, unbound projection, aggregate-source ambiguity, non-string identity positions, unprojected wrapper filter targets, missing operands, and invalid ordered-predicate operands. [SHARED-ERRORS]

## 3. Separate upstream query-test assertions

### Direct KV engine tests

The direct executor file constructs a new in-memory KV fixture and calls executeQuery/executeWrappedQuery. These are not calls to runtimeConformance. [KV-FIXTURE]

Written result assertions cover:

- >=, =, !=, and >= combined with <;
- correlated NOT;
- OR alternatives containing patterns, predicates, and NOT;
- expected membership from those alternatives;
- all five aggregates, duplicate-preserving sum versus distinct count, empty ungrouped output, grouping, and HAVING;
- ascending/descending numeric and lexical string order;
- limit, offset, and their combination;
- wrapper limit/count/filter, an ilike example, and impossible joins. [KV-LOGIC] [KV-REST]

Do not infer coverage from titles alone. The KV test titled “applies wrapper like filter” supplies ilike. It is not separate positive result coverage for both LIKE and ILIKE. [KV-REST]

### SQL compiler and wrapper tests

These commonly assert SQL fragments and parameters, not resulting rows. Logical assertions include NOT EXISTS, correlated EXISTS for OR, predicate alternatives inline, and NOT alternatives. Wrapper assertions include equality, LIKE, SQLite ILIKE via COLLATE NOCASE, >= and < numeric filters, filter conjunction, and count-query construction. [SQL-LOGIC-TESTS] [WRAPPER-TESTS]

Two limits are explicit in the assertions: the test titled “is-null and is-not-null” supplies only is-not-null; the multiple-filter case checks WHERE/AND presence rather than exact filtered output. Parameter-count equality is also weaker than equality of the complete parameter sequences. [WRAPPER-TESTS]

### Integration and differential tests

Integration source asserts four-slot transaction binding, joining that binding to transaction actor metadata, and filtering by a constant transaction ID. [TX-QUERY-TESTS]

The maxDepth=1 test expects the base edge plus one recursive level, producing two ancestors. That particular test calls compileWithRules and then submits its SQL directly, rather than establishing a candidate adapter result through runtimeConformance. [DEPTH-TEST]

The differential corpus contains nine queries involving typed projections, joins, predicates, NOT, and optional projection. It compares KV with SQLite and separately compares paged accumulation with queryAll. Its positive optional example includes its rowBinding in find. It does not cover all language combinations. [DIFF-CORPUS]

## 4. Admission and error contract

The shared suite expects UnboundVariableError, with the named variable, for an unbound projection and a wrapper filter referring to an unprojected inner value. It expects DatalogValidationError for malformed runtime input, aggregate-source projection ambiguity, invalid identity positions, missing filter operands, ordered comparisons over entity bindings, and text constants in ordered predicates. These are written assertions, not observed outcomes. [SHARED-ERRORS]

The validator additionally establishes these source-level rules:

- A positive pattern or rule application is required. OR-only and NOT-only relations do not satisfy that requirement.
- Positive bindings are collected before predicates are validated.
- NOT-local pattern variables can satisfy predicates inside that NOT; they do not become outward positive bindings.
- OR alternatives do not bind variables outward.
- Aggregate sources must be positive-bound; targets must be projected, unique, and non-shadowing. A source cannot also appear in find.
- HAVING requires an aggregate and cannot reference optional targets.
- Ordering must reference result bindings. Wrapper filters/order must reference inner projected variable bindings.
- Null checks prohibit values; other wrapper operators require values; LIKE-family operators require string operands; ordered wrapper operands must be numbers or strings; aggregate-result wrapper filters require numeric values. [VALIDATOR]

Rule validation requires nonempty definitions and a nonrecursive base. Rule bodies cannot bind transaction IDs. Cross-rule calls are rejected. A recursive definition must be one link pattern followed by one same-named application, with the link's value variable feeding the recursive first argument. This is not unrestricted Datalog recursion. Separate tests assert rejection of unsafe names, invalid depths, undefined rules, empty disjunctions, and unsupported recursive body shape. [RULE-VALIDATOR] [VALIDATION-TESTS] [RULE-SCHEMA-TESTS]

An operator-looking head is not necessarily an unknown-predicate error. The pinned integration assertion deliberately treats `[">>", "?x", 10]` as a pattern and expects an empty relation. Do not promise blanket rejection of unrecognized operator-looking heads. [UNKNOWN-HEAD]

DatalogQueryError includes DatalogError, UnboundVariableError, InvalidPredicateError, and DatalogValidationError. A declared error variant is not evidence that all malformed inputs take that variant. [ERRORS]

## 5. Source-only comparison obligation A: hidden optional rowBinding

The validator requires optionalProjection.rowBinding to be positively bound, but does not require it in find. All positive optional examples inspected retain it in find. [OPTIONAL-ADMISSION] [DIFF-CORPUS]

KV executeQuery first projects or aggregates result contexts, then calls hydrateOptionalProjection. Hydration reads the entity ID from the already-produced result row. If the rowBinding is absent/non-string, it returns null optional targets. SQL instead resolves the optional rowBinding from compiler bindings and builds a correlated scalar subquery. [KV-OPTIONAL-ORDER] [KV-OPTIONAL] [SQL-OPTIONAL]

Finite hand fixture: one entity has one qualifying type fact and one active label. Compare find `[?entity, ?label]` against find `[?label]` with the same positive entity binding and optional label field. The latter is admitted by the inspected validator. The branches give a reason to compare outcomes, but this report does not claim an executed difference or choose the desired compatibility policy. The all-fields-projected case is the isolating control.

## 6. Source-only comparison obligation B: repeated base definitions and aggregation

The finite case here uses two identical same-name nonrecursive base definitions, not cycles, recursion, or a diamond graph.

The inspected public/SQL call path does not deduplicate those definitions:

1. DatalogQuery.rules is Schema.Array(Rule); decodeQuery returns decoded.success. There is no custom unique-rule transformation in these branches. [SCHEMA-QUERY] [DECODE]
2. validateRules builds per-name arrays by pushing every definition; it checks shape/base/calls, not duplicate identity. assertDatalogQuery returns the validated query. [RULE-VALIDATOR] [VALIDATOR]
3. Public query validates, wraps the query as the inner query, validates the wrapper, prepares pagination, then calls executePage. wrapDatalogQuery retains inner directly; pagination changes order/page limits without rewriting the rules array. queryAll also passes the original query directly to execute. [PUBLIC-PATH] [QUERY-WRAP] [PAGINATION-PATH]
4. SQL executePage calls compileWrapped; compileWrapped validates, removes only unnecessary inner order, and passes the inner query to compileWithRules when rules are present. [SQL-PAGE-PATH] [WRAPPER-PATH]
5. compileWithRules revalidates, then groupRulesByName pushes every rule. compileRecursiveCTE maps every base definition and joins the resulting SQL with UNION ALL, including the nonrecursive-only path. Each definition's SELECT DISTINCT is local to that definition, not a union-wide DISTINCT. [RULE-GROUP] [RULE-COMPILE] [RULE-BASE-SELECT] [RULE-UNION]

By contrast, KV deriveRulePairs uses a seen set keyed by endpoint pair across definitions/iterations before applying the relation. SQL SUM/AVG expressions consume joined rows, and outer SELECT DISTINCT is outside aggregation. [KV-PAIR-DEDUP] [SQL-AGG] [SQL-OUTER]

Future comparison obligation: use one ref-valued edge, two identical same-name base definitions over that edge, and a joined numeric measure. Compare one-definition versus two-definition inputs for ordinary projected rule rows, COUNT DISTINCT, and SUM. Keep every query within the admitted binary-rule shape and use one active measure. The purpose is to establish whether duplicate definitions are intentionally idempotent before aggregation. Ordinary projected DISTINCT rows and COUNT DISTINCT alone can conceal multiplicity. Uniform duplicate bases can also leave AVG unchanged, so an unchanged AVG would be a weak control, not evidence of relation-level deduplication. No exact observed result or reproduced defect is claimed.

An exact paper-only AST for this obligation is:

```json
{
  "find": ["?sum", "?count"],
  "where": [["rel", "source:1", "?target"], ["?target", ":measure", "?value"]],
  "aggregate": [["sum", "?value", "?sum"], ["count", "?target", "?count"]],
  "rules": [
    {"name": "rel", "body": [["?x", ":edge", "?y"]]},
    {"name": "rel", "body": [["?x", ":edge", "?y"]]}
  ]
}
```

The proposed paper facts are source:1 :edge ref(target:1) and target:1 :measure number(10), each once at one shared visible basis. The isolating variant removes the second identical definition. This AST is source-traced as within the inspected admission rules; it has not been submitted to the decoder, compiler, engine, or any adapter.

## 7. Curated hand controls

See [the sixteen curated hand-only controls](HAND-CONTROLS.md). H13-H14 preserve the two source-only comparison obligations above without selecting a common oracle. No control was executed.

## 8. Boundaries not established by the inspected query corpus

- The positive optional examples do not settle omitted rowBinding, multivalued optional selection, or all optional/aggregate combinations.
- Separate rule and aggregate tests do not settle repeated-base rules feeding multiplicity-sensitive aggregation.
- Shared successful OR coverage is narrower than the direct KV pattern/predicate/NOT alternative coverage.
- Twelve declared wrapper operators do not establish a full cross-backend operand/null/collation/wildcard/escape matrix.
- Depth bounds and small chains do not establish unrestricted recursion, cycle behavior, cancellation, or resource ceilings.
- Bounded returned pages do not establish bounded execution work.
- Repository documentation explicitly excludes crash durability, cross-process isolation, resource ownership, migration safety, and complete snapshot/emitter correctness from full-compliance conclusions based on the shared suite. [DOC-LIMITS]

## Pinned primary sources

[QX]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/QueryExecutor.ts#L19-L168
[RUNTIME]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L108-L125
[SCHEMA-CLAUSES]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L103-L294
[SCHEMA-QUERY]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L395-L520
[HARNESS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L2865-L2887
[DOC-LIMITS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L249-L258
[SHARED-JOINS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L880-L951
[SHARED-LOGIC]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L634-L665
[SHARED-ORDER]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1271-L1311
[SHARED-RULES]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L954-L1103
[SHARED-RULE-PAGE]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L297-L335
[SHARED-AGG]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1106-L1268
[SHARED-WRAPPER]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1436-L1576
[SHARED-ERRORS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1314-L1433
[KV-FIXTURE]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/kv/datalog/executor.test.ts#L1-L49
[KV-LOGIC]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/kv/datalog/executor.test.ts#L162-L365
[KV-REST]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/kv/datalog/executor.test.ts#L399-L773
[SQL-LOGIC-TESTS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/datalog/compiler.test.ts#L235-L399
[WRAPPER-TESTS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/datalog/wrapper.test.ts#L81-L335
[TX-QUERY-TESTS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/test/integration/test/datalog.test.ts#L1108-L1236
[DEPTH-TEST]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/test/integration/test/datalog.test.ts#L985-L1025
[DIFF-CORPUS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/test/integration/test/datalog-differential.test.ts#L22-L164
[VALIDATOR]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L207-L402
[RULE-VALIDATOR]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L138-L204
[VALIDATION-TESTS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/datalog/validation.test.ts#L39-L300
[RULE-SCHEMA-TESTS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/datalog/schema.test.ts#L327-L375
[UNKNOWN-HEAD]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/test/integration/test/datalog.test.ts#L468-L489
[ERRORS]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/errors/index.ts#L119-L191
[OPTIONAL-ADMISSION]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L275-L290
[KV-OPTIONAL-ORDER]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L716-L732
[KV-OPTIONAL]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L461-L508
[SQL-OPTIONAL]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L878-L922
[DECODE]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L37-L46
[PUBLIC-PATH]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L636-L677
[QUERY-WRAP]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts#L16-L25
[PAGINATION-PATH]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts#L194-L231
[SQL-PAGE-PATH]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L244-L259
[WRAPPER-PATH]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/wrapper.ts#L318-L337
[RULE-GROUP]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1416-L1423
[RULE-COMPILE]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1804-L1835
[RULE-BASE-SELECT]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1578-L1587
[RULE-UNION]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1640-L1650
[KV-PAIR-DEDUP]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L249-L305
[SQL-AGG]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1131-L1167
[SQL-OUTER]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1887-L1918
[PRODUCT-PREP]: [PRIVATE_REFERENCE_REMOVED]
[PRODUCT-READ]: [PRIVATE_REFERENCE_REMOVED]
[PRODUCT-NEG]: [PRIVATE_REFERENCE_REMOVED]
[PRODUCT-AGG-GRAMMAR]: [PRIVATE_REFERENCE_REMOVED]
[PRODUCT-AGG]: [PRIVATE_REFERENCE_REMOVED]
[PRODUCT-OUTPUT]: [PRIVATE_REFERENCE_REMOVED]
