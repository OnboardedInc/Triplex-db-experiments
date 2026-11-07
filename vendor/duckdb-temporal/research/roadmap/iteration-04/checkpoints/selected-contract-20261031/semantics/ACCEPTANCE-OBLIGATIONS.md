# Exact semantic contract: independent acceptance obligations

2026-10-31 UTC. **All UNRUN.** Specifications only; no implementation or runtime authority. `!` is the proposed new syntax, and examples assume every referenced relation is defined unless the case deliberately tests undefined names.

## Grammar and names

| ID | Obligation |
|---|---|
| C01 | Accept a single body prefix `!p('x')`, including existing whitespace/comments between `!` and atom; reject `!!`, negative heads, `![filter]`, negated conjunctions and computed relational arguments as syntax. |
| C02 | Define/use ordinary predicates `not`, `NOT`, `eq`, `add`, `div`, `true`, `false`, and `_` without introducing a keyword/builtin reinterpretation. Bracket `!=` keeps its adjacent-token rule. |
| C03 | `?_` positively binds, may be projected, and every repetition denotes the same variable. A positive tuple with unequal repeated `?_` positions must not match. |
| C04 | Negation-only `?_` is unsafe, exactly like `?x`; quoted `'_'` is a string literal, and bare `_` is not an anonymous term variable. |
| C05 | New grammar keeps ASCII identifier/length/string/numeric literal rules. One name at a different arity is rejected rather than overloaded; zero arity and triple heads remain invalid. |
| C06 | The17th signed relational body occurrence fails the combined16 cap, even when positive/negative counts separately fit16; filters retain separate caps and all variable occurrences count toward64. |

## Safety and exact static priority

| ID | Obligation |
|---|---|
| V01 | After a successful structural parse, choose global class order NEG_UNBOUND, HEAD_UNBOUND, FILTER_UNBOUND, missing answer, undefined target, negative cycle. Do not let an earlier rule of a lower-priority class win. |
| V02 | Literal `answer(?x) :- !p(?x).` selects `TD_E_NEG_UNBOUND` despite simultaneous unsafe head/undefined p; ground `answer('x') :- !p('x').` selects `TD_E_PROGRAM_UNDEFINED`. |
| V03 | New head-unbound uses `TD_E_HEAD_UNBOUND` regardless of whether filters exist; filter-unbound uses `TD_E_EXPR_UNBOUND`. Old APIs preserve current messages/priority. |
| V04 | Within a class select lowest source rule, relational-atom/filter ordinal and variable structural ID. Repeat identical input to require identical code/message/ordinals; do not require multiply-invalid permutations to retain the same occurrence. |
| V05 | A later malformed token/literal/cap failure may stop structural parsing before global semantic classes are examined; tests must not assume the semantic class order spans unsuccessful parsing. |
| V06 | Negative-before-positive source order is safe when all variables occur positively elsewhere in the same rule. A filter equality or query-bound head does not create a binder. |
| V07 | Validate unused and data-empty rules. A false filter/contradictory body/fact proving a predicate does not waive unsafe variables or negative cycles. |

## Graph, recursion, emptiness and ground rules

| ID | Obligation |
|---|---|
| G01 | Both signs participate in SCC computation and condensation. A negative self-edge, mixed positive/negative cycle and even-negative cycle all reject. Keep parallel +/− constraints between the same names. |
| G02 | Positive self/mutual recursion remains valid. A defined unseeded positive component finishes empty; it is not undefined or incomplete. |
| G03 | Minimal numeric levels use positive weight0/negative1, but a same-level positive predecessor SCC must fully finish before its consumer base rule reads the complete lower set. |
| G04 | Several defining rules of one negative target must all finish before absence is tested. A blocker appearing only after several positive rounds suppresses the upper result. |
| G05 | Ground negative-only rules receive one empty-binding candidate after dependencies complete, not unconditional startup seeding. Facts are seeded once; no redundant IR facts stream exists. |
| G06 | A defined empty target makes already-ground negative tests true. An empty positive join gives no candidate/universe. Undefined negative target remains static error. |
| G07 | Nonlinear positive recursion covers every positive delta position; negative targets never use deltas. Empty/no-seed components terminate with explicit completion markers. |
| G08 | Endpoint exclusion after reachability differs from traversing only unblocked nodes: a→b→c with blocked b may retain c under endpoint exclusion. Do not substitute one query for the other. |
| G09 | Evaluate all program IDB SCCs before answer return. An answer-unreachable component with an actually reachable scalar fault must still abort; whole-program static checks alone do not justify runtime query slicing. |
| G10 | For independent ready components use canonical sorted relation-signature topological ties; preserve source-order rules/variants. No hash iteration order is accepted as a public cross-platform first-fault promise. |

## Faults and admission

| ID | Obligation |
|---|---|
| F01 | A complete positive binding that a negative atom would discard still evaluates its faulting filters first. Empty negative target and already-present/pending head cannot hide the fault. |
| F02 | False does not skip another filter; actual errors abort. Reordering fixtures with several error classes compare fault presence only unless exact priority is separately specified. |
| F03 | Empty positive join leaves valid arithmetic faults dormant. Ground-only body has one empty binding. A positive helper that excludes bad bindings may legitimately prevent later arithmetic faults; inlining is not automatically equivalent. |
| F04 | Bind all admitted tagged relational values even when later arithmetic is ill-typed. Never prefilter oracle substitutions to arithmetic-safe values. |
| F05 | Only four logical tags are admitted: NUL-free UTF8 strings, Boolean, int64, finite f64 with canonical zero. NaN/inf/NUL are rejection controls; STRUCT is carrier/schema, not nested logical values. |
| F06 | Validate malformed inactive supplied history too. Per-row validation and visibility selection may interleave, but successful loading of every supplied row precedes rule execution/result. No physical two-pass requirement or visibility-prefilter shortcut. |
| F07 | Keep exact half-open int64 valid/recorded cuts. Root correction fixture must exclude p at(4,2), include at(4,3), include at(7,2), exclude at(7,3); earlier known snapshots retain their results after later corrections. |
| F08 | All strata share one selected EDB/dictionary and no cross-call result cache. Native point admission differs from store known-position admission; direct API does not certify complete external DB history or held catalog authority. |

## Independent oracle, counters and owned IR

| ID | Obligation |
|---|---|
| O01 | Tiny level search counts ALL P predicates including fixed triple=0, range0..P−1. P^P is a loose bound; P^(P−1) with fixed triple. Zero variables gives D^0=1, not zero candidates. |
| O02 | Use independent program descriptions, tagged identity, safety sets, level search, scalar checked layer and naive synchronous saturation. Share no production parser/SCC/delta/tuple hash/filter evaluator. |
| O03 | Use ample budgets for successful-set/fault-presence permutations. Exact component-round/work/cap outcomes require a separate hand-derived event ledger of the chosen new schedule; naive oracle operational counts are not those counters. |
| O04 | Global facts/work/dictionary/component-round totals span every component. Check pending facts only once across merge, all-negative group precharge, duplicate negative occurrences, matched/empty/absent checks, and no successful partial prefix. |
| O05 | Compiler IR2 exports all signed source rules and owned postfix filters without evaluating constant-false/type/zero-divide/overflow/underflow expressions. Exactly one final comparison and exact deps/stack/height/node limits must hold. |
| O06 | IR2 preserves structural variable IDs and both source-order arrays, owns literals/strings, contains no borrowed handles/dictionary IDs for constants, and exports no duplicate facts seed stream. Encoding caps4MiB/program and32MiB/callback are checked without a partial public result. |
| O07 | No public API executes supplied IR; future strict-consumer validation is documentation only. IR1 exact keys/schema/language/counters and old positive query APIs remain unchanged and reject/ignore no new signs silently. |
| O08 | New query exposes named new metrics and equality work=positive_attempts+expression_work+negative_work; negative_checks is not charged twice. Fixed-input structural schedule does not imply counter/near-cap invariance under program permutations. |
| O09 | Supported FP controls/trusted-callee premise remains continuous; compilation metadata/constant arguments are not an authority cache. No callback cancellation capability, SQL route, store dispatch, guard bypass or item3 acceptance is inferred. |

Record exact source/artifact hashes, route, typed carrier/domain, program bytes, snapshot pair, limits, expected oracle result/error, observed full/error outcome and unrun/blocked/passed status separately when execution is eventually authorized. This matrix itself establishes none of those runtime outcomes.
