# Item 2 adversarial semantic specification

Research specification only, 2026-10-30. **None of these are claimed as project acceptance tests already executed.** Programs use the coordinator-selected body-only `[expr OP expr]` syntax, six comparisons (`= != < <= > >=`), arithmetic `+ - * /`, unary `-`, and arithmetic parentheses. Equality/inequality are total tagged identity. Every case must retain its semantic expectation. A “fault” is an explicit invocation error with no partial rows, not false/NULL/silent omission.

For programs using `empty`, define it without facts using `empty(?x) :- empty(?x).`; this is safe positive recursion with an empty least fixed point. Ground filter-only rules are assumed supported as preferred by the final research recommendation. Core/native/browser tests must distinguish structural parse rejection from candidate-time faults.

## A. Admission, binding, and namespace compatibility

| ID | Program/change | Required observation |
|---|---|---|
| A01 | `answer(?x) :- [?x = 1].` | Static ungrounded filter/head variable rejection, even with empty input. |
| A02 | `p(1). answer(?y) :- p(?x), [?y = (?x + 1)].` | Static rejection; equality/arithmetic does not bind `?y`. |
| A03 | `answer('x') :- [?x = ?y], [?y = ?x].` | Static rejection; equality cycles do not create a domain. |
| A04 | `p(1). answer(?x) :- [?x > 0], p(?x).` | Accepted, same result as filter last. |
| A05 | `p(1). answer(?x) :- p(?x), [1 = 1], [?z = 1].` | Whole-program static rejection; earlier valid data/filter does not hide `?z`. |
| A06 | `empty(?x) :- empty(?x). answer('x') :- empty(?x), [pow(2,3) = 8].` | Unsupported function rejected statically despite no candidate. |
| A07 | Unsupported `==`, `!==`, `<>`, `&&`, `||`, chained `1 < 2 < 3`, prefix `[eq(1,1)]`, unary `+`, extra bracket, or trailing token. | Static rejection before fact execution; no generic function or Boolean-expression fallback. |
| A08 | `eq(1,1). add('a','b'). div('c','d'). answer(?x) :- add(?x,'b').` | Ordinary predicates retain legality and meaning. No builtin-name reservation. |
| A09 | `filter('x'). true('y'). answer(?x) :- filter(?x).` | Previously legal identifiers are not confiscated. |
| A10 | `p((?x + 1)) :- p(?x). answer('x').` | Arithmetic in a head is rejected, not converted to generation. |
| A11 | `p(1). answer(?x) :- p((?x + 1)).` | Arithmetic in relational terms is rejected. |
| A12 | Exactly 16 positive atoms plus 16 filters; independently exceed either cap. Exactly 256 filter AST nodes/rule and 4,096/program, height 32 including comparator, syntax nesting 32, and one beyond each. Also test a long flat left chain. | Boundaries match selected contract. Filter AST budgets do not count ordinary head/relational terms; parser nesting and AST height are distinct. |
| A13 | 1 MiB numeric token or very deep parentheses in otherwise tiny program. | Existing program/numeric/depth admission limit rejects promptly; no unbounded BigInt parse. |
| A14 | Comments containing brackets/keywords; quoted strings containing commas, `]`, `add(...)`, escaped quotes. | Tokens inside comments/strings do not change grammar. Existing quoted-string behavior preserved. |
| A15 | Feed new syntax to legacy core/API/browser path. | Explicitly unsupported, with no change to previously legal legacy programs. |

## B. Equality/ordering matrix

For every admitted tag pair (16 ordered combinations), test `=` and `!=` with both equal-looking and distinct payloads. Selected semantics: unlike tags are false/true respectively; same-tag values use identity. Same-tag-only equality is a documented alternative, not the selected expectation.

| ID | Filter/program | Required observation |
|---|---|---|
| B01 | `answer('x') :- [1 = 1.0].` | No rows; no coercion. |
| B02 | `answer('x') :- [1 != 1.0].` | One `x` row. |
| B03 | `true = 1`, `false = 0`, `'1' = 1`, `'true' = true` | False, all reversed pairs also false. |
| B04 | `-0.0 = 0.0`; separately `0 = 0.0` | True for normalized f64 zero; false across tags. |
| B05 | `'' =  ''`, `'A' = 'a'`, canonically equivalent but differently encoded Unicode strings. | True only for exact same string; no locale/case/Unicode normalization. |
| B06 | `1 < 2.0` and reverse pair, `'2' >= 2` | Type error only when a candidate exists. |
| B07 | `false < true`, `true <= true`, `true > false`, `false >= false` | Invalid ordering/type error, not bool rank ordering. |
| B08 | All six comparisons on equal/smaller/larger i64 and finite f64 values, negative values and extrema. | Exact expected booleans; no subtraction-based comparator overflow. |
| B09 | Strings `U+E000` and `U+10000`, prefixes, combining marks, multibyte characters. | UTF-8 byte lexicographic order; differs from JS native `<` in the targeted case. |
| B10 | Permute input insertion order so intern IDs reverse string/numeric magnitude. | Filter outcomes unchanged; no dictionary-ID ordering. |
| B11 | Heterogeneous relation joined by repeated variables, without filters. | Unlike tags are nonmatches, never new join type errors. |
| B12 | `(1 / 0) = (1 / 0)` | Fault; identical expressions do not allow an optimizer to replace equality with true. |

## C. Checked i64 arithmetic

Use `answer('ok') :- [EXPR = EXPECTED].` for expected successful values. Every literal remains i64 (no decimal point/exponent). Range checks apply at **each node**, including results compared with unlike tags.

| ID | Expression | Expected |
|---|---|---|
| C01 | `(MAX + 0)`, `(MIN - 0)`, `(MIN * 1)`, `(MIN / 1)` | Corresponding boundary value. |
| C02 | `(MAX + 1)`, `(MIN - 1)`, `(MAX - -1)` | Overflow error. |
| C03 | `(MIN * -1)`, `(MAX * 2)`, `(3037000500 * 3037000500)` | Overflow error; never signed UB/wrap. |
| C04 | `(MIN / -1)` | Overflow error before native division. |
| C05 | `(0 / 0)`, `(1 / 0)`, `(MIN / 0)` | Divide-by-zero error. |
| C06 | `(-7 / 2)`, `(7 / -2)`, `(-7 / -2)` | `-3`, `-3`, `3`; not Python floor division or float rounding. |
| C07 | `(-1 / 2)`, `(1 / -2)` | Canonical integer zero. |
| C08 | `((MAX + 1) - 1)` | Intermediate overflow even though algebraic final result would fit. |
| C09 | `(MAX * 0)`, `(MIN - MIN)`, `(MIN + MAX)` | `0`, `0`, `-1`. |
| C10 | Each arithmetic operator with str/bool, or i64/f64 mixed operands, in both orders. | Type error; no string concatenation or numeric promotion. |
| C11 | Values around `2^53`, `MAX`, `MIN` through every supported boundary. | Exact i64 comparisons and operations; never Number/string lexicographic arithmetic. |
| C12 | Unary `-` on MIN, `-?x` for numeric/str/bool operands, `-(-9223372036854775808)`, signed literal `-9223372036854775808`, compact `1-2`, `1+-2`, and exponent `1e-3`. | MIN literal remains legal; computed negation of MIN overflows at runtime; str/bool negation errors; exponent sign is not subtraction. |
| C13 | Repeated candidates, reused variables, multiple rules using same variable names. | No binding mutation, stale temporary, or cross-rule cache leakage. |

## D. f64 arithmetic, precision, and environment

Use decimal/exponent literals to select f64, including constants such as `1.0` and `0.0`. Selected policy rejects a nonzero multiply/divide result rounded to zero; exact add/sub cancellation becomes canonical +0.

| ID | Expression/scenario | Expected under selected checked policy |
|---|---|---|
| D01 | `(0.1 + 0.2)` compared to `0.3` and `0.30000000000000004`. | First unequal, second equal; no approximate/decimal equality. |
| D02 | `(1e308 * 2.0)`, `(MAX_FINITE + MAX_FINITE)` | Overflow/nonfinite error. |
| D03 | `(1.0 / 0.0)`, `(0.0 / 0.0)`, negative-zero input through the wire. | Divide-by-zero error; never Infinity/NaN. |
| D04 | Minimum positive subnormal divided by `2.0`. | Explicit underflow-to-zero error: both operands are nonzero. Finite subnormals remain allowed. |
| D05 | Twice minimum subnormal divided by `2.0`. | Minimum subnormal, not FTZ zero. |
| D06 | `(tiny - tiny)`, `(tiny * 0.0)`, zero numerator division, and negative nonzero mul/div results rounding to zero. | Exact cancellation/zero operands yield canonical +0; negative nonzero underflow faults. A blanket result-zero error check is invalid. |
| D07 | Left versus right-associated `1e308 + -1e308 + 1.0` ASTs. | 1.0 versus 0.0; no reassociation. |
| D08 | FMA-sensitive multiply-then-add, overflow before later cancellation. | One checked binary64 operation per node, no fusion hiding intermediate overflow/rounding. |
| D09 | Direct native subprocess sets non-nearest rounding. | Explicit environment rejection, or proved scoped normalization with exact restoration; never silent cross-path drift. |
| D10 | Direct native subprocess toggles FTZ/DAZ while rounding remains nearest; test both arithmetic and minimum-subnormal comparison/zero normalization. | Explicit rejection before sensitive typed value handling, or proved normalization/restoration; checking `fegetround` or only guarding arithmetic is insufficient. |
| D11 | Input NaN/Infinity and unsupported tags, including inactive temporal rows. | Existing input validation rejects all supplied invalid payloads before slicing; not a new filter false. |
| D12 | Fuzz admitted finite binary64 operands with exact rational expected result rounded once, plus near-overflow/subnormal/tie cases. | Match pinned policy and bits after zero normalization, or exact documented fault. |

## E. Full-candidate barrier and static/runtime distinction

| ID | Program/scenario | Required observation |
|---|---|---|
| E01 | `p(0). empty(?x) :- empty(?x). answer(?x) :- p(?x), empty(?x), [(1 / ?x) > 0].` | Empty success, no runtime fault. All source/physical relation order permutations agree. |
| E02 | Same but literal `(1 / 0)` instead of variable denominator. | Still empty success. A constant folder must defer the fault. |
| E03 | Same empty join with literal mixed-tag ordering, bool ordering, i64 overflow, mixed-tag arithmetic. | Runtime faults dormant; grammar remains valid. |
| E04 | Same empty join with unknown comparator/function, malformed syntax, ungrounded filter variable. | Static rejection despite emptiness. |
| E05 | `p(0). answer(?x) :- p(?x), [?x != 0], [(1 / ?x) > 0].` | Divide-by-zero error despite false `ne`; filter-order permutations also error. |
| E06 | Add any always-false filter to a previously erroring complete candidate. | Must remain an error, not become empty success. |
| E07 | Replace always-false filter with an actually empty relational atom. | No complete candidate; runtime error may correctly disappear. |
| E08 | Put filters before, between, after matching relational atoms. | Same rows/error presence independent of textual placement. |
| E09 | Zero-relation body `answer('yes') :- [1 = 1].` | One seeded head. |
| E10 | Zero-relation body `answer('no') :- [1 = 2].` | Empty result, never unconditionally seeded. |
| E11 | Zero-relation body `answer('bad') :- [(1 / 0) > 0].` | Active fault on the empty binding. |
| E12 | Zero-relation body with any variable; even `[?x = ?x]`. | Static ungrounded-variable rejection. |
| E13 | Multiple filters in zero-relation body: false plus valid-grammar fault. | Fault dominates, even during seed. |
| E14 | Separate safe-relation guard as in RESEARCH.md, then its inlined version. | Separate version succeeds without zero; inlined strict version errors. Do not treat these as an allowed optimizer equivalence. |
| E15 | Actual empty join, but operands contain bare `9223372036854775808`, `1e309`, or `1e-400`. Compare with admitted operands in `MAX + 1` or `1e308 * 2.0`. | Existing invalid scalar literals still fail static admission; admitted-operand arithmetic faults remain dormant without a full candidate. |

## F. Deduplication, recursion, and semi-naive completeness

| ID | Program/scenario | Required observation |
|---|---|---|
| F01 | `p(0). answer('ok'). answer('ok') :- p(?x), [(1 / ?x) > 0].` | Fault before head-seen optimization; no partial `ok`. |
| F02 | Two candidates share a fixed head, one filters true and the other faults. Reverse insertion/order. | Always fault; pending-head duplicate suppression cannot skip filters. |
| F03 | Error rule derives an unused predicate while a separate ground `answer` exists. | Whole-program error, not demand-pruned success. |
| F04 | `n(1). edge(1,2). edge(2,0). n(?y) :- n(?x), edge(?x,?y). answer('ok'). bad('x') :- n(?x), [(1 / ?x) > 0].` | Fault discovered when recursive zero reaches `n`, despite prior answer. |
| F05 | Join has several recursive atoms/delta-driver choices; an error match requires the last-added tuple in a non-first atom. | All variants eventually expose the error. Filters are never delta drivers. |
| F06 | Repeated identical relational atom, repeated variable positions, self-loop and cycle. | No missed filter/fault; set semantics and termination retained. |
| F07 | Relational domain `{0,1,4}`, seed `n(0)`, derive `n(?y)` from `n(?x), dom(?y), [(?x + 1) = ?y]`. | Reach only 0 and 1. Temporary 2 is not stored/generated. |
| F08 | Recursive rule with filter false for all complete candidates. | Fixed point reached with no new heads; no artificial filter delta/extra facts. |
| F09 | Duplicate pure filters or duplicate relational proofs. | Logical rows/error presence unchanged; counters may change. |
| F10 | Instrumented/resource-near-boundary dictionary check on filters whose intermediate results are absent from input/literals. | No arithmetic-result interning or generated dictionary growth. Instrumentation is evidence, not new public API. |
| F11 | Distinct rules seed equal head tuples, one ground filter false/fault. | False is not seeded; fault cannot be hidden by other seed. |
| F12 | Work/round/fact exhaustion while valid answer tuples already exist internally. | Explicit resource error, no partial answer. Do not require same failure timing/counters across implementations. |
| F13 | A filter whose AST precharge exactly exhausts remaining work, then one unit less; same-string lengths around combined 0/1/63/64/65 bytes; false filters before costly/faulting filters. | Full AST charged once before evaluation; string charge is ceiling of SUM of both UTF-8 byte lengths divided by 64. False never suppresses charges/faults; insufficient work can precede semantic fault. |
| F14 | Existing filter-free programs and counters, including enough ordinary terms to exceed 4,096 if mistakenly counted as expression nodes. | Existing admission/counters retained; new node budgets apply only to filter ASTs. No new charge for result sorting. |

## G. Application result oracles and temporal boundaries

Run actual native integration, direct core, browser reference, independent oracle, and persisted-query adapter where supported. Use exact tags, not display strings.

1. **Age threshold:** entities with i64 ages -1, 0, 17, 18, 19, 65, MAX; `[?age >= 18]` includes exact threshold. A str `'18'` or f64 `18.0` must not be silently promoted for an i64 ordering literal.
2. **Inclusive/exclusive ranges:** i64/f64 lower/upper edges with `>= / <`, `> / <=`, reversed bounds, equal bounds, negative values; mixed types on a complete witness error.
3. **Arithmetic age/range filter:** use already bound birth-year and snapshot-year i64 values with subtraction; no generated answer cells. An overflowing duration errors even if another filter would be false.
4. **Time as i64 application scalar:** negative epoch, 0, 1, MIN/MAX; exact compare and subtraction semantics. No implicit timestamp tag, `now`, timezone, or calendar claim.
5. **Bitemporal half-open edges:** for `[vf,vt) × [tf,tt)`, test `vf-1,vf,vt-1,vt` and analogous transaction points, including corrections with old/new known-time intervals.
6. **Inactive incompatible application value:** a valid typed string in an inactive `age` triple cannot produce a filter fault because it is not a relational candidate; activate it and the ordering fault appears.
7. **Malformed inactive payload:** invalid UTF-8/unsupported tag/nonfinite f64 still fails existing input validation before slicing. Distinguish this from a valid-but-filter-incompatible inactive value.
8. **Facts with duplicate e/a/v at disjoint intervals:** temporal slice plus relation set semantics stays exact, with no duplicate outputs or wrong known-time selection.
9. **Independent SQL baseline:** explicitly compare tag/payload and use intended numeric operation semantics; DuckDB integer `/` is not the selected i64 `/`. The SQL planner's error timing is not the language oracle.
10. **All supported surfaces:** verify rebuilt native artifact and real LOAD, not only an API-only control or old cached extension; distinguish direct/SQL/adapter/reference coverage from deployed legacy UI (unchanged).

## H. Metamorphic campaign and pass accounting

- Permute source relation/filter order, input order, rule order, and delta-driver availability, staying within generous shared caps. Rows or error presence must agree. Error details may vary only when multiple genuine faults exist and the contract permits any witness.
- Alpha-rename variables and user predicates, including builtin-looking predicate names; results unchanged.
- Add duplicate facts or equivalent proofs; set answers unchanged, and faults not suppressed by projected-head equivalence.
- Add an always-true filter; no logical change. Add a false filter to a faulting full witness; fault remains. Add an empty relation to remove the witness; runtime fault becomes dormant but structural errors remain.
- Compare filter arithmetic temporaries with independently calculated expected values through booleans; do not add computed values to heads just to inspect them.
- Track passed, failed, and not-run tests separately. Keep parser fuzzing, native sanitizer checks, oracle agreement, host integration, timing, and UI checks as distinct evidence classes. A successful toy probe or build is not feature acceptance.
