# Selected item 2 contract

Research-selected contract, 30 October 2026. This is the implementation target, not an acceptance declaration. Source baseline is remote e42a8adc and exact source tree 58931fcd2e09776f55bdf87f965540de1cbcc7df. Preserve the accepted four-tag model, legacy td_query behavior and filter-free counters. The actual unstable DuckDB C API v2 remains pinned to official v2.0.0; typed function-name version and engine ABI version are separate axes.

## Language

Only the typed language gains body-only square-bracket comparisons:

```datalog
answer(?person) :- triple(?person,'age',?age), [?age >= 18], [?age < 65].
answer(?person) :- triple(?person,'birth_year',?year), [2026 - ?year >= 18].
answer('yes') :- [(1 + 2) * 3 = 9].
```

Each bracket contains exactly one infix comparison: `= != < <= > >=`. Its two operands are expressions using existing typed literals/variables, parentheses, binary `+ - * /` and computed unary `-`. Multiplication/division bind tighter than addition/subtraction; binary operators associate left. No `==`, `<>`, comparison chaining, function calls, modulo, exponentiation, casts, truthiness, assignment, string concatenation or Boolean connectives inside brackets. A comma separates filters/relational atoms; it does not provide procedural short-circuit guards. Existing names such as eq/add/div/filter/true remain ordinary predicate names outside literals.

Heads and relational atom arguments remain simple existing terms: expressions cannot generate cells, assignments or new variable bindings. Every variable in a head/filter must occur as a direct term in a positive relational atom of the same rule. Filters may appear anywhere in source order, but execute only after the complete relational candidate is bound. No temporary arithmetic result is interned or stored in a relation. Program literals may retain normal bounded interning.

Preserve negative int64 minimum as an adjacent signed numeric literal, `-9223372036854775808`, rather than first attempting to admit its out-of-range positive magnitude. Computed negation of that minimum is runtime overflow. Exponent signs remain part of numeric tokens; compact `1-2`, `1+-2`, `1--2`, `-?x` and `-(?x)` need explicit tests. Unary plus is unsupported. Existing strict numeric and string admission remains unchanged outside the expression lexer.

## Values and numeric operations

- `=` is total tagged identity; unlike tags return false. `!=` is its complement. There is no numeric coercion. Ordinary relational unification still treats different tags as nonmatches.
- Ordering requires equal tags and supports string, int64 and finite float64 only. Bool ordering and unlike-tag ordering are `TD_E_EXPR_TYPE`. String equality/order use exact unsigned UTF-8 bytes, not locale/collation, insertion IDs or JS UTF-16 order. Canonical output sorting keeps its separate existing total tag rank and bool order.
- Arithmetic requires equal numeric tags. Int64 operations use mathematical range checks at EACH node; add/subtract/multiply and unary negation overflow outside signed int64. Division truncates toward zero, with zero and MIN/-1 checked before execution. No undefined native signed overflow or float intermediates for integers.
- Float64 arithmetic performs one nearest-even binary64 operation at EACH AST node, with no contraction or reassociation. Division by zero is explicit. Nonfinite results are overflow. Finite subnormals remain supported. Nonzero-input multiply/divide producing zero is `TD_E_EXPR_UNDERFLOW`; multiplication by zero and exact addition/subtraction cancellation are valid canonical +0. No epsilon comparison or exact-real-arithmetic claim.
- Literal out-of-range/nonfinite/nonzero-to-zero admission stays a STATIC literal error even behind an empty join. Valid-literal arithmetic faults remain candidate-time outcomes.

## Native floating-point robustness

Make standalone finite value primitives state-independent using IEEE bits: exponent-bit finite validation, bitwise signed-zero canonicalization, canonical-bit float equality, and monotone unsigned bit keys for finite numeric output order. Apply the same rules in typed dictionary validation/interning. Do not introduce float comparisons before those protections.

Before typed program parsing and each public typed add/run entry, reject unsupported Linux x86-64 FP controls with `TD_E_EXPR_FLOAT_ENV`. Read x87 and MXCSR controls: nearest rounding, all exception masks set, MXCSR FTZ/DAZ off; sticky status flags need not be clear. Do not alter the host's FP control state. Any independently callable arithmetic entry needs the same protection; synchronous internal operations may rely on the checked entry because no caller callbacks are invoked. Build with explicit contraction off/no fast math and SSE2 binary64 evaluation (`FLT_EVAL_METHOD == 0`); reject unsupported build assumptions. Tests must vary x87/MXCSR rounding independently, masks, FTZ/DAZ and sticky flags, including changes between constructor/add/run.

For JS decimal literals, do not rely on implementation-defined rounding of >20-significant-digit Number(token) inputs. Use the researched bounded BigInt rational/ties-even-to-bits parser, preserving the 128-byte grammar. Validate all syntax before the zero shortcut; classify adjusted decimal magnitude before exponentiation so extreme exponent text cannot allocate huge powers. Wire f64 inputs are already-admitted finite binary64 values, a separate boundary from literal decimal conversion.

## Complete-candidate error barrier

Admission validates ALL rules before execution: syntax/whitelist, undefined predicates, relational grounding, structural limits and literal payloads. This applies even to unreachable/empty rules. No eager constant folding may turn a deferred arithmetic fault into admission failure.

For every complete relational body match, evaluate each filter unless an actual fault has already aborted execution. False must NOT skip a later filter. Any type/division/overflow/underflow fault aborts the invocation with no returned relation, even if another filter is false, the head is already seen/pending, or the rule is not answer-reachable. Only after checks may all-true candidates derive a head. The first actual fault observed may vary across candidate/physical orders; exact multi-fault diagnostic priority is not promised. Single-fault canonical classes must agree across paths.

A ground filter-only rule has one empty-binding candidate: evaluate its filters once before seeding, including work charges; false seeds nothing and fault aborts. Any variable in such a rule is statically ungrounded. By contrast, a real empty relational join has no candidates, so a valid constant arithmetic fault behind it stays dormant.

This preserves a finite recursive active domain and monotone positive fixed-point/error-witness semantics. It does NOT authorize false-pruning, early throwing on partial joins, rule unfolding, demand/magic-set pruning, head-dedup shortcuts or acceptance of offered DuckDB C API v2 table-filter pushdown. Those transformations need separate error-observation proofs. No item-3 planner/pushdown implementation is included now.

## Bounds and work accounting

Preserve existing program/rule/predicate/arity/variable/string/token/input/fact/round/output caps. Add exactly:

| Bound | Definition |
| --- | --- |
| Positive relational atoms | Existing 16 per rule |
| Bracketed filters | 16 per rule, separately from positive atoms |
| Nodes | FILTER ASTs only: every literal/variable leaf, computed unary, arithmetic binary and comparison root; 256 per rule and 4,096 per program (not ordinary head/relational terms) |
| AST height | Leaf 1; unary 1+child; binary/comparison 1+max(children); at most 32 INCLUDING comparison root |
| Syntax nesting | At most 32 active parenthesis/computed-unary descents, even when parentheses disappear from AST; signed numeric sign is lexical, not a computed-unary node |

Retain old tuple-candidate work charges exactly for filter-free programs. Before each filter, precharge its complete AST node count once (one logical unit per node), then add `ceil((left_UTF8_bytes + right_UTF8_bytes)/64)` units before same-string comparison. This policy covers false filters and avoids per-node budget-dispatch overhead; resource failure may precede a later arithmetic fault. The conservative summed-byte policy also covers encoding both operands in the browser reference. Do not charge result sorting as expression work or claim this is complete allocation/wall-clock accounting. Native/browser counters describe their separate algorithms; cross-path exact counter equality is not promised. No per-candidate parse, persistent expression cache, result interning or unbounded temporary allocation.

Canonical new markers: `TD_E_EXPR_TYPE`, `TD_E_EXPR_DIV_ZERO`, `TD_E_EXPR_OVERFLOW`, `TD_E_EXPR_UNDERFLOW`, `TD_E_EXPR_FLOAT_ENV`, `TD_E_EXPR_LIMIT`, `TD_E_EXPR_UNBOUND`. Preserve old syntax/resource diagnostics for old programs. Filter AST/string-work precharge exhaustion uses TD_E_EXPR_LIMIT with max_work context; old tuple-candidate exhaustion keeps its existing diagnostic. Browser may retain existing outer limit markers while new expression classes are shared. No globally canonical priority between a resource limit and a later data fault is promised.

## Acceptance and explicit boundaries

Before acceptance: independent declarative AST/host naive fixed point and totalized SQL candidate oracle, real actual-v2 extension, independent browser reference and real typed-store rollback/retry must agree on exact typed relations and single-fault classes. Include age/range/time endpoints, recursive and late faults, every delta driver, permutations, duplicate heads, empty joins, ground-filter seeds, all tag/operator combinations, int64 extrema, exact binary64 bits, long decimal ties, FP controls, lexical/depth/node/work limits and subsequent good-call recovery. Run existing legacy/typed/migration suites, direct core and actual binding sanitizers, reproducible builds and full-path matched performance controls on final source. Preserve setup failures/negative results and distinguish passed/failed/unrun.

No partial result guarantee is per evaluator invocation and per store command. It does not certify arbitrary SQL streaming clients or unrelated side effects. The existing post-COMMIT storage-budget exception retains its committed-position/receipt semantics. Browser subset caps remain smaller and explicit; the deployed v1 Site is unchanged. No production readiness, complete resource/cancellation accounting, crash certification, arbitrary functions, date values or completion of items 3–10 is claimed.
