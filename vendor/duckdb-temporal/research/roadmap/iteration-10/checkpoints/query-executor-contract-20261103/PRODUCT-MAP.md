# Published DuckDB query language mapping

3 November 2026. Source analysis only, against unchanged PR 8 source at 0e8823973f5e1b886b7ef96e8dc5a899f467f241. No adapter surface, compiler lowering or executable action is selected.

## Input and result are different interfaces

The published store accepts a six-field Query containing a string program, valid and known cuts, and fact/round/work limits. It does not accept Triplex's query AST. Preparation captures those six fields once and validates signed-integer cut shapes, a nonnegative explicit known cut and bounded limits before beginning the read transaction. The snapshot-relative known-cut upper bound is checked after BEGIN and position acquisition. The opt-in stratified path performs one owned native-only read, validates the current trust/helper boundary, obtains one position, sends all retained history to the native scalar and returns the fully owned result after COMMIT. These source branches do not establish the still-UNRUN persisted50 matrix.

Sources: [Query fields]([PRIVATE_REFERENCE_REMOVED]), [preparation]([PRIVATE_REFERENCE_REMOVED]), [stratified read]([PRIVATE_REFERENCE_REMOVED]).

The native result consists of a complete answer relation and exposes rounds/derived-facts/work counters. Answer tuples have set semantics and are sorted with the native typed lexicographic comparator. This is not a public per-query order specification, optional-result wrapper, offset/limit service, cursor envelope or Triplex QueryExecutor. A future mapping must establish the upstream operator order before applying result decoration, sorting or slicing. The previously preserved value and cursor packets retain their separate obligations.

Sources: [relation set identity]([PRIVATE_REFERENCE_REMOVED]), [complete output]([PRIVATE_REFERENCE_REMOVED]), [typed ordering]([PRIVATE_REFERENCE_REMOVED]).

## Negation needs an explicit scope translation

An ordinary native rule contains positive body atoms, filters, negative atoms and at most one aggregate descriptor. Every variable in a native negative atom must occur positively in that rule. Once a complete positive candidate has passed every filter, the evaluator probes the full bound tuple in the completed lower-stratum relation. It does not introduce a local variable under the negative atom.

Consequently, a Triplex anti-existence conjunction with a local witness cannot be translated just by emitting one native negative atom with that new variable. A possible future lowering would derive a helper relation containing the correlated outer key whenever the entire inner conjunction has a witness, then negate membership of that key. That is an unselected design inference: variable correlation, conjunction, typed identity, temporal cuts, dependencies and resource bounds all need proof. Negating each inner atom independently would change the meaning.

Sources: [rule structure]([PRIVATE_REFERENCE_REMOVED]), [positive binding requirements]([PRIVATE_REFERENCE_REMOVED]), [completed full-tuple anti-membership]([PRIVATE_REFERENCE_REMOVED]).

## Native aggregates do not supply Triplex multiplicity

The selected native aggregate grammar permits count/min/max/sum_i64 as the final head term. Its body must be one completed positive relation atom with distinct variable columns, no filters and no negatives. Group keys are distinct source variables; min/max/sum_i64 select one source measure. Evaluation counts the source relation's complete tuples, which have already been deduplicated. A zero-key aggregate has an empty-input global group: count and sum_i64 produce zero, while min/max omit the tuple. The sum is exact wide integer accumulation with a final int64 bound, rather than Triplex's JavaScript-number aggregate surface.

The future adapter therefore needs a separate multiplicity and empty-result contract. In particular, projecting a helper relation to only group and measure can collapse two distinct witnesses, while carrying every witness does not implement a distinct-measure COUNT automatically. Native absence of an empty min/max tuple must not be relabeled as Triplex's one-row aggregate null result. No compatibility follows from the shared names count/min/max.

Sources: [native grammar and descriptor restrictions]([PRIVATE_REFERENCE_REMOVED]), [group formation and final output]([PRIVATE_REFERENCE_REMOVED]).

## Validation must precede the larger native language

Native positive rules can use general completed SCCs, including multiple rules and nonbinary predicates. The native expression operators include checked negation, arithmetic, equality and ordering. Those capabilities cannot authorize accepting a Triplex AST outside its own pinned validation rules. Conversely, an upstream string predicate, optional projection or existential branch is not implemented just because the native engine can evaluate filters and recursion.

The native parser requires an answer predicate of arity 1 through 8 and enforces bounded program, predicate, body, variable and expression sizes. Helper materialization can consume those bounds. A future valid upstream query that cannot be proven to fit must receive a documented unsupported/resource response or a separately selected execution route, rather than silently dropping native guards or reporting partial success. This report selects neither response policy nor fallback.

Sources: [parser limits]([PRIVATE_REFERENCE_REMOVED]), [complete parse and answer requirement]([PRIVATE_REFERENCE_REMOVED]), [expression operators and structural caps]([PRIVATE_REFERENCE_REMOVED]).

The existing SQL-first planner only admits proved whole-program positive, acyclic, filter-free source; other cases use the complete original native program. It is not a Triplex SQL compiler. Its current design remains bounded and does not establish planner timing, general operator integration or adapter conformance.

Sources: [planner admission statement]([PRIVATE_REFERENCE_REMOVED]), [proof exclusion]([PRIVATE_REFERENCE_REMOVED]), [selected design boundaries]([PRIVATE_REFERENCE_REMOVED]).

## Evidence limit

These are named published-source observations and design inferences, not an adapter implementation, executed lowering, fixture/model evaluation, test result or performance measurement. The product source remains unchanged. Earlier bounded passes and the three later PR 9 NONPASS attempts retain their exact scopes.
