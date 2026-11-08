# Orchestrator rulings on EXP-A01 open questions (contract 0.1.0-draft → 1.0.0 candidate)

Date 2026-11-07. Sam delegated these decisions to the orchestrator for this goal. Each ruling cites what decided it
and stays revisable by Sam; a revision creates a new contract version.

| Q | Ruling | Basis |
| --- | --- | --- |
| Q1 unrestricted raw exactness | Not required for done. Required instead: (a) the repository and every supported native fragment are exact over the full Triplex value domain; (b) the raw dataset is exact on its documented exact channels (order keys, lexical channels, native typed literals inside their exact ranges); (c) raw natively typed shapes outside exact ranges (raw `ORDER BY STR` on QLever, raw correlated NOT EXISTS with filter-only correlation, raw int64 beyond ±2^59 on QLever, raw `SUM` over BIGINT on XTDB) are KNOWN-LIMIT rows with retained counterexamples and a raw-query guide entry. Engine repairs are pursued only when a required surface needs them. Exceptions are per cell (engine, language, surface, operator, value domain), never per row (Codex acceptance review #2): QLever's bounded numerics do not exempt XTDB arithmetic. Every exempted raw cell names its exact mapped recipe (for example XTDB `SUM(CAST(x AS DECIMAL(38,0)))` instead of raw `SUM` over BIGINT, QLever order-key ordering instead of `ORDER BY STR`) and the obligation that qualifies that recipe; the original raw failure stays as a diagnostic with its unchanged expected answer. Supported fragments have a fixed minimum coverage set listed in the contract, so an operation cannot be removed from the advertised surface to avoid a failure. | handoff README: "Raw SPARQL numeric behavior is narrower than the full Triplex value domain; use the declared mapping and retain unsupported cases"; START-HERE 4: an encoded key "does not make arbitrary SPARQL STR compliant" |
| Q2 load bar | A fixed minimum is part of done, because "efficient" must mean something beyond the rate16 floor. At 256 logical clients on the 10m-entity representative dataset, open-loop offered load of 1 request per client per second (256 requests/s; 90% reads by the query mix, 10% writes, so 25.6 commands/s): correctness-qualified read goodput ≥ 0.99 of offered reads; explicit rejections ≤ 0.01; per-client fairness ≥ 0.9; read latency p99 ≤ 1 s for point/entity/repository classes and ≤ 5 s for analytic classes; write visibility p99 ≤ 2 s; every writer visible inside 30 s. Stress at 512 and 1024: zero correctness violations, explicit rejections counted, goodput retention ≥ 0.9 of the 256-level goodput, recovery to the 256-level bar within 60 s after stress. The four previously unsourced floors (goodput 0.99, rejections 0.01, fairness 0.9, retention 0.9) are adopted by this ruling. Calibration still runs first; if calibration shows a number is physically impossible on this VM for every candidate, the orchestrator records the measurement and asks Sam before lowering it. | goal ambition ("efficient", 256 logical clients with steady writes); review r1 #2 (explicit experimental criteria, no invented production SLA) |
| Q3 host post-processing | Keep, as a declared step that reads no data, counted inside the task's measured call. | existing packet practice (workloads 07, 10, 20); the oracle stays independent |
| Q4 sparse profile load | Load acceptance on the representative profile; the sparse profile gets its scale rungs plus a 256-client smoke run (no stress levels). | done predicate needs both populations; load stress cost on one population |
| Q5 guide-only raw authoring | Accepted: a fresh agent given only the raw-query guide and the engine's public docs authors the raw query set; its answers must match the repository's at the same basis. | Sam's "raw queries still make sense" requirement, made testable |
| Q6 proof lineage | Assertion-level provenance: every answer row that claims a fact can name its supporting assertion ids and transactions. | goal 9 wording; Triplex receipts and assertion identity |
| Q7 CLI | Not required for done. The packaged SDK consumer (clean install of tarballs, an application using repository, writer and native queries on both engines) is required. | goal 10 "consumers"; scope control |
| Q8a sum overflow | Exact total; typed `integer-overflow` error only when the final result is outside int64. Intermediate partial sums never wrap. | core SQL compiler `packages/core/src/datalog/compiler.ts:572` (DECIMAL(32,0) sum, range check on the result) |
| Q8b AVG over int64 | Revised after Codex acceptance review #8: core rejects integer AVG without an explicit conversion, so AVG over int64 is a typed preflight error unless the query converts explicitly; with an explicit conversion to binary64, the result is binary64 of the exact sum divided by the count, rounded once. | `packages/core/src/datalog/compiler.ts` near line 1397 |
| Q8c division by zero | Typed error. Triplex numbers are finite, so no NaN or Infinity results. | Value domain (finite numbers) |
| Q8d int64 1 vs binary64 1.0 | Follow core's comparison semantics; where core is silent, values of different type families are not equal and do not share a group. | exact typing |
| Q8e equal-valued card-one duplicates | Not a conflict (one value, several supports). | PLAN v1.1 C5.1 |
| Q8f card-many order | Set semantics, duplicates collapsed, canonical value order (codepoint order for text, numeric for numbers, then type family). | determinism; C5 |
| Q9 presence, deletion, cascade | The orchestrator commissions a policy draft (EXP-P01) from `wiki/research/presence-reference-deletion-requirements-v1.md` and the docs, rules on it provisionally so work can proceed, and flags it to Sam as a product decision he may revise. The three G9 obligations stay policy-pending until then. | Sam owns product semantics; the goal asks for autonomous progress |
| Q10 verifier at scale | Accepted: at the 10m rung and load profiles the verifier recomputes every metric from the retained raw events and performs one spot rerun (one load level or one rung shard). | cost of doubling 10m runs; retained-evidence rule |
| Q11 per-language load | REVERSED after Codex acceptance review #4: separate XTQL and SQL load acceptance runs, each offering the full Q2 workload in its own language. A mixed-language run may be added as a shared-foundation diagnostic profile; it closes nothing for either language. | splitting classes halved each language's demand, which lowered the per-language bar |
| Q12 B4 dependency | Round 2 and PLAN v1.1 C5 settled conflict semantics; align `G4.neg.conflict-not-false-absence` with C5 (repository and fragments fail with ConflictingValuesError; the raw convenience shape is documented as non-equivalent; the canonical conflict-aware relation is `values(attribute)`). | PLAN v1.1 C5 |

## Revisions after the Codex acceptance review (lab/reviews/acceptance-review-r1.codex.md)
- Q1 tightened to per-cell exceptions with mapped recipes and a fixed fragment coverage set (#2).
- Q2 must be encoded in load-contract.json as fixed bounds at every level, with recovery measured as achieving the 256-level
  bar within 60 s, and Q4's sparse 256-client smoke becomes an obligation (#3).
- Q8b revised (core rejects integer AVG without conversion) and Q8 numeric tables frozen explicitly (#8).
- Q10 replaced: the verifier covers every claimed obligation; at scale it independently re-evaluates retained answer bytes,
  fault outcomes and coverage for every load level and rung, plus at least one spot rerun per profile (#12).
- Q11 reversed (#4).
- Precedence: these rulings are compiled into build_contract.py; the generated obligations.json is the only authority an
  evaluator reads. A consistency check in the generator verifies each ruling is reflected (#1).

## Rulings on contract 0.2.0 questions (2026-11-07)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q13 XTDB exact int64 SUM recipe | The primary mapped recipe is the split-sum: sum the 32-bit halves and recombine with overflow-checked arithmetic, which R12 verified in both languages (exact totals on 4 boundary cases, typed overflow on the 3 true overflows). `SUM(CAST(x AS DECIMAL(38,0)))` is a candidate only if EXP-X02 proves it exact on 2.2.0, since KL-X7 records a DECIMAL aggregate failing on this engine. | lab/research/R12-xtql-cookbook.md; KL-X7 |
| Q14a card-many family order | Accepted as proposed: boolean < integer < number < datetime < string < ref < json < blob, then by value inside a family (codepoint order for strings). Core defines no cross-family order, so the contract fixes one. | no core order function exists |
| Q14b -0.0 and +0.0 | One value for identity, grouping and set membership, matching core: `packages/core/src/content/CanonicalJson.ts:77` normalizes -0 to 0 so they share a hash. When several supports differ only in representation, the projected and returned representation is the one from the support with the lowest recorded position (deterministic); the oracle applies the same rule. Single-assertion reads still return the stored representation exactly. | core canonical identity; R01 open question 1 |
| Q14c binary64 SUM | Expected answer is the correctly rounded exact total on the repository and supported-fragment surfaces. Where an engine's native SUM differs, that raw cell is a KNOWN-LIMIT with a mapped recipe (exact accumulation in the native helper). Low priority against the north star: money and counts use int64 or decimal. | exactness floor; lab/NORTH-STAR.md |
| Q14d ordered comparison int64 vs number | Typed preflight error, consistent with Q8d. | Q8d |
| Q15 error tags and reasons | Accepted as drafted for 0.2.0; the independent verifier of the contract checks each tag against the public error types in packages/core/src/errors and Error.ts before 1.0.0. | change control |

## Superseded by Sam's re-scope (2026-11-07; lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md)
- **Q2 (fixed load bar), Q4 (sparse load), Q11 (per-language load runs):** superseded. Load and performance are now measured as
  P1 to P5 on the fixed writer trace (TARGETS.md sections 1 and 2) plus the 20 golden scenarios (section 6). The principle of Q11
  survives: read priorities (P1, P4, P5) are measured separately per surface (XTQL, SQL, SPARQL).
- **"Exact int64 and decimal" as a requirement:** replaced by Sam's corrected numeric rule (no silent precision loss; source
  lab/research/SAM-pasted-numbers-2026-11-07.md): exact storage and round trip for every value kind in use; order-preserving
  comparison for range-rule attributes; hard error, never silent conversion; integer range ≥ 2^53; arithmetic over many rows only
  where a projection needs it. Consequences: full signed 64-bit range is not required (int64 values beyond 2^53 may be rejected
  with a typed error where an engine cannot hold them); Q8a and Q13 (exact engine-side int64 sums, split-sum recipe) apply only to
  projections that need engine-side sums; per-subject arithmetic runs in the TypeScript kernel; Q1's raw exceptions for QLever
  integers beyond 2^59 become "reject at write" instead of KNOWN-LIMIT rows.

## Rulings on contract 0.3.0 questions (2026-11-07)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q16 derived thresholds | History flatness 1.1 (current-pull p99 and bytes read at history depth 10 ≤ 1.1x depth 1) stands. Reader basis mix is 80% at the latest committed tx (named exactly, the reconcile pull), 15% at a tx within the last hour (in-flight reconciles and sweeps pinned to an older position), 5% at a past basis up to 90 days back (explain and audit); the draft's 25% at 30 days overweighted cold reads, which the paste marks COLD. Warmup 120 s and 600 s per ladder level stand for acceptance runs; a shorter screening profile (30 s warmup, 120 s per level) is allowed for candidate comparison and can never close an obligation. Budget allowances (write bytes 4.0x, ingest 0.5x, memory 1.5x, disk 2.0x of the A0 control at the same rung) stand as provisional and are re-frozen after EXP-N02 measures the controls, before any candidate is compared. | Sam's paste: reconcile pull HOT at the current basis, explain/audit COLD; TARGETS section 1 |
| Q17 sparse profile | Dropping the separate sparse profile is accepted; scenario GS.15 (one large tenant and 1,000 small ones) covers population skew. | rescoped targets |
| Q18 decimal kind | A decimal attribute declares precision and scale. Values are stored as scaled integers (when precision ≤ 15 so the scaled value stays within 2^53) or as order-preserving decimal strings; a value with more fractional digits than the scale, or outside the precision, is rejected with a typed error, never rounded. Decimal is its own family, ordered between number and datetime in the card-many family order; comparison between decimal and integer or number is a typed preflight error unless the query converts explicitly; arithmetic runs in the TypeScript kernel with exact decimal arithmetic. | Sam's corrected numeric rule |
| Q19 engine-side exact sums | Needed only where a projection sums many rows. EXP-X02 confirms the XTDB recipe (R14 measured `SUM(CAST(x AS DECIMAL(32,0)))` exact and free on 2.2.0; the split-sum is the fallback); EXP-F02 cross-checks. | corrected numeric rule item 5 |
| Q20 Q8a/Q8b wording | Q8a and Q8b now read "integer" rather than "int64": exact totals with a typed error only when the final result is outside the engine's exact range, and engine-side sums only where a projection needs them; per-subject sums run in the kernel (BigInt). AVG over integers keeps Q8b's preflight rule. | corrected numeric rule |

## Rulings on the G01 golden-vector ambiguities (2026-11-07; Q21, from V-O01 `proposed_rulings.json` at verify/O01 745547d)
All 17 proposals from the independent verifier are accepted. Three of them touch product behavior and are provisional orchestrator
rulings flagged for Sam in `lab/STATE.md` (AMB-04, AMB-09, AMB-17); the loop proceeds on them and changes course only if Sam overrules.

| AMB | Ruling | Basis |
| --- | --- | --- |
| AMB-01 | A. Ordinary `Triples.match`, `entity` and `entityPage` keep the raw lifetime at an explicit R (no global mask). The five tiny-v4 checks and the original counterexample (with its original expected answer) close on repository as-of reads, `timeline` and native history. | G9.history.raw-lifetime-compat; G9.history.snapshot-metadata wording |
| AMB-02 | Compare the logical content `{identity, value, recordedAt, knownRetirement: null or {retractedAt, retractTxId}}`. Native rows add `retractedPosition`. Physical field names are EXP-R01's; the oracle renames to `retractedAt` and `retractTxId`. | Triple.ts response names; R6 3.1 |
| AMB-03 | `timeline` at a basis lists every assertion recorded at (P, R) with no V filter; the V-filtered view stays the native known-at-valid helper. | R3: timeline is the only way to see intervals |
| AMB-04 | B (provisional, flagged). The journal change value of a `-0.0` assertion is bit-exact `-0.0`. C6's "byte-identical -0 behavior" promise is superseded by Sam's numeric rule, because turning -0 into 0 silently is silent conversion. | SAM-pasted-numbers (exact round trip, never silent conversion); M-NEGZERO |
| AMB-05 | Compare documented fields plus the testkit-pinned ones (assert: value, validFrom, assertionTxId; retract: value, recordedAt, retractedAt, retractionTxId). Byte identity of the whole journal is a separate T0-capture baseline, a different oracle class. | packages/testkit/src/index.ts:1818-1831 |
| AMB-06 | A. Operations apply in order over staged facts, so `retract-pattern` sees same-command assertions (both changes, assert first). Confirm with a T0 capture before 1.0.0. | plan review r2 2.6 item 2; Constraint.ts project order |
| AMB-07 | Creation order (recordedPosition, then operation index), frozen for M-JOURNAL-ORDER; confirm with a T0 capture. | ACC 4.2 item 8 |
| AMB-08 | Decided by Q14b: -0.0 and +0.0 are one value; the representative is the support with the lowest (recordedPosition, operation index). CMP-NEGZERO's "lowest assertion id" is amended to this, because assertion ids are generated per lane and would make the answer lane-dependent. | Q14b |
| AMB-09 | B (provisional, flagged). Two equal-valued assertions on one entity are one value with two supports and one binding row: SUM is 10, COUNT is 1. G5.agg.full-support is reworded to "equal values on distinct entities". North-star reason: the fixed writer trace carries 10% duplicate commands and 1% lost ACKs (P2), and a retried or duplicated pay fact must never double a total. | PLAN C5.1; ACC 4.4 AG-SUM-I (bag of distinct bindings); TARGETS section 2 |
| AMB-10 | Integer results project as `IntegerValue` with canonical decimal text, never a JS number. | no silent conversion above 2^53 |
| AMB-11 | The explicit conversion before AVG is `toNumber(?v)` (ACC 4.2 CV-I2F, 4.4 AG-AVG-CONV). | contract 0.2.0 |
| AMB-12 | B. `validTo <= validFrom` is rejected with E-INVALID-VALUE, because accepting an interval that can never be visible is a silent no-op. | numeric rule item 3 (hard error, never silent); ACC 4.7 |
| AMB-13 | Compare `_tag` ConflictingValuesError, reason `conflicting-values`, and the set of `{entityId, attribute}`. | ACC 4.7; PLAN C5.3 |
| AMB-14 | Decided by ACC 4.7: invalid integer text is InvalidTripleError / invalid-value; a reserved-namespace write is WriteError / reserved-namespace. | ACC 4.7 |
| AMB-15 | Codepoint order; add a non-BMP `entityPage` vector (U+E000 against U+10000). | Q8f; Q14a |
| AMB-16 | A. Range predicates on integer attributes are required in `Repository.find`. | ACC 6.4; numeric rule item 2 (order-preserving comparison for range-rule attributes) |
| AMB-17 | A (provisional, flagged). `find` fails with ConflictingValuesError when a returned document contains a conflicted attribute; a projection that omits that attribute succeeds. | PLAN C5.3 (no three-valued unknown; the document decodes every attribute, as `get` does); R01 D5 (no null) |

The oracle's 26 RULING-NEEDED defaults: R-VAL-3, R-ORD-2, R-CMP-3, R-NUM-5, R-NUM-6, R-CMD-6, R-CMD-9, R-JNL-1, R-ENT-6 and R-ENT-7 change
in the oracle to match the rulings above and contract section 4 (EXP-O02); the rest keep the oracle default with the citations recorded
in `proposed_rulings.json`.

## Rulings on the Codex plan-v2 review (2026-11-07; Q22 to Q28; responses in lab/reviews/plan-v2-review.responses.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q22 decimal operations | Result types: addition and subtraction take scale max(s1, s2) and precision max(p1 - s1, p2 - s2) + scale + 1; multiplication takes scale s1 + s2 and precision p1 + p2; a result beyond the target's declared precision, or beyond the kernel maximum of 38 digits, is a typed overflow error. Division exists only as `divide(a, b, scale, rounding)` with an explicit scale and rounding mode (half-even, half-up, down): the one place rounding happens, and only when the caller names it; a bare `/` on decimals is a preflight error. Conversions: integer to decimal is exact when it fits the precision, else a typed error; decimal to integer only when the fraction is zero, else a typed error unless the caller writes `round(x, 0, mode)`; decimal to number only through `toNumber` (named, lossy); number to decimal only through `toDecimal(x, p, s, rounding)`. Scale evolution: widening precision or scale is a metadata change; narrowing is a migration that fails atomically if any value would lose digits. CMP-DECIMAL-CROSS: every comparison between decimal and integer or number, equality included, is a preflight error. The writer captures the caller's original typed input before any normalization, and tests assert nothing was rounded before capture. Tests cover adjacent large decimals, negatives, zero, scale boundaries, arithmetic intermediates, migrations, every query and serialization path, and an independent check of order keys against exact numeric order. | Sam's corrected numeric rule; Codex finding 9 |
| Q23 qualified writes | The rejection requirement applies to qualified write routes: the Triplex writer, the bulk import lane, replay and restore. Each rejects an unrepresentable value atomically, before any mutation. Bare native wire access (raw SPARQL UPDATE on QLever's port, raw SQL on XTDB) is a diagnostic surface; QLever's native integer wrap there is a KNOWN-LIMIT row, not a qualified failure. G1.types.out-of-range-rejected drops EP-RAW-WIRE from its required endpoints and adds the bulk and replay routes. | Codex finding 10; SCOPE 3.2 (work around what an engine cannot do) |
| Q24 erasure | TARGETS section 7: the boundary is the erasure commit's publication; reads that start after it return `ErasedValue {erasedAt}` at every basis, including bases before the erasure; reproduction contracts hold modulo erasure; each lane keeps a protected-copy inventory; derived channels (order keys, lexical channels) are erased or encrypted with the value; restore and rebuild replay the erasure ledger. Provisional product ruling, flagged for Sam. | Sam's must-have (real erasure or crypto-shredding); Codex finding 8 |
| Q25 non-priority performance bars | The general recursion 1 s bar, the 1.1x latency growth bar from 1m to 10m for selective queries, and the 2x deep-page cost bar become reported secondary measurements with no authority to block done. Bounded execution (budgets, cancellation, typed resource errors) stays a correctness obligation under goal 6. | TARGETS section 5; Codex finding 13 |
| Q26 closure rules | CR-CALIBRATION requires a calibration record for every threshold an NS obligation names and fails closed on an empty set. NS and GS obligations use an explicit `single-execution` mode, so executions equal selections. GS.01 selects only CS-GS-01. The generator checks that each GS obligation binds its own scenario's evidence and bars. The evaluator ships counterexamples proving that incomplete receipts cannot close an obligation. | Codex finding 14 |
| Q27 history flatness statistic | The generated threshold and workload use p99 (as Q16 says), not p50, measured on the matched 1,000-subject sample of TARGETS 1.1 P4 item 2. | Q16; Codex finding 4 |
| Q28 composition identity | TARGETS section 4.1: four assignments (source, current, history, analytics); receipts bind every component and replication edge and each index's watermark at read time; a read is served only by an index whose watermark has reached its basis, else it waits up to 250 ms and routes to a fallback that has it; the source of truth ACKs only after the current index has reached the commit's position. Scope keys derive from the assignment, not from `engineOfLane`. | Codex finding 11 |

## Rulings on contract 0.3.2 questions (2026-11-07; Q29)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q29a golden JSON files | Kept unchanged as the audit record; the contract records the selected reading for each AMBIGUOUS query and pins each file's hash. | change control; EXP-O02 may not edit vectors either |
| Q29b Q8F-05 representative sign | Accepted: the evaluator derives it from fixture order by the lowest (recordedPosition, op index); O-REPLAY computes it independently after EXP-O02, and the two must agree. | Q14b, AMB-08 |
| Q29c default mode | Accepted: `single-execution` is the default for every obligation that declares no mode, which removes the zero-execution count everywhere, not only for NS and GS. | Q26 |
| Q29d A01's chosen values | Accepted as provisional: engine-scoped obligations key on the layer their goal names (for example G7 on source, G9 on history); T-WATERMARK-WAIT-MS = 250 (observe); error names E-DECIMAL-OVERFLOW, E-DECIMAL-BARE-DIVIDE, E-DECIMAL-FRACTION, E-DECIMAL-NARROWING; 38 digits of precision for round() and decimal SUM results. The Q15 verifier checks the error tags against the public error types before 1.0.0. | Q22, Q28 |
| Q29e erasure profile | Accepted: the three erasure obligations run on the tiny concurrent profile; GS.16 covers erasure at year-one size. | Q24 |

## Rulings on the EXP-F02 wire exactness findings (2026-11-07; Q30)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q30a JSON values | A JSON value containing -0, a non-finite number, or a number that is not exactly a binary64 value is rejected at every qualified write route with InvalidTripleError / invalid-value (reason detail `inexact-json-number`), never normalized. Canonical identity (CanonicalJson) is unchanged; the guard runs before it. `approximateNumbers: "reject"` applies recursively inside List and Struct. | numeric rule item 3 (hard error, never silent conversion); F02 findings 1 and spec item 1 |
| Q30b instant | An instant given as -0 is rejected (`NoNegativeZero`), never turned into 0. | F02 finding 3 |
| Q30c XTDB encodings | ProjectionSpec pins the XTDB encodings that F02 proved exact: card-many DOUBLE and integer lists are written as `ARRAY[CAST(? AS <type>) ...]`, never as one JSON parameter; date and instant are read as text, never through the driver's TIMESTAMPTZ decoding. Any other encoding fails the projection check. | F02 findings 2 and 4 |
| Q30d QLever numeric shadow | A binary64 shadow counts as exact only if it survives QLever's export bit for bit: not -0, and parsing its `%.13g` rendering returns the same value; integers only within ±2^59. Otherwise the lexical channel is authoritative and the shadow is flagged inexact (usable for coarse pruning, never for an answer). | F02 finding 5; repeats the F1 fix |
| Q30e integer range rule | Narrowed to its safe-integer domain (cosmetic). | F02 spec item 5 |

## Rulings on the Codex plan-v2 round-2 review (2026-11-07; Q31; responses in lab/reviews/plan-v2-round2.responses.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q31a P2 progress | Every oracle-valid trace command must publish; typed rejections count only for the trace's deliberately invalid commands, typed conflicts only where the oracle independently finds a CAS race; queued commands never exceed 2 s of the offered rate at steady state and drain within 60 s after each burst (TARGETS 1.1 P2 item 4). | round 2 finding 2 |
| Q31b forced mutations | Split subgraph reads straddle commands the frozen trace already holds; the driver adds no writes (TARGETS 1.1 P1 item 2). | round 2 finding 19 |
| Q31c position coordinates | A position is (stream, epoch, offset, ordinal), ordered lexicographically, not necessarily dense; one engine transaction holding several Triplex transacts gives them consecutive ordinals at one offset, assigned atomically with the assertions and the subject CAS. A watermark is a fully resolved prefix (every position at or below it applied or known aborted). O-REPLAY's "consecutive nested logical positions" becomes "totally ordered coordinates": the oracle sorts by coordinate and assigns its own dense ordinals for cuts. Aborted offsets are accounted (listed in the feed's resolution stream). Falsifiers required before any comparative claim on a non-dense position: nested cuts inside one engine transaction, an abort gap, a crash between append and resolution, and resume from a checkpoint at an abort gap. | round 2 finding 15 |
| Q31d eligibility and fallback | TARGETS 4.1 items 3 to 5: eligibility needs the watermark, C1's conditions and actual reconstructability (a current-only index serves B only inside the validity interval of every attribute read) plus the erasure frontier; at most 10 ms wait, then a deadline-aware fallback whose latency counts and whose surface language is recorded; T-WATERMARK-WAIT-MS becomes 10. | round 2 findings 11, 16 |
| Q31e ACK ownership (replaces Q28's ACK clause) | The source of truth ACKs after its own publication; read-your-own-write holds by routing (the pull at the returned position goes to an eligible index or the fallback); during a current-index outage commits and ACKs continue, pulls fall back, the index catches up through a bounded queue, and fallback share and recovery time are measured (GS.04b). | round 2 finding 16 |
| Q31f erasure frontier and C6 | TARGETS 7 items 7 to 9: an index or cache serves any basis only after applying every published erasure; erasure invalidates old-basis cache entries; "modulo erasure" applies to C6's whole-journal comparison, raw and native results, SDK results, cursors and explain; crypto-shredding evidence must show every surviving protected copy is encrypted only under the destroyed key. | round 2 findings 8, 17 |
| Q31g decimal widening (corrects Q22) | Increasing scale is a metadata change only when precision grows by at least the same amount (integer digits p - s never shrink) and the order-key encoding is proven unchanged for every existing value; otherwise it is a migration that rewrites values and keys atomically or fails atomically. | round 2 finding 9 |
| Q31h GS.19 wording | "No duplicate processing" becomes "zero duplicate externally visible effects throughout"; replay attempts are allowed and counted. | round 2 finding 7 |
| Q31i W0 coverage and review | TARGETS 6.1 items 6 and 7: frozen coverage floors (R2 changes ≥ 20% of in-scope subjects' outputs, every rule fires for ≥ 5% of subjects, Zipf location fanout over 2,000 locations at 100k, ≥ 1% of evaluations yield three or more work items); domain-dependent comparisons blocked until V-D01 independently reviews W0 and its hashes are pinned. | round 2 findings 6, 18 |
| Q31j legacy int64 vectors | The contract compiles explicit lane-specific outcomes for G1-I64-01 and every other legacy vector that commits signed-64 extremes: XTDB commits them; QLever's qualified routes reject values beyond ±2^59 with a typed error before mutation. The original vectors stay unchanged as audit evidence. | round 2 finding 20; Sam's numeric rule |
| Q31k positive evaluator fixtures | The evaluator catalog adds valid positive fixtures (complete receipts that must close), so an evaluator that always returns OPEN fails. | round 2 finding 14 |

## Rulings on contract 0.3.3 questions (2026-11-07; Q32)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q32a Q30 | Compile Q30 (wire exactness) into 0.3.3 now, before Codex round 3. | change control |
| Q32b legacy vectors on QLever | Accepted: a vector that puts all its values in one command becomes a rejection test on QLever; in-range boundary coverage comes from the integer-edge and range-out case sets. Follow-up: QLever in-range companion vectors, authored by an independent golden author (not EXP-O02), queued as EXP-G02. | Q31j |
| Q32c invalid-command share | 0.1% of trace commands are deliberately invalid (values no engine may hold), marked in the trace. | Q31a |
| Q32d queue bound | Accepted: queue depth in seconds = queued commands / steady offered rate; drain time runs until the queue is back within the 2 s bound. | Q31a |
| Q32e position gate scope (narrows the proposal) | The four position falsifiers gate a composition only when its positions are non-dense. A composition whose positions are dense (today's scope-counter adapters, the A0 controls) satisfies `G7.position.coordinates` with the existing nested-cut cases, so A0 baselines are not blocked. EXP-P2X runs the four falsifiers first for its non-dense candidate. | Q31c (the falsifiers exist for non-dense positions) |
| Q32f W0 pin | Accepted: null until V-D01 reviews W0; pinning needs a contract version bump. | Q31i |

## Rulings on the EXP-O02 RULING-NEEDED items (2026-11-07; Q33)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q33a R-VAL-7a number literals (also refines Q30a) | A JSON number is accepted only if it reads back as written: its shortest round-trip binary64 rendering equals the given text in canonical form. `0.1` is accepted; `9007199254740993` is rejected (it would read back as ...992). Q30a's "not exactly a binary64 value" means this test. | numeric rule item 3 |
| Q33b decimal kind | Accepted: R-DEC-0 (decimal on an undeclared attribute is E-INVALID-VALUE), R-DEC-1 (wire shape `{"type":"decimal","value":"16.50"}`), R-DEC-2 (`-0.00` refused, consistent with Q30b), R-DEC-3 (fractional digits are counted on the value, so 16.500 fits scale 2 and is returned as "16.50"; the original input text is still captured per Q22), R-DEC-6 (toDecimal(number) starts from the exact binary expansion, then applies the caller's scale and rounding). R-DEC-5: decimal `divide(a, b, scale, rounding)` must be modeled (oracle follow-up EXP-O03). R-DEC-7: AVG over decimal is a preflight error unless written as `divide(SUM, COUNT, scale, rounding)`. | Q18, Q22 |
| Q33c R-LANE-2 | Accepted: a retract-pattern value outside the lane's range is E-VALUE-OUT-OF-RANGE. | Q31j |
| Q33d R-CMP-3 remainder | Every ordered comparison across families is an E-MIXED-FAMILY preflight error, not `false`; equality across families is `false` except where a ruling makes it an error (decimal, Q22). | Q14d; hard error, never silent |
| Q33e arithmetic and aggregates | Accepted: R-NUM-7 (non-numeric operand is E-MIXED-FAMILY); R-NUM-8 (`rem` is integer-only; a binary64 operand is a preflight error); R-AGG-5 (SUM or AVG over a non-numeric family is E-MIXED-FAMILY). | Q14d |
| Q33f commands | Accepted: R-CMD-9 (operation faults with no 4.7 row map to E-INVALID-VALUE); R-CMD-12 (retract-pattern on a transaction entity is E-RESERVED). | ACC 4.7 |
| Q33g journal | Accepted: R-JNL-5 (journal facts valid from the commit instant, synthetic ids, `:_tx/change` json carries the logical change content); R-JNL-6 (other envelope facts return X-NOT-MODELED, never a partial answer); R-JNL-7 (an invalid `transactions` limit is PaginationCursorError / malformed, the same as `entityPage`). | C6; R-PAGE-3 |
| Q33h cuts and pages | Accepted: R-CUT-3 (invalid basis is E-INVALID-VALUE); R-PAGE-3 (out-of-range `entityPage` limit is PaginationCursorError / malformed, from G10-CUR-01 E3); R-PAGE-4 (continuing a cursor with a different basis is `other-query`; a different page size is allowed). | golden G10-CUR-01 |
| Q33i vector bugs | The contract records the oracle's readings for G10-CUR-01 E1/E2 (`other-query`) and the QLever lane outcomes for G1-I64-01, Q8F-02, G1-I64-02 `min-exact`, and G5-SUM-01, 02, 04, 05, 06, 08, 11 case 2 (rejected with E-VALUE-OUT-OF-RANGE at write), cross-checked against Q31j's nine legacy outcomes. Vectors stay unchanged as audit evidence. | Q31j, Q29a |

## Rulings on the Codex plan-v2 round-3 review (2026-11-07; Q34; review lab/reviews/plan-v2-round3.codex.md)
Round 3: 11 CLOSED, 2 PARTIAL (R2-15, R2-16), 5 new (14 to 18). All accepted.

| Q | Ruling | Basis |
| --- | --- | --- |
| Q34a density is proven, not declared (replaces Q32e's mechanism) | The non-dense position falsifiers may be skipped only for a composition whose position allocator is on a pinned allowlist: the source hashes of today's scope-counter allocators in the XTDB and QLever adapters at the A0 commits, checked by the evaluator against the receipt's bound source. Any changed or unknown allocator is non-dense and needs the four falsifiers. A receipt's own `positionsDense` field carries no authority. The conditional selection is the authoritative one; the generated obligation must not also select every falsifier unconditionally. Add a forged-density fixture that must be rejected. | round 3 finding 14 |
| Q34b fallback equivalence | Outage read-your-own-write (GS.04b, G7.composition.ack-and-routed-ryow) is tested on every serving surface the composition claims, native surfaces included: stale-fallback rejection, and where a fallback answers in another language, the two recipes are bound to one semantic query identity (parameters, basis, meaning) and one expected answer from the oracle. Total request latency and language attribution stay recorded. | round 3 finding 15 |
| Q34c JSON guard versus journal | The Q30a guard validates user-supplied JSON values at qualified write routes only. JSON that Triplex generates (journal changes, metadata) is not user JSON and never passes through it. The journal encodes typed values losslessly: a number -0 assertion commits, journals, replays and reads back bit-exact (AMB-04). Paired test required: user JSON with -0 is rejected; number -0 round-trips through the journal on both engines. | round 3 finding 16; transactionMetadata.ts:20, :55 |
| Q34d prerequisites on every comparative claim | Position, composition-identity and (where domain-dependent) W0 prerequisites are checked when any comparative or promotion claim is admitted, including claims from screening (P-SCREEN) receipts. A claim with a failed or pending prerequisite is a diagnostic, never a qualified winner. | round 3 finding 17 |
| Q34e regenerate consistently | Compile Q33 and Q34, regenerate, and verify that a second regeneration produces byte-identical outputs (all five generated files) before any receipt is issued against the contract. | round 3 finding 18 |

## Rulings on R20 (order-preserving decimal encodings) (2026-11-07; Q35; lab/research/R20-order-preserving-decimal-encodings.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q35a encoding | The decimal order key is TDK1, determined by the value alone: zero `o`; positive `p` LL I F (LL two-digit integer-digit count, I without leading zeros, F without trailing zeros); negative `n` (99-L) comp(I) comp(F) `z` with comp(d) = 9-d. Alphabet `[0-9nopz]` only, so ICU order equals codepoint order on QLever and byte order on XTDB (no collation on 2.2.0). The contract's "fixed-width, sign-aware" wording becomes "value-determined, order-preserving (TDK1)". | R20 property test: 0 failures over 2.62M exhaustive values, 400k random and 100k adjacent pairs, 779 declarations, 600k decoder fuzz; 5/5 mutant encoders caught; ICU check 0 disagreements |
| Q35b one representation (amends Q18) | The decimal kind has one stored representation on both lanes: the TDK1 key (authoritative, decodes exactly) plus derived canonical text at the declared scale; QLever also keeps its lexical channel for parity with other kinds. Q18's "scaled integer when precision ≤ 15" no longer applies to the decimal kind; users who model money as integer cents use the integer kind. Because TDK1 depends on the value only, any widening that admits every existing value is metadata-only (Q31g's key-compatibility condition always holds); narrowing still validates every value and fails atomically. Comparison across attributes of different declared scale is exact. | R20 section on Q31g: TDF and TDH both change keys on widening; only TDK1 keeps them |
| Q35c versioned channel | The stored key channel is named `decimal_order_v1`; a future encoding gets a new channel name and a migration. | R20 open question 3 |
| Q35d use constraints | TDK1 keys are never concatenated and never used for prefix queries (positive keys are not self-delimiting: `p0212` is a prefix of `p02125`); only whole-key equality and ordered comparison. | R20 open question 5 |
| Q35e errors and limits | Error names stay Q29d's (E-DECIMAL-OVERFLOW for a value beyond the declared or 38-digit precision, E-DECIMAL-FRACTION for excess fraction digits, E-DECIMAL-NARROWING, E-DECIMAL-BARE-DIVIDE); no E-DECIMAL-UNREPRESENTABLE. Maximum precision stays 38 (TDK1 has headroom to 99 integer digits). `-0.00` is refused (Q33b). No native XTDB DECIMAL lane: one verification path. If the kernel uses decimal.js or big.js, rounding tests must cover their signed zero. | R20; Q22, Q29d, Q33b |

## Rulings on the W0 open questions (2026-11-07; Q36; lab/world/W0/SPEC.md section 15 on exp/D01-world-definition 5a12dad)
W0 is a synthetic test world, not a Triplex or Onboarded product feature, so these are orchestrator rulings with no product flag.

| Q | Ruling | Basis |
| --- | --- | --- |
| Q36a work item identity | A work item's id is SHA-256 over canonical JSON of (subject, rule, kind, key) only; a separate content version hashes (release hash, input positions, payload). The outbox delivery key is (id, version). An activation that leaves a work item's payload unchanged publishes nothing (early cutoff, R18 X5); one that changes it publishes a new version of the same id. Republishing every open work item under new ids on each activation would flood the outbox during P5 and turn identical work into new deliveries. | P5 (no harm to live traffic); P3/GS.19 (no duplicate visible effects) |
| Q36b time model | Midnight UTC due times with no holidays stay for W0; a known simplification, documented in SPEC. | W0 is synthetic |
| Q36c E-Verify per status | Kept; status history is not modeled in W0. | scope of W0 |
| Q36d later decision wins | Kept. Store-level CAS (GS.07) already turns concurrent stale decisions into typed conflicts; a later decision that commits after seeing the earlier one is an intentional override. | GS.07 |
| Q36e dependencies without valid-time ranges | Kept for W0 v1: static read sets over-approximate, never miss. The expected affected set is defined as the subjects whose read set contains a changed fact, which is deterministic for both implementations. | P3 item 3 |
| Q36f erased SSN | Kept: an erased SSN produces its own task and blocks E-Verify submission (TARGETS 7 marker semantics). | Q24 |
| Q36g fanout (corrects TARGETS 6.1 item 6 and Q31i) | Location fanout is a seeded Zipf with s = 0.5 over 2,000 locations at the 100k rung, so the largest location holds about 1,100 workers and the mean stays 50. s = 1.0 put about 12,100 workers (12% of the population) at one location, which contradicts the stated intent ("hundreds of workers") and would make GS.06b a single extreme case. | orchestrator error in TARGETS; D01a open question 7 |
| Q36h other rungs | Other rungs keep N / 50 locations with the same s; only the 100k numbers are frozen floors. | D01a open question 8 |
| Q36a-clarified outbox rule | The W0 author's resolution is accepted: the version hashes (release, inputs, payload), and the outbox publishes (id, version) only when that id was never published or when the payload differs from the latest published payload for that id; a new version caused only by a new release hash is recorded, not published (SPEC 8.4, self-review row 37). | Q36a's two clauses conflicted, since the release hash changes on every activation |

## Rulings on contract 0.3.4 questions (2026-11-08; Q37)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q37a allowlist scope | Accepted: the A0 density allowlist hashes five blocks per adapter, including `withTransaction` (nested-position adoption happens there); any refactor of these blocks makes the adapter non-dense until its falsifiers pass. | Q34a |
| Q37b blocked while pins are null | Accepted: every obligation O-REPLAY would close fails closed until the oracle is accepted after EXP-O03 and its pin is set; A0 measurements may run and produce diagnostics, never closures. | Q34d |
| Q37c O-TDK1 home | Done by the orchestrator: R20's reference encoder copied unchanged to `lab/oracles/decimal/tdk1_reference.py` (sha256 923f7577...ef3120), vectors from `gen_vectors.py` (seed 20261108, byte-reproducible) in `tdk1-vectors.json` (2,017 rows, sha256 29a4fc95...a9e5). Pin these in the contract's O-TDK1 entry and the V5 vector pin. | R20 |
| Q37d E-DECIMAL-FRACTION | Accepted as one error covering excess fraction digits at write and decimal-to-integer conversion with a nonzero fraction. | Q22, Q35e |

## Rulings on the Codex plan-v2 round-4 review (2026-11-08; Q38; review lab/reviews/plan-v2-round4.codex.md)
Round 4: R3-15 and R3-16 CLOSED; R3-14 and R3-17 PARTIAL; R3-18 NOT CLOSED in the snapshot; 3 new (6 to 8). All accepted.

| Q | Ruling | Basis |
| --- | --- | --- |
| Q38a no density exemption (replaces Q32e and Q34a) | Every composition, A0 included, runs the four position falsifiers (nested cuts in one engine transaction, abort gap, crash between append and resolution, resume at an abort gap) before any comparative or promotion claim. A dense allocator passes them cheaply; no source-hash allowlist grants an exemption, because Codex changed `withTransaction`'s exported binding outside the hashed blocks and the allowlist still passed. The allowlist is removed; add the outside-block mutation as a fixture proving the old mechanism was unsafe. | round 4 finding 1 |
| Q38b claim admission from evidence | `admit_claim` derives every prerequisite from validated, source-bound evidence in the receipts (falsifier receipts, composition identity, W0 and oracle pins), never from supplied case names or Booleans, and enforces Q37b: while O-REPLAY's pin is null (or any oracle the claim depends on is unpinned), every claim, screening included, is a diagnostic. Fixture: a claim with a null oracle pin is rejected. | round 4 finding 4; Q37b |
| Q38c regeneration discipline | Every change to RULINGS.md is followed by a compile and `--verify` before commit; a RULINGS.md entry that the generator does not compile is listed in the changelog as recorded-not-compiled, so the pinned input hash always matches. | round 4 finding 5 |
| Q38d decimal channel routing | Obligations cover channel routing for decimal comparisons on the repository, native and raw surfaces, including derived expressions and aggregate results: ordering always uses the `decimal_order_v1` key, never QLever's lexical text (kill a lexical-ORDER-BY mutant). JSON is opaque unless explicitly converted to a typed decimal, and that conversion validates and encodes. SUM decodes and computes exactly, then encodes a decimal result used for ordering; arithmetic on key strings is invalid. | round 4 finding 6 |
| Q38e decimal vectors | The orchestrator's generator rounded 518 of 2,000 random values (Python's 28-digit default context); fixed by exact construction with a Fraction assertion, and the same rounding fixed in the reference's adjacent-values suite (lab/oracles/decimal/README.md). New hashes: gen_vectors.py b30b430a...e1e1, tdk1-vectors.json 0a699f59...d2a5, tdk1_reference.py changed. O-TDK1 is BUILT; its vector pin stays null until an independent review of the vectors. | round 4 finding 7 |
| Q38f outbox transitions (refines Q36a and its clarification) | The content version hashes (release, inputs, payload) and is not the delivery identity. Each work item id carries a durable publication sequence that increments whenever the payload to publish differs from the latest published payload for that id; the delivery key is (id, publication sequence). So R1 to R2 to R1 publishes three deliveries (1650, 1700, 1650), and the receiver never suppresses the return. Publication state is persisted atomically with its outbox record; unacknowledged deliveries survive crashes and replay with their original identity. Required cases: release rollback (R1, R2, R1), crash before delivery, and an unchanged activation during recovery. | round 4 finding 8 |

## Rulings on EXP-X02 (2026-11-08; Q39; recorded, compiled in 0.3.5)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q39a DECIMAL sums on XTDB (refines Q19) | An engine-side exact sum uses `SUM(CAST(x AS DECIMAL(32,0)))` and reads the result as text; it is never cast back to BIGINT or any numeric client type, because XTDB 2.2.0 rounds DECIMAL to BIGINT through a double (1e18 + 4 read back as 1e18). `packages/core/src/datalog/compiler.ts:572` is checked for this cast (EXP-R02). Added to the XTDB hazard list. | EXP-X02 |
| Q39b language recorded | Every XTDB receipt records `TRIPLEX_XTDB_NATIVE_LANGUAGE` (xtql or xtdb-sql); XTQL and SQL results never share an obligation closure. | Q11 principle (per-surface measurement) |

## Rulings on V-D01 (W0 review) (2026-11-08; Q40; compiled in 0.3.6)
W0 becomes W0-1.1.0 (not yet pinned, so no new world name).

| Q | Ruling | Basis |
| --- | --- | --- |
| Q40a world size and ballast (F1, F7) | W0 adds rule-neutral ballast: owned answer entities (`<S>/ans:k` with `field` and `value` text no rule reads) and a reference chain deep enough for 3 to 6 hops, with each generated world's size drawn from P4's frozen buckets (50% 50-200 facts, 35% 201-800, 15% 801-2,000). Trace commands are built from W0 and ballast attributes, so non-W0 attributes stay E_UNKNOWN (no silent filter). Case: a ballast write affects nobody. | TARGETS 1.1 P4 item 1; Sam's paste (300 to 1,000 facts per placement) |
| Q40b two-hop dependency (F2) | The wage floor moves one hop further: `S.location -> L.jurisdiction -> J.stateMinWageCents` (and R2's local floor stays on L), so the dependency index must follow two references. Cases: a jurisdiction wage write, re-pointing `(L, jurisdiction)`, and the R1/R2 split at that depth. | P3 item 3; GS.06b |
| Q40c outbox under Q38f (F3) | SPEC 8.4 adopts Q38f: per-id durable publication sequence from 1; publish (id, seq + 1) when the id was never published or the payload's canonical bytes differ from the latest published payload; delivery key (id, seq); version is content identity only; atomic persistence; replay keeps (id, seq). Add a fifth pure operation `publish(state, evaluations) -> {deliveries, state}` so O-DOMAIN's expected outbox is testable. Cases: R1-R2-R1 rollback (1650, 1700, 1650 at sequences 1, 2, 3), correction revert, crash before delivery, unchanged activation during recovery. | Q38f |
| Q40d publication order (F4) | Per subject, the outbox applies an evaluation only if its basis is newer than the last applied one: greater `basis.tx`, or equal tx with a valid time not earlier. An older-basis evaluation publishes nothing. Case: a newer-basis R2 evaluation followed by an older-basis R1 evaluation yields no delivery. | P5 item 4; GS.10 |
| Q40e coverage of misreadings (F5) | Add every case V-D01 lists as must-add and should-add (PROP with older and equal-position decisions, PAYCHG reject after the change, MINWAGE without location, E_UNKNOWN for another placement's entity and for an unknown attribute, erased marker on a non-PII attribute, equal-`from` activation ties, bad activation hash, duplicate key inside `v`, duplicate subjects in `affected`, tnc without `everifyStatusAt`, submit-case without start date, v exactly at W under R2, tokens `1.65e3`, `-1` and `"1650"`, token checks on `basis.tx` and activation `tx`), and state in 4.4 step 1 that the duplicate-key rule applies anywhere including inside `v`. | V-D01 F5 |
| Q40f position ordinal (F6) | Positions in W0 are the 1-based dense ordinal of committed Triplex transacts in the tenant's source-of-truth stream, in coordinate order (Q31c), supplied identically to the kernel and to O-DOMAIN. | Q31c |
| Q40g generator (F8) | Name every draw field (including the passport expiry draw); pin the population fingerprint once the O-DOMAIN author's independent generator reproduces V-D01's. | V-D01 F8 |
| Q40h retirement (F9) | When a work item id disappears from a subject's outputs, the outbox records its retirement; a later reappearance publishes a new sequence even if the payload equals the last published one (so a second FNC notice is delivered). | real notices recur |
| Q40i narrow release (F10) | Add release R3 that changes one rule with a narrow read set (OT threshold 2,400 to 2,700 minutes), so P5 exercises re-running only the subjects the release diff affects through the dependency index; add a runtime-outcome attribute (an action result written by the runtime writer class) and a few population facts with later valid-from dates. | P5; TARGETS 2 writer mix |

## Q41: rulings on contract 0.3.5 questions (2026-11-08; compiled in 0.3.6 with Q40)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q41a Q40 timing | Compile Q40 into 0.3.6 once W0-1.1.0 lands (Q40c and Q40h change the outbox rules again: a reappearing work item publishes a new sequence even with an unchanged payload). | Q40 |
| Q41b Q37c correction | Q37c's tdk1_reference.py hash 923f7577... is superseded by Q38e's fix; the pinned hash is 73467589...bf33. | Q38e |
| Q41c Q39b enforcement | Accepted: the 19 engine-scope XTDB obligations touching a native or raw surface are keyed by native language. | Q39b |
| Q41d admit_claim | Accepted: the generator's admit_claim is a reference model with structural receipt checks; lab/bin's evaluator implements it as a minimum and adds the full receipt-validity (VA) rules. | Q38b |
| Q41e O-TDK1 gating | Accepted: TDK1 and decimal-routing obligations fail closed until the independent vector review sets O-TDK1's acceptance and the V5 pin. | Q37b |

## Q42: rulings on Codex plan-v2 round 5 (2026-11-08; review lab/reviews/plan-v2-round5.codex.md; compiled in 0.3.6)
Round 5: R4-1, 2, 3, 5, 6, 7 CLOSED; R4-4 and R4-8 PARTIAL; 3 new (9 to 11). All accepted.

| Q | Ruling | Basis |
| --- | --- | --- |
| Q42a evidence-backed admission (R4-4, finding 11) | Claim admission opens and verifies the evidence, never only its shape: every referenced object exists in the content-addressed store and its bytes hash to the recorded value; the executed binary and modules are bound to the claimed source tree through a build/import manifest that is itself an object; receipts are fresh (produced at the claim's commit, after the last change to any file in their dependency closure); fault repetitions, modes and verifier evidence required by the obligation are present; the claimed obligation's own measurement receipts exist (for example NS.P2 measurements for an NS.P2 claim) with their correctness checks and a matched control (A0 on the same slot, trace, seed and window); unknown obligation ids are rejected, never dropped. Counterexample fixtures: all-zero object hashes, a stale binary under the same source label, a falsifier receipt from an earlier commit, a claim with prerequisites but no measurement receipt, an unknown id. This is implemented in lab/bin (EXP-E01), with the generator's admit_claim as the reference model. | round 5 findings 4, 11 |
| Q42b receiver ordering (finding 9) | Receivers apply deliveries per id by publication sequence: a state projection records the highest sequence applied and ignores any lower one (it never regresses); an effect that needs every transition processes sequences in order and recovers gaps from the outbox before applying a later one; receiver deduplication is persisted atomically with the receiver's state or effect (or the recipient is idempotent by (id, seq)). Cases: reversed arrival (seq 2 before seq 1 ends on seq 2's payload), a gap, and receiver restart mid-sequence. W0 adds a sixth pure operation `receive(state, deliveries)` so O-DOMAIN gives the expected receiver state. | round 5 finding 9 |
| Q42c one atomic unit (finding 10) | Per subject, the basis guard (Q40d), retirement state (Q40h), publication sequence, latest published payload and the outbox records are persisted in one atomic write under the subject's CAS; the guard advances on empty and unchanged evaluations too. Crash injection between every pair of these transitions is a required case set. | round 5 finding 10 |

## Q43: rulings on EXP-O03's decisions (2026-11-08; oracle O-REPLAY 0.3.0 at 99d85be; compiled in 0.3.6)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q43a decimal error ids (R-DEC-13, R-DEC-16) | The oracle follows contract 0.3.5, which compiled Q35e: E-DECIMAL-UNREPRESENTABLE is gone. A decimal value beyond its declared or 38-digit precision, including number-to-decimal overflow, is E-DECIMAL-OVERFLOW; excess fraction digits are E-DECIMAL-FRACTION. | Q35e (compiled in 0.3.4) |
| Q43b R-DEC-14 | AVG over decimals is E-DECIMAL-AVG (the id contract 0.3.4 created), not E-DECIMAL-BARE-DIVIDE. | contract 0.3.4 |
| Q43c R-DEC-8 | Accepted: an undeclared decimal literal has scale = written fraction digits and precision = max(1, integer digits + scale). | Q22 |
| Q43d R-DEC-9 | Accepted: half-up rounds ties away from zero, including negative ties; half-even rounds ties to the even digit; down truncates toward zero. | Q22 |
| Q43e R-DEC-10 | Accepted: inside an expression with no target column the precision limit is 38. | Q22 |
| Q43f R-DEC-11 (overrides the refusal) | `round(x, s)` with s greater than x's scale is exact: it returns x at scale s by appending zeros, never refused (subject to the 38-digit limit). | exact operation |
| Q43g R-DEC-12 | Accepted: `toInteger` of a whole decimal outside the integer range is E-INTEGER-OVERFLOW. | numeric rule item 3 |
| Q43h R-CUT-4 | A read basis given as -0 is E-NEGATIVE-ZERO-INSTANT, consistent with Q30b. | Q30b |
| Q43f-detail | Accepted the oracle author's choice: `round(x, s)` to a larger scale has result precision p + (s - s_x), capped at 38, so x's integer digits always fit. | Q43f |

## Q44: rulings on the W0-1.1.0 re-review (2026-11-08; lab/verify/D01/VERIFY.md; compiled in 0.3.6)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q44a fixes G1-G5, G6, G7, G9 | Accepted as the reviewer proposed: C68 holds the raw token `1.65e3` and validate.py asserts the raw token text of every numeric-error case; C76 carries the real id and validate.py recomputes every delivery id and checks every version against a record; one receive case with seq 1, 1, 3, 3, 2 pins both dedup rules; SPEC 12.7 states the fingerprint recipe exactly; the five SPEC contradictions are fixed; K = 4 x ceil(L / 80); 12.6 states that worlds can fall up to 2 facts below their bucket; publish and receive shape validation listed in 4.4 with one E_SHAPE case per operation. | V-D01 re-review |
| Q44b narrowing by subject (G8, option a; amends Q40i) | R3 becomes a scoped release: it changes the OT threshold to 2,700 minutes only for placements whose location's jurisdiction is in a listed set (about 10% of jurisdictions), so the subjects R3 reaches are selected through the reverse two-hop dependency index, not by rule. Release scope is part of the release's content hash. Expected affected subjects and changed subjects are stated separately in SPEC 12. | Sam's paste: re-run the subjects the change affects; P5 |
| Q44c publish only live reconciles (G10) | A delivery's subject comes from the evaluation record; only live reconciles at the current basis are published; previews (GS.11) and past-valid-time audit evaluations are never passed to publish, because the basis guard orders by tx first and would publish past payloads. | V-D01 G10 |
| Q44d receivers from the start | Receivers exist from the first publication or are seeded with a state snapshot; a receiver that starts after acknowledged deliveries were pruned would wait forever for seq 1 (stated in SPEC 8.9). | V-D01 section 3 |

## Q45: O-REPLAY pin and V-O03 findings (2026-11-08; compiled in 0.3.6)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q45a pin | O-REPLAY is ACCEPTED at 8cc2c26 (29 file hashes in lab/verify/O02/v-o03/hashes.8cc2c26.json), acceptance receipt V-O03, against contract 0.3.5 + Q43. The contract gains a per-oracle exclusion list; O-REPLAY's excludes G1.decimal.channel-routing until F2 is fixed and re-verified. | V-O03 ACCEPT |
| Q45b refusal handling (N2) | An oracle exit 2 with X-NOT-MODELED means "not modeled": the obligation fails closed; it is never treated as a case-authoring error. Erasure cases spell the op `erase`; outbox steps are never encoded as O-REPLAY ops (O-DOMAIN owns them). | V-O03 N2 |
| Q45c G1.types.decimal (N3) | Its three key-byte cases move to the G1.decimal.tdk1-* obligations (owned by O-TDK1); G1.types.decimal keeps the value cases. | V-O03 N3 |
| Q45d DO-ROUND (N1) | Compile Q43f-detail: round to a larger scale has precision p + (s - s_x), capped at 38. | Q43f |
| Q45e follow-up EXP-O04 | The oracle author fixes F2 (DR-JSON-CONVERT per contract; add `decimalRouting` to RULES.md's table list and Coverage.TABLES) and models erasure (Q24, Q31f) so the 11 erasure-dependent obligations can close; then an independent re-check before the pin moves. | V-O03 F2 |

## Q46: rulings on contract 0.3.6 questions (2026-11-08; held in lab/reviews/plan-v2-round6.responses.md; compiled in 0.3.7)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q46a crash pairs | Accepted: Q42c's crash cases cover all 10 pairs of the five transitions, not only the 4 consecutive gaps. | Q42c |
| Q46b A0 control identity | Accepted: once EXP-N01/N02 measures A0 (at the budget re-freeze), the A0 commit and tree are pinned in the contract and the evaluator takes the control's identity from there, never from the claim. | Q42a |
| Q46c W0 pin layout | Accepted: the W0 pin's file list is adjusted when W0-1.1.1 merges, before V-D01's delta check. | Q44 |
| Q46d O04 follow-up | Accepted: when EXP-O04 lands and is re-verified, a new pin is compiled and the excludes and refusals shrink in that version, with the pin-scope expected-differences list updated. | Q45e |

## Q47: rulings on Codex plan-v2 round 6 (2026-11-08; review lab/reviews/plan-v2-round6.codex.md; compiled in 0.3.7)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q47a evidence meaning, not only hashes (R5-4) | Admission validates the complete object graph and every record's schema: the build/import manifest's executed modules are retained objects whose bytes hash to the manifest; verifier records must match the verifier-record schema; every case verdict is recomputed from the retained raw result (an oracle exit 2 or X-NOT-MODELED can never count as PASS). Implemented in EXP-E01; the generator's reference model mirrors it. | round 6 finding 1 |
| Q47b genuine matched control (R5-11) | Both the claim's measurement receipt and its control carry nonempty, validated workload identity (trace generator hash, seed, offer schedule hash, measurement window bounds, slot identity); a missing field never matches a missing field. The A0 control's identity comes from the frozen A0 registry in the contract (Q46b), never from the claim; a candidate-selected control cannot qualify a comparison. | round 6 finding 5 |
| Q47c refusals resolved per case (finding 6) | Admission re-judges the oracle on every case the obligation selects, directly or through a broader case set, and rejects the claim if any case's retained oracle run refused; the per-oracle scope list is advisory, and the generator propagates unsupported-rule dependencies through indirect selections (for example CS-MIGRATION and CS-WIDEN reaching decimal scale evolution), so G7.migration.schema-evolution and G1.types.storage-widening-safe are classified blocked for any case that redeclares a decimal attribute. | round 6 finding 6 |
| Q47d pending rulings (finding 7) | RULINGS-PENDING.md may hold ruling rows; they carry no authority, are never compiled, and their presence is recorded (file hash, listed as pending) without invalidating generation. Until 0.3.7 implements this, pending rows live in review response files. | round 6 finding 7 |

## Q48: W0 accepted; V-D01 delta-check notes (2026-11-08; lab/verify/D01/VERIFY.md; compiled in 0.3.7)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q48a W0 pin | W0-1.1.1 at ada2e90 is ACCEPTED (V-D01 delta check); the contract pins its 95 file hashes (lab/verify/D01/W0-1.1.1-ada2e90-SHA256SUMS) and the fingerprint once the O-DOMAIN author's independent generator reproduces it (Q40g). | V-D01 ACCEPT |
| Q48b narrow-release rung (N3, N4) | The scoped-release P5 measurement runs at the 100k rung; a P5 receipt for a scoped sweep binds the reached-subject list (and its hash) instead of every placement. | V-D01 N3, N4 |
| Q48c next W0 edit (N1, N2, N5) | W0-1.1.2 adds an R3 case with a listed jurisdiction that has no facts, adds "and A's entry for that rule is unscoped" to the SPEC 5.3 skip rule, and records measured R3 counts (9,497 reached, 418 changed) beside the expected ones; none changes an output, a case result, a floor or the fingerprint. | V-D01 N1, N2, N5 |

## Q49: EXP-O04 erasure and decimal questions (2026-11-08; lab/experiments/EXP-O04-oracle-erasure/REPORT.md; compiled in 0.3.7)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q49a erasure commit in the journal (R-ERA-2, R-ERA-5) | An erasure commit is an ordinary data-journal transaction: it has a position, a txId, a record in `transactions()` and its own `:_tx/` facts, and its changes list only identities (entity, attribute, assertion ids), never values. It is also written to the erasure ledger kept apart from the data (TARGETS 7 item 5), which restore and rebuild replay. Earlier transactions' `:_tx/change` facts for erased values show the ErasedValue marker (modulo erasure), so the whole-journal comparison of ER-JOURNAL-MODULO compares markers on both sides. | TARGETS 7; Q24, Q31f |
| Q49b idempotence (R-ERA-3) | Accepted: the first erasure of an identity sets `erasedAt`; erasing it again changes nothing; an erase that matches nothing still commits (a journal record with an empty change list). | idempotent commands |
| Q49c erased values in queries (R-ERA-4; provisional, under the Q24 flag for Sam) | An erased value is present with no readable value: it matches no value predicate (equality, inequality, range, pattern), so a filter never selects or rejects a subject by it; value aggregates (SUM, AVG, MIN, MAX) skip it while COUNT of assertions counts it; ORDER BY places erased markers last in a deterministic order by assertion id; grouping puts all erased values of an attribute in one group keyed by the marker; Unique ignores erased values; an erased reference cannot be followed (an include returns the marker). | hard error, never silent; deterministic answers |
| Q49d in-flight reads (R-ERA-6) | Accepted: for a read that started before the erasure published, each erased value may be the old value or the marker. | TARGETS 7 item 1 |
| Q49e JSON number to decimal (R-DEC-18) | A JSON number converts from its as-written reading (Q33a's read-back-as-written text): toDecimal(json 0.1, 2, 1) = 0.1. The exact binary64 expansion is never used for JSON. Decimal text inside a JSON string is E-INVALID-VALUE unless the query converts the string explicitly. | Q33a |

## Q50: EXP-P2Q open questions (compiled in 0.3.8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q50a replica unreachable (open question 2) | Entity and repository pulls fall back to the broker's own record when the replica is unreachable (TARGETS 4.1: the source of truth's own query surface is an eligible fallback). The cheap way is a broker-side current-entity index, which is also a candidate current-index layer for P4 (per-subject current document served from the host, QLever kept for history and analytics); EXP-Q05 builds and measures it. | TARGETS 4.1 items 4-6; P4 |
| Q50b native and Datalog reads beyond the watermark (open question 3; superseded by Q55c) | Native SPARQL and Datalog reads at a basis the replica has not reached wait within the read's deadline (Q31d's 10 ms, extended to the request's own timeout for native queries that name an explicit basis) and then fail with a typed `BasisNotAvailable` error, never an untyped failure; repository reads use the overlay or the broker. Read-your-own-write is a repository-pull guarantee. | Q31d, Q31e |
| Q50c write amplification (open question 4) | Measure and reduce triples per command on QLever (about 750 per 10-fact command against R17's 94): the journal encoding is the first suspect. Owner: EXP-Q05 with EXP-R02. | P2, delta growth |
| Q50d hardening (open question 5) | Required before promotion of the broker composition: an overlay memory bound with backpressure (typed `Overloaded` beyond the bound) for GS.04b-style replica outages, segment rotation with checkpoints, a kernel file lock (flock) in addition to the epoch and marker guard. Out-of-process broker and off-device copies are deferred. | GS.04b; C3 fencing |
| Q50e measurement (open questions 1, 6) | The exclusive-slot run list (A0 and candidate at delta 0/100k/500k, persist-updates off, kill -9 replay, rebuild trigger cost, full trace with burst against QLever, keep-alive recheck on an idle slot) joins the QLever exclusive queue first. | Q47b matched controls |

## Q51: EXP-P2X open questions (compiled in 0.3.8 except Q51b, which stays in RULINGS-PENDING.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51a hot subjects | Accepted for every lane: a per-subject FIFO queue in the runtime's command router (bounded; typed `Overloaded` beyond the bound, never an unbounded wait) and same-subject group commit (up to 8 queued commands of one subject in one engine transaction, positions by ordinal). Optimistic CAS stays for cross-node races. The queue is part of the candidate, not the driver. | P2 progress (accounting is not progress); trace hot subject 20% |
| Q51c positions bound after commit | Accepted: the core binds a transaction's position after the source of truth publishes it; positions become an opaque, totally ordered value (bigint), so adapters stop returning placeholders and the 8-ordinal packing limit goes away. Lands with the broker's engine-agnostic extraction (EXP-P2B), on both lanes. | Q31c |
| Q51d bytes per commit | One cross-lane experiment (EXP-J01) measures bytes and triples per 10-fact command on both lanes (XTDB A0 27,581 bytes, candidate 95,364; QLever A0 about 750 triples against R17's 94) and cuts the journal and parameter encoding. Q50c is folded into it. | P2, storage per commit |
| Q51e 100k rung | Deferred until EXP-J01 lands; re-estimate the disk need from the new bytes per commit before asking for a large slot. | disk budget 50 GiB |
| Q51f untested items | `lab/bin/engine.mjs` gains a `kill` verb (SIGKILL the engine process) so F3 can be tested engine-side on both lanes. A scope written by both commit paths at once is refused with a typed error at runtime, not left unsupported. xt.txs and METADATA cost at 1M+ transactions joins the EXP-J01 measurement list. | Q31c F3 |

## Q52: EXP-O04 residual erasure and decimal questions (provisional, under the Q24 flag for Sam) (compiled in 0.3.8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q52a COUNT over erased values | A count of distinct values counts an attribute's erased values as one value (the marker group of Q49c), the same as GROUP BY; a count of assertions counts each erased assertion. | Q49c grouping |
| Q52b ORDER BY with erased and missing values | Readable values first, then erased markers (by assertion id), then missing values, in both directions. | present before absent |
| Q52c erasedAt of a marker group | The group's marker reports the earliest erasedAt among its members. | deterministic answers |
| Q52d ReferenceTarget over an erased reference | An erased reference takes no part in reference constraints: it blocks no restrict delete, cascades nothing and is skipped by ReferenceTarget validation, because enforcing it would need the erased value. | Q24 |
| Q52e computed answers over in-flight values | An erasure commit is atomic for readers: a read that started before it published sees either all of that commit's values as they were or all as markers, never a mix; the oracle accepts exactly those two whole answers. This narrows Q49d from per value to per commit. | Q49d |
| Q52f toDecimal(json, p, s, rounding) | The named mode (half-even, half-up or down, Q22) applies to the JSON number's as-written decimal reading (Q49e); without a rounding argument, excess digits are E-DECIMAL-FRACTION. | Q22, Q49e |
| Q52g erase command shape | The op is spelled `erase`; `erasure` is a typed invalid-command error. An erase is its own command: mixing it with other ops, or giving it preconditions, is a typed invalid-command error. | Q49a |

## Q53: W0 SPEC-AMBIGUITY readings from EXP-D01c (compiled in 0.3.8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q53a readings A01-A10 | Accepted as written in lab/experiments/EXP-D01c-o-domain/REPORT.md. They change no golden case and no fingerprint value. | W0-1.1.1 outputs unchanged |
| Q53b fold into W0 | W0-1.1.2 adds them to SPEC.md as clarifications and adds one golden case per reading (A10 is already exercised by the population), so the TypeScript kernel (EXP-D01b) and O-DOMAIN are held to the same reading. Every existing case and the fingerprint must stay byte-identical; V-D01c checks that. Until W0-1.1.2 lands, the W0 pin covers W0-1.1.1 with these readings recorded. | Q31i (two independent implementers) |

## Q54: EXP-A01 contract 0.3.7 questions (compiled in 0.3.8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q54a third blocked obligation | Keep G7.migration.valid-writes-never-rejected blocked by the CS-MIGRATION:* reach: a valid-write migration case can redeclare a decimal attribute. Narrow the reach once the CS-MIGRATION manifest tags its decimal-redeclaring cases, or once O-REPLAY models R-DEC-15. | Q47c |
| Q54b no reach for two selections | Confirmed: CS-REQ:no-silent-precision-loss and CS-TYPES8:decimal get no reach, because neither redeclares a scale. | Q47c |
| Q54c 0.3.8 content | 0.3.8 compiles Q50 to Q54; Q52e replaces the 0.3.7 ERASURE inFlight text (per commit, not per value). | Q47d |
| Q54d control production | Confirmed: tree and composition come from A0_REGISTRY; the control receipt is a fresh harness run at the claim's commit; the registry commit is the A0 code commit. EXP-E01 does the same. | Q47b, Q46b |
| Q54e record schemas | build-manifest/1, verifier-record/1 and case-result/1 are adopted as written in 0.3.7; EXP-E01 conforms and proposes any change for 0.3.8. | Q47a |

## Q55: Codex round 7 on contract 0.3.7 (compiled in 0.3.8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q55a qualification is a run, not a document | A QUALIFIED verdict comes only from a run the evaluator (lab/bin/claim.mjs) executes itself at the claimed commit: it builds the declared source tree (and A0 from the registry's tree and commit) and records its own build hashes; it resolves cases from the pinned manifests (every case and mode in each selected set; a claimant's `selection` or case list is ignored); it runs the system under test through the gate on a registered slot; it computes every expected answer by running the pinned oracle on the pinned input and applies the declared comparator. Records an experiment supplies are DIAGNOSTIC evidence only. Independent verification counts only through a contract-held VERIFIER_REGISTRY entry (verifier id, brief hash, branch, commit, verdict), added by a reviewed contract version, never by a record in a claim. | round 7 findings 1, 2 |
| Q55b source and replica publication | QT4 splits into QT4s (the source of truth's decision is durable and its own read surface answers at that position: the broker's log reader or overlay, or the engine itself when the engine is the source) and QT4r (the replica's marker has reached the position). ACK is allowed after QT4s (Q31e). Every composition declares its source implementation; the receipt binds the broker or log identity and its durability configuration (fsync mode, F_FULLFSYNC, device) next to engine identities. Each protocol variant (engine as source; host log as source with an engine replica) has its own witnessed transition table in G7.commit.protocol-transitions. | round 7 finding 5; Q31e |
| Q55c per-surface read guarantees (provisional, flagged for Sam) | Repository pulls: read-your-own-write by routing (replica, else overlay, else the source's log), never below the caller's basis; with the replica unreachable they fall back to the source (Q50a). Native SPARQL, XTQL, SQL and Datalog: every answer reports the basis it was computed at; with a basis token it is never below that basis (wait within the request deadline, then typed BasisNotAvailable); without one it answers at the replica's watermark and reports that position; with the replica unreachable it fails typed ReplicaUnavailable. No surface may present an answer as at a basis it was not computed at. NS.P2 and G7.composition.ack-and-routed-ryow test each surface the composition claims; this supersedes Q50b's wording. | round 7 finding 6; the goal's "raw native queries still make sense" |
| Q55d P3 lag from source publication | P3 lag is measured from the source's own publication timestamp for each position (the broker's durable watermark update, or the engine's commit resolution when the engine is the source), recorded by the source independently of ACK delivery, to the consumer's durable record. Every committed position is accounted (no sample dropped for a missing ACK; missing ones are counted and fail the run). EXP-P2Q's ACK-to-consumer figure is not the contracted measurement until recomputed. | round 7 finding 7 |
| Q55e domain fingerprint | Confirmed: the O-DOMAIN fingerprint pin changes only by a reviewed contract version; the evaluator owns the function argument and a claim cannot supply it. | round 7 finding 8 |

## Q56: V-O04b findings on O-REPLAY 0.4.1 (provisional, under the Q24 flag for Sam) (compiled in 0.3.8)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q56a unknown erase target (F3) | "Matches nothing" in Q49b means a well-formed entity or entity-plus-attribute selector with no assertions to erase, which commits with an empty change list. An erase naming an unknown assertion `target` or an unknown `id` is E-INVALID-VALUE, the same as retract (Q33f). | Q33f, Q49b |
| Q56b card-one with a readable and an erased value (F4.1) | An erased value is still a present assertion, so a card-one attribute holding a readable value and an erased value conflicts (E-CONFLICTING-VALUES) exactly as two readable values would; the remedy is to retract the erased assertion. | Q49c "present" |
| Q56c one of two equal supports erased (F4.2) | Answers after an erasure never depend on the erased value. A card-one attribute with a readable "SAME" and an erased support conflicts whatever the erased value was, so the read is E-CONFLICTING-VALUES even though the value read "SAME" before the erasure; returning "SAME" would reveal that the erased value equalled it. | TARGETS 7; Q24 |
| Q56d card-many marker position (F4.3) | In a card-many value list, erased markers come after the readable elements, ordered by assertion id, the same as ORDER BY (Q49c). | Q49c |
| Q56e Required over an erased value (F4.4) | Required is satisfied by an erased value, because the assertion is present. | Q49c |
| Q56f the `id` selector (F4.5) | Erase accepts the same selectors as retract, including `{"id": ...}`; SCHEMA.md documents it in 0.4.2. | Q33f |
| Q56g retract after erase (F4.6) | Retracting an already erased assertion by target commits; history shows the marker with the retraction's time. Erase then delete is a supported flow. | Q24 |
| Q56h synthetic values only (N1) | In-flight outputs list the old value as acceptable (Q49d), so oracle outputs can hold the pre-erasure value. Every oracle case, fixture and golden scenario uses synthetic values only; no real personal data enters the lab. | Q49d |
| Q56i pin | With Q56a-g ruled as the oracle answers, O-REPLAY 0.4.1 (a9c1327) pins unchanged once V-O04b converts its seven DERIVED-NOTE probes into checked probes and they pass. 0.4.2 adds Q52 and the SCHEMA.md note. | Q46d nextPin |

## Q58: R23 log-of-record compositions (lab/research/R23-log-of-record-compositions.md) (compiled in 0.3.9)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q58a native-query tokens (provisional, replaces Q55c's native half; flagged for Sam) | Native queries go through a Triplex facade; engine ports are not a public surface. A request may carry `after: position` (wait until the replica marker reaches it within the deadline, then typed BasisNotAvailable{required, observed, replica}) or `at: position` (exact; also requires the engine to reconstruct it, else typed BasisNotReconstructible). A client session sends its own high-water mark (last commit position and last read basis) as an implicit `after`. Tokenless external callers get the replica's watermark and the reported position. Every answer carries {basis: {low, high}, route}. Replica unreachable stays ReplicaUnavailable. Default deadline 2 s. | R23 sections 2 and 7; mature systems (Mongo, Cosmos, XTDB client, LiteFS) |
| Q58b EXP-P2B | XTDB becomes a second replica behind the broker: one pgwire transaction per frame (ASSERT the marker, INSERT rows with a fixed `_valid_from`, INSERT the new marker; P0004 on guard failure); rows and marker read in one read-only transaction; the marker row is the eligibility authority; XTDB system time is not used to carry broker positions; Local log first, InMemory log plus an epoch bump as an arm; predictions and measurements per R23 section 6. It starts after the broker fix round (Q62) is re-verified, from the same author, so one writer owns the broker files. | R23 section 6; Q51b |
| Q58c broker substrate (hardening experiment after P2B) | The host log moves to SQLite through better-sqlite3 (WAL, synchronous=FULL, fullfsync=ON, checkpoint_fullfsync=ON, locking_mode=EXCLUSIVE, application-driven PASSIVE checkpoints, a worker thread when readers share the process), keeping a CRC32C prev-chain column, a `committed_at` column, an epoch row and the marker and checkpoint cross-checks (plain SQLite misses mid-WAL corruption). heads, claims and operations become tables; the overlay becomes a persisted `recent_rows` table. Predictions H1-H6 of R23 section 6.4. This replaces Q50d's rotation and lock items. | R23 section 3; Q50d |
| Q58d overlay rules | The overlay merge is allowed for entity pulls only, keyed by id with the greater LSN winning, under a tested invariant (identity columns never change; retraction is a new version). Engine aggregates, Datalog and executor reads and paged lists never merge: they wait or fail typed. Frames carry explicit tombstones so erasure and deletes cannot resurrect replica rows. | R23 section 5 |
| Q58e erasure reaches the log | Values held in the broker log, `recent_rows` and checkpoints must be erasable: value payloads in frames are encrypted per subject and erasure destroys the key (crypto-shredding), so TARGETS 7 holds without rewriting the log. Design in the hardening experiment. | R23 open question 4; TARGETS 7 |

## Q59: EXP-A01 contract 0.3.8 questions (compiled in 0.3.9)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q59a placement | Keep the Q52 shapes and the Q52f rounding case out of the closable obligations until O-REPLAY 0.4.2 is accepted, then fold them back. | Q52 |
| Q59b ER-INFLIGHT-READ | Confirmed narrowed to a one-value erasure; ER-INFLIGHT-ALL-OR-NONE stays in G9.erasure.residual-shapes until 0.4.2. | Q52e |
| Q59c verification briefs | Every verification and re-check saves its own BRIEF file, so the registry's brief hash identifies the actual instructions. | Q55a |
| Q59d registry per obligation | Accepted as Q55a's intent: each claimed obligation needs a VERIFIER_REGISTRY entry for its commit, added by a regenerated contract version. | Q55a |
| Q59e unpinned oracles | Every answer-producing oracle gets a pin and a registry entry in a later version; until then claims that depend on an unpinned oracle are DIAGNOSTIC. | Q55a |
| Q59f case manifests | Case authors pin manifests through contract versions, starting with CS-POSITION and CS-NS (EXP-W01 for CS-GS). | Q55a |

## Q60: R22 measurement protocol PAIR-0 (lab/research/R22-noise-robust-benchmarking.md; provisional) (compiled in 0.3.9)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q60a design | Comparisons run as paired rounds: a duet (A0 and candidate at the same time on two identically configured slots, same trace window) or same-engine ABBA as the fallback; 8 rounds minimum, 12 default, 24 maximum, about 150 s each; pooled-quantile ratios with a bootstrap over rounds; looks at 8, 12, 18 and 24 rounds at 98.2%; A/A rounds in the pre-flight and every sixth round. A single run never decides a bar. | R22 sections 1, 2, 7 |
| Q60b margins | Superiority needs the lower bound of A/B at or above the claimed ratio (1.25 by default); "hold" needs the upper bound of B/A at or below 1.10 for p50 and 1.15 for p99. Orchestrator's interpretation, adjustable (NORTH-STAR item 4). | R22 section 2.3 |
| Q60c slot regime | Measurement slots run with a cpuset and no CPU quota; receipts record effective cpu.max, cpuset and cpu.weight; quota and cpuset arms are never compared; A0 is measured again under the new regime. | R22 section 3 (77% of periods throttled under the quota) |
| Q60d accounting | Latency histograms include every offered command (expired, failed and rejected at their censor time) next to the committed-only view; reads get an open-loop probe at a fixed rate; per-second goodput and per-second maximum latency are recorded. | R22 section 2.4 |
| Q60e windows | Absolute bars are judged only in GREEN windows (pre-registered noise signals and the A/A gate of R22 section 4.2); otherwise they are reported "unjudged". | R22 section 4 |
| Q60f execution mode | NS obligations gain a `paired-rounds` execution mode next to Q26's `single-execution`. | Q26 |
| Q60g screening series | A screening trace with a burst every 180 s is a new comparison series (TARGETS 2.1 item 5), so P2 and P3 rounds contain enough commands for p99; acceptance keeps the frozen trace. | R22 finding 4 |
| Q60h lease | A measurement window takes every heavy token and freezes pool admission for its duration. | R22 section 3.5 |
| Q60i A0 runs under the old protocol | EXP-N01's single-run A0 is diagnostic only; A0 numbers for comparisons come from paired rounds. | Q60a |

## Q61: EXP-E01 claim evaluator questions (compiled in 0.3.9)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q61a contract source | `qualify` reads the contract from the authority ref (main), never from the claimed commit. | Q55a |
| Q61b registry shape | The evaluator reads 0.3.8's VERIFIER_REGISTRY (verifier, brief hash, branch, commit, verdict, subject) as written. | Q55a |
| Q61c oracle runners | The contract gains `oracleRunners` {argv, files for an unpinned oracle} plus an answer-extraction rule; O-REPLAY's default argv is `python3 -I lab/oracles/replay/cli.py {case}`. | Q55a step 4 |
| Q61d case manifests | Case manifest fields input, contentSha256, comparator and optional oracle and faultPoint are pinned. | Q59f |
| Q61e case-result/2 | case-result gains mode, rep, comparator and inputSha256; records that cannot be expressed fail closed. | Q47a |
| Q61f build spec | The build spec moves into the contract together with the build inputs in build-manifest. | Q55a step 1 |
| Q61g workload identity | Required only for CR-NS and CR-GS obligations, not for correctness obligations. | Q47b |
| Q61h frozen trace | Pinned as `writerTrace.generator.frozen` {sha256, seed, offerScheduleSha256}. | TARGETS 2.1 |
| Q61i image pins | Engine image pins move into the contract (from slots.json). | Q55a |
| Q61j fault witnesses | Fault witnesses are retained, not only `faultReps` asserted. | Q34 |
| Q61k A0 verification | The A0 side is verified through the registry entry's measuredBy. | Q55a |

## Q62: V-P2Q REJECT (lab/verify/P2Q/VERIFY.md) (compiled in 0.3.9)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q62a fix round | The broker author fixes C1 (in-transaction Datalog waits for the replica to reach sourceK or fails typed; executor reads are scope-wide in the CAS read set), C2 (the replica's real marker is read with the answer and an idle applier probes it), C3 (a process-wide registry of open stream directories plus the perl flock helper), M1 (segment-header checksum; refuse when the WATERMARK names an LSN above the scanned end), M2 (B beyond the resolved prefix waits or fails typed, on A0 too), M3 (pulls and retraction-target reads fall back to the log; typed BasisNotAvailable and ReplicaUnavailable), m1 (a post-fsync exception fails the broker and answers outcome-unknown) and m6 (the P3 harness records per-position source and consumer instants and fails on missing ACKs); then V-P2Q re-verifies the new head. | V-P2Q findings |
| Q62b hardening | M4 (Q50d) is met by the Q58c hardening experiment before the broker becomes a default; merging behind the default-off option needs only Q62a. | Q50d, Q58c |
| Q62c write amplification | A0 writes 653 triples per 10-fact command on QLever (24 rows, about 27 triples per row), not about 750; the cause is the row encoding and journal on every lane, owned by EXP-J01. | V-P2Q check 8 |

## Q57: EXP-D01b W0 SPEC readings A11-A15 (to fold into W0-1.1.2 with Q53's A01-A10; not compiled: W0-1.1.2 has to land first) (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q57a A11 non-JSON number tokens | `NaN`, `Infinity` and `-Infinity` are W0.E_SHAPE, extending A01. | SPEC 4.4.1 |
| Q57b A12 long integer tokens | An integer token over 4,300 digits is still an integer token: E_VALUE for a value, E_BASIS for a tx. Implementations must not fail on their language's integer-parsing limits. | SPEC 2, 4.4 |
| Q57c A13 nesting depth | Any nesting depth is a valid JSON value, then E_VALUE; implementations must not fail on recursion limits. | SPEC 4.4.1 |
| Q57d A14 string order | Strings order by Unicode code point, which equals UTF-8 byte order. This covers object keys and the sorts of items, subjects, effects and projection, plus the basis guard's validTime comparison. Escapes follow A07. | SPEC 9 item 2 |
| Q57e A15 inconsistent receiver snapshots | Entries are kept as given and re-sorted stably by seq. Only seq = done + 1 releases; entries at or below done, and the second of two duplicates, stay waiting. | SPEC 8.9 |

## Q63: EXP-X05 follower result and the P1 direction (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q63a shared-volume follower | Rejected for promotion: XTDB 2.2.0's ReadOnlyLocalLog reads half-written records and dies permanently (9 deaths in 30 minutes), though it never answered wrongly. The second-writer guard and follower harness stay. | EXP-X05 |
| Q63b P1 direction | Read scaling on both lanes comes from replicas fed by the broker (Q58b): each XTDB or QLever replica has its own applier and marker, so readers never touch the writer's log or indexer and the shared-log follower is unnecessary. EXP-P2B measures the first XTDB replica; a second-replica arm follows. Kafka (E8, about 7 GiB) is deferred. | P1; R23; Q58b |
| Q63c upstream report | The ReadOnlyLocalLog torn-read repro joins the R21 upstream-filing question for Sam; nothing is filed without him. | publishes lab findings |
| Q63d literal SQL | Seeders and appliers on XTDB use parameterised statements only; 1,000-row literal INSERTs exhausted a 2 GiB heap (X05), as per-cell expressions did in P2X. | X05, P2X |

## Q64: EXP-A01 contract 0.3.9 questions (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q64a build spec | EXP-E01 proposes the real BUILD_SPEC values (install with `pnpm install --offline --frozen-lockfile --store-dir <repo>/.pnpm-store`, the per-package build, the gate's system-under-test argv) as `lab/config/build.json`; a contract version pins them. Until then every qualify run fails closed with BUILD-SPEC, as intended. | Q61f |
| Q64b frozen trace | EXP-M01 freezes the screening series (Q60g) and the acceptance trace generator, each with its own `writerTrace.generator.frozen` entry; until then claims stay DIAGNOSTIC. | Q61h, Q60g |
| Q64c COMPILED oracles | Confirmed: oracles whose answers are compiled into the contract itself (O-ERR, O-CONTRACT) count as pinned by the contract version; answer-producing oracles that run separately (O-REPLAY, O-DOMAIN, O-TDK1) need pins and registry entries. | Q59e |
| Q64d Q63 | Compile Q63b (P1 through broker-fed replicas) into COMPOSITION.experimentDirections and Q63d (parameterised SQL for seeders and appliers) as a rule in 0.3.10. | Q63 |
| Q64e slots.json | Keep it read but not hashed; an image change still fails generation until the pin moves in a contract version. | Q61i |
| Q64f pending sub-ids | The orchestrator moves sub-id rows together with their compiled section; 0.3.10 adds a check that a pending sub-id never also appears as a RULINGS.md row, while still allowing a pending sub-id (Q51b) under a compiled base. | Q47d |

## Q65: EXP-E01 on contract 0.3.9 (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q65a O-CONTRACT runner | O-CONTRACT gets an `oracleRunners` entry run from the authority's files (Q59e): a reference-model entry point in build_contract.py that answers one composition-identity case as canonical JSON. Without it G10.composition.identity-bound, a prerequisite of every claim, can never run. | Q61c |
| Q65b buildSpecSha256 | sha256 of the canonical JSON of {format, argv, outputs, run}. | Q61f |
| Q65c case-result/2 selection | A case reached by several select entries records the first select entry in contract order. | Q61e |
| Q65d build-manifest/2 packages | "Each built package" is the parent directory of each `dist/` output. | Q61f |
| Q65e build spec | E01's proposal (lab/config/build.json on exp/E01-claim-evaluator: `pnpm install --offline --frozen-lockfile --store-dir <repo>/.pnpm-store` then the five package builds in dependency order; outputs the five dist/ directories; run `node packages/qualification/workloads/obl-case.ts --case {case} --mode {mode}`) is pinned in 0.3.10 once `obl-case.ts` exists. | Q64a |
| Q65f executing OBL gate | The missing piece for any QUALIFIED claim is an executing `gate.mjs OBL` with `obl-case.ts`, a fault injector that writes fault-witness/1 records, and the PAIR-0 paired-rounds runner from EXP-M01. One experiment (EXP-G03) builds it after EXP-M01 lands. | Q55a |

## Q66: EXP-O04b O-REPLAY 0.4.2 limits (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q66a several erasures in flight | Erasure commits become visible in position order, so a read that started before n in-flight erasure commits in its scope sees a prefix of them: the acceptable answers are the n + 1 prefixes (none, the first, the first two, ...), not all 2^n subsets. | Q52e; Q31 positions and the resolved prefix |
| Q66b cursor over an in-flight read | A continuation cursor carries the erasure prefix its page was computed with, and every later page answers with that same prefix; the oracle answers `cursorFrom` on an in-flight entry per prefix instead of refusing. | Q52e; G10.cursor.stable |
| Q66c scope | Only erasures in the read's own scope are in flight; erasures in other scopes always apply. Confirmed. | scopes are independent sources |
| Q66d explicit text conversion | The explicitly converted half of DR-JSON-STRING-TEXT is a lane obligation; the oracle does not model text-to-decimal conversion. Confirmed. | Q49e |

## Q67: Codex round 8 on contract 0.3.9 and claim.mjs (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q67a blockers stay | Every blocker stays until EXP-G03's executing gate exists; manifests, runners, build spec, frozen trace and A0 controls are pinned only through contract versions. | round 8 finding 1 |
| Q67b execution identity | An execution's identity is its source tree, build spec, lockfile, toolchain versions, runner and config hashes per instance; executions are keyed by instance, never by output hash. | finding 2 |
| Q67c reset during a query | Single-request read surfaces read the replica marker in the same request as the answer. Multi-request surfaces (Datalog, executor) use replica incarnation fencing: every replay begins by writing a new incarnation id, and an answer is accepted only if (incarnation, marker) is equal before and after. The reset-during-query interleaving is an independently authored case. | finding 4 |
| Q67d P3 timing | Both arms enumerate the final published source prefix from the source's own record and timestamp actual publication (broker: watermark publication; engine as source: commit resolution); ACK records are reconciled afterwards; a late or lost ACK is never a feed defect. | finding 5; Q55d |
| Q67e isolation | Builds and both arms run isolated from evaluator, oracle, evidence and control storage; oracle bytes run from an evaluator-owned read-only copy re-hashed before every invocation; offline verdicts stay DIAGNOSTIC. | finding 6 |
| Q67f PAIR-0 admission | Admission recomputes every paired decision, noise grade, offered-command accounting and bar from retained per-round histograms, signals and events; the number of rounds must equal a registered look (8, 12, 18 or 24); the RED-window and committed-only counterexamples execute against admission. | finding 7; Q60 |
| Q67g placement | Shared workload identity is separate from each arm's placement; a duet needs equal capacity, equal regime and disjoint cpusets; slots are per arm; under cpusets the per-core denominator is the cpuset size. | finding 8; R22 |
| Q67h error representation | One representation: `_tag` "BasisNotAvailable" or "ReplicaUnavailable" with {required, observed, replica}; `cause` is optional; core gains these error classes and adapters return them. | finding 9; Q58a |
| Q67i comparators | case-result/2 is recomputed with its declared comparator on retained raw objects; byte equality applies only to CMP-EXACT. | finding 10; Q61e |
| Q67j promotion | Claim kind is preserved and promotion prerequisites (GATE-BROKER-HARDENING and others) are enforced mechanically; until supported, promotion qualification is rejected explicitly. | finding 11; Q62b |

## Q68: R24 current-value path and release sweep (lab/research/R24-current-path-and-sweep.md; provisional) (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q68a P4 design | P4's fast path is one current structure holding live facts plus facts retired after a retention horizon H, served at basis B only when H <= B <= W (W its applied watermark), else the history path. The first copy lives in the broker, written with the frame (H1); engines get a smaller copy in the same transaction or guarded update (XTDB `tx_current`, QLever `cur` graph) for list and native queries. EXP-P4 measures arms A0, X1, X2, Q1, H1 per R24 section 6, exactness gate first. | R24 sections 0, 6 |
| Q68b horizon | Default H trails head by one hour of positions (the 15% basis bucket); a pinned sweep or reconcile holds H at or below its pin; the broker refuses a new pin that would make H trail head by more than 24 hours. | R24 open question 1 |
| Q68c sweep publication | A sweep page may publish up to 64 results in one frame: one atomic outbox commit per frame, each result its own work item with its own delivery identity (Q38f). | R24 open question 6; TARGETS 1.1 P5 item 3 |
| Q68d host-served reads | Reads served from the broker count for P1 and P4 bars when the receipt records route = host and the per-core denominator includes broker and kernel CPU. | R24 open question 7; TARGETS 4.1 item 5 |
| Q68e expired facts | Facts whose valid_to has passed retire from the current structure through a valid-time horizon; EXP-P4 measures the 20% expired path. | R24 open question 5 |
| Q68f erasure of current copies | Every current copy (broker store, `tx_current`, `cur` graph) is covered by Q58e's per-subject keys; a QLever `cur` graph holds no personal-data literals (keys and references only, values from the encrypted host store) unless EXP-P4 shows a reindex-free erasure path. | TARGETS 7 item 3; R24 open question 4 |
| Q68g read-path change first | `FOR ALL VALID_TIME` on XTDB current reads forfeits the engine's current/historical split (R24 section 1); EXP-P4 measures X1 (default temporal bounds) in both a fresh and an aged regime before any write-path change. | R24 section 1 |

## Q69: EXP-M01 PAIR-0 decisions and the measurement window (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q69a measurement window | The pool cannot hold two 3.5 GiB slots beside both dev residents, so a measurement window stops one dev resident for its duration (qlever-dev by default, recreated fresh after; xtdb-dev when the window is QLever's) once no running agent depends on it. The orchestrator announces the window in STATE; no agent starts engine work during it; the lease (Q60h) enforces it. | EXP-M01 section 1 |
| Q69b INVALID verdict | Accepted: INVALID for protocol departures (development overrides, wrong regime, no lease, an unregistered round count), separate from INVALID_NOISE. | EXP-M01 |
| Q69c A/A in A/B mode | Accepted provisionally: A/B windows grade from the all-round s_d (conservative); acceptance-level claims add a second pair of container lifetimes with roles swapped (R22 open question 12). | R22 1.3 |
| Q69d continuous trace | Accepted for duets (both arms see the same content at the same time); ABBA fallback runs keep per-round window randomization. | R22 1.3 |
| Q69e live composition | The live A/A uses `public-queued`, matching EXP-N01's A0. | EXP-N01 |
| Q69f fallback series | `screening-r4` (4x the steady rate, no bursts) is pre-registered now as the fallback screening series, used only if the burst series makes commitAll p50 NOT_ESTIMABLE in the A/A run. | Q60g |
| Q69g calibration thresholds | Thresholds stay as pre-registered; a passive recorder (signals every 10 s, calibration every 10 minutes) runs for 7 days to set them (R22 4.1), started after EXP-M01 merges. | R22 4.1 |

## Q71: EXP-E01 round 8 questions (execution identity, toolchain, comparator in the reference) (compiled in 0.3.10)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q71a install metadata | The contract's `buildSpec` names an exclusion list of install metadata that `executionIdentity` leaves out (to start: `node_modules/.modules.yaml`, `node_modules/.pnpm/lock.yaml`); the list is found by diffing two clean installs of the same lockfile and is contract-owned, never claimant-supplied. Every other file in the post-build checkout stays in the identity. | EXP-E01 question 1 |
| Q71b toolchain | A build's toolchain is the node version, platform and arch, and the pnpm version when the build or run calls pnpm. The Python version that runs an oracle is not part of the build identity; it is recorded in each oracle invocation's evidence, because an oracle's answer can depend on it (for example integer-parsing limits). | EXP-E01 question 2 |
| Q71c reference comparator | `build_contract.py`'s case verdict adopts Q67i for case-result/2 (the declared comparator on the retained raw objects); case-result/1 documents keep hash equality because they carry no comparator. | EXP-E01 question 3 |

## Q72f: V-P2Q round 2, one error id (compiled in 0.3.10; Q72a-e and Q72g stay in RULINGS-PENDING.md)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q72f one error id | One contract id covers a basis beyond the latest published position: E-BASIS-NOT-AVAILABLE. E-UNAVAILABLE-CUT is retired; obligations that used it move to E-BASIS-NOT-AVAILABLE. | V-P2Q contract note |
