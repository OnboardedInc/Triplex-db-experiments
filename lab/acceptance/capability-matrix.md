# Capability matrix (skeleton)

Version 0.1.0-draft, 2026-11-07, EXP-A01. Closure rule CR-MATRIX in `ACCEPTANCE.md` reads this file through
obligation `R.raw.capability-required-cells`; `G10.capabilities.truthful` requires the advertised capability set
to equal the EXACT rows.

## How to read it

- **Rows** are operator and value-type pairs. **Columns** are surface by engine and language.
- **Surfaces.** `repo` = entity repository. `frag` = supported native fragment (helpers from the lane's native
  context, inside their stated equivalence conditions). `raw` = unrestricted raw query over the documented raw
  dataset (EP-RAW-HATCH and EP-RAW-WIRE).
- **Cell values.** Only two values exist in this version:
  - `OPEN`: no acceptance receipt yet. A note in brackets says what source reading or a probe suggests; that is
    not evidence of exactness.
  - `KL-n`: KNOWN-LIMIT, a documented engine or driver behavior that breaks the required exactness, with the
    evidence linked below. A cell becomes `EXACT` only with a passing acceptance receipt.
- **Required exactness** says what the cell must deliver to count as EXACT: `exact` (bit-exact or
  codepoint-exact), `exact-or-error` (exact inside the domain, typed error outside it, never a wrong value),
  `spec` (the SPARQL 1.1 or SQL semantics named in O-SHAPE or O-ERR).
- **Required by.** Obligations whose closure needs this cell EXACT on the listed surfaces. A KNOWN-LIMIT cell
  with a non-empty required-by list keeps those obligations OPEN until a repair (another implementation or an
  engine repair) makes it EXACT. Rejecting the shape does not count.
- The XTDB repository column is shared by both XTDB lanes.

## Matrix

X = xtdb-xtql, S = xtdb-sql, Q = qlever-sparql.

| # | Operator | Type or band | Required exactness | X raw | X frag | S raw | S frag | Q raw | Q frag | repo XTDB | repo QLever | Required by (surfaces) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `=` filter | text | exact | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | R.raw.parity (raw), R.repo.entity-suite (repo) |
| 2 | `=` filter | int64, \|v\| <= 2^53 | exact | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | R.raw.parity, G1.types.eight-type-roundtrip |
| 3 | `=` filter | int64, 2^53 < \|v\| <= 2^59 | exact | KL-X5 [only for union-typed columns] | OPEN | KL-X5 [same] | OPEN | OPEN | OPEN | OPEN | OPEN | G1.types.eight-type-roundtrip, G1.types.storage-widening-safe, R.raw.parity |
| 4 | `=` filter | int64, 2^59 < \|v\| < 2^63 | exact | KL-X5 [same] | OPEN | KL-X5 [same] | OPEN | KL-Q1 | OPEN | OPEN | OPEN | G1.types.eight-type-roundtrip, R.raw.parity |
| 5 | `=` filter | binary64 | exact | OPEN | OPEN | OPEN | OPEN | KL-Q3 | OPEN | OPEN | OPEN | G1.types.eight-type-roundtrip, G2.arith.binary64 |
| 6 | `=` across families | int64 vs binary64 | spec | OPEN | OPEN | OPEN | OPEN | KL-Q4 | OPEN | OPEN | OPEN | G2.expr.cross-family-comparison |
| 7 | `=` filter | boolean, ref | exact | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | R.raw.parity |
| 8 | `=` filter | datetime | exact | KL-X6 [driver decode of TIMESTAMP types] | OPEN | KL-X6 [same] | OPEN | KL-Q5 | OPEN | OPEN | OPEN | G1.types.eight-type-roundtrip, R.raw.parity |
| 9 | range `< <= > >=` | text | exact (codepoint) | OPEN [source: unsigned UTF-8 compare] | OPEN | OPEN [same] | OPEN | KL-Q7 | OPEN [R5 order key proven, not wired] | OPEN | OPEN | G2.strings.codepoint-supported (frag, repo), G2.strings.codepoint-raw (raw) |
| 10 | range | int64, all bands | exact | KL-X5 [union-typed columns] | OPEN | KL-X5 [same] | OPEN | KL-Q1 (beyond 2^59) | OPEN | OPEN | OPEN | R.raw.parity, S.correctness.query-families |
| 11 | range | binary64 | exact | OPEN | OPEN | OPEN | OPEN | KL-Q3 | OPEN | OPEN | OPEN | R.raw.parity |
| 12 | range | datetime | exact | KL-X6 | OPEN | KL-X6 | OPEN | KL-Q5 | OPEN | OPEN | OPEN | G9.temporal.half-open-intervals, R.raw.parity |
| 13 | ORDER BY | text | exact (codepoint) | OPEN [source: codepoint expected] | OPEN | OPEN [same] | OPEN | KL-Q7 | OPEN [order key] | OPEN | OPEN | G2.strings.codepoint-supported, G2.strings.codepoint-raw, G10.cursor.stable |
| 14 | ORDER BY | int64 and mixed numeric | exact | OPEN | OPEN | OPEN | OPEN | KL-Q1, KL-Q3 [probe: mixed order numerically correct inside the exact ranges] | OPEN | OPEN | OPEN | R.raw.parity, G10.cursor.stable |
| 15 | ORDER BY | datetime with offsets | exact (instant order) | KL-X6 | OPEN | KL-X6 | OPEN | KL-Q5 | OPEN | OPEN | OPEN | R.raw.parity |
| 16 | ORDER BY stability | any | spec (deterministic with a total key) | OPEN | OPEN | OPEN | OPEN | KL-Q10 [needs a total key] | OPEN | OPEN | OPEN | G10.cursor.stable |
| 17 | LIMIT/OFFSET page at fixed cut | any | exact | OPEN | OPEN | OPEN [native-entry page check, inherited] | OPEN | OPEN | OPEN | OPEN | OPEN | G10.cursor.stable, R.raw.parity |
| 18 | keyset cursor page | any | exact, cost bounded | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | G10.cursor.stable |
| 19 | `+ - *` | int64 | exact-or-error | OPEN [source: addExact] | OPEN | OPEN [same] | OPEN | KL-Q2 | OPEN | OPEN | OPEN | G2.arith.int64-overflow (frag, repo), R.raw.capability-required-cells (raw) |
| 20 | `/` and remainder | int64, binary64 | spec (O-ERR) | OPEN | OPEN | OPEN | OPEN | KL-Q14 | OPEN | OPEN | OPEN | G2.arith.binary64 |
| 21 | unary minus, ABS | int64 minimum | exact-or-error | OPEN | OPEN | OPEN | OPEN | KL-Q2 | OPEN | OPEN | OPEN | G2.arith.int64-overflow |
| 22 | CAST text to int64 | int64 extremes | exact-or-error | OPEN [unverified from XTQL] | OPEN | OPEN [probe: cast after filter passes] | OPEN | KL-Q1 | OPEN | OPEN | OPEN | G2.arith.int64-overflow |
| 23 | SUM | int64 | exact-or-error | KL-X1 [source: same operator as SQL] | OPEN | KL-X1 | OPEN | KL-Q15 | OPEN | OPEN | OPEN | G5.agg.exact-overflow, PKT.full142 (workloads 06-08) |
| 24 | SUM, AVG | binary64, DECIMAL | exact | OPEN | OPEN | KL-X7 [DECIMAL aggregate fails] | OPEN | KL-Q3 | OPEN | OPEN | OPEN | G2.arith.binary64, G5.agg.full-support |
| 25 | COUNT, COUNT DISTINCT | any | spec (supports) | OPEN | OPEN | OPEN | OPEN | OPEN [RDF dedup of plain triples, see review r1 finding 13] | OPEN | OPEN | OPEN | G5.agg.full-support |
| 26 | MIN, MAX | int64, text | exact | OPEN | OPEN | OPEN | OPEN | KL-Q1, KL-Q7 | OPEN | OPEN | OPEN | G5.agg.shape-controls |
| 27 | GROUP BY, HAVING | typed keys | spec (typed identity) | OPEN | OPEN | OPEN | OPEN | KL-Q4 [numeric keys compare as double] | OPEN | OPEN | OPEN | G5.agg.typed-groups |
| 28 | aggregate over empty input | grouped and ungrouped | spec (O-SHAPE) | OPEN | OPEN | OPEN | OPEN | OPEN [inherited edge controls pass] | OPEN | OPEN | OPEN | G5.agg.shape-controls |
| 29 | correlated EXISTS / NOT EXISTS | any | spec | OPEN [XTQL exists? never run] | OPEN | OPEN | OPEN | KL-Q8 | OPEN [R5 re-binding helper verified, not wired] | OPEN | OPEN | G4.neg.correlated-not-exists (frag, repo), G4.neg.correlated-not-exists-raw (raw) |
| 30 | many EXISTS clauses in one group | any | spec, bounded planner memory | OPEN | OPEN | OPEN | OPEN | KL-Q9 | OPEN | OPEN | OPEN | G3.admission.preconstruction, G6.resource.memory-failure-contained |
| 31 | MINUS / OPTIONAL + !BOUND / LEFT JOIN | any | spec | OPEN | OPEN | OPEN | OPEN | OPEN [correct inside R5 C2, C4] | OPEN | OPEN | OPEN | G4.neg.correlated-not-exists |
| 32 | join on ref, reverse ref | ref | exact | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | R.raw.parity, G3.plan.access-path-at-scale |
| 33 | UNION / union-all | any | spec | KL-X3 | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | none yet |
| 34 | window functions (aggregate, rank, frames) | any | spec | n/a (XTQL has none) | n/a | KL-X2 | OPEN | OPEN | OPEN | OPEN | OPEN | none yet (workload 18 has a window-free recipe) |
| 35 | recursion / transitive closure | ref | exact, bounded | KL-X4 [host rounds needed] | OPEN | KL-X4 [host rounds needed] | OPEN | OPEN [property paths, unqualified] | OPEN | OPEN | OPEN | G3.recursion.scalable, PKT.full142 |
| 36 | interval union over valid time | binary64 endpoints | exact | OPEN [no window operator] | OPEN | OPEN [window-free recipe, 5 intervals only] | OPEN | OPEN | OPEN | OPEN | OPEN | PKT.full142 (workload 18), S.correctness.query-families |
| 37 | engine-native valid or system time (`FOR VALID_TIME`, `FOR SYSTEM_TIME`) | basis | exact Triplex basis | KL-X8 [current layout pins _valid_from; system time is not R] | OPEN | KL-X8 | OPEN | n/a | n/a | OPEN | OPEN | G9.temporal.recorded-cuts, R.raw.parity (history at basis) |
| 38 | as-of basis recipe (P, R, V) | basis | exact | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | R.raw.parity, G8.publish.basis-honesty |
| 39 | json value read | json | exact (key order kept) | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | G1.types.eight-type-roundtrip |
| 40 | blob descriptor read | blob | exact | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | OPEN | G1.types.eight-type-roundtrip |
| 41 | typed literal write path (raw insert) | all | exact-or-error | KL-X10 [name folding], KL-X11 [URI columns] | n/a | KL-X10, KL-X11 | n/a | KL-Q6, KL-Q1 | n/a | OPEN | OPEN | G1.types.storage-widening-safe |
| 42 | language-tagged text compare | text | spec | n/a | n/a | n/a | n/a | KL-Q11 | OPEN | n/a | OPEN | none yet |
| 43 | default dataset and scope selection | any | exact (only the scope's data) | OPEN | OPEN | OPEN | OPEN | KL-Q12 [unqualified query reads the union of all graphs] | OPEN | OPEN | OPEN | G10.scope.isolation, R.raw.parity |
| 44 | bound parameter | binary64 -0.0 | exact | OPEN [driver repair inherited] | OPEN | OPEN [same] | OPEN | OPEN | OPEN | OPEN | OPEN | G1.types.native-parameters |
| 45 | cancellation and timeout of a running query | any | observed drain (O-OBS) | OPEN | OPEN | OPEN [one pg_sleep abort, physical reclamation unqualified] | OPEN | KL-Q16 | OPEN | OPEN | OPEN | G6.cancel.observed-drain, G6.deadline.enforced |

## Evidence for KNOWN-LIMIT cells

| Id | Engine | Behavior | Evidence |
| --- | --- | --- | --- |
| KL-X1 | XTDB 2.2.0 | `SUM` over BIGINT accumulates with unchecked addition and wraps silently; scalar `+` and `*` are overflow-checked | `references/xtdb/core/src/main/kotlin/xtdb/arrow/LongVector.kt:30-33 @ c6c1962`; lab/research/R6-xtdb-gap-analysis.md finding 2. Source only for XTQL (shared operator); not yet probed in either language |
| KL-X2 | XTDB 2.2.0 | aggregate and rank window functions fail with `AbstractMethodError`; window frames unsupported; one window function per query | lab/research/R1-xtdb-capabilities.md Q4 (probed); R6 3.3; `sql.clj:2098-2160, 2389-2392 @ c6c1962` |
| KL-X3 | XTDB 2.2.0 | XTQL `union-all` parses but cannot be planned | lab/research/R1-xtdb-capabilities.md Q4 (probed) |
| KL-X4 | XTDB 2.2.0 | recursive CTEs rejected; XTQL has no recursion; closure needs host-driven rounds, which are write transactions today | R6 3.3 and finding 4; `sql.clj:264-265 @ c6c1962` |
| KL-X5 | XTDB 2.2.0 + `postgres` 3.4.9 | a column whose type became a union travels as JSON; int64 above 2^53 rounds (9007199254740993 read as 9007199254740992) | lab/research/R1-xtdb-capabilities.md Q3 (probed). Applies to any union-typed column the documented raw dataset exposes |
| KL-X6 | `postgres` 3.4.9 driver | TIMESTAMP WITH TIME ZONE decoded to millisecond `Date`; TIMESTAMP without zone parsed in the local zone | lab/research/R1-xtdb-capabilities.md Q3 type table (probed). Driver-level: affects EP-RAW-WIRE clients using this driver |
| KL-X7 | XTDB 2.2.0 | DECIMAL aggregate fails (`No method in multimethod 'set-value-code' ... :decimal`) | `packages/xtdb/experiments/query/integer-extrema-1793974552733.json` (probe in checkout); R6 1 |
| KL-X8 | current XTDB layout | every insert pins `_valid_from` to 1970 and Triplex R is not system time, so native temporal clauses do not answer Triplex basis questions | R6 3.4 items 1 and 7; R1 Q1 |
| KL-X9 | XTDB native parameters | bound negative zero returned positive zero before the driver repair | wiki/problems/native-number-parameters.md (repaired on the homebase; fresh evidence needed, so row 44 is OPEN, not EXACT) |
| KL-X10 | XTDB 2.2.0 | `:ns/attr` column names are lowercased and `-` folds to `_`; distinct Triplex keys can collide | lab/research/R1-xtdb-capabilities.md Q3 |
| KL-X11 | XTDB 2.2.0 | a URI-typed column makes `SELECT` fail (`unknown type: java.net.URI`) | lab/research/R1-xtdb-capabilities.md Q3 (probed) |
| KL-Q1 | QLever 0.6.0 | integers are 60-bit; values in int64 but outside +/-2^59 wrap silently on UPDATE | lab/research/R2-qlever-capabilities.md 4.1 (probed); `src/util/NBitInteger.h:19-22 @ 6c5861a` |
| KL-Q2 | QLever 0.6.0 | integer `+` and `*` wrap in 60 bits with no overflow check | R2 4.1 arithmetic (probed); `NumericBinaryExpressions.cpp:41-50 @ 6c5861a` |
| KL-Q3 | QLever 0.6.0 | decimal, double and float stored with a 49-bit mantissa and exported with 13 significant digits | R2 4.1 (probed); `ValueId.h:263-270 @ 6c5861a` |
| KL-Q4 | QLever 0.6.0 | comparison across numeric types converts to double (`9007199254740993 = 9007199254740992.0` is true) | R2 4.1 arithmetic (probed) |
| KL-Q5 | QLever 0.6.0 | `xsd:dateTime` keeps milliseconds only, whole-hour zones only, and compares local clock fields before the zone | R2 4.1 (probed); `src/util/Date.h:69-90 @ 6c5861a` |
| KL-Q6 | QLever 0.6.0 | an invalid typed literal is silently stored as a plain string | R2 4.1 (probed) |
| KL-Q7 | QLever 0.6.0 | one ICU `en_US` comparator for stored words, `STR()` and constants; raw `ORDER BY STR` and ranges are not codepoint order | lab/research/R5-qlever-semantic-blockers.md 3.1 counterexamples A1-A3 (probed); wiki/problems/qlever-native-string-order.md; qualification/reviews/qlever-public-string-v6-terminal-independent.json |
| KL-Q8 | QLever 0.6.0 | EXISTS arguments planned as uncorrelated queries; an outer variable used only inside an inner FILTER is unbound, so correlated NOT EXISTS returns `one,two` instead of `two` | R5 1 and 4 (probed); wiki/problems/native-correlation.md; R2 3.2 |
| KL-Q9 | QLever 0.6.0 | planner memory grows geometrically with EXISTS count and is not capped by `-m` | R2 3.3 and 6.5 (probed); wiki/problems/qlever-planner-memory.md |
| KL-Q10 | QLever 0.6.0 | ORDER BY is an unstable in-memory sort, deterministic only for a total key | R2 7.1 |
| KL-Q11 | QLever 0.6.0 | language-tag comparison is case-sensitive (SPARQL says case-insensitive) | R2 4.1 (probed) |
| KL-Q12 | QLever 0.6.0 | a query without `FROM` reads the deduplicated union of all graphs; no server-level default-graph setting | R2 1.2 (probed) |
| KL-Q13 | QLever 0.6.0 | no RDF-star (parse error) | R2 5.1 (probed); not a matrix row because no obligation needs it |
| KL-Q14 | QLever 0.6.0 | division always returns a double; division by zero is UNDEF by default | R2 4.1 arithmetic |
| KL-Q15 | QLever 0.6.0 | integer sums wrap past 2^59 | R2 4.2 table |
| KL-Q16 | QLever 0.6.0 | timeouts are cooperative (sort is not interruptible); cancellation is WebSocket only and the client does not await an acknowledgement | R2 6.4 (probed); wiki/problems/cancellation-observation-levels.md |

## Write-path and lifecycle limits (not query cells, kept for the raw guide)

| Id | Engine | Behavior | Evidence | Obligations it threatens |
| --- | --- | --- | --- | --- |
| KW-Q1 | QLever 0.6.0 | a failed multi-operation update leaks its first operation; a timed-out single update can leave permutations with different contents, published by the next successful update | R2 1.8 probes A and B | G7.write.atomic, G7.recovery.crash-restart |
| KW-Q2 | QLever 0.6.0 | every update costs O(total delta) and clears the query cache | R2 1.3-1.6 | L.accept.256, G8.support.maintenance-cost |
| KW-Q3 | QLever 0.6.0 | a server can die after persisting an update but before replying | R2 1.8 probe C | G7.write.unknown-outcome |
| KW-X1 | XTDB 2.2.0 | one aborted transaction moves the system-time head to wall clock; later explicit past system times fail | R1 Q1 (probed); upstream #6209 | G9.temporal.recorded-cuts |
| KW-X2 | XTDB native library | each native call takes its own P; no task-wide cut | R6 finding 1 | G4.cut.task-wide-fixed |
| KW-X3 | XTDB native library | reachability reads write scratch tables inside a read API | R6 finding 4 | G6.cleanup.scratch-zero, G10.native.read-only-and-safe-params |

## Rules for changing this file

- A cell moves from OPEN to EXACT only by citing an acceptance receipt (path and run id).
- A cell moves to KL only with evidence: a probe output, a source line at the pinned sha, or a retained failure.
  Source-only evidence is labelled as such.
- An original counterexample stays linked from its KL cell after a repair makes the supported surface EXACT;
  the raw cell stays KL until the raw surface itself is EXACT.
- Required-by lists are owned by `obligations.json`; when an obligation is added, the rows it needs are added
  here in the same change.
