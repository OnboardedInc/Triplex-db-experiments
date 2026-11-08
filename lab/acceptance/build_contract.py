#!/usr/bin/env python3
"""Single source of truth for the triplex-db-2 acceptance contract (version 0.3.0).

Run:  python3 -I lab/acceptance/build_contract.py
It validates the whole contract (references, statement and profile consistency, thresholds, selectors,
traceability, raw exceptions, fragment coverage, validity dependencies, one check per ruling, banned superseded
targets and obsolete text) and, only when everything validates, writes:

  lab/acceptance/obligations.json      the only authority an evaluator reads
  lab/acceptance/load-contract.json    the fixed writer trace, the P1 reader ladder and the P5 sweep
  lab/acceptance/budgets.json          frozen-before-candidates budgets with cumulative A0 comparison
  lab/acceptance/capability-matrix.md  generated from the matrix data below
  lab/acceptance/ACCEPTANCE.md         generated human rendering (obligations.json wins on any difference)

Authority for goals and targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (Sam, 2026-11-07), and the
rulings in lab/acceptance/RULINGS.md. Inputs are hashed into the transitive contract hash. Stdlib only.
"""
import hashlib
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
VERSION = "0.3.10"


def contract_oracle_answer(case_bytes, contract):
    """RULINGS Q65a: O-CONTRACT's runner. Answers one composition-identity case {"composition": {...}} from the generated contract
    (obligations.json) as canonical JSON: whether every assignment is bound, the source variant, and whether every image is pinned."""
    def s_(v):
        return isinstance(v, str) and v.strip() != ""
    try:
        case = json.loads(case_bytes)
    except ValueError:
        case = None
    comp = case.get("composition") if isinstance(case, dict) else None
    assign = contract["composition"]["assignments"]
    fields, variants, logf, pins = contract["compositionFields"], contract["sourceVariantFields"], contract["logFields"], contract["imagePins"]
    unbound = []
    if not isinstance(comp, dict) or set(comp) != set(assign):
        unbound = list(assign)
    else:
        for k in assign:
            a = comp[k]
            extra = []
            if not isinstance(a, dict):
                unbound.append(k)
                continue
            if k == "source":
                if a.get("variant") not in variants:
                    unbound.append(k)
                    continue
                extra = ["variant"] + list(variants[a["variant"]])
            ok = set(a) == set(fields) | set(extra) and all(a[f] for f in fields)
            if ok and "log" in extra:
                lg = a["log"]
                ok = isinstance(lg, dict) and set(lg) == set(logf) and all((isinstance(lg[f], bool) if t == "bool" else (isinstance(lg[f], str) and len(lg[f]) == 64 and all(ch in "0123456789abcdef" for ch in lg[f])) if t == "hex64" else s_(lg[f])) for f, t in logf.items())
            if not ok:
                unbound.append(k)
    pinned = isinstance(comp, dict) and not unbound and all(comp[k]["imageDigest"] == (pins.get(comp[k]["engine"]) or {}).get("imageId") for k in assign)
    variant = comp.get("source", {}).get("variant") if isinstance(comp, dict) and isinstance(comp.get("source"), dict) else None
    return json.dumps({"bound": not unbound, "unboundAssignments": unbound, "imagesPinned": bool(pinned), "variant": variant if isinstance(variant, str) else None}, sort_keys=True, separators=(",", ":"))


if __name__ == "__main__" and len(sys.argv) == 4 and sys.argv[1] == "--oracle" and sys.argv[2] == "O-CONTRACT":
    sys.stdout.write(contract_oracle_answer(pathlib.Path(sys.argv[3]).read_bytes(), json.loads((HERE / "obligations.json").read_text())) + "\n")
    sys.exit(0)
STATUS = "CANDIDATE-1.0.0: retargeted to Sam's re-scope (SCOPE.md, NORTH-STAR.md, TARGETS.md); freezes as 1.0.0 after orchestrator acceptance and adversarial review"
DATE = "2026-11-07"

LANES = ["xtdb-xtql", "xtdb-sql", "qlever-sparql"]
ALL = LANES
X = ["xtdb-xtql", "xtdb-sql"]
Q = ["qlever-sparql"]
ENGINE_OF = {"xtdb-xtql": "xtdb", "xtdb-sql": "xtdb", "qlever-sparql": "qlever"}
LANG_OF = {"xtdb-xtql": "xtql", "xtdb-sql": "sql", "qlever-sparql": "sparql"}

SECTIONS = [
    ("G1", "Goal 1. Exact value kinds, schemas, cardinality, uniqueness, references"),
    ("G2", "Goal 2. Expressions, arithmetic boundaries, specified error semantics"),
    ("G3", "Goal 3. Useful plans, costing, preconstruction admission, recursion"),
    ("G4", "Goal 4. Completed absence and negation at coherent cuts"),
    ("G5", "Goal 5. Full-support aggregates, typed groups, empties, no silent overflow"),
    ("G6", "Goal 6. Cancellation, deadlines, resource ownership, cleanup"),
    ("G7", "Goal 7. Atomic writes, receipts, migration and evolution, recovery"),
    ("G8", "Goal 8. Bounded reuse, transactional publication, maintained supports"),
    ("G9", "Goal 9. Bitemporal intervals, presence, corrections, lineage, deletion, cascades"),
    ("G10", "Goal 10. Public TypeScript and schema integration, scope, cursors, lifecycle, capabilities, consumers"),
    ("R", "R. Entity API (the ORM) and raw queries make sense"),
    ("NS", "NS. North star: Sam's five priorities P1 to P5 on the fixed writer trace"),
    ("GS", "GS. The 20 real-world golden scenarios"),
    ("S", "S. Year-one measurement population, rungs and budgets"),
]


def sha_file(rel):
    p = REPO / rel
    if not p.exists():
        return None
    return hashlib.sha256(p.read_bytes()).hexdigest()


def sha_text(t):
    return hashlib.sha256(t.encode()).hexdigest()


SCOPE_SOURCES = ["lab/world/W0/SHA256SUMS", "lab/verify/D01/V-D01e/BRIEF.md", "lab/verify/D01c/BRIEF.md", "lab/oracles/domain/receipts/population-100k.json", "lab/SCOPE.md", "lab/NORTH-STAR.md", "lab/TARGETS.md", "lab/research/SAM-pasted-numbers-2026-11-07.md", "lab/acceptance/RULINGS.md", "lab/acceptance/RULINGS-PENDING.md", "lab/verify/O02/v-o03/pin_scope.json", "lab/verify/O02/v-o03/hashes.8cc2c26.json", "lab/verify/D01/W0-1.1.1-ada2e90-SHA256SUMS", "lab/verify/O02/v-o04b/results/hashes.a9c1327.json", "lab/verify/O02/BRIEF.md", "lab/verify/D01/BRIEF.md"]

# ============================================================================ rulings (compiled)
# Each ruling is compiled into the data below; ruling_checks() verifies each one is reflected.
RULINGS = [
    {"id": "RESCOPE", "topic": "Sam's re-scope (SCOPE.md, NORTH-STAR.md, TARGETS.md)",
     "ruling": "The ten goals stay on both lanes. Performance is measured as Sam's five priorities P1 to P5 on the fixed writer trace, with provisional bars that calibration may tighten and only Sam may loosen; the 20 golden scenarios are part of done; Sam's must-haves are requirements per engine (native or documented workaround with its own passing tests), never knockout gates; year-one size (10m entities, 100m active facts, retained history) is the measurement size, not a target in itself.",
     "compiledInto": ["NS.*", "GS.*", "REQ.*", "S.*", "load-contract.json", "budgets.json", "THRESHOLDS (NS-*)"]},
    {"id": "NUMERIC", "topic": "no silent precision loss (Sam's corrected numeric rule)",
     "ruling": "Exact storage and round trip for every value kind in use; order-preserving comparison for any attribute used in a range rule; a hard error, never silent conversion, for any value the engine cannot hold; integer range of at least 2^53; arithmetic over many rows only where a projection needs it. Arithmetic runs in the TypeScript kernel per subject; money is a scaled integer or an order-preserving decimal string; never floats for business values. The full signed 64-bit range is not required.",
     "compiledInto": ["VALUE_KINDS", "G1.types.*", "G1.types.decimal", "G1.types.out-of-range-rejected", "G2.arith.*", "G5.agg.*", "MATRIX_ROWS", "REQ.no-silent-precision-loss"]},
    {"id": "Q1", "topic": "unrestricted raw exactness",
     "ruling": "Not required for done. Required: (a) repository and every supported native fragment exact over the value domain each lane accepts; (b) the raw dataset exact on its documented exact channels; (c) raw natively typed shapes outside exact ranges are per-cell KNOWN-LIMIT exceptions, each with an exact mapped recipe, the obligation that qualifies it, and the original raw failure kept as a diagnostic with its unchanged expected answer. QLever integers beyond +/-2^59 are rejected at write instead of being an exception. Supported fragments have a fixed minimum coverage set.",
     "compiledInto": ["MATRIX_ROWS", "RAW_EXCEPTIONS", "DIAGNOSTICS", "FRAGMENT_COVERAGE", "R.raw.mapped-recipes", "R.raw.parity", "R.raw.capability-matrix", "G10.capabilities.truthful"]},
    {"id": "Q2", "status": "SUPERSEDED", "topic": "generic load bar", "ruling": "Superseded by RESCOPE: performance is measured as NS.P1 to NS.P5 and the GS scenarios.", "compiledInto": []},
    {"id": "Q3", "topic": "host post-processing",
     "ruling": "Kept as a declared step that reads no data, counted inside the task's measured call.",
     "compiledInto": ["LANGUAGE_RULES", "PKT.full142"]},
    {"id": "Q4", "status": "SUPERSEDED", "topic": "sparse profile load", "ruling": "Superseded by RESCOPE and Q17.", "compiledInto": []},
    {"id": "Q5", "topic": "guide-only raw authoring",
     "ruling": "A fresh agent given only the raw-query guide and the engine's public docs authors the raw query set; answers must match the repository at the same basis.",
     "compiledInto": ["R.raw.guide-only-authoring", "CR-PROVENANCE"]},
    {"id": "Q6", "topic": "proof lineage",
     "ruling": "Assertion-level provenance: every answer row that claims a fact names its supporting assertion ids and transactions.",
     "compiledInto": ["G9.lineage.supporting-assertions"]},
    {"id": "Q7", "topic": "CLI",
     "ruling": "Not required for done. The packaged SDK consumer is required.",
     "compiledInto": ["G10.pkg.clean-consumer-slice", "ENTRYPOINTS (no CLI entrypoint)"]},
    {"id": "Q8a", "topic": "engine-side integer sums",
     "ruling": "Worded per Q20. Where a projection needs an engine-side sum: exact total; typed integer-overflow only when the final result is outside the engine's exact integer range; intermediate partial sums never wrap. Per-subject sums run in the kernel (BigInt).",
     "compiledInto": ["AGGREGATE_RULES", "G5.agg.projection-sums", "CS-NUMERIC"]},
    {"id": "Q8b", "topic": "AVG over integers",
     "ruling": "Worded per Q20. AVG over integers is a typed preflight error unless the query converts explicitly; with explicit conversion to binary64, binary64 of the exact sum divided by the count, rounded once.",
     "compiledInto": ["AGGREGATE_RULES", "ERROR_TABLE"]},
    {"id": "Q8c", "topic": "division by zero",
     "ruling": "Typed error; no NaN or Infinity results.",
     "compiledInto": ["NUMERIC_OPS", "ERROR_TABLE"]},
    {"id": "Q8d", "topic": "integer vs binary64",
     "ruling": "Follow core comparison semantics; where core is silent, different type families are not equal and do not share a group.",
     "compiledInto": ["COMPARISON_RULES"]},
    {"id": "Q8e", "topic": "equal-valued card-one duplicates",
     "ruling": "Not a conflict: one value, several supports (PLAN C5.1).",
     "compiledInto": ["G4.neg.conflict-semantics", "CS-CONFLICT C5-EQ-DUP"]},
    {"id": "Q8f", "topic": "card-many order",
     "ruling": "Set semantics, duplicates collapsed, canonical value order (codepoint for text, numeric for numbers, then type family).",
     "compiledInto": ["CARD_MANY_ORDER"]},
    {"id": "Q9", "topic": "presence, deletion, cascade",
     "ruling": "Policy draft EXP-P01, provisional orchestrator ruling, flagged to Sam; the three G9 obligations stay policy-pending until then.",
     "compiledInto": ["G9.presence.explicit", "G9.deletion.entity", "G9.cascade.restrict-detach-cascade"]},
    {"id": "Q10", "topic": "verifier coverage",
     "ruling": "The verifier covers every claimed obligation; at the year-one population and under the north-star workload it independently re-evaluates retained answer bytes, fault outcomes and coverage for every ladder level, scenario and rung, plus at least one spot rerun per profile unit.",
     "compiledInto": ["VERIFIER_MODES", "VALIDITY VV"]},
    {"id": "Q11", "status": "SUPERSEDED", "topic": "per-language measurement", "ruling": "Superseded by RESCOPE; its principle survives: read priorities P1, P4 and P5 are measured separately per surface (XTQL, SQL, SPARQL).", "compiledInto": ["NS.P1", "NS.P4", "NS.P5"]},
    {"id": "Q12", "topic": "conflict semantics",
     "ruling": "Aligned with PLAN C5: repository and fragments fail with ConflictingValuesError; the raw convenience shape is documented as non-equivalent; the canonical conflict-aware relation is values(attribute).",
     "compiledInto": ["G4.neg.conflict-semantics"]},
    {"id": "Q13", "topic": "XTDB engine-side integer SUM recipe",
     "ruling": "Refined by Q19. Where a projection needs an engine-side sum on XTDB, the recipe is SUM(CAST(x AS DECIMAL(32,0))) (R14 measured it exact and free on 2.2.0) once EXP-X02 confirms it; the split-sum (32-bit halves recombined with overflow-checked arithmetic, verified in R12) is the fallback. Whichever recipe is used must pass the same G5.agg.projection-sums cases.",
     "compiledInto": ["G5.agg.projection-sums", "DIAGNOSTICS D-X-SUM"]},
    {"id": "Q14a", "topic": "card-many family order", "ruling": "boolean < integer < number < decimal < datetime < string < ref < json < blob, then by value inside a family (decimal placed by Q18).", "compiledInto": ["CARD_MANY_ORDER"]},
    {"id": "Q14b", "topic": "-0.0 and +0.0", "ruling": "One value for identity, grouping and set membership (core CanonicalJson normalizes -0); when supports differ only in representation, the returned representation is the one from the support with the lowest (recordedPosition, operation index) (amended by RULINGS Q21 AMB-08; assertion ids are generated per lane and are never used); single-assertion reads return the stored representation.", "compiledInto": ["COMPARISON_RULES CMP-NEGZERO"]},
    {"id": "Q14c", "topic": "binary64 SUM", "ruling": "Correctly rounded exact total on repository and supported-fragment surfaces where offered; a differing native SUM is a raw KNOWN-LIMIT with a mapped recipe.", "compiledInto": ["AGGREGATE_RULES AG-SUM-F"]},
    {"id": "Q14d", "topic": "ordered comparison integer vs number", "ruling": "Typed preflight error.", "compiledInto": ["COMPARISON_RULES CMP-INT-FLOAT"]},
    {"id": "Q15", "topic": "error tags and reasons", "ruling": "Accepted as drafted; the contract verifier checks each tag against packages/core/src/errors and Error.ts before 1.0.0.", "compiledInto": ["ERROR_TABLE"]},
    {"id": "Q16", "topic": "derived thresholds, read basis mix, run timing, budgets",
     "ruling": "History flatness 1.1 stands. Reader basis mix: 80% at the latest committed tx (named exactly), 15% at a tx within the last hour, 5% at a past basis up to 90 days back (TARGETS section 2). Acceptance runs use 120 s warmup and 600 s per ladder level; a screening profile (30 s warmup, 120 s per level) is allowed for candidate comparison and can never close an obligation. Budget allowances (write bytes 4.0x, ingest 0.5x, memory 1.5x, disk 2.0x of the A0 control at the same rung) are provisional and are re-frozen after EXP-N02 measures the A0 controls, before any candidate is compared.",
     "compiledInto": ["THRESHOLDS NS-P4-HISTORY-FLATNESS", "load-contract.json basisMix and windows", "PROFILES P-SCREEN", "budgets.json"]},
    {"id": "Q17", "topic": "sparse profile", "ruling": "Dropped; scenario GS.15 (one large tenant and 1,000 small ones) covers population skew.", "compiledInto": ["GS.15", "SCALE_POPULATION"]},
    {"id": "Q18", "topic": "decimal value kind",
     "ruling": "Amended by Q35b: a decimal attribute declares precision and scale and has one stored representation on both lanes, the TDK1 key (channel decimal_order_v1, value-determined, order-preserving) plus derived canonical text at the declared scale. A value with more fractional digits than the scale, or outside the precision, is rejected with a typed error, never rounded. Decimal is its own family, ordered between number and datetime; comparison between decimal and integer or number is a typed preflight error unless the query converts explicitly; arithmetic runs in the TypeScript kernel with exact decimal arithmetic.",
     "compiledInto": ["VALUE_KINDS decimal", "DECIMAL_RULES", "CARD_MANY_ORDER", "COMPARISON_RULES CMP-DECIMAL-CROSS", "G1.types.decimal", "CS-DECIMAL"]},
    {"id": "Q19", "topic": "engine-side exact sums",
     "ruling": "Needed only where a projection sums many rows. EXP-X02 confirms the XTDB recipe (R14 measured SUM(CAST(x AS DECIMAL(32,0))) exact and free on 2.2.0; the split-sum is the fallback); EXP-F02 cross-checks.",
     "compiledInto": ["G5.agg.projection-sums", "Q13", "DIAGNOSTICS D-X-SUM"]},
    {"id": "Q20", "topic": "Q8a and Q8b wording", "ruling": "Q8a and Q8b read integer, not int64: exact totals with a typed error only when the final result is outside the engine's exact range; engine-side sums only where a projection needs them; per-subject sums run in the kernel (BigInt); AVG over integers keeps Q8b's preflight rule.", "compiledInto": ["Q8a", "Q8b", "AGGREGATE_RULES"]},
    {"id": "Q21", "topic": "G01 golden-vector ambiguities (AMB-01 to AMB-17)", "provisional": True, "flaggedForSam": ["AMB-04", "AMB-09", "AMB-17"],
     "ruling": "All 17 verifier proposals accepted (AMB_RULINGS). Each AMBIGUOUS golden-vector query is evaluated with the reading in GOLDEN_RESOLUTIONS. Section 4 amendments: CMP-NEGZERO uses the lowest (recordedPosition, operation index) representative (AMB-08); G5.agg.full-support reads 'equal values on distinct entities' (AMB-09); an empty valid interval is E-INVALID-VALUE (AMB-12); integer range predicates are required in Repository.find (AMB-16); find fails with ConflictingValuesError unless the conflicted attribute is projected out (AMB-17). AMB-04, AMB-09 and AMB-17 are provisional product rulings flagged for Sam.",
     "compiledInto": ["AMB_RULINGS", "GOLDEN_RESOLUTIONS", "CMP-NEGZERO", "AG-SUM-ONE-ENTITY", "AG-INT-RESULT", "AG-AVG-CONV", "TEMPORAL_RULES", "READ_SHAPE_RULES", "JOURNAL_RULES", "G4.neg.conflict-semantics", "G5.agg.full-support", "G7.journal.logical-contract", "G9.temporal.half-open-intervals", "G9.history.*", "R.repo.entity-suite"]},
    {"id": "Q22", "topic": "decimal operations, conversions and errors",
     "ruling": "Result precision and scale per operator (add and subtract: scale max(s1, s2), precision max(p1 - s1, p2 - s2) + scale + 1; multiply: scale s1 + s2, precision p1 + p2; overflow beyond the target precision or 38 digits is typed); division only as divide(a, b, scale, rounding) with half-even, half-up or down, bare / is a preflight error; explicit conversions only; widening is metadata, narrowing is an atomic migration that fails if any value would lose digits; every decimal versus integer or number comparison, equality included, is a preflight error; original typed input captured before normalization; named cases for every table row and the listed test classes.",
     "compiledInto": ["DECIMAL_OPS", "DECIMAL_CONVERSIONS", "DECIMAL_SCALE_EVOLUTION", "DECIMAL_TESTS", "CMP-DECIMAL-CROSS", "ERROR_TABLE (E-DECIMAL-*)", "CS-DECIMAL", "G1.types.decimal", "M-DECIMAL-PRECAPTURE-ROUND"]},
    {"id": "Q23", "topic": "qualified write routes",
     "ruling": "The rejection requirement applies to qualified write routes (the Triplex writer, bulk import, replay and restore), each atomic before any mutation. Bare native wire access is a diagnostic surface; QLever's native integer wrap there is a KNOWN-LIMIT row (matrix row 51). G1.types.out-of-range-rejected drops EP-RAW-WIRE and adds EP-BULK and EP-REPLAY.",
     "compiledInto": ["G1.types.out-of-range-rejected", "CS-RANGE-OUT", "EP-REPLAY", "MATRIX_ROWS 51", "KL-Q1"]},
    {"id": "Q24", "topic": "erasure", "provisional": True, "flaggedForSam": ["explain at a pre-erasure basis shows the marker, not the value"],
     "ruling": "TARGETS section 7: the boundary is the erasure commit's publication; reads starting after it return ErasedValue {erasedAt} at every basis; reproduction contracts hold modulo erasure; each lane keeps a protected-copy inventory; derived channels are erased or encrypted with the value; restore and rebuild replay the erasure ledger. Provisional product ruling, flagged for Sam.",
     "compiledInto": ["ERASURE", "PROTECTED_COPY_INVENTORY", "CS-ERASURE", "G9.erasure.*", "G10.cursor.stable", "NS.SEC.retro-and-audit", "GS.12", "GS.16", "M-ERASURE-LEAK"]},
    {"id": "Q25", "topic": "non-priority performance bars",
     "ruling": "The general recursion 1 s bar, the 1.1x growth bar from 1m to 10m for selective queries and the 2x deep-page bar become reported secondary measurements with no authority to block done; bounded execution stays a goal-6 correctness obligation.",
     "compiledInto": ["T-RECURSION-P99-MS", "T-LAT-RATIO-10M-1M", "T-DEEP-PAGE-RATIO", "SECONDARY_RULE", "G3.recursion.scalable", "G3.plan.access-path-at-scale", "G10.cursor.deep-page-cost"]},
    {"id": "Q26", "topic": "closure rules",
     "ruling": "CR-CALIBRATION requires a record for every threshold an NS obligation names and fails closed on an empty set; NS and GS use an explicit single-execution mode; GS.01 selects only its own scenario; each GS obligation binds its own scenario's evidence and bars; the evaluator ships counterexamples proving incomplete receipts cannot close.",
     "compiledInto": ["CR-CALIBRATION", "NS.calibration params.requiredThresholds", "MODE_RULE", "CR-GS", "EVALUATOR_COUNTEREXAMPLES", "CS-EVAL-COUNTER", "R.evaluator.incomplete-receipts"]},
    {"id": "Q27", "topic": "history flatness statistic", "ruling": "p99 (not p50), on the matched 1,000-subject sample of TARGETS 1.1 P4 item 2.", "compiledInto": ["NS-P4-HISTORY-FLATNESS", "load-contract.json P4 history", "NS.P4"]},
    {"id": "Q28", "topic": "composition identity",
     "ruling": "TARGETS 4.1: four assignments (source, current, history, analytics); receipts bind every component, replication edge and each index's watermark at read time; scope keys derive from the assignment, not engineOfLane. Its routing clause is refined by Q31d (eligibility, 10 ms) and its ACK clause is replaced by Q31e.",
     "compiledInto": ["COMPOSITION", "RECEIPT_SCHEMA", "VA14", "STATUS_ALGORITHM", "obligation layer", "G8.composition.watermark-routing", "G10.composition.identity-bound"]},
    {"id": "Q29", "topic": "contract 0.3.2 questions (Q29a to Q29e)",
     "ruling": "Q29a: the golden JSON files stay unchanged as the audit record; the contract records the selected reading per AMBIGUOUS query and pins each file's hash. Q29b: the evaluator derives Q8F-05's representative sign from fixture order by the lowest (recordedPosition, op index); O-REPLAY computes it independently after EXP-O02 and the two must agree. Q29c: single-execution is the default mode for every obligation that declares none. Q29d (provisional): engine-scoped obligations key on the layer their goal names; the E-DECIMAL-* error names; 38 digits for round() and decimal SUM results; the Q15 verifier checks error tags before 1.0.0 (its T-WATERMARK-WAIT-MS = 250 is superseded by Q31d's 10). Q29e: the three erasure obligations run on the tiny concurrent profile; GS.16 covers erasure at year-one size.",
     "compiledInto": ["GOLDEN_RULE", "goldenFilesPinned", "GOLDEN_RESOLUTIONS Q8F-05", "MODE_RULE", "LAYER_BY_GOAL", "ERROR_TABLE (E-DECIMAL-*)", "DECIMAL_OPS", "G9.erasure.* profiles", "GS.16"]},
    {"id": "Q30", "topic": "EXP-F02 wire exactness (Q30a to Q30e; compiled by Q32a)",
     "ruling": "Q30a JSON values with -0, non-finite or inexact numbers rejected at every qualified route before CanonicalJson (InvalidTripleError invalid-value, detail inexact-json-number), approximateNumbers reject recursive in List and Struct. Q30b instant -0 rejected (NoNegativeZero). Q30c XTDB pinned encodings: card-many DOUBLE and integer lists as ARRAY[CAST(? AS type) ...], date and instant read as text; any other encoding fails the projection check. Q30d QLever numeric shadow exact only if not -0 and its %.13g rendering parses back to the same bits, integers within +/-2^59; else the lexical channel is authoritative. Q30e the integer range rule narrowed to its safe-integer domain.",
     "compiledInto": ["WIRE_RULES", "E-INEXACT-JSON-NUMBER", "E-NEGATIVE-ZERO-INSTANT", "CS-WIRE", "G1.wire.write-guards", "G1.wire.xtdb-encodings", "G1.wire.qlever-shadow", "M-JSON-NEGZERO-NORMALIZE", "M-X-JSON-LIST-PARAM", "M-Q-SHADOW-EXACT-FLAG"]},
    {"id": "Q31", "topic": "Codex plan-v2 round 2 (Q31a to Q31k)",
     "ruling": "Q31a NS.P2 progress (every oracle-valid trace command publishes; queue and drain bounds). Q31b split reads straddle existing trace commands; no driver writes. Q31c (stream, epoch, offset, ordinal) coordinates, fully resolved prefix watermarks, aborted-offset accounting, O-REPLAY totally ordered coordinates, four falsifiers before comparative claims. Q31d eligibility (watermark, C1, reconstructability, erasure frontier), 10 ms wait, deadline-aware fallback with counted latency and recorded language. Q31e ACK after source publication with routed read-your-own-write; GS.04b keeps commits and ACKs during the outage and measures fallback share and recovery. Q31f erasure frontier, cache invalidation, modulo erasure for C6, raw and native, SDK, cursors and explain, key exclusivity. Q31g decimal widening only metadata when integer digits and order keys are preserved. Q31h GS.19 zero duplicate externally visible effects. Q31i W0 coverage floors and the V-D01 review gate. Q31j lane-specific outcomes for legacy signed-64 vectors. Q31k positive evaluator fixtures.",
     "compiledInto": ["NS.P2", "NS.P1", "load-contract.json", "POSITION", "GATES", "CS-POSITION", "G7.position.coordinates", "COMPOSITION", "T-WATERMARK-WAIT-MS", "G8.composition.watermark-routing", "G7.composition.ack-and-routed-ryow", "GS.04", "ERASURE", "G9.erasure.*", "G7.journal.logical-contract", "R.raw.parity", "DS-WIDEN", "DS-WIDEN-MIGRATE", "GS.19", "W0-* thresholds", "W0_PIN", "W0.coverage-floors", "CR-W0-COVERAGE", "LEGACY_LANE_OUTCOMES", "EVALUATOR_POSITIVE_FIXTURES", "R.evaluator.incomplete-receipts"]},
    {"id": "Q32", "topic": "contract 0.3.3 questions (Q32a to Q32f)",
     "ruling": "Q32a compile Q30 now. Q32b a vector with all values in one command is a rejection test on QLever; in-range companion vectors by an independent golden author follow as EXP-G02. Q32c 0.1% of trace commands are deliberately invalid and marked. Q32d queue depth in seconds = queued commands / steady offered rate; drain runs until back within 2 s. Q32e the four position falsifiers gate a composition only when its positions are non-dense; dense compositions (the A0 controls) close G7.position.coordinates with the nested-cut cases. Q32f the W0 pin stays null until V-D01 reviews W0; pinning needs a version bump.",
     "compiledInto": ["Q30", "LEGACY_RULE", "CHANGELOG_033 (EXP-G02)", "WRITER_TRACE generator invalidCommands", "NS-P2-QUEUE-MAX-S", "NS-P2-BURST-DRAIN-S", "position_selection", "position_gate_blocks", "A0_CONTROLS", "GATE-POSITION", "W0_PIN"]},
    {"id": "Q33", "topic": "EXP-O02 RULING-NEEDED items (Q33a to Q33i)",
     "ruling": "Q33a a JSON number is accepted only if it reads back as written (refines Q30a). Q33b decimal R-DEC-0, 1, 2, 3, 5, 6, 7. Q33c retract-pattern out of range is E-VALUE-OUT-OF-RANGE. Q33d every ordered comparison across families is E-MIXED-FAMILY; cross-family equality false except decimal. Q33e non-numeric operands and aggregates are E-MIXED-FAMILY; rem integer-only. Q33f unmapped operation faults are E-INVALID-VALUE; retract-pattern on a transaction entity is E-RESERVED. Q33g journal envelope, X-NOT-MODELED, transactions limit malformed. Q33h invalid basis E-INVALID-VALUE; entityPage limit malformed; a cursor continued with another basis is other-query. Q33i the oracle's readings for G10-CUR-01 E1/E2 and the QLever lane outcomes, cross-checked against Q31j.",
     "compiledInto": ["Q33_RULES", "WR-JSON", "DECIMAL_RULES", "CMP-CROSS-FAMILY-ORDERED", "CS-ERRORS", "CS-JOURNAL", "CS-CURSOR", "CS-RANGE-OUT", "Q33I_CURSOR_READINGS", "Q33I_QLEVER_REJECTED", "LEGACY_LANE_OUTCOMES"]},
    {"id": "Q34", "topic": "Codex plan-v2 round 3 (Q34a to Q34e)",
     "ruling": "Q34a density is proven by an allowlist of A0 allocator source hashes checked against the receipt's bound source; positionsDense has no authority; conditional selection authoritative; forged-density fixture. Q34b outage read-your-own-write on every serving surface, native included; stale-fallback rejection; cross-language recipes bound to one semantic query identity and one oracle answer. Q34c the Q30a guard validates user JSON only; generated journal JSON is exempt; lossless typed journal; paired test. Q34d prerequisites checked at admission of every comparative or promotion claim, screening included; failed or pending means diagnostic. Q34e two regenerations are byte-identical.",
     "compiledInto": ["A0_ALLOCATOR_ALLOWLIST", "ALLOCATOR_EXTRACTION_RULE", "density_proven", "position_selection", "FORGED_DENSITY_FIXTURE", "G7.position.coordinates", "COMPOSITION fallbackEquivalence", "G7.composition.ack-and-routed-ryow", "WR-JSON", "G1.wire.write-guards", "G7.journal.logical-contract", "CLAIM_ADMISSION", "admit_claim", "main --verify"]},
    {"id": "Q35", "topic": "R20 order-preserving decimal encodings (Q35a to Q35e)",
     "ruling": "Q35a the decimal order key is TDK1 (value-determined, order-preserving). Q35b one stored representation on both lanes (TDK1 key plus derived canonical text), amending Q18; widening that admits every value is metadata-only. Q35c channel decimal_order_v1. Q35d keys never concatenated nor used for prefix queries. Q35e error names E-DECIMAL-OVERFLOW, E-DECIMAL-FRACTION, E-DECIMAL-NARROWING, E-DECIMAL-BARE-DIVIDE (the earlier unrepresentable error is retired); precision 38; -0.00 refused; no native XTDB DECIMAL lane; signed-zero rounding tests if decimal.js or big.js is used.",
     "compiledInto": ["TDK1", "tdk1_encode", "DECIMAL_RULES", "VALUE_KINDS decimal", "DS-WIDEN", "ERROR_TABLE", "TDK1_TESTS", "CS-TDK1", "G1.decimal.tdk1-*", "O-TDK1", "TDK1_VECTOR_PIN", "GATE-TDK1-VECTORS"]},
    {"id": "Q36", "topic": "W0 questions from EXP-D01a (Q36a to Q36h)",
     "ruling": "Contract impact only of Q36a (work item id over (subject, rule, kind, key); content version over (release hash, input positions, payload); outbox delivery key (id, version); early cutoff: an unchanged payload publishes nothing), Q36e (expected affected set = subjects whose static read set contains a changed fact) and Q36g/h (location fanout Zipf s = 0.5 over 2,000 locations at 100k; other rungs N / 50 with the same s). Q36b, c, d and f have no contract impact.",
     "compiledInto": ["WORLD_W0 workItemIdentity", "WORLD_W0 affectedSet", "WORLD_W0 fanout", "W0-LOCATION-ZIPF-S", "GS.19", "GS-19B-OUTBOX-CRASH", "NS.P5", "NS.P3", "load-contract.json P3 and P5"]},
    {"id": "Q37", "topic": "contract 0.3.4 questions (Q37a to Q37d)",
     "ruling": "Q37a accepted the five-block allowlist scope, then superseded by Q38a (no allowlist). Q37b every obligation O-REPLAY would close fails closed until the oracle is accepted after EXP-O03 and pinned; A0 measurements produce diagnostics, never closures. Q37c O-TDK1's reference and vectors live in lab/oracles/decimal/ and are pinned (hashes as revised by Q38e). Q37d E-DECIMAL-FRACTION covers excess fraction digits at write and decimal-to-integer with a nonzero fraction.",
     "compiledInto": ["GATE-ORACLE-PIN", "CLAIM_ADMISSION", "ORACLE_PINS O-TDK1", "O_TDK1_FILES", "TDK1_VECTOR_PIN", "E-DECIMAL-FRACTION"]},
    {"id": "Q38", "topic": "Codex plan-v2 round 4 (Q38a to Q38f)",
     "ruling": "Q38a no density exemption: every composition, A0 included, runs the four falsifiers; the allowlist is removed and an outside-block mutation fixture kept. Q38b admit_claim derives every prerequisite from validated, source-bound receipts and enforces Q37b. Q38c every RULINGS change is compiled and verified; uncompiled entries are listed as recorded-not-compiled. Q38d decimal channel routing on repository, native and raw surfaces, derived expressions and aggregates; JSON opaque unless converted; SUM decodes, computes, encodes; key arithmetic invalid. Q38e O-TDK1 BUILT with pinned files; the vector pin null until independent review. Q38f outbox delivery identity (id, publication sequence) with durable atomic publication state and crash replay.",
     "compiledInto": ["OUTSIDE_BLOCK_MUTATION_FIXTURE", "POSITION_REQUIRED_CASES", "G7.position.coordinates", "M-WITHTRANSACTION-REBIND", "admit_claim", "receipt_valid", "CLAIM_ADMISSION", "RULINGS_COVERAGE", "DECIMAL_ROUTING", "G1.decimal.channel-routing", "M-DECIMAL-LEXICAL-ORDER", "O-TDK1", "OUTBOX", "G7.outbox.publication-sequence", "M-OUTBOX-VERSION-DEDUP", "GS.10", "GS.11", "GS.19", "NS.P5", "load-contract.json P5"]},
    {"id": "Q39", "topic": "EXP-X02 (Q39a, Q39b)",
     "ruling": "Q39a an XTDB engine-side exact sum uses SUM(CAST(x AS DECIMAL(32,0))) read as text, never cast back to BIGINT or a numeric client type (XTDB 2.2.0 rounds through a double); on the XTDB hazard list. Q39b every XTDB receipt records TRIPLEX_XTDB_NATIVE_LANGUAGE; XTQL and SQL results never share an obligation closure.",
     "compiledInto": ["KL-X9", "G5.agg.projection-sums", "M-X-DECIMAL-SUM-BIGINT", "RECEIPT_SCHEMA nativeLanguage", "LANGUAGE_RULES xtdbNativeLanguage", "STATUS_ALGORITHM", "keyByNativeLanguage"]},
    {"id": "Q40", "topic": "V-D01 W0 review (Q40a to Q40i)",
     "ruling": "W0-1.1.x: ballast sizes worlds from P4's buckets (a); two-hop wage floor (b); outbox per Q38f with a pure publish operation and the rollback, correction-revert, crash and unchanged-activation cases (c); per-subject basis-ordered publication (d); V-D01's must-add and should-add cases (e); 1-based dense position ordinal (f); named draw fields and the fingerprint pin (g); retirement and new-sequence reappearance (h); a narrow release R3 (i, scoped by Q44b).",
     "compiledInto": ["WORLD_W0", "OUTBOX", "CS-OUTBOX", "G7.outbox.publication-sequence", "CS-W0-COVERAGE", "W0.coverage-floors", "W0_PIN"]},
    {"id": "Q41", "topic": "contract 0.3.5 questions (Q41a to Q41e)",
     "ruling": "Q41a Q40 compiled in 0.3.6. Q41b Q37c's tdk1_reference.py hash 923f7577... is superseded; the pinned hash is 73467589...bf33. Q41c the 19 engine-scope XTDB native or raw obligations are keyed by native language. Q41d admit_claim is a reference model; lab/bin implements it as a minimum and adds the full VA rules. Q41e TDK1 and decimal-routing obligations fail closed until O-TDK1's acceptance and the V5 pin are set.",
     "compiledInto": ["Q40", "O_TDK1_FILES", "keyByNativeLanguage", "CLAIM_ADMISSION", "ORACLE_PINS O-TDK1", "TDK1_VECTOR_PIN"]},
    {"id": "Q42", "topic": "Codex plan-v2 round 5 (Q42a to Q42c)",
     "ruling": "Q42a evidence-backed admission: objects opened and hashed, build/import manifest binding, freshness, modes, fault repetitions and verifier evidence, the claim's own measurement receipts with a matched control, unknown ids rejected; counterexample fixtures. Q42b receivers apply deliveries by publication sequence, never regress, recover gaps, persist dedup atomically; W0's receive operation. Q42c per subject one atomic unit (basis guard, retirement, sequence, latest payload, outbox records) with crash cases between every pair.",
     "compiledInto": ["evidence_ok", "admit_claim", "CLAIM_ADMISSION", "CX-ZERO-OBJECT-HASHES", "CX-STALE-BINARY", "CX-EARLIER-COMMIT-FALSIFIER", "CX-NO-MEASUREMENT", "CX-UNKNOWN-OBLIGATION", "OUTBOX receivers", "G7.outbox.receiver-ordering", "OUTBOX atomicUnit", "G7.outbox.atomic-unit"]},
    {"id": "Q43", "topic": "EXP-O03 decisions (Q43a to Q43h, Q43f-detail)",
     "ruling": "Decimal error ids E-DECIMAL-OVERFLOW and E-DECIMAL-FRACTION (a); AVG over decimals E-DECIMAL-AVG (b); undeclared literal scale and precision (c); rounding modes (d); 38-digit expression limit (e); round to a larger scale exact, precision p + (s - s_x) capped at 38 (f, f-detail); toInteger overflow E-INTEGER-OVERFLOW (g); a -0 read basis E-NEGATIVE-ZERO-INSTANT (h).",
     "compiledInto": ["Q43_RULES", "DO-ROUND", "DC-D2I", "CS-DECIMAL", "CS-ERRORS"]},
    {"id": "Q44", "topic": "W0-1.1.0 re-review (Q44a to Q44d)",
     "ruling": "Q44a the reviewer's fixes (raw token checks, delivery id and version recomputation, the 1, 1, 3, 3, 2 receive case, the fingerprint recipe, K = 4 x ceil(L / 80), worlds up to 2 facts below their bucket, shape validation). Q44b R3 scoped by jurisdiction set through the reverse two-hop index. Q44c only live reconciles at the current basis are published. Q44d receivers exist from the first publication or are seeded with a snapshot.",
     "compiledInto": ["WORLD_W0", "OUTBOX liveOnly", "OUTBOX receivers", "RX-DEDUP-1-1-3-3-2", "RX-LATE-START", "OB-PREVIEW-NOT-PUBLISHED", "W0_PIN"]},
    {"id": "Q45", "topic": "O-REPLAY pin and V-O03 findings (Q45a to Q45e)",
     "ruling": "Q45a O-REPLAY ACCEPTED at 8cc2c26 with 29 pinned hashes and acceptance receipt V-O03; per-oracle excludes (G1.decimal.channel-routing). Q45b an exit 2 with X-NOT-MODELED fails the obligation closed, never a case-authoring error; erasure cases spell erase; outbox steps are never O-REPLAY ops. Q45c the three key-byte cases move to the O-TDK1 obligations. Q45d DO-ROUND precision for a larger scale. Q45e follow-up EXP-O04 (F2 and erasure modeling), then an independent re-check before the pin moves.",
     "compiledInto": ["O_REPLAY_FILES", "ORACLE_PINS O-REPLAY", "oracle_scope", "ORACLE_REFUSALS", "ORACLE_REFUSAL_RULE", "PIN_SCOPE_EXPECTED_DIFF", "TDK1_KEY_BYTE_CASES", "DO-ROUND", "CX-REFUSAL-AS-AUTHORING"]},
    {"id": "Q46", "topic": "Contract 0.3.6 questions (Q46a to Q46d)",
     "ruling": "Q46a Q42c's crash cases cover all 10 pairs of the five transitions. Q46b once EXP-N01/N02 measures A0 at the budget re-freeze, the A0 commit and tree are pinned in the contract and the evaluator takes the control's identity from there, never from the claim. Q46c the W0 pin's file list is adjusted when W0-1.1.1 merges. Q46d when EXP-O04 lands and is re-verified, a new O-REPLAY pin is compiled and the excludes and refusals shrink, with the pin-scope expected differences updated.",
     "compiledInto": ["ATOMIC_UNIT_CASES", "A0_REGISTRY", "W0_PIN files", "ORACLE_PINS O-REPLAY nextPin"]},
    {"id": "Q47", "topic": "Codex plan-v2 round 6 (Q47a to Q47d)",
     "ruling": "Q47a admission validates the complete object graph and every record's schema: executed modules and the binary are retained objects hashing to the manifest, verifier records match their schema, and every case verdict is recomputed from the retained raw result (an oracle exit 2 or X-NOT-MODELED never PASS). Q47b measurement and control carry nonempty, validated workload identity (trace generator hash, seed, offer schedule hash, window, slot), a missing field never matching a missing field; the A0 control's identity comes from the frozen A0 registry, never the claim. Q47c admission re-judges every selected case and rejects any retained refusal; the generator propagates unsupported-rule dependencies through indirect selections, so CS-MIGRATION and CS-WIDEN obligations are blocked while decimal redeclaration is refused. Q47d RULINGS-PENDING.md may hold ruling rows with no authority; they are listed and hashed, never compiled, and never invalidate generation.",
     "compiledInto": ["EVIDENCE_SCHEMAS", "open_record", "case_verdict", "evidence_ok", "WORKLOAD_IDENTITY", "workload_ok", "A0_REGISTRY", "admit_claim", "refused_by", "ORACLE_REFUSALS scale-evolution reachedThrough", "oracle_scope", "PIN_SCOPE_EXPECTED_DIFF", "CX-R6-UNOPENED-MEANING", "CX-R6-UNMATCHED-CONTROL", "CX-R6-INDIRECT-REFUSAL", "pending_ruling_ids", "pendingRulings", "CLAIM_ADMISSION"]},
    {"id": "Q48", "topic": "W0 accepted; V-D01 delta-check notes (Q48a to Q48c)",
     "ruling": "Q48a W0-1.1.1 at ada2e90 is ACCEPTED (V-D01 delta check); the contract pins its 95 file hashes and pins the fingerprint once O-DOMAIN's independent generator reproduces it (Q40g). Q48b the scoped-release P5 measurement runs at the 100k rung, and a scoped sweep's P5 receipt binds the reached-subject list and its hash instead of every placement. Q48c W0-1.1.2 adds an R3 case with a listed jurisdiction that has no facts, the skip-rule wording, and the measured R3 counts (9,497 reached, 418 changed); none changes an output, a case result, a floor or the fingerprint.",
     "compiledInto": ["W0_FILES", "W0_PIN", "W0_FINGERPRINT_CANDIDATE", "GATE-W0", "WORLD_W0 version", "WORLD_W0 nextEdit", "NS.P5", "NS-P5-SCOPED-RELEASE-REACHED", "load-contract P5 scopedRelease"]},
    {"id": "Q49", "topic": "EXP-O04 erasure and decimal questions (Q49a to Q49e)",
     "ruling": "Q49a an erasure commit is an ordinary data-journal transaction with identity-only changes, also written to the separate erasure ledger; earlier :_tx/change facts for erased values show the marker, so ER-JOURNAL-MODULO compares markers on both sides. Q49b the first erasure sets erasedAt, re-erasure changes nothing, an erase matching nothing commits an empty change list. Q49c (provisional, under the Q24 flag for Sam) erased values match no value predicate, value aggregates skip them while COUNT counts them, ORDER BY places them last by assertion id, grouping keys them by the marker, Unique ignores them, an erased reference include returns the marker. Q49d in-flight reads may return the old value or the marker. Q49e a JSON number converts to decimal from its as-written reading (toDecimal(json 0.1, 2, 1) = 0.1); decimal text inside a JSON string is E-INVALID-VALUE unless converted explicitly.",
     "compiledInto": ["ERASURE journalCommit, idempotence, queries, inFlight", "CS-ERASURE", "G9.erasure.commit-semantics", "G9.erasure.query-semantics", "G9.erasure.visibility-boundary", "G9.erasure.reproduction-modulo", "G7.journal.logical-contract", "DR-JSON-CONVERT", "DR-JSON-STRING-TEXT", "R-DEC-6", "G1.decimal.channel-routing"]},
    {"id": "Q50", "topic": "EXP-P2Q questions (Q50a, Q50c to Q50e; Q50b superseded by Q55c)",
     "ruling": "Q50a entity and repository pulls fall back to the broker's own record when the replica is unreachable; a broker-side current-entity index is a candidate current-index layer for P4 (EXP-Q05). Q50b superseded by Q55c. Q50c write amplification on QLever is measured and reduced (folded into EXP-J01 by Q51d). Q50d before promotion a broker composition needs an overlay memory bound with typed Overloaded, segment rotation with checkpoints and a kernel file lock beside the epoch and marker guard. Q50e the exclusive-slot run list joins the QLever exclusive queue first.",
     "compiledInto": ["COMPOSITION readGuarantees repository", "COMPOSITION brokerCurrentIndex", "COMPOSITION brokerPromotion", "G7.broker.promotion-hardening", "GATE-BROKER-HARDENING", "CS-BROKER", "E-OVERLOADED", "load-contract P2 storagePerCommit", "load-contract runQueue"]},
    {"id": "Q51", "topic": "EXP-P2X questions (Q51a, Q51c to Q51f; Q51b stays pending)",
     "ruling": "Q51a a bounded per-subject FIFO queue in the candidate's command router with typed Overloaded and same-subject group commit (up to 8). Q51c positions are bound after the source publishes them and are opaque, totally ordered values, with no ordinal packing limit. Q51d EXP-J01 measures bytes and triples per 10-fact command on both lanes. Q51e the 100k rung waits for EXP-J01 and a disk re-estimate. Q51f engine-side SIGKILL fault points on both lanes; a scope written by both commit paths at once is refused with a typed error; xt.txs and METADATA cost at 1M+ joins EXP-J01.",
     "compiledInto": ["COMPOSITION hotSubjects", "NS-P2-HOT-SUBJECT-QUEUE", "POSITION binding", "G7.position.bound-after-publication", "CS-POSITION", "load-contract P2 storagePerCommit", "load-contract runQueue xtdb100kRung", "FAULT_Q55_CASES", "E-DUAL-COMMIT-PATH"]},
    {"id": "Q52", "topic": "EXP-O04 residual erasure and decimal questions (Q52a to Q52g; provisional, under the Q24 flag)",
     "ruling": "Q52a a distinct count counts an attribute's erased values as one value; a count of assertions counts each. Q52b ORDER BY puts readable values, then erased markers by assertion id, then missing values. Q52c a marker group reports the earliest erasedAt. Q52d an erased reference takes no part in reference constraints. Q52e an erasure commit is atomic for readers (all old values or all markers, never a mix), narrowing Q49d. Q52f toDecimal(json, p, s, rounding) rounds the as-written reading; without rounding, excess digits are E-DECIMAL-FRACTION. Q52g the op is erase; erasure, mixing and preconditions are typed invalid-command errors.",
     "compiledInto": ["ERASURE inFlight, queriesResidual, commandShape", "ERASURE_RESIDUAL_CASES", "DECIMAL_ROUTING_Q52", "G9.erasure.residual-shapes", "ORACLE_REFUSALS q52-shapes", "G9.erasure.visibility-boundary"]},
    {"id": "Q53", "topic": "W0 SPEC-AMBIGUITY readings from EXP-D01c (Q53a, Q53b)",
     "ruling": "Q53a readings A01 to A10 accepted as written; they change no golden case and no fingerprint value. Q53b W0-1.1.2 adds them to SPEC.md with one golden case per reading; every existing case and the fingerprint stay byte-identical (V-D01c checks); until then the W0 pin covers W0-1.1.1 with the readings recorded.",
     "compiledInto": ["WORLD_W0 readings", "WORLD_W0 nextEdit"]},
    {"id": "Q54", "topic": "Contract 0.3.7 questions (Q54a to Q54e)",
     "ruling": "Q54a G7.migration.valid-writes-never-rejected stays blocked by the CS-MIGRATION:* reach. Q54b CS-REQ:no-silent-precision-loss and CS-TYPES8:decimal get no reach. Q54c 0.3.8 compiles Q50 to Q54 and Q52e replaces the inFlight text. Q54d the control's tree and composition come from A0_REGISTRY and the control run is a fresh harness run at the claim's commit. Q54e the three record schemas are adopted as written.",
     "compiledInto": ["ORACLE_REFUSALS scale-evolution reachedThrough", "A0_REGISTRY", "EVIDENCE_SCHEMAS", "ERASURE inFlight"]},
    {"id": "Q55", "topic": "Codex plan-v2 round 7 (Q55a to Q55e)",
     "ruling": "Q55a a QUALIFIED verdict comes only from a run the evaluator executes itself: it builds the declared tree and A0 from the registry, resolves cases from pinned manifests (every case and mode), runs the system on a registered slot, computes expected answers with the pinned oracle and applies the declared comparator; supplied records are diagnostics; verification counts only through a contract-held VERIFIER_REGISTRY. Q55b QT4 splits into QT4s (source durable and readable) and QT4r (replica applied); ACK after QT4s; compositions declare their source and bind log identity and durability; one transition table per protocol variant. Q55c per-surface read guarantees (provisional, flagged for Sam), superseding Q50b. Q55d P3 lag from the source's publication timestamp with every committed position accounted. Q55e the O-DOMAIN fingerprint changes only by a reviewed contract version and a claim never supplies it.",
     "compiledInto": ["QUALIFICATION_RUN", "qualification_run", "resolve_cases", "admit_claim", "VERIFIER_REGISTRY", "registered_acceptance", "A0_REGISTRY binarySha256", "CX-R7-INVENTED-EVIDENCE", "CX-R7-SELECTION-OVERREACH", "CX-R7-RELABELLED-CONTROL", "COMMIT_OUTCOMES log-source, engine-source", "composition_ok", "SOURCE_VARIANT_FIELDS", "LOG_FIELDS", "COMPOSITION sourceDeclaration, readGuarantees", "READ_GUARANTEE_CASES", "E-BASIS-NOT-AVAILABLE", "E-REPLICA-UNAVAILABLE", "NS.P2", "NS.P3", "load-contract P3", "W0_PIN fingerprintOwnership", "CLAIM_ADMISSION"]},
    {"id": "Q56", "topic": "V-O04b findings on O-REPLAY 0.4.1 (Q56a to Q56i; provisional, under the Q24 flag)",
     "ruling": "Q56a an erase naming an unknown target or id is E-INVALID-VALUE; matches nothing means a well-formed selector with nothing to erase. Q56b a card-one attribute with a readable and an erased value conflicts. Q56c answers never depend on the erased value, so an equal readable value beside an erased support conflicts. Q56d card-many markers follow the readable elements by assertion id. Q56e Required is satisfied by an erased value. Q56f erase accepts retract's selectors, id included. Q56g retract after erase commits; erase then delete is supported. Q56h synthetic values only. Q56i O-REPLAY 0.4.1 at a9c1327 pins unchanged (V-O04c ACCEPT); 0.4.2 adds Q52.",
     "compiledInto": ["ERASURE selectors, presence, syntheticData", "ERASURE_Q56_COMMIT_CASES", "ERASURE_Q56_QUERY_CASES", "G9.erasure.commit-semantics", "G9.erasure.query-semantics", "O_REPLAY_FILES", "ORACLE_PINS O-REPLAY", "ORACLE_REFUSALS", "PIN_SCOPE_EXPECTED_DIFF", "VERIFIER_REGISTRY V-O04c"]},
    {"id": "Q58", "topic": "R23 log-of-record compositions (Q58a to Q58e; Q58a provisional, flagged for Sam)",
     "ruling": "Q58a native queries go through a Triplex facade with after and at position tokens (typed BasisNotAvailable {required, observed, replica} or BasisNotReconstructible), a session's high-water mark as an implicit after, the replica watermark for tokenless callers, {basis: {low, high}, route} on every answer, ReplicaUnavailable when unreachable and a 2 s default deadline; it replaces Q55c's native half. Q58b EXP-P2B puts XTDB behind the broker as a second replica after the Q62a fixes are re-verified. Q58c the broker-hardening experiment moves the host log to SQLite with CRC32C chaining, committed_at, an epoch row, cross-checks and a persisted recent_rows overlay, replacing Q50d's rotation and lock items. Q58d the overlay merges entity pulls only (greater LSN wins, identity invariant); aggregates, Datalog, executor reads and paged lists never merge; frames carry tombstones. Q58e log values erase by per-subject crypto-shredding.",
     "compiledInto": ["COMPOSITION readGuarantees native, nativeDeadlineMs", "NATIVE_TOKEN_CASES", "E-BASIS-NOT-RECONSTRUCTIBLE", "COMPOSITION experimentDirections", "COMPOSITION brokerPromotion", "BROKER_HARDENING_CASES", "G7.broker.promotion-hardening", "GATE-BROKER-HARDENING", "COMPOSITION overlay", "OVERLAY_CASES", "G7.composition.overlay-rules", "ERASURE logErasure", "PROTECTED_COPY_INVENTORY", "ER-LOG-CRYPTO-SHRED", "G9.erasure.protected-copies"]},
    {"id": "Q59", "topic": "Contract 0.3.8 questions (Q59a to Q59f)",
     "ruling": "Q59a the Q52 shapes and the Q52f rounding case stay out of the closable obligations until O-REPLAY 0.4.2. Q59b ER-INFLIGHT-READ stays narrowed to a one-value erasure. Q59c every verification and re-check saves its own BRIEF file. Q59d each claimed obligation needs a VERIFIER_REGISTRY entry for its commit. Q59e claims depending on an unpinned oracle are diagnostics until each answer-producing oracle is pinned and registered. Q59f case authors pin manifests through contract versions, starting with CS-POSITION and CS-NS (EXP-W01 for CS-GS).",
     "compiledInto": ["VERIFIER_REGISTRY briefRule", "admit_claim (unpinned oracles)", "CASE_MANIFEST", "G9.erasure.residual-shapes"]},
    {"id": "Q60", "topic": "R22 measurement protocol PAIR-0 (Q60a to Q60i; provisional)",
     "ruling": "Q60a paired rounds (duet, or same-engine ABBA), 8 to 24 rounds of about 150 s, pooled-quantile ratios with a bootstrap over rounds, looks at 8, 12, 18 and 24 at 98.2%, A/A rounds; a single run never decides a bar. Q60b superiority needs the lower bound of A/B at or above the claimed ratio (1.25 by default); hold needs the upper bound of B/A at or below 1.10 for p50 and 1.15 for p99. Q60c cpuset slots with no quota, regime recorded, arms under different regimes never compared, A0 re-measured. Q60d censored accounting, an open-loop read probe, per-second goodput and maximum latency. Q60e absolute bars judged only in GREEN windows, else unjudged. Q60f NS obligations gain the paired-rounds mode. Q60g a screening trace with a burst every 180 s is a new comparison series. Q60h the measurement lease. Q60i single-run A0 is diagnostic only.",
     "compiledInto": ["PAIR_0", "NS_MODES", "MODE_RULE", "CR-NS", "RECEIPT_SCHEMA slotRegime, rounds", "load-contract measurementProtocol, windows judging", "A0_REGISTRY measurement", "paired_ok", "CX-PAIR0-SINGLE-RUN", "CX-PAIR0-UNJUDGED-WINDOW", "CX-PAIR0-REGIME-MISMATCH", "CX-PAIR0-COMMITTED-ONLY", "CX-A0-SINGLE-RUN"]},
    {"id": "Q61", "topic": "EXP-E01 claim evaluator questions (Q61a to Q61k)",
     "ruling": "Q61a the evaluator reads the contract from the authority ref (main). Q61b it reads VERIFIER_REGISTRY as written. Q61c oracleRunners with O-REPLAY's default argv python3 -I lab/oracles/replay/cli.py {case} and an answer-extraction rule. Q61d case-manifest fields input, contentSha256, comparator and optional oracle and faultPoint are pinned. Q61e case-result/2 adds mode, rep, comparator and inputSha256. Q61f the build spec and the build inputs (build-manifest/2) move into the contract. Q61g workload identity only for CR-NS and CR-GS. Q61h the frozen trace is writerTrace.generator.frozen {sha256, seed, offerScheduleSha256}. Q61i engine image pins move into the contract. Q61j fault witnesses are retained. Q61k the A0 side is verified through the registry entry's measuredBy.",
     "compiledInto": ["QUALIFICATION_RUN contractSource, steps", "ORACLE_RUNNERS", "ORACLE_ANSWER_RULE", "ANSWER_MEMBERS", "CASE_MANIFEST", "case_entry_ok", "EVIDENCE_SCHEMAS case-result/2, build-manifest/2, fault-witness/1", "fault_witness_ok", "BUILD_SPEC", "WORKLOAD_IDENTITY appliesTo", "WRITER_TRACE generator frozen", "IMAGE_PINS", "A0_REGISTRY entryShape measuredBy", "admit_claim"]},
    {"id": "Q62", "topic": "V-P2Q REJECT (Q62a to Q62c)",
     "ruling": "Q62a the broker author fixes C1 (in-transaction executor reads wait or fail typed and join the CAS read set), C2 (the replica's real marker is read with the answer), C3 (one open per stream directory per process plus flock), M1 (header checksum, WATERMARK above the scanned end refused), M2 (B beyond the resolved prefix waits or fails typed, A0 too), M3 (pulls and retraction-target reads fall back to the log; typed BasisNotAvailable and ReplicaUnavailable), m1 and m6; then V-P2Q re-verifies. Q62b Q50d's hardening (M4) is met by the Q58c experiment before the broker becomes a default; a default-off merge needs only Q62a. Q62c A0 writes 653 triples per 10-fact command on QLever (24 rows of about 27 triples), not about 750; the cause is the row encoding and journal on every lane (EXP-J01).",
     "compiledInto": ["P2Q_READ_CASES", "FAULT_Q62_CASES", "G7.composition.ack-and-routed-ryow", "G7.commit.protocol-transitions", "GATE-BROKER-HARDENING", "COMPOSITION brokerPromotion", "load-contract P2 storagePerCommit"]},
    {"id": "Q57", "topic": "EXP-D01b W0 SPEC readings A11 to A15 (Q57a to Q57e), with V-D01e N1",
     "ruling": "A11 NaN, Infinity and -Infinity are W0.E_SHAPE. A12 an integer token over 4,300 digits is still an integer token (E_VALUE, E_BASIS for a tx); implementations must not fail on integer-parsing limits. A13 any nesting depth is a valid JSON value, then E_VALUE. A14 strings order by Unicode code point (UTF-8 byte order) for keys, sorts and the basis guard's validTime comparison. A15 inconsistent receiver snapshots keep entries as given, re-sorted stably by seq; only seq = done + 1 releases. Compiled with W0-1.1.2, whose SPEC states them; V-D01e N1: publish and receive integers have no upper bound.",
     "compiledInto": ["WORLD_W0 readings, version, nextEdit", "W0_PIN (W0-1.1.2)"]},
    {"id": "Q63", "topic": "EXP-X05 follower result and the P1 direction (Q63a to Q63d)",
     "ruling": "Q63a the shared-volume follower is rejected for promotion; the guard and harness stay. Q63b read scaling on both lanes comes from broker-fed replicas; EXP-P2B measures the first XTDB replica; Kafka deferred. Q63c the torn-read repro joins the upstream-filing question for Sam; nothing is filed without him. Q63d seeders and appliers on XTDB use parameterised statements only.",
     "compiledInto": ["COMPOSITION sharedVolumeFollower", "COMPOSITION experimentDirections P1-replicas", "COMPOSITION parameterisedSql"]},
    {"id": "Q64", "topic": "Contract 0.3.9 questions (Q64a to Q64f)",
     "ruling": "Q64a EXP-E01 proposes the real BUILD_SPEC values; a contract version pins them. Q64b EXP-M01 freezes the screening series and the acceptance trace, each with its own frozen entry. Q64c oracles compiled into the contract count as pinned. Q64d compile Q63b and Q63d. Q64e slots.json stays read but not hashed. Q64f a pending sub-id never also appears as a RULINGS.md row; a pending sub-id under a compiled base stays allowed.",
     "compiledInto": ["BUILD_SPEC proposal", "WRITER_TRACE generator frozenScreening", "admit_claim (COMPILED oracles)", "Q64f check"]},
    {"id": "Q65", "topic": "EXP-E01 on contract 0.3.9 (Q65a to Q65f)",
     "ruling": "Q65a O-CONTRACT gets a runner: a reference-model entry point in build_contract.py answering one composition-identity case as canonical JSON. Q65b buildSpecSha256 is the sha256 of the canonical JSON of {format, argv, outputs, run}. Q65c a case reached by several select entries records the first in contract order. Q65d each built package is the parent directory of a dist/ output. Q65e E01's build spec is pinned once obl-case.ts exists. Q65f an executing gate (EXP-G03) is the missing piece for any QUALIFIED claim.",
     "compiledInto": ["contract_oracle_answer", "ORACLE_RUNNERS O-CONTRACT", "build_spec_sha256", "BUILD_SPEC specSha256Rule, inputs, proposal", "EVIDENCE_SCHEMAS case-result/2", "QUALIFICATION_RUN blockers"]},
    {"id": "Q66", "topic": "EXP-O04b O-REPLAY 0.4.2 limits (Q66a to Q66d)",
     "ruling": "Q66a erasure commits become visible in position order, so a read before n in-flight erasure commits sees one of the n + 1 prefixes. Q66b a continuation cursor carries its page's erasure prefix. Q66c only erasures in the read's own scope are in flight. Q66d the explicitly converted half of DR-JSON-STRING-TEXT is a lane obligation.",
     "compiledInto": ["ERASURE inFlight", "ERASURE_Q66_CASES", "G9.erasure.residual-shapes", "ORACLE_REFUSALS q52-shapes", "DR-JSON-STRING-TEXT"]},
    {"id": "Q67", "topic": "Codex round 8 on contract 0.3.9 and claim.mjs (Q67a to Q67j)",
     "ruling": "Q67a every blocker stays until EXP-G03's executing gate. Q67b an execution's identity is its source tree, build spec, lockfile, toolchain, runner and config hashes per instance, never its output hash. Q67c single-request surfaces read the marker with the answer; multi-request surfaces use incarnation fencing. Q67d P3 enumerates the final published source prefix and timestamps actual publication; ACKs are reconciled afterwards. Q67e builds and arms run isolated; oracle bytes from a re-hashed read-only copy. Q67f admission recomputes paired decisions from retained per-round data; rounds equal a registered look; RED-window and committed-only counterexamples execute. Q67g workload identity is separate from per-arm placement; a duet needs equal capacity, equal regime and disjoint cpusets. Q67h one error representation with {required, observed, replica}. Q67i case-result/2 uses its declared comparator. Q67j promotion qualification is rejected explicitly until supported. The design rules of Q67c, d and h are compiled with their cases' manifests null; the blockers stay.",
     "compiledInto": ["QUALIFICATION_RUN blockers, executionIdentity, isolation, kinds", "COMPOSITION incarnationFencing", "Q67_CASES", "NS-P3-SOURCE-PREFIX-ENUMERATED", "load-contract P3 publicationEnumeration", "paired_ok", "WORKLOAD_IDENTITY placement", "ERROR_REPRESENTATION", "reference_compare", "case_verdict", "admit_claim"]},
    {"id": "Q68", "topic": "R24 current-value path and release sweep (Q68a to Q68g; provisional)",
     "ruling": "Q68a P4's fast path is one current structure served for H <= B <= W, first in the broker (H1), engines keeping smaller copies; EXP-P4 measures the arms. Q68b the default horizon trails head by one hour; pins hold it; no pin may make it trail by more than 24 hours. Q68c a sweep frame publishes up to 64 results as one atomic outbox commit, each its own work item. Q68d host-served reads count when route = host and the denominator includes broker and kernel CPU. Q68e expired facts retire through a valid-time horizon. Q68f every current copy is covered by per-subject keys; a QLever cur graph holds no personal-data literals. Q68g X1 is measured fresh and aged before any write-path change.",
     "compiledInto": ["COMPOSITION currentPath", "COMPOSITION experimentDirections EXP-P4", "OUTBOX sweepFrames", "load-contract P1 and P4 hostServedReads", "ERASURE currentCopies", "PROTECTED_COPY_INVENTORY"]},
    {"id": "Q69", "topic": "EXP-M01 PAIR-0 decisions and the measurement window (Q69a to Q69g)",
     "ruling": "Q69a a measurement window stops one dev resident for its duration, announced in STATE and enforced by the lease. Q69b INVALID for protocol departures, separate from INVALID_NOISE. Q69c A/B windows grade from the all-round s_d; acceptance-level claims swap roles over a second pair of lifetimes (provisional). Q69d duets run one continuous trace; ABBA keeps per-round randomization. Q69e the live A/A uses public-queued. Q69f screening-r4 is the pre-registered fallback series. Q69g thresholds stay pre-registered; a 7-day passive recorder sets them.",
     "compiledInto": ["PAIR_0 windowProcedure, verdicts, aaInAbMode, continuousTrace, liveComposition, calibration", "PAIR_0 screeningSeries fallback", "WRITER_TRACE generator frozenScreening"]},
    {"id": "Q71", "topic": "EXP-E01 round 8 questions (Q71a to Q71c)",
     "ruling": "Q71a the build spec names a contract-owned exclusion list of install metadata found by diffing two clean installs (compiled as a rule; the list stays null). Q71b a build's toolchain is the node version, platform and arch, and the pnpm version when pnpm is used; an oracle's Python version goes into each oracle invocation's evidence. Q71c the reference model's case verdict uses the declared comparator for case-result/2; case-result/1 keeps hash equality.",
     "compiledInto": ["BUILD_SPEC installMetadataExclusions, installMetadataRule", "QUALIFICATION_RUN executionIdentity toolchain, installMetadata", "EVIDENCE_SCHEMAS oracle-invocation/1", "reference_compare", "case_verdict"]},
    {"id": "Q72f", "topic": "V-P2Q round 2: one error id (Q72f only; Q72a-e and Q72g stay pending)",
     "ruling": "One contract id covers a basis beyond the latest published position: E-BASIS-NOT-AVAILABLE. E-UNAVAILABLE-CUT is retired; obligations that used it move to E-BASIS-NOT-AVAILABLE.",
     "compiledInto": ["ERROR_TABLE", "RETIRED_ERRORS", "CURSOR_TRANSITIONS permittedErrors CE-FUTURE-BASIS", "G8.publish.basis-honesty", "G10.cursor.continuation-transitions"]},
]

# ============================================================================ language accounting
LANGUAGE_RULES = {
    "xtdbNativeLanguage": "every XTDB receipt records TRIPLEX_XTDB_NATIVE_LANGUAGE (xtql or xtdb-sql) as executed; XTQL and SQL results never share an obligation closure: lane receipts close only their own lane, and an engine-scope receipt whose evidence includes a native or raw surface closes only the lane of its recorded language (RULINGS Q39b)",
    "substep": "Every read substep records exactly one language: xtql (native.select), sql (selectSql), sparql (QLever native). A lane receipt counts a task only when every relational substep is in the lane's language.",
    "hybrid": "A task with a relational substep in another language, or with a host step not listed below, counts for neither XTDB language.",
    "permittedHostSteps": [
        {"id": "HS-NORMALIZE", "source": "RULINGS Q3",
         "rule": "A declared normalization step that reads no data: arithmetic or classification over values already returned by native substeps of the same task (for example BigInt subtraction of two returned sums). It is declared in the frozen task recipe, recorded in the trace, and its time is counted inside the task's measured call."},
        {"id": "HS-FRONTIER", "source": "PLAN C8",
         "rule": "C8 frontier control for recursive reads, limited to the operations in FRONTIER_RULES. All relational evaluation stays native at one fixed cut."},
    ],
}

FRONTIER_RULES = {
    "source": "PLAN v1.1 C8; acceptance review r1 finding 16",
    "permittedHostOperations": [
        "deduplicate returned frontier ids",
        "subtract the visited set from the new frontier",
        "test termination (empty frontier, maxRounds reached, maxRecursiveRows reached)",
        "bind the next frontier as query parameters, chunked so each native query stays within its declared parameter bound",
        "count rows and rounds against the bounds",
    ],
    "forbiddenHostOperations": [
        "filtering on values, types, entity types or time",
        "joins between returned relations",
        "visibility, cut or valid-time evaluation",
        "negation, aggregation, ordering or pagination of answers",
        "any read that does not go through the lane's native language",
    ],
    "fixedCut": "Every round runs at the same captured basis (scope, P, optional R, V); each round's trace records that basis and the evaluator checks they are identical.",
    "bounds": "maxRounds and maxRecursiveRows are declared per task. Reaching a bound fails with the typed recursion-limit error (ERROR_TABLE E-RECURSION-LIMIT) and returns no partial answer.",
    "cost": "Host frontier time and peak host memory are counted inside the task's measured cost and reported per round.",
    "noMutation": "No round writes engine state (engine-side mutation count unchanged across the read).",
    "accounting": "A task whose host steps are only HS-FRONTIER (and HS-NORMALIZE) operations counts as pure in the lane's language.",
}

# ============================================================================ frozen semantic tables
# These tables are the expected-answer authority. Integer arithmetic runs in the TypeScript kernel per subject (NUMERIC);
# any engine surface that offers an operation must give the same answer or a typed error, never a wrapped value. Source references justify them; a later change in production
# behavior never changes an expected answer automatically: it needs a new contract version.
NUMERIC_OPS = [
    {"id": "N-I-ADD", "op": "integer + integer, integer - integer, integer * integer (kernel; any surface that offers it)", "rule": "exact; a result outside the core integer type range [-2^63, 2^63-1] fails with E-INTEGER-OVERFLOW; a result the target lane cannot store fails at write with E-VALUE-OUT-OF-RANGE", "source": "packages/core/src/datalog/compiler.ts:572 (DECIMAL(32,0) then range check)",
     "examples": [["2^62 + 2^62", "E-INTEGER-OVERFLOW"], ["(2^63-1) + 1", "E-INTEGER-OVERFLOW"], ["-2^63 - 1", "E-INTEGER-OVERFLOW"], ["2^32 * 2^31", "E-INTEGER-OVERFLOW"], ["3037000499 * 3037000499", "9223372030926249001"], ["3037000500 * 3037000500", "E-INTEGER-OVERFLOW"], ["(2^59-1) + 1", "576460752303423488"]]},
    {"id": "N-I-DIV", "op": "integer / integer", "rule": "quotient truncated toward zero; divisor 0 fails with E-DIVISION-BY-ZERO; -2^63 / -1 fails with E-INTEGER-OVERFLOW", "source": "compiler.ts:561-570 (truncated quotient); RULINGS Q8c",
     "examples": [["7 / 2", "3"], ["-7 / 2", "-3"], ["7 / 0", "E-DIVISION-BY-ZERO"], ["-2^63 / -1", "E-INTEGER-OVERFLOW"]]},
    {"id": "N-I-REM", "op": "integer % integer", "rule": "a - trunc(a/b)*b (sign of the dividend); divisor 0 fails with E-DIVISION-BY-ZERO", "source": "compiler.ts:563-566",
     "examples": [["7 % 3", "1"], ["-7 % 3", "-1"], ["7 % -3", "1"], ["1 % 0", "E-DIVISION-BY-ZERO"]]},
    {"id": "N-I-NEG", "op": "unary minus, ABS on integer", "rule": "exact; -(-2^63) and ABS(-2^63) fail with E-INTEGER-OVERFLOW", "source": "integer range",
     "examples": [["-(-2^63)", "E-INTEGER-OVERFLOW"], ["ABS(-2^63)", "E-INTEGER-OVERFLOW"], ["ABS(-5)", "5"]]},
    {"id": "N-MIXED", "op": "arithmetic mixing integer and number", "rule": "preflight E-MIXED-FAMILY unless the query converts one operand explicitly", "source": "compiler.ts:556-560 ('Mixed exact integer and number arithmetic requires an explicit cast')",
     "examples": [["integer 1 + number 1.5", "E-MIXED-FAMILY"], ["toNumber(integer 1) + number 1.5", "2.5"]]},
    {"id": "N-F-ARITH", "op": "number + - * / (binary64)", "rule": "IEEE 754 binary64, round to nearest, ties to even, one rounding per operation; a finite result is returned bit-exact; an infinite result fails with E-NUMBER-OVERFLOW; divisor zero (+0.0 or -0.0) fails with E-DIVISION-BY-ZERO; NaN is never produced or stored", "source": "IEEE 754; RULINGS Q8c (finite domain)",
     "examples": [["0.1 + 0.2", "0.30000000000000004"], ["1.7976931348623157e308 * 2", "E-NUMBER-OVERFLOW"], ["1.0 / 0.0", "E-DIVISION-BY-ZERO"], ["1.0 / -0.0", "E-DIVISION-BY-ZERO"]]},
    {"id": "N-F-NEGZERO", "op": "signed zero", "rule": "IEEE sign rules", "source": "IEEE 754 6.3; acceptance review r1 finding 8",
     "examples": [["-0.0 + 0.0", "+0.0"], ["-0.0 + -0.0", "-0.0"], ["0.0 - 0.0", "+0.0"], ["-0.0 - 0.0", "-0.0"], ["-0.0 * -1.0", "+0.0"], ["-0.0 * 1.0", "-0.0"], ["0.0 * -1.0", "-0.0"], ["-(0.0)", "-0.0"], ["-(-0.0)", "+0.0"], ["stored -0.0 read back", "-0.0 (sign preserved)"]]},
]
CONVERSION_RULES = [
    {"id": "CV-I2F", "rule": "toNumber(integer): round to nearest binary64, ties to even, once", "examples": [["toNumber(2^53+1)", "9007199254740992.0"], ["toNumber(2^63-1)", "9223372036854775808.0"]]},
    {"id": "CV-F2I", "rule": "toInteger(number): only explicit; the value must be integral and inside integer, else E-INVALID-CONVERSION; -0.0 converts to 0", "examples": [["toInteger(3.0)", "3"], ["toInteger(3.5)", "E-INVALID-CONVERSION"], ["toInteger(9223372036854775808.0)", "E-INVALID-CONVERSION"]]},
    {"id": "CV-T2I", "rule": "CAST text to integer: canonical decimal only (optional leading '-', no '+', no leading zeros except '0', no '-0'), inside integer, else E-INVALID-CONVERSION or E-INTEGER-OVERFLOW", "examples": [["'9223372036854775808'", "E-INTEGER-OVERFLOW"], ["'-9223372036854775808'", "-9223372036854775808"], ["'01'", "E-INVALID-CONVERSION"], ["'+1'", "E-INVALID-CONVERSION"]]},
    {"id": "CV-NONE", "rule": "no implicit conversion between families anywhere (filters, joins, group keys, aggregates)", "examples": []},
]
COMPARISON_RULES = [
    {"id": "CMP-SAME", "rule": "same family: exact comparison (integer as integers, binary64 by IEEE value, text by Unicode codepoint sequence, datetime by instant, boolean false < true, ref by id codepoints)", "source": "exact typing"},
    {"id": "CMP-NUMERIC-CONST", "rule": "an untyped numeric constant compares by numeric value with number and datetime values (number 7 and datetime 7 both equal 7); text '7' is not equal", "source": "testkit 'datalog equality predicates compare numeric values as numbers' (packages/testkit/src/index.ts:721)"},
    {"id": "CMP-INT-FLOAT", "rule": "integer versus number: equality is false and they never share a group; an ordered comparison across them is preflight E-MIXED-FAMILY unless converted explicitly", "source": "RULINGS Q8d (core silent for stored integer versus number)"},
    {"id": "CMP-DECIMAL-CROSS", "rule": "every comparison between decimal and integer or number, equality included, and any grouping or set operation mixing them, is a preflight E-MIXED-FAMILY unless the query converts explicitly (DECIMAL_CONVERSIONS); there is no false or null result", "source": "RULINGS Q18, Q22"},
    {"id": "CMP-CROSS-FAMILY-ORDERED", "rule": "every ordered comparison across type families is a preflight E-MIXED-FAMILY, never false; equality across families is false except where a ruling makes it an error (decimal, CMP-DECIMAL-CROSS)", "source": "RULINGS Q33d (R-CMP-3); Q14d"},
    {"id": "CMP-IDENTITY", "rule": "entity ids and ref identities compare only with text or ref constants; a numeric or boolean constant is never equal and != is true", "source": "testkit 'datalog equality keeps identity bindings string-typed'"},
    {"id": "CMP-UNTYPED-STRING", "rule": "an untyped string constant matches string and ref values; a typed ref constant matches only ref values", "source": "testkit 'datalog untyped strings match string and ref values while typed refs stay exact'"},
    {"id": "CMP-BOOL-INT", "rule": "boolean true and integer 1 are distinct values and distinct groups", "source": "packet oracle identity() (event_oracles.py: bool true vs i64 one)"},
    {"id": "CMP-NEGZERO", "rule": "-0.0 and +0.0 are one value for identity, grouping and set membership; when supports differ only in representation, the returned representation is the one from the support with the lowest (recordedPosition, operation index) (amended by RULINGS Q21 AMB-08; assertion ids are generated per lane and are never used); a single-assertion read returns the stored representation", "source": "RULINGS Q14b; packages/core/src/content/CanonicalJson.ts:77"},
]
AGGREGATE_RULES = [
    {"id": "AG-SUM-I", "rule": "SUM over integers, where a surface or projection offers it: exact total over the solution rows (bag of distinct bindings); E-INTEGER-OVERFLOW only when the final total is outside the integer range; partial sums never wrap. Engine-side sums are required only for projections that declare them (G5.agg.projection-sums); per-subject sums run in the kernel", "source": "RULINGS Q8a, NUMERIC; compiler.ts SUM over DECIMAL(32,0)",
     "examples": [["[2^62, 2^62]", "E-INTEGER-OVERFLOW"], ["[2^62, 2^62, -2^62]", "4611686018427387904"], ["[2^58, 2^58, 2^58]", "864691128455135232"]]},
    {"id": "AG-SUM-F", "rule": "SUM over number, where offered: the correctly rounded value of the exact sum (one rounding), independent of evaluation order", "source": "RULINGS Q14c",
     "examples": [["[1e16, 1.0, -1e16]", "1.0"]]},
    {"id": "AG-SUM-ONE-ENTITY", "rule": "two equal-valued assertions of one attribute on one entity are one value with two supports and one binding row: SUM 10 + 10 on one entity is 10 and COUNT is 1; equal values on distinct entities each count", "source": "RULINGS Q21 AMB-09 (provisional, flagged for Sam); PLAN C5.1",
     "examples": [["SUM(:conf/amount) with 10 asserted twice on entity agg:c", "10"], ["COUNT with the same fixture", "1"], ["SUM with 10 on agg:a and 10 on agg:b", "20"]]},
    {"id": "AG-INT-RESULT", "rule": "integer aggregate and arithmetic results project as IntegerValue with canonical decimal text, never as a JavaScript number", "source": "RULINGS Q21 AMB-10"},
    {"id": "AG-AVG-I", "rule": "AVG over integers without explicit conversion: preflight E-INTEGER-AVG", "source": "RULINGS Q8b; compiler.ts:1397-1401"},
    {"id": "AG-AVG-CONV", "rule": "AVG(toNumber(integer)) and AVG(number): binary64 of the exact sum divided by the count, rounded once; the explicit conversion is spelled toNumber(?v)", "source": "RULINGS Q8b; Q21 AMB-11"},
    {"id": "AG-COUNT", "rule": "COUNT over a variable counts distinct flattened values of that variable (core), so two entities with value 10 count 1 while SUM counts 20", "source": "testkit 'datalog aggregates preserve duplicate rows and define empty and distinct results'"},
    {"id": "AG-EMPTY-UNGROUPED", "rule": "ungrouped aggregate over no rows returns one row: COUNT 0; SUM, AVG, MIN, MAX null", "source": "same testkit case"},
    {"id": "AG-EMPTY-GROUPED", "rule": "grouped aggregate over no rows returns no rows; an empty group never appears", "source": "wiki/problems/native-correlation.md (grouped empty SUM produces no row)"},
    {"id": "AG-MINMAX-TIES", "rule": "MIN/MAX return the extreme value; a witness query keeps every tied entity", "source": "wiki/problems/native-correlation.md (tied integer-max winners)"},
    {"id": "AG-PACKET-COALESCE", "rule": "packet tasks that state COALESCE(sum, 0) return 0 for an empty input; this is task-specific and recorded in the task recipe", "source": "packet workload 06 empty-currency"},
]
CARD_MANY_ORDER = {
    "source": "RULINGS Q8f",
    "rule": "set semantics: equal values collapse to one element; elements ordered first by type family, then by value",
    "familyOrder": ["boolean", "integer", "number", "decimal", "datetime", "string", "ref", "json", "blob"],
    "valueOrder": {"boolean": "false < true", "integer": "numeric", "number": "numeric IEEE (-0.0 and +0.0 collapse, CMP-NEGZERO)", "decimal": "exact numeric value (1.50 and 1.5 are one value)", "datetime": "instant", "string": "Unicode codepoint sequence", "ref": "codepoint sequence of the target id", "json": "codepoint sequence of the canonical JSON text", "blob": "codepoint sequence of the content id"},
    "note": "Family order per RULINGS Q14a and Q18: decimal is its own family between number and datetime; inside it, values sort by exact numeric value.",
}
CONSTRAINT_RULES = [
    {"id": "CN-NEW-OR-WORSENED", "rule": "with enforcement on, a command is rejected only when its post-state creates a new violation or worsens an existing one at some represented valid-time boundary; a pre-existing violation does not block an unrelated command and stays readable", "source": "packages/core/src/Constraint.ts:376 (newlyViolated)"},
    {"id": "CN-CARD-COUNT", "rule": "write-time cardinality counts live assertions, including equal-valued duplicates (unchanged)", "source": "Constraint.ts:193; PLAN C5.1"},
    {"id": "CN-PREEXISTING-CONFLICT", "rule": "a card-one conflict that predates the enforcing write stays a conflict (C5.2) and reads per C5.3", "source": "PLAN C5.2"},
]

# RULINGS Q33 (EXP-O02 RULING-NEEDED items).
Q33_RULES = [
    {"id": "R-VAL-7a", "rule": "a JSON number is accepted only if it reads back as written: its shortest round-trip binary64 rendering equals the given text in canonical form (0.1 accepted; 9007199254740993 rejected, it would read back as ...992); this is what Q30a's 'not exactly a binary64 value' means", "error": "E-INEXACT-JSON-NUMBER", "case": "Q33-JSON-READBACK", "ruling": "Q33a"},
    {"id": "R-DEC-0", "rule": "a decimal on an attribute not declared decimal", "error": "E-INVALID-VALUE", "case": "DEC-UNDECLARED-ATTRIBUTE", "ruling": "Q33b"},
    {"id": "R-DEC-1", "rule": "decimal wire shape {\"type\": \"decimal\", \"value\": \"16.50\"}", "error": "-", "case": "DEC-WIRE-SHAPE", "ruling": "Q33b"},
    {"id": "R-DEC-2", "rule": "-0.00 is refused, consistent with Q30b", "error": "E-INVALID-VALUE", "case": "DEC-NEGZERO-REFUSED", "ruling": "Q33b"},
    {"id": "R-DEC-3", "rule": "fractional digits are counted on the value: 16.500 fits scale 2 and is returned as 16.50; the original input text is still captured (Q22)", "error": "-", "case": "DEC-TRAILING-ZERO-FITS", "ruling": "Q33b"},
    {"id": "R-DEC-5", "rule": "decimal divide(a, b, scale, rounding) is modeled by the oracle (follow-up EXP-O03)", "error": "-", "case": "DEC-OP-DIVIDE", "ruling": "Q33b"},
    {"id": "R-DEC-6", "rule": "toDecimal(number) starts from the exact binary expansion, then applies the caller's scale and rounding; a JSON number instead starts from its as-written reading (DR-JSON-CONVERT, RULINGS Q49e)", "error": "-", "case": "DEC-TODECIMAL-EXACT-EXPANSION", "ruling": "Q33b"},
    {"id": "R-DEC-7", "rule": "AVG over decimal is a preflight error unless written as divide(SUM, COUNT, scale, rounding)", "error": "E-DECIMAL-AVG", "case": "DEC-AVG-PREFLIGHT", "ruling": "Q33b"},
    {"id": "R-LANE-2", "rule": "a retract-pattern value outside the lane's range", "error": "E-VALUE-OUT-OF-RANGE", "case": "RANGE-OUT-RETRACT-PATTERN", "ruling": "Q33c"},
    {"id": "R-CMP-3", "rule": "every ordered comparison across families is a preflight error, never false; equality across families is false except where a ruling makes it an error (decimal, Q22)", "error": "E-MIXED-FAMILY", "case": "Q33-CROSS-FAMILY-ORDER", "ruling": "Q33d"},
    {"id": "R-NUM-7", "rule": "an arithmetic operand of a non-numeric family", "error": "E-MIXED-FAMILY", "case": "Q33-NONNUMERIC-OPERAND", "ruling": "Q33e"},
    {"id": "R-NUM-8", "rule": "rem is integer-only; a binary64 operand is a preflight error", "error": "E-MIXED-FAMILY", "case": "Q33-REM-BINARY64", "ruling": "Q33e"},
    {"id": "R-AGG-5", "rule": "SUM or AVG over a non-numeric family", "error": "E-MIXED-FAMILY", "case": "Q33-AGG-NONNUMERIC", "ruling": "Q33e"},
    {"id": "R-CMD-9", "rule": "an operation fault with no ERROR_TABLE row", "error": "E-INVALID-VALUE", "case": "Q33-CMD-UNMAPPED-FAULT", "ruling": "Q33f"},
    {"id": "R-CMD-12", "rule": "retract-pattern on a transaction entity", "error": "E-RESERVED", "case": "Q33-CMD-RETRACT-TX-ENTITY", "ruling": "Q33f"},
    {"id": "R-JNL-5", "rule": "journal facts are valid from the commit instant, carry synthetic ids, and :_tx/change json carries the logical change content", "error": "-", "case": "Q33-JNL-ENVELOPE", "ruling": "Q33g"},
    {"id": "R-JNL-6", "rule": "other envelope facts return X-NOT-MODELED, never a partial answer", "error": "-", "case": "Q33-JNL-NOT-MODELED", "ruling": "Q33g"},
    {"id": "R-JNL-7", "rule": "an invalid transactions limit is PaginationCursorError / malformed, the same as entityPage", "error": "E-CURSOR", "case": "Q33-JNL-LIMIT", "ruling": "Q33g"},
    {"id": "R-CUT-3", "rule": "an invalid basis", "error": "E-INVALID-VALUE", "case": "Q33-CUT-INVALID-BASIS", "ruling": "Q33h"},
    {"id": "R-PAGE-3", "rule": "an out-of-range entityPage limit is PaginationCursorError / malformed (G10-CUR-01 E3)", "error": "E-CURSOR", "case": "Q33-PAGE-LIMIT", "ruling": "Q33h"},
    {"id": "R-PAGE-4", "rule": "continuing a cursor with a different basis is PaginationCursorError / other-query; a different page size is allowed", "error": "E-CURSOR", "case": "Q33-PAGE-OTHER-BASIS", "ruling": "Q33h"},
]
# RULINGS Q33i: the oracle's readings for vector bugs; the vectors stay unchanged as audit evidence (Q29a).
Q33I_CURSOR_READINGS = [
    {"vector": "G10-CUR-01", "query": "E1", "vectorReason": "basis_mismatch", "compiled": {"_tag": "PaginationCursorError", "reason": "other-query"}, "why": "R-PAGE-4: a different basis is other-query"},
    {"vector": "G10-CUR-01", "query": "E2", "vectorReason": "query_mismatch", "compiled": {"_tag": "PaginationCursorError", "reason": "other-query"}, "why": "E-CURSOR has only malformed, other-scope and other-query"},
]
Q33I_QLEVER_REJECTED = ["G1-I64-01", "Q8F-02", "G1-I64-02#min-exact", "G5-SUM-01", "G5-SUM-02", "G5-SUM-04", "G5-SUM-05", "G5-SUM-06", "G5-SUM-08", "G5-SUM-11#case2"]

# RULINGS Q43 (EXP-O03 decisions), compiled with their cases.
Q43_RULES = [
    {"id": "R-DEC-13/16", "rule": "a decimal beyond its declared or 38-digit precision, including number-to-decimal overflow, is E-DECIMAL-OVERFLOW; excess fraction digits are E-DECIMAL-FRACTION; the earlier unrepresentable error no longer exists", "error": "E-DECIMAL-OVERFLOW", "case": "DEC-Q43-OVERFLOW-IDS", "ruling": "Q43a"},
    {"id": "R-DEC-14", "rule": "AVG over decimals is E-DECIMAL-AVG, not E-DECIMAL-BARE-DIVIDE", "error": "E-DECIMAL-AVG", "case": "DEC-AVG-PREFLIGHT", "ruling": "Q43b"},
    {"id": "R-DEC-8", "rule": "an undeclared decimal literal has scale = written fraction digits and precision = max(1, integer digits + scale)", "error": "-", "case": "DEC-Q43-LITERAL-TYPE", "ruling": "Q43c"},
    {"id": "R-DEC-9", "rule": "half-up rounds ties away from zero, including negative ties; half-even rounds ties to the even digit; down truncates toward zero", "error": "-", "case": "DEC-Q43-ROUNDING-MODES", "ruling": "Q43d"},
    {"id": "R-DEC-10", "rule": "inside an expression with no target column the precision limit is 38", "error": "E-DECIMAL-OVERFLOW", "case": "DEC-Q43-EXPR-LIMIT", "ruling": "Q43e"},
    {"id": "R-DEC-11", "rule": "round(x, s) with s greater than x's scale is exact: x at scale s by appending zeros, never refused; result precision p + (s - s_x) capped at 38 (Q43f-detail, DO-ROUND)", "error": "-", "case": "DEC-Q43-ROUND-UP-SCALE", "ruling": "Q43f"},
    {"id": "R-DEC-12", "rule": "toInteger of a whole decimal outside the integer range", "error": "E-INTEGER-OVERFLOW", "case": "DEC-Q43-TOINTEGER-OVERFLOW", "ruling": "Q43g"},
    {"id": "R-CUT-4", "rule": "a read basis given as -0", "error": "E-NEGATIVE-ZERO-INSTANT", "case": "Q43-CUT-NEGZERO", "ruling": "Q43h"},
]

TEMPORAL_RULES = [
    {"id": "TM-HALF-OPEN", "rule": "valid intervals are [validFrom, validTo) with null open-ended", "source": "handoff README 46-48"},
    {"id": "TM-EMPTY-REJECTED", "rule": "an interval with validTo <= validFrom is rejected with E-INVALID-VALUE before any mutation, because an interval that can never be visible would be a silent no-op", "source": "RULINGS Q21 AMB-12"},
]
READ_SHAPE_RULES = [
    {"id": "RS-RAW-LIFETIME", "rule": "ordinary Triples.match, entity and entityPage at an explicit R keep the raw assertion lifetime (no global mask); the five tiny-v4 checks and the original counterexample, with its original expected answer, close on repository as-of reads, timeline and native history", "source": "RULINGS Q21 AMB-01"},
    {"id": "RS-RETIREMENT-CONTENT", "rule": "snapshot retirement metadata is compared as the logical content {identity, value, recordedAt, knownRetirement: null or {retractedAt, retractTxId}}; native rows add retractedPosition; physical field names are EXP-R01's and the oracle renames them", "source": "RULINGS Q21 AMB-02"},
    {"id": "RS-TIMELINE", "rule": "timeline at a basis lists every assertion recorded at (P, R) with no valid-time filter; the valid-time filtered view is the native known-at-valid helper", "source": "RULINGS Q21 AMB-03"},
    {"id": "RS-FIND-RANGE", "rule": "Repository.find offers range predicates (gt, gte, lt, lte) on integer attributes, as on every other ordered family", "source": "RULINGS Q21 AMB-16"},
    {"id": "RS-FIND-CONFLICT", "rule": "find fails with E-CONFLICTING-VALUES when a returned document contains a conflicted attribute, even when the filter avoids it; a projection that omits the attribute succeeds", "source": "RULINGS Q21 AMB-17 (provisional, flagged for Sam); PLAN C5.3"},
    {"id": "RS-ENTITY-ORDER", "rule": "entityPage orders entity ids by Unicode codepoint (U+E000 sorts before U+10000)", "source": "RULINGS Q21 AMB-15"},
]
JOURNAL_RULES = [
    {"id": "JN-NEGZERO", "rule": "the journal change value of a -0.0 assertion is bit-exact -0.0; C6's byte-identical -0 behavior is superseded by the numeric rule", "source": "RULINGS Q21 AMB-04 (provisional, flagged for Sam)"},
    {"id": "JN-FIELDS", "rule": "journal changes are compared on the documented fields plus the testkit-pinned ones (assert: value, validFrom, assertionTxId; retract: value, recordedAt, retractedAt, retractionTxId); byte identity of the whole journal is a separate T0-capture baseline", "source": "RULINGS Q21 AMB-05"},
    {"id": "JN-STAGED", "rule": "operations apply in order over staged facts: retract-pattern sees assertions staged earlier in the same command (both changes, assert first); confirmed by a T0 capture before 1.0.0", "source": "RULINGS Q21 AMB-06"},
    {"id": "JN-ORDER", "rule": "changes are ordered by creation order (recordedPosition, then operation index), frozen for M-JOURNAL-ORDER; confirmed by a T0 capture", "source": "RULINGS Q21 AMB-07"},
]

DECIMAL_RULES = {
    "source": "RULINGS Q18",
    "declaration": "every decimal attribute declares precision p (total significant digits) and scale s (fractional digits), 0 <= s <= p",
    "storage": [{"when": "every declared precision and scale (both lanes)", "as": "the TDK1 key in channel decimal_order_v1 (authoritative, decodes exactly) plus derived canonical text at the declared scale; QLever also keeps its lexical channel for parity with other kinds (RULINGS Q35b, amending Q18)"}],
    "oneRepresentation": "the decimal kind has exactly one stored representation; Q18's scaled-integer path no longer applies; money modeled as integer cents uses the integer kind (RULINGS Q35b)",
    "reject": "a value with more than s fractional digits (counted on the value, so 16.500 fits scale 2, R-DEC-3) fails with E-DECIMAL-FRACTION; a value beyond the declared precision or 38 digits fails with E-DECIMAL-OVERFLOW; -0.00 in any spelling is refused with E-INVALID-VALUE (R-DEC-2); a decimal on an attribute not declared decimal is E-INVALID-VALUE (R-DEC-0); every rejection leaves no residue; never rounded or truncated (RULINGS Q33b, Q35e)",
    "wireShape": "{\"type\": \"decimal\", \"value\": \"16.50\"} (R-DEC-1); a value with extra trailing zeros is returned at the declared scale (16.500 at scale 2 reads back as 16.50) while the original input text is still captured (Q22, R-DEC-3)",
    "toDecimal": "toDecimal(number, p, s, rounding) starts from the number's exact binary expansion, then applies the caller's scale and rounding (R-DEC-6)",
    "avg": "AVG over decimal is preflight E-DECIMAL-AVG unless written as divide(SUM, COUNT, scale, rounding) (R-DEC-7); decimal divide is modeled by the oracle (follow-up EXP-O03, R-DEC-5)",
    "family": "decimal is its own family, ordered between number and datetime (CARD_MANY_ORDER); 1.50 and 1.5 are one value",
    "comparison": "CMP-DECIMAL-CROSS: comparison with integer or number is preflight E-MIXED-FAMILY unless the query converts explicitly",
    "arithmetic": "TypeScript kernel, exact decimal arithmetic; engine-side decimal arithmetic only where a projection needs it (RULINGS Q19)",
    "inputCapture": "the writer captures the caller's original typed input before any normalization; tests assert nothing was rounded before capture (DEC-INPUT-CAPTURE, M-DECIMAL-PRECAPTURE-ROUND)",
    "kernelMaxDigits": 38,
}
# RULINGS Q35a, Q35c, Q35d: the decimal order key (R20 section 6).
TDK1 = {
    "name": "TDK1 (Triplex decimal key, version 1)", "channel": "decimal_order_v1", "source": "lab/research/R20-order-preserving-decimal-encodings.md section 6; RULINGS Q35a",
    "summary": "value-determined, order-preserving (TDK1): zero o; positive p LL I F (LL two-digit integer-digit count, I without leading zeros, F without trailing zeros); negative n (99-L) comp(I) comp(F) z with comp(d) = 9 - d",
    "alphabet": "0123456789nopz",
    "inputGrammar": "-?(0|[1-9][0-9]*)(\\.[0-9]+)?; refused: +1, 01, 1., .5, 1e3, whitespace, non-ASCII digits, negative zero in any spelling",
    "decode": "parse strictly, then render the sign, I or 0, and when s > 0 a '.' followed by F right-padded with zeros to s digits",
    "order": "codepoint order of keys equals numeric order; the alphabet [0-9nopz] makes ICU order equal codepoint order on QLever and byte order on XTDB (no collation on 2.2.0)",
    "useConstraints": "keys are never concatenated into a composite string and never used for prefix queries (p0212 is a prefix of p02125); only whole-key equality and ordered comparison, as a separate sort column (RULINGS Q35d)",
    "versioning": "a future encoding gets a new channel name and a migration (RULINGS Q35c)",
    "limits": "maximum precision 38 (TDK1 has headroom to 99 integer digits); no native XTDB DECIMAL lane: one verification path (RULINGS Q35e)",
    "kernelNote": "if the kernel uses decimal.js or big.js, rounding tests cover their signed zero (RULINGS Q35e)",
    "examples": [["0", "o"], ["0.00", "o"], ["1", "p011"], ["1.10", "p0111"], ["0.01", "p0001"], ["0.05", "p0005"], ["0.5", "p005"], ["12", "p0212"], ["12.25", "p021225"], ["12.5", "p02125"], ["16.50", "p02165"], ["16.499999", "p0216499999"], ["125", "p03125"],
                 ["-0.01", "n9998z"], ["-0.5", "n994z"], ["-0.55", "n9944z"], ["-12", "n9787z"], ["-12.5", "n97874z"], ["-16.50", "n97834z"], ["-125", "n96874z"],
                 ["12345678901234567890.12", "p201234567890123456789012"], ["-99999999999999999999.99", "n790000000000000000000000z"], ["9" * 38, "p38" + "9" * 38], ["-" + "9" * 38, "n61" + "0" * 38 + "z"]],
}


def tdk1_encode(text):
    """Reference TDK1 encoder (R20 section 6.1), used by the generator's self-check only."""
    if not re.fullmatch(r"-?(0|[1-9][0-9]*)(\.[0-9]+)?", text):
        raise ValueError("malformed")
    neg = text.startswith("-")
    ip, _, fp = text.lstrip("-").partition(".")
    i, f = ip.lstrip("0"), fp.rstrip("0")
    if not i and not f:
        if neg:
            raise ValueError("negative zero")
        return "o"
    if len(i) > 99:
        raise ValueError("too many integer digits")
    if not neg:
        return f"p{len(i):02d}{i}{f}"
    comp = lambda d: "".join(str(9 - int(c)) for c in d)
    return f"n{99 - len(i):02d}{comp(i)}{comp(f)}z"


# RULINGS Q35 (R20 section 5.3): engine-side property tests V3 to V7, each a decimal-kind obligation.
TDK1_TESTS = {
    "V3": {"obligation": "G1.decimal.tdk1-admission", "case": "TDK1-V3-ORDER-PROBE", "check": "per-image admission probe: the 121,005-key sorted chain, all boundary keys, 20,000 prefix pairs (p0212 / p02125) and negatives (n9944z / n994z) loaded as VARCHAR on XTDB (flushed and compacted L0 blocks plus bloom pages) and as plain literals in an order predicate on QLever (including a post-index INSERT DATA delta)", "pass": "ORDER BY key returns exactly the exact-rational order and the two engines return byte-identical orders"},
    "V4": {"obligation": "G1.decimal.tdk1-ranges", "case": "TDK1-V4-RANGES", "check": "1,000 random closed and half-open ranges whose bounds are not in the set and have more fractional digits than any scale", "pass": "count, first key and last key equal the oracle; keyset and LIMIT/OFFSET pagination concatenate to the full order"},
    "V5": {"obligation": "G1.decimal.tdk1-differential", "case": "TDK1-V5-DIFFERENTIAL", "check": "the TypeScript encoder in packages/core against the Python reference on a pinned vector file (TDK1_VECTOR_PIN)", "pass": "byte-for-byte equal keys and equal decode results; mutants of the TypeScript encoder fail"},
    "V6": {"obligation": "G1.decimal.tdk1-serialization", "case": "TDK1-V6-SERIALIZATION", "check": "the key through the pg wire, JSON export, SPARQL result export, ledger and projection", "pass": "the key string is unchanged: no case change, trimming or numeric coercion"},
    "V7": {"obligation": "G1.decimal.tdk1-writer-negative", "case": "TDK1-V7-WRITER-NEGATIVE", "check": "values outside (p, s), excess nonzero fractional digits (R-DEC-3), -0, more than 38 digits, malformed text", "pass": "typed error (E-DECIMAL-OVERFLOW, E-DECIMAL-FRACTION or E-INVALID-VALUE), no residue, no rounding anywhere on the path"},
}
# Required input for V5: null until the seeded vector file is generated and reviewed; fails closed.
TDK1_VECTOR_PIN = {"file": "lab/oracles/decimal/tdk1-vectors.json", "sha256": None, "candidateSha256": "0a699f59e16821ddf00c82319569a7e727fa1042e6d36a95fc577a6a4213d2a5", "reviewReceipt": None, "generator": "lab/oracles/decimal/gen_vectors.py (seed 20261108, exact construction with a Fraction assertion)", "rule": "null until an independent review of the candidate vector file; pinning needs a contract version bump (RULINGS Q37c, Q38e)"}
# RULINGS Q37c, Q38e: O-TDK1 files pinned at their current hashes.
O_TDK1_FILES = {"lab/oracles/decimal/tdk1_reference.py": "73467589480deb93fb700cdaf856cccb8f67b9a24d1963e26744a0ac4754bf33", "lab/oracles/decimal/gen_vectors.py": "b30b430acbfc7476cf47e676d38abaa247d3545b20aac5d481bea67a11cf11e1"}

# RULINGS Q38d: decimal channel routing on every surface.
DECIMAL_ROUTING = [
    {"id": "DR-REPO-ORDER", "rule": "repository ORDER BY and range on a decimal attribute use the decimal_order_v1 key", "case": "DR-REPO-ORDER"},
    {"id": "DR-NATIVE-ORDER", "rule": "native ORDER BY and range in the lane language use the decimal_order_v1 key, never QLever's lexical canonical text", "case": "DR-NATIVE-ORDER"},
    {"id": "DR-RAW-ORDER", "rule": "raw recipes order and range on the documented decimal_order_v1 channel, never the lexical text", "case": "DR-RAW-ORDER"},
    {"id": "DR-DERIVED", "rule": "a derived decimal expression used for ordering or comparison is computed exactly in the kernel and encoded to TDK1 before it is compared", "case": "DR-DERIVED"},
    {"id": "DR-AGGREGATE", "rule": "SUM over decimals decodes the keys or canonical text, computes exactly, and encodes any decimal result used for ordering; MIN and MAX compare keys", "case": "DR-AGGREGATE"},
    {"id": "DR-KEY-ARITHMETIC", "rule": "arithmetic on key strings (summing or subtracting decimal_order_v1 values as text or numbers) is invalid: preflight E-MIXED-FAMILY", "case": "DR-KEY-ARITHMETIC"},
    {"id": "DR-JSON-OPAQUE", "rule": "a decimal-looking number inside a JSON value is opaque: it is never compared, ordered or summed as a decimal", "case": "DR-JSON-OPAQUE"},
    {"id": "DR-JSON-CONVERT", "rule": "an explicit conversion of a JSON number to a typed decimal (toDecimal with declared precision and scale) starts from the number's as-written reading (the read-back-as-written text of RULINGS Q33a), never its exact binary64 expansion, so toDecimal(json 0.1, 2, 1) = 0.1; it validates the result (E-DECIMAL-FRACTION, E-DECIMAL-OVERFLOW or E-INVALID-VALUE) and encodes the TDK1 key (RULINGS Q49e)", "case": "DR-JSON-CONVERT"},
    {"id": "DR-JSON-STRING-TEXT", "rule": "decimal text inside a JSON string is E-INVALID-VALUE where a decimal is required, unless the query converts the string explicitly (RULINGS Q49e); the explicitly converted half is a lane obligation, because O-REPLAY does not model text-to-decimal conversion (RULINGS Q66d)", "case": "DR-JSON-STRING-TEXT"},
]

# RULINGS Q22: one row per operator, conversion and scale change; every row is a named CS-DECIMAL case.
DECIMAL_OPS = [
    {"id": "DO-ADD", "op": "a + b, a - b (decimal(p1, s1), decimal(p2, s2))", "resultScale": "max(s1, s2)", "resultPrecision": "max(p1 - s1, p2 - s2) + max(s1, s2) + 1", "error": "E-DECIMAL-OVERFLOW when the result exceeds the target's declared precision or 38 digits", "case": "DEC-OP-ADD"},
    {"id": "DO-MUL", "op": "a * b", "resultScale": "s1 + s2", "resultPrecision": "p1 + p2", "error": "E-DECIMAL-OVERFLOW when the result exceeds the target's declared precision or 38 digits", "case": "DEC-OP-MUL"},
    {"id": "DO-DIV", "op": "divide(a, b, scale, rounding) with rounding one of half-even, half-up, down", "resultScale": "the named scale", "resultPrecision": "the target's declared precision", "error": "E-DIVISION-BY-ZERO for b = 0; E-DECIMAL-OVERFLOW beyond the precision; the one place rounding happens, and only when the caller names it", "case": "DEC-OP-DIVIDE"},
    {"id": "DO-BARE-DIV", "op": "a / b on decimals", "resultScale": "-", "resultPrecision": "-", "error": "preflight E-DECIMAL-BARE-DIVIDE", "case": "DEC-OP-BARE-DIVIDE"},
    {"id": "DO-ROUND", "op": "round(x, s, rounding)", "resultScale": "s", "resultPrecision": "p - (s_x - s) when s < s_x; p + (s - s_x), capped at 38, when s > s_x (exact: appends zeros, never refused); p when s = s_x", "error": "E-DECIMAL-OVERFLOW only when a carry exceeds the precision or the 38-digit cap", "case": "DEC-OP-ROUND"},
    {"id": "DO-CMP", "op": "= != < <= > >= between decimals", "resultScale": "-", "resultPrecision": "-", "error": "none; compares exact numeric value (1.50 = 1.5)", "case": "DEC-OP-COMPARE"},
    {"id": "DO-SUM", "op": "SUM over decimals (kernel; engine side only where a projection needs it)", "resultScale": "max scale of the inputs", "resultPrecision": "38", "error": "E-DECIMAL-OVERFLOW when the exact total exceeds 38 digits", "case": "DEC-OP-SUM"},
]
DECIMAL_CONVERSIONS = [
    {"id": "DC-I2D", "rule": "integer to decimal(p, s): exact when the integer fits p - s digits, else E-DECIMAL-OVERFLOW", "case": "DEC-CV-INT-TO-DEC"},
    {"id": "DC-D2I", "rule": "decimal to integer (toInteger): only when the fraction is zero, else E-DECIMAL-FRACTION unless the caller writes round(x, 0, rounding) first; a whole decimal outside the integer range is E-INTEGER-OVERFLOW (RULINGS Q43g)", "case": "DEC-CV-DEC-TO-INT"},
    {"id": "DC-D2N", "rule": "decimal to number: only through toNumber(x) (named, lossy, one correctly rounded binary64)", "case": "DEC-CV-DEC-TO-NUM"},
    {"id": "DC-N2D", "rule": "number to decimal: only through toDecimal(x, p, s, rounding); NaN and infinities never occur (rejected at write)", "case": "DEC-CV-NUM-TO-DEC"},
    {"id": "DC-T2D", "rule": "text to decimal at the write boundary: the canonical decimal grammar only; more fractional digits than s (counted on the value) is E-DECIMAL-FRACTION and more than p - s integer digits is E-DECIMAL-OVERFLOW, never rounded", "case": "DEC-CV-TEXT-TO-DEC"},
    {"id": "DC-IMPLICIT", "rule": "no implicit conversion between decimal and integer or number in any expression; mixing them is preflight E-MIXED-FAMILY (CMP-DECIMAL-CROSS)", "case": "DEC-CROSS-FAMILY-PREFLIGHT"},
]
DECIMAL_SCALE_EVOLUTION = [
    {"id": "DS-WIDEN", "rule": "a declaration change that admits every existing value is metadata-only: TDK1 keys depend on the value alone, so Q31g's key-compatibility condition always holds and no key is rewritten; stored values read back with the new declared scale (RULINGS Q35b, superseding Q31g's migration path)", "case": "DEC-SCALE-WIDEN"},
    {"id": "DS-WIDEN-MIGRATE", "rule": "a change under which some existing value no longer fits (for example integer digits p - s shrink) validates every live and historical value first and fails atomically with E-DECIMAL-NARROWING before any mutation; no key rewrite is ever needed", "case": "DEC-SCALE-WIDEN-MIGRATE"},
    {"id": "DS-NARROW", "rule": "narrowing precision or scale is a migration that fails atomically with E-DECIMAL-NARROWING, before any mutation, if any live or historical value would lose digits", "case": "DEC-SCALE-NARROW"},
]
DECIMAL_TESTS = ["DEC-ADJACENT-LARGE", "DEC-NEGATIVE", "DEC-ZERO", "DEC-SCALE-BOUNDARY", "DEC-INTERMEDIATE", "DEC-EVERY-PATH", "DEC-ORDER-KEY-INDEPENDENT", "DEC-INPUT-CAPTURE"]
DECIMAL_TEST_TEXT = {
    "DEC-ADJACENT-LARGE": "adjacent 38-digit decimals (differing in the last digit) stay distinct and ordered on every surface",
    "DEC-NEGATIVE": "negative values, including order across zero",
    "DEC-ZERO": "0, 0.00 and -0.00 are one value",
    "DEC-SCALE-BOUNDARY": "values with exactly s fractional digits and exactly p - s integer digits accepted; one more rejected",
    "DEC-INTERMEDIATE": "arithmetic intermediates are exact (no rounding before the final result)",
    "DEC-EVERY-PATH": "every query and serialization path (Triples, repository, native, raw hatch, feed, journal, backup and restore) round-trips exactly",
    "DEC-ORDER-KEY-INDEPENDENT": "an independent checker compares the order-key byte order with exact numeric order over the whole CS-DECIMAL corpus",
    "DEC-INPUT-CAPTURE": "the writer's captured input equals the caller's original typed input before normalization",
}

INTEGER_MIN_RANGE = 2 ** 53 - 1  # NUMERIC: every lane must accept every integer in [-(2^53-1), 2^53-1]
LANE_INTEGER_RANGE = {
    "xtdb": {"declared": "[-2^63, 2^63-1] (BIGINT)", "rule": "values inside are stored exactly; the lane may accept the whole core integer range"},
    "qlever": {"declared": "[-2^59, 2^59-1] (60-bit native integers; lexical channel exact)", "rule": "values outside are rejected at write with E-VALUE-OUT-OF-RANGE before any engine mutation (TARGETS section 3)"},
}
VALUE_KINDS = [
    {"kind": "string", "rule": "exact codepoint sequence; ill-formed UTF-16 rejected with E-INVALID-VALUE"},
    {"kind": "integer", "rule": "exact; every lane accepts at least [-(2^53-1), 2^53-1]; each lane declares its accepted range (LANE_INTEGER_RANGE); a value outside the lane's range fails the write with E-VALUE-OUT-OF-RANGE and leaves no residue; never wrapped, widened or rounded"},
    {"kind": "number", "rule": "binary64 for approximate, deterministic values only (for example a risk score), never business values; stored and read bit-exact; NaN and infinities rejected"},
    {"kind": "decimal", "rule": "value kind for money and business decimals (RULINGS Q18 as amended by Q35b, DECIMAL_RULES): the attribute declares precision and scale; one stored representation on both lanes, the TDK1 key (value-determined, order-preserving, channel decimal_order_v1) plus derived canonical text; exact storage and round trip; more fractional digits than the scale fail with E-DECIMAL-FRACTION, a value beyond the precision with E-DECIMAL-OVERFLOW, never rounded; its own family; arithmetic in the TypeScript kernel with exact decimal arithmetic"},
    {"kind": "boolean", "rule": "exact"},
    {"kind": "datetime", "rule": "exact epoch-millisecond instant including fractional milliseconds; values needing nanoseconds use ISO strings (NUMERIC table)"},
    {"kind": "ref", "rule": "exact target id"},
    {"kind": "json", "rule": "exact text with key order kept; canonical form for identity"},
    {"kind": "blob", "rule": "exact descriptor (mimeType, size, filename)"},
]
# RULINGS Q30a to Q30e (compiled by Q32a): wire exactness findings of EXP-F02.
WIRE_RULES = [
    {"id": "WR-JSON", "rule": "a user-supplied JSON value containing -0, a non-finite number, or a number that does not read back as written (its shortest round-trip binary64 rendering differs from the given text in canonical form, RULINGS Q33a: 0.1 accepted, 9007199254740993 rejected) is rejected at every qualified write route with E-INEXACT-JSON-NUMBER (InvalidTripleError / invalid-value, detail inexact-json-number), never normalized; the guard runs before CanonicalJson, whose canonical identity is unchanged; approximateNumbers: reject applies recursively inside List and Struct; the guard applies to user JSON only: JSON that Triplex generates (journal changes, metadata) never passes through it, and the journal encodes typed values losslessly, so a number -0 assertion commits, journals, replays and reads back bit-exact (RULINGS Q34c, AMB-04)", "source": "RULINGS Q30a, Q33a, Q34c", "cases": ["WIRE-JSON-NEGZERO", "WIRE-JSON-NONFINITE", "WIRE-JSON-INEXACT", "WIRE-JSON-NESTED-LIST", "WIRE-JSON-NESTED-STRUCT", "WIRE-JSON-BEFORE-CANONICAL", "Q33-JSON-READBACK", "WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP"]},
    {"id": "WR-INSTANT", "rule": "an instant given as -0 is rejected with E-NEGATIVE-ZERO-INSTANT (NoNegativeZero), never turned into 0", "source": "RULINGS Q30b", "cases": ["WIRE-INSTANT-NEGZERO"]},
    {"id": "WR-X-ENCODINGS", "rule": "ProjectionSpec pins the XTDB encodings F02 proved exact: card-many DOUBLE and integer lists are written as ARRAY[CAST(? AS <type>) ...], never as one JSON parameter; date and instant are read as text, never through the driver's TIMESTAMPTZ decoding; any other encoding fails the projection check", "source": "RULINGS Q30c", "cases": ["WIRE-X-DOUBLE-LIST-ARRAY", "WIRE-X-INTEGER-LIST-ARRAY", "WIRE-X-DATE-TEXT", "WIRE-X-INSTANT-TEXT", "WIRE-X-OTHER-ENCODING-FAILS"]},
    {"id": "WR-Q-SHADOW", "rule": "a QLever binary64 shadow counts as exact only if it is not -0 and parsing its %.13g rendering returns the same bits; integers only within +/-2^59; otherwise the lexical channel is authoritative and the shadow is flagged inexact (coarse pruning only, never an answer)", "source": "RULINGS Q30d", "cases": ["WIRE-Q-SHADOW-NEGZERO", "WIRE-Q-SHADOW-13G", "WIRE-Q-SHADOW-INT59", "WIRE-Q-LEXICAL-AUTHORITATIVE"]},
    {"id": "WR-INTEGER-RANGE", "rule": "the ProjectionSpec integer range rule is narrowed to its safe-integer domain [-(2^53-1), 2^53-1] (cosmetic)", "source": "RULINGS Q30e", "cases": ["WIRE-INTEGER-SAFE-RANGE"]},
]
RANGE_RULE = "Every attribute used in a range rule (for example 'pay rate at or above 16.50', 'hours over 40') has an order-preserving comparison on every surface that serves the rule: native exact types inside their exact range, or a documented order-preserving channel."

# ============================================================================ errors
# Every expected error is pinned here. 'existing' tags exist in the source tree today; 'new' tags are named by
# PLAN v1.1 or by this contract and must be implemented with exactly this tag and reason.
# RULINGS Q72f: one id per error; retired ids and their replacements.
RETIRED_ERRORS = {"E-UNAVAILABLE-CUT": {"was": "ReadError / unavailable-cut", "replacedBy": "E-BASIS-NOT-AVAILABLE", "moved": ["CURSOR_TRANSITIONS.permittedErrors CE-FUTURE-BASIS (G8.publish.basis-honesty, G10.cursor.continuation-transitions)"]}}
ERROR_REPRESENTATION = "BasisNotAvailable and ReplicaUnavailable have one representation: _tag BasisNotAvailable or ReplicaUnavailable with {required, observed, replica}; cause is optional; core gains these error classes and adapters return them (RULINGS Q67h)"
ERROR_TABLE = [
    {"id": "E-INTEGER-OVERFLOW", "tag": "QueryError", "reason": "integer-overflow", "phase": "execution", "status": "existing reason string (compiler.ts:572), tag frozen here"},
    {"id": "E-VALUE-OUT-OF-RANGE", "tag": "InvalidTripleError", "reason": "value-out-of-range", "phase": "preflight", "status": "new reason (NUMERIC): the value is valid Triplex but outside the lane's declared exact range; rejected before any engine mutation"},
    {"id": "E-NUMBER-OVERFLOW", "tag": "QueryError", "reason": "number-overflow", "phase": "execution", "status": "new"},
    {"id": "E-DIVISION-BY-ZERO", "tag": "QueryError", "reason": "division-by-zero", "phase": "execution", "status": "new (RULINGS Q8c)"},
    {"id": "E-INVALID-CONVERSION", "tag": "QueryError", "reason": "invalid-conversion", "phase": "execution", "status": "new"},
    {"id": "E-MIXED-FAMILY", "tag": "DatalogValidationError", "reason": "mixed-family", "phase": "preflight", "status": "existing class (compiler.ts:556); reason frozen here"},
    {"id": "E-INTEGER-AVG", "tag": "DatalogValidationError", "reason": "integer-avg-requires-conversion", "phase": "preflight", "status": "existing class (compiler.ts:1397); reason frozen here"},
    {"id": "E-INVALID-QUERY", "tag": "ParseError", "reason": "invalid-query", "phase": "preflight", "status": "existing class"},
    {"id": "E-UNBOUND", "tag": "UnboundVariableError", "reason": "unbound-variable", "phase": "preflight", "status": "existing class"},
    {"id": "E-CONTRACT-DECODE", "tag": "ReadError", "reason": "contract-decode-mismatch", "phase": "execution", "status": "new reason"},
    {"id": "E-ROW-LIMIT", "tag": "ReadError", "reason": "row-limit-exceeded", "phase": "execution", "status": "new reason (today ReadError text)"},
    {"id": "E-TIMEOUT", "tag": "ReadError", "reason": "deadline-exceeded", "phase": "execution", "status": "new reason"},
    {"id": "E-CANCELLED", "tag": "ReadError", "reason": "cancelled", "phase": "execution", "status": "new reason"},
    {"id": "E-READ-ONLY", "tag": "ReadError", "reason": "read-only-refused", "phase": "preflight", "status": "new reason"},
    {"id": "E-UNSUPPORTED-SHAPE", "tag": "ReadError", "reason": "outside-fragment-conditions", "phase": "preflight", "status": "new reason; never closes an obligation that needs the shape"},
    {"id": "E-ADMISSION", "tag": "ReadError", "reason": "admission-refused", "phase": "preflight", "status": "new reason"},
    {"id": "E-RECURSION-LIMIT", "tag": "ReadError", "reason": "recursion-limit", "phase": "execution", "status": "new reason (C8 bounds)"},
    {"id": "E-OVERLOAD", "tag": "ReadError", "reason": "overloaded", "phase": "admission", "status": "new reason (load overload policy)"},
    {"id": "E-CONFLICTING-VALUES", "tag": "ConflictingValuesError", "reason": "conflicting-values", "phase": "execution", "status": "new tag (PLAN C5.3); lists every conflicted entity and attribute"},
    {"id": "E-MAINTAINING", "tag": "Maintaining", "reason": "maintaining", "phase": "execution", "status": "new tag (PLAN C4.5)"},
    {"id": "E-REPAIRING", "tag": "Repairing", "reason": "repairing", "phase": "execution", "status": "new tag (PLAN C2.6)"},
    {"id": "E-BASIS-NOT-AVAILABLE", "tag": "BasisNotAvailable", "reason": "basis-not-reached", "phase": "execution", "shape": "{_tag: BasisNotAvailable, required, observed, replica, cause?} (RULINGS Q67h)", "status": "new tag (RULINGS Q55c, Q58a, Q72f): a read at a basis beyond the latest published position, or one the serving replica has not reached within the request deadline; the only id for that case (E-UNAVAILABLE-CUT is retired)"},
    {"id": "E-BASIS-NOT-RECONSTRUCTIBLE", "tag": "BasisNotReconstructible", "reason": "basis-not-reconstructible", "phase": "execution", "status": "new tag (RULINGS Q58a): a native read with an at: position the serving engine cannot reconstruct"},
    {"id": "E-REPLICA-UNAVAILABLE", "tag": "ReplicaUnavailable", "reason": "replica-unreachable", "phase": "execution", "shape": "{_tag: ReplicaUnavailable, required, observed, replica, cause?} (RULINGS Q67h)", "status": "new tag (RULINGS Q55c): a native read while the replica is unreachable"},
    {"id": "E-OVERLOADED", "tag": "Overloaded", "reason": "bound-exceeded", "phase": "admission", "status": "new tag (RULINGS Q50d, Q51a): a bounded per-subject queue or overlay is full; never an unbounded wait"},
    {"id": "E-DUAL-COMMIT-PATH", "tag": "WriteError", "reason": "dual-commit-path", "phase": "preflight", "status": "new reason (RULINGS Q51f): a scope written by both commit paths at once"},
    {"id": "E-COMMIT-PENDING", "tag": "CommitPending", "reason": "committed-not-published", "phase": "outcome", "status": "new tag (PLAN C2.7)"},
    {"id": "E-SCOPE-OWNER", "tag": "ReadError", "reason": "scope-ownership-mismatch", "phase": "preflight", "status": "new reason (PLAN C7.1); also raised on writes as WriteError with the same reason"},
    {"id": "E-CURSOR", "tag": "PaginationCursorError", "reason": "malformed|other-scope|other-query", "phase": "preflight", "status": "existing class; only the three reasons of CURSOR_TRANSITIONS.permittedErrors"},
    {"id": "E-COMMAND-COMMITTED", "tag": "CommandAlreadyCommittedError", "reason": "command-already-committed", "phase": "commit", "status": "existing class; carries the original txId"},
    {"id": "E-TX-CONFLICT", "tag": "TransactionConflictError", "reason": "precondition-failed", "phase": "commit", "status": "existing class"},
    {"id": "E-CONSTRAINT", "tag": "ConstraintViolationError", "reason": "required|cardinality|unique|reference-target", "phase": "commit", "status": "existing class; reason names the rule kind"},
    {"id": "E-INVALID-VALUE", "tag": "InvalidTripleError", "reason": "invalid-value", "phase": "preflight", "status": "existing class; also an empty valid interval (TM-EMPTY-REJECTED, AMB-12) and invalid integer text (AMB-14)"},
    {"id": "E-INEXACT-JSON-NUMBER", "tag": "InvalidTripleError", "reason": "invalid-value", "phase": "preflight", "status": "existing reason with detail inexact-json-number (RULINGS Q30a): -0, a non-finite number or an inexact binary64 inside a JSON value, at any depth"},
    {"id": "E-NEGATIVE-ZERO-INSTANT", "tag": "InvalidTripleError", "reason": "invalid-value", "phase": "preflight", "status": "existing reason with detail no-negative-zero (RULINGS Q30b): an instant given as -0"},
    {"id": "E-DECIMAL-OVERFLOW", "tag": "InvalidTripleError", "reason": "decimal-overflow", "phase": "preflight or execution", "status": "new reason (RULINGS Q22, Q35e): a written value or a result beyond the declared precision or 38 digits"},
    {"id": "E-DECIMAL-BARE-DIVIDE", "tag": "DatalogValidationError", "reason": "decimal-divide-requires-scale", "phase": "preflight", "status": "new reason (RULINGS Q22): bare / on decimals; use divide(a, b, scale, rounding)"},
    {"id": "E-DECIMAL-FRACTION", "tag": "InvalidTripleError", "reason": "decimal-fraction", "phase": "preflight", "status": "new reason (RULINGS Q22, Q35e): more fractional digits than the declared scale at write, or decimal to integer with a non-zero fraction and no round()"},
    {"id": "E-DECIMAL-AVG", "tag": "DatalogValidationError", "reason": "decimal-avg-requires-divide", "phase": "preflight", "status": "new reason (RULINGS Q33b R-DEC-7): AVG over decimal; write divide(SUM, COUNT, scale, rounding)"},
    {"id": "E-DECIMAL-NARROWING", "tag": "WriteError", "reason": "decimal-narrowing-loses-digits", "phase": "preflight", "status": "new reason (RULINGS Q22): a scale or precision narrowing would lose digits; the migration fails atomically"},
    {"id": "E-UNSUPPORTED-VALUE", "tag": "UnsupportedValueTypeError", "reason": "unsupported-value-type", "phase": "preflight", "status": "existing class"},
    {"id": "E-RESERVED", "tag": "WriteError", "reason": "reserved-namespace", "phase": "preflight", "status": "existing behavior; reason frozen here (RULINGS Q21 AMB-14)"},
    {"id": "E-OUTCOME-UNKNOWN", "tag": "TransactionOutcomeUnknown", "reason": "outcome-unknown", "phase": "outcome", "status": "existing class; carries operationId"},
]
ERROR_COMPARISON = "An expected error matches when the observed error's _tag equals the pinned tag and its reason equals the pinned reason (or one of the listed alternatives for multi-reason ids, the case names which), the original cause is retained, and no rows are returned. Any other error, a success, or partial rows is a FAIL."

# ============================================================================ write protocol transitions
COMMIT_OUTCOMES = {
    "source": "PLAN v1.1 C2 (QLever), XTDB adapter commit path (lab/research/R4 3.2, 3.7); acceptance review r1 finding 5",
    "witnessRule": "The expected outcome after a fault is chosen from the last transition with durable or engine-side evidence observed by the fault injector after the crash (the log file's records read back, the engine's committed transactions, the publication marker), never from the system's own claim. A transition the protocol declares but the receipt does not witness fails the case.",
    "variantRule": "every composition declares its source implementation and protocol variant (RULINGS Q55b): log-source (a host log or broker is the source of truth and an engine is its replica: the QLever lane's broker (C2), EXP-P2Q's host log, and XTDB behind the host log in EXP-P2B) or engine-source (the engine is the source: XTDB's native commit path); each variant has its own witnessed transition table and the composition's declared variant selects it",
    "log-source": {
        "transitions": [
            {"id": "QT0-RECEIVED", "evidence": "broker request log entry"},
            {"id": "QT1-VALIDATED", "evidence": "group member accepted against staged state (broker trace)"},
            {"id": "QT2-LOGGED", "evidence": "COMMIT record present in the log file after restart (fsync completed); this is the irrevocable decision"},
            {"id": "QT3-APPLY-SENT", "evidence": "update operation sent (broker trace)"},
            {"id": "QT4s-SOURCE-PUBLISHED", "evidence": "the source's decision is durable under its declared durability configuration and the source's own read surface (the broker's log reader or overlay) answers at the group's P; it may precede QT3 (RULINGS Q55b)"},
            {"id": "QT4r-REPLICA-APPLIED", "evidence": "the replica's publication marker for the group's P is visible in a query against the replica (RULINGS Q55b)"},
            {"id": "QT5-VERIFIED", "evidence": "complete expected effects and absences checked (broker trace and independent query through three access paths)"},
            {"id": "QT6-ACKED", "evidence": "caller received the success receipt"},
        ],
        "outcomes": [
            {"faultAfter": "QT0-RECEIVED or QT1-VALIDATED (no QT2 evidence)", "finalState": "the command is absent unless a later attempt commits it; it is never committed twice", "originalCaller": "typed failure or E-OUTCOME-UNKNOWN; never success", "retrySameCommandId": "evaluated as a fresh command (commits at most once in total)"},
            {"faultAfter": "QT2-LOGGED (no QT4s evidence)", "finalState": "the group MUST be published by recovery with the position decided at QT2; it can never become absent", "originalCaller": "E-OUTCOME-UNKNOWN or E-COMMIT-PENDING; never success before source publication (QT4s)", "retrySameCommandId": "before publication: E-COMMIT-PENDING or E-REPAIRING; after publication: the original success receipt (same txId and position)", "reads": "never show the group before publication; E-REPAIRING while fenced"},
            {"faultAfter": "QT3-APPLY-SENT (no QT4s evidence)", "finalState": "as QT2-LOGGED; partial permutation state must not be served: the lane fences and recovery re-applies or rebuilds", "originalCaller": "as QT2-LOGGED", "retrySameCommandId": "as QT2-LOGGED", "reads": "E-REPAIRING while fenced; after recovery all access paths agree"},
            {"faultAfter": "QT4s-SOURCE-PUBLISHED (no QT4r evidence)", "finalState": "published at the source; the replica catches up from the log and recovery never makes the group absent", "originalCaller": "success (the ACK may follow QT4s, RULINGS Q31e, Q55b) or E-OUTCOME-UNKNOWN", "retrySameCommandId": "the original success receipt", "reads": "repository pulls see the group by routing (replica, else overlay, else the source's log); native reads follow COMPOSITION readGuarantees; a replica behind the source is not a failure"},
            {"faultAfter": "QT4r-REPLICA-APPLIED (no QT5 evidence)", "finalState": "published at the source and the replica; recovery completes verification before any new write", "originalCaller": "E-OUTCOME-UNKNOWN or success", "retrySameCommandId": "the original success receipt", "reads": "show the group; E-REPAIRING while fenced"},
            {"faultAfter": "QT5-VERIFIED failure (verification mismatch)", "finalState": "lane fenced; recovery republishes the logged state; final state equals O-REPLAY with the group present", "originalCaller": "no success until recovery establishes publication", "retrySameCommandId": "E-REPAIRING until recovered, then the original success receipt", "reads": "E-REPAIRING while fenced"},
            {"faultAfter": "QT5-VERIFIED (no QT6 evidence): lost ACK", "finalState": "published", "originalCaller": "E-OUTCOME-UNKNOWN", "retrySameCommandId": "the original success receipt", "reads": "show the group"},
        ],
        "successRule": "A success receipt is valid only if its timestamp is after the group's QT4s-SOURCE-PUBLISHED evidence; a repository pull by the same client issued after the success receipt sees the group by routing, whether or not QT4r has been reached (read-your-writes, COMPOSITION readGuarantees).",
    },
    "engine-source": {
        "transitions": [
            {"id": "XT0-RECEIVED", "evidence": "client trace"},
            {"id": "XT1-BEGIN-SENT", "evidence": "driver trace"},
            {"id": "XT2-ENGINE-COMMITTED", "evidence": "the transaction is committed in the engine after restart (operation marker row present at its position)"},
            {"id": "XT3-ACKED", "evidence": "caller received the success receipt"},
        ],
        "outcomes": [
            {"faultAfter": "XT0 or XT1 (no XT2 evidence)", "finalState": "absent unless a later attempt commits it; never committed twice", "originalCaller": "typed failure or E-OUTCOME-UNKNOWN; never success", "retrySameCommandId": "evaluated as a fresh command"},
            {"faultAfter": "XT2-ENGINE-COMMITTED (no XT3 evidence): lost ACK", "finalState": "present exactly once at its position", "originalCaller": "E-OUTCOME-UNKNOWN; resolution through EP-RESOLVE returns committed", "retrySameCommandId": "E-COMMAND-COMMITTED carrying the original txId (or the original receipt)", "reads": "show the transaction (publication is atomic with commit)"},
        ],
        "successRule": "A success receipt is valid only after XT2 evidence; read-your-writes holds for the same client.",
    },
}

CURSOR_TRANSITIONS = {
    "source": "acceptance review r1 finding 15; response r1 decision 12 (old cursors and bases route to the exact ledger path)",
    "rule": "A cursor or a requested historical basis issued before any transition below continues successfully afterward (through the exact ledger path where the projection changed), returning exactly the rows O-REPLAY computes at the cursor's basis. An available retained cut never becomes unavailable because its projection, mapping or index changed.",
    "mustContinue": [
        {"id": "CT-ENGINE-RESTART", "transition": "engine restart"},
        {"id": "CT-CLIENT-REOPEN", "transition": "fresh runtime and client on the same scope"},
        {"id": "CT-RELEASE-CHANGE", "transition": "a new schema release is published; the cursor continues under its own release's mapping"},
        {"id": "CT-PROJECTION-REBUILD", "transition": "projection rebuilt or backfilled"},
        {"id": "CT-GENERATION-SWITCH", "transition": "projection or index generation switch"},
        {"id": "CT-PUBLICATION-ADVANCE", "transition": "newer commits published after the cursor's P"},
        {"id": "CT-MAINTAINING", "transition": "QLever marker in MAINTAINING"},
        {"id": "CT-BOUNDARY-PASS", "transition": "a valid-time boundary passes after the cursor was issued"},
        {"id": "CT-COMPACTION", "transition": "XTDB compaction or GC, QLever rebuild-index or checkpoint"},
        {"id": "CT-BROKER-FAILOVER", "transition": "broker replaced and recovery completed"},
        {"id": "CT-BACKUP-RESTORE", "transition": "restore into a fresh engine from a backup taken after the cursor was issued"},
        {"id": "CT-FENCE-RECOVERED", "transition": "lane fenced, then recovered: during the fence E-REPAIRING is permitted; after recovery the same cursor must continue"},
    ],
    "permittedErrors": [
        {"id": "CE-MALFORMED", "error": "E-CURSOR", "reason": "malformed", "when": "the token was altered or is not a token"},
        {"id": "CE-OTHER-SCOPE", "error": "E-CURSOR", "reason": "other-scope", "when": "the cursor belongs to another scope"},
        {"id": "CE-OTHER-QUERY", "error": "E-CURSOR", "reason": "other-query", "when": "the cursor belongs to a query with a different definition hash"},
        {"id": "CE-FUTURE-BASIS", "error": "E-BASIS-NOT-AVAILABLE", "reason": "basis-not-reached", "when": "the requested position is beyond the latest published position (RULINGS Q72f: E-UNAVAILABLE-CUT retired)"},
        {"id": "CE-FENCED", "error": "E-REPAIRING", "reason": "repairing", "when": "only while the lane is fenced; the case also asserts continuation after recovery"},
    ],
    "retention": "No retention policy exists, so 'cut no longer retained' is never a permitted outcome.",
}

# ============================================================================ thresholds (single registry)
# NS-* bars are TARGETS.md section 1 provisional bars, verbatim. 'derived' marks values this contract fixed because the
# targets give none; they are listed in ACCEPTANCE section 1 for review. Calibration may tighten any value; loosening
# one needs Sam (TARGETS threshold policy).
def th(kind, value, unit, bound, source):
    return {"kind": kind, "value": value, "unit": unit, "bound": bound, "source": source}


T1 = "lab/TARGETS.md section 1"
THRESHOLDS = {
    # ---- P1 (per surface)
    "NS-P1-VIOLATIONS-MAX": th("ns", 0, "correctness violations at every reader level", "max", T1 + " P1"),
    "NS-P1-GOODPUT-256-VS-64": th("ns", 1.0, "correctness-qualified read goodput at 256 readers divided by goodput at 64 readers", "min", T1 + " P1 (goodput does not fall from the 64-reader level)"),
    "NS-P1-READ-P99-256-MS": th("ns", 100, "ms read p99 at 256 readers", "max", T1 + " P1"),
    "NS-P1-WRITER-P99-RATIO-256": th("ns", 1.25, "writer commit p99 at 256 readers divided by its zero-reader baseline in the same run", "max", T1 + " P1"),
    "NS-P1-WRITER-WAIT-MAX-MS": th("ns", 2000, "ms, no command waits longer (every ladder level)", "max", T1 + " P1"),
    "NS-P1-GOODPUT-1024-VS-256": th("ns", 0.9, "read goodput at 1,024 readers divided by the 256 level", "min", T1 + " P1"),
    "NS-P1-WRITER-P99-RATIO-1024": th("ns", 2.0, "writer commit p99 at 1,024 readers divided by the zero-reader baseline", "max", T1 + " P1"),
    "NS-P1-RECOVERY-MS": th("ns", 60000, "ms after stress until an evaluation window meets every 256-level P1 bar", "max", T1 + " P1"),
    # ---- P2 (per engine)
    "NS-P2-COMMIT-P50-MS": th("ns", 10, "ms commit p50 from scheduled offer to published ACK, applied separately to the trace commands of the 5-to-10 and 11-to-25 fact bands, 256 readers running", "max", T1 + " P2; TARGETS 1.1 P2 items 1 and 2"),
    "NS-P2-COMMIT-P99-MS": th("ns", 50, "ms commit p99 from scheduled offer to published ACK, applied separately to the 5-to-10 and 11-to-25 fact bands, 256 readers running", "max", T1 + " P2; TARGETS 1.1 P2 items 1 and 2"),
    "NS-P2-COMMIT-P99-26-50-MS": th("ns", 100, "ms commit p99 from scheduled offer to published ACK for the 26-to-50 fact band (provisional)", "max", "lab/TARGETS.md 1.1 P2 item 2 (provisional)"),
    "NS-P2-UNACCOUNTED-MAX": th("ns", 0, "offered commands with no receipt, typed error or typed conflict", "max", "lab/TARGETS.md 1.1 P2 item 3"),
    "NS-P2-UNJUSTIFIED-OUTCOMES-MAX": th("ns", 0, "oracle-valid trace commands that did not publish: typed rejections of commands the trace did not mark invalid, plus typed conflicts where the oracle finds no compare-and-set race", "max", "RULINGS Q31a; lab/TARGETS.md 1.1 P2 item 4"),
    "NS-P2-QUEUE-MAX-S": th("ns", 2, "s of the offered rate: queued (offered, not yet published) commands at any steady-state instant, divided by the steady offered rate", "max", "RULINGS Q31a; lab/TARGETS.md 1.1 P2 item 4"),
    "NS-P2-BURST-DRAIN-S": th("ns", 60, "s after each burst ends until the queue is back within NS-P2-QUEUE-MAX-S", "max", "RULINGS Q31a; lab/TARGETS.md 1.1 P2 item 4"),
    "NS-P2-RYOW-FRACTION": th("ns", 1.0, "fraction of pulls at the returned tx that see the commit with no extra wait", "min", T1 + " P2"),
    "NS-P2-DUP-RECEIPT-FRACTION": th("ns", 1.0, "fraction of duplicates and lost-ACK retries that return the original receipt", "min", T1 + " P2"),
    # ---- P3 (per engine)
    "NS-P3-GAPS-MAX": th("ns", 0, "feed gaps per run", "max", T1 + " P3"),
    "NS-P3-ORDER-VIOLATIONS-MAX": th("ns", 0, "per-subject order violations per run", "max", T1 + " P3"),
    "NS-P3-LAG-P99-MS": th("ns", 250, "ms p99 from commit time (the source's publication instant on the shared host monotonic clock) to the consumer's single durable write of the affected-subject set and its checkpoint, 256 readers running", "max", T1 + " P3; TARGETS 1.1 P3 items 1 and 4"),
    "NS-P3-VISIBLE-DUP-EFFECTS-MAX": th("ns", 0, "externally visible duplicate consumer effects per run (replay attempts are counted separately and allowed)", "max", "lab/TARGETS.md 1.1 P3 item 5"),
    # ---- P4 (per surface)
    "NS-P4-PULL-P50-MS": th("ns", 5, "ms single-client subject pull p50 at the current basis over the frozen weighted bucket mix", "max", T1 + " P4; TARGETS 1.1 P4 item 1"),
    "NS-P4-PULL-P99-MS": th("ns", 25, "ms single-client subject pull p99 over the frozen weighted bucket mix", "max", T1 + " P4; TARGETS 1.1 P4 item 1"),
    "NS-P4-PULL-P99-LARGEST-MS": th("ns", 50, "ms pull p99 of the largest bucket (801 to 2,000 facts), provisional", "max", "lab/TARGETS.md 1.1 P4 item 1 (provisional)"),
    "NS-P4-PULLS-PER-CORE": th("ns", 1100, "pulls/s per engine core, cores = the CPU quota bound in the receipt; host broker and kernel CPU reported beside it", "min", T1 + " P4; TARGETS 1.1 P4 item 3"),
    "NS-P4-HISTORY-FLATNESS": th("ns", 1.1, "current-pull p99 latency and bytes read at history depth 10 divided by depth 1, on one matched sample of 1,000 subjects grown from depth 1 to 3 to 10", "max", "RULINGS Q16, Q27; lab/TARGETS.md 1.1 P4 item 2"),
    # ---- P5 (per surface)
    "NS-P5-SWEEP-S": th("ns", 100, "s wall time for the release sweep: W0 evaluation of release R for 100k in-scope subjects at one shared basis, including outbox publication", "max", T1 + " P5; TARGETS 1.1 P5 items 1 and 5"),
    "NS-P5-LIVE-READ-P99-RATIO": th("ns", 1.5, "live read p99 during the sweep divided by no-sweep", "max", T1 + " P5"),
    "NS-P5-WRITER-P99-RATIO": th("ns", 1.5, "writer commit p99 during the sweep divided by no-sweep", "max", T1 + " P5"),
    # ---- secondary (TARGETS section 1)
    "NS-SEC-BULK-READ-P99-RATIO": th("ns", 1.5, "live read p99 during a 1M-fact bulk import divided by without", "max", T1 + " secondary measurements"),
    # ---- non-NS, derived from the NS bars
    "T-DRAIN-MS": th("observe", 2000, "ms from cancel request to the engine no longer listing the statement", "max", "derived from NS-P1-WRITER-WAIT-MAX-MS"),
    "T-DEADLINE-GRACE-MS": th("observe", 100, "ms past timeoutMs for the typed timeout to reach the caller", "max", "derived from NS-P1-READ-P99-256-MS"),
    "T-PLANNER-MEM-BYTES": th("observe", 3758096384, "bytes of engine memory during a refused query (slot cap 3.5 GiB)", "max", "lab/PLAN.md section 8 heavy slot cap"),
    "T-AVAIL-WINDOW-MS": th("observe", 60000, "ms until writes and reads succeed after a resource failure", "max", "derived from NS-P1-RECOVERY-MS"),
    "T-CONN-RELEASE-MS": th("observe", 5000, "ms after close for the engine-side connection count to return to baseline", "max", "derived"),
    "T-RECURSION-P99-MS": th("secondary", 1000, "ms p99, single client, recursion topologies at the rung", "max", "derived (no recursion bar in TARGETS)"),
    "T-LAT-RATIO-10M-1M": th("secondary", 1.1, "p50 latency at 10m divided by 1m, key-bounded classes", "max", "derived from NS-P4-HISTORY-FLATNESS"),
    "T-DEEP-PAGE-RATIO": th("secondary", 2.0, "p50 cost of page 10,000 divided by page 1", "max", "derived (keyset continuation, GS.18 stable cursors)"),
    "T-WATERMARK-WAIT-MS": th("observe", 10, "ms a read may wait for an eligible index before routing to a deadline-aware fallback; the fallback latency counts in the read's own latency", "max", "RULINGS Q31d; lab/TARGETS.md 4.1 item 5"),
    "W0-R2-CHANGED-SHARE": th("coverage", 0.20, "share of R2's in-scope subjects whose outputs R2 changes against R1", "min", "RULINGS Q31i; lab/TARGETS.md 6.1 item 6 (provisional)"),
    "W0-RULE-FIRE-SHARE": th("coverage", 0.05, "share of subjects for which each W0 rule fires (every rule separately)", "min", "RULINGS Q31i; lab/TARGETS.md 6.1 item 6 (provisional)"),
    "W0-LOCATIONS-100K": th("coverage", 2000, "work locations at the 100k rung", "min", "RULINGS Q31i; lab/TARGETS.md 6.1 item 6 (provisional)"),
    "W0-LOCATION-ZIPF-S": th("coverage", 0.5, "Zipf exponent of the seeded worker-to-location fanout at the 100k rung (fixed, not a bound to beat; other rungs N / 50 locations with the same s)", "eq", "RULINGS Q31i, Q36g, Q36h; lab/TARGETS.md 6.1 item 6"),
    "W0-MULTI-WORK-ITEM-SHARE": th("coverage", 0.01, "share of evaluations that each produce three or more work items", "min", "RULINGS Q31i; lab/TARGETS.md 6.1 item 6 (provisional)"),
    "T-REUSE-AVOIDED": th("witness", 0.5, "engine work units of a reused read divided by the first read at the same key", "max", "derived (positive reuse witness)"),
    "T-INCR-WORK": th("witness", 0.01, "engine work for a one-entity change divided by full recomputation, at the 1m rung", "max", "derived (incremental maintenance witness)"),
    "T-FAULT-REPS": th("count", 3, "injections per fault point", "min", "derived"),
    "T-SAMPLES-PER-FAMILY": th("count", 1000, "deterministic samples per query family per rung", "min", "derived (review r1 finding 10: scale samples need a minimum)"),
    "T-SAMPLES-PER-STRATUM": th("count", 50, "samples per population stratum per family where it applies", "min", "derived"),
    "T-RUNS": th("count", 3, "independent runs per measurement", "min", "qualification/benchmark-contract.json independentRuns"),
}
CALIBRATION_RULE = "Calibration may only tighten a threshold (a smaller max, a larger min) or record it UNATTAINABLE with the measurement. Loosening any value needs Sam (TARGETS threshold policy); until he rules, the obligation stays OPEN."
THRESHOLD_RULE_FOR_KIND = {"ns": ("CR-NS", "CR-GS"), "perf": ("CR-PERF",), "observe": ("CR-OBSERVE",), "count": (), "witness": ("CR-WITNESS",), "secondary": ("CR-METRICS",), "coverage": ("CR-W0-COVERAGE",)}
SECONDARY_RULE = "A secondary threshold (RULINGS Q25) is measured and reported against its value every run; missing it never fails or blocks an obligation, and it never feeds a closure rule other than CR-METRICS."

# ============================================================================ oracles
ORACLES = {
    "O-EVT": {"status": "EXISTS", "files": ["qualification/workloads/event_oracles.py", "qualification/workloads/validate_workloads.py"],
              "comparator": "CMP-SET-ROWS",
              "spec": "expected_rows for the 71 packet cases from immutable events, parameters and two-time cuts; validate_workloads.py re-derives all 71",
              "independence": "Python, imports no Triplex code"},
    "O-REPLAY": {"status": "BUILT-ACCEPTED", "files": ["lab/oracles/replay/"], "comparator": "per case (CMP-SET-ROWS, CMP-BAG-ROWS, CMP-EXACT-VALUE, CMP-ERROR, CMP-PAGES)",
                 "spec": "ACCEPTANCE 6.1", "independence": "Python stdlib only; imports no production visibility, constraint, projection, hydration or codec code"},
    "O-HAM": {"status": "EXISTS", "files": ["qualification/capacity/historical-assertion-metadata-v1/oracle.mjs", "qualification/capacity/historical-assertion-metadata-v2/oracle.mjs"],
              "comparator": "CMP-EXACT-VALUE", "spec": "finite-nine snapshot metadata", "independence": "Node only; must be re-verified to import no Triplex code before ACCEPTED"},
    "O-CFG8": {"status": "EXISTS", "files": ["qualification/capacity/configured-entities-v1/oracle.mjs"], "comparator": "CMP-EXACT-VALUE",
               "spec": "configured-eight fixture (52 checks, 5 retained failing targets)", "independence": "Node only; runtime ids only from receipts"},
    "O-STR": {"status": "EXISTS", "files": ["qualification/extensions/string-order-v1/oracle.json", "qualification/extensions/string-order-v1/policy.json"], "comparator": "CMP-ORDERED-ROWS",
              "spec": "frozen codepoint arrays", "independence": "authored before execution"},
    "O-COLL": {"status": "EXISTS", "files": ["qualification/native-controls/qlever-collation-tiny-v1/oracle.json"], "comparator": "CMP-ORDERED-ROWS",
               "spec": "tiny collation control", "independence": "authored before execution"},
    "O-SHAPE": {"status": "TO-AUTHOR", "files": ["lab/acceptance/cases/shape-controls.json"], "comparator": "declared per case",
                "spec": "ACCEPTANCE 6.2", "independence": "hand-authored with citations, frozen before execution, cross-checked by O-REPLAY"},
    "O-ERR": {"status": "COMPILED", "files": ["lab/acceptance/obligations.json#errorTable"], "comparator": "CMP-ERROR",
              "spec": "ERROR_TABLE and ERROR_COMPARISON in this contract", "independence": "pinned by this contract"},
    "O-OBS": {"status": "TO-BUILD", "files": ["lab/acceptance/oracle/observe.py"], "comparator": "verdict per protocol",
              "spec": "ACCEPTANCE 6.3 (protocols OBS-*)", "independence": "evaluates engine-side evidence, never the client's own counters"},
    "O-PLAN": {"status": "TO-BUILD", "files": ["lab/acceptance/oracle/plan.py"], "comparator": "verdict per protocol",
               "spec": "ACCEPTANCE 6.4 (route and access-path verdicts)", "independence": "expected route computed from the C1 conditions by O-REPLAY's eligibility model, not by the system"},
    "O-SPEC": {"status": "TO-AUTHOR", "files": ["lab/acceptance/cases/type-witnesses/"], "comparator": "CMP-DIAGNOSTICS",
               "spec": "ACCEPTANCE 6.5", "independence": "tsc on packed public declarations only"},
    "O-HAND": {"status": "TO-AUTHOR", "files": ["lab/acceptance/cases/hand-derivations/"], "comparator": "declared per case",
               "spec": "a frozen hand derivation: the expected answer worked out by hand from the scenario's seeded generator spec, independently reviewed and hash-pinned before any run", "independence": "never derived from a system under test"},
    "O-DOMAIN": {"status": "BUILT-ACCEPTED", "files": ["lab/oracles/domain/"], "comparator": "per case (CMP-SET-ROWS for affected subjects and work items, CMP-ORDERED-ROWS for effect traces, CMP-EXACT-VALUE for due times)",
                 "spec": "WORLD_W0 (TARGETS 6.1): expected next tasks, obligations with due times, work items, affected-subject sets and effect traces from the same command stream", "independence": "Python stdlib only; imports no Triplex, kernel or engine code; shares only the W0 rule text and the command stream"},
    "O-CONTRACT": {"status": "COMPILED", "files": ["lab/acceptance/obligations.json#evaluatorCounterexamples"], "comparator": "verdict equality",
                   "spec": "the verdict the status algorithm must return for each EVALUATOR_COUNTEREXAMPLES receipt set (OPEN)", "independence": "pinned by this contract"},
    "O-TDK1": {"status": "BUILT", "files": ["lab/oracles/decimal/"], "comparator": "CMP-ORDERED-ROWS for orders, CMP-EXACT-VALUE for keys and decodes",
               "spec": "TDK1 (R20 section 6): the Python reference encoder and exact-rational order (fractions.Fraction) from R20's raw material, brought into the repository", "independence": "Python stdlib only; imports no Triplex code"},
    "O-TESTKIT": {"status": "EXISTS", "files": ["packages/testkit/src/index.ts"], "comparator": "testkit checks",
                  "spec": "authored expectations inside the 44 shared cases", "independence": "literal expectations; KV is a regression participant only"},
    "O-KV": {"status": "EXISTS", "files": ["packages/core/src/kv/"], "comparator": "differential only",
             "spec": "regression participant", "independence": "NOT independent; never the sole oracle"},
}
COMPARATORS = {
    "CMP-SET-ROWS": "sorted unique canonical rows equal (packet runner semantics: runner.ts:900-912)",
    "CMP-BAG-ROWS": "multisets of canonical rows equal",
    "CMP-ORDERED-ROWS": "sequences of canonical rows equal, order included",
    "CMP-EXACT-VALUE": "typed values equal: integers exactly, decimals by exact value and declared scale, binary64 bit patterns (sign of zero included), text codepoints, datetime instants, json canonical text plus original key order where the case says so",
    "CMP-ERROR": ERROR_COMPARISON,
    "CMP-PAGES": "the page sequence equals the expected sequence: same rows per page, no duplicate or skipped row, same returned basis on every page",
    "CMP-DIAGNOSTICS": "the set of {file, line, column, code} diagnostics equals the expected set exactly",
}

# ============================================================================ entrypoints and profiles
ENTRYPOINTS = {
    "EP-TRIPLES": "Public Triples service (packages/core/src/store/Triples.ts) over the lane Runtime (`.layer({scope, capabilities})`).",
    "EP-REPO": "Entity repository Repository<Model>: at(basis), get, getMany, find({where, include, limit, cursor}) with range predicates on every ordered family including integer (RS-FIND-RANGE), timeline (public core entity subpath; the receipt records the exported symbol and module). Its subject pull is the P4 read shape.",
    "EP-WRITER": "Writer -> WritePlan -> commit(plans, {actor, commandId}); one command is about one subject.",
    "EP-KERNEL": "The TypeScript kernel that evaluates rule comparisons and per-subject arithmetic over values read from the store (exact BigInt and decimal arithmetic); the receipt records the exported function.",
    "EP-FEED": "The ordered, resumable change feed: entries carry tx, entity, attribute and the valid-time range affected; consumers resume from a checkpoint.",
    "EP-BULK": "The separate, throttled bulk-import lane (a qualified write route, RULINGS Q23).",
    "EP-REPLAY": "Replay, rebuild and restore routes: log-of-record replay, index rebuild and backup restore (qualified write routes, RULINGS Q23).",
    "EP-OUTBOX": "The atomic outbox path that publishes work items and effects with the commit; receivers deduplicate by delivery key.",
    "EP-STORAGE-DIRECT": "Direct storage-level access from one tenant's route to another tenant's storage (files, database, index), used only to test refusal (GS.15).",
    "EP-EVALUATOR": "The contract evaluator under lab/bin that computes obligation status from receipts (STATUS_ALGORITHM).",
    "EP-NATIVE": "The lane's native surface with helper fragments: xtdb-xtql `select`, xtdb-sql `selectSql`, qlever-sparql native SPARQL.",
    "EP-RAW-HATCH": "The qualified raw escape hatch through Triplex (native.xtql``, native.sql``, native.sparql`` with declared contract), text using only names published in the raw-query guide.",
    "EP-RAW-WIRE": "Direct engine protocol with no Triplex code (pgwire; SPARQL 1.1 Protocol), against the documented raw dataset; a diagnostic surface, never a qualified write route (RULINGS Q23); unqualified during QLever MAINTAINING (C4.5).",
    "EP-RESOLVE": "Operation and command resolution for unknown outcomes.",
    "EP-EXPLAIN": "Public plan and route capture for repository queries and native reads.",
    "EP-PKG": "Packed tarballs installed in a clean consumer outside the workspace; only public exports imported.",
    "EP-ENGINE-ADMIN": "Engine administrative and update routes (QLever update endpoint with and without the broker token, rebuild-index, checkpoint), used only to test refusal (C3).",
    "EP-ENGINE-OBS": "Engine-side observation only (metrics, logs, active queries, connection lists, container stats).",
}
PROFILES = {
    "P-STATIC": "No engine; packed public declarations and sources.",
    "P-TINY": "Fresh scope on the dev slot, at most 1,000 entities, single client; modes as the obligation states (current, reopen, engine-restart).",
    "P-TINY-CONC": "P-TINY plus controlled concurrent actors (a writer between calls, 16-way races).",
    "P-HEAVY": "Exclusive slot, at least 1m entities or a declared synthetic long-running query.",
    "P-FAULT": "Exclusive slot with fault injection at declared transitions, restart and recovery.",
    "P-RUNG-1M": "The 1m-subject rung of SCALE_POPULATION.",
    "P-RUNGS": "Every rung of SCALE_POPULATION in order: 10k, 100k, 1m, 10m subjects.",
    "P-YEAR-ONE": "The year-one measurement population of SCALE_POPULATION at the 10m rung (10m entities, 100m active facts, retained history). It is the size the priorities are measured at, not a target in itself.",
    "P-NS": "load-contract.json (fixed writer trace, P1 reader ladder, P2 to P4 probes, P5 sweep) on P-YEAR-ONE, one identified profile and composition, with the acceptance windows (120 s warmup, 600 s per ladder level).",
    "P-SCREEN": "Screening run of P-NS with 30 s warmup and 120 s per ladder level, for candidate comparison only (RULINGS Q16). A P-SCREEN receipt can never close an obligation, never feeds calibration, and never carries forward.",
}
SCREENING_PROFILES = ["P-SCREEN"]

# ============================================================================ year-one measurement population
SCALE_POPULATION = {
    "source": "lab/TARGETS.md section 2 (year-one scale; rungs 10k, 100k, 1m, 10m) and section 1 P4 (history depths 1, 3, 10); qualification/benchmark-contract.json (topologies, query families); acceptance review r1 finding 13",
    "role": "measurement size for P1 to P5 and the golden scenarios; not a target in itself (lab/SCOPE.md section 2 item 2)",
    "rungs": [10000, 100000, 1000000, 10000000],
    "scaling": "every count and stratum scales proportionally with the rung; hub in-degree is 1% of the rung's entities; shares are identical at every rung",
    "writtenThrough": "public writes (EP-WRITER, or EP-BULK for the initial load), every command ACKed with a receipt, no unresolved outcome",
    "atYearOne": {"entities": 10000000, "activeDomainFacts": 100000000, "retainedFactsMin": 150000000, "retainedFactsNote": "TARGETS section 2: retained history 150M to 500M facts per year; the history strata below give about 162M retained facts"},
    "factsPerEntity": "10 active domain facts: label (string), risk score (number, approximate), pay rate (decimal, scale 2), hours (integer), headcount (integer), flag (boolean), group (ref), category (string, skewed), start date (datetime), status changed at (datetime)",
    "tenants": [{"id": "TN-LARGE", "rule": "one tenant with 1m entities"}, {"id": "TN-SMALL", "rule": "1,000 tenants with 1k entities each"}, {"id": "TN-REST", "rule": "the remaining entities in one default tenant"}],
    "historyStrata": [
        {"id": "H1", "share": 0.50, "rule": "depth 1: no correction"},
        {"id": "H3", "share": 0.35, "rule": "depth 3: two corrections on each of five attributes"},
        {"id": "H10", "share": 0.15, "rule": "depth 10: nine corrections on each of two attributes"},
    ],
    "otherEvents": [
        {"id": "EV-PRESENCE", "rule": "1 entity per 1,000 toggles presence true -> false -> true"},
        {"id": "EV-RETRO", "rule": "1% of commands are valid-time corrections 30 days back (TARGETS section 2)"},
        {"id": "EV-VALID-FUTURE", "rule": "5% of entities hold a fact whose validTo falls inside the measurement window"},
        {"id": "EV-VALID-PAST", "rule": "5% of entities hold a fact already closed by valid time"},
        {"id": "EV-SAME-R", "rule": "1 command per 10,000 shares its recorded instant with the next command"},
        {"id": "EV-DECREASING-R", "rule": "1 command per 10,000 is written by a second runtime whose clock is behind"},
        {"id": "EV-NESTED", "rule": "1 command per 10,000 is a nested transaction holding two positions"},
        {"id": "EV-UNHOLDABLE", "rule": "write attempts of values a lane cannot hold (integers beyond its declared range, decimals beyond scale) appear in the stream and must fail typed"},
    ],
    "topology": [
        {"id": "TP-CHAIN", "rule": "1,000 chains of depth 50 (at 10m; proportional below)"},
        {"id": "TP-TREE", "rule": "1,000 trees, fanout 4, depth 6"},
        {"id": "TP-DIAMOND", "rule": "10,000 diamonds"},
        {"id": "TP-CYCLE", "rule": "1,000 cycles of length 3 to 20"},
        {"id": "TP-FANOUT", "rule": "10 hubs, each with incoming refs from 1% of entities"},
        {"id": "TP-SKEW", "rule": "category Zipf s = 1.1 over 1,000 values; flag about 50% true"},
        {"id": "TP-PULL", "rule": "every subject's pull subgraph spans 3 to 6 hops and 50 to 2,000 facts (TARGETS P4)"},
    ],
    "resultCardinality": [{"id": "RC-S", "rule": "exactly 1 row"}, {"id": "RC-M", "rule": "100 to 1,000 rows"}, {"id": "RC-L", "rule": "at least 100,000 rows or the documented row limit (E-ROW-LIMIT beyond)"}],
    "separateCounts": ["entities per tenant", "domain facts", "structural facts", "assertion versions and retirements", "config facts", "journal, claim, receipt and feed metadata", "maintenance relations", "engine rows or triples by physical role", "edges", "presence events", "corrections"],
    "correctness": "S.correctness.query-families runs per rung, at least T-SAMPLES-PER-FAMILY samples per family with at least T-SAMPLES-PER-STRATUM in every applicable stratum (history, topology, tenant, result cardinality), plus complete-count queries for every population; deterministic sample selection from the generator seed, never from query answers.",
}

# ============================================================================ capability matrix (data)
# Columns: x_raw x_frag s_raw s_frag q_raw q_frag repo_x repo_q
COLS = ["x_raw", "x_frag", "s_raw", "s_frag", "q_raw", "q_frag", "repo_x", "repo_q"]
COL_LANE = {"x_raw": "xtdb-xtql", "x_frag": "xtdb-xtql", "s_raw": "xtdb-sql", "s_frag": "xtdb-sql", "q_raw": "qlever-sparql", "q_frag": "qlever-sparql", "repo_x": "xtdb", "repo_q": "qlever"}
COL_SURFACE = {"x_raw": "raw", "s_raw": "raw", "q_raw": "raw", "x_frag": "frag", "s_frag": "frag", "q_frag": "frag", "repo_x": "repo", "repo_q": "repo"}

KNOWN_LIMITS = {
    "KL-X1": ("XTDB 2.2.0", "SUM over BIGINT accumulates with unchecked addition and wraps silently; scalar + and * are overflow-checked", "references/xtdb/core/src/main/kotlin/xtdb/arrow/LongVector.kt:30-33 @ c6c1962; lab/research/R6-xtdb-gap-analysis.md finding 2 (source only, not probed)"),
    "KL-X2": ("XTDB 2.2.0", "aggregate and rank window functions fail with AbstractMethodError; frames unsupported; one window function per query", "lab/research/R1-xtdb-capabilities.md Q4 (probed)"),
    "KL-X3": ("XTDB 2.2.0", "XTQL union-all parses but cannot be planned", "lab/research/R1-xtdb-capabilities.md Q4 (probed)"),
    "KL-X4": ("XTDB 2.2.0", "recursive CTEs rejected; XTQL has no recursion", "lab/research/R6-xtdb-gap-analysis.md 3.3"),
    "KL-X6": ("postgres 3.4.9 driver", "TIMESTAMP WITH TIME ZONE decoded to millisecond Date; TIMESTAMP without zone parsed in the local zone", "lab/research/R1-xtdb-capabilities.md Q3 (probed)"),
    "KL-X7": ("XTDB 2.2.0", "a DECIMAL aggregate failed: MAX(CAST(v AS DECIMAL(32,0))) raised No method in multimethod 'set-value-code' :decimal", "packages/xtdb/experiments/query/integer-extrema-1793974552733.json (probe in checkout)"),
    "KL-X9": ("XTDB 2.2.0", "a DECIMAL value read back as BIGINT (or any numeric client type) is rounded through a double: 1e18 + 4 reads back as 1e18; exact sums read DECIMAL as text", "lab/experiments/EXP-X02 (RULINGS Q39a); packages/core/src/datalog/compiler.ts:572 checked by EXP-R02"),
    "KL-X8": ("current XTDB layout", "Triplex R is not engine system time; FOR SYSTEM_TIME answers Triplex bases only at physical commit boundaries", "lab/research/R6-xtdb-gap-analysis.md 3.4; R1 Q1"),
    "KL-Q1": ("QLever 0.6.0", "integers are 60-bit; integer values outside +/-2^59 wrap silently unless the writer rejects them first", "lab/research/R2-qlever-capabilities.md 4.1 (probed)"),
    "KL-Q2": ("QLever 0.6.0", "integer + and * wrap in 60 bits without an overflow check", "R2 4.1 arithmetic (probed)"),
    "KL-Q3": ("QLever 0.6.0", "decimal and double stored with a 49-bit mantissa, exported with 13 significant digits", "R2 4.1 (probed)"),
    "KL-Q4": ("QLever 0.6.0", "comparison across numeric types converts to double", "R2 4.1 (probed)"),
    "KL-Q5": ("QLever 0.6.0", "xsd:dateTime keeps milliseconds only and compares local clock fields first", "R2 4.1 (probed)"),
    "KL-Q7": ("QLever 0.6.0", "one ICU en_US comparator; raw ORDER BY STR and string ranges are not codepoint order", "lab/research/R5-qlever-semantic-blockers.md 3.1 (probed); qualification/reviews/qlever-public-string-v6-terminal-independent.json"),
    "KL-Q8": ("QLever 0.6.0", "EXISTS argument planned uncorrelated; a variable correlated only through an inner FILTER is unbound", "R5 1, 4 (probed); wiki/problems/native-correlation.md"),
    "KL-Q9": ("QLever 0.6.0", "planner memory grows geometrically with EXISTS count, not capped by -m", "R2 3.3, 6.5 (probed)"),
    "KL-Q12": ("QLever 0.6.0", "a query without FROM reads the deduplicated union of all graphs", "R2 1.2 (probed)"),
    "KL-Q14": ("QLever 0.6.0", "division always returns a double; division by zero is UNDEF", "R2 4.1 arithmetic"),
    "KL-Q15": ("QLever 0.6.0", "integer sums wrap past 2^59", "R2 4.2"),
    "KL-Q16": ("QLever 0.6.0", "timeouts are cooperative (sort not interruptible); cancellation is WebSocket only", "R2 6.4 (probed); wiki/problems/cancellation-observation-levels.md"),
}


def row(n, op, typ, exact, raw_req, frag_cov, required_by, cells=None, note=None, if_offered=False):
    return {"n": n, "op": op, "type": typ, "exactness": exact, "rawRequired": raw_req, "fragmentCoverage": frag_cov,
            "requiredBy": required_by, "cells": cells or {}, "note": note, "ifOffered": if_offered}


REJECT_Q = ("NA", "QLever rejects integers beyond +/-2^59 at write (E-VALUE-OUT-OF-RANGE, G1.types.out-of-range-rejected), so no such value is stored")
# cell override: ("KL", [ids], note) | ("NA", reason) | ("NOTE", note)
MATRIX_ROWS = [
    row(1, "= filter", "text", "exact", True, True, ["R.raw.parity", "R.repo.entity-suite"]),
    row(2, "= filter", "integer |v| <= 2^53-1", "exact", True, True, ["R.raw.parity", "G1.types.value-kinds-roundtrip"]),
    row(3, "= filter", "integer 2^53 <= |v| < 2^59", "exact where the lane accepts the value", True, True, ["R.raw.parity", "G1.types.storage-widening-safe"],
        {"x_raw": ("NOTE", "documented columns are monomorphic, so the union-column rounding of R1 Q3 cannot arise"), "s_raw": ("NOTE", "same")}),
    row(4, "= filter", "integer 2^59 <= |v| < 2^63", "exact where the lane accepts the value; otherwise rejected at write", True, True, ["R.raw.parity", "G1.types.out-of-range-rejected"],
        {"q_raw": REJECT_Q, "q_frag": REJECT_Q, "repo_q": REJECT_Q}),
    row(5, "= filter", "number (binary64, approximate values)", "exact", True, True, ["R.raw.parity", "G2.arith.binary64"], {"q_raw": ("KL", ["KL-Q3"], "")}),
    row(6, "= across families", "integer vs number", "spec (CMP-INT-FLOAT)", True, True, ["G2.expr.cross-family-comparison"], {"q_raw": ("KL", ["KL-Q4"], "")}),
    row(7, "= filter", "boolean, ref", "exact", True, True, ["R.raw.parity"]),
    row(8, "= filter", "datetime", "exact", True, True, ["R.raw.parity", "G1.types.value-kinds-roundtrip"],
        {"x_raw": ("KL", ["KL-X6"], "raw-wire with the node postgres driver only"), "s_raw": ("KL", ["KL-X6"], "raw-wire with the node postgres driver only"), "q_raw": ("KL", ["KL-Q5"], "")}),
    row(9, "range < <= > >=", "text", "exact (codepoint)", True, True, ["G2.strings.codepoint-supported", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q7"], ""), "q_frag": ("NOTE", "order-key fragment (R5, proven under the pinned image)")}),
    row(10, "range", "integer within the lane's accepted range", "exact (order-preserving, RANGE_RULE)", True, True, ["R.raw.parity", "REQ.no-silent-precision-loss"]),
    row(11, "range", "number", "exact", True, True, ["R.raw.parity"], {"q_raw": ("KL", ["KL-Q3"], "")}),
    row(12, "range", "datetime", "exact", True, True, ["G9.temporal.half-open-intervals", "R.raw.parity"],
        {"x_raw": ("KL", ["KL-X6"], "raw-wire only"), "s_raw": ("KL", ["KL-X6"], "raw-wire only"), "q_raw": ("KL", ["KL-Q5"], "")}),
    row(13, "ORDER BY", "text", "exact (codepoint)", True, True, ["G2.strings.codepoint-supported", "G10.cursor.stable", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q7"], "")}),
    row(14, "ORDER BY", "integer (accepted range) and number", "exact", True, True, ["R.raw.parity", "G10.cursor.stable"], {"q_raw": ("KL", ["KL-Q3"], "numbers beyond 49 mantissa bits")}),
    row(15, "ORDER BY", "datetime", "exact (instant order)", True, True, ["R.raw.parity"],
        {"x_raw": ("KL", ["KL-X6"], "raw-wire only"), "s_raw": ("KL", ["KL-X6"], "raw-wire only"), "q_raw": ("KL", ["KL-Q5"], "")}),
    row(16, "ORDER BY with a total key", "any", "spec (deterministic with a total key)", True, True, ["G10.cursor.stable", "R.raw.parity"], note="raw recipes always add a total tie-break key"),
    row(17, "LIMIT/OFFSET page at a fixed cut", "any", "exact", True, True, ["G10.cursor.stable", "R.raw.parity"]),
    row(18, "keyset cursor page", "any", "exact, cost bounded", True, True, ["G10.cursor.stable", "G10.cursor.deep-page-cost"]),
    row(19, "+ - * (engine side)", "integer", "exact-or-error if offered (N-I-ADD); per-subject arithmetic runs in the kernel", False, False, ["G2.arith.integer-exact"], {"q_raw": ("KL", ["KL-Q2"], "documented in the guide")}, if_offered=True),
    row(20, "/ and % (engine side)", "integer, number", "spec if offered (N-I-DIV, N-I-REM, N-F-ARITH)", False, False, ["G2.arith.integer-exact", "G2.arith.binary64"], {"q_raw": ("KL", ["KL-Q14"], "documented in the guide")}, if_offered=True),
    row(21, "unary minus, ABS (engine side)", "integer", "exact-or-error if offered (N-I-NEG)", False, False, ["G2.arith.integer-exact"], {"q_raw": ("KL", ["KL-Q2"], "documented in the guide")}, if_offered=True),
    row(22, "CAST text to integer (engine side)", "integer", "exact-or-error if offered (CV-T2I)", False, False, ["G2.arith.integer-exact"], if_offered=True),
    row(23, "SUM over many rows (engine side)", "integer", "exact-or-error where a projection needs it (AG-SUM-I, RULINGS Q8a, Q13)", False, False, ["G5.agg.projection-sums"],
        {"x_raw": ("KL", ["KL-X1"], "documented; projections use the split-sum recipe"), "s_raw": ("KL", ["KL-X1"], "same"), "q_raw": ("KL", ["KL-Q15"], "documented"), "x_frag": ("NOTE", "a fragment that offers SUM must not use raw SUM over BIGINT"), "s_frag": ("NOTE", "same")}, if_offered=True),
    row(24, "SUM, AVG (engine side)", "number", "exact if offered (AG-SUM-F, AG-AVG-CONV)", False, False, ["G5.agg.full-support"], {"q_raw": ("KL", ["KL-Q3"], "documented")}, if_offered=True),
    row(25, "COUNT", "any", "spec (AG-COUNT)", True, True, ["G5.agg.full-support", "R.raw.parity"]),
    row(26, "MIN, MAX", "integer (accepted range), text", "exact", True, True, ["G5.agg.shape-controls", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q7"], "text")}),
    row(27, "GROUP BY, HAVING", "typed keys", "spec (CMP-*)", True, True, ["G5.agg.typed-groups", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q4"], "numeric keys across families")}),
    row(28, "aggregate over empty input", "grouped and ungrouped", "spec (AG-EMPTY-*)", True, True, ["G5.agg.shape-controls", "R.raw.parity"]),
    row(29, "correlated EXISTS / NOT EXISTS", "any", "spec (O-SHAPE)", True, True, ["G4.neg.correlated-not-exists", "G4.neg.correlated-not-exists-raw", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q8"], "correlation only through an inner FILTER"), "q_frag": ("NOTE", "re-binding helper (R5 C1), verified, not wired")}),
    row(30, "many EXISTS clauses in one group", "any", "spec, bounded planner memory", False, True, ["G3.admission.preconstruction"], {"q_raw": ("KL", ["KL-Q9"], ""), "q_frag": ("KL", ["KL-Q9"], "requires preconstruction admission")}),
    row(31, "MINUS / OPTIONAL + !BOUND / LEFT JOIN", "any", "spec", True, True, ["G4.neg.correlated-not-exists", "R.raw.parity"]),
    row(32, "join on ref, reverse ref", "ref", "exact", True, True, ["R.raw.parity", "G3.plan.access-path-at-scale"]),
    row(33, "UNION / union-all", "any", "spec", False, False, [], {"x_raw": ("KL", ["KL-X3"], ""), "x_frag": ("NA", "not in the coverage set; no obligation needs it")}),
    row(34, "window functions", "any", "spec", False, False, [], {"x_raw": ("NA", "XTQL has no window operator"), "x_frag": ("NA", "XTQL has no window operator"), "s_raw": ("KL", ["KL-X2"], "")}),
    row(35, "recursion / transitive closure (C8 frontier)", "ref", "exact, bounded, read-only", False, True, ["G3.recursion.scalable", "G3.recursion.read-only-frontier", "PKT.full142"], {"x_raw": ("KL", ["KL-X4"], ""), "s_raw": ("KL", ["KL-X4"], "")}),
    row(36, "interval union over valid time", "number endpoints", "exact", False, True, ["PKT.full142", "S.correctness.query-families"]),
    row(37, "engine-native system-time clause as a Triplex basis", "basis", "exact Triplex basis", False, False, [], {"x_raw": ("KL", ["KL-X8"], ""), "s_raw": ("KL", ["KL-X8"], ""), "x_frag": ("NA", "fragments express bases through row 38"), "s_frag": ("NA", "same"), "q_raw": ("NA", "no engine system time"), "q_frag": ("NA", "same")}),
    row(38, "as-of basis recipe (P, R, V)", "basis", "exact", True, True, ["R.raw.parity", "G8.publish.basis-honesty"]),
    row(39, "json value read", "json", "exact (key order kept)", True, True, ["G1.types.value-kinds-roundtrip", "R.raw.parity"]),
    row(40, "blob descriptor read", "blob", "exact", True, True, ["G1.types.value-kinds-roundtrip", "R.raw.parity"]),
    row(41, "raw write of a typed literal", "all", "n/a", False, False, [], {c: ("NA", "raw writes are not a supported surface: writes go through Triplex (C3 credentials, C7 ownership)") for c in ["x_raw", "s_raw", "q_raw", "x_frag", "s_frag", "q_frag"]}),
    row(42, "language-tagged text compare", "text", "n/a", False, False, [], {c: ("NA", "Triplex text values carry no language tag") for c in COLS}),
    row(43, "domain-pattern query over the default dataset", "any", "exact (only the owning scope's current domain data, C7.2)", True, True, ["G10.scope.ownership-refusal", "R.raw.parity"]),
    row(44, "unrestricted triple-pattern inspection (?s ?p ?o)", "any", "documented (also sees ledger and meta)", False, False, [], {"q_raw": ("KL", ["KL-Q12"], "documented in C7.2"), "x_frag": ("NA", "inspection is raw only"), "s_frag": ("NA", "inspection is raw only"), "q_frag": ("NA", "inspection is raw only")}),
    row(45, "bound native parameter", "number -0.0 and integer edges of the lane's range", "exact", False, True, ["G1.types.native-parameters"]),
    row(46, "cancellation and timeout of a running query", "any", "observed drain (OBS-CANCEL)", False, True, ["G6.cancel.observed-drain", "G6.deadline.enforced"], {"q_frag": ("KL", ["KL-Q16"], "requires admission or repair: the qualified surface must still drain within T-DRAIN-MS")}),
    row(47, "values(attribute) conflict-aware relation", "all", "exact (C5.5)", False, True, ["G4.neg.conflict-semantics"]),
    row(48, "= filter", "decimal", "exact", True, True, ["G1.types.decimal", "R.raw.parity"], note="documented order-preserving decimal channel on every lane"),
    row(49, "range and ORDER BY", "decimal", "exact (order-preserving encoding)", True, True, ["G1.types.decimal", "REQ.no-silent-precision-loss", "R.raw.parity"]),
    row(50, "decimal arithmetic", "decimal", "exact in the kernel; engine side only if offered", False, False, ["G1.types.decimal"], if_offered=True),
    row(51, "native write of an integer beyond the lane's range on the bare wire (diagnostic surface)", "integer |v| >= 2^59", "n/a: qualified write routes reject the value (G1.types.out-of-range-rejected)", False, False, [],
        {"q_raw": ("KL", ["KL-Q1"], "bare native SPARQL UPDATE wraps the value; a diagnostic surface, not a qualified failure (RULINGS Q23, D-Q-INT60)"),
         "x_raw": ("NA", "BIGINT holds the whole range"), "s_raw": ("NA", "BIGINT holds the whole range"),
         "x_frag": ("NA", "fragments do not write"), "s_frag": ("NA", "fragments do not write"), "q_frag": ("NA", "fragments do not write")}),
]

RAW_PARITY_CLASSES = {
    "RP-POINT": [1, 2, 3, 4, 5, 7, 8, 39, 40, 48], "RP-RANGE": [9, 10, 11, 12, 49], "RP-ORDER-PAGE": [13, 14, 15, 16, 17],
    "RP-CROSS-FAMILY": [6], "RP-JOIN": [32], "RP-ANTIJOIN": [29, 31],
    "RP-AGGREGATE": [25, 26, 27, 28], "RP-BASIS": [38], "RP-DATASET": [43],
    "RP-HISTORY": [38], "RP-INTERVAL": [12, 38], "RP-JOURNAL": [1, 38],
}

# Per-cell raw exceptions (RULINGS Q1). One record per (lane, raw surface, matrix row).
RAW_EXCEPTIONS = []


def rx(lane, rown, domain, recipe, diag, surface="raw-hatch and raw-wire", keep=None):
    lab = {"xtdb-xtql": "X", "xtdb-sql": "S", "qlever-sparql": "Q"}[lane]
    RAW_EXCEPTIONS.append({
        "id": f"RX-{lab}{rown:02d}", "lane": lane, "surface": surface, "row": rown, "exemptDomain": domain,
        "mappedRecipe": recipe, "guideEntry": f"RG-{lab}{rown:02d}", "qualifiedBy": "R.raw.mapped-recipes",
        "qualifyingCase": f"RXC-{lab}{rown:02d}", "diagnostic": diag,
        "stillRequiredOnRaw": keep or "every value outside the exempt domain"})


rx("qlever-sparql", 5, "number values that need more than 49 mantissa bits", "equality on the documented exact lexical number channel (shortest round-trip text)", "D-Q-DBL49", keep="numbers exact in 49 mantissa bits")
rx("qlever-sparql", 6, "integer versus number comparisons", "compare on (documented type-family channel, lexical channel) pairs; different families never equal (CMP-INT-FLOAT)", "D-Q-XFAM", keep="same-family comparisons")
rx("qlever-sparql", 8, "datetimes with a fractional millisecond", "equality on the documented exact epoch-millisecond lexical channel", "D-Q-DT", keep="whole-millisecond UTC datetimes through xsd:dateTime")
rx("qlever-sparql", 9, "all text ranges", "range on the documented text order-key channel (6 hex digits per codepoint, R5 E-S1), bounds encoded with the same function", "D-Q-STR", keep="none: every raw text range uses the key")
rx("qlever-sparql", 11, "number ranges over values beyond 49 mantissa bits", "range on the documented number order-key channel", "D-Q-DBL49", keep="ranges over values exact in 49 bits")
rx("qlever-sparql", 12, "datetime ranges with fractional milliseconds", "range on the documented epoch-millisecond order-key channel", "D-Q-DT", keep="whole-millisecond ranges")
rx("qlever-sparql", 13, "all text ordering", "ORDER BY the documented text order-key channel, then the entity order key", "D-Q-STR", keep="none: every raw text ordering uses the key")
rx("qlever-sparql", 14, "ordering numbers beyond 49 mantissa bits", "ORDER BY the documented number order-key channel", "D-Q-DBL49", keep="integers inside the lane's range and numbers exact in 49 bits")
rx("qlever-sparql", 15, "datetime ordering with fractional milliseconds", "ORDER BY the documented epoch-millisecond order-key channel", "D-Q-DT", keep="whole-millisecond ordering")
rx("qlever-sparql", 26, "MIN/MAX over text", "MIN/MAX over the documented text order-key channel, mapped back through the lexical channel", "D-Q-STR", keep="integer MIN/MAX inside the lane's range")
rx("qlever-sparql", 27, "group keys mixing integer and number", "GROUP BY (documented type-family channel, lexical channel)", "D-Q-XFAM", keep="same-family group keys")
rx("qlever-sparql", 29, "NOT EXISTS / EXISTS whose correlated variable occurs only inside an inner FILTER or BIND", "the documented re-binding form (R5 C1: re-emit the correlated fact pattern inside the group, internal variables renamed) or MINUS with definitely bound shared variables (R5 C2)", "D-Q-CORR", keep="correlation through variables the inner group binds")
for lane in X:
    for rn in (8, 12, 15):
        rx(lane, rn, "datetimes with fractional milliseconds read through the node postgres driver", "select CAST(col AS VARCHAR) (text keeps microseconds) or the documented epoch-millisecond numeric column", "D-X-TSWIRE", surface="raw-wire only", keep="the raw hatch (Triplex decodes timestamps as strings) and whole-millisecond values")

DIAGNOSTICS = [
    {"id": "D-Q-STR", "lanes": Q, "what": "original raw text order and range counterexamples: tiny collation control `ORDER BY STR(?l) STR(?e)` and its two ranges; string-order-v1 native raw page; the R5 A3 IRI page-sample class", "oracle": ["O-STR", "O-COLL"], "expected": "unchanged codepoint answers"},
    {"id": "D-Q-INT60", "lanes": Q, "what": "write 2^59 and 2^63-1 as native xsd:integer through the raw wire and read them back (shows why the Triplex write path must reject these values)", "oracle": ["O-REPLAY"], "expected": "the exact values"},
    {"id": "D-Q-DBL49", "lanes": Q, "what": "0.30000000000000004 and 1.0000000000000002 through native literals", "oracle": ["O-REPLAY"], "expected": "bit-exact binary64"},
    {"id": "D-Q-XFAM", "lanes": Q, "what": "9007199254740993 = 9007199254740992.0 and grouping of integer 1 with number 1.0", "oracle": ["O-REPLAY"], "expected": "false; distinct groups"},
    {"id": "D-Q-DT", "lanes": Q, "what": "datetime 1700000000000.5 ms through native xsd:dateTime", "oracle": ["O-REPLAY"], "expected": "exact fractional instant"},
    {"id": "D-Q-CORR", "lanes": Q, "what": "original flat and nested correlated NOT EXISTS controls, unedited text", "oracle": ["O-SHAPE"], "expected": "only `two`"},
    {"id": "D-X-SUM", "lanes": X, "what": "raw SUM over BIGINT of [2^62, 2^62] and [2^62, 2^62, -2^62] in SQL and XTQL", "oracle": ["O-REPLAY", "O-ERR"], "expected": "E-INTEGER-OVERFLOW; 4611686018427387904"},
    {"id": "D-X-TSWIRE", "lanes": X, "what": "fractional-millisecond datetime read through the node postgres driver", "oracle": ["O-REPLAY"], "expected": "exact fractional instant"},
]
DIAGNOSTIC_RULE = "A diagnostic keeps its original text and unchanged expected answer. It runs inside every acceptance run of the obligation that names it, its actual answer is retained, and it never closes or blocks anything. A missing diagnostic execution fails the naming obligation's receipt."

FRAGMENT_COVERAGE = [r["n"] for r in MATRIX_ROWS if r["fragmentCoverage"]]

# ============================================================================ mutation controls
MUTANTS = {
    "M-HALF-OPEN": {"fault": "validTo treated as inclusive (or validFrom as exclusive) in the visibility filter", "reachProbe": "visibility.validInterval", "targets": ["CS-TEMPORAL:boundary", "CS-ENTITY:valid-boundary"]},
    "M-DROPPED-SUPPORT": {"fault": "retracting one of two supports removes the value or derived fact", "reachProbe": "support.retract", "targets": ["CS-SUPPORT:duplicate-support", "CS-SUPPORT-DAG:partial-retraction", "CS-CONFLICT:C5-EQ-DUP"]},
    "M-FUTURE-RETIREMENT": {"fault": "snapshot reads return retirements recorded after the cut", "reachProbe": "history.snapshotMask", "targets": ["CS-HAM9:snapshot", "CS-CFG8:retirement-metadata-target"]},
    "M-INTEGER-ROUND": {"fault": "integers pass through binary64", "reachProbe": "codec.integer", "targets": ["CS-TYPES8:integer-edges", "CS-NUMERIC:integer-scalar"]},
    "M-OUT-OF-RANGE-WRAP": {"fault": "an integer outside the lane's range is stored wrapped or rounded instead of rejected", "reachProbe": "write.integerRange", "targets": ["CS-RANGE-OUT:all"]},
    "M-DECIMAL-ROUND": {"fault": "a decimal beyond its declared scale is rounded instead of rejected", "reachProbe": "codec.decimal", "targets": ["CS-DECIMAL:unrepresentable"]},
    "M-DECIMAL-PRECAPTURE-ROUND": {"fault": "the writer normalizes (rounds) a decimal before capturing the caller's typed input", "reachProbe": "write.captureInput", "targets": ["CS-DECIMAL:DEC-INPUT-CAPTURE"]},
    "M-ERASURE-LEAK": {"fault": "an erased value stays readable from one inventoried location or derived channel (order key, lexical channel, restored backup)", "reachProbe": "erasure.apply", "targets": ["CS-ERASURE:ER-ORDER-KEY-CHANNEL", "CS-ERASURE:ER-RESTORE-PRE-BACKUP"]},
    "M-STALE-INDEX-ANSWER": {"fault": "an index answers for a basis beyond its watermark, or a current-only index answers for a basis it cannot reconstruct", "reachProbe": "route.watermark", "targets": ["CS-COMPOSITION:CO-NO-STALE-ANSWER", "CS-COMPOSITION:CO-RECONSTRUCT-OUTSIDE-VALIDITY"]},
    "M-WITHTRANSACTION-REBIND": {"fault": "the exported withTransaction binding allocates an extra position before executing the transaction, outside every hashed allocator block (OUTSIDE_BLOCK_MUTATION_FIXTURE)", "reachProbe": "xtdb.withTransactionBinding", "targets": ["CS-POSITION:FX-NESTED-CUTS"]},
    "M-ACK-BEFORE-PUBLICATION": {"fault": "the source sends the ACK before its own publication", "reachProbe": "commit.ack", "targets": ["CS-COMPOSITION:CO-ACK-AFTER-SOURCE-PUBLICATION"]},
    "M-RYOW-STALE-ROUTE": {"fault": "the pull at the returned position is served by an index that is not yet eligible for it", "reachProbe": "route.ryow", "targets": ["CS-COMPOSITION:CO-RYOW-ROUTED", "CS-COMPOSITION:CO-OUTAGE-ACKS-CONTINUE"]},
    "M-ERASURE-FRONTIER-SKIP": {"fault": "an old-basis read is served by an index or cache that has not applied a newer published erasure", "reachProbe": "route.erasureFrontier", "targets": ["CS-ERASURE:ER-FRONTIER-OLD-BASIS", "CS-ERASURE:ER-CACHE-INVALIDATION"]},
    "M-JSON-NEGZERO-NORMALIZE": {"fault": "a JSON value's -0 or inexact number is normalized by CanonicalJson before the guard runs, so it is stored instead of rejected", "reachProbe": "write.jsonGuard", "targets": ["CS-WIRE:WIRE-JSON-NEGZERO", "CS-WIRE:WIRE-JSON-BEFORE-CANONICAL"]},
    "M-JSON-GUARD-ON-JOURNAL": {"fault": "the user-JSON guard runs on journal JSON that Triplex generates, so a number -0 assertion's journal is rejected or normalized", "reachProbe": "journal.encodeChange", "targets": ["CS-WIRE:WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP"]},
    "M-RECEIVER-REGRESS": {"fault": "a receiver applies a lower publication sequence after a higher one, regressing its state", "reachProbe": "receiver.apply", "targets": ["CS-RECEIVER:RX-REVERSED-ARRIVAL", "CS-RECEIVER:RX-DEDUP-1-1-3-3-2"]},
    "M-OUTBOX-NONATOMIC": {"fault": "the outbox record and its publication state are written in separate transactions", "reachProbe": "outbox.persist", "targets": ["CS-ATOMIC-UNIT:AU-CRASH-PUBLICATION-SEQUENCE-OUTBOX-RECORDS"]},
    "M-OUTBOX-RETIREMENT-IGNORED": {"fault": "a reappearing work item with an unchanged payload is suppressed instead of publishing a new sequence", "reachProbe": "outbox.retirement", "targets": ["CS-OUTBOX:OB-RETIREMENT-REAPPEAR"]},
    "M-OUTBOX-VERSION-DEDUP": {"fault": "the receiver or publisher deduplicates by content version, so a return to an earlier payload (R1, R2, R1) is suppressed", "reachProbe": "outbox.publish", "targets": ["CS-OUTBOX:OB-RELEASE-ROLLBACK"]},
    "M-DECIMAL-LEXICAL-ORDER": {"fault": "a decimal ORDER BY or range on QLever uses the lexical canonical text instead of the decimal_order_v1 key", "reachProbe": "decimal.orderChannel", "targets": ["CS-DECIMAL-ROUTING:DR-NATIVE-ORDER", "CS-DECIMAL-ROUTING:DR-RAW-ORDER"]},
    "M-X-DECIMAL-SUM-BIGINT": {"fault": "an XTDB engine-side exact sum casts the DECIMAL result back to BIGINT (rounded through a double: 1e18 + 4 reads back as 1e18)", "reachProbe": "xtdb.sumDecode", "targets": ["CS-NUMERIC:projection-sums"]},
    "M-TDK1-NO-TERMINATOR": {"fault": "the TypeScript TDK1 encoder omits the negative terminator z (one of R20's five mutant encoders)", "reachProbe": "decimal.tdk1Encode", "targets": ["CS-TDK1:TDK1-V5-DIFFERENTIAL"]},
    "M-TDK1-PREFIX-USE": {"fault": "a range or lookup uses a TDK1 key as a prefix or inside a concatenated composite key", "reachProbe": "decimal.tdk1Compare", "targets": ["CS-TDK1:TDK1-V4-RANGES"]},
    "M-X-JSON-LIST-PARAM": {"fault": "XTDB card-many DOUBLE or integer lists sent as one JSON parameter instead of ARRAY[CAST(? AS <type>) ...]", "reachProbe": "xtdb.listEncoding", "targets": ["CS-WIRE:WIRE-X-DOUBLE-LIST-ARRAY"]},
    "M-Q-SHADOW-EXACT-FLAG": {"fault": "a QLever numeric shadow is flagged exact although its %.13g export does not parse back to the same bits", "reachProbe": "qlever.numericShadowIsExact", "targets": ["CS-WIRE:WIRE-Q-SHADOW-13G", "CS-WIRE:WIRE-Q-SHADOW-NEGZERO"]},
    "M-FEED-GAP": {"fault": "one change-feed entry is dropped", "reachProbe": "feed.append", "targets": ["CS-REQ:change-feed", "CS-GS:GS-19"]},
    "M-ENTITY-TYPE-SWAP": {"fault": "two EntityType labels swapped in projection or hydration", "reachProbe": "projection.entityType", "targets": ["CS-ENTITY:typed-find"]},
    "M-STALE-PROJECTION": {"fault": "projection one publication behind while the basis reports the latest", "reachProbe": "projection.publication", "targets": ["CS-PUBLISH:coherence", "CS-ELIGIBILITY:C1-MAPPING-GEN"]},
    "M-CUT-OFF-BY-ONE": {"fault": "reads use P-1, or treat recordedAt <= R as < R", "reachProbe": "visibility.cut", "targets": ["CS-TEMPORAL:recorded", "CS-PKT-MULTICALL:writer-between-calls"]},
    "M-NEGZERO": {"fault": "a single-assertion read returns +0.0 for a stored -0.0", "reachProbe": "codec.number", "targets": ["CS-TYPES8:number-edges", "CS-PARAMS:negzero"]},
    "M-ICU-ORDER": {"fault": "text order uses locale collation", "reachProbe": "order.text", "targets": ["CS-STR:supported"]},
    "M-SCOPE-LEAK": {"fault": "scope predicate or graph selection dropped on one read path", "reachProbe": "scope.filter", "targets": ["CS-SCOPE:C7-SHARED-COLLISION"]},
    "M-MASK-RAW": {"fault": "snapshot mask applied to the raw-lifetime contract", "reachProbe": "history.rawLifetime", "targets": ["CS-HAM9:raw-lifetime"]},
    "M-CONFLICT-PICK": {"fault": "card-one conflict resolved by an arbitrary pick", "reachProbe": "hydrate.cardOne", "targets": ["CS-CONFLICT:C5-GET-CONFLICT"]},
    "M-EQ-DUP-CONFLICT": {"fault": "equal-valued duplicates reported as a conflict", "reachProbe": "hydrate.cardOne", "targets": ["CS-CONFLICT:C5-EQ-DUP"]},
    "M-IDENTITY-COLLAPSE": {"fault": "same-value assertions in one batch share one id", "reachProbe": "write.assertionId", "targets": ["CS-SUPPORT:same-batch"]},
    "M-JOURNAL-ORDER": {"fault": "transaction changes reordered", "reachProbe": "journal.changes", "targets": ["CS-JOURNAL:C6-TRANSACTIONS-ORDER"]},
    "M-CLAIM-IGNORED": {"fault": "command-claim check skipped", "reachProbe": "write.claim", "targets": ["CS-WRITE:idempotency"]},
    "M-DECORRELATE": {"fault": "negation helper omits correlated re-binding", "reachProbe": "fragment.notExists", "targets": ["CS-SHAPE:negation"]},
    "M-STALE-REUSE": {"fault": "reused result not invalidated after an affecting write", "reachProbe": "reuse.lookup", "targets": ["CS-REUSE:invalidation"]},
    "M-CARD-MANY-DROP": {"fault": "one card-many element dropped", "reachProbe": "hydrate.cardMany", "targets": ["CS-ENTITY:card-many"]},
    "M-PARTIAL-IGNORED": {"fault": "eligibility ignores a partial entity referenced only by ORDER BY or negation", "reachProbe": "eligibility.completeness", "targets": ["CS-ELIGIBILITY:C1-PARTIAL-FILTER-ORDER", "CS-ELIGIBILITY:C1-PARTIAL-NEG"]},
    "M-EARLY-ACK": {"fault": "success receipt sent before publication", "reachProbe": "commit.ack", "targets": ["CS-FAULT:C2-FSYNC-THEN-CRASH-RETRY"]},
    "M-CHUNK-STALE": {"fault": "maintenance chunk computed before the critical section", "reachProbe": "maintenance.chunk", "targets": ["CS-MAINT:C4-PENDING-CHUNK-WRITE"]},
}
MUTANT_RULE = "A mutant counts only when (1) its reach probe fired at least once during a targeted case, and (2) at least one targeted case failed through a comparator mismatch on an identified assertion (case id and assertion id), not through an error, timeout, crash or setup failure. Mutants patch only the system under test; oracle, case and gate hashes are identical to the clean receipt."

# ============================================================================ Q21 golden-vector rulings
# RULINGS Q21: the 17 AMB rulings, each with the golden vectors it decides and the contract rows it amends.
AMB_RULINGS = [
    {"id": "AMB-01", "ruling": "A: ordinary Triples.match, entity and entityPage keep the raw lifetime at an explicit R; the five tiny-v4 checks and the original counterexample (original expected answer) close on repository as-of reads, timeline and native history", "amends": ["RS-RAW-LIFETIME", "G9.history.raw-lifetime-compat", "G9.history.snapshot-metadata"], "provisional": False},
    {"id": "AMB-02", "ruling": "compare logical retirement content {identity, value, recordedAt, knownRetirement: null or {retractedAt, retractTxId}}; native rows add retractedPosition", "amends": ["RS-RETIREMENT-CONTENT", "G9.history.snapshot-metadata"], "provisional": False},
    {"id": "AMB-03", "ruling": "timeline at a basis lists every assertion recorded at (P, R) with no V filter", "amends": ["RS-TIMELINE", "G9.history.snapshot-metadata"], "provisional": False},
    {"id": "AMB-04", "ruling": "B: the journal change value of a -0.0 assertion is bit-exact -0.0 (supersedes C6 byte-identical -0)", "amends": ["JN-NEGZERO", "G7.journal.logical-contract"], "provisional": True},
    {"id": "AMB-05", "ruling": "compare documented plus testkit-pinned journal fields; whole-journal byte identity is a separate T0-capture baseline", "amends": ["JN-FIELDS", "G7.journal.logical-contract"], "provisional": False},
    {"id": "AMB-06", "ruling": "A: retract-pattern sees same-command staged assertions (both changes, assert first); T0 capture confirms before 1.0.0", "amends": ["JN-STAGED", "G7.journal.logical-contract"], "provisional": False},
    {"id": "AMB-07", "ruling": "creation order (recordedPosition, then operation index), frozen for M-JOURNAL-ORDER", "amends": ["JN-ORDER", "G7.journal.logical-contract"], "provisional": False},
    {"id": "AMB-08", "ruling": "decided by Q14b: -0.0 and +0.0 are one value; the representative is the support with the lowest (recordedPosition, operation index)", "amends": ["CMP-NEGZERO", "Q14b"], "provisional": False},
    {"id": "AMB-09", "ruling": "B: two equal-valued assertions on one entity are one value, two supports, one binding row (SUM 10, COUNT 1); G5.agg.full-support reads 'equal values on distinct entities'", "amends": ["AG-SUM-ONE-ENTITY", "G5.agg.full-support"], "provisional": True},
    {"id": "AMB-10", "ruling": "integer results project as IntegerValue with canonical decimal text, never a JS number", "amends": ["AG-INT-RESULT"], "provisional": False},
    {"id": "AMB-11", "ruling": "the explicit conversion before AVG is toNumber(?v)", "amends": ["AG-AVG-CONV"], "provisional": False},
    {"id": "AMB-12", "ruling": "B: validTo <= validFrom is rejected with E-INVALID-VALUE", "amends": ["TM-EMPTY-REJECTED", "G9.temporal.half-open-intervals", "E-INVALID-VALUE"], "provisional": False},
    {"id": "AMB-13", "ruling": "compare _tag ConflictingValuesError, reason conflicting-values and the set of {entityId, attribute}", "amends": ["ERROR_COMPARISON", "E-CONFLICTING-VALUES"], "provisional": False},
    {"id": "AMB-14", "ruling": "invalid integer text is InvalidTripleError / invalid-value; a reserved-namespace write is WriteError / reserved-namespace", "amends": ["E-INVALID-VALUE", "E-RESERVED"], "provisional": False},
    {"id": "AMB-15", "ruling": "codepoint order for entity ids; a non-BMP entityPage vector (U+E000 against U+10000) is added", "amends": ["RS-ENTITY-ORDER", "R.repo.entity-suite"], "provisional": False},
    {"id": "AMB-16", "ruling": "A: range predicates on integer attributes are required in Repository.find", "amends": ["RS-FIND-RANGE", "R.repo.entity-suite", "EP-REPO"], "provisional": False},
    {"id": "AMB-17", "ruling": "A: find fails with ConflictingValuesError when a returned document contains a conflicted attribute; a projection omitting it succeeds", "amends": ["RS-FIND-CONFLICT", "G4.neg.conflict-semantics"], "provisional": True},
]
GOLDEN_DIR = "lab/acceptance/golden"
# Every golden-vector query whose expected answer was AMBIGUOUS, with the reading the Q21 ruling selects.
GOLDEN_RESOLUTIONS = [
    {"vector": "C5-03", "query": "Q8", "amb": "AMB-17", "reading": "A-document-references-all-attributes"},
    {"vector": "C6-02", "query": "Q2", "amb": "AMB-04", "reading": "B-exact-value-domain"},
    {"vector": "C6-03", "query": "Q1", "amb": "AMB-06", "reading": "A-pattern-sees-staged-rows"},
    {"vector": "G1-I64-01", "query": "Q7", "amb": "AMB-16", "reading": "A-range-on-int64-supported"},
    {"vector": "G5-SUM-13", "query": "G5-SUM-13", "amb": "AMB-09", "reading": "B-binding-set"},
    {"vector": "G9-HO-03", "query": "Q1", "amb": "AMB-12", "reading": "B-reject-invalid-interval"},
    {"vector": "G9-CUT-01", "query": "Q2", "amb": "AMB-01", "reading": "A-raw-lifetime"},
    {"vector": "G9-CUT-01", "query": "Q3", "amb": "AMB-01", "reading": "A-raw-lifetime"},
    {"vector": "G9-CUT-01", "query": "Q7", "amb": "AMB-01", "reading": "A-raw-lifetime"},
] + [{"vector": f"G9-V4-0{i}", "query": f"G9-V4-0{i}-Q1", "amb": "AMB-01", "reading": "A-raw-lifetime"} for i in (1, 2, 3, 4, 5, 6, 8)] + [
    {"vector": "Q8F-05", "query": "Q1", "amb": "AMB-08", "reading": "B-ieee-equality", "refinement": "one element; its representation is the support with the lowest (recordedPosition, operation index); the evaluator derives the sign from fixture order and O-REPLAY computes it independently after EXP-O02; the two must agree (RULINGS Q29b)"},
]
GOLDEN_RULE = "The golden JSON files stay unchanged as the audit record (RULINGS Q29a). A golden-vector query whose expected answer reads AMBIGUOUS is evaluated with the reading named in GOLDEN_RESOLUTIONS (plus its refinement, if any); the other readings stay in the file as the audit record. For AMB-01 the original tiny-v4 target answers also close on repository as-of reads, timeline and native history (RS-RAW-LIFETIME). The golden files are pinned by sha256 in obligations.json; a changed file needs a contract version."


def golden_vectors():
    out = {}
    for f in sorted((REPO / GOLDEN_DIR).glob("*.json")):
        out[f.name] = json.loads(f.read_text())
    return out


QLEVER_INT_RANGE = (-2 ** 59, 2 ** 59 - 1)


def legacy_out_of_range_scan(vectors=None):
    """Golden vectors (or vector cases) that commit an integer outside QLever's accepted range: commands, inputs, input cases, and
    commandTemplate cases and contrastCase entries whose expected outcome is a commit (RULINGS Q31j, V-O02 C2)."""
    out = {}
    lo, hi = QLEVER_INT_RANGE

    def bad(text):
        try:
            n = int(str(text))
        except ValueError:
            return False
        return not (lo <= n <= hi)
    for fname, d in (vectors if vectors is not None else golden_vectors()).items():
        for v in d["vectors"]:
            vals = []
            for c in v.get("commands", []):
                for op in c.get("ops", []):
                    val = op.get("value")
                    if isinstance(val, dict) and val.get("type") == "integer" and bad(val.get("value")):
                        vals.append(val["value"])
            for x in v.get("inputs", []) if isinstance(v.get("inputs"), list) else []:
                t = x.get("v") if isinstance(x, dict) else x
                if bad(t):
                    vals.append(str(t))
            if vals:
                out[v["id"]] = {"file": fname, "values": vals}
            for i, c in enumerate(v.get("cases", []) if isinstance(v.get("cases"), list) else []):
                cv = [str(x) for x in c.get("inputs", []) if bad(x)] if isinstance(c, dict) else []
                if cv:
                    out[f"{v['id']}#case{i + 1}"] = {"file": fname, "values": cv}
            template_expect = (v.get("commandTemplate") or {}).get("expect", {}).get("outcome")
            for c in (v.get("cases", []) if isinstance(v.get("cases"), list) else []) + ([v["contrastCase"]] if isinstance(v.get("contrastCase"), dict) else []):
                if not isinstance(c, dict) or "text" not in c:
                    continue
                outcome = (c.get("expect") or {}).get("outcome", template_expect)
                if outcome == "committed" and bad(c["text"]):
                    out[f"{v['id']}#{c.get('case')}"] = {"file": fname, "values": [str(c["text"])]}
    return out


LEGACY_XTDB = "C1 commits on both XTDB lanes (BIGINT holds the whole core range); the original expected answers apply unchanged"
LEGACY_Q_COMMANDS = "C1 fails with E-VALUE-OUT-OF-RANGE before any mutation (position unchanged, transactionByCommand null, no residue on any access path); every query of the vector then answers over the scope without C1, which is empty: no entity, empty match and find results, computed by O-REPLAY over QLever's accepted commands"
LEGACY_Q_SUM = "C1 fails with E-VALUE-OUT-OF-RANGE before any mutation; the aggregate then runs over an empty scope: AG-EMPTY-UNGROUPED (one row, total null)"
LEGACY_Q_SUM_GROUPED = "C1 fails with E-VALUE-OUT-OF-RANGE before any mutation; the grouped aggregate then runs over an empty scope: AG-EMPTY-GROUPED (no rows)"
# RULINGS Q31j: compiled lane-specific outcomes; the original vectors stay unchanged as audit evidence (RULINGS Q29a).
LEGACY_LANE_OUTCOMES = {
    "G1-I64-01": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_COMMANDS},
    "Q8F-02": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_COMMANDS},
    "G5-SUM-01": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM},
    "G5-SUM-02": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM},
    "G5-SUM-04": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM},
    "G5-SUM-05": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM},
    "G5-SUM-06": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM},
    "G5-SUM-08": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM_GROUPED},
    "G5-SUM-11#case2": {"xtdb": LEGACY_XTDB, "qlever": LEGACY_Q_SUM},
    "G1-I64-02#min-exact": {"xtdb": "the min-exact command (-2^63) commits on both XTDB lanes; the contrast case's original expectation applies", "qlever": "the min-exact command fails with E-VALUE-OUT-OF-RANGE before any mutation on every qualified route (position unchanged, transactionByCommand null, no residue)"},
}
LEGACY_RULE = "Follow-up EXP-G02 (RULINGS Q32b): QLever in-range companion vectors by an independent golden author. For every golden vector (or vector case) that commits an integer outside QLever's accepted range, the evaluator applies the compiled lane outcome in LEGACY_LANE_OUTCOMES instead of the vector's single expected answer: XTDB commits and keeps the original answer; QLever's qualified write routes reject the command with E-VALUE-OUT-OF-RANGE before any mutation (RULINGS Q23, Q31j). The original vectors stay unchanged as audit evidence (RULINGS Q29a). QLever's in-range coverage of the same boundaries comes from CS-TYPES8 integer-edges and CS-RANGE-OUT."

# ============================================================================ outbox publication (RULINGS Q38f, refining Q36a and its clarification)
OUTBOX = {
    "sweepFrames": "provisional: a sweep page may publish up to 64 results in one frame: one atomic outbox commit per frame, each result its own work item with its own delivery identity (RULINGS Q68c, Q38f)", "sweepFrameMaxResults": 64,
    "deliveryKey": "(id, publication sequence)",
    "sequence": "durable per work-item id; increments when the payload to publish differs from the latest published payload for that id, so R1 to R2 to R1 publishes three deliveries (1650, 1700, 1650) and the receiver never suppresses the return",
    "contentVersion": "hashes (release, inputs, payload); recorded, never the delivery identity",
    "atomicity": "publication state (sequence and latest published payload) is persisted atomically with its outbox record",
    "recovery": "unacknowledged deliveries survive crashes and replay with their original identity",
    "publishRule": "per id the sequence starts at 1; publish (id, seq + 1) when the id was never published, when the payload's canonical bytes differ from the latest published payload, or when the id reappears after a recorded retirement (even with an unchanged payload); version is content identity only (RULINGS Q40c, Q40h)",
    "basisOrder": "per subject the outbox applies an evaluation only if its basis is newer than the last applied one: greater basis.tx, or equal tx with a valid time not earlier; an older-basis evaluation publishes nothing (RULINGS Q40d)",
    "retirement": "when a work item id disappears from a subject's outputs, the outbox records its retirement; a later reappearance publishes a new sequence even if the payload equals the last published one (RULINGS Q40h)",
    "liveOnly": "a delivery's subject comes from the evaluation record; only live reconciles at the current basis are passed to publish; previews (GS.11) and past-valid-time audit evaluations never are (RULINGS Q44c)",
    "atomicUnit": "per subject, the basis guard, retirement state, publication sequence, latest published payload and the outbox records are persisted in one atomic write under the subject's compare-and-set; the guard advances on empty and unchanged evaluations too (RULINGS Q42c)",
    "receivers": "receivers apply deliveries per id by publication sequence: a state projection records the highest sequence applied and ignores any lower one (never regresses); an effect that needs every transition processes sequences in order and recovers gaps from the outbox before applying a later one; receiver deduplication is persisted atomically with the receiver's state or effect, or the recipient is idempotent by (id, seq); receivers exist from the first publication or are seeded with a state snapshot (RULINGS Q42b, Q44d)",
    "operations": "W0 defines publish(state, evaluations) -> {deliveries, state} and receive(state, deliveries) -> state as pure operations so O-DOMAIN gives the expected outbox and receiver state (RULINGS Q40c, Q42b)",
    "cases": {"OB-CORRECTION-REVERT": "a correction that reverts a payload to its previous value publishes a new sequence (RULINGS Q40c)", "OB-OLDER-BASIS-NO-DELIVERY": "a newer-basis R2 evaluation followed by an older-basis R1 evaluation yields no delivery (RULINGS Q40d)", "OB-RETIREMENT-REAPPEAR": "a work item that disappears and later reappears with the same payload publishes a new sequence (a second FNC notice is delivered, RULINGS Q40h)", "OB-PREVIEW-NOT-PUBLISHED": "preview (GS.11) and past-valid-time audit evaluations are never passed to publish (RULINGS Q44c)", "OB-RELEASE-ROLLBACK": "activate R1, R2, R1 over unchanged business facts: three deliveries with sequences 1, 2, 3 and payloads 1650, 1700, 1650", "OB-CRASH-BEFORE-DELIVERY": "crash after the outbox record and publication state commit but before delivery: replay delivers the same (id, publication sequence) exactly once", "OB-UNCHANGED-ACTIVATION-RECOVERY": "an activation that leaves the payload unchanged while an earlier delivery is still unacknowledged after a crash: nothing new is published and the pending delivery replays with its original identity", "OB-ATOMIC-STATE": "a crash between the outbox record and its publication state is impossible: both or neither are visible"},
}

RECEIVER_CASES = {"RX-REVERSED-ARRIVAL": "seq 2 arrives before seq 1: a state projection ends on seq 2's payload", "RX-GAP-RECOVERY": "an effect that needs every transition sees seq 3 before seq 2: it recovers seq 2 from the outbox before applying seq 3", "RX-RESTART-MID-SEQUENCE": "the receiver restarts between sequences and resumes without regression or duplicate effect", "RX-DEDUP-1-1-3-3-2": "arrivals 1, 1, 3, 3, 2 pin both dedup rules (RULINGS Q44a)", "RX-LATE-START": "a receiver started after acknowledged deliveries were pruned must be seeded with a state snapshot, never wait for seq 1 (RULINGS Q44d)"}
ATOMIC_UNIT_PARTS = ["basis-guard", "retirement-state", "publication-sequence", "latest-published-payload", "outbox-records"]
ATOMIC_UNIT_CASES = {f"AU-CRASH-{a.upper()}-{b.upper()}": f"crash injected between the {a} and {b} transitions: after recovery either both or neither are visible" for i, a in enumerate(ATOMIC_UNIT_PARTS) for b in ATOMIC_UNIT_PARTS[i + 1:]}
ATOMIC_UNIT_CASES.update({"AU-GUARD-ADVANCES-EMPTY": "an empty evaluation advances the basis guard", "AU-GUARD-ADVANCES-UNCHANGED": "an unchanged evaluation advances the basis guard"})

# ============================================================================ erasure (TARGETS section 7, RULINGS Q24)
ERASURE = {
    "status": "PROVISIONAL product ruling (RULINGS Q24), flagged for Sam: explain at a pre-erasure basis shows the marker, not the value",
    "boundary": "the boundary is the erasure commit's publication; a read that started before it sees, for each erasure commit, either all of that commit's values as they were or all as markers, never a mix (RULINGS Q52e, narrowing Q49d); every read that starts after it, at any basis including bases before the erasure, returns ErasedValue {erasedAt} in place of the value",
    "shape": "assertion identities and valid and record intervals keep their shape",
    "reproduction": "every reproduction contract holds modulo erasure: the C6 whole-journal comparison, raw and native query results, SDK results, cursor stability, bit-for-bit explain and GS.12; both sides of a comparison replace erased values with their markers before comparing (RULINGS Q31f)",
    "frontier": "an index or cache may serve any basis only after it has applied every erasure published so far, independently of the requested basis; an old-basis read never passes on the strength of its basis alone (RULINGS Q31f)",
    "cacheInvalidation": "erasure invalidates every old-basis cache entry that holds the erased value",
    "keyEvidence": "for crypto-shredding, the lane's inventory shows that every surviving copy of a protected value, and of anything derived from it, is encrypted only under the destroyed key; deleting some key is not evidence",
    "derivedChannels": "a PII attribute's order key and lexical channel are inside the encrypted envelope (range rules on PII then run in the kernel after decryption), or the attribute is not eligible for range rules",
    "restore": "the erasure ledger is kept apart from the data and replayed after any restore or rebuild",
    "journalCommit": "an erasure commit is an ordinary data-journal transaction: it has a position, a txId, a record in transactions() and its own :_tx/ facts, and its changes list only identities (entity, attribute, assertion ids), never values; it is also written to the erasure ledger kept apart from the data, which restore and rebuild replay; earlier transactions' :_tx/change facts for erased values show the ErasedValue marker, so ER-JOURNAL-MODULO compares markers on both sides (RULINGS Q49a)",
    "idempotence": "the first erasure of an identity sets erasedAt; erasing it again changes nothing; an erase that matches nothing still commits, as a journal record with an empty change list (RULINGS Q49b)",
    "queries": "provisional, under the Q24 flag for Sam: an erased value is present with no readable value; it matches no value predicate (equality, inequality, range, pattern), so a filter never selects or rejects a subject by it; SUM, AVG, MIN and MAX skip it while COUNT of assertions counts it; ORDER BY places erased markers last in a deterministic order by assertion id; grouping puts all erased values of an attribute in one group keyed by the marker; Unique ignores erased values; an erased reference cannot be followed (an include returns the marker) (RULINGS Q49c)",
    "inFlight": "an erasure commit is atomic for readers: a read that started before it published sees either all of that commit's values as they were or all as markers, never a mix (RULINGS Q52e, narrowing Q49d from per value to per commit); erasure commits become visible in position order, so a read that started before n in-flight erasure commits in its scope sees a prefix of them, and the acceptable answers are the n + 1 prefixes, never all 2^n subsets (RULINGS Q66a); a continuation cursor carries the erasure prefix its page was computed with, and every later page answers with that same prefix (RULINGS Q66b); only erasures in the read's own scope are in flight, erasures in other scopes always apply (RULINGS Q66c)",
    "queriesResidual": "provisional, under the Q24 flag for Sam: a count of distinct values counts an attribute's erased values as one value (the marker group), a count of assertions counts each erased assertion (Q52a); ORDER BY puts readable values first, then erased markers by assertion id, then missing values, in both directions (Q52b); a marker group reports the earliest erasedAt among its members (Q52c); an erased reference takes no part in reference constraints: it blocks no restrict delete, cascades nothing and is skipped by ReferenceTarget validation (Q52d) (RULINGS Q52)",
    "commandShape": "the op is spelled erase; erasure is a typed invalid-command error; an erase is its own command, and mixing it with other operations or giving it preconditions is a typed invalid-command error (RULINGS Q52g)",
    "selectors": "matches nothing (Q49b) means a well-formed entity or entity-plus-attribute selector with no assertions to erase, which commits with an empty change list; an erase naming an unknown assertion target or an unknown id is E-INVALID-VALUE, as for retract (Q56a); erase accepts the same selectors as retract, including {id: ...} (Q56f); retracting an already erased assertion by target commits and history shows the marker with the retraction's time, so erase then delete is supported (Q56g) (RULINGS Q56)",
    "presence": "an erased value is still a present assertion: a card-one attribute holding a readable and an erased value conflicts with E-CONFLICTING-VALUES as two readable values would, the remedy being to retract the erased assertion (Q56b); answers never depend on the erased value, so a readable SAME beside an erased support conflicts whatever the erased value was (Q56c); in a card-many value list erased markers come after the readable elements, ordered by assertion id (Q56d); Required is satisfied by an erased value (Q56e) (RULINGS Q56, provisional under the Q24 flag)",
    "currentCopies": "provisional: every current copy (the broker's current store, XTDB tx_current, the QLever cur graph) is covered by Q58e's per-subject keys; a QLever cur graph holds no personal-data literals (keys and references only, values from the encrypted host store) unless EXP-P4 shows a reindex-free erasure path (RULINGS Q68f)",
    "logErasure": "values held in the broker log, the recent_rows overlay and checkpoints are erasable: value payloads in frames are encrypted per subject and erasure destroys the key (crypto-shredding), so TARGETS 7 holds without rewriting the log; designed in the broker-hardening experiment (RULINGS Q58e)",
    "syntheticData": "in-flight outputs may hold pre-erasure values (Q49d, Q52e), so every oracle case, fixture and golden scenario uses synthetic values only; no real personal data enters the lab (RULINGS Q56h)",
    "tests": ["ER-PINNED-READER", "ER-REBUILD", "ER-RESTORE-PRE-BACKUP", "ER-ORACLE-POST"],
}
PROTECTED_COPY_INVENTORY = ["source log and journal", "current index", "history index", "analytical copy", "order-key channels", "lexical channels", "QLever broker log of record", "broker recent_rows overlay", "current-value copies (broker current store, XTDB tx_current, QLever cur graph)", "caches", "checkpoints", "backups"]

# ============================================================================ position coordinates (TARGETS 4.1 item 3, RULINGS Q31c)
POSITION = {
    "coordinates": "(stream, epoch, offset, ordinal): the source of truth's log stream and epoch, the engine's log offset (or the QLever broker's log frame) and the ordinal of a Triplex transact inside that engine transaction",
    "order": "lexicographic over (stream, epoch, offset, ordinal); positions need not be dense",
    "nested": "one engine transaction holding several Triplex transacts gives them consecutive ordinals at one offset, assigned atomically with the assertions and the subject compare-and-set",
    "watermark": "a fully resolved prefix: every position at or below it is applied or known aborted (stronger than the greatest position seen)",
    "aborted": "aborted offsets are accounted: the feed's resolution stream lists each one",
    "epochs": "a watermark from one epoch never satisfies a basis in another epoch without the mapping C1 defines",
    "oracle": "O-REPLAY treats positions as totally ordered coordinates: it sorts by coordinate and assigns its own dense ordinals for cuts",
    "falsifiers": ["FX-NESTED-CUTS", "FX-ABORT-GAP", "FX-CRASH-APPEND-RESOLUTION", "FX-RESUME-AT-ABORT-GAP"],
    "binding": "the core binds a transaction's position after the source of truth publishes it; a position is an opaque, totally ordered value (bigint) that preserves the (stream, epoch, offset, ordinal) order, so adapters never return placeholders and no ordinal packing limit exists; lands with the broker's engine-agnostic extraction (EXP-P2B) on both lanes (RULINGS Q51c)",
    "falsifierText": {"FX-NESTED-CUTS": "cuts at every interior ordinal of one engine transaction holding several Triplex transacts", "FX-ABORT-GAP": "an aborted offset between two committed ones: cuts on both sides and the resolution-stream entry", "FX-CRASH-APPEND-RESOLUTION": "a crash between appending a transaction and resolving it (applied or aborted)", "FX-RESUME-AT-ABORT-GAP": "a feed consumer resuming from a checkpoint that sits at an abort gap"},
}
# RULINGS Q32e: the selection of G7.position.coordinates depends on whether the composition's positions are dense.
POSITION_DENSE_CASES = ["PO-LEXICOGRAPHIC-ORDER", "PO-ORACLE-DENSE-ORDINALS", "PO-NESTED-CUTS-DENSE"]
# RULINGS Q38a (replaces Q32e and Q34a): no density exemption. Every composition, A0 included, runs the four position falsifiers
# before any comparative or promotion claim. The fixture below records why a source-hash allowlist was unsafe.
OUTSIDE_BLOCK_MUTATION_FIXTURE = {
    "source": "xtdb", "file": "packages/xtdb/src/XtdbStorageAdapter.ts",
    "mutation": "the exported withTransaction binding (about line 485) is rebound in memory to allocate an extra position before executing the transaction",
    "unchangedBlockHashes": {"  const committedPosition = () =>": "f4e600f36f7563508610f03b3b4c6b9eb83b14fffa94a7cf7f92f3380be126bd", "  const persist = (": "e1272f80323eb02049179fbaa4c35c7a174161a3379f62c99eae932828a3112c", "  const withTransaction = <A, E>(": "f2ebd36fc7b31ce6098d58f18555cbbcdaa7837965e3ca143aadca1d4fa81380", "    nextCommitPosition: () =>": "62c1b2805ec7bcfbcd55a895195add4c0d32b6a882c6772379af081eb3603f16", "    currentCommitPosition: () =>": "7d54d2315040284eb04df9fdd86a06f2e579f8519b92fa5966172012e20d6360"},
    "oldMechanismVerdict": "dense, falsifiers skipped (0.3.4 density_proven returned True)",
    "requiredVerdict": "the four falsifiers run; FX-NESTED-CUTS fails under the mutation (mutant M-WITHTRANSACTION-REBIND)",
    "source_of_finding": "lab/reviews/plan-v2-round4.codex.md finding 1",
}
POSITION_REQUIRED_CASES = list(POSITION_DENSE_CASES) + list(POSITION["falsifiers"]) + ["PO-ABORTED-LISTED"]
A0_CONTROLS = {
    "A0-XTDB": {"source": "xtdb", "why": "today's scope-counter allocator; runs the four falsifiers like every other composition (RULINGS Q38a)"},
    "A0-QLEVER": {"source": "qlever", "why": "today's scope-counter allocator; runs the four falsifiers like every other composition (RULINGS Q38a)"},
}
# RULINGS Q46b, Q47b: the frozen A0 registry. The evaluator takes the control's identity from here, never from the claim.
A0_REGISTRY = {
    "measurement": "A0 numbers for comparisons come from paired rounds under PAIR_0; EXP-N01's single-run A0 is diagnostic only (RULINGS Q60i)",
    "rule": "when EXP-N01/N02 measures A0 at the budget re-freeze, the A0 commit, source tree and composition are frozen here in a contract version bump; the evaluator takes a comparison's control identity from the entry for the claim's source engine, never from the claim, so a candidate-selected control cannot qualify a comparison; while an entry is null every comparison against it is a diagnostic (RULINGS Q46b, Q47b)",
    "entryShape": {"commit": "the A0 code commit (40 hex digits)", "sourceTreeSha256": "the A0 source tree hash", "binarySha256": "the evaluator's own reproducible build of that tree at that commit; every qualification run rebuilds A0 and must reproduce it, so the source-to-build relationship is checked by rebuilding, never taken from a manifest label (RULINGS Q55a; lab/reviews/plan-v2-round7.codex.md finding 2)", "composition": "the four assignments, each with engine, imageDigest, configSha256 and slot, the source assignment also declaring its protocol variant (and, for log-source, its log identity and durability configuration, RULINGS Q55b)", "measuredBy": "the VERIFIER_REGISTRY entry (kind a0, id the A0 key, commit the A0 commit) through which the A0 measurement that froze it is verified (RULINGS Q61k)"},
    "byEngine": {"xtdb": "A0-XTDB", "qlever": "A0-QLEVER"},
    "entries": {"A0-XTDB": None, "A0-QLEVER": None},
}
# RULINGS Q47b: the workload identity both the measurement and its control carry, nonempty and validated; a missing field never matches.
WORKLOAD_IDENTITY = {
    "fields": {"generatorSourceSha256": "hex64", "seed": "int", "offerScheduleSha256": "hex64", "window": "window"},
    "placement": "each arm's placement {slot, cpuset, cpus} is separate from the shared workload identity; slots are per arm; a duet needs equal capacity, equal regime and disjoint cpusets; under cpusets the per-core denominator is the cpuset size (RULINGS Q67g)",
    "appliesTo": "obligations whose closure rules include CR-NS or CR-GS only; correctness obligations carry no workload identity (RULINGS Q61g)",
    "rule": "every measurement and control receipt carries workload {generatorSourceSha256 (trace generator hash), seed, offerScheduleSha256, window [from, to] with 0 <= from < to, slot (the source assignment's slot)}, every field present, typed and nonempty; a control matches a measurement only when the two workload identities are equal field by field; a missing field never matches a missing field (RULINGS Q47b)",
}
# RULINGS Q47a: record schemas of the retained objects admission opens; verdicts are recomputed from the raw results.
EVIDENCE_SCHEMAS = {
    "build-manifest/1": {"fields": {"schema": "str", "sourceTreeSha256": "str", "binarySha256": "hex64", "modules": "list"},
                         "rule": "binds the source tree to the executed binary; the binary and every executed or imported module ({path, sha256}, at least one) are retained objects whose bytes hash to the listed values"},
    "verifier-record/1": {"fields": {"schema": "str", "obligation": "str", "definitionSha256": "hex64", "verifier": "str", "verdict": "str"},
                          "rule": "names the receipt's obligation and definition hash, a nonempty verifier and the verdict ACCEPT"},
    "build-manifest/2": {"fields": {"schema": "str", "sourceTreeSha256": "str", "binarySha256": "hex64", "modules": "list", "inputs": "list", "buildSpecSha256": "hex64"},
                         "rule": "build-manifest/1 plus the build inputs ({path, sha256}, every one checked against the side's commit) and the hash of the contract's BUILD_SPEC (RULINGS Q61f)"},
    "case-result/2": {"fields": {"schema": "str", "obligation": "str", "case": "str", "selection": "str", "oracle": "str", "oracleExit": "int", "oracleCode": "str-or-null", "expectedSha256": "hex64", "observedSha256": "hex64", "mode": "str", "rep": "int", "comparator": "str", "inputSha256": "hex64"},
                      "rule": "case-result/1 plus the mode, the repetition, the comparator applied and the input's sha256; a run that cannot be expressed in this record fails closed (RULINGS Q61e); a case reached by several select entries records the first select entry in contract order (RULINGS Q65c); its verdict is recomputed with its declared comparator on the retained raw objects, never by hash equality (RULINGS Q67i, Q71c)"},
    "oracle-invocation/1": {"fields": {"schema": "str", "oracle": "str", "pinCommit": "str", "argvSha256": "hex64", "runtime": "str", "inputSha256": "hex64", "exit": "int", "outputSha256": "hex64"},
                            "rule": "one record per oracle invocation, with the runtime that ran it (for a Python oracle, its version), because an answer can depend on it (RULINGS Q71b)"},
    "fault-witness/1": {"fields": {"schema": "str", "obligation": "str", "case": "str", "mode": "str", "rep": "int", "faultPointId": "str", "injectedAt": "int", "lastWitnessedTransition": "str", "eventsSha256": "hex64"},
                        "rule": "one retained record per fault injection (the injector's point and time, the last transition with durable evidence, and the retained transition events), never a faultReps count alone (RULINGS Q61j; EVIDENCE_KINDS fault-witness)"},
    "case-result/1": {"fields": {"schema": "str", "obligation": "str", "case": "str", "selection": "str", "oracle": "str", "oracleExit": "int", "oracleCode": "str-or-null", "expectedSha256": "hex64", "observedSha256": "hex64"},
                      "rule": "the retained raw oracle run and observation for one case and the selection it covers; PASS only when oracleExit is 0, oracleCode is null, the expected and observed objects are both retained and equal; an oracle exit 2 or X-NOT-MODELED is a refusal and never PASS (RULINGS Q45b, Q47a)"},
}


# RULINGS Q55a: qualification is a run the evaluator executes, never a document.
QUALIFICATION_RUN = {
    "executor": "lab/bin/claim.mjs (EXP-E01); qualification_run and admit_claim in this generator are its reference model",
    "contractSource": "the evaluator reads the contract (obligations.json and load-contract.json) from the authority ref (main), never from the claimed commit (RULINGS Q61a); it reads VERIFIER_REGISTRY as written (RULINGS Q61b)",
    "blockers": {"rule": "every blocker stays until EXP-G03's executing gate exists; manifests, runners, the build spec, the frozen trace and A0 controls are pinned only through contract versions (RULINGS Q67a, Q65f)", "list": ["an executing gate.mjs OBL with obl-case.ts, a fault injector writing fault-witness/1 and the PAIR-0 paired-rounds runner (EXP-G03, after EXP-M01)", "pinned case manifests (CS manifestSha256)", "BUILD_SPEC", "writerTrace.generator.frozen", "A0_REGISTRY entries", "a VERIFIER_REGISTRY entry per claimed obligation"]},
    "executionIdentity": {"rule": "an execution's identity is its source tree, build spec, lockfile, toolchain versions, runner and config hashes per instance; executions are keyed by instance, never by output hash (RULINGS Q67b)", "fields": ["sourceTreeSha256", "buildSpecSha256", "lockfileSha256", "toolchain", "runnerSha256", "configSha256"],
                          "toolchain": "the node version, platform and arch, and the pnpm version when the build or run calls pnpm; the Python version that runs an oracle is not part of the build identity but is recorded in each oracle invocation's evidence (oracle-invocation/1), because an oracle's answer can depend on it (RULINGS Q71b)",
                          "installMetadata": "the post-build checkout is in the identity except the contract-owned install-metadata exclusion list BUILD_SPEC.installMetadataExclusions, found by diffing two clean installs of the same lockfile, never claimant-supplied (RULINGS Q71a)"},
    "isolation": "builds and both arms run isolated from evaluator, oracle, evidence and control storage; oracle bytes run from an evaluator-owned read-only copy re-hashed before every invocation; offline verdicts stay diagnostics (RULINGS Q67e)",
    "kinds": "a claim's kind is preserved; promotion prerequisites (GATE-BROKER-HARDENING and others) are enforced mechanically, and until that is supported promotion qualification is rejected explicitly (RULINGS Q67j)",
    "rule": "a QUALIFIED verdict comes only from a run the evaluator executes itself at the claimed commit; every record an experiment or a claimant supplies (receipts, case results, manifests, selections, verifier records, fingerprints) is DIAGNOSTIC evidence only (RULINGS Q55a)",
    "steps": [
        ["build", "build the declared source tree at the claimed commit, and A0 from the A0_REGISTRY entry's tree and commit; record the evaluator's own build hashes; the A0 build must reproduce the registry's binarySha256"],
        ["resolve", "resolve cases from the pinned case-set manifests (CS manifestSha256): every case of each selected set, tag or named case, in every declared mode; a claimant's selection or case list is ignored; an unpinned or mismatching manifest, or a selection that resolves to no case, leaves the obligation unresolved (DIAGNOSTIC)"],
        ["execute", "run the system under test through the gate on a registered slot whose images are the contract's IMAGE_PINS; in a CR-FAULT obligation every faultPoint case is injected T-FAULT-REPS times per mode, each injection retained as a fault-witness/1 record (RULINGS Q61i, Q61j)"],
        ["expect", "compute every expected answer by running the pinned, accepted oracle on the pinned case input; a refusal (exit 2 or X-NOT-MODELED) fails the obligation closed"],
        ["compare", "apply the comparator the case declares (COMPARATORS) to the expected answer and the observation"],
        ["control", "for CR-NS and CR-GS obligations only, run the frozen trace (load-contract writerTrace.generator.frozen) as paired rounds under PAIR_0 against the candidate build and the A0 build on identically configured registered slots (RULINGS Q60, Q61g, Q61h); the A0 side is verified through the A0_REGISTRY entry's measuredBy (RULINGS Q61k)"],
        ["verify", "count independent verification only through VERIFIER_REGISTRY entries for the subject and commit"],
        ["record", "retain builds, inputs, oracle outputs, observations, fault witnesses and verdicts as content-addressed records written by the evaluator: build-manifest/2, case-result/2 and fault-witness/1 (RULINGS Q61e, Q61f, Q61j; the /1 formats of RULINGS Q54e stay readable)"],
    ],
}
# RULINGS Q61c: how the evaluator invokes each answer-producing oracle, and how it extracts the expected answer.
ORACLE_RUNNERS = {
    "O-REPLAY": {"argv": ["python3", "-I", "lab/oracles/replay/cli.py", "{case}"], "files": None,
                 "filesRule": "files are taken from the ORACLE_PINS sha256 map (the pinned per-file hashes), materialised alone in a work directory; files is used only for an oracle without a per-file pin, and no claim depending on such an oracle qualifies (RULINGS Q59e)"},
    "O-DOMAIN": {"argv": ["python3", "-I", "lab/oracles/domain/cli.py", "run", "{case}"], "files": None,
                 "decodedInputArgv": ["python3", "-I", "lab/oracles/domain/cli.py", "{op}", "-"],
                 "decodedInputRule": "O-DOMAIN 5d1fd1a's case loader does not read the inputBase64 form of W0-1.1.2; for a case with inputBase64 (C91, C92 and C128 today) the evaluator decodes it and feeds the decoded bytes on stdin through decodedInputArgv with the case's op; the canonical stdout is the answer (V-D01c cross-check: all three match). The oracle is not edited for this",
                 "answer": "stdout is canonicalJson of the SPEC output; under run, exit 1 means the oracle's answer differs from the case's frozen expected bytes and is an oracle error, never PASS"},
    "O-CONTRACT": {"argv": ["python3", "-I", "-B", "lab/acceptance/build_contract.py", "--oracle", "O-CONTRACT", "{case}"], "files": ["lab/acceptance/build_contract.py", "lab/acceptance/obligations.json"],
                   "answer": "canonical JSON {bound, unboundAssignments, imagesPinned, variant} for one composition-identity case {composition}, run from the authority's files (RULINGS Q59e, Q64c, Q65a)"},
}
ORACLE_ANSWER_RULE = "the evaluator runs the runner's argv with {case} replaced by the path of the pinned case input (and {mode} by the mode where the argv names it) in a directory holding only the pinned oracle files; exit 2, or X-NOT-MODELED on stdout or stderr, is a refusal; any other nonzero exit is an oracle error; neither is ever PASS; on exit 0 stdout is one canonical JSON document (UTF-8, key-sorted, the exact bytes of its own canonical form after one trailing newline is removed), and for O-REPLAY the expected answer is the object of the report's commandOutcomes, state and queries members, the report's own identity and verdict fields (format, oracle, caseId, caseSha256, lane, verdict, divergedAtCommand, receiptConsistency, rulesInEffect, reservedNamespaces) not being part of it; a case input given to the oracle carries no expectations of its own (RULINGS Q61c)"
ANSWER_MEMBERS = {"O-REPLAY": ["commandOutcomes", "state", "queries"], "O-DOMAIN": None, "O-CONTRACT": None}  # None: the whole canonical document
# RULINGS Q61d: the pinned case-manifest format (Q59f: manifests are pinned through contract versions, starting with CS-POSITION and CS-NS).
CASE_MANIFEST = {
    "format": "triplex-db-2/case-manifest/1",
    "fields": {"id": "nonempty string, unique in the manifest", "tags": "list of strings", "input": "repository-relative path of the case input file", "contentSha256": "sha256 of the input file's bytes",
               "comparator": "a COMPARATORS id", "oracle": "optional: an oracle id among the obligation's oracles (default: the obligation's first oracle)", "faultPoint": "optional Boolean: the case is a fault point, injected T-FAULT-REPS times with a retained fault-witness/1 per injection"},
    "required": ["id", "tags", "input", "contentSha256", "comparator"], "optional": ["oracle", "faultPoint"],
    "rule": "the manifest at CS[set].manifest must hash to CS[set].manifestSha256; every case lists the required fields; the input file must hash to contentSha256; a case that fails any of these leaves its obligation unresolved (RULINGS Q55a, Q61d)",
}
# RULINGS Q61f: the build spec lives in the contract; required null input until the build is specified.
BUILD_SPEC = {
    "format": "triplex-db-2/build-spec/1", "argv": None, "outputs": None, "run": None,
    "fields": {"argv": "the build command's argv, run in a clean checkout of the side's commit", "outputs": "repository-relative paths the build writes (each built package's dist/)", "run": "the system under test's argv, with {case} and {mode}"},
    "inputs": "every tracked file of each built workspace package plus the lockfile and the root package.json, each listed with its sha256 in build-manifest/2 inputs and checked against the side's commit; each built package is the parent directory of a dist/ output (RULINGS Q65d)",
    "installMetadataExclusions": None,
    "installMetadataRule": "a required input, null until two clean installs of the same lockfile are diffed; the starting candidates are node_modules/.modules.yaml and node_modules/.pnpm/lock.yaml; contract-owned, never claimant-supplied (RULINGS Q71a)",
    "specSha256Rule": "buildSpecSha256 is the sha256 of the canonical JSON (sorted keys, no whitespace) of {format, argv, outputs, run} (RULINGS Q65b)",
    "proposal": {"source": "EXP-E01 lab/config/build.json on exp/E01-claim-evaluator", "argv": "pnpm install --offline --frozen-lockfile --store-dir <repo>/.pnpm-store, then the five package builds in dependency order", "outputs": "the five dist/ directories", "run": ["node", "packages/qualification/workloads/obl-case.ts", "--case", "{case}", "--mode", "{mode}"],
                 "pinWhen": "packages/qualification/workloads/obl-case.ts exists (RULINGS Q64a, Q65e); it does not exist on main, so argv, outputs and run stay null"},
    "rule": "a required input: null fields fail closed, so no run qualifies until a contract version specifies the build (RULINGS Q55a step 1, Q61f)",
}
# RULINGS Q61i: engine image pins (moved from lab/config/slots.json; the contract is the authority, slots.json must agree).
IMAGE_PINS = {
    "xtdb": {"image": "ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77", "imageId": "sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77"},
    "qlever": {"image": "adfreiburg/qlever:0.6.0@sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec", "imageId": "sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec"},
}
# RULINGS Q55b: the source assignment declares its protocol variant; a log source binds its log identity and durability configuration.
SOURCE_VARIANT_FIELDS = {"engine-source": (), "log-source": ("log",)}
LOG_FIELDS = {"implementationSha256": "hex64", "fsyncMode": "str", "fullFsync": "bool", "device": "str"}


def composition_ok(comp):
    """RULINGS Q28, Q55b: four bound assignments; the source declares its variant and, for log-source, its log and durability."""
    if not isinstance(comp, dict) or set(comp) != set(COMPOSITION["assignments"]):
        return False
    for k, a in comp.items():
        if not isinstance(a, dict):
            return False
        extra = ()
        if k == "source":
            if a.get("variant") not in SOURCE_VARIANT_FIELDS:
                return False
            extra = ("variant",) + SOURCE_VARIANT_FIELDS[a["variant"]]
        if set(a) != set(COMPOSITION_FIELDS) | set(extra) or any(not a[f] for f in COMPOSITION_FIELDS):
            return False
        if "log" in extra and not (isinstance(a["log"], dict) and set(a["log"]) == set(LOG_FIELDS) and all(_typed(a["log"][f], t) for f, t in LOG_FIELDS.items())):
            return False
    return True


def resolve_cases(o, ev, pinned):
    """RULINGS Q55a: cases come from the pinned manifests only; None when any selection is unresolvable."""
    out = {}
    for c in o["cases"]:
        want = pinned.get(c["set"])
        raw = ev["manifest"](c["set"]) if want else None
        if not want or not isinstance(raw, bytes) or hashlib.sha256(raw).hexdigest() != want:
            return None
        try:
            cases = json.loads(raw)["cases"]
        except (ValueError, KeyError, TypeError):
            return None
        for t in c["select"]:
            hit = [x for x in cases if t == "all" or x.get("id") == t or t in x.get("tags", [])]
            if not hit:
                return None
            for x in hit:
                out[(c["set"], x["id"])] = x
    return [out[k] for k in sorted(out)]


def case_entry_ok(x, ev):
    """RULINGS Q61d: a pinned manifest case lists its required fields and its input hashes to contentSha256."""
    if not isinstance(x, dict) or not all(k in x for k in CASE_MANIFEST["required"]) or not _typed(x.get("id"), "str") or not isinstance(x.get("tags"), list) or not all(isinstance(t, str) for t in x["tags"]):
        return None
    if not _typed(x.get("input"), "str") or not _typed(x.get("contentSha256"), "hex64") or x.get("comparator") not in COMPARATORS or ("faultPoint" in x and not isinstance(x["faultPoint"], bool)) or ("oracle" in x and not _typed(x["oracle"], "str")):
        return None
    raw = ev["input"](x["input"]) if "input" in ev else None
    return raw if isinstance(raw, bytes) and hashlib.sha256(raw).hexdigest() == x["contentSha256"] else None


def fault_witness_ok(w, o, x, mode, rep):
    """RULINGS Q61j: one retained fault-witness/1 per injection."""
    f = EVIDENCE_SCHEMAS["fault-witness/1"]["fields"]
    return (isinstance(w, dict) and set(w) == set(f) and all(_typed(w[k], t) for k, t in f.items()) and w["schema"] == "fault-witness/1"
            and w["obligation"] == o["id"] and w["case"] == x["id"] and w["mode"] == mode and w["rep"] == rep and w["faultPointId"] == x["id"])


def qualification_run(o, binary, comp, ev, pins=None, pinned=None, runners=None):
    """RULINGS Q55a reference model of the evaluator's own run. ev is the evaluator (build, manifest, oracle, sut, compare), never the
    claimant. Returns None unless every resolved case passes in every mode (and every fault repetition)."""
    pins = ORACLE_PINS if pins is None else pins
    pinned = {k: v["manifestSha256"] for k, v in CS.items()} if pinned is None else pinned
    cases = resolve_cases(o, ev, pinned)
    if not cases:
        return None
    runners = ORACLE_RUNNERS if runners is None else runners
    fault = "CR-FAULT" in o["closure"]["rules"]
    for x in cases:
        raw = case_entry_ok(x, ev)
        if raw is None:
            return None
        orc = x.get("oracle") or (o["oracles"] or [None])[0]
        if orc not in o["oracles"] or orc not in runners:
            return None
        expected = ev["oracle"](orc, (pins.get(orc) or {}).get("commit"), raw)
        if not isinstance(expected, dict) or expected.get("exit") != 0 or expected.get("code") is not None:
            return None
        reps = THRESHOLDS["T-FAULT-REPS"]["value"] if fault and x.get("faultPoint") is True else 1
        for mode in o["closure"]["modes"]:
            for rep in range(reps):
                if not ev["compare"](x["comparator"], expected.get("output"), ev["sut"](binary, comp, x, mode)):
                    return None
                if reps > 1 and not fault_witness_ok(ev["witness"](o["id"], binary, comp, x, mode, rep) if "witness" in ev else None, o, x, mode, rep):
                    return None
    return {"obligation": o["id"], "cases": [x["id"] for x in cases], "modes": list(o["closure"]["modes"])}


def paired_ok(m, wl):
    """RULINGS Q60a, Q60c: a comparison measured as paired rounds under PAIR_0, both sides under the same cpuset regime with no quota."""
    d = PAIR_0["design"]
    if not isinstance(m, dict) or m.get("mode") != "paired-rounds" or m.get("design") not in d["designs"] or m.get("workload") != wl:
        return False
    if not (_typed(m.get("rounds"), "int") and m["rounds"] in d["looks"]):
        return False  # RULINGS Q67f: the number of rounds equals a registered look
    per = m.get("perRound")
    if not isinstance(per, list) or len(per) != m["rounds"] or not all(isinstance(r_, dict) and isinstance(r_.get("histograms"), dict) and set(r_["histograms"]) == {"candidate", "A0"} and isinstance(r_.get("signals"), dict) for r_ in per):
        return False  # RULINGS Q67f: decisions are recomputed from retained per-round histograms and signals
    if m.get("window") != "GREEN" or m.get("accounting") != "all-offered":
        return False  # RULINGS Q60d, Q60e, Q67f: a RED or unjudged window, or committed-only accounting, never admits
    pl = m.get("placement")
    if not isinstance(pl, dict) or set(pl) != {"candidate", "A0"} or not all(isinstance(pl[k], dict) and _typed(pl[k].get("slot"), "str") and _typed(pl[k].get("cpus"), "int") and _cpuset(pl[k].get("cpuset")) for k in pl):
        return False
    if any(len(_cpuset(pl[k]["cpuset"])) != pl[k]["cpus"] for k in pl):
        return False  # RULINGS Q67g: under cpusets the per-core denominator is the cpuset size
    if m["design"] == "duet" and (pl["candidate"]["cpus"] != pl["A0"]["cpus"] or _cpuset(pl["candidate"]["cpuset"]) & _cpuset(pl["A0"]["cpuset"]) or pl["candidate"]["slot"] == pl["A0"]["slot"]):
        return False  # RULINGS Q67g: a duet needs equal capacity and disjoint cpusets on separate slots
    regs = m.get("slotRegimes")
    if not isinstance(regs, dict) or set(regs) != {"candidate", "A0"} or not all(isinstance(regs[k], dict) and set(regs[k]) == set(PAIR_0["slotRegime"]["receiptFields"]) for k in regs):
        return False
    if any(regs[k]["cpuMax"] != "max" or not _typed(regs[k]["cpuWeight"], "int") or regs[k]["cpuset"] != pl[k]["cpuset"] for k in regs):
        return False  # RULINGS Q60c: cpuset slots with no quota; each arm's recorded cpuset is its placement
    return regs["candidate"]["cpuMax"] == regs["A0"]["cpuMax"] and regs["candidate"]["cpuWeight"] == regs["A0"]["cpuWeight"]  # Q67g: equal regime


def position_selection(composition):
    """Cases of G7.position.coordinates every composition needs (RULINGS Q38a): no exemption, whatever the composition declares."""
    return list(POSITION_REQUIRED_CASES)


# RULINGS Q34d, Q38b: claim admission from validated, source-bound receipt evidence only.
CLAIM_ADMISSION = {
    "rule": "when any comparative or promotion claim is admitted, including one from a screening (P-SCREEN) run, the verdict comes only from the evaluator's own QUALIFICATION_RUN at the claimed commit (RULINGS Q55a); records an experiment or the claimant supplies, never from supplied case names or Booleans, are diagnostics only. The evaluator builds the declared tree and requires: a passing G7.position.coordinates run for that build and composition over POSITION_REQUIRED_CASES; G10.composition.identity-bound with every assignment bound (engine, image digest, configuration hash, slot) and the source's protocol variant declared, a log source binding its log identity and durability configuration (RULINGS Q55b); where any claimed obligation uses O-DOMAIN, the W0 pin accepted through VERIFIER_REGISTRY, the O-DOMAIN fingerprint pinned by a reviewed contract version (never from the claim, RULINGS Q55e) and a passing W0.coverage-floors run; every oracle the claim or its prerequisites use pinned and accepted through VERIFIER_REGISTRY, with the claimed obligation outside that pin's excludes and refusals. Cases are resolved from the pinned manifests, every case in every mode; expected answers come from running the pinned oracle, so an oracle exit 2 or X-NOT-MODELED never counts as PASS; the declared comparator decides. The control is A0 from the A0_REGISTRY entry for the claim's source engine, rebuilt by the evaluator to the registry's binarySha256 and run on the same evaluator-chosen workload (WORKLOAD_IDENTITY) as paired rounds, each arm on its own registered slot and placement (RULINGS Q46b, Q47b, Q60, Q67g); a promotion claim is rejected explicitly until its prerequisites are enforced (RULINGS Q67j); while that entry is null every comparison is a diagnostic. Independent verification of the claimed obligation counts only through a VERIFIER_REGISTRY entry for that obligation and commit. Unknown obligation ids are rejected, never dropped. lab/bin/claim.mjs implements this (EXP-E01) with these functions as the reference model. A claim with a failed or pending prerequisite is a diagnostic, never a qualified winner; while O-REPLAY's pin is null every claim is a diagnostic, and A0 measurements may run and produce diagnostics, never closures (RULINGS Q34d, Q37b, Q38b)",
    "verdicts": ["QUALIFIED", "DIAGNOSTIC"],
}
COMPOSITION_FIELDS = ("engine", "imageDigest", "configSha256", "slot")


def _obj_ok(h, store):
    return isinstance(h, str) and h in store and hashlib.sha256(store[h]).hexdigest() == h


def _typed(v, t):
    if t == "hex64":
        return isinstance(v, str) and re.fullmatch(r"[0-9a-f]{64}", v) is not None
    if t == "int":
        return isinstance(v, int) and not isinstance(v, bool)
    if t == "list":
        return isinstance(v, list) and len(v) > 0
    if t == "window":
        return isinstance(v, list) and len(v) == 2 and all(_typed(x, "int") for x in v) and 0 <= v[0] < v[1]
    if t == "bool":
        return isinstance(v, bool)
    if t == "str-or-null":
        return v is None or (isinstance(v, str) and v != "")
    return isinstance(v, str) and v.strip() != ""


def open_record(h, store, schema):
    """RULINGS Q47a: open a retained object and validate it against its record schema; None when absent, misbound or invalid."""
    if not _obj_ok(h, store):
        return None
    try:
        rec = json.loads(store.get(h, b""))
    except ValueError:
        return None
    spec = EVIDENCE_SCHEMAS[schema]["fields"]
    if not isinstance(rec, dict) or set(rec) != set(spec) or rec.get("schema") != schema or not all(_typed(rec[k], t) for k, t in spec.items()):
        return None
    return rec


def _canon(b):
    try:
        v = json.loads(b)
    except (ValueError, TypeError):
        return None, False
    return v, json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode() == (b.rstrip(b"\n") if isinstance(b, bytes) else b)


def reference_compare(comparator, expected, observed):
    """RULINGS Q67i, Q71c: the reference model's comparators over canonical JSON answers; an unknown comparator, a non-canonical answer or
    a wrong shape never passes. No comparator here is plain byte equality."""
    (e_, ok1), (o_, ok2) = _canon(expected), _canon(observed)
    if not (ok1 and ok2):
        return False
    key = lambda x: json.dumps(x, sort_keys=True, separators=(",", ":"))
    if comparator in ("CMP-SET-ROWS", "CMP-DIAGNOSTICS"):
        return isinstance(e_, list) and isinstance(o_, list) and sorted({key(x) for x in e_}) == sorted({key(x) for x in o_})
    if comparator == "CMP-BAG-ROWS":
        return isinstance(e_, list) and isinstance(o_, list) and sorted(key(x) for x in e_) == sorted(key(x) for x in o_)
    if comparator in ("CMP-ORDERED-ROWS", "CMP-PAGES"):
        return isinstance(e_, list) and isinstance(o_, list) and [key(x) for x in e_] == [key(x) for x in o_]
    if comparator == "CMP-EXACT-VALUE":
        return key(e_) == key(o_)
    if comparator == "CMP-ERROR":
        return isinstance(e_, dict) and isinstance(o_, dict) and e_.get("_tag") is not None and e_.get("_tag") == o_.get("_tag") and e_.get("reason") == o_.get("reason") and not o_.get("rows")
    return False


def case_verdict(rec, store):
    """RULINGS Q47a: the verdict recomputed from the retained raw result, never read from the receipt. case-result/2 uses its declared
    comparator on the retained raw objects (RULINGS Q67i, Q71c); case-result/1 keeps hash equality, because it carries no comparator."""
    if rec["oracleExit"] == 2 or rec["oracleCode"] == "X-NOT-MODELED":
        return "REFUSED"
    if rec["oracleExit"] != 0 or rec["oracleCode"] is not None or not _obj_ok(rec["expectedSha256"], store) or not _obj_ok(rec["observedSha256"], store):
        return "FAIL"
    if rec.get("schema") == "case-result/2":
        return "PASS" if reference_compare(rec["comparator"], store[rec["expectedSha256"]], store[rec["observedSha256"]]) else "FAIL"
    return "PASS" if rec["expectedSha256"] == rec["observedSha256"] else "FAIL"


def workload_ok(w, comp):
    f = WORKLOAD_IDENTITY["fields"]
    return isinstance(w, dict) and set(w) == set(f) and all(_typed(w[k], t) for k, t in f.items())


def _cpuset(s):
    out = set()
    try:
        for part in s.split(","):
            a, _, b = part.partition("-")
            out |= set(range(int(a), int(b or a) + 1))
    except (ValueError, AttributeError):
        return None
    return out or None


def admit_claim(claim, ev=None, pins=None, w0=None, a0=None, verifiers=None, pinned=None, overrides=None):
    """RULINGS Q38b, Q42a, Q47, Q55a: claim = {obligations, commit, sourceTreeSha256, composition}; anything else it carries (receipts,
    selections, controls, verifier records, fingerprints) is ignored. ev is the evaluator's own executor; the pins, W0 pin, A0 registry,
    verifier registry and manifest pins come from the contract (the parameters exist only for the generator's own fixtures)."""
    if ev is None:
        return "DIAGNOSTIC"
    pins = ORACLE_PINS if pins is None else pins
    w0 = W0_PIN if w0 is None else w0
    a0 = A0_REGISTRY["entries"] if a0 is None else a0
    verifiers = VERIFIER_REGISTRY["entries"] if verifiers is None else verifiers
    cfg = dict({"buildSpec": BUILD_SPEC, "frozenTrace": WRITER_TRACE["generator"]["frozen"], "imagePins": IMAGE_PINS, "oracleRunners": ORACLE_RUNNERS}, **(overrides or {}))
    if any(cfg["buildSpec"].get(k) is None for k in ("argv", "outputs", "run")):
        return "DIAGNOSTIC"
    obl = {o["id"]: o for o in OBL}
    ids = claim.get("obligations", [])
    if not ids or any(i not in obl for i in ids):
        return "DIAGNOSTIC"
    claimed = [obl[i] for i in ids]
    tree, comp, commit = claim.get("sourceTreeSha256"), claim.get("composition") or {}, claim.get("commit")
    if claim.get("kind", "comparison") not in ("comparison", "screening"):
        return "DIAGNOSTIC"  # RULINGS Q67j: promotion qualification is rejected explicitly until its prerequisites are enforced mechanically
    if not composition_ok(comp) or any(comp[k]["slot"] not in ev.get("slots", ()) for k in comp):
        return "DIAGNOSTIC"
    if any(comp[k]["imageDigest"] != (cfg["imagePins"].get(comp[k]["engine"]) or {}).get("imageId") for k in comp):
        return "DIAGNOSTIC"
    binary = ev["build"](tree, commit)
    if not _typed(binary, "hex64"):
        return "DIAGNOSTIC"
    prereq = ["G7.position.coordinates", "G10.composition.identity-bound"]
    domain = any("O-DOMAIN" in o["oracles"] for o in claimed)
    if domain:
        prereq.append("W0.coverage-floors")
    for pid in prereq:
        if qualification_run(obl[pid], binary, comp, ev, pins, pinned, cfg["oracleRunners"]) is None:
            return "DIAGNOSTIC"
    a0key = A0_REGISTRY["byEngine"].get(comp["source"]["engine"])
    entry = a0.get(a0key)
    if not entry or not composition_ok(entry.get("composition")) or ev["build"](entry["sourceTreeSha256"], entry["commit"]) != entry.get("binarySha256"):
        return "DIAGNOSTIC"
    if not registered_acceptance(entry.get("measuredBy"), "a0", a0key, entry["commit"], verifiers):
        return "DIAGNOSTIC"
    frozen = cfg["frozenTrace"]
    for o in claimed:
        if qualification_run(o, binary, comp, ev, pins, pinned, cfg["oracleRunners"]) is None:
            return "DIAGNOSTIC"
        if set(o["closure"]["rules"]) & {"CR-NS", "CR-GS"}:
            wl = ev["workload"](o)
            if not workload_ok(wl, comp) or not workload_ok(wl, entry["composition"]) or any(frozen.get(k) is None for k in ("sha256", "seed", "offerScheduleSha256")):
                return "DIAGNOSTIC"
            if (wl["generatorSourceSha256"], wl["seed"], wl["offerScheduleSha256"]) != (frozen["sha256"], frozen["seed"], frozen["offerScheduleSha256"]):
                return "DIAGNOSTIC"
            mp = ev["measure_pair"](binary, comp, entry["binarySha256"], entry["composition"], wl)
            if not paired_ok(mp, wl) or mp["placement"]["candidate"]["slot"] != comp["source"]["slot"] or mp["placement"]["A0"]["slot"] != entry["composition"]["source"]["slot"]:
                return "DIAGNOSTIC"
        if not any(registered_acceptance(v, "obligation", o["id"], commit, verifiers) for v in verifiers):
            return "DIAGNOSTIC"
    if domain and (any(v is None for v in w0["files"].values()) or not registered_acceptance(w0.get("verifierEntry"), "world", "W0", w0.get("commit"), verifiers) or w0.get("deltaCheck") is None or w0.get("oDomainFingerprint") is None):
        return "DIAGNOSTIC"
    for x in {x for o in claimed + [obl[i] for i in prereq] for x in o["oracles"]}:
        if x in pins:
            sha = pins[x].get("sha256")
            if pins[x].get("acceptReceipt") is None or sha is None or (isinstance(sha, dict) and any(v is None for v in sha.values())) or not registered_acceptance(pins[x].get("verifierEntry"), "oracle", x, pins[x].get("commit"), verifiers):
                return "DIAGNOSTIC"
            if any(o["id"] in pins[x].get("excludes", []) for o in claimed):
                return "DIAGNOSTIC"
        elif ORACLES[x]["status"] != "COMPILED":
            return "DIAGNOSTIC"  # RULINGS Q59e: a claim depending on an unpinned oracle is a diagnostic (COMPILED oracles are pinned by this contract)
    for o in claimed:
        for x in set(o["oracles"]) & set(ORACLE_REFUSALS):
            if any(refused_by(o, ref) for ref in ORACLE_REFUSALS[x].values()):
                return "DIAGNOSTIC"
    return "QUALIFIED"


# A gate blocks an obligation from closing until its condition holds; the evaluator treats an unmet or unknown gate as OPEN.
GATES = {
    "GATE-POSITION": {"rule": "no comparative or promotion claim on any composition, A0 included, until a VA-valid G7.position.coordinates receipt for that composition's source covers POSITION_REQUIRED_CASES, the four falsifiers included; no source-hash allowlist or declared density grants an exemption (RULINGS Q31c, Q38a; OUTSIDE_BLOCK_MUTATION_FIXTURE shows why)", "requires": ["G7.position.coordinates"], "appliesTo": "NS.* and GS.* obligations and every comparative or promotion claim (CLAIM_ADMISSION)"},
    "GATE-W0": {"rule": "no domain-dependent obligation closes until V-D01 has independently reviewed W0 (SPEC.md, releases, golden cases), every W0_PIN hash is pinned in this contract (RULINGS Q31i, Q48a) and O-DOMAIN has reproduced the population fingerprint (RULINGS Q40g); a null field fails closed", "requires": ["W0_PIN complete", "W0.coverage-floors"], "appliesTo": "every obligation whose oracles include O-DOMAIN"},
}
# V-O02 C1: oracle pins are required inputs; null until the oracle is accepted (O-REPLAY after EXP-O03 and its verification).
# RULINGS Q56i (0.3.8): O-REPLAY 0.4.1 accepted at a9c1327 (V-O04c), 29 file hashes from lab/verify/O02/v-o04b/results/hashes.a9c1327.json.
O_REPLAY_FILES = {
    "lab/oracles/replay/RULES.md": "949ad8751e515bfb21a0bb811364146a21b330c7051f01ff1ff8dd801abbb67c",
    "lab/oracles/replay/SCHEMA.md": "7c00d078346ad519ad633df960d42c73c3378faa3de189fb091ec7c6b546fcae",
    "lab/oracles/replay/__init__.py": "1c8a05550047bf892f96ca71eb3b203efc7359dfc3acc1d4fd9b0420386c76e0",
    "lab/oracles/replay/__main__.py": "486ab6ff5cfd46ec8b633b00885efb814f6b9f61b7b2d9193ff5f6ee5868d04d",
    "lab/oracles/replay/cli.py": "1492793e203e2b09d4be28f32c3800e1efadbb9098be8c6699d88a3d6b6d63f5",
    "lab/oracles/replay/constraints.py": "9b9a9fcbdbb787e784a6cefd9b9e9ba525cf5e0ea8a9cdcc0e5278fe1ff19e43",
    "lab/oracles/replay/entities.py": "2af069de69a53a027f225756a955544c5ecec126d4ba99f66f40586fb5879371",
    "lab/oracles/replay/errors.py": "5cfdd07ed710557d1db868bfae38e32f7c851dc3007fbcc9b2c0de521185f887",
    "lab/oracles/replay/exact.py": "d2cdbabe0c7131983e347e4f04d0e63ebd9db9793b5ccccc5732324fb6037544",
    "lab/oracles/replay/examples/entity-mini.case.json": "7549f07299668500a311e9a5fc3eb80904731d0b5a7d626090a7657f53a8d667",
    "lab/oracles/replay/examples/entity-mini.expected.json": "f373da3f5ef38ce517da4bed98882c8749c5705c3495947ed2a2191bc5b1c7a9",
    "lab/oracles/replay/replay.py": "585524ba205b5ce19a42efd7ff2ef5886d0462abcd4fe4d22035c0b55880980d",
    "lab/oracles/replay/run.py": "9fa40089db5c50fa5f7f245f14c050dee4cd3d0bfefd1e7e171461226e154032",
    "lab/oracles/replay/scale.py": "5917ade3c099a5062c76e9814b5019439bbbcad843f0e2790213fea8c9c98abe",
    "lab/oracles/replay/selfcheck.py": "c1e0ae41cfe9bac7f2ed7f249715b5ae71e98f4d66e4ae152938b6d333c9418c",
    "lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs": "c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206",
    "lab/oracles/replay/selfcheck_fixtures/ham-v2-reference.json": "d69c14f1abb236c3e1532ff95f1aba81b088fc5937ba82f9647e2e6a4e0407f2",
    "lab/oracles/replay/tests/__init__.py": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "lab/oracles/replay/tests/helpers.py": "b334a38527256ebb6fa6c34c7d4e9dd82d335ae6bcd9eb839778fd654fac8183",
    "lab/oracles/replay/tests/test_contract_section4.py": "c52ccf5a0d65689e8542793dfa3b606e0ba144213b74c1410aacf9bdb75b9299",
    "lab/oracles/replay/tests/test_entities.py": "562feac4b58c11e8fabb8e30fff85c41cd9562cbd05a94df3d8c3d8f19caffe6",
    "lab/oracles/replay/tests/test_exact.py": "35aaf8384af0178e1fc929b94fe0e11a43aa64dbbe567bf50067658821b619b1",
    "lab/oracles/replay/tests/test_replay.py": "6900d4fc9710e3248c476c036aba84565c53b4265b231867778d776668feb7b9",
    "lab/oracles/replay/tests/test_rulings.py": "3997f66b01be8f697977911ec1fdf5209223d5310206657f7ed65c7ea106aea4",
    "lab/oracles/replay/tests/test_scale_and_selfcheck.py": "6afcddbfa91b8ea593f524f885390b01f425c907aa103415f026ba5d1f5a432e",
    "lab/oracles/replay/tests/test_values.py": "1070395875907bca8a46ab9b88fee0758a1b73aafe94b5b610b2117e2740d375",
    "lab/oracles/replay/tests/test_views.py": "614658e9e679391ba901d20a6ba84f5609d1fd0d4d3c81a6cf30efbb3ee81d7e",
    "lab/oracles/replay/values.py": "67a42954b3988ff248b8ff34b2b166ed04a793665cb688b7ea768b9f37049982",
    "lab/oracles/replay/views.py": "df8dba0ba607c98ccd204ab9adbf5f6192d1a4fe250b103ed458b5dec70ad26a"
}
# RULINGS Q48a, Q40g (0.3.10): O-DOMAIN accepted at 5d1fd1a (V-D01c delta check), 7 file hashes from
# lab/verify/D01c/delta-5d1fd1a/O-DOMAIN-5d1fd1a-SHA256SUMS (verify/D01c 7f05819), checked against the merged tree.
O_DOMAIN_FILES = {
    "lab/oracles/domain/README.md": "6e1e970ea9eb80ac25742a5f0f6651fc84e4c0d34cec9ce6f0ec274420f04587",
    "lab/oracles/domain/cli.py": "fb14ef13bffe12c963a01b76b37f52fbde921476d4482f9616022a3cdbdbb6d8",
    "lab/oracles/domain/jsontok.py": "c428c5b889bea9f6397eaf1515fc94af2eace3c3ff9a6268dd7f7a069ed903c0",
    "lab/oracles/domain/population.py": "7c33da567e3530b40210c7fcae3ad850026cf1dd037b5edc0808f78be1d7eb3d",
    "lab/oracles/domain/receipts/population-100k.json": "9a48033f8482f55be7af6aa00affab33f69b0015ac70f9de61fae5748d147557",
    "lab/oracles/domain/test_domain.py": "9103d227207999538ddba6e19bb8c6e64397ddfcf6a585bf42890538416b5f08",
    "lab/oracles/domain/w0.py": "841f7d9d2e175e09474fdf23969bfddda77851995335828ed1c97b34d9167f00",
}
ORACLE_PINS = {"O-TDK1": {"files": "lab/oracles/decimal/", "sha256": dict(O_TDK1_FILES), "acceptReceipt": None, "acceptedAfter": "independent review of the oracle and of tdk1-vectors.json", "rule": "file hashes pinned (RULINGS Q37c, Q38e); acceptance null until the independent review, so obligations it would close fail closed"},
               "O-REPLAY": {"files": "lab/oracles/replay/**", "commit": "a9c1327d4e1d6756696db6844e17008671d4a193", "oracleVersion": "0.4.1", "sha256": O_REPLAY_FILES,
                            "acceptReceipt": "V-O04c (lab/verify/O02/VERIFY.md sections V-O04b and V-O04c; verify/O02 fa6c236)", "verifierEntry": "V-O04c", "excludes": [], "excludesWhy": {},
                            "previousPin": {"commit": "8cc2c26f6f17ed627a3ed608f1252fe0e240bb5b", "oracleVersion": "0.3.1", "verifierEntry": "V-O03", "excludes": ["G1.decimal.channel-routing"], "replacedIn": "0.3.8"},
                            "ruledAgainst": "contract 0.3.7 + Q52, Q56",
                            "nextPin": "O-REPLAY 0.4.2 adds the Q52 shapes and the SCHEMA.md note for the id selector (RULINGS Q56f, Q56i); moving the pin to it needs an independent re-check and a contract version bump, and the q52-shapes refusal then shrinks with PIN_SCOPE_EXPECTED_DIFF updated (RULINGS Q45e, Q46d)",
                            "rule": "accepted with a scoped pin; obligations in excludes, and cases the oracle refuses (ORACLE_REFUSALS), fail closed; moving the pin needs an independent re-check registered in VERIFIER_REGISTRY and a contract version bump (RULINGS Q45a, Q45e, Q55a, Q56i)"},
               "O-DOMAIN": {"files": "lab/oracles/domain/**", "commit": "5d1fd1a3a60c01e5b5fc5d210ea0b3098074e3b9", "oracleVersion": "5d1fd1a (W0-1.1.1 SPEC readings; passes all 136 W0-1.1.2 cases)", "sha256": O_DOMAIN_FILES,
                            "acceptReceipt": "V-D01c delta check of O-DOMAIN 5d1fd1a (lab/verify/D01c/VERIFY.md, last section; verify/D01c 7f05819)", "verifierEntry": "V-D01c-O-DOMAIN", "excludes": [], "excludesWhy": {},
                            "notes": "V-D01c D1: two parser mutants survive every case ([1} accepted; a duplicate key after the second member missed) though the shipped parser is right on the verifier's corpus; unit tests for both belong in a later O-DOMAIN version. D2: O-DOMAIN's reading id A11 collides with W0-1.1.2's A11 (documentation only). D3: lifting the digit limit makes huge integers slow, not wrong",
                            "rule": "accepted; moving the pin needs an independent re-check registered in VERIFIER_REGISTRY and a contract version bump (RULINGS Q55a)"}}
# RULINGS Q55a: independent verification counts only through this contract-held registry, added by a reviewed contract version.
VERIFIER_REGISTRY = {
    "briefRule": "every verification and re-check saves its own BRIEF file, so an entry's brief hash identifies the actual instructions (RULINGS Q59c); V-O03 and V-O04c predate this and name the V-O02 brief",
    "rule": "independent verification counts only through an entry here (verifier, brief and its hash, branch, commit, verdict, subject), added by a reviewed contract version; a verifier record, name or ACCEPT string inside a claim or an experiment's evidence never counts (RULINGS Q55a)",
    "entries": {
        "V-O03": {"verifier": "V-O02 verifier, resumed for the V-O03 re-check", "subject": {"kind": "oracle", "id": "O-REPLAY", "commit": "8cc2c26f6f17ed627a3ed608f1252fe0e240bb5b", "version": "0.3.1"},
                  "brief": "lab/verify/O02/BRIEF.md", "briefSha256": "38d3c81f99da26438ff09ba0e6b6a88e75c5f402c4362a7d28d9b8df387376c4", "branch": "verify/O02", "commit": "8f631ab51017f75243c243597474b04b124a8576",
                  "verdict": "ACCEPT with a scoped pin (excludes G1.decimal.channel-routing)", "record": "lab/verify/O02/VERIFY.md section V-O03", "status": "superseded by V-O04c in 0.3.8"},
        "V-O04c": {"verifier": "V-O02 verifier, resumed for the V-O04b and V-O04c re-checks", "subject": {"kind": "oracle", "id": "O-REPLAY", "commit": "a9c1327d4e1d6756696db6844e17008671d4a193", "version": "0.4.1"},
                   "brief": "lab/verify/O02/BRIEF.md", "briefSha256": "38d3c81f99da26438ff09ba0e6b6a88e75c5f402c4362a7d28d9b8df387376c4", "branch": "verify/O02", "commit": "fa6c236a178760561d3e521c88bb45006cb521cb",
                   "verdict": "ACCEPT for pinning O-REPLAY 0.4.1 unchanged", "record": "lab/verify/O02/VERIFY.md sections V-O04b (bfc129a, FIX-FIRST narrow) and V-O04c", "status": "current"},
        "V-D01-W0-1.1.1": {"verifier": "V-D01", "subject": {"kind": "world", "id": "W0", "commit": "ada2e90337b7ab210dc302df01c81896fe546bcf", "version": "W0-1.1.1"},
                           "brief": "lab/verify/D01/BRIEF.md", "briefSha256": "8fbdaaf67d2cbc1ae000d780ce7fcc45825ec6ba81edbbc9ed179ce517b5df88", "branch": "verify/D01", "commit": "bee0b2525fa08c9b0131d6971ab3ec0cd9045778",
                           "verdict": "ACCEPT (delta check of W0-1.1.1)", "record": "lab/verify/D01/VERIFY.md, delta check of W0-1.1.1", "status": "superseded by V-D01e-W0-1.1.2 in 0.3.10"},
        "V-D01e-W0-1.1.2": {"verifier": "V-D01e (delta review) with the orchestrator's diff check of the fix", "subject": {"kind": "world", "id": "W0", "commit": "fedfcdaee6f3ea188e96d9eec9671cbb0c623f5c", "version": "W0-1.1.2"},
                            "brief": "lab/verify/D01/V-D01e/BRIEF.md", "briefSha256": "6df85539b0dd6c5a66b524c3c106fff3b8866f6afb3f581737e3a13ddd263dca", "branch": "verify/D01", "commit": "d9021cfc8bf691094be4eafa825d3a10039ad7b6",
                            "verdict": "ACCEPT at fedfcda (V-D01e FIX-FIRST at 242bb40 for E1 and E2; the fix accepted by the orchestrator's diff check)", "record": "lab/verify/D01/V-D01e/VERIFY.md, last section", "status": "current"},
        "V-D01c-O-DOMAIN": {"verifier": "V-D01c (delta check of 5d1fd1a, resumed)", "subject": {"kind": "oracle", "id": "O-DOMAIN", "commit": "5d1fd1a3a60c01e5b5fc5d210ea0b3098074e3b9", "version": "5d1fd1a"},
                            "brief": "lab/verify/D01c/BRIEF.md", "briefSha256": "0384a8d6e4f8f615b9582c4e71664adf7caec54062755df92cf62bbb151150a0", "branch": "verify/D01c", "commit": "7f05819226545a11c898299418b6c4d34b81cd03",
                            "verdict": "ACCEPT, pin (delta check of O-DOMAIN 5d1fd1a; orchestrator cross-check 136/136 against W0-1.1.2)", "record": "lab/verify/D01c/VERIFY.md, last section; hash table lab/verify/D01c/delta-5d1fd1a/O-DOMAIN-5d1fd1a-SHA256SUMS on verify/D01c", "status": "current"},
    },
}


def registered_acceptance(entry_id, kind, subject_id, commit, registry=None):
    """RULINGS Q55a: True only for a VERIFIER_REGISTRY entry accepting exactly this subject at this commit."""
    reg = VERIFIER_REGISTRY["entries"] if registry is None else registry
    e_ = reg.get(entry_id) if isinstance(entry_id, str) else None
    return bool(e_) and e_["verdict"].startswith("ACCEPT") and e_["subject"] == dict(e_["subject"], kind=kind, id=subject_id, commit=commit)


# RULINGS Q45b: an oracle exit 2 with X-NOT-MODELED means "not modeled": the obligation fails closed, never a case-authoring error.
ORACLE_REFUSAL_RULE = "an oracle that exits 2 with X-NOT-MODELED for a case has not modeled it: every obligation selecting that case fails closed (stays OPEN); the refusal is never treated as a case-authoring error and never skipped. Erasure cases spell the op erase; outbox steps are never encoded as O-REPLAY ops, because O-DOMAIN owns them (RULINGS Q45b)"
# RULINGS Q52 (0.3.8): erasure shapes O-REPLAY 0.4.1 refuses; each is a named CS-ERASURE case carrying only the residual tag.
ERASURE_RESIDUAL_CASES = ["ER-COUNT-DISTINCT-MARKER", "ER-ORDER-ERASED-THEN-MISSING", "ER-GROUP-EARLIEST-ERASEDAT", "ER-REFERENCE-CONSTRAINT-SKIPPED", "ER-INFLIGHT-ALL-OR-NONE", "ER-ERASE-COMMAND-SHAPE"]
ERASURE_Q66_CASES = ["ER-INFLIGHT-PREFIXES", "ER-CURSOR-ERASURE-PREFIX"]  # RULINGS Q66a, Q66b: 0.4.1 answers per value or refuses
ORACLE_REFUSALS = {"O-REPLAY": {
    "q52-shapes": {"sets": [], "cases": [["CS-ERASURE", c] for c in ERASURE_RESIDUAL_CASES + ERASURE_Q66_CASES] + [["CS-DECIMAL-ROUTING", "DR-JSON-CONVERT-ROUNDING"]],
                   "sites": ["views.py:679 COUNT over a variable bound to several erased values (Q52a)", "entities.py:366 orderBy over both erased and missing values (Q52b)", "replay.py:184 values erased at different instants in one marker group (Q52c)", "replay.py:558 ReferenceTarget over an erased reference (Q52d)", "entities.py:144, replay.py:194, 206 and 217 computed answers over a value whose erasure is in flight (Q52e)", "exact.py:340 toDecimal(json, p, s, rounding) (Q52f)", "replay.py:504, 574 and 576 op erasure, erase mixed with other operations, preconditions on an erase (Q52g)"],
                   "until": "O-REPLAY 0.4.2 models Q52 and an independent re-check moves the pin (RULINGS Q56i)"},
    "tdk1-keys": {"sets": [], "cases": [["CS-DECIMAL", "DEC-SMALL-PRECISION-TDK1"], ["CS-DECIMAL", "DEC-LARGE-PRECISION-TDK1"], ["CS-DECIMAL", "DEC-ORDER-KEY-INDEPENDENT"]], "sites": ["run.py:53 TDK1 order keys are not modeled; key bytes come from O-TDK1 (RULINGS Q45c)"], "until": "never for O-REPLAY: O-TDK1 owns key bytes"},
    "envelope-facts": {"sets": [], "cases": [], "sites": ["views.py:129 a pattern selecting transaction envelope facts other than :_tx/change and :_tx/changed-entity (R-JNL-6: envelope fact families and presence are not frozen)"], "until": "the envelope fact families are ruled; no selected case is known to reach it, and admission re-judges every retained case, so an actual refusal still fails closed (RULINGS Q47c)"},
    "scale-evolution": {"sets": [], "sites": ["entities.py:61 a case redeclaring a decimal attribute (DS-WIDEN, DS-WIDEN-MIGRATE, DS-NARROW)"], "cases": [["CS-DECIMAL", "DEC-SCALE-WIDEN"], ["CS-DECIMAL", "DEC-SCALE-WIDEN-MIGRATE"], ["CS-DECIMAL", "DEC-SCALE-NARROW"]],
                        "reachedThrough": [["CS-DECIMAL", "scale-evolution"], ["CS-MIGRATION", "*"], ["CS-WIDEN", "*"]],
                        "reachedWhy": "any CS-MIGRATION or CS-WIDEN case may redeclare a decimal attribute's precision or scale (for example (5,2) to (6,3)), which the pinned oracle refuses with X-NOT-MODELED; every obligation selecting those sets, through any tag, is blocked (lab/reviews/plan-v2-round6.codex.md finding 6; RULINGS Q47c)",
                        "until": "the oracle models decimal redeclaration (R-DEC-15)"},
}}


def refused_by(o, ref):
    """RULINGS Q45b, Q47c: a refusal blocks an obligation that selects a refused set, a refused case, or a set or tag through which an
    unsupported rule is reached ("*" is any selection of that set)."""
    pairs = selected_pairs(o)
    sets = {s for s, _ in pairs}
    return (any(s in ref["sets"] for s in sets) or any(tuple(c) in pairs for c in ref["cases"])
            or any((s in sets) if t == "*" else ((s, t) in pairs) for s, t in ref.get("reachedThrough", [])))


def selected_pairs(o):
    out = set()
    for c in o["cases"]:
        for t in c["select"]:
            if t == "all":
                out |= {(c["set"], x) for x in CS[c["set"]]["requiredCases"] + CS[c["set"]]["requiredTags"]} | {(c["set"], "*")}
            else:
                out.add((c["set"], t))
    return out


def build_spec_sha256(spec):
    """RULINGS Q65b: sha256 of the canonical JSON of {format, argv, outputs, run}."""
    return hashlib.sha256(json.dumps({k: spec.get(k) for k in ("format", "argv", "outputs", "run")}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def contract_blockers(o):
    """Contract-level blockers of one obligation (pins, refusals, the W0 pin): what a contract version must change before the obligation
    can close. Evaluator-side blockers that apply to every claim (QUALIFICATION_RUN blockers, RULINGS Q67a) are listed separately."""
    out = []
    for x in o["oracles"]:
        pin = ORACLE_PINS.get(x)
        if pin is not None:
            if pin.get("acceptReceipt") is None or not registered_acceptance(pin.get("verifierEntry"), "oracle", x, pin.get("commit")):
                out.append(f"oracle-unaccepted:{x}")
            elif o["id"] in pin.get("excludes", []):
                out.append(f"excluded:{x}")
            out += [f"refused:{x}:{n}" for n, ref in ORACLE_REFUSALS.get(x, {}).items() if refused_by(o, ref)]
        elif ORACLES[x]["status"] != "COMPILED":
            out.append(f"oracle-unpinned:{x}")
    if "O-DOMAIN" in o["oracles"] and (any(v is None for v in W0_PIN["files"].values()) or W0_PIN.get("oDomainFingerprint") is None or not registered_acceptance(W0_PIN.get("verifierEntry"), "world", "W0", W0_PIN.get("commit"))):
        out.append("w0-pin")
    return out


def closability():
    rows = {o["id"]: contract_blockers(o) for o in OBL}
    reasons = {}
    for b in rows.values():
        for r in b:
            reasons[r] = reasons.get(r, 0) + 1
    return {"rule": "pin-level blockers per obligation (oracle pins, excludes, refusals, the W0 pin); every claim is also blocked by the evaluator-side blockers of QUALIFICATION_RUN until they clear (RULINGS Q67a)",
            "total": len(rows), "closable": sorted(k for k, v in rows.items() if not v), "blocked": {k: v for k, v in sorted(rows.items()) if v},
            "counts": {"total": len(rows), "closable": sum(1 for v in rows.values() if not v), "blocked": sum(1 for v in rows.values() if v)}, "blockerCounts": dict(sorted(reasons.items()))}


def oracle_scope(oracle):
    """RULINGS Q45a, Q45b: obligations an accepted oracle may close, and those blocked by its excludes or refusals."""
    pin = ORACLE_PINS.get(oracle, {})
    uses = [o for o in OBL if oracle in o["oracles"]]
    blocked = {}
    for o in uses:
        why = []
        if o["id"] in pin.get("excludes", []):
            why.append("excluded")
        for name, ref in ORACLE_REFUSALS.get(oracle, {}).items():
            if refused_by(o, ref):
                why.append(name)
        if why:
            blocked[o["id"]] = why
    return {"uses": [o["id"] for o in uses], "mayClose": [o["id"] for o in uses if o["id"] not in blocked], "blocked": blocked}


GATES["GATE-ORACLE-PIN"] = {"rule": "an obligation whose expected answers come from an oracle closes only once ORACLE_PINS pins that oracle's files with an acceptance receipt, the obligation is not in the pin's excludes, and the oracle does not refuse any case it selects (oracle_scope); a null pin fails closed (V-O02 C1, RULINGS Q45a, Q45b)", "requires": ["ORACLE_PINS complete for every oracle the obligation uses"], "appliesTo": "every obligation using an oracle listed in ORACLE_PINS (O-REPLAY, O-TDK1)"}
GATES["GATE-BROKER-HARDENING"] = {"rule": "no promotion claim that makes a log-source composition a default until G7.broker.promotion-hardening is closed for it (RULINGS Q50d, Q58c, Q62b); merging it behind a default-off option needs only the Q62a fixes, independently re-verified", "requires": ["G7.broker.promotion-hardening"], "appliesTo": "promotion claims on log-source compositions (CLAIM_ADMISSION)"}
GATES["GATE-TDK1-VECTORS"] = {"rule": "G1.decimal.tdk1-differential closes only once TDK1_VECTOR_PIN names a reviewed vector file by sha256; a null pin fails closed (RULINGS Q35, R20 V5)", "requires": ["TDK1_VECTOR_PIN complete"], "appliesTo": "G1.decimal.tdk1-differential"}
# RULINGS Q31i, Q48a: W0-1.1.1 at ada2e90 ACCEPTED by V-D01's delta check; the 95 file hashes of
# lab/verify/D01/W0-1.1.1-ada2e90-SHA256SUMS are pinned. The fingerprint stays a required null input until O-DOMAIN's independent
# generator reproduces V-D01's final fingerprint (RULINGS Q40g); until then every domain-dependent claim fails closed.
W0_FILES = {
    "lab/world/W0/README.md": "d5d6d17759f2866f867432f63470243108b5ad8851dd6d18425dcef623f1aa9e",
    "lab/world/W0/SPEC.md": "23ca6eb157e07f352495bdfd9d86ce4dedc490d5795264c8662681722c352807",
    "lab/world/W0/cases/C01-base-r1.json": "3ccb749c222ee47848f3904629fa9a8c07f668f20fb664c7dcde1cc12867e8ee",
    "lab/world/W0/cases/C02-base-r2.json": "c5350dc56365feec4eba7bb4c5df2d5f92849a900d414e287a7a0f9e68f00117",
    "lab/world/W0/cases/C03-new-hire-pre-start-r1.json": "22bb577dbdc60eb04d4214d15f2d9cdea0f3dc187accc40a5f8f317a0c7a2e60",
    "lab/world/W0/cases/C04-start-date-moved-r1.json": "37b706ba926295eca770a62032afe25ae0fe7ab3359cc073d28c84c46fa9c97d",
    "lab/world/W0/cases/C05-start-unknown-r1.json": "24f0f50af9d9be9b7208b5768b6c24df555249f482152a51ce0607c783c30e88",
    "lab/world/W0/cases/C06-i9s1-due-exact-boundary-r1.json": "feb873bb99b59412c3a2bdf983bf4859c9858cf01638a4a21802d459a5a21236",
    "lab/world/W0/cases/C07-ssn-erased-r1.json": "d63a60eaf4fb69af25d4de49bec6d9343ab54ed97e449f21ef3fc2d5a9a085ec",
    "lab/world/W0/cases/C08-ssn-bad-format-r1.json": "7c2b281829c42ebdc947d15a19eb89ae1d2845fc378b38c6cfcdb6ed3fa495c6",
    "lab/world/W0/cases/C09-everify-submit-r1.json": "f50e25678a6e313131541dd087a74cad379cfada036f2202b8c337c069bff4ad",
    "lab/world/W0/cases/C10-everify-tnc-r1.json": "dbc03fc0dc77a04fdfb699156f2a7fdb0328f15b7f6b85df2df8d77b6061d373",
    "lab/world/W0/cases/C100-publish-opaque-payload-tokens.json": "5cf4cec9fe492c27a1e150afe8a9e4fef0e6dcf2f9eb7c160c41d0f2eba21392",
    "lab/world/W0/cases/C101-publish-state-out-of-order-repeats.json": "23abef3b181511a795e903f13d24a038d4bb9f74c3e3af31cc3b2e9ff5681471",
    "lab/world/W0/cases/C102-publish-duplicate-id-in-record.json": "e7a5f2ebd428d7e901ca1edb59c451b1f64ff8636b2608c870a9168e2d96d705",
    "lab/world/W0/cases/C103-reconcile-equal-from-tx-beats-release.json": "fa38812225878053a5f4e13a602bf65a0975b56311d47a64a388a86b017bcf31",
    "lab/world/W0/cases/C104-reconcile-equal-tx-release-string.json": "3f43f6ceae22da7ceb2ca53c787f3ec8581ac844483861d8d34f9483a73d7113",
    "lab/world/W0/cases/C105-reconcile-from-equals-valid-time.json": "f81ec6dd76400b6f903caf30a706f6e4991610f44f077a8034f3bd6b8dd17900",
    "lab/world/W0/cases/C106-reconcile-activation-at-basis-tx.json": "616b458458f2161dc8abc165a4af8747554db6d0b19590336aba21bb7b9c8669",
    "lab/world/W0/cases/C107-fact-at-basis-tx.json": "3fe3ac5ca2d9534d6d2a81f6b98f5a00f2b38e39971a9797217a61241dc36538",
    "lab/world/W0/cases/C108-basis-tx-zero.json": "4a61a2f54827b457f0ccbf4a6144653f968c8e86403cf7dc70cc48fdd687d1d9",
    "lab/world/W0/cases/C109-basis-tx-max-safe.json": "95b45fce1b1ce1810cf27e245208dbfb44d976f7a62802da3e186f1cda81397c",
    "lab/world/W0/cases/C11-flags-authorized-overtime-r1.json": "b28d2d6146b43e978d7a67235a727831ef6d44c81733f7a05474b6246cc0e10e",
    "lab/world/W0/cases/C110-err-basis-tx-2pow53.json": "8cca4cc990182fe8d94193e748ab828f38160f67b4094ac229f15efdb840b7e7",
    "lab/world/W0/cases/C111-err-fact-tx-2pow53-plus-1.json": "5c18c596932792a803f2df27bec712a92b4e97c2fec6b4d930f6a5e4cb9c4aff",
    "lab/world/W0/cases/C112-err-value-before-basis-in-one-fact.json": "a41e9c69a1e8e38cc22911b737789c6b7163c34ada7038982ff0065392f2c231",
    "lab/world/W0/cases/C113-minwage-local-floor-below-state-r2.json": "6b71689d53ebd41e946bb3fa33a755f901c0e03aaa20a5f628128debbf3c5180",
    "lab/world/W0/cases/C114-paychg-position-from-decisions-fact.json": "dfa6a9911bf3b513e069c4f3e9d69f3716cd1f99d1c62858a923e4c0d314c199",
    "lab/world/W0/cases/C115-i9s2-incomplete-record.json": "ce0bff04d6ee3c4830fc63edcd28d64e506786f11b6f97c283b563803626b6e3",
    "lab/world/W0/cases/C116-prop-latest-proposal-counts.json": "c5ba9b468c608a401eff38e1a9c41be8e78db30c3acf28e99e04a87e3fe2408c",
    "lab/world/W0/cases/C117-docexp-reverified-false.json": "128b44634c535004717e2aff2639873eb1b9e926efd1e1f44d98e5cc683731d4",
    "lab/world/W0/cases/C118-r3-scope-listed-jurisdiction-without-facts.json": "61f6037d71d49bdf46367b60a663d207947a9a5fd9f3088840bc6859ae7f22a6",
    "lab/world/W0/cases/C119-life-at-start-instant.json": "a45a2063f17a53834870ed6cd0492d8c7096b5dd0dec86a048336ed1f68dc865",
    "lab/world/W0/cases/C12-everify-fnc-bgc-consider-r1.json": "8417a6e9b89ab9d6fa17e257e7bc077d21d1386c3b3a719102c35d73a106abc1",
    "lab/world/W0/cases/C120-evsub-dashed-ssn-with-accepted-result.json": "ce0e489e72308f37b2cfac68ace68a999f7909bac10dab47f27c9ff635138af9",
    "lab/world/W0/cases/C121-affected-worlds-unsorted.json": "bfe81b783ef9d452aab621b219f83004c221d0e6df965251230189b4ba141cd0",
    "lab/world/W0/cases/C122-publish-equal-tx-earlier-valid-time-skipped.json": "4201e3b30695a51ab6e8a70eb99eed7c3383a19b3aa107019c4a01fe19875aac",
    "lab/world/W0/cases/C123-publish-equal-basis-applied.json": "2d3c90c3f8c37435d9e6ba602cf1d160680893e0340589205de4713daac020bc",
    "lab/world/W0/cases/C124-publish-retirement-per-subject.json": "8ef07f58a578487f777b7a0f1164ee0ac4a6445c890c29ceb02758a203fd8acd",
    "lab/world/W0/cases/C125-receive-two-waiting-released.json": "b6f47e1bcc673a3d661d1539d91b3c65a04ba19db079a18d215121c82ccbf9aa",
    "lab/world/W0/cases/C126-i9s2-saturday-start.json": "e0a86b7d99ad64c390aa2004281caef3dcb2956a04877e28c2633e6eb84843ed",
    "lab/world/W0/cases/C127-facts-reversed-two-documents.json": "849290281711cc2d49988fff6ef5e270f7fa24f6b09798af830e4c523ab51526",
    "lab/world/W0/cases/C128-err-cents-nan.json": "667deaad612f8345770824a6b994251d14ca16e13b583514f3eb07cfdf078300",
    "lab/world/W0/cases/C129-err-basis-tx-5000-digits.json": "db4817cf4e0c382d4a0838483764d06892983d6728431d2b4425b19e774334df",
    "lab/world/W0/cases/C13-bgc-reject-r1.json": "9cd764476b44bfdfe177a1f05d8d2c5cedf9860a2b0dcbe103a2cf9665f83fb2",
    "lab/world/W0/cases/C130-publish-5000-digit-seq.json": "5f56b41e91f5a8a4ebabcdd71f1f074a6e4cece6a0e2e444f518797dd84fd274",
    "lab/world/W0/cases/C131-receive-5000-digit-seq.json": "ec1ad299aafd98f67dc46803c0911a87e9e48b936d650e4fb81ee73d296e487a",
    "lab/world/W0/cases/C132-err-cents-2000-nested-arrays.json": "4a360fa4ac261b5933b27656088b769babf1d9be7b3218a9f45f25dd035b575a",
    "lab/world/W0/cases/C133-publish-code-point-order.json": "3bebccd6c4e2d55a69869a761709eee7fb88d89f46292771a23942161b5869cc",
    "lab/world/W0/cases/C134-receive-code-point-order.json": "b577e917d102fb33fa8970e7090bd9903fcf0fde800e8c7057ac2cb664a222fe",
    "lab/world/W0/cases/C135-receive-inconsistent-snapshot.json": "f3d576348a4ce856218aa16f0dcc69e475932e261b249ee7a12494316efd6887",
    "lab/world/W0/cases/C136-publish-opaque-string-and-number-writer.json": "d4e01c42661f71194602d0d8ffa1b11c8cc19ad6eb1a20d58a9261a5b2398c03",
    "lab/world/W0/cases/C14-proposal-only-r1.json": "981a5add96447160474160c5fdbcc6c4f97444f9392f9a5412b99e7f50492a5d",
    "lab/world/W0/cases/C15-proposal-then-decision-r1.json": "61206e550163dd8cbd6a6e7df589bddb8112fb3ffb383f0c93cdc6d58fd90ae0",
    "lab/world/W0/cases/C16-agent-decision-record-r1.json": "9c08447c19f28f9d2640d8f038d578bd7719157ee0e24932828a092ca24a09b3",
    "lab/world/W0/cases/C17-decisions-last-wins-r1.json": "2c9eade2d25af6283513bd622d3206254a8cbae0d89161c52f0417599882cec1",
    "lab/world/W0/cases/C18-decisions-same-tx-tie-r1.json": "1767beb767651d9c219e0e1ccea1f819b914e9b7ad69148b18dffe1df7bcbd5f",
    "lab/world/W0/cases/C19-docs-before-expiry-r1.json": "919f8937a6ae4d806db1c4ca485ff6e0b63a6c8ed08512abe1a7d58b8d9136bc",
    "lab/world/W0/cases/C20-docs-before-expiry-r2.json": "3858027be2fe9c079e92ec38f5b79ba11a7257e7983393f2d8ea1acf4b90296e",
    "lab/world/W0/cases/C21-docs-ead-at-expiry-r1.json": "423def4d67694b977cf2977b35db8b781c2f220c8c30a277577bd630403c2c85",
    "lab/world/W0/cases/C22-docs-other-rows-r1.json": "25dc757a6bd255a0052ab44bcba1c0473de0fd9be118496cbc47b18d87549821",
    "lab/world/W0/cases/C23-minwage-below-after-raise-r1.json": "b96a18f379d505cf286d53684c174424e0575e606125f49f72b28dd5f370e0a9",
    "lab/world/W0/cases/C24-minwage-floor-unknown-r1.json": "a5d02f108ef1e96591a9e13f7ae7cf43d960bf589837fc021d77f77228adda91",
    "lab/world/W0/cases/C25-minwage-local-floor-r2.json": "1319f9456cefb164415cc167daa04f2b2d19b4657eb327de47a7bbca25502ea6",
    "lab/world/W0/cases/C26-section2-window-r2.json": "cee564a9ce38ad17daeb5a9e6c720577313771f143a20f37bbf9d4d3cf2f62a1",
    "lab/world/W0/cases/C27-numeric-max-values-r1.json": "4683dbaeb070028aee184e38feb02afae8abc8cacc4b2d5a9c951dba68dcb6af",
    "lab/world/W0/cases/C28-paychg-501-stale-approval-r1.json": "3790f271331212501b34b3763047d2fa68d7947d6b235459443ac277e046fee7",
    "lab/world/W0/cases/C29-paychg-500-r1.json": "1fa81a661be4f468076ba5af3b306793dce568a6389a0c28a0d95236535e37af",
    "lab/world/W0/cases/C30-paychg-approval-same-tx-r1.json": "5329dac407e3caa80b2b8abe55b185903bd9e8e63cdb400170f7599fb2f00ec5",
    "lab/world/W0/cases/C31-reconcile-after-activation.json": "bb087a95afac4b7a4bd7a5c40883517b021f397aeaf4e2466bd6d07218596951",
    "lab/world/W0/cases/C32-reconcile-before-activation.json": "ef23082d88efbd218d9c81b7d871de731b675f73e567b1a52753df28c140c478",
    "lab/world/W0/cases/C33-reconcile-no-release.json": "ae26c941d67b0caf2ae99c43bd396c1e6bce09be3a4913b6283f86a0f9b03da5",
    "lab/world/W0/cases/C34-affected-state-wage-r1.json": "b4687a0e75cdeb263e5c4e9460900b335a92a07ba69c01fa57064121d9455b89",
    "lab/world/W0/cases/C35-affected-local-wage-r1.json": "bf96c2e2a3e8d516b20081b92e0911b7f8ec73d0ff3da5684dd743026763e371",
    "lab/world/W0/cases/C36-affected-local-wage-r2.json": "6df8be1450ba75d08b1c936d25606bd54f55ade3a3cbf17b4e590a65e12e8a17",
    "lab/world/W0/cases/C37-err-minutes-10081.json": "4d1838c75f24766da351ccdee515cd64625ca8c023762cbe7c3efbf369d3afd8",
    "lab/world/W0/cases/C38-err-cents-integral-float.json": "19076dfd0a0145927c47868cd13fd9628591d7a7560e33f73bc6c479de38fba3",
    "lab/world/W0/cases/C39-err-cents-2pow53.json": "4bc13ca5a15cfddde2ac733d0e4bde8db81996f78254bc12053f4118eab73271",
    "lab/world/W0/cases/C40-err-cardinality.json": "0d36d9ab3346bd333a64747e629afbddac1b5b709e4e74e9a94da474469df34b",
    "lab/world/W0/cases/C41-err-fact-after-basis.json": "19fcfde7b898fe945ad754303c68c555b355e3ab72a2efb70bafa43f311b9a57",
    "lab/world/W0/cases/C42-five-work-items-r1.json": "6483f46c44fd42188279b8f0c8e6f5b23fb197067646e2e12f0ed53e9c4a59ef",
    "lab/world/W0/cases/C43-err-first-failing-fact.json": "28b8c34e68e2e6b22b35589a8bc5d81596459bfa99a525fdaee70a46e58ff955",
    "lab/world/W0/cases/C44-err-unreachable-fact-validated.json": "44c5954cfc9992d70b9a86d0838e7122ac8331ed155bfc9762488a860f986d76",
    "lab/world/W0/cases/C45-err-tx-float-token.json": "138f32476814c5400c329768ce60f54c1b0549bc625b618d6a5dcb23aeb0358b",
    "lab/world/W0/cases/C46-prop-older-and-equal-decisions-r1.json": "fe72db73ab4e07d59eefc8c9f32a362fc0e233390d850b09fa3d82e1ace02372",
    "lab/world/W0/cases/C47-paychg-reject-after-change-r1.json": "6418b607f6102d86d0f0dabf04b66a4f3ad29d36bf93b4f779d469f0e9aa5d44",
    "lab/world/W0/cases/C48-minwage-no-location-r1.json": "8b8af098733e671ab1e165f10d76ea984487cf222573970011421c17fc423eee",
    "lab/world/W0/cases/C49-evstat-tnc-without-status-at-r1.json": "35c836b391aab2fe7237e810a4f1d7d1de910ba6d778bea2bd882e9842bf463a",
    "lab/world/W0/cases/C50-evsub-submit-without-start-r1.json": "2e8713f05aff95c6d6519ec1384b98f2c0a1a3eafa50ca85deac7d4c7df93d58",
    "lab/world/W0/cases/C51-docs-ead-at-window-r2.json": "93bf45f9b9e49211b7534f01ae0f4f112366782ba9e1fc4ab46e4b7be7ebdac6",
    "lab/world/W0/cases/C52-evsub-result-accepted-r1.json": "f289904288b1abe5d8437e17c71605362efa7bb9928098fbfbf4173da68db5fb",
    "lab/world/W0/cases/C53-evsub-result-rejected-r1.json": "03a4740aaecdbbbf802dfafe50554e2e52fc099bf3fb4ee607db66bc21c01902",
    "lab/world/W0/cases/C54-ot-r3-at-threshold.json": "194c65730a60cb8f446466b08a0b9f732f50af74069727fffa31c46b9290eae2",
    "lab/world/W0/cases/C55-ot-r3-above-threshold.json": "2ede0132eae69126683ad44d81605a22442de68fbc78b2afeaf9b450d4140176",
    "lab/world/W0/cases/C56-ballast-world-r1.json": "3d196002f1d1080d7d9abd8e78c78ab33a94d3d4a7c67ec339baf994bd3c4228",
    "lab/world/W0/cases/C57-affected-ballast-write-r1.json": "9d873cc434df2345b4e35cdd144a1231ad2fd6038c1f1a4cee4a09a7faed280b",
    "lab/world/W0/cases/C58-affected-jurisdiction-write-r1.json": "fb82eedb87ed2da85e810be9cc16aad24f6c8ca3be7154f8bcf59a745a19425f",
    "lab/world/W0/cases/C59-affected-jurisdiction-write-r2.json": "6b15e68e3a079dad147e527f5127c17766b36aa576d213c735b1b6d483eadc89",
    "lab/world/W0/cases/C60-affected-location-repoint-r1.json": "16d71dc2f403dc904fd3274cc72e3ffb26fc24ea0adefcdd3018636fd3c2aeba",
    "lab/world/W0/cases/C61-reconcile-equal-from-tie.json": "fdb193c360b8483ab826652f9b6ff480c851d531ea359f7c7d4033a80c7b85ca",
    "lab/world/W0/cases/C62-err-unknown-other-placement-entity.json": "606531670e91d931ef50a65c8685da6f96e0f2cd4f51ed6fcb67223603721fa9",
    "lab/world/W0/cases/C63-err-unknown-attribute.json": "79bf45ba1f80aef85f1ee3ecd4f538068427b54c30d8a32e07b67da99953dbeb",
    "lab/world/W0/cases/C64-err-erased-non-pii.json": "b918cc794ef7a9a5bfd6e3d952a1b977ad48a53aa7dc34a2477f19b6aa65e6f3",
    "lab/world/W0/cases/C65-err-activation-bad-hash.json": "a3be66c261085e67543dc22914b0ba0955b2b1ad0274d8086525c684e2294bee",
    "lab/world/W0/cases/C66-err-duplicate-key-in-v.json": "6ef9ac78cf95bcfc5569213f382abce18ab064eea87ff6efd53e4e7aa9f58904",
    "lab/world/W0/cases/C67-err-affected-duplicate-subjects.json": "72e044b49b5c668a688592ce21eae681ea97895c4a0ced42e212f9bbbf49ddd8",
    "lab/world/W0/cases/C68-err-cents-exponent.json": "8dcb739eb4870d2a4d9739624ecf7ed7f5e14968a5b642283327efb5238b581b",
    "lab/world/W0/cases/C69-err-cents-negative.json": "ea7a721fb328945ce0f438aa2c5283d8a3d319806c40fe6cff014b4b7e0d00b5",
    "lab/world/W0/cases/C70-err-cents-string.json": "a5c5daec312400da7e3e1bd2c8937f16a5c8e3d219c437c64f7bc2cf54304f05",
    "lab/world/W0/cases/C71-err-basis-tx-float.json": "e4eb699ba206b26c051607bf8a4c022ba2a737634080c3f75a282ce5588b1bcd",
    "lab/world/W0/cases/C72-err-activation-tx-float.json": "728d2e4b83b05ba2bd1c47369a9b927e692306e08bc900d8e8a089291b0e8497",
    "lab/world/W0/cases/C73-publish-rollback-r1-r2-r1.json": "1a95b75d69f5cab67da986e722c500a25d6e73adc09e27bac769c869c1dba9d1",
    "lab/world/W0/cases/C74-publish-correction-revert.json": "a374d0e4f745fcd996327c5cfb8dc094afde10cecf27231e1d8c9789a003523e",
    "lab/world/W0/cases/C75-publish-crash-before-delivery.json": "124d3420cfbcd6250658648f84175d0143bcbe8dc76ab222e0b6fa7bfda52f0c",
    "lab/world/W0/cases/C76-publish-unchanged-activation-recovery.json": "385c72184dc9fcaa4a999ac0250723777967169354b703fa499a8ee9a2ec85fe",
    "lab/world/W0/cases/C77-publish-older-basis-skipped.json": "209624aee8c34fc8210658d65b41d24135ed8312c0db291943e94172eaf8e195",
    "lab/world/W0/cases/C78-publish-retirement-reappear.json": "7ecabfb5399b605803097db180a4e66ef64f9f56394e0afb55f37576780cb5dd",
    "lab/world/W0/cases/C79-receive-reversed-arrival.json": "074a40b0142ddfa279834c168425a87649bac3efd33ba067ba058585779dc078",
    "lab/world/W0/cases/C80-receive-gap.json": "c8c6d9d844440d794b19dcb4b62ae90d66e0ab024de87d54c4f41fb89c7997dd",
    "lab/world/W0/cases/C81-receive-restart-mid-sequence.json": "03e62d3d28469348ffc31d88e123191f7407e44624533919365b2d3294f59cd1",
    "lab/world/W0/cases/C82-publish-guard-advances-on-unchanged.json": "a9f7550c44b79499ca6b80d69decf9a34bc25a2ece075d573fe97e8ea6553377",
    "lab/world/W0/cases/C83-receive-duplicates-and-gap.json": "6898782d51e376bfb083d1e8f84627e24d7e773ea945ccaabe20a7fa2d4ae2a6",
    "lab/world/W0/cases/C84-err-publish-state-without-pending.json": "a4067364cab65000435c4ac82f5d245930bc8c07d16a4271899a9ecd88b62507",
    "lab/world/W0/cases/C85-err-receive-seq-zero.json": "b6e6df8dfdb169fc4940d70641b60236d5f0ab95227e34ce2507552be92b2af7",
    "lab/world/W0/cases/C86-ot-r3-outside-scope.json": "e37c0c1781f873d8230308f10cb4b30cf847b43b07605b78ca1d730649381ef9",
    "lab/world/W0/cases/C87-affected-r3-scope-reach.json": "78aeafcc5b6018ddaa948b174b76db9988e773c319d3148761f903a5ec10ccec",
    "lab/world/W0/cases/C88-err-erased-marker-on-instant.json": "fcbca4158aca12ae9e9fe3dd7f74b35e8ad1af0b27b259ed01537550e1c0ca2c",
    "lab/world/W0/cases/C89-err-array-on-date.json": "c3e75b74afd7ea2164cdd4d14d99174654bf06cd2942ad1f579c2be1c73aa25e",
    "lab/world/W0/cases/C90-err-cents-5000-digit-token.json": "ced553d48da4b429332de5434962c786292be96fb3985781f66cac0a1b4bb13d",
    "lab/world/W0/cases/C91-err-bytes-bom.json": "8704c265bf7668e25643bdccae59cdf6d1ebfb159045e13c49e79d3642ac926b",
    "lab/world/W0/cases/C92-err-bytes-not-utf8.json": "d86f25d7578313b56908251505190c95ebb8568fbe0ce8c8fcc87267ce83568d",
    "lab/world/W0/cases/C93-cents-negative-zero.json": "7b2514c558f1ff3aa77454f8f3b265523c3d6d4977a896a57e6246132f056aef",
    "lab/world/W0/cases/C94-err-fact-tx-negative-zero.json": "80f3304ab74fb7e04c077c2452785d1c696822f64bfb5fe267996edab73a26b7",
    "lab/world/W0/cases/C95-err-cardinality-after-unknown.json": "5cd04325db349edeb119824726d022c5fd74a11a6516019c05dbc12ff0dffa30",
    "lab/world/W0/cases/C96-err-affected-world-by-world.json": "ac19b12d04731c834ed6be33bf0368ae23830b0793ec745be1426acb47a420cf",
    "lab/world/W0/cases/C97-err-activation-value-before-basis.json": "9b6ebd057e5f2f1253c0ef51d9c176fed9c307aa89f80d0bab0207f594a33ac8",
    "lab/world/W0/cases/C98-err-world-before-activations.json": "2b5f9b7b02796f0bbeb3839c7d3396356e27a04b6a9eae85e0e5ba828f899708",
    "lab/world/W0/cases/C99-err-no-release-no-fallback.json": "13c72dd4dce45325d3c1b420b18462eb24615fba532d36ab8ae6d2f6c4121f07",
    "lab/world/W0/expected-sha256.json": "dfe90c7d33603c89c9f027b990e430f2a355950db2b559d700281c2b6cc1c988",
    "lab/world/W0/input-sha256.json": "e5125990bfd85009c38b2d9c3c6c6d17fb089f89a2cc7812b288a41687fe61ce",
    "lab/world/W0/releases/R1.json": "c8c6de6df5068396eef8648a9c984376b56bbeddbd4af88677b5212239f210b7",
    "lab/world/W0/releases/R2.json": "be914f7a9ed8e7799c0fd445fc5564e0a61361c1f58d14263f68e7f95c83a051",
    "lab/world/W0/releases/R3.json": "8f7962e89c1150b6b56bff180e67042ad82c18491f011c406d7ca417d08264fd",
    "lab/world/W0/releases/index.json": "f5e3f8c16a8dd2c64f0de27762368febd2e08aa5b3f5a622a2a57e9b61dc0dfc",
    "lab/world/W0/schema.json": "4f9cd22fe6c95e19af6983a4ec622eb20b137789cfe25ab82c9d0a826a5a79b5",
    "lab/world/W0/validate.py": "ae44e94dcf6e60f98cd7a7208a6f34a3e1e2a43d744a6d503111887fd1b261eb"
}
W0_FINGERPRINT_CANDIDATE = {
    "source": "V-D01 delta check of W0-1.1.1 (lab/verify/D01/VERIFY.md, final fingerprint); reproduced by O-DOMAIN 5d1fd1a (lab/oracles/domain/receipts/population-100k.json) and V-D01c, unchanged by W0-1.1.2 (V-D01e)", "rung": "100k",
    "basisTx": 4338757, "facts": 44537987,
    "worldsSha256": "fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760",
    "releasesSha256": {"R1": "c1b2d410244121d64b476c2f99c32830ea1b1f536928c9d12b0e886132351a79", "R2": "551bbbc479eecd15d4f5eb13698f61d20c09a900b7f83a2b10858fb2ba13b562", "R3": "a595092272c16343b0dfe9c9db57fbcdd7556fbf8be40afbaed014710fceee2f"},
}
W0_PIN = {
    "rule": "pinned at a contract version bump only (RULINGS Q31i, Q32f); W0-1.1.2 ACCEPTED at fedfcda with the 146 file hashes of lab/world/W0/SHA256SUMS, whose own sha256 is pinned (V-D01e N2); the population fingerprint is pinned because O-DOMAIN's independent generator reproduced it (RULINGS Q40g, Q48a; V-D01c); a null field fails closed",
    "reviewedBy": "V-D01e", "reviewReceipt": "V-D01e delta review of W0-1.1.2 at 242bb40 (FIX-FIRST for E1 and E2) and the orchestrator's diff check of the fix at fedfcda (ACCEPT) (lab/verify/D01/V-D01e/VERIFY.md, last section; verify/D01 d9021cf)", "verifierEntry": "V-D01e-W0-1.1.2",
    "fingerprintOwnership": "the O-DOMAIN fingerprint pin changes only by a reviewed contract version; the evaluator owns the W0 pin it passes to admission and a claim can never supply it (RULINGS Q55e)",
    "version": "W0-1.1.2", "commit": "fedfcdaee6f3ea188e96d9eec9671cbb0c623f5c", "hashTable": "lab/world/W0/SHA256SUMS", "hashTableSha256": "b5941569402865a52149ed0116efa60eb5b489dc9a27d15f8591e2daa51b051c",
    "files": W0_FILES, "frozenHashes": ["lab/world/W0/expected-sha256.json", "lab/world/W0/input-sha256.json"],
    "deltaCheck": "ACCEPT (V-D01e: C01-C87, R1-R3 and the fingerprint byte-identical to W0-1.1.1; 49 new cases C88-C136 re-derived; E1 and E2 fixed at fedfcda and accepted by diff check)",
    "oDomainFingerprint": dict(W0_FINGERPRINT_CANDIDATE, reproducedBy="O-DOMAIN 5d1fd1a receipt lab/oracles/domain/receipts/population-100k.json (match true on all six values), confirmed by V-D01c through heavy.mjs"), "fingerprintCandidate": W0_FINGERPRINT_CANDIDATE,
    "previousPin": {"version": "W0-1.1.1", "commit": "ada2e90337b7ab210dc302df01c81896fe546bcf", "hashTable": "lab/verify/D01/W0-1.1.1-ada2e90-SHA256SUMS", "files": 95, "verifierEntry": "V-D01-W0-1.1.1", "replacedIn": "0.3.10"},
    "requires": "nothing further: files, review receipt, delta check and fingerprint are pinned; a change to any needs a contract version bump",
}

# ============================================================================ composition identity (TARGETS 4.1, RULINGS Q28)
COMPOSITION = {
    "assignments": ["source", "current", "history", "analytics"],
    "engines": "each assignment is XTDB or QLever",
    "receiptBinding": "every receipt binds, per assignment, the engine image digest, configuration hash and slot; every replication edge (feed consumer source hash, translation generation); and each serving index's watermark at read time",
    "basis": "a basis is a source-of-truth position (POSITION coordinates (stream, epoch, offset, ordinal)) plus a valid time",
    "eligibility": "index I is eligible to serve basis B only when all hold: its watermark (a fully resolved prefix) has reached B in B's epoch; C1's eligibility for the query (mapping, valid time, exact cut); I can actually reconstruct B (a current-only index only when B is at or after the last change to every attribute the read touches, the validity interval of R18); and I has applied every erasure published so far, independently of B (ERASURE frontier) (RULINGS Q31d)",
    "watermarkRouting": "a read that finds no eligible index waits at most T-WATERMARK-WAIT-MS for one, then routes to an eligible fallback (the source of truth's own query surface or another index); the fallback's latency counts in the read's own latency; the receipt records the route and the surface language, a cross-language fallback is counted per surface, and fallbacks are reported as a share of reads per window; no index answers for a basis it is not eligible for (RULINGS Q31d)",
    "fallbackEquivalence": "outage read-your-own-write is tested on every serving surface the composition claims, native surfaces included, each against its readGuarantees guarantee (RULINGS Q55c); a stale fallback is rejected; where a fallback answers in another language, both recipes are bound to one semantic query identity (parameters, basis, meaning) and one expected answer from the oracle; total request latency and language attribution stay recorded (RULINGS Q34b)",
    "ackOwnership": "the source of truth sends the ACK after its own publication; read-your-own-write holds by routing (the pull at the returned position goes to an eligible index, else the fallback); in normal operation the current index is kept synchronous so the fast path serves that pull; during a current-index outage commits and ACKs continue, pulls fall back, the index catches up from the feed through a bounded queue, and fallback share and recovery time are measured (GS.04b); history and analytics stay asynchronous behind watermarks (RULINGS Q31e, replacing Q28's ACK clause)",
    "layerSwaps": "layers are swapped one at a time under matched workloads at small rungs (current-index candidates on P1 and P4; history candidates on past-basis reads and GS.12; source candidates on P2 and P3); only the two or three best compositions go on to end-to-end validation with the golden scenarios",
    "scopeKey": "an engine-scope receipt's key is (layer, the engine assigned to that layer, its image digest, configuration hash and slot), derived from the composition, never from engineOfLane",
    "sourceDeclaration": "every composition declares its source implementation: the source assignment carries variant engine-source or log-source (COMMIT_OUTCOMES), and a log source binds its log identity and durability configuration (implementationSha256, fsyncMode, fullFsync, device; LOG_FIELDS) next to the engine identities in every receipt (RULINGS Q55b)",
    "readGuarantees": {
        "status": "PROVISIONAL, flagged for Sam (RULINGS Q55c, superseding Q50b; the native half is replaced by Q58a)",
        "repository": "repository pulls give read-your-own-write by routing (replica, else overlay, else the source's log), never below the caller's basis; with the replica unreachable they fall back to the source (RULINGS Q50a)",
        "native": "PROVISIONAL, flagged for Sam (RULINGS Q58a, superseding Q55c's native half): native SPARQL, XTQL, SQL and Datalog go through a Triplex facade; engine ports are not a public surface. A request may carry after: position (wait until the replica marker reaches it within the deadline, then the typed E-BASIS-NOT-AVAILABLE {required, observed, replica}) or at: position (exact; the engine must also reconstruct it, else the typed E-BASIS-NOT-RECONSTRUCTIBLE). A client session sends its own high-water mark (its last commit position and last read basis) as an implicit after. A tokenless external caller gets the replica's watermark and the reported position. Every answer carries {basis: {low, high}, route}. With the replica unreachable the answer is the typed E-REPLICA-UNAVAILABLE. The default deadline is 2 s",
        "nativeDeadlineMs": 2000,
        "honesty": "no surface may present an answer as at a basis it was not computed at",
        "testing": "NS.P2 and G7.composition.ack-and-routed-ryow test each surface the composition claims against its own guarantee; NS.P2's repository read-your-own-write never establishes a native-surface guarantee",
    },
    "hotSubjects": "a per-subject FIFO queue in the candidate's command router (bounded; the typed E-OVERLOADED beyond the bound, never an unbounded wait) with same-subject group commit (up to 8 queued commands of one subject in one engine transaction, positions by ordinal); optimistic compare-and-set stays for cross-node races; the queue is part of the candidate, never the driver (RULINGS Q51a)",
    "brokerCurrentIndex": "a broker-side current-entity index (the per-subject current document served from the host, QLever kept for history and analytics) is a candidate current-index layer for P4; EXP-Q05 builds and measures it (RULINGS Q50a)",
    "brokerPromotion": "before a log-source composition becomes a default it must close G7.broker.promotion-hardening: an overlay memory bound with backpressure (typed E-OVERLOADED beyond the bound) for replica outages of the GS.04b kind (RULINGS Q50d), and the SQLite substrate of RULINGS Q58c (replacing Q50d's segment rotation and file-lock items) with log erasure by crypto-shredding (RULINGS Q58e); an out-of-process broker and off-device copies are deferred; merging a broker behind a default-off option needs only the Q62a fixes, independently re-verified (RULINGS Q62b)",
    "sharedVolumeFollower": "rejected for promotion: XTDB 2.2.0's ReadOnlyLocalLog reads half-written records and dies permanently (9 deaths in 30 minutes), though it never answered wrongly; the second-writer guard and the follower harness stay; the torn-read repro joins the R21 upstream-filing question for Sam, and nothing is filed without him (RULINGS Q63a, Q63c)",
    "parameterisedSql": "seeders and appliers on XTDB use parameterised statements only; 1,000-row literal INSERTs exhausted a 2 GiB heap (EXP-X05), as per-cell expressions did in EXP-P2X (RULINGS Q63d)",
    "currentPath": {"status": "PROVISIONAL (RULINGS Q68)", "horizon": "the default H trails head by one hour of positions (the 15% basis bucket); a pinned sweep or reconcile holds H at or below its pin; the broker refuses a new pin that would make H trail head by more than 24 hours (RULINGS Q68b)",
                    "expired": "facts whose valid_to has passed retire from the current structure through a valid-time horizon; EXP-P4 measures the 20% expired path (RULINGS Q68e)", "design": "see experimentDirections EXP-P4 (RULINGS Q68a, Q68g)"},
    "incarnationFencing": "single-request read surfaces read the replica marker in the same request as the answer; multi-request surfaces (Datalog, executor) use replica incarnation fencing: every replay begins by writing a new incarnation id, and an answer is accepted only if (incarnation, marker) is equal before and after (RULINGS Q67c)",
    "overlay": "the overlay merge is allowed for entity pulls only, keyed by id with the greater LSN winning, under a tested invariant (identity columns never change; a retraction is a new version); engine aggregates, Datalog and executor reads and paged lists never merge: they wait or fail typed; frames carry explicit tombstones, so erasure and deletes cannot resurrect replica rows (RULINGS Q58d)",
    "experimentDirections": {
        "EXP-P2B": "XTDB as a second replica behind the broker: one pgwire transaction per frame (ASSERT the marker, INSERT rows with a fixed _valid_from, INSERT the new marker; P0004 on guard failure); rows and marker read in one read-only transaction; the marker row is the eligibility authority; XTDB system time never carries broker positions; Local log first, InMemory log plus an epoch bump as an arm; predictions and measurements per R23 section 6; it starts after the Q62a fix round is re-verified, from the same author, so one writer owns the broker files (RULINGS Q58b; Q51b's original direction stays pending)",
        "broker-hardening": "after EXP-P2B: the host log moves to SQLite through better-sqlite3 (WAL, synchronous=FULL, fullfsync=ON, checkpoint_fullfsync=ON, locking_mode=EXCLUSIVE, application-driven PASSIVE checkpoints, a worker thread when readers share the process), keeping a CRC32C prev-chain column, a committed_at column, an epoch row and the marker and checkpoint cross-checks (plain SQLite misses mid-WAL corruption); heads, claims and operations become tables; the overlay becomes a persisted recent_rows table; predictions H1 to H6 of R23 section 6.4 (RULINGS Q58c)",
        "P1-replicas": "read scaling on both lanes comes from replicas fed by the broker (Q58b): each XTDB or QLever replica has its own applier and marker, so readers never touch the writer's log or indexer and the shared-log follower is unnecessary; EXP-P2B measures the first XTDB replica and a second-replica arm follows; Kafka (E8, about 7 GiB) is deferred (RULINGS Q63b)",
        "EXP-P4": "provisional (RULINGS Q68a, Q68g): P4's fast path is one current structure holding live facts plus facts retired after a retention horizon H, served at basis B only when H <= B <= W (W its applied watermark), else the history path; its first copy lives in the broker, written with the frame (arm H1); engines get a smaller copy in the same transaction or guarded update (XTDB tx_current, QLever cur graph) for list and native queries; EXP-P4 measures arms A0, X1, X2, Q1 and H1 per R24 section 6, exactness gate first, and measures X1 (default temporal bounds) fresh and aged before any write-path change, because FOR ALL VALID_TIME on XTDB current reads forfeits the engine's current and historical split",
    },
}
LAYER_BY_GOAL = {"W0": "source", "G1": "source", "G2": "current", "G3": "current", "G4": "current", "G5": "current", "G6": "current", "G7": "source", "G8": "current", "G9": "history", "G10": "source", "R": "current", "NS": "source", "GS": "source", "S": "source"}

# ============================================================================ world definition W0 (TARGETS 6.1)
WORLD_W0 = {
    "role": "a small frozen synthetic world definition used by every scenario, the P5 sweep and the P3 dependency rules; it stands in for Onboarded's real world definition and is not a Triplex product feature",
    "rules": ["I-9 Section 1 task with a due time", "I-9 Section 2 task with a due time", "E-Verify status", "background-check result", "document expiry (valid-time boundaries)", "pay rate at or above the work location's minimum wage (a shared referenced entity)", "hours over 40 (overtime)", "start-date boundaries", "proposals never count as decisions"],
    "ruleCount": "about 12",
    "releases": "two releases R1 and R2; R2 changes three requirements; releases are content-addressed and activation is a fact",
    "implementations": "the TypeScript reference kernel the drivers call, and O-DOMAIN, an independent stdlib-only Python oracle giving expected next tasks, obligations with due times, work items and effect traces from the same command stream",
    "previewActivation": "plan-impact preview (GS.11) and activation (GS.10) are compared at one common input basis (GS-10-11-COMMON-BASIS), never at different bases",
    "witnesses": "every scenario carries positive witnesses (subjects that must change) and negative witnesses (subjects that must not)",
    "workItemIdentity": "a work item's id is SHA-256 over canonical JSON of (subject, rule, kind, key) only; its content version hashes (release hash, input positions, payload) and is not the delivery identity; each id carries a durable publication sequence that increments whenever the payload to publish differs from the latest published payload for that id, and the outbox delivery key is (id, publication sequence); an activation that leaves the payload equal to the latest published one publishes nothing (early cutoff); duplicate-effect checks count by delivery key (RULINGS Q36a, Q38f)",
    "affectedSet": "the expected affected set of a transaction is the subjects whose static read set contains a changed fact; static read sets over-approximate and never miss (RULINGS Q36e)",
    "version": "W0-1.1.2, ACCEPTED at fedfcda (V-D01e with the orchestrator's diff check of the fix); its 146 file hashes and the SHA256SUMS digest are pinned (W0_PIN), and so is the population fingerprint O-DOMAIN reproduced (RULINGS Q40g, Q48a, Q57)",
    "readings": "SPEC 1.1.2 states the readings A01 to A15 as clarifications, each with a golden case (A10 exercised by the population): A01 to A10 from EXP-D01c (RULINGS Q53) and A11 to A15 from EXP-D01b (RULINGS Q57): A11 NaN, Infinity and -Infinity are W0.E_SHAPE, extending A01; A12 an integer token over 4,300 digits is still an integer token (E_VALUE for a value, E_BASIS for a tx), and implementations must not fail on their integer-parsing limits; A13 any nesting depth is a valid JSON value, then E_VALUE, and implementations must not fail on recursion limits; A14 strings order by Unicode code point, which equals UTF-8 byte order, for object keys and the sorts of items, subjects, effects and projection and the basis guard's validTime comparison, escapes following A07; A15 inconsistent receiver snapshots keep their entries as given, re-sorted stably by seq, only seq = done + 1 releases, and entries at or below done and the second of two duplicates stay waiting. Beside A12 (V-D01e N1): publish and receive integers have no upper bound; W0-1.1.1 stated none either, so no meaning changed. None of the readings changes a case of W0-1.1.1, a release or the fingerprint",
    "nextEdit": "none pending for W0; O-DOMAIN's next version adds unit tests for [1} (syntax error) and a duplicate key after the second member (V-D01c D1); its reading id A11 collides with W0-1.1.2's A11 (V-D01c D2, documentation only)",
    "ballast": "rule-neutral ballast (owned answer entities <S>/ans:k with field and value text no rule reads, and a reference chain deep enough for 3 to 6 hops) sizes each world from P4's frozen buckets (50% 50-200 facts, 35% 201-800, 15% 801-2,000; a world may fall up to 2 facts below its bucket); trace commands use W0 and ballast attributes only, other attributes stay E_UNKNOWN; a ballast write affects nobody (RULINGS Q40a, Q44a)",
    "twoHopFloor": "the wage floor is S.location -> L.jurisdiction -> J.stateMinWageCents (R2's local floor stays on L), so the dependency index follows two references; cases: a jurisdiction wage write, re-pointing (L, jurisdiction), and the R1/R2 split at that depth (RULINGS Q40b)",
    "positionOrdinal": "positions in W0 are the 1-based dense ordinal of committed Triplex transacts in the tenant's source-of-truth stream, in coordinate order, supplied identically to the kernel and to O-DOMAIN (RULINGS Q40f)",
    "generator": "every draw field is named (including the passport expiry draw); the population fingerprint is pinned once O-DOMAIN's independent generator reproduces V-D01's, using SPEC 12.7's exact recipe (RULINGS Q40g, Q44a)",
    "releaseR3": "R3 is a scoped release: OT threshold 2,700 minutes only for placements whose location's jurisdiction is in a listed set (about 10% of jurisdictions), reached through the reverse two-hop dependency index; the scope is part of the release's content hash; expected affected subjects and changed subjects are stated separately; plus a runtime-outcome attribute and population facts with later valid-from dates (RULINGS Q40i, Q44b)",
    "misreadingCases": "every case V-D01 lists as must-add and should-add is in W0's case set (RULINGS Q40e, Q44a)",
    "fanout": "work-location fanout is a seeded Zipf with s = 0.5 over 2,000 locations at the 100k rung (largest location about 1,100 workers, mean 50); other rungs keep N / 50 locations with the same s; only the 100k numbers are frozen floors (RULINGS Q36g, Q36h)",
}

# ============================================================================ evaluator counterexamples (RULINGS Q26)
# Each is a retained receipt set the evaluator must judge OPEN; together they cover every closure rule in use.
EVALUATOR_COUNTEREXAMPLES = [
    {"id": "CX-CALIBRATION-EMPTY", "defeats": ["CR-CALIBRATION"], "receipts": "a VC record with an empty values list", "why": "an empty requirement set fails closed"},
    {"id": "CX-CALIBRATION-MISSING", "defeats": ["CR-CALIBRATION", "CR-NS"], "receipts": "a VC record that omits one threshold an NS obligation names", "why": "every named threshold needs a record"},
    {"id": "CX-NS-MISSING-BAR", "defeats": ["CR-NS"], "receipts": "an ns-run with no measurement for one named bar", "why": "a missing bar is not a met bar"},
    {"id": "CX-NS-FEWER-RUNS", "defeats": ["CR-NS", "CR-GS"], "receipts": "two independent runs where T-RUNS requires three", "why": "run count is part of the rule"},
    {"id": "CX-NS-ECHOED-BASIS", "defeats": ["CR-NS"], "receipts": "an ns-run whose reads carry only the engine-echoed basis, with no driver-recorded requested basis", "why": "answers are checked at the driver-recorded basis"},
    {"id": "CX-NS-UNFROZEN-TRACE", "defeats": ["CR-NS", "CR-GS"], "receipts": "an ns-run whose trace generator hash or seed differs from the frozen pair", "why": "a different trace starts a new comparison series"},
    {"id": "CX-GS-WRONG-SCENARIO", "defeats": ["CR-GS"], "receipts": "a GS.05 receipt carrying the ns-run and cases of GS-04", "why": "each GS obligation binds its own scenario's evidence and bars"},
    {"id": "CX-GS-NO-WITNESSES", "defeats": ["CR-GS"], "receipts": "a scenario receipt without its negative-witness results", "why": "positive and negative witnesses are both required"},
    {"id": "CX-SELECTION-SHORT", "defeats": ["CR-PASS-ALL", "CR-REQUIREMENT"], "receipts": "executed cases fewer than the resolved selection x modes", "why": "VA8: executed equals selected"},
    {"id": "CX-ZERO-MODES", "defeats": ["CR-PASS-ALL"], "receipts": "a receipt declaring zero modes and zero executions", "why": "every obligation has at least one mode; single-execution counts once"},
    {"id": "CX-COUNTEREXAMPLE-EDITED", "defeats": ["CR-COUNTEREXAMPLE"], "receipts": "the original counterexample rerun with an edited case text", "why": "unedited text and unchanged oracle hash are required"},
    {"id": "CX-MUTANT-NO-REACH", "defeats": ["CR-MUTANT-KILL"], "receipts": "a mutation record whose reach probe never fired", "why": "MUTANT_RULE (1)"},
    {"id": "CX-MUTANT-CRASH-KILL", "defeats": ["CR-MUTANT-KILL"], "receipts": "a mutation record whose only failure is a crash", "why": "MUTANT_RULE (2)"},
    {"id": "CX-OBS-COVERAGE-GAP", "defeats": ["CR-OBSERVE"], "receipts": "an observation whose coverage window has a gap above maxGapMs", "why": "protocol coverage"},
    {"id": "CX-FAULT-REPS-SHORT", "defeats": ["CR-FAULT"], "receipts": "a fault point injected fewer than T-FAULT-REPS times", "why": "injection count"},
    {"id": "CX-STATIC-EXTRA", "defeats": ["CR-STATIC"], "receipts": "tsc output with one unexpected diagnostic", "why": "diagnostics must equal exactly"},
    {"id": "CX-SCALE-COUNT", "defeats": ["CR-SCALE"], "receipts": "a scale dataset whose stratum count differs from the analytic count", "why": "counts must equal"},
    {"id": "CX-METRIC-MISSING", "defeats": ["CR-METRICS"], "receipts": "a run missing one listed metric", "why": "every listed metric is present"},
    {"id": "CX-REQ-NO-STATEMENT", "defeats": ["CR-REQUIREMENT"], "receipts": "a WORKAROUND route without a plain statement", "why": "workarounds are documented"},
    {"id": "CX-MATRIX-NO-EXCEPTION", "defeats": ["CR-MATRIX"], "receipts": "a raw-required KNOWN-LIMIT cell without its exception record", "why": "per-cell exceptions"},
    {"id": "CX-PROVENANCE-INPUT", "defeats": ["CR-PROVENANCE"], "receipts": "a provenance manifest listing a source file beyond the guide and public docs", "why": "guide-only authoring"},
    {"id": "CX-WITNESS-CLIENT-COUNTERS", "defeats": ["CR-WITNESS"], "receipts": "work ratios computed from client-side counters", "why": "engine-side counters only"},
    {"id": "CX-BUDGET-UNFROZEN", "defeats": ["CR-BUDGET"], "receipts": "a candidate comparison citing budgets.json before its post-EXP-N02 re-freeze receipt", "why": "budgets are re-frozen before any candidate comparison"},
    {"id": "CX-SCREENING", "defeats": ["CR-NS", "CR-GS"], "receipts": "a P-SCREEN receipt", "why": "screening never closes an obligation"},
    {"id": "CX-STALE-DEFINITION", "defeats": ["CR-PASS-ALL", "CR-NS"], "receipts": "a receipt whose obligation definition hash differs from the current contract", "why": "VA6"},
    {"id": "CX-COMPOSITION-UNBOUND", "defeats": ["CR-PASS-ALL", "CR-NS", "CR-GS"], "receipts": "a receipt that binds one engine image but not all four assignments, edges and watermarks", "why": "VA14"},
    {"id": "CX-NO-VERIFIER", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "valid acceptance receipts with no VV-valid verifier coverage", "why": "STATUS_ALGORITHM"},
    {"id": "CX-W0-UNPINNED", "defeats": ["CR-W0-COVERAGE", "CR-GS", "CR-NS"], "receipts": "complete domain-dependent receipts while a W0_PIN field is null", "why": "GATE-W0 fails closed"},
    {"id": "CX-W0-FLOOR-MISSED", "defeats": ["CR-W0-COVERAGE"], "receipts": "a coverage record where R2 changes 15% of in-scope subjects' outputs", "why": "W0-R2-CHANGED-SHARE"},
    {"id": "CX-P2-REJECTS-VALID", "defeats": ["CR-NS"], "receipts": "a P2 run where every oracle-valid command is accounted for but some were typed-rejected", "why": "NS-P2-UNJUSTIFIED-OUTCOMES-MAX: accounting is not progress"},
    {"id": "CX-FORGED-DENSITY", "defeats": ["CR-NS", "CR-GS", "CR-FAULT"], "receipts": "a receipt declaring positionsDense true, or matching the 0.3.4 allocator hashes (OUTSIDE_BLOCK_MUTATION_FIXTURE), with only the dense nested-cut cases closed", "why": "no composition is exempt from the four falsifiers (RULINGS Q38a)"},
    {"id": "CX-CLAIM-NULL-ORACLE-PIN", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "a complete comparative claim with valid position, identity and W0 receipts while O-REPLAY's pin is null", "why": "RULINGS Q37b, Q38b: an unpinned oracle the claim depends on makes it a diagnostic"},
    {"id": "CX-CLAIM-SUPPLIED-NAMES", "defeats": ["CR-NS", "CR-GS"], "receipts": "a claim listing closed case names and compositionBound true but carrying no source-bound receipts", "why": "RULINGS Q38b: prerequisites come from receipts, never from supplied names or Booleans"},
    {"id": "CX-XTDB-SHARED-LANGUAGE", "defeats": ["CR-PASS-ALL", "CR-NS"], "receipts": "an XTDB receipt executed in xtql used to close the xtdb-sql lane (or the reverse), or a receipt without nativeLanguage", "why": "RULINGS Q39b"},
    {"id": "CX-SCREENING-CLAIM-PREREQ", "defeats": ["CR-NS", "CR-GS"], "receipts": "a P-SCREEN comparative claim whose composition is not proven dense and whose falsifiers are open, or whose W0 pin is pending", "why": "CLAIM_ADMISSION: prerequisites are checked on every comparative claim, screening included; the claim is a diagnostic (RULINGS Q34d)"},
    {"id": "CX-ZERO-OBJECT-HASHES", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "a claim whose case results cite all-zero object hashes", "why": "RULINGS Q42a: objects are opened and hashed"},
    {"id": "CX-STALE-BINARY", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "a receipt whose executed binary differs from its build manifest under the same source label", "why": "RULINGS Q42a: the binary is bound to the source tree through the manifest"},
    {"id": "CX-EARLIER-COMMIT-FALSIFIER", "defeats": ["CR-FAULT", "CR-NS"], "receipts": "a falsifier receipt produced at an earlier commit", "why": "RULINGS Q42a: receipts are fresh"},
    {"id": "CX-NO-MEASUREMENT", "defeats": ["CR-NS", "CR-GS"], "receipts": "a claim with every prerequisite but no measurement receipt for the claimed obligation", "why": "RULINGS Q42a"},
    {"id": "CX-UNKNOWN-OBLIGATION", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "a claim naming an obligation id the contract does not define", "why": "RULINGS Q42a: unknown ids are rejected, never dropped"},
    {"id": "CX-REFUSAL-AS-AUTHORING", "defeats": ["CR-PASS-ALL"], "receipts": "a receipt that treats an oracle exit 2 with X-NOT-MODELED as a case-authoring error and skips the case", "why": "RULINGS Q45b: the obligation fails closed"},
    {"id": "CX-POSITION-GATE", "defeats": ["CR-NS", "CR-GS"], "receipts": "comparative NS receipts on a non-dense source while G7.position.coordinates is open", "why": "GATE-POSITION"},
    {"id": "CX-R6-UNOPENED-MEANING", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "a claim with every object hash correct but no retained binary or module bytes, a verifier object {\"notAVerifierRecord\": true}, and case objects with oracleExit 2 and X-NOT-MODELED labelled PASS", "why": "RULINGS Q47a: schemas validated, binary and modules retained, verdicts recomputed (lab/reviews/plan-v2-round6.codex.md finding 1)"},
    {"id": "CX-R6-UNMATCHED-CONTROL", "defeats": ["CR-NS", "CR-GS"], "receipts": "a claim whose measurement and control receipts have no trace and no window, and whose control identity the claimant chose", "why": "RULINGS Q47b: validated workload identity on both sides; the control comes from A0_REGISTRY (finding 5)"},
    {"id": "CX-PAIR0-SINGLE-RUN", "defeats": ["CR-NS"], "receipts": "a comparative NS bar decided by one candidate run against one A0 run", "why": "RULINGS Q60a: a single run never decides a bar"},
    {"id": "CX-PAIR0-UNJUDGED-WINDOW", "defeats": ["CR-NS"], "receipts": "an absolute NS bar met in a window that failed the GREEN gate", "why": "RULINGS Q60e: outside GREEN windows a bar is unjudged, never met"},
    {"id": "CX-PAIR0-REGIME-MISMATCH", "defeats": ["CR-NS"], "receipts": "a candidate measured under a cpuset compared with A0 measured under a CPU quota", "why": "RULINGS Q60c: quota and cpuset arms are never compared"},
    {"id": "CX-PAIR0-COMMITTED-ONLY", "defeats": ["CR-NS"], "receipts": "a latency histogram of committed commands only, omitting expired, failed and rejected ones", "why": "RULINGS Q60d: every offered command counts at its censor time"},
    {"id": "CX-A0-SINGLE-RUN", "defeats": ["CR-NS", "CR-GS"], "receipts": "a comparison whose A0 numbers are EXP-N01's single run", "why": "RULINGS Q60i: single-run A0 is diagnostic only"},
    {"id": "CX-R7-INVENTED-EVIDENCE", "defeats": ["CR-NS", "CR-GS", "CR-PASS-ALL"], "receipts": "schema-valid records with invented case ids, selection all, oracleExit 0 and identical expected and observed objects holding [] , with no engine, oracle or verifier run", "why": "RULINGS Q55a: only the evaluator's own run qualifies; supplied records are diagnostics (lab/reviews/plan-v2-round7.codex.md finding 1)"},
    {"id": "CX-R7-SELECTION-OVERREACH", "defeats": ["CR-PASS-ALL", "CR-NS"], "receipts": "one invented case whose selection field claims to cover a whole selector, or a claimant-supplied manifest that does not hash to the pinned one", "why": "RULINGS Q55a: cases resolve from pinned manifests, every case and mode (finding 1)"},
    {"id": "CX-R7-RELABELLED-CONTROL", "defeats": ["CR-NS", "CR-GS"], "receipts": "a fabricated candidate binary presented as the control under a manifest labelling it with the registered A0 tree", "why": "RULINGS Q55a: the evaluator rebuilds A0 from the registry tree and must reproduce the registry's binarySha256 (finding 2)"},
    {"id": "CX-R6-INDIRECT-REFUSAL", "defeats": ["CR-PASS-ALL", "CR-NS"], "receipts": "a G7.migration.schema-evolution claim whose CS-MIGRATION case redeclares a decimal attribute from (5,2) to (6,3), retained with oracle exit 2 and X-NOT-MODELED and labelled PASS", "why": "RULINGS Q47c: refusals propagate through indirect selections and every retained case is re-judged (finding 6)"},
]

# RULINGS Q31k: complete receipt sets the evaluator must judge CLOSED, one per closure rule in use, so an always-OPEN evaluator fails.
EVALUATOR_POSITIVE_FIXTURES = [{"id": f"PX-{r[3:]}", "closes": r, "receipts": f"a complete, VA-valid receipt set for a synthetic obligation whose only closure rule is {r}, with every required evidence object, run count, calibration record, verifier coverage and fresh composition binding present", "expectedVerdict": "CLOSED"}
                               for r in ["CR-PASS-ALL", "CR-COUNTEREXAMPLE", "CR-MUTANT-KILL", "CR-OBSERVE", "CR-FAULT", "CR-STATIC", "CR-SCALE", "CR-METRICS", "CR-NS", "CR-GS", "CR-REQUIREMENT", "CR-CALIBRATION", "CR-MATRIX", "CR-PROVENANCE", "CR-WITNESS", "CR-BUDGET", "CR-W0-COVERAGE"]]

# ============================================================================ case sets
CS = {}


def cs(id, status, source, tags, cases=(), note=None):
    files = []
    if status == "EXISTS":
        for f in re.findall(r"(?:packages|qualification)/[\w./-]+\.(?:json|ts|py|mjs|md|nt)", source):
            files.append({"path": f, "sha256": sha_file(f)})
    CS[id] = {"status": status, "source": source, "requiredTags": list(tags), "requiredCases": list(cases),
              "manifest": f"lab/acceptance/cases/{id}.json", "manifestSha256": None, "pinnedSourceFiles": files, "note": note}


cs("CS-U44", "EXISTS", "packages/testkit/src/index.ts (triplesConformanceCases, 44 cases)", ["all"])
cs("CS-PKT71", "EXISTS", "qualification/workloads/temporal-workloads.json with recipes packages/qualification/src/native/xtdb-workloads.ts and packages/qualification/src/native/qlever-workloads.ts", ["all"])
cs("CS-PKT-MULTICALL", "TO-AUTHOR", "the 16 multi-call packet tasks plus the writer-between-calls shape of packages/qualification/experiments/qlever-task-basis.ts", ["all", "writer-between-calls"])
cs("CS-ENTRY", "EXISTS", "packages/xtdb/experiments/native-entry.ts and packages/qlever/experiments/native-entry.ts", ["all", "read-only", "safe-parameters"])
cs("CS-TYPES8", "TO-AUTHOR", "ACCEPTANCE 7.1 (value kinds)", ["all", "integer-edges", "number-edges", "decimal"])
TDK1_KEY_BYTE_CASES = ["DEC-SMALL-PRECISION-TDK1", "DEC-LARGE-PRECISION-TDK1", "DEC-ORDER-KEY-INDEPENDENT"]  # RULINGS Q45c: owned by O-TDK1
DECIMAL_CASES = ["DEC-CROSS-SCALE-COMPARE", "DEC-UNDECLARED-ATTRIBUTE", "DEC-NEGZERO-REFUSED", "DEC-TRAILING-ZERO-FITS", "DEC-TODECIMAL-EXACT-EXPANSION", "DEC-AVG-PREFLIGHT", "DEC-SCALE-EXCESS", "DEC-PRECISION-EXCESS", "DEC-CROSS-FAMILY-PREFLIGHT", "DEC-CONVERTED-COMPARE"]
DECIMAL_CASES += [r["case"] for r in DECIMAL_OPS + DECIMAL_CONVERSIONS + DECIMAL_SCALE_EVOLUTION if r["case"] not in DECIMAL_CASES] + [c for c in DECIMAL_TESTS if c not in DECIMAL_CASES and c not in TDK1_KEY_BYTE_CASES]
cs("CS-DECIMAL", "TO-AUTHOR", "VALUE_KINDS decimal; DECIMAL_RULES (RULINGS Q18); DECIMAL_OPS, DECIMAL_CONVERSIONS, DECIMAL_SCALE_EVOLUTION, DECIMAL_TESTS (RULINGS Q22); TARGETS section 3", ["all", "roundtrip", "range", "unrepresentable", "kernel-arithmetic", "cross-family", "operations", "conversions", "scale-evolution", "paths"], DECIMAL_CASES)
cs("CS-WIRE", "TO-AUTHOR", "WIRE_RULES (RULINGS Q30, EXP-F02 EXP-F02 wire-exactness report)", ["all", "json", "instant", "xtdb-encodings", "qlever-shadow", "integer-range"], [c for r in WIRE_RULES for c in r["cases"]])
cs("CS-OUTBOX", "TO-AUTHOR", "OUTBOX (RULINGS Q38f, Q40c, Q40d, Q40h, Q44c)", ["all"], list(OUTBOX["cases"]))
cs("CS-RECEIVER", "TO-AUTHOR", "OUTBOX receivers (RULINGS Q42b, Q44a, Q44d)", ["all"], list(RECEIVER_CASES))
cs("CS-ATOMIC-UNIT", "TO-AUTHOR", "OUTBOX atomicUnit (RULINGS Q42c): crash between every pair of the five transitions", ["all"], list(ATOMIC_UNIT_CASES))
# RULINGS Q52f: the rounding form of toDecimal(json, ...); O-REPLAY 0.4.1 refuses it, so G9.erasure.residual-shapes selects it, not channel-routing.
DECIMAL_ROUTING_Q52 = [{"id": "DR-JSON-CONVERT-ROUNDING", "rule": "toDecimal(json, p, s, rounding) applies the named mode (half-even, half-up or down, Q22) to the JSON number's as-written decimal reading (Q49e); without a rounding argument, excess digits are E-DECIMAL-FRACTION (RULINGS Q52f)", "case": "DR-JSON-CONVERT-ROUNDING"}]
cs("CS-DECIMAL-ROUTING", "TO-AUTHOR", "DECIMAL_ROUTING (RULINGS Q38d) and DECIMAL_ROUTING_Q52 (RULINGS Q52f); DR-JSON-CONVERT-ROUNDING carries no tag other than json-rounding", ["all", "repository", "native", "raw", "derived", "aggregate", "json", "json-rounding"], [r["case"] for r in DECIMAL_ROUTING + DECIMAL_ROUTING_Q52])
cs("CS-TDK1", "TO-AUTHOR", "TDK1_TESTS (R20 section 5.3 V3 to V7, RULINGS Q35) and the key-byte cases moved from CS-DECIMAL (RULINGS Q45c)", ["all", "engine-order", "ranges", "differential", "serialization", "writer-negative"], [t["case"] for t in TDK1_TESTS.values()] + TDK1_KEY_BYTE_CASES)
cs("CS-RANGE-OUT", "TO-AUTHOR", "LANE_INTEGER_RANGE; NUMERIC; RULINGS Q23 (every qualified write route rejects)", ["all"], ["RANGE-OUT-WRITER", "RANGE-OUT-BULK", "RANGE-OUT-REPLAY", "RANGE-OUT-RESTORE"])
cs("CS-TYPES8-NEG", "TO-AUTHOR", "ACCEPTANCE 7.1", ["all"])
cs("CS-WIDEN", "TO-AUTHOR", "ACCEPTANCE 7.1", ["all"])
cs("CS-PARAMS", "TO-AUTHOR", "wiki/problems/native-number-parameters.md", ["all", "negzero"])
cs("CS-CONSTRAINTS", "TO-AUTHOR", "testkit graph-constraint cases; configured-eight Required; CONSTRAINT_RULES", ["required", "cardinality", "unique", "reference", "preexisting"])
cs("CS-SCHEMA-RELEASE", "TO-AUTHOR", "configured-eight schema v1 -> v2", ["all"])
cs("CS-NUMERIC", "TO-AUTHOR", "NUMERIC_OPS, CONVERSION_RULES, COMPARISON_RULES, AGGREGATE_RULES examples (every example is a case)", ["integer-scalar", "binary64", "conversion", "cross-family", "groups", "projection-sums", "range-rules"])
cs("CS-ERRORS", "TO-AUTHOR", "one case per ERROR_TABLE entry reachable from a read surface", ["all"])
cs("CS-STR", "EXISTS", "qualification/extensions/string-order-v1/oracle.json and qualification/native-controls/qlever-collation-tiny-v1/oracle.json", ["supported"])
cs("CS-SHAPE", "TO-AUTHOR", "wiki/problems/native-correlation.md, R5 sections 3-5; ACCEPTANCE 6.2", ["negation", "negation-raw", "aggregate"])
cs("CS-CONFLICT", "TO-AUTHOR", "PLAN C5; RULINGS Q8e, Q12", ["all"],
   ["C5-EQ-DUP", "C5-GET-CONFLICT", "C5-GETMANY-CONFLICT", "C5-FIND-FILTER", "C5-FIND-ORDER", "C5-COUNT", "C5-INCLUDE", "C5-NEGATION", "C5-UNREFERENCED", "C5-PREEXISTING-ENFORCED", "C5-VALUES-RELATION", "C5-RAW-SHAPE", "C5-PARTIAL-REPAIR", "C5-LAST-SUPPORT", "C5-OVERLAPPING-INTERVALS"])
cs("CS-SUPPORT", "TO-AUTHOR", "testkit duplicate/distinct aggregate case and 'same-value facts in one batch keep distinct identities'; packet 05, 06, 18, 20", ["all", "duplicate-support", "same-batch"])
cs("CS-QMIX", "TO-AUTHOR", "qualification/benchmark-contract.json query families", ["all", "point", "getMany", "selective-filter", "reverse-ref"])
cs("CS-ADMIT", "TO-AUTHOR", "R6 goal 3, R2 3.3 and 6.5", ["all", "memory"])
cs("CS-RECURSION-TOPO", "TO-AUTHOR", "benchmark-contract topologies; R6 goal 3; PLAN C8", ["all", "c8"],
   ["C8-NO-MUTATION", "C8-FIXED-CUT", "C8-ROUND-BOUND", "C8-ROW-BOUND", "C8-CYCLE", "C8-HOST-COST", "C8-NATIVE-RELATIONAL"])
cs("CS-CANCEL", "TO-AUTHOR", "native-entry cancellation; wiki/problems/cancellation-observation-levels.md", ["read", "deadline", "preaborted"])
cs("CS-SCRATCH", "TO-AUTHOR", "R4 3.1, 4.1; R6 finding 4", ["all"])
cs("CS-LIFECYCLE", "TO-AUTHOR", "wiki/problems/load-liveness.md; R6 goal 10", ["bounds", "lifecycle"])
cs("CS-WRITE", "TO-AUTHOR", "testkit transaction cases; packages/qlever/test/storage.test.ts 16-way; R4 2.3, 3.4-3.7, 4.3-4.4", ["atomic", "idempotency", "preconditions", "receipts"])
FAULT_Q55_CASES = ["C2-SOURCE-PUBLISHED-REPLICA-BEHIND", "C2-CRASH-AFTER-SOURCE-PUBLISHED", "C2-ENGINE-SIGKILL", "X-ENGINE-SIGKILL", "X-DUAL-COMMIT-PATH-REFUSED"]  # RULINGS Q55b, Q51f
FAULT_Q62_CASES = ["C2-TWO-BROKERS-ONE-PROCESS"]  # RULINGS Q62a (V-P2Q C3)
cs("CS-FAULT", "TO-AUTHOR", "COMMIT_OUTCOMES transitions; PLAN C2; R2 1.8; R6 experiment 10", ["atomic", "lost-ack", "engine-crash", "backup-restore", "transitions"],
   ["C2-PRE-FSYNC-CRASH", "C2-FSYNC-THEN-CRASH-RETRY", "C2-APPLY-CRASH", "C2-PUBLISH-THEN-CRASH", "C2-VERIFY-FAIL-FENCE", "C2-LOST-ACK", "C2-GROUP-COMPETING-PRECONDITIONS", "C2-GROUP-DUPLICATE-COMMAND", "C2-GROUP-FAILED-CHILD", "C2-REPLAY-CHECKPOINT", "C2-REBUILD-GENERATION-CRASH", "C2-NO-SELF-CANCEL",
    "X-PRE-COMMIT-CRASH", "X-COMMIT-SYNC-CRASH", "X-LOST-ACK", "X-COMPACTION-CRASH"] + FAULT_Q55_CASES + FAULT_Q62_CASES)
# RULINGS Q50d (overlay bound) and Q58c, Q58e (SQLite substrate replacing Q50d's rotation and lock items; log crypto-shredding)
BROKER_HARDENING_CASES = ["BR-OVERLAY-BOUND-OVERLOADED", "BR-SQLITE-DURABILITY-PRAGMAS", "BR-CRC-CHAIN-MID-WAL", "BR-COMMITTED-AT", "BR-EPOCH-ROW", "BR-MARKER-CHECKPOINT-CROSSCHECK", "BR-RECENT-ROWS-PERSISTED", "BR-LOG-CRYPTO-SHRED"]
cs("CS-BROKER", "TO-AUTHOR", "PLAN C3; RULINGS Q50d", ["all", "hardening"], ["C3-STALE-EPOCH-RESUME", "C3-NO-TOKEN-UPDATE", "C3-UNAUTHORIZED-ROUTE", "C3-FENCED-ADMIN", "C3-FENCED-WRITE", "C3-EPOCH-CLOSE"] + BROKER_HARDENING_CASES)
cs("CS-MAINT", "TO-AUTHOR", "PLAN C4", ["all"], ["C4-BOUNDED-OP", "C4-ENTER-MAINTAINING", "C4-PENDING-CHUNK-WRITE", "C4-CRASH-RESUME", "C4-HATCH-MAINTAINING", "C4-REPO-MAINTAINING", "C4-SAME-EXPIRY", "C4-BACKPRESSURE", "C4-DIRECT-INSPECTION"])
cs("CS-JOURNAL", "TO-AUTHOR", "PLAN C6; testkit cases 29, 30, 31, 32, 34, 36, 39", ["all"], ["C6-MATCH-CHANGE", "C6-MATCH-CHANGED-ENTITY", "C6-DATALOG-CHANGE", "C6-TRANSACTIONS-ORDER", "C6-NEGZERO-CHANGE", "C6-BYCOMMAND", "C6-SLIM-BYTE-IDENTICAL"])
cs("CS-ELIGIBILITY", "TO-AUTHOR", "PLAN C1", ["all"], ["C1-SCOPE-OWNER", "C1-MAPPING-GEN", "C1-EXPLICIT-R", "C1-DECREASING-R", "C1-INTERIOR-P", "C1-V-OUTSIDE-MARKER", "C1-PARTIAL-FILTER-ORDER", "C1-PARTIAL-NEG", "C1-PARTIAL-AGG", "C1-CONFLICT-REF", "C1-UNREFERENCED-PARTIAL"])
cs("CS-MIGRATION", "TO-AUTHOR", "review r1 finding 12; response r1 decision 12", ["all", "valid-writes"])
cs("CS-PUBLISH", "TO-AUTHOR", "review r1 finding 8; response r1 B2", ["coherence", "basis", "boundary"])
cs("CS-REUSE", "TO-AUTHOR", "R6 goal 8; acceptance review r1 finding 14", ["all", "positive-reuse", "invalidation", "incremental"])
cs("CS-SUPPORT-DAG", "TO-AUTHOR", "packet workload 20 extended; review r1 finding 13", ["all", "partial-retraction", "incremental"])
cs("CS-TEMPORAL", "TO-AUTHOR", "handoff README 43-48; review r1 finding 6; PLAN C1 recorded time; TEMPORAL_RULES (RULINGS Q21 AMB-12)", ["valid", "boundary", "recorded", "corrections", "decreasing-clock", "empty-interval"])
cs("CS-HAM9", "EXISTS", "qualification/capacity/historical-assertion-metadata-v1/reproducers.json", ["raw-lifetime", "snapshot"])
cs("CS-CFG8", "EXISTS", "qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md and qualification/capacity/configured-entities-v1/oracle.mjs", ["retirement-metadata-target", "presence"])
cs("CS-PRESENCE-DELETE", "POLICY-PENDING", "wiki/research/presence-reference-deletion-requirements-v1.md; EXP-P01 policy draft", ["presence", "deletion", "cascade"])
cs("CS-CURSOR", "TO-AUTHOR", "testkit cursor cases; CURSOR_TRANSITIONS", ["stable", "deep-page", "transitions"], [t["id"] for t in CURSOR_TRANSITIONS["mustContinue"]] + [e["id"] for e in CURSOR_TRANSITIONS["permittedErrors"]])
cs("CS-SCOPE", "TO-AUTHOR", "PLAN C7; qlever native-entry scope-isolation", ["all"], ["C7-OWNER-MISMATCH", "C7-OWNER-RECORD-INIT", "C7-SHARED-COLLISION", "C7-DOMAIN-ONLY-CURRENT", "C7-NO-STAGING-DOMAIN", "C7-XTDB-TABLE-NAMES"])
cs("CS-CAPS", "TO-AUTHOR", "capability-matrix.md rows and FRAGMENT_COVERAGE", ["all"])
cs("CS-SLICE", "TO-AUTHOR", "response r1 B5 step 6; PLAN EXP-V01/V02", ["all"])
cs("CS-TYPEWITNESS", "TO-AUTHOR", "R3 artifacts api-sketch.ts and usage.ts; decision D5; ACCEPTANCE 6.5", ["all"])
cs("CS-ENTITY", "TO-AUTHOR", "ACCEPTANCE 7.4; READ_SHAPE_RULES (RULINGS Q21)", ["all", "valid-boundary", "typed-find", "card-many", "lineage", "integer-range", "codepoint-order"])
cs("CS-RAW-RECIPES", "TO-AUTHOR", "ACCEPTANCE 7.5 and the raw-query guide", ["all"] + list(RAW_PARITY_CLASSES.keys()))
cs("CS-RAW-MAPPED", "TO-AUTHOR", "RAW_EXCEPTIONS mapped recipes and DIAGNOSTICS", ["all", "diagnostics"], [e["qualifyingCase"] for e in RAW_EXCEPTIONS])
cs("CS-FRAGMENT-EQUIV", "TO-AUTHOR", "R5 5.4 C1-C4; FRAGMENT_COVERAGE", ["all", "coverage"])
cs("CS-SCALE-SAMPLE", "TO-AUTHOR", "SCALE_POPULATION", ["counts", "per-rung", "families", "capacity", "metrics", "maintenance", "restart", "strata"])
cs("CS-BUDGET", "TO-AUTHOR", "budgets.json", ["all"])
NS_NAMED_CASES = {
    "NS.P1": ["NS-P1-HOT-SET", "NS-P1-SPLIT-READ", "NS-P1-SPLIT-NO-DRIVER-WRITES", "NS-P1-MAINTENANCE-IN-WINDOW", "NS-P1-DRIVER-BASIS", "NS-P1-WAIT-ATTRIBUTION"],
    "NS.P2": ["NS-P2-BAND-5-10", "NS-P2-BAND-11-25", "NS-P2-BAND-26-50", "NS-P2-ACCOUNTING", "NS-P2-PROGRESS", "NS-P2-QUEUE-BOUND", "NS-P2-BURST-DRAIN", "NS-P2-RYOW-PER-SURFACE", "NS-P2-HOT-SUBJECT-QUEUE"],
    "NS.P3": ["NS-P3-CRASH-BEFORE-EFFECT", "NS-P3-CRASH-AFTER-EFFECT", "NS-P3-CRASH-AFTER-CHECKPOINT", "NS-P3-DOMAIN-AFFECTED-SET", "NS-P3-EVERY-POSITION-ACCOUNTED", "NS-P3-SOURCE-PREFIX-ENUMERATED"],
    "NS.P4": ["NS-P4-BUCKETS", "NS-P4-MATCHED-HISTORY"],
    "NS.P5": ["NS-P5-COVERAGE", "NS-P5-POST-CAPTURE-MUTATION", "NS-P5-THROTTLED-COMPACTION", "NS-P5-SCOPED-RELEASE-REACHED"],
}
cs("CS-NS", "COMPILED", "load-contract.json (generated): frozen trace generator, P1 reader ladder, P2 open-loop bands, P3 feed, P4 buckets, P5 release sweep (TARGETS 1.1, 2.1)", ["calibration", "p1-ladder", "p1-stress", "p2", "p3", "p4", "p5", "secondary"], [c for v in NS_NAMED_CASES.values() for c in v])
GS_FAILURE_SCHEDULES = {
    3: [("GS-03-SUPERSEDED-REVISION", "a vendor's older revision of a status arrives after a newer one for the same subject", "acknowledged as superseded: no change to current values, recorded in the journal (provisional, flagged for Sam)")],
    4: [("GS-04B-INDEX-PARTITION", "the current index's feed consumer is cut for 60 s while the source keeps committing", "commits and ACKs continue throughout the outage; on every serving surface the composition claims, native included, reads for which the index is not eligible wait at most 10 ms (COMPOSITION watermarkRouting) then route to the fallback; none answers from the stale index; the receipt measures the fallback share per window and the recovery time until the index is eligible again (RULINGS Q31e)")],
    6: [("GS-06B-SHARED-REFERENCE", "a work location's minimum wage changes (one shared referenced entity)", "every worker at that location appears in the feed's affected-subject set and is re-run; no other worker is")],
    15: [("GS-15-STORAGE-ACCESS", "a tenant-A route attempts to read tenant B's storage directly", "the access fails at the storage layer"),
         ("GS-15-SLOW-TENANT", "one tenant's feed consumer is slowed 10x", "other tenants' feed lag and p99 hold")],
    19: [("GS-19B-OUTBOX-CRASH", "the consumer crashes after delivering an outbox item but before recording completion", "the receiver deduplicates by the delivery key (id, publication sequence) of OUTBOX: exactly one externally visible effect per delivery key, and a later return to an earlier payload is a new delivery (RULINGS Q36a, Q38f)")],
}
GS_COMMON_BASIS_CASE = "GS-10-11-COMMON-BASIS"
GS_CASES = ["GS-NUM-RANGE-1650", "GS-NUM-HOURS-40", "GS-NUM-UNHOLDABLE", GS_COMMON_BASIS_CASE]
GS_CASES += [c for v in GS_FAILURE_SCHEDULES.values() for c, _, _ in v]
GS_CASES += [f"GS-{i:02d}-WITNESS-{k}" for i in range(1, 21) for k in ("POS", "NEG")]
cs("CS-GS", "TO-AUTHOR", "GOLDEN_SCENARIOS (TARGETS section 6) and WORLD_W0 (TARGETS 6.1): one seeded deterministic generator per scenario, overlaid on the background trace", [f"GS-{i:02d}" for i in range(1, 21)], GS_CASES)
ERASURE_COMMIT_CASES = ["ER-COMMIT-JOURNAL-IDENTITY-ONLY", "ER-COMMIT-LEDGER", "ER-EARLIER-CHANGE-MARKER", "ER-IDEMPOTENT-REERASE", "ER-EMPTY-ERASURE-RECORD"]  # RULINGS Q49a, Q49b
ERASURE_QUERY_CASES = ["ER-PREDICATE-NO-MATCH", "ER-AGGREGATE-SKIP-COUNT", "ER-ORDER-MARKERS-LAST", "ER-GROUP-ONE-MARKER", "ER-UNIQUE-IGNORES", "ER-REFERENCE-MARKER"]  # RULINGS Q49c
ERASURE_Q56_COMMIT_CASES = ["ER-ERASE-UNKNOWN-TARGET", "ER-ERASE-BY-ID", "ER-RETRACT-AFTER-ERASE"]  # RULINGS Q56a, Q56f, Q56g
ERASURE_Q56_QUERY_CASES = ["ER-CARD-ONE-READABLE-AND-ERASED", "ER-EQUAL-SUPPORT-ERASED-CONFLICTS", "ER-CARD-MANY-MARKERS-LAST", "ER-REQUIRED-SATISFIED"]  # RULINGS Q56b to Q56e
cs("CS-ERASURE", "TO-AUTHOR", "ERASURE (TARGETS section 7, RULINGS Q24, Q49, Q52, Q56); the ERASURE_RESIDUAL_CASES carry only the residual tag, so no other selection reaches a shape O-REPLAY 0.4.1 refuses", ["all", "boundary", "marker", "reproduction", "inventory", "derived-channels", "restore", "commit", "queries", "residual"],
   ["ER-INFLIGHT-READ", "ER-AFTER-PUBLICATION-ALL-BASES", "ER-SHAPE-KEPT", "ER-PINNED-READER", "ER-REBUILD", "ER-RESTORE-PRE-BACKUP", "ER-ORACLE-POST", "ER-ORDER-KEY-CHANNEL", "ER-LEXICAL-CHANNEL", "ER-CURSOR-MODULO", "ER-EXPLAIN-MODULO",
    "ER-FRONTIER-OLD-BASIS", "ER-CACHE-INVALIDATION", "ER-JOURNAL-MODULO", "ER-RAW-NATIVE-MODULO", "ER-SDK-MODULO", "ER-KEY-EXCLUSIVE", "ER-LOG-CRYPTO-SHRED"] + ERASURE_COMMIT_CASES + ERASURE_QUERY_CASES + ERASURE_Q56_COMMIT_CASES + ERASURE_Q56_QUERY_CASES + ERASURE_RESIDUAL_CASES + ERASURE_Q66_CASES)
NATIVE_TOKEN_CASES = ["CO-FACADE-ONLY", "CO-NATIVE-AFTER-TOKEN", "CO-NATIVE-AT-EXACT", "CO-NATIVE-AT-NOT-RECONSTRUCTIBLE", "CO-SESSION-HIGH-WATER", "CO-ANSWER-BASIS-RANGE-ROUTE", "CO-NATIVE-DEFAULT-DEADLINE"]  # RULINGS Q58a
OVERLAY_CASES = ["CO-OVERLAY-ENTITY-PULL-ONLY", "CO-OVERLAY-GREATER-LSN-WINS", "CO-OVERLAY-IDENTITY-INVARIANT", "CO-OVERLAY-NO-MERGE-WAITS-OR-TYPED", "CO-TOMBSTONE-NO-RESURRECTION"]  # RULINGS Q58d
Q67_CASES = ["CO-RESET-DURING-QUERY", "CO-TYPED-ERROR-SHAPE"]  # RULINGS Q67c, Q67h: rules compiled; manifests null until the P2Q author builds the design
P2Q_READ_CASES = ["CO-EXECUTOR-IN-TX-WAITS-OR-TYPED", "CO-EXECUTOR-READS-IN-CAS-SET", "CO-REPLICA-REGRESSION-REAL-MARKER", "CO-PULL-BEYOND-PREFIX-TYPED", "CO-OUTAGE-PULL-FALLBACK", "CO-OUTAGE-RETRACTION-TARGET-FALLBACK"]  # RULINGS Q62a
READ_GUARANTEE_CASES = ["CO-REPO-REPLICA-DOWN-FALLBACK", "CO-NATIVE-REPORTS-BASIS", "CO-NATIVE-BASIS-TOKEN-WAIT", "CO-NATIVE-BASIS-NOT-AVAILABLE", "CO-NATIVE-NO-TOKEN-WATERMARK", "CO-NATIVE-REPLICA-UNAVAILABLE", "CO-NO-FALSE-BASIS"]  # RULINGS Q55c, Q50a
cs("CS-COMPOSITION", "TO-AUTHOR", "COMPOSITION (TARGETS 4.1, RULINGS Q28, Q31d, Q31e, Q55c, Q58a, Q58d, Q62a)", ["all", "watermark", "ack", "identity", "surfaces", "overlay"],
   ["CO-WATERMARK-WAIT", "CO-WATERMARK-FALLBACK", "CO-NO-STALE-ANSWER", "CO-ASYNC-HISTORY", "CO-RECEIPT-BINDS-ALL", "CO-SCOPE-KEY-FROM-ASSIGNMENT",
    "CO-EPOCH-MISMATCH", "CO-RECONSTRUCT-OUTSIDE-VALIDITY", "CO-ERASURE-FRONTIER", "CO-FALLBACK-LATENCY-COUNTS", "CO-FALLBACK-LANGUAGE", "CO-FALLBACK-SHARE",
    "CO-ACK-AFTER-SOURCE-PUBLICATION", "CO-RYOW-ROUTED", "CO-OUTAGE-ACKS-CONTINUE", "CO-CATCHUP-BOUNDED-QUEUE", "CO-RYOW-PER-SURFACE", "CO-STALE-FALLBACK-REJECTED", "CO-CROSS-LANGUAGE-RECIPE-IDENTITY"] + READ_GUARANTEE_CASES + NATIVE_TOKEN_CASES + OVERLAY_CASES + P2Q_READ_CASES + Q67_CASES)
POSITION_BINDING_CASES = ["PO-BOUND-AFTER-PUBLICATION", "PO-NO-PLACEHOLDER", "PO-NO-ORDINAL-LIMIT", "PO-OPAQUE-TOTAL-ORDER"]  # RULINGS Q51c
cs("CS-POSITION", "TO-AUTHOR", "POSITION falsifiers and dense nested-cut cases (TARGETS 4.1 item 3, RULINGS Q31c, Q32e, Q51c)", ["all", "falsifiers", "ordering", "dense", "binding"], POSITION["falsifiers"] + ["PO-LEXICOGRAPHIC-ORDER", "PO-ORACLE-DENSE-ORDINALS", "PO-ABORTED-LISTED", "PO-NESTED-CUTS-DENSE"] + POSITION_BINDING_CASES)
cs("CS-W0-COVERAGE", "TO-AUTHOR", "W0 coverage floors over the frozen trace and releases (TARGETS 6.1 items 6 and 7, RULINGS Q31i, Q40, Q44)", ["all"], ["W0-COV-R2-CHANGED", "W0-COV-RULE-FIRES", "W0-COV-LOCATION-FANOUT", "W0-COV-MULTI-WORK-ITEMS", "W0-COV-REVIEW-PINNED", "W0-COV-BALLAST-BUCKETS", "W0-COV-TWO-HOP", "W0-COV-R3-SCOPED", "W0-COV-FINGERPRINT"])
cs("CS-EVAL-COUNTER", "COMPILED", "EVALUATOR_COUNTEREXAMPLES (RULINGS Q26) and EVALUATOR_POSITIVE_FIXTURES (RULINGS Q31k)", ["all", "negative", "positive"], [x["id"] for x in EVALUATOR_COUNTEREXAMPLES] + [x["id"] for x in EVALUATOR_POSITIVE_FIXTURES])
cs("CS-REQ", "TO-AUTHOR", "REQUIREMENTS (TARGETS section 3): each requirement's own tests", ["all", "commit-idempotent", "snapshot-reads", "change-feed", "no-silent-precision-loss", "pii-erasure", "tenant-isolation", "outbox-atomic", "read-your-write", "sweep-pins-position", "retro-corrections"])

# ============================================================================ obligations
OBL = []
CUR_REOPEN = ["current", "reopen"]
CRR = ["current", "reopen", "engine-restart"]


def O(id, goals, title, statement, lanes=ALL, scope="lane", cases=(), oracle=(), ep=(), profiles=("P-TINY",),
      closure=("CR-PASS-ALL",), modes=None, thresholds=(), mutants=(), contracts=(), sources=(), grounding="grounded", notes=None, params=None):
    OBL.append({
        "id": id, "goals": list(goals), "title": title, "statement": statement, "lanes": list(lanes),
        "receiptScope": scope, "cases": [{"set": c.split(":")[0], "select": (c.split(":")[1].split(",") if ":" in c else ["all"])} for c in cases],
        "oracles": list(oracle), "entrypoints": list(ep), "profiles": list(profiles),
        "closure": {"rules": list(closure), "modes": list(modes) if modes else ["single-execution"], "params": params or {}},
        "thresholds": list(thresholds), "mutationControls": list(mutants), "contracts": list(contracts),
        "sources": list(sources), "grounding": grounding, "notes": notes,
    })


# ---------------- Goal 1
O("G1.found.unchanged44", ["G1"], "Unchanged44 on the lane foundation",
  "The unchanged 44-case shared conformance suite (CS-U44) passes against the lane engine's Triples foundation in current and reopened form: 44 named cases per mode, zero skipped.",
  scope="engine", cases=["CS-U44"], oracle=["O-TESTKIT"], ep=["EP-TRIPLES"], modes=CUR_REOPEN,
  sources=["wiki/goals.md:20-23", "lab/research/R4-codebase-harness-map.md 5.3"])
O("G1.types.value-kinds-roundtrip", ["G1"], "Every value kind in use round-trips exactly on every surface",
  "Every case of CS-TYPES8 (one assertion per value kind of VALUE_KINDS with the listed edge values, integers inside the lane's declared range) reads back exactly through Triples, the repository, the lane's native surface with a schema-derived contract, and the documented raw recipe, in current, reopen and engine-restart modes.",
  cases=["CS-TYPES8"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CRR,
  closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), mutants=["M-INTEGER-ROUND", "M-NEGZERO"],
  sources=["lab/SCOPE.md section 2 item 4", "lab/research/SAM-pasted-numbers-2026-11-07.md section 5", "lab/research/R2-qlever-capabilities.md 4.1"])
O("G1.types.out-of-range-rejected", ["G1", "G2"], "Values a lane cannot hold fail with a typed error, never silently",
  "Every lane accepts every integer in [-(2^53-1), 2^53-1]; on every qualified write route (the Triplex writer, the bulk import lane, replay and restore: RANGE-OUT-WRITER, RANGE-OUT-BULK, RANGE-OUT-REPLAY, RANGE-OUT-RESTORE) every CS-RANGE-OUT case (integers beyond the lane's declared LANE_INTEGER_RANGE, for QLever beyond +/-2^59) fails atomically with E-VALUE-OUT-OF-RANGE before any mutation, with no residue on any access path, and is never wrapped, widened or rounded. Bare native wire access is a diagnostic surface, not a qualified route: QLever's native wrap there is matrix row 51 (KNOWN-LIMIT KL-Q1) and diagnostic D-Q-INT60, never a failure of this obligation (RULINGS Q23).",
  scope="engine", cases=["CS-RANGE-OUT", "CS-RANGE-OUT:RANGE-OUT-WRITER,RANGE-OUT-BULK,RANGE-OUT-REPLAY,RANGE-OUT-RESTORE"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER", "EP-BULK", "EP-REPLAY"], modes=CUR_REOPEN,
  mutants=["M-OUT-OF-RANGE-WRAP"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), params={"diagnostics": ["D-Q-INT60"]},
  sources=["lab/research/SAM-pasted-numbers-2026-11-07.md section 5", "lab/TARGETS.md section 3", "lab/acceptance/RULINGS.md superseded section"])
O("G1.types.decimal", ["G1", "G2", "G5"], "Decimal value kind for money and business decimals",
  "Every CS-DECIMAL case, per DECIMAL_RULES (RULINGS Q18) and the operation, conversion and scale tables DECIMAL_OPS, DECIMAL_CONVERSIONS and DECIMAL_SCALE_EVOLUTION (RULINGS Q22), one named case per row, plus DECIMAL_TESTS (adjacent large decimals, negatives, zero, scale boundaries, arithmetic intermediates, every query and serialization path, an independent order-key check, and input capture before normalization): each decimal attribute declares precision and scale; every precision is stored as the TDK1 key plus derived canonical text (RULINGS Q35b; the key bytes themselves are checked by G1.decimal.tdk1-admission and G1.decimal.tdk1-serialization under O-TDK1, RULINGS Q45c), compared exactly across attributes of different declared scale (DEC-CROSS-SCALE-COMPARE), and round-trips exactly on every surface; a decimal on an undeclared attribute (DEC-UNDECLARED-ATTRIBUTE) and -0.00 (DEC-NEGZERO-REFUSED) fail with E-INVALID-VALUE; 16.500 fits scale 2 and reads back as 16.50 (DEC-TRAILING-ZERO-FITS); toDecimal starts from the exact binary expansion (DEC-TODECIMAL-EXACT-EXPANSION); AVG over decimal fails with E-DECIMAL-AVG unless written with divide (DEC-AVG-PREFLIGHT) (RULINGS Q33b); every comparison with integer or number, equality included, is preflight E-MIXED-FAMILY (DEC-CROSS-FAMILY-PREFLIGHT) and exact after explicit conversion (DEC-CONVERTED-COMPARE); results beyond the precision fail with E-DECIMAL-OVERFLOW, bare / with E-DECIMAL-BARE-DIVIDE, decimal to integer with a fraction with E-DECIMAL-FRACTION, and a narrowing migration that would lose digits with E-DECIMAL-NARROWING, atomically; range rules (for example 'pay rate at or above 16.50') compare in exact numeric order on the repository, fragments and documented raw channel; a value with more fractional digits than the scale fails with E-DECIMAL-FRACTION (DEC-SCALE-EXCESS) and one outside the precision with E-DECIMAL-OVERFLOW (DEC-PRECISION-EXCESS), never rounded; kernel arithmetic over decimals is exact.",
  cases=["CS-DECIMAL", "CS-DECIMAL:" + ",".join(DECIMAL_CASES)], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-REPO", "EP-WRITER", "EP-KERNEL", "EP-NATIVE", "EP-RAW-HATCH", "EP-FEED", "EP-REPLAY"], modes=CRR,
  mutants=["M-DECIMAL-ROUND", "M-DECIMAL-PRECAPTURE-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["RULINGS Q18", "RULINGS Q22", "lab/TARGETS.md section 3 (decimal value kind on the critical path for goal 1)", "lab/research/SAM-pasted-numbers-2026-11-07.md section 3"])
O("G1.wire.write-guards", ["G1"], "Qualified write routes reject inexact JSON numbers and -0 instants",
  "Per WIRE_RULES WR-JSON, WR-INSTANT and WR-INTEGER-RANGE (RULINGS Q30a, Q30b, Q30e): on every qualified write route a JSON value holding -0, a non-finite number or an inexact binary64 at any depth, including inside List and Struct, fails atomically with E-INEXACT-JSON-NUMBER before CanonicalJson runs and before any mutation, where an inexact number is one that does not read back as written (Q33-JSON-READBACK, RULINGS Q33a); the guard applies to user JSON only, and the paired test holds on both engines: user JSON with -0 is rejected (WIRE-JSON-NEGZERO) while a number -0 assertion commits, journals, replays and reads back bit-exact (WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP, RULINGS Q34c); an instant given as -0 fails with E-NEGATIVE-ZERO-INSTANT; the ProjectionSpec integer range rule covers only the safe-integer domain.",
  scope="engine", cases=["CS-WIRE:json,instant,integer-range", "CS-WIRE:" + ",".join(c for r in WIRE_RULES if r["id"] in ("WR-JSON", "WR-INSTANT", "WR-INTEGER-RANGE") for c in r["cases"])], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER", "EP-BULK", "EP-REPLAY"], modes=CUR_REOPEN,
  mutants=["M-JSON-NEGZERO-NORMALIZE", "M-JSON-GUARD-ON-JOURNAL"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q30", "RULINGS Q33a", "RULINGS Q34c", "EXP-F02 wire-exactness report"])
O("G1.wire.xtdb-encodings", ["G1"], "XTDB projections use the pinned exact encodings",
  "Per WR-X-ENCODINGS (RULINGS Q30c): card-many DOUBLE and integer lists are written as ARRAY[CAST(? AS <type>) ...] and read back bit-exact (-0 kept); date and instant are read as text and keep year 0001 and microseconds; any other encoding fails the projection check (WIRE-X-OTHER-ENCODING-FAILS).",
  lanes=X, scope="engine", cases=["CS-WIRE:xtdb-encodings", "CS-WIRE:WIRE-X-DOUBLE-LIST-ARRAY,WIRE-X-INTEGER-LIST-ARRAY,WIRE-X-DATE-TEXT,WIRE-X-INSTANT-TEXT,WIRE-X-OTHER-ENCODING-FAILS"], oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE"], modes=CRR,
  mutants=["M-X-JSON-LIST-PARAM"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q30c", "EXP-F02 wire-exactness report findings 2 and 4"])
O("G1.wire.qlever-shadow", ["G1"], "QLever numeric shadows count as exact only when they survive export",
  "Per WR-Q-SHADOW (RULINGS Q30d): a binary64 shadow is exact only if it is not -0 and its %.13g rendering parses back to the same bits, and integer shadows only within +/-2^59; otherwise the lexical channel is authoritative and the shadow is flagged inexact and never used for an answer (WIRE-Q-LEXICAL-AUTHORITATIVE).",
  lanes=Q, scope="engine", cases=["CS-WIRE:qlever-shadow", "CS-WIRE:WIRE-Q-SHADOW-NEGZERO,WIRE-Q-SHADOW-13G,WIRE-Q-SHADOW-INT59,WIRE-Q-LEXICAL-AUTHORITATIVE"], oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CRR,
  mutants=["M-Q-SHADOW-EXACT-FLAG"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q30d", "EXP-F02 wire-exactness report finding 5"])
TDK1_EP = {"V3": ["EP-NATIVE", "EP-RAW-WIRE", "EP-WRITER"], "V4": ["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], "V5": ["EP-KERNEL"], "V6": ["EP-RAW-WIRE", "EP-NATIVE", "EP-FEED", "EP-TRIPLES"], "V7": ["EP-WRITER", "EP-BULK", "EP-REPLAY", "EP-TRIPLES"]}
for vid, t in TDK1_TESTS.items():
    O(t["obligation"], ["G1"], f"TDK1 {vid}: {t['check'].split(':')[0].split(' (')[0]}",
      f"Per TDK1 (RULINGS Q35, R20 section 5.3 {vid}): {t['check']}. Pass: {t['pass']} ({t['case']}).",
      scope="lane" if vid == "V4" else "engine", cases=[f"CS-TDK1:{t['case']}"] + (["CS-TDK1:DEC-ORDER-KEY-INDEPENDENT"] if vid == "V3" else ["CS-TDK1:DEC-SMALL-PRECISION-TDK1,DEC-LARGE-PRECISION-TDK1"] if vid == "V6" else []), oracle=["O-TDK1"] + (["O-ERR"] if vid == "V7" else []), ep=TDK1_EP[vid],
      profiles=["P-HEAVY"] if vid == "V3" else ["P-TINY"], modes=CUR_REOPEN if vid in ("V3", "V4", "V6") else None,
      mutants=["M-TDK1-NO-TERMINATOR"] if vid == "V5" else (["M-TDK1-PREFIX-USE"] if vid == "V4" else []),
      closure=("CR-PASS-ALL", "CR-MUTANT-KILL") if vid in ("V4", "V5") else ("CR-PASS-ALL",),
      sources=["lab/research/R20-order-preserving-decimal-encodings.md section 5.3", "RULINGS Q35"])
O("G1.decimal.channel-routing", ["G1", "G2", "G5"], "Every decimal comparison routes through the decimal_order_v1 key",
  "Per DECIMAL_ROUTING (RULINGS Q38d), on the repository, the native surface in the lane language and the raw recipes: ordering and ranges on decimals use the decimal_order_v1 key (DR-REPO-ORDER, DR-NATIVE-ORDER, DR-RAW-ORDER), including derived expressions (DR-DERIVED) and aggregate results (DR-AGGREGATE: SUM decodes, computes exactly and encodes a result used for ordering); arithmetic on key strings is preflight E-MIXED-FAMILY (DR-KEY-ARITHMETIC); JSON is opaque unless explicitly converted (DR-JSON-OPAQUE), and the conversion reads a JSON number as written, never its binary64 expansion (toDecimal(json 0.1, 2, 1) = 0.1), then validates and encodes (DR-JSON-CONVERT, RULINGS Q49e); decimal text inside a JSON string is E-INVALID-VALUE unless the query converts the string explicitly (DR-JSON-STRING-TEXT).",
  cases=["CS-DECIMAL-ROUTING:repository,native,raw,derived,aggregate,json", "CS-DECIMAL-ROUTING:" + ",".join(r["case"] for r in DECIMAL_ROUTING)], oracle=["O-REPLAY", "O-TDK1", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH", "EP-KERNEL"], modes=CUR_REOPEN,
  mutants=["M-DECIMAL-LEXICAL-ORDER"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q38d", "lab/reviews/plan-v2-round4.codex.md finding 6"])
O("G7.outbox.publication-sequence", ["G7", "GS"], "Outbox deliveries are keyed by (id, publication sequence)",
  "Per OUTBOX (RULINGS Q38f): the delivery key is (id, publication sequence); the sequence increments whenever the payload to publish differs from the latest published payload for that id, so a release rollback R1, R2, R1 publishes three deliveries 1650, 1700, 1650 (OB-RELEASE-ROLLBACK); publication state is persisted atomically with its outbox record (OB-ATOMIC-STATE); a crash before delivery replays the same identity exactly once (OB-CRASH-BEFORE-DELIVERY); an unchanged activation during recovery publishes nothing new while the pending delivery keeps its identity (OB-UNCHANGED-ACTIVATION-RECOVERY); a correction revert publishes a new sequence (OB-CORRECTION-REVERT); an older-basis evaluation publishes nothing (OB-OLDER-BASIS-NO-DELIVERY, RULINGS Q40d); a retired id that reappears publishes a new sequence even with an unchanged payload (OB-RETIREMENT-REAPPEAR, RULINGS Q40h); only live reconciles at the current basis are published (OB-PREVIEW-NOT-PUBLISHED, RULINGS Q44c).",
  scope="engine", cases=["CS-OUTBOX", "CS-OUTBOX:" + ",".join(OUTBOX["cases"])], oracle=["O-DOMAIN", "O-REPLAY"], ep=["EP-OUTBOX", "EP-WRITER", "EP-KERNEL"], profiles=["P-FAULT"], modes=CRR,
  mutants=["M-OUTBOX-VERSION-DEDUP", "M-OUTBOX-RETIREMENT-IGNORED"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], sources=["RULINGS Q38f", "RULINGS Q40c", "RULINGS Q40d", "RULINGS Q40h", "RULINGS Q44c", "lab/reviews/plan-v2-round4.codex.md finding 8"])
O("G7.outbox.receiver-ordering", ["G7", "GS"], "Receivers apply deliveries by publication sequence",
  "Per OUTBOX receivers (RULINGS Q42b, Q44d): a state projection records the highest sequence applied and never regresses (RX-REVERSED-ARRIVAL); an effect needing every transition recovers gaps from the outbox first (RX-GAP-RECOVERY); deduplication is persisted atomically with the receiver's state or effect (RX-RESTART-MID-SEQUENCE, RX-DEDUP-1-1-3-3-2); a receiver started after pruning is seeded from a snapshot (RX-LATE-START); O-DOMAIN's receive operation gives the expected receiver state.",
  scope="engine", cases=["CS-RECEIVER", "CS-RECEIVER:" + ",".join(RECEIVER_CASES)], oracle=["O-DOMAIN"], ep=["EP-OUTBOX", "EP-KERNEL"], profiles=["P-FAULT"], modes=CRR,
  mutants=["M-RECEIVER-REGRESS"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], sources=["RULINGS Q42b", "RULINGS Q44d", "lab/reviews/plan-v2-round5.codex.md finding 9"])
O("G7.outbox.atomic-unit", ["G7", "GS"], "Outbox state is one atomic unit per subject",
  "Per OUTBOX atomicUnit (RULINGS Q42c): the basis guard, retirement state, publication sequence, latest published payload and outbox records are written in one atomic write under the subject's compare-and-set; a crash injected between every pair of these transitions leaves both or neither visible (AU-CRASH-*); the guard advances on empty and unchanged evaluations (AU-GUARD-ADVANCES-EMPTY, AU-GUARD-ADVANCES-UNCHANGED).",
  scope="engine", cases=["CS-ATOMIC-UNIT", "CS-ATOMIC-UNIT:" + ",".join(ATOMIC_UNIT_CASES)], oracle=["O-DOMAIN"], ep=["EP-OUTBOX", "EP-WRITER", "EP-KERNEL"], profiles=["P-FAULT"], modes=CRR,
  mutants=["M-OUTBOX-NONATOMIC"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], sources=["RULINGS Q42c", "lab/reviews/plan-v2-round5.codex.md finding 10"])
O("G1.types.invalid-rejected", ["G1"], "Invalid values are rejected atomically",
  "Every case of CS-TYPES8-NEG is rejected with its pinned error (E-INVALID-VALUE or E-UNSUPPORTED-VALUE); the committed position is unchanged, no receipt or claim exists, and no partial row or triple is visible through any access path.",
  scope="engine", cases=["CS-TYPES8-NEG"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], modes=CUR_REOPEN,
  sources=["lab/research/R4-codebase-harness-map.md 3.6"])
O("G1.types.storage-widening-safe", ["G1"], "Later writes never change an earlier exact read",
  "After the heterogeneous writes of CS-WIDEN, every earlier value still reads back bit-exact on every surface, current and reopen; documented raw columns stay monomorphic.",
  cases=["CS-WIDEN"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  mutants=["M-INTEGER-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/research/R1-xtdb-capabilities.md Q3", "lab/research/R2-qlever-capabilities.md 4.1", "lab/PLAN.md 3.2 item 4"])
O("G1.types.native-parameters", ["G1"], "Native parameters keep exact values",
  "Parameters of every value family bound into a native query in the lane language (including -0.0, the edges of the lane's integer range, decimals, text with quote, $$ and ;) reach the engine with their exact value and type, current and reopen.",
  cases=["CS-PARAMS"], oracle=["O-REPLAY"], ep=["EP-NATIVE"], modes=CUR_REOPEN, mutants=["M-NEGZERO"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/problems/native-number-parameters.md"])
O("G1.schema.required", ["G1"], "Required is enforced on new or worsened violations",
  "With enforcement on, a command whose post-state creates a new or worsened Required violation at a represented valid-time boundary fails with E-CONSTRAINT (reason required) and no residue; a pre-existing violation does not block an unrelated command and stays readable (CN-NEW-OR-WORSENED).",
  scope="engine", cases=["CS-CONSTRAINTS:required,preexisting"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], modes=CUR_REOPEN,
  sources=["packages/core/src/Constraint.ts:376", "lab/reviews/acceptance-review-r1.codex.md finding 8"])
O("G1.schema.cardinality", ["G1"], "Cardinality is enforced with the specified counting rule",
  "With enforcement on, a new or worsened cardinality-one violation fails with E-CONSTRAINT (reason cardinality), counting live assertions including equal-valued duplicates (CN-CARD-COUNT); cardinality-many keeps every live value.",
  scope="engine", cases=["CS-CONSTRAINTS:cardinality,preexisting"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER", "EP-REPO"], modes=CUR_REOPEN,
  mutants=["M-CARD-MANY-DROP"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["packages/core/src/Constraint.ts:193", "lab/PLAN.md C5.1"])
O("G1.schema.unique", ["G1"], "Uniqueness holds under concurrent writers",
  "A unique attribute value is live on at most one entity at any valid instant; a new violation fails with E-CONSTRAINT (reason unique); in a 16-way race for one value exactly one command commits.",
  scope="engine", cases=["CS-CONSTRAINTS:unique"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  sources=["wiki/goals.md:9"])
O("G1.schema.reference-target", ["G1"], "Reference targets are enforced at represented boundaries",
  "With ReferenceTarget rules supplied, a new or worsened dangling reference fails with E-CONSTRAINT (reason reference-target); same-batch forward references are admitted.",
  scope="engine", cases=["CS-CONSTRAINTS:reference"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], modes=CUR_REOPEN,
  sources=["packages/core/src/Constraint.ts", "wiki/research/presence-reference-deletion-requirements-v1.md"])
O("G1.schema.release-derived-contracts", ["G1", "G10"], "Contracts derive from the active schema release",
  "Repository model types and native helper contracts derive from the active ConfigStore release; after a v1 -> v2 release the derived contracts change accordingly; every read reports the schema snapshot it used.",
  cases=["CS-SCHEMA-RELEASE"], oracle=["O-REPLAY", "O-SPEC"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  sources=["handoffs/claude-native/README.md:31-35", "lab/research/R4-codebase-harness-map.md 1.4"])

# ---------------- packet
O("PKT.full142", ["G2", "G3", "G4", "G5", "G9"], "Native packet: 142 named executions in the lane language",
  "All 71 packet tasks run current and reopened (142 named executions) on the lane's native surface; every relational substep is in the lane's language; host steps are only HS-NORMALIZE and HS-FRONTIER; answers equal expected_rows and O-EVT.",
  cases=["CS-PKT71"], oracle=["O-EVT"], ep=["EP-NATIVE"], modes=CUR_REOPEN, params={"executions": 142, "languagePurity": True},
  sources=["wiki/goals.md:20-23", "lab/reviews/plan-review-r1.codex.md finding 4", "RULINGS Q3", "lab/PLAN.md C8"])

# ---------------- Goal 2
O("G2.arith.integer-exact", ["G2"], "Integer arithmetic is exact in the kernel and wherever offered",
  "Every CS-NUMERIC integer-scalar, conversion and range-rules case returns the NUMERIC_OPS or CONVERSION_RULES answer in the TypeScript kernel, including E-INTEGER-OVERFLOW, E-DIVISION-BY-ZERO and E-INVALID-CONVERSION; any repository or fragment surface that offers the operation returns the same answer or a typed error; no result is ever wrapped.",
  cases=["CS-NUMERIC:integer-scalar,conversion,range-rules"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-KERNEL", "EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-INTEGER-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/research/SAM-pasted-numbers-2026-11-07.md section 3 (arithmetic in the kernel)", "packages/core/src/datalog/compiler.ts:556-572"])
O("G2.arith.binary64", ["G2"], "binary64 arithmetic follows IEEE and the frozen sign rules",
  "On the repository and supported native fragments, every CS-NUMERIC binary64 case returns the N-F-ARITH and N-F-NEGZERO answer bit-exact; division by zero fails with E-DIVISION-BY-ZERO and overflow with E-NUMBER-OVERFLOW.",
  cases=["CS-NUMERIC:binary64"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-NEGZERO"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q8c", "IEEE 754"])
O("G2.expr.cross-family-comparison", ["G2"], "Comparisons follow the frozen comparison table",
  "Every CS-NUMERIC cross-family case returns the COMPARISON_RULES answer (CMP-NUMERIC-CONST, CMP-INT-FLOAT, CMP-IDENTITY, CMP-UNTYPED-STRING, CMP-BOOL-INT, CMP-NEGZERO), including E-MIXED-FAMILY where stated, on the repository and supported native fragments.",
  cases=["CS-NUMERIC:cross-family"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  sources=["RULINGS Q8d", "packages/testkit/src/index.ts:721"])
O("G2.errors.typed-taxonomy", ["G2"], "Errors surface exactly as pinned",
  "Every CS-ERRORS case yields its pinned ERROR_TABLE error under ERROR_COMPARISON, never a success with partial rows.",
  cases=["CS-ERRORS"], oracle=["O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN, sources=["wiki/goals.md:10"])
O("G2.strings.codepoint-supported", ["G2", "G10"], "Codepoint string order on the supported surfaces",
  "Repository queries and supported native fragments order, range-filter and page text in codepoint order: the frozen O-STR arrays and the O-COLL control pass unchanged, current and reopen.",
  cases=["CS-STR:supported"], oracle=["O-STR", "O-COLL"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE", "CR-MUTANT-KILL"), mutants=["M-ICU-ORDER"],
  sources=["wiki/goals.md:47-64", "lab/research/R5-qlever-semantic-blockers.md 3"])

# ---------------- Goal 3
O("G3.plan.explain", ["G3"], "Plans and routes are captured for every query",
  "Every repository query and native read in CS-QMIX returns its engine plan and Triplex route through EP-EXPLAIN, and O-PLAN's route verdict (OBS-PLAN-ROUTE) equals the C1 expected route.",
  cases=["CS-QMIX"], oracle=["O-PLAN"], ep=["EP-EXPLAIN", "EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  sources=["wiki/goals.md:11", "lab/PLAN.md C1"])
O("G3.plan.access-path-at-scale", ["G3"], "Key-bounded access at 10m",
  "At P-YEAR-ONE the point, getMany, selective-filter and reverse-ref classes resolve through a key-bounded access path (OBS-PLAN-ACCESS) with O-REPLAY answers; their p50 ratio between P-RUNG-1M and P-YEAR-ONE is reported against T-LAT-RATIO-10M-1M as a secondary measurement with no authority to block done (RULINGS Q25).",
  cases=["CS-QMIX:point,getMany,selective-filter,reverse-ref"], oracle=["O-REPLAY", "O-PLAN"], ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"],
  profiles=["P-RUNG-1M", "P-YEAR-ONE"], closure=("CR-SCALE", "CR-METRICS"), thresholds=["T-LAT-RATIO-10M-1M"],
  sources=["lab/research/R1-xtdb-capabilities.md Q7", "lab/reviews/plan-review-r1.codex.md finding 11"], grounding="derived")
O("G3.admission.preconstruction", ["G3"], "Expensive queries are refused before construction",
  "Every CS-ADMIT case fails with E-ADMISSION before the engine builds the expensive structure: zero scratch rows or graphs, engine memory within T-PLANNER-MEM-BYTES (OBS-RESOURCE), and the engine stays available.",
  cases=["CS-ADMIT"], oracle=["O-ERR", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-HEAVY"],
  closure=("CR-PASS-ALL", "CR-OBSERVE"), thresholds=["T-PLANNER-MEM-BYTES"], sources=["wiki/goals.md:11", "lab/research/R2-qlever-capabilities.md 3.3"])
O("G3.cost.budget-honored", ["G3"], "Admitted queries stay inside their declared budget",
  "Every admitted CS-QMIX query at P-YEAR-ONE records estimate and actual cost (OBS-PLAN-COST); none exceeds its declared budget; a query crossing its budget stops with E-ADMISSION or E-TIMEOUT rather than running to completion.",
  cases=["CS-QMIX"], oracle=["O-PLAN", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"], profiles=["P-YEAR-ONE"], closure=("CR-PASS-ALL", "CR-OBSERVE"),
  sources=["wiki/goals.md:11"], grounding="derived")
O("G3.recursion.scalable", ["G3"], "Recursion is correct and bounded on every topology",
  "Recursive reads over every benchmark-contract topology (chain, tree, diamond, cycle, high-fanout, skewed-hotset) return O-REPLAY answers in the lane language at P-RUNG-1M and P-YEAR-ONE and stay bounded (round and row bounds, budgets, cancellation and typed resource errors per G3.recursion.read-only-frontier and goal 6); their p99 is reported against T-RECURSION-P99-MS as a secondary measurement with no authority to block done (RULINGS Q25).",
  cases=["CS-RECURSION-TOPO"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-RUNG-1M", "P-YEAR-ONE"],
  closure=("CR-PASS-ALL", "CR-METRICS"), thresholds=["T-RECURSION-P99-MS"], sources=["qualification/benchmark-contract.json topologies"])
O("G3.recursion.read-only-frontier", ["G3", "G6"], "Recursive native reads never mutate and obey frontier rules",
  "Every C8-* case in CS-RECURSION-TOPO: engine-side mutation count is zero during the read (OBS-NO-MUTATION); all rounds run at one fixed cut; bounds fail with E-RECURSION-LIMIT and no partial answer; host steps are only FRONTIER_RULES operations; host time is counted.",
  cases=["CS-RECURSION-TOPO:c8"], oracle=["O-REPLAY", "O-OBS", "O-ERR"], ep=["EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC"],
  closure=("CR-PASS-ALL", "CR-OBSERVE"), contracts=["C8"], sources=["lab/PLAN.md C8", "lab/reviews/acceptance-review-r1.codex.md finding 16"])

# ---------------- Goal 4
O("G4.neg.correlated-not-exists", ["G4"], "Correlated negation on the supported surfaces",
  "The flat and nested correlated NOT EXISTS controls and their EXISTS, MINUS and OPTIONAL plus !BOUND variants return the O-SHAPE answers through the repository and supported native fragments.",
  cases=["CS-SHAPE:negation"], oracle=["O-SHAPE", "O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE", "CR-MUTANT-KILL"), mutants=["M-DECORRELATE"], sources=["wiki/problems/native-correlation.md", "lab/research/R5-qlever-semantic-blockers.md 5.4"])
O("G4.neg.correlated-not-exists-raw", ["G4"], "Correlated negation on the XTDB raw surface",
  "The correlated NOT EXISTS controls written in raw SQL and raw XTQL over the documented raw dataset return only `two` (the QLever raw cell is exception RX-Q29, qualified by R.raw.mapped-recipes).",
  lanes=X, cases=["CS-SHAPE:negation-raw"], oracle=["O-SHAPE"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE"], modes=CUR_REOPEN, closure=("CR-COUNTEREXAMPLE",),
  sources=["wiki/problems/native-correlation.md", "RULINGS Q1"])
O("G4.cut.task-wide-fixed", ["G4", "G9"], "One cut per multi-call task under a concurrent writer",
  "Each multi-call task pins one captured basis for all its calls; a writer committed between calls does not change its answer; the next task sees the writer.",
  cases=["CS-PKT-MULTICALL"], oracle=["O-EVT", "O-REPLAY"], ep=["EP-NATIVE"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  mutants=["M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["lab/research/R6-xtdb-gap-analysis.md finding 1"])
O("G4.neg.conflict-semantics", ["G4", "G5"], "Conflict semantics per PLAN C5",
  "Every C5-* case of CS-CONFLICT: Equal-valued duplicates are not conflicts (one value, several supports); a conflict is two or more distinct live values of a cardinality-one attribute at the basis; get and getMany fail with E-CONFLICTING-VALUES listing every conflicted entity and attribute (compared on _tag, reason and the set of {entityId, attribute}, AMB-13); counts, ordering, includes and negation fail with it when a referenced attribute is conflicted for any candidate; find also fails with it when a returned document contains a conflicted attribute even if the filter avoids it, while a projection that omits the attribute succeeds (RS-FIND-CONFLICT, RULINGS Q21 AMB-17, provisional, flagged for Sam); reads that neither reference nor return a conflicted attribute are unaffected; the values(attribute) relation lists every live value with its supports; the raw convenience shape returns its documented indicator and never certifies equivalence.",
  cases=["CS-CONFLICT"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  mutants=["M-CONFLICT-PICK", "M-EQ-DUP-CONFLICT", "M-DROPPED-SUPPORT"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), contracts=["C5"],
  sources=["lab/PLAN.md C5", "RULINGS Q8e", "RULINGS Q12"])

# ---------------- Goal 5
O("G5.agg.shape-controls", ["G5"], "Aggregate edge shapes keep their specified answers",
  "AG-EMPTY-UNGROUPED, AG-EMPTY-GROUPED, AG-MINMAX-TIES and AG-PACKET-COALESCE cases of CS-SHAPE return the O-SHAPE answers on the repository and supported native fragments.",
  cases=["CS-SHAPE:aggregate"], oracle=["O-SHAPE", "O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN, closure=("CR-COUNTEREXAMPLE",),
  sources=["wiki/problems/native-correlation.md", "packages/testkit/src/index.ts:1218"])
O("G5.agg.full-support", ["G5"], "Aggregates count equal values on distinct entities",
  "Every CS-SUPPORT case returns the AG-SUM-I, AG-SUM-F, AG-COUNT and AG-SUM-ONE-ENTITY answers on the repository and supported native fragments: SUM runs over the bag of distinct solution rows, so equal values on distinct entities each count, while two equal-valued assertions on one entity are one value with two supports and one binding row (SUM 10, COUNT 1; RULINGS Q21 AMB-09, provisional, flagged for Sam); integer results project as IntegerValue text (AG-INT-RESULT).",
  cases=["CS-SUPPORT"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-DROPPED-SUPPORT", "M-IDENTITY-COLLAPSE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["packages/testkit/src/index.ts:1218"])
O("G5.agg.typed-groups", ["G5"], "Group keys keep typed identity",
  "Every CS-NUMERIC groups case groups by the COMPARISON_RULES identities on the repository and supported native fragments.",
  cases=["CS-NUMERIC:groups"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN, sources=["testkit 'datalog having preserves typed group and aggregate equality'"])
O("G5.agg.projection-sums", ["G5"], "Engine-side sums are exact where a projection needs them",
  "For every declared projection whose definition aggregates over many subjects, and every CS-NUMERIC projection-sums case, the engine-side SUM returns the AG-SUM-I total (exact; E-INTEGER-OVERFLOW only for a final total outside the integer range), using on XTDB SUM(CAST(x AS DECIMAL(32,0))) read as text and never cast back to BIGINT or any numeric client type (KL-X9, RULINGS Q39a; confirmed by EXP-X02), else the split-sum fallback (RULINGS Q13, Q19), with EXP-F02 cross-checking the chosen recipe; whichever recipe is used passes these same cases; unconverted integer AVG fails with E-INTEGER-AVG; per-subject sums run in the kernel and are covered by G2.arith.integer-exact.",
  cases=["CS-NUMERIC:projection-sums"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-INTEGER-ROUND", "M-X-DECIMAL-SUM-BIGINT"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), params={"diagnostics": ["D-X-SUM"]},
  sources=["RULINGS Q8a", "RULINGS Q8b", "RULINGS Q13", "RULINGS Q19", "RULINGS Q20", "lab/research/SAM-pasted-numbers-2026-11-07.md section 5 (arithmetic over many rows only where a projection needs it)"])

# ---------------- Goal 6
O("G6.cancel.observed-drain", ["G6"], "Cancellation observed down to drained engine work",
  "Cancelling a long read in the lane language yields an OBS-CANCEL verdict DRAINED: caller settled with E-CANCELLED, transport cancel acknowledged, engine stops listing the statement within T-DRAIN-MS, same connection reused healthily.",
  cases=["CS-CANCEL:read"], oracle=["O-OBS"], ep=["EP-NATIVE", "EP-REPO", "EP-ENGINE-OBS"], profiles=["P-HEAVY"], closure=("CR-OBSERVE",),
  thresholds=["T-DRAIN-MS"], sources=["wiki/problems/cancellation-observation-levels.md"])
O("G6.deadline.enforced", ["G6"], "Deadlines are enforced end to end",
  "A read exceeding timeoutMs returns E-TIMEOUT within T-DEADLINE-GRACE-MS and drains per OBS-CANCEL within T-DRAIN-MS; a non-interruptible engine operation is prevented by admission or drained within the bound.",
  cases=["CS-CANCEL:deadline"], oracle=["O-OBS", "O-ERR"], ep=["EP-NATIVE", "EP-REPO", "EP-ENGINE-OBS"], profiles=["P-HEAVY"], closure=("CR-OBSERVE",),
  thresholds=["T-DEADLINE-GRACE-MS", "T-DRAIN-MS"], sources=["lab/research/R2-qlever-capabilities.md 6.4"])
O("G6.cancel.preaborted-no-work", ["G6"], "A pre-aborted request does no engine work",
  "A request cancelled before dispatch returns E-CANCELLED and OBS-PREABORT records zero engine statements for its request id.",
  cases=["CS-CANCEL:preaborted"], oracle=["O-OBS", "O-ERR"], ep=["EP-NATIVE", "EP-REPO", "EP-ENGINE-OBS"], closure=("CR-OBSERVE",),
  sources=["packages/qlever/experiments/native-entry.ts unavailable-cut-and-preaborted-query-reject"])
O("G6.cleanup.scratch-zero", ["G6"], "No scratch residue after reads, cancels and crashes",
  "After normal operation, cancellation and crash plus documented recovery, every remaining scratch relation (constraint and Datalog scratch; native reads create none per C8) holds zero rows for finished work (OBS-SCRATCH) and every working-outcome-unknown is resolved.",
  cases=["CS-SCRATCH"], oracle=["O-OBS"], ep=["EP-NATIVE", "EP-REPO", "EP-RESOLVE", "EP-ENGINE-OBS"], profiles=["P-FAULT"],
  closure=("CR-FAULT", "CR-OBSERVE"), thresholds=["T-FAULT-REPS"], sources=["lab/research/R4-codebase-harness-map.md 3.1"])
O("G6.ownership.bounded-connections", ["G6"], "Connections and engine work are bounded and released",
  "Engine-side connections never exceed the declared pool caps across 100 open-use-close cycles and under 1024 logical clients, and return to baseline within T-CONN-RELEASE-MS after close (OBS-CONNECTIONS).",
  cases=["CS-LIFECYCLE:bounds"], oracle=["O-OBS"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], closure=("CR-OBSERVE",),
  thresholds=["T-CONN-RELEASE-MS"], sources=["wiki/problems/load-liveness.md"])
O("G6.resource.memory-failure-contained", ["G6"], "A resource failure does not take the engine down",
  "A read exceeding the engine memory budget fails with E-ADMISSION or a pinned execution error; writes and reads succeed again within T-AVAIL-WINDOW-MS without manual restart (OBS-AVAILABILITY).",
  cases=["CS-ADMIT:memory"], oracle=["O-OBS", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-HEAVY"], closure=("CR-OBSERVE",),
  thresholds=["T-AVAIL-WINDOW-MS"], sources=["wiki/problems/recovery.md"])

# ---------------- Goal 7
O("G7.write.atomic", ["G7"], "Commands are all-or-nothing on every access path",
  "Every CS-WRITE atomic case and every CS-FAULT atomic fault point leaves the complete command or nothing, as seen through every listed access path; a later successful write never publishes a partial earlier one.",
  scope="engine", cases=["CS-WRITE:atomic", "CS-FAULT:atomic"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-WRITER", "EP-RAW-WIRE"],
  profiles=["P-TINY", "P-FAULT"], closure=("CR-PASS-ALL", "CR-FAULT"), modes=CUR_REOPEN, thresholds=["T-FAULT-REPS"],
  sources=["lab/research/R2-qlever-capabilities.md 1.8", "lab/reviews/acceptance-review-r1.codex.md finding 10"])
O("G7.write.command-idempotency", ["G7"], "A command id commits at most once",
  "A duplicate commandId, sequentially and in a 16-way race, commits exactly once; every other attempt gets E-COMMAND-COMMITTED with the original txId; transactionByCommand returns it.",
  scope="engine", cases=["CS-WRITE:idempotency"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  mutants=["M-CLAIM-IGNORED"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["handoffs/claude-native/README.md:41"])
O("G7.write.preconditions-cas", ["G7"], "Preconditions and concurrency never lose an update",
  "Stale TripleLive and EntityState preconditions fail with E-TX-CONFLICT; concurrent conflicting writers lose no acknowledged update; replay-safe retries reach the O-REPLAY final state.",
  scope="engine", cases=["CS-WRITE:preconditions"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  sources=["lab/research/R4-codebase-harness-map.md 2.3"])
O("G7.receipt.journal-complete", ["G7"], "Receipts are complete and ordered",
  "Every acknowledged command has a transaction record whose position, instant, actor, commandId, correlationId, causationId, configSnapshot and ordered changes equal O-REPLAY; reserved namespaces fail with E-RESERVED; every ACK has a durable operation receipt.",
  scope="engine", cases=["CS-WRITE:receipts"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER", "EP-RESOLVE"], modes=CRR,
  mutants=["M-JOURNAL-ORDER"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["handoffs/claude-native/README.md:41"])
O("G7.journal.logical-contract", ["G7"], "The logical journal stays queryable (C6)",
  "Every C6-* case: direct match and Datalog queries over :_tx/change and :_tx/changed-entity, transactions(), transactionsForEntity and transactionByCommand return O-REPLAY's outputs per JOURNAL_RULES: creation order (JN-ORDER), staged facts visible to later operations of the same command (JN-STAGED), bit-exact -0.0 change values (JN-NEGZERO, RULINGS Q21 AMB-04, provisional, flagged for Sam) and the documented and testkit-pinned fields (JN-FIELDS); whole-journal byte identity of a physically slimmed journal is checked against a separate T0-capture baseline (C6-SLIM-BYTE-IDENTICAL), modulo erasure: an erasure commit is an ordinary journal transaction whose changes list only identities (ER-COMMIT-JOURNAL-IDENTITY-ONLY) and earlier transactions' :_tx/change facts for erased values show the ErasedValue marker (ER-EARLIER-CHANGE-MARKER), so both sides of the whole-journal comparison carry markers (ER-JOURNAL-MODULO, RULINGS Q31f, Q49a).",
  scope="engine", cases=["CS-JOURNAL", "CS-ERASURE:ER-JOURNAL-MODULO,ER-COMMIT-JOURNAL-IDENTITY-ONLY,ER-EARLIER-CHANGE-MARKER", "CS-WIRE:WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP"], oracle=["O-REPLAY"], ep=["EP-TRIPLES"], modes=CRR, contracts=["C6"],
  sources=["lab/PLAN.md C6", "lab/reviews/acceptance-review-r1.codex.md finding 6"])
O("G7.commit.protocol-transitions", ["G7"], "Commit outcomes follow the witnessed transition table",
  "For every C2-* (log-source) and X-* (engine-source) fault point of CS-FAULT, injected T-FAULT-REPS times, the final state, the original caller's outcome, retries with the same commandId and reads match the transition table of the composition's declared protocol variant (COMMIT_OUTCOMES log-source or engine-source, RULINGS Q55b) for the last witnessed transition: a group with QT2-LOGGED evidence is always published by recovery; retries before source publication return E-COMMIT-PENDING or E-REPAIRING; a success receipt exists only after source publication (QT4s-SOURCE-PUBLISHED, or XT2 for engine-source), and an ACK while the replica is behind is correct (C2-SOURCE-PUBLISHED-REPLICA-BEHIND, C2-CRASH-AFTER-SOURCE-PUBLISHED); the engine process killed with SIGKILL is covered engine-side on both lanes (C2-ENGINE-SIGKILL, X-ENGINE-SIGKILL, RULINGS Q51f); a scope written by both commit paths at once is refused at runtime with the typed E-DUAL-COMMIT-PATH (X-DUAL-COMMIT-PATH-REFUSED, RULINGS Q51f); a second broker opening the same stream directory in one process is refused and no ACKed frame is lost (C2-TWO-BROKERS-ONE-PROCESS, RULINGS Q62a).",
  scope="engine", cases=["CS-FAULT:transitions,lost-ack,engine-crash", "CS-FAULT:" + ",".join(FAULT_Q55_CASES + FAULT_Q62_CASES)], oracle=["O-REPLAY", "O-OBS", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-RAW-WIRE", "EP-RESOLVE"], profiles=["P-FAULT"],
  closure=("CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], mutants=["M-EARLY-ACK"], contracts=["C2"],
  sources=["lab/PLAN.md C2", "lab/reviews/acceptance-review-r1.codex.md finding 5"])
O("G7.broker.fence-and-epochs", ["G7"], "One mutator, credentials, epochs and fence (C3)",
  "Every C3-* case: an old broker resuming after replacement cannot mutate; updates without the broker token are refused by the engine; native reads and the raw hatch cannot route an update; rebuild, checkpoint and administration are refused while fenced; commits while fenced return E-REPAIRING; a new broker closes the previous epoch before mutating.",
  lanes=Q, scope="engine", cases=["CS-BROKER"], oracle=["O-OBS", "O-ERR"], ep=["EP-ENGINE-ADMIN", "EP-WRITER", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-FAULT"],
  closure=("CR-PASS-ALL", "CR-OBSERVE"), contracts=["C3"], sources=["lab/PLAN.md C3"])
O("G7.composition.overlay-rules", ["G7"], "The overlay merges entity pulls only, and frames carry tombstones",
  "Per COMPOSITION overlay (RULINGS Q58d), for a log-source composition: the overlay merge serves entity pulls only (CO-OVERLAY-ENTITY-PULL-ONLY), keyed by id with the greater LSN winning (CO-OVERLAY-GREATER-LSN-WINS), under the tested invariant that identity columns never change and a retraction is a new version (CO-OVERLAY-IDENTITY-INVARIANT); engine aggregates, Datalog and executor reads and paged lists never merge, and wait or fail typed (CO-OVERLAY-NO-MERGE-WAITS-OR-TYPED); frames carry explicit tombstones, so erasure and deletes never resurrect replica rows (CO-TOMBSTONE-NO-RESURRECTION).",
  cases=["CS-COMPOSITION:overlay", "CS-COMPOSITION:" + ",".join(OVERLAY_CASES)], oracle=["O-REPLAY", "O-OBS", "O-ERR"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  sources=["RULINGS Q58d", "lab/research/R23-log-of-record-compositions.md section 5"])
O("G7.broker.promotion-hardening", ["G7"], "A log-source composition is hardened before promotion",
  "Per COMPOSITION brokerPromotion (RULINGS Q50d), for a log-source composition: the overlay has a memory bound with backpressure, so a replica outage of the GS.04b kind returns the typed E-OVERLOADED beyond the bound and never grows without limit (BR-OVERLAY-BOUND-OVERLOADED); per RULINGS Q58c, replacing Q50d's rotation and lock items, the log is SQLite through better-sqlite3 with WAL, synchronous=FULL, fullfsync=ON, checkpoint_fullfsync=ON, locking_mode=EXCLUSIVE and application-driven PASSIVE checkpoints, a second writer being refused (BR-SQLITE-DURABILITY-PRAGMAS); a CRC32C prev-chain column detects mid-WAL corruption plain SQLite misses (BR-CRC-CHAIN-MID-WAL); every frame records committed_at (BR-COMMITTED-AT); an epoch row closes the previous epoch (BR-EPOCH-ROW); the marker and checkpoint are cross-checked against the log on open (BR-MARKER-CHECKPOINT-CROSSCHECK); the overlay is the persisted recent_rows table (BR-RECENT-ROWS-PERSISTED); and per RULINGS Q58e value payloads in frames, recent_rows and checkpoints are encrypted per subject, so erasure destroys the key (BR-LOG-CRYPTO-SHRED).",
  scope="engine", cases=["CS-BROKER:hardening", "CS-BROKER:" + ",".join(BROKER_HARDENING_CASES)], oracle=["O-OBS", "O-ERR"], ep=["EP-WRITER", "EP-ENGINE-ADMIN", "EP-ENGINE-OBS"], profiles=["P-FAULT"],
  closure=("CR-PASS-ALL", "CR-OBSERVE"), sources=["RULINGS Q50d", "RULINGS Q58c, Q58e, Q62b", "EXP-P2Q (host log and broker)", "lab/research/R23-log-of-record-compositions.md"])
O("G7.recovery.backup-restore", ["G7"], "Backup and restore reproduce every read",
  "A stopped backup restored into a fresh engine reproduces every frozen cut on every surface and accepts new writes at the next position.",
  scope="engine", cases=["CS-FAULT:backup-restore"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"], profiles=["P-FAULT"],
  sources=["qualification/benchmark-contract.json separatePhases"], grounding="derived")
O("G7.migration.schema-evolution", ["G7", "G10"], "Schema evolution with live data and resumable backfill",
  "For each CS-MIGRATION case, with old and new clients concurrent: bases before the release read with the old mapping, after it the new; a backfill killed midway resumes to the O-REPLAY state; old cursors continue per CURSOR_TRANSITIONS (CT-RELEASE-CHANGE); history is preserved.",
  cases=["CS-MIGRATION"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-NATIVE"], profiles=["P-TINY-CONC"], modes=CRR,
  sources=["lab/reviews/plan-review-r1.codex.md finding 12"])
O("G7.migration.valid-writes-never-rejected", ["G7"], "Valid Triplex writes are never rejected for the physical design",
  "Every CS-MIGRATION valid-writes case that O-REPLAY classifies as valid is accepted and read correctly on every surface.",
  scope="engine", cases=["CS-MIGRATION:valid-writes"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-WRITER", "EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  sources=["lab/reviews/plan-review-r1.response.md decision 12"])

# ---------------- Goal 8
O("G8.eligibility.c1-routing", ["G8", "R"], "Projection eligibility routes whole queries (C1)",
  "Every C1-* case of CS-ELIGIBILITY: the observed route (OBS-PLAN-ROUTE) equals the C1 expected route for the whole query, including a partial entity excluded by an early filter but relevant to ordering, negation or aggregation, a mapping-generation mismatch, explicit and decreasing recorded times, interior positions and V outside the marker window; answers equal O-REPLAY.",
  cases=["CS-ELIGIBILITY"], oracle=["O-REPLAY", "O-PLAN"], ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  mutants=["M-PARTIAL-IGNORED", "M-STALE-PROJECTION"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), contracts=["C1"],
  sources=["lab/PLAN.md C1", "lab/reviews/acceptance-review-r1.codex.md finding 6"])
O("G8.publish.coherent", ["G8"], "Every read sees one coherent publication",
  "Under concurrent commit groups every read's answer equals O-REPLAY at its returned basis; no read mixes two publications of ledger, projection, schema or index state.",
  cases=["CS-PUBLISH:coherence"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], profiles=["P-TINY-CONC"],
  mutants=["M-STALE-PROJECTION"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["lab/reviews/plan-review-r1.codex.md finding 8"])
O("G8.publish.basis-honesty", ["G8"], "Requested bases are honored and returned bases are true",
  "A read at a requested basis is answered at exactly that basis; the only permitted errors are those of CURSOR_TRANSITIONS.permittedErrors; the returned basis is the basis used; after an ACK at P the writing client's next latest read returns a basis at or after P.",
  cases=["CS-PUBLISH:basis", "CS-CURSOR:transitions"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-TRIPLES"], profiles=["P-TINY-CONC"],
  mutants=["M-STALE-PROJECTION", "M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["lab/reviews/acceptance-review-r1.codex.md finding 15"])
O("G8.publish.valid-boundary", ["G8", "G9"], "Valid-time boundaries take effect without new writes",
  "When a validFrom or validTo boundary passes with no command, reads at valid instants beyond it reflect it on every surface, before and after maintenance.",
  cases=["CS-PUBLISH:boundary"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], profiles=["P-TINY-CONC"],
  mutants=["M-HALF-OPEN", "M-STALE-PROJECTION"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["lab/reviews/plan-review-r1.codex.md finding 8"])
O("G8.maintenance.bounded-boundaries", ["G8"], "Bounded boundary maintenance (C4)",
  "Every C4-* case of CS-MAINT: update operations stay within the bound; a large boundary enters MAINTAINING; writes to entities in pending chunks are projected at the target instant; crash and resume completes from durable progress; the qualified hatch returns E-MAINTAINING or exact results throughout MAINTAINING; repository reads route exact; two facts with the same expiry, one deleted, read correctly; delta backpressure engages.",
  lanes=Q, cases=["CS-MAINT"], oracle=["O-REPLAY", "O-OBS", "O-ERR"], ep=["EP-REPO", "EP-RAW-HATCH", "EP-RAW-WIRE", "EP-WRITER", "EP-ENGINE-OBS"], profiles=["P-FAULT"],
  mutants=["M-CHUNK-STALE"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], contracts=["C4"], sources=["lab/PLAN.md C4"])
O("G8.reuse.positive-witness", ["G8"], "Reuse is real, bounded, keyed and invalidated",
  "For each reuse mechanism the lane declares (at least the projection and one maintained closure or cache), CS-REUSE shows: a second read at the same key does at most T-REUSE-AVOIDED of the first read's engine work (OBS-WORK); answers equal a run with reuse disabled; an affecting write invalidates the entry for later bases; the cache stays within its declared cap.",
  cases=["CS-REUSE:positive-reuse,invalidation"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC", "P-RUNG-1M"],
  mutants=["M-STALE-REUSE"], closure=("CR-PASS-ALL", "CR-WITNESS", "CR-MUTANT-KILL"), thresholds=["T-REUSE-AVOIDED"],
  sources=["wiki/goals.md:16", "lab/reviews/acceptance-review-r1.codex.md finding 14"])
O("G8.support.incremental-witness", ["G8"], "Supports are maintained incrementally",
  "At P-RUNG-1M a one-entity change to a maintained support or projection costs at most T-INCR-WORK of full recomputation (OBS-WORK), and the maintained result equals a fresh recomputation and O-REPLAY.",
  cases=["CS-REUSE:incremental", "CS-SUPPORT-DAG:incremental"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-RUNG-1M"],
  closure=("CR-PASS-ALL", "CR-WITNESS"), thresholds=["T-INCR-WORK"], sources=["lab/reviews/acceptance-review-r1.codex.md finding 14"])
O("G8.support.alternate-maintained", ["G8"], "Maintained supports survive partial retraction",
  "Removing one of two supports keeps a derived fact; removing the last removes it; for workload 20, CS-SUPPORT-DAG and identical assertions where one is retracted.",
  cases=["CS-SUPPORT-DAG"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  mutants=["M-DROPPED-SUPPORT"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["lab/reviews/plan-review-r1.codex.md finding 13"])

# ---------------- Goal 9
O("G9.temporal.half-open-intervals", ["G9"], "Half-open valid intervals on every surface",
  "Valid intervals are [validFrom, validTo) with null open-ended, exact at fractional-millisecond boundaries and at the boundary instants, on every surface, current, reopen and engine restart; an interval with validTo <= validFrom is rejected with E-INVALID-VALUE before any mutation (TM-EMPTY-REJECTED, RULINGS Q21 AMB-12).",
  cases=["CS-TEMPORAL:valid,boundary,empty-interval"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CRR,
  mutants=["M-HALF-OPEN"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["handoffs/claude-native/README.md:46-48"])
O("G9.temporal.recorded-cuts", ["G9"], "Recorded-time and position cuts are exact, independently",
  "Reads by recordedAt and by position equal O-REPLAY, with R evaluated independently of P: between commits, at an instant shared by two commits, with decreasing recorded instants from a second runtime, at interior positions of nested transactions, after corrections and around aborts; ordinary reads take R and V only.",
  cases=["CS-TEMPORAL:recorded,decreasing-clock"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"], profiles=["P-TINY-CONC"], modes=CRR,
  mutants=["M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/PLAN.md C1 recorded time", "lab/reviews/acceptance-review-r1.codex.md finding 7"])
O("G9.history.raw-lifetime-compat", ["G9"], "Ordinary history keeps the raw lifetime contract",
  "Ordinary Triples.history, match, entity, entityPage and entities keep the raw assertion-lifetime contract exactly as O-REPLAY computes it, including at an explicit R (RS-RAW-LIFETIME, RULINGS Q21 AMB-01).",
  scope="engine", cases=["CS-HAM9:raw-lifetime"], oracle=["O-REPLAY", "O-HAM"], ep=["EP-TRIPLES"], modes=CUR_REOPEN,
  mutants=["M-MASK-RAW"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["handoffs/claude-native/README.md:46-48"])
O("G9.history.snapshot-metadata", ["G9"], "As-of snapshots hide retirements not yet known",
  "The five failing tiny-v4 checks, the finite-nine fixture and the same-R control pass through the repository timeline and as-of reads and the native history helpers: retirement metadata is compared as logical content (RS-RETIREMENT-CONTENT, AMB-02), null until known at the cut and equal to O-REPLAY after, and timeline lists every assertion recorded at (P, R) with no valid-time filter (RS-TIMELINE, AMB-03); the original counterexample keeps its original expected answer on these surfaces (AMB-01).",
  cases=["CS-CFG8:retirement-metadata-target", "CS-HAM9:snapshot"], oracle=["O-CFG8", "O-HAM", "O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  mutants=["M-FUTURE-RETIREMENT"], closure=("CR-COUNTEREXAMPLE", "CR-MUTANT-KILL"), sources=["lab/research/R6-xtdb-gap-analysis.md 3.1"])
O("G9.corrections.preserve", ["G9"], "Corrections preserve what was previously recorded",
  "A correction keeps the earlier value visible at earlier recorded cuts and both versions in history, on every surface, current, reopen and restart.",
  cases=["CS-TEMPORAL:corrections"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CRR,
  sources=["testkit 'historical corrections preserve what was previously recorded'"])
O("G9.lineage.supporting-assertions", ["G9"], "Answer rows name their supporting assertions",
  "Every repository and native helper answer row that claims a fact names its supporting assertion ids and transactions, equal to O-REPLAY's supports.",
  cases=["CS-ENTITY:lineage"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN, sources=["RULINGS Q6"])
O("G9.presence.explicit", ["G9"], "Presence follows the frozen policy",
  "Presence toggles preserve domain facts and reference targets; configured-entity membership at a cut follows the frozen presence policy on every surface.",
  cases=["CS-PRESENCE-DELETE:presence", "CS-CFG8:presence"], oracle=["O-REPLAY", "O-CFG8"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  sources=["RULINGS Q9", "wiki/research/presence-reference-deletion-requirements-v1.md"], grounding="policy-pending")
O("G9.deletion.entity", ["G9"], "Entity deletion keeps its contract and history",
  "The existing delete contract holds and interval-local deletion follows the frozen deletion policy with preserved history.",
  cases=["CS-PRESENCE-DELETE:deletion"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-TRIPLES"], modes=CRR,
  sources=["RULINGS Q9"], grounding="policy-pending")
O("G9.cascade.restrict-detach-cascade", ["G9"], "Restrict, detach and bounded cascade",
  "Restrict, detach and bounded reverse cascade follow the frozen cascade policy with deterministic receipts and atomic refusal over budget.",
  cases=["CS-PRESENCE-DELETE:cascade"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-WRITER"], modes=CUR_REOPEN,
  sources=["RULINGS Q9"], grounding="policy-pending")

# ---------------- Goal 10
O("G10.pkg.clean-consumer-slice", ["G10"], "Packaged SDK consumer slice",
  "From packed tarballs in a clean consumer outside the workspace, an application uses the repository, the writer and native queries: a write, a repository read, an authored native read in the lane language, history, a receipt, a cursor continuation and a reopen all equal O-REPLAY.",
  cases=["CS-SLICE"], oracle=["O-REPLAY"], ep=["EP-PKG"], modes=CUR_REOPEN, sources=["RULINGS Q7", "wiki/goals.md:18"])
O("G10.pkg.type-witnesses", ["G10", "R"], "Public types derive from the schema",
  "Against the packed declarations, the CS-TYPEWITNESS witnesses meet ACCEPTANCE 6.5: exact type assertions hold, no accidental any, and the expected diagnostics occur at their pinned codes and locations only.",
  cases=["CS-TYPEWITNESS"], oracle=["O-SPEC"], ep=["EP-PKG"], profiles=["P-STATIC"], closure=("CR-STATIC",), sources=["lab/NOTEBOOK.md decision D5"])
O("G10.scope.ownership-refusal", ["G10"], "Production scope ownership is enforced (C7.1, C7.2)",
  "C7-OWNER-MISMATCH, C7-OWNER-RECORD-INIT, C7-DOMAIN-ONLY-CURRENT, C7-NO-STAGING-DOMAIN and C7-XTDB-TABLE-NAMES: a mismatched scope fails with E-SCOPE-OWNER before touching projection storage; domain-pattern raw queries see only current domain data.",
  cases=["CS-SCOPE"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH", "EP-RAW-WIRE"], modes=CUR_REOPEN, contracts=["C7"],
  sources=["lab/PLAN.md C7", "lab/reviews/acceptance-review-r1.codex.md finding 6"])
O("G10.scope.shared-collision", ["G10"], "Shared-engine scopes never leak (C7.3)",
  "C7-SHARED-COLLISION: two scopes with identical entity ids on one engine; the repository, helpers and scope-selecting raw recipes return only their own scope's data.",
  cases=["CS-SCOPE"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  mutants=["M-SCOPE-LEAK"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), contracts=["C7"], sources=["lab/PLAN.md C7.3"])
O("G10.cursor.stable", ["G10"], "Cursors are complete and snapshot-stable",
  "CS-CURSOR stable cases: pages are deterministic, traverse the complete snapshot with no duplicate or skipped row under concurrent writes, and a cursor issued at P1 continues at P1 after the publication advances; stability holds modulo erasure, comparing pages with erased values replaced by their ErasedValue markers (ER-CURSOR-MODULO, RULINGS Q24).",
  cases=["CS-CURSOR:stable", "CS-ERASURE:ER-CURSOR-MODULO"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-TRIPLES"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  sources=["testkit cursor cases"])
O("G10.cursor.deep-page-cost", ["G10"], "Deep pages are correct at 10m; their cost is reported",
  "At P-YEAR-ONE page 10,000 returns the O-REPLAY rows; its cost relative to page 1 is reported against T-DEEP-PAGE-RATIO as a secondary measurement with no authority to block done (RULINGS Q25).",
  cases=["CS-CURSOR:deep-page"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-YEAR-ONE"], closure=("CR-PASS-ALL", "CR-METRICS"),
  thresholds=["T-DEEP-PAGE-RATIO"], sources=["lab/research/R6-xtdb-gap-analysis.md goal 10"], grounding="derived")
O("G10.cursor.continuation-transitions", ["G10", "G9"], "Cursors and historical bases continue across transitions",
  "Every CURSOR_TRANSITIONS.mustContinue case continues with O-REPLAY's rows at the cursor's basis; errors occur only in the permittedErrors cases, each with its pinned error; CE-FENCED also continues after recovery.",
  cases=["CS-CURSOR:transitions"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-FAULT"], modes=CRR,
  closure=("CR-PASS-ALL", "CR-FAULT"), thresholds=["T-FAULT-REPS"], sources=["lab/reviews/acceptance-review-r1.codex.md finding 15"])
O("G10.capabilities.truthful", ["G10"], "Advertised capabilities are true and cover the fixed set",
  "The advertised fragment capability set includes every FRAGMENT_COVERAGE row; each advertised capability has a passing case; each unadvertised one fails with a pinned error.",
  cases=["CS-CAPS"], oracle=["O-ERR", "O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"], sources=["RULINGS Q1", "wiki/goals.md:18"])
O("G10.lifecycle.open-close", ["G10"], "Open, close and reopen are clean",
  "initialize is idempotent across restarts; close releases every connection and background task (OBS-CONNECTIONS); reopen after close works.",
  cases=["CS-LIFECYCLE:lifecycle"], oracle=["O-OBS"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], closure=("CR-OBSERVE",),
  thresholds=["T-CONN-RELEASE-MS"], sources=["wiki/problems/load-liveness.md"])
O("G10.native.entry-checks", ["G10"], "Native entry checks in the lane language",
  "The native entry checks of CS-ENTRY pass fresh, current and reopen, every read check in the lane's language.",
  cases=["CS-ENTRY"], oracle=["O-REPLAY"], ep=["EP-NATIVE"], modes=CUR_REOPEN, params={"languagePurity": True}, sources=["lab/research/R6-xtdb-gap-analysis.md 2.5"])
O("G10.native.read-only-and-safe-params", ["G10"], "Native reads cannot write and parameters cannot inject",
  "Native read surfaces refuse every write form with E-READ-ONLY and no engine mutation (OBS-NO-MUTATION); bound parameters with quote, $$, ; and newlines are data.",
  cases=["CS-ENTRY:read-only,safe-parameters"], oracle=["O-ERR", "O-OBS"], ep=["EP-NATIVE", "EP-ENGINE-OBS"], modes=CUR_REOPEN,
  closure=("CR-PASS-ALL", "CR-OBSERVE"), sources=["packages/xtdb/src/native/ReadOnlySql.ts"])

# ---------------- R
O("R.repo.entity-suite", ["R"], "Entity suite against the independent oracle",
  "Every case of CS-ENTITY passes through the repository and writer, current, reopen and engine restart; expected answers only from O-REPLAY; find offers range predicates on integer attributes (RS-FIND-RANGE, AMB-16) and entityPage orders ids by codepoint, including the non-BMP vector U+E000 against U+10000 (RS-ENTITY-ORDER, AMB-15).",
  cases=["CS-ENTITY"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER"], modes=CRR, closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  mutants=["M-ENTITY-TYPE-SWAP", "M-CARD-MANY-DROP"], sources=["lab/PLAN.md section 1", "lab/reviews/plan-review-r1.codex.md finding 5"])
O("R.repo.mutation-controls", ["R"], "The suites kill every mutant",
  "Every mutation control meets MUTANT_RULE against its targeted cases on the lane.",
  cases=["CS-ENTITY", "CS-TEMPORAL", "CS-HAM9", "CS-CONFLICT", "CS-WIRE", "CS-DECIMAL", "CS-RANGE-OUT", "CS-ERASURE", "CS-COMPOSITION", "CS-REQ", "CS-GS", "CS-SUPPORT", "CS-SUPPORT-DAG", "CS-PUBLISH", "CS-ELIGIBILITY", "CS-FAULT", "CS-MAINT", "CS-REUSE", "CS-SCOPE", "CS-STR", "CS-SHAPE", "CS-TYPES8", "CS-NUMERIC", "CS-PARAMS", "CS-WRITE", "CS-JOURNAL", "CS-CFG8", "CS-PKT-MULTICALL"],
  oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-NATIVE"], profiles=["P-TINY-CONC", "P-FAULT"], closure=("CR-MUTANT-KILL",), mutants=list(MUTANTS.keys()),
  sources=["lab/reviews/acceptance-review-r1.codex.md finding 11"])
O("R.raw.parity", ["R"], "Raw queries return what the entity API returns",
  "For every RP-* class of CS-RAW-RECIPES, a raw query written only from the raw-query guide returns the repository's answer at the same basis and O-REPLAY's, in the lane language, through the raw hatch and direct wire access, over every value outside the lane's RAW_EXCEPTIONS domains, modulo erasure (ER-RAW-NATIVE-MODULO, RULINGS Q31f).",
  cases=["CS-RAW-RECIPES"], oracle=["O-REPLAY", "O-STR"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE", "EP-REPO"], modes=CUR_REOPEN,
  sources=["lab/PLAN.md section 1", "RULINGS Q1(b)"])
O("R.raw.mapped-recipes", ["R", "G2", "G4", "G5"], "Every raw exception's mapped recipe is exact; originals kept as diagnostics",
  "For each RAW_EXCEPTIONS cell of the lane, its RXC-* case runs the mapped recipe over the full exempt domain and returns O-REPLAY's answer; every named DIAGNOSTICS entry runs in the same receipt with its unchanged expected answer and retained actual answer.",
  cases=["CS-RAW-MAPPED"], oracle=["O-REPLAY", "O-STR", "O-COLL", "O-SHAPE", "O-ERR"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE", "EP-NATIVE"], modes=CUR_REOPEN,
  sources=["RULINGS Q1", "lab/reviews/acceptance-review-r1.codex.md finding 2"])
O("R.raw.guide-only-authoring", ["R"], "Raw recipes are authored from the guide alone",
  "The raw recipes of R.raw.parity and R.raw.mapped-recipes were authored by a fresh agent whose inputs were only the raw-query guide and the engine's public documentation, recorded in a provenance manifest (CR-PROVENANCE).",
  cases=["CS-RAW-RECIPES", "CS-RAW-MAPPED"], oracle=[], ep=["EP-RAW-WIRE"], profiles=["P-STATIC"], closure=("CR-PROVENANCE",), sources=["RULINGS Q5"])
O("R.raw.capability-matrix", ["R", "G10"], "The capability matrix is complete and exact where required",
  "CR-MATRIX holds for the lane: every required cell is EXACT with a receipt, every KNOWN-LIMIT raw-required cell has its RAW_EXCEPTIONS record and guide entry, every non-required KNOWN-LIMIT cell has a guide entry.",
  cases=["CS-CAPS"], oracle=["O-REPLAY"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE", "EP-NATIVE", "EP-REPO"], closure=("CR-MATRIX",), sources=["RULINGS Q1"])
O("R.native.fragment-equivalence", ["R", "G4"], "Fragments state, enforce and cover",
  "Each supported native helper states its equivalence conditions; outside them it fails with E-UNSUPPORTED-SHAPE naming the condition; cases inside them agree with O-REPLAY; the lane's fragments cover every FRAGMENT_COVERAGE row.",
  cases=["CS-FRAGMENT-EQUIV"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-NATIVE"], modes=CUR_REOPEN, sources=["lab/research/R5-qlever-semantic-blockers.md 5.4", "RULINGS Q1"])

# ---------------- NS: Sam's five priorities (TARGETS section 1), on the fixed writer trace (section 2)
NS_LADDER = ["NS-P1-VIOLATIONS-MAX", "NS-P1-GOODPUT-256-VS-64", "NS-P1-READ-P99-256-MS", "NS-P1-WRITER-P99-RATIO-256", "NS-P1-WRITER-WAIT-MAX-MS", "NS-P1-GOODPUT-1024-VS-256", "NS-P1-WRITER-P99-RATIO-1024", "NS-P1-RECOVERY-MS"]
NS_COMMON = dict(oracle=["O-REPLAY", "O-OBS"], profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-NS",), sources=["lab/NORTH-STAR.md", "lab/TARGETS.md sections 1 and 2"])
SE = ["single-execution"]
NS_MODES = ["single-execution", "paired-rounds"]  # RULINGS Q26, Q60f
O("NS.P1", ["NS"], "P1: many concurrent pinned reads that never block writers (per surface)",
  "With the frozen writer trace running, closed-loop readers at 1, 4, 16, 64 and 256 (and 1,024 stress) each name their basis (valid time and record time or tx), in the lane's language, under TARGETS 1.1 P1: readers and writers share one hot set (at least half the reads target subjects written in the previous 60 s, NS-P1-HOT-SET); 10% of subgraph reads are split into two or more queries at the same named basis, scheduled to straddle a command the frozen trace already holds for that subject (step 1 before its ACK, step 2 after), and must equal the oracle at the requested basis (NS-P1-SPLIT-READ); the driver adds no writes of its own, so faster readers never change the write load (NS-P1-SPLIT-NO-DRIVER-WRITES, RULINGS Q31b); every window contains at least one maintenance event (NS-P1-MAINTENANCE-IN-WINDOW); the driver records the requested basis itself and the verifier checks answers at it (NS-P1-DRIVER-BASIS); reader-caused writer waits are attributed by matched-phase comparison against the zero-reader run and by engine-side wait evidence where the engine exposes it (NS-P1-WAIT-ATTRIBUTION). Every NS-P1-* bar holds: zero violations, goodput at 256 not below 64, read p99 within NS-P1-READ-P99-256-MS, writer commit p99 within NS-P1-WRITER-P99-RATIO-256 of its zero-reader baseline, no command waits beyond NS-P1-WRITER-WAIT-MAX-MS, and at 1,024 goodput within NS-P1-GOODPUT-1024-VS-256, writer p99 within NS-P1-WRITER-P99-RATIO-1024, back to the 256-level bar within NS-P1-RECOVERY-MS.",
  cases=["CS-NS:p1-ladder,p1-stress", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P1"])], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER", "EP-ENGINE-OBS"], thresholds=NS_LADDER + ["T-RUNS"], modes=SE, **NS_COMMON)
O("NS.P2", ["NS"], "P2: small, atomic, idempotent per-subject commits with low latency",
  "Open loop under TARGETS 1.1 P2: commands are offered on the frozen schedule and latency runs from the scheduled offer to the published ACK (sent only once the commit is durable and readable), so queueing behind other writers counts. The trace's own commands are reported per size band: the 5-to-10 band (NS-P2-BAND-5-10) and the 11-to-25 band (NS-P2-BAND-11-25) each meet NS-P2-COMMIT-P50-MS and NS-P2-COMMIT-P99-MS, the 26-to-50 band (NS-P2-BAND-26-50) meets NS-P2-COMMIT-P99-26-50-MS, all with P1's 256 readers running; the 10-fact probe is a diagnostic only. Every offered command is committed with a receipt, rejected with a typed error, or a typed conflict (NS-P2-UNACCOUNTED-MAX, NS-P2-ACCOUNTING), and accounting is not progress: every oracle-valid trace command publishes; typed rejections count only for the trace's deliberately invalid commands and typed conflicts only where the oracle independently finds a compare-and-set race (NS-P2-UNJUSTIFIED-OUTCOMES-MAX, NS-P2-PROGRESS); queued commands never exceed NS-P2-QUEUE-MAX-S of the offered rate at steady state (NS-P2-QUEUE-BOUND) and the queue drains within NS-P2-BURST-DRAIN-S after each burst (NS-P2-BURST-DRAIN) (RULINGS Q31a). The pull at the returned tx sees the commit every time with no extra wait (NS-P2-RYOW-FRACTION), and each serving surface the composition claims is measured against its COMPOSITION readGuarantees guarantee (NS-P2-RYOW-PER-SURFACE, RULINGS Q55c, provisional): repository read-your-own-write never stands in for a native-surface guarantee; hot subjects go through the candidate's bounded per-subject queue with same-subject group commit, and an E-OVERLOADED beyond its bound counts against NS-P2-UNJUSTIFIED-OUTCOMES-MAX, never as progress (NS-P2-HOT-SUBJECT-QUEUE, RULINGS Q51a); duplicates and lost ACKs return the original receipt every time (NS-P2-DUP-RECEIPT-FRACTION).",
  scope="engine", cases=["CS-NS:p2", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P2"])], ep=["EP-WRITER", "EP-REPO", "EP-RESOLVE"], thresholds=["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS", "NS-P2-COMMIT-P99-26-50-MS", "NS-P2-UNACCOUNTED-MAX", "NS-P2-UNJUSTIFIED-OUTCOMES-MAX", "NS-P2-QUEUE-MAX-S", "NS-P2-BURST-DRAIN-S", "NS-P2-RYOW-FRACTION", "NS-P2-DUP-RECEIPT-FRACTION", "T-RUNS"], modes=SE, **NS_COMMON)
O("NS.P3", ["NS"], "P3: an ordered, resumable change feed",
  "Under TARGETS 1.1 P3: feed entries carry tx, entity, attribute and the valid-time range affected; lag runs from the source's own publication timestamp for each position (the broker's durable watermark update, or the engine's commit resolution when the engine is the source), recorded by the source on the shared host monotonic clock independently of ACK delivery, to the consumer's durable record, and every committed position is accounted: none is dropped for a missing ACK, and a missing one is counted and fails the run (NS-P3-EVERY-POSITION-ACCOUNTED, RULINGS Q55d); an ACK-to-consumer figure (such as EXP-P2Q's) is not this measurement until recomputed; both arms enumerate the final published source prefix from the source's own record and timestamp actual publication (the broker's watermark publication, or commit resolution when the engine is the source), ACK records being reconciled afterwards, so a late or lost ACK is never a feed defect (NS-P3-SOURCE-PREFIX-ENUMERATED, RULINGS Q67d; manifest null until built); the cursor is (epoch, position); the expected affected-subject set per transaction is the directly written subjects (O-REPLAY) plus the subjects whose WORLD_W0 static read set contains a changed fact (O-DOMAIN, NS-P3-DOMAIN-AFFECTED-SET, RULINGS Q36e); 'affected subjects known' is the consumer's single durable write of the set and its checkpoint. Over a run there are zero gaps (NS-P3-GAPS-MAX) and zero per-subject order violations (NS-P3-ORDER-VIOLATIONS-MAX); lag stays within NS-P3-LAG-P99-MS with P1's 256 readers running; delivery is at-least-once from the last checkpoint with effects keyed by (consumer, position, subject), so crashes before the effect, after the effect before the checkpoint, and after the checkpoint (NS-P3-CRASH-BEFORE-EFFECT, NS-P3-CRASH-AFTER-EFFECT, NS-P3-CRASH-AFTER-CHECKPOINT) leave zero visible duplicate effects (NS-P3-VISIBLE-DUP-EFFECTS-MAX) while replay attempts are counted separately; resume from a checkpoint replays exactly.",
  scope="engine", cases=["CS-NS:p3", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P3"])], ep=["EP-FEED", "EP-WRITER", "EP-ENGINE-OBS"], thresholds=["NS-P3-GAPS-MAX", "NS-P3-ORDER-VIOLATIONS-MAX", "NS-P3-LAG-P99-MS", "NS-P3-VISIBLE-DUP-EFFECTS-MAX", "T-RUNS"], modes=SE,
  oracle=["O-REPLAY", "O-DOMAIN", "O-OBS"], profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-NS",), sources=["lab/NORTH-STAR.md", "lab/TARGETS.md sections 1, 1.1 and 2"])
O("NS.P4", ["NS"], "P4: a fast path to current values, separate from history (per surface)",
  "Under TARGETS 1.1 P4: subject pulls at the current basis in the lane's language over the frozen weighted buckets (50% 50 to 200 facts, 35% 201 to 800, 15% 801 to 2,000; hops 3 at 40%, 4 at 35%, 6 at 25%; NS-P4-BUCKETS) meet NS-P4-PULL-P50-MS and NS-P4-PULL-P99-MS single-client on the weighted mix, each bucket reports its own p50 and p99, and the largest bucket meets NS-P4-PULL-P99-LARGEST-MS; throughput sustains NS-P4-PULLS-PER-CORE per engine core, with cores taken from the CPU quota bound in the receipt and host broker and kernel CPU reported beside it; on one matched sample of 1,000 subjects grown from history depth 1 to 3 to 10, current-pull p99 and bytes read stay within NS-P4-HISTORY-FLATNESS (NS-P4-MATCHED-HISTORY, RULINGS Q27); the receipt records whether current reads touch history.",
  cases=["CS-NS:p4", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P4"])], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], thresholds=["NS-P4-PULL-P50-MS", "NS-P4-PULL-P99-MS", "NS-P4-PULL-P99-LARGEST-MS", "NS-P4-PULLS-PER-CORE", "NS-P4-HISTORY-FLATNESS", "T-RUNS"], modes=SE, **NS_COMMON)
O("NS.P5", ["NS"], "P5: release activation re-evaluates 100k subjects without hurting live traffic (per surface)",
  "Under TARGETS 1.1 P5: a sweep evaluates release R against WORLD_W0 for every subject in R's scope at one shared basis, in the lane's language, while the writer trace and 64 live readers run; the receipt binds the basis and R's content hash; coverage is exact, every in-scope subject evaluated exactly once with the subject-list hash recorded (NS-P5-COVERAGE); a scoped release (W0 R3) is measured at the 100k rung, where its scope is not vacuous, and its receipt binds the reached-subject list and that list's hash instead of every placement (9,497 reached at 100k in V-D01's measurement; NS-P5-SCOPED-RELEASE-REACHED, RULINGS Q48b); results are published as work items through EP-OUTBOX under the delivery key (id, publication sequence) with early cutoff, so an activation that leaves a payload equal to the latest published one publishes nothing and a return to an earlier payload publishes a new sequence (RULINGS Q36a, Q38f), and equal O-DOMAIN's expected outputs; subjects the driver mutates after the basis is captured keep sweep outputs at the captured basis (NS-P5-POST-CAPTURE-MUTATION). Wall time including evaluation and publication stays within NS-P5-SWEEP-S; live read p99 and writer commit p99 stay within NS-P5-LIVE-READ-P99-RATIO and NS-P5-WRITER-P99-RATIO of their no-sweep values; a throttled variant of about 10 minutes overlaps a real compaction or index rebuild, keeps its basis and never blocks writers (no command waits beyond NS-P1-WRITER-WAIT-MAX-MS; OBS-MAINTENANCE shows the maintenance completing; NS-P5-THROTTLED-COMPACTION).",
  cases=["CS-NS:p5", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P5"])], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER", "EP-OUTBOX", "EP-ENGINE-OBS"], thresholds=["NS-P5-SWEEP-S", "NS-P5-LIVE-READ-P99-RATIO", "NS-P5-WRITER-P99-RATIO", "NS-P1-WRITER-WAIT-MAX-MS", "T-RUNS"], modes=SE,
  oracle=["O-REPLAY", "O-DOMAIN", "O-OBS"], profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-NS",), sources=["lab/NORTH-STAR.md", "lab/TARGETS.md sections 1, 1.1 and 6.1"])
O("NS.SEC.bulk-lane", ["NS"], "Secondary: the bulk lane does not hurt live reads",
  "A 1M-fact import through EP-BULK keeps live read p99 within NS-SEC-BULK-READ-P99-RATIO of its value without the import; per-batch receipts exist; the measurement is reported every run.",
  cases=["CS-NS:secondary"], ep=["EP-BULK", "EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], thresholds=["NS-SEC-BULK-READ-P99-RATIO", "T-RUNS"], modes=SE, **NS_COMMON)
O("NS.SEC.retro-and-audit", ["NS", "G9"], "Secondary: retroactive corrections and audit at a past basis",
  "A 'wrong since October' correction makes the feed report its valid-time range while explain at the old basis still shows the old belief; explain and audit at a past point in time reproduce bit for bit modulo erasure across repeats (ER-EXPLAIN-MODULO, RULINGS Q24); both are reported every run with their latencies.",
  cases=["CS-NS:secondary", "CS-ERASURE:ER-EXPLAIN-MODULO"], oracle=["O-REPLAY"], ep=["EP-FEED", "EP-REPO", "EP-NATIVE"], profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-PASS-ALL", "CR-METRICS"), modes=SE,
  sources=["lab/TARGETS.md section 1 secondary measurements"])
O("NS.calibration", ["NS"], "The NS bars are calibrated before acceptance, never loosened without Sam",
  "A create-only calibration record (VC) for the lane binds the load-contract hash, the control profile and a value for every threshold any NS obligation names (params.requiredThresholds: kept, tightened, or UNATTAINABLE with its measurement) before any NS or GS acceptance run; a record with a missing threshold, or an empty required set, fails closed (RULINGS Q26).",
  cases=["CS-NS:calibration"], oracle=["O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER"], profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-CALIBRATION",), modes=SE,
  sources=["lab/TARGETS.md threshold policy"])

# ---------------- GS: the 20 golden scenarios (TARGETS section 6)
GOLDEN_SCENARIOS = [
    (1, "Monday onboarding rush", "a day's 1,300 placements compressed into business hours with a 10x burst at 9am; workers and recruiters submit forms; every commit triggers a reconcile pull", "P1 and P2 bars hold through the burst; no writer waits over 2 s", ["P1", "P2"], ["NS-P1-VIOLATIONS-MAX", "NS-P1-READ-P99-256-MS", "NS-P1-WRITER-P99-RATIO-256", "NS-P1-WRITER-WAIT-MAX-MS", "NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS"]),
    (2, "Form submit, person waiting", "a worker submits I-9 Section 1 (10 facts); the reconcile pull runs immediately at the returned tx", "the next task is visible on the first pull, every time; commit p99 within NS-P2-COMMIT-P99-MS under scenario 1's load", ["P2", "P4"], ["NS-P2-COMMIT-P99-MS", "NS-P2-RYOW-FRACTION"]),
    (3, "Webhook storm after an outage", "1,000 duplicate E-Verify status signals across 100 subjects in 10 s, out of order", "exactly-once receipts; no read sees a half-applied command; per-subject order kept", ["P2", "P3"], ["NS-P2-DUP-RECEIPT-FRACTION", "NS-P3-ORDER-VIOLATIONS-MAX"]),
    (4, "Lost acknowledgements and a restart", "1% of commits lose their ACK and are retried; mid-run the engine (or QLever broker) is killed and restarted", "every retry returns the original receipt; no acknowledged commit is lost; readers resume at their pinned bases", ["P2", "P1"], ["NS-P2-DUP-RECEIPT-FRACTION", "NS-P1-VIOLATIONS-MAX"]),
    (5, "Background-check results burst", "a vendor posts results for 5,000 subjects in 5 minutes while the UI reads", "live read p99 holds; the feed reports every changed subject within the lag bar", ["P1", "P3"], ["NS-P1-READ-P99-256-MS", "NS-P3-LAG-P99-MS"]),
    (6, "One recruiter decision, 50 workers", "a single decision fans out as 50 per-subject commands driven by persisted messages", "each subject commits once, in order; no cross-subject transaction; all 50 visible to their next pulls", ["P2", "P3"], ["NS-P3-ORDER-VIOLATIONS-MAX", "NS-P2-RYOW-FRACTION"]),
    (7, "Two reviewers, one I-9", "two reviewers approve and waive the same subject at the same moment, 500 times across subjects", "compare-and-set lets exactly one win per race; the loser gets E-TX-CONFLICT, never a silent overwrite", ["P2"], ["NS-P1-VIOLATIONS-MAX"]),
    (8, "Address wrong since October", "valid-time corrections 30 days back on 1,000 subjects during live traffic", "the feed reports the valid-time range; derived state is re-run; explain at the old basis still shows the old belief", ["P3", "P1"], ["NS-P3-GAPS-MAX", "NS-P1-VIOLATIONS-MAX"]),
    (9, "Start dates move", "2,000 placement start dates shift forward and back, moving obligations", "next-boundary times recompute; reads at bases on both sides of a boundary are exact", ["P1", "P3"], ["NS-P1-VIOLATIONS-MAX", "NS-P3-LAG-P99-MS"]),
    (10, "Release activation", "a new release changes 3 requirements; activation is a fact; the sweep re-reconciles 100k subjects at one pinned basis with live traffic", "P5 bars hold; in-flight reconciles finish on the old release", ["P5", "P1"], ["NS-P5-SWEEP-S", "NS-P5-LIVE-READ-P99-RATIO", "NS-P5-WRITER-P99-RATIO"]),
    (11, "Plan impact preview", "'who gains work' for a candidate release over 100k subjects, without applying it, during live traffic", "identical answer to the post-activation sweep; never blocks writers", ["P5", "P1"], ["NS-P1-WRITER-WAIT-MAX-MS", "NS-P5-LIVE-READ-P99-RATIO"]),
    (12, "Audit: what did we know on March 3", "explain reads at a past basis for 1,000 subjects, repeated three times while writes continue", "bit-for-bit identical answers modulo erasure across repeats and across lanes (ERASURE reproduction); as-of pull p99 reported", ["P1"], ["NS-P1-VIOLATIONS-MAX"]),
    (13, "HRIS backfill", "a 1M-fact import through the bulk lane while live traffic runs", "live read p99 within NS-SEC-BULK-READ-P99-RATIO; per-batch receipts; the bulk lane never starves live commits", ["P2", "P1"], ["NS-SEC-BULK-READ-P99-RATIO", "NS-P2-COMMIT-P99-MS"]),
    (14, "Account factory", "a new tenant is provisioned with 10k entities and its first release while other tenants are live", "the new tenant is invisible to others at the storage layer; others' p99 holds", ["P1", "P2"], ["NS-P1-READ-P99-256-MS", "NS-P2-COMMIT-P99-MS"]),
    (15, "Tenant mix", "one large tenant (1m entities) and 1,000 small tenants (1k each) under the same live load", "storage-layer isolation; per-tenant pull and commit bars hold for large and small tenants", ["P1", "P4"], ["NS-P4-PULL-P99-MS", "NS-P2-COMMIT-P99-MS"]),
    (16, "PII erasure request", "erase PII for 10k subjects (crypto-shredding or real deletion) during live traffic", "reads that start after the erasure publishes return ErasedValue markers at every basis; values are unrecoverable from every PROTECTED_COPY_INVENTORY location; history keeps its shape; explain still works modulo erasure (provisional, flagged for Sam)", ["P1", "P3"], ["NS-P1-READ-P99-256-MS", "NS-P3-GAPS-MAX"]),
    (17, "Agent proposals churn", "agents write drafts and proposals at 5x the human rate, most discarded", "proposals never leak into decisions; pulls at a basis see exactly what was committed", ["P2", "P4"], ["NS-P4-PULL-P99-MS", "NS-P1-VIOLATIONS-MAX"]),
    (18, "Recruiter dashboards", "'placements in this branch with an overdue I-9' lists with filters, sort and paging at 256 concurrent readers", "answers come from maintained projections, match the oracle, and keep stable cursors while writes continue", ["P1", "P4"], ["NS-P1-READ-P99-256-MS", "NS-P1-VIOLATIONS-MAX"]),
    (19, "Feed consumer crash", "the dependency-index consumer crashes mid-stream and resumes from its checkpoint", "no gap; zero duplicate externally visible effects throughout, counted by the outbox delivery key (id, publication sequence), with replay attempts allowed and counted; per-subject order kept; catch-up lag measured (RULINGS Q31h, Q36a)", ["P3"], ["NS-P3-GAPS-MAX", "NS-P3-ORDER-VIOLATIONS-MAX"]),
    (20, "Midnight expiry wave", "20,000 documents expire at midnight (valid-time boundaries) while morning traffic starts", "every affected subject is re-run at the boundary; reads before and after midnight are exact; live p99 holds", ["P3", "P5", "P1"], ["NS-P3-LAG-P99-MS", "NS-P1-READ-P99-256-MS"]),
]
GS_RULES = [
    "A seeded, deterministic generator produces the command stream and the reads; the same seed gives the same bytes.",
    "Expected answers come from the independent oracles, never from a system under test: O-REPLAY for database state and values, O-DOMAIN for domain outputs and effects under WORLD_W0, or a frozen hand derivation with a citation (O-HAND).",
    "A scenario's commands are overlaid on the background trace, never instead of it; the receipt accounts for both streams separately.",
    "Every scenario carries positive witnesses (subjects that must change, GS-nn-WITNESS-POS) and negative witnesses (subjects that must not, GS-nn-WITNESS-NEG).",
    "Plan-impact preview (GS.11) and activation (GS.10) are compared at one common input basis (GS-10-11-COMMON-BASIS).",
    "The added failure schedules of GS_FAILURE_SCHEDULES (TARGETS 6.1) are named cases of their scenario and must meet their expected outcome.",
    "Each GS obligation binds only its own scenario: it selects its own tag and named cases, names exactly its own bars plus T-RUNS, and its receipt carries an ns-run whose measurement is its own scenario id (RULINGS Q26).",
    "Unless a scenario says otherwise it runs on P-YEAR-ONE with the fixed writer trace running and 256 concurrent pinned readers (P-NS).",
    "A scenario fails on any wrong answer, any lost or duplicated commit, any feed gap or order violation, or any missed bar; its receipt records the correctness verdicts and the P1 to P5 measurements together.",
    "All 20 run on every composition being compared, and the final acceptance reruns all 20 fresh.",
    "Numbers inside the scenarios: pay rates, hours and money use integer cents (the integer kind) or the decimal kind (TDK1 key); the scenarios include the range rules 'pay rate at or above 16.50' and 'hours over 40' (cases GS-NUM-RANGE-1650 and GS-NUM-HOURS-40, selected by GS.18's dashboard filters) and at least one write of a value the lane cannot hold, which must fail with E-VALUE-OUT-OF-RANGE, E-DECIMAL-OVERFLOW or E-DECIMAL-FRACTION (GS-NUM-UNHOLDABLE, selected by GS.02).",
]
GS_NAMED_CASES = {2: ["GS-NUM-UNHOLDABLE"], 18: ["GS-NUM-RANGE-1650", "GS-NUM-HOURS-40"]}
def gs_cases(n):
    own = [f"GS-{n:02d}", f"GS-{n:02d}-WITNESS-POS", f"GS-{n:02d}-WITNESS-NEG"] + GS_NAMED_CASES.get(n, []) + [c for c, _, _ in GS_FAILURE_SCHEDULES.get(n, [])]
    if n in (10, 11):
        own.append(GS_COMMON_BASIS_CASE)
    return own


for n, title, story, checks, prios, bars in GOLDEN_SCENARIOS:
    extra = "".join(f" Added failure schedule {c}: {what}; expected: {outcome}." for c, what, outcome in GS_FAILURE_SCHEDULES.get(n, []))
    if n == 11:
        extra += " The preview is compared with GS.10's activation at one common input basis (GS-10-11-COMMON-BASIS); preview publishes nothing to the outbox (OUTBOX liveOnly, RULINGS Q44c)."
    if n == 10:
        extra += " Activation is compared with GS.11's preview at one common input basis (GS-10-11-COMMON-BASIS); work items publish under the delivery key (id, publication sequence) with early cutoff (OUTBOX, RULINGS Q38f); only live reconciles at the current basis are published, in basis order (RULINGS Q40d, Q44c)."
    O(f"GS.{n:02d}", ["GS"], f"{title} ({', '.join(prios)})",
      f"Story and load: {story}. Checked beyond exact answers: {checks}.{extra} Positive and negative witnesses: GS-{n:02d}-WITNESS-POS, GS-{n:02d}-WITNESS-NEG. Bars: {', '.join(bars)}. Expected answers from O-REPLAY (state), O-DOMAIN (domain outputs under WORLD_W0) or O-HAND. The scenario fails on any wrong answer, lost or duplicated commit, feed gap or order violation, or missed bar.",
      cases=["CS-GS:" + ",".join(gs_cases(n))], oracle=["O-REPLAY", "O-DOMAIN", "O-HAND", "O-OBS", "O-ERR"],
      ep=["EP-REPO", "EP-WRITER", "EP-NATIVE", "EP-FEED", "EP-ENGINE-OBS"] + (["EP-BULK"] if n == 13 else []) + (["EP-OUTBOX"] if n in (10, 11, 19) else []) + (["EP-STORAGE-DIRECT"] if n == 15 else []),
      profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-GS",), thresholds=bars + ["T-RUNS"], modes=SE,
      sources=["lab/TARGETS.md section 6", "lab/TARGETS.md section 6.1"], params={"priorities": prios, "seededGenerator": True, "scenario": f"GS-{n:02d}", "evidenceMeasurement": f"GS-{n:02d}", "provisional": n in (3, 16)})

# ---------------- REQ: Sam's must-haves (TARGETS section 3), requirements per engine, never knockout gates
REQUIREMENTS = [
    ("commit-idempotent", ["G7"], "engine", "Per-subject atomic, idempotent commit with lost-ACK resolution", "XTDB: native transactions, ASSERT for CAS, claims table", "QLever: log of record plus broker (PLAN C2, C3)"),
    ("snapshot-reads", ["G9", "G4"], "lane", "Snapshot reads at a named point in time (valid and record time), no locks, reproducible", "XTDB: native valid and system time; snapshot tokens; H-X-CUT", "QLever: one request is one snapshot; publication marker; ledger for past bases"),
    ("change-feed", ["G7", "G8"], "engine", "Ordered change feed with entity, attribute and valid-time range affected", "XTDB: Triplex journal from ledger rows", "QLever: the log of record is the feed"),
    ("no-silent-precision-loss", ["G1", "G2", "G5"], "engine", "No silent precision loss: exact storage and round trip for every value kind in use, order-preserving comparison for range-rule attributes, a hard error never silent conversion, integer range of at least 2^53, arithmetic over many rows only where a projection needs it", "XTDB: BIGINT, DECIMAL and VARCHAR store exactly; kernel arithmetic; split-sum only where a projection sums", "QLever: lexical channels and fixed-width hex order keys; 60-bit integers cover 2^53; reject beyond +/-2^59 at write; kernel arithmetic"),
    ("pii-erasure", ["G9"], "engine", "Real erasure or crypto-shredding of PII", "XTDB: ERASE or crypto-shredding (R15)", "QLever: index rebuild after delete, or crypto-shredding"),
    ("tenant-isolation", ["G10"], "engine", "Tenant isolation at the storage layer", "XTDB: per-tenant storage (database or node)", "QLever: per-tenant index"),
    ("outbox-atomic", ["G7"], "engine", "Atomic path to the outbox and work items", "XTDB: tables in the same transaction", "QLever: records in the same log frame"),
    ("read-your-write", ["G7", "G9"], "engine", "Read-your-own-write immediately after commit", "XTDB: same transaction for ledger and current index", "QLever: publication before ACK (C2.4)"),
    ("sweep-pins-position", ["G6", "G9"], "lane", "Long sweeps pin a log position, not a long database transaction", "XTDB: snapshot token or system-time basis", "QLever: position in the log; one request per page"),
    ("retro-corrections", ["G8", "G9"], "engine", "Cheap retroactive corrections that invalidate derived state", "XTDB: valid-time DML in the current index", "QLever: ledger plus current-graph maintenance"),
]
for rid, goals, scope, title, xs, qs in REQUIREMENTS:
    O(f"REQ.{rid}", goals, f"Requirement: {title}",
      f"{title}. Each engine declares a route for this requirement, NATIVE or WORKAROUND (with its design id and a plain statement of what the engine cannot do natively); the requirement's own CS-REQ tests pass on that route. An open requirement never removes an engine from comparison. Starting points: {xs}; {qs}.",
      scope=scope, cases=[f"CS-REQ:{rid}"], oracle=["O-REPLAY", "O-OBS", "O-ERR"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-FEED", "EP-ENGINE-OBS"],
      profiles=["P-TINY-CONC"], closure=("CR-REQUIREMENT",),
      mutants=(["M-FEED-GAP"] if rid == "change-feed" else ["M-OUT-OF-RANGE-WRAP", "M-DECIMAL-ROUND"] if rid == "no-silent-precision-loss" else []),
      sources=["lab/TARGETS.md section 3", "lab/SCOPE.md section 2 item 3"])
for o in OBL:
    if o["id"].startswith("REQ.") and o["mutationControls"]:
        o["closure"]["rules"].append("CR-MUTANT-KILL")

# ---------------- erasure (TARGETS section 7, RULINGS Q24: provisional, flagged for Sam)
ER_NOTE = "Provisional product ruling (RULINGS Q24), flagged for Sam; the loop proceeds on it."
O("G9.erasure.visibility-boundary", ["G9"], "Erasure is a visibility boundary at the erasure commit's publication",
  "Every CS-ERASURE boundary, marker and reproduction case per ERASURE: a read that started before the erasure published sees each erasure commit whole, all old values or all markers (ER-INFLIGHT-READ covers a commit erasing one value, identical under Q49d and Q52e; a commit erasing several is G9.erasure.residual-shapes' ER-INFLIGHT-ALL-OR-NONE, RULINGS Q52e); every read that starts after it, at any basis including bases before the erasure, returns ErasedValue {erasedAt} in place of the value (ER-AFTER-PUBLICATION-ALL-BASES), with assertion identities and valid and record intervals unchanged (ER-SHAPE-KEPT); a reader already pinned when the erasure lands follows the same rule (ER-PINNED-READER); an index or cache serves any basis only after applying every published erasure, independently of the basis (ER-FRONTIER-OLD-BASIS), and erasure invalidates every old-basis cache entry holding the value (ER-CACHE-INVALIDATION); expected post-erasure answers come independently from O-REPLAY (ER-ORACLE-POST).",
  cases=["CS-ERASURE:boundary,marker", "CS-ERASURE:ER-INFLIGHT-READ,ER-AFTER-PUBLICATION-ALL-BASES,ER-SHAPE-KEPT,ER-PINNED-READER,ER-ORACLE-POST,ER-FRONTIER-OLD-BASIS,ER-CACHE-INVALIDATION"], mutants=["M-ERASURE-FRONTIER-SKIP"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-TRIPLES"], profiles=["P-TINY-CONC"], modes=CRR,
  sources=["lab/TARGETS.md section 7", "RULINGS Q24"], notes=ER_NOTE, params={"provisional": True})
O("G9.erasure.protected-copies", ["G9"], "Erasure reaches every protected copy",
  "Each lane keeps a protected-copy inventory covering every PROTECTED_COPY_INVENTORY location, a log-source composition's log frames, recent_rows overlay and checkpoints included, which erase by crypto-shredding (ER-LOG-CRYPTO-SHRED, RULINGS Q58e); after the erasure publishes, OBS-ERASURE-SCAN finds no plaintext and no derived-channel copy in any of them, or, for crypto-shredding, evidence that every surviving copy of the value and of anything derived from it is encrypted only under the destroyed per-subject key (ER-KEY-EXCLUSIVE; deleting some key is not evidence); a PII attribute's order key and lexical channel are inside the encrypted envelope or the attribute is not eligible for range rules (ER-ORDER-KEY-CHANNEL, ER-LEXICAL-CHANNEL).",
  scope="engine", cases=["CS-ERASURE:inventory,derived-channels", "CS-ERASURE:ER-ORDER-KEY-CHANNEL,ER-LEXICAL-CHANNEL,ER-KEY-EXCLUSIVE,ER-LOG-CRYPTO-SHRED"], oracle=["O-OBS", "O-REPLAY"], ep=["EP-WRITER", "EP-ENGINE-OBS", "EP-RAW-WIRE"], modes=CUR_REOPEN,
  mutants=["M-ERASURE-LEAK"], closure=("CR-PASS-ALL", "CR-OBSERVE", "CR-MUTANT-KILL"), sources=["lab/TARGETS.md section 7 items 3 and 4", "RULINGS Q24"], notes=ER_NOTE, params={"provisional": True})
O("G9.erasure.restore-reapplies", ["G9", "G7"], "Restore and rebuild re-apply the erasure ledger",
  "The erasure ledger is kept apart from the data; a rebuild after erasure (ER-REBUILD) and a restore from a pre-erasure backup (ER-RESTORE-PRE-BACKUP) both replay it, so every read afterwards returns the ErasedValue marker and OBS-ERASURE-SCAN of the restored copy is clean.",
  scope="engine", cases=["CS-ERASURE:restore", "CS-ERASURE:ER-REBUILD,ER-RESTORE-PRE-BACKUP"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPLAY", "EP-REPO", "EP-ENGINE-OBS"], modes=CUR_REOPEN,
  closure=("CR-PASS-ALL", "CR-OBSERVE"), sources=["lab/TARGETS.md section 7 items 5 and 6", "RULINGS Q24"], notes=ER_NOTE, params={"provisional": True})

# ---------------- composition identity (TARGETS 4.1, RULINGS Q28)
O("G8.composition.watermark-routing", ["G8"], "Reads are served only by an index eligible for their basis",
  "Per COMPOSITION eligibility (RULINGS Q31d): an index serves basis B only when its watermark, a fully resolved prefix, has reached B in B's epoch (CO-EPOCH-MISMATCH), C1's conditions hold, it can reconstruct B (a current-only index only inside the validity interval of every attribute read, CO-RECONSTRUCT-OUTSIDE-VALIDITY) and it has applied every published erasure (CO-ERASURE-FRONTIER); a read with no eligible index waits at most T-WATERMARK-WAIT-MS (CO-WATERMARK-WAIT) and then routes to an eligible fallback (CO-WATERMARK-FALLBACK) whose latency counts in the read's own latency (CO-FALLBACK-LATENCY-COUNTS); the receipt records the route and the surface language, a cross-language fallback is counted per surface (CO-FALLBACK-LANGUAGE), and fallbacks are reported as a share of reads per window (CO-FALLBACK-SHARE, OBS-WATERMARK); no index answers for a basis it is not eligible for (CO-NO-STALE-ANSWER); history and analytics trail asynchronously behind their watermarks (CO-ASYNC-HISTORY).",
  cases=["CS-COMPOSITION:watermark", "CS-COMPOSITION:CO-WATERMARK-WAIT,CO-WATERMARK-FALLBACK,CO-NO-STALE-ANSWER,CO-ASYNC-HISTORY,CO-EPOCH-MISMATCH,CO-RECONSTRUCT-OUTSIDE-VALIDITY,CO-ERASURE-FRONTIER,CO-FALLBACK-LATENCY-COUNTS,CO-FALLBACK-LANGUAGE,CO-FALLBACK-SHARE"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-FEED", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  thresholds=["T-WATERMARK-WAIT-MS"], mutants=["M-STALE-INDEX-ANSWER"], closure=("CR-PASS-ALL", "CR-OBSERVE", "CR-MUTANT-KILL"), sources=["lab/TARGETS.md section 4.1 items 3 to 5", "RULINGS Q28", "RULINGS Q31d"])
O("G7.composition.ack-and-routed-ryow", ["G7"], "ACK after source publication; read-your-own-write by routing",
  "Per COMPOSITION ackOwnership (RULINGS Q31e, replacing Q28's ACK clause): the source of truth sends every ACK after its own publication (CO-ACK-AFTER-SOURCE-PUBLICATION, OBS-ACK-ORDER); the pull at the returned position is served by an index eligible for it, else by the fallback, so read-your-own-write is exact (CO-RYOW-ROUTED); during a current-index outage commits and ACKs continue and pulls fall back (CO-OUTAGE-ACKS-CONTINUE), and the index catches up from the feed through a bounded queue (CO-CATCHUP-BOUNDED-QUEUE). Per COMPOSITION fallbackEquivalence (RULINGS Q34b) and readGuarantees (RULINGS Q55c, provisional, flagged for Sam; supersedes Q50b), each serving surface the composition claims in the lane's language is tested against its own guarantee (CO-RYOW-PER-SURFACE): repository pulls read their own write by routing and fall back to the source with the replica down (CO-REPO-REPLICA-DOWN-FALLBACK); native answers report their basis (CO-NATIVE-REPORTS-BASIS), are never below a basis token (CO-NATIVE-BASIS-TOKEN-WAIT) or fail with E-BASIS-NOT-AVAILABLE after the request deadline (CO-NATIVE-BASIS-NOT-AVAILABLE), answer at the replica's watermark without a token (CO-NATIVE-NO-TOKEN-WATERMARK) and fail with E-REPLICA-UNAVAILABLE with the replica down (CO-NATIVE-REPLICA-UNAVAILABLE); no surface presents an answer as at a basis it was not computed at (CO-NO-FALSE-BASIS). Per COMPOSITION readGuarantees native (RULINGS Q58a, provisional, flagged for Sam; supersedes Q55c's native half): native queries go only through the Triplex facade (CO-FACADE-ONLY); an after: token waits for the replica marker within the deadline, then fails with E-BASIS-NOT-AVAILABLE {required, observed, replica} (CO-NATIVE-AFTER-TOKEN); an at: token is exact (CO-NATIVE-AT-EXACT) or fails with E-BASIS-NOT-RECONSTRUCTIBLE (CO-NATIVE-AT-NOT-RECONSTRUCTIBLE); a session sends its high-water mark as an implicit after (CO-SESSION-HIGH-WATER); every answer carries {basis: {low, high}, route} (CO-ANSWER-BASIS-RANGE-ROUTE); the default deadline is 2 s (CO-NATIVE-DEFAULT-DEADLINE). Per V-P2Q (RULINGS Q62a): Datalog and executor reads inside a transaction wait for the replica to reach the transaction's source position or fail typed (CO-EXECUTOR-IN-TX-WAITS-OR-TYPED), and executor reads are scope-wide in the compare-and-set read set (CO-EXECUTOR-READS-IN-CAS-SET); after a replica regression the real marker is read with the answer and nothing is answered below the basis (CO-REPLICA-REGRESSION-REAL-MARKER); a pull beyond the resolved prefix waits or fails with E-BASIS-NOT-AVAILABLE, on A0 too (CO-PULL-BEYOND-PREFIX-TYPED); during an outage pulls and retraction-target reads fall back to the log or fail with E-REPLICA-UNAVAILABLE (CO-OUTAGE-PULL-FALLBACK, CO-OUTAGE-RETRACTION-TARGET-FALLBACK). Per RULINGS Q67c: single-request surfaces read the replica marker in the same request as the answer, and multi-request surfaces (Datalog, executor) use replica incarnation fencing, accepting an answer only if (incarnation, marker) is equal before and after, the reset-during-query interleaving being an independently authored case (CO-RESET-DURING-QUERY); per RULINGS Q67h every such error has one representation, _tag BasisNotAvailable or ReplicaUnavailable with {required, observed, replica} and an optional cause (CO-TYPED-ERROR-SHAPE); both cases' manifests stay null until the design is built; a stale fallback is rejected (CO-STALE-FALLBACK-REJECTED); a cross-language fallback recipe is bound to the same semantic query identity (parameters, basis, meaning) and the same oracle answer (CO-CROSS-LANGUAGE-RECIPE-IDENTITY), with total request latency and language attribution recorded.",
  cases=["CS-COMPOSITION:ack,surfaces", "CS-COMPOSITION:CO-ACK-AFTER-SOURCE-PUBLICATION,CO-RYOW-ROUTED,CO-OUTAGE-ACKS-CONTINUE,CO-CATCHUP-BOUNDED-QUEUE,CO-RYOW-PER-SURFACE,CO-STALE-FALLBACK-REJECTED,CO-CROSS-LANGUAGE-RECIPE-IDENTITY," + ",".join(READ_GUARANTEE_CASES + NATIVE_TOKEN_CASES + P2Q_READ_CASES + Q67_CASES)], oracle=["O-REPLAY", "O-OBS", "O-ERR"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-FEED", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  mutants=["M-ACK-BEFORE-PUBLICATION", "M-RYOW-STALE-ROUTE"], closure=("CR-PASS-ALL", "CR-OBSERVE", "CR-MUTANT-KILL"), sources=["lab/TARGETS.md section 4.1 item 6", "RULINGS Q31e"])

# ---------------- position coordinates (TARGETS 4.1 item 3, RULINGS Q31c)
O("G7.position.coordinates", ["G7", "G9"], "Positions are totally ordered coordinates with a fully resolved watermark",
  "Per POSITION: a position is (stream, epoch, offset, ordinal), ordered lexicographically and not necessarily dense (PO-LEXICOGRAPHIC-ORDER); several Triplex transacts in one engine transaction take consecutive ordinals at one offset, assigned atomically with their assertions and the subject compare-and-set (PO-NESTED-CUTS-DENSE); a watermark is a fully resolved prefix and every aborted offset is listed in the feed's resolution stream (PO-ABORTED-LISTED); O-REPLAY sorts by coordinate and assigns its own dense ordinals for cuts (PO-ORACLE-DENSE-ORDINALS). Every composition, A0 included, passes the four falsifiers FX-NESTED-CUTS, FX-ABORT-GAP, FX-CRASH-APPEND-RESOLUTION and FX-RESUME-AT-ABORT-GAP before any comparative or promotion claim (GATE-POSITION, RULINGS Q38a); a dense allocator passes them cheaply, and no allowlist exempts it (OUTSIDE_BLOCK_MUTATION_FIXTURE, mutant M-WITHTRANSACTION-REBIND).",
  scope="engine", cases=["CS-POSITION:" + ",".join(POSITION_REQUIRED_CASES)], oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-TRIPLES", "EP-FEED", "EP-REPLAY"], profiles=["P-FAULT"], modes=CRR,
  mutants=["M-WITHTRANSACTION-REBIND"], closure=("CR-PASS-ALL", "CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], sources=["lab/TARGETS.md section 4.1 item 3", "RULINGS Q31c", "RULINGS Q38a", "lab/reviews/plan-v2-round4.codex.md finding 1"])
O("G7.position.bound-after-publication", ["G7"], "Positions are bound after publication as opaque, totally ordered values",
  "Per POSITION binding (RULINGS Q51c), on both lanes: a transaction's position is bound only after the source of truth publishes it (PO-BOUND-AFTER-PUBLICATION); no adapter returns a placeholder position (PO-NO-PLACEHOLDER); one engine transaction holds more than 8 Triplex transacts with every ordinal distinct (PO-NO-ORDINAL-LIMIT); positions compare as opaque values in the (stream, epoch, offset, ordinal) order (PO-OPAQUE-TOTAL-ORDER).",
  scope="engine", cases=["CS-POSITION:binding", "CS-POSITION:" + ",".join(POSITION_BINDING_CASES)], oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-TRIPLES", "EP-FEED"], modes=CRR,
  sources=["RULINGS Q51c", "EXP-P2X (XTDB commit path and feed)"])


# ---------------- W0 coverage floors and review gate (TARGETS 6.1 items 6 and 7, RULINGS Q31i)
O("W0.coverage-floors", ["GS", "NS"], "W0 is reviewed, pinned and meets its frozen coverage floors",
  "V-D01 has independently reviewed W0's SPEC.md, releases and golden cases and every W0_PIN hash is pinned in this contract (W0-COV-REVIEW-PINNED; a null pin fails closed, GATE-W0); over the frozen trace at the 100k rung O-DOMAIN finds that R2 changes the outputs of at least W0-R2-CHANGED-SHARE of in-scope subjects (W0-COV-R2-CHANGED), every rule fires for at least W0-RULE-FIRE-SHARE of subjects (W0-COV-RULE-FIRES), worker-to-location fanout follows Zipf s = W0-LOCATION-ZIPF-S over W0-LOCATIONS-100K locations (W0-COV-LOCATION-FANOUT), and at least W0-MULTI-WORK-ITEM-SHARE of evaluations produce three or more work items (W0-COV-MULTI-WORK-ITEMS); world sizes follow P4's buckets through ballast (W0-COV-BALLAST-BUCKETS), the wage floor is two hops deep (W0-COV-TWO-HOP), R3 reaches its subjects through the reverse two-hop index with affected and changed subjects stated separately (W0-COV-R3-SCOPED), and O-DOMAIN reproduces the population fingerprint (W0-COV-FINGERPRINT) (RULINGS Q40, Q44).",
  scope="engine", cases=["CS-W0-COVERAGE", "CS-W0-COVERAGE:" + ",".join(CS["CS-W0-COVERAGE"]["requiredCases"])], oracle=["O-DOMAIN"], ep=["EP-KERNEL"], profiles=["P-RUNGS"], closure=("CR-W0-COVERAGE",),
  thresholds=["W0-R2-CHANGED-SHARE", "W0-RULE-FIRE-SHARE", "W0-LOCATIONS-100K", "W0-LOCATION-ZIPF-S", "W0-MULTI-WORK-ITEM-SHARE"], sources=["lab/TARGETS.md section 6.1 items 6 and 7", "RULINGS Q31i"])
O("G9.erasure.commit-semantics", ["G9", "G7"], "An erasure commit is an ordinary, idempotent journal transaction",
  "Per ERASURE journalCommit and idempotence (RULINGS Q49a, Q49b): an erasure commit has a position, a txId, a record in transactions() and its own :_tx/ facts, and its changes list only identities (entity, attribute, assertion ids), never values (ER-COMMIT-JOURNAL-IDENTITY-ONLY); it is also written to the erasure ledger kept apart from the data, which restore and rebuild replay (ER-COMMIT-LEDGER); earlier transactions' :_tx/change facts for erased values show the ErasedValue marker (ER-EARLIER-CHANGE-MARKER); the first erasure of an identity sets erasedAt and erasing it again changes nothing (ER-IDEMPOTENT-REERASE); an erase that matches nothing (a well-formed selector with no assertions to erase) still commits a journal record with an empty change list (ER-EMPTY-ERASURE-RECORD); an erase naming an unknown target or id is E-INVALID-VALUE (ER-ERASE-UNKNOWN-TARGET, RULINGS Q56a); erase accepts retract's selectors, {id: ...} included (ER-ERASE-BY-ID, Q56f); retracting an already erased assertion commits and history shows the marker with the retraction's time (ER-RETRACT-AFTER-ERASE, Q56g); all values are synthetic (ERASURE syntheticData, Q56h).",
  scope="engine", cases=["CS-ERASURE:commit", "CS-ERASURE:" + ",".join(ERASURE_COMMIT_CASES + ERASURE_Q56_COMMIT_CASES)], oracle=["O-REPLAY", "O-ERR"], ep=["EP-WRITER", "EP-TRIPLES", "EP-REPLAY"], modes=CRR,
  sources=["lab/TARGETS.md section 7 items 1 and 5", "RULINGS Q24", "RULINGS Q49a, Q49b"], notes=ER_NOTE, params={"provisional": True})
O("G9.erasure.query-semantics", ["G9", "G5"], "Erased values give deterministic query answers",
  "Per ERASURE queries (RULINGS Q49c, provisional under the Q24 flag for Sam), on the repository, the native surface in the lane language and the raw recipes: an erased value is present with no readable value; it matches no value predicate (equality, inequality, range, pattern), so a filter never selects or rejects a subject by it (ER-PREDICATE-NO-MATCH); SUM, AVG, MIN and MAX skip it while COUNT of assertions counts it (ER-AGGREGATE-SKIP-COUNT); ORDER BY places erased markers last, in a deterministic order by assertion id (ER-ORDER-MARKERS-LAST); grouping puts all erased values of an attribute in one group keyed by the marker (ER-GROUP-ONE-MARKER); Unique ignores erased values (ER-UNIQUE-IGNORES); an erased reference cannot be followed and an include returns the marker (ER-REFERENCE-MARKER). Per ERASURE presence (RULINGS Q56b to Q56e): a card-one attribute with a readable and an erased value conflicts with E-CONFLICTING-VALUES (ER-CARD-ONE-READABLE-AND-ERASED), also when the readable value equals what the erased support held (ER-EQUAL-SUPPORT-ERASED-CONFLICTS); card-many markers follow the readable elements by assertion id (ER-CARD-MANY-MARKERS-LAST); Required is satisfied by an erased value (ER-REQUIRED-SATISFIED).",
  cases=["CS-ERASURE:queries", "CS-ERASURE:" + ",".join(ERASURE_QUERY_CASES + ERASURE_Q56_QUERY_CASES)], oracle=["O-REPLAY", "O-ERR"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  sources=["lab/TARGETS.md section 7", "RULINGS Q24", "RULINGS Q49c"], notes=ER_NOTE, params={"provisional": True})

O("G9.erasure.residual-shapes", ["G9", "G1"], "The Q52 shapes the pinned oracle does not model yet",
  "Per ERASURE queriesResidual, inFlight and commandShape (RULINGS Q52, provisional under the Q24 flag for Sam): a count of distinct values counts an attribute's erased values as one value (ER-COUNT-DISTINCT-MARKER, Q52a); ORDER BY puts readable values, then erased markers by assertion id, then missing values, in both directions (ER-ORDER-ERASED-THEN-MISSING, Q52b); a marker group reports the earliest erasedAt (ER-GROUP-EARLIEST-ERASEDAT, Q52c); an erased reference takes no part in reference constraints (ER-REFERENCE-CONSTRAINT-SKIPPED, Q52d); a read in flight across a commit erasing several values sees all old values or all markers, never a mix (ER-INFLIGHT-ALL-OR-NONE, Q52e); toDecimal(json, p, s, rounding) applies the named mode to the as-written reading and, without a rounding argument, excess digits are E-DECIMAL-FRACTION (DR-JSON-CONVERT-ROUNDING, Q52f); erasure is not an op and an erase mixed with other operations or given preconditions is a typed invalid-command error (ER-ERASE-COMMAND-SHAPE, Q52g); a read that started before n in-flight erasure commits sees one of the n + 1 prefixes (ER-INFLIGHT-PREFIXES, Q66a); a continuation cursor keeps its page's erasure prefix (ER-CURSOR-ERASURE-PREFIX, Q66b). O-REPLAY 0.4.1 refuses these shapes (ORACLE_REFUSALS q52-shapes), so this obligation stays blocked until 0.4.2 is accepted.",
  cases=["CS-ERASURE:residual", "CS-ERASURE:" + ",".join(ERASURE_RESIDUAL_CASES + ERASURE_Q66_CASES), "CS-DECIMAL-ROUTING:DR-JSON-CONVERT-ROUNDING"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  sources=["lab/TARGETS.md section 7", "RULINGS Q24", "RULINGS Q52", "lab/verify/O02/VERIFY.md V-O04b"], notes=ER_NOTE, params={"provisional": True})


# ---------------- erasure reproduction modulo erasure (RULINGS Q31f)
O("G9.erasure.reproduction-modulo", ["G9", "G7", "R"], "Every reproduction contract holds modulo erasure",
  "Per ERASURE reproduction (RULINGS Q31f): the C6 whole-journal comparison, where the erasure commit's identity-only changes and the markers in earlier :_tx/change facts appear on both sides (ER-JOURNAL-MODULO, RULINGS Q49a), raw and native query results (ER-RAW-NATIVE-MODULO), SDK results (ER-SDK-MODULO), cursors (ER-CURSOR-MODULO) and explain (ER-EXPLAIN-MODULO) compare equal after both sides replace erased values with their ErasedValue markers, and only then.",
  cases=["CS-ERASURE:reproduction", "CS-ERASURE:ER-JOURNAL-MODULO,ER-RAW-NATIVE-MODULO,ER-SDK-MODULO,ER-CURSOR-MODULO,ER-EXPLAIN-MODULO"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH", "EP-RAW-WIRE", "EP-PKG"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  sources=["lab/TARGETS.md section 7 item 8", "RULINGS Q31f"], notes=ER_NOTE, params={"provisional": True})
O("G10.composition.identity-bound", ["G10", "R"], "Receipts bind the whole composition",
  "Every receipt binds the four assignments (source, current, history, analytics) with image digest, configuration hash and slot each, every replication edge (feed consumer source hash, translation generation) and the serving index's watermark at every read (CO-RECEIPT-BINDS-ALL, VA14); engine-scope keys derive from the assignment of the obligation's layer, never from engineOfLane (CO-SCOPE-KEY-FROM-ASSIGNMENT).",
  scope="engine", cases=["CS-COMPOSITION:identity", "CS-COMPOSITION:CO-RECEIPT-BINDS-ALL,CO-SCOPE-KEY-FROM-ASSIGNMENT"], oracle=["O-CONTRACT"], ep=["EP-EVALUATOR"], profiles=["P-STATIC"],
  sources=["lab/TARGETS.md section 4.1 items 1 and 2", "RULINGS Q28"])

# ---------------- evaluator counterexamples (RULINGS Q26)
O("R.evaluator.incomplete-receipts", ["R"], "Incomplete receipts cannot close an obligation",
  "The evaluator ships every EVALUATOR_COUNTEREXAMPLES receipt set and judges each OPEN, and every EVALUATOR_POSITIVE_FIXTURES receipt set and judges each CLOSED (O-CONTRACT); both catalogs cover every closure rule any obligation uses, so an evaluator that always answers OPEN, or always CLOSED, fails (RULINGS Q26, Q31k).",
  scope="engine", cases=["CS-EVAL-COUNTER", "CS-EVAL-COUNTER:" + ",".join([x["id"] for x in EVALUATOR_COUNTEREXAMPLES] + [x["id"] for x in EVALUATOR_POSITIVE_FIXTURES])], oracle=["O-CONTRACT"], ep=["EP-EVALUATOR"], profiles=["P-STATIC"], sources=["RULINGS Q26", "lab/reviews/plan-v2-review.codex.md finding 14"])

# ---------------- S: year-one measurement population, rungs and budgets
O("S.population.year-one", ["S"], "The year-one measurement population exists and is counted",
  "At P-YEAR-ONE one deployment holds the SCALE_POPULATION year-one population (10m entities, 100m active domain facts, at least 150M retained facts, tenants and strata as specified) written through public writes; every stratum and separate count matches independent count queries (OBS-SCALE-COUNT) and O-REPLAY analytic counts. This is the size the priorities are measured at, not a target in itself.",
  scope="engine", cases=["CS-SCALE-SAMPLE:counts,strata"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-WRITER", "EP-BULK", "EP-TRIPLES", "EP-NATIVE"], profiles=["P-YEAR-ONE"],
  closure=("CR-SCALE",), sources=["lab/TARGETS.md section 2", "lab/SCOPE.md section 2 item 2"])
O("S.rungs.ladder", ["S"], "Each rung passes before the next opens",
  "Rungs 10k, 100k, 1m and 10m subjects are admitted in order; each passes S.correctness.query-families at its own rung before the next is admitted.",
  cases=["CS-SCALE-SAMPLE:per-rung"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-RUNGS"], closure=("CR-SCALE",), sources=["lab/TARGETS.md section 2"])
O("S.correctness.query-families", ["S"], "Query families correct at every rung",
  "At every rung of P-RUNGS the query families (point, selective filter, join, anti-join, recursion, aggregate, historical, interval, pagination, subject pull) run on at least T-SAMPLES-PER-FAMILY samples with at least T-SAMPLES-PER-STRATUM in every applicable stratum plus complete-count queries, on the repository and in the lane language, all equal to O-REPLAY.",
  cases=["CS-SCALE-SAMPLE:families"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-RUNGS"], closure=("CR-SCALE",),
  thresholds=["T-SAMPLES-PER-FAMILY", "T-SAMPLES-PER-STRATUM"], params={"perRung": True}, sources=["SCALE_POPULATION", "lab/reviews/acceptance-review-r1.codex.md finding 13"])
O("S.capacity.admitted", ["S"], "Runs fit the admitted envelope",
  "Every rung is admitted with a peak forecast (rebuild overlap, delta growth, pre-GC growth, WAL, log, checkpoints, backups, replay, host clients); observed peaks stay within it (OBS-RESOURCE); an over-budget rung is BLOCKED_CAPACITY and stays open.",
  scope="engine", cases=["CS-SCALE-SAMPLE:capacity"], oracle=["O-OBS"], ep=["EP-ENGINE-OBS"], profiles=["P-RUNGS"], closure=("CR-SCALE",), sources=["qualification/benchmark-contract.json capacityRule", "lab/PLAN.md section 8"])
O("S.metrics.reported", ["S"], "Size and cost metrics are measured and reported separately",
  "At every rung: bytes per entity and fact, write amplification per component (BUDGET_COMPONENTS), history separately, ingest rate, rebuild or compaction time, restart time, peak RSS per owner, peak disk.",
  cases=["CS-SCALE-SAMPLE:metrics"], oracle=["O-OBS"], ep=["EP-ENGINE-OBS", "EP-REPO", "EP-NATIVE"], profiles=["P-RUNGS"], closure=("CR-METRICS",), sources=["lab/PLAN.md section 1 item 5"])
O("S.maintenance.correct-during", ["S", "G8"], "Maintenance at year one keeps reads correct",
  "Compaction, index rebuild and projection maintenance at P-YEAR-ONE complete; reads during and after equal O-REPLAY.",
  scope="engine", cases=["CS-SCALE-SAMPLE:maintenance"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-YEAR-ONE"], closure=("CR-SCALE",), sources=["qualification/benchmark-contract.json separatePhases"])
O("S.restart.at-scale", ["S", "G7"], "Restart at year one",
  "An engine restart at P-YEAR-ONE becomes available within the recorded time and every sampled old cut re-reads identically.",
  scope="engine", cases=["CS-SCALE-SAMPLE:restart"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-YEAR-ONE"], closure=("CR-SCALE", "CR-METRICS"), sources=["qualification/benchmark-contract.json separatePhases"])
O("S.budgets.cumulative", ["S", "G8"], "The integrated candidate stays inside frozen budgets",
  "At every rung the integrated candidate's complete-path cost (BUDGET_COMPONENTS, including log, broker and verification) and its NS measurements stay inside budgets.json, which is frozen before candidates, compared cumulatively against the frozen A0 control at the same rung.",
  cases=["CS-BUDGET"], oracle=["O-OBS"], ep=["EP-ENGINE-OBS", "EP-REPO", "EP-WRITER"], profiles=["P-RUNGS"], closure=("CR-BUDGET",),
  sources=["lab/PLAN.md section 7.4", "lab/PLAN.md section 1 item 5", "lab/reviews/acceptance-review-r1.codex.md finding 14"])

# RULINGS Q33: every Q33 rule is a named case of the set that owns it, selected by the owning obligation.
Q33_PLACEMENT = {"CS-WIRE": "G1.wire.write-guards", "CS-DECIMAL": "G1.types.decimal", "CS-RANGE-OUT": "G1.types.out-of-range-rejected", "CS-JOURNAL": "G7.journal.logical-contract", "CS-CURSOR": "G10.cursor.stable", "CS-ERRORS": "G2.errors.typed-taxonomy"}


def q33_set(case):
    if case.startswith("DEC-"):
        return "CS-DECIMAL"
    if case.startswith("RANGE-OUT-"):
        return "CS-RANGE-OUT"
    if case == "Q33-JSON-READBACK":
        return "CS-WIRE"
    if case in ("Q33-JNL-ENVELOPE", "Q33-JNL-NOT-MODELED"):
        return "CS-JOURNAL"
    if case in ("Q33-JNL-LIMIT", "Q33-PAGE-LIMIT", "Q33-PAGE-OTHER-BASIS"):
        return "CS-CURSOR"
    return "CS-ERRORS"


_obl = {o["id"]: o for o in OBL}
for r in Q33_RULES + Q43_RULES:
    cid = q33_set(r["case"])
    if r["case"] not in CS[cid]["requiredCases"]:
        CS[cid]["requiredCases"].append(r["case"])
    o = _obl[Q33_PLACEMENT[cid]]
    if not any(c["set"] == cid and r["case"] in c["select"] for c in o["cases"]):
        o["cases"].append({"set": cid, "select": [r["case"]]})
_obl["G2.errors.typed-taxonomy"]["oracles"] = sorted(set(_obl["G2.errors.typed-taxonomy"]["oracles"]) | {"O-REPLAY"})

# RULINGS Q31c, Q31i: gates. A gated obligation stays OPEN until every gate it lists holds.
for o in OBL:
    g = []
    if o["id"].startswith(("NS.", "GS.")) and o["id"] != "NS.calibration":
        g.append("GATE-POSITION")
    if "O-DOMAIN" in o["oracles"] and o["id"] != "W0.coverage-floors":
        g.append("GATE-W0")
    if o["id"] == "G1.decimal.tdk1-differential":
        g.append("GATE-TDK1-VECTORS")
    if set(o["oracles"]) & set(ORACLE_PINS):
        g.append("GATE-ORACLE-PIN")
    o["closure"]["params"]["gates"] = g

# RULINGS Q39b: engine-scope obligations on XTDB that touch a native or raw surface are keyed by native language.
for o in OBL:
    if o["receiptScope"] == "engine" and set(X) <= set(o["lanes"]) and set(o["entrypoints"]) & {"EP-NATIVE", "EP-RAW-HATCH", "EP-RAW-WIRE"}:
        o["closure"]["params"]["keyByNativeLanguage"] = True

# RULINGS Q26: the calibration requirement is every threshold an NS obligation names.
NS_CAL_REQUIRED = sorted({t for o in OBL if o["id"].startswith("NS.") and o["id"] != "NS.calibration" for t in o["thresholds"]})
for o in OBL:
    if o["id"] == "NS.calibration":
        o["closure"]["params"]["requiredThresholds"] = NS_CAL_REQUIRED

# RULINGS Q28: every engine-scope obligation names the composition layer its scope key derives from.
LAYER_OVERRIDES = {"NS.P2": "source", "NS.P3": "source", "G8.composition.watermark-routing": "current", "W0.coverage-floors": "source", "S.maintenance.correct-during": "current",
                   "REQ.snapshot-reads": "history", "REQ.read-your-write": "current", "REQ.retro-corrections": "current", "REQ.pii-erasure": "source", "REQ.tenant-isolation": "source"}
for o in OBL:
    o["layer"] = (LAYER_OVERRIDES.get(o["id"]) or LAYER_BY_GOAL[o["goals"][0]]) if o["receiptScope"] == "engine" else None
    if o["id"].startswith("NS.") and o["closure"]["modes"] == ["single-execution"]:
        o["closure"]["modes"] = list(NS_MODES)

# ============================================================================ C1-C8 traceability
TRACE = []


def tr(contract, case, cset, observation, obligation):
    TRACE.append({"contract": contract, "case": case, "set": cset, "observation": observation, "obligation": obligation})


for c, obs in [("C1-SCOPE-OWNER", "mismatched ownership refuses before projection storage"), ("C1-MAPPING-GEN", "projection at release N-1, reader requires N: route exact"),
               ("C1-EXPLICIT-R", "explicit R: route exact"), ("C1-DECREASING-R", "explicit R from a runtime with a lagging clock: route exact, answer by R independent of P"),
               ("C1-INTERIOR-P", "interior position of a nested transaction: route exact"), ("C1-V-OUTSIDE-MARKER", "QLever V outside [validInstant, nextBoundary): route exact"),
               ("C1-PARTIAL-FILTER-ORDER", "partial entity removed by an early filter on a but relevant to ORDER BY b: whole query exact"),
               ("C1-PARTIAL-NEG", "partial entity relevant only through negation: whole query exact"), ("C1-PARTIAL-AGG", "partial entity relevant only through an aggregate: whole query exact"),
               ("C1-CONFLICT-REF", "referenced conflicted attribute: E-CONFLICTING-VALUES"), ("C1-UNREFERENCED-PARTIAL", "partial attribute not referenced: projection allowed, answer exact")]:
    tr("C1", c, "CS-ELIGIBILITY", obs, "G8.eligibility.c1-routing")
for c, obs in [("C2-PRE-FSYNC-CRASH", "no QT2 evidence: absent, never success"), ("C2-FSYNC-THEN-CRASH-RETRY", "crash after COMMIT fsync before apply, retry: CommitPending or Repairing, then original success after publication"),
               ("C2-APPLY-CRASH", "crash during apply: fence, recovery publishes, access paths agree"), ("C2-PUBLISH-THEN-CRASH", "crash after publication before verification"),
               ("C2-VERIFY-FAIL-FENCE", "verification mismatch fences the lane"), ("C2-LOST-ACK", "lost ACK: retry returns the original receipt"),
               ("C2-GROUP-COMPETING-PRECONDITIONS", "two members with competing preconditions in one group: the later fails alone"), ("C2-GROUP-DUPLICATE-COMMAND", "duplicate command inside one group commits once"),
               ("C2-GROUP-FAILED-CHILD", "a failed nested child does not affect siblings"), ("C2-REPLAY-CHECKPOINT", "rebuild from checkpoint plus log suffix equals O-REPLAY"),
               ("C2-REBUILD-GENERATION-CRASH", "crash during generation switch keeps the old or new verified generation"), ("C2-NO-SELF-CANCEL", "broker never cancels or times out its own update (observed)")]:
    tr("C2", c, "CS-FAULT", obs, "G7.commit.protocol-transitions")
for c, obs in [("C3-STALE-EPOCH-RESUME", "old broker resumes after replacement: its mutation refused, engine unchanged"), ("C3-NO-TOKEN-UPDATE", "update without token refused by the engine"),
               ("C3-UNAUTHORIZED-ROUTE", "native read or raw hatch attempting UPDATE refused"), ("C3-FENCED-ADMIN", "rebuild, checkpoint, admin while fenced refused"),
               ("C3-FENCED-WRITE", "commit while fenced: E-REPAIRING"), ("C3-EPOCH-CLOSE", "new broker resolves the previous epoch's last group before mutating")]:
    tr("C3", c, "CS-BROKER", obs, "G7.broker.fence-and-epochs")
for c, obs in [("C4-BOUNDED-OP", "every update operation within the size bound"), ("C4-ENTER-MAINTAINING", "large boundary sets MAINTAINING"),
               ("C4-PENDING-CHUNK-WRITE", "write to an entity in a pending chunk is projected at the target instant and not overwritten"),
               ("C4-CRASH-RESUME", "crash mid-maintenance resumes from durable progress"), ("C4-HATCH-MAINTAINING", "qualified hatch: E-MAINTAINING or exact results"),
               ("C4-REPO-MAINTAINING", "repository routes exact during MAINTAINING"), ("C4-SAME-EXPIRY", "two facts with one expiry, one deleted, read correctly"),
               ("C4-BACKPRESSURE", "delta forecast slows commit-group admission"), ("C4-DIRECT-INSPECTION", "direct SPARQL reads the marker; marked unqualified")]:
    tr("C4", c, "CS-MAINT", obs, "G8.maintenance.bounded-boundaries")
for c in CS["CS-CONFLICT"]["requiredCases"]:
    tr("C5", c, "CS-CONFLICT", "per C5 clause named by the case", "G4.neg.conflict-semantics")
for c in CS["CS-JOURNAL"]["requiredCases"]:
    tr("C6", c, "CS-JOURNAL", "direct audit beyond unchanged44", "G7.journal.logical-contract")
for c in ["C7-OWNER-MISMATCH", "C7-OWNER-RECORD-INIT", "C7-DOMAIN-ONLY-CURRENT", "C7-NO-STAGING-DOMAIN", "C7-XTDB-TABLE-NAMES"]:
    tr("C7", c, "CS-SCOPE", "production ownership and raw dataset", "G10.scope.ownership-refusal")
tr("C7", "C7-SHARED-COLLISION", "CS-SCOPE", "shared-engine collision, distinct from ownership refusal", "G10.scope.shared-collision")
for c in CS["CS-RECURSION-TOPO"]["requiredCases"]:
    tr("C8", c, "CS-RECURSION-TOPO", "native recursion read-only frontier", "G3.recursion.read-only-frontier")

# ============================================================================ evidence model
RECEIPT_SCHEMA = {
    "format": "triplex-db-2/receipt/2",
    "fields": {
        "receiptId": "string, unique",
        "slotRegime": "{cpuMax, cpuset, cpuWeight}: the effective cgroup values of every measurement slot (RULINGS Q60c)",
        "rounds": "for paired-rounds: {design: duet | abba, count, aaRounds, looks, window GREEN | unjudged} (RULINGS Q60a, Q60e)",
        "runKind": "acceptance | calibration | mutation | verifier | diagnostic",
        "contract": "{version, transitiveSha256}",
        "obligations": "[{id, definitionSha256}]",
        "lane": "lane id for lane-scope receipts; for engine-scope receipts the scope key (layer, engine, imageDigest, configSha256, slot) derived from the composition assignment of the obligation's layer (COMPOSITION scopeKey)",
        "composition": "{source, current, history, analytics}: each {engine: xtdb | qlever, imageDigest, configSha256, slot} (RULINGS Q28); source also {variant: engine-source | log-source} and, for log-source, log {implementationSha256, fsyncMode, fullFsync, device} (RULINGS Q55b); no density field carries authority (RULINGS Q38a)",
        "nativeLanguage": "for XTDB receipts, TRIPLEX_XTDB_NATIVE_LANGUAGE (xtql or xtdb-sql) as executed; XTQL and SQL results never share an obligation closure (RULINGS Q39b)",
        "replicationEdges": "[{from, to, consumerSourceSha256, translationGeneration}] for every edge of the composition",
        "watermarks": "per read: {readId, basisPosition, servingIndex, watermarkAtRead, waitMs, route, surface, recipeLanguage, semanticQueryId (parameters, basis, meaning), totalLatencyMs} (RULINGS Q31d, Q34b)",
        "trace": "{generatorSourceSha256, seed, backgroundCommands, overlayCommands} (TARGETS 2.1 freeze; background and scenario overlay accounted separately)",
        "cpuQuota": "{engineCores, hostBrokerCpu, kernelCpu} (TARGETS 1.1 P4 item 3)",
        "profileIdentity": "{sourceTreeSha256 (including uncommitted and untracked executed inputs), buildManifestSha256, importedDist [{path, sha256}], lockfileSha256, node, pnpm, composition (per-assignment image digests, configuration hashes and slots), resourceCaps, enabledCapabilities [], fixtureSha256, gateScriptSha256, oracleFiles [{id, sha256}], caseManifests [{set, sha256}], projectionSpecVersion, logFormatVersion}",
        "endpoint": "{contacted, expected}",
        "admission": "{reservationId, forecast, observedPeaks}",
        "coRunners": "[container ids]",
        "timing": "{start, end}",
        "counts": "{declared, executed, skipped, unsupported, notImplemented, unexpectedErrors}",
        "evidence": "[evidence objects, each with kind and objectSha256 of its retained bytes under runs/objects]",
        "firstFailures": "[evidence refs]",
        "producer": "{tool: lab/bin/<gate>.mjs, agentRole, agentId, authorsOfCodeUnderTest []}",
        "calibrationRefs": "[receiptId] of VC records whose values this receipt uses",
        "applicability": "null, or an AP record (intermediate tracking only; never valid for final acceptance)",
    },
}
EVIDENCE_KINDS = {
    "case-result": "{caseSet, caseId, assertionIds [], mode, entrypoint, languageTrace [{substep, language, basis}], hostSteps [{kind: HS-NORMALIZE|HS-FRONTIER, op}], rawResultObject, returnedBasis, oracleId, comparator}",
    "observation": "{protocol: OBS-*, subjectIds {requestId, connectionId, queryId}, samplesObject, eventsObject, coverage {from, to, maxGapMs}}",
    "fault-witness": "{faultPointId, injectedAt, transitionEvents [{transition, t, durableEvidenceObject}], lastWitnessedTransition, callerOutcome, retries [{t, response}], postRecoveryCaseResults []}",
    "plan-record": "{queryId, route, eligibilityInputs, enginePlanObject, accessPathClass, estimate, actual {rows, ms, bytes}}",
    "ns-run": "{measurement: P1|P2|P3|P4|P5|secondary|GS-nn, lane or scope key, composition, trace {generatorSourceSha256, seed}, ladderLevel, rawEventsObject (every read with the driver-recorded requested basis, the engine-echoed basis, the serving index and its watermark, and the result hash; every command with scheduled offer time, published ACK time, size band, receipt or typed error or typed conflict, and visibility; every feed entry with commit time, cursor and consumer durable-record time; every consumer effect with its key and replay flag), windows [{from, to, burstPhase}], baselines {zeroReader (same trace segment and burst phase), noSweep, noBulk}, maintenanceEvents [], engineWaitEvidence, connectionSamplesObject, cpuQuota, witnesses {positive, negative}, sweep {basis, releaseHash, subjectListSha256, outboxItems}}",
    "requirement-route": "{requirement, engine, route: NATIVE|WORKAROUND, designId, cannotNatively (plain statement), testCaseResults []}",
    "scale-dataset": "{rung, profile, generatorSpecSha256, seed, populationCounts {stratum: count}, countQueryCaseResults []}",
    "static-witness": "{witnessFile, expectedDiagnostics [], observedDiagnostics [{file, line, column, code}], anyScanObject}",
    "provenance-manifest": "{authorId, inputs [{path, sha256}], outputs [{caseId, sha256}]}",
    "calibration-record": "{procedure, controlProfileIdentity, values [{thresholdId, value | UNATTAINABLE, measurementObject}], ladderObjects []}",
    "mutation-record": "{mutantId, patchSha256, patchedFiles [], reachProbeHits {probe: count}, killingAssertions [{caseId, assertionId, comparator, expectedObject, observedObject}]}",
    "verifier-record": "{verifiesReceiptIds [], mode, recomputedVerdictsObject, spotRerunReceiptIds [], mismatches []}",
    "budget-record": "{rung, component: cost, a0ControlReceiptId}",
    "w0-coverage-record": "{w0PinSha256 {file: sha256}, reviewReceipt, rung, seed, r2ChangedShare, ruleFireShares {rule: share}, locations, locationZipfS, multiWorkItemShare}",
}
MODE_RULE = "Every obligation declares at least one mode. 'single-execution' runs each selected case once, so executions equal selections; NS and GS obligations use it explicitly (RULINGS Q26). 'paired-rounds' (NS obligations, RULINGS Q60f) runs every comparison under PAIR_0: paired rounds of A0 and candidate, never a single run. Other modes (current, reopen, engine-restart) each run every selected case once more."
SELECTOR_SEMANTICS = "An obligation's cases are a list of {set, select}. select is a list of tags or named required case ids; 'all' selects every case of the set. The evaluator resolves the selection against the set's pinned manifest (lab/acceptance/cases/<set>.json, sha256 pinned in the contract version): the selected cases are those carrying any listed tag, plus any named case listed by id. The resolution must be non-empty, every listed entry must be in the set's requiredTags or requiredCases, and every requiredCases id must exist in the manifest. A set whose manifest is not pinned in the contract version cannot close any obligation. Declared executions = selected cases x modes (x 1 per receipt scope key); see MODE_RULE."
VALIDITY = {
    "VC": {"for": "calibration evidence", "dependsOn": [], "rules": [
        "VC1 runKind = calibration; create-only; its timestamp precedes every acceptance receipt that cites it",
        "VC2 binds the control profile identity and the load-contract or threshold registry hash",
        "VC3 every value is the registry value or tighter, or UNATTAINABLE with its retained measurement",
        "VC4 every ladder step's raw objects are retained",
        "VC5 preconditions that are acceptance obligations (for the NS calibration: S.population.year-one for the engine) are evaluated by the VA rules on the control profile; they never depend on VC records"]},
    "VA": {"for": "primary acceptance evidence", "dependsOn": ["VC"], "rules": [
        "VA1 produced by lab/bin in this repository, append-only, every evidence object present under runs/objects with matching sha256",
        "VA2 profile identity complete and equal to the candidate profile",
        "VA3 build first: imported dist hashes produced in this run",
        "VA4 engine image digest equals the pin or a repaired image declared in this contract version",
        "VA5 endpoint contacted equals the slot's; never 15442, 17019 or a homebase host",
        "VA6 contract transitive hash, obligation definition hash, oracle files and case manifests equal the pinned values; every oracle used is ACCEPTED",
        "VA7 fixture content hash and a fresh scope recorded",
        "VA8 executed set equals the resolved selection x modes; skipped, unsupported, not-implemented all 0",
        "VA9 language trace pure for lane receipts; host steps only HS-NORMALIZE and HS-FRONTIER",
        "VA10 resource admission recorded; not BLOCKED_CAPACITY",
        "VA11 every threshold used is the registry value or comes from a VC-valid calibration record cited in calibrationRefs",
        "VA12 no failed acceptance receipt exists for the same obligation, scope key and profile; first failures retained",
        "VA13 named DIAGNOSTICS executed and retained",
        "VA14 composition bound: the four assignments with image digest, configuration hash and slot each, every replication edge, and the serving index's watermark at every read; engine-scope keys derived from the assignment (RULINGS Q28)",
        "VA15 for NS and GS receipts: the trace generator source hash and seed equal the frozen pair of load-contract.json; background and overlay commands accounted separately; the driver-recorded requested basis present for every read",
        "VA16 the profile is not a screening profile (SCREENING_PROFILES)"]},
    "VM": {"for": "mutation evidence", "dependsOn": ["VA"], "rules": [
        "VM1 runKind = mutation; profile identity equals a VA-valid acceptance receipt's except the patch; oracle, case and gate hashes identical",
        "VM2 the patch touches only system-under-test files and is retained",
        "VM3 reach: the mutant's reach probe fired at least once inside a targeted case",
        "VM4 kill: at least one targeted case failed by a comparator mismatch on an identified assertion; errors, timeouts, crashes and setup failures do not count"]},
    "VV": {"for": "verifier evidence", "dependsOn": ["VA"], "rules": [
        "VV1 runKind = verifier; agentId not among authorsOfCodeUnderTest of the verified receipts",
        "VV2 same profile identity as the verified receipts",
        "VV3 coverage per the obligation's verifier mode (VERIFIER_MODES)",
        "VV4 the verifier's own evaluator recomputes every verdict from retained objects; any mismatch fails the obligation"]},
}
VERIFIER_MODES = {
    "rerun": "The verifier reruns the obligation's full selection on the same profile and recomputes every verdict from retained objects.",
    "re-evaluate-and-spot": "The verifier independently re-evaluates every retained answer byte, fault outcome and coverage record for every ladder level, scenario, rung and run, and performs at least one spot rerun per profile unit (one per lane and NS measurement; one per lane and golden scenario; one per lane and rung).",
}
CLOSURE_RULES = {
    "CR-PASS-ALL": {"evidence": ["case-result"], "validity": ["VA"], "recompute": "each case verdict = comparator(oracle expected, retained raw result bytes)", "holds": "every resolved case passes in every declared mode"},
    "CR-COUNTEREXAMPLE": {"evidence": ["case-result"], "validity": ["VA"], "recompute": "as CR-PASS-ALL, with the original oracle file whose hash is unchanged since the first recorded failure", "holds": "every original counterexample passes with unedited case text"},
    "CR-MUTANT-KILL": {"evidence": ["mutation-record", "case-result"], "validity": ["VM", "VA"], "recompute": "reach hits from the retained probe log; killing assertions re-compared from retained expected and observed objects", "holds": "every listed mutant meets MUTANT_RULE and the clean receipt passes"},
    "CR-OBSERVE": {"evidence": ["observation"], "validity": ["VA"], "recompute": "O-OBS verdict per protocol from retained samples and events", "holds": "every required protocol verdict is PASS within the obligation's thresholds"},
    "CR-FAULT": {"evidence": ["fault-witness", "case-result"], "validity": ["VA"], "recompute": "expected outcome chosen from the last witnessed transition in COMMIT_OUTCOMES (or the case's declared outcome), compared with final state, caller outcome, retries and post-recovery case results", "holds": "every fault point injected at least T-FAULT-REPS times and every injection matches"},
    "CR-STATIC": {"evidence": ["static-witness"], "validity": ["VA"], "recompute": "CMP-DIAGNOSTICS on retained tsc output; any-scan re-run", "holds": "observed diagnostics equal expected exactly and the any-scan is empty"},
    "CR-SCALE": {"evidence": ["scale-dataset", "case-result", "observation"], "validity": ["VA"], "recompute": "population counts versus O-REPLAY analytic counts; sample verdicts by comparator; capacity verdict by OBS-RESOURCE", "holds": "counts equal, every sample passes, run admitted and within envelope"},
    "CR-PERF": {"evidence": ["case-result", "observation", "plan-record"], "validity": ["VA", "VC"], "recompute": "latency and ratio statistics from retained timings", "holds": "every named threshold met in each of 3 independent runs"},
    "CR-METRICS": {"evidence": ["observation"], "validity": ["VA"], "recompute": "metric values from retained samples; secondary thresholds reported against their values (SECONDARY_RULE)", "holds": "every listed metric and every named secondary threshold present and measured; a secondary value never fails the rule"},
    "CR-NS": {"evidence": ["ns-run"], "validity": ["VA", "VC"], "recompute": "every named NS bar from retained raw events under TARGETS 1.1: goodput counts only reads whose answer equals the oracle at the driver-recorded requested basis; latencies from the scheduled offer to the published ACK; ratios against the same run's matched-phase baselines; per-core throughput from the receipt's CPU quota; affected-subject sets against O-REPLAY plus O-DOMAIN", "holds": "every named bar met in each of T-RUNS independent runs, on the frozen trace generator and seed of load-contract.json, with a VC record for every named threshold; under PAIR_0 (RULINGS Q60, provisional) a comparative bar holds only from paired rounds (8 to 24, pooled-quantile ratios with a bootstrap over rounds, the PAIR_0 margins), an absolute bar only from GREEN windows (an unjudged bar is never met), latency histograms count every offered command at its censor time, and arms under different slot regimes are never compared"},
    "CR-GS": {"evidence": ["ns-run", "case-result", "fault-witness"], "validity": ["VA", "VC"], "recompute": "only evidence whose ns-run measurement equals the obligation's params.scenario counts; scenario correctness from retained answers against O-REPLAY (state), O-DOMAIN (domain outputs under WORLD_W0) or O-HAND; positive and negative witnesses; every named failure schedule's expected outcome; commit and feed integrity from retained receipts and feed entries; every named bar from retained raw events", "holds": "zero wrong answers, zero lost or duplicated commits, zero feed gaps or order violations, every witness and failure-schedule outcome as expected, every named bar met, in each of T-RUNS runs, on every compared composition"},
    "CR-REQUIREMENT": {"evidence": ["requirement-route", "case-result"], "validity": ["VA"], "recompute": "each test verdict from retained results; the route record checked for a plain statement when WORKAROUND", "holds": "the engine declares NATIVE or a documented WORKAROUND and every test of the requirement passes on that route; an OPEN requirement never excludes the engine from comparison"},
    "CR-CALIBRATION": {"evidence": ["calibration-record"], "validity": ["VC"], "recompute": "the required set is the union of the thresholds named by every NS obligation (obligations.json NS.calibration params.requiredThresholds); VC3 check of each value against the registry", "holds": "the required set is non-empty and a VC-valid record holds a value for every member; an empty set or a missing member fails closed (RULINGS Q26)"},
    "CR-MATRIX": {"evidence": ["case-result"], "validity": ["VA"], "recompute": "matrix cells from obligations.json capabilityMatrix and the cited receipts", "holds": "every required cell EXACT with a receipt; every raw-required KNOWN-LIMIT cell has its exception record and guide entry"},
    "CR-PROVENANCE": {"evidence": ["provenance-manifest"], "validity": ["VA"], "recompute": "manifest inputs compared with the guide and docs hashes", "holds": "inputs are only the raw-query guide and engine public docs; the author is a fresh agent"},
    "CR-WITNESS": {"evidence": ["observation", "case-result"], "validity": ["VA"], "recompute": "OBS-WORK work-unit ratios from retained engine-side counters", "holds": "every named witness threshold met and answers equal the no-reuse or fresh-recompute run"},
    "CR-W0-COVERAGE": {"evidence": ["w0-coverage-record"], "validity": ["VA"], "recompute": "O-DOMAIN evaluates R1 and R2 over the frozen trace generator and seed at each rung and recomputes every W0-* statistic", "holds": "every W0-* floor met and every W0_PIN field non-null and equal to the reviewed files' sha256; a null pin fails closed (RULINGS Q31i)"},
    "CR-BUDGET": {"evidence": ["budget-record", "observation"], "validity": ["VA"], "recompute": "complete-path cost and NS measurements from retained evidence against budgets.json", "holds": "within the absolute bars and caps and within the A0-relative allowances at every rung, compared cumulatively against the frozen A0 control"},
}
APPLICABILITY = {
    "source": "lab/PLAN.md section 1 item 7; acceptance review r1 finding 12",
    "boundIdentities": ["imported source files", "imported dist files", "engine image digest", "engine configuration", "resource caps", "fixture contents", "enabled capabilities", "gate script versions", "oracle file versions", "case manifests", "acceptance-rule version (contract transitive hash and obligation definition hash)"],
    "carryForward": "A receipt carries forward to a later profile only when every bound identity is unchanged, checked by an explicit applicability record (AP) that recomputes each identity on the later profile. Carry-forward serves intermediate tracking only.",
    "screening": "A receipt made on a screening profile (SCREENING_PROFILES, RULINGS Q16) is evidence for candidate comparison only: it never passes VA, never closes an obligation, never feeds calibration and never carries forward.",
    "finalAcceptance": "The final acceptance of the selected integrated profile is entirely fresh: every obligation, including scale rungs and load levels, runs on that profile; nothing carries into it.",
}
STATUS_ALGORITHM = [
    "for each lane L and integrated profile T:",
    "  for each obligation O with L in O.lanes:",
    "    key = L if O.receiptScope == 'lane' else (O.layer, T.composition[O.layer].engine, imageDigest, configSha256, slot)  # RULINGS Q28",
    "    if O.closure.params.keyByNativeLanguage: key = (key, receipt.nativeLanguage) and only receipts whose nativeLanguage is L's language count for L  # RULINGS Q39b",
    "    A = acceptance receipts for (O.id, key) on T that pass VA (using VC records they cite)",
    "    closed(O, L, T) = O.grounding != 'policy-pending' and every case set of O is pinned",
    "                      and A non-empty and every rule in O.closure.rules holds by its recompute",
    "                      and VV-valid verifier coverage exists per VERIFIER_MODES[verifierMode(O)]",
    "                      and every gate in O.closure.params.gates holds (GATES; an unknown or null input fails closed)",
    "  closed(section, L, T) = all closed(O, L, T) for O with section in O.goals",
    "done(T) = closed for every section and lane, with every receipt fresh on T (APPLICABILITY.finalAcceptance)",
]

# ============================================================================ observation, plan, shape and spec protocols
OBS_PROTOCOLS = {
    "OBS-CANCEL": {"fields": ["requestId", "connectionId", "tCancelRequested", "tCallerSettled", "callerError", "transportAck {kind, t}", "engineActiveSamples [{t, activeQueryIds}]", "tDrained", "reuseQueryId", "tReuseOk"],
                   "verdict": "PASS iff callerError matches E-CANCELLED or E-TIMEOUT as the case pins, transportAck observed, the request id absent from every engine sample after tDrained with tDrained - tCancelRequested <= T-DRAIN-MS, sample gaps <= 1000 ms over [tCancelRequested, tDrained + 5000 ms], and the reuse query on the same connection succeeds"},
    "OBS-PREABORT": {"fields": ["requestId", "engineStatementLog [{t, tag}]", "coverage"], "verdict": "PASS iff zero engine statements carry the request id over the full coverage window"},
    "OBS-CONNECTIONS": {"fields": ["poolDeclarations [{label, max}]", "engineConnectionSamples [{t, label, count}]", "baseline", "tClose"], "verdict": "PASS iff every sample <= declared max and the count equals baseline within T-CONN-RELEASE-MS after tClose"},
    "OBS-SCRATCH": {"fields": ["relation", "countBefore", "countAfter", "resolutionReceipts"], "verdict": "PASS iff countAfter = countBefore for every scratch relation and every unknown working outcome is resolved"},
    "OBS-NO-MUTATION": {"fields": ["engineMutationCounterBefore", "engineMutationCounterAfter", "counterSource"], "verdict": "PASS iff the engine's committed-transaction or update counter is unchanged across the read"},
    "OBS-RESOURCE": {"fields": ["forecast {memory, disk}", "peaks [{owner, rss, disk, t}]", "envelope"], "verdict": "PASS iff every peak <= forecast <= envelope (and <= T-PLANNER-MEM-BYTES where named)"},
    "OBS-AVAILABILITY": {"fields": ["tFailure", "probes [{t, kind: write|read, outcome}]"], "verdict": "PASS iff a write and a read both succeed at some t <= tFailure + T-AVAIL-WINDOW-MS with no manual restart event"},
    "OBS-SCALE-COUNT": {"fields": ["population", "countQueryCaseResult", "analyticCount"], "verdict": "PASS iff the count query's answer equals O-REPLAY's analytic count"},
    "OBS-WORK": {"fields": ["operation", "engineWorkUnits {rowsScanned, rowsWritten, triplesTouched, bytesWritten}", "source"], "verdict": "ratio of work units between the compared operations, evaluated against the named witness threshold"},
    "OBS-MAINTENANCE": {"fields": ["kind", "tStart", "tEnd", "lagSamples"], "verdict": "events present; lag statistics against the named threshold"},
    "OBS-ERASURE-SCAN": {"fields": ["inventoryEntry", "location", "scanMethod", "plaintextHits", "derivedChannelHits", "keyDestroyedEvidence", "tScan"], "verdict": "PASS iff every PROTECTED_COPY_INVENTORY location of the lane is scanned after the erasure published and shows zero plaintext and zero derived-channel hits, or every surviving copy there is shown to be encrypted only under the destroyed per-subject key (key exclusivity, RULINGS Q31f)"},
    "OBS-WATERMARK": {"fields": ["readId", "basisPosition", "servingIndex", "watermarkAtRead", "waitMs", "route", "fallbackIndex"], "verdict": "PASS iff no read was answered by an index that was not eligible (COMPOSITION eligibility: watermark in the basis epoch, C1, reconstructability, erasure frontier), every wait before routing is within T-WATERMARK-WAIT-MS, every route and its surface language is recorded, and the fallback latency is inside the read's measured latency"},
    "OBS-ACK-ORDER": {"fields": ["commitPosition", "tSourcePublished", "tAck", "ackSender", "ryowPullRoute"], "verdict": "PASS iff the source of truth sent every ACK, tAck >= tSourcePublished for every commit, and every pull at a returned position was served by an eligible index or the fallback"},
    "OBS-FAULT-TRANSITIONS": {"fields": ["transition", "t", "durableEvidenceObject"], "verdict": "the last witnessed transition is the last one whose durable evidence is present after the crash"},
}
PLAN_PROTOCOLS = {
    "OBS-PLAN-ROUTE": {"fields": ["queryId", "route: projection | exact", "eligibilityInputs {scopeOwner, mappingGeneration, recordedTimeBound, positionKind, validInstant, markerState, partialOrConflictedReferenced}"],
                       "verdict": "PASS iff route equals O-REPLAY's C1 model: projection only when every C1 condition holds for the whole query"},
    "OBS-PLAN-ACCESS": {"fields": ["queryId", "enginePlanObject", "accessPathClass"],
                        "verdict": "key-bounded iff the XTDB plan uses an _id IID selector (scan.clj selector) for the probed table, or the QLever plan's first operation is an index scan with the subject or predicate-object bound; otherwise scan"},
    "OBS-PLAN-COST": {"fields": ["queryId", "declaredBudget", "estimate", "actual"], "verdict": "PASS iff actual <= declaredBudget, or the query stopped with the pinned error at the budget"},
}
SHAPE_SPEC = {
    "perCase": ["resultSemantics: set | bag | ordered", "groupingKey: list of variables with COMPARISON_RULES identity", "unboundHandling: exclude-row | null-cell (stated per projected variable)", "comparator: CMP-SET-ROWS | CMP-BAG-ROWS | CMP-ORDERED-ROWS", "expectedRows", "citation (SPARQL 1.1 or SQL section, or the packet task)"],
    "rules": [
        "Packet-derived shapes use set semantics (runner sorted-unique comparison).",
        "Negation controls compare the projected entity set.",
        "Aggregate controls follow AGGREGATE_RULES; empty groups per AG-EMPTY-*.",
        "Tied extremes keep every witness row (AG-MINMAX-TIES).",
        "An unbound projected variable is a null cell only where the case says null-cell; otherwise the row is excluded.",
    ],
}
SPEC_RULES = [
    "Positive witnesses assert exact types with an Equals<A, B> helper; assignability alone does not count.",
    "Every asserted type is also checked not to be any (IsAny<T> is false); an accidental any fails.",
    "Negative witnesses do not use @ts-expect-error; tsc runs on the witness set and the observed set of {file, line, column, code} must equal the pinned expected set exactly (CMP-DIAGNOSTICS); an unrelated diagnostic fails.",
    "The emitted public declarations are scanned: no exported symbol resolves to any except an explicitly listed allowlist in the witness manifest.",
    "Witnesses import only from packed public package exports, compiled with the consumer's strict tsconfig.",
]

# ============================================================================ budgets
BUDGET_COMPONENTS = ["ledger", "projection", "index tables", "journal", "log of record", "mutation broker", "verification", "scratch work", "fallback (exact path) reads", "maintenance", "clients"]
BUDGETS = {
    "format": "triplex-db-2/budgets/2", "version": VERSION,
    "source": "lab/PLAN.md section 7.4 and section 1 item 5; lab/TARGETS.md section 1; acceptance review r1 finding 14",
    "status": "PROVISIONAL (RULINGS Q16): the allowances below stand until EXP-N02 measures the A0 controls; they are then re-frozen, before any candidate is compared.",
    "frozenBeforeCandidates": "Budgets are re-frozen after EXP-N02 measures the A0 controls, in a create-only budget-freeze receipt (A0 control measurements at every rung, this file's sha256), before any candidate is evaluated against them. No candidate comparison may cite a budget that has not been re-frozen. A hypothesis's predicted cost never sets its own allowance. Changing a budget creates a new profile version; loosening an NS bar needs Sam.",
    "a0Control": "A0 = the ledger-only baseline profile (status-quo adapters, no projection), measured on the same slot configuration, writer trace and rung. Where A0 cannot complete a rung, only the absolute bars and caps apply there and the failure is recorded.",
    "cumulative": "Every promotion and the final acceptance compare the integrated candidate with the frozen A0 control at the same rung, never with the previous promotion, so small regressions accumulate against one fixed reference.",
    "components": BUDGET_COMPONENTS,
    "accounting": "Every metric is reported per component and in total; the log of record, the broker and verification count for QLever; fallback reads, maintenance, the change feed and clients count for both lanes.",
    "absolute": "Every NS-* bar of obligations.json thresholds applies as an absolute budget at P-YEAR-ONE; resource caps: memory peak within the 11 GiB reservation pool, disk peak within the 50 GiB stop line of the 60 GiB VM (lab/PLAN.md section 8).",
    "relativeToA0": [
        {"id": "B-WRITE-BYTES-PER-FACT", "allowanceVsA0": 4.0, "direction": "max", "source": "provisional (RULINGS Q16): projection, indexes, journal and feed together"},
        {"id": "B-INGEST-FACTS-PER-S", "allowanceVsA0": 0.5, "direction": "min", "source": "provisional (RULINGS Q16)"},
        {"id": "B-CURRENT-PULL-P99", "allowanceVsA0": 1.0, "direction": "max", "source": "derived: the current path must not be slower than ledger-only"},
        {"id": "B-COMMIT-P99", "allowanceVsA0": 1.25, "direction": "max", "source": "derived from NS-P1-WRITER-P99-RATIO-256"},
        {"id": "B-MEMORY-PEAK", "allowanceVsA0": 1.5, "direction": "max", "source": "provisional (RULINGS Q16)"},
        {"id": "B-DISK-PEAK", "allowanceVsA0": 2.0, "direction": "max", "source": "provisional (RULINGS Q16)"},
    ],
}

WRITER_TRACE = {
    "source": "lab/TARGETS.md section 2 (fixed workload, from Sam's paste)",
    "commandShape": {"factsPerCommand": [{"range": [5, 10], "share": 0.60}, {"range": [11, 25], "share": 0.30}, {"range": [26, 50], "share": 0.10}], "subjectsPerCommand": 1, "documents": "a blob reference for document commands"},
    "writers": [{"kind": "people", "share": 0.40, "what": "evidence, decisions"}, {"kind": "systems", "share": 0.30, "what": "signals, often duplicated"}, {"kind": "agents", "share": 0.10, "what": "proposals"}, {"kind": "runtime", "share": 0.20, "what": "action outcomes"}],
    "rate": {"steadyFactsPerSecond": 15, "burst": {"factsPerSecond": 750, "durationS": 60, "everyS": 600}},
    "duplicates": {"systemSignalsResentShare": 0.10, "sameCommandId": True},
    "lostAck": {"commandsShare": 0.01, "retried": True},
    "corrections": {"commandsShare": 0.01, "validTimeBackDays": 30},
    "readsPerWrite": {"range": [10, 100], "what": "each command triggers a reconcile pull at the returned tx, dependency lookups, projection updates and UI refreshes"},
    "conflicts": "optimistic compare-and-set on the subject's last position; serial per subject, parallel across subjects",
    "bulkLane": "separate and throttled; used only by the bulk measurements",
    "seeded": "a recorded seed fixes the whole trace; the same seed gives the same bytes",
    "generator": {
        "source": "lab/TARGETS.md section 2.1 (frozen before any comparison)",
        "activeSet": {"share": 0.02, "examples": "200 subjects at the 10k rung, 200k at 10m", "residencyS": 2000, "replacement": "seeded draws"},
        "subjectChoice": {"fromActiveSet": 0.95, "activeSetDistribution": "Zipf s = 1.1 over a seeded ranking", "uniformAllSubjects": 0.05, "uniformWhy": "corrections and late signals"},
        "commandSize": "uniform within each band of the 60/30/10 mix",
        "offers": "open loop: a seeded Poisson process at the steady rate",
        "burstPhase": "bursts start at 120 s + k x 600 s from the start of the measured window, identical for baselines and candidates",
        "scenarioOverlay": "a golden scenario's commands are added on top of the background trace, never instead of it; both streams accounted separately in the receipt",
        "freeze": "the generator source hash and the seed are bound in every receipt; a change to either starts a new comparison series",
        "frozenScreening": {"screening-burst-180": {"sha256": None, "seed": None, "offerScheduleSha256": None}, "screening-r4": {"sha256": None, "seed": None, "offerScheduleSha256": None}, "rule": "each screening series has its own frozen entry, frozen by EXP-M01 (RULINGS Q64b, Q60g, Q69f); frozen is the acceptance trace; until frozen, claims stay diagnostics"},
        "frozen": {"sha256": None, "seed": None, "offerScheduleSha256": None, "rule": "a required input: the generator source sha256, the seed and the offer schedule's sha256, pinned by a contract version once the trace is frozen; while null no CR-NS or CR-GS comparison has a workload identity and every such claim is a diagnostic (RULINGS Q61h)"},
        "invalidCommands": {"share": 0.001, "rule": "0.1% of trace commands are deliberately invalid (values no engine may hold) and marked in the frozen trace; only those may end in a typed rejection", "source": "RULINGS Q31a, Q32c"},
    },
}


# RULINGS Q60a-i: measurement protocol PAIR-0 (provisional; lab/research/R22-noise-robust-benchmarking.md).
PAIR_0 = {
    "status": "PROVISIONAL (RULINGS Q60); the margins are the orchestrator's interpretation and adjustable (NORTH-STAR item 4)",
    "mode": "paired-rounds",
    "design": {"rule": "comparisons run as paired rounds: a duet (A0 and candidate at the same time on two identically configured slots, same trace window) or, as the fallback, same-engine ABBA; a single run never decides a bar (RULINGS Q60a)",
               "designs": ["duet", "abba"], "rounds": {"min": 8, "default": 12, "max": 24}, "roundS": 150,
               "statistic": "pooled-quantile ratios with a bootstrap over rounds", "looks": [8, 12, 18, 24], "confidence": 0.982,
               "aa": "A/A rounds in the pre-flight and every sixth round"},
    "margins": {"superiorityRatioDefault": 1.25, "superiority": "the lower bound of A/B at or above the claimed ratio (1.25 by default)",
                "holdP50Max": 1.10, "holdP99Max": 1.15, "hold": "the upper bound of B/A at or below 1.10 for p50 and 1.15 for p99", "source": "RULINGS Q60b"},
    "slotRegime": {"rule": "measurement slots run with a cpuset and no CPU quota; receipts record the effective cpu.max, cpuset and cpu.weight; quota and cpuset arms are never compared; A0 is measured again under the new regime (RULINGS Q60c)", "receiptFields": ["cpuMax", "cpuset", "cpuWeight"]},
    "accounting": "latency histograms include every offered command (expired, failed and rejected ones at their censor time) next to the committed-only view; reads get an open-loop probe at a fixed rate; per-second goodput and per-second maximum latency are recorded (RULINGS Q60d)",
    "windows": "absolute bars are judged only in GREEN windows (the pre-registered noise signals and the A/A gate of R22 section 4.2); outside them an absolute bar is reported unjudged, which never counts as met (RULINGS Q60e)",
    "screeningSeries": {"rule": "a screening trace with a burst every 180 s is a new comparison series (TARGETS 2.1 item 5), so P2 and P3 rounds contain enough commands for p99; acceptance keeps the frozen trace (RULINGS Q60g)", "burstEveryS": 180, "fallback": {"name": "screening-r4", "rule": "4x the steady rate, no bursts; pre-registered and used only if the burst series makes commitAll p50 NOT_ESTIMABLE in the A/A run (RULINGS Q69f)"}},
    "lease": "a measurement window takes every heavy token and freezes pool admission for its duration (RULINGS Q60h)",
    "a0": "EXP-N01's single-run A0 is diagnostic only; A0 numbers for comparisons come from paired rounds (RULINGS Q60i)",
    "windowProcedure": "the pool cannot hold two 3.5 GiB slots beside both dev residents, so a measurement window stops one dev resident for its duration (qlever-dev by default, recreated fresh after; xtdb-dev when the window is QLever's) once no running agent depends on it; the orchestrator announces the window in STATE; no agent starts engine work during it; the lease enforces it (RULINGS Q69a)",
    "verdicts": {"INVALID": "a protocol departure: development overrides, the wrong regime, no lease, or an unregistered round count", "INVALID_NOISE": "a window that fails the noise gate", "source": "RULINGS Q69b"},
    "aaInAbMode": "provisional: A/B windows grade from the all-round s_d (conservative); acceptance-level claims add a second pair of container lifetimes with roles swapped (RULINGS Q69c)",
    "continuousTrace": "duets run one continuous trace, so both arms see the same content at the same time; ABBA fallback runs keep per-round window randomization (RULINGS Q69d)",
    "liveComposition": "the live A/A uses public-queued, matching EXP-N01's A0 (RULINGS Q69e)",
    "calibration": "thresholds stay as pre-registered; a passive recorder (signals every 10 s, calibration every 10 minutes) runs for 7 days to set them, started after EXP-M01 merges (RULINGS Q69g)",
}


def build_load_contract():
    T = THRESHOLDS
    doc = {
        "format": "triplex-db-2/load-contract/3", "version": VERSION, "generatedBy": "lab/acceptance/build_contract.py",
        "status": "provisional bars from lab/TARGETS.md section 1; calibration may tighten, loosening needs Sam",
        "obligations": [o["id"] for o in OBL if o["id"].startswith(("NS.", "GS."))],
        "population": "SCALE_POPULATION year-one (obligations.json scalePopulation), on one identified profile and composition",
        "writerTrace": WRITER_TRACE,
        "perSurface": "P1, P4 and P5 run separately in each lane language (xtdb-xtql, xtdb-sql, qlever-sparql); P2 and P3 run per engine; a mixed-language run is a diagnostic only",
        "measurements": {
            "P1": {"readers": "closed-loop, zero think time, each reader a distinct client id", "levels": [0, 1, 4, 16, 64, 256], "stress": 1024, "zeroReaderBaseline": "level 0 = writer trace alone, same trace segment and burst phase",
                   "readShape": "subject pull (P4 shape) at a named basis: valid time plus record time or tx; 80% at the latest committed tx (named exactly), 15% at a tx within the last hour, 5% at a past basis up to 90 days back (RULINGS Q16, TARGETS section 2)",
                   "hostServedReads": "provisional: reads served from the broker count for the P1 and P4 bars when the receipt records route = host and the per-core denominator includes broker and kernel CPU (RULINGS Q68d)",
                   "hotSet": {"minShare": 0.5, "rule": "at least 50% of reads target subjects written in the previous 60 s (the writer trace's active set)"},
                   "splitReads": {"share": 0.10, "rule": "10% of subgraph reads are issued as two or more queries at the same named basis, scheduled to straddle a command the frozen trace already holds for that subject: step 1 before that command's ACK, step 2 after it; the answer must equal the oracle at the requested basis, never the latest state", "driverWrites": "none: the driver adds no writes of its own, so faster readers never change the write load (RULINGS Q31b)"},
                   "maintenance": "every P1 window contains at least one maintenance event (XTDB compaction; QLever index rebuild or delta merge; index-layer catch-up)",
                   "requestedBasis": "the driver records the basis it requested (from the receipts it observed) independently of anything the engine echoes; the verifier checks every sampled answer at the driver-recorded basis",
                   "writerWaitAttribution": ["writer latency at each reader level against the zero-reader run on the same trace segment and burst phase", "engine-side wait evidence where exposed (QLever broker queue wait); XTDB has no read-path locks, so its evidence is the matched-phase comparison"],
                   "record": ["correctness-qualified read goodput per level", "read p50, p99 per level", "writer commit latency p50, p99, max and throughput per level"],
                   "bars": [k for k in NS_LADDER], "recovery": "after the 1,024 window, readers return to 256; 30 s evaluation windows sliding by 5 s; recovery time = end of the first window meeting every 256-level bar; must be within NS-P1-RECOVERY-MS"},
            "P2": {"loop": "open loop on the frozen offer schedule (WRITER_TRACE generator)", "latency": "from the scheduled offer time to the published ACK (sent only after the commit is durable and readable), so queueing behind other writers counts",
                   "sizeBands": [{"facts": [5, 10], "bars": ["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS"]}, {"facts": [11, 25], "bars": ["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS"]}, {"facts": [26, 50], "bars": ["NS-P2-COMMIT-P99-26-50-MS"], "note": "provisional"}],
                   "commands": "the trace's own commands; the 10-fact probe is a diagnostic only",
                   "readGuarantees": "each serving surface the composition claims is measured against COMPOSITION readGuarantees (RULINGS Q55c, provisional)", "hotSubjects": "COMPOSITION hotSubjects; E-OVERLOADED counts as an unjustified outcome (RULINGS Q51a)",
                   "storagePerCommit": "reported, never a bar: bytes and triples per 10-fact command on both lanes (EXP-J01; XTDB A0 27,581 bytes against the candidate's 95,364; QLever A0 653 triples per 10-fact command as V-P2Q measured it: 24 rows (10 facts and 14 journal rows) of about 27 triples each, the candidate 655 plus a 4-triple deleted marker, against R17's 94; the cause is the row encoding and journal on every lane, not the broker (RULINGS Q62c)), plus xt.txs and METADATA cost at 1M+ transactions (RULINGS Q50c, Q51d, Q51f)", "accounting": "every offered command is committed with a receipt, rejected with a typed error, or a typed conflict; zero unaccounted (NS-P2-UNACCOUNTED-MAX)",
                   "progress": {"rule": "every oracle-valid trace command publishes; typed rejections count only for commands the frozen trace marks deliberately invalid, typed conflicts only where the oracle independently finds a compare-and-set race (NS-P2-UNJUSTIFIED-OUTCOMES-MAX)", "queueBound": "queued commands never exceed NS-P2-QUEUE-MAX-S of the offered rate at steady state", "burstDrain": "the queue drains within NS-P2-BURST-DRAIN-S after each burst", "source": "RULINGS Q31a; lab/TARGETS.md 1.1 P2 item 4"},
                   "ryow": "the next pull at the returned tx", "idempotency": "the trace's duplicates and lost ACKs", "readers": 256,
                   "bars": ["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS", "NS-P2-COMMIT-P99-26-50-MS", "NS-P2-UNACCOUNTED-MAX", "NS-P2-UNJUSTIFIED-OUTCOMES-MAX", "NS-P2-QUEUE-MAX-S", "NS-P2-BURST-DRAIN-S", "NS-P2-RYOW-FRACTION", "NS-P2-DUP-RECEIPT-FRACTION"]},
            "runQueue": {"qleverExclusiveFirst": "A0 and candidate at delta 0, 100k and 500k; persist-updates off; kill -9 replay; rebuild trigger cost; the full trace with burst against QLever; a keep-alive recheck on an idle slot (RULINGS Q50e)", "xtdb100kRung": "deferred until EXP-J01 lands; the disk need is re-estimated from the new bytes per commit before a large slot is requested (RULINGS Q51e)"},
            "P3": {"commitTime": "the source's own publication timestamp for each position (the broker's durable watermark update, or the engine's commit resolution when the engine is the source), stamped by the source on the host monotonic clock the driver also reads, recorded independently of ACK delivery (RULINGS Q55d)",
                   "accounting": "every committed position is accounted; no lag sample is dropped for a missing ACK; a position with no consumer record is counted and fails the run (RULINGS Q55d)",
                   "publicationEnumeration": "both arms enumerate the final published source prefix from the source's own record and timestamp actual publication (broker: watermark publication; engine as source: commit resolution); ACK records are reconciled afterwards; a late or lost ACK is never a feed defect (RULINGS Q67d)", "cursor": "(epoch, position), a total order over transactions; per-subject order follows from it",
                   "expectedAffected": "subjects written directly (O-REPLAY) plus the subjects whose WORLD_W0 static read set contains a changed fact (O-DOMAIN; RULINGS Q36e)",
                   "milestone": "the consumer durably records the affected-subject set and its checkpoint in one durable write; lag runs from commit time to that record",
                   "delivery": "at-least-once from the last checkpoint; effects keyed by (consumer, position, subject), so replay is idempotent; visible duplicate effects must be zero (NS-P3-VISIBLE-DUP-EFFECTS-MAX); replay attempts allowed and counted separately",
                   "crashPoints": ["before the effect", "after the effect, before the checkpoint", "after the checkpoint"], "readers": 256,
                   "bars": ["NS-P3-GAPS-MAX", "NS-P3-ORDER-VIOLATIONS-MAX", "NS-P3-LAG-P99-MS", "NS-P3-VISIBLE-DUP-EFFECTS-MAX"]},
            "P4": {"probe": "single client, subject pulls at the current basis", "buckets": [{"facts": [50, 200], "weight": 0.50}, {"facts": [201, 800], "weight": 0.35}, {"facts": [801, 2000], "weight": 0.15}], "hops": [{"hops": 3, "weight": 0.40}, {"hops": 4, "weight": 0.35}, {"hops": 6, "weight": 0.25}],
                   "tails": "the p50 and p99 bars apply to the weighted mix; each bucket reports its own p50 and p99; the largest bucket has NS-P4-PULL-P99-LARGEST-MS",
                   "throughput": "closed-loop pulls; cores = the CPU quota bound in the receipt; host broker and kernel CPU reported beside engine-core throughput",
                   "history": "one matched sample of 1,000 subjects: measure at history depth 1, add corrections to the same subjects to depth 3 and then 10, measure again; compare p99 latency and bytes read (RULINGS Q16, Q27)",
                   "hostServedReads": "provisional: reads served from the broker count for the P4 bars when the receipt records route = host and the per-core denominator includes broker and kernel CPU (RULINGS Q68d)",
                   "bars": ["NS-P4-PULL-P50-MS", "NS-P4-PULL-P99-MS", "NS-P4-PULL-P99-LARGEST-MS", "NS-P4-PULLS-PER-CORE", "NS-P4-HISTORY-FLATNESS"]},
            "P5": {"sweep": "evaluate release R against WORLD_W0 for every subject in R's scope (100k) at one shared basis; the receipt binds the basis and R's content hash", "coverage": "every in-scope subject evaluated exactly once; the receipt carries the hash of the subject list",
                   "scopedRelease": {"rung": "100k", "binds": "the reached-subject list and its sha256, instead of every placement", "measuredReached": 9497, "measuredChanged": 418, "why": "R3 is vacuous above the 100k rung (V-D01 N3); a scoped sweep's receipt binds what it reached (V-D01 N4; RULINGS Q48b)"},
                   "publication": "results published as work items through the atomic outbox path (EP-OUTBOX) under the delivery key (id, publication sequence) with early cutoff: a payload equal to the latest published one publishes nothing, a different one (including a return to an earlier payload) publishes the next sequence of the same id; publication state is persisted atomically with the outbox record (RULINGS Q36a, Q38f); expected outputs from O-DOMAIN, independently", "postCaptureMutations": "after the basis is captured the driver mutates selected subjects; their outputs must reflect the captured basis",
                   "wallTime": "includes evaluation and publication", "throttledVariant": "about 10 minutes, overlapping a real compaction or index rebuild; keeps its basis and never blocks writers",
                   "concurrent": "the writer trace and 64 live readers", "noSweepBaseline": "same run, same 64 readers and writer trace, before the sweep", "bars": ["NS-P5-SWEEP-S", "NS-P5-LIVE-READ-P99-RATIO", "NS-P5-WRITER-P99-RATIO", "NS-P1-WRITER-WAIT-MAX-MS"]},
            "secondary": {"bulk": "a 1M-fact import through the bulk lane with 64 live readers; bar NS-SEC-BULK-READ-P99-RATIO", "retroactive": "1,000 corrections 30 days back; feed valid-time range and explain at the old basis checked", "audit": "explain at a past basis, repeated three times; bit-for-bit identical"},
        },
        "measurementProtocol": PAIR_0,
        "windows": {"judging": PAIR_0["windows"], "acceptance": {"warmupS": 120, "perLadderLevelS": 600, "note": "RULINGS Q16; 600 s covers one full burst cycle of the writer trace (60 s at 750 facts/s every 600 s)"}, "screening": {"profile": "P-SCREEN", "warmupS": 30, "perLadderLevelS": 120, "note": "RULINGS Q16; candidate comparison only; a screening receipt never closes an obligation"}},
        "basisMix": [{"share": 0.80, "basis": "latest committed tx, named exactly"}, {"share": 0.15, "basis": "a tx within the last hour"}, {"share": 0.05, "basis": "a past basis up to 90 days back"}],
        "runs": T["T-RUNS"]["value"],
        "semantics": "lab/TARGETS.md section 1.1 (frozen before any comparison): a run that departs from these definitions cannot close an NS obligation",
        "invariants": ["every read names its basis and its answer is compared with the oracle at the driver-recorded requested basis; a wrong answer scores zero", "receipts bind the composition, the trace generator hash and seed, and the serving index's watermark at every read (VA14, VA15)", "every command gets one receipt; duplicates and lost ACKs return the original receipt (COMMIT_OUTCOMES)", "success receipts only after publication", "no engine restart, crash or OOM inside a measurement window unless the scenario injects it", "receipt validity VA"],
        "bars": {k: v for k, v in T.items() if v["kind"] == "ns"},
        "calibration": {"obligation": "NS.calibration", "rule": CALIBRATION_RULE, "procedure": [
            "C1 preconditions: S.population.year-one closed (VA) on the control profile; this file's sha256 recorded",
            "C2 run every measurement once per lane on the control profile with the fixed writer trace",
            "C3 for each NS bar, record the measured value; keep the bar, tighten it, or mark UNATTAINABLE with the measurement (loosening needs Sam)",
            "C4 write the create-only calibration record (VC); acceptance runs cite it"]},
    }
    return doc


# ============================================================================ checks
BANNED_TEXT = [
    (r"open question", "obsolete open-question language"),
    (r"REPORT\.md", "references to REPORT.md questions"),
    (r"EP-CLI", "CLI entrypoint (RULINGS Q7)"),
    (r"non-decreasing", "false clock model (review finding 7)"),
    (r"preserved through \+ 0\.0", "wrong signed-zero rule (review finding 8)"),
    (r"—", "em-dash"),
    # superseded targets (RESCOPE; the generator fails if any reappears)
    (r"256 requests", "superseded generic load bar"),
    (r"25\.6", "superseded command rate"),
    (r"230\.4", "superseded read rate"),
    (r"frozen overload policy", "superseded stress profile"),
    (r"\b512\b", "superseded 512-client stress level"),
    (r"L\.accept|L\.stress|L\.smoke|L\.recovery|L\.calibration|accept-256|stress-1024", "superseded load obligations"),
    (r"(?i)exact int64|exact signed 64|full signed 64-bit range is required|int64 beyond 2\^53 is required", "superseded exact int64 requirement"),
    (r"(?i)scale target|performance target of 10m|10m-entity / 100m-fact", "10m/100m as a performance target"),
    (r"HELD", "hold markers (the hold ended with the re-scope)"),
    (r"ACKs? only after the current index", "superseded ACK clause (RULINGS Q31e)"),
    (r"no duplicate processing", "superseded GS.19 wording (RULINGS Q31h)"),
    (r"driver commits a mutation", "superseded forced mutations (RULINGS Q31b)"),
    (r"waits up to 250 ms", "superseded watermark wait (RULINGS Q31d)"),
    (r"fixed-width, sign-aware", "superseded decimal key wording (RULINGS Q35a)"),
    (r"E-DECIMAL-UNREPRESENTABLE", "superseded error name (RULINGS Q35e)"),
]


# RULINGS Q45a: recorded differences between the generator's O-REPLAY pin scope and V-O03's pin_scope.json (contract 0.3.5).
# RULINGS Q47c (0.3.7): the decimal-redeclaration reach blocks the three CS-MIGRATION and CS-WIDEN obligations; the two Q49 erasure
# obligations are new since V-O03 and blocked by the erasure refusal.
# RULINGS Q56i (0.3.8): the pin is at a9c1327, so V-O03's pin_scope.json (8cc2c26) differs as follows: the eleven erasure-blocked
# obligations and G1.decimal.channel-routing (F2 fixed) now may close; the decimal-redeclaration reach (Q47c, Q54a) and the Q52 shapes
# still block four; four O-REPLAY obligations are new since V-O03.
PIN_SCOPE_EXPECTED_DIFF = {"onlyGeneratorBlocked": ["G1.types.storage-widening-safe", "G7.migration.schema-evolution", "G7.migration.valid-writes-never-rejected", "G9.erasure.residual-shapes"], "onlyVerifierBlocked": ["G1.decimal.channel-routing", "G10.cursor.stable", "G7.journal.logical-contract", "G8.composition.watermark-routing", "G9.erasure.protected-copies", "G9.erasure.reproduction-modulo", "G9.erasure.restore-reapplies", "G9.erasure.visibility-boundary", "GS.16", "NS.SEC.retro-and-audit", "REQ.pii-erasure"], "onlyGeneratorUses": ["G7.composition.overlay-rules", "G7.position.bound-after-publication", "G9.erasure.commit-semantics", "G9.erasure.query-semantics", "G9.erasure.residual-shapes"], "onlyVerifierUses": []}
# RULINGS Q38c: every RULINGS.md entry is compiled or listed as recorded-not-compiled.
# Q40 (V-D01, W0-1.1.0) is recorded in RULINGS.md for the next contract version.
EXPECTED_RECORDED_NOT_COMPILED = []


def ruling_row_ids(text):
    ids = []
    for line in text.splitlines():
        m = re.match(r"^\| (Q\d+[a-z]?(?:-clarified)?|AMB-\d\d)\b", line)
        if m and m.group(1) not in ids:
            ids.append(m.group(1))
    return ids


def rulings_md_ids():
    return ruling_row_ids((REPO / "lab/acceptance/RULINGS.md").read_text())


# RULINGS Q47d: RULINGS-PENDING.md may hold ruling rows. They carry no authority and are never compiled; the generator records the
# file's hash (inputs) and lists the pending ids (pendingRulings) without invalidating generation.
PENDING_RULINGS_FILE = "lab/acceptance/RULINGS-PENDING.md"
PENDING_RULE = "RULINGS-PENDING.md may hold ruling rows; they carry no authority, are never compiled into this contract and never count as compiled RULINGS.md entries; the generator records the file's hash under inputs and lists the pending ids, and their presence never invalidates generation or --verify (RULINGS Q47d)"


def pending_ruling_ids(text=None):
    return ruling_row_ids((REPO / PENDING_RULINGS_FILE).read_text() if text is None else text)


def pending_row_clash(pending_ids, md_ids):
    """RULINGS Q64f: ids that are both pending rows and RULINGS.md rows (a pending sub-id under a compiled base is not a clash)."""
    return sorted(set(pending_ids) & set(md_ids))


def pending_rulings():
    return {"file": PENDING_RULINGS_FILE, "sha256": sha_file(PENDING_RULINGS_FILE), "ids": pending_ruling_ids(), "authority": "none", "rule": PENDING_RULE}


def rulings_coverage():
    compiled = {r["id"] for r in RULINGS}
    out = {"compiled": [], "recordedNotCompiled": []}
    for mid in rulings_md_ids():
        base = re.match(r"^(Q\d+)", mid)
        ok = mid in compiled or (base and base.group(1) in compiled) or (mid.startswith("AMB-") and "Q21" in compiled) or (re.match(r"^Q8[a-f]$", mid) and mid in compiled)
        out["compiled" if ok else "recordedNotCompiled"].append(mid)
    return out


def s_render_oracle():
    t = pathlib.Path(__file__).read_text()
    i = t.index("### 6.1 O-REPLAY" + " (independent")
    return t[i:t.index("### 6.2 O-" + "SHAPE", i)]


def ruling_checks():
    e = []
    obl = {o["id"]: o for o in OBL}
    for r in RULINGS:
        if r.get("status") not in (None, "SUPERSEDED"):
            e.append(f"{r['id']}: unknown status")
    # RESCOPE
    for sid in ("NS", "GS", "S"):
        if sid not in dict(SECTIONS):
            e.append(f"RESCOPE: section {sid} missing")
    if "L" in dict(SECTIONS):
        e.append("RESCOPE: the old load section must be gone")
    for pid in ("NS.P1", "NS.P2", "NS.P3", "NS.P4", "NS.P5"):
        if pid not in obl:
            e.append(f"RESCOPE: {pid} missing")
    for pid in ("NS.P1", "NS.P4", "NS.P5"):
        if pid in obl and (obl[pid]["lanes"] != LANES or obl[pid]["receiptScope"] != "lane"):
            e.append(f"RESCOPE: {pid} must be measured per surface")
    if sorted(o["id"] for o in OBL if o["id"].startswith("GS.")) != [f"GS.{i:02d}" for i in range(1, 21)]:
        e.append("RESCOPE: exactly GS.01 to GS.20 required")
    for o in OBL:
        if o["id"].startswith("GS.") and not ({"O-REPLAY", "O-HAND"} & set(o["oracles"])):
            e.append(f"RESCOPE: {o['id']} needs O-REPLAY or O-HAND")
    if len([o for o in OBL if o["id"].startswith("REQ.")]) != 10 or any("never removes an engine" not in o["statement"] for o in OBL if o["id"].startswith("REQ.")):
        e.append("RESCOPE: ten requirements, never knockout")
    want = {"NS-P1-READ-P99-256-MS": 100, "NS-P1-WRITER-P99-RATIO-256": 1.25, "NS-P1-WRITER-WAIT-MAX-MS": 2000, "NS-P1-GOODPUT-1024-VS-256": 0.9, "NS-P1-WRITER-P99-RATIO-1024": 2.0, "NS-P1-RECOVERY-MS": 60000,
            "NS-P2-COMMIT-P50-MS": 10, "NS-P2-COMMIT-P99-MS": 50, "NS-P3-LAG-P99-MS": 250, "NS-P4-PULL-P50-MS": 5, "NS-P4-PULL-P99-MS": 25, "NS-P4-PULLS-PER-CORE": 1100,
            "NS-P5-SWEEP-S": 100, "NS-P5-LIVE-READ-P99-RATIO": 1.5, "NS-P5-WRITER-P99-RATIO": 1.5, "NS-SEC-BULK-READ-P99-RATIO": 1.5}
    for k, v in want.items():
        if THRESHOLDS.get(k, {}).get("value") != v:
            e.append(f"RESCOPE: {k} must be the TARGETS bar {v}")
    if WRITER_TRACE["rate"] != {"steadyFactsPerSecond": 15, "burst": {"factsPerSecond": 750, "durationS": 60, "everyS": 600}}:
        e.append("RESCOPE: writer trace rate")
    if SCALE_POPULATION["rungs"] != [10000, 100000, 1000000, 10000000] or SCALE_POPULATION["atYearOne"]["entities"] != 10000000 or SCALE_POPULATION["atYearOne"]["activeDomainFacts"] != 100000000:
        e.append("RESCOPE: year-one population")
    if "never loosen" not in CALIBRATION_RULE and "Loosening any value needs Sam" not in CALIBRATION_RULE:
        e.append("RESCOPE: calibration rule")
    # NUMERIC
    if INTEGER_MIN_RANGE < 2 ** 53 - 1:
        e.append("NUMERIC: integer range below 2^53")
    for k in ("G1.types.out-of-range-rejected", "G1.types.decimal", "G2.arith.integer-exact", "G5.agg.projection-sums", "REQ.no-silent-precision-loss"):
        if k not in obl:
            e.append(f"NUMERIC: {k} missing")
    if "decimal" not in [v["kind"] for v in VALUE_KINDS]:
        e.append("NUMERIC: decimal value kind")
    if any(RAW_PARITY_CLASSES.get("RP-ARITH", [])) or any(r["n"] in (19, 20, 21, 22, 23, 24, 50) and (r["rawRequired"] or r["fragmentCoverage"]) for r in MATRIX_ROWS):
        e.append("NUMERIC: engine-side arithmetic must not be required (kernel arithmetic; projections only)")
    # Q1
    raw_req_kl = {(r["n"], c) for r in MATRIX_ROWS for c, v in r["cells"].items() if COL_SURFACE[c] == "raw" and v[0] == "KL" and r["rawRequired"]}
    lanecol = {"xtdb-xtql": "x_raw", "xtdb-sql": "s_raw", "qlever-sparql": "q_raw"}
    exc = {(x["row"], lanecol[x["lane"]]) for x in RAW_EXCEPTIONS}
    if raw_req_kl != exc:
        e.append(f"Q1: raw-required KL cells and exceptions differ: missing {sorted(raw_req_kl - exc)} extra {sorted(exc - raw_req_kl)}")
    for x in RAW_EXCEPTIONS:
        if not (x["mappedRecipe"] and x["qualifiedBy"] in obl and x["diagnostic"] in {d["id"] for d in DIAGNOSTICS}):
            e.append(f"Q1: exception {x['id']} incomplete")
        if x["row"] in (4, 10, 22) and x["lane"] == "qlever-sparql":
            e.append(f"Q1: QLever integers beyond 2^59 are rejected at write, not exempted ({x['id']})")
    for r in MATRIX_ROWS:
        if r["fragmentCoverage"]:
            for c in ("x_frag", "s_frag", "q_frag"):
                v = r["cells"].get(c, ("",))
                if v[0] == "NA" and v is not REJECT_Q:
                    e.append(f"Q1: coverage row {r['n']} has N/A fragment cell {c}")
    if "qlever-sparql" in obl["G4.neg.correlated-not-exists-raw"]["lanes"]:
        e.append("Q1: QLever raw correlated negation must be an exception, not an obligation")
    # Q3
    if not any(h["id"] == "HS-NORMALIZE" and "reads no data" in h["rule"] and "counted inside" in h["rule"] for h in LANGUAGE_RULES["permittedHostSteps"]):
        e.append("Q3: host step rule")
    if obl["R.raw.guide-only-authoring"]["grounding"] != "grounded" or "fresh agent" not in obl["R.raw.guide-only-authoring"]["statement"]:
        e.append("Q5")
    if obl["G9.lineage.supporting-assertions"]["grounding"] != "grounded" or "assertion ids and transactions" not in obl["G9.lineage.supporting-assertions"]["statement"]:
        e.append("Q6")
    if "EP-CLI" in ENTRYPOINTS or any("CLI" in o["statement"] for o in OBL):
        e.append("Q7: CLI must not be required")
    if not any(a["id"] == "AG-SUM-I" and "final total" in a["rule"] and "projection" in a["rule"] for a in AGGREGATE_RULES):
        e.append("Q8a")
    if not any(a["id"] == "AG-AVG-I" and "preflight" in a["rule"] for a in AGGREGATE_RULES):
        e.append("Q8b")
    if not any(n["id"] == "N-F-ARITH" and "E-DIVISION-BY-ZERO" in n["rule"] for n in NUMERIC_OPS):
        e.append("Q8c")
    if not any(c["id"] == "CMP-INT-FLOAT" and "never share a group" in c["rule"] and "E-MIXED-FAMILY" in c["rule"] for c in COMPARISON_RULES):
        e.append("Q8d/Q14d")
    if "Equal-valued duplicates are not conflicts" not in obl["G4.neg.conflict-semantics"]["statement"] or "C5-EQ-DUP" not in CS["CS-CONFLICT"]["requiredCases"]:
        e.append("Q8e")
    if CARD_MANY_ORDER["familyOrder"][:3] != ["boolean", "integer", "number"] or CARD_MANY_ORDER["familyOrder"][-4:] != ["string", "ref", "json", "blob"]:
        e.append("Q8f/Q14a")
    nz = dict(next(n for n in NUMERIC_OPS if n["id"] == "N-F-NEGZERO")["examples"])
    if nz.get("-0.0 + 0.0") != "+0.0" or nz.get("-0.0 * -1.0") != "+0.0":
        e.append("signed zero examples (review finding 8)")
    if not any(c["id"] == "CMP-NEGZERO" and "lowest (recordedPosition, operation index)" in c["rule"] for c in COMPARISON_RULES):
        e.append("Q14b")
    if not any(a["id"] == "AG-SUM-F" and "correctly rounded" in a["rule"] for a in AGGREGATE_RULES):
        e.append("Q14c")
    for oid in ("G9.presence.explicit", "G9.deletion.entity", "G9.cascade.restrict-detach-cascade"):
        if obl[oid]["grounding"] != "policy-pending":
            e.append(f"Q9: {oid}")
    if "every ladder level, scenario, rung and run" not in VERIFIER_MODES["re-evaluate-and-spot"] or "per profile unit" not in VERIFIER_MODES["re-evaluate-and-spot"]:
        e.append("Q10")
    st = obl["G4.neg.conflict-semantics"]["statement"]
    if not ("E-CONFLICTING-VALUES" in st and "values(attribute)" in st and "never certifies" in st):
        e.append("Q12")
    if "split-sum" not in obl["G5.agg.projection-sums"]["statement"]:
        e.append("Q13")
    lc = build_load_contract()
    # Q21
    if len(AMB_RULINGS) != 17 or [a["id"] for a in AMB_RULINGS] != [f"AMB-{i:02d}" for i in range(1, 18)]:
        e.append("Q21: AMB-01 to AMB-17 must all be ruled")
    if sorted(a["id"] for a in AMB_RULINGS if a["provisional"]) != ["AMB-04", "AMB-09", "AMB-17"]:
        e.append("Q21: exactly AMB-04, AMB-09 and AMB-17 are provisional")
    gv = golden_vectors()
    amb_q, refs = [], set()
    for fname, d in gv.items():
        refs |= set(re.findall(r"AMB-\d\d", json.dumps(d)))
        for v in d["vectors"]:
            def walk(x):
                if isinstance(x, dict):
                    if x.get("expected") == "AMBIGUOUS":
                        amb_q.append((v["id"], x.get("id"), x.get("ambiguity"), [r.get("id") for r in x.get("readings", [])]))
                    for y in x.values():
                        walk(y)
                elif isinstance(x, list):
                    for y in x:
                        walk(y)
            walk(v)
    res = {(r["vector"], r["query"]): r for r in GOLDEN_RESOLUTIONS}
    for vid, qid, amb, readings in amb_q:
        r = res.get((vid, qid))
        if not r:
            e.append(f"Q21: golden {vid}/{qid} ({amb}) has no resolution")
        elif r["amb"] != amb or r["reading"] not in readings:
            e.append(f"Q21: golden {vid}/{qid} resolution does not match its ambiguity or readings")
    if len(res) != len(amb_q):
        e.append("Q21: GOLDEN_RESOLUTIONS and the AMBIGUOUS golden queries differ in number")
    if refs - {a["id"] for a in AMB_RULINGS}:
        e.append(f"Q21: golden files cite unruled {sorted(refs - {a['id'] for a in AMB_RULINGS})}")
    if "equal values on distinct entities" not in obl["G5.agg.full-support"]["title"].lower():
        e.append("Q21: G5.agg.full-support must read 'equal values on distinct entities'")
    if not any(r["id"] == "TM-EMPTY-REJECTED" and "E-INVALID-VALUE" in r["rule"] for r in TEMPORAL_RULES) or "E-INVALID-VALUE" not in obl["G9.temporal.half-open-intervals"]["statement"]:
        e.append("Q21: AMB-12 empty interval must be E-INVALID-VALUE")
    if not any(r["id"] == "RS-FIND-RANGE" for r in READ_SHAPE_RULES) or "RS-FIND-RANGE" not in obl["R.repo.entity-suite"]["statement"]:
        e.append("Q21: AMB-16 integer range predicates in find")
    if "projection that omits the attribute succeeds" not in obl["G4.neg.conflict-semantics"]["statement"]:
        e.append("Q21: AMB-17 find conflict rule")
    if "bit-exact -0.0" not in obl["G7.journal.logical-contract"]["statement"]:
        e.append("Q21: AMB-04 journal -0.0")
    # Q22
    if [r["id"] for r in DECIMAL_OPS][:2] != ["DO-ADD", "DO-MUL"] or "max(p1 - s1, p2 - s2)" not in DECIMAL_OPS[0]["resultPrecision"] or DECIMAL_OPS[1]["resultScale"] != "s1 + s2":
        e.append("Q22: decimal result types")
    if not any(r["id"] == "DO-BARE-DIV" and "E-DECIMAL-BARE-DIVIDE" in r["error"] for r in DECIMAL_OPS) or not any("half-even, half-up, down" in r["op"] for r in DECIMAL_OPS):
        e.append("Q22: division only as divide(a, b, scale, rounding)")
    if DECIMAL_RULES.get("kernelMaxDigits") != 38:
        e.append("Q22: kernel maximum 38 digits")
    cmp = next(c for c in COMPARISON_RULES if c["id"] == "CMP-DECIMAL-CROSS")["rule"]
    if "equality included" not in cmp or "equality is false" in cmp:
        e.append("Q22: CMP-DECIMAL-CROSS must make every comparison, equality included, a preflight error")
    for r in DECIMAL_OPS + DECIMAL_CONVERSIONS + DECIMAL_SCALE_EVOLUTION:
        if r["case"] not in CS["CS-DECIMAL"]["requiredCases"]:
            e.append(f"Q22: {r['id']} has no named case")
    for c in DECIMAL_TESTS:
        if c not in CS["CS-DECIMAL"]["requiredCases"] + CS["CS-TDK1"]["requiredCases"]:
            e.append(f"Q22: test class {c} missing")
    if "M-DECIMAL-PRECAPTURE-ROUND" not in obl["G1.types.decimal"]["mutationControls"]:
        e.append("Q22: input capture mutant")
    # Q23
    oo = obl["G1.types.out-of-range-rejected"]
    if "EP-RAW-WIRE" in oo["entrypoints"] or not {"EP-BULK", "EP-REPLAY", "EP-WRITER"} <= set(oo["entrypoints"]):
        e.append("Q23: qualified write routes only")
    r51 = next((r for r in MATRIX_ROWS if r["n"] == 51), None)
    if not r51 or r51["cells"].get("q_raw", ("",))[0] != "KL" or "KL-Q1" not in r51["cells"]["q_raw"][1]:
        e.append("Q23: QLever native wrap on the bare wire must be a KNOWN-LIMIT row")
    # Q24
    for oid in ("G9.erasure.visibility-boundary", "G9.erasure.protected-copies", "G9.erasure.restore-reapplies"):
        if oid not in obl:
            e.append(f"Q24: {oid} missing")
    for oid in ("G10.cursor.stable", "NS.SEC.retro-and-audit", "GS.12"):
        if "modulo erasure" not in obl[oid]["statement"]:
            e.append(f"Q24: {oid} must hold modulo erasure")
    for t in ERASURE["tests"]:
        if t not in CS["CS-ERASURE"]["requiredCases"]:
            e.append(f"Q24: erasure test {t} missing")
    if not next(r for r in RULINGS if r["id"] == "Q24").get("provisional"):
        e.append("Q24: must be flagged provisional")
    # Q25
    for t in ("T-RECURSION-P99-MS", "T-LAT-RATIO-10M-1M", "T-DEEP-PAGE-RATIO"):
        if THRESHOLDS[t]["kind"] != "secondary":
            e.append(f"Q25: {t} must be secondary")
        for o in OBL:
            if t in o["thresholds"] and set(o["closure"]["rules"]) & {"CR-PERF", "CR-NS", "CR-GS"}:
                e.append(f"Q25: {o['id']} gives {t} blocking authority")
    for oid in ("G6.deadline.enforced", "G6.cancel.observed-drain", "G3.recursion.read-only-frontier"):
        if oid not in obl:
            e.append(f"Q25: bounded execution obligation {oid} missing")
    # Q26
    if not NS_CAL_REQUIRED or obl["NS.calibration"]["closure"]["params"].get("requiredThresholds") != NS_CAL_REQUIRED or "fails closed" not in CLOSURE_RULES["CR-CALIBRATION"]["holds"]:
        e.append("Q26: CR-CALIBRATION must cover every NS threshold and fail closed")
    for o in OBL:
        if o["id"].startswith("GS.") and o["closure"]["modes"] != ["single-execution"]:
            e.append(f"Q26: {o['id']} must use single-execution")
        if o["id"].startswith("NS.") and o["closure"]["modes"] != NS_MODES:
            e.append(f"Q26/Q60f: {o['id']} must use single-execution and paired-rounds")
    for n, *_rest in GOLDEN_SCENARIOS:
        o = obl[f"GS.{n:02d}"]
        sel = [t for c in o["cases"] for t in c["select"]]
        if "all" in sel or f"GS-{n:02d}" not in sel or sorted(sel) != sorted(gs_cases(n)):
            e.append(f"Q26: GS.{n:02d} must select only its own scenario cases")
        bars = next(r[5] for r in GOLDEN_SCENARIOS if r[0] == n)
        if o["thresholds"] != bars + ["T-RUNS"] or o["closure"]["params"].get("scenario") != f"GS-{n:02d}" or o["closure"]["params"].get("evidenceMeasurement") != f"GS-{n:02d}":
            e.append(f"Q26: GS.{n:02d} must bind its own bars and evidence")
    used_rules = {r for o in OBL for r in o["closure"]["rules"]}
    covered = {r for x in EVALUATOR_COUNTEREXAMPLES for r in x["defeats"]}
    if used_rules - covered:
        e.append(f"Q26: closure rules without an evaluator counterexample: {sorted(used_rules - covered)}")
    # Q27
    hf = THRESHOLDS["NS-P4-HISTORY-FLATNESS"]["unit"]
    if "p99" not in hf or "p50" in hf or "1,000 subjects" not in hf:
        e.append("Q27: history flatness must be p99 on the matched 1,000-subject sample")
    # Q28
    if COMPOSITION["assignments"] != ["source", "current", "history", "analytics"]:
        e.append("Q28: four assignments")
    for f in ("composition", "replicationEdges", "watermarks"):
        if f not in RECEIPT_SCHEMA["fields"]:
            e.append(f"Q28: receipt field {f}")
    if any("engineOfLane" in line for line in STATUS_ALGORITHM):
        e.append("Q28: scope keys must derive from the assignment")
    for o in OBL:
        if o["receiptScope"] == "engine" and o.get("layer") not in COMPOSITION["assignments"]:
            e.append(f"Q28: {o['id']} has no layer")
    for oid in ("G8.composition.watermark-routing", "G7.composition.ack-and-routed-ryow"):
        if oid not in obl:
            e.append(f"Q28/Q31e: {oid} missing")
    # Q29
    if "unchanged as the audit record" not in GOLDEN_RULE or not GOLDEN_RESOLUTIONS or "must agree" not in next(r for r in GOLDEN_RESOLUTIONS if r["vector"] == "Q8F-05").get("refinement", ""):
        e.append("Q29a/b: golden files unchanged and Q8F-05 agreement rule")
    if "default" not in MODE_RULE and "declares at least one mode" not in MODE_RULE:
        e.append("Q29c: single-execution default")
    if any(o["closure"]["modes"] == [] for o in OBL):
        e.append("Q29c: an obligation has no mode")
    if DECIMAL_RULES.get("kernelMaxDigits") != 38 or not {"E-DECIMAL-OVERFLOW", "E-DECIMAL-BARE-DIVIDE", "E-DECIMAL-FRACTION", "E-DECIMAL-NARROWING"} <= {x["id"] for x in ERROR_TABLE}:
        e.append("Q29d: provisional decimal values")
    for oid in ("G9.erasure.visibility-boundary", "G9.erasure.restore-reapplies", "G9.erasure.protected-copies"):
        if oid in obl and obl[oid]["profiles"] != ["P-TINY-CONC"] and oid == "G9.erasure.visibility-boundary":
            e.append("Q29e: erasure profile")
    if "P-YEAR-ONE" not in obl["GS.16"]["profiles"]:
        e.append("Q29e: GS.16 at year-one size")
    # Q31a
    p2 = obl["NS.P2"]
    for t, v in (("NS-P2-UNJUSTIFIED-OUTCOMES-MAX", 0), ("NS-P2-QUEUE-MAX-S", 2), ("NS-P2-BURST-DRAIN-S", 60)):
        if THRESHOLDS.get(t, {}).get("value") != v or t not in p2["thresholds"]:
            e.append(f"Q31a: {t} = {v} on NS.P2")
    if "every oracle-valid trace command publishes" not in p2["statement"] or "progress" not in lc["measurements"]["P2"]:
        e.append("Q31a: P2 progress rule")
    # Q31b
    sr = lc["measurements"]["P1"]["splitReads"]
    if "straddle" not in sr["rule"] or "no writes" not in sr.get("driverWrites", "") or "adds no writes" not in obl["NS.P1"]["statement"]:
        e.append("Q31b: split reads straddle trace commands; no driver writes")
    # Q31c
    if POSITION["coordinates"].split(":")[0] != "(stream, epoch, offset, ordinal)" or "lexicographic" not in POSITION["order"] or "fully resolved prefix" not in POSITION["watermark"] or "resolution stream" not in POSITION["aborted"]:
        e.append("Q31c: position coordinates")
    if "consecutive positions in callback order" in s_render_oracle() or "totally ordered coordinates" not in s_render_oracle():
        e.append("Q31c: O-REPLAY position text")
    for fx in ("FX-NESTED-CUTS", "FX-ABORT-GAP", "FX-CRASH-APPEND-RESOLUTION", "FX-RESUME-AT-ABORT-GAP"):
        if fx not in [t for c in obl["G7.position.coordinates"]["cases"] for t in c["select"]]:
            e.append(f"Q31c/Q38a: falsifier {fx} not selected")
    for o in OBL:
        if o["id"].startswith(("NS.", "GS.")) and o["id"] != "NS.calibration" and "GATE-POSITION" not in o["closure"]["params"].get("gates", []):
            e.append(f"Q31c: {o['id']} lacks GATE-POSITION")
    # Q31d
    if THRESHOLDS["T-WATERMARK-WAIT-MS"]["value"] != 10:
        e.append("Q31d: T-WATERMARK-WAIT-MS = 10")
    el = COMPOSITION.get("eligibility", "")
    if not all(x in el for x in ("watermark", "C1", "reconstruct", "erasure")) or "latency counts" not in COMPOSITION["watermarkRouting"] or "surface language" not in COMPOSITION["watermarkRouting"]:
        e.append("Q31d: eligibility and deadline-aware fallback")
    wr = [t for c in obl["G8.composition.watermark-routing"]["cases"] for t in c["select"]]
    for c in ("CO-RECONSTRUCT-OUTSIDE-VALIDITY", "CO-ERASURE-FRONTIER", "CO-EPOCH-MISMATCH", "CO-FALLBACK-LATENCY-COUNTS", "CO-FALLBACK-LANGUAGE", "CO-FALLBACK-SHARE"):
        if c not in wr:
            e.append(f"Q31d: {c} not selected")
    # Q31e
    if "G7.composition.ack-ownership" in obl or "after its own publication" not in COMPOSITION["ackOwnership"] or "only after the current index" in COMPOSITION["ackOwnership"]:
        e.append("Q31e: ACK after source publication with routed read-your-own-write")
    g4b = GS_FAILURE_SCHEDULES[4][0][2]
    if not all(x in g4b for x in ("commits and ACKs continue", "fallback share", "recovery time")):
        e.append("Q31e: GS.04b outage semantics")
    # Q31f
    if not all(k in ERASURE for k in ("frontier", "cacheInvalidation", "keyEvidence")) or "encrypted only under the destroyed key" not in ERASURE["keyEvidence"] or "independently of the requested basis" not in ERASURE["frontier"] or not all(x in ERASURE["reproduction"] for x in ("C6", "raw and native", "SDK", "cursor", "explain")):
        e.append("Q31f: erasure frontier, cache, reproduction scope, key evidence")
    if "modulo erasure" not in obl["G7.journal.logical-contract"]["statement"] or "modulo erasure" not in obl["R.raw.parity"]["statement"] or "G9.erasure.reproduction-modulo" not in obl:
        e.append("Q31f: modulo erasure on C6, raw and native, SDK")
    if "ER-KEY-EXCLUSIVE" not in [t for c in obl["G9.erasure.protected-copies"]["cases"] for t in c["select"]] or "only under the destroyed" not in OBS_PROTOCOLS["OBS-ERASURE-SCAN"]["verdict"]:
        e.append("Q31f: key exclusivity evidence")
    # Q31g
    dw = next(r for r in DECIMAL_SCALE_EVOLUTION if r["id"] == "DS-WIDEN")["rule"]
    dm = next((r["rule"] for r in DECIMAL_SCALE_EVOLUTION if r["id"] == "DS-WIDEN-MIGRATE"), "")
    if "admits every existing value is metadata-only" not in dw or "fails atomically with E-DECIMAL-NARROWING" not in dm:
        e.append("Q31g (as superseded by Q35b): DS-WIDEN and DS-WIDEN-MIGRATE")
    # Q31h
    if "zero duplicate externally visible effects" not in obl["GS.19"]["statement"] or "no duplicate processing" in obl["GS.19"]["statement"]:
        e.append("Q31h: GS.19 wording")
    # Q31i
    for t, v in (("W0-R2-CHANGED-SHARE", 0.20), ("W0-RULE-FIRE-SHARE", 0.05), ("W0-LOCATIONS-100K", 2000), ("W0-LOCATION-ZIPF-S", 0.5), ("W0-MULTI-WORK-ITEM-SHARE", 0.01)):
        if THRESHOLDS.get(t, {}).get("value") != v:
            e.append(f"Q31i: {t} = {v}")
    for o in OBL:
        if "O-DOMAIN" in o["oracles"] and o["id"] != "W0.coverage-floors" and "GATE-W0" not in o["closure"]["params"].get("gates", []):
            e.append(f"Q31i: {o['id']} is domain-dependent but not gated on W0")
    _sums = {ln.split("  ", 1)[1]: ln.split("  ", 1)[0] for ln in (REPO / W0_PIN["hashTable"]).read_text().splitlines() if ln.strip()}
    if W0_PIN["files"] != _sums or len(W0_PIN["files"]) != 146 or "reviewReceipt" not in W0_PIN or sha_file(W0_PIN["hashTable"]) != W0_PIN["hashTableSha256"] or not all(f in W0_PIN["files"] for f in W0_PIN["frozenHashes"]):
        e.append("Q57/V-D01e: W0_PIN must pin exactly the 146 hashes of lab/world/W0/SHA256SUMS, the table's own sha256 and the frozen expected and input hashes")
    if len([f for f in W0_PIN["files"] if f.startswith("lab/world/W0/cases/")]) != 136:
        e.append("V-D01e: W0-1.1.2 holds 136 cases")
    for need in ("lab/world/W0/SPEC.md", "lab/world/W0/schema.json", "lab/world/W0/releases/R1.json", "lab/world/W0/releases/R2.json", "lab/world/W0/releases/R3.json"):
        if need not in W0_PIN["files"] or not any(f.startswith("lab/world/W0/cases/") for f in W0_PIN["files"]):
            e.append(f"Q46c/Q48a: W0_PIN layout names {need} and the case files")
    _rc = json.loads((REPO / "lab/oracles/domain/receipts/population-100k.json").read_text())
    _fpd = W0_PIN["oDomainFingerprint"] or {}
    if W0_PIN["reviewReceipt"] is None or not str(W0_PIN["deltaCheck"]).startswith("ACCEPT") or W0_PIN["commit"][:7] != "fedfcda" or not registered_acceptance(W0_PIN["verifierEntry"], "world", "W0", W0_PIN["commit"]):
        e.append("Q57/V-D01e: W0-1.1.2 accepted at fedfcda through VERIFIER_REGISTRY")
    if (_rc.get("fingerprint") != {"basisTx": _fpd.get("basisTx"), "facts": _fpd.get("facts"), "worlds": "sha256:" + str(_fpd.get("worldsSha256")), **{k: "sha256:" + v for k, v in (_fpd.get("releasesSha256") or {}).items()}}
            or not all(v.get("match") is True for v in _rc.get("expected", {}).values()) or {k: _fpd.get(k) for k in ("basisTx", "facts", "worldsSha256", "releasesSha256")} != {k: W0_FINGERPRINT_CANDIDATE[k] for k in ("basisTx", "facts", "worldsSha256", "releasesSha256")}):
        e.append("Q40g/Q48a: the pinned fingerprint is O-DOMAIN's reproduced receipt and equals V-D01's final fingerprint")
    _fp = W0_PIN["fingerprintCandidate"]
    _vtxt = (REPO / "lab/verify/D01/VERIFY.md").read_text()
    _vtxt = re.sub(r"\s+", " ", _vtxt[_vtxt.index("Final fingerprint"):])
    if not all(_typed(h, "hex64") and f"sha256:{h}" in _vtxt for h in [_fp["worldsSha256"]] + list(_fp["releasesSha256"].values())) or f"basis.tx {_fp['basisTx']:,}; {_fp['facts']:,} facts" not in _vtxt:
        e.append("Q48a: the fingerprint candidate must be V-D01's final fingerprint")
    for f, h in W0_PIN["files"].items():
        if h is None or (REPO / f).exists() is False or sha_file(f) != h:
            e.append(f"Q31i/Q48a: W0_PIN {f} does not match the file")
    # Q31j
    scan = legacy_out_of_range_scan()
    if set(scan) != set(LEGACY_LANE_OUTCOMES):
        e.append(f"Q31j: legacy outcomes differ from the golden scan: missing {sorted(set(scan) - set(LEGACY_LANE_OUTCOMES))}, extra {sorted(set(LEGACY_LANE_OUTCOMES) - set(scan))}")
    for k, v in LEGACY_LANE_OUTCOMES.items():
        if "E-VALUE-OUT-OF-RANGE" not in v["qlever"] or "before any mutation" not in v["qlever"] or "commits" not in v["xtdb"]:
            e.append(f"Q31j: {k} lane outcomes")
    # Q30 (via Q32a)
    if [r["id"] for r in WIRE_RULES] != ["WR-JSON", "WR-INSTANT", "WR-X-ENCODINGS", "WR-Q-SHADOW", "WR-INTEGER-RANGE"]:
        e.append("Q30: the five wire rules")
    wj = WIRE_RULES[0]["rule"]
    if not all(x in wj for x in ("-0", "non-finite", "before CanonicalJson", "inexact-json-number", "List and Struct")):
        e.append("Q30a: JSON guard rule")
    if "-0" not in WIRE_RULES[1]["rule"] or "never turned into 0" not in WIRE_RULES[1]["rule"]:
        e.append("Q30b: instant -0")
    if not all(x in WIRE_RULES[2]["rule"] for x in ("ARRAY[CAST(? AS <type>) ...]", "read as text", "any other encoding fails")):
        e.append("Q30c: XTDB pinned encodings")
    if not all(x in WIRE_RULES[3]["rule"] for x in ("not -0", "%.13g", "same bits", "+/-2^59", "lexical channel is authoritative")):
        e.append("Q30d: QLever shadow rule")
    if "safe-integer domain" not in WIRE_RULES[4]["rule"]:
        e.append("Q30e: integer range rule")
    for oid, eps in (("G1.wire.write-guards", {"EP-WRITER", "EP-BULK", "EP-REPLAY"}), ("G1.wire.xtdb-encodings", set()), ("G1.wire.qlever-shadow", set())):
        if oid not in obl or not eps <= set(obl[oid]["entrypoints"]):
            e.append(f"Q30: {oid}")
    if obl.get("G1.wire.xtdb-encodings", {}).get("lanes") != X or obl.get("G1.wire.qlever-shadow", {}).get("lanes") != Q:
        e.append("Q30: lane scope of the encoding and shadow obligations")
    for r in WIRE_RULES:
        sel = {t for oid in ("G1.wire.write-guards", "G1.wire.xtdb-encodings", "G1.wire.qlever-shadow") for c in obl[oid]["cases"] for t in c["select"]}
        for c in r["cases"]:
            if c not in sel:
                e.append(f"Q30: case {c} not selected")
    # Q32b
    if "EXP-G02" not in LEGACY_RULE or not any("EXP-G02" in row[2] for row in CHANGELOG_033):
        e.append("Q32b: EXP-G02 follow-up recorded")
    # Q32c
    ic = WRITER_TRACE["generator"].get("invalidCommands", {})
    if not isinstance(ic, dict) or ic.get("share") != 0.001 or "marked" not in ic.get("rule", ""):
        e.append("Q32c: 0.1% marked invalid trace commands")
    # Q32d
    if "divided by the steady offered rate" not in THRESHOLDS["NS-P2-QUEUE-MAX-S"]["unit"] or "back within" not in THRESHOLDS["NS-P2-BURST-DRAIN-S"]["unit"]:
        e.append("Q32d: queue depth definition")
    # Q38a (replaces Q32e and Q34a): no density exemption
    for k, comp in A0_CONTROLS.items():
        if set(position_selection(comp)) != set(POSITION_REQUIRED_CASES):
            e.append(f"Q38a: {k} must run the four falsifiers")
    for comp in ({"source": "xtdb", "positionsDense": True}, dict(OUTSIDE_BLOCK_MUTATION_FIXTURE, allocatorBlocks=OUTSIDE_BLOCK_MUTATION_FIXTURE["unchangedBlockHashes"])):
        if not set(POSITION["falsifiers"]) <= set(position_selection(comp)):
            e.append("Q38a: declared density or matching block hashes must never skip the falsifiers")
    gpc = obl["G7.position.coordinates"]
    static = [t for c in gpc["cases"] for t in c["select"]]
    if sorted(static) != sorted(POSITION_REQUIRED_CASES) or "conditionalSelection" in gpc["closure"]["params"]:
        e.append("Q38a: G7.position.coordinates selects all required cases unconditionally")
    if "M-WITHTRANSACTION-REBIND" not in gpc["mutationControls"] or MUTANTS["M-WITHTRANSACTION-REBIND"]["targets"] != ["CS-POSITION:FX-NESTED-CUTS"]:
        e.append("Q38a: the outside-block mutation must be a mutant the falsifiers kill")
    if "A0 included" not in GATES["GATE-POSITION"]["rule"] or "allowlist" not in GATES["GATE-POSITION"]["rule"] or any(k in globals() for k in ("A0_ALLOCATOR_ALLOWLIST", "density_proven")):
        e.append("Q38a: the allowlist must be gone and GATE-POSITION must cover A0")
    if len(OUTSIDE_BLOCK_MUTATION_FIXTURE["unchangedBlockHashes"]) != 5 or "withTransaction" not in OUTSIDE_BLOCK_MUTATION_FIXTURE["mutation"]:
        e.append("Q38a: outside-block mutation fixture")
    # Q34b
    ar = obl["G7.composition.ack-and-routed-ryow"]
    sel = {t for c in ar["cases"] for t in c["select"]}
    if "EP-NATIVE" not in ar["entrypoints"] or ar["receiptScope"] != "lane" or not {"CO-RYOW-PER-SURFACE", "CO-STALE-FALLBACK-REJECTED", "CO-CROSS-LANGUAGE-RECIPE-IDENTITY"} <= sel:
        e.append("Q34b: outage RYOW on every serving surface with stale-fallback rejection and recipe identity")
    if "semantic query identity" not in COMPOSITION.get("fallbackEquivalence", "") or "semanticQueryId" not in RECEIPT_SCHEMA["fields"]["watermarks"] or "native included" not in GS_FAILURE_SCHEDULES[4][0][2]:
        e.append("Q34b: semantic query identity recorded and GS.04b on native surfaces")
    # Q34c
    if "user JSON only" not in WIRE_RULES[0]["rule"] or "WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP" not in WIRE_RULES[0]["cases"] or "WIRE-JSON-NEGZERO" not in WIRE_RULES[0]["cases"]:
        e.append("Q34c: guard on user JSON only, with the paired test")
    if "WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP" not in {t for c in obl["G7.journal.logical-contract"]["cases"] for t in c["select"]} or "M-JSON-GUARD-ON-JOURNAL" not in obl["G1.wire.write-guards"]["mutationControls"]:
        e.append("Q34c: journal side of the paired test")
    # Q38b, Q42a, Q47, Q55a: claim admission only from the evaluator's own qualification run
    def _h(b_):
        return hashlib.sha256(b_).hexdigest()

    def _comp(slot="dev", variant="engine-source", log=None):
        c_ = {k: {"engine": "xtdb", "imageDigest": IMAGE_PINS["xtdb"]["imageId"], "configSha256": "bb", "slot": slot} for k in COMPOSITION["assignments"]}
        c_["source"]["variant"] = variant
        if log is not None:
            c_["source"]["log"] = log
        return c_
    BIN = {"t1": _h(b"candidate build"), "t0": _h(b"A0 build")}
    used = ["G1.found.unchanged44", "G7.position.coordinates", "G10.composition.identity-bound", "W0.coverage-floors", "NS.P2", "GS.05", "G7.migration.schema-evolution", "G9.erasure.residual-shapes", "G9.erasure.query-semantics", "G1.decimal.channel-routing"]
    tokens = {}
    for oid in used:
        for c in obl[oid]["cases"]:
            tokens.setdefault(c["set"], set()).update(c["select"])

    fault_sets = {c["set"] for oid in used if "CR-FAULT" in obl[oid]["closure"]["rules"] for c in obl[oid]["cases"]}
    INPUTS = {}

    def _manifest(set_, drop=(), mutate=None):
        cs_ = []
        for t in sorted(tokens[set_]):
            if t in drop:
                continue
            cid = t if t != "all" else f"{set_}-ANY"
            p_ = f"lab/acceptance/cases/{set_}/{cid}.json"
            INPUTS[p_] = json.dumps({"set": set_, "case": cid}, sort_keys=True).encode()
            x_ = {"id": cid, "tags": [t, "all"], "input": p_, "contentSha256": _h(INPUTS[p_]), "comparator": "CMP-EXACT-VALUE"}
            if set_ in fault_sets:
                x_["faultPoint"] = True
            cs_.append(mutate(x_) if mutate else x_)
        return json.dumps({"format": CASE_MANIFEST["format"], "cases": cs_}, sort_keys=True).encode()
    MAN = {s: _manifest(s) for s in tokens}
    pinned = {s: _h(b_) for s, b_ in MAN.items()}
    wl = {"generatorSourceSha256": "a" * 64, "seed": 1, "offerScheduleSha256": "b" * 64, "window": [0, 600]}
    frozen_t = {"sha256": "a" * 64, "seed": 1, "offerScheduleSha256": "b" * 64}
    spec_t = {"format": BUILD_SPEC["format"], "argv": ["pnpm", "build"], "outputs": ["packages/core/dist/"], "run": ["node", "packages/core/dist/sut.js", "{case}", "{mode}"]}
    REG = {"cpuMax": "max", "cpuset": "2-3", "cpuWeight": 100}

    def _pair(cand, comp, a0bin, a0comp, w):
        return {"mode": "paired-rounds", "design": "duet", "rounds": 12, "workload": dict(w), "slotRegimes": {"candidate": dict(REG), "A0": dict(REG, cpuset="4-5")},
                "perRound": [{"histograms": {"candidate": {"p50": 1}, "A0": {"p50": 2}}, "signals": {"steal": 0}} for _ in range(12)], "window": "GREEN", "accounting": "all-offered",
                "placement": {"candidate": {"slot": comp["source"]["slot"], "cpuset": "2-3", "cpus": 2}, "A0": {"slot": "s2", "cpuset": "4-5", "cpus": 2}}}

    def _arm(m_, a0pl):
        return dict(m_, placement=dict(m_["placement"], A0=a0pl), slotRegimes=dict(m_["slotRegimes"], A0=dict(m_["slotRegimes"]["A0"], cpuset=a0pl["cpuset"])))

    def _wit(oid, binary, comp, case, mode, rep):
        return {"schema": "fault-witness/1", "obligation": oid, "case": case["id"], "mode": mode, "rep": rep, "faultPointId": case["id"], "injectedAt": 1000 + rep, "lastWitnessedTransition": "QT2-LOGGED", "eventsSha256": "e" * 64}

    def _ev(**kw):
        ev_ = {"slots": {"dev", "s2"}, "build": lambda tree, commit: BIN.get(tree), "manifest": lambda s: MAN.get(s), "input": lambda p_: INPUTS.get(p_),
               "oracle": lambda orc, commit, inp: {"exit": 0, "code": None, "output": ["answer", json.loads(inp)["case"]]},
               "sut": lambda binary, comp, case, mode: ["answer", case["id"]] if binary == BIN["t1"] else None,
               "compare": lambda cmp_, exp, obs: exp == obs, "workload": lambda o: dict(wl), "measure_pair": _pair, "witness": _wit}
        ev_.update(kw)
        return ev_
    vreg = dict(VERIFIER_REGISTRY["entries"])
    full_pins = {}
    for k, v in ORACLE_PINS.items():
        full_pins[k] = dict(v, acceptReceipt="R", verifierEntry=f"VT-{k}", commit=v.get("commit") or "c" * 40, sha256=(v["sha256"] if isinstance(v["sha256"], dict) else "c" * 64), excludes=v.get("excludes", []))
    full_pins["O-REPLAY"] = dict(ORACLE_PINS["O-REPLAY"])
    for k in ORACLES:
        if k not in full_pins:
            full_pins[k] = {"sha256": "d" * 64, "acceptReceipt": "R", "verifierEntry": f"VT-{k}", "commit": "d" * 40}
    runners_t = dict(ORACLE_RUNNERS, **{k: {"argv": ["true", "{case}"], "files": None} for k in ORACLES if k not in ORACLE_RUNNERS})
    for k, v in full_pins.items():
        if k != "O-REPLAY":
            vreg[f"VT-{k}"] = {"subject": {"kind": "oracle", "id": k, "commit": v["commit"]}, "verdict": "ACCEPT (test)"}
    for oid in ("G1.found.unchanged44", "NS.P2", "GS.05", "G7.migration.schema-evolution", "G9.erasure.residual-shapes", "G9.erasure.query-semantics", "G1.decimal.channel-routing"):
        vreg[f"VT-{oid}"] = {"subject": {"kind": "obligation", "id": oid, "commit": "c1"}, "verdict": "ACCEPT (test)"}
    a0_full = {"A0-XTDB": {"commit": "a" * 40, "sourceTreeSha256": "t0", "binarySha256": BIN["t0"], "composition": _comp(slot="s2"), "measuredBy": "VT-A0-XTDB"}, "A0-QLEVER": None}
    vreg["VT-A0-XTDB"] = {"subject": {"kind": "a0", "id": "A0-XTDB", "commit": "a" * 40}, "verdict": "ACCEPT (test)"}
    good = {"obligations": ["NS.P2"], "commit": "c1", "sourceTreeSha256": "t1", "composition": _comp(), "profile": "P-SCREEN"}
    w0_full = dict(W0_PIN, oDomainFingerprint="F")

    def _adm(claim, ev="default", pins=None, a0=None, w0=None, verifiers=None, pinned_=None, over=None):
        cfg_ = dict({"buildSpec": spec_t, "frozenTrace": frozen_t, "oracleRunners": runners_t}, **(over or {}))
        return admit_claim(claim, ev=_ev() if ev == "default" else ev, pins=full_pins if pins is None else pins, a0=a0_full if a0 is None else a0, w0=w0, verifiers=vreg if verifiers is None else verifiers, pinned=pinned if pinned_ is None else pinned_, overrides=cfg_)
    if _adm(good) != "QUALIFIED":
        e.append("Q55a: a claim the evaluator's own run passes, with every oracle pinned and accepted, A0 registered and the obligation verified, must be admitted (positive control)")
    dom = dict(good, obligations=["GS.05"])
    if _adm(dom) != "QUALIFIED":
        e.append("0.3.10: with W0-1.1.2 and the O-DOMAIN fingerprint pinned, a complete domain-dependent claim qualifies against the contract's own W0 pin (positive control)")
    if _adm(dom, w0=w0_full) != "QUALIFIED":
        e.append("Q55a: a domain-dependent claim with W0 pinned and its fingerprint reproduced must be admitted (positive control)")
    logc = _comp(variant="log-source", log={"implementationSha256": "e" * 64, "fsyncMode": "fsync-per-commit", "fullFsync": True, "device": "apfs-nvme0"})
    if _adm(dict(good, composition=logc)) != "QUALIFIED":
        e.append("Q55b: a log-source composition binding its log identity and durability configuration must be admitted (positive control)")
    forged = [{"obligation": "NS.P2", "role": "measurement", "caseResults": [{"case": "INVENTED-1", "selection": "all", "verdict": "PASS"}], "verifier": "V-TEST", "verdict": "ACCEPT"}]
    fail_one = _ev(sut=lambda binary, comp, case, mode: [] if case["id"] == "FX-NESTED-CUTS" else ["answer", case["id"]])
    calls = {}

    def _flaky(binary, comp, case, mode):
        k_ = (case["id"], mode)
        calls[k_] = calls.get(k_, 0) + 1
        return None if calls[k_] == 3 else ["answer", case["id"]]
    refuse_one = _ev(oracle=lambda orc, commit, inp: {"exit": 2, "code": "X-NOT-MODELED", "output": ["answer", json.loads(inp)["case"]]} if json.loads(inp)["case"] == "FX-ABORT-GAP" else {"exit": 0, "code": None, "output": ["answer", json.loads(inp)["case"]]})
    relabel = _ev(build=lambda tree, commit: BIN["t1"] if tree in ("t0", "t1") else None)
    bad_pinned = dict(pinned, **{"CS-POSITION": _h(b"another manifest")})
    short_man = dict(MAN, **{"CS-POSITION": _manifest("CS-POSITION", drop=("FX-NESTED-CUTS",))})
    for bad, why in (
            (_adm(dict(good, receipts=forged), ev=None), "invented, schema-valid records with no evaluator run (CX-R7-INVENTED-EVIDENCE)"),
            (_adm(dict(good, receipts=forged), ev=fail_one), "supplied PASS records while the evaluator's own run fails a case (Q55a)"),
            (_adm(good, pinned_=bad_pinned), "a manifest that does not hash to the pinned one (CX-R7-SELECTION-OVERREACH)"),
            (_adm(good, ev=_ev(manifest=lambda s: short_man.get(s)), pinned_={s: _h(b_) for s, b_ in short_man.items()}), "a selection that resolves to no case in the pinned manifest (Q55a)"),
            (_adm(good, pinned_={}), "case sets with no pinned manifest, as in the contract today (Q55a)"),
            (_adm(dict(good, selection="all", cases=["INVENTED-1"]), ev=fail_one), "a claimant selection or case list (ignored; the evaluator resolves every case) (Q55a)"),
            (_adm(good, ev=refuse_one), "an oracle refusal on one resolved case (Q45b, Q55a)"),
            (_adm(good, ev=_ev(sut=_flaky)), "a fault obligation that fails one of its T-FAULT-REPS repetitions (Q55a)"),
            (_adm(good, ev=_ev(sut=lambda binary, comp, case, mode: None if mode == "reopen" else ["answer", case["id"]])), "a case that fails in one declared mode (Q55a)"),
            (_adm(good, ev=_ev(compare=lambda cmp_, exp, obs: False)), "the declared comparator rejecting the observation (Q55a)"),
            (_adm(good, ev=relabel), "a control whose rebuild does not reproduce the registry's binarySha256 (CX-R7-RELABELLED-CONTROL)"),
            (_adm(good, ev=_ev(build=lambda tree, commit: None)), "a declared tree the evaluator cannot build (Q55a)"),
            (_adm(good, a0={"A0-XTDB": None, "A0-QLEVER": None}), "a comparison while the A0 registry entry is null (Q46b, Q47b)"),
            (_adm(dict(good, control={"sourceTreeSha256": "t1"}), a0={"A0-XTDB": dict(a0_full["A0-XTDB"], binarySha256=BIN["t1"])}), "a registry entry whose binary is not the rebuild of its tree (Q55a)"),
            (_adm(good, verifiers={k: v for k, v in vreg.items() if k != "VT-NS.P2"}), "a claim whose obligation has no VERIFIER_REGISTRY verification (Q55a)"),
            (_adm(dict(good, verifier={"verifier": "V-TEST", "verdict": "ACCEPT"}), verifiers={k: v for k, v in vreg.items() if k != "VT-NS.P2"}), "a verifier record carried in the claim (Q55a)"),
            (_adm(good, pins=dict(full_pins, **{"O-REPLAY": dict(full_pins["O-REPLAY"], commit="f" * 40)})), "an oracle pin whose commit no VERIFIER_REGISTRY entry accepts (Q55a)"),
            (_adm(good, pins=dict(full_pins, **{"O-REPLAY": dict(full_pins["O-REPLAY"], verifierEntry="V-O03")})), "an oracle pin naming the superseded verification (Q55a)"),
            (_adm(good, pins=dict(full_pins, **{"O-REPLAY": dict(full_pins["O-REPLAY"], acceptReceipt=None)})), "a claim while O-REPLAY's pin is null (Q37b)"),
            (_adm(good, pins=dict(full_pins, **{"O-REPLAY": dict(full_pins["O-REPLAY"], excludes=["NS.P2"])})), "a claim on an obligation in the pin's excludes (Q45a)"),
            (_adm(dict(good, composition=_comp(slot="other"))), "an unregistered slot (Q55a)"),
            (_adm(good, ev=_ev(workload=lambda o: dict(wl, window=[600, 0]))), "a workload window that is not ordered (Q47b)"),
            (_adm(dict(good, receipts=forged, compositionBound=True, positionCasesClosed=POSITION_REQUIRED_CASES), ev=None), "supplied case names or Booleans with no evaluator run (Q38b)"),
            (_adm(dict(good, composition=_comp(variant=None))), "a composition that does not declare its source variant (Q55b)"),
            (_adm(dict(good, composition=_comp(variant="log-source"))), "a log source without its log identity and durability configuration (Q55b)"),
            (_adm(dict(good, composition=_comp(variant="log-source", log={"implementationSha256": "e" * 64, "fsyncMode": "", "fullFsync": True, "device": "apfs-nvme0"}))), "a log source with an empty fsync mode (Q55b)"),
            (_adm(good, ev=_ev(workload=lambda o: dict(wl, slot="dev"))), "a workload identity carrying a placement field (Q67g)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), placement=dict(_pair(c1, c2, b0, c0, w)["placement"], candidate={"slot": "s9", "cpuset": "2-3", "cpus": 2})))), "a candidate arm placed on another slot than its composition (Q67g)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: _arm(_pair(c1, c2, b0, c0, w), {"slot": "s2", "cpuset": "3-4", "cpus": 2}))), "a duet whose cpusets overlap (Q67g)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: _arm(_pair(c1, c2, b0, c0, w), {"slot": "s2", "cpuset": "4-6", "cpus": 3}))), "a duet with unequal capacity (Q67g)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), placement={"candidate": {"slot": "dev", "cpuset": "2-3", "cpus": 3}, "A0": {"slot": "s2", "cpuset": "4-5", "cpus": 3}}))), "a per-core denominator that is not the cpuset size (Q67g)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), window="RED"))), "a comparison judged in a RED window (CX-PAIR0-UNJUDGED-WINDOW, Q67f)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), accounting="committed-only"))), "committed-only accounting (CX-PAIR0-COMMITTED-ONLY, Q67f)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), rounds=10, perRound=_pair(c1, c2, b0, c0, w)["perRound"][:10]))), "a round count that is not a registered look (Q67f)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), perRound=_pair(c1, c2, b0, c0, w)["perRound"][:11]))), "fewer retained rounds than claimed (Q67f)"),
            (_adm(dict(good, kind="promotion")), "a promotion claim, rejected explicitly until supported (Q67j)"),
            (_adm(good, ev=_ev(workload=lambda o: {k: v for k, v in wl.items() if k != "seed"})), "a workload identity missing a field (Q47b)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), workload=dict(w, seed=2)))), "a comparison measured on another workload (Q47b)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), mode="single-execution"))), "a comparison decided by a single run (CX-PAIR0-SINGLE-RUN, Q60a)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), rounds=4))), "fewer than 8 paired rounds (Q60a)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), slotRegimes={"candidate": dict(REG), "A0": dict(REG, cpuset="4-5", cpuMax="200000 100000")}))), "arms under different slot regimes (CX-PAIR0-REGIME-MISMATCH, Q60c)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: dict(_pair(c1, c2, b0, c0, w), slotRegimes={"candidate": dict(REG, cpuMax="200000 100000"), "A0": dict(REG, cpuset="4-5", cpuMax="200000 100000")}))), "slots under a CPU quota (Q60c)"),
            (_adm(good, ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: None)), "an NS claim with no paired measurement (Q61g)"),
            (_adm(good, over={"frozenTrace": WRITER_TRACE["generator"]["frozen"]}), "a comparison while the trace is not frozen, as in the contract today (Q61h)"),
            (_adm(good, ev=_ev(workload=lambda o: dict(wl, seed=7))), "a workload that is not the frozen trace (Q61h)"),
            (_adm(good, over={"buildSpec": BUILD_SPEC}), "a run while the contract's build spec is null, as today (Q61f)"),
            (_adm(dict(good, composition=dict(_comp(), current=dict(_comp()["current"], imageDigest="sha256:" + "9" * 64)))), "an assignment whose image is not the contract's pin (Q61i)"),
            (_adm(good, a0={"A0-XTDB": dict(a0_full["A0-XTDB"], measuredBy="EXP-N01 (unregistered)")}), "an A0 entry whose measurement is not verified through the registry (Q61k)"),
            (_adm(good, pins={k: v for k, v in full_pins.items() if k != "O-OBS"}), "a claim depending on an unpinned oracle (Q59e)"),
            (_adm(dict(good, obligations=["G1.found.unchanged44"]), pins={k: v for k, v in full_pins.items() if k != "O-TESTKIT"}), "a claim depending on an unpinned EXISTS oracle (Q59e)"),
            (_adm(good, over={"oracleRunners": {k: v for k, v in runners_t.items() if k != "O-REPLAY"}}), "an oracle the contract gives no runner for (Q61c)"),
            (_adm(good, ev=_ev(input=lambda p_: (INPUTS.get(p_) or b"") + b" ")), "a case input that does not hash to its contentSha256 (Q61d)"),
            (_adm(good, ev=_ev(manifest=lambda s: _manifest(s, mutate=lambda x_: {k: v for k, v in x_.items() if k != "contentSha256"}) if s == "CS-POSITION" else MAN.get(s)), pinned_=dict(pinned, **{"CS-POSITION": _h(_manifest("CS-POSITION", mutate=lambda x_: {k: v for k, v in x_.items() if k != "contentSha256"}))})), "a manifest case without contentSha256 (Q61d)"),
            (_adm(good, ev=_ev(witness=lambda oid, binary, comp, case, mode, rep: None)), "fault injections without retained witnesses (Q61j)"),
            (_adm(good, ev=_ev(witness=lambda oid, binary, comp, case, mode, rep: dict(_wit(oid, binary, comp, case, mode, rep), faultPointId="OTHER"))), "a fault witness for another fault point (Q61j)"),
            (_adm(dict(good, obligations=["NS.P2", "NS.P9"])), "an unknown obligation id (Q42a)"),
            (_adm(dom, w0=dict(W0_PIN, oDomainFingerprint=None)), "a domain-dependent claim while the fingerprint pin is null (Q48a)"),
            (_adm(dict(dom, oDomainFingerprint="F", w0={"oDomainFingerprint": "F"}), w0=dict(W0_PIN, oDomainFingerprint=None)), "a domain-dependent claim supplying its own fingerprint (Q55e)"),
            (_adm(dom, w0=dict(W0_PIN, verifierEntry="V-D01-W0-1.1.1")), "a W0 pin naming the superseded W0-1.1.1 verification (Q55a)"),
            (_adm(dom, w0=dict(w0_full, verifierEntry="V-O04c")), "a W0 pin whose verifier entry does not accept W0 at its commit (Q55a)"),
            (_adm(dict(good, obligations=["G7.migration.schema-evolution"])), "a CS-MIGRATION claim while the oracle refuses decimal redeclaration (Q47c, Q54a)"),
            (_adm(dict(good, obligations=["G9.erasure.residual-shapes"])), "a claim on the Q52 shapes the pinned oracle refuses (Q56i)")):
        if bad != "DIAGNOSTIC":
            e.append(f"Q55a/Q47: {why} must be a diagnostic")
    if _adm(dict(good, obligations=["G1.found.unchanged44"])) != "QUALIFIED":
        e.append("Q59e: a claim whose oracles are all pinned and registered qualifies (positive control)")
    if _adm(dict(good, obligations=["G9.erasure.query-semantics"]), ev=_ev(measure_pair=lambda c1, c2, b0, c0, w: None, workload=lambda o: None)) != "QUALIFIED":
        e.append("Q61g: a correctness claim needs no workload identity or paired measurement (positive control)")
    if _adm(dict(good, obligations=["G9.erasure.query-semantics"])) != "QUALIFIED" or _adm(dict(good, obligations=["G1.decimal.channel-routing"])) != "QUALIFIED":
        e.append("Q56i: with the pin at a9c1327, G9.erasure.query-semantics and G1.decimal.channel-routing can qualify (positive controls)")
    for cx in ("CX-R7-INVENTED-EVIDENCE", "CX-R7-SELECTION-OVERREACH", "CX-R7-RELABELLED-CONTROL", "CX-R6-UNOPENED-MEANING", "CX-R6-UNMATCHED-CONTROL", "CX-R6-INDIRECT-REFUSAL"):
        if cx not in {x["id"] for x in EVALUATOR_COUNTEREXAMPLES}:
            e.append(f"Q55a/Q47: counterexample {cx} is recorded")
    # retained-record re-judging (Q47a, Q54e) stays exact for verifiers re-reading evaluator records
    st = {}

    def _put(b_):
        st[_h(b_)] = b_
        return _h(b_)
    ans = _put(b"answer")
    rec_ok = _put(json.dumps({"schema": "case-result/1", "obligation": "NS.P2", "case": "c", "selection": "c", "oracle": "O-REPLAY", "oracleExit": 0, "oracleCode": None, "expectedSha256": ans, "observedSha256": ans}).encode())
    rec_ref = _put(json.dumps({"schema": "case-result/1", "obligation": "NS.P2", "case": "c", "selection": "c", "oracle": "O-REPLAY", "oracleExit": 2, "oracleCode": "X-NOT-MODELED", "expectedSha256": ans, "observedSha256": ans}).encode())
    rec_wrong = _put(json.dumps({"schema": "case-result/1", "obligation": "NS.P2", "case": "c", "selection": "c", "oracle": "O-REPLAY", "oracleExit": 0, "oracleCode": None, "expectedSha256": ans, "observedSha256": _put(b"other")}).encode())
    st["f" * 64] = st[rec_ok]
    rec_bad = _put(json.dumps({"schema": "case-result/1", "obligation": "NS.P2", "case": "c", "selection": "c", "oracle": "O-REPLAY", "oracleExit": 0, "oracleCode": None, "expectedSha256": ans, "observedSha256": ans, "trusted": True}).encode())
    r2 = {"schema": "case-result/2", "obligation": "NS.P2", "case": "c", "selection": "c", "oracle": "O-REPLAY", "oracleExit": 0, "oracleCode": None, "expectedSha256": ans, "observedSha256": ans, "mode": "current", "rep": 0, "comparator": "CMP-EXACT-VALUE", "inputSha256": ans}
    _r2x = open_record(_put(json.dumps(dict(r2, oracleExit=2)).encode()), st, "case-result/2")
    if open_record(_put(json.dumps(r2).encode()), st, "case-result/2") is None or open_record(_put(json.dumps({k: v for k, v in r2.items() if k != "mode"}).encode()), st, "case-result/2") is not None or _r2x is None or case_verdict(_r2x, st) != "REFUSED":
        e.append("Q61e: case-result/2 adds mode, rep, comparator and inputSha256; a record without them fails closed")
    b12, b21 = _put(b"[1,2]"), _put(b"[2,1]")
    r2b = dict(r2, comparator="CMP-BAG-ROWS", expectedSha256=b12, observedSha256=b21)
    r2o = dict(r2, comparator="CMP-ORDERED-ROWS", expectedSha256=b12, observedSha256=b21)
    r2u = dict(r2, comparator="CMP-NOPE", expectedSha256=b12, observedSha256=b12)
    r1h = {k: v for k, v in r2b.items() if k not in ("mode", "rep", "comparator", "inputSha256")}
    r1h["schema"] = "case-result/1"
    def _cv(rec_, schema_):
        r_ = open_record(_put(json.dumps(rec_).encode()), st, schema_)
        return case_verdict(r_, st) if r_ is not None else "UNOPENED"
    if _cv(r2b, "case-result/2") != "PASS" or _cv(r2o, "case-result/2") != "FAIL" or _cv(r2u, "case-result/2") != "FAIL" or _cv(r1h, "case-result/1") != "FAIL":
        e.append("Q67i/Q71c: case-result/2 verdicts use the declared comparator ([1,2] against [2,1] passes CMP-BAG-ROWS, fails CMP-ORDERED-ROWS); case-result/1 keeps hash equality")
    if case_verdict(open_record(rec_ok, st, "case-result/1"), st) != "PASS" or case_verdict(open_record(rec_ref, st, "case-result/1"), st) != "REFUSED" or open_record(rec_bad, st, "case-result/1") is not None or open_record("0" * 64, st, "case-result/1") is not None or open_record("f" * 64, st, "case-result/1") is not None or case_verdict(open_record(rec_wrong, st, "case-result/1"), st) != "FAIL":
        e.append("Q47a/Q54e: retained records are opened, schema-checked and re-judged (a refusal is never PASS)")
    if set(WORKLOAD_IDENTITY["fields"]) != {"generatorSourceSha256", "seed", "offerScheduleSha256", "window"} or set(EVIDENCE_SCHEMAS) != {"build-manifest/1", "build-manifest/2", "verifier-record/1", "case-result/1", "case-result/2", "fault-witness/1", "oracle-invocation/1"} or [s for s, _ in QUALIFICATION_RUN["steps"]] != ["build", "resolve", "execute", "expect", "compare", "control", "verify", "record"]:
        e.append("Q47/Q55a: workload identity fields, evidence schemas and qualification-run steps")
    if A0_REGISTRY["entries"] != {"A0-XTDB": None, "A0-QLEVER": None} or set(A0_REGISTRY["byEngine"].values()) != set(A0_CONTROLS) or "binarySha256" not in A0_REGISTRY["entryShape"]:
        e.append("Q46b/Q47b/Q55a: the A0 registry exists with null entries and records the rebuild hash")
    if "never from supplied case names or Booleans" not in CLAIM_ADMISSION["rule"] or "O-REPLAY's pin is null" not in CLAIM_ADMISSION["rule"] or "QUALIFICATION_RUN" not in CLAIM_ADMISSION["rule"] or "A0_REGISTRY" not in CLAIM_ADMISSION["rule"] or "X-NOT-MODELED never counts as PASS" not in CLAIM_ADMISSION["rule"] or "VERIFIER_REGISTRY" not in CLAIM_ADMISSION["rule"]:
        e.append("Q38b/Q42a/Q47/Q55a: claim admission rule text")
    # Q35
    for v, k in TDK1["examples"]:
        try:
            if tdk1_encode(v) != k:
                e.append(f"Q35a: TDK1 {v} encodes to {tdk1_encode(v)}, not {k}")
        except ValueError as x:
            e.append(f"Q35a: TDK1 {v}: {x}")
    from fractions import Fraction
    vals = sorted({v for v, _ in TDK1["examples"]}, key=lambda t: Fraction(t))
    keys = [tdk1_encode(v) for v in vals]
    if keys != sorted(keys) or any(not set(k_) <= set(TDK1["alphabet"]) for k_ in keys):
        e.append("Q35a: TDK1 key order must equal numeric order over the alphabet [0-9nopz]")
    for bad in ("-0", "-0.00", "+1", "01", "1.", ".5", "1e3", " 1"):
        try:
            tdk1_encode(bad)
            e.append(f"Q35a: TDK1 must refuse {bad!r}")
        except ValueError:
            pass
    if TDK1["channel"] != "decimal_order_v1" or "never concatenated" not in TDK1["useConstraints"] or "prefix" not in TDK1["useConstraints"]:
        e.append("Q35c/d: channel name and use constraints")
    if "TDK1" not in DECIMAL_RULES["storage"][0]["as"] or "one stored representation" not in DECIMAL_RULES["oneRepresentation"].replace("exactly one", "one") and "exactly one stored representation" not in DECIMAL_RULES["oneRepresentation"]:
        e.append("Q35b: one representation")
    if any(x["id"] == "E-DECIMAL-UNREPRESENTABLE" for x in ERROR_TABLE) or not {"E-DECIMAL-OVERFLOW", "E-DECIMAL-FRACTION", "E-DECIMAL-NARROWING", "E-DECIMAL-BARE-DIVIDE"} <= {x["id"] for x in ERROR_TABLE}:
        e.append("Q35e: decimal error names")
    for vid, t in TDK1_TESTS.items():
        if t["obligation"] not in obl or t["case"] not in {x for c in obl[t["obligation"]]["cases"] for x in c["select"]}:
            e.append(f"Q35: {vid} obligation {t['obligation']} missing or not selecting {t['case']}")
    if "GATE-TDK1-VECTORS" not in obl["G1.decimal.tdk1-differential"]["closure"]["params"].get("gates", []) or TDK1_VECTOR_PIN["sha256"] is not None and not (REPO / TDK1_VECTOR_PIN["file"]).exists():
        e.append("Q35: V5 vector pin gate")
    if "metadata-only" not in next(r for r in DECIMAL_SCALE_EVOLUTION if r["id"] == "DS-WIDEN")["rule"] or "value alone" not in next(r for r in DECIMAL_SCALE_EVOLUTION if r["id"] == "DS-WIDEN")["rule"]:
        e.append("Q35b: widening that admits every value is metadata-only")
    # Q33
    q33_ids = {r["id"] for r in Q33_RULES}
    for need in ("R-VAL-7a", "R-DEC-0", "R-DEC-1", "R-DEC-2", "R-DEC-3", "R-DEC-5", "R-DEC-6", "R-DEC-7", "R-LANE-2", "R-CMP-3", "R-NUM-7", "R-NUM-8", "R-AGG-5", "R-CMD-9", "R-CMD-12", "R-JNL-5", "R-JNL-6", "R-JNL-7", "R-CUT-3", "R-PAGE-3", "R-PAGE-4"):
        if need not in q33_ids:
            e.append(f"Q33: {need} missing")
    for r in Q33_RULES:
        if r["error"] not in ("-",) and r["error"] not in {x["id"] for x in ERROR_TABLE}:
            e.append(f"Q33: {r['id']} names unknown error {r['error']}")
        if not any(r["case"] in c["select"] for o in OBL for c in o["cases"]):
            e.append(f"Q33: case {r['case']} of {r['id']} not selected")
    if "read back as written" not in WIRE_RULES[0]["rule"] or "9007199254740993" not in WIRE_RULES[0]["rule"]:
        e.append("Q33a: read-back-as-written refines Q30a")
    if not any(c["id"] == "CMP-CROSS-FAMILY-ORDERED" and "E-MIXED-FAMILY" in c["rule"] and "never false" in c["rule"] for c in COMPARISON_RULES):
        e.append("Q33d: ordered cross-family comparison is E-MIXED-FAMILY")
    if next(r for r in Q33_RULES if r["id"] == "R-PAGE-4")["error"] != "E-CURSOR" or "other-query" not in next(r for r in Q33_RULES if r["id"] == "R-PAGE-4")["rule"] or "malformed" not in next(r for r in Q33_RULES if r["id"] == "R-JNL-7")["rule"]:
        e.append("Q33g/h: pagination reasons")
    if [x["compiled"]["reason"] for x in Q33I_CURSOR_READINGS] != ["other-query", "other-query"]:
        e.append("Q33i: G10-CUR-01 E1/E2 readings")
    only_q33 = sorted(set(Q33I_QLEVER_REJECTED) - set(LEGACY_LANE_OUTCOMES))
    only_q31 = sorted(set(LEGACY_LANE_OUTCOMES) - set(Q33I_QLEVER_REJECTED))
    if only_q33 or only_q31:
        e.append(f"Q33i: lists differ; only in Q33i: {only_q33}; only in Q31j: {only_q31}")
    # Q36
    if THRESHOLDS["W0-LOCATION-ZIPF-S"]["value"] != 0.5 or "s = 0.5" not in WORLD_W0.get("fanout", ""):
        e.append("Q36g: location fanout Zipf s = 0.5")
    if "(id, publication sequence)" not in WORLD_W0.get("workItemIdentity", "") or "early cutoff" not in WORLD_W0["workItemIdentity"]:
        e.append("Q36a: work item identity and delivery key")
    for where, text in (("GS.19", obl["GS.19"]["statement"]), ("GS-19B", GS_FAILURE_SCHEDULES[19][0][2]), ("NS.P5", obl["NS.P5"]["statement"]), ("load-contract P5", lc["measurements"]["P5"]["publication"])):
        if "(id, publication sequence)" not in text or "(id, version)" in text:
            e.append(f"Q36a/Q38f: {where} must use the delivery key (id, publication sequence)")
    if "early cutoff" not in obl["NS.P5"]["statement"] or "early cutoff" not in lc["measurements"]["P5"]["publication"]:
        e.append("Q36a: early cutoff on P5 publication")
    if "read set contains a changed fact" not in obl["NS.P3"]["statement"] or "read set contains a changed fact" not in lc["measurements"]["P3"]["expectedAffected"]:
        e.append("Q36e: expected affected set")
    # Q32f
    if any(v is not None for v in W0_PIN["files"].values()) and W0_PIN["reviewReceipt"] is None:
        e.append("Q32f: W0 pin set without a V-D01 review receipt")
    if "version bump" not in W0_PIN.get("rule", ""):
        e.append("Q32f: pinning needs a contract version bump")
    # Q38c
    cov = rulings_coverage()
    if cov["recordedNotCompiled"] != EXPECTED_RECORDED_NOT_COMPILED:
        e.append(f"Q38c: RULINGS.md entries not compiled and not listed as recorded-not-compiled: {sorted(set(cov['recordedNotCompiled']) - set(EXPECTED_RECORDED_NOT_COMPILED))}; listed but compiled or absent: {sorted(set(EXPECTED_RECORDED_NOT_COMPILED) - set(cov['recordedNotCompiled']))}")
    if not any(row[0] == "Recorded, not compiled" for row in CHANGELOG_035) or not any(row[0] == "Rulings files" for row in CHANGELOG_036):
        e.append("Q38c: the change log must state the recorded-not-compiled list")
    # Q38d
    dr = obl.get("G1.decimal.channel-routing")
    if not dr or not {"EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"} <= set(dr["entrypoints"]) or "M-DECIMAL-LEXICAL-ORDER" not in dr["mutationControls"]:
        e.append("Q38d: channel routing on repository, native and raw surfaces with the lexical-order mutant")
    for need in ("DR-DERIVED", "DR-AGGREGATE", "DR-KEY-ARITHMETIC", "DR-JSON-OPAQUE", "DR-JSON-CONVERT"):
        if need not in {r["id"] for r in DECIMAL_ROUTING} or (dr and need not in {t for c in dr["cases"] for t in c["select"]}):
            e.append(f"Q38d: {need}")
    agg = next((r["rule"] for r in DECIMAL_ROUTING if r["id"] == "DR-AGGREGATE"), "")
    if not all(x in agg for x in ("decodes", "exactly", "encodes")) or "E-MIXED-FAMILY" not in next((r["rule"] for r in DECIMAL_ROUTING if r["id"] == "DR-KEY-ARITHMETIC"), "") or "validates" not in next((r["rule"] for r in DECIMAL_ROUTING if r["id"] == "DR-JSON-CONVERT"), ""):
        e.append("Q38d: SUM decode-compute-encode, key arithmetic invalid, JSON conversion validates")
    # Q38e, Q37c
    if ORACLES["O-TDK1"]["status"] != "BUILT" or O_TDK1_FILES.get("lab/oracles/decimal/gen_vectors.py") != "b30b430acbfc7476cf47e676d38abaa247d3545b20aac5d481bea67a11cf11e1":
        e.append("Q38e: O-TDK1 BUILT with gen_vectors.py pinned")
    for f, h in O_TDK1_FILES.items():
        if not (REPO / f).exists() or sha_file(f) != h:
            e.append(f"Q38e: pinned O-TDK1 file {f} does not match")
    if TDK1_VECTOR_PIN["sha256"] is not None and TDK1_VECTOR_PIN.get("reviewReceipt") is None:
        e.append("Q38e: the vector pin may be set only with an independent review receipt")
    if (REPO / TDK1_VECTOR_PIN["file"]).exists() and sha_file(TDK1_VECTOR_PIN["file"]) != TDK1_VECTOR_PIN["candidateSha256"]:
        e.append("Q38e: the candidate vector file under review changed")
    if "O-TDK1" not in ORACLE_PINS or ORACLE_PINS["O-TDK1"]["acceptReceipt"] is not None and TDK1_VECTOR_PIN["reviewReceipt"] is None:
        e.append("Q38e: O-TDK1 pinned in ORACLE_PINS, accepted only after review")
    # Q38f
    if OUTBOX["deliveryKey"] != "(id, publication sequence)" or "1650, 1700, 1650" not in OUTBOX["sequence"] or "atomically" not in OUTBOX["atomicity"] or "original identity" not in OUTBOX["recovery"]:
        e.append("Q38f: outbox delivery identity, rollback example, atomic state, crash replay")
    ob = obl.get("G7.outbox.publication-sequence")
    if not ob or not {"OB-RELEASE-ROLLBACK", "OB-CRASH-BEFORE-DELIVERY", "OB-UNCHANGED-ACTIVATION-RECOVERY"} <= {t for c in ob["cases"] for t in c["select"]} or "M-OUTBOX-VERSION-DEDUP" not in ob["mutationControls"]:
        e.append("Q38f: outbox cases and the version-dedup mutant")
    for oid in ("GS.10", "GS.19", "NS.P5"):
        if "(id, publication sequence)" not in obl[oid]["statement"]:
            e.append(f"Q38f: {oid} must use (id, publication sequence)")
    for oid in ("GS.10", "GS.11", "GS.19", "NS.P5"):
        if "(id, version)" in obl[oid]["statement"]:
            e.append(f"Q38f: {oid} still uses (id, version)")
    if "(id, version)" in json.dumps(lc) or "(id, version)" in WORLD_W0["workItemIdentity"] or "(id, version)" in GS_FAILURE_SCHEDULES[19][0][2]:
        e.append("Q38f: (id, version) remains in the load contract, W0 or GS.19b")
    # Q39a, Q39b
    if "KL-X9" not in KNOWN_LIMITS or "text" not in KNOWN_LIMITS["KL-X9"][1] or "M-X-DECIMAL-SUM-BIGINT" not in obl["G5.agg.projection-sums"]["mutationControls"] or "never cast back to BIGINT" not in obl["G5.agg.projection-sums"]["statement"]:
        e.append("Q39a: XTDB DECIMAL sums read as text, with hazard and mutant")
    if "nativeLanguage" not in RECEIPT_SCHEMA["fields"] or "never share an obligation closure" not in LANGUAGE_RULES.get("xtdbNativeLanguage", "") or not any("keyByNativeLanguage" in line for line in STATUS_ALGORITHM):
        e.append("Q39b: XTDB native language recorded and never shared")
    for o in OBL:
        if o["receiptScope"] == "engine" and set(X) <= set(o["lanes"]) and set(o["entrypoints"]) & {"EP-NATIVE", "EP-RAW-HATCH", "EP-RAW-WIRE"} and not o["closure"]["params"].get("keyByNativeLanguage"):
            e.append(f"Q39b: {o['id']} could share XTQL and SQL results")
    # V-O02 C2: a legacy case hidden in a contrastCase or a commandTemplate case is found by the scan
    probe = {"probe.json": {"vectors": [
        {"id": "PROBE-CONTRAST", "commandTemplate": {"expect": {"outcome": "rejected"}}, "cases": [{"case": "bad", "text": "9223372036854775808"}], "contrastCase": {"case": "edge", "text": "-9223372036854775808", "expect": {"outcome": "committed"}}},
        {"id": "PROBE-TEMPLATE", "commandTemplate": {"expect": {"outcome": "committed"}}, "cases": [{"case": "big", "text": "576460752303423488"}, {"case": "small", "text": "5"}]}]}}
    if set(legacy_out_of_range_scan(probe)) != {"PROBE-CONTRAST#edge", "PROBE-TEMPLATE#big"}:
        e.append("V-O02 C2: the legacy scan must read contrastCase and commandTemplate cases")
    if "G1-I64-02#min-exact" not in legacy_out_of_range_scan() or "G1-I64-02#min-exact" not in LEGACY_LANE_OUTCOMES:
        e.append("V-O02 C2: G1-I64-02 min-exact missing from the legacy outcomes")
    # V-O02 C1: O-REPLAY pin
    orp = ORACLES["O-REPLAY"]
    if orp["status"] != "BUILT-ACCEPTED" or orp["files"] != ["lab/oracles/replay/"] or not ORACLE_PINS["O-REPLAY"].get("acceptReceipt", "").startswith("V-O04c"):
        e.append("Q45a/Q56i: O-REPLAY is BUILT-ACCEPTED at lab/oracles/replay/ with acceptance receipt V-O04c")
    # Q45a, Q56i: the 29 pinned hashes match the verifier's file and the tree
    hv = json.loads((REPO / "lab/verify/O02/v-o04b/results/hashes.a9c1327.json").read_text())
    if ORACLE_PINS["O-REPLAY"]["sha256"] != {f["path"]: f["sha256"] for f in hv["files"]} or len(ORACLE_PINS["O-REPLAY"]["sha256"]) != 29 or ORACLE_PINS["O-REPLAY"]["commit"] != hv["commit"] or hv["oracleVersion"] != ORACLE_PINS["O-REPLAY"]["oracleVersion"] or hv.get("onlyInWorkingTree"):
        e.append("Q45a/Q56i: O-REPLAY pin must equal hashes.a9c1327.json (29 files, oracle 0.4.1)")
    if not registered_acceptance(ORACLE_PINS["O-REPLAY"]["verifierEntry"], "oracle", "O-REPLAY", ORACLE_PINS["O-REPLAY"]["commit"]) or not registered_acceptance(ORACLE_PINS["O-REPLAY"]["previousPin"]["verifierEntry"], "oracle", "O-REPLAY", ORACLE_PINS["O-REPLAY"]["previousPin"]["commit"]):
        e.append("Q55a: the O-REPLAY pin and its predecessor are each accepted by a VERIFIER_REGISTRY entry for that commit")
    for vid, v in VERIFIER_REGISTRY["entries"].items():
        if not (REPO / v["brief"]).exists() or sha_file(v["brief"]) != v["briefSha256"] or not re.fullmatch(r"[0-9a-f]{40}", v["commit"]) or not re.fullmatch(r"[0-9a-f]{40}", v["subject"]["commit"]) or not v["branch"].startswith("verify/") or not v["verdict"]:
            e.append(f"Q55a: VERIFIER_REGISTRY {vid} names a brief with its hash, a verify/ branch, a full commit, a subject commit and a verdict")
    drift = [f for f, h in ORACLE_PINS["O-REPLAY"]["sha256"].items() if not (REPO / f).exists() or sha_file(f) != h]
    if drift:
        e.append(f"Q45a: pinned O-REPLAY files differ from the tree: {drift[:3]}")
    if ORACLE_PINS["O-REPLAY"].get("excludes") != [] or ORACLE_PINS["O-REPLAY"]["previousPin"]["excludes"] != ["G1.decimal.channel-routing"]:
        e.append("Q56i: F2 is fixed at a9c1327, so O-REPLAY excludes nothing (8cc2c26 excluded G1.decimal.channel-routing)")
    # Q45a: pin scope versus V-O03's pin_scope.json
    ps = json.loads((REPO / "lab/verify/O02/v-o03/pin_scope.json").read_text())
    sc = oracle_scope("O-REPLAY")
    v_block = {r["id"] for r in ps["blockedRows"]}
    diff = {"onlyGeneratorBlocked": sorted(set(sc["blocked"]) - v_block), "onlyVerifierBlocked": sorted(v_block - set(sc["blocked"])), "onlyGeneratorUses": sorted(set(sc["uses"]) - set(ps["mayCloseIds"]) - v_block), "onlyVerifierUses": sorted((set(ps["mayCloseIds"]) | v_block) - set(sc["uses"]))}
    if diff != PIN_SCOPE_EXPECTED_DIFF:
        e.append(f"Q45a: pin scope differs from pin_scope.json beyond the recorded differences: {diff}")
    # Q45b, Q45c, Q45d
    if "fails closed" not in ORACLE_REFUSAL_RULE or "never treated as a case-authoring error" not in ORACLE_REFUSAL_RULE or "CX-REFUSAL-AS-AUTHORING" not in {x["id"] for x in EVALUATOR_COUNTEREXAMPLES}:
        e.append("Q45b: refusal handling")
    gtd = {t for c in obl["G1.types.decimal"]["cases"] for t in c["select"]}
    if set(TDK1_KEY_BYTE_CASES) & (gtd | set(CS["CS-DECIMAL"]["requiredCases"])) or not set(TDK1_KEY_BYTE_CASES) <= {t for oid in ("G1.decimal.tdk1-admission", "G1.decimal.tdk1-serialization") for c in obl[oid]["cases"] for t in c["select"]}:
        e.append("Q45c: key-byte cases belong to the O-TDK1 obligations, not G1.types.decimal")
    if "p + (s - s_x), capped at 38" not in next(r for r in DECIMAL_OPS if r["id"] == "DO-ROUND")["resultPrecision"]:
        e.append("Q45d: DO-ROUND precision for a larger scale")
    # Q43
    q43 = {r["id"]: r for r in Q43_RULES}
    for rid, err in (("R-DEC-13/16", "E-DECIMAL-OVERFLOW"), ("R-DEC-14", "E-DECIMAL-AVG"), ("R-DEC-12", "E-INTEGER-OVERFLOW"), ("R-CUT-4", "E-NEGATIVE-ZERO-INSTANT")):
        if q43.get(rid, {}).get("error") != err:
            e.append(f"Q43: {rid} must be {err}")
    if "never refused" not in q43.get("R-DEC-11", {}).get("rule", "") or "away from zero" not in q43.get("R-DEC-9", {}).get("rule", "") or "max(1, integer digits + scale)" not in q43.get("R-DEC-8", {}).get("rule", "") or "38" not in q43.get("R-DEC-10", {}).get("rule", ""):
        e.append("Q43: rounding, literal type and expression limit")
    if "E-INTEGER-OVERFLOW" not in next(r for r in DECIMAL_CONVERSIONS if r["id"] == "DC-D2I")["rule"]:
        e.append("Q43g: toInteger overflow in DC-D2I")
    for r in Q43_RULES:
        if not any(r["case"] in c["select"] for o in OBL for c in o["cases"]):
            e.append(f"Q43: case {r['case']} not selected")
    # Q40, Q44
    for k, need in (("ballast", "P4's frozen buckets"), ("twoHopFloor", "J.stateMinWageCents"), ("positionOrdinal", "1-based dense ordinal"), ("generator", "fingerprint"), ("releaseR3", "scoped release"), ("misreadingCases", "must-add")):
        if need not in WORLD_W0.get(k, ""):
            e.append(f"Q40/Q44: WORLD_W0 {k}")
    for k, need in (("publishRule", "reappears after a recorded retirement"), ("basisOrder", "older-basis evaluation publishes nothing"), ("retirement", "new sequence even if the payload equals"), ("liveOnly", "previews (GS.11)"), ("atomicUnit", "one atomic write"), ("receivers", "never regresses"), ("operations", "receive(state, deliveries)")):
        if need not in OUTBOX.get(k, ""):
            e.append(f"Q40/Q42/Q44: OUTBOX {k}")
    if W0_PIN.get("deltaCheck") is not None and W0_PIN.get("reviewReceipt") is None or "oDomainFingerprint" not in W0_PIN:
        e.append("Q40/Q44: W0 pin requires the delta check and the fingerprint reproduction")
    # Q42b, Q42c
    for oid, need in (("G7.outbox.receiver-ordering", set(RECEIVER_CASES)), ("G7.outbox.atomic-unit", set(ATOMIC_UNIT_CASES)), ("G7.outbox.publication-sequence", {"OB-RETIREMENT-REAPPEAR", "OB-OLDER-BASIS-NO-DELIVERY", "OB-CORRECTION-REVERT", "OB-PREVIEW-NOT-PUBLISHED"})):
        if oid not in obl or not need <= {t for c in obl[oid]["cases"] for t in c["select"]}:
            e.append(f"Q42/Q40: {oid} cases")
    if len([c for c in ATOMIC_UNIT_CASES if c.startswith("AU-CRASH-")]) != 10:
        e.append("Q42c: a crash case between every pair of the five transitions")
    if any("O-REPLAY" in obl[oid]["oracles"] for oid in ("G7.outbox.receiver-ordering", "G7.outbox.atomic-unit")):
        e.append("Q45b: outbox steps are never O-REPLAY ops")
    # Q52, Q56
    for k, need in (("inFlight", "never a mix"), ("inFlight", "per commit"), ("queriesResidual", "earliest erasedAt"), ("queriesResidual", "then missing values"), ("queriesResidual", "skipped by ReferenceTarget"), ("queriesResidual", "counts an attribute's erased values as one value"),
                    ("commandShape", "erasure is a typed invalid-command error"), ("selectors", "unknown id is E-INVALID-VALUE"), ("selectors", "{id: ...}"), ("selectors", "erase then delete is supported"), ("presence", "E-CONFLICTING-VALUES"), ("presence", "whatever the erased value was"), ("presence", "Required is satisfied"), ("presence", "after the readable elements"), ("syntheticData", "synthetic values only")):
        if need not in ERASURE.get(k, ""):
            e.append(f"Q52/Q56: ERASURE {k} must say: {need}")
    if "each erased value may be the old value" in json.dumps(ERASURE):
        e.append("Q52e: the per-value in-flight text is replaced")
    for oid, need in (("G9.erasure.commit-semantics", set(ERASURE_Q56_COMMIT_CASES)), ("G9.erasure.query-semantics", set(ERASURE_Q56_QUERY_CASES)), ("G9.erasure.residual-shapes", set(ERASURE_RESIDUAL_CASES) | {"DR-JSON-CONVERT-ROUNDING"})):
        if oid not in obl or not need <= {t for c in obl[oid]["cases"] for t in c["select"]}:
            e.append(f"Q52/Q56: {oid} selects {sorted(need)}")
    if ERASURE_Q56_COMMIT_CASES != ["ER-ERASE-UNKNOWN-TARGET", "ER-ERASE-BY-ID", "ER-RETRACT-AFTER-ERASE"] or ERASURE_Q56_QUERY_CASES != ["ER-CARD-ONE-READABLE-AND-ERASED", "ER-EQUAL-SUPPORT-ERASED-CONFLICTS", "ER-CARD-MANY-MARKERS-LAST", "ER-REQUIRED-SATISFIED"] or len(ERASURE_RESIDUAL_CASES) != 6:
        e.append("Q52/Q56: one named case per ruling")
    if "DR-JSON-CONVERT-ROUNDING" in {t for c in obl["G1.decimal.channel-routing"]["cases"] for t in c["select"]} or "all" in {t for c in obl["G1.decimal.channel-routing"]["cases"] for t in c["select"]}:
        e.append("Q52f: channel-routing never reaches the refused rounding form")
    _scope = oracle_scope("O-REPLAY")
    for oid in ("G9.erasure.visibility-boundary", "G9.erasure.protected-copies", "G9.erasure.restore-reapplies", "G9.erasure.reproduction-modulo", "G9.erasure.commit-semantics", "G9.erasure.query-semantics", "REQ.pii-erasure", "GS.16", "G7.journal.logical-contract", "G10.cursor.stable", "NS.SEC.retro-and-audit", "G8.composition.watermark-routing", "G1.decimal.channel-routing"):
        if oid in _scope["blocked"]:
            e.append(f"Q56i: {oid} may close on the oracle side at a9c1327 (blocked by {_scope['blocked'][oid]})")
    if _scope["blocked"].get("G9.erasure.residual-shapes") != ["q52-shapes"]:
        e.append("Q56i: G9.erasure.residual-shapes is blocked by the q52-shapes refusal")
    # Q64f: a pending sub-id never also appears as a RULINGS.md row (a pending sub-id under a compiled base is allowed)
    _clash = pending_row_clash(pending_ruling_ids(), rulings_md_ids())
    if pending_row_clash(["Q51b", "Q99a"], ["Q51a", "Q99a"]) != ["Q99a"]:
        e.append("Q64f: the pending-row clash check finds a row both pending and in RULINGS.md")
    if _clash:
        e.append(f"Q64f: pending rows also present in RULINGS.md: {_clash}")
    # Q63, Q65, Q66, Q67, Q68, Q69, Q71, Q72f
    _ed = COMPOSITION["experimentDirections"]
    if "broker-fed" not in _ed.get("P1-replicas", "") and "fed by the broker" not in _ed.get("P1-replicas", ""):
        e.append("Q63b: P1 through broker-fed replicas")
    if "parameterised statements only" not in COMPOSITION.get("parameterisedSql", "") or "rejected for promotion" not in COMPOSITION.get("sharedVolumeFollower", "") or "nothing is filed without him" not in COMPOSITION.get("sharedVolumeFollower", ""):
        e.append("Q63a/c/d: follower rejected, upstream filing for Sam, parameterised SQL")
    _spec_t = {"format": BUILD_SPEC["format"], "argv": ["a"], "outputs": ["p/dist/"], "run": ["r"]}
    if build_spec_sha256(_spec_t) != hashlib.sha256(json.dumps({k: _spec_t[k] for k in ("format", "argv", "outputs", "run")}, sort_keys=True, separators=(",", ":")).encode()).hexdigest() or "parent directory of a dist/ output" not in BUILD_SPEC["inputs"] or "first select entry in contract order" not in EVIDENCE_SCHEMAS["case-result/2"]["rule"]:
        e.append("Q65b/c/d: buildSpecSha256, case-result/2 selection and built packages")
    if (REPO / "packages/qualification/workloads/obl-case.ts").exists() != (BUILD_SPEC["argv"] is not None) or "obl-case.ts" not in BUILD_SPEC["proposal"]["pinWhen"]:
        e.append("Q65e: the build spec is pinned exactly when obl-case.ts exists")
    if "EXP-G03" not in json.dumps(QUALIFICATION_RUN["blockers"]) or "every blocker stays until EXP-G03's executing gate exists" not in QUALIFICATION_RUN["blockers"]["rule"]:
        e.append("Q65f/Q67a: the blockers stay until EXP-G03's executing gate")
    if "n + 1 prefixes" not in ERASURE["inFlight"] or "same prefix" not in ERASURE["inFlight"] or "own scope" not in ERASURE["inFlight"] or ERASURE_Q66_CASES != ["ER-INFLIGHT-PREFIXES", "ER-CURSOR-ERASURE-PREFIX"] or not set(ERASURE_Q66_CASES) <= {t for c in obl["G9.erasure.residual-shapes"]["cases"] for t in c["select"]} or "Q66d" not in next((r["rule"] for r in DECIMAL_ROUTING if r["id"] == "DR-JSON-STRING-TEXT"), ""):
        e.append("Q66: prefix semantics, cursor prefixes and scope, residual cases, the explicit conversion as a lane obligation")
    _er = QUALIFICATION_RUN
    if set(_er["executionIdentity"]["fields"]) != {"sourceTreeSha256", "buildSpecSha256", "lockfileSha256", "toolchain", "runnerSha256", "configSha256"} or "never by output hash" not in _er["executionIdentity"]["rule"] or "pnpm version" not in _er["executionIdentity"]["toolchain"] or "oracle-invocation/1" not in _er["executionIdentity"]["toolchain"] or "read-only copy re-hashed" not in _er["isolation"] or "rejected explicitly" not in _er["kinds"]:
        e.append("Q67b/e/j, Q71b: execution identity, toolchain, isolation and claim kinds")
    if BUILD_SPEC.get("installMetadataExclusions") is not None or "two clean installs" not in BUILD_SPEC.get("installMetadataRule", "") or "installMetadataExclusions" not in _er["executionIdentity"]["installMetadata"]:
        e.append("Q71a: the install-metadata exclusion list is a contract-owned rule, null until two clean installs are diffed")
    if "(incarnation, marker) is equal before and after" not in COMPOSITION.get("incarnationFencing", "") or Q67_CASES != ["CO-RESET-DURING-QUERY", "CO-TYPED-ERROR-SHAPE"] or not set(Q67_CASES) <= {t for c in obl["G7.composition.ack-and-routed-ryow"]["cases"] for t in c["select"]} or "NS-P3-SOURCE-PREFIX-ENUMERATED" not in {t for c in obl["NS.P3"]["cases"] for t in c["select"]} or "never a feed defect" not in build_load_contract()["measurements"]["P3"].get("publicationEnumeration", ""):
        e.append("Q67c/d: incarnation fencing and P3 source-prefix enumeration")
    if any("shape" not in x for x in ERROR_TABLE if x["id"] in ("E-BASIS-NOT-AVAILABLE", "E-REPLICA-UNAVAILABLE")) or "{required, observed, replica}" not in ERROR_REPRESENTATION:
        e.append("Q67h: one error representation")
    if "E-UNAVAILABLE-CUT" in {x["id"] for x in ERROR_TABLE} or any(x["error"] == "E-UNAVAILABLE-CUT" for x in CURSOR_TRANSITIONS["permittedErrors"]) or any("E-UNAVAILABLE-CUT" in o["statement"] for o in OBL) or "E-UNAVAILABLE-CUT" in json.dumps(COMPOSITION) or next(x for x in CURSOR_TRANSITIONS["permittedErrors"] if x["id"] == "CE-FUTURE-BASIS")["error"] != "E-BASIS-NOT-AVAILABLE" or RETIRED_ERRORS.get("E-UNAVAILABLE-CUT", {}).get("replacedBy") != "E-BASIS-NOT-AVAILABLE":
        e.append("Q72f: E-UNAVAILABLE-CUT retired; E-BASIS-NOT-AVAILABLE is the only id")
    if OUTBOX.get("sweepFrameMaxResults") != 64 or "own delivery identity" not in OUTBOX.get("sweepFrames", "") or "route = host" not in build_load_contract()["measurements"]["P4"].get("hostServedReads", "") or "Q58e's per-subject keys" not in ERASURE.get("currentCopies", "") or "24 hours" not in COMPOSITION["currentPath"]["horizon"] or "H <= B <= W" not in _ed.get("EXP-P4", ""):
        e.append("Q68: current path, horizon, sweep frames, host-served reads and current-copy erasure")
    if not all(k in PAIR_0 for k in ("windowProcedure", "verdicts", "aaInAbMode", "continuousTrace", "liveComposition", "calibration")) or PAIR_0["screeningSeries"]["fallback"]["name"] != "screening-r4" or "public-queued" not in PAIR_0["liveComposition"] or set(WRITER_TRACE["generator"]["frozenScreening"]) != {"screening-burst-180", "screening-r4", "rule"}:
        e.append("Q69, Q64b: PAIR-0 decisions and frozen screening series")
    # 0.3.10: O-DOMAIN pin, O-CONTRACT runner, closability
    _od = ORACLE_PINS.get("O-DOMAIN", {})
    if ORACLES["O-DOMAIN"]["status"] != "BUILT-ACCEPTED" or _od.get("commit") != "5d1fd1a3a60c01e5b5fc5d210ea0b3098074e3b9" or not registered_acceptance(_od.get("verifierEntry"), "oracle", "O-DOMAIN", _od.get("commit")) or len(_od.get("sha256", {})) != 7:
        e.append("V-D01c: O-DOMAIN BUILT-ACCEPTED and pinned at 5d1fd1a with 7 hashes through VERIFIER_REGISTRY")
    _drift = [f for f, h in _od.get("sha256", {}).items() if not (REPO / f).exists() or sha_file(f) != h]
    if _drift or set(_od.get("sha256", {})) != {"lab/oracles/domain/" + p.relative_to(REPO / "lab/oracles/domain").as_posix() for p in (REPO / "lab/oracles/domain").rglob("*") if p.is_file() and "__pycache__" not in p.parts}:
        e.append(f"V-D01c: pinned O-DOMAIN files differ from the tree: {_drift[:3]}")
    _dom_scope = oracle_scope("O-DOMAIN")
    if len(_dom_scope["uses"]) != 26 or _dom_scope["blocked"]:
        e.append(f"0.3.10: the 26 obligations declaring O-DOMAIN are closable on the O-DOMAIN side ({len(_dom_scope['uses'])} uses, {len(_dom_scope['blocked'])} blocked)")
    if any("w0-pin" in contract_blockers(o) for o in OBL):
        e.append("0.3.10: the W0 pin is complete")
    if "decodedInputArgv" not in ORACLE_RUNNERS.get("O-DOMAIN", {}) or "does not read the inputBase64 form" not in ORACLE_RUNNERS["O-DOMAIN"].get("decodedInputRule", "") or "C91, C92 and C128" not in ORACLE_RUNNERS["O-DOMAIN"].get("decodedInputRule", "") or "O-CONTRACT" not in ORACLE_RUNNERS:
        e.append("Q65a/V-D01c: O-DOMAIN and O-CONTRACT runner entries")
    _cfg = {"composition": COMPOSITION, "compositionFields": list(COMPOSITION_FIELDS), "sourceVariantFields": {k: list(v) for k, v in SOURCE_VARIANT_FIELDS.items()}, "logFields": LOG_FIELDS, "imagePins": IMAGE_PINS}
    _good = {k: {"engine": "xtdb", "imageDigest": IMAGE_PINS["xtdb"]["imageId"], "configSha256": "bb", "slot": "dev"} for k in COMPOSITION["assignments"]}
    _good["source"]["variant"] = "engine-source"
    _probes = [_good, dict(_good, history={"engine": "xtdb", "imageDigest": IMAGE_PINS["xtdb"]["imageId"], "configSha256": "bb"}), dict(_good, current=dict(_good["current"], imageDigest="sha256:" + "9" * 64)),
               dict(_good, source=dict(_good["source"], variant="log-source", log={"implementationSha256": "e" * 64, "fsyncMode": "full", "fullFsync": True, "device": "nvme"})),
               dict(_good, source=dict(_good["source"], variant="log-source")), dict(_good, source=dict(_good["source"], variant="log-source", log={"implementationSha256": "e" * 64, "fsyncMode": "", "fullFsync": "yes", "device": "nvme"})), dict(_good, source={k: v for k, v in _good["source"].items() if k != "variant"}), "not a composition"]
    for pc in _probes:
        ans_ = json.loads(contract_oracle_answer(json.dumps({"composition": pc}).encode(), json.loads(json.dumps(_cfg))))
        want_b = composition_ok(pc)
        want_p = want_b and all(pc[k]["imageDigest"] == IMAGE_PINS[pc[k]["engine"]]["imageId"] for k in pc)
        if ans_["bound"] != want_b or ans_["imagesPinned"] != want_p:
            e.append("Q65a: the O-CONTRACT runner agrees with composition_ok and the image pins on every probe")
            break
    # Q61a-k, Q59a-f
    if ORACLE_RUNNERS["O-REPLAY"]["argv"] != ["python3", "-I", "lab/oracles/replay/cli.py", "{case}"] or "commandOutcomes, state and queries" not in ORACLE_ANSWER_RULE or "exit 2" not in ORACLE_ANSWER_RULE or ANSWER_MEMBERS["O-REPLAY"] != ["commandOutcomes", "state", "queries"]:
        e.append("Q61c: oracleRunners with O-REPLAY's default argv and the answer-extraction rule")
    if CASE_MANIFEST["required"] != ["id", "tags", "input", "contentSha256", "comparator"] or CASE_MANIFEST["optional"] != ["oracle", "faultPoint"] or CASE_MANIFEST["format"] != "triplex-db-2/case-manifest/1":
        e.append("Q61d: case-manifest fields pinned")
    if any(BUILD_SPEC[k] is not None for k in ("argv", "outputs", "run")) or "build-manifest/2" not in EVIDENCE_SCHEMAS or "inputs" not in EVIDENCE_SCHEMAS["build-manifest/2"]["fields"]:
        e.append("Q61f: the build spec is a contract input (null until specified) and build-manifest/2 carries the build inputs")
    if "CR-NS or CR-GS" not in WORKLOAD_IDENTITY.get("appliesTo", ""):
        e.append("Q61g: workload identity only for CR-NS and CR-GS")
    _fz = WRITER_TRACE["generator"].get("frozen", {})
    if set(_fz) != {"sha256", "seed", "offerScheduleSha256", "rule"} or any(_fz[k] is not None for k in ("sha256", "seed", "offerScheduleSha256")) or "frozen" not in build_load_contract()["writerTrace"]["generator"]:
        e.append("Q61h: writerTrace.generator.frozen {sha256, seed, offerScheduleSha256}, a required null input")
    try:
        _slots = json.loads((REPO / "lab/config/slots.json").read_text())["lanes"]
        if {k: {"image": v["image"], "imageId": v["imageId"]} for k, v in _slots.items()} != IMAGE_PINS:
            e.append("Q61i: lab/config/slots.json lane images must agree with the contract's IMAGE_PINS")
    except (OSError, KeyError, ValueError):
        e.append("Q61i: lab/config/slots.json must name the lane images the contract pins")
    if "fault-witness/1" not in EVIDENCE_SCHEMAS or "fault-witness/1" not in json.dumps(QUALIFICATION_RUN["steps"]) or "main" not in QUALIFICATION_RUN.get("contractSource", "") or "VERIFIER_REGISTRY entry (kind a0" not in A0_REGISTRY["entryShape"]["measuredBy"]:
        e.append("Q61a/Q61j/Q61k: contract source, retained fault witnesses, A0 verified through measuredBy")
    if "own BRIEF file" not in VERIFIER_REGISTRY.get("briefRule", ""):
        e.append("Q59c: every verification saves its own brief")
    # Q60a-i
    if NS_MODES != ["single-execution", "paired-rounds"]:
        e.append("Q60f: NS obligations gain paired-rounds next to single-execution")
    _lc9 = build_load_contract()
    if _lc9.get("measurementProtocol") is not PAIR_0 or PAIR_0["design"]["rounds"] != {"min": 8, "default": 12, "max": 24} or PAIR_0["design"]["looks"] != [8, 12, 18, 24] or PAIR_0["design"]["confidence"] != 0.982 or "single run never decides" not in PAIR_0["design"]["rule"]:
        e.append("Q60a: paired rounds (8 to 24, looks at 8, 12, 18, 24 at 98.2%), never a single run")
    if PAIR_0["margins"]["superiorityRatioDefault"] != 1.25 or PAIR_0["margins"]["holdP50Max"] != 1.10 or PAIR_0["margins"]["holdP99Max"] != 1.15 or "PROVISIONAL" not in PAIR_0["status"]:
        e.append("Q60b: margins 1.25, 1.10 and 1.15, provisional")
    if PAIR_0["slotRegime"]["receiptFields"] != ["cpuMax", "cpuset", "cpuWeight"] or "never compared" not in PAIR_0["slotRegime"]["rule"] or "slotRegime" not in RECEIPT_SCHEMA["fields"]:
        e.append("Q60c: slot regime recorded in receipts; quota and cpuset arms never compared")
    if "censor time" not in PAIR_0["accounting"] or "open-loop probe" not in PAIR_0["accounting"] or "unjudged" not in _lc9["windows"].get("judging", "") or PAIR_0["screeningSeries"]["burstEveryS"] != 180 or "freezes pool admission" not in PAIR_0["lease"] or "diagnostic only" not in PAIR_0["a0"] or "paired rounds" not in A0_REGISTRY.get("measurement", ""):
        e.append("Q60d/e/g/h/i: censored accounting, GREEN windows, screening series, lease and single-run A0 diagnostic")
    if "GREEN windows" not in CLOSURE_RULES["CR-NS"]["holds"] or "paired-rounds" not in MODE_RULE:
        e.append("Q60f: CR-NS and MODE_RULE carry PAIR_0")
    for cx in ("CX-PAIR0-SINGLE-RUN", "CX-PAIR0-UNJUDGED-WINDOW", "CX-PAIR0-REGIME-MISMATCH", "CX-PAIR0-COMMITTED-ONLY", "CX-A0-SINGLE-RUN"):
        if cx not in {x["id"] for x in EVALUATOR_COUNTEREXAMPLES}:
            e.append(f"Q60: counterexample {cx} is recorded")
    # Q58a-e, Q62a-c
    _rgn = COMPOSITION["readGuarantees"]
    for need in ("after: position", "at: position", "E-BASIS-NOT-RECONSTRUCTIBLE", "{required, observed, replica}", "implicit after", "{basis: {low, high}, route}", "engine ports are not a public surface", "default deadline is 2 s", "PROVISIONAL", "Q58a"):
        if need not in _rgn.get("native", ""):
            e.append(f"Q58a: readGuarantees native must say: {need}")
    if _rgn.get("nativeDeadlineMs") != 2000 or "E-BASIS-NOT-RECONSTRUCTIBLE" not in {x["id"] for x in ERROR_TABLE} or not set(NATIVE_TOKEN_CASES + P2Q_READ_CASES) <= {t for c in obl["G7.composition.ack-and-routed-ryow"]["cases"] for t in c["select"]}:
        e.append("Q58a/Q62a: 2 s default deadline, E-BASIS-NOT-RECONSTRUCTIBLE, and the token and V-P2Q read cases selected")
    if "marker row is the eligibility authority" not in COMPOSITION["experimentDirections"].get("EXP-P2B", "") or "Q62a fix round is re-verified" not in COMPOSITION["experimentDirections"].get("EXP-P2B", ""):
        e.append("Q58b: EXP-P2B direction recorded")
    if not all(x in COMPOSITION["experimentDirections"].get("broker-hardening", "") for x in ("synchronous=FULL", "fullfsync=ON", "locking_mode=EXCLUSIVE", "CRC32C", "committed_at", "recent_rows")):
        e.append("Q58c: the SQLite substrate direction is recorded")
    _hard = obl["G7.broker.promotion-hardening"]
    if "BR-SEGMENT-ROTATION-CHECKPOINT" in BROKER_HARDENING_CASES or "BR-KERNEL-FLOCK" in BROKER_HARDENING_CASES or not set(BROKER_HARDENING_CASES) <= {t for c in _hard["cases"] for t in c["select"]} or "CRC32C" not in _hard["statement"] or "Q62a" not in GATES.get("GATE-BROKER-HARDENING", {}).get("rule", ""):
        e.append("Q58c/Q62b: hardening amended (SQLite substrate replaces rotation and lock) and the default-off merge needs only Q62a")
    if "greater LSN" not in COMPOSITION.get("overlay", "") or "tombstones" not in COMPOSITION.get("overlay", "") or "G7.composition.overlay-rules" not in obl or not set(OVERLAY_CASES) <= {t for c in obl["G7.composition.overlay-rules"]["cases"] for t in c["select"]}:
        e.append("Q58d: overlay rules")
    if "crypto-shredding" not in ERASURE.get("logErasure", "") or "broker recent_rows overlay" not in PROTECTED_COPY_INVENTORY or "ER-LOG-CRYPTO-SHRED" not in {t for c in obl["G9.erasure.protected-copies"]["cases"] for t in c["select"]}:
        e.append("Q58e: erasure reaches the log through crypto-shredding")
    if not set(FAULT_Q62_CASES) <= {t for c in obl["G7.commit.protocol-transitions"]["cases"] for t in c["select"]}:
        e.append("Q62a: two brokers in one process is a fault point")
    if "653 triples" not in build_load_contract()["measurements"]["P2"].get("storagePerCommit", "") or "about 750" in json.dumps(build_load_contract()):
        e.append("Q62c: the measured 653-triple baseline replaces about 750")
    for name, got, want in (("NATIVE_TOKEN_CASES", NATIVE_TOKEN_CASES, ["CO-FACADE-ONLY", "CO-NATIVE-AFTER-TOKEN", "CO-NATIVE-AT-EXACT", "CO-NATIVE-AT-NOT-RECONSTRUCTIBLE", "CO-SESSION-HIGH-WATER", "CO-ANSWER-BASIS-RANGE-ROUTE", "CO-NATIVE-DEFAULT-DEADLINE"]),
                            ("OVERLAY_CASES", OVERLAY_CASES, ["CO-OVERLAY-ENTITY-PULL-ONLY", "CO-OVERLAY-GREATER-LSN-WINS", "CO-OVERLAY-IDENTITY-INVARIANT", "CO-OVERLAY-NO-MERGE-WAITS-OR-TYPED", "CO-TOMBSTONE-NO-RESURRECTION"]),
                            ("P2Q_READ_CASES", P2Q_READ_CASES, ["CO-EXECUTOR-IN-TX-WAITS-OR-TYPED", "CO-EXECUTOR-READS-IN-CAS-SET", "CO-REPLICA-REGRESSION-REAL-MARKER", "CO-PULL-BEYOND-PREFIX-TYPED", "CO-OUTAGE-PULL-FALLBACK", "CO-OUTAGE-RETRACTION-TARGET-FALLBACK"]),
                            ("FAULT_Q62_CASES", FAULT_Q62_CASES, ["C2-TWO-BROKERS-ONE-PROCESS"])):
        if got != want:
            e.append(f"Q58/Q62: {name} names one case per rule")
    # Q50d, Q51c, Q51f, Q55b, Q55c: one named case per rule
    for name, got, want in (("FAULT_Q55_CASES", FAULT_Q55_CASES, ["C2-SOURCE-PUBLISHED-REPLICA-BEHIND", "C2-CRASH-AFTER-SOURCE-PUBLISHED", "C2-ENGINE-SIGKILL", "X-ENGINE-SIGKILL", "X-DUAL-COMMIT-PATH-REFUSED"]),
                            ("READ_GUARANTEE_CASES", READ_GUARANTEE_CASES, ["CO-REPO-REPLICA-DOWN-FALLBACK", "CO-NATIVE-REPORTS-BASIS", "CO-NATIVE-BASIS-TOKEN-WAIT", "CO-NATIVE-BASIS-NOT-AVAILABLE", "CO-NATIVE-NO-TOKEN-WATERMARK", "CO-NATIVE-REPLICA-UNAVAILABLE", "CO-NO-FALSE-BASIS"]),
                            ("BROKER_HARDENING_CASES", BROKER_HARDENING_CASES, ["BR-OVERLAY-BOUND-OVERLOADED", "BR-SQLITE-DURABILITY-PRAGMAS", "BR-CRC-CHAIN-MID-WAL", "BR-COMMITTED-AT", "BR-EPOCH-ROW", "BR-MARKER-CHECKPOINT-CROSSCHECK", "BR-RECENT-ROWS-PERSISTED", "BR-LOG-CRYPTO-SHRED"]),
                            ("POSITION_BINDING_CASES", POSITION_BINDING_CASES, ["PO-BOUND-AFTER-PUBLICATION", "PO-NO-PLACEHOLDER", "PO-NO-ORDINAL-LIMIT", "PO-OPAQUE-TOTAL-ORDER"]),
                            ("ERASURE_RESIDUAL_CASES", ERASURE_RESIDUAL_CASES, ["ER-COUNT-DISTINCT-MARKER", "ER-ORDER-ERASED-THEN-MISSING", "ER-GROUP-EARLIEST-ERASEDAT", "ER-REFERENCE-CONSTRAINT-SKIPPED", "ER-INFLIGHT-ALL-OR-NONE", "ER-ERASE-COMMAND-SHAPE"])):
        if got != want:
            e.append(f"Q50d/Q51/Q52/Q55: {name} names one case per rule")
    # Q55b
    if set(k for k in COMMIT_OUTCOMES if k in SOURCE_VARIANT_FIELDS) != {"log-source", "engine-source"} or "qlever" in COMMIT_OUTCOMES or "xtdb" in COMMIT_OUTCOMES:
        e.append("Q55b: one witnessed transition table per protocol variant (log-source, engine-source)")
    _qt = [t["id"] for t in COMMIT_OUTCOMES["log-source"]["transitions"]]
    if "QT4-PUBLISHED" in _qt or not {"QT4s-SOURCE-PUBLISHED", "QT4r-REPLICA-APPLIED"} <= set(_qt) or "QT4s-SOURCE-PUBLISHED" not in COMMIT_OUTCOMES["log-source"]["successRule"] or any("no QT4 evidence" in x["faultAfter"] for x in COMMIT_OUTCOMES["log-source"]["outcomes"]):
        e.append("Q55b: QT4 splits into QT4s (source durable and readable) and QT4r (replica applied); success only after QT4s")
    if not set(FAULT_Q55_CASES) <= {t for c in obl["G7.commit.protocol-transitions"]["cases"] for t in c["select"]} or "declared protocol variant" not in obl["G7.commit.protocol-transitions"]["statement"]:
        e.append("Q55b/Q51f: G7.commit.protocol-transitions selects its table by variant and covers the new fault points")
    if "durability configuration" not in COMPOSITION.get("sourceDeclaration", "") or "fsyncMode" not in RECEIPT_SCHEMA["fields"]["composition"]:
        e.append("Q55b: compositions declare their source; receipts bind the log identity and durability configuration")
    # Q55c, Q50a
    _rg = COMPOSITION.get("readGuarantees", {})
    if "PROVISIONAL" not in _rg.get("status", "") or "Q50b" not in _rg.get("status", "") or "E-BASIS-NOT-AVAILABLE" not in _rg.get("native", "") or "E-REPLICA-UNAVAILABLE" not in _rg.get("native", "") or "fall back to the source" not in _rg.get("repository", "") or "not computed at" not in _rg.get("honesty", ""):
        e.append("Q55c: per-surface read guarantees, provisional, superseding Q50b")
    if not set(READ_GUARANTEE_CASES) <= {t for c in obl["G7.composition.ack-and-routed-ryow"]["cases"] for t in c["select"]} or "NS-P2-RYOW-PER-SURFACE" not in {t for c in obl["NS.P2"]["cases"] for t in c["select"]} or "never stands in for a native-surface guarantee" not in obl["NS.P2"]["statement"]:
        e.append("Q55c: NS.P2 and G7.composition.ack-and-routed-ryow test each surface against its own guarantee")
    for eid in ("E-BASIS-NOT-AVAILABLE", "E-REPLICA-UNAVAILABLE", "E-OVERLOADED", "E-DUAL-COMMIT-PATH"):
        if eid not in {x["id"] for x in ERROR_TABLE}:
            e.append(f"Q55c/Q50d/Q51: {eid} is a typed error")
    # Q55d
    _p3 = build_load_contract()["measurements"]["P3"]
    if "independently of ACK delivery" not in _p3.get("commitTime", "") or "fails the run" not in _p3.get("accounting", "") or "NS-P3-EVERY-POSITION-ACCOUNTED" not in {t for c in obl["NS.P3"]["cases"] for t in c["select"]} or "independently of ACK delivery" not in obl["NS.P3"]["statement"]:
        e.append("Q55d: P3 lag from source publication with every committed position accounted")
    # Q55e
    if "a claim can never supply it" not in W0_PIN.get("fingerprintOwnership", ""):
        e.append("Q55e: the O-DOMAIN fingerprint changes only by a reviewed contract version")
    # Q50a, c, d, e; Q51a, c, d, e, f
    _p2 = build_load_contract()["measurements"]["P2"]
    if "broker-side current-entity index" not in COMPOSITION.get("brokerCurrentIndex", "") or "never a bar" not in _p2.get("storagePerCommit", "") or "27,581" not in _p2.get("storagePerCommit", "") or "persist-updates off" not in build_load_contract()["measurements"].get("runQueue", {}).get("qleverExclusiveFirst", "") or "EXP-J01" not in build_load_contract()["measurements"]["runQueue"].get("xtdb100kRung", ""):
        e.append("Q50a/Q50c/Q50e/Q51d/Q51e: broker index candidate, storage per commit reported, run queue and deferred rung recorded")
    if "G7.broker.promotion-hardening" not in obl or not set(BROKER_HARDENING_CASES) <= {t for c in obl["G7.broker.promotion-hardening"]["cases"] for t in c["select"]} or "GATE-BROKER-HARDENING" not in GATES:
        e.append("Q50d: broker promotion hardening obligation and gate")
    if "never the driver" not in COMPOSITION.get("hotSubjects", "") or "E-OVERLOADED" not in COMPOSITION.get("hotSubjects", "") or "up to 8" not in COMPOSITION.get("hotSubjects", "") or "NS-P2-HOT-SUBJECT-QUEUE" not in {t for c in obl["NS.P2"]["cases"] for t in c["select"]}:
        e.append("Q51a: per-subject queue with typed Overloaded and same-subject group commit")
    if "opaque, totally ordered" not in POSITION.get("binding", "") or "G7.position.bound-after-publication" not in obl or set(POSITION_BINDING_CASES) & set(POSITION_REQUIRED_CASES):
        e.append("Q51c: positions opaque, totally ordered and bound after publication (outside the GATE-POSITION falsifier set)")
    # Q53, Q54
    if not all(x in WORLD_W0.get("readings", "") for x in ("A01 to A15", "A11 NaN", "A12 an integer token over 4,300 digits", "A13 any nesting depth", "A14 strings order by Unicode code point", "A15 inconsistent receiver snapshots", "no upper bound", "V-D01e N1")) or "none pending" not in WORLD_W0.get("nextEdit", "") or "W0-1.1.2" not in WORLD_W0["version"]:
        e.append("Q53/Q57: SPEC 1.1.2 readings A01 to A15 recorded with V-D01e N1; no W0 edit pending")
    _reach = ORACLE_REFUSALS["O-REPLAY"]["scale-evolution"].get("reachedThrough", [])
    if ["CS-MIGRATION", "*"] not in _reach or ["CS-REQ", "no-silent-precision-loss"] in _reach or ["CS-TYPES8", "decimal"] in _reach or "scale-evolution" not in oracle_scope("O-REPLAY")["blocked"].get("G7.migration.valid-writes-never-rejected", []):
        e.append("Q54a/Q54b: valid-writes stays blocked by the CS-MIGRATION reach; CS-REQ and CS-TYPES8 get no reach")
    # Q46a, Q46d
    if len([c for c in ATOMIC_UNIT_CASES if c.startswith("AU-CRASH-")]) != len(ATOMIC_UNIT_PARTS) * (len(ATOMIC_UNIT_PARTS) - 1) // 2 or len(ATOMIC_UNIT_PARTS) != 5:
        e.append("Q46a: crash cases cover all 10 pairs of the five transitions")
    if "Q46d" not in ORACLE_PINS["O-REPLAY"].get("nextPin", "") or not ORACLE_PINS["O-REPLAY"]["commit"].startswith("a9c1327") or "erasure" in ORACLE_REFUSALS["O-REPLAY"]:
        e.append("Q46d/Q56i: the O-REPLAY pin moves to a9c1327, the blanket erasure refusal is gone and the 0.4.2 follow-up is recorded")
    _rr = ORACLE_REFUSALS["O-REPLAY"]
    if set(_rr) != {"q52-shapes", "tdk1-keys", "envelope-facts", "scale-evolution"} or [c for _, c in _rr["tdk1-keys"]["cases"]] != TDK1_KEY_BYTE_CASES or not all(x in " ".join(_rr[k]["sites"][0] for k in _rr) for x in ("entities.py:61", "run.py:53", "views.py:129")):
        e.append("Q56i: residual refusals at a9c1327 are the Q52 shapes and the three 0.3.1 sites (entities.py:61, run.py:53, views.py:129)")
    if sorted(c for s, c in _rr["q52-shapes"]["cases"] if s == "CS-ERASURE") != sorted(ERASURE_RESIDUAL_CASES + ERASURE_Q66_CASES) or ["CS-DECIMAL-ROUTING", "DR-JSON-CONVERT-ROUNDING"] not in _rr["q52-shapes"]["cases"] or len(_rr["q52-shapes"]["sites"]) != 7:
        e.append("Q52/Q56i: every Q52 shape (a to g) is a refused, named case")
    # Q48b, Q48c
    _lc = build_load_contract()["measurements"]["P5"]
    if _lc.get("scopedRelease", {}).get("rung") != "100k" or "reached-subject list" not in _lc["scopedRelease"].get("binds", "") or "NS-P5-SCOPED-RELEASE-REACHED" not in {t for c in obl["NS.P5"]["cases"] for t in c["select"]} or "reached-subject list" not in obl["NS.P5"]["statement"]:
        e.append("Q48b: the scoped-release P5 measurement runs at 100k and binds the reached-subject list and its hash")
    if "W0-1.1.2" not in W0_PIN["version"]:
        e.append("Q48c: the W0-1.1.2 edit landed")
    # Q49a-e
    for k, need in (("journalCommit", "changes list only identities"), ("journalCommit", "compares markers on both sides"), ("journalCommit", "erasure ledger"), ("idempotence", "empty change list"), ("idempotence", "changes nothing"),
                    ("queries", "matches no value predicate"), ("queries", "COUNT of assertions counts it"), ("queries", "markers last in a deterministic order by assertion id"), ("queries", "one group keyed by the marker"), ("queries", "Unique ignores"), ("queries", "include returns the marker")):
        if need not in ERASURE.get(k, ""):
            e.append(f"Q49: ERASURE {k} must say: {need}")
    if ERASURE_COMMIT_CASES != ["ER-COMMIT-JOURNAL-IDENTITY-ONLY", "ER-COMMIT-LEDGER", "ER-EARLIER-CHANGE-MARKER", "ER-IDEMPOTENT-REERASE", "ER-EMPTY-ERASURE-RECORD"] or ERASURE_QUERY_CASES != ["ER-PREDICATE-NO-MATCH", "ER-AGGREGATE-SKIP-COUNT", "ER-ORDER-MARKERS-LAST", "ER-GROUP-ONE-MARKER", "ER-UNIQUE-IGNORES", "ER-REFERENCE-MARKER"]:
        e.append("Q49: the erasure commit and query cases are named one per rule")
    for oid, need in (("G9.erasure.commit-semantics", set(ERASURE_COMMIT_CASES)), ("G9.erasure.query-semantics", set(ERASURE_QUERY_CASES)), ("G7.journal.logical-contract", {"ER-JOURNAL-MODULO", "ER-COMMIT-JOURNAL-IDENTITY-ONLY", "ER-EARLIER-CHANGE-MARKER"}), ("G9.erasure.visibility-boundary", {"ER-INFLIGHT-READ"})):
        if oid not in obl or not need <= {t for c in obl[oid]["cases"] for t in c["select"]} or "O-REPLAY" not in obl[oid]["oracles"]:
            e.append(f"Q49: {oid} selects {sorted(need)}")
    if "all old values or all markers" not in obl["G9.erasure.visibility-boundary"]["statement"] or "Q49a" not in obl["G9.erasure.reproduction-modulo"]["statement"]:
        e.append("Q49a/Q49d: in-flight reads and marker comparison in the dependent obligations")
    _jc = next((r["rule"] for r in DECIMAL_ROUTING if r["id"] == "DR-JSON-CONVERT"), "")
    if "as-written" not in _jc or "toDecimal(json 0.1, 2, 1) = 0.1" not in _jc or "never its exact binary64 expansion" not in _jc or "E-INVALID-VALUE" not in next((r["rule"] for r in DECIMAL_ROUTING if r["id"] == "DR-JSON-STRING-TEXT"), ""):
        e.append("Q49e: JSON number to decimal from its as-written reading; decimal text in a JSON string is E-INVALID-VALUE")
    # RULINGS Q47d: pending rows are listed, never compiled, and never fail generation by existing
    _compiled_ids = {r["id"] for r in RULINGS}
    _both = [p for p in pending_ruling_ids() if p in _compiled_ids]
    if _both:
        e.append(f"Q47d: ruling ids both pending and compiled (remove them from RULINGS-PENDING.md when compiling): {_both}")
    _probe = "# pending\n| Q99z probe | a pending row | basis |\n| Q47a | a pending row reusing a compiled sub-ruling id | basis |\n"
    if pending_ruling_ids(_probe) != ["Q99z", "Q47a"] or "Q99z" in rulings_coverage()["compiled"] or "Q99z" in _compiled_ids:
        e.append("Q47d: a pending row is listed by id and gains no authority")
    if pending_rulings()["authority"] != "none" or "never invalidates generation" not in PENDING_RULE or PENDING_RULINGS_FILE not in SCOPE_SOURCES:
        e.append("Q47d: the pending file is hashed as an input and its rows carry no authority")
    for o in OBL:
        if "O-REPLAY" in o["oracles"] and "GATE-ORACLE-PIN" not in o["closure"]["params"].get("gates", []):
            e.append(f"V-O02 C1: {o['id']} uses O-REPLAY but is not gated on its pin")
            break
    # Q31k
    closes = {x["closes"] for x in EVALUATOR_POSITIVE_FIXTURES}
    if used_rules - closes:
        e.append(f"Q31k: closure rules without a positive fixture: {sorted(used_rules - closes)}")
    if any(x["expectedVerdict"] != "CLOSED" for x in EVALUATOR_POSITIVE_FIXTURES) or not set(x["id"] for x in EVALUATOR_POSITIVE_FIXTURES) <= set(t for c in obl["R.evaluator.incomplete-receipts"]["cases"] for t in c["select"]):
        e.append("Q31k: positive fixtures selected and CLOSED")
    # TARGETS 1.1 and 2.1
    m = lc["measurements"]
    if m["P1"].get("hotSet", {}).get("minShare") != 0.5 or m["P1"].get("splitReads", {}).get("share") != 0.10 or "maintenance" not in m["P1"] or "requestedBasis" not in m["P1"] or len(m["P1"].get("writerWaitAttribution", [])) != 2:
        e.append("TARGETS 1.1 P1 semantics missing")
    if [b_["facts"] for b_ in m["P2"].get("sizeBands", [])] != [[5, 10], [11, 25], [26, 50]] or THRESHOLDS["NS-P2-COMMIT-P99-26-50-MS"]["value"] != 100 or "scheduled offer" not in m["P2"].get("latency", ""):
        e.append("TARGETS 1.1 P2 semantics missing")
    if len(m["P3"].get("crashPoints", [])) != 3 or "O-DOMAIN" not in m["P3"].get("expectedAffected", "") or THRESHOLDS["NS-P3-VISIBLE-DUP-EFFECTS-MAX"]["value"] != 0:
        e.append("TARGETS 1.1 P3 semantics missing")
    if [b_["weight"] for b_ in m["P4"].get("buckets", [])] != [0.50, 0.35, 0.15] or THRESHOLDS["NS-P4-PULL-P99-LARGEST-MS"]["value"] != 50:
        e.append("TARGETS 1.1 P4 semantics missing")
    if not all(k in m["P5"] for k in ("coverage", "publication", "postCaptureMutations", "throttledVariant")):
        e.append("TARGETS 1.1 P5 semantics missing")
    g = WRITER_TRACE.get("generator", {})
    if g.get("activeSet", {}).get("share") != 0.02 or g.get("activeSet", {}).get("residencyS") != 2000 or g.get("subjectChoice", {}).get("fromActiveSet") != 0.95 or "1.1" not in g.get("subjectChoice", {}).get("activeSetDistribution", "") or "120 s + k x 600 s" not in g.get("burstPhase", ""):
        e.append("TARGETS 2.1 trace generator missing")
    # TARGETS 6.1
    if "O-DOMAIN" not in ORACLES or any("O-DOMAIN" not in o["oracles"] for o in OBL if o["id"].startswith("GS.")):
        e.append("TARGETS 6.1: O-DOMAIN for every scenario")
    if sorted(GS_FAILURE_SCHEDULES) != [3, 4, 6, 15, 19] or sum(len(v) for v in GS_FAILURE_SCHEDULES.values()) != 6:
        e.append("TARGETS 6.1: the five added failure schedules")
    if GS_COMMON_BASIS_CASE not in [t for c in obl["GS.10"]["cases"] for t in c["select"]] or GS_COMMON_BASIS_CASE not in [t for c in obl["GS.11"]["cases"] for t in c["select"]]:
        e.append("TARGETS 6.1: preview and activation at one common input basis")
    # Q16
    if THRESHOLDS["NS-P4-HISTORY-FLATNESS"]["value"] != 1.1:
        e.append("Q16: history flatness must be 1.1")
    lc = build_load_contract()
    mix = lc.get("basisMix", [])
    if [m["share"] for m in mix] != [0.80, 0.15, 0.05] or "90 days" not in mix[2]["basis"]:
        e.append("Q16: basis mix must be 80/15/5 with 90 days back")
    w = lc["windows"]
    if (w["acceptance"]["warmupS"], w["acceptance"]["perLadderLevelS"], w["screening"]["warmupS"], w["screening"]["perLadderLevelS"]) != (120, 600, 30, 120):
        e.append("Q16: windows must be 120/600 acceptance and 30/120 screening")
    for o in OBL:
        if set(o["profiles"]) & set(SCREENING_PROFILES):
            e.append(f"Q16: {o['id']} lists a screening profile; screening can never close an obligation")
    if not BUDGETS.get("status", "").startswith("PROVISIONAL") or "EXP-N02" not in BUDGETS["frozenBeforeCandidates"]:
        e.append("Q16: budgets must be provisional and re-frozen after EXP-N02")
    # Q17
    if "GS.15" not in obl or "1,000 small" not in obl["GS.15"]["statement"]:
        e.append("Q17: GS.15 must cover tenant skew")
    if any("sparse" in k.lower() for k in PROFILES):
        e.append("Q17: no sparse profile")
    # Q18
    fo = CARD_MANY_ORDER["familyOrder"]
    if fo.index("decimal") != fo.index("number") + 1 or fo.index("datetime") != fo.index("decimal") + 1:
        e.append("Q18: decimal must sit between number and datetime")
    if not any(c["id"] == "CMP-DECIMAL-CROSS" and "E-MIXED-FAMILY" in c["rule"] for c in COMPARISON_RULES):
        e.append("Q18: CMP-DECIMAL-CROSS missing")
    if "TDK1" not in DECIMAL_RULES["storage"][0]["as"] or "never rounded" not in DECIMAL_RULES["reject"]:
        e.append("Q18 (as amended by Q35b): decimal storage or reject rule wrong")
    for rc in ("DEC-SCALE-EXCESS", "DEC-PRECISION-EXCESS", "DEC-CROSS-FAMILY-PREFLIGHT"):
        if rc not in CS["CS-DECIMAL"]["requiredCases"]:
            e.append(f"Q18: CS-DECIMAL lacks {rc}")
    # Q19
    st = obl["G5.agg.projection-sums"]["statement"]
    if not all(x in st for x in ("DECIMAL(32,0)", "EXP-X02", "split-sum", "EXP-F02")):
        e.append("Q19: projection-sums statement must name the DECIMAL(32,0) recipe, EXP-X02, the split-sum fallback and EXP-F02")
    # Q20
    for rid in ("Q8a", "Q8b"):
        r = next(r for r in RULINGS if r["id"] == rid)
        if "int64" in r["ruling"] or "integer" not in r["ruling"].lower():
            e.append(f"Q20: {rid} must read integer")
    return e


def verifier_mode(o):
    return "re-evaluate-and-spot" if set(o["profiles"]) & {"P-YEAR-ONE", "P-NS", "P-RUNGS"} else "rerun"


def validate():
    e = []
    ids = set()
    obl = {o["id"]: o for o in OBL}
    secs = dict(SECTIONS)
    for o in OBL:
        oid = o["id"]
        if oid in ids:
            e.append(f"duplicate {oid}")
        ids.add(oid)
        for g in o["goals"]:
            if g not in secs:
                e.append(f"{oid}: goal {g}")
        for x in o["lanes"]:
            if x not in LANES:
                e.append(f"{oid}: lane {x}")
        for x in o["oracles"]:
            if x not in ORACLES:
                e.append(f"{oid}: oracle {x}")
        for x in o["entrypoints"]:
            if x not in ENTRYPOINTS:
                e.append(f"{oid}: entrypoint {x}")
        for p in o["profiles"]:
            if p not in PROFILES:
                e.append(f"{oid}: profile {p}")
        if not o["cases"]:
            e.append(f"{oid}: no cases")
        for c in o["cases"]:
            if c["set"] not in CS:
                e.append(f"{oid}: case set {c['set']}")
                continue
            for tag in c["select"]:
                if tag != "all" and tag not in CS[c["set"]]["requiredTags"] and tag not in CS[c["set"]]["requiredCases"]:
                    e.append(f"{oid}: selector tag {tag} not in {c['set']} requiredTags")
        for r in o["closure"]["rules"]:
            if r not in CLOSURE_RULES:
                e.append(f"{oid}: rule {r}")
        for m in o["mutationControls"]:
            if m not in MUTANTS:
                e.append(f"{oid}: mutant {m}")
        if bool(o["mutationControls"]) != ("CR-MUTANT-KILL" in o["closure"]["rules"]):
            e.append(f"{oid}: mutants and CR-MUTANT-KILL must go together")
        for t in o["thresholds"]:
            if t not in THRESHOLDS:
                e.append(f"{oid}: threshold {t}")
                continue
            need = THRESHOLD_RULE_FOR_KIND[THRESHOLDS[t]["kind"]]
            if need and not set(need) & set(o["closure"]["rules"]):
                e.append(f"{oid}: threshold {t} ({THRESHOLDS[t]['kind']}) needs one of {need}")
        if "CR-PERF" in o["closure"]["rules"] and not any(THRESHOLDS.get(t, {}).get("kind") == "perf" for t in o["thresholds"]):
            e.append(f"{oid}: CR-PERF without a perf threshold")
        if "CR-WITNESS" in o["closure"]["rules"] and not any(THRESHOLDS.get(t, {}).get("kind") == "witness" for t in o["thresholds"]):
            e.append(f"{oid}: CR-WITNESS without a witness threshold")
        if "CR-FAULT" in o["closure"]["rules"] and "T-FAULT-REPS" not in o["thresholds"]:
            e.append(f"{oid}: CR-FAULT without T-FAULT-REPS")
        if "CR-FAULT" in o["closure"]["rules"] and "P-FAULT" not in o["profiles"]:
            e.append(f"{oid}: CR-FAULT needs P-FAULT")
        if not o["closure"]["modes"]:
            e.append(f"{oid}: no modes (MODE_RULE)")
        if "CR-PERF" in o["closure"]["rules"] and any(THRESHOLDS.get(t, {}).get("kind") == "secondary" for t in o["thresholds"]):
            e.append(f"{oid}: a secondary threshold under CR-PERF (SECONDARY_RULE)")
        if o["receiptScope"] not in ("lane", "engine"):
            e.append(f"{oid}: receiptScope")
        # statement consistency
        st = o["statement"]
        for m in re.findall(r"\bCS-[A-Z0-9-]+[A-Z0-9]", st):
            if m not in {c["set"] for c in o["cases"]}:
                e.append(f"{oid}: statement names {m} but cases do not")
        for m in re.findall(r"\bP-[A-Z0-9-]+[A-Z0-9]", st):
            if m not in o["profiles"]:
                e.append(f"{oid}: statement names {m} but profiles do not")
        for m in re.findall(r"\b(?:T|L)-[A-Z0-9-]+[A-Z0-9]\b", st):
            if m in THRESHOLDS and m not in o["thresholds"]:
                e.append(f"{oid}: statement names threshold {m} but thresholds do not")
        for m in re.findall(r"\bE-[A-Z0-9-]+[A-Z0-9]\b", st):
            if m not in {x["id"] for x in ERROR_TABLE}:
                e.append(f"{oid}: unknown error {m}")
        for m in re.findall(r"\bOBS-[A-Z0-9-]+[A-Z0-9]\b", st):
            if m not in OBS_PROTOCOLS and m not in PLAN_PROTOCOLS:
                e.append(f"{oid}: unknown protocol {m}")
        if re.search(r"\b10m\b|10,000,000", st) and not set(o["profiles"]) & {"P-YEAR-ONE", "P-RUNGS", "P-NS"}:
            e.append(f"{oid}: statement is about 10m but profile is not")
        if re.search(r"concurrent|race|between calls|writer committed", st) and not set(o["profiles"]) & {"P-TINY-CONC", "P-FAULT", "P-NS", "P-RUNGS", "P-YEAR-ONE", "P-RUNG-1M"} and o["id"] != "G6.ownership.bounded-connections":
            e.append(f"{oid}: concurrency in statement but no concurrent profile")
        if "E-" in st and "O-ERR" not in o["oracles"] and "E-" not in "".join(o["sources"]):
            pass
        if any(x in st for x in ("E-CONFLICTING", "E-COMMIT", "E-REPAIRING", "E-ADMISSION", "E-CONSTRAINT")) and "O-ERR" not in o["oracles"]:
            e.append(f"{oid}: pinned errors need O-ERR")
        for c in o["contracts"]:
            if not any(t["contract"] == c and t["obligation"] == oid for t in TRACE):
                e.append(f"{oid}: lists {c} without traceability cases")
    # coverage of sections per lane
    for g, _ in SECTIONS:
        for lane in LANES:
            if not any(g in o["goals"] and lane in o["lanes"] for o in OBL):
                e.append(f"section {g} has nothing for {lane}")
    # traceability
    for c in ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]:
        if not any(t["contract"] == c for t in TRACE):
            e.append(f"traceability: {c} has no case")
    for t in TRACE:
        if t["case"] not in CS[t["set"]]["requiredCases"]:
            e.append(f"trace case {t['case']} not in {t['set']} requiredCases")
        o = obl.get(t["obligation"])
        if not o or t["set"] not in {c["set"] for c in o["cases"]} or t["contract"] not in o["contracts"]:
            e.append(f"trace {t['case']}: obligation {t['obligation']} must include {t['set']} and list {t['contract']}")
    for cid, s in CS.items():
        for rc in s["requiredCases"]:
            if cid in ("CS-CURSOR", "CS-RAW-MAPPED"):
                continue
            if not any(t["case"] == rc for t in TRACE) and not rc.startswith("X-") and not any(c["set"] == cid and rc in c["select"] for o in OBL for c in o["cases"]) and not any(rc in o["closure"]["params"].get("conditionalSelection", {}).get("nonDenseAdds", []) for o in OBL):
                e.append(f"{cid}: required case {rc} not traced")
    # mutants
    for m, d in MUTANTS.items():
        if not any(m in o["mutationControls"] for o in OBL if o["id"] != "R.repo.mutation-controls"):
            e.append(f"mutant {m} attached only to the catalog obligation")
        for tgt in d["targets"]:
            s, tag = tgt.split(":")
            if s not in CS or (tag not in CS[s]["requiredTags"] and tag not in CS[s]["requiredCases"]):
                e.append(f"mutant {m}: target {tgt} unresolvable")
    for req in ("M-HALF-OPEN", "M-DROPPED-SUPPORT", "M-FUTURE-RETIREMENT", "M-INTEGER-ROUND", "M-ENTITY-TYPE-SWAP", "M-STALE-PROJECTION"):
        if req not in MUTANTS:
            e.append(f"required mutant {req} missing")
    # thresholds referenced
    used = {t for o in OBL for t in o["thresholds"]}
    for t, d in THRESHOLDS.items():
        if t not in used:
            e.append(f"threshold {t} unused")
        if d["value"] in (None, "CALIBRATE"):
            e.append(f"threshold {t} has no value")
        if not isinstance(d["value"], (int, float)):
            e.append(f"threshold {t}: value must be a number")
    # matrix
    for r in MATRIX_ROWS:
        for c, v in r["cells"].items():
            if c not in COLS:
                e.append(f"matrix row {r['n']} bad column {c}")
            if v[0] == "KL":
                for k in v[1]:
                    if k not in KNOWN_LIMITS:
                        e.append(f"matrix row {r['n']}: unknown {k}")
        for ob in r["requiredBy"]:
            if ob not in obl:
                e.append(f"matrix row {r['n']}: requiredBy {ob} unknown")
    # validity DAG
    seen, stack = set(), set()

    def dfs(n):
        if n in stack:
            e.append(f"validity cycle at {n}")
            return
        if n in seen:
            return
        stack.add(n)
        for d in VALIDITY[n]["dependsOn"]:
            dfs(d)
        stack.discard(n)
        seen.add(n)
    for n in VALIDITY:
        dfs(n)
    for rid, r in CLOSURE_RULES.items():
        for v in r["validity"]:
            if v not in VALIDITY:
                e.append(f"{rid}: validity {v}")
    e += ruling_checks()
    return e


# ============================================================================ outputs
def obligation_hash(o):
    core = {k: o[k] for k in ("id", "goals", "statement", "lanes", "receiptScope", "cases", "oracles", "entrypoints", "profiles", "closure", "thresholds", "mutationControls", "contracts")}
    return sha_text(json.dumps(core, sort_keys=True))


def matrix_cells():
    lanecol = {"x_raw": "xtdb-xtql", "s_raw": "xtdb-sql", "q_raw": "qlever-sparql"}
    exc = {(x["row"], x["lane"]): x["id"] for x in RAW_EXCEPTIONS}
    out = []
    for r in MATRIX_ROWS:
        cells = {}
        for c in COLS:
            v = r["cells"].get(c)
            surf = COL_SURFACE[c]
            required = (surf == "raw" and r["rawRequired"]) or (surf != "raw" and (r["fragmentCoverage"] or bool(r["requiredBy"])))
            if v and v[0] == "NA":
                cells[c] = {"status": "NA", "note": v[1]}
            elif surf == "raw" and v and v[0] == "KL" and r["rawRequired"]:
                cells[c] = {"status": "EXEMPT", "exception": exc[(r["n"], lanecol[c])], "limits": v[1], "note": v[2]}
            elif v and v[0] == "KL":
                cells[c] = {"status": "OPEN" if required else "NR", "limits": v[1], "note": v[2], "blocking": required}
            else:
                cells[c] = {"status": "OPEN" if required else "NR", "note": v[1] if v else None}
        out.append({**{k: r[k] for k in ("n", "op", "type", "exactness", "rawRequired", "fragmentCoverage", "requiredBy", "note")}, "cells": cells})
    return out


def cell_text(c):
    s = c["status"]
    if s == "EXEMPT":
        return f"EXEMPT {c['exception']} ({', '.join(c['limits'])})"
    if c.get("limits"):
        t = f"{s} {'blocked by ' if c.get('blocking') else ''}{', '.join(c['limits'])}"
    else:
        t = s
    if c.get("note") and s != "NA":
        t += f" [{c['note']}]"
    if s == "NA":
        t = f"N/A [{c['note']}]"
    return t


def render_matrix(cells):
    L = []
    L.append("# Capability matrix\n")
    L.append(f"Version {VERSION}, {DATE}. **Generated by `build_contract.py` from `obligations.json`; do not edit.** Closure rule CR-MATRIX reads the same data from `obligations.json` (`capabilityMatrix`, `rawExceptions`, `diagnostics`, `fragmentCoverage`).\n")
    L.append("## How to read it\n")
    L.append("- **Rows** are operator and value-type pairs. **Columns** are surface by engine and language: `raw` (EP-RAW-HATCH and EP-RAW-WIRE over the documented raw dataset), `frag` (supported native fragments), `repo` (entity repository; the XTDB column serves both XTDB lanes).")
    L.append("- **Required cells.** `repo` and `frag` cells are required over the full Triplex value domain (RULINGS Q1(a)). A `raw` cell is required when its row belongs to a raw parity class (RULINGS Q1(b)).")
    L.append("- **Cell values.** `OPEN` = required, no acceptance receipt yet. `OPEN blocked by KL-n` = required on a surface where a known engine limit must be routed around or repaired. `EXEMPT RX-id` = a raw cell inside a per-cell exception: the mapped recipe is required instead (R.raw.mapped-recipes) and the original failure is a diagnostic. `NR` = not required by any obligation (a KL listed there still needs a raw-guide entry). `N/A` = the operator does not exist on that surface, with the reason.")
    L.append("- **Exceptions are per cell** (engine, language, surface, operator, value domain), never per row. Outside its exempt domain the raw cell stays required.\n")
    L.append("## Matrix\n")
    L.append("| # | Operator | Type | Exactness | XTQL raw | XTQL frag | SQL raw | SQL frag | SPARQL raw | SPARQL frag | repo XTDB | repo QLever | Raw-required | Coverage set | Required by |")
    L.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for r in cells:
        c = r["cells"]
        L.append("| " + " | ".join([str(r["n"]), r["op"].replace("|", "\\|"), r["type"].replace("|", "\\|"), r["exactness"]] + [cell_text(c[k]).replace("|", "\\|") for k in COLS] + ["yes" if r["rawRequired"] else "no", "yes" if r["fragmentCoverage"] else "no", ", ".join(r["requiredBy"]) or "none"]) + " |")
    L.append("\n## Raw parity classes\n")
    L.append("| Class | Rows |\n| --- | --- |")
    for k, v in RAW_PARITY_CLASSES.items():
        L.append(f"| {k} | {', '.join(map(str, v))} |")
    L.append("\n## Per-cell raw exceptions (RULINGS Q1)\n")
    L.append("Each exception names its exact mapped recipe, the guide entry, the obligation and case that qualify the recipe, and the diagnostic that keeps the original raw failure with its unchanged expected answer.\n")
    L.append("| Id | Lane | Surface | Row | Exempt domain | Mapped recipe | Guide entry | Qualified by | Diagnostic | Still required on raw |")
    L.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for x in RAW_EXCEPTIONS:
        L.append(f"| {x['id']} | {x['lane']} | {x['surface']} | {x['row']} | {x['exemptDomain']} | {x['mappedRecipe']} | {x['guideEntry']} | {x['qualifiedBy']} ({x['qualifyingCase']}) | {x['diagnostic']} | {x['stillRequiredOnRaw']} |")
    L.append("\n## Diagnostics (original failures, kept, never closing)\n")
    L.append(DIAGNOSTIC_RULE + "\n")
    L.append("| Id | Lanes | What runs | Oracle | Unchanged expected answer |\n| --- | --- | --- | --- | --- |")
    for d in DIAGNOSTICS:
        L.append(f"| {d['id']} | {', '.join(d['lanes'])} | {d['what']} | {', '.join(d['oracle'])} | {d['expected']} |")
    L.append("\n## Fixed minimum coverage set for supported fragments\n")
    L.append("Every lane's supported native fragments must offer these rows; removing one from the advertised surface fails G10.capabilities.truthful and R.native.fragment-equivalence.\n")
    L.append("| Row | Operator | Type |\n| --- | --- | --- |")
    for r in MATRIX_ROWS:
        if r["fragmentCoverage"]:
            L.append(f"| {r['n']} | {r['op']} | {r['type']} |")
    L.append("\n## Known limits (evidence)\n")
    L.append("| Id | Engine | Behavior | Evidence |\n| --- | --- | --- | --- |")
    for k, (eng, beh, ev) in KNOWN_LIMITS.items():
        L.append(f"| {k} | {eng} | {beh} | {ev} |")
    L.append("\n## Rules for changing the matrix\n")
    L.append("- Edit the data in `build_contract.py`; the generator refuses a raw-required KNOWN-LIMIT cell without an exception, an exception without a recipe, qualifier and diagnostic, an exemption of XTDB scalar arithmetic, and an N/A cell in the coverage set.")
    L.append("- A cell becomes EXACT only by citing an acceptance receipt. An original counterexample stays as its diagnostic after a repair.")
    return "\n".join(L) + "\n"


def md_table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for r in rows:
        out.append("| " + " | ".join(str(x).replace("|", "\\|").replace("\n", " ") for x in r) + " |")
    return "\n".join(out)


CHANGELOG_020 = [
    ("1", "Rulings and obligations disagreed (CLI, equal duplicates)", "Every ruling compiled into build_contract.py with a generator check per ruling (section 3); obligations.json is the only authority; the CLI entrypoint removed; G4.neg.conflict-semantics follows C5 (equal duplicates are one value); banned-text check removes obsolete wording."),
    ("2", "Q1 exempted whole rows", "Per-cell RAW_EXCEPTIONS (28 cells) each with mapped recipe, guide entry, qualifying obligation R.raw.mapped-recipes and case, and diagnostic; XTDB scalar arithmetic stays required; fixed fragment coverage set."),
    ("3", "Load JSON allowed a self-calibrated bar", "Superseded in 0.3.0 by the NS measurements: fixed TARGETS bars, calibration tightens only, loosening needs Sam."),
    ("4", "Q11 halved per-language demand", "P1, P4 and P5 are measured separately per surface (0.3.0)."),
    ("5", "Recovery could lose a committed unACKed command", "COMMIT_OUTCOMES binds expected outcomes to witnessed transitions; QT2-LOGGED groups must publish; retries before publication return CommitPending or Repairing; success only after publication (G7.commit.protocol-transitions, mutant M-EARLY-ACK)."),
    ("6", "C1-C7 lacked discriminating cases", "C1-C8 traceability table (section 9) with named cases mapped to new obligations G8.eligibility.c1-routing, G7.commit.protocol-transitions, G7.broker.fence-and-epochs, G8.maintenance.bounded-boundaries, G7.journal.logical-contract, G10.scope.ownership-refusal, G10.scope.shared-collision, G3.recursion.read-only-frontier."),
    ("7", "O-REPLAY clock model and outcome authority", "Spec rewritten (6.1): no monotonic-clock assumption, decreasing-clock histories, R independent of P, nested position accounting, outcomes derived from command intent and durable-decision evidence, receipts compared afterwards."),
    ("8", "Wrong or unspecified expected answers", "Frozen tables (section 4): numeric operations with correct signed-zero rules, conversions, comparisons, aggregates (Q8a, Q8b preflight AVG), card-many order, constraint enforcement new-or-worsened only, every error pinned."),
    ("9", "Oracle specs did not cover their claims", "Separate normative protocols: O-OBS (OBS-*), O-PLAN (route, access path, cost), O-SHAPE (bag/set, grouping, unbound handling), O-SPEC (exact types, no accidental any, pinned diagnostics), O-ERR compiled from ERROR_TABLE."),
    ("10", "Machine contract mostly prose; contradictions", "Typed receipt and evidence schemas, selector semantics, threshold registry with closure-rule dependencies, structured closure rules that recompute from retained evidence; G10.cursor.stable split (deep-page cost at 10m is its own obligation), G7.write.atomic selects CS-WRITE and CS-FAULT, every threshold tied to its rule; in 0.3.0 the performance values come from TARGETS and the scale sample counts are T-SAMPLES-PER-FAMILY and T-SAMPLES-PER-STRATUM."),
    ("11", "Auxiliary evidence had no validity path", "Validity classes VC, VA, VM, VV with an acyclic dependency check; calibration closes through CR-CALIBRATION; MUTANT_RULE requires reach and an identified semantic assertion failure."),
    ("12", "Carry-forward reopened the final-acceptance loophole", "APPLICABILITY restores PLAN 1.7: all bound identities, explicit applicability record, final acceptance entirely fresh including the year-one population and every NS and GS run; verifier mode per obligation."),
    ("13", "Population counts could pass with trivial history", "Year-one population with frozen history strata 1/3/10, topology, skew, tenants and result cardinalities; correctness per rung (0.3.0)."),
    ("14", "Goal 8 could be green without reuse; no budgets", "Positive reuse and incremental-maintenance witnesses with OBS-WORK thresholds; budgets.json frozen before candidates with cumulative A0 comparison (0.3.0)."),
    ("15", "Typed errors could replace historical functionality", "CURSOR_TRANSITIONS enumerates twelve transitions that must continue and five narrow permitted errors (G10.cursor.continuation-transitions)."),
    ("16", "C8 recursion counted as hybrid", "FRONTIER_RULES define permitted host frontier control (HS-FRONTIER), fixed cut, bounds, cost and no mutation; such tasks count as pure."),
]


CHANGELOG_0310 = [
    ("W0-1.1.2, V-D01e", "W0 pin moves", "Merged exp/D01-w0-1.1.2 (fedfcda) with the pin move: W0_PIN W0-1.1.2 at fedfcda, 146 hashes of lab/world/W0/SHA256SUMS (an input; table digest b5941569...b051c pinned), 136 cases, frozen expected-sha256.json and input-sha256.json; verifierEntry V-D01e-W0-1.1.2; previousPin W0-1.1.1 (ada2e90, 95 files)."),
    ("O-DOMAIN, V-D01c", "O-DOMAIN pinned, fingerprint pinned", "Merged exp/D01c-o-domain (5d1fd1a): ORACLE_PINS O-DOMAIN with 7 hashes (O_DOMAIN_FILES), BUILT-ACCEPTED, verifierEntry V-D01c-O-DOMAIN; W0_PIN.oDomainFingerprint pinned from lab/oracles/domain/receipts/population-100k.json (an input) and checked equal to V-D01's final fingerprint; oracleRunners O-DOMAIN (run {case}; decodedInputArgv for inputBase64 cases C91, C92, C128); the 26 O-DOMAIN obligations are closable on the O-DOMAIN and W0 side."),
    ("Q65a", "O-CONTRACT runner", "build_contract.py --oracle O-CONTRACT {case} answers one composition-identity case as canonical JSON {bound, unboundAssignments, imagesPinned, variant} from obligations.json (contract_oracle_answer; compositionFields added); oracleRunners O-CONTRACT; a self-check matches composition_ok and the image pins on 7 probes."),
    ("Q67, Q71 (field names for EXP-E01)", "Evaluator rules", "qualificationRun.blockers, executionIdentity {fields [sourceTreeSha256, buildSpecSha256, lockfileSha256, toolchain, runnerSha256, configSha256], toolchain, installMetadata}, isolation, kinds (promotion rejected explicitly); buildSpec.installMetadataExclusions (null), installMetadataRule, specSha256Rule (build_spec_sha256), proposal (pinned when obl-case.ts exists); evidenceSchemas oracle-invocation/1 {oracle, pinCommit, argvSha256, runtime, inputSha256, exit, outputSha256}; workloadIdentity drops slot and gains placement (per-arm {slot, cpuset, cpus}); paired records carry perRound [{histograms {candidate, A0}, signals}], window GREEN, accounting all-offered and placement; rounds must be a registered look; case-result/2 verdicts use reference_compare with the declared comparator; errorRepresentation; COMPOSITION.incarnationFencing; load-contract P3 publicationEnumeration."),
    ("Q66", "Erasure prefixes", "ERASURE.inFlight adds n + 1 prefixes, cursor prefixes and scope; ER-INFLIGHT-PREFIXES and ER-CURSOR-ERASURE-PREFIX join G9.erasure.residual-shapes and the q52-shapes refusal; DR-JSON-STRING-TEXT notes the explicit conversion as a lane obligation."),
    ("Q63, Q68, Q69", "Directions and protocol", "COMPOSITION sharedVolumeFollower, parameterisedSql, currentPath, experimentDirections P1-replicas and EXP-P4; OUTBOX sweepFrames (64 per frame); P1 and P4 hostServedReads; ERASURE currentCopies; PAIR_0 windowProcedure, verdicts, aaInAbMode, continuousTrace, liveComposition, calibration and the screening-r4 fallback; writerTrace.generator.frozenScreening."),
    ("Q57, Q64, Q72f", "Readings, checks, one error id", "WORLD_W0 readings A01 to A15 with V-D01e N1; the Q64f check (no pending row also in RULINGS.md); E-UNAVAILABLE-CUT retired (RETIRED_ERRORS), CE-FUTURE-BASIS moves to E-BASIS-NOT-AVAILABLE in G8.publish.basis-honesty and G10.cursor.continuation-transitions."),
    ("Closability", "Pin-level blockers", "obligations.json closability: per obligation the contract-level blockers (oracle pins, excludes, refusals, the W0 pin) with counts; evaluator-side blockers are QUALIFICATION_RUN.blockers."),
    ("Rulings files", "RULINGS.md", "Q57, Q63 to Q69, Q71 and Q72f moved into RULINGS.md; RULINGS-PENDING.md pending ids at generation: " + (", ".join(pending_ruling_ids()) or "none") + "."),
]
CHANGELOG_039 = [
    ("Q61 (field names for EXP-E01)", "Evaluator contract fields", "obligations.json gains: oracleRunners {O-REPLAY: {argv [python3, -I, lab/oracles/replay/cli.py, {case}], files null}}; oracleAnswerRule and answerMembers {O-REPLAY: [commandOutcomes, state, queries]}; caseManifest {format triplex-db-2/case-manifest/1, required [id, tags, input, contentSha256, comparator], optional [oracle, faultPoint]}; buildSpec {format triplex-db-2/build-spec/1, argv, outputs, run: null until specified}; imagePins {xtdb, qlever: {image, imageId}}; evidenceSchemas build-manifest/2 (+ inputs, buildSpecSha256), case-result/2 (+ mode, rep, comparator, inputSha256), fault-witness/1 {obligation, case, mode, rep, faultPointId, injectedAt, lastWitnessedTransition, eventsSha256}; workloadIdentity.appliesTo (CR-NS and CR-GS only); qualificationRun.contractSource (the authority ref, main); a0Registry.entryShape.measuredBy (a VERIFIER_REGISTRY entry of kind a0). load-contract.json gains writerTrace.generator.frozen {sha256, seed, offerScheduleSha256}, null until frozen."),
    ("Q60 (provisional)", "PAIR-0", "load-contract measurementProtocol (PAIR_0: design, margins, slotRegime, accounting, windows, screeningSeries, lease, a0) and windows.judging; NS obligations use modes [single-execution, paired-rounds]; CR-NS holds only from paired rounds and GREEN windows; RECEIPT_SCHEMA slotRegime {cpuMax, cpuset, cpuWeight} and rounds; A0_REGISTRY.measurement; paired_ok in the reference model; five CX-PAIR0 / CX-A0 counterexamples."),
    ("Q58a (provisional, flagged for Sam)", "Native-query tokens", "COMPOSITION readGuarantees.native replaced: facade only, after and at tokens, E-BASIS-NOT-AVAILABLE {required, observed, replica}, the new E-BASIS-NOT-RECONSTRUCTIBLE, a session high-water mark as an implicit after, {basis: {low, high}, route} on every answer, readGuarantees.nativeDeadlineMs 2000; seven NATIVE_TOKEN_CASES in G7.composition.ack-and-routed-ryow."),
    ("Q58b to Q58e", "Broker and overlay", "COMPOSITION experimentDirections (EXP-P2B, broker-hardening); G7.broker.promotion-hardening amended to the SQLite substrate (BR-SQLITE-DURABILITY-PRAGMAS, BR-CRC-CHAIN-MID-WAL, BR-COMMITTED-AT, BR-EPOCH-ROW, BR-MARKER-CHECKPOINT-CROSSCHECK, BR-RECENT-ROWS-PERSISTED, BR-LOG-CRYPTO-SHRED; rotation and flock removed); COMPOSITION overlay and the new G7.composition.overlay-rules (five OVERLAY_CASES); ERASURE logErasure, the recent_rows overlay in PROTECTED_COPY_INVENTORY and ER-LOG-CRYPTO-SHRED in G9.erasure.protected-copies."),
    ("Q62a to Q62c", "V-P2Q", "Six P2Q_READ_CASES (in-transaction executor reads, the CAS read set, replica regression, beyond-prefix pulls, outage pull and retraction-target fallbacks) in G7.composition.ack-and-routed-ryow; fault point C2-TWO-BROKERS-ONE-PROCESS in G7.commit.protocol-transitions; GATE-BROKER-HARDENING: a default-off merge needs only Q62a; storagePerCommit records QLever A0 653 triples per 10-fact command."),
    ("Q59a to Q59f", "0.3.8 answers", "Claims depending on an unpinned oracle are diagnostics (Q59e); VERIFIER_REGISTRY.briefRule (Q59c); Q59a, b, d, f confirmed as compiled."),
    ("Rulings files", "RULINGS.md", "Q58 to Q62 moved into RULINGS.md; RULINGS-PENDING.md pending ids at generation: " + (", ".join(pending_ruling_ids()) or "none") + "."),
]
CHANGELOG_038 = [
    ("Q56i, Q46d", "O-REPLAY pin moves", "The oracle merge (exp/O04-oracle-erasure a9c1327, verify/O02 fa6c236) and the pin move land together: O-REPLAY 0.4.1 BUILT-ACCEPTED at a9c1327 with the 29 hashes of hashes.a9c1327.json (an input, checked against the tree), acceptance V-O04c; excludes empty (F2 fixed); the blanket erasure refusal is gone; residual refusals are the Q52 shapes and the three 0.3.1 sites (entities.py:61 scale evolution, run.py:53 TDK1 keys, views.py:129 envelope facts); the eleven erasure obligations, G9.erasure.commit-semantics, G9.erasure.query-semantics and G1.decimal.channel-routing may close on the oracle side; PIN_SCOPE_EXPECTED_DIFF records the differences from V-O03's pin_scope.json."),
    ("Q55a", "Qualification is a run", "QUALIFICATION_RUN, qualification_run and resolve_cases: the evaluator builds the declared tree and A0 (which must reproduce the registry's binarySha256), resolves every case and mode from pinned manifests, runs the system on a registered slot, computes expected answers with the pinned oracle and applies the declared comparator; claim-supplied records are diagnostics; VERIFIER_REGISTRY (V-O03, V-O04c, V-D01-W0-1.1.1) is the only path for independent verification, of oracle pins, the W0 pin and claimed obligations; CX-R7-INVENTED-EVIDENCE, CX-R7-SELECTION-OVERREACH and CX-R7-RELABELLED-CONTROL are executed and rejected."),
    ("Q55b", "Source and replica publication", "COMMIT_OUTCOMES has one table per protocol variant (log-source, engine-source); QT4 splits into QT4s-SOURCE-PUBLISHED and QT4r-REPLICA-APPLIED; success after QT4s; compositions declare their source variant and a log source binds its identity and durability configuration (composition_ok, LOG_FIELDS); new fault points C2-SOURCE-PUBLISHED-REPLICA-BEHIND and C2-CRASH-AFTER-SOURCE-PUBLISHED."),
    ("Q55c, Q50a, Q50b", "Per-surface read guarantees", "COMPOSITION readGuarantees (provisional, flagged for Sam; supersedes Q50b): repository pulls by routing with replica-down fallback to the source; native answers report their basis, honour a basis token or fail E-BASIS-NOT-AVAILABLE, answer at the watermark without one and fail E-REPLICA-UNAVAILABLE with the replica down; tested per surface in G7.composition.ack-and-routed-ryow and NS.P2."),
    ("Q55d, Q55e", "P3 lag and the fingerprint", "NS.P3 and load-contract P3 measure lag from the source's own publication timestamp, recorded independently of ACK delivery, with every committed position accounted (NS-P3-EVERY-POSITION-ACCOUNTED); the O-DOMAIN fingerprint pin changes only by a reviewed contract version and stays null."),
    ("Q52, Q56", "Erasure", "ERASURE inFlight is per commit (Q52e replaces the 0.3.7 per-value text); queriesResidual, commandShape, selectors, presence and syntheticData; Q56a-g are selected cases of G9.erasure.commit-semantics and G9.erasure.query-semantics; the Q52 shapes are G9.erasure.residual-shapes (with DR-JSON-CONVERT-ROUNDING), blocked by the q52-shapes refusal until 0.4.2."),
    ("Q50c, Q50d, Q50e", "Broker", "G7.broker.promotion-hardening (overlay bound with E-OVERLOADED, segment rotation, kernel flock) and GATE-BROKER-HARDENING for promotion of log-source compositions; storage per commit reported in P2; the QLever exclusive run queue recorded."),
    ("Q51a, Q51c to Q51f", "Commit path", "Per-subject queue with typed E-OVERLOADED and group commit (NS-P2-HOT-SUBJECT-QUEUE); positions bound after publication as opaque, totally ordered values (G7.position.bound-after-publication); EXP-J01 storage metrics; the 100k rung deferral; SIGKILL fault points on both lanes and E-DUAL-COMMIT-PATH. Q51b stays in RULINGS-PENDING.md (an experiment direction with no contract effect)."),
    ("Q53, Q54", "W0 readings, 0.3.7 answers", "WORLD_W0 readings (A01 to A10 accepted) and the W0-1.1.2 note in nextEdit; Q54a-e checked (valid-writes stays blocked; no reach for CS-REQ and CS-TYPES8; schemas adopted)."),
    ("Rulings files", "RULINGS.md", "Q50 and Q52 to Q56 moved into RULINGS.md, and Q51 without Q51b; RULINGS-PENDING.md pending ids at generation: " + (", ".join(pending_ruling_ids()) or "none") + "."),
]
CHANGELOG_037 = [
    ("Q47d", "Pending rulings", "RULINGS-PENDING.md may hold ruling rows with no authority: pending_ruling_ids lists them (pendingRulings, with the file's hash also under inputs), they are never compiled and never fail generation or --verify; an id both pending and compiled is an error; a regression check feeds a synthetic pending row and confirms it is listed and gains no authority."),
    ("Q47a", "Evidence meaning", "EVIDENCE_SCHEMAS (build-manifest/1, verifier-record/1, case-result/1) and open_record: the binary and every executed or imported module are retained objects hashing to the manifest; verifier records must match their schema and name the obligation; case_verdict recomputes every verdict from the retained raw result, so an oracle exit 2 or X-NOT-MODELED never counts as PASS and a mislabelled case rejects the evidence."),
    ("Q47b, Q46b", "Matched control", "WORKLOAD_IDENTITY (trace generator hash, seed, offer schedule hash, window, slot), validated and equal on measurement and control, a missing field never matching; A0_REGISTRY with null A0-XTDB and A0-QLEVER entries supplies the control's commit, tree and composition, never the claim, so every comparison is a diagnostic until EXP-N01/N02's A0 is frozen."),
    ("Q47c", "Refusals per case", "evidence_ok re-judges every retained case and rejects any refusal; refused_by propagates unsupported rules through indirect selections (scale-evolution reachedThrough CS-DECIMAL scale-evolution, CS-MIGRATION and CS-WIDEN), so G7.migration.schema-evolution, G7.migration.valid-writes-never-rejected and G1.types.storage-widening-safe are blocked; PIN_SCOPE_EXPECTED_DIFF records them."),
    ("Round 6 fixtures", "Codex counterexamples", "CX-R6-UNOPENED-MEANING (finding 1), CX-R6-UNMATCHED-CONTROL (finding 5) and CX-R6-INDIRECT-REFUSAL (finding 6) are executed against admit_claim with every oracle pinned and A0 registered and must be rejected, beside single-defect fixtures for each new check."),
    ("Q46a, Q46c, Q46d", "0.3.6 questions", "Crash cases cover all 10 pairs (checked); the W0 pin layout follows the merged W0-1.1.1 files; the O-REPLAY pin stays at 8cc2c26 until EXP-O04 is re-verified (nextPin)."),
    ("Q48a", "W0 accepted", "W0_PIN: W0-1.1.1 ACCEPTED at ada2e90 with the 95 hashes of W0-1.1.1-ada2e90-SHA256SUMS (checked against the table and the tree), review receipt and delta check set; W0_FINGERPRINT_CANDIDATE holds V-D01's final fingerprint; oDomainFingerprint stays a required null input, so domain-dependent claims remain diagnostics until O-DOMAIN reproduces it."),
    ("Q48b, Q48c", "Narrow release, next W0 edit", "NS.P5 and load-contract P5: a scoped release is measured at the 100k rung and its receipt binds the reached-subject list and hash (NS-P5-SCOPED-RELEASE-REACHED); WORLD_W0 nextEdit records W0-1.1.2 (no output, floor or fingerprint change)."),
    ("Q49a, Q49b, Q49d", "Erasure commit", "ERASURE journalCommit, idempotence and inFlight; G9.erasure.commit-semantics (identity-only journal changes, ledger, earlier change markers, idempotent re-erase, empty erase commits); G7.journal.logical-contract and G9.erasure.reproduction-modulo compare markers on both sides; in-flight reads may see the old value or the marker."),
    ("Q49c", "Erased values in queries", "ERASURE queries and G9.erasure.query-semantics (predicates, aggregates, ORDER BY, grouping, Unique, references), provisional under the Q24 flag for Sam."),
    ("Q49e", "JSON number to decimal", "DR-JSON-CONVERT converts from the as-written reading (toDecimal(json 0.1, 2, 1) = 0.1), never the binary64 expansion; DR-JSON-STRING-TEXT: decimal text in a JSON string is E-INVALID-VALUE unless converted."),
    ("Rulings files", "RULINGS.md", "Q46 to Q49 moved into RULINGS.md from lab/reviews/plan-v2-round6.responses.md; RULINGS-PENDING.md pending ids at generation: " + (", ".join(pending_ruling_ids()) or "none") + "; no RULINGS.md entry is recorded-not-compiled."),
]
CHANGELOG_036 = [
    ("Q45a", "O-REPLAY accepted", "O-REPLAY BUILT-ACCEPTED at 8cc2c26 with the 29 hashes of hashes.8cc2c26.json (checked against the tree) and acceptance receipt V-O03; per-oracle excludes (G1.decimal.channel-routing); oracle_scope recomputes the pin scope and is checked against pin_scope.json."),
    ("Q45b to Q45d", "Refusals, key bytes, DO-ROUND", "ORACLE_REFUSAL_RULE and ORACLE_REFUSALS (erasure, scale evolution): an exit 2 with X-NOT-MODELED fails closed; CX-REFUSAL-AS-AUTHORING. The three key-byte cases move from G1.types.decimal to G1.decimal.tdk1-admission and -serialization. DO-ROUND to a larger scale: precision p + (s - s_x) capped at 38."),
    ("Q43", "EXP-O03 decisions", "Q43_RULES (decimal error ids, E-DECIMAL-AVG, literal type, rounding modes, 38-digit expression limit, exact round to a larger scale, toInteger E-INTEGER-OVERFLOW, -0 read basis E-NEGATIVE-ZERO-INSTANT), each a selected case."),
    ("Q40, Q44", "W0-1.1.x", "WORLD_W0 ballast, two-hop floor, position ordinal, generator fingerprint, scoped R3, misreading cases; OUTBOX publish rule, basis order, retirement, live reconciles only, pure publish and receive operations; new outbox cases (correction revert, older basis, retirement reappearance, preview not published); W0 coverage cases for ballast, two hops, R3 and the fingerprint; W0_PIN adds R3, the delta check and O-DOMAIN's fingerprint, all null and failing closed (W0-1.1.1 is not merged)."),
    ("Q41", "Contract 0.3.5 questions", "Q40 compiled; Q37c's hash correction recorded; Q39b enforcement, the admit_claim reference model and O-TDK1 gating confirmed."),
    ("Q42a", "Evidence-backed admission", "evidence_ok and admit_claim open and hash every object, bind the binary through the build/import manifest, require freshness, modes, fault repetitions, verifier evidence, the claim's own measurement receipts and a matched A0 control, and reject unknown ids; fixtures for zero hashes, a stale binary, an earlier commit, an old receipt, short fault repetitions, a missing measurement, a missing or mismatched control, an unknown id and an empty store, plus positive controls."),
    ("Q42b, Q42c", "Receivers and the atomic unit", "G7.outbox.receiver-ordering (reversed arrival, gap recovery, restart, 1, 1, 3, 3, 2, late start; mutant M-RECEIVER-REGRESS) and G7.outbox.atomic-unit (crash between each of the 10 pairs of five transitions, guard advances on empty and unchanged evaluations; mutant M-OUTBOX-NONATOMIC)."),
    ("Rulings files", "RULINGS-PENDING.md", "Q41 to Q45 moved into RULINGS.md; RULINGS-PENDING.md keeps its header only; no RULINGS.md entry is recorded-not-compiled."),
]
CHANGELOG_035 = [
    ("Q37", "Contract 0.3.4 questions", "Q37a superseded by Q38a. Q37b compiled: every obligation an unaccepted oracle would close fails closed; A0 measurements are diagnostics. Q37c compiled with Q38e's revised hashes. Q37d confirmed: E-DECIMAL-FRACTION is one error for both uses."),
    ("Q38a", "No density exemption", "A0_ALLOCATOR_ALLOWLIST and density_proven removed; every composition, A0 included, runs the four falsifiers (POSITION_REQUIRED_CASES selected unconditionally by G7.position.coordinates); OUTSIDE_BLOCK_MUTATION_FIXTURE records the withTransaction rebinding that the old allowlist missed; mutant M-WITHTRANSACTION-REBIND must be killed by FX-NESTED-CUTS."),
    ("Q38b", "Evidence-based claim admission", "admit_claim derives position, composition identity, W0 and oracle-pin prerequisites from VA-valid, source-bound receipts (receipt_valid); supplied names and Booleans are ignored; any unpinned or unaccepted oracle the claim or its prerequisites use makes it a diagnostic, screening included; fixtures for a null O-REPLAY pin, supplied names, another source tree, missing falsifiers and an incompletely bound composition, plus a positive control."),
    ("Q38c", "Regeneration discipline", "rulings_coverage parses RULINGS.md and fails unless every entry is compiled or listed below; --verify runs after every compile."),
    ("Recorded, not compiled", "RULINGS.md entries without contract effect", (", ".join(EXPECTED_RECORDED_NOT_COMPILED) or "none") + "."),
    ("Q38d", "Decimal channel routing", "DECIMAL_ROUTING and G1.decimal.channel-routing (repository, native, raw; derived expressions; aggregates decode, compute exactly and encode; key arithmetic is E-MIXED-FAMILY; JSON opaque unless converted with validation); mutant M-DECIMAL-LEXICAL-ORDER."),
    ("Q38e", "O-TDK1", "O-TDK1 BUILT at lab/oracles/decimal/ with tdk1_reference.py 73467589...bf33 and gen_vectors.py b30b430a...e1e1 pinned; acceptance and the V5 vector pin stay null until an independent review of tdk1-vectors.json (candidate 0a699f59...d2a5)."),
    ("Q38f", "Outbox publication sequence", "OUTBOX: delivery key (id, publication sequence), sequence increments when the payload differs from the latest published one, publication state atomic with the outbox record, unacknowledged deliveries replay with original identity; G7.outbox.publication-sequence with OB-RELEASE-ROLLBACK (1650, 1700, 1650), OB-CRASH-BEFORE-DELIVERY, OB-UNCHANGED-ACTIVATION-RECOVERY; (id, version) replaced in GS.10, GS.11, GS.19, GS.19b, NS.P5 and the load contract; mutant M-OUTBOX-VERSION-DEDUP."),
    ("Q39", "EXP-X02", "KL-X9: XTDB DECIMAL read back as BIGINT rounds through a double; exact sums read DECIMAL as text (G5.agg.projection-sums, mutant M-X-DECIMAL-SUM-BIGINT). Receipts record nativeLanguage; engine-scope XTDB obligations touching a native or raw surface are keyed by native language, so XTQL and SQL never share a closure."),
]
CHANGELOG_034 = [
    ("Q33", "EXP-O02 RULING-NEEDED items", "Q33_RULES (21 rules, each a named case selected by its owning obligation): read-back-as-written JSON numbers (refines Q30a); decimal R-DEC-0 to 7 (E-DECIMAL-AVG new); retract-pattern out of range; CMP-CROSS-FAMILY-ORDERED; non-numeric operands and aggregates; unmapped faults and transaction-entity retracts; journal envelope; pagination reasons (malformed, other-query). Q33i: G10-CUR-01 E1/E2 compiled as other-query; QLever outcomes cross-checked against Q31j."),
    ("Q34a", "Density proven", "A0_ALLOCATOR_ALLOWLIST: sha256 of five allocator blocks per adapter (committedPosition or position, persist, withTransaction, nextCommitPosition, currentCommitPosition) at main 820607281edf, by ALLOCATOR_EXTRACTION_RULE; density_proven ignores positionsDense; G7.position.coordinates selects only the dense cases statically, with the falsifiers as conditional nonDenseAdds; FORGED_DENSITY_FIXTURE and CX-FORGED-DENSITY."),
    ("Q34b", "Fallback equivalence", "G7.composition.ack-and-routed-ryow is lane-scoped with EP-NATIVE; CO-RYOW-PER-SURFACE, CO-STALE-FALLBACK-REJECTED, CO-CROSS-LANGUAGE-RECIPE-IDENTITY; receipts record surface, recipe language, semanticQueryId and total latency; GS.04b on every claimed surface."),
    ("Q34c", "JSON guard and journal", "WR-JSON applies to user JSON only; generated journal JSON exempt; paired test WIRE-JSON-NEGZERO plus WIRE-JOURNAL-NUMBER-NEGZERO-ROUNDTRIP on both engines; mutant M-JSON-GUARD-ON-JOURNAL."),
    ("Q34d", "Claim admission", "CLAIM_ADMISSION and admit_claim: position, composition identity and W0 prerequisites on every comparative or promotion claim, screening included; failed or pending means DIAGNOSTIC; CX-SCREENING-CLAIM-PREREQ."),
    ("Q34e", "Consistent regeneration", "The generator regenerates a second time in a fresh process (--verify) and fails unless all five files are byte-identical."),
    ("Q35", "TDK1 decimal key", "TDK1 (channel decimal_order_v1, value-determined and order-preserving) replaces the earlier key wording and Q18's scaled-integer path (one representation); never concatenated or used as a prefix; errors E-DECIMAL-OVERFLOW and E-DECIMAL-FRACTION replace the earlier unrepresentable error; widening that admits every value is metadata-only; obligations G1.decimal.tdk1-admission, -ranges, -differential (gated on TDK1_VECTOR_PIN), -serialization, -writer-negative (R20 V3 to V7); oracle O-TDK1; generator self-check of the R20 worked examples and their order."),
    ("V-O02", "Oracle check C1 to C3", "C1: O-REPLAY points at lab/oracles/replay/ with status BUILT-PENDING-PIN; ORACLE_PINS is a required null input and GATE-ORACLE-PIN makes every obligation it would close fail closed until the oracle is accepted after EXP-O03. C2: the legacy scan reads commandTemplate cases and contrastCase entries; G1-I64-02 min-exact (-2^63) added (XTDB commits, QLever rejects with E-VALUE-OUT-OF-RANGE before mutation), making ten legacy outcomes. C3: Q33 compiled."),
    ("Q36", "W0 work items and fanout", "Delivery key (id, version) with early cutoff on GS.19, GS.19b, NS.P5 and the load contract; expected affected set = subjects whose static read set contains a changed fact (NS.P3); W0-LOCATION-ZIPF-S = 0.5 at 100k, other rungs N / 50 with the same s."),
]
CHANGELOG_033 = [
    ("Q30 (Q32a)", "Wire exactness", "WIRE_RULES WR-JSON, WR-INSTANT, WR-X-ENCODINGS, WR-Q-SHADOW, WR-INTEGER-RANGE; errors E-INEXACT-JSON-NUMBER and E-NEGATIVE-ZERO-INSTANT (InvalidTripleError invalid-value with details); CS-WIRE; G1.wire.write-guards (writer, bulk, replay), G1.wire.xtdb-encodings (XTDB lanes), G1.wire.qlever-shadow (QLever); mutants M-JSON-NEGZERO-NORMALIZE, M-X-JSON-LIST-PARAM, M-Q-SHADOW-EXACT-FLAG."),
    ("Q32b to Q32f", "Contract 0.3.3 questions", "Legacy vectors are rejection tests on QLever; pending follow-up EXP-G02: QLever in-range companion vectors by an independent golden author. 0.1% of trace commands are deliberately invalid and marked. Queue depth definition confirmed. Position falsifiers gate only non-dense compositions (position_selection, position_gate_blocks; the A0 controls on scope-counter adapters close with the nested-cut cases; unknown density fails closed). W0 pin null until V-D01, pinning needs a version bump."),
    ("Q29", "Contract 0.3.2 questions", "Compiled: golden files unchanged as the audit record with pinned hashes (a); Q8F-05 sign derived by the evaluator and cross-checked by O-REPLAY (b); single-execution default (c); provisional layer keys, decimal error names and 38 digits (d; the 250 ms wait superseded by Q31d); erasure on the tiny concurrent profile with GS.16 at year one (e)."),
    ("Q31a", "P2 progress", "NS-P2-UNJUSTIFIED-OUTCOMES-MAX 0, NS-P2-QUEUE-MAX-S 2, NS-P2-BURST-DRAIN-S 60 on NS.P2; the trace marks its deliberately invalid commands; load-contract P2 progress block; cases NS-P2-PROGRESS, NS-P2-QUEUE-BOUND, NS-P2-BURST-DRAIN."),
    ("Q31b", "Split reads", "Split reads straddle a command the frozen trace already holds; the driver adds no writes (NS-P1-SPLIT-NO-DRIVER-WRITES)."),
    ("Q31c", "Position coordinates", "POSITION (stream, epoch, offset, ordinal), lexicographic, not dense, fully resolved prefix watermark, aborted offsets in the resolution stream; O-REPLAY text now 'totally ordered coordinates' with oracle-assigned dense ordinals; G7.position.coordinates with the four falsifiers; GATE-POSITION on every NS and GS obligation."),
    ("Q31d", "Eligibility and fallback", "COMPOSITION eligibility (watermark in the basis epoch, C1, reconstructability, erasure frontier); T-WATERMARK-WAIT-MS 10; deadline-aware fallback whose latency counts, with route and surface language recorded and counted per surface."),
    ("Q31e", "ACK ownership", "G7.composition.ack-ownership replaced by G7.composition.ack-and-routed-ryow (ACK after source publication, routed read-your-own-write, ACKs continue in an outage, bounded catch-up queue); GS.04b measures fallback share and recovery time."),
    ("Q31f", "Erasure frontier", "ERASURE frontier, cache invalidation and key-exclusivity evidence; modulo erasure on C6, raw and native, SDK, cursors and explain (G9.erasure.reproduction-modulo); mutant M-ERASURE-FRONTIER-SKIP."),
    ("Q31g", "Decimal widening", "DS-WIDEN is metadata-only only when p - s does not shrink and order keys are proven unchanged; DS-WIDEN-MIGRATE otherwise (atomic rewrite or atomic failure)."),
    ("Q31h", "GS.19 wording", "Zero duplicate externally visible effects throughout; replay attempts allowed and counted."),
    ("Q31i", "W0 coverage and review", "W0-* coverage thresholds under CR-W0-COVERAGE (W0.coverage-floors); GATE-W0 on every O-DOMAIN obligation; W0_PIN is a required input that is null until V-D01 reviews W0, so those obligations fail closed."),
    ("Q31j", "Legacy signed-64 vectors", "LEGACY_LANE_OUTCOMES for the golden vectors or cases that commit integers outside QLever's range (nine in 0.3.3, ten from 0.3.4) (XTDB commits, QLever rejects with E-VALUE-OUT-OF-RANGE before mutation); checked against a scan of the golden files; originals unchanged."),
    ("Q31k", "Positive evaluator fixtures", "EVALUATOR_POSITIVE_FIXTURES, one complete receipt set per closure rule in use that must CLOSE, so an always-OPEN evaluator fails."),
]
CHANGELOG_032 = [
    ("Q21", "G01 golden-vector ambiguities", "AMB_RULINGS (17) and GOLDEN_RESOLUTIONS (one selected reading per AMBIGUOUS golden query, 17 queries); golden files pinned by sha256; CMP-NEGZERO amended to the lowest (recordedPosition, operation index); G5.agg.full-support reads 'equal values on distinct entities' (SUM 10, COUNT 1); empty interval E-INVALID-VALUE; integer range predicates in find; find conflict unless projected out; journal -0.0 bit-exact, creation order and staged facts; AMB-04, AMB-09, AMB-17 provisional, flagged for Sam."),
    ("Q22", "Decimal tables", "DECIMAL_OPS (result precision and scale per operator, divide(a, b, scale, rounding) only, bare / preflight), DECIMAL_CONVERSIONS, DECIMAL_SCALE_EVOLUTION, DECIMAL_TESTS; four new E-DECIMAL-* errors; CMP-DECIMAL-CROSS makes every comparison, equality included, a preflight error; a named case per row; input capture before normalization with mutant M-DECIMAL-PRECAPTURE-ROUND."),
    ("Q23", "Qualified write routes", "G1.types.out-of-range-rejected covers the writer, bulk, replay and restore (EP-REPLAY new), drops EP-RAW-WIRE; matrix row 51 records QLever's bare-wire wrap as KNOWN-LIMIT KL-Q1."),
    ("Q24", "Erasure", "ERASURE and PROTECTED_COPY_INVENTORY; G9.erasure.visibility-boundary, G9.erasure.protected-copies, G9.erasure.restore-reapplies; CS-ERASURE with the four TARGETS 7 tests; cursor stability, explain and GS.12 hold modulo erasure; provisional, flagged for Sam."),
    ("Q25", "Secondary bars", "T-RECURSION-P99-MS, T-LAT-RATIO-10M-1M and T-DEEP-PAGE-RATIO are kind secondary under CR-METRICS (SECONDARY_RULE); bounded execution stays in goal 6 and the C8 frontier."),
    ("Q26", "Closure rules", "CR-CALIBRATION requires every threshold any NS obligation names and fails closed on an empty set; MODE_RULE with explicit single-execution for NS and GS (and as the default); GS.01 selects only its own cases; generator checks each GS obligation's cases, bars and evidence binding; 27 EVALUATOR_COUNTEREXAMPLES covering every closure rule in use (R.evaluator.incomplete-receipts)."),
    ("Q27", "History flatness", "NS-P4-HISTORY-FLATNESS is p99 on one matched 1,000-subject sample."),
    ("Q28", "Composition identity", "COMPOSITION; receipts bind four assignments, replication edges and watermarks (receipt format 2, VA14); engine-scope keys derive from the obligation's layer assignment; G8.composition.watermark-routing, G7.composition.ack-ownership, G10.composition.identity-bound; T-WATERMARK-WAIT-MS 250."),
    ("TARGETS 1.1, 2.1", "Measurement semantics and frozen trace", "load-contract.json format 3: P1 hot set, split reads, maintenance per window, driver-recorded basis, writer-wait attribution; P2 open-loop offer-to-ACK per size band with NS-P2-COMMIT-P99-26-50-MS (100, provisional) and NS-P2-UNACCOUNTED-MAX; P3 commit time, cursor, O-REPLAY plus O-DOMAIN affected set, durable milestone, three crash points, NS-P3-VISIBLE-DUP-EFFECTS-MAX; P4 frozen buckets with NS-P4-PULL-P99-LARGEST-MS (50, provisional) and CPU quota; P5 real W0 sweep with coverage, outbox, post-capture mutations and a throttled compaction variant; WRITER_TRACE generator (2% active set, Zipf 1.1, 95/5, 2,000 s, Poisson offers, burst phase, overlay, freeze, VA15)."),
    ("TARGETS 6.1", "World W0 and failure schedules", "WORLD_W0 and oracle O-DOMAIN for every scenario; positive and negative witness cases per scenario; GS.10 and GS.11 compared at one common input basis; added schedules GS-03-SUPERSEDED-REVISION (provisional), GS-04B-INDEX-PARTITION, GS-06B-SHARED-REFERENCE, GS-15-STORAGE-ACCESS, GS-15-SLOW-TENANT, GS-19B-OUTBOX-CRASH."),
]
CHANGELOG_031 = [
    ("Q16", "Derived thresholds, basis mix, timing, budgets", "History flatness 1.1 kept; reader basis mix now 80% latest committed tx, 15% within the last hour, 5% up to 90 days back (load-contract basisMix); acceptance windows 120 s + 600 s per level kept; new screening profile P-SCREEN (30 s + 120 s) that no obligation may list and whose receipts never close anything; budgets.json marked PROVISIONAL, re-frozen after EXP-N02 and before any candidate comparison."),
    ("Q17", "Sparse profile", "Stays dropped; GS.15 covers skew; the generator fails if a sparse profile reappears."),
    ("Q18", "Decimal", "DECIMAL_RULES: declared precision and scale; scaled integer when precision <= 15, else an order-preserving string (both replaced by TDK1 in 0.3.4); excess digits rejected with a typed error (renamed by Q35e); own family between number and datetime; CMP-DECIMAL-CROSS preflight error unless converted; kernel arithmetic; six named CS-DECIMAL cases selected by G1.types.decimal."),
    ("Q19", "Engine-side sums", "G5.agg.projection-sums: XTDB uses SUM(CAST(x AS DECIMAL(32,0))) once EXP-X02 confirms it, split-sum as fallback, EXP-F02 cross-checks; Q13 marked refined by Q19."),
    ("Q20", "Q8a and Q8b wording", "Both read integer, not int64; per-subject sums in the kernel (BigInt)."),
]
CHANGELOG_030 = [
    ("Re-scope", "Sam's re-scope (SCOPE.md, NORTH-STAR.md, TARGETS.md)", "The old generic load and stress section, its obligations, the old load contract and the hold are removed. New sections NS (P1 to P5, measured on the fixed writer trace; P1, P4, P5 per surface) and GS (GS.01 to GS.20); ten REQ obligations mapped to their goals with native-or-workaround closure; S is now the year-one measurement population, rungs and budgets."),
    ("Thresholds", "Provisional bars", "Every NS-* threshold is the TARGETS section 1 bar; non-NS thresholds are fixed values derived from those bars (marked derived); calibration tightens only, loosening needs Sam."),
    ("Numbers", "No silent precision loss", "VALUE_KINDS with a new decimal kind; LANE_INTEGER_RANGE (at least 2^53 on every lane; QLever rejects beyond +/-2^59 at write); G1.types.out-of-range-rejected and G1.types.decimal; G2.arith.integer-exact (kernel); G5.agg.projection-sums (engine-side sums only where a projection needs them, split-sum on XTDB); engine-side arithmetic rows are no longer required; QLever integer raw exceptions removed (reject at write)."),
    ("Rulings", "Q13 to Q15 and superseded rulings", "Compiled: Q13 split-sum recipe, Q14a family order, Q14b signed-zero representation by the lowest-position support (amended in 0.3.2 by AMB-08), Q14c correctly rounded binary64 SUM, Q14d preflight error, Q15 error tags; Q2, Q4, Q11 marked superseded."),
    ("Artifacts", "Generated outputs", "load-contract.json (writer trace, P1 ladder, P2 to P4 probes, P5 sweep, secondary) and budgets.json are generated again; the generator fails if a superseded target string reappears."),
]


def render_acceptance(doc, cells, counts):
    L = []
    A = L.append
    A("# triplex-db-2 acceptance contract\n")
    A(f"Version {VERSION}, {DATE}. Status: {STATUS}.\n")
    A("**Generated by `python3 -I lab/acceptance/build_contract.py`. Do not edit this file.** `obligations.json` is the only authority an evaluator reads; this file renders it for people. Where any text here and `obligations.json` differ, `obligations.json` wins.\n")
    A(f"Transitive contract hash: `{doc['transitiveContractSha256']}`.\n")
    A("## 0. Change log\n")
    A("### 0.3.10 (this version): W0-1.1.2 and O-DOMAIN pinned; rulings Q57, Q63 to Q69, Q71, Q72f\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_0310))
    A("\n### 0.3.9: rulings Q58 to Q62\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_039))
    A("\n### 0.3.8: rulings Q50 to Q56\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_038))
    A("\n### 0.3.7: rulings Q46 to Q49\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_037))
    A("\n### 0.3.6: rulings Q40 to Q45\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_036))
    A("\n### 0.3.5: rulings Q37 to Q39\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_035))
    A("\n### 0.3.4: rulings Q33 to Q36\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_034))
    A("\n### 0.3.3: rulings Q29 to Q32 and the revised TARGETS 1.1, 4.1, 6.1 and 7\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_033))
    A("\n### 0.3.2: rulings Q21 to Q28 and TARGETS v2\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_032))
    A("\n### 0.3.1: orchestrator rulings Q16 to Q20\n")
    A(md_table(["Ruling", "What", "Change"], CHANGELOG_031))
    A("\n### 0.3.0: retargeted to Sam's re-scope\n")
    A(md_table(["Area", "What", "Change"], CHANGELOG_030))
    A("\n### 0.2.0: response to `lab/reviews/acceptance-review-r1.codex.md`\n")
    A(md_table(["Review finding", "Problem", "Change"], CHANGELOG_020))
    A("\n### 0.1.0-draft\n\nFirst draft (88 obligations). Superseded.\n")
    A("## 1. How to read this contract\n")
    A("- **One obligation is one binary fact.** It has an id, a statement, lanes, case selections, oracles, entrypoints, profiles, a closure (rules, modes, thresholds), mutation controls, the PLAN contracts it traces, sources, a grounding label and a verifier mode.")
    A("- **Every status is OPEN.** No acceptance receipt exists for any obligation.")
    A("- **Authority for goals and targets.** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` and `lab/research/SAM-pasted-numbers-2026-11-07.md` (Sam, 2026-11-07), compiled with `RULINGS.md` into `obligations.json`. Correctness is the floor on every priority: a fast wrong answer scores zero.")
    A("- **Values this contract chose.** Thresholds whose source says `derived`, the reader read mix and window lengths in `load-contract.json`, and the A0 allowances in `budgets.json` are values no source states; they are fixed so evaluation is mechanical, and changing one is a contract version.")
    A("- **Artifacts.** `obligations.json` (authority), `load-contract.json`, `budgets.json`, `capability-matrix.md`, this file. All generated.\n")
    A("## 2. Done predicate (PLAN v1.1 section 1)\n")
    A("```")
    A("done(T) = for one identified integrated profile T per surface")
    A("          AND over lanes { xtdb-xtql, xtdb-sql, qlever-sparql }")
    A("          AND over sections { G1..G10, R, S, L }")
    A("            closed(section, lane, T)")
    A("          with every receipt FRESH on T (no carry-forward into final acceptance)")
    A("")
    A(" retained evidence --> VC / VA / VM / VV validity --> closure rules recompute verdicts --> obligation")
    A("   (runs/objects)       (acyclic: VC <- VA <- VM, VV)    from retained bytes             --> section --> lane --> done")
    A("```\n")
    A("\n".join("    " + s if i else s for i, s in enumerate([""])))
    A("Status algorithm:\n\n```\n" + "\n".join(STATUS_ALGORITHM) + "\n```\n")
    A("**Lane accounting.** " + LANGUAGE_RULES["substep"] + " " + LANGUAGE_RULES["hybrid"] + "\n")
    A(md_table(["Permitted host step", "Source", "Rule"], [[h["id"], h["source"], h["rule"]] for h in LANGUAGE_RULES["permittedHostSteps"]]))
    A("\n**C8 frontier control (HS-FRONTIER).**\n")
    A("- Permitted host operations: " + "; ".join(FRONTIER_RULES["permittedHostOperations"]) + ".")
    A("- Forbidden host operations: " + "; ".join(FRONTIER_RULES["forbiddenHostOperations"]) + ".")
    for k in ("fixedCut", "bounds", "cost", "noMutation", "accounting"):
        A(f"- {k}: {FRONTIER_RULES[k]}")
    A("")
    A("## 3. Compiled rulings\n")
    A("Each ruling of `RULINGS.md` is compiled into the named data and checked by the generator (`ruling_checks`). The build fails if any check fails.\n")
    A(md_table(["Ruling", "Topic", "Compiled ruling", "Compiled into", "Check"], [[r["id"], r["topic"], r["ruling"], ", ".join(r["compiledInto"]) or "-", r.get("status", "PASS")] for r in RULINGS]))
    A("\n### 3.1 Golden-vector rulings (RULINGS Q21)\n")
    A(GOLDEN_RULE + "\n")
    A(md_table(["AMB", "Ruling", "Amends", "Provisional (flagged for Sam)"], [[a["id"], a["ruling"], ", ".join(a["amends"]), "yes" if a["provisional"] else "no"] for a in AMB_RULINGS]))
    A("")
    A(md_table(["Vector", "Query", "AMB", "Selected reading", "Refinement"], [[r["vector"], r["query"], r["amb"], r["reading"], r.get("refinement", "-")] for r in GOLDEN_RESOLUTIONS]))
    A("\n### 3.2 Legacy signed-64 golden vectors (RULINGS Q31j)\n")
    A(LEGACY_RULE + "\n")
    _scan = legacy_out_of_range_scan()
    A(md_table(["Vector", "File", "Committed values outside QLever's range", "XTDB lanes", "qlever-sparql"], [[k, _scan.get(k, {}).get("file", "NOT FOUND BY SCAN"), ", ".join(_scan.get(k, {}).get("values", [])), v["xtdb"], v["qlever"]] for k, v in LEGACY_LANE_OUTCOMES.items()]))
    A("\n## 4. Frozen semantic tables (expected-answer authority)\n")
    A("A later change in production behavior never changes an expected answer automatically; it needs a contract version.\n")
    A("### 4.0 Value kinds and the numeric rule (NUMERIC)\n")
    A(md_table(["Kind", "Rule"], [[v["kind"], v["rule"]] for v in VALUE_KINDS]))
    A("")
    A(md_table(["Engine", "Declared integer range", "Rule"], [[k, v["declared"], v["rule"]] for k, v in LANE_INTEGER_RANGE.items()]))
    A(f"\nEvery lane accepts at least [-(2^53-1), 2^53-1]. {RANGE_RULE}\n")
    A("**Decimal (RULINGS Q18).** " + " ".join(f"{k}: {v if isinstance(v, (str, int)) else '; '.join(x['when'] + ' -> ' + x['as'] for x in v)}." for k, v in DECIMAL_RULES.items() if k != "source") + "\n")
    A("**Decimal operations (RULINGS Q22).**\n")
    A(md_table(["Id", "Operation", "Result scale", "Result precision", "Error", "Case"], [[r["id"], r["op"], r["resultScale"], r["resultPrecision"], r["error"], r["case"]] for r in DECIMAL_OPS]))
    A("\n**Decimal conversions and scale evolution (RULINGS Q22).**\n")
    A(md_table(["Id", "Rule", "Case"], [[r["id"], r["rule"], r["case"]] for r in DECIMAL_CONVERSIONS + DECIMAL_SCALE_EVOLUTION]))
    A("\n**Decimal test classes (RULINGS Q22).** " + "; ".join(f"{k}: {v}" for k, v in DECIMAL_TEST_TEXT.items()) + ".\n")
    A("**Wire exactness (RULINGS Q30).**\n")
    A(md_table(["Id", "Rule", "Source", "Cases"], [[r["id"], r["rule"], r["source"], ", ".join(r["cases"])] for r in WIRE_RULES]))
    A("")
    A("**Decimal order key TDK1 (RULINGS Q35).** " + " ".join(f"{k}: {v}." for k, v in TDK1.items() if k not in ("examples", "name")) + "\n")
    A(md_table(["Value", "TDK1 key"], [[v, f"`{k}`"] for v, k in TDK1["examples"]]))
    A("")
    A(md_table(["Test", "Obligation", "Check", "Pass", "Case"], [[k, v["obligation"], v["check"], v["pass"], v["case"]] for k, v in TDK1_TESTS.items()]))
    A("O-REPLAY pin (V-O02 C1, RULINGS Q45a): " + ("BLOCKED, fails closed" if ORACLE_PINS["O-REPLAY"]["acceptReceipt"] is None else f"accepted at {ORACLE_PINS['O-REPLAY']['commit'][:7]} with {len(ORACLE_PINS['O-REPLAY']['sha256'])} pinned files ({ORACLE_PINS['O-REPLAY']['acceptReceipt']})") + "; every obligation using a pinned oracle carries GATE-ORACLE-PIN.\n")
    A(f"\nTDK1_VECTOR_PIN ({TDK1_VECTOR_PIN['file']}): " + ("BLOCKED, fails closed until pinned" if TDK1_VECTOR_PIN["sha256"] is None else TDK1_VECTOR_PIN["sha256"]) + ".\n")
    A("**Decimal channel routing (RULINGS Q38d).**\n")
    A(md_table(["Id", "Rule", "Case"], [[r["id"], r["rule"], r["case"]] for r in DECIMAL_ROUTING + DECIMAL_ROUTING_Q52]))
    A("\nO-TDK1 files pinned (RULINGS Q37c, Q38e): " + "; ".join(f"{k} {v}" for k, v in O_TDK1_FILES.items()) + f". Vector candidate {TDK1_VECTOR_PIN['candidateSha256']} awaits independent review.\n")
    _sc = oracle_scope("O-REPLAY")
    A(f"**O-REPLAY pin scope (RULINGS Q45a, Q45b).** Accepted at {ORACLE_PINS['O-REPLAY']['commit'][:7]} ({len(ORACLE_PINS['O-REPLAY']['sha256'])} files, {ORACLE_PINS['O-REPLAY']['acceptReceipt']}). Uses: {len(_sc['uses'])}; may close: {len(_sc['mayClose'])}; blocked: {len(_sc['blocked'])}. " + ORACLE_REFUSAL_RULE + ".\n")
    A(md_table(["Blocked obligation", "Why"], [[k, ", ".join(v)] for k, v in sorted(_sc["blocked"].items())]))
    A("")
    _sd = oracle_scope("O-DOMAIN")
    A(f"**O-DOMAIN pin.** Accepted at {ORACLE_PINS['O-DOMAIN']['commit'][:7]} ({len(ORACLE_PINS['O-DOMAIN']['sha256'])} files, {ORACLE_PINS['O-DOMAIN']['acceptReceipt']}). Uses: {len(_sd['uses'])}; may close: {len(_sd['mayClose'])}; blocked: {len(_sd['blocked'])}.\n")
    _cl = closability()
    A(f"**Closability (pin level).** {_cl['counts']['closable']} of {_cl['counts']['total']} obligations have no contract-level blocker; {_cl['counts']['blocked']} are blocked: " + "; ".join(f"{k} {v}" for k, v in _cl["blockerCounts"].items()) + ". Every claim is also blocked by QUALIFICATION_RUN.blockers until they clear (RULINGS Q67a).\n")
    A(md_table(["Refusal", "Sets", "Cases", "Reached through (RULINGS Q47c)", "Until"], [[k, ", ".join(v["sets"]) or "-", ", ".join(":".join(c) for c in v["cases"]), ", ".join(":".join(c) for c in v.get("reachedThrough", [])) or "-", v["until"]] for k, v in ORACLE_REFUSALS["O-REPLAY"].items()]))
    A("\nNext O-REPLAY pin: " + ORACLE_PINS["O-REPLAY"]["nextPin"] + ".\n")
    A("**Outbox publication (RULINGS Q38f).** " + " ".join(f"{k}: {v}." for k, v in OUTBOX.items() if k != "cases") + "\n")
    A(md_table(["Case", "Expected"], list(OUTBOX["cases"].items())))
    A("")
    A("**EXP-O02 rulings (RULINGS Q33).**\n")
    A(md_table(["Id", "Rule", "Error", "Case", "Ruling"], [[r["id"], r["rule"], r["error"], r["case"], r["ruling"]] for r in Q33_RULES]))
    A("")
    A(md_table(["Vector", "Query", "Vector's reason", "Compiled reading", "Why"], [[x["vector"], x["query"], x["vectorReason"], f"{x['compiled']['_tag']} / {x['compiled']['reason']}", x["why"]] for x in Q33I_CURSOR_READINGS]))
    A("\nQ33i QLever lane outcomes (rejected with E-VALUE-OUT-OF-RANGE at write): " + ", ".join(Q33I_QLEVER_REJECTED) + "; cross-checked against LEGACY_LANE_OUTCOMES.\n")
    A("**Temporal, read-shape and journal rules (RULINGS Q21).**\n")
    A(md_table(["Id", "Rule", "Source"], [[r["id"], r["rule"], r["source"]] for r in TEMPORAL_RULES + READ_SHAPE_RULES + JOURNAL_RULES]))
    A("")
    A("### 4.1 Numeric operations\n")
    A(md_table(["Id", "Operation", "Rule", "Examples", "Source"], [[n["id"], n["op"], n["rule"], "; ".join(f"{a} = {b}" for a, b in n["examples"]), n["source"]] for n in NUMERIC_OPS]))
    A("\n### 4.2 Conversions\n")
    A(md_table(["Id", "Rule", "Examples"], [[c["id"], c["rule"], "; ".join(f"{a} = {b}" for a, b in c["examples"])] for c in CONVERSION_RULES]))
    A("\n### 4.3 Comparisons and group identity\n")
    A(md_table(["Id", "Rule", "Source"], [[c["id"], c["rule"], c["source"]] for c in COMPARISON_RULES]))
    A("\n### 4.4 Aggregates\n")
    A(md_table(["Id", "Rule", "Examples", "Source"], [[a["id"], a["rule"], "; ".join(f"{x} = {y}" for x, y in a.get("examples", [])), a["source"]] for a in AGGREGATE_RULES]))
    A("\n### 4.5 Cardinality-many order\n")
    A(f"{CARD_MANY_ORDER['rule']}. Family order: {', '.join(CARD_MANY_ORDER['familyOrder'])}. " + "; ".join(f"{k}: {v}" for k, v in CARD_MANY_ORDER["valueOrder"].items()) + f". {CARD_MANY_ORDER['note']}\n")
    A("### 4.6 Constraint enforcement\n")
    A(md_table(["Id", "Rule", "Source"], [[c["id"], c["rule"], c["source"]] for c in CONSTRAINT_RULES]))
    A("\n### 4.7 Errors (O-ERR)\n")
    A(ERROR_COMPARISON + "\n")
    A(md_table(["Id", "Tag", "Reason", "Phase", "Status"], [[x["id"], x["tag"], x["reason"], x["phase"], x["status"]] for x in ERROR_TABLE]))
    A("\n## 5. Evidence model and closure\n")
    A("### 5.1 Receipt schema\n")
    A(md_table(["Field", "Type"], list(RECEIPT_SCHEMA["fields"].items())))
    A("\n### 5.2 Evidence kinds\n")
    A(md_table(["Kind", "Fields"], list(EVIDENCE_KINDS.items())))
    A("\n### 5.3 Selector semantics\n\n" + SELECTOR_SEMANTICS + "\n")
    A("### 5.4 Threshold registry\n")
    A(CALIBRATION_RULE + "\n")
    A(md_table(["Id", "Kind", "Value", "Bound", "Unit", "Source", "Closure rule"], [[k, v["kind"], v["value"], v["bound"], v["unit"], v["source"], THRESHOLD_RULE_FOR_KIND[v["kind"]] or "count (checked inside the rule that uses it)"] for k, v in THRESHOLDS.items()]))
    A("\n### 5.5 Validity classes\n")
    for k, v in VALIDITY.items():
        A(f"**{k}** ({v['for']}; depends on {', '.join(v['dependsOn']) or 'nothing'}).")
        for rr in v["rules"]:
            A(f"- {rr}")
        A("")
    A("### 5.6 Closure rules\n")
    A(md_table(["Rule", "Evidence", "Validity", "Recomputed from retained evidence", "Holds when"], [[k, ", ".join(v["evidence"]), ", ".join(v["validity"]), v["recompute"], v["holds"]] for k, v in CLOSURE_RULES.items()]))
    A("\n### 5.7 Applicability, carry-forward and fresh final acceptance\n")
    A("- Bound identities: " + "; ".join(APPLICABILITY["boundIdentities"]) + ".")
    A("- " + APPLICABILITY["carryForward"])
    A("- " + APPLICABILITY["screening"] + "\n")
    A("- " + APPLICABILITY["finalAcceptance"] + "\n")
    A("### 5.8 Verifier coverage\n")
    A(md_table(["Mode", "Rule"], list(VERIFIER_MODES.items())))
    A("\nEvery obligation's verifier mode is listed with it in section 10.\n")
    A("### 5.9 Mutation controls\n")
    A(MUTANT_RULE + "\n")
    A(md_table(["Mutant", "Fault", "Reach probe", "Targets"], [[k, v["fault"], v["reachProbe"], ", ".join(v["targets"])] for k, v in MUTANTS.items()]))
    A("\n### 5.10 Loophole bans\n")
    A(md_table(["#", "Loophole", "Enforced by"], [
        ["B1", "skips, zero executions, filtered cases", "VA8, selector semantics"],
        ["B2", "unsupported markers or refusing a required shape", "VA8, E-UNSUPPORTED-SHAPE note, fragment coverage set, CR-MATRIX"],
        ["B3", "lowered thresholds", "fixed registry, calibration tightens or reports UNATTAINABLE only, VC3"],
        ["B4", "stale builds, partial tree identity", "VA2, VA3, APPLICABILITY"],
        ["B5", "wrong endpoints or images", "VA4, VA5"],
        ["B6", "hybrid tasks counted for one language", "VA9, permitted host steps"],
        ["B7", "calibration, diagnostic or probe runs as acceptance", "runKind per validity class"],
        ["B8", "inherited homebase receipts", "VA1"],
        ["B9", "oracle or expected-answer edits, casefolding, page re-sorting", "VA6, CR-COUNTEREXAMPLE, frozen tables"],
        ["B10", "KV as the oracle", "O-KV independence"],
        ["B11", "rerun until green", "VA12"],
        ["B12", "subsets and shrunk fixtures", "pinned manifests, VA8"],
        ["B13", "receipt collage across profiles", "done predicate, APPLICABILITY.finalAcceptance"],
        ["B14", "scale inflation (tiny scopes, wrapper triples, trivial history)", "held S obligations (0.1.0 counting rules); draft population in heldDrafts"],
        ["B15", "load accounting tricks", "load-contract invariants (fixed writer trace, open-loop schedule, metric definitions), CR-NS and CR-GS"],
        ["B16", "policy by omission", "policy-pending cannot close"],
        ["B17", "engine swap", "VA4"],
        ["B18", "mutating the oracle side or counting crashes as kills", "VM1, VM4"],
        ["B19", "success before publication", "COMMIT_OUTCOMES.successRule, M-EARLY-ACK"],
        ["B20", "typed error instead of continuation", "CURSOR_TRANSITIONS"],
        ["B21", "trusting receipt PASS fields", "closure rules recompute from retained evidence"],
    ]))
    A("\n## 6. Oracle specifications\n")
    A(md_table(["Oracle", "Status", "Files", "Comparator", "Independence"], [[k, v["status"], ", ".join(v["files"]), v["comparator"], v["independence"]] for k, v in ORACLES.items()]))
    A("\nOracle lifecycle: TO-BUILD or TO-AUTHOR, then BUILT, then ACCEPTED after independent review recorded in the commit; only ACCEPTED oracles with pinned file hashes close obligations (VA6). Comparators:\n")
    A(md_table(["Comparator", "Rule"], list(COMPARATORS.items())))
    A("\n### 6.1 O-REPLAY (independent Python event replay)\n")
    for s in [
        "**Inputs.** The captured command intent (ordered submissions with operations, typed values in canonical encoding, entity ids and types, valid intervals, preconditions, meta, enforcement mode and rules, nested-transaction structure), schema releases, and durable-decision evidence (engine commit evidence or the log of record read back, and the fault witness). ACK receipts bind only generated identities: assertion ids, txIds and recorded instants.",
        "**Clocks.** Recorded instants are not assumed monotonic in position order; separate runtimes supply their own clocks (PLAN C1). Histories with equal and with decreasing recorded instants are first-class cases (EV-SAME-R, EV-DECREASING-R, CS-TEMPORAL decreasing-clock).",
        "**R independent of P.** A cut is (scope, P, optional R, V). Recorded visibility is `recordedPosition <= P` and, when R is bound, `recordedAt <= R`, evaluated independently: an assertion with a later position but an earlier instant is invisible at P below its position, and an assertion at a lower position with an instant above R is invisible at R.",
        "**Position accounting.** Positions are totally ordered coordinates (POSITION: (stream, epoch, offset, ordinal), lexicographic, not necessarily dense; RULINGS Q31c): the oracle sorts committed transacts by coordinate and assigns its own dense ordinals for cuts; nested transacts inside one engine transaction share one offset and take consecutive ordinals in callback order; aborted offsets are accounted from the feed's resolution stream; the oracle checks every receipt coordinate against the committed order and fails the run on a mismatch.",
        "**Outcomes.** The oracle derives each command's expected outcome from intent, order, preconditions, enforcement (CN-NEW-OR-WORSENED) and durable-decision evidence (COMMIT_OUTCOMES), then compares the receipts' outcomes afterwards. A receipt never decides which command is valid or committed.",
        "**Outputs.** Complete assertion metadata; raw-lifetime and as-of snapshot history; entity models (card-one value or E-CONFLICTING-VALUES per C5; card-many per CARD_MANY_ORDER; absent optional as a missing property; includes at the same basis; timelines); transaction records with ordered changes and the logical journal facts (C6); cursor page sequences; support counts; C1 eligibility routes (for O-PLAN); arithmetic, comparison and aggregate results per section 4; analytic scale counts per population stratum (SCALE_POPULATION, section S).",
        "**Independence.** Python stdlib only; imports no repository code; its own exact integers and decimals, IEEE binary64 (via struct) and codepoint ordering; no casefolding.",
        "**Self-checks before ACCEPTED.** Reproduce O-HAM finite-nine, O-CFG8 tiny-v4 and the O-EVT cut semantics where domains overlap; unit tests for every table row of section 4.",
    ]:
        A(f"- {s}")
    A("\n### 6.2 O-SHAPE\n")
    A("Each case file entry carries: " + "; ".join(SHAPE_SPEC["perCase"]) + ".\n")
    for s in SHAPE_SPEC["rules"]:
        A(f"- {s}")
    A("\n### 6.3 O-OBS protocols\n")
    A(md_table(["Protocol", "Evidence fields", "Verdict"], [[k, ", ".join(v["fields"]), v["verdict"]] for k, v in OBS_PROTOCOLS.items()]))
    A("\n### 6.4 O-PLAN protocols\n")
    A(md_table(["Protocol", "Evidence fields", "Verdict"], [[k, ", ".join(v["fields"]), v["verdict"]] for k, v in PLAN_PROTOCOLS.items()]))
    A("\n### 6.5 O-SPEC rules\n")
    for s in SPEC_RULES:
        A(f"- {s}")
    A("\n## 7. Case set specifications\n")
    A(md_table(["Case set", "Status", "Source", "Required tags", "Required named cases"], [[k, v["status"], v["source"], ", ".join(v["requiredTags"]), ", ".join(v["requiredCases"]) or "-"] for k, v in CS.items()]))
    A("\n### 7.1 Value types (CS-TYPES8, CS-TYPES8-NEG, CS-WIDEN)\n")
    A(md_table(["Family", "Edge values"], [
        ["string", "\"\", ASCII mixed case A E c z, NFC U+00E9 and NFD e U+0301 as distinct values, U+E000, U+10000, U+1F600, quote, backslash, CR, LF, a 64 KiB text"],
        ["integer", "0, 1, -1, 2^53-1, -(2^53-1) on every lane; 2^53+1, 2^59-1, -2^59 where the lane accepts them; values beyond the lane's range belong to CS-RANGE-OUT"],
        ["decimal", "0.00, 16.50, 16.49, a 38-digit value, a negative value, the TDK1 key and canonical text round trip (CS-DECIMAL covers scale overflow)"],
        ["number (binary64, approximate values only)", "+0.0, -0.0, 0.1, 0.30000000000000004, 1.0000000000000002, 2^53 as a double, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308, -1.5, 3.0 (stays a number)"],
        ["boolean", "true, false"],
        ["datetime", "0, a negative instant, 1700000000000.5 (fractional millisecond), the earliest and latest instant Triplex accepts"],
        ["ref", "same type, another type, an entity created in the same command"],
        ["json", "{\"b\":1,\"a\":2} (key order kept), nested arrays and objects, non-ASCII text, 1e300"],
        ["blob", "descriptor with and without filename, size 0, a size above 2^32"],
    ]))
    A("\nCS-TYPES8-NEG (each rejected atomically): lone surrogate, NaN, +Infinity, -Infinity, non-canonical integer text (\"01\", \"+1\", \"1.0\", \"-0\"), integer outside the core integer type, invalid datetime, unparseable json, blob descriptor with a negative size.\n")
    A("CS-WIDEN: integer 9007199254740993 first (lanes that accept it), then in the same attribute or physical column a whole-number float, a text value through an untyped attribute, and for QLever an invalid typed literal through the raw wire; re-read the first value everywhere.\n")
    A("### 7.2 Numbers (CS-NUMERIC) and errors (CS-ERRORS)\n")
    A("Every example in sections 4.1 to 4.4 is a CS-NUMERIC case with that expected answer. CS-ERRORS has one case per ERROR_TABLE entry reachable from a read surface.\n")
    A("### 7.3 Fault points (CS-FAULT)\n")
    A(COMMIT_OUTCOMES["witnessRule"] + "\n")
    A(COMMIT_OUTCOMES["variantRule"] + ".\n")
    for eng in ("log-source", "engine-source"):
        A(f"**{eng} transitions.**\n")
        A(md_table(["Transition", "Witness evidence"], [[t["id"], t["evidence"]] for t in COMMIT_OUTCOMES[eng]["transitions"]]))
        A(f"\n**{eng} expected outcomes.**\n")
        A(md_table(["Fault after", "Final state", "Original caller", "Retry with the same commandId", "Reads"], [[o["faultAfter"], o["finalState"], o["originalCaller"], o["retrySameCommandId"], o.get("reads", "-")] for o in COMMIT_OUTCOMES[eng]["outcomes"]]))
        A(f"\n{COMMIT_OUTCOMES[eng]['successRule']}\n")
    A("Access paths verified after each fault: XTDB `_id` lookup and column-predicate scan; QLever subject, predicate-object and object scans; plus the repository, the native surface in every language of the engine and the raw recipe.\n")
    A("### 7.4 Entity suite (CS-ENTITY)\n")
    for s in [
        "Schema: at least three EntityTypes using all eight families, cardinality one and many, required, optional, unique, a ref with target type and a reverse ref; two releases (v2 adds an optional attribute and a constraint).",
        "Command stream: create; correction; card-many add and remove; future validTo crossing later; retraction; with enforcement off, equal duplicates (one value, two supports) and distinct-value conflicts and overlapping intervals; presence toggles (convention until the Q9 policy); two commits sharing one recorded instant; a second runtime with a lagging clock; one nested transaction with two positions; the v2 release.",
        "Cut catalog: every phase position, recorded instants between and at commits (including the decreasing one), valid instants at, before and after every boundary; frozen from the oracle's derived positions, checked against receipts.",
        "Operations at each cut: get; getMany with missing ids; find with equality, range, membership and ref predicates per family, include, order, limit and cursor continuation; timeline; at(basis) for current, past R, past V and both. Conflicts expect E-CONFLICTING-VALUES per C5.",
        "Modes: current, reopen, engine restart. Size: a hand-built core of at most 200 entities plus a seeded generated variant.",
    ]:
        A(f"- {s}")
    A("\n### 7.5 Raw recipes (CS-RAW-RECIPES, CS-RAW-MAPPED)\n")
    A("The raw-query guide documents physical names, scope selection, how to express current, as-of position, recorded-time and valid-instant reads, the conflict indicator and values(attribute), every exact channel, every mapped recipe (RG-* entries of `capability-matrix.md`) and every known limit. Query classes: " + ", ".join(RAW_PARITY_CLASSES) + ".\n")
    A("### 7.6 Cursor and basis continuation (CS-CURSOR)\n")
    A(CURSOR_TRANSITIONS["rule"] + " " + CURSOR_TRANSITIONS["retention"] + "\n")
    A(md_table(["Must continue", "Transition"], [[t["id"], t["transition"]] for t in CURSOR_TRANSITIONS["mustContinue"]]))
    A("")
    A(md_table(["Permitted error case", "Error", "Reason", "Only when"], [[x["id"], x["error"], x["reason"], x["when"]] for x in CURSOR_TRANSITIONS["permittedErrors"]]))
    A("\n## 8. North-star workload, golden scenarios, year-one population and budgets\n")
    A("### 8.1 Fixed writer trace (TARGETS section 2)\n")
    W = WRITER_TRACE
    A(md_table(["Item", "Value"], [
        ["Command shape", "; ".join(f"{c['range'][0]} to {c['range'][1]} facts: {c['share']}" for c in W["commandShape"]["factsPerCommand"]) + "; one subject per command; blob reference for documents"],
        ["Writers", "; ".join(f"{w['kind']} {w['share']} ({w['what']})" for w in W["writers"])],
        ["Rate", f"steady {W['rate']['steadyFactsPerSecond']} facts/s; bursts {W['rate']['burst']['factsPerSecond']} facts/s for {W['rate']['burst']['durationS']} s every {W['rate']['burst']['everyS']} s"],
        ["Duplicates", f"{W['duplicates']['systemSignalsResentShare']} of system signals re-sent with the same commandId"],
        ["Lost ACKs", f"{W['lostAck']['commandsShare']} of commands, retried"],
        ["Corrections", f"{W['corrections']['commandsShare']} of commands, valid time {W['corrections']['validTimeBackDays']} days back"],
        ["Reads per write", f"{W['readsPerWrite']['range'][0]} to {W['readsPerWrite']['range'][1]}: {W['readsPerWrite']['what']}"],
        ["Conflicts", W["conflicts"]], ["Bulk lane", W["bulkLane"]], ["Seed", W["seeded"]]]))
    A("\nThe P1 reader ladder, the P2 to P4 probes, the P5 sweep and the secondary measurements are in `load-contract.json`.\n")
    A("### 8.2 Golden scenario rules (TARGETS section 6)\n")
    for r in GS_RULES:
        A(f"- {r}")
    A("\n### 8.3 Year-one measurement population\n")
    P = SCALE_POPULATION
    A(f"Role: {P['role']}. Source: {P['source']}. Rungs: {', '.join(map(str, P['rungs']))}; {P['scaling']}. At year one: {json.dumps(P['atYearOne'])}. Facts per entity: {P['factsPerEntity']}. Written through {P['writtenThrough']}.\n")
    A(md_table(["Stratum", "Rule"], [[t["id"], t["rule"]] for t in P["tenants"]] + [[h["id"], f"{h['share']}: {h['rule']}"] for h in P["historyStrata"]] + [[x["id"], x["rule"]] for x in P["otherEvents"]] + [[x["id"], x["rule"]] for x in P["topology"]] + [[x["id"], x["rule"]] for x in P["resultCardinality"]]))
    A(f"\nCounted separately: {', '.join(P['separateCounts'])}.\n\nCorrectness: {P['correctness']}\n")
    A("### 8.4 Trace generator and offer schedule (TARGETS 2.1)\n")
    A(md_table(["Item", "Value"], [[k, json.dumps(v) if not isinstance(v, str) else v] for k, v in WRITER_TRACE["generator"].items()]))
    A("\nMeasurement semantics for P1 to P5 (TARGETS 1.1: hot set, split reads, maintenance per window, driver-recorded basis, open-loop size bands, feed milestones and crash points, frozen pull buckets, the real release sweep) are in `load-contract.json` `measurements`.\n")
    A("### 8.5 World definition W0 and added failure schedules (TARGETS 6.1)\n")
    A(md_table(["Item", "Value"], [[k, "; ".join(v) if isinstance(v, list) else v] for k, v in WORLD_W0.items()]))
    A("")
    A(md_table(["Scenario", "Case", "Added schedule", "Expected outcome"], [[f"GS.{k:02d}", c, w, x] for k, v in GS_FAILURE_SCHEDULES.items() for c, w, x in v]))
    A("\n### 8.6 Budgets\n")
    A(f"{BUDGETS['frozenBeforeCandidates']} {BUDGETS['a0Control']} {BUDGETS['cumulative']} {BUDGETS['absolute']}\n")
    A(md_table(["Budget", "Allowance vs A0", "Direction", "Source"], [[b_["id"], b_["allowanceVsA0"], b_["direction"], b_["source"]] for b_ in BUDGETS["relativeToA0"]]))
    A("\nComponents counted: " + ", ".join(BUDGET_COMPONENTS) + ".\n")
    A("### 8.7 Composition identity (TARGETS 4.1, RULINGS Q28)\n")
    A(md_table(["Item", "Rule"], [[k, ", ".join(v) if isinstance(v, list) else "; ".join(f"{a}: {b}" for a, b in v.items()) if isinstance(v, dict) else v] for k, v in COMPOSITION.items()]))
    A("\n### 8.8 Erasure (TARGETS section 7, RULINGS Q24)\n")
    A(md_table(["Item", "Rule"], [[k, ", ".join(v) if isinstance(v, list) else v] for k, v in ERASURE.items()]))
    A("\nProtected-copy inventory, per lane: " + ", ".join(PROTECTED_COPY_INVENTORY) + ".\n")
    A("### 8.9 Evaluator counterexamples (RULINGS Q26)\n")
    A(MODE_RULE + " " + SECONDARY_RULE + "\n")
    A(md_table(["Id", "Defeats", "Receipt set", "Why it stays OPEN"], [[x["id"], ", ".join(x["defeats"]), x["receipts"], x["why"]] for x in EVALUATOR_COUNTEREXAMPLES]))
    A("\nPositive fixtures (RULINGS Q31k): complete receipt sets the evaluator must judge CLOSED, one per closure rule in use.\n")
    A(md_table(["Id", "Closes", "Receipt set", "Expected"], [[x["id"], x["closes"], x["receipts"], x["expectedVerdict"]] for x in EVALUATOR_POSITIVE_FIXTURES]))
    A("\n### 8.10 Position coordinates and gates (TARGETS 4.1, RULINGS Q31c, Q31i)\n")
    A(md_table(["Item", "Rule"], [[k, (", ".join(v) if isinstance(v, list) else json.dumps(v) if isinstance(v, dict) else v)] for k, v in POSITION.items()]))
    A("")
    A(md_table(["Gate", "Rule", "Requires", "Applies to"], [[k, v["rule"], ", ".join(v["requires"]), v["appliesTo"]] for k, v in GATES.items()]))
    A("\nNo density exemption (RULINGS Q38a): every composition, A0 included, needs " + ", ".join(POSITION_REQUIRED_CASES) + ". Evidence that a source-hash allowlist was unsafe: " + OUTSIDE_BLOCK_MUTATION_FIXTURE["mutation"] + "; all five 0.3.4 block hashes stayed unchanged and the old check returned " + OUTSIDE_BLOCK_MUTATION_FIXTURE["oldMechanismVerdict"] + "; now " + OUTSIDE_BLOCK_MUTATION_FIXTURE["requiredVerdict"] + ".\n")
    A("\n" + CLAIM_ADMISSION["rule"] + ".\n")
    A("\n" + md_table(["Evidence record (RULINGS Q47a)", "Fields", "Rule"], [[k, ", ".join(v["fields"]), v["rule"]] for k, v in EVIDENCE_SCHEMAS.items()]))
    A("\nWorkload identity (RULINGS Q47b): " + WORKLOAD_IDENTITY["rule"] + ".\n")
    A("\n**Qualification run (RULINGS Q55a).** " + QUALIFICATION_RUN["rule"] + ".\n")
    A(md_table(["Step", "Rule"], QUALIFICATION_RUN["steps"]))
    A("\n**Evaluator inputs (RULINGS Q61).** Contract source: " + QUALIFICATION_RUN["contractSource"] + ". Oracle runners: " + "; ".join(f"{k} argv {' '.join(v['argv'])}" for k, v in ORACLE_RUNNERS.items()) + ". Answer extraction: " + ORACLE_ANSWER_RULE + ".\n")
    A(md_table(["Case-manifest field (" + CASE_MANIFEST["format"] + ")", "Meaning"], [[k + ("" if k in CASE_MANIFEST["required"] else " (optional)"), v] for k, v in CASE_MANIFEST["fields"].items()]))
    A("\nBuild spec (" + BUILD_SPEC["format"] + "): " + ("null, fails closed: " + BUILD_SPEC["rule"] if BUILD_SPEC["argv"] is None else " ".join(BUILD_SPEC["argv"])) + ". Build inputs: " + BUILD_SPEC["inputs"] + ". Image pins: " + "; ".join(f"{k} {v['imageId']}" for k, v in IMAGE_PINS.items()) + ". Frozen trace: " + WRITER_TRACE["generator"]["frozen"]["rule"] + ".\n")
    A("\n**Measurement protocol PAIR-0 (RULINGS Q60, provisional).** " + PAIR_0["design"]["rule"] + "; margins: " + PAIR_0["margins"]["superiority"] + "; " + PAIR_0["margins"]["hold"] + ". " + " ".join(PAIR_0[k] if isinstance(PAIR_0[k], str) else PAIR_0[k]["rule"] for k in ("slotRegime", "accounting", "windows", "screeningSeries", "lease", "a0")) + "\n")
    A("\n**Verifier registry (RULINGS Q55a).** " + VERIFIER_REGISTRY["rule"] + ".\n")
    A(md_table(["Entry", "Subject", "Brief (sha256)", "Branch", "Commit", "Verdict", "Status"], [[k, f"{v['subject']['kind']} {v['subject']['id']} {v['subject']['version']} at {v['subject']['commit'][:7]}", f"{v['brief']} ({v['briefSha256']})", v["branch"], v["commit"], v["verdict"], v["status"]] for k, v in VERIFIER_REGISTRY["entries"].items()]))
    A("\nA0 registry (RULINGS Q46b, Q47b): " + A0_REGISTRY["rule"] + ". Entries: " + "; ".join(f"{k} " + ("null, fails closed" if v is None else v["commit"]) for k, v in A0_REGISTRY["entries"].items()) + ".\n")
    A("\nPending rulings (RULINGS Q47d): " + PENDING_RULE + ". Pending at generation: " + (", ".join(pending_ruling_ids()) or "none") + ".\n")
    _pending = [f for f, h in W0_PIN["files"].items() if h is None] + [k for k in ("reviewReceipt", "deltaCheck", "oDomainFingerprint") if W0_PIN.get(k) is None]
    A(f"\nW0_PIN (required input, reviewed by {W0_PIN['reviewedBy']}): {W0_PIN['version']} at {W0_PIN['commit'][:7]}, {len(W0_PIN['files'])} file hashes from {W0_PIN['hashTable']}; " + ("BLOCKED, fails closed until set: " + ", ".join(_pending) if _pending else "pinned") + ". Fingerprint candidate (V-D01): basis.tx " + f"{W0_FINGERPRINT_CANDIDATE['basisTx']:,}; {W0_FINGERPRINT_CANDIDATE['facts']:,} facts; worlds sha256:{W0_FINGERPRINT_CANDIDATE['worldsSha256']}; " + "; ".join(f"{k} sha256:{v}" for k, v in W0_FINGERPRINT_CANDIDATE["releasesSha256"].items()) + ".\n")
    A("\n## 9. PLAN C1-C8 traceability\n")
    A("Each named case must exist in its case set's manifest and stays required even when broader end-state checks pass.\n")
    A(md_table(["Contract", "Case", "Case set", "Observation", "Closing obligation"], [[t["contract"], t["case"], t["set"], t["observation"], t["obligation"]] for t in TRACE]))
    A("\n## 10. Obligations by section\n")
    for g, title in SECTIONS:
        A(f"### {title}\n")
        home = [o for o in OBL if o["goals"][0] == g]
        cross = [o for o in OBL if g in o["goals"][1:]]
        for o in home:
            lanes = "all three" if o["lanes"] == ALL else ", ".join(o["lanes"])
            A(f"**`{o['id']}`: {o['title']}.**")
            A(f"- Statement: {o['statement']}")
            A(f"- Lanes: {lanes}; receipt scope {o['receiptScope']}. Verifier mode: {o['verifierMode']}.")
            A("- Cases: " + "; ".join(f"{c['set']} ({', '.join(c['select'])}, {CS[c['set']]['status']})" for c in o["cases"]) + ".")
            A("- Oracles: " + (", ".join(f"{x} ({ORACLES[x]['status']})" for x in o["oracles"]) or "none (provenance check)") + f". Entrypoints: {', '.join(o['entrypoints'])}. Profiles: {', '.join(o['profiles'])}.")
            cl = " + ".join(o["closure"]["rules"])
            if o["closure"]["modes"]:
                cl += f"; modes {', '.join(o['closure']['modes'])}"
            if o["thresholds"]:
                cl += f"; thresholds {', '.join(o['thresholds'])}"
            if o["closure"]["params"]:
                cl += f"; params {json.dumps(o['closure']['params'])}"
            A(f"- Closure: {cl}.")
            if o["mutationControls"]:
                A(f"- Mutation controls: {', '.join(o['mutationControls'])}.")
            if o["contracts"]:
                A(f"- Traces PLAN contracts: {', '.join(o['contracts'])}.")
            A(f"- Sources: {'; '.join(o['sources'])}.")
            if o["grounding"] != "grounded":
                A(f"- Grounding: **{o['grounding']}**.")
            if o["notes"]:
                A(f"- Notes: {o['notes']}")
            A("- Status: OPEN.\n")
        if cross:
            A("Also counted here: " + ", ".join(f"`{o['id']}`" for o in cross) + ".\n")
    A("## 11. Counts\n")
    A(counts + "\n")
    A("## 12. Inherited evidence (reference only, closes nothing)\n")
    A(md_table(["Inherited result", "Where", "Relevant obligations"], [
        ["XTDB unchanged44 v5, translated142 v3, native142 v7", "qualification/reviews/xtdb-final-combined-independent.json", "G1.found.unchanged44, PKT.full142 (SQL)"],
        ["QLever native142 v5 at planner100, entry11", "qualification/reviews/qlever-combined-final-functional-independent.json", "PKT.full142, G10.native.entry-checks"],
        ["configured-eight tiny v4: 47 pass, 5 fail", "qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json", "G9.history.snapshot-metadata"],
        ["QLever public string v6: native 2/11, translated 2/9", "qualification/reviews/qlever-public-string-v6-terminal-independent.json", "G2.strings.codepoint-supported, D-Q-STR"],
        ["XTDB native 16 RPS control: 480 correct, 6/6 commands visible", "qualification/reviews/xtdb-writer-rate16-control-v1-independent.json", "reference for L-READ-DEADLINE-MS only"],
    ]))
    return "\n".join(L) + "\n"


def counts_table():
    rows = []
    for g, _ in SECTIONS:
        os_ = [o for o in OBL if g in o["goals"]]
        rows.append([g] + [sum(1 for o in os_ if l in o["lanes"]) for l in LANES] + [sum(1 for o in os_ if o["receiptScope"] == "engine"), sum(1 for o in os_ if o["grounding"] == "policy-pending"), sum(1 for o in os_ if o["grounding"] == "derived")])
    rows.append(["distinct"] + [sum(1 for o in OBL if l in o["lanes"]) for l in LANES] + [sum(1 for o in OBL if o["receiptScope"] == "engine"), sum(1 for o in OBL if o["grounding"] == "policy-pending"), sum(1 for o in OBL if o["grounding"] == "derived")])
    return md_table(["Section", "xtdb-xtql", "xtdb-sql", "qlever-sparql", "engine-scoped", "policy-pending", "derived"], rows)


def main():
    errs = validate()
    for o in OBL:
        o["verifierMode"] = verifier_mode(o)
        o["definitionSha256"] = obligation_hash(o)
        o["status"] = {l: "OPEN" for l in o["lanes"]}
        o["needsNewOracle"] = [x for x in o["oracles"] if ORACLES[x]["status"] not in ("EXISTS", "COMPILED")]
    cells = matrix_cells()
    matrix_text = render_matrix(cells)
    load_text = json.dumps(build_load_contract(), indent=2, ensure_ascii=False) + "\n"
    budgets_text = json.dumps(BUDGETS, indent=2, ensure_ascii=False) + "\n"
    pinned = {k: v["pinnedSourceFiles"] for k, v in CS.items() if v["pinnedSourceFiles"]}
    oracle_files = {k: [{"path": f, "sha256": sha_file(f)} for f in v["files"] if v["status"] == "EXISTS" and not f.endswith("/")] for k, v in ORACLES.items()}
    doc = {
        "format": "triplex-db-2/acceptance-obligations/3", "version": VERSION, "status": STATUS, "date": DATE,
        "authority": "This file is the only authority an evaluator reads. Goals and targets come from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md; RULINGS.md is compiled into this file by build_contract.py; the other artifacts are generated from the same source.",
        "generatedBy": "lab/acceptance/build_contract.py",
        "inputs": {f: sha_file(f) for f in SCOPE_SOURCES + ["lab/acceptance/build_contract.py"]},
        "artifacts": {"load-contract.json": sha_text(load_text), "budgets.json": sha_text(budgets_text), "capability-matrix.md": sha_text(matrix_text)},
        "lanes": LANES, "engineOfLane": ENGINE_OF, "languageOfLane": LANG_OF,
        "sections": [{"id": g, "title": t} for g, t in SECTIONS],
        "rulings": RULINGS, "languageRules": LANGUAGE_RULES, "frontierRules": FRONTIER_RULES,
        "valueKinds": VALUE_KINDS, "decimalRules": DECIMAL_RULES, "decimalOps": DECIMAL_OPS, "decimalConversions": DECIMAL_CONVERSIONS, "decimalScaleEvolution": DECIMAL_SCALE_EVOLUTION, "decimalTests": DECIMAL_TEST_TEXT, "screeningProfiles": SCREENING_PROFILES,
        "temporalRules": TEMPORAL_RULES, "readShapeRules": READ_SHAPE_RULES, "journalRules": JOURNAL_RULES, "ambRulings": AMB_RULINGS, "goldenResolutions": GOLDEN_RESOLUTIONS, "goldenRule": GOLDEN_RULE, "goldenFilesPinned": {f"{GOLDEN_DIR}/{k}": sha_file(f"{GOLDEN_DIR}/{k}") for k in golden_vectors()},
        "erasure": ERASURE, "protectedCopyInventory": PROTECTED_COPY_INVENTORY, "composition": COMPOSITION, "worldW0": WORLD_W0, "goldenFailureSchedules": {f"GS.{k:02d}": [{"case": c, "schedule": w, "expected": x} for c, w, x in v] for k, v in GS_FAILURE_SCHEDULES.items()},
        "evaluatorCounterexamples": EVALUATOR_COUNTEREXAMPLES, "evaluatorPositiveFixtures": EVALUATOR_POSITIVE_FIXTURES, "position": POSITION, "positionDenseCases": POSITION_DENSE_CASES, "a0Controls": A0_CONTROLS, "a0Registry": A0_REGISTRY, "qualificationRun": QUALIFICATION_RUN, "oracleRunners": ORACLE_RUNNERS, "compositionFields": list(COMPOSITION_FIELDS), "oracleAnswerRule": ORACLE_ANSWER_RULE, "answerMembers": ANSWER_MEMBERS, "caseManifest": CASE_MANIFEST, "buildSpec": BUILD_SPEC, "imagePins": IMAGE_PINS, "verifierRegistry": VERIFIER_REGISTRY, "sourceVariantFields": SOURCE_VARIANT_FIELDS, "logFields": LOG_FIELDS, "workloadIdentity": WORKLOAD_IDENTITY, "evidenceSchemas": EVIDENCE_SCHEMAS, "outsideBlockMutationFixture": OUTSIDE_BLOCK_MUTATION_FIXTURE, "positionRequiredCases": POSITION_REQUIRED_CASES, "claimAdmission": CLAIM_ADMISSION,
        "pendingRulings": pending_rulings(), "closability": closability(), "oraclePins": ORACLE_PINS, "oracleRefusals": ORACLE_REFUSALS, "oracleRefusalRule": ORACLE_REFUSAL_RULE, "oracleScope": {k: oracle_scope(k) for k in ORACLE_PINS}, "pinScopeExpectedDiff": PIN_SCOPE_EXPECTED_DIFF, "q43Rules": Q43_RULES, "receiverCases": RECEIVER_CASES, "atomicUnitCases": ATOMIC_UNIT_CASES, "oTdk1Files": O_TDK1_FILES, "outbox": OUTBOX, "decimalRouting": DECIMAL_ROUTING, "decimalRoutingQ52": DECIMAL_ROUTING_Q52, "rulingsCoverage": rulings_coverage(), "tdk1": TDK1, "tdk1Tests": TDK1_TESTS, "tdk1VectorPin": TDK1_VECTOR_PIN, "q33Rules": Q33_RULES, "q33iCursorReadings": Q33I_CURSOR_READINGS, "q33iQleverRejected": Q33I_QLEVER_REJECTED, "gates": GATES, "wireRules": WIRE_RULES, "w0Pin": W0_PIN, "legacyLaneOutcomes": LEGACY_LANE_OUTCOMES, "legacyRule": LEGACY_RULE, "legacyScan": legacy_out_of_range_scan(), "modeRule": MODE_RULE, "secondaryRule": SECONDARY_RULE, "integerMinRange": INTEGER_MIN_RANGE, "laneIntegerRange": LANE_INTEGER_RANGE, "rangeRule": RANGE_RULE,
        "numericOps": NUMERIC_OPS, "conversionRules": CONVERSION_RULES, "comparisonRules": COMPARISON_RULES, "aggregateRules": AGGREGATE_RULES,
        "cardManyOrder": CARD_MANY_ORDER, "constraintRules": CONSTRAINT_RULES, "errorTable": ERROR_TABLE, "retiredErrors": RETIRED_ERRORS, "errorRepresentation": ERROR_REPRESENTATION, "errorComparison": ERROR_COMPARISON,
        "commitOutcomes": COMMIT_OUTCOMES, "cursorTransitions": CURSOR_TRANSITIONS,
        "thresholds": THRESHOLDS, "calibrationRule": CALIBRATION_RULE, "thresholdRuleForKind": THRESHOLD_RULE_FOR_KIND,
        "writerTrace": WRITER_TRACE, "goldenScenarioRules": GS_RULES, "requirements": [{"id": f"REQ.{r[0]}", "goals": r[1], "title": r[3], "xtdbStart": r[4], "qleverStart": r[5]} for r in REQUIREMENTS],
        "oracles": ORACLES, "oracleFilesPinned": oracle_files, "comparators": COMPARATORS,
        "entrypoints": ENTRYPOINTS, "profiles": PROFILES, "scalePopulation": SCALE_POPULATION,
        "capabilityMatrix": cells, "knownLimits": {k: {"engine": a_, "behavior": b_, "evidence": c_} for k, (a_, b_, c_) in KNOWN_LIMITS.items()},
        "rawParityClasses": RAW_PARITY_CLASSES, "rawExceptions": RAW_EXCEPTIONS, "diagnostics": DIAGNOSTICS, "diagnosticRule": DIAGNOSTIC_RULE, "fragmentCoverage": FRAGMENT_COVERAGE,
        "mutationControls": MUTANTS, "mutantRule": MUTANT_RULE, "caseSets": CS, "caseSourcesPinned": pinned,
        "traceability": TRACE,
        "receiptSchema": RECEIPT_SCHEMA, "evidenceKinds": EVIDENCE_KINDS, "selectorSemantics": SELECTOR_SEMANTICS,
        "validity": VALIDITY, "closureRules": CLOSURE_RULES, "verifierModes": VERIFIER_MODES, "applicability": APPLICABILITY, "statusAlgorithm": STATUS_ALGORITHM,
        "obsProtocols": OBS_PROTOCOLS, "planProtocols": PLAN_PROTOCOLS, "shapeSpec": SHAPE_SPEC, "specRules": SPEC_RULES,
        "budgetComponents": BUDGET_COMPONENTS,
        "budgetsRef": {"path": "lab/acceptance/budgets.json", "sha256": sha_text(budgets_text)},
        "loadContractRef": {"path": "lab/acceptance/load-contract.json", "sha256": sha_text(load_text)},
        "obligations": OBL,
    }
    doc["transitiveContractSha256"] = sha_text(json.dumps(doc, sort_keys=True, ensure_ascii=False))
    counts = counts_table()
    acc_text = render_acceptance(doc, cells, counts)
    obl_text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    for name, text in [("obligations.json", obl_text), ("load-contract.json", load_text), ("budgets.json", budgets_text), ("capability-matrix.md", matrix_text), ("ACCEPTANCE.md", acc_text)]:
        for pat, why in BANNED_TEXT:
            m = re.search(pat, text, flags=re.I if pat == "open question" else 0)
            if m:
                errs.append(f"{name}: banned text '{m.group(0)}' ({why}) near: {text[max(0, m.start() - 60):m.end() + 40]!r}")
    if errs:
        print("CONTRACT INVALID:")
        print("\n".join(sorted(set(errs))))
        sys.exit(1)
    outputs = [("obligations.json", obl_text), ("load-contract.json", load_text), ("budgets.json", budgets_text), ("capability-matrix.md", matrix_text), ("ACCEPTANCE.md", acc_text)]
    if "--verify" in sys.argv:
        diff = [n for n, t in outputs if not (HERE / n).exists() or (HERE / n).read_text() != t]
        print("verify transitive hash:", doc["transitiveContractSha256"])
        for n, t in outputs:
            print(f"verify {n}: {sha_text(t)}")
        if diff:
            print("REGENERATION NOT BYTE-IDENTICAL:", ", ".join(diff))
            sys.exit(1)
        print("second regeneration byte-identical (RULINGS Q34e)")
        return
    for name, text in outputs:
        (HERE / name).write_text(text)
    print(counts)
    print(f"obligations: {len(OBL)}; raw exceptions: {len(RAW_EXCEPTIONS)}; traced cases: {len(TRACE)}; mutants: {len(MUTANTS)}; thresholds: {len(THRESHOLDS)} ({sum(1 for v in THRESHOLDS.values() if v['source'].startswith('derived'))} derived)")
    print("rulings compiled: " + ", ".join(r["id"] for r in RULINGS if r.get("status") != "SUPERSEDED") + "; superseded: " + ", ".join(r["id"] for r in RULINGS if r.get("status") == "SUPERSEDED"))
    print("transitive hash:", doc["transitiveContractSha256"])
    for n, t in outputs:
        print(f"{n}: {sha_text(t)}")
    import subprocess
    r = subprocess.run([sys.executable, "-I", str(pathlib.Path(__file__).resolve()), "--verify"], capture_output=True, text=True, cwd=str(REPO))
    print(r.stdout.strip())
    if r.returncode != 0:
        print("CONTRACT INVALID: second regeneration differs (RULINGS Q34e)")
        sys.exit(1)


if __name__ == "__main__":
    main()
