# Item 4 pre-code QA and proposed acceptance gates

Prepared 2026-10-31 UTC by `iteration04_contract_qa`. **Independent specification review only. ALL proposed cases, oracle campaigns, compilers, native bindings, databases, tests, EXPLAINs and benchmarks are UNRUN.** No application source or Git/Page state was changed. This new report does not reconstruct or preserve stopped item3 work.

## 1. Review outcome and decisions still to freeze

The proposed additive argument-only native design is suitable to continue through a contract gate, not an acceptance gate: whole-rule positive range restriction, signed-graph rejection, completed predecessor sets at one two-clock cut, eager inherited filters, then grounded full-tuple absence probes. Keep item3 **incomplete / blocked / unaccepted** and do not enable store/planned SQL routes or bypass their guard, including a forced-native selection.

Material findings, communicated before this long file:

1. A semantic oracle must count **all predicate symbols**, including fixed `triple/3`, when bounding level assignments. Zero variables give one empty substitution, even over an empty value domain.
2. A naive semantic oracle cannot certify semi-naive work/round counts or low-budget outcomes. Use a separate hand-derived event ledger.
3. IR1 has only `filter_count`. New IR2 may export full owned postfix filters, but must explicitly remain compiler output, **not executable IR input**. Do not claim round-trip or independent execution.
4. Ground negative-only rules are not unconditional facts. Any redundant IR2 facts view must require zero positive atoms, zero negative atoms **and** zero filters.
5. Negative group precharge is atomic admission: charge `sum(1+arity)` and perform every occurrence if admitted. Matching the first negative cannot suppress later checks or reduce the charge.
6. Reconcile `work = positive_attempts + expression_work + negative_work`; `negative_checks` is separate, not another work summand.
7. No partial successful graph result may escape one failed invocation/callback. This does not revoke earlier host streaming chunks or promise arbitrary SQL-stream atomicity.

Before code, freeze the exact new result type, complete budget schema/version and phase labels/errors. The names `td_query_stratified_v1`, `td_plan_ir_v2`, `td.program_ir/2` and counter names below are the coordinator's current **proposal**, not existing APIs. The execution lane's concrete IR2 proposal was subsequently inspected at 17:27 UTC: `td.typed/0.4`, exact top-level keys, no facts array, full owned postfix filters, explicit graph/components, 4 MiB/program and 32 MiB/callback logical UTF8 caps. Section 7 records that readback; this is not implementation selection or runtime acceptance.

## 2. Fresh primary-source crosscheck

AHV chapter 15 defines nondecreasing positive and strictly increasing negative predicate levels, rejects cycles containing a negative edge, and establishes equivalent successful relational semantics for legal stratifications. Its precedence edges run body-to-head. These relational results do not establish this project's eager scalar faults or budgets. [Foundations of Databases, definition 15.2.4, proposition 15.2.7, theorem 15.2.10](https://webdam.di.ens.fr/Alice/pdfs/Chapter-15.pdf)

Souffle documents positive relational grounding, nonbinding negated literals, and forbidden circular negation. This supports the safety crosscheck, not adoption of Souffle's wider arithmetic, types, wildcard or declaration language. [Official Souffle rules](https://souffle-lang.github.io/rules)

If implemented in Python, an oracle needs explicit tags and checked integer rules: Python Boolean is an integer subtype, mixed numeric comparisons coerce conceptually, and integer `//` floors rather than truncates toward zero. Therefore raw Python numeric tuple equality or `a // b` is not the project's semantics. [Python numeric types](https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float-complex), [Python arithmetic expressions](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations)

The finite enumeration bounds and accounting examples below are this review's derived proposals, not upstream performance claims. Upstream content was read as source material, not executed or copied as a source corpus.

## 3. Independent finite semantic oracle

### 3.1 Input and identity

Use a tiny abstract program with explicit predicate names/arities, positive/negative atom occurrences, literals, rule-local variables and independent filter trees. Do not call the production parser, SCC routine, join indexes, tuple hash, dictionary identity, filter evaluator or temporal selector. Source-generation fixtures may render this abstract program, but expected semantics must not be reconstructed from production IR2 alone.

Keys are explicit `(tag,payload)` values: UTF8 bytes for `str`, Boolean payload for `bool`, mathematical signed integer for `i64`, and canonical finite 64-bit payload for `f64`. Normalize accepted negative zero to positive zero; reject NaN/infinity and logical NUL/invalid UTF8 before semantics. STRUCT is the physical typed carrier, **not** a fifth/nested logical value. Use simple linear tuple equality in the tiny model, not production hashes. Every tuple position and the predicate arity matter.

The active value domain is selected visible EDB values plus every admitted program literal, including filter literals. Arithmetic is transient and does not bind variables or insert newly computed values into recursive relations. Do not exclude relational substitutions because a later arithmetic operation would reject their tag.

Validate **all retained carrier rows** independently before rule evaluation/returned results, even invisible history and rows following a would-be faulting rule candidate. Per-row validation and visibility selection may interleave; a separate all-validation pass is not required. Test snapshot selection independently against hand-specified sets, then compose it with the semantic oracle. No rule evaluation before loading is complete.

### 3.2 Independent stratification and finite bounds

Let `P` be every predicate symbol after identifier/arity resolution, including the fixed, read-only, defined `triple/3`. Same name/different arity is rejected, not overloaded. Include defined empty and unused predicates. `triple/3` is not a dynamic family indexed by the RDF predicate-position value.

For each assignment `s: P -> {0,...,|P|-1}`, fix `s(triple)=0`, and check every body-to-head edge independently:

- positive occurrence: `s(head) >= s(body)`;
- negative occurrence: `s(head) > s(body)`.

An assignment exists iff the finite signed graph is stratifiable. The bound is sufficient: collapse signed SCCs, topologically order them, and compress occupied levels; at most `|P|` components exist. Since `triple` has no incoming definition edge, it can be fixed at 0. **This is a derived bound, not reuse of the production SCC implementation.** A body-only undefined predicate must first be rejected; do not create an empty interpretation to make the constraints satisfiable.

For an initial bounded campaign, propose **filter-free** independent positive/negative ASTs with `|P|<=4` including triple, <=4 rules, <=3 signed atoms/rule, <=2 variables/rule, <=4 admitted domain values and arity<=3. At most `4^3=64` assignments exist with triple fixed, and at most `4^2=16` substitutions per rule/wave. These are campaign limits, not changes to the native limits or a claim that all syntactically possible programs were enumerated. Predeclare the actual program grammar/space and count attempted/admitted/rejected programs before claiming exhaustiveness. Filter/barrier hand fixtures and unchanged item2 regression are separate; this campaign does not require a new arbitrary arithmetic oracle.

For each legal assignment, process occupied levels in increasing order. Use synchronous naive **full-set** saturation of all rules whose head has that level; completed lower sets are immutable. Positive same-level dependencies may need multiple full-set waves. Evaluate each rule against the previous wave's full sets, not newly pending facts. Union new heads at wave end; stop on exact set equality. Negative inputs are strictly lower and complete.

For each complete positive substitution: evaluate every scalar filter, preserving the required fault layer; if all true, evaluate the exact negative memberships, then add the head. Zero variables have `D^0=1` substitution: the empty map. This is needed for ground filter/negative-only rules, not implicit enumeration of an external universe. A nonempty variable set over an empty domain has no substitution.

The maximum possible IDB tuples is `sum(D^arity(r))` over IDB predicates, at most `3*4^3=192` under this campaign. A changing wave adds at least one tuple; use that independent mathematical bound plus one terminal wave per occupied level to detect an oracle defect. Report actual bounds, not a guessed wall-time timeout. Larger arity/domain fixtures should be separate hand cases.

### 3.3 Faults, expressions and comparisons

For item4, use hand-derived filter/barrier results/faults and the unchanged item2 regression, separate from the initial generated negation oracle. Exact f64 identity uses canonical bits, not arbitrary arithmetic. Do not silently label these fixtures a complete binary64 differential oracle.

If a later separate scope builds an independent expression layer, it must enforce exact tags, int64 bounds at **every** intermediate, truncating division without float conversion, MIN/-1 and zero checks. Floating arithmetic would need independently validated per-node nearest-even binary64 rounding (for example exact rational/bit-based reconstruction), finite/subnormal/zero policy and the inherited nonzero multiply/divide underflow-to-zero error. Merely executing Python floats or production expression helpers is not an independent FP oracle. These helpers are not a current pre-code deliverable or an implementation claim.

Compare exact successful tagged sets across legal level assignments and harmless rule/body permutations **under ample budgets**. Compare required fault presence for faulting programs; require a code for a fixture with one reachable fault class. Do not demand equal selected codes for several unrelated faults or equal budgets/counters across alternative schedules. An earlier actual fault aborts execution; there is no claim that all faults are collected. False filters, negative matches and already-existing heads are not fault guards.

Keep these checks separate:

| Evidence layer | Establishes | Does not establish |
|---|---|---|
| Level-assignment validator | independent signed-graph acceptance/rejection | production SCC ordering/counters |
| Naive finite full-set oracle | successful sets and scoped fault presence | exact semi-naive work/rounds or all error priorities |
| Hand event ledger | exact counters on deliberately tiny fixed schedules | general optimizer equivalence or capacity |
| Independent snapshot fixtures | exact selected EDB at a cut | item3 attachment/catalog authority |
| Binding/FP/resource checks later | specified boundary failures and recovery | full allocator/RSS/cancellation/stream atomicity |

## 4. Diagnostic and grammar acceptance proposal

After successful lex/literal/structural parse of the whole program, the semantic lane proposes this **global class priority for the new API only**:

1. `TD_E_NEG_UNBOUND`;
2. `TD_E_HEAD_UNBOUND` (dedicated new-API code, with or without filters);
3. `TD_E_EXPR_UNBOUND` for filter variables;
4. `TD_E_PROGRAM_ANSWER`;
5. `TD_E_PROGRAM_UNDEFINED`;
6. `TD_E_NEG_CYCLE`.

Within a class, select the lowest source rule index, then body-atom/filter index as applicable, then structural variable ID. Source spans are optional additional location data. No variable-name-copy/canonicalized whole-rule-key subsystem is required. Same text must produce stable code/message. A moved source span may legitimately differ. Multiple independently invalid conditions do **not** imply permutation-invariant chosen diagnostics. Preserve old entrypoints' existing text/codes/precedence verbatim.

Concrete diagnostic obligations, all UNRUN. Isolate one invalid class except the explicitly labelled fixed-text priority witnesses:

- Fixed-text priority witness: `answer(?x) :- !p(?x).` selects NEG_UNBOUND before HEAD_UNBOUND/undefined predicates under the new priority. Separately, ground `answer('x') :- !p('x').` isolates PROGRAM_UNDEFINED. This is not a promise about permutations of unrelated multiple faults.
- Use a ground head to isolate a negative-only local variable, including `?_`, and repeat its negative positions. A variable appearing in a filter but not a positive atom is not bound.
- For HEAD_UNBOUND, define `answer(?x).`; for FILTER_UNBOUND, use a ground head and a filter-only variable. Keep other fault classes absent.
- Negative self-loop, two-negative cycle, mixed-sign cycle, parallel positive/negative edges with a return path, and a disconnected invalid component all reject statically. Facts or an empty/contradictory body do not rescue a cycle.
- Undefined positive and negative predicates remain errors; an explicitly defined unseeded positive-recursive relation is valid and empty.
- Same relation identifier at mismatched arity rejects; triple in a head rejects; zero-arity predicates remain unsupported.
- `!atom` is body-only. Negated heads, double negation and negated bracket filters reject. Ordinary `not(...)`, `eq(...)`, `add(...)`, `div(...)` remain relations; names are not new builtins/keywords. Bracket `!=` remains adjacent and unchanged. `?_` is an ordinary named variable, never an existential wildcard.
- Count positive and negative relational **occurrences together** under 16 atoms/rule; inherited filter/node/variable/arity/rule/relation/program limits remain distinct.

Do not write tests asserting universal byte-identical errors after arbitrary source rearrangement, arithmetic faults behind empty positive joins, or runtime semantics for malformed/unadmitted programs.

## 5. Hand-derived accounting ledger — all proposed, all UNRUN

These examples depend on the current proposal: each IDB SCC pays one base round; current-SCC rules cover **every** positive delta position; every terminal no-change round is charged; nonrecursive nonempty component therefore costs 2, empty component 1. EDB costs no component round. Ground/base outputs become pending until base-wave end. Completed predecessors are read as full sets, even after their deltas are consumed. Whole-program processing includes unused defined components.

Use `R=component_rounds`, `P=positive_attempts`, `E=expression_work`, `C=negative_checks`, `N=negative_work`, `W=P+E+N`. `C` is NOT another summand. `F` counts distinct visible EDB plus all distinct IDB by predicate, including pending; duplicate derivations are not new facts. Erroring calls return no result struct; failed-call internal counters are not claimed externally observable.

### A. Ground absence group, both absent

```datalog
answer('ok') :- !triple('a','b','c'), !triple('d','e','f').
```

Empty EDB. Expected sorted answer `{('ok')}`; `R=2,F=1,P=0,E=0,C=2,N=8,W=8`. `max_work=8` and `max_rounds=2` suffice if other limits fit; `max_work=7` rejects **before the group**; `max_rounds=1` rejects before terminal verification and returns no provisional answer. Repeat the same negative atom twice: still two occurrences, `C=2,N=8`.

### B. First negative matches

Same program, with exactly visible EDB `('a','b','c')`. Answer is empty; `R=1,F=1,P=0,E=0,C=2,N=8,W=8`. `max_work=7` must still reject, not succeed by first-match short-circuit; `max_work=8,max_rounds=1,max_facts=1` fit. Changing match rate does not remove a negative occurrence's logical charge. Atomic no-probe-before-precharge additionally requires later source review or authorized internal tracing; success/failure output alone cannot prove absence of a prematurely executed probe.

### C. Filter barrier and zero negative charge after false

Add `[1=2]` to A. Its three AST nodes cost `E=3`; answer empty, `R=1,P=0,C=0,N=0,W=3,F=0`. `max_work=2` rejects in expression precharge; 3 fits. Replace it with `[1=1]`: `R=2,F=1,E=3,C=2,N=8,W=11`; 10 rejects before the negative group and 11 fits.

For `[1=2], [1/0=0]` plus a matching negative, ample budgets must report DIV_ZERO. The first filter has 3 nodes and the second 5. A budget of 7 may instead report expression limit before division; changing filter order may expose division earlier. This is an explicit reason **not** to claim fault-code/budget invariance. Both comma orders under ample limits still expose the single division fault.

### D. Overlapping delta variants before head dedup

```datalog
answer('seed').
answer(?x) :- answer(?x), answer(?x), !triple('block','key','value').
```

Empty EDB. Base merges one seed. Final recursive wave has two delta positions; each visits two positive tuples, evaluates one grounded negative and projects an existing head. Expected `{('seed')}`; `R=2,F=1,P=4,E=0,C=2,N=8,W=12`. Work 11 or rounds 1 rejects with no returned seed prefix. Do not deduplicate complete candidates or stop on existing head before required filters/probes. This checks overlap billing, not a claim that arbitrary nonlinear workloads have these counts.

### E. Global sums, not per-component allowance

`p('x'). q('y'). answer('ok').` has exactly three nonempty acyclic IDB components: `R=6,F=3,W=0`. Rounds 5 rejects and 6 fits; facts 2 rejects and 3 fits. Positive maximum-work admission still requires a positive parameter even when observed logical work is 0.

Two independent ground absence rules `p('x') :- !triple('a','b','c').` and `answer('ok') :- !triple('d','e','f').`, empty EDB: `R=4,F=2,C=2,N=8,W=8`. Work 7 rejects globally, although each component's work 4 fits 7 separately. A disconnected defined predicate is not a free uncounted component.

### F. Cross-tag membership and pending global facts

```datalog
answer(?x) :- triple('candidate','value',?x), !triple('block','value',?x).
```

EDB: four candidate objects `str('1'), bool(true), i64(1), f64(1.0)` and one blocker object `i64(1)`, all visible. Expected output in native tag order: `str('1'), bool(true), f64(1.0)`. `R=2,F=8,P=4,E=0,C=4,N=16,W=20`. Facts 7 and work 19 reject; facts 8/work 20 fit, subject to all other limits. The five EDB triples count even though a blocker itself is not projected. Admission failures must not expose an already pending prefix.

At every cap boundary test zero/negative/out-of-range **parameters** separately from legitimate zero observed counters; exact boundary and one below; duplicates; checked counter arithmetic; and late failure after lower components succeeded. Limits are logical admission units, not a proof of RSS, host materialization capacity, adversarial hashing time or cancellation latency.

## 6. Semantic cases beyond counters

Keep existing research case IDs, but translate each into the final grammar with separately specified expected payloads. Prioritize these independent traps:

1. Empty positive relation plus empty negative target gives no candidates; a ground-only negative rule gives one candidate. Defined-empty versus undefined target must remain distinct.
2. Lower recursive blocker appears only in its last nonempty wave; upper rule is textually first. Wait for all lower rules, including multiple definitions. A higher base rule consumes full completed positive predecessors, not exhausted lower deltas.
3. Nonlinear recursion with 2 and 3 current-SCC occurrences and mutual recursion with distinct seeds; cover every delta position. Successful sets equal the full-set oracle.
4. Reach `a->b->c`, block `b`: endpoint exclusion preserves `c`. A separately written program forbidding blocked intermediates may differ; never rewrite one into the other.
5. False filter before a fault, negative match before a fault, empty negative relation, and already-existing projected head cannot hide a required fault. An actually empty **positive** join has no candidate and no runtime arithmetic fault.
6. A distinct safe positive helper can remove unsafe values before a later arithmetic rule; inlining must not erase that semantic boundary.
7. Negative repeated variable positions/constants and many same-prefix/different-tail tuples use full tuple membership. No per-column existential approximation or wildcard binder.
8. Four tags; int64 extrema/adjacent integers beyond 2^53; canonical 0 and finite subnormal/normal/max f64 bit patterns; empty/case/non-ASCII/composed-decomposed/trailing-space UTF8 strings. NUL/NaN/infinity are **rejection controls**, not identity members.
9. Duplicated retained carriers, duplicated lower proofs and duplicate positive paths preserve set answers while source occurrence/attempt work may differ. A helper projection's distinct rows are real globally counted IDB facts.

### Fixed-cut historical fixture

Use member(p) valid`[0,10)` tx`[1,OPEN)`, old blocked(p) valid`[3,7)` tx`[2,3)`, corrected blocked(p) valid`[5,9)` tx`[3,OPEN)`, represented through actual admitted triple carriers and positive views. For bound-member absence:

| `(valid_at,known_at)` | Expected p in answer? |
|---|---|
| `(4,2)` | no |
| `(4,3)` | yes |
| `(7,2)` | yes: old valid end is exclusive |
| `(7,3)` | no |
| before member's known interval | no: no positive external universe |

Requery old cuts after corrections. All strata share the one selected visible EDB and typed dictionary. No cross-call/lower-set cache, per-stratum repin, latest-value override, epsilon timestamp conversion or OPEN_END arithmetic. Validate inactive malformed history before returned evaluation. Native full-int64 coordinates and store `known_at` constrained to the pinned logical position are different admission contracts; do not conflate them. Writer/concurrent-store tests remain integration designs behind the unresolved gate, not executable permission.

## 7. Owned compiler-only IR2 review

The exact proposal in `.agent-logs/goal4-contract-execution/revision-001/IR2-CONTRACT.md` was read at 17:27 UTC after coordinator direction. It exports `td.program_ir/2`, `td.typed/0.4` with ordered keys `schema,language,relations,rules,answer_relation,dependencies,components,budget_model`; **no facts array**, source-order signed bodies and source-order filters; canonical tagged literals; explicit deduplicated signed edges and deterministic dependency-first components. IR1 stays byte-unchanged. No blocking semantic/ownership/schema flaw was found in this compiler-output design; the full budget model and new query result shape still need their companion contract. This is source-only review, not acceptance or execution proof.

Its explicit caps are 4,194,304 logical UTF8 output bytes/program and 33,554,432 cumulative serialized bytes/callback batch. These do not guarantee `std::string` capacity, allocator overhead or RSS. Require the independent invariants below:

- Exactly 13 fixed opcode names corresponding to literal, variable, negate, add, subtract, multiply, divide, equal, not-equal, less, less-equal, greater, greater-equal. Reject accidental aliases/unknown/irrelevant fields in any later checker. Literal nodes own admitted decoded `Value`s; variable nodes carry only a rule-local structural ID. No dictionary IDs, borrowed `Entry`/string pointers, vector views or arena handles escape.
- Each source-order filter exports source/execution-order postfix nodes; no constant folding, evaluation, reassociation, reorder, inlining or elimination of a false/blocked rule. `answer('ok') :- [1/0=1], !triple('a','b','c').` is a valid **compile-only success** despite runtime DIV_ZERO. Its filter exports five nodes, not a precomputed fault/value.
- Independently simulate stack **shape**, not arithmetic: literal/variable push 1; negate requires 1; arithmetic requires 2 and reduces depth by 1; the sole comparison is the final node, with exactly 2 operands and no leftover roots. Recompute expression height including comparison <=32, live stack bound, all variable IDs<variable_count<=64, and variable-dependency union. Dependencies must be a subset of whole-rule positive binders. If dependency metadata is included, it equals the reconstructed union; avoid silently lossy JSON numeric masks.
- Enforce <=16 filters/rule, summed <=256 nodes/rule, <=4096/program. Parser parenthesis/unary syntax nesting<=32 is a separate inherited admission check and cannot be proved from postfix height alone.
- Signed polarity is explicit per relational occurrence; heads are positive. Relation references/arity and source-order rule/atom/filter identities remain internally consistent. Any exported SCC/strata metadata is independently checked against signed inequalities/completion order. Require a complete disjoint partition of every relation into one component and every rule into exactly its head component; component 0 is exactly read-only triple/3 with no rules/predecessors. Canonical SCC scheduling ties do not promise source-permutation-identical IR bytes.
- Concrete IR2 omits a facts view entirely, so full source rules are the only seeding representation. Negative-only and filter-only ground rules stay conditional rules; no export consumer may turn zero **positive** body atoms into an unconditional seed. The earlier hypothetical facts-view ambiguity is closed by the no-facts choice, not hidden as a tested fix.
- After compiler state and input program storage are destroyed, all returned relation names/string literal payloads remain owned and unchanged. Mutating the caller's original string must not mutate IR. Serialize from that owned output, not a surviving dictionary. These are future ownership tests, not observed results.
- Require checked bounded serialization before each logical append/copy/requested reserve growth, including JSON escaping and structural overhead, under the 4 MiB per-IR and 32 MiB aggregate callback caps. Multiple small programs cannot reset a callback-wide output allowance. Cap metadata/owned copies do not imply full allocator accounting, spare-capacity bounds or RSS. Exact serialization error classes belong in the companion contract.
- Fresh supported-FP checks before/after compile and serialization and at callback boundaries; no host-control repair/cached permission. IR2 compiler scalar remains execution-time volatile like IR1 because a constant program does not make FP admission constant. Keep the trusted-callee/continuous-FP premise explicit.

No IR execution decoder, untrusted IR input API, parser round-trip proof or full semantic-equivalence proof follows from export. A compile-only export checker can compare schema/ownership/shape/metadata to independently rendered abstract fixtures; it must not become the semantic oracle's only input.

Concrete IR2 cases to prepare later, ALL UNRUN:

| ID | Fixture / independent check | Required contract evidence |
|---|---|---|
| IR2-01 | Ground source fact, ground filter-only rule, ground negative-only rule | All remain source rules; no facts key; negatives/filters never become unconditional seeds |
| IR2-02 | `[1/0=1]` with a matching/absent ground negative | Successful compile; nodes literal(1), literal(0), divide, literal(1), equal; no evaluator call/fault folding |
| IR2-03 | Variable first occurs in head, early filter, or early negative and is bound positively later | Dense source-order variable IDs; dependencies sorted/unique and independently reconstructed; whole-rule safety |
| IR2-04 | Multiple filters, arithmetic precedence/unary minus, supported int64 MIN literal | Exact original postfix order/typed literal payloads; no reassociation or loss of adjacent MIN parsing |
| IR2-05 | 13-op inventory; deepest permitted expression; exact node/filter caps and one beyond | Independent shape/height/dependency model; separate syntax-nesting admission; no embedded/nonfinal comparison |
| IR2-06 | Repeated signed occurrences and positive+negative edges for the same relation pair | Rules retain each occurrence; dependency set preserves both signs; cycle/completion metadata remains correct |
| IR2-07 | Independent same-level positive predecessor, multi-member positive SCC, defined-empty component | Full relation/rule partitions, weighted minimal strata and complete dependency-first schedule, including empty components |
| IR2-08 | Destroy compiler/input storage, then inspect/serialize all string and f64 literal payloads | Real owned lifetimes and no dictionary/arena/view escapes; not asserted by type names alone |
| IR2-09 | Control characters/quotes/backslashes/multibyte text and many-program callback | Exact escaping/UTF8 byte charge; cap at/below/above; batch sum not reset; no truncated IR success |
| IR2-10 | Unsupported FP state before compile/serialization or at a supported lifecycle boundary | Fresh fail-closed admission with no host-control repair/cached permission; healthy later call tested separately |

If all structurally admitted programs necessarily remain below the 4 MiB row cap, establish that by a separate exact upper-bound proof; do not invent a reachable oversized source fixture. A later permitted pure serializer test or bounded-sink fault injection can establish the cap boundary directly, but is not an already authorized arbitrary caller-IR execution interface. Callback aggregate limits can be tested with actual repeated source programs after computing their exact encoded lengths.

## 8. Legacy regression and failure envelope

Freeze the exact old names, signatures, return shapes, ordinary predicates, bracket syntax, errors, IR1 strict keys/language/budget model and counters. Old positive `td_query`, `td_query_v2`, `td_plan_ir_v1` use their old parsing/evaluation path; reject `!atom`, never silently upgrade to signed behavior. Expected positive payloads and old exact counters should be pre-recorded from the accepted/frozen reference under later execution authorization, not invented by the new oracle.

Important cross-check: legacy empty `answer(?x):-answer(?x).` can have zero global waves, whereas the new proposed component schedule charges 1; legacy `answer('ok').` charges one global wave, whereas the new signed schedule charges 2. Equality of old and new counters is **not** required. Old API counts/IR bytes must remain unchanged before/after the additive feature on the same fixture and artifact compatibility boundary.

Future failure evidence must cover:

- static/program admission before any returned relation, even unused/empty rules;
- invalid retained carrier late in loading, including inactive history;
- type/arithmetic/FP failures after complete positive binding and before negative pruning;
- global fact/work/round/dictionary/output and IR serialization failures after useful lower results have been computed;
- a multirow scalar callback where an earlier signed row succeeds and a later row faults: callback/batch is failed and must not be consumed as a valid prefix;
- a fresh healthy subsequent call after each specified failure, with no leaked completion marker, dictionary, stale snapshot/result or borrowed pointer.

Scope the no-partial guarantee to a graph result from one scalar invocation and a failed callback/batch. It does **not** guarantee revocation of DuckDB query chunks delivered previously, arbitrary SQL-stream atomicity, rollback of earlier user commits, cancellation responsiveness, crash recovery, or a new per-probe cancellation API. Internal prefix writes are not themselves successful exposed graph results; the later real-host test must observe actual error handling and the public drain/decode boundary, not only a caught exception.

## 9. Acceptance evidence and stopping condition

Before an implementation may be called accepted, require separate reviewed evidence for the frozen contract; new confined artifact identity and real checks when authorized; independent semantic oracle campaign and hand cases; accounting ledger boundaries; owned bounded compiler export; unchanged old APIs/IR1/counters; typed/temporal/FP admission; failed-invocation/batch recovery; and an explicit integration/trust disposition. Preserve failed, blocked and unrun outcomes, with exact source/build/engine pin, fixture/cut/limits, expected/observed result, log/exit status and sanitized call correlation IDs where available.

Any later performance study needs exact correctness first, separate planning/loading/evaluation/drain costs, logical counters distinct from timings/RSS, full sample provenance and the established benchmark plan. No capacity, speedup, stability, production, complete resource accounting or completed item3 claim is made here.

This review stops after delivering this new proposal, source manifest and compact activity log to the coordinator. It authorizes no implementation, native loading, DB calls, tests/benchmarks, Git or Page writes. The coordinator owns selection and durable publication.
