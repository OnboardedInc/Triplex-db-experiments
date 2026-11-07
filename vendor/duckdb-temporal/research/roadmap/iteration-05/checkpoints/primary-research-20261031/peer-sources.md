# Primary source additions and independent rechecks

Revision 001. Sources read 2026-10-31 UTC. These are additions/rechecks for the peer review, not replacements for the original bibliographies. No source was executed. No issue attachment or reproduction command was used. Only project semantics and citation metadata are retained here.

## Exact official DuckDB source

Every source in this section uses official duckdb/duckdb commit d54cbbe3df17e8e5ce68312f483b4155836112aa, the project-declared source pin, read through the read-only GitHub connector. This does not describe an installed runtime.

### A1 Aggregate and collection public declarations

[`src/include/duckdb_v2.h`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h). Returned blob SHA c36fe3ac3edd536aba8e79f6d7d9a81ed834c5e4. Rechecked collection lines 1191–1538 and selected aggregate sections 4890–5788. Supports the phase signatures, state aliasing, combination source constness, output offsets, and typed collection ownership/append caveats. It does not prove runtime cleanup or resource behavior.

### A2 Actual aggregate bridge and registration

[`src/main/capi/v2/capi_v2_func_aggregate.cpp`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_aggregate.cpp#L150-L380). Returned blob SHA d3d64d9dae6b70afb5e067bd693e9ba1de655c3e. Rechecked lines 150–380. Supports required/optional callbacks, borrowed callback error-slot handling, destructor errors being dropped, and the builder's installed callback set. The internal file is evidence, not a proposed application dependency.

### A3 State spill gate and pointer free distinction

[`src/execution/aggregate_state_spilling.cpp`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/aggregate_state_spilling.cpp#L14-L75). Returned blob SHA 8d2ab96a029f1e63756a459cb9721b6c9492fcdb. Rechecked lines 1–90. The state-description/destructor gate and the pointer-free row distinction support the narrowly stated custom-state-path inference. They do not support a universal no-spilling claim.

[`src/execution/radix_partitioned_hashtable.cpp`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/radix_partitioned_hashtable.cpp#L851-L903). Returned blob SHA 61cec7ac5057a99ce0f94bcaf273d489005009ec. Rechecked lines 851–903 for retained aggregate-state-memory accounting context; no resource setting or execution observation is retained.

### A4 Sum registration and narrower optimized state

[`extension/core_functions/aggregate/distributive/sum.cpp`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp). Returned blob SHA bcb7594c2cb94103e1b6128c97253927b4ee9db7. Rechecked lines 200–240, 280–449 and 508–585. Important additive precision: default BIGINT registration is wide, but the statistics callback can replace its internal implementation with a safe narrow-state variant. Lines 548–585, not a span ending at 545, anchor the floating/Kahan registrations.

### A5 Repeat and Kahan update behavior

[`extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp). Returned blob SHA 7c35853aed76165d273c59099eb95629cabaf20e. Rechecked lines 1–160. Lines 143–153 precisely include the Kahan constant-update multiplication. These are source-level traces, not predictions of any chosen SQL execution plan.

### A6 Version family and instability

[`src/include/duckdb_extension_v2.h`](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L14-L78). Returned blob SHA b77dc115c1013e8f4db54f372cfd53d3148455ce. Rechecked lines 10–82. Confirms the v2 family, unstable opt-in and no mixed extension-header families. It confers no execution or catalog authority.

## Official current issue and documentation

### A7 Upstream issue 28132

[DuckDB issue 28132](https://github.com/duckdb/duckdb/issues/28132). Re-read through the read-only connector as open, labeled reproduced; created 2026-10-30T13:01:44Z and updated 2026-10-30T14:14:33Z in the returned issue metadata. Only the distinct-same-signature aggregate coalescing report is used. Exact-pin project reproduction is UNRUN. No issue-template computer details are retained in this review.

### A8 DuckDB aggregate documentation

[DuckDB 2.0 aggregate functions](https://duckdb.org/docs/2.0/sql/functions/aggregates). Rechecked DISTINCT, empty general aggregates, ordering and floating sum/fsum caveats. Versioned live documentation is contextual comparison evidence, not an immutable source or a tested SQL adapter.

### A9 Historical byline correction

Hannes Mühleisen and Mark Raasveldt. [Parallel Grouped Aggregation in DuckDB](https://www.duckdb.org/2022/03/07/aggregate-hashtable), 2022-03-07. Rechecked the official byline; the performance bibliography omits the second author. Architecture is historical context, not current public custom-state capability or measured project performance.

### A10 Null free partial extrema comparison

[Souffle aggregate reference](https://souffle-lang.github.io/aggregates). Rechecked empty minimum, local witness restrictions and nested-aggregate exclusion. Used only as a comparison for explicit partial results, not to import arithmetic or bag semantics.

### A11 Other official arithmetic comparisons

[SQLite aggregate reference](https://www.sqlite.org/lang_aggfunc.html) was re-read for the documented distinction between integer/floating sum and empty outputs. No SQLite behavior is selected.

[GNU MPFR 4.2.2 manual](https://www.mpfr.org/mpfr-current/mpfr.html#Arithmetic-Functions), introduction, rounding and mpfr_sum contract. Rechecked correct rounding, range and subnormal-adaptation caveats. No installation or execution was inspected.

## Primary mathematical and language references

### A12 Observed and empty global groups

Inderpal Singh Mumick, Hamid Pirahesh, Raghu Ramakrishnan. [The Magic of Duplicates and Aggregates](https://www.vldb.org/conf/1990/P264.PDF), VLDB 1990. Independently rechecked Definition 3.1/group construction and the section-3.2 footnote distinguishing empty zero-key grouping from SQL's global group. Broader multiset/recursive semantics are not adopted.

### A13 Strict aggregate dependencies

Nikolay Pelov, Marc Denecker, Maurice Bruynooghe. [Well-founded and Stable Semantics of Logic Programs with Aggregates](https://arxiv.org/pdf/cs/0509024), author preprint v2, 2006. Independently rechecked Definition 5.8 and its lower-level-fixing construction in section 5.2. Richer recursive semantics do not waive the chosen conservative barrier.

### A14 Discriminators versus existential projection

Abhijeet Mohapatra, Michael Genesereth. [Aggregation in Datalog Under Set Semantics](https://web.stanford.edu/~abhijeet/papers/aggregates.pdf), Stanford technical report. Rechecked section 2, especially Examples 2 and 3: retained discriminators distinguish equal measures, while existential projection can collapse them. The first-class set language is not proposed here.

### A15 Exact summation model

Radford M. Neal. [Fast Exact Summation Using Small and Large Superaccumulators](https://arxiv.org/html/1505.05571v1), 2015. Rechecked the exact-state/final-rounding distinction and count-dependent binary64 fixed-point accumulator model. The review's 2115-bit and overflow-midpoint calculations are independent hand derivations. No paper timing is transferred.

### A16 Reproducibility attribution crosscheck

Peter Ahrens, James Demmel, Hong Diep Nguyen. [Algorithms for Efficient Reproducible Floating Point Summation](https://people.eecs.berkeley.edu/~demmel/ma221_Fall23/J115_Efficient_Reproducible_Summation_TOMS_2020.pdf), ACM TOMS 46(3), article 22, 2020. Rechecked first-page metadata and reproducible-versus-exact framing. The numeric package's attribution matches this cited paper.

James Demmel, Willow Ahrens, Hong Diep Nguyen. [Efficient Reproducible Floating Point Summation and BLAS](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2016/EECS-2016-121.html), UCB/EECS-2016-121. The official institutional record matches the theory package's citation. No attribution correction to that citation is proposed.

### A17 Performance reference spot checks

- Peter Boncz, Marcin Zukowski, Niels Nes. [MonetDB/X100 Hyper-Pipelining Query Execution](https://www.cidrdb.org/cidr2005/papers/P19.pdf), CIDR 2005; section 5.1.1 supports the vector-size tradeoff description, not a project batch optimum.
- Viktor Leis, Peter Boncz, Alfons Kemper, Thomas Neumann. [Morsel-Driven Parallelism](https://db.in.tum.de/~leis/papers/morsels.pdf), SIGMOD 2014; section 4.4 supports the local-preaggregation/partitioned-reduction description.
- Daniel Xue, Ryan Marcus. [Global Hash Tables Strike Back An Analysis of Parallel GROUP BY Aggregation](https://arxiv.org/abs/2505.04153v2), preprint v2, 2025-09-05. Version/author/date metadata matches the supplied citation. The review does not claim a full independent re-audit of every experimental result.

Ramakrishnan, Ross, Srivastava and Sudarshan's [Efficient Incremental Evaluation of Queries with Aggregation](https://www.cse.iitb.ac.in/~sudarsha/Pubs-dir/aggregate-eval-jicslp94.pdf) was re-opened for its paper identity and incremental-semantics context. No new theorem or empirical conclusion is taken from it.

## Source and verification limits

No private baseline project source was re-fetched. No unpinned default branch was substituted for a pinned DuckDB implementation claim. Fresh public source excerpts are summarized, not saved as a source dump. Original report manifests were read as declared evidence inventories; their digests were not recomputed by this reviewer. Local writes are observed through tool success only; no filesystem integrity/read-back or empirical execution claim is made.
