# Primary-source bibliography

2026-10-31 UTC. Sources below were read as published source/documents, not as evidence about an installed runtime. Report conclusions distinguish source facts from mathematical derivations and unselected alternatives.

## Immutable private project sources

All use repository `Contributor/research-reference`, immutable ref `691ccf65eb0bee686c1919bfa893d1027db30162`, prefix `projects/temporal-datalog/prototype/engine/`.

- [Typed value API]([PRIVATE_REFERENCE_REMOVED]). Tags, no implicit cross-tag conversions, documented output comparison. Returned blob SHA `f94113a07230f8a450c06b46cae6eb9c7a25eb8c`.
- [Value domain]([PRIVATE_REFERENCE_REMOVED]). Typed admission, finite floats, canonical zero, tag-specific interning. Returned blob SHA `99ff9118354d3bba5e48ad461442ef2493e94086`.
- [Scalar expression policy]([PRIVATE_REFERENCE_REMOVED]). Checked per-node scalar arithmetic and narrower ordered-comparison relation. Returned blob SHA `81372c05af37c3bef6e65223e4905e01f2a16869`.
- [Published FP policy]([PRIVATE_REFERENCE_REMOVED]). Finite/canonical bit operations and strict FP premise. Returned blob SHA `a039893e168c2cb492d8e4f2f0613d152a309fc7`.
- [Core source]([PRIVATE_REFERENCE_REMOVED]). Lines 27–34, 145–152, 661–670, and 1522–1589: project limits, input admission, canonical values, comparator.
- [Iteration 04 source-candidate note]([PRIVATE_REFERENCE_REMOVED]). Explicitly not accepted/built; declared DuckDB source pin; existing failure-phase vocabulary. This report does not establish acceptance.

## Immutable DuckDB implementation

All implementation claims use official `duckdb/duckdb`, immutable ref `d54cbbe3df17e8e5ce68312f483b4155836112aa`, the project-declared pin.

- [Sum declarations/binding/finalization](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp). Especially lines 217–231, 377–458, 508–545. BIGINT/HUGEINT and decimal/floating output distinctions.
- [Summation state helpers](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp). Especially lines 20–108, 133–143, 195–203: repeat-count multiplication, correction state, partial-state combination.
- [Count](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/aggregate/distributive/count.cpp). Especially lines 10–39, 72–85 and 272–300: BIGINT counts and NULL-sensitive versus star counting. Published blob in directory response: `f62027b094e75832ac854b0ff6c1b907166f342b`.
- [Min/max](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/aggregate/distributive/minmax.cpp). Especially lines 88–128, 292–296, 402–411: typed binding, unset-state NULL, duplicate/order flags. Returned/published blob SHA `eaca13d6e505f8d987c3b8f8232c0150e8f45511`.
- [Aggregate state initialization](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/function/aggregate_function.hpp#L768-L783). The count operation supplies no custom initializer; the generic initializer zeroes that state.
- [HUGEINT addition](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/types/hugeint.hpp#L106-L112). Inline checked addition supports the decimal-prefix range caveat; this is not an unbounded accumulator.

## Official DuckDB 2.0 documentation

These versioned documentation pages are secondary to the exact source for implementation details; no claim is made that their content is immutable.

- [Aggregate functions](https://duckdb.org/docs/2.0/sql/functions/aggregates). NULL/empty semantics, DISTINCT, aggregate-local ordering, floating order sensitivity, Kahan description.
- [Numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric). BIGINT/HUGEINT ranges, decimal and floating domain distinctions, special values.
- [Typecasting](https://duckdb.org/docs/2.0/sql/data_types/typecasting). SQL implicit/combination casts differ from native tagged values.
- [Order preservation](https://duckdb.org/docs/2.0/sql/dialect/order_preservation). Group input/output and whole-table aggregate order guarantees must not be inferred from insertion order.
- [Non-deterministic behavior](https://duckdb.org/docs/2.0/operations_manual/non-deterministic_behavior). Background corroboration for non-deterministic floating aggregate behavior; no project experiment or timing inference.

## Arithmetic, reproducibility, and independent-oracle references

- Radford M. Neal, [Fast Exact Summation Using Small and Large Superaccumulators, arXiv:1505.05571v1 (2015)](https://arxiv.org/html/1505.05571v1). Primary description of exact accumulation/final rounding and binary64 representation. Used without importing its performance measurements.
- Peter Ahrens, James Demmel, Hong Diep Nguyen, [Algorithms for Efficient Reproducible Floating Point Summation, ACM TOMS 46(3), article 22 (2020)](https://people.eecs.berkeley.edu/~demmel/ma221_Fall23/J115_Efficient_Reproducible_Summation_TOMS_2020.pdf). Author-hosted primary paper, sections 1 and 4: order-independent binned accumulation, tunable accuracy, range/underflow premises. Reproducibility is not automatically correct rounding.
- Takeshi Ogita, Siegfried M. Rump, Shin'ichi Oishi, [Accurate Sum and Dot Product, SIAM J. Sci. Comput. 26(6), 1955–1988 (2005)](https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf). Author-hosted primary paper; compensated/error-free transformations have numerical hypotheses.
- Ingo Müller, Andrea Arteaga, Torsten Hoefler, Gustavo Alonso, [Reproducible Floating-Point Aggregation in RDBMSs, extended version, arXiv:1802.09883v1 (2018)](https://arxiv.org/html/1802.09883v1). Primary GroupBy-specific research. Physical independence, reproducibility and state-design issues are relevant; reported timings are not transferred.
- [GNU MPFR 4.2.2 manual, arithmetic functions](https://www.mpfr.org/mpfr-current/mpfr.html#Arithmetic-Functions). Correctly rounded `mpfr_sum`, zero behavior, and explicit rounding. The introduction documents that subnormals must be emulated, so precision 53 alone is not full binary64 emulation.
- [C++ working draft, expression preamble](https://eel.is/c++draft/expr.pre). Signed range and intermediate FP precision obligations. A working draft, not a substitute for declaring the project's language/version contract.
- [GCC manual, 128-bit integers](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fint128.html). Official extension/portability caveat only; no compiler was inspected or invoked.
- [Boost Multiprecision integer backend documentation](https://www.boost.org/doc/libs/latest/libs/multiprecision/doc/html/boost_multiprecision/tut/ints/cpp_int.html). Fixed/arbitrary precision, checked overflow, representation and conversion caveats. No library installation was inspected or performed.
- [Clang manual, controlling floating-point behavior](https://clang.llvm.org/docs/UsersManual.html#controlling-floating-point-behavior). Official distinctions among reassociation, contraction, denormal behavior and FP modes. Read as documentation only, not toolchain evidence.

## Retrieval limitations

The initial abbreviated private paths returned ordinary not-found results; the parent supplied the full project prefix and the immutable authorized sources then read successfully. Public raw-file fetches for count/min/max initially encountered not-found/cache responses; the official immutable directory identified their source locations, and exact count/min/max source was subsequently read. The ReproBLAS landing page timed out; the primary author-hosted TOMS paper was successfully read. A first GNU MPFR manual URL was inaccessible; the official MPFR project manual was successfully read. These were source-retrieval limitations, not safety denials, test outcomes, or evidence about a computer.
