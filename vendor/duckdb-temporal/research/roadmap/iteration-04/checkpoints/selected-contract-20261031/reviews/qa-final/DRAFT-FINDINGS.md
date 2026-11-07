# Companion review working findings — revision 002

2026-10-31 UTC. **Source-only review in progress, not a frozen-contract approval. All app/compiler/oracle/native/DB/test/benchmark checks UNRUN.** Revision001 is unchanged. The execution owner is still finishing the exact error table and freeze; current draft hashes are observations, not immutable source identities.

## Material issues sent promptly

1. Initial native draft `d8cd1015` mandated blanket whole-source UTF8 validation including comments and lexicographic pending-IDB tuple sorting. Both contradicted explicit root selections. Native draft `fc3263a2` was subsequently read and corrects both: inherited raw-byte parser admission, typed string validation, no mandatory pending sorting or cross-platform incidental visit/fault-order promise. **Resolved in inspected later draft; final frozen readback still required.**
2. Current native cycle diagnostic says to include sorted SCC member IDs/signatures and separately claims static witnesses fit 16 KiB. A 127-IDB cycle can contain126 identifiers of 128 bytes plus `answer`: name bytes alone 16,134; adding `/1` per member and 126 commas yields 16,514 bytes before IDs/prefix. Ground unary rules forming that cycle, one negative edge, fit roughly 34 KiB source. Thus a single NEG_CYCLE class can exceed the diagnostic cap and fall back to DIAGNOSTIC_LIMIT, losing the promised category. **Proposed fix:** bounded first-negative-edge witness plus sorted relation IDs only; optional names must not erase the primary code. Root independently sent the same recommendation. Await owner correction/freeze.
3. Exact phase/error table is still pending. Freeze request/compile/input/exec/encode mapping, new limit category versus inherited arithmetic/value codes, and limits' exact names before claiming an exact machine-error contract. An error must not be relabelled `phase=exec` merely because a scalar callback caught it.

No owner's proposal file was edited by this reviewer.

## Exact signature and successful-result audit

The current native proposal correctly has seven required positional parameters: program, existing typed temporal facts list, valid_at, known_at, max_facts, **max_component_rounds**, max_work. This final new parameter name replaces the provisional `max_rounds` notation used in QA001's hand examples; old APIs keep their old parameter unchanged.

Exactly ten new result fields, in this order:

| Field | Meaning / check |
|---|---|
| rows | Owned exact typed cell[][], set semantics, inherited final tag/value sort |
| component_rounds | One global sum of charged SCC base/recursive/final-no-change waves |
| derived_facts | All distinct IDB tuples across all components, including ground source facts; not just answer |
| work | positive_attempts + expression_work + negative_work |
| positive_attempts | Candidate positive row visits before unification/constant rejection, after delta-boundary exclusion |
| expression_work | Complete-filter AST precharge plus specified same-tag UTF8 comparison units |
| negative_work | Full admitted group sum(1+arity), charged before any membership in that group |
| negative_checks | Every actual negative occurrence checked; audit count, NOT another work summand |
| input_rows | Every supplied history row including duplicate/inactive rows |
| visible_edb_facts | Distinct selected exact triple/3 tuples at the single two-clock cut |

The nine metrics are nonnegative BIGINTs under the declared caps. `visible_edb_facts + derived_facts <= max_facts`; input-row admission is a different cap. No generic legacy `rounds`, trace array or authority token is added. No caller-IR execution overload exists.

## Global schedule/work checks

The current design is internally consistent on these points, subject to final readback:

- EDB completed after all input admission, zero IDB component-rounds. Every IDB SCC starts empty, including source facts, then gets one base wave reading full completed predecessors.
- Pending facts cannot feed the same wave. Base-only rules run once. After any nonempty delta, every eligible current-SCC positive occurrence gets a delta variant in signed-body source order; negative occurrences are never binders/delta positions.
- Charge final no-change wave even with zero eligible recursive rules: empty component 1, nonempty acyclic component 2. Global rounds at most derived_facts plus IDB component count without the explicit tighter cap. Disconnected defined components still execute.
- Complete positive candidate -> all filters (false does not guard later faults) -> if all true, precharge all negatives together -> probe every occurrence -> reject if any present -> project/seen/pending dedup. No new arithmetic dictionary values.
- Reserve one global pending fact only for a genuinely new full tuple; transfer its reservation at merge, never charge it twice. Completed lower facts/dictionaries retain global accounting.
- Static component/rule/variant order is specified. Existing unordered tuple iteration is not promoted to a cross-platform candidate order or multiple-fault/budget invariance promise. Exact QA001 microfixtures deliberately avoid dependence on incidental row order.

Fresh primary crosscheck: the C++ working draft leaves absolute unordered-container iteration order unspecified, and rehash can change ordering; most unordered operations also retain linear worst cases. This supports withholding a visitation/CPU guarantee, not a measured performance conclusion. [C++ draft, unordered requirements](https://eel.is/c++draft/unord.req)

## Exact budget-model match and logical output units

Current BUDGET-MODEL.json (`td.stratified_budget/1`) matches the native/IR2 numbers: source 65536; term 16384; identifier 128; rules/relations 128 including triple; IDB components 127; variables 64; arity 8; combined signed atoms 16; filters 16; nodes 256/rule and 4096/program; height/nesting 32; signed occurrences 2048; raw rows/facts 100000; component rounds 2000; work 50000000; dictionary 300000 values/16MiB units with 16-byte Entry; native rows16MiB with row model 24+40*arity plus UTF8 strings; batch 100000 tuples/800000 cells/32MiB; IR 4 MiB/program and32MiB/callback; diagnostic 16 KiB.

The model names consistently describe SCC base/final-verify rounds, greedy positive attempts, postfix+UTF8-comparison expression work, full-group1+arity negatives, source relational/filter occurrence order, body-to-head graph and minimal positive0/negative1 strata. `text_model` is the logical typed text policy, not permission to restore a new whole-source UTF8/comments pass.

Root selected **72*callback_row_count** additional logical bytes for the nine fixed BIGINT metrics in the NEW query callback only. Precharge checked multiplication before new output reserves/construction where possible; remaining typed cells/strings use inherited units. The native per-invocation16MiB row model is unchanged, old query batch accounting is unchanged, and the IR compiler's 32 MiB limit still counts serialized IR bytes—not a fictitious nine-metric struct.

Hand unit examples, UNRUN:

- New query row returning one unary string `'ok'`: native row units24+40+2=66; query callback units72+40+2=114. These are different logical models, not physical byte measurements.
- New query row with empty answer:72 callback units, not 0. A zero-row callback has 0 fixed-metric units.
- Whole batch sum and checked72*count multiplication must reject overflow/over-cap rather than reset per row or wrap. If a boundary is unreachable with real host callback cardinalities, establish it through an independently specified bounded-sink/unit scope later; do not invent a reachable runtime stress fixture.

The 4 MiB per-program IR cap may also exceed every structurally admitted source export; no current upper-bound proof or reachable oversized-source fixture is claimed. Bounded-sink and real aggregate callback-boundary options remain separate future scopes.

## Ownership / legacy / error gates still required

Owned IR2 has no facts array and no borrowed literal IDs/pointers; exact 13 postfix node shapes preserve source filter order and compile without evaluating partial expressions. Full relation/rule component partitions, signed edge reconstruction, stack/root/height/dependency invariants and 4 MiB/32MiB logical serialization remain QA001 gates. All FP checks retain the continuous supported-target/trusted-callee premise, no control repair or cached authority.

Same old td_query/td_query_v2/td_plan_ir_v1 types, registrations, parser paths, IR1 bytes and counters must remain unchanged. New phase formatting/TD_E_LIMIT/metric charging belong only to new APIs. A compile-time policy refactor is a possible implementation seam, not evidence that old behavior is preserved.

Error-table acceptance must distinguish request limits/NULLs; compile source/static/node/dictionary errors; input carrier/text/interval/visibility-load errors; exec work/facts/rounds/arithmetic/invariants; encode row/cell/byte/IR limits. Scalar truth faults remain actual faults, not absence or budget errors. Wrong phase, caught-but-returned prefix or positive-parser fallback is unacceptable.

No-partial scope remains one graph invocation/failed callback batch, including a later failing row after earlier encoded rows. It is not retroactive revocation of previously delivered host streaming chunks, rollback of earlier commits, new cancellation behavior or store/catalog authority. Store/planned integration stays blocked.

## Next gate

Read the explicit frozen owner revision, exact budget/error table and freeze manifest; rehash/read back those bytes; record which draft findings are corrected or still blocking. Then produce a separate final revision002 review/manifest without changing QA001 or owner files. No compiler, runtime, DB, test, benchmark, Git or Page action follows from this source-only review.
