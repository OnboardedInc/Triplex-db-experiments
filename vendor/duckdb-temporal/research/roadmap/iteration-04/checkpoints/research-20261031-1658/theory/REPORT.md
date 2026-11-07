# Item 4 — safe stratified negation: theory and bounded evaluation

Research date: 2026-10-31 UTC. Status: **source-only recommendation; not implemented, executed, benchmarked, or accepted**.

## Recommendation

Add only ground, closed-world negative relational membership tests to the existing finite, set-valued rule language. Validate the whole program; complete the predicates being negated before evaluating their absence; use one immutable valid/recorded snapshot throughout. Preserve existing exact typed identity and scalar-fault behavior. Start native-first, with completed relation sets and exact membership lookup; SQL, magic/demand rewriting, incremental maintenance across history changes, and a new value-generating language are unnecessary for this item.

Item 3 remains incomplete. This research does not settle its physical rule plan, establish a successful engine integration, or waive item 4's correctness dependencies on items 1–3.

### Current-language constraints supplied by the coordinator's narrow source inspection

These are scoped secondhand observations, not source files read or runtime behavior verified by this research worker:

- `engine/ITERATION-02.md` lines 9–20 and `engine/src/temporal_core.cpp` parse/atom/filter paths describe **body-only bracket comparisons**, with literal/variable operands, parentheses, arithmetic `+ - * /`, and unary minus. There is no assignment, function call, computed head, or computed relational argument.
- Head and filter variables must occur in positive relational body atoms, considering the whole body rather than textual comma order. Filters introduce no bindings.
- Relation identity is a fixed identifier plus arity. `triple/3` is the read-only base relation; a variable in its RDF-predicate *term position* is not a variable Datalog relation name.
- Undefined body predicates are already rejected statically. Preserve this policy for both signs. Empty defined relations are a different case.
- On each **complete positive relational binding**, the evaluator checks all scalar filters, including filters following a false result, before head deduplication. Faults remain observable. A ground filter-only rule has one empty binding; an empty positive join has none.
- The execution research worker additionally reports that `Relation.seen` is an existing `unordered_set<Tuple,TupleHash>` of arity-tagged, inline dictionary-ID tuples (arity at most 8), with separate typed-domain maps for strings, int64, f64 bits, and Boolean. This supports exact anti-membership reuse without a second relation index; it is a source observation, not a new timing or collision-bound proof.

The supplied engine target is DuckDB 2.0.0/source `d54cbbe3df17e8e5ce68312f483b4155836112aa`, using actual unstable C API v2. That provenance is coordinator-supplied, not reverified here. Nothing below implies API stabilization or production readiness.

## Primary research findings

The authors' *Foundations of Databases*, §15.2, gives positive dependencies a non-strict level inequality and negative dependencies a strict one; its graph uses **body → head** edges. Stratifiability is exactly absence of a directed cycle containing a negative edge. Its SCC construction provides a concrete validation route. [Abiteboul–Hull–Vianu, chapter 15, pp. 378–382](https://webdam.di.ens.fr/Alice/pdfs/Chapter-15.pdf)

Apt–Blair–Walker use the opposite graph orientation, **head → body**, but the same semantic restriction. They establish independence of the resulting standard model from the chosen stratification. This is why graph direction must be documented explicitly, rather than copied piecemeal from different sources. [Apt–Blair–Walker 1988, definitions 2–4, lemma 1, theorem 11](https://ir.cwi.nl/pub/10404/10404D.pdf)

Soufflé's official rules documentation treats positive relational variable occurrences as binding sources and negative literals/constraints as consumers. A variable occurring only inside an arithmetic functor is not thereby bound. [Soufflé rules](https://souffle-lang.github.io/rules)

Classical Datalog's active-domain restriction bounds the possible derived facts. Soufflé separately warns that arithmetic-generated head values change this picture and can introduce nontermination. Keeping the project's existing term-only heads and filter-only arithmetic avoids that expansion. [Foundations, chapter 12, pp. 279–285, 299–300](https://webdam.di.ens.fr/Alice/pdfs/Chapter-12.pdf), [Soufflé tutorial](https://souffle-lang.github.io/tutorial)

The evaluation literature supports delta evaluation within mutually recursive components, treating completed earlier components as fixed input. Indexed negative atoms are emptiness searches, not relation enumeration. [Foundations, chapter 13, algorithms 13.1.1–13.1.2](https://webdam.di.ens.fr/Alice/pdfs/Chapter-13.pdf), [Subotić et al. 2018, §3.1](https://psubotic.github.io/papers/p141-subotic.pdf)

Do not add magic/demand transformation to this item: a stratified input can become unstratified after such a transformation; the published remedy adds machinery beyond this bounded contract. [Tekle–Liu 2019, §§2–4](https://arxiv.org/html/1909.08246v1)

## 1. Proposed semantic contract

The following is a project proposal, not a claim that a particular parser token or implementation already exists. `not` below is mathematical notation.

1. A negative body atom is the negation of **one existing relational atom**. Its terms remain existing constants or variables. No negated conjunction, universal quantification, local existential variable, aggregate, Boolean truthiness, or general expression-negation extension is introduced.
2. Every variable in a negative atom must occur in at least one **positive relational body atom of the same rule**. Head and filter safety remain unchanged. Query arguments, a filter such as `[x = 7]`, another negative atom, and a variable in another rule do not establish safety.
3. Validate all rules and all signed dependencies before query pruning or empty-input optimizations. An invalid unused rule does not become valid because a particular query never visits it.
4. `not Q(t)` succeeds exactly when the fully substituted tuple is absent from **completed** relation `Q` for this evaluation. It never adds bindings or enumerates a universe. An empty *defined* `Q` makes the test true for each already-ground candidate. An undefined relation remains an error, not an empty relation and not a third truth value.
5. Relation results have set semantics. Negative membership uses the exact accepted tuple identity from items 1–2, not a new numeric equality, implicit cast, SQL collation, or host-language comparison.
6. Preserve the scalar seam: obtain a complete positive binding, evaluate **all existing scalar filters** with existing fault rules, and only then apply negative membership to candidates whose filters are all true. Do not prune a binding by negation before its scalar fault can be observed. Only surviving candidates reach projection/deduplication.
7. Negative relations are fixed for the entire positive fixed-point computation that consumes them. Never interpret temporary absence from the current recursive frontier as completed absence.
8. Freeze the existing temporal snapshot result, program, and relevant configuration for the evaluation. No per-stratum reread of newer data and no mixed valid/recorded coordinates.
9. Exhausted resource limits or scalar faults return failure, not a successful partial fixed point. Successful result equivalence is conditional on sufficient resources and the inherited supported-FP/trusted-callee premise.

**Why the filter order is substantive:** suppose a positive candidate exists, a negative atom would reject it, and a bracket filter divides by zero. An early anti-join would hide a fault that the current complete-positive-binding seam exposes. Logical conjunction equivalence alone cannot justify that change. The smallest compatible contract evaluates the faulting filter first. Multiple simultaneous faults and exact runtime-fault priority must retain or explicitly refine the existing contract; this report does not invent a new priority rule.

## 2. Signed dependency graph, validation, and schedule

Use the following direction consistently: for each rule with head relation `H` and body relation `B`, add **`B → H`**. Label a positive occurrence with weight 0 and a negative occurrence with weight 1. Retain both signs if both occur; do not let an unsigned deduplication erase the negative constraint.

The required inequalities are:

- Positive atom: `level(H) >= level(B)`.
- Negative atom: `level(H) >= level(B) + 1`.

Base `triple/3` is complete before rule evaluation. All rules defining the same identifier/arity relation belong to the same semantic component/level. Neither an individual rule nor a particular ground RDF predicate string is the Datalog dependency unit.

### Validator and planner specification

1. Collect all relation definitions and validate existing arity, term, type, and undefined-relation rules. Construct the complete signed graph from the validated whole program.
2. Compute SCCs of the graph **with both edge signs present**.
3. Reject iff any negative edge has both endpoints in one SCC. This includes a negative self-loop and a mixed cycle with only one negative edge; even numbers of negative edges are still rejected.
4. Condense SCCs into a DAG. Every accepted SCC has only positive internal dependencies.
5. Evaluate SCCs in a topological order of this **body → head** DAG; fully finish an SCC before exposing it as completed input to a consuming SCC. A deterministic relation-signature tie-break is useful but is not the semantic definition.
6. Numeric strata need not be minimal. Distinct topological component ranks are a valid simple stratification. If minimal numeric levels are desired, take the maximum predecessor level plus edge weight on the DAG. Positive dependencies can then share a numeric level; do not mistake that sharing for permission to skip their completion/fixed-point requirements.

**Correctness argument.** Along a directed path, inequalities compose. A cycle with a negative edge would require a relation's level to exceed itself, impossible. Conversely, after excluding negative edges internal to SCCs, the condensed graph is acyclic, so predecessor-first ranks satisfy every positive and negative inequality. An internal negative edge lies on a cycle because its endpoints are mutually reachable. Therefore the SCC rejection condition is both necessary and sufficient, not merely a heuristic.

SCC construction can be linear in graph vertices plus edges using a standard linear-time algorithm; Tarjan's original bound is linear time and space. Canonical sorting for reproducible diagnostics is additional work and must be included in resource accounting. Avoid an unbounded host call stack for adversarially deep program graphs. [Tarjan 1972](https://epubs.siam.org/doi/10.1137/0201010)

## 3. Safety independent of body order

For a rule `r`, let `Bind(r)` be the set of its variable names occurring directly as terms in positive relational body atoms. Accept only if `HeadVars(r)`, `FilterVars(r)`, and `NegativeVars(r)` are each subsets of `Bind(r)`. Compute these sets over the whole rule; do not update them by walking commas left-to-right.

Consequences for this existing grammar:

- `out(x) <- not denied(x), person(x)` is as safe as the reverse order.
- `out(x) <- [x = 7], not denied(x)` is unsafe: equality is a comparison, not assignment.
- `out(x) <- person(x), not pair(x,y)` is unsafe even if `y` is absent from the head.
- `out(x) <- person(x), not pair(x,x)` is safe: one binding supplies both positions.
- A ground head with only ground negative/filter atoms has one empty binding, if admitted by the final grammar. It does not enumerate the active domain.
- Reject a negative wildcard or anonymous local variable unless the existing grammar already supplies an explicit compatible, separately specified meaning. The smallest item4 design need not add one.

The DATALOG-TEXT specification provides useful precedent for distinct negative-variable and arithmetic-variable diagnostic classes, but it is a separate language specification, not a universal Datalog standard or a requirement to adopt its grammar. [DATALOG-TEXT literals and errors](https://datalog-specs.info/vnd_datalog_text/grammar_literals.html)

### The intended assignment example without existential negation

Define a unary helper positively:

`has_active_assignment(p) <- assignment(p, job)`

then:

`unassigned(p) <- person(p), not has_active_assignment(p)`

`person` and `assignment` here are illustrative defined views over the one frozen `triple/3` base snapshot, not newly authorized EDB declarations. This answers “no assignment in this snapshot.” It does not claim the real world contains no unrecorded assignment. By contrast, binding both `p` and `job` positively and negating `assignment(p,job)` enumerates missing *pairs*, not people with no assignment.

## 4. Finite fixed-point argument

Let `A` contain the finite stored typed values from the chosen snapshot and the finite literal values from the program, with exactly the existing binding/identity interpretation. Since heads and relational arguments contain only constants or already-bound variables, every derived term remains in `A`. Bracket arithmetic can compute temporaries, but cannot insert its results as fresh head values. It therefore does not expand the fact domain.

For relation `R` of arity `a(R)`, there are at most `|A|^a(R)` possible ground tuples, or the smaller product of compatible typed position domains. For an SCC `C`, let `N(C)` be the sum of those bounds for its IDB relations. With lower input fixed, adding current-SCC facts can only add positive body bindings; successful fixed scalar tests and negative membership are fixed predicates on those bindings. Thus the rule consequence operator is monotone on a finite lattice. Starting from its seeds and accumulating only new facts reaches a fixed point after at most `N(C)` strict fact additions. Each changing synchronous round adds at least one fact.

This is a termination proof for successful, fair, unbounded-resource semantics—not a promise that the bound is practical. Set semantics, complete saturation, and no fresh-value heads are essential. A finite machine integer type is not a useful substitute for an active-domain bound; strings also make “all machine values are finite” an unsuitable argument.

Scalar faults require a separate operational layer. A pure truth-only oracle that first removes negative matches can miss faults on otherwise discarded positive bindings. Test successful fixed-point equivalence and inherited fault behavior separately. If arbitrary functions, computed heads, assignment binders, or recursive constructors are ever proposed, the above proof must be redone rather than asserted by analogy.

## 5. Native-first evaluation and bounded performance options

### Baseline: positive join → eager filters → exact negative lookup

Keep one immutable completed set for each lower relation used negatively. After the existing complete-positive-candidate filter barrier, check each negative tuple for exact membership and discard a matching candidate. No complement relation is materialized. A defined empty negative relation has a constant truth result after required scalar evaluation; an empty positive join still yields no candidate and no scalar evaluation.

The current-source refinement is smaller than building a new index: reuse `Relation.seen` after its relation is complete, within the **same existing typed dictionary for the entire evaluation**. Do not rebuild independent per-stratum dictionaries or convert IDs through display text. Bound variables and parsed constants already supply dictionary IDs, so a full-ground anti-probe need not rehash underlying variable-sized string bytes; initial interning and shared dictionary storage still need their existing accounting. This directly supports a bounded first implementation without unfinished SQL routing or private engine authority.

If an alternative relation representation is later considered, an exact sorted relation can support deterministic binary-search membership. Hash lookup needs its equality/hash and collision/resource assumptions stated. The supplied existing hash-index observation does not establish unconditional constant-time lookup on adversarial inputs. No second per-relation build is needed merely to add negation.

Let `M` be the number of complete positive candidates that pass scalar filters, `k` their negative atoms, and `n_j` the size of negative relation `j`. Full scans cost up to the sum of `M * n_j` tuple comparisons plus `O(M*k)` probe/control work. A suitable ordered membership index gives `O(sum_j M * (1 + log(n_j + 1)))` key/probe work, plus construction cost; the constant term includes empty-relation decisions. Hash membership offers expected rather than unconditional constant probe cost. Include variable-sized key bytes in costs; do not treat a whole string/STRUCT key as a free machine word.

These are analytic choices, **not measured speedups**. For all-ground negative atoms, one full-key relation index is enough; a general minimum-index optimizer is not required. Subotić et al. formulate primitive-search/index-cover optimization for a broader Datalog workload, including negative emptiness tests; that provides evidence for indexing, not a mandate to implement that whole optimizer here. [Subotić et al. 2018, §§3–4](https://psubotic.github.io/papers/p141-subotic.pdf)

### Positive semi-naive evaluation within an accepted SCC

Lower relations, including every negated relation, stay fixed. Maintain accumulated current-SCC facts and a delta of genuinely new facts. A newly enabled recursive rule binding must use at least one current-SCC positive fact from the prior delta; negative atoms never generate deltas. Nonrecursive seed rules must still be evaluated. For nonlinear bodies with several recursive occurrences, cover **every possible delta position**, not just the first recursive atom; deduplicate the generated head against accumulated facts. A disjoint expansion can reduce duplicate work, but a simpler overlapping union with correct deduplication is easier to establish initially. This is an adaptation of the standard semi-naive argument, with immutable lower negation as an additional filter. [Foundations, chapter 13, pp. 313–316](https://webdam.di.ens.fr/Alice/pdfs/Chapter-13.pdf)

Do not retrofit this optimization blindly if existing budget counters or scalar-fault priority make repeated candidate evaluation observable. Preserve successful results and fault presence first; reconcile counter definitions and exact priority explicitly. A simple correct native saturation loop with indexed anti-tests is a defensible earlier checkpoint than an unproved delta rewrite.

### Optimizations that are not automatically valid

- Anti-pushdown before the eager scalar barrier can suppress required faults.
- Pushing an endpoint exclusion into a recursive traversal changes the query: with seed `a`, edges `a→b→c`, and blocked `b`, “reachable then not blocked” retains `c`; “traverse only unblocked nodes” loses it.
- Demand/magic rewriting can introduce negative cycles, as the primary research above demonstrates.
- SQL `NOT IN`, nullable comparisons, combination casting, and SQL floating equality are not proofs of exact tuple nonmembership. DuckDB's docs distinguish anti-join NULL handling, permit mixed-type comparison casts, and make NaN compare equal to NaN. None guarantees equality of the project's exact binary keys. [DuckDB 2.0 joins](https://duckdb.org/docs/2.0/sql/query_syntax/from), [comparisons](https://duckdb.org/docs/2.0/sql/expressions/comparison_operators), [numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric)

PostgreSQL's official expression rules illustrate why declarative SQL predicates do not generally promise left-to-right or eager evaluation. This is a comparative warning, **not evidence about DuckDB's exact current optimizer**; any future SQL path needs its own source and runtime proof. [PostgreSQL 18, §4.2.14](https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-EXPRESS-EVAL)

## 6. Temporal consistency and corrections

The temporal literature separates valid-time truth from when information is recorded, and defines independent timeslice operators. [Consensus glossary, February 1998, §§3.1–3.2, 3.8, 3.21–3.22](https://www2.cs.arizona.edu/~rts/pubs/LNCS1399.pdf)

For this project, treat `S(valid, recorded)` as the **already accepted** snapshot selector. Do not introduce a different interval endpoint, timestamp conversion, duplicate resolution, or correction algorithm in the negation feature. Materialize or otherwise pin `S` once; all positive and negative EDB views and all derived strata consume that same `S`. The query's recorded coordinate is not automatically the database transaction identifier or wall-clock “now.”

Example at logical ticks: at recorded tick 20 an assignment is learned to have been valid since tick 10. At `(valid=15, recorded=15)`, no assignment is visible, so the person can be unassigned; at `(15,25)`, the assignment is visible, so they are not. At recorded tick 30 a correction changes its valid end to 12; at `(15,35)`, unassigned can become true again. Earlier recorded snapshots must retain their prior answers. These are expected logical snapshot states, not a proposed mutation/storage representation.

A later base change can retract higher-stratum results: negation is nonmonotone across changed input snapshots. Recompute from the new frozen snapshot for item4; do not reuse positive-only monotone incremental assumptions. No cross-snapshot cache is required. If one is later added, `(valid, recorded)` alone is insufficient when the underlying history/program changes.

DuckDB's 2.0 transaction documentation describes snapshot isolation and repeatable reads. Its retrieved page body says semicolon-separated batches are auto-committed statement-by-statement unless explicitly wrapped; a search snippet disagreed, illustrating why snippets are not an exact engine contract. Use the existing accepted snapshot path; do not infer one consistent read across several statements merely from batching. Actual behavior at the supplied source commit remains an integration verification obligation. [DuckDB 2.0 transactions](https://duckdb.org/docs/2.0/sql/statements/transactions)

## 7. Diagnostics and resource boundaries

Proposed **semantic diagnostic classes**, not mandatory replacement spellings for existing errors:

| Class | Condition | Stable useful context |
|---|---|---|
| Existing syntax/arity/term/type error | Existing language restriction violated | Source span, identifier/arity, relevant term |
| Undefined relation | Positive or negative body relation has no permitted definition | Identifier/arity and atom sign |
| Unsafe head variable | Head variable absent from positive body binders | Rule signature and variable |
| Unsafe filter variable | Filter dependency absent from positive body binders | Filter span and variable |
| **Unsafe negative variable** | Negative variable absent from positive body binders | Negative atom, variable, rule |
| **Negative dependency cycle** | A negative edge is internal to an SCC | Involved relation signatures and signed edge; optional deterministic cycle path |
| Unsupported negative form | Negated expression/conjunction/wildcard outside chosen grammar | Offending construct and source span |
| Existing scalar failure | Current eager filter evaluation faults | Preserve existing code and priority contract |
| Resource limit | Parse/graph/snapshot/join/probe/fact/byte/round/output budget exhausted | Phase, counter name, limit; never partial-success status |
| Internal plan/snapshot invariant | A negative target is not completed, snapshot IDs disagree, or a supposedly bound term is missing | Fail closed; no fallback to “absent” |

Do not report a negative cycle for a mere positive recursive SCC. Do not permit negative cycles because the data is empty, a filter is always false, the cycle is unreachable, or grounding might admit a different semantics. Those are outside predicate-stratified acceptance.

Validation order and error selection should be documented. A repeated identical invalid program must have stable diagnostic codes/context. Under rule/body permutation, compare semantic signatures rather than byte offsets, which necessarily move. If several independent static errors coexist, either return a canonically sorted list or specify deterministic precedence. Do not promise runtime multiple-fault or resource-threshold permutation invariance without proving the existing evaluator supplies it.

Account for graph nodes/edges, snapshot rows/bytes, positive candidate work, eager filter work, negative probes and compared/hashed IDs or bytes, unique facts and attempted duplicates, existing shared dictionary/index storage, any additional index build, current/delta/next storage, output materialization, and checked counter arithmetic. **Aggregate budgets span the entire evaluation, not a freshly reset allowance per stratum.** Limits should be charged before the corresponding allocation/operation. Exact new round/probe charging and compatibility with existing query-API counters remain contract gates. Changing indexes changes physical work; semantic result equivalence under adequate limits does not imply identical near-limit outcomes or counters.

## 8. Independent oracle and acceptance proof obligations

Use a deliberately different, tiny reference evaluator:

1. Independently construct test program descriptions/variable sets. Do not reuse the production signed graph builder, binder bitmask, scheduler, anti-index, or tuple-key helper.
2. For small programs with `n` predicates, enumerate level assignments in `0..n-1` and retain those satisfying all signed inequalities. No assignment means nonstratified. This expensive bounded method checks the production SCC result independently; a valid condensed graph needs at most `n` levels.
3. Enumerate substitutions over tiny finite sets of supported **tagged values**, applying only the existing relational/static sort restrictions. Do not prefilter a relational binding merely because arithmetic on its value would fault: a heterogeneous `triple/3` object can supply such a binding, and the inherited scalar type error must remain visible. Validate safety independently before evaluation; substitutions do not make an unsafe program acceptable.
4. For each stratum, use synchronous naive accumulation until the complete relation sets stop changing. Use straightforward exact tuple comparison and fixed completed lower inputs, not delta/index plans.
5. Add an explicit eager-filter layer on every complete positive binding, even when a subsequent negative test fails. For error-free runs, compare complete output relation sets. For intentional fault fixtures, compare the inherited error class/presence separately.
6. Feed both implementations independently expected snapshot sets for temporal cases. Also include end-to-end history fixtures through the accepted snapshot implementation; neither approach alone proves both snapshot selection and negation.
7. Permute rule order and positive/negative body atom order, add harmless duplicate facts/rules, and exercise empty relations. Use sufficient limits for semantic comparisons; test budget failures in their own suite.

Required proofs are: complete signed graph; safe grounding; exact tuple identity; negative-target completion; monotone finite current-SCC operator; complete fixed point; delta coverage if optimized; filter-fault preservation; frozen temporal input; deterministic static diagnostics; atomic failure on limits. `FIXTURE-OBLIGATIONS.md` makes these concrete.

## 9. What remains before implementation or acceptance

- Coordinator approval/settlement of the physical rule plan dependency from item3; native-first research is not acceptance of that plan.
- Source review of the chosen negation token/AST/sign representation and parser compatibility, including ordinary relation names such as `eq`, `add`, and `div` remaining ordinary relations.
- Exact preservation of existing relation-definition resolution and existing scalar error behavior, including filter-only and empty-positive-join cases.
- Agreement on any ground-negative-only form and anonymous-variable policy; no silent scope expansion.
- Source review of completion markers, immutable snapshot ownership, and type/bit-exact membership/index keys; no dependency on an unfinished private engine probe.
- A concrete budget contract and stable diagnostic policy; evaluate nonlinear recursion and all filter-fault cases before optimizer claims.
- Implementation and independent-oracle/anti-join/history/reordering acceptance checks, none of which were run by this worker.

The existing exact hash index makes reuse the smallest source-supported anti-membership proposal. No measurement here establishes its performance or justifies a new ordered index, and semi-naive versus the existing native loop remains a hypothesis to measure after the smallest semantic implementation is correct and authorized.
