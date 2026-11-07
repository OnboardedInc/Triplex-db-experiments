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
