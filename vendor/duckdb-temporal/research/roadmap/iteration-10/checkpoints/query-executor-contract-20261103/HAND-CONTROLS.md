# Query executor hand controls

3 November 2026. All sixteen controls below are unexecuted paper specifications or source-derived comparison obligations. They are not passed tests, runtime observations or a selected adapter contract. H13 and H14 deliberately have no common selected backend oracle; their purpose is to resolve a conditional source difference before claiming compatibility.

Triplex is pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0. Source explanations and anchors are in QUERY-SEMANTICS.md and QUERY-CONFORMANCE.md. The unchanged DuckDB mapping is in PRODUCT-MAP.md.

## H01 Positive binding is independent of source order

Use two entities with scores 3 and 8. Place the predicate requiring score at least 5 before the score pattern, then reverse those clauses. Both hand derivations retain only the score-8 entity. Compare this with an actually unbound predicate variable, which must fail admission rather than silently yield no rows. Relational clause scheduling is distinct from short-circuiting an error.

## H02 OR tests existence without exporting a binding

Give three outer-bound people: one matching neither alternative, one matching only one, and one matching both. Alternatives can use a constant pattern, a predicate over an outer variable, or a local NOT. The matching person contributes one outer binding regardless of how many alternatives succeed. A variable introduced only inside OR cannot be projected as an outward result variable.

## H03 NOT quantifies the whole local conjunction

Give outer entities a and b. Entity a has local witnesses x and y, but only x satisfies the inner numeric condition; entity b has none. The NOT conjunction removes a and retains b. Reorder the inner predicate before its binding pattern without changing that answer. Projecting an inner-only witness remains invalid. A lowering that negates each inner atom separately is not equivalent to anti-existence of the complete conjunction.

## H04 Native negative binding is a separate lowering obligation

Use H03's local witness under a native negative atom without adding a positive outer binding for that witness. The published native parser rejects this shape. A future helper relation must represent existence of the complete inner conjunction keyed by the correlated outer variables, not reuse an invocation-local dictionary ID as a public identity. This is a design review obligation; no helper is implemented or admitted.

## H05 Aggregate input multiplicity and distinct COUNT differ

Two distinct entities each carry amount 10. For the ungrouped amount aggregate, the pinned Triplex source contract has SUM 20, AVG 10, MIN 10, MAX 10 and COUNT(amount) 1. Dropping the entity witness too early would collapse SUM inputs; treating COUNT as full-witness count would produce 2. Preserve source rows, aggregate distinctness and final result DISTINCT as separate stages.

## H06 Empty global and grouped aggregation differ

For no qualifying input, an ungrouped query has one aggregate row: COUNT 0 and SUM/AVG/MIN/MAX null. A query grouped by an unobserved key has no group row. Contrast the native empty-global sum_i64 zero and absent min/max tuple. The adapter must not substitute either native representation without an explicit output mapping.

## H07 Aggregate aliases and filters must be admitted correctly

Create two groups, project their keys and an aggregate alias, filter with HAVING and order by that alias. Reject a source that is simultaneously projected as an ordinary variable and consumed as an aggregate source, a missing/unprojected target, duplicate or shadowing targets, HAVING without aggregation, and a HAVING reference to an optional target. Do not infer error-subclass parity from the presence of an error union alone.

## H08 Rule language remains narrower than native recursion

Hand-check a valid binary rule with a nonempty base definition and one permitted self-recursive link. Independently reject no-base, empty-body, cross-rule, transaction-slot-in-body, extra recursive-body-clause and invalid maxDepth variants. The native engine's more general positive SCC support is not permission to admit those upstream-invalid queries.

## H09 Rule aliases, repeated variables and depth

Use a short acyclic chain. Two applications of the same rule use independent variable aliases; a repeated variable constrains its two positions to equality. Keep base results plus the allowed number of recursive expansions distinct from edge distance. Set maxDepth explicitly on every same-name definition: the group uses their maximum, and an omitted sibling contributes the default 100. Inspect rule endpoint-family restrictions before comparing a numeric or boolean endpoint with a string endpoint. This is a hand derivation, not a depth/resource test.

## H10 Four-slot patterns bind assertion transaction identity

Give two assertions different transaction IDs, then join those bound IDs to actor metadata and filter by one constant ID. Include non-string entity, attribute and transaction slots as negative admission shapes. The current native triple relation has three columns and no public transaction-ID binding; timestamp metadata or logical commit position cannot silently replace this fourth slot.

## H11 Wrapper stages are observable

Choose an inner ordered relation with more rows than its inner limit; let an outer filter remove one of the retained inner rows and then apply an outer page limit. Compute totalCount over filtered inner results, before outer pagination. A wrapper must not move its filter ahead of the inner limit, remove inner slicing, or report the page length as the total count.

## H12 Inventory operator and error entry points

Account for all six predicate and twelve wrapper operators with accepted and rejected operand shapes. Include numeric ordered operands, null checks with an impermissible operand, missing comparison operands, string-only LIKE-family operands, empty OR, OR-only/NOT-only queries, and unbound outputs. Preserve the pinned case where an unknown-looking three-slot head such as >> is classified as a triple pattern rather than automatically rejected as an operator.

## H13 Optional projection with hidden row binding

Give entity e one qualifying type fact and one label. Compare projecting both e and the label with projecting only the optional label while retaining e as optionalProjection.rowBinding. The validator's positive-binding check, KV's projection-before-hydration branch and SQL's binding-based correlated expression must be reconciled. Keep branch-derived forecasts separate until the intended common contract is chosen. No backend difference was executed.

## H14 Finite duplicate rule derivations before SUM

Use two admitted base definitions that derive the same binary pair, without recursion, plus one numeric measure joined from the pair's target. Compare plain projected pairs, COUNT DISTINCT of the endpoint, and SUM of the measure. KV pair deduplication and SQL UNION ALL occur at different points; plain DISTINCT projection and COUNT DISTINCT may conceal multiplicity. The inspected decode/validation/grouping path retains repeated definitions rather than deduplicating them. This source trace still does not establish a runtime outcome or select a common oracle.

## H15 Optional output is not an optional WHERE clause

Retain a positive outer row whose optional attribute is absent and require the optional target's null representation without dropping the row. Compare an outer wrapper is-null filter with a negative wrapper comparison over that optional target; wrapper null/incompatible operands do not become successful negative matches. Ordinary Datalog != has its own value-family semantics. Specify any multivalued optional choice and optional/aggregate combination separately rather than inferring them from the inspected single-valued examples.

## H16 Bounds apply after a proposed lowering

Start with a schema-admissible upstream query whose correct correlated helper construction would exceed a native body, variable, arity, rule or output bound. The review must identify the unsupported/resource response or a separately selected route. It must not discard the native bounds, accept a partial result, fabricate counters or claim that final pagination bounded the underlying execution. No fallback, resource envelope or executable lane is selected here.

## Result ledger

Executed: none. Passed: none. Failed: none. H01-H16 remain UNEXECUTED. H13-H14 are unresolved comparison obligations, not golden expected outputs. Existing accepted subjects, NONPASS attempts, held goals and stopped databases are unchanged.
