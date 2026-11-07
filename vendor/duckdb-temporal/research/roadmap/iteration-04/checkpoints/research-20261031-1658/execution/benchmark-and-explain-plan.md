# Item 4 benchmark and EXPLAIN design — entirely UNRUN

Prepared 2026-10-31 UTC. This is a case/evidence plan, **not a harness, implementation, execution permission, or result**. No fixture was run; no EXPLAIN, SQL, native binary, compiler, database, application or benchmark was invoked. Item 3 remains blocked/unaccepted; SQL candidates below are quarantined source designs until its exact trust boundary is settled and accepted.

## A. Questions and route variants

The useful comparison is not merely anti-join microseconds. Establish correctness, explicit resource failures and end-to-end cost under the exact typed/time contracts.

| Variant | Representation / schedule | Expected use | Current status |
|---|---|---|---|
| N | One argument-only native invocation; completed lower strata; existing dictionary IDs and Relation.seen full-key membership | Recommended first bounded signed implementation | New design only |
| S1 | Whole-program acyclic/filter-free SQL; existing five-slot typed carrier; explicit ANTI using all-slot IS NOT DISTINCT FROM | SQL comparator only after item-3 trust acceptance | Not generated/run |
| S2 | Same whole-program SQL semantics using correlated NOT EXISTS with all-slot null-safe identity | Compare actual decorrelation/plan costs | Not generated/run |
| S3 | Same semantics with newly specified nonnull tag+canonical-payload BLOB keys | Measure key-width/NULL-predicate tradeoff only after independent encoding proof | Not implemented/run |
| C | Existing positive-only program/API | Legacy semantic/counter regression reference, not a negation implementation | No new run |
| X | NOT IN / ordinary equals on nullable inactive slots | Deliberately incorrect semantic controls; never eligible for production lowering | Design-only negative controls |

Do not compare N's genuine native work/round counters with SQL estimated cardinality as though they were the same unit. Preserve actual counters, cost estimates and wall time as separate fields. Do not create a per-stratum native+SQL hybrid: the selected architecture is whole-program routing, with unsupported/filter/recursive/unproved cases whole-native only under accepted entrypoint/trust conditions.

The concrete **proposed** new-API billing model is specified in execution-research.md section 9: one base round per IDB SCC, all recursive delta positions, a charged no-change verification round, and a global component-round sum; empty component =1, nonempty acyclic component =2. Negative tests after passing all filters precharge sum(1+arity), then count every test without first-match short-circuit. These are logical admission units and remain unselected/unimplemented. For a tiny program with exactly three nonempty acyclic IDB SCCs and no other IDB components, max_rounds=5 must reject globally and max_rounds=6 permits the schedule if all other bounds pass; per-SCC resets would incorrectly hide this boundary. Old positive APIs retain their original counters.

### Logical SQL shape, not implementation

For one fully bound negative atom, S2's semantic design is:
- enumerate the positive binding relation;
- retain a binding only if NOT EXISTS a row in the **completed lower relation** whose every tagged term equals the binding's substituted term;
- use five null-safe corresponding-slot tests per term for the published carrier;
- project/deduplicate only with the proved rule semantics.

S1 uses the same complete equality predicate in ANTI ON. It must preserve all positive binding columns needed by later negatives/head projection and not infer a negative variable binder.

No SQL lowering is proposed for partial expression filters. Even a syntactically reordered SQL predicate can let the optimizer suppress a native-observable arithmetic fault. N's recommended order remains full positive candidate -> every filter -> negative membership -> head projection/dedup.

## B. Concrete case matrix

For every semantic case, first specify the independently derived exact sorted answer at each two-clock cut. Agreement means **exact tagged payloads**, not numeric coercion, unordered JSON floats or row count alone. All lower predicates must be defined even when empty.

Storage fixtures must retain <=512 rows, including inactive historical versions. Larger cases belong only to a separately authorized direct-native scope and do not widen persistence admission.

| ID | Fixture / scale | Expected logical property | Hypothesis to measure later |
|---|---|---|---|
| E00 | zero candidate rows; zero lower rows | empty answer; both predicates complete | empty-left plan simplification / minimal native work |
| E01 | 1, 8, 64, 256 distinct candidates; defined-empty lower | all candidate keys survive | SQL empty-right bypass vs per-candidate native membership/charge |
| E02 | zero candidates; 1..256 lower rows | empty answer | lower work is still globally validated/accounted; no false "incomplete" |
| M00 | 128 candidates; disjoint lower set of 128 | 128 answers | unsuccessful probe throughput; no output amplification |
| M01 | 128 candidates; identical lower set | zero answers | successful probe rejection; output savings do not erase input/admission cost |
| M02 | 128 candidates; 1%, 50%, 99% overlap (integer counts recorded exactly) | candidate count minus exact intersection | selectivity/cost curve; no assumed anti-selectivity in admission |
| D00 | 128 candidate carriers; 384 duplicate lower carriers (<=512 retained total) | duplicates do not change lower membership or answer | raw scan/list cost versus dedup build benefit; pure-equality hash-ANTI duplicate elimination |
| D01 | many positive derivations projecting to the same head, with negative keys equal for those derivations | head is a set; filters/probes still evaluated at the inherited candidate seam | pre-dedup work vs answer-size cost; never validate from cardinality alone |
| K00 | full key (x,y) with repeated x and many distinct y; compare blocked exact pairs vs same x/different y | only complete equal pairs removed | full-key seen beats a per-column scan under prefix skew |
| K01 | negative p(x,x), p(x,constant), p(constant,x), all-ground p(constant,constant) | repetition/constants use exact tuple substitution | no unbound/wildcard index needed |
| C00 | same spelling/value: str "1", bool true, i64 1, f64 1.0 | four values; blocking one removes only that tag | tag protection; SQL combination-cast hazards |
| C01 | i64 9007199254740993, adjacent i64s, int64 min/max, f64 values near 2^53 | no i64-through-DOUBLE collapse | native IDs / fixed BIGINT vs DOUBLE slots |
| F00 | f64 canonical zero, negative-zero input, hex bits 0000000000000001, 0010000000000000, 7fefffffffffffff and adjacent finite values | zero normalization; finite subnormal/normal/maximum identities stay exact | BLOB-key conversion cost vs native bit dictionary; continuous supported-FP premise |
| T00 | case variants, composed/decomposed Unicode, non-ASCII UTF-8, trailing spaces, 512-byte storage text | exact byte identity, no collation/normalization | BLOB bytes avoid VARCHAR collation; long-key hash cost |
| H00 | lower blocker starts/ends exactly at valid_at | half-open valid boundary | snapshot predicate cost and no endpoint arithmetic |
| H01 | late-recorded assertion/retraction/correction; same old valid_at at old/new known_at | newer known cut may change absence; historical cut remains correct | no reuse of wrong-cut lower cache |
| H02 | duplicate visible versions plus overlapping different payloads | duplicates collapse, different facts coexist; no last-write-wins | EDB DISTINCT/list materialization overhead |
| S00 | positive recursive reach SCC with frozen lower blocked; chains/diamonds/cycles/nonlinear or mutual positive recursion | fixed-point reach over allowed edges; lower state never changes inside SCC | total positive rounds/probes and no per-stratum budget reset |
| S01 | lower recursion derives blocker only in its last nonempty wave; upper rule text appears first | upper absence must wait until full lower completion | catches global-wave leakage and rule-order dependence |
| S02 | higher base rule uses completed lower positive relation after its delta was consumed | expected higher rows still appear | catches naive reuse of delta_begin without base seeding |
| S03 | all-ground negative-only rule, lower defined-empty/nonempty | one empty binding after lower completion; succeed/fail accordingly | special seed scheduling must not be tied to any positive delta |
| A00 | positive relation P with n=255,256,257; candidate join P(x),P(y), head projects x | positive binding counts 65025,65536,66049 before negation | conservative <=65536 SQL candidate cap; negation cannot excuse 66049 |
| L00 | global EDB+completed IDB+pending total at cap and one beyond, with output otherwise empty/small | exact global max_facts behavior; no partial output | lower materialization retained in budget |
| L01 | multiple strata each individually under max_work, aggregate one beyond | invocation fails as a whole | catches per-stratum max_work reset |
| L02 | several SCCs whose wave sum crosses max_rounds | new signed contract's aggregate cap fails; legacy counters unchanged | base/verification-wave accounting must be documented first |
| Q00 | invalid cycle/unbound/arity/undefined in unreachable rule or behind empty positive data | static rejection, no data-dependent validation skip | front-end cost/reproducible diagnostic |
| Q01 | bound candidate with both negative blocker and division-by-zero/type/overflow/underflow filter | inherited expression fault still visible even if anti would remove tuple | forbids unsafe anti pushdown |
| Q02 | false filter followed by fault; same candidate blocked; comma/rule reorder variants | false/negative conditions are not fault guards | preserve existing all-filter observation |
| Q03 | invalid retained input outside visible valid/known cut | same input rejection despite current absence answer | all-history admission remains independent of selection |
| Q04 | unsupported FP controls / callback changes before parse, bind, decode or codec | fail closed, no control repair or cached permission | equality-only negation does not relax lifecycle checks |

For A00, the same P relation is used twice, so only 255–257 retained source rows are required; this stays within the store's 512-row cap. Head projection keeps output <=257; the positive candidate cap still sees the square. Actual full-program proof must also account for all intermediate/base relations and inherited native budgets. These numbers are proposed fixture facts, not observed plans.

For F00, malformed native IR carrying noncanonical negative-zero bits should be rejected by that IR's admission contract; this is distinct from a valid typed value constructor/input that normalizes negative zero. No NaN/infinity or arbitrary text NUL is admitted as a Datalog value.

For D00, distinguish raw temporal carrier duplicates from duplicates already removed in a derived set. Never claim an anti build-key optimization makes list aggregation free.

### Optional direct-native scale ladder (separately scoped; no execution now)

Only after explicit contract/execution authorization, consider 512, 4096, 16384 and 50000 candidate person triples directly against lower EDB blocker triples. One example shape uses a positive person triple and negative fully-ground substituted blocker triple, avoiding extra IDB predicates solely to inflate storage.

Precompute **global facts** before calling anything:
- 50000 distinct person EDB, no blockers, 50000 answers = 100000 total distinct facts at the native cap;
- 50000 person plus 50000 matching blocker EDB, zero answers = 100000 total;
- 100000 raw duplicate temporal carriers may have tiny distinct state, but host carrier allocation is still large and is a separate stress case, not a routine performance requirement.

These are arithmetic design bounds only. They do not prove the host can materialize the carrier under an RSS limit, replace the protected artifact, or authorize stress testing. Never infer safe wall time/RSS from max_facts alone.

## C. Invalid-program diagnostics

Predeclare the stable error code, canonical predicate/variable information and any optional source span for:
- negative self-loop;
- two-predicate cycle with one negative edge;
- longer mixed-sign cycle and a disconnected invalid component;
- unbound negative variable in source-first, source-last and repeated-variable positions;
- a negative-only variable that appears in a bracket filter but no positive relational atom;
- ordinary ?_ occurring only negatively (not an anonymous variable);
- undefined lower predicate vs a defined predicate with an empty selected snapshot;
- arity mismatch involving positive and negative references;
- negative atoms in prohibited positions;
- incompatible owned IR schema/polarity/strata metadata.

Run equivalent programs with rule order and harmless body order permuted. Compare exact set answers and stable diagnostic codes/canonical witnesses. Source offsets may legitimately differ; do not mistakenly demand byte-identical source locations for different source text. Legacy positive diagnostic behavior must remain unchanged on legacy entrypoints.

## D. EXPLAIN observations to collect after the trust gate

Official docs distinguish EXPLAIN (plan inspection without running the query) from EXPLAIN ANALYZE (execution and profiling). Neither was run here. Both require a separately authorized eligible connection/program; EXPLAIN is not a way around an authority failure. [DuckDB 2.0 workload profiling](https://duckdb.org/docs/2.0/guides/performance/how_to_tune_workloads)

For S1/S2/S3 on the same exact logical fixture/cut:
1. save exact generated SQL text/hash, parameter logical types and owned typed fixture identity; no hidden session repair;
2. collect optimized logical and physical plans if the supported exact host interface exposes them;
3. record ANTI vs RIGHT_ANTI vs MARK/DELIM vs comparison/nested-loop form, key expressions/types, NULL-safe comparisons, residual predicates and actual output projection;
4. record scans of EDB/lower sets, temporal/constant restrictions, CTE scans/materialization and duplicated lower computation;
5. record cardinality estimates separately from actual rows after authorized ANALYZE;
6. check explicit empty-right and empty-left plan simplification;
7. verify no inference that build-derived min/max/Bloom probe filter exists for ANTI: d54's optimizer excludes those join types;
8. capture planning/prepare time separately from execution/materialization/drain/decode/sort time;
9. capture query metrics only if available and configured under the supported v2 interface; absence of a metric is not zero work;
10. pair physical-plan findings with independent oracle correctness, not plan appearance alone.

Pure-equality five-slot null-safe keys may remain wider than nonnull canonical BLOB keys. S2 can retain MARK/DELIM structures due exact-d54 conversion restrictions. These are hypotheses to measure, not regressions assumed in advance.

## E. Measurement protocol and evidence

Proposed acceptance evidence (future, not started):
- Exact source/engine/header/API-v2 pin, separate candidate artifact path/hash, compiler/flags/target if a new build is later authorized; never overwrite the protected current artifact.
- Fresh confined disposable fixture DB only after store/trust contract acceptance, or a clearly separate authorized pure-core/direct-binding scope. Store fixtures remain <=512 retained rows.
- Explicit BEGIN/COMMIT boundary capturing one logical position; all lower/upper materialization shares that transaction/cut. Do not rely on semicolon-batch atomicity, a web search snippet, a second connection, or SQL isolation as a catalog-authority lease.
- Fixed predeclared datasets, typed byte-level fixtures, seed where generated, exact visible/retained/duplicate cardinalities, programs and clock cuts; independent stratified oracle prepared before optimized result inspection.
- First validate correctness and resource error/no-partial-result behavior. Incorrect variants are semantic controls, never candidates for faster acceptance.
- Paired route order with enough samples for timer resolution, warmup explicitly separated, all raw sample values retained in the eventual authorized evidence set. Report median, distribution/tails, and independent process variability; do not infer a speedup from one microquery.
- Separate setup/loading/statement preparation/native parse/EDB materialization/evaluation/result drain/decode/sort/end-to-end time wherever the interface can observe it without changing the contract.
- Process RSS/peak RSS, DuckDB metrics, actual spill/temp bytes and external-memory errors recorded separately from admission estimates. No absolute low RLIMIT_AS assumption; DuckDB's virtual reservations make that misleading for this prototype.
- Whole-program fact/work/round budgets and per-stratum detail reconciled; native counters not fabricated for SQL, and legacy counters not retroactively reinterpreted.
- Re-run old positive exact semantics/counter fixtures through unchanged old APIs before any new signed feature can be accepted; full independent/FP/typed/temporal gates remain distinct from this performance plan.
- Include failure and healthy subsequent-call recovery when authorized, but do not claim recovery merely because an exception was caught.
- No production/stability/scalability claim from <=512-row storage or a direct-native sample.

## F. Stopping condition

This research phase ends after the cited physical-semantics report, exact source/version inventory, concrete unrun cases and contract blockers are handed to the coordinator. **It does not continue into implementation or measurement.** Advancement requires the coordinator's settled research/contract gate and current execution authority. Item 4 stays unimplemented/unaccepted and item 3 stays blocked until their own evidence requirements are met.

