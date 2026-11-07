# Item 5 research: typed aggregate numeric semantics

2026-10-31 UTC. **Research only; no contract selected, implementation changed, or empirical check run.** This report concerns `count`, `min`, `max`, and checked `sum` over completed lower-stratum inputs. Recursive aggregate cycles are outside the requested item. Item 3/4 acceptance is not established; this report does not change either hold.

## Findings that matter before implementation

1. **Checked i64 sum need not be prefix-checked i64 addition.** With at most 100,000 actual contributions per group, exact wide accumulation needs fewer than 80 magnitude bits. Checking only the final i64 result is order-independent; checking each narrow prefix is not.
2. **Deterministic floating-point fold and exact floating-point sum are different contracts.** Sorting fixes an evaluation order, not numerical accuracy or cancellation-related prefix overflow. A bounded exact accumulator can avoid intermediate floating-point overflow, but changes aggregate semantics rather than merely optimizing a scalar fold.
3. **The existing output comparator is not the scalar comparison relation.** Output sorting ranks all tags and orders booleans; scalar ordered comparisons reject cross-tag and boolean operands. Reusing the former for extrema introduces a new semantic order.
4. **No logical NULL means empty groups need an explicit language decision.** `count` has a natural zero; `sum` additionally needs its output tag; selection-style `min`/`max` have no selected input on emptiness. SQL's NULL result cannot be imported.
5. **DuckDB is a comparison target, not the native numeric oracle.** At the exact declared source pin it widens BIGINT sum to HUGEINT, has separate DOUBLE sum/Kahan paths, and permits repeat-count multiplication and partial-state combination.
6. **The cap must bound aggregate contributions, not merely input facts.** A bounded relation can participate in many join witnesses. The existing fact/input limits do not by themselves prove the bound used in any aggregate accumulator.

## 1. Published baseline, not accepted runtime behavior

The inspected private source is immutable commit `691ccf65eb0bee686c1919bfa893d1027db30162`, under `projects/temporal-datalog/prototype/engine/`. It is source evidence only. Its value API has four tags: string, boolean, i64, and finite f64, with no implicit cross-tag conversions. The dictionary canonicalizes both floating zero signs. Public value ordering is tag rank, then byte/boolean/integer/finite-numeric order. [Typed API]([PRIVATE_REFERENCE_REMOVED]), [value domain]([PRIVATE_REFERENCE_REMOVED]), [value comparator]([PRIVATE_REFERENCE_REMOVED]).

Scalar arithmetic requires matching numeric tags; i64 arithmetic checks each operation. F64 expression nodes have separate binary64 results checked for finiteness; nonzero multiplication/division rounding to zero is an error. Zero is canonicalized. Ordered scalar comparisons accept strings/i64/f64, reject booleans, and reject unequal tags; equality distinguishes tags. **None of the aggregate alternatives below weakens these existing scalar checks.** An input contribution expression that already overflows is not rescued by later aggregate cancellation. [Published expression implementation]([PRIVATE_REFERENCE_REMOVED]).

The published FP policy requires nearest rounding, gradual subnormals, separately checked results, and no reassociation/contraction relaxation. This remains a continuous premise, not something established by this research. No controls were sampled or changed. Source-level FP declarations are not observations about any computer. [Published FP policy]([PRIVATE_REFERENCE_REMOVED]), [source-candidate status]([PRIVATE_REFERENCE_REMOVED]).

## 2. Define the contribution set before defining numbers

These are separate possible meanings, not interchangeable implementations:

- Count/sum every distinct complete relational witness, retaining equal projected numeric values from different witnesses.
- Project the aggregate value first, deduplicate tagged values, then count/sum that set.
- Retain derivation multiplicity, including repeated proofs of the same tuple. This would depart from ordinary set-valued relations and requires its own explicit bag model.

For distinct tuples `(g,id,v) = (a,1,5), (a,2,5)`, witness counting gives 2 and summation gives 10; value-distinct aggregation gives 1 and 5. Deduplicating full tuples does not make these alternatives equal. Repeated physical copies of the identical EDB tuple are a separate issue from two different witnesses sharing a value.

The proposed numeric proofs assume **N <= 100,000 admitted contributions to one aggregate group**, after the selected contribution/deduplication rule. Enforcement must occur before the update that would exceed the cap, including merges of partial states. If the cap is global rather than per group, say so; the per-group proof still follows, but resource behavior differs. The existing source has 100,000 input rows and bounded known facts, not a newly established aggregate-witness cap. [Existing source limits]([PRIVATE_REFERENCE_REMOVED]), [input admission]([PRIVATE_REFERENCE_REMOVED]).

Without NULL, `count(*)` counts contributions irrespective of their tags. If `count(expr)` is allowed, its expression evaluation/error behavior must be specified: removing a fallible expression merely because its value is unused can suppress a required error. Tagged `i64(1)`, `f64(1)`, `true`, and string `"1"` are four distinct values, not one coerced value.

## 3. Checked i64 sum: order-independent alternative and proof

Let `L = -2^63`, `U = 2^63 - 1`. For any prefix/subset/partial-state sum of at most N i64 contributions:

`-N * 2^63 <= S <= N * (2^63 - 1)`.

Since `N <= 100000 < 2^17`, `|S| < 2^80`. A signed representation with 80 magnitude bits plus a sign, or a conventional signed 81-bit two's-complement range, is sufficient. A signed 128-bit accumulator is comfortably sufficient. This proof covers arbitrary visitation order and exact merges **only while the total contribution count remains within the cap**. It does not rely on cancellation.

An order-independent checked-sum candidate would accumulate exactly in that wider domain, then accept precisely `L <= S <= U`, returning the existing i64 tag. It would not expose a new wide tag. No early i64 range check is valid: an out-of-i64 prefix can later cancel. Scalar checked addition remains unchanged because aggregate accumulation is separately specified.

Portable implementation alternatives, not selections:

| Alternative | Proof/engineering obligation | Qualitative cost |
|---|---|---|
| Two unsigned limbs plus sign/magnitude, or separate positive/negative wide totals | Prove carries/borrows and final signed conversion; handle `L` without evaluating narrow `-L` | Bounded state and operations; custom arithmetic needs independent review |
| A documented fixed-precision checked multiprecision type | Explicit range/conversion checks; translate library failure; do not assume its sign representation matches built-ins | Bounded state; added dependency and abstraction |
| Arbitrary-precision integer | Still enforce contribution/work/state budgets; allocation failure remains possible | Useful independent oracle; unnecessary unbounded precision for the stated cap |
| An implementation's signed 128-bit extension | Declare the portability requirement; widen operands before arithmetic; range-check before narrowing | Concise implementation where supported, but not universally standard C++ |

Signed overflow must never be used as an overflow detector after the fact. The C++ expression rules do not supply defined signed wrapping. GCC documents `__int128` as an extension with support conditions, not a universal language type. Boost documents both checked fixed precision and arbitrary precision; its `int128_t` uses 128 magnitude bits plus a sign, unlike built-in signed 128-bit two's complement. [C++ expression rules](https://eel.is/c++draft/expr.pre), [GCC extension](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fint128.html), [Boost integer backend](https://www.boost.org/doc/libs/latest/libs/multiprecision/doc/html/boost_multiprecision/tut/ints/cpp_int.html).

## 4. Finite f64 sum: alternatives must be named honestly

| Candidate contract | Determinism/accuracy | Failure and optimization consequences |
|---|---|---|
| Arrival-order checked left fold | Neither permutation-independent nor a set function | Depends on join/hash/scan order; intermediate overflow can reject a finite exact total |
| Canonically sorted, checked left fold | Same multiset gives the same trace if comparator, initial +0, and parenthesization are fixed; not generally correctly rounded | Sorting/materialization; preserve every checked addition; arbitrary parallel combine changes semantics |
| Fixed balanced tree over a canonical ordering | Reproducible only with the complete tree fixed; different answer from left fold is possible | A new contract, not a permissible reassociation of the preceding one |
| Compensated/Kahan or floating expansions | Often more accurate; accuracy alone does not imply exactness or arbitrary-order reproducibility | Requires separate proof of intermediate overflow behavior and merge semantics |
| Reproducible bounded binned accumulator | Can be order-independent without being exact or correctly rounded | Specify parameters, input-count bound, rounding and error guarantee; do not call it exact |
| Exact fixed-point/superaccumulator, rounded once | Exact arithmetic state, order-independent merges, one final rounding | Larger bounded state and careful final rounding; changes semantics from per-addition checked fold |

Neal's primary paper distinguishes exact accumulation and final rounding from repeated rounded addition; exact state supports order-independent combination. Ahrens–Demmel–Nguyen distinguish reproducibility from exactness and provide a tunable binned design; the default conversion is not an unconditional correctly-rounded-exact guarantee. Their overflow and gradual-underflow premises also matter. Ogita–Rump–Oishi provide error-free/compensated methods with stated hypotheses: an accuracy theorem is not a substitute for checking those hypotheses. [Neal, 2015](https://arxiv.org/html/1505.05571v1), [Ahrens–Demmel–Nguyen, 2020, sections 1 and 4](https://people.eecs.berkeley.edu/~demmel/ma221_Fall23/J115_Efficient_Reproducible_Summation_TOMS_2020.pdf), [Ogita–Rump–Oishi, 2005](https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf).

### Bounded exact f64 accumulator: hand proof

Every finite binary64 value is an integer multiple of `q = 2^-1074`. The largest finite magnitude is `M = 2^1024 - 2^971`, so `M/q = 2^2098 - 2^2045 < 2^2098`. With N < 2^17, the exact integer coefficient of any partial sum has magnitude `< 2^2115`. Thus **2115 magnitude bits plus sign suffice** for this cap; for example, 34 unsigned 64-bit limbs provide 2176 magnitude bits, with a separate sign. This is a mathematical representation example, not measured object size, a selected layout, or implementation evidence. Decode, shifts, carry propagation, signed cancellation, and final rounding all require proof.

That representation sums already evaluated f64 contributions. It must not silently turn a scalar multiply-and-sum into an exact dot product, fuse operations, postpone scalar checks, or accept an expression that previously failed. Final output remains finite canonical f64; a rounded nonfinite result must be handled as the selected aggregate overflow policy requires.

### Overflow, subnormals, and zero

- A canonical sorted fold can overflow before cancellation; sorting is not a cure. `[-M,-M,M,M]` in numeric ascending order overflows on its second addition although the exact total is zero.
- Distinguish “exact mathematical total exceeds M” from “rounded binary64 result is nonfinite.” Under nearest/ties-even, `M + 2^969` rounds to M, whereas `M + 2^970` reaches the overflow midpoint and rounds nonfinite. A finite-rounded-result policy and a strict real-range policy are different.
- Because all finite inputs are integer multiples of q, a nonzero exact sum has magnitude at least q. Sum-only accumulation with gradual subnormals therefore cannot have a nonzero exact total round to zero. A subnormal exact total is representable. Cancellation to zero is legitimate, not underflow.
- Canonicalize zero after the selected finalization (and after fold additions if that is the chosen trace). Do not add NaN/infinity sentinels for empty extrema.
- Do not loosen strict per-node FP policy, allow FTZ/DAZ, replace repeat additions with multiplication, enable FMA for expression contributions, or change parenthesization as a performance shortcut. Official compiler documentation explicitly separates reassociation, contraction and denormal behavior; a high-level “strict” label alone is not proof of every required property. [Clang FP semantics documentation](https://clang.llvm.org/docs/UsersManual.html#controlling-floating-point-behavior).

The fixed-limb example has more per-group state than a single-double fold. Naive initialization/finalization scales with limb count times groups, while updates scale with contribution count times touched limbs/carry work. Sorting a canonical fold adds `O(N log N)` comparisons and materialization; exact integer state need not sort contributions. These are algorithmic tradeoffs only. No timing, allocation-size, cache, or throughput claim was measured or inferred for this project.

## 5. Count, extrema, types, and emptiness

Possible output/error obligations, **not a selected contract**:

| Operation | Candidate admissible inputs | Candidate output | Decision still needed |
|---|---|---|---|
| Count | Any admitted contribution | i64 cardinality, 0..100000 under the stated cap | Witness/set/value-distinct meaning; expression evaluation |
| i64 checked sum | Homogeneous i64 contributions | i64 or aggregate overflow failure | Exact-wide/final check versus an explicitly ordered narrow fold |
| f64 sum | Homogeneous finite f64 contributions | Finite canonical f64 or failure | One of the distinct contracts above |
| Homogeneous min/max | One selected supported tag per group | An existing input value with its unchanged tag | Whether bool is accepted and gains an extrema-only order |
| Heterogeneous min/max | All four tags with an explicit total order | The winning tagged input, not a coerced numeric value | Whether tag-ranked extrema are desirable at all |

Mixing i64 and f64 is not harmless promotion. For example, conversion of integers above `2^53` to f64 can lose information. A homogeneous numeric sum can reject a mixed group rather than invent conversion. Rejection should not depend on which tag happened to arrive first.

For min/max, three defensible choices are: numeric-only homogeneous extrema; homogeneous extrema for selected comparable tags; or heterogeneous extrema over an explicitly documented tag-ranked total order. Under the last choice, `min({string("1"),true,i64(1),f64(1)})` is the string and max is the f64 because tag order dominates. This is not numeric comparison. Boolean `false < true` for extrema would be new behavior because scalar boolean `<` is currently rejected. String order must be byte order, not locale collation or Unicode normalization, if it reuses the published comparator.

Empty global aggregation must be distinguished from grouping an empty input by nonempty keys: the latter normally discovers no keys at all. Without logical NULL, alternatives include:

- Emit one global row for count and explicitly typed sum identities, but reject empty min/max.
- Define empty min/max as no result tuple, with consequences for a row containing other aggregate fields.
- Require an explicit nonempty aggregate input and fail otherwise.
- Use a separately designed presence/value relational encoding; that expands language/output design and is not silently authorized here.

Even `sum(empty)` needs an output tag: integer 0 and f64 +0 are distinct. A known input schema or explicit sum mode could resolve this; dynamically inferring from the first value cannot resolve an empty group. Per-type extrema identities, where they exist, manufacture unseen values and are not the same as selecting an input minimum/maximum. No new logical NULL, implicit coercion, infinity, or magic string should be introduced as an accidental workaround.

## 6. Error timing and soundness obligations

The existing candidate distinguishes request, compile, input, exec, and encode failures. The table below uses that vocabulary for design analysis only; no new diagnostic identifiers or wrapper behavior are selected. [Published diagnostic phases]([PRIVATE_REFERENCE_REMOVED]).

| Condition | Natural detection phase | Required distinction |
|---|---|---|
| Invalid requested limit | Request | Not numeric overflow |
| Aggregate cycle, unsafe grouping variable, illegal aggregate position/arity | Compile | Reject the program graph, not merely executed data |
| Malformed/nonfinite input carrier | Input | Preserve existing admission rules |
| Contribution expression type/division/overflow/underflow error | Exec | Existing per-node error; no aggregate cancellation rescue |
| Unsupported or mixed group tags not statically known | Exec | Not coercion, skipping, or a zero contribution |
| Contribution/state/work budget exceeded | Exec | Resource error; not an aggregate numeric range error |
| Final exact i64 outside its range | Exec finalization | Different from prefix overflow and output encoding failure |
| Empty partial aggregate with no selected result | Defined by chosen emptiness policy | Not fabricated NULL or accidental absence |
| Output/dictionary/serialization limit | Encode or established engine admission point | New numeric value may need interning/accounting |

Before emission, finish and validate every selected aggregate result under the chosen failure policy; otherwise successful rows can leak before a later group fails. Define deterministic error precedence if two groups have different failures. Exact sum decomposition is sound only if partial states include enough type/count information to reject bad tags and over-cap merges. Count, min and max can be decomposable too, but this says nothing about admitting recursive aggregates: only completed lower strata are in scope.

## 7. Exact DuckDB source comparison

The project declares DuckDB `2.0.0`, source pin `d54cbbe3df17e8e5ce68312f483b4155836112aa`. This is a declared source reference, not an inspected installed runtime.

At that pin, BIGINT `sum` binds to HUGEINT output/state, while DECIMAL sum binds to `DECIMAL(38, input_scale)` with a final decimal-width check. The registered floating sum and Kahan aggregate both use DOUBLE input/output. Therefore a native i64 result needs an independent final narrowing check; SQL sum succeeding with HUGEINT does not establish native success. No decimal tag is proposed for the current four-tag engine. [Pinned sum implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L217-L231), [binding/output types](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L377-L545).

Pinned regular floating updates/combinations use addition; constant/repeated paths can multiply by a repeat count. Kahan updates track a correction; its merge adds the other state's value and negated correction, and its constant path also uses a multiplied contribution. These are not the same trace as one separately checked scalar addition per contribution. A SQL aggregate-local ordering clause must not be assumed to eliminate those algorithmic differences. [Pinned summation helpers](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp#L20-L143).

Decimal widening is not unbounded exact accumulation. For `A = 10^38-1` in `DECIMAL(38,0)`, `A` fits signed 128 bits but `2*A` does not. The prefix `[A,A]` in a trace `[A,A,-A]` can therefore overflow the wide state although the mathematical final total A fits the decimal result. Which SQL execution trace is used is not predicted here. The pinned wide-add helper throws on failed addition; the native i64 cap proof must not be generalized to full-width decimal inputs. [Pinned HUGEINT addition](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/common/types/hugeint.hpp#L106-L112).

Pinned count has BIGINT output, a zero-initialized count state, and non-NULL counting behavior. Pinned min/max bind their argument/result type, ignore NULL, return NULL for unset states, and mark extrema order/duplicate-insensitive. These are statically typed SQL aggregates, not evidence for native heterogeneous-tag extrema. [Pinned count](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/aggregate/distributive/count.cpp#L272-L300), [zero-state initialization](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/function/aggregate_function.hpp#L768-L783), [pinned min/max](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/aggregate/distributive/minmax.cpp#L88-L128).

DuckDB's 2.0 documentation identifies floating sum/fsum as order-sensitive, describes fsum as Kahan, and returns NULL for empty general aggregates except count. It also distinguishes DISTINCT values from duplicates. Those SQL choices do not define native no-NULL semantics. [DuckDB aggregate documentation](https://duckdb.org/docs/2.0/sql/functions/aggregates). Its order documentation explicitly does not guarantee group input/output order or whole-table aggregate input order absent aggregate-local ordering. Its type system permits implicit/combination casts and floating special values, unlike the requested native domain. [Order preservation](https://duckdb.org/docs/2.0/sql/dialect/order_preservation), [typecasting](https://duckdb.org/docs/2.0/sql/data_types/typecasting), [numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric).

## 8. Hand-worked boundary cases — NOT EXECUTED

Here `L/U` are i64 bounds, `M` is largest finite binary64, and `q=2^-1074`. Results are mathematical derivations, not observations.

| Contributions | Distinguishing result |
|---|---|
| i64 `[U,1,-1]` | Exact-wide/final check returns U; prefix-checked narrow order shown fails |
| i64 `[L,-1,1]` | Exact-wide returns L; prefix-checked narrow order shown fails |
| i64 `[U,1]` | Final exact total is outside i64; reject under final-check candidate |
| i64 `[L,U]` | Exact total -1 |
| 100000 copies of L | Exact total `-922337203685477580800000`; bounded wide state, final i64 failure |
| f64 `[2^53,1,-2^53]` | Left fold shown gives +0; exact sum is 1 |
| f64 `[2^53,-2^53,1]` | Left fold shown gives 1, exposing permutation sensitivity |
| f64 `[-M,-M,M,M]` | Ascending checked fold fails at second addition; exact total +0 |
| f64 `[M,2^969]` | Nearest/ties-even result M despite exact total exceeding M |
| f64 `[M,2^970]` | Overflow midpoint; nearest/ties-even final output nonfinite |
| f64 `[2^-1022,-(2^-1022-q)]` | Exact subnormal q, not zero/underflow |
| f64 `[q,-q]` | Exact cancellation; canonical +0 |
| i64 1 together with f64 1 | Two different tagged values; homogeneous sum can reject |
| Empty contribution set | Count 0; sum tag and min/max presence/error remain policy choices |

## 9. Independent oracle proposals — ALL UNRUN

1. **Integer arithmetic oracle:** arbitrary-precision signed integer addition over a declaratively specified contribution set, followed by explicit i64 boundary comparison. Compare all permutations and many partition/combine trees; do not call the production wide helper from the oracle.
2. **Exact f64 oracle:** independently decode input bits into signed integer coefficients of q, add arbitrary-precision integers, then perform an independent ties-even binary64 rounding routine. Include midpoint, carry, cancellation, maximum-exponent, zero, and subnormal cases.
3. **Second exact reference:** MPFR's documented `mpfr_sum` has a correctly rounded sum contract. A future harness must explicitly reproduce binary64 range and gradual-subnormal conversion rather than merely choosing precision 53: MPFR does not natively use binary64 subnormals. Use exact bit-derived inputs, not rounded decimal round trips. No MPFR installation or run is proposed here. [MPFR sum contract and representation differences](https://www.mpfr.org/mpfr-current/mpfr.html#Arithmetic-Functions).
4. **Ordered-fold oracle:** sort a canonical tagged contribution description, emulate each binary64 addition/rounding/check separately with an independent exact-rational/integer step model, and compare the exact required failure prefix as well as final bits. Do not compare this candidate against an exact-once sum and call discrepancies bugs.
5. **Extrema/count oracle:** a simple declarative set/witness model using explicit tag equality and independently implemented byte/numeric order. Probe duplicate witness versus duplicate projected value, boolean policy, heterogeneous rejection, both zero signs, and empty global/keyed input.
6. **SQL differential checks:** only after adaptation. Explicitly select SQL types, contribution/dedup rules and output narrowing; exclude NULL/NaN/infinity unless testing rejection at the boundary. Treat SQL FLOAT/fSUM differences as expected unless the precise native algorithm is deliberately matched. The database aggregation literature independently explains why physical plan changes can change floating GroupBy results; it does not establish this project's performance. [Müller et al., 2018](https://arxiv.org/html/1802.09883v1).

## 10. Decisions left open at this bounded research closure

- The contribution key/multiplicity rule and exact scope/charging of the 100,000 cap.
- Which extrema input tags and order, including boolean and heterogeneous groups.
- Exact-wide final i64 check versus explicitly ordered prefix checks.
- Whether f64 SUM is in item 5 initially; if so, which named algorithm/contract and overflow criterion.
- Type information and identities for empty sums; presence/error behavior for empty min/max and mixed aggregate rows.
- Error precedence, group admission, deterministic output order, and state/work accounting.
- The independent acceptance packet for the selected alternative. No contract is selected by this report.

**Empirical status:** compilation UNRUN; native execution UNRUN; database execution UNRUN; automated oracle checks UNRUN; tests UNRUN; benchmarks UNRUN. Only primary-source reading and hand derivation were performed.
