# Item 4 temporal oracle and compatibility research

This is new item4 research, before implementation. Contributor directed the move from incomplete item3; no claim of item3 acceptance or waived trust dependency follows. No implementation, oracle, native module, database, supervisor, compiler or benchmark was executed. No stopped backup, witness, raw archive, publication staging or correction package was inspected or reproduced.

## Primary theory crosscheck

Abiteboul, Hull and Vianu define stratification with positive dependencies nondecreasing and negative dependencies strictly increasing. Their signed-graph criterion rejects any cycle containing a negative edge; completing each semipositive stratum gives a result independent of the legal stratification. This supports both a production SCC schedule and an independently constructed tiny oracle using other stratification assignments. These theorems concern ordinary relational semantics, not this project's partial-expression errors or resource budgets. [Foundations of Databases, chapter15, definition15.2.4/proposition15.2.7/theorem15.2.10](https://webdam.di.ens.fr/Alice/pdfs/Chapter-15.pdf)

Souffle's own language documentation explicitly makes positive relational occurrences the binders and says negated literals do not bind variables. This corroborates rejecting a negation-only variable rather than inventing an implicit universe or existential wildcard. Its arithmetic/type/functor features are broader than this prototype and are not adopted. [Souffle rules](https://souffle-lang.github.io/rules)

DuckDB2.0 documents snapshot isolation and explicit transaction control. The live full page and cached search snippet disagreed about implicit multi-statement batches during this read; no conclusion here relies on that ambiguity. An explicit BEGIN/COMMIT boundary is the appropriate documented primitive for the existing multi-step store API. Isolation is not a catalog-authority lease or proof that an attachment guard is complete. [DuckDB transaction management](https://duckdb.org/docs/2.0/sql/statements/transactions)

## Exact published seams inspected

The six source files in PUBLISHED-SOURCE-READBACK.json match the frozen already-published source52 tree. They were read as text, not imported. Relevant observations:

- A Datalog relation has a fixed identifier and one declared arity; the same name at a different arity is rejected, not overloaded. Atom stores a relation index. triple/3 is fixed read-only EDB0; a variable in its middle RDF-predicate position is an ordinary argument, not a dynamic Datalog relation name.
- Head and relational terms are variables or admitted typed literals, not computed expressions. Bracket comparisons occur only in bodies; arithmetic never introduces a binder or a new recursively stored value.
- Current static safety checks all rules; undefined body predicates are errors. The new design must distinguish an explicitly defined empty relation from an undeclared name, including in unreachable negative rules.
- For each complete positive relational binding, all partial scalar filters execute before head/pending dedup. False does not suppress another filter's fault. New negative checks must not hide those faults.
- The native relation already deduplicates complete tuple keys in a seen set. Grounded negative membership can reuse the same execution-local canonical dictionary and tuple identity; a second existential-projection index is not required by the selected range restriction.
- typed_store.query prepares caller fields, rechecks readiness, explicitly begins one transaction, reads the position, calls the native query, commits, then returns. NATIVE_SQL aggregates ALL retained temporal_facts without a visibility WHERE; native admission and point visibility selection occur afterward. Copying only visible rows would weaken all-retained admission.
- A new pure native function can be studied independently, but exposing it through planned/store SQL is not evidence that the stronger unresolved item3 catalog/attachment authority has been repaired. Keep that integration dependency explicit.

## Proposed oracle separation

Use a deliberately tiny finite abstract program and canonical tagged value universe. The oracle should not reuse production parser, SCC utility, relation indexes, delta scheduling, tuple hash or filter evaluator. One possible independent approach enumerates bounded legal integer stratum assignments, enumerates complete active-domain bindings, checks positive relation membership, evaluates all scalar filters using an independent checked layer, then applies exact negative membership and head-set insertion. Synchronous naive saturation within each stratum differs from production SCC-local semi-naive scheduling.

Positive binding must allow every supported tagged value present in the relation, even if a later arithmetic operation will be ill-typed. Prefiltering substitutions to arithmetic-compatible types hides required faults. Python bool/int/float equality is not a substitute for tagged identity: keys must explicitly distinguish bool, i64, f64 and str, with admitted float bits and normalized zero.

For a finite test model, cap relation/variable/domain/rule counts before enumeration and retain the actual space bound. No unconstrained full-domain or all-stratifications campaign is proposed. Valid-program rule permutations should preserve results or the required existence of a fault under generous budgets; they need not preserve work counters, and multiple unrelated fault classes do not imply an unstated universal first-error precedence. Single-fault-class fixtures should require the selected stable diagnostic code.

Logical set semantics alone does not provide the eager-fault layer. Evaluate filters even when a negative membership would reject that complete positive binding or when its projected head is already present. A derived positive helper can deliberately restrict the candidate set before a later rule performs partial arithmetic; inlining that helper is not automatically equivalent.

## Temporal point semantics and correction fixture

Every retained carrier row must finish admission/loading before rule evaluation or a returned result. Validation and visibility selection may interleave row-by-row; after successful loading, evaluate every stratum against the one visible EDB set at the fixed pair (valid_at, known_at). Do not read a newer store position between strata or reuse a lower relation from another point/query. No interval-valued complement, continuous-time coverage or cross-call cache is introduced; those exceed item4.

An original proposed history fixture uses member(p) valid[0,10), tx[1,OPEN); blocked(p) valid[3,7), tx[2,3); corrected blocked(p) valid[5,9), tx[3,OPEN). The safe answer is a bound member with no blocked membership. At (valid4,known2) p is absent from the answer; at (4,3) it is present. At (7,2) it is present because the old endpoint is exclusive; at (7,3) it is absent. Before member's transaction, no positive person exists, so the query does not enumerate an external universe. These are fixture expectations, NOT observed outputs.

Separate database transaction position from the logical known_at requested point. An explicit historical known_at remains bounded by the pinned store position. Check all int64 endpoints without floating timestamps, epsilon subtraction or clock conversion, and preserve OPEN_END's existing half-open interpretation.

## Scheduling and resource obligations

Completing a lower stratum consumes no right to hide its rows from a higher base rule. A higher component needs full completed lower inputs at least once; simply carrying current global delta_begin values forward can lose derivations. Ground negative-only rules need one empty-binding candidate after their dependencies complete, not initial fact seeding. A predicate's multiple defining rules/facts belong to the same completed relation.

Budgets need a new explicit contract for the additive path: do not reset global fact/work/dictionary totals per stratum; precharge grounded negative probes; distinguish total component-round work from maximum component depth. Count all signed body atoms toward the body cap. Finite graph caps do not establish complete allocator/cancellation accounting. Old positive APIs, IR1 exact keys and counters should remain unchanged rather than reinterpret an existing schema.

High-value adversarial cases are listed in FIXTURE-MATRIX.json. They are specifications only. Full negative-cycle safety applies even to unreachable rules or data-empty branches; a fact already proving a cyclic predicate does not make an unstratified program acceptable.

## Next decision

The reports support a smallest additive native, range-restricted, full-key stratified core, with no demand rewrite, SQL anti-pushdown, existential negative wildcard or cross-query cache. Root must still choose the exact API/IR/schema, diagnostic ordering and aggregate budget model, independently review that contract, and preserve only genuinely new permitted item4 research before implementation. All runtime/build/store/planner acceptance remains unrun or separately gated. This research is not a substitute save for item3.

## Reviewed precision

Admitted logical strings are valid UTF8 and NUL-free. NUL bytes in entity, attribute, string payload or program are negative admission controls, not accepted identity fixtures. Physical BLOB payload zero bytes are a different encoding property. The two initial research clarifications were source-checked before implementation; the original local notes remain retained, not silently relabeled as tests.
