# Item 2 research: admission, bounded expression work, and atomic failure

Research date: 2026-10-30 UTC. Scope: research and disposable probes only. This is **not an item-2 implementation or acceptance result**, nor a production/security certification. The coordinator supplied accepted item-1 PR7 checkpoint `e42a8adc0f6f6f3c0b4eca903016a61bab4c3f67`; this worker inspected local source and the actual artifact, not the remote PR. No Codex task, user computer, Git object, PR, Page, Site, original source, or frozen baseline was changed. All retained task artifacts are beneath this report's `/tmp/temporal-roadmap-research/iteration-02/admission/` root.

## Findings that should govern the implementation

1. **Use body-only bracketed filters.** `[expr OP expr]` consumes already relationally grounded bindings; it does not bind variables or manufacture relation values. No computed heads, computed relational arguments, assignment, or user functions. This gives a straightforward finite-active-domain argument even with recursive positive rules. A max-round limit alone is not a language-safety proof.
2. **Separate typed equality from ordered/numeric compatibility.** Equality remains accepted item-1 identity: different tags compare unequal. Ordering requires the same admitted tag; arithmetic requires the same numeric tag. Canonical result sorting's tag rank must never become cross-type predicate ordering.
3. **Evaluate filters only on complete relational matches, before head deduplication.** Evaluate every filter despite an earlier false filter; errors dominate false. An absent final join partner must not cause a spurious arithmetic error on a partial binding. No fault-hiding guard pushdown, algebraic cancellation, or dedup-before-check optimization.
4. **Ground filter-only rules have one empty-binding candidate.** Evaluate once before seeding. A false filter emits no seed; a fault aborts. Ordinary no-filter ground facts retain their old behavior and counters.
5. **Bound parser structure and debit expression work.** Proposed limits: 16 positive atoms and separately 16 filters/rule; 256 filter-AST nodes/rule; 4,096/program; expression-tree depth 32 and parser parenthesis/unary nesting 32. Retain all existing limits. Define additive filter work rather than silently changing old no-filter work.
6. **A native error before COMMIT rolls back the command; a post-COMMIT error does not.** Existing typed-store source already stages evaluation in the same transaction. Its later physical-size guard can raise `BudgetExceeded(committed_position=...)` after commit. Receipt reconciliation, not blind replay, is the correct boundary.

These are design conclusions/inferences from the inspected implementation and the sources below, not claims that DuckDB or another Datalog dialect defines this project's language.

## 1. Fresh primary-source basis

The following pages were freshly researched for this item, not inferred solely from item-1 notes:

- Pure finite-universe Datalog excludes value-generating functors; Soufflé explicitly warns that arithmetic generation such as `A(i+1) :- A(i)` can fail to terminate. It also requires functor inputs to be grounded. This supports bound-only predicates rather than an incomplete termination heuristic. [Soufflé tutorial](https://souffle-lang.github.io/tutorial)
- Join size is constrained by query structure, not merely the small input count; Atserias, Grohe and Marx establish tight worst-case bounds using fractional edge covers and distinguish the effects of join plans. Here the consequence is modest: bound grammar and work, and do not equate a selective final filter with cheap execution. This report does **not** claim the current greedy joiner attains AGM bounds. [Author paper](https://arxiv.org/html/1711.03860v1)
- DuckDB comparisons perform combination casting; raw expressions can make `1=true` and `1='1.1'` true. Its `BETWEEN` can also cast all inputs together. Therefore raw DuckDB comparison is not the project's typed oracle. [DuckDB 2.0 comparison operators](https://duckdb.org/docs/2.0/sql/expressions/comparison_operators)
- DuckDB `/` on integer inputs is floating division, unlike `//`. Default floating division by zero follows IEEE semantics. [DuckDB 2.0 PostgreSQL compatibility](https://duckdb.org/docs/2.0/sql/dialect/postgresql_compatibility)
- **Version-sensitive correction:** DuckDB 2.0 integer division/remainder by zero now errors by default; floating IEEE behavior remains separately configurable. Do not import the older NULL-on-integer-zero behavior into the pinned oracle. [DuckDB 2.0 pragmas](https://duckdb.org/docs/2.0/configuration/pragmas#ieee-floating-point-operation-semantics)
- C++ integral division discards fractional parts; zero divisors and unrepresentable quotient cases make both division and remainder undefined. Precheck zero and `INT64_MIN/-1`, including the remainder case. [C++ working draft, expr.mul](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/n4988.pdf)
- GCC overflow builtins define add/subtract/multiply checks without first invoking overflowing signed arithmetic, and may lower them to hardware overflow instructions. They are an appropriate checked C++17 primitive here; a cast after an overflowing native expression is not. [GCC overflow builtins](https://gcc.gnu.org/onlinedocs/gcc/Integer-Overflow-Builtins.html)
- The C++ Core Guidelines independently discourage overflow and integer divide-by-zero, including `%`, and suggest checked numeric abstractions. [ES.103–105](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-overflow)
- JavaScript Number operations and BigInt operations have different semantics; BigInt division truncates toward zero but is arbitrary precision, so the browser still needs explicit i64 result-range checks. Python `//` floors and `%` follows the divisor sign; a Python oracle cannot borrow these operations unchanged for C++ truncating i64 semantics. [ECMAScript 2025](https://tc39.es/ecma262/2025/), [Python expressions](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations)
- DuckDB documents transactional rollback of changes and snapshot isolation. That supports the store design but does not establish this wrapper's error handling or crash behavior by itself. [DuckDB transactions](https://duckdb.org/docs/2.0/sql/statements/transactions)
- DuckDB's memory limit covers its buffer manager, not all vectors, results, list aggregates or extension allocations. Its security settings are defense in depth, not an OS sandbox; native extensions have process privileges. These are reasons to keep existing trust/cap boundaries and avoid hostile-client claims. [Limits](https://duckdb.org/docs/2.0/operations_manual/limits), [Security overview](https://duckdb.org/docs/2.0/operations_manual/securing_duckdb/overview)
- The actual C API v2 remains unstable and uses `duckdb_v2.h`/`duckdb_extension_v2.h`, not renamed stable-v1 entrypoints. Keep exact v2.0.0 host/header/footer pinning. [DuckDB C API overview](https://duckdb.org/docs/2.0/clients/c/overview)

## 2. Observed current contracts and gaps

Read-only inspected files include `engine/src/temporal_core.cpp`, `temporal_typed_core.hpp`, `temporal_value_domain.hpp`, `temporal_datalog.cpp`, `storage/typed_store.py`, `storage/store.py`, `storage/schema_v2.sql`, browser `site/dist/engine-v2.js`, current acceptance tests and `engine/ITERATION-01.md`. `source-fingerprints.json` records exact hashes.

The kernel currently has atom-only bodies and validates safe head variables by collecting body-atom variables. It uses query-local compact IDs, exact typed interning and positive semi-naive fixed point. Present limits are 65,536 program bytes, 16,384 bytes/term, 128 numeric-token bytes, 128 rules, 128 predicates, arity 8, 16 positive body atoms, 64 variables/rule, 100,000 input rows, max facts 100,000, max rounds 2,000, max work 50,000,000, and a 16-MiB materialized-result charge. Typed dictionary accounting is bounded separately by entry count and charged bytes. These are admission units, not a complete allocation census.

Current `charge()` increments once for a considered relation-row candidate; it does not cover AST evaluation, parsing, index construction or all memory. Thus adding a 256-node expression under the old charge alone could amplify 50 million row visits into billions of operations. The new expression costs must be additive and documented. Canonical selected new markers are `TD_E_EXPR_TYPE`, `TD_E_EXPR_DIV_ZERO`, `TD_E_EXPR_OVERFLOW`, `TD_E_EXPR_UNDERFLOW`, `TD_E_EXPR_FLOAT_ENV`, `TD_E_EXPR_LIMIT` and `TD_E_EXPR_UNBOUND`; preserve existing syntax/resource diagnostics for old programs.

Every input fact is validated before its half-open valid/knowledge visibility check. Preserve that: an invalid carrier in an inactive row is still invalid input. By contrast, a valid string payload that would be incompatible with arithmetic must not fault if temporal filtering prevents it from ever forming a logical candidate.

`TypedTemporalStore._query()` calls one fixed, parameterized `td_query_v2` aggregation on its current connection. `transact()` begins a transaction, checks duplicate receipt, stages clock/receipt/retractions/assertions, evaluates before commit, checks budget, then commits. Any exception in that precommit region takes explicit rollback. No second connection or Python/SQL fallback substitutes for a missing native evaluator.

The native callback is `noexcept`, catches API errors, allocation failure, standard exceptions and unknown exceptions, and reports through the real v2 error slot. A failed engine is one-shot; destroy it rather than reuse partially built local state. Item 2 should preserve this containment, not add shared mutable parse/interner caches.

Some historical README/spec prose still describes the old stable-v1 API choice. The newer binding source and `ITERATION-01.md`, plus the actual LOAD probes, govern this investigation. This report does not relabel the actual unstable-v2 artifact.

## 3. Proposed grammar and admission boundary

```text
rule       ::= head [":-" conjunct ("," conjunct)*] "."
conjunct   ::= relational_atom | "[" expr comparator expr "]"
comparator ::= "=" | "!=" | "<" | "<=" | ">" | ">="
expr       ::= additive
additive   ::= multiplicative (("+" | "-") multiplicative)*
multiplicative ::= unary (("*" | "/") unary)*
unary      ::= signed_literal | "-" unary | primary
primary    ::= variable | literal | "(" expr ")"
```

This is an illustrative unambiguous implementation target, not a parser patch. Resolve signed-literal tokenization explicitly: accepted literal `-9223372036854775808` must not first parse the unrepresentable positive magnitude. At an operand position, a contiguous negative decimal is a signed literal; at an operator position, minus is binary subtraction even when followed by digits. Exponent signs remain inside the numeric token. Negation on a variable/group is an AST operator. Cover `?n-1`, `1--2`, `-?n`, `-(?n)`, exponent signs and `--9223372036854775808`. A recursive-descent parser cannot simply reuse the current comma/parenthesis-delimited numeric scanner for operators/brackets. Unary plus, `==`, `<>` and `%` are outside this selected grammar and must be rejected rather than inheriting host syntax.

Only the six listed comparator spellings are admitted. No comparisons nested as numeric expressions, chained comparisons, AND/OR/NOT, casts, assignment, regex, power, generated sequences, time/random/file functions, dynamic SQL, nested queries or arbitrary callbacks. Quotes must isolate bracket/operator/comment characters as string data. Legacy `%`/`#` comments must not accidentally introduce a remainder operator.

Admission traverses **all** rules, including unused and empty ones. Reject malformed syntax, unknown/unsupported constructs, undefined predicates, unsafe head variables, unbound filter variables and structural limits before accepting execution. Every variable in a filter or head must appear in a positive relational atom in that same rule. Equality is a predicate, never an assignment/unification source: `[?new=?old]` does not ground `?new`.

The coordinator selected no constant arithmetic folding: a syntactically admitted `[1/0=0]` remains a runtime operation. It faults for a completed candidate, including the one empty-binding candidate of a ground filter-only rule. It remains dormant behind a genuinely empty relational join. Do not reject it merely because a constant fold notices the fault in an otherwise unreachable rule.

### Exact proposed structural accounting

| Metric | Proposed maximum | Count definition |
|---|---:|---|
| Positive atoms/rule | 16 | Existing relational atoms only; unchanged |
| Filters/rule | 16 | Each bracketed comparison once; additional independent cap |
| Filter AST nodes/rule | 256 | Every literal leaf, variable leaf, unary operator, binary arithmetic operator, and comparator, including repeated occurrences; sum over all filters |
| Filter AST nodes/program | 4,096 | Sum of those rule counts, including unreachable rules |
| AST depth | 32 | Leaf depth 1; unary depth `1+child`; binary/comparator depth `1+max(children)` |
| Parser nesting | 32 | At most 32 simultaneously open expression parentheses/unary recursive descents; parentheses count even when absent from the final AST |

A comparator and each occurrence of `?v` are real nodes. Head and relational-term nodes do not enter these new counts; existing arity/body/variable limits already bound them. Check before allocating/inserting the next node, and use overflow-safe remaining-cap arithmetic. A long left-associated expression must obey AST depth even if the parser uses a loop and does not recurse. Parenthesis nesting must obey its own cap even if AST depth is tiny. Use finite explicit stacks/flat postorder instructions if that simplifies reliable enforcement. These numbers are the selected admission limits, not benchmark-proven optimal values.

The corpus also specifies exact new-filter work/budget examples and has exact 256/257 rule-node and 4,096/4,097 program-node constructions, and 32/33 parenthesis and 16/17 filter boundaries. Explicit unary and left-associated 32/33 AST-depth cases and 128/129-byte numeric-token cases are included too.

## 4. Operator/error semantics and planning dependencies

- `=`/`!=`: tag plus normalized payload identity. Cross-tag equality is false; inequality true. No SQL coercion, Python bool/int equality leak, epsilon float equality, Unicode normalization, or locale collation.
- Ordered comparisons: require equal tags first. String order is unsigned UTF-8 bytes; i64 uses direct signed comparisons, **not subtraction**; f64 uses finite numeric comparisons. Boolean predicate ordering is explicitly `TD_E_EXPR_TYPE`, even for two Boolean operands; canonical result sorting retains its separate Boolean order. Cross-tag tag rank remains output sorting only.
- `+ - * /` and unary minus: same tag, i64 or f64 only. No implicit widening/narrowing. String concatenation and Boolean arithmetic are unsupported TYPE errors.
- i64: checked add/subtract/multiply/negate; precheck division zero and MIN/-1 before native division. Division truncates toward zero, preserving the i64 tag. Intermediate overflow is an error even if later arithmetic would mathematically cancel it. If remainder is later selected, it needs the same MIN/-1 guard and dividend-sign remainder semantics.
- f64: perform each AST operation as binary64 with specified round-to-nearest/ties-even; do not reassociate or contract multiply/add into FMA (an explicit `-ffp-contract=off` build choice is worth testing when implementing these AST operations). Check zero divisors, including normalized negative zero, before division; classify every nonfinite result as `TD_E_EXPR_OVERFLOW`. Finite nonzero subnormal results remain valid. A multiply/divide of nonzero operands that rounds to zero is explicitly `TD_E_EXPR_UNDERFLOW`. Multiplication by zero, a zero numerator and exact addition/subtraction cancellation remain valid canonical +0. Literal nonzero-underflow rejection stays static and unchanged.

For each complete relational assignment, evaluate filter ASTs left-to-right with left-before-right operands, continuing after any **false** filter. As soon as an actual error occurs, abort the invocation; do not try to produce a successful empty result. Head tuple construction/dedup happens only after all filters succeeded and were true. This avoids error suppression by an already-known answer or by another candidate producing the same head.

It is safe to reorder pure positive joins to find the same completed assignments. It is **not** safe to evaluate potentially faulting filters on a partial assignment or prune the join using a false filter before all remaining matches/faults are accounted for. “Inputs bound” is necessary but not sufficient for semantic pushdown: a later join can make the complete body empty. For item 2, keep a simple complete-join barrier. Treat any future error-preserving pushdown proof as a separate optimization with its own oracle tests.

When multiple different error classes occur in different candidates, traversal order may differ across native/naive/SQL evaluators. Do not accidentally promise a globally canonical first offending row. For this item, require fail/no partial result and one of the actually encountered explicit categories, with exact category parity on single-fault-class fixtures. A globally deterministic multiple-error precedence would require a separately specified collection/ordering strategy and can add substantial work.

### Selected floating-point entry boundary

The shared selected contract additionally requires IEEE-bit-based finite/zero/identity/sort primitives and `TD_E_EXPR_FLOAT_ENV` on unsupported x87/MXCSR controls before typed constructor/add/run entry. Nearest rounding, masked exceptions and FTZ/DAZ off are required; sticky flags need not be clear and the host state must not be changed. This report does not claim those future guards are implemented or tested; standalone/default-environment probes here are not FP-control acceptance. The common contract and independent semantics campaign own the exact controls and long-decimal parsing research.

## 5. Work accounting and resource/security limits

The coordinator selected this conservative additive policy (superseding the initial alternatives documented in `POLICY-ALIGNMENT.md`):

1. Preserve each implementation's existing no-filter candidate-row charges exactly.
2. At each completed binding, before evaluating each filter, debit its full AST-node count once. Every leaf and operator is therefore paid, including a false filter. No common-subexpression/constant folding changes this charge in item 2.
3. Before a same-tag string comparison, additionally debit `ceil((utf8_bytes(left)+utf8_bytes(right))/64)` units. Charge both operands conservatively, covering browser UTF-8 encoding as well as comparison even when a length check or early differing byte would finish sooner. The comparator node already pays the fixed work. Numeric/tag checks are constant work covered by their nodes.
4. Reject before exceeding the remaining budget; never perform the expensive operation and charge afterward. Use checked/subtraction-based budget arithmetic rather than overflowing accumulated costs.
5. Temporary numeric expression values remain locals/scratch slots, never dictionary entries or emitted generated terms.

A filter-only `[1=1]` costs 3 AST units; `[1=2], [1/0=0]` precharges 3 then 5 units, so budget 7 yields `TD_E_EXPR_LIMIT` and budget 8 exposes `TD_E_EXPR_DIV_ZERO`. A same-string comparison of two 16,384-byte literals costs 3+512=515 units.

This policy preserves old programs' exact work counters while preventing expression-node and long-common-prefix comparison amplification from hiding under one row-visit charge. It is an admission-cost model, not a timing promise. Browser and native already expose different reference-algorithm work counts; do not require cross-algorithm counter equality. Shared semantic/error tests need sufficient limits so one algorithm's earlier resource exhaustion does not masquerade as a semantic mismatch. Separate exact counter and exact at/beyond-budget tests per implementation.

New filter execution is bounded by the paid node work; string scanning is bounded in 64-byte blocks. However parsing, SQL list construction, lazy index construction, hash-table overhead, output allocation and native RSS are **not** thereby completely accounted. Native rows can be much larger than the browser/store subset. Keep the existing smaller store/browser admission caps and existing storage-root confinement. Do not raise limits merely to run a test. Cancellation/OS quota work and full command recovery remain later ordered items; no item-6/7 implementation is proposed here.

Security boundary: the filter parser must remain an isolated language implementation, not `eval`, Python AST execution, SQL-string compilation, DuckDB `query()` or arbitrary UDF dispatch. Bind program/data/clocks in the outer fixed SQL. A textual filter with SQL keywords must fail grammar checks, not execute. A fixed trusted extension still runs with process privileges; grammar validation and DuckDB settings do not turn this prototype into a hostile-input sandbox.

## 6. Independent oracle/native/SQL/browser/store parity

Keep implementations independent; share a declarative corpus, not an evaluator. The 95 proposed cases in `proposed-fixtures.json` are **UNRUN for item 2**. They include typed identity, invalid type combinations, full-range i64, Unicode, subnormal/rounding, overflow, dormant faults, false-filter dominance, dedup hazards, seeds, unsafe syntax, parser bounds, ages/ranges and half-open temporal cuts.

- Native: retain exact real C API v2.0.0 and checked C++ arithmetic. A standalone UBSan probe here establishes only the proposed low-level arithmetic technique, not the engine implementation.
- Independent Python oracle: model i64 with Python integer intermediates and explicit signed-range checks after **every** operation. For truncating division use absolute-integer quotient plus sign, never a float conversion and never Python floor `//` unchanged. Reject bool as i64. F64 remains explicitly tagged.
- SQL oracle: carry the tag and separate payload columns, comparing payloads only under the correct tag. For checked i64 `+ - *`, guarded HUGEINT intermediates can hold the product of two i64 inputs before a range check and BIGINT cast; apply range checks after each AST operation. Guard zero/unrepresentable division explicitly. Evaluate error flags as data independently of final row filtering, then reject if any completed candidate has an error. A raw WHERE conjunction or TRY_CAST-to-NULL is not equivalent: an optimizer can hide faults, and NULL is not a language value. String binary order can be made explicit through encoded bytes rather than session collation.
- Browser: parse i64 and both temporal axes directly from canonical decimal strings into BigInt; check range after every operation. Never use Number or `BigInt.asIntN` wrapping. JS default string ordering is UTF-16 code-unit order, not the required UTF-8 byte order; test U+E000 versus U+1F600. Reject nonfinite arithmetic before JSON serialization could replace it with null.
- Store: construct equivalent logical histories through ordinary typed transactions; do not inject raw fixture rows or bypass schema/clock/receipt guards. Store `known_at` cannot exceed the current logical position. Temporal native fixture coordinates and store transaction recipes must be matched deliberately. Event-time fact payloads are still i64 values; this item adds no date/timestamp tag, calendar arithmetic or intrinsic clock functions.

Temporal visibility precedes logical filter evaluation, with both axes half-open. Test valid lower inclusion/upper exclusion and knowledge retraction boundaries, including decimal-string coordinates above 2^53. Require byte-for-byte tagged row agreement, not row counts alone. On semantic errors require an explicit normalized category and no successful partial object. Wrapper/host prose and existing outer `TD_E_EXEC phase=exec` need not be identical across languages.

The corpus also includes a floating multiply/subtract case that becomes nonzero if incorrectly FMA-contracted, and an intermediate i64 overflow that must not disappear by reassociation. The test suite must exercise the operation tree, not merely mathematical real-number identities.

## 7. Precise atomic failure boundary and receipts

### Before COMMIT

For a `transact(..., evaluate=Query(...))` failure caused by syntax, admission, type, zero divisor, overflow, underflow, unsupported FP environment, max work/facts/rounds, or materialized-output failure:

- Return/raise an error, not a Commit carrying partial evaluation rows.
- Roll back the staged logical clock increment, receipt row, assertion insertions, retraction end positions and retraction timestamps.
- Preserve the full previous retained history, ledger and clock, not just currently visible values.
- Failed command receipt is absent. A corrected retry of the **entire** command may reuse the ID and commit once at the next position.
- After reopening the disposable DB, compare exact logical state again. File-byte identity is not a valid rollback assertion because checkpoint/WAL housekeeping may change representation.

The ordinary one-row store path fully materializes its native result and converts its carriers before COMMIT. Evaluation sees its own writes on the same transaction snapshot; explicit historical `known_at` still behaves historically. Do not open an external evaluation connection or evaluate a pre-commit result after releasing the transaction lock.

### After COMMIT / uncertain acknowledgement

An exception after COMMIT, including existing postcommit observed-size budget failure, does **not** mean rollback. Preserve/report `committed_position` where available. Query the stable command receipt on a healthy/reopened store; if present, do not replay the mutation. A duplicate committed command must return its original position via DuplicateCommand without applying changes. If acknowledgement/connection state is unknown, do not infer an absent receipt from an unverified failed read. This is a boundary specification; crash/fault-hook/WAL implementation is deferred to item 7.

### Per invocation versus arbitrary SQL streaming

`TypedEngine.run()` returns only after fixed point, filters, result bounds and sorting succeed; it can safely promise no partial nested answer. A store command can promise the precommit transaction boundary above. The scalar binding may populate earlier rows in a callback before a later invocation errors. The bounded Python streaming probes here observed **zero rows delivered** for final-row syntax faults across 128, 4,096 and 16,384 invocations. This is useful negative evidence, not proof of all C API streaming modes, all host clients, or atomicity of arbitrary SQL side effects. Scope public claims to the actual invocation/store interface unless a wider surface is separately verified.

## 8. Actual probe evidence (accepted item 1 only)

All probes used the accepted genuine unstable-v2 artifact SHA-256 `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d` and local DuckDB `2.0.0`. No dependencies were downloaded. Probe databases and copied source closure stayed under this worker's allowed root. `_path`, ROOT computation, budgets and extension loader were not monkeypatched; exact-copy hashes are in `source-copy-manifest.json`.

`probe-current-boundaries.json` records 22 observations:

- Raw SQL returns true for `1=true`, `1='1.1'`, `1=1.0`; BIGINT `1/2` returns 0.5; `-7//3=-2`, `-7%3=-1`.
- Pinned integer zero division, BIGINT add overflow, MIN/-1 division and MIN%-1 all throw. F64 division by zero returns infinity; 0/0 returns NaN; max finite times two returns infinity; minimum subnormal divided by two returns host finite zero, which the selected language must reject as `TD_E_EXPR_UNDERFLOW`.
- Unchanged storage-root confinement rejects a DB outside the exact-copy storage root.
- An actual native max-work failure after staging a correction preserves full history, receipt ledger and position; the failed receipt is absent.
- Proposed bracketed ordering/equality are currently rejected as unsupported syntax and roll back. Unsafe head, computed-head generation and undefined-predicate failures also roll back.
- Retrying the precommit-failed command succeeds once at position 2; same-transaction evaluation returns the just-written age21 and the other age30. Repeating its committed ID yields DuplicateCommand at position2 without a new write. Closing/reopening preserves exact logical state (three retained assertions, two receipts).

`checked-arithmetic-probe.out` records 20 i64 cases plus two f64 observations from the standalone C++17 sketch compiled at `-O3` with UBSan and `-fno-sanitize-recover=all`; it exited 0 with no UBSan diagnostic. This validates this bounded sketch on this host only. The actual engine has **not** acquired these operators through this work. `STORE-ACCEPTANCE.md` and `test_item2_store_acceptance.py` now prepare13 real-store test methods,11 runtime-fault rollback cases and18 structural/operator boundary subcases. Their intentional old-artifact feature gate exits2 with UNAVAILABLE/UNRUN; no fake evaluator or skip stands in for support. `contract-reference.json` records the aligned common contract hash.

`probe-streaming-boundary.json` records the three negative streaming observations described above. No global all-client streaming guarantee follows.

### Reproduction

Run `prepare_probe_closure.py` to prepare an exact local copy of the five paths listed in `source-copy-manifest.json` at `exact-source-probe/`, verifying every hash. This is a disposable relocation, not permission to change the original store's confinement. Set an existing trusted DuckDB2.0.0 module path, without installing globally:

```sh
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2
export TMPDIR=/tmp/temporal-roadmap-research/iteration-02/admission
python3 -B "$TMPDIR/prepare_probe_closure.py"
python3 -B "$TMPDIR/probe_current_boundaries.py"
python3 -B "$TMPDIR/probe_streaming_boundary.py"
python3 -B "$TMPDIR/generate_proposed_fixtures.py"
g++ -std=c++17 -O3 -Wall -Wextra -Wpedantic -Werror \
  -fsanitize=undefined -fno-sanitize-recover=all \
  "$TMPDIR/checked-arithmetic-probe.cpp" -o "$TMPDIR/checked-arithmetic-probe"
"$TMPDIR/checked-arithmetic-probe"
```

The source-only publication manifest excludes copied native/runtime files, probe binaries and all database/WAL/spill files. Reproduction requires the supplied accepted source/artifact and pinned runtime; the text-only report is not a runnable engine distribution.

## 9. Acceptance handoff and remaining decisions

Before implementation, preserve the report/fixtures/probe sources and textual evidence with the frozen publication manifest. Do not publish incidental `/tmp` DBs, native binaries or runtime copies.

Then implement only item 2 and require: all-program admission cases; all-filter full-match fault dominance; exact independent tagged rows/error categories on the shared subset; native/browser/store limits; actual same-transaction arithmetic-failure rollback; old no-filter grammar/answers/counters; genuine unstable-v2 loading; sanitizers; and honest full-path timings including SQL list creation/fetch. Age/range/time parity is not established by the current item-1 probes.

The coordinator resolved the initial options: Boolean ordering is `TD_E_EXPR_TYPE`; nonzero multiply/divide rounding to zero is `TD_E_EXPR_UNDERFLOW`; string work charges both operand byte lengths. `POLICY-ALIGNMENT.md` preserves the earlier alternatives only as superseded proposals. A real-store acceptance harness/spec is included but item-2 success remains UNRUN until a genuine supporting artifact is supplied. No remainder operator is proposed in the core grammar; the low-level remainder probe documents a hazard if that scope is later selected. Multi-error global precedence is not promised. No item-2 correctness pass, performance improvement, complete resource bound, crash recovery, production readiness or roadmap completion is claimed.
