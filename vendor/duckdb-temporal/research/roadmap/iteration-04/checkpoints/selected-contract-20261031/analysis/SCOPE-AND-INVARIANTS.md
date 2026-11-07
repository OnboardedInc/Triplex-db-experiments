# Item 4 selected-contract preparation: scope and proof obligations

Draft 2026-10-31; not an implementation or execution gate. This is new item4 work, independent of the stopped item3 save. The authoritative selected contract will be frozen only after the exact API, IR2 and semantic proposals receive independent review.

## Initial deliverable boundary

The first code milestone is an additive argument-only typed native signed evaluator and an owned inspect-only compiler IR. It takes a complete typed temporal fact list as arguments; it does not open databases, execute SQL, discover attachments, inspect a private catalog, select an execution route, or cache authority. No existing store/SQL planner is activated or weakened. Thus native-only correctness/performance evidence must not be represented as acceptance of item3 or complete store-integrated acceptance of item4.

All old positive entrypoints, IR1 serialization/decoder, source grammar and operational accounting remain compatible. The old source/native evidence remains separately identifiable. New language-version labels, extension-artifact versions and DuckDB unstable-C-API versions are separate namespaces.

## Component-wave protocol to verify

1. Admit the supplied carrier/history under inherited hard caps and one fixed `(valid_at,known_at)` point. Parse/static validation is whole-program; no answer-relevance pruning. The fixed EDB `triple/3` is complete before IDB execution.
2. Build the signed body-to-head graph over all predicates. Both signs participate in SCC decomposition. Any negative edge internal to an SCC is invalid, even in an unused rule or empty runtime relation. Dependency-first SCC scheduling must include positive and negative prerequisites.
3. An IDB SCC starts empty. Its base wave visits every rule whose head is in that SCC once, with complete external predecessors and empty internal predicates. Ground facts are source rules, not a second independent seeding stream. Ground negative-only rules have exactly one empty substitution, not zero.
4. Pending tuples merge only at wave end. Subsequent waves use one nonempty internal positive delta position per variant; other positive occurrences use full relations. External lower predicates are always full/completed sets, never only their last delta. Negative atoms never generate bindings or act as delta positions.
5. A final wave with zero new tuples closes the SCC, including a component whose base wave already produces nothing. Nonempty acyclic components therefore still have a terminal no-change wave under this proposed accounting. Explicit completion must represent empty predicates too.
6. Every IDB SCC completes before returning the requested answer relation, including unrelated SCCs whose complete positive bindings can produce scalar faults. Do not prune such faults as dead code.

If `m` is the number of IDB SCCs and `D` the total number of unique derived IDB tuples, this protocol gives `component_rounds <= D + m`: every nonterminal wave contributes at least one distinct IDB tuple and each component contributes one terminal wave. This is an algorithmic accounting bound, not an execution-time, RSS or allocator bound. The caller's global component-round limit may reject before that bound; no limit is reset per component.

## Per-binding barrier and accounting

After one complete positive binding, run every inherited scalar filter in source filter order. False does not guard later filters. Only if all filters return true may the negative group run. Precharge the whole group's abstract units `sum(1 + arity(atom))` using a checked remaining-work comparison, then test EVERY negative occurrence against the existing complete-key set, including duplicates and later occurrences after an earlier blocker. Only after that barrier may head seen/pending dedup suppress a tuple.

`work = positive_attempts + expression_work + negative_work`. `negative_checks` counts tested occurrences and is not another work summand. Positive attempts preserve the existing eligible-tuple-visit model; expression work preserves node and string-comparison billing. These abstract units exclude parsing, dictionary/index allocation, all host input-list construction and general callback/host work.

Input rows are raw carrier/history rows, separate from unique visible EDB facts. The global fact budget covers visible unique EDB plus all unique IDB tuples and pending additions across all SCCs. There is no fresh-value generation in heads. The exact finite typed dictionary is shared across EDB, constants, all positive joins and all negative keys; full-key membership does not add another relation index.

## Evidence boundaries

- A finite naive oracle must enumerate all predicate levels including `triple/3`, then independently compute full-set strata. It must not reuse production parser, SCC/delta machinery, typed hashing, expression helpers or IR metadata as a trusted answer.
- Counter and admission fixtures need an independent hand-derived ledger; repeated full-set oracle iterations do not prove semi-naive costs.
- Successful answer sets and isolated fault presence under generous budgets are semantic invariance obligations. Exact budget thresholds, candidate order, first error among multiple faults, byte locations and incidental counters are not promised invariant under arbitrary source permutations.
- `no partial result` means no partial graph result for one failed scalar invocation, and no valid prefix from its failed callback/batch. It does not promise retroactive revocation of SQL streaming chunks the host has already delivered, transactional rollback of unrelated host operations, or cancellation.
- Native/batch logical output accounting and new bounded encoded-IR byte caps are not total process-memory, allocation-capacity or RSS guarantees. Strict floating-point checks do not repair the process environment or establish a hostile-callee sandbox.

## Pre-execution gate, still closed

Only research/specification files are currently being written. No application code ownership or compiler/runtime/test permission is conveyed by these notes. After peer closure: freeze and durably verify the exact selected contract, allocate disjoint isolated source ownership, review/checkpoint the resulting candidate, and separately review current capacity plus the narrow build/runtime campaign. Existing item3 stopped save/probe/compiler actions remain stopped; no item4 checkpoint may contain or reconstruct their material.
