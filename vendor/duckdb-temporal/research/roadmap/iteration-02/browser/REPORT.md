# Item 2 browser/reference numeric research and proposed conformance contract

Research date: **2026-10-30 UTC**. This is a research/specification handoff, not an implementation or production-readiness claim.

All new files and binaries are confined to `/tmp/temporal-roadmap-research/iteration-02/browser/`. The accepted source was read, imported, and compiled read-only; no accepted source, frozen control, Git object, PR, Page, Site, deployment, or external state was changed. No Codex task or user computer was used. Relevant input hashes were re-read unchanged; see `baseline-inputs.json`. Cloud engineering/repo-work/durable-work skills were read; cloud-local skill-copy paths mentioned by the workspace were absent, so the supplied skill packages were used. The task-specific no-publication boundary takes precedence over general checkpoint guidance.

## Selected target and research provenance

The selected implementation target is `../CONTRACT.md`, SHA-256 `56c7b0c54670d95c4b012e925e8d931963951129663f49f94e58d6ed76950180`, read on 2026-10-30. It is a target, not an acceptance declaration. The report below is aligned to that target. `REPORT-initial-assumptions.md` and the original `filter-fixture-proposals.json` retain the initial research assumptions unchanged; their use of `==`, bool filter ordering, and provisional per-filter node caps is historical and must not drive implementation. Executed primitive/parser corpora and all raw probe outputs remain byte-for-byte unchanged. The distinctly named `filter-fixture-proposals-aligned.json` is the selected-target proposal corpus.

## Executive recommendation

Proceed only with a **filter-only extension**, using disjoint bracketed body clauses such as `[?age >= 18]` and `[?age / 2 < 33]`. Keep existing relational/head terms unchanged. Arithmetic results remain ephemeral filter values, never bindings or new relation-domain members. This avoids both generated recursive domains and collisions with legal user predicates named `eq`, `add`, `lt`, `true`, and `false`.

For floating values, prefer **integer-bit classification, zero canonicalization, equality, sorting, and interning**, together with supported-FP-state guards at typed construction-before-parse, public typed add, and public typed run boundaries. Native arithmetic remains strict per-node binary64, under checked supported ambient controls. A correctly rounded, bounded BigInt decimal parser can close the JavaScript long-literal portability gap without narrowing the accepted 128-byte literal grammar.

The language, limits, work accounting, and new error classes are now selected research targets in CONTRACT.md. The item-2 implementation and these filter fixtures have **not** been executed or accepted here.

## 1. What the accepted implementation actually does

Inspected files include `site/dist/engine-v2.js`, `site/tests/typed-engine.test.mjs`, `engine/src/temporal_core.cpp`, `temporal_typed_core.hpp`, `temporal_value_domain.hpp`, `engine/build.sh`, and relevant fixture/test documentation.

Observed, not inferred:

- Four tags are disjoint: `str`, `bool`, `i64`, finite `f64`. Wire i64 payloads and both temporal axes use canonical decimal strings; JS evaluates them as BigInt. No dates, references, nulls, or implicit coercions are admitted.
- Relational unification checks tag plus payload. Unlike tags are a nonmatch, not a coercion or an error.
- Deterministic output uses tag rank, then UTF-8 byte / boolean / integer / finite-float payload order. That cross-tag total order must not accidentally become the semantics of new ordering filters.
- Bare identifiers remain user predicates except read-only `triple/3`. Both the accepted browser and standalone native core successfully execute `eq(1,2)`, `add(5,2,100)`, and `lt(5,2)` as ordinary relations. Reserving these names would break legal programs.
- Signed integer minimum is a legal existing literal. `-0` and `-0.0` normalize to distinct i64-zero and f64-zero tags. Decimal exponents contain their own signs; numeric suffixes are rejected in full.
- `answer(1-2)`, nested function terms, and bracketed clauses are currently rejected. A proposed bracket parser must not silently enable arithmetic in existing head/relational terms.
- The actual accepted build script targets Linux x86-64 glibc, unstable DuckDB C API 2, metadata `C_STRUCT_UNSTABLE`, exact DuckDB `v2.0.0`. Historical README prose still describing stable v1 is stale and is not a reason to rename the feature or change this pin.

The accepted browser typed suite was run read-only: **71 passed, zero failed**. `accepted-browser-tests.tap` preserves the complete result. The standalone native probes are not DuckDB extension integration tests.

Important input SHA-256 values:

| File | SHA-256 |
|---|---|
| `site/dist/engine-v2.js` | `a564d71d3714f5db39110409a85e3f758371bed8ffbfb56ce826719328ea27bd` |
| `site/tests/typed-engine.test.mjs` | `e142d3f8b8321453d7a273e1424b324726acb72f33ba127276d74feb6bd582a5` |
| `engine/src/temporal_core.cpp` | `58eaddcd16de74a6f61dc245b81683e5f752c81d332b758271fa295929ac2275` |
| `engine/src/temporal_value_domain.hpp` | `987aaa9892fdbec72d63f656f0f3d893b09a632d5e7724a40f12f1d3b2fd2794` |
| `engine/build.sh` | `b4a745f66429185515cd8d000793f3f9052330ecf9415987abd2d79c3c4ecc7c` |

## 2. Fresh primary-source evidence

All links below were accessed **2026-10-30**. Source facts are separated from the recommendations later in this report. No secondary source is needed for the conclusions.

1. **ECMA-262 2026 numeric types.** Number arithmetic uses binary64 rounding; the Number-value mapping chooses nearest with even-significand ties. Number division by zero produces infinities/NaN rather than an application exception. BigInt division rejects a zero divisor and truncates toward zero, but BigInt itself has no signed-int64 bound. These language operations therefore need explicit domain checks. [ECMA-262 numeric types](https://tc39.es/ecma262/2026/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type).
2. **ECMA-262 conversion caveat.** `RoundMVResult` allows an implementation-defined choice for decimal inputs with more than 20 significant digits. Its raw comparison/conversion operations also contain coercion paths inappropriate for the four-tag domain. Consequently `Number(token)` is not, by specification alone, a universal correctly-rounded long-decimal oracle. [RoundMVResult](https://tc39.es/ecma262/2026/multipage/abstract-operations.html#sec-roundmvresult).
3. **ECMA-262 bit transport.** DataView exposes integer and float views over the same bytes, allowing a selected binary64 bit pattern to be read without decimal conversion. [DataView](https://tc39.es/ecma262/2026/multipage/structured-data.html#sec-dataview-objects).
4. **C++ draft arithmetic.** Signed results must be representable; integral division discards the fractional part, and a nonrepresentable quotient or zero divisor cannot be handled by blindly executing native signed `/`. [C++ multiplicative operators](https://eel.is/c++draft/expr.mul), [C++ expression preamble](https://eel.is/c++draft/expr.pre).
5. **C++ draft `from_chars`.** Full consumption and range errors are observable. The floating conversion wording permits at most two closest representable choices; the language-level wording alone is not a proof of identical last-bit behavior across every library. [C++ numeric conversion](https://eel.is/c++draft/charconv.from.chars).
6. **GCC arithmetic facilities.** Checked integer add/subtract/multiply builtins have defined overflow-checking behavior. GCC separately documents floating contraction, excess precision, and unsafe/finite-only optimizations; rejecting only `__FAST_MATH__` does not constitute a full strict-floating build contract. [GCC overflow builtins](https://gcc.gnu.org/onlinedocs/gcc/Integer-Overflow-Builtins.html), [GCC optimization controls](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html).
7. **Intel's current architecture manual.** Volume 1 revision 093, September 2026, describes distinct x87 and SIMD environments. MXCSR has exception-status bits 0–5, masks 7–12, rounding control 13–14, FTZ 15, and DAZ 6. DAZ changes subnormal inputs to zero. Status bits are sticky and are not control settings. [Intel SDM volume 1, sections 4.9 and 10.2.3](https://cdrdv2.intel.com/v1/dl/getContent/671436). The [manual catalog](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) was updated October 9, 2026.
8. **glibc controls.** Floating environments include rounding, masks, and status; `fegetexcept` reports enabled traps. State-setting helpers such as `feholdexcept` alter controls/status and should not be used merely to hide an unsupported host state. [glibc control functions](https://sourceware.org/glibc/manual/2.41/html_node/Control-Functions.html), [glibc rounding modes](https://sourceware.org/glibc/manual/latest/html_node/Rounding.html).
9. **Bounded database evaluation.** SQLite limits expression-tree depth because recursive tree walks consume stack; it also tests explicit resource limits. Soufflé documents that arithmetic functors can create nonterminating recursive programs. Datomic distinguishes already-bound predicate inputs from functions that bind new values. These sources support a bounded filter-only subset, not unrestricted functors. [SQLite limits](https://www.sqlite.org/limits.html), [Soufflé tutorial](https://souffle-lang.github.io/tutorial), [Datomic query reference](https://docs.datomic.com/query/query-data-reference.html).
10. **SQL is not automatically the oracle.** DuckDB 2.0 distinguishes `/` float division from `//` integer division and has configurable zero-division behavior; it also supports nonfinite float values. PostgreSQL documents optimizer-dependent expression order. A SQL comparator must encode the chosen tagged/error policy rather than assume ordinary WHERE expressions have it. [DuckDB numeric functions](https://duckdb.org/docs/2.0/sql/functions/numeric), [DuckDB numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric), [PostgreSQL expression evaluation](https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-EXPRESS-EVAL).
11. **Decimal parsing research.** Clinger's original report uses multiple-precision integers to resolve difficult decimal-to-binary conversion. Lemire's later work also distinguishes the general variable-precision problem from optimized short-significand paths. Our bounded literal workload does not require implementing a high-throughput table-driven parser to obtain exact rounding. [Clinger, 1990](https://scholarsbank.uoregon.edu/bitstreams/ba79372c-1283-483a-9915-24e45d1417dd/download), [Lemire, 2021/2022](https://arxiv.org/abs/2101.11408).

## 3. Selected operation matrix

This follows the selected CONTRACT.md, not an assertion that the accepted source already supports it.

| Operation | Same tag | Unlike tags |
|---|---|---|
| `=`, `!=` | Exact typed identity / its complement | `false` / `true`; no coercion |
| `<`, `<=`, `>`, `>=` | UTF-8 byte order for strings; signed i64; finite numeric f64. **Bool ordering is a type error.** | `TD_E_EXPR_TYPE` |
| `+`, `-`, `*`, `/` | i64→checked i64, f64→checked f64 only | Explicit type error |
| Unary numeric negation | Checked i64, canonical-zero f64 | Strings/bools are type errors |
| Relational repeated-variable match | Preserve existing unification | Preserve existing nonmatch |
| Output ordering | Preserve existing payload order | Preserve existing tag-rank order |

Evaluate expression operands before comparing results. Thus `[(1 / 0) = 'x']` is still a division error, not an opportunity to return cross-tag false without evaluating the arithmetic. For tests containing several faults, require whole-query failure; do not demand a specific first error code unless error precedence is separately specified.

### Selected new expression diagnostics

Use `TD_E_EXPR_TYPE`, `TD_E_EXPR_DIV_ZERO`, `TD_E_EXPR_OVERFLOW`, `TD_E_EXPR_UNDERFLOW`, `TD_E_EXPR_FLOAT_ENV`, `TD_E_EXPR_LIMIT`, and `TD_E_EXPR_UNBOUND`. Integer-range and nonfinite arithmetic outcomes map to OVERFLOW; nonzero multiply/divide-to-zero maps to UNDERFLOW. LIMIT covers structural admission and expression AST/string-work precharge; UNBOUND is a static grounding check. Other listed classes describe expression/type/FP failures. Preserve prior static literal, old-language syntax, and existing outer resource diagnostics; the historical executed adapters' short research categories are not new source error codes.

### Exact i64 behavior

Use BigInt in JS and checked native arithmetic, never Number intermediates or wrapping `BigInt.asIntN`. Every node checks `[-2^63, 2^63-1]`. Examples: `-7/2 = -3`, `7/-2 = -3`, `-7/-2 = 3`; `MIN/-1`, `-MIN`, `MAX+1`, and `MIN-1` are errors. Wire output remains canonical decimal strings, never raw BigInt. Both temporal axes remain comparisons on exact integers; endpoint checks need no subtractive arithmetic.

### Exact f64 behavior

Recommended contract: each `+`, `-`, `*`, `/`, and unary negation node operates on admitted binary64 operands and rounds separately to nearest-even. Preserve finite subnormals. Reject a zero divisor **before** division, including both signs of zero. Reject nonfinite results at each node. Normalize every zero result to positive zero. Reject a nonzero exact product or quotient that rounds to zero.

**Why add/sub need no nonzero-underflow detector:** every finite binary64 operand is an integer multiple of `2^-1074`. Its exact sum or difference is another such multiple. A nonzero exact sum/difference therefore cannot be smaller than the minimum subnormal. A zero add/sub result is exact cancellation or zero arithmetic, not nonzero-to-zero rounding. This is a mathematical inference under gradual binary64 semantics, not permission to enable FTZ/DAZ.

Do not use a final-expression-only check: `(1e308 * 1e308) * 0.0` has a range fault at the multiplication; `(1e-308 * 1e-308) / 1e-308` has a zero-underflow fault at its first node. Neither may be optimized into a harmless-looking final value. No FMA contraction or reassociation is permitted.

## 4. Focused ambient-FP-state blocker and preferred resolution

### Verified failure in the accepted native value path

`accepted-fp-state-probe.cpp` compiles the accepted core read-only and sets controls only inside its isolated process, restoring them before exit. Its raw output is:

```text
normal payload=1 compare_zero=1
normal literal=1
daz payload=0 compare_zero=0
daz ERROR TD_E_PROGRAM_SYNTAX: ... nonzero float literal underflows to zero
restored 8064
```

The hexadecimal payload `1` is the minimum positive subnormal. DAZ causes the accepted `value == 0` normalization to erase it before any proposed arithmetic. Therefore an arithmetic-only guard is insufficient. This is a focused research blocker for the stronger numeric contract; no accepted code was patched here.

### Alternative A: guard every float primitive

With existing floating comparisons, complete public coverage requires guards before `Value::f64` normalization, f64 equality, f64 output comparison, typed construction-before-parse, public typed add, and public typed run. Returning/copying stored bits in `as_f64`, `tag`, or memcpy does not itself need a guard. Rechecking add/run matters because the caller may change its thread controls between construction, admission, and execution.

A target-specific raw check can require:

- x87 exception masks 0–5 all set; x87 rounding bits 10–11 zero.
- MXCSR masks 7–12 all set; rounding bits 13–14 zero; DAZ 6 and FTZ 15 zero.
- Ignore pre-existing sticky status bits. Never clear them to make admission pass.

`fegetround()` alone is not enough: the probe independently changed MXCSR rounding and observed `fegetround()==FE_TONEAREST` while the SSE result rounded upward.

### Alternative B: integer-bit value primitives — recommended

For finite binary64 bits `u`, reject exponent field `0x7ff`; canonicalize to zero when `(u & 0x7fffffffffffffff)==0`; compare equality by canonical bits. For finite numeric sorting, compare unsigned keys `~u` for negative values and `u | 0x8000000000000000` for nonnegative values. This is an inference from IEEE encoding, independently tested against exact Fraction values.

Apply this consistently to `Value::f64`, equality, output ordering, and TypedDomain validation/zero/intern logic. A residual `value == 0` or raw float comparison in any of those paths would reintroduce the DAZ gap.

The isolated bitwise prototype produced **the same exact ordering and identities for 1,808 unique finite patterns in normal, DAZ, FTZ, and MXCSR-upward environments**. It rejected five infinity/NaN patterns each time and removed negative zero. These are prototype tests, not verification of a patch.

Retain typed constructor/add/run guards before parser/evaluator work. Per-node guards are redundant inside a synchronous evaluator with no caller callbacks or control-state mutation. Guard any independently callable arithmetic entry or give it a documented checked-entry precondition. Arbitrary hostile signal handlers/allocators changing controls mid-call are outside this bounded prototype's support claim.

Build must explicitly enforce binary64 SSE2 evaluation, no contraction, and no finite-only/reassociation assumptions. `numeric_limits<double>::is_iec559` alone does not exclude excess intermediate precision. Actual GCC 14.2 target macros here are `__SSE2__=1` and `__FLT_EVAL_METHOD__=0`; test the actual build, not just the flags' spelling. An individual `-ffinite-math-only` option also deserves rejection even if `__FAST_MATH__` is absent.

“No host-state mutation” should mean no control-mode changes by the engine. Ordinary arithmetic can set hardware sticky status bits. Promising absolutely unchanged status flags would require a separate, explicit design.

### Probe cost, not a query-performance claim

A randomized/interleaved isolated benchmark used 21 measured samples of 2,000,000 iterations, after warmup. Disassembly confirms guard calls and `fnstcw`/`stmxcsr` were not hoisted away.

| Synthetic operation | Median ns/iteration |
|---|---:|
| Unguarded noinline add | 1.42 |
| Raw x87+MXCSR guard only | 7.41 |
| libc `fegetround` + `fegetexcept` + MXCSR guard only | 13.86 |
| Raw-guarded noinline add | 7.79 |
| libc-guarded noinline add | 14.76 |

This supports avoiding repeated guards in inner-loop identity/order operations. It does **not** estimate end-to-end DuckDB/browser overhead, nor is it a performance acceptance result.

## 5. Correctly rounded bounded JavaScript decimal parsing

The isolated `decimal-parser-prototype.mjs` never invokes `Number(token)` or `parseFloat` on a decimal literal. It preserves the strict accepted numeric spelling, tag distinction, 128-character ASCII numeric cap, lexical zero, signed-zero normalization, and nonzero-underflow rejection.

Algorithm recommendation:

1. Enforce the token-length bound and complete strict ASCII grammar before conversions. Integer-only spelling still follows the i64 route.
2. Collect coefficient digits and fractional digit count. If all coefficient digits are zero, return positive f64 zero **after** validating the entire exponent syntax, even for an enormous exponent.
3. Parse the bounded exponent text as BigInt and compute effective decimal exponent. Remove harmless coefficient zeroes. Compute adjusted decimal magnitude `digits(coefficient)-1+effective_exponent` using bounded integers.
4. Adjusted magnitude `>=309` is certainly beyond finite binary64; `<=-325` is certainly nonzero-to-zero underflow. Reject **before** constructing a power of ten.
5. Surviving 128-character inputs conservatively require effective exponent only in `[-451,308]`. Build an exact BigInt numerator/denominator with those bounded powers.
6. Determine the binary exponent by integer bit lengths and one exact comparison. Use integer quotient/remainder to round the scaled significand, ties to even. Handle subnormal carry into the minimum normal, normal carry into the next exponent, overflow, and rounded zero explicitly.
7. Assemble the selected bits with DataView. Do not reconvert a decimal rendering into Number.

The prototype agrees with an independent Python Fraction/integer-rounding oracle on **2,963** decimal cases. The corpus includes 90-digit numbers just to either side of random binary64 midpoints, signed zeros, extreme exponent text, subnormal/overflow boundaries, exact long halfway decimals, invalid numeric families/suffixes, and a 129-character token rejection. No huge exponent is exponentiated. Observed maximum power was 424 and largest working integer was 1,435 bits. Instrumented complete-corpus passes took 16.30–23.84 ms on Node v24.22.1; this measures a research prototype with instrumentation, not an optimized engine parser.

The current accepted standalone native parser matches **2,962 applicable numeric cases** on this GCC/libstdc++ x86-64 build in the normal FP environment. The full-language boolean `true` was excluded from this decimal-only comparison. This is valuable pinned-runtime evidence, not a proof of all C++ library implementations. Native `from_chars` and wire-number handling remain separate decisions.

Wire f64 numbers already arrive as binary64 JS values; this parser does not change the wire schema. Long-decimal JSON-text conversion upstream of that boundary is a separate transport issue.

## 6. Grammar, safety, and error-barrier fixtures

Recommended grammar isolation:

- Body items are either an unchanged relational atom or one bracketed comparison. Each side is a bounded scalar arithmetic expression. No expression assignments, generated outputs, arbitrary functions, chained comparisons, boolean conjunction syntax, exponentiation, modulo, or head/relational expression terms.
- Every filter variable must occur in a positive relational atom of the **same rule**, not merely another filter. Equality does not bind. With the full-candidate barrier, a variable may be bound by a relational atom appearing textually after its filter.
- Validate every rule's syntax, supported operators, arity, variable safety, and structural bounds before evaluation, including dead/empty rules.
- Evaluate filters only for complete relational join candidates. Evaluate **all** filters for such a candidate, so false does not mask an error, and do this before head deduplication. Do not evaluate arithmetic on a join prefix that is later eliminated by another relation.
- Selected empty-join behavior: no runtime arithmetic is evaluated when no complete candidate exists; a body with only ground filters has one empty candidate and evaluates its filters once before seeding. Invalid literal payloads remain static admission errors, even behind empty joins; only valid-literal arithmetic faults are deferred. No eager folding may change that distinction.
- Never return partial rows on any error. The next independent query must remain healthy.

Tokenization needs explicit tests for `1e-2` versus `1-2`, exponent `+`, adjacent binary minus and negative operands, signed integer minimum, `-(-MIN)`, zero literals, suffix garbage, comments touching numbers/operators, strings containing brackets/comment characters, doubled quotes, escapes, and ASCII-only whitespace. A generic unary parser must not first reject the magnitude `9223372036854775808` and thereby break the already-legal literal `-9223372036854775808`.

The selected comparison spellings are **exactly `= != < <= > >=`**. `==` and `<>` are unsupported, as is unary plus. Bool ordering is `TD_E_EXPR_TYPE`; its existing false-before-true output sorting remains separate. Legacy `eq/add/lt` programs are included unchanged.

## 7. Resource bounds and performance implications

Selected structural limits: **16 positive relational atoms and 16 filters per rule, separately; 256 expression AST nodes per rule and 4,096 per program; AST height 32 including the comparison root**. Every literal/variable leaf has height one; computed unary, binary arithmetic, and comparison roots count as nodes. Separately cap active parenthesis/computed-unary parser descents at 32; an adjacent signed numeric sign is lexical, not a computed-unary node.

Count **actual AST height**, parser grouping/unary nesting, and total nodes separately. A flat left-associative chain can create a deep AST without nested parentheses. Reject before descending/allocating the over-limit node; recursive evaluators, destructors, and diagnostic walks need the same bound. Neither a 64 KiB source limit nor a parenthesis-only check proves stack safety.

Selected work accounting preserves old tuple-candidate charges exactly for filter-free programs. **Before each filter, precharge its complete AST node count once**; then **before same-string comparison charge `ceil((left_UTF8_bytes + right_UTF8_bytes)/64)`**. Charge false filters too. Expression AST/string-work precharge exhaustion uses `TD_E_EXPR_LIMIT` with max_work context; old tuple-candidate exhaustion retains its existing diagnostic. A work failure can therefore precede a later arithmetic fault. No per-node budget-dispatch loop is required. Compare strings by UTF-8 bytes, not JS UTF-16 `<`; the summed-byte charge covers browser encoding work. Do not charge output sorting as expression work, parse per candidate, cache persistently, or intern ephemeral arithmetic results. This is not complete allocator/wall-clock accounting.

The full-candidate/error barrier restricts early filter pushdown; benchmark that chosen semantics explicitly. A filter failing early must not hide another filter's arithmetic fault. Any optimized native path and independent naive reference must agree on results/errors, but their internal work/round counters need not match.

## 8. Independent corpus and handoff

### Executed checks

| Check | Result | Evidence |
|---|---|---|
| Accepted browser typed suite | 71 pass, 0 fail | `accepted-browser-tests.tap` |
| Accepted browser/native name and literal probes | Matching documented observations | `accepted-grammar-results.json`, `accepted-native-grammar-results.json` |
| Exact-rational arithmetic vs JS adapter | 2,060 cases, 0 mismatches | `oracle.py`, `arithmetic-fixtures.json`, `js-numeric-results.json` |
| Exact-rational arithmetic vs isolated checked C++ adapter | 2,060 cases, 0 mismatches | `cpp-numeric-summary.json`, `cpp-numeric-raw.txt` |
| Native FMA/rounding/FTZ/DAZ demonstrations | Expected distinct bit patterns observed | `cpp-environment-strict.txt`, `cpp-environment-contract.txt` |
| Accepted native DAZ admission probe | Focused gap reproduced | `accepted-fp-state-results.txt` |
| Bitwise value proposal vs exact Fraction order | 1,808 finite values × 4 states, all match | `bitwise-value-summary.json` |
| Bounded decimal JS proposal vs exact oracle | 2,963 cases, 0 mismatches | `decimal-parser-results.json` |
| Accepted native numeric parser vs oracle | 2,962 applicable cases, 0 mismatches | `decimal-native-summary.json` |

Arithmetic outcome coverage: 1,031 i64 and 1,029 f64 cases; 1,647 successful results, 312 integer-range errors, 60 float-range errors, 36 nonzero-to-zero-underflow errors, and 5 zero-division errors. Randomness is deterministic and seeds are in the scripts. The Python arithmetic oracle decodes input bits to exact Fraction values and uses integer rounding; it neither imports nor mirrors the native fixed-point evaluation algorithm.

### Unexecuted item-2 proposals

`filter-fixture-proposals-aligned.json` contains **365 UNRUN selected-target cases**, deriving the initial 184 proposals and adding 181 cases. It uses single `=`, rejects `==`/`<>`, rejects bool filter ordering, and maps dynamic expression failures to the selected markers. It includes **70 exact bitemporal age/range snapshots**, complete tag/operator matrices, static-literal versus deferred-arithmetic distinctions, compact minus/exponent cases, 16-positive-plus-16-filter admission, 256/257 rule-node and 4,096/4,097 program-node boundaries, comparison-inclusive height 32/33, parser descents 32/33, and summed-UTF-8 work charges. Temporal poison cases make an incompatible typed age visible on only one rectangle of the two clocks. The original 184-case file is retained unchanged solely as a clearly identified initial-assumptions record.

The age oracle directly scans half-open temporal rows with exact Python integers and applies independent integer range/arithmetic conditions. It does not call a Datalog implementation. Exercise every data case with input order reversed and duplicates added; compare browser, native extension, and stored/reloaded facts where their supported clocks overlap. Also retain full-width clock fixtures above `2^53` and both int64 extrema. Inject malformed inactive facts to verify admission occurs before temporal filtering.

For SQL comparison, explicitly preserve tag identity and checked truncating integer division; an ordinary cast-to-double or `/` query is not the oracle. Error tests must verify no partial result and subsequent-query health. Native vectorized-batch errors need their own integration checks.

### Still unrun / not claimed

No proposed item-2 parser, native/browser evaluator patch, SQL integration path, storage reload parity, sanitizer campaign, full benchmark matrix, extension ABI/load test, CI run, or deployment was executed for item 2. The primitive/prototype tests here cannot establish those outcomes. Exact unsupported-FP-state error coverage and control preservation must be tested on the eventual implementation.

The directory's `SHA256SUMS` records the final local artifacts; `publication-manifest.json` lists text/source files only and excludes executable binaries and checksum-control cycles. `sources.json` records source URLs/access dates. Reproduction commands are in `REPRODUCE.md`. `alignment-validation.json` verifies preservation of the original executed artifacts and the selected contract hash. `selected-contract-read-snapshot.md` is a non-authoritative byte-for-byte record of the contract version read for this alignment; the parent CONTRACT.md remains authoritative.
