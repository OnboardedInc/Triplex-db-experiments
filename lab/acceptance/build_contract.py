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
VERSION = "0.3.2"
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


SCOPE_SOURCES = ["lab/SCOPE.md", "lab/NORTH-STAR.md", "lab/TARGETS.md", "lab/research/SAM-pasted-numbers-2026-11-07.md", "lab/acceptance/RULINGS.md"]

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
     "ruling": "A decimal attribute declares precision and scale. Stored as a scaled integer when precision <= 15 (the scaled value stays within 2^53), otherwise as an order-preserving decimal string. A value with more fractional digits than the scale, or outside the precision, is rejected with a typed error, never rounded. Decimal is its own family, ordered between number and datetime; comparison between decimal and integer or number is a typed preflight error unless the query converts explicitly; arithmetic runs in the TypeScript kernel with exact decimal arithmetic.",
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
     "ruling": "TARGETS 4.1: four assignments (source, current, history, analytics); receipts bind every component, replication edge and each index's watermark at read time; a read is served only by an index whose watermark reached its basis, else it waits up to 250 ms and routes to a fallback that has it; the source ACKs only after the current index reached the commit. Scope keys derive from the assignment, not engineOfLane.",
     "compiledInto": ["COMPOSITION", "RECEIPT_SCHEMA", "VA14", "STATUS_ALGORITHM", "obligation layer", "G8.composition.watermark-routing", "G7.composition.ack-ownership", "G10.composition.identity-bound", "T-WATERMARK-WAIT-MS"]},
]

# ============================================================================ language accounting
LANGUAGE_RULES = {
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
    "storage": [{"when": "p <= 15", "as": "scaled integer value * 10^s (|scaled| < 10^15 < 2^53)"}, {"when": "p > 15", "as": "order-preserving decimal string (fixed-width, sign-aware encoding whose bytewise order equals numeric order)"}],
    "reject": "a value with more than s fractional digits, or with more than p - s integer digits, fails the write with E-DECIMAL-UNREPRESENTABLE and leaves no residue; never rounded or truncated",
    "family": "decimal is its own family, ordered between number and datetime (CARD_MANY_ORDER); 1.50 and 1.5 are one value",
    "comparison": "CMP-DECIMAL-CROSS: comparison with integer or number is preflight E-MIXED-FAMILY unless the query converts explicitly",
    "arithmetic": "TypeScript kernel, exact decimal arithmetic; engine-side decimal arithmetic only where a projection needs it (RULINGS Q19)",
    "inputCapture": "the writer captures the caller's original typed input before any normalization; tests assert nothing was rounded before capture (DEC-INPUT-CAPTURE, M-DECIMAL-PRECAPTURE-ROUND)",
    "kernelMaxDigits": 38,
}
# RULINGS Q22: one row per operator, conversion and scale change; every row is a named CS-DECIMAL case.
DECIMAL_OPS = [
    {"id": "DO-ADD", "op": "a + b, a - b (decimal(p1, s1), decimal(p2, s2))", "resultScale": "max(s1, s2)", "resultPrecision": "max(p1 - s1, p2 - s2) + max(s1, s2) + 1", "error": "E-DECIMAL-OVERFLOW when the result exceeds the target's declared precision or 38 digits", "case": "DEC-OP-ADD"},
    {"id": "DO-MUL", "op": "a * b", "resultScale": "s1 + s2", "resultPrecision": "p1 + p2", "error": "E-DECIMAL-OVERFLOW when the result exceeds the target's declared precision or 38 digits", "case": "DEC-OP-MUL"},
    {"id": "DO-DIV", "op": "divide(a, b, scale, rounding) with rounding one of half-even, half-up, down", "resultScale": "the named scale", "resultPrecision": "the target's declared precision", "error": "E-DIVISION-BY-ZERO for b = 0; E-DECIMAL-OVERFLOW beyond the precision; the one place rounding happens, and only when the caller names it", "case": "DEC-OP-DIVIDE"},
    {"id": "DO-BARE-DIV", "op": "a / b on decimals", "resultScale": "-", "resultPrecision": "-", "error": "preflight E-DECIMAL-BARE-DIVIDE", "case": "DEC-OP-BARE-DIVIDE"},
    {"id": "DO-ROUND", "op": "round(x, s, rounding)", "resultScale": "s", "resultPrecision": "p - (s_x - s) when s < s_x, else p", "error": "E-DECIMAL-OVERFLOW only when a carry exceeds the precision", "case": "DEC-OP-ROUND"},
    {"id": "DO-CMP", "op": "= != < <= > >= between decimals", "resultScale": "-", "resultPrecision": "-", "error": "none; compares exact numeric value (1.50 = 1.5)", "case": "DEC-OP-COMPARE"},
    {"id": "DO-SUM", "op": "SUM over decimals (kernel; engine side only where a projection needs it)", "resultScale": "max scale of the inputs", "resultPrecision": "38", "error": "E-DECIMAL-OVERFLOW when the exact total exceeds 38 digits", "case": "DEC-OP-SUM"},
]
DECIMAL_CONVERSIONS = [
    {"id": "DC-I2D", "rule": "integer to decimal(p, s): exact when the integer fits p - s digits, else E-DECIMAL-UNREPRESENTABLE", "case": "DEC-CV-INT-TO-DEC"},
    {"id": "DC-D2I", "rule": "decimal to integer: only when the fraction is zero, else E-DECIMAL-FRACTION unless the caller writes round(x, 0, rounding) first", "case": "DEC-CV-DEC-TO-INT"},
    {"id": "DC-D2N", "rule": "decimal to number: only through toNumber(x) (named, lossy, one correctly rounded binary64)", "case": "DEC-CV-DEC-TO-NUM"},
    {"id": "DC-N2D", "rule": "number to decimal: only through toDecimal(x, p, s, rounding); NaN and infinities never occur (rejected at write)", "case": "DEC-CV-NUM-TO-DEC"},
    {"id": "DC-T2D", "rule": "text to decimal at the write boundary: the canonical decimal grammar only; more fractional digits than s or more than p - s integer digits is E-DECIMAL-UNREPRESENTABLE, never rounded", "case": "DEC-CV-TEXT-TO-DEC"},
    {"id": "DC-IMPLICIT", "rule": "no implicit conversion between decimal and integer or number in any expression; mixing them is preflight E-MIXED-FAMILY (CMP-DECIMAL-CROSS)", "case": "DEC-CROSS-FAMILY-PREFLIGHT"},
]
DECIMAL_SCALE_EVOLUTION = [
    {"id": "DS-WIDEN", "rule": "widening precision or scale is a metadata change; stored values and order keys stay valid and read back with the new declared scale", "case": "DEC-SCALE-WIDEN"},
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
    {"kind": "decimal", "rule": "value kind for money and business decimals (RULINGS Q18, DECIMAL_RULES): the attribute declares precision and scale; stored as a scaled integer when precision <= 15, otherwise as an order-preserving decimal string; exact storage and round trip; order-preserving encoding for range rules; a value with more fractional digits than the scale, or outside the precision, fails with E-DECIMAL-UNREPRESENTABLE, never rounded; its own family; arithmetic in the TypeScript kernel with exact decimal arithmetic"},
    {"kind": "boolean", "rule": "exact"},
    {"kind": "datetime", "rule": "exact epoch-millisecond instant including fractional milliseconds; values needing nanoseconds use ISO strings (NUMERIC table)"},
    {"kind": "ref", "rule": "exact target id"},
    {"kind": "json", "rule": "exact text with key order kept; canonical form for identity"},
    {"kind": "blob", "rule": "exact descriptor (mimeType, size, filename)"},
]
RANGE_RULE = "Every attribute used in a range rule (for example 'pay rate at or above 16.50', 'hours over 40') has an order-preserving comparison on every surface that serves the rule: native exact types inside their exact range, or a documented order-preserving channel."

# ============================================================================ errors
# Every expected error is pinned here. 'existing' tags exist in the source tree today; 'new' tags are named by
# PLAN v1.1 or by this contract and must be implemented with exactly this tag and reason.
ERROR_TABLE = [
    {"id": "E-INTEGER-OVERFLOW", "tag": "QueryError", "reason": "integer-overflow", "phase": "execution", "status": "existing reason string (compiler.ts:572), tag frozen here"},
    {"id": "E-VALUE-OUT-OF-RANGE", "tag": "InvalidTripleError", "reason": "value-out-of-range", "phase": "preflight", "status": "new reason (NUMERIC): the value is valid Triplex but outside the lane's declared exact range; rejected before any engine mutation"},
    {"id": "E-DECIMAL-UNREPRESENTABLE", "tag": "InvalidTripleError", "reason": "decimal-unrepresentable", "phase": "preflight", "status": "new reason (decimal value kind)"},
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
    {"id": "E-UNAVAILABLE-CUT", "tag": "ReadError", "reason": "unavailable-cut", "phase": "preflight", "status": "new reason; permitted only for a basis beyond the latest committed position"},
    {"id": "E-ADMISSION", "tag": "ReadError", "reason": "admission-refused", "phase": "preflight", "status": "new reason"},
    {"id": "E-RECURSION-LIMIT", "tag": "ReadError", "reason": "recursion-limit", "phase": "execution", "status": "new reason (C8 bounds)"},
    {"id": "E-OVERLOAD", "tag": "ReadError", "reason": "overloaded", "phase": "admission", "status": "new reason (load overload policy)"},
    {"id": "E-CONFLICTING-VALUES", "tag": "ConflictingValuesError", "reason": "conflicting-values", "phase": "execution", "status": "new tag (PLAN C5.3); lists every conflicted entity and attribute"},
    {"id": "E-MAINTAINING", "tag": "Maintaining", "reason": "maintaining", "phase": "execution", "status": "new tag (PLAN C4.5)"},
    {"id": "E-REPAIRING", "tag": "Repairing", "reason": "repairing", "phase": "execution", "status": "new tag (PLAN C2.6)"},
    {"id": "E-COMMIT-PENDING", "tag": "CommitPending", "reason": "committed-not-published", "phase": "outcome", "status": "new tag (PLAN C2.7)"},
    {"id": "E-SCOPE-OWNER", "tag": "ReadError", "reason": "scope-ownership-mismatch", "phase": "preflight", "status": "new reason (PLAN C7.1); also raised on writes as WriteError with the same reason"},
    {"id": "E-CURSOR", "tag": "PaginationCursorError", "reason": "malformed|other-scope|other-query", "phase": "preflight", "status": "existing class; only the three reasons of CURSOR_TRANSITIONS.permittedErrors"},
    {"id": "E-COMMAND-COMMITTED", "tag": "CommandAlreadyCommittedError", "reason": "command-already-committed", "phase": "commit", "status": "existing class; carries the original txId"},
    {"id": "E-TX-CONFLICT", "tag": "TransactionConflictError", "reason": "precondition-failed", "phase": "commit", "status": "existing class"},
    {"id": "E-CONSTRAINT", "tag": "ConstraintViolationError", "reason": "required|cardinality|unique|reference-target", "phase": "commit", "status": "existing class; reason names the rule kind"},
    {"id": "E-INVALID-VALUE", "tag": "InvalidTripleError", "reason": "invalid-value", "phase": "preflight", "status": "existing class; also an empty valid interval (TM-EMPTY-REJECTED, AMB-12) and invalid integer text (AMB-14)"},
    {"id": "E-DECIMAL-OVERFLOW", "tag": "DatalogValidationError", "reason": "decimal-overflow", "phase": "execution", "status": "new reason (RULINGS Q22): a decimal result beyond the target's declared precision or 38 digits"},
    {"id": "E-DECIMAL-BARE-DIVIDE", "tag": "DatalogValidationError", "reason": "decimal-divide-requires-scale", "phase": "preflight", "status": "new reason (RULINGS Q22): bare / on decimals; use divide(a, b, scale, rounding)"},
    {"id": "E-DECIMAL-FRACTION", "tag": "DatalogValidationError", "reason": "decimal-fraction-not-zero", "phase": "execution", "status": "new reason (RULINGS Q22): decimal to integer with a non-zero fraction and no round()"},
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
    "qlever": {
        "transitions": [
            {"id": "QT0-RECEIVED", "evidence": "broker request log entry"},
            {"id": "QT1-VALIDATED", "evidence": "group member accepted against staged state (broker trace)"},
            {"id": "QT2-LOGGED", "evidence": "COMMIT record present in the log file after restart (fsync completed); this is the irrevocable decision"},
            {"id": "QT3-APPLY-SENT", "evidence": "update operation sent (broker trace)"},
            {"id": "QT4-PUBLISHED", "evidence": "publication marker for the group's P visible in a query"},
            {"id": "QT5-VERIFIED", "evidence": "complete expected effects and absences checked (broker trace and independent query through three access paths)"},
            {"id": "QT6-ACKED", "evidence": "caller received the success receipt"},
        ],
        "outcomes": [
            {"faultAfter": "QT0-RECEIVED or QT1-VALIDATED (no QT2 evidence)", "finalState": "the command is absent unless a later attempt commits it; it is never committed twice", "originalCaller": "typed failure or E-OUTCOME-UNKNOWN; never success", "retrySameCommandId": "evaluated as a fresh command (commits at most once in total)"},
            {"faultAfter": "QT2-LOGGED (no QT4 evidence)", "finalState": "the group MUST be published by recovery with the position decided at QT2; it can never become absent", "originalCaller": "E-OUTCOME-UNKNOWN or E-COMMIT-PENDING; never success before publication", "retrySameCommandId": "before publication: E-COMMIT-PENDING or E-REPAIRING; after publication: the original success receipt (same txId and position)", "reads": "never show the group before publication; E-REPAIRING while fenced"},
            {"faultAfter": "QT3-APPLY-SENT (no QT4 evidence)", "finalState": "as QT2-LOGGED; partial permutation state must not be served: the lane fences and recovery re-applies or rebuilds", "originalCaller": "as QT2-LOGGED", "retrySameCommandId": "as QT2-LOGGED", "reads": "E-REPAIRING while fenced; after recovery all access paths agree"},
            {"faultAfter": "QT4-PUBLISHED (no QT5 evidence)", "finalState": "published; recovery completes verification before any new write", "originalCaller": "E-OUTCOME-UNKNOWN or success; success only if publication was established", "retrySameCommandId": "the original success receipt once publication is established, else E-REPAIRING", "reads": "may show the group; E-REPAIRING while fenced"},
            {"faultAfter": "QT5-VERIFIED failure (verification mismatch)", "finalState": "lane fenced; recovery republishes the logged state; final state equals O-REPLAY with the group present", "originalCaller": "no success until recovery establishes publication", "retrySameCommandId": "E-REPAIRING until recovered, then the original success receipt", "reads": "E-REPAIRING while fenced"},
            {"faultAfter": "QT5-VERIFIED (no QT6 evidence): lost ACK", "finalState": "published", "originalCaller": "E-OUTCOME-UNKNOWN", "retrySameCommandId": "the original success receipt", "reads": "show the group"},
        ],
        "successRule": "A success receipt is valid only if its timestamp is after the group's QT4-PUBLISHED evidence; a read by the same client issued after the success receipt sees the group (read-your-writes).",
    },
    "xtdb": {
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
        {"id": "CE-FUTURE-BASIS", "error": "E-UNAVAILABLE-CUT", "reason": "unavailable-cut", "when": "the requested position is beyond the latest committed position"},
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
    "T-WATERMARK-WAIT-MS": th("observe", 250, "ms a read may wait for an index watermark to reach its basis before routing to a fallback that has it", "max", "lab/TARGETS.md 4.1 item 3 (the P3 lag bar)"),
    "T-REUSE-AVOIDED": th("witness", 0.5, "engine work units of a reused read divided by the first read at the same key", "max", "derived (positive reuse witness)"),
    "T-INCR-WORK": th("witness", 0.01, "engine work for a one-entity change divided by full recomputation, at the 1m rung", "max", "derived (incremental maintenance witness)"),
    "T-FAULT-REPS": th("count", 3, "injections per fault point", "min", "derived"),
    "T-SAMPLES-PER-FAMILY": th("count", 1000, "deterministic samples per query family per rung", "min", "derived (review r1 finding 10: scale samples need a minimum)"),
    "T-SAMPLES-PER-STRATUM": th("count", 50, "samples per population stratum per family where it applies", "min", "derived"),
    "T-RUNS": th("count", 3, "independent runs per measurement", "min", "qualification/benchmark-contract.json independentRuns"),
}
CALIBRATION_RULE = "Calibration may only tighten a threshold (a smaller max, a larger min) or record it UNATTAINABLE with the measurement. Loosening any value needs Sam (TARGETS threshold policy); until he rules, the obligation stays OPEN."
THRESHOLD_RULE_FOR_KIND = {"ns": ("CR-NS", "CR-GS"), "perf": ("CR-PERF",), "observe": ("CR-OBSERVE",), "count": (), "witness": ("CR-WITNESS",), "secondary": ("CR-METRICS",)}
SECONDARY_RULE = "A secondary threshold (RULINGS Q25) is measured and reported against its value every run; missing it never fails or blocks an obligation, and it never feeds a closure rule other than CR-METRICS."

# ============================================================================ oracles
ORACLES = {
    "O-EVT": {"status": "EXISTS", "files": ["qualification/workloads/event_oracles.py", "qualification/workloads/validate_workloads.py"],
              "comparator": "CMP-SET-ROWS",
              "spec": "expected_rows for the 71 packet cases from immutable events, parameters and two-time cuts; validate_workloads.py re-derives all 71",
              "independence": "Python, imports no Triplex code"},
    "O-REPLAY": {"status": "TO-BUILD", "files": ["lab/acceptance/oracle/replay.py"], "comparator": "per case (CMP-SET-ROWS, CMP-BAG-ROWS, CMP-EXACT-VALUE, CMP-ERROR, CMP-PAGES)",
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
    "O-DOMAIN": {"status": "TO-BUILD", "files": ["lab/oracles/domain/"], "comparator": "per case (CMP-SET-ROWS for affected subjects and work items, CMP-ORDERED-ROWS for effect traces, CMP-EXACT-VALUE for due times)",
                 "spec": "WORLD_W0 (TARGETS 6.1): expected next tasks, obligations with due times, work items, affected-subject sets and effect traces from the same command stream", "independence": "Python stdlib only; imports no Triplex, kernel or engine code; shares only the W0 rule text and the command stream"},
    "O-CONTRACT": {"status": "COMPILED", "files": ["lab/acceptance/obligations.json#evaluatorCounterexamples"], "comparator": "verdict equality",
                   "spec": "the verdict the status algorithm must return for each EVALUATOR_COUNTEREXAMPLES receipt set (OPEN)", "independence": "pinned by this contract"},
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
    "M-STALE-INDEX-ANSWER": {"fault": "an index answers for a basis beyond its watermark", "reachProbe": "route.watermark", "targets": ["CS-COMPOSITION:CO-NO-STALE-ANSWER"]},
    "M-ACK-BEFORE-CURRENT": {"fault": "the ACK is sent before the current index reaches the commit position", "reachProbe": "commit.ack.currentIndex", "targets": ["CS-COMPOSITION:CO-ACK-AFTER-CURRENT"]},
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
    {"vector": "Q8F-05", "query": "Q1", "amb": "AMB-08", "reading": "B-ieee-equality", "refinement": "one element; its representation is the support with the lowest (recordedPosition, operation index)"},
]
GOLDEN_RULE = "A golden-vector query whose expected answer reads AMBIGUOUS is evaluated with the reading named in GOLDEN_RESOLUTIONS (plus its refinement, if any); the other readings stay in the file as the audit record. For AMB-01 the original tiny-v4 target answers also close on repository as-of reads, timeline and native history (RS-RAW-LIFETIME). The golden files are pinned by sha256 in obligations.json; a changed file needs a contract version."


def golden_vectors():
    out = {}
    for f in sorted((REPO / GOLDEN_DIR).glob("*.json")):
        out[f.name] = json.loads(f.read_text())
    return out


# ============================================================================ erasure (TARGETS section 7, RULINGS Q24)
ERASURE = {
    "status": "PROVISIONAL product ruling (RULINGS Q24), flagged for Sam: explain at a pre-erasure basis shows the marker, not the value",
    "boundary": "the boundary is the erasure commit's publication; a read that started before it may return the old value; every read that starts after it, at any basis including bases before the erasure, returns ErasedValue {erasedAt} in place of the value",
    "shape": "assertion identities and valid and record intervals keep their shape",
    "reproduction": "reproduction contracts (cursor stability, bit-for-bit explain, GS.12) hold modulo erasure: answers are compared with erased values replaced by their markers",
    "derivedChannels": "a PII attribute's order key and lexical channel are inside the encrypted envelope (range rules on PII then run in the kernel after decryption), or the attribute is not eligible for range rules",
    "restore": "the erasure ledger is kept apart from the data and replayed after any restore or rebuild",
    "tests": ["ER-PINNED-READER", "ER-REBUILD", "ER-RESTORE-PRE-BACKUP", "ER-ORACLE-POST"],
}
PROTECTED_COPY_INVENTORY = ["source log and journal", "current index", "history index", "analytical copy", "order-key channels", "lexical channels", "QLever broker log of record", "caches", "checkpoints", "backups"]

# ============================================================================ composition identity (TARGETS 4.1, RULINGS Q28)
COMPOSITION = {
    "assignments": ["source", "current", "history", "analytics"],
    "engines": "each assignment is XTDB or QLever",
    "receiptBinding": "every receipt binds, per assignment, the engine image digest, configuration hash and slot; every replication edge (feed consumer source hash, translation generation); and each serving index's watermark at read time",
    "basis": "a basis is a source-of-truth position (epoch, position) plus a valid time",
    "watermarkRouting": "a read at basis B is served by index I only if w(I) >= B.position; otherwise it waits up to T-WATERMARK-WAIT-MS and then routes to a fallback that has the position (the source of truth's own query surface or another index); the receipt records the route; no index answers for a basis it has not reached",
    "ackOwnership": "the source of truth sends the ACK, and only after the current index's watermark has reached the commit's position; history and analytics are asynchronous behind watermarks",
    "layerSwaps": "layers are swapped one at a time under matched workloads at small rungs (current-index candidates on P1 and P4; history candidates on past-basis reads and GS.12; source candidates on P2 and P3); only the two or three best compositions go on to end-to-end validation with the golden scenarios",
    "scopeKey": "an engine-scope receipt's key is (layer, the engine assigned to that layer, its image digest, configuration hash and slot), derived from the composition, never from engineOfLane",
}
LAYER_BY_GOAL = {"G1": "source", "G2": "current", "G3": "current", "G4": "current", "G5": "current", "G6": "current", "G7": "source", "G8": "current", "G9": "history", "G10": "source", "R": "current", "NS": "source", "GS": "source", "S": "source"}

# ============================================================================ world definition W0 (TARGETS 6.1)
WORLD_W0 = {
    "role": "a small frozen synthetic world definition used by every scenario, the P5 sweep and the P3 dependency rules; it stands in for Onboarded's real world definition and is not a Triplex product feature",
    "rules": ["I-9 Section 1 task with a due time", "I-9 Section 2 task with a due time", "E-Verify status", "background-check result", "document expiry (valid-time boundaries)", "pay rate at or above the work location's minimum wage (a shared referenced entity)", "hours over 40 (overtime)", "start-date boundaries", "proposals never count as decisions"],
    "ruleCount": "about 12",
    "releases": "two releases R1 and R2; R2 changes three requirements; releases are content-addressed and activation is a fact",
    "implementations": "the TypeScript reference kernel the drivers call, and O-DOMAIN, an independent stdlib-only Python oracle giving expected next tasks, obligations with due times, work items and effect traces from the same command stream",
    "previewActivation": "plan-impact preview (GS.11) and activation (GS.10) are compared at one common input basis (GS-10-11-COMMON-BASIS), never at different bases",
    "witnesses": "every scenario carries positive witnesses (subjects that must change) and negative witnesses (subjects that must not)",
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
]

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
DECIMAL_CASES = ["DEC-P15-SCALED", "DEC-P16-STRING", "DEC-SCALE-EXCESS", "DEC-PRECISION-EXCESS", "DEC-CROSS-FAMILY-PREFLIGHT", "DEC-CONVERTED-COMPARE"]
DECIMAL_CASES += [r["case"] for r in DECIMAL_OPS + DECIMAL_CONVERSIONS + DECIMAL_SCALE_EVOLUTION if r["case"] not in DECIMAL_CASES] + [c for c in DECIMAL_TESTS if c not in DECIMAL_CASES]
cs("CS-DECIMAL", "TO-AUTHOR", "VALUE_KINDS decimal; DECIMAL_RULES (RULINGS Q18); DECIMAL_OPS, DECIMAL_CONVERSIONS, DECIMAL_SCALE_EVOLUTION, DECIMAL_TESTS (RULINGS Q22); TARGETS section 3", ["all", "roundtrip", "range", "unrepresentable", "kernel-arithmetic", "cross-family", "operations", "conversions", "scale-evolution", "paths"], DECIMAL_CASES)
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
cs("CS-FAULT", "TO-AUTHOR", "COMMIT_OUTCOMES transitions; PLAN C2; R2 1.8; R6 experiment 10", ["atomic", "lost-ack", "engine-crash", "backup-restore", "transitions"],
   ["C2-PRE-FSYNC-CRASH", "C2-FSYNC-THEN-CRASH-RETRY", "C2-APPLY-CRASH", "C2-PUBLISH-THEN-CRASH", "C2-VERIFY-FAIL-FENCE", "C2-LOST-ACK", "C2-GROUP-COMPETING-PRECONDITIONS", "C2-GROUP-DUPLICATE-COMMAND", "C2-GROUP-FAILED-CHILD", "C2-REPLAY-CHECKPOINT", "C2-REBUILD-GENERATION-CRASH", "C2-NO-SELF-CANCEL",
    "X-PRE-COMMIT-CRASH", "X-COMMIT-SYNC-CRASH", "X-LOST-ACK", "X-COMPACTION-CRASH"])
cs("CS-BROKER", "TO-AUTHOR", "PLAN C3", ["all"], ["C3-STALE-EPOCH-RESUME", "C3-NO-TOKEN-UPDATE", "C3-UNAUTHORIZED-ROUTE", "C3-FENCED-ADMIN", "C3-FENCED-WRITE", "C3-EPOCH-CLOSE"])
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
    "NS.P1": ["NS-P1-HOT-SET", "NS-P1-SPLIT-READ", "NS-P1-MAINTENANCE-IN-WINDOW", "NS-P1-DRIVER-BASIS", "NS-P1-WAIT-ATTRIBUTION"],
    "NS.P2": ["NS-P2-BAND-5-10", "NS-P2-BAND-11-25", "NS-P2-BAND-26-50", "NS-P2-ACCOUNTING"],
    "NS.P3": ["NS-P3-CRASH-BEFORE-EFFECT", "NS-P3-CRASH-AFTER-EFFECT", "NS-P3-CRASH-AFTER-CHECKPOINT", "NS-P3-DOMAIN-AFFECTED-SET"],
    "NS.P4": ["NS-P4-BUCKETS", "NS-P4-MATCHED-HISTORY"],
    "NS.P5": ["NS-P5-COVERAGE", "NS-P5-POST-CAPTURE-MUTATION", "NS-P5-THROTTLED-COMPACTION"],
}
cs("CS-NS", "COMPILED", "load-contract.json (generated): frozen trace generator, P1 reader ladder, P2 open-loop bands, P3 feed, P4 buckets, P5 release sweep (TARGETS 1.1, 2.1)", ["calibration", "p1-ladder", "p1-stress", "p2", "p3", "p4", "p5", "secondary"], [c for v in NS_NAMED_CASES.values() for c in v])
GS_FAILURE_SCHEDULES = {
    3: [("GS-03-SUPERSEDED-REVISION", "a vendor's older revision of a status arrives after a newer one for the same subject", "acknowledged as superseded: no change to current values, recorded in the journal (provisional, flagged for Sam)")],
    4: [("GS-04B-INDEX-PARTITION", "the current index's feed consumer is cut for 60 s while the source keeps committing", "reads at bases beyond the index watermark wait or route to a fallback per COMPOSITION; none answers from the stale index")],
    6: [("GS-06B-SHARED-REFERENCE", "a work location's minimum wage changes (one shared referenced entity)", "every worker at that location appears in the feed's affected-subject set and is re-run; no other worker is")],
    15: [("GS-15-STORAGE-ACCESS", "a tenant-A route attempts to read tenant B's storage directly", "the access fails at the storage layer"),
         ("GS-15-SLOW-TENANT", "one tenant's feed consumer is slowed 10x", "other tenants' feed lag and p99 hold")],
    19: [("GS-19B-OUTBOX-CRASH", "the consumer crashes after delivering an outbox item but before recording completion", "the receiver deduplicates by the delivery key: exactly one externally visible effect")],
}
GS_COMMON_BASIS_CASE = "GS-10-11-COMMON-BASIS"
GS_CASES = ["GS-NUM-RANGE-1650", "GS-NUM-HOURS-40", "GS-NUM-UNHOLDABLE", GS_COMMON_BASIS_CASE]
GS_CASES += [c for v in GS_FAILURE_SCHEDULES.values() for c, _, _ in v]
GS_CASES += [f"GS-{i:02d}-WITNESS-{k}" for i in range(1, 21) for k in ("POS", "NEG")]
cs("CS-GS", "TO-AUTHOR", "GOLDEN_SCENARIOS (TARGETS section 6) and WORLD_W0 (TARGETS 6.1): one seeded deterministic generator per scenario, overlaid on the background trace", [f"GS-{i:02d}" for i in range(1, 21)], GS_CASES)
cs("CS-ERASURE", "TO-AUTHOR", "ERASURE (TARGETS section 7, RULINGS Q24)", ["all", "boundary", "marker", "reproduction", "inventory", "derived-channels", "restore"],
   ["ER-INFLIGHT-READ", "ER-AFTER-PUBLICATION-ALL-BASES", "ER-SHAPE-KEPT", "ER-PINNED-READER", "ER-REBUILD", "ER-RESTORE-PRE-BACKUP", "ER-ORACLE-POST", "ER-ORDER-KEY-CHANNEL", "ER-LEXICAL-CHANNEL", "ER-CURSOR-MODULO", "ER-EXPLAIN-MODULO"])
cs("CS-COMPOSITION", "TO-AUTHOR", "COMPOSITION (TARGETS 4.1, RULINGS Q28)", ["all", "watermark", "ack", "identity"],
   ["CO-WATERMARK-WAIT", "CO-WATERMARK-FALLBACK", "CO-NO-STALE-ANSWER", "CO-ACK-AFTER-CURRENT", "CO-ASYNC-HISTORY", "CO-RECEIPT-BINDS-ALL", "CO-SCOPE-KEY-FROM-ASSIGNMENT"])
cs("CS-EVAL-COUNTER", "COMPILED", "EVALUATOR_COUNTEREXAMPLES (RULINGS Q26)", ["all"], [x["id"] for x in EVALUATOR_COUNTEREXAMPLES])
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
  "Every CS-DECIMAL case, per DECIMAL_RULES (RULINGS Q18) and the operation, conversion and scale tables DECIMAL_OPS, DECIMAL_CONVERSIONS and DECIMAL_SCALE_EVOLUTION (RULINGS Q22), one named case per row, plus DECIMAL_TESTS (adjacent large decimals, negatives, zero, scale boundaries, arithmetic intermediates, every query and serialization path, an independent order-key check, and input capture before normalization): each decimal attribute declares precision and scale; precision <= 15 is stored as a scaled integer (DEC-P15-SCALED), larger precision as an order-preserving decimal string (DEC-P16-STRING); both round-trip exactly on every surface; every comparison with integer or number, equality included, is preflight E-MIXED-FAMILY (DEC-CROSS-FAMILY-PREFLIGHT) and exact after explicit conversion (DEC-CONVERTED-COMPARE); results beyond the precision fail with E-DECIMAL-OVERFLOW, bare / with E-DECIMAL-BARE-DIVIDE, decimal to integer with a fraction with E-DECIMAL-FRACTION, and a narrowing migration that would lose digits with E-DECIMAL-NARROWING, atomically; range rules (for example 'pay rate at or above 16.50') compare in exact numeric order on the repository, fragments and documented raw channel; a value with more fractional digits than the scale (DEC-SCALE-EXCESS) or outside the precision (DEC-PRECISION-EXCESS) fails with E-DECIMAL-UNREPRESENTABLE, never rounded; kernel arithmetic over decimals is exact.",
  cases=["CS-DECIMAL", "CS-DECIMAL:" + ",".join(DECIMAL_CASES)], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-REPO", "EP-WRITER", "EP-KERNEL", "EP-NATIVE", "EP-RAW-HATCH", "EP-FEED", "EP-REPLAY"], modes=CRR,
  mutants=["M-DECIMAL-ROUND", "M-DECIMAL-PRECAPTURE-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["RULINGS Q18", "RULINGS Q22", "lab/TARGETS.md section 3 (decimal value kind on the critical path for goal 1)", "lab/research/SAM-pasted-numbers-2026-11-07.md section 3"])
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
  "For every declared projection whose definition aggregates over many subjects, and every CS-NUMERIC projection-sums case, the engine-side SUM returns the AG-SUM-I total (exact; E-INTEGER-OVERFLOW only for a final total outside the integer range), using on XTDB SUM(CAST(x AS DECIMAL(32,0))) once EXP-X02 confirms it, else the split-sum fallback (RULINGS Q13, Q19), with EXP-F02 cross-checking the chosen recipe; whichever recipe is used passes these same cases; unconverted integer AVG fails with E-INTEGER-AVG; per-subject sums run in the kernel and are covered by G2.arith.integer-exact.",
  cases=["CS-NUMERIC:projection-sums"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-INTEGER-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), params={"diagnostics": ["D-X-SUM"]},
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
  "Every C6-* case: direct match and Datalog queries over :_tx/change and :_tx/changed-entity, transactions(), transactionsForEntity and transactionByCommand return O-REPLAY's outputs per JOURNAL_RULES: creation order (JN-ORDER), staged facts visible to later operations of the same command (JN-STAGED), bit-exact -0.0 change values (JN-NEGZERO, RULINGS Q21 AMB-04, provisional, flagged for Sam) and the documented and testkit-pinned fields (JN-FIELDS); whole-journal byte identity of a physically slimmed journal is checked against a separate T0-capture baseline (C6-SLIM-BYTE-IDENTICAL).",
  scope="engine", cases=["CS-JOURNAL"], oracle=["O-REPLAY"], ep=["EP-TRIPLES"], modes=CRR, contracts=["C6"],
  sources=["lab/PLAN.md C6", "lab/reviews/acceptance-review-r1.codex.md finding 6"])
O("G7.commit.protocol-transitions", ["G7"], "Commit outcomes follow the witnessed transition table",
  "For every C2-* (QLever) and X-* (XTDB) fault point of CS-FAULT, injected T-FAULT-REPS times, the final state, the original caller's outcome, retries with the same commandId and reads match COMMIT_OUTCOMES for the last witnessed transition: a group with QT2-LOGGED evidence is always published by recovery; retries before publication return E-COMMIT-PENDING or E-REPAIRING; a success receipt exists only after publication.",
  scope="engine", cases=["CS-FAULT:transitions,lost-ack,engine-crash"], oracle=["O-REPLAY", "O-OBS", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-RAW-WIRE", "EP-RESOLVE"], profiles=["P-FAULT"],
  closure=("CR-FAULT", "CR-MUTANT-KILL"), thresholds=["T-FAULT-REPS"], mutants=["M-EARLY-ACK"], contracts=["C2"],
  sources=["lab/PLAN.md C2", "lab/reviews/acceptance-review-r1.codex.md finding 5"])
O("G7.broker.fence-and-epochs", ["G7"], "One mutator, credentials, epochs and fence (C3)",
  "Every C3-* case: an old broker resuming after replacement cannot mutate; updates without the broker token are refused by the engine; native reads and the raw hatch cannot route an update; rebuild, checkpoint and administration are refused while fenced; commits while fenced return E-REPAIRING; a new broker closes the previous epoch before mutating.",
  lanes=Q, scope="engine", cases=["CS-BROKER"], oracle=["O-OBS", "O-ERR"], ep=["EP-ENGINE-ADMIN", "EP-WRITER", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-FAULT"],
  closure=("CR-PASS-ALL", "CR-OBSERVE"), contracts=["C3"], sources=["lab/PLAN.md C3"])
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
  cases=["CS-ENTITY", "CS-TEMPORAL", "CS-HAM9", "CS-CONFLICT", "CS-DECIMAL", "CS-RANGE-OUT", "CS-ERASURE", "CS-COMPOSITION", "CS-REQ", "CS-GS", "CS-SUPPORT", "CS-SUPPORT-DAG", "CS-PUBLISH", "CS-ELIGIBILITY", "CS-FAULT", "CS-MAINT", "CS-REUSE", "CS-SCOPE", "CS-STR", "CS-SHAPE", "CS-TYPES8", "CS-NUMERIC", "CS-PARAMS", "CS-WRITE", "CS-JOURNAL", "CS-CFG8", "CS-PKT-MULTICALL"],
  oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-NATIVE"], profiles=["P-TINY-CONC", "P-FAULT"], closure=("CR-MUTANT-KILL",), mutants=list(MUTANTS.keys()),
  sources=["lab/reviews/acceptance-review-r1.codex.md finding 11"])
O("R.raw.parity", ["R"], "Raw queries return what the entity API returns",
  "For every RP-* class of CS-RAW-RECIPES, a raw query written only from the raw-query guide returns the repository's answer at the same basis and O-REPLAY's, in the lane language, through the raw hatch and direct wire access, over every value outside the lane's RAW_EXCEPTIONS domains.",
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
O("NS.P1", ["NS"], "P1: many concurrent pinned reads that never block writers (per surface)",
  "With the frozen writer trace running, closed-loop readers at 1, 4, 16, 64 and 256 (and 1,024 stress) each name their basis (valid time and record time or tx), in the lane's language, under TARGETS 1.1 P1: readers and writers share one hot set (at least half the reads target subjects written in the previous 60 s, NS-P1-HOT-SET); 10% of subgraph reads are split into two or more queries at the same named basis with a driver commit to the same subjects between the steps, and must equal the oracle at the requested basis (NS-P1-SPLIT-READ); every window contains at least one maintenance event (NS-P1-MAINTENANCE-IN-WINDOW); the driver records the requested basis itself and the verifier checks answers at it (NS-P1-DRIVER-BASIS); reader-caused writer waits are attributed by matched-phase comparison against the zero-reader run and by engine-side wait evidence where the engine exposes it (NS-P1-WAIT-ATTRIBUTION). Every NS-P1-* bar holds: zero violations, goodput at 256 not below 64, read p99 within NS-P1-READ-P99-256-MS, writer commit p99 within NS-P1-WRITER-P99-RATIO-256 of its zero-reader baseline, no command waits beyond NS-P1-WRITER-WAIT-MAX-MS, and at 1,024 goodput within NS-P1-GOODPUT-1024-VS-256, writer p99 within NS-P1-WRITER-P99-RATIO-1024, back to the 256-level bar within NS-P1-RECOVERY-MS.",
  cases=["CS-NS:p1-ladder,p1-stress", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P1"])], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER", "EP-ENGINE-OBS"], thresholds=NS_LADDER + ["T-RUNS"], modes=SE, **NS_COMMON)
O("NS.P2", ["NS"], "P2: small, atomic, idempotent per-subject commits with low latency",
  "Open loop under TARGETS 1.1 P2: commands are offered on the frozen schedule and latency runs from the scheduled offer to the published ACK (sent only once the commit is durable and readable), so queueing behind other writers counts. The trace's own commands are reported per size band: the 5-to-10 band (NS-P2-BAND-5-10) and the 11-to-25 band (NS-P2-BAND-11-25) each meet NS-P2-COMMIT-P50-MS and NS-P2-COMMIT-P99-MS, the 26-to-50 band (NS-P2-BAND-26-50) meets NS-P2-COMMIT-P99-26-50-MS, all with P1's 256 readers running; the 10-fact probe is a diagnostic only. Every offered command is committed with a receipt, rejected with a typed error, or a typed conflict (NS-P2-UNACCOUNTED-MAX, NS-P2-ACCOUNTING). The pull at the returned tx sees the commit every time with no extra wait (NS-P2-RYOW-FRACTION); duplicates and lost ACKs return the original receipt every time (NS-P2-DUP-RECEIPT-FRACTION).",
  scope="engine", cases=["CS-NS:p2", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P2"])], ep=["EP-WRITER", "EP-REPO", "EP-RESOLVE"], thresholds=["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS", "NS-P2-COMMIT-P99-26-50-MS", "NS-P2-UNACCOUNTED-MAX", "NS-P2-RYOW-FRACTION", "NS-P2-DUP-RECEIPT-FRACTION", "T-RUNS"], modes=SE, **NS_COMMON)
O("NS.P3", ["NS"], "P3: an ordered, resumable change feed",
  "Under TARGETS 1.1 P3: feed entries carry tx, entity, attribute and the valid-time range affected; commit time is the source's publication instant on the shared host monotonic clock; the cursor is (epoch, position); the expected affected-subject set per transaction is the directly written subjects (O-REPLAY) plus subjects affected through referenced entities under WORLD_W0 (O-DOMAIN, NS-P3-DOMAIN-AFFECTED-SET); 'affected subjects known' is the consumer's single durable write of the set and its checkpoint. Over a run there are zero gaps (NS-P3-GAPS-MAX) and zero per-subject order violations (NS-P3-ORDER-VIOLATIONS-MAX); lag stays within NS-P3-LAG-P99-MS with P1's 256 readers running; delivery is at-least-once from the last checkpoint with effects keyed by (consumer, position, subject), so crashes before the effect, after the effect before the checkpoint, and after the checkpoint (NS-P3-CRASH-BEFORE-EFFECT, NS-P3-CRASH-AFTER-EFFECT, NS-P3-CRASH-AFTER-CHECKPOINT) leave zero visible duplicate effects (NS-P3-VISIBLE-DUP-EFFECTS-MAX) while replay attempts are counted separately; resume from a checkpoint replays exactly.",
  scope="engine", cases=["CS-NS:p3", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P3"])], ep=["EP-FEED", "EP-WRITER", "EP-ENGINE-OBS"], thresholds=["NS-P3-GAPS-MAX", "NS-P3-ORDER-VIOLATIONS-MAX", "NS-P3-LAG-P99-MS", "NS-P3-VISIBLE-DUP-EFFECTS-MAX", "T-RUNS"], modes=SE,
  oracle=["O-REPLAY", "O-DOMAIN", "O-OBS"], profiles=["P-YEAR-ONE", "P-NS"], closure=("CR-NS",), sources=["lab/NORTH-STAR.md", "lab/TARGETS.md sections 1, 1.1 and 2"])
O("NS.P4", ["NS"], "P4: a fast path to current values, separate from history (per surface)",
  "Under TARGETS 1.1 P4: subject pulls at the current basis in the lane's language over the frozen weighted buckets (50% 50 to 200 facts, 35% 201 to 800, 15% 801 to 2,000; hops 3 at 40%, 4 at 35%, 6 at 25%; NS-P4-BUCKETS) meet NS-P4-PULL-P50-MS and NS-P4-PULL-P99-MS single-client on the weighted mix, each bucket reports its own p50 and p99, and the largest bucket meets NS-P4-PULL-P99-LARGEST-MS; throughput sustains NS-P4-PULLS-PER-CORE per engine core, with cores taken from the CPU quota bound in the receipt and host broker and kernel CPU reported beside it; on one matched sample of 1,000 subjects grown from history depth 1 to 3 to 10, current-pull p99 and bytes read stay within NS-P4-HISTORY-FLATNESS (NS-P4-MATCHED-HISTORY, RULINGS Q27); the receipt records whether current reads touch history.",
  cases=["CS-NS:p4", "CS-NS:" + ",".join(NS_NAMED_CASES["NS.P4"])], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], thresholds=["NS-P4-PULL-P50-MS", "NS-P4-PULL-P99-MS", "NS-P4-PULL-P99-LARGEST-MS", "NS-P4-PULLS-PER-CORE", "NS-P4-HISTORY-FLATNESS", "T-RUNS"], modes=SE, **NS_COMMON)
O("NS.P5", ["NS"], "P5: release activation re-evaluates 100k subjects without hurting live traffic (per surface)",
  "Under TARGETS 1.1 P5: a sweep evaluates release R against WORLD_W0 for every subject in R's scope at one shared basis, in the lane's language, while the writer trace and 64 live readers run; the receipt binds the basis and R's content hash; coverage is exact, every in-scope subject evaluated exactly once with the subject-list hash recorded (NS-P5-COVERAGE); results are published as work items through EP-OUTBOX and equal O-DOMAIN's expected outputs; subjects the driver mutates after the basis is captured keep sweep outputs at the captured basis (NS-P5-POST-CAPTURE-MUTATION). Wall time including evaluation and publication stays within NS-P5-SWEEP-S; live read p99 and writer commit p99 stay within NS-P5-LIVE-READ-P99-RATIO and NS-P5-WRITER-P99-RATIO of their no-sweep values; a throttled variant of about 10 minutes overlaps a real compaction or index rebuild, keeps its basis and never blocks writers (no command waits beyond NS-P1-WRITER-WAIT-MAX-MS; OBS-MAINTENANCE shows the maintenance completing; NS-P5-THROTTLED-COMPACTION).",
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
    (19, "Feed consumer crash", "the dependency-index consumer crashes mid-stream and resumes from its checkpoint", "no gap, no duplicate processing, per-subject order kept; catch-up lag measured", ["P3"], ["NS-P3-GAPS-MAX", "NS-P3-ORDER-VIOLATIONS-MAX"]),
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
    "Numbers inside the scenarios: pay rates, hours and money use scaled integers or order-preserving decimal strings; the scenarios include the range rules 'pay rate at or above 16.50' and 'hours over 40' (cases GS-NUM-RANGE-1650 and GS-NUM-HOURS-40, selected by GS.18's dashboard filters) and at least one write of a value the lane cannot hold, which must fail with E-VALUE-OUT-OF-RANGE or E-DECIMAL-UNREPRESENTABLE (GS-NUM-UNHOLDABLE, selected by GS.02).",
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
        extra += " The preview is compared with GS.10's activation at one common input basis (GS-10-11-COMMON-BASIS)."
    if n == 10:
        extra += " Activation is compared with GS.11's preview at one common input basis (GS-10-11-COMMON-BASIS)."
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
  "Every CS-ERASURE boundary, marker and reproduction case per ERASURE: a read that started before the erasure published may return the old value (ER-INFLIGHT-READ); every read that starts after it, at any basis including bases before the erasure, returns ErasedValue {erasedAt} in place of the value (ER-AFTER-PUBLICATION-ALL-BASES), with assertion identities and valid and record intervals unchanged (ER-SHAPE-KEPT); a reader already pinned when the erasure lands follows the same rule (ER-PINNED-READER); expected post-erasure answers come independently from O-REPLAY (ER-ORACLE-POST).",
  cases=["CS-ERASURE:boundary,marker", "CS-ERASURE:ER-INFLIGHT-READ,ER-AFTER-PUBLICATION-ALL-BASES,ER-SHAPE-KEPT,ER-PINNED-READER,ER-ORACLE-POST"], oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-REPO", "EP-NATIVE", "EP-TRIPLES"], profiles=["P-TINY-CONC"], modes=CRR,
  sources=["lab/TARGETS.md section 7", "RULINGS Q24"], notes=ER_NOTE, params={"provisional": True})
O("G9.erasure.protected-copies", ["G9"], "Erasure reaches every protected copy",
  "Each lane keeps a protected-copy inventory covering every PROTECTED_COPY_INVENTORY location; after the erasure publishes, OBS-ERASURE-SCAN finds no plaintext and no derived-channel copy in any of them, or evidence that the per-subject key was destroyed (crypto-shredding); a PII attribute's order key and lexical channel are inside the encrypted envelope or the attribute is not eligible for range rules (ER-ORDER-KEY-CHANNEL, ER-LEXICAL-CHANNEL).",
  scope="engine", cases=["CS-ERASURE:inventory,derived-channels", "CS-ERASURE:ER-ORDER-KEY-CHANNEL,ER-LEXICAL-CHANNEL"], oracle=["O-OBS", "O-REPLAY"], ep=["EP-WRITER", "EP-ENGINE-OBS", "EP-RAW-WIRE"], modes=CUR_REOPEN,
  mutants=["M-ERASURE-LEAK"], closure=("CR-PASS-ALL", "CR-OBSERVE", "CR-MUTANT-KILL"), sources=["lab/TARGETS.md section 7 items 3 and 4", "RULINGS Q24"], notes=ER_NOTE, params={"provisional": True})
O("G9.erasure.restore-reapplies", ["G9", "G7"], "Restore and rebuild re-apply the erasure ledger",
  "The erasure ledger is kept apart from the data; a rebuild after erasure (ER-REBUILD) and a restore from a pre-erasure backup (ER-RESTORE-PRE-BACKUP) both replay it, so every read afterwards returns the ErasedValue marker and OBS-ERASURE-SCAN of the restored copy is clean.",
  scope="engine", cases=["CS-ERASURE:restore", "CS-ERASURE:ER-REBUILD,ER-RESTORE-PRE-BACKUP"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPLAY", "EP-REPO", "EP-ENGINE-OBS"], modes=CUR_REOPEN,
  closure=("CR-PASS-ALL", "CR-OBSERVE"), sources=["lab/TARGETS.md section 7 items 5 and 6", "RULINGS Q24"], notes=ER_NOTE, params={"provisional": True})

# ---------------- composition identity (TARGETS 4.1, RULINGS Q28)
O("G8.composition.watermark-routing", ["G8"], "Reads are served only by an index that has reached their basis",
  "Per COMPOSITION: each read index publishes a watermark; a read at basis B is served by index I only if w(I) >= B.position, otherwise it waits up to T-WATERMARK-WAIT-MS (CO-WATERMARK-WAIT) and then routes to a fallback that has the position (CO-WATERMARK-FALLBACK); no index answers for a basis it has not reached (CO-NO-STALE-ANSWER); the receipt records the route of every read (OBS-WATERMARK); history and analytics trail asynchronously behind their watermarks (CO-ASYNC-HISTORY).",
  cases=["CS-COMPOSITION:watermark", "CS-COMPOSITION:CO-WATERMARK-WAIT,CO-WATERMARK-FALLBACK,CO-NO-STALE-ANSWER,CO-ASYNC-HISTORY"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-FEED", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  thresholds=["T-WATERMARK-WAIT-MS"], mutants=["M-STALE-INDEX-ANSWER"], closure=("CR-PASS-ALL", "CR-OBSERVE", "CR-MUTANT-KILL"), sources=["lab/TARGETS.md section 4.1 item 3", "RULINGS Q28"])
O("G7.composition.ack-ownership", ["G7"], "The source of truth ACKs only after the current index reached the commit",
  "Per COMPOSITION: the source of truth sends every ACK, and only after the current index's watermark has reached the commit's position (CO-ACK-AFTER-CURRENT, OBS-ACK-ORDER), which is what makes read-your-own-write hold across a composition.",
  scope="engine", cases=["CS-COMPOSITION:ack", "CS-COMPOSITION:CO-ACK-AFTER-CURRENT"], oracle=["O-REPLAY", "O-OBS"], ep=["EP-WRITER", "EP-REPO", "EP-ENGINE-OBS"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  mutants=["M-ACK-BEFORE-CURRENT"], closure=("CR-PASS-ALL", "CR-OBSERVE", "CR-MUTANT-KILL"), sources=["lab/TARGETS.md section 4.1 item 4", "RULINGS Q28"])
O("G10.composition.identity-bound", ["G10", "R"], "Receipts bind the whole composition",
  "Every receipt binds the four assignments (source, current, history, analytics) with image digest, configuration hash and slot each, every replication edge (feed consumer source hash, translation generation) and the serving index's watermark at every read (CO-RECEIPT-BINDS-ALL, VA14); engine-scope keys derive from the assignment of the obligation's layer, never from engineOfLane (CO-SCOPE-KEY-FROM-ASSIGNMENT).",
  scope="engine", cases=["CS-COMPOSITION:identity", "CS-COMPOSITION:CO-RECEIPT-BINDS-ALL,CO-SCOPE-KEY-FROM-ASSIGNMENT"], oracle=["O-CONTRACT"], ep=["EP-EVALUATOR"], profiles=["P-STATIC"],
  sources=["lab/TARGETS.md section 4.1 items 1 and 2", "RULINGS Q28"])

# ---------------- evaluator counterexamples (RULINGS Q26)
O("R.evaluator.incomplete-receipts", ["R"], "Incomplete receipts cannot close an obligation",
  "The evaluator ships every EVALUATOR_COUNTEREXAMPLES receipt set and judges each OPEN (O-CONTRACT); together they cover every closure rule any obligation uses.",
  scope="engine", cases=["CS-EVAL-COUNTER", "CS-EVAL-COUNTER:" + ",".join(x["id"] for x in EVALUATOR_COUNTEREXAMPLES)], oracle=["O-CONTRACT"], ep=["EP-EVALUATOR"], profiles=["P-STATIC"], sources=["RULINGS Q26", "lab/reviews/plan-v2-review.codex.md finding 14"])

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

# RULINGS Q26: the calibration requirement is every threshold an NS obligation names.
NS_CAL_REQUIRED = sorted({t for o in OBL if o["id"].startswith("NS.") and o["id"] != "NS.calibration" for t in o["thresholds"]})
for o in OBL:
    if o["id"] == "NS.calibration":
        o["closure"]["params"]["requiredThresholds"] = NS_CAL_REQUIRED

# RULINGS Q28: every engine-scope obligation names the composition layer its scope key derives from.
LAYER_OVERRIDES = {"NS.P2": "source", "NS.P3": "source", "G8.composition.watermark-routing": "current", "G7.composition.ack-ownership": "source", "S.maintenance.correct-during": "current",
                   "REQ.snapshot-reads": "history", "REQ.read-your-write": "current", "REQ.retro-corrections": "current", "REQ.pii-erasure": "source", "REQ.tenant-isolation": "source"}
for o in OBL:
    o["layer"] = (LAYER_OVERRIDES.get(o["id"]) or LAYER_BY_GOAL[o["goals"][0]]) if o["receiptScope"] == "engine" else None

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
        "runKind": "acceptance | calibration | mutation | verifier | diagnostic",
        "contract": "{version, transitiveSha256}",
        "obligations": "[{id, definitionSha256}]",
        "lane": "lane id for lane-scope receipts; for engine-scope receipts the scope key (layer, engine, imageDigest, configSha256, slot) derived from the composition assignment of the obligation's layer (COMPOSITION scopeKey)",
        "composition": "{source, current, history, analytics}: each {engine: xtdb | qlever, imageDigest, configSha256, slot} (RULINGS Q28)",
        "replicationEdges": "[{from, to, consumerSourceSha256, translationGeneration}] for every edge of the composition",
        "watermarks": "per read: {readId, basisPosition, servingIndex, watermarkAtRead, waitMs, route}",
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
}
MODE_RULE = "Every obligation declares at least one mode. 'single-execution' runs each selected case once, so executions equal selections; NS and GS obligations use it explicitly (RULINGS Q26). Other modes (current, reopen, engine-restart) each run every selected case once more."
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
    "CR-NS": {"evidence": ["ns-run"], "validity": ["VA", "VC"], "recompute": "every named NS bar from retained raw events under TARGETS 1.1: goodput counts only reads whose answer equals the oracle at the driver-recorded requested basis; latencies from the scheduled offer to the published ACK; ratios against the same run's matched-phase baselines; per-core throughput from the receipt's CPU quota; affected-subject sets against O-REPLAY plus O-DOMAIN", "holds": "every named bar met in each of T-RUNS independent runs, on the frozen trace generator and seed of load-contract.json, with a VC record for every named threshold"},
    "CR-GS": {"evidence": ["ns-run", "case-result", "fault-witness"], "validity": ["VA", "VC"], "recompute": "only evidence whose ns-run measurement equals the obligation's params.scenario counts; scenario correctness from retained answers against O-REPLAY (state), O-DOMAIN (domain outputs under WORLD_W0) or O-HAND; positive and negative witnesses; every named failure schedule's expected outcome; commit and feed integrity from retained receipts and feed entries; every named bar from retained raw events", "holds": "zero wrong answers, zero lost or duplicated commits, zero feed gaps or order violations, every witness and failure-schedule outcome as expected, every named bar met, in each of T-RUNS runs, on every compared composition"},
    "CR-REQUIREMENT": {"evidence": ["requirement-route", "case-result"], "validity": ["VA"], "recompute": "each test verdict from retained results; the route record checked for a plain statement when WORKAROUND", "holds": "the engine declares NATIVE or a documented WORKAROUND and every test of the requirement passes on that route; an OPEN requirement never excludes the engine from comparison"},
    "CR-CALIBRATION": {"evidence": ["calibration-record"], "validity": ["VC"], "recompute": "the required set is the union of the thresholds named by every NS obligation (obligations.json NS.calibration params.requiredThresholds); VC3 check of each value against the registry", "holds": "the required set is non-empty and a VC-valid record holds a value for every member; an empty set or a missing member fails closed (RULINGS Q26)"},
    "CR-MATRIX": {"evidence": ["case-result"], "validity": ["VA"], "recompute": "matrix cells from obligations.json capabilityMatrix and the cited receipts", "holds": "every required cell EXACT with a receipt; every raw-required KNOWN-LIMIT cell has its exception record and guide entry"},
    "CR-PROVENANCE": {"evidence": ["provenance-manifest"], "validity": ["VA"], "recompute": "manifest inputs compared with the guide and docs hashes", "holds": "inputs are only the raw-query guide and engine public docs; the author is a fresh agent"},
    "CR-WITNESS": {"evidence": ["observation", "case-result"], "validity": ["VA"], "recompute": "OBS-WORK work-unit ratios from retained engine-side counters", "holds": "every named witness threshold met and answers equal the no-reuse or fresh-recompute run"},
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
    "    A = acceptance receipts for (O.id, key) on T that pass VA (using VC records they cite)",
    "    closed(O, L, T) = O.grounding != 'policy-pending' and every case set of O is pinned",
    "                      and A non-empty and every rule in O.closure.rules holds by its recompute",
    "                      and VV-valid verifier coverage exists per VERIFIER_MODES[verifierMode(O)]",
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
    "OBS-ERASURE-SCAN": {"fields": ["inventoryEntry", "location", "scanMethod", "plaintextHits", "derivedChannelHits", "keyDestroyedEvidence", "tScan"], "verdict": "PASS iff every PROTECTED_COPY_INVENTORY location of the lane is scanned after the erasure published and shows zero plaintext and zero derived-channel hits, or carries evidence that the per-subject key was destroyed"},
    "OBS-WATERMARK": {"fields": ["readId", "basisPosition", "servingIndex", "watermarkAtRead", "waitMs", "route", "fallbackIndex"], "verdict": "PASS iff no read was answered by an index whose watermark was below the basis position, every wait before routing is within T-WATERMARK-WAIT-MS, and every route is recorded"},
    "OBS-ACK-ORDER": {"fields": ["commitPosition", "tCurrentIndexReached", "tAck", "ackSender"], "verdict": "PASS iff the source of truth sent every ACK and tAck >= tCurrentIndexReached for every commit"},
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
    },
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
                   "hotSet": {"minShare": 0.5, "rule": "at least 50% of reads target subjects written in the previous 60 s (the writer trace's active set)"},
                   "splitReads": {"share": 0.10, "rule": "10% of subgraph reads are issued as two or more queries at the same named basis; the driver commits a mutation to those same subjects between the steps; the answer must equal the oracle at the requested basis, never the latest state"},
                   "maintenance": "every P1 window contains at least one maintenance event (XTDB compaction; QLever index rebuild or delta merge; index-layer catch-up)",
                   "requestedBasis": "the driver records the basis it requested (from the receipts it observed) independently of anything the engine echoes; the verifier checks every sampled answer at the driver-recorded basis",
                   "writerWaitAttribution": ["writer latency at each reader level against the zero-reader run on the same trace segment and burst phase", "engine-side wait evidence where exposed (QLever broker queue wait); XTDB has no read-path locks, so its evidence is the matched-phase comparison"],
                   "record": ["correctness-qualified read goodput per level", "read p50, p99 per level", "writer commit latency p50, p99, max and throughput per level"],
                   "bars": [k for k in NS_LADDER], "recovery": "after the 1,024 window, readers return to 256; 30 s evaluation windows sliding by 5 s; recovery time = end of the first window meeting every 256-level bar; must be within NS-P1-RECOVERY-MS"},
            "P2": {"loop": "open loop on the frozen offer schedule (WRITER_TRACE generator)", "latency": "from the scheduled offer time to the published ACK (sent only after the commit is durable and readable), so queueing behind other writers counts",
                   "sizeBands": [{"facts": [5, 10], "bars": ["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS"]}, {"facts": [11, 25], "bars": ["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS"]}, {"facts": [26, 50], "bars": ["NS-P2-COMMIT-P99-26-50-MS"], "note": "provisional"}],
                   "commands": "the trace's own commands; the 10-fact probe is a diagnostic only", "accounting": "every offered command is committed with a receipt, rejected with a typed error, or a typed conflict; zero unaccounted (NS-P2-UNACCOUNTED-MAX)",
                   "ryow": "the next pull at the returned tx", "idempotency": "the trace's duplicates and lost ACKs", "readers": 256,
                   "bars": ["NS-P2-COMMIT-P50-MS", "NS-P2-COMMIT-P99-MS", "NS-P2-COMMIT-P99-26-50-MS", "NS-P2-UNACCOUNTED-MAX", "NS-P2-RYOW-FRACTION", "NS-P2-DUP-RECEIPT-FRACTION"]},
            "P3": {"commitTime": "the source of truth's publication instant for the transaction, stamped by the source on the host monotonic clock the driver also reads", "cursor": "(epoch, position), a total order over transactions; per-subject order follows from it",
                   "expectedAffected": "subjects written directly (O-REPLAY) plus subjects affected through referenced entities under WORLD_W0's dependency rules (O-DOMAIN)",
                   "milestone": "the consumer durably records the affected-subject set and its checkpoint in one durable write; lag runs from commit time to that record",
                   "delivery": "at-least-once from the last checkpoint; effects keyed by (consumer, position, subject), so replay is idempotent; visible duplicate effects must be zero (NS-P3-VISIBLE-DUP-EFFECTS-MAX); replay attempts allowed and counted separately",
                   "crashPoints": ["before the effect", "after the effect, before the checkpoint", "after the checkpoint"], "readers": 256,
                   "bars": ["NS-P3-GAPS-MAX", "NS-P3-ORDER-VIOLATIONS-MAX", "NS-P3-LAG-P99-MS", "NS-P3-VISIBLE-DUP-EFFECTS-MAX"]},
            "P4": {"probe": "single client, subject pulls at the current basis", "buckets": [{"facts": [50, 200], "weight": 0.50}, {"facts": [201, 800], "weight": 0.35}, {"facts": [801, 2000], "weight": 0.15}], "hops": [{"hops": 3, "weight": 0.40}, {"hops": 4, "weight": 0.35}, {"hops": 6, "weight": 0.25}],
                   "tails": "the p50 and p99 bars apply to the weighted mix; each bucket reports its own p50 and p99; the largest bucket has NS-P4-PULL-P99-LARGEST-MS",
                   "throughput": "closed-loop pulls; cores = the CPU quota bound in the receipt; host broker and kernel CPU reported beside engine-core throughput",
                   "history": "one matched sample of 1,000 subjects: measure at history depth 1, add corrections to the same subjects to depth 3 and then 10, measure again; compare p99 latency and bytes read (RULINGS Q16, Q27)",
                   "bars": ["NS-P4-PULL-P50-MS", "NS-P4-PULL-P99-MS", "NS-P4-PULL-P99-LARGEST-MS", "NS-P4-PULLS-PER-CORE", "NS-P4-HISTORY-FLATNESS"]},
            "P5": {"sweep": "evaluate release R against WORLD_W0 for every subject in R's scope (100k) at one shared basis; the receipt binds the basis and R's content hash", "coverage": "every in-scope subject evaluated exactly once; the receipt carries the hash of the subject list",
                   "publication": "results published as work items through the atomic outbox path (EP-OUTBOX); expected outputs from O-DOMAIN, independently", "postCaptureMutations": "after the basis is captured the driver mutates selected subjects; their outputs must reflect the captured basis",
                   "wallTime": "includes evaluation and publication", "throttledVariant": "about 10 minutes, overlapping a real compaction or index rebuild; keeps its basis and never blocks writers",
                   "concurrent": "the writer trace and 64 live readers", "noSweepBaseline": "same run, same 64 readers and writer trace, before the sweep", "bars": ["NS-P5-SWEEP-S", "NS-P5-LIVE-READ-P99-RATIO", "NS-P5-WRITER-P99-RATIO", "NS-P1-WRITER-WAIT-MAX-MS"]},
            "secondary": {"bulk": "a 1M-fact import through the bulk lane with 64 live readers; bar NS-SEC-BULK-READ-P99-RATIO", "retroactive": "1,000 corrections 30 days back; feed valid-time range and explain at the old basis checked", "audit": "explain at a past basis, repeated three times; bit-for-bit identical"},
        },
        "windows": {"acceptance": {"warmupS": 120, "perLadderLevelS": 600, "note": "RULINGS Q16; 600 s covers one full burst cycle of the writer trace (60 s at 750 facts/s every 600 s)"}, "screening": {"profile": "P-SCREEN", "warmupS": 30, "perLadderLevelS": 120, "note": "RULINGS Q16; candidate comparison only; a screening receipt never closes an obligation"}},
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
]


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
        if c not in CS["CS-DECIMAL"]["requiredCases"]:
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
        if o["id"].startswith(("NS.", "GS.")) and o["closure"]["modes"] != ["single-execution"]:
            e.append(f"Q26: {o['id']} must use single-execution")
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
    for oid in ("G8.composition.watermark-routing", "G7.composition.ack-ownership"):
        if oid not in obl:
            e.append(f"Q28: {oid} missing")
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
    if "p <= 15" not in DECIMAL_RULES["storage"][0]["when"] or "never rounded" not in DECIMAL_RULES["reject"]:
        e.append("Q18: decimal storage or reject rule wrong")
    for rc in ("DEC-P15-SCALED", "DEC-P16-STRING", "DEC-SCALE-EXCESS", "DEC-PRECISION-EXCESS", "DEC-CROSS-FAMILY-PREFLIGHT"):
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
            if not any(t["case"] == rc for t in TRACE) and not rc.startswith("X-") and not any(c["set"] == cid and rc in c["select"] for o in OBL for c in o["cases"]):
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
    ("Q18", "Decimal", "DECIMAL_RULES: declared precision and scale; scaled integer when precision <= 15, else order-preserving decimal string; excess digits rejected with E-DECIMAL-UNREPRESENTABLE; own family between number and datetime; CMP-DECIMAL-CROSS preflight error unless converted; kernel arithmetic; six named CS-DECIMAL cases selected by G1.types.decimal."),
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
    A("### 0.3.2 (this version): rulings Q21 to Q28 and TARGETS v2\n")
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
        "**Position accounting.** Positions are derived by the oracle from the committed order: one position per Triplex transact, nested transacts inside one outer transaction take consecutive positions in callback order and share one engine commit; the oracle checks every receipt position against its own and fails the run on a mismatch.",
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
        ["decimal", "0.00, 16.50, 16.49, 1e11 cents as a scaled integer, a negative value, an order-preserving string encoding round trip (CS-DECIMAL covers scale overflow)"],
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
    for eng in ("qlever", "xtdb"):
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
    A(md_table(["Item", "Rule"], [[k, ", ".join(v) if isinstance(v, list) else v] for k, v in COMPOSITION.items()]))
    A("\n### 8.8 Erasure (TARGETS section 7, RULINGS Q24)\n")
    A(md_table(["Item", "Rule"], [[k, ", ".join(v) if isinstance(v, list) else v] for k, v in ERASURE.items()]))
    A("\nProtected-copy inventory, per lane: " + ", ".join(PROTECTED_COPY_INVENTORY) + ".\n")
    A("### 8.9 Evaluator counterexamples (RULINGS Q26)\n")
    A(MODE_RULE + " " + SECONDARY_RULE + "\n")
    A(md_table(["Id", "Defeats", "Receipt set", "Why it stays OPEN"], [[x["id"], ", ".join(x["defeats"]), x["receipts"], x["why"]] for x in EVALUATOR_COUNTEREXAMPLES]))
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
        "evaluatorCounterexamples": EVALUATOR_COUNTEREXAMPLES, "modeRule": MODE_RULE, "secondaryRule": SECONDARY_RULE, "integerMinRange": INTEGER_MIN_RANGE, "laneIntegerRange": LANE_INTEGER_RANGE, "rangeRule": RANGE_RULE,
        "numericOps": NUMERIC_OPS, "conversionRules": CONVERSION_RULES, "comparisonRules": COMPARISON_RULES, "aggregateRules": AGGREGATE_RULES,
        "cardManyOrder": CARD_MANY_ORDER, "constraintRules": CONSTRAINT_RULES, "errorTable": ERROR_TABLE, "errorComparison": ERROR_COMPARISON,
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
    for name, text in [("obligations.json", obl_text), ("load-contract.json", load_text), ("budgets.json", budgets_text), ("capability-matrix.md", matrix_text), ("ACCEPTANCE.md", acc_text)]:
        (HERE / name).write_text(text)
    print(counts)
    print(f"obligations: {len(OBL)}; raw exceptions: {len(RAW_EXCEPTIONS)}; traced cases: {len(TRACE)}; mutants: {len(MUTANTS)}; thresholds: {len(THRESHOLDS)} ({sum(1 for v in THRESHOLDS.values() if v['source'].startswith('derived'))} derived)")
    print("rulings compiled: " + ", ".join(r["id"] for r in RULINGS if r.get("status") != "SUPERSEDED") + "; superseded: " + ", ".join(r["id"] for r in RULINGS if r.get("status") == "SUPERSEDED"))
    print("transitive hash:", doc["transitiveContractSha256"])


if __name__ == "__main__":
    main()
