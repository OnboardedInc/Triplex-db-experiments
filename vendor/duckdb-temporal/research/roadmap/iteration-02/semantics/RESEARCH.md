# Iteration 02: bounded filters, comparison identity, and checked arithmetic

**Status:** research and proposed contract only. No feature source edits, no project acceptance run, no publication or deployment. Research accessed 2026-10-30 UTC. The coordinator alone selects the contract, implements, and changes Git/PR/Page state.

## Executive recommendation

Use a small, explicitly delimited **filter-only** language. Arithmetic may compute temporary values inside a filter, but may not bind variables, construct relation terms, or intern derived values. Every variable appearing in a head or filter must independently occur in a positive relational atom in that rule. Evaluate partial filters only after **all** positive relational atoms have matched. For each completed candidate, errors dominate false filters, and filtering precedes head-tuple deduplication.

Prefer **total tagged-identity equality/inequality** as a deliberately documented continuation of iteration 1: unlike tags compare unequal without coercion. Ordering and arithmetic require supported same-tag operands and otherwise report errors. This equality choice is not forced by Datalog theory and differs from DATALOG-TEXT's comparison compatibility; see §4. If the final product instead chooses same-tag-only equality, that is coherent too, but must have its own explicit tests and must not be confused with relational matching.

Ground filter-only rules can be supported safely: the empty relational join has one empty binding, so run filters once during seeding. A false filter produces no fact, a fault errors, and only all-true filters seed the head. Never equate “zero relational atoms” with “unconditionally add the head.” Filter-only variables remain statically ungrounded and invalid.

**Coordinator-selected refinements after the first draft:** body-only infix `[expr OP expr]`; six comparisons `= != < <= > >=`; arithmetic `+ - * /`, unary minus, and arithmetic parentheses; no callable function names. Checked f64 multiplication/division of nonzero operands that rounds to zero is an explicit underflow error, while finite subnormals and exact add/sub cancellation remain valid. These choices are reflected in the final recommendation and test specification; alternatives below are deliberately labeled.

Keep the current four disjoint admitted tags, explicit resource caps, one-shot execution, owned values, half-open temporal slicing, exact i64 clocks, and separate legacy API. This does **not** make the prototype production-ready or stabilize the actual unstable DuckDB C API v2.

## 1. Fresh primary evidence, and what it does not decide

The following are short paraphrases of freshly accessed primary materials; the proposed contract below is an authored design synthesis, not a claim of conformance to any one system.

1. **Abiteboul, Datalog course, 2009, slides 3 and 9–12.** The presentation defines the joint program/input active domain, relational rule valuations, a monotone immediate-consequence operator, and least fixed-point construction. It supplies the mathematical baseline for the finite-domain argument here. [Author's PDF](https://abiteboul.com/TEACHING/DBCOURSE/datalog.pdf).
2. **Soufflé tutorial.** It contrasts finite-universe, functor-free Datalog with its arithmetic-functor extension; the latter can generate successively new numbers in recursion and lose termination. Its mathematical-number example should not be misreported as literally infinite within this prototype's checked i64 domain. [Official tutorial](https://souffle-lang.github.io/tutorial).
3. **DATALOG-TEXT rules.** This specification requires head variables and arithmetic-literal variables to appear in positive relational literals; it treats unsafe rules as errors. It is useful precedent, not proof that every Datalog dialect has identical syntax. [Rules and safety](https://datalog-specs.info/vnd_datalog_text/grammar_rules.html#errors---safety).
4. **DATALOG-TEXT literals.** Its comparisons require equal operand types; equality is available for booleans but ordering is not. String ordering is lexical. This is evidence for a same-tag comparison design, not a requirement to choose it here. [Literals](https://datalog-specs.info/vnd_datalog_text/grammar_literals.html#arithmetic-literals).
5. **W3C SPARQL 1.1.** It distinguishes value equality from total term-identity testing; its filter errors reject solutions rather than abort the whole query, and false can mask error in logical conjunction. Those are explicit alternatives, not this report's proposed fail-closed policy. [sameTerm](https://www.w3.org/TR/sparql11-query/#func-sameTerm), [filter evaluation](https://www.w3.org/TR/sparql11-query/#evaluation).
6. **PostgreSQL 18 expression evaluation.** Expression order is not generally fixed; Boolean conditions may be reorganized by the planner. This demonstrates why textual comma order is a poor implicit error contract. [Expression evaluation rules](https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-EXPRESS-EVAL).
7. **C++ working draft and GCC.** Signed arithmetic and division need care before execution; integer division truncates toward zero, with invalid zero or unrepresentable quotients. GCC's checked add/subtract/multiply builtins define overflow detection without first invoking signed overflow. [C++ division](https://eel.is/c++draft/expr.mul), [GCC checked builtins](https://gcc.gnu.org/onlinedocs/gcc/Integer-Overflow-Builtins.html).
8. **ECMAScript numeric specification.** Number arithmetic uses binary64 rounding, while BigInt arithmetic can exceed 64 bits and division truncates toward zero. BigInt therefore needs explicit i64 result checks. [Number and BigInt operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types).
9. **GCC optimization controls.** Contraction, reassociation, excess precision, finite-math assumptions, and ambient rounding can affect floating operations. Disallowing fast-math alone is not a full run-time floating-environment contract. [Official options](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html).
10. **DuckDB 2.0 docs.** SQL `/` on integer operands is floating division; `//` is integer division. SQL behavior is not automatically this typed language's arithmetic contract. C API v2 is explicitly unstable. [Numeric operators](https://duckdb.org/docs/2.0/sql/functions/numeric), [C API v2](https://duckdb.org/docs/2.0/clients/c/overview#c-api-v2).
11. **Intel's official compiler reference.** FTZ replaces subnormal results with zero, while DAZ treats subnormal inputs as zero; these modes are not IEEE-compatible. This supports the supported-environment boundary, with exact local comparison effects separately demonstrated by the probe. [FTZ and DAZ reference](https://www.intel.com/content/www/us/en/docs/dpcpp-cpp-compiler/developer-guide-reference/2026-0/set-the-ftz-and-daz-flags.html).

The author's Foundations of Databases chapter endpoint was attempted but returned a gateway error; it is **not** counted as inspected evidence. The successfully inspected author-hosted course PDF suffices for the cited baseline. No secondhand tutorial or search snippet is relied on as technical authority.

## 2. Inspected implementation and provenance limits

Read-only paths inspected:

- `engine/src/temporal_core.cpp`: templated legacy/typed core, parser, greedy indexed joins, semi-naive delta variants, fixed-point run, owned output.
- `engine/src/temporal_value_domain.hpp`: strict tag interning, finite f64 admission, normalized zero, UTF-8 validation, dictionary limits.
- `engine/src/temporal_typed_core.hpp`: owned tagged values and total result-sort comparator.
- `site/dist/engine-v2.js`: independently implemented typed parser and naive synchronous-round evaluator.
- `engine/build.sh`, `engine/ITERATION-01.md`, `README.md`, selected typed core tests, and callback locations in `temporal_datalog.cpp`.

The coordinator supplied verified remote PR 7 head `e42a8adc0f6f6f3c0b4eca903016a61bab4c3f67`. At this worker's initial, **precheckpoint** observation, local `.git` reported `85cc4a876bed1cab7b8a707c0ba4723a2f851c64` with iteration-1 edits/untracked additions. Subsequently the coordinator reported reconciling all 240 source blobs/modes and creating local checkpoint `78d157ee688058e324735141ab3157d9d7c10445`, whose root tree `58931fcd2e09776f55bdf87f965540de1cbcc7df` exactly matches the remote prototype subtree, with no source-byte or remote change. These are distinct timestamped provenance facts; `source-observation.json` records this worker's exact inspected-file hashes and subsequent read-back.

Current relevant observations:

- Body items are all relational atoms. Existing safety collects all body variables; after adding filters it must collect bindings **only from relational atoms**.
- Native scheduling uses relational deltas; filters must neither create deltas nor be selected as relational delta atoms.
- Native emits a candidate head at the full join leaf. This is the natural filter/error barrier, **before** the existing seen/pending head checks.
- Ground facts are seeded when the current body is empty. The new AST must distinguish filters from relations and must explicitly evaluate zero-relation filtered rules at seed time.
- The existing comparator intentionally provides total result ordering across tags and orders bools. It must not accidentally make mixed-tag or boolean **ordering filters** legal.
- Browser `sameValue` is already strict tagged identity. Browser `<` on strings is not the existing UTF-8 byte comparator and would change non-BMP ordering.
- Build assumptions are Linux x86-64, GCC/C++17, actual unstable C API v2, exact DuckDB 2.0.0. Existing `__FAST_MATH__` rejection is useful but arithmetic-specific FP behavior still needs explicit verification.

No repository file, index, branch, remote, frozen source, or baseline was written by this worker. The cloud-local reference paths mentioned by workspace AGENTS.md were absent; the catalog versions of software-engineering, repo-work, and durable-work were read. This local research package is not itself a verified remote backup; the coordinator owns preservation.

## 3. Proposed bounded grammar and binding contract

### 3.1 Syntax must be disjoint from existing predicates

The selected small grammar uses infix operators **inside square-bracket filter syntax only**:

```ebnf
body-item  ::= relational-atom | filter ;
filter     ::= "[" expr comparison expr "]" ;
comparison ::= "=" | "!=" | "<" | "<=" | ">" | ">=" ;
expr       ::= product ( ("+" | "-") product )* ;
product    ::= unary ( ("*" | "/") unary )* ;
unary      ::= "-" unary | primary ;
primary    ::= existing-variable | existing-typed-literal | "(" expr ")" ;
```

There are no callable function names. `eq`, `add`, `div`, `filter`, `true`, and other currently legal identifiers remain ordinary predicate names. For example:

```datalog
eq(1,1).
add('existing','predicate').
answer(?p) :- triple(?p,'age',?age), [?age >= 18].
```

An earlier research proposal used prefix names inside brackets; it is **not selected**. Infix requires precise precedence, token boundaries, exponent-sign handling, and signed-literal preservation. Do not implement both spellings. In particular, preserve the existing signed literal `-9223372036854775808`; blindly treating it as negation of an out-of-range positive i64 literal would regress legal input. Computed `-(-9223372036854775808)` is instead a runtime overflow. Test compact subtraction `1-2`, addition of a negative `1+-2`, and `1e-3` separately.

No casts, regex, concatenation, date parsing, null handling, truthiness, callbacks, callable functions, modulo, power, shifts, assignment, or arithmetic in heads/relational arguments. Unary computed negation accepts only i64/f64; negating i64 MIN errors before native arithmetic, f64 negation is exact, and zero normalizes.

### 3.2 Fixed structural limits

Retain existing program/rule/predicate/arity/variable/text/numeric-token/input/fact/round/output caps. The coordinator's final selected expression limits are:

| Resource | Final selected bound |
|---|---|
| Positive relational atoms | Existing 16 per rule |
| Filters | 16 per rule, separately from relational atoms |
| Filter AST nodes | 256 per rule; 4,096 per program |
| Filter AST height | 32 including comparison root; leaf height 1 |
| Parser syntax nesting | 32 active parenthesis/computed-unary descents; lexical signed-number sign is not a unary node |

Nodes count each filter literal/variable leaf, computed unary, arithmetic binary, and comparison root. These budgets do **not** count ordinary head/relational terms, which retain existing bounds. Count nodes and height independently: a flat left-associative arithmetic chain can have a tall AST without many syntactic parentheses. The first draft's combined-body/depth-8/node-63 proposal is historical and **not selected**.

Before each filter, precharge its full AST node count once, then charge `ceil((left_UTF8_bytes + right_UTF8_bytes)/64)` before comparing same-tag strings. Both string lengths are included even if a shorter comparison could stop early. False filters still incur charges and do not suppress later filter charges/faults. Preserve existing relational work charges and filter-free counters exactly; do not charge result sorting as expression work. A work limit may be reached before a later expression fault; it still returns no partial result. These are explicit admission/work policies, not complete allocator or wall-clock accounting.

Keep numeric-token size fixed before BigInt/decimal conversion. No per-candidate parsing, persistent expression cache, result interning, or unbounded temporary allocation.

### 3.3 Static grounding and planning dependencies

For a rule, let `B` be the set of variables appearing as direct terms in **positive relational body atoms**. Require:

1. Every head variable belongs to `B`.
2. Every variable in every filter expression belongs to `B`.
3. A filter never adds a variable to `B` and never unifies/binds a variable.
4. Physical planning records each filter's input-variable bitset **and** the full relational-completion barrier. “Its inputs happen to be bound” is necessary but not sufficient to run a partial filter early.
5. Filter placement before or between relational atoms in source is allowed; it does not change binding or error semantics.

These reject `answer(?x) :- [?x = 1].`, `answer(?y) :- p(?x), [?y = ?x + 1].`, and equality cycles with no relational source. A result variable occurring elsewhere in a real relation can be compared with computed arithmetic, but is never generated by it.

### 3.4 Filter-only rules: preferred support and smaller-scope alternative

Preferred: allow a filter-only body **only when all terms are ground**, because `B` is empty. Its relational join is `{empty_binding}`; evaluate its filters once at seed time. This is bounded and consistent with ground facts.

```datalog
answer('yes') :- [1 = 1].       % seed yes
answer('no')  :- [1 = 2].       % seed nothing
answer('bad') :- [1 / 0 > 0].   % error, no result
```

A smaller initial implementation may explicitly reject all filtered rules without a positive relational atom. That is an optional unsupported-feature restriction, **not** evidence they are unsafe or nonterminating. A unit fact can then express a ground guard. Prefer supporting them if the seed path is small and fully tested. Whichever choice is selected must be shared across native/browser/oracle and documented; silently treating them as facts is incorrect.

## 4. Comparison semantics: identity is not ordering

### 4.1 Selected recommendation: total tagged identity for eq/ne

Here `eq/ne/lt/...` are explanatory mathematical names for the selected symbolic operators, **not** callable language functions.

Define equality on the admitted tagged sum directly:

`eq((tag1,value1),(tag2,value2)) = (tag1 == tag2 && value1 == value2)`.

Define `ne` as its exact complement. All admitted tag pairs are explicitly **equality-compatible**, including unlike tags. This preserves item-1 identity and does not coerce or promote anything. Thus `eq(1,1.0)` is false, `ne(1,1.0)` is true, and `eq(true,1)` is false. An arithmetic subexpression may still error before equality can inspect its result.

Use exact, case-sensitive string equality; no Unicode normalization or locale folding. Finite f64 equality is numeric equality with the already-selected normalized zero. No NaN exists in the admitted domain. Empty strings are ordinary values, not false or missing.

### 4.2 Same-tag-only equality is a coherent alternative, not an inevitability

DATALOG-TEXT provides direct precedent for mixed-tag comparison errors. If selected, `eq(1,1.0)` and `ne(true,1)` error rather than return booleans. Existing relational matching must **still** return nonmatch for different tags; never make joins throw merely because a relation has heterogeneous values.

Neither model retroactively breaks a legal old filter program: filters did not exist. The choice concerns conceptual consistency and the new interface. Because Contributor's phrase “incompatible-type errors” does not itself define equality compatibility, the final documentation must state whether equality accepts all pairs. Do not assert that total identity violates strict tags; equally, do not label it universal “typed comparison semantics.” This report prefers total identity for continuity, with explicit same-tag requirements below.

### 4.3 Ordering matrix

| Left/right tags | eq/ne (recommended) | lt/le/gt/ge | add/sub/mul/div |
|---|---|---|---|
| str / str | identity | unsigned UTF-8 byte lexicographic | type error |
| bool / bool | identity | invalid-operator/type error | type error |
| i64 / i64 | identity | signed numerical | checked i64, i64 result |
| f64 / f64 | identity | finite numerical | checked binary64, f64 result |
| unlike tags | false / true | incompatible-type error | incompatible-type error |

Byte lexicographic order must not use dictionary IDs, insertion order, locale collation, or JavaScript's UTF-16 `<`. The existing valid-scalar UTF-8 boundary makes byte order deterministic across supported paths. The isolated probe shows `U+E000 < U+10000` is true by UTF-8 bytes but false under native JavaScript string comparison.

Result sorting remains its existing total tag-rank comparator; that comparator is **not** permission to order unlike tags or booleans in filters.

## 5. Arithmetic contract and boundary cases

### 5.1 i64

All operands must be i64. Add/subtract/multiply compute the mathematical integer result and error when it falls outside `[-2^63,2^63-1]`. Do not execute overflowing C++ signed arithmetic and inspect the result afterward. Checked compiler builtins or an equally safe explicit method are implementation options.

Choose `/` on i64 to truncate toward zero, returning i64, with zero-divisor and `MIN/-1` checks before division. JavaScript BigInt implements truncation but is unbounded, so it needs the same post-operation range check as every arithmetic node. An independent Python oracle must not use `//` directly on negative values (flooring), nor convert i64 through binary64. Reject mixed numeric tags instead of inventing a promotion.

Every AST node is checked in tree order. `(MAX + 1) - 1` errors at addition; it does not succeed just because an algebraically simplified final result would fit. There is no algebraic reassociation or cancellation of intermediate errors. Arithmetic values are temporary owned/scalar values, never dictionary IDs unless they already came from a relation as an existing binding.

### 5.2 f64: selected fail-closed checked policy

Define `+ - * /` as one binary64 round-to-nearest-ties-to-even operation per AST node, preserving tree shape. Error on a zero divisor (both signed zeros normalize) and on every nonfinite result. Do not rely on SQL division behavior, JavaScript Infinity propagation, host errno, or an exception flag alone to implement those checks.

**Selected underflow policy:** allow finite normal/subnormal results, but reject multiplication/division of nonzero operands when the binary64 result is zero. Their exact mathematical result cannot be zero, so this identifies lost-nonzero underflow without an unbounded exact arithmetic engine. Multiplication with a zero operand legitimately returns canonical +0. Division by zero is checked separately first. Unary negation is exact and does not create underflow.

Add/sub exact cancellation returns canonical +0. All finite binary64 values are integer multiples of the minimum subnormal; therefore a nonzero exact sum/difference of two admitted finite values cannot have magnitude below that minimum. Merely testing every arithmetic `result == 0` is wrong: `x-x` and multiplication by zero are legitimate. Rejecting **all inexact subnormal** results is a different, broader policy and is not selected. This remains finite-precision arithmetic, not exact real arithmetic.

The earlier minimal alternative allowed rounding to zero as ordinary IEEE arithmetic. It is coherent but **not selected**. Literal admission's rejection of nonzero decimal text rounding to zero is still a separate lexical rule. The isolated probes intentionally record both policy outcomes to demonstrate the choice; they are not acceptance tests.

No epsilon equality, decimal-money claim, calendar/date arithmetic, fused operation, power, or arbitrary math library function. Parentheses/AST shape remain semantically observable. `(1e308 + -1e308) + 1` is 1 while `1e308 + (-1e308 + 1)` is 0 in the local probes.

### 5.3 Floating environment is part of supported-path precision

The native isolated probe confirms ambient upward rounding changes a half-ulp addition and FTZ/DAZ changes a valid subnormal to zero. Using noinline volatile-input comparison functions also demonstrates that DAZ changes minimum-subnormal `> 0` from true to false and `== 0` from false to true. This affects comparisons and value zero-normalization too, not only arithmetic. Compile-time `is_iec559`, finite input checks, and rejecting `__FAST_MATH__` do not prevent it.

**Final selected hardening:** make standalone finite-value classification, signed-zero canonicalization, equality, sorting, and typed dictionary validation/interning independent of ambient FP state using IEEE bits. Reject exponent field all-ones, canonicalize either zero bit pattern, compare canonical bits for equality, and compare monotone unsigned keys for finite numeric order. Audit every primitive rather than leaving a residual raw float comparison in normalization/interning. This is the chosen implementation target, not a claimed patch.

Separately, before typed parsing and at each public typed add/run entry, reject unsupported Linux x86-64 x87/MXCSR controls with `TD_E_EXPR_FLOAT_ENV`: nearest rounding, exception masks set, FTZ/DAZ off. Check SIMD rounding independently of x87/C rounding; ignore existing sticky status flags and do not alter host control modes. Any independently callable arithmetic entry needs the same guard or explicit checked-entry precondition. Synchronous internal operations may rely on the entry guard because they invoke no caller callbacks. Check before mutating evaluator admission/one-shot state where possible; a later independent good query must recover normally after the caller restores controls.

The selected build must enforce binary64 SSE2 evaluation (`FLT_EVAL_METHOD == 0`), contraction off, and no fast/finite/reassociation assumptions. Verify actual compiler settings/macros; `__FAST_MATH__` alone does not cover an individually enabled finite-math option. Ordinary arithmetic may set sticky flags; no-control-mode-mutation does not promise unchanged sticky status.

The observed default MXCSR was `0x1f80`. This is a target-specific supported-environment boundary, not portability or crash certification. Scoped environment normalization/restoration and guards on every primitive were earlier alternatives; they are **not selected**. The probe's first direct-expression comparison variant did not show the comparison change at `-O3`; the final probe uses explicit noinline volatile-reading functions. Compiler scheduling/optimization interacting with environment updates is an inference, not a disassembly-based attribution.

### 5.4 Final decimal-literal hardening and cross-worker evidence

The selected independent JS path uses a bounded exact BigInt rational/nearest-even-to-bits decimal parser rather than relying on long-decimal `Number(token)` rounding. It validates the complete existing ≤128-byte ASCII grammar before the lexical-zero shortcut; computes adjusted magnitude before any power construction; and bounds surviving powers/working integers. Wire f64 input is a separate already-binary64 boundary.

The browser worker's `REPORT.md`, `bitwise-value-summary.json`, and `decimal-parser-results.json` were read as **reported research evidence**, not copied implementation instructions. They report 1,808 unique finite patterns agreeing in four FP environments, and 2,963 decimal cases with zero mismatches against an independent exact oracle; observed maximum power was 424 and maximum working integer 1,435 bits. Its native-parser comparison reports 2,962 applicable cases with zero mismatches on the pinned GCC/libstdc++ host, not a universal C++ guarantee. This worker did not rerun those corpora. The older matrix in that report proposing `==` and bool ordering is superseded by shared `CONTRACT.md` (`=`, bool ordering error).

## 6. Partial filters, errors, and reorderings

### 6.1 Static admission versus candidate-time faults

Always reject malformed syntax, unsupported operators/functions/arity, ungrounded variables, and structural resource violations during whole-program admission, including empty/unreachable rules. These are not data-dependent evaluation outcomes.

In contrast, valid-grammar constant faults—division by zero, arithmetic overflow, mixed-tag order/arithmetic, bool ordering—are runtime expression outcomes. They stay dormant behind an actually empty **complete relational join**. Constant folding may preserve a deferred result/error, but must not throw early and change this policy. Existing scalar literal admission is separate: an out-of-range integer/float literal or nonzero decimal literal underflowing to zero remains a static invalid literal, even behind an empty join. `MAX + 1` is a deferred operation; a bare out-of-range positive i64 literal is not an admitted operand.

For zero relational atoms, the complete join is one empty binding, so a ground constant fault is active. This differs from joining an actual relation containing zero rows. Do not confuse the empty join identity with an empty relation.

### 6.2 Full relational-candidate/error barrier

For each rule and current relation instance, first define the complete natural-join matches of all its relational body atoms using existing strict tagged matching. Only those full candidates are entitled to evaluate partial filters. Source filter position is not a procedural guard.

Counterexample: `p(0)` and empty `q`, with body `p(?x), q(?x), [1 / ?x > 0]`. There is no full match and therefore no runtime fault. Running division as soon as `p` binds `?x` instead errors. Binding dependencies alone cannot justify this pushdown.

The relational barrier is conservative but simple. A later optimized implementation may push a proven-total predicate only with an **error-domain preservation proof**, including its ability to suppress other fault candidates. Even a total false equality pushed early could hide a later division fault, so “this particular filter cannot throw” is not enough.

### 6.3 Strict error-dominates-false conjunction

Proposed candidate semantics:

| Filter outcomes for a completed candidate | Outcome |
|---|---|
| all true | derive head |
| at least one false, no error | do not derive |
| any error, even with false | abort invocation with explicit error |

The lifted conjunction is commutative and associative in success/failure presence. A false filter must not skip remaining error checks. Once an actual error is found, immediate abort is fine; no output is returned. This is intentionally **not** SPARQL's false-masks-error conjunction and not left-to-right guard semantics.

Do not promise deterministic “first error” across unordered candidates unless implemented. A minimal precise contract permits any actual failure witness when multiple candidates/nodes fail; single-fault programs must agree on type/div0/overflow class across paths. If exact multi-fault code ordering becomes a requirement, choose a canonical witness order explicitly rather than accidentally depending on native hash/index order.

### 6.4 Filters must precede deduplication and answer projection

This program must error even though its head already exists:

```datalog
p(0).
answer('ok').
answer('ok') :- p(?x), [1 / ?x > 0].
```

Likewise, an error in an intermediate rule must not disappear because that rule is not answer-reachable, because another answer was already found, because two candidates share a head, or because result output is bounded. The current whole-program materialization model should remain whole-program for errors. Fail-closed behavior is not permission to return a partial prefix.

### 6.5 Relational guards work; rule inlining is not automatically sound

```datalog
safe(?x) :- p(?x), [?x != 0].
answer(?x) :- safe(?x), [10 / ?x > 1].
```

Here zero is absent from the second rule's candidate relation, so it does not divide by zero. Inlining the first rule into the second would place both filters on `p`'s zero candidate and now error under strict semantics. Thus join reorderings can be valid while rule unfolding, demand/magic-set pruning, relation elimination, and cross-rule filter movement require separate proofs. There is no promise of unrestricted ordinary Boolean-algebra optimization once errors are observable.

## 7. Finite-domain and semi-naive correctness argument

This is an authored proof for the proposed contract, not a claim that an implementation has already met it.

Let `A` contain the admitted snapshot's entity/attribute/value cells and all scalar literal values in the finite program. Keep tags as part of identity. Each stored head cell is either a program literal or a variable directly bound by a positive relational atom. By induction from active input plus ground seeds, every stored cell belongs to `A`. Arithmetic can compute outside `A`, but no temporary result is stored or binds a variable. Hence the reachable ground relational base has at most `sum_R |A|^arity(R)` tuples. The existing resource caps may reject much sooner; they are operational bounds, not the proof itself.

Define `T_good(K)` to add heads for complete relational candidates whose filters all return true; ignore error candidates solely for the purpose of defining this mathematical closure. Each pure filter's outcome depends only on its fully bound values. Adding relation tuples never removes a prior candidate or changes its filter outcome, so `T_good` is monotone and reaches a finite least fixed point `K*`.

Define `E(K)` as all expression faults on full candidates at `K`, with error-dominates-false. It too is monotone. Observable execution returns `answer(K*)` if `E(K*)` is empty; otherwise it returns an actual error witness and no result. An implementation may abort immediately after discovering a witness because that witness cannot disappear as relations grow. This is equivalently an absorbing error outcome layered over finite positive evaluation; it need not materialize the entire error set.

For any newly enabled complete match, at least one participating relational tuple was newly added at the epoch when the match first became possible. Choosing each changed relational atom as a delta driver covers that match in at least one variant. Filters add no bindings/deltas; running them at the full join leaf therefore preserves both accepted heads **and fault discovery**. Duplicate delta variants may reevaluate a pure filter but cannot change its logical outcome. Zero-relational-body rules need their separate one-time seed evaluation because no delta atom exists.

This proof does not justify skipping a candidate because its head is already known, short-circuiting false filters, using only answer-demanded rules, or interning arithmetic results. It also does not imply equal counters, equal physical order, equal resource failure timing, or arbitrarily bounded wall-clock time between paths.

### 7.1 Why value-generating alternatives are rejected for item 2

- `p(add(?x,1)) :- p(?x)` directly defeats the invariant; grammar must reject expression terms in heads.
- `p(?y) :- p(?x), [assign(?y,add(?x,1))]` defeats relational grounding; no assignment builtin is admitted.
- Checked i64 generation is not literally infinite, but can visit a huge machine domain, overflow, or exhaust rounds/work rather than compute an input-active-domain closure. A hard round limit is not evidence of bounded-domain semantics.
- Acyclic nonrecursive generation could be finite and useful, but needs a distinct language phase, type/admission contract, interner budget, and dependency proof. That is future scope, not something to smuggle into a “filter” item.
- Requiring a computed output variable to occur in an independent finite relation can recover active-domain behavior, but then the operation is semantically a constraint, exactly the filter-only design here.

## 8. Adversarial test specification and oracle independence

`TEST-SPEC.md` enumerates targeted cases. Minimum cross-path evidence should include actual pinned native `td_query_v2`, direct typed core, independent browser reference, and an independently authored oracle. Persistence adapters should forward the same program without stringifying/coercing cells. Legacy API behavior and predicate-name compatibility require separate regression tests.

Use generous, shared admissible limits for semantic agreement; compare canonical typed rows and single-fault error classes. Do not compare work/round counters between different algorithms or label a resource rejection as a wrong answer. Test each path's own boundary caps separately.

The oracle must not copy the production parser/evaluator/helper source. Use exact arbitrary-size integers for i64 math then check range, exact binary-rational arithmetic/rounding for f64 edge expectations when feasible, explicit UTF-8 byte comparison, and a simple full-join/synchronous fixed-point procedure. SQL baselines are useful for age/range/time result sets, but DuckDB `/`, coercion, and error reordering cannot define the contract by accident. Ensure tests actually run the rebuilt pinned native artifact, not only Python/JavaScript replicas.

Time examples must distinguish scalar i64 application values from bitemporal metadata. The current `triple/3` does not expose interval columns as variables. There is no new date/timestamp value tag, timezone conversion, wall-clock `now()`, or calendar-accurate birthday-age function. Preserve exact i64 half-open snapshot slicing and test both valid-time and known-time boundaries.

## 9. Actual isolated probes and verification limits

Executed within this research directory only:

```sh
python3 semantic-probes.py > probe-results.json
g++ -std=c++17 -O3 -Wall -Wextra -Wpedantic -Werror \
  -frounding-math -ffp-contract=off native-fp-probe.cpp -o native-fp-probe
./native-fp-probe > native-fp-results.json
node browser-runtime-probe.mjs > browser-runtime-probe.json
```

Python 3.12.14, Node v24.22.1, GCC 14.2.0, x86-64. Python probe assertions passed; the standalone native probe built and exited successfully. These probes demonstrate semantic hazards and arithmetic examples; they do **not** implement the feature or test the project/native extension.

Observed results: completed-join empty success versus pushed-filter division error; strict errors unaffected by false-filter order versus short-circuit suppression; safe-relation guarding versus inlining fault; finite relational-domain closure without storing temporary 2; expected i64 edge faults; explicit underflow-policy alternatives; float AST nonassociativity; UTF-8/UTF-16 ordering difference; and native ambient rounding/FTZ/DAZ sensitivity.

The compiler probe changes/restores FP settings only in its own short-lived subprocess. It does not change the coordinator, a DuckDB host, or any user process.

**Not run:** item-2 native build, project tests, host integration acceptance, performance campaign, browser UI/deployment, migrations, or CI. No item-2 acceptance criterion is marked passed. The coordinator must settle the final grammar/error/underflow/environment contract and then implement and independently verify it.
