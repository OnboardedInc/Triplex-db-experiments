# Iteration 02 — strict comparisons, checked expressions, SQL/error semantics

Research date: **2026-10-30**.
**Chosen-contract update (2026-10-30, 20:37 UTC):** the initial 27,380-observation dataset assumed Boolean ordering and permitted finite multiplication/division rounded to zero. Those assumptions are NOT selected semantics. Initial probe/data files are preserved byte-for-byte under their original names and protected by `INITIAL-ORACLE-PRESERVATION.json`. The distinct `totalized-final-oracle-*` rerun uses the selected contract: ordering only on same-tag string/i64/f64 (Boolean order is `TD_E_EXPR_TYPE`); nonzero-input f64 multiply/divide rounded to zero is `TD_E_EXPR_UNDERFLOW`; finite subnormals and exact add/subtract cancellation remain valid. It reports **27,380 exact matches and zero mismatches**, with 29 multiply-underflow and 10 divide-underflow outcomes per optimizer mode. Canonical selected error markers, rather than initial shorthand classes, are used in this rerun. Full-program/native acceptance preparation remains separate under `integration/` and is not represented as completed by this research freeze.
 Research-only; no production implementation, repository, Git, PR, Page, or Site changes. Everything produced here is under `/tmp/temporal-roadmap-research/iteration-02/sql/`.

## Immediate decisions

1. **Use body-only bounded expressions, not value-generating assignments or expression heads.** Require every expression variable to be grounded by a positive relational body atom. Expression results remain transient, never extending the relation/dictionary active domain. This preserves the existing finite-domain recursion argument. Expression depth/node/filter limits must be checked before evaluation.
2. **Separate identity from order.** Equality can be total tagged identity: distinct tags are unequal; inequality is its complement. Ordered operators require equal compatible tags and reject mismatches. The existing cross-tag `compare_values` ordering is an output-sort policy, not permission for mixed-tag ordered predicates. The selected contract rejects Boolean ordering; the initial probe assumed `false < true` and is explicitly historical. The distinct chosen-contract rerun corrects this.
3. **Choose i64 division explicitly.** Recommended: same-tag truncation toward zero, divisor-zero error, and `INT64_MIN / -1` overflow. DuckDB `/` is not that operation. Use no implicit i64/f64, string/numeric, or Boolean/numeric conversion.
4. **Use error-dominates-false on complete relational candidates, if this is the chosen contract.** Evaluate all relevant filters before head/pending duplicate elimination. A false filter must not suppress another filter's fault. Do not throw on a partially bound tuple that ultimately has no full join witness. Do not add a new pruning planner in this increment.
5. **Implement/verify a totalized independent SQL oracle.** A direct SQL `WHERE` rewrite is not an error oracle. It can skip faults, change behavior under optimizer settings, coerce types, or use the session collation.
6. **Make binary64 node-rounding assumptions explicit.** Use `-ffp-contract=off` and disallow fast-math/reassociation. Require round-to-nearest, ties-even and preserved subnormals at the evaluator boundary, either by rejecting unsupported FP state or by carefully scoped state restoration. An `__FAST_MATH__` check alone is insufficient.

Selected semantics follow the coordinator’s common `iteration-02/CONTRACT.md`; proposed optimizations remain recommendations, not implementation or acceptance claims.

## Evidence actually obtained

| Evidence | Result | Local artifacts |
|---|---|---|
| Pinned upstream DuckDB source | 33 source/test files, exact commit URLs and Git blob IDs | `sources/pinned-source-manifest.json`, `sources/pinned/` |
| Fresh upstream v2 header vs local vendor | Byte-for-byte identity | `sources/v2-header-fresh-verification.json` |
| Genuine runtime | DuckDB `v2.0.0`, source ID `d54cbbe3df`, Python module from requested `engine/python2` | `output/duckdb-sql-semantics-environment.json` |
| SQL semantic/error probes | 51 cases × optimizer on/off = 102 observations; errors/results recorded, no stderr | `probes/duckdb_sql_semantics.py`, `output/duckdb-sql-semantics*` |
| **Initial-assumptions** operation oracle | 37 typed boundary values × 1,369 pairs × 10 ops × 2 optimizer modes = **27,380 exact status/value matches**, zero mismatches, session `default_collation=nocase` | `probes/totalized_sql_oracle.py`, `output/totalized-oracle*` |
| **Chosen-contract** operation oracle | Same 37 values × 1,369 pairs × 10 ops × 2 modes = **27,380 exact canonical-status/value matches**, zero mismatches | `probes/totalized_sql_final_contract.py`, `output/totalized-final-oracle*` |
| Complete-candidate status aggregation | 10/10 targeted assertions pass, including a fault after a false predicate, empty snapshot and no join witness | `probes/candidate_error_domain.py`, `output/candidate-error-domain*` |
| FP environment and contraction | Rounding mode, FTZ, DAZ, and FMA each produce the predicted observable changes | `probes/fp_environment.cpp`, `output/fp-environment*`, `output/fp-actual-cxx-flags.txt` |
| Compile-once mechanism microprobe | 11 randomized-order rounds per variant, identical checked arithmetic and checksum | `probes/expression_dispatch.cpp`, `output/expression-dispatch*` |

The operation oracle imports **no production parser or evaluator**. Its Python reference uses arbitrary-precision integer arithmetic and exact `Fraction` operations converted to binary64 after each operation. The SQL implementation uses independent explicit status/value expressions. The initial evidence uses the explicitly labeled historical assumptions; the distinct chosen rerun implements the selected contract. This is fixture-level oracle evidence, **not** a complete parser/recursion/transport or production parity test.

## 1. What the pinned engine actually guarantees—and what it does not

All following code links target DuckDB commit `d54cbbe3df17e8e5ce68312f483b4155836112aa`, not mutable `main`.

### Conjunction execution is context-dependent

- Projection `Execute` evaluates every AND/OR child over its input selection, then combines Boolean vectors; it is not short-circuit execution.
- Predicate `Select` iterates a permutation, narrows the selection and short-circuits rows for AND/OR.

These are separate paths in [execute_conjunction.cpp, lines 33–145](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/expression_executor/execute_conjunction.cpp#L33-L145).

`ExpressionHeuristics` refuses cost reordering if any child can throw or contains an expression barrier. Adaptive filtering also disables permutations for such children. That protects specific optimizer/runtime transformations; it does **not** establish a user-level source-order/error guarantee across the optimizer. See [expression_heuristics.cpp, lines 37–69](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/expression_heuristics.cpp#L37-L69) and [adaptive_filter.cpp, lines 17–46](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/adaptive_filter.cpp#L17-L46).

Fresh runtime counterexamples, using table rows `(id=0, txt='bad')` and `(id=1, txt='2')`:

| Expression/context | Optimized | Optimizer disabled |
|---|---|---|
| Project `id>0 AND CAST(txt AS BIGINT)>0` | Conversion error | Conversion error |
| Filter `id>0 AND CAST(txt AS BIGINT)>0` | Returns id 1 | Returns id 1 |
| Filter `CAST(txt AS BIGINT)>0 AND id>0` | Returns id 1 | **Conversion error** |
| Project `id=0 OR CAST(txt AS BIGINT)>0` | Conversion error | Conversion error |
| Filter `id=0 OR CAST(txt AS BIGINT)>0` | Returns ids 0 and 1 | Returns ids 0 and 1 |
| Project constant `FALSE AND CAST('bad' AS BIGINT)>0` | False | **Conversion error** |
| A projected cast under outer `id>0 AND n>0` | Returns id 1 | **Conversion error** |

Therefore disabling just the conjunction-cost optimizer, depending on SQL source order, or wrapping a hazardous expression in a subquery is not a semantic foundation.

### CASE is row-selective, not a binder escape hatch

The pinned [CASE executor, lines 35–89](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/expression_executor/execute_case.cpp#L35-L89) computes a WHEN selection and executes each THEN only on selected rows; ELSE sees remaining rows. The probes confirm guarded casts avoid runtime errors in unused arms in both optimizer modes. Nevertheless an unknown function or incompatible branch types still fails binding, even in a statically dead branch.

This supports **guarded, well-typed totalization**, not arbitrary conditional SQL compilation or a promise about every optimizer rewrite.

### Pushdown already contains explicit error cautions

Pinned [pushdown_get.cpp, lines 182–195](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/pushdown/pushdown_get.cpp#L182-L195) avoids throwing IN scan pushdown because it loses short-circuit semantics and allows a generic throwing scan filter only when there is a single expression. [pushdown_projection.cpp, lines 160–181](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/optimizer/pushdown/pushdown_projection.cpp#L160-L181) separately handles throwing, volatile and barrier-bearing filters.

Upstream has dedicated regression tests ensuring dictionary/RLE/Parquet filtering does not evaluate hazardous casts on unselected values. This is especially relevant to any future vector/dictionary evaluator: validate/evaluate selected logical rows, not every unused dictionary value. See [test_throwing_filter_pushdown.test](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/test/sql/filter/test_throwing_filter_pushdown.test).

## 2. Strict tags must not inherit SQL convenience rules

DuckDB documents combination casting for unlike-type comparisons and says strict comparison checking cannot be enabled for its native operators. It also notes BETWEEN converts all inputs to a common type. See [DuckDB 2.0 comparisons](https://duckdb.org/docs/2.0/sql/expressions/comparison_operators).

Fresh probes return true for all of:

- `TRUE = 1::BIGINT`;
- `'01' = 1::BIGINT`;
- `'true' = TRUE`;
- `9007199254740993::BIGINT = 9007199254740992::DOUBLE`.

None is an acceptable substitute for strict tagged identity. UTF-8 byte order and normalization also need independence from ambient collations: `é` and `e` plus a combining acute accent remain distinct. In the SQL oracle, strings are compared as `encode(text)` BLOBs; this preserves byte semantics even with `default_collation=nocase`.

Native `/` performs floating division, including for integer inputs; `//` is integer division. DuckDB 2.0's integer division/modulo default to errors on zero, but a session setting can change this. Floating division by zero returns infinity/NaN, and finite floating arithmetic can overflow to infinity; TRY does not convert a non-error infinity to NULL. See [DuckDB 2.0 numeric functions](https://duckdb.org/docs/2.0/sql/functions/numeric). Use explicit status checks, not session defaults or TRY, to define the project's errors.

A less obvious trap: constant `-((-9223372036854775808)::BIGINT)` binds to a widened HUGEINT result, while negating an actual BIGINT column containing the minimum value errors. The extra unary probes record both. Explicit per-node types and range checks are essential even in tests.

## 3. Error-dominates-false is stronger than ordinary relational filtering

This section derives consequences of the parent's candidate contract; these are design inferences, not SQL guarantees.

Let `C` be the complete set of relational body bindings for a rule at a snapshot/round, before expression predicates and head deduplication. For each `c` in `C`, evaluate filter expressions to total results `{ok, Boolean}` or `{error, code}`. A candidate only contributes its head if all results are ok/true. Any candidate error fails execution even if another predicate is false or the head already exists.

Consequences:

- **False-pruning is unsound** while another predicate may fail.
- **Early throw is unsound** before the remaining relational joins have a witness.
- **Duplicate-head suppression is not an expression-validation shortcut.** Different body witnesses may yield the same head but have different arithmetic faults.
- **Join order and delta variants cannot define diagnostic precedence** unless that variability is explicitly permitted. If several faults exist, either define a stable error class/priority or specify source/filter/AST precedence and test it separately from row-set correctness.
- The simplest current implementation is all filters at the complete-binding leaf, with no early false return; success/fault is resolved before deduplication/output.
- A later dependency-aware optimization may compute owned totalized status/value as soon as inputs bind, but must carry it through remaining joins without pruning or raising. Memoization can save repeated computation, but cannot hide witness-dependent faults or bypass limits.

For **proven-total** independent predicates only, ordinary selection ordering has cost `c(p)+s(p)c(q)` versus `c(q)+s(q)c(p)`; the cheaper order follows from those terms. With required full error inspection, both predicates' actual evaluation costs remain payable, so that short-circuit formula is inapplicable. The derivation does not justify a current planner change.

## 4. Binary64 must round at each AST node

The exact reference is an operation over finite binary64 inputs followed by rounding to binary64 after **each node**, canonicalizing zero as established by item 1. Reject zero division, any nonfinite result, and nonzero-input multiply/divide rounded to zero at the node where it occurs. Finite subnormals and exact add/subtract cancellation remain valid. An intermediate overflow must not disappear through later algebraic reassociation.

Fresh isolated C++ measurements:

| Probe | Observed result |
|---|---|
| Nearest `1 + 2^-53` | `3ff0000000000000` |
| Upward `1 + 2^-53` | `3ff0000000000001` |
| `normal_min / 2`, normal state | `0008000000000000` |
| Same with FTZ | `0000000000000000` |
| `denorm_min * 2`, normal state | `0000000000000002` |
| Same with DAZ | `0000000000000000` |
| Separate `(1+2^-27)*(1-2^-27)-1`, baseline | positive zero |
| Same source with `-mfma -mavx2` and default contraction | `-2^-54` |
| Same native-target build with `-ffp-contract=off` | positive zero |

All builds report `__FAST_MATH__` absent. The checked isfinite-intermediate version happened not to fuse in this exact test, but that is not a compiler contract. The current baseline build does not enable FMA instructions; this is an exposed portability/optimization hazard, not a demonstrated current engine mismatch.

GCC 14 documents its C++ default contraction as fast; explicit off prohibits contraction. [GCC 14.2 optimize options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Optimize-Options.html). Clang documents independent rounding, contraction and denormal controls and warns denormal state cannot be assumed from an FP model alone. [Clang floating-point controls](https://clang.llvm.org/docs/UsersManual.html#controlling-floating-point-behavior).

For checked integers, GCC overflow builtins define results using an infinite-precision mathematical operation and report whether the destination represents it; this avoids evaluating overflowing signed arithmetic first. See [GCC checked integer builtins](https://gcc.gnu.org/onlinedocs/gcc/Integer-Overflow-Builtins.html). Division still needs explicit zero and minimum/-one guards before native signed division.

## 5. Performance research and bounded recommendations

Fresh primary theory pass:

- Ross shows that branch behavior changes the best selection plan and compares branching and non-branching conjunction strategies. His cost model assumes basic predicates with defined results; it does not authorize hiding this project's runtime errors. [Selection Conditions in Main Memory, 2004](https://www.cs.columbia.edu/~kar/pubsk/selcondsTODS.pdf).
- X100 motivates cache-sized vector processing to reduce interpretation overhead without full-column materialization, and demonstrates selectivity-dependent branch effects. That motivates a later controlled batching experiment, not unconditional vectorization now. [Boncz, Zukowski, Nes, CIDR 2005](https://www.cidrdb.org/cidr2005/papers/P19.pdf).
- Neumann separates efficient execution/compilation from operator-at-a-time interpretation, emphasizing locality and execution overhead. This motivates compile-once IR and separate compile/execution measurements, not adding JIT compilation to a small bounded interpreter. [Efficiently Compiling Efficient Query Plans, 2011](https://www.vldb.org/pvldb/vol4/p539-neumann.pdf).
- Unrestricted value-generating integer arithmetic changes recursive language theory substantially; the paper proves undecidability for a much broader integer-generating Datalog fragment even with restricted arithmetic. It does not describe this bounded finite-machine domain. The practical inference here is to retain the stronger body-filter/no-generated-head restriction, not to import its complexity results as this engine's. [Kaminski et al., IJCAI 2017 full version](https://arxiv.org/abs/1705.06927).

Synthetic nine-node checked-i64 expression, 250,000 candidates/round, 11 randomized-order rounds:

| Variant | Median ns/candidate |
|---|---:|
| Parse/build AST for every candidate | 126.09 |
| Compile once, recursive AST | 28.61 |
| Compile once, postfix dispatch | 20.04 |
| Direct specialized checked function | 2.67 |

These are mechanism measurements in this container, **not end-to-end engine speedups**. There is substantial runtime variability and no exclusive CPU/affinity guarantee. All variants use the same checked operations/checksum; no unchecked arithmetic is used to make one variant look faster.

Worthwhile bounded choices now:

- Parse/check/compile once per rule/program, resolving variable references and operator kinds once.
- Use bounded owned AST or opcode storage; avoid allocation, token parsing, dictionary interning, SQL compilation or string conversion in the candidate loop.
- Keep original AST order and node-local checks; do not algebraically simplify arithmetic or fuse nodes.
- Charge expression work, including false/error paths, against an explicit work budget. Decide whether budgets count logical nodes or actual executed nodes before folding/caching; changing that policy can change observable limit errors.
- Benchmark parse/compile, relational join work, expression evaluation, ingestion and result transport separately. Compare filter-free controls to expression-heavy workloads and include low/medium/high selectivity and late faults. Revalidate unchanged legacy paths.
- Defer dependency pushdown, selectivity adaptation, SIMD and function-specialized code until the semantics/oracle tests exist and an actual hotspot is measured.

## 6. Actual C API v2 capabilities and item-3 boundary

The exact upstream header was freshly fetched and matches the vendored header. All relevant entry points remain unstable and require `DUCKDB_V2_API_ALLOW_UNSTABLE`.

The v2 table-function complex-filter callback is real: offered filters are borrowed bound expression trees; accepting a filter removes it from DuckDB's residual filters. The callback may run multiple times. Its original predicate must be reproduced exactly. See [duckdb_v2.h table-filter contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h#L12830-L12853) and [implementation, lines 670–703](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_table.cpp#L670-L703).

The upstream test intentionally demonstrates a bad callback accepting `i<10` yet emitting 12 rows; DuckDB does not recheck the claimed filter. [v2 table tests, lines 1304–1318](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/test/api/capi/v2/test_capi_v2_table_function.cpp#L1304-L1318).

The expression inspection API exposes node types, return types, ordered children, owned constant values, column indices, function names/qualified names and cast mode. It does **not** expose a general expression-evaluation, cloning or rewriting API. Unmodeled node kinds return INVALID. These are not arbitrary optimizer hooks. Borrowed pointers cannot survive the callback; copy a recognized predicate to owned IR. Resolve column refs through the offered-column mapping, not by assuming declared-column identity. [v2 expression implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_expression.cpp).

Function fallibility metadata is meaningful: v2 FALLIBLE maps to `CAN_THROW_RUNTIME_ERROR`, which feeds CanThrow. Current `td_query_v2` registration correctly declares FALLIBLE. Declaring checked operations INFALLIBLE to obtain optimization freedom would be false; an unexpected callback error then becomes an internal error. [v2 property translation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_properties.cpp#L77-L84).

Recommended item-3 contract:

- Keep strict tagged constructors/operators explicit; do not compile arbitrary SQL comparisons into strict Datalog operators after the binder has already coerced away original types.
- Keep program parsing/safety/limits separate from row streaming; reject unsupported syntax/types before producing output.
- Initially accept **no pushed filters**. Only add a bounded, proven-total whitelist after exact value, byte-collation, NULL and error semantics have tests. Declining leaves DuckDB responsible for the predicate.
- Never accept a cheap filter that changes which later internal checked expression faults are observable under the chosen error-dominates contract.
- Guarantee no partial **Datalog result** by resolving all candidate errors before emitting it. A future streaming table function must preflight/buffer appropriately; per-call materialization is not automatically an atomicity guarantee for an entire SQL statement containing many calls or result chunks.
- A scalar `td_query_v2` remains a scalar-list wrapper, not a planner/optimizer extension; table scan hooks do not change that description until actually implemented.

## 7. Independent oracle test architecture

Use three intentionally different implementations:

1. **Reference semantics:** tiny host nested-loop/set fixpoint evaluator, no production parser/planner reuse. Program fixtures can be declarative JSON AST with independently generated native source. Python arbitrary ints and Fraction-per-node binary64 reference provide expected statuses/values. String comparisons use UTF-8 bytes. Every input tag/payload is independently validated.
2. **SQL oracle:** snapshot the exact relational candidate set first with BIGINT clock comparisons, using half-open valid and transaction intervals. Compute each expression into explicit `{status, typed value}` with guarded, total operations. Aggregate any error across complete candidates **before** selecting true candidates or deduplicating heads. Widen i64 +/−/* to HUGEINT and range-check before narrowing. Use CASE guards for division; use explicit finite checks for floats; compare encoded text bytes. Emit i64/clocks as decimal JSON strings through the transport encoder, not native JSON numbers.
3. **Implementations under test:** C++ direct core, real v2 loaded extension, Python/browser paths that claim support, and optimized execution variants. Run on the same declarative corpus, but do not share their evaluation helpers with the reference or SQL compiler.

Mandatory corpus categories:

- All 16 ordered tag pairs for each binary operator; identity vs ordered mismatch policy; exact large i64/f64 distinction; UTF-8 order, canonically equivalent Unicode, collation adversary.
- I64 min/max and adjacent values, zero, signs, min/-one division, fractional truncation, unary min negation. FP max/subnormal/min-subnormal/ties/cancellation/zero and per-node overflow/FMA-sensitive nested expressions.
- Age, numeric range, and bitemporal time cases with independent expected sets and endpoint/min/max clocks; no date arithmetic/coercion.
- Fault after false filter, false after fault, several fault classes, empty relations/snapshots, partial binding without join witness, duplicate head with a faulty second witness, recursive late fault, every delta placement, and source atom/rule/input permutations.
- Rejected ungrounded variables, assignments/head expressions/unsupported types/functions, excessive expression depth/nodes/filters, work/round/fact/output limits, and recovery by a subsequent good call.
- Exact row sets/order, typed JSON bytes where promised, error class and no partial output. Exact message parity only if explicitly specified; avoid letting physical join order determine it accidentally.
- Optimizer on/off and collation adversaries for the SQL oracle; exact pinned native runtime and FP-state tests for C++; real browser/transport tests for JavaScript.

The checked-in probe demonstrates the arithmetic/status layer of this architecture. It does not replace these whole-program tests.

## Retrieval limits and preservation

The two Berkeley URLs for the 1993 Predicate Migration paper returned 503/timeout during this fresh pass. This report does not depend on uninspected details of that paper. Other cited primary papers and pinned source were retrieved successfully; hashes are retained. Full papers/source snapshots are research inputs with their own licenses, not project code. For durable publication prefer this report, probe sources, raw outputs and manifests rather than indiscriminately copying third-party PDFs.

`SHA256SUMS` covers deliverable source, results and references after finalization. `INPUT-READBACK.json` records the relevant production-source reads without changing them. The parent owns any later implementation and durable publication.
