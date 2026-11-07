#!/usr/bin/env python3
"""Single source of truth for the triplex-db-2 acceptance contract (version 0.2.0).

Run:  python3 -I lab/acceptance/build_contract.py
It validates the whole contract (references, statement and profile consistency, thresholds, selectors,
traceability, raw exceptions, fragment coverage, validity dependencies, one check per ruling, banned obsolete
text) and, only when everything validates, writes:

  lab/acceptance/obligations.json      the only authority an evaluator reads
  lab/acceptance/capability-matrix.md  generated from the matrix data below
  lab/acceptance/ACCEPTANCE.md         generated human rendering (explanatory only; obligations.json wins)

Inputs read (and hashed into the transitive contract hash): lab/acceptance/RULINGS.md, the held S/L
obligations (held/s-l-obligations-0.1.0.json), the unchanged load-contract.json, and the files of existing case
sets and oracles. During the orchestrator hold of 2026-11-07 load-contract.json and budgets.json are not written. Stdlib only; imports nothing from the repository.
"""
import hashlib
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
VERSION = "0.2.0"
STATUS = "CANDIDATE-1.0.0: compiled rulings of RULINGS.md and PLAN v1.1 C1-C8; freezes as 1.0.0 after orchestrator acceptance and adversarial review"
DATE = "2026-11-07"

LANES = ["xtdb-xtql", "xtdb-sql", "qlever-sparql"]
ALL = LANES
X = ["xtdb-xtql", "xtdb-sql"]
Q = ["qlever-sparql"]
ENGINE_OF = {"xtdb-xtql": "xtdb", "xtdb-sql": "xtdb", "qlever-sparql": "qlever"}
LANG_OF = {"xtdb-xtql": "xtql", "xtdb-sql": "sql", "qlever-sparql": "sparql"}

SECTIONS = [
    ("G1", "Goal 1. Eight exact value types, schemas, cardinality, uniqueness, references"),
    ("G2", "Goal 2. Expressions, arithmetic boundaries, specified error semantics"),
    ("G3", "Goal 3. Useful plans, costing, preconstruction admission, recursion"),
    ("G4", "Goal 4. Completed absence and negation at coherent cuts"),
    ("G5", "Goal 5. Full-support aggregates, typed groups, empties, exact overflow"),
    ("G6", "Goal 6. Cancellation, deadlines, resource ownership, cleanup"),
    ("G7", "Goal 7. Atomic writes, receipts, migration and evolution, recovery"),
    ("G8", "Goal 8. Bounded reuse, transactional publication, maintained supports"),
    ("G9", "Goal 9. Bitemporal intervals, presence, corrections, lineage, deletion, cascades"),
    ("G10", "Goal 10. Public TypeScript and schema integration, scope, cursors, lifecycle, capabilities, consumers"),
    ("R", "R. Entity API (the ORM) and raw queries make sense"),
    ("S", "S. Scale: 10m distinct entities, 100m active representative facts"),
    ("L", "L. Load: 256 logical clients, 512 and 1024 stress"),
]


def sha_file(rel):
    p = REPO / rel
    if not p.exists():
        return None
    return hashlib.sha256(p.read_bytes()).hexdigest()


def sha_text(t):
    return hashlib.sha256(t.encode()).hexdigest()


# ============================================================================ rulings (compiled)
# Each ruling is compiled into the data below; RULING_CHECKS (end of file) verifies each one is reflected.
# status HELD: not compiled in 0.2.0 (orchestrator hold 2026-11-07, performance targets being re-tuned).
RULINGS = [
    {"id": "Q1", "topic": "unrestricted raw exactness",
     "ruling": "Not required for done. Required: (a) repository and every supported native fragment exact over the full Triplex value domain; (b) the raw dataset exact on its documented exact channels; (c) raw natively typed shapes outside exact ranges are per-cell KNOWN-LIMIT exceptions, each with an exact mapped recipe, the obligation that qualifies it, and the original raw failure kept as a diagnostic with its unchanged expected answer. Supported fragments have a fixed minimum coverage set.",
     "compiledInto": ["MATRIX_ROWS", "RAW_EXCEPTIONS", "DIAGNOSTICS", "FRAGMENT_COVERAGE", "R.raw.mapped-recipes", "R.raw.parity", "R.raw.capability-matrix", "G10.capabilities.truthful"]},
    {"id": "Q2", "status": "HELD", "topic": "load bar",
     "ruling": "Fixed minimum: 256 logical clients on the 10m representative dataset, open-loop 1 request per client per second (90% reads by mix, 10% writes = 25.6 commands/s); goodput >= 0.99; explicit rejections <= 0.01; fairness >= 0.9; read p99 <= 1 s (point/entity/repository) and <= 5 s (analytic); write visibility p99 <= 2 s; every write visible inside 30 s. Stress 512 and 1024: zero correctness violations, rejections counted, goodput retention >= 0.9 of the 256-level goodput, recovery to the 256-level bar within 60 s. Calibration may tighten or report failure, never loosen; an unattainable bound is recorded and Sam is asked before lowering.",
     "compiledInto": ["THRESHOLDS (L-*)", "load-contract.json", "L.*"]},
    {"id": "Q3", "topic": "host post-processing",
     "ruling": "Kept as a declared step that reads no data, counted inside the task's measured call.",
     "compiledInto": ["LANGUAGE_RULES", "PKT.full142"]},
    {"id": "Q4", "status": "HELD", "topic": "sparse profile load",
     "ruling": "Load acceptance on the representative profile; the sparse profile gets its scale rungs plus a 256-client smoke run (no stress).",
     "compiledInto": ["L.smoke.sparse-256", "load-contract.json levels.smoke-sparse-256"]},
    {"id": "Q5", "topic": "guide-only raw authoring",
     "ruling": "A fresh agent given only the raw-query guide and the engine's public docs authors the raw query set; answers must match the repository at the same basis.",
     "compiledInto": ["R.raw.guide-only-authoring", "CR-PROVENANCE"]},
    {"id": "Q6", "topic": "proof lineage",
     "ruling": "Assertion-level provenance: every answer row that claims a fact names its supporting assertion ids and transactions.",
     "compiledInto": ["G9.lineage.supporting-assertions"]},
    {"id": "Q7", "topic": "CLI",
     "ruling": "Not required for done. The packaged SDK consumer is required.",
     "compiledInto": ["G10.pkg.clean-consumer-slice", "ENTRYPOINTS (no CLI entrypoint)"]},
    {"id": "Q8a", "topic": "int64 sum overflow",
     "ruling": "Exact total; typed integer-overflow only when the final result is outside int64; intermediate partial sums never wrap.",
     "compiledInto": ["AGGREGATE_RULES", "CS-NUMERIC"]},
    {"id": "Q8b", "topic": "AVG over int64",
     "ruling": "Typed preflight error unless the query converts explicitly; with explicit conversion to binary64, binary64 of the exact sum divided by the count, rounded once.",
     "compiledInto": ["AGGREGATE_RULES", "ERROR_TABLE"]},
    {"id": "Q8c", "topic": "division by zero",
     "ruling": "Typed error; no NaN or Infinity results.",
     "compiledInto": ["NUMERIC_OPS", "ERROR_TABLE"]},
    {"id": "Q8d", "topic": "int64 vs binary64",
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
     "ruling": "The verifier covers every claimed obligation; at scale it independently re-evaluates retained answer bytes, fault outcomes and coverage for every load level and rung, plus at least one spot rerun per profile.",
     "compiledInto": ["VERIFIER_MODES", "VALIDITY VV"]},
    {"id": "Q11", "status": "HELD", "topic": "per-language load",
     "ruling": "Separate XTQL and SQL load acceptance runs, each offering the full Q2 workload in its own language; a mixed-language run is a diagnostic profile that closes nothing.",
     "compiledInto": ["load-contract.json lanes", "DIAGNOSTICS D-LOAD-XTDB-MIXED"]},
    {"id": "Q12", "topic": "conflict semantics",
     "ruling": "Aligned with PLAN C5: repository and fragments fail with ConflictingValuesError; the raw convenience shape is documented as non-equivalent; the canonical conflict-aware relation is values(attribute).",
     "compiledInto": ["G4.neg.conflict-semantics"]},
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
# These tables are the expected-answer authority. Source references justify them; a later change in production
# behavior never changes an expected answer automatically: it needs a new contract version.
NUMERIC_OPS = [
    {"id": "N-I-ADD", "op": "int64 + int64, int64 - int64, int64 * int64", "rule": "exact; a result outside [-2^63, 2^63-1] fails with E-INTEGER-OVERFLOW at execution", "source": "packages/core/src/datalog/compiler.ts:572 (DECIMAL(32,0) then range check)",
     "examples": [["2^62 + 2^62", "E-INTEGER-OVERFLOW"], ["(2^63-1) + 1", "E-INTEGER-OVERFLOW"], ["-2^63 - 1", "E-INTEGER-OVERFLOW"], ["2^32 * 2^31", "E-INTEGER-OVERFLOW"], ["3037000499 * 3037000499", "9223372030926249001"], ["3037000500 * 3037000500", "E-INTEGER-OVERFLOW"], ["(2^59-1) + 1", "576460752303423488"]]},
    {"id": "N-I-DIV", "op": "int64 / int64", "rule": "quotient truncated toward zero; divisor 0 fails with E-DIVISION-BY-ZERO; -2^63 / -1 fails with E-INTEGER-OVERFLOW", "source": "compiler.ts:561-570 (truncated quotient); RULINGS Q8c",
     "examples": [["7 / 2", "3"], ["-7 / 2", "-3"], ["7 / 0", "E-DIVISION-BY-ZERO"], ["-2^63 / -1", "E-INTEGER-OVERFLOW"]]},
    {"id": "N-I-REM", "op": "int64 % int64", "rule": "a - trunc(a/b)*b (sign of the dividend); divisor 0 fails with E-DIVISION-BY-ZERO", "source": "compiler.ts:563-566",
     "examples": [["7 % 3", "1"], ["-7 % 3", "-1"], ["7 % -3", "1"], ["1 % 0", "E-DIVISION-BY-ZERO"]]},
    {"id": "N-I-NEG", "op": "unary minus, ABS on int64", "rule": "exact; -(-2^63) and ABS(-2^63) fail with E-INTEGER-OVERFLOW", "source": "int64 range",
     "examples": [["-(-2^63)", "E-INTEGER-OVERFLOW"], ["ABS(-2^63)", "E-INTEGER-OVERFLOW"], ["ABS(-5)", "5"]]},
    {"id": "N-MIXED", "op": "arithmetic mixing int64 and number", "rule": "preflight E-MIXED-FAMILY unless the query converts one operand explicitly", "source": "compiler.ts:556-560 ('Mixed exact integer and number arithmetic requires an explicit cast')",
     "examples": [["int64 1 + number 1.5", "E-MIXED-FAMILY"], ["toNumber(int64 1) + number 1.5", "2.5"]]},
    {"id": "N-F-ARITH", "op": "number + - * / (binary64)", "rule": "IEEE 754 binary64, round to nearest, ties to even, one rounding per operation; a finite result is returned bit-exact; an infinite result fails with E-NUMBER-OVERFLOW; divisor zero (+0.0 or -0.0) fails with E-DIVISION-BY-ZERO; NaN is never produced or stored", "source": "IEEE 754; RULINGS Q8c (finite domain)",
     "examples": [["0.1 + 0.2", "0.30000000000000004"], ["1.7976931348623157e308 * 2", "E-NUMBER-OVERFLOW"], ["1.0 / 0.0", "E-DIVISION-BY-ZERO"], ["1.0 / -0.0", "E-DIVISION-BY-ZERO"]]},
    {"id": "N-F-NEGZERO", "op": "signed zero", "rule": "IEEE sign rules", "source": "IEEE 754 6.3; acceptance review r1 finding 8",
     "examples": [["-0.0 + 0.0", "+0.0"], ["-0.0 + -0.0", "-0.0"], ["0.0 - 0.0", "+0.0"], ["-0.0 - 0.0", "-0.0"], ["-0.0 * -1.0", "+0.0"], ["-0.0 * 1.0", "-0.0"], ["0.0 * -1.0", "-0.0"], ["-(0.0)", "-0.0"], ["-(-0.0)", "+0.0"], ["stored -0.0 read back", "-0.0 (sign preserved)"]]},
]
CONVERSION_RULES = [
    {"id": "CV-I2F", "rule": "toNumber(int64): round to nearest binary64, ties to even, once", "examples": [["toNumber(2^53+1)", "9007199254740992.0"], ["toNumber(2^63-1)", "9223372036854775808.0"]]},
    {"id": "CV-F2I", "rule": "toInt64(number): only explicit; the value must be integral and inside int64, else E-INVALID-CONVERSION; -0.0 converts to 0", "examples": [["toInt64(3.0)", "3"], ["toInt64(3.5)", "E-INVALID-CONVERSION"], ["toInt64(9223372036854775808.0)", "E-INVALID-CONVERSION"]]},
    {"id": "CV-T2I", "rule": "CAST text to int64: canonical decimal only (optional leading '-', no '+', no leading zeros except '0', no '-0'), inside int64, else E-INVALID-CONVERSION or E-INTEGER-OVERFLOW", "examples": [["'9223372036854775808'", "E-INTEGER-OVERFLOW"], ["'-9223372036854775808'", "-9223372036854775808"], ["'01'", "E-INVALID-CONVERSION"], ["'+1'", "E-INVALID-CONVERSION"]]},
    {"id": "CV-NONE", "rule": "no implicit conversion between families anywhere (filters, joins, group keys, aggregates)", "examples": []},
]
COMPARISON_RULES = [
    {"id": "CMP-SAME", "rule": "same family: exact comparison (int64 as integers, binary64 by IEEE value, text by Unicode codepoint sequence, datetime by instant, boolean false < true, ref by id codepoints)", "source": "exact typing"},
    {"id": "CMP-NUMERIC-CONST", "rule": "an untyped numeric constant compares by numeric value with number and datetime values (number 7 and datetime 7 both equal 7); text '7' is not equal", "source": "testkit 'datalog equality predicates compare numeric values as numbers' (packages/testkit/src/index.ts:721)"},
    {"id": "CMP-INT-FLOAT", "rule": "int64 versus number: equality is false and they never share a group; an ordered comparison across them is preflight E-MIXED-FAMILY unless converted explicitly", "source": "RULINGS Q8d (core silent for stored int64 versus number)"},
    {"id": "CMP-IDENTITY", "rule": "entity ids and ref identities compare only with text or ref constants; a numeric or boolean constant is never equal and != is true", "source": "testkit 'datalog equality keeps identity bindings string-typed'"},
    {"id": "CMP-UNTYPED-STRING", "rule": "an untyped string constant matches string and ref values; a typed ref constant matches only ref values", "source": "testkit 'datalog untyped strings match string and ref values while typed refs stay exact'"},
    {"id": "CMP-BOOL-INT", "rule": "boolean true and int64 1 are distinct values and distinct groups", "source": "packet oracle identity() (event_oracles.py: bool true vs i64 one)"},
    {"id": "CMP-NEGZERO", "rule": "-0.0 = +0.0 is true for comparison and they share one group; the stored value keeps its sign; the group's reported value is the value of its lowest assertion id", "source": "IEEE 754 equality; frozen by this contract"},
]
AGGREGATE_RULES = [
    {"id": "AG-SUM-I", "rule": "SUM over int64: exact total over the solution rows (bag of distinct bindings); E-INTEGER-OVERFLOW only when the final total is outside int64", "source": "RULINGS Q8a; compiler.ts SUM over DECIMAL(32,0)",
     "examples": [["[2^62, 2^62]", "E-INTEGER-OVERFLOW"], ["[2^62, 2^62, -2^62]", "4611686018427387904"], ["[2^58, 2^58, 2^58]", "864691128455135232"]]},
    {"id": "AG-SUM-F", "rule": "SUM over number: the correctly rounded value of the exact sum (one rounding), independent of evaluation order", "source": "frozen by this contract (order independence)",
     "examples": [["[1e16, 1.0, -1e16]", "1.0"]]},
    {"id": "AG-AVG-I", "rule": "AVG over int64 without explicit conversion: preflight E-INTEGER-AVG", "source": "RULINGS Q8b; compiler.ts:1397-1401"},
    {"id": "AG-AVG-CONV", "rule": "AVG(toNumber(int64)) and AVG(number): binary64 of the exact sum divided by the count, rounded once", "source": "RULINGS Q8b"},
    {"id": "AG-COUNT", "rule": "COUNT over a variable counts distinct flattened values of that variable (core), so two entities with value 10 count 1 while SUM counts 20", "source": "testkit 'datalog aggregates preserve duplicate rows and define empty and distinct results'"},
    {"id": "AG-EMPTY-UNGROUPED", "rule": "ungrouped aggregate over no rows returns one row: COUNT 0; SUM, AVG, MIN, MAX null", "source": "same testkit case"},
    {"id": "AG-EMPTY-GROUPED", "rule": "grouped aggregate over no rows returns no rows; an empty group never appears", "source": "wiki/problems/native-correlation.md (grouped empty SUM produces no row)"},
    {"id": "AG-MINMAX-TIES", "rule": "MIN/MAX return the extreme value; a witness query keeps every tied entity", "source": "wiki/problems/native-correlation.md (tied int64-max winners)"},
    {"id": "AG-PACKET-COALESCE", "rule": "packet tasks that state COALESCE(sum, 0) return 0 for an empty input; this is task-specific and recorded in the task recipe", "source": "packet workload 06 empty-currency"},
]
CARD_MANY_ORDER = {
    "source": "RULINGS Q8f",
    "rule": "set semantics: equal values collapse to one element; elements ordered first by type family, then by value",
    "familyOrder": ["boolean", "integer", "number", "datetime", "string", "ref", "json", "blob"],
    "valueOrder": {"boolean": "false < true", "integer": "numeric", "number": "numeric IEEE (-0.0 and +0.0 collapse, CMP-NEGZERO)", "datetime": "instant", "string": "Unicode codepoint sequence", "ref": "codepoint sequence of the target id", "json": "codepoint sequence of the canonical JSON text", "blob": "codepoint sequence of the content id"},
    "note": "Family order is frozen by this contract (the ruling leaves it open).",
}
CONSTRAINT_RULES = [
    {"id": "CN-NEW-OR-WORSENED", "rule": "with enforcement on, a command is rejected only when its post-state creates a new violation or worsens an existing one at some represented valid-time boundary; a pre-existing violation does not block an unrelated command and stays readable", "source": "packages/core/src/Constraint.ts:376 (newlyViolated)"},
    {"id": "CN-CARD-COUNT", "rule": "write-time cardinality counts live assertions, including equal-valued duplicates (unchanged)", "source": "Constraint.ts:193; PLAN C5.1"},
    {"id": "CN-PREEXISTING-CONFLICT", "rule": "a card-one conflict that predates the enforcing write stays a conflict (C5.2) and reads per C5.3", "source": "PLAN C5.2"},
]

# ============================================================================ errors
# Every expected error is pinned here. 'existing' tags exist in the source tree today; 'new' tags are named by
# PLAN v1.1 or by this contract and must be implemented with exactly this tag and reason.
ERROR_TABLE = [
    {"id": "E-INTEGER-OVERFLOW", "tag": "QueryError", "reason": "integer-overflow", "phase": "execution", "status": "existing reason string (compiler.ts:572), tag frozen here"},
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
    {"id": "E-INVALID-VALUE", "tag": "InvalidTripleError", "reason": "invalid-value", "phase": "preflight", "status": "existing class"},
    {"id": "E-UNSUPPORTED-VALUE", "tag": "UnsupportedValueTypeError", "reason": "unsupported-value-type", "phase": "preflight", "status": "existing class"},
    {"id": "E-RESERVED", "tag": "WriteError", "reason": "reserved-namespace", "phase": "preflight", "status": "existing behavior; reason frozen here"},
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
# kind: load | perf | observe | scale | witness | count. 'value' is fixed; calibration may only tighten it
# (direction given by 'bound') or report it unattainable. 'derived' marks values this contract chose because no
# ruling states them; they are listed in ACCEPTANCE section 1 so a reviewer can change them in one place.
THRESHOLDS = {
    # ---- non-load. Performance values are HELD (orchestrator hold 2026-11-07); 'was' records the 0.1.0 value.
    "T-DRAIN-MS": {"kind": "observe", "value": "HELD", "was": "CALIBRATE", "unit": "ms from cancel request to the engine no longer listing the statement", "bound": "max", "source": "0.1.0 G6.cancel.observed-drain drainBoundMs"},
    "T-DEADLINE-GRACE-MS": {"kind": "observe", "value": "HELD", "was": "CALIBRATE", "unit": "ms past timeoutMs for the typed timeout to reach the caller", "bound": "max", "source": "0.1.0 G6.deadline.enforced deadlineGraceMs"},
    "T-PLANNER-MEM-BYTES": {"kind": "observe", "value": "HELD", "was": "CALIBRATE", "unit": "bytes of engine memory during a refused query", "bound": "max", "source": "0.1.0 G3.admission.preconstruction plannerMemoryBytes"},
    "T-AVAIL-WINDOW-MS": {"kind": "observe", "value": "HELD", "was": "CALIBRATE", "unit": "ms until writes and reads succeed after a resource failure", "bound": "max", "source": "0.1.0 G6.resource.memory-failure-contained availabilityWindowMs"},
    "T-CONN-RELEASE-MS": {"kind": "observe", "value": "HELD", "was": None, "unit": "ms after close for the engine-side connection count to return to baseline", "bound": "max", "source": "new in 0.2.0; value supplied by the follow-up"},
    "T-SCALE-P99-REPO-MS": {"kind": "perf", "value": "HELD", "was": "CALIBRATE", "unit": "ms p99, point/entity/repository classes at the rung", "bound": "max", "source": "0.1.0 G3.plan.access-path-at-scale p99LatencyMsPerClass"},
    "T-SCALE-P99-ANALYTIC-MS": {"kind": "perf", "value": "HELD", "was": "CALIBRATE", "unit": "ms p99, recursion topologies at the rung", "bound": "max", "source": "0.1.0 G3.recursion.scalable p99LatencyMsPerTopology"},
    "T-LAT-RATIO-10M-1M": {"kind": "perf", "value": "HELD", "was": "CALIBRATE", "unit": "latency at 10m divided by latency at 1m, key-bounded classes", "bound": "max", "source": "0.1.0 G3.plan.access-path-at-scale latencyRatio10mOver1m"},
    "T-DEEP-PAGE-RATIO": {"kind": "perf", "value": "HELD", "was": "CALIBRATE", "unit": "cost of page 10,000 divided by page 1", "bound": "max", "source": "0.1.0 G10.cursor.stable deepPageCostRatio"},
    "T-FAULT-REPS": {"kind": "count", "value": 3, "was": 3, "unit": "injections per fault point", "bound": "min", "source": "0.1.0 repetitionsPerFaultPoint (structural, not a performance target)"},
    "T-REUSE-AVOIDED": {"kind": "witness", "value": "HELD", "was": None, "unit": "engine work units of a reused read divided by the first read at the same key", "bound": "max", "source": "new in 0.2.0 (positive reuse witness); value supplied by the follow-up"},
    "T-INCR-WORK": {"kind": "witness", "value": "HELD", "was": None, "unit": "engine work for a one-entity change divided by full recomputation work", "bound": "max", "source": "new in 0.2.0 (incremental maintenance witness); value supplied by the follow-up"},
}
HOLD_RULE = "A threshold whose value is HELD cannot be evaluated; every obligation that names it stays OPEN until a later contract version sets the value (orchestrator hold 2026-11-07, lab/NORTH-STAR.md)."
CALIBRATION_RULE = "Calibration may only tighten a threshold (a smaller max, a larger min) or record it UNATTAINABLE with the measurement. It never loosens a value. If a value is unattainable on this VM for every candidate, the orchestrator records the measurement and asks Sam before any lower value is used (RULINGS Q2); the obligation stays OPEN until then."
THRESHOLD_RULE_FOR_KIND = {"load": "CR-LOAD", "perf": "CR-PERF", "observe": "CR-OBSERVE", "scale": "CR-SCALE", "count": None, "witness": "CR-WITNESS"}

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
    "O-TESTKIT": {"status": "EXISTS", "files": ["packages/testkit/src/index.ts"], "comparator": "testkit checks",
                  "spec": "authored expectations inside the 44 shared cases", "independence": "literal expectations; KV is a regression participant only"},
    "O-KV": {"status": "EXISTS", "files": ["packages/core/src/kv/"], "comparator": "differential only",
             "spec": "regression participant", "independence": "NOT independent; never the sole oracle"},
}
COMPARATORS = {
    "CMP-SET-ROWS": "sorted unique canonical rows equal (packet runner semantics: runner.ts:900-912)",
    "CMP-BAG-ROWS": "multisets of canonical rows equal",
    "CMP-ORDERED-ROWS": "sequences of canonical rows equal, order included",
    "CMP-EXACT-VALUE": "typed values equal: int64 as integers, binary64 bit patterns (sign of zero included), text codepoints, datetime instants, json canonical text plus original key order where the case says so",
    "CMP-ERROR": ERROR_COMPARISON,
    "CMP-PAGES": "the page sequence equals the expected sequence: same rows per page, no duplicate or skipped row, same returned basis on every page",
    "CMP-DIAGNOSTICS": "the set of {file, line, column, code} diagnostics equals the expected set exactly",
}

# ============================================================================ entrypoints and profiles
ENTRYPOINTS = {
    "EP-TRIPLES": "Public Triples service (packages/core/src/store/Triples.ts) over the lane Runtime (`.layer({scope, capabilities})`).",
    "EP-REPO": "Entity repository Repository<Model>: at(basis), get, getMany, find({where, include, limit, cursor}), timeline (public core entity subpath; the receipt records the exported symbol and module).",
    "EP-WRITER": "Writer -> WritePlan -> commit(plans, {actor, commandId}).",
    "EP-NATIVE": "The lane's native surface with helper fragments: xtdb-xtql `select`, xtdb-sql `selectSql`, qlever-sparql native SPARQL.",
    "EP-RAW-HATCH": "The qualified raw escape hatch through Triplex (native.xtql``, native.sql``, native.sparql`` with declared contract), text using only names published in the raw-query guide.",
    "EP-RAW-WIRE": "Direct engine protocol with no Triplex code (pgwire; SPARQL 1.1 Protocol), against the documented raw dataset; bare inspection, unqualified during QLever MAINTAINING (C4.5).",
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
    "P-RUNG-1M": "The 1m-entity scale rung (population definition HELD with section S).",
    "P-RUNGS": "Every scale rung in order: 10k, 100k, 1m, 10m (population definition HELD with section S).",
    "P-SCALE-10M": "The 10m-entity target dataset of S.dataset.target-population (definition HELD with section S).",
    "P-LOAD": "load-contract.json levels on the representative 10m dataset (and the sparse smoke level on the sparse dataset).",
}

# ============================================================================ scale population (frozen)
SCALE_POPULATION = {  # HELD DRAFT: not binding until the north-star follow-up
    "status": "HELD DRAFT (not binding): prepared before the orchestrator hold of 2026-11-07; the follow-up decides the population",
    "source": "PLAN v1.1 section 1 items 2-3; qualification/benchmark-contract.json (historicalDepths 1/3/10, topologies, queryFamilies); qualification/capacity/configured-entities-v1/CONTRACT.md; acceptance review r1 finding 13",
    "rungs": [10000, 100000, 1000000, 10000000],
    "scaling": "every count and stratum scales proportionally with the rung; hub in-degree is 1% of the rung's entities; shares are identical at every rung",
    "singleScope": True,
    "writtenThrough": "public writes (EP-WRITER or EP-TRIPLES), every command ACKed with a receipt, no unresolved outcome",
    "profiles": {
        "representative-10": {"activeDomainFactsPerEntity": 10,
                              "facts": "one each of: label (string), score (number), amount (number), exact int64 beyond 2^53, boolean flag, ref (group), category (string, skewed), instant (datetime), date (datetime), legacy integer (int64 inside 2^31)",
                              "atTarget": {"entities": 10000000, "activeDomainFacts": 100000000}},
        "sparse-1": {"activeDomainFactsPerEntity": 1, "facts": "one label (string)", "atTarget": {"entities": 10000000, "activeDomainFacts": 10000000}},
    },
    "historyStrata": [
        {"id": "H1", "share": 0.50, "rule": "depth 1: no correction"},
        {"id": "H3", "share": 0.35, "rule": "depth 3: two corrections on each of two attributes (sparse: on its one attribute)"},
        {"id": "H10", "share": 0.15, "rule": "depth 10: nine corrections on one attribute"},
    ],
    "otherEvents": [
        {"id": "EV-PRESENCE", "rule": "1 entity per 1,000 toggles presence true -> false -> true (configured-entities convention)"},
        {"id": "EV-VALID-FUTURE", "rule": "5% of entities hold a fact whose validTo falls inside the load window"},
        {"id": "EV-VALID-PAST", "rule": "5% of entities hold a fact already closed by valid time"},
        {"id": "EV-SAME-R", "rule": "1 command per 10,000 shares its recorded instant with the next command"},
        {"id": "EV-DECREASING-R", "rule": "1 command per 10,000 is written by a second runtime whose clock is behind (recorded instant lower than the previous position's)"},
        {"id": "EV-NESTED", "rule": "1 command per 10,000 is a nested transaction holding two positions"},
    ],
    "topology": {
        "appliesTo": "representative-10 (through the ref attribute and the group entities)",
        "strata": [
            {"id": "TP-CHAIN", "rule": "1,000 chains of depth 50 (at 10m; proportional below)"},
            {"id": "TP-TREE", "rule": "1,000 trees, fanout 4, depth 6"},
            {"id": "TP-DIAMOND", "rule": "10,000 diamonds"},
            {"id": "TP-CYCLE", "rule": "1,000 cycles of length 3 to 20"},
            {"id": "TP-FANOUT", "rule": "10 hubs, each with incoming refs from 1% of entities"},
            {"id": "TP-SKEW", "rule": "category attribute Zipf s = 1.1 over 1,000 values; boolean flag about 50% true"},
        ],
    },
    "resultCardinality": [
        {"id": "RC-S", "rule": "selective parameters: exactly 1 row"},
        {"id": "RC-M", "rule": "medium: 100 to 1,000 rows"},
        {"id": "RC-L", "rule": "large: at least 100,000 rows (or the family's documented row limit, with E-ROW-LIMIT expected beyond it)"},
    ],
    "separateCounts": ["configured entities", "domain facts", "structural facts", "assertion versions and retirements", "config facts", "journal, claim and receipt metadata", "maintenance relations", "engine rows or triples by physical role", "edges", "presence events", "corrections"],
    "correctness": "S.correctness.query-families runs per rung (10k, 100k, 1m, 10m) and per profile, at least T-SAMPLES-PER-FAMILY samples per family with at least T-SAMPLES-PER-STRATUM in every applicable stratum (history, topology, result cardinality), plus complete-count queries for every population; deterministic sample selection with a recorded seed from the generator spec, never from query answers.",
    "coResidence": "Running the 71-task packet beside the target dataset is diagnostic D-PKT-CORESIDENT only; target-scale query shapes are qualified against the actual target population by S.correctness.query-families.",
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
    "KL-Q1": ("QLever 0.6.0", "integers are 60-bit; int64 values outside +/-2^59 wrap silently", "lab/research/R2-qlever-capabilities.md 4.1 (probed)"),
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


def row(n, op, typ, exact, raw_req, frag_cov, required_by, cells=None, note=None):
    return {"n": n, "op": op, "type": typ, "exactness": exact, "rawRequired": raw_req, "fragmentCoverage": frag_cov,
            "requiredBy": required_by, "cells": cells or {}, "note": note}


# cell override: ("KL", [ids], note) | ("NA", reason) | ("NOTE", note)
MATRIX_ROWS = [
    row(1, "= filter", "text", "exact", True, True, ["R.raw.parity", "R.repo.entity-suite"]),
    row(2, "= filter", "int64 |v| <= 2^53", "exact", True, True, ["R.raw.parity", "G1.types.eight-type-roundtrip"]),
    row(3, "= filter", "int64 2^53 < |v| <= 2^59", "exact", True, True, ["R.raw.parity", "G1.types.storage-widening-safe"],
        {"x_raw": ("NOTE", "documented columns are monomorphic (one declared type), so the union-column rounding of R1 Q3 cannot arise"), "s_raw": ("NOTE", "same")}),
    row(4, "= filter", "int64 2^59 < |v| < 2^63", "exact", True, True, ["R.raw.parity", "G1.types.eight-type-roundtrip"], {"q_raw": ("KL", ["KL-Q1"], "")}),
    row(5, "= filter", "binary64", "exact", True, True, ["R.raw.parity", "G2.arith.binary64"], {"q_raw": ("KL", ["KL-Q3"], "")}),
    row(6, "= across families", "int64 vs binary64", "spec (CMP-INT-FLOAT)", True, True, ["G2.expr.cross-family-comparison"], {"q_raw": ("KL", ["KL-Q4"], "")}),
    row(7, "= filter", "boolean, ref", "exact", True, True, ["R.raw.parity"]),
    row(8, "= filter", "datetime", "exact", True, True, ["R.raw.parity", "G1.types.eight-type-roundtrip"],
        {"x_raw": ("KL", ["KL-X6"], "raw-wire with the node postgres driver only"), "s_raw": ("KL", ["KL-X6"], "raw-wire with the node postgres driver only"), "q_raw": ("KL", ["KL-Q5"], "")}),
    row(9, "range < <= > >=", "text", "exact (codepoint)", True, True, ["G2.strings.codepoint-supported", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q7"], ""), "q_frag": ("NOTE", "order-key fragment (R5, proven under the pinned image, not wired)")}),
    row(10, "range", "int64 all bands", "exact", True, True, ["R.raw.parity", "S.correctness.query-families"], {"q_raw": ("KL", ["KL-Q1"], "beyond +/-2^59")}),
    row(11, "range", "binary64", "exact", True, True, ["R.raw.parity"], {"q_raw": ("KL", ["KL-Q3"], "")}),
    row(12, "range", "datetime", "exact", True, True, ["G9.temporal.half-open-intervals", "R.raw.parity"],
        {"x_raw": ("KL", ["KL-X6"], "raw-wire only"), "s_raw": ("KL", ["KL-X6"], "raw-wire only"), "q_raw": ("KL", ["KL-Q5"], "")}),
    row(13, "ORDER BY", "text", "exact (codepoint)", True, True, ["G2.strings.codepoint-supported", "G10.cursor.stable", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q7"], "")}),
    row(14, "ORDER BY", "int64 and binary64", "exact", True, True, ["R.raw.parity", "G10.cursor.stable"], {"q_raw": ("KL", ["KL-Q1", "KL-Q3"], "beyond the exact ranges")}),
    row(15, "ORDER BY", "datetime", "exact (instant order)", True, True, ["R.raw.parity"],
        {"x_raw": ("KL", ["KL-X6"], "raw-wire only"), "s_raw": ("KL", ["KL-X6"], "raw-wire only"), "q_raw": ("KL", ["KL-Q5"], "")}),
    row(16, "ORDER BY with a total key", "any", "spec (deterministic with a total key)", True, True, ["G10.cursor.stable", "R.raw.parity"], note="raw recipes always add a total tie-break key; without one, order is unspecified in every engine"),
    row(17, "LIMIT/OFFSET page at a fixed cut", "any", "exact", True, True, ["G10.cursor.stable", "R.raw.parity"]),
    row(18, "keyset cursor page", "any", "exact, cost bounded", True, True, ["G10.cursor.stable", "G10.cursor.deep-page-cost"]),
    row(19, "+ - *", "int64", "exact-or-error (N-I-ADD)", True, True, ["G2.arith.int64-overflow", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q2"], ""), "x_raw": ("NOTE", "source: overflow-checked addExact; must be exact-or-error"), "s_raw": ("NOTE", "same")}),
    row(20, "/ and %", "int64, binary64", "spec (N-I-DIV, N-I-REM, N-F-ARITH)", True, True, ["G2.arith.binary64", "G2.arith.int64-overflow", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q14"], "")}),
    row(21, "unary minus, ABS", "int64", "exact-or-error (N-I-NEG)", True, True, ["G2.arith.int64-overflow", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q2"], "")}),
    row(22, "CAST text to int64", "int64", "exact-or-error (CV-T2I)", True, True, ["G2.arith.int64-overflow", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q1"], "")}),
    row(23, "SUM", "int64", "exact-or-error (AG-SUM-I)", True, True, ["G5.agg.exact-overflow", "PKT.full142", "R.raw.parity"],
        {"x_raw": ("KL", ["KL-X1"], ""), "s_raw": ("KL", ["KL-X1"], ""), "q_raw": ("KL", ["KL-Q15"], ""), "x_frag": ("NOTE", "fragment must not use raw SUM over BIGINT"), "s_frag": ("NOTE", "same")}),
    row(24, "SUM, AVG", "binary64", "exact (AG-SUM-F, AG-AVG-CONV)", True, True, ["G2.arith.binary64", "G5.agg.full-support", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q3"], "")}),
    row(25, "COUNT", "any", "spec (AG-COUNT)", True, True, ["G5.agg.full-support", "R.raw.parity"]),
    row(26, "MIN, MAX", "int64, text", "exact", True, True, ["G5.agg.shape-controls", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q1", "KL-Q7"], "")}),
    row(27, "GROUP BY, HAVING", "typed keys", "spec (CMP-*)", True, True, ["G5.agg.typed-groups", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q4"], "numeric keys across families")}),
    row(28, "aggregate over empty input", "grouped and ungrouped", "spec (AG-EMPTY-*)", True, True, ["G5.agg.shape-controls", "R.raw.parity"]),
    row(29, "correlated EXISTS / NOT EXISTS", "any", "spec (O-SHAPE)", True, True, ["G4.neg.correlated-not-exists", "G4.neg.correlated-not-exists-raw", "R.raw.parity"], {"q_raw": ("KL", ["KL-Q8"], "correlation only through an inner FILTER"), "q_frag": ("NOTE", "re-binding helper (R5 C1), verified, not wired")}),
    row(30, "many EXISTS clauses in one group", "any", "spec, bounded planner memory", False, True, ["G3.admission.preconstruction"], {"q_raw": ("KL", ["KL-Q9"], ""), "q_frag": ("KL", ["KL-Q9"], "requires preconstruction admission")}),
    row(31, "MINUS / OPTIONAL + !BOUND / LEFT JOIN", "any", "spec", True, True, ["G4.neg.correlated-not-exists", "R.raw.parity"]),
    row(32, "join on ref, reverse ref", "ref", "exact", True, True, ["R.raw.parity", "G3.plan.access-path-at-scale"]),
    row(33, "UNION / union-all", "any", "spec", False, False, [], {"x_raw": ("KL", ["KL-X3"], ""), "x_frag": ("NA", "not in the coverage set; no obligation needs it")}),
    row(34, "window functions", "any", "spec", False, False, [], {"x_raw": ("NA", "XTQL has no window operator"), "x_frag": ("NA", "XTQL has no window operator"), "s_raw": ("KL", ["KL-X2"], "")}),
    row(35, "recursion / transitive closure (C8 frontier)", "ref", "exact, bounded, read-only", False, True, ["G3.recursion.scalable", "G3.recursion.read-only-frontier", "PKT.full142"], {"x_raw": ("KL", ["KL-X4"], ""), "s_raw": ("KL", ["KL-X4"], "")}),
    row(36, "interval union over valid time", "binary64 endpoints", "exact", False, True, ["PKT.full142", "S.correctness.query-families"]),
    row(37, "engine-native system-time clause as a Triplex basis", "basis", "exact Triplex basis", False, False, [], {"x_raw": ("KL", ["KL-X8"], ""), "s_raw": ("KL", ["KL-X8"], ""), "x_frag": ("NA", "fragments express bases through row 38"), "s_frag": ("NA", "same"), "q_raw": ("NA", "no engine system time"), "q_frag": ("NA", "same")}),
    row(38, "as-of basis recipe (P, R, V)", "basis", "exact", True, True, ["R.raw.parity", "G8.publish.basis-honesty"]),
    row(39, "json value read", "json", "exact (key order kept)", True, True, ["G1.types.eight-type-roundtrip", "R.raw.parity"]),
    row(40, "blob descriptor read", "blob", "exact", True, True, ["G1.types.eight-type-roundtrip", "R.raw.parity"]),
    row(41, "raw write of a typed literal", "all", "n/a", False, False, [], {c: ("NA", "raw writes are not a supported surface: writes go through Triplex (C3 credentials, C7 ownership)") for c in ["x_raw", "s_raw", "q_raw", "x_frag", "s_frag", "q_frag"]}),
    row(42, "language-tagged text compare", "text", "n/a", False, False, [], {c: ("NA", "Triplex text values carry no language tag") for c in COLS}),
    row(43, "domain-pattern query over the default dataset", "any", "exact (only the owning scope's current domain data, C7.2)", True, True, ["G10.scope.ownership-refusal", "R.raw.parity"]),
    row(44, "unrestricted triple-pattern inspection (?s ?p ?o)", "any", "documented (also sees ledger and meta)", False, False, [], {"q_raw": ("KL", ["KL-Q12"], "documented in C7.2"), "x_frag": ("NA", "inspection is raw only"), "s_frag": ("NA", "inspection is raw only"), "q_frag": ("NA", "inspection is raw only")}),
    row(45, "bound native parameter", "binary64 -0.0 and int64 extremes", "exact", False, True, ["G1.types.native-parameters"]),
    row(46, "cancellation and timeout of a running query", "any", "observed drain (OBS-CANCEL)", False, True, ["G6.cancel.observed-drain", "G6.deadline.enforced"], {"q_frag": ("KL", ["KL-Q16"], "requires admission or repair: the qualified surface must still drain within T-DRAIN-MS")}),
    row(47, "values(attribute) conflict-aware relation", "all", "exact (C5.5)", False, True, ["G4.neg.conflict-semantics"]),
]

RAW_PARITY_CLASSES = {
    "RP-POINT": [1, 2, 3, 4, 5, 7, 8, 39, 40], "RP-RANGE": [9, 10, 11, 12], "RP-ORDER-PAGE": [13, 14, 15, 16, 17],
    "RP-ARITH": [19, 20, 21, 22], "RP-CROSS-FAMILY": [6], "RP-JOIN": [32], "RP-ANTIJOIN": [29, 31],
    "RP-AGGREGATE": [23, 24, 25, 26, 27, 28], "RP-BASIS": [38], "RP-DATASET": [43],
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


RECIPE_INT = "compare and filter on the documented exact lexical int64 channel (canonical decimal text) for equality, and on the documented integer order-key channel for ranges and ordering"
rx("qlever-sparql", 4, "int64 values with 2^59 < |v| < 2^63", RECIPE_INT + "; native xsd:integer only inside +/-2^59", "D-Q-INT60", keep="int64 inside +/-2^59 through native xsd:integer")
rx("qlever-sparql", 5, "binary64 values that need more than 49 mantissa bits", "equality on the documented exact lexical binary64 channel (shortest round-trip text)", "D-Q-DBL49", keep="binary64 values exact in 49 mantissa bits")
rx("qlever-sparql", 6, "int64 versus binary64 comparisons", "compare on (documented type-family channel, lexical channel) pairs; different families never equal (CMP-INT-FLOAT)", "D-Q-XFAM", keep="same-family comparisons")
rx("qlever-sparql", 8, "datetimes with a fractional millisecond", "equality on the documented exact epoch-millisecond lexical channel", "D-Q-DT", keep="whole-millisecond UTC datetimes through xsd:dateTime")
rx("qlever-sparql", 9, "all text ranges", "range on the documented text order-key channel (6 hex digits per codepoint, R5 E-S1), bounds encoded with the same function", "D-Q-STR", keep="none: every raw text range uses the key")
rx("qlever-sparql", 10, "int64 ranges reaching beyond +/-2^59", "range on the documented integer order-key channel", "D-Q-INT60", keep="ranges inside +/-2^59")
rx("qlever-sparql", 11, "binary64 ranges over values beyond 49 mantissa bits", "range on the documented binary64 order-key channel", "D-Q-DBL49", keep="ranges over values exact in 49 bits")
rx("qlever-sparql", 12, "datetime ranges with fractional milliseconds", "range on the documented epoch-millisecond order-key channel", "D-Q-DT", keep="whole-millisecond ranges")
rx("qlever-sparql", 13, "all text ordering", "ORDER BY the documented text order-key channel, then the entity order key", "D-Q-STR", keep="none: every raw text ordering uses the key")
rx("qlever-sparql", 14, "numeric ordering over values outside the exact ranges", "ORDER BY the documented numeric order-key channel", "D-Q-INT60", keep="ordering inside the exact ranges")
rx("qlever-sparql", 15, "datetime ordering with fractional milliseconds", "ORDER BY the documented epoch-millisecond order-key channel", "D-Q-DT", keep="whole-millisecond ordering")
rx("qlever-sparql", 19, "int64 + - * with an operand or result beyond +/-2^59", "the supported native fragment for int64 arithmetic (EP-NATIVE), qualified with N-I-ADD", "D-Q-INT60", keep="operands and results inside +/-2^59")
rx("qlever-sparql", 20, "integer division, remainder, and any zero divisor", "the supported native fragment for division (EP-NATIVE), qualified with N-I-DIV, N-I-REM and E-DIVISION-BY-ZERO", "D-Q-DIV", keep="binary64 division with non-zero divisors and results exact in 49 bits")
rx("qlever-sparql", 21, "unary minus and ABS beyond +/-2^59", "the supported native fragment (EP-NATIVE), qualified with N-I-NEG", "D-Q-INT60", keep="inside +/-2^59")
rx("qlever-sparql", 22, "CAST of text outside +/-2^59", "compare the canonical lexical text instead of casting; or the supported native fragment, qualified with CV-T2I", "D-Q-INT60", keep="casts inside +/-2^59")
rx("qlever-sparql", 23, "int64 sums whose exact total or any partial sum leaves +/-2^59", "the documented limb-sum recipe (sums over the documented high and low limb channels, combined by the documented formula, row count within the documented bound) or the supported native SUM fragment, qualified with AG-SUM-I", "D-Q-INT60", keep="sums whose every partial stays inside +/-2^59")
rx("qlever-sparql", 24, "binary64 SUM and AVG", "the supported native SUM/AVG fragment (EP-NATIVE), qualified with AG-SUM-F and AG-AVG-CONV", "D-Q-DBL49", keep="none")
rx("qlever-sparql", 26, "MIN/MAX over text, and over int64 beyond +/-2^59", "MIN/MAX over the documented order-key channel, mapped back through the lexical channel", "D-Q-STR", keep="int64 MIN/MAX inside +/-2^59")
rx("qlever-sparql", 27, "group keys mixing int64 and binary64", "GROUP BY (documented type-family channel, lexical channel)", "D-Q-XFAM", keep="same-family group keys")
rx("qlever-sparql", 29, "NOT EXISTS / EXISTS whose correlated variable occurs only inside an inner FILTER or BIND", "the documented re-binding form (R5 C1: re-emit the correlated fact pattern inside the group, internal variables renamed) or MINUS with definitely bound shared variables (R5 C2)", "D-Q-CORR", keep="correlation through variables the inner group binds")
for lane in X:
    for rn in (8, 12, 15):
        rx(lane, rn, "datetimes with fractional milliseconds read through the node postgres driver", "select CAST(col AS VARCHAR) (text keeps microseconds) or the documented epoch-millisecond numeric column", "D-X-TSWIRE", surface="raw-wire only", keep="the raw hatch (Triplex decodes timestamps as strings) and whole-millisecond values")
    rx(lane, 23, "SUM over BIGINT (any input)",
       "first choice SUM(CAST(x AS DECIMAL(38,0))) (RULINGS Q1); if R.raw.mapped-recipes rejects it (KL-X7 shows a DECIMAL aggregate failing), the documented limb-sum recipe: SUM(x / 2^32) and SUM(x % 2^32) as BIGINT, combined exactly by the documented formula, row count within the documented bound; in XTQL the equivalent aggregate expressions",
       "D-X-SUM")

DIAGNOSTICS = [
    {"id": "D-Q-STR", "lanes": Q, "what": "original raw text order and range counterexamples: tiny collation control `ORDER BY STR(?l) STR(?e)` and its two ranges; string-order-v1 native raw page; the R5 A3 IRI page-sample class", "oracle": ["O-STR", "O-COLL"], "expected": "unchanged codepoint answers"},
    {"id": "D-Q-INT60", "lanes": Q, "what": "write 2^59, 2^63-1 and -2^63 as native xsd:integer and read, compare, order, add and sum them raw", "oracle": ["O-REPLAY"], "expected": "exact int64 values"},
    {"id": "D-Q-DBL49", "lanes": Q, "what": "0.30000000000000004, 1.0000000000000002, 9007199254740993 as decimal through native literals", "oracle": ["O-REPLAY"], "expected": "bit-exact binary64"},
    {"id": "D-Q-XFAM", "lanes": Q, "what": "9007199254740993 = 9007199254740992.0 and grouping of int64 1 with binary64 1.0", "oracle": ["O-REPLAY"], "expected": "false; distinct groups"},
    {"id": "D-Q-DT", "lanes": Q, "what": "datetime 1700000000000.5 ms through native xsd:dateTime", "oracle": ["O-REPLAY"], "expected": "exact fractional instant"},
    {"id": "D-Q-DIV", "lanes": Q, "what": "7/2 on integers and 1/0 raw", "oracle": ["O-REPLAY", "O-ERR"], "expected": "3; E-DIVISION-BY-ZERO"},
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
    "M-INT64-ROUND": {"fault": "int64 passes through binary64", "reachProbe": "codec.int64", "targets": ["CS-TYPES8:int64-edges", "CS-NUMERIC:int64-scalar"]},
    "M-ENTITY-TYPE-SWAP": {"fault": "two EntityType labels swapped in projection or hydration", "reachProbe": "projection.entityType", "targets": ["CS-ENTITY:typed-find"]},
    "M-STALE-PROJECTION": {"fault": "projection one publication behind while the basis reports the latest", "reachProbe": "projection.publication", "targets": ["CS-PUBLISH:coherence", "CS-ELIGIBILITY:C1-MAPPING-GEN"]},
    "M-CUT-OFF-BY-ONE": {"fault": "reads use P-1, or treat recordedAt <= R as < R", "reachProbe": "visibility.cut", "targets": ["CS-TEMPORAL:recorded", "CS-PKT-MULTICALL:writer-between-calls"]},
    "M-NEGZERO": {"fault": "-0.0 normalized to +0.0", "reachProbe": "codec.number", "targets": ["CS-TYPES8:binary64-edges", "CS-PARAMS:negzero"]},
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
cs("CS-TYPES8", "TO-AUTHOR", "ACCEPTANCE 7.1", ["all", "int64-edges", "binary64-edges"])
cs("CS-TYPES8-NEG", "TO-AUTHOR", "ACCEPTANCE 7.1", ["all"])
cs("CS-WIDEN", "TO-AUTHOR", "ACCEPTANCE 7.1", ["all"])
cs("CS-PARAMS", "TO-AUTHOR", "wiki/problems/native-number-parameters.md", ["all", "negzero"])
cs("CS-CONSTRAINTS", "TO-AUTHOR", "testkit graph-constraint cases; configured-eight Required; CONSTRAINT_RULES", ["required", "cardinality", "unique", "reference", "preexisting"])
cs("CS-SCHEMA-RELEASE", "TO-AUTHOR", "configured-eight schema v1 -> v2", ["all"])
cs("CS-NUMERIC", "TO-AUTHOR", "NUMERIC_OPS, CONVERSION_RULES, COMPARISON_RULES, AGGREGATE_RULES examples (every example is a case)", ["int64-scalar", "binary64", "conversion", "cross-family", "groups", "int64-aggregate"])
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
cs("CS-TEMPORAL", "TO-AUTHOR", "handoff README 43-48; review r1 finding 6; PLAN C1 recorded time", ["valid", "boundary", "recorded", "corrections", "decreasing-clock"])
cs("CS-HAM9", "EXISTS", "qualification/capacity/historical-assertion-metadata-v1/reproducers.json", ["raw-lifetime", "snapshot"])
cs("CS-CFG8", "EXISTS", "qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md and qualification/capacity/configured-entities-v1/oracle.mjs", ["retirement-metadata-target", "presence"])
cs("CS-PRESENCE-DELETE", "POLICY-PENDING", "wiki/research/presence-reference-deletion-requirements-v1.md; EXP-P01 policy draft", ["presence", "deletion", "cascade"])
cs("CS-CURSOR", "TO-AUTHOR", "testkit cursor cases; CURSOR_TRANSITIONS", ["stable", "deep-page", "transitions"], [t["id"] for t in CURSOR_TRANSITIONS["mustContinue"]] + [e["id"] for e in CURSOR_TRANSITIONS["permittedErrors"]])
cs("CS-SCOPE", "TO-AUTHOR", "PLAN C7; qlever native-entry scope-isolation", ["all"], ["C7-OWNER-MISMATCH", "C7-OWNER-RECORD-INIT", "C7-SHARED-COLLISION", "C7-DOMAIN-ONLY-CURRENT", "C7-NO-STAGING-DOMAIN", "C7-XTDB-TABLE-NAMES"])
cs("CS-CAPS", "TO-AUTHOR", "capability-matrix.md rows and FRAGMENT_COVERAGE", ["all"])
cs("CS-SLICE", "TO-AUTHOR", "response r1 B5 step 6; PLAN EXP-V01/V02", ["all"])
cs("CS-TYPEWITNESS", "TO-AUTHOR", "R3 artifacts api-sketch.ts and usage.ts; decision D5; ACCEPTANCE 6.5", ["all"])
cs("CS-ENTITY", "TO-AUTHOR", "ACCEPTANCE 7.4", ["all", "valid-boundary", "typed-find", "card-many", "lineage"])
cs("CS-RAW-RECIPES", "TO-AUTHOR", "ACCEPTANCE 7.5 and the raw-query guide", ["all"] + list(RAW_PARITY_CLASSES.keys()))
cs("CS-RAW-MAPPED", "TO-AUTHOR", "RAW_EXCEPTIONS mapped recipes and DIAGNOSTICS", ["all", "diagnostics"], [e["qualifyingCase"] for e in RAW_EXCEPTIONS])
cs("CS-FRAGMENT-EQUIV", "TO-AUTHOR", "R5 5.4 C1-C4; FRAGMENT_COVERAGE", ["all", "coverage"])
cs("CS-SCALE-SAMPLE", "HELD", "used only by the held S obligations (0.1.0 definition)", ["counts", "per-rung", "families", "capacity", "metrics", "maintenance", "restart"])
cs("CS-LOAD", "HELD", "lab/acceptance/load-contract.json (0.1.0-draft, unchanged during the hold)", ["calibration", "256", "512", "1024", "recovery"])

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
        "closure": {"rules": list(closure), "modes": modes or [], "params": params or {}},
        "thresholds": list(thresholds), "mutationControls": list(mutants), "contracts": list(contracts),
        "sources": list(sources), "grounding": grounding, "notes": notes,
    })


# ---------------- Goal 1
O("G1.found.unchanged44", ["G1"], "Unchanged44 on the lane foundation",
  "The unchanged 44-case shared conformance suite (CS-U44) passes against the lane engine's Triples foundation in current and reopened form: 44 named cases per mode, zero skipped.",
  scope="engine", cases=["CS-U44"], oracle=["O-TESTKIT"], ep=["EP-TRIPLES"], modes=CUR_REOPEN,
  sources=["wiki/goals.md:20-23", "lab/research/R4-codebase-harness-map.md 5.3"])
O("G1.types.eight-type-roundtrip", ["G1"], "Eight value types round-trip exactly on every surface",
  "Every case of CS-TYPES8 (one assertion per value family with the listed edge values) reads back bit-exact through Triples, the repository, the lane's native surface with a schema-derived contract, and the documented raw recipe, in current, reopen and engine-restart modes.",
  cases=["CS-TYPES8"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CRR,
  closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), mutants=["M-INT64-ROUND", "M-NEGZERO"],
  sources=["wiki/goals.md:9", "lab/research/R6-xtdb-gap-analysis.md goal 1", "lab/research/R2-qlever-capabilities.md 4.1"])
O("G1.types.invalid-rejected", ["G1"], "Invalid values are rejected atomically",
  "Every case of CS-TYPES8-NEG is rejected with its pinned error (E-INVALID-VALUE or E-UNSUPPORTED-VALUE); the committed position is unchanged, no receipt or claim exists, and no partial row or triple is visible through any access path.",
  scope="engine", cases=["CS-TYPES8-NEG"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"], modes=CUR_REOPEN,
  sources=["lab/research/R4-codebase-harness-map.md 3.6"])
O("G1.types.storage-widening-safe", ["G1"], "Later writes never change an earlier exact read",
  "After the heterogeneous writes of CS-WIDEN, every earlier value still reads back bit-exact on every surface, current and reopen; documented raw columns stay monomorphic.",
  cases=["CS-WIDEN"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  mutants=["M-INT64-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/research/R1-xtdb-capabilities.md Q3", "lab/research/R2-qlever-capabilities.md 4.1", "lab/PLAN.md 3.2 item 4"])
O("G1.types.native-parameters", ["G1"], "Native parameters keep exact values",
  "Parameters of every value family bound into a native query in the lane language (including -0.0, int64 extremes, text with quote, $$ and ;) reach the engine with their exact value and type, current and reopen.",
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
O("G2.arith.int64-overflow", ["G2"], "int64 arithmetic follows the frozen table",
  "On the repository and supported native fragments, every CS-NUMERIC int64 scalar and conversion case returns the NUMERIC_OPS or CONVERSION_RULES answer, including E-INTEGER-OVERFLOW, E-DIVISION-BY-ZERO and E-INVALID-CONVERSION; no result wraps.",
  cases=["CS-NUMERIC:int64-scalar,conversion"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-INT64-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["packages/core/src/datalog/compiler.ts:556-572", "lab/research/R6-xtdb-gap-analysis.md goal 2"])
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
  "At P-SCALE-10M the point, getMany, selective-filter and reverse-ref classes resolve through a key-bounded access path (OBS-PLAN-ACCESS), meet T-SCALE-P99-REPO-MS, and their p50 ratio between P-RUNG-1M and P-SCALE-10M stays within T-LAT-RATIO-10M-1M.",
  cases=["CS-QMIX:point,getMany,selective-filter,reverse-ref"], oracle=["O-REPLAY", "O-PLAN"], ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"],
  profiles=["P-RUNG-1M", "P-SCALE-10M"], closure=("CR-SCALE", "CR-PERF"), thresholds=["T-SCALE-P99-REPO-MS", "T-LAT-RATIO-10M-1M"],
  sources=["lab/research/R1-xtdb-capabilities.md Q7", "lab/reviews/plan-review-r1.codex.md finding 11"], grounding="derived")
O("G3.admission.preconstruction", ["G3"], "Expensive queries are refused before construction",
  "Every CS-ADMIT case fails with E-ADMISSION before the engine builds the expensive structure: zero scratch rows or graphs, engine memory within T-PLANNER-MEM-BYTES (OBS-RESOURCE), and the engine stays available.",
  cases=["CS-ADMIT"], oracle=["O-ERR", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"], profiles=["P-HEAVY"],
  closure=("CR-PASS-ALL", "CR-OBSERVE"), thresholds=["T-PLANNER-MEM-BYTES"], sources=["wiki/goals.md:11", "lab/research/R2-qlever-capabilities.md 3.3"])
O("G3.cost.budget-honored", ["G3"], "Admitted queries stay inside their declared budget",
  "Every admitted CS-QMIX query at P-SCALE-10M records estimate and actual cost (OBS-PLAN-COST); none exceeds its declared budget; a query crossing its budget stops with E-ADMISSION or E-TIMEOUT rather than running to completion.",
  cases=["CS-QMIX"], oracle=["O-PLAN", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"], profiles=["P-SCALE-10M"], closure=("CR-PASS-ALL", "CR-OBSERVE"),
  sources=["wiki/goals.md:11"], grounding="derived")
O("G3.recursion.scalable", ["G3"], "Recursion is correct and bounded on every topology",
  "Recursive reads over every benchmark-contract topology (chain, tree, diamond, cycle, high-fanout, skewed-hotset) return O-REPLAY answers in the lane language and meet T-SCALE-P99-ANALYTIC-MS at P-RUNG-1M and P-SCALE-10M.",
  cases=["CS-RECURSION-TOPO"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-RUNG-1M", "P-SCALE-10M"],
  closure=("CR-PASS-ALL", "CR-PERF"), thresholds=["T-SCALE-P99-ANALYTIC-MS"], sources=["qualification/benchmark-contract.json topologies"])
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
  "Every C5-* case of CS-CONFLICT: Equal-valued duplicates are not conflicts (one value, several supports); a conflict is two or more distinct live values of a cardinality-one attribute at the basis; get and getMany fail with E-CONFLICTING-VALUES listing every conflicted entity and attribute; find, counts, ordering, includes and negation fail with it when a referenced attribute is conflicted for any candidate, and are unaffected by unreferenced attributes; the values(attribute) relation lists every live value with its supports; the raw convenience shape returns its documented indicator and never certifies equivalence.",
  cases=["CS-CONFLICT"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CUR_REOPEN,
  mutants=["M-CONFLICT-PICK", "M-EQ-DUP-CONFLICT", "M-DROPPED-SUPPORT"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), contracts=["C5"],
  sources=["lab/PLAN.md C5", "RULINGS Q8e", "RULINGS Q12"])

# ---------------- Goal 5
O("G5.agg.shape-controls", ["G5"], "Aggregate edge shapes keep their specified answers",
  "AG-EMPTY-UNGROUPED, AG-EMPTY-GROUPED, AG-MINMAX-TIES and AG-PACKET-COALESCE cases of CS-SHAPE return the O-SHAPE answers on the repository and supported native fragments.",
  cases=["CS-SHAPE:aggregate"], oracle=["O-SHAPE", "O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN, closure=("CR-COUNTEREXAMPLE",),
  sources=["wiki/problems/native-correlation.md", "packages/testkit/src/index.ts:1218"])
O("G5.agg.full-support", ["G5"], "Aggregates follow the frozen support semantics",
  "Every CS-SUPPORT case returns the AG-SUM-I, AG-SUM-F and AG-COUNT answers (SUM over the bag of distinct solution rows, COUNT over distinct values) on the repository and supported native fragments.",
  cases=["CS-SUPPORT"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-DROPPED-SUPPORT", "M-IDENTITY-COLLAPSE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["packages/testkit/src/index.ts:1218"])
O("G5.agg.typed-groups", ["G5"], "Group keys keep typed identity",
  "Every CS-NUMERIC groups case groups by the COMPARISON_RULES identities on the repository and supported native fragments.",
  cases=["CS-NUMERIC:groups"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN, sources=["testkit 'datalog having preserves typed group and aggregate equality'"])
O("G5.agg.exact-overflow", ["G5"], "Aggregate overflow and AVG follow the frozen rules",
  "Every CS-NUMERIC int64-aggregate case returns the AG-SUM-I, AG-AVG-I and AG-AVG-CONV answer: exact totals, E-INTEGER-OVERFLOW only for a final total outside int64, E-INTEGER-AVG for unconverted int64 AVG.",
  cases=["CS-NUMERIC:int64-aggregate"], oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], modes=CUR_REOPEN,
  mutants=["M-INT64-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["RULINGS Q8a", "RULINGS Q8b"])

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
  "Every C6-* case: direct match and Datalog queries over :_tx/change and :_tx/changed-entity, transactions(), transactionsForEntity and transactionByCommand return O-REPLAY's outputs, order and -0 behavior; a physically slimmed journal synthesizes byte-identical results.",
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
  "Valid intervals are [validFrom, validTo) with null open-ended, exact at fractional-millisecond boundaries and at the boundary instants, on every surface, current, reopen and engine restart.",
  cases=["CS-TEMPORAL:valid,boundary"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], modes=CRR,
  mutants=["M-HALF-OPEN"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["handoffs/claude-native/README.md:46-48"])
O("G9.temporal.recorded-cuts", ["G9"], "Recorded-time and position cuts are exact, independently",
  "Reads by recordedAt and by position equal O-REPLAY, with R evaluated independently of P: between commits, at an instant shared by two commits, with decreasing recorded instants from a second runtime, at interior positions of nested transactions, after corrections and around aborts; ordinary reads take R and V only.",
  cases=["CS-TEMPORAL:recorded,decreasing-clock"], oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"], profiles=["P-TINY-CONC"], modes=CRR,
  mutants=["M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/PLAN.md C1 recorded time", "lab/reviews/acceptance-review-r1.codex.md finding 7"])
O("G9.history.raw-lifetime-compat", ["G9"], "Ordinary history keeps the raw lifetime contract",
  "Ordinary Triples.history, match, entity and entities keep the raw assertion-lifetime contract exactly as O-REPLAY computes it.",
  scope="engine", cases=["CS-HAM9:raw-lifetime"], oracle=["O-REPLAY", "O-HAM"], ep=["EP-TRIPLES"], modes=CUR_REOPEN,
  mutants=["M-MASK-RAW"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), sources=["handoffs/claude-native/README.md:46-48"])
O("G9.history.snapshot-metadata", ["G9"], "As-of snapshots hide retirements not yet known",
  "The five failing tiny-v4 checks, the finite-nine fixture and the same-R control pass through the repository timeline and as-of reads and the native history helpers: retirement fields are null until known at the cut and equal O-REPLAY after.",
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
  "CS-CURSOR stable cases: pages are deterministic, traverse the complete snapshot with no duplicate or skipped row under concurrent writes, and a cursor issued at P1 continues at P1 after the publication advances.",
  cases=["CS-CURSOR:stable"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-TRIPLES"], profiles=["P-TINY-CONC"], modes=CUR_REOPEN,
  sources=["testkit cursor cases"])
O("G10.cursor.deep-page-cost", ["G10"], "Deep pages stay cheap at 10m",
  "At P-SCALE-10M page 10,000 costs at most T-DEEP-PAGE-RATIO of page 1.",
  cases=["CS-CURSOR:deep-page"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profiles=["P-SCALE-10M"], closure=("CR-PASS-ALL", "CR-PERF"),
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
  "Every case of CS-ENTITY passes through the repository and writer, current, reopen and engine restart; expected answers only from O-REPLAY.",
  cases=["CS-ENTITY"], oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER"], modes=CRR, closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  mutants=["M-ENTITY-TYPE-SWAP", "M-CARD-MANY-DROP"], sources=["lab/PLAN.md section 1", "lab/reviews/plan-review-r1.codex.md finding 5"])
O("R.repo.mutation-controls", ["R"], "The suites kill every mutant",
  "Every mutation control meets MUTANT_RULE against its targeted cases on the lane.",
  cases=["CS-ENTITY", "CS-TEMPORAL", "CS-HAM9", "CS-CONFLICT", "CS-SUPPORT", "CS-SUPPORT-DAG", "CS-PUBLISH", "CS-ELIGIBILITY", "CS-FAULT", "CS-MAINT", "CS-REUSE", "CS-SCOPE", "CS-STR", "CS-SHAPE", "CS-TYPES8", "CS-NUMERIC", "CS-PARAMS", "CS-WRITE", "CS-JOURNAL", "CS-CFG8", "CS-PKT-MULTICALL"],
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

# ---------------- S and L: HELD
# Orchestrator hold (2026-11-07): Sam is re-tuning performance targets (lab/NORTH-STAR.md). The S and L
# obligations, plus G8.support.maintenance-cost (which counts toward S), are carried verbatim from contract
# 0.1.0-draft in held/s-l-obligations-0.1.0.json and are not edited until the follow-up arrives.
HELD_FILE = "lab/acceptance/held/s-l-obligations-0.1.0.json"
HELD_FILE_SHA256 = "03978e120ed7b739bfe93fc2def2ad58ed47e992a383fc812eeabfdf129979b2"
LOAD_CONTRACT_SHA256_0_1 = "a909d9057c63e572ddeea53b81f78c28bf1287d5b834563cdce181a813cad708"
HELD = json.loads((REPO / HELD_FILE).read_text())["obligations"]
HELD_IDS = {o["id"] for o in HELD}

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
    "format": "triplex-db-2/receipt/1",
    "fields": {
        "receiptId": "string, unique",
        "runKind": "acceptance | calibration | mutation | verifier | diagnostic",
        "contract": "{version, transitiveSha256}",
        "obligations": "[{id, definitionSha256}]",
        "lane": "lane id, or engine id for engine-scope receipts",
        "profileIdentity": "{sourceTreeSha256 (including uncommitted and untracked executed inputs), buildManifestSha256, importedDist [{path, sha256}], lockfileSha256, node, pnpm, engineImageDigest, engineConfigSha256, resourceCaps, enabledCapabilities [], fixtureSha256, gateScriptSha256, oracleFiles [{id, sha256}], caseManifests [{set, sha256}], projectionSpecVersion, logFormatVersion}",
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
    "load-run": "{level, lane, rawEventsObject, windows [{from, to}], maintenanceEvents [], connectionSamplesObject}",
    "scale-dataset": "{rung, profile, generatorSpecSha256, seed, populationCounts {stratum: count}, countQueryCaseResults []}",
    "static-witness": "{witnessFile, expectedDiagnostics [], observedDiagnostics [{file, line, column, code}], anyScanObject}",
    "provenance-manifest": "{authorId, inputs [{path, sha256}], outputs [{caseId, sha256}]}",
    "calibration-record": "{procedure, controlProfileIdentity, values [{thresholdId, value | UNATTAINABLE, measurementObject}], ladderObjects []}",
    "mutation-record": "{mutantId, patchSha256, patchedFiles [], reachProbeHits {probe: count}, killingAssertions [{caseId, assertionId, comparator, expectedObject, observedObject}]}",
    "verifier-record": "{verifiesReceiptIds [], mode, recomputedVerdictsObject, spotRerunReceiptIds [], mismatches []}",
    "budget-record": "{rung, component: cost, a0ControlReceiptId}",
}
SELECTOR_SEMANTICS = "An obligation's cases are a list of {set, select}. select is a list of tags; 'all' selects every case of the set. The evaluator resolves the selection against the set's pinned manifest (lab/acceptance/cases/<set>.json, sha256 pinned in the contract version): the selected cases are those carrying any listed tag. The resolution must be non-empty, every listed tag must be in the set's requiredTags, and every requiredCases id must exist in the manifest. A set whose manifest is not pinned in the contract version cannot close any obligation. Declared executions = selected cases x modes (x 1 per receipt scope key)."
VALIDITY = {
    "VC": {"for": "calibration evidence", "dependsOn": [], "rules": [
        "VC1 runKind = calibration; create-only; its timestamp precedes every acceptance receipt that cites it",
        "VC2 binds the control profile identity and the load-contract or threshold registry hash",
        "VC3 every value is the registry value or tighter, or UNATTAINABLE with its retained measurement",
        "VC4 every ladder step's raw objects are retained",
        "VC5 preconditions that are acceptance obligations (for load: S.dataset.target-population for the engine) are evaluated by the VA rules on the control profile; they never depend on VC records"]},
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
        "VA13 named DIAGNOSTICS executed and retained"]},
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
    "re-evaluate-and-spot": "The verifier independently re-evaluates every retained answer byte, fault outcome and coverage record for every load level, rung and run, and performs at least one spot rerun per profile unit (one per lane and load level; one per lane, rung and population profile).",
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
    "CR-METRICS": {"evidence": ["observation"], "validity": ["VA"], "recompute": "metric values from retained samples", "holds": "every listed metric present and measured"},
    "CR-LOAD": {"evidence": ["load-run"], "validity": ["VA", "VC"], "recompute": "every invariant and bound of the named load level from retained raw events", "holds": "all invariants and bounds met in each required run"},
    "CR-CALIBRATION": {"evidence": ["calibration-record"], "validity": ["VC"], "recompute": "VC3 check of each value against the registry", "holds": "a VC-valid record exists for every L-* threshold of the lane"},
    "CR-MATRIX": {"evidence": ["case-result"], "validity": ["VA"], "recompute": "matrix cells from obligations.json capabilityMatrix and the cited receipts", "holds": "every required cell EXACT with a receipt; every raw-required KNOWN-LIMIT cell has its exception record and guide entry"},
    "CR-PROVENANCE": {"evidence": ["provenance-manifest"], "validity": ["VA"], "recompute": "manifest inputs compared with the guide and docs hashes", "holds": "inputs are only the raw-query guide and engine public docs; the author is a fresh agent"},
    "CR-WITNESS": {"evidence": ["observation", "case-result"], "validity": ["VA"], "recompute": "OBS-WORK work-unit ratios from retained engine-side counters", "holds": "every named witness threshold met and answers equal the no-reuse or fresh-recompute run"},
    "CR-BUDGET": {"evidence": ["budget-record", "observation"], "validity": ["VA"], "recompute": "complete-path cost from retained measurements against budgets.json (HELD)", "holds": "within hard caps and A0-relative allowances at every rung; not evaluable during the hold"},
}
APPLICABILITY = {
    "source": "lab/PLAN.md section 1 item 7; acceptance review r1 finding 12",
    "boundIdentities": ["imported source files", "imported dist files", "engine image digest", "engine configuration", "resource caps", "fixture contents", "enabled capabilities", "gate script versions", "oracle file versions", "case manifests", "acceptance-rule version (contract transitive hash and obligation definition hash)"],
    "carryForward": "A receipt carries forward to a later profile only when every bound identity is unchanged, checked by an explicit applicability record (AP) that recomputes each identity on the later profile. Carry-forward serves intermediate tracking only.",
    "finalAcceptance": "The final acceptance of the selected integrated profile is entirely fresh: every obligation, including scale rungs and load levels, runs on that profile; nothing carries into it.",
}
STATUS_ALGORITHM = [
    "for each lane L and integrated profile T:",
    "  for each obligation O with L in O.lanes:",
    "    key = L if O.receiptScope == 'lane' else engineOfLane[L]",
    "    A = acceptance receipts for (O.id, key) on T that pass VA (using VC records they cite)",
    "    closed(O, L, T) = O.grounding != 'policy-pending' and every case set of O is pinned",
    "                      and no threshold of O is HELD",
    "                      and A non-empty and every rule in O.closure.rules holds by its recompute",
    "                      and VV-valid verifier coverage exists per VERIFIER_MODES[verifierMode(O)]",
    "  closed(section, L, T) = all closed(O, L, T) for O with section in O.goals",
    "  sections S and L: closed only when their HELD obligations are replaced by a later contract version",
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
# Budget allowances, budgets.json, the load contract and the scale population are HELD (orchestrator hold 2026-11-07).


# ============================================================================ checks
BANNED_TEXT = [
    (r"open question", "obsolete open-question language"),
    (r"REPORT\.md", "references to REPORT.md questions"),
    (r"EP-CLI", "CLI entrypoint (RULINGS Q7)"),
    (r"CLI inspects", "CLI requirement (RULINGS Q7)"),
    (r"non-decreasing", "false clock model (review finding 7)"),
    (r"preserved through \+ 0\.0", "wrong signed-zero rule (review finding 8)"),
    (r"proposedFloor|proposedCeiling", "unsourced proposed floors (RULINGS Q2 adopted them)"),
    (r"hardFloor\"?: 16\b", "rate16 floor (RULINGS Q2)"),
    (r"\u2014", "em-dash"),
]


def ruling_checks():
    e = []
    obl = {o["id"]: o for o in OBL}
    # Q1
    raw_req_kl = {(r["n"], c) for r in MATRIX_ROWS for c, v in r["cells"].items() if COL_SURFACE[c] == "raw" and v[0] == "KL" and r["rawRequired"]}
    lanecol = {"xtdb-xtql": "x_raw", "xtdb-sql": "s_raw", "qlever-sparql": "q_raw"}
    exc = {(x["row"], lanecol[x["lane"]]) for x in RAW_EXCEPTIONS}
    if raw_req_kl != exc:
        e.append(f"Q1: raw-required KL cells and exceptions differ: missing {sorted(raw_req_kl - exc)} extra {sorted(exc - raw_req_kl)}")
    for x in RAW_EXCEPTIONS:
        if not (x["mappedRecipe"] and x["qualifiedBy"] in obl and x["diagnostic"] in {d["id"] for d in DIAGNOSTICS}):
            e.append(f"Q1: exception {x['id']} incomplete")
        if x["lane"] in X and x["row"] in (19, 21, 22):
            e.append(f"Q1: XTDB arithmetic must not be exempted ({x['id']})")
    for r in MATRIX_ROWS:
        if r["fragmentCoverage"]:
            for c in ("x_frag", "s_frag", "q_frag"):
                if r["cells"].get(c, ("",))[0] == "NA":
                    e.append(f"Q1: coverage row {r['n']} has N/A fragment cell {c}")
    if "G4.neg.correlated-not-exists-raw" in obl and "qlever-sparql" in obl["G4.neg.correlated-not-exists-raw"]["lanes"]:
        e.append("Q1: QLever raw correlated negation must be an exception, not an obligation")
    # Q2, Q4, Q11: HELD. load-contract.json and the S/L obligations stay byte-identical to 0.1.0.
    for q in ("Q2", "Q4", "Q11"):
        if next(r for r in RULINGS if r["id"] == q).get("status") != "HELD":
            e.append(f"{q}: must be HELD during the hold")
    if sha_file("lab/acceptance/load-contract.json") != LOAD_CONTRACT_SHA256_0_1:
        e.append("HOLD: load-contract.json changed")
    if sha_file(HELD_FILE) != HELD_FILE_SHA256:
        e.append("HOLD: held S/L obligations changed")
    if any(set(o["goals"]) & {"S", "L"} for o in OBL):
        e.append("HOLD: an active obligation counts toward S or L")
    if any(isinstance(v["value"], (int, float)) for k, v in THRESHOLDS.items() if v["kind"] in ("perf", "observe", "witness")):
        e.append("HOLD: a performance threshold has a value")
    # Q3
    if not any(h["id"] == "HS-NORMALIZE" and "reads no data" in h["rule"] and "counted inside" in h["rule"] for h in LANGUAGE_RULES["permittedHostSteps"]):
        e.append("Q3: host step rule")
    # Q5
    if obl["R.raw.guide-only-authoring"]["grounding"] != "grounded" or "fresh agent" not in obl["R.raw.guide-only-authoring"]["statement"]:
        e.append("Q5")
    # Q6
    if obl["G9.lineage.supporting-assertions"]["grounding"] != "grounded" or "assertion ids and transactions" not in obl["G9.lineage.supporting-assertions"]["statement"]:
        e.append("Q6")
    # Q7
    if "EP-CLI" in ENTRYPOINTS or any("CLI" in o["statement"] for o in OBL):
        e.append("Q7: CLI must not be required")
    # Q8
    if not any(a["id"] == "AG-SUM-I" and "final total" in a["rule"] for a in AGGREGATE_RULES):
        e.append("Q8a")
    if not any(a["id"] == "AG-AVG-I" and "preflight" in a["rule"] for a in AGGREGATE_RULES):
        e.append("Q8b")
    if not any(n["id"] == "N-F-ARITH" and "E-DIVISION-BY-ZERO" in n["rule"] for n in NUMERIC_OPS):
        e.append("Q8c")
    if not any(c["id"] == "CMP-INT-FLOAT" and "never share a group" in c["rule"] for c in COMPARISON_RULES):
        e.append("Q8d")
    if "Equal-valued duplicates are not conflicts" not in obl["G4.neg.conflict-semantics"]["statement"] or "C5-EQ-DUP" not in CS["CS-CONFLICT"]["requiredCases"]:
        e.append("Q8e")
    if "duplicates" not in CARD_MANY_ORDER["rule"] and "collapse" not in CARD_MANY_ORDER["rule"]:
        e.append("Q8f")
    nz = dict(next(n for n in NUMERIC_OPS if n["id"] == "N-F-NEGZERO")["examples"])
    if nz.get("-0.0 + 0.0") != "+0.0" or nz.get("-0.0 * -1.0") != "+0.0":
        e.append("Q8: signed zero examples (review finding 8)")
    # Q9
    for oid in ("G9.presence.explicit", "G9.deletion.entity", "G9.cascade.restrict-detach-cascade"):
        if obl[oid]["grounding"] != "policy-pending":
            e.append(f"Q9: {oid}")
    # Q10
    if "every load level, rung and run" not in VERIFIER_MODES["re-evaluate-and-spot"] or "per profile unit" not in VERIFIER_MODES["re-evaluate-and-spot"]:
        e.append("Q10")
    # Q12
    st = obl["G4.neg.conflict-semantics"]["statement"]
    if not ("E-CONFLICTING-VALUES" in st and "values(attribute)" in st and "never certifies" in st):
        e.append("Q12")
    return e


def verifier_mode(o):
    return "re-evaluate-and-spot" if set(o["profiles"]) & {"P-SCALE-10M", "P-LOAD", "P-RUNGS"} else "rerun"


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
                if tag != "all" and tag not in CS[c["set"]]["requiredTags"]:
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
            if need and need not in o["closure"]["rules"]:
                e.append(f"{oid}: threshold {t} ({THRESHOLDS[t]['kind']}) needs {need}")
        if "CR-PERF" in o["closure"]["rules"] and not any(THRESHOLDS.get(t, {}).get("kind") == "perf" for t in o["thresholds"]):
            e.append(f"{oid}: CR-PERF without a perf threshold")
        if "CR-WITNESS" in o["closure"]["rules"] and not any(THRESHOLDS.get(t, {}).get("kind") == "witness" for t in o["thresholds"]):
            e.append(f"{oid}: CR-WITNESS without a witness threshold")
        if "CR-FAULT" in o["closure"]["rules"] and "T-FAULT-REPS" not in o["thresholds"]:
            e.append(f"{oid}: CR-FAULT without T-FAULT-REPS")
        if "CR-FAULT" in o["closure"]["rules"] and "P-FAULT" not in o["profiles"]:
            e.append(f"{oid}: CR-FAULT needs P-FAULT")
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
        if re.search(r"\b10m\b|10,000,000", st) and not set(o["profiles"]) & {"P-SCALE-10M", "P-RUNGS", "P-LOAD"}:
            e.append(f"{oid}: statement is about 10m but profile is not")
        if re.search(r"concurrent|race|between calls|writer committed", st) and not set(o["profiles"]) & {"P-TINY-CONC", "P-FAULT", "P-LOAD", "P-RUNGS", "P-SCALE-10M", "P-RUNG-1M"} and o["id"] != "G6.ownership.bounded-connections":
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
            if not any(g in o["goals"] and lane in o["lanes"] for o in OBL + HELD):
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
            if not any(t["case"] == rc for t in TRACE) and not rc.startswith("X-"):
                e.append(f"{cid}: required case {rc} not traced")
    # mutants
    for m, d in MUTANTS.items():
        if not any(m in o["mutationControls"] for o in OBL if o["id"] != "R.repo.mutation-controls"):
            e.append(f"mutant {m} attached only to the catalog obligation")
        for tgt in d["targets"]:
            s, tag = tgt.split(":")
            if s not in CS or (tag not in CS[s]["requiredTags"] and tag not in CS[s]["requiredCases"]):
                e.append(f"mutant {m}: target {tgt} unresolvable")
    for req in ("M-HALF-OPEN", "M-DROPPED-SUPPORT", "M-FUTURE-RETIREMENT", "M-INT64-ROUND", "M-ENTITY-TYPE-SWAP", "M-STALE-PROJECTION"):
        if req not in MUTANTS:
            e.append(f"required mutant {req} missing")
    # thresholds referenced
    used = {t for o in OBL for t in o["thresholds"]}
    for t, d in THRESHOLDS.items():
        if t not in used:
            e.append(f"threshold {t} unused")
        if d["value"] in (None, "CALIBRATE"):
            e.append(f"threshold {t} has no value (use a number or HELD)")
        if d["value"] == "HELD" and d["kind"] == "count":
            e.append(f"threshold {t}: structural counts are not held")
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
            if ob not in obl and ob not in HELD_IDS:
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


CHANGELOG = [
    ("1", "Rulings and obligations disagreed (CLI, equal duplicates)", "Every ruling compiled into build_contract.py with a generator check per ruling (section 3); obligations.json is the only authority; the CLI entrypoint removed; G4.neg.conflict-semantics follows C5 (equal duplicates are one value); banned-text check removes obsolete wording."),
    ("2", "Q1 exempted whole rows", "Per-cell RAW_EXCEPTIONS (28 cells) each with mapped recipe, guide entry, qualifying obligation R.raw.mapped-recipes and case, and diagnostic; XTDB scalar arithmetic stays required; fixed fragment coverage set."),
    ("3", "Load JSON allowed the rate16 outcome", "HELD. Orchestrator hold 2026-11-07: load-contract.json, the S and L obligations, the Q2 load bar and every performance threshold stay unchanged until the north-star follow-up (lab/NORTH-STAR.md). The generator verifies load-contract.json is byte-identical to 0.1.0."),
    ("4", "Q11 halved per-language demand", "HELD with finding 3."),
    ("5", "Recovery could lose a committed unACKed command", "COMMIT_OUTCOMES binds expected outcomes to witnessed transitions; QT2-LOGGED groups must publish; retries before publication return CommitPending or Repairing; success only after publication (G7.commit.protocol-transitions, mutant M-EARLY-ACK)."),
    ("6", "C1-C7 lacked discriminating cases", "C1-C8 traceability table (section 9) with named cases mapped to new obligations G8.eligibility.c1-routing, G7.commit.protocol-transitions, G7.broker.fence-and-epochs, G8.maintenance.bounded-boundaries, G7.journal.logical-contract, G10.scope.ownership-refusal, G10.scope.shared-collision, G3.recursion.read-only-frontier."),
    ("7", "O-REPLAY clock model and outcome authority", "Spec rewritten (6.1): no monotonic-clock assumption, decreasing-clock histories, R independent of P, nested position accounting, outcomes derived from command intent and durable-decision evidence, receipts compared afterwards."),
    ("8", "Wrong or unspecified expected answers", "Frozen tables (section 4): numeric operations with correct signed-zero rules, conversions, comparisons, aggregates (Q8a, Q8b preflight AVG), card-many order, constraint enforcement new-or-worsened only, every error pinned."),
    ("9", "Oracle specs did not cover their claims", "Separate normative protocols: O-OBS (OBS-*), O-PLAN (route, access path, cost), O-SHAPE (bag/set, grouping, unbound handling), O-SPEC (exact types, no accidental any, pinned diagnostics), O-ERR compiled from ERROR_TABLE."),
    ("10", "Machine contract mostly prose; contradictions", "Typed receipt and evidence schemas, selector semantics, threshold registry with closure-rule dependencies, structured closure rules that recompute from retained evidence; G10.cursor.stable split (deep-page cost at 10m is its own obligation), G7.write.atomic selects CS-WRITE and CS-FAULT, every threshold tied to its rule (values HELD where they are performance targets); scale sample counts HELD with finding 3."),
    ("11", "Auxiliary evidence had no validity path", "Validity classes VC, VA, VM, VV with an acyclic dependency check; L.calibration.frozen closes through CR-CALIBRATION; MUTANT_RULE requires reach and an identified semantic assertion failure."),
    ("12", "Carry-forward reopened the final-acceptance loophole", "APPLICABILITY restores PLAN 1.7: all bound identities, explicit applicability record, final acceptance entirely fresh including scale and load; verifier mode per obligation."),
    ("13", "Population counts could pass with trivial history", "HELD with finding 3 (S obligations unchanged). A non-binding draft population (history strata 1/3/10, topology and skew, same-R, decreasing-R and nested events, result-cardinality strata) is kept as heldDrafts.scalePopulation for the follow-up."),
    ("14", "Goal 8 could be green without reuse; no budgets", "Structural part done: G8.reuse.positive-witness and G8.support.incremental-witness with OBS-WORK witnesses (threshold values HELD). budgets.json and its allowances are HELD with finding 3."),
    ("15", "Typed errors could replace historical functionality", "CURSOR_TRANSITIONS enumerates twelve transitions that must continue and five narrow permitted errors (G10.cursor.continuation-transitions)."),
    ("16", "C8 recursion counted as hybrid", "FRONTIER_RULES define permitted host frontier control (HS-FRONTIER), fixed cut, bounds, cost and no mutation; such tasks count as pure."),
]


def render_acceptance(doc, cells, counts):
    L = []
    A = L.append
    A("# triplex-db-2 acceptance contract\n")
    A(f"Version {VERSION}, {DATE}. Status: {STATUS}.\n")
    A("**Generated by `python3 -I lab/acceptance/build_contract.py`. Do not edit this file.** `obligations.json` is the only authority an evaluator reads; this file renders it for people. Where any text here and `obligations.json` differ, `obligations.json` wins.\n")
    A(f"Transitive contract hash: `{doc['transitiveContractSha256']}`.\n")
    A("## 0. Change log\n")
    A("### 0.2.0 (this version): response to `lab/reviews/acceptance-review-r1.codex.md` and `lab/acceptance/RULINGS.md`\n")
    A(md_table(["Review finding", "Problem", "Change"], CHANGELOG))
    A("\n### 0.1.0-draft\n\nFirst draft (88 obligations). Superseded.\n")
    A("## 1. How to read this contract\n")
    A("- **One obligation is one binary fact.** It has an id, a statement, lanes, case selections, oracles, entrypoints, profiles, a closure (rules, modes, thresholds), mutation controls, the PLAN contracts it traces, sources, a grounding label and a verifier mode.")
    A("- **Every status is OPEN.** No acceptance receipt exists for any obligation.")
    A("- **Hold (orchestrator, 2026-11-07).** Sam is re-tuning performance targets (`lab/NORTH-STAR.md`). Until the follow-up: `load-contract.json` is byte-identical to 0.1.0; every S and L obligation and `G8.support.maintenance-cost` are carried verbatim from 0.1.0 (`heldObligations`); rulings Q2, Q4 and Q11 are not compiled; every performance threshold has value HELD; `budgets.json` is not written; the scale population is a non-binding draft. " + HOLD_RULE)
    A("- **Artifacts.** `obligations.json` (authority, generated), `capability-matrix.md` (generated), this file (generated), `load-contract.json` (0.1.0, held), `held/s-l-obligations-0.1.0.json` (held input).\n")
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
    A(md_table(["Ruling", "Topic", "Compiled ruling", "Compiled into", "Check"], [[r["id"], r["topic"], ("HELD, not compiled in 0.2.0: " if r.get("status") == "HELD" else "") + r["ruling"], ", ".join(r["compiledInto"]) if r.get("status") != "HELD" else "held (orchestrator hold 2026-11-07)", r.get("status", "PASS")] for r in RULINGS]))
    A("\n## 4. Frozen semantic tables (expected-answer authority)\n")
    A("A later change in production behavior never changes an expected answer automatically; it needs a contract version.\n")
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
    A(HOLD_RULE + " " + CALIBRATION_RULE + "\n")
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
        ["B15", "load accounting tricks", "load-contract invariants and metric definitions, CR-LOAD"],
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
        "**Outputs.** Complete assertion metadata; raw-lifetime and as-of snapshot history; entity models (card-one value or E-CONFLICTING-VALUES per C5; card-many per CARD_MANY_ORDER; absent optional as a missing property; includes at the same basis; timelines); transaction records with ordered changes and the logical journal facts (C6); cursor page sequences; support counts; C1 eligibility routes (for O-PLAN); arithmetic, comparison and aggregate results per section 4; analytic scale counts per population stratum (population definition HELD with section S).",
        "**Independence.** Python stdlib only; imports no repository code; its own int64, IEEE binary64 (via struct) and codepoint ordering; no casefolding.",
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
        ["integer (int64)", "0, 1, -1, 2^53-1, 2^53+1, 2^59-1, 2^59, -2^59, -2^59-1, 2^63-1, -2^63"],
        ["number (binary64)", "+0.0, -0.0, 0.1, 0.30000000000000004, 1.0000000000000002, 2^53 as a double, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308, -1.5, 3.0 (stays a number)"],
        ["boolean", "true, false"],
        ["datetime", "0, a negative instant, 1700000000000.5 (fractional millisecond), the earliest and latest instant Triplex accepts"],
        ["ref", "same type, another type, an entity created in the same command"],
        ["json", "{\"b\":1,\"a\":2} (key order kept), nested arrays and objects, non-ASCII text, 1e300"],
        ["blob", "descriptor with and without filename, size 0, a size above 2^32"],
    ]))
    A("\nCS-TYPES8-NEG (each rejected atomically): lone surrogate, NaN, +Infinity, -Infinity, non-canonical int64 text (\"01\", \"+1\", \"1.0\", \"-0\"), integer outside int64, invalid datetime, unparseable json, blob descriptor with a negative size.\n")
    A("CS-WIDEN: int64 9007199254740993 first, then in the same attribute or physical column a whole-number float, a text value through an untyped attribute, and for QLever an invalid typed literal through the raw wire; re-read the first value everywhere.\n")
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
    A("\n## 8. Scale population and budgets (HELD)\n")
    A("Held until the north-star follow-up. A non-binding draft prepared before the hold is kept in `obligations.json` `heldDrafts.scalePopulation` (history strata 1/3/10 from the benchmark contract, topology and skew strata, same-R, decreasing-R and nested-transaction events, result-cardinality strata). Budget components for complete-path accounting are frozen as structure: " + ", ".join(BUDGET_COMPONENTS) + "; the budget values and `budgets.json` are held.\n")
    A("## 9. PLAN C1-C8 traceability\n")
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
        held = [o for o in HELD if g in o["goals"]]
        if held:
            A("**HELD (verbatim from 0.1.0-draft, not edited during the hold; cannot close until replaced):**\n")
            for o in held:
                A(f"- `{o['id']}`: {o['title']}. {o['statement']}")
            A("")
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
        hs = [o for o in HELD if g in o["goals"]]
        rows.append([g] + [sum(1 for o in os_ if l in o["lanes"]) for l in LANES] + [sum(1 for o in os_ if o["grounding"] == "policy-pending"), sum(1 for o in os_ if o["grounding"] == "derived"), sum(1 for o in os_ if any(THRESHOLDS[t]["value"] == "HELD" for t in o["thresholds"])), len(hs)])
    rows.append(["distinct"] + [sum(1 for o in OBL if l in o["lanes"]) for l in LANES] + [sum(1 for o in OBL if o["grounding"] == "policy-pending"), sum(1 for o in OBL if o["grounding"] == "derived"), sum(1 for o in OBL if any(THRESHOLDS[t]["value"] == "HELD" for t in o["thresholds"])), len(HELD)])
    return md_table(["Section", "xtdb-xtql (active)", "xtdb-sql (active)", "qlever-sparql (active)", "policy-pending", "derived", "active with HELD thresholds", "held from 0.1.0 (all lanes)"], rows)


def main():
    errs = validate()
    for o in OBL:
        o["verifierMode"] = verifier_mode(o)
        o["definitionSha256"] = obligation_hash(o)
        o["status"] = {l: "OPEN" for l in o["lanes"]}
        o["needsNewOracle"] = [x for x in o["oracles"] if ORACLES[x]["status"] not in ("EXISTS", "COMPILED")]
        o["heldThresholds"] = [t for t in o["thresholds"] if THRESHOLDS[t]["value"] == "HELD"]
    cells = matrix_cells()
    matrix_text = render_matrix(cells)
    pinned = {k: v["pinnedSourceFiles"] for k, v in CS.items() if v["pinnedSourceFiles"]}
    oracle_files = {k: [{"path": f, "sha256": sha_file(f)} for f in v["files"] if v["status"] == "EXISTS" and not f.endswith("/")] for k, v in ORACLES.items()}
    doc = {
        "format": "triplex-db-2/acceptance-obligations/2", "version": VERSION, "status": STATUS, "date": DATE,
        "authority": "This file is the only authority an evaluator reads. RULINGS.md is compiled into it by build_contract.py; ACCEPTANCE.md and capability-matrix.md are renderings.",
        "hold": {"by": "orchestrator, 2026-11-07", "reason": "Sam is re-tuning performance targets and requirements (lab/NORTH-STAR.md)",
                 "held": ["lab/acceptance/load-contract.json (unchanged, sha256 " + LOAD_CONTRACT_SHA256_0_1 + ")", "every S and L obligation and G8.support.maintenance-cost (verbatim 0.1.0, heldObligations)", "rulings Q2, Q4, Q11", "every performance threshold (value HELD)", "budgets.json", "the scale population (heldDrafts.scalePopulation, not binding)"],
                 "rule": HOLD_RULE},
        "generatedBy": "lab/acceptance/build_contract.py",
        "inputs": {"RULINGS.md": sha_file("lab/acceptance/RULINGS.md"), "build_contract.py": sha_file("lab/acceptance/build_contract.py"), HELD_FILE: sha_file(HELD_FILE), "load-contract.json": sha_file("lab/acceptance/load-contract.json")},
        "artifacts": {"capability-matrix.md": sha_text(matrix_text)},
        "lanes": LANES, "engineOfLane": ENGINE_OF, "languageOfLane": LANG_OF,
        "sections": [{"id": g, "title": t} for g, t in SECTIONS],
        "rulings": RULINGS, "languageRules": LANGUAGE_RULES, "frontierRules": FRONTIER_RULES,
        "numericOps": NUMERIC_OPS, "conversionRules": CONVERSION_RULES, "comparisonRules": COMPARISON_RULES, "aggregateRules": AGGREGATE_RULES,
        "cardManyOrder": CARD_MANY_ORDER, "constraintRules": CONSTRAINT_RULES, "errorTable": ERROR_TABLE, "errorComparison": ERROR_COMPARISON,
        "commitOutcomes": COMMIT_OUTCOMES, "cursorTransitions": CURSOR_TRANSITIONS,
        "thresholds": THRESHOLDS, "holdRule": HOLD_RULE, "calibrationRule": CALIBRATION_RULE, "thresholdRuleForKind": THRESHOLD_RULE_FOR_KIND,
        "oracles": ORACLES, "oracleFilesPinned": oracle_files, "comparators": COMPARATORS,
        "entrypoints": ENTRYPOINTS, "profiles": PROFILES,
        "capabilityMatrix": cells, "knownLimits": {k: {"engine": a, "behavior": b, "evidence": c} for k, (a, b, c) in KNOWN_LIMITS.items()},
        "rawParityClasses": RAW_PARITY_CLASSES, "rawExceptions": RAW_EXCEPTIONS, "diagnostics": DIAGNOSTICS, "diagnosticRule": DIAGNOSTIC_RULE, "fragmentCoverage": FRAGMENT_COVERAGE,
        "mutationControls": MUTANTS, "mutantRule": MUTANT_RULE, "caseSets": CS, "caseSourcesPinned": pinned,
        "traceability": TRACE,
        "receiptSchema": RECEIPT_SCHEMA, "evidenceKinds": EVIDENCE_KINDS, "selectorSemantics": SELECTOR_SEMANTICS,
        "validity": VALIDITY, "closureRules": CLOSURE_RULES, "verifierModes": VERIFIER_MODES, "applicability": APPLICABILITY, "statusAlgorithm": STATUS_ALGORITHM,
        "obsProtocols": OBS_PROTOCOLS, "planProtocols": PLAN_PROTOCOLS, "shapeSpec": SHAPE_SPEC, "specRules": SPEC_RULES,
        "budgetComponents": BUDGET_COMPONENTS,
        "heldDrafts": {"scalePopulation": SCALE_POPULATION},
        "obligations": OBL,
        "heldObligations": HELD,
    }
    doc["transitiveContractSha256"] = sha_text(json.dumps(doc, sort_keys=True, ensure_ascii=False))
    counts = counts_table()
    acc_text = render_acceptance(doc, cells, counts)
    obl_active = json.dumps({k: v for k, v in doc.items() if k not in ("heldObligations",)}, indent=2, ensure_ascii=False)
    obl_text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    for name, text in [("obligations.json (active part)", obl_active), ("capability-matrix.md", matrix_text), ("ACCEPTANCE.md", acc_text)]:
        for pat, why in BANNED_TEXT:
            if re.search(pat, text, flags=re.I if pat == "open question" else 0):
                errs.append(f"{name}: banned text '{pat}' ({why})")
    if errs:
        print("CONTRACT INVALID:")
        print("\n".join(sorted(set(errs))))
        sys.exit(1)
    (HERE / "obligations.json").write_text(obl_text)
    (HERE / "capability-matrix.md").write_text(matrix_text)
    (HERE / "ACCEPTANCE.md").write_text(acc_text)
    print(counts)
    print(f"active obligations: {len(OBL)}; held obligations: {len(HELD)}; raw exceptions: {len(RAW_EXCEPTIONS)}; traced cases: {len(TRACE)}; mutants: {len(MUTANTS)}; thresholds: {len(THRESHOLDS)} ({sum(1 for v in THRESHOLDS.values() if v['value'] == 'HELD')} HELD)")
    print("rulings compiled: " + ", ".join(r["id"] for r in RULINGS if r.get("status") != "HELD") + "; held: " + ", ".join(r["id"] for r in RULINGS if r.get("status") == "HELD"))
    print("transitive hash:", doc["transitiveContractSha256"])


if __name__ == "__main__":
    main()
