"""Section 4.7 ERROR_TABLE of the acceptance contract (O-ERR), as data the oracle emits.

Every expected error the oracle reports carries the contract id, `_tag`, `reason` and
`phase` from this table, so a harness compares observed errors by (`_tag`, `reason`)
exactly as ACCEPTANCE 4.7 / errorComparison says. The rows are transcribed from
lab/acceptance/ACCEPTANCE.md 0.3.1 section 4.7 (no Triplex source was read); the unit
test tests/test_contract_section4.py checks this table row by row against
lab/acceptance/obligations.json#errorTable, so a contract change that the oracle has
not absorbed fails the tests instead of silently drifting.

Multi-reason rows (E-CURSOR, E-CONSTRAINT) list their alternatives; the oracle names the
one it expects (or the permitted set) per case, as 4.7 says ("the case names which").

Errors the contract does not list (for example an out-of-range `transactions` limit)
are emitted with a non-table id starting `X-` and an explicit RULING-NEEDED note, never
with an invented reason (RULES.md R-ERR-2).
"""

from __future__ import annotations

# id: (tag, reason or tuple of permitted reasons, phase). ACC 4.7, transcribed row by row.
ERROR_TABLE = {
    "E-INTEGER-OVERFLOW": ("QueryError", "integer-overflow", "execution"),
    "E-VALUE-OUT-OF-RANGE": ("InvalidTripleError", "value-out-of-range", "preflight"),
    "E-DECIMAL-UNREPRESENTABLE": ("InvalidTripleError", "decimal-unrepresentable", "preflight"),
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
    # rows added by ACC 0.3.2 / 0.3.3 (RULINGS Q22, Q30a, Q30b)
    "E-INEXACT-JSON-NUMBER": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-NEGATIVE-ZERO-INSTANT": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-DECIMAL-OVERFLOW": ("DatalogValidationError", "decimal-overflow", "execution"),
    "E-DECIMAL-BARE-DIVIDE": ("DatalogValidationError", "decimal-divide-requires-scale", "preflight"),
    "E-DECIMAL-FRACTION": ("DatalogValidationError", "decimal-fraction-not-zero", "execution"),
    "E-DECIMAL-NARROWING": ("WriteError", "decimal-narrowing-loses-digits", "preflight"),
}

# Ids the oracle itself can produce as an expected answer. The rest (deadlines, admission,
# overload, maintenance, repair, commit-pending, outcome-unknown, decode mismatch, scope
# ownership, read-only, unsupported shape, row limit, unbound variable, unsupported value)
# are system-side or harness-side outcomes the replay oracle has no input for; the
# section 4 tests check their table rows only.
PRODUCED = {
    "E-INTEGER-OVERFLOW", "E-VALUE-OUT-OF-RANGE", "E-DECIMAL-UNREPRESENTABLE", "E-NUMBER-OVERFLOW",
    "E-DIVISION-BY-ZERO", "E-INVALID-CONVERSION", "E-MIXED-FAMILY", "E-INTEGER-AVG", "E-INVALID-QUERY",
    "E-UNAVAILABLE-CUT", "E-CONFLICTING-VALUES", "E-CURSOR", "E-COMMAND-COMMITTED", "E-TX-CONFLICT",
    "E-CONSTRAINT", "E-INVALID-VALUE", "E-RESERVED",
}


def lookup(error_id, reason=None):
    """(tag, reason, phase, alternatives) for a table id; a multi-reason row needs the
    case's reason (one of the alternatives) or reports the permitted set."""
    tag, reasons, phase = ERROR_TABLE[error_id]
    if isinstance(reasons, tuple):
        if reason is not None and reason not in reasons:
            raise ValueError(f"{error_id}: reason {reason!r} is not one of {reasons}")
        return tag, reason, phase, list(reasons)
    if reason is not None and reason != reasons:
        raise ValueError(f"{error_id}: reason is frozen as {reasons!r}")
    return tag, reasons, phase, None


def fields(error_id, reason=None, alternatives=None, tag=None, ruling=None):
    """Ordered output fields for an expected error (ACC 4.7 errorComparison).

    Table ids get the frozen tag, reason and phase. Non-table ids (`X-...`) carry the
    explicit tag/reason given (possibly None) plus the RULING-NEEDED note that leaves
    them open (R-ERR-2)."""
    if error_id in ERROR_TABLE:
        t, r, phase, alts = lookup(error_id, reason)
        out = [("error", error_id), ("_tag", t), ("reason", r), ("phase", phase)]
        allowed = alternatives if alternatives is not None else (alts if r is None else None)
        if allowed:
            out.append(("reasonAlternatives", sorted(allowed)))
        return out
    out = [("error", error_id), ("_tag", tag), ("reason", reason), ("phase", None)]
    out.append(("ruling", ruling or "ORCHESTRATOR-RULING-NEEDED: not in ACC 4.7"))
    return out
