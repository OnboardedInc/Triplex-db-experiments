"""Section 4.7 ERROR_TABLE of the acceptance contract (O-ERR), as data the oracle emits.

Every expected error the oracle reports carries the contract id, `_tag`, `reason` and
`phase` from this table, so a harness compares observed errors by (`_tag`, `reason`)
exactly as ACCEPTANCE 4.7 / errorComparison says. The rows are transcribed from
lab/acceptance/ACCEPTANCE.md section 4.7 (0.3.1, plus the decimal and wire rows of 0.3.3 to 0.3.5
and the system-side rows of 0.3.8 and 0.3.9; no Triplex
source was read); the unit
test tests/test_contract_section4.py checks this table row by row against
lab/acceptance/obligations.json#errorTable, so a contract change that the oracle has
not absorbed fails the tests instead of silently drifting.

Multi-reason rows (E-CURSOR, E-CONSTRAINT) list their alternatives; the oracle names the
one it expects (or the permitted set) per case, as 4.7 says ("the case names which"). A
row with two phases (E-DECIMAL-OVERFLOW: "preflight or execution") lists both; a write-time
rejection reports preflight and a query-time result reports execution.

Errors the contract does not list (for example a cycle on a reachability path) are
emitted with a non-table id starting `X-` and an explicit RULING-NEEDED note, never with
an invented reason (RULES.md R-ERR-2).
"""

from __future__ import annotations

# id: (tag, reason or tuple of permitted reasons, phase). ACC 4.7, transcribed row by row.
ERROR_TABLE = {
    "E-INTEGER-OVERFLOW": ("QueryError", "integer-overflow", "execution"),
    "E-VALUE-OUT-OF-RANGE": ("InvalidTripleError", "value-out-of-range", "preflight"),
    "E-NUMBER-OVERFLOW": ("QueryError", "number-overflow", "execution"),
    "E-DIVISION-BY-ZERO": ("QueryError", "division-by-zero", "execution"),
    "E-INVALID-CONVERSION": ("QueryError", "invalid-conversion", "execution"),
    "E-MIXED-FAMILY": ("DatalogValidationError", "mixed-family", "preflight"),
    "E-INTEGER-AVG": ("DatalogValidationError", "integer-avg-requires-conversion", "preflight"),
    "E-INVALID-QUERY": ("ParseError", "invalid-query", "preflight"),
    "E-UNBOUND": ("UnboundVariableError", "unbound-variable", "preflight"),
    "E-CONTRACT-DECODE": ("ReadError", "contract-decode-mismatch", "execution"),
    "E-ROW-LIMIT": ("ReadError", "row-limit-exceeded", "execution"),
    "E-TIMEOUT": ("ReadError", "deadline-exceeded", "execution"),
    "E-CANCELLED": ("ReadError", "cancelled", "execution"),
    "E-READ-ONLY": ("ReadError", "read-only-refused", "preflight"),
    "E-UNSUPPORTED-SHAPE": ("ReadError", "outside-fragment-conditions", "preflight"),
    "E-UNAVAILABLE-CUT": ("ReadError", "unavailable-cut", "preflight"),
    "E-ADMISSION": ("ReadError", "admission-refused", "preflight"),
    "E-RECURSION-LIMIT": ("ReadError", "recursion-limit", "execution"),
    "E-OVERLOAD": ("ReadError", "overloaded", "admission"),
    "E-CONFLICTING-VALUES": ("ConflictingValuesError", "conflicting-values", "execution"),
    "E-MAINTAINING": ("Maintaining", "maintaining", "execution"),
    "E-REPAIRING": ("Repairing", "repairing", "execution"),
    "E-COMMIT-PENDING": ("CommitPending", "committed-not-published", "outcome"),
    "E-SCOPE-OWNER": ("ReadError", "scope-ownership-mismatch", "preflight"),
    "E-CURSOR": ("PaginationCursorError", ("malformed", "other-scope", "other-query"), "preflight"),
    "E-COMMAND-COMMITTED": ("CommandAlreadyCommittedError", "command-already-committed", "commit"),
    "E-TX-CONFLICT": ("TransactionConflictError", "precondition-failed", "commit"),
    "E-CONSTRAINT": ("ConstraintViolationError", ("required", "cardinality", "unique", "reference-target"), "commit"),
    "E-INVALID-VALUE": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-UNSUPPORTED-VALUE": ("UnsupportedValueTypeError", "unsupported-value-type", "preflight"),
    "E-RESERVED": ("WriteError", "reserved-namespace", "preflight"),
    "E-OUTCOME-UNKNOWN": ("TransactionOutcomeUnknown", "outcome-unknown", "outcome"),
    # rows added by ACC 0.3.2 to 0.3.5 (RULINGS Q22, Q30a, Q30b, Q33b, Q35e). 0.3.5 compiled Q35e:
    # E-DECIMAL-UNREPRESENTABLE is gone (RULINGS Q43a); overflow and fraction are InvalidTripleError
    "E-INEXACT-JSON-NUMBER": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-NEGATIVE-ZERO-INSTANT": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-DECIMAL-OVERFLOW": ("InvalidTripleError", "decimal-overflow", ("preflight", "execution")),
    "E-DECIMAL-BARE-DIVIDE": ("DatalogValidationError", "decimal-divide-requires-scale", "preflight"),
    "E-DECIMAL-FRACTION": ("InvalidTripleError", "decimal-fraction", "preflight"),
    "E-DECIMAL-AVG": ("DatalogValidationError", "decimal-avg-requires-divide", "preflight"),
    "E-DECIMAL-NARROWING": ("WriteError", "decimal-narrowing-loses-digits", "preflight"),
    # rows added by ACC 0.3.8 / 0.3.9 (RULINGS Q50d, Q51a, Q51f, Q55c, Q58a): replica, admission
    # and commit-path outcomes of the system; the replay oracle has no input for them, so they
    # are table rows only (not PRODUCED)
    "E-BASIS-NOT-AVAILABLE": ("BasisNotAvailable", "basis-not-reached", "execution"),
    "E-BASIS-NOT-RECONSTRUCTIBLE": ("BasisNotReconstructible", "basis-not-reconstructible", "execution"),
    "E-REPLICA-UNAVAILABLE": ("ReplicaUnavailable", "replica-unreachable", "execution"),
    "E-OVERLOADED": ("Overloaded", "bound-exceeded", "admission"),
    "E-DUAL-COMMIT-PATH": ("WriteError", "dual-commit-path", "preflight"),
}

# Ids the oracle itself can produce as an expected answer. The rest (deadlines, admission,
# overload, maintenance, repair, commit-pending, outcome-unknown, decode mismatch, scope
# ownership, read-only, unsupported shape, row limit, unbound variable, unsupported value)
# are system-side or harness-side outcomes the replay oracle has no input for; the
# section 4 tests check their table rows only.
PRODUCED = {
    "E-INTEGER-OVERFLOW", "E-VALUE-OUT-OF-RANGE", "E-NUMBER-OVERFLOW",
    "E-DIVISION-BY-ZERO", "E-INVALID-CONVERSION", "E-MIXED-FAMILY", "E-INTEGER-AVG", "E-INVALID-QUERY",
    "E-UNAVAILABLE-CUT", "E-CONFLICTING-VALUES", "E-CURSOR", "E-COMMAND-COMMITTED", "E-TX-CONFLICT",
    "E-CONSTRAINT", "E-INVALID-VALUE", "E-RESERVED",
    # EXP-O03 (contracts 0.3.3 to 0.3.5): the wire guard (Q30a, Q30b, Q33a) and the decimal
    # operations (Q22, Q33b, Q43a, Q43b). E-DECIMAL-NARROWING belongs to scale migrations
    # (DS-NARROW), which the oracle refuses (X-NOT-MODELED), so it is not produced.
    "E-INEXACT-JSON-NUMBER", "E-NEGATIVE-ZERO-INSTANT", "E-DECIMAL-OVERFLOW", "E-DECIMAL-BARE-DIVIDE",
    "E-DECIMAL-FRACTION", "E-DECIMAL-AVG",
}


def lookup(error_id, reason=None, phase=None):
    """(tag, reason, phase, alternatives) for a table id; a multi-reason row needs the
    case's reason (one of the alternatives) or reports the permitted set. A two-phase row
    takes the caller's phase (one of its phases)."""
    tag, reasons, phases = ERROR_TABLE[error_id]
    if isinstance(phases, tuple):
        if phase not in phases:
            raise ValueError(f"{error_id}: phase {phase!r} is not one of {phases}")
    else:
        phase = phases
    if isinstance(reasons, tuple):
        if reason is not None and reason not in reasons:
            raise ValueError(f"{error_id}: reason {reason!r} is not one of {reasons}")
        return tag, reason, phase, list(reasons)
    if reason is not None and reason != reasons:
        raise ValueError(f"{error_id}: reason is frozen as {reasons!r}")
    return tag, reasons, phase, None


def fields(error_id, reason=None, alternatives=None, tag=None, ruling=None, phase=None):
    """Ordered output fields for an expected error (ACC 4.7 errorComparison).

    Table ids get the frozen tag, reason and phase (`phase` picks one phase of a two-phase
    row). Non-table ids (`X-...`) carry the explicit tag/reason given (possibly None) plus
    the RULING-NEEDED note that leaves them open (R-ERR-2)."""
    if error_id in ERROR_TABLE:
        t, r, phase, alts = lookup(error_id, reason, phase)
        out = [("error", error_id), ("_tag", t), ("reason", r), ("phase", phase)]
        allowed = alternatives if alternatives is not None else (alts if r is None else None)
        if allowed:
            out.append(("reasonAlternatives", sorted(allowed)))
        return out
    out = [("error", error_id), ("_tag", tag), ("reason", reason), ("phase", None)]
    out.append(("ruling", ruling or "ORCHESTRATOR-RULING-NEEDED: not in ACC 4.7"))
    return out
