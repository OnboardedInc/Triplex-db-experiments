# Synthetic oracle obligations for item 5

Revision 001 • 2026-10-31 UTC • **ALL EMPIRICAL EXECUTION UNRUN**

This document proposes acceptance obligations. It does not select aggregate semantics, authorize a test campaign, or claim that any fixture has passed. Expected values below are hand-derived mathematics conditional on the named alternative. Neither dependencies 3/4 nor item 4's held/stopped state is changed.

## 1. Independent comparison design

Use three genuinely distinguishable sources of evidence after a contract and execution gate exist:

1. **Small handwritten expectations** for the fixtures below.
2. **Independent semantic oracle**, built from mathematical sets of owned tagged tuples, a simple history-cut model, a simple positive fixed-point model where needed, and independently implemented aggregate arithmetic. It must not call the candidate compiler/evaluator or import candidate helper implementations.
3. **Pinned SQL route**, with an explicit mapping from logical tuples/groups/types/empties/overflow to SQL. It must not merely feed candidate-produced aggregate results back into SQL. A candidate's lower-relation materialization may be compared as a separate intermediate artifact, but is not independent evidence for its own correctness.

Keep a distinction between (a) selecting the visible logical source relation, (b) deriving/deduplicating a lower relation, (c) grouping full source tuples, and (d) reducing measures. A mismatch should identify the first differing stage. Project temporal cuts are half-open on both axes in the inspected published source. [Published core, input admission/cut]([PRIVATE_REFERENCE_REMOVED])

The independent oracle needs explicit parameters for every OPEN choice: observed/global/anchored grouping; full-tuple or projected contributors; mixed-type policy; empty output policy; integer arithmetic; floating arithmetic; error precedence. Do not encode one branch and call alternatives bugs.

### Independence checks

- Use a straightforward relational fixed-point algorithm rather than the candidate's semi-naive visit schedule.
- Deduplicate logical facts, not proof trees, input history records, or measure values.
- Preserve type tags in keys and equality; do not let a host language equate Boolean true with integer 1.
- Canonicalize f64 zero consistently; do not admit NaN or infinity as logical values.
- Use exact integer arithmetic for an exact-final i64-sum reference.
- For exact floating sum, use exact binary-rational accumulation and independently specified rounding, not the candidate's loop or the host's ordinary SUM.
- Make errors first-class expected outcomes, including their selected phase/category and atomicity, not missing rows.
- A duplicated implementation in a different file is not an independent oracle.

## 2. Full-source-tuple set fixtures — N1 branch

Notation: R(g,item,v) is an already completed relation; g and item are strings and v is i64 unless annotated. Group by g and measure v. “Mathematical sum” does not yet select a checked-sum implementation.

| ID | Source construction | Independent expectation |
|---|---|---|
| S01 duplicate proofs | Rules from Left and Right both derive R("a","i1",7); another fact derives R("a","i2",7) | R has 2 facts, count 2, sum 14, min=max=7 |
| S02 repeated input/history row | Repeat any identical input row and any identical derivation used in S01 | Same logical R and same results as S01 |
| S03 same measure, different tuples | R = {("a","i1",7), ("a","i2",7)} | Count 2 and sum 14; COUNT(DISTINCT v)=1 and SUM(DISTINCT v)=7 are deliberately not this contract |
| S04 deliberate lower projection | P(g,v) is derived by dropping item from S03 and completing P | P = {("a",7)}; aggregating P gives count 1 and sum 7 |
| S05 varying measure with same item | R = {("a","i1",7), ("a","i1",8)} | Full-tuple count 2, sum 15, min 7, max 8; no unproved item→value dependency |
| S06 two keys | Add ("b","i3",−2) to S03 | a has count 2/sum 14; b has count 1/sum −2; no cross-key leak |
| S07 positive recursive producer | A finite Reach relation is derived by two paths to the same reachable tuple, then completed | Count unique Reach facts once, regardless of path/proof multiplicity |
| S08 duplicate aggregate consumers | Two downstream positive rules derive the same answer from the completed aggregate result | Aggregate and answer set unchanged; consumers do not re-add contributions |

S01 must include several semi-naive variants and rule-order permutations in a future authorized campaign. Counting join/evaluation visits instead of R's completed set must be detected.

## 3. Join-witness boundary and contributor limits

Let Base = {("a","i",7)} and Witness = {("i","w1"), ("i","w2")}.

- Deriving J3(g,item,v) from their join gives one unique tuple. N1 aggregation of J3 gives count 1/sum 7.
- Deriving J4(g,item,v,w) retains witness and gives two unique tuples. N1 aggregation of J4 gives count 2/sum 14.
- Neither result is a duplicate-proof bug: the completed source schemas differ.

For a fanout illustration, joining two independent three-element witness relations gives nine distinct witness pairs from six witness facts. An input-row cap is therefore not a contribution-count bound for arbitrary aggregate join bodies. More generally, two m-element sides can produce m² distinct pairs.

For N1, prove and enforce cardinality(C(g)) ≤ cardinality(R) ≤ the explicit source-fact bound. If source relation derivation is admitted but exceeds the fact/work budget, it must fail before any aggregate consumes a partial source.

For a future projected-contributor family, include a projection collision with two different measures for one claimed identity. Require the selected full-record/functional-dependency/error behavior, never an incidental “first value wins.”

## 4. Group-domain and empty fixtures

| ID | Condition | Conditional expectation |
|---|---|---|
| E01 observed empty source | R = ∅, nonempty key list | No groups; no count row. This is not a row containing zero |
| E02 observed missing key | R has only key "a"; user inspects key "b" | No b group/result |
| E03 explicit global empty | Explicit global mode over R = ∅ | One group exists; count is i64 0 |
| E04 global empty sum | Same as E03, explicit i64-sum tag | Typed zero, absent result, or error according to selected branch; no accidental SQL NULL |
| E05 global empty min/max | Same as E03 | Absent result, declared error, or explicit status protocol; never fabricated real-valued extrema |
| E06 zero-key observed mode | Observed grouping with an empty list, if admitted | State whether ∅ produces no group; do not inherit global mode accidentally |
| E07 anchored empty key | Domain = {"a","b"}, R = {("a","i1",7)} | Anchored count a=1, b=0; observed grouping still has only a |
| E08 empty anchors | Domain = ∅, R possibly nonempty | State whether no anchors means no result; do not invent a global anchor |
| E09 combined outputs | A present empty group requests count plus min in one row | Exercise selected row omission/error/split/status policy and preserve its documented meaning |
| E10 completed empty lower component | Source has no facts after its completion procedure | Global count may use empty input only after completion; no premature aggregation and no “empty means unfinished” deadlock |

E06 is not academic: classical group-by semantics and SQL explicitly diverge on empty zero-key input. [Mumick–Pirahesh–Ramakrishnan, §3.2 footnote](https://www.vldb.org/conf/1990/P264.PDF), [PostgreSQL 18 empty grouping set](https://www.postgresql.org/docs/18/queries-table-expressions.html)

For E07 a SQL left join followed by COUNT(*) incorrectly counts the null-extended row as one. Preaggregate the contributor side before joining anchors, or use a guaranteed presence marker and the selected empty policy. Do not use an arbitrary nullable payload as presence.

## 5. Type/equality/order fixtures

| ID | Values or keys | Required distinction |
|---|---|---|
| T01 key tags | Separate g values string("1"), i64(1), f64(1.0), Boolean(true) | Four groups under strict tagged equality; no Boolean/integer or integer/floating merging |
| T02 mixed measures | One group contains i64(2), f64(1.0) | Homogeneous policy: type error. Total-tag-order min/max alternative: tag-rank result, not numeric comparison. Sum: reject without approved explicit conversion |
| T03 different homogeneous groups | a contains i64(1),i64(2); b contains f64(1.0),f64(2.0) | Per-group homogeneity permits both typed outputs; per-invocation homogeneity rejects. Record which was selected |
| T04 count heterogeneity | Four full tuples have string/Boolean/i64/f64 measures | Count 4 for N1; count need not coerce or numerically inspect a measure |
| T05 Boolean extrema | false and true in one group | If Boolean min/max admitted: false then true; Boolean sum rejected unless explicitly added as a different contract |
| T06 numeric-looking strings | "9" and "10" | Bytewise string min "10", max "9"; never numeric parsing |
| T07 prefix strings | "a" and "aa" | Bytewise min "a", max "aa" |
| T08 Unicode distinctions | "Z", "a", precomposed "é" (U+00E9), and decomposed e followed by U+0301 | Preserve bytes/no normalization if that branch is selected; bytewise minimum "Z", maximum precomposed "é" |
| T09 large integer versus floating | i64(9007199254740993) and f64(9007199254740992.0) | No loss through an implicit common floating type |
| T10 canonical zero | Same source record except f64(−0.0) versus f64(+0.0) | Canonical equal record collapses; differing item IDs still give two distinct contributors |
| T11 nonfinite input | f64 NaN/+∞/−∞ carrier attempt | Reject invalid logical value before aggregate use; never treat it as empty/extremum |
| T12 mixed group plus good group | One valid numeric group and one invalid sum group | Selected atomic failure; no partial successful rows returned while hiding invalid group |

String T08 intentionally contrasts canonical-equivalent Unicode spellings; it is not a request to normalize. A SQL implementation with locale/case/normalization changes must not be treated as evidence for bytewise semantics.

## 6. Integer arithmetic fixtures

Let U = 9223372036854775807 and L = −9223372036854775808. Distinct item IDs keep repeated measures as distinct full source records.

| ID | i64 measures | Exact-final i64 branch | Prefix-check branch |
|---|---|---|---|
| I01 | ∅ in a present typed group | Selected empty rule | Selected empty rule |
| I02 | [U] | U | U |
| I03 | [L] | L | L |
| I04 | [U,1] | Overflow error | Overflow error |
| I05 | [L,−1] | Overflow error | Overflow error |
| I06 | [U,1,−1] | U, every permutation | Can fail in shown order; only a specified order makes outcome defined |
| I07 | [L,−1,1] | L, every permutation | Can fail in shown order |
| I08 | [U,U,−U,−U] | 0, every permutation | Some orders fail |
| I09 | [L,U] | −1 | −1 |
| I10 | [7,7] on distinct tuples | 14 | 14 |
| I11 | duplicate proof of same [7] tuple | 7 | 7 |
| I12 | includes Boolean/string/f64 | Type error under i64-only sum | Type error under i64-only sum |

For exact-final semantics, calculate S independently and check L ≤ S ≤ U before public output conversion. Do not cast a widened SQL SUM directly to BIGINT and assume its error behavior establishes candidate arithmetic.

For a one-sign restricted branch, include an otherwise ordinary negative measure as a domain error. For ordered-prefix semantics, record full contributor-order rules; permutations of input transport order should not change the prescribed canonical order.

Count overflow is either (a) discharged by a proof that the selected source cap is ≤ U, or (b) a required checked reducer boundary obligation. No enormous empirical fixture is asserted feasible or run. An abstract boundary test would still need an authorized test design; it must not bypass real admission and then be presented as an end-to-end result.

## 7. Floating arithmetic fixtures

These apply only if an f64-sum form is later selected.

| ID | f64 measures | Comparison obligation |
|---|---|---|
| F01 | [1.0,2.0] | f64 3.0; tag remains f64 |
| F02 | [10^16,1.0,−10^16] | Exact rounded-once total 1.0; conventional left fold in shown order can be 0.0 |
| F03 | [Fmax,Fmax,−Fmax] | Exact final total Fmax; finite-prefix policy can fail before cancellation |
| F04 | [Fmax,Fmax] | Selected final overflow/nonfinite error; no infinity value output |
| F05 | [+0.0,−0.0] on distinct items | Canonical zero policy; count remains 2 |
| F06 | [smallest positive subnormal, its negative] | Exact zero and canonical zero sign |
| F07 | duplicate full tuple and duplicate proof | Deduplicate contributors before summation; do not add once per proof |
| F08 | many differently sized finite magnitudes | Chosen accuracy/reproducibility predicate, independent oracle, and explicit error bound if approximate |
| F09 | selected result is subnormal | Explicit result-underflow/subnormal rule; do not borrow lexical underflow semantics by accident |
| F10 | mixed i64 and f64 | Strict type error unless separately authorized explicit conversion |

The comparison relation must be fixed before running F02/F08. Bitwise equality to ordinary SQL SUM is not interchangeable with exact rounded-once correctness. Documentation already marks floating SUM and FSUM as order-sensitive. [DuckDB 2.0 aggregate reference](https://duckdb.org/docs/2.0/sql/functions/aggregates)

## 8. Corrected-history fixtures

Use logical triples (entity, attribute, value) with attribute "amount". All listed values are i64. Intervals are synthetic.

| Row | Entity | Value | Valid interval | Transaction interval |
|---|---|---:|---|---|
| H1 | e1 | 10 | [0,100) | [0,20) |
| H2 | e1 | 7 | [0,100) | [20,100) |
| H3 | e2 | 7 | [0,100) | [0,100) |
| H3 duplicate | e2 | 7 | [0,100) | [0,100) |

Group visible completed triples by attribute and measure the value field.

- At valid=5, known=10: two logical facts; count 2, sum 17, min 7, max 10.
- At valid=5, known=20: two logical facts; count 2, sum 14, min=max=7.
- At valid=100, known=20: no visible facts because valid_to is exclusive.
- At valid=5, known=100: no visible facts because transaction upper endpoints are exclusive.
- Repeating H3 does not change any logical set count.
- Fresh invocations for the two known times must not reuse stale aggregate state.

An additional **overlap diagnostic** may add (e1,"amount",9,[0,100),[15,25)). At valid=5, known=17 the inspected core's cut admits values 10 and 9 for e1 plus 7 for e2: three distinct logical triples, sum 26. The native input cut itself is not a “latest transaction wins” resolver. Do not silently deduplicate by entity/attribute or choose a latest value. A future store-level correction policy is a separate contract/dependency.

Also test invalid interval/value admission independently of visibility: the inspected native admission validates supplied rows before its cut. This does not establish uninspected SQL-carrier behavior.

## 9. Scope and dependency diagnostics

| ID | Semantic shape | Expected initial boundary |
|---|---|---|
| D01 | Positive recursive Reach completes; then count Reach | Allowed in principle if all other selected checks pass |
| D02 | R feeds count A; A positively feeds R | Compile-time aggregate-cycle rejection |
| D03 | A directly counts A | Aggregate-cycle rejection even on empty input |
| D04 | Aggregate edge plus negative edge in one cycle | Reject; diagnostic distinguishes kinds and provides source occurrence |
| D05 | Unreachable aggregate cycle | Reject; answer reachability does not waive well-formedness |
| D06 | Aggregate source undefined | Compile-time undefined-source error |
| D07 | Group/measure variable lacks source binder | Compile-time scope/binder error |
| D08 | Head exports a non-key local witness from min | Witness/scope rejection |
| D09 | Inner negation is the only occurrence of a local variable | Reject; negation is not a binder |
| D10 | Aggregate result used in its own source/key | Reject cyclic binder dependence |
| D11 | Nested aggregate | Reject for a deliberately nonnested initial grammar |
| D12 | Fixed aggregate seed feeds a separate ordinary positive SCC | Do not misclassify a cycle with no internal aggregate/negative edge; producer exclusivity is a separate grammar rule |
| D13 | Metadata claims lower stratum but source not actually complete | Runtime invariant failure, never a partial-source aggregate |
| D14 | Multiple invalid source occurrences | Selected stable diagnostic ordering independent of incidental SCC traversal IDs |
| D15 | Zero keys/global mode | No accidental permission for public zero-arity predicates |

These expected diagnostic categories are proposals; exact codes, precedence, byte limits and phases remain to be selected.

## 10. SQL-route template and hazards

The following source-only illustration is for a simple homogeneous-i64 N1 relation. It has **not** been executed or approved for the exact pin. Transition/combination arithmetic, aggregate return types, cast errors, and string/typed-key equality still require independent exact-pin confirmation.

~~~sql
WITH raw_source(g, item, v) AS (
    VALUES ('a', 'i1', CAST(7 AS BIGINT)),
           ('a', 'i1', CAST(7 AS BIGINT)),
           ('a', 'i2', CAST(7 AS BIGINT))
),
logical_source AS (
    SELECT DISTINCT g, item, v
    FROM raw_source
)
SELECT g,
       count(*) AS contributor_count,
       min(v) AS minimum_value,
       max(v) AS maximum_value,
       sum(CAST(v AS HUGEINT)) AS wide_total
FROM logical_source
GROUP BY g;
~~~

The DISTINCT includes the **full source tuple**, including item. It does not belong only inside SUM(v). A wide integer route is plausible because DuckDB documents HUGEINT's signed-128 range; that is a documented type range, not evidence of a verified pinned aggregate state or behavior. [DuckDB 2.0 numeric types](https://duckdb.org/docs/2.0/sql/data_types/numeric)

Required mapping checks:

- SQL tables/joins can retain duplicates. Deduplicate exactly the logical completed source tuple before aggregation.
- For positive recursive lower relations, choose a genuinely set-preserving recursive SQL formulation; UNION ALL proof multiplicity is not a substitute. SQL recursion and logical closure must be compared before aggregates.
- Preserve tag plus active payload in typed keys/contributors. Do not UNION unrelated tags through a common floating SQL column.
- Validate mixed-tag sum/min/max policy before aggregation. Filtering unsupported tags to SQL NULL silently skips bad contributors and is wrong for a type-error contract.
- Global empty SQL count emits zero while SUM/MIN/MAX produce SQL NULL. Map those only through the selected logical empty policy; do not leak SQL NULL into Value.
- Anchors must not count null-extended rows as contributions.
- Any empty-sum COALESCE must be explicit, typed, and confined to the selected zero-on-empty branch.
- Check the mathematical final integer total against i64 range before output conversion if exact-final semantics is selected.
- Ordered-prefix integer semantics needs a distinct reference process; an ordinary widened SQL sum does not reproduce intermediate i64 overflow.
- Floating ordinary SUM/FSUM cannot silently stand in for an exact or prescribed-order oracle.
- Enforce bytewise string equality/order if selected; collation or normalization changes must be visible.
- A native error and SQL NULL/missing group must not be recorded as matching outputs.

## 11. Limits, atomicity, ownership and compatibility matrix

Future authorized verification should include:

- source just below/at/above its fact cap; many keys; one large group; long strings and largest admitted keys;
- generated result-value/dictionary admission as well as existing source facts;
- group and accumulator admission before unbounded allocation or partial publication;
- no source aggregate work hidden in old positive/negative counters;
- explicit new work/round/aggregate metrics, with boundary errors and integer-counter checks;
- repeated correlated consumers, if admitted, with invocation-local reuse only under a selected policy;
- failure in the last group after earlier valid reductions: no partial result escapes;
- destruction/ownership of source strings, group keys, output values and serialized aggregate metadata;
- inspect-only IR compilation exports structure without computing aggregate values;
- complete traversal of inner dependencies if richer bodies are ever admitted;
- original API signatures/result layouts/canonical IR1+IR2 bytes/counters/accepted syntax/rejected syntax unchanged;
- old programs with predicates named count/min/max/sum unchanged;
- new language and IR identifiers distinguish aggregate grammar and grouping/numeric choices;
- subsequent successful fresh invocation after a failed one, without stale accumulators/history keys.

These are future proof/test obligations only. **No fixture, SQL query, compiler stage, native stage, test or benchmark was run in this research revision.**
