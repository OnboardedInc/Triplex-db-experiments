# Triplex explain, validation, and derivation boundaries

Research date: 3 November 2026 UTC. Public source is pinned to bjacobso/triplex commit `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`. This is source reading and hand specification only. Goal 10 remains source-only and unaccepted. No selected adapter capability subset, package acquisition, subject import, execution, fixture, simulation, database/WAL inspection, original-owner artifact, or conformance result is introduced. No novelty claim is made over unpublished research.

## Useful findings first

1. **Triplex explain is compiler/debug output, not a semantic explanation and not even a database optimizer's physical EXPLAIN.** SQL explain returns generated SQL and parameters without calling its statement runner. KV explain returns a JSON serialization of the validated structural query. Both can provide structural compilation metrics. Neither returns fact witnesses, candidate provenance, backend costs, or an authenticated physical optimizer plan.
2. **Paged explain does not validate or apply the opaque cursor.** The public queryPage path validates the query, obtains runtime time and current commit position, prepares pagination, and only then executes. ExplainPage calls the compiler/validator directly. A successful explanation can therefore coexist with a later PaginationCursorError for the same raw request.
3. **Explain output is not the exact statement later used by public execution.** Explain has no temporal-basis argument. Public execution resolves a basis; public pages additionally supply a complete deterministic order, a default/bounded page size, lookahead, and decoded cursor values. Raw explainPage does none of those public pagination transformations.
4. **Do not describe every documented provenance restriction as an unconditional Derivation.make/evaluate ban.** The constructor explicitly rejects nonempty rules/aggregates, limit, offset, and where clauses outside patterns/predicates/negation. Dynamic attributes and four-slot transaction patterns are not rejected there. Overlay evaluation explicitly rejects both. The documentation also describes dynamic-definition journal fallback, so its broad restriction paragraph needs this scope qualification.
5. **Derivation.make is not query preflight.** It is exported directly and does not call the shared query validator. A constructor result does not prove that its query can execute: shared validation occurs later when evaluate calls Triples.queryAll.
6. **Optional projection is an unresolved completeness obligation for any future selected provenance contract.** It is not constructor-banned. The ordinary evaluator hydrates optional fields, while the inspected derivation source collection and dependency extraction traverse top-level positive where patterns / where clauses, respectively. No normalization to positive where patterns was found. Treat this as a source-derived reason to exclude or explicitly specify/test optional projection, not an observed execution defect.
7. **Runtime Capabilities.none is unrelated to selecting a Datalog language subset.** The upstream capability system installs store decorators, currently including snapshots and change emission; it does not declare query-feature support or establish a per-request unsupported-language error.

## 1. Source identities and interpretation

The companion EXPLAIN-SOURCES.json records connector-returned Git blob IDs, paths, pinned URLs, and important line ranges. These are source identities only, not loaded-build authentication, a body-hash survey, or an independently rehashed archive.

Two published project documents supplied background only:

- [Broad interoperability research, pinned published copy]([PRIVATE_REFERENCE_REMOVED]).
- [Cursor/receipt addendum]([PRIVATE_REFERENCE_REMOVED]).

The statements below distinguish:

- **Upstream requirement:** an advertised interface or guide requirement.
- **Source observation:** a directly inspected implementation path.
- **Inference / future obligation:** a hand-derived consequence or proposed condition for a future selected contract, not a runtime observation.

## 2. Execute versus explain

### Upstream interface requirement

QueryExecutorService requires execute, executePage, explain, and explainPage. The execute documentation requires shared runtime/schema and semantic preflight before backend strategy selection. Execute accepts an optional resolved temporal basis. ExecutePage additionally accepts decoded cursor values. Explain and explainPage accept only the raw query specification and are documented as not executing it.

[QueryExecutor.ts lines 113–168](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/storage/QueryExecutor.ts#L113-L168). The guide separately tells executor implementers to use exported validation helpers and preserve typed values, joins, ordering, and pagination: [custom-runtimes.md lines 216–229](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md#L216-L229).

### SQL source observations

- execute compiles, using compileWithRules when the input has rules, then calls runner.run and decodes rows. The compiler invokes assertDatalogQuery before compiling the decoded query.
- executePage compiles the wrapper using the supplied basis and cursorValues, calls the runner for the main SQL, optionally executes count SQL, and decodes results. It does not create an opaque cursor itself.
- explain compiles with metrics and calls buildQueryPlan. It never calls runner.run.
- explainPage invokes compileWrapped with no basis or cursorValues, then returns main SQL and optional count SQL.
- buildQueryPlan produces ordinary statements and parameter arrays. It does not prepend SQL EXPLAIN or call any optimizer API.
- Main/count are logical statement steps, not a certificate of equivalent execution. Count excludes the cursor keyset condition and counts all filtered inner results.

Sources: [SqlQueryExecutor.ts lines 166–213, 250–331, 334–367](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L166-L213); [compiler.ts lines 1292–1307 and 1804–1815](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L1292-L1307); [wrapper.ts lines 318–337, 378–431](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/wrapper.ts#L318-L337).

### KV source observations

The KV implementation is the Triples service itself, rather than a separate QueryExecutor layer:

- queryAll resolves the basis then invokes executeQuery. executeQuery validates before clause evaluation.
- explain validates and returns backend kv-store, one main step containing JSON.stringify of the decoded query, and counters.
- explainPage validates and returns one JSON main step, even when includeCount is requested. There is no separately enumerated count step.
- KV metrics are syntactic counters and zero-valued SQL/compilation fields, not actual index operations or cardinality estimates.

Sources: [KvTriplesLive.ts lines 824–846, 911–930](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/layers/KvTriplesLive.ts#L824-L846), [metrics lines 231–251](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/layers/KvTriplesLive.ts#L231-L251), [KV evaluator lines 705–749](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L705-L749).

### Consequence and terminology

A Triplex queryPlan is specified as an opaque native representation of statements/operations that would execute. It is not required to be a physical operator tree: [schema.ts lines 720–766](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L720-L766).

It is safest to call it **compiler/statement explanation**. Calling it a complete semantic proof, evidence trace, or actual database physical plan would exceed the inspected interface and implementations. A product-side planner route/reason/proof field can be useful diagnostics, but field names alone do not implement this QueryExecutor boundary or Derivation's fact-source meaning.

## 3. Paged explain and cursor rules

### Public execution boundary

Both SQL-backed TriplesLive.queryPage and KV queryPage follow this order:

1. validateWrappedQuery.
2. Obtain runtime current time and current committed position.
3. preparePagination with query, optional caller basis, current time/position, and database scope.
4. Execute prepared.query with prepared.basis and decoded prepared.cursorValues.
5. finishPagination to remove lookahead and emit the opaque continuation.

[TriplesLive.ts lines 642–672](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L642-L672), [KvTriplesLive.ts lines 855–908](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/layers/KvTriplesLive.ts#L855-L908).

preparePagination checks, in source order:

- Current position is a nonnegative safe integer.
- Page size is a safe integer in 1…1000, defaulting to 100.
- Ordering normalization uses every projected variable as a final deterministic tie-breaker; an inner logical limit/offset receives a complete stable inner order.
- The raw cursor, if present, decodes as base64url JSON with required envelope fields.
- Envelope version is 1, followed by finite/nonnegative times, a nonnegative safe position, and finite numeric key values.
- Explicit caller recordedAt/validAt, when supplied, match the cursor basis.
- Scope fingerprint matches.
- Normalized query fingerprint matches, including page size and the pinned basis.
- Cursor key length equals the complete normalized ordering length.
- The executor receives pageSize + 1 rows of lookahead.

[Pagination.ts lines 98–143, 148–298](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts#L98-L298). Finish creates a next cursor only when lookahead exists: [lines 300–327](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/Pagination.ts#L300-L327).

### Explain does not enter that boundary

WrappedQuery schema requires cursor to be a string, but does not decode it. Its positive-integer limit schema does not itself impose the public maximum of 1000. assertWrappedQuery validates shape, inner semantics, and wrapper column/filter/order references only.

[schema.ts lines 503–517](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L503-L517); [validation.ts lines 355–403](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L355-L403).

Therefore, as source-derived consequences:

- A malformed, cross-query, cross-scope, or wrong-basis opaque cursor can remain merely a string during explainPage.
- SQL raw explainPage does not insert a cursor keyset condition, since compileWrapped reads options.cursorValues rather than query.cursor.
- KV explainPage includes the raw cursor text inside its JSON serialization, but does not interpret it.
- A raw limit of 1001 is schema-valid for explainPage but invalid as a public queryPage page size.
- Omitted raw limit can produce unbounded SQL explanation even though public queryPage defaults to 100 plus lookahead.
- Raw explainPage does not add public deterministic tie-breakers.
- Explain success certifies none of the envelope checks above. It also does not certify scope, access authorization, storage availability, or actual result membership.

The public explainPage type excludes PaginationCursorError; queryPage includes it: [Triples.ts lines 279–297](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/Triples.ts#L279-L297).

### Temporal explanation difference

Explain methods have no basis argument and their SQL compilers receive no CompileOptions.basis. applyTemporalBasis returns SQL unchanged when basis is absent; execution supplies resolved temporal predicates. Explain therefore does not pin the historical time/commit cut of an eventual public execution.

[compiler.ts lines 164–188](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/compiler.ts#L164-L188); [TriplesLive.ts lines 636–640](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L636-L640). This is an intentional API-boundary observation, not evidence that execution omits temporal guards.

## 4. Validation, capabilities, and errors

### Shared preflight order

assertDatalogQuery decodes the runtime schema first, then validates semantics. Within semantic validation the inspected order is:

1. Rule definition restrictions.
2. Discover top-level positive pattern/rule bindings, reject undefined rule applications, and require a positive relation.
3. Validate predicates, local negation predicates, and OR alternatives.
4. Validate aggregate sources/targets.
5. Validate optional projection row/target bindings.
6. Validate projected find variables and duplicates.
7. Validate having.
8. Validate orderBy projected bindings.

Positive bindings are gathered before predicates are checked, so textual predicate placement is not itself binding order.

[validation.ts lines 37–47, 138–204, 207–336](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L207-L336).

Malformed shapes and semantic invalidity use DatalogValidationError. Unbound variables use UnboundVariableError. Public queryPage does this preflight before cursor preparation, so invalid query semantics can take precedence over a malformed cursor. Within preparation, basis mismatch precedes scope mismatch, which precedes query mismatch, which precedes complete-key-length checking. A storage failure while obtaining currentPosition can occur before any envelope decoding.

### SQL error translation

compilationFailure preserves DatalogValidationError and UnboundVariableError and wraps other compilation exceptions as ReadError. Statement execution failures become ReadError. Public SQL-backed Triples.explain/explainPage preserve those two validation types and map other executor errors to DatalogError. Thus the low-level executor error surface and the public explain surface are not identical.

[SqlQueryExecutor.ts lines 39–43, 198–224, 334–367](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/sql/src/SqlQueryExecutor.ts#L39-L43); [TriplesLive.ts lines 679–696](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/TriplesLive.ts#L679-L696).

Caveat for future runtime-shape controls: SQL execute/explain read q.rules before the compiler's schema assertion, inside their catch. A null/undefined runtime q can therefore take that non-validation exception path. KV queryAll also reads q.rules before executeQuery's validator. These are unexecuted source-level edges, not evidence of failures for well-shaped DatalogQuery inputs or a blanket public preflight defect.

### Capabilities are a different layer

Capabilities.of/none/default builds StoreCapability decorators. Defaults are entitySnapshots and changeEmission; custom permits decorators. Dependencies and duplicate names are checked at runtime construction/composition, not as a query-language support declaration.

[Capabilities.ts lines 71–99](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Capabilities.ts#L71-L99); [StoreCapability.ts lines 30–78, 98–111](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/store/StoreCapability.ts#L30-L78); [Runtime.ts lines 84–101](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/runtime/Runtime.ts#L84-L101).

**Future contract obligation, not an existing upstream error type:** if a prototype selects a subset, separately document its feature support and unsupported-feature behavior. Preserve shared schema/semantic preflight before selecting a backend or unsupported route. An invalid query should not be made to appear valid-but-unsupported merely because it mentions a feature outside the selected subset. Partial support remains partial support, not complete upstream QueryExecutor compatibility.

## 5. Query language versus exact derivation provenance

### Query restrictions already present

The ordinary query language accepts structural patterns, numeric predicates, conjunctive negation, OR existence alternatives, aggregation, optional projection, ordering, logical limit/offset, and narrowly structured binary rules. This does not imply general Datalog, arbitrary recursion, or interval-valued temporal operators.

Important upstream restrictions include:

- Identity positions accept string literals or variables, not numbers or typed ref objects.
- Negation inner clauses are patterns/predicates, not nested not/or/rule calls.
- OR alternatives do not establish outward bindings.
- Rules require a nonrecursive base; cross-rule composition is rejected.
- Rule-body patterns cannot bind transaction IDs.
- A recursive body must be exactly one pattern followed by a same-name call sharing the intermediate variable.
- Ordered predicate operands must come from value bindings, with numeric constants.
- Unbound/duplicate/shadowing projections and invalid aggregate/having bindings fail preflight.

[Schema identity/negation lines 87–171](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/schema.ts#L87-L171), [validation rule restrictions lines 138–204](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L138-L204), [OR semantics guide lines 119–144](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/datalog.md#L119-L144).

### Derivation constructor and evaluation

Derivation.make directly exports the constructor through the public derivation entry point. It is not a Triples method, and no Triples wrapper performs validation before it.

[package exports lines 60–64](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/package.json#L60-L64), [derivation/index.ts lines 1–3](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/index.ts#L1-L3).

make checks name, variable-shaped identity/output, identity inclusion in public output, and its narrower construct list. It does not invoke assertDatalogQuery. Empty aggregate/rules arrays are not bans; nonempty arrays are. Any defined logical limit/offset is banned. The where list must contain only pattern/predicate/not clauses.

[Derivation.ts lines 76–127](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/Derivation.ts#L76-L127).

evaluate gathers all variables in top-level positive patterns, augments find with them, and invokes Triples.queryAll at the supplied basis. That is where ordinary full-store validation occurs. It gathers matching visible triples for those positive patterns, resolves their assertion transaction positions where available, merges sources from rows with the same stable candidate identity, and errors if one identity yields conflicting public results. It does not call QueryExecutor.explain.

[Derivation.ts lines 170–205, 287–338, 405–485](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/Derivation.ts#L405-L485).

A custom Reader can supply its own queryAll, so its validation guarantee is also part of that reader's contract, not enforced anew inside evaluate.

### Narrow documentation/source mismatch

The docs advertise exact provenance for patterns, predicates, and negation, and list rules, disjunction, aggregation, pagination, dynamic attributes, and transaction binding as restricted when completeness cannot be supplied: [derivations.md lines 40–61](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/derivations.md#L40-L61).

The source supports a more specific statement:

- Rules, disjunction, aggregation, limit, and offset have explicit constructor rejection.
- Valid dynamic attribute patterns and four-slot transaction patterns pass those constructor checks.
- evaluate has no extra ban for either. Its source matcher explicitly checks clause[3]; its temporal boundary path explicitly falls back to journal handling for dynamic definitions.
- Overlay.evaluateOverlay first rejects dynamic attributes, then transaction-binding patterns, including those nested inside negation.
- The derivation test itself constructs a dynamic definition successfully, then expects overlay rejection. It does not establish ordinary dynamic evaluation success.
- The docs themselves describe dynamic definitions using journal fallback, reinforcing that a global unconditional dynamic-definition ban is too broad.

[Derivation.ts lines 197–205, 232–285](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/Derivation.ts#L232-L285), [Overlay.ts lines 50–55, 103–119](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/Overlay.ts#L103-L119), [Derivation.e2e.test.ts lines 382–395](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/test/derivation/Derivation.e2e.test.ts#L382-L395), [derivations.md lines 126–129](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/derivations.md#L126-L129).

**Conclusion:** this is a scope/qualification mismatch to clarify, not proof that every constructor-accepted input is publicly executable or that ordinary evaluation has a measured defect. A malformed or semantically unbound query can be accepted by make's own checks yet fail at later queryAll preflight.

### What candidate provenance proves and omits

Candidate IDs bind the definition name and declared identity. Revisions bind definition ID, configuration snapshot, public result, and sorted source records. The candidate retains basis separately. Sources contain positive supporting fact IDs and assertion metadata; negated absence has no positive fact witness. The complete query is content-bound by definition ID, so absence conditions can be understood from that definition, but there is no independent full proof tree or why-not trace in Candidate.

[Derivation.ts lines 129–168, 346–402](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/Derivation.ts#L346-L402), [docs lines 58–61](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/derivations.md#L58-L61).

The evaluation-level nextTemporalBoundary considers fixed dependency attributes, including currently suppressing evidence and empty candidate sets; it can cause conservative extra wakeups. Candidate-level nextTemporalBoundary comes from its positive sources' future validTo values. Neither delivers timers or specifies workflow actions.

### Optional projection obligation

The inspected path is:

1. Datalog schema and validation preserve optionalProjection as its own field; validation does not rewrite it into where.
2. make neither rejects it nor separately records its fields as dependencies.
3. evaluate augments the existing query's find and passes it through, preserving optionalProjection.
4. KV executeQuery calls hydrateOptionalProjection after initial projection. Hydration reads entity datoms and fills the requested optional attributes.
5. Derivation sourcesForRow receives only top-level positive patterns.
6. extractDependencies processes where (and recursively rule bodies); it does not process optionalProjection.
7. Materialization uses the already discovered definition dependencies for fixed-attribute source-position freshness.

[validation.ts lines 275–292, 333–336](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/datalog/validation.ts#L275-L336), [KV hydration lines 461–512, 732](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/kv/datalog/executor.ts#L461-L512), [dependency extractor lines 194–207](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/subscriptions/extract-dependencies.ts#L194-L207), [Materialization.ts lines 208–240](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/core/src/derivation/Materialization.ts#L208-L240).

No alternate normalization/where rewrite covering these reads was found in this path. The docs promise merged sources for positive graph paths but do not explicitly define optional-field provenance as included or excluded. Therefore a future contract should not silently assume optional-field completeness. Either reject this construct for exact provenance or explicitly define and verify its source, dependency, freshness, and overlay behavior. This report does not call the inferred omission an observed runtime bug.

## 6. Ten hand-only controls for a future selected contract

All controls below are unexecuted specifications. They do not select or approve any implementation contract.

### H01. Preflight before subset rejection

Take a structurally valid query with one positive pattern, a valid OR alternative, and find containing an otherwise unbound ?missing. If OR is outside a future subset, the proposed contract should still run shared semantic preflight and report UnboundVariableError for ?missing before unsupported-feature routing. Upstream ordinary preflight does not treat OR as an outward binder. This checks a future policy decision, not a new upstream error class.

### H02. Explain is not execution or evidence

Use one pattern over :person/name and one hypothetical fact a/name/Ada. Trace SQL explain: validator -> compiler -> buildQueryPlan, no runner call and no read of the fact. The plan can be produced even if no such fact exists. A candidate source or asserted result membership cannot be inferred from that output. A true storage-level physical plan, if desired later, requires a separately specified interface.

### H03. Malformed cursor survives paged explain

Request inner find [?e], where [[?e, :p, true]], wrapper limit 1, includeCount true, cursor "not-a-cursor". Hand prediction: SQL explainPage validates the string and returns main plus count; KV returns JSON with one main step. Public queryPage reaches cursor decoding and returns PaginationCursorError(reason malformed), assuming runtime position acquisition succeeds. Pair with an unbound inner projection to confirm semantic validation then precedes cursor decoding.

### H04. Public page preparation is absent from raw explain

Use the same valid inner query with wrapper limit 1001 and no order. Hand prediction: raw explainPage schema accepts 1001 and does not add row tie-breakers; public queryPage rejects page size before decoding any cursor. With limit omitted, raw SQL explanation has no wrapper LIMIT, while public execution prepares default 100 plus one lookahead. Do not compare these raw statements as if they were identical prepared calls.

### H05. Basis-free explanation versus historical execution

Hand ledger: fact A is asserted at position 1 and retracted at position 2, with equal millisecond timestamps. A first-page cursor at position 1 must continue seeing A at its pinned cut. Raw explain/explainPage has no basis input or cursor decode and cannot certify that visibility. Require actual execution guards and complete cursor preparation separately from an explain receipt.

### H06. Query-valid OR versus provenance constructor ban

Use positive [?e, :kind, person] plus OR existence alternatives [?e, :flag, true] and [?e, :flag, false]. With find [?e], ordinary validation/explain accepts the language. Derivation.make rejects the OR where clause with DerivationDefinitionError. No fact data is needed to derive the distinct API admission rules.

### H07. Constructor success is not semantic validation

Construct a definition with name d, config c, identity [?missing], and query find [?missing], where [[?e, :p, ?v]]. The constructor's own checks admit it and can content-address it. At evaluate against a standard Triples service, augmented find still contains unbound ?missing; queryAll's shared preflight rejects it with UnboundVariableError before reading matches. Do not count the created definition as an executable accepted query.

### H08. Dynamic/transaction restrictions are overlay-specific here

Variant A: query find [?e, ?a, ?v], where [[?e, ?a, ?v]], identity those variables. Variant B: query find [?e, ?tx], where [[?e, :p, true, ?tx]], identity [?e, ?tx]. Both are shared-schema-valid and not explicitly banned by make. evaluate has matching paths rather than an explicit rejection; ordinary acceptance remains a future runtime check. Overlay rejects A for dynamic attributes and B for transaction binding, before applying any patch. This checks the documented scope qualification rather than assuming a constructor-only omission proves execution.

### H09. Optional projection completeness

Two hand facts: t1=(a, :kind, person), t2=(a, :name, Ada). Define where [[?e, :kind, person]], find [?e, ?name], optionalProjection {rowBinding:?e, fields:[{attribute::name, variable:?name}]}, identity [?e]. The inspected evaluator can obtain Ada through optional hydration, while derivation positive-pattern source collection covers t1 and dependency extraction covers :kind. No normalization adds :name. Before claiming complete explanation/freshness, decide whether this input is rejected or requires t2/:name in sources/dependencies. A later :name-only change must not be silently treated as irrelevant if optional output is in the selected semantic result contract.

### H10. Negation and temporal completeness are separate

At validAt 10, t1=(a,:kind,person) is visible; a suppressing fact t2=(a,:blocked,true) has validFrom 20. Query selects kind person and not blocked true. The candidate at 10 has t1 as positive source and no positive absence fact. The evaluation boundary should consider 20 through the fixed :blocked dependency, including if another variant currently suppresses every candidate. The host must schedule and reevaluate. A compiler plan or t1-only source list does not independently prove absence or deliver the wakeup.

## 7. Explicit nonclaims and next gate

This research does not prove that any source pathway ran successfully, identify a loaded version, authenticate a public-build corpus, establish adapter compatibility, or close recovery/concurrency/resource/lifecycle requirements. It does not alter held goals or any stopped action.

The next selected contract should separately name:

- ordinary query language and flattened value support;
- shared-validation and unsupported-feature/error precedence;
- statement explanation versus actual physical-plan diagnostics;
- public temporal-basis and opaque-cursor preparation;
- provenance language, optional-field meaning, source witnesses, and dependency/freshness coverage;
- overlay restrictions and host scheduling ownership.

Do not treat an explain success, content ID, candidate constructor success, or planner route/proof field as a substitute for those gates.

