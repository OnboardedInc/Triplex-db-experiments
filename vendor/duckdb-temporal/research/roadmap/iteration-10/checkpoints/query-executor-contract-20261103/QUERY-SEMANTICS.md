# Triplex QueryExecutor language and evaluation boundary

3 November 2026. Read-only source research for goal 10. Triplex is pinned throughout to `bjacobso/triplex` revision `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`.

## Findings

The adapter-facing query is a structured Datalog AST, not an arbitrary Datalog language. Its positive patterns and binary rule calls establish bindings; predicates, negation and disjunction filter those bindings. In particular, `or` is an existence/filter operator that cannot export new variables. `not` can introduce existential local variables shared by its inner patterns, then discard them. Directly mapping either construct to a native binding-producing union or to a negative atom that requires every variable to be positively bound would change the language. [Grammar][S-clauses] [Validation][V-relations] [KV execution][K-filters]

The optional feature is a separate `optionalProjection` structure, not an optional where-clause or general left join. Aggregation is not uniformly set-based: `count` counts distinct source values, while the other aggregates consume the multiplicity of the joined inputs before final result DISTINCT. Rule definitions have a deliberately restricted binary form, and their same-name definition union and depth policy must be accounted for separately. [Optional schema][S-query] [Aggregate execution][K-aggregate] [Rule preflight][V-rules]

The published contract requires query executors to use shared validation before backend execution. The inspected boundaries distinguish typed shape/semantic errors from backend read failures, but do not define a general adapter-subset capability rejection protocol. A future subset contract therefore needs explicit unsupported-feature behavior, rather than silently returning no rows for an unsupported AST. This report selects no such subset or error policy. [Runtime contract][D-contract] [Service][Q-service] [Error routing][SQL-errors]

There are two source-level comparison obligations worth a later separately authorized oracle: optional hydration without a projected row binding, and rule-definition/path multiplicity before non-count aggregation. These are **static inferences, not observed defects, passed tests, or a selected implementation**.

## Scope and evidence limits

- Every curated hand control is **UNEXECUTED**. No source was imported, compiled, evaluated or run. No model/fixture, package, database, conformance suite, Codex task, machine snapshot, original-owner workspace, stopped runner, WAL or stopped artifact was used.
- This report uses primary repository source retrieved through the GitHub connector, including connector-returned blob IDs. It does not authenticate a loaded build or rehash public source bodies.
- Only targeted README navigation was used for the earlier private typed-value and capability/lifecycle/explain packets. Those packets remain separate; this is not a novelty claim about unpublished local work.
- Typed-value equality, cursor envelopes, receipts, lifecycle/explain, write preconditions and scope/generation are deliberately not re-researched here. Source references to value handling below are limited to query-language phase and aggregate-domain obligations.
- Upstream test files are evidence of authored assertions only. Their presence is not execution evidence from this research.

## 1. Service and closed AST

`QueryExecutorService.execute` accepts `DatalogQuery`, optional debug and a resolved temporal basis, and returns an Effect containing binding rows. The declared typed error channel is `ReadError | DatalogQueryError`. Its comment says implementations run shared runtime and semantic preflight before choosing the execution strategy, despite the parameter comment also calling the query pre-validated. `executePage` accepts `WrappedQuery` and decoded cursor values as a separate argument. [Service][Q-service]

The relevant grammar is:

- A variable is `?` plus an identifier, not an arbitrary string beginning with `?`. The `?` prefix is unavailable for literal strings. Entity, attribute, transaction and rule-argument positions are string identity literals or variables. A pattern has three or four terms; the fourth is the assertion transaction identity. [Terms][S-terms] [Patterns][S-patterns]
- A predicate is a three-term tuple with one of `>`, `>=`, `<`, `<=`, `=` or `!=` as its first term. It filters; it does not bind. [Patterns and predicates][S-patterns]
- `not` contains one required inner clause and up to seven additional inner clauses. Its inner grammar is patterns or predicates only. Nested not/or and rule calls are not in that inner grammar. [Negation/disjunction][S-clauses]
- Canonical `or` is exactly a two-element tuple: `or` plus an array of alternatives. Each alternative is one pattern, one predicate or one not clause. There is no general conjunction branch, nested `or`, or rule-call alternative. The normalizer has a variadic compatibility branch, but that branch does not expand what the schema-validated service accepts. [Grammar][S-clauses] [Normalizer][S-dispatch]
- A rule application is a binary call with an identifier-like rule name and two string-identity terms. Rule bodies provide pattern/rule-call semantics, not general predicate/not/or semantics. Structural tuple overlap is not a guarantee that every predicate-looking input is rejected as a shape error; the actual guard/validation path still matters. [Rule grammar][S-rules]
- `find`, `where`, aggregate, having and orderBy are arrays; the inspected schema does not impose non-empty `find`. `limit` must be a positive integer and `offset` a non-negative integer. `aggregate` entries have an operation, a source variable and a target variable. [Query/modifiers][S-query]
- There is no `optional` clause constructor. Optional fields are described by `optionalProjection: { rowBinding, fields: [{ attribute, variable }] }`. [Query/modifiers][S-query]

### Dispatch is semantic, not just tuple length

`isRuleApplication` recognizes a three-term tuple when its first term matches the rule-name regex and its second term does not start with `:`. Consequently, a literal entity such as `alice` followed by a variable attribute in a three-term tuple is classified as a rule call, while the same literal entity followed by `:name` is classified as a pattern. Four-term tuples are not rule calls. An adapter must preserve this routing or explicitly narrow it; “all three-tuples are triple patterns” is not faithful. [Dispatch][S-dispatch]

## 2. Positive relations, projection and filters

At least one top-level positive pattern or rule application is required. An `or` containing only patterns does not satisfy that requirement, and neither does a `not`. Shared preflight first collects variables from all top-level positive patterns/rule calls, then checks filters. Thus the placement of a predicate before its binding pattern is legal. KV and SQL both establish positives before predicates/not/or, independently of written clause order. [Preflight][V-relations] [KV phase order][K-where] [SQL phase order][C-main]

Repeated variables establish equality joins, including repeated variables within a pattern. A disconnected positive relation is a conjunction/cross product, not a separate query. Projection is a distinct public relation: SQL emits SELECT DISTINCT, and KV deduplicates the projected row objects. This is distinct from aggregate input handling. Projected variable keys retain their `?` prefixes. Multiple witnesses with identical projected binding values can collapse to one public row. The find schema also admits literal terms; empty find is source-admitted rather than a declared schema error. These projection shapes need their own adapter mapping. [Terms][S-terms] [Query][S-query] [SQL patterns][C-patterns] [KV projection][K-project] [SQL DISTINCT][C-main]

### Predicates

Every predicate variable must be bound by the applicable positive relation set, not assigned by the predicate. Ordered predicates require numeric constants and variables that occur in a pattern value position. This is a static “numeric-capable binding position” restriction, not proof that every matched value is numeric. Runtime mismatches do not become a binding error: KV's ordered predicate returns false for nonnumbers. Null/unresolved operands also fail the predicate. Detailed equality-family behavior belongs to the prior typed-value packet. [Predicate validation][V-predicates] [KV predicates][K-predicate]

### Conjunctive negation

`not` means “there does not exist one joined assignment satisfying all its inner clauses.” Pattern-local variables are permitted and shared within that not. Preflight collects all local pattern bindings before validating its local predicates, so a local predicate can precede its local pattern. Those variables never become outer bindings. A not with no correlated outer variable is a global existence check, not automatically rejected: any matching inner assignment can remove every incoming outer row. A predicate-only not is also possible when its operands are outer-bound. [Negation validation][V-not] [KV anti-existence][K-filters] [SQL NOT EXISTS][C-not]

This matters for the published native restriction documented in PRODUCT-MAP.md: a Triplex not-local variable is an existential helper variable, not a variable that can simply be inserted into a native all-variables-positively-bound negative atom. No materialization or adapter design is selected here.

### Disjunction

Each incoming binding survives once if any alternative matches. Both alternatives matching does not duplicate it, and fresh variables inside pattern alternatives are local to the existence check. A sibling predicate alternative cannot use a variable produced only in another alternative, and `find` cannot project it. SQL compiles pattern alternatives to EXISTS and KV tests them with an existence boolean, retaining only the original incoming context. [Schema][S-clauses] [Preflight][V-relations] [SQL OR][C-or] [KV OR][K-filters]

The Datalog documentation includes a named-Alice-or-Bob example containing only an or clause, while the inspected preflight requires a top-level positive relation. Treat that example as insufficient to establish the executable service contract; the code boundary rejects it. [Example][D-not-or] [Preflight][V-relations]

## 3. Optional projection

Preflight requires the rowBinding to be positive-bound. Each optional target must occur in find, must be unique, and must not shadow a positive binding or aggregate target. The target is not available to where predicates or rule matching; having explicitly cannot reference optional targets. Result ordering and outer wrapper filtering can use the projected field. [Optional/result validation][V-results] [Wrapper validation][V-wrapper]

SQL obtains each optional scalar using a correlated subquery against the row-binding identity, restricted to its attribute, with LIMIT 1. Missing values decode as null. KV projects/aggregates first and then hydrates optional fields, using a per-entity cache. Both implementations therefore describe scalar optional fields, not expansion to every matching attribute value. Neither inspected branch promises which of multiple values wins: SQL LIMIT 1 lacks an order, and KV takes the first encountered datom for each attribute. A future contract should not invent a stable winner for cardinality-many optional fields from these branches alone. [SQL optional expressions][C-optional] [KV hydration][K-optional]

**Static question:** rowBinding is required to be positively bound, but not required to appear in find. SQL can still correlate its subquery using the binding in the compiler context. KV looks up the rowBinding on an already projected/aggregated result row; when it is absent, the optional fields become null. See H13 in HAND-CONTROLS.md. The source indicates a potential parity boundary, not an executed mismatch. [Validation][V-results] [SQL][C-optional] [KV][K-optional] [KV pipeline][K-query]

## 4. Aggregation, having and order

Aggregate sources must be positive-bound and cannot also appear in find. Targets must be unique, must not shadow a positive binding, and must appear in find. The implementation groups by the remaining non-aggregate projected variables. The supported operators are count, sum, avg, min and max. [Aggregate/result validation][V-results] [Aggregate grammar][S-query]

`count` is distinct over source values. It is neither COUNT(*) nor a count of complete witness tuples. By contrast, sum/avg/min/max consume the joined inputs with duplicate aggregate inputs retained. KV deliberately uses a projection without result-level DISTINCT for this phase. SQL uses COUNT(DISTINCT ...) for count and ordinary numeric SUM/AVG/MIN/MAX otherwise. [KV projection/aggregate][K-project] [KV aggregate][K-aggregate] [SQL aggregates][C-aggregate]

For an empty ungrouped input there is one aggregate row: count zero and other operations null. Grouped empty input produces no rows. This is explicitly documented and asserted in the source tests, which were not run. [Documentation][D-aggregate] [KV implementation][K-aggregate] [Authored assertions][T-aggregate]

Having runs after aggregation and is a conjunction of predicate tuples. It requires at least one aggregate, may reference only projected result variables, and cannot reference optional targets. Equality involving an aggregate target is restricted to numeric-capable result operands/numeric constants. OrderBy likewise can reference only projected result variables. A direction defaults to ascending. The pre-existing typed-value packet owns mixed-family ordering details. Raw execute without orderBy does not establish an incidental storage-order guarantee; public paging's prepared total order is a separate boundary. [Validation][V-results] [SQL modifiers][C-modifiers] [KV pipeline][K-query]

## 5. Wrapped-query phase boundaries

A wrapped query has a Datalog inner query, optional filters on projected columns, optional outer order, a limit and optional includeCount. Its semantic sequence is inner query including its logical limit/offset, wrapper filters, total filtered count, outer order, then cursor/page truncation. The count excludes cursor/page restrictions but includes the inner logical subset. An outer filter cannot be pushed below an inner limit/offset if that changes membership. [Schema contract][S-wrapper] [KV wrapped execution][K-wrapper] [SQL wrapped compilation][W-main]

Wrapper filters are conjunctive and support equality/inequality, ordered comparisons, like/not-like, ilike/not-ilike and null checks. They refer only to variables projected by inner.find. Null checks forbid an operand; other operators require one. Text matching requires a string, ordered comparisons require a number or string, and non-null filters on aggregate targets require a numeric operand. [Wrapper grammar][S-wrapper] [Preflight][V-wrapper]

An optional-result null does not satisfy negative text/equality filters: KV explicitly rejects null operands before all non-null-check operators, matching SQL three-valued filtering. Its LIKE interpreter treats `%` as any sequence and `_` as one character, escaping regex punctuation; ilike lowercases both operands. SQL delegates to dialect LIKE/ILIKE forms. This report does not establish general cross-dialect Unicode, escape or collation parity. [KV filters][K-wrapper-filters] [SQL filters][W-filters]

SQL may remove inner ordering when inner has neither limit nor offset, since it cannot affect membership; when either is present the inner query is retained with its order. That optimization is not permission to ignore an inner logical subset. [SQL wrapped compilation][W-main]

## 6. Rules are bounded binary relations

Rule output arguments are inferred from the first pattern's entity variable and last pattern's value variable. The body must be nonempty, and each same-name definition group needs a nonrecursive base. Rule names use an identifier regex and reserve not/or. Transaction-binding patterns in rule bodies are rejected. Cross-rule composition is rejected. [Rule schema][S-rules] [Preflight][V-rules]

If a definition has recursion, the admitted body is exactly one pattern followed by one same-name application: `[head, attribute, next]` and then `[ruleName, next, tail]`, with the relevant terms variables and the link variable shared. Extra patterns, multiple calls, reverse call order and calls to another rule are not admitted. A preflight check, rather than a backend approximation, enforces that restriction. [Preflight][V-rules]

Same-name definitions form a union. SQL builds CTEs and KV uses a seen-set fixpoint over string-identity pairs. Multiple top-level rule calls can join to patterns and to one another. Rule endpoints are string identities, not arbitrary numeric relation values. [SQL rule application][C-rule-call] [KV rules][K-rules] [Documentation][D-rules]

Depth is a positive safe integer. The effective depth is the maximum over same-name definitions, each omitted value contributing the default 100. Base pairs are depth zero; recursive expansion is permitted up to the effective maxDepth. Therefore setting maxDepth=1 only on one definition does not lower a sibling definition's omitted default. [SQL depth][C-rule-depth] [KV depth][K-rules]

**Static question:** SQL combines base definitions and recursive paths with UNION ALL before the outer SELECT DISTINCT or aggregate. KV removes duplicate endpoint pairs before applying the rule to outer bindings. Ordinary distinct projected rule results can hide this difference, while a downstream sum/avg over an outer join could expose it. See H14 in HAND-CONTROLS.md. This is a source-derived multiplicity question, not an observed failure. [SQL definition/depth union][C-rule-depth] [SQL aggregate/DISTINCT][C-rules-main] [KV seen set][K-rules]

One internal-call caution: the low-level KV executeQuery validates input.rules but evaluates the separate rules parameter, which defaults to an empty array. The public KvTriples boundary passes q.rules into that parameter. An adapter comparison must use the intended service boundary, not mistake the low-level default call for service behavior. [Low-level pipeline][K-query] [Public KV call][K-boundary]

## 7. Unsupported and evaluation error boundaries

The following are different outcomes, not interchangeable “no match” results:

1. **Shape failure:** runtime input that fails the declared schema is rejected by schema decode as DatalogValidationError. Tuple constructors overlap structurally, so an apparent operator token must be interpreted using the actual dispatch rather than assuming every unrecognized token or predicate-looking tuple necessarily fails schema decode.
2. **Semantic preflight failure:** missing positive relations, empty or, undefined rules, unsupported rule forms, target collisions and disallowed aggregate/having use are DatalogValidationError; variables unavailable in the relevant scope are UnboundVariableError, retaining variable and clause fields.
3. **Legal predicate that does not match:** no output row, including runtime ordered-predicate type mismatch or null operands. That is not permission to suppress validation failures.
4. **Backend compilation/evaluation failure:** SQL retains the two preflight error classes; other caught compiler exceptions and statement/count failures become ReadError. KV's public boundary retains the two validation classes and maps other typed query errors to ReadError. The inspected mapError sites do not by themselves establish that every Effect defect/interruption is captured as a typed ReadError.

[Shape/error constructors][V-shape] [Semantic checks][V-relations] [Result checks][V-results] [KV predicates][K-predicate] [SQL boundary][SQL-errors] [SQL execution][SQL-execute] [KV boundary][K-boundary] [Error declarations][E-query]

The exposed DatalogQueryError union also includes DatalogError and InvalidPredicateError, but the shared preflight inspected here emits the two more specific validation classes. There is no dedicated UnsupportedFeatureError in that union. A partial adapter cannot infer its supported feature list or stable rejection payload merely from the existence of the interface. [Error union][E-union] [Service][Q-service]

## 8. Curated hand controls

See [the sixteen curated hand-only controls](HAND-CONTROLS.md). All remain UNEXECUTED; H13-H14 have no common selected comparison oracle.

## 9. Connector-returned source identities

All following files were retrieved at the pinned Triplex commit. These are connector-returned Git blob IDs, not local hashes or executed-build evidence.

| Source path | Blob SHA |
| --- | --- |
| packages/core/src/storage/QueryExecutor.ts | 8c1d3e3b9cf9cc8c14586e0fc48780075086157f |
| packages/core/src/datalog/schema.ts | 3a3a1356473336aac8ec571a0cfa8c32aecac5ad |
| packages/core/src/datalog/validation.ts | f271306ef9d7bf772a7dc0b36cfd5028df358742 |
| packages/core/src/datalog/compiler.ts | e1df2e3f61fd72e574f77418160448b885045c5f |
| packages/core/src/datalog/wrapper.ts | 46cca1f25f7f3bc6e6fb296de5fe9e7aa41b456d |
| packages/core/src/kv/datalog/executor.ts | 1f524d44426f0b33338a74f2f8050bda6d5c2f19 |
| packages/core/src/kv/datalog/predicate.ts | 86f8151df41dc483013f841e79f03d8cb81879a5 |
| packages/core/src/kv/datalog/pattern.ts | e1bb99316774cabde1ec9e57f3f74c9d44a4517e |
| packages/core/src/kv/layers/KvTriplesLive.ts | d617ebf4e101e7aed3de262f3278c8d7cd699d0f |
| packages/sql/src/SqlQueryExecutor.ts | d53f1d9baa3a88d0900222ea16724f77a5ec63ea |
| packages/core/src/errors/index.ts | 5098faef3dd76bbb6e12471b12e12441ff970bff |
| docs/datalog.md | 89ca70125e150c2b8fb89750bcb7db4632cdf271 |
| docs/custom-runtimes.md | df7813e8fbf95d6f595c2aaee8af95318b2de0b1 |
| packages/core/test/datalog/validation.test.ts | 32f27798c47d4323db927841b195f35765bf26f0 |
| packages/core/test/kv/datalog/executor.test.ts | eebba0139e05141999f97774ae0b137a3de08e44 |
| test/integration/test/datalog-differential.test.ts | 7a2fbf307f4048090761413854827a96240394b9 |

## 10. Exact pinned source anchors

[Q-service]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/QueryExecutor.ts#L112-L174
[S-terms]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L13-L95
[S-patterns]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L101-L138
[S-clauses]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L140-L194
[S-rules]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L200-L290
[S-query]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L300-L430
[S-wrapper]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L436-L521
[S-dispatch]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L608-L678
[V-shape]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L23-L56
[V-predicates]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L52-L111
[V-not]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L113-L136
[V-rules]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L138-L205
[V-relations]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L207-L255
[V-results]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L257-L329
[V-wrapper]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L355-L403
[K-predicate]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/predicate.ts#L1-L89
[K-filters]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L60-L187
[K-rules]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L189-L306
[K-where]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L346-L394
[K-project]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L398-L443
[K-optional]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L461-L512
[K-aggregate]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L514-L610
[K-query]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L679-L751
[K-wrapper]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L764-L819
[K-wrapper-filters]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L823-L925
[K-boundary]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/layers/KvTriplesLive.ts#L822-L908
[C-resolve]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L237-L266
[C-patterns]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L529-L615
[C-not]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L649-L780
[C-or]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L787-L812
[C-optional]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L878-L923
[C-modifiers]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1048-L1101
[C-aggregate]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1116-L1267
[C-main]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1292-L1365
[C-rule-depth]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1611-L1733
[C-rule-call]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1755-L1799
[C-rules-main]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1804-L1924
[W-filters]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/wrapper.ts#L60-L158
[W-main]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/wrapper.ts#L318-L446
[SQL-errors]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L35-L42
[SQL-execute]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L185-L307
[E-query]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/errors/index.ts#L119-L140
[E-union]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/errors/index.ts#L185-L191
[D-not-or]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/datalog.md#L119-L144
[D-aggregate]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/datalog.md#L146-L175
[D-rules]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/datalog.md#L248-L276
[D-contract]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L213-L258
[T-aggregate]: https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/kv/datalog/executor.test.ts#L429-L475
