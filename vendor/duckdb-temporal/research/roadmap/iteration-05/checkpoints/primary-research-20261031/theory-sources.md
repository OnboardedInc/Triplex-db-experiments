# Bibliography and evidence register

Revision 001 • Sources inspected on 2026-10-31 UTC

Primary papers, author/institution-hosted preprints, and official system documentation only. Search-engine summaries from third-party aggregators were not used as evidence. This is a bibliography of semantics research, not a computer inventory.

## A. Research papers and language specification

### P1 — Multisets, grouping, and conservative aggregate stratification

Inderpal Singh Mumick, Hamid Pirahesh, and Raghu Ramakrishnan. **The Magic of Duplicates and Aggregates.** VLDB 1990, pp. 264–277.

- Primary PDF: [VLDB proceedings](https://www.vldb.org/conf/1990/P264.PDF).
- Inspected: full text accessible; focused on §§3.1–3.3, especially definition of group-by, grouping dependencies, and footnote on empty zero-key grouping versus SQL.
- Used for: explicit aggregate dependency and empty-group comparison.
- Not imported: proof-multiplicity multiset semantics, broader recursion classes, or an optimizer correctness claim for this project.

### P2 — Aggregate-stratified semantics

Nikolay Pelov, Marc Denecker, and Maurice Bruynooghe. **Well-founded and Stable Semantics of Logic Programs with Aggregates.** Author preprint arXiv:cs/0509024; revised 2006. Journal version: Theory and Practice of Logic Programming 7(3), 2007, pp. 301–353, DOI 10.1017/S1471068406002973.

- Primary preprint: [arXiv PDF](https://arxiv.org/pdf/cs/0509024).
- Publication record: [arXiv abstract/history](https://arxiv.org/abs/cs/0509024).
- Inspected: full text accessible; focused on §5.2 and its standard-model construction.
- Used for: strict aggregate/negative versus non-strict positive dependencies.
- Not imported: arbitrary recursive-aggregate or three-valued execution.

### P3 — Broader monotonic aggregate theory, limited access

Kenneth A. Ross and Yehoshua Sagiv. **Monotonic Aggregation in Deductive Databases.** Journal of Computer and System Sciences 54(1), 1997, pp. 79–97, DOI 10.1006/jcss.1997.1453. Related conference paper: PODS 1992, pp. 114–126, DOI 10.1145/137097.137852.

- Primary publisher record/abstract: [JCSS article](https://www.sciencedirect.com/science/article/pii/S0022000097914537).
- Access limitation: the publisher abstract was retrieved through search; opening the full page returned an external HTTP 403. An author-hosted PostScript reference was unsupported by the reader. No full-text theorem is relied upon and the inaccessible content was not retried through an alternative route.
- Used only for: the existence of complete-lattice monotonic/pseudo-monotonic approaches outside the conservative initial fragment.

### P4 — Contributor tuples under set semantics

Abhijeet Mohapatra and Michael Genesereth. **Aggregation in Datalog Under Set Semantics.** Stanford Logic Group Technical Report LG-2012-01, 2012.

- Author-hosted primary PDF: [Stanford](https://web.stanford.edu/~abhijeet/papers/aggregates.pdf).
- Author's publication listing confirms report identification: [Genesereth papers](https://logic.stanford.edu/people/genesereth/papers.html).
- Inspected: full text accessible; focused on §2, Examples 2–3.
- Used for: distinction between measure and tuple discriminator.
- Not imported: first-class sets, set construction operators, or its expressiveness claims as properties of this prototype.

### P5 — Optimization with stratified aggregates

S. Sudarshan and Raghu Ramakrishnan. **Aggregation and Relevance in Deductive Databases.** VLDB 1991, pp. 501–511.

- Primary PDF: [VLDB proceedings](https://www.vldb.org/conf/1991/P501.PDF).
- Inspected: full text accessible; focused on §2's stratification premise and discussion of relevance.
- Used for: optimization-premise caution, not a selected plan transformation.

### P6 — Incremental aggregate costs under stated update/arithmetic premises

Raghu Ramakrishnan, Kenneth A. Ross, Divesh Srivastava, and S. Sudarshan. **Efficient Incremental Evaluation of Queries with Aggregation.** ILPS 1994, pp. 204–218.

- Author-hosted primary PDF: [Sudarshan publication copy](https://www.cse.iitb.ac.in/~sudarsha/Pubs-dir/aggregate-eval-jicslp94.pdf).
- Inspected: full text accessible; focused on §2's update model, complexity assumptions, and structural aggregation.
- Used for: separating insert/delete/replacement maintenance and recognizing algebraic assumptions.
- Not imported: constant-cost arithmetic or empirical performance for this project.

### P7 — Explicit aggregate tuple and variable-scope semantics

Francesco Calimeri, Wolfgang Faber, Martin Gebser, Giovambattista Ianni, Roland Kaminski, Thomas Krennwallner, Nicola Leone, Marco Maratea, Francesco Ricca, and Torsten Schaub. **ASP-Core-2 Input Language Format.** arXiv:1911.04326, 2019; TPLP 20, 2020, pp. 294–309, DOI 10.1017/S1471068419000450.

- Primary specification: [arXiv PDF](https://arxiv.org/pdf/1911.04326).
- Inspected: §§3 and 5 on sets of aggregate tuples, local/global scope, and safety.
- Used as: a semantic comparison showing independent tuple identity and explicit empty conventions.
- Not imported: special infinities, term order, ignored noninteger sum inputs, stable-model semantics, or integer-domain assumptions.

### P8 — Reproducible floating summation

James Demmel, Willow Ahrens, and Hong Diep Nguyen. **Efficient Reproducible Floating Point Summation and BLAS.** Technical Report UCB/EECS-2016-121, 2016.

- Primary institutional report page: [UC Berkeley](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2016/EECS-2016-121.html).
- Inspected: institutional abstract and report metadata. No reported performance result is reproduced or transferred to this project.
- Used for: a reproducible-accumulator research alternative and separating reproducibility from ordinary evaluation order.
- Not imported: an exact-rounded sum guarantee for this prototype.

## B. Official implemented-system semantics

### S1 — Soufflé stable inputs

[Soufflé tutorial, Aggregation](https://souffle-lang.github.io/tutorial).

Focused on the stable-relation requirement and prohibition on leaking aggregate witnesses. Live documentation is comparison evidence only, not a pinned implementation proof.

### S2 — Soufflé empty minimum and scope

[Soufflé aggregate reference](https://souffle-lang.github.io/aggregates).

Focused on failed/unsatisfied empty extrema, outer correlation, local witness restrictions, and nonnested aggregates. No assumption about Soufflé's integer overflow or duplicate-projection internals is made.

### S3 — PostgreSQL row versus DISTINCT-expression aggregation and scope

[PostgreSQL 18 §4.2, Aggregate Expressions and Expression Evaluation](https://www.postgresql.org/docs/18/sql-expressions.html).

Focused on per-row versus DISTINCT-expression input, outer-level aggregation, and error-order cautions.

### S4 — PostgreSQL group domains

[PostgreSQL 18 §7.2, Table Expressions](https://www.postgresql.org/docs/18/queries-table-expressions.html).

Focused on global grouping and empty grouping sets. No SQL NULL is proposed as a logical Value.

### S5 — PostgreSQL empty outputs and return types

[PostgreSQL 18 §9.21, Aggregate Functions](https://www.postgresql.org/docs/18/functions-aggregate.html).

Focused on count versus other empty aggregates and integer sum return-type widening.

### S6 — DuckDB 2.0 aggregate comparison

[DuckDB 2.0 Aggregate Functions](https://duckdb.org/docs/2.0/sql/functions/aggregates).

Focused on DISTINCT, empty outputs, floating SUM/FSUM order sensitivity. These versioned docs do not replace exact-source-pin review or execution.

### S7 — DuckDB 2.0 type-range comparison

[DuckDB 2.0 Numeric Types](https://duckdb.org/docs/2.0/sql/data_types/numeric).

Focused on BIGINT/HUGEINT ranges and the fact that fixed-precision decimal is not unconstrained exact arithmetic. No aggregate state/return-type guarantee is inferred solely from this page.

### S8 — SQLite prefix overflow comparison

[SQLite Built-in Aggregate Functions](https://www.sqlite.org/lang_aggfunc.html).

Focused on integer SUM intermediate overflow, floating input changing arithmetic behavior, and the documented empty SUM/TOTAL distinction. SQLite behavior is not selected semantics.

### Supplementary official pages inspected

- [DuckDB 2.0 GROUP BY](https://duckdb.org/docs/2.0/sql/query_syntax/groupby).
- [DuckDB 2.0 Text Functions](https://duckdb.org/docs/2.0/sql/functions/text).
- [PostgreSQL 18 Numeric Types](https://www.postgresql.org/docs/18/datatype-numeric.html).
- [PostgreSQL 18 WITH/recursive queries](https://www.postgresql.org/docs/18/queries-with.html).

These supported scoping of future oracle questions; they are not exact-pin empirical results.

## C. Authorized published project source

Repository: private Contributor/research-reference.

All five files read through the read-only GitHub connector at immutable commit **691ccf65eb0bee686c1919bfa893d1027db30162**, supplied by the coordinator. Relative repository locations:

1. [projects/temporal-datalog/prototype/engine/src/temporal_core.cpp]([PRIVATE_REFERENCE_REMOVED]) — parser, set deduplication, temporal cut, signed plan/completion, owned IR extraction, values/comparator.
2. [projects/temporal-datalog/prototype/engine/src/temporal_stratified_core.hpp]([PRIVATE_REFERENCE_REMOVED]) — existing API/result declarations.
3. [projects/temporal-datalog/prototype/engine/src/temporal_plan_ir_v2.hpp]([PRIVATE_REFERENCE_REMOVED]) — inspect-only owned IR2 declarations.
4. [projects/temporal-datalog/prototype/engine/src/temporal_typed_core.hpp]([PRIVATE_REFERENCE_REMOVED]) — four value tags and API declarations.
5. [projects/temporal-datalog/prototype/engine/ITERATION-04.md]([PRIVATE_REFERENCE_REMOVED]) — source candidate status and compatibility/version identifiers only; no carried-forward acceptance or authorization.

The coordinator also supplied the project-declared DuckDB source pin d54cbbe3df17e8e5ce68312f483b4155836112aa. It is recorded solely as a project source identifier, not inspected installed state. This theory revision did not inspect its source implementation; exact-pin SQL aggregate behavior is a separate research obligation.

## D. Evidentiary classification

- **Observed source evidence:** text of the authorized published project files and cited accessible primary sources.
- **Independent analytic derivation:** nonmonotonicity of exact scalar result facts, i64-prefix counterexamples, signed-128 bound under an explicit contributor cap, synthetic expected tables.
- **Proposed alternatives:** all new grammar, aggregate scope, group-domain, type, empty, arithmetic, IR, API, budget, metric, and diagnostic designs.
- **Unproved/unrun:** candidate syntax/link/runtime correctness, aggregate implementation correctness, oracle implementation independence, exact pinned SQL execution/overflow, compatibility bytes/counters, all test/benchmark/performance claims.
